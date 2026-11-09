# ThinkFlow AI — Design System

이 문서는 ThinkFlow AI의 실제 디자인 토큰(색상/폰트/반경/버튼 등)과, 신규로 구축하는 **워크스페이스 캔버스(다이어그램)** 디자인 규칙을 정의한다.

- 기본 토큰(색상/폰트/반경)은 `src/app/globals.css`, `src/components/ui/*`에 **이미 구현되어 있는 shadcn/ui 기반 값**을 그대로 문서화한 것이다. 새로운 값을 임의로 만들지 않고 기존 시스템을 우선 재사용한다 ([CLAUDE.md](CLAUDE.md) Design Modification Rules 준수).
- 캔버스/노드/엣지 관련 토큰 중 `(신규 제안)`으로 표시된 항목은 아직 코드에 없는, 이번 워크스페이스 기능을 위해 새로 추가해야 하는 값이다. 기존 토큰 네이밍 규칙(`--color-*`, oklch, Tailwind v4 `@theme inline`)을 그대로 따른다.
- 이 문서는 디자인 레퍼런스이며, 실제 반영은 `src/app/globals.css`, `src/components/ui/*`, `src/components/workspace/*`에 코드로 구현한다.

---

## 1. 색상 토큰 (Color Tokens)

색상은 Tailwind v4 `@theme inline` + CSS 변수(oklch) 조합으로 정의되어 있다 (`src/app/globals.css`). 아래 HEX 값은 라이트 모드 oklch 값을 sRGB로 변환한 참고값이며, 실제 코드에서는 반드시 oklch 변수를 사용한다.

### 1.1 Base 토큰 (Light)

| 토큰 (CSS 변수) | oklch | HEX (참고) | 용도 |
| --- | --- | --- | --- |
| `--background` | `oklch(1 0 0)` | `#ffffff` | 페이지 배경 |
| `--foreground` | `oklch(0.145 0 0)` | `#0a0a0a` | 기본 텍스트 |
| `--card` / `--popover` | `oklch(1 0 0)` | `#ffffff` | 카드·팝오버 배경 |
| `--card-foreground` / `--popover-foreground` | `oklch(0.145 0 0)` | `#0a0a0a` | 카드·팝오버 텍스트 |
| `--primary` | `oklch(0.205 0 0)` | `#171717` | 기본 버튼/강조 배경 |
| `--primary-foreground` | `oklch(0.985 0 0)` | `#fafafa` | primary 위 텍스트 |
| `--secondary` / `--muted` / `--accent` | `oklch(0.97 0 0)` | `#f5f5f5` | 보조 배경, 비활성 영역 |
| `--secondary-foreground` / `--accent-foreground` | `oklch(0.205 0 0)` | `#171717` | 보조 배경 위 텍스트 |
| `--muted-foreground` | `oklch(0.556 0 0)` | `#737373` | 보조/설명 텍스트 |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `#e7000b` | 오류, 삭제, 위험 액션 |
| `--border` / `--input` | `oklch(0.922 0 0)` | `#e5e5e5` | 구분선, 입력 테두리 |
| `--ring` | `oklch(0.708 0 0)` | `#a1a1a1` | 포커스 링 기본색 |
| `--chart-1` ~ `--chart-5` | `0.87 → 0.556 → 0.439 → 0.371 → 0.269 (0 0)` | `#d4d4d4 / #737373 / #525252 / #404040 / #262626` | 데이터 시각화용 그레이스케일 5단계 |

### 1.2 Base 토큰 (Dark — `.dark` 클래스)

| 토큰 | oklch | HEX (참고) |
| --- | --- | --- |
| `--background` | `oklch(0.145 0 0)` | `#0a0a0a` |
| `--card` / `--popover` | `oklch(0.205 0 0)` | `#171717` |
| `--primary` | `oklch(0.922 0 0)` | `#e5e5e5` |
| `--secondary` / `--muted` / `--accent` | `oklch(0.269 0 0)` | `#262626` |
| `--muted-foreground` | `oklch(0.708 0 0)` | `#a1a1a1` |
| `--destructive` | `oklch(0.704 0.191 22.216)` | `#ff6467` |
| `--border` | `oklch(1 0 0 / 10%)` | `#ffffff` (10% 불투명도) |
| `--input` | `oklch(1 0 0 / 15%)` | `#ffffff` (15% 불투명도) |

