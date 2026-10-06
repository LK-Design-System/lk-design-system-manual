export function figure() {
  return { src: 'assets/원본.png', alt: '원본 화면의 선택 영역', caption: '전체와 확대 영역\n둘째 줄', size: 'reading', previewTitle: '참고 화면', crop: { x: 1.25, y: 3.5, width: 120.5, height: 80.25, sourceWidth: 640, sourceHeight: 480, vendor: { unit: 'px' } }, productNote: { approved: false, revision: null } };
}
export function fixture() {
  return {
    document: {
      schemaVersion: 1, title: '가상 매뉴얼', lang: 'ko', future: { nested: [false, null, { value: 3 }] },
      cover: { title: '표지 제목', sectionTitle: '준비하기', logo: { src: '@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg', alt: 'LK ROBOTICS', extension: 'preserve' }, metadata: [{ label: '버전', value: '1.0', extra: [] }, { label: '상태', value: '초안' }, { label: '대상', value: '가상 제품' }], blocks: [{ type: 'paragraph', text: '준비합니다.' }], extra: { empty: '' } },
      pages: [
        { title: '첫 과업', lead: '조건을 확인합니다.', pageExtra: { id: 'external-page-id' }, blocks: [
          { type: 'subheading', text: '동급 구획' }, { type: 'paragraph', text: '한글\n\n줄바꿈과  공백\t보존' },
          { type: 'address', value: 'https://example.invalid/path?version=1' }, { type: 'quote', text: '그대로 복사\n\n다음 줄\r\n마지막' },
          { type: 'list', items: ['문자열 항목', { label: '주소', value: '내부 원문', emphasis: false, labelEmphasis: true, unknown: { a: 'b' } }, { label: '선택', value: '생략한 플래그' }] },
          { type: 'steps', start: 7, stepGroupExtra: ['retain'], items: [{ title: '선택하기', text: '값을 입력합니다.', quote: '첫 줄\n둘째 줄', figure: figure(), externalID: 'keep' }, { title: '결과 확인', figure: { src: 'assets/둘째.png', alt: '결과 화면', caption: '결과를 확인합니다.' } }, { title: '닫기', text: '마칩니다.' }] },
          { type: 'figure', ...figure() },
          { type: 'table', label: '상태', headers: ['항목', '설명'], rows: [['A', '한글\n내용'], ['B', '설명']], extension: { widths: [1, 2] } },
          ...['signal', 'positive', 'cautionary', 'negative', 'offline'].map(tone => ({ type: 'callout', title: '안내', text: '조건 설명', tone })),
          { type: 'help', title: '기존 안내', text: '별칭 유지', extra: true },
          { type: 'columns', figure: figure(), blocks: [{ type: 'paragraph', text: '세로 화면 설명' }, { type: 'quote', text: '인용' }, { type: 'steps', items: [{ title: '내용 확인' }] }], unknown: [1, 2] },
        ] },
        { title: '둘째 과업', blocks: [{ type: 'steps', items: [{ title: '시작' }, { title: '종료' }] }, { type: 'callout', title: '끝 안내', text: '마지막입니다.' }] },
      ],
    },
    sidecars: { 'sources.json': { schemaVersion: 1, reviewStatus: 'approved', reviews: [{ reviewer: 'synthetic', revision: 'old' }], future: { nested: ['keep'] } }, 'copy-review.json': { documentHash: 'old-review', placementReview: [{ reason: 'keep historical evidence' }], unknown: null }, 'external.json': { anything: [true, 10] } },
  };
}
