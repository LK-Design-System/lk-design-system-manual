import {getManualClientClip} from './manual-client-clip.mjs';
import React,{useEffect,useLayoutEffect,useRef,useState,useId} from 'react';
import {createPortal} from 'react-dom';
import {Icon} from '@lk-design-system/lds-core/components/icon/Icon';
import {EditorButton as Button} from '../ui/EditorButton.jsx';
import {getBlockMenuViewport} from './block-command-catalog.mjs';
import {getManualTableActionMenuItems,positionManualTableActionMenu,isManualTableMenuTargetCurrent,nextManualTableActionIndex,manualTableActionItemId} from './manual-table-action-menu.mjs';
import './manual-table-action-menu.css';
import {ManualTableTrailingControls} from './ManualTableTrailingControls.jsx';

const SIZE=24,GAP=4;
const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
export function ManualTableActionMenu({menuId,target,items,activeIndex=-1,keyboard=false,position,menuDom,onKeyDown,onBlur,onChoose,onHover}){
 const activeReason=items[activeIndex]?.disabled?items[activeIndex].reason:'',reasonId=`${menuId}-active-reason`;
 useLayoutEffect(()=>{if(!keyboard||!position)return;const panel=menuDom?.current;(panel?.querySelector('.manual-table-action-reason')||panel?.querySelector('[data-current=true]'))?.scrollIntoView?.({block:'nearest'});},[activeIndex,keyboard,position?.maxHeight,activeReason]);
 if(!position)return null;
 return <div ref={menuDom} id={menuId} className="manual-table-action-menu" data-manual-table-action-menu="" data-keyboard={keyboard?'true':undefined} role="menu" aria-label={target.mode==='row'?'행 작업':'열 작업'} aria-activedescendant={items[activeIndex]?manualTableActionItemId(menuId,items[activeIndex].id):undefined} tabIndex={-1} style={{...position,pointerEvents:'auto','--lds-focus-outline':'none',outline:'none'}} onKeyDown={onKeyDown} onBlur={onBlur}>
  {items.map((item,index)=><React.Fragment key={item.id}>{item.id==='delete'&&<div className="manual-table-action-divider" role="separator"/>}<Button id={manualTableActionItemId(menuId,item.id)} className="manual-table-action-item" role="menuitem" tabIndex={-1} styles={{root:{width:'100%',height:'auto',minHeight:36,whiteSpace:'normal',justifyContent:'flex-start',padding:'7px 8px',gap:10,boxSizing:'border-box',textAlign:'left',background:'var(--manual-table-action-item-background,transparent)'},content:{width:'100%',minWidth:0,justifyContent:'flex-start',gap:10,whiteSpace:'normal'}}} aria-disabled={item.disabled} title={item.reason||undefined} aria-describedby={activeIndex===index&&activeReason?reasonId:undefined} aria-description={activeIndex===index&&activeReason?undefined:item.reason||undefined} data-current={activeIndex===index?'true':undefined} data-danger={item.danger?'true':undefined} onPointerMove={()=>onHover?.(index)} onMouseDown={event=>event.preventDefault()} onClick={()=>{if(!item.disabled)onChoose?.(item);}}><Icon name={item.icon} size={16} aria-hidden="true"/>{item.label}</Button>{activeIndex===index&&activeReason&&<p id={reasonId} className="manual-table-action-reason" role="status" aria-live="polite">{activeReason}</p>}</React.Fragment>)}
 </div>;
}
export function positionManualTableSelectionControls(cell,rowStart,clip,reserved=[]){
 const valid=rect=>rect&&['left','right','top','bottom'].every(key=>Number.isFinite(rect[key]))&&rect.right>rect.left&&rect.bottom>rect.top;
 if(!valid(cell)||!valid(rowStart)||!valid(clip))return [];
 // The column glyph sits on the table border. Its 24px hit area uses 16px of
 // existing gap and 8px of cell padding; no document margin is introduced.
 const positions=[{mode:'row',left:rowStart.left-SIZE-GAP,top:(cell.top+cell.bottom-SIZE)/2},{mode:'column',left:(cell.left+cell.right-SIZE)/2,top:rowStart.top-16}];
 const obstacles=(Array.isArray(reserved)?reserved:[reserved]).filter(valid);
 // Reserve every measured rail and content box; do not move a selector onto preceding content.
 return positions.map(position=>{
  let box={left:position.left,top:position.top,right:position.left+SIZE,bottom:position.top+SIZE};
  for(let attempt=0;attempt<=obstacles.length;attempt++){const collisions=obstacles.filter(rect=>overlaps(box,rect));if(!collisions.length)break;if(position.mode!=='row'||attempt===obstacles.length)return null;position={...position,left:Math.min(...collisions.map(rect=>rect.left))-SIZE-GAP};box={...box,left:position.left,right:position.left+SIZE};}
  return box.left>=clip.left&&box.top>=clip.top&&box.right<=clip.right&&box.bottom<=clip.bottom?position:null;
 }).filter(Boolean);
}


