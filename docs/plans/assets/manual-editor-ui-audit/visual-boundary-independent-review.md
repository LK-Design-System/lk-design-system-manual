# 독립 시각·경계 재분류 — 2026-10-07

담당: 독립 시각 검증. source/CSS/build/server/원 사용자 탭/IDB/repo docs 변경 0. root 실제 인간 요청 01a1160a의 세션 추가·대기 분담 변경을 read_thread에서 확인했다. 이 보고는 반환 pixels·geometry·source 읽기 결과이며 새 native 수락이 아니다.

## 후보 귀속

| 후보 | 판정 |
|---|---|
| e752/Menu9cb | V04 빠른 wheel→첫 ArrowDown 활성 항목 비가시, V06 wide inspector→390 잔존 실패. 기존 실패 자료 유지 |
| UI130253/CSS93ff/Menu cdd5/helper0cc24 | 기존 native 수락. pending/settled visibility·resize·합성 quota 복구만 증거 범위에서 재사용 |
| 제품44589 DwdcZC6x/CQhRuthu | audit/반환 HTTP 기록상의 제품. 이번 검토에서 배포하거나 HTTP를 새로 확인하지 않음 |
| JSX5a89/CSS6e0a/canvas90f4 | 새 목차·save-status source. 구 캡처와 혼용 불가. native/build/product 미수락 |
| kernel3fdb5cf2 | 검토 도중 실제 source hash. 기존 efefe product/P1 증거와 다름. 모델 writer freeze나 native 완료를 이 hash 관측만으로 주장하지 않음 |

## 실제 pixels와 geometry를 교차 확인한 범위

`/tmp/lds-manual-visual-final-20261007`의 21,18,20,22,24,08,16,09,02 JPG를 직접 열었다. 아래 값은 기존 수락 후보의 반환 geometry이고 현재 JSX5a89의 live geometry가 아니다.

| 영역 | 실제 근거와 판정 |
|---|---|
| header/toolbar/footer | 21-shell 1065×900: header y0..64, toolbar y64..114, footer y863..900의 구획과 정렬 식별. 저장 버튼 우측, 중복 상단 작업 버튼 없음. 새 save-status 위치는 이 이미지에 없음 |
| 본문/제목 | 02 1065×900: 제목1/2/3 계층 식별. 09 390×844: navy 위 흰 페이지 제목 placeholder 식별. 고정 A4 오른쪽 잘림과 가로 scroll은 현 계약 |
| 목차 | 08 760×900: 왼쪽 약210px overlay가 본문을 가림. 이는 기존 계약이며 페이지 선택 후 닫힘 동작은 정지 이미지로 수락하지 않음. 새 28px 페이지 메뉴 target은 구 이미지에 없음 |
| 표지 | 16 1280×900: 공식 logo, 표지 제목, 정보와 section 식별. 신규 page-management에서 cover 고정/작업 허용은 별도 native 필요 |
| 메뉴 resize | 18 390×844 + delta JSON: main x0..390/y145..810, menu x62..382/y153..513,320×360. 양 panel false, 메뉴 viewport 내. 구 wide→390 실패를 해결한 최종 후보 근거 |
| 메뉴 keyboard intent | 20 + delta JSON: 활성 item y200..249, list y196.5..512. pending도 같은 경계이며 visible true. 자유 wheel은 강제 active scroll과 구분 |
| 오류복구 | 22 390×844 + quota JSON: alert 오류 band, 다시 저장/닫기 식별, overflow false, role alert·저장 실패. 실제 OS/NAS quota가 아니라 memory fixture 실패 |
| range split | 24 JPEG1280×1364는 top pages만 보여 선택4개 전체 pixels 근거가 아님. DOM/native/history/11997B 파일 증거와 별도 취급 |

위 직접 관찰 범위에서 새 확정 시각 실패는 0. 기존 P1 본문 유실은 모델 실제 재현에 근거한 별도 확정 실패이고 새 kernel source의 수정 완료를 추정하지 않는다.

## 새 concern과 우선순위

