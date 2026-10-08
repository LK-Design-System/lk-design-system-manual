## 2026-10-08 · 표지 템플릿의 다중 삽입 정책 정정

- 사용자 정정에 따라 표지는 문서당 하나인 객체가 아니라 반복 삽입 가능한 템플릿으로 처리한다. `/표지`는 현재 논리 페이지 family 바로 앞에 새 독립 표지를 삽입하며 기존 표지·본문·ID·내용을 보존한다. 명시적 afterPageId 경계 삽입은 해당 family 뒤를 유지한다. 기존 표지 재사용·누락 역할 보충·맨 앞 강제 이동 정책과 singleton 경고는 폐기했다. 아래의 이전 단일 표지/전방 배치 기록은 역사적 근거이며 현행 요구가 아니다.
- 단일 DTO의 document.cover 호환을 유지하고 복수는 exclusive document.covers 배열로 저장한다. 공통 collection API, 전체 cover 순서·clone·PM projection·codec·Print 렌더·pagination invariant를 연결했다. core focused34개, template/실제 Parent 추출 focused49개 통과. template 최초 실행의 beforePageId 매개변수 누락을 수정한 뒤 같은 focused set을 통과했다. Parent `90e71e5c`, helper `e144b204`, kernel `02f9b15f`, DTO `b5d53e8a`, order `a94629d7`. 근거 `/tmp/lds-multicover-template-20261008/report.json`, `/tmp/lds-table-horizontal-handoff.json`의 multiCoverImplementation. 실제 사용자 탭/PDF/OS 저장 수락은 미실행이다.
- 빈 표지 종이 영역에서 caret가 사라지는 추가 반례는 contentDOM의 자연 높이를 종이 높이로 가정한 이전 fixture가 놓쳤다. outer cover-content만 footer reserve를 뺀 최소 높이로 확장하고 semantic body 측정은 유지했다. 실제 Parent+PM 및 모의 geometry14개 통과, `/tmp/lds-cover-blank-paper-fix-20261008/handoff.json`. 417 좌표는 실제 화면 측정이 아닌 fixture다. navy sectionTitle caret는 public on-surface로 표시하도록 CSS 한 선언을 추가했다. 실제 브라우저 caret 수락은 남는다.
- 표 메뉴의 disabled 항목도 키보드/포인터로 방문해 활성 이유를 확인하도록 개선했다. 실행 차단과 captured target 계약은 유지한다. 실제 callback/public SSR/helper/close-selection focused29개 통과, Controls `acb3eae7`, `/tmp/lds-table-disabled-menu/implementation-handoff.json`. native/보조기술 수락은 미실행이다.
- 사용자 단계 빈 본문 Backspace no-op는 별도 전담에게 실제 PM 반례와 좁은 patch를 준비하도록 배정했다. 위 다중 표지 검증 종료 후 순차 kernel writer로 처리하며 아직 해결 완료로 보지 않는다.

## 2026-10-08 · 기존 표지의 맨 앞 배치와 상단 표시 개선

- `/표지`의 기존 표지 재사용 경로가 후행 위치를 유지해 1페이지에서 실행해도 2페이지 표지로 이동하던 동작을 수정했다. 명시적 구성 명령에서 slash 소모/누락 역할 추가 후 기존 cover와 consecutive continuation family 전체를 맨 앞으로 옮긴다. 내용·ID·ordinary page 순서·확장 정보를 보존하고 한 Undo/Redo로 복원한다. template `eea5ba14`, focused38개 및 syntax 통과, `/tmp/lds-cover-template-front-fix-20261008/report.json`. Parent 변경0/native0.
- 상단 문서 바는 LDS semantic brand surface/on-surface, 편집 툴바는 옅은 중립색으로 적용했다. 제목은 body1-size16px/semibold600을 사용하고 좁은 화면의12px override를 제거했다. 저장/더보기 public Icon 크기만16→20으로 바꾸고32px 클릭 영역·기능·aria를 유지했다. CSS `8b259a50`, Parent `8a8346fd`; public registry/SSR·CSS parse·HTTP 응답 확인, 사용자 화면의 전체 시각 수락은 미실행이다.
- 표 작업 메뉴 종료의 지연 focus는 resultSelection도 고정해 그 사이 selection-only 이동 후 편집기 포커스를 빼앗지 않는다. action의 captured target 허용 계약은 유지한다. Controls `6eb79846`, 실제 Controls/Parent session/PM14개(baseline13 green/1 red) 통과, `/tmp/lds-table-close-focus/implementation-handoff.json`. 실제 native caret 수락0.

## 2026-10-08 · 표지 2페이지를 1페이지 위로 이동

- 앞선 본문2→표지1 fixture는 표지가 이동 출발점인 경우를 놓쳤다. source baseline에서 Outline handle, controller의 implicit cover-fixed, 단일 PM move의 page-only, batch move의 cover-fixed 등4층 차단을 확인했다. 사용자 페이지 재정렬 요구에 따라 표지도 whole-family 단위로 이동하도록 허용했다.
- 명시적 fixed 그룹·읽기 전용·IME·revision 가드와 continuation family 전체 보존, 표지 복제 금지는 유지한다. controller `03e716ff`, Outline `8fca2bcc`, groups `26a3b83f`, actions `1a8c80f4`; Parent/templates 변경0. focused99개 및 JSX/public Core SSR 검사를 확인했다. 표지 source의 실제 Parent→controller→PM 결합은 `/tmp/lds-block-boundary-flow-fix/outline-coupled-candidate.json`의 독립 사례로 인정한다. 최초 owner parent-candidate는 본문3개·표지1개 성공 뒤 old harness의 mixed cover 실패 사례가 있어 파일 전체를 표지 성공으로 확대하지 않는다. `/tmp/lds-cover-source-outline-move-20261008/handoff.json`에 정정을 연결했다.
- 44589 HTTP4모듈의 현재 소스를 확인했다. 사용자 탭은 QA chat에 노출되지 않아 실제 drag 수락은 미실행이다. source baseline/candidate는 임시 경로에서 분리했고 live baseline 교체/새 native 입력0. 원래 자동 tail을 별도 authored page로 분리하는 변경은 하지 않았다.

## 2026-10-08 · 문서 정보 표의 구조 편집 지원

- 사용자 제한 해제 요청에 따라 문서 정보 표도 행·열 추가/복제/삭제와 끝쪽 + 조작을 지원한다. 단순 guard 제거가 아니라 기존 cover layout extension에 full v2 table DTO를 보존하는 metadataTable bridge를 추가했다. 표지 metadata 역할/ID, 기존 scalar label/value 및 확장 정보를 보존하고 남은 바인딩의 내용 변경을 동기화한다. 삭제된 항목을 제거하고 복제 셀은 새 ID와 독립 바인딩으로 처리한다.
- 홀수 항목의 canonical 병합 표는 단일 Undo 안에서 직사각형으로 정규화한다. 일반 외부 병합 제약은 유지한다. 저장·재열기·복사 링크 remap·row/column 크기를 보존하며 ManualPrint는 편집한 grid 구조를 같은 table renderer로 출력한다.
- focused61개 통과, `/tmp/lds-metadata-table-menu-finish/structural-handoff.json`. legacy projection15 green/구분선 기대값2 red는 임시 baseline에서도 동일한 기존 drift로 분리했다. source 불변복사와 exact delta를 인계했고 전체 lease를 반환했다. 사용자 문서/native/PDF 출력 실기0이며 실제 시각 수락으로 확대하지 않는다.

## 2026-10-08 · UI 총괄의 미저장 확인창 계약 보완

- 취소 시 기존 편집 위치의 editor/doc/selection/generation을 검증해 지연 포커스를 복원한다. 이전 library 등 모달은 복원하며 편집기로 포커스를 빼앗지 않는다. 낡은 문서·선택·세대 및 조합/gesture 상태에서 지연 동작을 막는다.
- 다운로드 대체 환경의 확인창 버튼을 파일 내려받기로 표시하고 요청 결과/파일 확인 후 다음 행동을 모달 내부에 안내한다. 요청은 파일 저장 완료로 인정하지 않으며 dirty 유지·자동 이동0 계약을 보존한다.
- saveAndContinue가 다른 editor/generation/pending action으로 바뀐 뒤 낡은 이동을 실행하거나 새 문서를 재저장하지 않도록 최초 맥락을 고정한다. 같은 세대의 늦은 편집 재시도는 유지한다. 실제 Parent/public file-session 집중40개(baseline33 green/7 red) 및 UX 독립8경로 통과. Parent `f31d0182`, `/tmp/lds-unsaved-focus-contract/handoff.json`과 `/tmp/lds-ui-unsaved-final-independent-audit-20261008.json`.
- 사용자 문서/native 입력·빌드0. 실제 OS 파일/다운로드 완료와 Dialog 포커스 수락은 미실행이며 source/model 결과와 구분한다. Parent lease 반환, metadata 구조 편집은 별도 소스 변경 중이다.

## 2026-10-08 · UX 총괄의 표 경계와 문단 병합 수정

- 표의 첫 셀 시작/마지막 셀 끝에서 좌우 방향키를 명시적으로 처리하도록 public command/keymap을 연결했다. 기존 편집 가능한 텍스트 블록으로 이동하며 divider/atom을 건너뛴다. 이동 대상이 없으면 문서를 바꾸지 않고 처리한다. 내부 caret·범위 선택·Shift·IME 보호 및 storedMarks 보존을 검사했다. 임시 baseline 4개 반례에서 current green, horizontal22 + 기존 ArrowDown11 =33개 통과. `/tmp/lds-table-horizontal-handoff.json`.
- 일반 인접 본문을 Backspace/Delete로 합칠 때 뒤 문단의 opaque extension provenance가 유실되는 source 반례를 확인했다. 기존 joinBoundaryBodies/preserveJoinedMetadata 경로를 재사용하는4행 변경으로 수정했다. baseline10개 중 provenance2 red에서 신규14개와 기존 pagination/page-title43개 모두 통과했다. 텍스트·ID·marks·caret·storedMarks·codec·한 Undo/Redo 및 그림/표 barrier를 확인했다. `/tmp/lds-block-boundary-flow-fix/handoff.json`.
- 최종 kernel `18a427f0`, navigation `5daea729`; 직렬 writer lease 반환. 실제 사용자 문서/native 입력0이며, 위 결과는 source/model 수락이다. 현재 화면의 실제 방향키·커서 동작이나 전체 UX 목표 완료를 대신하지 않는다. Parent focus 결합 경로는 별도 읽기 감사로 진행한다.

## 2026-10-08 · UX 총괄의 지속 개선 목표

- 사용자 지시로 UX 총괄에 `편집 UX 반례 발견 → 전담 배정 → 수정 → 검증`을 지속적으로 책임지는 목표를 부여했다. 첫 범위는 표의 좌우/상하 방향키와 경계 이동이며, 이어서 블록 경계 키보드, 빈 영역 caret/focus, 슬래시/IME, 선택·드래그·Undo, 표 메뉴와 저장 이동을 점검한다. 새 반례는 즉시 담당 서브에이전트에 배정하고 한 writer lease로 수정·증거를 연결한다.
- UX thread의 기존 goal `최대한 완성도 있게`가 blocked/미완료라 새 goal 생성이 거절됐고 도구는 resume를 지원하지 않는다. 허위 완료·교체하지 않으며, 새 명시 지시의 실제 작업은 계속한다. 진행 기록은 기존 `/tmp/lds-manual-ux-completion-audit-20261008.md`에 연결한다.
- 해당 UX thread에 30분 heartbeat `lds-manual-ux`를 설정했다. 사용자 문서/native 입력은 새로운 허용 없이 조작하지 않고 source/model과 실제 UI 수락을 구분한다. 변화 없는 감시는 조용히 유지하며 중요한 수정·실패·완료 또는 필요한 사용자 입력만 보고한다.

## 2026-10-08 · 빈 표지 본문 클릭 경로

- 사용자 `시작하기 전에` 아래 클릭에서 caret 소실을 보고했다. 실제 Parent handler의 source counterexample에서 coverBody/coverSectionFrame 배경을 target 가드가 거절하고, 페이지 높이를 채운 구조 wrapper의 bottom을 마지막 콘텐츠 끝으로 삼아 문단 생성 경로에 들어가지 못했다.
- 동일 표지의 구조·페이지·content 배경에서는 마지막 실제 블록 아래, content bounds 안의 클릭만 받아 ensureParagraphAfter로 본문을 재사용/생성한다. 페이지 밖·다른 표지·블록 위·텍스트/컨트롤·활성 표 조작 가드를 유지한다. 문단 생성 Undo와 기존 문단 재사용을 검사했다.
- 추출한 실제 Parent handler + PM 집중 검사11개 통과, Parent `073fa767`, kernel `6fddd2fa` 변경0. `/tmp/lds-cover-background-writing-focused-20261008.log`; 44589 HTTP 응답에서 현재 변환 확인. 실제 사용자 탭의 DOM caret/focus 소실 원인 전체를 확정하거나 native 수락으로 표시하지 않는다. 사용자 문서/키보드 조작0.

## 2026-10-08 · 문서 정보 표의 미지원 작업 메뉴 정리

- 사용자 화면의 행 메뉴가 문서 정보 표에서 지원하지 않는 구조 작업4개와 반복 설명을 노출하고 가로 스크롤을 만들었다. availability의 명시적 hidden capability로 해당 구조 작업만 숨기고 행/열 내용 비우기만 표시한다. 실제 구조 변경 거부 계약은 유지한다.
- 반복 설명은 title/aria-description으로 제공한다. public Core Button content 스타일과 문자열 label로 줄바꿈을 허용하며 메뉴 가로 스크롤을 제거한다. 한 항목 메뉴50px, 일반5항목206px 및 viewport clamp를 유지한다.
- 소스·public Core SSR·PM 동작 검사26개 통과, `/tmp/lds-metadata-table-menu-finish/handoff.json`. metadata 내용 비우기와 Undo 보존, 일반 표 메뉴를 확인했다. 사용자 문서/native 조작0, 실제 화면 시각 수락은 미실행이다.

## 2026-10-08 · Enter가 제목을 만드는 결함과 제목의 슬래시 메뉴

- 사용자 후속 화면에서는 표지 구성 요소가 나타났으나 아래 `/` 입력 줄의 툴바가 `제목 2`이고 메뉴가 없었다. source replay에서 본문 끝 Enter가 schema의 기본 block인 pageTitle을 만들고 identity 정규화가 heading2로 바꾸는 결함을 재현했다. 슬래시 감지는 paragraph/pageLead에만 허용되어 그 제목에서 열리지 않았다.
- 본문·일반 제목의 끝 Enter는 본문을 생성한다. 중간 분할은 텍스트·marks·확장 메타데이터를 보존하고 시작 분할은 빈 본문을 앞에 추가한 뒤 원래 텍스트 시작에 caret을 둔다. 표지 섹션 제목 끝 Enter는 coverBody 본문으로 이어진다. 일반 제목의 슬래시 메뉴를 지원하되 표지/페이지 소유 역할의 제목은 일반 변환에서 보호한다.
- 관련 source/model 및 Parent 검사47개와 syntax 통과. kernel `6fddd2fa`; `/tmp/lds-heading-slash-enter-focused-20261008.log`. 44589에서 수정된 kernel HTTP 응답 확인. 사용자 문서·native 입력0이며 실제 화면 재검증은 미실행이다. 앞선 메뉴 전체 회색은 OS 조합 중일 가능성이 있으나 직접 상태 확인은 불가했고, 조합 보호를 제거하지 않았다.

## 2026-10-08 · 기존 표지의 템플릿 접근 차단 수정

- 사용자 `/표지` 화면에서 기존 표지 때문에 생성이 차단되는 경로를 확인했다. 이전 합성 검수는 표지가 없는 문서의 생성만 확인했으며, 삭제한 요소가 있는 기존 표지의 복구를 확인하지 않았다.
- 기존 표지가 있으면 `표지 구성하기`로 이동하고 없는 로고·제목·문서 정보·구분선·섹션 제목만 추가한다. 기존 내용·ID·확장 메타데이터를 보존한다. 완성된 표지는 내용 변경 없이 제목으로 이동하며, 슬래시 명령은 정확한 입력 범위만 소모한다. 누락 요소 추가와 명령 소모는 한 Undo로 복원한다. 원래 삽입 API의 중복 표지 금지는 유지한다.
- source/model 및 추출한 실제 Parent 메뉴 검사33개 통과. Parent `59a1b07e` / template `7da4267f`; `/tmp/lds-cover-template-existing-fix-20261008/report.json`. 44589 HTTP 응답에서 새 메뉴·명령 연결을 확인했다. 사용자 탭의 직접 DOM 확인은 QA chat에 노출되지 않아 불가했고, 전체 메뉴가 회색인 별도 IME/선택 상태는 확정하지 않았다. native 입력·사용자 문서 변경0이며 이전 f8de native 수락을 이 변경으로 확대하지 않는다.

## 2026-10-08 · 20분 실제 검수와 발견 결함 복구

- 인간의 `키보드 20분간 안쓸테니까 보류된거 재개해` 지시로 단일 QA가 기존 소유 검수 문서에서 실제 조작을 재개했다. 허용 구간14:48:46~15:08:46 KST. 마지막 복사15:07:26.646, 검수 탭5개 정리15:08:13.549로 종료했다. 원44589/기존 사용자파일/개인 저장소 접근·private PM 주입0. 합성 JSON 다운로드1개는 별도로 보존했다. `/tmp/lds-manual-a4-boundary-qa-3_ygynq6/native-window-stop-20261008.json`.
- 표지 템플릿 메뉴를 복구했다. `/표지`의 `표지 만들기`가 기존 페이지를 유지하며 로고·제목·문서정보·구분선·섹션을 일괄 생성한다. `/로고`는 일반 페이지를 자동으로 표지로 바꾸지 않고 독립 그림을 삽입한다. 본문/소개문과 한글 조합 중 읽기 전용 메뉴 표시를 보완했다. 모델23개와 실제 메뉴·삽입·Undo 경로를 확인했다. committed Unicode 입력은 실제 OS IME 조합 수락으로 표현하지 않는다.
- 실제 검수에서 로고 취소 후 포커스가 BODY로 빠지는 결함을 발견했다. 같은 캡처된 슬래시 문맥에만 포커스 복원을 허용하도록 수정했고, 새 후보dd32에서 취소→본문 포커스·커서 복원/추가 클릭 없는 Enter 재열기/즉시 입력을 확인했다.
- 표지 본문의 표 뒤 드롭이 상위 섹션으로 이동하던 결함은 ID 길이로 중첩 영역을 선택하던 계산이 원인이었다. 실제 DOM 중첩을 우선하는 최소 수정 후 최종f8de에서 본문 index2·표 뒤/그림 앞 이동과 Undo를 확인했다. 표 셀 복사는 일반 텍스트의 행·열 정보가 소실되던 부분을 표 선택 전용 TSV로 보완했고, 같은 후보의 실제 Ctrl+C에서 TSV와 기존 HTML2×2 유지가 확인됐다.
- 각 후보 b126/f81/dd32/f8de의 실제 경로를 분리했다. 블록 선택·삭제/Undo, 열·행 resize/Undo, 토글 글자 Backspace, 할일 체크와 입력의 Undo 순서, 빈 제목1·2·3, `---`, 셀 범위 선택/삭제·행열 추가, 목차 일부 이동/추가·표지만 남기기, 메뉴와 JSON 다운로드를 확인했다. 무효 setup/collector 시도는 제외했다. `/tmp/lds-manual-a4-boundary-qa-3_ygynq6/native-quiet-window-finite-result-20261008.json`과 독립 감사 근거를 완료matrix에 연결했다.
- 최종 source 후보f8de의293개 원본·개별 archive 해시는 root 확인에서 불일치0/unresolved0이다. 원래24개 요구와 추가12개를 유지하며 일부 실제 경로만 partial로 인정한다. OS 파일 저장·재열기, PDF, 실제 OS IME, 중간 드롭 안내선, 병합 셀/외부 붙여넣기, 동시 gesture, 분할 표지 family 등은 미검수다. 전체 목표 완료로 표시하지 않는다. 허용 시간이 끝난 뒤에는 새 native 입력을 재개하지 않았다.

## 2026-10-08 · 최신 UI 통합과 여백 포인터 보호

- 최신 coherent source 후보 b1264bd9f216d3b7cecb031e89a73a3e56ae42fdecaf9d0030dc80ab5666fb36은 기존286개와 신규 검사3개를 보존한289개다. root가 원본·개별 archive289개 해시를 비교해 불일치0/unresolved0을 확인했다. `/tmp/lds-manual-visual-fix-verification-20261007/coherent-parent-latest-user-ui-20261008/manifest.json`.
- 전체 목표 continuation으로 소스 작업을 재개했다. 실제 입력·포인터 검수 보류는 최신 인간 지시대로 유지하며, 이전 paused 기록은 해당 시점의 상태다.
- 실제 Parent 여백 선택 fallback이 marquee에서 거부된 touch/pen/nonprimary 입력을 다시 받던 반례를 source callback+실제 PM으로 재현했다. baseline1통과5실패→최종6통과. beginMarginSelection에 기존 marquee의 primary mouse/defaultPrevented 조건을 적용했다. 최종 Parent a438d0445471002f8b82fce184ac3a3f77588bfe19ca4c978c994e30789124be. `/tmp/lds-margin-pointer-finish/handoff.json`, 독립 검토 `/tmp/lds-ui-margin-pointer-independent-audit-20261008.json`.
- 새 문서 메뉴·JSON/PDF 하위 메뉴·간결한 파일 저장 확인창·빈 제목 Backspace·양방향 목차 드래그를 포함한 최신 소스에서 에디터 Vite quick build1회 exit0/380ms/출력37개. `/tmp/lds-manual-latest-integration-build-20261008.log`와 `.json`에 출력 해시를 보존했다. 이전 f7dc build에 최신 변경 수락을 소급하지 않는다. 큰 chunk 경고가 있으며 실제 성능·native 기능 수락 증거가 아니다.
- 원래24개 요구와 추가3개 회귀를 유지하고 최근 명시 요청6개를 별도 추가했다. `/tmp/lds-ui-current-completion-matrix-20261008.json`의 actual 완료 상태는 승격하지 않았다. 입력기·화면 포커스·드래그·실제 파일/PDF 검수는 여전히 미완료다. 사용자 문서/저장소·native 입력·서버 재시작0.

## 2026-10-08 · 이웃 페이지 드래그와 빈 제목 Backspace 수정

- 사용자 요청으로 목차의 1→2 아래 드래그와 2→1 위 드래그 비대칭을 조사했다. 이웃 행의 상반부/하반부를 before/after로 나누면 원래 순서와 같은 슬롯은 무시되어 한 방향만 반응하는 영역이 있었다. 바로 이웃 authored 페이지의 행 전체를 이동 방향의 슬롯으로 처리했다. 먼 행의 before/after, cover anchor, 자기 행과 여백 규칙은 유지한다.
- 실제 Outline controller 검사43개, Parent의 canDragPage→outlineDragChanged→movePage와 실제 PM 모델 연결 검사에서 빈 2페이지 양방향의 상반부·중앙·하반부를 확인했다. 표 셀 집합 선택이 남은 단일 페이지 이동의 선택 복원 누락도 좁게 수정했다. 원시 근거는 `/tmp/lds-outline-downward-finish/`다.
- 빈 일반 제목1/2/3 Backspace가 앞 블록 경계 처리보다 먼저 같은 ID의 본문으로 전환되도록 수정했다. metadata·커서·저장 재열기·앞뒤 블록 보존과 한 번 Undo/Redo, 읽기 전용·IME·stale guard를 포함한 의미 있는22개 모델/keymap 검사가 통과했다. `/tmp/lds-toggle-backspace-finish/empty-heading-after.log`. 기존 baseline의 사용자 turn 중단/cancel은 실패 재현 증거로 사용하지 않는다.
- 실제 키보드·마우스 검수는 사용자의 `야 키보드 못멈출듯 나중에 해` 지시로 계속 보류한다. 이전13:53 입력 격리 확인은 그 후 지시로 철회됐으며 전체 목표는 paused다. 이번 작업은 새로 요청한 좁은 소스 수정과 모델 검사이며 전체 목표의 native 수락이나 완료로 확대하지 않는다. 원44589에서는 HTTP로 최신 드래그 source 제공만 확인했고 사용자 문서·파일·native 입력을 조작하지 않았다.

## 2026-10-08 13:53 KST · 사용자 입력 격리 확인 수신

- UI audit chat에서 인간이 기존 async 질문에 직접 `지금 입력을 멈출 수 있음`이라고 답했다는 trusted 인계를 받았다. 질문ID request_user_input_async/call_3c74fb739ceb41ff9639ee7ca208a57d/0. 미응답/시간 경과를 quiet 확인으로 추정한 것이 아니다.
- 단일 QA에51d의 개별 originalToArchiveMap→기존 public memory route 최신 snapshot 정합→필요한1회 fresh build→현행 tool 승인에 따른 native 검수 재평가를 인계했다. 현재 QA authoritative active turn01a119db-1b9f-7d53-b348-bc2efdfe3fd5를 확인했다.
- 현재 loaded89be를51d 실제 수락으로 소급하지 않는다. 원44589/사용자IDB·파일/newdriver/privatePM 주입은 계속0. native 허용 결과와 실제 증거가 나오기 전 입력/드래그 수락이나 과거 자동승인 제한 해제를 주장하지 않는다.
- 원24+추가3 completion matrix와 실제키/Undo→표→블록드롭/목차→표지/로고→파일/출력 우선순위를 전달했다. 입력 간섭이 재발하면 즉시 중지/기록하며 사용자 확인은 이번 재평가의 새 정보로만 취급한다.

## 2026-10-08 · 현행 후보와 실기 입력 격리 차단 판정

- 최종 release-point 후보 manifest51d3297ef79a9f4f55f6329e86d1f9b11066e7ded9a196edb5b2e9a053e3a3fa의 원본·보관286개를 root가 비교해 mismatch0/unresolved0. `/tmp/lds-release-point-final-root-completion-audit-20261008.json`.
- 완료 matrix의 원래24개 요구를 유지했다. actual 기준21개 unverified/3개 partial이며 새 control-history/guide-client/deferred-restore 회귀도 source passed/native pending이다. 코드·모델·문법·이전 통합 빌드 근거를 actual 수락으로 확대하지 않는다.
- 현재 통합 담당과 단일 실제 QA는 authoritative completed/idle이다. 실제 QA는51d329 source접수만 했으며 nativehold를 유지한다. 살아 있는 static server는 실행 검수 대기 핸들이 아니다.
- 입력 격리 미확인 조건은 최근 연속 goal turn에서도 반복됐다. pointer-only resize 중 요청하지 않은 ㄴ 입력이 나타났고 입력 기원이 불명이다. 확인된 quiet window 없이 typing/editor pointer-down/drag/Undo/실파일/PDF 검수를 재개하지 않는다. 현재 automatic approval 거절 사유는 알 수 없으므로 이를 추정해 설명하지 않는다.
- 지금까지 확정 발견한 source 결함의 수정/좁은검증/인계를 끝냈고 남은 실제 수락을 안전하게 진행할 조건이 없다. 목표 범위를 줄이거나 완료로 바꾸지 않으며 입력 격리 확인을 기다리는 blocked로 기록한다.

## 2026-10-08 · 드롭 포인터의 client 경계 보호

- 안내선은 표시 가능하지만 release pointer가 스크롤바·헤더·viewport 밖에 있어도 이동을 확정하던 반례를 실제 기존 컨트롤러/별도 b365 사본으로 재현했다. 15중10통과5실패. 라이브 baseline 교체0.
- canvas source `0fc3d4f49ba966f97cb697b26331231c5236d519f3331950181672eb112984a8`는 공용 guideGeometry에 현재 finite point의 client half-open 경계를 함께 검사한다. 오른쪽375/아래595는 제외,374.5/594.5는 포함한다. 영역 안 rail x10은 정상이며, 영역 밖 autoscroll 뒤 재진입/동일 gap 표시가 회복되면 정확히 이동1이다. targetAt 계산은 동일하다.
- 현행15/15와 node 문법 검사 통과. root가 raw/report·최종 source/test SHA 일치를 확인했다. `/tmp/lds-picker-visual-finish-20261008/release-point-clip/report.json`. 좁은 circle fixture는 pointY270으로 client 안 전제를 맞추고8px 표시/7px숨김 기대를 보존했다.
- b8a visible-drop 후보와 f7dc build를 역사 epoch로 유지한다. 이번 canvas1파일 delta는 새 source snapshot으로 인계하며 실제 native pointer 수락으로 확대하지 않는다.
- 실기 gate의 입력 간섭은 native pointer-only resize에서 항목→항목ㄴ, keyboard calls0/입력기원불명으로 기록돼 있다. 확인된 quiet window가 없으며 기존 hold를 우회하거나 입력 격리를 추정하지 않는다. 남은 실제 키/IME·선택/drag·OS 파일/PDF 수락은 완료로 주장하지 않는다.

## 2026-10-08 · 안내가 보이지 않는 드롭의 이동 확정 차단

- 앞선 paint-only clipping이 안내선을 숨겨도 같은 gap으로 이동을 확정하던 상태를 최종 UX 계약으로 승인하지 않았다. 기존 9bba 소스의 별도 사본으로 새 계약을 검사해 9중4실패를 재현했다. 라이브 baseline 교체는 하지 않았다.
- canvas drag b36547ce6bf9ef36f2737bb3fcdf8f50c90cdd954bc8c1d3a0f97e7a167d841c는 공용 guideGeometry를 paint/finish에서 사용한다. release의 현재 유효 좌표와 레이아웃을 재측정하며 표시 불가 위치는 이동0/이유 안내, 자동 스크롤로 같은 gap의 안내가 다시 보이면 정확히 이동1이다. targetAt 경로/gap 계산은 바이트 동일하다.
- 새 계약 9/9와 `node --check` 통과. root가 현행 소스·시험 정의·raw/report를 직접 확인하고 두 최종 SHA 일치를 확인했다. 근거 `/tmp/lds-picker-visual-finish-20261008/hidden-drop/report.json`.
- 이전 paint-only5검사와 f7dc 통합 build는 각 역사 epoch로 보존한다. 현재 변경은 canvas1파일이며 다음 별도 source snapshot에 인계한다. 실제 native 드래그/시각·IME·OS 저장/출력 수락은 아직 미완료다.

## 2026-10-08 · 선택·가이드 경계 최종 통합 빌드

- range-cancel 후보 manifest `f7dc46540ee4e7494eee52fb22b9f2670326ec880ca4d50d207f3034fd394d75`의 286개 원본·보관 파일을 root가 직접 해시 비교해 불일치0/unresolved0을 확인했다. 직전 da150 보관본은 변경하지 않았다.
- 변경된 Parent/ResizeControls/canvas guide 및 앞선 control helper imports의 통합 컴파일을 확인하기 위해 에디터 Vite build를 새 `/tmp/lds-manual-final-integration-build-20261008`에 한 번 실행했다. exit0, 292 modules, 262ms. 기존 앱 dist·44589·QA35587·사용자 파일/저장 상태는 변경하지 않았다.
- 출력37파일 SHA와 raw log SHA는 `/tmp/lds-range-cancel-integration-root-audit-20261008.json`에 기록했다. 외부 임시 outDir을 자동 비우지 않는 경고와 큰 minified chunks 경고가 있으며, 이를 런타임 성능 수락으로 표현하지 않는다.
- compilation/source snapshot 범위만 확인했다. 실제 키/IME·포인터/선택·파일 선택/쓰기/재열기·PDF/OS 인쇄 수락은 기존 hold를 유지하며 남아 있다. 이미 거절된 root CUA를 새 driver/route/다른 thread로 우회하지 않는다.

## 2026-10-08 · 표·이동 안내선 경계와 선택 취소 경로 보완

- 빠진 TableResizeControls client clipping을 찾아 실제 measure initializer/exported targets/onPreview callback 반례를 재현했다. 스크롤바 제외 영역, RTL·scaled client bounds, 행/열 안내선 교차 영역, null/disconnected guide clear를 검사해 baseline1pass3fail→4pass0. `/tmp/lds-table-resize-clip-finish/handoff.json`. Parent/kernel/CSS/resize controller 변경0.
- canvas drag의 fixed 안내선과 8px 원형 표시를 client 영역 안에 제한했다. 실제 기존 컨트롤러 반례 baseline2pass3fail→5pass0. paint 밖 소스는 동일하며 target/status/drop order를 변경하지 않았다. `/tmp/lds-picker-visual-finish-20261008/guide-clip-report.json`. 숨겨진 화면 밖 경계의 드롭 피드백은 실제 드래그 UX 수락으로 확대하지 않는다.
- sameDoc 새 조작 중 doubleRAF settleRange가 이전 블록 선택을 덮는 반례를 찾았다. Parent는 매 RAF editor/generation/doc/selection 및 공용 deferredFocusEnabled를 확인하도록 보완했다. 정상 contiguous/sparse 복원은 유지한다.
- 페이지 목록 marquee를 취소할 때 readonly/IME/modal 상태에서는 canSelect guard가 baseline UI 선택 복원을 막는 반례3개를 재현했다. 같은 현재 context의 marquee-cancel만 선택 허용 gate를 건너뛰며 stale 문서/generation 복원은 계속 금지한다.
- 두 Parent guard의 추출 실제 callback + realPM/RAF/public controller 검사22/22 통과. `/tmp/lds-block-range-deferred-finish/focused-final.log`. durable test와 최종 핀 인계 뒤 새3delta 통합 후보로 분리한다. 실제 native 입력/포인터·파일/PDF gate는 아직 미수락이다.

## 2026-10-08 · 최종 속성 이력 소스 후보와 콜아웃 회귀

- `coherent-parent-attr-history-20261008/manifest.json` SHA da1501b36f67b5fbb744bda0728e361b8404d443bf1742dd44e38793819aa9af의 286개 원본·아카이브를 root가 직접 해시 비교해 불일치0/unresolved0. kernel fcfb83·todo cd6647·toggle b3ce43을 포함하며 source-only/nativeAcceptance false다. 독립 기록 `/tmp/lds-attr-history-candidate-root-audit-20261008.json`.
- 콜아웃은 본문 입력→종류 변경과 종류 변경→본문 시작 입력 두 방향의 PM history가 통과했다. default PM timestamps, Undo1은 마지막 동작만 취소/Undo2 원문, 단일 속성 transaction, 제목[]·ID·서식·선택·opaque fields·파일 codec 보존을 root가 시험 정의에서 확인했다. `apps/editor/tests/redesign-callout-tone-history.test.mjs` 및 `/tmp/lds-picker-visual-finish-20261008/callout-tone-history-report.json`.
- 새 콜아웃 시험은 제품 소스 변경 없이 검사만 추가했다. Parent 속성 UI 실행, 실제 키보드/IME/Undo·OS 파일 저장·PDF 출력 전체 수락은 남아 있다.

## 2026-10-08 · 두 번째 경계선과 좁은 화면 목록 겹침 최종 대조

- QA formal supplement `b63364535336f8771af62bee612b4fdcb003251a1b608083fe8d2fd8aebfd602`를 읽고 narrow sidebar screenshot을 직접 열람했다. 89be candidate/c558 loaded/ecbce CSS epoch에 한정한다.
- 두 번째 경계선의 실제 픽셀 폭은 1280 화면 main client1069px, 390 화면 main client375px 전체다. 목록이 열리면 그 뒤 선이 가려지고 노출된 오른쪽165px만 이어진다. 공개 DOM hit는 목록 내부에서 NAV, 노출된 영역에서 PM으로 구분된다.
- root가 narrow 전후 HTML/IDs/선택을 직접 비교해 동일, formal checks 전부true/console빈배열/owned tabs2닫힘/viewport reset1을 확인했다. 독립 근거 `/tmp/lds-divider-supplement-root-audit-20261008.json`.
- native 편집·블록 선택·리사이즈·IME·실파일 gate는 계속 미수락이다. 이후 control/client-clip/history 소스 후보의 실제 화면 검수로 확대하지 않는다.

## 2026-10-08 · 체크 후 입력의 Undo 경계 수정

- 실제 NodeView callback + PM history에서 체크 후 즉시 본문 시작 입력 시 Undo1이 체크까지 취소하는 반례를 재현했다. 반대 방향의 기존 통과 증거로 이 순서를 수락하지 않았다. baseline 3중 todo1실패/토글 제목·본문2통과.
- `updateManualObject`의 정확한 todo.checked boolean 단독 변경/remove0/type·content·id·marks 불변에만 metadata AttrStep을 적용했다. validation과 helper closeHistory는 유지하며 토글 및 일반 속성 변경은 기존 경로를 유지한다.
- 현재 좁은 control/양방향/repeated/AttrStep 회귀 56/56, 직접 영향 일반 속성 회귀 7/7. 실행 로그 `/tmp/lds-toggle-backspace-finish/control-attrstep-focused-after.log`, `control-attrstep-generic-regression.log`. source-pins.sha256 7개 현재 일치 확인. 이전 후보 검사와 합산하지 않는다.
- 실제 브라우저 입력·한글 IME·Undo 수락은 수행하지 않았다. 이전 immutable 후보를 보존하고 새 source delta의 통합 후보는 별도 관리한다.

## 2026-10-08 · 콜아웃 종류와 제목 계약 대조

- 현행 `ManualObjectProperties.jsx`의 안내/완료/주의/경고/참고 5종은 속성의 콜아웃 종류에서 변경한다. 기본 삽입은 signal 하나이며 종류별 삽입 행을 추가하지 않았다.
- 설치된 LDS Core 0.4.3 runtime은 offline을 neutral 색상과 circle-info로 표현하므로 참고의 현재 표현은 적합하다. negative는 위험/금지/중대한 문제, cautionary는 일반적인 주의에 해당한다.
- 같은 설치본의 공개 Callout.d.ts에는 offline이 없고 navy가 있다. runtime 지원을 타입 계약 정합 증거로 확대하지 않는다. sibling Core 수정은 하지 않았다. public dist runtime/type 대조는 읽기 전용이며 browser/test/build 실행 0이다.
- `docs/document-format.md`의 compact 필수 title와 v2 선택형 title를 구분하는 설명을 추가했다. 작성 기준의 짧은 v2 콜아웃은 제목 없이 허용하고 긴 안내는 제목을 권장하도록 명확히 했다. 문서 변경으로 실제 속성 변경/제목 입력 수락을 주장하지 않는다.

# Manual 에디터 사용성 및 화면 재점검

### 2026-10-08 · 메뉴 후속 실제 검수 및 구분선 제스처 결함 수리

- Copy/menu 후보 `d0dcc5c33bbb6ea7462ffcfd43ca12dc2f6db96a993bfd67360cf67d34090156`의 282개 current/archive SHA 불일치0을 root가 확인했다. sole QA의 `/tmp/lds-manual-a4-boundary-qa-3_ygynq6/copy-menu-readonly-result.json`은 실제 Parent 21항목 원순서·4그룹 각1회·콜아웃 종류변경 설명·일반페이지 표지5role 전환 설명을 수용한다. loaded snapshot SHA `7a4322dea451a294d7de525e850e3e0de2884dd7d860f4455395b1beba654449` 일치 확인. 실제 변환/선택/키 입력은0이며 compact fixture는 enabled4개뿐이라 disabled 이유 실제 검수·속성 panel 실제 검수는 아직 미완료다.
- `manual-drag-layout.mjs` 핸들의 콜아웃 계열명만 안내→콜아웃으로 맞췄다. SHA `76415469149c7c0a2bb93a335ee952e8d98943ca166415048a7ebdb4e8f0f186`, `/tmp/lds-callout-label-finish/verification.json`: 역치환 원본 bytes 일치, signal 종류명 안내 유지. 위 copy/menu 화면 후보 이후 단일 문구 delta다.
- 구분선은 모델 독립 ID가 이미 있었으나 1/2px 선 위에서만 핸들을 취득했다. 전담이 screen-only 24px hit band·선 중심 occlusion·인접 실제 행 우선 및 current ID NodeSelection 경로를 보완했다. root의 추가 반례 요청에서 다른 interaction 중 직접 mousedown이 dispatch1 하는 결함을 재현했다. 공용 `manualTableSelectionGestureBlocked`를 재사용하고 차단 이벤트를 preventDefault/stopEvent로 소비해 기본 PM 선택도 막았다. `/tmp/lds-divider-interaction-20261008/gesture-handoff.json`, `gesture-before.log`, `gesture-final-9.log`: 실제 Parent 공용 guard 10세션을 포함한 9/9. 초기 cover model8/controller1은 이전 helper epoch 증거이며 현행9에 합산하지 않는다. 실제 DOM pseudo retargeting·인접본문 click·native 이동삭제Undo는 미완료로 유지한다.

### 2026-10-08 · 최신 통합 실제 화면 검수와 메뉴 문구 수리

- `coherent-parent-readonly-result.json`의 기존 공개 memory Parent route를 단일 QA가 1280×720/390×844에서 실제 관찰했다. `/tmp/lds-manual-a4-boundary-qa-3_ygynq6/`의 header/menu JPEG4장을 root도 직접 확인했다. loaded snapshot SHA `e4fc265f0cab197eaf44e60b20a2353ae1468c35c08a2363569e86b9649ac238` 일치. 이 epoch에서 투명 저장 아이콘, 제목·32px actions 겹침0, A4 지오메트리, 메뉴창 파란 outline0·활성항목 회색을 수용한다. 390px에서 A4는 내부 가로스크롤로 원래 폭을 유지한다. 실제 선택 블록0이므로 블록 강조 유지·키 입력·드래그·파일 저장 완료로 확대하지 않는다.
- 실제 메뉴 사진에서 기본 블록 그룹 헤더가 교차 반복되는 문제를 발견했다. 최소안으로 pageTitle 표시 group만 기본 블록으로 바꾸고 catalog ID 순서는 보존했다. 실제 Parent가 page 항목을 제외하는 21항목에서는 기본 블록→미디어→매뉴얼→표지 각1회다. catalog `a127552be244943bdf05964f03ccbd73fe1a20a3ca47f65bdfb74ab05d52c203`, Menu `c658aae9d299f019fbe518b8f4db6eb86aac4122fb1da01cd08db19a86b9c292`; root가 현재 SHA를 확인했다. 기존20 test, 검색순위460사례, Enter IDdispatch22, 실제 Core SSR 범위를 검증했다. `/tmp/lds-picker-visual-finish-20261008/menu-group-copy-check.json`. 중간 bucket정렬안은 폐기됐으며 최종 항목 순서는 유지된다.
- 콜아웃 계열과 기본 안내 종류를 구분하는 명칭·설명, 공식 LK Robotics 로고 명칭, compact disabled 이유의 title/aria-description을 개선했다. Parent·Properties의 콜아웃 종류와 일반 이미지 최소 공간 문구도 별도 단일 writer가 수리했다. 일반 페이지에서 최초 표지 요소 추가의 전환 효과 설명은 실제 Parent 상태별 검증 중이다. 이 새 문구/menu delta는 위 기존282 화면 epoch에 소급하지 않고 다음 후보의 실제 화면에서 확인한다.

### 2026-10-08 · 빈 토글 Backspace 완료 및 최신 통합 검수 후보

- 실제 키바인딩 검증 95/95: 빈 제목 시작에서 Backspace를 누르면 내용이 없는 토글은 동일 ID 일반 문단으로 전환하며, 의미있는 본문이나 pagination provenance가 있으면 첫 입력에서 전체 토글을 선택해 내용을 보존한다. 단일 transaction/Undo·Redo, 중첩·접힘·펼침, 파일 재열기·opaque metadata 보존을 검사했다. kernel `482014ca8956fb43dd3108417569110dde141b539889f3a109fbc013254fbf8d`, helper `4c66a2f2338f0635ed57ba60b6f307a9ffade32a47cfd6111273ec4d241238a0`. `/tmp/lds-toggle-backspace-finish/raw-focused-empty-boundary.log` 및 `empty-boundary-source-pins.sha256`의 현재 파일 일치를 root가 확인했다. 실제 브라우저 키 입력 수락으로 확대하지 않는다.
- 기존 빈 quote 키바인딩 테스트 실패는 mock EditorView의 dom/ownerDocument/props 누락이었다. 해당 fixture만 보완해 21/22 → 22/22, 기존 assertion·제품 코드 변경0. `/tmp/lds-toggle-backspace-finish/quote-fixture-{baseline,after}.log`.
- 최신 통합 후보 `/tmp/lds-manual-visual-fix-verification-20261007/coherent-parent-empty-toggle-20261008/manifest.json` SHA `2f1b11b92577f94345518fdd6b3a66b24027b876be1f33ecf08add2ad6a32ecc`: root가 282개 원본·보관 파일의 SHA를 각각 확인해 불일치0, 공식 SVG12·누락 import0을 확인했다. 이는 소스 사본 정합성 증거다. npm entry inventory를 전체 npm 의존 closure로 표현하지 않는다. 단일 QA가 이 후보의 실제 화면 검수를 진행한다.
- 공개 로고 선택창 단독 실제 화면은 1280px/390px에서 12종 positive image rect, 흰3종 남색 배경, 선택 색상 구분, 가로 넘침0을 확인했다. `/tmp/lds-manual-a4-boundary-qa-3_ygynq6/brand-picker-fixed-readonly-result.json`, loaded snapshot SHA `ee5a506f951ff39ee9bb7e00ddfd1a6cc49aeb9827a8ab9ed3544ce155dc6c87`. Parent modal 삽입·교체·키보드·드래그·PDF 완료 증거와 구분한다. 전체 목표는 미완료다.

### 2026-10-08 · 전담 실행으로 Parent 로고 연결 및 흰 로고 표시 반영

- Parent `fe76bfb688ee0d3c6c75bc1217c3f3d79fbd6bb746a59c178e158c6566406f68`, catalog `ed298df4f079c01d903876842e625092acb2b549fa34f4e9bd3a9d63d631c22a`: 표지5role 실제 메뉴/router,12종 선택창, 기존로고변경, pinned selection/stale 및 gesture 배타 조건을 연결했다. `/tmp/lds-parent-logo-router-root-audit-20261008.json`: actual extracted Parent router+PM pass6/fail0, 실행 전후55 source pins 동일. Raw는 spec reporter이며 producer expected raw hash가 없으므로 root observed SHA만 기록했다. Outline10/catalog28은 별도 gate/epoch로 보존한다.
- 흰3종은 finite asset key로만 navy surface를 표시한다. helper `c95c28...`, Print `5affcbd9...`, CSS `200ed4f6...`, kernel `93382d075930deb82b77875448466fdfa3c306a7f50ac54ba054b6c37cfea37d`. Print SSR27 및 exported Editor spec48 검증으로 DTO/src 보존·기존9종/unknown 무변경을 확인했다. `/tmp/lds-white-logo-render-evidence-20261008.json`, `/tmp/lds-white-logo-editor-evidence-20261008.json`. kernel white epoch는 helper import+2속성spread만 추가했고 before/after snapshot이 보존된다. 이후 모델의 continuation 변경으로 현재 kernel SHA가 b59ecfb0…으로 진행됐으므로 93382d07 spec48을 최신 전체 kernel green으로 소급하지 않는다.
- Vite44589의 Parent/catalog/picker/helper 응답200 text/javascript를 확인했으며 사용자원본문서/native/storage 조작0이다. 실제 브라우저 이미지/선택commit/PDF 검수와 긴 표지 continuation은 아직 완료 증거가 없다.


### 2026-10-08 · 준비된 Parent callback10 실제 실행 및 실패 원인

- root가 준비된 `/dev/shm/lds-outline-parent-focused-20261008.mjs`를 1회 실행했다. `/tmp/lds-outline-parent-root-execution-20261008-d0jhkxa8/manifest.json`: extracted 실제 Parent callbacks + 실제 PM에서 기능10개/pass9/fail1, dependency28개 전후 동일. 브라우저/native/storage0, Parent JSX는 문법 compile만. 테스트 준비만으로 완료 처리하지 않았고 현재 source700bdd/kernelb995로 실행했다.
- 실패8 structural reconciliation은 raw tr.delete에 manualExplicitDelete 표시가 없어 kernel pageProtection이 top-page 삭제 자체를 거부하는 조건이다. 원래 raw를 보존하고 승인된 구조 삭제를 나타내는 fixture로 해당1만 진단/재검증하도록 Parent 단일 writer에 전달했다. reconcile 제품 결함으로 판정하지 않는다.


### 2026-10-08 · cover-only 소비자2 및 장문 표지 출력 설계 반례

- `/tmp/lds-manual-cover-only-consumers-root-audit-20261008.json`: manifest `6a1e05785ff95293835dba3a453cd6e04656af2854a27800ca4784eeb69c7d72`, 기능 subtest2/pass2/fail0, dependency92개 전후 동일, raw hash 불일치0. beforeFirstPage가 첫 실제 cover surface 앞에 삽입하고, 마지막 body batch 삭제 후 cover-only와 마지막 surface 보호가 file/copy/Undo 범위로 검증됐다. native0이다.
- 초기 소비자2 실패는 복사 DTO의 virtual cover role alias가 첫 PM projection에서 정규화되는 기존 계약을 byte-exact로 과도하게 검사한 fixture 때문이며 보관된다. 원본 reopen exact/복사 실제 IDs 독립/정규화 후 reopen exact 검사로 수리했다.
- paginated cover 변환은 아직 미완료. 현재 pagination transaction의 cover 불변 guard와 Print의 cover 단일 ManualPage 렌더/A4 overflow gate 때문에, tail을 하나의 coverBody로 합치기만 하면 장문 출력이 실패한다. 이 구체 source 반례를 모델 담당에게 전달하고 continuation 흐름·원본 ID/opaque metadata 보존·Undo topology를 최종지원 설계에 요구했다.


### 2026-10-08 · 표지 전용 문서 일괄 삭제 정책 완료 증거

- batch helper `b2ce8364ea540181db1a8d8dfe286c40ddcb52658baf5796e8904969ea6625ce`는 남은 kind page 존재 대신 전체 container 수를 검사한다. cover+본문 family 삭제는 cover-only를 허용하고 마지막 cover 또는 모든 group 삭제는 last-item으로 거부한다. Parent의 last-item 문구 매핑은 현재 source에 이미 존재한다.
- `/tmp/lds-manual-page-group-cover-only-root-audit-20261008.json`: 실제 기능 사례4/pass4/fail0, 보관 raw 해시 불일치0, 의존25개 전후 동일. body root+tails 삭제, 마지막 cover 거부, cover 삭제 후 body 보존, sparse body 삭제/CellSelection fallback, UndoRedo/file codec 범위를 확인했다. native/브라우저 수락0; 이전 batch12는 다른 정책 epoch다.


### 2026-10-08 · 표지 명령 전체 12개 확인 및 TAP 집계 정정

- `/tmp/lds-manual-cover-command12-root-audit-20261008.json`: manifest `d8413f422db05e654b80b6dd52348cc9090d6cbb4b257247362225f25d3cf868`, 실제 기능 subtest 12개/pass12/fail0, 89개 dependency 전후 동일, raw hash 불일치 0. caption caret의 ID 없는 현재 페이지 해석과 foreign-host guard를 포함한다. native/UI는 0이다.
- 이전 92w3ien7 repair의 TAP pass6은 기능 사례3개와 매칭 없는 파일 wrapper3개를 합친 집계였다. 기존 root JSON에 actualFunctionCases3/emptyFileWrapperPass3을 명시해 정정했다. 기능 6개 통과로 표현하지 않는다.
- 검수 담당은 기존 실제 QA 계획14에 셀range/resize/icon-firstline/list-Tab/divider-inputrule/leading-page-plus/cover-slash-role 7개를 추가해 21개로 보강했다. 전부 unverified 계획이며 완료 증거가 아니다.


### 2026-10-08 · 표지 대상 정합성 repair 및 남은 소비자 분담

- 모델의 explicit page와 실제 선택 대상의 정합성 강화 후 kernel `b995f2f49303e55f4c93792e6d54491b45453f5becbdfd00d970cb7ae4c2da09`. `/tmp/lds-manual-cover-insert-repair-root-audit-20261008.json`: repair 6개 실제 통과, raw hash/pass/fail 불일치 0, 89개 dependency 전후 동일. 이전 32개는 이전 epoch 증거이며 최신 32개 일괄 green으로 합치지 않는다.
- batch cover-only 마지막 본문 삭제 제한은 기존 batch helper 담당에게 독립 수정·focused PM 검증을 지시했다. 모델 담당은 templates beforeFirstPage 및 cover/pagination, 통합 담당은 Parent 연결을 계속 소유한다. 실행 시 kernel freeze를 조율하고 단일 writer 경계를 유지한다.


### 2026-10-08 · 표지 구성 요소 실제 모델 32개 실행 확인

- `/tmp/lds-manual-cover-insert-root-audit-20261008.json`: manifest `524f3aa549263bb7f18d89c90c8daa1cc011b88984e8638b46fb1a96ffc7c4a9`, raw stdout/stderr 해시 및 pass/fail 일치, dependency 89개 전후 tuple 동일. pure factory 18개, 실제 PM command 11개, 변경된 title policy 3개 통과. native/UI 실행은 0이다.
- 기존 페이지 ID/물리 순서/본문 IDs·marks·extensions 유지 전환, 공식 로고 12종과 폭 정책/file/copy, 역할별 삭제·복원 및 1 UndoRedo, 취소/stale/readonly/IME 무변경, 표지 제목 삭제·교체·외부 이동의 역할 해제에 대한 모델 증거다.
- cover-only 테스트는 file/copy/order/groups/insertManualPageAfter/deleteManualObject 범위다. batch deletion과 beforeFirstPage template은 아직 이전 page-only 조건이 남아 있어 완료로 인정하지 않는다. paginated conversion은 임시 비활성 상태로 전체 목표의 미완료 항목이다. 통합 담당에 실제 모델 로드 blocker 해소와 Parent callback 진행 가능 근거를 전달했다.


### 2026-10-08 · 공식 로고 선택 UI 증거 및 메타데이터 기본값 확인

- `/tmp/lds-manual-brand-picker-root-audit-20261008.json`: 보관 artifact 및 현재 소스/SVG 해시 불일치 0, 실행 전후 9개 소스 핀 동일. 실제 Core SSR에서 버튼/이미지 12개와 선택 콜백 12개, 비활성 실행 방지 2개 통과. URL import는 stub이므로 실제 이미지 로드·픽셀·부모 화면 연결·native 입력 완료 증거로 쓰지 않는다. stderr에는 기존 Core sideEffects 설정의 ignored-bare-import 경고 3개가 있으며 실행 실패는 아니다.
- 현재 `manual-cover-elements.mjs`는 문서 버전/작성일/적용 기기/적용 환경의 canonical 라벨 4개와 충돌을 피하는 entry ID를 생성한다. 이전 빈 metadata grid 품질 문제는 소스에서 해소됐다. 요소 실행/Undo/reopen 및 cover-only 소비자 검증은 모델 담당의 새 epoch 증거가 필요하다.


missing factory module은 실제53줄 DTO factory 저장으로 ENOENT가 해소됐다.
5role projection binding과 최소cover restore/omission 조합이 있으며 stub가 아니다.
root 재읽기에서 metadata role은 entries=[]라빈4cell1row만생성하는 품질gap을 확인했다.
기존canonical cover template의 문서버전/작성일/적용기기/적용환경 label4개를 해당role만
삽입할 때 재사용하고 values빈입력/uniqueentryID를 두도록 factory owner에 요청했다.
다른role자동생성·완성template복원은 하지 않는다. 실제kernel/factory focused검수는pending.

표지 커널 capability/execute 구현이 저장됐고 purefactory는 서브에이전트로 분담됐다.
root가 current importdependency 반례를 찾았다: kernel20이 manual-cover-elements.mjs를
참조하지만 파일이 ENOENT였다. live Vite HMR importresolve 실패가능하므로 importer를
factory보다 먼저 publish하지 않게 owner에 즉시 조율했다. 실제유효factory를우선저장
또는 ownerepoch를stagedtmp에두고 dependencyready뒤원자반영; fakeexport/stub로완료
대체0/광범위reset0/원사용자reload·서버restart0. source쓰기/브라우저0 읽기 근거다.
missingmodule 상태의 Parent 집중실행은 먼저로드가능을복구하기전불필요하다고 인계했다.

Parent에 controlled outline 선택 통합이 저장됐다(currentd1af9418 source읽기).
outlineSelection ref/context·marquee session·doctransaction reconcile·pinned menu sourceIds·
batchmove 및 Outline supportsBatchMove props가 실제 연결됐다. helper11/batch12증거만으로
현재Parent/native완료는 주장하지 않는다. stale/동시편집/결과selection seam 읽기 감사를
배정하고 owner에 focused callback 검증을 요청했다. last-page 사용자설명은 '마지막본문'
가정이라 cover-only최소문서 정책 변경에맞춰 새reason문구를갱신해야 한다.

공통rail pagecontext 보완3actual를 root가 raw3pass/0fail·artifactSHA와
dependency전후동일로 확인했다. helpere6f47 epoch의 pagecontent304/padding30/
callout334/text386 outer/child 공통rail 및 clip/cover 맥락이 범위다.
/tmp/lds-manual-rail-page-context-root-audit-20261008.json. firstfix6은 이전epoch로
보존하며 새source6재실행으로 합산하지 않는다. nativehoverpixels0다.
Divider zeroheight 반례는17d321 CSS에 screen-only8px paintband로 보완됐다.
기존layeralpha/ancestor중복억제/Print숨김과 documentheight·margin 유지로 source확인,
실제paint는 pending. /tmp/lds-selected-divider-checks.json.

핸들 firstfix standalone6 실행을 root가 raw6pass/0fail·artifactSHA와
dependency before/after 동일로 확인했다. 파일명 stdout.tap이지만 실제 spec reporter
출력이므로 rawcounts는 ℹ pass/fail에서 대조했다. firstfix1d248 source/fakeDOM+실제helper
범위만이며 pagepadding 공통열 추가맥락과 actualnative는 미수락으로 남긴다.
/tmp/lds-manual-rail-callout-root-audit-20261008.json. 추가수정 epoch로 소급하지 않는다.

Geometry helper가 callout/quote inner slot 대신 outer parent edge를 쓰도록 수정됐다.
Root 읽기에서 실제 page content padding 경로를 추가로 지적했다: rootcallout rail은
pagecontent rect.left, childparagraph rail은 callout rect.left라 bodyinset만큼 X가 이동할
수 있다. 새 standalone callout fixture는 page parent/padding이 없어 이계약을 못검증한다.
pageleft304/callout334/text386 맥락에서 outer/child rail equality와 cover동등 경로를
집중 확인하도록 chief에 요청했다. semantic outsidefallback을 유지하며 page/cover
commonrail까지 탐색하는 방식이나 동등정렬이 필요하고 step독립rail은 보존한다.
사용자 이전 줄마다 횡위치 차이 및 latest 공통열 약속을 유지한다. actualpixels0.

선택 overlay 새 source 읽기 감사에서 divider 예외를 찾았다. 일반HR은 border-top1px,
표지HR은2px이며 빈 padding-box 높이0다. 공통 ::after inset0 layer도높이0이고 outline을
제거하므로 구분선 선택 표시가 없다. 문서height/margin 변경 없이 별도 absolute
선택 band를 주도록 chief/CSS owner에 배정했다. e2db58b4 읽기전후 동일,
actualpaint0. semanticbase/dualclass/nested·placeholder/footer·Print에서 추가확정
반례0을 actualUI수락으로 올리지 않는다.

최신 선택 overlay 코드가 반영돼 root가 읽기 확인했다. generic selected background/
radius3와 큰 ring·shadow를 제거하고 기존 semantic surface/text 위에 pointerless
12% primary ::after layer를 추가했다. dualclass는 같은 layer, 중첩 선택은 하위layer
content:none으로 중복 합성을 막고 page/cover/tableCell 제외, Print layer0다.
기존 placeholder::before와 footer별selector의 직접 충돌은 읽기상 없다.
/tmp/lds-manual-selection-overlay-root-source-audit-20261008.json에 currentSHA/한정범위를
기록했다. Notion 정확RGBA를 공식값으로 주장하지 않으며 actualselected pixel/native
수락은 아직 없다. geometryhelper callout infoicon 겹침 수정은 별도 진행 중이다.

사용자 callout 핸들 겹침 직접 지적(clipboard-2627f3ca)을 geometry owner에 배정했다.
root source 확인으로 getManualRailLeft가 callout/quote의 inner PM content slot left를
반환하는 원인을 찾았다. bodytext 열에 rail이 붙어 draggrip이 infoicon 열을 침범한다.
outer callout/quote left 기준으로 +/grip pair 전체를 block밖에 놓고 commonrail,
step예외·각child block ID·24px hit/gap4를 보존하도록 chief에 좁은수정을 요청했다.
원44589/native 조작권한이나 Core변경은 추가하지 않는다.

Cover-only 소비 감사는 확정2seam을 찾았다. batchdelete의 remaining kindpage-only
조건은 표지만남기는 본문삭제를 거절하므로 cover|page 최소1 조건으로 변경해야 한다.
beforeFirstPage templatehelper는 일반page 없으면 leading+를 거절하므로 coverfallback
삽입기준이 필요하다. 전체빈문서 삭제는 계속거절한다. current435b/a99 stable 읽기,
source수정/실행0이며 chief에 새epochcases를요청했다. priorbatch12green의 scope를
coveronly변경epoch로 소급하지 않는다. store/file·ordered·Print·pagination에서 추가
확정pages0소비반례는 찾지 못했지만 actualcoverage수락으로 확대하지 않는다.

페이지 배치 helper actual12를 root가 독립 대조해 raw12pass/0fail,
localdependency23 before/after 동일 및 rawlog·manifest의 파일SHA 일치를 확인했다.
helper435b9fce/test2caa8133/kernel8387 epoch다. 미선택d를 선택범위 사이로 이동한 뒤
블록 삭제에서도 d의 제목/본문/marks/meta를 보존하는 regression이 포함됐다.
/tmp/lds-manual-page-group-actions-root-audit-20261008.json. PM model/selection/history/
codec 범위이며 Parent UI/actual Shiftclick·drag는 미수락이다. Parent9+repair1/NodeView1
및 batch12 gate가 끝나 model kernel HOLD를 root총괄이 해제하고 coverinsert 구현을
명시 재개했다. 추가 ACK 대기로 진행을 멈추지 않도록 chief/model에 동일 인계했다.

표지 개별 삽입 모델 정책을 확정했다. cover가없는 현재manualpage를 sameID/
samephysicalposition의 최소cover로 변환하고 원본문 IDs/순서/marks/unknownext를 보존한다.
선택 역할 외는 omitted로 유지하며 로고 finitevariant 선택 전/취소 시 변환0다.
유일page 변환 후 cover-only pages=[]를 지원하도록 v2 validator와 PM 최소문서 조건을
cover|page 최소1로 맞춘다. filecopy/reopen/ordered/outline/add/delete 마지막container
소비를 집중 확인하도록 owner에 배정했다. covertitle 삭제도 omission으로 허용해
전항목 블록화 요구를 충족한다. 기존 역할 overwrite나 중복 cover는 허용하지 않는다.
paginatedpage 초기disabled는 임시 단계이며 최종scope를 축소하지 않는다. root/tails
본문 손실 없이 조합하는 후속지원 계획과 구현이 필요하다. kernel resume는 batchgate
종료와 조율하며 root는 코드쓰기0이다.

Parent table actual gate 근거를 root가 raw/각372 tuple·executedscriptSHA로 대조했다.
최초10 중9pass/rowanchor expectation1fail, 해당fixture a01→a00/a02만 고쳐 1casepass다.
source d7f672 동일이며 single10green 실행으로 소급하지 않는다. 근거
/tmp/lds-manual-table-parent-root-audit-20261008.json. Native/UI actualclick는 별도 미완료.

Batch source의 선택확장 반례 수정 방향을 root가 재읽기 확인했다. 기존 subset 검사는
next.ids.length===wanted.length와 ID포함을 함께 검사하며 불일치 시 ids:wanted를
Selection.fromJSON에 명시한다. ManualBlockSelection.fromJSON의 explicit IDs는
anchor/head 대신 explicitSelectionParts를 사용해 사이에 이동한 미선택 블록을 제외한다.
실제 반례 regression/raw 실행은 아직 읽지 않았으므로 source방향만 확인했고
chief에 좁은 actualPM 검수를 요청했다. Native Parent batch integration은 미완료다.

독립 읽기 감사에서 batch page action 선택 복원 반례를 찾았다(helper85f7c591 stable).
restoreSelection의 old.ids.every(next.ids.includes)는 subset 검사여서 선택 확장을 허용한다.
[A,B,C]의 B-body→C-body를 연속 선택한 뒤 A를 C 앞 이동해 [B,A,C]로 만들면,
anchor/head JSON 복원에 미선택 A-body도 들어간다. 다음 Delete로 A까지 지울 위험이 있다.
chief/batch solewriter에 기존 IDs의 정확한 sparse복원과 actualPM regression을 요청했다.
단순 Selection.near fallback도 원래 선택 보존을 충족하지 않는다. root 실행/쓰기0.
그 외 tailclosure/cover/lastbody/copyIDlink/transaction 추가확정반례0은 완료 증거가 아니다.
모델 owner가 kernel8387 동결/HOLD를 명시해 Parent 집중gate 재개를 승인했다.

--- final 집중 actual7을 root가 독립 대조했다. kernel8387dd5b,
manifest176d00ac, dependency83 before/after 동일, stdout/stderr SHA 일치,
raw7pass/0fail. 직접 undoInputRule caret도 최종 plugin 보정으로 포함했다.
Immediate1dispatch·원IDmetadata/neighbors·Mod-z/Redo·Backspace·legacyspace·readonly/
IME/stale/range/trailing/code/link/field/cell·schema nested·기존heading/list가 범위다.
/tmp/lds-manual-divider-inputrule-root-audit-20261008.json. 실제 native typing0.
chief에 model finalfreeze 승인과 합의 후 Parent10+NodeView1 집중gate를 진행해
표지 insert kernel 쓰기를 기다리는 순차 병목을 해제하도록 인계했다.

사용자 최신 선택 표시 요구는 '노션이랑 똑같이'다. root가 직전에 제안한 외곽
primary ring 위주 디자인을 폐기하고 원래 semantic surface/text 위 반투명 selection
layer로 맞추도록 chief에 정정했다. blanket background replacement로 남색 제목이
옅어지고 흰 글자가 흐려지는 원인은 CSS37/126이며 border-radius3도 원래radius를
덮을 수 있다. 표면 배경을 transparent로 치환하는 해결도 원색을 없애므로 금지한다.
공식 Notion writing-and-editing-basics의 margin drag 블록선택/handle메뉴를 확인했다.
공식 block_menu.gif는 web도구 GIF미지원으로 픽셀 확인 실패했으므로 특정RGBA를
공식 exact값으로 주장하지 않는다. overlay 도입 시 child배경/placeholder·pageboundary
pseudo 충돌, pointer-events, geometry0/Print0/dualclass 중복 layer를 검증해야 한다.

Outline scroll반례는 contentStart·current contentPoint·전체row contentBounds로 수정됐고
reverse 범위축소를 실제 helper controller test에 넣었다. root가 raw11pass/0fail,
source archive3 SHA 및 dependency6 before/after 동일을 확인했다.
/tmp/lds-manual-outline-selection-root-audit-20261008.json. fakeDOMRAF+transformedJSX
범위만 수락하며 Parent/batchcommands/native Shiftclick·drag는 아직 미완료다.

새 outline marquee source의 scroll 범위 손실 반례를 root가 읽기로 발견했다.
start가 고정 client좌표이고 매 refresh rows viewportrect를 현재clip에 잘라 hit만
selectedIds로 대체하므로 auto-scroll로 지나간 앞 row가 선택에서 빠진다.
chief/outline singlewriter에 content좌표 anchor 또는 동등한 전체범위 유지와
reverse-drag 축소 regression을 요청했다. 단순 union은 되돌림 해제를 못해 부적절하다.
실행/편집0 읽기 근거이며 아직 owner 수정/검수는 미완료다.

모델 담당 actual prototype은 third'-' divider, 사용자 undo ---caret3, redo divider,
Backspace ---caret3를 출력했다. 직접 imported undoInputRule는 caret0라 사용자
public command 경로와 구별하도록 전달했다. 전체 guard/새kernel 집중freeze는 pending.
별 headless/새profile/driver로 native gate를 대체하자는 제안은 실행 승인하지 않았다.
이전 CUA 거절·입력 혼입 gate를 우회하지 않으며 기존 사용자 입력격리 회신을 기다린다.
모델 실제PM tests와 허용 readonly/publictoolbar pointer 검수는 계속 가능하다.

MENU_ITEM_FOCUS100 최신 실제 pointer 검수를 root가 JSON과 JPEG로 확인했다.
loaded58 archive path와 list outlineStyle:none/publicvar:none, initial activeitem
rgba(112,115,124,.08) 중립 강조, HTML·IDs·selection 동일/search비포커스/console[]를
대조해 issues0였다. CSS outline 문자열 none 3px에서 width0를 요구하지 않는다.
/tmp/lds-manual-menu-item-focus-root-actual-audit-20261008.json.
이 fixture에는 selectedBlocks가 없어 실제 블록 강조 유지·키보드/native command를
수락하지 않는다. 성공build1/272ms, 첫 config 경로오타 실패는 보존했다.
old d617 이미지를 최신 근거로 다시 쓰지 않도록 chief에 결과를 인계했다.

Cover divider consumer 집중6건은 raw PASS6·testSHA·dependency27 전후 동일을
root가 확인했다. 실제 추출 PrintCover JSX ReactSSR과 최소 DOM adapter의 NodeView
연결 증거이며 native나 current 전체source green으로 확대하지 않는다.
/tmp/lds-manual-cover-consumer-root-audit-20261008.json.
Fullwidth boundary/corner CSS 읽기 감사는 CSS55e1efda/helperf2f 동일,
확정clip 반례0였다. 표 separate/spacing0와 내부7pxradius·TableMapcornerflags가
연결돼 있으나 실제 ring 연속성·main폭 line paint는 browserpending이다.

표 셀 corner 모델 검수 근거를 root가 대조했다. actual4 pass/0 fail raw,
stdout/stderr SHA와 dependency82 전후 tuple가 일치했다. TableMap 물리 모서리의
odd metadata colspan3·rowspan·single cell 복수 corner 및 selection해제/DTO저장0를
검증한 범위다. CSS ring 실제 잘림 해소는 별도 pending이다.
근거 /tmp/lds-manual-table-corner-root-audit-20261008.json.
Callout Core 소스 확인 결과 icon slot 규격은24px였다. 이전 screenshot 추정20을
고정 규격으로 삼지 않도록 chief에 정정했다. Editor 제목은 Core body 안 PM child,
Print 제목은 public Core title prop 구조여서 실제 첫 linebox 기준을 각각 확인해야 한다.

공식 로고 registry 근거를 root가 독립 확인했다. manifest d24729f5의 raw4file SHA와
source3종 before/after/current SHA 일치, issues0. 검수는 official manifest12 entry와
key/ratio/minimum/default width 비교 및 URL 치환18 resolver cases·syntax2이다.
URL 치환은 실제 SVG 로딩/bitmap 증거가 아니며 Parent/Print 소비·재열기 화면은 아직
미수락이다. /tmp/lds-manual-brand-registry-root-audit-20261008.json에 범위를 기록했다.
진행 중 model handle가 live이고 --- undo history 검토 단계임을 확인했다. 해당 kernel
final이 Parent 집중 실행과 cover insert 순차 통합을 막으므로 실제 최소 InputRules
재현→divider 한정 구현→짧은 freeze→Parent gate 순서로 진행하도록 owner에 조율했다.

새 사용자 요구 두 건을 구현 총괄에 배정했다. 페이지 목록은 Shift+클릭의 anchor 연속범위와
빈 영역 pointer marquee 다중 선택을 지원하고 항목 reorder와 구별해야 한다.
선택 페이지 함께 이동·복제·삭제, active 편집 페이지와 selection 표시의 구별,
취소·scroll·stale·readonly·cover·단일 Undo 계약을 포함한다. 현 outline drag는 modifier를
거부하고 단일 sourceId만 다루므로 현재 구현 완료로 볼 수 없다.

Callout 아이콘 중심은 첫 줄 linebox 중심에 맞춘다. 제목이 있으면 제목 첫 줄,
없으면 본문 첫 paragraph 첫 줄을 기준으로 하며 multiline 전체높이 중앙 정렬은 금지한다.
20px 아이콘·색·밀도와 Editor/Print parity를 유지하도록 CSS owner에 배정했다.
사용자 근거는 clipboard-3a858fc5(페이지 목록), clipboard-f241dc63(callout)다.

MENU_ITEM_FOCUS100 archive를 root가 독립 대조했다. files34+dependency66=100,
critical25, hashissues0이며 이전 후보 대비 Menu JSX/CSS 두 파일만 달라졌다.
manifest SHA6759d2577dcc8d35886cf520508507e6bebcdbaf424b9bf21463aba23bad84c7.
근거 /tmp/lds-manual-menu-item-focus-root-archive-audit-20261008.json.
sole QA에 기존 허용 public toolbar pointer만으로 popup outline none/neutral item/
HTML IDs·selection·PM 변화0 검수를 배정했다. 실제 block selection 검수를 private fixture나
스타일 주입으로 대신하지 않으며 키보드/native gate는 그대로 남긴다.

사용자 표지 개별 구성 메뉴 누락을 명시했다.
`/tmp/codex-clipboard-978bd20e-fa0d-484a-8ecb-a75489279ebd.png`의 일반 블록 위주 목록에는
독립 로고·표지 제목·문서 정보·섹션 제목 삽입이 없었다. 해당 네 역할과 기존 구분선을
실제 개별 factory/command로 연결하도록 chief/model owner에 배정했다. 일반 빈 페이지도
구성 가능해야 하며 기존 cover-only disabled 정책은 부족하다. 첫 요소에서 다른 역할이
omitted인 빈 cover shell을 원자 생성하는 방식은 허용하되 전체 템플릿 자동 생성이나
기존 내용 손실은 금지한다. 역할 중복/current·stale·취소 및 copy/file/reopen 계약을
검증한다. 로고는 공식 LDS 12종의 유한 registry/resolver로 Editor/Print를 일치시키고
흰 로고는 어두운 선택 미리보기와 용도를 설명한다. arbitrary SVG 허용·Core/Theme 변경은
요청하지 않았다. 현재는 구현 배정/진행 단계이며 실제 삽입 수락은 아직 없다.

표 trailing UI/helper/action의 독립 읽기 감사는 확정 결함0이며 pre/postSHA가
UI625f325d/helperd73f79c0/action41003d2b로 동일했다. 동일 session의 preview2RAF 후
기록 delta와 release delta가 같을 때만 confirmedDeletion을 전달하고 delta 변경은
확인을 지운다. cancel/lostcapture/scrollblur/unmount는 session을 제거해 늦은 release를
차단하며 editor/doc/generation/editable/IME와 model을 commit 전 재검사한다.
pointerup 이후 일반 click은 detail!=0으로 무시하고 keyboard click은 별도 추가한다.
최종 배치는 단일 transaction으로 반영한다. 실행/수정/browser0 읽기 근거이며 실제
preview paint/가시성·Parent own-session 허용·native click/drag는 수락하지 않았다.
lead 최종 API 뒤 Parent 통합을 진행하도록 chief에 인계했다.

사용자 최신 메뉴 포커스 시각 요구가 기존 inset ring 계약을 대체한다:
`/tmp/codex-clipboard-15b11249-35fb-4d55-a9c1-fc08a575d98d.png`에서 메뉴패널의 파란 테두리를
비판하며 블록에 포커스가 표시돼야 한다고 명시했다. pointer-open에서 선택 블록의
primary 강조는 유지하고 popup/list 전체 primary outline은0, 현재 메뉴 항목만 중립
hover/active로 표시한다. DOM keyboard focus/aria-activedescendant/Arrow·Enter·Escape와
forced-colors item cue는 보존해 시각 블록 선택과 메뉴 키보드 조작을 구별한다.
공개 LDS --lds-focus-outline의 해당 list scoped 계약으로 구현하도록 chief에 정정 배정,
QA는 진행 handle를 재시작하지 않고 확보 결과 보존/미시작 중량 후속 중단 요청했다.
기존 d617의 inset-2 검수는 역사적 증거로 보존하며 성공해도 최신 요구 수락으로 올리지
않는다. 전역 outline 제거·검색창 autofocus 재도입·Core/Theme 쓰기는 요구하지 않는다.

사용자 `---` 단축 입력 요청을 model owner에 배정했다. 현행 manualInputRules는
`/^--- $/`로 공백 트리거만 제공하므로 세 번째 '-' 즉시 전환이 빠져 있다.
빈 일반 paragraph의 전체 내용이 정확히---일 때 divider로 전환하고 undoInputRule/
Mod-z의 trigger text·caret 복원과 redo를 확인한다. 커서 앞만 regex 매치하면
'--남은내용' 앞쪽에서 '- ' 입력 없이 세 번째 '-'로 후행 문자를 잃을 수 있으므로
후행 content0/collapsed selection 조건과 실제 InputRules plugin 테스트를 요청했다.
제목·code·caption·tablecell·IME/readonly·schema불허 parent에서 변환0가 필요하다.
기존 coverf762 및 focus immutable후보를 이 새kernel epoch로 덮지 않는다.

Cover divider의 실패4건 재검수를 root가 대조해 pass4/fail0/exit0를 확인했다.
`cover-divider-repair-execution-20261008-9nxq214j/manifest.json`의 81dependency 전후tuple와
stdout/stderr SHA가 일치하며 current projection f7628ead/test02208529도 expectedSource와
일치했다. 수정은 본문 fixture canonical marks와 legacy copy의 누락된 canonical role
alias 보완이다. root 근거 `/tmp/lds-manual-cover-divider-root-repair-audit-20261008.json`.
이 결과와 최초 green8/syntax는 각각 실행 epoch로 보존하며 최신 SHA에서12개를 전부
재실행한 것으로 합산 주장하지 않는다. 모델 실패는 해소됐고 Print/NodeView 소비 통합,
실제 로고·divider 조작 및 table corner seam은 별도 미완료로 남는다.

Cover divider 최초 집중 실행을 root가 대조했다. manifest
`cover-divider-final-execution-20261008-3br91sar/manifest.json`은 실패이며 81dependency
전후 tuple 동일, stdout/stderr SHA 모두 일치한다. new model8중4pass/4fail,
publicSSR1·changed selection/clipboard2·header1 및 public export syntax는 pass다.
실패3은 본문 fixture marks의 PM canonical 순서와 기대값 불일치, 나머지1은 legacy
불완전 roleIds의 filecopy에서 sectionTitle 순서가 말미로 이동하는 실제 copycodec
결함으로 owner가 분류했다. 해당4건만 수정/재검수하며 이전green을 새epoch 실행으로
소급하지 않는다. root 근거 `/tmp/lds-manual-cover-divider-root-initial-execution-audit-20261008.json`.
실패 raw/tuple은 보존하고 native/Print integration 수락은 아직0이다.

페이지 경계선의 최신 사용자 정정은 A4 종이 폭이 아닌 편집 영역 전체 가로 폭이다.
기존 CSS6c의 page::before left0/right0는 A4 폭만 채우므로 최신 요구 수락에 부족하다.
outline/inspector를 제외한 main/writing full width로 확장하되 페이지210mm/height/
padding/gap·흰색·그림자0·DTO/ID·Print0를 유지하도록 chief CSS writer에 수정 배정했다.
라인 자체 scrollWidth 증가/사이드바 침범/포인터 hit는0이며 wide/narrow·outline 접힘·
inspector 열림·resize/scroll이 검수 범위다. 기존 page-boundary-focus100는 source 후보로
보존하며 최신 fullwidth 수락으로 승계하지 않고 현재 menu QA를 교체하지 않는다.

Trailing row/column 추가·감소 helper의 raw TAP10pass/fail0(~118ms)를 읽었다:
`/dev/shm/lds-table-trailing-actions-20261008.stdout.txt`. 현재 helper는 plugin-free scratch
state에서 기존 행열 명령을 재사용하고 final table만 closeHistory 단일 transaction으로
실제 편집기에 반영한다. 최소1행열/내용있는 삭제의 confirmedDeletion gate/취소·readonly·
IME·stale/nontrailing guard와 Undo/Redo 선택 복원을 집중 검사한다. 아직 최종 실행
source 전후 tuple은 owner 인계 대기이며 native click/drag/실제 preview/caller 연결은
이 raw 결과로 수락하지 않는다. UI의 삭제 preview가 실제 표시된 뒤에만 confirmation을
전달하는 경로와 Parent final transaction 연결이 남아 있다.

PAGE_TITLE_MENU_FOCUS100 actual 필수 focus gate는 실패했다. DIV listbox가
focus-visible=true인데 computed outlineOffset는+2px다. root frozen build CSS에서
Theme global :where(...):focus-visible의 outline-offset:var(--lds-focus-outline-offset,2px)
!important가 consumer CSS111f 일반 -2px보다 우선함을 확인했다. 공개 customization
변수 --lds-focus-outline-offset를 menu-list에 scoped 적용하도록 chief에 인계했다.
근거 `/tmp/lds-manual-menu-focus-cascade-root-audit-20261008.json`. title-present의
페이지 제목 disabled/reason는 정상이고 PM/HTMLIDs/selection unchanged/console0였다.
QA는 compact/omitted 후속을 중단했으며 source 불일치/가상 DOM 수정으로 우회하지 않았다.
새 고정 후보의 제한 재검수만 이 actual 실패를 근거로 수행한다.

사용자의 LDS 다른 로고 버전 조사 요청에 대해 current LK_LOGO_STANDARD v2와
Theme web manifest를 읽었다. 일반 brand assets는 mark/inline/stacked/banner/square/
corporateSquare의 navy 및 white/light 12개이며 Theme wildcard asset export로 제공된다.
현재 로고 DTO/figure role는 다른 asset key를 담을 수 있으나 Editor resolveAsset와
ManualPrint coverlogo는 inline-navy 한 파일만 built-in resolve하고 inspector에는
variant chooser가 없다. validateAssets는 PNG/JPEG/WebP만 허용하므로 공식 SVG를
사용자 upload 허용 확대로 해결하지 않고 shared finite built-in registry/resolver를
Editor/Print/file/reopen/copy에서 일관되게 소비해야 한다. logo 구조 가능과 실제 UI
지원은 구분한다. corporateSquare 최소160px/권장192px로 현재 기본132px 미달이고,
stacked64px 높이/inline·mark20px/banner28px/square64px 최소 정책을 연결해야 한다.
master 기준판/favicon/제품명 lockup은 회사 로고 변형 목록과 구별한다. 이번은 조사이며
자산 재생성·Core/Theme 수정·variant UI 구현 완료 주장은 없다.

페이지 간 경계선 source를 root가 대조했다. 기존 editorCSS2ec3 전체 prefix는
그대로이고 마지막에 screen adjacent page/cover ::before 및 print display:none 두 규칙만
추가됐다(CSS6c03749f). absolute/기존 gap 중앙/pointer-events:none/LDS line token 사용으로
문서 geometry나 ID를 변경하지 않는 경로다. 근거:
`/tmp/lds-manual-page-boundary-root-source-audit-20261008.json`(7checks).
실제 경계선 픽셀 수락은 아직 없고 PAGE_TITLE_MENU_FOCUS100는 이전CSS2ec3 고정이므로
그 후보의 메뉴 QA를 이 경계선 화면 검증으로 확대하지 않는다.

사용자 Notion 추가 사례 두 장에 따라 표 bottom row-add strip/right column-add
strip을 명시 요구로 추가했다. PNG: `/tmp/codex-clipboard-0057bf05-9db2-4f92-a608-7d3e7642c272.png`,
`/tmp/codex-clipboard-8455a242-dfa6-404d-913a-1b7c36edd125.png`.
특정 행열 선택 grip/menu와 별도로 hover/focus 얇은 +bar, click 마지막1추가,
drag trailing 개수증감, preview→pointerup 단일 transaction/Undo1·cancel/stale/IME
readonly guard를 추적한다. 내용있는 감소 범위는 사전 시각 preview, 마지막1행열 guard,
문서 크기/DTO 불변 chrome·Print0와 rail/resize/선택grip 충돌0가 필요하다.
표 lead는 helper/component, chief는 Parent 단독 writer로 계약을 조율한다.
클릭 또는 inspector-only 구현을 드래그 포함 전체 요구 완료로 대체하지 않는다.
기존 rounded selection clipping 수정과 native drag gate는 별개로 유지한다.

PAGE_TITLE_MENU_FOCUS100의 archive100/critical25를 root가 SHA 대조했고 issues0다.
manifest SHA6286b4970f12c95eedad5dee9cb740ca4166f53ab333d766f95f9e0b882a0baa,
`/tmp/lds-manual-page-title-menu-focus-root-archive-audit-20261008.json`.
이전 PAGE_TITLE_FOCUS100 대비 menuCSS111f의 inset focus-visible 한 파일만 다르며
진행 중인 cover divider/table live source는 포함하지 않는다. sole QA에 UX 제한 계약의
public title-present/omitted DTO·toolbar+ safe click·list focus·제목 항목 상태·header
grouping 단일 build 검수를 지시했다. 항목이 화면 밖일 때만 메뉴 list 내부 bounded
readonly wheel을 허용하며 키/편집 selection/PM command/private hook/original44589는0이다.
실제 UI 결과는 아직 대기이고 모델 명령 및 native 조작 수락으로 확대하지 않는다.

사용자 표 셀 선택 테두리의 둥근 모서리 잘림을 확인했다
(`/tmp/codex-clipboard-781fd01d-161c-417f-860f-4adf169ced83.png`).
현행 public table-frame은 radius8/overflow:hidden이고 editor selected cell은 직각
inset1px ring이므로 모서리에서 잘린다. 둥근 표 모양을 유지하며 edge-cell ring과
TableMap 물리 코너를 맞추도록 chief CSS writer와 table lead에 인계했다.
일반표·cover metadata, row/column/rectangle, 1행/1열·병합 span의 corner 및 Print0를
검증 범위로 추적한다. DTO/선택범위/폭높이를 변경하는 해결은 요구하지 않는다.
화면 테두리 fixture 검수와 실제 native 선택 조작 수락은 구분한다.

새 cover divider projection의 독립 읽기 감사에서 역할 alias와 일반 블록 ID 충돌
반례를 찾았다(SHA2e6e2f94 전후 동일, 실행/수정0). roleIds.divider와 ordinary body
paragraph의 ID가 같고 각 headerOrder/bodyOrder에 저장되면 generated divider ID는
충돌 suffix로 바뀌지만 take의 pool.has(raw) 우선 처리로 paragraph가 header로 이동한다.
actual DTO block IDs 중복 없이도 발생 가능한 순서 보존 결함이다. model owner에게
context별 ownership 구분과 순수 projection 집중 재현·수정을 요청했고 최종 cover
candidate 수락 gate로 추가했다. aliases-first로만 바꾸면 body reference를 divider로
오인할 수 있어 양쪽 참조를 함께 검증해야 한다. 실제 실행 재현은 아직 미확정이다.

사용자 직접 요청 두 항목을 추가했다. 로고는 projection상 독립 figure/logo role와
ID가 이미 있으나 사용자 화면에서 클릭 선택·손잡이·이동삭제가 동작한다는 수락은
아직 없다(`/tmp/codex-clipboard-b3dbef90-07a5-4527-8a3d-e5694e9da629.png`). source 모델
존재를 실제 사용성 완료로 대체하지 않고 chief가 연결/rail hit를 확인하도록 인계했다.

페이지 간 구분선은 전체 흰색 배경에서 페이지 경계를 식별하는 editor chrome이다.
옅은 LDS line token 실선을 기존 gap 안에 두며 page→page/cover→page 모두 적용하고,
A4 폭높이·패딩·간격/DTO/블록ID 불변, Print/PDF/clipboard 표시0을 요구한다.
문서 내부 divider 블록과 구별하며 source CSS writer와 UI chief에 인계했다.
이 두 항목의 실제 화면 수락은 미완료이고 원44589 강제 reload를 하지 않는다.

표지 metadata 아래 구분선의 블록화 누락을 현행 source에서 확인했다.
`manual-cover-legacy-projection.mjs` ROLES는 logo/title/metadata/sectionTitle만 포함하며,
`ManualPrint.jsx` metadata는 ManualMetadata 뒤에 고정 `<hr/>`를 출력하고 public
`src/components.mjs` ManualCover도 고정 h('hr')를 붙인다. 일반 divider 블록이 존재하는
것만으로 이 표지 구분선의 선택·이동·삭제 요구가 충족되지 않는다. UI 사용자 피드백
(`/tmp/codex-clipboard-a388a1c3-a7fe-47d6-8d5a-1734c0091400.png`)과 전체 블록화 요구에
따라 독립 ID/order/omission, 기존 DTO 호환/roundtrip, 이동삭제 Undo, Editor/Print 일치를
필수 미완료 항목으로 추가하고 구현 chief가 model owner를 배정하도록 전달했다.
root는 이 source를 편집하지 않았다. Core/Theme sibling 변경을 추정 승인하지 않는다.

공간 owner heartbeat-1052-recovery.json은 statvfs 두 표본 약146GiB와 df147G 가용을
확인했다. 회복 원인 미확정/owner 삭제0이고 syslog7,012,551,237B 유지이므로 승인 로그
회전 완료로 해석하지 않는다. 빌드 공간 병목은 해소됐으나 native 입력 gate는 별개다.

표 선택 복원 누락에 대한 추가2검사 raw TAP를 읽었다:
`/dev/shm/lds-table-action-selection-undo-20261008.stdout.txt`(pass2/fail0, 약143ms).
현행 test는 row duplicate/column insertion 및 row·column clear에서 Undo·Redo의 DTO와
selection.eq/anchorCellId/headCellId/mode/ids를 대조한다. 따라서 과거 DTO-only 검사의
선택 복원 누락을 명시적으로 다루며, 정확 최종 실행 source핀은 owner 인계 대기다.
actual 포인터·키보드 수락이나 Parent 연결까지 확대하지 않는다.

표 메뉴 집중 검사에서 SSR 1개가 React 탐색 경로 때문에 실패했다.
실제 실패 output는 `exec-5b17f026-2c4a-480e-ae01-657e6c424c8c`의
MODULE_NOT_FOUND이며 제품 동작이나 ENOSPC 실패로 분류하지 않는다. 기존 LDS runtime의
require 경로를 사용하도록 수정한 뒤 `exec-b632ae19-4d71-44bc-b9a0-a136868aa4e1`에서
6개 모두 통과(exit0/TAP fail0, 약160ms)했다. 이 결과는 표 메뉴 항목·disabled 이유·
키 이동·target pin·위치·public Core SSR 범위이며 실제 클릭/Parent 연결 수락은 아니다.
최종 source 전후 핀은 담당 writer의 인계에서 별도 확정한다.

표 행·열 작업의 통합 전 읽기 감사를 추가했다. `manual-table-actions.mjs`와
`manual-table-actions.test.mjs`의 읽기 전후 SHA는 각각32a61883/12fb56f6로 동일했고
확정 결함은 발견하지 못했다. 단일 transaction 및 ID/문서 revision/generation,
머리행 포함 인덱스, 내용·메타데이터·폭·높이 보존 경로를 확인했다. 기존 Undo 검사는
DTO 복원만 다루므로 선택 범위의 anchor/head 복원은 별도 확인을 요청했다.
새 메뉴의 minimumWidth120과 nowrap 라벨 조합은 좁은 viewport에서 가로 넘침 가능성이
있어 담당 writer에게 경계 검사를 요청했다. 아직 실제 UI/Parent 연결 수락은 아니다.

AUX_POINTER_FOCUS100 actual Parent white/rail·독립compact·safe toolbar insert 자료를
root가 대조해12checks 통과했다(`/tmp/lds-manual-aux100-root-ui-audit-20261008.json`).
Main/page/cover가white/shadow0이며24px rail pair 간격4px, compact4행32px/16px bareicons/
header-search-close0/action0을 확인했다. 실제insert의 active는비편집DIV listbox/tabIndex0로
검색Input이나PM이 아니고 HTML/IDs 동일/PMfocus0이다. tabIndex는DOMattribute문자열'0'
이므로정수정규화했다. 독립compact모양을 실제Parentblock menuopen/명령수락으로확대하지
않고 이 후보에는 새pageTitle API가없다. 최종 QA 결과도 대조했다. loaded 58개 archive SHA와 critical 24핀은 공식 후보와 일치하고 parent/compact console은 빈 배열이며 owned 77·78 탭은 닫혔다. 근거: `/tmp/lds-manual-aux100-root-final-audit-20261008.json`. 추가 시각 결함으로 목록 포커스 outline이 overflow에 잘려 검색창 아래 파란 가로선으로 보인다. 담당 writer가 포인터·키보드 포커스 표시를 구분해 수정하며 제목 메뉴 후보의 다음 제한 검수에 포함한다. 실제 편집 명령·저장·드래그·Undo 검증은 여전히 미완료다.

페이지 제목 최종 모델 명시검사12(command9+SSR1+codec2) 실제TAP와78dependency
전후tuple/각stdoutstderrSHA가 root대조에서일치했다. 공식원본
`/dev/shm/lds-manual-page-title-final-execution-20261008-53rfdr3v/manifest.json`,
`/dev/shm/lds-manual-page-title-root-final-audit-20261008.json`이며 디스크전용owner가
내구성 사본과공식mapping을보존했다. 기존pre-guard7메타근거와구분한다.

사용자명시요청으로 LDS Manual · 저장공간 관리(01a1192c-54f0-72f0-87da-72bfa4f1e4b0)
세션과10분heartbeat를생성했다. 공간진단·증거보존·task-owned미참조재생성output정리는
이owner로모은다. 시스템syslog압축보존회전은사용자승인이있으나sudo비밀번호권한으로
actual0이며사용자terminal명령을안내했다. 현재소규모writeprobe성공/약500MB회복과로그
회전완료를혼동하지않는다. source/Table작업은별도writer의dfguard하에재개됐다.

현행 source의 catalog ‘페이지 제목’과 Parent pageTitleMenuState/action 연결을 확인했다.
editor/generation/revision·readOnly/취소/IME 기준의 disabled와 실제 명령이 같은 API를
소비한다. 아직 최종 candidate/Parent 집중 검증·실제 UI 수락 전이다.
모델 v2는 실행 당시 일부 exactruntime/test핀 미캡처를 handoff핀과 분리한 정정이며,
이전7 결과를 final9개 API의 확정 실행으로 확대할 수 없다. 이 미해결 근거를 해소하기
위해 최종stable 모델 command9+SSR1+codec2만 약1초 경로에서 전후tuple·rawstdout을
확정하도록 요청했다. 전체suite 반복이 아니며 table kernel writer 진입 전에 소유를 조율한다.

페이지 제목 ROLE 모델의 최종 sourcehandoff는 kernel7fae4947/projection708ca9f2/
shape0f416254이며 root의10핀 대조issues0다. manifest는
`/tmp/lds-manual-visual-fix-verification-20261007/page-title-role-model-source-20261008.json`.
기존scalar.title 계약·roleIds remap·title-only pinnedRoles, logicalfamily sync·단일대상
guard를 제공하며 Parent/catalog 통합을 시작할 수 있다. 최초7실행은pre-guard/정확kernel
핀 없음이고 최종SHA실행으로 소급하지 않는다. guard2+insert/tail2 및 SSR/codec delta의
집중 결과와 source변경을 구분한다. rawstdout은tooltranscript만/실제native0다.

표 grip UI의 source감사에서 old rowdelete가 header를 제외한body-index이고 DOM row0와
다른 것을 확인해 chief에 인계했다. 새before/after 메뉴를 기존append-only 명령으로
대체하지 않고 header 포함 물리좌표와 ID/revision 계약을 명시한다. 이미지 크기 조절의
최신 사용자 재요청은 실제활성handle/drag commit·cancel·Undo 확인이며 presets나
선택/resizesource 연결만으로 완료 대체하지 않는다. native gate는 유지된다.

최신 사용자 표 손잡이 요구가 추가됐다. Notion 참고 화면의 행 왼쪽/열 위쪽 작은 grip,
대상 범위 강조와 짧은 작업 메뉴를 구현 chief에 단일 table owner로 배정하도록 요청했다.
hover/focus/menuopen 노출·최소24px hit, insert/duplicate/clear/delete의 정확한 대상·
merged/span·metadata표 특수처리·최소1행열·1 Undo와 resize/block rail 충돌 방지를
검증한다. header toggle은 실제 모델 지원을 확인한다. 참고 grip 클릭 메뉴만으로
행열 drag 재정렬을 추가하지 않고 기존 property/키보드/touch 경로를 유지한다.
이 새 요구는 앞선 table source선택/resize 근거의 수락 범위를 넘으므로 미완료로 기록한다.
페이지 제목 kernel 작업의 최종handoff와 겹쳐 같은 파일을 동시에 쓰지 않는다.

페이지 제목 모델은 핵심7검사 통과 보고 뒤 단일 대상 경계를 추가로 보강 중이다.
현행 getManualPageTitleCommandState에서 contiguous multi manualBlockSelection(ids!=1),
incomplete pagination, sparse/table cell 및 여러 parent에 걸친 텍스트를 거부하는 source를
root가 확인했다. 정식 role 복원·promotion·tail sync의 최종 핀/전체 집중 결과와 Parent/
catalog 통합은 아직 대기다. source guard 추가를 실제 사용자 조작 수락으로 확대하지 않는다.

SESSION_STORAGE100은 UI 독립 검토에서도 restore/load-error raw와 두 PNG를 대조해
범위 내 수락됐다. 다음 AUX100은1build로 white/rail hover1, 단독compact shape,
실제toolbar 긴 목록의 비편집focus 읽기3단계를 진행한다. nativekey/검색클릭/Choose/
close 또는 ordinaryParent PM selection은 해당 검수에 포함하지 않는다.

SESSION_STORAGE100 최종 QA 기록을 수신했다. build469ms/234modules/고정100중58loaded,
restore/error allgreen·console0·owned75/76닫기·viewportreset를 raw 재계산23 checks와
대조했다. 초기 public boot PM 설치1회와 postboot dispatch0를 구분하며 실제keys/클릭/
파일/IDB0이다. source normalization gap은 이 후보에 남아 있으므로 복원 읽기 화면만 수락한다.

AUX_POINTER_FOCUS100은 이전 whitecompact100 위에 Parent892812/Menu bad888 두overlay를
올린 별도 후보다. root 사본 대조100고유파일/critical24/hashissues0
(`/tmp/lds-manual-auxpointer100-root-archive-audit-20261008.json`).
pageTitle 변경 중인 kernel0ee는 포함되지 않고 기존08d만 포함한다. 아직 미실행인
white/compact 화면은 새 후보에서 pointerfocus 읽기 화면과 함께 최소 단일 검수하도록
UX에 실행 계약 통합을 요청했다. 기존100을 실제 완료로 소급하거나 새title 수락으로
확대하지 않는다.

SESSION_STORAGE100의 합성 load-error390 raw/PNG를 root가 대조해11 checks 통과했다.
alert/message/actions/save가 viewport 안에 들고 BODY/PMfocus0·HTML/IDs 유지·save enabled,
list/load1회·실제 write0·충돌dialog0·negative text token 일치다.
`/tmp/lds-manual-session100-root-load-error-audit-20261008.json`이 근거이며 이 오류는
복원 읽기 실패다. backup quota/CONFLICT 및 실제 버튼 클릭·파일Save 증거는 아니다.

aux initial 실제 실행 결과 JSON을 수신했다. Parent892/kernel08d tuple의3case 실행
stdout 기록과6파일 전후hash·스크립트9f3225 핀을 대조했다.
`/tmp/lds-manual-aux-initial-root-evidence-audit-20261008.json`에서 전후tuple/스크립트hash
일치한다. 나중 pageTitle kernel 변경0ee603은 이3case에 포함되지 않는다.

SESSION_STORAGE100 공개 memory 저장기록 복원 화면 raw first/baseline을 root가 재계산해
12 checks 통과했다(`/tmp/lds-manual-session100-root-restore-audit-20261008.json`).
list/load 각1회·file reset1회, source document ID/HTML/IDs 보존, BODY/PM focus0,
충돌dialog/header0·save버튼enabled·실제Save/open/saveDocument0이다. assets=[] fixture라
asset roundtrip 근거가 아니다. header text/buttons collector의 빈값은 AX/copy 완료로
해석하지 않는다. 실제CAS·파일OS·새 normalization revision 경로는 이 화면에 포함되지
않고 복원 오류390 화면은 다음 QA 단계다.

저장 정규화 onResult 집중3그룹 통과 보고를 받았고 root가 실제 추출 callback 검사
assertions 범위를 대조했다. first fresh write expectedRevision:null/원기록 보존,
이미 저장된 live auxiliary revision 유지, generation/editor 교체 응답 무시를 다룬다.
최종 source tuple 동결 전이므로 이전100과 결합해 전체 수락하지 않는다.
검색 포커스는 긴 비편집 목록에서 Tab으로 검색에 들어가는 명시 의도 경로가 추가됐다.
compact/검색창/그외 위치의 Tab 닫기와 Escape는 기존 반환 정책이다. 이전 '모든Tab닫기'
계약을 그대로 유지한 것으로 기록하지 않는다. Native Tab/IME는 아직 미수락이다.

저장 normalization179는 현재 recoverySession.getState().revision??null로 바뀌고
onResult의 view.current===editor 보호가 추가됐다. Menu는 autoFocusSearch=false 기본값과
비편집 list tabIndex0/aria-activedescendant를 갖추고 slash/IME/disabled/position 없음에서
자동focus를 하지 않는다. 현재 mutable source 읽기 확인이며 finaltuple/실행 결과는 대기다.
실제 추출 onResult+PM/controller/helper/syntheticCAS의3 focused assertions를 읽어 첫
expectedRevision:null/원기록 보존·live revision·late generation/editor 보호 범위를 확인했다.
스크립트 존재를 실행 성공으로 간주하지 않는다. 모델 pageTitle API는 별도 작업 중이다.

페이지 제목 후속 계약을 chief/model 담당에 전달했다. 일반 논리페이지 root의 title role만
삽입/복원하고, 존재할 때 중복 추가를 막으며 명확한 비활성 이유를 제공한다. 제목 없는
페이지에서 paragraph/heading 전환은 원 ID/content/marks를 보존해 정식 role을 부여한다.
자동 continuation의 derived title과 cover는 해당 명령을 허용하지 않는다. 기존 title을
덮거나 삭제하지 않고 scalar/outline projection 및1 Undo/Redo를 검증한다. UI 명칭만
바꾸는 수정은 수락하지 않는다. 모델 API와 Parent/catalog 통합 담당이 분리되어 실행 중이다.

저장 normalization gap은 Parent solewriter의 P1 수정으로 배정됐고 live recovery session
revision/null을 scheduler에 소비하는 방향이다. 집중 검증은 실제 추출 onResult와 PM/
controller/helper/CAS를 연결해 loaded revision7→fresh 첫 expectedRevision:null,
원기록 보존·후속 revision·늦은 epoch를 확인한다. 구현/검증 결과는 아직 대기다.

SESSION_STORAGE100의 정규화 완료 경계에서 새 source gap을 확인했다. installRecord는
독립 recovery의 null revision으로 autosave를 reset하지만 onResult initial.saved 경로는
initial.revision(원 복구기록 revision)을 다시 주입한다. helper.save는 snapshot의
expectedRevision을 persist에 전달하므로 새 record ID의 첫 write에 원 revision이 갈
경로가 있다. 기존 Parent5+pending1은 이 onResult 경계를 포함하지 않았으므로 해당
일반복원 계약을 완전히 증명하지 않는다. 실제 저장 실패는 미관찰이다. chief에 Parent
solewriter/storagechild 수정과 실제 callback→controller→helper CAS 집중 검증을 배정했다.
이 오류 수정을 이전 동결 후보에 소급해 통과로 기록하지 않는다.

ORDINARY_COMPACT_WHITE100 동결 후보의 root 사본 대조는100개 고유 파일/critical24,
hash issues0다(`/tmp/lds-manual-ordinarywhite100-root-archive-audit-20261008.json`).
sourcefocused15 보고와 스크립트 assertions를 읽었다: 짧은 메뉴·긴 목록/Back 분리,
IME/disabled Back, submenu 최소86px fit, real PM Escape선택→Ctrl/MetaShiftArrow 순서
이동과1 Undo, Back target/selection 보존이다. Native 키/Parent 메뉴 오픈/파일/사용자
44589 반영은 미수락이다. 검수용 독립 component 화면과 Parent 동작 수락을 구분한다.

최신 사용자 후속으로 페이지 제목 메뉴와 포인터 메뉴의 검색 자동focus gap이 재개됐다.
catalog에는 제목1/2/3만 있고 페이지 제목 role 추가/복원 경로가 없으며 Menu의
mode!=slash&&onQueryChange 경로는 검색에 자동focus한다. 다음 후보에서 pageTitle의
한 논리페이지 역할/기존title처리/DTO·outline연동과 pointeropen noneditablefocus·
검색클릭intent를 설계하도록 chief에 배정했다. 단순heading2 이름변경이나 focusring
숨김으로 해결하지 않는다. 기존 동결100의 개선 수락과 이 새 요구 해결을 혼합하지 않는다.

흰색 canvas CSS2ec3b79c는 SESSION_STORAGE100의 CSS와 대조해 main 배경 normal-normal,
page/cover box-shadow:none 두 선언 이외 byte 차이가 없었다. root 비교 근거
`/tmp/lds-manual-white-root-css-audit-20261008.json`, Print media 동일도 확인했다.
새 화면의 색 경계 해소는 아직 별도 QA 전이다.

현행 Parent4773ffa2/Menu d0e53cea/menuCSS0b62d114/editorCSS2ec3b79c의 제한된 독립
source 감사에서 새로운 확정 gap은 발견하지 못했다. 일반 메뉴 compact, 유형 선택
검색/back·IME 보호, PM keyboard 이동, 표 cell drag/row-column 선택/resize commit,
이미지 click→select 연결을 읽기 확인했다. source 연결 확인이며 native 조작·전체
요구 완성을 증명하지 않는다. 테스트/CUA/파일 수정은0이다.

COMMON_RAIL100 최종 QA 기록은 `rail100-readonly-result.json`이다.
단일 build818ms/233 modules와 고정100 중58 loaded 모듈을 대조했고 정상3종·중첩step·
hover bridge·clip pair·CSS분수배율의14 최종 체크가 모두 true다. root의 raw 재계산19
assertions와도 일치한다. 정상본문 간격14px, 가로스크롤 보정 뒤8.734375px다.
CSS0.875 fixture는 root/main이390px보다 넓으며 whole390 앱 layout 또는 native browser
zoom 수락이 아니다. accepted temporary tabs73/74는 닫힘, server refusal error tab72는
URLpolicy로 직접 cleanup 미확인이고 bypass하지 않았다. 다음 storage 후보와 분리한다.

일반 블록 compact 변경은 현재 source에 반영됐고 독립 UI 읽기 검토에서 추가 gap을
찾지 못했다. compact는 mode=block에만 적용하고, 유형 선택의 검색/back 및 target을
보존한다. back은 disabled/composition 가드를 갖추며 유형 변경 행은 실제 다음 화면과
맞는 aria-haspopup=dialog를 사용한다. 속성이 필요한 블록은 기존 속성 행을 유지한다.
아직 final source tuple/focused 결과/실제 메뉴 화면 검수 수락 전이다.

COMMON_RAIL100의390×844/CSS scale0.875 기록과 narrow-clamp PNG를 추가로 대조했다.
중첩 이미지 버튼 pair가 clip왼쪽8px에서 온전히 보이며 간격4px를 유지하고, 공간이
부족하면 pair를 함께 숨긴다. 문서 HTML 동일/PM focus0 등9 assertions가 통과했다.
근거 `/tmp/lds-manual-rail100-root-narrow-audit-20261008.json`.
이는 CSS scale을 적용한 읽기 검수이며 브라우저 zoom·실제 드래그·새 종이경계 개선의
수락 근거로 확대하지 않는다.

COMMON_RAIL100의 정상 폭 실제 DOM 기록을 root가 재계산했다.
제목·문단·이미지의 + x=316.78125, 손잡이 x=344.78125로 같고 두 버튼 사이 간격은4px다.
중첩 절차 이미지에서는 해당 step 왼쪽을 기준으로 손잡이 오른쪽에14px 여유가 남는다.
hover bridge 대상 보존, clipping 경계 내 배치, 세로 경계에서 두 버튼 함께 숨김,
문서 HTML 동일·PM focus0·손잡이 native title 없음의10 assertions가 통과했다.
근거: `/tmp/lds-manual-rail100-root-normal-audit-20261008.json`과 QA raw3파일.
좁은 화면/zoom 및 실제 drag·키보드 수락은 이 근거에 포함하지 않는다.

2026-10-08 일반 블록 메뉴 후속: 사용자 캡처의 검색창·닫기 버튼·아이콘별 외곽선은
page/outline compact 경로가 아닌 일반 block mode에 남아 있는 실제 source다.
[Notion 공식 작성 안내](https://www.notion.com/help/writing-and-editing-basics)의
handle 클릭 작업 메뉴·drag 순서 이동·Turn into 및 다른 페이지로 옮기는 Move to를 비교했다.
짧은 block 작업은 compact 행/테두리 없는 아이콘/유형 변경 하위 메뉴·복제·삭제로 정리하고,
위아래 이동 메뉴 항목을 제거하되 기존 drag/키보드 명령을 유지하도록 구현 chief에 배정했다.
slash/유형 선택의 긴 목록 검색과 back은 별도 유지한다. 현재는 배정 단계이며 구현·화면
통과를 주장하지 않는다. COMMON_RAIL100/SESSION_STORAGE100은 변경 전 독립 후보로 보존한다.

SESSION_STORAGE100 후속 후보는 COMMON_RAIL100 위에 Parent4001a9ce/recoverye196 두 변경을
분리 적용해 동결했다. root 사본 점검은100개 고유 파일 hash 일치·issues0
(`/tmp/lds-manual-sessionstorage100-root-archive-audit-20261008.json`)이다. Parent 실제 함수
추출+real PM+synthetic storage의5검사와 quota pending1 통과 보고 및 스크립트 assertions를
대조했다. loaded record revision과 새 scheduler null basis 분리, twin restore/원기록 보존,
자동 fork 뒤 문서·선택·file handle/baseline 유지, 실제 quota no retry/pending 유지와 파일 Save
호출 가능, 늦은 응답과 다른 파일 오류 안내 보존을 검사한다. 파일 Save는 stub이므로 실제
FileSession/OS 저장 검수로 확대하지 않는다. '해결' header/충돌 dialog와 관련 state/action은
source에서 제거됐다. 새 후보의 실제 Parent restore/error 화면은 sole QA에 인계 중이다.

2026-10-08 추가 사용자 지적에 따라 손잡이 공통 rail과 일반 저장의 보조 복구 구조를 다시 수정 중이다.
COMMON_RAIL100의 root 사본 점검은100개 고유 파일 hash 일치·issues0
(`/tmp/lds-manual-commonrail100-root-archive-audit-20261008.json`)이며 복구 변경은 이 후보에 없다.
실제 제목/문단/이미지·좁은 화면의 rail 읽기 검수는 진행 중이다. 저장 helpere196d0a0은
open/restore마다 독립 UUID/null revision, CONFLICT 발생 시 같은 snapshot을 새 ID에 한 번만
저장하고 기존 기록을 덮어쓰지 않는다. actual prepareDocumentRecord CAS+autosave의 관련15
검사 통과 보고(125.18ms)와 테스트 assertions를 root가 대조했다. 두 restore 세션의 독립 저장,
최신 pending 편집·formal IDs/assets/opaque metadata·교체 뒤 늦은 응답 보호와 quota no retry를
포함한다. Parent의 충돌 해결 header/dialog 제거·새 recovery revision 소비 통합과 화면 검수는
아직 미완료이며 이 source 검사로 사용자 문서/실 IDB/파일 저장 완료를 주장하지 않는다.

2026-10-08 사용자 후속: 블록 손잡이의 긴 native title 설명이 본문 위로 나오는 캡처를 확인했다.
`apps/editor/src/ui/canvas-drag.mjs`의 메뉴 손잡이(onMenu)에서 title을 제거했다.
aria-label/aria-keyshortcuts와 legacy 비메뉴 설명은 유지한다. Node 문법·diff 검사가 통과했고
44589가 수정된 모듈을 제공함을 확인했다. 원사용자 탭의 강제 reload/문서 조작은 하지 않았다.
이는 기존 FOCUSCOMPACT99 이후의 작은 source 변경이며 과거 native 근거를 새 source 전체로 승계하지 않는다.

최초 점검 당시 에디터는 일반적인 문서 작성 동작과 화면의 역할이 일치하지 않았다. A4 위에 문구별 입력칸을 붙인 구조 때문에 문단 이동·삭제·실행 취소가 끊기고, 내용 추가·검토·출력·복구 작업이 여러 곳으로 나뉜다. 기본 입력 규칙과 작성 화면의 구조를 먼저 바로잡는다.

- 상태: **active working audit, Dwdc/CQh 화면 개선 반영 수락; A4 경계 P1·selection caret·목차/속성 수정판 source 동결, 통합 native/제품 반영 단계로 인계**, 2026-10-07. 최초 점검 표와 화면은 수정 전 기준이며, 단계별 source·native·서버 반영을 후속 기록에서 구분한다. 전체 편집 완료 상태가 아니다.
- 점검일: 2026-10-06, 한국 시각.
- 범위: Manual 저장소의 현재 로컬 편집 UI, 브라우저 로컬 저장 모드. 인증 host 기능은 이번에는 소스 대조 범위다.
- 기준 소스: HEAD `f135bc0d54cf605140b74e0af62b7ac8521a600d`에 기존 미커밋 UI 변경을 포함한다. [파일별 SHA256](assets/manual-editor-ui-audit/source-fingerprints.json)으로 대상을 고정한다.
- 환경: Codex IAB, 기본 1280×720, 추가 760×740·390×844. viewport 변경은 점검 뒤 해제했다. 원래 작성 중인 문서와 탭은 수정하지 않았고 임시 탭의 점검 문서는 저장하지 않았다.
- 수명주기: 해결 전까지 유지. 수락 기준을 통과하면 확정된 상호작용 규칙은 durable 문서로 승격하고, 이 감사는 회귀 원인 보존 여부에 따라 archive한다.

[실행 계획](manual-editor-plan.md)과 [모델 계약](manual-editor-model-contract.md)을 함께 따른다. 기존 28개 모델·파일 경계 검사 통과는 기본 타이핑이나 화면 사용성의 통과를 의미하지 않는다. 최초 감사에서는 앱 소스를 바꾸거나 전체 suite를 다시 실행하지 않았다. 후속 구현과 검증 범위는 아래와 같다.

## 현재 읽을 기준 — 2026-10-07

현행 진입점은 `/manual.html`의 단일 편집기다. 작성 종이는 210×297mm 고정이며 넘친
내용은 자동 쪽으로 이어진다. 별도 작성/미리보기 전환은 제거했고 출력은 파일 메뉴에서
연결한다. 본문 옆 `+`와 손잡이, 상단 `+`, slash 및 부분 서식을 사용한다. footer는
편집 위치/총쪽수/A4를, header는 저장 상태를 표시한다. 아래 v1·연속 작성·옛 푸터
와이어프레임은 이력이며 현행 계약으로 사용하지 않는다.

현재 제품은 `manual-DwdcZC6x.js`/`manual-CQhRuthu.css`다. 상단과 본문 삽입은 같은
검색 메뉴를 쓰고, 블록 작업은 손잡이와 본문 Ctrl/⌘+/·ContextMenu·ShiftF10으로
접근한다. 상단 `···`, URL 작성 UI/CtrlK 가로채기와 상시 코드 버튼을 제거했다.
선택 서식의 인라인 코드/ModE·입력 규칙과 기존 링크 데이터는 유지한다.
실제 오류는 재시도 가능한 alert band로 정상 footer 상태와 구분한다.

후속 모델 감사에서 자동으로 갈라진 본문 첫머리의 Backspace가 본문을 반복 제목에
합치고, 다음 제목 동기화에서 그 내용을 지우는 P1을 실제 PM transaction으로 재현했다.
현재 Dwdc/CQh에는 이 수정이 들어 있지 않다. 사용자 원본 자료는 건드리지 않았다.
페이지 관리 목차 후보와 P1을 별도 동결·native 수락한 뒤 반영하며, 자세한 경로와
담당은 이 문서 마지막 기록을 따른다.

| 현재 경계 | 근거와 상태 |
|---|---|
| 메뉴·손잡이·푸터·아이콘 | 자동 선택 제거/기존 명시 범위 보존과 관련 native 수락. 상시 단축키 바 제거. 공용 아이콘의 slash/작업 메뉴·좁은 프레임과 실제 편집 위치·저장 오류 수락 |
| 콜아웃 우측 흰 공간 | 외부 본문 재사용/한 개 생성, 파란 내부는 caret만 이동. 실제 생성/입력 Undo와 서버 반영 수락 |
| A4 입력과 실제 커서 | 기본 Enter 넘김/한 UndoRedo와 실제 커서 가시 수락. 초기 긴 합성 파일 분할·새 복사본 저장 수락 |
| A4 오류 판정 | 간격에 따른 push/pull 반복을 실제 합성 화면에서 재현하고 수정판2쪽/경고0/UndoRedo 수락. 제목/빈 자동 쪽 key·한도 오판을 수정하고 실제3쪽 제목/readonly·빈3→1쪽·원8→16쪽 저장0/history0 수락 |
| 저장 경계 | 실제 memory CAS와 A4 transaction 연결에서 지연 저장 뒤 최종 페이지/ID/marks/자산 보관과 전환 수락. 초기 saved8→16쪽 및 빈 auto2쪽 제거의 저장0/history0 native 수락 |
| 링크·코드 도구 | 사용자 지시에 따라 URL 작성 UI·CtrlK와 상시 코드 버튼 제거, 선택 인라인 코드/ModE·입력 규칙·기존 링크 데이터 보존을 native/제품 수락. CiRE 이전 링크 작성 검사는 당시 기능의 이력 |
| 페이지·본문 컨트롤 | 페이지/표지 이름표, 본문 +/손잡이 가로 배치, 현재 쪽 뒤 페이지 추가와 같은 쪽 본문 추가 및 한 UndoRedo native 수락. 390px 패널 겹침 수정과 메뉴 e62의1px 중립 표시도 수락해 CiRE/ILW로 제공 |
| 현재 제품 통합 | Core focus·빈 콜아웃·표 cell→부모 table 작업·본문 키보드 메뉴·최종 menu box·빠른 wheel/첫 방향키·반응형 패널 교정을 수락.5P2/3개 시각 계층과 추가 resize의 수정판 Dwdc/CQh, HTML/10assets byte/hash 일치 |
| 선택된 블록 자체의 A4 분할 | BEF/Da6 독립 native에서 받는 쪽24본문 뒤 이동해 callout head/tail+본문+todo4개 전체 선택, 한 UndoRedo, 실제11997B 파일 보존 수락. root의35개 원 객체 ID·내용·marks·meta 대조 불일치0. 역방향/held-pointer는 별도 |
| 자동 A4 경계 입력 P1 | efef kernel의 실제 Backspace→planner title-sync에서 EFGH4자 유실. 모델3fdb의 관련57건과 selection137cec 관련28건 수락, 새 native/제품 반영 미수락 |
| 논리 편집 단위 | scalar 작업은 물리 fragment 단위라는24건 감사 결과. 자동 분할은 표시이며 전체 원 블록/명시 page group을 작업 단위로 삼는 후속 계약을 새로 확정. 기존 명시 계약 위반으로 소급하지 않음 |
| 전체 수락 | OS 한글 조합·실제 터치/200%·독립 PDF 등 남은 환경을 포함해 [재설계 §14](manual-editor-redesign.md#14-노션-기본-편집-목표와-수락--2026-10-07)에 유지. 전체 완료로 표시하지 않음 |

최신 source/build와 개별 실패·수정·native 범위는 아래 후속 기록을 따른다. HTTP200이나
소스 변경만으로 실제 화면 수락을 주장하지 않는다.

## 1차 수정 후속 — 2026-10-06

기본 입력·삽입·오류 복구·좁은 화면의 1차 수정을 로컬에 반영했다. **감사의 종료 조건 전체가 통과한 상태는 아니다.** [후속 소스 해시와 빌드 식별](assets/manual-editor-ui-audit/follow-up-source-fingerprints.json)은 최초 스크린샷의 대상과 별개다. 기존 화면/해시는 수정 전 재현 근거로 유지한다.

| 대상 | 반영 내용 | 확인 수준 |
|---|---|---|
| E01·E02 | 본문 시작/중간/끝과 같은 문단 내 선택 범위를 Enter로 분리. 빈 문자열을 유지하고 `새 문단`을 데이터로 넣지 않음. 일반 본문 사이 Backspace/Delete 병합과 단일 undo. 삭제될 블록에 unknown metadata가 있으면 자동 병합하지 않음 | 실제 PM transaction/history 테스트 통과. DOM 키 입력은 재검증 대기 |
| E03·E04 | 입력칸 끝/시작에서 방향키로 다음/이전 편집 가능한 문구로 이동. undo/redo 후 PM 선택 경로와 offset을 해당 리비전의 캔버스에 복원. 편집 중 보류한 화면을 이전 상태로 되돌릴 때 DOM도 새 리비전으로 재구성 | 선택/undo 모델 검사 통과. 실제 DOM focus·스크롤은 미확인 |
| E05 | 문자열 목록 Enter 분리, Backspace/Delete 병합, 마지막 빈 항목 Enter로 본문 전환. 단계 제목 Enter는 설명으로 이동하고 설명 Enter는 다음 단계 생성. 그림과 unknown 필드는 원래 단계에 보존 | PM 모델 검사 통과. 중간 빈 항목 종료와 이름/값 목록 키 규칙은 후속 |
| E06·E07 | 공개 Core Callout의 제목/본문 직접 편집. 없는 단계 설명에도 편집 전용 빈 자리 제공. 단순 focus로 absent 필드를 만들지 않고 실제 입력 시 모델에 추가 | optional slot/원본 비변경 검사 통과. Callout DOM 조작은 미확인. 인용문·이름/값 목록은 속성 편집 유지 |
| E08·B04 | 본문 위 `내용 삽입` 메뉴에서 종류를 바로 선택. 삽입 위치 안내와 지원되는 텍스트로 focus 이동. 빈 페이지에 `본문 작성하기` 제공 | 빌드·소스 확인. 실제 선택/focus는 미확인 |
| L01–L07·B10·B11 | 중복 도구 줄 제거, 페이지 번호 목록과 제목 두 줄 제한. 작은 화면의 페이지 목록 접기, 속성 drawer, 제목/저장/오류 상태 표시. `작성 보기`는 가로폭에 맞추고 `A4 맞춤/100%`는 출력 검토용. 다음 단계 버튼을 문서 아래 절대 위치에서 상단 도구로 이동 | CSS/빌드 확인. 1280/760/390 실제 시각 재검증 대기 |
| L08·L09·B13·B14 | 넘친 페이지 번호를 문서 전체 범위로 명시. 모델 오류와 현재 A4 배치 문제를 같은 목록/개수로 표시. 위치 선택 시 검토 창 닫기. 누락 그림 위치에 다시 선택 버튼 추가 | 소스·빌드 확인. 오류 주입·위치 이동 재검증 대기 |
| B12·B15·B16 | JSON 열기 오류를 파일 선택 창 안에 표시하고 재선택 허용. 연결 없는 출력 이력 기능 감춤. Ctrl/Cmd+S 저장. 가져온 문서/새 문서는 실제 저장 전까지 미저장 상태를 유지해 문서 전환 시 저장 대상에서 빠지지 않게 함 | 파일 검증 기존 검사와 빌드 통과. UI 파일 실패/저장 전환은 재검증 대기 |

검증 명령:

```sh
node --test tests/editor-model.test.mjs tests/editor-model-runtime.test.mjs apps/editor/tests/step-controls.test.mjs apps/editor/tests/browser-documents.test.mjs
node apps/editor/run.mjs build --runtime ../lk-design-system
```

- 빠른 검사 **38/38 통과**, Vite 빌드 성공. 모델·sidecar·unknown 필드 보존과 IME composing guard를 포함한다. 실제 OS IME 통과를 뜻하지 않는다.
- 최종 주요 번들: `editor-RfnPW8P_.js`, `preview-BXCQlxLW.js`. 빌드에 기존의 큰 chunk 경고가 남아 있다.
- 현재 로컬 44589의 에디터·미리보기 HTML과 이 번들의 GET 200을 확인했다. 브라우저 렌더링 통과를 의미하지 않는다.
- CUA가 에디터 URL 접근을 보안 정책으로 차단해 UI/화면 캡처는 재실행하지 않았다. 다른 브라우저 제어 경로로 우회하지 않았다. 따라서 이전 11개 브라우저 검사나 최초 감사 화면을 이 빌드의 통과 근거로 승계하지 않는다.

남은 작업은 여러 입력칸에 걸친 선택·편집, 인용문/이름·값 목록의 직접 편집, 비본문 경계의 빈 블록 삭제, 넓고 긴 표의 재구성, 동시 탭 저장 충돌, 저장 실패/인증 host/실제 입력기 검증이다. 여러 입력칸 선택 편집은 지원될 때까지 변경을 막고 안내하며, 단일 문단 안 선택 범위의 Enter는 지원한다. 작성 보기의 reflow를 A4 배치 통과로 판단하지 않고 A4 보기 확인 전에는 브라우저 인쇄를 활성화하지 않는다.

## 파일 메뉴 후속 수정 — 2026-10-06

사용자가 제공한 1170×900 화면에서 파일 메뉴의 기본 펼침 표시, 중앙 정렬된 버튼 묶음, 뒤 도구 글자가 비치는 배경을 확인했다. 에디터 CSS가 존재하지 않는 `--color-semantic-background-normal`을 참조해 배경 선언이 무효가 되는 원인을 찾았다. 앞선 빌드/모델 검사로 시각 품질을 확인할 수 없었던 실제 누락이다.

- 파일 `details/summary`를 공개 LDS Core `DropdownMenu`와 기존 `Button`으로 교체했다. 기본 삼각형 표시를 없애고 불투명한 메뉴 면, 왼쪽 정렬 명령, 명령 실행 후 닫힘과 Core의 키보드/외부 클릭 처리를 사용한다. iframe 문서로 focus가 넘어갈 때도 닫도록 연결했다.
- 긴 저장 설명은 메뉴에서 제거했다. 저장 위치는 기존 하단 상태 표시에서 확인한다.
- 에디터 shell과 preview의 잘못된 배경 토큰을 정식 `--color-semantic-background-normal-normal`로 교정했다. 같은 원인이 있던 삽입 패널과 속성/대화창도 함께 대상이다. Core/Theme 원본은 수정하지 않았다.
- 검증: Vite 빌드 성공, 두 CSS 파일의 색상 토큰이 Theme/Core 정의에 모두 존재함을 확인, diff whitespace 검사 통과. 로컬 서버의 HTML과 최신 JS/CSS GET 200 확인. 이 변경은 입력 모델을 바꾸지 않아 모델 suite를 반복하지 않았다.
- 빌드: `editor-DvHSPdoB.js`, `preview-J6pLrlve.js`. 실제 메뉴 클릭·Escape·iframe focus와 화면 재캡처는 기존 브라우저 URL 정책 차단으로 미실행이다. 사용자 제공 화면은 수정 전 근거이며 수정 후 통과 근거가 아니다.

## 판정과 근거 구분

- **실측**: 현재 UI에서 직접 조작·화면/접근성 트리 확인. 이전 턴의 같은 빌드에서 재현한 기본 입력 결과도 포함한다.
- **소스**: 구현에서 확인한 동작 또는 위험. 오류 주입·실기 검증을 대신하지 않는다.
- **미확인**: 별도 환경이나 오류 주입이 필요한 수락 항목.
- **제안**: 다음 구현이 지켜야 할 동작. 현재 제공되는 기능으로 해석하지 않는다.

P0은 일상적인 작성·데이터 보존을 막는 문제, P1은 발견·복구·화면 접근을 어렵게 하는 문제, P2는 효율과 후속 완성도 항목이다. 데이터 손실이 실제 발생했다는 뜻으로 P0을 사용하지 않는다.

## 일반 편집 동작에서 벗어나는 문제

| ID | 우선순위 | 재현과 현재 결과 | 기대 동작과 수락 기준 | 근거 |
|---|---|---|---|---|
| E01 | P0 | 본문을 `ABCDEF`로 바꾸고 Home → Enter. 원문 뒤에 실제 문자열 `새 문단`이 추가됨 | 커서 위치에서 분리. 맨 앞은 빈 앞 문단, 맨 뒤는 빈 다음 문단. 안내는 placeholder이고 문서 데이터에 들어가지 않음 | 실측, `appendContent` |
| E02 | P0 | 새 문단을 비운 뒤 Backspace. 빈 블록이 남고 `확인 필요`가 생김 | 빈 블록 제거 또는 앞 문단과 병합, 커서·undo 복원. 마지막 블록에는 입력 가능한 빈 자리 유지 | 실측 |
| E03 | P0 | 본문 끝에서 ↓. 같은 입력칸에 머무름 | 방향키로 앞뒤 문단 이동. 여러 문단의 키보드 선택·잘라내기·붙여넣기를 하나의 문서로 처리 | ↓ 실측, 다중 선택은 미확인 |
| E04 | P0 | 문구를 바꾸고 Ctrl+Z. 글은 복원되지만 focus가 iframe 문서로 빠짐 | undo/redo 후 편집 위치를 보존하고 재클릭 없이 계속 입력 | 실측 |
| E05 | P0 | 목록 항목에서 Enter. 다음 항목 대신 같은 항목의 줄바꿈. 단계 제목 Enter도 줄바꿈이나 설명 Enter는 다음 단계 생성 | 목록의 다음 항목·빈 항목 종료와 단계 제목→설명→다음 단계의 규칙을 분리해 일관되게 제공 | 실측 |
| E06 | P1 | 본문은 클릭 즉시 편집되지만 Callout 본문 클릭은 컨테이너 선택에 그침. 인용문·이름/값 목록도 직접 편집 annotation이 없음 | 편집 가능한 문구는 동일한 클릭·커서 동작. 제한된 항목은 이유와 바로 실행할 편집 동작 표시 | Callout 실측, 나머지 DOM·소스 |
| E07 | P1 | 설명 필드가 생략된 단계에는 본문 입력 자리 자체가 없고, 빈 문자열 설명에는 입력 자리가 있음 | 사용자에게 같은 빈 상태로 보이고 그 자리에서 설명 추가 가능. absent/empty 보존은 모델 책임 | 6쪽, 설명 입력 1개/단계 2개 실측 |
| E08 | P1 | 내용 추가가 `내용 추가·설정 → 종류 선택 → 내용 추가`에 위치 | 커서 옆 삽입 메뉴 또는 공통 `삽입`에서 한 번 선택. 삽입 위치를 미리 표시하고 삽입 후 본문에 focus | UI·소스 |

원인은 [canvas-input.mjs](../../apps/editor/src/ui/canvas-input.mjs)의 개별 contenteditable과 [main.jsx](../../apps/editor/src/main.jsx)의 부분적인 문단 명령, [preview-main.jsx](../../apps/editor/src/preview-main.jsx)의 블록별 편집 annotation에 있다. 모델의 unknown 필드·sidecar·단일 undo 보존은 유지하면서 문서 전체 선택과 커서 이동을 설계해야 한다. 단축키 몇 개만 추가한 뒤 해결됐다고 판정하지 않는다.

비교 기준으로 Notion의 [키보드 동작](https://www.notion.com/en-gb/help/keyboard-shortcuts)은 Enter와 Shift+Enter, 블록 선택·이동·삭제를 구분하고, [내용 작성 안내](https://www.notion.com/en-gb/help/writing-and-editing-basics)는 작성 위치의 삽입 메뉴를 제공한다. Word의 [텍스트 선택](https://support.microsoft.com/en-us/word/select-text)은 문서 범위 선택을 지원한다. 제품마다 세부 키 규칙은 다르므로 어느 제품의 모든 동작을 그대로 복제하는 요구는 아니다.

## 레이아웃 점검

| ID | 우선순위 | 현재 화면과 문제 | 변경 방향 |
|---|---|---|---|
| L01 | P1 | 1280×720에서 문서 상단은 약 y=248에 시작. 앱 헤더·쪽 정보·작성 도구·배율이 여러 줄을 차지 | 전역 명령 한 줄과 작성 도구 한 줄로 정리. 쪽/배율은 하단 상태 영역으로 이동 |
| L02 | P1 | 긴 페이지 제목 하나가 왼쪽에서 약 370px 높이를 차지하며 뒤 페이지와 추가 버튼을 아래로 밀어냄 | 제목은 두 줄 제한, 전체 제목은 선택/접근성 이름으로 확인. 페이지 추가는 목록 하단 고정. 세부 블록 목록은 접기 |
| L03 | P1 | 페이지 썸네일은 실제 내용을 반영하지 않는 동일한 줄 모양 | 실제 미리보기로 만들거나 페이지 번호 목록으로 단순화. 가짜 미리보기는 제거 |
| L04 | P1 | `설정`과 `내용 추가·설정`이 같은 패널을 제어하며, 패널에서 문구까지 다시 편집 | 문구는 본문에서 편집. 오른쪽은 선택한 그림·표·페이지의 속성만 표시. 두 진입점 통합 |
| L05 | P1 | 760px에서 패널을 열면 문서가 숨겨짐. `문서로 돌아가기`는 동작하지만 문서를 보며 설정할 수 없음 | 필요한 속성만 drawer에 표시하고 선택 위치를 유지. 빈 페이지 입력은 drawer를 거치지 않음 |
| L06 | P1 | 390px에서 148px 왼쪽 목록이 유지되고 A4가 약 20% 수준으로 축소됨. 헤더는 다단, 제목·저장 상태·notice가 숨겨짐 | 페이지 목록은 접고 읽을 수 있는 폭의 작성 모드 제공. A4 출력 미리보기는 별도 전환. 오류/저장 상태는 숨기지 않음 |
| L07 | P1 | `다음 단계`가 절차 아래에 절대 배치돼 다음 Callout 상단과 겹치거나 닿음 | 삽입 가이드는 내용과 겹치지 않는 편집 전용 영역 또는 선택 툴바에 표시. 인쇄 지오메트리 유지 |
| L08 | P1 | 페이지 넘침 안내가 문서 전체에 대한 것인지 현재 쪽에 대한 것인지 불명확. 정상인 빈 3쪽에서도 넘침 안내 표시 | 전체 오류 수와 현재 쪽 오류를 구분. 페이지 번호와 수정 행동을 함께 표시 |
| L09 | P1 | 누락 이미지는 브라우저 깨진 이미지 표시만 보임 | 원래 영역에 `이미지를 찾을 수 없습니다`와 `이미지 다시 선택` 제공. src는 상세 정보로 이동 |
| L10 | P1 | 10열·24행 표가 첫 열을 제외한 열에서 짧게 꺾이고 A4 밖으로 넘침 | 열 구성 변경·표 분할 동선을 제공. 읽기 어려운 글자 축소로 문제를 감추지 않음 |

A4 크기와 Manual 매체 규칙은 유지한다. **작성 화면의 읽기 크기**와 **출력물의 실제 지오메트리**를 명시적으로 구분하고 출력 미리보기에서 원래 결과를 확인한다. 자동 페이지 나눔 엔진 도입은 이번 점검의 확정 결정이 아니다.

## 제안 와이어프레임

다음은 동작과 우선순위를 검토하기 위한 구조안이다. px 수치는 최종 디자인 규격이 아니다.

### 데스크톱 작성 화면

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 문서 메뉴 ▾  문서 제목              이 브라우저 · 저장됨  저장  내보내기 │
├──────────────────────────────────────────────────────────────────────┤
│ 실행 취소  다시 실행  │ 삽입 ▾  본문/제목 ▾ │            미리보기       │
├──────────────┬──────────────────────────────────────┬────────────────┤
│ 페이지       │                                      │ 선택 속성    × │
│ 01 시작하기  │ 제목                                 │ 그림 선택 때만 │
│ 02 항목 확인 │ 본문 커서                            │ 이미지 교체    │
│              │ + 삽입 위치                         │ 캡션 / 대체문구 │
│ 제목 두 줄   │ 1. 단계 제목                         │ 크기 / 자르기  │
│ 이내로 표시  │    단계 설명                        │                │
│              │    [이미지 또는 이미지 넣기]        │ 문구 중복 입력 │
│              │ 2. 다음 단계                         │ 영역은 제거    │
│ + 페이지     │                                      │ 기본은 닫힘    │
├──────────────┴──────────────────────────────────────┴────────────────┤
│ 2 / 8쪽    배율 100% ▾      확인 필요 2건 → 해당 위치  │ 저장 상태     │
└──────────────────────────────────────────────────────────────────────┘
```

- 본문 클릭은 커서 배치, 그림 클릭은 선택과 속성 표시, 페이지 클릭은 해당 쪽 이동으로 구분한다.
- `삽입`은 본문·제목·절차·그림·표·안내·인용문을 같은 위치 규칙으로 추가한다. `/`는 보조 진입점으로 고려하되 유일한 방법으로 두지 않는다.
- 빈 문서와 빈 페이지에는 `내용을 입력하세요`라는 입력 자리와 삽입 동작을 제공한다. 입력 안내를 실제 저장 문구로 넣지 않는다.
- 페이지 목록은 탐색, 본문은 작성, 속성은 선택 대상 설정을 담당한다. 전역 설정에 작성 기능을 넣지 않는다.

### 좁은 화면 작성

```text
┌─────────────────────────────────┐
│ ☰ 페이지   문서 제목       더보기 │
│ 변경됨 · 이 브라우저       저장  │
├─────────────────────────────────┤
│ 실행 취소   삽입 ▾    미리보기   │
├─────────────────────────────────┤
│ 읽을 수 있는 크기의 제목과 본문 │
│                                 │
│ 커서와 선택 위치 유지            │
│                                 │
├─────────────────────────────────┤
│ 2 / 8쪽         확인 필요 2건    │
└─────────────────────────────────┘
```

페이지 목록은 임시 drawer로 열고 본문 폭을 상시 차지하지 않는다. 속성 drawer는 닫으면 선택 위치로 복귀한다. 인쇄 미리보기의 `화면에 맞춤` 축소는 작성 모드의 기본 글자 크기와 분리한다. 390px에서 지원할 작성 범위와 터치 선택은 실기 수락 전까지 미확정이다.

### 오류와 출력 화면

```text
본문 옆 오류 패널                    문서 열기 대화상자
┌──────────────────────────┐       ┌─────────────────────────────┐
│ 확인 필요 2건          × │       │ 문서 열기                 × │
│ 2쪽 · 이미지를 찾을 수 없음│       │ [파일 선택]                 │
│ [위치로 이동] [다시 선택] │       │ 파일 형식을 읽을 수 없습니다 │
│ 5쪽 · 표 분량 초과        │       │ 다른 파일을 선택하세요       │
│ [표로 이동] [분할 안내]   │       │ [다시 선택]           [취소] │
└──────────────────────────┘       └─────────────────────────────┘

내보내기 → 초안 PDF / HTML / 편집 가능한 문서 파일
         → 검토본: 검토 조건 충족 시 선택 가능
         → 생성 중 / 실패와 재시도 / 완료와 파일 열기
```

오류 위치를 선택하면 해당 내용을 편집할 수 있어야 한다. 창 뒤로 focus를 보내지 않는다. 파일 열기 실패는 그 창 안에서 설명하고 원래 문서를 보존한다. 브라우저 인쇄 요청은 파일 생성 완료로 표시하지 않는다.

## 버튼별 필요성과 목적

`유지`는 현 구현 전체의 통과를 뜻하지 않는다. 표시 조건과 focus 복원까지 수락해야 한다.

| 현재 버튼 또는 도구 | 사용자 목적 | 판단과 제안 위치 | 활성 조건과 후속 동작 |
|---|---|---|---|
| 문서 제목 | 문서 식별·이름 변경 | 유지, 헤더 인라인 이름 변경 | 긴 제목 줄임표, 전체 이름 접근 가능, Enter 적용/Escape 취소 |
| 실행 취소 / 다시 실행 | 방금 작업 복원 | 유지, 공통 작성 도구 | 가능할 때 활성, Ctrl/Cmd+Z 연계, 커서 복원 |
| 설정 | 선택 속성 열기 | 이름을 `속성`으로 변경 | 선택 대상에 해당하는 속성만 표시 |
| 내용 추가·설정 | 내용 삽입과 속성 열기 | 혼합 버튼 제거, `삽입`으로 분리 | 현재 위치가 없으면 삽입 위치 먼저 선택 |
| 인쇄 / PDF | 출력 파일 얻기 | `내보내기` 아래로 통합 | 오류별 이유·수정 이동 제공. IAB 인쇄 지원 확인 필요 |
| 검토·출력 | 오류 확인·검토·출력 | 오류 패널, 검토, 내보내기로 역할 분리 | 브라우저 모드에서 쓸 수 없는 host 액션은 노출하지 않음 |
| 저장 | 현재 편집 보관 | 유지, 저장 대상·상태와 인접 | 초안도 저장 가능. Ctrl/Cmd+S. 실패 시 재시도·파일 백업 |
| 파일 메뉴 | 새 문서·열기·백업 | `문서` 메뉴로 유지 | 선택 후 닫힘, Escape/외부 클릭 닫힘, focus 복귀 |
| 새 문서 / 열기 | 문서 전환 | 문서 메뉴 유지 | 변경 보존 규칙 통일. 전환 과정에서만 조용히 자동 저장하지 않음 |
| 문서 파일 내려받기 | 다른 환경으로 이동·백업 | 내보내기의 `편집 가능한 문서 파일` | 이미지 포함 여부 안내. 받은 파일을 재열어 검증 |
| 초안 복구 저장 / 보관 초안 복원 | 미완성 보관·복구 | host 모드의 복구 메뉴 | 기준 리비전 차이와 덮어쓰기 대상을 명확히 표시 |
| 페이지 항목 / 페이지 추가 | 탐색·페이지 구성 | 유지, 추가는 목록 고정 영역 | 마지막 페이지 삭제 제한. 긴 제목·다수 페이지 대응 |
| 보기 배율 | 읽을 크기 조절 | 하단으로 이동 | 현재 배율 숫자 표시, 100%·맞춤 구분 |
| 스크린샷 | 그림 삽입 | `삽입 → 이미지`, 단계 안에서도 제공 | 일반 이미지도 받으므로 이름을 `이미지`로 통일 |
| 화면 넣기 | 해당 단계의 그림 연결 | 단계 안에 유지 | 빈 그림은 `이미지 넣기`, 기존 그림은 `이미지 교체` |
| 다음 단계 | 절차 계속 작성 | 유지, 선택 절차 내부 삽입 위치 표시 | 기존 내용과 겹치지 않음. 키보드와 동일한 결과 |
| 추가할 내용 / 내용 추가 | 블록 종류 선택·생성 | 한 삽입 메뉴로 통합 | 종류 선택 즉시 삽입하고 새 내용으로 focus |
| 위로 / 아래로 이동 | 순서 변경 | 선택 메뉴와 키보드 대안으로 유지 | 첫/마지막 항목 제한 이유, 문서 안 위치 표시 |
| 삭제 | 선택한 블록 제거 | 선택 메뉴 유지 | 대상 이름 표시, undo 가능, 빈 문서 탈출 방지 |
| 행·열·항목 추가/삭제/이동 | 표와 목록 구성 | 선택한 표/목록 도구에 배치 | 표 마지막 열 제한, 현재 셀 기준 삽입, 파괴 범위 표시 |
| 세부 설정 / 속성 적용 | 그림 폭·crop·번호 변경 | 속성 drawer의 공통 적용 방식으로 정리 | 텍스트는 즉시 반영인데 속성만 적용 필요하다는 차이를 명시. 변경 없으면 적용 비활성 |
| 필드 추가 / 필드 제거 | 선택적인 설명·표지 등 변경 | 사용자 목적 이름으로 변경 | `설명 추가`, `표지 제거`, `자르기 해제`. 데이터 필드 용어는 숨김 |
| 원본 이미지 가져오기 / 이미지 선택 | 그림 교체 | 하나의 `이미지 교체`로 통합 | PNG/JPEG/WebP 계약 통일. 현재 세부 설정 input의 SVG 허용과 실제 거부 불일치 수정 |
| 선택한 경계에서 단계 나누기 | 넘치는 절차 분리 | `다음 페이지로 나누기` | 단계 번호·미리보기로 경계 선택. 0 기반 인덱스 노출 금지 |
| 선택 구성 옮기기 | 다른 페이지로 블록 이동 | `다른 페이지로 이동` | 대상 페이지·절차를 사람이 읽는 이름으로 표시 |
| 확인 필요 / 오류 위치 버튼 | 문제 해결 | 페이지별 오류 패널로 통합 | 오류 수 일치, 위치 이동 후 가리는 modal 해제 |
| 검토 초안 만들기 / 검토 기록 저장 | 담당자의 문맥 판단 보관 | 검토 화면에서 유지 | 현재 문서 기준 여부·저장 결과 표시. 미연결 모드는 설명 후 비노출 |
| 출력 / 이력 새로고침 / 결과 열기 | 출력 실행·결과 조회 | 내보내기 화면에서 유지 | host 연결·진행 중·실패 상태별 제공. 미연결에서 새로고침 금지 |
| 출력 시각 검토 기록 | 실제 산출물 검수 | 해당 출력 상세에서 유지 | 최신 결과·검토자·근거 조건 유지, 생성 성공과 검토 통과 구분 |
| 저장 후 계속 / 초안 후 계속 / 버리고 계속 / 취소 | 변경 보존 후 전환 | 복구 대화상자에 유지 | 대상·영향을 명시. 중복 실행 방지, 오류 후 입력 보존 |
| 문서로 돌아가기 / 닫기 | 임시 패널 종료 | 유지 | 이전 커서 또는 호출 버튼에 focus 복원 |

기능이 없어서 disabled인 상태와 잠시 처리 중이라 disabled인 상태를 구분한다. 실패 이유가 필요한 동작은 disabled 버튼 하나로 끝내지 말고 바로 옆 안내와 복구 동작을 제공한다. DOM 경로·원본 JSON·리비전 hash는 진단 상세에 둔다.

## 경계 상황 점검 결과

[합성 입력](assets/manual-editor-ui-audit/boundary-document.json)은 의도적으로 schema상 미완성인 상태를 포함한다. 1쪽 긴 제목/본문, 2쪽 누락 그림, 3쪽 빈 blocks, 4쪽 빈 제목/본문, 5쪽 10열·24행 표, 6쪽 설명 absent/empty, 7쪽 인용문/Callout/이름값 목록, 8쪽 624자 주소다. 복합 입력이므로 개별 오류의 독립적인 검사 순서까지 증명하지 않는다.

| ID | 상황과 조작 | 현재 판정 | 수정 후 통과 조건 |
|---|---|---|---|
| B01 | 긴 제목 3회 반복·본문 16개 | 실측 실패: 목록의 긴 카드가 다른 페이지 탐색을 밀어냄 | 제목 두 줄 제한, 전체 이름 조회, 페이지 추가 항상 접근 |
| B02 | 1쪽 본문이 A4를 초과 | 실측 부분 동작: 넘침 안내·인쇄 차단은 됨, 페이지별 경고와 수정 동선 불충분 | 해당 쪽과 블록 식별, 단계/블록 경계에서 분리 가능 |
| B03 | 누락 그림을 가진 2쪽 선택 | 실측 실패: 깨진 이미지, 그 자리의 교체 버튼 없음 | 영역 보존, 원인과 다시 선택 표시 |
| B04 | blocks가 빈 3쪽 선택 | 실측 실패: 제목만 있고 입력 시작 자리가 없음 | 빈 본문 클릭/키보드로 즉시 작성 |
| B05 | 빈 제목·본문의 4쪽 | 실측 부분 동작: placeholder와 입력칸은 있음. 복합 오류에서 해당 문제는 별도 목록에 나오지 않음 | 빈 초안 유지, 저장 가능, 출력 전 필요한 항목 모두 안내 |
| B06 | 10열·24행 표 | 실측 실패: 짧은 폭으로 반복 줄바꿈·A4 넘침 | 읽을 수 있는 표 재구성/분리 도구, 헤더 반복 정책 결정 |
| B07 | 단계 설명 absent와 빈 문자열 비교 | 실측 실패: 빈 문자열일 때만 문서 내 설명 입력 가능 | 같은 빈 상태 UI, 모델 차이는 무손실 보존 |
| B08 | 7쪽 일반 목록과 이름/값 목록, 인용·안내 | DOM·소스 확인: 직접 편집 방식이 서로 다름 | 모든 문구에 일관된 편집 진입 |
| B09 | 긴 주소 624자 | 실측 표시 통과: 해당 주소는 내용 폭 안에서 줄바꿈 | 공백/하이픈이 전혀 없는 URL·CJK·emoji 조합은 별도 재검증 |
| B10 | 760×740, 속성 열기·문서로 돌아가기 | 실측 부분 동작: 돌아가기 가능, 문서와 속성 동시 확인 불가. 저장 상태와 notice 숨김 | 선택/스크롤 보존, 중요한 상태 유지 |
| B11 | 390×844 | 실측 실패: 왼쪽 목록 상시 유지, 본문 극소 축소, 제목·상태 숨김 | 접는 탐색, 읽을 크기, 주요 행동과 오류 접근 |
| B12 | 파일 내용이 `{ invalid json`인 JSON 열기 | 실측 실패: modal 내부 오류 없음. 닫은 뒤 footer에 영문 parser 오류. 기존 문서 보존은 됨 | 파일 선택 위치에 한국어 오류·재선택, 원문 보존 |
| B13 | 복합 오류에서 `1개 확인 필요` 열기 | 실측 실패: footer 수는 schema 첫 오류 1건, 창 안에는 추가 넘침·누락 이미지가 여러 건. schema 원문 노출 | 사용자 문제 단위의 개수와 목록 일치, 페이지/대상 이름 표시 |
| B14 | 검토 창에서 누락 이미지 위치 버튼 클릭 | 실측 실패: 뒤 문서 선택은 바뀌지만 modal이 남아 가림 | 오류 패널에서 바로 수정 또는 modal 닫고 위치/focus 이동 |
| B15 | 미연결 모드의 출력 이력 새로고침 | 소스: 버튼에 연결 여부 gate가 없고 인증 request가 실패함 | 사용할 수 없는 host 기능 미노출, 불필요한 실패 유발 금지 |
| B16 | 로컬 저장과 문서 전환 | 소스: 평소 수동, 새 문서/열기 때 변경분 자동 저장. Ctrl+S 연결 없음 | 일관된 저장 정책, 대상 표시, 실패하면 전환 중단 |
| B17 | 저장소 quota·권한 거부 | 미확인: catch와 백업 안내는 소스에 존재 | 실패 주입 후 dirty 유지, 창 안 오류, 재시도/파일 백업, 전환 중단 |
| B18 | 새로고침·탭 종료 직전 미저장 입력 | 기존 beforeunload 소스 존재, 실제 취소/종료 조합 미확인 | 선택 취소 시 커서/조합/문서 보존, 승인 없이 덮어쓰기 없음 |
| B19 | 동일 문서를 두 탭에서 저장 | 소스 위험: IDB put에 리비전 충돌 검사가 없음, 실기 미확인 | 다른 탭 변경 감지, 복사본 저장 또는 충돌 선택. 조용한 덮어쓰기 방지 |
| B20 | host 409·세션 만료·연결 단절·재시작 | 기존 처리 소스 있음, 이번 빌드 실기 미확인 | 편집 보존, 재연결/새로 읽기/백업 역할 분리, 진행 상태 종료 |
| B21 | 20MB 초과·지원 밖 이미지·손상된 bytes | 크기/종류/디코딩 guard 소스 있음, 이번 UI 오류 주입 미확인 | picker·drop·paste 모두 같은 오류·취소·재시도, 반쯤 생성된 블록 없음 |
| B22 | crop 범위 초과·크기가 다른 이미지 교체 | 검사 소스 있음, 최신 UI 미확인 | 문제 그림 표시, 자르기 해제/재지정, 원본과 이전 편집 복구 |
| B23 | 한글 OS IME 조합 중 Enter·undo·저장 | 미확인. composition guard 소스만으로 통과 불가 | 실제 입력기에서 글자 누락/중복·커서 이동 없음 |
| B24 | 여러 문단 선택·붙여넣기·선택 후 Enter | 미확인, 현재 독립 입력칸 구조에 위험 | 선택 범위 대체·단일 undo·의미 있는 텍스트 순서 보존 |
| B25 | 마지막 페이지·마지막 블록/표 열 삭제 | 소스: 마지막 페이지/열 제한 있음, 빈 블록은 허용 | 빈 본문 즉시 작성, 삭제 범위 명확, undo 복원 |
| B26 | 출력 중 편집·실패·오래된 결과·인쇄 취소 | host 리비전 구분 소스 있음, 최신 UI 미확인. 이전 IAB 인쇄 클릭에 창이 관측되지 않았음 | 생성 성공/인쇄 요청/취소 구분, 이전 결과를 최신으로 오인하지 않음 |
| B27 | 전체 키보드 순회·Escape·focus trap·스크린리더 | 이번에는 부분 동작만 확인 | 전체 keyboard-only 작성과 오류 복구, 비활성 이유 전달, modal focus 복귀 |
| B28 | 200% 브라우저 확대·터치·100쪽·대량 이미지 | 미확인, 합성 8쪽/viewport 축소와 다른 조건 | 주요 명령 접근, 입력 지연/리소스 정리, 사용자에게 지연 상태 표시 |
| B29 | 같은 주소의 구버전·신버전 탭 | 이전 점검 실측: 두 UI 버전 공존 | 문서 보존 후 최신 화면으로 안내, build 식별은 도움말에 표시 |

미확인 항목을 실패로 단정하거나 통과 수에 포함하지 않는다. 복구·동시 탭·실제 입력기·인증 host 검증은 제품 마감 전에 수행한다. 이 감사에서는 브라우저 설정을 바꾸거나 저장소를 고갈시키거나 서버 장애를 만들지 않았다.

## 증거와 재현 절차

1. 같은 빌드의 **별도 임시 탭**을 열고 저장하지 않은 개인 편집이 없는지 확인한다.
2. `파일 → 열기 → 문서 파일 열기`로 합성 입력을 선택한다. `새 문서/열기`는 현재 dirty 문서를 저장할 수 있으므로 사용자 작업 탭에서 수행하지 않는다.
3. 왼쪽에서 각 페이지를 선택하고 표의 B01–B14를 확인한다. 760/390 viewport는 완료 후 원래대로 돌린다.
4. JSON 구문 오류는 별도 임시 탭에서 내용 `{ invalid json`인 파일로 재현한다. 복합 입력을 다시 열다가 자동 저장하지 않도록 유의한다.
5. 완료 후 합성 문서를 저장하지 않고 임시 탭만 닫는다. 원래 사용자 탭의 문서·저장 상태는 유지한다.

| 증거 | 내용 |
|---|---|
| [기본 입력 재현](assets/manual-editor-ui-audit/keyboard-baseline.png) | 이전 같은 빌드에서 빈 문단·undo focus 문제를 재현한 화면 |
| [긴 문서](assets/manual-editor-ui-audit/desktop-long-document.png) | 긴 페이지 카드와 여러 줄 툴바 |
| [빈 페이지](assets/manual-editor-ui-audit/empty-page.png) | 본문 시작 자리 부재 |
| [이미지 누락](assets/manual-editor-ui-audit/missing-image.png) | 깨진 이미지와 교체 동선 부재 |
| [넓은 표](assets/manual-editor-ui-audit/wide-table.png) | 열 폭과 줄바꿈 문제 |
| [단계 설명](assets/manual-editor-ui-audit/optional-step-text.png) | absent/empty에 따라 달라지는 입력 자리 |
| [긴 주소](assets/manual-editor-ui-audit/long-address.png) | 해당 합성 주소의 폭 안 줄바꿈 |
| [760px](assets/manual-editor-ui-audit/narrow-760.png) / [390px](assets/manual-editor-ui-audit/narrow-390.png) | 좁은 작성 영역과 사라지는 상태 정보 |
| [파일 열기 오류](assets/manual-editor-ui-audit/invalid-import.png) | 오류가 modal 안에 없고 뒤 footer에 놓임 |
| [복합 검토 오류](assets/manual-editor-ui-audit/review-errors.png) | 원시 경로/오류와 수정 위치를 가리는 modal |

모든 입력과 화면은 합성 자료다. credentials·운영 제품 데이터는 포함하지 않는다. source 해시가 달라지면 기존 증거를 현재 빌드 통과로 승계하지 않는다.

## 수정 순서와 종료 조건

| 순서 | 작업 | 완료 증거 |
|---|---|---|
| 1 | 연속된 문서 편집과 E01–E05 해결 | 시작/중간/끝 Enter, 빈 Backspace, 방향키, 범위 선택, undo/redo 뒤 즉시 타이핑 |
| 2 | E06–E08, 빈 페이지·optional 입력 통일 | 안내·인용·목록·표·단계 모두 같은 진입 규칙, 실제 안내 문자열 저장 없음 |
| 3 | 작성 도구·속성·오류·출력 역할 재배치 | 위 와이어프레임의 정상/빈/선택/오류 상태, 버튼별 표시 조건과 focus |
| 4 | 760/390·긴 제목·많은 페이지·표 대응 | 실제 화면 캡처와 keyboard-only 완료, 읽기 크기와 출력 결과 구분 |
| 5 | 저장·실패·충돌·인쇄/출력 수락 | B17–B28의 지정 환경 검증과 결과 기록, 데이터 보존 및 재시도 |

각 수정은 해당 재현 시나리오와 무손실 모델 검사를 함께 확인한다. 전체 suite 재실행은 저장 계약·renderer 변경 등 검증 승격 조건이 있을 때 선택한다. UI 모양 변경이나 모델 테스트 green만으로 이 감사를 닫지 않는다.

## 본문 드래그 배치 후속 — 2026-10-06

- 본문 블록과 절차의 각 단계에 이동 손잡이를 추가했다. 텍스트 영역은 기존 글자 선택을 유지하고, 손잡이만 Pointer Events로 이동을 시작한다.
- 놓을 위치를 선으로 표시하고, 이동 원본을 반투명으로 표시한다. 화면 위/아래 경계에서는 자동 스크롤한다. Esc·pointer cancel·창 focus 이탈은 이동을 취소한다.
- 블록은 다른 페이지 및 빈 페이지의 본문으로, 단계는 다른 절차의 단계 사이로 이동한다. 서로 다른 종류로의 이동과 자기 하위 구조로의 이동은 허용하지 않는다. 마지막 항목이 이동해 빈 구조가 남으면 초안으로 보존하고 출력 검증 대상이 된다.
- 실제 모델 변경은 drop 시 한 번의 기존 move transaction으로 처리한다. 이미지·unknown 필드·sidecar를 보존하고 한 번의 undo로 복원한다. 같은 배열의 삽입 위치는 원본 제거 전 gap에서 제거 후 index로 변환한다.
- 손잡이에서 Alt+↑/↓로도 이동할 수 있고, 기존 속성의 위/아래 이동을 유지한다. 이동 후 새 위치의 손잡이로 focus를 요청한다.
- 손잡이·삽입선·상태 안내는 문서 밖의 편집 overlay에 두고 인쇄에서 숨긴다. A4 지오메트리나 저장 JSON에 추가하지 않는다.
- 드래그 중 최신 문서 revision과 어긋나면 이동을 거절하고 다시 시도하도록 안내한다. 편집 직후 아직 화면 반영 중인 경우에도 적용된다.

검증: `node --test tests/editor-model-runtime.test.mjs` **20/20 통과**. 새 3개 검사는 순서 변경 gap/단일 undo, 페이지·빈 페이지·절차 간 payload 보존, no-op/종류 불일치/자기 하위/범위 밖 거절을 확인했다. 빈 페이지는 유효 완성본이 아닌 초안으로 읽어 검증한다. Vite 빌드 성공, 서버의 최신 HTML/JS 응답 확인. [드래그 수정 소스 해시](assets/manual-editor-ui-audit/drag-source-fingerprints.json)를 별도로 보관한다.

현재 브라우저 도구 URL 정책 차단으로 **실제 포인터·터치·Esc·자동 스크롤·손잡이 충돌·A4 인쇄 화면은 재검증하지 못했다.** 모델 검사 통과를 UI 수락 통과로 확장하지 않는다. 1280/760/390 화면과 긴 절차·중첩 columns에서 손잡이 접근성/위치 확인이 다음 검증 항목이다.

## 추가 진입 FAB 후속 — 2026-10-06

사용자가 상단 삽입 도구 줄 대신 우측 하단 LDS 추가 버튼을 요청했다. 기존 상단 `내용 삽입`·`이미지 넣기`·입력 힌트 줄을 제거하고, 문서 캔버스 우측 하단에 공개 Core `Fab`을 배치했다. `Fab`의 기본 크기·색·상태 스타일을 그대로 사용하며 위치만 Manual shell에서 정한다.

- `+`의 접근성 이름은 `내용 추가`. 공개 Core `DropdownMenu`를 위쪽으로 열어 본문·이미지·소제목·절차·표 등 추가 종류를 선택한다. 항목이 많아 짧은 액션 목록용 SpeedDial 대신 스크롤 가능한 메뉴를 사용한다.
- 페이지 추가와 선택된 절차의 다음 단계 추가도 같은 메뉴에 둔다. 왼쪽의 별도 페이지 추가 버튼은 제거한다. 빈 페이지의 본문 시작과 개별 단계의 이미지 추가 같은 문맥 행동은 유지한다.
- 메뉴에는 현재 삽입 위치를 표시한다. 화면 높이에 맞춰 메뉴 높이를 제한하고 작은 화면에서는 버튼의 가장자리 간격을 줄인다.
- 파일 메뉴와 추가 메뉴는 동시에 열리지 않는다. 캔버스 iframe으로 focus 이동, 선택 대상 변경, 속성/페이지 패널 전환, busy 상태에서 추가 메뉴를 닫는다. Escape·키보드 메뉴 이동·외부 클릭·충돌 배치는 LDS 메뉴의 기존 계약을 사용한다.
- 확인: Vite 빌드 및 diff whitespace 검사. 이 후속에서는 모델·저장 로직을 변경하지 않았고 이전 모델 검사를 중복 실행하지 않았다. 실제 브라우저 재검증은 앞서 기록한 URL 접근 정책 제한으로 미실행이다. 사용자 첨부 화면은 수정 전 상단 도구 줄의 근거이며 수정 후 화면으로 표시하지 않는다.

## FAB 브라우저 확인 — 2026-10-06

사용자가 직접 검증을 요청한 후 동일 CUA 도구·동일 IAB URL에 다시 접근했고 이번에는 정상 접근됐다. 보안 정책이나 인증 설정을 바꾸지 않았다. 이전의 접근 제한 기록은 당시 상황이며, 이번 확인 범위는 아래로 한정한다.

- 대상: `editor-Bz31HfW2.js`, 기존 사용자 탭, 1170×900. 시작 시 브라우저 저장됨을 확인하고 새로고침했다.
- 상단 삽입 도구 줄 제거, 우측 하단 LDS FAB 표시 및 메뉴가 위로 펼쳐지는 위치를 실제 화면에서 확인했다.
- 클릭으로 메뉴 열기, Escape로 닫고 FAB로 focus 복귀, Enter로 다시 열고 첫 메뉴 항목으로 focus 이동을 확인했다.
- `본문` 선택으로 첫 페이지 내용이 6개에서 7개로 늘고 새 빈 본문에 focus가 들어갔다. 실행 취소 후 다시 6개와 `브라우저 저장됨`으로 복원됐다. 테스트 변경은 저장하지 않았다.
- 원래 첫 페이지를 선택하고 추가 메뉴를 펼친 상태로 두었다. [검증 화면](assets/manual-editor-ui-audit/fab-verified.jpg).
- 이 검증은 FAB·본문 추가·해당 실행 취소에 대한 근거다. 이미지 파일 선택, 다른 모든 추가 유형, 좁은 viewport, OS IME, 이전 감사 전체를 통과로 확대하지 않는다.

## 손잡이 시각 밀도 수정 — 2026-10-06

사용자가 지적한 핵심은 기능 수가 아니라 화면의 외형이었다. 이전 구현은 모든 블록/단계의 손잡이를 상시 표시하고, 상위 블록과 하위 단계에 손잡이를 겹쳐 배치했다. 문서 전체 선택선·부모와 자식의 hover 점선·텍스트 focus선이 동시에 나타날 수 있었다. 모델 테스트를 통과해도 이 외형을 수락할 근거는 없었다.

일반적인 패턴의 근거:

- [BlockNote Side Menu](https://www.blocknotejs.org/docs/react/components/side-menu): hovered block의 왼쪽에 Side Menu를 제공한다.
- [Notion writing and editing](https://www.notion.com/help/writing-and-editing-basics): 블록에 hover하면 나타나는 손잡이로 블록을 이동한다.

이번 수정은 위의 hover 문맥 패턴을 참고하되 라이브러리를 교체하거나 추가하지 않았다. 다수의 고정 손잡이를 단일 재사용 손잡이로 교체하고, 가장 가까운 hovered/focused 블록만 대상으로 삼았다. 텍스트에서 손잡이로 건너가는 좁은 여백에서는 유지하고 영역 밖에서는 숨긴다. 상위 절차 전체는 기존 개요 이동 경로를 유지한다. 중첩 hover 점선과 상시 전체 선택 테두리, 각 단계의 별도 이미지 버튼을 제거했다. 이미지 추가는 공통 추가 메뉴에서 제공한다.

`apps/editor/tests/canvas-drag.test.mjs` 컨트롤러 검사 3/3 통과: 초기 숨김/단일 손잡이/가까운 중첩 대상, 여백 통과·영역 이탈, 스크롤 시 버튼과 focus 유지·offscreen 숨김·listener 해제. DOM 모형을 이용한 컨트롤러 검사이며 화면 렌더링이나 실제 hit testing 검증이 아니다. Vite 빌드 성공. 모델 이동 코드는 이번 시각 정리에서 변경하지 않아 기존 모델 검사 근거를 재사용했다.

**시각 수락은 여전히 미완료**다. 브라우저 URL 접근 제한 때문에 현재 사용자 화면을 직접 확인하지 못했으며, 사용자는 후속 화면도 어색하다고 지적했다. 전체 레이아웃·도구 배치, 손잡이 표시, 입력 표시, 드래그 피드백 중 우선 대상을 확인 중이다. 실제 화면 확인 없이 추가 외형 변경을 반복하거나 완료로 판정하지 않는다.

## 메뉴 바 재구성 — 2026-10-06

사용자가 승인한 `파일 · 편집 · 보기 · 삽입` 구조로 상단 명령을 재배치했다.

- 제목/저장 상태와 오른쪽 메뉴 바는 같은 상단 줄에 배치하고, 자주 쓰는 도구(실행 취소·다시 실행·저장·이미지)는 아래에 구분했다. 처음 메뉴를 별도 줄로 배치한 것은 사용자의 후속 지적에 따라 바로잡았다. 오른쪽 명령 버튼 묶음과 떠 있는 삽입 버튼을 메뉴로 통합했다.
- 파일은 열기·저장·내려받기·인쇄/내보내기, 편집은 실행 취소·다시 실행·선택 내용 조작, 보기는 패널 표시·작성/A4/100%·검토, 삽입은 페이지와 블록 종류를 담당한다. 연결 모드별 기존 명령 제공 조건을 보존한다.
- 보기 메뉴와 캔버스 배율 선택은 같은 상태를 사용한다. 변경 시 이전 배치 판정을 비워 출력 가능 여부를 다시 확인한다. 페이지 목록 숨김은 넓은 화면에도 적용한다.
- 공개 Core DropdownMenu를 재사용하고 메뉴 바의 좌우 이동·열린 메뉴 간 포인터 이동·iframe focus 시 닫힘을 연결했다. 입력 모델과 저장 계약은 변경하지 않았다.
- 검증은 Vite 빌드, diff whitespace, 최신 정적 파일 제공 확인으로 한정한다. 기존 URL 정책 차단으로 실제 메뉴 키보드/클릭 및 390/760/1170 화면 재검증은 미실행이다.

### 위치·크기 후속 조정

사용자가 어색한 대상을 **손잡이 위치와 크기**로 지정했다. 표시 아이콘은 기존 12×18px에서 약 6×9–9×13px 범위로 줄이고 캔버스 배율을 반영한다. 포인터 영역은 24×24px로 별도 유지한다. 블록 상단에 단순 정렬하던 좌표를 첫 편집 문구의 첫 줄 중앙 기준으로 변경하고, 스크롤로 벗어난 손잡이를 화면 위에 고정하지 않는다.

컨트롤러/좌표 검사 4/4와 빌드 통과. 30%·65%·100%의 첫 줄 중앙 정렬 및 아이콘 범위를 수치로 확인했다. 이 검사는 실제 렌더링의 시각 수락을 대신하지 않는다. 브라우저 URL 정책 제한으로 최신 화면 실측은 여전히 미완료다.

## 손잡이 선택·삭제 — 2026-10-06

손잡이 클릭/키보드 focus를 명시적인 요소 선택으로 연결했다. 선택 요소에는 테두리·옅은 배경, 손잡이에는 선택 상태를 표시한다. 손잡이에 focus가 있는 동안 hover로 삭제 대상이 바뀌지 않는다. 글 입력칸으로 들어가거나 캔버스의 다른 곳을 누르면 요소 선택을 해제한다.

- 손잡이를 선택한 상태에서 Delete/Backspace는 해당 블록 또는 개별 단계 하나를 제거한다. 드래그 중, 키 반복, 조합 중, 수정키 조합과 오래된 화면 리비전은 삭제하지 않는다. 페이지/문구 필드/임의 JSON 배열은 손잡이 삭제 대상이 아니다.
- 삭제 후 다음 요소(없으면 이전 요소)를 선택한다. 마지막 본문 삭제는 빈 페이지의 작성 진입점을 유지하고, 마지막 단계 삭제는 절차 컨테이너를 유지한다. 삭제는 기존 PM history 한 번으로 복원되며 부속 그림·unknown 필드·sidecar도 복원된다.
- 글 입력 중 Delete/Backspace는 기존 문구 편집 규칙을 유지한다. 요소 선택의 표시와 손잡이는 인쇄 레이아웃에 들어가지 않는다.
- `node --test tests/editor-model-runtime.test.mjs`: **23/23 통과**. 블록/단계 삭제·undo·redo, 마지막 요소와 잘못된 경로 검사를 추가했다. Vite 빌드와 diff whitespace 검사 통과.
- 실제 IAB 별도 임시 탭, `editor-Cnj4n4bW.js`, 1280×720: 소제목 손잡이 클릭 시 선택 표시; Delete 후 첫 페이지 6→5개; Ctrl+Z 후 6개와 저장 기준 상태 복원. 개별 1단계 삭제 시 절차 블록을 남기고 해당 단계만 삭제·복원. 문구 내부 Home→Delete는 첫 글자만 제거하고 요소 수를 유지하며 undo로 복원됨을 확인했다.
- [선택 화면](assets/manual-editor-ui-audit/handle-selection-delete.jpg). 임시 탭은 모든 검사 변경을 undo한 뒤 저장 없이 닫았다. 기존 사용자 탭은 미저장 변경이 있어 새로고침하거나 저장하지 않았다.

## 전체 버튼 역할 점검 — 2026-10-06

범위는 상단 메뉴/빠른 도구, 페이지 탐색, 속성/구조 편집, 문서 열기, 변경 보존, 검토/출력, 본문 내 명령과 블록 핸들이다. JSX의 native button/Core Button과 iframe의 DOM 생성 버튼, 메뉴 item 배열, file input, summary 진입점을 소스로 대조했다. **아래는 소스 점검 및 수정 기록이며 브라우저 실측 완료표가 아니다.**

공통 원인은 `ghost`를 무테 버튼으로 오인한 것과 모든 native button에 테두리를 씌운 CSS다. Core의 ghost는 hairline이다. 메뉴 트리거는 native button의 메뉴 의미/키보드 동작을 유지하는 무테 텍스트로 바꿨다. 일반 명령은 공개 Core Button에 지원되는 root 스타일을 조합한 `EditorButton`을 사용해 테두리를 제거한다. primary는 저장/적용/기록에 명시하며, 삭제는 음성·문구와 음수 의미 색으로 구분한다. Core/Theme 내부는 수정하지 않는다.

| 위치/명령 | 역할과 수정 | 비활성/접근성 확인 및 잔여 |
|---|---|---|
| 파일·편집·보기·삽입 | 무테 텍스트, hover/open 배경만 표시. 상단 오른쪽 위치 유지 | menuitem/expanded, 좌우 이동·Core 메뉴 키보드 연결 유지; 실기 대기 |
| 파일 메뉴 내 명령 | Core 표준 메뉴 행 유지 | 저장/인쇄 가능 조건, 인쇄 비활성 설명 유지 |
| 실행 취소·다시 실행 | 무테 정사각형 iconOnly 도구 | 접근성 이름과 단축키 tooltip, history 없을 때 disabled |
| 저장 | 주요 동작(primary) | busy/연결 모드 검증 조건 유지 |
| 이미지 넣기 | 낮은 강조의 일반 명령 | busy/handler 없음 disabled |
| 문서 제목·페이지 목록 토글 | 탐색/표시 텍스트 | 제목 설명·expanded 유지 |
| 페이지·블록 목록 | 선택 가능한 행, 일반 명령 테두리 없음 | current/선택 배경 유지; 방향키 전체 탐색은 후속 |
| 속성 패널 닫기 | 무테 보조 동작 | 키보드 focus 표시 유지 |
| 속성 추가·이동·절차 분리 | 낮은 강조 명령, Core Button 사용 | 대상/경계 gate 유지; 패널은 busy 중 inert |
| 속성 적용 | 실제 편집 필드가 있는 경우만 primary | 미변경 disabled, 본문 등 적용할 속성 없는 대상은 숨김 |
| 필드 제거·블록/배열 삭제 | 음수 의미 색과 명시적 제거/삭제 문구 | 마지막 페이지·표 열 등 기존 제한 유지 |
| 배열 항목 추가·이동 | 낮은 강조 명령, Core Button 사용 | 기존 count/구조 조건 유지 |
| 문서 열기 목록 | 왼쪽 정렬 행, 긴 문서명 줄바꿈 | 가져오기 중 disabled; Core 클릭/키보드 처리 유지 |
| 문서 열기/검토 창 닫기 | 무테 보조 명령 | 모달 밖에서도 focus 표시 적용 |
| 원본 이미지 file input | native 파일 선택 유지 | 지원하지 않는 SVG를 picker accept에서 제거해 import 계약과 일치 |
| 변경 보존 창 | 저장 후 계속 primary, 초안/내려받기/취소 보조, 변경 폐기 주의 색 | conflict/busy/running guard 유지, focus trap 실기 대기 |
| 일반 텍스트 붙여넣기 선택 | 입력 primary, 취소 보조 | 기존 동작 유지 |
| 재시도/오류 위치 이동 | 낮은 강조의 복구/탐색 명령 | 기존 위치 이동 및 모달 닫기 연결 유지 |
| 검토 초안 생성·과업 이동 | 일반 명령 | 검토 가능 조건 유지 |
| 검토 기록 저장·시각 검토 기록·출력 | 해당 작업의 primary | 문서 최신성/검토자/근거/저장 조건 유지 |
| 출력 이력 새로고침·산출물/진단 열기 | 일반 명령/목록 행 | 반복 요청 중 개별 loading 표시는 후속 |
| 빈 페이지 작성·단계 이미지·누락 이미지 교체 | 본문 내 명령, 최소 높이 32px·명시적 focus·hover | 터치에서는 단계 명령을 상시 표시; 44px 터치 목표 및 겹침 실측은 후속 |
| 블록 이동 핸들·details 펼침 | 각각 구조 조작/정보 펼침으로 유지 | 기존 접근성 이름/인쇄 제외 유지; 드래그·터치 실측은 후속 |

일반 명령/목록/메뉴에 진한 채움을 반복하지 않고, primary가 필요한 위치만 명시했다. 기존 native 버튼의 일괄 테두리와 Core disabled에 중복 적용하던 opacity를 제거했다. 자료를 버리는 명령을 시각적으로 구분하되 새 확인 창을 추가하지 않았다.

검증: 에디터 production 빌드와 diff whitespace 검사, 사용하는 색상 토큰 정의 및 현재 HTML/JS/CSS 제공 확인. 입력 모델은 변경하지 않아 모델 전체 suite를 반복하지 않는다. 실제 메뉴/모달 focus, 긴 문구, 모바일/200% 확대, 비활성 이유 전달, 저장/검토 중 개별 loading 표시는 브라우저 정책 제한으로 이번에 실측하지 않았다. 이를 완료로 처리하지 않는다.

## 포커스·선택 UI 자기 비판 — 2026-10-06

사용자 요청에 따라 외부 편집기 공식 자료, 현재 IAB 화면(1170×900), `canvas-drag.mjs`와 `preview-surface.css`를 대조했다. 이번에는 기존 탭 접근이 정상 동작했다. 사용자 문서는 수정하거나 새로고침하지 않았다. 아래는 문제 판정과 후속 설계 기준이며 구현 완료 기록이 아니다.

### 외부 사례에서 확인한 것

- [Notion 작성·편집](https://www.notion.com/help/writing-and-editing-basics): 블록 여백의 손잡이는 hover로 나타나며 드래그는 이동, 클릭은 블록 명령 메뉴를 연다.
- [Notion 키보드 단축키](https://www.notion.com/en-gb/help/keyboard-shortcuts): 글 편집에서 Esc로 블록 선택, 선택한 블록에서 Enter로 글 편집에 진입한다. 글 편집과 블록 조작 사이에 명시적인 전환이 있다.
- [BlockNote Side Menu](https://www.blocknotejs.org/docs/react/components/side-menu): hovered block 왼쪽에 추가 버튼과 손잡이를 제공하고 손잡이 클릭은 메뉴를 연다. 사용자 요청인 ‘손잡이 클릭으로 선택’과 동일한 동작이라고 인용해서는 안 된다.
- [W3C APG 키보드 인터페이스](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/): 키보드 focus와 selection을 사용자가 구별할 수 있어야 하며, 삭제 등으로 대상이 사라질 때 focus를 논리적인 대상으로 이어줘야 한다. 모든 컴포넌트에서 focus에 따른 선택을 금지한다는 뜻은 아니다.

### 현재 구현의 문제

| 문제 | 확인 근거와 사용자 영향 |
|---|---|
| 선택 표시를 과도하게 중첩 | 현재 1단계 선택 화면에 블록 전체 2px 테두리, 옅은 채움, 진한 손잡이, 손잡이 focus ring이 함께 보인다. 선택 범위와 입력 위치를 구분하기보다 같은 의미를 반복 강조한다. |
| 손잡이 여백 부족 | 손잡이 오른쪽 경계가 단계 번호에 바짝 붙고 선택 테두리와 겹친다. 첫 줄 중앙 정렬과 아이콘 축소만으로는 번호·선택선·포인터 영역 사이 간격을 해결하지 못했다. |
| 입력과 구조 조작의 위계 부족 | 문구 focus에도 전체 폭 outline, 블록 선택에도 전체 폭 outline을 사용한다. 짧은 문구 오른쪽의 빈 공간까지 입력칸처럼 둘러싸 문서 읽기 흐름을 해친다는 시각 판단이다. |
| focus 자체가 선택을 실행 | 손잡이 `focusin`에서 `selectElement`를 호출하고 텍스트 선택을 지운다. Tab으로 제어점을 탐색하는 동작과 요소 전체를 조작 대상으로 확정하는 동작을 합쳤다. |
| 상태에서 빠져나오는 경로 미흡 | 손잡이 Escape는 선택 해제 뒤 `blur()`만 호출하며 의미 있는 복귀 대상을 지정하지 않는다. Enter는 선택을 다시 실행하고 본문 편집으로 전환하지 않는다. 소스에서 확인한 문제이며 이번에 해당 키 경로를 추가 실기 검증하지는 않았다. |
| 중첩 요소의 범위 전달 부족 | 본문에서는 개별 1단계가 선택되어 있으나 개요는 상위 절차 행을 강조한다. 상위 절차와 하위 단계의 관계를 표시하지 않아 ‘절차 전체’와 ‘한 단계’의 조작 범위를 혼동하기 쉽다. |

손잡이·본문·개요가 서로 다른 선택 상태를 관리하는 구조도 유지보수 위험이다. 이것만으로 모든 경로에서 실제 불일치 버그가 발생했다고 단정하지 않는다.

### 다음 수정의 수락 기준

1. 대기 상태는 문서 읽기에 집중한다. Hover는 여백의 중립색 손잡이로 조작 가능성만 표시한다.
2. 글 편집은 caret와 텍스트 범위 선택으로 드러낸다. 입력칸을 닮은 상시 전체 폭 테두리를 제거하되 키보드 사용자가 위치를 놓치지 않도록 확인한다.
3. 손잡이 클릭은 사용자가 요청한 요소 선택을 유지한다. 선택 범위 표시를 하나의 일관된 표현으로 정하고, 손잡이를 주요 실행 버튼처럼 진하게 강조하지 않는다.
4. 키보드 focus는 현재 제어점에 별도로 보장한다. 단순 focus 진입과 선택 확정을 구분하고, Enter의 편집 진입·Escape의 해제/복귀·삭제 후 다음 대상과 undo 복귀를 함께 설계한다.
5. 개별 단계·절차 전체·그림·콜아웃·빈 블록에서 조작 범위를 확인한다. 드래그는 삽입 위치 표시를 중심으로 하고 다른 상태의 강조를 중첩하지 않는다.
6. 작성 보기/A4 맞춤/100%, 긴 줄·빈 내용·중첩 단계에서 실제 화면과 키보드 흐름을 검증한다. 상태별 화면을 나란히 비교한 뒤 시각 수락을 판정한다.

앞선 구현의 책임은 ‘선택 가능’을 파란 테두리와 채움을 더하는 문제로 축소하고, 삭제·undo가 작동한다는 기능 증거를 충분한 사용성 검증처럼 전달한 데 있다. 기존 모델 테스트와 삭제 실기 결과는 보존하되 **포커스 UI의 시각·상호작용 수락은 미완료**로 명시한다.


## 포커스·선택 UI 개선 및 확인 — 2026-10-06

앞선 비판 중 입력/선택/키보드 focus 분리, 손잡이 여백, 편집 복귀를 수정했다.

- 글 입력의 전체 폭 outline을 제거했다. contenteditable의 기본 Tab 진입은 유지하고 불필요한 tabindex를 제거해 공통 제어점 focus 규칙이 입력 영역에 큰 테두리를 만들지 않게 했다. 구조 컨테이너는 프로그램 focus를 유지하며 중복 Tab 정지점에서 제외했다.
- 요소 선택은 옅은 배경으로 표시한다. 진한 손잡이 채움과 선택 테두리를 제거했다. 마우스 선택에는 focus ring을 중첩하지 않고 키보드 탐색에는 유지한다.
- 손잡이는 블록 경계에서 14px 떨어뜨렸다. 작성 보기에는 왼쪽 조작 여백을 확보했다. 개별 단계에 있을 때 개요 행에 단계 번호와 제목을 표시한다.
- 손잡이 focus만으로는 선택하지 않는다. 클릭/Space 또는 첫 Enter로 선택한다. 선택 후 Enter는 해당 요소의 첫 편집 필드로 진입한다. 글 편집 중 Esc는 요소를 선택하고, 손잡이에서 Esc는 선택을 해제하며 편집 필드로 돌아간다. 편집 필드가 없는 요소는 요소 컨테이너로 돌아간다.
- 드래그 시작 시 선택 배경을 해제하고 기존 삽입 위치 표시를 사용한다. Delete/Backspace는 명시적으로 선택된 요소에만 적용한다.

검증 범위:

- 컨트롤러 검사 **6/6 통과**: 기존 hover/배치/정리와 함께 focus만 있을 때 삭제 방지, Enter 선택→편집, Escape 복귀, 글 focus의 선택 해제 확인. Production 빌드 및 diff whitespace 검사 통과.
- IAB 별도 임시 탭 1280×720, `editor-RIh_jnpj.js` / `preview-CSgMRYcv.js`: 손잡이 클릭 선택→Enter 글 편집→Esc 선택→Delete 개별 단계 삭제→Ctrl+Z 두 단계 복원 및 저장 기준 상태 복귀. 마지막 본문에서 Tab으로 손잡이 진입 시 미선택, Delete 무변경, Enter 선택, Esc 본문 복귀 확인.
- A4 맞춤의 단계 선택/입력, 작성 보기의 콜아웃 선택, 100% 보기의 소제목 선택 화면을 확인했다. [선택 화면](assets/manual-editor-ui-audit/focus-selection-improved.jpg), [입력 화면](assets/manual-editor-ui-audit/focus-writing-improved.jpg).
- 임시 탭의 검사 변경은 저장하지 않고 닫았다. 기존 탭은 저장됨 상태를 확인한 뒤 최종 빌드로 새로고침하고 1단계 선택 상태로 두었다.
- 이번 결과를 모바일/터치, OS IME 전체 조합, 모든 이미지·표·빈 블록 및 드래그 실기 수락으로 확대하지 않는다. 선택 표시의 구분과 위에 기록한 전환 경로를 확인한 범위다.

## 독립 UI 검토 — 문서 개요와 신규 목차 (2026-10-06)

검토 세션: `LDS Manual UI 검토` (`01a1119b-2fb3-75e2-ab43-4774ccfee60d`). 구현 코드는 수정하지 않았다. 아래 화면 관찰은 해당 검토자의 보고이며 조정 세션이 직접 조작한 결과가 아니다.

근거는 사용자 제공 v1 1148×900 화면, `EditorShell.jsx`/`editor-shell.css` 및 신규 `ManualEditor.jsx`/`manual-editor.css`/`manual-kernel.mjs`, 별도 숨김 IAB의 신규 `/manual.html` 1280×720 읽기·선택 관찰이다. 합성 2페이지에서 A4→목차 02 클릭 시 작성으로 바뀌고 목차는 02를 표시하나 본문은 첫 페이지 상단인 것을 관찰했다. 문서를 편집·저장하거나 기존 사용자 탭을 변경하지 않았고 검토용 탭은 닫았다. 긴 제목·많은 페이지·모바일·드래그는 실기 미확인이다.

| ID | 문제와 영향 | 개선/수락 기준 | 상태 |
|---|---|---|---|
| UI-N01 P1 | 미리보기 목차가 작성으로 전환되고 선택 페이지와 보이는 본문이 불일치 | 모드 내 페이지 탐색과 ‘수정 위치’를 분리. A4에서 02 선택 후 모드 유지·02 제목 가시·dirty/history 무변경 | 실측+소스. `manual-D2YLzNJ3.js`에서 A4 유지·02 제목/표/안내 가시를 UI 담당이 재확인. dirty/history 무변경은 별도 수락 |
| UI-N02 P1 | ≤760px overlay 목차가 선택 후 남아 caret를 가릴 수 있음 | 페이지 선택 후 닫기·선택 위치 노출. 닫기/Escape/토글 focus 복귀와 속성 패널 간 관계 확인 | 소스. 선택 후 닫기 반영 보고, 모바일 실기 대기 |
| UI-N03 P2 | 좁은 제목 폭·anywhere·무제한 줄수로 한글 고아 줄/긴 제목 목록 밀림 | 한글 어절 우선·2줄 제한·긴 URL fallback, 전체 제목에 키보드/터치 접근. 실제 제목/60자 한글/긴 URL 검사. 240–260px는 비교 제안치이며 확정 아님 | 사용자 화면+소스. keep-all/clamp/title 반영 보고; title 속성만으로 터치/키보드 수락을 완료하지 않음 |
| UI-N04 P2 | v1 페이지 선택과 자식 펼침 결합, 수동 접기 없음. 선택 단계명으로 절차명을 바꿔 삭제 범위 혼동 가능 | 페이지/펼침 동작 분리, 소제목·절차 중심 하위 목록, 절차명 유지+선택 단계 보조 표시. 페이지 현재와 내용 선택을 구분 | 소스. 새 정보 구조 제안, 미구현/미검증 |
| UI-N05 P2 | v2 목차가 cover를 누락 | 표지 행 포함, 목차·본문·A4 쪽수와 전체수 일치 | 소스. cover 포함 수정 보고, 표지 실기 대기 |
| UI-N06 P2 | 많은 페이지에서 추가 버튼 접근과 선택 행 가시성 부족 | 목록 스크롤/하단 추가 영역 분리. 필요할 때만 선택 행 nearest 노출. 50페이지 검사 | 소스. 수락 대기 |
| UI-N07 P2 | 손잡이 발견/이동 피드백 및 v1/v2 계약 혼동 | 최초 gutter 진입·중첩 단계 우선·하나의 손잡이·통로 유지, focus만으로 선택/삭제 금지. 위/아래 이동 대체와 취소/금지 피드백 | 구현 연결/실기 진행. v1 클릭 선택→Enter 편집과 제안된 v2 클릭 메뉴를 동일 완료로 표현하지 않음 |

권장 와이어프레임은 제안 상태다.

```text
페이지 2                                      [닫기]
[▾] 01 목록에서 항목
       확인하기                      [이동 손잡이]
       작업 절차
         2단계 · 상태 확인             [선택한 요소]
[▸] 02 새 페이지
─────────────────────────────────────────────────
[+ 페이지 추가]
```

현재 페이지의 약한 배경, 선택 요소 표시, 키보드 focus ring은 다른 역할이다. 타입 라벨은 필요한 보조 정보로 제한한다. 단순 nav/list를 근거 없이 tree 역할로 바꾸지 않는다.

추가 수락: 1148×900·1000px 양패널·760·390·200% 확대, 빈 제목/표지/60자 제목/50페이지/0개·30개 내용, Tab·Enter·Space·Escape, 각 패널의 독립 스크롤, 페이지 이동 undo, 드래그 Esc/중첩 단계/터치 대체 명령. ≤1000에서 숨겨지는 저장 상태를 대신해 변경/실패가 보이는지 확인한다. A4의 페이지 추가는 작성 전환 의도를 드러내야 한다.

### 손잡이 수정의 source와 served build 구분

(4) 세션은 gutter 탐색 및 `getScrollContainer` 옵션을 포함한 컨트롤러 **11/11 통과**를 보고했다. 그러나 검토 시 제공 중인 `preview-B9qCEQzK.js`에는 새 rail/visibility 탐색이 없었다. 사용자 화면의 ‘손잡이가 안 나옴’은 source 완료와 배포된 로컬 UI 빌드가 달랐던 상태로 분류했다. 최신 build와 해당 페이지 새로고침, 최초 gutter 진입 실기 전에는 사용자 화면 해결로 판정하지 않는다. 서버·빌드 담당에게 반영을 요청했다.

후속 빌드 보고: `preview-COjJ2ots.js`, 신규 `manual-D2YLzNJ3.js`, 공유 controller `lk-logo-inline-navy-CttsS8IY.js`에 최신 11/11 컨트롤러를 포함했다. UI 담당은 신규 화면에서 A4 유지·목차 02의 제목/표/안내가 보이는 것을 실제 화면으로 확인했다. 기존 사용자 탭은 미저장 내용 보호를 위해 강제로 새로고침하지 않았으며 수정 전 bundle을 사용할 수 있다. 따라서 저장 후 reload가 필요하다. v1 최초 gutter 진입 실기는 검증용 새 탭에서 진행 중이다.

v1 gutter 실제 조작 보고(12/12 후속 source 재빌드 전): 새 `/` 검증 탭에서 본문을 거치지 않고 x380/y284로 진입해 ‘본문 선택 및 이동’ 출현/선택, Esc 후 x382/y442 진입해 ‘2단계 선택 및 이동’ 출현/선택, Esc 후 x260/y180 바깥으로 이동해 손잡이 접근성 노드 제거를 확인했다. 현재 제공된 11/11 기준 gutter 동작은 실기 통과이며, parent direct-hit 우선순위의 최신 12/12 source는 다음 빌드·영향 실기로 별도 확인한다. 기존 사용자 탭의 강제 새로고침은 하지 않았다.

### 신규 저작 화면 최종 실기 연결

최종 `manual-C-D2x6Rk.js`/`manual-BCIjKbSy.css`에서 UI 담당이 UI-N01(A4 목차 02 이동, 모드 유지·대상 가시·dirty 없음), UI-N02(390px 목차 선택 후 닫힘·제목/caret 가시), 모바일 footer 저장 상태 표시를 확인했다. 본문/중첩 단계의 gutter 최초 진입·선택·삭제/복원 및 drag 순서 변경/복원도 확인했다. 최종 컨트롤러 c03f…와 adapter 2/2 근거를 사용한다.

증거: [작성 선택](assets/manual-editor-ui-audit/manual-authoring-selection.jpg), [미리보기](assets/manual-editor-ui-audit/manual-authoring-preview.jpg), [390px](assets/manual-editor-ui-audit/manual-authoring-mobile.jpg). 목차 전용 리뷰의 200%·50페이지·긴 제목/표지 조합 등 나머지 수락은 완료로 확대하지 않는다. 전체 통합 범위와 source/build 식별은 [재설계 기록](manual-editor-redesign.md)의 최종 저작 통합 결과를 따른다.

## 헤더 명령 배치와 미리보기 전환 후속 리뷰

사용자 제공 1107×900 화면과 소스 검토를 바탕으로 UI 전용 세션은 왼쪽 Manual·파일·문서 이름·저장 상태, 오른쪽 저장·미리보기 배치에 동의했다. 저장 primary는 하나만 유지하고 동등한 두 모드 토글 대신 ‘인쇄 미리보기’/‘편집으로 돌아가기’를 사용한다. 실제 새 헤더 화면 수락 전의 결정이다.

- 미리보기는 제목도 readonly/text로 표시한다. 서식·속성·손잡이·페이지 추가를 숨기고 페이지 탐색과 파일 열기/내려받기는 유지한다. 브라우저 인쇄는 초안 표시를 유지한다.
- 진입 직전 PM selection, 작성 scrollTop과 focus 출처를 보존한다. 미리보기에서 다른 페이지를 읽더라도 단순 복귀는 원래 편집 위치로 돌아온다. 오류의 ‘수정 위치’ 명령만 목표를 바꾼다. hidden 해제 후 focus/scroll을 복원하고 전환은 dirty/history를 바꾸지 않는다.
- 파일 메뉴는 Enter/Space→방향키/Enter→Escape 및 트리거 focus 복귀를 확인한다. 모달·메뉴·드래그의 Escape가 전역 복귀보다 우선해야 한다.
- 좁은 화면은 파일·문서 이름·상태와 저장·보기 전환을 줄로 나눌 수 있다. 긴 이름이 버튼을 밀지 않게 하고 저장 중/실패 상태를 숨기지 않는다. 브랜드 축약은 필요 시 선택지다.
- 수락: 1107×900, 1280×720, 760×740, 390×844, 200% 확대와 60자 제목. 절차 문장 중간 caret→미리보기의 다른 페이지→복귀→즉시 입력, 오류 수정만 선택 위치 변경, 저장 중 전환/실행 취소 이력 불변을 확인한다. 아직 하지 않은 크기/입력 검사는 통과로 간주하지 않는다.

구현은 UI 담당, 독립 확인은 UI 전용 리뷰 담당이며 조정 세션이 결과를 통합한다.

## 작성과 A4의 문서 서식 대조 — 소스 리뷰

UI 전용 검토자의 소스 비교다. 같은 리비전·100% 배율의 화면 실측은 아직 하지 않았다. 작성은 `manual-editor.css`의 별도 px 규칙과 PM toDOM, A4는 `styles.css`/`tokens/manual.css` 및 Manual/Core 공개 컴포넌트를 사용한다. 배율·페이지 폭 차이 외에 내용 서식 자체가 달라진다.

| 역할 | 작성 화면 | A4 미리보기 | 판단 |
|---|---|---|---|
| 페이지/표지 제목 | 둘 다 26px/1.5/700과 별도 여백 | 페이지는 section-title/brand 배경·padding, 표지는 별도 title 역할 | 역할별 서식 통일 필요 |
| 본문 | 16px/1.8, 문단 12px 여백 | manual body 토큰과 space3 | 공통 alias 사용. upstream 토큰 실제 px은 추정하지 않음 |
| 소제목/단계 | 별도 19px/17px, native ol 들여쓰기 | body/headline alias, 번호 flex와 설명 들여쓰기 | 글꼴·번호열·간격 대조 필요 |
| 그림 | compact 340px/reading 520px, crop·previewTitle 표현 없음 | compact 151mm/reading 170mm, crop 및 프레임/라벨 | **P1:** 보이는 그림 영역·의미가 달라짐 |
| 안내 | 모든 tone이 같은 primary 왼쪽 선/배경 | public Core Callout의 tone별 표현 | **P1:** 주의/경고 의미가 작성에서 사라짐 |
| 표 | td와 첫 행 CSS, fixed/collapse, 별도 padding | th/td, separate/frame, 첫 열 31%, 공통 spacing | 구조와 서식 정렬 필요 |
| 인용 | 수동 왼쪽 선과 neutral 글자 | public Core Blockquote | 공개 API 재사용 |
| 나란히 묶음 | layout별 표현 분기 없음 | sideBySide의 두 열과 gap | 내용 배치 불일치 |
| 표지 | logo는 meta로 보존하지만 작성 DOM 없음 | logo/metadata/sectionTitle 표시 | 보존과 표시를 구분, 표지 대조 필요 |

허용 가능한 차이는 caret·선택·손잡이·placeholder·빈 편집 슬롯, 작성의 가변 높이/reflow, 출력의 A4 지오메트리·쪽번호·footer·화면 맞춤 배율이다. 동일 역할의 typography·색·제목 배경·번호·표·안내 tone·그림 crop/폭/라벨·나란히 배치는 맞춰야 한다. 전체 화면에서 작아 보이는 정도만으로 서식 차이를 판정하지 않고 100% 또는 배율을 보정해 비교한다.

구현 방향: 작성 영역에 Manual alias를 적용하고 의미 노드에 역할 class/semantic DOM을 연결한다. 페이지 지오메트리만 작성용으로 구분한다. Core Callout/Blockquote는 공개 API와 NodeView/contentDOM 연결로 재사용하며 내부 CSS를 복제하지 않는다. 그림도 공개 표현과 crop/previewTitle 계약을 따르고 caption은 PM이 관리한다. 단일 EditorView/history를 유지한다.

수락 fixture: 페이지/표지 제목, 본문·강조·링크, 소제목, start=9 절차의 9/10단계, 그림 full/reading/compact와 crop/previewTitle, 안내 5tone, 2×3 표, 인용, sideBySide. 같은 리비전의 작성/A4에서 computed style과 형상을 비교하고 저장 왕복·키입력·undo·NodeView 선택을 검증한다. 390px reflow는 허용하되 색/역할/crop/tone은 유지한다. 실제 OS IME는 별도 수락이며 출력 넘침을 숨기거나 글자를 줄여 통과시키지 않는다.

### 헤더 국소 수정 결과

UI 담당 보고: build `manual-C8iankcX.js`/`manual-D9HDjqWA.css`. 왼쪽 Manual·파일·문서 이름·저장 상태, 오른쪽 인쇄 미리보기/편집으로 돌아가기 및 저장으로 변경했다. 미리보기의 제목은 읽기 전용이며 페이지 추가·서식·속성·손잡이를 숨긴다.

실기 1107×900: 두 번째 단계 문장 offset2에서 미리보기→다른 페이지 탐색→복귀 후 caret offset2와 scroll0 유지, 즉시 시험 입력이 해당 위치에 삽입되고 undo로 복원됨을 확인했다. 보기 전환만으로 dirty/history는 변경되지 않았다. 파일 Enter 열기/Escape 트리거 복귀도 확인했다. 390×844에서는 파일·이름·상태·미리보기·저장 노출과 scrollWidth390으로 가로 넘침 없음을 확인했다.

증거: [헤더 desktop](assets/manual-editor-ui-audit/manual-header-desktop.jpg), [헤더 mobile](assets/manual-editor-ui-audit/manual-header-mobile.jpg). UI 전용 검토자가 두 캡처를 독립 확인해 이 범위의 위계와 표시를 수락했다. 파일의 focus ring은 키보드 focus 표시로 구분했다.

잔여: 760px/200%/60자 제목/0이 아닌 scroll 복귀/문서 제목 input focus·선택 복귀는 미검증이다. 현재 복귀가 본문에 focus를 주는 구현이므로 제목 입력의 복귀까지 통과로 확대하지 않는다. 추가 소스 P2로 ‘2쪽 편집→미리보기 진입’은 목차 현재 표시와 scrollTop0이 어긋날 수 있어, 클릭 탐색과 별도로 현재 페이지 진입 위치를 맞추도록 전달했다. **작성/A4 문서 서식 불일치는 헤더 수정으로 해결되지 않았다.**

## v2 전체 버튼 목적과 경계 — 2026-10-07

현재 `/manual.html`은 단일 작성 화면이다. 위 v1 오른쪽 menubar 및 작성/미리보기 전환 기록을
v2 현재 배치로 승계하지 않는다. 아래는 JSX·메뉴 catalog·kernel guard를 대조한 역할표이며,
모든 버튼의 native 실기를 완료했다는 표가 아니다. 핵심 수락 증거와 현재 후보는
[재설계 §14](manual-editor-redesign.md#14-노션-기본-편집-목표와-수락--2026-10-07)를 따른다.

| 영역 / 버튼 | 목적과 시각 역할 | 작동 조건 / 경계 |
|---|---|---|
| 파일 / 삽입 trigger | 문서 명령 / 내용 삽입, 낮은 강조 텍스트 메뉴 | 준비·열기·인쇄 busy는 disabled; 선택 범위와 조합 중 최종 command guard |
| 저장 | 자동 저장을 즉시 끝내기 또는 실패 후 retry, primary | CtrlS와 동일 snapshot 저장; conflict 강제 overwrite 금지 |
| 새 매뉴얼·보관함 항목·파일 복사본 | 새 문서/선택 문서로 이동 | 정상 상태는 최신 저장 후 이동; 실패·조합 미완료는 복구 선택, 중복 교체 금지 |
| 문서 파일 내려받기 | 현재 문서와 이미지 바이트를 portable 파일로 보관 | 저장 실패 중에도 현재 내용 export; IDB 기록 변경 없음 |
| 인쇄 / PDF · 초안 | 현재 내용 출력과 preflight | title/asset/overflow 오류는 해당 작성 위치 제공; editor 하나 유지 |
| 기존 형식 에디터 | legacy 진입 | dirty/pending 상태를 자체 교체 보호로 처리; 확정한 navigation의 중복 unload 질문 방지 |
| 실행 취소 / 다시 실행 | 동일 history 복원, quiet iconOnly | history가 있을 때만 enabled; label·hover tooltip·focus ring |
| 문단 종류 | 본문/제목 3종/목록/todo/code 의미 전환 | nonlossy 변환만 enabled; 현재 특수 역할/다중 선택을 사실대로 표시 |
| B / I / U / S / 코드 | 선택 글자나 이후 입력 서식 | mark 적용 가능 조건; custom ranges 밖의 pageTitle/lead로 pressed 계산하지 않기 |
| 링크 / CtrlK / 적용·해제 | 선택 링크 편집 | URL 첫 focus·범위 유지·safeURL 검사; codeBlock에서 disabled와 키보드 guard 일치 |
| 선택 텍스트 bubble | caret 주변에서 부분 서식 | 상단과 같은 glyph/상태·선택 유지; whole-block/multirange에서 text bubble 생성 금지 |
| 목차 toggle / 페이지 행 | 탐색과 화면 표시 | current page 표시·내용 불변; 좁은 화면에서 작성 영역 확보 |
| 페이지 추가 / 다음 단계 | 논리 page/절차 step 생성 | 현재 위치와 역할 조건; 제목/설명 focus·ID·undo 보존 |
| gutter `+` / handle | 해당 위치 삽입 / 이동·컨텍스트 | rail 직접 진입, 중첩 직접 parent 위치, group 대상·modifier·cancel 보존 |
| 블록 menu 변환·복제·위/아래·삭제 | 선택한 객체/범위 작업 | 이동 경계·마지막 page·지원하지 않는 conversion disabled, danger 삭제·한 undo |
| checkbox / toggle | 완료 / 내부 내용 접기 | 내용·ID 유지, folded child caret 처리; read-only/busy 표시와 실제 guard 일치 |
| 속성 / 닫기 | 해당 객체 속성 표시 / 보조 종료 | 본문 중복 입력 없음; 불필요한 역할에는 설정 안내만, 보조 close quiet |
| 이미지 바꾸기·alt·폭 | 원본 교체 / 접근성 / 매체 폭 | chooser 요청부터 doc/generation/target/caret 토큰, decode 후 다시 검사; disabled 표시 |
| 안내 종류·code 언어·시작 번호 | 해당 역할의 의미/표현 메타 변경 | 검증 범위와 caret 보존; 상태 변화에 맞춰 값/disabled 표시 |
| 표 행·열 추가 / 마지막 삭제 | 구조 수정 | 마지막 열·header 보호, 행 0 경계, Cell focus·한 undo |
| 저장 후 계속 / 버리기 / 취소 | 오류나 미완료 입력의 교체 복구 | latest-snapshot barrier·실패 시 원문 유지·mutex; 저장/버리기/보조 역할 구분 |
| 충돌 파일 보관 / 저장본 재열기 | 로컬 편집 보존 / 정본 복구 | 현재 파일 보관 primary; 원문과 저장 revision 구분, overwrite 없음 |
| printIssues 수정 위치 | 오류가 있는 작성 대상 찾기 | print DOM 제거·PM focus·scroll 복귀, stale object 확인 |

확인한 source 결함은 범위 밖 mark pressed, code 링크 활성, glyph 불일치, busy 속성 표시,
legacy dirty 이동, 중첩 `+` 위치와 ShiftClick selection snapshot 복원이다. 구현 담당이
기존 public Core/EditorButton 패턴으로 국소 보완했다. native 재검증은 링크 focus·code 링크
차단, 범위 선택·중첩 삽입과 저장 교체 흐름에서 통과했다. 모든 버튼 조합의 실기 수락으로
확대하지 않는다.
`beforeunload` 보호는 이미 있었으므로 legacy 항목을 무조건적인 내용 손실로 단정하지 않는다.
자체 Save/Cancel/자동 저장 교체 흐름과 확정한 unload의 중복 prompt 방지가 개선 목적이다.

추가 검토는 실제 Enter/ShiftEnter/병합·목록 종료·divider Delete/Undo, margin marquee,
Shift+handle, 중첩 삽입, partial clipboard, 합성 storage fault/retry/지연 교체를 연결한다.
OS IME·실제 모바일 키보드·실제200%·drag 중 Escape·OS PDF는 도구 제약을 별도로 기록한다.

최신 `manual-vUocEYH5.js`에서 목차 page 이동을 section 시작으로 맞춰 제목이 보이는 것을
담당이 실제 확인했다. 50쪽 합성 문서의 목차 50개·450블록·이미지 50개·독립 목차 스크롤,
마지막 페이지 입력/undo/redo/저장/보관함 재열기/파일 보관도 통과했다.
[최신 작성 화면](assets/manual-editor-ui-audit/manual-boundary-editor.jpg)과
[50쪽 화면](assets/manual-editor-ui-audit/manual-large-document-qa.jpg)을 조정 담당도 검토했다.
390/760 결과와 이 50쪽 결과를 실제 200%·모바일 OS 키보드 조합의 수락으로 확대하지 않는다.

최신 UEYE18ZB의 목록 Tab/ShiftTab·부분 U/ShiftS/E·지원하지 않는 code mark 키 소비와
CtrlShiftS/정상 CtrlS 분리는 담당 native QA에서 통과했다. 별도 UI 검토 세션은 canonical
2쪽/21블록 fixture에서 편집·변형·두 블록 drag·한 Undo/Redo·자동 저장·보관함 재열기·
파일 복사본까지 연결해 62 DOM 노드 snapshot과 새 ID/자산 보존을 확인했다.
[연결 화면](assets/manual-editor-ui-audit/manual-connected-workflow-qa.jpg)을 조정 담당도 검토했다.
원본·복사본 ID 정책, source fingerprint와 환경 미수락은 [재설계 §14](manual-editor-redesign.md#14-노션-기본-편집-목표와-수락--2026-10-07)에 기록한다.

### 팝업 위치의 스크롤·패널 변경 경계 — 2026-10-07

실제 입력기 검증을 기다리는 동안 현재 소스를 재점검했다. 선택 서식 도구는 fixed 좌표를
PM state 변경 때만 계산해 창 크기·visualViewport·좌우 패널 변경을 반영하지 않았다.
기존 main `onScroll`의 숨김 처리는 이미 있었으며 이를 누락한 초기 보고는 정정했다.

UI 담당이 실제 도구 크기·선택 줄·작성 영역과 visualViewport의 교집합을 사용하도록
보완했다. 위쪽 공간을 우선하고 부족하면 아래쪽을 사용하며, 도구가 들어갈 공간이 없거나
선택이 보이지 않으면 숨긴다. 기존 위치 함수를 재사용한 catalog 신규 관련 검사 3개와
geometry/RAF 정리·이전 view 거절 관련 검사 6개가 통과했다. 합성 입력기의 OS 수락은 아니다.

별도 memory QA의 실제 페이지 목록 닫기에서 선택한 ‘초기 저장’의 줄과 도구가 각각 98px
이동했고 선택 문구와 전체 kind/id/text는 불변이었다. main scrollTop 696에서 도구 DOM이
제거되는 기존 숨김 동작도 확인했다.
[패널 변경 후 도구](assets/manual-editor-ui-audit/manual-format-bubble-reflow-qa.jpg)는 조정 담당도
직접 검토했다. 사용자 탭에 영향을 주는 browser 전체 크기 변경은 수행하지 않았으므로
실제 resize·200%·모바일 키보드 수락으로 확대하지 않는다.

별도 검토 세션이 보관된 뒤 모델 담당 형제 세션이 독립 스크롤 검토를 맡았다. UI 편집을
멈춘 후보에서 `/table` 메뉴를 연 뒤 native scrollTop 696→552를 적용하자 입력 위치는
144px 내려갔지만 메뉴 y496.21875..654.71875는 그대로 남아 입력 줄을 가렸다. 검색어,
selection의 동일 ID/offset 6, 750자 본문과 28개 노드의 kind/id/text는 보존됐다.
이것은 실제 P2 위치 결함이다. 조작 전후 같은 dev entry를 확인했고 준비 중 HMR 측정은
폐기했다. 입력 줄을 따라 위치를 다시 계산하는 수정은 현재 제공 빌드에 반영했다.

수정 뒤 독립 재검증은 `/table`의 유효한 입력 조건을 준비하지 못해 미확정으로 종료했다.
접근·서버 차단은 없었으나 native 입력의 target changed/lost focus, 의도하지 않은 문구 혼합,
관찰 사이 말단 내용 변경으로 정확한 선택 실패가 반복됐다. source와 dev entry는 같았고
다른 검토자의 native 조작은 없었다. 현재 근거로 앱·도구·IME·외부 입력 중 원인을 분류하지
못하므로 수정 통과나 수정 실패로 기록하지 않는다. 앱 state를 강제로 바꾸지 않았으며
해당 독립 QA 탭은 닫았다. UI 담당의 별도 실기 결과가 있으면 근거를 구분해 추가한다.

UI 담당은 현재 동결 source에서 새 memory QA 탭에 native paste 한 번으로 유효한
24문단+`/table` 입력 조건을 만들고 두 조건을 별도로 통과했다. 같은 scrollTop 696→552에서
caret은 144px 내려갔고 메뉴는 y496.21875..654.71875에서 y453.21875..611.71875로
새 입력 위치 위에 재배치됐다. query·active table 항목·같은 anchor/head ID와 offset 6,
전체 28개 노드의 kind/id/text와 dev entry가 불변이었다.

추가 native scrollTop 336에서 caret top834.21875가 main bottom684.5 밖으로 나가자
메뉴 DOM만 제거됐다. `/table` 문구·동일 selection·전체 노드·본문 focus를 유지했다.
[수정 후 slash 위치](assets/manual-editor-ui-audit/manual-slash-scroll-qa.jpg)는 조정 담당도
직접 검토했다. 이것은 UI 담당의 실제 수락이며 앞선 독립 검증의 입력 준비 실패와 구분한다.
UI 담당이 자신의 QA 탭과 새 Vite session72981을 종료했고 조정 담당도 실제 listener에서
44590 closed·제품44589 PID19797 listening을 확인했다. 최종 source와 D6O6MO2j 빌드는
동일하며 새로운 빌드나 사용자 탭의 새로고침은 없었다.

### 절차 단계 제목의 Shift+Tab — 2026-10-07

사용자가 세 번째 번호의 단계 제목에 커서를 두고 Shift+Tab을 누르면 본문으로 빠져야
한다고 지적했다. 사진의 객체는 일반 번호 목록이 아니라 제목과 설명을 묶는 `procedure/step`이다.
kernel864c의 해당 키 chain은 code/table/list만 연결돼 있었다. 조정 담당도 빈 세 번째 제목의
실제 PM state에서 `shiftTabHandled:false`, 전후 parent `stepTitle`, 문서 불변을 재현했다.

collapsed 단계 제목에서 Shift+Tab을 누르면 제목은 paragraph로, 설명·이미지 등 하위
내용은 원래 순서대로 절차 밖에 둔다. 제목 paragraph에 step ID·inline marks·extensions를
유지하고 하위 블록의 ID·내용·자산을 유지한다. 중간 단계는 앞뒤 절차를 나눠 남은 번호를
이어가며 불필요한 빈 절차를 만들지 않는다. 유일한 단계였던 절차의 ID/start/extensions는
삭제된 wrapper의 기록으로 보존하며 live ID 보존과 구분한다. 일반 목록 내어쓰기와 code/table,
비지원 위치의 기존 Shift+Tab은 유지한다. caret offset·storedMarks·한 Undo/Redo를 검증한다.

재현용 합성 파일은 `apps/editor/tests/fixtures/manual-procedure-outdent.manual.json`이다.
같은 디렉터리의 `generate-manual-procedure-outdent-fixture.mjs`로 재생성하며
6,282바이트·2쪽·기존 합성 PNG 자산 1개다. 빈 세 번째 제목과 뒤 안내, 내용이 있는 중간
단계·앞뒤 단계·이미지·extensions를 포함한다. 파일 validator 통과와 native 화면 수락은
구분한다. 모델 담당은 kernel과 관련 검사, UI 담당은 빌드와 사진 조건의 native 수락을 맡는다.

최종 kernel `78bee353fde01b064ad772827d3ae0d53654062c9cc2a6e878d45e62331d03c4`의
관련 모델 검사 **20/20**(신규 16개·기존 관련 4개)가 통과했다. 첫/중간/마지막/유일한 단계,
빈 제목과 여러 caret offset, marks·extensions·하위 ID·이미지 bytes·파일 왕복,
단일 전환 Undo/Redo, code/table/list 우선순위와 IME guard를 확인했다.
본문·범위 선택·Procedure NodeSelection의 기존 키 처리를 추가로 소비하지 않는다.
이전 108개/keyboard 30개 전체 검사는 반복하지 않았다.

UI 담당은 별도 2,457바이트 합성 파일로 사진의 빈 세 번째 제목 조건을 native 재현했다.
Shift+Tab 뒤 앞의 두 단계는 유지되고 원래 step ID를 가진 page-level paragraph에
caret offset 0과 본문 도구 상태·PM focus가 놓였다. 원래 빈 설명과 뒤 본문도 유지됐다.
`Outside procedure paragraph.` 입력→입력 Undo→전환 Undo에서 원래 세 단계와 빈
stepTitle caret이 복원됐고, 각각의 Redo도 ID/meta/text DOM snapshot과 일치했다.
Ctrl+S의 메모리 저장 완료 뒤 보관함 재열기에서도 입력과 원래 설명 ID를 포함한 전체
snapshot이 같았다. 모델의 내용 있는 중간 단계·자산 검사와 이 native 빈 마지막 단계
검사를 구분한다. [전환 후 화면](assets/manual-editor-ui-audit/manual-step-shift-tab-qa.jpg)은
조정 담당도 직접 시각 검토했다.

### 작성 화면의 작업 공간과 간격 재점검 — 2026-10-07

사용자가 `+` 왼쪽 여유와 제목 바로 아래 체크박스 위 여유를 지적하고 전체 레이아웃
점검을 요청했다. 기존 LDS 의미 색상·글꼴·제목 띠와 공개 Callout을 유지하는 문서 편집
화면으로 점검한다. 색·타입 체계를 새로 만들지 않고 공간과 정렬을 정리한다.

- 작업 영역: 24px `+`와 손잡이, 두 버튼 사이 4px, 본문까지 14px인 총 66px 영역에
  종이 경계 여유를 추가한다. 버튼 크기 축소로 해결하지 않는다. 본문 대상과 page/cover
  wrapper 대상은 rect 기준이 달라 별도로 측정한다.
- 수직 간격: 제목 뒤 첫 블록의 공통 시작 간격을 보장하고 본문·목록·절차·그림·표·안내의
  기존 내부 간격을 확인한다. 첫 todo의 간격 규칙은 같은 specificity의 뒤쪽 margin
  shorthand에 덮였으며 toggle/code도 같은 원인이 가능하다. selector와 순서를 정리한다.
- 화면 경계: 좌우 패널, 좁은 작성 폭, toolbar·메뉴, 긴 제목·긴 문장·빈 문단을 확인한다.
  내용 폭을 지나치게 줄이거나 Core 내부·출력용 글자 크기를 바꾸지 않는다.

기준 레이아웃은 `외부 여유 | + · 손잡이 | 본문`의 독립 작업 공간과
`페이지 제목 → 공통 시작 간격 → 첫 블록`이다. 최종 수치는 실제 DOM과 화면을 보고 정한다.
소스 검토와 실제 측정을 구분하며 wide/narrow 검사 결과를 실제 OS 모바일·터치·200%
확대로 확대하지 않는다.

재현용 `apps/editor/tests/fixtures/manual-layout.manual.json`은 10,101바이트·3쪽·18개
최상위 블록·합성 PNG 자산 1개다. `generate-manual-layout-fixture.mjs`로 재생성한다.
첫 todo와 손잡이, 본문·목록·구분선·중첩 안내, 그림·표·토글·코드·절차,
첫 안내와 제목 1/2/3을 포함한다. UI 담당의 별도 QA frame에서 native 폭 선택 버튼으로
iframe의 실제 innerWidth와 CSS media query를 바꾼다. 사용자 브라우저 viewport나
제품 저장소를 강제로 변경하지 않으며 frame은 프로덕션 build entry에 넣지 않는다.

최종 CSS `87a2ceab77e63f189afb517466cbd17b86a70af55eb4faec3b96a305065c582f`는
screen-only 작성 규칙으로 버튼 작업 공간 66px에 바깥 여유 12px를 더한 본문 시작 공간
78px를 확보한다. 제목 띠의 폭은 유지하고 제목 뒤 첫 블록의 공통 간격은 24px로 정했다.
출력 alias·공개 Core 내부·중첩 padding과 기존 본문/목록/절차의 간격은 바꾸지 않았다.

UI 담당의 native iframe 실측은 다음과 같다. px 소수점은 브라우저 환산 결과다.

| 항목 | 수정 전 | 수정 후 |
|---|---|---|
| 넓은 화면의 종이 경계→본문 시작 / `+` 바깥 여유 | 65.125 / -0.875px | 77.984 / 11.984px |
| 390px 작성 폭의 동일 기준 | 36 / -30px | 78 / 12px |
| 첫 체크박스 위 간격 | 8px | 24px |
| todo·본문·안내가 각각 첫 블록인 세 페이지 | 종류별 margin 우선순위 위험 | 모두 24px |

3쪽·18개 최상위 블록의 본문/목록/절차/그림/표/토글/코드/제목/안내를 확인했다.
넓은 화면과 390px iframe에서 해당 DOM의 자체 넘침과 document 가로 넘침이 없었다.
1280px에서 목차와 속성을 함께 열면 main 832px·paper 785px·body 641.89px이며
main/document 넘침이 없고 `+` 바깥 여유 11.984px를 유지했다. 390px toolbar는
81px로 줄바꿈됐다. 실제 OS 모바일 입력기나 확대 수락으로 해석하지 않는다.

별도 page wrapper는 본문 시작 공간만으로 해결되지 않았다. 좁은 폭에서는 위로 쌓인
`+`가 toolbar를 15px 침범하고, 양쪽 패널을 연 넓은 화면에서는 wrapper 버튼이 목차에
겹치는 실제 실패를 확인했다. controller
`02266d872365b8c49ce2d0b077bfb047cade4dc12f9148a12a42c60d8674429e`는
page/cover 제목의 첫 줄을 기준으로 main과 viewport의 교집합 안에 8px 여유로 배치한다.
가로 공간이 부족하면 `+`를 26px 위로 쌓고 세로 범위 밖 버튼은 숨긴다.
본문 버튼 크기·66px rail·DnD/키보드 계약은 유지한다. 관련 신규 검사 **3/3**은
수정 전 실패→수정 후 통과를 확인했으며 이전 controller 18개 전체를 반복하지 않았다.

최종 native page wrapper 수락: 양쪽 패널 main `x196..1028/top194.094` 안에서
손잡이 `x204..228/y239.219..263.219`, `+` `x204..228/y213.219..237.219`였고,
390px main `x0..390/top297.188` 안에서 손잡이 `x8..32/y329.188..353.188`,
`+` `x8..32/y303.188..327.188`였다. 둘 다 목차·toolbar를 침범하지 않았다.
cover wrapper는 controller 검사 근거이며 이번 native 대상은 page다.
[넓은 작성 화면](assets/manual-editor-ui-audit/manual-layout-wide-qa.jpg)과
[390px 독립 작성 프레임](assets/manual-editor-ui-audit/manual-layout-narrow-qa.jpg)은
페이지 선택 상태의 캡처이며 조정 담당도 직접 시각 검토했다.

최종 build 1회(189ms)와 제품 HTTP 200을 확인했다. 제공 entry는
`manual-DH2w8aas.js` / `manual-CyB0P0Ri.css`다. UI 담당의 QA 탭 3개와 Vite session
25432는 종료됐고 QA44590 closed·제품44589 PID19797 유지가 확인됐다.
사용자 탭·문서·저장소·브라우저 viewport를 강제로 바꾸거나 새로고침하지 않았다.
이번 두 사용자 지적의 수락과 실제 OS IME·모바일 키보드/터치·200%·OS PDF 등
기존 전체 목표의 남은 환경 수락은 구분한다.

### `+` 삽입 메뉴의 불필요한 본문 선택 — 2026-10-07

사용자가 todo 옆 `+` 메뉴를 연 사진에서 해당 줄의 파란 강조를 지적했다.
이는 검색 input의 실제 키보드 focus와 별개인 본문 NodeSelection이다.
UI `openBlockMenu`는 `mode==='insert'`에도 `selectManualObject(targetId,{text:false})`를
dispatch했고, 메뉴의 enabled/choose는 그 현재 선택에 의존했다. 따라서 추가 위치만
지정하는 동작이 본문 선택과 도구 상태 변경까지 일으켰다. CSS에서 선택색만 숨기면
잘못 바뀐 커서·선택 의미는 남으므로 상태 변경을 제거하는 방식으로 수정한다.

결정: `+` 메뉴 열기는 target ID/anchor만 보관하며 PM 문서·selection·storedMarks를
변경하지 않는다. 검색 input은 바로 검색할 수 있도록 focus를 받는다. Escape/닫기는
원래 편집 선택으로 focus만 돌려준다. 블록 종류를 선택한 때 대상 바로 뒤에 삽입하는
transaction만 dispatch한다. 기존 명시적 블록 작업과 다중 블록 선택 표시는 유지한다.
원래 caret이 다른 본문에 있어도 target ID로 추가 위치를 결정하고, 빈 본문 target을
변환/대체하지 않는다. 중첩 안내의 내부 본문은 같은 parent의 바로 뒤에 추가한다.

UI 담당은 메뉴 wiring·빌드·native 화면, 모델 담당은 target ID를 사용하는 원자적 삽입과
관련 회귀, 조정 담당은 소스·수락 결과 대조와 이 문서 기록을 맡는다. 구현과 실제 수락
결과는 후속 기록으로 구분한다.

모델 수정은 `executeManualBlockCommand`의 target 선택을 insert 모드에서만 private
NodeSelection으로 적용하는 한 줄이다. 최종 삽입과 새 caret만 원래 state에서 시작한
단일 transaction으로 dispatch한다. 수정 전에는 빈 본문과 안내의 빈 두 번째 본문을
실제로 대체하는 두 실패가 재현됐다. 수정 후 관련 **15/15**(신규 target 5개·기존 관련
10개)가 통과했다. 다른 페이지의 caret과 underline storedMarks에서 dry-run state
identity 불변, 실제 dispatch 1회/doc step 1개, todo·빈 본문·안내 첫/빈 둘째 본문의
동일 parent 바로 뒤 삽입, 전체 기존 ID/extensions/inline marks 보존, 새 ID/caret 0,
한 Undo 원래 문서·caret/Redo 최종 문서·caret과 없는 target·IME 거절을 확인했다.
slash todo/divider/table·기존 중첩 삽입·context 변환도 관련 검사에 포함했다.
최종 kernel SHA는 `d1bdf797c510c25141bfd43efd481d36d5ba6bbde272bc574af3329bb6a1d655`,
검사 파일 SHA는 `3076e3f946898e42728e7792d5f2660e0d59a5ee4bca627dcf8bd80bd967d446`이며
조정 담당이 실제 파일과 대조했다. schema/dependency는 유지했고 기존 전체 검사를
반복하지 않았다. 메뉴 열기/취소의 실제 화면 수락은 UI 담당의 후속 결과로 기록한다.

최종 UI SHA `60dda8fbf473f30b8ae7ba93a8e395db2964e8daba445f52ff66b5465004c837`에서
insert open의 선택 dispatch를 제거하고 choose/활성 여부를 같은 target 명령으로
통일했다. CSS/controller와 기존 명시적인 블록/다중 선택 코드는 바꾸지 않았다.
최종 build 1회 211ms green, 제공 entry는 `manual-Bhr0Slzl.js` / `manual-CyB0P0Ri.css`다.
조정 담당도 현재 source SHA와 manual/JS/CSS HTTP 200을 직접 확인했다.

UI 담당은 기존 3쪽·18블록·자산1 layout fixture를 독립 메모리 QA에 native 가져와
다음 연결 동작을 수락했다. 사용자 문서와 실제 브라우저 보관함은 변경하지 않았다.

| 실제 동작 | 결과 |
|---|---|
| 다른 본문 range 0→3을 둔 채 todo `+` 열기 | 전체 kind/id/meta/text/marks/image DOM 불변, todo NodeSelection 0·본문 toolbar 유지, 검색 input focus, saved/저장 통계 2/2/active0 불변 |
| Escape로 닫기 | 같은 원래 본문 ID/range 0→3/PM focus 복원 |
| caret3에서 strong+underline 켜기→`+` 검색→Escape→실제 Z키 | caret/pressed 상태 유지, Z에 strong+underline 동시 적용·Undo 복원. 문자열 paste의 별도 marks 정책이나 OS IME 검증과 구분 |
| 다른 caret에서 todo 뒤 본문/제목2 삽입 | 정확한 todo 바로 뒤 fresh ID/caret0, 원 todo ID/내용/checked와 뒤 본문 유지, 각 한 Undo 문서 복원·제목2 Redo 동일 |
| 안내 내부 본문의 `+`로 본문 추가 | 같은 안내 parent의 바로 뒤 fresh p, 원 제목/본문/외부 본문 ID 유지·한 Undo 전체 DOM 복원 |
| 실제 todo 손잡이의 블록 작업→복제 | 의도한 NodeSelection 1·todo toolbar/검색 focus 유지, 복제 fresh ID·내용/checked 보존·한 Undo 전체 DOM 복원 |

[자동 선택 없는 삽입 메뉴](assets/manual-editor-ui-audit/manual-insert-menu-no-selection-qa.png)와
[todo 뒤 제목 추가](assets/manual-editor-ui-audit/manual-insert-after-todo-qa.png)는
조정 담당도 직접 시각 검토했다. 실제 다중 선택 코드는 유지했고 이번 native 검사를
새로운 다중 선택 수락으로 확대하지 않는다. 실제 Z키 입력도 OS 한글 조합 수락은 아니다.
QA 최종 저장 11/11/active0 뒤 담당 tab4와 Vite session9546을 종료했고 QA44590 closed·
제품44589 PID19797 유지를 확인했다. 사용자 탭·저장소·viewport를 강제로 변경하거나
reload하지 않았다. 이번 지적 범위의 수정과 명시한 native 흐름을 수락한다.

### 작업 메뉴의 자동 선택 박스 제거 — 2026-10-07

사용자가 후속 사진의 손잡이 작업 메뉴에서도 todo 본문 줄에 파란 박스가 남는다고
지적했다. 앞선 수정은 `+` 삽입 메뉴로만 범위를 좁혔고 일반 작업 메뉴의 NodeSelection은
유지했다. 이는 실제 구현과 이전 native 보고의 NodeSelection 1에 그대로 남아 있던
동작이며 사용자 새로고침 문제로 설명하지 않는다. 메뉴를 열기 위한 자동 본문 선택을
필요한 피드백으로 판단했던 앞선 결정을 이번 지적에 따라 수정한다.

소스 원인은 두 경로다. controller는 pointer click·detail0 click·Shift+F10/ContextMenu에서
`selectElement`로 DOM 선택을 지우고 onSelect를 호출한 뒤 메뉴를 열었다. UI
`openBlockMenu`도 insert 외 모드에서 NodeSelection을 dispatch했다. 두 경로 모두
메뉴 대상 ID/anchor 전달만 하도록 바꾸며 CSS에서 선택색만 숨기는 방식은 쓰지 않는다.

결정: 일반 작업 메뉴도 열기/검색/취소 중 원래 문서·PM selection·storedMarks를
유지한다. 실행할 때만 target ID로 복제/삭제/이동/전환을 수행한다. 이미 직접 선택한
다중 범위 안의 손잡이는 그 범위 작업을 유지하고, 범위 밖의 다른 손잡이는 해당 단일
target에만 작업한다. 다중 메뉴 label·유형 변경 disabled도 그 실제 대상 범위로 계산한다.
메뉴를 열면서 새로운 선택 강조를 만들지 않는다. 명시적인 Enter 선택/편집, Shift 범위
선택, drag와 onMenu 없는 기존 v1 click은 별도 동작으로 유지한다.

controller 담당은 메뉴 진입 경로와 관련 회귀, UI 담당은 메뉴 대상/범위 routing·빌드·
native 화면, 조정 담당은 이전 판단의 정정과 최종 증거 기록을 맡는다. 기존 kernel의
private target 명령을 재사용하고 schema/dependency/Core/CSS는 바꾸지 않는다.
구현·실제 수락은 후속 결과로 기록한다.

#### 상시 단축키 안내 바 제거

작업 도중 사용자가 하단 `↑↓ 이동 · Enter 선택 · Esc 닫기` 바가 노션에도 있는지
질문했다. 이 footer는 Notion UI를 확인해 가져온 요소가 아니라 이 에디터의 공용
`BlockCommandMenu`에 추가한 상시 키보드 안내다. 작업 메뉴·삽입·slash에서 모두
노출됐고 메뉴 실측 높이에도 포함됐다. 사용자 방향에 맞춰 상시 footer를 제거하고
검색과 실제 명령만 남긴다. 방향키/Enter/Escape/Tab 동작과 ARIA는 유지한다.
footer 삭제 뒤 list를 footer로 잘못 재측정하지 않도록 높이는 header+list 기준으로
맞춘다. footer/kbd 전용 CSS도 함께 제거한다.

2026-10-07 [Notion 공식 작성 안내](https://www.notion.com/help/writing-and-editing-basics)를
조회했다. 공식 문서는 `+`의 내용 추가, 손잡이의 작업 메뉴/drag와 유형 변경·복제·이동·
삭제를 설명한다. 텍스트 자료에 이 상시 안내 바를 뒷받침하는 설명은 없다.
공식 block-menu GIF는 도구가 지원하지 않아 이미지 자체를 직접 대조하지 못했다.
따라서 모든 최신 Notion 메뉴에 해당 바가 없다는 실기 확인으로 표현하지 않는다.
바의 제거는 출처 없는 자체 안내를 기본 문서 편집 흐름에서 덜어내는 UI 결정이다.

#### 소스·관련 검사

controller 최종 SHA는 `bc81bbdd822a1d87f244b87c7a083737dfeebc343048d1fb4a27b8e30b9eae77`다.
메뉴의 pointer click/detail0/Shift+F10/ContextMenu 진입에서 `selectElement`를 호출하지
않도록 수정했다. 두 회귀의 수정 전 실패와 관련 **6/6** green을 확인했다. 메뉴 진입
4종×원래 선택 없음/다른 블록 선택의 8조건에서 선택 callback/DOM ranges clear 증가 0,
대상 class/aria-pressed의 새 선택 0, 원래 legacy 선택 유지, Delete 권한 추가 0을 검사했다.
onMenu 없는 기존 click/Space, Enter 선택/편집, Shift 범위와 drag/cancel의 메뉴 비호출도
포함했다. 검사 파일 SHA는 `229574c8b59186e06a8fb90c4d33b6fb2a472ab818bb129e472f7f31f0e69a5c`이며
조정 담당이 실제 source/test 파일과 대조했다. 이전 전체 controller 검사는 반복하지 않았다.

UI는 모든 메뉴 열기의 선택 dispatch를 제거했고 공통 membership 함수로 menu 대상이
기존 다중 범위 안일 때만 range action/label/변환 제한을 사용한다. 범위 밖의 단일 대상은
기존 kernel의 private target 명령으로 처리한다. UI SHA는
`eea0819b288ee4c5c93e9d7de25e13aec6a8ca5f5ac4da0bfa8fb87cc622e676`이다.
footer 제거의 메뉴 JSX SHA는 `6e69a4c4c4a1115b6a5f6aa46ca3ee4eb000a4cf4a35dfdb6410ce86310c2111`,
메뉴 CSS SHA는 `fdc77f94442ddb399a953d13309636de102cf4e767bb94a38a167bcd3f096661`이다.
조정 담당도 실제 파일과 header+list 높이 계산·footer 없는 JSX 연결을 직접 확인했다.
키 handler/검색/items/ARIA와 viewport API는 유지한다. 작고 되돌릴 수 있는 안내 UI
제거에 별도 구현 모사 테스트를 추가하지 않고 최종 build/native 화면 확인을 사용한다.

#### 다중 범위 포인터 메뉴의 수락 중 회귀

단일 블록의 메뉴 열기/취소·복제·유형 변경·삭제와 footer 제거는 담당이 native 확인했다.
이어 기존 두 블록 범위에서 손잡이를 pointer click하면 범위가 풀려 단일 블록 작업으로
바뀌는 실제 회귀를 발견했다. UI의 membership 코드만으로 수락 완료를 주장하지 않는다.
안정된 키보드 생성 범위는 손잡이 focus와 Shift+F10 검색 메뉴에서 유지되지만 같은
손잡이의 pointer click에서는 풀렸다. blur 또는 검색 focus 일반 결함으로 확장하지 않고
pointer/native DOM selection 경계를 담당 controller에서 좁게 수정·재수락한다.
조정 담당은 설치된 PM DOMObserver/selection source를 읽었으며, 근거 없이 공통
custom-selection plugin에 DOM 선택 잠금을 추가하지 않았다.

controller의 임시 `mousedown` 차단 후보는 관련 모델 4개가 통과했으나 실제 pointer
회귀는 같은 방식으로 남았다. 이 후보와 추가 검사만 되돌려 controller/test가 위
`bc81bb...`/`229574...`와 byte 단위로 동일함을 확인했다. unit 통과를 실제 해결로
확대하지 않는다. 실제 좌표 클릭에서도 같은 회귀가 재현돼 locator click만의 문제로
설명하지 않는다. 원래 범위는 첫 `beforeDrag`와 두 번째 호출, `onMenu`까지 유지됐다.
후속 trace는 약 6ms 뒤, 검색 field의 렌더/focus 이전에 손잡이가 focus인 상태에서
docChanged=false/selectionSet=true 전환과 DOM range collapse를 확인했다. 검색 focus가
원인이라고 단정하지 않는다. 최초 snapshot 덮어쓰기 가설도 해결 근거가 아니다.

동시 소스 편집이 Vite HMR을 통해 QA 문서를 초기화하는 혼선을 없애기 위해 UI 담당은
기존 memory-storage/narrow fixture만 별도 `/tmp` 빌드로 만들고 44590에 제공한다.
제품 dist·44589·사용자 탭/IDB는 이 격리 과정에서 변경하지 않는다. 임시 trace는 합성
저장소의 selection 종류/개수·doc identity·focus 전환만 기록하며 실제 내용/사용자 ID를
출력하지 않는다. 원인을 확인한 뒤 trace 제거와 최종 소스/빌드를 따로 대조한다.

실제 원인은 controller `finish`가 drag가 시작되지 않은 메뉴 클릭에서도 모든 문서 요소에
`classList.remove('manual-move-source')`를 수행하던 경로였다. 없는 class의 remove도 DOM
attribute mutation을 만들어 PM이 문서를 다시 해석하면서 선택을 바꿨다. controller
담당은 started drag일 때만 source cleanup을 실행하도록 좁게 수정했다. 새 회귀의 수정
전 remove 2건 실패→관련 **4/4** green과 non-drag 클릭/취소의 문서 class write 0,
실제 drag cleanup 및 기존 pointer/keyboard/v1 경계를 확인했다. 후보 SHA는
`a28daa5a18c9fc0de8811bc8d1d5294f14eb73634394c9ece706b58f7f57e8d0`이다.

UI 담당은 고정 `VrHGeYOi` QA에서 실제 좌표 클릭으로 기존 두 블록 범위의 같은 ID,
`2개 블록 작업 검색`과 유형 변경 disabled, 전체 문서 DOM 불변을 확인했다. 원래 범위는
계속 유지돼 snapshot 복원 dispatch는 0이었다. 원인을 고쳤으므로 임시 UI snapshot
복원 우회와 console trace를 제거했다. 최종 clean build의 범위 안/밖 명령·Undo,
paint/상단 `+`/메뉴 화면과 제품 반영은 후속 기록으로 연결한다.

조정 담당은 [명시 선택의 여유](assets/manual-editor-ui-audit/manual-explicit-selection-space-qa.png),
[범위 안 메뉴](assets/manual-editor-ui-audit/manual-block-menu-range-inside-qa.png),
[범위 밖 메뉴](assets/manual-editor-ui-audit/manual-block-menu-range-outside-qa.png)를 직접
열어 확인했다. 상단 `+`, 불필요한 footer 없는 명령 메뉴, 원래 두 블록 강조와 범위 안/
밖의 유형 변경 disabled 차이가 화면에 보인다. 이는 당시 고정 QA 후보이며 후속
공용 메뉴 아이콘·상태 푸터 수정의 최종 제품 화면 근거로 재사용하지 않는다.

UI 담당의 최종 clean `CYmXeuTn`/b9 native 검사에서 범위 안 실제 pointer 메뉴는
동일 두 블록과 범위 label/변환 제한을 유지했고 두 블록 복제의 fresh ID 및 한 Undo의
문서/범위 복원을 확인했다. 범위 밖 메뉴는 원래 두 블록 범위를 유지하며 단일 대상만
복제·H2 전환·삭제하고 각각 한 Undo로 문서와 원래 범위를 복원했다. 일반 본문 텍스트
범위에서 todo 메뉴를 열 때 NodeSelection/새 블록 범위가 0이며 Escape 뒤 원범위/focus가
복원됐다. 명령 메뉴의 상시 안내 바도 0이다.

같은 clean 후보에서 명시 선택의 computed spread 4px/원 padding 0px, 전체 page-relative
DOM rect·ID·text·assets 불변을 확인했다. 상단 `+`는 공개 Core SVG 20×20이고 문자 `삽입`
없이 이름/tooltip `블록 추가`를 유지한다. 메뉴 열기 16항목과 기존 본문 바로 뒤 H2의
fresh ID/한 Undo 문서 복원을 확인했다. 새 21개 공용 메뉴 아이콘과 상태 푸터는 이 clean
후보 이후 변경이며 그 시각 수락·제품 제공 entry는 별도 기록한다.

후속 최종 controller는 started drag에서도 class가 실제 있는 source만 remove하도록
좁혔다. source가 아닌 부모의 remove가 발생하던 회귀를 수정 전 실패로 확인하고 관련
**4/4** green을 확인했다. controller SHA는
`b9e80189fd7b648ddf4f2147e3615072681384d26e4926aa0dc8221dc62e86e3`,
test SHA는 `6a9de77d1bf5ebac183406bcb2d036f731a4fdf088f2697d775e26f46657b2d0`다.
조정 담당도 실제 파일 hash를 대조했다. a28 후보의 native 근거와 최종 clean b9 빌드의
수락을 구분한다.

#### 선택 표시 바깥 여유

사용자가 첫 본문의 선택 배경이 글줄에 빡빡하게 붙는 사진을 추가로 지적했다.
메뉴의 자동 선택 제거와 별개로, 명시적으로 선택했을 때의 paint에는 기존 간격 토큰
4px 수준의 바깥 여유를 둔다. 실제 본문의 padding/margin/높이를 바꾸지 않아 A4 배치/
손잡이 좌표/커서와 문서 내용은 불변이어야 한다. placeholder pseudo-element와 충돌하지
않고 공개 Callout 내부를 수정하지 않는다. 자동 메뉴 박스를 다시 만드는 방식은 금지한다.
실제 선택 범위의 시각·문서 rect 대조는 후속 수락으로 기록한다.

#### 상단 삽입을 `+`로 표시

사용자가 상단 `삽입`의 관행을 묻고 `+` 표시를 지시했다. 기존 같은 DropdownMenu의
명령/활성 조건과 키보드 경로는 유지하고, 공개 LDS Core의 plus 아이콘을 사용하는
버튼으로 바꾼다. 접근성 이름과 tooltip은 `블록 추가`다. gutter `+`와 slash 삽입도
유지한다. 전체 메뉴 아이콘 조사와 이 한 버튼의 수정은 별도 범위다.
UI 담당이 source에 반영했고 최종 native 이름/키보드/메뉴 수락과 제품 빌드는 후속
증거로 기록한다. Notion 공식 작성 안내의 gutter `+`/slash 설명을 상단 toolbar 위치의
동일성 검증으로 확대하지 않는다.

controller 담당 채팅에서 사용자가 별도 아이콘 감사 결과에 `그럼 해`를 지시해 메뉴
21개 glyph의 공개 Core Icon 교체도 승인됐다. 이 요청 전에는 read-only 감사였으며
상단 `+` 지시를 전체 아이콘 교체 승인으로 해석하지 않았다. 담당 catalog/Menu/CSS의
기존 명령 ID·검색·선택 API는 유지한다. Core/Theme/의존성을 바꾸지 않고 실제 registry
모양과 의미를 확인한 뒤 UI 담당의 최종 메뉴 시각 수락·제품 빌드와 연결한다.

### 입력 때 페이지가 계속 길어지는 원인과 새 A4 요구 — 2026-10-07

사용자가 본문 입력/Enter 때 페이지가 무한히 늘어난다고 지적했다. source는 작성
page와 content에 `height:auto`와 A4 `min-height`를 함께 사용하고 자동 넘김은 없다.
조정 담당의 실제 PM state 합성 100회 입력/Enter에서 pages 1→1, blocks 1→101이었다.
UI 담당의 별도 메모리 native 40회 Enter는 page ID/목차/page wrapper 1개를 유지하며
paragraph 1→41, page 높이 1122.516→1558.25px, content 997.781→1460px였다.
한글 문자열 paste 뒤도 page 개수는 1개였고 이는 OS IME 수락과 구분한다.
사용자 실제 탭은 담당 도구 inventory에 없어 사용자 저장소나 문서를 대신 조회하지 않았다.
따라서 이 합성 재현을 사용자 문서의 실제 page-count 계측으로 확대하지 않는다.

원인은 A4 종이처럼 보이면서 길이는 내용에 따라 계속 늘어나는 작성 지오메트리다.
‘노션처럼 연속 작성/A4는 출력 때’와 ‘작성부터 A4 고정/넘침은 다음 장’ 중 사용자는
후자를 명시적으로 선택했다. 현행 높이 자동 증가를 의도된 완료 동작으로 유지하지 않는다.

새 요구: 작성부터 A4 높이를 고정하고 입력/Enter의 넘친 내용을 다음 장으로 연결한다.
단일 PM view·기존 명시 페이지와 내용/ID/marks/extensions/assets·실행 취소·저장 왕복을
보존한다. 자동 이어지는 페이지를 구분하고 공간이 생기면 내용 복귀와 빈 자동 페이지
정리를 처리한다. 큰 요소를 계속 다음 장으로 옮겨 무한 빈 페이지를 만드는 loop를 막고
내용 잘림·타입 축소·overflow 숨김으로 완료하지 않는다. IME 중 처리, caret mapping,
문단/목록/절차/표 등 분할 경계와 출력 geometry 계약을 먼저 확정한다.
모델 담당은 순수 planner/명령과 관련 회귀, UI 담당은 DOM 측정·고정 A4·scheduler/
native 화면, 조정 담당은 계약·지적 원인·통합 증거 기록을 맡는다. 현재 구현 착수 상태이며
자동 페이지 넘김 완료 또는 기존 print preflight 통과를 새 기능 수락으로 표시하지 않는다.

#### 자동 흐름 계약과 통합 중 수락 조건

화면 폭 변화가 저장된 쪽수를 바꾸지 않도록 canonical 210mm에서 내용 높이를 측정한다.
작성 종이는 297mm 높이, 기존 inset/footer 공간을 유지한다. 좁은 화면의 전체 종이 보기
조정과 분량 처리의 기준을 분리하며 글자 크기 축소로 넘침을 숨기지 않는다.
기존 명시 페이지 사이에 새 자동 이어지는 페이지를 두고 같은 root 그룹에서만 push/
backfill한다. 빈 자동 페이지는 정리하되 빈 명시 페이지와 표지는 유지한다. 자동 제목은
원래 페이지 제목을 따르고 lead는 중복하지 않는다. 내용과 기존 ID/marks/일반 extensions/
이미지 bytes를 보존하며 새 fragment/반복 머리글에만 fresh ID를 준다.

긴 문단은 측정된 줄의 grapheme-safe inline 경계, 목록·절차·표는 항목·단계·행 경계를
사용한다. 콜아웃·인용·토글은 body child와 직접 자식 긴 문단의 경계를 추가 구현 중이다.
표의 tail 측정은 반복 머리글 높이를 포함한다. 조합 중 재분할을 미루고 오래된 doc의
측정은 거절한다. 횟수/쪽수 제한 및 진행 검사를 두어 거대한 분할 불가 요소를 반복해서
옮기지 않는다. 임의 깊이의 중첩, 한 단계/표 행 자체가 A4보다 큰 경우의 지원은 일반
본문 수락과 구분해 기록한다.

page/block의 자동 연결 정보는 editor 소유의 versioned extensions에 넣는다. whole-doc/
clipboard/명시 블록 복사 때 인식된 연결 ID만 새 ID로 remap하고 orphan fragment의
연결 정보만 제거한다. 일반 extensions 값은 불투명 데이터로 유지한다. 원래 입력과
뒤따르는 flow transaction을 한 history event로 연결해 Undo 한 번에 입력 전 doc/IDs/
selection, Redo 한 번에 전체 이어지는 문서를 복원하는 것이 수락 조건이다. native
연결에서 실제 커서 이동/삭제 backfill/저장·재열기까지 확인한 뒤 완료로 표시한다.

모델 통합 중 비어 있지 않은 텍스트 범위의 실제 회귀도 확인했다. 원래 본문 BCDE를
선택한 상태에서 자동 페이지를 만들면 기본 endpoint mapping만으로는 새 제목이 span에
끼어 BCTITLEDE가 된다. 기존 선택의 논리 ranges/content를 보존해 새 반복 제목이 복사/
삭제/서식/링크에 섞이지 않도록 좁은 모델 연결을 추가한다. 일반 native 선택·명시 제목
선택과 단일 caret는 이 해결을 위한 전역 선택 잠금으로 변경하지 않는다. forward/reverse,
대체/삭제, marks/link, Undo/Redo·JSON/bookmark와 중첩 반복 제목을 별도 수락한다.

조정 담당은 복제 경로의 typed 연결 remap 두 회귀와 기존 내부 링크 복제 한 검사를
실행해 관련 **3/3** green을 확인했다. root+tail 함께 복사 시 fresh root 연결, tail 단독
복사 시 인식된 연결만 제거, opaque literalRef/원본/marks/한 Undo 보존을 확인한다.
kernel/v2/planner 검사는 모델 담당의 최종 source 근거와 연결하며 전체 기존 suite를
완료 명목으로 반복하지 않는다.

모델 담당의 단계별 근거는 초기 핵심 21개, 컨테이너 경계 7개, 논리 텍스트 선택 경계
9개와 현재 kernel의 관련 기존 선택/페이지 보호/링크 4개다. 현재 37개 전체를 다시
실행한 결과로 합산해 표현하지 않는다. root는 현재 kernel/meta에서 위 복제 관련
**3/3**을 재확인했으며 82.9ms였다. 일반 본문·컨테이너 분할, backfill, 제목 변경 보존,
caret/NodeSelection/블록 범위와 논리 TextSelection의 모델 green을 native 연결 수락과
구분한다. 현재 모델 source SHA256은 다음과 같다.

이 후보의 selection helper를 조정 담당이 실제 PM state로 읽기 검증하다가 추가 회귀를
발견했다. 이미 생성된 tail 콜아웃 제목의 BCDE를 사용자가 직접 선택한 뒤 root 제목의
sync transaction을 적용하면 selection.content가 빈 값으로 바뀌었다. 새로 끼워 넣은
헤더 제외와 기존 제목의 명시 선택을 구분하는 수정이 필요하다. 아래 hash는 그 회귀의
발견 시점이며 UI 전체 수락의 최종 후보가 아니다. 모델 담당에 재현 순서를 전달했다.

후속 수정은 before/after의 parent ID+header kind를 비교해 새로 끼워 넣은 헤더만
제외 mask에 추가한다. 기존 FlowTextSelection의 mask는 map/JSON/bookmark에서
보존하며 기존 제목을 직접 선택한 내용은 남긴다. 모델 담당의 관련 **12/12**(기존9+
새3) green을 확인했다. 조정 담당도 같은 실패 재현을 새 source에 다시 적용해 title-sync
전후 BCDE/BCDE 및 일반 TextSelection 유지를 확인했다. 당시 새 selection SHA는
`9af8ff59cc57061a7ebe76a38317f56ce4cf925e37874e7b383856f452961ba4`, planner는
`33d74b3ebe3ec0b7eb69769cad3e59acc5e346ce08beb34f2865ed4f293bf587`, 검사 파일은
`5f61eb83e1489d6900afdb38f74f55d85673a57f28c67ee4848a5b783121401a`다.

| 파일 | SHA256 |
|---|---|
| `manual-pagination-meta.mjs` | `2ce848156fd8f39f8ff799591b9a6c9012a21e1bb65740febb1ebbca2988d5a6` |
| `manual-pagination.mjs` | `c3a4267d5e600791bc478e3284d372e5be70227f92fc1de8ea61763633b19100` |
| `manual-pagination-selection.mjs` | `fc5879cdb136e545d68fa7184f338cf9c851bb3a0c62123d64919165cdbec0b2` |
| `manual-kernel.mjs` | `1dfe08fe6ab8772fc3ef6d90efee96f40b82c9cd3afa0b3c89d383838106d917` |
| `manual-v2.mjs` | `8f7f5d13c2c470592a12b8f2cee1977d6bfa3b1de9ea403600a46f7d5392931e` |
| `redesign-pagination.test.mjs` | `32ec57a078ec91f0000af87de21cf32904a5061126aec214290c704ef753e00d` |

재현 파일은 `apps/editor/tests/fixtures/manual-pagination.manual.json`과 같은 폴더의
`generate-manual-pagination-fixture.mjs`다. canonical encode/decode validator로 생성한
**181,920바이트·명시 8쪽·최상위 11블록·합성 자산 1개**이며 긴 본문/콜아웃/인용/토글,
목록 32항목·절차 16단계·표 45행과 별도 그림 페이지를 포함한다. 실제 사용자 문서는
없으며 native import는 기존 격리 메모리 QA에서만 수행한다. 아직 이 파일의 자동
분할을 native 수락한 것은 아니다.

합성 파일 SHA256은 `3bcf142076dba1aa624f94a6b8491fdae5b898bcb3ef7244721fc5b1f0c4add3`,
생성기 SHA256은 `4bb710cbbb0b96c837c2b52599a401594b87c3962246d5704c0d5430aa9ca061`다.

### 작성 상태 푸터의 정보 목적 — 2026-10-07

사용자가 하단 저장 위치/자동 저장/다른 컴퓨터로 옮기는 상시 안내를 불필요하다고
지적했다. 기존 header의 저장 상태를 footer에서 반복하지 않는다. footer는 현재 쪽과
전체 쪽수·A4 같은 작성 맥락의 실제 정보로 바꾸고, 파일 이동 안내는 파일 메뉴의 해당
행동 주변에만 둔다. 실제 화면 배율이 연결되기 전 임의 100%나 가짜 컨트롤은 추가하지
않는다. 현재 쪽은 선택/목차/scroll의 의미를 정해 계산하며 알 수 없는 상태를 1쪽이라고
허위 표시하지 않는다. 좁은 화면의 줄바꿈·본문 공간과 파일/저장 오류 알림 발견 가능성,
caret와 문서/저장 불변을 UI 담당이 확인하고 최종 빌드에 포함한다.

#### 현재 서버 반영

UI 담당이 상단 `+`·공용 메뉴 아이콘·controller b9·4px 명시 선택 여유·새 footer를
현재44589에 반영했다. build **217ms green**, entry는 `manual-C3SakajR.js` /
`manual-Dfu9oLJO.css`다. 조정 담당이 HTML과 entry/공유 preload JS/CSS 10개의
HTTP200 및 기존 메뉴 단축키 footer class 참조 0을 확인했다. 서버 재시작·사용자
탭 reload·사용자 IDB 접근은 하지 않았다. 로드된 사용자 화면은 기존 빌드가 남을 수
있으며 저장 후 사용자 새로고침으로 현재 제공 후보를 적용한다.

footer 구현은 `편집 현재 / 전체쪽수 · A4`이며 caret/선택의 page ancestor 기준이다.
표지를 포함한 실제 paper 수를 표시하고 해당 paper를 찾지 못하면 총쪽수만 둔다.
상시 저장 설명을 제거하고 파일 이동 설명은 내려받기 메뉴 description에 옮겼다.
저장 성공은 header, 기타 성공 notice는 4초, 실제 실패/충돌은 status/alert로 유지한다.
이 후보의 footer/새 21개 아이콘의 좁은 화면 실기는 계속 진행 중이며 이전 b9 controls
native 결과나 HTTP200을 새 시각 수락으로 확대하지 않는다.

후속 UI 담당은 동일 source의 고정 `storage-DiyYpi4x.js` / `storage-DlOwhLI8.css`에서
새 footer와 공용 작업 메뉴 아이콘을 실제 확인했다. 작성 surface/PM view 각1,
인쇄 표면/미리보기 전환0이며 목차2→footer 편집2/3, 목차1→1/3을 확인했다.
파일 내려받기의 이동 설명이 메뉴에 보인다. 합성 quota 실패는 header 상태와 footer
alert가 4초 뒤에도 유지됐고 정상 retry 성공 뒤에는 header saved와 편집 위치만 남았다.
실제 OS quota 검사와 구분한다.

넓은 화면 작업 메뉴 SVG6/누락0/상시 안내 바0, actual iframe390에서는 document width390/
가로 넘침0과 menu x52..372·y424.1875..725.1875·320×301px, SVG6/누락0을 확인했다.
조정 담당도 [새 상태 푸터](assets/manual-editor-ui-audit/manual-single-writing-footer-qa.png),
[공용 작업 메뉴 아이콘](assets/manual-editor-ui-audit/manual-block-menu-public-icons-qa.png),
[좁은 프레임의 실제 메뉴](assets/manual-editor-ui-audit/manual-block-menu-narrow-qa.png)를
직접 열어 시각 확인했다. 잘못 잘린 이전 narrow PNG는 이 실제 메뉴 캡처로 교체했다.
전체 아이콘 registry20종의 정적 확인과 이 작업 메뉴 SVG6의 native 확인은 서로 다른
범위이며 모든 slash/turnInto item을 실제 조작한 것으로 합산하지 않는다.

| controls 빌드 source | SHA256 |
|---|---|
| `ManualEditor.jsx` | `446de23f9bbaa5b032e77783a87f72d9bea79c1c25de4834b4faac5fe4fe2217` |
| `manual-editor.css` | `94ff2f5acda3c54038fea64a59084ea30d00cb58972bf0e33c649ee16b651651` |
| `BlockCommandMenu.jsx` | `ebabe5effae62412a3ebbab45161165a67ed63a824d6bb2c8dc3fb3dd3b47c6f` |
| `block-command-menu.css` | `26859a9fe9074221f0f4f41881a5418ff609b837909548be61d5cce839ce3765` |
| `block-command-catalog.mjs` | `670fdb1f47939f477727a186351f617bbaf882fa01ccb5933c6832478caf4e0d` |
| `canvas-drag.mjs` | `b9e80189fd7b648ddf4f2147e3615072681384d26e4926aa0dc8221dc62e86e3` |

새 A4 runtime는 (2) 담당이 새 `manual-pagination-runtime.mjs`와 관련 검사를 쓰고,
UI 담당이 기존 ManualEditor/CSS/readonly 제목·geometry·native/build를 연결한다.
조정 담당은 `LDS A4 자동 넘김 마무리` heartbeat로 완료/복구까지 감시한다. 단순한
동일 진행 상태는 반복 알리지 않고 의미 있는 실패/반영/완료와 필요한 사용자 행동을
알린다. 이 단계에서 작성 A4 자동 넘김이나 기존 전체 목표의 완료를 주장하지 않는다.

### 콜아웃 오른쪽 빈 공간의 이어 쓰기 — 2026-10-07

사용자는 콜아웃 오른쪽에서 커서를 누르면 반응이 없는 것으로 보인다고 지적했고,
마우스로 오른쪽 빈 공간을 클릭하는 동작이라고 확인했다. 방향키 증상으로 해석하지
않는다. 현재 continueWriting은 page/content 배경에서 마지막 요소보다 아래인 blank만
처리하므로 같은 높이의 우측 여백은 명시적인 caret/이어쓰기 경로가 없다. 실제 event
target과 native focus/selection 결과는 UI 담당이 격리 문서에서 재현한다.

결정: 콜아웃 바깥의 흰 우측 여백은 해당 콜아웃 뒤의 외부 본문으로 이어 쓴다. 바로
뒤 본문이 있으면 재사용하고 없으면 같은 parent에 빈 본문 하나만 만든다. 콜아웃 파란
배경 안의 여백은 해당 내부 줄의 끝으로 caret만 이동하며 외부 본문을 추가하지 않는다.
실제 텍스트/아이콘/손잡이·modifier 범위 선택·drag를 가로채지 않고 자동 선택 박스를
만들지 않는다. 기존 ensureParagraphAfter 명령을 사용해 ID/내용/서식·다음 페이지와
한 Undo를 보존한다. UI 담당은 native/hook, controller 담당은 좁은 순수 hit-rule, 모델
담당은 별도 A4 runtime를 맡는다. 현재 구현·native 확인 중이며 두 결함 원인을 섞지 않는다.

UI 담당의 native 재현에서 흰 우측 point(1070.219,563.219)는 page content DIV를
hit했다. 콜아웃 실제 frame은 x411.641..1062.219/y520.219..606.219이고 content right는
1078.219였다. 문서 변경/새 선택 박스는 0이나 기본 caret는 내부 본문 끝 offset14로
이동했다. 클릭 무시라기보다 외부 이어쓰기 의도가 내부 caret로 잘못 연결된 결과다.

controller 담당은 독립 manual-caret-hit.mjs의 getManualOutsideCalloutTarget 순수
helper를 구현했다. page/content 배경·같은 page 직접 자식의 실제 frame 우측·같은
y band만 허용하고 모든 visible frame 안의 blue padding/중첩 parent는 제외한다.
다른 page/숨김/잘못된 rect/경계 밖/control/modifier/drag/rail/menu는 제외한다. 관련
geometry6과 실제 제공 좌표1 각 green이며 UI 명령 연결의 수락을 대신하지 않는다.
helper SHA256은 44362e88c064ed9cfb77851c0a5cf4848272869ea123a7fddd5b0fb239e3392f다.

첫 연결 native에서 기존 외부 본문은 같은 ID/caret0로 재사용하고 문서는 불변이었다.
마지막 콜아웃에 뒤 본문이 없을 때 같은 page에 외부 빈 본문 하나를 생성하며 자동
박스는 0이다. blue padding 클릭은 내부 caret만 이동한다. 새 본문 생성 Undo가 직전
QA 삭제와 기본 history 시간창으로 합쳐진 실제 경계를 발견했다. UI는 클릭 결과의
docChanged transaction에만 closeHistory barrier를 적용하고 다음 고정 후보에서
생성/typing/한 Undo 및 기존 IDs/meta/다음 page 보존을 재수락한다. 아직 product 반영
완료로 표시하지 않는다.


#### 우측 여백 최종 수락과 반영

고정 `storage-OYGGXz1C.js` / `storage-Dtyqz7_R.css`에서 기존 뒤 본문의 동일 ID/
caret0 재사용·전체 문서 불변·자동 박스0을 확인했다. 뒤 본문이 없는 마지막 콜아웃은
같은 page에 외부 빈 본문 하나를 만들고 콜아웃·다음 명시 page를 보존했다. 생성에만
closeHistory를 적용한 뒤 toolbar Undo1은 직전 문서를, Redo1은 생성 문서와 IDs를
정확히 복원했다. 외부 본문에 실제 `test` 입력이 들어가며 Undo1 뒤 빈 본문 상태가
복원됐다. blue padding은 내부 끝 offset14/doc 불변/외부 추가0이었다. 도중 뜻밖의
한글 입력이 섞인 QA 회차는 수락에서 제외하고 격리 reload 후 toolbar 경로로 다시
확인했다. 실제 OS 한글 조합 수락과 합산하지 않는다.

조정 담당도 [콜아웃 뒤 이어쓰기 화면](assets/manual-editor-ui-audit/manual-callout-outside-caret-qa.png)을
직접 열어 외부 본문 위치와 선택 박스0을 확인했다. 최종 제품 build224ms green,
`manual-BCBjXfMb.js` / `manual-B6WrX1dK.css`이며 manual HTML과 참조 JS/CSS10개
모두 HTTP200을 확인했다. 사용자 탭·저장소를 읽거나 강제로 새로고침하지 않았다.
이 빌드 시점 ManualEditor SHA256은
`e597a3323ac51473b7086a720ca042e64dd9a1c3782d9c03bb1a0fd9e137c7d0`,
CSS는 `ee4d8b25a117e23c4dfd58aa4b46c1dd8587929199db6a2072a64c6ef156622a`다.

공용 메뉴 아이콘 후속 native는 slash16 항목 각각 실제 SVG1/누락0, 제목1/2/3 숫자
구분, 변환 메뉴 뒤로/닫기 각 SVG1/누락0을 확인했다. 조정 담당도
[slash 제목 아이콘](assets/manual-editor-ui-audit/manual-slash-public-heading-icons-qa.png)을
직접 열어 구분과 정렬을 확인했다. 앞선 작업 메뉴 넓은 화면/390px 결과와 구분해
합산하며 20종 registry 정적 검사만으로 모든 실제 메뉴를 통과했다고 기록하지 않는다.

### 링크 버튼 목적 재검토 — 2026-10-07

사용자가 툴바 `링크 편집` 버튼의 목적을 물었다. 기능은 선택한 텍스트에 참고 URL을
연결하거나 caret가 있는 기존 링크 전체의 URL을 수정·해제하는 것이며 Ctrl+K도 같은
대화상자를 연다. 이는 매뉴얼의 별도 주소 블록을 되살리는 기능이 아니다.

현재 `openLink`와 `setManualLink`를 읽어 확인했다. 텍스트 선택이 없고 기존 링크도
아닌 caret에서 URL을 적용하면 즉시 링크 텍스트를 만들지 않고 다음 입력에 적용할
storedMark를 둔다. 버튼은 dry-run mark 가능 여부로 활성화하므로 일반 빈 caret에도
켜진다. 이 숨은 상태는 목적과 적용 대상을 이해하기 어렵게 한다. 기존 링크 편집과
새 선택 글자 연결의 표시 조건/이름, 빈 caret에서의 적용 피드백을 후속 버튼 개선
항목으로 기록한다. 질문만으로 기능을 삭제하거나 아직 수정하지 않은 조건을 완료로
표현하지 않는다.

### A4 기본 흐름 반영과 남은 경계

`manual-DB6wSdo1.js` 시점 basic native는 A4 793.6875×1122.515625px,
content997.78125px를 확인했다. 27문단에서 Enter 뒤 root27+auto1의 2쪽,
caret/footer2/2와 읽기 전용 자동 제목이 연결됐다. 한 Undo는 원래 27문단/1쪽/IDs,
한 Redo는 2쪽/IDs를 복원했다. 이 연결은 후속 BCBj 빌드에도 포함된다.

현재 runtime SHA256은
`004c321495ef211e780d6001d678f04b30164c5ef2b9d8abc00c731244a484d4`이며
관련 runtime10/10 green을 재사용한다. 초기 문서 설치는 normalize를 명시 호출하고
history에 넣지 않는다. 이미 보관된 문서의 정규화는 기준선을 갱신하며 자동 덮어쓰기를
하지 않고, 새 복사본은 정규화 뒤에도 저장 대상으로 남긴다. 정규화 중 실제 입력은
기준선 갱신 대상으로 잘못 흡수하지 않는다.

UI 담당의 긴 합성 fixture 초기 native는 명시8→전체16쪽(auto8), 모든 종이 동일 A4,
direct block 넘침0, Undo disabled/history0이었다. 목록27+5, 절차12+4, 표23+23+2행의
번호 이어짐과 반복 header를 확인했다. 새 복사본은 write/commit 각1 후 saved로
표시됐다. 저장본 재열기/자동 덮어쓰기0·export 원문/marks/meta·사용자 Undo/caret/
삭제 backfill·좁은 화면은 이어서 검사하며 초기 결과를 전체 자동 흐름 수락으로
확대하지 않는다.

최신 사용자 링크 버튼 첨부 화면에는 ‘자동 페이지 나눔을 마치지 못했습니다’ 오류가
실제로 보인다. 조정 담당은 이를 UI·runtime 담당에게 전달했고 사용자 문서/IDB를
조회하지 않는 합성 mixed fixture로 진단을 이어간다. join margin 차이로 pull/push가
반복될 가능성은 소스 리뷰의 미확정 가설이며 실제 원인이나 해결 완료로 기록하지
않는다. 오류 경계의 복구와 나머지 native를 완료할 때까지 기존 heartbeat를 유지한다.


#### 자동 흐름 도중 저장 전환과 초기 저장본 QA

실제 planner/transaction과 memory CAS writer를 함께 사용하는 신규 연결 검사에서,
지연 저장 중 1쪽→3쪽 자동 흐름이 완료되면 saveBeforeReplacement는 먼저 완료된
1쪽 저장으로 문서를 교체하지 않았다. 최종 3쪽/기존 ID/marks/extensions와 합성 자산을
다음 revision에 저장한 뒤 교체했다. encode/decode와 createManualState 재열기 equality도
확인했다. 기존 autosave16검사는 반복하지 않고 신규 연결1건만 실행해 green이었다.
이는 모델/메모리 저장 증거이며 브라우저 인쇄나 실제 IDB/native 수락을 대신하지 않는다.

UI 담당의 실제 초기 저장본 검사를 위해 격리 storage fixture에
`?document=pagination` 경로를 추가했다. 원본 합성8쪽+자산1을 최초 saved record로 넣고
attempts/commits0부터 시작한다. initialAssets를 문서 ID별로 주입하는 옵션만 확장하며
기존 기본2문서/저장 API는 유지했다. fixture4/4(기존3+새seed의 자산/분리 복사/통계0)
그리고 변경된 fixture를 사용하는 신규 A4 저장 연결1건이 통과했다. UI는 이 seed의
8→16쪽 정규화·저장0/history0/header saved/자산과 교체 보호를 실제 검사한다.

후속 native에서 새 장으로 넘어간 실제 caret는 모델상2쪽이지만 문단 y896..918,
main 표시194..684로 화면 밖이었다. runtime가 입력에 연결된 flow transaction에만
scrollIntoView를 추가했다. 초기 정규화/layout는 스크롤하지 않는다. 관련 신규검사1건은
user flow true/initial·layout false 및 한 Undo/Redo의 문서·ID·caret 보존을 확인했다.
runtime SHA256은 `03492ced28fdbbc1edd3a1cc52653cd8aceb50c0a3ece766f8172fd66fe05516`,
검사 SHA256은 `843a591d3afd36500d06fe33036f8020219165432617fb9684abf9db01f70e0b`다.
이 시점은 수정 source가 준비된 단계이며 실제 가시 caret/최종 서버 반영은 이어 수락한다.


후속 고정 `storage-VLfK8qAc.js` / `storage-Dtyqz7_R.css`에서 user flow scroll 수정은
실제 커서를 y660.734..682.734/main194.094..684.5 안에 보이게 했다. 연속27Enter 뒤
한 Undo/Redo는 burst 전의 1쪽/문서/ID/meta/marks/자산과 2쪽 결과를 복원했다. 도중
26Enter 후 snapshot을 한 Undo 기준으로 삼은 회차는 history group 기대 오류라 수락에서
제외하고 burst 전 상태로 재검사했다.

간격 결함도 실제 측정 함수의 deterministic DOM fixture에서 재현했다. 본문 rect44/
marginBottom12와 콜아웃 rect28/marginTop16/marginBottom16은 함께 있을 때 occupied104/
capacity100이라 push되나, 떨어진 뒤 root56/remaining44와 next44로 잘못 pull된다.
실제 joined gap의 추가4px가 빠져 push/pull/no-progress가 반복된다. 모델 담당은 숨긴
실제 paper/content 복제본으로 joined gap을 재고 선택/문서/저장 변경 없이 제거한다.
optional pullGap을 whole/split available에 함께 반영한다. 실제 auto 쪽 제목 직후 margin
override를 computed 숫자만으로 대체하지 않는다. 빈 이전 쪽의 제목→첫 블록 gap도 검사한다.

현재 runtime `fb22cf2a303a412f8228b2d9c6f8669fe72eadfa58c1ed5178d3af864910fb15`와
planner `a4aac3ae160d65a57529b03bf2b0496644d2755a7b42f35624b127640662cff0`의
신규 관련4건은 scroll/initial/layout/UndoRedo, join loop→stable→실제 fitting backfill,
빈 root의 제목 gap32와 probe cleanup, whole/split overhead·잘못된 측정값을 확인했다.
기존 전체 green은 반복하지 않았다. 사용자 원문 배너의 원인 확정으로 확대하지 않는다.

production D0Ogz8aE 빌드가 user scroll 후보를 읽는 동안 gap source도 함께 읽었다.
조정 담당은 asset의 pullGap7참조와 frozen source를 대조해 이를 확인했고 UI/model에
수락 후보를 분리하도록 전달했다. D0 HTML/참조JS·CSS10개 HTTP200은 확인했으나
03492 native를 새 gap의 수락으로 사용하지 않는다. 이후 writer는 snapshot 완료→수정→
source 동결→native/build의 경계를 맞춘다. 현재 새 후보의 실제 gap 경계·초기 저장본
수락과 source-only 독립 검토는 계속 진행 중이다.


독립 readonly 리뷰는 runtime fb22/planner a4에서 import 전후와 재현 완료 뒤 SHA 불변을
확인하고, 메모리 내 PM state로 별도 false positive를 검증했다. root NEW와 같은 길이의
OLD 제목을 가진 자동2쪽은 첫 title 갱신 후 두 번째에서 no-progress로 멈춰
NEW/NEW/OLD를 남겼다. 빈 자동2쪽 제거도 첫 제거 후 같은 key로 멈췄다. title/remove-empty의
actual pageId를 rootID와 content.size로 치환해 서로 다른 정상 작업이 충돌하는 문제다.
push/pull cycle guard를 없애지 않고 action별 실제 target identity를 보존한다.

또한 maxPasses1에서 height60/cap100 문단2개를 push1로 나누면 최종 두 쪽은 모두
fit하지만, stable 측정 이전의 한도 검사로 pass-limit를 잘못 표시했다. 동일 최종 상태를
pass0으로 계획하면 stable였다. 한도는 더 실행할 action이 필요한 경우에만 검사해야 한다.
이 3개 실제 메모리 반례를 새 gap4건 green이나 사용자 원문 UI의 수락과 섞지 않는다.
UI 고정 QA build388ms/exit0와 직후 frozen SHA를 확인한 뒤 모델에 source 수정 경계를
넘겼으며 새 수정은 동결·관련회귀·다음 후보 native/build로 별도 수락한다.

조정 담당은 [콜아웃 간격 오류 수정 전](assets/manual-editor-ui-audit/manual-a4-callout-spacing-error-before-qa.png)을
직접 열어 실제 동일 경고 배너와 콜아웃/바닥 위치를 확인했다. 이 합성 native recipe는
23문단, 첫 문단의 ShiftEnter3회(height88), 첫 빈 문단 H3(height24), 마지막 안내(height88)
이다. 실제 joined gap16과 직전 본문 marginBottom12의 4px 차이가 확인됐다.


UI의 fb22/a4 고정 `storage-Cgq9M2uX.js` / `storage-Dtyqz7_R.css`에서 동일 콜아웃
recipe는 안정된2쪽/콜아웃2쪽/경고0으로 바뀌었다. 한 Undo는 원래23문단+H3+hardBreak
문서/ID/meta/marks/자산을, Redo는 콜아웃2쪽 결과/IDs를 정확히 복원했다. 조정 담당도
[간격 수정 후](assets/manual-editor-ui-audit/manual-a4-callout-spacing-fixed-qa.png)를 직접
열어2쪽/다음 장의 콜아웃/경고0을 확인했다. 현재 제공 D0Ogz8aE/B6는 이 source pair며
단순 HTTP200과 이전 scroll-only 수락으로 gap의 통과를 대신하지 않았다.

독립 리뷰의 두 오류 판정은 신규3건 red→green과 기존 진짜 미완료/모순geometry2건
그리고 planner의 기존 stale/invalid/composed/실제한도/oversize 경계1건 관련6green으로
수정했다. title/remove-empty만 actual pageId key를 사용하고 push/pull cycle guard를
유지한다. 추가 action이 필요할 때만 pass-limit가 된다. source-only 독립 리뷰도 이 작은
변경과 SHAs를 대조했고 green 실행을 중복하지 않았다.

다음 후보 동결 SHA256:

| 파일 | SHA256 |
|---|---|
| runtime | `329a2201e66314c7cab6f307b7a1708d542d7d22a9f19f74662c11a625e6c94e` |
| planner | `df36834bd3e68f412fe56cb8239210caeaea58f46b5c5627ff77f220e0e74c0a` |
| runtime tests | `a7a3cf0c73309ee819fec748e849682ef65215841a49a419089c17d9e3a50d25` |
| planner tests | `e073d038e696db0f25c1528ba4c71acc19c34dbc914a3eca7f03e1ec4acf13eb` |

새 `manual-pagination-seeds.mjs`와 `?document=pagination-empty`는 saved root NEW+본문1개/
제목 OLD·본문0의 automatic2쪽을 만든다. canonical3쪽/uniqueIDs/typed root 참조/파일
왕복/저장0을 확인했다. 합성 QA에만 연결하며 제품 storage/사용자 IDB를 seed하지 않는다.
root main seed와 모델 source를 동결한 뒤 다음 고정 QA에서 모두 제거→1쪽/경고0/
history0/저장0과 여러 자동 쪽 제목 갱신을 native 수락한다. 아직 새 source를 product에
반영했다거나 이 최종 guard native가 통과했다고 기록하지 않는다.


새329a/df36 고정 후보에서는80Enter→3쪽/각27문단 뒤 root 제목을 native로 바꿨을 때
세 제목이 모두 동기화되고 경고0·한 Undo/Redo의 rich 문서 equality를 확인했다.
그 과정에서 둘째 automatic 제목의 contenteditable이 빠지는 실제 UI 결함을 발견했다.
PM이 같은 제목 Node를 여러 page에 재사용하는데, Node 객체→position Map은 마지막
위치만 보관했다. 실제 split2회로 shared title Node를 만드는 신규 회귀1건은 red였고,
UI는 제목 readonly와 빈 필드 hint를 위치별 Decoration 배열로 변경해 관련5/5를
통과했다. domain 저장 내용을 변경하지 않으며 root 제목은 editable로 유지한다.

automatic 목차의 첫 본문 찾기도 빈 data-manual-id의 제목을 본문으로 오해하지 않게
nonempty ID로 좁혔다. 모델 source329a/df36는 동결을 유지하며 새 UI source의 모든
반복 제목 readonly·원제목 편집·초기 saved seed·empty auto2개와 최종 빌드는 이어
native 수락한다. 앞의 title 동기화 green을 readonly 결함까지 이미 통과한 것으로
확대하지 않는다.


### A4·링크 통합 반영 수락 — 2026-10-07

`manual-Cu3-VQIh.js`(348865B) / `manual-C65mBesw.css`(27006B), build219ms green을
44589에 반영했다. root도 HTML/참조JS·CSS10개 HTTP200을 확인했다. 이 단계의 UI
frozen source는 ManualEditor6c991ef9, CSS9ea31237, Print071d89d6, layoutedd254da,
runtime329a2201, plannerdf36834b, 새 link helperf2a66459다. 이후 사용자 승인된 page/
block 구분 source와 섞어 하나의 native 후보로 기록하지 않는다.

고정 BT3에서80Enter→3쪽/각27본문, automatic2/3의 derived=true/contenteditable=false/
경고0을 확인했다. 목차02는 실제2쪽 첫 본문 caret0과 y195.734..217.734를 main
194.094..684.5 안에 표시했다. 초기 saved8쪽+자산1은 화면16쪽, 모든 종이
793.6875×1122.515625px, direct DOM overflow0, 그림 complete/naturalWidth200,
저장 attempts/commits0/0, Undo disabled, 경고0이었다. 원본 재열기는 같은324개
kind/text/meta/marks/images와 원본216개 표시ID를 유지했다. 원본에 없는23개 분할/
auto/header UUID는 새로 생성돼 전체 snapshot ID equality는 false다. 이를 exact라고
확대하지 않는다. 빈 auto2개 seed는 saved3쪽을 유지한 채 view1쪽 NEW/원문으로 정리하고
저장0/history0/경고0이었다.80개 빈 문단 범위 삭제의3→1쪽/한 UndoRedo도 rich doc/IDs와
meta/marks/images equality로 수락했다.

인쇄 preflight는 최초 title1 외에9쪽 list/13·14쪽 table overflow3을 발견했다. 출력 전용
sectionbody의 bottom16px/first margins/identitywrapper가 작성과 달랐다. UI CSS에서
wrapper display:contents와 작성과 같은 sectionbody padding(top24/left28.875/right16/
bottom0), 빈 p22px을 연결했다. 중간 후보 Dij에서는 display:contents의0×0 rect가
숨긴 인쇄 표면의 negative right와 비교돼 오히려16개 false warning을 만들었다.
ManualPrint가 실제 너비·높이0인 identitywrapper를 제외하고 보이는 후손/scrollHeight를
판정한 뒤 PKd gate는 문서 제목만 빈값일 때 title issue1/overflow0/OSdialog0이었다.
실제 OS 인쇄나 PDF bytes 수락으로 표현하지 않는다.

새 getManualLinkContext는 visible document target을 판별한다. ordinary/empty caret와
storedMark-only는 false, selected range/실제 링크 caret는 기존 kernel guard와 실제
첫 선택 글자의 URL을 사용한다. code range/없는 editor는 false이며 doc/selection/marks
불변이다. 신규5/5와 새 planner를 함께 쓰는 A4 저장 연결1건 targeted green을 확인했다.
helper SHA는 `f2a66459928987874d3350b08ea0b962b1b8feb462c9999238d3f9efaab29b5a`다.
UI Bsxj에서는 일반 caret의 링크 추가 disabled/CtrlK modal0/직전 doc 불변, 실제 선택한
글자만 href 추가, 링크 안 caret의 기존 URL prefill·편집, 해제 뒤 anchor0/일반 caret
비활성, Undo1 rich snapshot 복원을 확인했다. CtrlK 준비 전 외부 한글1자가 들어온 회차는
기본seed text equality/실제 OS IME 수락에서 제외했다. 동작 직전 snapshot의 불변만 수락한다.

390px 실제 frame은 documentWidth390, paper793.6875×1122.515625, main client375/
scroll818, preview0/입력PM1, 블록 추가 menu112.98..270.98로 viewport 안에 있었다.
root도 [최종 단일 작성 화면](assets/manual-editor-ui-audit/manual-single-writing-a4-final-qa.png)을
직접 열어 paper/toolbar/새 링크 조건/편집 위치를 확인했다. UI의 오른쪽 open 결과는
queued라 actual visible이라고 주장하지 않는다. 사용자 원탭 reload/IDB 접근0, 제품
서버PID19797은 유지하며 QA 자체 탭/44590만 정리한다. 실제 OS IME/200%/터치/PDF와
새 다운로드 bytes·started drag Escape 등 남은 조건은 §14에 그대로 남긴다.


### 페이지·본문 컨트롤 구분과 일반 제품 조사 — 2026-10-07

UI와 모델 담당 채팅에서 사용자가 page 전체의 +/손잡이를 지적했고, 공식 사례 조사 뒤
권장안대로 구현하도록 각각 실행 지시했다. root는 전달받은 근거를 공식 데스크톱 안내와
직접 대조했다. 다음 표는 제품의 사실이며 LDS에 하나의 위치를 강제하는 근거가 아니다.

| 제품 / 페이지 개념 | 공식 생성 위치·대상 |
|---|---|
| Word / 문서 흐름 | cursor 위치에서 Insert→Blank Page. Page Break는 뒤 내용을 다음 쪽 위로 보내는 별도 동작. [Microsoft 안내](https://support.microsoft.com/en-us/word/insert-a-blank-page-in-word) |
| Docs / 문서 흐름 | 상단 Insert→Break에서 Page Break 등을 선택. pageless에는 해당 break를 제공하지 않는다. [Google 안내](https://support.google.com/docs/answer/11526892?hl=en) |
| PowerPoint / 독립 슬라이드 | 선택한 슬라이드 뒤에 Home→New Slide로 추가하고 thumbnail pane에서 관리. [Microsoft 안내](https://support.microsoft.com/en-gb/powerpoint/training/add-rearrange-duplicate-and-delete-slides-in-powerpoint) |
| Slides / 독립 슬라이드 | 상단 왼쪽 New slide + 또는 layout 선택. [Google 안내](https://support.google.com/docs/answer/1694830?hl=en) |
| Canva / 독립 디자인 페이지 | scrolling view의 현재 page 윗모서리 Add page, thumbnail/grid의 마지막 옆 또는 사이 hover Add page. [Canva 안내](https://www.canva.com/help/manage-pages/) |
| Acrobat / PDF 독립 쪽 | Organize pages의 왼쪽 Insert→Blank page 또는 thumbnail context. dialog에서 첫/끝/특정 쪽 앞·뒤를 지정. [Adobe 안내](https://helpx.adobe.com/acrobat/desktop/edit-documents/combine-files/insert-blank-page.html) |
| Notion / 문서 계층 | sidebar의 section/page 옆 +와 상단 새 문서. 본문의 /page는 A4 paper가 아닌 subpage를 만든다. [Sidebar](https://www.notion.com/help/navigate-with-the-sidebar), [Subpage](https://www.notion.com/help/create-a-subpage) |

LDS 판단: A4 자동 이어지는 쪽, 명시 페이지 추가, 본문 블록 삽입을 구분해야 한다.
현재 page도 block와 같은 data-move-path/control policy를 사용해 ‘페이지 아래에 블록
추가’라고 표시하며, page target에서는 실제로 page만 삽입할 수 있어 이름·대상이 틀렸다.
clip 여유가 작으면 +가26px 위로 쌓여 어떤 손잡이의 추가인지도 모호했다. 이는 단순한
버튼 위치보다 역할/target 문제다. 공식 앱들이 모두 같은 위치를 쓴다거나 노션의 문서
계층을 LDS 물리 A4와 동일하다고 기록하지 않는다.

합의된 별도 후보 계약:

- v2 page/cover의 gutter +는 숨기고 sidebar의 페이지 관리에서 삽입 위치를 ‘n쪽 뒤에’로
  명시한다. page/cover menu와 drag는64×24 이름표를 paper.top+12/firstTitle.left에
  두어 보존하고 main∩viewport에 clip한다.
- 일반 본문의 +와24px 손잡이는 같은 y에 가로로 둔다. 삽입 버튼이 들어갈 폭이 부족하면
  +만 숨기며 세로로 쌓지 않는다. 상단 삽입/키보드 대체 경로는 유지한다.
- page menu는 복제·위/아래·삭제의 구조 작업이며 block 변환을 제공하지 않는다.
  page 생성은 body toolbar/slash에서 섞지 않는다. 표지도 같은 명칭 정본으로 표시한다.
- `n쪽 뒤에`는 선택한 물리 page/cover node 바로 뒤다. 새 group-aware policy나 자동
  이어지는 쪽 전체를 합쳐 이동하는 동작은 추가하지 않는다. 기존 IDs/content/typed
  root marker/extensions를 보존하고 한 Undo/Redo로 복원한다.

model b94e60f4/947a188a는 page/cover NodeSelection과 명시 targetId 뒤 삽입을 고쳤다.
이전에는 ancestry가 없어 문서 끝에 넣던2개 red를 재현했다. 신규4+기존 page 생성/삭제·
crosspage move2 관련6green은 순서/새 제목 caret/원내용·marks·IDs·metadata/한 UndoRedo/
dry-run/IME 거절을 확인했다. 자동 root+auto2+다음 explicit 합성에서 첫 auto 뒤 삽입도
기존자료 불변과 UndoRedo로 확인했다. 이것을 새 logical group 정책으로 확대하지 않는다.

root link helper도 page/cover whole NodeSelection을 글자 링크 target으로 보던 신규1red를
고정하고 구조 선택만 제외했다. 기존5+새page/cover1 관련6green, kernel 기능/API 변경0이다.
helper SHA는 `4a1d76e94493bd0dff527778b240c6565c9d8f209e8dbf1db5edea3c701cdd9e`,
검사 SHA는 `e0c03b9ec7912ed4bab0c2c5eef7430c7b9c07b917b9b477b90949b3cb71d903`다.
새 UI의 구조 선택/실제 글자 선택을 native로 확인하고 Cu3의 기존f2a와 분리한다.

controller life-only646e50c4/7e935040에서는 active down 무시/foreign cancel·lost 무시,
unmount dispose의 cleanup-only(noIdle/noRefresh)를 적용했다. 신규3red→started Escape/
capture-loss 재진입과 기존class/menu/legacy 포함8green이다. 종료UI onIdle의 null 접근으로
listener/layer 제거가 중단되던 경계와 다른pointer가 active capture/source class를 남기는
경계를 실제 EventTarget에서 고정했다. PM 선택/OS touch/native unmount 수락을 대신하지 않는다.

별도 page geometry는 life-only source의 신규4red→4green, 최종controller의 기존관련8도
합쳐12green이다. v2만 data-move-kind를 사용하고 manualNode 없는 legacy는 이전24px/
edge clamp·stack 배치를 보존한다. page/cover clip·paper 위 whitespace·좁은64px 이하/
page→본문 종류 복귀·body y/gap·+만 숨김을 확인했다. 공개 predicate/API·PM/selection/
history/pagination timing은 바꾸지 않았다. 최종 SHA는 controller
`afe5c810b610b62f2d4d0a584515674f20c34b30152645c953b65011945f4f70`, 검사
`d11244bf6f5356029ca162806cf4626c8385e091a4ec75456696be8bf9c7d6f8`다.
UI의 menu/sidebar/cover명칭과 model b94/helper4a1을 같은 고정 후보로 실제 수락·빌드한다.

cover 포함 새 `manual-page-controls.manual.json`은4paper(cover1+explicit3)/4324B/assets0다.
공개 theme brand alias와metadata/본문/todo/callout·innerp/heading/code/opaquePageMeta를
포함하며 생성기의 encode/decode equality를 확인했다. 기존 layout fixture에 cover가
없어 실제 cover controls 수락을 대신할 수 없다는 이유로 만들었다. canonical 생성과
실제 표지 badge/메뉴/선택/뒤삽입·390/sidepanel/cancel 수락은 구분한다. 현재 이 새 후보는
native 진행 중이며 운영Cu3에 이미 적용된 것으로 표시하지 않는다.

후속 실제390px iframe에서 속성 패널과 표지 이름표가15.125px 겹쳤다. cover paper는
left12/top157, main은0..390, inspector는110..390, badge는61.125..125.125/y169..193였다.
main∩viewport clip만으로 overlay를 알 수 없으므로 넓은 화면의 geometry 통과를 좁은
패널 통과로 승계하지 않는다. UI는760px 이하에서 목록/속성 overlay가 열린 동안
떠 있는 page/cover/body 손잡이·+를 숨기고 닫으면 복귀하도록 UI CSS만 수정한다.
controller API·64px 페이지 이름표·본문 가로 배치·A4·상단 키보드 경로는 유지한다.
새 고정 후보로 같은 표지 fixture의390px 속성/목록/닫기 복귀를 재검증한 뒤 빌드한다.

앞선 iframe 페이지 목록 click의 NoNode 도구 실패는 곧바로 제품 동작 실패로 확정하지
않았다. 담당이 fresh AX에서 목록이 이미 닫혔음을 확인하고 같은 toggle을 반복하지
않은 채 실제 속성 버튼으로 후속 검사했다. 이 준비 오류와 위15.125px 실제 겹침을
구분한다. 조정 담당은 앞서 반환된 page/body/cover 캡처3개를 직접 열어 넓은 화면의
이름표 위치, 본문 +/손잡이 같은 줄, 현재 쪽 뒤 추가 표기를 확인했다. 최종 source/
빌드와 좁은 화면 수정 수락은 계속 별도로 기록한다.

#### A4 흐름과 다중 블록 이동의 연결

UI의 range 이동은 즉시 ManualBlockSelection을 만들고 pointerup 뒤2RAF에 같은 doc일
때만 범위를 다시 선택한다. onIdle은 pagination을 먼저 예약하므로 flow가 doc을 바꾸면
이2RAF 복원이 생략된다. 기존 모델 split/backfill green만으로 이 연결의 native 선택
유지를 단정하지 않고 모델 담당에게 별도 read-only 반례를 요청했다.

모델의 stdin 합성6종은 교차3쪽 mixed callout/paragraph 범위의 forward/reverse와
whole suffix/text split/nested-text split을 조합했다. 이동 transaction을 historyTransaction으로
이어 흐르게 한 뒤 원래 구조ID 모두 보존·유일 ID·선택한 원래 블록과 새 tail 전체 선택·
move+flow 한 Undo의 원문/원선택 exact·Redo의 흐름 후 문서/전체 선택 exact를 확인했다.
backfill은 한 pass에 한 블록을 당겨2pass 뒤 이동 직후 문서/content/meta와3블록 선택이
복원됐다. 파일 변경0, 기존 suite 반복0이다. 첫 import cwd 오류와 다음1pass만으로 모든
backfill 완료를 가정한 assertion 오류는 준비/검사 가정의 오류이며 소스 결함이 아니었다.

원ID로 map하는 whole 이동과 split/merge endpoint 보존의 모델 결함은 재현되지 않았다.
move command는 역방향 입력도 forward 범위로 만든다. flow가2RAF보다 먼저 끝난 때
원래 역방향까지 복구한다는 native 주장은 하지 않는다. 새 lock/timing 수정은 추가하지
않고, UI 담당에게 실제 A4 넘침을 일으키는 mixed range 이동의 전체 선택·IDs·UndoRedo
연결을 요청했다. 해당 실기 수락은 이 모델6종과 별도로 기록한다.

루트가 만든 `manual-range-flow.manual.json`은3명시쪽/10767B/assets0이다. 첫 쪽의
안내·2줄 본문·checked todo3블록에 marks/link/opaque extensions를 두고, 받는 둘째
쪽에는 한 줄 본문24개, 뒤에는 독립 sentinel쪽을 둔다. 다른 쪽으로 mixed range를
옮겨 실제 A4 넘침을 일으키는 연결 QA용이며 넘침 자체는 아직 native로 확인하지 않았다.
generator의 encode/decode equality와 원래 fixture topology만 수락한다. 생성기 SHA는
`6bcb74c4cda3ed44b6ef8ab472d03fd0c7cb7c7bb2da55e922d27e370a567d4d`, fixture SHA는
`494dd4684a8bfbeda6c078d2b12c80690520e98dc337283927e5c450f10b4411`다.

#### 검색창의 강한 파란 테두리 지적

담당(4) 채팅의 사용자가 메뉴 검색 input의 파란 사각 테두리를 새로 지적했다. 현재
Menu CSS는 button/input의 focus-visible에2px primary outline을 함께 적용한다.
이것은 블록 전체 NodeSelection 강조와 다른 표시다. 검색 autofocus와 키보드 handler는
유지하며 search input의 강한 파란 테두리만 얇은 중립 표시로 바꾸는 좁은 후보를
담당(4)가 준비하고 UI의 동일 frozen 후보/native/build에 통합한다. root도 selector를
읽어 확인했으며 실제 변경·화면 수락 전에는 수정 완료로 표시하지 않는다.

담당(4)의 Menu CSS 후보는 input:focus-visible만1px solid
`--color-semantic-line-solid-normal`/offset-1px로 바꾸고 button의2px primary 표시는
유지한다. JSX autofocus·검색·키보드·아이콘·controller/model 변경0, SHA는
`7b8c8be1107fd1e5770f1a5a5e23589506e3c0e2928c69a0e0d9bd76a03e6acd`다.
이 낮은 영향의 시각 수정 때문에 controller/model green을 반복하지 않는다. 실제
작업/유형 검색의 input focus·입력·Escape 원문/선택 보존과 새 outline은 UI가 같은
최종 후보로 확인한다.

390px overlay 수정의 고정 BlRSykyV/BBe QA는 actual frame/doc width390에서 inspector
open의 handle/insert display:none·0×0, close의 cover badge61.125/y169/64×24 복귀를
확인했다. sidebar open에서도 controls가 숨겨지고 현재 쪽 뒤 추가 위치 표기는 유지됐다.
초기1280px 준비 상태는390 수락에서 제외했다. 같은 CSS의 넓은 page/body/cover
캡처3개는 최종 후보로 다시 저장·검토했으며 위 기존 캡처 경로를 교체했다. 이 후보도
메뉴 focus 수정 후 최종 생산 빌드/제공 asset과는 분리한다.

검색 focus의7b8c8be1 선언만으로는 실제 화면이 바뀌지 않았다. UI의 고정
controls-D5V71M77/UoS_c8c9 QA의 당시 검색 캡처를 root가 직접 열어 여전히 파란 사각
테두리를 확인했다. 해당 파일은 이후 e62 수락 캡처로 교체됐으므로 현재 경로의 그림을
7b 실패 그림으로 해석하지 않는다. 당시 native2px/+2px와 compiled CSS 충돌 기록은
실패 근거로 유지한다. 같은 compiled CSS에는 Core의
공통 focus-visible이 `outline:2px solid var(--color-semantic-focus-indicator)!important`와
`outline-offset:2px!important`를 적용하고 있어 메뉴의 non-important1px/-1px 선언을
덮는다. root는 source declaration과 실제 paint가 다르다는 반례를 담당(4)/UI에 전달했다.
Core 원본이나 다른 버튼 focus를 수정하지 않고 메뉴 search input에만 scoped override를
적용한 뒤 실제 computed1px/중립/-1px와 새 캡처로 재수락한다. 앞7b 후보를 실제 회색
테두리 통과로 기록하지 않는다. 새 최종 source·native·제품 제공은 후속 보고를 따른다.

### 페이지·본문·검색 포커스의 제품 반영 수락 — 2026-10-07

최종 제공은 `manual-CiREa-jR.js`349736B / `manual-ILW1W5bw.css`27815B다.
UI build261ms green이며 root도 manual.html과 참조 JS/CSS10개 모두 HTTP200을 확인했다.
Core의 공통 focus 자체는 이 단계에서 수정하지 않았고, 메뉴 scoped override e62와
현재 Manual UI만 포함한다. 관련 controller12/model6/link helper6 green은 앞서 동일
동결 source의 근거를 재사용하고 전체 suite를 반복하지 않았다.

| 변경 source | 최종 SHA256 |
|---|---|
| ManualEditor | `08aaac612b360573e80c2bafc9833ef45a34271953d5c501ba6c372d68c7b987` |
| Manual CSS | `bcd8f5b2ebeeb38cb6d0340a4df39382dd813545364a111a2b7185ec6e828ced` |
| kernel | `b94e60f4f99e76ef19a188a98c694ffe3c00c2b87f2ed1c28eb9a486f3512104` |
| controller | `afe5c810b610b62f2d4d0a584515674f20c34b30152645c953b65011945f4f70` |
| link context | `4a1d76e94493bd0dff527778b240c6565c9d8f209e8dbf1db5edea3c701cdd9e` |
| Menu CSS | `e62d89a3d5c39e454afdc059c1e642cc44cde6ccb37b24b17d46d64114ca771e` |

Print071d89d6/layoutedd254da/runtime329a2201/plannerdf36834b는 앞 A4·링크 수락과 동일하다.
root가 현재 source 해시를 모두 직접 대조했다. native는 page/cover64×24 이름표와
gutter+0, 올바른 메뉴 명칭·변환0을 확인했다. 선택2쪽 뒤 삽입의 새3쪽/앞뒤ID 보존과
표지 뒤 새2쪽은 각각 UndoRedo exact였다. 페이지 아래 이동/삭제의 한 Undo 원문 복원,
본문 +/손잡이 sameY·4px gap·24px boxes와 같은 쪽 새 본문1개/한 Undo도 수락했다.
페이지/표지 전체 선택은 링크 disabled/CtrlK modal0/rich doc 불변, 실제 글자 range는
URL 추가·링크 안 caret 편집 enabled와 기존 URL prefill을 확인했다.

실제390px frame/doc width에서 inspector/sidebar open의 손잡이 숨김과 close의64px
표지 이름표 복귀, 추가 위치 표기·fixed paper793.6875×1122.515625px을 수락했다.
초기1280px 준비 상태를390 green에 포함하지 않았다. 앞15.125px overlay 침범은 수정됐다.
E62/BXAME-7b 고정 QA의 작업·유형 search는 autoFocus/입력/filter/Escape/rich doc 불변,
computed outline1px/rgb(225,226,228)/offset-1px였다. root와 담당(4)도 교체된
[검색 캡처](assets/manual-editor-ui-audit/manual-command-search-neutral-focus-qa.png)를
직접 열어 실제 중립색 표시를 확인했다.7b의 CSS 선언만 바뀌고 blue가 남던 실패와
e62의 실제 표시 수락을 구분한다.

UI와 root의 오른쪽 새 URL 열기는 모두 queued였다. visible 완료나 사용자 원탭 reload/
IDB 변경을 주장하지 않는다. 사용자에게 제공하는 진입 주소는 `/manual.html`이며 `/`의
기존 v1과 구분한다. 임시 QA 정리와 A4×mixed range native, OS IME/터치/200%/독립 PDF
등 전체 목표의 남은 조건은 이어 검증하고 별도 수락한다.

### 공통 focus 계약 감사와 추가 개선 지시 — 2026-10-07

모델 담당(2) 채팅에서 사용자가 공통 focus의 문제를 지적했고, 이어 ‘다른 사례들
찾아보고 개선해줘’라고 실행을 지시했다. 이 새 범위의 Core canonical source/field
focus ownership/관련 회귀는 담당(2)가 유일한 writer다. root와 담당(4)는 Core에 쓰지
않으며 UI는 현재 Manual 후보를 동결하고 새 공통 후보의 source/generated/runtime가
정리된 뒤 별도 native/build로 연결한다. 기존 Manual 모델 b94와 컨트롤러 afe5·메뉴 e62
수락을 공통 focus 자체의 개선 완료로 확대하지 않는다.

공통 canonical은 `shared/lk-design-system/tokens/focus.css`다.
`packages/core/tokens/focus.css`는 `scripts/project-workspace-styles-and-assets.mjs`의
generated projection이며 직접 편집의 정본으로 삼지 않는다. root도 canonical selector와
projection script의 read/write 경로를 확인했다. 전역2px/+2px important가 실제 메뉴
표시를 덮은 반례 외에, 담당(2)의 Input/InputGroup/SearchField/PasswordInput source
감사에서는 외곽 border+halo를 소유하는 필드에 내부 input 사각 outline이 중복되는
계약 충돌을 확인했다. 이 후자는 아직 별도 live field 화면의 수락이 아니다.

`:focus-visible`이 모든 마우스 입력을 제외한다는 현행 주석은 text input에 맞지 않는다.
키보드 입력을 받는 input은 pointer로 들어가도 해당 표시가 적용될 수 있다.
[W3C C45](https://www.w3.org/WAI/WCAG22/Techniques/css/C45)를 root도 직접 확인했다.
키보드 focus를 알 수 있는 표시를 유지해야 하지만 그 모양을 모든 컨트롤의 동일한
사각형으로 강제할 필요는 없다는 판단은
[W3C Focus Visible 해설](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)에
근거한 LDS 설계 판단이다. 전역 important만 일괄 삭제하면 현재 outline:none인 단순
버튼·invalid field의 표시가 사라질 수 있어, 그 한 줄 변경만으로 완료하지 않는다.

공통 fallback과 사용자가 보는 경계의 component focus owner를 구분하고, native 기본/
버튼·링크/field invalid·readOnly/forced-colors를 관련 범위로 검증한다. 외부 사례와 실제
Core 지침·빠른 검증 경로를 확인해 변경하며, 새 dependency·semantic 색값·불필요한
공개 API 확장은 하지 않는다. 현재 추가 개선은 진행 중이고 원격 push/배포나 전체
에디터 goal 완료로 해석하지 않는다.

### 공통 focus 최종 후보와 독립 시각 검토 — 2026-10-07

담당(2)는 공통 fallback을 유지하면서 `--lds-focus-outline`과 offset을 통해 component가
표시의 경계를 소유하도록 수정했다. 복합 필드8종은 내부 input의 사각 outline을 제거하고
실제로 보이는 frame에 표시한다. 내부 clear/reveal 등의 action button은 독립 키보드
표시를 유지한다. semantic 색값·공개 JS props·상태 handler·dependency는 바꾸지 않았다.

첫 후보의 정상 필드2px/+2px는 기존 border와 흰 간격을 사이에 둔 두 경계로 보였다.
root가 실제 PNG를 열어 이 후보를 최종 수락하지 않았고, 정상2px/offset-2와 invalid1px/
offset0으로 보완한 [정상 필드](../../../lk-design-system/visual-artifacts/focus-contract/focus-field-inset-after.png)와
[invalid 필드](../../../lk-design-system/visual-artifacts/focus-contract/focus-invalid-border-after.png)를
직접 열어 수락했다. 정상 필드의 흰 간격·내부 사각형이 제거됐고 invalid의 빨간 경계·
아이콘·문구가 유지됐다. 이 시각 수락을 전체 OS 접근성 인증으로 확대하지 않는다.

최종 canonical `tokens/focus.css` SHA256은
`2748388d0b7228d7812defe20fef71d40c92e55e23de7263aa44e5725073d527`,
generated `packages/core/tokens/focus.css`는
`b2bf30fa0560b3ff51139539b463f8fcc6beac8ae21c5a7272b682b1dfc1744f`다.
[동결 manifest](../../../lk-design-system/visual-artifacts/focus-contract/runtime-freeze.json)에
소스18개와 runtime1252개, runtime tree SHA256
`347b4820789095c23fe821de946e06d271d1c1a747fe12482e8cd2ba029230fd`를 보관했다.
root가 manifest의18개 source SHA를 독립 대조했고 불일치0이었다.

담당 보고의 빠른 경로는 표준 build·토큰·package surface/contracts/publish·tsc·layers·
color layer·docs/prompt·product coverage green, SSR12/12다. native는 필드8종+invalid/
readonly10개를 wide/390px에서 확인했다. 내부 버튼 Tab은 frame none/button2px/+2px,
독립 fallback8종도 유지됐고 실측 contrast는 light5.22/dark7.44였다. CLI contrast의
Chromium binary 부재는 설치로 우회하지 않았으며 scoped native 측정으로 분리했다.
제품3종의 source pin/blob 검토는 소비 제품의 runtime upgrade 수락을 대신하지 않는다.
실제 OS forced-colors와 CLI consumer 전수는 미검증이다. Manual의 e62 검색 표시까지
같은 후보로 연결한 native와 production build/HTTP는 UI 담당이 이어 확인한다.

### 작성 도구 정리와 빈 콜아웃 Backspace — 2026-10-07

UI 담당 채팅에서 사용자는 URL 작성 기능의 필요성에 동의하지 않았고, backtick·인용·
Notion 입력 흐름을 기준으로 ‘정리 제대로 해줘’라고 지시했다. 다음 UI는 상시 링크/
inline-code 버튼과 선택 bubble의 링크 버튼, CtrlK 가로채기와 URL modal을 제거한다.
기존 링크 mark·rendering·codec·kernel은 보존한다. inline code는 선택 글자 서식 bubble에
‘인라인 코드’와 Ctrl/⌘E 안내로 남긴다. 이전 링크 작성 native는 당시 CiRE 기능의 근거이며
이 새 방향의 필수 기능으로 승계하지 않는다.

실제 kernel 입력 규칙은 한 쌍의 backtick→inline code, 줄 시작 backtick3개+공백→codeBlock,
`"`+공백→quote, `>`+공백→toggle이다. 기존 동결 b94에서4종 변환과 즉시 Backspace4종
원문 복원 native가 수락됐고 관련12/12가92ms에 green이었다. 새 후보의 catalog 설명도
이 구문을 따른다. 상단 코드 아이콘 추가를 같은 기능의 발견 경로로 중복 사용하지 않는다.
파일 피드백은 다운로드 완료를 단정하지 않고 ‘문서 파일 다운로드를 요청했습니다.’로
바꾼다. 앞선 bounded download event timeout만으로 앱 파일 실패를 판정하지 않는다.

담당(4) 채팅의 새 사용자 지적은 빈 콜아웃 제목 시작에서 Backspace해 상자를 없애는
동작이다. b94 재현은 handled=false/docChanged=false로 상자가 남았다. placeholder는
CSS 표시이고 실제 제목은 빈 배열/본문은 빈 paragraph1개였다. root와 모델 담당이
소유를 명시적으로 조정해 **이 한 경계의 Manual kernel과 새 focused test만 담당(4)의
임시 단독 writer**로 맡겼다. 담당(2)는 Core를 맡고 이 Manual 파일에는 추가 쓰기0이다.

수정은 기존 `deleteManualObject`/`insertParagraphAtGap`을 재사용한다. 빈 TextSelection,
calloutTitle offset0, 빈 제목과 빈 paragraph만 있는 본문일 때 wrapper를 제거한다.
이전 본문이 있으면 그 편집 가능한 끝으로 복귀하고 없으면 같은 parent의 외부 paragraph를
재사용/생성한다. 유일한 블록을 없앤 뒤에도 본문 입력이 가능하다. 제목·본문의 글자/
공백·자산·중첩 구조·다른 field/offset/range·IME에는 새 wrapper 삭제를 적용하지 않는다.
한 closeHistory transaction으로 직전 입력과 구분해 UndoRedo 문서/선택을 복원한다.

관련 focused test는 신규2건 red/기존 보호8건 green에서 최종10/10 green73ms였고,
기존 Backspace/inputRule/inline shortcut/page ID 보호 관련14건 green90ms를 재사용한다.
원ID·metadata·이전 marks와 한 UndoRedo 문서/선택 일치, 실제 state insertText까지
확인했다. 전체 suite/build/native는 담당(4)가 실행하지 않았으며 새 UI native는 대기다.

| 다음 후보 파일 | 동결 SHA256 |
|---|---|
| ManualEditor.jsx | `fb0a9a13cb805fcb0febd3a3db7503dc8901a996b2de56acc4b3f883d7ee13b7` |
| manual-kernel.mjs | `efefe5c32c59e604fae1ed5af9e904635c95a577614e9d57115bbba5f830a997` |
| redesign-callout-boundary.test.mjs | `b9f5d7b7db6f10c1b9cac816801ad2c52fda58c4060ca342fae4a61fb6d1c56c` |
| block-command-catalog.mjs | `61a288a4e0eb2f49f3b02f7a1589006ca2d69f31e996e4d130697af0cbf6b554` |
| block-command-menu.css | `e62d89a3d5c39e454afdc059c1e642cc44cde6ccb37b24b17d46d64114ca771e` |

root가 위5개 source SHA를 대조했다. Core 동결과 이 후보를 한 QA build에 연결하도록
UI 담당에게 전달했다. 제품44589의 현재 CiRE/ILW와 이 소스 후보를 혼동하지 않는다.
sole empty callout/이전 rich 본문에서 실제 Backspace→본문 caret·입력→UndoRedo,
내용·다른 field 보호, 선택 코드 서식·입력 규칙과 메뉴 검색을 수락한 뒤 제품 반영한다.

사용자의 ‘병렬 세션을 더 두는건 어떠냐’에는 독립 UI·동작 검증1개 추가를 제안했다.
이 질문 당시에는 채팅을 생성하지 않았다. 이어 사용자가 ‘검증 세션 만든다며’라고
실행을 요청해 **LDS Manual 독립 검증**
(`01a1156f-d320-7af3-b1eb-24392cfcd0ff`)을 같은 local project에서 생성했다.
즉시 snapshot에서 active/inProgress와 지침·감사 확인을 시작했다는 commentary를 확인했다.
새 역할은 재현·Notion 비교·증거 보고·수정 후 재검증이고 구현/build/server/repo 문서와
사용자 데이터 수정은 맡기지 않는다. 증거는 별도 `/tmp`에 보관하고 root가 정식 감사에
반영한다. 기존 writer의 소유는 유지한다.

UI 담당의 통합 QA 후보 `BLTYx5A_`/`lsGzkotn`에서는 초기 locator `press('Enter')`로
`/안내` 또는 ASCII `/callout` 뒤 literal trigger 보존+줄바꿈이 관찰됐다. 이후 같은 frozen
source에서 native `tab.pressKey(null,'Return')`로 callout1 생성/이전 strong 본문 보존/
빈 제목 caret를 확인해 **제품 키보드 회귀라는 초기 판정을 철회했다**. source 수정0이며
두 도구 입력 경로 차이의 세부 원인은 미확정이다. 정상 wrapper의 Return/navigation/
Escape 결과를 native 근거로 기록하며 locator 반례를 앱 결함이나 새 fix로 기록하지 않는다.
root도 초기 사용자 commentary의 Enter 결함 판정을 정정했다. production rebuild0이다.
이 후보의 sole empty callout
Backspace→상자0/본문1/caret0→UndoRedo rich ID 일치→계속 입력, 상시 링크/코드 제거와
bubble 코드 적용/UndoRedo, public dist Input normal2/-2·invalid1/0은 담당 native green이다.
이 부분 성공을 아직 남은 연결·환경 검사와 다음 UI 변경의 전체 수락으로 바꾸지 않는다.

### 상단 선택 요소 작업의 중복 제거 — 2026-10-07

사용자가 상단 오른쪽 ‘선택 요소 작업’의 `···` 버튼을 지목하며 이 위치의 목적을
의문시했다. root source 감사에서 이것은 `mode:'block'`과 현재 selectedId로 동일
블록 작업 메뉴를 연다. 블록 손잡이의 메뉴와 복제/이동/삭제/유형 변경 기능이 겹치며
상단에 열리므로 대상과 메뉴가 떨어져 있다. 본문 cursor가 pageTitle일 때는 페이지
작업도 같은 모호한 이름으로 열리는 구조다.

[Notion 작성 안내](https://www.notion.com/help/writing-and-editing-basics)는 블록 옆
손잡이를 이동/작업 메뉴의 진입점으로 안내하고,
[Notion 키보드 안내](https://www.notion.com/help/keyboard-shortcuts)는 Ctrl/⌘+/를
선택한 하나 이상의 블록 작업으로 안내한다. 2026-10-07 공식 자료를 다시 확인했다.
이 자료와 현재 중복 source에 따른 Manual 설계 결정은 상단 `···`/N개 블록 작업
버튼을 제거하고 블록/페이지 손잡이 메뉴를 유지하는 것이다. 이번 지적은 속성 버튼
제거 결정으로 확대하지 않는다.

상단의 중복 버튼에 기대던 키보드 접근은 본문 Ctrl/⌘+/ 및 ContextMenu/Shift+F10으로
기존 단일 블록/다중 범위의 메뉴에 연결한다. 메뉴는 대상 근처에 열고 내용·기존
선택 범위를 바꾸지 않는다. handle의 Shift+F10은 공용 controller에 이미 있으며
root/(4)는 controller를 추가 수정하지 않는다. UI owner가 guard와 기존 메뉴 동작을
재사용해 single/multi/page, 키보드/Escape/Undo와390px clip을 native로 수락한다.
이는 다음 변경 요청이며 아직 상단 버튼 제거·키보드 native·제품 제공을 수락하지 않았다.

### 독립 A4 다중 이동·저장·실제 파일 검증 — 2026-10-07

새 **LDS Manual 독립 검증** 채팅은 현재 제품 CiRE/ILW와 memory QA의
`controls-BLTYx5A_.js`/`controls-lsGzkotn.css`를 따로 보관했다. QA의 source는
ManualEditor fb0a, kernel efef, catalog61a/menu e62 및 Core 동결 manifest다.
[증거 manifest](assets/manual-editor-ui-audit/independent-range-flow-evidence.json)에
전체 source SHA와 실제 후보 JS639739B/CSS34938B의 해시를 기록했다.

`manual-range-flow.manual.json`을 복사본으로 가져와 안내+본문+todo3개를 다른 쪽으로
실제 드래그했다. 받는 쪽의 기존24본문과 연결되어3→4쪽으로 자동 분할됐고, 종이는
793.69×1122.52px 고정이었다. 원3개 선택을 유지하고 한 Undo로3쪽의 원 DOM,
Redo로 같은4쪽 DOM을 복원했다는 native 보고를 확인했다. root는 반환 PNG를 열어
4쪽 목차·반복 제목·선택된 안내/본문/todo를 확인했다. 이 PNG의 상단 ‘3개 블록’은
fb0a의 이전 작업 버튼이며 제거 중인 새7b UI의 화면으로 사용하지 않는다.

root가 보관한 [이동 전 DOM](assets/manual-editor-ui-audit/independent-range-flow-before.json)과
[이동 후 DOM](assets/manual-editor-ui-audit/independent-range-flow-after.json)의 실제 bytes를
독립 대조했다. 복사본 import 이후 baseline34 DOM ID가 이동 후/다운로드 파일에서 모두
보존됐고 신규 DOM ID1개는 자동 page였다. 원31개 leaf의 innerHTML은 모두 같았다.
fixture를 복사본으로 가져올 때 ID를 재발급하므로 원fixture의 deterministic ID와 직접
대조해 ‘ID 손실’로 판단하지 않는다. 이 결과는 역방향 range와 새로운 split tail 전체
선택의 모든 경우를 새로 수락한 증거로 확대하지 않는다.

독립 담당은 자동 저장→재열기에서4쪽/ID/링크/강조/metadata 보존을 보고했다. bounded
download event API10초 timeout 이후 실제 Downloads 파일을 찾아 bytes를 확인하고
그 파일을 복사본으로 다시 열어4쪽/링크/강조/줄바꿈/metadata를 복원했다.
root도 [실제 내려받은 합성 파일](assets/manual-editor-ui-audit/independent-range-flow-downloaded.manual.json)의
11708B와 SHA256 `b0bd0539903bc144556d0c3d586a51b152dab6d61622fbe6eafe9b8b33a139c4`,
4쪽 및 baseline34 ID/원본문 emphasis·hardBreak·extensions를 확인했다. 요청 알림이나
도구 timeout만을 파일 생성 성공/실패로 판정하던 미확인을 이 실제 파일 증거로 보완한다.

UI 담당은 별도로 sole empty callout와 이전 rich 본문에서 native Backspace/한 UndoRedo/
계속 입력, 비어 있지 않은 제목 또는 본문 보호를 수락했다. ‘Keep’ 문자 위치를 지정한
helper가 이전 본문 끝에 커서를 놓아 문자를 지운 준비 실패는 실제 calloutTitle0 클릭/
Home 재검증과 구분했다. 다른 field의 빈 paragraph는 기존 chain에서 내부 빈 자식이
삭제될 수 있으므로 wrapper·내용 보존만 확인하며 문서 전체 불변이라고 확대하지 않는다.

상단 중복 버튼 제거/본문 키보드 메뉴의 새 UI source는
`7b4651aac6cf134370d53bf6b6c1e25fda8f467fc3dc197bca93648be9936330`로 동결됐고
root도 실제 SHA를 대조했다. UI는 현재 native/build를, 담당(4)는 그 source의 live target/
기존 범위 보존/guard/anchor를 read-only로 검토한다. 위 독립 native와 파일 수락은
fb0a/efef의 근거이며 새7b 및 제품44589 반영을 미리 수락하지 않는다.

### 7b 후속 감사: 표 셀 target과 최종 메뉴 box — 2026-10-07

담당(4)의 read-only source 감사는 UI7b/kernel efef의 SHA가 전후 같은 상태에서
memory command·geometry만 검사했다. 전체 suite/build/server/native를 반복하지 않았다.
문서·PM 선택 dispatch 없이 live editor.state/domain index/custom range headId를
사용하는 구조와 busy/print/replacement/modal/IME guard, 기존 handle ShiftF10은
소스에서 유지됐다. 이후 아래2건을 확인해7b 최종 수락을 보류했다.

1. **표 셀의 구조 작업**: `names.cell`이 target으로 허용돼 cell caret의 키보드 메뉴가
   부모 table 대신 cell을 대상으로 한다.2열 header/2열 row에서 cell duplicate의 dryrun/
   dispatch는 true였으나 header3/body2가 되어 `documentFromState`가 rows의 미지원
   문서 구조 오류를 던졌다. 이는 메모리 명령의 실제 실패이며 사용자 문서 손실 발생을
   주장하지 않는다. UI는 cell을 건너뛰고 부모 table을 작업 대상으로 삼고 Inspector의
   cell 복제/이동/삭제·관련 안내도 제외한다. 셀 글자·서식·부모 표 행/열 기능은 유지한다.
   실제 cell Ctrl/→table 복제/serialization/UndoRedo로 교정판을 수락한다.
2. **메뉴 본체의 경계**: anchor만 main∩viewport로 제한하고 본체320px는 window로
   배치했다.1280/outline196/inspector252의 main x196..1028에서 caret x1010을 주면
   helper의 menu x952..1272로 inspector에244px가 겹친다. 이는 source geometry
   재현이며 actual desktop panel 실패로 확대하지 않는다. 좁은 overlay도 main rect에
   가림 영역을 반영하지 않는다. 최종 box의 너비·좌우·상하를 writing bounds에 제한하고
   작은/no-area 및 resize/scroll/reflow 경계를 검사한다.

파일 소유를 다시 명시했다. UI owner는 ManualEditor의 cell target/Inspector guard와
좁은 outline·inspector overlay 닫기 및 live bounds callback 연결만 맡는다.
담당(4)는 `BlockCommandMenu.jsx`/position helper/최소 관련 test의 단독 writer로
`getPlacementBounds` seam을 추가하며 메뉴 handlers/input/e62 표시를 유지한다.
getter는 현재 main DOMRect 또는 null을 반환하고 생략 시 기존 window를 사용한다.
제공된 null/교집합 없음/header가 못 들어가는 영역은 fallback 없이 숨기고 닫는다.
임시 `getPlacementViewport` 명칭 제안은 폐기했고 root도 실제 UI 연결을 대조했다.
Menu 구현의 동결과 양쪽 최종 이름 일치는 이어 확인한다.
서로의 파일·Core/kernel/controller에 추가 쓰기0이다. 두 source를 동결한 뒤 실제
표 cell·양패널 desktop·390px 메뉴와 선택/Undo/serializer를 증분 검증하고 제품 반영한다.

독립 QA의 [첫 완료 보고](assets/manual-editor-ui-audit/independent-qa-report-20261007.txt)는
BLTY/7b에 한정된다. 기본 입력·콜아웃·범위 이동·파일과
후속 CHPo/7b의 cover/page/키보드 메뉴를 구분했고 agent 생성4탭 종료/viewport reset/
제품·QA 서버 조작0/원탭·IDB 변경0을 확인했다. 해당 native 범위에서 ‘확정 기능 결함
미발견’은 위 새로운 table/desktop geometry 감사의 통과를 뜻하지 않는다.
CHPo 새 합성 iframe 초기의 `MutationObserver.observe` TypeError1개는 화면 동작이
정상이었고 source/stack이 없어 제품/도구/QA wrapper의 귀속 미확정 조사로 남긴다.
actual user 기능 결함으로 단정하거나 추측 patch를 하지 않는다.

이후 독립 QA 채팅의 사용자도 ‘+ 페이지 추가’ 크기·배치를 지적하고 ‘이번에는 시각적으로
QA 전체적으로 한번씩 해봐라’라고 실행을 지시했다. 버튼의 굵은 label과 작은 삽입 위치
설명을 한 줄에 섞는 계층을 검토하고, 전체 간격/정렬/강조/메뉴를1280·760·390에서
별도 확인 중이다. 기능 native를 전체 visual 수락으로 바꾸지 않으며 결과를 이어 반영한다.

### 작성 도구·메뉴·시각 QA의 제품 수락 — 2026-10-07

[최종 증거](assets/manual-editor-ui-audit/final-writing-cleanup-evidence.json)는 UI
`13025358`, CSS `93ffeb6e`, Menu `cdd5c06f`, catalog `9d9a413d`, scroll helper
`0cc24e2c`, kernel `efefe5c3`의 전체 SHA와 실제 캡처/metrics/HTTP 결과를 보관한다.
UI owner가 한 번 canonical build230ms를 실행했고 `manual-DwdcZC6x.js`352975B/
`manual-CQhRuthu.css`28899B를 기존44589 서버에 반영했다. root의 HTML+참조10 assets
HTTP200/byte/SHA 대조가 전부 일치했다. 공유 Core CSS의 SHA도 수락된 공통 focus
QA와 같다. source와 native만으로 제품 반영을 주장하지 않고 이 실제 asset을 기준으로 한다.

상단 `···`/N개 블록 작업 버튼 제거, single/page/multi 본문 Ctrl/⌘+/·ContextMenu·
ShiftF10의 대상 근처 메뉴와 기존 범위 보존을 native 수락했다.2블록 삭제 뒤 한 Undo가
내용과 범위를 함께 복원했다. cell target은 부모 table로 올려2열 표 복제/저장·
serializer/UndoRedo를 수락했고 Inspector의 cell 구조 작업은 제외했다.

Menu의 `getPlacementBounds`는 최종 본체를 main∩visualViewport 안에 배치한다.
생략하면 기존 window 기준이고, 제공된 null/무교집합/작은 영역은 숨김·닫힘으로 처리한다.
wide inspector 우측과390px에서 실제 메뉴가 writing area와 겹치지 않았다.
새 placement focused7/7 및 이전 position/keyboard8/8을 범위에 맞게 재사용했다.

첫 시각 후보 e752/Menu9cb는 빠른 wheel 뒤 첫 방향키에서 활성 항목이 보이지 않는
V04와 wide→390px 패널 겹침 V06이 남았다. 다음 cdd5/0cc24 후보는 keyboard intent와
다음 frame의 최신 선택 항목을 노출하고, 새 pointer/wheel은 자유 스크롤로 돌린다.
nav intent observer는 키 실행이나 selection 변경을 추가하지 않는다. IME/modifier/
input Home·End/disabled 처리를 유지했다. pending·settled native에서 활성 항목은
y200..249, list y196.5..512 안에 보였고 추가 focused8/8이 통과했다. resize native는
양쪽 panel이 모두 닫혔다. 첫 실패 후보의 green을 최종 후보로 승계하지 않았다.

| 시각 항목 | 수락한 변경과 범위 |
|---|---|
| V01 페이지 추가 | 과한16px/600 label과11px hint 혼합을 정리해12px/500 label·별도 위치 설명. 이때의 페이지 추가 배치는 후속 목차 관리 후보와 구분 |
| V02 빈 제목 | navy 위 placeholder contrast1.3676을 white18.51:1로 수정. 입력/Undo/readonly·wide/390 검증 |
| V03 상단 삽입 | 상단 `+`와 rail을 같은 BlockCommandMenu/catalog/search로 통합해 잘린 첫 focus 표시를 교정. 실제 삽입/Undo 검증 |
| V04·V06 | 빠른/settled wheel의 활성 항목 노출 및 wide→390 패널 닫기. 위 증분 native 범위 |
| V05 저장 등 오류 | 실제 import/print/save 실패를13px negative alert band와 복구 동작으로 표시. 합성 quota 실패/재시도/내용 보존·console errors0 |
| D01~D03 | 삽입 catalog/glyph 일치, 제목1/2/3의22/20/16 계층을 editor/print에 공유, footer12px/mobile Save11px. body/A4를 축소하지 않음 |

독립 담당은1280/1065/760/390의 전체33캡처 감사 후 변경분23캡처·추가 range 근거를
검증했고 final pixel13건을 수락했다. root는 반환된 wide shell,390 오류 band와
pending-scroll 캡처3개를 직접 열어 확인했다. 다른 캡처는 담당 보고/metrics 근거이며
root가 전수 pixel을 직접 보았다고 기록하지 않는다. 관련 static13 seams는 native를
대체하지 않는다. [최종 QA 보고](assets/manual-editor-ui-audit/final-writing-cleanup-qa-report.txt)를
보관했다. QA가 만든 탭 종료/viewport reset/원 사용자 탭 보존, UI owner의 QA44590
종료와 제품44589 유지도 확인했다.

### 선택된 원 블록 자체의 A4 split 수락 — 2026-10-07

이전 BLTY의3→4쪽은 원3블록을 filler24 앞에 놓아 선택되지 않은 filler가 넘친 근거다.
선택된 원 블록의 자동 tail 수락으로 확대하지 않았다. 같은 최종 BEF/Da6 소스의
추가 격리 public memory QA는1280×2400에서 두 끝을 보이게 한 뒤 원 안내/본문/todo를
rail(385,256)→(550,2208), 받는 쪽24본문 **뒤**로 실제 이동했다.

안내 head는 page2에 첫 본문1개, 생성 tail은 page3에 나머지 본문2개가 놓였다.
안내 head/tail+본문+todo 총4개를 선택하고3→4쪽 A4를 유지했다. 한 Undo/Redo가 rich
DOM을 정확히 복원했고 Enter는 group 선택을 해제해 todo head caret으로 돌아갔다.
native `QA-CARET` 입력과 한 Undo도 수락했다.

root는 [증거 manifest](assets/manual-editor-ui-audit/selected-split-range-evidence.json)의
실제 DOM geometry에서4개의 선택 ID와 종이793.6875×1122.515625px를 대조했다.
[실제 파일](assets/manual-editor-ui-audit/selected-split-range-downloaded.manual.json)은
11997B/SHA256 `dcdaea2f9269c3c2ba4a7a5a970d4d60c7bb2d658a5537d89327ca66eaf3179f`이며
portable decode가 유효한4쪽/assets0을 반환했다. 원fixture35객체의 ID/내용/checked/
title/marks attrs/metadata를 root도 대조해 누락0·불일치0, 생성 ID2개를 확인했다.
PM canonical mark 순서는 같은 mark set으로 비교하고 실제 text/attrs를 보존했다.

저장된24번 JPEG 자체는1280×1364로 위쪽 페이지만 담고 있다. root는 그 pixels를
열었지만 전체4개 선택이 보이는 full viewport 이미지라고 주장하지 않는다. 선택
복원 근거는 반환 DOM/geometry와 native history/caret 보고다. 두 끝 가시 drag는
held-pointer autoscroll/Escape·역방향 split range·OS 입력기/touch/200%/PDF 증거가 아니다.

### 자동 A4 경계의 본문 유실 P1 — 실제 모델 재현, 수정 중

모델(2)의 read-only 감사는 kernel
`efefe5c32c59e604fae1ed5af9e904635c95a577614e9d57115bbba5f830a997`, planner
`df36834bd3e68f412fe56cb8239210caeaea58f46b5c5627ff77f220e0e74c0a`, runtime
`329a2201e66314c7cab6f307b7a1708d542d7d22a9f19f74662c11a625e6c94e`와 UI130/dragLayout
edd/controller afe5 등7개 source의 전후 SHA 불변 상태에서 실제 PM 명령만 검사했다.
전체 suite/native/build/사용자 자료 쓰기는0이었다.

| 단계 | 실제 내용과 명령 결과 |
|---|---|
| 준비 | strong `ABCDEFGH`와 `POST`; actual createManualState→planner→pagination transaction. capacity100/split4로 head `ABCD`, 자동 tail `EFGH`+`POST` |
| tail offset0 Backspace | handled true/dispatch1. body `ABCD\|EFGH\|POST`12자→`ABCD\|POST`8자, generated pageTitle `Task`→`TaskEFGH` |
| 실제 다음 planner | `{type:'title', pageId:auto, rootPageId:first}` 반환 |
| pagination transaction | 원 key transaction을 historyTransaction으로 연결. 제목 `TaskEFGH`→`Task`, 본문/제목 어느 쪽에도 `EFGH`4자가 남지 않음 |
| head offset4 Delete | false/dispatch0, 자동 물리 page 경계를 이어 처리하지 않음 |
| 명시 독립 page 대조 | tail 본문 Backspace가 `IndependentEFGH` 제목으로 합쳐짐. 자동 title-sync가 없어 같은4자 유실은 아님. 이전 독립 page의 `ABCD`와 합쳐지지 않음 |

준비 event 앞 closeHistory를 둔 scoped 검사에서 key+flow 한 UndoRedo의 doc/selection은
정확했다. 초기에 아주 빠른 준비 event와 섞인 history 관찰은 제외했다. **Undo 보존은
본문 유실 명령의 정상 동작을 뜻하지 않는다.** 위 유실은 actual PM+planner 재현이며
새 native OS 경로의 재현을 아직 완료한 상태가 아니다. 실제 사용자 파일은 건드리지 않았다.

이 P1을 우선 수정한다. 모델(2)는 kernel/필요한 helper/최소 tests의 단독 writer이고
이전에 담당(4)에 넘긴 빈 Callout 경계의 임시 kernel 역할은 종료됐다. 자동 분할을
원 본문으로 메모리에서 정규화한 뒤 동일 문단은 이전/다음 grapheme 또는 hardBreak를
삭제한다. 한글/emoji/marks 경계를 UTF16 한 code unit로 잘라 손상시키지 않는다.
서로 다른 body는 기존 안전 병합과 opaque meta 보존을 적용하고 원 page/cover/
callout/toggle/step 제목 및 반복 table header는 본문을 흡수하지 않게 한다.
composing guard·원ID/selection/marks/meta와 실제 flow 후 전체 text·한 UndoRedo를 확인한다.
반복 title-sync를 끄거나 모든 경계 키를 no-op으로 바꾼 것만으로 수락하지 않는다.

### 물리 fragment 감사와 새 논리 작업 계약

같은 source의24 scalar 경우는 paragraph/callout/table의 head/tail×복제/삭제/이동/
heading2 변환이다.20건은 처리됐고 callout/table wrapper의 제목 변환4건은 false였다.
상대 fragment 내용/marks/meta/ID는24건 모두 보존됐고20건의 한 UndoRedo·모든 경우의
serialization/ID유일은 green이었다. 그러나 작업은 원 논리 블록 전체가 아니라 물리
fragment만 처리했다. paragraph head 복제는 `ABCD`만 더하고, head 삭제는 `EFGH`만
남겼으며 이동도 head와 tail을 분리했다. table head/tail 복제도 원3행 전체가 아니다.

head 삭제 뒤 paragraph의 `rootBlockId`가 사라진 원ID를 참조했고 callout은 wrapper와
inner p 참조2개가 남았다. head heading 변환 뒤 tail `sourceType`도 paragraph 그대로였다.
삭제→실제 two-pass backfill3건은1쪽/파일 decode green이지만 dangling meta가 유지됐다.
generic moveManualObject는 한 PM page만 옮기므로 manual root+automatic tails 이동을
수락한 API로 사용할 수 없다.

기존 v2 계획은 scalar 전체의 논리 단위를 명시하지 않았다. 따라서 보존 green과 사용
의미의 차이를 **계약 gap**으로 기록하고, 앞선 green을 취소하거나 기존 명시 계약 위반으로
소급하지 않는다. 이제 자동 A4 분할은 표시이며 scalar 복제/삭제/이동/유형 변환의 단위는
원 논리 블록 전체로 정한다. 명시 부분 텍스트 선택은 그대로 유지한다. 원 metadata/ID와
단일 UndoRedo·serializer를 보존하고 dangling reference/sourceType 불일치를 남기지 않는다.
페이지 이동은 cover 고정, manual root와 연속 automatic tails 전체를 함께 처리한다.
P1 hotfix를 동결한 뒤 이 계약은 별도 구현·native·제품 단계로 진행한다.

### 새 목차 UI 후보와 현재 병렬 실행 경계

독립 QA 채팅의 실제 사용자 추가 요청에 따라 페이지 작업을 왼쪽 목차에 모으는 후보를
작성했다. 최초 JSX0b75/CSS0ce15/canvas90f4의 source 검사는 끝났고 native/build는 아직
아니다. root가 automatic group의 물리 page 구조 작업 위험을 확인해 좁은 guard를
요청했다. 후속 JSX
`3980a9fcf05a99a00bd22effc9c48ca41cbac14450675f71c0dd4908eec60e41`은 root/tail에
대한4개 구조 작업을 command dryrun/dispatch와 chooser fallback 모두 차단한다.
기존 plain manual page/cover의 유효 동작을 유지했다. parent의 실제 source harness7개
fixture/chooser60회 우회0은 모델 논리 group/native 수락과 구분한다.
[guard source 결과](assets/manual-editor-ui-audit/page-group-guard-result.json)는 실제 JSX에서
추출한 helper/chooser/menuItems와 JSON-shaped page metadata를 사용한 검사다. underlying
PM 명령은 stub이므로 실제 logical move transaction의 통과를 뜻하지 않는다.

| 담당 | 현재 실행 / 의존성 |
|---|---|
| 모델(2) | P1 kernel+최소 tests 단독 구현 중. source freeze/정상 기대/public native fixture 전달 후 다음 논리 작업 단계 |
| 메뉴(4) | 신규 sidebar 오른쪽6점 page drag helper/tests만 독립 작성. 기존 kernel/JSX/CSS/canvas/Menu 변경0. 실제 이동은 모델 callback |
| 독립 검증 parent | 승인된 목차 JSX/CSS/canvas 후보 및 guard 완료·동결. 실제 page UI native를 먼저 수행, 후속 drag 배선은 다음 단계 |
| 원본 UI | source 동시 수정0, 유일한 QA/build/product owner로 다시 양도받음. page UI native 다음 P1 native 수락을 연결하고 제품 build1회 |
| root(3) | 문서 단독 writer, 결과/실제 bytes 대조와 충돌 조정. 새 코드·build/server 쓰기0, 기존 heartbeat 갱신 |

3980 guard 이후 QA parent의 실제 사용자가 저장 상태를 오른쪽 저장 버튼 옆으로
옮기도록 추가 요청했다. 지정된 JSX/CSS writer가 그 좁은 변경을 진행하며 native/build
전 새 SHA를 다시 동결한다. guard 의미와 P1 우선 순서는 유지하고3980 자체를 최신
save-status 변경까지 포함한 소스로 표시하지 않는다.

이후 save-status 변경의 source를 JSX
`5a89c8e4f345c4e6bbe5568d17feeb518d897a239eee540166aacf1d8ac30a43`, CSS
`6e0a5111b997165731c0221332deeb99f0bfa3607358151dd2096a6ebe296cc2`, canvas90f4로
다시 동결했다. root의 실제 파일 SHA 대조도 일치했다. 상태는 header action cluster의
저장 버튼 옆으로 옮기고520px 이하에서는 두 번째 행 오른쪽/11px로 표시한다.
page guard 의미는 그대로이며 parent의 syntax/CSS8검사는 native 수락과 구분한다.
page UI native 범위에 wide/390 저장 cluster를 추가하고 P1 model freeze를 기다린다.

이 목차/save-status 후보와 P1을 먼저 native·제품 반영한다. 새 sidebar drag와 논리 scalar 지원을
동시에 빌드해 P1 반영을 기다리게 하지 않는다. 다른 세션은 단독 writer의 파일을
덮어쓰지 않으며 Core/Theme/Menu의 기존 green은 해당 source가 같은 범위에서 재사용한다.
이는 무조건 모든 단계가 동시에 실행된다는 뜻이 아니다. 구현은 병렬로 진행하고
의존하는 통합 native/build는 순서대로 한 소유자가 수행한다. 실제 서버 반영 전까지
사용자 화면은 Dwdc/CQh이고 원탭/IDB/강제 reload는0이다.

### 총괄과 즉시 작업 배정 — 2026-10-07

사용자가 병렬화 상태를 물은 뒤 세션이 부족하고 작업을 주면 바로 하달하는 총괄을
지정해 달라고 요청했다. **Pull 전체 LDS 원격 변경 (3)**을 총괄로 고정했다.
이 채팅에 들어온 작업은 담당 채팅에 즉시 전달하고 우선순위·파일 소유·의존성·
수락 증거·실제 제품 반영을 함께 추적한다. 기존 채팅들이 직접 받은 인간의 지시는
그대로 존중하고 새 범위와 파일을 총괄에 즉시 알려 writer 충돌을 조정한다.

구현·source freeze·native·build·제품 제공을 구분해 보고한다. UI가 모델 freeze를
기다리는 상황을 동시에 구현 중인 것으로 표현하지 않는다. 파일별 단독 writer와
한 QA/build/product owner를 유지하며, 구현은 독립 범위에서 병렬로 진행한다.
현재 별도 전담이 필요한 후보는 키보드/입력, 저장/파일, 시각 검증이며 추가 채팅을
이번 상태 질의만으로 생성하지는 않았다. 신규 세션 생성과 기존 세션의 분담 조정은
구분한다. 현재 담당 표와 새 요청은 이 기록을 기준으로 유지한다.

### 전담 세션3개 추가와 대기 운영 변경 — 실제 요청 후 생성

이어 사용자가 **‘한3개 정도 추가해줘, 그리고 대기조도 수정해줘’**라고 명시 실행을
지시했다. local lk-workspace 프로젝트를 조회한 뒤 아래3개 채팅을 생성했고 bounded
wait의 active/inProgress 및 실제 소스 감사·반환 결과로 작업 시작을 확인했다.

| 새 채팅 | ID | 배정/파일 경계 |
|---|---|---|
| LDS Manual 키보드·입력 | `01a1160d-8245-78b0-8bff-3cac517d8b59` | 입력/선택 경계의 독립 actual PM 감사. 확인한 replacement caret 결함 후 `manual-block-selection.mjs`와 새 최소 tests만 root에서 이관받아 단독 writer |
| LDS Manual 저장·파일 | `01a1160d-884c-7071-a67c-2150f3eb5178` | 저장/codec/actual file/자산 실패·entry 호환 감사. source 쓰기0, 필요한 특정 수정 파일만 별도 이관 |
| LDS Manual 시각·경계 검증 | `01a1160d-8e18-78a2-8d1d-f0331fe9d877` | 기존 구현 parent와 분리한 독립 pixels/geometry/source 및 native 준비. source/CSS/build/원탭 쓰기0 |

총괄은 이 채팅에 고정한다. 영구 대기 담당을 두는 대신 완료 보고 뒤 실행 가능한 다음
독립 작업을 배정한다. 필수 freeze/QA 환경을 기다릴 때는 준비 완료물·이유·재개 조건을
기록하고, 필요한 신호에서 다음 작업을 시작한다. 같은 green이나 불필요한 코드로
대기를 채우지 않는다. native viewport/탭과 QA/build/product는 원본 UI가 조율한다.
기존 heartbeat를 갱신해7개 형제의 cursor/결과/수정·검증·반영을 추적한다.

### P1 모델 동결과 추가 selection caret 수정

모델 P1 kernel은
`3fdb5cf23defa9cc4e40ac36557fe90854075c0291967ddbbee4d12cb31a6b6e`로 동결됐고
새 boundary26+기존 Callout10+inputrule/IME/page21 총57건을 수락했다. 새 focused test는
`ec30d4dbbd3153bcfcdd359a2c17e633ba76aadf29287b29ed4965324fe1de8a`다. planner/runtime/
metadata와 Core/UI는 모델 담당이 변경하지 않았다. root도 실제 source SHA를 대조했다.
public A4 fixture197705B/SHA b30dc60b는 authored4쪽/auto markers0/assets0이며
paragraph/callout/toggle5850 UTF16·marks·hardBreak·Hangul NFD/emoji ZWJ/flag/combining,
독립 page/table을 포함한다. portable/PM 왕복과 synthetic 모델 green은 native가 아니다.

새 키보드 담당은 동일 kernel 시작/끝 SHA에서 독립8개 실제 PM+planner 경우를 실행했다.
부분 선택 forward/reverse Backspace/Delete4건과 빈 Callout/Toggle 이후 marked typing2건은
pass였다. head+tail custom block selection replacement2건은 이어 입력이 본문 대신
제목으로 들어갔다. afterKey부터 pageTitle Task offset4였고 flow/UndoRedo가 원인이
아니었다. 원문/marks/meta/한 UndoRedo가 보존됐어도 잘못된 caret를 정확히 복원한
것이었다. [최초 결과](assets/manual-editor-ui-audit/keyboard-boundary-initial-result.json)와
[단계 trace](assets/manual-editor-ui-audit/block-replacement-forward-initial.json)를 보관했다.

root가 selection helper를 새 키보드 담당에 파일별 단독 이관했다. 모델(2)의 최초
needed helpers scope와 중복 인식이 있었으나 파일 쓰기 전에 정정했고 양쪽 쓰기
중복0을 확인했다. nonempty replacement는 실제 inserted end에 caret를 놓고 빈 삭제의
기존 위치는 유지한다. [수정 후 결과](assets/manual-editor-ui-audit/block-replacement-fixed-result.json)와
[검증 로그](assets/manual-editor-ui-audit/block-replacement-regression.log)를 보관했다. 수정 helper
`137cec8ad834eca74cf2d7289a6516ce7ede54fd9b5141b28bcc7585476fa9cf`, 새 replacement test
`ff29822e7a84c8d119289d8a9681b8cd0d54c93c9d318138968d88409a18b822`로 동결, 새6+기존
selection22 총28건/99ms를 수락했다. kernel3fdb는 그대로이고 native/제품은 아직0이다.

ordinary 같은 page의 두 문단 join2건은 text/marks/한 UndoRedo가 유지됐지만 오른쪽
opaque metadata가 사라졌다. [별도 결과](assets/manual-editor-ui-audit/ordinary-join-metadata-initial.json)는
일반 병합의 opaque lifecycle이 이전 계약에 명시되지 않았음을 구분했다. automatic
spill provenance와 일치시키는 후속 설계·수정 대상으로 남기고 P1 소급 위반으로 단정하지 않는다.

### 새 저장·시각 감사의 첫 결과와 후속 작업

[저장 독립 결과](assets/manual-editor-ui-audit/storage-independent-result.json)는 실제11997B
파일/37객체/recognised marker2의 reference가 유효함을 확인했다. 모든 객체에 opaque
extensions를 넣은 codec→memory CAS→재열기→파일 왕복과 copy의 새 ID/known reference
remap/opaque 보존 등8건이 green이고 source SHA 불변이었다. 기존16/11/4 suites를
반복하지 않았다. 실제 IDB/native와 이전 Undo 근거는 이번 codec검사로 확대하지 않는다.

[손상 이미지 source 감사](assets/manual-editor-ui-audit/broken-image-source-audit.json)는
valid base64/invalid PNG가 구조 codec에서 받아지는 기존 경계와 실제 decode를 구분했다.
crop figure는 SVG `image`로 렌더링되는데 ManualPrint의 load/error/naturalWidth 두 검사는
`img`만 조회해 손상 crop raster를 preflight에서 놓칠 수 있다. cover 오류의 수정 owner ID
누락도 별도 source gap이다. 무crop/기존 picker의 decode 전 asset 변경 방지는 확인했고
cropped/uncropped/cover의 유효·손상6fixture/API/cancel·timeout 기대를 준비했다.
후속 P2로 등록하고 이번 P1 반영을 기다리게 하지 않는다. 실제 native 실패 수락0이다.

[독립 시각 보고](assets/manual-editor-ui-audit/visual-boundary-independent-review.md)는 반환9장
pixels/geometry에서 새 확정 실패0을 보고했다. 새 outline 메뉴의 anchor는 trigger rect를
한 번 저장하고 outline-origin은 `getPlacementBounds`가 없어 document scroll listener도
설치되지 않는다. 긴 목차 wheel/resize 후 대상과 popup이 떨어지는지는 **source concern**이며
[최소 재현](assets/manual-editor-ui-audit/outline-menu-repro.md)을 준비했으나 native 확정은 아니다.

메뉴(4)의 outline drag helper18건 수락 후 caller 준비는
[별도 계약](assets/manual-editor-ui-audit/outline-page-drag-caller-contract.txt)에 보관했다.
private pagesOf를 외부 API로 가정하지 않고 public marker의 인정 기준을 사용한다.
seed부터 pagination pause가 필요하고 threshold 미만 취소는 feedback(null)만으로 재개를
알 수 없어 caller의 deferred observer가 session 종료 뒤 request하도록 한다. 새 API/
source 변경 없이 후속 배선 조건을 준비했으며 이번 P1 후보에는 포함하지 않는다.

### 탭/주소별 에디터 디자인 혼재 — 사용자 답변과 정리 결정

사용자가 ‘에디터 페이지마다 디자인이 다르냐’고 지적했고, ‘열어 둔 탭이나 주소마다
화면이 다름’으로 범위를 확정했다. 같은 문서1·2쪽의 스타일 결함으로 해석하지 않는다.
root의 제품44589 static GET은 아래처럼 각각 다른 entry JS/CSS를 반환했다.

| 주소 | 실제 제공 |
|---|---|
| `/` | 기존 editor-BQJgxQjs.js/editor-BxNVYWb6.css, title LDS Manual 편집기 |
| `/prototype.html` | 시험 prototype-C3Nhf7cJ.js/prototype-Chd_95T3.css |
| `/manual.html` | 새 manual-DwdcZC6x.js/manual-CQhRuthu.css |
| `/preview.html` | 기존 별도 preview-BUYQcVTU.js/preview-BEEudUXW.css |

manual의 `?ui=page-controls-e62`/`?ui=writing-cleanup-final` 응답은 HTML SHA
e4f800ab와 refs가 완전히 같다. query 이름이 실제 다른 UI를 고르는 증거는 없다.
이미 열린 탭이 이전 bundle을 유지할 수 있으나 root가 그 탭의 loaded JS를 읽은 것은
아니므로 이는 추정이다. 사용자 원탭 강제 reload/IDB 접근은0이다.

구 작성기/시험 화면을 일반 작성 화면처럼 노출한 진입점 정리가 미완료였다. 정식
작성진입점은 `/manual.html` 하나로 통일한다. 기본/시험/preview의 ordinary 작성 노출을
정리하고 v1 자료와 인증 host는 실제 entry·저장 계약을 먼저 대조해 호환 전용 경로와
명확한 label로 보존한다. 무작정 index를 덮거나 legacy 자료를 v2로 이관하지 않는다.
저장 담당이 entry 호환을, 독립 시각 담당이 route/label 혼동을 지금 읽기 감사하고
UI owner가 P1 제품 수락 후 최소 entry 정리를 수행한다. 현재 제공은 여전히 Dwdc/CQh다.

### 이번 통합 후보의 최종 source와 재개 조건

추가 실제 사용자의 ‘본문 속성을 왜 전역 toolbar에서 여는가’ 요청은 기존 속성 버튼을
유지한 과거 scope를 바꾼다. QA parent 지정 JSX writer는 toolbar 선택 속성 버튼을
제거하고 실제 필드가 있는 figure/callout/codeBlock/procedure/table의 단일 블록 메뉴에만
속성 진입을 둔다. menu.targetId를 Inspector에 고정하고 PM 선택 변경/내용 dispatch와
generic fallback은0이다. page/cover/paragraph/multi에는 빈 속성 명령을 만들지 않는다.
실제 추출16case와 syntax 검사는 native 수락이 아니며 cell→parent table 계약을 유지했다.

최종 UI `dadbe64f506baf19bcdec8e6c783d6c099744995a52bdc062af52f3ff58d0ac8`, CSS6e0a,
canvas90f4, kernel3fdb, selection137cec가 동결됐고 root도 실제 파일 SHA를 대조했다.
UI owner에게 QA build→새 memory QA server→parent page/save/properties native→UI P1/
selection native→독립 visual 증분→한 product build/HTTP 대조/임시 QA 정리를 재개하도록
전달했다. P1 fixture와50쪽 목차 fixture는 public 파일이며 실제 문서/IDB는 건드리지 않는다.
실제 결과 도착 전까지 모델57/selection28/source16의 green을 native로 표시하지 않는다.
SVG print/ordinary metadata/논리 scalar·page drag/작성 entry 통일은 후속 별도 작업이다.

UI owner의 QA build321ms와14개 source freeze 대조 불일치0을 확인했다.
새 memory QA는35587/session80627, `/tmp/lds-manual-a4-boundary-qa-3_ygynq6`의
controls-Byid-HSG.js/controls-BPy5BleV.css를 제공하며4HTML/참조 assets byte·HTTP가
일치했다. native lease는 parent page/save/properties 먼저 양도됐고 UI P1/selection,
독립 시각 증분이 이어진다. 관련 native10~20분/두 세션 순차 검증의 이유·범위와
원본 문서 쓰기0을 사용자에게 먼저 알렸다. 현재 제품은 아직 Dwdc/CQh다.

이후 parent의 actual50쪽 목차 native에서 S01을 확정했다. nav wheel의 scrollTop
1914→1014로 trigger y737.25→1637.25(화면 밖)가 됐지만 popup은 x164/y473.25,
320×257px에 그대로 남았다. `/tmp/lds-manual-page-outline-20261007/anchor-native.json`
및07/08 JPG가 근거다. 새 candidate 제품 반영을 hold하고 지정 JSX writer에 outline
scroll/resize/닫기의 stale menu safe-dismiss를 배정했다. PM 내용·원selection 변경과
사라진 trigger로 강제 focus 복귀는0, 메뉴 자체 검색/list scroll은 유지한다. source
재동결 후 이3경계를 증분 native로 수락하고 Core/Menu/kernel/selection 및 같은 축의
기존 page/save/properties green은 재사용한다. 이 source concern은 이제 실제 native
실패이며 앞선 ‘확정 실패0’ 보고는 그때의 캡처/소스 범위로만 유지한다.

### 2026-10-07 메뉴 수명 수정 후보 재검증

동일 실패 후보의 resize 재현도 확인됐다. 1065→390px에서 목차 DOM은 사라졌으나
페이지 메뉴와 검색 focus가 남았다. 근거는 같은 임시 검증 디렉터리의
`resize-anchor-native.json`과09 JPG이며 독립 시각 담당도 반환된 자료를 대조했다.

지정 JSX writer는 수정 후 `7378cb9df225aa25b9ec9761f523633ea15a0ab291580ed0e63dd245bddb6fba`로
재동결했다. outline-origin 메뉴에만 nav scroll, window/visualViewport resize,
목차 숨김, trigger disconnect 시 dismiss를 추가했다. PM dispatch나 강제 focus 복귀는
추가하지 않았다. syntax와 effect seam9 통과는 실제 focus 결과 수락을 대신하지 않는다.

UI owner는 필수 delta QA를530ms에 빌드하고14개 source 불일치0을 확인했다.
동일35587/session80627에서 controls-D1nSKDHr.js/controls-BPy5BleV.css를 제공한다.
`qa-http-after-anchor-fix.json`의4개 파일은 HTTP200/bytes 일치이며 독립 담당도
source14 일치를 확인했다. 기존 Byid/dadbe 실패 증거는 보존한다. parent가 새 후보의
scroll/resize/hide/focus 및 남은 속성·자동 페이지 제한을 실제 브라우저에서 검사 중이다.
이후 UI owner의 P1/selection native가 이어진다. 기존 같은 축13개 native green은
범위를 한정해 재사용하며 제품44589는 여전히 이전 Dwdc/CQh다.

### 주소 통합 구현 인계

사용자가 주소 통합 미반영을 다시 지적했다. root는 오류 검증 뒤로 미룬 배정 문제를
인정하고 저장·파일 담당에게 새 entry/router/test와 index.html 연결을 단독 이관했다.
PrototypeEditor.jsx 복귀 anchor1곳도 예외 이관했으며 다른 JSX writer와 중복 수정은0이다.
공식 링크는 `http://127.0.0.1:44589/manual.html`이고 `?ui=`는 필요 없다.

담당자는 실제 repo 구현을 완료했다. 일반 `/` 및 `/index.html`은 기존 v1 main을
mount하기 전에 같은 origin의 `/manual.html`로 replace한다. `/index.html?legacy=1`,
인증 memory token 및 기존 legacy hash token은 기존 main.jsx를 동적 import한다.
bootstrap receiver가 router보다 먼저 실행되는 순서와 실제 receiver 복원·잘못된 origin
거부를 포함한 좁은5tests가52ms에 통과했다. 시험 화면 복귀는 `./manual.html`과
‘매뉴얼 작성’으로 바뀌었다. 기존 dirty main/host/bootstrap/DB/preview 관련8개 SHA는
변경0이며 데이터 이관도0이다.

근거는 `/tmp/lds-manual-storage-audit-20261007/entry-implementation-result.json`이다.
source 완료는 제품 적용 증거가 아니다. sole UI owner에게 제품 통합과 별도 임시 탭의
실제 주소 이동·호환 경로 검증을 인계했으며, 사용자 원탭/IDB는 변경하지 않는다.

### 7378/D1n 페이지·저장·속성 native 수락

QA parent의 `/tmp/lds-manual-page-outline-20261007/final-native-result.json`을 확인했다.
source14 불일치0이며 기존 같은 축13개 native 결과를 한정 재사용했다. 수정 후보에서
목차 wheel/1065→390 resize/목차 닫힘은 메뉴를 닫고 원치 않는 scroll jump 없이
BODY 또는 목차 토글 버튼에 focus를 남겼다. Escape/Tab은 기존 trigger로 복귀했다.
5종 블록 속성·이미지 target pin·table cell의 parent table·390 inspector·save 실패
상태와 alert도 실제 검증했다. A4 크기는793.6875×1122.515625px로 유지됐다.

자동 페이지 root/tail의4개 구조 작업은 임시 disabled 제한 상태로 수락했다. 설명 문구,
논리 page-group API와 새 sidebar drag 배선은 미완료다. 다중 선택 속성 없음·conflict
상태는 이번 native에서 재실행하지 않았고 관련 source 증거와 구분한다. 첫 cover 실행의
추가 한글 음절은 fresh reload에서 재현되지 않았으며 원인 미확정으로 IME 수락이나
확정 제품 결함으로 승격하지 않는다. 검증 소유 탭17/18은 닫고 viewport를 복원했다.
원사용자 탭 행동/IDB 쓰기는0이다. UI owner에 P1/selection native를 인계했으며 제품
제공 버전은 아직 이전 Dwdc/CQh다.

### 최신 사용자 지시: 로컬 source 제공을 검증과 분리

사용자가 ‘로컬코드 보여주기만 하면 된다’고 명시했다. root는 로컬 작업 화면을
전체 native 수락 후 제품 반영에 묶어 최신 UI 노출을 지연한 운영 실수를 인정했다.
이 지시는 앞선 제품 hold 정책보다 최신 로컬 화면 제공에 우선한다. sole 서버 owner는
자신의44589 기존 서버를 확인·종료하고 같은 loopback port의 Vite 개발 서버로 전환한다.
추가 build/test를 전환 조건으로 붙이지 않는다. P1 memory QA35587/session80627은
별도로 유지하며 개발 화면 제공을 전체 완성·제품 수락으로 표시하지 않는다.

최종 JSX는 호환 링크1곳만 수정한6fb69179이며 toolbar 링크·페이지 속성·상단 선택
작업 버튼 제거와 저장 버튼 옆 상태는 이전 native 수락 축과 동일하다. 호환 메뉴는
`./index.html?legacy=1`로 연결한다. 원 사용자 탭 reload/IDB 변경0을 유지한다.
UI owner가 전환 지시 수신과 PID19797 확인 후 실행을 보고했으며, 준비된 서버 session,
HTTP와 별도 임시 탭의 실제 DOM 결과는 아직 대기 중이다.

이 turn의 기존 heartbeat 조회는 app에서 존재하지 않는 automation으로 반환됐고
로컬 config도 없었다. 삭제 원인은 단정하지 않으며 새 automation은 생성하지 않았다.
전환 및 후속 검증은 이미 실행 중인 UI owner와 명시 인계로 계속 추적한다.

### 개발 서버 제공 완료와 추가 목차 피드백

UI owner가 자신의 Python PID19797을 종료하고44589를 기존 Vite 설정/runtime의
loopback strictPort 개발 서버로 전환했다(117ms/session22294). root의 공식 manual
HTTP200 응답에서 `/@vite/client` 및 source entry를 확인했다. UI owner도 같은 served
JSX를 public memory fixture에 연결한 임시 탭에서 toolbar8버튼과 링크·페이지 속성·상단
선택 작업 버튼0, 저장 상태 parent=header-actions를 확인했다. console error0이며 근거는
QA 디렉터리의 `dev-ui-proof.json`/`dev-ui-latest.jpg`다. 실제 root redirect native는
아직 별도 미검증이고 entry source HTTP200 및 좁은5tests와 구분한다.

사용자는 총괄이 직접 조사하지 말고 하위 세션에 즉시 맡기라고 지시했다. root는 페이지
목록 우측 아이콘의 관례를 독립 시각 담당, 현재 구현을 메뉴 담당에 분리 배정했다.
메뉴 담당은 현재 문자 U+00B7×3이 click menu만 열고 drag handler/helper 배선은0임을
확인했다. 시각 담당은 [노션 sidebar 공식 안내](https://www.notion.com/en-gb/help/navigate-with-the-sidebar)의
페이지••• 메뉴와 [본문 블록 안내](https://www.notion.com/help/what-is-a-block)의
6점 menu/drag 겸용을 구분했다. 6점이 항상 드래그 전용이라는 절대 규칙은 만들지 않는다.
현재 메뉴전용 버튼은 공용 SVG 가로3점으로 정리하고 실제 page reorder와 별도 grip은
함께 연결한다. 임의6점 장식으로 미구현 drag 가능성을 표시하지 않는다.

추가 사용자 요청인 '+페이지 추가' 아래 '1쪽 뒤에' 상시 안내 제거는 QA parent 지정
JSX/CSS writer에 즉시 배정했다. 실제 추가 위치 변경0이며 문구 제거와 공용 아이콘
정리는 dev에서 바로 반영하고 전체 P1 native/build를 반영 조건으로 묶지 않는다.
이 추가 수정의 완료/실제 DOM 확인은 아직 대기 중이다.

### 절차 본문 핸들 정렬과 입력 검증 격리

사용자의159×126px 첨부에서 절차 본문 핸들이 안쪽으로 들어간 문제를 parent 구현
담당과 독립 시각 담당에게 분리 배정했다. source상 step본문의24px 들여쓰기와
targetrect.left-38 계산이 함께 적용된다. 콘텐츠 들여쓰기는 유지하고 stepcontainer
기준의 rail x와 child ID/firstline y를 분리한다. parent의 기존 controller writer 범위에
optional getRailLeft와 Manual caller를 허용했으며 기본 legacy 좌표는 유지한다.
중첩 블록 모두를 전역 x로 평탄화하지 않고 list/callout gutter와 번호·icon 겹침을
비교한다. source 원인은 확인했지만 좁은 actual geometry 및 수정 결과는 아직 대기다.

P1 native의 첫 tail Backspace는 이전 공백1자만 삭제하고 다른 family/title 및 한 번의
Undo/Redo를 보존한 범위로 수락했다. headEnd 준비 중 예상 밖 한글 입력이 관찰돼
추가 키 입력은 정지했다. 독립 입력 담당의 JSON 대조에서는 longtext5370→5373,
한 문단에 ‘쪽으로’3자 삽입이며 다른3family/sentinel/title은 동일하다. UI 담당이 보고한
5850 측정은 JS UTF-16 단위이고5370은 Python Unicode code point 단위로 후속 감사에서
확인됐다. 같은 문서의 단위 차이이며 새로운 내용 불일치가 아니다. 원인은 미확정이고 source 실패나
IME 수락으로 승격하지 않는다. 지정 탭/locator 입력도 도구 문서의 보장 범위를 확인한
뒤 재개하며 사용자에게 편집 중단을 요청하지 않는다. 개발 서버 제공과 분리해 추적한다.

독립 입력 담당의 `/tmp/lds-manual-keyboard-input-20261007/input-tool-focus-audit.json`은
문서상 tab.pressKey(null)의 현재 focus 의존과 locator.press의 matched locator focus를
구분했다. 후자도 OS/user 동시 입력의 독점 격리를 보장하지 않는다. UI sole lease가
반환된 뒤 fresh synthetic 문서의 실제 field/ID/caret 경계 및 내용 일치를 먼저 확인하고,
키 입력 직후 snapshot을 대조한다. 무관 text delta가 발생하면 오염된 sample로 중단한다.
기존 tail Backspace native 결과는 재사용하고 원탭 입력 중단은 요청하지 않는다.

### 후속 사용자 피드백과 병렬 writer 분리

절차 핸들 정렬의 실제 증분 검증을 수락했다. 새 memory Ckc3/BZV 후보에서 step본문
handle x290→266(-24), y476.96875/child path/본문 들여쓰기 동일, normal/list/callout
좌표 변화0이다. child 복제 뒤 Undo와 step 내부 본문 추가 뒤 Undo도 확인했다.
근거는 `/tmp/lds-manual-step-gutter-20261007/native-result.json` 및 전후 좌표·캡처다.
hover 순수3case는 native held-hover 수락으로 확대하지 않는다. 1065/521/520/390에서
상태12px/18px, gap12/center/overflow0을 확인했으나 전체 실패·충돌 상태를 다시
검증했다고 표시하지 않는다. 소유 검증 탭20 정리와 viewport 복원/원탭·IDB 쓰기0이다.

손잡이 click의 실제 선택 연결은 입력 담당의 읽기 감사 결과로 확정했다. 현재 click은
menu.target만 기억하고 PM 선택은 변경하지 않는다. 클릭 대상이 기존 custom multi에
포함되면 range를 유지하고, 그 외 기존 selectManualObject(text:false)를 이용해 블록을
선택한 뒤 메뉴 검색에 focus한다. 이미지 figure는 caption 자식을 갖는 구조 node이며
순수 atom이라고 단정하지 않는다. 기존 selectednode 표시를 재사용하고 caption caret,
insert+, outline 페이지 메뉴는 별도 동작으로 보존한다. 기존 Inspector pin도 유지한다.

LDS 감사에서 파일 메뉴는 이미 CoreDropdownMenu를 사용하고, toolbar 문단 종류와
Inspector 이미지 폭·안내 종류3곳은 native select라 공용 LDS 옵션 스타일을 따르지
못하는 것으로 확인했다. 기존 CoreSelect sm의 controlled value/options/can 및 focus
계약을 그대로 연결한다. 검색 command 메뉴는 다른 기능이므로 일반 DropdownMenu로
통째 교체하지 않는다. Inspector는 속성 폼과 고유 작업을 중심으로 정리하고 중복
move/duplicate/delete 및 상시 설명을 제거한다. 실제 남은 폭보다 큰 A4 때문에 생긴
본문 clipping은 panel 반응형 배치에서 해결하며 단순 overflow 숨김으로 감추지 않는다.

사용자는 목차 하단 페이지 추가 대신 문서 페이지 아래 작은 버튼을 재확인했고, sidebar
drag 미배선도 다시 지적했다. root는 후속으로 미뤄둔 관리 누락을 인정하고 현재 작업으로
승격했다. 자동 root+연속 tails를 끊지 않고 클릭한 논리 페이지 뒤에 authored page를
추가하거나 전체 그룹을 이동한다. cover 고정/ID·meta/Undo·선택 보존을 확인하며 view-only
추가 control은 A4 내용·저장·print 모델에 넣지 않는다.

실제 병렬 writer는 다음으로 분리했다. 모델2는 별도 page-group 모델 module/API,
입력 담당은 새 ManualPageOutline.jsx와 기존 helper 연결, 메뉴4는 새
ManualObjectProperties.jsx, parent는 ManualEditor 연결·기존 CSS/controller 및 페이지
아래 control이다. 새 파일을 중복 작성하지 않고 부모 소유 상태를 props로 전달한다.
source 구현과 실제 통합·native 결과는 별개로 보고하며 dev HMR 제공을 전체 P1
수락 뒤로 묶지 않는다. 현재 새 outline drag/아래 추가/Inspector/선택 연결은 미완료다.

UI writing은 행동 이름으로 축약한다. root 결정은 ‘새 문서 / 열기… / 복사본 가져오기… /
내보내기 / 인쇄 / PDF… / 이전 형식 열기’다. 즉시 download에는 ellipsis를 붙이지 않는다.
가져오기에는 사전 안내 dialog가 없으므로 복사본 의미를 유지한다. 보관함 화면에서
브라우저 저장 범위를 안내하고 상단 안정된 saved만 ‘저장됨’으로 줄인다. dirty/pending,
저장 실패·충돌과 내용 보존 복구 설명은 유지한다. 이 문구 수정은 추가 구현 기능의
완료를 기다리는 조건으로 삼지 않는다.

### 추가 선택 UX 및 독립 P1 증거 정정

사용자는 빈 여백에서 박스를 드래그해 다중 선택하는 기능을 요청했다. root는 저장·파일
담당에게 새 manual-marquee-selection.mjs 순수 view controller를, 입력 담당에게 기존
custom block selection 연결 계약을, parent에게 이벤트·overlay·선택 연결을 배정했다.
텍스트 위 드래그/메뉴/toolbar/grip 입력은 유지하며 빈 여백에서만 시작한다. 교차 대상의
ancestor/child 중복과 비연속 대상을 min/max로 뭉쳐 무관 블록까지 선택하는 오류를
피하고 Esc/cancel/blur/readonly 시 overlay를 정리한다. 현재 구현·통합은 미완료다.

목차 상단 ‘페이지+총수’는 row 번호·제목과 footer 현재/총쪽 정보에 중복돼 제거하도록
현재 parent와 새 outline writer에 전달했다. 페이지 추가 아래 안내 제거와 별도 요청이며
새 outline component가 과거 header를 다시 넣지 않는다.

독립 시각 담당은 첫 P1 Backspace의 raw semantic/history JSON을 재계산했다. 문자
UTF-16 5850→5849, 공백1개만 삭제, 다른6 leaves/meta/title/history 일치를 확인했다.
처음 HTML 서식 exact를 계산 완료 전에 보고한 오류를 즉시 정정했다. 이어 HTML 자체
text index3185와 JSON text index3190의 차이를 확인하고 같은 표현 기준으로 비교해
공백 삭제 뒤 전체 char/tag/href 및 mark-set 일치 True를 실계산했다. 정정 이력은
보존하며 최종 첫 사례 독립 근거만 수락한다. 이는 Delete/callout/toggle/selection 등
나머지 P1 native의 완료를 의미하지 않는다.


### 2026-10-07 추가 UI 지적: 검색창·표지와 실제 열린 탭

단일 작업 메뉴의 ‘블록 작업’ 제목을 메뉴 담당이 제거했다. BlockCommandMenu
SHA60731892, 단일 block group만 제목을 숨기며 검색·actions·keyboard 계약은 유지한다.
44589 Vite transformed source HTTP200까지 확인했으며 사용자 화면 native 수락은 아니다.
사용자가 검색창의 각진 모서리를 지적해 Core Input sm으로 전환하도록 메뉴 JSX 담당에게,
기존 native input 및 important focus 규칙 제거는 parent CSS 단독 writer에게 배정했다.
현행 Core32/radius8/padding12 근거를 사용하며 임의 토큰이나 새 dependency는 추가하지 않는다.

빈 quote Backspace 전담 채팅은 01a1165c-1e87-7fb3-8836-369731a4dc4a,
페이지 템플릿 전담 채팅은 01a1165e-a602-7690-964c-24ed3c7c0eca이다.
빈 quote helper baf47b86와 kernel96ca8f6f 연결은 실제 PM/keybinding20green,
44589 source 제공을 확인했다. 자동 continuation quote 변환은 guard로 거절한다.
공유 입력 경로의 무관한 입력 혼입 때문에 native 키 검증은 미완료이며 기존 kernel
3fdb의 paragraph BS/Delete native 증거를 새 SHA 전체에 확대하지 않는다.

템플릿 module11e2c227/test4bd544f8은 기본본문·절차·표·표지의 서로 다른 실제 v2
구조를 생성하며 실제 PM/파일 roundtrip16green이다. 표지는 없을 때 index0에 생성하고
기존 공식 logo resolver를 사용한다. 실제 asset 없는 화면 템플릿은 노출하지 않는다.
사용자의 ‘표지는 왜 없음?’에 따라 준비된 PageAddControls와 template canAdd/onAdd의
실제 JSX 연결을 parent 우선 작업으로 배정했다. 해당 감사 시점에는 import/caller0이므로
준비 모듈만으로 표지 UI가 반영됐다고 주장하지 않는다.

pagegroups module291d73fb/testddf43d56은 actual PM27green으로 동결됐다.
root와 자동 tail 전체 이동, clicked physical page의 group 끝에 삽입, 표지 고정,
정확한 선택 membership/IDs/meta/단일 UndoRedo를 확인했다. Outline167c98b7와
최종 drag helper eea4f966/22green의 caller 계약을 parent에 전달했다. 실제 UI 연결은 별도다.
Sparse selection helper59e0443c의 새14+관련28=42green과 marquee helperebb6181c의
13green은 source 증거이며 kernel guard 및 parent overlay 연결을 전체 native로 수락하지 않는다.

Parent JSX422554ab은 toolbar public Select, 중복 목차 header 제거, 짧은 파일 메뉴,
‘저장됨’ 문구를 제공했다고 보고했다. ready Inspector2cfa7fd6와 표지 UI 연결은 진행 중이다.
Parent가 원래 열린 tab6을 읽기만 해 loaded script manual-DwdcZC6x.js/vitefalse를
확인했다. 현재 served source와 기존 열린 정적 탭이 다른 버전임이 확정됐다.
원탭 강제 reload/IDB 조작은 하지 않았고 root가 사용자에게 저장 확인 후 새로고침하면
최신 source를 불러온다고 안내했다. 현재 공식 주소는 44589/manual.html이며
Vite session22294의 즉시 source 제공을 P1 전체 native 완료 조건으로 다시 묶지 않는다.


추가 actual wiring 수락: parent JSX50fd0549는 Inspector2cfa public fields/pinned target/
표 구조4actions와 PageAddControls/templates4의 canAdd/onMenuOpen/onAdd를 연결했다.
템플릿 담당이 source exact SHA와 실제 caller를 독립 대조했다. 표지의 기존 여부는
실제 command dryrun으로 disabled되며 captured physical page ID/doc revision/generation을
검사한 후 index0에 삽입한다. logo는 기존 resolveAsset의 brandUrl로 연결된다.
44589 transformed source GET200에 새 imports가 제공된다. 이 증거는 actual JSX+served
연결이며 사용자 원탭의 native 렌더/클릭/포커스/Undo를 확인했다는 의미는 아니다.
메뉴 search Core Input sm의 현행 token은 height32/radius8/font14/line20이다.
메뉴 JSX writer에게 minimal Input 전환 실행을 명시했고 CSS writer는 각진 native
focus override 제거를 담당한다. source 준비 단계와 반영 완료를 구분한다.


### 2026-10-07 사용자 승인: 목차 단일 메뉴, 파일 열기, 이미지 직접 선택

사용자가 목차의 ellipsis+6dot 동시 노출 대안과 외부 사례 조사를 요청했다.
공식 Notion sidebar/intro-to-workspaces 및 Google Slides1694830의 페이지 자체 drag/
hover 또는 context 메뉴 사례를 조회했다. 권장안은 번호·제목 영역 클릭 탐색과 mouse
threshold6px drag, trailing ellipsis 하나다. 사용자가 ‘변경해’로 실행을 승인했다.
keyboard는 ManualPageOutline 단독 writer, 메뉴 담당은 drag helper 단독 writer,
parent는 CSS 단독 writer다. helper activationMode row는 mouse down seed만 만들고
threshold 이후 preventDefault/capture, shortclick 정상 탐색, true drag 후 click 억제한다.
default handle 계약은 유지하며 메뉴 sibling/cover/touch row seed는 제외한다.
helper 미지원 상태의 중간 component를 실제 클릭 완료로 수락하지 않고 통합 gate를 추적한다.
메뉴 담당이 오래된 ‘승인 없음’ 메시지를 반환해 root가 인간 실행 승인과 writer 지시를
직접 재명시했다. 실제 완료 SHA와 좁은 click-vs-drag 검사 반환은 별도 추적 중이다.

파일은 .manual.json / MIME application/json / lds-manual-document/v2다. 사용자가
‘열기’에서 시스템 파일 선택이 나오지 않음을 지적했다. root는 ‘열기…’→기존 file input,
‘보관함…’→IndexedDB 문서 목록, 중복 ‘복사본 가져오기’ 삭제를 확정했다.
parent bb64afa source에서 이 연결과 accept .manual.json,.json을 저장 담당이 확인했다.
기존 import의 새 ID/원본 파일 보존/보호 동선/CAS/codec은 바꾸지 않는다.

사용자가 이미지 직접 클릭 시 선택을 요청했다. figure는 caption을 가진 nonatom이라
PM 기본 leaf 클릭 선택 대상이 아니며 기존 handle 경로에만 explicit 선택이 있었다.
empty 담당 읽기 감사로 media firstDOM.contains(target)와 실제 PM node/pos/id를 확인하는
handleClickOn adapter를 parent sole JSX writer에게 배정했다. 캡션/cover logo/수식자/
메뉴·drag·readonly·composing 등은 제외하고 기존 selectManualObject(text:false)와
editor focus를 재사용한다. kernel/nodeViews 이중 writer는 허용하지 않으며 실제 연결은 진행 중이다.

사용자가 ‘저장 전’ 상시 표기를 지적해 idle/pending/saved/dirty의 상시 문구를 숨기고
saving/error/conflict만 표시하도록 parent에 지시했다. 저장 담당이 실제 상태 문자
‘저장 중’, ‘저장 실패’, ‘저장 충돌’의 행렬을 읽기 확인했다. 초기 library/load 오류 band,
quota/storage recovery, conflict/unsaved dialog, 저장 상태 문자열과 실제 autosave 논리는 유지한다.
새 timer/toast 또는 성공 상태를 거짓으로 만드는 변경은 없다.

최종 kernel9c4a94b4는 빈 quote 연결과 sparse public guards 포함, 신규8green78ms+
관련 P1/입력9green을 보고했다. helper59e와 pagegroups291d 증거는 각 당시 SHA로만 유지한다.
parent bb64afa의 marquee 실제 wiring은 exact logicalFragments hit/baseline restore/
revision-generation/clear-only pagination resume와 readonly page guard를 제공한다.
callback8/resume9/source syntax+HMR 근거이며 실제 rectangle pointer native 수락은 아니다.


### 2026-10-07 목차 드래그 최종 source 연결과 native 추적

사용자가 실제 ‘드래그 안 됨’을 다시 지적했다. 당시 component의 중간 안전조치로
nav click은 보존했지만 row drag 활성은 아직 없었다. root는 미완료임을 명시하고
앞선 반영 상태 안내가 앞섰음을 정정했다. helper 담당의 승인 대기 인식은 직접
실행 지시 재전달로 해소됐고 실제 opt-in 구현까지 추적했다.

최종 row helper9546fd72/testd1cf0192는 새 관련9green68ms, default handle 보존,
row mouse seed→6px threshold 뒤 capture/prevent, shortclick 정상 탐색,
실제 drag 뒤 click 억제, 메뉴/cover/touch seed0와 cancel/revision/dispose를 확인했다.
keyboard component f3bb7cfb는 datahandle 활성과 별도6dot 제거를 최종 연결했다.
새8semantic 검사에서 shortclicknav1, realdragdrop1/nav0, keyboard/navigation,
menu exclusion/cover/touch/cancel/disabled를 확인했고 44589 source 제공도 확인했다.
이는 mock/event routing 및 served source이며 native mouse synthesis 완료는 아니다.

Parent 최종 JSX760b21b2는 이미지 직접 클릭과 조건부 저장 상태를 실제 연결했고
focused PM/guard/status29green 및 HMR200을 보고했다. 모델 담당이 figure media와
caption DOM 구조, 단일 JSX handleClickOn, NodeSelection selection-only임을 독립 읽기
확인했다. 새 source에서 이미지 native 클릭/캡션 caret 검증은 UI sole lease의 별도 축이다.

최종 Manual CSS85177f53는 페이지 하단 portal z-index를40→3으로 낮춰 패널보다
위에 뜨는 계층 문제를 최소 수정했다. 메뉴 CoreInput c7b6d879/CSS5425ebab와
함께 parent의 15개 path/full SHA manifest를
/tmp/lds-manual-visual-fix-verification-20261007/final-ui-manifest.json에 동결했다.
원 UI 담당에게 단일 memory QA compile과 실제 합성 문서 row drag 순서 변경/
짧은 클릭 탐색을 최우선 증분 native로 요청했다. 원 사용자 문서/IDB/강제 reload0,
공유 입력 혼입 상태에서 키 입력0이며 기존 전체 green 반복이나 P1 gate hold를
최신 source 제공 조건으로 되돌리지 않는다.


### 2026-10-07 페이지 추가 위치의 인간 정정

원 UI는 최종 f3bb/9546과 JSX760b/CSS851 epoch의 실제 pointer row reorder
[A,B,C]→[B,C,A], 짧은 title click 탐색/order0, 메뉴 sibling drag order0,
Undo1 baseline exact와 페이지별 child IDs/HTML 보존을 확인했다.
관련 artifact는 /tmp/lds-manual-a4-boundary-qa-3_ygynq6/final-row-*이다.
그룹 cover fixed/duplicate cover disabled와 각 생성 Undo도 관련 마무리에서 확인했다.

기존 종이 아래 + 버튼은 실제 scroll 후 28px visible/menu4/표지 index0 생성을
확인했지만 새 표지 title이 viewport 위에 남고 새 기본 page title이 하단에서 일부
clip되는 객관적 UI 실패를 발견했다. root는 unrelated native 축을 중단하고 parent
caller에 새 생성 cover/page title로 scroll하는 최소 수정·관련 증분 native를 배정했다.
문서 변경/커서/Undo green을 화면에서 새 제목이 보인다는 수락으로 확대하지 않는다.

이어 사용자가 screenshot4d965b2e에서 왼쪽 목차 첫 행 바로 아래를 표시하며
‘여기 버튼 두기로 한 거 아님?’이라고 정정했다. root는 ‘페이지 아래’를 종이 아래로
잘못 해석했음을 인정했다. 최종 승인 위치는 왼쪽 목차의 각 항목 바로 아래 작은 +다.
keyboard sole Outline writer에게 각 physical entry의 CoreDropdown 4preset 추가를,
parent sole JSX에 templates/canAdd/begin/onAdd props 연결과 종이 아래 portal render 제거를,
parent sole CSS에 목차 between-row control styling을 배정했다. 제목 drag target과 +/
ellipsis는 sibling으로 분리하고 표지중복·readonly·captured revision/generation 계약은 유지한다.
새 cover/page title scroll 수정은 이 위치 정정 후에도 계속 필요하다.

원 UI에 종이 아래 button 관련 새 native 축 중단과 새 sidebar + tuple의 실제
노출/menu/new page·cover title viewport 검증을 요청했다. 기존 종이 아래 실제 증거는
해당 과거 epoch로 보존하며 인간 최종 위치 요구를 만족했다고 수락하지 않는다.
드래그 안내 text는 component f3bb 그대로, CSS95d05f89의 visuallyhidden 처리로
접근성 live 및 삽입 line을 유지했다. 중간 component2d6 삭제는 steering 충돌 후
복원됐고 최종 근거로 사용하지 않는다.


### 2026-10-07 인간 최종 버튼 형태와 파일 중심 저장

사용자가 작은 ‘버튼’을 원하며 웹 사례를 요청했다. root는 공식 OneNote의 Add Page,
Canva manage-pages의 thumbnail/grid 사이 Add Page, Notion sidebar New Page와
Slides의 새 slide/layout 동선을 조회했다. 이는 위치 맥락과 action label 사례이며
각 제품의 px/shape를 실제 측정했다는 근거가 아니다. root의 전행 outlined ‘+ 페이지’
버튼 판단은 실제 screenshot be5a4fa1에서 반복 action이 목록을 분절시키는 실패로
사용자가 지적했다. source8df와 functional gate를 시각 품질 수락으로 확대하지 않는다.

root는 frontend-design SKILL.md를 읽고 현 LDS 색/폰트/토큰 유지, navigation 주역과
보조 action 계층을 재검토했다. selected row single slot 임시안97c33be5/새7green은
이어 인간의 더 정확한 지시로 superseded됐다. 최종 요구는 해당 페이지 항목 hover 시
아래 경계 중앙에 걸친 작은 box 버튼, 평소 숨김, 목록 높이/간격 변화0이다.
메뉴가 열리면 pointer가 항목 밖으로 나가도 유지하고 keyboard focus 접근 및 coarse
접근을 보존한다. keyboard sole component와 parent sole CSS에 absolute sibling
boxed-plus/hover-focus-expanded 제어를 배정했다. 이전 전행 상시 버튼과 selected-only
상시안은 최종 완료로 사용하지 않는다. 독립 visual은 새 실제 screenshot과 hover bridge/
menu persistence/row geometry/no jump를 점검할 예정이다.

parent ccad7371는 paperbottom import/render 제거, sidebar API 연결과 새 page/cover
owning ID를 2 RAF 뒤 live DOM에서 조회해 scrollIntoView(start)하는 guarded reveal을
구현했다. view/generation/current selection owner가 다르면 scroll하지 않으며 문서/
커서/history 변화0이다. 새6source checks/HMR은 제공했으나 native viewport 수락은
최종 hover 버튼 tuple 이후 관련 축만 진행한다.

사용자가 저장 방식을 거듭 ‘일반적인 저장’으로 지시하고 앞서 File Open에서 OS 파일
브라우저를 요구한 맥락에 따라 root는 정식 저장 계약을 파일 중심으로 확정했다.
열기→선택한 파일 handle, 저장/Ctrl+S→같은 파일, 새 문서 첫 저장→이름·위치 선택,
다른 이름으로 저장→새 파일, .manual.json codec/assets/opaque 보존이다.
브라우저 보관함/CAS는 보조 복구로 분리하며 정식 file Save를 revision conflict로 막지 않는다.
취소/쓰기 실패/진행 중 다른 문서로 전환하면 잘못된 binding 또는 saved 판정을 만들지 않는다.
기능 지원은 실제 public picker capability를 확인하고, 다운로드 fallback을 동일 파일
덮어쓰기 지원이라고 부르지 않는다. 원 UI에 memory tab의 read-only capability 확인만
요청했으며 원사용자 파일 picker 열기/파일 쓰기는 실행하지 않는다.

저장 담당의 source 감사는 한 controller의 정상 queued Save 경쟁 실패를 발견하지
못했고 HMR old writer commit/new mount load의 stale 가능성은 인간 실제 원인으로
단정하지 않았다. identical payload stale CAS의 memory 재현과 최소 후보4green은
자료로 보존했다. 파일 중심 지시가 이를 supersede해 canonical store의 담당 변경을
원상복구하고9d1a6292 그대로 유지했다. 새 manual-file-session 모듈/좁은 의미 있는
검사 writer를 저장 담당에게, 실제 메뉴/Save/CtrlS/dirty protection caller는 parent에게
배정했다. Chrome 공식 File System Access 문서의 gesture picker 선행 및 writable close
성공 뒤 commit 계약을 확인하며 새 dependency/원자료 migration/무조건 overwrite는 없다.


### 2026-10-07 최신 사용자 결정 및 수락 범위

페이지 추가는 독립 경계의 작은 `+`를 누르면 빈 페이지를 즉시 추가한다.
4종 템플릿 선택 팝업은 사용자 지시로 제거했다. 버튼 시각 크기22/클릭 영역28/
아이콘12, 흰 배경과 외곽선 없음, 양옆 옅은 LDS 실선이며 경계 hover/focus에만
표시한다. parent c924 / Outline d6db / CSS18add / template5ae 후보의 실제 native에서
표지 없는 문서 맨 앞과 논리 그룹 끝에 각각 빈 제목+빈 문단 페이지 하나를 추가,
팝업0/새 제목 전체 가시/커서0/기존 페이지 보존/Undo1 전체 HTML·ID·순서 exact를
확인했고 독립 visual이 원본 JSON/JPG를 재검토했다. 표지가 있는 문서의 표지 앞
추가는 이 수락에 포함하지 않는다. 사용자가 표지 앞에도 추가를 요구해 기존
cover-first 고정 정책을 폐기하고, 호환 가능한 명시적 문서 순서 모델을 구현 중이다.

파일 중심 Save는 실제 caller 연결과 모의 handle 검증을 마쳤다. 실제 DOM의
file-save-mode=native를 확인했으나 OS 권한 요청·파일 쓰기·재열기는 실행하지 않았다.
parent b16 / Menu419 / menuCSSd757 / manualCSS18add / Core Icon chunk6cdd 후보에서
저장 버튼32/공식 저장 아이콘16/접근성 이름·단축키 안내를 실제 화면에서 확인했다.
페이지 작업 메뉴는192×146/4개 작업/아이콘16로 줄였으며 검색·닫기·설명0,
기본 긴 블록 메뉴의 검색은 유지했다. 메뉴 전후 기존 페이지 ID/전체 HTML exact를
확인했다. 저장 버튼 클릭 및 native 키 입력은 이 검수에 포함하지 않는다.

표지는 기존 LDS ManualCover/ManualMetadata/ManualSection과 공식 PDF 사례를
기준으로 factory5ae/Printb7/CSS metadata adapter를 수정했다. 편집기의 실제 구분선·
본문 wrapper 및 로고/제목/메타정보 표/섹션 제목 각각의 블록 선택·조작은 후속 모델
작업이다. 기존 표지 생성 green을 디자인·블록 조작 완료로 사용하지 않는다.
안내 Callout의 제목 없는 본문 사용, 표의 셀 직사각형 드래그/행·열 전체 선택,
열 너비·행 최소 높이 리사이즈와 저장·출력 보존도 사용자 승인 후 구현 중이다.
표 선택 helper의 isolated PM green은 실제 kernel/UI/native 완료가 아니다.

사용자 요청으로 디자인 검수 전용 채팅 「LDS Manual 디자인 QA 총괄」
01a116b1-5893-79e3-9f7a-4327720c3f09를 생성해 실행했다. 내부 서브에이전트로
공식 웹 사례/기존 LDS 정합/화면·상태별 QA를 병렬 수행하고 root에 문제와 재검수
결과를 인계한다. 구현 source·repo 문서는 쓰지 않고 자료는 /tmp에 저장한다.
브라우저/native lease는 기존 UI 담당 단독이며 원사용자 탭·문서·IDB·파일은 건드리지
않는다. 모든 새 기능은 source/served/native/pixel 수락을 구분한다.

### 현행 계약과 목표 완료 점검

이 절은 위의 시점별 기록을 삭제하지 않고 최신 사용자 결정과 완료 조건을 정리한다.
전체 목표는 **충분히 완성도 있게 구현**이며 아직 미완료다. 담당 코드 인계나
과거 후보의 green을 현행 전체 목표 완료로 사용하지 않는다.

**2026-10-08 후속 검수까지 반영한 최신 상태:** 아래 요약이 이전 상세 표의
`진행 중/미측정` 표현보다 우선한다. 상세 표는 구현 근거의 이력을 보존한다.
현행 고정 후보는 FOCUS_COMPACT_OUTLINE99이며 실제 화면의 source tuple과 수락 범위는
후속 raw/결과 파일에서 각각 확인했다. 목표 전체는 여전히 미완료다.

| 원요구 범위 | 확인된 현재 결과 | 남은 검수 |
|---|---|---|
| 헤더·투명 저장·상시 상태 제거 | 최근 실제 후보의 문서명/ghost 저장/문서 메뉴, 정상 상태 숨김, adapter390 저장 중·실패 표시와 오류 토큰 확인 | 원44589 반영·실제 저장·메뉴 실행·focus |
| 경계 작은 +·선·첫 페이지 앞 | FOLLOWUP99의 idle/leading hover·hit28·border0·양쪽 선 확인 | 표지 앞 실제 삽입·Undo |
| 목차 높이·균형·드래그·키보드 순서 | FOCUSCOMPACT99 행32/32/48·중앙0·잘림0, 순서 변경 caller/model 근거 유지 | 실제 drag·키 pickup/drop/cancel·표지 넘기·Undo·재열기 |
| 작업 메뉴·검색창 | 현재 복제/삭제2행·검색/닫기 chrome0, 표지 복제 disabled, HOVER99 LDS 토큰 확인 | 긴 삽입 검색창의 실제 입력/focus·메뉴 action·focus-visible |
| 전 항목 블록화·표지 역할·일반 제목/도입문 | TITLE99의 독립 ID/path/rail과 저장 순서·Editor/Print 표시, 빈 제목 인쇄 띠 제거 확인; 모델/codec/복사 ID 근거 유지 | 실제 이동·복제·삭제·키/drag·Undo |
| 새 표지 생성 | catalog/명령/caller·중복/stale/IME/Undo 검사 근거 유지 | 실제 삽입 메뉴·slash·제목 focus·Undo |
| 이미지 클릭·핸들·박스 다중 선택 | 불연속 A/C caller 수정·선택/이동/Undo 검사 근거 유지 | 실제 포인터와 표지/셀 선택 경합 |
| 이미지·표지 로고 크기와 출력 | IMAGE/TITLE/LOGO/FOLLOWUP99 폭·비율·caption·중첩 배치·기본/맞춤 로고 Editor/Print 확인, footer cap 코드 보완 | 실제 resize·preview/commit·숫자 입력·Undo·파일/OS 출력; cover-tail 일부 배치 근거는 제한됨 |
| 빈 인용/안내/단계 Backspace·제목 없는 안내 | 관련 명령 검사, 제목 없는 안내 실제 표면 확인 | 실제 키·caret·본문/metadata 보존·Undo |
| 표 셀/행/열 선택·방향키·행열 크기 | 모델/caller/portal 수정 및 layout/resize/Print 연결 근거 유지, 정보 표 폭·행 높이 읽기 대조 | 실제 선택 버튼 표시·drag·키·resize·Undo·재열기 |
| 일반 파일 열기/저장·긴 문서 보존 | .manual.json·bound session/mock/caller·recovery 분리 및 기존 codec/분할/marks 근거 유지 | OS picker·권한·실파일 쓰기/재열기·취소/오류·IME/clipboard |
| LDS 표지·일반 페이지 여백·중첩 번호 목록 | Editor/Print 대조, 목록 decimal/alpha/roman·시작번호·24px 들여쓰기와 빈 제목 gap 제거 확인 | 실제 Tab/ShiftTab·Undo·OS 출력 |
| 설명 제거·색상·포커스 복귀 | 정상 SR clip·상시 설명 없음·hover/error resolved 토큰 확인, 예약 focus guard 추출 callback22+2 검사 | 실제 focus-visible·복귀·IME와 복구 Conflict390 |
| 트리 분담·세션명·디자인 전용 QA | 총괄→구현/UI/UX 책임과 하위 담당, 독립 pixel QA 결과 확인 | 현재 구현/UI/UX/브라우저는 인계 후 idle이며 전체 완료를 의미하지 않음 |

입력 격리가 필요한 검수는 미응답 사용자 질문을 유지한다. 거부된 root CUA를 다른 세션이나
도구로 우회하지 않으며 원문 강제 reload·PM 주입·IDB/파일 조작으로 근거를 만들지 않는다.

최신 completion 독립 감사는 원23요구와 후속 수락을 다시 대조했으며 gate와 무관한
새 확정 source 누락은 찾지 못했다. 읽기 전후 Parent0d879e4c/CSSabbf4ef2/kernel08d077d1이
동일했고 root도 세 핵심 파일이 FOCUSCOMPACT99 사본과 같음을 확인했다. 이것은 전체 완료
증명이 아니다. 실제 키/포인터·Undo·focus/IME·OS 파일/출력·원44589 반영 및 cover-tail 확대/
caption wrap이 남아 있다. 독립 source 감사는 종료됐고 안전한 읽기 검수도 인계 완료됐다.
남은 실행은 외부 입력이 섞인 QA의 입력 격리와 root CUA 제한 해소를 기다리며,
기존 미응답 질문을 새 질문이나 우회 동작으로 대체하지 않는다.

| 요구사항 | 현재 근거 | 남은 완료 조건 |
|---|---|---|
| 간결한 헤더·투명 저장 아이콘 | header126/CSS091 후보의 1280/760/390·긴 제목·문서 메뉴 열린 상태를 실제 합성 화면과 독립 시각 검수로 확인 | 저장·메뉴 항목 실행과 keyboard/focus 복귀는 별도 |
| 경계의 작은 `+`와 첫 페이지 앞 삽입 | 직접 빈 페이지 추가의 기존 no-cover native 결과; template837/Outline559와 순서 모델의 실제 PM·codec 연결 | 표지 앞 추가의 현재 후보 실제 가시성·삽입·Undo |
| 목차 드래그로 순서 이동 | 기존 native row 이동·한 Undo·원페이지 보존; helper6702는 표지를 drop anchor로 허용하며 표지 자체 drag는 제한 | 표지를 넘는 실제 이동·선택·Undo와 파일 재열기 |
| 페이지 메뉴와 키보드 순서 변경 | 최신 UX 계약은 입력 방식과 무관하게 메뉴를 복제·삭제로 통일. Outline7a0d860/helperfe6b39의 실제 controller→JSX callback→PM 논리 그룹 연결 신규2검사에서 표지 앞 단일 commit·focus/클릭 충돌 방지·Space preview·Escape 문서 불변/정리 확인(`exec-92a89200`) | 합성 DOM/React 검사이므로 두 항목 메뉴와 키보드 pickup→방향키→drop/Escape의 native focus·취소·원문 복원·순서 변경 Undo는 별도. 입력 방식별 숨은 메뉴 분기는 사용하지 않음 |
| 전 항목 블록화 | 표지5역할의 독립 ID·공용 명령과 새93 후보 rail 노출 수락. 새TITLE99 후보는 일반 제목·도입문 ID·movePath·공용 명령, scalar 저장 호환·자동 분할·선택/Undo를 구현. 모델10·공개SSR1·복사ID 수정1·Parent6·Print6·자동 분할 제목 출력1의 제한된 근거 확보 | 새99 후보의 제목·도입문 실제 rail/menu·출력 순서·삭제된 제목 표시 검수와 격리된 실제 편집 수락은 남음. 모델/합성 caller를 실제 키·drag 수락으로 확대하지 않음 |
| 새 표지 생성 경로 | catalog54ef45bb의 삽입 메뉴·`/표지`, Parent1e4ce08d의 실제 caller, templatea99a33d9의 중복·stale·readonly·IME 보호와 제목 caret0·단일 transaction을 독립 소스 검토. 기존 focused 검사는 기존 페이지 보존·slash 제거·한 Undo/Redo를 포함 | 실제 메뉴 클릭·제목 DOM focus·viewport·native Undo 수락. 페이지 경계 `+`는 직접 빈 페이지 생성 유지 |
| 표지 역할과 일반 복제본 구분 | sparse 제목+정보 표 복제→파일 codec→실제 PM 재열기→일반 복제본 삭제→한 Undo의 신규 연결 검사 pass | 실제 입력/드래그와 출력 시각 보존 |
| 이미지 직접 클릭·핸들 선택·박스 다중 선택 | 각 담당 모델·caller 및 이전 합성 native 근거를 보존. 최신 실제 Parent+PM 연결 검사에서 불연속 A·C 재선택이 연속 A·B·C로 확장되는 결함을 발견. Parent121e0d86 수정 후 독립 소스 검토와 실제 caller 추출 신규2검사에서 exact 선택 ID·미선택 B 유지·이동 뒤 선택·한 Undo·취소 복원을 확인 | native 포인터·focus와 새 표지·셀 선택의 경합은 별도. 합성 caller 검사를 실제 화면 조작 수락으로 확대하지 않음 |
| 이미지 크기 조절 | 모델 최초5통과+실패2수정/재검증 통과. 공용 DOM 경계 helper의 표지 footer·중첩 margin 보정3 및 소수점 확대 보정1 통과. Parentd8cb의 실제 caller/PM 연결33검사에서 preview0 transaction·확정1 transaction·한 Undo·숫자 범위/stale 거절·pagination 재개 확인. Printf9e8의 실제 Blocks/PublicFigure SSR1에서 저장 폭240px·caption marks·기본/foreign layout 보존 확인. Props30d3의 12검사에서 최초 편집 callback 고정·stale 거절·mm/px 변환·중복 확정 방지·preset 전환 Undo 확인. 새97파일 후보는 독립 사본으로 동결 | 새97 후보 실제 화면 검수 진행 중. 실제 drag·키·저장/출력·Undo 및 표지 로고 맞춤 계약은 남음. 기존93 후보의 수락 범위 밖 |
| 빈 인용/안내/단계의 Backspace | 인용 cover alias 신규2, 안내 focus helper19/default3; kernel120d9cca의 빈 단계 제목 offset0 해제 구현 및 focused12(9 pass + 잘못된 기대 수정 후3 pass) | 본문·이미지·metadata·번호·caret·한 Undo/Redo의 실제 키 수락; 자동 분할 논리 가족의 보호는 유지 |
| 제목 없는 안내 | 공개 Core의 optional title 및 wrapper, body focus plugin·명시적 제목 편집 UI 연결 | 빈 제목 공간·본문 입력·명시적 제목 편집·Undo 실제 수락 |
| 표 셀 드래그·행/열 선택 | 셀 범위4/4 native 관찰; 행/열 portal의 DOMRect 좌표 누락을 찾아 explicit fields로 수정하고 회귀 검증 | 수정 후 실제 버튼 표시/선택, 내용 보존·Undo |
| 표 열 너비·행 최소 높이 | persisted layout/resize/Print 연결 및 신규 행열 상속·clear/type/paste seam focused 검사 | 리사이즈·재열기·인쇄·한 Undo의 현재 후보 실제 검수 |
| 표 셀 방향키 | 일반 cell ArrowDown의 native fallback gap을 찾아 kernel eba865/helper f075487 후보로 table-aware 이동을 연결; 담당 focused11 green 보고 | 같은 열 이동·여러 줄 마지막 줄·마지막 행·IME/readonly/range 가드의 실제 키 수락 |
| 일반적인 파일 열기/저장 | `.manual.json`, bound handle Save/SaveAs/Open caller와 FileSession mock 검사; IDB CAS는 보조 | 실제 OS picker·권한·디스크 쓰기/재열기와 취소/실패·추가 입력 dirty 보존 |
| LDS 표지·출력 일치 | 이전90파일/e3d308 후보의 본문16·제목 margin0·gap16·문단 폭663.4375 확인. 새93 후보에서 홀수 정보 표의 actual2cells·colspan3·80%·전체130px/마지막56px가 Editor/Print에서 같고, A→cover→B의 ID·본문·종이 크기를 독립 DOM/이미지 대조 | 새 이미지 크기/로고 맞춤 계약의 출력 검수는 별도. 실제 편집·OS 출력 gate는 이 읽기 검수로 대체하지 않음 |
| 일반 페이지 출력 여백 | 이전 후보의 padding0 원인을 CSS7ca에서 안쪽 `.manual-v2-print .lds-manual` alias로 수정. 새93 후보의 실제 DOM 대조에서 본문650.578125px·표648.578125px·종이 기준 왼쪽 inset·제목 아래 gap24px가 양쪽 같고 weighted/unweighted 폭·비율·layout도 동일 | 새 이미지 크기 후보의 영향만 증분 검수. 실제 OS 출력 수락은 별도 |
| 긴 문서·A4 분할·서식·복사·저장 보존 | 기존 exact 후보의 분할·range·marks·파일 왕복 근거 재사용 | 새 cover/table 계약에 영향을 받는 연결 seam만 증분 판정; OS IME·clipboard·출력 환경은 미수락 |
| 중첩 번호 목록 | 편집 CSS에 2단계 lower-alpha·3단계 lower-roman 규칙 존재 | 실제 Tab/ShiftTab·marker·Undo와 Print 일치. Print 일반 ol에는 같은 규칙이 없어 새 후보에서 수정·증분 검수 필요 |
| 목차 행 높이·수직 균형 | 현재 source는 flex 중앙 정렬과 동일 padding, 과거 화면 근거는 역사 기록에 보존 | 한 줄 빈제목·두 줄 제목의 행 높이와 번호/제목/ellipsis 중심선의 현행 표시를 대조 |
| 간결한 작업 메뉴·LDS 검색창 | compact 작업 메뉴와 긴 삽입 메뉴를 구분하며 공개 Input sm을 사용한 과거 검수 보존 | compact 메뉴의 검색/닫기/아이콘 박스 없음과 긴 메뉴의 입력/focus를 현재 종류별로 확인 |
| LDS 색상·상시 상태와 설명 제거 | 공개 semantic token 사용 및 정상 상태의 영구 저장 상태 제거 구현 | 정상/hover/focus/error 실제 토큰 표시와 불필요한 페이지 이동·보관 설명이 없는 현행 화면 확인 |

근거 파일은 각 후보의 full SHA와 검사 범위를 포함한다. 현행 source가 변경되면 과거
후보의 결과를 소급하지 않고 변경된 seam에 대한 증거를 추가한다. 이 점검에서 직접
읽은 신규 근거는 다음과 같다.

일반 페이지 제목·도입문 블록화의 pure projection 초안 `af5077c7` 독립 읽기 검수에서,
저장된 역할 ID와 `usedIds`가 충돌하면 새 ID를 할당하면서 기존 `layout.order`의 위치를
놓치는 반례를 발견했다. `[본문 A, 제목, 본문 B]`가 `[본문 A, 본문 B, 제목]`으로 바뀔 수
있어 모델 담당에 역할 ID 재할당 매핑과 좁은 회귀 검사를 요청했다. 수정 projection
`aaded8d7`은 alias로 저장 순서를 보존한다. kernel26897445/test686bcef1의 실제
공용 명령10검사(`exec-c7699d6c`, 122.9ms)와 공개 ordered 페이지의 실제 React SSR1검사
(`exec-5e06e1ee`, 58.2ms)가 통과했다. 독립 읽기 감사에서 충돌 후 순서·foreign payload,
선택·이동·복제·외부 페이지 역할 해제·삭제·빈 페이지 입력·형식 변환·doc와 선택의
Undo/Redo·파일 왕복·합성 자동 분할의 ID/caret 보존 assertion을 확인했다.
실제 DOM drag·키보드·브라우저 자동 분할·OS 파일 저장 수락은 별도다.
모델 구현 사본 `title-blockification-stage-20261008/model-boundary.json`은
Parent/Print 최종 검사 전의 부분 사본이다. root가 99개 고유 파일의 사본 해시 불일치0을
확인해 모델 writer의 로고 후속 작업을 분리했다. 전체 후보 공개나 화면 수락으로 사용하지
않는다. 결과는 `/tmp/lds-manual-title-model-boundary-root-audit-20261008.json`이다.
이후 모델 자체 감사에서 문서 복사 시 owned layout의 제목·도입문 roleIds가 갱신되지
않아 원본·복사본 runtime ID가 겹치는 잔여 결함을 발견했다. 기존 10검사의 복사 case는
ID 집합 분리 assertion이 없었으므로 이를 완료 근거로 확대하지 않는다. 담당이 해당
assertion을 보강한 동일 복사 case는 실제로 실패(`exec-105afb89`)했다. owned layout의
역할 ID를 복사 ID map에 추가한 뒤 그 case1만 재검증해 통과(`exec-9764f911`, 81.6ms)했다.
root가 원본·복사본 title/lead ID 불일치, role pageId·저장 순서, standalone clipboard의
역할 해제·새 ID·내용 보존 assertion과 소스 수정을 직접 읽었다. 이 delta는 전체 TITLE
사본에도 반영해야 하며, 과거 부분 사본의 99해시 일치가 수정 포함 증거를 대신하지 않는다.
최종 TITLE99 사본은
`/tmp/lds-manual-visual-fix-verification-20261007/title-blockification-freeze-20261008/manifest.json`이다.
root의 99개 고유 파일 대조에서 사본 해시 불일치0이며 projection8d9bfb1d/v2efd8cbbc에
복사 ID 수정이 포함됐다. Parentdb6b/Printb092/CSSa882와 모델kernel2689/public1b87은
해당 사본의 고정 코드다. 다음 로고 구현의 현행 코드와 섞어 수락하지 않는다.
Parent6·Print6·physical tail1·numeric caller1의 보고를 직접 읽었고, numeric1의 실행
전후 dependency tuple과 실제 Parent 함수/PM transaction·preset/Undo assertions를 확인했다.
이1검사로 과거 Props12의 미기록 dependency 전체를 소급 수락하지 않는다.

표지 로고의 맞춤 폭 모델은 kernelb22128/projection556aa/figurelayout354932/public414d1
후보에서 추가됐다. 실제 모델4검사(`exec-e7cb1b0f`, 100.7ms)와 공개 컴포넌트 React SSR1
(`exec-0ea4958b`, 63.5ms) 출력을 직접 읽었다. 독립 소스·assertion 감사에서 bound scalar,
ID·자산 bytes·doc와 선택/stored marks·한 Undo/Redo·맞춤폭 저장 재확장·reset exact DTO·
foreign/owned future payload·stale/readonly/IME/cancel·일반 복제/외부 이동 시 폭 보존을
확인했다. bound 로고 fixture에는 crop이 없으므로 crop 보존 수락으로 확대하지 않는다.
기본35mm는 기존 CSS 계약이며 실제 표시 크기 측정은 남음. Parent/Props/overlay/Print/CSS
연결과 새 후보의 실제 화면 검수는 진행 중이며 TITLE99 수락과 분리한다.
후속 Parentb3b888/Printd430aa/overlayc54ba6의 caller7·SSR4·overlay2 보고와 assertion을
읽은 독립 감사에서 새 확정 blocker는 없었다. 이 fixture는 custom 로고이며 builtin
공식 로고의 실제 로딩은 검사하지 않는다. pointer caller는 commit 직접 호출, overlay는
getter형 DOMRect mock이고 hit24/visual10은 소스 패턴 검사다. 기본35mm·실제 표시 크기와
조작 전체는 새 실제 화면 검수와 입력 격리 후 조작 검수에서 확인해야 한다.
로고 Props 후속 검사에서는 `/tmp`의 bare PM import가 해결되지 않는 환경 오류 뒤,
selection exact 비교 실패(`exec-ae0db25c`)가 나왔다. root는 PM CJS/ESM 클래스 중복과
실제 선택 복원 결함을 구분하도록 공개 선택 명령을 통한 fixture·전후 type/ID/range 진단을
요청했다. 원인 확정 전 합격 처리하거나 selection assertion을 약화하지 않는다.
후속 독립 감사에서 script의 PM `exports['./state'].import`를 사용한 같은 ESM 경로 수정을
확인했다. 선택 assertion을 유지한 새2검사가 통과했으며, 실행 manifest492fec9a의
165파일 관측 SHA/loadedSourceSHA·실행 후 changedDuringRun=[] 근거를 읽었다.
숫자 확정 뒤 selection.eq, reset Undo의 doc.eq+selection.eq·한 transaction·scalar/ID·
합성 자산 codec exact를 검사한다. 이 script의 Undo는 reset→직전 custom 복원이며,
숫자 설정→최초 문서 Undo까지 직접 검사한 것으로 확대하지 않는다. 실제 React 이벤트·
Parent descriptor·native·IDB·OS 파일 수락은 별도다.
최종 로고 후보는
`/tmp/lds-manual-visual-fix-verification-20261007/logo-resize-freeze-20261008/manifest.json`이다.
99개 고유 파일·19개 핵심 pin의 사본 해시 대조에서 불일치0을 확인했다.
`/tmp/lds-manual-logo99-root-archive-audit-20261008.json`은 동일성 근거이며,
공식 로고 actual loading·기본35mm·맞춤폭 Editor/Print·중첩 번호 목록 표시는 실제 검수
완료 전 수락하지 않는다. CSSc46d의 추가2규칙은 Print wrapper 경로에 맞춰 2/3단계
alpha/roman을 적용하며 procedure counter/start를 바꾸지 않는다. 이 소스 검사는
`/tmp/lds-print-nested-list-css-checks.json`이며 실제 Tab/ShiftTab 수락과 구분한다.
추가 helper·합성 A4 경계 반례에서 로고 확대로 뒤따르는 표지 제목/표/본문이 footer를
넘을 수 있음을 발견했다. 기존 bounds는 현재 미디어·캡션만 제한하고 뒤 콘텐츠 공간을
공제하지 않았다. 개발 담당이 표지 콘텐츠 끝과 footer 사이 여유를 반영하는 좁은 helper
수정과 회귀 검사를 진행 중이다. 로고99 사본의 치수 표시 수락으로 이 결함을 덮지 않는다.
helper4b85d7c8의 같은 actual-export 합성 반례는 기존 overflow526.2393px에서 수정 후0으로
줄었고 preview에서 미디어·자연 콘텐츠가 함께 커져도 cap이 유지됨을 검사했다.
`cover-following-content-fixed-20261008.json`과 독립 소스 감사로 확인했다. 실제 caption
줄바꿈·뒤 콘텐츠 DOM·pointer·출력까지 이1검사로 수락하지 않는다.

LOGO99 실제 읽기 보고 `logo99-readonly-result.json`과 원본 `logo99-consumer-pair.json`을
읽었다. 공식 자산 complete·natural300×38·동일src, 기본35mm 표시132.28125×16.921875와
맞춤180×23.015625, 종이 inset49.125·제목 gap20이 Editor/Print에서 같았다.
root의 12비교 결과는 `/tmp/lds-manual-logo99-root-dom-audit-20261008.json`이다.
중첩 목록 marker decimal→lower-alpha→lower-roman·start2·mixedUL/하위OL은 같지만,
ordered list의 단계별 들여쓰기는 Editor40px/Print24px로 달라 별도 미완료다.
public 일반 ol에는 해당 inset 규칙이 없으며 Print24는 Manual alias다. 공용 스타일을
바꾸지 않고 편집·출력의 Manual 목록 inset을 맞추는 최소 수정을 배정했다.

TITLE99 실제 저장 DOM/AX/hover 자료의 root 독립 대조는
`/tmp/lds-manual-title99-root-dom-audit-20261008.json`이다. 제목·도입문 ID/역할 순서·
문자열·4역할 rail/추가 경로·24px hitbox·BODY focus가 일치했다. 단계 이미지의
step 기준 inset24px·제목 아래 gap4px·미디어240×120px가 Editor/Print에서 같아
이전 위치 차이는 이 후보의 읽기 검수 범위에서 해소됐다. 절차 전체 innerText에는
Print의 DOM 번호와 Editor의 CSS counter 차이가 있어 실제 제목·캡션을 따로 비교했다.
실제 메뉴 클릭·선택·이동·삭제·Undo 수락으로 확대하지 않는다.
TITLE99 최종 읽기 보고 `title99-readonly-result.json`은 1회303ms build와 사본 모듈57개
사용을 기록한다. 기본·이동한 title/lead·삭제 제목·빈 제목 상태를 미리 담은 fixture의
순서·위치·PrintReady/issue0·BODY focus를 수락했다. 실제 삭제 명령을 수행한 것은 아니다.
빈 제목 상태의 인쇄에는 16px 남색 띠가 남아 `title99-empty-print.png`를 직접 확인했고,
비어 있거나 공백뿐인 bound title의 장식·전용 여백을 출력에서 숨기는 최소 수정을 배정했다.
편집 placeholder는 유지하며 일반 heading·내용 있는 제목·명시적으로 삭제된 역할을
구분한다. 이 시각 후속은 source/SSR 및 새 실제 empty1 결과 전까지 미완료다.
후속 Printbae029의 SSR4 보고·assertion을 읽은 독립 감사에서 정확한 role binding의
empty/공백+marks/hardBreak-only 제목 H2 생략과 ID/역할 wrapper 유지, nonempty/foreign
ordinary heading·lead·표지 제목 경로 보존을 확인했다. CSSa008ab86 시점의 전용 gap은
실제 H2가 있는 wrapper의 `:has`에만 적용되어 빈 wrapper에 적용되지 않는다.
이 markup 검사는 computed CSS 간격과 실제 인쇄 화면의 빈 띠 제거를 증명하지 않는다.
후속 세 수정의 고정 후보는
`/tmp/lds-manual-visual-fix-verification-20261007/visual-followup-freeze-20261008/manifest.json`이다.
root의 99개 고유 파일·19개 핵심 pin 사본 대조에서 불일치0을 확인했고,
`/tmp/lds-manual-visual-followup99-root-archive-audit-20261008.json`에 기록했다.
LOGO99에서 Print/CSS/helper 세 파일만 바뀐 후보이며 브라우저 검수는 새 턴으로 재개됐다.
빈 제목의 실제 16px 띠와 별개로 전용 spacing 선택자 정리를 새 회귀 수정으로 단정하지
않는다. 새 화면 근거 전에는 빈 띠·목록 inset·실제 표지 footer 경계 수락을 보류한다.
후속 실제 읽기 보고 `followup99-readonly-result.json`은 사본99의 1회321ms build·모듈57개
사용을 기록한다. root가 원본 Editor/Print DOM의 8비교를 수행해 빈 Print 제목 H2 없음·
ID wrapper 유지/height0·첫 본문 margin-top0·종이 y49.125와 목록 단계별 inset/padding24를
확인했다. 결과는 `/tmp/lds-manual-followup99-root-dom-audit-20261008.json`이다.
편집 placeholder42px는 유지된다. 표지 DOM의 natural content 끝757.140625와
20mm footer reserve/종이 하단도 측정했지만 resize preview·확정·caption wrap은 수행하지
않았으므로 실제 확대 경계 수락으로 확대하지 않는다.
남은 목차·메뉴·색상·경계의 기존 증거 매핑은
`/tmp/lds-ui-remaining-visual-evidence-map-20261008.md`에 합쳤다. 예전 4작업 메뉴 화면은
현재 복제/삭제 2작업 메뉴 수락으로 승계하지 않는다. 페이지 메뉴 열기는 편집기 선택
명령을 호출하지 않는 비편집 경로로 판정해 열린 상태 읽기 검수를 추가하되, 검색 입력에
자동 포커스가 가는 긴 메뉴는 입력 격리 제한 때문에 미수락이다.
목차 두 줄 제목은 navigate의 baseline 정렬로 번호와 외부 ellipsis의 중심이 달랐다.
원래 수직 균형 요청에 맞춰 center 한 속성 수정과 한 줄/두 줄 항목의 rect 대조를 배정했다.
UI chief는 읽기 감사, 구현 chief의 단일 CSS writer만 수정하며 후속99 사본과 분리한다.
동일 FOLLOWUP99 추가 메뉴 읽기에서 compact 복제/삭제2행·192×82px·행174×32px·Input0,
문서 제목/HTML/공개 DOM 선택 불변·비편집 menu focus를 확인했다. root의 9비교는
`/tmp/lds-manual-followup99-menu-root-audit-20261008.json`이다. 메뉴 실행·닫기 focus 복귀는
확인하지 않았다. 표지 메뉴의 복제가 활성 상태였지만 커널 duplicate의 dry-run은 true,
pageProtection은 두 번째 cover transaction을 거절하는 사용 가능 판정 불일치를 발견했다.
데이터 손실로 단정하지 않으며 기존 표지1개 제한을 can/메뉴에도 반영하는 guard와
일반 페이지 복제 보존의 좁은 검사를 배정했다. 새 표지 복사 형식으로 범위를 확대하지 않는다.

후속 kernel08d077d1은 cover 복제를 can/실행 모두 false로 반환하여 dispatch 전에 차단한다.
모델 담당의 신규 focused2 통과 보고(81.412ms)와 실제 테스트 소스를 root가 대조했다.
schema의 canReplaceWith=true 반례에서도 dispatch0이며, 강제로 만든 두 번째 표지 transaction은
기존 pageProtection이 transactions0으로 거절한다. 일반 페이지는 dispatch1·새 page/body/title ID·
inline marks/vendor extensions 보존과 한 Undo/Redo의 문서·선택 완전 복원을 검사한다.
근거는 `apps/editor/tests/redesign-cover-duplicate-guard.test.mjs`(796a4604)이며,
이 결과를 새 후보의 실제 표지 메뉴 disabled 표시 수락으로 확대하지 않는다. 해당 화면 검수는 남아 있다.

목차 정렬 OUTLINE99의 root 독립 사본 점검은 99개 고유 파일 모두 hash 일치·issues0이다
(`/tmp/lds-manual-outline99-root-archive-audit-20261008.json`). 이전 FOLLOWUP99와 CSS를 직접
비교해 navigate의 align-items:baseline→center 한 속성 변경임을 확인했다. 실제 한 줄·제목 없음·
두 줄의 중앙 및 높이 측정은 sole QA에서 진행 중이며, 이 사본 점검만으로 화면 수락하지 않는다.

상단은 FOLLOWUP99의 실제 캡처 `followup99-empty-list-editor.png`를 root가 직접 열어 확인했다.
문서명 왼쪽, 오른쪽 투명 배경 저장 아이콘·문서 메뉴, Manual/파일 고정 항목 없음이 보인다.
해당 파일은 `/tmp/lds-manual-a4-boundary-qa-3_ygynq6/`에 있다. 과거 header126 후보의
390/760/1280 근거를 현재 후보 검수로 혼동하지 않는다. 원래44589 사용자 탭 runtime 반영은
아직 확인하지 않았으며 강제 reload·원문 변경·다른 세션의 CUA 권한 우회를 하지 않는다.

OUTLINE99 raw before/after를 root가 직접 비교했다. 제목 없음·한 줄·두 줄 각각에서
number/title/ellipsis의 세로 중심이 row와 정확히 같고, 행 높이는 42/42/60px,
navigate padding은 12px 8px이다. HTML 불변·BODY focus·PM focus0도 확인했다
(`/tmp/lds-manual-outline99-root-dom-audit-20261008.json`). 중앙 정렬은 확인했으나,
사용자의 제목 없는 항목 높이 축소 요구를 이것만으로 완료 처리하지 않는다.
42px의 compact 목록 적절성은 기존 LDS 근거를 재사용해 UI/구현 담당이 별도로 평가한다.

sole QA의 최종 `outline99-readonly-result.json`은 1build 370ms·loaded57 전부 OUTLINE99
사본 사용, console0·public selection 불변·owned66 종료를 기록한다. UI 독립 검수도
`outline99-three-rows.png`와 raw를 직접 확인해 두 줄 번호의 수직 균형을 수락했다.
비활성 두 줄 ellipsis는 opacity0인 layout box 측정이므로 hover 화면 수락으로 확대하지 않는다.
후속 COVERGUARD99 root 사본 점검도 99개 고유 파일 hash 일치·issues0이다
(`/tmp/lds-manual-coverguard99-root-archive-audit-20261008.json`). 실제 표지 메뉴 비활성 표시
검수는 별도 진행 중이다. 입력 격리·긴 검색 메뉴·native move/delete/Undo/resize·OS 파일 검수는 남아 있다.

COVERGUARD99 actual `coverguard99-readonly-result.json` 및 raw before/after와 PNG를 root가
확인했다. 표지 메뉴 복제 BUTTON은 disabled=true/aria-disabled=true, 삭제는 enabled,
input0·PM focus0·HTML 불변이다. root 비교는
`/tmp/lds-manual-coverguard99-root-dom-audit-20261008.json`이며, sole QA는 build310ms·
loaded57 전부 새 사본·console0·owned67 종료를 기록했다. 이것은 사용 가능 표시의 수락이며
실제 메뉴 action·닫기 focus·Undo 수락은 아니다.

별도 completion audit에서 Parentb3b8880d의 예약 focus 경로를 발견했다. command의
microtask→RAF는 view identity만 검사하지만 installRecord는 동일 view를 재사용하며
generation을 증가시킨다. closeBlockMenu의 RAF도 generation/modal/readonly 검사가 없다.
따라서 이전 문서의 예약 callback이 문서 교체나 dialog 뒤에 실행될 가능성을 source로 확인했다.
실제 native 재현으로 확대하지 않으며, 두 callback의 generation/live focus eligibility fence와
문서 교체·dialog·readonly·정상 복귀의 좁은 callback 검증을 Parent 단일 writer에 배정했다.

동일 Parent의 deferred focus 호출을 root가 추가로 대조했다. closeModal662와
inspector onClose691도 RAF에서 current view를 무조건 focus하므로 동일 scheduler guard를
재사용하는 수정 범위에 포함했다. newDocument263에는 generation 검사가 이미 있어
live modal/busy eligibility만 검토 대상으로 전달했다. locate306의 scroll callback을
포커스 결함이라고 확대하지 않는다. 명령·메뉴 닫기·dialog/inspector 닫기의 정상 복귀를
유지하면서 문서 교체 뒤의 오래된 callback을 막는 것이 수락 조건이다.

목차 높이 수정의 현행 CSS는 navigate padding을 --space-1-5/--space-2로, min-height를
32px로 바꿨다. root는 LDS Core `tokens/spacing.css`의 --space-1-5=6px 및
`DropdownMenu.jsx` compact의 minHeight32/paddingY6/label2-line과 직접 대조했다.
이는 코드 반영 확인이며 새 실제 row32/32/48px·중앙 검수 수락은 아니다.
기존 OUTLINE99의 42/42/60px 결과와 새 수정 후보를 혼합하지 않는다.

Parent0d879e4c는 deferredFocusEnabled/scheduleFocus를 공통으로 연결했다. captured editor와
generation을 검사한 뒤 uiApi.current의 최신 gate를 읽으며 modal/menu/busy/print/replacement/
recovery/readonly/IME/DOM 연결 상태를 차단한다. root는 실제 함수와
`/tmp/lds-manual-visual-menu-fix-20261007/deferred-focus-focused-20261008.mjs`를 직접 대조했다.
현재 22-case 보고는 Parent 함수 추출·plain editor stub·결정적 microtask/RAF queue 검사이며
실제 PM 런타임이나 native focus 검사가 아니다. 재렌더 뒤 uiApi gate closure 교체의 작은
검사를 보강하도록 전달했다. 유효 command·outline return target·removed-target editor fallback·
modal/inspector 닫기 복귀를 유지하는 조건도 테스트에 포함된다.

최신 uiApi gate closure를 교체하는 pure callback 신규2 통과 보고와 해당 스크립트를
root가 대조했다(`deferred-focus-live-closure-20261008.mjs`). 예약 당시 상태 대신 실행 시점의
새 false gate는 focus0, 새 true gate는 focus1이며 실제 PM/native 검사는 아니다.
기존22 검사를 중복 실행하지 않았다. Parent0d879e4c/CSSabbf4ef2 두 변경을 포함한
`focus-compact-outline-freeze-20261008/manifest.json`은 root 사본 점검에서 99개 고유 파일
hash 일치·issues0이다(`/tmp/lds-manual-focuscompact99-root-archive-audit-20261008.json`).
새 후보의 실제 목차32/32/48 높이·중앙 검수는 sole QA에 인계됐으며 아직 미수락이다.

후속 actual `focuscompact99-readonly-result.json`과 raw before/after·PNG를 root가 대조했다.
제목 없음/한 줄/두 줄 행 높이는32/32/48px, 제목18/18/36px, padding6px8px,
ellipsis28px이며 모든 세로 중심이 같다. 제목 scrollHeight=clientHeight로 잘림이 없고
HTML 불변·BODY·PM focus0를 확인했다. root 비교는
`/tmp/lds-manual-focuscompact99-root-dom-audit-20261008.json`이다. sole QA는 1build347ms·
loaded57 전부 새99 사본·console0·owned68 종료 및 box 내부배치/clipping0를 기록했다.
목차 높이 축소와 정렬은 이 범위로 수락한다. Parent의 native focus 복귀·IME·키·드래그와
원본44589 반영·파일 저장은 확인하지 않았으며 callback22+2를 해당 수락으로 확대하지 않는다.

UI 잔여 색상 평가에 따라 안전한 후속2 상태를 UX→sole QA에 배정했다. 기존 compact 메뉴의
비편집 hover computed 배경/글자와 resolved LDS token 대조, 그리고 독립 memory entry의
공개 fileSessionFactory onStatus(error)/onError(save) 콜백으로 실제 Parent390 오류 상태와
alert layout/negative token을 확인하는 범위다. root는 Parent167~168의 공개 callback이
status/notice를 갱신함을 읽었다. 실제 저장·capture·파일·IDB·PM·원탭 조작은 하지 않는다.
callback 안전 경계는 UX가 확인한 뒤 인계하며, 오류 UI 표면 근거를 파일 저장 기능 수락으로
확대하지 않는다. focus-visible의 실제 키와 backupConflict의 내부 상태 진입은 여전히 미확인이다.

hover99 실제 raw를 root가 비교했다. 복제/삭제 각각 hover=true·enabled, 배경RGB112/115/124와
resolved --component-menu-item-hover-bg #70737c14가 일치하며 CSSOM alpha0.08의 차이는
8-bit alpha 한 단계보다 작다. 일반 글자 #171718, 삭제 글자 #a82727도 해당 semantic token과
정확히 같다. HTML 불변·PM focus0이며 root 비교는
`/tmp/lds-manual-hover99-root-token-audit-20261008.json`이다. 새 build0·기존3행 fixture 재사용,
owned69/70 종료 기록을 확인했다. 처음의 단일 본문 fixture는 삭제가 비활성이어서 제외하고
호버 수락에 사용하지 않았다. 색상 비교만 수락하며 실제 메뉴 실행·키 focus·저장 오류390은 남아 있다.

공개 adapter390의 boot baseline/saving/error raw와 error PNG를 root가 직접 대조했다.
390×844에서 header actions/status/저장·문서 메뉴와 alert/message/재시도·닫기 rect가
viewport 내부이며 HTML/IDs 불변·BODY·PM focus0·dialog0이다. adapter open/save/saveAs/
loadDocument/saveDocument 호출0도 확인했다. root 비교는
`/tmp/lds-manual-adapter390-root-layout-audit-20261008.json`이다. 이는 합성 onStatus/onError에
대한 실제 Parent 화면 배치 근거이고 실파일 저장·mutex·복구 충돌·재시도 동작 수락은 아니다.
오류 색상 token 대조와 최종 source tuple/cleanup 보고는 아직 회수 중이다.

최종 adapter390 보고는 build352ms·loaded57의 기존 FOCUSCOMPACT99 tuple 일치·console0·
owned71 종료·viewport 복구를 기록한다. root는 raw의 오류 색상과 token을 독립 계산해 대조했다.
surface red14%/transparent, border red38%/#70737c38의 premultiplied alpha 및 text#a82727은
각 computed 값과 1e-6 이내로 일치한다
(`/tmp/lds-manual-adapter390-root-token-audit-20261008.json`). 저장 상태·오류 안내390 배치와
negative 색상은 공개 adapter UI 표면 범위에서 수락한다. pre-close dispose0에서 cleanup 호출을
추론하지 않았고, owned tab 종료로 timer/context가 끝난 근거만 사용한다. 실제 저장 상태는
adapter contract상 unbound/saving:false이므로 파일 저장·mutex·dirty·재시도·복구 충돌 검수로
확대하지 않는다. 실제 focus-visible/IME/키·포인터 편집·OS 파일·원44589 반영은 남아 있다.

최종 블록화 코드 후보는 `/tmp/lds-manual-visual-fix-verification-20261007/blockification-final-freeze-20261008`이다.
총괄이 manifest의 93개 파일을 보관본·현행 소스와 직접 SHA 대조했고 누락·불일치0이었다.
결과는 `/tmp/lds-manual-blockification-freeze-root-audit-20261008.json`이다. 이것은 후보의
동일성 검사이며 화면·기능 수락이 아니다. Parent121e0d86의 새 드래그 caller 검사2 및
기존 single3 재사용, HTTP200 제공 근거는
`/tmp/lds-manual-visual-menu-fix-20261007/cover-header-drag-served-20261008.json`에 기록됐다.

이93 후보의 `final-middle-editor.json`·`final-middle-print.json`과 인쇄 전체 이미지를
총괄이 직접 읽었다. 본문 A→표지→본문 B의 ID·순서, 인쇄 footer를 제외한 각 페이지
본문, 종이793.6875×1122.515625px, 중복 ID0·BODY focus·로고 로드,
printReady=true/issues0을 독립 비교로 확인했다.
`/tmp/lds-manual-middle-cover-root-readonly-audit-20261008.json`은 저장된 DOM 자료의
비교 결과이며 실제 편집·OS 인쇄 수락은 아니다. 셀 폭·여백·손잡이 hitbox는 별도
측정 자료를 기다리며 이 순서 결과로 대신하지 않는다.

후속 `final-cover-editor-initial.json`·`final-cover-print.json`·`final-five-role-hovers.json`을
직접 비교했다. 정보 표693.4375×130px, 마지막 실제2셀·값 colspan3/80%·행56px가
편집/인쇄에서 같았다. 다섯 role의 손잡이·추가 버튼은 실제 경로와 일치했고 hitbox24×24px,
BODY focus·editor HTML 불변이었다. 독립 비교 결과는
`/tmp/lds-manual-blockification-geometry-root-audit-20261008.json`이다. 클릭·선택·이동·Undo
수락으로 확대하지 않으며 일반 페이지 여백은 해당 자료로 별도 판정한다.

새 이미지 후보와 함께 확인할 명시적 행 높이 fixture는
`/tmp/lds-manual-middle-cover-row72-20261008.manual.json`이다. 실제 PM의 공용
`setManualTableRowHeight`로 홀수 정보 표 마지막 행의 최소 높이72px를 설정하고,
파일 codec 왕복에서 문서 일치를 확인했다. 새97 후보의 실제 저장 DOM 대조에서
Editor/Print 마지막 행72px·전체 표146px·마지막 셀 colspan1/3·폭138.6875/554.75px와
내용이 같았다. 독립 결과는 `/tmp/lds-manual-image97-row72-root-audit-20261008.json`이다.
제목 없는 안내도 Editor의 제목 display:none/Print의 제목0개와 본문 일치를 확인했다.
실제 resize·Undo·파일 재열기·OS 출력 수락으로 확대하지 않는다.

이미지 후보의 독립 사본은
`/tmp/lds-manual-visual-fix-verification-20261007/image-resize-freeze-20261008/manifest.json`이며,
root의 97개 고유 파일 해시 대조에서 불일치가 없었다.
`/tmp/lds-figure-width-inspector-check-20261008.json`의 12검사 assertion을 독립적으로 읽어
최초 편집 callback 고정·stale 거절·단위 변환·한 transaction·Undo 문서 일치를 확인했다.
hook lifecycle과 geometry는 합성 환경이며 실제 React focus/blur와 Undo 선택 복원은
증명하지 않는다. 해당 보고의 Parent/Props 해시만으로 실행 당시 kernel/layout dependency까지
동결 후보와 일치했음을 단정하지 않으며, 실행 근거 보강 여부를 별도로 확인한다.

새97 후보의 저장된 실제 편집 DOM `image97-editor.json`과 `image97-editor-top.jpg`를
root가 대조했다. 일반240px·잘라낸241.5px·단계 내부240px·표지 본문240px의 폭과
미디어 비율2:1, 캡션의 동일 폭·미디어 아래 배치가 모두 일치했다. BODY focus와
편집기 미포커스를 확인했으며, 미선택 상태의 손잡이0은 선택·drag 수락 근거가 아니다.
독립 결과는 `/tmp/lds-manual-image97-editor-root-audit-20261008.json`이다.
이어 저장된 `image97-print.json`과 대조한 결과 일반·잘라낸 이미지는
종이 기준 위치까지 같았지만 단계 내부 이미지는 달랐다. 표지 본문 이미지의 편집
자료에는 종이 ancestor rect가 없어 종이 기준 위치 일치 판정을 유보한다. 앞선 root의
표지 본문 위치 일치 표현은 이 근거보다 넓었으며 크기·비율·캡션 일치로 한정한다.
단계 이미지의 종이 기준 왼쪽 위치는
Editor101.984375px/Print295.265625px, 위쪽 위치는177.125px/185.125px였다.
단계 자체 폭과 이미지 폭은 같으므로 크기 수락을 배치 일치 수락으로 확대하지 않고,
개발 담당에 중첩 단계의 정렬·여백 연결 수정을 전달했다.
IMAGE97의 최종 읽기 보고는
`/tmp/lds-manual-a4-boundary-qa-3_ygynq6/image97-readonly-result.json`이다.
1회371ms build·고정 사본 모듈55개만 사용했으며, 네 이미지의 폭·비율·자산·캡션과
row72를 수락했다. console error0·PrintReady true·issues0·scroll 후 editor HTML 불변이다.
표지 본문 위치는 ancestor rect 누락으로 유보하고, 단계 내부 배치 차이는 알려진
미완료로 유지한다. 자료 수집의 page=null 및 문자열 `'0'` 판정 오류는 수정된 보고 범위를
읽어 확인했으며 제품 실패나 새로운 브라우저 실행 근거로 사용하지 않는다.

가운데 표지 순서 검수용 `/tmp/lds-manual-blockification-middle-cover-20261008.manual.json`
(SHA256 `df664475cf9e5515d39d91882f5a4e19740daecfee4ea50158f288f106847afe`)은
본문 A→표지→본문 B, 문서 정보 5항목 및 기존 표지 자산·블록을 담는다. 공개 순서 helper와
파일 codec으로 순서·문서·자산의 왕복 일치를 확인했다. 이 결과는 검수 fixture 준비 근거이며,
실제 편집/출력 DOM·포인터·키보드 수락은 아니다. 결과는
`/tmp/lds-manual-blockification-middle-cover-20261008-result.json`에 기록했다.

홀수 정보 표의 첫 focused 실행은 14개 중 10개 통과·4개 실패였다. 실패한 4개만
재검증한 `exec-c7579106`은 4개 통과·0개 실패(122ms)였다. 계산된 30% 값의 약
4e-15 오차와 테스트 DOM의 숫자 attribute 반환을 보정한 결과다. 독립 소스 검토에서
계산된 열 비율의 오차 허용과 별도의 문서·파일·PM exact 비교가 함께 유지됨을 확인했다.
이 좁은 후속 결과를 이후 header-routing 변경이나 최종 통합 후보의 전체 수락으로 확대하지 않는다.
clipboard 검사의 부족한 비교를 보강한 test79744b93은 실제 PM DOMSerializer→DOMParser와
붙여넣기 정규화를 사용한다. label/value·strong/underline marks·순서·빈 padding·원본과
복사본 ID 분리·일반 DTO 왕복 assertions를 직접 확인했으며, 해당 1개만 실행한
`exec-422c20c8`은 통과(110ms)했다. 사용한 DOM은 합성 환경이며 실제 브라우저·OS clipboard
수락은 이 보강과 별도다.

- `/tmp/lds-manual-a4-boundary-qa-3_ygynq6/header-frozen-native-result.json`
- `/tmp/lds-manual-visual-fix-verification-20261007/cover-source-integration-review.json`
- `/tmp/lds-manual-visual-fix-verification-20261007/cover-duplicate-reload-gap-result.json`

위 source/model 결과는 browser native 또는 OS 파일 저장 완료 증거가 아니다.
현재 합성 편집기에 외부 입력이 혼입된 관찰 때문에 문서 변경/키 입력/Undo native는
입력 격리가 확인될 때까지 보류한다. 읽기 전용 시각 검수와 독립 모델 수정은 계속한다.

추가 감사에서 정식 파일 열기의 원문서 ID 보존과 보조 보관함의 최초 revision=null이
겹치면, 기존 보관함의 같은 ID와 충돌할 수 있는 source 조건을 발견했다. 실제 사용자
출처의 원인으로 확정하지 않는다. 정식 파일 저장을 막지 않는 조건에 더해, 정상적인
파일 열기·저장에서 보조 CAS 충돌 복구를 반복 요구하지 않는 동선이 필요하다.
저장 담당이 기존 복구본을 덮어쓰지 않는 별도 복구 identity와 예외 복구 계약을
구현했다. 실패 시 현재 메모리 내용·자산·file dirty·연결 handle을 보존해야 한다.
helper6be33e5a/Parent98d5b83c의 source와 독립 검수에서 별도 복구 ID 및 정상 파일 열기
연결을 확인했다. helper9건과 caller19건은 모의 storage/FileSession·실제 설치 함수의
증거이며 실제 사용자 IDB·OS 파일 쓰기 증거가 아니다. 자기 편집 잠금으로 완료를
거절하던 오류는 recoveryBusy 분리로, Latest 복원의 파일 연결 유실은
preserveFileBinding 설치로 수정했다. 지연된 이전 autosave 완료는 scheduler epoch
reset으로 차단한다. Fresh는 state/history를 보존하고 Latest는 명시적 복원으로 새로
설치한다. `/tmp/lds-manual-visual-menu-fix-20261007/recovery-parent-served-20261008.json`
및 두 focused 스크립트를 읽어 검사 범위를 확인했고 동일 green은 재실행하지 않았다.
추가 pre-invocation 경쟁도 수정했다. pump가 job을 잡은 뒤 microtask 실행 전에 같은
문서를 reset하면 이전 job이 새 복구 연결에 쓰일 수 있었다. controller b7df5f75는
writer 호출 전 epoch/disposed를 확인한다. 신규 focused2건에서 이전 writer 호출0과
새 job 성공, dispose 후 호출0을 확인했다. 기존 완료 후 epoch 검사도 유지한다.

90파일 후보의 실제 editor/Print raw와 캡처 비교에서 별도 P2 두 건을 확정했다.
홀수 5개 메타정보의 마지막 값은 편집기에서30%, canonical 출력에서80% 폭이었다.
같은 fixture의 table 높이는 각각170/130px였다. 명시적20:80 일반 표도 편집기에서는
기본31:69가 남고 출력에서는20:80이었다. `/tmp/lds-cover-consumer-visual-review-20261008.md`
및 `cover-consumer-editor.json`/`cover-consumer-print.json`이 근거다. 여백 e3d308 수정과
별개인 실제 결함으로 개발 가지에 인계했고, 모델의 셀 구조·선택·codec 및 CSS와
실제 화면이 일치하도록 수정한 뒤 변경 사례를 재검수해야 한다.
명시적 열 폭 결함은 TableView d4cf1d1a/CSS9d669987 후보에서 수정됐다. 실제 읽기 전용
editor/Print 측정의 total661.4375px, 132.28125/529.15625px로20:80이 일치했고,
기본 미지정 표의31:69는 유지했다. `/tmp/lds-manual-a4-boundary-qa-3_ygynq6/weighted-table-readonly-result.json`
및 같은 후보 캡처를 UI/UX 가지가 판정했다. 일반 페이지 본문 표의 전체 폭 차이
44.859375px는 별도 geometry 관찰로 남겨 canonical 기대와 대조한다. 이 렌더 수락은
실제 resize 클릭·셀 선택·Undo·OS 인쇄를 수락한 결과가 아니다.

### 트리형 운영과 결과 취합

사용자 지시로 각 채팅은 담당 범위의 서브에이전트를 자율 생성할 수 있다. 별도
사용자 채팅을 추가하는 권한과 구분하며 파일별 단독 writer와 브라우저 단독 lease를
승계한다. 각 가지 책임자가 내부 분담·실패 복구·결과를 취합하고, 총괄은 요구사항
누락·공통 병목·최종 완료 판정을 담당한다.

```text
LDS Manual · 총괄
├─ LDS Manual · UI 구현·통합 (개발 가지)
│  ├─ 문서 모델·편집 엔진
│  ├─ 저장·파일
│  ├─ 메뉴·아이콘
│  ├─ 블록 선택·키보드
│  ├─ 표 선택·삭제
│  └─ 표지·템플릿·표 크기
├─ LDS Manual · UI 총괄
│  └─ 시각 QA·증거 검증
└─ LDS Manual · UX 총괄
   └─ 브라우저 QA·실행 (UI 가지에도 공용 실행 창구)
```

idle은 전체 프로젝트 완료를 뜻하지 않는다. 자신의 코드 인계가 끝난 담당과
특정 결과를 기다리는 담당을 구분하고, 기다리는 동안 독립적인 잔여 요구사항을
점검한다. 동일 green을 재실행하거나 대기 세션을 움직이기 위한 가짜 작업은 추가하지 않는다.

## 2026-10-08 총괄 근거 재사용·현재 Print 검수

- 총괄 단일 목록의 M15/M18/M19/M21/M25/M26/M29/M31은 `/tmp/lds-remaining-evidence-closure-20261008.json`의 관련 소스·스타일 27범위 대조와 원래 실제 화면 기록을 확인해 완료 처리했다. 최신 전체 앱 수락을 뜻하지 않는다.
- 현재 실제 `ManualPrint` Blocks, 공개 Core export와 ManualPage, 현행 CSS를 사용해 합성 4쪽을 공식 PDF exporter로 생성하고 모든 Poppler PNG를 검토했다. `/tmp/lds-current-print-visual-20261008/source-pins.json`, `visual-review.json`, `current-print.layout.json`에 소스 고정·넘침0·검토 범위를 기록했다. 유효5종 콜아웃, 제목 유무·중첩·목록, 기본/강조 구분선, 좌/중/우 축소 이미지와 캡션 공동 정렬을 확인했다. 편집 커서·resize 제스처·OS 인쇄 대화상자 수락은 아니다.
- M09 1차 pending-choice 구현은 집중43 통과 후 총괄 검토에서 바깥에서 놓은 제스처가 다음 클릭을 삼키는 반례를 발견했다. `/tmp/lds-m09-pending-choice-20261008/no-click-next-gesture-probe.mjs`가 반례 근거다. 943a immutable 후보는 baseline로만 보존하며 실제 클릭 확인과 입력 확정의 이중 조건 보완을 단일 writer에 재배정했고, 최종51 집중 검사 통과·writer 반환을 확인했다. 실제 OS 조합 확정은 아직 미수락이다.

- M02는69 상태의 실제 Parent/PM 명칭 매핑과 UI32·catalog41 감사, 현행 명칭 consumer 불변 및 대표 실제 표시 근거로 원 명칭 점검을 완료 처리했다. 모든69 상태가 native로 도달된다는 주장은 하지 않는다. M17은 `/tmp/lds-M17-copy-evidence-closure-20261008.json`의 복제 ID·링크·역할·codec/PM 재열기 근거와10파일 exact 대조로 완료 처리하며, OS 파일 저장/열기는 M28에 남긴다.

- 목록 누락을 발견해 M36(표 ArrowDown 같은 열 이동)과 M37(페이지 추가 + 히트박스)을 별도 등록했다. M08 ArrowRight와 M20 블록 핸들의 다른 요구를 합쳐 지우지 않는다. 총37개 중19개 완료다. 현재 Print 검수4쪽에는 실제 PM 열 복제·행 추가·폭 설정 뒤 문서 정보 표5열3행도 포함하며, 실제 UI 메뉴 조작 수락으로 확대하지 않는다.

- 최종b2d1 후보의 입력 없는 준비 빌드는 총괄이 한 번 수행했다. `/tmp/lds-manual-a4-boundary-qa-3_ygynq6/native-b2d1-build-result.json`에서331보관파일/200로드파일 해시 불일치0·exit0 확인. 사용자15분 입력 구간에 대한 답 전까지 실제 입력은 하지 않는다. 준비 빌드는 실제 OS IME/파일 picker 검증이 아니다.

## 2026-10-08 재개 후 최종 수정 인계

- 현재 목록은 M01~M40, 완료20개다. 앞선37개/19개 집계는 당시 기록이며 현행 집계가 아니다.
- M20 핸들 기준 수정의 현재 canvas 파일 SHA는 `352c0304`, 검사 파일은 `819b46d9`로 최종 인계 핀과 일치한다. 집중61 통과 기록을 재사용하며 실제 첫 가시 줄의 핸들 위치는 다음 화면 검수에 남긴다.
- M38 확대 제한 수정의 현재 helper `46cddd52`, 검사 `7856a795`도 최종 핀과 일치한다. 표지 min-height가 만든 빈 공간을 점유 콘텐츠로 오인하는 반례 수정이며, 원본 사용자 문서의 종류와 실제 확대 제스처 수락은 별개다.
- M40은 공개 PM 명령으로 섹션 제목을 coverBody로 이동한 뒤 저장·재로딩하는 4사례를 재현했다. CSS의 해당 제목 아래 간격0을 space4로 보완했다. 정상 frame 제목·마지막 제목·본문 padding·Print·min-height·글자 크기·overflow 규칙을 유지한다. `/tmp/lds-cover-body-spacing-resume-20261008/`의 handoff, verification, exact.delta.patch와 현재 CSS `32826c3d`를 총괄이 직접 확인했다. 원본 DOM 동일성·실제 간격·커서 입력면·A4 넘침은 미확인이다.
- 재개 환경에서 이전 `/tmp` 증거와 검수 빌드가 사라진 것을 확인했다. 과거 실행 기록을 현재 존재하는 원본이라고 주장하지 않는다. 저장공간 담당의 보존본은 `/home/jinhyuk2me/.codex/lds-manual-disk-monitor/20261008/`에 있으며 initial-report, full100-preservation-report 및 heartbeat 증분 인덱스의 copy 경로를 사용한다. 보존된900개 SHA 일치 확인은 담당의 기존 기록이고, 모든 과거 증거가 보존됐다는 주장은 아니다.
- 통합 담당이 반환된 M20/M38/M39/M40 현행 합본을 고정한다. QA가 새 후보의 전용 harness와 빌드를 단독 준비하며, M40 이동 제목/정상 frame 및 M36 같은 열/필수 빈 본문 사례를 연결한다. 입력 경합 없는 시간에 대한 새 답변 전까지 키보드·드래그 검수는 시작하지 않는다.
- 새 캡처 manifest는 `/home/jinhyuk2me/.codex/lds-manual-integration/20261008-m20-m38-m39-m40/manifest.json`, SHA `bb045fbc609b97874096feffdd8f1e2df155e536bb03d4d21f8ec067abc62403`이다. 총괄이291개 항목의 live 및 archive SHA를 직접 재계산해 불일치0을 확인했다. manifest의 pre/post·archive·unresolved·pin issues도0이다. 이전 후보의331개와 숫자를 맞추는 대신 새 QA 진입점의 실제 의존 경로를 검증한다. 이 캡처 확인은 새 후보 빌드나 실제 편집 동작 수락이 아니다.
- 같은 보관 경로의 `m09-preservation-audit-v3.json`과 `handoff.json`을 총괄이 직접 확인했다. 메뉴·helper의 최종 SHA 유지 및 현행 Parent의 context/read-only/replay 조건11개 정적 점검이 통과했다. 최초 정규식 오탐은 메뉴 prop 기본값과 editor 상태 대입을 구분하지 못한 검증 도구 문제였으며, AST AssignmentExpression 점검에서 composing 상태 대입0으로 바로잡았다. 과거 Parent 원본이 없으므로 전체 함수 byte 동일성은 주장하지 않는다. 실제 OS IME 첫 클릭 검증은 여전히 M09에 남긴다.
- QA의 새 격리 화면 빌드가1회 성공했다. `/home/jinhyuk2me/.codex/lds-manual-qa/20261008-m20-m38-m39-m40/build-result.json`의 manifest SHA가 위 후보와 일치하고 exit0, archive·외부 inventory·로드 후 issues0이다. 실제 로드231개 archive/36개 외부 파일/2개 검수 입력을 기록했다. M40 이동 제목4·정상 frame4 및 후속 키보드 사례를12 route로 준비했다. 총괄이 빌드 기록을 읽었으며, 실제 화면 간격·A4·입력 동작의 완료 근거로 확대하지 않는다.
- M40 실제 moved/normal 빈 본문2사례의 DOM 및 스크린샷을 총괄과 UI 총괄이 직접 검토했다. 제목→본문 gap16px=space4, moved margin16/normal margin0와 본문 padding16을 확인했고 두 문서의 A4 지오메트리와 overflow0을 확인했다. 원 간격 요구를 수락해 M40 완료 처리했다. 같은 QA 디렉터리의 `m40-moved-0-dom.json`, `m40-normal-0-dom.json` 및 JPG가 근거다. 원 사용자 DOM 경로 동일성은 미관측이다. 커서 click 요구는 M14이며 M40에 별도 완료 gate로 추가하지 않는다. 현행 완료는21/40개다.
- 추가로 `m40-moved-1/2/3-dom.json`을 총괄이 읽어 내용 문단·목록·콜아웃 후속 요소에서도 gap16px 및 A4 overflow0을 확인했다. 콜아웃 후속 JPG도 직접 검토했다. 빈 본문 moved/normal 대표와 합쳐5개 실제 화면 사례이며, 정상 frame의 모든 후속 종류를 반복 수락했다고 주장하지 않는다.
- QA가 `readonly-finite-result.json`과 `evidence-index.json`에 입력 없는 검수 결과를 인계했다. 총괄이 결과 파일을 직접 읽었다. M40 실제5사례 통과, 오류0이며 M20 초기 핸들0/M37 버튼 opacity0 때문에 가시 상태의 Y·clip·히트 검수는 미수락이다. `prepared-image-grow-readonly.json`에서는 이미지 자연 크기800×400, 표시365×182.5·오류0을 확인했다. 준비된 ArrowDown·빈 단계 본문·이미지·블록 경계의 정상 로드는 실제 키보드·드래그 수락이 아니다. 검수 탭9개는 닫혔고 동일 후보 서버만 유지한다. 추가 입력 경합 없는 시간의 답변을 받기 전에는 후속 입력 검수를 하지 않는다.
- 추가 실제 `image-grow-occupied-geometry.json`을 총괄이 읽었다. image/figure 및 figure/본문 중심 차이0, 캡션/이미지 왼쪽·폭 차이0, visible overflow0·오류0이다. 즉시 자식 하단627.625와 쓰기 하단1203.381725 사이575.756725px 여유를 관찰했다. 이 수치는 실제 확대 cap 계산이나 드래그 성공을 뜻하지 않는다. M04의 최초 가운데 정렬·캡션 공동 정렬 근거를 보강하며 축소 후 유지·Undo와 M38 확대 제스처는 미수락으로 유지한다.

## 2026-10-08 20:18~20:33 KST 실제 입력 검수 재개

사용자의 '지금 해' 지시로 입력 검수를 재개했다. 기존 bb045 후보를 재사용하며 QA 단독 driver, 합성 문서·메모리 저장소, 원본 사용자 문서 쓰기0 조건을 유지한다.

- M38 실제 핸들 드래그365→485px, 한 번 Undo365 복원. M04 실제365→245px 축소 후 가운데 유지, Undo365 복원. 총괄·UI·UX가 quiet-M38 before/grown/undo 및 quiet-M04 shrunk/undo JSON과 화면을 검토했다. 모든 상태 centerDelta0·캡션 좌측/폭 차이0이다. raw Undo HTML의 유일 차이는 figure 클래스 토큰 순서이며 총괄의 class-order 정규화 대조에서 전체 HTML·텍스트가 동일했다. 원 요구 두 항목을 완료 처리했다. 모든 좌/우 native 메뉴 조작을 봤다는 주장은 하지 않는다.
- M13 실제 빈 필수 본문 offset0의 Backspace→단계 제목 끝 offset7, 편집기 포커스·도구모음 정상·HTML/ID/텍스트 유지. 총괄·UX가 quiet-M13-result.json을 읽어 수락했다.
- M36 실제 row1-left의 '애' 뒤 offset1→아래 row2-left offset0, 마지막 행→표 다음 본문 offset0. quiet-M36-result 및 last-row JSON에서 내용·HTML·ID·포커스 유지 확인. source11 경계 검사로 보완하며 원 사용자 DOM 동일성과 모든 여러 줄 native 사례를 수락했다고 주장하지 않는다.
- 위4항목을 반영한 완료 집계는25/40개다. 나머지 실제 조작 검수는 동일 구간 내에서 계속한다.
- M16 실제 페이지 드래그를 quiet-M16-forward/backward JSON에서 확인했다. [cover,page]→[page,cover]→[cover,page] 양방향이고 클래스 순서 정규화 HTML·ID 집합이 복원됐다. quiet-current.json의 11:22:19.164~11:22:19.383 UTC 실제 Undo 기록에서 [page,cover]로 복원된 section 순서도 총괄이 직접 추출해 확인했다. UX의 양방향 독립 검토와 합쳐 원 M16 요구를 수락했다. 현행 완료는26/40개다.
- M37의 가시16×16/아이콘12, 중앙 삽입·Undo, 정수4.5px 외부 삽입0을 확보했다. fractional1px 외부 클릭은 삽입됐지만 elementFromPoint는 버튼 소유가 아니므로 driver rounding/실제 경계 원인 미확정으로 남긴다. UI·UX와 총괄이 quiet-M37-visible/outside/integer-outside 기록을 직접 읽었다. 광범위 hitbox 제품 결함이라고 단정하거나 불확실한 경계를 완료로 덮지 않는다.
- 총괄이 quiet-current.json의 실제 입력21개 timestamp를 확인했다. 시작11:18:41.802 UTC, 마지막11:25:23.908~11:25:24.279 UTC이며11:33 종료 이후 입력0이다. 다음 M20 입력은 QA 시간 guard가 차단했다. 원래15분 구간은 종료됐으며 후속 검수 구간을 별도로 요청했다. 아직 답변이 없으면 입력하지 않는다.

- 추가 입력 검수 구간은 사용자 승인으로 2026-10-08 20:42:22–20:57:22 KST. sole QA만 입력하며 bb045 후보/기존 서버를 재사용한다.
- M37은 UI 총괄의 최종 독립 대조 결과에 따라 원 넓은 히트박스 개선 범위로 수락했다. 가시16×16·아이콘12, 중앙 삽입1/Undo1, 정수4.5px 외부 삽입0·HTML 동일 및 wrapper 비클릭 근거를 사용했다. fractional1px 외부 입력의 상반된 결과는 좌표 전달/경계 원인 미확정으로 명시하며 정밀 native 경계 완료를 주장하지 않는다. 완료27/40개.

- M01 제목→본문 이동과 Undo의 실제 quiet2-M01 JSON을 총괄이 읽고 UI 독립 승인과 대조했다. Undo HTML 차이는 manual-callout-title-editing 포커스 클래스 하나뿐이며 이를 제외하면 정확 복원, 원문 동일·제목 범위0~6 복원. 전체 M01은 편집 화면 정렬 확인을 남겨 검증 대기로 유지한다.

- UX도 quiet2-M01 이동/Undo JSON과 화면을 독립 검토하고 포커스 클래스만 제외한 HTML 정확 복원·ID 순서 동일·굵은 제목 보존을 재계산했다. 이동 후 대표 화면 정렬은 정상이며 저장 하네스의 detached backup 거절은 제품 저장 성공/실패 근거로 확대하지 않는다. 제목 유무 정렬 검수까지 M01 대기를 유지한다.

- M07 실제 목록/인용 필수 문단 삭제와 Undo를 quiet2-M07-list/quote 원자료로 확인했다. 삭제 메뉴 활성화, 같은 ID·상위 list/item/quote 유지·내용 비움, Undo1회 HTML 복원과 커서 offset6/5 복원. 유일 목록 항목 삭제까지 확인할 때 전체 M07 완료로 판정한다.

- M01 실제 제목 유무 편집 정렬을 quiet2-M01-alignment JSON/JPG로 검토했다. 제목 있음24px/아이콘24px 중심차0; 제목 없음 본문22px/아이콘24px 상단 동일, 중심차1px. UI 독립 시각 검토가 두 대표 유형의 첫 줄 정렬·겹침 없음으로 승인했다. 기존 5종류 Print 검수와 UI·UX 실제 제목 이동/Undo 수락을 합쳐 M01 완료, 전체28/40개. 외부 핸들 M20과 저장 M28은 별도 대기다.

- M07 목록/인용 필수P 삭제는 UI·UX 독립 검토도 통과했다. 삭제 후 변경은 targetP의 data-manual-empty 추가·내용 trailingBreak 교체이며 ID/상위 구조 보존. Undo 전체 HTML 및 커서 복원을 검토했다. 유일 listItem 전체 삭제 검수는 별도로 유지한다.

- 총괄이 quiet2-M14/M27 실제 JSON을 읽었다. M14 표지 여백 클릭으로 기존 빈 본문 after0·편집기 활성·HTML 보존. M27 해당 빈 본문에서 Backspace로 앞 문단 before4·빈 본문 제거, Undo1회 after0/HTML 복원. UX 독립 판정 뒤 완료 상태 반영 예정이다.

- UX가 quiet2-M14/M27 원자료를 독립 재계산해 승인했다. M14 여백 클릭 전후 raw HTML 정확 동일. M27 변경은 빈P after 제거 하나뿐이며 Undo raw HTML·after0 커서 정확 복원. 기존 제목/토글/단계의 실제 증거와 합쳐 M14·M27 완료, 전체30/40개.

- 실제 M24 metadata 마지막 행/열 삭제 후 구분선으로 선택되는 반례를 QA가 발견했다. 총괄이 quiet2-current.json에서 delete row/column 모두 activePM·cover2→3 Range·toolbar 구분선 선택을 직접 확인했다. 연속 add/delete Undo의 그룹화는 별도 미확정으로 분리하며 개별 간격 재현 중이다. 표 담당에 읽기 원인 조사 전달, 실제 반례 확정 뒤 단독 writer 수정 예정. M24 미완료 유지.

- M24 개별 간격 재현을 quiet2-M24-separated-row.json에서 총괄이 직접 확인했다. 삭제 후 남은1행 대신 divider 선택은 확정, Undo1의2행·cellID·firstcell0 복원은 정상이다. 빠른 연속 작업 Undo는 history grouping으로 분리하고 별도 결함으로 단정하지 않는다. 표 담당에게 삭제 후 남은 셀 커서 복원 최소 수정·단독 파일 writer 확인·집중 검증을 배정했다.

- QA의 M24 추가 열 삭제 검수에서는2행5→4열 삭제 후 다음 행 첫 셀로 이동하며 divider 선택은 없고 Undo5열/ID 복원 정상이다. 확정 divider 반례는 표 끝 삭제(마지막행2→1 또는1행 마지막열5→4)로 범위를 좁혔다. 표 담당에게 수정 범위와 추가 증거 경로를 전달했다.

- UX가 M24 separated-row/column 원자료와 화면을 독립 검토했다. 삭제 구조/Undo는 정상이나 divider 선택과 열린 metadata drawer 불일치, 또는 다음 행 첫 셀로 이동하는 선택 UX 실패를 확인했다. 남은 동일 표의 적절한 셀 명시 선택을 수정 정책으로 담당에게 전달했고 M24 전체 수락을 보류했다.

- UX 읽기 조사에서 속성 패널 deleteLastRow는 kernel 직접 명령이고 메뉴 executeManualTableAction은 별도 경로임을 확인했다. kernel 행 삭제의 남은 셀 선택 부재가 원인 후보이며 메뉴는 선택 ID를 명시한다. 담당에게 경로 구분·불필요 정상 메뉴 수정 금지·정확 파일 writer 확보를 전달했다. 구현 전 단계의 원인 후보로 기록한다.

- QA의 추가 실제 포커스 의미 반례로 M21을 재개했다. caret5 그대로 ShiftF10 메뉴를 열어도 menu-target과 block-selected/ProseMirror-selectednode가 같은blue12% 채움을 사용한다. quiet2-focus-menu JSON/JPG 경로를 UI 담당에 전달하고 커서·선택·메뉴 대상 시각 역할 구분 수정 배정. Escape 커서 복원은 정상이며 선택 의미 혼용이 수정 대상이다. M21 재개로 완료29/40개, 과거 완료 근거는 기록 유지한다.

- M21 수정 writer를 UI 담당의 apps/editor/src/redesign/manual-editor.css 단일 파일로 확정했다. 실제선택 기존12% 채움은 유지하고 메뉴대상 단독에는 투명배경/점선 경계로 의미를 구분한다. 표 담당 kernel 경로와 분리, 집중 cascade/선택조합 검증 후 새 후보 실제 검수는 다음 허용구간으로 분리한다.

- Quiet2 최종 결과를 총괄이 직접 읽고 SHA256 c7a0b0f350b8f8348be6faeedb21942a2cf737c8f15276a856038a8dd17e6206 확인. frozen bb045 후보, 실제41입력20:43:10.451~20:55:00.504 KST·마지막readback20:55:20.822·허용종료20:57:22 이후입력0. 임시탭16/17 닫음, console오류0·원본문저장쓰기0·QA제품쓰기0·추가build0. M01/M14/M27 완료, M07 필수P 검수만 수락/유일item 미실행, M24 구조/개별Undo 통과이나focus실패. M21 추가 의미혼용 반례로 재개해 현재29/40개 완료. UI CSS 및 표 kernel 담당이 새 수정 후 반환하고 재검수할 계획이며 현재 candidate 실제검수와 새소스를 혼동하지 않는다.

- M21 CSS writer 반환을 총괄이 handoff/cascade-audit/exact.delta와 live SHA90a1a34c로 확인했다. 기존306규칙 변경0·screen 전용1규칙 추가로 메뉴대상 단독 transparent/1px dashed, 실제선택 채움 유지. 집중30검사 통과, 실제새후보 시각수락0로 반영·검증 대기. 허용 입력구간20:57:22 종료 후 추가입력하지 않는다.

- 표 담당 읽기 원인확정: 속성 direct kernel delete는 survivingcell 선택 없이 tr.delete만 수행해 PM selection mapping이divider/다음행firstcell로 이동. manual-kernel.mjs 및 새 table-delete-focus test 두파일 단독 writer를 확정, 현재 row/col 유지하며 next/last 살아있는cell caret0 명시 선택 정책으로 최소 수정 배정. Parent/CSS/Core/actionhelper 변경0.
- M21 UX 독립 source 검토에서 신규1규칙 제거로 baseline32826c 정확 재구성, 실제선택12%채움 및 semantic radius·중첩content:none·printcontent:none 보존을 확인했다. 새후보 native수락은 대기한다.

- 미완료11항목의 다음 완료 근거를 작업 목록에 명시했다. M07 유일 목록 항목 자체의 공개UI 접근 경로를 UX 읽기 조사에 추가 배정했다. QA의 메모리 저장소 detachedID 제한은 다음 하네스 준비에서만 보완하며 실제 OS 저장 수락과 분리한다. 표 담당 실행과 QA 준비 turn이 현재 inProgress임을 wait_threads로 확인했다.

- M24 수정 반환의 handoff/집중10개 로그/livekernel3fa521/testb13a64 SHA를 총괄이 직접 확인했다. ordinary/metadata/merged normalization/중간삭제/UndoRedo/IME·readonly·min1 근거를 /home/jinhyuk2me/.codex/lds-manual-table/20261008-delete-focus로 보존했다. 새후보 native수락은0로 검증 대기. M07 공개UI itemtarget 보존 부재를 추가 발견해 메뉴 담당에 수정 배정, Integration은 M07반환까지 새캡처0·빌드0로 확인했다.

- M20 준비 원인 표현 정정: canvas-drag에 pointerleave 리스너는 없으며 문서 pointermove 영역 밖과 move-path 없는 root focusin이hide 경로다. driver pointerleave라고 단정하지 않는다. 다음 허용구간 실제 공개padding/gutter·text drag로 가시handle/targetID 확보 후Y·clip을 검수하며 hidden좌표/style주입을 수락근거로 쓰지 않는다. QA Map의 detachedID 지원은 격리 하네스만 준비하며 OS저장 mock대체0 유지.

- M24 UX 독립 읽기 검토: actual lastrow/1rowlastcol/2rowlastcol 반례에 대응한same-table cellID 명시TextSelection·marks/normalization·onePMcommit·UndoRedo·guards10 근거를 확인했다. nextnative는lastrow samecol/1rowlastcol leftcell/2row현재row leftcell 및각Undo ID/caret복원으로 준비, native수락0 유지.

- 반환된 M24 kernel/test 및 M21 CSS 최종 파일 자체를 각 내구성 근거 경로의 final/에 보존하고 원자료SHA3fa521/b13a64/90a1a34c와 복사SHA 일치를 확인했다. M07 메뉴 담당 turn01a11b63-a9d2-7ea2-844d-2294620ce779 및 QA 준비 turn01a11b60-d368-7692-8f93-b0c985251e3c가 현재active/inProgress임을 wait_threads로 확인, terminal로 오인해 재시작하지 않는다.

- 총괄 M24 delta 추가 검토에서 colspan으로계산한logicalcolumn을row.child physicalindex로쓰는 회귀 후보를 발견했다. kernel schema는colspanattr를가지지만codec/runtime은특정metadata projection만span3을사용하므로 ordinary 병합 허용 계약·실제PM반례부터 표담당에확인요청. 확정 전 버그나필수수정으로단정하지 않는다. 디스크담당21:04여유약160GiB/17분12.1GiB감소·원인미확인보고는별도감시,삭제/중량전체스캔 없이조회범위유지.

- M24 표 담당이 actualPM ordinary2physicalcell/span2 fixture doc.check/TableMap 정상에서 RangeError Index2 out of range·dispatch0을 재현했다. DTO import는 일반span불허여도PMschema/기존selection runtime은허용하므로 새helper 회귀로확정. kernel/test두파일lease재개,physicalindex/cellId분리·crossrowlogicalspanlookup 최소수정/집중12배정. Integration에3fa521 provisional 및M07+M24再반환전최종capture대기 전달.

- 표 담당 반례시점정정 수신: 첫 rootcwd probe는module해석실패로제품반례없음, 뒤 apps/editor cwd actualPM probe에서schemaValidtrue/mapWidth3/problems[]/physicalCells2 및 RangeError count0를 실제확인했다. 성공한probe 로그/명령/sourcepins의내구성보존 요청, 환경해석실패와제품반례를구분한다. 디스크bounded3초224프로세스읽기에서VM쓰기후보확인/현재약162GiB회복,과거12.1GiB감소원인확정아님·VM/파일수정0.

- QA 다음 검수 준비물을 총괄이 실제 JSON parse로 읽었다. next-qa-plan SHA f8028c6668540ddf137d77ad5b664f5b5a0acd4f1abd5d2bc01adb0761dcb184, 원11항목·추가fixture5·합성이미지bytecopy·Map저장소7검사. 준비브라우저입력0/build0/product쓰기0, 기존bb045불변. realIME와nativeFileSystemAccess OSdialog 제어는현재문서화API없음/nativecomputerdisabled로미검증이며 mock/paste/filechooser로갈음하지 않는다. M07+M24최종반환뒤solebuild1회·실제입력은새허용구간을필요로한다.

- M24 병합 회귀 최종 반환 kernel821dce038ab7c3970ea929ef35d7a40c5a139b88233b83fc51f2acd96453b2c4/test687a10ae47742e2adbf8549f50f7b767b7b64bb5b2d8b79cb8072430862dcee1 및실제PM12개/182.7ms/changedDuringRun0를총괄이 직접읽고 liveSHA 대조했다. 원probe shell원본stdout미보존이므로 실제tooloutput faithful전사표시를유지하며 반례를기록한다. 최종근거·source파일은 /home/jinhyuk2me/.codex/lds-manual-table/20261008-delete-focus-span에보존. runtimespan의DTO불허는PMdoc/selection UndoRedo로검증하고 baselineDTO10유지. native수락0, M07반환을다음합본선행단계로 유지.

- M07 수정 설계/lease 확정: names만으로선택된li menu대상은보존되지만명시itemhandle는없으므로Parent names listItem 및 drag-layout labels/collections 두제품파일+새public-menu test단독writer 승인. Integration이writer0/해당파일계획0직접회신, kernel821dce/CSS90a1과분리. childP가itemtarget를가로채는지실제controllerseam검증·추가파일은반례와경로보고뒤조율하도록배정했다.

- M24 spanfinal UX 독립 검토 완료: live821dce/687a10 핀과delta/12검사 로그 확인, column은기존physicalAPI/physicalIndex를사용하고row는생존ID유지 또는span누적범위lookup으로실제반례를해소한다. baselineDTO10/runtimePM2 검증범위로 수락하고 임의rowspan/전체span정책지원으로확대하지 않는다. native재검수는대기다.

- M07 담당 source추가반례: li path만추가해도마커위 directli가childparagraph rail우선조건으로대체된다. Integration canvaswriter0확인후canvas-drag.mjs directlistItem만유지하는1조건단독lease 승인,현행controller반례보존·directP/일반wrapper·관련firstline/clip/scale집중회귀검증배정. 기존352c핀은바뀌므로영향범위/최종핀반환을요구, M20hide/Y문제와분리한다.

- QA M07 수정 방향 반영의 next-qa-plan 최신SHA3ab7b9a0e7de7838d2a870f09f4b1d0cae52927736aa5dfe86acc91482a1fb45를총괄이 직접읽었다. marker/gutter→visibleitemhandle→itemtarget/aria목록항목→삭제/Undo,필수P는별도회귀. nativeAccessAccepted=false·입력/build/product쓰기0. 메뉴 담당 turn01a11b63-a9d2-7ea2-844d-2294620ce779 active/inProgress 및 fileChange완료를wait_threads로확인,최종반환은아직대기한다.

- M07 집중20개 통과를 총괄이 담당현재turn command출력에서 직접 확인했다. baselineParent ContextMenu는target list(expecteditem),baselinecontroller는target-item/blocks/0(expectedlist/items/0) actualseam반례를로그로보존. 최종writer반환과관련회귀검증은아직대기, native수락0.

- M07 focused-results/scope-proof/source-pins/exactdelta를 총괄이 직접 읽었다. public-item20+Parent/layout21+canvas35=76검사PASS, changedDuringRun0, Parent names 외 함수 불변(M09 포함)·layout label/collection 추가·controller directli1조건만 변경. live/after4파일SHA 일치 확인. 이 확인 시점의 최종writer반환/native수락은 대기였다.

- M07 최종 handoff 반환/4파일writer반납 확인. Parent7535df/drag8fb076/canvas9644f2/testb5e73f 최종핀과76검사·실행중변경0 근거를 총괄이 읽었다. 모든제품writer반환으로 Integration에 M07+M21+M24 합본 immutable 캡처를 배정하며 실제native수락0를 유지한다.

- M07/M21/M24 합본 ef6d immutable 반환을 총괄이 manifest/handoff/preservation-audit 직접읽고293개live/archive SHA 재계산으로확인했다. 제품5변경/test2추가/삭제0·모든Parent함수416개 및M09helper/Menu/completion정확보존·external19/brand12불변의8체크 통과. QA단독build1회준비를배정, 새15분 입력미사용질문은답변대기이므로 실제입력0 유지한다. 이전bb045의native수락을변경된source에확대하지 않는다.

- 사용자 추가입력미사용승인으로 Quiet3를 2026-10-08 21:16:50–21:31:50 KST(12:16:50–12:31:50 UTC) 시작. soleQA만ef6d immutable/source+준비Mapfixture를build1회후입력, M21/M24/M07우선 검수. 입력마다새deadline 확인·이후중단·ownedtabs정리 규칙 전달. UI·UX는 실제원자료 독립읽기 판정만 수행한다.

- Quiet3 새 후보 빌드 근거를 총괄이 직접 확인했다. QA build-result SHA 03da0f70d5460d2e68ffa65bd50249daa4951402edd6ebaf8316b7f3ab9faa96, ef6d manifest, 12:18:53.132–12:18:53.291 UTC exit0, archive231/external36/QA입력3. archive·external·source 사후·fixture 사전/사후 불일치 모두0이며 선언된 fixture8개 SHA를 총괄이 별도로 재계산해 불일치0 확인. 새 검수 서버42305 준비, 실제 화면 수락은 아직 대기다. 완료29/40 유지.

- Quiet3 M21 대표 실제 결과를 총괄이 원 JSON과 두 JPG로 직접 확인했다. 메뉴만 열면 투명 배경/1px 점선, 실제 블록 선택+메뉴는 기존12% 채움 유지. Escape 후 caret5 및 전체 HTML 정확 복원을 별도로 계산해 M21-root-audit.json에 보존. UI 독립 시각 검토 배정, NodeSelection·중첩·콘솔 추가 관측 전에는 전체 완료로 변경하지 않는다.

- Quiet3 M24 실제 행2→1 삭제 및 1행 열5→4 삭제에서 남은 같은 표의 적절한 셀 caret0/표 셀 툴바를 총괄이 원 JSON 직접 확인했다. Undo로 추가 직후 전체 HTML·셀 ID·선택, Redo로 삭제 직후 전체 HTML·선택이 각각 정확 복원됨을 독립 계산해 M24-root-audit.json에 보존. 이전 구분선으로 튀는 반례는 두 대표 경로에서 해결. 2행 마지막 열 삭제의 같은 행 유지 검수는 아직 대기, 전체 완료는 유지 보류.

- Quiet3 M07 유일 글머리 항목 실제 공개 핸들→목록 항목 메뉴→삭제→Undo 경로를 총괄이 JSON/JPG로 확인했다. targetIDs는 목록 자체가 아닌 item, 제거 ID는 list/item/내부P 세 개뿐이며 바깥 문단 ID 유지·Undo 전체 ID/text 정확 복원을 독립 계산해 M07-root-audit.json에 보존. UI도 독립 승인. 해당 li NodeSelection+menu가 기존12% 채움과 단일 표시를 유지하는 M21 추가 실제 근거 확보. 번호 목록과 only-list 빈 본문 생성은 이어 검수 중이며 M07 전체 완료는 아직 보류한다.

- M21 원 요구 완료: 새 후보의 메뉴only/실제block/NodeSelection 세 실제 대표와 정확 커서·HTML 복원, 기존 중첩/인쇄 규칙 보존을 합쳐 총괄이 완료 처리. UI가 원 요구 범위의 수락 가능함을 명시적으로 반환했으며 새 전체 조합 gate는 추가하지 않는다. 최종 QA 콘솔은 종료 기록에 추가할 일반 결과다. 완료30/40, 남음10(M03/M06/M07/M08/M09/M20/M22/M23/M24/M28).

- M07 완료31/40: ef6d 유일 글머리·번호 항목 및 목록만 있는 페이지의 공개 항목 핸들/삭제/Undo 세 대표 실제 검수, 앞뒤P 보존 및 only-list 새 빈P·caret0를 총괄이 원 JSON/두 추가 JPG로 직접 확인. M07-followup-root-audit에 제거/생성 ID 및 Undo 전체 ID/text 독립 계산 보존. UI 독립 수락과 이전 필수P 실제 삭제/복원·PM/codec 근거를 합쳐 원 삭제 비활성 요구 완료. 남음9(M03/M06/M08/M09/M20/M22/M23/M24/M28).

- M09/M28 capability 재조사: UX가 현 native computer API 비활성 및 실제 OS IME/picker 제어 API 부재를 확인. 다만 현 QA의 blocked fileSessionFactory는 검수용 차단이므로 모든 파일 흐름이 제품 불가인 것은 아니다. Save 담당에 소유 synthetic 문서+격리 storage+정상 createManualFileSession의 별도 QA entry/fixture/plan 준비만 배정(제품/빌드/브라우저입력0). 실제 다운로드 bytes와 HTML input fallback 재열기는 문서화된 브라우저 API로 확인 가능한 부분, native 파일 handle 저장/OS IME는 별도 실제 환경 근거가 필요하며 모형으로 수락하지 않는다.

- M20 완료32/40: 현재 viewport 실제 가시 콜아웃 제목 유무·단계 3대표의 첫줄 배치/24px/clip내부와 단계 비겹침, M07 글머리/번호 항목 핸들 공개 동작 및 source firstline/clip/scale 회귀 근거를 합쳐 UI가 원 요구 수락을 명시 반환. 총괄이 원 JSON/step픽셀 및 M20-root-audit 독립 계산으로 완료 반영. 약1px titleless linebox 차이는 가시 겹침 결함으로 단정하지 않으며 전체 좁은폭/scroll경계 native 검수로 확대하지 않는다. 남음8(M03/M06/M08/M09/M22/M23/M24/M28).

- M24 완료33/40: ef6d 2행 마지막 열 삭제까지 같은 첫행 metadata:0:3 caret0 유지 확인. 총괄이 M24-two-row-column-result 전체 HTML/selection/table Undo/Redo exact를 독립 계산해 M24-two-row-root-audit에 보존. 앞선 행삭제·1행 열삭제 실제/UI·UX 승인 및 PM12 ordinary/metadata/span 회귀를 합쳐 원 표 구조 제한/삭제 커서 요구 완료. source guard·구조/ID 보존 근거를 유지하며 병합셀 전범위 native/OS 저장으로 확대하지 않는다. 남음7(M03/M06/M08/M09/M22/M23/M28).

- M24 2행 마지막 열 실제 결과의 UX 독립 대조도 반환: added/undo2×5·deleted/redo2×4, 첫행 metadata:0:3 caret0·activePM·divider선택0, nested HTML/selection/table 구조 정확 복원 승인. 완료33/40 집계의40개 고유 ID·상태를 총괄이 다시 계산했으며 남은7개는 M03/M06/M08/M09/M22/M23/M28이다.

- Quiet3 M03 신규 실제 반례: 공개 /image 메뉴와 문서화 filechooser.setFiles로 소유PNG800×400 로드는 성공, drawer 자동열림0이나 figure선택0/캡션caret0/resizeGrips없음. 총괄이 원 JSON/JPG 직접 확인해 M03 미완료 유지. UI총괄에 Parent+새집중test 단독writer 배정, Integration은 읽기 원인/검증지원 및 최종반환 뒤 immutablecapture로 전환(제품쓰기0). 신규placeholder채움/기존이미지교체 구분·M09/M07/기타Parent동작보존을 요구했다.

- M28 정상 파일provider를 쓰는 별도 소유 QA 준비 반환: .codex/lds-manual-qa/20261008-m28-file-public pinsSHA7d3be663..., 총괄이6입력 SHA재계산 issues0 및 QA-PLAN 직접 확인. build/input/product변경0, actual/forcedfallback의 근거 구분과 OS저장picker 한계를 유지한다. 아직 실행·native 파일 저장 수락은 아니다.

- Quiet3 M08 빈 마지막 셀 native ArrowRight 관측: 총괄이 M08-blank-last-cell 원 JSON을 직접 읽고 5단계의 다음sectionTitle offset0→4와 각 단계 전체 HTML·표rect·scrollTop/Left 정확 불변을 독립 계산해 M08-root-audit.json에 보존. 이전 내용있는 마지막 셀/일반표 대표 근거와 합쳐 원 빈셀 사례의 미확인 해소. 각 native키 뒤 프레임 관측이며 사이 모든 프레임 연속영상이 있다고 확대하지 않는다. UX 원 범위 수락 판단 대기.

- M08 원 요구 UX 수락 반환으로 완료34/40 반영. 실제 빈 마지막 셀 이후 정상 순차 커서 이동과 각5관측의 표/스크롤/HTML 불변, 이전 일반표/내용있는셀 검수 근거를 합쳐 완료한다. 키 사이 전프레임 영상 미관측 한계를 유지하며 무제한 프레임 gate는 추가하지 않는다. 남음6(M03/M06/M09/M22/M23/M28).

- Quiet3 M06 표지 대표 실제 검수: M06-cover-result 및 default JPG에서 속성 UI emphasis→default, 같은 구분선 ID/Undo emphasis 복원 확인. 총괄은 hr data-manual-divider-variant 및 Undo 전체 HTML/선택 exact를 직접 계산. 일반 구분선 실제 편집 검수까지 통과했다고 확대하지 않아 M06 미완료 유지.

- Quiet3 종료 근거를 총괄이62 actual action 전체시각과cleanup/finalstates JSON으로 독립 확인했다. 첫입력12:20:16.966UTC·마지막12:30:57.398·마지막읽기12:31:28.670, 모든62 start/end가승인구간내·6개ownedtabs도deadline전에닫힘. 최종6개consoleerrors0. quiet3-root-window-audit 보존. 입력 종료 뒤에는 원자료읽기/이미지source수정/다음QA준비만 진행한다.

- M03 source 최종반환을 총괄이 handoff/delta/preservation/green12·regression70·red반례 로그 및 liveParentcd522f/newtest577497 SHA로 직접 확인. 신규chooser 요청의 frozen selectAfterLoad 의도로 placeholder채움을 기존교체와 구분하고 완료NodeSelection만 확장. 다른131 FunctionDeclaration·변경함수밖 source 및 critical13 pins 보존 근거 확인. UIwriter반납, Integration에 ef6d 기반제품1/test1 새합본capture 배정하고 UX읽기독립검토 요청. M03은 반영·실제검증대기로 갱신하며 native수락0 유지.

- M03 새 합본2f8686 최종반환을 총괄이 manifest/보존자료 직접읽고294개 live+archive588 SHA재계산 issues0로 확인했다. Parent1변경/test1추가/삭제0·3함수밖 exact·M09 guard/helper/Menu20ms·기존 M07/M24/CSS/resize/brand/external 보존10checks PASS. QA solebuilder에 새2f 기반잔여6 및 정상M28provider 실행환경 준비/build 배정, 입력은 새승인답변전0 유지. oldef6d의native수락을새M03완료로승계하지 않는다.

- 총괄이 작업목록40개 상태와 잔여 완료근거표6개 ID 일치를 재계산하고 본문에 남은 과거 집계11개를6개로 바로잡았다. M03 actual 공개 교체는 명시 속성창을 연 경로로 검수하며 닫힌창 교체는 공개 버튼이 없으므로 기존 source 회귀 범위를 유지, 숨은 UI를 조작하는 신규gate로 만들지 않는다. UI native-acceptance-handoff 원자료 직접 확인.

- Quiet3 최종 finite-result SHA4b4f2d11... 및 evidence-index SHAad12ba7c...를 총괄이 직접 읽고53개 근거파일 전체SHA를 독립 재계산해 issues0 확인. 34/40·5개대표수락/M06표지만부분/M03실제실패/OS미관측 범위가 원자료 및목록상태와일치한다. 이전ef6d실제실패를새2f source수락으로승계하지 않는다.

- 잔여6 새 QA 실행환경 두entry(general/files)를2f source로 solebuild1회12:39:58.323–.492UTC exit0 확인. source/external/fixture 전후issues모두0,선언QA입력14개 SHA를총괄이별도재계산 불일치0. 정상파일provider/명시forcedfallback 및일반fixture를구분, 원store/file/제품쓰기0·입력0. 실행승인 요청 전 준비완료 근거를확인했다.

- 새2f QA 실행준비 완료: general43413/normal-files33861 별도loopbackorigin, HTTPserved-byte readiness자료 및buildexit0/입력0 확인. 총괄이 새15분 키보드·마우스미사용 질문을 제시했고 답변전 실제입력0 유지하도록soleQA에전달. 기존server/fixture/build 반복0, 준비완료후승인만 요청한다.

- 사용자 새미사용답변으로 Quiet4 시작:2026-10-08 21:41:36–21:56:36KST(12:41:36–12:56:36UTC). soleQA만준비완료2f 후보 일반43413/files33861의 공개UI검수, UI·UX읽기독립판정. 입력마다deadline 확인/이후0/ownedtabs cleanup, M03→M06normal→M22→M23→M28 순서. root작성리스트34/40 유지, 실제수락때만갱신한다.

## 2026-10-08 Quiet4 M03 실제 완료 — 35/40

새 2f8686 고정 후보의 신규 삽입은 figure 선택·가시 크기 조절 손잡이·드로어 자동 열림 없음, 공개 기존 교체는 caption caret9·ID·명시 드로어 상태 보존을 실제 검수했다. 총괄 원자료/픽셀과 ID/선택 계산, UI·UX 독립 수락으로 M03 완료. 근거: `/home/jinhyuk2me/.codex/lds-manual-qa/20261008-m03-remaining-six-final/M03-root-audit.json`, M03-new-result.json/JPG 및 M03-replacement-result.json/JPG. 남은 M06/M09/M22/M23/M28.

## 2026-10-08 Quiet4 M06 실제 완료 — 36/40

일반 구분선 default→emphasis→Undo default에서 전체 HTML/선택/선 rect 정확 복원을 총괄 원자료 계산·픽셀 대조했다. 이전 표지 변경/Undo, 불변 관련 소스의 저장·Print 검수 근거와 UX 독립 수락을 결합해 M06 완료. 원자료 및 M06-root-audit.json은 `/home/jinhyuk2me/.codex/lds-manual-qa/20261008-m03-remaining-six-final`에 보존. 재시작으로 유실된 이전 `/tmp` Print 파일을 현재 존재한다고 주장하지 않으며 이미 수행한 시각 검수 이력을 재사용한다. 남은 M09/M22/M23/M28.

## 2026-10-08 Quiet4 M22 실제 완료 — 37/40

공개 페이지 목록 Shift 범위 선택·그룹 이동·삭제·Undo와 빈 여백 marquee 실제 검수 완료. 총괄 순서/선택 원자료 및 픽셀 대조, UX native-current 원HTML 독립 비교 수락. 근거 M22-result.json/3JPG/M22-root-audit.json. 남은 M09/M23/M28.

## 2026-10-08 Quiet4 M23 실제 완료 — 38/40

실제 6셀 선택 외곽 모서리·trailing 버튼 행/열 추가·strip drag 증감·Undo 검수 통과. 총괄 원JSON 행렬/ID/본문/rect 재계산과 픽셀 대조, UI 독립 수락. 원자료 M23-rectangle/trailing-click/row-drag/column-drag-result 및 JPG, M23-root-audit.json에 보존. 남은 M09 한글 조합, M28 파일 저장·재열기.

## 2026-10-08 Quiet4 종료 — 38/40, 파일 부분 검수

8개 소유 탭은 12:56:09 UTC 정리, 입력 종료 시한 12:56:36 UTC 준수 보고. 실제 입력 마지막 완료 12:55:51.185 UTC. 일반 화면 console0, 첫 M28 잘못된 합성 입력 화면만 준비 오류1; 수정한 파일 화면 console0. 새 파일 QA 입력10핀 총괄 SHA 대조0, 실제 다운로드1389B 구조/자산 exact. pending 보호창을 수락 전 재열기로 보지 않고 명시 버리기 후 완료 관측만 수락. 실제 dirty 취소/명시 버리기 검수 통과. M09 OS한글조합 및 M28 OSnative 저장/덮어쓰기/SaveAs/handle재열기는 미검증으로 남긴다. 완료 항목 M03/M06/M22/M23를 포함해 총38/40.

## 2026-10-08 사용자 검수 범위 제외 및 목록 해소

사용자가 실제 OS 조작 검수에 대해 “그럼 그건 빼”라고 명시했다. M09 실제 IME 조합 및 M28 OS 저장창/native handle 검수만 완료 범위에서 제외하고 기존 구현·집중 검사·실제 fallback 및 보호 흐름 근거를 유지했다. 나머지38 항목은 이미 완료·독립 수락됐으며 M09/M28도 제외 후 미완료 요구0으로 목록을 닫았다. 제외한 실제 검수의 성공을 주장하지 않는다. 최종 목록40개/미완료0.
