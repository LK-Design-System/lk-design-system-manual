# LDS Manual authoring

Read README.md and docs/agent-skills/lds-manual/SKILL.md for manual work.
Core/Theme own common tokens and Callout. Manual owns --manual-* aliases and A4 composition.
Use the public Core Callout; do not restyle its internals or copy its implementation.
Keep real product material in consumer repos; examples here use synthetic data only.
Do not resize type to conceal overflow. Split at step boundaries and render again.
The source repository is public; the alpha package is not published to a registry. Remote changes and registry publishing require explicit authorization.
Do not modify sibling repos as a side effect of manual authoring.

Before reporting authoring complete, require current copy-review coverage plus layout/visual review per docs/copy-review.md. A successful PDF build alone is not completion.

## CI·릴리스 실행 호스트 (필수)

- 다른 PC에서 이 저장소를 열거나 clone해도 그 PC가 CI·릴리스 실행 호스트가 되지 않는다. 개발 PC는 소스 편집, 로컬 미리보기와 변경 범위의 빠른 검사만 수행한다. 작업 종료만을 이유로 전체 suite·Storybook sweep·전체 영상 렌더·패키지 pack을 로컬에서 실행하지 않는다.
- LDS 시리즈의 패키지 릴리스·발행 준비는 **server04의 승인·자격검증된 격리 VM**에서 수행한다(2026-10-08 소유자 결정). server04 호스트에서 직접 빌드하지 않는다. 저장소별 selected-repo/workflow 권한과 별도 runner 등록·디스크·최소권한 credential을 유지하며 Portal VM/runner를 재사용하지 않는다.
- 기존 자동 CI·Pages·교차 OS 검증의 실제 실행 경로는 아래 현행 표와 workflow가 정본이다. 이 지침을 추가했다고 runner 이관이 완료된 것은 아니다. 기존 Windows 검증을 Linux로 대체하거나 runner를 새로 등록하는 것은 별도 승인·자격검증 없이 수행하지 않는다. 공개 저장소의 표준 GitHub-hosted runner를 유료 runner로 오인하지 않는다.
- 정확한 source SHA의 자동 CI 결과를 재사용한다. 전체 검증은 기존 승인된 CI 또는 자격검증된 server04 릴리스 VM에 맡기며 로컬 전체 검증이나 수동 dispatch로 중복하지 않는다. 전체 검증이 필요한 변경인데 승인된 실행 환경이 없으면 `release_environment_unavailable`로 보고하고 멈춘다. 현재 PC, aipc1, 노트북, server02로 fallback하지 않는다.
- 새 PC의 누락된 VM·runner·SSH 설정은 자동 생성/등록/credential 복사의 근거가 아니다. 등록 상태와 host identity를 먼저 조회하고 기존 승인 범위 안에서만 진행한다. 편집·push 승인은 태그 push, 패키지 발행, 제품 배포, 서버 변경 승인이 아니다.
- 빌드·발행을 시작한 경우 정확한 SHA/run을 종료까지 감시하고 실패 원인을 비밀값 없이 보고한다. 무관한 dirty 작업과 타인 배포를 보존한다.
- 공통 절차: [LDS 실행 호스트 정책](https://github.com/LK-Design-System/lk-design-system/blob/main/docs/OPERATIONS.md#execution-host-policy). 형제 checkout이 없는 단독 clone에서도 이 원격 문서를 읽을 수 있다.
- 저장소 규칙을 수정할 때 `AGENTS.md`와 `CLAUDE.md`를 함께 갱신한다.

### 이 저장소의 현행 실행 경로

원격 main에는 현재 CI·Pages·패키지 발행 workflow가 없다. 다른 checkout의 미커밋 `output-parity`/`lk-authoring-output` 설정은 현행 원격 CI나 server04 등록 완료의 근거가 아니다. 새 CI/발행 경로는 server04의 승인된 저장소 전용 격리 환경을 별도로 자격검증한 뒤 구성한다. 현재 alpha는 private package이며 registry publish는 구성되어 있지 않다. 요청한 문서 한 건의 HTML/PDF 출력·레이아웃 검수는 저작 작업으로 허용하며, 전체 회귀·릴리스 검증과 구분한다.
