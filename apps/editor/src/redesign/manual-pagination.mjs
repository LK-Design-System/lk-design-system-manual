import {manualPaginationPageParts,manualContinuationTitle} from './manual-page-shape.mjs';
import {Fragment,Slice} from '@tiptap/pm/model';
import {Selection,NodeSelection,TextSelection} from '@tiptap/pm/state';
import {ReplaceAroundStep} from '@tiptap/pm/transform';
import {ManualBlockSelection} from './manual-block-selection.mjs';
import {manualPaginationMarker,withManualPaginationMarker,withoutManualPaginationMarker} from './manual-pagination-meta.mjs';
import {manualPaginationTextSelection,repeatedManualPaginationHeaders} from './manual-pagination-selection.mjs';
import {readManualCoverFlowProvenance,withManualCoverFlowProvenance} from './manual-cover-flow-provenance.mjs';

export const MAX_MANUAL_PAGINATION_PASSES=128;
export const MAX_MANUAL_AUTO_PAGES=1000;
const children=node=>Array.from({length:node.childCount},(_,index)=>node.child(index));
const finite=value=>Number.isFinite(value)&&value>=0;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const freshId=()=>crypto.randomUUID();
const graphemes=new Intl.Segmenter(undefined,{granularity:'grapheme'});
const titledContainer=node=>['callout','toggle'].includes(node.type.name);
const textContainer=node=>['callout','quote','toggle'].includes(node.type.name);
function pagesOf(doc,{coverFlow=false}={}){
 const pages=[];let root=null;
 doc.forEach((node,pos)=>{
  const flow=readManualCoverFlowProvenance(node.attrs.meta?.extensions);
  if(node.type.name!=='page'&&!(node.type.name==='cover'&&(coverFlow||flow?.coverId===node.attrs.id))){root=null;return;}
  const marker=manualPaginationMarker(node.attrs.meta.extensions,'page'),automatic=Boolean(root&&marker?.rootPageId===root.node.attrs.id);
  const shape=manualPaginationPageParts(node,pos),page={node,pos,...shape,automatic};if(!automatic)root=page;page.root=root;pages.push(page);
 });return pages;
}
function boundary(node,split){
 if(!split||!Number.isInteger(split.at))return null;
 const type=node.type.name;
 if(split.kind==='text'&&['paragraph','heading','todo','codeBlock'].includes(type)){
  const at=split.at;if(at<=0||at>=node.content.size)return null;
  // PM positions are UTF-16 offsets; never cut a surrogate pair.
  const text=node.textBetween(0,node.content.size,'','\n');if(graphemes.segment(text).containing(at)?.index!==at)return null;
  return {offset:1+at,split,at};
 }
 if(split.kind==='nested-text'&&textContainer(node)&&Number.isInteger(split.childIndex)){
  const index=split.childIndex+(titledContainer(node)?1:0),child=node.maybeChild(index);if(split.childIndex<0||!child)return null;
  const inner=boundary(child,{kind:'text',at:split.at});if(!inner)return null;let offset=1;for(let i=0;i<index;i++)offset+=node.child(i).nodeSize;
  return {offset:offset+inner.offset,split,index,at:split.at};
 }
 if(split.kind==='child'&&(['bulletList','orderedList','procedure','table'].includes(type)||textContainer(node))){
  const count=type==='table'||titledContainer(node)?split.at+1:split.at;
  if(split.at<1||count>=node.childCount)return null;
  let offset=1;for(let i=0;i<count;i++)offset+=node.child(i).nodeSize;return {offset,split,at:split.at,count};
 }return null;
}
function fittingSplit(block,measure,available,epsilon){
 return (measure.splits||[]).filter(split=>split&&finite(split.headHeight)&&finite(split.tailHeight)&&split.headHeight>0&&split.tailHeight>0&&split.headHeight<=available+epsilon&&boundary(block.node,split)).sort((a,b)=>boundary(block.node,b).offset-boundary(block.node,a).offset)[0]||null;
}
function diagnostic(page,block,reason){return {pageId:page.node.attrs.id,blockId:block?.node.attrs.id,type:block?.node.type.name,reason};}
/**
 * Measurements are for one canonical A4 width. capacity excludes the page's
 * title/lead and insets; occupied block heights include the inter-block spacing.
 * splits contain measured head/tail occupied heights, not guessed text lengths.
 * pullGap accounts for extra measured spacing when the next block joins this page.
 * One action is returned per pass; the UI must render and measure its new doc.
 */
