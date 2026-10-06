# Manual 에디터 로컬 저장 계약

`apps/editor/server/host.mjs`는 Node 내장 모듈로 동작하는 로컬 파일 host다. Tiptap UI와 Manual adapter는 별도 담당이며, 이 host는 Manual JSON·자산·검토 기록·독립 출력을 담당한다. dependency를 추가하지 않는다.

## 실행 경계

한 프로세스가 한 문서 폴더를 선택해 `127.0.0.1`에만 바인딩한다. 문서 루트는 시작 시 realpath로 고정하며 같은 폴더의 두 host는 `.editor/host-lock.json`의 실제 생존 PID로 차단한다. 종료된 PID의 lease만 다시 얻는다. 다른 프로그램이 같은 PID를 재사용하면 자동으로 lease를 지우지 않으며 수동 확인이 필요하다.

Host/Origin과 `Sec-Fetch-Site`를 대조하고 모든 `/api/` 요청에 시작마다 달라지는 bearer session을 요구한다. 변경 요청에는 JSON과 명시적인 같은 origin이 필요하다. CORS·임의 shell·파일 탐색·루트 변경 API는 없다. startup session은 사용자별 OS 임시 폴더의 별도 비공개 파일에 기록한다. 정상 종료 시 삭제하며 token을 로그·문서·출력물·표시 URL에 넣지 않는다. Unix는 directory `0700`/file `0600`, Windows는 사용자별 임시 디렉터리의 계정 ACL 상속에 의존한다. 공유 서비스로 배포하는 인증 설계가 아니다.

