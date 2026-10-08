import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Icon} from '@lk-design-system/lds-core/components/icon/Icon';
import {EditorButton as Button} from '../ui/EditorButton.jsx';
import {inlineText} from './ManualPrint.jsx';
import {installOutlinePageDrag} from './outline-page-drag.mjs';
import {installOutlinePageSelection,normalizeOutlinePageSelection,selectOutlinePageTarget,outlineSelectionSources,outlineSelectionContextMatches} from './outline-page-selection.mjs';

const EMPTY_GROUPS=[];
const SELECT_INSTRUCTIONS_ID='manual-outline-page-selection-instructions';
const MOVE_INSTRUCTIONS_ID='manual-outline-page-move-instructions';
const BEFORE_FIRST_PAGE=Object.freeze({beforeFirstPage:true});
const controlStyles={root:{width:28,minWidth:28,height:28,minHeight:28,padding:0}};
const insertStyles={root:{width:16,minWidth:16,height:16,minHeight:16,padding:0,border:'none',background:'transparent',boxShadow:'none'}};

// Groups are provided by the model owner: one authored root and its consecutive
// automatic tails. DOM rows remain physical pages for navigation and numbering.
export function ManualPageOutline({pageEntries=[],groups=EMPTY_GROUPS,editingPage=-1,
 menuTargetId=null,disabled=false,onNavigate,onOpenMenu,outlineRef,
 getRevision,canDrag=()=>true,onMovePage,onDragStateChange,dragControllerRef,
 onScroll,onPointerDown,onPointerUp,canAdd=()=>false,onAdd,
 selection=null,onSelectionChange,getSelectionContext,canSelect=()=>true,onSelectionSessionChange,
 selectionControllerRef,supportsBatchMove=false}){
 const nav=useRef(null),api=useRef(null),addingPage=useRef(false),selectionController=useRef(null),moveSelection=useRef(null);
 const [feedback,setFeedback]=useState(null),[marquee,setMarquee]=useState(null);
 api.current={pageEntries,groups,disabled,getRevision,canDrag,onMovePage,onDragStateChange,canAdd,onAdd,selection,onSelectionChange,getSelectionContext,canSelect,onSelectionSessionChange,supportsBatchMove};
 const selectionEnabled=()=>!api.current.disabled&&typeof api.current.onSelectionChange==='function'&&typeof api.current.getSelectionContext==='function'&&api.current.canSelect()!==false;
 const currentSelection=()=>{const current=api.current,context=current.getSelectionContext?.();return normalizeOutlinePageSelection(current.groups,current.selection?.editor&&context&&!outlineSelectionContextMatches(current.selection,context)?{}:current.selection||{});};
 const setNav=useCallback(element=>{nav.current=element;if(typeof outlineRef==='function')outlineRef(element);else if(outlineRef)outlineRef.current=element;},[outlineRef]);
 useEffect(()=>{
  const container=nav.current;if(!container)return;
  const getGroups=()=>{
   const rows=new Map([...container.querySelectorAll('[data-outline-page-row]')].map(row=>[row.dataset.outlinePageRow,row]));
   const measured=[];
   for(const group of api.current.groups){
    const members=(group.pageIds||[group.id]).map(id=>rows.get(id));
    // A missing member is stale layout, not permission to move a partial group.
    if(!members.length||members.some(row=>!row))return [];
    const rectangles=members.map(row=>row.getBoundingClientRect());
    measured.push({id:group.id,kind:group.kind,fixed:group.fixed,
     rect:{top:Math.min(...rectangles.map(rect=>rect.top)),bottom:Math.max(...rectangles.map(rect=>rect.bottom))}});
   }
   return measured;
  };
  let seeded=false,alive=true;
  const controller=installOutlinePageDrag({container,getGroups,activationMode:'row',
   getRevision:()=>api.current.getRevision?.(),
   canStart:id=>!api.current.disabled&&!!api.current.getRevision&&!!api.current.onMovePage&&api.current.canDrag(id),
   onMove:move=>{const current=api.current,captured=moveSelection.current;current.onMovePage?.(current.supportsBatchMove&&captured?{...move,sourceIds:outlineSelectionSources(current.groups,captured.selection,move.sourceId),context:captured.context}:move);},
   onFeedback:value=>{if(alive)setFeedback(value);},
   onSessionChange:active=>{if(alive&&active!==seeded){seeded=active;if(active)moveSelection.current={selection:currentSelection(),context:api.current.getSelectionContext?.()};api.current.onDragStateChange?.(active);}}});
  if(dragControllerRef)dragControllerRef.current=controller;
  return()=>{
   alive=false;
   controller.dispose();if(dragControllerRef?.current===controller)dragControllerRef.current=null;
   if(seeded)api.current.onDragStateChange?.(false);
  };
 },[dragControllerRef]);
 useEffect(()=>{
  const container=nav.current;if(!container)return;
  const controller=installOutlinePageSelection({container,getGroups:()=>api.current.groups,getSelection:currentSelection,
   getContext:()=>api.current.getSelectionContext?.(),isEnabled:selectionEnabled,
   onChange:(value,meta)=>api.current.onSelectionChange?.(value,meta),onPreview:setMarquee,
   onSessionChange:active=>api.current.onSelectionSessionChange?.(active)});
  selectionController.current=controller;if(selectionControllerRef)selectionControllerRef.current=controller;
  return()=>{controller.dispose();if(selectionController.current===controller)selectionController.current=null;if(selectionControllerRef?.current===controller)selectionControllerRef.current=null;};
 },[selectionControllerRef]);
 useEffect(()=>{if(!selectionEnabled())selectionController.current?.cancel();});
 function navigate(entryId,event){
  if(disabled)return;
  if(!onSelectionChange){onNavigate?.(entryId);return;}
  if(!selectionEnabled()||event.isComposing||event.nativeEvent?.isComposing)return;
  const next=selectOutlinePageTarget(groups,currentSelection(),entryId,event);if(!next)return;
  const navigate=!!event.shiftKey||!event.ctrlKey&&!event.metaKey;
  onSelectionChange({...next,...getSelectionContext()},{reason:event.shiftKey?'range':event.ctrlKey||event.metaKey?'toggle':'single',targetId:entryId,navigate});
  if(navigate)onNavigate?.(entryId);
 }
 function openPageMenu(event,entryId){
  if(!onSelectionChange){onOpenMenu?.(event,entryId);return;}
  if(!selectionEnabled())return;
  const context=getSelectionContext(),sourceIds=outlineSelectionSources(groups,currentSelection(),entryId),next={...currentSelection(),...context,selectedIds:sourceIds};
  if(!currentSelection().selectedIds.includes(groupByPage.get(entryId)?.id))next.anchorId=groupByPage.get(entryId)?.id||entryId;
  onSelectionChange(next,{reason:'menu',targetId:entryId,navigate:false});
  onOpenMenu?.(event,entryId,{sourceIds,context});
 }
 const selected=new Set(currentSelection().selectedIds);
 const groupByPage=new Map();
 for(const group of groups)for(const id of group.pageIds||[group.id])groupByPage.set(id,group);
 function allowed(pageId,templateId){
  const current=api.current;
  try{return !current.disabled&&typeof current.onAdd==='function'&&current.canAdd(pageId,templateId)!==false;}catch{return false;}
 }
 function addBlankPage(addTarget,event){
  if(addingPage.current||event?.detail>1||!allowed(addTarget,'body'))return;
  addingPage.current=true;
  try{api.current.onAdd(addTarget);}finally{queueMicrotask(()=>{addingPage.current=false;});}
 }
 function insertion(addTarget,key,label,{leading=false,endId}={}){
  return <li key={`insert-${key}`} role="presentation" className={`manual-v2-page-insertion-boundary${leading?' manual-v2-page-insertion-boundary--leading':''}`} data-outline-boundary-id={key}><div className={`manual-v2-page-insert-anchor${leading?' manual-v2-page-insert-anchor--leading':''}`} data-manual-page-boundary-start={addTarget===BEFORE_FIRST_PAGE||undefined} data-manual-page-boundary-end={endId} data-manual-page-add-after={typeof addTarget==='string'?addTarget:undefined}>
   <Button iconOnly size="sm" variant="outlined" color="assistive" className="manual-v2-page-insert-button" styles={insertStyles} aria-label={label} disabled={!allowed(addTarget,'body')} onMouseDown={event=>event.preventDefault()} onClick={event=>addBlankPage(addTarget,event)}><Icon name="plus" size={12} aria-hidden="true"/></Button>
  </div></li>;
 }
 const firstEntryId=pageEntries[0]?.id;
 const target=feedback?.target;
 const targetPageId=target?.edge==='after'?(groupByPage.get(target.targetId)?.pageIds?.at(-1)||target.targetId):target?.targetId;
 const targetPageIndex=pageEntries.findIndex(entry=>entry.id===targetPageId);
 const dropStatus=feedback?.keyboard
  ? target?`${targetPageIndex+1}쪽 ${target.edge==='before'?'앞':'뒤'}로 이동합니다. Enter 또는 Space로 확정하고 Escape로 취소합니다.`:'위·아래 화살표로 이동할 위치를 선택하세요. Enter 또는 Space로 확정하고 Escape로 취소합니다.'
  : target?'여기에 페이지 이동':'이동할 페이지 사이로 끌어 주세요';
 return <nav ref={setNav} className="manual-v2-outline" aria-label="페이지 목록" aria-describedby={onSelectionChange?SELECT_INSTRUCTIONS_ID:undefined}
  onScroll={onScroll} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
  <ol>{pageEntries.flatMap((entry,i)=>{
   const group=groupByPage.get(entry.id),fixed=!group||group.fixed;
   const moving=feedback?.sourceId===group?.id;
   const atGroupBoundary=!!group&&(group.pageIds||[group.id]).at(-1)===entry.id;
   const title=inlineText(entry.title)||'제목 없는 페이지';
   const isLeading=entry.id===firstEntryId;
   const row=<li key={entry.id} className="manual-v2-page-entry" data-outline-page-row={entry.id} data-outline-page-root={group?.id} data-outline-page-selected={selected.has(group?.id)||undefined} data-outline-page-dragging={moving||undefined}>
    <button type="button" className="manual-v2-page-navigate" data-outline-page-handle={!fixed?group.id:undefined} aria-describedby={[!fixed&&MOVE_INSTRUCTIONS_ID,onSelectionChange&&SELECT_INSTRUCTIONS_ID].filter(Boolean).join(' ')||undefined} aria-pressed={onSelectionChange?selected.has(group?.id):undefined} aria-current={editingPage===i?'page':undefined} title={title} disabled={disabled} onClick={event=>navigate(entry.id,event)}><span>{String(i+1).padStart(2,'0')}</span><strong>{title}</strong></button>
    <Button iconOnly className="manual-v2-page-menu" styles={{...controlStyles,root:{...controlStyles.root,opacity:'var(--manual-page-menu-opacity,0)'}}} aria-label={`${i+1}쪽 페이지 작업`} title={`${i+1}쪽 페이지 작업`} aria-haspopup="menu" aria-expanded={menuTargetId===entry.id} aria-controls={menuTargetId===entry.id?'manual-command-list':undefined} disabled={disabled} onMouseDown={event=>event.preventDefault()} onClick={event=>openPageMenu(event,entry.id)}><Icon name="more-horizontal" size={18} aria-hidden="true"/></Button>
   </li>;
   return [isLeading&&insertion(BEFORE_FIRST_PAGE,'before-first-page','첫 페이지 앞에 페이지 추가',{leading:true}),row,
    atGroupBoundary&&insertion(entry.id,entry.id,`${i+1}쪽 뒤에 페이지 추가`,{endId:entry.id})].filter(Boolean);
  })}</ol>
  {marquee&&marquee.right>marquee.left&&marquee.bottom>marquee.top&&<div className="manual-v2-outline-selection-marquee" aria-hidden="true" style={{position:'fixed',pointerEvents:'none',left:marquee.left,top:marquee.top,width:marquee.right-marquee.left,height:marquee.bottom-marquee.top}}/>}
  {onSelectionChange&&<span id={SELECT_INSTRUCTIONS_ID} className="manual-v2-page-drop-status">Shift 클릭으로 범위를 선택하고 Ctrl 또는 ⌘ 클릭으로 선택을 바꿉니다. 목록의 빈 여백에서 끌어 여러 페이지를 선택할 수 있습니다.</span>}
  {target&&<div className="manual-v2-page-drop-indicator" aria-hidden="true" style={{position:'fixed',pointerEvents:'none',left:target.anchor.left,top:target.anchor.top,width:target.anchor.right-target.anchor.left}}/>}
  <span id={MOVE_INSTRUCTIONS_ID} className="manual-v2-page-drop-status">Enter 또는 Space로 페이지 이동을 시작합니다. 위·아래 화살표로 위치를 선택하고 Enter 또는 Space로 확정하거나 Escape로 취소합니다.</span>
  <span className="manual-v2-page-drop-status" role="status" aria-live="polite">{feedback?.dragging?dropStatus:''}</span>
 </nav>;
}
