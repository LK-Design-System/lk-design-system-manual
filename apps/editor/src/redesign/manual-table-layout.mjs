import {closeHistory} from '@tiptap/pm/history';
import {manualPaginationMarker} from './manual-pagination-meta.mjs';
import {getManualCoverProjection} from './manual-cover-legacy-projection.mjs';
import {getManualCoverLogicalRows,hasMergedManualCoverTable,normalizeManualCoverTableCommand} from './manual-cover-table-shape.mjs';

export const MANUAL_TABLE_LAYOUT_OWNER='@lk-design-system/manual-table-layout';
const recognized=value=>value&&value.owner===MANUAL_TABLE_LAYOUT_OWNER&&value.version===1&&value.kind==='cell-layout';
const positive=value=>Number.isFinite(value)&&value>0;
const height=value=>Number.isFinite(value)&&value>=0;

/** Foreign extensions and unknown fields inside our recognized marker stay opaque. */
export function readManualTableCellLayout(extensions){
 if(!extensions||typeof extensions!=='object'||Array.isArray(extensions))return null;
 for(const [key,value]of Object.entries(extensions))if(recognized(value))return {key,...(positive(value.columnWeight)?{columnWeight:value.columnWeight}:{}),...(height(value.rowMinHeightPx)?{rowMinHeightPx:value.rowMinHeightPx}:{})};
 return null;
}
export function withManualTableCellLayout(meta,patch){
 if(!patch||Object.keys(patch).some(key=>!['columnWeight','rowMinHeightPx'].includes(key))||Object.hasOwn(patch,'columnWeight')&&!positive(patch.columnWeight)||Object.hasOwn(patch,'rowMinHeightPx')&&!height(patch.rowMinHeightPx))throw new TypeError('Invalid table layout');
 const result=structuredClone(meta||{}),extensions=result.extensions??={},old=readManualTableCellLayout(extensions);result.extensions=extensions;
 let key=old?.key||'manualTableLayout';for(let i=2;!old&&Object.hasOwn(extensions,key);i++)key=`manualTableLayout${i}`;
 extensions[key]={...(old?extensions[key]:{}),...patch,owner:MANUAL_TABLE_LAYOUT_OWNER,version:1,kind:'cell-layout'};return result;
}
const rowsOf=table=>table?.type?.name==='table'?getManualCoverLogicalRows(table):table?.type==='table'?[table.headers,...table.rows]:[];
const cellLayout=cell=>readManualTableCellLayout(cell?.attrs?cell.attrs.meta?.extensions:cell?.extensions);
/** Renderers share percentages; CSS row height is a minimum, never a content clip. */
export function getManualTableLayout(table){
 const rows=rowsOf(table),headers=rows[0]||[],role=getManualCoverProjection(table?.attrs?table.attrs.meta?.extensions:table?.extensions),canonical=role?.role==='metadata'&&role.blockId===(table?.attrs?table.attrs.id:table?.id)&&headers.length===4,defaults=canonical?[2,3,2,3]:headers.map(()=>1),layouts=headers.map(cellLayout),columnWeights=layouts.map((value,index)=>value?.columnWeight??defaults[index]),max=Math.max(1,...columnWeights),scaled=columnWeights.map(weight=>weight/max),sum=scaled.reduce((a,b)=>a+b,0);
 return {columnWeights,columnPercentages:scaled.map(weight=>weight/sum*100),hasColumnWeights:layouts.some(value=>value?.columnWeight!==undefined),rowMinHeightsPx:rows.map(row=>{const values=row.map(cellLayout).map(value=>value?.rowMinHeightPx).filter(height);return values.length?Math.max(...values):null;})};
}
function find(doc,id){let result=null;doc.descendants((node,pos)=>{if(node.attrs.id===id)result={node,pos};});return result;}
function family(doc,tableId){
 const target=find(doc,tableId);if(target?.node.type.name!=='table')return null;
 const marker=manualPaginationMarker(target.node.attrs.meta?.extensions,'block');if(marker&&marker.sourceType!=='table')return null;
 const rootId=marker?.rootBlockId||tableId,root=find(doc,rootId);if(root?.node.type.name!=='table')return null;
 const rootMarker=manualPaginationMarker(root.node.attrs.meta?.extensions,'block');if(rootMarker&&(rootMarker.rootBlockId!==rootId||rootMarker.sourceType!=='table'))return null;
 const members=[root];let invalid=false;
 doc.descendants((node,pos)=>{
  const tail=manualPaginationMarker(node.attrs.meta?.extensions,'block');if(!tail||tail.rootBlockId!==rootId||node.attrs.id===rootId)return;
  if(node.type.name!=='table'||tail.sourceType!=='table'||!tail.repeatedHeader)invalid=true;else members.push({node,pos});
 });
 const count=rowsOf(root.node)[0]?.length;
 for(const {node}of members){if(!count||!node.firstChild?.attrs.header)invalid=true;const logical=rowsOf(node);node.forEach((row,_offset,index)=>{if(row.type.name!=='tableRow'||logical[index]?.length!==count)invalid=true;});}
 return invalid?null:{target,members,count};
}
const blocked=(state,view,options)=>options.cancelled||options.readOnly||view?.composing||view?.editable===false||options.revision!==undefined&&options.revision!==state.doc;
function commit(state,dispatch,updates,metadata){
 const changed=updates.filter(({node,meta})=>JSON.stringify(node.attrs.meta??{})!==JSON.stringify(meta));if(!changed.length)return false;
 if(dispatch){const tr=closeHistory(state.tr);for(const {node,pos,meta}of changed)tr.setNodeMarkup(pos,null,{...node.attrs,meta},node.marks);tr.setStoredMarks(state.storedMarks);tr.doc.check();dispatch(tr.setMeta('manualTableResize',metadata));}return true;
}
function cells(table,rowIndex,visit){let rowPos=table.pos+1;table.node.forEach((row,offset,index)=>{let pos=rowPos+offset+1;row.forEach((cell,_offset,columnIndex)=>{if(rowIndex===null||rowIndex===index)visit(cell,pos,columnIndex,index);pos+=cell.nodeSize;});});}

