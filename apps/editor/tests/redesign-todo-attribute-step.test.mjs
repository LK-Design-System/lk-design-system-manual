import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection,NodeSelection} from '@tiptap/pm/state';
import {createManualState,documentFromState,findManualObject,updateManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
function harness(kind='todo'){
 const rich=[{type:'text',text:'원문',marks:[{type:'strong'},{type:'underline'}]}],block=kind==='todo'?{type:kind,id:'control',checked:false,content:rich,extensions:{opaque:{keep:[1,2]}}}:{type:'toggle',id:'control',open:true,title:rich,blocks:[],extensions:{opaque:{keep:[1,2]}}};
 let state=createManualState({document:{schemaVersion:2,id:'doc',title:'Synthetic',pages:[{id:'page',title:[],blocks:[block]}]}}),count=0,last;
 const dispatch=tr=>{count++;last=tr;state=state.applyTransaction(tr).state;};return {get state(){return state;},get count(){return count;},get last(){return last;},dispatch,run:fn=>fn(state,dispatch)};
}
for(const nodeSelection of [false,true])test(`exact single checked boolean uses one empty-map AttrStep and preserves ${nodeSelection?'node':'text'} selection, stored marks, content and opaque metadata`,()=>{
 const h=harness(),found=findManualObject(h.state,'control');h.dispatch(h.state.tr.setSelection(nodeSelection?NodeSelection.create(h.state.doc,found.pos):TextSelection.create(h.state.doc,found.pos+1)).setStoredMarks([h.state.schema.marks.emphasis.create()]));const before=h.state,count=h.count;
 assert.equal(updateManualObject('control',{checked:true})(before),true);assert.equal(h.count,count);assert.equal(h.run(updateManualObject('control',{checked:true})),true);assert.equal(h.count,count+1);assert.equal(h.last.steps.length,1);assert.equal(h.last.steps[0].toJSON().stepType,'attr');let ranges=0;h.last.steps[0].getMap().forEach(()=>ranges++);assert.equal(ranges,0);
 const after=h.state,node=findManualObject(after,'control').node;assert.equal(node.attrs.id,found.node.attrs.id);assert.ok(node.content.eq(found.node.content));assert.deepEqual(node.marks,found.node.marks);assert.deepEqual(node.attrs.meta,{...found.node.attrs.meta,checked:true});assert.ok(after.selection.eq(before.selection));assert.deepEqual(after.storedMarks,before.storedMarks);
 const out=documentFromState(after);assert.deepEqual(documentFromState(createManualState({document:decodeDocumentFile(encodeDocumentFile({document:out,assets:{}})).document})),out);assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));
});
for(const [label,patch,options,kind]of [['multiple fields',{checked:true,extensions:{opaque:{new:true}}},{},'todo'],['explicit removal',{checked:true},{remove:['lang']},'todo'],['toggle open',{open:false},{},'toggle']])test(`${label} stays on the generic attribute update path`,()=>{const h=harness(kind);assert.equal(h.run(updateManualObject('control',patch,options)),true);assert.equal(h.last.steps.length,1);assert.notEqual(h.last.steps[0].toJSON().stepType,'attr');});
test('nonboolean checked is rejected by DTO validation without dispatch',()=>{const h=harness(),before=h.state;assert.equal(h.run(updateManualObject('control',{checked:'true'})),false);assert.equal(h.count,0);assert.equal(h.state,before);});
