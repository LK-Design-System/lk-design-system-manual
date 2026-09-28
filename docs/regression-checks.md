# 템플릿 회귀 검사

사용자와 다듬은 수치·구성을 구현에서 잃지 않도록 동작과 실제 렌더링을 검사합니다.

```bash
node --test tests/*.test.mjs
node scripts/check-template.mjs --runtime ../lk-design-system --browser /usr/bin/google-chrome
```

첫 명령은 Node 내장 runner를 사용하며 새 외부 의존성이 없습니다.
두 번째 명령은 선택한 runtime의 Playwright와 LDS peer를 재사용합니다.

검사 대상:

- init의 완전한 문서 생성, 기존 파일 보존
- 문서 데이터의 필수 제목·대체 텍스트·표 열 수·단계 번호
- 로고 존재·35mm 폭, 메타데이터의 두 항목 배치·홀수 항목 병합
- 단계 17/24/600, 캡션 12px, 폰트 400/500/600/700/800
- 단계 사이 24px, 설명→이미지 12px, 이미지→캡션 8px
- 제목 바 8px, 실제 Core Callout의 제목·아이콘·16px 곡률
- 이미지 reading/compact 폭, 연속 번호, 페이지 넘침
- 원본 기록이 HTML에 섞이지 않음, 문구를 HTML로 실행하지 않음
- 넘치는 페이지의 PDF 출력 거부와 이전 PDF 보존

출력은 `output/template-check.json`에 남습니다. 실패 시 임시 진단 폴더를 알립니다.
픽셀 스냅샷 비교는 아직 없으며 이 검사는 디자인의 모든 변화를 잡지 않습니다.
숫자 계약을 바꾸는 경우 규칙과 검사를 함께 수정하고 실제 출력물을 검토합니다.
제품 정보 정확성, 작은 스크린샷의 판독성, 라이팅의 자연스러움은 사람이 확인합니다.
