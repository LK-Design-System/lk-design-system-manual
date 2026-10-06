import React from 'react';
import { ManualCover, ManualDocument } from '../src/index.mjs';
import { compactDocument, PageFrame } from './fixtures.jsx';

export default { title: 'LDS Manual/Templates/A4', component: ManualDocument, parameters: { docs: { description: { component: 'compact A4 210×297mm. 글자나 화면을 자동 축소하지 않으며, 좁은 미리보기는 가로 스크롤로 읽습니다.' } } } };
export const Cover = { name: '표지', render: () => <main className="lds-manual" lang="ko"><ManualCover cover={compactDocument.cover} number={1} total={1} /></main> };
export const Body = { name: '기본 본문', args: { title: '설치 준비사항 확인하기' }, render: ({ title }) => <PageFrame title={title}><p>사용할 기기와 제품에서 제공한 계정을 확인합니다.</p><ul><li>전원과 네트워크 연결을 확인합니다.</li><li>제품의 승인된 설치 절차에 따라 시작합니다.</li></ul></PageFrame> };
export const MultiPage = { name: '표지와 이어지는 본문', args: { document: { ...compactDocument, pages: compactDocument.pages.slice(0, 1) } } };
