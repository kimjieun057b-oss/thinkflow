import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { updateNodeSchema } from "@/lib/validations/node";
import type { DesignNodeRow } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/nodes/[id] — 노드 수정 (제목/설명/내용/위치/상태)
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateNodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const { title, description, content, position, status } = parsed.data;

  const { data, error } = await supabase
    .from("design_nodes")
    .update({
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(position !== undefined ? { position } : {}),
      ...(status !== undefined ? { status } : {}),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "노드를 찾을 수 없거나 수정할 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ node: data as DesignNodeRow });
}

// DELETE /api/nodes/[id] — 노드 삭제 (연결된 node_connections, design_node_sources는 CASCADE)
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { error } = await supabase.from("design_nodes").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "노드를 삭제할 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
