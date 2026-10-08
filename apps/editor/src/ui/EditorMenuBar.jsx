import React,{useEffect,useRef,useState} from 'react';
import {DropdownMenu} from '@lk-design-system/lds-core/components/overlay/DropdownMenu';

// Core owns the popup and its item keyboard handling; this composes the horizontal menu bar.
export function EditorMenuBar({menus,locked}){
 const [open,setOpen]=useState(null),[current,setCurrent]=useState(0),root=useRef(null);
 useEffect(()=>{if(locked)setOpen(null);},[locked]);
 useEffect(()=>{
  if(open===null)return;
  let timer;
  const blur=()=>{timer=setTimeout(()=>{if(window.document.activeElement?.tagName==='IFRAME')setOpen(null);},0);};
  window.addEventListener('blur',blur);
  return()=>{clearTimeout(timer);window.removeEventListener('blur',blur);};
 },[open]);
 function horizontal(event){
  if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
  event.preventDefault();event.stopPropagation();
  const next=(current+(event.key==='ArrowRight'?1:-1)+menus.length)%menus.length;
  setCurrent(next);if(open!==null)setOpen(next);
  root.current.querySelectorAll('[data-editor-menu-trigger]')[next]?.focus();
 }
 return <nav ref={root} className="manual-editor-menubar" role="menubar" aria-label="문서 메뉴" onKeyDownCapture={horizontal}>
  {menus.map((menu,index)=><DropdownMenu key={menu.label} align="left" density="compact" open={open===index}
   onOpenChange={value=>{setOpen(previous=>value?index:previous===index?null:previous);if(value)setCurrent(index);}}
   trigger={<button type="button" className="manual-editor-menu-trigger" data-editor-menu-trigger role="menuitem" tabIndex={current===index?0:-1} disabled={locked}
    onFocus={()=>setCurrent(index)} onMouseEnter={()=>{if(open!==null){setCurrent(index);setOpen(index);}}}>{menu.label}</button>}
   items={menu.items}/>) }
 </nav>;
}
