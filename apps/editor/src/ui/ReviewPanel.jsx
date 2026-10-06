import React,{useState} from 'react';
async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function sets(document){
  const collect=(value,key,out=[])=>{if(typeof value==='string')out.push({key,text:value});else if(Array.isArray(value))value.forEach((v,i)=>collect(v,`${key}[${i}]`,out));else if(value&&typeof value==='object')Object.keys(value).sort().forEach(k=>{if(!['type','src','size','tone','lang'].includes(k))collect(value[k],`${key}.${k}`,out);});return out;};
  return [{id:'document',items:collect({title:document.title},'document')},...(document.cover?[{id:'cover',items:collect(document.cover,'cover')}]:[]),...document.pages.map((p,i)=>({id:`pages[${i}]`,items:collect(p,`pages[${i}]`)}))];
}
export function ReviewPanel({document,sourceDocument,existing,serverReview,onSave,onLocate,disabled}){
  const [record,setRecord]=useState(null),[active,setActive]=useState(0),[error,setError]=useState('');
  async function begin(){
    const current=sets(document),source=sets(sourceDocument||document);
    const next={...structuredClone(existing||{}),schemaVersion:1,contract:'lds-manual-copy-review/v1',reviewKind:'human-review',reviewer:'',reviewedAt:new Date().toISOString(),ruleset:'LDS Manual writing and layout',audience:'',documentHash:await hash(document),sets:[]};
    if(existing){const prior=structuredClone(existing);delete prior.editorReviewHistory;next.editorReviewHistory=[...(Array.isArray(existing.editorReviewHistory)?existing.editorReviewHistory:[]),prior];}
    for(let i=0;i<current.length;i++){const s=current[i],previous=Array.isArray(existing?.sets)?existing.sets.find(x=>x.id===s.id):null,old=Array.isArray(previous?.sourceItems)?previous.sourceItems:source.find(x=>x.id===s.id)?.items||[];next.sets.push({...previous,id:s.id,task:'',contextReason:'',candidateHash:await hash(s.items),sourceItems:old,sourceHash:await hash(old),decisions:s.items.map(item=>({...previous?.decisions?.find(d=>d.key===item.key),...item,verdict:'PENDING',reason:''}))});}
    next.placementReview=Array.isArray(existing?.placementReview)?structuredClone(existing.placementReview):[];
    function placements(blocks,path){blocks.forEach((block,i)=>{const id=`${path}[${i}]`;if(['callout','help'].includes(block.type)){const index=next.placementReview.findIndex(row=>row.id===id),previous=next.placementReview[index];const row={...previous,id,title:block.title,role:'',relatedAction:'',placement:'',reason:'',decision:'PENDING'};if(index<0)next.placementReview.push(row);else next.placementReview[index]=row;}if(block.type==='columns')placements(block.blocks,`${id}.blocks`);});}
    if(document.cover)placements(document.cover.blocks,'cover.blocks');document.pages.forEach((page,i)=>placements(page.blocks,`pages[${i}].blocks`));
    setRecord(next);setActive(0);setError('');
  }
  function changeSet(key,value){setRecord(old=>({...old,sets:old.sets.map((s,i)=>i===active?{...s,[key]:value}:s)}));}
  const current=record?.sets[active];
  return <details className="manual-editor-context-review"><summary>문맥 검토와 제품 승인 근거</summary>
    <p>제품 승인 기록: {serverReview?.product?.recordedStatus||'미기록'} · 현재 편집 승인으로 자동 인정하지 않습니다.</p>
    {(serverReview?.copy?.errors||[]).map((message,i)=><p key={i}>{message}</p>)}
    <p>문구 기록 일치와 배치의 의미 판단은 별개입니다. 기존 기록은 이력에 보존합니다.</p><button disabled={disabled} onClick={()=>begin().catch(e=>setError(e.message))}>현재 과업의 검토 초안 만들기</button>
    {existing?.placementReview?.length>0&&<details><summary>보존된 배치 기록 · 현재 문서 검토와 구분</summary>{existing.placementReview.map((row,i)=><p key={i}>{row.id||'기존 기록 '+(i+1)} · {row.title} · {row.decision} · {row.reason}</p>)}</details>}
    {record&&<><p>초안 판정은 모두 미검토로 시작합니다. 원문·현재 문구와 과업 맥락을 읽고 근거를 작성합니다.</p>
      <label>검토자 <input value={record.reviewer} onChange={e=>setRecord({...record,reviewer:e.target.value})}/></label>
      <label>대상 독자 <input value={record.audience} onChange={e=>setRecord({...record,audience:e.target.value})}/></label>
      <label>검토할 과업 <select value={active} onChange={e=>setActive(Number(e.target.value))}>{record.sets.map((s,i)=><option key={s.id} value={i}>{s.id}</option>)}</select></label>
      <button onClick={()=>onLocate(current.id==='document'?'/':current.id==='cover'?'/cover':`/pages/${active-(document.cover?2:1)}`)}>해당 과업으로 이동</button>
      <label>사용자 과업 <input value={current.task} onChange={e=>changeSet('task',e.target.value)}/></label>
      <label>맥락 판단 근거 <textarea value={current.contextReason} onChange={e=>changeSet('contextReason',e.target.value)}/></label>
      {record.placementReview.filter(row=>row.id?.startsWith(current.id+'.')).map(row=><fieldset key={row.id}><legend>{row.title} · 보충 안내 배치</legend>{[['role','안내 역할'],['relatedAction','관련 행동'],['placement','안내 위치'],['reason','배치 판단 근거']].map(([key,label])=><label key={key}>{label}<input value={row[key]} onChange={e=>setRecord({...record,placementReview:record.placementReview.map(item=>item.id===row.id?{...item,[key]:e.target.value}:item)})}/></label>)}<label>배치 판정 <select value={row.decision} onChange={e=>setRecord({...record,placementReview:record.placementReview.map(item=>item.id===row.id?{...item,decision:e.target.value}:item)})}><option value="PENDING">미검토</option><option value="KEEP">유지</option><option value="MOVE">이동 확인</option><option value="BLOCKED">확인 필요</option></select></label></fieldset>)}
      {current.decisions.map((decision,i)=><fieldset key={decision.key}><legend>문구 {i+1}</legend><p>원문: {current.sourceItems.find(x=>x.key===decision.key)?.text??'새 문구'}</p><p>현재: {decision.text}</p><label>판정 <select value={decision.verdict} onChange={e=>changeSet('decisions',current.decisions.map((d,j)=>j===i?{...d,verdict:e.target.value}:d))}><option value="PENDING">미검토</option><option value="KEEP">원문 유지</option><option value="REVISE">수정 확인</option><option value="BLOCKED">확인 필요</option></select></label><label>판정 이유 <input value={decision.reason} onChange={e=>changeSet('decisions',current.decisions.map((d,j)=>j===i?{...d,reason:e.target.value}:d))}/></label></fieldset>)}
      <button disabled={disabled} onClick={async()=>{try{if(await hash(document)!==record.documentHash)throw new Error('검토 초안 이후 문서가 바뀌었습니다. 새 과업 검토가 필요합니다.');await onSave(record);setError('검토 기록을 저장했습니다. 서버의 최신성 판정을 확인합니다.');}catch(e){setError(e.message);}}}>검토 기록 저장</button><p role="status">{error}</p>
    </>}
  </details>;
}
