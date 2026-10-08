# LDS Manual 에디터 실행 계획

> 2026-10-06: 다음 구현의 방향은 [편집기 재설계 제안](manual-editor-redesign.md)을 참조한다. 이 문서의 v1 계약·구현·검증은 현행 및 역사적 근거이며 v2 구현 완료를 뜻하지 않는다.

- 상태: **사용 동선 개선 중, MVP 마감 전**. 폼 중심 화면의 사용성 지적을 반영해 A4 중심으로 재구성했다. 이전 UI의 합성 시나리오 11개 통과는 당시 빌드의 근거다. 새 UI의 파일 host 전체 흐름 재검증, 실제 OS IME와 제품 시범 검수는 남음. 이전 Windows UI의 17쪽 독립 PDF 근거는 해당 입력에 한해 유지.
- 갱신: 2026-10-06 (한국 시각)
- 문서 책임: Manual 에디터 계획 담당. 구현 착수 후 단계별 근거와 남은 결정을 이 문서에서 갱신한다.
- 수명주기: active working plan. 구현 종료 시 확정 계약을 durable 문서로 옮기고 이 계획은 판단 이력의 보존 필요에 따라 archive 또는 삭제한다.

**Tiptap OSS로 편집하고, Manual JSON을 정본으로 저장하며, 기존 LDS Manual 렌더러로 A4·HTML·PDF를 출력한다.** 첫 버전은 직접 구성한 세로 A4 페이지를 편집하는 로컬 저작 도구다. Editor.js는 블록 조작, Scribe는 절차와 화면을 함께 작성하는 UX의 참고 자료로 사용한다. 자동 페이지 분할과 유료 서비스는 첫 완료 조건에 포함하지 않는다.

사용자의 ‘보강해줘’ 요청으로 로컬 구현을 시작했다. 이어 승인한 앱 한정 dependency는 Tiptap OSS 3.31.4이며 D 담당이 apps/editor에만 설치·lock을 관리한다. 원격 변경·제품 자료 이관·새 repo/세션·전체 suite는 이번 범위가 아니다.

[Tiptap 사례 대비 준비도 점검](manual-editor-readiness.md)에서 공식 템플릿·BlockNote·Docmost와 비교한 P0/P1/P2 보강 항목을 관리한다. **제목 위계·허용 중첩, 무손실 adapter, IME/history, 검증·저장 책임은 첫 구현 전의 필수 계약**이다. 일반 A4 출력 green을 편집기 준비 완료로 확대하지 않는다.

## 사용성 및 화면 감사 후속

[Manual 에디터 사용성 및 화면 재점검](manual-editor-ui-audit.md)에 기본 입력 재현, 전체 레이아웃,
제안 와이어프레임, 버튼별 유지·통합·이동 판단과 29개 경계 상황을 기록했다.
Enter·Backspace·방향키·undo focus의 기본 문제와 빈 페이지·누락 이미지·오류 창·390px 사용성 문제는 미해결이다.
아래 직접 작성/브라우저 저장 구현 및 28개 검사 통과를 사용성 완료로 확대하지 않는다.
다음 UI 작업은 감사의 수정 순서와 수락 기준을 우선하며, 기존 보존·인증·검토 계약은 유지한다.

## 직접 작성과 브라우저 저장 후속 · 2026-10-06

앞선 선택·속성 패널 개편에 이어 A4의 제목·본문·단계·표·목록·캡션에서 직접 입력하도록 연결했다.
설정 패널은 기본으로 닫는다. Enter는 다음 문단/단계, Shift+Enter는 필드 안 줄바꿈이며 기존 PM history를 공유한다.
활성 입력과 조합 중에는 렌더를 보류하고 저장 직전에 입력을 반영한다. 빈 문구도 초안 화면과 저장에 남기며 출력 검증은 별도로 유지한다.

인증 없는 화면에서도 IndexedDB에 문서와 PNG/JPEG/WebP 이미지를 저장하고, 파일 메뉴에서 저장 문서를 다시 열 수 있다.
브라우저 파일은 `lds-manual-browser/v1` envelope로 문서·sidecar·이미지를 묶으며 기존 Manual JSON도 열 수 있다.
저장 위치는 화면에 ‘이 브라우저’로 표시한다. 이는 origin별 로컬 보관이며 폴더 host 인증이나 디스크 접근 권한을 제공하지 않는다.
기존 작성 중이던 합성 예제 2쪽(블록 6개/1개)은 백업 후 가져와 저장·새로고침 복원했다.

검증: 모델/history/단계 제어/파일 경계/빈 초안 projection **28/28**, 앱 build 통과.
IAB에서 직접 본문 입력, Enter 문단 삽입, Shift+Enter, 빈 문단 저장·새로고침·재입력,
절차 삽입, 다음 단계, 합성 JPG 삽입, 캡션 수정·undo/redo, 이미지 포함 저장·새로고침 복원을 확인했다.
브라우저 console error는 없었다. 브라우저 인쇄 진입을 추가했으나 IAB에서는 인쇄창이 관측되지 않아 PDF 파일 생성은 미검증이다.
파일 다운로드 실수신, 실제 OS 한글 IME, 전체 접근성, 최신 인증 host 회귀는 여전히 별도 확인 대상이다.
아래 이전 화면의 해시와 통과 결과는 당시 근거로 보존하며 현행 전체 제품의 완료 근거로 확대하지 않는다.

## 문서 중심 사용 동선 개선 · 2026-10-06

사용자가 실제 화면을 보고 “직관적이지 않다”고 지적했다. 기능 검사 통과를 쓰기 쉬운 편집 제품으로 확대했던 판단을 수정한다.
문서 전체의 데이터 필드를 펼치는 화면 대신 **페이지 목록 → A4에서 내용 선택 → 선택한 내용만 편집**하는 구조로 바꿨다.

- 중앙 A4를 항상 기본으로 보여 주고 보기 배율만 화면에 맞춘다. 출력용 글자 크기·A4 renderer/CSS는 바꾸지 않는다.
- 문서의 글·단계·그림 또는 왼쪽 목록을 선택하면 같은 Manual 경로의 Tiptap 내용이 오른쪽에 열린다.
  페이지 추가 시 렌더와 선택 메시지의 순서가 달라도 새 페이지로 이동하도록 보정했다.
- 페이지 추가와 내용 추가를 나누고, 이동 가능한 위치와 마지막 본문 페이지의 삭제 제한을 버튼에 반영한다.
- 검토·출력은 별도 native dialog로 연다. 표 행·열 도구와 부가 속성은 필요할 때 펼친다.
  그림 자산 오류를 선택하면 그림의 세부 설정을 열어 보정할 수 있다.
- 본문 밖의 숨긴 node와 opaque 필드도 Tiptap 모델에 그대로 남는다. 두 번째 내용 저장소나 undo 이력을 만들지 않는다.
- 인증 없는 URL은 합성 예제다. 폴더 저장/PDF 미연결을 표시하며 현재 편집 JSON을 내려받는 버튼을 제공한다.
  private bootstrap이나 인증 API 권한을 변경하지 않았다. IAB에서 다운로드 이벤트·실제 파일 수신은 확인되지 않았다.

