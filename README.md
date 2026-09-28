# LDS Manual

`@lk-design-system/lds-manual` · `0.1.0-alpha.1` · alpha

LDS 시리즈의 **사용 매뉴얼 매체**. 컴팩트 A4 페이지, 단계·화면·캡션의 읽기 순서,
문서 정보 표, 페이지 번호, HTML/PDF 출력과 작성 스킬을 함께 제공합니다.
공개용 예제는 가상 앱이며 실제 고객 화면·계정·운영 기록을 포함하지 않습니다.

## 소유 경계

| 소유자 | 책임 |
|---|---|
| LDS Core/Theme | 폰트·색상·간격·곡률·타입 램프, 실제 Callout |
| LDS Manual | A4 지오메트리, 매뉴얼 역할별 토큰 매핑, 구성·출력·분량 초과 처리 |
| 제품 문서 | 문구·스크린샷·버튼명·계정·주소·버전·승인·배포 대상 |

컴포넌트의 스타일은 `.lds-manual` 아래에 한정합니다. 자체 토큰은 `--manual-*`만
정의하며 Core 토큰을 재정의하지 않습니다. 독립 HTML 생성기는 문서의 폰트 호스트로서
Core/Theme 자산을 가져와 포함합니다. Callout은 Core 컴포넌트를 직접 렌더링합니다.
문서의 정적 정보 표는 인쇄용 native table이며 제품의 interactive data grid를 대체하지 않습니다.

## 빠른 시작

Node 22 이상과 **동일 버전 LDS Core/Theme 0.2.9**, React 18/19가 필요합니다.
PDF 출력과 렌더링 회귀 검사에 Playwright와 Chromium이 필요합니다. 자동 설치·브라우저 다운로드는 하지 않습니다.
소스는 [GitHub 공개 저장소](https://github.com/LK-Design-System/lk-design-system-manual)에서 관리합니다.
현재 패키지는 `private: true`인 알파로, 패키지 레지스트리에 발행되지 않았습니다.
의존성은 peer로 선언하며 이미 설치된 프로젝트를 `--runtime`으로 재사용할 수 있습니다.

```bash
# 새 문서 디렉터리 생성 (기존 디렉터리에는 생성하지 않습니다)
node bin/lds-manual.mjs init ./new-manual --title "제품 사용 매뉴얼"

# LDS가 설치된 소비 프로젝트의 경로. 절대 경로 또는 현재 위치 기준 상대 경로.
node bin/lds-manual.mjs build examples/compact.json \
  --runtime ../lk-design-system --out output/compact.html
node bin/lds-manual.mjs pdf output/compact.html \
  --runtime ../lk-design-system --browser /usr/bin/google-chrome \
  --out output/compact.pdf
```

브라우저가 Playwright 기본 위치에 설치돼 있으면 `--browser`를 생략합니다.
다른 환경에서는 해당 환경의 Chromium 경로를 지정합니다. `--runtime`을 생략하면
이 패키지에서 정상 Node 모듈 탐색으로 peer를 찾습니다. 기존 프로젝트의 의존성을 바꾸지 않습니다.

HTML은 이미지·폰트를 포함한 단일 파일입니다. 폰트 라이선스가 옆에 출력되므로 함께 보관합니다.
제품 이미지 경로는 JSON 파일 디렉터리 안의 상대 경로만 허용합니다.
회사 로고는 예제처럼 LDS Theme의 공식 패키지 자산 참조를 사용합니다.
외부 URL 다운로드와 임의 HTML 삽입은 지원하지 않습니다.
SVG도 신뢰하는 자체 제작/승인 자산만 사용합니다.

PDF 출력기는 인쇄 모드·폰트·이미지를 기다리고 콘텐츠 영역을 측정합니다.
넘치거나 이미지가 없으면 `.layout.json`을 남기고 새 PDF를 만들지 않습니다.
실패 시 이전 PDF가 남아 있을 수 있으므로 종료 코드와 리포트를 확인합니다.
자동 축소·자동 페이지 분할은 없습니다. 작성자가 단계 경계에서 분리합니다.

## React 소비

호스트에서 LDS Core → Theme → Manual 순서로 CSS와 폰트를 적용합니다.
인쇄 문서는 밝은 테마를 사용하며 앱의 어두운 테마와 별도 출력 표면으로 구성합니다.

```jsx
import '@lk-design-system/lds-core/styles.css';
import '@lk-design-system/lds-theme/styles.css';
import '@lk-design-system/lds-manual/styles.css';
import { ManualDocument, validateDocument } from '@lk-design-system/lds-manual';

const document = validateDocument(manualData);
export default function Manual() {
  return <ManualDocument document={document} />;
}
```

## 안내 문서

- [구성 요소 예제집](examples/gallery.json)
- [원본 자료와 검토 기록](docs/source-records.md)
- [출력·배포·의존성 안내](docs/output-and-release.md)
- [회귀 검사](docs/regression-checks.md)
- [변경 기록](CHANGELOG.md)
- [라이선스](LICENSE) · [별도 자산 고지](THIRD_PARTY_NOTICES.md)
- [문서 데이터와 API](docs/document-format.md)
- [컴팩트 구성 규칙](docs/agent-skills/lds-manual/references/layout.md)
- [라이팅·내용 검토](docs/agent-skills/lds-manual/references/writing.md)
- [작성 스킬](docs/agent-skills/lds-manual/SKILL.md)
- [기존 템플릿 이관 대조](docs/template-parity.md)
- [AI 진입점](llms.txt)
- [실행 가능한 가상 예제](examples/compact.json)

## 상태와 한계

첫 프리셋은 `compact` 하나입니다. 모바일 웹앱 레이아웃이 아닌 고정 A4 인쇄 미리보기이며,
좁은 화면에서는 가로 스크롤로 원래 크기를 읽습니다. PDF는 배포용 정적 파일이고
PDF/UA·태그 구조·스크린 리더 접근성 인증을 제공하지 않습니다. 접근성 설명과 native
제목·표 구조는 HTML에 보존합니다. 실제 제품에 쓰기 전 버튼·권한·동작을 제품 소유자가 확인합니다.

데이터/init과 템플릿 회귀 검사를 제공합니다. CI·Storybook 배포·패키지 발행은
아직 구성하지 않았습니다. 현재 버전은 알파입니다.
