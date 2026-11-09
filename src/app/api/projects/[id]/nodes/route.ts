import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createNodeSchema } from "@/lib/validations/node";
import type { DesignNodeRow } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/nodes — 프로젝트의 노드 목록
export async function GET(_request: Request, { params }: RouteContext) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("design_nodes")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ nodes: data as DesignNodeRow[] });
}

// POST /api/projects/[id]/nodes — 사용자가 직접 노드 생성 (source: manual)
export async function POST(request: Request, { params }: RouteContext) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createNodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const { nodeType, title, description, position } = parsed.data;

  const { data, error } = await supabase
    .from("design_nodes")
    .insert({
      project_id: projectId,
      node_type: nodeType,
      title,
      description: description ?? null,
      position,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ node: data as DesignNodeRow }, { status: 201 });
}
