import {getManualClientClip} from './manual-client-clip.mjs';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Icon} from '@lk-design-system/lds-core/components/icon/Icon';
import {EditorButton as Button} from '../ui/EditorButton.jsx';
import {getBlockMenuViewport} from './block-command-catalog.mjs';
import {manualTableTrailingDelta,positionManualTableTrailingControls,canCommitManualTableTrailingPreview,manualTableTrailingPreviewRects,startManualTableTrailingPreview} from './manual-table-trailing-controls.mjs';
import {isManualTableMenuTargetCurrent} from './manual-table-action-menu.mjs';
import './manual-table-trailing-controls.css';

export function ManualTableTrailingPreview({session,position}){
 if(!session||!position)return null;
 const {description,delta,target,rect,unit,clip}=session,word=target.mode==='row'?'행':'열';
 const text=delta===0?'변경 없음':description?.previewText||(description?.enabled?`${word} ${Math.abs(delta)}개 ${delta<0?'삭제':'추가'}`:description?.reason||'현재 사용할 수 없습니다.');
 const regions=delta<0&&session.actualRects?session.actualRects.slice(-Math.abs(delta)):manualTableTrailingPreviewRects(rect,target.mode,delta,{unit,beforeCount:description?.beforeCount});
 return <><div className="manual-table-trailing-preview-regions" aria-hidden="true" style={clip?{position:'fixed',left:clip.left,top:clip.top,width:clip.right-clip.left,height:clip.bottom-clip.top,overflow:'hidden'}:undefined}>{description?.enabled&&regions.map((r,i)=><div key={i} data-removal={delta<0?'true':undefined} style={clip?{...r,position:'absolute',left:r.left-clip.left,top:r.top-clip.top}:r}/>)}</div><div className="manual-table-trailing-preview" role="status" aria-live="polite" data-destructive={description?.removesContent?'true':undefined} style={position}>{text}</div></>;
}

