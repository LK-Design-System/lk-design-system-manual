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

## 재설계 에디터의 독립 브라우저 저장 경로

### 현재 v2 파일 저장 계약

사용자 지시에 따라 정식 저장은 파일 중심이다. `manual-file-session.mjs`와
`ManualEditor.jsx`가 native 파일 handle과 저장 완료 snapshot을 관리한다.

- `열기…`는 파일 picker에서 선택한 `.manual.json`을 읽어 문서를 설치한 뒤 handle을
  연결한다. 입력 파일의 문서 ID를 임의로 새 복사본 ID로 바꾸지 않는다.
- 저장/Ctrl+S는 연결된 파일에 쓰고, 새 문서 첫 저장 및 다른 이름으로 저장은 저장
  위치를 선택한다. writable의 close 성공과 해당 문서 generation/snapshot 일치 뒤에만
  정식 파일 저장 완료로 판정한다. 저장 중 추가 입력은 미저장으로 남는다.
- picker 취소·권한/쓰기 실패·지연 결과·다른 문서로 교체는 잘못된 binding이나 saved
  판정을 만들지 않는다. native 기능이 없을 때 다운로드는 파일 보관이며 같은 파일
  덮어쓰기 및 정식 dirty 해제와 구분한다. 실제 앱 window의 secure context와 public
  picker 함수로 열기/저장 capability를 각각 판정한다. IAB라는 이유만으로 미지원으로
  판정하지 않는다. 다운로드 fallback은 파일 중심 저장 요구의 완료 근거가 아니다.
- 아래 IndexedDB 자동 저장과 CAS는 보조 복구 계약이다. 보관함 성공으로 정식 파일의
  dirty를 해제하지 않고, CAS 충돌이 정식 파일 저장을 막지 않는다.
- 보조 복구는 `manual-recovery-session.mjs`의 편집 세션별 저장 ID를 쓴다. 파일 열기와
  기존 복구본 설치 모두 새 UUID와 `revision:null`로 시작한다. 로드한 복구 표지와
  revision은 출처 정보이며 새 writer의 기준으로 채택하지 않는다.
  같은 문서 ID의 기존 복구본을 덮어쓰지 않으며, 새 세션끼리 같은 원문서를 열어도
  복구 저장 ID를 공유하지 않는다. 편집기·파일의 문서 ID와 블록 ID는 유지한다.
  보관함 안의 복구 표지는 collision 검사를 거친 확장 정보로 관리하고, 읽을 때 원래
  문서 ID·확장 정보로 복원한다. 파일 codec에 보조 저장 ID를 넣지 않는다.
- 보조 저장의 CAS 충돌은 현재 detached snapshot을 새 저장 ID에 한 번만 자동 재시도한다.
  기존 기록을 덮어쓰거나 최신 revision으로 rebase하지 않는다. 성공 후 같은 세션일
  때만 새 복구 연결을 채택하며, 편집 문서·파일 handle·파일 기준선·선택·history를
  변경하지 않는다. quota 등 다른 실패는 자동 재시도하지 않는다. 실제 복구 저장
  실패는 파일 저장과 별도 안내로 표시하며, 정상 저장에 충돌 해결 선택창을 요구하지 않는다.
- 미저장 상태의 새 문서/열기는 ‘변경 내용을 저장할까요?’에서 취소·저장 안 함·저장을
  제공한다. 저장은 정식 파일 저장의 최신 snapshot 성공을 확인한 뒤 이동한다.
  다운로드 환경에서는 ‘파일 내려받기’와 받은 파일 확인 안내를 제공하며, 다운로드
  요청만으로 dirty를 해제하거나 자동 이동하지 않는다. 계속 이동하려면 사용자가
  ‘저장 안 함’을 명시적으로 선택한다.
- 파일 codec은 `{format:"lds-manual-document/v2", document, assets}`이고 확장 정보·
  자산·명시적인 페이지 순서를 보존한다. 표지의 런타임 래퍼를 파일에 그대로 저장하지
  않으며, 변환·복제한 일반 블록과 원래 표지 정보의 구분도 보존한다.

