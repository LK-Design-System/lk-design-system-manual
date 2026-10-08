import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,selectManualObject,insertManualBlock,moveManualObject,findManualObject} from '../src/redesign/manual-kernel.mjs';
import {manualDragLayout} from '../src/redesign/manual-drag-layout.mjs';
import {manualPageRole} from '../src/redesign/manual-page-shape.mjs';
import {withManualPaginationMarker} from '../src/redesign/manual-pagination-meta.mjs';
import {planManualPagination,createManualPaginationTransaction} from '../src/redesign/manual-pagination.mjs';
test('authored title and body have separate ordered handles without modifying saved content',()=>{
 const document=createEmptyManualDocument(),state=createManualState({document});
 const result=manualDragLayout(state),page=document.pages[0],title=state.doc.firstChild.firstChild;
 assert.equal(title.type.name,'pageTitle');
 assert.deepEqual(result.collections.get(`${page.id}/blocks`).ids,[title.attrs.id,...page.blocks.map(b=>b.id)]);
 assert.equal(result.paths.get(`${page.id}/blocks/0`),title.attrs.id);
 assert.equal(result.paths.get(`${page.id}/blocks/1`),page.blocks[0].id);
 const handles=result.decorations.find().filter(d=>d.type.attrs['data-move-path']);
 assert.equal(handles.length,3);
 for(const id of [page.id,title.attrs.id,page.blocks[0].id]){
  const target=findManualObject(state,id),handle=handles.find(d=>d.from===target.pos&&d.to===target.pos+target.node.nodeSize);
  assert.ok(handle,`handle remains bound to ${id}`);
 }
 assert.deepEqual(documentFromState(state),document);
});
test('nested step targets stay distinct and stable through reorder',()=>{
 let state=createManualState();const dispatch=tr=>state=state.applyTransaction(tr).state;
 selectManualObject(documentFromState(state).pages[0].blocks[0].id)(state,dispatch);
 insertManualBlock('procedure')(state,dispatch);
 const procedure=documentFromState(state).pages[0].blocks[1],step=procedure.steps[0];
 const layout=manualDragLayout(state);
 assert.equal(layout.paths.get(`${procedure.id}/steps/0`),step.id);
 assert.equal(layout.paths.get(`${step.id}/blocks/0`),step.blocks[0].id);
 assert.equal(moveManualObject(procedure.id,{direction:'up'})(state,dispatch),true);
 const reordered=manualDragLayout(state),page=documentFromState(state).pages[0];
 assert.equal(page.blocks[0].id,procedure.id);
 assert.equal(reordered.paths.get(`${page.id}/blocks/0`),state.doc.firstChild.firstChild.attrs.id);
 assert.equal(reordered.paths.get(`${page.id}/blocks/1`),procedure.id);
 assert.equal(reordered.paths.get(`${procedure.id}/steps/0`),step.id);
 assert.equal(findManualObject(state,step.id).parent.attrs.id,procedure.id);
 assert.equal(state.selection.node.attrs.id,procedure.id);
});
test('empty hints exclude both hard breaks and raw text ending in a newline',()=>{
 const document=createEmptyManualDocument(),empty=document.pages[0].blocks[0];
 const paragraph=content=>({id:crypto.randomUUID(),type:'paragraph',content});
 const withBreak=paragraph([{type:'text',text:'앞'},{type:'hardBreak'},{type:'text',text:'뒤'}]);
 const withNewline=paragraph([{type:'text',text:'내용\n'}]),breakOnly=paragraph([{type:'hardBreak'}]);
 document.pages[0].blocks.push(withBreak,withNewline,breakOnly);
 const state=createManualState({document}),layout=manualDragLayout(state);
 const emptyPositions=new Set(layout.decorations.find().filter(d=>d.type.attrs['data-manual-empty']==='true').map(d=>d.from));
 assert.equal(emptyPositions.has(findManualObject(state,empty.id).pos),true);
 for(const block of [withBreak,withNewline,breakOnly])assert.equal(emptyPositions.has(findManualObject(state,block.id).pos),false);
 assert.deepEqual(documentFromState(state),document);
});
test('continuation titles are read-only in the view while orphan markers stay editable',()=>{
 const document=createEmptyManualDocument(),root=document.pages[0],automatic={...withManualPaginationMarker({id:'continued'}, {kind:'page',rootPageId:root.id}),title:root.title,blocks:[]},orphan={...withManualPaginationMarker({id:'orphan'}, {kind:'page',rootPageId:'missing'}),title:[],blocks:[]};
 document.pages.push(automatic,orphan);
 const state=createManualState({document}),decorations=manualDragLayout(state).decorations.find();
 const titlePos=id=>findManualObject(state,id).pos+1;
 const derived=decorations.find(decoration=>decoration.from===titlePos(automatic.id)&&decoration.type.attrs.contenteditable==='false');
 assert.equal(derived.type.attrs.contenteditable,'false');assert.equal(derived.type.attrs['aria-readonly'],'true');
 assert.equal(decorations.some(decoration=>decoration.from===titlePos(root.id)&&decoration.type.attrs.contenteditable==='false'),false);
 assert.equal(decorations.some(decoration=>decoration.from===titlePos(orphan.id)&&decoration.type.attrs.contenteditable==='false'),false);
 assert.deepEqual(documentFromState(state),document);
});
test('each continuation title preserves root content with its own binding and is read-only',()=>{
 const document=createEmptyManualDocument(),root=document.pages[0];root.title=[{type:'text',text:'ROOT'}];root.blocks[0].content=[{type:'text',text:'ABCDEF'}];
 let state=createManualState({document});const originalTitle=state.doc.firstChild.firstChild;
 const first=planManualPagination(state,{doc:state.doc,pages:[{id:root.id,capacity:100,blocks:[{id:root.blocks[0].id,height:150,splits:[{kind:'text',at:2,headHeight:80,tailHeight:150}]}]}]});
 state=state.applyTransaction(createManualPaginationTransaction(state,first)).state;
 const documentWithTail=documentFromState(state),second=planManualPagination(state,{doc:state.doc,pages:documentWithTail.pages.map((page,index)=>({id:page.id,capacity:100,blocks:page.blocks.map(block=>({id:block.id,height:index?150:80,...(index?{splits:[{kind:'text',at:2,headHeight:80,tailHeight:70}]}:{})}))}))});
 state=state.applyTransaction(createManualPaginationTransaction(state,second)).state;
 assert.equal(state.doc.childCount,3);assert.ok(state.doc.firstChild.firstChild.eq(originalTitle));
 const decorations=manualDragLayout(state).decorations.find();let pos=0;
 const titleIds=new Set();
 state.doc.forEach((page,_pos,index)=>{
  const title=page.firstChild,titlePos=pos+1,role=manualPageRole(title);
  assert.equal(title.type.name,'pageTitle');assert.ok(title.content.eq(originalTitle.content));assert.deepEqual(title.marks,originalTitle.marks);
  assert.equal(role.pageId,page.attrs.id);assert.equal(role.blockId,title.attrs.id);assert.equal(role.role,'title');
  assert.equal(role.derivedFrom,index>0?root.id:undefined);
  assert.equal(titleIds.has(title.attrs.id),false);titleIds.add(title.attrs.id);
  assert.equal(decorations.some(decoration=>decoration.from===titlePos&&decoration.to===titlePos+title.nodeSize&&decoration.type.attrs.contenteditable==='false'&&decoration.type.attrs['aria-readonly']==='true'),index>0);
  if(index>0){
   assert.equal([...manualDragLayout(state).paths.values()].includes(title.attrs.id),false);
   let dispatched=false;const before=state;
   assert.equal(moveManualObject(title.attrs.id,{direction:'down'})(state,()=>{dispatched=true;}),false);
   assert.equal(dispatched,false);assert.equal(state,before);
  }
  pos+=page.nodeSize;
 });
});