다크 모드 전환은 `.dark` 클래스 토글 방식(`next-themes`, 이미 의존성 포함)을 그대로 사용한다. MVP 1차 구현은 라이트 모드 우선, 다크 모드 토큰은 유지만 한다.

### 1.3 상태(Status) 시맨틱 색상 `(신규 제안)`

현재 코드에는 `destructive` 외의 시맨틱 컬러가 없다. 캔버스의 분석 상태(`uploaded → extracting → analyzing → completed/failed`), 노드 제안 상태(`pending → accepted/rejected`), 문제(Finding) 심각도 표시를 위해 아래 토큰을 `--destructive`와 동일한 패턴(라이트: L 0.55~0.72 / C 0.14~0.2, 다크: 더 밝고 채도 낮게)으로 추가한다.

| 토큰 (신규) | oklch (Light) | HEX (참고) | oklch (Dark) | HEX (참고) | 의미 |
| --- | --- | --- | --- | --- | --- |
| `--color-info` (running/진행중) | `oklch(0.577 0.19 264)` | `#3d70e8` | `oklch(0.704 0.17 264)` | `#689bff` | 분석/AI 호출 진행 중, 활성 연결선 |
| `--color-success` (completed/accepted) | `oklch(0.6 0.14 152)` | `#2a9754` | `oklch(0.72 0.16 152)` | `#42c070` | 완료, 승인됨, 충돌 없음 |
| `--color-warning` (missing/확인 필요) | `oklch(0.72 0.17 70)` | `#e68d00` | `oklch(0.8 0.17 80)` | `#f6af00` | 정보 부족(`missing`), 검토 필요 |
| `--color-error` (failed/conflict) | `= --destructive` | `#e7000b` | `= --destructive` | `#ff6467` | 추출/분석 실패, `conflict` 문제 |
| `--color-pending` (대기) | `= --muted-foreground` | `#737373` | `= --muted-foreground` | `#a1a1a1` | 대기, 미시작, 미결정 |

> `missing`과 `conflict`를 시각적으로도 구분한다 (경고=노랑 / 오류=빨강) — [`ai-integration.md`](.claude/rules/ai-integration.md)의 "정보 부족과 실제 오류 구분" 원칙 반영.

### 1.4 Radius 토큰 (실제 구현값)

기준값 `--radius: 0.625rem (10px)`에서 비율로 파생된다 (`@theme inline`).

| 토큰 | 계산식 | px 값 | Tailwind 클래스 |
| --- | --- | --- | --- |
| `--radius-sm` | `radius * 0.6` | 6px | `rounded-sm` |
| `--radius-md` | `radius * 0.8` | 8px | `rounded-md` |
| `--radius-lg` | `radius * 1.0` | 10px | `rounded-lg` (버튼 기본) |
| `--radius-xl` | `radius * 1.4` | 14px | `rounded-xl` (카드 기본) |
| `--radius-2xl` | `radius * 1.8` | 18px | `rounded-2xl` |
| `--radius-3xl` | `radius * 2.2` | 22px | `rounded-3xl` |
| `--radius-4xl` | `radius * 2.6` | 26px | `rounded-4xl` (배지 pill) |

---

## 2. 타이포그래피 (Typography)

### 2.1 폰트 패밀리 (실제 구현)

`src/app/layout.tsx`에서 `next/font/google`로 로드한다.

| 역할 | 폰트 | CSS 변수 |
| --- | --- | --- |
| 본문/UI (`font-sans`, `font-heading`) | Geist Sans | `--font-geist-sans` |
| 코드/숫자/모노스페이스 (`font-mono`) | Geist Mono | `--font-geist-mono` |

제목(`CardTitle` 등)은 별도 디스플레이 폰트 없이 `--font-heading: var(--font-sans)`로 Geist Sans를 그대로 사용한다 (추가 웹폰트 로드 금지 — 성능/일관성 유지).

