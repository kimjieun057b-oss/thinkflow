import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createConnectionSchema } from "@/lib/validations/connection";
import type { NodeConnectionRow } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/connections — 프로젝트의 노드 연결 목록
export async function GET(_request: Request, { params }: RouteContext) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("node_connections")
    .select("*")
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ connections: data as NodeConnectionRow[] });
}

// POST /api/projects/[id]/connections — 노드 연결 생성
export async function POST(request: Request, { params }: RouteContext) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const { sourceNodeId, targetNodeId, edgeType } = parsed.data;

  if (sourceNodeId === targetNodeId) {
    return NextResponse.json({ error: "같은 노드를 연결할 수 없습니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("node_connections")
    .insert({
      project_id: projectId,
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
      edge_type: edgeType ?? "data",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ connection: data as NodeConnectionRow }, { status: 201 });
}
