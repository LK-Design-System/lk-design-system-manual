# Compact 템플릿 이관 대조

기존 사용자 매뉴얼에서 채택한 구성 규칙을 새 패키지의 재사용 요소와 대조했다.
제품의 주소·기기·운영 화면·문구 자체는 공개 예제에 복사하지 않는다.

| 기존 구성 | Manual 표현 | 대조 결과 |
|---|---|---|
| 표지 공식 로고, 35mm, 원본 비율 | cover.logo + Theme 공식 자산 참조 | 최초 예제 누락 복원 |
| 문서 정보 한 줄에 두 항목 | ManualMetadata, 20/30/20/30% | 최초 세로 목록을 compact 표로 복원 |
| 준비사항·강조 주소 | list의 label/value/emphasis | 문자열만 가능하던 제약 보완 |
| 본문의 별도 주소 행 | address / ManualAddress | 누락 요소 추가 |
| 본문 전체 폭·170mm·151mm 화면 | full / reading / compact | reading 폭 복원 |
| Regular/Medium/SemiBold/Bold/ExtraBold | HTML의 Theme 폰트 포함 | Medium 누락 복원 |
| 섹션 제목 바 | headline1, radius-8 | 유지 |
| 단계 제목과 번호 | headline2, 17/24/600 | 유지 |
| 본문·캡션·페이지 번호 | label1 reading / caption1 | 유지 |
| 설명→화면 / 화면→캡션 / 다음 단계 | 12 / 8 / 24px | 유지 |
| 제목 있는 안내 상자 | 실제 Core Callout compact | 유지 |
| 원문 표·헤더·테두리 | native ManualTable | 유지 |
| 세로 화면과 오른쪽 설명 | columns + callout | 유지 |
| A4·페이지 번호·하단 여유 | ManualPage | 유지; 콘텐츠 예약 영역은 출력기가 측정 |
| 사용자 행동 중심 문구·실제 화면명 보존 | 작성 스킬의 writing.md | 유지 |

## 범위

이 대조는 template capability와 대표 가상 출력물 기준이다. 실제 제품 15쪽을 새 포맷으로
전환하거나 내용의 제품 동작을 다시 검증한 결과는 아니다. 문서 데이터 validation과
출력기 검사는 글자와 이미지의 의미 정확성을 대신하지 않는다.

기존 구성에 없던 제약은 의도적으로 명시했다: 분량 초과 시 PDF 생성 중단, 자동 축소 없음,
고정 A4 미리보기, 로컬 자산 포함, 공개 예제의 가상 데이터. 새 외부 라이브러리 설치는 없다.
