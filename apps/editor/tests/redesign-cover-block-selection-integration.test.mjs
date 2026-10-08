import test from 'node:test';
import assert from 'node:assert/strict';
import {closeHistory} from '@tiptap/pm/history';
import {createEmptyManualDocument,validateManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,findManualObject,findManualCoverRole,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {getManualCoverProjection} from '../src/redesign/manual-cover-legacy-projection.mjs';
import {selectManualBlocks,selectManualBlockIds,extendManualBlockSelection,deleteSelectedManualBlocks,duplicateSelectedManualBlocks,moveSelectedManualBlocks,manualBlockSelectionPlugin} from '../src/redesign/manual-block-selection.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';

const inline=text=>[{type:'text',text,marks:[{type:'strong'},{type:'underline'}]}];
const paragraph=(id,text)=>({id,type:'paragraph',content:inline(text),extensions:{vendor:{keep:id}}});
function fixture(){
 const document=createEmptyManualDocument();document.pages[0].title=inline('Required page title');document.pages[0].blocks=[paragraph('page-first','Page body'),paragraph('page-keep','Keep')];
 document.cover={id:'cover',title:inline('Required cover title'),logo:{src:'assets/logo.png',alt:'Logo'},metadata:[{id:'metadata-entry',label:inline('Version'),value:inline('1.0'),extensions:{vendor:{entry:true}}}],sectionTitle:inline('준비사항'),blocks:[paragraph('cover-body','Cover body')],extensions:{manualCoverProjection:{owner:'foreign',keep:true},vendor:{cover:true}}};
 let state=createManualState({document,plugins:[manualBlockSelectionPlugin()]});
 const dispatch=tr=>{state=state.applyTransaction(tr).state;};
 return {original:structuredClone(document),get state(){return state;},get document(){return documentFromState(state);},dispatch,run:command=>command(state,dispatch),boundary(){dispatch(closeHistory(state.tr));},role:role=>findManualCoverRole(state,'cover',role)};
}
function invariants(h){validateManualDocument(h.document);assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document:h.document,assets:{}})).document,h.document);const ids=[];h.state.doc.descendants(node=>{if(node.attrs.id)ids.push(node.attrs.id);});assert.equal(new Set(ids).size,ids.length);h.state.doc.check();}
function undoRedo(h,before){const after=h.state;assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));invariants(h);}

test('untouched legacy cover roundtrips exactly through real PM layout and file codec',()=>{const h=fixture();assert.deepEqual(h.document,h.original);const cover=h.state.doc.firstChild,frame=cover.lastChild;assert.equal(frame.type.name,'coverSectionFrame');assert.equal(frame.lastChild.type.name,'coverBody');const wrapperIds=[frame.attrs.id,frame.lastChild.attrs.id];assert.ok(wrapperIds.every(id=>typeof id==='string'&&id.length>0));assert.notEqual(wrapperIds[0],wrapperIds[1]);const before=h.state;for(const id of wrapperIds)assert.equal(h.run(selectManualBlockIds([id])),false);assert.equal(h.state,before);const reloaded=createManualState({document:h.document});const reloadedFrame=reloaded.doc.firstChild.lastChild;assert.deepEqual([reloadedFrame.attrs.id,reloadedFrame.lastChild.attrs.id],wrapperIds);const savedIds=[];const collect=value=>{if(!value||typeof value!=='object')return;if(typeof value.id==='string')savedIds.push(value.id);for(const [key,child] of Object.entries(value))if(key!=='extensions')collect(child);};collect(h.document);for(const id of wrapperIds)assert.equal(savedIds.includes(id),false);assert.deepEqual(h.document,h.original);invariants(h);});

test('logo, title, metadata table and section are selectable IDs; metadata cells are not blocks',()=>{
 const h=fixture();for(const role of ['logo','title','metadata','sectionTitle']){const found=h.role(role);assert.ok(found.node.attrs.id);assert.equal(h.run(selectManualBlockIds([found.node.attrs.id])),true);assert.deepEqual(h.state.selection.ids,[found.node.attrs.id]);assert.equal(h.state.selection.content().content.childCount,1);}
 const table=h.role('metadata').node;const cells=[];table.descendants(node=>{if(node.type.spec.tableRole==='cell'||node.type.spec.tableRole==='header_cell')cells.push(node.attrs.id);});assert.ok(cells.length);const before=h.state;for(const cell of cells)assert.equal(h.run(selectManualBlockIds([cell])),false);assert.equal(h.state,before);assert.deepEqual(h.document,h.original);
});

