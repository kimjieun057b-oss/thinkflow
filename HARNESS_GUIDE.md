# ThinkFlow AI — Claude Code 하네스 구축 가이드

`CLAUDE.md`에 예고된 "하네스 구축" 작업의 구체적인 실행 순서를 정리한 문서다. 여기서 "하네스"는 ThinkFlow AI 제품 자체의 Cloudflare Workers AI 호출 레이어가 아니라, **Claude Code(AI 코딩 에이전트)가 이 저장소에서 작업할 때 `.claude/rules/`의 규칙을 사람이 매번 상기시키지 않아도 자동으로 로드·적용·검증하게 만드는 설정/훅/서브에이전트/커맨드의 총합**을 말한다.

## 0. 왜 지금 구축하는가

- Sprint 1~2(프로젝트 기반, Design Workspace)는 완료됐고 Sprint 3(Design Import, 파일 파싱·AI 연동)부터 본격적으로 Cloudflare Workers AI 호출, Zod 검증, 트랜잭션 코드가 늘어난다.
- `.claude/rules/must-follow-checklist.md`의 20개 항목은 전부 "구현 중에 놓치기 쉬운" 규칙이다(원본 보존, 멱등성, AI 응답 Zod 검증, 프롬프트 인젝션 방어 등). 코드가 쌓이기 전에 하네스로 자동 체크하는 쪽이 리뷰 비용을 줄인다.
- 목표는 "AI가 설계를 대신 완성하지 않는다"는 제품 원칙을, 이제는 "Claude Code가 규칙을 대신 어기지 않는다"는 개발 원칙으로 한 단계 더 보강하는 것이다.

## 1. 현재 상태 (as-is)

| 구성 요소 | 상태 |
| --- | --- |
| `CLAUDE.md` | 존재 — 핵심 규칙 요약 + rules 링크 |
| `.claude/rules/*.md` (5개) | 존재 — product-principles / ai-integration / data-and-transactions / file-import-security / must-follow-checklist |
| `.claude/settings.json` | 없음 |
| Hooks (PreToolUse/PostToolUse 등) | 없음 |
| 전용 서브에이전트/스킬 | 없음 |
| 커스텀 슬래시 커맨드 | 없음 |
| 테스트 러너 | 없음 (`package.json`에 `test` 스크립트 없음, lint만 존재) |
| CI | 미확인 (레포가 git 저장소가 아니므로 추후 설정) |

## 2. 구축 순서

### Phase 1 — 하네스 범위 정의

자동화할 것과 하지 않을 것을 먼저 선을 긋는다.

- 자동화 대상: 규칙 상기, 위험 작업 차단, 저장 시점 검증, 반복 보일러플레이트 생성
- 자동화 비대상: 설계 판단 자체(어떤 노드를 만들지, AI 제안을 수락할지)는 사람(사용자/개발자) 판단 영역 — 이 경계를 넘으면 "AI가 대신 결정한다"는 제품 원칙과 같은 문제가 하네스 레벨에서 재발한다.

### Phase 2 — 기초 설정 파일 (`.claude/settings.json`)

- 권한 정책(allow/ask/deny) 정의
  - deny: `rm -rf`, `git push --force`, `git reset --hard` 등 파괴적 명령
  - allow: `npm run lint`, `git status`, `git diff` 등 읽기 전용/안전 명령
- 환경변수 관련 가드: `CLOUDFLARE_AI_MODEL`, Supabase 키 등 `.env.local`을 Claude가 직접 열람·출력하지 않도록 설정
- `update-config` 스킬로 생성/검증

### Phase 3 — 규칙 자동 로드 강화

- `CLAUDE.md`는 세션 시작 시 항상 로드되므로 이미 1차 하네스 역할을 한다. 다만 `.claude/rules/*.md`는 "링크"만 되어 있고 자동 로드는 아니다.
- 조치안(택1 또는 병행):
  1. 작업 디렉터리별 스코프 `CLAUDE.md` 분산 배치 — 예: `src/app/api/CLAUDE.md`에 `ai-integration.md`·`data-and-transactions.md` 핵심 요약을 임베드해서 API 라우트 작업 시 자동 로드되게 함
  2. `CLAUDE.md`의 "핵심 규칙 요약"을 20개 체크리스트와 1:1 매핑해 누락 보강 (현재 7개 요약 → 20개 전체 커버 여부 재검토)

### Phase 4 — Hooks로 위험 지점 검증

