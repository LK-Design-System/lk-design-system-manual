import React, { useLayoutEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ManualDocument } from '../../../src/index.mjs';
import '@lk-design-system/lds-core/styles.css';
import '@lk-design-system/lds-theme/styles.css';
import '../../../styles.css';
import './ui/preview-surface.css';
import {installCanvasInput,markEditable,actionButton,focusEditable} from './ui/canvas-input.mjs';
import {installCanvasDrag} from './ui/canvas-drag.mjs';
import {canvasDocument} from './ui/canvas-document.mjs';
import brandUrl from '@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg?url';

function resolveAssets(input, base, urls = {}) {
  const document = canvasDocument(input);
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
  const input=useRef(null),drag=useRef(null),pending=useRef(null),focusPath=useRef(null),annotatedRevision=useRef(null);
  function restoreFocus(){const request=focusPath.current;if(!request||request.revision!==annotatedRevision.current)return;if(request.handle)drag.current?.select(request.path);const target=[...document.querySelectorAll(request.handle?'[data-move-handle]':request.element?'[data-source-path]':'[data-edit-path]')].find(e=>(request.handle?e.dataset.moveHandle:request.element?e.dataset.sourcePath:e.dataset.editPath)===request.path);if(target){focusPath.current=null;if(request.handle||request.element)target.focus({preventScroll:true});else focusEditable(target,request.offset);}}
  function render(data){setState({source:data.document,document:resolveAssets(data.document,data.assetBaseUrl,data.assetUrls),revision:data.revision});}
  const selected=useRef('/pages/0'), zoom=useRef('fit'), scrollRequest=useRef(false);
  const [scale,setScale]=useState(1),[viewMode,setViewMode]=useState('a4');
  function fit(){setViewMode(zoom.current==='write'?'write':'a4');document.documentElement.dataset.view=zoom.current==='write'?'write':'a4';setScale(zoom.current==='fit'?Math.min(1,Math.max(.2,(document.documentElement.clientWidth-48)/(210*96/25.4))):1);}
  function highlight(scroll=false){
    for(const element of document.querySelectorAll('[data-source-path]'))element.classList.toggle('manual-editor-selected',element.dataset.sourcePath===selected.current);
    if(scroll)scrollRequest.current=true;
    if(scrollRequest.current){const element=[...document.querySelectorAll('[data-source-path]')].find(element=>element.dataset.sourcePath===selected.current);if(element){const pageSelection=/^\/pages\/\d+$/.test(selected.current)||selected.current==='/cover';(pageSelection?element.closest('.lds-manual-page'):element).scrollIntoView({block:pageSelection?'start':'nearest',inline:'nearest'});scrollRequest.current=false;}}
  }
  React.useEffect(() => {
    function message(event) {
      if (event.origin !== location.origin || event.source !== parent || event.data?.channel !== 'lds-manual-preview' ) return;
      if(event.data.kind==='selection'){const changed=selected.current!==event.data.path;selected.current=event.data.path;zoom.current=event.data.zoom||'fit';fit();highlight(changed);return;}
      if(event.data.kind==='flush'){try{input.current?.flush();parent.postMessage({channel:'lds-manual-preview',kind:'flushed',id:event.data.id},location.origin);}catch(error){parent.postMessage({channel:'lds-manual-preview',kind:'flushed',id:event.data.id,error:error.message},location.origin);}return;}
      if(event.data.kind==='print'){document.activeElement?.blur();window.print();return;}
      if(event.data.kind==='focus'){focusPath.current=event.data;restoreFocus();return;}
      if(event.data.kind!=='render')return;
      if(input.current?.isEditing()||drag.current?.isDragging()){pending.current=event.data;return;}
      try {
        pending.current=null;render(event.data);
      } catch (error) {
        parent.postMessage({ channel: 'lds-manual-preview', kind: 'invalid', revision: event.data.revision, message: error.message }, location.origin);
      }
    }
    const idle=()=>{if(pending.current&&!input.current.isEditing()&&!drag.current?.isDragging()){const data=pending.current;pending.current=null;render(data);}};
    input.current=installCanvasInput({onIdle:idle,onElementSelect:path=>{drag.current.select(path);document.querySelector('[data-move-handle]')?.focus({preventScroll:true});}});
    const editElement=path=>{
      const element=[...document.querySelectorAll('[data-move-path]')].find(element=>element.dataset.movePath===path);
      const field=element?.matches('[data-edit-path]')?element:element?.querySelector('[data-edit-path]');
      if(field)focusEditable(field);else element?.focus({preventScroll:true});
    };
    drag.current=installCanvasDrag({beforeDrag:()=>input.current.flush(),onIdle:idle,onEdit:editElement,getRevision:()=>annotatedRevision.current,onSelect:path=>parent.postMessage({channel:'lds-manual-preview',kind:'element-select',path},location.origin),onDelete:(path,revision)=>parent.postMessage({channel:'lds-manual-preview',kind:'delete-element',path,revision},location.origin),onMove:(path,collection,gap,revision)=>parent.postMessage({channel:'lds-manual-preview',kind:'move',path,collection,gap,revision},location.origin)});

    fit();window.addEventListener('resize',fit);
    window.addEventListener('message', message);
    parent.postMessage({ channel: 'lds-manual-preview', kind: 'ready' }, location.origin);
    return () => {window.removeEventListener('message',message);window.removeEventListener('resize',fit);drag.current.dispose();input.current.dispose();};
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
      if (input.current?.isEditing() || drag.current?.isDragging() || cancelled || current!==sequence || document.documentElement.clientWidth===0) return;
      const pages = [...document.querySelectorAll('.lds-manual-page')].map((page,pageIndex) => {
        const content = page.querySelector('.lds-manual-content');
        content.querySelectorAll('.manual-canvas-action').forEach(button=>button.remove());
        const sourcePage=state.source.cover&&pageIndex===0?state.source.cover:state.source.pages[pageIndex-(state.source.cover?1:0)];
        const sourcePath=state.source.cover&&pageIndex===0?'/cover':`/pages/${pageIndex-(state.source.cover?1:0)}`;
        content.dataset.sourcePath=sourcePath;content.tabIndex=-1;content.title='페이지 제목 편집';
        function figureFields(element,at){markEditable(element.querySelector('figcaption'),at+'/caption','그림 설명');}
        function annotate(blocks,elements,path){blocks.forEach((block,i)=>{
          const element=elements[i];if(!element)return;const at=`${path}/${i}`;
          element.dataset.sourcePath=at;element.dataset.movePath=at;element.dataset.moveLabel=({paragraph:'본문',subheading:'소제목',figure:'그림',steps:'절차',list:'목록',table:'표',callout:'안내',quote:'인용문'})[block.type]||'내용';element.tabIndex=-1;
          if(['paragraph','subheading'].includes(block.type))markEditable(element,at+'/text',block.type==='paragraph'?'본문':'소제목',at);
          if(['callout','help'].includes(block.type)){markEditable(element.querySelector('[data-slot=title]'),at+'/title','안내 제목');markEditable(element.querySelector('[data-slot=body]'),at+'/text','안내 내용');}
          if(block.type==='address')markEditable(element.querySelector('strong'),at+'/value','주소');
          if(block.type==='figure')figureFields(element,at);
          if(block.type==='table'){
            [...element.querySelectorAll('thead th')].forEach((cell,j)=>markEditable(cell,`${at}/headers/${j}`,'표 머리글'));
            [...element.querySelectorAll('tbody tr')].forEach((row,j)=>[...row.children].forEach((cell,k)=>markEditable(cell,`${at}/rows/${j}/${k}`,'표 내용')));
          }
          if(block.type==='list')[...element.children].forEach((item,j)=>{if(typeof block.items[j]==='string')markEditable(item,`${at}/items/${j}`,'목록 항목',at);});
          if(block.type==='steps'){
            element.dataset.moveCollection=at+'/items';
            [...element.children].filter(e=>e.tagName==='LI').forEach((step,j)=>{
              const stepPath=`${at}/items/${j}`;step.dataset.sourcePath=stepPath;step.dataset.movePath=stepPath;step.dataset.moveLabel=`${j+1}단계`;step.tabIndex=-1;
              markEditable(step.querySelector('h3'),stepPath+'/title','단계 제목',stepPath);
              markEditable(step.querySelector('.lds-manual-step-label p'),stepPath+'/text','단계 설명',stepPath);
              const figure=step.querySelector('figure');if(figure){figure.dataset.sourcePath=stepPath+'/figure';figureFields(figure,stepPath+'/figure');}
            });
          }
          if(block.type==='columns'){element.lastElementChild.dataset.moveCollection=at+'/blocks';element.firstElementChild.dataset.sourcePath=at+'/figure';figureFields(element.firstElementChild,at+'/figure');annotate(block.blocks,[...element.lastElementChild.children],at+'/blocks');}
        });}
        markEditable(content.querySelector(state.source.cover&&pageIndex===0?'h1':'.lds-manual-section-title'),sourcePath+'/title','페이지 제목');
        const body=content.querySelector('.lds-manual-section-body');
        if(body)body.dataset.moveCollection=sourcePath+'/blocks';
        if(body&&sourcePage.blocks.length===0)actionButton(body,'+ 본문 작성하기','empty-page',sourcePath);
        if(body){annotate(sourcePage.blocks,[...body.children].filter(e=>!e.classList.contains('lds-manual-lead')),sourcePath+'/blocks');markEditable(body.querySelector('.lds-manual-lead'),sourcePath+'/lead','도입 문장');}
        for(const element of content.querySelectorAll('[data-edit-path]')){const value=element.dataset.editPath.split('/').filter(Boolean).reduce((v,key)=>v?.[key],state.source);if(value===''||value===undefined){element.textContent='';if(value===undefined)element.dataset.optionalEmpty='true';else delete element.dataset.optionalEmpty;}else delete element.dataset.optionalEmpty;}
        // Editing controls must not count toward printed page geometry.
        const controls=[...content.querySelectorAll('.manual-canvas-action,[data-optional-empty]')];controls.forEach(element=>element.hidden=true);
        const rect = content.getBoundingClientRect();
        const bad = [...content.querySelectorAll('img')].filter(img => !img.complete || !img.naturalWidth);
        const escaped = [...content.querySelectorAll('h1,h2,h3,p,li,figure,table')].filter(element => {
          if(element.hidden||element.closest('[hidden]'))return false;
          const r = element.getBoundingClientRect();
          return r.bottom > rect.bottom + scale || r.right > rect.right + scale || r.left < rect.left - scale;
        });
        const missingSvg=[...content.querySelectorAll('svg image')].filter(image=>!svgLoaded.get(image.getAttribute('href')));
        const issues=[...escaped.map(element=>({path:element.closest('[data-source-path]')?.dataset.sourcePath||sourcePath,message:'블록이 A4 내용 영역을 벗어납니다.'})),...[...bad,...missingSvg].map(element=>({path:element.closest('[data-source-path]')?.dataset.sourcePath||sourcePath,message:'원본 이미지가 표시되지 않습니다.'}))];
        const overflow=zoom.current!=='write'&&(content.scrollHeight>content.clientHeight+1||escaped.length>0);
        for(const element of [...bad,...missingSvg]){const figure=element.closest('figure');if(figure&&!figure.querySelector('.manual-canvas-action'))actionButton(figure,'이미지를 찾을 수 없습니다 · 다시 선택','pick-image',figure.dataset.sourcePath);}
        controls.forEach(element=>element.hidden=false);
        return { number: page.dataset.manualPage,path:sourcePath,issues:issues.filter((issue,i)=>issues.findIndex(other=>other.path===issue.path&&other.message===issue.message)===i), width: page.getBoundingClientRect().width/scale, overflow, missingImages: [...bad.map(img => img.alt),...missingSvg.map(image=>image.closest('svg')?.getAttribute('aria-label')||'확대 이미지')], headings: [...content.querySelectorAll('h1,h2,h3')].map(h => ({ level: h.tagName, text: h.textContent })) };
      });
      highlight();
      drag.current?.refresh();
      annotatedRevision.current=state.revision;restoreFocus();
      parent.postMessage({ channel: 'lds-manual-preview', kind: 'layout', revision: state.revision, mode:zoom.current==='write'?'write':'a4', pages }, location.origin);
    };
    measure();
    const observer=new ResizeObserver(measure);observer.observe(document.documentElement);
    window.addEventListener('resize',measure);
    return () => { cancelled = true;observer.disconnect();window.removeEventListener('resize',measure); };
  }, [state,scale,viewMode]);
  return state ? <div className="manual-editor-paper-stack" style={{zoom:scale}}><ManualDocument key={state.revision} document={state.document} /></div> : <p>유효한 문서 미리보기 대기</p>;
}
createRoot(document.getElementById('preview-root')).render(<Preview />);
