import {EditorState} from '@tiptap/pm/state';
import {TableMap} from '@tiptap/pm/tables';
import {closeHistory} from '@tiptap/pm/history';
import {captureManualTableActionTarget,getManualTableActionAvailability,executeManualTableAction} from './manual-table-actions.mjs';

const no=reason=>({enabled:false,reason});
function tableAt(state,id){let found=null;state.doc.descendants((node,pos)=>{if(node.type.name==='table'&&node.attrs.id===id)found={node,pos};});return found;}
/** A trailing operation remains pinned to the original revision, never the caret. */
export function getManualTableTrailingAvailability(state,target,delta,options={}){
 if(options.cancelled)return no('표 변경이 취소되었습니다.');
 if(options.composing)return no('입력이 끝난 뒤 표를 변경하세요.');
 if(!Number.isSafeInteger(delta)||delta===0)return no('추가하거나 삭제할 행·열 수를 선택하세요.');
 // Bound synchronous preview/commit work and accidental unbounded drag counts.
 if(Math.abs(delta)>100)return no('한 번에 최대 100개의 행·열을 변경할 수 있습니다.');
 const existing=getManualTableActionAvailability(state,target,delta>0?'insert-after':'delete',options);if(!existing.enabled)return existing;
 const found=tableAt(state,target.tableId),map=TableMap.get(found.node),count=target.mode==='row'?map.height:map.width;
 if((target.mode==='row'?target.rowIndex+target.rowSpan:target.columnIndex+target.columnSpan)!==count)return no('표 끝의 손잡이를 다시 선택하세요.');
 if(count+delta<1)return no('최소 한 개의 행과 열을 남겨야 합니다.');
 return {enabled:true,reason:null};
}
/** UI must show previewText on a destructive drag before accepting release. */
export function describeManualTableTrailingChange(state,target,delta,options={}){
 const availability=getManualTableTrailingAvailability(state,target,delta,options);
 if(!availability.enabled)return {...availability,removesContent:false,needsConfirmation:false,beforeCount:null,afterCount:null,addedCount:0,removedCount:0,contentCount:0,previewText:null};
 const table=tableAt(state,target.tableId).node,map=TableMap.get(table),beforeCount=target.mode==='row'?map.height:map.width,afterCount=beforeCount+delta;
 let contentCount=0;
 if(delta<0){
  for(let index=afterCount;index<beforeCount;index++){
   let content=false;
   if(target.mode==='row')table.child(index).forEach(cell=>{content ||= cell.content.size>0;});
   else for(let row=0;row<map.height;row++)content ||= table.nodeAt(map.map[row*map.width+index]).content.size>0;
   if(content)contentCount++;
  }
 }
 const unit=target.mode==='row'?'행':'열',removesContent=contentCount>0;
 return {...availability,removesContent,needsConfirmation:removesContent,beforeCount,afterCount,addedCount:Math.max(0,delta),removedCount:Math.max(0,-delta),contentCount,
  previewText:removesContent?`내용 있는 ${unit} ${contentCount}개 삭제 • 놓으면 삭제`:delta>0?`${unit} ${delta}개 추가`:`빈 ${unit} ${-delta}개 삭제`};
}
/** Reuse public ordinary-table commands on a plugin-free scratch state; only
 * the final table and selection enter the real editor in one history event. */
export function executeManualTableTrailingChange(view,target,delta,options={}){
 if(!view?.state||typeof view.dispatch!=='function'||view.composing||view.editable===false)return false;
 const state=view.state,description=describeManualTableTrailingChange(state,target,delta,options);
 if(!description.enabled||description.needsConfirmation&&options.confirmedDeletion!==true)return false;
 const original=tableAt(state,target.tableId);
 let scratch=EditorState.create({schema:state.schema,doc:state.doc,selection:state.selection,storedMarks:state.storedMarks});
 for(let step=0;step<Math.abs(delta);step++){
  const table=tableAt(scratch,target.tableId).node,tail=table.lastChild.lastChild;
  const current=captureManualTableActionTarget(scratch,{tableId:target.tableId,cellId:tail.attrs.id,mode:target.mode,generation:target.generation});
  if(!executeManualTableAction(current,delta>0?'insert-after':'delete',options)(scratch,tr=>{scratch=scratch.apply(tr);} ))return false;
 }
 // A caller changing document/generation during preview cannot silently retarget.
 if(view.state!==state||view.composing||view.editable===false)return false;
 const replacement=tableAt(scratch,target.tableId).node,tr=closeHistory(state.tr).replaceWith(original.pos,original.pos+original.node.nodeSize,replacement);
 tr.setSelection(scratch.selection.getBookmark().resolve(tr.doc)).setStoredMarks(state.storedMarks);tr.doc.check();
 view.dispatch(tr.setMeta('manualTableTrailingAction',{tableId:target.tableId,mode:target.mode,delta,removedContent:description.removesContent}).scrollIntoView());return true;
}
