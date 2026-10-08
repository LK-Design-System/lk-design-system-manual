import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {createManualState,documentFromState,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {validateManualDocument} from '../src/redesign/manual-v2.mjs';
import {getManualPageGroups} from '../src/redesign/manual-page-groups.mjs';
import {withManualPageOrder} from '../src/redesign/manual-page-order.mjs';
import {manualPaginationMarker,withManualPaginationMarker} from '../src/redesign/manual-pagination-meta.mjs';
import {getManualPageProjection} from '../src/redesign/manual-page-projection.mjs';
import {selectManualBlocks,deleteSelectedManualBlocks} from '../src/redesign/manual-block-selection.mjs';
import {selectManualTableCells} from '../src/redesign/manual-table-selection.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
import {getManualPageGroupActionState,applyManualPageGroupAction,MANUAL_PAGE_GROUP_ACTION_RESULT} from '../src/redesign/manual-page-group-actions.mjs';

const inline=text=>[{type:'text',text,marks:[{type:'strong'}]}];
const para=(id,text)=>({id,type:'paragraph',content:inline(text),extensions:{vendor:{id,future:[1,null,true]}}});
const page=(id,blocks=[para(`${id}-body`,id)])=>({id,title:inline(id),blocks,extensions:{vendor:{id}}});
function fixture(){
 const root=page('root'),tail=page('tail',[para('tail-body','Tail')]),c=page('c'),ct=page('c-tail',[para('c-tail-body','Tail C')]);
 root.extensions.manualPagination={owner:'foreign',rootPageId:'external'};
 tail.extensions=withManualPaginationMarker({extensions:tail.extensions},{kind:'page',rootPageId:'root'}).extensions;
 tail.blocks[0].extensions=withManualPaginationMarker({extensions:tail.blocks[0].extensions},{kind:'block',rootBlockId:'root-body',sourceType:'paragraph'}).extensions;
 ct.extensions=withManualPaginationMarker({extensions:ct.extensions},{kind:'page',rootPageId:'c'}).extensions;
 ct.blocks[0].extensions=withManualPaginationMarker({extensions:ct.blocks[0].extensions},{kind:'block',rootBlockId:'c-body',sourceType:'paragraph'}).extensions;
 root.blocks[0].content=[{type:'text',text:'Internal link',marks:[{type:'strong'},{type:'link',href:'#c-body'}]}];
 const cell=id=>({id,content:inline(id),extensions:{vendor:{id}}});
 const b=page('b',[{id:'table',type:'table',label:'Table',headers:[cell('h1'),cell('h2')],rows:[[cell('cell1'),cell('cell2')]],extensions:{vendor:{table:true}}}]);
 return {schemaVersion:2,id:'group-actions-doc',title:'Synthetic',extensions:{vendor:{document:true}},cover:{id:'cover',title:inline('Cover'),sectionTitle:inline('Section'),metadata:[],blocks:[para('cover-body','Cover')],extensions:{vendor:{cover:true}}},pages:[root,tail,b,c,ct,page('d')]};
}
function harness(document=fixture()){
 let state=createManualState({document}),count=0,last;
 const dispatch=tr=>{count++;last=tr;state=state.applyTransaction(tr).state;};
 return {get state(){return state;},get document(){return documentFromState(state);},get count(){return count;},get last(){return last;},dispatch,run:(options,view)=>applyManualPageGroupAction(options)(state,dispatch,view),command:cmd=>cmd(state,dispatch),select(id,offset=1){const found=findManualObject(state,id);dispatch(state.tr.setSelection(TextSelection.create(state.doc,found.pos+1+offset)));}};
}
const roots=h=>getManualPageGroups(h.state.doc).map(group=>group.id);
function ids(doc){const result=[];doc.descendants(node=>{if(node.attrs.id)result.push(node.attrs.id);});return result;}
function invariants(h){h.state.doc.check();validateManualDocument(h.document);assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document:h.document,assets:{}})).document,h.document);const all=ids(h.state.doc);assert.equal(new Set(all).size,all.length);}
function undoRedo(h,before){const after=h.state;assert.equal(h.command(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.command(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));invariants(h);}
function noChange(h,options,view){const before=h.state,count=h.count;assert.equal(h.run(options,view),false);assert.equal(h.state,before);assert.equal(h.count,count);}

test('action capability normalizes root order and closes selected logical roots over physical tails',()=>{
 const h=harness(),cap=getManualPageGroupActionState(h.state,{sourceIds:['c','root'],action:'move',targetId:'d',edge:'after'});
 assert.deepEqual(cap.sourceIds,['root','c']);assert.deepEqual(cap.physicalIds,['root','tail','c','c-tail']);assert.equal(cap.move.enabled,true);assert.equal(cap.enabled,true);const generic=getManualPageGroupActionState(h.state,{sourceIds:['c','root']});assert.equal(generic.duplicate.enabled,true);assert.equal(generic.delete.enabled,true);
 const cover=getManualPageGroupActionState(h.state,{sourceIds:['cover']});assert.equal(cover.move.enabled,true);assert.equal(cover.move.reason,null);assert.equal(cover.duplicate.enabled,true);assert.equal(cover.duplicate.reason,null);assert.equal(cover.delete.enabled,true);
});

test('noncontiguous logical roots move with their tails, preserving caret, IDs, marks and one UndoRedo',()=>{
 const h=harness();h.select('tail-body',2);h.dispatch(h.state.tr.setStoredMarks([h.state.schema.marks.emphasis.create()]));const before=h.state,byId=new Map(h.document.pages.map(p=>[p.id,p]));
 assert.equal(h.run({action:'move',sourceIds:['c','root'],targetId:'d',edge:'after',revision:before.doc}),true);
 assert.deepEqual(roots(h),['cover','b','d','root','c']);assert.deepEqual(h.document.pages,['b','d','root','tail','c','c-tail'].map(id=>byId.get(id)));assert.equal(h.state.selection.$from.parent.attrs.id,'tail-body');assert.equal(h.state.selection.$from.parentOffset,2);assert.deepEqual(h.state.storedMarks,before.storedMarks);undoRedo(h,before);
 const ranged=harness();assert.equal(ranged.command(selectManualBlocks('root-body','table')),true);const beforeRange=ranged.state,selectedIds=[...beforeRange.selection.ids];assert.equal(ranged.run({action:'move',sourceIds:['root'],targetId:'d',edge:'after'}),true);assert.equal(ranged.state.selection.manualBlockSelection,true);assert.equal(ranged.state.selection.manualSparseBlockSelection,true);assert.deepEqual(new Set(ranged.state.selection.ids),new Set(selectedIds));assert.equal(ranged.state.selection.ids.length,selectedIds.length);for(const id of ['c-body','c-tail-body','d-body'])assert.equal(ranged.state.selection.ids.includes(id),false);undoRedo(ranged,beforeRange);
 const inserted=harness(),untouchedD=structuredClone(inserted.document.pages.find(page=>page.id==='d')),dNode=findManualObject(inserted.state,'d').node,dIds=['d-body'];dNode.descendants(node=>{if(getManualPageProjection(node.attrs.meta?.extensions)?.role==='title')dIds.push(node.attrs.id);});assert.equal(inserted.command(selectManualBlocks('root-body','table')),true);const oldRangeIds=[...inserted.state.selection.ids];assert.equal(inserted.run({action:'move',sourceIds:['d'],targetId:'b',edge:'before'}),true);assert.deepEqual(new Set(inserted.state.selection.ids),new Set(oldRangeIds));assert.equal(inserted.state.selection.ids.length,oldRangeIds.length);for(const id of dIds)assert.equal(inserted.state.selection.ids.includes(id),false);assert.equal(inserted.command(deleteSelectedManualBlocks),true);assert.deepEqual(inserted.document.pages.find(page=>page.id==='d'),untouchedD);assert.ok(findManualObject(inserted.state,'d-body').node.firstChild.marks.some(mark=>mark.type.name==='strong'));assert.deepEqual(findManualObject(inserted.state,'d-body').node.attrs.meta.extensions,untouchedD.blocks[0].extensions);invariants(inserted);
});

test('duplicate copies whole selected groups after the final selected group and remaps owned references',()=>{
 const h=harness(),before=h.state,oldIds=new Set(ids(before.doc)),original=h.document;assert.equal(h.run({action:'duplicate',sourceIds:['c','root']}),true);
 const groups=getManualPageGroups(h.state.doc),copies=groups.slice(4,6);assert.deepEqual(groups.slice(0,4).map(g=>g.id),['cover','root','b','c']);assert.equal(groups.at(-1).id,'d');assert.equal(copies.length,2);assert.ok(copies.every(group=>group.pageIds.length===2));
 const pages=h.document.pages,copyRoot=pages.find(p=>p.id===copies[0].id),copyTail=pages.find(p=>p.id===copies[0].pageIds[1]),copyC=pages.find(p=>p.id===copies[1].id);
 for(const id of copies.flatMap(group=>group.pageIds)){const found=findManualObject(h.state,id);for(const nested of [id,...ids(found.node)])assert.equal(oldIds.has(nested),false);}
 assert.equal(copyRoot.blocks[0].content[0].marks.find(mark=>mark.type==='link').href,`#${copyC.blocks[0].id}`);assert.equal(manualPaginationMarker(copyTail.extensions,'page').rootPageId,copyRoot.id);assert.equal(manualPaginationMarker(copyTail.blocks[0].extensions,'block').rootBlockId,copyRoot.blocks[0].id);
 const roles=[];for(const group of copies)for(const pageId of group.pageIds)findManualObject(h.state,pageId).node.descendants(node=>{const role=getManualPageProjection(node.attrs.meta?.extensions);if(role){roles.push(role);assert.equal(role.pageId,pageId);assert.equal(role.blockId,node.attrs.id);assert.equal(oldIds.has(role.blockId),false);if(role.derivedFrom)assert.equal(role.derivedFrom,group.id);}});assert.ok(roles.length>=4);
 assert.deepEqual(copyRoot.extensions.vendor,original.pages[0].extensions.vendor);assert.deepEqual(copyRoot.extensions.manualPagination,original.pages[0].extensions.manualPagination);assert.deepEqual(h.document.cover,original.cover);assert.deepEqual(h.document.pages.filter(p=>oldIds.has(p.id)),original.pages);undoRedo(h,before);
});

test('delete may include the cover and closes body roots over tails while retaining remaining pages',()=>{
 const h=harness();h.select('cover-body');const before=h.state,original=h.document;assert.equal(h.run({action:'delete',sourceIds:['cover','root','c']}),true);assert.equal(Object.hasOwn(h.document,'cover'),false);assert.deepEqual(h.document.pages,[original.pages[2],original.pages[5]]);assert.ok(h.state.selection.from>=0&&h.state.selection.to<=h.state.doc.content.size);undoRedo(h,before);
});

test('the last logical body page cannot be deleted even when it spans physical tails',()=>{
 const d=fixture();d.pages=d.pages.slice(0,2);delete d.cover;const h=harness(d),sourceIds=['root'];const cap=getManualPageGroupActionState(h.state,{sourceIds,action:'delete'});assert.equal(cap.delete.enabled,false);assert.equal(cap.enabled,false);assert.equal(cap.reason,'last-item');noChange(h,{action:'delete',sourceIds});invariants(h);
});

test('physical tails, unknown IDs, incomplete sets and orphan markers are rejected without mutation',()=>{
 const h=harness();for(const sourceIds of [[],['tail'],['root','tail'],['unknown'],['c-tail','root']])noChange(h,{action:'delete',sourceIds});
 const d=fixture(),orphan=page('orphan');orphan.extensions=withManualPaginationMarker({extensions:orphan.extensions},{kind:'page',rootPageId:'root'}).extensions;d.pages.push(orphan);const bad=harness(d);noChange(bad,{action:'duplicate',sourceIds:['orphan']});noChange(bad,{action:'move',sourceIds:['root'],targetId:'d',edge:'after'});noChange(bad,{action:'move',sourceIds:['b'],targetId:'orphan',edge:'after'});
});

test('stale revision, readonly, noneditable view and composition disable every action',()=>{
 const h=harness(),base={sourceIds:['root'],targetId:'d',edge:'after'};for(const action of ['move','duplicate','delete']){
  for(const options of [{...base,action,readOnly:true},{...base,action,revision:createManualState({document:h.document}).doc}]){assert.equal(getManualPageGroupActionState(h.state,options).enabled,false);noChange(h,options);}
  for(const view of [{editable:false},{composing:true}]){assert.equal(getManualPageGroupActionState(h.state,{...base,action},view).enabled,false);noChange(h,{...base,action},view);}
 }
});

test('noop moves, selected or tail targets and explicit duplicate targets cannot dispatch',()=>{
 const h=harness();for(const options of [{action:'move',sourceIds:['root'],targetId:'b',edge:'before'},{action:'move',sourceIds:['root'],targetId:'root',edge:'after'},{action:'move',sourceIds:['root'],targetId:'c-tail',edge:'before'},{action:'move',sourceIds:['root'],targetId:'d',edge:'middle'},{action:'move',sourceIds:['root'],targetId:'unknown',edge:'after'}])noChange(h,options);
 const options={action:'duplicate',sourceIds:['root'],targetId:'d',edge:'after'},cap=getManualPageGroupActionState(h.state,options);assert.equal(cap.reason,'unsupported-target');noChange(h,options);
});

test('dry runs never dispatch and a successful action dispatches once with exact result identities',()=>{
 for(const action of ['move','duplicate','delete']){const h=harness(),options={action,sourceIds:['c','root'],...(action==='move'?{targetId:'d',edge:'after'}:{})},before=h.state,count=h.count;assert.equal(applyManualPageGroupAction(options)(h.state),true);assert.equal(h.state,before);assert.equal(h.count,count);assert.equal(h.run(options),true);assert.equal(h.count,count+1);const result=h.last.getMeta(MANUAL_PAGE_GROUP_ACTION_RESULT);assert.equal(result.action,action);
  if(action==='move'){assert.deepEqual(result.rootIds,['root','c']);assert.deepEqual(result.physicalIds,['root','tail','c','c-tail']);}
  else if(action==='duplicate'){const copies=getManualPageGroups(h.state.doc).filter(group=>!findManualObject(before,group.id));assert.deepEqual(result.rootIds,copies.map(group=>group.id));assert.deepEqual(result.physicalIds,copies.flatMap(group=>group.pageIds));assert.equal(result.rootIds.length,2);assert.equal(result.physicalIds.length,4);}
  else{assert.deepEqual(result.rootIds,[]);assert.deepEqual(result.physicalIds,[]);assert.deepEqual(result.remainingRootIds,['cover','b','d']);}
  invariants(h);}
});

test('table cell selection preserves its exact cells and content when its page group moves',()=>{
 const h=harness();assert.equal(h.command(selectManualTableCells('h1','cell2')),true);const before=h.state,selected=[...before.selection.ids];assert.equal(h.run({action:'move',sourceIds:['b'],targetId:'d',edge:'after'}),true);assert.equal(h.state.selection.manualTableCellSelection,true);assert.deepEqual(h.state.selection.ids,selected);assert.deepEqual(h.document.pages.find(p=>p.id==='b'),documentFromState(before).pages.find(p=>p.id==='b'));undoRedo(h,before);
});

test('deleting the caret page chooses a valid remaining editable position with exact UndoRedo',()=>{
 const h=harness();h.select('c-tail-body',2);const before=h.state;assert.equal(h.run({action:'delete',sourceIds:['c']}),true);assert.equal(findManualObject(h.state,'c-tail-body'),null);assert.equal(h.state.selection.empty,true);assert.ok(h.state.selection.$from.parent.isTextblock);assert.notEqual(h.state.selection.$from.node(1).attrs.id,'c');undoRedo(h,before);
});

test('page actions form one history step separate from preceding ordinary typing',()=>{
 const h=harness();h.select('d-body');h.dispatch(h.state.tr.insertText('Prior'));const typed=h.state;assert.equal(h.run({action:'move',sourceIds:['root'],targetId:'d',edge:'after'}),true);assert.equal(h.command(manualCommands.undo),true);assert.ok(h.state.doc.eq(typed.doc));assert.equal(findManualObject(h.state,'d-body').node.textContent,'dPrior');assert.equal(h.command(manualCommands.undo),true);assert.equal(findManualObject(h.state,'d-body').node.textContent,'d');invariants(h);
});


test('cover-only policy: deleting the final body family preserves the exact cover and one UndoRedo',()=>{
 const d=fixture();d.pages=d.pages.slice(0,2);const h=harness(d);h.select('tail-body',2);const before=h.state,cover=structuredClone(h.document.cover);
 assert.equal(h.run({action:'delete',sourceIds:['root']}),true);assert.deepEqual(h.document.cover,cover);assert.deepEqual(h.document.pages,[]);assert.deepEqual(roots(h),['cover']);
 assert.deepEqual(h.last.getMeta(MANUAL_PAGE_GROUP_ACTION_RESULT),{action:'delete',rootIds:[],physicalIds:[],remainingRootIds:['cover']});assert.ok(h.state.selection.from>=0&&h.state.selection.to<=h.state.doc.content.size);assert.equal(h.state.selection.$from.node(1).attrs.id,'cover');undoRedo(h,before);
});

test('cover-only policy: the last cover rejects deletion without producing an empty document',()=>{
 const d=fixture();d.pages=[];const h=harness(d),before=h.state,options={action:'delete',sourceIds:['cover']};const cap=getManualPageGroupActionState(h.state,options);
 assert.equal(cap.enabled,false);assert.equal(cap.reason,'last-item');noChange(h,options);noChange(h,{...options,readOnly:true});noChange(h,{...options,revision:createManualState({document:h.document}).doc});assert.equal(h.state,before);assert.deepEqual(h.document,d);invariants(h);
});

test('cover-only policy: deleting only the cover preserves every existing body page and one UndoRedo',()=>{
 const h=harness();h.select('cover-body');const before=h.state,pages=structuredClone(h.document.pages),bodyIds=h.document.pages.map(page=>page.id);
 assert.equal(h.run({action:'delete',sourceIds:['cover']}),true);assert.equal(Object.hasOwn(h.document,'cover'),false);assert.deepEqual(h.document.pages,pages);assert.deepEqual(Array.from({length:h.state.doc.childCount},(_,index)=>h.state.doc.child(index).attrs.id),bodyIds);undoRedo(h,before);
});

test('cover-only policy: whole-document deletion is blocked and sparse body deletion safely restores a cell selection',()=>{
 const d=fixture();d.pages=d.pages.slice(0,2);const whole=harness(d),options={action:'delete',sourceIds:['cover','root']};assert.equal(getManualPageGroupActionState(whole.state,options).reason,'last-item');noChange(whole,options);
 const h=harness();assert.equal(h.command(selectManualTableCells('h1','cell2')),true);const before=h.state,cover=structuredClone(h.document.cover);
 assert.equal(h.run({action:'delete',sourceIds:['d','c','b','root']}),true);assert.deepEqual(h.document.cover,cover);assert.deepEqual(h.document.pages,[]);assert.equal(findManualObject(h.state,'table'),null);assert.ok(h.state.selection.from>=0&&h.state.selection.to<=h.state.doc.content.size);assert.equal(h.state.selection.$from.node(1).attrs.id,'cover');undoRedo(h,before);
});

function coverFlowFixture({survivor=true}={}){
 const d=fixture();
 const tails=['cover-tail-a','cover-tail-b'].map(id=>{
  const tail=page(id);
  tail.extensions=withManualPaginationMarker({extensions:tail.extensions},{kind:'page',rootPageId:d.cover.id}).extensions;
  tail.blocks[0].extensions=withManualPaginationMarker({extensions:tail.blocks[0].extensions},{kind:'block',rootBlockId:'cover-body',sourceType:'paragraph'}).extensions;
  return tail;
 });
 d.pages=[...tails,...(survivor?[d.pages.at(-1)]:[])];return d;
}

test('cover-flow family: delete closes over consecutive tails and preserves independent survivor selection and one UndoRedo',()=>{
 const h=harness(coverFlowFixture());h.select('d-body');const before=h.state,survivor=structuredClone(h.document.pages.at(-1));
 const cap=getManualPageGroupActionState(h.state,{sourceIds:['cover'],action:'delete'});assert.equal(cap.enabled,true);assert.deepEqual(cap.physicalIds,['cover','cover-tail-a','cover-tail-b']);
 assert.equal(h.run({action:'delete',sourceIds:['cover']}),true);assert.equal(Object.hasOwn(h.document,'cover'),false);assert.deepEqual(h.document.pages,[survivor]);assert.deepEqual(roots(h),['d']);
 for(const id of ['cover','cover-tail-a','cover-tail-b'])assert.equal(findManualObject(h.state,id),null);assert.equal(h.state.selection.$from.parent.attrs.id,'d-body');assert.equal(h.state.selection.$from.parentOffset,before.selection.$from.parentOffset);assert.ok(h.state.selection.eq(before.selection.map(h.state.doc,h.last.mapping)));undoRedo(h,before);
});

test('cover-flow family: nonconsecutive tails reject cover source and orphan source or target',()=>{
 const d=coverFlowFixture(),orphan=page('cover-orphan');orphan.extensions=withManualPaginationMarker({extensions:orphan.extensions},{kind:'page',rootPageId:'cover'}).extensions;d.pages.push(orphan);const h=harness(d);
 assert.equal(getManualPageGroupActionState(h.state,{sourceIds:['cover'],action:'delete'}).enabled,false);noChange(h,{action:'delete',sourceIds:['cover']});noChange(h,{action:'move',sourceIds:['cover'],targetId:'d',edge:'before'});noChange(h,{action:'duplicate',sourceIds:['cover-orphan']});noChange(h,{action:'delete',sourceIds:['cover-orphan']});noChange(h,{action:'move',sourceIds:['d'],targetId:'cover-orphan',edge:'after'});const malformedTarget={action:'move',sourceIds:['d'],targetId:'cover',edge:'before'};assert.equal(getManualPageGroupActionState(h.state,malformedTarget).enabled,false);noChange(h,malformedTarget);
});

test('cover-flow family: a sole cover family rejects deletion and movement but duplicates its complete family',()=>{
 const h=harness(coverFlowFixture({survivor:false}));assert.deepEqual(roots(h),['cover']);const cap=getManualPageGroupActionState(h.state,{sourceIds:['cover']});assert.deepEqual(cap.physicalIds,['cover','cover-tail-a','cover-tail-b']);
 assert.equal(cap.delete.reason,'last-item');assert.equal(cap.move.enabled,false);assert.equal(cap.move.reason,'no-op');assert.equal(cap.duplicate.enabled,true);for(const action of ['delete','move'])noChange(h,{action,sourceIds:['cover']});const before=h.state;assert.equal(h.run({action:'duplicate',sourceIds:['cover']}),true);assert.equal(getManualPageGroups(h.state.doc).length,2);assert.equal(getManualPageGroups(h.state.doc)[1].pageIds.length,3);undoRedo(h,before);invariants(h);
});

test('cover-flow family: physical tail sources reject and an independent page moves before the complete cover family',()=>{
 const h=harness(coverFlowFixture());for(const sourceIds of [['cover-tail-a'],['cover-tail-b']]){noChange(h,{action:'delete',sourceIds});noChange(h,{action:'move',sourceIds,targetId:'d',edge:'after'});}
 h.select('d-body');const before=h.state,oldIds=new Set(ids(before.doc)),cover=structuredClone(h.document.cover),pages=structuredClone(h.document.pages);
 assert.equal(h.run({action:'move',sourceIds:['d'],targetId:'cover',edge:'before'}),true);assert.deepEqual(Array.from({length:h.state.doc.childCount},(_,index)=>h.state.doc.child(index).attrs.id),['d','cover','cover-tail-a','cover-tail-b']);assert.deepEqual(roots(h),['d','cover']);assert.deepEqual(new Set(ids(h.state.doc)),oldIds);
 assert.deepEqual(h.document.cover,cover);assert.deepEqual(h.document.pages,[pages.at(-1),...pages.slice(0,2)]);assert.equal(h.state.selection.$from.parent.attrs.id,'d-body');assert.equal(h.state.selection.$from.parentOffset,before.selection.$from.parentOffset);undoRedo(h,before);
});


test('cover-flow family: moving the later cover before a body page preserves its complete family, metadata and one UndoRedo',()=>{
 const d=coverFlowFixture();d.cover.metadata=[{id:'cover-document-number',label:inline('문서 번호'),value:inline('DOC-002'),extensions:{vendor:{metadata:true}}}];
 const h=harness(withManualPageOrder(d,['d','cover','cover-tail-a','cover-tail-b']));h.select('cover-tail-b-body',2);
 const before=h.state,oldIds=new Set(ids(before.doc)),cover=structuredClone(h.document.cover),pages=new Map(h.document.pages.map(p=>[p.id,structuredClone(p)]));
 const options={action:'move',sourceIds:['cover'],targetId:'d',edge:'before',revision:before.doc},cap=getManualPageGroupActionState(h.state,options);
 assert.equal(cap.enabled,true);assert.deepEqual(cap.physicalIds,['cover','cover-tail-a','cover-tail-b']);const count=h.count;
 assert.equal(h.run(options),true);assert.equal(h.count,count+1);
 assert.deepEqual(Array.from({length:h.state.doc.childCount},(_,i)=>h.state.doc.child(i).attrs.id),['cover','cover-tail-a','cover-tail-b','d']);assert.deepEqual(roots(h),['cover','d']);
 assert.deepEqual(h.document.cover,cover);assert.deepEqual(h.document.pages,['cover-tail-a','cover-tail-b','d'].map(id=>pages.get(id)));assert.deepEqual(new Set(ids(h.state.doc)),oldIds);
 assert.equal(h.state.selection.$from.parent.attrs.id,'cover-tail-b-body');assert.equal(h.state.selection.$from.parentOffset,before.selection.$from.parentOffset);
 assert.deepEqual(h.last.getMeta(MANUAL_PAGE_GROUP_ACTION_RESULT),{action:'move',rootIds:['cover'],physicalIds:['cover','cover-tail-a','cover-tail-b']});undoRedo(h,before);
 for(const sourceIds of [['cover'],['d','cover']]){const duplicate={action:'duplicate',sourceIds};assert.equal(getManualPageGroupActionState(h.state,duplicate).enabled,true);const beforeDuplicate=h.state;assert.equal(h.run(duplicate),true);undoRedo(h,beforeDuplicate);}
});
