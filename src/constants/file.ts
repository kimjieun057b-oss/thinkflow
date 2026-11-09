import type { DesignFileStatus } from "@/types/database";

// MVP 지원 파일 (PRD 5.3 — P0만 지원, YAML/DOCX/TS는 P1).
export const ALLOWED_FILE_EXTENSIONS = ["md", "sql", "json", "pdf"] as const;
export type AllowedFileExtension = (typeof ALLOWED_FILE_EXTENSIONS)[number];

// 확장자만 믿지 않고 실제 MIME 타입도 함께 검증한다 (file-import-security.md).
export const ALLOWED_MIME_TYPES_BY_EXTENSION: Record<AllowedFileExtension, string[]> = {
  md: ["text/markdown", "text/plain", "text/x-markdown"],
  sql: ["application/sql", "text/plain", "text/x-sql", "application/x-sql"],
  json: ["application/json", "text/plain"],
  pdf: ["application/pdf"],
};

// Vercel 서버리스 함수의 요청 본문 제한(약 4.5MB)을 고려해 여유를 둔다 (PRD 3.1 "서버에서 처리").
export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
export const MAX_FILES_PER_PROJECT = 20;

export const DESIGN_FILES_BUCKET = "design-files";

export const FILE_STATUS_LABEL: Record<DesignFileStatus, string> = {
  uploaded: "업로드됨",
  extracting: "추출 중",
  extracted: "추출 완료",
  analyzing: "분석 중",
  completed: "완료",
  failed: "실패",
};

export const FILE_STATUS_BADGE_VARIANT: Record<
  DesignFileStatus,
  "secondary" | "info" | "success" | "warning" | "destructive"
> = {
  uploaded: "secondary",
  extracting: "info",
  extracted: "success",
  analyzing: "info",
  completed: "success",
  failed: "destructive",
};

export function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx === -1) return "";
  return fileName.slice(idx + 1).toLowerCase();
}

export function isAllowedExtension(ext: string): ext is AllowedFileExtension {
  return (ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(ext);
}

// Storage 경로 규칙: {user_id}/{project_id}/{file_id}-{file_name} (사용자별 접근 제한 — 0003 migration).
export function buildStoragePath(
  userId: string,
  projectId: string,
  fileId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^\w.\-가-힣]/g, "_").slice(-150);
  return `${userId}/${projectId}/${fileId}-${safeName}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