export function planManualPagination(state,measurement,{pass=0,maxPasses=MAX_MANUAL_PAGINATION_PASSES,maxAutoPages=MAX_MANUAL_AUTO_PAGES,epsilon=.5}={}){
 const doc=state.doc;if(measurement?.doc!==doc)return {status:'stale',diagnostics:[]};
 if(!Number.isInteger(pass)||pass<0||!Number.isInteger(maxPasses)||maxPasses<1||maxPasses>MAX_MANUAL_PAGINATION_PASSES||!Number.isInteger(maxAutoPages)||maxAutoPages<0||maxAutoPages>MAX_MANUAL_AUTO_PAGES||!finite(epsilon)||epsilon>1)return {status:'invalid',diagnostics:[{reason:'limits'}]};
 const coverFlow=measurement.coverFlow===true,pages=pagesOf(doc,{coverFlow}),records=measurement.pages;
 if(!Array.isArray(records)||records.length!==pages.length)return {status:'invalid',diagnostics:[{reason:'page-measurements'}]};
 for(let i=0;i<pages.length;i++){
  const page=pages[i],record=records[i];
  if(!record||record.id!==page.node.attrs.id||!finite(record.capacity)||record.capacity===0&&!page.headers.length||record.pullGap!==undefined&&!finite(record.pullGap)||!Array.isArray(record.blocks)||record.blocks.length!==page.blocks.length||record.blocks.some((block,index)=>!block||block.id!==page.blocks[index].node.attrs.id||!finite(block.height)||block.splits!==undefined&&!Array.isArray(block.splits)))return {status:'invalid',diagnostics:[{reason:'block-measurements',pageId:page.node.attrs.id}]};
  page.measure=record;
 }
 const diagnostics=[],ready=action=>pass>=maxPasses?{status:'limit',diagnostics:[...diagnostics,{reason:'pass-limit'}]}:({status:'ready',doc,coverFlow,revision:measurement.revision,action,diagnostics});
 const autoCount=pages.filter(page=>page.automatic).length;
 for(let i=0;i<pages.length;i++){
  const page=pages[i],record=page.measure,next=pages[i+1],sameGroup=next?.automatic&&next.root===page.root;
  if(record.capacity===0){diagnostics.push({pageId:page.node.attrs.id,reason:'fixed-header-overflow'});continue;}
  if(page.automatic&&(!!page.title!==!!page.root.title||page.title&&!page.title.node.content.eq(page.root.title.node.content)))return ready({type:'title',pageId:page.node.attrs.id,rootPageId:page.root.node.attrs.id});
  if(sameGroup&&!next.blocks.length)return ready({type:'remove-empty',pageId:next.node.attrs.id});
  let occupied=0,overflow=-1,split=null;
  for(let j=0;j<page.blocks.length;j++){
   const measured=record.blocks[j];if(occupied+measured.height>record.capacity+epsilon){overflow=j;split=fittingSplit(page.blocks[j],measured,record.capacity-occupied,epsilon);break;}occupied+=measured.height;
  }
  if(overflow>=0){
   if(!split&&overflow===0){diagnostics.push(diagnostic(page,page.blocks[0],'oversize-unsplittable'));if(page.blocks.length<2)continue;overflow=1;}
   if(!sameGroup&&autoCount>=maxAutoPages)return {status:'limit',diagnostics:[...diagnostics,diagnostic(page,page.blocks[overflow],'page-limit')]};
   return ready({type:'push',pageId:page.node.attrs.id,blockId:page.blocks[overflow].node.attrs.id,...(split?{split}:{}),...(sameGroup?{nextPageId:next.node.attrs.id}:{})});
  }
  if(sameGroup&&next.blocks.length){
   const available=record.capacity-occupied-(record.pullGap||0),block=next.blocks[0],measured=next.measure.blocks[0];
   if(measured.height<=available+epsilon)return ready({type:'pull',pageId:page.node.attrs.id,nextPageId:next.node.attrs.id,blockId:block.node.attrs.id});
   const candidate=fittingSplit(block,measured,available,epsilon);if(candidate)return ready({type:'pull',pageId:page.node.attrs.id,nextPageId:next.node.attrs.id,blockId:block.node.attrs.id,split:candidate});
  }
 }
 return {status:diagnostics.length?'blocked':'stable',diagnostics};
}
function find(doc,id){let found=null;doc.descendants((node,pos,parent,index)=>{if(node.attrs.id===id)found={node,pos,parent,index};return !found;});return found;}
function pageFor(doc,id){return pagesOf(doc,{coverFlow:true}).find(page=>page.node.attrs.id===id);}
function continuationAttrs(node){
 const old=manualPaginationMarker(node.attrs.meta.extensions,'block'),meta=withManualPaginationMarker(node.attrs.meta,{kind:'block',rootBlockId:old?.rootBlockId||node.attrs.id,sourceType:node.type.name,...(node.type.name==='table'?{repeatedHeader:true}:titledContainer(node)?{repeatedTitle:true}:{})});
 return {...structuredClone(node.attrs),id:freshId(),meta};
}
function splitBlock(tr,id,split){
 let block=find(tr.doc,id),at=block&&boundary(block.node,split);if(!at)return null;
 const nested=[];
 if(split.kind==='nested-text'){
  const child=block.node.child(at.index),part=splitBlock(tr,child.attrs.id,{kind:'text',at:split.at});if(!part)return null;nested.push(part);
  block=find(tr.doc,id);const bodyIndex=split.childIndex+1;at=boundary(block.node,{kind:'child',at:bodyIndex});if(!at)return null;
 }
 const attrs=continuationAttrs(block.node);
 if(['orderedList','procedure'].includes(block.node.type.name))attrs.meta.start=(block.node.attrs.meta.start||1)+at.count;
 if(titledContainer(block.node)){
  const right=block.node.type.create(attrs,[block.node.firstChild]),slice=new Slice(Fragment.fromArray([block.node.copy(Fragment.empty),right]),1,0),from=block.pos+at.offset,to=block.pos+block.node.nodeSize;
  tr.step(new ReplaceAroundStep(from,to,from,to-1,slice,2+right.content.size));
 }else tr.split(block.pos+at.offset,1,[{type:block.node.type,attrs}]);
 if(block.node.type.name==='table'){
  const tail=find(tr.doc,attrs.id),header=block.node.firstChild;
  const copied=header.type.create(header.attrs,children(header).map(cell=>cell.type.create({...structuredClone(cell.attrs),id:freshId()},cell.content,cell.marks)));
  tr.insert(tail.pos+1,copied);
 }
 return {sourceId:id,tailId:attrs.id,...(nested.length?{nested}:{})};
}
function pageHeader(page){return Fragment.fromArray(page.headers.map(item=>item.node));}
function movePageBody(tr,page,next,blocks){
 const selection=tr.selection;
 const content=blocks.map(item=>item.node);for(const item of blocks.toReversed())tr.delete(item.pos,item.pos+item.node.nodeSize);
 const target=next&&pageFor(tr.doc,next.node.attrs.id);if(target){const at=target.blocks[0]?.pos??target.body.pos+target.body.node.nodeSize-1;tr.insert(at,content);}
 else{const current=pageFor(tr.doc,page.node.attrs.id),id=freshId(),title=manualContinuationTitle(page.root.node,id),node=tr.doc.type.schema.nodes.page.create({id,meta:withManualPaginationMarker({}, {kind:'page',rootPageId:page.root.node.attrs.id})},[...(title?[title]:[]),...content]);tr.insert(current.pos+current.node.nodeSize,node);}restoreMovedSelection({selection},tr);return true;
}
function pushBlocks(tr,pageId,blockId,nextPageId){
 const page=pageFor(tr.doc,pageId),block=page?.blocks.find(block=>block.node.attrs.id===blockId);if(!page||!block)return false;
 const next=nextPageId?pageFor(tr.doc,nextPageId):null;
 if(next&&(next.pos!==page.pos+page.node.nodeSize||!next.automatic||next.root.node.attrs.id!==page.root.node.attrs.id))return false;
 if(!page.leading||next&&!next.leading)return movePageBody(tr,page,next,page.blocks.slice(page.blocks.indexOf(block)));
 const id=freshId(),title=manualContinuationTitle(page.root.node,id);
 const continuation=next?.node.copy(pageHeader(next))||page.node.type.create({id,meta:withManualPaginationMarker({}, {kind:'page',rootPageId:page.root.node.attrs.id})},title?[title]:[]);
 const slice=new Slice(Fragment.fromArray([page.node.copy(Fragment.empty),continuation]),1,next?1:0),insert=1+continuation.content.size+1;
 tr.step(new ReplaceAroundStep(block.pos,next?next.bodyStart:page.pos+page.node.nodeSize,block.pos,page.pos+page.node.nodeSize-1,slice,insert));return true;
}
function pullBlock(tr,pageId,nextPageId,blockId){
 const page=pageFor(tr.doc,pageId),next=pageFor(tr.doc,nextPageId),block=next?.blocks[0];
 if(!page||!next||!block||block.node.attrs.id!==blockId||next.pos!==page.pos+page.node.nodeSize||!next.automatic||next.root.node.attrs.id!==page.root.node.attrs.id)return false;
 if(!page.leading||!next.leading){const selection=tr.selection;tr.delete(block.pos,block.pos+block.node.nodeSize);const current=pageFor(tr.doc,pageId);tr.insert(current.body.pos+current.body.node.nodeSize-1,block.node);if(next.blocks.length===1){const empty=pageFor(tr.doc,nextPageId);tr.delete(empty.pos,empty.pos+empty.node.nodeSize);}restoreMovedSelection({selection},tr);return true;}
 const last=next.blocks.length===1,slice=new Slice(Fragment.fromArray([page.node.copy(Fragment.empty),...(last?[]:[next.node.copy(pageHeader(next))])]),1,last?0:1);
 tr.step(new ReplaceAroundStep(page.pos+page.node.nodeSize-1,last?next.pos+next.node.nodeSize:block.pos+block.node.nodeSize,block.pos,block.pos+block.node.nodeSize,slice,0));return true;
}
function mergeable(left,right){
 const marker=manualPaginationMarker(right.attrs.meta.extensions,'block'),leftMarker=manualPaginationMarker(left.attrs.meta.extensions,'block');
 if(!marker||marker.rootBlockId!==(leftMarker?.rootBlockId||left.attrs.id)||marker.sourceType!==left.type.name||left.type!==right.type)return false;
 const a=withoutManualPaginationMarker(left.attrs.meta,'block'),b=withoutManualPaginationMarker(right.attrs.meta,'block');
 if(['orderedList','procedure'].includes(left.type.name)){if((b.start||1)!==(a.start||1)+left.childCount)return false;delete a.start;delete b.start;}
 if(!same({...left.attrs,id:null,meta:a},{...right.attrs,id:null,meta:b}))return false;
 if(left.type.name==='table'){
  if(!marker.repeatedHeader||left.firstChild.childCount!==right.firstChild.childCount)return false;
  for(let i=0;i<left.firstChild.childCount;i++){const x=left.firstChild.child(i),y=right.firstChild.child(i);if(!x.content.eq(y.content)||!same({...x.attrs,id:null},{...y.attrs,id:null}))return false;}
 }
 if(titledContainer(left)&&(!marker.repeatedTitle||!left.firstChild.eq(right.firstChild)))return false;
 return true;
}
function mergeFragments(tr,parentId){
 const merged=[];let parent=find(tr.doc,parentId);if(!parent)return merged;
 for(let index=parent.node.childCount-1;index>0;index--){
  parent=find(tr.doc,parentId);const left=parent.node.maybeChild(index-1),right=parent.node.maybeChild(index);if(!left?.attrs.id||!right?.attrs.id||!mergeable(left,right))continue;
  const found=find(tr.doc,right.attrs.id),header=right.type.name==='table'||titledContainer(right)?right.firstChild.nodeSize:0;
  if(header)tr.delete(found.pos-1,found.pos+1+header);else tr.join(found.pos);
  merged.push({removedId:right.attrs.id,keptId:left.attrs.id});
 }
 parent=find(tr.doc,parentId);for(const node of children(parent.node))if(node.attrs.id&&node.childCount&&!node.isTextblock)merged.push(...mergeFragments(tr,node.attrs.id));return merged;
}
function restoreMovedSelection(state,tr){
 const old=state.selection;if(old instanceof NodeSelection){const found=find(tr.doc,old.node.attrs.id);if(found)tr.setSelection(NodeSelection.create(tr.doc,found.pos));return;}
 if(old.manualBlockSelection){try{tr.setSelection(Selection.fromJSON(tr.doc,old.toJSON()));}catch{}return;}
 if(!(old instanceof TextSelection))return;
 const point=$pos=>{for(let d=$pos.depth;d>0;d--){const id=$pos.node(d).attrs.id;if(!id)continue;const target=find(tr.doc,id);return target?target.pos+1+Math.min($pos.pos-$pos.before(d)-1,target.node.content.size):null;}return null;},anchor=point(old.$anchor),head=point(old.$head);
 if(anchor!==null&&head!==null){const $a=tr.doc.resolve(anchor),$h=tr.doc.resolve(head);if($a.parent.inlineContent&&$h.parent.inlineContent)tr.setSelection(TextSelection.create(tr.doc,anchor,head));}
}
function preserveBlockSelection(state,tr,splits,merges){
 if(!splits.length&&!merges.length)return;
 const remap=id=>{for(const merge of merges)if(merge.removedId===id)id=merge.keptId;return id;};
 if(state.selection instanceof NodeSelection){const id=state.selection.node.attrs.id,part=splits.find(part=>part.sourceId===id),first=remap(id),last=remap(part?.tailId||id),found=find(tr.doc,first);if(found){tr.setSelection(first===last?NodeSelection.create(tr.doc,found.pos):new ManualBlockSelection(tr.doc,first,last));}return;}
 if(!state.selection.manualBlockSelection)return;
 const json=state.selection.toJSON(),forward=state.selection.anchor<=state.selection.head,field=forward?'headId':'anchorId',part=splits.find(part=>part.sourceId===json[field]);
 if(part)json[field]=part.tailId;json.anchorId=remap(json.anchorId);json.headId=remap(json.headId);tr.setSelection(Selection.fromJSON(tr.doc,json));
}
function coverShellEqual(left,right){
 if(!left||!right||left.attrs.id!==right.attrs.id)return false;
 const clean=node=>{const attrs=structuredClone(node.attrs);for(const [key,value]of Object.entries(attrs.meta?.extensions||{}))if(value===readManualCoverFlowProvenance(attrs.meta.extensions))delete attrs.meta.extensions[key];if(attrs.meta?.extensions&&!Object.keys(attrs.meta.extensions).length)delete attrs.meta.extensions;return attrs;};
 const a=manualPaginationPageParts(left),b=manualPaginationPageParts(right);
 if(!same(clean(left),clean(right))||!a.body||!b.body||!same(a.body.node.attrs,b.body.node.attrs)||a.headers.length!==b.headers.length||!a.headers.every((entry,index)=>entry.node.eq(b.headers[index].node)))return false;
 return same(left.lastChild.attrs,right.lastChild.attrs);
}
function retainCoverFlowHistory(state,tr,plan){
 const pages=pagesOf(state.doc,{coverFlow:plan.coverFlow}),live=new Set();tr.doc.descendants(node=>{if(node.attrs.id)live.add(node.attrs.id);});
 for(const root of pages.filter(page=>page.node.type.name==='cover')){
  const records=[],seen=new Set(),visit=node=>{if(!node.attrs.id||seen.has(node.attrs.id))return;seen.add(node.attrs.id);if(!live.has(node.attrs.id))records.push({id:node.attrs.id,type:node.type.name,reason:`pagination:${plan.action.type}`,attrs:structuredClone(node.attrs),...(node.isTextblock?{content:node.content.toJSON()}:{} )});};
  for(const page of pages.filter(page=>page.root===root)){visit(page.node);page.node.descendants(visit);}
  const current=find(tr.doc,root.node.attrs.id);if(!current)continue;
  const meta=withManualCoverFlowProvenance(current.node.attrs.meta,{coverId:root.node.attrs.id,records});if(!same(meta,current.node.attrs.meta))tr.setNodeMarkup(current.pos,undefined,{...current.node.attrs,meta},current.node.marks);
 }
}
/** No DOM or dispatch: callers may inspect the transaction before committing. */
export function createManualPaginationTransaction(state,plan,{historyTransaction,composing=false}={}){
 if(composing||plan?.status!=='ready'||plan.doc!==state.doc)return null;
 const tr=state.tr,action=plan.action,splits=[],merges=[];
 try{
  if(action.type==='title'){
   const page=pageFor(tr.doc,action.pageId),root=pageFor(tr.doc,action.rootPageId);if(!page?.automatic||page.root.node.attrs.id!==root?.node.attrs.id)return null;
   const title=manualContinuationTitle(root.node,page.node.attrs.id);if(page.title){if(title)tr.replaceWith(page.title.pos,page.title.pos+page.title.node.nodeSize,title.type.create({...title.attrs,id:page.title.node.attrs.id,meta:{...title.attrs.meta,extensions:Object.fromEntries(Object.entries(title.attrs.meta.extensions).map(([key,value])=>[key,value.owner==='@lk-design-system/manual-page-projection'?{...value,blockId:page.title.node.attrs.id}:value]))}},title.content));else tr.delete(page.title.pos,page.title.pos+page.title.node.nodeSize);}else if(title)tr.insert(page.pos+1,title);
  }else if(action.type==='remove-empty'){
   const page=pageFor(tr.doc,action.pageId);if(!page?.automatic||page.blocks.length)return null;tr.delete(page.pos,page.pos+page.node.nodeSize);
  }else if(action.type==='push'){
   let id=action.blockId;if(action.split){const part=splitBlock(tr,id,action.split);if(!part)return null;splits.push(part,...(part.nested||[]));id=part.tailId;}
   if(!pushBlocks(tr,action.pageId,id,action.nextPageId))return null;
  }else if(action.type==='pull'){
   if(action.split){const part=splitBlock(tr,action.blockId,action.split);if(!part)return null;splits.push(part,...(part.nested||[]));}
   if(!pullBlock(tr,action.pageId,action.nextPageId,action.blockId))return null;const target=pageFor(tr.doc,action.pageId);merges.push(...mergeFragments(tr,target.cover?target.body.node.attrs.id:action.pageId));
  }else return null;
  tr.doc.check();
  const oldExplicit=pagesOf(state.doc,{coverFlow:plan.coverFlow}).filter(page=>!page.automatic).map(page=>page.node.attrs.id),newExplicit=pagesOf(tr.doc,{coverFlow:plan.coverFlow}).filter(page=>!page.automatic).map(page=>page.node.attrs.id);
  const oldCovers=children(state.doc).filter(node=>node.type.name==='cover'),newCovers=children(tr.doc).filter(node=>node.type.name==='cover');
  const coversPreserved=oldCovers.length===newCovers.length&&oldCovers.every((oldCover,index)=>{
   const newCover=newCovers[index],flowingCover=plan.coverFlow||readManualCoverFlowProvenance(oldCover.attrs.meta.extensions)?.coverId===oldCover.attrs.id;
   return oldCover.eq(newCover)||flowingCover&&coverShellEqual(oldCover,newCover);
  });
  if(!same(oldExplicit,newExplicit)||!coversPreserved||tr.doc.eq(state.doc))return null;
  retainCoverFlowHistory(state,tr,plan);
  if(!splits.length&&!merges.length)restoreMovedSelection(state,tr);preserveBlockSelection(state,tr,splits,merges);if(state.selection instanceof TextSelection&&!state.selection.empty&&tr.selection instanceof TextSelection){const previous=new Set(repeatedManualPaginationHeaders(state.doc).map(header=>header.key)),excluded=[...(state.selection.excludedHeaders||[]),...repeatedManualPaginationHeaders(tr.doc).filter(header=>!previous.has(header.key)).map(header=>header.key)];tr.setSelection(manualPaginationTextSelection(tr.doc,tr.selection.anchor,tr.selection.head,excluded));}tr.setStoredMarks(state.storedMarks);
  tr.setMeta('manualPagination',{revision:plan.revision,action:action.type}).setMeta('manualExplicitDelete',true);
  if(historyTransaction)tr.setMeta('appendedTransaction',historyTransaction);
  return tr;
 }catch{return null;}
}
export const paginateManualDocument=(measurement,options={})=>(state,dispatch,view)=>{
 if(view?.composing||options.composing)return false;
 const plan=planManualPagination(state,measurement,options);if(plan.status!=='ready')return false;
 const tr=createManualPaginationTransaction(state,plan,options);if(!tr)return false;if(dispatch)dispatch(tr);return true;
};
