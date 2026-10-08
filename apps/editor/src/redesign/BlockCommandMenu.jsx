import React,{useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Input} from '@lk-design-system/lds-core';
import {Icon} from '@lk-design-system/lds-core/components/icon/Icon';
import {blockCommandOptionId,getBlockMenuKeyAction,positionBlockCommandMenu,getBlockMenuViewport} from './block-command-catalog.mjs';
import {installBlockMenuScrollKeeper} from './block-command-scroll.mjs';
import './block-command-menu.css';

function readPlacementBounds(getter){
 if(!getter)return undefined;
 try{const rect=getter();if(!rect)return null;const bounds={left:rect.left,top:rect.top,right:rect.right??rect.left+rect.width,bottom:rect.bottom??rect.top+rect.height};return Object.values(bounds).every(Number.isFinite)?bounds:null;}catch{return null;}
}
const sameBounds=(a,b)=>a===b||!!a&&!!b&&['left','top','right','bottom'].every(key=>a[key]===b[key]);

// The caller owns the PM trigger, command execution, dirty state and menu lifetime.
// Slash mode retains editor focus; compact action lists receive keyboard focus directly.
export function BlockCommandMenu({items=[],activeId,onActiveChange,onChoose,onCompositionChoice,onCompositionChoiceConfirm,onCompositionChoiceCancel,onClose,anchor,
 query='',onQueryChange,mode='slash',id,disabled=false,composing=false,
 captureKeyboard=true,initialKeyboardNavigation=false,keyboardTarget,ariaLabel,onBack,getPlacementBounds,compact=false,autoFocusSearch=false}){
 const generatedId=useId(),menuId=id||`manual-block-menu-${generatedId}`;
 const root=useRef(null),header=useRef(null),list=useRef(null),search=useRef(null),callbacks=useRef(null),inputComposing=useRef(false),scrollKeeper=useRef(null),pendingPointerChoice=useRef(null);
 const [keyboardNavigation,setKeyboardNavigation]=useState(initialKeyboardNavigation);
 useLayoutEffect(()=>{setKeyboardNavigation(initialKeyboardNavigation);},[mode,initialKeyboardNavigation]);
 const [localActive,setLocalActive]=useState(null),[menuHeight,setMenuHeight]=useState(360),[viewport,setViewport]=useState(()=>getBlockMenuViewport(window));
 const [placementBounds,setPlacementBounds]=useState(()=>readPlacementBounds(getPlacementBounds));
 const position=positionBlockCommandMenu(anchor||{left:8,top:8,bottom:8},{width:compact?160:320,height:menuHeight,viewportWidth:viewport.width,viewportHeight:viewport.height,viewportLeft:viewport.left,viewportTop:viewport.top,placementBounds:getPlacementBounds?placementBounds??null:undefined,minimumWidth:compact&&items.some(item=>item.checked!==undefined)?124:compact&&items.some(item=>item.submenu)||!compact&&onBack?86:54,minimumHeight:compact?32:42});
 const first=items.find(item=>!item.disabled)?.id||null;
 const requested=activeId===undefined?localActive:activeId;
 const current=items.some(item=>item.id===requested&&!item.disabled)?requested:first;
 const title=ariaLabel||(mode==='slash'?'블록 삽입':mode==='turnInto'?'블록 유형 바꾸기':'블록 작업');
 function activate(next){if(activeId===undefined)setLocalActive(next);onActiveChange?.(next);}
 function pointerNavigation(){if(!disabled&&!composing&&!inputComposing.current)setKeyboardNavigation(false);}
 function choose(item){if(!disabled&&!composing&&!inputComposing.current&&!item.disabled)onChoose?.(item);}
 function optionMouseDown(item,event){
  if(pendingPointerChoice.current)onCompositionChoiceCancel?.();pendingPointerChoice.current=null;
  if(mode==='slash'&&composing&&!disabled&&!inputComposing.current&&item.compositionChoice&&event.button===0&&onCompositionChoice?.(item,event.currentTarget)===true){pendingPointerChoice.current={id:item.id,button:event.currentTarget};return;}
  event.preventDefault();
 }
 function back(event){if(!disabled&&!composing&&!inputComposing.current&&!event?.isComposing&&event?.keyCode!==229)onBack?.();}
 callbacks.current={items,current,disabled:disabled||!position,composing,compact,hasSearch:!!onQueryChange,activate,choose,onClose};
 useEffect(()=>{if(requested!==current)activate(current);},[requested,current]);
 useEffect(()=>{
  const resize=()=>setViewport(getBlockMenuViewport(window));
  window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);window.visualViewport?.addEventListener('scroll',resize);
  return()=>{window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('scroll',resize);};
 },[]);
 useEffect(()=>{
  if(!getPlacementBounds)return;
  const scroll=()=>setViewport(getBlockMenuViewport(window));
  document.addEventListener('scroll',scroll,true);
  return()=>document.removeEventListener('scroll',scroll,true);
 },[!!getPlacementBounds]);
 // Measure after each commit so panel reflow uses the current writing area.
 useLayoutEffect(()=>{const next=readPlacementBounds(getPlacementBounds);setPlacementBounds(previous=>sameBounds(previous,next)?previous:next);});
 useLayoutEffect(()=>{
  if(getPlacementBounds&&!position&&sameBounds(placementBounds,readPlacementBounds(getPlacementBounds)))callbacks.current.onClose?.({reason:'bounds',restore:false,restoreFocus:false});
 },[getPlacementBounds,placementBounds,!!position]);
 useEffect(()=>{if(disabled||composing||inputComposing.current||mode==='slash'||!position)return;if(!compact&&autoFocusSearch&&onQueryChange)search.current?.focus();else list.current?.focus();},[mode,disabled,composing,!!onQueryChange,compact,autoFocusSearch,!!position]);
 useEffect(()=>{
  const pointer=event=>{if(!root.current?.contains(event.target))callbacks.current.onClose?.({reason:'outside',restore:false,restoreFocus:false});};
  document.addEventListener('pointerdown',pointer,true);
  return()=>document.removeEventListener('pointerdown',pointer,true);
 },[]);
 function key(event){
   if(event.defaultPrevented)return;
   const inside=root.current?.contains(event.target),inEditor=keyboardTarget?keyboardTarget.contains(event.target):event.target.isContentEditable;
   if(!inside&&(mode!=='slash'||!inEditor))return;
   const live=callbacks.current;
   if(live.disabled)return;
   if(event.key==='Tab'&&!event.isComposing&&event.keyCode!==229&&!live.composing&&!inputComposing.current&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();event.stopPropagation();if(mode!=='slash'&&!live.compact&&live.hasSearch&&search.current&&event.target===list.current){search.current?.focus();return;}live.onClose?.({reason:'tab',restore:true,restoreFocus:true});return;}
   const action=getBlockMenuKeyAction(live.items,live.current,event,{composing:live.composing||inputComposing.current});
   if(!action)return;
   // Let an editable search field keep its own Home/End caret navigation.
   if(event.target===search.current&&['Home','End'].includes(event.key))return;
   event.preventDefault();event.stopPropagation();
   if(action.type==='move'){setKeyboardNavigation(true);scrollKeeper.current?.navigate();live.activate(action.activeId);}
   else if(action.type==='choose')live.choose(action.item);
   else live.onClose?.({reason:'escape',restore:true,restoreFocus:true});
 }
 function noteNavigation(event){
  if(event.defaultPrevented)return;
  const inside=root.current?.contains(event.target),inEditor=keyboardTarget?keyboardTarget.contains(event.target):event.target.isContentEditable;
  if(!inside&&(mode!=='slash'||!inEditor))return;
  const live=callbacks.current;if(live.disabled)return;
  const action=getBlockMenuKeyAction(live.items,live.current,event,{composing:live.composing||inputComposing.current});
  if(action?.type==='move'&&!(event.target===search.current&&['Home','End'].includes(event.key))){setKeyboardNavigation(true);scrollKeeper.current?.navigate();}
 }
 useEffect(()=>{
  const handler=captureKeyboard?key:noteNavigation;
  document.addEventListener('keydown',handler,true);
  return()=>document.removeEventListener('keydown',handler,true);
 },[captureKeyboard,keyboardTarget,mode]);
 useLayoutEffect(()=>{
  const container=list.current;if(!container)return;
  const keeper=installBlockMenuScrollKeeper({container,surface:window,getActiveOption:()=>container.querySelector(compact?'[data-active="true"]':'[role="option"][aria-selected="true"]')});scrollKeeper.current=keeper;
  return()=>{keeper.dispose();if(scrollKeeper.current===keeper)scrollKeeper.current=null;};
 },[!!position,compact]);
 useLayoutEffect(()=>{
  if(!root.current||!list.current)return;
  const height=Math.min(360,2+(header.current?.offsetHeight||0)+list.current.scrollHeight);
  setMenuHeight(previous=>previous===height?previous:height);
 },[items,mode,query,placementBounds,compact]);
 useLayoutEffect(()=>{scrollKeeper.current?.refresh();},[current,menuId,position?.width,position?.maxHeight]);
 const groups=[];
 for(const item of items){let group=groups.at(-1);if(!group||group.name!==item.group){group={name:item.group,items:[]};groups.push(group);}group.items.push(item);}
 const optionId=current?blockCommandOptionId(menuId,current):undefined;
 if(!position)return null;
 return createPortal(<div ref={root} className="manual-block-command-menu" data-mode={mode} data-keyboard-navigation={keyboardNavigation||undefined} data-compact={compact||undefined} aria-label={compact?undefined:title} role={compact?undefined:'dialog'} aria-modal={compact?undefined:'false'} style={position} onKeyDown={!captureKeyboard?key:undefined} onPointerDown={pointerNavigation} onPointerMove={pointerNavigation}>
  {(!compact||onBack)&&<header ref={header} className="manual-block-command-menu-header">
   {onBack&&<button type="button" aria-label="블록 작업으로 돌아가기" disabled={disabled||composing} onMouseDown={event=>event.preventDefault()} onClick={back}><Icon name="chevron-left" size={20}/></button>}
   {!compact&&onQueryChange?<Input ref={search} size="sm" className="manual-block-command-menu-search" role="combobox" aria-label={`${title} 검색`} aria-expanded="true" aria-controls={menuId} aria-activedescendant={optionId} aria-autocomplete="list" value={query} onCompositionStart={()=>{inputComposing.current=true;}} onCompositionEnd={()=>{inputComposing.current=false;}} onChange={event=>onQueryChange(event.target.value)} disabled={disabled} placeholder={mode==='block'?'작업 검색':'블록 검색'}/>:<div className="manual-block-command-menu-query"><span>{title}</span>{query&&<strong>{query}</strong>}</div>}
   <button type="button" aria-label="메뉴 닫기" onMouseDown={event=>event.preventDefault()} onClick={()=>onClose?.({reason:'button',restore:true,restoreFocus:true})}><Icon name="close" size={20}/></button>
  </header>}
  <div ref={list} id={menuId} role={compact?'menu':'listbox'} aria-label={title} className="manual-block-command-menu-list" aria-busy={disabled||undefined} tabIndex={0} aria-activedescendant={optionId}>
   {groups.map((group,index)=><div role="group" aria-label={group.name||title} key={`${group.name}-${index}`}>
    {!compact&&group.name&&(mode!=='block'||groups.length>1)&&<div className="manual-block-command-menu-group" aria-hidden="true">{group.name}</div>}
    {group.items.map(item=><button type="button" role={compact?(item.checked!==undefined?'menuitemradio':'menuitem'):'option'} aria-checked={item.checked} id={blockCommandOptionId(menuId,item.id)} key={item.id} aria-selected={compact?undefined:current===item.id} data-active={compact&&current===item.id||undefined} aria-disabled={item.disabled||disabled||undefined} aria-haspopup={item.hasPopup} disabled={item.disabled||disabled} tabIndex={-1} className="manual-block-command-menu-option" data-danger={item.danger||undefined}
     title={compact&&item.disabled?item.description:undefined} aria-description={compact&&item.disabled?item.description:undefined}
     onPointerMove={event=>{if(event.pointerType!=='touch'&&!disabled&&!item.disabled&&!composing&&!inputComposing.current)activate(item.id);}}
     onMouseDown={event=>optionMouseDown(item,event)} onClick={()=>{if(pendingPointerChoice.current?.id===item.id){const pending=pendingPointerChoice.current;pendingPointerChoice.current=null;onCompositionChoiceConfirm?.(item,pending.button);return;}choose(item);}}>
     <span className="manual-block-command-menu-icon" aria-hidden="true"><Icon name={item.icon||'document-text'} size={compact||item.kind==='heading'?16:20}/>{item.kind==='heading'&&<span className="manual-block-command-menu-icon-level">{item.attrs.level}</span>}</span><span className="manual-block-command-menu-copy"><span className="manual-block-command-menu-label">{item.label}</span>{!compact&&item.description&&<span className="manual-block-command-menu-description">{item.description}</span>}</span>{item.checked!==undefined&&<span className="manual-block-command-menu-check" aria-hidden="true">{item.checked&&<Icon name="check" size={16}/>}</span>}{item.submenu&&<span className="manual-block-command-menu-submenu" aria-hidden="true"><Icon name="chevron-right" size={16}/></span>}
    </button>)}
   </div>)}
   {!items.length&&<p className="manual-block-command-menu-empty" role="status">일치하는 블록이 없습니다. 다른 이름으로 검색하세요.</p>}
  </div>
 </div>,document.body);
}
