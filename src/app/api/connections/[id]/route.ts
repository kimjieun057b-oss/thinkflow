import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { updateConnectionSchema } from "@/lib/validations/connection";
import type { NodeConnectionRow } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/connections/[id] — 연결 유형 변경
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("node_connections")
    .update({ edge_type: parsed.data.edgeType })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "연결을 찾을 수 없거나 수정할 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ connection: data as NodeConnectionRow });
}

// DELETE /api/connections/[id] — 연결 삭제
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { error } = await supabase.from("node_connections").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "연결을 삭제할 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
