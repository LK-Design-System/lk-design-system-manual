import React from 'react';
import { ManualDocument, ManualPage, validateDocument } from '../src/index.mjs';
import compact from '../examples/compact.json';
import gallery from '../examples/gallery.json';
import authoring from '../examples/authoring-guide/manual.json';

export const assetUrl = value => `${import.meta.env.BASE_URL}${value.replace(/^\//, '')}`;
export function exampleDocument(input, base = 'examples') {
  const document = structuredClone(input);
  function src(value) {
    return value === '@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg'
      ? assetUrl('lds/brand/lk-logo-inline-navy.svg') : assetUrl(`${base}/${value}`);
  }
  function blocks(items) {
    for (const block of items) {
      if (block.type === 'figure') block.src = src(block.src);
      if (block.type === 'steps') for (const step of block.items) if (step.figure) step.figure.src = src(step.figure.src);
      if (block.type === 'columns') { block.figure.src = src(block.figure.src); blocks(block.blocks); }
    }
  }
  if (document.cover) { if (document.cover.logo) document.cover.logo.src = src(document.cover.logo.src); blocks(document.cover.blocks); }
  for (const page of document.pages) blocks(page.blocks);
  return validateDocument(document);
}
export const compactDocument = exampleDocument(compact);
export const galleryDocument = exampleDocument(gallery);
export const authoringDocument = exampleDocument(authoring, 'authoring-guide');
export function PageFrame({ children, title = '구성 요소 사용 예시' }) {
  return <main className="lds-manual" lang="ko"><ManualPage title={title} number={1} total={1}>{children}</ManualPage></main>;
}
export function DocumentPreview({ document }) { return <ManualDocument document={document} />; }
export const sampleFigure = { src: assetUrl('examples/assets/home.svg'), alt: '목록과 상세 보기 버튼이 있는 가상 홈 화면', caption: '가상 앱의 홈 화면에서 상세 보기 위치를 확인합니다.', size: 'reading' };
export const metadata = [{ label: '문서 버전', value: '1.0 · 예제' }, { label: '적용 환경', value: '가상 앱' }, { label: '작성 상태', value: '공개 합성 예제' }];
