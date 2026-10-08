import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import '@lk-design-system/lds-core/styles.css';
import '@lk-design-system/lds-theme/styles.css';
import {ManualEditor} from '../../src/redesign/ManualEditor.jsx';
import {createEmptyManualDocument} from '../../src/redesign/manual-v2.mjs';
import {createManualStorageFixture} from './manual-storage-support.mjs';
import paginationFixture from './manual-pagination.manual.json';
import {createManualEmptyPaginationSeed} from './manual-pagination-seeds.mjs';

function initialDocument(title,pageTitle,body){const document=createEmptyManualDocument();document.title=title;document.pages[0].title=[{type:'text',text:pageTitle}];document.pages[0].blocks[0].content=[{type:'text',text:body}];return document;}
function initialStore(){
 const kind=new URLSearchParams(window.location.search).get('document');
 if(kind==='pagination')return createManualStorageFixture([paginationFixture.document],{initialAssets:{[paginationFixture.document.id]:paginationFixture.assets}});
 if(kind==='pagination-empty')return createManualStorageFixture([createManualEmptyPaginationSeed()]);
 return createManualStorageFixture([
  initialDocument('합성 저장 검증 · 첫 문서','저장 경계 확인','초기 저장 내용입니다. 이 본문을 바꾸어 저장 실패와 복구를 확인하세요.'),
  initialDocument('합성 저장 검증 · 두 번째 문서','다른 문서 열기','두 번째 문서의 원본 내용입니다.'),
 ]);
}
function Fixture(){
 const store=useRef(null);if(!store.current)store.current=initialStore();
 const [status,setStatus]=useState(()=>store.current.getStatus());useEffect(()=>store.current.subscribe(setStatus),[]);
 return <div className="storage-qa-shell">
  <style>{`.storage-qa-shell{height:100vh;display:grid;grid-template-rows:auto minmax(0,1fr);font-family:Arial,sans-serif}.storage-qa-controls{padding:8px 12px;background:#f5f7fa;border-bottom:1px solid #cbd5e1;display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px}.storage-qa-controls button{padding:5px 8px}.storage-qa-records{max-height:130px;overflow:auto;width:100%}.storage-qa-editor{min-height:0}.storage-qa-editor>.manual-v2-shell{height:100%;min-height:0}`}</style>
  <section className="storage-qa-controls" aria-label="합성 저장 제어">
   <strong>합성 저장 검증 · 메모리 보관함</strong>
   <button type="button" aria-pressed={status.mode==='normal'} onClick={()=>store.current.setMode('normal')}>정상 저장</button>
   <button type="button" aria-pressed={status.mode==='quota'} onClick={()=>store.current.setMode('quota')}>저장 공간 부족 재현</button>
   <button type="button" aria-pressed={status.mode==='delayed'} onClick={()=>store.current.setMode('delayed')}>저장 1.2초 지연</button>
   <label><input type="checkbox" checked={status.delayLoads} onChange={event=>store.current.setDelayLoads(event.target.checked)}/>문서 열기 1.2초 지연</label>
   <output aria-label="합성 저장 통계">시도 {status.attempts} · 성공 {status.commits} · 저장 중 {status.activeWrites} · 열기 중 {status.activeLoads}</output>
   <details className="storage-qa-records"><summary>저장된 합성 내용 확인</summary><ul>{status.records.map(record=><li key={record.id}><strong>{record.title}</strong> · {record.pages}쪽 · 그림 {record.assets}개 <span>{record.content.map(block=>`${block.type}: ${block.text}`).join(' / ')}</span></li>)}</ul></details>
  </section>
  <div className="storage-qa-editor"><ManualEditor storage={store.current.api}/></div>
 </div>;
}
createRoot(document.getElementById('storage-fixture-root')).render(<Fixture/>);
