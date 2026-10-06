# Tiptap 사례 대비 LDS Manual 준비도 점검

- 상태: **설계 점검과 보강 진행 기록**, 2026-10-06 (한국 시각). 모델·파일 host 및 이전 UI 빌드의 주요 조작·저장 문서 17쪽 독립 PDF 근거 있음. 소스 결함 2건은 후속 해결 확인. 최신 UI·OS IME 검증은 남아 있다.
- 연결 문서: [LDS Manual 에디터 실행 계획](manual-editor-plan.md)
- 수명주기: active working 자료. 계획과 함께 갱신하고 구현 종료 시 확정 계약만 durable 문서로 옮긴다.

**Manual의 매체 기반에 편집 모델과 저장·출력 host를 보강했다. 아직 완성된 편집 제품 수준으로 평가하지 않는다.** 문맥 검토·초안 복원·출력 이력·launcher·자산 검사 연결을 구현했다. 이전 UI 빌드에서 표·목록·optional 제거·단계 이동·분리·드래그를 조작했고 저장 문서의 17쪽 PDF도 독립 검수했다. 단계 대상 기본값과 지원하지 않는 위치의 분리 버튼 결함은 후속 소스 검토·범위 검사 4/4로 해결됐다. 최신 빌드의 전체 흐름 검증은 남았다. [모델 계약](manual-editor-model-contract.md)·[저장 계약](../manual-editor-storage.md)·[실행 안내](../manual-editor-server-run.md)

현재 Manual은 문서 모델·React 구성 요소·고정 A4 렌더러다. 아래 사례는 편집 라이브러리, 공식 템플릿, 완성된 문서 서비스로 제품 경계가 서로 다르다. 기능 수나 완성률 점수 대신 첫 매뉴얼 저작 흐름에 필요한 책임을 비교했다.