for(const reverse of [false,true])test(`real cover section/body/page ${reverse?'reverse':'forward'} range removes only selected blocks with one UndoRedo`,()=>{
 const h=fixture(),section=h.role('sectionTitle').node.attrs.id;assert.equal(h.run(selectManualBlocks(...(reverse?['page-first',section]:[section,'page-first']))),true);assert.deepEqual(h.state.selection.ids,[section,'cover-body','page-first']);assert.ok(h.state.selection.items.every(item=>item.node.firstChild.marks.some(mark=>mark.type.name==='strong')));h.boundary();const before=h.state;assert.equal(h.run(deleteSelectedManualBlocks),true);assert.equal(findManualObject(h.state,section),null);assert.equal(findManualObject(h.state,'cover-body'),null);assert.equal(findManualObject(h.state,'page-first'),null);assert.deepEqual(h.document.cover.title,h.original.cover.title);assert.deepEqual(h.document.pages[0].title,h.original.pages[0].title);assert.deepEqual(h.document.pages[0].blocks,[h.original.pages[0].blocks[1]]);undoRedo(h,before);
});

test('Shift extension crosses both transparent cover containers and the page boundary',()=>{
 const h=fixture(),section=h.role('sectionTitle').node.attrs.id;assert.equal(h.run(selectManualBlocks(section)),true);assert.equal(h.run(extendManualBlockSelection(1)),true);assert.deepEqual(h.state.selection.ids,[section,'cover-body']);assert.equal(h.run(extendManualBlockSelection(1)),true);assert.deepEqual(h.state.selection.ids,[section,'cover-body','page-first']);h.run(selectManualBlocks('page-first'));assert.equal(h.run(extendManualBlockSelection(-1)),true);assert.deepEqual(h.state.selection.ids,['cover-body','page-first']);assert.deepEqual(h.document,h.original);
});

test('original title deletion, raw replacement and foreign-page movement release the scalar role with one UndoRedo',()=>{
 for(const operation of ['delete','cut','replace','move']){const h=fixture(),title=h.role('title').node.attrs.id;h.run(selectManualBlocks(title));h.boundary();const before=h.state;if(operation==='delete')assert.equal(h.run(deleteSelectedManualBlocks),true);else if(operation==='move')assert.equal(h.run(moveSelectedManualBlocks({parentId:h.original.pages[0].id,index:1})),true);else h.dispatch(closeHistory(h.state.tr)[operation==='cut'?'deleteSelection':'insertText'](...(operation==='cut'?[]:['replacement'])));assert.equal(h.role('title'),null);assert.deepEqual(h.document.cover.title,[]);assert.deepEqual(h.document.pages[0].title,h.original.pages[0].title);undoRedo(h,before);}
});

test('original title can move inside its cover and retain its legacy identity and one UndoRedo',()=>{
 const h=fixture(),title=h.role('title').node.attrs.id;h.run(selectManualBlocks(title));h.boundary();const before=h.state;assert.equal(h.run(moveSelectedManualBlocks({parentId:'cover',index:1})),true);const moved=findManualObject(h.state,title);assert.equal(moved.parent.type.name,'coverBody');assert.equal(getManualCoverProjection(moved.node.attrs.meta.extensions).blockId,title);assert.deepEqual(h.document.cover.title,h.original.cover.title);undoRedo(h,before);
});

test('duplicated title has a fresh ordinary block identity and can be deleted independently',()=>{
 const h=fixture(),title=h.role('title').node.attrs.id;h.run(selectManualBlocks(title));h.boundary();const before=h.state;assert.equal(h.run(duplicateSelectedManualBlocks),true);const clone=h.state.selection.items[0].node;assert.notEqual(clone.attrs.id,title);assert.deepEqual(clone.content.toJSON(),findManualObject(h.state,title).node.content.toJSON());assert.ok(h.document.cover.blocks.some(block=>block.id===clone.attrs.id&&block.type==='heading'));undoRedo(h,before);h.boundary();assert.equal(h.run(deleteSelectedManualBlocks),true);assert.ok(findManualObject(h.state,title));assert.equal(findManualObject(h.state,clone.attrs.id),null);invariants(h);
});

