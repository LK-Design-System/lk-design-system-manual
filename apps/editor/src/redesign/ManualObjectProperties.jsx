import React,{useEffect,useRef,useState} from 'react';
import {Button,Icon,Input,Select} from '@lk-design-system/lds-core';
import {readManualFigureLayout} from './manual-figure-layout.mjs';
import {getManualCoverProjection} from './manual-cover-legacy-projection.mjs';
import {resolveManualDividerStyle} from './manual-divider-style.mjs';
import {hasVisibleManualCalloutTitle,MANUAL_CALLOUT_TONE_OPTIONS} from '../../../../src/manual-callout-content.mjs';

const titles={figure:'이미지',callout:'콜아웃',codeBlock:'코드 블록',procedure:'절차',table:'표',divider:'구분선'};
const dividerStyles=[{value:'default',label:'기본'},{value:'emphasis',label:'강조'}];
const widths=[{value:'full',label:'본문 전체 폭'},{value:'reading',label:'읽기 좋은 폭'},{value:'compact',label:'작게'}];
const alignments=[{value:'left',label:'왼쪽'},{value:'center',label:'가운데'},{value:'right',label:'오른쪽'}];
const actionRows=[
 [{id:'selectRow',label:'행 전체 선택'},{id:'selectColumn',label:'열 전체 선택'}],
 [{id:'addRow',label:'행 추가'},{id:'deleteLastRow',label:'마지막 행 삭제',danger:true}],
 [{id:'addColumn',label:'열 추가'},{id:'deleteLastColumn',label:'마지막 열 삭제',danger:true}],
];
const positive=value=>Number.isFinite(value)&&value>0;
const millimetres=widthPx=>positive(widthPx)?(widthPx*25.4/96).toFixed(1):'';
const contextKeys=['editor','revision','generation','assets','asset'];
const snapshotContext=token=>token&&typeof token==='object'?Object.fromEntries(contextKeys.map(key=>[key,token[key]])):token;
const sameContext=(left,right)=>Object.is(left,right)||!!left&&!!right&&typeof left==='object'&&typeof right==='object'&&contextKeys.every(key=>Object.is(left[key],right[key]));

