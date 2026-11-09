import { NextResponse } from "next/server";

import { mergeDesignAnalysis } from "@/lib/design-analysis/merge";
import { createClient } from "@/lib/supabase/server";
import type { DesignFileRow, FileExtractionRow } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/projects/[id]/import-analysis — 업로드된 파일 전체를 통합 분석한다.
// 파일이 추가/교체되어도 이전 분석 결과를 덮어쓰지 않고 새 분석 실행을 생성한다 (PRD 8.6).
export async function POST(_request: Request, { params }: RouteContext) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data: files, error: filesError } = await supabase
    .from("design_files")
    .select("*")
    .eq("project_id", projectId);
  if (filesError) {
    return NextResponse.json({ error: filesError.message }, { status: 500 });
  }

  const fileRows = (files ?? []) as DesignFileRow[];
  if (fileRows.length === 0) {
    return NextResponse.json({ error: "분석할 파일이 없습니다. 먼저 파일을 업로드하세요." }, { status: 400 });
  }

  const { data: extractions, error: extractionsError } = await supabase
    .from("file_extractions")
    .select("*")
    .in("file_id", fileRows.map((f) => f.id));
  if (extractionsError) {
    return NextResponse.json({ error: extractionsError.message }, { status: 500 });
  }

  const extractionRows = (extractions ?? []) as FileExtractionRow[];
  const hasExtracted = extractionRows.some((e) => e.status === "extracted");
  if (!hasExtracted) {
    return NextResponse.json(
      { error: "추출에 성공한 파일이 없습니다. 파일 상태를 확인하세요." },
      { status: 400 },
    );
  }

  const { data: run, error: runError } = await supabase
    .from("design_analysis_runs")
    .insert({
      project_id: projectId,
      status: "analyzing",
      source_file_ids: fileRows.map((f) => f.id),
    })
    .select("*")
    .single();
  if (runError || !run) {
    return NextResponse.json({ error: "분석 실행을 생성할 수 없습니다." }, { status: 500 });
  }

  const result = mergeDesignAnalysis(projectId, run.id as string, fileRows, extractionRows);

  const { data: completedRun, error: updateError } = await supabase
    .from("design_analysis_runs")
    .update({ status: "completed", summary: result.summary, result })
    .eq("id", run.id)
    .select("*")
    .single();

  if (updateError) {
    await supabase
      .from("design_analysis_runs")
      .update({ status: "failed", error_message: updateError.message })
      .eq("id", run.id);
    return NextResponse.json({ error: "분석 결과를 저장할 수 없습니다." }, { status: 500 });
  }

  return NextResponse.json({ analysisRun: completedRun }, { status: 201 });
}
