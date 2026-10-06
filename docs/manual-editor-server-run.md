# Manual 에디터 파일 host 실행·검증

Node 22 이상을 사용한다. 기존 Core/Theme 0.4.3·React 및 PDF용 Playwright/Chromium은 선택한 runtime에서 재사용한다. host 자체는 새 dependency를 요구하지 않는다. Tiptap UI 앱의 승인·빌드·실입력 검증은 별도다.

## 새 문서 또는 기존 문서 시작

에디터 dist를 먼저 빌드한 뒤 명시적인 로컬 경로를 선택한다. `launch.mjs`는 Vite dev/build용 `run.mjs`와 별개다.

```powershell
# 새 경로만 생성: 기존 폴더는 비어 있어도 거부한다.
node apps/editor/launch.mjs new <새-문서-폴더> --title "제품 사용 매뉴얼" --document-version 0.1 --runtime <설치된-LDS-프로젝트> --browser <Chromium-실행파일> --open-browser

# 기존 manual.json·자산·기록을 바꾸지 않고 연다.
node apps/editor/launch.mjs open <기존-문서-폴더> --runtime <설치된-LDS-프로젝트> --browser <Chromium-실행파일> --open-browser
```

`--ui <빌드-디렉터리>`로 고정 UI 디렉터리를 선택할 수 있고 기본은 `apps/editor/dist`다. `--port 0`은 비어 있는 loopback 포트를 고른다. 새 문서는 기존 init CLI를 고정 argument 배열·`shell:false`로 실행한다. 기존 경로·원문을 덮어쓰거나 다른 root로 바꾸는 HTTP API는 없다.

`--open-browser`를 생략하면 브라우저를 조작하지 않고 baseUrl/PID/root/sessionPath/launchFile과 실행 결과 metadata만 출력한다. 사용자가 표시된 비공개 `launchFile`을 열면 동일한 흐름으로 시작한다. `--open-browser`는 지정한 Chromium 또는 OS 기본 HTML handler로 비공개 시작 파일을 열며 URL은 파일 경로만 포함한다. launcher 프로세스는 host를 유지하고 정상 종료 시 자신의 session/start 파일과 lease를 정리한다.

비공개 `start.html`은 사용자별 OS 임시 폴더 안 `0600` 파일이다. bearer가 아닌 일회용 launch ticket을 정확한 loopback `/bootstrap/launch`에 POST body로 보낸다. 이 경로만 파일의 opaque `Origin:null`을 ticket·Host·top-level navigation 대조 후 허용한다. 다른 출처, 틀린 ticket, iframe, 재사용은 거부한다. 일반 파일 API의 Origin/Bearer 검사에는 예외가 없다.

성공한 시작 응답은 nonce로 허용된 script만으로 origin별 탭 sessionStorage에 세션을 넣고 같은 출처의 `/`를 연다. 포트를 포함한 출처별로 세션을 분리하며 인증 cookie는 발급하지 않는다. host가 index의 기존 module bundle 앞에 넣는 blocking classic `/bootstrap/session.js`는 같은 출처 script 요청에서 탭 저장소의 contract/baseUrl을 확인하고 `globalThis.__LDS_MANUAL_SESSION={contract:"lds-manual-editor-bootstrap/v1",baseUrl,token}`을 만든다. 이 receiver 응답 자체에는 token이 없으며 승인된 시작 응답만 탭 저장소를 초기화한다. UI는 이 memory token을 Authorization에 사용한다. 익명 탭이나 다른 출처/포트의 저장값은 세션을 제공하지 않는다.

D UI는 해당 global의 token을 앱 초기화 때 받아야 한다. C는 UI 파일을 수정하지 않는다. 기존 dist가 URL fragment만 읽으면 새 시작 경로를 소비하지 못하므로 D의 연결 수정·재빌드와 실제 브라우저 검증이 필요하다. 새로운 launcher는 URL query/fragment에 비밀값을 넣지 않는다. ticket/cookie/token이 들어 있는 비공개 시작 파일·network 응답·메모리를 로그·계약·화면 아티팩트에 복사하지 않는다. 이미 쓴 시작 파일을 다른 브라우저 profile에서 재사용할 수 없고 정상 인증된 같은 탭에서는 token 없는 baseUrl로 재열 수 있다. 새 탭/다른 browser profile의 연결과 브라우저 종료 뒤 재시작은 새 launcher 세션이 필요하다.

launcher만 바뀐 빠른 검사:

```powershell
node --test apps/editor/server/tests/launcher.test.mjs
```

실제 새/open 폴더·init 프로세스·기존 폴더 거부, 원본 bytes 보존, private ticket/Host/Origin/replay 경계, blocking script 순서와 memory session→Bearer API 연결, API cookie 비인증, 실제 CLI metadata의 token 비노출을 검사한다. 브라우저 opener는 test double로 대체하며 실제 브라우저 동작을 검사했다고 표시하지 않는다. 기존 저장·PDF green은 동일 입력/소스/환경의 범위로만 재사용한다.

## 파일 host 직접 실행

```powershell
node apps/editor/server/host.mjs --root <소비-문서-폴더> --runtime <설치된-LDS-프로젝트> --browser <Chromium-실행파일> --ui <에디터-빌드-디렉터리> --port 0
```

