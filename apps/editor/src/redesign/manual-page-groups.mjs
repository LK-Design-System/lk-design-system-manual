import {Fragment} from '@tiptap/pm/model';
import {AllSelection,NodeSelection,Selection,TextSelection} from '@tiptap/pm/state';
import {closeHistory} from '@tiptap/pm/history';
import {executeManualBlockCommand,findManualObject} from './manual-kernel.mjs';
import {manualPaginationMarker} from './manual-pagination-meta.mjs';
import {manualPaginationTextSelection} from './manual-pagination-selection.mjs';

function records(doc){
 const groups=[];let current=null;
 doc.forEach((node,pos)=>{
  if(node.type.name==='cover'){
   current={id:node.attrs.id,kind:'cover',pageIds:[node.attrs.id],nodes:[node],from:pos,to:pos+node.nodeSize};groups.push(current);return;
  }
  if(node.type.name!=='page'){current=null;return;}
  const marker=manualPaginationMarker(node.attrs.meta?.extensions,'page');
  if(current&&marker?.rootPageId===current.id){current.pageIds.push(node.attrs.id);current.nodes.push(node);current.to=pos+node.nodeSize;}
  else{current={id:node.attrs.id,kind:'page',pageIds:[node.attrs.id],nodes:[node],from:pos,to:pos+node.nodeSize};groups.push(current);}
 });return groups;
}

// Geometry callers add rects; model identity always includes consecutive tails.
export function getManualPageGroups(doc){return records(doc).map(({id,kind,pageIds})=>({id,kind,pageIds}));}

function pagePoint($pos){
 if($pos.depth<1)return null;
 const node=$pos.node(1);
 return ['page','cover'].includes(node.type.name)?{id:node.attrs.id,offset:$pos.pos-$pos.before(1)}:null;
}
function restoreSelection(state,tr){
 const selection=state.selection;
 try{
  if(selection instanceof AllSelection)return new AllSelection(tr.doc);
  if(selection.manualBlockSelection){
   const restored=Selection.fromJSON(tr.doc,selection.toJSON()),ids=new Set(selection.ids);
   return restored.ids.length===ids.size&&restored.ids.every(id=>ids.has(id))?restored:Selection.fromJSON(tr.doc,{...selection.toJSON(),ids:selection.ids});
  }
  if(selection.manualTableCellSelection){const restored=Selection.fromJSON(tr.doc,selection.toJSON());return restored.ids.length===selection.ids.length&&selection.ids.every(id=>restored.ids.includes(id))?restored:null;}
  if(selection instanceof NodeSelection){const found=findManualObject({doc:tr.doc},selection.node.attrs.id);return found?NodeSelection.create(tr.doc,found.pos):null;}
  if(!(selection instanceof TextSelection))return null;
  const points=[pagePoint(selection.$anchor),pagePoint(selection.$head)];
  if(points.some(point=>!point))return null;
  const positions=points.map(point=>{const found=findManualObject({doc:tr.doc},point.id);return found?found.pos+point.offset:null;});
  if(positions.some(pos=>pos===null))return null;
  return selection.manualPaginationTextSelection
   ?manualPaginationTextSelection(tr.doc,positions[0],positions[1],selection.excludedHeaders)
   :TextSelection.create(tr.doc,positions[0],positions[1]);
 }catch{return null;}
}
const blocked=(state,view,revision)=>view?.composing||view?.editable===false||revision!==undefined&&revision!==state.doc;

/** source/target are logical root IDs. A revision is the captured PM doc object. */
export const moveManualPageGroup=({sourceId,targetId,edge,revision}={})=>(state,dispatch,view)=>{
 if(blocked(state,view,revision)||!['before','after'].includes(edge))return false;
 const groups=records(state.doc),source=groups.find(group=>group.id===sourceId),target=groups.find(group=>group.id===targetId);
 if(!source||!target||source===target)return false;
 const next=groups.filter(group=>group!==source),slot=next.indexOf(target)+(edge==='after'?1:0);next.splice(slot,0,source);
 if(next.every((group,index)=>group===groups[index]))return false;
 const tr=closeHistory(state.tr),destination=edge==='before'?target.from:target.to;
 tr.delete(source.from,source.to);tr.insert(tr.mapping.map(destination),Fragment.fromArray(source.nodes));
 // Malformed/nonconsecutive old markers must not silently create a new group.
 if(JSON.stringify(getManualPageGroups(tr.doc))!==JSON.stringify(next.map(({id,kind,pageIds})=>({id,kind,pageIds}))))return false;
 const selection=restoreSelection(state,tr);if(!selection)return false;
 tr.setSelection(selection);tr.setStoredMarks(state.storedMarks);tr.doc.check();
 if(dispatch)dispatch(tr.setMeta('manualPageGroupMove',{sourceId,targetId,edge}).scrollIntoView());return true;
};

/** A physical root/tail button inserts after its whole logical page or cover. */
export const insertManualPageAfter=(pageId,{revision}={})=>(state,dispatch,view)=>{
 if(blocked(state,view,revision))return false;
 const group=records(state.doc).find(group=>group.pageIds.includes(pageId));if(!group)return false;
 return executeManualBlockCommand('page',{targetId:group.pageIds.at(-1),mode:'insert'})(state,dispatch,view);
};
