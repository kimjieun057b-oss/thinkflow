import type {
  AnalysisConnection,
  AnalysisSystemComponent,
  DesignFileRow,
  EdgeType,
  FileExtractionRow,
  ImportedDesignAnalysis,
  NodeType,
} from "@/types/database";
import type {
  JsonExtraction,
  MarkdownExtraction,
  SqlExtraction,
} from "@/lib/parsers/types";

const MAX_MARKDOWN_ITEMS_PER_FILE = 15;
const STOPWORDS = new Set(["the", "a", "an", "and", "or", "for", "of", "to", "in", "on"]);

interface CandidateComponent {
  component: AnalysisSystemComponent;
  tokens: Set<string>;
}

function normalizeToken(raw: string): string {
  const lower = raw.toLowerCase().trim();
  const stripped = lower.replace(/[^a-z0-9가-힣_]/g, "");
  return stripped.endsWith("s") && stripped.length > 3 ? stripped.slice(0, -1) : stripped;
}

function tokenize(text: string): Set<string> {
  const words = text
    .split(/[^a-zA-Z0-9가-힣_]+/)
    .map(normalizeToken)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return new Set(words);
}

function fileLabel(file: DesignFileRow): string {
  return file.file_name;
}

function jsonComponentType(file: DesignFileRow, data: JsonExtraction): NodeType {
  const nameHints = `${file.file_name} ${data.topLevelKeys.join(" ")}`.toLowerCase();
  if (/api|endpoint|route/.test(nameHints)) return "api";
  if (/config|setting|env/.test(nameHints)) return "process";
  return "process";
}

function buildCandidates(
  files: Map<string, DesignFileRow>,
  extractions: FileExtractionRow[],
): CandidateComponent[] {
  const candidates: CandidateComponent[] = [];

  for (const extraction of extractions) {
    if (extraction.status !== "extracted" || !extraction.structured_data) continue;
    const file = files.get(extraction.file_id);
    if (!file) continue;

    if (extraction.parser_type === "sql") {
      const data = extraction.structured_data as unknown as SqlExtraction;
      for (const table of data.tables) {
        const tokens = tokenize(table.name);
        for (const fk of table.foreignKeys) tokens.add(normalizeToken(fk.refTable));
        candidates.push({
          component: {
            id: `sql:${extraction.file_id}:${table.name}`,
            title: table.name,
            type: "database",
            description: `테이블 · 컬럼 ${table.columns.length}개 (${fileLabel(file)})`,
            sourceFileIds: [extraction.file_id],
          },
          tokens,
        });
      }
      continue;
    }

    if (extraction.parser_type === "json") {
      const data = extraction.structured_data as unknown as JsonExtraction;
      const tokens = new Set<string>();
      tokenize(file.file_name).forEach((t) => tokens.add(t));
      data.topLevelKeys.forEach((key) => tokens.add(normalizeToken(key)));
      candidates.push({
        component: {
          id: `json:${extraction.file_id}`,
          title: file.file_name.replace(/\.json$/i, ""),
          type: jsonComponentType(file, data),
          description: `구조화 데이터 · 최상위 필드 ${data.topLevelKeys.length}개 (${fileLabel(file)})`,
          sourceFileIds: [extraction.file_id],
        },
        tokens,
      });
      continue;
    }

    if (extraction.parser_type === "markdown") {
      const data = extraction.structured_data as unknown as MarkdownExtraction;
      const mentionTokens = new Set<string>();
      data.mentions.forEach((m) => mentionTokens.add(normalizeToken(m)));

      const pushItems = (items: string[], type: NodeType) => {
        for (const item of items.slice(0, MAX_MARKDOWN_ITEMS_PER_FILE)) {
          const tokens = tokenize(item);
          mentionTokens.forEach((t) => tokens.add(t));
          candidates.push({
            component: {
              id: `md:${extraction.file_id}:${type}:${candidates.length}`,
              title: item.slice(0, 120),
              type,
              description: `${fileLabel(file)}에서 추출`,
              sourceFileIds: [extraction.file_id],
            },
            tokens,
          });
        }
      };

      pushItems(data.apiMentions, "api");
      pushItems(data.requirements, "requirement");
      continue;
    }

    if (extraction.parser_type === "pdf") {
      candidates.push({
        component: {
          id: `pdf:${extraction.file_id}`,
          title: file.file_name.replace(/\.pdf$/i, ""),
          type: "requirement",
          description: `PDF 문서 (${fileLabel(file)})`,
          sourceFileIds: [extraction.file_id],
        },
        tokens: tokenize(file.file_name),
      });
    }
  }

  return candidates;
}

function edgeTypeFor(a: NodeType, b: NodeType): EdgeType {
  if (a === b) return "dependency";
  if (a === "database" || b === "database") return "data";
  return "data";
}

// 파일명/테이블명/필드명 등 식별자 일치만으로 연결을 추정한다 — AI 추론이 아닌 결정적(deterministic)
// 매칭이며, confidence로 강도를 표시해 사용자가 신뢰도를 판단할 수 있게 한다 (PRD 2.3, 8.3, 8.4).
export function mergeDesignAnalysis(
  projectId: string,
  analysisRunId: string,
  files: DesignFileRow[],
  extractions: FileExtractionRow[],
): ImportedDesignAnalysis {
  const fileById = new Map(files.map((f) => [f.id, f]));
  const candidates = buildCandidates(fileById, extractions);

  const connections: AnalysisConnection[] = [];
  const connectedComponentIds = new Set<string>();

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      const sameFile = a.component.sourceFileIds[0] === b.component.sourceFileIds[0];
      if (sameFile) continue;

      let sharedTokens = 0;
      for (const token of a.tokens) {
        if (b.tokens.has(token)) sharedTokens++;
      }
      if (sharedTokens === 0) continue;

      const confidence = Math.min(0.5 + sharedTokens * 0.2, 0.95);
      connections.push({
        sourceId: a.component.id,
        targetId: b.component.id,
        edgeType: edgeTypeFor(a.component.type, b.component.type),
        confidence,
      });
      connectedComponentIds.add(a.component.id);
      connectedComponentIds.add(b.component.id);
    }
  }

  const unresolvedItems: string[] = [];
  for (const candidate of candidates) {
    if (!connectedComponentIds.has(candidate.component.id)) {
      unresolvedItems.push(
        `"${candidate.component.title}"의 다른 파일과의 연관성을 찾지 못했습니다. (${candidate.component.description})`,
      );
    }
  }

  const failedFiles = files.filter((f) => f.status === "failed");
  for (const failed of failedFiles) {
    unresolvedItems.push(`"${failed.file_name}" 파일은 추출에 실패해 분석에 포함되지 않았습니다.`);
  }

  const summary = `${files.length}개 파일 중 ${candidates.length > 0 ? new Set(candidates.map((c) => c.component.sourceFileIds[0])).size : 0}개 파일에서 구성요소 ${candidates.length}개, 파일 간 연결 ${connections.length}개를 발견했습니다.`;

  return {
    projectId,
    analysisRunId,
    summary,
    systemComponents: candidates.map((c) => c.component),
    connections,
    unresolvedItems,
    findingIds: [],
  };
}
