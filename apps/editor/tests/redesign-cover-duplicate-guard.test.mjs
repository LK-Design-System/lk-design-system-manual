import test from 'node:test';
import assert from 'node:assert/strict';
import {NodeSelection} from '@tiptap/pm/state';
import {createManualState,duplicateManualObject,findManualObject,findManualPageRole,documentFromState,manualCommands} from '../src/redesign/manual-kernel.mjs';
const document={schemaVersion:2,id:'doc',title:'Synthetic',cover:{id:'cover',title:[{type:'text',text:'Cover'}],metadata:[],blocks:[]},pages:[{id:'page',title:[{type:'text',text:'Page'}],blocks:[{id:'body',type:'paragraph',content:[{type:'text',text:'Body',marks:[{type:'strong'}]}],extensions:{vendor:{keep:true}}}]}]};
test('cover duplicate can/dry-run and actual command reject before dispatch, matching the existing one-cover transaction filter',()=>{
 const state=createManualState({document}),found=findManualObject(state,'cover');assert.equal(found.parent.canReplaceWith(found.index+1,found.index+1,found.node.type),true);let dispatchCount=0;
 assert.equal(duplicateManualObject('cover')(state),false);assert.equal(duplicateManualObject('cover')(state,()=>dispatchCount++),false);assert.equal(dispatchCount,0);assert.deepEqual(documentFromState(state),document);
 const forged=state.tr.insert(found.pos+found.node.nodeSize,found.node),result=state.applyTransaction(forged);assert.equal(result.transactions.length,0);assert.equal(result.state,state);assert.ok(result.state.doc.eq(state.doc));assert.ok(result.state.selection.eq(state.selection));
});
test('ordinary page duplication still dispatches once and one Undo restores the complete document and selection',()=>{
 let state=createManualState({document}),dispatchCount=0;const original=state,dispatch=tr=>{dispatchCount++;state=state.applyTransaction(tr).state;};assert.equal(duplicateManualObject('page')(state),true);assert.equal(duplicateManualObject('page')(state,dispatch),true);assert.equal(dispatchCount,1);const after=state,dto=documentFromState(after);
 assert.equal(dto.pages.length,2);assert.deepEqual(dto.cover,document.cover);assert.notEqual(dto.pages[1].id,'page');assert.notEqual(dto.pages[1].blocks[0].id,'body');assert.deepEqual(dto.pages[1].title,document.pages[0].title);assert.deepEqual(dto.pages[1].blocks[0].content,document.pages[0].blocks[0].content);assert.deepEqual(dto.pages[1].blocks[0].extensions,document.pages[0].blocks[0].extensions);assert.ok(after.selection instanceof NodeSelection);assert.equal(after.selection.node.attrs.id,dto.pages[1].id);assert.notEqual(findManualPageRole(after,'page','title').node.attrs.id,findManualPageRole(after,dto.pages[1].id,'title').node.attrs.id);
 assert.equal(manualCommands.undo(state,dispatch),true);assert.ok(state.doc.eq(original.doc));assert.ok(state.selection.eq(original.selection));assert.deepEqual(documentFromState(state),document);assert.equal(manualCommands.redo(state,dispatch),true);assert.ok(state.doc.eq(after.doc));assert.ok(state.selection.eq(after.selection));
});
