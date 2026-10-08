import React, { useEffect, useRef, useState } from 'react';

// The canvas shows editable drafts; validation independently gates export.
export function A4Preview({ zoom, onZoomChange, locked, document, revision, currentRevision, assetBaseUrl, assetUrls, onLayout, selectedPath, onSelect, onAction, focusRequest, printRequest, onBridge }) {
  const frame = useRef(null),flushes=useRef(new Map());
  const [ready, setReady] = useState(false);
  const [layout, setLayout] = useState(null);
  const [error,setError]=useState(null);
  const latest = useRef({ revision, onLayout, onSelect, onAction });
  latest.current = { revision, onLayout, onSelect, onAction };
  useEffect(() => {
    function message(event) {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || event.data?.channel !== 'lds-manual-preview') return;
      if(['element-select','delete-element','move','text','caret','key','save','notice','edit-start','canvas-select','append','history','image','pick-image','empty-page'].includes(event.data.kind))latest.current.onAction?.(event.data);
      if(event.data.kind==='flushed'){const pending=flushes.current.get(event.data.id);if(pending){clearTimeout(pending.timer);flushes.current.delete(event.data.id);event.data.error?pending.reject(new Error(event.data.error)):pending.resolve();}}
      if(event.data.kind==='select'&&typeof event.data.path==='string')latest.current.onSelect?.(event.data.path);
      if (event.data.kind === 'ready') setReady(true);
      if(event.data.kind==='invalid'&&event.data.revision===latest.current.revision)setError(event.data.message);
      if (event.data.kind === 'layout' && event.data.revision === latest.current.revision) {
        setLayout(event.data); latest.current.onLayout?.(event.data);
      }
    }
    window.addEventListener('message', message);
    return () => window.removeEventListener('message', message);
  }, []);
  useEffect(() => {
    if (!ready || !document) return;
    setLayout(null);
    setError(null);
    frame.current.contentWindow.postMessage({ channel: 'lds-manual-preview', kind: 'render', document, revision, assetBaseUrl, assetUrls }, location.origin);
  }, [ready, document, revision, assetBaseUrl, assetUrls]);
  useEffect(()=>{
    if(ready)frame.current?.contentWindow.postMessage({channel:'lds-manual-preview',kind:'selection',path:selectedPath,zoom},location.origin);
  },[ready,selectedPath,zoom,revision]);
  useEffect(()=>{if(ready&&focusRequest)frame.current.contentWindow.postMessage({channel:'lds-manual-preview',kind:'focus',...focusRequest},location.origin);},[ready,focusRequest]);
  useEffect(()=>{if(ready&&printRequest)frame.current.contentWindow.postMessage({channel:'lds-manual-preview',kind:'print'},location.origin);},[ready,printRequest]);
  useEffect(()=>{onBridge?.({flush:()=>new Promise((resolve,reject)=>{if(!ready){resolve();return;}const id=crypto.randomUUID();const timer=setTimeout(()=>{flushes.current.delete(id);reject(new Error('문서 입력을 확인하지 못했습니다. 다시 시도하세요.'));},3000);flushes.current.set(id,{resolve,reject,timer});frame.current.contentWindow.postMessage({channel:'lds-manual-preview',kind:'flush',id},location.origin);})});},[ready]);
  const stale = revision !== currentRevision;
  return <>
    {error&&<p role="alert">미리보기 생성 오류: {error}</p>}
    <div className="manual-editor-preview-status"><span role="status">{stale?'미완성 내용은 아직 미리보기에 반영되지 않았습니다.':zoom==='write'?'작성 보기 · 출력 전 A4 보기로 확인하세요.':layout?.pages.some(p=>p.overflow)?`문서 전체: ${layout.pages.filter(p=>p.overflow).map(p=>p.number).join(', ')}쪽 분량 초과`:layout?`${layout.pages.length}쪽 · A4`:'문서 확인 중'}</span><label>보기 <select value={zoom} onChange={e=>onZoomChange(e.target.value)}><option value="write">작성 보기</option><option value="fit">A4 맞춤</option><option value="1">100%</option></select></label></div>
    <iframe inert={locked||undefined} ref={frame} className="manual-editor-preview-frame" title="매뉴얼 문서 편집 영역" src="./preview.html" />
  </>;
}