// Overlay chrome: a session pins one table and commits a batch only on release.
export function ManualTableTrailingControls({viewRef,mountRef,mainRef,getGeneration,isEnabled,isMenuEnabled,onCaptureActionTarget,onDescribeTrailingChange,onTrailingChange,onSessionStart,onSessionEnd}){
 const [active,setActive]=useState(null),[preview,setPreview]=useState(null),[notice,setNotice]=useState(''),api=useRef(null),activeRef=useRef(null),session=useRef(null),shown=useRef(null),raf=useRef(null);
 api.current={getGeneration,isEnabled,isMenuEnabled,onCaptureActionTarget,onDescribeTrailingChange,onTrailingChange,onSessionStart,onSessionEnd};activeRef.current=active;
 const editorDom=viewRef.current?.dom,mount=mountRef.current,main=mainRef.current;
 function available(target){try{return target?api.current.isMenuEnabled?.(target)===true:api.current.isEnabled?.()===true;}catch{return false;}}
 function current(s){return isManualTableMenuTargetCurrent(s?.target,{editor:viewRef.current,generation:api.current.getGeneration?.(),enabled:available(s?.target)});}
 function end(reason,committed=false){const s=session.current;if(!s)return;session.current=null;shown.current=null;setPreview(null);setActive(null);try{s.trigger?.releasePointerCapture?.(s.pointerId);}catch{}api.current.onSessionEnd?.({target:s.target,reason,committed,resultRevision:viewRef.current?.state.doc});}
 useLayoutEffect(()=>{
  shown.current=null;if(!preview)return;
  const value=preview;let second;
  const first=window.requestAnimationFrame(()=>{second=window.requestAnimationFrame(()=>{if(session.current===value)shown.current=value.delta;});});
  return()=>{window.cancelAnimationFrame(first);if(second!==undefined)window.cancelAnimationFrame(second);};
 },[preview]);
 useEffect(()=>{
  if(!editorDom||!mount||!main)return;
  let alive=true;
  const measure=frame=>{
   if(!alive||session.current)return;
   const editor=viewRef.current;if(!available()||editor?.dom!==editorDom||!editor.editable||editor.composing||!frame?.isConnected||!mount.contains(frame)){setActive(null);return;}
   const actual=frame.querySelector(':scope > table')||frame.querySelector(':scope > .lds-manual-table-frame > table');
   if(actual?.closest('[data-manual-node="table"]')!==frame||!actual.rows?.length)return;
   const cell=actual.rows[actual.rows.length-1].cells[actual.rows[actual.rows.length-1].cells.length-1];if(!cell?.dataset.manualId)return;
   const vp=getBlockMenuViewport(window),clip=getManualClientClip(main,vp),box=frame.getBoundingClientRect(),rect={left:box.left,right:box.right,top:box.top,bottom:box.bottom};
   // Existing row/column grips have priority; trailing strips use only free chrome space.
   const reserved=[...mount.querySelectorAll('[data-manual-node][data-manual-id]'),...window.document.querySelectorAll('.manual-move-handle,.manual-insert-handle,[data-outline-page-handle],[data-manual-table-resize],[data-table-grip-mode]')].filter(el=>!frame.contains(el)&&!el.contains(frame)&&!el.hidden&&window.getComputedStyle(el).display!=='none'&&window.getComputedStyle(el).visibility!=='hidden'&&window.getComputedStyle(el).opacity!=='0').map(el=>el.getBoundingClientRect());
   const controls=positionManualTableTrailingControls(rect,clip,reserved),lastRow=actual.rows[actual.rows.length-1].getBoundingClientRect(),lastCell=cell.getBoundingClientRect();
   const rowRects=[...actual.rows].map(row=>{const r=row.getBoundingClientRect();return {left:rect.left,top:r.top,width:rect.right-rect.left,height:r.height};}),columnRects=[...actual.rows[0].cells].map(cell=>{const r=cell.getBoundingClientRect();return {left:r.left,top:rect.top,width:r.width,height:rect.bottom-rect.top};});
   const value={editor,revision:editor.state.doc,generation:api.current.getGeneration?.(),tableId:frame.dataset.manualId,cellId:cell.dataset.manualId,rect,controls,clip,rowRects,columnRects,rowUnit:Math.max(24,Math.min(120,lastRow.height)),columnUnit:Math.max(40,Math.min(240,lastCell.width)),frame};
   setActive(value);
  };
  const hover=event=>{
   if(session.current||event.target.closest?.('[data-manual-table-trailing-controls],[data-manual-table-action-menu],[data-manual-table-selection-controls]'))return;
   let frame=event.target.closest?.('[data-manual-node="table"]');
   if(!frame){const value=activeRef.current;if(value&&event.clientX>=value.rect.left-2&&event.clientX<=value.rect.right+16&&event.clientY>=value.rect.top-2&&event.clientY<=value.rect.bottom+16)frame=value.frame;}
   if(!frame){setActive(null);return;}
   if(raf.current!==null)window.cancelAnimationFrame(raf.current);raf.current=window.requestAnimationFrame(()=>{raf.current=null;measure(frame);});
  };
  const focus=event=>hover(event);
  const cancel=()=>{end('geometry');setActive(null);};
  const key=event=>{if(session.current&&event.key==='Escape'){event.preventDefault();event.stopPropagation();end('escape');}};
  window.document.addEventListener('pointermove',hover);mount.addEventListener('focusin',focus);window.document.addEventListener('keydown',key,true);main.addEventListener('scroll',cancel,{passive:true});window.addEventListener('resize',cancel);window.visualViewport?.addEventListener('resize',cancel);window.visualViewport?.addEventListener('scroll',cancel);window.addEventListener('blur',cancel);
  return()=>{alive=false;if(raf.current!==null)window.cancelAnimationFrame(raf.current);end('unmount');window.document.removeEventListener('pointermove',hover);mount.removeEventListener('focusin',focus);window.document.removeEventListener('keydown',key,true);main.removeEventListener('scroll',cancel);window.removeEventListener('resize',cancel);window.visualViewport?.removeEventListener('resize',cancel);window.visualViewport?.removeEventListener('scroll',cancel);window.removeEventListener('blur',cancel);};
 },[editorDom,mount,main,viewRef]);
 useEffect(()=>{if(session.current&&!current(session.current))end('stale');else if(active&&!session.current&&!isManualTableMenuTargetCurrent(active,{editor:viewRef.current,generation:api.current.getGeneration?.(),enabled:available()}))setActive(null);});
 function capture(value,mode,trigger){
  if(!value||!isManualTableMenuTargetCurrent(value,{editor:viewRef.current,generation:api.current.getGeneration?.(),enabled:available()}))return null;
  let pin;try{pin=api.current.onCaptureActionTarget?.({...value,mode});}catch{return null;}if(!pin)return null;
  return {target:{...pin,editor:value.editor,revision:value.revision,generation:value.generation},rect:value.rect,clip:value.clip,actualRects:mode==='row'?value.rowRects:value.columnRects,unit:mode==='row'?value.rowUnit:value.columnUnit,delta:1,trigger};
 }
 function describe(s,delta){let description;try{description=api.current.onDescribeTrailingChange?.(s.target,delta);}catch{description={enabled:false,reason:'표를 확인할 수 없습니다.'};}return {...s,delta,description:description||{enabled:false,reason:'현재 사용할 수 없습니다.'}};}
 function rejectStart(s){setNotice(s?.description?.reason||'현재 표를 변경할 수 없습니다.');end('unavailable');}
 function begin(event,value,mode){
  if(session.current||event.button!==0)return;event.preventDefault();event.stopPropagation();setNotice('');
  let s=capture(value,mode,event.currentTarget);if(!s)return;
  s={...s,pointerId:event.pointerId,start:mode==='row'?event.clientY:event.clientX};session.current=s;s=startManualTableTrailingPreview(s,{onStart:api.current.onSessionStart,describe,onReject:rejectStart});if(!s)return;session.current=s;
  try{event.currentTarget.setPointerCapture(event.pointerId);}catch{end('capture');return;}setPreview(s);
 }
 function move(event){
  const s=session.current;if(!s||event.pointerId!==s.pointerId)return;event.preventDefault();event.stopPropagation();if(!current(s)){end('stale');return;}
  const distance=(s.target.mode==='row'?event.clientY:event.clientX)-s.start,dragged=s.dragged||Math.abs(distance)>=5,delta=manualTableTrailingDelta(distance,s.unit,{dragged});if(delta===null||delta===s.delta&&dragged===s.dragged)return;
  const next=describe({...s,dragged},delta);session.current=next;shown.current=null;setPreview(next);
 }
 function commit(s){
  if(!canCommitManualTableTrailingPreview(s,{editor:viewRef.current,generation:api.current.getGeneration?.(),enabled:available(s.target),previewShown:shown.current===s.delta})){if(s.description?.needsConfirmation)setNotice('삭제 범위가 표시된 뒤 손잡이를 놓으세요.');end('unavailable');return;}
  let committed=false;try{committed=api.current.onTrailingChange?.(s.target,s.delta,{confirmedDeletion:s.description.needsConfirmation===true&&shown.current===s.delta})===true;}finally{end(committed?'action':'unavailable',committed);}
  if(committed){const editor=viewRef.current,result=editor?.state.doc;window.requestAnimationFrame(()=>{if(isManualTableMenuTargetCurrent({...s.target,revision:result},{editor:viewRef.current,generation:api.current.getGeneration?.(),enabled:available()}))editor.focus();});}
 }
 function release(event){let s=session.current;if(!s||s.pointerId!==event.pointerId)return;event.preventDefault();event.stopPropagation();const distance=(s.target.mode==='row'?event.clientY:event.clientX)-s.start,delta=manualTableTrailingDelta(distance,s.unit,{dragged:s.dragged||Math.abs(distance)>=5});if(delta!==s.delta){s=describe(s,delta);session.current=s;shown.current=null;}if(delta===0){end('no-change');return;}commit(s);}
 function keyboardAdd(event,value,mode){if(event.detail!==0||session.current)return;let s=capture(value,mode,event.currentTarget);if(!s)return;session.current=s;s=startManualTableTrailingPreview(s,{onStart:api.current.onSessionStart,describe,onReject:rejectStart});if(!s)return;session.current=s;commit(s);}
 if(!active&&!preview&&!notice)return null;
 const value=preview||active,vp=getBlockMenuViewport(window),width=Math.max(0,Math.min(280,vp.width-16));
 const position=value?{left:Math.max(vp.left+8,Math.min(value.rect.left,vp.left+vp.width-width-8)),top:Math.max(vp.top+8,Math.min(value.rect.bottom+18,vp.top+vp.height-64)),width,maxHeight:Math.max(42,Math.min(100,vp.height-16))}:null;
 const bars=(active?.controls||[]).map(control=>{const s=capture(active,control.mode,null);return {control,availability:s?describe(s,1):null};});
 const unsupported=bars.find(item=>item.availability?.description.enabled===false)?.availability;
 return createPortal(<div data-manual-table-trailing-controls="" className="manual-table-trailing-controls" contentEditable={false}>
  {bars.map(({control,availability})=><Button key={control.mode} iconOnly disabled={!preview&&availability?.description.enabled!==true} data-trailing-mode={control.mode} aria-label={control.mode==='row'?'마지막 행 추가, 드래그하여 행 수 조절':'마지막 열 추가, 드래그하여 열 수 조절'} title={availability?.description.reason||(control.mode==='row'?'행 추가 · 드래그하여 행 수 조절':'열 추가 · 드래그하여 열 수 조절')} styles={{root:{position:'fixed',left:control.left,top:control.top,width:control.width,minWidth:control.width,height:control.height,minHeight:control.height,padding:0,border:0,borderRadius:3,touchAction:'none',background:'var(--color-semantic-fill-alternative)',pointerEvents:'auto'}}} onMouseDown={event=>event.preventDefault()} onPointerDown={event=>begin(event,active,control.mode)} onPointerMove={move} onPointerUp={release} onPointerCancel={()=>end('cancel')} onLostPointerCapture={()=>{if(session.current)end('capture-lost');}} onClick={event=>keyboardAdd(event,active,control.mode)}><Icon name="plus" size={12} aria-hidden="true"/></Button>)}
  <ManualTableTrailingPreview session={preview||unsupported} position={position}/>
  {notice&&<div className="manual-table-trailing-notice" role="status" onPointerDown={()=>setNotice('')} style={{left:vp.left+8,bottom:8,maxWidth:width}}>{notice}</div>}
 </div>,window.document.body);
}
