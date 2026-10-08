import {getManualClientClip} from './manual-client-clip.mjs';
import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {installManualTableResize} from './manual-table-resize.mjs';
import {getManualTableLayout} from './manual-table-layout.mjs';
import {getBlockMenuViewport} from './block-command-catalog.mjs';

export function manualTableResizeTargets(table,clip){
 const rows=[...table.rows],first=rows[0];if(!first)return [];
 const frame=table.getBoundingClientRect(),targets=[];
 const cells=[...first.cells];
 cells.slice(0,-1).forEach((cell,index)=>{const x=cell.getBoundingClientRect().right;if(x-3>=clip.left&&x+3<=clip.right&&frame.bottom>clip.top&&frame.top<clip.bottom)targets.push({kind:'column',index,left:x-3,top:Math.max(frame.top,clip.top),width:6,height:Math.min(frame.bottom,clip.bottom)-Math.max(frame.top,clip.top)});});
 rows.forEach((row,index)=>{const y=row.getBoundingClientRect().bottom;if(y-3>=clip.top&&y+3<=clip.bottom&&frame.right>clip.left&&frame.left<clip.right)targets.push({kind:'row',index,left:Math.max(frame.left,clip.left),top:y-3,width:Math.min(frame.right,clip.right)-Math.max(frame.left,clip.left),height:6});});
 return targets;
}

