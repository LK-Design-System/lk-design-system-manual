# LDS Manual

`@lk-design-system/lds-manual` · `0.1.0-alpha.1` · alpha

LDS 시리즈의 **사용 매뉴얼 매체**. 컴팩트 A4 페이지, 단계·화면·캡션의 읽기 순서,
문서 정보 표, 페이지 번호, HTML/PDF 출력과 작성 스킬을 함께 제공합니다.
공개용 예제는 가상 앱이며 실제 고객 화면·계정·운영 기록을 포함하지 않습니다.

## CI·릴리스 실행 위치

다른 PC의 checkout은 실행 호스트 변경 승인이 아니다. 개발은 로컬 미리보기·빠른 검사,
패키지 릴리스는 **server04의 자격검증된 저장소 전용 격리 VM**으로 구분한다.
기존 자동 CI는 아래 현행 경로를 유지한다. 전체 검증을 현재 PC로 fallback하거나 새
VM/runner를 자동 등록하지 않는다. 상세 규칙은 [AGENTS.md](AGENTS.md#ci릴리스-실행-호스트-필수)를 따른다.

output-parity는 기존 self-hosted `lk-authoring-output` runner를 사용한다. 이 label만으로 물리 호스트가 server04라고 단정하지 않는다. 기존 등록 이관은 별도 승인 사항이다. 현재 alpha는 private package이며 registry publish는 구성되어 있지 않다. 요청한 문서 한 건의 HTML/PDF 출력·레이아웃 검수는 저작 작업으로 허용하며, 전체 회귀·릴리스 검증과 구분한다.

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

Node 22 이상과 **동일 버전 LDS Core/Theme 0.4.3**, React 18/19가 필요합니다.
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

## 저작 제품 분리

사용자가 실행하는 저작 제품의 canonical source는 `$LK_WS/authoring/lk-editor`입니다.
LK Docs는 일반 문서 저작 제품이며 매뉴얼은 하나의 프로필입니다. 현재 동작하는 구현은
기존 Manual 프로필이며 새 LK Docs의 일반 문서 기본 흐름도 구현·합성 검증했습니다. LK Slides는 준비 단계입니다.
LDS Manual은 A4 매체·출력·토큰·작성 규율을 계속 소유합니다.

현재 원 `apps/editor`는 44589 origin 전환까지 동결된 transition source입니다.
새 구현을 이 위치에서 병행 개발하지 않습니다. 파일 형식·IDB를 이름 변경 때문에 바꾸지 않습니다.
새 제품의 실행과 검증은 [LK Editor](../../authoring/lk-editor/README.md)을 따릅니다.
아래의 기존 편집기 검증·계획 기록은 추출 전 근거이며 신규 제품 구현 완료를 뜻하지 않습니다.

## 안내 문서

- [문서 인덱스 · 에디터 실행 계획](docs/README.md)
- [로컬 에디터 실행·검증](docs/manual-editor-server-run.md) · [저장·복구 계약](docs/manual-editor-storage.md) · [편집 모델 계약](docs/plans/manual-editor-model-contract.md)

화면 개편 전 빌드에서 로컬 에디터의 핵심 저작 흐름을 확인했습니다. 새 문서·재시작, 데이터 보존,
단계 이동·분리, 표·목록 조작, 초안·충돌 보호, 검토 기록과 PDF 출력 등 합성 브라우저 시나리오
11개가 통과했습니다. 이미지 오류에서 해당 그림의 수정 속성으로 이동하도록 보완했고,
3쪽 독립 PDF의 A4·한글 폰트·페이지 번호·시각 배치도 확인했습니다.
실제 OS 한글 IME와 제품 시범 문서 검수는 남아 있어 전체 MVP 완료로 표시하지 않습니다.
검증 명령과 범위는 [실행 안내](docs/manual-editor-server-run.md#최신-빌드의-브라우저-저작-흐름-검사),
현재 근거와 잔여 항목은 [실행 계획](docs/plans/manual-editor-plan.md)을 따릅니다.

- [기존 매뉴얼 재디자인 안내 · 재생성 가능한 6쪽 예제](examples/authoring-guide/README.md)

- [라이팅 검토와 완료 조건](docs/copy-review.md)

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

에디터는 현재 **A4에서 직접 입력 → 단계·스크린샷 추가 → 저장·다시 열기**으로 사용 동선을 개선 중입니다.
[새 화면의 검증 범위](docs/plans/manual-editor-plan.md#문서-중심-사용-동선-개선--2026-10-06)는 이전 빌드의 전체 흐름 검사와 구분합니다.

신규 v2 저작 화면은 `/manual.html`에서 **단일 문서 편집, `/` 삽입·블록 메뉴, 제목·체크리스트·토글·코드,
다중 블록 선택**을 제공합니다. 기본 `/`도 이 화면으로 연결하며 기존 v1은
`/index.html?legacy=1`에서 엽니다. 상단은 문서 제목, 저장 아이콘, 문서 메뉴로 구성합니다.
별도 A4 보기 모드는 제거하고 문서 메뉴에서 인쇄합니다.

저장 파일은 `.manual.json`입니다. 파일 API를 지원하는 브라우저에서는 `열기…`로 파일을 선택하고,
최초 저장·다른 이름으로 저장에서 위치를 선택한 뒤 같은 파일에 저장합니다. 브라우저의
자동 복구본은 파일 저장과 구분하며, 다운로드 대체 동작은 파일에 저장됐다고 표시하지 않습니다.
이 저장 경로의 모델·연결 검사는 통과했지만 실제 OS 파일 선택·권한·디스크 저장 수락은 남아 있습니다.

이전 후보에서는 50쪽 문서의 입력·실행 취소·자동 복구·재열기·파일 보관을 확인했습니다.
그 근거를 변경된 표지·표·저장 기능의 전체 수락으로 확대하지 않습니다. 현행 기능별 증거와
잔여 검수는 [목표 완료 점검](docs/plans/manual-editor-ui-audit.md#현행-계약과-목표-완료-점검)을 따릅니다.
병렬 논의와 과거 구현·실기 결과, 실제 OS 한글 입력기·모바일 등 남은 검증은
[노션 기본 편집 수락](docs/plans/manual-editor-redesign.md#14-노션-기본-편집-목표와-수락--2026-10-07)에 기록합니다.
