# API 설계 (ThinkFlow AI)

PRD 14장(API 설계)을 기준으로 실제 구현된 엔드포인트와 명세를 정리한 문서다.

- DB 스키마: `supabase/migrations/0001_init_schema.sql` (PRD 13장)
- RLS 정책: `supabase/migrations/0002_rls_policies.sql`
- 각 엔드포인트의 "상태" 컬럼은 구현 여부를 나타낸다.
  - **구현**: Sprint 1~2에서 실제 라우트 핸들러가 존재
  - **계획**: PRD에 정의되어 있으나 Sprint 3 이후 구현 예정

---

## 1. 공통 규칙

### 1.1 요청/응답 포맷

- 모든 API는 Next.js Route Handler(`src/app/api/**/route.ts`)로 구현한다.
- 요청/응답 바디는 JSON이다.
- 성공 응답은 리소스를 단수/복수 키로 감싸서 반환한다.
  - 단건: `{ "project": { ... } }`
  - 목록: `{ "projects": [ ... ] }`
- 생성(POST)은 `201`, 조회/수정/삭제는 각각 `200`을 반환한다.
- 삭제 성공 시 `{ "success": true }`를 반환한다.

### 1.2 인증

- 모든 API는 Supabase Auth 세션(쿠키 기반)으로 사용자를 확인한다.
- `supabase.auth.getUser()`로 사용자를 조회하지 못하면 `401`과 `{ "error": "인증이 필요합니다." }`를 반환한다.
- AI(Cloudflare Workers AI) 호출 자격 증명은 서버 환경 변수로만 관리하며 클라이언트에 노출하지 않는다.

### 1.3 소유권 검증

- 프로젝트 하위 리소스(노드, 연결, 파일 등)는 요청 경로의 `project_id` 또는 리소스가 참조하는 `project_id`를 기준으로 소유권을 검증한다.
- 소유권 검증은 두 단계로 이루어진다.
  1. Supabase RLS 정책(`is_project_owner`, `owns_node` 등 helper 함수)이 DB 레벨에서 차단한다.
  2. 애플리케이션 레벨에서는 RLS로 걸러진 결과 `0 rows`를 그대로 "찾을 수 없음(`404`)"으로 변환해 응답한다.
- 다른 사용자의 리소스에 접근해도 `403` 대신 `404`로 응답해 리소스 존재 여부 자체를 노출하지 않는다.

### 1.4 검증(Validation)

- 모든 요청 바디는 Zod 스키마(`src/lib/validations/*.ts`)로 파싱한다.
- 파싱 실패 시 `400`과 `{ "error": z.treeifyError(parsed.error) }` 형태의 트리 구조 에러를 반환한다.
- AI가 생성한 응답(노드 제안, 분석 결과 등)도 동일하게 Zod로 검증한 뒤에만 DB에 저장한다 (PRD 12.6).

### 1.5 에러 포맷

| 상태 코드 | 의미                         | 바디 예시                                   |
| --------- | ---------------------------- | -------------------------------------------- |
| 400       | 요청 검증 실패               | `{ "error": { ... Zod tree ... } }`         |
| 401       | 인증되지 않음                | `{ "error": "인증이 필요합니다." }`          |
| 404       | 리소스 없음 또는 접근 권한 없음 | `{ "error": "프로젝트를 찾을 수 없습니다." }` |
| 500       | 서버/DB 오류                 | `{ "error": "<DB 에러 메시지>" }`            |

### 1.6 장시간 작업

- 파일 추출, 통합 분석, 설계 검토, 문서 생성처럼 시간이 오래 걸리는 작업은 즉시 결과를 반환하지 않고 상태 기반으로 처리한다 (PRD 14장, 15.2~15.3).
- 생성 직후에는 처리 중 상태(`extracting` / `analyzing` / `generating` 등)의 레코드를 반환하고, 클라이언트는 상세 조회 API로 상태를 polling 한다.
- 실패 시 `error_message` 컬럼에 원인을 저장하고 다른 파일/작업에는 영향을 주지 않는다.

---

## 2. Projects — 구현

프로젝트 CRUD. PRD 5.1(Dashboard), 5.2(Project Setup), 13.2(projects 테이블) 대응.

### POST /api/projects

프로젝트를 생성한다.

- 인증: 필요
- 요청 바디

