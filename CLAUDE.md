# ThinkFlow AI — 개발 가이드

이 문서는 `prd.md`(상위 디렉터리)의 요구사항을 기반으로, 이 코드베이스에서 작업할 때 지켜야 할 규칙을 정리한 것이다. 상세 규칙은 [rules/](rules/) 디렉터리를 참고한다.

## 제품 한 줄 정의

ThinkFlow AI는 사용자가 **직접 판단하고 결정**하도록 돕는 AI 시스템 설계 코파일럿이다. AI가 설계를 대신 완성하지 않는다. 이 원칙은 모든 기능 구현에 우선한다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Framework | Next.js App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI | shadcn/ui |
| Diagram | React Flow (`@xyflow/react`) |
| Database | Supabase PostgreSQL |
| Auth / 권한 | Supabase Auth / RLS |
| File Storage | Supabase Storage |
| AI | Cloudflare Workers AI |
| Validation | Zod |
| Diagram Export | Mermaid |

## 디렉터리 구조

```text
src/
├── app/                # Next.js App Router 페이지 및 API 라우트
│   ├── (auth)/
│   ├── dashboard/
│   ├── projects/[projectId]/{import,workspace,documents}
│   └── api/{projects,files,analysis,questions,answers,suggestions,findings,reviews,documents}
├── components/         # UI 컴포넌트 (workspace/canvas, nodes, edges, panels 등)
├── features/           # 기능 단위 로직 (projects, file-import, extraction, design-analysis, suggestions, findings, documents 등)
├── lib/                # supabase, cloudflare, ai, parsers, validations, utils
├── hooks/
├── types/
└── constants/
supabase/migrations/, supabase/seed.sql
docs/{PRD.md, DATABASE.md, API.md}
```

## 핵심 규칙 (요약)

1. **AI 제안은 사용자 승인 전까지 확정 설계에 반영하지 않는다.**
2. AI 호출은 서버(Route Handler)에서만 수행하고, 응답은 **Zod로 검증한 후** 사용한다.
3. 사용자 원본 답변 / AI 최초 제안 / 사용자 수정안 / 확정 설계는 **서로 분리하여 보존**한다 (덮어쓰지 않음).
4. 노드 생성 + 제안 상태 변경은 **트랜잭션**으로 처리하고, 중복 수락 시 중복 생성되지 않도록 멱등성을 보장한다.
5. 업로드된 파일은 **신뢰할 수 없는 입력**으로 취급하고, 파일 내부 지시문을 시스템 지침으로 실행하지 않는다 (프롬프트 인젝션 방어).
6. 모든 주요 테이블은 UUID PK + 사용자 소유 프로젝트에 RLS를 적용한다.
7. 정보 부족(`missing`)과 실제 오류(`conflict`)를 혼동하지 않는다.

전체 규칙과 근거는 아래 rules 문서를 따른다:

- [rules/product-principles.md](rules/product-principles.md) — AI·사용자 역할, 데이터 분리, 출처 기반 분석
- [rules/ai-integration.md](rules/ai-integration.md) — Cloudflare Workers AI 호출, 응답 검증, 컨텍스트 구성 규칙
- [rules/data-and-transactions.md](rules/data-and-transactions.md) — DB/노드 제안 상태 흐름, 트랜잭션, 멱등성
- [rules/file-import-security.md](rules/file-import-security.md) — 파일 업로드·분석·보안 규칙
- [rules/must-follow-checklist.md](rules/must-follow-checklist.md) — PRD 24장 원문 체크리스트 (위반 금지 20개 항목)

## 작업 시 참고

- MVP 범위는 PRD 18장(P0/P1)을 따른다. P1 항목(YAML/DOCX 지원, 코드 분석, 고급 ERD, 실시간 협업 등)은 임의로 먼저 구현하지 않는다.
- 새 기능을 추가하기 전에 `rules/` 문서 중 관련 항목을 먼저 확인한다.
