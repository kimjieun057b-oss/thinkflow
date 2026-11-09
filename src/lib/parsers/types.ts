import type { ParserType } from "@/types/database";

export class ParserError extends Error {}

export interface MarkdownExtraction {
  headings: { level: number; text: string }[];
  requirements: string[];
  features: string[];
  techStack: string[];
  apiMentions: string[];
  // 본문·헤딩에서 찾은 개체명 후보(인라인 코드, 헤딩 키워드) — 파일 간 관계 분석의 매칭 대상.
  mentions: string[];
}

export interface SqlColumn {
  name: string;
  type: string;
  notNull: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  refTable?: string;
  refColumn?: string;
}

export interface SqlTable {
  name: string;
  columns: SqlColumn[];
  primaryKey: string[];
  foreignKeys: { column: string; refTable: string; refColumn: string }[];
  indexes: string[];
}

export interface SqlExtraction {
  tables: SqlTable[];
}

export interface JsonField {
  path: string;
  type: string;
}

export interface JsonExtraction {
  rootType: "object" | "array" | "primitive";
  topLevelKeys: string[];
  fields: JsonField[];
  sample: string;
}

export interface PdfExtraction {
  pageCount: number;
  pages: { page: number; text: string }[];
  headings: string[];
  unsupportedContent: boolean;
}

export type StructuredData = MarkdownExtraction | SqlExtraction | JsonExtraction | PdfExtraction;

export interface ParseResult<T extends StructuredData = StructuredData> {
  parserType: ParserType;
  extractedText: string;
  structuredData: T;
  warnings: string[];
}
