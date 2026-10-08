import {getManualPageProjection,remapManualPageProjectionMeta} from './manual-page-projection.mjs';
import {ordinaryManualPageField} from './manual-page-shape.mjs';
import {Fragment,Slice} from '@tiptap/pm/model';
import {Plugin,Selection,SelectionRange,TextSelection} from '@tiptap/pm/state';
import {Decoration,DecorationSet} from '@tiptap/pm/view';
import {closeHistory} from '@tiptap/pm/history';
import {remapManualPaginationMeta,manualPaginationMarker} from './manual-pagination-meta.mjs';
import {getManualCoverProjection,withoutManualCoverRole} from './manual-cover-legacy-projection.mjs';

const selectable=node=>!['coverBody','coverSectionFrame'].includes(node.type.name)&&!getManualPageProjection(node.attrs.meta?.extensions)?.derivedFrom&&node.attrs.id&&(['step','listItem'].includes(node.type.name)||node.type.spec.group?.split(' ').some(group=>['block','stepBlock','calloutBlock','mediaBlock'].includes(group)));
function find(doc,id){let result=null;doc.descendants((node,pos,parent,index)=>{if(node.attrs.id===id)result={node,pos,parent,index};return !result;});return result;}
// Runtime-only cover layout containers are never selectable blocks.
const transparentBody=node=>['coverBody','coverSectionFrame'].includes(node.type.name);
function children(parent,pos){const result=[];parent.forEach((node,offset,index)=>{const at=pos+1+offset;if(transparentBody(node))result.push(...children(node,at));else if(selectable(node))result.push({node,pos:at,parent,index});});return result;}
function siblingGroups(items){const groups=[];for(const item of items){const previous=groups.at(-1)?.at(-1);if(previous&&previous.parent===item.parent&&previous.index+1===item.index)groups.at(-1).push(item);else groups.push([item]);}return groups;}
function topLevel(doc,item){
 const $pos=doc.resolve(item.pos);
 for(let depth=$pos.depth;depth>0;depth--){const parent=$pos.node(depth);if(['page','cover'].includes(parent.type.name)||transparentBody(parent)){
  const index=$pos.index(depth),pos=$pos.posAtIndex(index,depth),node=parent.child(index);return selectable(node)?{node,pos,parent,index}:null;
 }}return null;
}
function selectionParts(doc,anchorId,headId){
 let anchor=find(doc,anchorId),head=find(doc,headId);if(!anchor||!head||!selectable(anchor.node)||!selectable(head.node))return null;
 let groups=[];
 if(anchor.parent===head.parent){
  const low=Math.min(anchor.index,head.index),high=Math.max(anchor.index,head.index),parentPos=anchor.pos-doc.resolve(anchor.pos).parentOffset-1;
  groups=[children(anchor.parent,parentPos).filter(item=>item.parent===anchor.parent&&item.index>=low&&item.index<=high)];
 }else{
  anchor=topLevel(doc,anchor);head=topLevel(doc,head);if(!anchor||!head)return null;
  const low=Math.min(anchor.pos,head.pos),high=Math.max(anchor.pos,head.pos);
  doc.forEach((page,pos)=>{if(['page','cover'].includes(page.type.name)){const items=children(page,pos).filter(item=>item.pos>=low&&item.pos<=high);if(items.length)groups.push(...siblingGroups(items));}});
 }
 const items=groups.flat();if(!items.length)return null;
 // Every range consists of complete adjacent siblings; titles and page wrappers stay outside.
 if(groups.some(group=>group.some((item,i)=>i&&item.index!==group[i-1].index+1)))return null;
 const ranges=groups.map(group=>new SelectionRange(doc.resolve(group[0].pos),doc.resolve(group.at(-1).pos+group.at(-1).node.nodeSize)));
 const forward=anchor.pos<=head.pos;
 return {anchor,head,items,ranges,$anchor:doc.resolve(anchor.pos+(forward?0:anchor.node.nodeSize)),$head:doc.resolve(head.pos+(forward?head.node.nodeSize:0))};
}
function explicitSelectionParts(doc,ids){
 if(!Array.isArray(ids)||!ids.length||ids.some(id=>typeof id!=='string'))return null;
 const candidates=[...new Set(ids)].map(id=>find(doc,id));
 if(candidates.some(item=>!item||!selectable(item.node)))return null;
 candidates.sort((a,b)=>a.pos-b.pos);
 const items=candidates.filter(item=>!candidates.some(parent=>parent!==item&&parent.pos<item.pos&&parent.pos+parent.node.nodeSize>=item.pos+item.node.nodeSize));
 const groups=[];
 for(const item of items){const previous=groups.at(-1)?.at(-1);if(previous&&previous.parent===item.parent&&previous.index+1===item.index)groups.at(-1).push(item);else groups.push([item]);}
 const anchor=items[0],head=items.at(-1);
 return {anchor,head,items,ranges:groups.map(group=>new SelectionRange(doc.resolve(group[0].pos),doc.resolve(group.at(-1).pos+group.at(-1).node.nodeSize))),$anchor:doc.resolve(anchor.pos),$head:doc.resolve(head.pos+head.node.nodeSize)};
}
function incompletePaginationSelection(doc,items){
 const objects=new Map(),families=new Map(),markers=[];
 doc.descendants((node,pos)=>{if(node.attrs.id)objects.set(node.attrs.id,{node,pos});const marker=manualPaginationMarker(node.attrs.meta?.extensions,'block');if(marker){markers.push({id:node.attrs.id,marker});if(!families.has(marker.rootBlockId))families.set(marker.rootBlockId,new Set([marker.rootBlockId]));families.get(marker.rootBlockId).add(node.attrs.id);}});
 const includes=id=>{const object=objects.get(id);return object&&items.some(item=>object.pos>=item.pos&&object.pos+object.node.nodeSize<=item.pos+item.node.nodeSize);};
 if(markers.some(({id,marker})=>includes(id)&&objects.get(marker.rootBlockId)?.node.type.name!==marker.sourceType))return true;
 return [...families.values()].some(ids=>[...ids].some(includes)&&![...ids].every(includes));
}
function logicalFragmentIds(doc,ids){
 if(!Array.isArray(ids))return ids;
 const selected=new Set(ids),objects=new Map(),families=[];
 doc.descendants((node,pos)=>{if(node.attrs.id)objects.set(node.attrs.id,{node,pos});});
 doc.descendants((node,pos)=>{const marker=manualPaginationMarker(node.attrs.meta?.extensions,'block'),root=marker&&objects.get(marker.rootBlockId);if(root&&root.node.type.name===marker.sourceType)families.push([root,{node,pos}]);});
 let changed=true;
 while(changed){changed=false;for(const family of families){
  const hit=family.some(part=>[...selected].some(id=>{const item=objects.get(id);return item&&part.pos>=item.pos&&part.pos+part.node.nodeSize<=item.pos+item.node.nodeSize;}));
  if(hit)for(const part of family)if(!selected.has(part.node.attrs.id)){selected.add(part.node.attrs.id);changed=true;}
 }}return [...selected];
}
function identifyNodes(nodes){
 const ids=new Map(),collect=node=>{if(node.attrs.id)ids.set(node.attrs.id,crypto.randomUUID());node.forEach(collect);};nodes.forEach(collect);
 const clone=node=>{
  const marks=node.marks.map(mark=>mark.type.name==='link'&&mark.attrs.href.startsWith('#')&&ids.has(mark.attrs.href.slice(1))?mark.type.create({...mark.attrs,href:'#'+ids.get(mark.attrs.href.slice(1))}):mark);
  if(node.isText)return node.mark(marks);
  const attrs={...structuredClone(node.attrs),...(Object.hasOwn(node.attrs,'id')?{id:ids.get(node.attrs.id)||crypto.randomUUID()}:{})};
  if(Object.hasOwn(attrs,'meta'))attrs.meta=remapManualPageProjectionMeta(remapManualPaginationMeta(attrs.meta,ids),ids);
  const copied=node.type.create(attrs,Fragment.fromArray(Array.from({length:node.childCount},(_,i)=>clone(node.child(i)))),marks);return ['pageTitle','pageLead'].includes(copied.type.name)&&!getManualPageProjection(copied.attrs.meta?.extensions)?ordinaryManualPageField(copied):copied;
 };return nodes.map(clone);
}
function rangeReplacement($from,$to,fragment=Fragment.empty){
 const parent=$from.parent,from=$from.index(),to=$to.index();
 if(parent!==$to.parent)throw new RangeError('Block ranges must contain siblings.');
 if(!fragment.size&&parent.type.name==='page'&&from===0&&to===parent.childCount)return Fragment.from(parent.type.schema.nodes.paragraph.create({id:crypto.randomUUID(),meta:{}}));
 if(parent.canReplace(from,to,fragment))return fragment;
 // Deleting every quote paragraph/list item/step leaves the smallest valid editable child.
 if(fragment.size)throw new RangeError('The selected blocks cannot contain this content.');
 const fill=parent.contentMatchAt(from).fillBefore(parent.content.cutByIndex(to),true);
 if(!fill||!parent.canReplace(from,to,fill))throw new RangeError('The selected blocks cannot be removed.');
 return Fragment.fromArray(identifyNodes(Array.from({length:fill.childCount},(_,i)=>fill.child(i))));
}
function replacementSlice(schema,slice){
 let content=slice.content;
 if(content.firstChild?.isInline)content=Fragment.from(schema.nodes.paragraph.create({id:crypto.randomUUID(),meta:{}},content));
 return content;
}
function coverOwnerAt(doc,pos){const $pos=doc.resolve(pos);for(let depth=$pos.depth;depth>0;depth--)if($pos.node(depth).type.name==='cover')return $pos.node(depth).attrs.id;return null;}
function replaceBlockRanges(selection,tr,slice=Slice.empty){
  if(selection.manualIncompletePaginationSelection)throw new RangeError('Select the complete automatic block before replacing its content.');
  const mapFrom=tr.steps.length,fragment=replacementSlice(tr.doc.type.schema,slice),first=selection.ranges[0].$from.pos;
  for(let i=selection.ranges.length-1;i>=0;i--){
   const range=selection.ranges[i],mapping=tr.mapping.slice(mapFrom),from=mapping.map(range.$from.pos),to=mapping.map(range.$to.pos);
   const next=rangeReplacement(tr.doc.resolve(from),tr.doc.resolve(to),i===0?fragment:Fragment.empty);tr.replaceWith(from,to,next);
  }
  const at=Math.min(tr.doc.content.size,tr.mapping.slice(mapFrom).map(first,1));
  // Replacement input continues at the end of the inserted body, rather than
  // searching backward from its start into the page/container title.
  const end=Math.min(tr.doc.content.size,at+fragment.size);
  tr.setSelection(Selection.near(tr.doc.resolve(fragment.size?end:at),-1));
}
export class ManualBlockSelection extends Selection{
 constructor(doc,anchorId,headId=anchorId,ids=null){
  const parts=ids?explicitSelectionParts(doc,ids):selectionParts(doc,anchorId,headId);if(!parts)throw new RangeError('The block range is unavailable.');
  super(parts.$anchor,parts.$head,parts.ranges);this.anchorId=parts.anchor.node.attrs.id;this.headId=parts.head.node.attrs.id;this.items=parts.items;this.manualBlockSelection=true;
  if(ids){this.explicitIds=parts.items.map(item=>item.node.attrs.id);this.manualSparseBlockSelection=true;this.manualIncompletePaginationSelection=incompletePaginationSelection(doc,parts.items);}
 }
 get ids(){return this.items.map(item=>item.node.attrs.id);}
 get $to(){return this.ranges.at(-1).$to;}
 eq(other){return other instanceof ManualBlockSelection&&other.anchorId===this.anchorId&&other.headId===this.headId&&other.from===this.from&&other.to===this.to&&JSON.stringify(other.explicitIds)===JSON.stringify(this.explicitIds);}
 map(doc,mapping){try{return this.explicitIds?new ManualBlockSelection(doc,null,null,this.explicitIds.filter(id=>find(doc,id))):new ManualBlockSelection(doc,this.anchorId,this.headId);}catch{return Selection.near(doc.resolve(Math.min(doc.content.size,mapping.map(this.head))));}}
 content(){return new Slice(Fragment.fromArray(this.items.map(item=>item.node)),0,0);}
 toJSON(){return {type:'manual-block',anchorId:this.anchorId,headId:this.headId,...(this.explicitIds?{ids:this.explicitIds}: {})};}
 static fromJSON(doc,json){return new ManualBlockSelection(doc,json.anchorId,json.headId,json.ids);}
 getBookmark(){const {anchorId,headId,head,explicitIds}=this;return blockBookmark(anchorId,headId,head,explicitIds);}
 replace(tr,slice=Slice.empty){replaceBlockRanges(this,tr,slice);}
 replaceWith(tr,node){this.replace(tr,new Slice(Fragment.from(node),0,0));}
}
ManualBlockSelection.prototype.visible=false;
Selection.jsonID('manual-block',ManualBlockSelection);
function resolveBookmark(doc,anchorId,headId,fallback,ids){try{return new ManualBlockSelection(doc,anchorId,headId,ids?.filter(id=>find(doc,id)));}catch{return Selection.near(doc.resolve(Math.min(doc.content.size,fallback)));}}
function blockBookmark(anchorId,headId,fallback,ids){return {map:mapping=>blockBookmark(anchorId,headId,mapping.map(fallback),ids),resolve:doc=>resolveBookmark(doc,anchorId,headId,fallback,ids)};}
const guarded=fn=>(state,dispatch,view)=>view?.composing?false:fn(state,dispatch,view);
export const selectManualBlocks=(anchorId,headId=anchorId)=>guarded((state,dispatch)=>{
 let selection;try{selection=new ManualBlockSelection(state.doc,anchorId,headId);}catch{return false;}
 if(dispatch)dispatch(state.tr.setSelection(selection).scrollIntoView());return true;
});
export const selectManualBlockIds=(ids,{logicalFragments=true}={})=>guarded((state,dispatch)=>{
 let selection;try{selection=new ManualBlockSelection(state.doc,null,null,logicalFragments?logicalFragmentIds(state.doc,ids):ids);}catch{return false;}
 if(dispatch)dispatch(state.tr.setSelection(selection));return true;
});
export const selectCurrentManualBlock=guarded((state,dispatch)=>{
 // Cell ranges retain their table selection semantics, including Escape.
 if(state.selection.manualTableCellSelection)return false;
 if(state.selection instanceof ManualBlockSelection){
  const head=find(state.doc,state.selection.headId);
  if(head?.node.isAtom){if(dispatch)dispatch(state.tr.setSelection(Selection.near(state.doc.resolve(head.pos+head.node.nodeSize))).scrollIntoView());return true;}
  return editSelectedManualBlocks(state,dispatch);
 }
 const selected=state.selection.node;if(selected&&selectable(selected))return selectManualBlocks(selected.attrs.id)(state,dispatch);
 for(let depth=state.selection.$from.depth;depth>0;depth--){const node=state.selection.$from.node(depth);if(selectable(node))return selectManualBlocks(node.attrs.id)(state,dispatch);}
 return false;
});
export const editSelectedManualBlocks=guarded((state,dispatch)=>{
 if(!(state.selection instanceof ManualBlockSelection))return false;
 const head=find(state.doc,state.selection.headId);
 if(head.node.isAtom){
  const after=head.pos+head.node.nodeSize,index=head.index+1,node=head.parent.maybeChild(index);
  if(node?.type.name==='paragraph'){if(dispatch)dispatch(state.tr.setSelection(TextSelection.create(state.doc,after+1)).scrollIntoView());return true;}
  if(!head.parent.canReplaceWith(index,index,state.schema.nodes.paragraph))return false;
  if(dispatch){const tr=closeHistory(state.tr).insert(after,state.schema.nodes.paragraph.create({id:crypto.randomUUID(),meta:{}}));tr.setSelection(TextSelection.create(tr.doc,after+1));dispatch(tr.scrollIntoView());}return true;
 }
 const next=Selection.findFrom(state.doc.resolve(head.pos+1),1,true);
 if(!next||next.from>=head.pos+head.node.nodeSize)return false;
 if(dispatch)dispatch(state.tr.setSelection(next).scrollIntoView());return true;
});
export const extendManualBlockSelection=direction=>guarded((state,dispatch)=>{
 if(!(state.selection instanceof ManualBlockSelection)||state.selection.manualSparseBlockSelection||![-1,1].includes(direction))return false;
 const selection=state.selection,head=find(state.doc,selection.headId),parentPos=head.pos-state.doc.resolve(head.pos).parentOffset-1;
 let peers=children(head.parent,parentPos),at=peers.findIndex(item=>item.node.attrs.id===selection.headId),next=peers[at+direction];
 if(!next&&(['page','cover'].includes(head.parent.type.name)||transparentBody(head.parent))){peers=[];state.doc.forEach((page,pos)=>{if(['page','cover'].includes(page.type.name))peers.push(...children(page,pos));});at=peers.findIndex(item=>item.node.attrs.id===selection.headId);next=peers[at+direction];}
 return next?selectManualBlocks(selection.anchorId,next.node.attrs.id)(state,dispatch):false;
});
export const deleteSelectedManualBlocks=guarded((state,dispatch)=>{
 if(!(state.selection instanceof ManualBlockSelection))return false;
 const tr=closeHistory(state.tr);try{state.selection.replace(tr);}catch{return false;}
 if(dispatch)dispatch(tr.scrollIntoView());return true;
});
export const duplicateSelectedManualBlocks=guarded((state,dispatch)=>{
 const selection=state.selection;if(!(selection instanceof ManualBlockSelection)||selection.manualIncompletePaginationSelection)return false;
 const fragment=Fragment.fromArray(identifyNodes(selection.items.map(item=>item.node))),$to=selection.$to;
 if(!$to.parent.canReplace($to.index(),$to.index(),fragment))return false;
 if(dispatch){const tr=closeHistory(state.tr).insert(selection.to,fragment);tr.setSelection(new ManualBlockSelection(tr.doc,fragment.firstChild.attrs.id,fragment.lastChild.attrs.id));dispatch(tr.scrollIntoView());}return true;
});
export const moveSelectedManualBlocks=({direction,parentId,index,coverHeader=false}={})=>guarded((state,dispatch)=>{
 const selection=state.selection;if(!(selection instanceof ManualBlockSelection)||selection.manualIncompletePaginationSelection)return false;
 let parent,pos,at;
 if(direction){if(selection.manualSparseBlockSelection||selection.ranges.length!==1||!['up','down'].includes(direction))return false;parent=selection.$from.parent;pos=selection.from-selection.$from.parentOffset-1;at=direction==='up'?selection.$from.index()-1:selection.$to.index()+1;}
 else{const target=find(state.doc,parentId);if(!target)return false;parent=target.node;pos=target.pos;at=index;
  if(parent.type.name==='cover'&&!coverHeader){
   let body=null;parent.descendants((node,offset)=>{if(node.type.name==='coverBody')body={node,pos:pos+1+offset};});
   if(body){parent=body.node;pos=body.pos;}
  }
 }
 // Required layout children remain last; the caller's final gap is before them.
 if(['cover','coverSectionFrame'].includes(parent.type.name)&&at===parent.childCount)at=parent.childCount-1;
 if(!Number.isInteger(at)||at<0||at>parent.childCount)return false;
 const coverId=coverOwnerAt(state.doc,pos+1);
 const fragment=Fragment.fromArray(selection.items.map(({node})=>{const role=getManualPageProjection(node.attrs.meta?.extensions);let moved=role&&role.pageId!==parent.attrs.id?ordinaryManualPageField(node):node;const coverRole=getManualCoverProjection(moved.attrs.meta?.extensions);if(coverRole?.blockId===moved.attrs.id&&coverRole.coverId!==coverId)moved=moved.type.create({...moved.attrs,meta:withoutManualCoverRole(moved.attrs.meta)},moved.content,moved.marks);return moved;}));if(!parent.canReplace(at,at,fragment))return false;
 let destination=pos+1;for(let i=0;i<at;i++)destination+=parent.child(i).nodeSize;
 if(selection.ranges.some(range=>destination>=range.$from.pos&&destination<=range.$to.pos))return false;
 const tr=closeHistory(state.tr);try{replaceBlockRanges(selection,tr);}catch{return false;}
 const mapped=tr.mapping.map(destination);tr.insert(mapped,fragment);
 try{tr.setSelection(new ManualBlockSelection(tr.doc,fragment.firstChild.attrs.id,fragment.lastChild.attrs.id));}catch{return false;}
 if(dispatch)dispatch(tr.scrollIntoView());return true;
});
export function manualBlockSelectionPlugin(){return new Plugin({props:{
 decorations(state){if(!(state.selection instanceof ManualBlockSelection))return null;return DecorationSet.create(state.doc,state.selection.items.map(({node,pos})=>Decoration.node(pos,pos+node.nodeSize,{class:'manual-block-selected','data-manual-block-selected':'true'})));},
 handleKeyDown(view,event){
  if(view.composing||event.isComposing)return false;
  const selection=view.state.selection,isBlocks=selection instanceof ManualBlockSelection,mod=event.ctrlKey||event.metaKey;
  let command=null;
  if(event.key==='Escape'&&!mod&&!event.shiftKey)command=selectCurrentManualBlock;
  else if(isBlocks&&event.shiftKey&&!mod&&!event.altKey&&['ArrowUp','ArrowDown'].includes(event.key))command=extendManualBlockSelection(event.key==='ArrowUp'?-1:1);
  else if(isBlocks&&mod&&event.shiftKey&&['ArrowUp','ArrowDown'].includes(event.key))command=moveSelectedManualBlocks({direction:event.key==='ArrowUp'?'up':'down'});
  else if(isBlocks&&mod&&!event.shiftKey&&event.key.toLowerCase()==='d')command=duplicateSelectedManualBlocks;
  else if(isBlocks&&['Backspace','Delete'].includes(event.key))command=deleteSelectedManualBlocks;
  else if(isBlocks&&event.key==='Enter')command=editSelectedManualBlocks;
  if(command){const handled=command(view.state,view.dispatch,view);if(handled||isBlocks&&['Enter','Backspace','Delete','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();return true;}}
  return false;
 },
 handleDOMEvents:{beforeinput(view,event){if(!(view.state.selection instanceof ManualBlockSelection)||view.composing||event.isComposing)return false;if(['deleteContentBackward','deleteContentForward','deleteByCut'].includes(event.inputType)){event.preventDefault();deleteSelectedManualBlocks(view.state,view.dispatch,view);return true;}return false;}}
}});}
