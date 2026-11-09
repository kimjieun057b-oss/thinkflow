import { NextResponse } from "next/server";

import { DESIGN_FILES_BUCKET } from "@/constants/file";
import { createClient } from "@/lib/supabase/server";
import type { DesignFileRow } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

// DELETE /api/files/[id] — 파일 삭제 (Storage 원본 + DB 레코드, 추출 결과는 CASCADE)
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data: file } = await supabase
    .from("design_files")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!file) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const { error } = await supabase.from("design_files").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "파일을 삭제할 수 없습니다." }, { status: 404 });
  }

  await supabase.storage
    .from(DESIGN_FILES_BUCKET)
    .remove([(file as DesignFileRow).storage_path]);

  return NextResponse.json({ success: true });
}
