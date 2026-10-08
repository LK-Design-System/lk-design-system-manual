# 문서 데이터와 API

`schemaVersion: 1`, `title`, 선택 `lang`(기본 ko), 선택 `cover`, `pages`를 받습니다.
문서 내용은 문자열이며 HTML을 넣지 않습니다. JSON을 읽은 후 `validateDocument`로 검사합니다.

## 제목과 허용 중첩 계약

`ManualDocument`는 h1 하나로 이름 붙인 main을 출력합니다. 표지가 있으면 기존
`cover.title`이 보이는 h1이며, 표지가 없으면 `document.title`을 시각적으로 숨긴
접근 가능한 h1으로 제공합니다. 숨긴 제목은 A4 분량이나 페이지 수를 늘리지 않습니다.
`document.title`과 `cover.title`을 강제로 동기화하거나 저장 데이터에 기본값을 넣지 않습니다.

각 페이지의 `title`은 h2 제목 바와 body를 이루고, 표지 준비 영역도 h2 하나를 갖습니다.
body 안에는 같은 제목 바를 다시 넣지 않습니다. `subheading`, 단계 제목, Callout 제목은
페이지 h2 아래의 **동급 h3**입니다. 순서상 소제목 다음에 steps가 있어도 그 단계가
소제목의 자식이 되지는 않습니다. schemaVersion 1에는 그 관계를 저장할 section 노드가
없으므로 편집기에서도 임의 h4, 자유 section nesting 또는 숨은 부모 관계를 생성하지 않습니다.
의미상 다른 하위 과업이면 페이지를 분리합니다. 단계의 자식은 text·quote·figure이며
steps는 native ol/li를 유지합니다. 정적 문서에 입력 그룹용 fieldset을 추가하지 않습니다.
columns는 그림과 기존 blocks의 배치이고 제목 계층을 추가하지 않습니다. columns 중첩은 거부합니다.

직접 React 구성 요소를 조합하는 소비자는 이 위계를 유지해야 합니다. validator가 임의 React
children을 검사하지는 않습니다. 구조 검사와 원본 자산 검사는 별개의 책임입니다.

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

위 표는 `compact` JSON 형식입니다. v2 편집기의 콜아웃은 제목 없이 본문만 작성할 수 있으며, 이 형식의 필수 `title`과 구분합니다.

`figure`는 steps·columns 안에서도 같은 필드를 사용합니다. `compact`는 두 장의
가로 화면을 배치할 때 사용하는 151mm 폭입니다. `reading`은 170mm, `full`은 본문 전체 폭입니다. 작은 글자가 읽히지 않으면 한 장씩
분리하거나 필요한 영역의 별도 확대 이미지를 준비합니다. 자르거나 축소해 내용을 숨기지 않습니다.

`previewTitle`을 지정하면 LDS 토큰의 연한 배경·1px 선·12px 여백으로 이미지를 감싸고 위쪽에 자료 이름을 표시합니다. 캡션은 프레임 밖에 둡니다. 별도 제목이 없는 일반 스크린샷은 기존 figure를 사용합니다.

`crop: {x,y,width,height,sourceWidth,sourceHeight}`는 원본 이미지 좌표의 확대 영역입니다.
좌표는 0 이상, 크기는 양수이며 원본 경계를 넘을 수 없습니다. SVG viewport로 표시하고 원본 바이트는 보존합니다.
CLI build는 `sourceWidth/sourceHeight`를 실제 원본 이미지의 intrinsic 크기와 대조합니다.
PNG·JPEG·WebP 픽셀 크기, SVG의 명시적 width/height viewport를 사용하며 불일치 또는
판별 불가이면 오류로 중단합니다. SVG의 viewBox만으로 원본 픽셀 viewport를 추정하지 않습니다.
좌표 기준은 브라우저의 `Image.naturalWidth/naturalHeight`입니다. JPEG EXIF 방향 5–8은
디코딩한 방향의 가로·세로를 사용하며, SVG 물리 단위는 96dpi CSS px로 환산한 뒤
브라우저 intrinsic 크기처럼 정수로 반올림합니다. viewBox의 내부 사용자 단위는 crop의
원본 좌표 단위가 아닙니다. width 또는 height 하나와 유효한 viewBox 비율은 나머지
viewport 크기를 결정할 수 있지만, viewBox만 있거나 퍼센트 크기만 있으면 거부합니다.
좌표를 자동 수정하지 않으며 기존 출력 파일은 실패 시 남을 수 있습니다.
PDF 경로도 포함된 crop 원본 크기를 대조합니다. React 직접 소비자는 원본 바이트 또는
호스트의 이미지 디코딩 결과로 이 대조를 수행해야 합니다. `validateDocument`는 파일을 읽지 않습니다.
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
