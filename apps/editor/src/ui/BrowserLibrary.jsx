import React,{useEffect,useRef,useState} from 'react';
import {EditorButton as Button} from './EditorButton.jsx';
export function BrowserLibrary({records,onOpen,onClose,onImport}){
 const dialog=useRef(null);
 const [error,setError]=useState(null),[loading,setLoading]=useState(false);
 useEffect(()=>{dialog.current.showModal();},[]);
 return <dialog className="manual-editor-review-dialog" ref={dialog} aria-labelledby="browser-library-title" onCancel={event=>{if(loading)event.preventDefault();else onClose();}}>
  <div className="manual-editor-section-heading"><h2 id="browser-library-title">문서 열기</h2><Button variant="ghost" size="sm" disabled={loading} onClick={onClose}>닫기</Button></div>
  <p>이 브라우저에 저장한 문서입니다. 다른 컴퓨터로 옮길 때는 문서 파일을 내려받으세요.</p>
  {records.map(record=><Button key={record.id} variant="ghost" full styles={{root:{justifyContent:"flex-start",textAlign:"left",height:"auto",minHeight:40,whiteSpace:"normal"}}} disabled={loading} onClick={()=>onOpen(record)}>{record.document.title||'제목 없는 문서'} · {new Date(record.savedAt).toLocaleString('ko-KR')}</Button>)}
  {!records.length&&<p>저장한 문서가 없습니다.</p>}
  <label>문서 파일 열기 <input type="file" accept=".json" disabled={loading} onChange={async event=>{const file=event.target.files?.[0];event.target.value="";if(!file)return;setError(null);setLoading(true);try{setError(await onImport(file));}catch(error){setError(error.message);}finally{setLoading(false);}}}/></label>
  {loading&&<p role="status">문서 파일을 읽고 있습니다.</p>}
  {error&&<p role="alert">{error}</p>}
 </dialog>;
}
