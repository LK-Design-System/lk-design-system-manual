import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {DropdownMenu} from '@lk-design-system/lds-core/components/overlay/DropdownMenu';
import {Icon} from '@lk-design-system/lds-core/components/icon/Icon';
import {EditorButton as Button} from '../ui/EditorButton.jsx';
import {getBlockMenuViewport} from './block-command-catalog.mjs';

// View coordinates only. The control occupies the measured paper gap, never A4 content.
export function positionManualPageAddControl(page,main,viewport,gap,size=28){
 const values=[page.left,page.right,page.bottom,main.left,main.right,main.top,main.bottom,viewport.left,viewport.top,viewport.width,viewport.height,gap,size];
 if(!values.every(Number.isFinite)||gap<size||size<=0)return null;
 const left=Math.max(main.left,viewport.left,page.left),right=Math.min(main.right,viewport.left+viewport.width,page.right);
 const top=Math.max(main.top,viewport.top),bottom=Math.min(main.bottom,viewport.top+viewport.height);
 const y=page.bottom+gap/2-size/2;
 if(right-left<size||y<top||y+size>bottom)return null;
 const x=Math.max(left,Math.min((page.left+page.right-size)/2,right-size));
 return {left:x,top:y};
}
const sameControls=(a,b)=>a.length===b.length&&a.every((item,index)=>['id','number','left','top'].every(key=>item[key]===b[index][key]));

// Outside the editor DOM: not editable, serialized, saved, or included in print output.
export function ManualPageAddControls({viewRef,mainRef,disabled=false,revision,layoutKey,canAdd=()=>true,onAdd,templates=[],onMenuOpen}){
 const [controls,setControls]=useState([]),updates=useRef(null),callbacks=useRef(null);
 callbacks.current={disabled,canAdd,onAdd,onMenuOpen};
 const editorDom=viewRef.current?.dom,mainNode=mainRef.current;
 useLayoutEffect(()=>{
  const editor=viewRef.current?.dom,main=mainRef.current;
  if(!editor||!main){setControls([]);return;}
  let alive=true,frame=null;
  const measure=()=>{
   if(!alive||viewRef.current?.dom!==editor||mainRef.current!==main)return;
   const clip=main.getBoundingClientRect(),viewport=getBlockMenuViewport(window),next=[];
   const pages=[...editor.querySelectorAll('[data-manual-node="page"],[data-manual-node="cover"]')];
   pages.forEach((page,index)=>{
    const id=page.dataset.manualId;if(!id)return;
    const gap=parseFloat(window.getComputedStyle(page).marginBottom);
    const position=positionManualPageAddControl(page.getBoundingClientRect(),clip,viewport,gap);
    if(position)next.push({id,number:index+1,...position});
   });
   setControls(previous=>sameControls(previous,next)?previous:next);
  };
  const refresh=()=>{if(!alive||frame!==null)return;frame=window.requestAnimationFrame(()=>{frame=null;measure();});};
  updates.current={refresh};measure();
  main.addEventListener('scroll',refresh,{passive:true});window.addEventListener('resize',refresh);
  window.visualViewport?.addEventListener('resize',refresh);window.visualViewport?.addEventListener('scroll',refresh);
  const resize=typeof ResizeObserver==='function'?new ResizeObserver(refresh):null;resize?.observe(main);resize?.observe(editor);
  const mutation=typeof MutationObserver==='function'?new MutationObserver(refresh):null;mutation?.observe(editor,{childList:true,subtree:true});
  window.document.fonts?.ready.then(refresh);
  return()=>{alive=false;if(frame!==null)window.cancelAnimationFrame(frame);updates.current=null;resize?.disconnect();mutation?.disconnect();main.removeEventListener('scroll',refresh);window.removeEventListener('resize',refresh);window.visualViewport?.removeEventListener('resize',refresh);window.visualViewport?.removeEventListener('scroll',refresh);};
 },[viewRef,mainRef,editorDom,mainNode]);
 useLayoutEffect(()=>{updates.current?.refresh();},[revision,layoutKey,disabled]);
 useEffect(()=>{const refresh=()=>updates.current?.refresh();window.document.fonts?.addEventListener('loadingdone',refresh);return()=>window.document.fonts?.removeEventListener('loadingdone',refresh);},[]);
 function allowed(id,preset){try{return !callbacks.current.disabled&&typeof callbacks.current.onAdd==='function'&&callbacks.current.canAdd(id,preset)!==false;}catch{return false;}}
 function add(id,preset){if(allowed(id,preset))callbacks.current.onAdd(id,preset);}
 return createPortal(<div className="manual-v2-page-bottom-controls" contentEditable={false} style={{position:'fixed',inset:0,pointerEvents:'none'}}>
  {controls.map(page=>{
   const options=templates.map(template=>({label:template.label,disabled:!!template.disabled||!allowed(page.id,template.id),onClick:()=>add(page.id,template.id)}));
   const inactive=templates.length?options.every(option=>option.disabled):!allowed(page.id);
   const trigger=<Button iconOnly className="manual-v2-page-bottom-control" aria-label={`${page.number}쪽 뒤에 페이지 추가`} title={`${page.number}쪽 뒤에 페이지 추가`} disabled={inactive} styles={{root:{width:28,minWidth:28,height:28,minHeight:28,padding:0,pointerEvents:'auto'}}} onMouseDown={event=>event.preventDefault()} onClick={templates.length?undefined:()=>add(page.id)}><Icon name="plus" size={18} aria-hidden="true"/></Button>;
   return <div key={page.id} data-manual-page-add-after={page.id} style={{position:'absolute',left:page.left,top:page.top,pointerEvents:'auto'}}>
    {templates.length?<DropdownMenu density="compact" trigger={trigger} items={options} onOpenChange={open=>{if(open)callbacks.current.onMenuOpen?.(page.id);}}/>:trigger}
   </div>;
  })}
 </div>,window.document.body);
}