새/open launcher의 optional bootstrap만 비공개 시작 파일의 ticket을 POST body로 받아 파일-origin `null`에서 시작할 수 있다. 이 단일 진입점은 정확한 Host·일회용 ticket·top-level navigation을 확인하고, origin별 탭 저장소를 거쳐 같은 출처의 script에 memory session을 전달한다. 인증 cookie를 발급하지 않고 모든 `/api/` Origin/Bearer 제한은 유지한다. 상세 전달 계약과 UI 연결 범위는 [실행 안내](manual-editor-server-run.md#새-문서-또는-기존-문서-시작)에 있다.

문서/자산 경로는 상대 경로만 허용한다. `..`, 빈 segment, 절대 경로, URL, Windows drive/ADS, 역슬래시, symlink 및 root 밖 realpath를 거부한다. UI는 별도로 지정한 빌드 디렉터리의 읽기 전용 파일만 제공한다. 새 문서 선택·폴더 picker·원격 자료 다운로드는 이 host API에 없다.

## 정본, 초안, sidecar

`GET /api/document`는 문서, sources, copyReview, 초안, 유효성 및 opaque revision을 반환한다. revision은 정본/sidecar 원본 바이트와 자산의 존재·hash를 포함한다. 편집자는 이 revision을 `expectedRevision`으로 반환한다. 외부 편집이 있으면 `409 CONFLICT`이며 강제 덮어쓰기 기능은 없다.

`POST /api/save`는 기존 `validateDocument`와 원본 자산 검사를 모두 통과한 문서만 정본에 쓴다. `cover.sectionTitle` 검사와 crop 실제 크기는 공통 validator 및 `src/image-dimensions.mjs` 계약을 사용한다. 알 수 없는 object 필드를 제거하거나 optional 기본값을 주입하지 않는다. 지원하지 않는 block/schema는 출력·정본 저장을 차단한다.

`POST /api/draft`는 미완성 문서를 `.editor/draft.json`에 별도 보존한다. 마지막 정본과 정본 revision을 바꾸지 않는다. `baseRevision`으로 초안의 출발점이 현재 정본과 다른지 UI가 표시할 수 있다. Tiptap 선택 상태는 editorState에만 두며 Manual schema에 넣지 않는다.

`POST /api/validate {expectedRevision, document}`는 저장하지 않은 문서를 기존 schema·원본 이미지·crop 검증기로 확인한다. 같은 revision이면 `200 {revision, validation:{valid, errors, assets}}`를 반환하며, 잘못된 문서도 `validation.valid:false`와 실제 오류를 반환한다. `errors` 항목은 `{path, code, message}`이며 schema 오류는 정밀 경로를 꾸며내지 않고 `path:"document"`와 원래 validator 메시지를 유지한다. crop 원본 크기 불일치는 해당 figure의 `.crop` 경로와 `CROP_SOURCE`, 이미지 읽기 오류는 `.src` 경로다. `assets`는 `{path,src,sha256,dimensions}`이며 원본 bytes와 절대 경로를 공개하지 않는다.

검증은 Host/Origin/Bearer와 상대 자산 경로 제한을 그대로 적용한다. 시작 또는 검증 도중 디스크 revision/자산이 바뀌면 `409 CONFLICT`로 반환한다. 미완료 저장 journal이 있으면 복구를 실행하지 않고 `409 RECOVERY_PENDING`으로 반환한다. 이 요청은 정본·sidecar·draft·assets·generation·승인·출력 파일을 생성하거나 수정하지 않는다. 변경된 host를 재시작한 후 사용한다.

sources/copyReview를 생략하면 기존 sidecar 바이트를 그대로 보존한다. 명시한 object 업데이트는 기존 object의 생략된 필드를 유지하며 array object는 id/key 또는 같은 위치의 unknown 필드를 보존한다. 지원되는 sidecar 삭제 명령은 없다. 배열 순서/값의 명시적 수정은 반영되지만 이전 bytes는 immutable 저장 세대에 남긴다. 기존 `sources.json` 승인과 과거 검토를 새 리비전 승인으로 자동 갱신하지 않는다. 제품 승인 상태는 `recordedStatus`와 `current:false`로 구별하며 현재 제품 승인 입력 workflow는 후속 소유자 작업이다.

`checkCopyReview`의 실제 현재성 오류를 반환한다. hash·판정·근거를 자동 보정하지 않는다. 이미지/sidecar 변경 시에도 정본 revision과 출력 검토 revision이 달라지므로 이전 시각 검토가 현재 전달 근거로 쓰이지 않는다. 문맥 판단과 제품 사실의 정확성은 자동 검사의 범위가 아니다.

## 저장과 복구

1. 이전/다음 manual·sources·copy-review 원본 bytes를 `.editor/generations/<id>/`에 각각 저장하고 파일 hash와 manifest를 완성한다. 파일 write와 temp 파일에는 fsync를 사용한다.
2. 준비 중 외부 revision이 바뀌면 정본을 쓰지 않는다. 완료된 준비 세대 후 transaction journal을 원자 교체한다.
3. 각 정본 파일의 이전 hash를 확인하고 같은 디렉터리 temp→rename으로 교체한다. 마지막 정상 세대 pointer를 교체하고 journal을 제거한다.
4. 재시작 시 미완료 journal을 읽는다. 현재 파일이 이전/다음 hash 중 하나일 때만 준비된 다음 세대를 완성한다. 준비 세대 bytes가 손상되면 검증 가능한 이전 세대로 되돌린다. 제3의 외부 변경이 있으면 `RECOVERY_CONFLICT`로 멈추고 파일을 보존한다.

다중 파일을 OS에서 한 번에 rename할 수 없으므로 외부 독자는 transaction 중 일시적인 혼합 파일을 볼 수 있다. host의 직렬 저장/읽기와 재시작 복구는 이를 완료되거나 이전 정상 세대로 정리한다. journal·세대를 무시하는 외부 writer와의 동시 저작이나 전원 손실에서 directory metadata durability까지 보증하는 데이터베이스가 아니다. 동시 외부 변경을 발견하면 덮어쓰지 않는다. 이전 세대 정리/보관 기간은 자동화하지 않는다.

## 자산

`POST /api/assets`는 파일명과 base64 원본 바이트만 받는다. 원본 filesystem 경로를 서버에 넘기지 않는다. 20MiB 이하의 PNG/JPEG/WebP/SVG를 이미지 signature/크기 계약으로 검사하고 `assets/<이름>-<UUID>.<확장자>`에 새로 복사한다. 동명 자산을 덮어쓰거나 원본을 crop/리사이즈하지 않는다. SVG는 외부 참조·실행 코드·foreignObject를 거부한다. import 실패 시 정본을 변경하지 않는다.

figure, step figure, columns figure, cover logo의 누락은 해당 데이터 위치와 함께 반환한다. 공식 Theme 로고 참조는 CLI가 처리한다. crop 선언 크기는 A 담당의 `validateCropSource`로 원본과 대조하며 좌표 자동 수정은 없다. 일반 viewBox SVG는 사용할 수 있으나 intrinsic 크기가 없는 SVG crop은 공통 계약에 따라 거부된다.

## 독립 출력과 검토

`POST /api/exports`는 current revision·format(html/pdf)·mode(draft/reviewed)를 받아 `202` job ID를 즉시 반환한다. 고정 Node CLI를 argument 배열·`shell:false`로 실행하며 runtime/browser 경로는 host 시작 때만 정한다. UI·Tiptap DOM을 인쇄하지 않는다.

각 job은 `.editor/exports/<UUID>/input` 원본 snapshot과 `output` 독립 HTML/PDF·라이선스·layout report·로그·상태를 보유한다. 실행 중 실제 child PID·종료 코드가 기록되며 job별 120초 timeout이 있다. 이전 성공 PDF를 새 실패 결과로 제시하지 않는다. 실패 job의 로그/layout은 진단으로만 열 수 있고 실패 job의 PDF/HTML은 성공 artifact로 열 수 없다. host 중단 후 running 상태는 interrupted로 표시한다.

document revision과 공통 CLI/renderer/styles/validator/image-dimensions hash, 실제 사용하는 peer component·token·폰트·package manifest·Node/browser 식별을 job에 고정한다. 현재와 다르면 status.current가 false다. 출력물 바이트 hash도 다운로드 때 대조한다. 같은 입력의 draft를 먼저 확인하고 `POST /api/visual-review`에 reviewer/outcome/reason을 기록해야 reviewed 출력이 가능하다. 해당 format·현재 revision·renderer/runtime hash의 시각 검토 pass와 최신 copy-review를 모두 요구한다. 이는 제품 담당자 승인이나 PDF/UA 인증을 대신하지 않는다.

전체 API와 실행/검증 명령은 [실행 안내](manual-editor-server-run.md)를 따른다.
