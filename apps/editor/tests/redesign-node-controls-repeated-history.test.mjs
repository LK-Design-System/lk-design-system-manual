import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {createManualState,findManualObject,documentFromState,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {createManualTodoNodeView} from '../src/redesign/manual-todo-view.mjs';
import {createManualToggleNodeView} from '../src/redesign/manual-toggle-view.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
class Element{constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.listeners={};}append(...nodes){this.children.push(...nodes);}contains(node){return node===this||this.children.some(child=>child.contains(node));}setAttribute(key,value){this.attrs[key]=value;}addEventListener(key,fn){this.listeners[key]=fn;}}
const owner={createElement:tag=>new Element(tag)},rich=text=>[{type:'text',text,marks:[{type:'strong'},{type:'underline'}]}];
for(const kind of ['toggle','todo'])test(`two rapid ${kind} activations remain two exact Undo/Redo steps`,()=>{
 const block=kind==='todo'?{type:'todo',id:'control',checked:false,content:rich('내용'),extensions:{opaque:{keep:[1,2]}}}:{type:'toggle',id:'control',open:true,title:rich('제목'),blocks:[{type:'paragraph',id:'body',content:rich('본문')}],extensions:{opaque:{keep:[1,2]}}};
 let state=createManualState({document:{schemaVersion:2,id:'doc',title:'Synthetic',pages:[{id:'page',title:[],blocks:[block]}]}}),count=0;
 const dispatch=tr=>{count++;state=state.applyTransaction(tr).state;};
 const editor={get state(){return state;},dispatch,editable:true,composing:false,dom:{isConnected:true},props:{},endOfTextblock:()=>true};
 const found=findManualObject(state,'control');dispatch(state.tr.setSelection(TextSelection.create(state.doc,found.pos+(kind==='todo'?1:2))));const initial=state;
 const nv=kind==='todo'?createManualTodoNodeView(found.node,editor,owner):createManualToggleNodeView(found.node,editor,owner);nv.dom.isConnected=true;const control=nv.dom.children[0];
 function activate(){const before=count;if(kind==='todo'){control.checked=!control.checked;control.listeners.change(new Event('change'));}else control.listeners.click({type:'click',button:0,detail:0,defaultPrevented:false});assert.equal(count,before+1);assert.equal(nv.update(findManualObject(state,'control').node),true);}
 activate();const first=state;activate();const second=state;assert.ok(second.doc.eq(initial.doc),'two opposite attribute changes restore the original document');
 assert.equal(manualCommands.undo(state,dispatch,editor),true);assert.ok(state.doc.eq(first.doc),'Undo1 cancels only the second activation');assert.ok(state.selection.eq(first.selection));
 assert.equal(manualCommands.undo(state,dispatch,editor),true);assert.ok(state.doc.eq(initial.doc));assert.ok(state.selection.eq(initial.selection));
 assert.equal(manualCommands.redo(state,dispatch,editor),true);assert.ok(state.doc.eq(first.doc));assert.ok(state.selection.eq(first.selection));assert.equal(manualCommands.redo(state,dispatch,editor),true);assert.ok(state.doc.eq(second.doc));assert.ok(state.selection.eq(second.selection));
 const out=documentFromState(state);assert.deepEqual(documentFromState(createManualState({document:decodeDocumentFile(encodeDocumentFile({document:out,assets:{}})).document})),out);
});