/** Whole-array weights let a boundary resize adjust adjacent columns atomically. */
export const setManualTableColumnWidths=(options={})=>(state,dispatch,view)=>{
 if(blocked(state,view,options))return false;
 const target=find(state.doc,options.tableId);
 if(target?.node.type.name==='table'&&hasMergedManualCoverTable(target.node))return normalizeManualCoverTableCommand(state,dispatch,view,options.tableId,(innerState,innerDispatch,innerView)=>setManualTableColumnWidths({...options,revision:innerState.doc})(innerState,innerDispatch,innerView));
 const group=family(state.doc,options.tableId),weights=options.columnWeights;
 if(!group||!Array.isArray(weights)||weights.length!==group.count||!weights.every(positive))return false;
 const updates=[];for(const table of group.members)cells(table,null,(node,pos,index)=>updates.push({node,pos,meta:withManualTableCellLayout(node.attrs.meta,{columnWeight:weights[index]})}));
 return commit(state,dispatch,updates,{tableId:options.tableId,kind:'columns'});
};
export const setManualTableRowHeight=(options={})=>(state,dispatch,view)=>{
 if(blocked(state,view,options))return false;const group=family(state.doc,options.tableId),index=options.rowIndex;
 if(!group||!Number.isInteger(index)||index<0||index>=group.target.node.childCount||!height(options.rowMinHeightPx))return false;
 const updates=[];for(const table of index===0?group.members:[group.target])cells(table,index,(node,pos)=>updates.push({node,pos,meta:withManualTableCellLayout(node.attrs.meta,{rowMinHeightPx:options.rowMinHeightPx})}));
 return commit(state,dispatch,updates,{tableId:options.tableId,kind:'row',rowIndex:index});
};
