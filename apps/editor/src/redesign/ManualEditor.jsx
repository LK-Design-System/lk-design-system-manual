import React,{useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {closeHistory} from '@tiptap/pm/history';
import {NodeSelection} from '@tiptap/pm/state';
import {Select} from '@lk-design-system/lds-core';
import {DropdownMenu} from '@lk-design-system/lds-core/components/overlay/DropdownMenu';
import {Icon as LDSIcon} from '@lk-design-system/lds-core/components/icon/Icon';
import {EditorButton as Button} from '../ui/EditorButton.jsx';
import {createEmptyManualDocument} from './manual-v2.mjs';
import {createManualView,createManualState,documentFromState,getManualEditingDocument,manualCommands,insertManualBlock,updateManualObject,moveManualObject,deleteManualObject,duplicateManualObject,selectManualObject,appendManualStep,addManualTableRow,deleteManualTableRow,addManualTableColumn,deleteManualTableColumn,findManualObject,ensureParagraphAfter,getManualSlashTrigger,getManualPageTitleCommandState,getManualCoverInsertCommandState,executeManualCoverInsert,executeManualBlockCommand} from './manual-kernel.mjs';
import {manualBlockSelectionPlugin,selectManualBlocks,selectManualBlockIds,deleteSelectedManualBlocks,duplicateSelectedManualBlocks,moveSelectedManualBlocks} from './manual-block-selection.mjs';
import {createAutosaveController,saveBeforeReplacement} from './autosave-controller.mjs';
import {createManualFileSession} from './manual-file-session.mjs';
import {createManualRecoverySession} from './manual-recovery-session.mjs';
import {listDocuments,loadDocument,saveDocument,encodeDocumentFile,decodeDocumentFile,validateAssets} from './document-store.mjs';
import {ManualPrint,inlineText} from './ManualPrint.jsx';
import {ManualObjectProperties} from './ManualObjectProperties.jsx';
import {ManualBrandAssetPicker} from './ManualBrandAssetPicker.jsx';
import {getManualBrandAsset,getManualBrandAssetByKey} from './manual-brand-assets.mjs';
import {ManualPageOutline} from './ManualPageOutline.jsx';
import {ManualTableSelectionControls} from './ManualTableSelectionControls.jsx';
import {ManualTableResizeControls} from './ManualTableResizeControls.jsx';
import {ManualFigureResizeControls} from './ManualFigureResizeControls.jsx';
import {readManualFigureLayout,setManualFigureWidth,withManualFigureWidth,resolveManualFigureAlignment,setManualFigureAlignment} from './manual-figure-layout.mjs';
import {getManualFigureResizeLimits,getManualFigureResizeBounds,getManualFigureResizeScale} from './manual-figure-resize.mjs';
import {getManualRailLeft} from './manual-rail-geometry.mjs';
import {setManualTableColumnWidths,setManualTableRowHeight} from './manual-table-layout.mjs';
import {selectManualTableCells} from './manual-table-selection.mjs';
import {captureManualTableActionTarget,getManualTableActionAvailability,executeManualTableAction} from './manual-table-actions.mjs';
import {describeManualTableTrailingChange,executeManualTableTrailingChange} from './manual-table-trailing-actions.mjs';
import {editManualCalloutTitle,moveManualCalloutTitleToBody} from './manual-callout-commands.mjs';
import {hasVisibleManualCalloutTitle} from '../../../../src/manual-callout-content.mjs';
import {getManualPageGroups,moveManualPageGroup} from './manual-page-groups.mjs';
import {getManualCoverProjection} from './manual-cover-legacy-projection.mjs';
import {setManualDividerStyle,resolveManualDividerStyle} from './manual-divider-style.mjs';
import {getManualPageGroupActionState,applyManualPageGroupAction,MANUAL_PAGE_GROUP_ACTION_RESULT} from './manual-page-group-actions.mjs';
import {normalizeOutlinePageSelection,outlineSelectionSources,outlineSelectionContextMatches} from './outline-page-selection.mjs';
import {insertManualPageTemplate,configureManualCoverTemplate} from './manual-page-templates.mjs';
import {BlockCommandMenu} from './BlockCommandMenu.jsx';
import {getBlockMenuItems,getBlockMenuKeyAction,blockCommandOptionId,getBlockMenuViewport} from './block-command-catalog.mjs';
import {manualNodeViews} from './manual-node-views.jsx';
import {resolveManualAsset} from './manual-brand-asset-urls.mjs';
import {manualDragLayout} from './manual-drag-layout.mjs';
import {manualMenuTargetDecorations} from './manual-menu-target-decoration.mjs';
import {readManualNodeSemanticKind,readManualObjectSemanticKind,manualSemanticLabel} from './manual-semantic-labels.mjs';
import {captureManualImageRequest,isManualImageRequestCurrent} from './manual-image-request.mjs';
import {installManualCompositionCompletion} from './manual-composition.mjs';
import {installManualSlashCompositionChoice} from './manual-slash-composition-choice.mjs';
import {installManualMarqueeSelection} from './manual-marquee-selection.mjs';
import {installManualPaginationRuntime} from './manual-pagination-runtime.mjs';
import {manualPaginationMarker} from './manual-pagination-meta.mjs';
import {getOrderedPageEntries} from './manual-page-order.mjs';
import {getManualOutsideCalloutTarget} from './manual-caret-hit.mjs';
import {getManualWritingBounds,positionManualFormatBubble,installManualFormatBubbleUpdates} from './manual-format-bubble.mjs';
import {installCanvasDrag} from '../ui/canvas-drag.mjs';
import './manual-editor.css';

const names={document:'문서',page:'페이지',pageTitle:'페이지 제목',pageLead:'소개문',cover:'표지',paragraph:'본문',heading:'소제목',list:'목록',listItem:'목록 항목',procedure:'절차',step:'단계',figure:'이미지',table:'표',callout:'콜아웃',quote:'인용',mediaGroup:'이미지와 설명',cell:'표 셀',todo:'할 일',toggle:'토글',codeBlock:'코드 블록',divider:'구분선'};
const browserStorage={listDocuments,loadDocument,saveDocument};
const propertyTypes=new Set(['figure','callout','codeBlock','procedure','table','divider']);
function objects(document){
 const result=new Map();
 const walk=(value,type,parentId=null,collection=null,index=0)=>{
  if(!value||typeof value!=='object')return;
  if(value.id){result.set(value.id,{value,type:value.type||type,parentId,collection,index});parentId=value.id;}
  for(const [key,child]of Object.entries(value)){
   if(key==='extensions')continue;
   if(Array.isArray(child))child.forEach((item,i)=>{
    if(Array.isArray(item))item.forEach((cell,j)=>walk(cell,'cell',parentId,'rows',i));
    else walk(item,({pages:'page',covers:'cover',steps:'step',headers:'cell',items:'listItem'})[key]||'content',parentId,key,i);
   });
   else if(child&&typeof child==='object')walk(child,key,parentId,key,0);
  }
 };
 walk(document,'document');return result;
}
function selectionIds(state){
 if(!state)return [];
 const ids=state.selection.manualBlockSelection?[...state.selection.ids]:[];
 if(state.selection.node?.attrs.id)ids.push(state.selection.node.attrs.id);
 for(let d=state.selection.$from.depth;d>0;d--){const id=state.selection.$from.node(d).attrs.id;if(id&&!ids.includes(id))ids.push(id);}
 return ids;
}
function blockMenuSelection(state,menu){
 const selection=state?.selection;
 return ['block','turnInto'].includes(menu?.mode)&&selection?.manualBlockSelection&&selection.ids.includes(menu.targetId)?selection:null;
}
function pageInsertionTarget(target){
 if(typeof target==='string'&&target)return {key:`after:${target}`,options:{afterPageId:target}};
 if(target&&typeof target==='object'&&!Array.isArray(target)&&target.beforeFirstPage===true&&(target.afterPageId===undefined||target.afterPageId===null))return {key:'before-first-page',options:{beforeFirstPage:true}};
 return null;
}
function textKind(state){
 if(!state)return 'paragraph';
 if(state.selection.manualTableCellSelection)return 'selected:cells';
 if(state.selection.manualBlockSelection&&state.selection.ids.length>1)return 'selected:blocks';
 const selectedNode=state.selection.node||(state.selection.manualBlockSelection?state.selection.items[0]?.node:null);
 if(selectedNode){const kind=readManualObjectSemanticKind(state,selectedNode.attrs.id)||readManualNodeSemanticKind(state,selectedNode,state.selection.from);return ['paragraph','heading1','heading2','heading3','todo','codeBlock','bulletList','orderedList','pageTitle','pageLead','coverTitle','coverSectionTitle'].includes(kind)?kind:`selected:${kind}`;}
 if(!state.selection.$from.depth)return 'paragraph';
 const parent=state.selection.$from.parent,kind=readManualNodeSemanticKind(state,parent,state.selection.$from.before());
 if(['pageTitle','pageLead','coverTitle','coverSectionTitle','stepTitle','calloutTitle','figureCaption','tableCell','toggleTitle'].includes(kind))return kind;
 for(let d=state.selection.$from.depth;d>0;d--){const name=state.selection.$from.node(d).type.name;if(['bulletList','orderedList'].includes(name))return name;}
 return ['heading1','heading2','heading3','todo','codeBlock'].includes(kind)?kind:'paragraph';
}
function objectSemanticName(state,item){return manualSemanticLabel(readManualObjectSemanticKind(state,item?.value.id)||item?.type);}
function coverInsertReasonDescription(reason){return ({'role-exists':'이 요소는 이미 있습니다.','current-role':'현재 선택한 요소입니다.','ineligible-selection':'하나의 블록을 선택해 주세요.','incomplete-group':'자동으로 이어진 페이지 묶음을 확인해 주세요.','stale':'메뉴를 다시 열어 주세요.','stale-trigger':'메뉴를 다시 열어 주세요.','read-only':'읽기 전용 문서입니다.','composing':'입력을 마친 뒤 사용할 수 있습니다.','missing-target':'블록을 다시 선택해 주세요.','foreign-page':'현재 페이지의 블록을 선택해 주세요.','no-page':'페이지 안에서 사용할 수 있습니다.','cancelled':'작업을 취소했습니다.','invalid-role':'표지 요소를 다시 선택해 주세요.','needs-choice':'로고를 선택해 주세요.','invalid-logo':'공식 로고를 다시 선택해 주세요.'})[reason]||'현재 위치에서는 추가할 수 없습니다.';}
function marked(state,name){if(!state)return false;const mark=state.schema.marks[name];if(!mark)return false;return state.selection.empty?!!mark.isInSet(state.storedMarks||state.selection.$from.marks()):state.selection.ranges.some(range=>state.doc.rangeHasMark(range.$from.pos,range.$to.pos,mark));}
function MarkGlyph({name}){return ({strong:<strong>B</strong>,emphasis:<em>I</em>,underline:<u>U</u>,strike:<s>S</s>,code:<>&lt;/&gt;</>})[name];}
function ManualFormatBubble({viewRef,mainRef,editorState,outline,inspector,compositionVersion,children}){
 const root=useRef(null),[position,setPosition]=useState(null);
 useLayoutEffect(()=>{
  const editor=viewRef.current,main=mainRef.current;
  if(!editor||!main)return;
  const isCurrent=()=>viewRef.current===editor&&mainRef.current===main&&editor.dom.isConnected;
  const update=()=>{
   if(!isCurrent()||!root.current)return;
   const selection=window.getSelection(),range=selection?.rangeCount?selection.getRangeAt(0):null;
   const eligible=!editor.state.selection.manualTableCellSelection&&!editor.state.selection.empty&&!editor.state.selection.node&&!editor.state.selection.manualBlockSelection;
   const next=eligible&&range&&editor.dom.contains(range.commonAncestorContainer)?positionManualFormatBubble([...range.getClientRects()],root.current.getBoundingClientRect(),getBlockMenuViewport(window),main.getBoundingClientRect()):null;
   setPosition(previous=>previous?.left===next?.left&&previous?.top===next?.top?previous:next);
  };
  update();
  const updates=installManualFormatBubbleUpdates({surface:window,isCurrent,update});
  return()=>updates.dispose();
 },[viewRef,mainRef,editorState,outline,inspector,compositionVersion]);
 return <div ref={root} className="manual-v2-format-bubble" role="group" aria-label="선택 텍스트 서식" style={position||{left:0,top:0,visibility:'hidden'}} onMouseDown={event=>event.preventDefault()}>{children}</div>;
}
function Dialog({title,children,onClose,busy=false,showClose=true,compact=false}){
 const ref=useRef(null);
 useEffect(()=>{ref.current.showModal();ref.current.querySelector('[data-initial-focus]')?.focus();},[]);
 return <dialog ref={ref} className="manual-v2-dialog" aria-label={title} aria-busy={busy||undefined} style={compact?{width:'min(440px,calc(100vw - 32px))'}:undefined} onCancel={event=>{event.preventDefault();if(!busy)onClose();}}><header><h2>{title}</h2>{showClose&&<Button onClick={onClose} disabled={busy}>닫기</Button>}</header>{children}</dialog>;
}
function Icon({name}){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name==='undo'?<path d="M8 5 3 10l5 5M3 10h11a6 6 0 0 1 0 12" transform="translate(0 -2)"/>:name==='redo'?<path d="M8 5 3 10l5 5M3 10h11a6 6 0 0 1 0 12" transform="translate(24 -2) scale(-1 1)"/>:<path d="M4 6h16M4 12h16M4 18h16"/>}</svg>;}
export function ManualEditor({storage=browserStorage,fileSessionFactory=createManualFileSession}={}){
 // Keep one storage session for this editor; isolated QA can provide the same contract.
 const storageApi=useRef({...browserStorage,...storage}).current;
 const dragController=useRef(null),dragApi=useRef(null),dragPaths=useRef(new Map()),dragCollections=useRef(new Map());
 const marginDrag=useRef(null),dragSelection=useRef(null),outlineDragController=useRef(null),outlineDragSession=useRef(null),marqueeController=useRef(null),marqueeBaseline=useRef(null),writing=useRef(null),sparseSnapshot=useRef({active:false,cellActive:false,editor:null,generation:0});
 const outlineSelectionRef=useRef(null),ownOutlineSelectSession=useRef(null),outlineSelectionController=useRef(null);
 const tableUISession=useRef(null),tableResizeSession=useRef(null),figureResizeSession=useRef(null);
 const uiApi=useRef(null),menuRef=useRef(null),dismissedSlash=useRef(null),geometryUpdates=useRef(null);
 const printRef=useRef(null),printing=useRef(false),fileSession=useRef(null),fileBaseline=useRef(null);
 const recoverySession=useRef(null),backupIssue=useRef(null);
 const autosave=useRef(null),lastQueued=useRef(null),compositionCompletion=useRef(null),slashCompositionChoice=useRef(null),feedbackTimer=useRef(null),pagination=useRef(null),normalization=useRef(null);
 const generation=useRef(0),replacing=useRef(false),replacementSaving=useRef(false),navigationApproved=useRef(false);
 const main=useRef(null),mount=useRef(null),view=useRef(null),assetsRef=useRef({}),baseline=useRef(null),revision=useRef(null),pendingAction=useRef(null),saveRef=useRef(null),imageInput=useRef(null),fileInput=useRef(null),imageTarget=useRef(null),titleInput=useRef(null);
 const [document,setDocument]=useState(()=>createEmptyManualDocument()),[assets,setAssets]=useState({}),[,refresh]=useState(0),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState({message:'',tone:'status',recovery:null}),[saveStatus,setSaveStatus]=useState('저장 전'),[fileSaveMode,setFileSaveMode]=useState(null);
 const [printRequested,setPrintRequested]=useState(false),[outline,setOutline]=useState(()=>window.innerWidth>760),[inspector,setInspector]=useState(false),[inspectorTargetId,setInspectorTargetId]=useState(null),[modal,setModal]=useState(null),[menu,setMenu]=useState(null),[bubble,setBubble]=useState(null),[replacementBusy,setReplacementBusy]=useState(false);
 const [outlineSelection,setOutlineSelection]=useState(null);
 const [compositionVersion,setCompositionVersion]=useState(0);
 const [paginationResult,setPaginationResult]=useState({status:'idle',diagnostics:[]});
 useEffect(()=>()=>clearTimeout(feedbackTimer.current),[]);
 const notice=feedback.message;
 function setNotice(message,{tone='status',recovery=null}={}){clearTimeout(feedbackTimer.current);setFeedback({message,tone,recovery});}
 function showFeedback(message){setNotice(message);feedbackTimer.current=setTimeout(()=>setFeedback(current=>current.message===message&&current.tone==='status'?{...current,message:''}:current),4000);}
 useEffect(()=>{const media=window.matchMedia('(max-width:760px)');const change=()=>{if(media.matches){setOutline(false);setInspector(false);}};media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 useEffect(()=>{view.current?.setProps({editable:()=>ready&&!busy&&!printRequested&&!replacementBusy});},[ready,busy,printRequested,replacementBusy]);
 useEffect(()=>{const close=event=>{if(event.key==='Escape'&&!modal){setOutline(value=>window.innerWidth<=760?false:value);setInspector(false);}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[modal]);
 const isDirty=()=>!!fileSession.current?.getState().saving||!!view.current&&(!normalization.current&&(!fileBaseline.current||!view.current.state.doc.eq(fileBaseline.current.doc))||assetsRef.current!==fileBaseline.current?.assets);
 function installRecord(record,{saved=true,fileSaved=false,handle=null,preserveFileBinding=false}={}){
  marqueeController.current?.cancel();outlineSelectionController.current?.cancel();ownOutlineSelectSession.current=null;storeOutlineSelection(null);compositionCompletion.current?.cancel();slashCompositionChoice.current?.cancel();
  setMenu(null);dismissedSlash.current=null;setBubble(null);setPrintRequested(false);printing.current=false;
  generation.current++;recoverySession.current?.cancel();backupIssue.current=null;if(!preserveFileBinding){fileSession.current?.reset({handle});fileBaseline.current=null;}
  assetsRef.current=record.assets||{};setAssets(assetsRef.current);
  view.current.updateState(createManualState({document:record.document,plugins:[manualBlockSelectionPlugin()]}));
  normalization.current={saved,fileSaved,documentId:record.document.id,revision:saved?record.revision:null,generation:generation.current};
  if(fileSaved)fileBaseline.current={editor:view.current,doc:view.current.state.doc,assets:assetsRef.current,generation:generation.current};
  pagination.current?.normalize();
  revision.current=saved?record.revision:null;
  baseline.current=saved?{doc:view.current.state.doc,assets:assetsRef.current}:null;
  const recovery=recoverySession.current?.reset({documentId:record.document.id,record:saved?record:null});
  lastQueued.current={doc:view.current.state.doc,assets:assetsRef.current};autosave.current?.reset({documentId:record.document.id,revision:recovery?.revision??null});
  setDocument(documentFromState(view.current.state));if(!preserveFileBinding)setSaveStatus(fileSaved?'저장됨':'저장 전');setInspector(false);refresh(n=>n+1);
 }
 useEffect(()=>{
  let alive=true;
  recoverySession.current=createManualRecoverySession({saveDocument:storageApi.saveDocument,loadDocument:storageApi.loadDocument});
  autosave.current=createAutosaveController({save:snapshot=>recoverySession.current.save(snapshot),onSaved:(record,{token})=>{if(!alive)return;revision.current=record.revision;baseline.current=token;backupIssue.current=null;setFeedback(current=>current.recovery==='backup'?{message:'',tone:'status',recovery:null}:current);refresh(n=>n+1);},onStatus:status=>{if(alive)uiApi.current?.handleBackupStatus(status);}});
  const editor=createManualView(mount.current,{document,plugins:[manualBlockSelectionPlugin()],nodeViews:manualNodeViews,onPasteAssets:incoming=>{const merged={...assetsRef.current,...incoming};validateAssets(merged);assetsRef.current=merged;setAssets(merged);},onPasteError:error=>setNotice(error.message,{tone:'error'}),resolveAsset:key=>resolveManualAsset(key,assetsRef.current),onChange:(state,_editor,transaction)=>{if(!alive)return;slashCompositionChoice.current?.observe(state,transaction);if(transaction?.docChanged){marqueeController.current?.cancel();uiApi.current?.reconcileOutlineSelection(state,_editor,transaction);}if(transaction?.docChanged&&!transaction.getMeta('manualPagination'))normalization.current=null;pagination.current?.changed(transaction);trackSparseSelection(state,_editor);setDocument(documentFromState(state));refresh(n=>n+1);}});
  view.current=editor;baseline.current={doc:editor.state.doc,assets:assetsRef.current};lastQueued.current=baseline.current;recoverySession.current.reset({documentId:document.id});autosave.current.reset({documentId:document.id});
  const activeFileToken=token=>!!token&&view.current===token.editor&&generation.current===token.generation;
  fileSession.current=fileSessionFactory({surface:window,capture:()=>view.current?{document:documentFromState(view.current.state),assets:assetsRef.current,token:{editor:view.current,doc:view.current.state.doc,assets:assetsRef.current,generation:generation.current}}:null,isActive:activeFileToken,isCurrent:token=>activeFileToken(token)&&view.current.state.doc.eq(token.doc)&&assetsRef.current===token.assets,isEnabled:()=>!!uiApi.current?.fileReady&&view.current===editor&&!editor.composing&&(editor.editable||replacementSaving.current)&&!replacing.current&&!printing.current,
   download:request=>uiApi.current?.downloadFileBytes(request),onSaved:result=>{if(alive&&activeFileToken(result.token)){fileBaseline.current=result.token;refresh(n=>n+1);}},onStatus:({state})=>{if(alive)setSaveStatus(({saving:'저장 중',saved:'저장됨',error:'저장 실패'})[state]||'저장 전');},onError:({error,operation})=>{if(alive){if(operation==='save')setSaveStatus('저장 실패');setNotice(error.message,{tone:'error',recovery:operation==='open'?'open':'save'});}}});
  setFileSaveMode(fileSession.current.getCapabilities().mode);
  editor.setProps({manualDividerStyleEnabled:editor=>uiApi.current?.dividerStyleEnabled(editor)||false,manualFigureResizeEnabled:editor=>uiApi.current?.figureResizeEnabled(editor)||false,manualCalloutFocusEnabled:editor=>uiApi.current?.calloutFocusEnabled(editor)||false,manualTableSelectionEnabled:editor=>uiApi.current?.tableSelectionEnabled(editor)||false,manualTableSelectionGestureBlocked:(editor,event)=>uiApi.current?.tableGestureBlocked(editor,event)!==false,handleClickOn:(editor,_pos,node,nodePos,event)=>uiApi.current?.handleFigureClick({editor,node,nodePos,event})||false,handleKeyDown:(_editor,event)=>uiApi.current?.handleEditorKey(event)||false,attributes:state=>({role:'textbox','aria-label':'매뉴얼 본문','aria-multiline':'true','data-move-collection':`${state.doc.attrs.meta.id}/pages`,...(menuRef.current?.mode==='slash'?{'aria-controls':'manual-command-list','aria-expanded':'true','aria-activedescendant':menuRef.current.activeId?blockCommandOptionId('manual-command-list',menuRef.current.activeId):undefined}:{})}),decorations:state=>{const layout=manualDragLayout(state);dragPaths.current=layout.paths;dragCollections.current=layout.collections;const target=manualMenuTargetDecorations(state,{menu:menuRef.current,editor:view.current,generation:generation.current,readOnly:uiApi.current?.menuTargetEnabled(view.current)!==true});return layout.decorations.add(state.doc,target.find());}});
  const composition=installManualCompositionCompletion({editor,getEditor:()=>view.current,getGeneration:()=>generation.current,onFinished:()=>{slashCompositionChoice.current?.finish();setCompositionVersion(value=>value+1);uiApi.current?.queueSave();}});compositionCompletion.current=composition;
  const compositionChoice=installManualSlashCompositionChoice({editor,getEditor:()=>view.current,getGeneration:()=>generation.current,getMenu:()=>menuRef.current,isEnabled:editor=>uiApi.current?.slashCompositionChoiceEnabled(editor)===true,onReady:request=>uiApi.current?.completeSlashCompositionChoice(request)});slashCompositionChoice.current=compositionChoice;
  const geometry=installManualFormatBubbleUpdates({surface:window,isCurrent:()=>view.current===editor&&editor.dom.isConnected,update:()=>uiApi.current?.refreshSlashAnchor()});geometryUpdates.current=geometry;
  const flow=installManualPaginationRuntime({editor,getEditor:()=>view.current,getGeneration:()=>generation.current,isEnabled:()=>!!uiApi.current?.paginationEnabled&&editor.editable&&!replacing.current&&!replacementSaving.current&&!printing.current&&!dragController.current?.isDragging()&&!outlineDragController.current?.isDragging()&&!marqueeController.current?.isDragging()&&!editor.state.selection.manualSparseBlockSelection&&!editor.state.selection.manualTableCellSelection&&!tableUISession.current&&!tableResizeSession.current&&!figureResizeSession.current&&!ownOutlineSelectSession.current&&!marginDrag.current,onResult:result=>{
   if(!alive||view.current!==editor)return;
   const initial=normalization.current;
   if(result.origin==='initial'&&['stable','blocked','limit','invalid','unmeasurable'].includes(result.status)&&initial?.generation===generation.current){
    normalization.current=null;
    if(initial.fileSaved)fileBaseline.current={editor,doc:editor.state.doc,assets:assetsRef.current,generation:generation.current};
    if(initial.saved){baseline.current={doc:editor.state.doc,assets:assetsRef.current};lastQueued.current=baseline.current;autosave.current.reset({documentId:initial.documentId,revision:recoverySession.current.getState()?.revision??null});}
    else{lastQueued.current=null;uiApi.current?.queueSave(true);}
   }
   setPaginationResult(result);
  }});pagination.current=flow;
  (async()=>{try{const records=await storageApi.listDocuments();if(alive&&records.length){const record=await recoverySession.current.loadRecord(records[0].id);if(alive)installRecord(record);}}catch(error){if(alive)setNotice(error.message,{tone:'error',recovery:'library'});}finally{if(alive)setReady(true);}})();
  const protect=event=>{if(!navigationApproved.current&&isDirty()){event.preventDefault();event.returnValue='';}};
  const shortcut=event=>{if(event.defaultPrevented||event.shiftKey||event.altKey)return;if(event.ctrlKey||event.metaKey){if(event.key.toLowerCase()==='s'){event.preventDefault();saveRef.current?.();}if(event.key.toLowerCase()==='p'){event.preventDefault();printRef.current?.();}}};
  window.addEventListener('beforeunload',protect);window.addEventListener('keydown',shortcut);
  return()=>{alive=false;window.removeEventListener('beforeunload',protect);window.removeEventListener('keydown',shortcut);flow.dispose();pagination.current=null;geometry.dispose();geometryUpdates.current=null;composition.dispose();compositionCompletion.current=null;compositionChoice.dispose();slashCompositionChoice.current=null;autosave.current?.dispose();recoverySession.current?.cancel();recoverySession.current=null;fileSession.current?.dispose();fileSession.current=null;editor.destroy();view.current=null;};
 },[]);
 const state=view.current?.state,editingDocument=useMemo(()=>state?getManualEditingDocument(state):document,[state?.doc,document]);
 const index=useMemo(()=>objects(editingDocument),[editingDocument]);
 const ids=selectionIds(state),selected=ids.map(id=>index.get(id)).find(item=>item&&names[item.type]&&item.type!=='document'),page=ids.map(id=>index.get(id)).find(item=>item?.type==='page'),procedure=ids.map(id=>index.get(id)).find(item=>item?.type==='procedure'),table=ids.map(id=>index.get(id)).find(item=>item?.type==='table');
 const pageEntries=getOrderedPageEntries(document),editingPage=pageEntries.findIndex(entry=>ids.includes(entry.id));
 const pageGroups=useMemo(()=>state?getManualPageGroups(state.doc):[],[state?.doc]);
 const blockSelection=state?.selection.manualBlockSelection?state.selection:null;
 const multi=!!blockSelection&&blockSelection.ids.length>1;
 const menuSelection=blockMenuSelection(state,menu),menuMulti=!!menuSelection&&menuSelection.ids.length>1;
 const menuTarget=menu?.targetId?index.get(menu.targetId):null,menuPage=menu?.mode==='block'&&['page','cover'].includes(menuTarget?.type);
 const menuTargetName=objectSemanticName(state,menuTarget);
 const inspected=index.get(inspectorTargetId),inspectedId=inspected?.value.id,inspectedTable=inspected?.type==='table'?inspected:null;
 const showInspector=inspector&&propertyTypes.has(inspected?.type);
 useEffect(()=>{if(inspector&&!propertyTypes.has(inspected?.type))setInspector(false);},[inspector,inspected?.type]);
 const dirty=isDirty(),disabled=busy||!ready||printRequested;menuRef.current=menu;
 function deferredFocusEnabled(editor,{slashRequest=null}={}){const captured=slashRequest?.captured,slashReturn=!!captured&&captured.mode==='slash'&&menu?.mode==='slash'&&menu.editor===editor&&menu.revision===editor.state.doc&&menu.generation===generation.current&&captured.editor===editor&&captured.revision===editor.state.doc&&captured.generation===generation.current&&captured.selection?.eq(editor.state.selection)&&menu.selection?.eq(editor.state.selection)&&JSON.stringify(menu.trigger)===JSON.stringify(captured.trigger);return !!editor&&editor===view.current&&ready&&!busy&&!printRequested&&!replacementBusy&&!modal&&(!menu||slashReturn)&&!replacing.current&&!replacementSaving.current&&!printing.current&&!figureResizeSession.current&&!tableUISession.current&&!tableResizeSession.current&&!ownOutlineSelectSession.current&&!outlineDragSession.current&&!marginDrag.current&&!dragController.current?.isDragging()&&!outlineDragController.current?.isDragging()&&!marqueeController.current?.isDragging()&&editor.editable&&!editor.composing&&!!editor.dom?.isConnected;}
 function scheduleFocus(target=null,{frames=1,slashRequest=null,focusReturn=null}={}){
  const editor=view.current,epoch=generation.current,revision=editor?.state.doc;
  if(!editor)return;
  const current=()=>(!focusReturn||(view.current===focusReturn.editor&&generation.current===focusReturn.generation&&editor.state.doc===focusReturn.doc&&editor.state.selection===focusReturn.selection))&&view.current===editor&&generation.current===epoch&&editor.state.doc===revision&&uiApi.current?.deferredFocusEnabled(editor,{slashRequest})===true;
  const restore=()=>{if(target?.isConnected)target.focus();else editor.focus();};
  queueMicrotask(()=>{const frame=remaining=>requestAnimationFrame(()=>{if(!current())return;if(remaining>1)frame(remaining-1);else restore();});frame(frames);});
 }
 function command(action,{focus=true}={}){
  const editor=view.current;if(!editor||disabled||replacing.current||editor.composing)return false;
  try{const ok=action(editor.state,editor.dispatch,editor);if(ok){setNotice('');if(focus)scheduleFocus();}else setNotice('현재 위치에서는 이 동작을 사용할 수 없습니다. 본문이나 대상 요소를 선택해 주세요.');return ok;}catch(error){setNotice(error.message,{tone:'error'});return false;}
 }
 const can=action=>{try{return !!state&&!disabled&&!replacementBusy&&!!action(state);}catch{return false;}};
 function queueSave(force=false){
  const editor=view.current;if(!ready||busy||!editor||editor.composing||replacing.current||normalization.current)return;
  const token={doc:editor.state.doc,assets:assetsRef.current};
  if(!force&&lastQueued.current?.doc===token.doc&&lastQueued.current?.assets===token.assets)return;
  lastQueued.current=token;autosave.current.schedule({document:documentFromState(editor.state),assets:assetsRef.current},token);
 }
 function save({as=false}={}){
  if(!ready||busy||!view.current)return Promise.resolve(false);
  if(normalization.current){setNotice('페이지를 정리하고 있습니다. 잠시 후 저장해 주세요.');return Promise.resolve(false);}
  if(view.current.composing){setNotice('한글 조합을 마친 뒤 저장해 주세요.');return Promise.resolve(false);}
  // Invoke the picker inside this gesture; browser recovery never precedes file Save.
  const replacement=pendingAction.current,editor=view.current,downloadRequest={replacement,editor,doc:editor.state.doc,assets:assetsRef.current,generation:generation.current};
  const pending=as?fileSession.current?.saveAs():fileSession.current?.save();
  return Promise.resolve(pending).then(result=>{if(result?.status==='saved'){setNotice('');return true;}if(result?.status==='download-requested'){showFeedback('.manual.json 파일 내보내기를 요청했습니다.');if(replacement&&replacementDownloadCurrent(downloadRequest))setModal(current=>current?.kind==='unsaved'&&current.replacement===replacement?{...current,downloadRequest}:current);}return false;});
 }

 useEffect(()=>{const timer=setTimeout(()=>queueSave(),75);return()=>clearTimeout(timer);},[state?.doc,assets,ready,busy]);
 saveRef.current=save;
 function protect(action){if(replacementSaving.current)return;if(!isDirty()){action();return;}pendingAction.current={action,previous:modal,focusReturn:view.current?{editor:view.current,doc:view.current.state.doc,selection:view.current.state.selection,generation:generation.current}:null};setModal({kind:'unsaved',replacement:pendingAction.current});}
 function finishReplacement(){const action=pendingAction.current?.action;pendingAction.current=null;setModal(null);action?.();}
 function cancelReplacement(){if(replacementSaving.current)return;const pending=pendingAction.current,previous=pending?.previous;pendingAction.current=null;setModal(previous||null);if(!previous&&pending?.focusReturn)scheduleFocus(null,{focusReturn:pending.focusReturn});}
 function replacementDownloadCurrent(request){return !!request&&pendingAction.current===request.replacement&&view.current===request.editor&&generation.current===request.generation&&view.current.state.doc===request.doc&&assetsRef.current===request.assets;}
 async function saveAndContinue(){
  if(replacementSaving.current||busy||!pendingAction.current)return;
  const pending=pendingAction.current,editor=view.current,epoch=generation.current;
  const current=()=>!!editor&&view.current===editor&&generation.current===epoch&&pendingAction.current===pending;
  replacementSaving.current=true;setReplacementBusy(true);
  setModal(value=>value?.kind==='unsaved'&&value.replacement===pending?{...value,downloadRequest:null}:value);
  setBubble(null);
  try{await saveBeforeReplacement({capture:()=>current()?{doc:editor.state.doc,assets:assetsRef.current,generation:epoch}:null,save:()=>current()?save():Promise.resolve(false),isCurrent:token=>current()&&editor.state.doc.eq(token.doc)&&assetsRef.current===token.assets&&!isDirty(),replace:()=>{if(current())finishReplacement();}});}
  catch(error){if(current()){setNotice(error.message,{tone:'error',recovery:'save'});setModal({kind:'unsaved',replacement:pending});}}
  finally{if(!current()&&pendingAction.current===pending){pendingAction.current=null;setModal(value=>value?.kind==='unsaved'&&value.replacement===pending?null:value);}replacementSaving.current=false;setReplacementBusy(false);}
 }
 function handleBackupStatus({error,documentId}){
  if(!error||error.code==='STALE_RECOVERY'||view.current?.state.doc.attrs.meta.id!==documentId)return;
  if(backupIssue.current?.documentId===documentId&&backupIssue.current.code===error.code)return;
  backupIssue.current={documentId,code:error.code};
  setNotice('복구본을 저장하지 못했습니다. 문서 파일 저장은 계속 사용할 수 있습니다.',{tone:'error',recovery:'backup'});
 }
 function newDocument(){protect(()=>{installRecord({document:createEmptyManualDocument(),assets:{}},{saved:false});setModal(null);showFeedback('새 매뉴얼을 열었습니다.');scheduleFocus(titleInput.current,{frames:2});});}
 async function showLibrary(){setBusy(true);try{const records=await storageApi.listDocuments();setModal({kind:'library',records});}catch(error){setNotice(error.message,{tone:'error',recovery:'library'});}finally{setBusy(false);}}
 function openRecord(id){protect(async()=>{generation.current++;replacing.current=true;setBusy(true);try{installRecord(await recoverySession.current.loadRecord(id));setModal(null);showFeedback('저장된 문서를 열었습니다.');}catch(error){setNotice(error.message,{tone:'error',recovery:'library'});}finally{replacing.current=false;setBusy(false);}});}
 function acceptFile(data,handle=null){protect(()=>{installRecord(data,{saved:false,fileSaved:true,handle});requestAnimationFrame(()=>uiApi.current?.queueSave(true));setModal(null);showFeedback('문서를 열었습니다.');});}
 function openFile(){
  if(!ready||busy||replacementBusy||view.current?.composing||replacing.current||!view.current?.editable||printing.current)return;
  if(!fileSession.current?.getCapabilities().open){fileInput.current.click();return;}
  const pending=fileSession.current.open();
  void Promise.resolve(pending).then(result=>{if(result?.status==='opened')acceptFile(result,result.handle);});
 }
 async function importFile(file){const editor=view.current,epoch=generation.current;try{const data=decodeDocumentFile(await file.text());if(view.current===editor&&generation.current===epoch)acceptFile(data);}catch(error){if(view.current===editor&&generation.current===epoch)setNotice(error.message,{tone:'error',recovery:'open'});}}
 function downloadFileBytes({bytes,fileName,mime='application/json'}){const url=URL.createObjectURL(new Blob([bytes],{type:mime}));const a=window.document.createElement('a');a.href=url;a.download=fileName;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}

 function download(){try{const bytes=encodeDocumentFile({document:documentFromState(view.current.state),assets:assetsRef.current});const url=URL.createObjectURL(new Blob([bytes],{type:'application/json'}));const a=window.document.createElement('a');a.href=url;a.download=(document.title||'새 매뉴얼').replace(/[\\/:*?"<>|]/g,'-').slice(0,80)+'.manual.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);showFeedback('.manual.json 파일 내보내기를 요청했습니다.');}catch(error){setNotice(error.message,{tone:'error',recovery:'download'});}}
 function captureImageRequest(targetId=null){return captureManualImageRequest({generation:generation.current,documentId:view.current.state.doc.attrs.meta.id,targetId,insertionAnchor:selectionIds(view.current.state)[0]});}
 function currentImageRequest(request){return !!view.current&&isManualImageRequestCurrent(request,{generation:generation.current,documentId:view.current.state.doc.attrs.meta.id});}
 function pickImage(id=null,{selectAfterLoad=false}={}){if(disabled||replacing.current||replacementSaving.current||view.current?.composing)return;const request=Object.freeze({...captureImageRequest(id),selectAfterLoad});imageTarget.current=request;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(currentImageRequest(request))imageInput.current?.click();}));}
 async function addImage(file,request=captureImageRequest()){
  if(!currentImageRequest(request)){setNotice('문서가 바뀌어 이미지 추가를 취소했습니다.');return;}
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024){setNotice('20MB 이하의 PNG, JPEG, WebP 이미지를 선택하세요.',{tone:'error'});return;}
  const {targetId:target,insertionAnchor}=request;
  try{
   const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('이미지를 읽지 못했습니다.'));reader.readAsDataURL(file);});
   const image=new Image();image.src=data;await image.decode();
   if(!currentImageRequest(request)){setNotice('문서가 바뀌어 이미지 추가를 취소했습니다.');return;}
   const currentIndex=objects(getManualEditingDocument(view.current.state));
   if(target&&!currentIndex.has(target)){setNotice('이미지 대상이 삭제되어 교체하지 않았습니다.');return;}
   if(!target&&insertionAnchor&&!currentIndex.has(insertionAnchor)){setNotice('삽입 위치가 삭제되어 이미지 추가를 취소했습니다.');return;}
   if(!target&&insertionAnchor)command(selectManualObject(insertionAnchor,{text:true}));
   const key=`assets/${crypto.randomUUID()}.${file.type==='image/jpeg'?'jpg':file.type.split('/')[1]}`;
   const before=assetsRef.current,next={...before,[key]:data};assetsRef.current=next;setAssets(next);
   const inserted=command(target?updateManualObject(target,{asset:key},{remove:['crop']}):insertManualBlock('figure',{asset:key,alt:'',widthPreset:'full'}));
   if(!inserted){assetsRef.current=before;setAssets(before);}else{
    const figureId=target||selectionIds(view.current.state).find(id=>findManualObject(view.current.state,id)?.node.type.name==='figure');
    if((!target||request.selectAfterLoad)&&figureId)command(selectManualObject(figureId,{text:false}));
    setInspectorTargetId(figureId);showFeedback('이미지를 넣었습니다.');
   }
  }catch(error){setNotice(error.message,{tone:'error'});}
 }
 function requestPrint(){if(disabled||replacementSaving.current||view.current.composing||printing.current)return;printing.current=true;setPrintRequested(true);setNotice('초안 인쇄를 확인하고 있습니다.');}
 printRef.current=requestPrint;
 const finishPrintCheck=useCallback(issues=>{
  if(issues===null)return;
  if(issues.length){printing.current=false;setPrintRequested(false);setModal({kind:'printIssues',issues});setNotice('인쇄 전에 확인할 항목이 있습니다.',{tone:'error',recovery:'print'});return;}
  requestAnimationFrame(()=>{try{window.print();showFeedback('브라우저 인쇄를 열었습니다.');}catch(error){setNotice(error.message,{tone:'error',recovery:'print'});}finally{printing.current=false;setPrintRequested(false);}});
 },[]);
 function navigatePage(id){const title=mount.current.querySelector(`[data-manual-id="${CSS.escape(id)}"] [data-manual-derived-title]`),body=title?.parentElement.querySelector(':scope > [data-manual-id]:not([data-manual-id=""])');locate(body?.dataset.manualId||id);if(window.innerWidth<=760)setOutline(false);}
 function locate(id){if(id===document.id){titleInput.current.focus();return;}command(selectManualObject(id,{text:true}));queueMicrotask(()=>requestAnimationFrame(()=>{const found=findManualObject(view.current.state,id);if(found)view.current.nodeDOM(found.pos)?.scrollIntoView({block:['page','cover'].includes(found.node.type.name)?'start':'nearest'});}));}
 function locatePrintIssue(id){
  const editor=view.current;if(!editor||modal?.kind!=='printIssues')return;
  const isTitle=id===document.id,title=isTitle?titleInput.current:null;if(isTitle&&!title)return;
  if(!isTitle&&!command(selectManualObject(id,{text:true}),{focus:false}))return;
  const epoch=generation.current,revision=editor.state.doc,selection=editor.state.selection;
  const current=()=>view.current===editor&&generation.current===epoch&&editor.state.doc===revision&&editor.state.selection===selection&&uiApi.current?.deferredFocusEnabled(editor)===true;
  // Issue navigation owns its target; closing the dialog must not queue a
  // competing generic editor restoration while the title input is inert.
  setModal(null);
  queueMicrotask(()=>requestAnimationFrame(()=>{
   if(!current())return;
   if(title){if(title===titleInput.current&&title.isConnected&&!title.disabled)title.focus();return;}
   editor.focus();
   if(!current())return;
   const found=findManualObject(editor.state,id);if(found)editor.nodeDOM(found.pos)?.scrollIntoView({block:['page','cover'].includes(found.node.type.name)?'start':'nearest'});
  }));
 }
 function marginBlocks(){return [...mount.current.querySelectorAll('[data-manual-node="page"] > .lds-manual-content > [data-manual-id], [data-manual-node="cover"] > .manual-v2-cover-content > [data-manual-id], [data-manual-node="coverSectionFrame"] > [data-manual-id], [data-manual-node="coverBody"] > [data-manual-id]')].filter(element=>element.dataset.manualId&&!['coverSectionFrame','coverBody'].includes(element.dataset.manualNode)&&element.getBoundingClientRect().height>0);}
 function marginBlockAt(y){return marginBlocks().sort((a,b)=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return Math.max(ar.top-y,y-ar.bottom,0)-Math.max(br.top-y,y-br.bottom,0);})[0];}
 function beginMarginSelection(event){
  // The fallback gutter selector follows the marquee's primary mouse policy.
  if(event.defaultPrevented||event.isPrimary===false||event.pointerType&&event.pointerType!=='mouse')return;
  const editor=view.current;
  if(!editor||disabled||replacementBusy||modal||replacing.current||replacementSaving.current||editor.composing||!editor.editable||editor.state.selection.manualTableCellSelection||figureResizeSession.current||ownOutlineSelectSession.current||tableUISession.current||tableResizeSession.current||dragController.current?.isDragging()||outlineDragController.current?.isDragging())return;
  if(editor&&marqueeController.current?.begin(event)){marqueeBaseline.current={editor,doc:editor.state.doc,selection:editor.state.selection,generation:generation.current};event.preventDefault();return;}
  if(event.button!==0||event.shiftKey||event.ctrlKey||event.metaKey||event.altKey||disabled||view.current.composing)return;
  const pageDOM=event.target.closest?.('[data-manual-node="page"],[data-manual-node="cover"]');if(!pageDOM)return;
  const content=pageDOM.querySelector(':scope > .lds-manual-content')||pageDOM.lastElementChild;
  const coverBackground=pageDOM.dataset.manualNode==='cover'&&['coverBody','coverSectionFrame'].includes(event.target.dataset?.manualNode)&&content.contains(event.target);
  if(event.target!==pageDOM&&event.target!==content&&!coverBackground)return;
  const pageBounds=pageDOM.getBoundingClientRect(),bounds=content.getBoundingClientRect();
  if(event.clientX<pageBounds.left||event.clientX>=bounds.left||event.clientY<bounds.top||event.clientY>bounds.bottom)return;
  const target=marginBlockAt(event.clientY);if(!target||!pageDOM.contains(target))return;
  event.preventDefault();marginDrag.current={id:event.pointerId,anchor:target.dataset.manualId,start:event.clientY,revision:view.current.state.doc};event.currentTarget.setPointerCapture(event.pointerId);
 }
 function extendMarginSelection(event){const drag=marginDrag.current;if(!drag||drag.id!==event.pointerId)return;if(drag.revision!==view.current.state.doc){marginDrag.current=null;return;}if(Math.abs(event.clientY-drag.start)<5)return;const target=marginBlockAt(event.clientY);if(target){event.preventDefault();command(selectManualBlocks(drag.anchor,target.dataset.manualId),{focus:false});}}
 function endMarginSelection(event){if(marginDrag.current?.id===event.pointerId){const drag=marginDrag.current;marginDrag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);if(drag.revision===view.current.state.doc)view.current.focus();pagination.current?.request();}}
 function continueWriting(event){
  if(marqueeController.current?.isDragging()){event.preventDefault();event.stopPropagation();return;}
  if(event.button!==0||event.shiftKey||event.ctrlKey||event.metaKey||event.altKey||disabled||replacementBusy||modal||replacing.current||ownOutlineSelectSession.current||tableUISession.current||tableResizeSession.current||view.current?.composing||!view.current?.editable)return;
  const pageDOM=event.target.closest?.('[data-manual-node="page"],[data-manual-node="cover"]');
  if(!pageDOM)return;
  const content=pageDOM.querySelector(':scope > .lds-manual-content')||pageDOM.lastElementChild;
  const coverBackground=pageDOM.dataset.manualNode==='cover'&&['coverBody','coverSectionFrame'].includes(event.target.dataset?.manualNode)&&content.contains(event.target);
  if(event.target!==pageDOM&&event.target!==content&&!coverBackground)return;
  const outsideCallout=getManualOutsideCalloutTarget({point:{x:event.clientX,y:event.clientY},page:{id:pageDOM.dataset.manualId,rect:pageDOM.getBoundingClientRect(),contentRect:content.getBoundingClientRect()},target:{isPageBackground:event.target===pageDOM,isContentBackground:event.target===content},callouts:[...pageDOM.querySelectorAll('[data-manual-node="callout"]')].map(element=>({id:element.dataset.manualId,rect:element.getBoundingClientRect(),parentId:element.parentElement.closest('[data-manual-id]')?.dataset.manualId,visible:getComputedStyle(element).visibility!=='hidden'&&element.getBoundingClientRect().height>0})),blocked:replacementBusy||!!modal||!!dragController.current?.isDragging()||!!marginDrag.current});
  const continueAfter=id=>command((state,dispatch,editor)=>ensureParagraphAfter(id)(state,transaction=>dispatch(transaction.docChanged?closeHistory(transaction):transaction),editor));
  if(outsideCallout){event.preventDefault();event.stopPropagation();continueAfter(outsideCallout);return;}
  const bounds=content.getBoundingClientRect(),last=content.lastElementChild;
  const lastBottom=pageDOM.dataset.manualNode==='cover'?Math.max(bounds.top,...[...content.querySelectorAll('[data-manual-id]')].filter(element=>!['coverBody','coverSectionFrame'].includes(element.dataset.manualNode)&&element.getBoundingClientRect().height>0).map(element=>element.getBoundingClientRect().bottom)):(last?.getBoundingClientRect().bottom??bounds.top);
  if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY>=bounds.bottom||event.clientY<lastBottom)return;
  // Only the blank area inside this page continues its own top-level content.
  // Prevent PM's nearest-text fallback from placing the caret inside a callout.
  event.preventDefault();event.stopPropagation();continueAfter(pageDOM.dataset.manualId);
 }
 function closeBlockMenu({restore=true}={}){slashCompositionChoice.current?.cancel();if(menu?.mode==='slash')dismissedSlash.current=JSON.stringify(menu.trigger);const returnFocus=menu?.origin==='outline'?menu.returnFocus:null;setMenu(null);if(restore)scheduleFocus(returnFocus);}
 useEffect(()=>{
  if(menu?.origin!=='outline')return;
  const trigger=menu.returnFocus,nav=trigger?.closest('.manual-v2-outline');
  // Layout dismissal never restores focus: that would scroll a departed row back into view.
  const dismiss=()=>setMenu(current=>current?.origin==='outline'&&current.returnFocus===trigger?null:current);
  if(!outline||!trigger?.isConnected||!nav){dismiss();return;}
  const checkTrigger=()=>{if(!trigger.isConnected||!nav.contains(trigger))dismiss();};
  nav.addEventListener('scroll',dismiss);
  window.addEventListener('resize',dismiss);window.visualViewport?.addEventListener('resize',dismiss);
  const observer=new MutationObserver(checkTrigger);observer.observe(nav,{childList:true,subtree:true});
  return()=>{nav.removeEventListener('scroll',dismiss);window.removeEventListener('resize',dismiss);window.visualViewport?.removeEventListener('resize',dismiss);observer.disconnect();};
 },[menu,outline]);
 function refreshSlashAnchor(){
  const editor=view.current,current=menuRef.current;
  if(!editor||current?.mode!=='slash'||disabled||replacementBusy||editor.composing)return;
  const trigger=getManualSlashTrigger(editor.state);
  if(!trigger){closeBlockMenu({restore:false});return;}
  if(JSON.stringify(trigger)!==JSON.stringify(current.trigger))return;
  const position=editor.coordsAtPos(trigger.to),clip=main.current&&getManualWritingBounds(getBlockMenuViewport(window),main.current.getBoundingClientRect());
  if(!clip||position.bottom<=clip.top||position.top>=clip.bottom||position.left<clip.left||position.left>clip.right){closeBlockMenu({restore:false});return;}
  const anchor={left:position.left,top:position.top,bottom:position.bottom};
  setMenu(previous=>previous?.mode==='slash'&&JSON.stringify(previous.trigger)===JSON.stringify(trigger)&&(previous.anchor.left!==anchor.left||previous.anchor.top!==anchor.top||previous.anchor.bottom!==anchor.bottom)?{...previous,anchor}:previous);
 }
 function openBlockMenu(path,anchor,mode='block'){
  const editor=view.current;
  if(!editor||disabled||replacementBusy||modal||replacing.current||ownOutlineSelectSession.current||tableUISession.current||tableResizeSession.current||editor.composing)return;
  if(editor.state.selection.manualTableCellSelection)return;
  const targetId=dragPaths.current.get(path),target=targetId&&objects(getManualEditingDocument(editor.state)).get(targetId);
  if(!target||['page','cover'].includes(target.type))return;
  const selection=editor.state.selection;
  if(mode==='block'&&!(selection.manualBlockSelection&&selection.ids.includes(targetId))&&!command(selectManualObject(targetId,{text:false}),{focus:false}))return;
  setMenu({mode,targetId,editor,revision:editor.state.doc,generation:generation.current,selection:editor.state.selection,anchor,query:'',activeId:null});setBubble(null);
 }
 function openOutlinePageMenu(event,targetId,payload){
  const editor=view.current,context=payload?.context||getOutlineSelectionContext();
  if(!canSelectOutline()||ownOutlineSelectSession.current||!outlineContextCurrent(context))return;
  const groups=getManualPageGroups(editor.state.doc),group=groups.find(group=>group.pageIds.includes(targetId));if(!group)return;
  const sourceIds=payload?.sourceIds?normalizeOutlinePageSelection(groups,{selectedIds:payload.sourceIds}).selectedIds:outlineSelectionSources(groups,currentOutlineSelection(),targetId);
  if(!sourceIds.length||!sourceIds.includes(group.id))return;
  const trigger=event.currentTarget,rect=trigger.getBoundingClientRect();
  storeOutlineSelection({...currentOutlineSelection(),anchorId:currentOutlineSelection().selectedIds.includes(group.id)?currentOutlineSelection().anchorId:group.id,selectedIds:sourceIds,...context});
  setMenu({mode:'block',origin:'outline',targetId:group.id,outlineSourceIds:Object.freeze([...sourceIds]),returnFocus:trigger,anchor:{left:rect.right,top:rect.top,bottom:rect.bottom},query:'',activeId:null,...context});setBubble(null);
 }
 function menuTargetEnabled(editor){return !!editor&&editor===view.current&&ready&&!busy&&!printRequested&&!replacementBusy&&!modal&&!replacing.current&&!replacementSaving.current&&!printing.current&&editor.editable&&!editor.composing;}
 function openCurrentBlockMenu(){
  const editor=view.current;
  if(!editor||disabled||replacementBusy||modal||replacing.current||ownOutlineSelectSession.current||tableUISession.current||tableResizeSession.current||editor.composing)return false;
  if(editor.state.selection.manualTableCellSelection)return false;
  const selection=editor.state.selection,currentIndex=objects(getManualEditingDocument(editor.state));
  const targets=selection.manualBlockSelection?[selection.headId,...selection.ids]:selectionIds(editor.state);
  const target=targets.map(id=>currentIndex.get(id)).find(item=>item&&names[item.type]&&!['document','cell'].includes(item.type));
  if(!target)return false;
  const found=findManualObject(editor.state,target.value.id),element=found&&editor.nodeDOM(found.pos);
  const rect=selection.node||selection.manualBlockSelection?element?.getBoundingClientRect():editor.coordsAtPos(selection.from);
  if(!rect)return false;
  const bounds=getManualWritingBounds(getBlockMenuViewport(window),main.current.getBoundingClientRect());
  if(!bounds)return false;
  const top=Math.max(bounds.top,Math.min(rect.top,bounds.bottom));
  const anchor={left:Math.max(bounds.left,Math.min(rect.left,bounds.right)),top,bottom:Math.max(top,Math.min(rect.bottom,bounds.bottom))};
  if(window.innerWidth<=760){setOutline(false);setInspector(false);}
  setMenu({mode:'block',keyboard:true,targetId:target.value.id,editor,revision:editor.state.doc,generation:generation.current,selection:editor.state.selection,anchor,query:'',activeId:null});setBubble(null);return true;
 }
 function pageStructuralAction(targetId,id){
  const action=({duplicate:duplicateManualObject(targetId),delete:deleteManualObject(targetId),moveUp:moveManualObject(targetId,{direction:'up'}),moveDown:moveManualObject(targetId,{direction:'down'})})[id];
  if(!action)return null;
  return (state,dispatch,editor)=>{
   // Match pagination's pagesOf: only consecutive recognized tails join the current root.
   // Until logical-page commands exist, physical edits must not break a flow group.
   const grouped=new Set();let rootId=null;
   state.doc.forEach(node=>{
    if(node.type.name!=='page')return;
    const marker=manualPaginationMarker(node.attrs.meta.extensions,'page');
    if(rootId&&marker?.rootPageId===rootId){grouped.add(rootId);grouped.add(node.attrs.id);}
    else rootId=node.attrs.id;
   });
   if(grouped.has(targetId))return false;
   return action(state,dispatch,editor);
  };
 }
 const coverRoles={coverLogo:'logo',coverTitle:'title',coverMetadata:'metadata',coverDivider:'divider',coverSectionTitle:'sectionTitle'};
 function coverGestureBlocked(){return disabled||replacementBusy||replacing.current||replacementSaving.current||printing.current||!!figureResizeSession.current||!!tableUISession.current||!!tableResizeSession.current||!!ownOutlineSelectSession.current||!!marginDrag.current||!!dragController.current?.isDragging()||!!outlineDragController.current?.isDragging()||!!marqueeController.current?.isDragging();}
 function coverElementState(role,captured=menu,logoVariantId){
  const editor=view.current;
  if(!captured||!editor||captured.editor!==editor||captured.generation!==generation.current||captured.revision!==editor.state.doc||!captured.selection?.eq(editor.state.selection)||coverGestureBlocked()||editor.composing||!editor.editable)return {enabled:false,reason:'stale'};
  return getManualCoverInsertCommandState(editor.state,{role,targetId:captured.targetId,revision:captured.revision,...(captured.mode==='slash'?{trigger:captured.trigger}:{}),...(logoVariantId!==undefined?{logoVariantId}:{})},editor);
 }
 function coverElementAction(role,captured=menu,logoVariantId){return (state,dispatch,editor)=>{
  if(state!==view.current?.state||!coverElementState(role,captured,logoVariantId).enabled)return false;
  return executeManualCoverInsert(role,{targetId:captured.targetId,revision:captured.revision,...(captured.mode==='slash'?{trigger:captured.trigger}:{}),...(logoVariantId!==undefined?{logoVariantId}:{})})(state,dispatch,editor||view.current);
 };}
 function logoMenuState(captured=menu){
  const status=coverElementState('logo',captured);
  const editor=view.current;
  let surface;
  for(let depth=editor?.state.selection.$from.depth||0;depth>0;depth--){const node=editor.state.selection.$from.node(depth);if(['page','cover'].includes(node.type.name)){surface=node;break;}}
  if(surface?.type.name!=='page'&&!(surface?.type.name==='cover'&&status.reason==='role-exists'))return status;
  return {...status,convertsPage:false,generalLogo:true,canChoose:!!captured&&!coverGestureBlocked()&&editor?.editable&&!editor.composing&&captured.editor===editor&&captured.revision===editor.state.doc&&captured.generation===generation.current&&captured.selection?.eq(editor.state.selection)&&can(executeManualBlockCommand('figure',{targetId:captured.targetId,...(captured.mode==='slash'?{trigger:captured.trigger}:{}),mode:'insert'}))};
 }
 function openLogoPicker(captured=menu,replaceId=null){
  const editor=view.current,found=replaceId&&editor&&findManualObject(editor.state,replaceId);
  const logoState=logoMenuState(captured);
  if(coverGestureBlocked()||!editor?.editable||editor.composing||!captured||captured.editor!==editor||captured.revision!==editor.state.doc||captured.generation!==generation.current||!captured.selection?.eq(editor.state.selection)||(!replaceId&&!logoState.canChoose)||replaceId&&(!found||found.node.type.name!=='figure'||!getManualBrandAssetByKey(found.node.attrs.meta.asset)))return;
  setModal({kind:'brandLogo',request:{captured,replaceId,generalLogo:!replaceId&&logoState.generalLogo,editor,revision:editor.state.doc,generation:generation.current,selection:editor.state.selection},value:found?.node.attrs.meta.asset});setMenu(null);setBubble(null);
 }
 function chooseLogo(variantId){
  const request=modal?.request,editor=view.current,brand=getManualBrandAsset(variantId);
  if(modal?.kind!=='brandLogo'||!request||!brand||request.editor!==editor||request.generation!==generation.current||request.revision!==editor.state.doc||!request.selection.eq(editor.state.selection)||coverGestureBlocked()||editor.composing||!editor.editable){setNotice('선택 위치가 바뀌었습니다. 로고 선택창을 다시 열어 주세요.');return false;}
  const action=request.replaceId?updateManualObject(request.replaceId,{asset:brand.asset,alt:brand.alt,extensions:withManualFigureWidth(findManualObject(editor.state,request.replaceId)?.node.attrs.meta,brand.defaultWidthPx).extensions}):request.generalLogo?executeManualBlockCommand('figure',{mode:'insert',targetId:request.captured.targetId,...(request.captured.mode==='slash'?{trigger:request.captured.trigger}:{}),attrs:{asset:brand.asset,alt:brand.alt,widthPreset:'full',extensions:withManualFigureWidth({},brand.defaultWidthPx).extensions}}):coverElementAction('logo',request.captured,variantId);
  if(!command(action,{focus:false}))return false;
  setModal(null);dismissedSlash.current=null;scheduleFocus();return true;
 }
 function coverInsertAction(){
  const captured=menu;
  return (state,dispatch,editor)=>{
   const live=view.current;
   if(!captured||!['insert','slash'].includes(captured.mode)||captured.editor!==live||captured.revision!==state.doc||captured.generation!==generation.current||state!==live?.state||!captured.selection?.eq(state.selection)||!live?.editable||live.composing||coverGestureBlocked()||modal)return false;
   return configureManualCoverTemplate({targetId:captured.targetId,revision:captured.revision,...(captured.mode==='slash'?{trigger:captured.trigger}:{})})(state,dispatch,editor||live);
  };
 }
 function pageTitleMenuState(captured=menu,state=view.current?.state,editor=view.current){
  if(!captured||!state||captured.editor!==editor||editor!==view.current||captured.generation!==generation.current)return {enabled:false,reason:'stale'};
  return getManualPageTitleCommandState(state,{mode:['slash','insert'].includes(captured.mode)?'insert':'convert',targetId:captured.targetId,revision:captured.revision,readOnly:disabled||replacementBusy||!editor.editable,cancelled:!!modal||replacing.current||replacementSaving.current||printing.current},editor);
 }
 function pageTitleAction(){
  const captured=menu;
  return (state,dispatch,editor)=>{
   if(!pageTitleMenuState(captured,state,editor||view.current).enabled)return false;
   return executeManualBlockCommand('pageTitle',{mode:['slash','insert'].includes(captured.mode)?'insert':'convert',targetId:captured.targetId,revision:captured.revision,...(captured.mode==='slash'?{trigger:captured.trigger}:{})})(state,dispatch,editor||view.current);
  };
 }
 function blockAction(id){
  if(coverRoles[id])return coverElementAction(coverRoles[id]);
  if(id==='cover')return coverInsertAction();
  if(id==='pageTitle')return pageTitleAction();
  if(menu?.origin==='outline')return outlinePageAction(id);
  if(menuPage)return pageStructuralAction(menu.targetId,id);
  if(!blockMenuSelection(view.current?.state,menu))return null;return ({duplicate:duplicateSelectedManualBlocks,delete:deleteSelectedManualBlocks,moveUp:moveSelectedManualBlocks({direction:'up'}),moveDown:moveSelectedManualBlocks({direction:'down'})})[id]||null;}
 function dividerStyleMenuAction(variant,captured=menu){return (state,dispatch,editor)=>{
  const live=view.current;
  if(!captured||!['block','dividerStyle'].includes(captured.mode)||captured!==menu||captured.editor!==live||editor&&editor!==live||captured.generation!==generation.current||captured.revision!==state.doc||state!==live?.state||!captured.selection?.eq(state.selection)||!ready||disabled||busy||printRequested||replacementBusy||modal||coverGestureBlocked()||!live.editable||live.composing)return false;
  const found=findManualObject(state,captured.targetId),selection=state.selection;
  if(found?.node.type.name!=='divider'||!(selection instanceof NodeSelection&&selection.from===found.pos||selection.manualBlockSelection&&!selection.manualIncompletePaginationSelection&&selection.ids.length===1&&selection.ids[0]===captured.targetId))return false;
  if(variant===undefined)return true;
  if(captured.mode!=='dividerStyle')return false;
  const role=getManualCoverProjection(found.node.attrs.meta?.extensions);
  if(resolveManualDividerStyle(found.node.attrs.meta?.extensions,{cover:role?.role==='divider'&&role.blockId===captured.targetId})===variant)return true;
  return setManualDividerStyle({dividerId:captured.targetId,variant,revision:captured.revision})(state,dispatch,live);
 };}
 function chooseBlock(item){
  if(disabled||replacementBusy||modal||replacing.current||view.current.composing)return;
  if(view.current.state.selection.manualTableCellSelection&&!menuPage)return;
  if(item.id==='coverLogo'){openLogoPicker();return;}
  if(item.id==='changeLogo'){openLogoPicker(menu,menu.targetId);return;}
  if(item.id==='dividerStyle'){if(dividerStyleMenuAction()(view.current.state)){setMenu({...menu,mode:'dividerStyle',query:'',activeId:null});}return;}
  if(item.dividerVariant){if(command(dividerStyleMenuAction(item.dividerVariant))){setMenu(null);setBubble(null);}return;}
  if(item.id==='properties'){
   const target=objects(getManualEditingDocument(view.current.state)).get(menu?.targetId);
   if(menu?.mode!=='block'||blockMenuSelection(view.current.state,menu)?.ids.length>1||!propertyTypes.has(target?.type))return;
   setInspectorTargetId(target.value.id);setInspector(true);setMenu(null);setBubble(null);if(window.innerWidth<=760)setOutline(false);return;
  }
  if(item.id==='turnInto'){setMenu({...menu,mode:'turnInto',query:'',activeId:null});return;}
  const options={...(menu?.mode==='slash'?{trigger:menu.trigger}:menu?.targetId?{targetId:menu.targetId}:{}),attrs:item.attrs||{},...(menu?.mode==='insert'?{mode:'insert'}:{})};
  const action=blockAction(item.id)||executeManualBlockCommand(item.id,options);
  if(command(action)){setMenu(null);dismissedSlash.current=null;
   if(item.id==='cover'){const editor=view.current,ownerId=addedPageOwner(editor);if(ownerId)revealAddedPage(editor,generation.current,ownerId);}
   if(item.needsInput==='image'){const selectedFigure=selectionIds(view.current.state).find(id=>findManualObject(view.current.state,id)?.node.type.name==='figure');pickImage(selectedFigure,{selectAfterLoad:true});}
  }
 }
 function slashCompositionChoiceEnabled(editor){return editor===view.current&&ready&&!busy&&!printRequested&&!replacementBusy&&!modal&&!coverGestureBlocked()&&editor.editable&&!!editor.dom?.isConnected;}
 function slashCompositionItemEnabled(item){
  const editor=view.current,captured=menu;
  if(!editor?.composing||!slashCompositionChoiceEnabled(editor)||captured?.mode!=='slash'||captured.editor!==editor||captured.generation!==generation.current||captured.revision!==editor.state.doc||!captured.selection?.eq(editor.state.selection))return false;
  const options={targetId:captured.targetId,revision:captured.revision,trigger:captured.trigger};
  if(item.id==='cover')return configureManualCoverTemplate(options)(editor.state);
  if(coverRoles[item.id]){const capability=getManualCoverInsertCommandState(editor.state,{...options,role:coverRoles[item.id]});if(item.id!=='coverLogo')return capability.enabled;return capability.canChoose||executeManualBlockCommand('figure',{...options,mode:'insert'})(editor.state);}
  if(item.id==='pageTitle')return getManualPageTitleCommandState(editor.state,{...options,mode:'insert'}).enabled;
  return !item.disabled;
 }
 function completeSlashCompositionChoice(request){
  const editor=view.current;if(!request||request.editor!==editor||request.generation!==generation.current||request.doc!==editor.state.doc||!request.selection.eq(editor.state.selection)||editor.composing||!slashCompositionChoiceEnabled(editor))return;
  const position=editor.coordsAtPos(request.trigger.to);setMenu({mode:'slash',editor,revision:request.doc,generation:request.generation,selection:request.selection,trigger:request.trigger,anchor:{left:position.left,top:position.top,bottom:position.bottom},query:request.trigger.query,activeId:request.itemId,pendingCompositionChoice:request});
 }
 const compactMenu=['block','dividerStyle'].includes(menu?.mode);
 const pageTitleState=menu?pageTitleMenuState():null;
 const pageTitleDescription={'title-exists':'페이지 제목이 이미 있습니다.','current-title':'이미 페이지 제목입니다.','derived-title':'자동으로 이어진 제목은 변경할 수 없습니다.','fragmented-text':'나뉜 본문은 페이지 제목으로 바꿀 수 없습니다.','no-page':'일반 페이지에서 사용할 수 있습니다.','stale':'메뉴를 다시 열어 주세요.','read-only':'읽기 전용 문서입니다.','composing':'입력을 마친 뒤 사용할 수 있습니다.'}[pageTitleState?.reason]||'하나의 본문이나 제목을 선택해 주세요.';
 const baseMenuItems=menu?getBlockMenuItems(compactMenu?'':menu.query,{mode:menu.mode==='insert'?'slash':menu.mode,isEnabled:item=>item.id==='coverLogo'?logoMenuState().canChoose:coverRoles[item.id]?coverElementState(coverRoles[item.id]).enabled:item.id==='pageTitle'?pageTitleState.enabled:item.id==='turnInto'?!menuMulti:blockAction(item.id)?can(blockAction(item.id)):can(executeManualBlockCommand(item.id,{...(menu.mode==='slash'?{trigger:menu.trigger}:{targetId:menu.targetId}),attrs:item.attrs||{},...(menu.mode==='insert'?{mode:'insert'}:{})}))}).filter(item=>item.id!=='page'&&(!compactMenu||!['moveUp','moveDown'].includes(item.id))&&(!menuPage||item.id!=='turnInto')).map(item=>coverRoles[item.id]&&item.disabled?{...item,description:coverInsertReasonDescription(coverElementState(coverRoles[item.id]).reason)}:coverRoles[item.id]&&item.id!=='coverLogo'&&coverElementState(coverRoles[item.id]).convertsPage?{...item,description:item.id==='coverLogo'?'로고를 선택하면 현재 페이지를 표지로 바꾸고 로고를 추가합니다.':`현재 페이지를 표지로 바꾸고 ${{coverTitle:'제목을',coverMetadata:'문서 정보를',coverDivider:'구분선을',coverSectionTitle:'섹션 제목을'}[item.id]} 추가합니다.`}:item.id==='pageTitle'&&!pageTitleState.enabled?{...item,description:pageTitleDescription}:menu?.origin==='outline'?{...item,group:menu.outlineSourceIds.length>1?`${menu.outlineSourceIds.length}개 페이지 작업`:`${menuTargetName} 작업`,...(item.disabled?{description:outlinePageActionReason(item.id)}:{})}:menuPage?{...item,group:`${menuTargetName} 작업`}:item.id==='turnInto'?{...item,label:'변경',icon:'text-format',submenu:true,hasPopup:'dialog'}:item):[];
 const brandMenuItems=menu?.mode==='block'&&!menuMulti&&menuTarget?.type==='figure'&&getManualBrandAssetByKey(menuTarget.value.asset)?[...baseMenuItems,{id:'changeLogo',type:'action',label:'로고 변경',icon:'image',group:'블록 작업',disabled:coverGestureBlocked()}]:baseMenuItems;
 const dividerMenuItems=['default','emphasis'].map(variant=>({id:`divider-${variant}`,dividerVariant:variant,type:'action',label:variant==='default'?'기본':'강조',icon:'minus',group:'선 스타일',checked:menuTarget?.type==='divider'&&resolveManualDividerStyle(menuTarget.value.extensions,{cover:getManualCoverProjection(menuTarget.value.extensions)?.role==='divider'&&getManualCoverProjection(menuTarget.value.extensions)?.blockId===menu.targetId})===variant,disabled:!dividerStyleMenuAction()(view.current?.state)}));
 const rawMenuItems=menu?.mode==='dividerStyle'?dividerMenuItems:menu?.mode==='block'&&!menuMulti&&menuTarget?.type==='divider'?[...brandMenuItems,{id:'dividerStyle',type:'action',label:'선 스타일',icon:'minus',group:'블록 작업',submenu:true,hasPopup:'menu',disabled:!dividerStyleMenuAction()(view.current?.state)}]:menu?.mode==='block'&&!menuMulti&&propertyTypes.has(menuTarget?.type)?[...brandMenuItems,{id:'properties',type:'action',label:'속성',icon:'setting',group:'블록 작업',disabled:disabled||replacementBusy}]:brandMenuItems;
 const menuItems=rawMenuItems.map(item=>slashCompositionItemEnabled(item)?{...item,disabled:false,compositionChoice:true,description:'클릭하면 입력을 확정한 뒤 실행합니다.'}:item);
 useEffect(()=>{slashCompositionChoice.current?.validate();},[menu,state,disabled,replacementBusy,modal]);
 useEffect(()=>{
  const request=menu?.pendingCompositionChoice;if(!request)return;
  const editor=view.current,item=menuItems.find(item=>item.id===request.itemId);
  if(request.editor===editor&&request.generation===generation.current&&request.doc===editor?.state.doc&&request.selection.eq(editor.state.selection)&&!editor.composing&&slashCompositionChoiceEnabled(editor)&&request.button.isConnected&&request.button.ownerDocument.activeElement===request.button&&item&&!item.disabled)chooseBlock(item);
  else setMenu(current=>current===menu?{...current,pendingCompositionChoice:null}:current);
 },[menu,state]);
 function calloutFocusEnabled(editor){return editor===view.current&&ready&&!busy&&!printRequested&&!replacementBusy&&!replacing.current&&!replacementSaving.current&&!printing.current&&editor.editable&&!editor.composing;}
 function editInspectedCalloutTitle(targetId){
  const editor=view.current;
  if(targetId!==inspectorTargetId||!editor||uiApi.current?.calloutFocusEnabled(editor)!==true||objects(getManualEditingDocument(editor.state)).get(targetId)?.type!=='callout')return false;
  return command(editManualCalloutTitle(targetId));
 }
 function calloutTitleActionsEnabled(editor){return !!editor&&editor===view.current&&inspector&&ready&&!disabled&&!busy&&!printRequested&&!replacementBusy&&!modal&&!menu&&!replacing.current&&!replacementSaving.current&&!printing.current&&editor.editable&&!editor.composing&&!dragController.current?.isDragging()&&!outlineDragController.current?.isDragging()&&!marqueeController.current?.isDragging()&&!figureResizeSession.current&&!tableUISession.current&&!tableResizeSession.current&&!ownOutlineSelectSession.current&&!marginDrag.current;}
 function currentCalloutTitleContext(context){
  const editor=view.current;
  if(!context||context.editor!==editor||context.revision!==editor?.state.doc||context.generation!==generation.current||context.calloutId!==uiApi.current?.inspectorTargetId||uiApi.current?.calloutTitleActionsEnabled(editor)!==true)return null;
  const found=findManualObject(editor.state,context.calloutId);return found?.node.type.name==='callout'&&hasVisibleManualCalloutTitle(found.node.firstChild)?found:null;
 }
 function inspectedCalloutTitleActions(){
  const editor=view.current;if(!editor||inspected?.type!=='callout'||inspectedId!==inspectorTargetId)return undefined;
  const context={editor,revision:editor.state.doc,generation:generation.current,calloutId:inspectedId};
  return {disabled:!currentCalloutTitleContext(context),onMoveToBody:targetId=>{
   if(targetId!==context.calloutId||!currentCalloutTitleContext(context))return false;
   return command(moveManualCalloutTitleToBody({id:context.calloutId,revision:context.revision}));
  }};
 }
 function dividerStyleEnabled(editor){return !!editor&&editor===view.current&&(inspector&&!menu||menu?.mode==='dividerStyle'&&menu.editor===editor&&menu.revision===editor.state.doc&&menu.generation===generation.current&&menu.selection?.eq(editor.state.selection))&&ready&&!busy&&!printRequested&&!replacementBusy&&!modal&&!replacing.current&&!replacementSaving.current&&!printing.current&&editor.editable&&!editor.composing&&!dragController.current?.isDragging()&&!outlineDragController.current?.isDragging()&&!marqueeController.current?.isDragging()&&!figureResizeSession.current&&!tableUISession.current&&!tableResizeSession.current&&!ownOutlineSelectSession.current&&!marginDrag.current;}
 function currentDividerStyleContext(context){
  const editor=view.current;
  if(!context||context.editor!==editor||context.revision!==editor?.state.doc||context.generation!==generation.current||context.dividerId!==uiApi.current?.inspectorTargetId||uiApi.current?.dividerStyleEnabled(editor)!==true||!selectionIds(editor.state).includes(context.dividerId))return null;
  const found=findManualObject(editor.state,context.dividerId);if(found?.node.type.name!=='divider')return null;
  const selection=editor.state.selection,selected=selection instanceof NodeSelection&&selection.from===found.pos||selection.manualBlockSelection&&!selection.manualIncompletePaginationSelection&&selection.ids.length===1&&selection.ids[0]===context.dividerId;
  return selected?found:null;
 }
 function inspectedDividerStyle(){
  const editor=view.current;if(!editor||inspected?.type!=='divider'||inspectedId!==inspectorTargetId)return undefined;
  const context={editor,revision:editor.state.doc,generation:generation.current,dividerId:inspectedId};
  return {disabled:!currentDividerStyleContext(context),onCommit:variant=>{
   if(!currentDividerStyleContext(context))return false;
   return command(setManualDividerStyle({dividerId:context.dividerId,variant,revision:context.revision}),{focus:false});
  }};
 }
 function figureResizeEnabled(editor){return !!editor&&editor===view.current&&ready&&!busy&&!printRequested&&!replacementBusy&&!modal&&!menu&&!replacing.current&&!replacementSaving.current&&!printing.current&&editor.editable&&!editor.composing&&!dragController.current?.isDragging()&&!outlineDragController.current?.isDragging()&&!marqueeController.current?.isDragging()&&!tableUISession.current&&!tableResizeSession.current&&!ownOutlineSelectSession.current&&!marginDrag.current;}
 function currentFigureWidthContext(figureId,context){
  const editor=view.current;
  if(!context||context.editor!==editor||context.revision!==editor?.state.doc||context.generation!==generation.current||context.assets!==assetsRef.current||uiApi.current?.figureResizeEnabled(editor)!==true)return null;
  const found=findManualObject(editor.state,figureId);
  return found?.node.type.name==='figure'&&found.node.attrs.meta.asset===context.asset?found:null;
 }
 function startFigureResizeSession(){
  const editor=view.current,node=editor?.state.selection.node;
  if(uiApi.current?.figureResizeEnabled(editor)!==true||node?.type.name!=='figure')return;
  const context={editor,revision:editor.state.doc,generation:generation.current,asset:node.attrs.meta.asset,assets:assetsRef.current};
  if(currentFigureWidthContext(node.attrs.id,context))figureResizeSession.current={figureId:node.attrs.id,context,didCommit:false,resultDoc:null};
 }
 function commitFigureResize({figureId,widthPx,context}){
  const session=figureResizeSession.current,editor=view.current;
  if(!session||session.didCommit||session.figureId!==figureId||session.context.editor!==context?.editor||session.context.revision!==context?.revision||session.context.generation!==context?.generation||session.context.assets!==context?.assets||editor?.state.selection.node?.attrs.id!==figureId||!currentFigureWidthContext(figureId,context))return false;
  const found=currentFigureWidthContext(figureId,context),geometry=found&&figureWidthGeometry(found);
  if(!geometry?.fits){setNotice('이미지의 최소 너비를 확보할 공간이 없습니다. 페이지 배치를 조정해 주세요.');return false;}
  if(widthPx<geometry.minWidthPx){setNotice('이미지 최소 폭보다 작은 값은 사용할 수 없습니다.');return false;}
  session.didCommit=true;const ok=command(setManualFigureWidth({figureId,widthPx,revision:context.revision,minWidthPx:geometry.minWidthPx,maxWidthPx:geometry.maxWidthPx}));
  if(ok&&view.current===editor&&generation.current===context.generation)session.resultDoc=editor.state.doc;
  return ok;
 }
 function endFigureResizeSession(){
  const session=figureResizeSession.current;figureResizeSession.current=null;
  if(session&&session.context.editor===view.current&&session.context.generation===generation.current&&session.context.assets===assetsRef.current&&(session.context.revision===view.current.state.doc||session.resultDoc===view.current.state.doc)&&uiApi.current?.paginationEnabled&&uiApi.current?.figureResizeEnabled(view.current))pagination.current?.request();
 }
 function figureWidthGeometry(found){
  const editor=view.current,element=editor.nodeDOM(found.pos),media=element?.firstElementChild?.querySelector('img,svg'),page=element?.closest('[data-manual-node="page"],[data-manual-node="cover"]'),content=page?.querySelector(':scope > .lds-manual-content')||page?.querySelector(':scope > .manual-v2-cover-content'),parent=element?.parentElement;
  if(!element?.isConnected||!media||!parent||!content||!mount.current?.contains(element))return null;
  const rect=media.getBoundingClientRect(),scale=getManualFigureResizeScale(element);
  if(!Number.isFinite(scale)||scale<=0||rect.width<=0||rect.height<=0)return null;
  const bounds=getManualFigureResizeBounds({element,media,content,page,scale,alignment:element.dataset.manualFigureAlignment}),measuredWidthPx=rect.width/scale;
  const limits=getManualFigureResizeLimits({widthPx:measuredWidthPx,heightPx:rect.height/scale,context:{asset:found.node.attrs.meta.asset},...bounds});
  if(!limits||!Number.isFinite(limits.maxWidthPx))return null;
  return {measuredWidthPx,...limits};
 }
 function figureAlignmentEnabled(editor){return inspector&&figureResizeEnabled(editor)&&!figureResizeSession.current;}
 function inspectedFigureAlignment(){
  const editor=view.current,found=editor&&inspected?.type==='figure'&&inspectedId===inspectorTargetId&&findManualObject(editor.state,inspectedId);
  if(!found||found.node.type.name!=='figure')return undefined;
  const context={editor,revision:editor.state.doc,generation:generation.current,asset:found.node.attrs.meta.asset,assets:assetsRef.current},figureId=found.node.attrs.id;
  const current=()=>uiApi.current?.inspectorTargetId===figureId&&uiApi.current?.figureAlignmentEnabled(editor)===true&&currentFigureWidthContext(figureId,context);
  const defaultAlignment=readManualObjectSemanticKind(editor.state,figureId)==='coverLogo'||found.parent?.type.name==='mediaGroup'&&found.node.attrs.meta.widthPreset==='full'?'left':'center';
  return {value:resolveManualFigureAlignment(found.node.attrs.meta.extensions,{defaultAlignment}),disabled:!current(),onCommit:alignment=>{
   if(!current())return false;
   return command(setManualFigureAlignment({figureId,alignment,revision:context.revision}),{focus:false});
  }};
 }
 function inspectedFigureWidth(){
  const editor=view.current,found=editor&&inspected?.type==='figure'&&inspectedId===inspectorTargetId&&findManualObject(editor.state,inspectedId);
  if(!found||found.node.type.name!=='figure')return null;
  const context={editor,revision:editor.state.doc,generation:generation.current,asset:found.node.attrs.meta.asset,assets:assetsRef.current},geometry=figureWidthGeometry(found);
  if(!geometry)return null;
  const {measuredWidthPx,minWidthPx,maxWidthPx,fits}=geometry;
  return {widthPx:readManualFigureLayout(found.node.attrs.meta?.extensions)?.widthPx,measuredWidthPx,minWidthPx,maxWidthPx,disabled:!fits||!currentFigureWidthContext(inspectedId,context)||!!figureResizeSession.current,onCommit:widthPx=>{
   if(uiApi.current?.inspectorTargetId!==found.node.attrs.id||figureResizeSession.current||!currentFigureWidthContext(found.node.attrs.id,context))return false;
   const live=figureWidthGeometry(found);
   if(!live?.fits){setNotice('이미지의 최소 너비를 확보할 공간이 없습니다. 페이지 배치를 조정해 주세요.');return false;}
   if(widthPx<live.minWidthPx){setNotice('이미지 최소 폭보다 작은 값은 사용할 수 없습니다.');return false;}
   return command(setManualFigureWidth({figureId:found.node.attrs.id,widthPx,minWidthPx:live.minWidthPx,maxWidthPx:live.maxWidthPx,revision:context.revision}),{focus:false});
  }};
 }
 function tableSelectionEnabled(editor){return !!editor&&editor===view.current&&!disabled&&!replacementBusy&&!replacing.current&&!replacementSaving.current&&!printing.current&&editor.editable&&!editor.composing;}
 function tableGestureBaseBlocked(editor){return !tableSelectionEnabled(editor)||!!menu||!!modal||!!dragController.current?.isDragging()||!!outlineDragController.current?.isDragging()||!!marqueeController.current?.isDragging()||!!marginDrag.current||!!figureResizeSession.current||!!ownOutlineSelectSession.current;}
 function tableGestureBlocked(editor){return tableGestureBaseBlocked(editor)||!!tableResizeSession.current||!!tableUISession.current;}
 function tableResizeEnabled(editor){return !!editor&&!tableGestureBaseBlocked(editor)&&!tableUISession.current;}
 function startTableResizeSession(){const editor=view.current;if(uiApi.current?.tableResizeEnabled(editor))tableResizeSession.current={editor,doc:editor.state.doc,generation:generation.current,didCommit:false,resultDoc:null};}
 function commitTableResize(payload,context){
  const editor=view.current,session=tableResizeSession.current;
  if(!payload||!context||!session||session.didCommit||session.editor!==editor||session.doc!==editor?.state.doc||session.generation!==generation.current||context.editor!==editor||context.revision!==session.doc||context.generation!==session.generation||payload.revision!==session.doc||payload.generation!==session.generation||!uiApi.current?.tableResizeEnabled(editor))return false;
  const columns=Array.isArray(payload.columnWeights);
  if(columns&&(payload.rowIndex!==undefined||payload.rowMinHeightPx!==undefined))return false;
  session.didCommit=true;
  const action=columns?setManualTableColumnWidths({tableId:payload.tableId,columnWeights:payload.columnWeights,revision:context.revision}):setManualTableRowHeight({tableId:payload.tableId,rowIndex:payload.rowIndex,rowMinHeightPx:payload.rowMinHeightPx,revision:context.revision});
  const ok=command(action);
  if(ok&&view.current===editor&&generation.current===session.generation)session.resultDoc=editor.state.doc;
  return ok;
 }
 function endTableResizeSession(){
  const session=tableResizeSession.current;tableResizeSession.current=null;
  if(session&&session.editor===view.current&&session.generation===generation.current&&(session.doc===view.current.state.doc||session.resultDoc===view.current.state.doc)&&uiApi.current?.paginationEnabled&&uiApi.current?.tableResizeEnabled(session.editor))pagination.current?.request();
 }
 function tableMenuEnabled(target){
  const editor=view.current,session=tableUISession.current;
  return !!target&&!!session&&session.target===target&&session.editor===editor&&session.doc===editor?.state.doc&&session.generation===generation.current&&target.editor===editor&&target.revision===session.doc&&target.generation===session.generation&&!session.didCommit&&!tableGestureBaseBlocked(editor)&&!tableResizeSession.current;
 }
 function captureTableActionTarget(payload){
  const editor=view.current;
  if(!payload||payload.editor!==editor||payload.revision!==editor?.state.doc||payload.generation!==generation.current||uiApi.current?.tableGestureBlocked(editor)!==false)return null;
  const target=captureManualTableActionTarget(editor.state,payload);
  return target?{...target,editor}:null;
 }
 function canTableAction(target,action){
  if(!uiApi.current?.tableMenuEnabled(target))return {enabled:false,reason:'표가 변경되었거나 다른 편집이 진행 중입니다. 손잡이를 다시 선택하세요.'};
  return getManualTableActionAvailability(view.current.state,target,action,{generation:generation.current,readOnly:!view.current.editable});
 }
 function describeTableTrailingChange(target,delta){
  const editor=view.current,starter=!tableUISession.current&&target?.editor===editor&&target?.revision===editor?.state.doc&&target?.generation===generation.current&&uiApi.current?.tableGestureBlocked(editor)===false;
  if(!starter&&!uiApi.current?.tableMenuEnabled(target))return {enabled:false,reason:'표가 변경되었거나 다른 편집이 진행 중입니다. 손잡이를 다시 선택하세요.',removesContent:false,needsConfirmation:false,beforeCount:null,afterCount:null,contentCount:0,previewText:null};
  return describeManualTableTrailingChange(view.current.state,target,delta,{generation:generation.current,readOnly:!view.current.editable,composing:view.current.composing});
 }
 function commitTableUIAction(target,action){
  if(!uiApi.current?.tableMenuEnabled(target))return false;
  const editor=view.current,session=tableUISession.current;session.didCommit=true;
  const ok=command(action,{focus:false});
  if(ok&&view.current===editor&&generation.current===session.generation)session.resultDoc=editor.state.doc;
  return ok;
 }
 function performTableAction(target,action){
  if(!canTableAction(target,action).enabled)return false;
  return commitTableUIAction(target,executeManualTableAction(target,action,{generation:generation.current,readOnly:!view.current.editable}));
 }
 function changeTableTrailing(target,delta,{confirmedDeletion=false}={}){
  const description=describeTableTrailingChange(target,delta);
  if(!uiApi.current?.tableMenuEnabled(target)||!description.enabled||description.needsConfirmation&&confirmedDeletion!==true)return false;
  return commitTableUIAction(target,(_state,_dispatch,editor)=>executeManualTableTrailingChange(editor,target,delta,{generation:generation.current,readOnly:!editor.editable,composing:editor.composing,confirmedDeletion}));
 }
 function selectTableCellRange(cellId,mode,context){
  const editor=view.current,session=tableUISession.current;
  const ownSession=session&&session.target.cellId===cellId&&session.target.mode===mode&&uiApi.current?.tableMenuEnabled(session.target);
  if(!context||context.editor!==editor||context.revision!==editor?.state.doc||context.generation!==generation.current||!['row','column'].includes(mode)||(!ownSession&&uiApi.current?.tableGestureBlocked(editor)!==false))return false;
  return command(selectManualTableCells(cellId,cellId,{mode,revision:context.revision}),{focus:false});
 }
 function startTableUISession({target}={}){
  const editor=view.current;
  if(target&&target.editor===editor&&target.revision===editor?.state.doc&&target.generation===generation.current&&uiApi.current?.tableGestureBlocked(editor)===false)tableUISession.current={target,editor,doc:editor.state.doc,generation:generation.current,didCommit:false,resultDoc:null};
 }
 function endTableUISession({target,committed=false,resultRevision}={}){
  const session=tableUISession.current;if(!session||session.target!==target)return;
  tableUISession.current=null;
  const editor=view.current,currentDoc=editor?.state.doc,expectedDoc=committed&&session.didCommit?session.resultDoc:session.doc;
  if(editor&&session.editor===editor&&session.generation===generation.current&&expectedDoc===currentDoc&&resultRevision===currentDoc&&uiApi.current?.paginationEnabled&&uiApi.current?.tableGestureBlocked(editor)===false)pagination.current?.request();
 }
 function handleFigureClick({editor,node,nodePos,event}){
  if(editor!==view.current||node.type.name!=='figure'||event.defaultPrevented||event.button!==0||event.shiftKey||event.ctrlKey||event.metaKey||event.altKey||disabled||replacementBusy||modal||menu||ownOutlineSelectSession.current||tableUISession.current||tableResizeSession.current||replacing.current||replacementSaving.current||editor.composing||!editor.editable||dragController.current?.isDragging()||outlineDragController.current?.isDragging()||marqueeController.current?.isDragging()||marginDrag.current)return false;
  const found=findManualObject(editor.state,node.attrs.id),element=editor.nodeDOM(nodePos),media=element?.firstChild;
  if(!found||found.pos!==nodePos||found.node.type.name!=='figure'||found.node.attrs.id!==node.attrs.id||!media?.contains(event.target))return false;
  return command(selectManualObject(node.attrs.id,{text:false}));
 }
 function handleEditorKey(event){
  if(event.isComposing||event.keyCode===229||view.current.composing)return false;
  if(menu){if(event.key==='Tab'){closeBlockMenu();event.preventDefault();return true;}const action=getBlockMenuKeyAction(menuItems,menu.activeId,event);if(action){event.preventDefault();if(action.type==='move')setMenu({...menu,activeId:action.activeId});else if(action.type==='choose')chooseBlock(action.item);else closeBlockMenu();return true;}if(event.key==='Enter'){event.preventDefault();return true;}}
  const blockShortcut=!event.altKey&&((event.ctrlKey||event.metaKey)&&event.key==='/'||!event.ctrlKey&&!event.metaKey&&(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10'));
  if(blockShortcut&&openCurrentBlockMenu()){event.preventDefault();return true;}
  return false;
 }
 uiApi.current={figureAlignmentEnabled,calloutTitleActionsEnabled,menuTargetEnabled,deferredFocusEnabled,inspectorTargetId,dividerStyleEnabled,figureResizeEnabled,handleBackupStatus,calloutFocusEnabled,tableSelectionEnabled,tableGestureBlocked,tableMenuEnabled,tableResizeEnabled,reconcileOutlineSelection,downloadFileBytes,fileReady:ready&&!busy&&!printRequested,handleFigureClick,handleEditorKey,openBlockMenu,queueSave,refreshSlashAnchor,continueWriting,previewMarquee,commitMarquee,cancelMarquee,marqueeEnabled:!disabled&&!replacementBusy&&!modal&&!ownOutlineSelectSession.current&&!figureResizeSession.current&&!tableUISession.current&&!tableResizeSession.current,paginationEnabled:!disabled&&!replacementBusy&&!modal};
 useEffect(()=>{pagination.current?.request();},[ready,busy,printRequested,replacementBusy,outline,inspector,modal]);
 useLayoutEffect(()=>{geometryUpdates.current?.refresh();},[outline,inspector]);
 useEffect(()=>{view.current?.setProps({});},[menu]);
 useEffect(()=>{
  const editor=view.current;if(!editor||disabled||replacementBusy||modal){setBubble(null);return;}
  if(menuRef.current&&menuRef.current.mode!=='slash')return;
  // Search is read-only during IME; choose/key/picker callbacks retain composition guards.
  const trigger=getManualSlashTrigger(editor.state);
  if(trigger&&JSON.stringify(trigger)!==dismissedSlash.current){const position=editor.coordsAtPos(trigger.to);setMenu(previous=>({...previous,mode:'slash',editor,revision:editor.state.doc,generation:generation.current,selection:editor.state.selection,trigger,anchor:{left:position.left,top:position.top,bottom:position.bottom},query:trigger.query,activeId:previous?.query===trigger.query?previous.activeId:null}));setBubble(null);return;}
  if(!trigger)dismissedSlash.current=null;
  setMenu(previous=>previous?.mode==='slash'?null:previous);
  if(!editor.state.selection.manualTableCellSelection&&!editor.state.selection.empty&&!editor.state.selection.node&&!editor.state.selection.manualBlockSelection){const range=window.getSelection()?.rangeCount?window.getSelection().getRangeAt(0):null;setBubble(!!range&&editor.dom.contains(range.commonAncestorContainer)&&[...range.getClientRects()].some(rect=>rect.width>0));}else setBubble(null);
 },[state,disabled,replacementBusy,modal,compositionVersion]);
 function update(id,attrs){command(updateManualObject(id,attrs),{focus:false});}
 dragApi.current={command,isDirty,disabled:disabled||replacementBusy||!!state?.selection.manualTableCellSelection||!!figureResizeSession.current};
 useEffect(()=>{
  const assertReady=()=>{if(dragApi.current.disabled||figureResizeSession.current||ownOutlineSelectSession.current||tableUISession.current||tableResizeSession.current||view.current.composing)throw new Error('편집을 마친 뒤 다시 시도하세요.');const {doc,selection}=view.current.state;dragSelection.current=selection.manualBlockSelection?{doc,anchorId:selection.anchorId,headId:selection.headId,ids:[...selection.ids],sparse:!!selection.manualSparseBlockSelection}:null;};
  const settleRange=(range,doc)=>{const editor=view.current,epoch=generation.current,selection=editor?.state.selection;if(!editor)return;const current=()=>view.current===editor&&generation.current===epoch&&editor.state.doc===doc&&editor.state.selection===selection&&uiApi.current?.deferredFocusEnabled(editor)===true;requestAnimationFrame(()=>{if(!current())return;requestAnimationFrame(()=>{if(current())dragApi.current.command(range.sparse?selectManualBlockIds(range.ids):selectManualBlocks(range.anchorId,range.headId));});});};
  const controller=installCanvasDrag({beforeDrag:assertReady,getRevision:()=>view.current.state.doc,isHandleTarget:element=>!['page','cover','coverSectionFrame','coverBody'].includes(element.dataset.manualNode),getRailLeft:getManualRailLeft,
   getScrollContainer:()=>main.current,
   onMenu:(path,anchor)=>{uiApi.current.openBlockMenu(path,anchor);dragSelection.current=null;},
   onRangeSelect:(path)=>{if(ownOutlineSelectSession.current||tableUISession.current||tableResizeSession.current)return;const clickedId=dragPaths.current.get(path);const state=view.current.state,current=state.selection.manualBlockSelection?state.selection.anchorId:selectionIds(state)[0];dragSelection.current=null;if(clickedId&&dragApi.current.command(selectManualBlocks(current||clickedId,clickedId),{focus:false}))settleRange({anchorId:current||clickedId,headId:clickedId},state.doc);},
   onInsert:(path,anchor)=>{uiApi.current.openBlockMenu(path,anchor,'insert');dragSelection.current=null;},
   onSelect:path=>{if(ownOutlineSelectSession.current||tableUISession.current||tableResizeSession.current)return;const id=dragPaths.current.get(path),range=dragSelection.current;if(id)dragApi.current.command(range?.doc===view.current.state.doc&&range.ids.includes(id)?range.sparse?selectManualBlockIds(range.ids):selectManualBlocks(range.anchorId,range.headId):selectManualObject(id,{text:false}),{focus:false});},
   onEdit:path=>{if(ownOutlineSelectSession.current||tableUISession.current||tableResizeSession.current)return;const id=dragPaths.current.get(path);if(id)dragApi.current.command(selectManualObject(id,{text:true}));},
   onDelete:(path,source)=>{const id=dragPaths.current.get(path);if(id&&source===view.current.state.doc)dragApi.current.command(view.current.state.selection.manualBlockSelection&&view.current.state.selection.ids.includes(id)?deleteSelectedManualBlocks:deleteManualObject(id));},
   onMove:(path,collection,gap,source)=>{const id=dragPaths.current.get(path),target=dragCollections.current.get(collection);if(!id||!target||source!==view.current.state.doc)return;
    const parent=findManualObject(view.current.state,target.parentId),next=target.ids[gap],nextNode=next&&findManualObject(view.current.state,next);
    const range=dragSelection.current;
    if(range?.doc===source&&range.ids.includes(id)){
     dragApi.current.command(range.sparse?selectManualBlockIds(range.ids):selectManualBlocks(range.anchorId,range.headId),{focus:false});
     if(dragApi.current.command(moveSelectedManualBlocks({parentId:target.parentId,index:nextNode?.index??parent.node.childCount,coverHeader:parent?.node.type.name==='cover'}))){
      // Restore the block range after pointerup and the handle's focus have settled.
      settleRange(range,view.current.state.doc);
     }
     return;
    }
    if(parent&&gap>=0&&gap<=target.ids.length)dragApi.current.command(moveManualObject(id,{parentId:target.parentId,index:nextNode?.index??parent.node.childCount,coverHeader:parent?.node.type.name==='cover'}));
   },onIdle:()=>{const range=dragSelection.current;dragSelection.current=null;if(range?.doc===view.current.state.doc)settleRange(range,range.doc);controller.refresh();pagination.current?.request();}});
  dragController.current=controller;
  const refresh=()=>controller.refresh();main.current.addEventListener('scroll',refresh);
  return()=>{main.current?.removeEventListener('scroll',refresh);controller.dispose();dragController.current=null;};
 },[]);
 useEffect(()=>{dragController.current?.refresh();},[document,disabled,replacementBusy,outline,inspector]);
 function activeInspectedTableCell(tableId){
  const editor=view.current;if(!editor||tableId!==inspectorTargetId)return null;
  const selection=editor.state.selection;
  let cellId=selection.manualTableCellSelection?selection.anchorCellId:null;
  if(!cellId)for(let depth=selection.$from.depth;depth>0;depth--)if(selection.$from.node(depth).type.name==='tableCell'){cellId=selection.$from.node(depth).attrs.id;break;}
  const found=cellId&&findManualObject(editor.state,cellId);if(found?.node.type.name!=='tableCell')return null;
  const resolved=editor.state.doc.resolve(found.pos);let ownerId=null;
  for(let depth=resolved.depth;depth>0;depth--)if(resolved.node(depth).type.name==='table'){ownerId=resolved.node(depth).attrs.id;break;}
  return ownerId===tableId?{cellId,tableId,editor,revision:editor.state.doc,generation:generation.current}:null;
 }
 function selectInspectedTableRange(context,mode){
  const current=context&&activeInspectedTableCell(context.tableId);
  if(!current||current.cellId!==context.cellId||current.editor!==context.editor||current.revision!==context.revision||current.generation!==context.generation)return false;
  return selectTableCellRange(context.cellId,mode,context);
 }
 const inspectedCellContext=inspectedTable?activeInspectedTableCell(inspectedId):null;
 const tableActions=inspectedTable?[
  ...[['selectRow','row'],['selectColumn','column']].map(([id,mode])=>({id,disabled:!inspectedCellContext||uiApi.current?.tableGestureBlocked(view.current)!==false,onClick:()=>selectInspectedTableRange(inspectedCellContext,mode)})),
  {id:'addRow',disabled:!can(addManualTableRow(inspectedId)),onClick:()=>command(addManualTableRow(inspectedId))},
  {id:'deleteLastRow',disabled:!inspectedTable.value.rows.length||!can(deleteManualTableRow(inspectedId,inspectedTable.value.rows.length-1)),onClick:()=>command(deleteManualTableRow(inspectedId,inspectedTable.value.rows.length-1))},
  {id:'addColumn',disabled:!can(addManualTableColumn(inspectedId)),onClick:()=>command(addManualTableColumn(inspectedId))},
  {id:'deleteLastColumn',disabled:inspectedTable.value.headers.length<=1||!can(deleteManualTableColumn(inspectedId,inspectedTable.value.headers.length-1)),onClick:()=>command(deleteManualTableColumn(inspectedId,inspectedTable.value.headers.length-1))},
 ]:[];
 function trackSparseSelection(state,editor){
  const previous=sparseSnapshot.current,active=!!state.selection.manualSparseBlockSelection,cellActive=!!state.selection.manualTableCellSelection;
  sparseSnapshot.current={active,cellActive,editor,doc:state.doc,generation:generation.current};
  if((previous.active&&!active||previous.cellActive&&!cellActive)&&previous.editor===editor&&previous.generation===generation.current&&view.current===editor&&editor.state.doc===state.doc&&editor.editable&&!editor.composing&&uiApi.current?.paginationEnabled&&!replacing.current&&!replacementSaving.current&&!printing.current)pagination.current?.request();
 }
 function marqueeItems(){
  const editor=view.current;if(!editor)return [];
  return [...mount.current.querySelectorAll('[data-manual-id]')].flatMap(element=>{
   const id=element.dataset.manualId,found=id&&findManualObject(editor.state,id),node=found?.node;
   if(!node||!node.attrs.id||!(['step','listItem'].includes(node.type.name)||node.type.spec.group?.split(' ').some(group=>['block','stepBlock','calloutBlock','mediaBlock'].includes(group))))return [];
   const rect=element.getBoundingClientRect(),style=getComputedStyle(element),ancestorIds=[];
   for(let parent=element.parentElement;parent&&mount.current.contains(parent);parent=parent.parentElement){if(parent.dataset.manualId)ancestorIds.push(parent.dataset.manualId);}
   return [{id,kind:node.type.name,rect,ancestorIds,visible:style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0}];
  });
 }
 function currentMarquee(){const baseline=marqueeBaseline.current;return baseline&&baseline.editor===view.current&&baseline.generation===generation.current&&baseline.doc===view.current.state.doc?baseline:null;}
 function restoreMarquee(){const baseline=currentMarquee();if(baseline&&!baseline.editor.state.selection.eq(baseline.selection))baseline.editor.dispatch(baseline.editor.state.tr.setSelection(baseline.selection));}
 function previewMarquee(value){if(!value||!currentMarquee())return;if(value.ids.length)command(selectManualBlockIds(value.ids,{logicalFragments:true}),{focus:false});else restoreMarquee();}
 function commitMarquee(value){if(currentMarquee()){if(value.ids.length)command(selectManualBlockIds(value.ids,{logicalFragments:true}),{focus:false});else restoreMarquee();}marqueeBaseline.current=null;pagination.current?.request();}
 function cancelMarquee(value){
  const baseline=currentMarquee();if(value.started&&baseline)restoreMarquee();marqueeBaseline.current=null;pagination.current?.request();
  if(!value.started&&value.reason==='click'&&baseline)uiApi.current?.continueWriting({button:0,shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,target:value.target,clientX:value.point.x,clientY:value.point.y,preventDefault(){},stopPropagation(){}});
 }
 useEffect(()=>{
  const element=writing.current,editor=view.current;if(!element||!editor)return;
  const controller=installManualMarqueeSelection({element,getItems:()=>marqueeItems(),getRevision:()=>view.current?.state.doc,getScrollElement:()=>main.current,isEnabled:()=>!!uiApi.current?.marqueeEnabled&&view.current===editor&&editor.editable&&!editor.composing&&!editor.state.selection.manualTableCellSelection&&!replacing.current&&!replacementSaving.current&&!printing.current&&!dragController.current?.isDragging()&&!outlineDragController.current?.isDragging()&&!figureResizeSession.current&&!tableUISession.current&&!tableResizeSession.current&&!ownOutlineSelectSession.current&&!marginDrag.current,onPreview:value=>uiApi.current?.previewMarquee(value),onCommit:value=>uiApi.current?.commitMarquee(value),onCancel:value=>uiApi.current?.cancelMarquee(value)});
  marqueeController.current=controller;const compose=()=>controller.cancel();editor.dom.addEventListener('compositionstart',compose);
  return()=>{controller.dispose();editor.dom.removeEventListener('compositionstart',compose);if(marqueeController.current===controller)marqueeController.current=null;marqueeBaseline.current=null;};
 },[]);
 useEffect(()=>{const editor=view.current;if(disabled||replacementBusy||modal||!editor?.editable||editor.composing)marqueeController.current?.cancel();},[disabled,replacementBusy,modal,compositionVersion]);
 function getOutlineSelectionContext(){const editor=view.current;return editor?{editor,revision:editor.state.doc,generation:generation.current}:null;}
 function outlineContextCurrent(context){return outlineSelectionContextMatches(context,getOutlineSelectionContext());}
 function storeOutlineSelection(value){outlineSelectionRef.current=value;setOutlineSelection(value);}
 function currentOutlineSelection(){
  const editor=view.current,current=outlineSelectionRef.current;
  return editor?normalizeOutlinePageSelection(getManualPageGroups(editor.state.doc),outlineContextCurrent(current)?current:{}):{anchorId:null,selectedIds:[]};
 }
 function outlineSelectionBaseEnabled(){
  const editor=view.current;
  return !!editor&&!disabled&&!replacementBusy&&!modal&&!menu&&!replacing.current&&!replacementSaving.current&&!printing.current&&editor.editable&&!editor.composing&&!dragController.current?.isDragging()&&!outlineDragController.current?.isDragging()&&!marqueeController.current?.isDragging()&&!figureResizeSession.current&&!tableUISession.current&&!tableResizeSession.current&&!marginDrag.current;
 }
 function canSelectOutline(){return outlineSelectionBaseEnabled()&&(!ownOutlineSelectSession.current||outlineContextCurrent(ownOutlineSelectSession.current));}
 function changeOutlineSelection(value,meta={}){
  if(!outlineContextCurrent(value)||(meta.reason!=='marquee-cancel'&&!canSelectOutline()))return false;
  storeOutlineSelection({...normalizeOutlinePageSelection(getManualPageGroups(view.current.state.doc),value),...getOutlineSelectionContext()});return true;
 }
 function outlineSelectionSessionChanged(active){
  if(active){if(canSelectOutline()&&!ownOutlineSelectSession.current)ownOutlineSelectSession.current=getOutlineSelectionContext();return;}
  const session=ownOutlineSelectSession.current;ownOutlineSelectSession.current=null;
  if(session&&outlineContextCurrent(session)&&uiApi.current?.paginationEnabled)pagination.current?.request();
 }
 function reconcileOutlineSelection(state,editor,transaction){
  if(editor!==view.current||state.doc!==editor.state.doc)return;
  if(ownOutlineSelectSession.current&&!outlineContextCurrent(ownOutlineSelectSession.current))outlineSelectionController.current?.cancel();
  const current=outlineSelectionRef.current,result=transaction?.getMeta(MANUAL_PAGE_GROUP_ACTION_RESULT);
  if(!current&&!result)return;
  if(current&&(current.editor!==editor||current.generation!==generation.current)){storeOutlineSelection(null);return;}
  const groups=getManualPageGroups(state.doc),selectedIds=result?result.rootIds:current.selectedIds;
  const remaining=result?.remainingRootIds,activeIds=selectionIds(state);
  const anchorId=result?(result.rootIds[0]||remaining?.find(id=>activeIds.includes(id))||remaining?.[0]||null):current.anchorId;
  storeOutlineSelection({...normalizeOutlinePageSelection(groups,{anchorId,selectedIds}),...getOutlineSelectionContext()});
 }
 function outlinePageActionState(action,captured=menu,state=view.current?.state,editor=view.current){
  if(!captured||captured.origin!=='outline'||!state||!outlineContextCurrent(captured)||captured!==menuRef.current||state.doc!==captured.revision||editor!==view.current||replacementBusy||modal||replacing.current||replacementSaving.current||printing.current||ownOutlineSelectSession.current||tableUISession.current||tableResizeSession.current||figureResizeSession.current||dragController.current?.isDragging()||outlineDragController.current?.isDragging()||marqueeController.current?.isDragging()||marginDrag.current)return {enabled:false,reason:'stale-revision'};
  return getManualPageGroupActionState(state,{sourceIds:captured.outlineSourceIds,action,revision:captured.revision,readOnly:disabled||!editor.editable},editor);
 }
 function outlinePageActionReason(action){
  const reason=outlinePageActionState(action).reason;
  return ({'read-only':'읽기 전용 문서입니다.','composing':'입력을 마친 뒤 사용할 수 있습니다.','stale-revision':'메뉴를 다시 열어 주세요.','last-page':'페이지는 하나 이상 남겨야 합니다.','last-item':'페이지는 하나 이상 남겨야 합니다.','incomplete-group':'자동으로 이어진 페이지 묶음을 확인해 주세요.','invalid-source':'페이지를 다시 선택해 주세요.','no-selection':'페이지를 선택해 주세요.'})[reason]||'현재 선택에서는 이 동작을 사용할 수 없습니다.';
 }
 function outlinePageAction(action){
  if(!['duplicate','delete'].includes(action))return null;
  const captured=menu;
  return (state,dispatch,editor)=>outlinePageActionState(action,captured,state,editor||view.current).enabled&&applyManualPageGroupAction({sourceIds:captured.outlineSourceIds,action,revision:captured.revision})(state,dispatch,editor||view.current);
 }
 function canDragPage(sourceId){
  const editor=view.current;
  if(!editor||disabled||replacementBusy||modal||menu||replacing.current||replacementSaving.current||printing.current||editor.composing||!editor.editable||dragController.current?.isDragging()||marqueeController.current?.isDragging()||figureResizeSession.current||ownOutlineSelectSession.current||tableUISession.current||tableResizeSession.current||marginDrag.current||outlineDragSession.current&&!outlineContextCurrent(outlineDragSession.current))return false;
  if(!sourceId)return true;
  const sourceIds=outlineSelectionSources(getManualPageGroups(editor.state.doc),currentOutlineSelection(),sourceId);
  return getManualPageGroupActionState(editor.state,{sourceIds,revision:editor.state.doc},editor).move.enabled;
 }
 function outlineDragChanged(active){
  if(active){if(canDragPage()){outlineDragSession.current=getOutlineSelectionContext();setMenu(null);setBubble(null);}return;}
  const session=outlineDragSession.current;outlineDragSession.current=null;
  if(session&&outlineContextCurrent(session))pagination.current?.request();
 }
 function movePage(payload){
  if(!payload||!canDragPage(payload.sourceId)||payload.context&&!outlineContextCurrent(payload.context)||Array.isArray(payload.sourceIds)&&(!outlineContextCurrent(payload.context)||payload.context.revision!==payload.revision))return false;
  if(Array.isArray(payload.sourceIds)&&payload.sourceIds.length>1)return command(applyManualPageGroupAction({sourceIds:payload.sourceIds,action:'move',targetId:payload.targetId,edge:payload.edge,revision:payload.revision}),{focus:false});
  return command(moveManualPageGroup(payload));
 }
 function canAddPage(target){const insertion=pageInsertionTarget(target),editor=view.current;return !!insertion&&!!editor&&!coverGestureBlocked()&&!modal&&!editor.composing&&editor.editable&&can(insertManualPageTemplate('body',{...insertion.options,revision:editor.state.doc}));}
 function addedPageOwner(editor){return selectionIds(editor.state).find(id=>['page','cover'].includes(findManualObject(editor.state,id)?.node.type.name));}
 function revealAddedPage(editor,epoch,ownerId){
  const revision=editor.state.doc;
  const current=()=>view.current===editor&&generation.current===epoch&&editor.state.doc===revision&&uiApi.current?.deferredFocusEnabled(editor)===true&&addedPageOwner(editor)===ownerId;
  queueMicrotask(()=>{requestAnimationFrame(()=>{if(!current())return;requestAnimationFrame(()=>{
   if(!current())return;
   const found=findManualObject(editor.state,ownerId),section=found&&editor.nodeDOM(found.pos);
   if(section?.isConnected)section.scrollIntoView({block:'start'});
  });});});
 }
 function addBlankPage(target){
  const insertion=pageInsertionTarget(target),editor=view.current;if(!insertion||!canAddPage(target))return;
  const epoch=generation.current,revision=editor.state.doc;setMenu(null);setBubble(null);
  if(command(insertManualPageTemplate('body',{...insertion.options,revision}))){const ownerId=addedPageOwner(editor);if(ownerId)revealAddedPage(editor,epoch,ownerId);}
 }
 const closeModal=()=>{const slashRequest=modal?.kind==='brandLogo'?modal.request:null;setModal(null);scheduleFocus(null,{slashRequest});};
 return <div className="manual-v2-shell" data-file-save-mode={fileSaveMode||undefined}>
  <input ref={imageInput} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>{const file=event.target.files?.[0],request=imageTarget.current;imageTarget.current=null;event.target.value='';if(file)addImage(file,request);}}/>
  <input ref={fileInput} hidden type="file" accept=".manual.json,.json" onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)importFile(file);}}/>
  <header className="manual-v2-header">
   <div className="manual-v2-document-meta"><input ref={titleInput} aria-label="문서 제목" placeholder="제목 없는 매뉴얼" value={document.title} disabled={disabled||replacementBusy} onChange={event=>update(document.id,{title:event.target.value})}/></div>
   <div className="manual-v2-header-actions">{['저장 중','저장 실패','저장 충돌'].includes(saveStatus)&&<span className="manual-v2-save-status" role="status">{saveStatus}</span>}<Button variant="ghost" iconOnly aria-label="저장" title="저장 · Ctrl+S" styles={{root:{width:32,minWidth:32,height:32,minHeight:32,padding:0}}} disabled={disabled||replacementBusy} onClick={save}><LDSIcon name="save" size={20} aria-hidden="true"/></Button><DropdownMenu align="right" density="compact" trigger={<Button variant="ghost" iconOnly aria-label="문서 메뉴" title="문서 메뉴" styles={{root:{width:32,minWidth:32,height:32,minHeight:32,padding:0}}} disabled={disabled||replacementBusy}><LDSIcon name="more-horizontal" size={20} aria-hidden="true"/></Button>} items={[{label:'새 문서',onClick:newDocument},{label:'열기…',onClick:openFile},{label:'다른 이름으로 저장…',onClick:()=>save({as:true})},{label:'내보내기',items:[{label:'JSON',onClick:download},{label:'PDF',description:'인쇄 창에서 PDF로 저장할 수 있습니다.',onClick:requestPrint}]}]}/></div>
  </header>
  <div className="manual-v2-toolbar" role="group" aria-label="편집 도구">
   <Button iconOnly aria-label="페이지 목록" title="페이지 목록" aria-pressed={outline} onClick={()=>{setOutline(value=>!value);if(window.innerWidth<=760)setInspector(false);}}><Icon name="menu"/></Button>
   <Button iconOnly aria-label="실행 취소" title="실행 취소 (Ctrl / ⌘ Z)" disabled={!can(manualCommands.undo)} onMouseDown={event=>event.preventDefault()} onClick={()=>command(manualCommands.undo)}><Icon name="undo"/></Button><Button iconOnly aria-label="다시 실행" title="다시 실행 (Ctrl / ⌘ Shift Z)" disabled={!can(manualCommands.redo)} onMouseDown={event=>event.preventDefault()} onClick={()=>command(manualCommands.redo)}><Icon name="redo"/></Button><span className="manual-v2-divider"/>
    <Select className="lds-profile-ops" size="sm" aria-label="문단 종류" value={textKind(state)} disabled={disabled||replacementBusy||!!state?.selection.manualTableCellSelection} styles={{root:{width:'max-content',minWidth:0,maxWidth:'100%',flexShrink:0}}} onChange={value=>{const action=manualCommands[value];if(action)command(action);}} options={[
     ...(!['paragraph','heading1','heading2','heading3','todo','codeBlock','bulletList','orderedList'].includes(textKind(state))?[{value:textKind(state),disabled:true,label:manualSemanticLabel(textKind(state))}]:[]),
     ...[['paragraph','본문'],['heading1','제목 1'],['heading2','제목 2'],['heading3','제목 3'],['todo','할 일'],['codeBlock','코드 블록'],['bulletList','글머리 목록'],['orderedList','번호 목록']].map(([kind,label])=>({value:kind,label:manualSemanticLabel(kind),disabled:!can(manualCommands[kind])&&textKind(state)!==kind})),
    ]}/>

    <Button iconOnly aria-label="굵게" title="굵게" aria-pressed={marked(state,'strong')} disabled={!can(manualCommands.strong)} onMouseDown={event=>event.preventDefault()} onClick={()=>command(manualCommands.strong)}><strong>B</strong></Button><Button iconOnly aria-label="기울임" title="기울임" aria-pressed={marked(state,'emphasis')} disabled={!can(manualCommands.emphasis)} onMouseDown={event=>event.preventDefault()} onClick={()=>command(manualCommands.emphasis)}><em>I</em></Button>
    <Button iconOnly aria-label="밑줄" title="밑줄" aria-pressed={marked(state,'underline')} disabled={!can(manualCommands.underline)} onMouseDown={event=>event.preventDefault()} onClick={()=>command(manualCommands.underline)}><u>U</u></Button><Button iconOnly aria-label="취소선" title="취소선" aria-pressed={marked(state,'strike')} disabled={!can(manualCommands.strike)} onMouseDown={event=>event.preventDefault()} onClick={()=>command(manualCommands.strike)}><s>S</s></Button>
    {procedure&&<Button disabled={!can(appendManualStep(procedure.value.id))} onClick={()=>command(appendManualStep(procedure.value.id))}>다음 단계</Button>}
    <span className="manual-v2-toolbar-spacer"/>

  </div>
  <div className={`manual-v2-workspace ${outline?'has-outline':''} ${showInspector?'has-inspector':''}`}>
   {outline&&<ManualPageOutline pageEntries={pageEntries} groups={pageGroups} selection={outlineSelection} onSelectionChange={changeOutlineSelection} getSelectionContext={getOutlineSelectionContext} canSelect={canSelectOutline} onSelectionSessionChange={outlineSelectionSessionChanged} selectionControllerRef={outlineSelectionController} supportsBatchMove={true} editingPage={editingPage} menuTargetId={menu?.origin==='outline'?menu.targetId:null} disabled={disabled||replacementBusy} onNavigate={navigatePage} onOpenMenu={openOutlinePageMenu} getRevision={()=>view.current?.state.doc} canDrag={canDragPage} onMovePage={movePage} onDragStateChange={outlineDragChanged} dragControllerRef={outlineDragController} canAdd={canAddPage} onAdd={addBlankPage} onScroll={()=>{setBubble(null);geometryUpdates.current?.refresh();}}/>}
   <main ref={main} className="manual-v2-main" onScroll={()=>{setBubble(null);geometryUpdates.current?.refresh();}}>
    {!ready&&<p role="status">문서를 준비하고 있습니다.</p>}
    <section ref={writing} className="manual-v2-writing" aria-label="매뉴얼 작성" onMouseDownCapture={continueWriting} onPointerDownCapture={beginMarginSelection} onPointerMoveCapture={extendMarginSelection} onPointerUpCapture={endMarginSelection} onPointerCancelCapture={()=>{marginDrag.current=null;}} inert={disabled||replacementBusy||undefined} onPasteCapture={event=>{if(event.clipboardData?.getData('text/html').includes('data-manual-type'))return;const file=[...(event.clipboardData?.files||[])].find(file=>file.type.startsWith('image/'));if(file){event.preventDefault();event.stopPropagation();imageTarget.current=null;addImage(file);}}} onDragOver={event=>{if(event.dataTransfer?.types.includes('Files'))event.preventDefault();}} onDropCapture={event=>{const file=[...(event.dataTransfer?.files||[])].find(file=>file.type.startsWith('image/'));if(file){event.preventDefault();event.stopPropagation();imageTarget.current=null;addImage(file);}}}><div ref={mount} className="manual-v2-editor lds-manual"/></section>
   </main>
   {showInspector&&<aside className="manual-v2-inspector" aria-label="선택 요소 속성"><ManualObjectProperties semanticName={objectSemanticName(state,inspected)} inspected={inspected} inspectedId={inspectedId} disabled={disabled||replacementBusy} update={update} pickImage={pickImage} onEditTitle={editInspectedCalloutTitle} titleActions={inspectedCalloutTitleActions()} figureWidth={inspectedFigureWidth()} figureAlignment={inspectedFigureAlignment()} dividerStyle={inspectedDividerStyle()} tableActions={tableActions} onClose={()=>{setInspector(false);scheduleFocus();}}/></aside>}

  </div>
  <ManualFigureResizeControls viewRef={view} mountRef={mount} mainRef={main} getGeneration={()=>generation.current} getAssets={()=>assetsRef.current} isEnabled={()=>!!uiApi.current?.figureResizeEnabled(view.current)} onResizeCommit={commitFigureResize} onSessionStart={startFigureResizeSession} onSessionEnd={endFigureResizeSession}/>
  <ManualTableResizeControls viewRef={view} mountRef={mount} mainRef={main} getGeneration={()=>generation.current} isEnabled={()=>!!uiApi.current?.tableResizeEnabled(view.current)} onCommitResize={commitTableResize} onSessionStart={startTableResizeSession} onSessionEnd={endTableResizeSession}/>
  <ManualTableSelectionControls viewRef={view} mountRef={mount} mainRef={main} getGeneration={()=>generation.current} isEnabled={()=>!!view.current&&uiApi.current?.tableGestureBlocked(view.current)===false} isMenuEnabled={target=>!!uiApi.current?.tableMenuEnabled(target)} onCaptureActionTarget={captureTableActionTarget} onCanTableAction={canTableAction} onTableAction={performTableAction} onDescribeTrailingChange={describeTableTrailingChange} onTrailingChange={changeTableTrailing} onSelectCellRange={selectTableCellRange} onSessionStart={startTableUISession} onSessionEnd={endTableUISession}/>
  {menu&&<BlockCommandMenu initialKeyboardNavigation={menu.keyboard===true} compact={compactMenu} id="manual-command-list" items={menuItems} activeId={menu.activeId} onActiveChange={activeId=>setMenu(current=>current?{...current,activeId}:null)} onChoose={chooseBlock} onCompositionChoice={(item,button)=>slashCompositionChoice.current?.request(item,button)===true} onCompositionChoiceConfirm={(item,button)=>slashCompositionChoice.current?.confirm(item,button)} onCompositionChoiceCancel={()=>slashCompositionChoice.current?.cancel()} onClose={meta=>closeBlockMenu({restore:meta?.restoreFocus!==false})} anchor={menu.anchor} getPlacementBounds={menu.origin==='outline'?undefined:()=>main.current?.getBoundingClientRect()||null} query={compactMenu?'':menu.query} onQueryChange={menu.mode==='slash'||compactMenu?undefined:query=>setMenu({...menu,query,activeId:null})} mode={menu.mode} captureKeyboard={false} disabled={disabled||replacementBusy} composing={view.current?.composing} onBack={['turnInto','dividerStyle'].includes(menu.mode)?()=>setMenu({...menu,mode:'block',query:'',activeId:null}):undefined} ariaLabel={menu.mode==='dividerStyle'?'선 스타일':menu?.origin==='outline'&&menu.outlineSourceIds.length>1?`${menu.outlineSourceIds.length}개 페이지 작업`:menuPage?`${menuTargetName} 작업`:menu.mode==='insert'?'블록 추가':menuMulti?`${menuSelection.ids.length}개 블록 작업`:menuTarget?`${menuTargetName} 작업`:undefined}/>}
  {bubble&&!state?.selection.manualTableCellSelection&&!menu&&!modal&&<ManualFormatBubble viewRef={view} mainRef={main} editorState={state} outline={outline} inspector={inspector} compositionVersion={compositionVersion}>{[['strong','굵게'],['emphasis','기울임'],['underline','밑줄'],['strike','취소선'],['code','인라인 코드']].map(([mark,label])=><Button key={mark} iconOnly aria-label={label} title={mark==='code'?`${label} (Ctrl / ⌘ E)`:label} aria-pressed={marked(state,mark)} disabled={!can(manualCommands[mark])} onClick={()=>command(manualCommands[mark])}><MarkGlyph name={mark}/></Button>)}</ManualFormatBubble>}
  {printRequested&&<ManualPrint document={document} assets={assets} onIssues={finishPrintCheck}/>}
  {paginationResult.status==='needs-edit'&&<div className="manual-v2-flow-notice" role="status">한 쪽을 넘는 내용이 있습니다. 입력을 이어가면 자동으로 다음 쪽에 배치됩니다.</div>}
  {paginationResult.diagnostics?.length>0&&<div className="manual-v2-flow-notice" role="status">{paginationResult.diagnostics.map((issue,i)=><button key={`${issue.blockId||issue.pageId||''}-${i}`} onClick={()=>locate(issue.blockId||issue.pageId||document.id)}>{issue.reason==='oversize-unsplittable'?'한 쪽보다 큰 요소가 있습니다. 크기를 줄이거나 내용을 나누어 주세요.':'자동 페이지 나눔을 마치지 못했습니다. 내용을 확인해 주세요.'} <span>해당 위치로</span></button>)}</div>}
  {modal?.kind==='brandLogo'&&<Dialog title="로고 선택" onClose={closeModal}><ManualBrandAssetPicker value={modal.value} disabled={coverGestureBlocked()} onChoose={chooseLogo}/></Dialog>}
  {modal?.kind==='printIssues'&&<Dialog title="인쇄 전에 확인해 주세요" onClose={closeModal}><div className="manual-v2-issues">{modal.issues.map((issue,i)=><button key={i} onClick={()=>locatePrintIssue(issue.id)}>{issue.message} <span>수정 위치로</span></button>)}</div></Dialog>}
  {notice&&feedback.tone==='error'&&<div className="manual-v2-error-notice" role="alert"><span className="manual-v2-error-message">{notice}</span><div className="manual-v2-error-actions">
   {feedback.recovery==='open'&&<Button disabled={disabled||replacementBusy} onClick={openFile}>다른 파일 열기</Button>}
   {feedback.recovery==='save'&&<Button disabled={disabled||replacementBusy} onClick={save}>다시 저장</Button>}
   {feedback.recovery==='library'&&<Button disabled={disabled||replacementBusy} onClick={showLibrary}>보관함 다시 열기</Button>}
   {feedback.recovery==='download'&&<Button disabled={disabled||replacementBusy} onClick={download}>다시 내려받기</Button>}
   {feedback.recovery==='print'&&<Button disabled={disabled||replacementBusy} onClick={requestPrint}>인쇄 항목 다시 확인</Button>}
   <Button aria-label="오류 알림 닫기" onClick={()=>setNotice('')}>닫기</Button>
  </div></div>}
  <footer className="manual-v2-footer"><span aria-label="편집 위치">{editingPage<0?`총 ${pageEntries.length}쪽`:`편집 ${editingPage+1} / ${pageEntries.length}쪽`} · A4</span>{notice&&feedback.tone!=='error'&&<span role="status">{notice}</span>}</footer>
  {modal?.kind==='unsaved'&&<Dialog title="변경 내용을 저장할까요?" showClose={false} compact busy={busy||replacementBusy} onClose={cancelReplacement}><p style={{fontSize:14}}>현재 변경 내용이 파일에 저장되지 않았습니다.</p>{['저장 실패','저장 충돌'].includes(saveStatus)&&<p role="alert">{notice||'저장하지 못했습니다. 다시 저장하거나 취소한 뒤 파일로 저장하세요.'}</p>}{replacementDownloadCurrent(modal.downloadRequest)&&<p role="status">파일 내려받기를 요청했습니다. 받은 파일을 확인한 뒤, 계속하려면 ‘저장 안 함’을 선택하세요.</p>}<div className="manual-v2-dialog-actions"><Button data-initial-focus onClick={cancelReplacement} disabled={busy||replacementBusy}>취소</Button><Button danger onClick={()=>{if(!replacementSaving.current)finishReplacement();}} disabled={busy||replacementBusy}>저장 안 함</Button><Button variant="primary" disabled={busy||replacementBusy} onClick={saveAndContinue}>{replacementBusy?'저장 중…':fileSaveMode==='download'?'파일 내려받기':'저장'}</Button></div></Dialog>}
  {modal?.kind==='library'&&<Dialog title="보관함" busy={busy||replacementBusy} onClose={closeModal}><p>이 브라우저에 저장한 문서입니다.</p><div className="manual-v2-library">{modal.records.map(record=><button key={record.id} disabled={busy||replacementBusy} onClick={()=>openRecord(record.id)}><strong>{record.title||'제목 없는 매뉴얼'}</strong><span>{new Date(record.savedAt).toLocaleString('ko-KR')}</span></button>)}</div>{!modal.records.length&&<p>저장한 문서가 없습니다.</p>}<Button disabled={busy||replacementBusy} onClick={()=>fileInput.current.click()}>문서 파일을 복사본으로 가져오기</Button></Dialog>}
  {modal?.kind==='table'&&<Dialog title="표 넣기" onClose={closeModal}><label>열 수<input type="number" min="1" max="10" value={modal.columns} onChange={event=>setModal({...modal,columns:Number(event.target.value)})}/></label><label>내용 행 수<input type="number" min="1" max="30" value={modal.rows} onChange={event=>setModal({...modal,rows:Number(event.target.value)})}/></label><div className="manual-v2-dialog-actions"><Button variant="primary" disabled={!Number.isInteger(modal.columns)||modal.columns<1||modal.columns>10||!Number.isInteger(modal.rows)||modal.rows<1||modal.rows>30} onClick={()=>{const attrs={rows:modal.rows,columns:modal.columns};closeModal();command(insertManualBlock('table',attrs));}}>표 넣기</Button></div></Dialog>}
 </div>;
}
