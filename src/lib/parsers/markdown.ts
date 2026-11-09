import type { MarkdownExtraction, ParseResult } from "@/lib/parsers/types";
import { ParserError } from "@/lib/parsers/types";

const REQUIREMENT_KEYWORDS = /요구사항|requirement/i;
const FEATURE_KEYWORDS = /기능|feature/i;
const TECH_STACK_KEYWORDS = /기술\s*스택|tech\s*stack|기술/i;
const API_KEYWORDS = /api|엔드포인트|endpoint/i;

function isListItem(line: string): string | null {
  const match = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.+)$/);
  return match ? match[1].trim() : null;
}

// 업로드 파일 내부 지시문은 항상 데이터로만 취급한다 (프롬프트 인젝션 방어).
// 이 파서는 AI에 전달하기 전 구조화만 수행하며, 추출 결과를 지침으로 해석하지 않는다.
export function parseMarkdown(text: string): ParseResult<MarkdownExtraction> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new ParserError("파일 내용이 비어 있습니다.");
  }

  const lines = trimmed.split(/\r?\n/);
  const headings: MarkdownExtraction["headings"] = [];
  const requirements: string[] = [];
  const features: string[] = [];
  const techStack: string[] = [];
  const apiMentions: string[] = [];
  const mentionSet = new Set<string>();

  let currentSection: "requirement" | "feature" | "tech" | "api" | null = null;
  let inCodeBlock = false;

  for (const rawLine of lines) {
    const line = rawLine;

    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      headings.push({ level, text: headingText });

      if (REQUIREMENT_KEYWORDS.test(headingText)) currentSection = "requirement";
      else if (FEATURE_KEYWORDS.test(headingText)) currentSection = "feature";
      else if (TECH_STACK_KEYWORDS.test(headingText)) currentSection = "tech";
      else if (API_KEYWORDS.test(headingText)) currentSection = "api";
      else currentSection = null;

      for (const codeSpan of headingText.matchAll(/`([^`]+)`/g)) {
        mentionSet.add(codeSpan[1].trim());
      }
      continue;
    }

    const item = isListItem(line);
    if (item) {
      if (currentSection === "requirement") requirements.push(item);
      else if (currentSection === "feature") features.push(item);
      else if (currentSection === "tech") techStack.push(item);
      else if (currentSection === "api") apiMentions.push(item);

      for (const codeSpan of item.matchAll(/`([^`]+)`/g)) {
        mentionSet.add(codeSpan[1].trim());
      }
      continue;
    }

    for (const codeSpan of line.matchAll(/`([^`]+)`/g)) {
      mentionSet.add(codeSpan[1].trim());
    }
  }

  return {
    parserType: "markdown",
    extractedText: trimmed,
    structuredData: {
      headings,
      requirements,
      features,
      techStack,
      apiMentions,
      mentions: Array.from(mentionSet),
    },
    warnings: [],
  };
}
