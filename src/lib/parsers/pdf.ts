import { createRequire } from "node:module";
import { dirname } from "node:path";

import { definePDFJSModule, extractText, getDocumentProxy } from "unpdf";

import type { ParseResult, PdfExtraction } from "@/lib/parsers/types";
import { ParserError } from "@/lib/parsers/types";

const MIN_CHARS_PER_PAGE_FOR_TEXT = 20;

let pdfjsModuleReady: Promise<void> | null = null;

// unpdf의 기본 서버리스 PDF.js 빌드는 한글 등 CJK CID 폰트의 CMap을 제대로 처리하지
// 못한다. 로컬에 설치된 pdfjs-dist(legacy build)를 사용해 정확도를 보장한다.
function ensurePdfjsModule(): Promise<void> {
  if (!pdfjsModuleReady) {
    pdfjsModuleReady = definePDFJSModule(() => import("pdfjs-dist/legacy/build/pdf.mjs"));
  }
  return pdfjsModuleReady;
}

// Node 환경의 pdfjs-dist(NodeBinaryDataFactory)는 cMapUrl/standardFontDataUrl을
// URL이 아니라 `fs.readFile`로 직접 읽을 로컬 파일시스템 경로로 취급한다.
// (파일명이 그대로 뒤에 붙으므로 끝에 구분자가 필요하다.)
function resolvePdfjsAssetUrls(): { cMapUrl: string; standardFontDataUrl: string } {
  const require = createRequire(import.meta.url);
  const pdfjsRoot = dirname(require.resolve("pdfjs-dist/package.json"));
  return {
    cMapUrl: `${pdfjsRoot}/cmaps/`,
    standardFontDataUrl: `${pdfjsRoot}/standard_fonts/`,
  };
}

function isLikelyHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;
  if (/[.,;:]$/.test(trimmed)) return false;

  const numbered = /^(\d+(\.\d+)*|[IVX]+\.)\s+\S/.test(trimmed);
  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  const upperRatio = letters.length > 0
    ? letters.replace(/[^A-Z]/g, "").length / letters.length
    : 0;
  const mostlyUpper = letters.length >= 3 && upperRatio > 0.8;

  return numbered || mostlyUpper;
}

// PDF 텍스트 추출 (PRD 8.2). 이미지로만 구성된 PDF와 복잡한 표는 MVP에서 정확도를 보장하지
// 않으며, 추출 텍스트가 비정상적으로 적은 경우 unsupportedContent로 표시해 사용자에게 알린다.
export async function parsePdf(buffer: Buffer): Promise<ParseResult<PdfExtraction>> {
  let totalPages: number;
  let pageTexts: string[];

  try {
    await ensurePdfjsModule();
    const pdf = await getDocumentProxy(new Uint8Array(buffer), {
      ...resolvePdfjsAssetUrls(),
      cMapPacked: true,
      disableFontFace: true,
      useSystemFonts: true,
    });
    const result = await extractText(pdf, { mergePages: false });
    totalPages = result.totalPages;
    pageTexts = result.text;
  } catch {
    throw new ParserError("PDF를 읽을 수 없습니다. 손상된 파일일 수 있습니다.");
  }

  const fullText = pageTexts.join("\n\n").trim();
  if (!fullText) {
    throw new ParserError("PDF에서 텍스트를 추출할 수 없습니다. 이미지로만 구성된 문서일 수 있습니다.");
  }

  const avgCharsPerPage = fullText.length / Math.max(totalPages, 1);
  const unsupportedContent = avgCharsPerPage < MIN_CHARS_PER_PAGE_FOR_TEXT;

  const headings: string[] = [];
  for (const line of fullText.split(/\r?\n/)) {
    if (isLikelyHeading(line)) headings.push(line.trim());
    if (headings.length >= 50) break;
  }

  return {
    parserType: "pdf",
    extractedText: fullText.slice(0, 20000),
    structuredData: {
      pageCount: totalPages,
      pages: pageTexts.map((text, i) => ({ page: i + 1, text: text.slice(0, 5000) })),
      headings,
      unsupportedContent,
    },
    warnings: unsupportedContent
      ? ["텍스트가 거의 추출되지 않았습니다. 이미지 기반 PDF는 MVP에서 정확도가 보장되지 않습니다."]
      : [],
  };
}
