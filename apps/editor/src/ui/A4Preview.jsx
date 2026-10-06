import React, { useEffect, useRef, useState } from 'react';

// Only a valid Manual projection is sent. The integration retains the last valid
// projection while draft validation fails, and identifies its exact revision.
export function A4Preview({ document, revision, currentRevision, assetBaseUrl, assetUrls, onLayout }) {
  const frame = useRef(null);
  const [ready, setReady] = useState(false);
  const [layout, setLayout] = useState(null);
  const [error,setError]=useState(null);
  const latest = useRef({ revision, onLayout });
  latest.current = { revision, onLayout };
  useEffect(() => {
    function message(event) {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || event.data?.channel !== 'lds-manual-preview') return;
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
  const stale = revision !== currentRevision;
  return <>
    {error&&<p role="alert">미리보기 생성 오류: {error}</p>}
    <p role="status">{stale ? `현재 편집 미반영 · 마지막 유효 리비전 ${revision}` : `미리보기 리비전 ${revision}`} · {layout ? `${layout.pages.length}쪽 · ${layout.pages.some(p => p.overflow) ? '분량 초과 확인 필요' : '측정 완료'} · ${layout.pages.reduce((sum,p)=>sum+p.missingImages.length,0)}개 누락 이미지` : '폰트·이미지 및 레이아웃 확인 중'}</p>
    <iframe ref={frame} className="manual-editor-preview-frame" title="원래 크기의 A4 문서" src="./preview.html" />
  </>;
}
