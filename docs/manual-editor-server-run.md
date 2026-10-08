# Manual 에디터 파일 host 실행·검증

Node 22 이상을 사용한다. 기존 Core/Theme 0.4.3·React 및 PDF용 Playwright/Chromium은 선택한 runtime에서 재사용한다. host 자체는 새 dependency를 요구하지 않는다. Tiptap UI 앱의 승인·빌드·실입력 검증은 별도다.

## 현재 로컬 작성 화면 제공 방식

2026-10-07 사용자 지시에 따라 `http://127.0.0.1:44589/manual.html`은 이전 dist를
제공하던 Python 서버에서 최신 source를 제공하는 Vite 개발 서버로 전환했다.
기존 PID19797은 종료됐고 UI 담당의 실행 session22294가 동일 loopback strictPort를
유지한다. 기존 Vite 설정과 runtime을 재사용한다. CSS 변경은 HMR으로 반영하지만
현재 JSX 변경은 Vite의 전체 페이지 reload 경로다. 소스의 HTTP200은 이미 열린 탭의
화면 갱신을 증명하지 않는다. 미저장 문서는 먼저 저장한 뒤 사용자가 새로고침한다.
dirty 보호가 reload를 막았는지 등 실제 사용자 탭의 갱신 실패 원인은 별도로 확인한다.
root는 공식 URL의 HTTP200, `/@vite/client`, source entry를 확인했다. 사용자 원탭과
IndexedDB를 강제로 조작하지 않는다.

2026-10-08 서버 중단 신고에서 44589 listener 없음과 연결 실패를 확인하고 같은
`run.mjs dev --runtime ../lk-design-system --port 44589`로 복구했다. 독립 프로세스
PID1171123(Vite child1171130), 로그 `/tmp/lds-manual-dev-44589-recovery.log`와 PID 기록
`/tmp/lds-manual-dev-44589-recovery.pid`를 사용한다. `/manual.html` HTTP200을 확인했으며
이 실행은 이전 session22294를 대신한다. 원사용자 탭 reload·문서·IDB 조작은 하지 않았다.

일반 `/` 및 `/index.html`의 작성 진입점은 `/manual.html`이다. v1 호환 진입점은
`/index.html?legacy=1`이며 기존 인증 receiver/memory·hash token 경로와 preview iframe은
유지한다. 같은 source/config의 별도 임시 origin38295에서 일반 두 주소의 실제 redirect와
v1 호환 렌더를 검증하고 소유 탭·임시 서버를 종료했다. 이는 사용자44589 origin의
보관함을 직접 검사한 증거가 아니다. 데이터 이관은 수행하지 않았다.

개발 화면 제공은 편집 기능 전체의 검증 완료와 구분한다. source 단위·모델 검사 및
합성 문서 native 결과는 [UI 감사 원장](plans/manual-editor-ui-audit.md)을 따른다.
별도 memory QA35587/session80627은 필요한 증분 검증용이며 공식 작성 링크가 아니다.

## 앱 의존성 복원과 빌드

앱 lockfile의 Tiptap 3.31.4를 복원하고, React와 Vite는 이미 준비한 runtime에서 재사용한다.
이 lockfile은 React peer를 앱에 중복 설치하지 않는 구성이다. `npm ci`에
`--legacy-peer-deps`를 지정한다. 새 패키지나 버전을 추가하거나 sibling의 의존성을 변경하지 않는다.

```bash
npm --prefix apps/editor ci --legacy-peer-deps --ignore-scripts --no-audit --no-fund
node apps/editor/run.mjs build --runtime ../lk-design-system
```

## 기존 v1 브라우저 작성 경로

이 절은 `/index.html?legacy=1`의 기존 v1 호환 화면이다. 현재 재설계 v2 진입점과 저장 파일 형식은 아래
`/manual.html` 절을 따른다.

인증 없는 v1 호환 URL은 브라우저 로컬 작성 모드다. A4의 문구를 눌러 직접 입력하고,
Enter로 다음 문단·단계를 만든다. Shift+Enter는 줄바꿈이며 세부 설정은 오른쪽 패널에서 연다.
단계의 ‘화면 넣기’ 또는 상단 ‘스크린샷’으로 PNG/JPEG/WebP(20MB 이하)를 넣는다.

‘저장’은 문서·이미지를 현재 출처의 IndexedDB에 보관한다. ‘파일 → 열기’에서 저장 문서를 고른다.
새 문서/다른 문서로 전환할 때 변경 내용을 먼저 보관하며 실패하면 전환을 멈춘다.
‘문서 파일 내려받기’는 `lds-manual-browser/v1` JSON bundle을 만들고, ‘문서 파일 열기’는
bundle 또는 기존 Manual JSON(50MB 이하)을 읽는다. 브라우저 저장소 제거·출처/포트 변경 시 같은 보관함을 사용할 수 없으므로
장기 보관이나 다른 컴퓨터로 이동할 때 파일을 내려받는다. 외부 파일의 상대 이미지 경로는 자동으로 읽지 않으며 이미지를 다시 선택해야 한다.

‘인쇄 / PDF’는 유효성·이미지·A4 넘침 검사 후 브라우저 인쇄를 요청한다. 내장 브라우저에서
인쇄창이 지원되지 않으면 일반 브라우저에서 문서 파일을 열어 사용한다. 브라우저 인쇄는 아래 host의
검토 기록·독립 출력 이력과 구별한다. host 연결 및 인증 경계는 그대로 유지한다.

직접 편집 관련 빠른 검사:

```bash
node --test tests/editor-model.test.mjs tests/editor-model-runtime.test.mjs apps/editor/tests/step-controls.test.mjs apps/editor/tests/browser-documents.test.mjs
```

## 재설계 저작 화면

같은 UI 빌드의 `/manual.html`은 신규 v2 매뉴얼 작성 경로다. `/prototype.html`은 이전
입력 기반 시험 화면이며 실제 작성 진입점과 구분한다. 기본 `/`와 `/index.html`은
`/manual.html`로 이동하며, 기존 v1은 `/index.html?legacy=1`에서 연다.