export function getOwnedManualTable(frame){
 const table=frame?.querySelector(':scope > table')||frame?.querySelector(':scope > .lds-manual-table-frame > table');
 return table?.closest('[data-manual-node="table"]')===frame?table:null;
}

export function getManualTableSelectionGutterHit(items,point,clip,reserved=[]){
 if(!Number.isFinite(point?.x)||!Number.isFinite(point?.y))return null;
 for(const item of items){if(!item.id)continue;for(const control of positionManualTableSelectionControls(item.rect,item.rowStart,clip,reserved)){
  if(point.x>=control.left&&point.x<=control.left+SIZE&&point.y>=control.top&&point.y<=control.top+SIZE)return {id:item.id,mode:control.mode};
 }}return null;
}

// Presentation only; the parent owns PM table selection and all editing guards.
export function ManualTableSelectionControls({viewRef,mountRef,mainRef,getGeneration,isEnabled,isMenuEnabled,onSelectCellRange,onCaptureActionTarget,onCanTableAction,onTableAction,onDescribeTrailingChange,onTrailingChange,onSessionStart,onSessionEnd}){
 const [active,setActive]=useState(null),[shownMode,setShownMode]=useState(null),[menu,setMenu]=useState(null),[actionIndex,setActionIndex]=useState(-1),[menuKeyboard,setMenuKeyboard]=useState(false),api=useRef(null),current=useRef(null),refreshRef=useRef(null),session=useRef(null),menuRef=useRef(null),menuDom=useRef(null),trailingBusy=useRef(false);
 api.current={getGeneration,isEnabled,isMenuEnabled,onSelectCellRange,onCaptureActionTarget,onCanTableAction,onTableAction,onSessionStart,onSessionEnd};menuRef.current=menu;
 const menuId=`manual-table-actions-${useId().replace(/:/g,'')}`;
 const editorDom=viewRef.current?.dom,mount=mountRef.current,main=mainRef.current;
 useEffect(()=>{
  if(!editorDom||!mount||!main)return;
  let alive=true,frame=null,cell=null,snapshot=null;
  function clear(){cell=null;snapshot=null;current.current=null;setActive(null);setShownMode(null);}
  function enabled(){const editor=viewRef.current;try{return !trailingBusy.current&&!!editor&&editor.dom===editorDom&&editor.editable&&!editor.composing&&(menuRef.current?api.current.isMenuEnabled?.(menuRef.current.target)===true:api.current.isEnabled?.()===true);}catch{return false;}}
  function readReserved(table){
  const visible=element=>{const style=window.getComputedStyle(element);return !element.hidden&&style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0';};
  const chrome=[...window.document.querySelectorAll('.manual-move-handle,.manual-insert-handle,[data-outline-page-handle],[data-manual-table-resize]')].filter(visible);
  const content=[...mount.querySelectorAll('[data-manual-node][data-manual-id]')].filter(element=>!table.contains(element)&&!element.contains(table)&&visible(element));
  return [...chrome,...content].map(element=>{const rect=element.getBoundingClientRect();return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom};});
  }
  function measure(){
   if(!alive||!cell||!snapshot)return;
   const editor=viewRef.current;
   if(!enabled()||editor!==snapshot.editor||editor.state.doc!==snapshot.revision||api.current.getGeneration?.()!==snapshot.generation||!cell.isConnected||!mount.contains(cell)){if(menuRef.current)closeMenu({reason:'stale',restoreFocus:false});clear();return;}
   const table=cell.closest('[data-manual-node="table"]');if(!table||table.dataset.manualId!==snapshot.tableId||cell.dataset.manualId!==snapshot.cellId){clear();return;}
   const row=cell.parentElement,first=row?.querySelector('[data-manual-node="tableCell"][data-manual-id]');
   const firstRow=table.querySelector('tr [data-manual-node="tableCell"][data-manual-id]');if(!first||!firstRow){clear();return;}
   const rect=cell.getBoundingClientRect(),rowStart=first.getBoundingClientRect(),top=firstRow.getBoundingClientRect().top;
   const viewport=getBlockMenuViewport(window),clip=getManualClientClip(main,viewport);
   const reserved=readReserved(table);
   const controls=positionManualTableSelectionControls(rect,{left:rowStart.left,right:rowStart.right,top,bottom:Math.max(top+1,rowStart.bottom)},clip,reserved);
   const reachRect={left:Math.min(rect.left,...controls.map(item=>item.left)),right:Math.max(rect.right,...controls.map(item=>item.left+SIZE)),top:Math.min(rect.top,...controls.map(item=>item.top)),bottom:Math.max(rect.bottom,...controls.map(item=>item.top+SIZE))};
   const value={...snapshot,controls,reachRect};current.current=value;setActive(previous=>previous&&previous.editor===value.editor&&previous.revision===value.revision&&previous.generation===value.generation&&previous.cellId===value.cellId&&JSON.stringify(previous.controls)===JSON.stringify(controls)?previous:value);
  }
  const refresh=()=>{if(!alive||frame!==null)return;frame=window.requestAnimationFrame(()=>{frame=null;measure();});};refreshRef.current=refresh;
  const hover=event=>{
   if(menuRef.current)return;
   if(event.pointerType==='touch'||!enabled()){clear();return;}
   if(event.target.closest?.('[data-manual-table-selection-controls],[data-manual-table-action-menu],[data-manual-table-trailing-controls]'))return;
   let next=event.target.closest?.('[data-manual-node="tableCell"][data-manual-id]');
   let gutterMode=null;
   if(!next&&Number.isFinite(event.clientX)&&Number.isFinite(event.clientY)){
    const viewport=getBlockMenuViewport(window),clip=getManualClientClip(main,viewport);
    for(const frame of mount.querySelectorAll('[data-manual-node="table"]')){const actual=getOwnedManualTable(frame);if(!actual?.rows[0])continue;const top=actual.rows[0].getBoundingClientRect().top,reserved=readReserved(frame),items=[];
     for(const row of actual.rows){const first=row.cells[0];if(!first)continue;const origin=first.getBoundingClientRect();for(const cell of row.cells)items.push({id:cell.dataset.manualId,rect:cell.getBoundingClientRect(),rowStart:{left:origin.left,right:origin.right,top,bottom:Math.max(top+1,origin.bottom)}});}
     const hit=getManualTableSelectionGutterHit(items,{x:event.clientX,y:event.clientY},clip,reserved);if(hit){next=[...actual.querySelectorAll('[data-manual-node="tableCell"][data-manual-id]')].find(cell=>cell.dataset.manualId===hit.id);gutterMode=hit.mode;break;}
    }
   }
   if(!next||!mount.contains(next)){const reach=current.current?.reachRect;if(reach&&event.clientX>=reach.left&&event.clientX<=reach.right&&event.clientY>=reach.top&&event.clientY<=reach.bottom)return;clear();return;}
   const table=next.closest('[data-manual-node="table"]');if(!table?.dataset.manualId){clear();return;}
   if(!window.document.activeElement?.closest?.('[data-manual-table-selection-controls]'))setShownMode(gutterMode);
   const editor=viewRef.current;cell=next;snapshot={editor,revision:editor.state.doc,generation:api.current.getGeneration?.(),tableId:table.dataset.manualId,cellId:next.dataset.manualId};refresh();
  };
  const focus=event=>{let target=event.target;const selection=viewRef.current?.state.selection;for(let depth=selection?.$from?.depth||0;depth>0;depth--){const node=selection.$from.node(depth);if(node.type.name==='tableCell'){target=[...mount.querySelectorAll('[data-manual-node="tableCell"][data-manual-id]')].find(element=>element.dataset.manualId===node.attrs.id)||target;break;}}hover({target,pointerType:'mouse'});};
  const leave=event=>{if(menuRef.current||event.relatedTarget?.closest?.('[data-manual-table-selection-controls],[data-manual-table-action-menu]'))return;clear();};
  const scroll=()=>{if(menuRef.current)closeMenu({reason:'geometry',restoreFocus:false});clear();};
  window.document.addEventListener('pointermove',hover);mount.addEventListener('focusin',focus);mount.addEventListener('mouseleave',leave);main.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',scroll);window.visualViewport?.addEventListener('resize',scroll);window.visualViewport?.addEventListener('scroll',scroll);
  return()=>{alive=false;if(frame!==null)window.cancelAnimationFrame(frame);clear();refreshRef.current=null;window.document.removeEventListener('pointermove',hover);mount.removeEventListener('focusin',focus);mount.removeEventListener('mouseleave',leave);main.removeEventListener('scroll',scroll);window.removeEventListener('resize',scroll);window.visualViewport?.removeEventListener('resize',scroll);window.visualViewport?.removeEventListener('scroll',scroll);if(session.current){api.current.onSessionEnd?.({target:session.current.target,reason:'unmount',committed:false});session.current=null;}};
 },[editorDom,mount,main,viewRef]);
 useEffect(()=>{refreshRef.current?.();});
 function select(value,mode,trigger,keyboard=false){
  const editor=viewRef.current;try{if(trailingBusy.current||!api.current.isEnabled?.()||editor!==value.editor||!editor.editable||editor.composing||editor.state.doc!==value.revision||api.current.getGeneration?.()!==value.generation)return;
   const cell=[...(mountRef.current?.querySelectorAll('[data-manual-node="tableCell"][data-manual-id]')||[])].find(element=>element.dataset.manualId===value.cellId);if(!cell?.isConnected||cell.closest('[data-manual-node="table"]')?.dataset.manualId!==value.tableId)return;
   const target=api.current.onCaptureActionTarget?.({...value,mode});if(!target)return;
   const pinned={...target,editor:value.editor,generation:value.generation,revision:value.revision};
   session.current={...value,target:pinned};api.current.onSessionStart?.({target:pinned});
   if(api.current.onSelectCellRange?.(value.cellId,mode,{revision:value.revision,editor:value.editor,generation:value.generation})===false){closeMenu({reason:'selection',restoreFocus:false});return;}
   const initialItems=getManualTableActionMenuItems(mode,id=>api.current.onCanTableAction?.(pinned,id)||{enabled:false});
   const bounds=trigger.getBoundingClientRect();setShownMode(mode);setMenu({target:pinned,trigger,anchor:{left:bounds.left,top:bounds.top,bottom:bounds.bottom}});setActionIndex(nextManualTableActionIndex(initialItems,-1,'Home'));setMenuKeyboard(keyboard);
  }catch{closeMenu({reason:'unavailable',restoreFocus:false});}
 }
 function menuCurrent(value=menuRef.current){const editor=viewRef.current;try{return isManualTableMenuTargetCurrent(value?.target,{editor,generation:api.current.getGeneration?.(),enabled:api.current.isMenuEnabled?.(value?.target)===true});}catch{return false;}}
 function closeMenu({reason='close',restoreFocus=true,committed=false}={}){
  const value=menuRef.current,editor=viewRef.current;menuRef.current=null;setMenu(null);setActionIndex(-1);setMenuKeyboard(false);
  const owned=session.current;session.current=null;if(owned)api.current.onSessionEnd?.({target:owned.target,reason,committed,resultRevision:editor?.state.doc});
  const resultRevision=editor?.state.doc,resultSelection=editor?.state.selection;
  if(restoreFocus&&value&&editor===value.target.editor&&api.current.getGeneration?.()===value.target.generation)requestAnimationFrame(()=>{if(editor.state.selection===resultSelection&&isManualTableMenuTargetCurrent({...value.target,revision:resultRevision},{editor:viewRef.current,generation:api.current.getGeneration?.(),enabled:api.current.isEnabled?.()===true}))editor.focus();});
 }
 const items=menu?getManualTableActionMenuItems(menu.target.mode,id=>typeof api.current.onTableAction==='function'?(api.current.onCanTableAction?.(menu.target,id)||{enabled:false,reason:'표 작업을 사용할 수 없습니다.'}):{enabled:false,reason:'표 작업을 사용할 수 없습니다.'}):[];
 useLayoutEffect(()=>{if(menu){menuDom.current?.focus({preventScroll:true});}},[menu]);
 useEffect(()=>{
  if(!menu)return;const outside=event=>{if(event.target.closest?.('[data-manual-table-action-menu],[data-manual-table-selection-controls]'))return;closeMenu({reason:'outside',restoreFocus:false});};
  window.document.addEventListener('pointerdown',outside);return()=>window.document.removeEventListener('pointerdown',outside);
 },[menu]);
 function choose(item){if(item.disabled||!menuCurrent())return;const target=menuRef.current.target;let committed=false;try{committed=api.current.onTableAction?.(target,item.id)===true;}finally{closeMenu({reason:committed?'action':'unavailable',committed});}}
 function menuKey(event){
  if(event.isComposing)return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMenu();return;}
  if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();event.stopPropagation();const next=nextManualTableActionIndex(items,actionIndex,event.key);setActionIndex(next);setMenuKeyboard(next>=0);return;}
  if(['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();const item=items[actionIndex];if(item)choose(item);return;}
  if(event.key==='Tab')closeMenu({reason:'tab',restoreFocus:false});
 }
 const menuPosition=menu?positionManualTableActionMenu(menu.anchor,getBlockMenuViewport(window),items):null;
 useEffect(()=>{if(menu&&!menuPosition)closeMenu({reason:'geometry',restoreFocus:false});},[menu,menuPosition?.width,menuPosition?.maxHeight]);
 return <><ManualTableTrailingControls viewRef={viewRef} mountRef={mountRef} mainRef={mainRef} getGeneration={getGeneration} isEnabled={()=>!menuRef.current&&!session.current&&isEnabled?.()===true} isMenuEnabled={isMenuEnabled} onCaptureActionTarget={onCaptureActionTarget} onDescribeTrailingChange={onDescribeTrailingChange} onTrailingChange={onTrailingChange} onSessionStart={payload=>{trailingBusy.current=true;api.current.onSessionStart?.(payload);}} onSessionEnd={payload=>{trailingBusy.current=false;api.current.onSessionEnd?.(payload);}}/>{active&&createPortal(<div className="manual-v2-table-selection-controls" data-manual-table-selection-controls="" contentEditable={false} style={{position:'fixed',inset:0,pointerEvents:'none'}}>
  {active.controls.map(control=><Button key={control.mode} iconOnly data-table-grip-mode={control.mode} data-table-grip-active={menu?.target.mode===control.mode?'true':undefined} aria-label={control.mode==='row'?'행 작업':'열 작업'} title={control.mode==='row'?'행 작업':'열 작업'} aria-haspopup="menu" aria-expanded={menu?.target.mode===control.mode} aria-controls={menu?.target.mode===control.mode?menuId:undefined} styles={{root:{position:'absolute',left:control.left,top:control.top,width:SIZE,minWidth:SIZE,height:SIZE,minHeight:SIZE,padding:0,border:0,background:'transparent',pointerEvents:'auto',opacity:shownMode===control.mode||menu?.target.mode===control.mode?1:0}}} onPointerEnter={()=>setShownMode(control.mode)} onPointerLeave={()=>{if(!menuRef.current&&!window.document.activeElement?.closest?.('[data-manual-table-selection-controls]'))setShownMode(null);}} onFocus={()=>setShownMode(control.mode)} onBlur={()=>{if(!menuRef.current)setShownMode(null);}} onMouseDown={event=>event.preventDefault()} onPointerDown={event=>{event.preventDefault();event.stopPropagation();}} onClick={event=>{if(menuRef.current)closeMenu();else select(active,control.mode,event.currentTarget,event.detail===0);}}><span className="manual-table-grip-mark"><Icon name="more-vertical-tight" size={12} aria-hidden="true"/></span></Button>)}
  {menu&&<ManualTableActionMenu menuId={menuId} target={menu.target} items={items} activeIndex={actionIndex} keyboard={menuKeyboard} position={menuPosition} menuDom={menuDom} onKeyDown={menuKey} onHover={index=>{setActionIndex(index);setMenuKeyboard(false);}} onChoose={choose} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)&&!event.relatedTarget?.closest?.('[data-manual-table-selection-controls]'))closeMenu({reason:'blur',restoreFocus:false});}}/>}
 </div>,window.document.body)}</>;
}
