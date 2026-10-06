# Manual Storybook

Manual의 공개 React 구성 요소·A4 템플릿·합성 예제·출력 전 검토 상태를 로컬에서 탐색합니다.
실제 문구와 예제 JSON은 `examples/` 및 `docs/document-format.md`를 재사용합니다.
원본 자료·검토 기록은 Storybook의 정적 자산 디렉터리에 포함하지 않습니다.

## 실행

Node 22 이상에서 기존 LDS 환경의 검증된 도구를 재사용할 수 있습니다.

```bash
npm run storybook:dev -- --runtime <LDS와-Storybook이-설치된-프로젝트>
npm run build:storybook -- --runtime <LDS와-Storybook이-설치된-프로젝트>
```

기본 주소는 `http://127.0.0.1:6010`입니다. 이미 사용 중인 포트에는 덮어 실행하지 않습니다.
`--port`로 다른 로컬 포트를, 빌드의 `--out`으로 출력 디렉터리를 지정할 수 있습니다.
기본 정적 출력은 `output/storybook/`입니다. 기존 서버·브라우저·의존성을 자동 변경하지 않습니다.

새 환경은 LDS GitHub Packages 접근 설정으로 Core·Theme 0.4.3을 설치하고, 이 저장소의
정확한 devDependencies와 lockfile을 사용합니다. 자격증명은 문서·로그에 남기지 않습니다.
lockfile은 소비자가 제공하는 peer 패키지를 제외해 생성했습니다. 같은 설치 모드를 사용합니다.

```bash
npm ci --ignore-scripts --legacy-peer-deps
npm install --no-save --package-lock=false --legacy-peer-deps @lk-design-system/lds-core@0.4.3 @lk-design-system/lds-theme@0.4.3
```

정상 설치 후에는 `--runtime` 없이 실행할 수 있습니다. Playwright·Chromium은 Storybook 실행에 필요하지 않습니다.

## 범위

| 그룹 | 내용 |
|---|---|
| 시작하기 / 데이터와 API | init·HTML·PDF 출력 진입점, 실제 문서 스키마와 공개 API |
| Templates | A4 표지·본문·여러 쪽 조합 |
| Components | 섹션 제목·단계·그림·캡션·표·metadata/address·Core Callout·Core Blockquote |
| Examples | compact 4쪽, gallery 6쪽, authoring-guide 6쪽 |
| Review States | 본문 분량 초과·그림 누락·긴 문자열 |

A4 210×297mm와 원래 글자 크기를 유지합니다. 좁은 화면의 가로 스크롤은 의도된 계약입니다.
넘침·누락 자산 예시는 완료된 출력으로 전달하지 않습니다. 제품 원문 검토·PDF 출력 검증·
접근성 인증·패키지 발행·CI·공개 Storybook 배포는 각각 별도입니다.

Core·Theme 및 실제 공개 API를 재사용하며 공통 토큰·Callout 내부 CSS를 복제하거나 덮지 않습니다.
정적 자산에는 공식 로고와 승인된 합성 예제 그림만 연결합니다.

자료 프레임에는 `stories/ExampleProductScreen.jsx`의 실제 LDS Button·StatusBadge를
캡처한 합성 문서 목록을 사용합니다. `가상 화면` 스토리에서 원본 구성과 버튼 동작을
확인할 수 있습니다. `stories/assets/document-list.jpg`는 원본 화면 영역(640×366px)만
캡처한 정적 자료입니다. 원본 변경 후에는 글꼴 로드를 확인하고 같은 영역을 다시 캡처합니다.
기존 `examples/assets/home.svg`와 crop 좌표, 공개 전체 문서 JSON·원문 검토 기록은 유지합니다.

## 설정 근거

기존 LDS의 Storybook 10.4.6 / React Vite 구성과 정확한 버전을 재사용합니다.
구성은 공식 [React Vite 안내](https://storybook.js.org/docs/get-started/frameworks/react-vite)와
[staticDirs 안내](https://storybook.js.org/docs/api/main-config/main-config-static-dirs)를 따릅니다.
런타임을 지정하면 공개 Core export 경로·React·Storybook을 같은 호스트에서 resolve합니다.
폴더를 옮겨도 소스에 머신별 경로가 남지 않으며 임시 symlink를 만들지 않습니다.