2026-10-06 00:43 KST 후속 대조에서 D의 검토 stale 저장재열기·초안 복원과 C/D host A4 복구 보고를 확인했다. 새 보호·자산 검사·이력 코드도 추가됐지만 전체 UI 검증은 진행 중이다.
최신 판단은 [계획의 구현 대조](manual-editor-plan.md#구현-대조에서-남은-mvp-항목) 중 단계 이동·분리 결함 후속 확인을 따른다. legacy placement 기록 보존, 자산 캐시 경로/리비전, 전체 optional·list·table·columns와 구조 drag는 소스에 반영됐다. authoritative validation API는 현재 소스로 3/3 통과했다.
실제 관찰 빌드 `editor-DXy0IXZ_.js`와 최신 수정 빌드 `editor-Dc268xzm.js`를 구별한다. 앞선 소스 감사 당시 빌드는 `editor-BIAI0osR.js`였다. 최신 secure bootstrap·검토·저장재열기·브라우저 자산 검사·출력·focus와 실제 OS 한글 IME는 별도 검증이 필요하다. private 시작 파일과 native 입력 도구 제약은 검증 환경의 한계이며 소스 결함과 구분한다. 원래 종료 조건을 줄이지 않는다.

## 조사 범위와 사례

외부 사례 조사는 **공식 문서와 소스 확인**이며 데모에서 한글 입력·드래그·PDF 생성 등을 직접 조작한 검증은 아니다. 이 사례 조사에서는 계정·업로드·설치·외부 제품 코드 실행을 수행하지 않았다. 이후 별도 구현 승인으로 Manual 앱에 Tiptap을 도입한 사실과 구별한다. 각 외부 사례의 IME, crop, PDF/UA가 Manual 요구를 충족한다고 추정하지 않는다.

| 사례 | 확인한 편집·출력 책임 | Tiptap 사용 근거 | 무료·유료 경계 |
|---|---|---|---|
| Tiptap Simple Editor | 제목 수준·목록·이미지·서식·undo/redo를 가진 기본 편집 UI. Manual 전용 구조는 별도 구현 | 공식 [Simple template](https://tiptap.dev/docs/ui-components/templates/simple-editor) | 포함 OSS extension/UI는 MIT. 추가 Cloud 기능은 별도 |
| Tiptap DOCX Editor | 페이지·여백·머리말/꼬리말·페이지 나눔·문서 설정·독립 출력 preview의 연결 예시 | 공식 [DOCX Editor](https://tiptap.dev/docs/ui-components/templates/docx-editor)에 Pages·Conversion과 Pro package 목록 명시 | Team 이상/Pro license. DOCX export와 Conversion API를 쓰는 PDF preview를 구분. OSS core에 포함된 기능이 아님 |
| BlockNote | 블록 custom schema와 React UI, native JSON 정본, 형식별 손실 구분, 별도 PDF mapping | [고정 커밋 package.json](https://github.com/TypeCellOS/BlockNote/blob/c6f14b071e66ea6f11537dbe5d9bacf98c0b3c37/packages/core/package.json)에 `@tiptap/core` 및 extensions 명시 | 주 코드 MPL-2.0. XL은 GPL-3.0 또는 상용 라이선스. PDF exporter도 XL. [공식 라이선스](https://github.com/TypeCellOS/BlockNote/blob/main/LICENSE.txt) |
| Docmost | 블록 조작·표 편집·문서 history·댓글·첨부파일·HTML/Markdown export·Print PDF를 묶은 문서 앱 | [고정 커밋 root package.json](https://github.com/docmost/docmost/blob/d3a0c9bfdf3710161fe66e8de28a8d23104d54f5/package.json)의 Tiptap 의존성과 [extensions 구현](https://github.com/docmost/docmost/blob/d3a0c9bfdf3710161fe66e8de28a8d23104d54f5/apps/client/src/features/editor/extensions/extensions.ts)의 실제 import/configure 확인 | core AGPL-3.0, 지정 ee 경로는 Enterprise license. [repo](https://github.com/docmost/docmost), [요금/edition](https://docmost.com/pricing). 페이지 verification/review workflow는 Enterprise 항목 |

Tiptap Notion-like 템플릿도 조사했지만 별도 핵심 사례로 늘리지 않았다. [공식 안내](https://tiptap.dev/docs/ui-components/templates/notion-like-editor)는 production에 Start plan을 요구하고, 이미지 업로드 서버를 UI 바깥의 책임으로 둔다. 이 유료 템플릿을 무료 OSS 기능 묶음으로 계획하지 않는다. 협업·AI 서비스 토큰을 쓰는 예시는 로컬 Manual MVP의 필수 구성이 아니다.

## 사례에서 가져올 기준

**Simple Editor**에서는 키보드와 선택·history가 일반 저작 UI의 기본이라는 점을 참고한다. 제공되는 서식 전체를 켜면 현재 문자열 중심 Manual schema로 되돌릴 수 없는 표현이 생긴다. 기능을 제한하는 것은 가능하지만 paste·자동 input rule에서 조용히 서식이 사라지지 않도록 안내가 필요하다. [Tiptap schema 문서](https://tiptap.dev/docs/editor/core-concepts/schema)

**DOCX Editor**에서는 편집 페이지와 실제 출력 preview를 구분하고, 변경 후 preview 갱신 상태를 보여주는 구조를 참고한다. 매뉴얼은 기존 A4 렌더러를 계속 사용한다. 무료 core에 Pages·DOCX·PDF 서비스가 함께 온다고 가정하거나 편집 캔버스가 예쁘다는 이유로 출력 검수를 생략하지 않는다. 이 비교는 공식 문서에 설명된 구조를 읽은 것이며 출력 충실도를 직접 검증한 결과는 아니다.

**BlockNote**는 [custom block](https://www.blocknotejs.org/docs/features/custom-schemas/custom-blocks)에서 props·편집 content·render·external HTML의 역할을 구분한다. [형식 호환성](https://www.blocknotejs.org/docs/foundations/supported-formats)은 native JSON을 보존용으로 권장하고 standard HTML/Markdown 변환의 손실을 명시한다. Manual도 자체 JSON을 보존용으로 유지하고 HTML/PDF를 재편집 정본으로 취급하지 않아야 한다.

BlockNote의 현행 [PDF exporter](https://www.blocknotejs.org/docs/features/export/pdf)는 Typst 기반 tagged PDF와 조건부 PDF/UA 선언, custom schema별 별도 mapping을 문서화한다. 이는 Manual이 아직 제공하지 않는 접근성 출력 경로다. 문서에 기술된 기능이며 이 조사에서 생성물의 준수를 직접 확인하지 않았다. 기존 react-pdf exporter와 현행 exporter도 구별해야 한다. 라이선스와 출력 backend를 통째로 도입하는 것은 이번 권장안에 포함하지 않는다.

**Docmost**의 [편집 안내](https://docmost.com/docs/user-guide/editor)는 행/열 조작·선택·키보드·드래그를 설명한다. 이 중 Manual에 필요한 것은 행/열 편집과 단순 문자열 셀이다. merge·색상·자유 정렬을 추가하면 현재 table 모델의 범위를 벗어난다. [페이지 안내](https://docmost.com/docs/user-guide/pages)의 history·첨부파일 묶음 export는 저장 책임의 참고가 된다. 댓글과 version history가 제품 승인 근거를 자동으로 대신하지는 않는다. Print PDF 메뉴가 있다는 사실만으로 compact A4·한국어 폰트·PDF/UA가 검증됐다고 보지 않는다.

## 현재 상태별 판단

상태는 **구현·근거 있음**, **명문화만 됨**, **편집기 구현 예정**, **기반 자체 미지원**, **제품 확인 필요**로 구분한다. 구현·근거 있음도 아래에 적은 범위까지만 유효하다.

| 비교 축 | Manual의 실제 근거와 현재 상태 | 부족한 부분과 판단 출처 |
|---|---|---|
| schema/custom node | [validator](../../src/validate.mjs), 역할별 custom nodes와 adapter, unknown/sidecar 왕복 **구현·검사 근거 있음** | D node view와 무편집 UI 저장 검사 보고 있음. 전체 필드 조작은 모델 검사와 별도로 확인 |
| 제목·본문·절차 위계 | A의 문서 h1 하나·페이지 h2 하나·동급 h3 계약과 coverless hidden h1 구현. B는 section node를 만들지 않고 columns nesting 차단 | C의 UI 저장 문서 17쪽 독립 PDF와 현재 renderer/CSS hash 일치. 실제 제품 문서의 편집 품질 승인은 별도 |
| 블록 조작·선택·IME·undo | 순수 operation과 실제 PM transaction/history, 이동·분리 선택 복원 **구현·검사 근거 있음** | 실제 브라우저 한글 조합·키보드·UI command wiring은 별도. composing guard 검사를 OS IME 실입력으로 표시하지 않음 |
| writing·용어·과업 | [writing](../agent-skills/lds-manual/references/writing.md)와 [copy-review](../copy-review.md), 문맥·Callout 배치 기록/unknown/history 보존과 reviewed gate 구현 | 이전 stale 저장재열기 근거 있음. 최신 검토 흐름의 기록 보존·PENDING/BLOCKED·저장재열기 검증 필요. 제품 동작은 소유자 확인 |
| 이미지·crop·alt·caption | 모든 figure 필드 왕복·crop PM history, 원본 bytes/충돌·크기 검사, D crop 변경/undo. host validation 연결·경로/리비전 캐시 구현 | 최신 브라우저의 원본 교체·이동 후 오류 유지/위치 선택과 재열기 필요. 주석·가림은 후속 |
| 표와 페이지 경계 | 이전 UI 빌드에서 중간 행/열 추가·삭제·이동, 단계 이동·분리 조작. 고정 페이지·출력 넘침 실패 검사 | 단계 대상 기본값과 지원 위치 밖 분리 버튼 결함 2건은 해결 확인. 최신 빌드 persistence 필요. 긴 표 자동 분할·셀 병합은 후속 |
| JSON 및 파일 왕복 | B 전체 필드/unknown/sidecar, C 실제 HTTP·프로세스 재시작·부분 저장 복구. launcher·초안 기준 리비전·dirty 보호 구현 | 최신 new/open bootstrap·재시작·충돌·복원 UI 흐름 검증. launcher protocol 4/4는 이전 소스 기준. HTML/Markdown/DOCX import는 후속 |
| A4·HTML·PDF | UI에서 저장한 동일 리비전의 17쪽 PDF 독립 검수. A4·폰트·footer·crop·overflow/overlap 근거와 현재 renderer hash 일치 | 최신 UI의 인증 파일 열기·출력 이력/실패 진단·시각 검토 제출·polling 종료는 미확인. 합성 문서 검수는 제품 편집 품질 승인이 아님. 자동 reflow·PDF/UA는 후속 |
| 검토·승인·버전 | C host가 과거 승인과 현재성, 출력 revision/renderer/runtime hash, 시각 검토를 구분. D도 관련 패널 소스 추가 | 새 패널의 실제 검토·저장재열기·리비전 변경 검증 필요. 실제 승인 범위·버전은 제품 소유자 확인. 협업·인증 서비스는 후속 |

정해진 A4 규격, 절차와 그림의 구조, 독립 출력 실패 검사, 제품 검토 경계를 재사용했다. 제목·validation 계약과 편집 모델은 보강했고, 저장·상호작용을 연결한 사용자 흐름 검증이 다음 gate다.

## 제목 계층과 허용 중첩

사용자가 지적한 화면은 ‘구성 요소 사용 예시’ 제목 바 아래에 ‘목록에서 항목 확인하기’ 제목 바가 같은 스타일로 반복된 사례다. 수정 전 소스의 `PageFrame → ManualPage`가 이미 h2+body를 만들고 `SectionTitle` 스토리가 본문에 또 `ManualSectionTitle`을 넣는 조합을 확인했다. 이후 Storybook 담당이 `Components.stories.jsx`만 수정해 실제 페이지 제목으로 예제를 배치하고, 6010의 Docs/Canvas에서 제목 바 하나·A4 크기·넘침을 확인해 완료 보고했다. 근거 기록은 `hierarchy-qa.json`이다. 공통 CSS·renderer·문서 JSON은 바뀌지 않았다. **예제 중복 수정은 완료됐지만 에디터의 허용 nesting 계약과 의미 계층 결정까지 완료된 것은 아니다.** 공통 JSON 렌더러 전체 결함이나 사용자가 승인한 위계라고 확대하지 않는다.

JSON의 page는 한 과업의 제목 바와 body 묶음이다. 별도 section block이 없고 `subheading`·step·Callout title은 동급 h3이다. A 구현 계약에 따라 문서 h1은 하나이며 표지가 없으면 document.title을 visually hidden h1으로 제공한다. ‘문서→페이지→섹션→소제목→절차’의 다섯 겹 heading으로 추론하지 않는다.

| 역할 | 현행 표현 | 에디터에서 채택할 제안 |
|---|---|---|
| 문서 이름 | 표지의 cover.title h1 또는 표지 없는 document.title hidden h1 | 문서 h1 하나, main이 해당 제목을 참조. 두 title을 강제로 동기화하지 않음 |
| 페이지의 과업/섹션 | pages.title 또는 cover.sectionTitle, h2 제목 바+body | 페이지/표지 섹션당 하나의 같은 강조 바. body 안에 동일 섹션 노드를 다시 삽입하지 않음 |
| 하위 소제목 | subheading.text, 별도 가벼운 h3 | 네이비 h2로 승격하지 않음. steps와 동일 h3인 현행 제약을 UI에서 숨기지 않음 |
| 단계 | steps item의 h3 title, text/quote/figure | 단계 하위는 설명·인용·그림이며 섹션 제목 바를 넣지 않음 |
| columns | figure + blocks, 중첩 columns 금지 | 기존 고정 배치만 허용. columns를 section nesting으로 해석하지 않음 |

현재 A/B 구현은 소제목·단계·Callout을 **동급 h3 과업/구획**으로 둔다. 순차 배치가 부모/자식 관계를 만들지 않는다. B는 별도 section node나 임의 heading level을 추가하지 않는다. 이후 의미 계층을 확장하려면 schema·공통 렌더러 변경과 독립 출력 검토로 처리한다. 현재 A의 빠른 검사를 PDF/UA 확인으로 확대하지 않는다.

통과 근거는 제목 역할별 node→Manual JSON→실제 HTML heading 목록, Canvas/Docs의 중복 강조 부재, 독립 HTML/PDF의 읽기 순서다. 같은 제목 바가 반복된 잘못된 예제를 정상 조합 fixture로 복제하지 않는다. snapshot 한 장이나 일반 A4 치수 green만으로 위계 판정을 통과시키지 않는다.

## 우선순위와 완료 근거

P0는 첫 MVP 확장 전에 고정할 계약, P1은 사용 가능한 상태로 만드는 구현, P2는 후속 요구다. 아래 종료 조건은 유지한다. B 20/20, C 저장·보안 9/9·CLI 출력 1/1, 현재 validation 3/3 및 17쪽 독립 PDF 근거는 해당 범위에만 적용한다. 소스 결함 2건은 후속 해결됐으며 최신 D 전체 저작 흐름·OS IME는 미완료다. B 읽기 전용 감사의 구체적인 누락과 종료 근거는 [계획의 구현 대조](manual-editor-plan.md#구현-대조에서-남은-mvp-항목)와 담당 아티팩트 `B-editor-integration-audit.json`에 기록했다.

| 우선순위 | 보강 항목과 근거 유형 | 완료 근거 | 실행 계획 연결 |
|---|---|---|---|
| P0 | 제목 역할·허용 중첩·표지 없는 문서의 의미 계층. **코드와 사용자 피드백** | 예제 프레임 원인 수정 확인, hierarchy fixture, node→HTML heading 정합성, 소제목/단계 관계 결정 | 0·1 |
| P0 | 전체 필드·optional·help·unknown 필드 무손실. **코드와 schema 문서** | 기존 유효 JSON 전체 무편집 왕복 deep-equal; 미지원 입력은 손실 저장 없이 거부/보존 | 1 |
| P0 | IME·이동·속성 history 하나의 명령 계약. **사례에서 도출한 저작 요구** | 실제 한글 조합, step 이동, crop 속성 변경을 연속 undo/redo 후 입력·순서·좌표 일치 | 1 |
| P0 | 유효성 검사 범위 정합성. **최초 코드에서 확인한 빈틈**: cover.sectionTitle 타입 검사와 crop 실제 파일 크기 대조. 현재 A가 보강 | A/B 대상 검사와 C 파일 host 크기 검사 근거 있음. UI가 자산 오류를 유지·표시하고 해당 위치로 연결하는 gate는 남음 | 1·3 |
| P0 | 정본/초안/검토 기록/원본 자산의 저장 책임. **현행 파일과 사례의 저장 경계** | 문서 루트·원본 보존·unknown sidecar·승인 stale 정책을 fixture와 저장 계약으로 고정 | 1, 실제 디스크 검증은 5 |
| P1 | 개요·블록 추가/이동·키보드 선택·속성 편집 | 현행 모든 블록을 마우스 없이도 편집/이동하고 focus 복원. 가능한 작업만 메뉴에 표시 | 2·3 |
| P1 | 이미지 원본·crop·caption/alt와 자산 저장 | 파일 hash·좌표 보존, 누락/충돌 대응, 앱 재시작 후 같은 확대 영역. 프레임과 caption 분리 | 3·5 |
| P1 | writing·Callout 배치·overflow와 출력 상태 UI | 문구·순서 변경 후 stale, 관련 과업 이동, loaded 후 넘침, 실패한 PDF와 이전 결과 구분 | 4·5 |
| P1 | 실제 저장/재열기·실패 복구·독립 PDF 및 시범 문서 | 부분 저장/외부 수정 충돌 케이스, 모든 필드 보존, 최신 hash의 HTML/PDF 검수, 제품 승인은 별도 기록 | 5·6 |
| P2 | 자동 reflow·긴 표 이어 쓰기·임의 다단·다른 용지 | 실제 장문 요구가 생긴 후 한국어·표·그림 fixture로 엔진 비교. paid/OSS 경계 확인 | 후속 |
| P2 | 주석·가림·자유 서식·DOCX import/export | 원본/파생 자산 및 변환 손실 정책을 먼저 정의 | 후속 |
| P2 | 협업·댓글 서비스·조직 승인·PDF/UA | 별도 owner/권한/라이선스·접근성 출력 검증 계획. 고객 필수 요구라면 우선순위 재결정 | 후속 |

P0의 cover.sectionTitle과 실제 원본 이미지 크기 검사는 A가 구현했다. B는 알려진 역할·필수 구조·중첩·opaque 보존을 adapter에서 검사한다. 단순 JSON 구조 검사로 이미지 bytes와 크기를 검증했다고 표시하지 않는다.

## 작은 연동 검증의 구체적 입력과 판정

다음은 전체 validation spike의 수락 기준이다. [모델 fixture](../../tests/fixtures/editor-model.mjs)와 [순수 검사](../../tests/editor-model.test.mjs), [실제 runtime 검사](../../tests/editor-model-runtime.test.mjs)를 구현했다. 문자열·구조·속성 history와 composing guard는 확인했고 OS IME·파일·출력 항목은 별도다.

1. **구조와 왕복**: 표지 유무 두 문서에 sectionTitle, metadata 홀수 항목, lead, mixed list, help, quote 줄바꿈, columns, table, steps.start, 모든 figure 속성을 넣는다. 원본→adapter→Tiptap state→adapter가 값과 배열 순서/필드 유무를 보존해야 한다. 알 수 없는 속성을 넣은 입력도 유지되고, 모르는 block type은 손실 없이 차단돼야 한다.
2. **입력과 history**: 한글 조합 중 입력, 긴 제목·문장, 붙여넣기, Enter/Shift+Enter, step 삽입·다른 page로 이동·start 연결을 수행한다. crop 변경까지 섞은 뒤 undo/redo를 반복한다. 텍스트·번호·그림·선택 위치를 확인하고 다른 editor instance에 focus를 옮겼을 때도 명령 순서가 끊기지 않아야 한다.
3. **서식 경계**: HTML/Markdown 붙여넣기에서 Manual이 표현하지 못하는 marks·nested blocks를 식별한다. 원문을 보관하고 지원되는 일반 텍스트로 넣을지 명시적으로 선택하게 한다. 조용한 제거·추측 변환은 실패다.
4. **이미지와 저장**: 실제 크기가 알려진 합성 이미지로 crop 경계/소수 좌표/preview zoom을 확인한다. 원본 hash 유지, 잘못된 source 크기 오류, assets 상대 경로, caption/alt/previewTitle, save→앱 종료→reopen 동일성을 확인한다. crop 해제/undo가 원본을 잃지 않아야 한다.
5. **넘침과 출력**: 긴 table·큰 figure·긴 한글·페이지 마지막 step을 사용한다. 폰트·이미지 loaded 후 넘침을 표시하고 기존 CLI 출력 실패/성공을 확인한다. 수동 분리 후 최신 입력·CSS hash로 독립 HTML/PDF를 검사한다. 화면 페이지 표시를 PDF/PDFUA 통과로 대체하지 않는다.
6. **검토와 복구**: 현재 copy-review에 문구·순서 변경을 가하고 stale 판정을 확인한다. 기존 sources의 approved 이력은 보존하되 현재 리비전 승인으로 자동 표시하지 않는다. 부분 저장 중단·외부 파일 변경·누락 assets에 대해 원본 복구와 마지막 정상 세대를 확인한다.

1의 전 필드 왕복과 2의 실제 schema/history·선택 복원은 B model suite에서 통과했다. C는 4의 원본 bytes와 디스크 저장, 5·6의 host 출력/복구를 대상 fixture에서 검증했다. D 실제 입력/undo·crop·무편집 저장 보고도 확인했다. 2의 OS IME와 전체 UI 경고·문맥 검토·복원·출력 확인 흐름까지 통과해야 MVP 완료를 말할 수 있다. 이번 감사는 소스·기존 근거를 재사용했으며 suite나 브라우저를 다시 실행하지 않았다.

## 결론과 남은 확인

Tiptap 방향은 유지한다. Manual의 매체 규칙을 범용 편집기에 맞춰 느슨하게 바꾸기보다 custom node와 제한된 명령으로 표현한다. 첫 구현의 우선순위는 **위계 계약 → 무손실 adapter와 history 실증 → 전체 블록/자산 편집 → 검토·저장·출력**이다.

위계·coverless 제목·Tiptap node/명령·앱 dependency·저장 host를 구현했다. 지금은 누락된 저작·검토·복원·출력 화면 연결을 보완하고 실제 한글 IME·키보드/focus·새 편집 시범 문서를 검증해야 한다. C 합성 출력 검수를 전체 편집 제품 완료로 확대하지 않는다. 실제 제품 자료의 정확성과 승인은 제품 담당자가 판단한다.
