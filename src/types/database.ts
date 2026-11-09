// Supabase 테이블 타입 (수동 관리).
// 새 테이블을 코드에서 사용할 때마다 해당 Row/Insert/Update를 여기에 추가한다.
// `supabase/migrations/0001_init_schema.sql`이 스키마의 단일 진실 소스(source of truth)다.
// Supabase 프로젝트 연결 후에는 `npx supabase gen types typescript --linked`로 전체 타입을
// 자동 생성해 이 파일을 대체할 수 있다.

export type ServiceType = "web" | "ai" | "hybrid";
export type ProjectStartType = "new" | "import";
export type ProjectStatus = "active" | "completed" | "archived";

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  service_type: ServiceType;
  start_type: ProjectStartType;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export type ProjectInsert = Pick<
  ProjectRow,
  "user_id" | "name" | "service_type" | "start_type"
> &
  Partial<Pick<ProjectRow, "description" | "status">>;

export type ProjectUpdate = Partial<
  Pick<ProjectRow, "name" | "description" | "service_type" | "status">
>;

export interface ProfileRow {
  id: string;
  display_name: string | null;
  created_at: string;
}

// ============================================================
// design_nodes / node_connections (PRD 7장, 13.11, 13.13)
// ============================================================
export type NodeType =
  | "problem"
  | "requirement"
  | "input"
  | "process"
  | "ai"
  | "database"
  | "api"
  | "output"
  | "validation";

export type NodeStatus = "not_started" | "in_progress" | "decided" | "needs_review";

export type EdgeType = "data" | "control" | "dependency";

export interface DesignNodeContent {
  inputs?: string[];
  outputs?: string[];
  process?: string[];
  technologies?: string[];
  failureCases?: string[];
  validationMethods?: string[];
  decisions?: string[];
  unresolvedItems?: string[];
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface DesignNodeRow {
  id: string;
  project_id: string;
  source_suggestion_id: string | null;
  node_type: NodeType;
  title: string;
  description: string | null;
  content: DesignNodeContent;
  position: NodePosition;
  status: NodeStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export type DesignNodeInsert = Pick<DesignNodeRow, "project_id" | "node_type" | "title"> &
  Partial<Pick<DesignNodeRow, "description" | "content" | "position" | "status">>;

export type DesignNodeUpdate = Partial<
  Pick<DesignNodeRow, "title" | "description" | "content" | "position" | "status">
>;

export interface NodeConnectionRow {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: EdgeType;
  created_at: string;
}

export type NodeConnectionInsert = Pick<
  NodeConnectionRow,
  "project_id" | "source_node_id" | "target_node_id"
> &
  Partial<Pick<NodeConnectionRow, "edge_type">>;

export type NodeConnectionUpdate = Partial<Pick<NodeConnectionRow, "edge_type">>;

// ============================================================
// design_files / file_extractions / design_analysis_runs (PRD 8장, 13.3-13.5)
// ============================================================
export type DesignFileStatus =
  | "uploaded"
  | "extracting"
  | "extracted"
  | "analyzing"
  | "completed"
  | "failed";

export interface DesignFileRow {
  id: string;
  project_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  file_size: number;
  checksum: string | null;
  status: DesignFileStatus;
  created_at: string;
}

export type ParserType = "markdown" | "sql" | "json" | "pdf";
export type FileExtractionStatus = "extracting" | "extracted" | "failed";

export interface FileExtractionRow {
  id: string;
  file_id: string;
  extracted_text: string | null;
  structured_data: Record<string, unknown> | null;
  parser_type: ParserType | null;
  status: FileExtractionStatus;
  error_message: string | null;
  created_at: string;
}

export type AnalysisRunStatus = "analyzing" | "completed" | "failed";

// 8.4 분석 결과 구조 — systemComponents/connections는 사용자 검토 대상이며
// 확정 설계(design_nodes/node_connections)에는 사용자 승인 후에만 반영한다 (Sprint 4).
export interface AnalysisSystemComponent {
  id: string;
  title: string;
  type: NodeType;
  description: string;
  sourceFileIds: string[];
}

export interface AnalysisConnection {
  sourceId: string;
  targetId: string;
  edgeType: EdgeType;
  confidence: number;
}

export interface ImportedDesignAnalysis {
  projectId: string;
  analysisRunId: string;
  summary: string;
  systemComponents: AnalysisSystemComponent[];
  connections: AnalysisConnection[];
  unresolvedItems: string[];
  findingIds: string[];
}

export interface DesignAnalysisRunRow {
  id: string;
  project_id: string;
  status: AnalysisRunStatus;
  summary: string | null;
  result: ImportedDesignAnalysis | null;
  source_file_ids: string[];
  error_message: string | null;
  created_at: string;
}