참고 근거는 [Figma의 캔버스 선택과 오른쪽 속성 패널](https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar),
[Notion의 블록 작성 안내](https://www.notion.com/help/writing-and-editing-basics)다. 외부 화면을 복제하거나 새 dependency를 추가하지 않았다.

LDS 적용 범위는 다음과 같다. 정식 full-surface adoption 완료를 주장하지 않는다.

| 적용 항목 | 현재 범위와 남은 점검 |
|---|---|
| tokens/theme | 기존 Core/Theme 0.4.3의 의미 색상과 Pretendard 사용. Core token 변경 없음 |
| layout/visual | Manual 전용 페이지 목록·A4 캔버스·선택 편집 배치. 전체 출력 스타일은 기존 renderer 소유 |
| state/pattern/motion | 기존 dirty/validation/history/출력 gate 유지, native dialog 사용. 별도 motion은 추가하지 않음 |
| assets/icon/brand | 기존 Theme 공식 로고 경로 유지, 새 아이콘·로고 자산 없음 |
| content/i18n | 한국어 작업 동사와 블록 이름으로 정리. 예제는 합성 자료, 새 언어 범위 추가 없음 |
| accessibility | public Button, native controls/dialog, 문서 내용의 Tab·Enter 선택과 좁은 화면 전환. 전체 키보드·스크린리더 감사는 미완료 |
| component mapping | 주요 액션은 public Core Button, 출력은 기존 public Callout/Blockquote 사용. 나머지 기존 native select와 node-view 도구의 Core 매핑은 후속 |

새 화면은 옆 IAB에서 본문 선택·실제 키 입력·A4 반영·undo, 페이지 추가·페이지 전환, 표 추가·행 추가·undo,
검토 창, 760px 화면의 문서→편집→문서 복귀를 확인했다. 모델/history/단계 제어 검사 **24/24**, 앱 build와 diff 공백 검사를 통과했다.
[workflow.test.mjs](../../apps/editor/tests/workflow.test.mjs)는 새 명칭·선택·펼침 동선에 맞췄으며 syntax 검사만 수행했다.
아래 이전 11개 시나리오의 통과 결과를 새 UI 빌드의 통과로 승계하지 않는다. 인증된 폴더 저장·복구·자산·출력 전체 시나리오는 새 화면에서 재검증해야 한다.

새 화면 산출물 해시:

- `editor-UmDQooBK.js`: `1046292aed9116e0ba2e51dfbe9485fb815b876d69b3c0467cd8c4a06ee25a99`
- `preview-D-6d5dYs.js`: `cb14401f1e6b5783f8f12cdca50817f78eb8588c4e637294fe89c6ece7e9d33d`

## 최신 Linux 브라우저 검증 · 2026-10-06

사용자의 에디터 작업 재개 지시로 최신 소스를 Linux에서 빌드하고 검증했다.
환경은 Node 24.19.0, Chromium 154, Tiptap 3.31.4, Core/Theme 0.4.3,
React/React DOM 19.2.7이다. 앱 lockfile은 변경하지 않고 승인된 dependency만 복원했다.

- 편집 모델 20/20, host/launcher/validation/단계 제어 21/21 통과.
- [브라우저 검사](../../apps/editor/tests/workflow.test.mjs)의 11개 시나리오 통과
  (parent 포함 Node runner 12/12, skip 0, 약 39초). [명령·정확한 범위](../manual-editor-server-run.md#최신-빌드의-브라우저-저작-흐름-검사)
- `src/crop` 오류를 선택하면 해당 그림의 속성으로 이동하도록 수정했다.
  오류를 남긴 채 문구를 편집한 후에도 오류가 유지되며, 좌표 보정→저장→host 재시작 및 원본 bytes 보존을 확인했다.
- 같은 UI가 생성한 3쪽 합성 PDF를 독립 검수했다. A4 594.96×841.92pt,
  Pretendard 폰트 포함과 한글 텍스트·쪽 번호 01/03~03/03을 확인하고 전 페이지 PNG의 제목·표·절차·Callout·footer 배치를 읽었다.
  합성 current/시각 검토 fixture는 검토 gate 연결 검사이며 실제 제품 승인으로 해석하지 않는다.

검증한 빌드는 `editor-DmoKIh8R.js`, SHA-256
`7d428bb304a17fc7cc299828aa6fd2e4ff2a0218988af16ad8e9c99f1a53f398`이다.
`apps/editor/src/main.jsx` SHA-256은
`b83f07f09a8fd28cc14f930e1eeaafc9ea7ae3ad1f44c46277fbcd3ab811cb48`이다.
기존 renderer/CSS는 수정하지 않았다. 다른 빌드나 환경으로 이 근거를 자동 승계하지 않는다.

남은 마감 조건은 실제 OS 한글 IME의 조합·확정·커서·undo 실입력, 모든 세부 필드의
조작 조합과 전체 키보드 접근성 검수, 제품 owner가 정한 시범 문서의 문구·실제 화면 검수다.
시작·재열기·충돌·자산·출력의 아래 미검증 표기는 이전 감사의 당시 기록이며,
최신 통과 범위는 이 절과 재현 가능한 브라우저 검사로 판단한다. 원래 종료 기준을 줄이지 않는다.

## 이전 구현 근거

| 범위 | 현재 결과 | 남은 확인 |
|---|---|---|
| B 모델 | [모델 계약](manual-editor-model-contract.md), 전체 schema/unknown/sidecar 무손실, 삽입·삭제·이동·분리·crop·속성 명령, 단일 PM history 구현. 대상 suite **20/20 통과, skip 0** | 실제 브라우저 한글 IME, UI 전체 입력 동선 |
| A 공통 구조·검증 | 문서 h1 하나·페이지 h2·동급 h3, cover.sectionTitle·실제 이미지 크기 검사 구현. 현재 renderer hash와 C의 17쪽 독립 출력 근거 일치 | 합성 문서의 출력 검수이며 제품 문구·실제 화면·편집 품질 승인과 구별 |
| C 파일 host | [저장 계약](../manual-editor-storage.md)·[실행 안내](../manual-editor-server-run.md). 저장·보안 9/9, 실제 CLI 출력 1/1, launcher protocol 이전 기준 4/4, 현재 읽기 전용 validation API 3/3. D 저장 문서의 17쪽 독립 PDF 검수 | launcher 검사는 최신 host 전체 재실행이 아님. 최신 private bootstrap·브라우저 validation·파일 열기는 별도 |
| D UI | 최종 빌드 성공·소스/산출물 hash 일치. 이전 관찰 빌드에서 표 중간 행/열·labeled list·optional 제거/undo·단계 이동·분리·드래그 조작 근거 | 단계 대상 기본값·분리 버튼 결함 2건은 후속 소스 검토 및 범위 검사 4/4로 해결. 최신 빌드의 검토·저장재열기·출력·focus와 실제 OS IME 검증 |

현재 B 결과는 Node v24.18.0, Windows, 앱 runtime Tiptap Core/PM 3.31.4에서 `node --test tests/editor-model.test.mjs tests/editor-model-runtime.test.mjs`로 확인했다. 상세 실패 원인·수정·현재 해시는 B의 `B-editor-model-evidence.json`에 기록한다. 개별 gate 통과를 에디터 전체 완료로 표시하지 않는다.

## 구현 대조에서 남은 MVP 항목

### 단계 이동·분리 결함 후속 확인 · 2026-10-06

F3-01·F3-02는 **소스 수준에서 해결**됐다. 실제 steps 인덱스로 기본/페이지 변경/구조 변경 뒤 값을 정규화하고, 유효한 명시 선택을 유지한다. 대상이 없으면 선택과 이동 버튼이 비활성화된다. 정규화한 값이 select와 실제 이동 인자로 함께 사용된다. 분리 버튼과 handler는 공통 `canSplitStepsAt` 조건을 사용하며, 표지·columns 내부에서는 비활성화 사유를 표시하고 최상위 본문 분리를 유지한다.

변경한 4개 소스·검사 파일과 최신 산출물 해시가 D의 `surgicalFollowup` 기록과 일치한다. 기존 범위 검사 로그 **4/4 통과**와 앱 빌드 성공을 확인했다. B는 검사를 재실행하지 않았다. 최신 빌드는 `editor-Dc268xzm.js`이며, 이전 실제 UI 관찰 빌드 및 아래 감사 당시 빌드와 구분한다. 원래 RG-01~06, 저장재열기·focus·실제 OS IME는 미검증으로 유지한다. 기존 모델·렌더러 green과 불변 17쪽 PDF 근거는 그대로 보존한다. 종료 기록은 `B-editor-integration-audit.json`의 `followups[B-surgical-closure-20261006-04]`에 추가했다.

### 최종 소스 대조 · 2026-10-06

아래는 후속 수정 전 감사 당시 판단이다. 현재 상태는 위 단계 이동·분리 결함 후속 확인을 함께 따른다. 아래 00:43 후속 대조와 최초 감사 표는 당시 발견 이력으로 보존한다. 원래 15항목과 F2 잔여 사항의 재평가·해시·종료 조건은 담당 아티팩트 `B-editor-integration-audit.json`의 `followups[B-final-source-audit-20261006-03]`에 추가했다. B는 구현을 수정하거나 브라우저·suite를 재실행하지 않았다.

**실제 소스 결함은 2건이다.**

| 항목 | 현재 결함 | 닫는 조건 |
|---|---|---|
| F3-01 · 단계 이동 | 대상 steps 값이 초기/페이지 변경 시 0으로 고정된다. 목적 페이지가 paragraph·list·steps 순서이면 실제 steps index 2와 달라 이동이 거부된다 | 실제 steps 목록으로 기본값·구조 변경 값을 정규화. 유효 대상이 없으면 이동 비활성화. nonzero 단일 steps와 여러 steps의 이동·undo·재열기 |
| F3-02 · 단계 분리 | 두 단계 이상이면 위치와 무관하게 버튼을 표시하지만 handler는 본문 최상위 steps만 처리한다. 표지·columns 안에서는 활성 버튼이 무응답한다 | 지원 위치에 맞춰 버튼을 숨기거나 사유와 함께 비활성화. 지원 범위를 넓히면 명시한 수동 분리 계약으로 구현. 정상 최상위 분리·undo 유지 |

legacy 검토 기록/unknown/history 보존, 과업 선택 초기화, 배치 PENDING/BLOCKED 판정, 자산 캐시 경로·리비전, authoritative validation 연결, optional tone 제거, 구조 drag, 보호 화면 focus/busy 처리는 소스에서 확인했다. 이전 잔여 항목을 그대로 미구현으로 유지하지 않는다. 실제 저장·재열기와 최신 UI 동작 검증은 별도다.

D의 실제 조작 근거는 `editor-DXy0IXZ_.js`, 최종 빌드는 `editor-BIAI0osR.js`다. 최종 소스·빌드 해시는 D 기록과 일치하지만 이전 조작 결과를 최종 빌드의 재검증으로 확대하지 않는다. C는 UI에서 저장한 동일 리비전의 **17쪽 PDF**를 독립 검수했다. 페이지·A4·폰트·텍스트·footer·crop·overflow/overlap 근거이며 최종 UI의 출력 버튼·파일 열기·시각 검토 제출이나 제품 편집 품질 승인은 아니다.

남은 실제 검증은 최신 secure new/open bootstrap과 재시작, 문맥·배치 검토 저장재열기 및 stale, 전체 schema/optional 보존과 초안·409 충돌·미지원 문서 보호, 브라우저의 자산 오류/경로 이동, 출력 이력·인증 파일 열기·시각 검토·polling 종료, 혼합 명령의 keyboard/drag/focus 및 실제 OS 한글 IME다. private 시작 파일을 열지 못하는 도구 정책과 native IME 입력 도구 부재는 **검증 환경 제약**이며 소스 결함으로 판정하지 않는다. 최초 MVP 종료 조건은 유지한다.

### 후속 소스 대조 · 2026-10-06 00:43 KST

아래 최초 감사 표는 당시 발견 이력이다. 후속 감사는 담당 아티팩트 `B-editor-integration-audit.json`의 `followups[B-followup-20261006-02]`에 원래 15항목·해시·종료 조건을 보존한 채 추가했다.

- 저장 후 문구 검토 stale 유지와 host A4 복구는 D/C의 제한된 실제 검증 보고가 있다. 새 편집기 전체 흐름 완료로 확대하지 않는다.
- 변경 전 보존 선택, 초안 기준 리비전 경고, 자산 오류 분리와 경로 정규화, 출력 이력 조회·현재 리비전 요약, polling 종료, 선택 동기화 코드가 추가됐다. 실제 사용자 흐름 검증은 별도다.
- C는 `apps/editor/launch.mjs`와 server bootstrap을 구현 중이고 D는 주입된 session 읽기를 연결했다. 기존 `run.mjs`는 Vite dev/build를 유지한다. 새 문서/폴더 열기의 실제 브라우저 검증은 아직 없다.
- 과업·Callout 배치 검토 입력은 추가됐지만 legacy 무식별 배치 기록의 추가 필드/이력 보존, 과업 수 감소 후 선택 인덱스, PENDING/BLOCKED 배치와 문구 current의 구분을 보완해야 한다.
- 자산 검사 캐시는 src/crop 외에 위치·문서 리비전을 결합해야 한다. 이동 후 오류 위치와 바뀐 자산 재검사, C validation API 연결을 확인한다.
- 전체 optional 제거, labeled list 생성, 표의 중간 행/열 조작, columns 안 허용 블록 추가, 목적 steps 선택은 여전히 전체 schema 저작 검증 대상이다.
- 원래 **드래그와 키보드 이동을 함께 제공**한다는 조건은 유지한다. 현재 기본 drop은 차단되고 별도 구조 이동 drag 경로가 없다. 단일 history 검사·일반 한글 입력을 실제 OS IME 검증으로 대체하지 않는다.

마감 시 변경 파일을 한 번 더 읽었다. D는 legacy placement 배열과 기존 decision 추가 필드 보존, 출력 이력/진단·리비전 비교, labeled list·중간 표 행/열 조작, columns 삽입, 여러 optional 제거 코드를 추가했다. 앞선 누락 관찰을 최종 상태로 고정하지 않고 감사 JSON의 `endOfPass`에 구분했다. 이 추가분의 실제 UI 근거는 아직 없다. 과업 수 감소 후 검토 선택 인덱스, 자산 캐시의 경로/리비전, 목적 steps 선택·tone 생략, 배치 검토 완료 판정, drag/keyboard/OS IME는 계속 확인해야 한다.

감사 중 수정되는 파일의 중간 연결 상태는 정식 실행 실패와 구분했다. 예를 들어 parent가 새 출력 이력·블록 오류 props를 넘겨도 해당 child/producer의 구현과 같은 빌드의 실행 근거가 함께 있어야 닫는다. 새 통합 근거가 나오기 전 원래 완료 조건을 줄이지 않는다.

2026-10-06 B가 D/C 소스를 읽기 전용으로 대조했다. 브라우저를 동시에 조작하거나 기존 종료 기준을 줄이지 않았다. 상세 파일·근거·재현 조건은 B 담당 아티팩트 `B-editor-integration-audit.json`에 기록한다.

감사 중 D가 수정한 파일을 다시 읽어 초기 발견과 후속 소스 상태를 구분했다. 새 소스가 있다는 사실을 실제 동작 검증 완료로 표시하지 않는다.

| 항목 | 현재 누락 또는 불일치 | 완료에 필요한 근거 |
|---|---|---|
| 검토 최신성 | 초기 save는 revision만 갱신했다. D가 전체 host 응답 반영으로 소스 수정함 | 실제 수정→저장 후 stale 유지, 새 문맥 검토 후에만 current |
| 라이팅·시각·제품 검토 | D가 ReviewPanel·OutputDetails를 추가함. Callout 역할·관련 행동·위치 기록은 아직 없음. 새 기록의 문맥·원문 보존과 저장재열기 검증 필요 | 판정·근거·placement 기록 저장·재열기·변경 후 무효화와 같은 리비전의 검토 후 출력 |
| 시작·복원 | 새 문서/다른 폴더 선택 및 session 연결 미완성. D가 초안 복원 함수를 추가했으나 baseRevision 충돌 안내 없음. dirty 재조회도 바로 편집 상태를 교체 | 새 문서와 기존 폴더 시작, 변경 보존 선택, 초안 baseRevision 충돌 안내와 복원 |
| 전체 저작 명령 | D가 페이지 간 이동·단계 분리 UI를 추가함. 실제 동작 검증 필요. labeled list 생성, 임의 행/열 선택·이동·삭제와 일부 optional 제거 불충분 | 전체 현행 필드의 실제 UI 작성·수정·제거·undo 후 저장재열기 |
| 자산·오류 | 텍스트 편집 시 host 자산 오류가 지워짐. host dot/bracket path와 UI slash path가 달라 오류 위치 이동이 실패할 수 있음 | 구조·자산 오류 분리 유지, 변경 경로 재검사, 정확한 오류 위치 선택 |
| 미리보기·출력 | D가 누락 이미지·overflow 페이지 이동, artifact 열기·시각 검토를 추가함. 원인 블록 연결·출력 이력/실패 진단은 남음. 상단 요약은 여전히 mode/job revision과 불일치 | 넘친 블록 이동·수동 분리, 현재/이전/실패 출력 구별 및 인증된 파일 열기 |
| 실제 입력 | PM history 20개 검사와 D 실제 텍스트/crop 검증은 있음. OS IME 조합·전체 키보드/focus·드래그 경로 미확인 | 지원 브라우저의 실제 조합과 이동/속성/undo를 섞은 저작 흐름 |

C의 5쪽 독립 PDF는 coverless·표지·EXIF/SVG crop fixture에 한정한다. 예전 16쪽 전체 재검수나 D에서 새로 작성한 시범 문서의 출력 검수를 대신하지 않는다. 이번 감사에서 모델 결함은 확정하지 않았으므로 모델 코드를 바꾸거나 이미 green인 suite를 반복하지 않았다.

## 해결할 문제와 완료 모습

현재 Manual은 문서 JSON과 렌더러, 작성 규칙, 출력 검사 도구를 갖췄지만 저자는 구조·문구·이미지 경로를 파일에서 직접 편집해야 한다. 제목과 본문의 묶음, 여백과 정렬, 단계와 화면의 연결을 저작 중에 확인하고 수정할 화면이 필요하다. 문서 생성 성공과 라이팅 검토·제품 승인도 구별해야 한다.

첫 버전의 저자는 한 과업을 한 페이지에 구성하고, 단계별 행동·관찰할 결과·화면을 묶어 작성한다. 같은 화면에서 문구 검토와 누락 자산·분량 초과를 확인하고, 저장한 문서를 다시 열어 같은 결과를 얻는다. 검토한 상태의 HTML·PDF를 출력할 수 있어야 한다. 제품의 버튼명·권한·동작·배포 대상 승인은 제품 문서 소유자가 계속 책임진다.

여백과 정렬은 공통 compact 프리셋을 사용한다. 저자에게 임의 font-size, 자유 좌표, 블록별 CSS 편집을 제공하지 않는다. 분량이 넘치면 중복 문장을 검토하고 단계 경계에서 페이지를 나눈다. 글자를 줄이거나 넘친 부분을 숨겨 통과시키지 않는다.

## 확인된 출발점

2026-10-05의 로컬 checkout을 확인했다. 기준 커밋은 `3eee84e80b8bc86b883e6416c70f5564d254b365`이며 아래 보정은 커밋 이후 로컬 변경을 포함한다. 커밋 번호만으로 최신 출력 근거를 식별할 수 없다.

| 항목 | 확인 상태와 한계 |
|---|---|
| 패키지 | `0.1.0-alpha.1`, `private: true`. Manual 레지스트리 발행·CI는 미구성 |
| 데이터와 렌더러 | schemaVersion 1, compact 세로 A4, 표지와 명시적인 pages. 자동 reflow 없음 |
| 공통 레이아웃 | 제목·본문 내부 16px 기준선, 단계 번호 뒤 8px 간격을 보정. 표지 정보와 섹션 본문을 구분 |
| HTML·PDF | 작성 가이드 6쪽·gallery 6쪽·compact 4쪽의 독립 출력 확인 완료. A4·폰트·숫자 추출·잘림/겹침 확인. 모든 가능한 조합 검증은 아님 |
| 라이팅 기록 | 현재 작성 가이드의 copy-review 최신성 검사 통과. 사람의 제품 승인이나 모든 문장의 품질 인증을 뜻하지 않음 |
| Storybook | 로컬 탐색 환경과 실제 LDS 요소를 쓴 합성 자료 프레임 예제 구성. Canvas·Docs·좁은 화면 확인 보고 있음. 제목 바 중복은 story 조합만 수정하고 Docs/Canvas 확인 완료. 전체 조합 및 새 에디터 검증은 별도 |
| Core·Theme | 발행본 0.4.3의 Callout·Blockquote `radius="body"`와 8px 매핑 확인. 핀 유지 |

계획 최초 작성 당시 독립 PDF 검증 보고서 `manual-section-pdf-audit.json`과 아래 SHA-256이 일치했다. **아래는 보강 전의 역사적 baseline**이다. 이후 A의 heading/자산 검증 변경으로 renderer hash가 바뀌었으므로 새 출력 근거로 재사용하지 않는다.

| 파일 | 검증 당시 SHA-256 |
|---|---|
| `styles.css` | `aa31bf779af7f0c391b63d282cb2c9c644cb1410f786e9b38a861fc90cfbb8b0` |
| `src/components.mjs` | `508974295ae314bfce20e63057d0bc4fe05fb5d5c2dd96814955dc512da9a52e` |
| `examples/authoring-guide/manual.json` | `4b87fa1c6d06fe59de844ffee2ff36751e93d460fe29588b6f1031452dd36ada` |
| `examples/authoring-guide/copy-review.json` | `84c2ce10218026d7f7869cf551487177f0241f017b16de3464e27d77e2197657` |

기존 green 결과는 해당 입력·소스·환경에만 적용한다. 스타일이나 이미지가 바뀌면 이전 PDF를 새 결과로 표시하지 않는다. 위 근거는 계획 작성 시 확인한 로컬 baseline이며 재현 가능한 릴리스 증거를 대신하지 않는다.

## 첫 버전의 편집 범위

정확한 데이터 계약은 [문서 데이터와 API](../document-format.md), [validator](../../src/validate.mjs), [렌더러](../../src/components.mjs)를 따른다. 텍스트는 HTML 없는 문자열이다. 임의 bold·링크·색상·중첩 rich text를 저장하는 새 포맷은 첫 버전에 추가하지 않는다.

| 대상 | 제공할 편집 | 지켜야 할 제약 |
|---|---|---|
| 문서 | `title`, 선택 `lang`, 표지 유무 | `schemaVersion: 1`. title과 lang을 표지 제목에 강제로 동기화하지 않음 |
| 표지 | `title`, `sectionTitle`, `logo.src/alt`, metadata의 label/value, blocks | 공식 Theme 로고 참조 유지. metadata와 blocks는 현행 유효성 요구를 따름. 문서 버전과 근거 버전을 분리 |
| 페이지 | title, 선택 lead, 순서·추가·삭제 | pages와 blocks는 유효한 저장 시 비어 있을 수 없음. 쪽번호는 표지 포함 순서로 계산 |
| 섹션 | 페이지 제목 바와 본문 묶음, `subheading.text` | 독립 `section` 데이터 노드는 현재 없음. 새 섹션 추가는 새 페이지 또는 페이지 내부 subheading으로 표현 |
| 본문·인용·주소 | `paragraph.text`, `quote.text`, `address.value` | quote 줄바꿈 보존. 주소·식별자 자동 치환 금지. 실제 Core Blockquote 사용 |
| 목록 | string 항목 또는 `{label,value,emphasis?,labelEmphasis?}` | 혼합 항목 순서와 두 emphasis 플래그 보존 |
| 절차 | `steps.start`, items의 `title`, 선택 `text/quote/figure`; 삽입·이동·삭제 | start는 양의 정수. 한 단계의 설명·인용·그림을 함께 이동. 이어지는 별도 steps의 start는 자동 변경하지 않고 명시적 연결 동작으로 설정 |
| 그림 | `src/alt/caption`, `size`, `previewTitle`, `crop` | figure는 독립·steps·columns 안에서 같은 계약. size는 full/reading/compact. alt·caption 필수 |
| 표 | label, headers, rows; 행·열 조작 | 문자열 셀, 열 수 일치. 셀 병합·중첩 표·자동 다음 페이지 이어 쓰기 없음 |
| Callout | title, text, tone | tone은 signal/positive/cautionary/negative/offline. 실제 Core Callout 사용. 기존 help는 읽고 보존하되 신규 추가는 callout |
| 기존 columns | 왼쪽 figure와 오른쪽 blocks 편집 | 현재 고정 구성만 지원, columns 중첩 금지. 임의 다단 편집과 구별 |

`previewTitle`은 그림을 감싸는 자료 프레임의 이름이며 캡션과 별개다. 원본 사진/화면, crop 좌표, 프레임 이름, 캡션을 하나의 figure 속성 패널에서 편집한다. 프레임을 추가했다고 원본 이미지 자체를 다시 그리거나 바꾸지 않는다.

제목 계층은 [준비도 점검의 위계 분석](manual-editor-readiness.md#제목-계층과-허용-중첩)을 따른다. A/B 구현 계약은 문서 h1 하나, page의 h2+body 하나, subheading·step·Callout 제목은 동급 h3이다. 표지 없는 문서에는 document.title의 visually hidden h1을 사용한다. 순차 배치를 부모/자식으로 추론하지 않고 body 안에 같은 section 제목 바를 삽입하지 않는다. Storybook 예제 중복 수정과 공통 renderer 전체 품질 판정은 구별한다.

후속 평가 범위는 자동 reflow, 긴 표의 반복 머리글·행 분할, 가로 용지·새 프리셋·임의 다단, 자유 서식, 화면 자동 캡처·주석·가림, 실시간 다중 사용자 협업, 권한 서비스, 클라우드 저장·배포다. 후속 범위의 미구현을 첫 버전 결함과 혼동하지 않는다. PDF/UA 인증도 별도 과제다.

## 사용자 흐름과 화면

화면은 **왼쪽 문서 개요, 가운데 블록 편집, 오른쪽 A4 미리보기**를 기본으로 한다. 선택한 블록의 속성 패널은 편집 영역 안에서 열고 닫는다. 상단에는 파일·저장 상태·undo/redo·초안 출력·검토 후 출력을 두고, 하단 검토 패널은 오류 위치로 이동시킨다. 좁은 화면에서는 편집/미리보기를 전환하며 인쇄용 A4 지오메트리는 유지한다.

1. **시작**: 새 문서는 기존 init 데이터에 맞춰 생성하고, 기존 문서는 문서 폴더를 불러온다. schema, 자산, 검토 기록의 존재와 최신성을 보여준다. 지원하지 않는 형식은 원본을 유지한 채 편집 제한 사유를 표시한다.
2. **구성**: 개요에서 페이지를 추가·이동하고 가운데에서 블록을 작성한다. 드래그와 키보드 이동을 함께 제공한다. 페이지 제목·도입·하위 제목의 역할을 구분하고 일반 문단에 장식 제목을 강요하지 않는다.
3. **절차와 그림**: 행동 제목·설명·결과 확인·quote·화면을 단계 단위로 편집한다. 이미지 선택 후 원본/확대 영역을 함께 보며 crop을 조정하고 caption·alt·자료 프레임 이름을 작성한다.
4. **미리보기**: 유효한 편집 상태를 Manual JSON으로 투영해 기존 렌더러로 표시한다. 미완성 필드가 있으면 마지막 유효 미리보기를 유지하고 ‘현재 편집 내용 미반영’을 표시한다. 선택 표시는 출력에 포함하지 않는다. 이전 비동기 렌더 결과가 최신 상태를 덮지 않도록 리비전을 대조한다.
5. **검토**: 구조 오류, 자산 문제, 라이팅 최신성, 레이아웃·시각 검토, 제품 승인을 별도 상태로 보여준다. 문구를 클릭하면 해당 과업의 제목·본문·그림을 함께 읽고 판정/근거를 기록한다. Callout의 역할·관련 행동·위치 판단도 남긴다.
6. **저장과 재열기**: 저장 대상과 변경 파일을 표시하고 JSON·자산·기록을 보존한다. 외부 수정 충돌이 있으면 덮어쓰지 않는다. 재열어 같은 순서·속성·검토 상태가 복원되는지 확인한다.
7. **출력**: 현재 유효 문서로 HTML을 생성한 뒤 기존 PDF 경로를 실행한다. 미검토 초안 출력은 ‘초안’으로 구별한다. 검토 후 전달은 현재 문구 기록과 같은 리비전의 레이아웃/시각 검토를 모두 요구한다. 제품 승인 상태는 담당자의 기록 그대로 표시한다.

분량 초과 표시는 페이지와 원인 블록을 연결한다. ‘다음 페이지로 단계 나누기’는 저자가 경계를 선택하는 명령이며 자동 reflow가 아니다. 나눈 후 번호·Callout 위치·문맥을 다시 검토한다.

## 기술 구조와 소유 경계

기준 흐름은 `문서 폴더 → Manual JSON 및 기록 → 편집 adapter → Tiptap 상태/custom nodes → adapter → Manual JSON → 기존 렌더러·CLI`다. 자산 해석과 검토 상태는 문서 리비전에 연결한다. Tiptap JSON이나 편집 화면의 HTML을 배포 문서 정본으로 삼지 않는다.

| 계층 | 책임 | 예정 위치와 경계 |
|---|---|---|
| 편집 shell | 개요·선택·속성·명령·파일·검토 UI | 이 repo의 `apps/editor/` 안 private 로컬 저작 앱. D 담당 구현 중 |
| Tiptap custom nodes | 페이지/블록 경계, 제한된 텍스트 입력, 속성 편집, selection/history | 같은 앱 안 `src/editor/`. starter의 모든 서식을 켜지 않고 Manual에서 표현 가능한 노드만 등록 |
| adapter | Manual↔편집 구조 변환, 필드 보존, 리비전과 명령 단위 관리 | 같은 앱 안 `src/manual-adapter/`. 처음부터 공용 package export로 승격하지 않음 |
| 자산·저장 host | 선택한 로컬 문서 루트 안 파일 접근, staging·충돌 검사·복구, CLI 호출 | `apps/editor/server/host.mjs`. [실행 명령](../manual-editor-server-run.md)·[저장 계약](../manual-editor-storage.md) |
| schema·내용 검토 | `validateDocument`, `copySets/hash`, 기록 최신성 및 사람이 수행하는 문맥 검토 | 기존 `src/validate.mjs`, `src/copy-review.mjs`, 검사 스크립트를 재사용. editor 전용 상태와 분리 |
| A4와 출력 | ManualDocument, CSS/토큰, 정적 HTML, 폰트·이미지 로드와 PDF/layout report | 기존 `src/`, `styles.css`, `bin/lds-manual.mjs`. 앱에서 스타일을 복제하지 않음 |
| 제품 자료 | 실제 문구·스크린샷·버전·출처·승인 | 소비 제품 문서 폴더. 공개 Manual repo에는 합성 예제만 둠 |

이 앱은 Manual 매체를 작성하는 도구이므로 같은 repo에 두는 안을 우선한다. 별도 제품 운영 shell이나 서비스로 커지면 owner와 배포 경계를 먼저 판단한다. 현재 workspace canonical 목록에는 Manual checkout이 별도로 확정돼 있지 않으므로 새 `$LK_WS` 경로나 repo를 이 계획으로 등록하지 않는다. 모든 예정 위치는 **Manual repo 기준 상대 경로**다.

라이브러리 소비자가 Tiptap·편집 host를 설치하도록 만들지 않는다. 앱 전용 package.json/package-lock.json에서 승인된 dependency를 관리하며 기존 Manual 라이브러리 exports·dependency는 변경하지 않는다. B factory가 history() 하나를 등록하므로 StarterKit history나 UndoRedo 확장을 중복 등록하지 않는다. Core/Theme의 공통 토큰과 실제 Callout/Blockquote를 재사용한다.

Tiptap의 React node view는 조작 손잡이·입력·속성 UI를 위한 표현이다. 출력 HTML과 별도 역할이므로 node view DOM을 인쇄하지 않는다. 미리보기는 편집 shell CSS가 유입되지 않는 표면에서 기존 ManualDocument를 사용하고, 최종 HTML/PDF는 기존 CLI가 만든 독립 파일로 확인한다.

## 데이터 보존 계약

**읽기만 한 뒤 저장했을 때 의미가 같은 Manual JSON이 나와야 한다.** JSON 키 순서·들여쓰기는 정본 계약이 아니지만 값·배열 순서·선택 필드의 존재 여부·문자열과 줄바꿈은 계약이다. 기본값을 불러올 때 임의로 채워 쓰거나 기존 help를 몰래 callout으로 바꾸지 않는다.

| 대상 | save/load와 undo/redo에서 지킬 내용 |
|---|---|
| 문서·페이지 | schemaVersion, title/lang, 표지 유무, cover.sectionTitle/logo/metadata, pages 순서·title/lead 및 모든 blocks |
| steps | start의 생략/명시, items 순서, title/text/quote/figure. 페이지 분리·이동은 관련 번호 변경까지 하나의 명령으로 되돌림 |
| figure | 원본 src와 원본 바이트, alt/caption/size/previewTitle, crop 여섯 수치. zoom 좌표를 원본 픽셀 좌표로 환산하며 반올림 오차로 매번 저장값이 달라지지 않게 함 |
| 표와 목록 | label·headers·각 행/열 순서와 문자열, labeled list의 emphasis/labelEmphasis. 범용 editor table로 바꾸며 셀 병합 정보를 만들어내지 않음 |
| Callout·quote·columns | type/tone/title/text·줄바꿈, columns의 figure와 자식 blocks. 중첩 columns 생성 금지 |
| 제품 근거 | sources.json의 출처·버전·권한·reviews 및 알 수 없는 추가 필드 보존. 기존 승인 이력을 삭제하거나 편집 결과를 승인으로 자동 갱신하지 않음 |
| 라이팅 기록 | copy-review.json의 source snapshot·판정·근거·placementReview 등 보존. 변경 후 stale 표시, 영향 과업 재검토. hash만 바꿔 완료를 위조하지 않음 |

현재 validator는 모든 알 수 없는 object 필드를 거부하지 않는다. 따라서 validator 통과만으로 adapter의 무손실을 보장할 수 없다. 원본 객체의 미지원 필드는 opaque 데이터로 보존하고 해당 영역 편집을 제한한다. 미지원 block type/schemaVersion은 읽기 오류와 원본 보관 상태를 표시하며 손실 변환을 제안하지 않는다. 파일 재저장으로 원본을 손상시키지 않아야 한다.

페이지·블록의 선택용 ID는 앱 내부에서 관리하며 schemaVersion 1에 임의 ID를 주입하지 않는다. 세션 밖에서 필요한 선택·초안·검토 기준 fingerprint는 별도 editor 상태 파일에 둔다. 기존 copy-review가 경로/순서에 영향을 받으므로 이동 후에는 현재 검사기를 다시 사용한다. 이전 판정은 이력으로 남겨도 최신 검토로 자동 승격하지 않는다.

텍스트 입력과 속성·crop·이동 명령은 하나의 undo/redo 순서에 참여해야 한다. 속성 패널만 별도 React state로 저장해 undo에서 빠지는 설계를 피한다. 파일 저장 이력은 편집 undo와 구별한다. 마지막 저장 이후 undo로 돌아가면 dirty 상태를 다시 계산한다. 검토 기록은 과거 리비전의 기록으로 유지하고 현재 리비전과 일치할 때만 유효로 표시한다.

빈 제목 등 작성 중 미완성 상태는 메모리와 별도 draft 복구 영역에 유지한다. 유효성 실패 상태를 조용히 제거해 manual.json에 저장하지 않는다. 유효한 정본 저장과 불완전 초안 복구를 구별하는 UI가 필요하다.

## 로컬 파일과 출력 방식

**기준안은 Node 로컬 host와 브라우저 UI**다. 기존 Node 22·CLI 환경을 사용하고 선택한 한 문서 폴더에만 접근한다. 브라우저 단독 파일 권한 API와 특정 브라우저 지원에 전체 저장 흐름을 의존시키지 않는다. 설치 패키징과 편집 명령 이름은 아직 결정하지 않았다.

문서 폴더의 권장 묶음은 다음과 같다. 새 editor 전용 항목은 제안이며 현행 CLI 입력이 아니다.

```text
<소비 제품의 문서 폴더>/
  manual.json                  # 기존 정본
  assets/                      # 기존 상대 경로 자산, 원본 보존
  sources.json                 # 기존 내부 원본·제품 검토 근거
  copy-review.json             # 기존 문맥 검토 기록
  .editor/                     # 제안: draft, 선택 상태, 리비전 근거, 저장 복구 기록
  output/<문서 버전과 상태>/     # 제안: 출력끼리 덮지 않는 목적지
    manual.html
    manual.pdf
    manual.layout.json
    Pretendard-LICENSE.txt
```

불러오기는 폴더 단위가 기본이다. JSON만 들어오면 부모 폴더와 자산을 연결할 때까지 누락 상태를 보여준다. 다른 위치 이미지는 원본을 유지한 채 문서 assets 안으로 복사하고 충돌 없는 상대 경로를 만든다. 동일 이름의 기존 파일을 덮지 않는다. crop 삭제/undo를 위해 저장 후에도 원본을 유지하며 첫 버전에서 미참조 자산 자동 삭제는 하지 않는다. 문서 묶음의 복사는 폴더 복사를 기준으로 하고 ZIP 가져오기/내보내기는 후속으로 둔다.

자산은 기존 CLI와 동일하게 문서 디렉터리 내부 상대 경로만 허용한다. 공식 Theme 로고 참조는 기존 예외다. 외부 URL, 절대 경로, 경로 탈출, 임의 HTML을 허용하지 않는다. 원본 좌표 크기와 실제 이미지 크기가 다르면 crop을 임의 보정하지 않고 재확인을 요구한다. SVG는 자체 제작/승인 자산 정책을 유지한다. 프리뷰용 URL·data URL은 manual.json에 저장하지 않는다.

로컬 host는 loopback에만 bind하고 문서 루트의 실제 경로를 확인한다. 요청 origin·세션과 파일 접근 범위를 검사하며 임의 shell 명령이나 전체 파일시스템 API를 노출하지 않는다. 파일 변경 시 사전 읽은 hash를 대조해 외부 수정 충돌을 알린다. 기존 도구 프로세스 호출은 인자 배열과 고정 명령으로 제한한다.

저장은 검증→임시 파일/자산 staging→충돌 확인→교체→재읽기 순서로 설계한다. 여러 파일의 교체가 한 번에 원자적이라고 가정하지 않는다. 완료 manifest와 이전 파일 보관으로 중단·부분 저장을 식별하고 복구한다. 복구 중인 세대는 완료된 저장으로 표시하지 않는다. sources와 copy-review 원본의 모르는 필드도 함께 보존하는 실제 디스크 케이스가 필수다.

기존 build/pdf에는 선택한 runtime과 Chromium 경로를 전달한다. 자동 dependency/브라우저 설치는 하지 않는다. 출력 시작 시 문서·자산·renderer/CSS·runtime 버전의 fingerprint를 고정한다. 출력 중 편집이 바뀌면 결과는 이전 리비전의 출력으로 표시한다. 종료 코드와 layout report를 함께 확인하고 실패 후 남은 이전 PDF를 성공 결과로 보여주지 않는다.

sources.json과 .editor의 내부 기록은 배포 출력에 포함하지 않는다. HTML/PDF와 폰트 라이선스만 전달할 파일 목록으로 제시한다. 제품의 approved 기록이 남아 있어도 기준 리비전이 확인되지 않거나 내용·자산이 변경됐다면 ‘현재 문서 승인 재확인 필요’로 표시한다. 새 editor 상태 파일에 기준 fingerprint를 기록할 수 있으나 기존 승인자를 대신해 승인하지 않는다.

## 단계별 작업과 종료 기준

아래 표는 원래 단계별 종료 조건이며 현재 구현에 맞춰 축소하지 않는다. 1단계 adapter/schema/history 검사는 통과했지만 실제 IME gate는 남았다. C는 A 보강 후 합성 PDF 5쪽과 저장/복구·출력 host를 검증했다. 2~6단계는 위 표의 UI 누락 보완 및 전체 저작 흐름 근거가 필요하다. 날짜·시간 약속보다 실제 gate 결과로 진행을 판단한다.

| 단계 | 작업과 산출물 | 종료 기준 | 선행 |
|---|---|---|---|
| 0 공통 baseline 고정 | 기존 레이아웃·schema·예제·peer 버전과 출력 근거 목록 | 현재 hash/환경과 green 근거 일치. 미해결 시각 결함 및 변경 파일 범위 식별. 이미 일치하는 출력 재실행 불필요 | 기존 형제 세션 결과 |
| 1 작은 adapter와 node 검증 | 한 페이지, paragraph, steps, figure/crop의 최소 편집 왕복 fixture와 계약 메모; 제목 위계·허용 중첩·validation 누락 책임 결정 | 한글 IME·삽입/이동/undo, 미지원 필드 보존, 문자열·crop·start 무손실. node→출력 heading 정합성. Tiptap 구조/명령 적용 여부 판단 | 0, dependency 도입 범위 확인 |
| 2 shell과 핵심 저작 | 개요·블록 추가/이동·속성·키보드 조작·A4 프리뷰 | 제목/본문/절차 작성, 선택 이동, 미완성 상태 표시, 편집/미리보기 리비전 일치 | 1 |
| 3 자산과 전체 현행 블록 | 로컬 폴더·자산 경로 해석, 표지/목록/표/주소/Callout/quote/columns/help 호환 | 모든 현행 필드 fixture 통과. crop 원본 보존·누락 자산 안내. 제품 내부 자료의 공개 정적 자산 유입 없음 | 1; 2와 UI 분업 가능 |
| 4 라이팅과 분량 검토 | copy-review 패널, stale 추적, Callout 위치 근거, loaded 후 넘침 측정 | 문구/순서 변경으로 영향 검토가 무효화됨. BLOCKED와 넘침을 완료로 표시하지 않음. 과업별 재검토 동작 | 2·3; 규칙/fixture 정의는 1부터 가능 |
| 5 저장과 독립 출력 | 디스크 save/reopen·충돌/복구, 기존 CLI 연결, 리비전별 HTML/PDF | 앱 재시작 후 데이터·자산·기록 보존. 실패/이전 PDF 구별. 동일 입력의 독립 A4/PDF 확인 | 3·4; 저장 host 개발은 1 이후 병행 가능 |
| 6 시범 문서 검수 | 합성 문서로 전 흐름 기록, 제한된 실제 제품 문서는 소비 repo에서 담당자 검토 | 전체 현행 블록 왕복·작성 흐름·라이팅·시각 출력 확인. 제품 승인 유무를 분리해 전달. 남은 제한과 사용 안내 정리 | 5 |

1단계가 실패하면 큰 shell 구현으로 밀어붙이지 않는다. 실패 원인이 schema 매핑·history·IME 중 무엇인지 좁혀 수정한다. Tiptap 채택의 이득이 확인되지 않으면 같은 Manual 정본을 유지하는 구조화 폼 편집안을 비교해 결정 기록을 갱신한다. 비교 자체가 현재 선택을 번복하거나 별도 구현을 시작하는 지시는 아니다.

현재 배정은 A 공통 renderer/validator, B adapter/custom nodes/commands/model 검사와 계획, C 저장 host/검토·출력 연결, D 앱 dependency/UI다. 공통 파일을 동시에 수정하지 않고 담당 계약 JSON으로 인터페이스를 공유한다. 메인은 결정·충돌·결과 통합을 맡고, 다른 담당과의 전달은 메인을 통해 수행한다.

## 검증 케이스와 경로

| 케이스 | 통과 기준 |
|---|---|
| 한글 IME와 긴 문장 | 조합 중 글자 손실·중복·커서 이동 없음. Enter/줄바꿈·붙여넣기·undo 후 동일 문자열. 지원 브라우저에서 실입력 확인 |
| steps 편집 | 첫/중간/끝 삽입·페이지 간 이동·명시적 번호 연결 후 순서와 start 정확. undo/redo로 제목·설명·quote·figure까지 복구 |
| 전체 필드 왕복 | 무편집 왕복 및 속성별 변경 fixture를 deep 비교. optional 생략·help·혼합 list·columns·모르는 필드·검토 sidecar 포함 |
| crop와 그림 | 원본 byte hash 유지, zoom 후 좌표 정확, 재열기 후 동일 영역. 큰 이미지·고해상도·실제 크기 불일치·프레임과 caption 분리 확인 |
| 분량과 페이지 경계 | 긴 표·긴 주소/한글·큰 그림·긴 Callout이 정상적으로 넘침을 표시. 마지막 단계/페이지 번호 잘림 없음. 수동 단계 분리 후 재검토 |
| 누락 자산과 불러오기 | 없는 파일·깨진 그림·경로 탈출·미지원 block은 정확한 위치와 이유 표시. 원본/마지막 유효 저장 보존 |
| 저장과 실패 복구 | 폴더 이동·앱 종료/재열기·부분 저장 중단·외부 파일 변경 충돌·동명 자산·지원하지 않는 필드 보존을 실제 디스크에서 확인 |
| 검토 상태 | 문구·순서·이미지·스타일 변경별 영향 구분. 오래된 copy-review/제품 승인/시각 검토를 현재 완료로 표시하지 않음 |
| 독립 출력 | 폰트·이미지 loaded 후 측정, A4/쪽수/글꼴/숫자 추출 정상, 실제 페이지를 렌더링해 제목·표·그림·캡션·footer 확인 |

기본은 바뀐 범위에 맞춘 빠른 검사다. adapter/명령은 해당 데이터 fixture, 국소 UI는 한글 입력·관련 node/history, 문서는 링크·경로·용어·diff 확인을 수행한다. 기존 [회귀 검사](../regression-checks.md)와 [copy-review 검사](../copy-review.md)를 재사용한다. 단순 표현 변화를 검증하려고 무관한 전체 suite를 반복하지 않는다.

공개 schema/API·교차 repo 계약 변경, dependency lock 또는 빌드/릴리스 공급망 변경, 영향 범위를 한정할 수 없는 리팩터링, 원인이 불분명한 빠른 검사 실패, 릴리스 후보에서는 repo의 전체 관련 경로로 승격한다. 새 에디터 dependency/lock을 실제 도입하면 그 경로를 별도 계획해야 한다. 계획 문서 작성만으로 suite를 실행하지 않는다.

스타일·폰트·renderer·자산 변경은 영향을 받는 HTML/PDF fixture를 다시 생성하고 독립 검수한다. 동일 입력 hash와 동일 환경의 green 증거는 재사용하되 편집기 왕복/IME 검증을 기존 PDF 결과로 대신하지 않는다. 2분 초과 검증은 이유·범위·예상 시간을 먼저 알리고 장시간 실행은 백그라운드 로그와 완료 감시를 둔다. 실패한 필수 gate 뒤의 비용성 후속 작업은 중단하고 실패 범위부터 복구한다.

## 기술 선택의 근거와 외부 자료

아래는 2026-10-05에 완료한 공식 문서·라이선스 조사에 근거한다. 비교 결과는 연동 성능 실측이나 Manual 호환성 인증이 아니다. 가격·기능은 도입 시 선택한 버전과 약관으로 다시 확인한다.

| 후보 | 선택과 이유 | 라이선스 및 범위 | 공식 근거 |
|---|---|---|---|
| Tiptap / ProseMirror | **채택 기준안.** schema와 custom React node view로 Manual 블록 입력·속성 UI를 만들고 명령/history를 연결할 수 있음. adapter 비용은 1단계에서 검증 | OSS MIT. Pages는 유료 Team 기능이며 PagesTableKit/변환 기능은 OSS editor와 구분 | [schema](https://tiptap.dev/docs/editor/core-concepts/schema), [React node views](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/react), [MIT](https://github.com/ueberdosis/tiptap/blob/main/LICENSE.md), [가격](https://tiptap.dev/pricing) |
| Editor.js | **UX 참고.** 블록 추가·이동·설정이 Manual 저작에 가까움. 별도 type/data JSON을 다시 매핑해야 하므로 동시에 editor 엔진으로 도입하지 않음 | core Apache-2.0. 외부 Tool은 별도 권리 확인 | [저장 데이터](https://editorjs.io/saving-data/), [Tool API](https://editorjs.io/tools-api/), [라이선스](https://github.com/codex-team/editor.js/blob/next/LICENSE) |
| Scribe | **UX 참고.** 단계와 화면 교체·crop·검토·출력 동선을 참고. 서비스에 제품 자료를 업로드하는 계획 없음 | 상용 서비스. Basic 무료 범위와 Pro의 이미지 편집·PDF/HTML/Markdown 출력 범위 구분 | [가격](https://scribe.com/pricing), [이미지 편집 안내](https://scribehow.com/viewer/Advanced_image_editing__annotations_in_Scribe__Bs8KlK42RuuPgTn1_r3X4A) |
| Lexical | 비교 후보 보류. 노드/직렬화는 가능하나 이번 Manual에 더 낮은 매핑 비용을 제공한다는 근거 없음 | MIT. 조사에서 공식 완성형 A4/PDF 경로는 확인하지 못함 | [소개](https://lexical.dev/docs/intro), [nodes](https://lexical.dev/docs/concepts/nodes), [라이선스](https://github.com/facebook/lexical/blob/main/LICENSE) |
| Paged.js | 자동 텍스트 흐름·쪽 번호·분할이 필요할 때 출력 엔진 후보. 현재 직접 작성 pages에 도입할 필요는 없음 | MIT. editor 자체는 아님 | [개요](https://pagedjs.org/en/documentation/1-the-big-picture/), [hooks](https://pagedjs.org/en/documentation/10-handlers-hooks-and-custom-javascript/), [라이선스](https://github.com/pagedjs/pagedjs/blob/main/LICENSE.md) |
| Vivliostyle | 긴 출판 문서의 페이지 조판 후보, Pub의 편집/별도 preview 구조 참고 | Core/Viewer/CLI AGPL-3.0, Pub 자체 코드 Apache-2.0. 결합 방식에 따른 라이선스 검토 필요 | [Viewer](https://docs.vivliostyle.org/en/viewer/vivliostyle-viewer/), [CSS 지원](https://docs.vivliostyle.org/en/reference/supported-css-features/), [라이선스 FAQ](https://vivliostyle.org/faq/) |

Tiptap Pages는 현재 첫 버전 선택이 아니다. 공식 [제한 문서](https://tiptap.dev/docs/pages/core-concepts/limitations)는 큰 비분할 블록, pagination용 table kit, 실험적 행 분할, 페이지별 스타일·다단·브라우저 인쇄 연계의 제한을 설명한다. 이를 OSS Tiptap editor 전체의 제한으로 확대하지 않는다. 후속 엔진 평가에서도 [CSS fragmentation](https://www.w3.org/TR/css-break-3/)과 실제 한글·그림·표 fixture를 기준으로 판단한다.

최초 조사에서는 Tiptap v3.31.4, Lexical v0.52.0, Editor.js v2.31.7, Vivliostyle v2.45.2의 최근 release/활동을 확인했고 설치하지 않았다. 이후 사용자 승인으로 **Tiptap 3.31.4만 앱에 도입**하고 B가 실제 schema/history를 검사했다. 다른 후보는 조사 상태다. Paged.js는 npm stable 0.4.3의 2023-07-06 발행 시점과 source 활동을 구별한다.

## 미확정 항목과 첫 실행 단위

| 결정할 항목 | 권장 기본값 | 결정 시점과 필요한 근거 |
|---|---|---|
| 앱과 package 경계 | 같은 repo의 private `apps/editor/`, 앱 lock, 라이브러리 exports와 분리 | 적용 중. D 담당의 실제 build/화면 근거 필요 |
| 제목 계층과 nesting | h1 하나, 페이지 h2 하나, subheading/step/Callout 동급 h3. 동일 강조 바 중첩 없음 | A 구현·빠른 검사 완료, 최종 독립 출력 확인 필요 |
| Tiptap의 문서 구조 | 역할별 object node, field/array, plain string, opaque atom. 단일 history | B runtime 검사 완료. 실제 IME/화면 노드 조작 확인 필요 |
| 실행 및 저장 host | Node loopback host, 선택한 문서 폴더 단위 | Windows/Chromium에서 C 저장·복구·출력 실증. 사용자용 시작/session 연결 UX와 다른 지원 환경은 남음 |
| editor 상태 파일 | `.editor/`에 draft·선택·리비전·복구 근거, manual schema는 유지 | 왕복·부분 저장 복구 실험 후 최소 형식 확정 |
| 제품 승인 최신성 | 과거 기록 보존 + 현재 리비전 승인 여부 별도 표시 | 제품 문서 담당자와 기존 승인 기록의 기준 리비전 확인. 이력이 부족하면 재확인 표시 |
| 첫 시범 자료 | 공개 합성 fixture로 시작, 이후 소비 repo의 승인된 제품 문서 | 실제 자료 owner·범위가 정해진 뒤 제품 검수 |

**다음 실행 단위는 통과한 모델을 실제 D UI와 C host에 연결하는 검증**이다. 브라우저에서 한글 조합→단계 이동→crop 변경→undo/redo→실제 저장/재열기를 수행하고, 현재 A renderer hash의 독립 HTML/PDF를 확인한다. 모델 검사 20개 통과만으로 이 흐름을 완료했다고 표시하지 않는다.

## 관련 저장소 문서

- [Manual 문서 인덱스](../README.md)
- [Tiptap 사례 대비 준비도 점검](manual-editor-readiness.md)
- [모델 계약과 구현 근거](manual-editor-model-contract.md)
- [파일 host 실행·검증](../manual-editor-server-run.md)
- [저장·복구·출력 계약](../manual-editor-storage.md)
- [문서 데이터와 API](../document-format.md)
- [원본 자료와 제품 검토 기록](../source-records.md)
- [라이팅 검토와 완료 조건](../copy-review.md)
- [compact 구성 규칙](../agent-skills/lds-manual/references/layout.md)
- [라이팅 규칙](../agent-skills/lds-manual/references/writing.md)
- [출력과 배포](../output-and-release.md)
- [회귀 검사](../regression-checks.md)
- [Storybook](../storybook.md)