`--ui`를 생략하면 API host의 상태 안내만 표시한다. `--port 0`은 비어 있는 별도 loopback 포트를 선택하므로 기존 6010 Storybook을 바꾸지 않는다. 직접 host 실행은 stdout에 token 없는 baseUrl, PID, private sessionPath만 출력한다. 이 모드는 bootstrap을 기본으로 켜지 않으며 문서 시작은 위의 launcher를 사용한다. 브라우저 UI는 `Authorization: Bearer <session>`와 same-origin 요청을 사용한다. 서버의 파일 API는 cookie나 URL query를 인증으로 사용하지 않는다.

```text
GET  /api/document
POST /api/save          {expectedRevision, document, sources?, copyReview?}
POST /api/draft         {expectedRevision, document, editorState?}
POST /api/assets        {expectedRevision, name, bytesBase64}
GET  /api/asset?src=<relative-path>
POST /api/exports       {expectedRevision, format:"html"|"pdf", mode:"draft"|"reviewed"}
GET  /api/exports/<jobId>
GET  /api/exports       # 이전/현재 job 목록; 성공·실패·중단·stale 구분
GET  /api/exports/<jobId>/file/<known-artifact>
POST /api/visual-review {expectedRevision, jobId, reviewer, outcome:"pass"|"fail", reason}
```

오류는 `{error:{code,message,details?}}`로 반환한다. 409는 외부 변경/오래된 revision/복구 충돌이고 422는 구조·자산·검토가 유효하지 않은 상태다. 401/403은 세션/origin 실패다. 저장 거부 뒤 draft로 보존할지, reload 뒤 외부 변경을 검토할지는 UI의 명시적인 사용자 동작이다. 자동 덮어쓰기나 실패 뒤 승인 표시를 하지 않는다.

이미지/iframe/download는 Authorization header를 직접 넣을 수 없으므로 UI가 인증된 fetch로 bytes를 받은 뒤 blob URL을 만든다. 파일 API URL에 token query를 추가하거나 anonymous 경로를 만들지 않는다. 생성 HTML은 자기 폰트/자산을 포함하며 편집 UI의 CSS/스크립트를 사용하지 않는다.

검토·초안 UI 연결은 다음 반환 값을 사용한다. `/api/document.draft`는 `{document, editorState, baseRevision, savedAt}`이며 복원은 편집 상태에 넣는 명시적인 동작이다. draft를 읽었다고 정본을 자동 덮어쓰지 않는다. `/api/save`에 현재 document와 명시적인 copyReview object를 함께 보내면 기록을 보존·저장하고 `review.copy.{current,errors}`를 다시 계산한다. 미완료 기록도 보존할 수 있으나 current로 자동 승격하지 않는다.

검토 후 출력 순서는 정본/문구 검토 기록 저장 → 새 revision 확인 → 같은 format의 draft 출력 → 현재 성공 job 시각 검토 → reviewed 출력이다. copyReview 저장도 disk revision을 바꾸므로 그 전의 출력에 시각 검토를 기록하지 않는다. visual-review 기록 자체는 정본 revision을 바꾸지 않는다. 출력 완료 status의 `artifacts[filename].url`과 실패 `diagnostics[filename].url`은 known artifact 경로이며 모두 인증된 fetch가 필요하다.

고정 `/preview.html`에만 `frame-ancestors 'self'`와 `X-Frame-Options: SAMEORIGIN`을 적용한다. 편집 UI와 파일 API는 기존 `frame-ancestors 'none'`을 유지한다. UI의 iframe postMessage는 D가 origin/source를 확인한다. 실행 중인 Node host는 서버 파일 변경을 자동 reload하지 않으므로 해당 담당이 자신의 host 프로세스를 재시작해야 한다. 서버 헤더만 바꾸었으면 dist 재빌드는 필요 없다.

변경 범위의 빠른 서버 검사:

```powershell
node --test apps/editor/server/tests/storage.test.mjs
```

합성 fixture로 실제 HTTP 저장→host 프로세스 종료→새 host 재열기, 외부 문서/자산 충돌, 미완성 draft, 준비/부분 저장 중 프로세스 강제 종료, 손상 준비 세대 rollback, 복구 중 외부 변경 차단, 원본 바이트·동명 자산 보존, crop 실제 크기, 경로 탈출·origin/session 거부, sidecar/unknown 승인 이력과 stale 판정을 확인한다. 임시 fixture는 명시적인 테스트 임시 디렉터리에만 생성·정리한다.

출력 host 통합 검사는 별도 opt-in 실행이며 Core/Theme/runtime와 브라우저가 설치된 환경에서만 한다:

```powershell
$env:LDS_EDITOR_TEST_RUNTIME='<설치된-LDS-프로젝트>'
$env:LDS_EDITOR_TEST_BROWSER='<Chromium-실행파일>'
node --test apps/editor/server/tests/exports.test.mjs
```

독립 PDF 완료는 출력 종료 코드·동일 입력/renderer hash의 layout report와 실제 페이지 이미지를 함께 확인한다. 서버 검사 green을 Tiptap IME·키보드 접근성·전체 편집 workflow 또는 제품 승인 완료로 확대하지 않는다.
