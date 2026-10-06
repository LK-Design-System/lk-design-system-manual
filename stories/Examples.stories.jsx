import { ManualDocument } from '../src/index.mjs';
import { compactDocument, galleryDocument, authoringDocument } from './fixtures.jsx';

export default { title: 'LDS Manual/Examples/공개 문서', component: ManualDocument, parameters: { docs: { description: { component: '저장소의 공개 합성 예제 JSON을 validateDocument로 검사하고 같은 ManualDocument로 렌더링합니다. 제품 문구 승인을 의미하지 않습니다.' } } } };
export const Compact = { name: '컴팩트 매뉴얼 · 4쪽', args: { document: compactDocument } };
export const Gallery = { name: '구성 요소 예제집 · 6쪽', args: { document: galleryDocument } };
export const AuthoringGuide = { name: '기존 매뉴얼 재디자인 안내 · 6쪽', args: { document: authoringDocument } };
