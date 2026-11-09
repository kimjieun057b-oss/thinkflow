import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { DesignAnalysisRunRow } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/analysis/[id] — 분석 실행 결과 조회
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("design_analysis_runs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: "분석 결과를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ analysisRun: data as DesignAnalysisRunRow });
}
