# 원본 자료와 검토 기록

`lds-manual init`은 `manual.json` 옆에 `sources.json`을 만듭니다.
이 파일은 **내부 작성 근거**이며 build/pdf가 읽거나 출력물에 포함하지 않습니다.
생성된 `.gitignore`도 기본으로 제외합니다. 팀의 비공개 문서 저장소에서 추적하려면
해당 저장소의 정책에 맞춰 명시적으로 조정합니다.

| 필드 | 기록할 내용 |
|---|---|
| document | 대응하는 문서 JSON의 상대 경로 |
| reviewStatus | draft / in-review / approved — 담당자가 기록 |
| verifiedProductVersion | 실제 확인한 제품 버전. 미확인은 null |
| sources | 원문 파일/URL, 리비전, 확인 날짜, 참고한 절·쪽 |
| assets | 이미지 경로, 출처, 촬영 시각, 제품 버전, 사용 권한 |
| reviews | 검토자, 검토 날짜, 범위, 남은 사항 |

예:

```json
{
  "schemaVersion": 1,
  "document": "manual.json",
  "reviewStatus": "in-review",
  "verifiedProductVersion": "sample-1.0",
  "sources": [{"path":"reference/source.pdf","revision":"1.0","reviewedAt":"2026-09-28","sections":["설치"]}],
  "assets": [{"path":"assets/login.png","origin":"제품 검토용 캡처","capturedAt":"2026-09-28","productVersion":"sample-1.0","permission":"internal-approved"}],
  "reviews": [{"reviewer":"제품 담당자","date":"2026-09-28","scope":"로그인 단계","result":"설명과 화면 대조 완료"}]
}
```

실제 내부 경로·검토자·메모는 공개 레포 예제로 복사하지 않습니다. `approved`는 자동
검사 결과가 아닙니다. 담당자가 제품 동작과 배포 범위를 확인한 뒤 기록합니다.
표지의 문서 버전은 현재 문서의 버전이며 참고 원문의 버전은 sources에 기록합니다.