| 필드          | 타입   | 필수                     | 설명                                               |
| ------------- | ------ | ------------------------ | --------------------------------------------------- |
| `name`        | string | Y                        | 1~200자                                             |
| `description` | string | N                        | 최대 5000자                                         |
| `serviceType` | `"web" \| "ai" \| "hybrid"` | `startType === "new"`일 때 필수 | 기존 설계 가져오기는 분석 후 확정 가능하므로 선택  |
| `startType`   | `"new" \| "import"` | Y          | 설계 시작 방식                                      |

- 응답 `201`: `{ "project": ProjectRow }`
- `startType === "new"`인데 `serviceType`이 없으면 `400`.
- 생성 시 `serviceType`을 생략하면(가져오기 방식) `service_type`은 `"web"`으로 기본 저장되고, 분석 후 사용자가 `PATCH`로 확정한다.

### GET /api/projects

프로젝트 목록을 조회한다.

- 인증: 필요
- Query: `status` (`all` | `active` | `completed` | `archived`, 생략 시 전체)
- 응답 `200`: `{ "projects": ProjectRow[] }` (`updated_at` 내림차순)
- `status`가 유효하지 않으면 `400`.

### GET /api/projects/[id]

프로젝트 상세를 조회한다.

- 인증: 필요
- 응답 `200`: `{ "project": ProjectRow }`
- 본인 소유가 아니거나 존재하지 않으면 `404`.

### PATCH /api/projects/[id]

프로젝트 정보를 수정한다. 모든 필드는 선택이며 전달된 필드만 갱신한다.

- 요청 바디: `name?`, `description?`, `serviceType?`, `status?`
- 응답 `200`: `{ "project": ProjectRow }`

### DELETE /api/projects/[id]

프로젝트를 삭제한다. 하위의 모든 리소스(파일, 노드, 연결, 분석, 문서 등)는 `ON DELETE CASCADE`로 함께 삭제된다 (PRD 16장).

- 응답 `200`: `{ "success": true }`

---

## 3. Design Nodes — 구현

Design Canvas의 노드 CRUD. PRD 7장(노드 시스템), 13.11(design_nodes) 대응.

### GET /api/projects/[id]/nodes

- 응답 `200`: `{ "nodes": DesignNodeRow[] }` (`created_at` 오름차순)

### POST /api/projects/[id]/nodes

사용자가 캔버스에서 직접 생성하는 노드(출처: `manual`)를 만든다. AI 제안을 수락해 생성되는 노드는 이 API가 아니라 제안 수락 트랜잭션(§7)을 통해 생성된다.

- 요청 바디

| 필드          | 타입                                                                                     | 필수 | 설명              |
| ------------- | ---------------------------------------------------------------------------------------- | ---- | ----------------- |
| `nodeType`    | `"problem" \| "requirement" \| "input" \| "process" \| "ai" \| "database" \| "api" \| "output" \| "validation"` | Y    | 노드 유형         |
| `title`       | string                                                                                    | Y    | 1~200자           |
| `description` | string                                                                                    | N    | 최대 5000자       |
| `position`    | `{ x: number, y: number }`                                                               | Y    | 캔버스 좌표       |

- 응답 `201`: `{ "node": DesignNodeRow }`
- `content`는 생성 시 입력받지 않고 DB 기본값(`{}`)으로 시작하며, 이후 `PATCH`로 채운다.
- `source_suggestion_id`는 `null`로 생성되어 manual 출처임을 나타낸다.

### PATCH /api/nodes/[id]

노드를 수정한다. 모든 필드는 선택이며 전달된 필드만 갱신한다.

- 요청 바디: `title?`, `description?`, `content?`, `position?`, `status?`
  - `content`: `{ inputs?, outputs?, process?, technologies?, failureCases?, validationMethods?, decisions?, unresolvedItems? }` (문자열 배열)
  - `status`: `"not_started" | "in_progress" | "decided" | "needs_review"`
- 응답 `200`: `{ "node": DesignNodeRow }`
- Design Canvas 자동 저장(PRD 15.6)은 위치 변경 시 debounce를 적용해 이 API를 호출한다.

### DELETE /api/nodes/[id]

노드를 삭제한다. 해당 노드를 참조하는 `node_connections`, `design_node_sources`, `finding_nodes`는 `ON DELETE CASCADE`로 함께 삭제된다.

- 응답 `200`: `{ "success": true }`

---

## 4. Node Connections — 구현

노드 간 연결 CRUD. PRD 7.4, 13.13(node_connections) 대응.