test('section heading moves to an ordinary page and becomes an ordinary saved block',()=>{
 const h=fixture(),section=h.role('sectionTitle').node.attrs.id;assert.equal(h.run(selectManualBlocks(section)),true);h.boundary();const before=h.state;assert.equal(h.run(moveSelectedManualBlocks({parentId:h.original.pages[0].id,index:1})),true);assert.equal(findManualObject(h.state,section).parent.type.name,'page');assert.ok(h.document.pages[0].blocks.some(block=>block.id===section));assert.equal(Object.hasOwn(h.document.cover,'sectionTitle'),false);undoRedo(h,before);
});

test('cover ID move aliases the actual body without moving header or section',()=>{
 const h=fixture();assert.equal(h.run(selectManualBlocks('page-first')),true);h.boundary();const beforeAlias=h.state;assert.equal(h.run(moveSelectedManualBlocks({parentId:'cover',index:1})),true);assert.equal(findManualObject(h.state,'page-first').parent.type.name,'coverBody');assert.deepEqual(h.document.cover.blocks.map(block=>block.id),['cover-body','page-first']);undoRedo(h,beforeAlias);
});

test('header last gap inserts before required section frame and preserves block identity and marks',()=>{
 for(const blockId of ['page-first','cover-body']){
  const h=fixture(),original=findManualObject(h.state,blockId).node,cover=findManualObject(h.state,'cover').node,frameId=cover.lastChild.attrs.id;
  assert.equal(h.run(selectManualBlocks(blockId)),true);h.boundary();const before=h.state;
  assert.equal(h.run(moveSelectedManualBlocks({parentId:'cover',index:cover.childCount,coverHeader:true})),true);
  const moved=findManualObject(h.state,blockId),nextCover=findManualObject(h.state,'cover').node;
  assert.equal(moved.parent.type.name,'cover');assert.ok(moved.node.eq(original));
  assert.equal(nextCover.child(nextCover.childCount-2).attrs.id,blockId);assert.equal(nextCover.lastChild.attrs.id,frameId);assert.equal(nextCover.lastChild.type.name,'coverSectionFrame');
  assert.deepEqual(h.state.selection.ids,[blockId]);undoRedo(h,before);
 }
});

test('original title header-body transfers preserve protected identity and one UndoRedo in each direction',()=>{
 const h=fixture(),title=h.role('title').node.attrs.id,original=h.role('title').node;
 assert.equal(h.run(selectManualBlocks(title)),true);h.boundary();const beforeBody=h.state;
 assert.equal(h.run(moveSelectedManualBlocks({parentId:'cover',index:1,coverHeader:false})),true);
 assert.equal(findManualObject(h.state,title).parent.type.name,'coverBody');assert.ok(findManualObject(h.state,title).node.eq(original));assert.deepEqual(h.document.cover.title,h.original.cover.title);undoRedo(h,beforeBody);
 h.boundary();const beforeHeader=h.state,cover=findManualObject(h.state,'cover').node;
 assert.equal(h.run(moveSelectedManualBlocks({parentId:'cover',index:cover.childCount,coverHeader:true})),true);
 const moved=findManualObject(h.state,title);assert.equal(moved.parent.type.name,'cover');assert.ok(moved.node.eq(original));assert.equal(getManualCoverProjection(moved.node.attrs.meta.extensions).blockId,title);
 assert.equal(moved.parent.child(moved.parent.childCount-2).attrs.id,title);assert.equal(moved.parent.lastChild.type.name,'coverSectionFrame');assert.deepEqual(h.document.cover.title,h.original.cover.title);undoRedo(h,beforeHeader);
});

test('section frame final gap inserts before required body and preserves one UndoRedo',()=>{
 const h=fixture(),frame=findManualObject(h.state,'cover').node.lastChild,bodyId=frame.lastChild.attrs.id,original=findManualObject(h.state,'cover-body').node,section=h.role('sectionTitle').node.attrs.id;
 assert.equal(h.run(selectManualBlocks('cover-body')),true);h.boundary();const before=h.state;
 assert.equal(h.run(moveSelectedManualBlocks({parentId:frame.attrs.id,index:frame.childCount})),true);
 const moved=findManualObject(h.state,'cover-body'),nextFrame=findManualObject(h.state,frame.attrs.id).node;
 assert.equal(moved.parent.type.name,'coverSectionFrame');assert.ok(moved.node.eq(original));assert.equal(nextFrame.firstChild.attrs.id,section);
 assert.equal(nextFrame.child(nextFrame.childCount-2).attrs.id,'cover-body');assert.equal(nextFrame.lastChild.attrs.id,bodyId);assert.equal(nextFrame.lastChild.type.name,'coverBody');
 assert.deepEqual(h.state.selection.ids,['cover-body']);undoRedo(h,before);
});
