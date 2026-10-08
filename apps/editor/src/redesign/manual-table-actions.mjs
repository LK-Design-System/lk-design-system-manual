import {Fragment} from '@tiptap/pm/model';
import {TableMap} from '@tiptap/pm/tables';
import {closeHistory} from '@tiptap/pm/history';
import {ManualTableCellSelection} from './manual-table-selection.mjs';
import {newManualId} from './manual-v2.mjs';
import {manualPaginationMarker} from './manual-pagination-meta.mjs';
import {getManualCoverProjection,getManualCoverCellProjection,withEditableManualCoverTableMeta,withoutManualCoverCellProjection} from './manual-cover-legacy-projection.mjs';
import {hasMergedManualCoverTable,normalizeManualCoverTableCommand} from './manual-cover-table-shape.mjs';
import {readManualTableCellLayout,withManualTableCellLayout} from './manual-table-layout.mjs';

const modes=new Set(['row','column']),actions=new Set(['insert-before','insert-after','duplicate','clear','delete']);
const no=reason=>({enabled:false,reason}),yes={enabled:true,reason:null};
function locate(state,tableId,cellId){
 let table=null,cell=null,tableCount=0,cellCount=0;
 state.doc.descendants((node,pos)=>{
  if(node.attrs.id===tableId){tableCount++;if(node.type.name==='table')table={node,pos};}
  if(node.attrs.id===cellId){cellCount++;if(node.type.name==='tableCell')cell={node,pos};}
 });
 if(tableCount!==1||cellCount!==1||!table||!cell)return null;
 try{
  const $cell=state.doc.resolve(cell.pos);if($cell.node(-1)!==table.node)return null;
  const map=TableMap.get(table.node);if(map.problems?.length)return null;
  const rect=map.findCell(cell.pos-table.pos-1);
  return {...table,cell,map,rowIndex:rect.top,columnIndex:rect.left,columnSpan:rect.right-rect.left,rowSpan:rect.bottom-rect.top};
 }catch{return null;}
}
/** Physical row indices include the first/header row; columns use TableMap. */
export function captureManualTableActionTarget(state,{tableId,cellId,mode,revision=state.doc,generation}={}){
 if(revision!==state.doc||!modes.has(mode))return null;
 const found=locate(state,tableId,cellId);if(!found)return null;
 return Object.freeze({tableId,cellId,mode,revision,generation,rowIndex:found.rowIndex,columnIndex:found.columnIndex,columnSpan:found.columnSpan,rowSpan:found.rowSpan});
}
function resolved(state,target,options){
 if(!target||target.revision!==state.doc||target.generation!==options.generation||!modes.has(target.mode))return null;
 const found=locate(state,target.tableId,target.cellId);
 return found&&['rowIndex','columnIndex','columnSpan','rowSpan'].every(key=>found[key]===target[key])?found:null;
}
function shape(found){
 let merged=false,rowspan=false,foreignMerge=false,bound=!!getManualCoverProjection(found.node.attrs.meta?.extensions);
 found.node.descendants(node=>{
  if(node.type.name!=='tableCell')return;
  merged ||= node.attrs.colspan!==1||node.attrs.rowspan!==1;foreignMerge ||= node.attrs.rowspan!==1||node.attrs.colspan!==1&&!(node.attrs.colspan===3&&getManualCoverCellProjection(node.attrs.meta?.extensions)?.canonicalColspan===3);rowspan ||= node.attrs.rowspan!==1;
  bound ||= !!getManualCoverCellProjection(node.attrs.meta?.extensions);
 });return {merged,rowspan,bound,foreignMerge};
}
function pagination(state,found){
 if(manualPaginationMarker(found.node.attrs.meta?.extensions,'block'))return true;
 let family=false;state.doc.descendants(node=>{const marker=manualPaginationMarker(node.attrs.meta?.extensions,'block');if(marker?.rootBlockId===found.node.attrs.id)family=true;});return family;
}
export function getManualTableActionAvailability(state,target,action,options={}){
 if(options.readOnly)return no('읽기 전용입니다.');
 if(!actions.has(action))return no('지원하지 않는 작업입니다.');
 const found=resolved(state,target,options);if(!found)return no('표가 변경되었습니다. 손잡이를 다시 선택하세요.');
 if(pagination(state,found))return no('자동으로 나뉜 표에서는 행·열 작업을 사용할 수 없습니다.');
 const {merged,rowspan,bound,foreignMerge}=shape(found);
 if(action==='clear'){
  if(target.mode==='column'&&merged)return no('병합 셀이 있는 표의 열 내용 비우기는 지원하지 않습니다.');
  if(target.mode==='row'&&rowspan)return no('여러 행에 걸친 병합 셀의 내용 비우기는 지원하지 않습니다.');
  return yes;
 }
 if(merged&&(foreignMerge||!(bound&&hasMergedManualCoverTable(found.node))))return no('병합 셀이 있는 표의 구조 변경은 지원하지 않습니다.');
 if(action==='delete'&&(target.mode==='row'?found.map.height:found.map.width)<=1)return no('마지막 행이나 열은 삭제할 수 없습니다.');
 return yes;
}
const children=node=>{const result=[];node.forEach(child=>result.push(child));return result;};
function freshCell(cell,duplicate,used){
 let id;do{id=newManualId();}while(used.has(id));used.add(id);
 let meta=duplicate?withoutManualCoverCellProjection(cell.attrs.meta):{};
 if(!duplicate){const layout=readManualTableCellLayout(cell.attrs.meta?.extensions);if(layout){const {key,...patch}=layout;if(Object.keys(patch).length)meta=withManualTableCellLayout(meta,patch);}}
 return cell.type.create({...cell.attrs,id,meta},duplicate?cell.content:Fragment.empty,cell.marks);
}
function touched(found,target){
 const cells=children(found.node.child(target.rowIndex));
 if(target.mode==='row')return cells.map(cell=>cell.attrs.id);
 const offsets=new Set();for(let row=0;row<found.map.height;row++)offsets.add(found.map.map[row*found.map.width+target.columnIndex]);
 return [...offsets].map(offset=>found.node.nodeAt(offset).attrs.id);
}
function clear(state,dispatch,found,target){
 const ids=new Set(touched(found,target)),positions=[];
 found.node.descendants((cell,pos)=>{if(cell.type.name==='tableCell'&&ids.has(cell.attrs.id)&&cell.content.size)positions.push({cell,pos:found.pos+1+pos});});
 if(dispatch&&positions.length){
  const tr=closeHistory(state.tr);for(const {cell,pos}of positions.sort((a,b)=>b.pos-a.pos))tr.delete(pos+1,pos+cell.nodeSize-1);
  tr.setSelection(new ManualTableCellSelection(tr.doc,target.cellId,target.cellId,{mode:target.mode})).setStoredMarks(state.storedMarks);
  dispatch(tr.setMeta('manualTableAction',{action:'clear',tableId:target.tableId,mode:target.mode}).scrollIntoView());
 }return true;
}
/** Commands never retarget a stale menu to the current caret or another table. */
export const executeManualTableAction=(target,action,options={})=>(state,dispatch,view)=>{
 if(view?.composing||view?.editable===false||!getManualTableActionAvailability(state,target,action,options).enabled)return false;
 const found=resolved(state,target,options);
 if(action!=='clear'&&hasMergedManualCoverTable(found.node))return normalizeManualCoverTableCommand(state,dispatch,view,target.tableId,(inner,send)=>{const current=captureManualTableActionTarget(inner,{...target,revision:inner.doc});return executeManualTableAction(current,action,options)(inner,send,view);},{preserveMetadataRole:true});
 if(action==='clear')return clear(state,dispatch,found,target);
 if(!dispatch)return true;
 const used=new Set();state.doc.descendants(node=>{if(node.attrs.id)used.add(node.attrs.id);});
 let rows=children(found.node),selectionId=target.cellId;
 const index=target.mode==='row'?target.rowIndex:target.columnIndex;
 const at=action==='insert-before'?index:index+1;
 if(target.mode==='row'){
  if(action==='delete'){rows.splice(index,1);selectionId=rows[Math.min(index,rows.length-1)].firstChild.attrs.id;}
  else{const source=rows[index],copy=source.type.create({...source.attrs,header:false},children(source).map(cell=>freshCell(cell,action==='duplicate',used)),source.marks);rows.splice(at,0,copy);selectionId=copy.firstChild.attrs.id;}
 }else{
  rows=rows.map((row,rowIndex)=>{
   const cells=children(row);
   if(action==='delete')cells.splice(index,1);else cells.splice(at,0,freshCell(cells[index],action==='duplicate',used));
   if(rowIndex===target.rowIndex)selectionId=cells[action==='delete'?Math.min(index,cells.length-1):at].attrs.id;
   return row.copy(Fragment.fromArray(cells));
  });
 }
 // DTO headers always correspond to physical first row, including promotion.
 rows=rows.map((row,index)=>row.type.create({...row.attrs,header:index===0},row.content,row.marks));
 const replacement=found.node.type.create({...found.node.attrs,meta:withEditableManualCoverTableMeta(found.node.attrs.meta)},Fragment.fromArray(rows),found.node.marks),tr=closeHistory(state.tr).replaceWith(found.pos,found.pos+found.node.nodeSize,replacement);
 tr.setSelection(new ManualTableCellSelection(tr.doc,selectionId,selectionId,{mode:target.mode})).setStoredMarks(state.storedMarks);tr.doc.check();
 dispatch(tr.setMeta('manualTableAction',{action,tableId:target.tableId,mode:target.mode}).scrollIntoView());return true;
};