### GET /api/projects/[id]/connections

- 응답 `200`: `{ "connections": NodeConnectionRow[] }`

### POST /api/projects/[id]/connections

- 요청 바디

| 필드             | 타입                                       | 필수 | 설명                      |
| ---------------- | ------------------------------------------- | ---- | ------------------------- |
| `sourceNodeId`   | UUID                                         | Y    | 출발 노드                 |
| `targetNodeId`   | UUID                                         | Y    | 도착 노드                 |
| `edgeType`       | `"data" \| "control" \| "dependency"`       | N    | 생략 시 `"data"`          |

- 응답 `201`: `{ "connection": NodeConnectionRow }`
- `sourceNodeId === targetNodeId`면 `400` (자기 자신으로의 연결 금지).
- AI가 제안한 연결은 사용자가 제안을 수락하기 전까지 이 테이블에 저장하지 않는다(PRD 7.4) — AI 제안 단계의 연결은 `node_suggestions.original_payload` 안에 보관된다.

### PATCH /api/connections/[id]

연결 유형만 변경한다.

- 요청 바디: `{ "edgeType": "data" | "control" | "dependency" }`
- 응답 `200`: `{ "connection": NodeConnectionRow }`

### DELETE /api/connections/[id]

- 응답 `200`: `{ "success": true }`

---

## 5. Design Files — 계획 (Sprint 3)

기존 설계 파일 업로드/관리. PRD 5.3, 8장, 13.3(design_files), 13.4(file_extractions) 대응.

| Method | Endpoint                   | 기능        | 설명                                                                 |
| ------ | --------------------------- | ----------- | ---------------------------------------------------------------------- |
| POST   | `/api/projects/[id]/files`  | 파일 업로드 | 복수 파일 동시 업로드. Storage 저장 → `design_files` 생성 → 추출 작업 시작 |
| GET    | `/api/projects/[id]/files`  | 파일 목록   | `status`(uploaded/extracting/extracted/analyzing/completed/failed) 포함 |
| DELETE | `/api/files/[id]`           | 파일 삭제   | Storage 원본과 `design_files` 레코드를 함께 삭제                       |

- 업로드 요청은 `multipart/form-data`로 받아 서버에서 확장자 검증 → 실제 MIME 타입 검증 → 크기 제한 검증을 수행한다 (PRD 5.3, 16장).
- 업로드 직후 응답은 `status: "uploaded"`인 `design_files` 레코드이며, 추출 완료 여부는 `GET` polling 또는 추출 완료 이벤트로 확인한다.
- 파일 하나의 추출/분석 실패가 다른 파일 처리를 중단시키지 않는다 (PRD 5.3).

---

## 6. Import Analysis — 계획 (Sprint 3~4)

여러 파일의 통합 분석. PRD 8.3~8.6, 13.5(design_analysis_runs) 대응.

| Method | Endpoint                               | 기능           |
| ------ | --------------------------------------- | -------------- |
| POST   | `/api/projects/[id]/import-analysis`    | 통합 파일 분석 실행 |
| GET    | `/api/analysis/[id]`                    | 분석 실행 결과 조회 |
| POST   | `/api/analysis/[id]/apply`              | 분석 결과를 설계에 반영 |

- `POST /api/projects/[id]/import-analysis`
  - 요청 바디: `{ "fileIds": string[] }` (추출 완료된 파일만 대상)
  - 응답 `202`: `{ "analysisRun": { id, status: "analyzing", ... } }`
- `GET /api/analysis/[id]`
  - 응답: `design_analysis_runs` 레코드 + `result`(`ImportedDesignAnalysis`, PRD 8.4) + 연결된 `design_findings`
- `POST /api/analysis/[id]/apply`
  - 요청 바디: 반영할 `systemComponents` id 목록, 제외 항목, 사용자 수정 내용
  - 처리: 노드/연결 검증 → `design_nodes` 생성 → `design_node_sources` 저장 (PRD 15.4)
  - 동일 분석 결과를 중복 반영해도 노드가 중복 생성되지 않도록 멱등성을 보장한다 (`analysis_run_id` + 원본 `systemComponents.id` 조합으로 반영 여부 추적).
- 파일이 추가/교체되면 새로운 `analysisRun`을 생성하고 기존 결과는 보존한다 (PRD 8.6, MVP는 전체 재분석만 지원).

---

