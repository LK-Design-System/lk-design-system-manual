# 기존 매뉴얼을 LDS로 재디자인하기

사용자가 만든 PDF/PPTX를 첨부하고, 대표 쪽의 시안을 검토한 뒤 전체에 적용하는 **6쪽 가상 예제**입니다.
`manual.json`이 문구·구성의 정본입니다. 출력 HTML을 직접 수정하지 않습니다.

이 예제는 LDS Core 0.4.3의 `variant="bordered"` 및 `radius="body"` 옵션을 사용합니다. 해당 버전의 Core/Theme가 설치된 런타임으로 생성합니다.

## 재생성

저장소 루트에서 실행합니다. Core/Theme 0.4.3와 React가 설치된 프로젝트를 `--runtime`으로 지정합니다.

```bash
node scripts/check-copy-review.mjs examples/authoring-guide/manual.json examples/authoring-guide/copy-review.json
node bin/lds-manual.mjs build examples/authoring-guide/manual.json --runtime ../lk-design-system --out output/authoring-guide/manual.html
node bin/lds-manual.mjs pdf output/authoring-guide/manual.html --runtime ../lk-design-system --browser /usr/bin/google-chrome --out output/authoring-guide/manual.pdf
```

브라우저 경로는 환경에 맞게 바꿉니다. 먼저 HTML을 검토하고, 승인한 문서에서 PDF를 생성합니다.
HTML과 PDF는 같은 A4 구성·페이지 순서를 사용합니다. 넘침이 있으면 PDF 생성을 중단합니다.

## 연습 자료

`practice/`의 다음 파일을 함께 첨부합니다.

- `rough-manual.pdf`: 가상 앱의 러프한 원본 2쪽
- `redesigned-manual.pdf`: 같은 앱 화면을 사용한 LDS 적용 예시 2쪽
- `lds-redesign-guide.txt`: 원본 보존, 구성, 라이팅 기준

요청문은 매뉴얼의 ‘재디자인 요청하고 시안 확인하기’에서 복사합니다.
`Pretendard-LICENSE.txt`는 PDF와 함께 보관합니다.

예시 화면은 이 저장소의 가상 앱 자산으로 로컬 제작했습니다. ChatGPT가 실제 생성한 결과나 고객 화면이 아닙니다.
ChatGPT의 파일 첨부·출력 기능은 사용 환경에 따라 달라질 수 있습니다. Chat에서 이 자료를 이용한 전체 재디자인 실행과 편집 가능한 PPTX 생성은 검증하지 않았습니다.

## 구성과 검토

- 문서 프레임: `figure.previewTitle`
- 같은 영역의 확대: `figure.crop` (원본 전체 비교도 함께 제공)
- 단계 안의 요청문: `steps.items[].quote`
- 보충·선택·예외 안내: 실제 LDS Core Callout
- 문구 검토: `copy-review.json` — 에이전트 자체 검토이며 제품 승인 아님
- 출처: `provenance.json` — 공개 가능한 가상 자료만 기록

제공 기준 텍스트에 포함한 레이아웃·라이팅 규칙을 바꿀 때는 `practice/lds-redesign-guide.txt`도 함께 갱신합니다.
생성된 HTML/PDF와 로컬 검사 결과는 `output/`에 두고 커밋하지 않습니다.
