import { z } from "zod";

import {
  ALLOWED_MIME_TYPES_BY_EXTENSION,
  MAX_FILE_SIZE_BYTES,
  getFileExtension,
  isAllowedExtension,
} from "@/constants/file";

export interface FileValidationError {
  code: "extension" | "mime" | "size" | "empty";
  message: string;
}

// 확장자와 실제 MIME 타입을 모두 검증한다 (확장자만 믿지 않음 — file-import-security.md).
export function validateUploadedFile(file: {
  name: string;
  size: number;
  type: string;
}): FileValidationError | null {
  const ext = getFileExtension(file.name);
  if (!isAllowedExtension(ext)) {
    return {
      code: "extension",
      message: `지원하지 않는 파일 형식입니다 (.${ext || "unknown"}). md, sql, json, pdf만 지원합니다.`,
    };
  }

  if (file.size <= 0) {
    return { code: "empty", message: "빈 파일은 업로드할 수 없습니다." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      code: "size",
      message: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB까지 업로드할 수 있습니다.`,
    };
  }

  // 브라우저가 보낸 MIME 타입이 빈 문자열일 수 있어(OS/확장자 연결 누락), 그 경우는 확장자 검증만으로 통과시킨다.
  const allowedMimeTypes = ALLOWED_MIME_TYPES_BY_EXTENSION[ext];
  if (file.type && !allowedMimeTypes.includes(file.type)) {
    return {
      code: "mime",
      message: `파일 내용이 .${ext} 형식과 일치하지 않습니다.`,
    };
  }

  return null;
}

export const analysisRequestSchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1, "분석할 파일을 선택하세요.").optional(),
});

export type AnalysisRequestInput = z.infer<typeof analysisRequestSchema>;
