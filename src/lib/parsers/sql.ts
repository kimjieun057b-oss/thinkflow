import type { ParseResult, SqlColumn, SqlExtraction, SqlTable } from "@/lib/parsers/types";
import { ParserError } from "@/lib/parsers/types";

// LLM에 의존하지 않고 SQL 파서 기반으로 테이블/컬럼/PK/FK/인덱스를 추출한다 (PRD 8.2).
// 표준 PostgreSQL DDL(CREATE TABLE / CREATE INDEX)을 대상으로 하며, 완전한 SQL 문법을
// 파싱하지는 않는다 — 인식하지 못한 구문은 조용히 건너뛴다(추측으로 확정하지 않음).

function stripComments(sql: string): string {
  return sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function stripQuotes(identifier: string): string {
  return identifier.trim().replace(/^["'`]|["'`]$/g, "");
}

function lastIdentifierSegment(qualifiedName: string): string {
  const parts = stripQuotes(qualifiedName.trim()).split(".");
  return stripQuotes(parts[parts.length - 1]);
}

// 괄호 깊이를 추적해 중첩된 "(" 안의 콤마는 분리 기준에서 제외한다.
function splitTopLevel(input: string, delimiter = ","): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  let inString: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inString) {
      current += ch;
      if (ch === inString) inString = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      current += ch;
      continue;
    }

    if (ch === "(") {
      depth++;
      current += ch;
      continue;
    }
    if (ch === ")") {
      depth--;
      current += ch;
      continue;
    }

    if (ch === delimiter && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

// `name` 뒤에서 시작하는 첫 "(" 부터 짝이 맞는 ")" 까지의 내부 내용과 종료 위치를 반환한다.
function extractBalancedParens(sql: string, fromIndex: number): { content: string; endIndex: number } | null {
  const openIndex = sql.indexOf("(", fromIndex);
  if (openIndex === -1) return null;

  let depth = 0;
  for (let i = openIndex; i < sql.length; i++) {
    if (sql[i] === "(") depth++;
    else if (sql[i] === ")") {
      depth--;
      if (depth === 0) {
        return { content: sql.slice(openIndex + 1, i), endIndex: i };
      }
    }
  }
  return null;
}

function parseColumnDefinition(def: string): SqlColumn | null {
  const match = def.match(/^("?[\w$]+"?|`[\w$]+`)\s+([\s\S]+)$/);
  if (!match) return null;

  const name = stripQuotes(match[1]);
  const rest = match[2];

  const typeMatch = rest.match(
    /^([\w]+(?:\s*\([^)]*\))?(?:\s+(?:varying|precision))?)/i,
  );
  const type = typeMatch ? typeMatch[1].trim() : rest.split(/\s+/)[0];

  const notNull = /\bnot\s+null\b/i.test(rest);
  const isPrimaryKey = /\bprimary\s+key\b/i.test(rest);

  const refMatch = rest.match(/\breferences\s+("?[\w.]+"?)\s*\(\s*("?[\w]+"?)\s*\)/i);
  const isForeignKey = Boolean(refMatch);

  return {
    name,
    type,
    notNull: notNull || isPrimaryKey,
    isPrimaryKey,
    isForeignKey,
    ...(refMatch
      ? { refTable: lastIdentifierSegment(refMatch[1]), refColumn: stripQuotes(refMatch[2]) }
      : {}),
  };
}

function parseTableBody(body: string, table: SqlTable) {
  const definitions = splitTopLevel(body);

  for (const rawDef of definitions) {
    const def = rawDef.trim();
    if (!def) continue;

    const withoutConstraintName = def.replace(/^constraint\s+"?[\w$]+"?\s+/i, "");

    const pkMatch = withoutConstraintName.match(/^primary\s+key\s*\(([^)]+)\)/i);
    if (pkMatch) {
      table.primaryKey.push(...splitTopLevel(pkMatch[1]).map((c) => stripQuotes(c)));
      continue;
    }

    const fkMatch = withoutConstraintName.match(
      /^foreign\s+key\s*\(([^)]+)\)\s*references\s+("?[\w.]+"?)\s*\(([^)]+)\)/i,
    );
    if (fkMatch) {
      const columns = splitTopLevel(fkMatch[1]).map((c) => stripQuotes(c));
      const refColumns = splitTopLevel(fkMatch[3]).map((c) => stripQuotes(c));
      columns.forEach((column, i) => {
        table.foreignKeys.push({
          column,
          refTable: lastIdentifierSegment(fkMatch[2]),
          refColumn: refColumns[i] ?? refColumns[0],
        });
      });
      continue;
    }

    if (/^(unique|check)\b/i.test(withoutConstraintName)) {
      continue;
    }

    const column = parseColumnDefinition(def);
    if (column) {
      table.columns.push(column);
      if (column.isPrimaryKey) table.primaryKey.push(column.name);
      if (column.isForeignKey && column.refTable && column.refColumn) {
        table.foreignKeys.push({
          column: column.name,
          refTable: column.refTable,
          refColumn: column.refColumn,
        });
      }
    }
  }
}

export function parseSql(text: string): ParseResult<SqlExtraction> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new ParserError("파일 내용이 비어 있습니다.");
  }

  const sql = stripComments(trimmed);
  const tables: SqlTable[] = [];
  const tableByName = new Map<string, SqlTable>();

  const createTableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?("?[\w.]+"?)/gi;
  let match: RegExpExecArray | null;
  while ((match = createTableRegex.exec(sql)) !== null) {
    const tableName = lastIdentifierSegment(match[1]);
    const parens = extractBalancedParens(sql, match.index);
    if (!parens) continue;

    const table: SqlTable = {
      name: tableName,
      columns: [],
      primaryKey: [],
      foreignKeys: [],
      indexes: [],
    };
    parseTableBody(parens.content, table);
    table.primaryKey = Array.from(new Set(table.primaryKey));

    tables.push(table);
    tableByName.set(tableName.toLowerCase(), table);
    createTableRegex.lastIndex = parens.endIndex;
  }

  const createIndexRegex =
    /create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?("?[\w]+"?)\s+on\s+("?[\w.]+"?)/gi;
  while ((match = createIndexRegex.exec(sql)) !== null) {
    const indexName = stripQuotes(match[1]);
    const tableName = lastIdentifierSegment(match[2]);
    const table = tableByName.get(tableName.toLowerCase());
    if (table) table.indexes.push(indexName);
  }

  if (tables.length === 0) {
    throw new ParserError("CREATE TABLE 문을 찾을 수 없습니다.");
  }

  return {
    parserType: "sql",
    extractedText: trimmed.slice(0, 20000),
    structuredData: { tables },
    warnings: [],
  };
}