페이지 목차와 하나의 본문 편집기에서 직접 작성한다. `/` 검색과 블록 옆 메뉴/삽입,
기본 제목·목록·체크리스트·토글·코드, Manual 절차·그림·표·안내를 지원한다.
별도 A4 보기 모드는 제거했으며 오른쪽 문서 메뉴의 `인쇄 / PDF…`에서 분량과 누락을
확인한다. 헤더는 문서 제목, 투명 배경 저장 아이콘, 문서 메뉴로 구성한다.
`열기…`는 파일 선택으로 문서를 열고, 저장/Ctrl+S는 연결된 같은 파일에 저장한다.
새 문서 첫 저장과 `다른 이름으로 저장…`은 이름과 위치를 선택한다.
확장자는 `.manual.json`이며 이미지가 포함된 `lds-manual-document/v2`를 사용한다.
브라우저 보관함 자동 저장은 보조 복구 경로이며 `보관함…`에서 별도로 연다.
브라우저가 native file picker를 지원하지 않는 경우 선택 input/다운로드로 대체한다.
이 다운로드를 같은 파일 덮어쓰기나 정식 저장 완료로 표시하지 않는다.
기존 v1 파일은 여기서 자동 변환하지 않는다.

이 경로의 저장 버튼은 서버 문서 폴더에 쓰지 않는다. 브라우저 인쇄는 초안이며 아래
host의 독립 HTML/PDF·검토 이력을 대신하지 않는다. 실제 지원·검증 범위와 미완료 항목은
[현재 목표와 수락 기록](plans/manual-editor-redesign.md#14-노션-기본-편집-목표와-수락--2026-10-07),
파일 저장과 보조 보관함의 계약은 [현재 파일 저장 계약](manual-editor-storage.md#현재-v2-파일-저장-계약)을 따른다.

### 로컬 데모 복구와 실제 한글 입력 확인 — 2026-10-07

`http://127.0.0.1:44589/manual.html`의 listener 부재를 확인한 뒤 UI/server 담당이
기존 `apps/editor/dist`를 제공하는 loopback 정적 서버를 복구했다. 신규 빌드 없이
`manual.html`, `manual-UEYE18ZB.js`, `manual-f78nMq7A.css`의 HTTP 200과 현재 entry를
확인했다. 사용자 탭을 강제로 새로고침하지 않았으므로 열려 있던 내용을 저장한 뒤
사용자가 새로고침해야 현재 빌드가 적용된다.

작성 도구·표 target·메뉴 배치/스크롤·시각 QA 수정 뒤 현재 제공 entry는
`manual-DwdcZC6x.js` / `manual-CQhRuthu.css`다. build230ms green이며 조정 담당이
manual HTML과 entry/공유 preload JS/CSS 10개 모두 HTTP200 및 byte/SHA 일치를 확인했다.
작성 A4·페이지/본문 컨트롤·검색 포커스의 CiRE/ILW build261ms는 이전 수락이다. 메뉴의
상시 단축키 footer 참조는 제공 asset 전체에서 0이다. 현재 source·수락 근거는
[작업 메뉴 수락](plans/manual-editor-redesign.md#작업-메뉴의-자동-선택과-상시-안내-정리--2026-10-07)을
따른다. 자동 선택/안내 제거 시점의 `manual-BClU9mZs.js` / `manual-DViN9xf6.css`,
삽입 메뉴 보완의 `manual-Bhr0Slzl.js` / `manual-CyB0P0Ri.css`,
단계 Shift+Tab·간격 보완의 `manual-DH2w8aas.js`와 팝업 보완 시점의
`manual-D6O6MO2j.js` / `manual-FkmUfV1i.css`는 이전 근거다.
제품 서버를 재시작하지 않고 기존 정적 제공 경로에서 빌드를 반영했다.

현재 제품의 자동 A4 경계 입력에는 후속 감사에서 확인한 P1이 남아 있다. 자동으로
갈라진 본문 첫머리의 Backspace가 반복 제목에 본문을 합친 뒤 제목 동기화에서 지우는
실제 PM 재현이며, 새 수정판의 native/제품 반영을 아직 수락하지 않았다. 아래
[자동 A4 경계 수정과 다음 후보](#자동-a4-경계-수정과-다음-후보--2026-10-07)를 따른다.

작성 footer는 `편집 현재 / 전체쪽수 · A4`를 표시한다. caret/선택의 page ancestor 기준이며
해당 page가 없으면 총쪽수만 표시한다. 저장 상태는 header, 파일 이동 설명은 파일
내려받기 메뉴의 description에서 제공한다. 성공 안내는 4초 동안 표시하고 실제 오류는
status/alert로 유지한다. 격리 메모리 QA에서 목차에 따른 편집 위치 변경, 저장 quota 실패
alert 유지와 정상 retry를 확인했고, actual390px 프레임의 작업 메뉴 SVG6/누락0·가로
넘침0을 확인했다. 전체 slash/변환 메뉴의 시각 범위는 별도 [UI 감사](plans/manual-editor-ui-audit.md)를 따른다.
사용자 탭을 강제로 새로고침하지 않았으므로 열려 있던 내용을 저장한 뒤 새로고침하면
이 빌드가 적용된다. 기본 입력/Enter의 고정 A4 넘김과 한 Undo/Redo를 수락했다.
입력의 자동 넘김은 실제 커서가 보이는 위치로 스크롤한다. 콜아웃 joined gap이 빠져
앞뒤로 이동하던 오류는 같은 합성 recipe에서2쪽/경고0/한 UndoRedo로 수락했다.
초기 saved8쪽은 화면16쪽/저장0/history0·자산1로 수락했다. 재열기에서 원본216개 표시
ID와 내용/meta/marks/자산은 같고, 원본에 없던23개 파생 UUID는 재생성됐다. 새 복사본
최초 저장과 빈 자동2쪽 제거→1쪽/저장0/history0도 확인했다.80개 빈 문단 범위 삭제는
3→1쪽과 한 UndoRedo의 문서/IDs equality로 수락했다. 인쇄 preflight의16쪽 넘침 오판은
작성/출력 간격 및 실제크기0 wrapper 필터를 맞춰 수정했고, 문서 제목만 빈값인 gate에서
제목 issue1/넘침0을 확인했다. 실제 OS PDF와 새 source 경계의 미수락은 감사에 남긴다.
콜아웃 우측 흰 여백은 뒤 외부 본문으로 이동하고, 없으면 같은 page에 빈 본문 하나를
만든다. 파란 안쪽 여백은 내부 caret만 옮긴다. 생성·입력의 Undo와 기존 내용 보존을
격리 native에서 확인했다. [최신 UI 수락](plans/manual-editor-ui-audit.md#콜아웃-오른쪽-빈-공간의-이어-쓰기--2026-10-07)을 따른다.

사용자의 추가 지시에 따라 상시 링크/코드 버튼, 선택 서식의 링크 버튼, URL 대화상자와
CtrlK 가로채기를 제거했다. 선택 서식의 인라인 코드·Ctrl/⌘E 및 backtick 입력은 유지한다.
기존 링크 데이터·rendering·codec·kernel은 보존한다. 이전 CiRE의 URL 추가/수정/해제
native는 당시 기능의 근거이며 현행 URL 작성 진입점으로 안내하지 않는다.

페이지와 표지의 이름표는 종이 위쪽에서 페이지 이동·복제·삭제 메뉴를 연다. 본문 옆
`+`는 해당 본문 바로 뒤에 내용을 추가하며, 왼쪽 `+ 페이지 추가`와 별도 위치 설명은 선택한
물리 쪽 뒤에 새 페이지를 넣는다. 두 동작과 한 UndoRedo를 실제 화면에서 구분해 확인했다.
페이지/표지 전체 선택에는 링크를 적용하지 않는다. 390px에서 목록·속성 패널이 열린
동안 떠 있는 손잡이를 숨기고 닫으면 다시 표시한다. 검색 메뉴는 바로 입력할 수 있도록
focus를 유지하며, 얇은 중립1px 테두리와 검색/Escape 원문 보존을 native로 확인했다.
기존 A4·링크 후보 `manual-Cu3-VQIh.js` / `manual-C65mBesw.css`는 이전 근거다.

상단 `···` 작업 버튼을 제거했고 본문 Ctrl/⌘+/·ContextMenu·ShiftF10으로 대상 근처의
같은 블록 메뉴를 연다. 표 셀의 구조 작업은 부모 표로 올리고 Inspector의 개별 셀
복제/이동/삭제를 제외한다. 메뉴 전체를 main∩visualViewport에 배치하고, 좁은 폭으로
전환하면 목록·속성 overlay를 닫는다. 수동 스크롤 직후 첫 방향키와 이미 끝난 스크롤
뒤 첫 방향키에서 모두 선택 항목이 보이도록 실제390px에서 확인했다.
삽입 메뉴도 검색/선택/Escape와 같은 체계를 사용한다. 가져오기·저장·인쇄 실패는
13px alert band/재시도로 표시하고 footer 위치 정보는12px이다.

사용자에게 우선 요청한 실환경 확인은 한글 문장 입력→Enter→다음 문단 입력과
`/` 뒤 한글 ‘제목’ 검색→메뉴 선택 두 가지다. 마지막 글자의 중복·유실, 커서 튐,
조합 중 메뉴 선택과 검색어 잔존을 확인한다. 합성 composition 이벤트와 문자열 입력
자동화는 실제 OS 입력기의 수락 근거로 삼지 않으며, 모바일·인쇄 등의 미검증은 별도 기록한다.

### 분리된 저장 오류 QA

```bash
node apps/editor/run.mjs dev --runtime ../lk-design-system --port 6013
```

다른 로컬 포트의 `/tests/fixtures/manual-storage.html`에서 실제 편집기에 합성 메모리 storage를
주입한다. 정상/공간 부족/지연 저장과 지연 열기 제어를 사용한다. 브라우저 보관함과 사용자 문서를
수정하지 않으며 프로덕션 build entry에 포함하지 않는다. 검사 뒤 QA 탭과 해당 dev server만 정리한다.
실패 중 계속 입력→파일 보관→정상 모드→명시 저장 재시도, 지연 저장 중 입력과 문서 교체를 검증한다.
이 화면의 결과는 실제 OS quota 검사와 구분한다.

같은 QA URL의 `?document=pagination`은 합성 긴 문서8쪽과 자산1개를 처음부터 저장된
record로 주입한다. 시도/성공0에서 시작해 초기 자동 페이지 정리가 불필요한 저장을
발생시키지 않는지 확인한다. 일반 QA의 기본2문서와 저장 API는 유지하며 실제 사용자
보관함에 seed를 쓰지 않는다. 신규 fixture 자산/분리 복사 검사와 지연 저장 도중 A4가
나뉘는 문서 전환 연결 검사는 각각 native 초기 열기와 별도로 기록한다.

`?document=pagination-empty`는 saved root1쪽과 동일한 빈 automatic2쪽을 주입한다.
초기 정리가 두 자동 쪽을 모두 제거하는지, history/저장/문서 교체 보호 상태와 원문을
확인한다. synthetic root 참조·unique ID·파일 왕복 검증과 실제 native 결과는 구분한다.

동시 소스 편집 때문에 HMR이 합성 문서를 초기화하면 QA만 고정 빌드로 분리한다. 기존
Vite config를 확장한 임시 config에서 rollup input은 `manual-storage.html`과 필요한
`manual-layout-frame.html`만 두고 outDir는 `/tmp`의 고유 QA 폴더로 지정한다. 그 빌드를
별도 loopback 정적 포트로 제공하고 로드된 asset 이름/source SHA를 기록한다. 제품 dist/
entry와 사용자 문서·브라우저 저장소는 이 격리 빌드로 바꾸지 않는다. 검사 후 QA 탭·서버와
임시 trace를 정리하며, 최종 제품 빌드의 결과는 이 임시 asset과 별도로 대조한다.

자동 페이지 넘김의 재현 파일은 아래 생성기로 만든다.

```bash
node apps/editor/tests/fixtures/generate-manual-pagination-fixture.mjs
```

`manual-pagination.manual.json`은 명시 8쪽·최상위 11블록·합성 자산 1개다. 긴 문단과
콜아웃/인용/토글 내부 본문, 번호 목록·절차·표 및 마지막 별도 그림 페이지를 포함한다.
고정 작성 A4와 자동 넘김은 통합 중이며 이 파일의 생성 성공을 실제 페이지 흐름의 수락으로
표현하지 않는다. 내용/marks/ID 보존, 반복 제목·머리글, Undo/Redo와 저장·재열기를
[자동 흐름 계약](plans/manual-editor-ui-audit.md#자동-흐름-계약과-통합-중-수락-조건)에 따라 확인한다.

50쪽·450개 최상위 블록의 합성 문서는 아래 명령으로 재생성한다. 이미지 50개가 하나의
PNG 자산을 공유하며 실제 제품 정보나 사용자 문서는 포함하지 않는다.

```bash
node apps/editor/tests/fixtures/generate-manual-large-fixture.mjs
```

생성 파일은 `apps/editor/tests/fixtures/manual-large-document.manual.json`이다.
QA 화면의 `파일 → 파일을 복사본으로 가져오기…`로 열고 마지막 목차 이동→입력→한 번의
실행 취소/다시 실행→자동 저장→보관함 재열기→파일 내려받기를 확인한다.
2026-10-07 입력 파일은 251,809바이트였으며 이 연결 흐름은 통과했다. 복사본은 fresh ID를
발급하므로 파일 크기가 달라질 수 있다. 계측한 도구 왕복 시간을 에디터 순수 처리시간이나
성능 보증으로 표현하지 않는다. [수락 기록](plans/manual-editor-redesign.md#최신-통합-검증과-남은-환경--2026-10-07)을 따른다.

각 페이지가 안내·표·그림·토글·코드 중 하나로 끝나는 5쪽 fixture는 별도로 준비한다.
위 50쪽 파일에서 합성 블록을 추출하며 뒤 문단은 두지 않는다.

```bash
node apps/editor/tests/fixtures/generate-manual-end-fixture.mjs
```

생성 파일 `apps/editor/tests/fixtures/manual-end-boundaries.manual.json`은 6,258바이트·5쪽·자산 1개다.
격리 QA에서 각 마지막 요소 아래 클릭→바깥 본문 입력→입력 직후 undo/redo→자동 저장→
보관함 재열기를 확인한다. 내부 내용·ID와 바깥 문장의 보존이 검사 대상이며 문서 재열기
후 이전 세션의 undo history를 유지하는 기능을 전제하지 않는다. fixture 생성·파일 validator
통과와 실제 UI 수락은 구분한다.

2026-10-07 이 fixture의 다섯 끝에서 바깥 본문 입력→최초 입력의 한 Undo/Redo→자동 저장→
재열기가 실제 memory QA UI에서 통과했다. 원요소 내부 내용·ID·메타·이미지 bytes와 외부
본문 ID/문장/같은 page parent를 함께 대조했다. 실제 OS 한글 조합 검사와는 별도다.

두 페이지의 연결 편집 fixture는 다음 명령으로 생성한다.

```bash
node apps/editor/tests/fixtures/generate-manual-workflow-fixture.mjs
```

`apps/editor/tests/fixtures/manual-connected-workflow.manual.json`은 12,942바이트·2쪽·21개
최상위 블록·자산 1개다. 기본 블록과 인용/절차를 포함하고 첫 페이지의 그림과 본문이
인접해 다중 이동을 검사할 수 있다. 편집·변형→다중 이동→한 Undo/Redo→자동 저장→
보관함 재열기→파일 다운로드/복사본 가져오기를 하나의 memory QA 흐름으로 확인한다.
복사본의 ID는 모두 새로 발급되고 내용·marks·checked/open·중첩 구조·자산은 보존돼야 한다.
기능별 기존 green과 이 연결 흐름을 구분해 기록한다.

2026-10-07 별도 UI 검토 세션에서 이 한 흐름을 native 수락했다. 이동의 62 DOM 노드
snapshot과 두 블록 선택을 Undo/Redo로 복원하고, 재열기에서도 같은 ID/상태를 확인했다.
자기 파일 다운로드→복사본 가져오기는 모든 ID fresh와 ID 제외 내용/자산 equality를 확인했다.
상세 snapshot·artifact hash는 [통합 기록](plans/manual-editor-redesign.md#최신-통합-검증과-남은-환경--2026-10-07)을 따른다.

### 단계 Shift+Tab과 작성 레이아웃 QA

```bash
node apps/editor/tests/fixtures/generate-manual-procedure-outdent-fixture.mjs
node apps/editor/tests/fixtures/generate-manual-layout-fixture.mjs
```

생성 파일은 같은 디렉터리의 `manual-procedure-outdent.manual.json`
(6,282바이트·2쪽·자산1)과 `manual-layout.manual.json`
(10,101바이트·3쪽·18개 최상위 블록·자산1)이다.
단계 fixture는 빈 셋째 제목, 내용 있는 중간 단계·앞뒤 단계·이미지·extensions를 포함한다.
빈 셋째 제목에서 Shift+Tab→바깥 본문 입력→입력/전환 각각 Undo/Redo→저장·재열기를
확인하고 원래 내용/ID/caret과 모델의 이미지 bytes·파일 왕복을 구분해 비교한다.

레이아웃 fixture는 첫 todo/본문/안내와 본문·목록·구분선·그림·표·토글·코드·절차·제목을
포함한다. 별도 dev 서버의 `/tests/fixtures/manual-layout-frame.html`에서 독립 메모리
에디터 iframe을 열고 native `1280px 작성 폭` / `390px 작성 폭` 버튼으로 검사한다.
실제 iframe innerWidth/media query를 바꾸며 사용자 브라우저 viewport나 저장소는 바꾸지 않는다.
첫 블록 위24px·본문 버튼 바깥 여유약12px·18블록 가로 넘침과 양쪽 패널/page wrapper의
toolbar·목차 경계를 2026-10-07 native 수락했다. 모델 단계 관련20개/controller 신규3개도
통과했다. cover wrapper는 controller 검사 범위다.
[측정·캡처와 한계](plans/manual-editor-ui-audit.md#작성-화면의-작업-공간과-간격-재점검--2026-10-07)를 따른다.
QA 화면은 production entry에 넣지 않는다. 담당의 해당 QA44590/session25432는 종료됐고
제품44589는 유지했다. 실제 OS 모바일·200% 확대·OS IME 검사로 확대하지 않는다.

같은 layout fixture의 후속 `+` 메뉴 검사에서는 다른 본문의 caret/range·입력 서식을
둔 채 todo `+` 열기→검색→Escape의 문서/원래 선택/서식/저장 상태 보존을 확인한다.
todo 바로 뒤 본문·제목2 삽입과 안내 내부 본문 뒤 삽입→각 한 Undo/Redo,
명시적인 손잡이 작업 메뉴의 복제도 검사한다. 2026-10-07 관련 모델 15/15와 이 native
흐름을 수락했다. 검색 input focus와 실제 블록 작업의 선택은 유지하고 추가 메뉴가
만드는 불필요한 NodeSelection만 제거했다. 해당 QA tab4/session9546/44590은 종료됐다.

## 새 문서 또는 기존 문서 시작

에디터 dist를 먼저 빌드한 뒤 명시적인 로컬 경로를 선택한다. `launch.mjs`는 Vite dev/build용 `run.mjs`와 별개다.

```powershell
# 새 경로만 생성: 기존 폴더는 비어 있어도 거부한다.
node apps/editor/launch.mjs new <새-문서-폴더> --title "제품 사용 매뉴얼" --document-version 0.1 --runtime <설치된-LDS-프로젝트> --browser <Chromium-실행파일> --open-browser

# 기존 manual.json·자산·기록을 바꾸지 않고 연다.
node apps/editor/launch.mjs open <기존-문서-폴더> --runtime <설치된-LDS-프로젝트> --browser <Chromium-실행파일> --open-browser
```

`--ui <빌드-디렉터리>`로 고정 UI 디렉터리를 선택할 수 있고 기본은 `apps/editor/dist`다. `--port 0`은 비어 있는 loopback 포트를 고른다. 새 문서는 기존 init CLI를 고정 argument 배열·`shell:false`로 실행한다. 기존 경로·원문을 덮어쓰거나 다른 root로 바꾸는 HTTP API는 없다.

`--open-browser`를 생략하면 브라우저를 조작하지 않고 baseUrl/PID/root/sessionPath/launchFile과 실행 결과 metadata만 출력한다. 사용자가 표시된 비공개 `launchFile`을 열면 동일한 흐름으로 시작한다. `--open-browser`는 지정한 Chromium 또는 OS 기본 HTML handler로 비공개 시작 파일을 열며 URL은 파일 경로만 포함한다. launcher 프로세스는 host를 유지하고 정상 종료 시 자신의 session/start 파일과 lease를 정리한다.

비공개 `start.html`은 사용자별 OS 임시 폴더 안 `0600` 파일이다. bearer가 아닌 일회용 launch ticket을 정확한 loopback `/bootstrap/launch`에 POST body로 보낸다. 이 경로만 파일의 opaque `Origin:null`을 ticket·Host·top-level navigation 대조 후 허용한다. 다른 출처, 틀린 ticket, iframe, 재사용은 거부한다. 일반 파일 API의 Origin/Bearer 검사에는 예외가 없다.

성공한 시작 응답은 nonce로 허용된 script만으로 origin별 탭 sessionStorage에 세션을 넣고 같은 출처의 `/`를 연다. 포트를 포함한 출처별로 세션을 분리하며 인증 cookie는 발급하지 않는다. host가 index의 기존 module bundle 앞에 넣는 blocking classic `/bootstrap/session.js`는 같은 출처 script 요청에서 탭 저장소의 contract/baseUrl을 확인하고 `globalThis.__LDS_MANUAL_SESSION={contract:"lds-manual-editor-bootstrap/v1",baseUrl,token}`을 만든다. 이 receiver 응답 자체에는 token이 없으며 승인된 시작 응답만 탭 저장소를 초기화한다. UI는 이 memory token을 Authorization에 사용한다. 익명 탭이나 다른 출처/포트의 저장값은 세션을 제공하지 않는다.

D UI는 해당 global의 token을 앱 초기화 때 받아야 한다. C는 UI 파일을 수정하지 않는다. 기존 dist가 URL fragment만 읽으면 새 시작 경로를 소비하지 못하므로 D의 연결 수정·재빌드와 실제 브라우저 검증이 필요하다. 새로운 launcher는 URL query/fragment에 비밀값을 넣지 않는다. ticket/cookie/token이 들어 있는 비공개 시작 파일·network 응답·메모리를 로그·계약·화면 아티팩트에 복사하지 않는다. 이미 쓴 시작 파일을 다른 브라우저 profile에서 재사용할 수 없고 정상 인증된 같은 탭에서는 token 없는 baseUrl로 재열 수 있다. 새 탭/다른 browser profile의 연결과 브라우저 종료 뒤 재시작은 새 launcher 세션이 필요하다.

launcher만 바뀐 빠른 검사:

```powershell
node --test apps/editor/server/tests/launcher.test.mjs
```

실제 새/open 폴더·init 프로세스·기존 폴더 거부, 원본 bytes 보존, private ticket/Host/Origin/replay 경계, blocking script 순서와 memory session→Bearer API 연결, API cookie 비인증, 실제 CLI metadata의 token 비노출을 검사한다. 브라우저 opener는 test double로 대체하며 실제 브라우저 동작을 검사했다고 표시하지 않는다. 기존 저장·PDF green은 동일 입력/소스/환경의 범위로만 재사용한다.

## 파일 host 직접 실행

```powershell
node apps/editor/server/host.mjs --root <소비-문서-폴더> --runtime <설치된-LDS-프로젝트> --browser <Chromium-실행파일> --ui <에디터-빌드-디렉터리> --port 0
```

`--ui`를 생략하면 API host의 상태 안내만 표시한다. `--port 0`은 비어 있는 별도 loopback 포트를 선택하므로 기존 6010 Storybook을 바꾸지 않는다. 직접 host 실행은 stdout에 token 없는 baseUrl, PID, private sessionPath만 출력한다. 이 모드는 bootstrap을 기본으로 켜지 않으며 문서 시작은 위의 launcher를 사용한다. 브라우저 UI는 `Authorization: Bearer <session>`와 same-origin 요청을 사용한다. 서버의 파일 API는 cookie나 URL query를 인증으로 사용하지 않는다.

```text
GET  /api/document
POST /api/save          {expectedRevision, document, sources?, copyReview?}
POST /api/draft         {expectedRevision, document, editorState?}
POST /api/assets        {expectedRevision, name, bytesBase64}
GET  /api/asset?src=<relative-path>
POST /api/exports       {expectedRevision, format:"html"|"pdf", mode:"draft"|"reviewed"}
GET  /api/exports/<jobId>
GET  /api/exports       # 이전/현재 job 목록; 성공·실패·중단·stale 구분
GET  /api/exports/<jobId>/file/<known-artifact>
POST /api/visual-review {expectedRevision, jobId, reviewer, outcome:"pass"|"fail", reason}
```

오류는 `{error:{code,message,details?}}`로 반환한다. 409는 외부 변경/오래된 revision/복구 충돌이고 422는 구조·자산·검토가 유효하지 않은 상태다. 401/403은 세션/origin 실패다. 저장 거부 뒤 draft로 보존할지, reload 뒤 외부 변경을 검토할지는 UI의 명시적인 사용자 동작이다. 자동 덮어쓰기나 실패 뒤 승인 표시를 하지 않는다.

이미지/iframe/download는 Authorization header를 직접 넣을 수 없으므로 UI가 인증된 fetch로 bytes를 받은 뒤 blob URL을 만든다. 파일 API URL에 token query를 추가하거나 anonymous 경로를 만들지 않는다. 생성 HTML은 자기 폰트/자산을 포함하며 편집 UI의 CSS/스크립트를 사용하지 않는다.

검토·초안 UI 연결은 다음 반환 값을 사용한다. `/api/document.draft`는 `{document, editorState, baseRevision, savedAt}`이며 복원은 편집 상태에 넣는 명시적인 동작이다. draft를 읽었다고 정본을 자동 덮어쓰지 않는다. `/api/save`에 현재 document와 명시적인 copyReview object를 함께 보내면 기록을 보존·저장하고 `review.copy.{current,errors}`를 다시 계산한다. 미완료 기록도 보존할 수 있으나 current로 자동 승격하지 않는다.

검토 후 출력 순서는 정본/문구 검토 기록 저장 → 새 revision 확인 → 같은 format의 draft 출력 → 현재 성공 job 시각 검토 → reviewed 출력이다. copyReview 저장도 disk revision을 바꾸므로 그 전의 출력에 시각 검토를 기록하지 않는다. visual-review 기록 자체는 정본 revision을 바꾸지 않는다. 출력 완료 status의 `artifacts[filename].url`과 실패 `diagnostics[filename].url`은 known artifact 경로이며 모두 인증된 fetch가 필요하다.

고정 `/preview.html`에만 `frame-ancestors 'self'`와 `X-Frame-Options: SAMEORIGIN`을 적용한다. 편집 UI와 파일 API는 기존 `frame-ancestors 'none'`을 유지한다. UI의 iframe postMessage는 D가 origin/source를 확인한다. 실행 중인 Node host는 서버 파일 변경을 자동 reload하지 않으므로 해당 담당이 자신의 host 프로세스를 재시작해야 한다. 서버 헤더만 바꾸었으면 dist 재빌드는 필요 없다.

변경 범위의 빠른 서버 검사:

```powershell
node --test apps/editor/server/tests/storage.test.mjs
```

합성 fixture로 실제 HTTP 저장→host 프로세스 종료→새 host 재열기, 외부 문서/자산 충돌, 미완성 draft, 준비/부분 저장 중 프로세스 강제 종료, 손상 준비 세대 rollback, 복구 중 외부 변경 차단, 원본 바이트·동명 자산 보존, crop 실제 크기, 경로 탈출·origin/session 거부, sidecar/unknown 승인 이력과 stale 판정을 확인한다. 임시 fixture는 명시적인 테스트 임시 디렉터리에만 생성·정리한다.

출력 host 통합 검사는 별도 opt-in 실행이며 Core/Theme/runtime와 브라우저가 설치된 환경에서만 한다:

```powershell
$env:LDS_EDITOR_TEST_RUNTIME='<설치된-LDS-프로젝트>'
$env:LDS_EDITOR_TEST_BROWSER='<Chromium-실행파일>'
node --test apps/editor/server/tests/exports.test.mjs
```

독립 PDF 완료는 출력 종료 코드·동일 입력/renderer hash의 layout report와 실제 페이지 이미지를 함께 확인한다. 서버 검사 green을 Tiptap IME·키보드 접근성·전체 편집 workflow 또는 제품 승인 완료로 확대하지 않는다.

## 기존 v1 파일 host의 작성 화면

왼쪽에서 페이지를 선택하고 가운데 A4의 글·그림을 누르면 해당 내용만 오른쪽에서 편집한다.
페이지 추가는 왼쪽, 내용 추가는 오른쪽 아래에서 실행한다. 세부 속성과 표 행·열 도구는 필요할 때 펼친다.
저장·실행 취소는 상단, 출력 형식·초안/검토 후 설정은 상단의 **검토·출력**에서 연다.
파일 메뉴에는 다시 열기와 보관 초안 복원·저장이 있다. 850px 이하에서는 문서 보기와 선택 내용 편집을 전환한다.

인증 없는 HTTP 주소는 예제 모드다. 폴더 저장·원본 자산·PDF API는 비활성 상태이며 JSON 내려받기는 메모리의 문서만 대상으로 한다.
IAB에서는 private file bootstrap을 열 수 없어 예제 화면과 폴더 연결 화면을 구별해야 한다.
예제 모드를 문서 폴더 저장이나 제품 매뉴얼 완료 근거로 사용하지 않는다.

## 기존 v1 빌드의 브라우저 저작 흐름 검사

[workflow.test.mjs](../apps/editor/tests/workflow.test.mjs)는 위에서 빌드한 dist와 실제
loopback host·Chromium을 함께 사용한다. 선택한 runtime에 Playwright가 있어야 하며
dependency나 브라우저를 자동 설치하지 않는다. 검사 문서는 OS 임시 폴더에 가상 자료로
만들고 종료 시 자신의 host·브라우저·문서 폴더를 정리한다.

```bash
# repo 루트에서, 기존 LDS runtime과 Chromium으로 실행
LDS_EDITOR_TEST_RUNTIME=../lk-design-system \
LDS_EDITOR_TEST_BROWSER=/usr/bin/google-chrome \
node --test apps/editor/tests/workflow.test.mjs
```

Windows는 위 출력 host 검사와 동일한 `$env:LDS_EDITOR_TEST_RUNTIME` 및
`$env:LDS_EDITOR_TEST_BROWSER`를 설정한 뒤 같은 Node 명령을 실행한다.
두 변수가 없으면 브라우저 검사는 skip이며 통과 근거가 아니다.
`LDS_EDITOR_TEST_CASE=crop`처럼 시나리오 이름의 일부를 지정하면 해당 흐름만 재현한다.
`LDS_EDITOR_TEST_OUTPUT=output/editor-workflow`를 지정하면 공개 합성 화면의 PNG와
정상 3쪽 PDF를 보관한다. 비공개 시작 파일·세션·network 인증 데이터는 수집하지 않는다.

11개 시나리오는 새/open bootstrap·탭/host 재시작, 전체 schema/unknown/sidecar 왕복,
한글 문자열·줄바꿈·단계 이동/분리·undo, 표 행/열·이름/값 목록·optional 제거,
개요 drag·키보드 명령, 미완성 초안과 dirty/외부 충돌 보호, 검토 stale/PENDING/BLOCKED·이력,
crop 오류 유지와 그림 속성 이동, 원본 이미지 import, 미지원 문서 잠금/복구,
인증된 PDF 열기·시각 검토/검토 후 출력·분량 초과 실패·polling 종료를 확인한다.

한글 문자열 입력은 실제 OS IME 조합 검사가 아니다. 표·목록의 선택은 PM node view 안에서
포커스를 가진 native select를 키보드로 조작한다. 화면 개편 전 900px 화면의 편집/미리보기 전환도 검사한다.
모든 필드의 모든 조작 조합, 전체 키보드 접근성, 제품 사실·문구 승인과 실제 OS IME는
별도 검수 범위다. 전체 suite나 새 릴리스 발행을 대신하지 않는다.

이 절의 11개 통과는 화면 개편 전 `editor-DmoKIh8R.js` 근거다. 현재 검사 소스는 새 UI 선택·펼침 동선으로 조정했지만 전체를 재실행하지 않았다.
새 화면의 확인 범위와 남은 재검증은 [사용 동선 개선 기록](plans/manual-editor-plan.md#문서-중심-사용-동선-개선--2026-10-06)을 따른다.


### 페이지·본문 컨트롤 경계 QA

```bash
node apps/editor/tests/fixtures/generate-manual-page-controls-fixture.mjs
```

`manual-page-controls.manual.json`은 표지1+명시3쪽/자산0이며 공개 theme brand alias와
표지 metadata·본문/todo/안내/제목/code를 포함한다. memory QA에서 표지·페이지 이름표,
gutter+ 숨김, 현재 쪽 뒤 삽입, page menu·move/delete와 한 UndoRedo, 본문+ 가로 배치/
중첩, 좁은main/viewport clip을 확인한다. 생성 성공을 실제 UI 수락으로 대체하지 않는다.
목표와 현재 writer별 후보는 [UI 감사](plans/manual-editor-ui-audit.md)의 ‘페이지·본문
컨트롤 구분과 일반 제품 조사’ 기록을 따른다.

### 다중 블록 이동과 작성 A4 흐름 QA

```bash
node apps/editor/tests/fixtures/generate-manual-range-flow-fixture.mjs
```

`manual-range-flow.manual.json`은3명시쪽/자산0이다. 첫 쪽의 안내·2줄 본문·체크 항목을
받는 쪽의 기존24본문 뒤로 함께 옮기고, 실제 자동 넘침 뒤 원ID·marks·metadata·전체
블록 선택과 한 UndoRedo, 뒤 독립 페이지 보존을 확인한다. 생성기의 파일 왕복과 모델
read-only6종은 native drag/선택의 통과를 대신하지 않는다. 실제 넘침과 선택 복원은
격리 memory QA에서 같은 frozen source로 확인하고 UI 감사에 결과를 연결한다.

### CiRE 이후 통합 후보의 이력 — 2026-10-07

작성 정리 전 제품44589는 `manual-CiREa-jR.js`/`manual-ILW1W5bw.css`였다.
이 절의 당시 후보는 Core focus 동결 manifest와 ManualEditor `fb0a9a13`, 빈 콜아웃 Backspace
kernel `efefe5c3`, catalog `61a288a4`, menu CSS `e62d89a3`를 연결했다.
URL 작성 UI·상시 inline-code 버튼 제거/선택 코드 bubble 유지, 다운로드 요청 피드백을
포함한다. full SHA와 범위는 [UI 감사](plans/manual-editor-ui-audit.md)의 마지막 기록을 따른다.

통합 memory QA `BLTYx5A_`/`lsGzkotn`에서 빈 콜아웃 삭제·본문 입력·UndoRedo와 일부
도구/focus는 green이다. locator Enter의 줄바꿈 관찰은 같은 source의 native Return에서
생성 green을 확인해 제품 회귀 판정을 철회했다. 추가 상단 `···` 작업 버튼 제거와
본문 Ctrl/⌘+/ 메뉴 접근은 후속 UI 후보로 검증했다. 이 절의 fb0a 근거를 이후 새 빌드의 근거로 승계하지 않는다.
새 **LDS Manual 독립 검증** 채팅은 당시 제품/다음 후보를 나눠 재현하고, 원탭·IDB·
제품 서버·source에 쓰지 않는다. 독립 A4 mixed drag와 실제 파일 bytes/복원 근거는
생성 성공·HTTP200·요청 알림과 구분해 수락한다.

독립 BLTY/lsGzkotn 합성 QA에서3블록 이동→A4 3→4쪽/선택3/한 UndoRedo와 자동 저장·
실제11708B 다운로드→복사본 열기를 확인했다. 원fixture의 copy import 이후 ID34개와
leaf31개의 DOM 보존 및 실제 파일은 root도 대조해 [증거 manifest](plans/assets/manual-editor-ui-audit/independent-range-flow-evidence.json)에
보관했다. 이 기존 fb0a QA의 상단 N개블록 버튼은 새7b에서 제거 중이므로 두 후보의
화면/소스 수락을 나눠 기록한다.

### 작성 도구·시각 QA 수정판 제공 — 2026-10-07

현재 `manual-DwdcZC6x.js`352975B와 `manual-CQhRuthu.css`28899B는 빌드230ms 뒤
기존44589 서버에서 제공된다. root가 HTML과 참조10 assets의 HTTP200 및 byte/SHA를
독립 대조했고 [제품 증거](plans/assets/manual-editor-ui-audit/final-writing-cleanup-evidence.json)에
source·native·build 경계를 기록했다. 원래 탭의 강제 새로고침이나 사용자 IDB 접근은0이다.

상단 선택 요소 작업 `···`/N개 블록 버튼을 제거하고 대상 옆 손잡이 및 본문
Ctrl/⌘+/·ContextMenu·ShiftF10을 사용한다. 셀 구조 작업은 부모 table을 대상으로 한다.
상단 `+`와 본문 `+`는 같은 검색 메뉴를 사용하며 메뉴 본체가 writing bounds 안에
들어간다. 빠른 wheel 뒤 첫 방향키의 활성 항목 노출과 wide→390px 패널 닫기를
native 수락했다. 저장/가져오기/인쇄 실패는13px 오류 band와 복구 동작, 정상 상태는
footer12px로 표시한다. 자세한 실패→수정→수락은 [UI 감사](plans/manual-editor-ui-audit.md)를 따른다.

추가 독립 범위 이동에서 선택된 안내 자체가 A4 head/tail로 갈라졌고 총4개 선택과
한 UndoRedo, Enter 이후 입력 복귀를 수락했다. root는 실제11997B 파일을 decode하고
원35객체의 ID/내용/marks/meta 보존을 대조했다.
[선택 분할 증거](plans/assets/manual-editor-ui-audit/selected-split-range-evidence.json)는
1280×2400에서 두 drag 끝이 보인 조건이며 held-pointer autoscroll/역방향 증거가 아니다.
점검 종료 후 QA44590 서버는 소유자가 종료했고 제품44589는 유지했다.

### 자동 A4 경계 수정과 다음 후보 — 2026-10-07

efef kernel의 실제 PM state에서 strong `ABCDEFGH` 문단을 `ABCD`/`EFGH`로 자동
분할한 뒤 tail0 Backspace는 제목을 `TaskEFGH`로 바꾸고, 실제 planner의 title-sync는
다시 `Task`로 돌려 본문4자를 없앴다. headEnd Delete는 false였다. 사용자 문서는
수정하지 않았으며 모델 재현을 새 native 통과로 표현하지 않는다.

모델(2)가 kernel/필요한 helper/최소 tests의 단독 writer로 수정한다. 동일 논리 문단의
경계 Backspace/Delete는 실제 이전/다음 grapheme을 삭제하고, 서로 다른 본문은 안전한
병합을 사용하며 반복 제목은 본문을 흡수하지 않는다. marks/meta/원ID/selection 및
명령+자동 flow의 한 UndoRedo를 확인한 뒤 UI owner가 격리 memory native를 검증한다.

새 페이지 관리 목차/save-status/블록 속성 후보 JSXdadbe64f/CSS6e0a/canvas90f4는 현 제품과 별개다.
페이지 guard 단계의 JSX3980 이후 저장 상태를 오른쪽 저장 버튼 옆으로 옮겨 다시
동결했고 root도 세 source SHA를 대조했다. 아직 native/제품 수락은 아니다. 자동 tail을
가진 root의 물리 page 이동/복제/삭제가 그룹을 분리한다는 source 감사에 따라, 후속
논리 group API 준비 전 해당 구조 작업을 막는 임시 guard를 추가했다. guard의 source
동결은 native나 wholegroup 기능 수락이 아니다. parent 페이지 UI native→UI owner P1
native를 순서대로 검증하고 한 번 제품 빌드·HTTP 대조한다. P1 kernel3fdb 관련57건과
별도 selection caret137cec 관련28건을 수락했고 최종 UI dadbe64f를 동결해 UI owner에게
QA 재개를 전달했다. 모델·source 검사를 native/제품 반영으로 표시하지 않는다.

사용자가 주소별 디자인 혼재를 확인했다. `/`의 기존 editor와 `/prototype.html` 시험,
`/manual.html` 작성기, `/preview.html`이 각각 다른 entry를 제공한다. manual의 두
`?ui=...` 응답은 실제 HTML/refs가 같으며 query별 UI 분기는 없다. 정식 작성 entry를
`/manual.html` 하나로 통일하고 나머지 ordinary 작성 노출을 정리하는 후속 작업을
배정했다. v1 자료/auth host의 실제 entry 계약을 먼저 확인해 호환 전용 경로를 보존한다.

sidebar 오른쪽6점 drag helper와 논리 블록/page group 명령은 후속 별도 단계다.
cover는 고정하고 manual root+연속 automatic tails를 함께 옮기며, scalar 블록 작업은
원 논리 블록 전체를 대상으로 한다. 실제 OS IME/touch/200%/외부 앱 clipboard/독립
PDF/forced-colors/역방향·held-pointer 경계는 수락하지 않은 상태를 유지한다.