모의 handle과 실제 caller/model 연결 증거는 OS picker·권한 요청·파일 쓰기·재열기
증거를 대신하지 않는다. 해당 OS 흐름은 아직 미수락이며 [현재 감사 원장](plans/manual-editor-ui-audit.md)을 따른다.
필수 실제 흐름은 첫 저장의 위치 선택·디스크 쓰기, 같은 파일 저장/Ctrl+S와 재열기,
다른 이름으로 저장 후 이전 파일 보존, picker 취소와 미저장 이동 확인이다.
미지원 환경의 fallback 검사와 지원 브라우저의 OS 저장 검사는 별도로 판정한다.

2026-10-08 읽기 확인 소스는 `ManualEditor.jsx` SHA-256
`851bc8cba2e6ba9f158cdf4a39ba7c444b1f9a1d6ef4db4cda01a953f9b76820`,
파일 provider `8cc2c5b672b1945ac1dc37e016f8c1830c3d9d43ae6b6f6d1c4f2ce533185b8c`,
복구 adapter `e196d0a071b79218df354c5d5b712926148e3aa6122ffc13eb1d8b4125188da8`다.
FileSession 15개 모의 검사와 복구/호출 세대 검사 15개는 같은 helper SHA의 구현 근거다.
Parent의 이후 변경과 실제 화면/OS 수락까지 같은 결과로 확대하지 않는다.

### 보조 IndexedDB 보관함과 이전 수락 이력

아래 store와 scheduler는 현행 보조 복구 구현이다. 이후 별도로 표시한 자동 이동·
합성 UI 수락 이력은 파일 중심 계약 이전의 기록이며 정식 Save/Ctrl+S 수락에 적용하지 않는다.

`apps/editor/src/redesign/document-store.mjs`는 새 저작 화면용 로컬 브라우저 저장 경로다.
위 v1 host API와 기존 브라우저 데이터베이스는 변경하지 않는다. 서버 폴더 저장이나
배포용 출력 계약을 대체하지 않으며, 이 경로는 `schemaVersion:2` 초안을 보관한다.

- IndexedDB `lds-manual-redesign-v2`의 `documents` store를 사용한다. 저장 DTO의 문서 ID를 key로
  보관하고 `{id, revision, savedAt, document, assets}`를 반환한다.
- adapter를 거친 DTO의 root ID는 보조 저장 ID이며, 편집기와 파일의 원문서 ID와 구분한다.
- 최초 저장에는 `expectedRevision:null`, 이후에는 해당 세션의 직전 commit revision이
  필요하다. 읽기·revision 비교·쓰기는 하나의 readwrite transaction이다. 다른 탭이 먼저
  저장했거나 기존 ID와 충돌하면 `CONFLICT`로 거절하고 저장본을 변경하지 않는다.
- 저장 구조 검사는 `manual-v2.mjs`의 도메인 validator를 사용한다. 빈 제목·본문·미완성
  이미지 슬롯은 초안으로 보존하며, 중복 ID·지원하지 않는 구조·안전하지 않은 링크는
  거절한다. 저장 성공은 출력 준비 또는 문구·시각 검토 통과를 뜻하지 않는다.
- 파일 형식은 `{format:"lds-manual-document/v2", document, assets}`다. PM 내부 JSON이나
  브라우저 revision을 파일 계약으로 사용하지 않는다. assets는 안전한 상대 이름을 key로
  PNG/JPEG/WebP 원본 data URL을 보존한다. 그림 한 장은 20MiB 이하이며 SVG·외부 URL을
  이식 파일의 자산으로 허용하지 않는다. 이미지 해석·실제 크기·출력 적합성은 별도 검사다.
