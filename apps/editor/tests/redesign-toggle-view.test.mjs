import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {createManualState,findManualObject,documentFromState,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
import {createManualToggleNodeView,createManualToggleTitleNodeView} from '../src/redesign/manual-toggle-view.mjs';
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.listeners={};}
 append(...nodes){this.children.push(...nodes);for(const node of nodes)node.parent=this;}
 contains(node){return node===this||this.children.some(child=>child.contains(node));}
 setAttribute(key,value){this.attrs[key]=value;}
 addEventListener(key,handler){this.listeners[key]=handler;}
}
const owner={createElement:tag=>new Element(tag)};
for(const open of [false,true])test(`app ${open?'expanded':'collapsed'} toggle NodeView forwards editable title key and mutations to PM, exact keymap deletes text`,()=>{
 let state=createManualState({document:{schemaVersion:2,id:'doc',title:'Synthetic',pages:[{id:'page',title:[],blocks:[{type:'toggle',id:'toggle',open,title:[{type:'text',text:'안녕하세요',marks:[{type:'strong'}]}],blocks:[],extensions:{vendor:{keep:true}}}]}]}});
 const dispatch=tr=>{state=state.applyTransaction(tr).state;},editor={get state(){return state;},dispatch,editable:true,composing:false,dom:{isConnected:true},props:{},endOfTextblock:()=>true};
 const node=findManualObject(state,'toggle').node,nv=createManualToggleNodeView(node,editor,owner),title=createManualToggleTitleNodeView(node.firstChild,owner),text=owner.createElement('span');title.contentDOM.append(text);nv.contentDOM.append(title.dom);
 const button=nv.dom.children[0];assert.equal(nv.dom.dataset.open,String(open));assert.equal(button.contentEditable,'false');assert.equal(nv.contentDOM.contentEditable,undefined);assert.equal(title.contentDOM,title.dom);assert.equal(title.dom.contentEditable,undefined);assert.equal(nv.stopEvent({type:'keydown',key:'Backspace',target:text}),false);assert.equal(nv.stopEvent({target:button}),true);assert.equal(nv.ignoreMutation({type:'characterData',target:text}),false);assert.equal(nv.ignoreMutation({type:'selection',target:title.dom}),false);assert.equal(nv.ignoreMutation({type:'attributes',target:button}),true);
 const pos=findManualObject(state,'toggle').pos;dispatch(state.tr.setSelection(TextSelection.create(state.doc,pos+7)));const event={key:'Backspace',keyCode:8,shiftKey:false,altKey:false,metaKey:false,ctrlKey:false,target:text};assert.equal(state.plugins.some(plugin=>plugin.props.handleKeyDown?.(editor,event)),true);assert.equal(findManualObject(state,'toggle').node.firstChild.textContent,'안녕하세');assert.equal(nv.update(findManualObject(state,'toggle').node),true);assert.equal(nv.contentDOM.children[0],title.dom);assert.equal(nv.dom.dataset.open,String(open));
 let prevented=false;button.listeners.mousedown({preventDefault(){prevented=true;}});assert.equal(prevented,true);button.listeners.click();assert.equal(findManualObject(state,'toggle').node.attrs.meta.open,!open);
});

