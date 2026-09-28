# 문서 데이터와 API

`schemaVersion: 1`, `title`, 선택 `lang`(기본 ko), 선택 `cover`, `pages`를 받습니다.
문서 내용은 문자열이며 HTML을 넣지 않습니다. JSON을 읽은 후 `validateDocument`로 검사합니다.

## 페이지

- `cover`: `title`, `metadata: [{label,value}]`, `blocks`, 선택 `sectionTitle`, 선택 `logo: {src,alt}`.
- `pages[]`: `title`, 선택 `lead`, `blocks`.
- 문서 정보는 한 줄에 label/value 두 쌍(20%/30%/20%/30%)을 배치합니다. 홀수 항목의 마지막 값은 남은 칸을 합칩니다.
- 페이지 번호는 표지 포함 실제 배열 순서에서 계산합니다. 임의 번호를 내용에 쓰지 않습니다.
- 회사 매뉴얼 표지는 제목 위에 공식 로고를 배치합니다. 공개 예제에도 브랜드를 유지합니다.
- CLI에서 `cover.logo`의 `src`에 `@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg`,
  `alt`에 `LK ROBOTICS`를 지정하면 설치된 LDS Theme의 공식 로고를 포함합니다.
  로고 파일을 복제해 별도로 관리하지 않습니다. React 직접 소비 시에는 호스트에서 해당
  패키지 자산을 URL로 resolve하여 `src`에 전달합니다.
- 표지는 큰 장식 여백 없이 문서 정보와 시작 안내를 배치합니다.
- 한 페이지에 다 못 담으면 `pages`에 새 페이지를 추가하고 `steps.start`를 이어 줍니다.

## 블록

| type | 필드 |
|---|---|
| quote | `text` — 실제 LDS Core Blockquote로 요청문·인용문을 감쌉니다. 줄바꿈은 문단으로 보존합니다. |
| paragraph | `text` |
| subheading | `text` — 페이지 안의 하위 제목 |
| address | `value` — 주소/식별 문자열을 별도 행에서 강조 |
| list | `items: (string / {label,value,emphasis?,labelEmphasis?})[]` |
| steps | `items: [{title,text?,quote?,figure?}]`, 선택 `start`(양의 정수) |
| figure | `src`, `alt`, `caption`, 선택 `size: full / reading / compact`, `previewTitle`, `crop` |
| table | `label`, `headers: string[]`, `rows: string[][]` |
| callout | `title`, `text`, 선택 `tone: signal / positive / cautionary / negative / offline` — 제목이 있는 보충·선택·예외 안내. [역할별 기준](agent-skills/lds-manual/references/layout.md#단계보조-안내콜아웃의-선택) |
| help | 기존 입력 호환용 별칭. `callout`과 동일하게 렌더링하며 새 문서에서는 `callout`을 사용 |
| columns | `figure`, `blocks` — 왼쪽 세로 화면, 오른쪽 설명. 중첩 columns 금지 |

`figure`는 steps·columns 안에서도 같은 필드를 사용합니다. `compact`는 두 장의
가로 화면을 배치할 때 사용하는 151mm 폭입니다. `reading`은 170mm, `full`은 본문 전체 폭입니다. 작은 글자가 읽히지 않으면 한 장씩
분리하거나 필요한 영역의 별도 확대 이미지를 준비합니다. 자르거나 축소해 내용을 숨기지 않습니다.

`previewTitle`을 지정하면 LDS 토큰의 연한 배경·1px 선·12px 여백으로 이미지를 감싸고 위쪽에 자료 이름을 표시합니다. 캡션은 프레임 밖에 둡니다. 별도 제목이 없는 일반 스크린샷은 기존 figure를 사용합니다.

`crop: {x,y,width,height,sourceWidth,sourceHeight}`는 원본 이미지 좌표의 확대 영역입니다.
좌표는 0 이상, 크기는 양수이며 원본 경계를 넘을 수 없습니다. SVG viewport로 표시하고 원본 바이트는 보존합니다.
확대 이미지만으로 원본 내용이 모두 보인다고 설명하지 않습니다. 전체 비교와 확대 영역의 관계를 캡션으로 알립니다.

단계의 `quote`는 설명 뒤, 그림 앞에 실제 Core Blockquote로 렌더링합니다. `labelEmphasis`는 목록의 항목 이름, `emphasis`는 값을 굵게 표시합니다.

## React export

`ManualDocument`가 권장 진입점입니다. 다음 구성 요소도 export합니다.

- `ManualCover({cover,number,total})`
- `ManualPage({title,lead,children,number,total,cover})`
- `ManualSectionTitle({children})`
- `ManualSteps({items,start})`
- `ManualFigure({src,alt,caption,size,previewTitle,crop})`
- `ManualTable({headers,rows,label})`
- `ManualMetadata({items})`
- `ManualAddress({value})`
- `ManualQuote({text})`
- `ManualCallout({title,text,tone})`

상위 document validator는 제목·대체 텍스트·표 열 수·블록 종류를 확인합니다.
제품 정보의 정확성·상태 의미·실제 버튼명은 검증하지 못합니다.
CSS, 이미지 경로, LDS peer의 호스트 초기화는 React 소비 프로젝트가 책임집니다.
