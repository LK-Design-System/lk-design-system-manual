import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection,NodeSelection} from '@tiptap/pm/state';
import {closeHistory} from '@tiptap/pm/history';
import {createManualState,documentFromState,findManualObject,findManualCoverRole,manualCommands} from '../src/redesign/manual-kernel.mjs';
const rich=text=>[{type:'text',text,marks:[{type:'strong'}]}];
function harness(kind){
 const document={schemaVersion:2,id:'m43',title:'Synthetic',cover:{id:'cover',logo:{src:'synthetic-logo.svg',alt:'Synthetic'},title:[],metadata:[{id:'info',label:rich('Version'),value:rich('1')}],sectionTitle:[],blocks:[]},pages:[{id:'page',title:rich('Body'),blocks:[{id:'keep',type:'paragraph',content:rich('Keep')}]}]};
 let state=createManualState({document}),count=0;const dispatch=tr=>{count++;state=state.applyTransaction(tr).state;};
 let target=findManualCoverRole(state,'cover','title');
 if(kind!=='title'){const node=state.schema.nodes[kind].create({id:'blank',...(kind==='heading'?{level:2}:{}),meta:{extensions:{vendor:{blank:true}}}});dispatch(state.tr.insert(target.pos,node));target=findManualObject(state,'blank');}
 dispatch(closeHistory(state.tr).setSelection(TextSelection.create(state.doc,target.pos+1)));
 const view={get state(){return state;},dispatch,editable:true,composing:false,dom:{isConnected:true},props:{},endOfTextblock:()=>true};
 return {get state(){return state;},get count(){return count;},dispatch,view,run:(cmd=manualCommands.backspace)=>cmd(state,dispatch,view)};
}
for(const kind of ['paragraph','heading','title'])for(const binding of [false,true])test(`M43 ${kind} ${binding?'key binding':'command'} after cover logo preserves logo, metadata, IDs and expected caret`,()=>{
 const h=harness(kind),before=h.state,original=documentFromState(before),logo=findManualCoverRole(before,'cover','logo'),count=h.count;
 assert.equal(binding?h.state.plugins.at(-2).props.handleKeyDown(h.view,{key:'Backspace',keyCode:8,shiftKey:false,altKey:false,ctrlKey:false,metaKey:false}):h.run(),true);assert.equal(h.count,count+1);const after=h.state;
 const result=documentFromState(after);assert.deepEqual(result.pages,original.pages);for(const key of ['id','logo','title','metadata','sectionTitle'])assert.deepEqual(result.cover[key],original.cover[key]);assert.ok(findManualCoverRole(after,'cover','logo').node.eq(logo.node));assert.ok(findManualCoverRole(after,'cover','metadata').node.eq(findManualCoverRole(before,'cover','metadata').node));
 if(kind==='heading'){assert.deepEqual(findManualObject(after,'blank').node.attrs.meta,findManualObject(before,'blank').node.attrs.meta);assert.equal(findManualObject(after,'blank').node.type.name,'paragraph');assert.equal(after.selection.$from.parent.attrs.id,'blank');assert.equal(after.selection.$from.parentOffset,0);}
 else{if(kind==='paragraph')assert.equal(findManualObject(after,'blank'),null);else assert.ok(findManualCoverRole(after,'cover','title').node.eq(findManualCoverRole(before,'cover','title').node));assert.ok(after.selection instanceof NodeSelection);assert.equal(after.selection.node.attrs.id,logo.node.attrs.id);}
 if(kind!=='title'){assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));}
});