- `PostToolUse` (Edit/Write 후): `npm run lint` 자동 실행 → 실패 시 즉시 피드백
- `PreToolUse` (Edit/Write 전, `src/app/api/**` 경로): Cloudflare Workers AI 호출 코드 작성 시 Zod 검증 누락을 사전 경고하는 가드
- `Stop` (세션 종료 시): 변경된 파일이 `must-follow-checklist.md` 20개 항목 중 관련 항목을 건드렸는지 요약 알림
- 반복적으로 승인하는 안전 명령은 `fewer-permission-prompts` 스킬로 allowlist화해 프롬프트 피로 줄이기

### Phase 5 — 체크리스트 검증 자동화

- 커스텀 슬래시 커맨드 `/must-follow-check` 작성: 현재 diff를 `must-follow-checklist.md` 20개 항목과 대조해 위반 가능성을 보고
- 민감 라우트 변경 시 필수 실행 대상으로 지정:
  - `api/suggestions/[id]/accept` (트랜잭션·멱등성, 항목 5·6)
  - `api/projects/[id]/import-analysis`, `api/analysis/[id]/apply` (출처 연결·원본 보존, 항목 2·13·14)
  - `api/projects/[id]/files` (파일 보안·프롬프트 인젝션 방어, 항목 18·19)
- 기존 `code-review` 스킬과 연계해 "수정 적용까지"는 `--fix` 옵션으로, 리포팅만 필요하면 기본 모드로 사용

### Phase 6 — 전용 서브에이전트/스킬

`skill-creator`로 규칙 문서 단위의 전문 리뷰어를 분리 제작한다 (하나의 범용 리뷰보다 적중률이 높음).

- `ai-integration-reviewer` — `ai-integration.md` 기준, Cloudflare Workers AI 호출부만 전문 리뷰 (컨텍스트 최소 선택, Zod 검증, 추론/사실 구분 표시)
- `transaction-reviewer` — `data-and-transactions.md` 기준, 노드 수락 트랜잭션·멱등성·상태 흐름 리뷰
- `file-security-reviewer` — `file-import-security.md` 기준, 업로드·파싱·프롬프트 인젝션 방어 리뷰

Sprint 3가 AI 연동을 본격 시작하는 구간이므로 `ai-integration-reviewer`를 최우선으로 제작한다.

### Phase 7 — 반복 작업 템플릿화 (커스텀 커맨드)

- `/new-api-route` — 새 Route Handler 생성 시 인증 확인 → 프로젝트 소유권 확인 → Zod 검증 순서의 보일러플레이트를 자동 삽입
- `/new-ai-feature` — Guide/Review/Mentor 신규 기능 추가 시 "AI 응답 규칙 8개"(원칙 12.5) 체크리스트를 코드 주석이 아닌 PR 설명/커밋 메시지 형태로 자동 포함

### Phase 8 — 테스트 하네스 도입

- 현재 테스트 러너가 없으므로 vitest 등을 도입한다.
- 우선순위: Zod 스키마 검증 단위 테스트 → 노드 수락 트랜잭션 멱등성 테스트 → 파서(Markdown/SQL/JSON/PDF) 추출 테스트
- Phase 4의 `PostToolUse` 훅에 관련 테스트 실행을 연결해 "저장하면 바로 깨지는지 안다"는 피드백 루프를 완성

### Phase 9 — CI 통합

- GitHub Actions 등으로 `lint` → `tsc --noEmit`(타입체크) → `test` 순서의 파이프라인 구성
- PR 단계에서 `/code-review` 또는 `/code-review ultra`를 수동 트리거로 연동할지 검토 (자동 실행은 아니며 사용자가 명시적으로 호출해야 함)

### Phase 10 — 문서화 및 유지보수

- 이 문서(`HARNESS_GUIDE.md`)를 `CLAUDE.md`에서 링크해 하네스의 "설계도" 역할을 하게 한다.
- 하네스 구성(settings.json, hooks, 커맨드, 서브에이전트)이 바뀔 때마다 이 문서를 함께 갱신한다. 코드와 괴리된 하네스 가이드는 규칙 문서 자체의 신뢰도를 떨어뜻린다.

## 3. 바로 시작할 것 (우선순위)

1. `.claude/settings.json` 최소 구성 (Phase 2)
2. `PostToolUse` lint 훅 (Phase 4)
3. `/must-follow-check` 커맨드 (Phase 5)
4. `ai-integration-reviewer` 서브에이전트 (Phase 6) — Sprint 3 착수와 직접 맞물림

## 4. 참고 문서

- [CLAUDE.md](CLAUDE.md)
- [.claude/rules/product-principles.md](.claude/rules/product-principles.md)
- [.claude/rules/ai-integration.md](.claude/rules/ai-integration.md)
- [.claude/rules/data-and-transactions.md](.claude/rules/data-and-transactions.md)
- [.claude/rules/file-import-security.md](.claude/rules/file-import-security.md)
- [.claude/rules/must-follow-checklist.md](.claude/rules/must-follow-checklist.md)
