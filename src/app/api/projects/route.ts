import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createProjectSchema, projectStatusSchema } from "@/lib/validations/project";
import type { ProjectRow } from "@/types/database";

// GET /api/projects — 목록 조회 (status 필터 지원)
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");

  let query = supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (statusParam && statusParam !== "all") {
    const parsed = projectStatusSchema.safeParse(statusParam);
    if (!parsed.success) {
      return NextResponse.json({ error: "유효하지 않은 status 값입니다." }, { status: 400 });
    }
    query = query.eq("status", parsed.data);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: data as ProjectRow[] });
}

// POST /api/projects — 프로젝트 생성
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { name, description, serviceType, startType } = parsed.data;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: auth.user.id,
      name,
      description: description ?? null,
      // 기존 설계 가져오기는 분석 전까지 유형이 미확정일 수 있어 기본값을 둔다 (업로드 분석 후 사용자 확인 거쳐 확정).
      service_type: serviceType ?? "web",
      start_type: startType,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data as ProjectRow }, { status: 201 });
}
