import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {createManualState,documentFromState,findManualObject,manualCommands,updateManualObject} from '../src/redesign/manual-kernel.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';

const rich=text=>[{type:'text',text,marks:[{type:'strong'},{type:'underline'}]}];
function harness(){
 const source={schemaVersion:2,id:'doc',title:'Synthetic',extensions:{vendor:{document:1}},pages:[{id:'page',title:[],extensions:{vendor:{page:2}},blocks:[{type:'callout',id:'callout',title:[],tone:'signal',extensions:{vendor:{opaque:[1,{keep:true}]}},blocks:[{type:'paragraph',id:'body',content:rich('기존 본문'),extensions:{vendor:{body:3}}}]}]}]};
 let state=createManualState({document:source}),count=0,last=[];
 const dispatch=tr=>{const result=state.applyTransaction(tr);state=result.state;count++;last=result.transactions;};
 const body=findManualObject(state,'body');dispatch(state.tr.setSelection(TextSelection.create(state.doc,body.pos+1)).setStoredMarks([state.schema.marks.strong.create(),state.schema.marks.underline.create()]));
 return {source,dispatch,get state(){return state;},get count(){return count;},get last(){return last;},get document(){return documentFromState(state);},run:command=>command(state,dispatch,{get state(){return state;},dispatch,editable:true,composing:false})};
}
function checkPreservation(h){
 const document=h.document,callout=document.pages[0].blocks[0];
 assert.equal(callout.id,'callout');assert.deepEqual(callout.title,[]);assert.equal(callout.blocks[0].id,'body');
 assert.deepEqual(callout.extensions,h.source.pages[0].blocks[0].extensions);assert.deepEqual(callout.blocks[0].extensions,h.source.pages[0].blocks[0].blocks[0].extensions);
 assert.deepEqual(document.extensions,h.source.extensions);assert.deepEqual(document.pages[0].extensions,h.source.pages[0].extensions);
 for(const run of callout.blocks[0].content)assert.deepEqual(run.marks,[{type:'strong'},{type:'underline'}]);
 assert.equal(h.state.selection.$from.parent.attrs.id,'body');
 const reopened=decodeDocumentFile(encodeDocumentFile({document,assets:{}})).document;
 assert.deepEqual(documentFromState(createManualState({document:reopened})),document);
}
for(const direction of ['typing then tone','tone then typing'])test(`titleless callout ${direction}: one Undo cancels only the last action`,()=>{
 const h=harness(),initial=h.state;
 const type=()=>h.dispatch(h.state.tr.insertText('추가 '));
 const tone=()=>{
  const before=h.state,count=h.count;
  assert.equal(h.run(updateManualObject('callout',{tone:'negative'})),true);
  assert.equal(h.count,count+1);assert.equal(h.last.length,1);assert.equal(h.last[0].steps.length,1);
  assert.ok(h.state.selection.eq(before.selection));assert.deepEqual(h.state.storedMarks,before.storedMarks);
 };
 (direction==='typing then tone'?type:tone)();const beforeLast=h.state;
 (direction==='typing then tone'?tone:type)();const after=h.state;
 checkPreservation(h);assert.equal(h.document.pages[0].blocks[0].tone,'negative');
 assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(beforeLast.doc),'first Undo must preserve the preceding action');
 assert.equal(h.state.selection.$from.parent.attrs.id,'body');checkPreservation(h);
 assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));checkPreservation(h);
 assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(beforeLast.doc));
 assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(initial.doc));checkPreservation(h);
});
