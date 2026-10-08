# Manual 콜아웃 UX 정리 계획

- 상태: **Working / 설계 권장안**, 제품 구현·native 수락 완료 아님
- 작성·공식 사례 확인: 2026-10-08
- 계획 담당: `callout_design_plan` (콜아웃 UX 계획 전담)
- 범위: LDS Manual v2 편집·저장·인쇄의 콜아웃 규칙
- 근거: [계획 인덱스](README.md), [현재 매체 배치 규칙](../agent-skills/lds-manual/references/layout.md), [문서 형식](../document-format.md)
- 종료 처리: 수락된 규칙을 durable 문서에 반영하고 이 계획은 판단 이력으로 archive할지 결정한다.

## 1. 해결하려는 문제와 결정 상태

제목이 있는 콜아웃과 본문만 있는 콜아웃을 모두 지원하되, 같은 내용 역할에 같은 종류·간격·편집 진입점을 적용한다. 제목이 없다는 이유만으로 미완성처럼 보이거나 빈 제목 자리에 커서가 갇히는 상태를 없애는 것이 목표다. 모든 콜아웃에 제목을 강제하는 것은 권장하지 않는다.

현재 작성 기준에는 이미 짧은 v2 콜아웃의 제목 생략과 긴 안내의 요약 제목 권장이 있다. 이 계획은 그 사실과 아직 수락되지 않은 편집 상호작용을 구분한다. 사용자 요청은 다른 사례를 조사하고 계획을 작성하라는 것이며, 아래 권장안 전체의 제품 정책 확정이나 코드 구현 승인을 뜻하지 않는다.

| 구분 | 내용 |
|---|---|
| 현행 계약 | 실제 public Core Callout 사용. 색상·아이콘·외곽 스타일은 Core/Theme 소유. v2의 빈 제목은 `title: []`로 보존 가능. v1의 필수 title 계약은 별도 유지 |
| 소스상 현재 후보 | 빈 제목 숨김, 명시적 제목 편집에서만 노출, 본문으로 초점 이동, 제목 있는 경우에만 인쇄 h3 출력 |
| 이 계획의 권장안 | 본문 기본·제목 선택, 종류를 의미로 선택, 첫 가시 줄 기준 아이콘 정렬, 동일 역할의 문서 내 제목 사용을 일관되게 검토 |
| 미확정 | 종류 명칭의 `완료`→`성공` 변경 여부, 제목 삭제 전용 action, 공백/줄바꿈만 있는 제목 판정, 텍스트가 없는 첫 블록 정렬, 중첩 제목의 접근성 계층 |
| 미수락 | 실제 OS 한글 IME, 키보드 경계·Undo 조합, 최신 후보의 편집/인쇄 시각 동등성, PDF 시범 검수 |

## 2. 공식 사례 조사

모든 링크는 2026-10-08 직접 조회한 공식 문서다. 문서에 명시된 계약과 여기서 도출한 제안을 구분한다. 계정에 로그인하여 각 제품을 직접 조작한 결과는 없다. 화면 이미지의 인상만으로 픽셀 정렬·키보드 동작을 확정하지 않는다.

