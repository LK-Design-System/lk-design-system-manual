import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {createManualState,findManualObject,documentFromState,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {createManualTodoNodeView} from '../src/redesign/manual-todo-view.mjs';
import {createManualToggleNodeView} from '../src/redesign/manual-toggle-view.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
class Element{constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.listeners={};}append(...nodes){this.children.push(...nodes);}contains(node){return node===this||this.children.some(child=>child.contains(node));}setAttribute(key,value){this.attrs[key]=value;}addEventListener(key,fn){this.listeners[key]=fn;}}
const owner={createElement:tag=>new Element(tag)},rich=text=>[{type:'text',text,marks:[{type:'strong'},{type:'underline'}]}];
for(const field of ['todo','toggle-title','toggle-body'])test(`control activation then immediate typing at ${field} start keeps two exact undo steps`,()=>{
 const block=field==='todo'?{type:'todo',id:'control',checked:false,content:rich('기존 내용'),extensions:{opaque:{keep:[1,2]}}}:{type:'toggle',id:'control',open:true,title:rich('토글 제목'),blocks:[{type:'paragraph',id:'body',content:rich('기존 본문'),extensions:{opaque:{body:true}}}],extensions:{opaque:{keep:[1,2]}}};
 let state=createManualState({document:{schemaVersion:2,id:'doc',title:'Synthetic',pages:[{id:'page',title:[],blocks:[block]}]}}),count=0;
 const dispatch=tr=>{count++;state=state.applyTransaction(tr).state;};
 const editor={get state(){return state;},dispatch,editable:true,composing:false,dom:{isConnected:true},props:{},endOfTextblock:()=>true};
 const found=findManualObject(state,'control');dispatch(state.tr.setSelection(TextSelection.create(state.doc,found.pos+(field==='todo'?1:2))));const initial=state;
 const nv=field==='todo'?createManualTodoNodeView(found.node,editor,owner):createManualToggleNodeView(found.node,editor,owner);nv.dom.isConnected=true;const control=nv.dom.children[0];
 // Fold first for title editing; open the initially folded body for body editing.
 if(field==='toggle-body'){state=state.apply(state.tr.setNodeAttribute(found.pos,'meta',{...found.node.attrs.meta,open:false}).setMeta('addToHistory',false));nv.update(findManualObject(state,'control').node);}
 const beforeControl=state,beforeCount=count;
 if(field==='todo'){control.checked=true;control.listeners.change(new Event('change'));}else control.listeners.click({type:'click',button:0,detail:1,defaultPrevented:false});
 assert.equal(count,beforeCount+1);const activated=state;
 const pos=field==='todo'?findManualObject(state,'control').pos+1:field==='toggle-title'?findManualObject(state,'control').pos+2:findManualObject(state,'body').pos+1;
 dispatch(state.tr.setSelection(TextSelection.create(state.doc,pos)));const beforeInput=state;dispatch(state.tr.insertText('이후 입력 '));const typed=state;
 assert.equal(manualCommands.undo(state,dispatch,editor),true);assert.ok(state.doc.eq(activated.doc),'Undo1 must cancel only typing and retain activated control state');assert.ok(state.selection.eq(beforeInput.selection));
 assert.equal(manualCommands.undo(state,dispatch,editor),true);assert.ok(state.doc.eq(beforeControl.doc));assert.ok(state.selection.eq(beforeControl.selection));
 assert.equal(manualCommands.redo(state,dispatch,editor),true);assert.ok(state.doc.eq(activated.doc));assert.ok(state.selection.eq(beforeInput.selection));assert.equal(manualCommands.redo(state,dispatch,editor),true);assert.ok(state.doc.eq(typed.doc));assert.ok(state.selection.eq(typed.selection));
 const out=documentFromState(state);assert.deepEqual(documentFromState(createManualState({document:decodeDocumentFile(encodeDocumentFile({document:out,assets:{}})).document})),out);
});
