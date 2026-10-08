import {Fragment} from '@tiptap/pm/model';
import {Selection,TextSelection,NodeSelection} from '@tiptap/pm/state';
import {closeHistory} from '@tiptap/pm/history';
import {getManualCoverProjection,getManualCoverCellProjection,createManualCoverPaddingCell,withEditableManualCoverTableMeta} from './manual-cover-legacy-projection.mjs';

const cells=row=>Array.from({length:row.childCount},(_,index)=>row.child(index));
const isOddValue=node=>node.attrs.colspan===3&&getManualCoverCellProjection(node.attrs.meta?.extensions)?.canonicalColspan===3;
export function manualCoverRuntimeRows(block){
 const role=getManualCoverProjection(block.extensions),bound=role?.role==='metadata'&&role.blockId===block.id&&role.editableTable!==true;
 return [block.headers,...block.rows].map(row=>bound&&row.length===4&&getManualCoverCellProjection(row[1].extensions)?.canonicalColspan===3&&row.slice(2).every(cell=>!cell.content.length&&getManualCoverCellProjection(cell.extensions)?.canonicalPadding===true)?row.slice(0,2):row);
}
export function hasMergedManualCoverTable(table){let found=false;table.forEach(row=>row.forEach(cell=>{if(isOddValue(cell))found=true;}));return found;}
function fresh(base,used){let id=base;for(let suffix=2;used.has(id);suffix++)id=`${base}:${suffix}`;used.add(id);return id;}
/** Virtual padding is a codec bridge only. It is never part of the editable
 * merged row and therefore never receives an invisible caret or handle. */
export function getManualCoverLogicalRows(table,{usedIds}={}){
 const used=new Set(usedIds||[]);table.descendants(node=>{if(node.attrs.id)used.add(node.attrs.id);});
 return Array.from({length:table.childCount},(_,index)=>{const out=[];for(const cell of cells(table.child(index))){out.push(cell);if(isOddValue(cell))for(let offset=0;offset<2;offset++){const dto=createManualCoverPaddingCell({extensions:cell.attrs.meta.extensions},fresh(`manual-cover-padding:${cell.attrs.id}:${offset}`,used),offset?'value':'label',table.attrs.id);out.push(cell.type.create({id:dto.id,meta:{extensions:dto.extensions}}));}}return out;});
}
function find(doc,id){let result=null;doc.descendants((node,pos)=>{if(node.attrs.id===id)result={node,pos};});return result;}
function restoreSelection(state,tr){
 const selection=state.selection;
 if(selection.manualTableCellSelection)return Selection.fromJSON(tr.doc,selection.toJSON());
 if(selection instanceof NodeSelection){const target=find(tr.doc,selection.node.attrs.id);return target?NodeSelection.create(tr.doc,target.pos):selection.map(tr.doc,tr.mapping);}
 if(selection instanceof TextSelection){const point=$pos=>{if($pos.parent.type.name!=='tableCell')return tr.mapping.map($pos.pos);const target=find(tr.doc,$pos.parent.attrs.id);return target?target.pos+1+Math.min($pos.parentOffset,target.node.content.size):tr.mapping.map($pos.pos);};return TextSelection.create(tr.doc,point(selection.$anchor),point(selection.$head));}
 return selection.map(tr.doc,tr.mapping);
}
/** Structural edits release a merged scalar grid into an ordinary rectangular
 * v2 table before applying the edit. Both steps belong to the same Undo entry. */
export function normalizeManualCoverTableCommand(state,dispatch,view,tableId,command,{preserveMetadataRole=false}={}){
 const found=find(state.doc,tableId);if(found?.node.type.name!=='table')return false;
 if(!hasMergedManualCoverTable(found.node))return command(state,dispatch,view);
 if(view?.composing||view?.editable===false)return false;
 const usedIds=[state.doc.attrs.meta.id];state.doc.descendants(node=>{if(node.attrs.id)usedIds.push(node.attrs.id);});
 const rows=getManualCoverLogicalRows(found.node,{usedIds}).map((row,index)=>found.node.child(index).type.create(found.node.child(index).attrs,row.map(cell=>cell.type.create({...cell.attrs,colspan:1},cell.content,cell.marks))));
 const attrs=structuredClone(found.node.attrs),role=getManualCoverProjection(attrs.meta?.extensions);
 if(role?.role==='metadata'&&preserveMetadataRole)attrs.meta=withEditableManualCoverTableMeta(attrs.meta);
 else if(role?.role==='metadata'){for(const [key,value]of Object.entries(attrs.meta.extensions))if(value===role)delete attrs.meta.extensions[key];if(!Object.keys(attrs.meta.extensions).length)delete attrs.meta.extensions;}
 const node=found.node.type.create(attrs,Fragment.fromArray(rows)),combined=closeHistory(state.tr).replaceWith(found.pos,found.pos+found.node.nodeSize,node);combined.setSelection(restoreSelection(state,combined)).setStoredMarks(state.storedMarks);
 let working=state.apply(combined),success=false;
 const collect=tr=>{for(const step of tr.steps)combined.step(step);working=working.apply(tr);};
 success=command(working,collect,view);if(!success)return false;
 combined.setSelection(Selection.fromJSON(combined.doc,working.selection.toJSON())).setStoredMarks(working.storedMarks).setMeta('manualCoverTableUnmerge',{tableId});combined.doc.check();
 if(dispatch)dispatch(combined.scrollIntoView());return true;
}
