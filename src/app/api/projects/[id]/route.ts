import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { updateProjectSchema } from "@/lib/validations/project";
import type { ProjectRow } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/projects/[id] — 프로젝트 상세 조회
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();

  if (error) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ project: data as ProjectRow });
}

// PATCH /api/projects/[id] — 프로젝트 수정
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const { name, description, serviceType, status } = parsed.data;

  const { data, error } = await supabase
    .from("projects")
    .update({
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(serviceType !== undefined ? { service_type: serviceType } : {}),
      ...(status !== undefined ? { status } : {}),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없거나 수정할 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ project: data as ProjectRow });
}

// DELETE /api/projects/[id] — 프로젝트 삭제
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "프로젝트를 삭제할 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