## 7. Design Questions / Answers / Node Suggestions — 계획 (Sprint 4)

AI Guide 질문-답변-노드 제안 플로우. PRD 6장, 11장, 13.7~13.10 대응.

| Method | Endpoint                                 | 기능           |
| ------ | ------------------------------------------ | -------------- |
| POST   | `/api/projects/[id]/questions`             | 다음 질문 생성 |
| POST   | `/api/questions/[id]/answers`              | 답변 저장      |
| POST   | `/api/answers/[id]/generate-suggestions`   | 노드 제안 생성 |
| PATCH  | `/api/suggestions/[id]`                    | 제안 수정      |
| POST   | `/api/suggestions/[id]/accept`             | 제안 수락      |
| POST   | `/api/suggestions/[id]/reject`             | 제안 거부      |

- `POST /api/projects/[id]/questions`
  - 현재 설계 단계와 확정된 설계 수준을 기준으로 Cloudflare Workers AI에 질문 생성을 요청한다 (PRD 12.4 입력 컨텍스트).
  - 응답: `design_questions` 레코드 (`hints` 포함)
- `POST /api/questions/[id]/answers`
  - 요청 바디: `{ "answer": string }`
  - 응답: `design_answers` 레코드. 질문 `status`를 `answered`로 갱신.
- `POST /api/answers/[id]/generate-suggestions`
  - AI 응답을 Zod로 검증 후 `suggestion_batches` + `node_suggestions`(상태 `pending`)로 저장 (PRD 11.1, 12.6).
  - 응답 `202`: `{ "batch": { id, status: "generating" } }`
- `PATCH /api/suggestions/[id]`
  - 요청 바디: 수정된 노드 필드 (제목/유형/설명/입력·출력/처리 방식/기술 스택/예외 상황/검증 방법)
  - `original_payload`는 변경하지 않고 `revised_payload`에 저장, 상태를 `modified_pending`으로 변경 (PRD 11.4).
- `POST /api/suggestions/[id]/accept`
  - PRD 11.3 / 15.5의 트랜잭션을 수행한다: 제안 조회·잠금 → 상태 확인(이미 수락 시 기존 `generated_node_id` 그대로 반환) → 최종 payload(`revised_payload ?? original_payload`) 선택 → 검증 → `design_nodes` INSERT → 승인된 `node_connections` INSERT → `node_suggestions.status = "accepted"` → `generated_node_id` 저장 → `suggestion_events` INSERT → COMMIT.
  - Supabase RPC(PostgreSQL 함수) 기반 트랜잭션으로 구현하며 실패 시 전체 롤백한다.
  - 응답 `200`: `{ "node": DesignNodeRow, "connections": NodeConnectionRow[] }`
- `POST /api/suggestions/[id]/reject`
  - 요청 바디: `{ "reason": "현재 프로젝트에 불필요" | "기존 노드와 중복" | "다른 방식으로 처리 예정" | "기술적으로 부적절" | "기타", "note"?: string }`
  - `node_suggestions.status = "rejected"`, `rejection_reason` 저장, `suggestion_events` INSERT (PRD 11.5).

---

## 8. Design Findings & Review — 계획 (Sprint 5)

설계 검토 및 문제 관리. PRD 9.4~9.6, 10장, 13.14~13.16, 13.18 대응.

| Method | Endpoint                         | 기능           |
| ------ | ---------------------------------- | -------------- |
| GET    | `/api/projects/[id]/findings`      | 문제 목록      |
| PATCH  | `/api/findings/[id]`               | 문제 상태 변경 |
| POST   | `/api/projects/[id]/review`        | 설계 검토 실행 |

- `GET /api/projects/[id]/findings`
  - Query: `status?`, `severity?`, `findingType?`
  - 응답: `design_findings[]` + 연결된 `finding_sources`, `finding_nodes` (출처 파일, 관련 노드)
- `PATCH /api/findings/[id]`
  - 요청 바디: `{ "status": "accepted" | "dismissed" | "resolved" }`
  - AI는 문제 해결 여부를 자동 확정하지 않으므로 이 전환은 항상 사용자 액션으로만 발생한다 (PRD 10.3).
- `POST /api/projects/[id]/review`
  - 확정된 노드/연결 전체를 대상으로 누락·충돌·개선 사항을 재검토하고 `design_reviews`(또는 신규 `design_findings`)를 생성한다.
  - 응답 `202`: `{ "reviewRun": { status: "analyzing" } }`, 완료 후 findings 목록에 반영.