P2 검증 concern S01: 새 목차 메뉴의 대상 근접성. ManualEditor.jsx openOutlinePageMenu가 trigger rect를 anchor에 1회 저장한다. outline origin에는 getPlacementBounds가 없다. BlockCommandMenu의 document scroll callback은 getPlacementBounds가 있을 때만 설치된다. outline origin은 undefined이므로 해당 listener 자체가 없고 trigger rect도 다시 읽지 않는다. 따라서 메뉴 열린 채로 긴 목차 wheel/keyboard scroll 시 target 행은 이동해도 popup은 이전 y에 남을 가능성이 있다. 이는 source 위험으로 native 확정 실패가 아니다. 기대: 대상에 따라 이동하거나, 대상이 가려지면 닫힘. 타겟과 popup의 전후 rect 및 실제 pixels를 제출. root·목차 단독 writer/UI owner에게 전달했다.

P2 검증 공백 G01: 새 저장 cluster의 520px 이하 second row. 기존 390 image는 제목 아래 status/우측 save였으므로 새 placement를 수락할 수 없다. 390/520/521/760에서 빈·긴 문서 제목과 저장 중/충돌/실패/변경됨 text 각각, header/title/status/save rect 및 horizontal overflow를 확인. status와 save 간 가시 간격, 입력 제목의 접근 가능한 너비가 기대.

P2 검증 공백 G02: 긴 목차/50쪽/자동 tails/한쪽·양쪽 panel. 새 2행 clamp와28px target은 소스만 있다. 50번째 행 접근·50쪽 현재 강조·복귀 focus 가시성, cover와 plain page의 유효 명령, automatic root/tails의4 구조 명령 disabled를 구분한다. plain native green을 auto logical-group 수락으로 확대하지 않는다.

P2 검증 공백 G03: narrow height. 반환 최종 JPG는 주로900/844 높이이며360/480 높이의 새 menu/list/복구 buttons가 모두 접근 가능한 증거가 없다. 390×480/760×480에서 메뉴 전체 크기와 scrollable list, footer/error band, 열기/닫기/resize 이후 main 남은 높이를 측정. 영역 부족 시 menu가 숨김/닫힘이면 close 이유와 선택 보존 기록.

## 증분 native 체크리스트

1. UI owner가 source freeze·QA bundle SHA·탭/viewport lease를 전달한 뒤만 native 실행. 새 build/server 실행0. 기존 green은 재실행하지 않음.
2. 1280 wide: 새 outline row와 페이지 작업 위치, 저장 status proximity, manual/cover/auto-root/tail의 command states. one/both panels에서 메뉴가 의도한 target 가까이 가시.
3. 760 및390: overlay 페이지 탐색 후 닫힘·본문 노출, Escape/Tab focus 복귀, 긴 제목 row와28px 메뉴 target 구분, save status second row와 실패복구.
4. 50쪽: 마지막행 menu→nav wheel/keyboard scroll→actual target/menu rect. selected/editing marker는 실제 보이는 page와 구분해 기록. 반복 tails labels가 동일해도 targetId 귀속 증거 유지.
5. height480: popup bound와 list/item visibility, resize 전후 close 상태. 너비520↔521의 저장 cluster 경계만 증분 확인.
6. P1은 model/UI native 담당이 수행. 이 세션은 head/tail 본문·반복 title·전체 text·Undo/Redo 반환 DOM/capture를 독립 review하고 구현하지 않음.

## 준비된 합성 fixture

fixture-index.json에 existing fixture의 path/bytes/SHA/pages를 기록했다. large50(251809B), page-controls3(4324B), range-flow3(10767B), pagination8(181920B). 새 fixture generator 실행/파일변경0. 기존 자료를 사용하고 긴/빈 title은 명시 memory 탭에서만 변경한다. OS IME/touch/200% browser zoom/forced-colors/외부 clipboard/PDF/held-pointer Escape/reverse split은 해당 실제 근거 없이 수락하지 않는다.

## 명령·제약

read_thread(실제 인간 요청), cat/sed/rg(지침/audit/source), sha256sum 및 Python hashlib/JSON(파일 귀속), view_image9(실제 반환 pixels)를 실행. static seam/full suite/build/서버/브라우저 조작0. source-sha.json은 검토 시점만 나타내며 owner freeze를 대신하지 않는다. 작성한 자료는 이 /tmp 디렉터리의 report/manifest뿐이다.
