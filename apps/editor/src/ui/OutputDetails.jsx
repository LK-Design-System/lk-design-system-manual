import React,{useState} from 'react';
export function OutputDetails({job,jobs=[],expectedRevision,dirty,onOpen,onReview,onSelect,onRefresh}){
  const [reviewer,setReviewer]=useState(''),[reason,setReason]=useState(''),[outcome,setOutcome]=useState('fail');
  const current=job?.state==='succeeded'&&job.current===true&&!dirty&&job.revision===expectedRevision;
  return <details><summary>출력 리비전과 시각 검토</summary><button onClick={onRefresh}>출력 이력 새로고침</button><ol>{jobs.map(item=><li key={item.jobId}><button onClick={()=>onSelect(item)}>{item.format?.toUpperCase()} · {item.mode} · {item.state} · {item.revision?.slice(0,8)} · {item.current&&!dirty&&item.revision===expectedRevision?'현재 리비전':'오래된 리비전'}</button></li>)}</ol>{job&&<><p>{job.format?.toUpperCase()} · {job.mode==='reviewed'?'검토 후':'초안'} · {job.state} · {current?'현재 저장 내용과 렌더러 일치':'현재 출력으로 확인되지 않음'}</p><p>출력 리비전: {job.revision} · 렌더러: {job.rendererHash}</p><p>{job.error}</p>
    {Object.entries(job.artifacts||{}).map(([name,artifact])=><button key={name} onClick={()=>onOpen(artifact.url)}>{name} 열기</button>)}
    {Object.entries(job.diagnostics||{}).map(([name,artifact])=><button key={name} onClick={()=>onOpen(artifact.url)}>진단 {name} 열기</button>)}
    <details><summary>출력 실행 근거</summary><pre>{JSON.stringify({commands:job.commands,environment:job.environment,artifacts:job.artifacts,diagnostics:job.diagnostics},null,2)}</pre></details>
    {job.state==='succeeded'&&<><p>실제 출력 전 페이지를 읽은 뒤 해당 리비전의 시각 검토를 기록합니다. 제품 담당자 승인과 별개입니다.</p><label>시각 검토자 <input value={reviewer} onChange={e=>setReviewer(e.target.value)}/></label><label>시각 검토 결과 <select value={outcome} onChange={e=>setOutcome(e.target.value)}><option value="fail">보정 필요</option><option value="pass">검토 통과</option></select></label><label>시각 검토 근거 <input value={reason} onChange={e=>setReason(e.target.value)}/></label><button disabled={!current||!reviewer.trim()||!reason.trim()} onClick={()=>onReview({jobId:job.jobId,reviewer,reason,outcome})}>이 출력의 시각 검토 기록</button></>}
  </>}</details>;
}
