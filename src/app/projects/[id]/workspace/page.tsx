import { notFound } from "next/navigation";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { createClient } from "@/lib/supabase/server";
import type { DesignNodeRow, NodeConnectionRow, ProjectRow } from "@/types/database";

// 매 요청마다 로그인한 사용자 소유 프로젝트인지 확인해야 하므로 프리렌더링하지 않는다.
export const instant = false;

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const [{ data: project, error: projectError }, { data: nodes }, { data: connections }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).single(),
      supabase
        .from("design_nodes")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase.from("node_connections").select("*").eq("project_id", projectId),
    ]);

  if (projectError || !project) {
    notFound();
  }

  return (
    <WorkspaceShell
      project={project as ProjectRow}
      initialNodes={(nodes ?? []) as DesignNodeRow[]}
      initialConnections={(connections ?? []) as NodeConnectionRow[]}
    />
  );
}
