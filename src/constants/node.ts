import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CogIcon,
  DatabaseIcon,
  ListChecksIcon,
  LogInIcon,
  LogOutIcon,
  PlugIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";

import type { EdgeType, NodeStatus, NodeType } from "@/types/database";

export const NODE_TYPES: NodeType[] = [
  "problem",
  "requirement",
  "input",
  "process",
  "ai",
  "database",
  "api",
  "output",
  "validation",
];

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  problem: "Problem",
  requirement: "Requirement",
  input: "Input",
  process: "Process",
  ai: "AI",
  database: "Database",
  api: "API",
  output: "Output",
  validation: "Validation",
};

export const NODE_TYPE_ICON: Record<NodeType, LucideIcon> = {
  problem: AlertTriangleIcon,
  requirement: ListChecksIcon,
  input: LogInIcon,
  process: CogIcon,
  ai: SparklesIcon,
  database: DatabaseIcon,
  api: PlugIcon,
  output: LogOutIcon,
  validation: CheckCircle2Icon,
};

export const NODE_STATUS_LABEL: Record<NodeStatus, string> = {
  not_started: "대기",
  in_progress: "진행 중",
  decided: "확정",
  needs_review: "확인 필요",
};

export const NODE_STATUS_BADGE_VARIANT: Record<
  NodeStatus,
  "secondary" | "info" | "success" | "warning"
> = {
  not_started: "secondary",
  in_progress: "info",
  decided: "success",
  needs_review: "warning",
};

export const EDGE_TYPES: EdgeType[] = ["data", "control", "dependency"];

export const EDGE_TYPE_LABEL: Record<EdgeType, string> = {
  data: "Data",
  control: "Control",
  dependency: "Dependency",
};

export const NODE_CONTENT_FIELDS: {
  key: "inputs" | "outputs" | "process" | "technologies" | "failureCases" | "validationMethods" | "decisions" | "unresolvedItems";
  label: string;
  placeholder: string;
}[] = [
  { key: "inputs", label: "입력", placeholder: "한 줄에 하나씩 입력" },
  { key: "outputs", label: "출력", placeholder: "한 줄에 하나씩 입력" },
  { key: "process", label: "처리 과정", placeholder: "한 줄에 하나씩 입력" },
  { key: "technologies", label: "사용 기술", placeholder: "한 줄에 하나씩 입력" },
  { key: "failureCases", label: "예외/실패 상황", placeholder: "한 줄에 하나씩 입력" },
  { key: "validationMethods", label: "검증 방법", placeholder: "한 줄에 하나씩 입력" },
  { key: "decisions", label: "결정 사항", placeholder: "한 줄에 하나씩 입력" },
  { key: "unresolvedItems", label: "미결정 사항", placeholder: "한 줄에 하나씩 입력" },
];
