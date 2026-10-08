# Outline menu anchor — 最小 증분 native 조건

상태: source concern S01. 제품/native 확정 실패가 아니다. QA parent의 toolbar 본문속성 변경 후 exact source refreeze 및 UI owner의 native lease를 기다린다. PM/kernel/JSX/CSS/build/server/원탭/IDB 변경0.

## 준비 및 귀속

- UI owner가 승인한 격리 memory QA 탭만 사용. source SHA, QA JS/CSS asset SHA, viewport width/height와 zoom=실제 관측값을 먼저 기록.
- 기존 `manual-large-document.manual.json`50쪽/SHA c10d23a4e85f6a525a72b556439ae7527301a452defd38596b5ed9171fd5509b 사용. fixture는 재생성하지 않는다.
- 현재 구 제품 Dwdc/CQh에서는 outline 페이지 메뉴가 없으므로 이 concern을 재현할 수 없다. 새 QA bundle이 확인되기 전 제품에서 시도하지 않는다.

## A: 목차 scroll 시 anchor 귀속

1. 1280×900, outline 켜기. 목차 ol의 마지막50번째 행이 보이도록 nav만 scroll. 본문/사용자 문서 조작0.
2. 50쪽 `페이지 작업` 버튼으로 menu 열기. targetId, button rect, menu rect, nav rect, main rect, nav.scrollTop, 현재 focus를 기록하고 pixels 저장.
3. pointer가 nav 안에 있는 상태에서 약100~160px wheel을 한 번 실행. 버튼이 화면 안에서 y를 이동하는 조건과 화면 밖으로 사라지는 조건을 구분.
4. 다음 frame 이후 같은 rect와 nav.scrollTop을 기록. menu가 대상에 따라 이동/닫힘인지, 기존좌표에 고정되는지 확인. 메뉴 내부 wheel은 이 case에서 사용하지 않음.
5. 실패 확정 기준: nav.scrollTop과 target button y가 변했으나 popup은 기존 y이고 대상근접성이 상실됨(특히 target이 nav 밖인데 menu만 잔존). 문서 편집/선택 변화는 별도 확인하고 이 현상을 데이터 유실로 표현하지 않는다.
6. Escape로 닫고 복귀 focus=원 trigger인지, 화면 안 가시인지 기록. target이 offscreen이면 focus에 따른 scroll 복귀가 있는지 구분.

기대: 대상 근처 위치 재계산 또는 대상 가림 시 닫힘. 실제 pixels+전후 rect가 없으면 source concern 그대로 유지.

## B: resize와 좁은 높이

1. 위 menu가 열린 wide 상태에서 승인 viewport를 390×844로 변경. media에 의해 outline/inspector가 닫히는지와 outline-origin menu 잔존 여부를 함께 기록.
2. 실패 확정 기준: trigger와 outline이 사라졌는데 menu만 남아 대상 근접성/복귀가 불가능한 경우. popup이 viewport 안이라는 이유만으로 pass하지 않음.
3. 새로운 독립 시작 상태에서760×480 또는390×480을 확인. menu/list/search/close의 rect, scrollHeight/clientHeight, 활성 item rect와 bounds를 기록. 영역이 부족해 닫혔다면 close 동작을 pass와 구분해 기록.
4. 단순 wide↔narrow resize 기존 green은 반복하지 않는다. 새 outline-origin 잔존과 새 toolbar 때문에 달라지는 가용 main 높이만 확인한다.

## C: dismiss/focus

- menu 닫기 버튼, Escape, Tab 각각 원 outline trigger에 focus 복귀/가시성. native returnFocus.isConnected=false이면 editor fallback임을 구분.
- outside pointer는 restoreFocus=false 계약이므로 trigger focus 복귀를 요구하지 않음.
- 메뉴로50쪽 작업 실행은 이 concern 검증에 불필요. 구조 작업 실행/Undo/PM 변경 없이 anchor/닫기만 점검.

## 결과 최소 형식

source/runtime/bundle/viewport/시작tab lease, case A/B/C, before/after targetId/buttonRect/menuRect/navRect/navScrollTop/focus, screenshots, actual/expected, priority, 문서·selection 변화 여부, 환경 제외를 한 JSON/text에 기록. root와 해당 단독 writer에게 확정 실패만 즉시 공유한다.

OS IME·touch·200% browser zoom·PDF·external clipboard·held pointer autoscroll은 이 case 수락 범위가 아니다.
