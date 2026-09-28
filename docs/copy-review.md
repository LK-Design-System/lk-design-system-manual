# 매뉴얼 라이팅 완료 조건

레이아웃 확인과 문맥 라이팅 검토는 별도 필수 항목입니다. PDF 생성 성공만으로 작성 완료를 보고하지 않습니다.
초안 출력은 허용하되 미검토라고 보고합니다. 최종 전달 전 아래 두 조건을 모두 확인합니다.

1. 현재 문서의 `copy-review.json`이 누락·변경 검사를 통과해야 합니다.
2. 같은 문서에서 다시 생성한 HTML/PDF의 레이아웃 리포트와 실제 페이지를 확인해야 합니다.

## 문맥 검토

LDS Core의 `docs/policies/COPY_REVIEW_CONTRACT.md`(소스 레포에서는 `docs/COPY_REVIEW_CONTRACT.md`), Writing, Voice and Tone을 적용합니다.
제목·설명·요청문·표·캡션·대체 텍스트를 페이지의 사용자 과업별로 함께 읽습니다.
대상·행동·관찰할 결과, 자연스러움, 제목의 역할, 앞뒤 절차 연결을 확인합니다.
제품명·버튼명·파일명·숫자와 제품의 실제 동작을 보존합니다. 인용·외부 원문은 임의 윤문하지 않고 맥락 적합성과 출처를 검토합니다.

각 문구를 KEEP / REVISE / BLOCKED로 판정하고 근거를 남깁니다. 새 문구는 REVISE로 검토합니다.
문맥을 읽지 않고 동일 판정을 일괄 생성하거나, 금칙어 검색을 자연스러움 검토로 대체하지 않습니다.
에이전트 자체 검토는 `contextual-agent-review`로 기록하고 사람의 승인으로 표시하지 않습니다.

## 기록과 검사

`src/copy-review.mjs`의 `copySets(document)`가 현재 문구의 key와 hash를 만듭니다.
검토 전 원문 items를 sourceItems에 보존하고 sourceHash를 도구로 계산합니다.
검토 기록에는 schemaVersion: 1, contract: lds-manual-copy-review/v1, ruleset, reviewer, reviewedAt,
reviewKind, audience, documentHash와 sets를 둡니다.
각 set은 id, sourceItems, sourceHash, candidateHash, task, contextReason, decisions를 가집니다.
각 decision은 현재 key, text, verdict, reason을 가집니다. 원문·후보 hash는 `hash()`로 계산합니다.
이 형식은 Manual의 완료 기록이며 LDS 공통 schema 준수 인증을 주장하지 않습니다.

```bash
node scripts/check-copy-review.mjs path/to/manual.json path/to/copy-review.json
```

검토 누락, BLOCKED, 문구·순서 변경, 원문 snapshot 불일치는 실패합니다.
문서를 바꾸면 검토한 부분을 다시 읽고 판정을 갱신합니다. hash만 갱신해 이전 판정을 재사용하지 않습니다.
자동 검사가 보장하는 것은 기록의 범위와 최신성입니다. 문장의 품질·검토자의 정직성·제품 승인은 보장하지 않습니다.
이 명령을 생략한 출력물은 라이팅 검토 완료로 보고하지 않습니다.
