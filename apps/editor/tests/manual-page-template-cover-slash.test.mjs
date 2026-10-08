import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {createEmptyManualDocument,createManualParagraph} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,findManualObject,findManualCoverRole,getManualSlashTrigger,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {insertManualPageTemplate} from '../src/redesign/manual-page-templates.mjs';

test('exact cover slash consumes only its live prefix, preserves the empty paragraph and focuses title with one Undo/Redo',()=>{
 const document=createEmptyManualDocument({title:'Cover via slash'}),paragraph=document.pages[0].blocks[0],sentinel=createManualParagraph();paragraph.content=[{type:'text',text:'/표지'}];paragraph.extensions={vendor:'keep-empty'};sentinel.content=[{type:'text',text:'Original',marks:[{type:'strong'}]}];document.pages[0].blocks.push(sentinel);document.extensions={vendor:{keep:true}};const snapshot=structuredClone(document);
 let state=createManualState({document});const dispatch=tr=>{state=state.applyTransaction(tr).state;};dispatch(state.tr.setSelection(TextSelection.create(state.doc,findManualObject(state,paragraph.id).pos+1+3)));const before=state,trigger=getManualSlashTrigger(state);assert.ok(trigger);
 const command=insertManualPageTemplate('cover',{beforeFirstPage:true,revision:before.doc,trigger});assert.equal(command(state),true);assert.equal(state,before);
 for(const bad of [{...trigger,query:'wrong'},{...trigger,blockId:'missing'},{...trigger,from:trigger.from+1},{...trigger,to:trigger.to-1}])assert.equal(insertManualPageTemplate('cover',{beforeFirstPage:true,trigger:bad})(state,dispatch),false);
 assert.equal(insertManualPageTemplate('body',{beforeFirstPage:true,trigger})(state,dispatch),false);for(const view of [{editable:false},{composing:true}])assert.equal(command(state,dispatch,view),false);assert.equal(state,before);
 assert.equal(command(state,dispatch),true);const after=state,result=documentFromState(state),expected=structuredClone(document);expected.pages[0].blocks[0].content=[];
 assert.deepEqual(result.pages,expected.pages);assert.deepEqual(result.extensions,expected.extensions);assert.deepEqual(document,snapshot);const role=findManualCoverRole(state,result.cover.id,'title');assert.equal(state.selection.from,role.pos+1);assert.equal(state.selection.$from.parentOffset,0);assert.ok(state.selection instanceof TextSelection);

 assert.equal(manualCommands.undo(state,dispatch),true);assert.ok(state.doc.eq(before.doc));assert.ok(state.selection.eq(before.selection));assert.equal(documentFromState(state).pages[0].blocks[0].content[0].text,'/표지');assert.equal(manualCommands.redo(state,dispatch),true);assert.ok(state.doc.eq(after.doc));assert.ok(state.selection.eq(after.selection));
});
