import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {NodeSelection} from '@tiptap/pm/state';
import {createManualState,findManualObject,findManualCoverRole,documentFromState} from '../src/redesign/manual-kernel.mjs';
import {createManualDividerNodeView} from '../src/redesign/manual-divider-view.mjs';
import {withManualDividerStyle} from '../src/redesign/manual-divider-style.mjs';
import {canvasHoverTarget} from '../src/ui/canvas-drag.mjs';

// Real PM state and production NodeView callbacks; minimal DOM, no native hit claim.
function fixture(){return {schemaVersion:2,id:'doc',title:'Synthetic',cover:{id:'cover',title:[{type:'text',text:'Title'}],metadata:[],blocks:[]},pages:[{id:'page',title:[],blocks:[{id:'line',type:'divider'},{id:'body',type:'paragraph',content:[{type:'text',text:'Body'}]}]}]};}
function harness(cover=false){
 const listeners=new Map(),dom={dataset:{},isConnected:true,addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
 let state=createManualState({document:fixture()}),count=0,focus=0;
 const editor={get state(){return state;},editable:true,composing:false,dispatch(tr){count++;state=state.applyTransaction(tr).state;},focus(){focus++;}};
 const node=cover?findManualCoverRole(state,'cover','divider').node:findManualObject(state,'line').node;
 const adapter=createManualDividerNodeView(node,editor,{createElement:tag=>{dom.tagName=tag.toUpperCase();return dom;}});
 const fire=props=>{let prevented=0;const event={button:0,preventDefault(){prevented++;},...props};listeners.get('mousedown')?.(event);return {event,prevented};};
 return {editor,dom,adapter,fire,node,get count(){return count;},get focus(){return focus;}};
}
for(const cover of [false,true])test(`${cover?'cover':'ordinary'} HR hit routes to current NodeSelection without document mutation`,()=>{
 const h=harness(cover),before=documentFromState(h.editor.state),{event,prevented}=h.fire();
 assert.equal(h.dom.tagName,'HR');assert.equal(h.count,1);assert.equal(h.focus,1);assert.equal(prevented,1);assert.equal(h.adapter.stopEvent(event),true);
 assert.ok(h.editor.state.selection instanceof NodeSelection);assert.equal(h.editor.state.selection.node.attrs.id,h.node.attrs.id);assert.deepEqual(documentFromState(h.editor.state),before);
 assert.equal(h.dom.dataset.manualCoverRole,cover?'divider':undefined);
});
test('readonly, composition, modifiers, other button, detached and destroyed divider handlers never dispatch',()=>{
 for(const guard of ['readonly','composition','shiftKey','ctrlKey','metaKey','altKey','button','detached','destroyed']){
  const h=harness();let props={};if(guard==='readonly')h.editor.editable=false;else if(guard==='composition')h.editor.composing=true;else if(guard==='button')props.button=2;else if(guard==='detached')h.dom.isConnected=false;else if(guard==='destroyed')h.adapter.destroy();else props[guard]=true;
  const {event,prevented}=h.fire(props);assert.equal(h.count,0,guard);assert.equal(h.focus,0);assert.equal(prevented,0);assert.equal(h.adapter.stopEvent(event),false);
 }
});
test('updated divider ID and released cover marker are read from current node',()=>{
 const h=harness(true),ordinary=findManualObject(h.editor.state,'line').node;assert.equal(h.adapter.update(ordinary),true);assert.equal(h.dom.dataset.manualCoverRole,undefined);h.fire();assert.equal(h.editor.state.selection.node.attrs.id,'line');
 const stale=ordinary.type.create({...ordinary.attrs,id:'missing'});h.adapter.update(stale);const count=h.count;h.fire();assert.equal(h.count,count);
});
function element(kind,top,bottom){return {dataset:{manualNode:kind},getBoundingClientRect:()=>({left:100,right:500,width:400,height:bottom-top,top,bottom}),contains:()=>false};}
test('1px ordinary and 2px cover divider acquire a 24px gutter band, never outside it',()=>{
 for(const height of [1,2]){const line=element('divider',100,100+height),center=100+height/2;
  for(const y of [center-12,center-8,center+8,center+12])assert.equal(canvasHoverTarget([line],{x:80,y}),line);
  for(const y of [center-12.01,center+12.01])assert.equal(canvasHoverTarget([line],{x:80,y}),null);
  assert.equal(canvasHoverTarget([line],{x:80,y:center,visible:()=>false}),null);
 }
});
test('divider extended gutter never steals an actual neighboring row above or below; ordinary gaps stay unchanged',()=>{
 const line=element('divider',100,101),above=element('paragraph',80,96),below=element('heading',105,130);
 for(const entries of [[line,above,below],[below,above,line]]){assert.equal(canvasHoverTarget(entries,{x:80,y:94}),above);assert.equal(canvasHoverTarget(entries,{x:80,y:108}),below);}
 assert.equal(canvasHoverTarget([above],{x:80,y:98}),null);assert.equal(canvasHoverTarget([below],{x:80,y:104}),null);
});

test('public shared gesture hook blocks direct divider selection during active authoring gestures',()=>{
 for(const gesture of ['figure','tableResize','tableUI','outline','margin','marquee','canvasDrag']){
  const h=harness();let inspected=null;h.editor.props={manualTableSelectionGestureBlocked:(view,event)=>{inspected={view,event,gesture};return true;}};
  const {event,prevented}=h.fire();assert.equal(h.count,0,gesture);assert.equal(h.focus,0);assert.equal(prevented,1);assert.equal(h.adapter.stopEvent(event),true);assert.equal(inspected?.view,h.editor);assert.equal(inspected?.event,event);
 }
});
test('prevented and event-composition divider clicks never dispatch; unblocked public hook permits one selection',()=>{
 for(const props of [{defaultPrevented:true},{isComposing:true},{keyCode:229}]){const h=harness();h.editor.props={manualTableSelectionGestureBlocked:()=>false};h.fire(props);assert.equal(h.count,0);assert.equal(h.focus,0);}
 const h=harness();h.editor.props={manualTableSelectionGestureBlocked:()=>false};h.fire();assert.equal(h.count,1);
});


test('actual Parent shared guard protects every current interaction session in divider callback',()=>{
 const source=readFileSync(new URL('../src/redesign/ManualEditor.jsx',import.meta.url),'utf8');
 const functions=['tableSelectionEnabled','tableGestureBaseBlocked','tableGestureBlocked'].map(name=>source.match(new RegExp('function '+name+'\\([^\\n]+'))?.[0]);assert.ok(functions.every(Boolean));
 for(const gesture of ['canvas','outlineDrag','marquee','margin','figure','outlineSelect','tableResize','tableUI','menu','modal']){
  const h=harness(),ref=current=>({current}),inactiveDrag=()=>ref({isDragging:()=>false});
  const env={view:ref(h.editor),disabled:false,replacementBusy:false,replacing:ref(false),replacementSaving:ref(false),printing:ref(false),menu:null,modal:null,dragController:inactiveDrag(),outlineDragController:inactiveDrag(),marqueeController:inactiveDrag(),marginDrag:ref(null),figureResizeSession:ref(null),ownOutlineSelectSession:ref(null),tableResizeSession:ref(null),tableUISession:ref(null)};
  const dragKeys={canvas:'dragController',outlineDrag:'outlineDragController',marquee:'marqueeController'},sessionKeys={margin:'marginDrag',figure:'figureResizeSession',outlineSelect:'ownOutlineSelectSession',tableResize:'tableResizeSession',tableUI:'tableUISession'};
  if(dragKeys[gesture])env[dragKeys[gesture]].current.isDragging=()=>true;else if(sessionKeys[gesture])env[sessionKeys[gesture]].current={};else env[gesture]={};
  const guard=new Function(...Object.keys(env),functions.join('\n')+'\nreturn tableGestureBlocked;')(...Object.values(env));
  h.editor.props={manualTableSelectionGestureBlocked:guard};const {event,prevented}=h.fire();assert.equal(h.count,0,gesture);assert.equal(h.focus,0);assert.equal(prevented,1);assert.equal(h.adapter.stopEvent(event),true);
 }
});

test('production NodeView explicit styles override cover defaults and updates preserve the selected ID',()=>{
 for(const cover of [false,true]){
  const h=harness(cover);assert.equal(h.dom.dataset.manualDividerVariant,cover?'emphasis':'default');
  for(const variant of ['default','emphasis']){
   const next=h.node.type.create({...h.node.attrs,meta:withManualDividerStyle(h.node.attrs.meta,variant)});
   assert.equal(h.adapter.update(next),true);assert.equal(h.dom.dataset.manualDividerVariant,variant);
   assert.equal(h.dom.dataset.manualCoverRole,cover?'divider':undefined);h.fire();
   assert.equal(h.editor.state.selection.node.attrs.id,h.node.attrs.id);
  }
 }
});
