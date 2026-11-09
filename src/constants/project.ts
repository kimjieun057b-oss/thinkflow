import type { ProjectStartType, ProjectStatus, ServiceType } from "@/types/database";

export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  web: "Web Service",
  ai: "AI Service",
  hybrid: "Hybrid (Web + AI)",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "진행 중",
  completed: "완료",
  archived: "보관",
};

export const PROJECT_START_TYPE_LABEL: Record<ProjectStartType, string> = {
  new: "새 설계 시작",
  import: "기존 설계 가져오기",
};

export const PROJECT_STATUS_FILTERS: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "active", label: "진행 중" },
  { value: "completed", label: "완료" },
  { value: "archived", label: "보관" },
];
