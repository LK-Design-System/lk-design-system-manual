---
name: lds-manual
description: Create and refine compact A4 product user manuals with LDS Manual, using product source material and screenshots to produce HTML and PDF. Use for installation and usage manuals or LDS manual templates; not presentation decks or product application UI.
---

# LDS Manual 작성

제품에서 승인한 내용과 화면을 `@lk-design-system/lds-manual`의 문서 데이터로 구성한다.
이 스킬은 내용의 정확성과 인쇄 매체의 배치를 함께 다룬다.

## 시작

1. 기존 매뉴얼·제품 설명·스크린샷에서 사용자, 목표, 적용 버전을 파악한다.
   추측한 동작·보안 영향·계정 정책을 사실처럼 추가하지 않는다.
2. [레이아웃 규칙](references/layout.md), [라이팅 규칙](references/writing.md)을 읽는다.
   데이터/API는 패키지의 [document-format](../../document-format.md)을 따른다.
3. 기존 문서 수정이면 사용자가 채택한 구성과 문구를 유지하며 필요한 부분만 바꾼다.
   `compact`는 매뉴얼 프리셋이며 모든 LDS UI의 전역 규칙이 아니다.

## 작성과 출력

- 새 문서는 `lds-manual init <새 디렉터리> --title "문서 제목"`로 시작한다. 기존 경로를 덮어쓰지 않는다.
- `examples/compact.json`과 `examples/gallery.json`을 구성 참고로 삼고 제품 자료는 소비 프로젝트에 둔다.
- `sources.json`에 원본·이미지 출처·확인 버전·검토 상태를 기록한다. 내부 근거는 출력물에 포함하지 않는다.
- 회사 매뉴얼의 `cover`에는 공식 로고·짧은 제목·문서 정보 표·준비사항을 둔다. 기존 표지의 로고를 일반화 과정에서 누락하지 않는다. 각 본문 페이지에는 한 과업을 담는다.
- steps에 행동·설명·그에 맞는 화면을 묶는다. Callout에는 의미 있는 제목을 붙인다.
- 짧은 보조 안내는 관련 설명 바로 뒤에 둔다. 본문 아래에 제목 한 줄만 남기지 않는다.
- HTML 생성: `lds-manual build <document.json> --out <manual.html>`.
- PDF 생성: `lds-manual pdf <manual.html> --out <manual.pdf>`.
- 필요한 경우 `--runtime <LDS가 설치된 프로젝트>`와 `--browser <Chromium 경로>`를 사용한다.
  자동 설치나 다른 프로젝트의 의존성 변경을 전제하지 않는다.

## 분량과 마감

- 출력기가 넘침을 보고하면 문장 중복 → 불필요한 여백 → 단계 경계 분할 순서로 검토한다.
  글자·화면을 읽기 어려울 만큼 줄이거나 overflow를 숨겨 통과시키지 않는다.
- 폰트와 이미지를 기다린 출력물을 페이지별로 렌더링해 제목·줄바꿈·캡션·표·페이지 번호를 본다.
  레이아웃 리포트 통과는 내용 정확성이나 시각 품질을 대신하지 않는다.
- 버튼명·계정명·파일명·버전과 각 설명의 화면이 일치하는지 대조한다.
- 결과를 전달할 때 바꾼 점, 확인한 범위, 미확인 제품 동작을 구분한다.

## 공개 자산 경계

공유 패키지에는 일반 규칙과 가상 예제만 둔다. 고객명·서버 주소·운영 기록·실제 화면은
제품 문서 소유 경로에 둔다. 문서 작성 요청은 공개 업로드나 레포 push의 승인으로 확대하지 않는다.
