import {EditorButton as Button} from './EditorButton.jsx';
import React,{useEffect,useState,useRef} from 'react';
import {stepBlockIndexes,normalizeStepTarget} from './step-controls.mjs';
export function Properties({value,onApply,onUnset,assetUrl,onImport,destinations=[],movingStep=false,onMoveTo,onSplit,splitSupported=false}){
  const [draft,setDraft]=useState({});
  const [cropped,setCropped]=useState(false);
  const [dimensions,setDimensions]=useState(null);
  const [destination,setDestination]=useState(0),[targetIndex,setTargetIndex]=useState(0),[splitAt,setSplitAt]=useState(1);
  const [stepsTarget,setStepsTarget]=useState(null);
  const targetPageIndex=Math.max(0,Math.min(destination,destinations.length-1));
  const targetPage=destinations[targetPageIndex];
  const stepChoices=stepBlockIndexes(targetPage);
  const normalizedStepsTarget=normalizeStepTarget(targetPage,stepsTarget);
  const anchor=useRef(null);
  useEffect(()=>{setDraft(value?structuredClone(value):{});setCropped(!!value?.crop);},[value]);
  useEffect(()=>{setStepsTarget(normalizedStepsTarget);},[targetPageIndex,stepChoices.join(','),normalizedStepsTarget]);
  if(!value||typeof value!=='object'||Array.isArray(value))return <p>개요에서 페이지나 블록을 선택합니다.</p>;
  const figure=value.type==='figure'||('src'in value&&'caption'in value);
  const set=(key,next)=>setDraft(old=>({...old,[key]:next}));
  const optional=value.schemaVersion===1?{lang:'ko',cover:{title:'표지 제목',metadata:[{label:'버전',value:'초안'}],blocks:[{type:'paragraph',text:'준비사항을 작성합니다.'}]}}:value.metadata&&value.blocks?{sectionTitle:'시작하기 전에',logo:{src:'@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg',alt:'LK ROBOTICS'}}:!value.type&&value.blocks?{lead:''}:!value.type&&value.title?{text:'',quote:'',figure:{src:'assets/screen.png',alt:'화면 설명',caption:'그림 설명'}}:value.label!==undefined&&value.value!==undefined?{emphasis:false,labelEmphasis:false}:value.type==='steps'?{start:1}:figure?{size:'full',previewTitle:'자료 프레임'}:['callout','help'].includes(value.type)?{tone:'signal'}:{};
  const fieldNames={lang:'언어',cover:'표지',lead:'도입 문장',sectionTitle:'표지 섹션 제목',logo:'공식 로고',text:'설명',quote:'인용문',figure:'그림',emphasis:'값 강조',labelEmphasis:'이름 강조',start:'시작 번호',size:'그림 폭',previewTitle:'자료 프레임',tone:'안내 의미'};
  function point(event){const r=event.currentTarget.getBoundingClientRect();return {x:Math.max(0,Math.min(dimensions.width,(event.clientX-r.left)/r.width*dimensions.width)),y:Math.max(0,Math.min(dimensions.height,(event.clientY-r.top)/r.height*dimensions.height))};}
  return <>
    <p>문구는 편집 영역에서 입력합니다. 아래 속성은 적용 버튼으로 한 번에 변경합니다.</p>
    {Object.entries(optional).filter(([key])=>!(key in value)).map(([key,initial])=><Button key={key} onClick={()=>onApply({...value,[key]:initial})}>{fieldNames[key]} 추가</Button>)}
    {value.type==='steps'&&<label>시작 번호 <input type="number" min="1" step="1" value={draft.start??1} onChange={e=>set('start',Number(e.target.value))}/></label>}
    {value.type==='steps'&&value.items.length>1&&<><label>다음 페이지로 분리할 단계 <input disabled={!splitSupported} type="number" min="1" max={value.items.length-1} value={splitAt} onChange={e=>setSplitAt(Number(e.target.value))}/></label><Button disabled={!splitSupported||!onSplit} onClick={()=>{if(splitSupported)onSplit?.(splitAt);}}>선택한 경계에서 단계 나누기</Button>{!splitSupported&&<p>본문 페이지의 최상위 절차만 다음 페이지로 분리할 수 있습니다. 표지·화면과 설명 내부 절차는 먼저 본문 페이지로 옮깁니다.</p>}</>}
    {destinations.length>1&&<><label>이동할 페이지 <select value={targetPageIndex} onChange={e=>{const index=Number(e.target.value);setDestination(index);setStepsTarget(normalizeStepTarget(destinations[index],null));}}>{destinations.map((page,i)=><option key={i} value={i}>{i+1} · {page.title}</option>)}</select></label>{movingStep&&<label>대상 절차 블록 <select disabled={normalizedStepsTarget===null} value={normalizedStepsTarget??''} onChange={e=>setStepsTarget(Number(e.target.value))}>{stepChoices.length?stepChoices.map(i=><option key={i} value={i}>{i+1} · {targetPage.blocks[i].items[0]?.title||'절차'}</option>):<option value="">대상 절차 없음</option>}</select></label>}<label>대상 구성 위치 <input type="number" min="0" value={targetIndex} onChange={e=>setTargetIndex(Number(e.target.value))}/></label><Button disabled={movingStep&&normalizedStepsTarget===null} onClick={()=>{if(!movingStep||normalizedStepsTarget!==null)onMoveTo(targetPageIndex,targetIndex,normalizedStepsTarget);}}>선택 구성 옮기기</Button></>}
    {['callout','help'].includes(value.type)&&<label>안내 의미 <select value={draft.tone??'signal'} onChange={e=>set('tone',e.target.value)}>{[['signal','보충'],['positive','성공'],['cautionary','주의'],['negative','실패'],['offline','연결 끊김']].map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>}
    {figure&&<>
      {onImport&&<label>원본 이미지 가져오기 <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e=>{if(e.target.files?.[0])onImport(e.target.files[0]);}}/></label>}
      <label>그림 폭 <select value={draft.size??'full'} onChange={e=>set('size',e.target.value)}>{[['full','본문 전체'],['reading','읽기용'],['compact','컴팩트']].map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>자료 프레임 이름 <input value={draft.previewTitle??''} onChange={e=>set('previewTitle',e.target.value)}/></label>
      <p>프레임 이름은 이미지 위, 캡션은 이미지 아래에 표시됩니다. 원본·대체 텍스트·캡션은 편집 영역에서 각각 입력합니다.</p>
      {assetUrl&&<div className="manual-editor-original"><img src={assetUrl} alt="확대 영역을 지정할 원본" onLoad={e=>setDimensions({width:e.target.naturalWidth,height:e.target.naturalHeight})}/>{dimensions&&<p>브라우저 원본 {dimensions.width} × {dimensions.height}px · 원본 바이트 보존</p>}{cropped&&dimensions&&<svg viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} aria-label="원본에서 확대 영역 지정" onPointerDown={e=>{anchor.current=point(e);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!anchor.current)return;const p=point(e);set('crop',{...draft.crop,x:Math.min(p.x,anchor.current.x),y:Math.min(p.y,anchor.current.y),width:Math.max(1,Math.abs(p.x-anchor.current.x)),height:Math.max(1,Math.abs(p.y-anchor.current.y)),sourceWidth:dimensions.width,sourceHeight:dimensions.height});}} onPointerUp={()=>{anchor.current=null;}} onPointerCancel={()=>{anchor.current=null;}}><image href={assetUrl} width={dimensions.width} height={dimensions.height}/>{draft.crop&&<rect x={draft.crop.x} y={draft.crop.y} width={draft.crop.width} height={draft.crop.height} fill="rgba(32,120,240,.15)" stroke="#1677ff" strokeWidth="2"/>}</svg>}</div>}
      <label><input type="checkbox" checked={cropped} onChange={e=>{setCropped(e.target.checked);if(e.target.checked&&!draft.crop)set('crop',{x:0,y:0,width:dimensions?.width??100,height:dimensions?.height??100,sourceWidth:dimensions?.width??100,sourceHeight:dimensions?.height??100});}}/>원본 좌표 확대 사용</label>
      {cropped&&<fieldset><legend>브라우저 원본 픽셀 좌표</legend>{[['x','왼쪽'],['y','위쪽'],['width','확대 폭'],['height','확대 높이'],['sourceWidth','원본 폭'],['sourceHeight','원본 높이']].map(([key,label])=><label key={key}>{label}<input type="number" step="any" value={draft.crop?.[key]??0} onChange={e=>set('crop',{...draft.crop,[key]:Number(e.target.value)})}/></label>)}<p>원본 크기는 자산 검사 결과와 일치해야 합니다. 기존 좌표를 자동 보정하지 않습니다.</p></fieldset>}
    </>}
    {(figure||['steps','callout','help'].includes(value.type))&&<Button variant="primary" disabled={JSON.stringify(draft)===JSON.stringify(value)&&cropped===!!value.crop} onClick={()=>{const next={...draft};if(figure&&!cropped)delete next.crop;onApply(next);}}>속성 적용</Button>}
    {Object.keys(optional).filter(key=>key in value).map(key=><Button danger key={key} onClick={()=>onUnset(key)}>{fieldNames[key]} 필드 제거</Button>)}
    {figure&&value.crop&&<Button danger onClick={()=>onUnset('crop')}>확대 좌표 필드 제거</Button>}
  </>;
}
