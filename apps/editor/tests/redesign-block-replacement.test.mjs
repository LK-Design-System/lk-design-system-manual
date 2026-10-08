import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection,NodeSelection} from '@tiptap/pm/state';
import {Slice,Fragment} from '@tiptap/pm/model';
import {closeHistory} from '@tiptap/pm/history';
import {createEmptyManualDocument,validateManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {planManualPagination,createManualPaginationTransaction} from '../src/redesign/manual-pagination.mjs';
import {manualPaginationTextSelection,repeatedManualPaginationHeaders} from '../src/redesign/manual-pagination-selection.mjs';
import {selectManualBlocks,manualBlockSelectionPlugin} from '../src/redesign/manual-block-selection.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
const id=()=>crypto.randomUUID(),run=(text,marks=[{type:'strong'}])=>({type:'text',text,marks});
const para=content=>({id:id(),type:'paragraph',content,extensions:{opaque:{retain:true}}});
function harness(document){let state=createManualState({document,plugins:[manualBlockSelectionPlugin()]}),last;const dispatch=tr=>{last=tr;state=state.applyTransaction(tr).state;};return {get state(){return state;},get last(){return last;},get document(){return documentFromState(state);},dispatch,run:c=>c(state,dispatch),close(){dispatch(closeHistory(state.tr));}};}
function measurement(h,split,capacity=100){return {doc:h.state.doc,revision:1,pages:h.document.pages.map((p,index)=>({id:p.id,capacity,blocks:p.blocks.map((b,bi)=>({id:b.id,height:split&&index===0&&bi===0?160:10,...(split&&index===0&&bi===0?{splits:[{...split,headHeight:80,tailHeight:80}]}:{})}))}))};}
function flow(h,m,historyTransaction){const plan=planManualPagination(h.state,m);assert.equal(plan.status,'ready');const tr=createManualPaginationTransaction(h.state,plan,historyTransaction?{historyTransaction}:{});assert.ok(tr);h.dispatch(tr);return plan;}
function settle(h,key){for(let i=0;i<12;i++){const m=measurement(h,null,1000),plan=planManualPagination(h.state,m);if(plan.status==='stable')return;assert.equal(plan.status,'ready');h.dispatch(createManualPaginationTransaction(h.state,plan,{historyTransaction:key}));}throw Error('flow not stable');}
function invariants(h){validateManualDocument(h.document);assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document:h.document,assets:{}})).document,h.document);const ids=[];h.state.doc.descendants(n=>{if(n.attrs.id)ids.push(n.attrs.id);});assert.equal(new Set(ids).size,ids.length);}
function undoRedo(h,beforeState){const after=h.state;assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(beforeState.doc));assert.ok(h.state.selection.eq(beforeState.selection));assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));invariants(h);}
const check=(name,fn)=>test(name,fn);
for(const reverse of [false,true])check(`automatic mixed block ${reverse?'reverse':'forward'} selection replacement and continued typing`,()=>{
 const d=createEmptyManualDocument(),first=para([run('ABCD'),run('EFGH',[{type:'underline'}])]),second=para([run('keep',[{type:'emphasis'}])]);d.pages[0].title=[run('Task')];d.pages[0].blocks=[first,second];const h=harness(d);flow(h,measurement(h,{kind:'text',at:4}));const tail=h.document.pages[1].blocks[0];assert.equal(h.run(selectManualBlocks(reverse?tail.id:first.id,reverse?first.id:tail.id)),true);h.close();const beforeState=h.state;h.dispatch(h.state.tr.insertText('교체😀'));const key=h.last;settle(h,key);assert.deepEqual(h.document.pages[0].title,d.pages[0].title);assert.equal(h.document.pages[0].blocks.map(b=>b.content.map(r=>r.text??'\n').join('')).join('|'),'교체😀|keep');assert.equal(h.document.pages[0].blocks[1].id,second.id);assert.deepEqual(h.document.pages[0].blocks[1],second);undoRedo(h,beforeState);h.close();h.dispatch(h.state.tr.insertText('계속'));assert.equal(h.document.pages[0].blocks[0].content.map(r=>r.text).join(''),'교체😀계속');invariants(h);});

for(const reverse of [false,true])test(`explicit page block replacement ${reverse?'reverse':'forward'} keeps titles and types into the replacement end`,()=>{
 const d=createEmptyManualDocument(),a=para([run('A')]),b=para([run('B')]),keep=para([run('KEEP')]);d.pages[0].title=[run('Title')];d.pages[0].blocks=[a,b,keep];const h=harness(d);h.run(selectManualBlocks(reverse?b.id:a.id,reverse?a.id:b.id));h.close();const before=h.state;h.dispatch(h.state.tr.insertText('X😀'));assert.equal(h.state.selection.$from.parent.type.name,'paragraph');assert.equal(h.state.selection.$from.parentOffset,3);assert.deepEqual(h.document.pages[0].title,d.pages[0].title);undoRedo(h,before);h.close();h.dispatch(h.state.tr.insertText('Y'));assert.equal(h.document.pages[0].blocks[0].content.map(r=>r.text).join(''),'X😀Y');assert.deepEqual(h.document.pages[0].blocks[1],keep);invariants(h);
});
test('empty deletion retains a valid selection and an exact UndoRedo',()=>{
 const d=createEmptyManualDocument(),p=para([run('A')]);d.pages[0].blocks=[p];const h=harness(d);h.run(selectManualBlocks(p.id));h.close();const before=h.state;h.dispatch(h.state.tr.deleteSelection());assert.equal(h.state.selection.empty,true);assert.equal(h.document.pages[0].blocks.length,0);undoRedo(h,before);
});
test('atomic replacement selects the inserted body atom and preserves its metadata',()=>{
 const d=createEmptyManualDocument(),p=para([run('A')]);d.pages[0].title=[run('Title')];d.pages[0].blocks=[p];const h=harness(d);h.run(selectManualBlocks(p.id));h.close();const before=h.state,atom=h.state.schema.nodes.divider.create({id:id(),meta:{extensions:{vendor:'keep'}}});h.dispatch(h.state.tr.replaceSelection(new Slice(Fragment.from(atom),0,0)));assert.ok(h.state.selection instanceof NodeSelection);assert.equal(h.state.selection.node.attrs.id,atom.attrs.id);assert.deepEqual(h.document.pages[0].title,d.pages[0].title);assert.deepEqual(h.document.pages[0].blocks[0].extensions,{vendor:'keep'});undoRedo(h,before);
});
