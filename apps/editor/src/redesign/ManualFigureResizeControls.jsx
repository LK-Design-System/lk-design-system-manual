import {getManualClientClip} from './manual-client-clip.mjs';
import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {NodeSelection} from '@tiptap/pm/state';
import {getBlockMenuViewport} from './block-command-catalog.mjs';
import {installManualFigureResize,clampManualFigureResize,getManualFigureResizeBounds,getManualFigureResizeScale} from './manual-figure-resize.mjs';

// getAssets supplies the parent's live assets object for identity fencing.
// isEnabled must not disable this controller when onSessionStart pauses pagination.
export function ManualFigureResizeControls({viewRef,mountRef,mainRef,getGeneration,getAssets,isEnabled,onResizeCommit,onSessionStart,onSessionEnd}){
 const [active,setActive]=useState(null),layer=useRef(null),api=useRef(null),current=useRef(null),controller=useRef(null),refreshRef=useRef(null),marked=useRef(null);
 api.current={getGeneration,getAssets,isEnabled,onResizeCommit,onSessionStart,onSessionEnd};
 const editorDom=viewRef.current?.dom,mount=mountRef.current,main=mainRef.current;
 function enabled(){const editor=viewRef.current;try{return !!editor&&editor.editable&&!editor.composing&&api.current.isEnabled?.()===true;}catch{return false;}}
 function selected(){const editor=viewRef.current,selection=editor?.state.selection,node=selection?.node;if(!(selection instanceof NodeSelection)||node?.type.name!=='figure')return null;return {editor,node,pos:editor.state.selection.from};}
 function isCurrent(target){if(!target)return false;const pick=selected();return enabled()&&pick?.editor===target.context.editor&&pick.editor.state.doc===target.context.revision&&api.current.getGeneration?.()===target.context.generation&&api.current.getAssets?.()===target.context.assets&&pick.node.attrs.id===target.figureId&&pick.node.attrs.meta.asset===target.context.asset&&target.element.isConnected&&target.media.isConnected&&mountRef.current?.contains(target.element);}
 function markElement(element){
  if(marked.current?.element===element)return;
  const previous=marked.current,name='data-manual-figure-resize-active';
  if(previous?.element.getAttribute(name)==='true'){if(previous.value===null)previous.element.removeAttribute(name);else previous.element.setAttribute(name,previous.value);}
  marked.current=element?{element,value:element.getAttribute(name)}:null;if(element)element.setAttribute(name,'true');
 }
 function measure(){
  if(!enabled()){controller.current?.cancel();current.current=null;markElement(null);setActive(null);return;}
  const pick=selected();if(!pick){controller.current?.cancel();current.current=null;markElement(null);setActive(null);return;}
  const element=pick.editor.nodeDOM(pick.pos),media=element?.firstElementChild?.querySelector('img,svg'),page=element?.closest('[data-manual-node="page"],[data-manual-node="cover"]');
  if(!element||!media||element.dataset.manualId!==pick.node.attrs.id||!page||!mountRef.current?.contains(element)){controller.current?.cancel();current.current=null;markElement(null);setActive(null);return;}
  const content=page.querySelector(':scope > .lds-manual-content')||page.querySelector(':scope > .manual-v2-cover-content'),parent=element.parentElement;
  const rect=media.getBoundingClientRect(),scale=getManualFigureResizeScale(element);
  if(!content||!parent||!Number.isFinite(scale)||scale<=0||rect.width<=0||rect.height<=0){markElement(null);setActive(null);return;}
  const bounds=()=>getManualFigureResizeBounds({element,media,content,page,scale,alignment:element.dataset.manualFigureAlignment});
  const context={editor:pick.editor,revision:pick.editor.state.doc,generation:api.current.getGeneration?.(),asset:pick.node.attrs.meta.asset,assets:api.current.getAssets?.()};
  const target={figureId:pick.node.attrs.id,element,media,widthPx:rect.width/scale,heightPx:rect.height/scale,scale,context,...bounds(),getBounds:bounds,canRestore:()=>element.isConnected&&media.isConnected&&element.contains(media)};
  if(!clampManualFigureResize(target)){markElement(null);setActive(null);return;}
  const viewport=getBlockMenuViewport(window),clip=getManualClientClip(mainRef.current,viewport);
  if(!clip){markElement(null);setActive(null);return;}
  const corner={left:rect.right-24,top:rect.bottom-24};if(corner.left<clip.left||corner.top<clip.top||rect.right>clip.right||rect.bottom>clip.bottom){markElement(null);setActive(null);return;}
  current.current=target;markElement(element);const value={figureId:target.figureId,rect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},clip,corner};setActive(previous=>JSON.stringify(previous)===JSON.stringify(value)?previous:value);
 }
 useEffect(()=>{
  if(!editorDom||!mount||!main)return;let alive=true,frame=null;
  const refresh=()=>{if(!alive||frame!==null)return;frame=window.requestAnimationFrame(()=>{frame=null;measure();});};refreshRef.current=refresh;refresh();
  const geometry=()=>{controller.current?.cancel();refresh();};main.addEventListener('scroll',geometry,{passive:true});window.addEventListener('resize',geometry);window.visualViewport?.addEventListener('resize',geometry);window.visualViewport?.addEventListener('scroll',geometry);
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>{if(!controller.current?.isResizing())refresh();}):null;observer?.observe(main);observer?.observe(editorDom);
  return()=>{alive=false;if(frame!==null)window.cancelAnimationFrame(frame);controller.current?.cancel();refreshRef.current=null;observer?.disconnect();main.removeEventListener('scroll',geometry);window.removeEventListener('resize',geometry);window.visualViewport?.removeEventListener('resize',geometry);window.visualViewport?.removeEventListener('scroll',geometry);current.current=null;markElement(null);};
 },[editorDom,mount,main]);
 useEffect(()=>{
  const element=layer.current;if(!element)return;
  const resize=installManualFigureResize({element,isEnabled:enabled,isCurrent,getTarget:()=>current.current,onStart:()=>api.current.onSessionStart?.(),onPreview:()=>refreshRef.current?.(),onCommit:payload=>{if(isCurrent(current.current))api.current.onResizeCommit?.(payload);},onEnd:()=>{api.current.onSessionEnd?.();refreshRef.current?.();}});controller.current=resize;
  return()=>{resize.dispose();if(controller.current===resize)controller.current=null;};
 },[editorDom,mount,main]);
 useEffect(()=>{controller.current?.refresh();refreshRef.current?.();});
 const clip=active?.clip;
 return createPortal(<div ref={layer} className="manual-v2-figure-resize-controls" contentEditable={false} style={{position:'fixed',inset:0,pointerEvents:'none'}}>
  {active&&<div style={{position:'absolute',left:clip.left,top:clip.top,width:clip.right-clip.left,height:clip.bottom-clip.top,overflow:'hidden',pointerEvents:'none'}}>
   <div aria-hidden="true" style={{position:'absolute',left:active.rect.left-clip.left,top:active.rect.top-clip.top,width:active.rect.right-active.rect.left,height:active.rect.bottom-active.rect.top,border:'1px solid var(--color-semantic-primary-normal)',boxSizing:'border-box',pointerEvents:'none'}}/>
   <div data-manual-figure-resize="" aria-hidden="true" style={{position:'absolute',left:active.corner.left-clip.left,top:active.corner.top-clip.top,width:24,height:24,cursor:'nwse-resize',pointerEvents:'auto',display:'flex',alignItems:'flex-end',justifyContent:'flex-end'}}><span style={{width:10,height:10,border:'1px solid var(--color-semantic-primary-normal)',background:'var(--color-semantic-background-normal-normal)',boxSizing:'border-box',pointerEvents:'none'}}/></div>
  </div>}
 </div>,window.document.body);
}
