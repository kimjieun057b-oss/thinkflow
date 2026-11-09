"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoreVerticalIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PROJECT_START_TYPE_LABEL,
  PROJECT_STATUS_LABEL,
  SERVICE_TYPE_LABEL,
} from "@/constants/project";
import type { ProjectRow, ProjectStatus } from "@/types/database";

const STATUS_BADGE_VARIANT: Record<ProjectStatus, "secondary" | "default" | "outline"> = {
  active: "default",
  completed: "secondary",
  archived: "outline",
};

export function ProjectCard({ project }: { project: ProjectRow }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const updatedAt = new Date(project.updated_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  async function updateStatus(status: ProjectStatus) {
    setIsPending(true);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setIsPending(false);
    if (!res.ok) {
      toast.error("상태 변경에 실패했습니다.");
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까?`)) return;
    setIsPending(true);
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    setIsPending(false);
    if (!res.ok) {
      toast.error("삭제에 실패했습니다.");
      return;
    }
    toast.success("프로젝트를 삭제했습니다.");
    router.refresh();
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1">{project.name}</CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant={STATUS_BADGE_VARIANT[project.status]}>
              {PROJECT_STATUS_LABEL[project.status]}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" disabled={isPending} />}
              >
                <MoreVerticalIcon />
                <span className="sr-only">프로젝트 메뉴</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {project.status !== "active" && (
                  <DropdownMenuItem onClick={() => updateStatus("active")}>
                    진행 중으로 변경
                  </DropdownMenuItem>
                )}
                {project.status !== "completed" && (
                  <DropdownMenuItem onClick={() => updateStatus("completed")}>
                    완료로 변경
                  </DropdownMenuItem>
                )}
                {project.status !== "archived" && (
                  <DropdownMenuItem onClick={() => updateStatus("archived")}>
                    보관으로 변경
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
          {project.description || "설명이 없습니다."}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{SERVICE_TYPE_LABEL[project.service_type]}</Badge>
          <Badge variant="outline">{PROJECT_START_TYPE_LABEL[project.start_type]}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">마지막 수정일 {updatedAt}</p>
      </CardContent>
    </Card>
  );
}
