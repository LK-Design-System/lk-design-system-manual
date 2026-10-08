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

- [Manual 편집기 재설계](plans/manual-editor-redesign.md) — 노션 기본 편집 목표, 단일 작성 화면·블록 메뉴·선택·자동 저장 구현과 50쪽 연결 실기. **기본 흐름 검증, 실제 OS 입력·모바일 등 전체 수락 대기**.
- [계획 문서 인덱스](plans/README.md) — 현행 계약, 재설계 제안, 기존 구현 이력과 감사의 역할 구분.

- [Manual 에디터 사용성 및 화면 재점검](plans/manual-editor-ui-audit.md) — 현재 기본 입력 결함, 레이아웃·와이어프레임, 버튼별 목적, 29개 경계 상황의 실측·소스·미확인 판정. 재설계 수락 시 다시 확인할 재현 근거.

- [LDS Manual 에디터 실행 계획](plans/manual-editor-plan.md) — A4 중심 사용 동선 개선, 이전 빌드의 합성 브라우저 흐름 11개 근거와 실제 OS IME와 제품 시범 검수 잔여 항목.
- [Tiptap 사례 대비 준비도 점검](plans/manual-editor-readiness.md) — 사례 비교와 P0/P1/P2 기준, 모델·host 통과 범위와 남은 실제 UI·IME 검증.

## 로컬 에디터 구현 안내

- [파일 host 실행·검증](manual-editor-server-run.md) — 실제 `apps/editor/server/host.mjs` 명령, 인증 API, 대상 검사.
- [저장·복구·출력 계약](manual-editor-storage.md) — 정본/초안/sidecar, 외부 변경 충돌, 원본 자산과 리비전별 출력.
- [편집 모델 계약](plans/manual-editor-model-contract.md) — Manual↔Tiptap 무손실 변환, 명령·선택·단일 history, 20개 대상 검사와 한계.

승인된 앱 dependency와 기존 runtime이 준비된 환경에서 `node apps/editor/run.mjs build --runtime <설치된-LDS-프로젝트>`로 UI를 빌드하고,
실행 안내의 host 명령에 `--ui apps/editor/dist`를 지정합니다. `dev` 모드는 합성 편집 UI이며 그 실행만으로 파일 host가 연결되지 않습니다.
새 문서/기존 폴더 시작을 위한 [launcher 소스](../apps/editor/launch.mjs)와 private bootstrap은 실제 Chromium의 시작·탭 재열기·host 재시작까지 확인했습니다. 기존 `run.mjs`는 dev/build 역할을 유지합니다. 실행 명령과 인증 경로는 위 실행 문서에서 관리합니다.

모델 20/20, C의 저장·보안 9/9 및 실제 CLI 출력 1/1, launcher protocol의 이전 기준 4/4, 현재 읽기 전용 validation API 3/3 근거가 있습니다.
이전 UI 빌드에서 표·목록·optional 제거·단계 이동·드래그를 실제 조작했고, 그때 저장한 17쪽 문서는 C의 독립 PDF 검수를 통과했습니다.
2026-10-06 Linux에서 모델 20개와 host/validation/launcher/단계 제어 21개를 재확인했고,
화면 개편 전 UI의 합성 브라우저 시나리오 11개(상위 검사 포함 Node runner 12/12, skip 0)를 통과했습니다.
검사 소스는 [workflow.test.mjs](../apps/editor/tests/workflow.test.mjs), 실행·검증 범위는
[브라우저 저작 흐름 검사](manual-editor-server-run.md#최신-빌드의-브라우저-저작-흐름-검사)에 있습니다.
실제 OS 한글 IME, 전체 필드의 모든 조작 조합과 제품 시범 문서 검수는 남아 있어 전체 MVP 완료로 표시하지 않습니다.

작업 종료 후 계획은 확정 기준을 durable 문서로 옮기고, 보존 가치에 따라 archive 또는 삭제합니다.

현재 화면은 [문서 중심 사용 동선](plans/manual-editor-plan.md#문서-중심-사용-동선-개선--2026-10-06)으로 개편했습니다.
모델·파일 경계 28개 검사 통과와 실제 사용성 통과를 구분합니다. 최신 UI 재점검에서 기본 입력·오류 복구·좁은 화면 문제가 확인되어, 위 사용성 감사의 수락 기준을 통과하기 전에는 개선 완료로 표시하지 않습니다.
