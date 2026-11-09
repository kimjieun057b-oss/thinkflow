import type { JsonExtraction, JsonField, ParseResult } from "@/lib/parsers/types";
import { ParserError } from "@/lib/parsers/types";

const MAX_DEPTH = 3;
const MAX_FIELDS = 200;

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function collectFields(value: unknown, path: string, depth: number, out: JsonField[]) {
  if (out.length >= MAX_FIELDS || depth > MAX_DEPTH) return;

  if (Array.isArray(value)) {
    out.push({ path: path || "$", type: "array" });
    if (value.length > 0) {
      collectFields(value[0], `${path}[]`, depth + 1, out);
    }
    return;
  }

  if (value !== null && typeof value === "object") {
    if (path) out.push({ path, type: "object" });
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (out.length >= MAX_FIELDS) break;
      const childPath = path ? `${path}.${key}` : key;
      const childType = typeOf(child);
      if (childType === "object" || childType === "array") {
        collectFields(child, childPath, depth + 1, out);
      } else {
        out.push({ path: childPath, type: childType });
      }
    }
    return;
  }

  out.push({ path: path || "$", type: typeOf(value) });
}

// 구조화된 설정/데이터 파일 분석 (PRD 8.2 JSON). 데이터 관계는 필드명 기반으로만 추론하며
// (예: `*_id` 필드), 근거가 부족한 추론은 통합 분석 단계에서 확정하지 않는다.
export function parseJson(text: string): ParseResult<JsonExtraction> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new ParserError("파일 내용이 비어 있습니다.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new ParserError("유효한 JSON 형식이 아닙니다.");
  }

  const rootType: JsonExtraction["rootType"] = Array.isArray(parsed)
    ? "array"
    : parsed !== null && typeof parsed === "object"
      ? "object"
      : "primitive";

  const topLevelKeys: string[] =
    rootType === "object"
      ? Object.keys(parsed as Record<string, unknown>)
      : rootType === "array" &&
          (parsed as unknown[]).length > 0 &&
          typeof (parsed as unknown[])[0] === "object" &&
          (parsed as unknown[])[0] !== null
        ? Object.keys((parsed as Record<string, unknown>[])[0])
        : [];

  const fields: JsonField[] = [];
  collectFields(parsed, "", 0, fields);

  const sample = JSON.stringify(parsed, null, 2).slice(0, 2000);

  return {
    parserType: "json",
    extractedText: trimmed.slice(0, 20000),
    structuredData: { rootType, topLevelKeys, fields, sample },
    warnings: fields.length >= MAX_FIELDS ? ["필드가 많아 일부만 추출했습니다."] : [],
  };
}
