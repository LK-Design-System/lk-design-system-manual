# LDS Manual 문서

현재 작성·데이터·출력 기준과 진행 중인 계획을 구분해 안내합니다.

## 현재 기준

- [문서 데이터와 API](document-format.md)
- [원본 자료와 제품 검토 기록](source-records.md)
- [라이팅 검토와 완료 조건](copy-review.md)
- [compact 구성 규칙](agent-skills/lds-manual/references/layout.md)
- [라이팅 규칙](agent-skills/lds-manual/references/writing.md)
- [작성 스킬](agent-skills/lds-manual/SKILL.md)
- [출력과 배포](output-and-release.md)
- [회귀 검사](regression-checks.md)
- [Storybook](storybook.md)
- [기존 템플릿 이관 대조](template-parity.md)

## 진행 중인 계획

- [LDS Manual 에디터 실행 계획](plans/manual-editor-plan.md) — 구현 진행 중. 원래 MVP 종료 기준, 소스 결함 2건의 후속 해결 근거와 최신 빌드의 실제 검증 잔여 항목.
- [Tiptap 사례 대비 준비도 점검](plans/manual-editor-readiness.md) — 사례 비교와 P0/P1/P2 기준, 모델·host 통과 범위와 남은 실제 UI·IME 검증.

## 로컬 에디터 구현 안내

- [파일 host 실행·검증](manual-editor-server-run.md) — 실제 `apps/editor/server/host.mjs` 명령, 인증 API, 대상 검사.
- [저장·복구·출력 계약](manual-editor-storage.md) — 정본/초안/sidecar, 외부 변경 충돌, 원본 자산과 리비전별 출력.
- [편집 모델 계약](plans/manual-editor-model-contract.md) — Manual↔Tiptap 무손실 변환, 명령·선택·단일 history, 20개 대상 검사와 한계.

승인된 앱 dependency와 기존 runtime이 준비된 환경에서 `node apps/editor/run.mjs build --runtime <설치된-LDS-프로젝트>`로 UI를 빌드하고,
실행 안내의 host 명령에 `--ui apps/editor/dist`를 지정합니다. `dev` 모드는 합성 편집 UI이며 그 실행만으로 파일 host가 연결되지 않습니다.
새 문서/기존 폴더 시작을 위한 [launcher 소스](../apps/editor/launch.mjs)와 private bootstrap을 구현했습니다. 실제 브라우저의 시작·재시작 검증은 남아 있습니다. 기존 `run.mjs`는 dev/build 역할을 유지합니다. 실행 명령과 인증 경로는 위 실행 문서에서 관리합니다.

모델 20/20, C의 저장·보안 9/9 및 실제 CLI 출력 1/1, launcher protocol의 이전 기준 4/4, 현재 읽기 전용 validation API 3/3 근거가 있습니다.
이전 UI 빌드에서 표·목록·optional 제거·단계 이동·드래그를 실제 조작했고, 그때 저장한 17쪽 문서는 C의 독립 PDF 검수를 통과했습니다.
최종 빌드의 해시·빌드 성공은 확인했지만 실제 조작에 사용한 빌드와 다릅니다. 소스 결함 2건은 해결됐지만 최신 bootstrap·검토·저장재열기·자산 검사·출력·focus와 실제 OS 한글 IME가 남아 있어 전체 MVP 완료로 표시하지 않습니다.

작업 종료 후 계획은 확정 기준을 durable 문서로 옮기고, 보존 가치에 따라 archive 또는 삭제합니다.