| 사례 / 공식 출처 | 제목과 본문 | 종류·색상·아이콘 | 삽입·속성·키보드 | 이 계획에 주는 근거 |
|---|---|---|---|---|
| [Notion Callouts](https://www.notion.com/help/customize-and-style-your-content#callouts) | 일반 블록처럼 본문·목록·heading을 포함한다. 전용 title 필드 규칙은 이 문서에 없음. heading은 페이지 목차에 포함됨 | 아이콘 교체·제거, 이미지 아이콘, 배경/글자색 선택 가능. 의미별 고정 palette를 강제한다고 명시하지 않음 | `+`와 `/callout` 삽입, handle로 이동·색상 변경. 색상 변경 단축키 설명 있음 | 본문부터 쓰는 흐름과 블록 재사용을 참고. 자유 아이콘/색상을 LDS에 그대로 이식하지 않음 |
| [Confluence 현행 Panel](https://support.atlassian.com/confluence-cloud/docs/insert-elements-into-a-page/#Panel) | 현행 panel 설명에는 독립 title 설정이 명시되지 않음 | info/note/error/success/warning 5 preset, emoji+배경색. 20개 배경색과 emoji 변경·제거 가능 | `/panel`, 메뉴·툴바 삽입 | 종류의 의미와 편집 조작을 분리. 이름만으로 legacy title 기능을 현행 panel에 있다고 추정하지 않음 |
| [Confluence legacy Panel macro](https://support.atlassian.com/confluence-cloud/docs/insert-the-panel-macro/) | title 기본값 none, 지정하면 별도 제목 행. rich text body | border·body·title 행 색을 parameter로 설정 | placeholder 선택→설정 편집. 공식 문서는 legacy editor의 2026년 폐기 시작 안내를 포함 | 제목의 선택성 참고용 역사 사례. 현행 Cloud UX의 목표나 복제 대상으로 삼지 않음 |
| [Material for MkDocs Admonitions](https://squidfunk.github.io/mkdocs-material/reference/admonitions/) | 기본 제목은 종류명, 사용자 제목 가능. `""`로 제목과 아이콘을 함께 제거. 접이식에서는 이 제거가 불가 | 종류별 아이콘, 설정으로 교체 가능 | Markdown `!!!` 문법, 임의 내용·중첩 지원. rich editor 속성 UI는 설명 대상 아님 | 제목 생략을 명시적으로 지원하지만 LDS는 Core 아이콘 유지. 접이식 기능은 현재 요구에 추가하지 않음 |
| [Obsidian Callouts](https://obsidian.md/help/callouts) | 기본 제목은 종류명, 사용자 제목·제목만 있는 콜아웃 지원 | 종류별 배경·아이콘. CSS로 변경·제목 숨김 가능 | Insert callout 명령은 이름 필드에 커서 배치, 선택 텍스트 감싸기, Live Preview 제목 우클릭으로 종류 변경 | 제목부터 입력하는 대안도 존재. 다만 LDS의 빈 제목 숨김·본문 기본 흐름과 다른 선택이므로 복제하지 않음 |
| [Docusaurus Admonitions](https://docusaurus.io/docs/markdown-features/admonitions) | 선택적 사용자 제목과 종류명이 보이는 기본 예제. 사용자 제목 생략이 제목 행 제거를 뜻한다고 명시하지 않음 | note/tip/info/warning/danger, JSX에서 icon/title 지정 가능 | Markdown directive, 중첩·MDX·JSX 지원 | 종류와 사용자 제목을 다른 축으로 설계. 코드 문서의 기본 종류명 제목을 매뉴얼에 자동 생성하지 않음 |

### 조사로 확정할 수 없는 항목

| 항목 | 공식 문서 확인 범위 | 다음 검증 |
|---|---|---|
| 아이콘의 첫 줄 수직 정렬 | 위 문서는 정확한 baseline/행 높이/pixel tolerance를 계약으로 명시하지 않음 | 우리 Core 계약과 Manual 자식 슬롯을 측정하고 native 화면에서 확인 |
| 빈 제목의 여백 | Material의 제목·아이콘 제거 문법과 legacy macro의 none은 명시. 다른 사례의 빈 title 여백·placeholder 규칙은 미확인 | 우리 제목 비편집/편집/삭제/Undo 상태를 같은 화면으로 비교 |
| Enter/화살표/Backspace/IME | Notion의 삽입·색상 단축키와 Obsidian 삽입 초점은 확인. 제목↔본문 경계·IME·Undo 세부 동작은 위 문서에 없음 | 실제 OS 입력기와 키보드 시나리오 직접 수락 |
| 인쇄/PDF | 위 조사 페이지에서 콜아웃별 인쇄 공백·분할·아이콘 보존 계약은 확인하지 못함 | LDS의 A4/PDF 출력물을 별도 확인. 외부 사례가 PDF 동등성을 보장한다고 쓰지 않음 |

**조사에서 도출한 판단:** 제목 선택성은 여러 사례와 양립한다. 그러나 제목 제거 시 아이콘까지 없애는 방식, 자유 색상/emoji 방식, 기본 종류명을 제목으로 생성하는 방식은 서로 다르다. 일관성은 한 제품을 닮는 정도보다 우리 문서에서 같은 상태가 같은 모습·동작을 갖는지로 판정한다.

## 3. 현재 소스와 차이

조사 source epoch: 2026-10-08 07:40 UTC. Manual HEAD는 `f135bc0d54cf605140b74e0af62b7ac8521a600d`이며 worktree는 여러 writer의 진행 중 변경을 포함한다. 아래 hash는 당시 읽은 파일 바이트의 SHA-256이다. HEAD만으로 이 후보를 재현할 수 없고, 최근 kernel/cover 수정과 합친 뒤 다시 pin해야 한다.

| 읽은 파일 | 당시 SHA-256 |
|---|---|
| `apps/editor/src/redesign/manual-node-views.jsx` | `6266f0d63f23574952420ea49e1f7b5d76e25aec5654edd1ac75814c4e1c0c3f` |
| `apps/editor/src/redesign/ManualPrint.jsx` | `970fcf255989fc6cfc3da3f5fac315baa3b0d935c809783f61dd2c3f89dd1e55` |
| `apps/editor/src/redesign/manual-callout-commands.mjs` | `e8866aaa60974f073569b506ac548b5123824c916616909fd71760ee855d7cab` |
| `apps/editor/src/redesign/manual-editor.css` | `028ebc77340797edd95af56699440281286ae03d14a66e89ec397ad57e3fd12a` |
| `apps/editor/src/redesign/manual-kernel.mjs` | `688a50017e2c5d98c12919f99e68c194ea15a1db9c2a20d2c64bcd581d51dfc0` |
| `apps/editor/src/redesign/manual-v2.mjs` | `b5d53e8a72a781efa64598eb782f6ad42def41a727609ad53f803a9676a15ad1` |
| `apps/editor/src/redesign/block-command-catalog.mjs` | `b3750abbd5a8f684fdb8d23110cd476edeaf4b02fad2297cc935af3345a4e9f2` |
| sibling `packages/core/src/components/status/Callout.jsx` (읽기 전용) | `51094bfdb3d08bd49d313802e31918b12339f0ef50632f17f9e11b7c54d4d274` |

- [NodeView](../../apps/editor/src/redesign/manual-node-views.jsx)의 `coreFrame`은 public Callout을 직접 사용하고 PM contentDOM을 Manual 소유 자식 슬롯으로 유지한다. tone 변경 때 바깥 프레임을 다시 렌더링한다.
- [kernel](../../apps/editor/src/redesign/manual-kernel.mjs)의 구조는 `calloutTitle calloutBlock*`다. 새 콜아웃은 빈 title과 본문 문단 하나를 만든다. [DTO](../../apps/editor/src/redesign/manual-v2.mjs)는 `title` inline 배열과 5 tone을 검증한다. `DTOmanual-v2.mjs`라는 파일은 이 checkout에 없고 실제 파일명은 `manual-v2.mjs`다.
- [초점 명령](../../apps/editor/src/redesign/manual-callout-commands.mjs)은 ordinary 빈 제목에서 본문으로 이동하고 명시적 편집 시 빈 제목을 노출한다. 조합 중·읽기 전용 guard, bodyless 초점 복구, Undo 중 문단 재삽입 방지 처리가 소스에 있다. 실제 사용자 조작 성공 근거와는 다르다.
- [속성](../../apps/editor/src/redesign/ManualObjectProperties.jsx)은 `안내/완료/주의/경고/참고`와 `제목 추가/편집`을 제공한다. [editor](../../apps/editor/src/redesign/ManualEditor.jsx)는 현재 target·busy·IME guard 뒤 제목 명령을 연결한다.
- [CSS](../../apps/editor/src/redesign/manual-editor.css)는 빈 title을 명시적 편집 외에는 숨긴다. Core icon은 24px, Manual 제목의 첫 행은 24px이고 본문 paragraph는 22px다. body-only 첫 paragraph에 `(24px - 1lh)/2`만큼 top padding을 적용한다. 첫 블록이 목록·그림·중첩 콜아웃일 때의 일관성은 이 paragraph 규칙만으로 입증되지 않는다.
- [인쇄](../../apps/editor/src/redesign/ManualPrint.jsx)는 `block.title.length > 0`이면 h3를 만든다. 배열 길이와 실제 보이는 제목의 유무가 같은지(공백·hardBreak·mark)는 별도 결정이 필요하다.
- Core의 `navy` 처리 가능성이 Manual DTO의 tone 확대를 뜻하지 않는다. 현재 5개 저장값을 유지하고 sibling Core 내부 스타일/토큰을 수정하지 않는다.

## 4. 대안과 권장안

| 대안 | 장점 | 비용/반례 | 판정 |
|---|---|---|---|
| 모든 콜아웃 제목 필수 | 항상 같은 구조, 주제 탐색 쉬움 | 한 문장에 `안내` 같은 반복 제목이 생김. 기존 body-only를 수정해야 함. 빈 placeholder가 문서처럼 보일 위험 | 비권장 |
| 본문 기본, 제목 선택 | 짧은 안내는 바로 입력하고 긴 안내는 요약 가능. 기존 v2 데이터와 정합 | 숨겨진 제목 편집 진입점과 키보드 경계를 명확히 해야 함 | **권장** |
| 제목 필드 없애고 첫 본문 heading 사용 | 자유 블록 모델로 단순화 | 기존 명시 title·h3·속성·history 이관 필요. 본문 heading과 Callout 주제의 의미가 섞임 | 지금은 비권장 |
| 종류명을 자동 제목으로 생성 | 모든 박스의 종류를 문자로 노출 | 종류 변경 시 authored title와 충돌, 제목 반복. 실제 content인지 UI인지 모호 | 저장 title 자동 생성 비권장 |

### 읽기 규칙 제안

1. **본문이 기본이다.** 한 가지 짧은 보충 문장은 제목 없이 작성한다. 여러 문단·분기·목록을 묶는 주제에는 짧은 요약 제목을 권장한다. 글자 수만으로 제목을 자동 추가하지 않는다.
2. **제목은 종류명이 아니라 내용의 주제다.** `안내`를 반복하기보다 `편집용 파일이 필요한 경우`처럼 독자가 찾을 표현을 쓴다. 동일 역할의 항목이 한 페이지에 함께 있으면 모두 짧은 본문이거나 모두 요약 제목을 갖는지 문맥 검토한다. 문서 전체를 강제로 한 형식으로 바꾸지 않는다.
3. 제목이 있으면 아이콘은 제목 첫 행, 없으면 첫 가시 본문 행과 맞춘다. Core의 24px 아이콘을 유지하고 Manual 소유 자식의 시작 위치로 해결한다. 여러 줄 제목의 전체 높이 중앙에 아이콘을 옮기지 않는다.
4. 빈 제목의 비편집 상태에는 title placeholder·제목 여백을 출력하지 않는다. 제목 편집을 명시적으로 시작할 때만 입력 자리를 보여준다. PDF에는 placeholder가 절대 들어가지 않는다.
5. 첫 본문이 목록이면 첫 항목의 행을 기준으로 하며 번호·bullet 열은 유지한다. 첫 본문이 사진·표·divider처럼 텍스트 행이 없으면 top edge 정렬을 우선 후보로 비교한다. 자동 가짜 제목·문단을 만들어 정렬하지 않는다. 이 경우의 최종 규칙은 시각 수락 후 확정한다.

### 종류와 의미 제안

| 저장 tone (유지) | 현행 UI | 권장 역할 | 사용 예 / 피할 용도 |
|---|---|---|---|
| `signal` | 안내 | 정보·보충·선택 안내, 기본 삽입값 | 추가 파일이 필요한 경우. 단순 강조를 위해 경고로 바꾸지 않음 |
| `cautionary` | 주의 | 행동 전에 확인할 조건·실수 방지 | 저장 전 적용 대상을 확인. 실제 위험 범위를 문장에 씀 |
| `negative` | 경고 | 손상·데이터 유실 등 중대한 위험 또는 차단 이유 | 초기화 시 기존 설정 삭제. 실제 위험 없는 tip에 사용하지 않음 |
| `positive` | 완료 | 성공/정상 결과의 보충 정보 | 정상 완료 시 보관되는 산출물 안내. 해야 할 행동·결과 확인은 절차 단계가 우선 |
| `offline` | 참고 | 중립 참고·범위·조건 | 현재 지원 범위. 연결 상태만을 뜻한다고 확대하지 않음 |

색 이름 대신 의미 이름으로 고른다. icon·color 매핑은 Core/Theme를 그대로 소비한다. `정보`와 `안내`, `성공`과 `완료` 중 최종 UI 명칭은 제품 담당자가 문맥 예제를 보고 결정한다. 종류를 선택할 때 authored title·body를 덮어쓰지 않는다. 위험은 색만으로 전달하지 않고 문장에도 결과·조건을 적는다. 정적 문서 전체 콜아웃에 `role=alert`를 부여하는 제안은 없다.

## 5. 편집 규칙 제안

| 조작 | 권장 결과 | 반드시 보존할 것 |
|---|---|---|
| `/`·삽입 메뉴에서 추가 | 기본 `signal`, 빈 title 슬롯은 숨김, 본문 첫 paragraph에 커서 | schema 슬롯과 새 block ID |
| 문단을 콜아웃으로 변환 | 기존 문장을 본문에 두고 빈 제목을 자동 생성하지 않음 | 원문·inline marks·사용자 metadata·번호목록 의미 |
| 속성→제목 추가 | 선택한 callout ID의 title 슬롯만 노출하고 커서 이동 | 다른 콜아웃/선택의 내용 |
| 기존 제목 편집 | 기존 제목 내용에 진입. 본문·종류는 유지 | title inline 배열·marks |
| 제목 Enter | 본문 첫 편집 가능한 위치로 이동. 본문이 없으면 사용자의 이 조작에서만 안전한 paragraph 생성 후보 | Undo 시 기존 bodyless 구조 복원 |
| 빈 제목에서 편집 종료 | 슬롯 숨김. ordinary navigation은 본문 또는 안전한 프레임 선택으로 연결 | 빈 `title: []`, 로드만으로 데이터 변경하지 않음 |
| 제목 삭제 | 사용자가 전체 제목을 지우면 body-only로 보임. 삭제 전용 action은 별도 결정 | Undo로 제목·커서 위치 복원 |
| 종류 변경 | target frame만 갱신. 커서·본문 DOM/선택 유지 | title/body/IDs/extensions와 history |
| Backspace/화살표 경계 | 제목↔본문·컨테이너 외부 이동을 명시하고 숨긴 제목에서 커서 소실 방지 | 인접 문단·페이지·목록 구조 |
| 한글 IME 조합 중 | title 숨김·초점 이동·속성 변경을 조합 종료 전 강행하지 않음 | 조합 문자열·selection·history |
| 읽기 전용·인쇄·busy | 제목 action 비활성, 데이터 수정 없음 | 변경 중 revision과 stale target 보호 |

위 표는 제안이다. 현재 코드에 유사 guard가 있다는 이유만으로 native 수락으로 표시하지 않는다. Tab은 종류/제목 action 접근과 실제 목록 들여쓰기 목적을 충돌 없이 구분하며, 새 단축키를 임의 추가하지 않는다.

## 6. 보존·마이그레이션

- 기존 명시 title, body, tone, ID, `extensions`와 기타 metadata를 보존한다. 반복되는 `안내`나 `주의`도 저장된 사용자 문구면 자동 삭제하지 않는다.
- empty title schema 슬롯을 제거할 필요는 없다. **권장안에는 v2 schema 마이그레이션이 필요 없다.** 숨김 상태는 UI 상태로 두고 불필요한 영속 `hasTitle` 속성을 새로 만들지 않는다.
- placeholder는 CSS/UI 문자열이며 저장 콘텐츠가 아니므로 화면에서 숨기는 것이 가능하다. literal `콜아웃 제목`이 데이터에 저장돼 있다면 placeholder로 추정하여 삭제하지 않는다.
- `title.length` 판정을 visible-content 판정으로 바꾸려면 공백/hardBreak-only 처리, mark-only 데이터와 인쇄 동등성을 먼저 정한다. 원문 trim·데이터 재작성 없이 표시 판정만 바꾸는 것을 우선 검토한다.
- v1 `title/text` 및 `help` adapter는 별도 계약이다. v2 제목 선택성 때문에 v1 validator를 느슨하게 만들지 않는다. 기존 v1→v2 adapter가 만든 명시 title을 유지한다.
- 중첩 callout·그림·표·bodyless 데이터는 지원 경로를 확인한다. 로드만으로 paragraph를 주입하거나 지원되지 않는 블록을 조용히 평탄화하지 않는다.
- `blocks: []`와 ID가 있는 빈 paragraph 한 개는 다른 구조다. 빈 paragraph를 단순 빈 본문으로 정규화하여 삭제하지 않는다. `title: []`, 공백만 있는 title, hardBreak만 있는 title도 표시가 비슷해도 다른 저장 내용으로 보존한다.

## 7. 순서와 책임

| 순서 | 책임 | 산출물 / 종료 조건 |
|---|---|---|
| 1 | 콜아웃 UX 계획 전담 | 공식 비교·현재 소스 pin·권장안·미결정 항목. 이 문서 작성까지 |
| 2 | 제품 UX 총괄 | 본문 기본/제목 선택, 종류 명칭, 공백 제목, 텍스트 없는 첫 블록의 규칙 결정. 대표 예제별 수락 기준 고정 |
| 3 | Manual kernel/DTO writer | title focus·경계·Undo/IME·변환·bodyless 보존을 좁은 seam에서 구현/검증. 다른 cover/kernel 변경과 source 재pin |
| 4 | Manual UI writer | 속성 진입점·편집/인쇄 Manual 자식 spacing 연결. public Core 내부 selector/token override 없이 구현 |
| 5 | Core/Theme owner (필요할 때만) | public 컴포넌트 계약 자체 변경이 필요하면 별도 범위·승인·consumer 증거. Manual writer가 sibling 수정하지 않음 |
| 6 | native/출력 검수 담당 | 아래 시나리오를 exact 후보와 OS·브라우저·폰트 정보에 묶어 검수. 문맥과 시각 판정을 각각 기록 |
| 7 | 문서 계약 담당 | 수락 후 durable 배치/형식/사용 안내에 확정 규칙만 반영. 작업 계획의 유지/archive 결정 |

이번 계획 작성에서는 제품 코드·기존 내용·Core/Theme·dependency를 변경하지 않고 빌드/테스트/native 입력을 실행하지 않았다. 통합 개발·검증은 다음 구현 업무다.

## 8. 검수 시나리오와 완료 기준

모델 검증, 실제 OS 조작, 편집/인쇄 시각 검수는 별도 증거다. 현재 계획에서 아래 항목은 모두 **검수 미실행**이다. 구현 후 관련 targeted 검사부터 시작하고 같은 source/environment의 기존 green 근거는 재사용한다. 전체 빌드/E2E는 정책상 승격 사유가 있을 때만 실행한다.

| ID | 시나리오 | 통과 기준 / 증거 |
|---|---|---|
| C01 | 신규 body-only 삽입, 한 줄·여러 줄 입력 | title 자리·빈 제목 여백 없이 본문 시작. 커서가 가시 위치에 있고 save/reopen 동일 |
| C02 | 제목 추가→입력→Enter→본문 | 정확한 대상 title에 입력, 제목 첫 행과 아이콘 정렬. Enter는 내용 손실 없이 본문 진입 |
| C03 | 제목 전체 삭제→포커스 이탈→Undo/Redo | body-only→원제목 복원→삭제 재현. 숨긴 위치 커서 소실·문단 재주입 없음 |
| C04 | `title: []`, 공백만/줄바꿈만/marks 포함 title | 결정된 visible-title 규칙이 editor/print 동일. 데이터 원문·ID·metadata 변화 없음 |
| C05 | title-only와 완전히 빈/bodyless callout 로드 | 읽기만으로 structure mutation 없음. 명시 편집 때 안전하게 진입하며 Undo가 원구조 복원 |
| C05b | `blocks: []`와 ID 있는 빈 paragraph 한 개를 각각 로드·편집·Undo | 두 구조를 구분하여 roundtrip. 빈 paragraph의 ID/metadata 삭제·bodyless의 자동 정규화 없음 |
| C06 | 첫 본문 번호목록·bullet·중첩 목록 | 아이콘과 첫 항목 행 정렬. 번호 시작값·들여쓰기·목록 커서·Backspace/Enter 의미 유지 |
| C07 | 첫 본문 heading·quote·code·nested callout | 빈 title 숨김이 자식 heading을 숨기지 않음. 가짜 제목 생성 없음. 경계 선택/접근성 제목 검토 |
| C08 | 첫 본문 사진·표·divider 및 사진+캡션 | 결정한 top-edge/텍스트 정렬 준수. caption·alt·이미지 폭·재열기·인쇄 보존 |
| C09 | 종류 5개 변경, title 있는/없는 상태 | 의미 이름·Core icon/color 일치. authored title/body/selection 유지. Undo/Redo와 stale target guard 확인 |
| C10 | title↔본문 화살표·Backspace·Delete·Tab/Shift-Tab·컨테이너 탈출 | 커서 갇힘·숨은 title 입력·인접 블록 손실 없음. 실제 키 입력으로 검수 |
| C11 | 실제 OS 한글 IME에서 제목 추가/삭제와 본문 전환 | 조합 중 초점 강제 이동·글자 누락/중복 없음. 조합 종료 후 history 복원. 합성 key event로 대체 불가 |
| C12 | 복사/붙여넣기·블록 변환·삭제/Undo·복제·이동 | title/body/tone·중첩·번호·metadata 보존, 복제 ID 정책 유지. 새 문서/다른 revision에서도 stale target 수정 없음 |
| C13 | editor↔print 동일 문서 (제목/본문 1줄·다중줄) | 빈 h3·placeholder 출력 없음. 첫 행 정렬·제목/body 간격·외부 rail 동일성 측정. 이미지/폰트 로드 완료 후 비교 |
| C14 | A4 끝의 제목/본문/이미지·PDF·흑백 출력 | 제목 한 줄만 고립되지 않음, overflow 숨김/글자 축소 없음. 내용 순서·아이콘·경고 문구 읽힘. 새 PDF와 페이지 이미지 직접 검수 |
| C15 | 읽기 전용·busy·인쇄 중·속성 열린 뒤 대상 삭제 | action 안전 비활성/무효화, 다른 callout 수정 없음. document revision과 asset 보존 |

완료는 (a) 정책 미결정 항목의 판정, (b) exact 후보의 targeted 모델·history 증거, (c) 실제 OS 키보드/IME 수락, (d) editor/print/PDF 시각 비교, (e) 내용 보존 및 문맥 검토가 모두 기록될 때 선언한다. 그 전에는 `소스 확인`, `합성 검사 통과`, `native 미수락`을 분리한다.

## 9. 미결정 질문과 기본 제안

| 질문 | 기본 제안 | 결정 근거 |
|---|---|---|
| `안내/완료`를 `정보/성공`으로 바꿀 것인가? | 저장 tone 유지, UI 문구만 대표 내용으로 검토 | 현재 이미 쓰는 용어와 인쇄 의미 비교 |
| 빈 제목의 기준은 배열 길이인가 보이는 내용인가? | editor/print 공유 visible-content 판정 후보 | whitespace·hardBreak·inline marks roundtrip 검수 |
| 제목 삭제 전용 action이 필요한가? | 직접 지우기 흐름 우선, discoverability 검수 후 결정 | title/body 오삭제 없이 단일 history event가 가능한지 |
| 이미지/표가 첫 블록이면 무엇에 맞추나? | Core top edge + Manual 자식 top edge | 실제 화면/PDF 예제, 가짜 문단 없이 시각 균형 |
| 중첩 title의 heading level은? | 현행 구조 보존, 별도 접근성 검토 | v1 h3 계약과 v2 중첩 의미를 분리 |
| 제목 사용을 어디까지 통일하나? | 같은 과업·같은 역할 묶음 단위 문맥 통일 | 전체 문서 강제 변환 없이 읽기 흐름 개선 |
