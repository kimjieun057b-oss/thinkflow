# 제품 핵심 원칙 (PRD 2장 기반)

## 1. AI는 설계를 대신하지 않는다

- 사용자가 먼저 생각하고 답변하도록 유도하는 UX/로직을 만든다. AI가 정답을 바로 제시하는 흐름을 기본값으로 두지 않는다.
- 사용자가 결정하지 않은 사항은 임의로 확정하지 않는다 — 미결정 상태(`not_started` 등)를 유지한다.
- 기술을 추천하는 기능은 선택 근거와 대안을 함께 반환해야 한다.
- 기존 업로드 파일의 내용과 AI의 추론을 응답/UI에서 명확히 구분해 표시한다.

## 2. 사용자 결정 우선

- AI가 제안한 노드/연결은 사용자 승인 전까지 `design_nodes` / `node_connections`에 저장하지 않는다. 제안은 `node_suggestions` 등 별도 테이블에 보관한다.
- 사용자가 수정한 내용(`revised_payload`)은 AI 최초 제안(`original_payload`)과 별도로 보존한다. 최초 제안은 절대 덮어쓰지 않는다.
- 사용자가 거부한 제안은 사유(`rejection_reason`)와 함께 기록하고, 이후 AI 분석의 참고 정보로 활용한다.
- 기존 업로드 파일의 원본은 AI가 임의로 수정하지 않는다.

## 3. 출처 기반 분석

- 기존 설계 파일을 분석할 때 모든 중요 판단에는 출처(파일명, 위치/페이지, 원문 일부)를 연결한다.
- AI가 파일에 명시되지 않은 내용을 추론했다면 추론임을 명시적으로 표시한다 (예: "AI 추론" 배지).
- 근거가 부족한 문제는 확정적 오류(`conflict`)로 표시하지 않고 `missing`/확인 필요로 분류한다.

## 4. 설계 데이터와 AI 결과의 분리

다음 데이터는 서로 다른 레이어로 관리하며 서로 섞이거나 덮어써지지 않아야 한다:

- 사용자 원본 답변 (`design_answers`)
- 업로드된 원본 파일 (`design_files`, Storage)
- 파일별 추출 결과 (`file_extractions`)
- AI 통합 분석 결과 (`design_analysis_runs`)
- AI 최초 노드 제안 (`node_suggestions.original_payload`)
- 사용자 수정 노드 제안 (`node_suggestions.revised_payload`)
- 최종 확정 설계 노드 (`design_nodes`)
- 설계 검토 결과 (`design_reviews`, `design_findings`)
- 문서와 버전 (`document_versions`)

## 5. 통합형 AI Assistant — 숙련도 선택 기능을 만들지 않는다

- 사용자 숙련도를 선택하게 하는 UI/필드를 추가하지 않는다 (`projects.user_mode` 컬럼 사용 금지).
- 설명·질문 깊이는 아래 맥락으로 서버 로직에서 조절한다: 현재 답변, 이전 질문/답변, 현재 설계 단계, 확정된 설계 수준, 업로드 자료 복잡도, 미결정 사항, 사용자의 추가 설명 요청.
- Guide / Review / Mentor는 별도 모드가 아니라 하나의 AI Assistant가 수행하는 작업 유형이다. UI에 "모드 전환" 개념을 만들지 않는다.
