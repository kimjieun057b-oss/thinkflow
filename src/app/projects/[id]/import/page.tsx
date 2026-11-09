import { notFound } from "next/navigation";

import { ImportShell } from "@/components/import/import-shell";
import { createClient } from "@/lib/supabase/server";
import type { DesignFileRow, ProjectRow } from "@/types/database";

// 로그인 사용자 소유 프로젝트인지 매 요청마다 확인해야 하므로 프리렌더링하지 않는다.
export const instant = false;

export default async function DesignImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const [{ data: project, error: projectError }, { data: files }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase
      .from("design_files")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
  ]);

  if (projectError || !project) {
    notFound();
  }

  return (
    <ImportShell
      project={project as ProjectRow}
      initialFiles={(files ?? []) as DesignFileRow[]}
    />
  );
}