// Only the input draft is local. The parent pins the figure and owns its command.
function FigureWidthField({targetId,customWidthPx,descriptor,disabled,readOnly}){
 const widthPx=[customWidthPx,descriptor.widthPx,descriptor.measuredWidthPx].find(positive);
 const unavailable=disabled||descriptor.disabled||typeof descriptor.onCommit!=='function'||!positive(widthPx)
  ||descriptor.minWidthPx!==undefined&&!positive(descriptor.minWidthPx)||descriptor.maxWidthPx!==undefined&&!positive(descriptor.maxWidthPx)
  ||descriptor.minWidthPx!==undefined&&descriptor.maxWidthPx!==undefined&&descriptor.minWidthPx>descriptor.maxWidthPx;
 const contextToken=descriptor.contextToken;
 const latest=useRef(null),alive=useRef(true),pending=useRef({targetId,widthPx,contextToken:snapshotContext(contextToken),value:millimetres(widthPx),dirty:false});
 const [draft,setDraft]=useState(()=>millimetres(widthPx));
 latest.current={targetId,widthPx,descriptor,unavailable,readOnly};
 if(pending.current.targetId!==targetId||pending.current.widthPx!==widthPx||!sameContext(pending.current.contextToken,contextToken))pending.current={targetId,widthPx,contextToken:snapshotContext(contextToken),value:millimetres(widthPx),dirty:false};
 useEffect(()=>{setDraft(millimetres(widthPx));},[targetId,widthPx,typeof contextToken==='object'?contextToken!==null:contextToken,contextToken?.editor,contextToken?.revision,contextToken?.generation,contextToken?.assets,contextToken?.asset]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 function reset(){const current=latest.current;pending.current={targetId:current.targetId,widthPx:current.widthPx,contextToken:snapshotContext(current.descriptor.contextToken),value:millimetres(current.widthPx),dirty:false};setDraft(pending.current.value);}
 function commit(){
  const current=latest.current,edit=pending.current;
  if(!alive.current||!edit.dirty)return;
  if(edit.targetId!==current.targetId||edit.widthPx!==current.widthPx||!sameContext(edit.contextToken,current.descriptor.contextToken)){reset();return;}
  edit.dirty=false;
  const mm=Number(edit.value),raw=mm*96/25.4;
  if(current.unavailable||current.readOnly||!edit.value.trim()||!positive(mm)||!positive(raw)
   ||current.descriptor.minWidthPx!==undefined&&raw<current.descriptor.minWidthPx||current.descriptor.maxWidthPx!==undefined&&raw>current.descriptor.maxWidthPx
   ||mm===Number(millimetres(current.widthPx))){reset();return;}
  let next=Math.round(raw*100)/100;
  if(current.descriptor.minWidthPx!==undefined)next=Math.max(next,current.descriptor.minWidthPx);
  if(current.descriptor.maxWidthPx!==undefined)next=Math.min(next,current.descriptor.maxWidthPx);
  if(!positive(next)||Math.abs(next-current.widthPx)<.005){reset();return;}
  // Clear dirty before a command can focus the paper and synchronously blur us.
  if(edit.onCommit(next)===false){reset();return;}
  setDraft(millimetres(next));
 }
 return <Input size="sm" className="manual-object-properties-field" label="가로폭 (mm)" type="number" inputMode="decimal" step="any" min={positive(descriptor.minWidthPx)?descriptor.minWidthPx*25.4/96:undefined} max={positive(descriptor.maxWidthPx)?descriptor.maxWidthPx*25.4/96:undefined} value={draft} disabled={!!unavailable} readOnly={readOnly}
  onChange={event=>{if(!alive.current||latest.current.unavailable||latest.current.readOnly)return;if(!pending.current.dirty)pending.current.onCommit=latest.current.descriptor.onCommit;pending.current.value=event.target.value;pending.current.dirty=true;setDraft(event.target.value);}}
  onBlur={commit} onKeyDown={event=>{if(event.key!=='Enter'||event.isComposing||event.keyCode===229||event.ctrlKey||event.metaKey||event.altKey)return;event.preventDefault();if(!event.repeat)commit();}}/>;
}

// The parent owns the pinned target, edit guards and all model commands.
// This form never derives a target from the current caret or stores document state.
export function ManualObjectProperties({inspected,inspectedId=inspected?.value?.id,disabled=false,readOnly=false,update,pickImage,onClose,onEditTitle,titleActions,tableActions=[],figureWidth,figureAlignment,dividerStyle,semanticName}){
 const targetId=inspected?.value?.id;
 if(!titles[inspected?.type]||!targetId||inspectedId!==targetId)return null;
 const value=inspected.value,locked=disabled||readOnly;
 const figureLayout=inspected.type==='figure'?readManualFigureLayout(value.extensions):null;
 const figureRole=inspected.type==='figure'?getManualCoverProjection(value.extensions):null;
 const boundLogo=figureRole?.role==='logo'&&figureRole.blockId===targetId;
 const figureWidths=boundLogo?[{value:'compact',label:'기본 크기'}]:widths;
 const alignmentUnavailable=locked||figureAlignment?.disabled||typeof figureAlignment?.onCommit!=='function'||!alignments.some(option=>option.value===figureAlignment?.value);
 const dividerRole=inspected.type==='divider'?getManualCoverProjection(value.extensions):null;
 const dividerVariant=inspected.type==='divider'?resolveManualDividerStyle(value.extensions,{cover:dividerRole?.role==='divider'&&dividerRole.blockId===targetId}):null;
 const dividerUnavailable=locked||dividerStyle?.disabled||typeof dividerStyle?.onCommit!=='function';
 const titleUnavailable=locked||typeof onEditTitle!=='function';
 const moveTitleUnavailable=locked||titleActions?.disabled||typeof titleActions?.onMoveToBody!=='function';
 const change=patch=>{if(!locked)update(targetId,patch);};
 const field={size:'sm',disabled,readOnly,className:'manual-object-properties-field'};
 return <div className="manual-object-properties" data-property-target={targetId}>
  <header className="manual-object-properties-header">
   <h2 className="manual-object-properties-title">{semanticName||titles[inspected.type]} 속성</h2>
   <Button className="manual-object-properties-close" variant="flat" color="assistive" size="sm" iconOnly aria-label="속성 닫기" title="속성 닫기" onClick={onClose}><Icon name="close" size={18} aria-hidden="true"/></Button>
  </header>
  <fieldset className="manual-v2-inspector-fields manual-object-properties-body" disabled={disabled}>
   {inspected.type==='divider'&&<Select {...field} label="구분선 스타일" value={dividerVariant} options={dividerStyles} disabled={!!dividerUnavailable} onChange={variant=>{if(!dividerUnavailable)dividerStyle.onCommit(variant);}}/>}
   {inspected.type==='figure'&&<>
    <Input {...field} label="대체 설명" helper="이미지를 볼 수 없을 때 읽는 설명입니다." value={value.alt} onChange={event=>change({alt:event.target.value})}/>
    <Select {...field} label="이미지 폭" value={figureLayout?.widthPx?'custom':value.widthPreset} options={figureLayout?.widthPx?[...figureWidths,{value:'custom',label:'사용자 지정',disabled:true}]:figureWidths} onChange={widthPreset=>change({widthPreset})}/>
    <Select {...field} label="이미지 정렬" value={figureAlignment?.value} options={alignments} disabled={!!alignmentUnavailable} onChange={alignment=>{if(!alignmentUnavailable&&alignments.some(option=>option.value===alignment))figureAlignment.onCommit(alignment);}}/>
    {figureWidth&&<FigureWidthField key={targetId} targetId={targetId} customWidthPx={figureLayout?.widthPx} descriptor={figureWidth} disabled={disabled} readOnly={readOnly}/>}
    <Button className="manual-object-properties-image-action" variant="outlined" color="assistive" size="sm" disabled={locked} onClick={()=>{if(!locked)pickImage(targetId);}}>이미지 바꾸기</Button>
   </>}
   {inspected.type==='callout'&&<>
    <Select {...field} label="콜아웃 종류" value={value.tone} options={MANUAL_CALLOUT_TONE_OPTIONS} onChange={tone=>change({tone})}/>
    <Button variant="outlined" color="assistive" size="sm" disabled={titleUnavailable} data-property-action="editTitle" onClick={()=>{if(!titleUnavailable)onEditTitle(targetId);}}>{hasVisibleManualCalloutTitle(value.title)?'제목 편집':'제목 추가'}</Button>
    {hasVisibleManualCalloutTitle(value.title)&&<Button variant="outlined" color="assistive" size="sm" disabled={!!moveTitleUnavailable} data-property-action="moveTitleToBody" onClick={()=>{if(!moveTitleUnavailable)titleActions.onMoveToBody(targetId);}}>제목을 본문으로</Button>}
   </>}
   {inspected.type==='codeBlock'&&<Input {...field} label="언어" value={value.language} placeholder="예: javascript" onChange={event=>change({language:event.target.value})}/>}
   {inspected.type==='procedure'&&<Input {...field} label="시작 번호" type="number" min={1} step={1} value={value.start} onChange={event=>{const start=Number(event.target.value);if(Number.isInteger(start)&&start>0)change({start});}}/>}
   {inspected.type==='table'&&<>
    <Input {...field} label="표 설명" value={value.label} onChange={event=>change({label:event.target.value})}/>
    <section className="manual-object-properties-table-actions" aria-label="표 구조">
     <h3>표 구조</h3>
     {actionRows.map(row=><div className="manual-object-properties-action-row" key={row[0].id}>
      {row.map(spec=>{
       const action=tableActions.find(item=>item.id===spec.id),unavailable=locked||!action||action.disabled||typeof action.onClick!=='function';
       return <Button key={spec.id} variant={spec.danger?'flat':'outlined'} color="assistive" size="sm" disabled={unavailable} data-property-action={spec.id} styles={spec.danger&&!unavailable?{root:{color:'var(--color-semantic-status-negative-text)'}}:undefined} onClick={()=>{if(!unavailable)action.onClick();}}>{spec.label}</Button>;
      })}
     </div>)}
    </section>
   </>}
  </fieldset>
 </div>;
}
