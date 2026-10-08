import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {createManualState,documentFromState,findManualObject,findManualCoverRole,getManualSlashTrigger,executeManualBlockCommand,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {createManualPageTemplate} from '../src/redesign/manual-page-templates.mjs';
const rich=text=>text?[{type:'text',text,marks:[{type:'strong'}]}]:[];
function harness(type='paragraph',text='Hello',cover=false){
 const document={schemaVersion:2,id:'doc',title:'Synthetic',pages:[{id:'page',title:rich('Title'),blocks:[{id:'body',type,...(type==='heading'?{level:2}:{}),content:rich(text),extensions:{opaque:{keep:true}}}]}]};
 if(cover){document.cover=createManualPageTemplate('cover');document.cover.blocks=[{id:'body',type,...(type==='heading'?{level:2}:{}),content:rich(text),extensions:{opaque:{keep:true}}}];document.pages[0].blocks=[];}
 let state=createManualState({document});const dispatch=tr=>{state=state.applyTransaction(tr).state;};
 const view={get state(){return state;},dispatch,editable:true,composing:false,dom:{isConnected:true},props:{}};
 return {get state(){return state;},dispatch,view,select(id='body',offset=text.length){const found=findManualObject(state,id);dispatch(state.tr.setSelection(TextSelection.create(state.doc,found.pos+1+offset)));},run(command=manualCommands.enter){return command(state,dispatch,view);},key(){return state.plugins.at(-2).props.handleKeyDown(view,{key:'Enter',keyCode:13,shiftKey:false,altKey:false,ctrlKey:false,metaKey:false});}};
}
for(const type of ['paragraph','heading'])for(const cover of [false,true])test(`${cover?'cover body':'page'} ${type} end Enter creates ordinary paragraph, preserves IDs and one Undo/Redo`,()=>{
 const h=harness(type,'Hello',cover);h.select();const before=h.state;assert.equal(h.key(),true);const after=h.state,node=after.selection.$from.parent;
 assert.equal(node.type.name,'paragraph');assert.notEqual(node.attrs.id,'body');assert.deepEqual(node.attrs.meta,{});assert.ok(findManualObject(after,'body').node.eq(findManualObject(before,'body').node));assert.equal(after.selection.$from.parentOffset,0);
 h.dispatch(after.tr.insertText('/'));assert.equal(getManualSlashTrigger(h.state)?.query,'');h.run(manualCommands.undo);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));h.run(manualCommands.redo);assert.equal(h.state.selection.$from.parent.type.name,'paragraph');
});
for(const type of ['paragraph','heading'])test(`${type} interior Enter keeps text/marks, original ID and heading level without manufacturing title roles`,()=>{
 const h=harness(type);h.select('body',2);const before=h.state;h.run();const left=findManualObject(h.state,'body').node,right=h.state.selection.$from.parent;
 assert.equal(left.textContent,'He');assert.equal(right.textContent,'llo');assert.equal(right.type.name,type);if(type==='heading')assert.equal(right.attrs.level,2);assert.deepEqual(right.attrs.meta.extensions,{opaque:{keep:true}});assert.deepEqual(left.firstChild.marks,right.firstChild.marks);h.run(manualCommands.undo);assert.ok(h.state.doc.eq(before.doc));
});
for(const type of ['paragraph','heading'])test(`${type} start Enter inserts empty paragraph before original unchanged node`,()=>{
 const h=harness(type);h.select('body',0);const before=h.state;h.run();assert.equal(h.state.selection.$from.parent.attrs.id,'body');assert.equal(h.state.selection.$from.parentOffset,0);const original=findManualObject(h.state,'body');assert.equal(original.parent.child(original.index-1).type.name,'paragraph');assert.equal(original.parent.child(original.index-1).textContent,'');assert.ok(original.node.eq(findManualObject(before,'body').node));h.run(manualCommands.undo);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
});
for(const command of ['paragraph','callout','divider'])test(`ordinary empty heading slash ${command} opens and executes with one Undo preserving previous heading`,()=>{
 const h=harness('heading','/');h.select();const before=h.state,trigger=getManualSlashTrigger(before);assert.ok(trigger);assert.equal(trigger.blockId,'body');assert.equal(executeManualBlockCommand(command,{trigger})(before,h.dispatch,h.view),true);assert.ok(!JSON.stringify(documentFromState(h.state)).includes('"text":"/"'));h.run(manualCommands.undo);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
});
test('cover section heading end Enter enters existing body instead of creating another heading/role',()=>{
 const h=harness('paragraph','Hello',true),cover=documentFromState(h.state).cover,section=findManualCoverRole(h.state,cover.id,'sectionTitle');h.select(section.node.attrs.id,section.node.content.size);const before=h.state;h.run();assert.equal(h.state.selection.$from.parent.type.name,'paragraph');assert.equal(h.state.selection.$from.parent.attrs.id,'body');assert.ok(h.state.doc.eq(before.doc));assert.ok(findManualCoverRole(h.state,cover.id,'sectionTitle').node.eq(section.node));
});
test('owned cover headings remain role-safe and unsupported structured/code fields do not trigger slash',()=>{
 const h=harness('paragraph','',true),cover=documentFromState(h.state).cover;
 for(const role of ['title','sectionTitle']){const node=findManualCoverRole(h.state,cover.id,role);h.select(node.node.attrs.id,0);h.dispatch(h.state.tr.insertText('/'));assert.equal(getManualSlashTrigger(h.state),null);}
 const ordinary=harness('heading','/');ordinary.select();assert.equal(getManualSlashTrigger(ordinary.state,{composing:true}),null);
});
for(const flag of ['composing','editable'])test(`Enter respects ${flag} guard`,()=>{const h=harness();h.select();const before=h.state;h.view[flag]=flag==='composing'?true:false;assert.equal(h.run(),false);assert.ok(h.state===before);});
