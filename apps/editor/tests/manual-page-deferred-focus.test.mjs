import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,findManualObject,selectManualObject} from '../src/redesign/manual-kernel.mjs';
import {insertManualPageTemplate} from '../src/redesign/manual-page-templates.mjs';

const source=readFileSync(new URL('../src/redesign/ManualEditor.jsx',import.meta.url),'utf8');
function callback(name){
 const start=source.indexOf(`function ${name}(`);assert(start>=0);
 const body=start+source.slice(start).search(/\)\{/)+1;let depth=0;
 for(let end=body;end<source.length;end++){
  if(source[end]==='{')depth++;
  if(source[end]==='}'&&!--depth)return source.slice(start,end+1);
 }
 throw new Error(`Missing callback body: ${name}`);
}
const names=['selectionIds','addedPageOwner','deferredFocusEnabled','scheduleFocus','revealAddedPage','command'];
function harness(){
 const microtasks=[],frames=[],calls={focus:0,scroll:0,target:0};
 const document=createEmptyManualDocument();
 const editor={state:createManualState({document}),editable:true,composing:false,dom:{isConnected:true},focus:()=>calls.focus++,nodeDOM:()=>({isConnected:true,scrollIntoView:()=>calls.scroll++})};
 editor.dispatch=tr=>{editor.state=editor.state.applyTransaction(tr).state;};
 assert.equal(insertManualPageTemplate('body',{afterPageId:document.pages[0].id,revision:editor.state.doc})(editor.state,editor.dispatch,editor),true);
 const context={view:{current:editor},generation:{current:4},uiApi:{current:null},findManualObject,ready:true,busy:false,disabled:false,printRequested:false,replacementBusy:false,modal:null,menu:null,setNotice:()=>{},queueMicrotask:fn=>microtasks.push(fn),requestAnimationFrame:fn=>frames.push(fn)};
 for(const name of ['replacing','replacementSaving','printing','figureResizeSession','tableUISession','tableResizeSession','ownOutlineSelectSession','outlineDragSession','marginDrag','dragController','outlineDragController','marqueeController'])context[name]={current:null};
 vm.createContext(context);vm.runInContext(names.map(callback).join('\n'),context);
 context.uiApi.current={deferredFocusEnabled:context.deferredFocusEnabled};
 const owner=context.addedPageOwner(editor),revision=editor.state.doc;
 const step=()=>{const queued=frames.splice(0);queued.forEach(fn=>fn());};
 const drain=()=>{microtasks.splice(0).forEach(fn=>fn());while(frames.length)step();};
 return {context,editor,calls,revision,owner,step,drain,queue(){context.scheduleFocus(null,{frames:2});context.revealAddedPage(editor,4,owner);microtasks.splice(0).forEach(fn=>fn());}};
}
test('current successful public page insertion keeps one focus and one reveal',()=>{
 const h=harness();h.queue();h.drain();assert.deepEqual(h.calls,{focus:1,scroll:1,target:0});assert.equal(h.editor.state.doc,h.revision);
});
test('actual command default focus and added-page reveal keep successful insertion flow',()=>{
 const h=harness(),c=h.context;
 assert.equal(c.command(insertManualPageTemplate('body',{afterPageId:h.owner,revision:h.revision})),true);
 c.revealAddedPage(h.editor,c.generation.current,c.addedPageOwner(h.editor));h.drain();
 assert.deepEqual(h.calls,{focus:1,scroll:1,target:0});
});
const changes={
 figure:c=>{c.figureResizeSession.current={};},tableResize:c=>{c.tableResizeSession.current={};},tableUI:c=>{c.tableUISession.current={};},
 outlineSelection:c=>{c.ownOutlineSelectSession.current={};},outlinePending:c=>{c.outlineDragSession.current={};},marginPending:c=>{c.marginDrag.current={};},
 blockDrag:c=>{c.dragController.current={isDragging:()=>true};},outlineDrag:c=>{c.outlineDragController.current={isDragging:()=>true};},marquee:c=>{c.marqueeController.current={isDragging:()=>true};},
 printing:c=>{c.printing.current=true;},printRequest:c=>{c.printRequested=true;},replacement:c=>{c.replacing.current=true;},replacementSaving:c=>{c.replacementSaving.current=true;},
 busy:c=>{c.busy=true;},notReady:c=>{c.ready=false;},replacementBusy:c=>{c.replacementBusy=true;},modal:c=>{c.modal={};},menu:c=>{c.menu={};},
 composition:c=>{c.view.current.composing=true;},readOnly:c=>{c.view.current.editable=false;},disconnect:c=>{c.view.current.dom.isConnected=false;},
 generation:c=>{c.generation.current++;},editor:c=>{c.view.current={...c.view.current};},
 document:c=>{const e=c.view.current;assert.equal(insertManualPageTemplate('body',{afterPageId:c.addedPageOwner(e),revision:e.state.doc})(e.state,e.dispatch,e),true);},
};
for(const [name,change] of Object.entries(changes))for(const phase of ['before-first-RAF','between-RAFs'])test(`${name} scheduled ${phase} cancels focus and reveal`,()=>{
 const h=harness();h.queue();if(phase==='between-RAFs')h.step();change(h.context);const changedDoc=h.editor.state.doc;h.drain();assert.deepEqual(h.calls,{focus:0,scroll:0,target:0});assert.equal(h.editor.state.doc,changedDoc);
});
test('rejected first frame does not resume after gesture ends',()=>{
 const h=harness();h.queue();h.context.figureResizeSession.current={};h.step();h.context.figureResizeSession.current=null;h.drain();assert.deepEqual(h.calls,{focus:0,scroll:0,target:0});
});
test('same document with another selected owner cancels page reveal',()=>{
 const h=harness();h.queue();h.step();let other;
 h.editor.state.doc.descendants(node=>{if(node.type.name==='page'&&node.attrs.id!==h.owner)other=node.attrs.id;});
 assert.equal(selectManualObject(other)(h.editor.state,h.editor.dispatch,h.editor),true);assert.equal(h.editor.state.doc,h.revision);
 h.drain();assert.equal(h.calls.scroll,0);
});
test('connected target receives focus after UI closure renders before RAF',()=>{
 const h=harness();h.context.menu={};const target={isConnected:true,focus:()=>h.calls.target++};h.context.scheduleFocus(target,{frames:2});h.context.menu=null;h.drain();assert.deepEqual(h.calls,{focus:0,scroll:0,target:1});
});