---

## 9. Documents — 계획 (Sprint 6)

확정 설계의 문서화. PRD 5.5, 13.19(document_versions) 대응.

| Method | Endpoint                         | 기능      |
| ------ | --------------------------------- | --------- |
| POST   | `/api/projects/[id]/documents`    | 문서 생성 |
| GET    | `/api/projects/[id]/documents`    | 문서 목록 |

- `POST /api/projects/[id]/documents`
  - 요청 바디: `{ "documentType": "prd" | "architecture" | "tasks" }`
  - 확정된 노드·연결·검토 결과를 Cloudflare Workers AI에 전달해 Markdown 문서를 생성한다.
  - 응답 `201`: `{ "document": DocumentVersionRow }` (`version`은 같은 `documentType` 기준 자동 증가)
- `GET /api/projects/[id]/documents`
  - Query: `documentType?`
  - 응답: `document_versions[]` (최신 버전 우선)
- ERD, Mermaid 다이어그램, Markdown 다운로드는 생성된 `content`를 그대로 내려주는 클라이언트 측 처리로 해결하며 별도 엔드포인트를 두지 않는다.

---

## 10. 엔드포인트 요약

| Method | Endpoint                                 | 기능                 | 상태 |
| ------ | ------------------------------------------ | -------------------- | ---- |
| POST   | `/api/projects`                            | 프로젝트 생성         | 구현 |
| GET    | `/api/projects`                            | 프로젝트 목록         | 구현 |
| GET    | `/api/projects/[id]`                       | 프로젝트 상세         | 구현 |
| PATCH  | `/api/projects/[id]`                       | 프로젝트 수정         | 구현 |
| DELETE | `/api/projects/[id]`                       | 프로젝트 삭제         | 구현 |
| GET    | `/api/projects/[id]/nodes`                 | 노드 목록             | 구현 |
| POST   | `/api/projects/[id]/nodes`                 | 노드 생성(manual)     | 구현 |
| PATCH  | `/api/nodes/[id]`                          | 노드 수정             | 구현 |
| DELETE | `/api/nodes/[id]`                          | 노드 삭제             | 구현 |
| GET    | `/api/projects/[id]/connections`           | 연결 목록             | 구현 |
| POST   | `/api/projects/[id]/connections`           | 연결 생성             | 구현 |
| PATCH  | `/api/connections/[id]`                    | 연결 유형 수정         | 구현 |
| DELETE | `/api/connections/[id]`                    | 연결 삭제             | 구현 |
| POST   | `/api/projects/[id]/files`                 | 파일 업로드           | 계획 |
| GET    | `/api/projects/[id]/files`                 | 파일 목록             | 계획 |
| DELETE | `/api/files/[id]`                          | 파일 삭제             | 계획 |
| POST   | `/api/projects/[id]/import-analysis`       | 통합 파일 분석         | 계획 |
| GET    | `/api/analysis/[id]`                       | 분석 결과 조회         | 계획 |
| POST   | `/api/analysis/[id]/apply`                 | 분석 결과 반영         | 계획 |
| POST   | `/api/projects/[id]/questions`             | 질문 생성             | 계획 |
| POST   | `/api/questions/[id]/answers`              | 답변 저장             | 계획 |
| POST   | `/api/answers/[id]/generate-suggestions`   | 노드 제안 생성         | 계획 |
| PATCH  | `/api/suggestions/[id]`                    | 제안 수정             | 계획 |
| POST   | `/api/suggestions/[id]/accept`             | 제안 수락             | 계획 |
| POST   | `/api/suggestions/[id]/reject`             | 제안 거부             | 계획 |
| GET    | `/api/projects/[id]/findings`              | 문제 목록             | 계획 |
| PATCH  | `/api/findings/[id]`                       | 문제 상태 변경         | 계획 |
| POST   | `/api/projects/[id]/review`                | 설계 검토             | 계획 |
| POST   | `/api/projects/[id]/documents`             | 문서 생성             | 계획 |
| GET    | `/api/projects/[id]/documents`             | 문서 목록             | 계획 |

`/api/projects/[id]/analyze`(프로젝트 초기 분석, PRD 14장)는 "새 설계 시작" 흐름의 1차 서비스 설명 분석으로, §6의 `import-analysis`와 별개로 Sprint 4에서 함께 구현한다.