- 알 수 없는 envelope 필드는 조용히 삭제하지 않고 가져오기를 거절한다. 문서의 확장
  정보는 도메인 `extensions`로 보존한다. v1 파일은 `LEGACY_DOCUMENT`로 거절하고 기존
  에디터에서 열도록 안내한다. 자동 이관과 원본 덮어쓰기를 수행하지 않는다.
- 브라우저 보관함은 기기/브라우저/출처에 종속된다. 파일 내보내기가 이식 가능한 보관
  수단이다. quota·접근 실패는 오류로 전달하며 저장 성공으로 표시하지 않는다.

이전 UI는 저장/열기 대기 중 본문을 잠갔다. 보조 **자동 저장 중 입력을 계속하는 것**은 유지하며
문서 열기·교체에만 편집 잠금을 적용한다. 저장 snapshot과 현재 문서 비교는 유지해 늦게
도착한 결과를 최신 내용의 저장 완료로 오인하지 않는다. UI 연결 수락은 아래 모듈 검사와 별개다.
정상 자동 저장 후 이동 및 충돌 해결 선택창은 이전 UI 정책이다. 현재 이동 확인은 위 정식
파일 저장 계약을 따른다. 파일 가져오기에서 같은 원문서 ID가 있어도 기존 복구 기록을
자동 덮어쓰지 않는다. 실제 UI 연결과 검증 상태는
[재설계 진행 기록](plans/manual-editor-redesign.md#14-노션-기본-편집-목표와-수락--2026-10-07)을 따른다.

### 자동 저장 큐 — 구현과 통합 수락

`createAutosaveController`는 `autosave-controller.mjs`의 독립 scheduler다. `reset({documentId,revision})`으로
현재 저장 기준을 설치하고 `schedule({document,assets},token)`으로 detached snapshot을 예약한다.
기본 지연은 750ms이며 한 writer만 실행한다. 실행 중 새 변경은 최신 한 snapshot으로 모으고 다음
저장은 직전 commit의 revision을 사용한다. UI의 baseline은 `onSaved(record,{token,current})`에 전달한
PM doc/asset reference로 갱신한다. 선택 변경만으로 저장하지 않고, IME 조합 종료 후 예약해야 한다.

조합 종료 저장 retry는 `manual-composition.mjs`의 DOM completion listener로 연결한다.
compositionend 이후 100ms에 조합이 끝났고 같은 view/generation인지 확인해 현재 UI callback으로 예약한다.
같은 시점에 별도 compositionVersion으로 slash effect를 갱신하며 PM 문서·selection·history는
수정하지 않는다. 문서 교체는 timer를 취소하고 unmount는 listener/timer를 정리한다.
합성 EventTarget 3개 검사는 실제 OS IME 입력·글자 확정 정확성 검사를 대신하지 않는다.

`flush()`는 호출 시점까지 예약한 내용의 저장 성공 여부를 반환한다. quota 등 실패는 최신 변경을
보존하고 자동 retry를 중단한다. `retry()`는 명시적 재시도지만 `CONFLICT`는 덮어쓰기 재시도를 거절한다.
문서를 설치할 때 `reset`하면 이전 요청의 늦은 callback을 무효화한다. writer 호출 직전에도
disposed/epoch를 검사해 전환 이전 snapshot이 새 복구 연결로 저장을 시작하지 않게 한다.
이미 실행된 IDB transaction을 취소하거나 commit된 변경을 되돌리는 기능은 아니다.
debounce가 남아 있으면 보조 복구 완료로 판정하지 않는다. 정식 파일의 저장 상태는
독립 파일 기준선으로 판단한다. scheduler와 교체 barrier의 이전 16개 targeted 검사, 실제 자동 저장/CAS 실기,
합성 storage fault UI 수락은 각각 다른 증거다.

`flush()`는 보조 복구 큐의 완료만 보장하며 정식 Ctrl+S는 FileSession을 직접 호출한다.
미저장 이동 확인에서 ‘저장’은 `saveBeforeReplacement({capture,save,isCurrent,replace})`에
정식 파일 저장 함수를 전달한다.
저장 중 늦은 이미지/편집이 들어오면 최신 snapshot을 다시 저장하고, source doc·asset reference·
generation과 pending writer가 안정됐는지 확인한 같은 JS task에서 교체한다. 실패하면 현재 내용과
교체 dialog를 유지한다. 교체 전용 mutex로 중복 실행을 막되 일반 자동 저장 중 입력은 유지한다.

### 작성 A4 정규화와 저장 기준선

v2 작성기는 문서를 설치할 때 고정 A4 배치를 정리한다. 기존 보관본의 초기 정규화는
history에 넣거나 자동 덮어쓰기로 보관하지 않는다. 완료 후 표시 문서와 자산을 보조
기준선으로 삼되, scheduler revision은 live recovery session에서 읽는다. 로드한 기록의
revision을 새 저장 ID의 기준으로 재주입하지 않는다. 새 문서의 정식 저장 여부는 파일
기준선으로 판단하고, 파일로 연 문서는 연결된 파일 기준선과 보조 복구 기준선을 구분한다.
정규화 도중 실제 사용자 입력은 기준선 갱신에 흡수하지 않고 일반 변경으로 보관한다.

기존8쪽 보관본을 화면16쪽으로 정리하고 다시 열 때, 원본의216개 표시 ID와 내용/
marks/meta/이미지를 유지하고 저장 시도·commit0, history0을 native memory QA에서
확인했다. 원본에 없던 분할·자동 쪽·반복 머리글의23개 파생 UUID는 재정규화 때 새로
생길 수 있으므로 전체 표시 ID가 같다고 주장하지 않는다. 사용자가 편집하거나 명시
저장한 실제 snapshot에는 당시의 파생 ID와 인식된 자동 연결 metadata도 함께 들어간다.

입력의 자동 흐름은 같은 Undo 그룹에 연결한다. 지연 저장 도중 페이지가 나뉘어도
교체 barrier는 먼저 끝난 이전 snapshot으로 이동하지 않고 최종 페이지/ID/marks/자산을
최신 정식 파일 snapshot에 저장한 뒤 교체한다. 이전 보조 CAS 기반 교체 검사는
현행 파일 저장 성공을 증명하지 않는다. 실제 planner/transaction·memory writer 연결
검사와 native 초기 열기/빈 auto2개 제거의 저장0 검사는 별도 증거이며,
[UI 감사](plans/manual-editor-ui-audit.md)에 source·후보·미검증 환경을 기록한다.

### 합성 storage fault 검증

`apps/editor/tests/fixtures/manual-storage.html`은 실제 `ManualEditor`에 메모리 저장 API를
주입하는 분리된 QA 화면이다. IndexedDB와 host 파일 API를 열지 않고, canonical
`prepareDocumentRecord`의 validator/CAS를 사용한다. native QA controls로 저장 공간 부족 오류와
1.2초 저장/열기 지연을 재현해 UI 오류·입력 유지·파일 보관·명시적 retry·교체 잠금을 검사한다.
프로덕션 entry, 전역 앱 state 노출, hidden runtime 설정을 추가하지 않는다.
이 fixture의 오류는 **합성 주입**이며 실제 OS quota/전원 장애 검사로 보고하지 않는다.

2026-10-07의 이전 보조 저장 UI 수락에서는 실패 후 계속 입력·현재 파일 보관·정상 모드의 재시도,
1.2초 저장 중 추가 입력을 두 번째 commit으로 보존, 정상 문서 전환의 무질문 자동 저장,
지연 load 중 잠금, 교체 저장 실패·취소·재시도 후 최신 내용 보존을 확인했다.
canonical 메모리 writer와 scheduler/barrier 연결 검사는 늦은 figure/assets의 두 번째 commit과
두 번째 quota 실패 시 source/session 보존을 별도로 확인한다. 이 결과를 실제 OS quota나
picker를 열어 둔 채 강제 문서 전환하는 native 검사의 근거로 확대하지 않는다.
