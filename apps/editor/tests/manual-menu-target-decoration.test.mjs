import test from 'node:test';
import assert from 'node:assert/strict';
import {undoDepth} from '@tiptap/pm/history';
import {createManualState,findManualObject,selectManualObject} from '../src/redesign/manual-kernel.mjs';
import {selectManualBlocks,manualBlockSelectionPlugin} from '../src/redesign/manual-block-selection.mjs';
import {manualMenuTargetDecorations} from '../src/redesign/manual-menu-target-decoration.mjs';

function harness(){
 let state=createManualState({document:{schemaVersion:2,id:'doc',title:'Synthetic',cover:{id:'cover',title:[],metadata:[],blocks:[]},pages:[{id:'page',title:[],blocks:[{id:'body',type:'paragraph',content:[{type:'text',text:'Text'}],extensions:{opaque:true}}]}]}});
 const editor={get state(){return state;},editable:true},generation=7;
 return {get state(){return state;},editor,generation,menu:()=>({mode:'block',targetId:'body',editor,revision:state.doc,generation}),run(command){return command(state,tr=>{state=state.applyTransaction(tr).state;});}};
}
function verify(h,options,count){
 const before=h.state,depth=undoDepth(before),selection=before.selection.toJSON(),doc=before.doc.toJSON();
 const set=manualMenuTargetDecorations(before,{menu:h.menu(),editor:h.editor,generation:h.generation,...options});
 assert.equal(set.find().length,count);assert.equal(h.state,before);assert.deepEqual(h.state.doc.toJSON(),doc);assert.deepEqual(h.state.selection.toJSON(),selection);assert.equal(undoDepth(h.state),depth);
 if(count){const target=findManualObject(before,'body'),dec=set.find()[0];assert.equal(dec.from,target.pos);assert.equal(dec.to,target.pos+target.node.nodeSize);assert.deepEqual(dec.type.attrs,{class:'manual-block-menu-target','data-manual-menu-target':'true'});}
 return set;
}
for(const mode of ['block','turnInto'])test(`${mode} menu highlights its exact node without changing caret, document or history`,()=>{
 const h=harness();verify(h,{menu:{...h.menu(),mode}},1);
});
for(const label of ['closed','slash','staleRevision','missingTarget','page','cover','generation','foreignEditor'])test(`${label} produces no target decoration`,()=>{
 const h=harness(),menu=label==='closed'?null:{...h.menu(),...(label==='slash'?{mode:'slash'}:label==='staleRevision'?{revision:{}}:label==='missingTarget'?{targetId:'missing'}:label==='page'||label==='cover'?{targetId:label}:label==='generation'?{generation:8}:{editor:{}})};
 verify(h,{menu},0);
});
for(const label of ['readOnly','editorReadonly'])test(`${label} produces no target decoration`,()=>{const h=harness();if(label==='editorReadonly')h.editor.editable=false;verify(h,label==='readOnly'?{readOnly:true}:{},0);});
test('NodeSelection retains its identity while the separate menu target is shown',()=>{const h=harness();h.run(selectManualObject('body',{text:false}));const before=h.state.selection;verify(h,{},1);assert.equal(h.state.selection,before);});
test('manual block selection and menu target decorations coexist with separate classes',()=>{
 const h=harness();h.run(selectManualBlocks('body'));const before=h.state.selection,overlay=verify(h,{},1),existing=manualBlockSelectionPlugin().props.decorations(h.state),combined=existing.add(h.state.doc,overlay.find());
 assert.equal(h.state.selection,before);assert.ok(combined.find().some(d=>d.type.attrs.class==='manual-block-selected'));assert.ok(combined.find().some(d=>d.type.attrs.class==='manual-block-menu-target'));
});
