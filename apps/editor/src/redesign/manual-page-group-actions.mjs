import {Fragment} from '@tiptap/pm/model';
import {AllSelection,NodeSelection,Selection,TextSelection} from '@tiptap/pm/state';
import {closeHistory} from '@tiptap/pm/history';
import {getManualPageGroups} from './manual-page-groups.mjs';
import {manualPaginationMarker,remapManualPaginationMeta} from './manual-pagination-meta.mjs';
import {getManualPageProjection,remapManualPageProjectionMeta} from './manual-page-projection.mjs';
import {manualPaginationTextSelection} from './manual-pagination-selection.mjs';
import {newManualId} from './manual-v2.mjs';
import {getManualCoverProjection,getManualCoverCellProjection,remapManualCoverLayoutMeta} from './manual-cover-legacy-projection.mjs';
import {remapManualCoverFlowProvenanceMeta} from './manual-cover-flow-provenance.mjs';

export const MANUAL_PAGE_GROUP_ACTION_RESULT='manualPageGroupActionResult';
const actions=['move','duplicate','delete'];
const capability=reason=>({enabled:reason===null,reason});
const shape=group=>({id:group.id,kind:group.kind,pageIds:group.pageIds});
function records(doc){
 const pages=new Map();doc.forEach((node,pos)=>pages.set(node.attrs.id,{node,pos}));
 return getManualPageGroups(doc).map(group=>{
  const members=group.pageIds.map(id=>pages.get(id));
  return {...group,nodes:members.map(item=>item.node),from:members[0].pos,to:members.at(-1).pos+members.at(-1).node.nodeSize};
 });
}
function completeBundle(doc,selected){
 const selectedIds=new Set(),objects=new Map(),blockMarkers=[];
 doc.descendants(node=>{if(node.attrs.id)objects.set(node.attrs.id,node);const marker=manualPaginationMarker(node.attrs.meta?.extensions,'block');if(marker)blockMarkers.push({node,marker});});
 for(const group of selected){
  for(const node of group.nodes){if(node.attrs.id)selectedIds.add(node.attrs.id);node.descendants(child=>{if(child.attrs.id)selectedIds.add(child.attrs.id);});}
  // A recognized tail presented as a root is an orphan/nonconsecutive family.
  if(manualPaginationMarker(group.nodes[0].attrs.meta?.extensions,'page'))return false;
  let valid=true;doc.forEach(node=>{const marker=manualPaginationMarker(node.attrs.meta?.extensions,'page');if(marker?.rootPageId===group.id&&!group.pageIds.includes(node.attrs.id))valid=false;});
  if(!valid)return false;
 }
 for(const {node,marker} of blockMarkers){
  const root=objects.get(marker.rootBlockId),hit=selectedIds.has(node.attrs.id),rootHit=selectedIds.has(marker.rootBlockId);
  if((hit||rootHit)&&(!root||root.type.name!==marker.sourceType||hit!==rootHit))return false;
 }
 return true;
}
function inspect(state,options={},view){
 const {sourceIds,action,targetId,edge,revision,readOnly=false}=options;
 const groups=records(state.doc);let reason=null;
 if(readOnly||view?.editable===false)reason='read-only';
 else if(view?.composing)reason='composing';
 else if(revision!==undefined&&revision!==state.doc)reason='stale-revision';
 else if(!Array.isArray(sourceIds)||!sourceIds.length)reason='no-selection';
 else if(sourceIds.some(id=>typeof id!=='string'||!id)||new Set(sourceIds).size!==sourceIds.length)reason='invalid-source';
 const validSources=Array.isArray(sourceIds)&&sourceIds.length&&sourceIds.every(id=>typeof id==='string'&&id)&&new Set(sourceIds).size===sourceIds.length;
 const requested=new Set(validSources?sourceIds:[]),selected=groups.filter(group=>requested.has(group.id));
 if(!reason&&selected.length!==requested.size)reason='invalid-source';
 if(!reason&&!completeBundle(state.doc,selected))reason='incomplete-group';
 const remaining=groups.filter(group=>!requested.has(group.id)),target=groups.find(group=>group.id===targetId);
 let moveReason=reason;
 if(!moveReason&&(action==='move'||targetId!==undefined||edge!==undefined)){
  if(!target||!['before','after'].includes(edge))moveReason='invalid-target';
  else if(requested.has(target.id))moveReason='selected-target';
  else if(!completeBundle(state.doc,[target]))moveReason='incomplete-group';
  else{const next=[...remaining],slot=next.indexOf(target)+(edge==='after'?1:0);next.splice(slot,0,...selected);if(next.every((group,index)=>group===groups[index]))moveReason='no-op';}
 }
 if(!moveReason&&groups.length<2)moveReason='no-op';
 const duplicateReason=reason||(targetId!==undefined||edge!==undefined?'unsupported-target':null);
 const deleteReason=reason||(!remaining.length?'last-item':null);
 const result={sourceIds:selected.map(group=>group.id),physicalIds:selected.flatMap(group=>group.pageIds),move:capability(moveReason),duplicate:capability(duplicateReason),delete:capability(deleteReason)};
 if(action!==undefined){const current=actions.includes(action)?result[action]:capability('unsupported-action');result.enabled=current.enabled;result.reason=current.reason;}
 return {groups,selected,remaining,target,result};
}
/** Pure capability query. IDs are strict logical roots, returned in document order. */
export function getManualPageGroupActionState(state,options={},view){return inspect(state,options,view).result;}
function find(doc,id){let found=null;doc.descendants((node,pos)=>{if(node.attrs.id===id){found={node,pos};return false;}});return found;}
function copyBundle(nodes,doc){
 const used=new Set();doc.descendants(node=>{if(node.attrs.id)used.add(node.attrs.id);});used.add(doc.attrs.meta?.id);
 const idMap=new Map(),fresh=()=>{let id;do{id=newManualId();}while(used.has(id));used.add(id);return id;};
 const collect=node=>{if(node.attrs.id)idMap.set(node.attrs.id,fresh());node.forEach(collect);};nodes.forEach(collect);
 // Scalar cover roles are reprojected to canonical aliases on reopen. Use
 // those aliases from the first copy so internal links survive that projection.
 const scalarIds=node=>{
  const role=getManualCoverProjection(node.attrs.meta?.extensions);
  if(role&&role.blockId===node.attrs.id&&idMap.has(role.coverId)&&!role.editableTable){
   const base=`manual-cover:${idMap.get(role.coverId)}:${role.role}`;let id=base,suffix=2;
   while(used.has(id))id=`${base}:${suffix++}`;used.add(id);idMap.set(node.attrs.id,id);
  }
  node.forEach(scalarIds);
 };nodes.forEach(scalarIds);
 const clone=node=>{
  const marks=node.marks.map(mark=>mark.type.name==='link'&&typeof mark.attrs.href==='string'&&mark.attrs.href.startsWith('#')&&idMap.has(mark.attrs.href.slice(1))?mark.type.create({...mark.attrs,href:'#'+idMap.get(mark.attrs.href.slice(1))}):mark);
  if(node.isText)return node.mark(marks);
  const attrs=structuredClone(node.attrs);
  if(node.attrs.id)attrs.id=idMap.get(node.attrs.id);
  if(node.attrs.meta){
   attrs.meta=remapManualPageProjectionMeta(remapManualPaginationMeta(node.attrs.meta,idMap),idMap);
   attrs.meta=remapManualCoverFlowProvenanceMeta(attrs.meta,idMap);
   if(node.type.name==='cover'){
    const {id,...meta}=remapManualCoverLayoutMeta({...attrs.meta,id:attrs.id},idMap);attrs.meta=meta;
   }
   const coverRole=getManualCoverProjection(attrs.meta.extensions),cell=getManualCoverCellProjection(attrs.meta.extensions);
   if(coverRole){coverRole.coverId=idMap.get(coverRole.coverId)||coverRole.coverId;coverRole.blockId=idMap.get(coverRole.blockId)||coverRole.blockId;}
   if(cell){
    for(const field of ['coverId','tableId','cellId'])cell[field]=idMap.get(cell[field])||cell[field];
    if(cell.entry){cell.entry.id=idMap.get(cell.entry.id)||cell.entry.id;}
   }
   const inlineLinks=runs=>{for(const run of runs||[])for(const mark of run.marks||[])if(mark.type==='link'&&mark.href?.startsWith('#')&&idMap.has(mark.href.slice(1)))mark.href='#'+idMap.get(mark.href.slice(1));};
   if(coverRole?.originalInline)inlineLinks(coverRole.originalInline);
   if(cell?.entry){inlineLinks(cell.entry.label);inlineLinks(cell.entry.value);}
   const role=getManualPageProjection(attrs.meta.extensions);
   if(role?.derivedFrom&&idMap.has(role.derivedFrom))role.derivedFrom=idMap.get(role.derivedFrom);
  }
  return node.type.create(attrs,Fragment.fromArray(Array.from({length:node.childCount},(_,index)=>clone(node.child(index)))),marks);
 };
 return {nodes:nodes.map(clone),idMap};
}
function pagePoint($pos){for(let depth=1;depth<=$pos.depth;depth++){const node=$pos.node(depth);if(['page','cover'].includes(node.type.name))return {id:node.attrs.id,offset:$pos.pos-$pos.before(depth)};}return null;}
function restoreSelection(state,tr){
 const old=state.selection;
 try{
  if(old instanceof AllSelection)return new AllSelection(tr.doc);
  if(old.manualBlockSelection){
   const wanted=old.ids.filter(id=>find(tr.doc,id));
   if(wanted.length){
    let next;try{next=Selection.fromJSON(tr.doc,old.toJSON());}catch{}
    if(next&&next.ids.length===wanted.length&&wanted.every(id=>next.ids.includes(id)))return next;
    return Selection.fromJSON(tr.doc,{...old.toJSON(),ids:wanted});
   }
  }else if(old.manualTableCellSelection){const next=Selection.fromJSON(tr.doc,old.toJSON());if(next.ids.length===old.ids.length&&old.ids.every(id=>next.ids.includes(id)))return next;}
  else if(old instanceof NodeSelection){const object=find(tr.doc,old.node.attrs.id);if(object)return NodeSelection.create(tr.doc,object.pos);}
  else if(old instanceof TextSelection){
   const points=[pagePoint(old.$anchor),pagePoint(old.$head)];
   if(points.every(Boolean)){
    const positions=points.map(point=>{const page=find(tr.doc,point.id);return page&&point.offset<page.node.nodeSize?page.pos+point.offset:null;});
    if(positions.every(pos=>pos!==null))return old.manualPaginationTextSelection?manualPaginationTextSelection(tr.doc,...positions,old.excludedHeaders):TextSelection.create(tr.doc,...positions);
   }
  }else return old.map(tr.doc,tr.mapping);
 }catch{}
 return Selection.near(tr.doc.resolve(Math.max(0,Math.min(tr.doc.content.size,tr.mapping.map(old.head,1)))),1);
}
/** One transaction/one history entry for a complete sparse bundle. No dispatch is a dry run. */
export const applyManualPageGroupAction=(options={})=>(state,dispatch,view)=>{
 const plan=inspect(state,options,view),{action}=options;
 if(!plan.result.enabled)return false;
 const {groups,selected,remaining,target}=plan,tr=closeHistory(state.tr);
 let expected,resultGroups=selected;
 try{
  if(action==='duplicate'){
   const copied=copyBundle(selected.flatMap(group=>group.nodes),state.doc);
   resultGroups=selected.map(group=>({...group,id:copied.idMap.get(group.id),pageIds:group.pageIds.map(id=>copied.idMap.get(id))}));
   expected=[...groups];expected.splice(groups.indexOf(selected.at(-1))+1,0,...resultGroups);
   tr.insert(selected.at(-1).to,Fragment.fromArray(copied.nodes));
  }else{
   for(const group of [...selected].reverse())tr.delete(group.from,group.to);
   expected=[...remaining];
   if(action==='move'){
    const slot=remaining.indexOf(target)+(options.edge==='after'?1:0);expected.splice(slot,0,...selected);
    tr.insert(tr.mapping.map(options.edge==='before'?target.from:target.to),Fragment.fromArray(selected.flatMap(group=>group.nodes)));
   }else{resultGroups=[];tr.setMeta('manualExplicitDelete',true);}
  }
  if(JSON.stringify(getManualPageGroups(tr.doc))!==JSON.stringify(expected.map(shape)))return false;
  tr.doc.check();tr.setSelection(restoreSelection(state,tr));tr.setStoredMarks(state.storedMarks);
  tr.setMeta(MANUAL_PAGE_GROUP_ACTION_RESULT,{action,rootIds:resultGroups.map(group=>group.id),physicalIds:resultGroups.flatMap(group=>group.pageIds),...(action==='delete'?{remainingRootIds:remaining.map(group=>group.id)}:{})});
 }catch{return false;}
 if(dispatch)dispatch(tr.scrollIntoView());return true;
};
