import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {createManualState,findManualObject,documentFromState,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {createManualTodoNodeView} from '../src/redesign/manual-todo-view.mjs';
import {createManualToggleNodeView} from '../src/redesign/manual-toggle-view.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
class Element{constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.listeners={};}append(...nodes){this.children.push(...nodes);}contains(node){return node===this||this.children.some(child=>child.contains(node));}setAttribute(key,value){this.attrs[key]=value;}addEventListener(key,fn){this.listeners[key]=fn;}}
const owner={createElement:tag=>new Element(tag)},rich=text=>[{type:'text',text,marks:[{type:'strong'},{type:'underline'}]}];
for(const field of ['todo','toggle-title','toggle-body'])test(`rapid typing at ${field} start then actual control callback forms independent history event with exact Undo/Redo`,()=>{
 const block=field==='todo'?{type:'todo',id:'control',checked:false,content:rich('기존 내용'),extensions:{opaque:{keep:[1,2]}}}:{type:'toggle',id:'control',open:true,title:rich('토글 제목'),blocks:[{type:'paragraph',id:'body',content:rich('기존 본문'),extensions:{opaque:{body:true}}}],extensions:{opaque:{keep:[1,2]}}};
 let state=createManualState({document:{schemaVersion:2,id:'doc',title:'Synthetic',pages:[{id:'page',title:[],blocks:[block]}]}}),count=0;
 // Use immediate edits with PM's normal timestamps and history grouping.
 const dispatch=tr=>{count++;state=state.applyTransaction(tr).state;};
 const editor={get state(){return state;},dispatch,editable:true,composing:false,dom:{isConnected:true},props:{},endOfTextblock:()=>true};
 const found=findManualObject(state,'control'),pos=field==='todo'?found.pos+1:field==='toggle-title'?found.pos+2:findManualObject(state,'body').pos+1;
 dispatch(state.tr.setSelection(TextSelection.create(state.doc,pos)));const initial=state;
 const nv=field==='todo'?createManualTodoNodeView(found.node,editor,owner):createManualToggleNodeView(found.node,editor,owner);nv.dom.isConnected=true;
 dispatch(state.tr.insertText('최근 입력 '));const typed=state;assert.equal(nv.update(findManualObject(state,'control').node),true);const beforeCount=count,control=nv.dom.children[0];
 if(field==='todo'){control.checked=true;control.listeners.change(new Event('change'));}else control.listeners.click({type:'click',button:0,detail:1,defaultPrevented:false});
 assert.equal(count,beforeCount+1);const changed=state,node=findManualObject(state,'control').node;assert.equal(field==='todo'?node.attrs.meta.checked:node.attrs.meta.open,field==='todo');assert.deepEqual(node.attrs.meta.extensions,findManualObject(typed,'control').node.attrs.meta.extensions);
 assert.equal(manualCommands.undo(state,dispatch,editor),true);assert.ok(state.doc.eq(typed.doc),'Undo1 must retain recent typing and restore only the control attribute');assert.ok(state.selection.eq(typed.selection),'Undo1 restores the caret immediately before control activation');
 assert.equal(manualCommands.redo(state,dispatch,editor),true);assert.ok(state.doc.eq(changed.doc));assert.ok(state.selection.eq(changed.selection));
 const out=documentFromState(state);assert.deepEqual(documentFromState(createManualState({document:decodeDocumentFile(encodeDocumentFile({document:out,assets:{}})).document})),out);
 assert.equal(manualCommands.undo(state,dispatch,editor),true);assert.equal(manualCommands.undo(state,dispatch,editor),true);assert.ok(state.doc.eq(initial.doc));assert.ok(state.selection.eq(initial.selection));
 assert.equal(manualCommands.redo(state,dispatch,editor),true);assert.ok(state.doc.eq(typed.doc));assert.ok(state.selection.eq(typed.selection));assert.equal(manualCommands.redo(state,dispatch,editor),true);assert.ok(state.doc.eq(changed.doc));assert.ok(state.selection.eq(changed.selection));
});