function controlHarness(){
 let state=createManualState({document:{schemaVersion:2,id:'doc',title:'Synthetic',pages:[{id:'page',title:[],blocks:[{type:'toggle',id:'toggle',open:true,title:[{type:'text',text:'안녕하세요',marks:[{type:'strong'}]}],blocks:[{type:'paragraph',id:'body',content:[{type:'text',text:'본문'}]}],extensions:{vendor:{keep:true}}}]}]}}),count=0;
 const dispatch=tr=>{state=state.applyTransaction(tr).state;count++;},editor={get state(){return state;},dispatch,editable:true,composing:false,dom:{isConnected:true},props:{},endOfTextblock:()=>true};
 const found=findManualObject(state,'toggle');dispatch(state.tr.setSelection(TextSelection.create(state.doc,found.pos+7)));const nv=createManualToggleNodeView(found.node,editor,owner);nv.dom.isConnected=true;const button=nv.dom.children[0];
 return {get state(){return state;},get count(){return count;},editor,nv,button,event:(extra={})=>({type:'click',button:0,detail:1,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra}),click(event){button.listeners.click(event);},run:fn=>fn(state,dispatch,editor)};
}
for(const pending of ['figure','table','outline','margin'])test(`pending ${pending} common gesture guard blocks actual disclosure callback and document transaction`,()=>{
 const h=controlHarness(),before=h.state,count=h.count,event=h.event();let called=0;h.editor.props.manualTableSelectionGestureBlocked=(view,received)=>{called++;assert.equal(view,h.editor);assert.equal(received,event);return true;};h.click(event);assert.equal(called,1);assert.equal(h.count,count);assert.ok(h.state===before);assert.ok(event.defaultPrevented);
});
for(const [label,event] of [['prevented',{defaultPrevented:true}],['composing',{isComposing:true}],['ime229',{keyCode:229}]])test(`${label} disclosure event leaves PM state unchanged`,()=>{const h=controlHarness(),before=h.state,count=h.count;h.click(h.event(event));assert.ok(h.state===before);assert.equal(h.count,count);});
for(const mode of ['read-only','view-composing','detached','boolean-guard'])test(`${mode} disclosure guard keeps document`,()=>{const h=controlHarness(),before=h.state;if(mode==='read-only')h.editor.editable=false;if(mode==='view-composing')h.editor.composing=true;if(mode==='detached')h.nv.dom.isConnected=false;if(mode==='boolean-guard')h.editor.props.manualTableSelectionGestureBlocked=true;h.click(h.event());assert.ok(h.state===before);});
for(const detail of [0,1])test(`normal ${detail?'pointer click':'keyboard activation'} remains one edit with exact UndoRedo, selection, title marks and file codec`,()=>{const h=controlHarness(),before=h.state,count=h.count;h.editor.props.manualTableSelectionGestureBlocked=()=>false;h.click(h.event({detail}));assert.equal(h.count,count+1);const after=h.state,node=findManualObject(after,'toggle').node;assert.equal(node.attrs.meta.open,false);assert.ok(node.content.eq(findManualObject(before,'toggle').node.content));assert.equal(after.selection.$from.parent.type.name,'toggleTitle');assert.equal(after.selection.$from.parentOffset,0);const out=documentFromState(after);assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document:out,assets:{}})).document,out);assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));});
for(const mode of ['removed','retyped'])test(`${mode} disclosure node cannot update stale model identity`,()=>{const h=controlHarness(),found=findManualObject(h.state,'toggle');h.editor.dispatch(mode==='removed'?h.state.tr.delete(found.pos,found.pos+found.node.nodeSize):h.state.tr.replaceWith(found.pos,found.pos+found.node.nodeSize,h.state.schema.nodes.paragraph.create({id:'toggle',meta:{}},h.state.schema.text('Replacement'))));const before=h.state,count=h.count;h.click(h.event());assert.ok(h.state===before);assert.equal(h.count,count);});
test('disclosure activation uses current PM open attribute rather than stale NodeView snapshot',()=>{const h=controlHarness();h.click(h.event());assert.equal(findManualObject(h.state,'toggle').node.attrs.meta.open,false);h.click(h.event({detail:0}));assert.equal(findManualObject(h.state,'toggle').node.attrs.meta.open,true);});

test('modifier click retains ordinary disclosure activation rather than behaving like a block grip',()=>{const h=controlHarness();h.click(h.event({ctrlKey:true,metaKey:true,shiftKey:true,altKey:true}));assert.equal(findManualObject(h.state,'toggle').node.attrs.meta.open,false);});
