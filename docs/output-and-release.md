# 출력과 배포

## 로컬 작업

```bash
node bin/lds-manual.mjs init ./new-manual --title "제품 사용 매뉴얼" --document-version 0.1
node bin/lds-manual.mjs build ./new-manual/manual.json --runtime ../lk-design-system --out ./new-manual/output/manual.html
node bin/lds-manual.mjs pdf ./new-manual/output/manual.html --runtime ../lk-design-system --browser /usr/bin/google-chrome --out ./new-manual/output/manual.pdf
```

init은 **존재하지 않는 디렉터리**에만 생성합니다. 상위 디렉터리는 미리 준비합니다.
기존 파일이나 빈 디렉터리도 덮어쓰지 않습니다. init에는 LDS·React 설치가 필요하지 않습니다.
build에는 LDS Core/Theme 0.4.3와 React가, pdf에는 Playwright와 Chromium이 추가로 필요합니다.
자동 설치·원격 다운로드·게시를 수행하지 않습니다.

이미 LDS가 설치된 소비 프로젝트의 `--runtime`을 사용하는 것이 가장 간단합니다.
신규 환경은 조직의 LDS 패키지 접근 설정으로 정확히 같은 Core/Theme 버전을 설치합니다.
공개 소스 저장소라는 사실이 패키지 레지스트리의 익명 접근을 의미하지는 않습니다.
자격증명을 문서·명령 로그·레포에 넣지 않습니다. 브라우저 설치도 사용자 환경의 정책을 따릅니다.

## 결과 확인

1. 종료 코드와 `.layout.json`의 errors를 확인합니다. 실패하면 **기존 PDF가 남아 있을 수 있습니다**.
2. 실제 PDF를 렌더링해 모든 쪽의 줄바꿈·잘림·표·캡션·페이지 번호를 확인합니다.
3. 버튼명과 화면을 대조합니다. 동작·계정·권한·보안 설명은 제품 담당자가 확인합니다.
4. 문서 상태와 제품 버전을 sources.json에 기록합니다. 화면이나 내용을 바꾸면 해당 검토를 갱신합니다.

파일명은 제품 식별자·문서 버전·상태를 구별할 수 있게 정합니다.
예: `sample-user-manual-v1.0-draft.pdf`. 자동으로 '최종'이나 '공식'을 붙이지 않습니다.
`Pretendard-LICENSE.txt`를 HTML/PDF와 함께 보관하고 필요한 배포물에 포함합니다.
내부 sources.json은 출력 폴더 전체 업로드와 섞지 않습니다.

## 패키지 공개 준비

- `LICENSE`는 이 레포의 신규 코드·문서·가상 예제를 MIT로 명시합니다.
- LDS Core/Theme·Pretendard·회사 로고는 [별도 권리 고지](../THIRD_PARTY_NOTICES.md)를 따릅니다.
- package.json의 private 설정은 현재 true이며 레지스트리 발행을 막습니다.
- 공개 전 제품 자료·내부 주소·계정·생성 출력물이 포함되지 않았는지 점검합니다.
- 회귀 검사와 예제 출력 결과를 확인하고 CHANGELOG를 갱신합니다.
- GitHub 생성·push·패키지 발행은 로컬 출력과 별도 행위이며 해당 승인을 받은 뒤 진행합니다.

소스 저장소는 GitHub에 공개합니다. CI와 패키지 레지스트리 발행은 아직 구성하지 않았습니다.
