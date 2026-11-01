# 데이터 모델 및 트랜잭션 규칙 (PRD 7, 11, 13, 15장 기반)

## 노드 제안 상태 흐름

```
pending → (수정) → modified_pending → accepted / rejected / superseded
```

- `original_payload`는 생성 후 변경하지 않는다.
- 사용자가 수정하면 `revised_payload`에 별도 저장한다 (원본 보존).
- 거부 시 `rejection_reason`을 저장한다 (선택 사유 또는 직접 입력: 불필요 / 중복 / 다른 방식 처리 예정 / 기술적으로 부적절 / 기타).

## 노드 출처 (`source`)

- `manual`: 사용자가 직접 생성
- `ai_suggestion`: AI 제안을 승인하여 생성
- `imported`: 기존 설계 파일 분석을 통해 생성

`design_nodes.source_suggestion_id`는 nullable + **UNIQUE 제약** — 동일 제안으로 노드가 두 번 생성되는 것을 DB 레벨에서 방지한다.

기존 파일 출처는 `design_node_sources` 연결 테이블로 관리한다 (노드에 직접 저장하지 않음). 하나의 노드가 여러 파일을 근거로 가질 수 있다.

## 노드 수락 트랜잭션 (필수 순서)

1. 제안 조회 및 잠금 (`SELECT ... FOR UPDATE`)
2. 제안 상태 검사
3. 이미 수락된 경우 → 기존 `generated_node_id` 반환 (재실행 시 중복 생성 금지, 멱등성 확보)
4. 최종 payload 선택 (`revised_payload` ?? `original_payload`)
5. 노드 및 연결 관계 데이터 검증
6. `design_nodes` INSERT
7. 승인된 `node_connections` INSERT
8. `node_suggestions.status` → `accepted`, `generated_node_id` 저장
9. `suggestion_events` INSERT (before/after, reason)
10. COMMIT — 실패 시 전체 롤백

Supabase RPC 기반 PostgreSQL 트랜잭션으로 구현한다 (Route Handler에서 여러 쿼리로 분산 처리하지 않음).

## 문제(Finding) 데이터 분리

- 하나의 문제(finding)는 여러 노드/연결과 관련될 수 있다 → `finding_nodes` 연결 테이블로 관리하고, 노드 내부에 중복 저장하지 않는다.
- 출처도 `finding_sources`로 분리 관리한다 (하나의 문제에 여러 출처 가능).

## 캔버스 자동 저장

- 노드 위치 변경 시 debounce 적용 후 저장.
- 노드 내용/연결 변경 시 저장.
- 저장 성공/실패 상태를 UI에 표시하고, 실패 시 재시도 가능하게 한다.
- **AI 분석 상태와 캔버스 저장 상태는 분리**한다 (AI 호출 실패가 캔버스 저장을 막지 않음).

## 재분석 정책

- 파일 추가/교체 시 기존 분석 결과를 덮어쓰지 않고 새로운 `design_analysis_runs` 레코드를 생성한다.
- 이전 분석 결과는 보존하고, 변경된 노드/새로운 문제/해결된 문제를 비교할 수 있게 한다.
- MVP는 전체 재분석만 지원, 부분 재분석은 P1.

## RLS / 접근 제어

- 모든 주요 테이블은 UUID 기본키를 사용한다.
- 사용자 소유 프로젝트 기준으로 RLS를 적용한다 (`projects.user_id` 기준 전파).
- 사용자는 자신이 업로드한 파일만 조회 가능해야 한다.
