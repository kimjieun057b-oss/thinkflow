import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/dashboard/project-card";
import { StatusFilter } from "@/components/dashboard/status-filter";
import { UserMenu } from "@/components/dashboard/user-menu";
import { createClient } from "@/lib/supabase/server";
import type { ProjectRow, ProjectStatus } from "@/types/database";

function isProjectStatus(value: string): value is ProjectStatus {
  return value === "active" || value === "completed" || value === "archived";
}

// 로그인 세션(cookies)과 status 쿼리에 따라 매 요청마다 달라지는 페이지라
// 프리렌더링 대상에서 제외한다 (Next.js 16 cacheComponents).
export const instant = false;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter = status && isProjectStatus(status) ? status : "all";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  let query = supabase.from("projects").select("*").order("updated_at", { ascending: false });
  if (activeFilter !== "all") {
    query = query.eq("status", activeFilter);
  }
  const { data } = await query;
  const projects = data as ProjectRow[] | null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="font-heading text-lg font-medium">ThinkFlow AI</span>
        {auth.user && <UserMenu email={auth.user.email ?? ""} />}
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-medium">프로젝트</h1>
          <Button render={<Link href="/projects/new" />} size="lg">
            <PlusIcon />
            신규 프로젝트 생성
          </Button>
        </div>

        <StatusFilter active={activeFilter} />

        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
            <p className="text-sm text-muted-foreground">
              {activeFilter === "all"
                ? "아직 생성된 프로젝트가 없습니다."
                : "해당 상태의 프로젝트가 없습니다."}
            </p>
            <Button render={<Link href="/projects/new" />} variant="outline">
              <PlusIcon />
              첫 프로젝트 만들기
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