### 2.2 타입 스케일 (Tailwind v4 기본 스케일 사용)

| 클래스 | 크기 / 행간 | 용도 (실사용처) |
| --- | --- | --- |
| `text-xs` | 12px / 16px | 메타 정보, 타임스탬프, 배지, 캡션 |
| `text-sm` | 14px / 20px | 기본 본문, 카드 설명(`CardDescription`), 버튼 기본 |
| `text-base` | 16px / 24px | 카드 타이틀(`CardTitle`), 섹션 제목 |
| `text-lg` | 18px / 28px | 패널/모달 제목 |
| `text-xl` | 20px / 28px | 페이지 타이틀 |

폰트 굵기: 본문 `font-normal(400)`, 강조/타이틀 `font-medium(500)`. `font-bold(700)` 이상은 사용하지 않는다 (기존 UI가 medium 중심의 절제된 톤 유지).

---

## 3. 버튼 규격 (Button Spec)

`src/components/ui/button.tsx` (`cva` 기반) 실제 값.

### 3.1 Variant (색상)

| Variant | 배경 | 텍스트 | hover | 용도 |
| --- | --- | --- | --- | --- |
| `default` | `--primary` (#171717) | `--primary-foreground` (#fafafa) | `primary/80` | 주요 액션 (제안 수락 등) |
| `secondary` | `--secondary` (#f5f5f5) | `--secondary-foreground` | `secondary` +5% foreground | 보조 액션 |
| `outline` | `--background` + 1px `border` | `--foreground` | `--muted` | 중립 액션 |
| `ghost` | 투명 | `--foreground` | `--muted` | 아이콘/툴바 버튼 |
| `destructive` | `destructive/10` | `--destructive` | `destructive/20` | 삭제, 거부 |
| `link` | 투명 | `--primary` (밑줄) | underline | 텍스트형 액션 |

### 3.2 Size (치수)

| Size | 높이 | 가로 패딩 | Radius | 폰트 | 용도 |
| --- | --- | --- | --- | --- | --- |
| `xs` | 24px (`h-6`) | 8px | 8px | 12px | 인라인/캔버스 노드 내부 버튼 |
| `sm` | 28px (`h-7`) | 10px | 8px | 12.8px | 패널 보조 버튼 |
| `default` | 32px (`h-8`) | 10px | 10px | 14px | 기본 버튼 |
| `lg` | 36px (`h-9`) | 10px | 10px | 14px | 주요 CTA |
| `icon` / `icon-sm` / `icon-xs` | 32 / 28 / 24px 정사각형 | — | 10 / 8 / 8px | — | 아이콘 전용 |

### 3.3 상태 (State)

- **Focus**: `ring-3`, 색상 `ring-ring/50` (2px 톤다운 ring), 테두리 `border-ring`.
- **Active(클릭)**: `translate-y-px` (1px 눌림 효과), 팝오버/드롭다운 트리거는 제외.
- **Disabled**: `opacity-50`, `pointer-events-none`.
- **Invalid**: `border-destructive`, `ring-destructive/20` (다크 `/40`).

---

## 4. 배지 (Badge) 규격

`src/components/ui/badge.tsx` 기준.

| 속성 | 값 |
| --- | --- |
| 높이 | 20px (`h-5`) |
| 좌우 패딩 | 8px |
| Radius | 26px (`rounded-4xl`, pill) |
| 폰트 | 12px / medium |
| 아이콘 | 12px (`size-3`) |

| Variant | 배경 | 텍스트 | 권장 용도 (캔버스 상태 배지 매핑) |
| --- | --- | --- | --- |
| `default` | `--primary` | `--primary-foreground` | 강조 라벨 |
| `secondary` | `--secondary` | `--secondary-foreground` | 일반 라벨 (대기/pending) |
| `outline` | 투명 + border | `--foreground` | 보조 라벨, 노드 타입 태그 |
| `destructive` | `destructive/10` | `--destructive` | `conflict`, 분석 실패 |
| `info` `(신규 제안)` | `info/10` | `--color-info` | `running`, 진행 중 |
| `success` `(신규 제안)` | `success/10` | `--color-success` | `completed`, `accepted` |
| `warning` `(신규 제안)` | `warning/10` | `--color-warning` | `missing`, 확인 필요 |

---

## 5. 카드 (Card) 규격

`src/components/ui/card.tsx` 기준. 캔버스 노드 카드의 베이스 컴포넌트로 **그대로 재사용**한다.

| 속성 | 값 |
| --- | --- |
| 배경 | `--card` (#ffffff) |
| 테두리 | `ring-1 ring-foreground/10` (1px, foreground 10% 불투명도 — `--border`가 아닌 ring 사용에 주의) |
| Radius | 14px (`rounded-xl`) |
| 내부 패딩(`--card-spacing`) | 기본 16px, `size="sm"` 시 12px |
| Header~Content 간격 | 4px (`gap-1`) |

---

## 6. 워크스페이스 캔버스 디자인 (신규)

`@xyflow/react`(React Flow, 이미 의존성 설치됨)로 구현하는 설계 다이어그램 영역의 규칙이다. 참조 이미지(에이전트 오케스트레이션 카드형 다이어그램)의 **노드 카드 UI 패턴은 차용**하되, 레이아웃 방향과 조작 방식은 아래와 같이 조정한다.

### 6.1 레이아웃 방향 — 세로 → **가로(LR)**

- 참조 이미지는 세로(위→아래) 트리 구조지만, ThinkFlow 워크스페이스는 **가로(왼쪽→오른쪽, `direction: "LR"`)**로 설계 흐름이 이어지도록 한다.
- 루트/상위 노드(예: 프로젝트, 서비스 개요)를 좌측에 배치하고, 하위로 갈수록 오른쪽으로 전개한다.
- React Flow는 방향을 강제하지 않으므로, 신규 노드의 초기 좌표는 "부모 x + (카드 너비 + `--canvas-gap-x`)"로 계산해 가로로 전개한다. 자동 정렬이 필요해질 경우에만 `dagre`/`elkjs`를 `rankdir: "LR"`로 적용한다 (MVP는 수동 좌표로 충분, P1에서 검토).
- 사용자가 직접 옮긴 노드 위치는 자동 레이아웃이 덮어쓰지 않는다 (must-follow #20).

### 6.2 캔버스 조작 — 자유 패닝 + 줌

| 옵션 | 값 | 설명 |
| --- | --- | --- |
| `panOnDrag` | `true` | 빈 캔버스를 마우스로 클릭-드래그하면 상하좌우 자유 이동 |
| `panOnScroll` | `false` | 스크롤/휠은 줌 전용으로 둬서 패닝과 충돌 방지 |
| `zoomOnScroll` / `zoomOnPinch` | `true` | 휠 줌, 트랙패드 핀치 줌 |
| `minZoom` / `maxZoom` | `0.25` / `1.5` | 과도한 축소·확대 방지 |
| `nodesDraggable` | `true` | 개별 노드도 자유롭게 드래그 가능 |
| `fitView` | 최초 진입 시 1회 | 전체 다이어그램이 보이도록 초기 맞춤 |
| `panOnDrag` 보조 | 스페이스바+드래그 또는 중간 버튼 드래그 (선택) | 노드가 많아져 빈 공간이 좁을 때 패닝 보조 |

### 6.3 노드 카드 규격 `(신규 제안)`

`Card` / `CardHeader` / `CardContent` / `Badge` / `Progress` 컴포넌트를 조합해 구성한다.

| 속성 | 값 |
| --- | --- |
| 카드 너비 | 260px \~ 320px (내용에 따라 가변, 고정폭 권장 280px) |
| 배경/테두리/radius | §5 Card 규격과 동일 (`--card`, `ring-foreground/10`, 14px) |
| 헤더 | 아이콘(16px, lucide-react) + 타입/제목(`text-base font-medium`) + 상태 배지(우측 정렬) |
| 본문 행 1개 | 라벨(`text-sm`) + 진행 바(`Progress`, 높이 4px) + 소요시간(`text-xs text-muted-foreground tabular-nums`, 우측 정렬) |
| 푸터 | 비용/시간 요약 (`text-xs text-muted-foreground`), 구분선 없이 본문과 4px 간격 |
| 노드 간 가로 간격 (`--canvas-gap-x`) | 96px |
| 노드 간 세로 간격 (`--canvas-gap-y`) | 24px |

### 6.4 노드 상태 → 색상 매핑

| 상태 | 배지 색상 | 좌측 액센트/테두리 (선택) |
| --- | --- | --- |
| `pending` / 대기 | `--color-pending` (`secondary` 배지) | 없음 |
| `running` / 진행 중 | `--color-info` (파랑) | 2px 좌측 보더, `--color-info` |
| `completed` / `accepted` | `--color-success` (초록) | 없음 (완료 후 평상시 톤으로 복귀) |
| `missing` / 확인 필요 | `--color-warning` (주황) | 1px 테두리, `--color-warning/40` |
| `failed` / `conflict` | `--color-error` (`--destructive`) | 1px 테두리, `--destructive/40` |

### 6.5 선택(Selected) / 포커스 상태

- 선택된 노드: `ring-[3px] ring-ring/50` + `shadow-md` — 버튼/배지의 기존 `focus-visible` 링 패턴을 그대로 차용해 시스템 일관성을 유지한다.
- 다중 선택 시 선택된 노드들에 동일 스타일 적용, 캔버스 배경에는 선택 박스(selection rectangle) 표시 (React Flow 기본 제공).

### 6.6 연결선 (Edge) 규격 `(신규 제안)`

| 상태 | 색상 | 두께 | 스타일 |
| --- | --- | --- | --- |
| 정적 연결 (확정된 설계 관계) | `--border` (#e5e5e5) | 1.5px | 실선 |
| 활성 연결 (AI 호출/분석 진행 중) | `--color-info` | 2px | 점선 + `animated: true` (React Flow 흐름 애니메이션) |
| 오류/충돌 연결 | `--color-error` | 1.5px | 실선 |
| AI가 추론한 연결 (확정 아님) | `--muted-foreground` | 1.5px | 점선 (`strokeDasharray: "4 4"`) — 확정 연결과 시각적으로 구분 ([product-principles.md](.claude/rules/product-principles.md) §3) |

### 6.7 캔버스 배경

React Flow `<Background />` 기본 Dot 패턴 사용. 점 색상 `--border`(#e5e5e5), 배경 `--background`(#ffffff). 다크 모드에서는 각 토큰이 자동으로 전환된다.

---

## 7. 반응형 / 다크 모드

- PC: 캔버스가 주 영역(가변 너비) + 우측 패널(고정폭, 예 360px) 2분할.
- 모바일: 캔버스 단독 전체 화면 + 패널은 하단 시트(bottom sheet)로 전환 (상세 인터랙션은 구현 시 별도 확정, 현재 문서는 토큰 범위로 한정).
- 모든 색상은 oklch 변수 기반이므로 `.dark` 클래스 적용 시 별도 다크 전용 컴포넌트 없이 자동 전환된다. §1.3 상태 색상도 다크 값 함께 추가해 동일하게 전환되도록 한다.

---

## 8. 구현 시 체크리스트

- [ ] `globals.css`의 `:root` / `.dark`에 §1.3 상태 색상 5종(`--color-info`, `--color-success`, `--color-warning`, `--color-error`, `--color-pending`) 추가 및 `@theme inline`에 매핑.
- [ ] 노드/엣지 컴포넌트는 `components/workspace/{canvas,nodes,edges,panels}`에 위치 ([CLAUDE.md](CLAUDE.md) 디렉터리 구조 준수).
- [ ] React Flow `defaultEdgeOptions`, `fitViewOptions`, `minZoom/maxZoom`을 §6.2 값으로 설정.
- [ ] 노드 위치는 사용자 드래그 후 수동 저장(§ [data-and-transactions.md](.claude/rules/data-and-transactions.md) 캔버스 자동 저장 규칙)이며, 자동 레이아웃 재실행 시 기존 위치를 덮어쓰지 않음.
