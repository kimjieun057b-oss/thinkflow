import type { AllowedFileExtension } from "@/constants/file";
import { parseJson } from "@/lib/parsers/json";
import { parseMarkdown } from "@/lib/parsers/markdown";
import { parsePdf } from "@/lib/parsers/pdf";
import { parseSql } from "@/lib/parsers/sql";
import type { ParseResult } from "@/lib/parsers/types";

export { ParserError } from "@/lib/parsers/types";

// 파일 내용은 신뢰할 수 없는 입력으로 취급한다 — 파서는 구조 추출만 수행하고,
// 추출된 텍스트 안의 지시문을 실행하지 않는다 (file-import-security.md).
export async function extractFile(
  buffer: Buffer,
  extension: AllowedFileExtension,
): Promise<ParseResult> {
  switch (extension) {
    case "md":
      return parseMarkdown(buffer.toString("utf-8"));
    case "json":
      return parseJson(buffer.toString("utf-8"));
    case "sql":
      return parseSql(buffer.toString("utf-8"));
    case "pdf":
      return parsePdf(buffer);
  }
}
