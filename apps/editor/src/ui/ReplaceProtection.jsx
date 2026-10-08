import {EditorButton as Button} from './EditorButton.jsx';
import React,{useEffect,useRef} from 'react';
export function ReplaceProtection({kind,conflict,draftMismatch,busy,onSave,onDraft,onDiscard,onCancel,onDownload}){
  const section=useRef(null),running=useRef(false);
  useEffect(()=>{if(!kind)return;const previous=document.activeElement;section.current?.querySelector('button:not(:disabled)')?.focus();return()=>{previous?.isConnected&&previous.focus?.();};},[kind]);
  async function action(callback){if(busy||running.current)return;running.current=true;try{await callback();}finally{running.current=false;}}
  function keys(event){if(event.key==='Escape'&&!busy){event.preventDefault();action(onCancel);}if(event.key==='Tab'){const buttons=[...section.current.querySelectorAll('button:not(:disabled)')];const first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}
  if(!kind)return null;
  return <section ref={section} onKeyDown={keys} role="alertdialog" aria-modal="true" aria-label="편집 내용 보존" className="manual-editor-replacement"><h2>현재 편집 내용을 먼저 보존합니다</h2>
    <p>{draftMismatch?'보관 초안의 기준 리비전이 현재 정본과 다릅니다. 복원은 메모리 편집 상태만 바꾸며 정본을 덮지 않습니다.':'새로 읽기 전에 저장·초안 보관·취소 중에서 선택합니다.'}</p>
    {conflict&&<p>외부 파일 변경으로 저장이 거부됐습니다. 현재 편집은 유지됩니다. 필요하면 편집 내용을 내려받아 보관합니다.</p>}
    <Button variant="primary" onClick={()=>action(onSave)} disabled={busy||conflict}>정본 저장 후 계속</Button><Button onClick={()=>action(onDraft)} disabled={busy||conflict}>초안 보관 후 계속</Button><Button disabled={busy} onClick={()=>action(onDownload)}>편집 JSON 내려받기</Button><Button danger disabled={busy} onClick={()=>action(onDiscard)}>현재 변경을 버리고 계속</Button><Button disabled={busy} onClick={()=>action(onCancel)}>취소</Button>
  </section>;
}
