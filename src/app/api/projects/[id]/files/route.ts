import { randomUUID, createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  DESIGN_FILES_BUCKET,
  MAX_FILES_PER_PROJECT,
  buildStoragePath,
  getFileExtension,
  isAllowedExtension,
} from "@/constants/file";
import { extractFile, ParserError } from "@/lib/parsers";
import { createClient } from "@/lib/supabase/server";
import { validateUploadedFile } from "@/lib/validations/file";
import type { DesignFileRow, FileExtractionRow } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// GET /api/projects/[id]/files — 프로젝트의 업로드 파일 목록
export async function GET(_request: Request, { params }: RouteContext) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("design_files")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ files: data as DesignFileRow[] });
}

async function runExtraction(
  supabase: SupabaseClient,
  fileRow: DesignFileRow,
  buffer: Buffer,
): Promise<{ extraction: FileExtractionRow; fileStatus: DesignFileRow["status"] }> {
  const ext = getFileExtension(fileRow.file_name);

  await supabase.from("design_files").update({ status: "extracting" }).eq("id", fileRow.id);

  try {
    if (!isAllowedExtension(ext)) {
      throw new ParserError("지원하지 않는 파일 형식입니다.");
    }
    const result = await extractFile(buffer, ext);

    const { data: extraction, error: extractionError } = await supabase
      .from("file_extractions")
      .insert({
        file_id: fileRow.id,
        extracted_text: result.extractedText,
        structured_data: result.structuredData,
        parser_type: result.parserType,
        status: "extracted",
      })
      .select("*")
      .single();

    if (extractionError) throw new Error(extractionError.message);

    await supabase.from("design_files").update({ status: "extracted" }).eq("id", fileRow.id);
    return { extraction: extraction as FileExtractionRow, fileStatus: "extracted" };
  } catch (err) {
    // 파일 파싱 실패는 해당 파일에만 기록하고 다른 파일 처리는 중단하지 않는다 (file-import-security.md).
    const message = err instanceof ParserError ? err.message : "파일 추출 중 오류가 발생했습니다.";

    const { data: extraction } = await supabase
      .from("file_extractions")
      .insert({
        file_id: fileRow.id,
        status: "failed",
        error_message: message,
      })
      .select("*")
      .single();

    await supabase.from("design_files").update({ status: "failed" }).eq("id", fileRow.id);
    return { extraction: extraction as FileExtractionRow, fileStatus: "failed" };
  }
}

// POST /api/projects/[id]/files — 파일 업로드 (multipart/form-data, field: "file")
export async function POST(request: Request, { params }: RouteContext) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
  }

  const validationError = validateUploadedFile({
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError.message }, { status: 400 });
  }

  const { count } = await supabase
    .from("design_files")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if ((count ?? 0) >= MAX_FILES_PER_PROJECT) {
    return NextResponse.json(
      { error: `프로젝트당 최대 ${MAX_FILES_PER_PROJECT}개 파일까지 업로드할 수 있습니다.` },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(buffer).digest("hex");

  const { data: duplicate } = await supabase
    .from("design_files")
    .select("id, file_name")
    .eq("project_id", projectId)
    .eq("checksum", checksum)
    .maybeSingle();
  if (duplicate) {
    return NextResponse.json(
      { error: `"${duplicate.file_name}"과 동일한 파일이 이미 업로드되어 있습니다.` },
      { status: 409 },
    );
  }

  const fileId = randomUUID();
  const ext = getFileExtension(file.name);
  const storagePath = buildStoragePath(auth.user.id, projectId, fileId, file.name);

  const { error: uploadError } = await supabase.storage
    .from(DESIGN_FILES_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || undefined,
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json({ error: "파일 저장에 실패했습니다." }, { status: 500 });
  }

  const { data: fileRow, error: insertError } = await supabase
    .from("design_files")
    .insert({
      id: fileId,
      project_id: projectId,
      user_id: auth.user.id,
      file_name: file.name,
      file_type: ext,
      storage_path: storagePath,
      file_size: file.size,
      checksum,
      status: "uploaded",
    })
    .select("*")
    .single();

  if (insertError || !fileRow) {
    // DB 레코드 생성에 실패하면 고아 Storage 파일이 남지 않도록 정리한다.
    await supabase.storage.from(DESIGN_FILES_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: "파일 정보를 저장할 수 없습니다." }, { status: 500 });
  }

  const { extraction, fileStatus } = await runExtraction(supabase, fileRow as DesignFileRow, buffer);

  return NextResponse.json(
    { file: { ...(fileRow as DesignFileRow), status: fileStatus }, extraction },
    { status: 201 },
  );
}
