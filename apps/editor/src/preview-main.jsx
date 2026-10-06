import React, { useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ManualDocument, validateDocument } from '../../../src/index.mjs';
import '@lk-design-system/lds-core/styles.css';
import '@lk-design-system/lds-theme/styles.css';
import '../../../styles.css';
import './ui/preview-surface.css';
import brandUrl from '@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg?url';

function resolveAssets(input, base, urls = {}) {
  const document = structuredClone(input);
  const resolve = src => src === '@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg'
    ? brandUrl
    : urls[src] || new URL(src, base || location.href).href;
  function blocks(items) {
    for (const block of items) {
      if (block.type === 'figure') block.src = resolve(block.src);
      if (block.type === 'steps') for (const item of block.items) if (item.figure) item.figure.src = resolve(item.figure.src);
      if (block.type === 'columns') { block.figure.src = resolve(block.figure.src); blocks(block.blocks); }
    }
  }
  if (document.cover) { if (document.cover.logo) document.cover.logo.src = resolve(document.cover.logo.src); blocks(document.cover.blocks); }
  for (const page of document.pages) blocks(page.blocks);
  return document;
}

function Preview() {
  const [state, setState] = useState(null);
  React.useEffect(() => {
    function message(event) {
      if (event.origin !== location.origin || event.source !== parent || event.data?.channel !== 'lds-manual-preview' || event.data.kind !== 'render') return;
      try {
        validateDocument(event.data.document);
        setState({ source: event.data.document,document: resolveAssets(event.data.document, event.data.assetBaseUrl, event.data.assetUrls), revision: event.data.revision });
      } catch (error) {
        parent.postMessage({ channel: 'lds-manual-preview', kind: 'invalid', revision: event.data.revision, message: error.message }, location.origin);
      }
    }
    window.addEventListener('message', message);
    parent.postMessage({ channel: 'lds-manual-preview', kind: 'ready' }, location.origin);
    return () => window.removeEventListener('message', message);
  }, []);
  useLayoutEffect(() => {
    if (!state) return;
    let cancelled = false;
    let sequence=0;
    const measure=async () => {
      const current=++sequence;
      await document.fonts.ready;
      await Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); })));
      const svgLoaded=new Map();
      await Promise.all([...document.querySelectorAll('svg image')].map(async element=>{const src=element.getAttribute('href');try{const image=new Image();image.src=src;await image.decode();svgLoaded.set(src,true);}catch{svgLoaded.set(src,false);}}));
      await new Promise(requestAnimationFrame);
      if (cancelled || current!==sequence || document.documentElement.clientWidth===0) return;
      const pages = [...document.querySelectorAll('.lds-manual-page')].map((page,pageIndex) => {
        const content = page.querySelector('.lds-manual-content');
        const sourcePage=state.source.cover&&pageIndex===0?state.source.cover:state.source.pages[pageIndex-(state.source.cover?1:0)];
        const sourcePath=state.source.cover&&pageIndex===0?'/cover':`/pages/${pageIndex-(state.source.cover?1:0)}`;
        content.dataset.sourcePath=sourcePath;
        function annotate(blocks,elements,path){blocks.forEach((block,i)=>{const element=elements[i];if(!element)return;const at=`${path}/${i}`;element.dataset.sourcePath=at;if(block.type==='steps')[...element.children].forEach((step,j)=>step.dataset.sourcePath=`${at}/items/${j}`);if(block.type==='columns'){element.firstElementChild.dataset.sourcePath=at+'/figure';annotate(block.blocks,[...element.lastElementChild.children],at+'/blocks');}});}
        const body=content.querySelector('.lds-manual-section-body');
        if(body)annotate(sourcePage.blocks,[...body.children].filter(e=>!e.classList.contains('lds-manual-lead')),sourcePath+'/blocks');
        const rect = content.getBoundingClientRect();
        const bad = [...content.querySelectorAll('img')].filter(img => !img.complete || !img.naturalWidth);
        const escaped = [...content.querySelectorAll('h1,h2,h3,p,li,figure,table')].filter(element => {
          const r = element.getBoundingClientRect();
          return r.bottom > rect.bottom + 1 || r.right > rect.right + 1 || r.left < rect.left - 1;
        });
        const missingSvg=[...content.querySelectorAll('svg image')].filter(image=>!svgLoaded.get(image.getAttribute('href')));
        const issues=[...escaped.map(element=>({path:element.closest('[data-source-path]')?.dataset.sourcePath||sourcePath,message:'블록이 A4 내용 영역을 벗어납니다.'})),...[...bad,...missingSvg].map(element=>({path:element.closest('[data-source-path]')?.dataset.sourcePath||sourcePath,message:'원본 이미지가 표시되지 않습니다.'}))];
        return { number: page.dataset.manualPage,path:sourcePath,issues:issues.filter((issue,i)=>issues.findIndex(other=>other.path===issue.path&&other.message===issue.message)===i), width: page.getBoundingClientRect().width, overflow: content.scrollHeight > content.clientHeight + 1 || escaped.length > 0, missingImages: [...bad.map(img => img.alt),...missingSvg.map(image=>image.closest('svg')?.getAttribute('aria-label')||'확대 이미지')], headings: [...content.querySelectorAll('h1,h2,h3')].map(h => ({ level: h.tagName, text: h.textContent })) };
      });
      parent.postMessage({ channel: 'lds-manual-preview', kind: 'layout', revision: state.revision, pages }, location.origin);
    };
    measure();
    const observer=new ResizeObserver(measure);observer.observe(document.documentElement);
    window.addEventListener('resize',measure);
    return () => { cancelled = true;observer.disconnect();window.removeEventListener('resize',measure); };
  }, [state]);
  return state ? <ManualDocument document={state.document} /> : <p>유효한 문서 미리보기 대기</p>;
}
createRoot(document.getElementById('preview-root')).render(<Preview />);