// View-only boundary hit areas and guide; persisted layout is committed by the parent.
// isEnabled must stay true for this controller's own session; onSessionStart is a flow pause, not a disable flag.
export function ManualTableResizeControls({viewRef,mountRef,mainRef,getGeneration,isEnabled,onCommitResize,onSessionStart,onSessionEnd}){
 const [active,setActive]=useState(null),[guide,setGuide]=useState(null),layer=useRef(null),api=useRef(null),current=useRef(null),controller=useRef(null),session=useRef(null),refreshRef=useRef(null);
 api.current={getGeneration,isEnabled,onCommitResize,onSessionStart,onSessionEnd};
 const editorDom=viewRef.current?.dom,mount=mountRef.current,main=mainRef.current;
 function enabled(){const editor=viewRef.current;try{return !!editor&&editor.editable&&!editor.composing&&api.current.isEnabled?.()===true;}catch{return false;}}
 function valid(value){return !!value&&enabled()&&viewRef.current===value.editor&&value.editor.state.doc===value.revision&&api.current.getGeneration?.()===value.generation&&value.table.isConnected&&mountRef.current?.contains(value.table);}
 function end(){if(session.current){session.current=null;api.current.onSessionEnd?.();}}
 useEffect(()=>{
  if(!editorDom||!mount||!main)return;
  let alive=true,frame=null,table=null;
  const clear=()=>{if(controller.current?.isResizing())return;if(table)observer?.unobserve(table);table=null;current.current=null;setActive(null);};
  function measure(){
   if(!alive||!table)return;
   if(!enabled()||!table.isConnected||!mount.contains(table)){controller.current?.cancel();clear();return;}
   const editor=viewRef.current,tableId=table.closest('[data-manual-node="table"]')?.dataset.manualId;if(!tableId){clear();return;}
   const viewport=getBlockMenuViewport(window),clip=getManualClientClip(main,viewport);
   if(!clip){controller.current?.cancel();clear();return;}
   const value={editor,revision:editor.state.doc,generation:api.current.getGeneration?.(),tableId,table,targets:manualTableResizeTargets(table,clip)};current.current=value;
   setActive(previous=>previous&&previous.editor===value.editor&&previous.revision===value.revision&&previous.generation===value.generation&&previous.table===table&&JSON.stringify(previous.targets)===JSON.stringify(value.targets)?previous:value);
  }
  const refresh=()=>{if(!alive||frame!==null)return;frame=window.requestAnimationFrame(()=>{frame=null;measure();});};refreshRef.current=refresh;
  const hover=event=>{
   if(controller.current?.isResizing())return;
   if(event.target.closest?.('[data-manual-table-resize-controls]'))return;
   if(event.pointerType==='touch'||!enabled()){clear();return;}
   const wrapper=event.target.closest?.('[data-manual-node="table"]'),next=wrapper?.querySelector(':scope > table');
   if(!next||!mount.contains(next)){clear();return;}if(table!==next){if(table)observer?.unobserve(table);observer?.observe(next);}table=next;refresh();
  };
  const geometry=()=>{controller.current?.cancel();clear();};
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>{if(controller.current?.isResizing())geometry();else refresh();}):null;observer?.observe(main);observer?.observe(editorDom);
  window.document.addEventListener('pointermove',hover);main.addEventListener('scroll',geometry,{passive:true});window.addEventListener('resize',geometry);window.visualViewport?.addEventListener('resize',geometry);window.visualViewport?.addEventListener('scroll',geometry);
  return()=>{alive=false;if(frame!==null)window.cancelAnimationFrame(frame);observer?.disconnect();controller.current?.cancel();current.current=null;refreshRef.current=null;window.document.removeEventListener('pointermove',hover);main.removeEventListener('scroll',geometry);window.removeEventListener('resize',geometry);window.visualViewport?.removeEventListener('resize',geometry);window.visualViewport?.removeEventListener('scroll',geometry);end();};
 },[editorDom,mount,main]);
 useEffect(()=>{
  const element=layer.current;if(!element)return;
  const resize=installManualTableResize({element,minColumnPx:24,getRevision:()=>viewRef.current?.state.doc,getGeneration:()=>api.current.getGeneration?.(),isEnabled:()=>enabled(),
   getTarget:(_event,handle)=>{
    const value=current.current;if(!valid(value))return null;
    const kind=handle.dataset.manualTableResize,index=Number(handle.dataset.manualTableResizeIndex),table=value.table,rect=table.getBoundingClientRect(),scale=rect.width/table.offsetWidth;
    if(!Number.isFinite(scale)||scale<=0)return null;
    let node=null;value.revision.descendants(item=>{if(item.attrs.id===value.tableId&&item.type.name==='table')node=item;});if(!node)return null;
    const rows=[...table.rows],first=rows[0],layout=getManualTableLayout(node);
    if(!first||rows.some(row=>[...row.cells].some(cell=>!cell.dataset.manualId)))return null;
    if(kind==='column')return {kind,tableId:value.tableId,scale,columnIndex:index,frameWidth:rect.width/scale,columnWeights:layout.hasColumnWeights?layout.columnWeights:[...first.cells].map(cell=>cell.getBoundingClientRect().width/scale)};
    const row=rows[index];return row?{kind,tableId:value.tableId,scale,rowIndex:index,rowHeightPx:row.getBoundingClientRect().height/scale}:null;
   },onPreview:payload=>{
    if(!payload){setGuide(null);return;}
    const value=session.current||current.current;if(!valid(value))return;
    const rect=value.table.getBoundingClientRect(),scale=rect.width/value.table.offsetWidth,handle=session.current?.handle;
    const clip=getManualClientClip(mainRef.current,getBlockMenuViewport(window));
    const showGuide=guide=>{if(!clip){setGuide(null);return;}const left=Math.max(guide.left,clip.left),top=Math.max(guide.top,clip.top),right=Math.min(guide.left+guide.width,clip.right),bottom=Math.min(guide.top+guide.height,clip.bottom);setGuide(right>left&&bottom>top?{left,top,width:right-left,height:bottom-top}:null);};
    if(payload.columnWeights){const index=Number(handle?.dataset.manualTableResizeIndex),total=payload.columnWeights.reduce((sum,n)=>sum+n,0),x=rect.left+rect.width*payload.columnWeights.slice(0,index+1).reduce((sum,n)=>sum+n,0)/total;showGuide({left:x,top:rect.top,width:1,height:rect.height});}
    else{const row=value.table.rows[payload.rowIndex];if(row)showGuide({left:rect.left,top:row.getBoundingClientRect().top+payload.rowMinHeightPx*scale,width:rect.width,height:1});}
   },onCommit:payload=>{const value=session.current;try{if(valid(value))api.current.onCommitResize?.(payload,{editor:value.editor,revision:value.revision,generation:value.generation});}finally{end();}},onCancel:()=>end()});
  controller.current=resize;
  const started=event=>{if(resize.isResizing()&&!session.current){session.current={...current.current,handle:event.target.closest('[data-manual-table-resize]')};api.current.onSessionStart?.();}};
  element.addEventListener('pointerdown',started,true);
  return()=>{resize.dispose();element.removeEventListener('pointerdown',started,true);if(controller.current===resize)controller.current=null;end();};
 },[editorDom,mount,main]);
 useEffect(()=>{controller.current?.refresh();if(!enabled()){controller.current?.cancel();current.current=null;setActive(null);}else refreshRef.current?.();});
 return createPortal(<div ref={layer} className="manual-v2-table-resize-controls" data-manual-table-resize-controls="" contentEditable={false} style={{position:'fixed',inset:0,pointerEvents:'none'}}>
  {active?.targets.map(target=><div key={`${target.kind}-${target.index}`} data-manual-table-resize={target.kind} data-manual-table-resize-index={target.index} aria-hidden="true" style={{position:'absolute',left:target.left,top:target.top,width:target.width,height:target.height,pointerEvents:'auto',cursor:target.kind==='column'?'col-resize':'row-resize'}}/>)}
  {guide&&<div aria-hidden="true" style={{position:'absolute',...guide,pointerEvents:'none',background:'var(--color-semantic-primary-normal)'}}/>}
 </div>,window.document.body);
}
