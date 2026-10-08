import test from 'node:test';
import assert from 'node:assert/strict';
import {installManualTableResize} from '../src/redesign/manual-table-resize.mjs';
import {createManualPageTemplate} from '../src/redesign/manual-page-templates.mjs';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {setManualTableColumnWidths} from '../src/redesign/manual-table-layout.mjs';

function harness({target={kind:'column',tableId:'table',columnIndex:0,columnWeights:[1,1,1],frameWidth:300,scale:1},commit}={}){
 const document=new EventTarget(),surface=new EventTarget(),element=new EventTarget(),handle={isConnected:true,closest:()=>handle,setPointerCapture(){},releasePointerCapture(){}};
 element.ownerDocument=document;document.defaultView=surface;element.contains=node=>node===handle;
 let revision={},generation=0,enabled=true;const previews=[],commits=[],cancels=[];
 const controller=installManualTableResize({element,getTarget:()=>target,getRevision:()=>revision,getGeneration:()=>generation,isEnabled:()=>enabled,onPreview:value=>previews.push(value),onCommit:value=>{commits.push(value);commit?.(value);},onCancel:value=>cancels.push(value)});
 const event=(type,props={})=>{const e=new Event(type,{cancelable:true});for(const [key,value]of Object.entries({pointerId:1,clientX:0,clientY:0,...props}))Object.defineProperty(e,key,{value});return e;};
 const send=(type,props)=>{const e=event(type,props);document.dispatchEvent(e);return e;};
 return {controller,element,document,surface,handle,previews,commits,cancels,start(props={}){const e={button:0,pointerId:1,isPrimary:true,clientX:0,clientY:0,target:handle,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...props};return {ok:controller.begin(e),event:e};},send,stale(){revision={};},switchDocument(){generation++;},disable(){enabled=false;}};
}

test('column gesture previews only, preserves adjacent total, unscales movement and commits exactly once',()=>{
 const h=harness({target:{kind:'column',tableId:'table',columnIndex:0,columnWeights:[1,1,1],frameWidth:300,scale:2}}),start=h.start();assert.equal(start.ok,true);assert.equal(start.event.prevented,true);assert.equal(start.event.stopped,true);
 assert.equal(h.send('pointermove',{clientX:40}).defaultPrevented,true);assert.equal(h.commits.length,0);assert.ok(Math.abs(h.previews.at(-1).columnWeights[0]-1.2)<1e-9);assert.ok(Math.abs(h.previews.at(-1).columnWeights[1]-.8)<1e-9);assert.equal(h.previews.at(-1).columnWeights[2],1);
 h.send('pointerup',{clientX:40});assert.equal(h.commits.length,1);assert.equal(h.previews.at(-1),null);assert.ok(h.commits[0].revision);assert.equal(h.commits[0].generation,0);assert.equal(h.controller.isResizing(),false);h.send('pointerup',{clientX:40});assert.equal(h.commits.length,1);h.controller.dispose();
});

test('gesture clamps widths to a readable minimum and rows to nonnegative minimum height',()=>{
 const h=harness();h.start();h.send('pointerup',{clientX:10000});assert.ok(Math.abs(h.commits[0].columnWeights[1]-.24)<1e-9);h.controller.dispose();
 const row=harness({target:{kind:'row',tableId:'table',rowIndex:2,rowHeightPx:50,scale:2}});row.start();row.send('pointerup',{clientY:-200});assert.equal(row.commits[0].rowMinHeightPx,0);assert.equal(row.commits[0].rowIndex,2);row.controller.dispose();
});

for(const reason of ['escape','pointercancel','lostpointercapture','blur','resize','scroll','cancel','dispose','stale','generation','readonly','disconnected'])test(`${reason} clears preview and leaves the model uncommitted`,()=>{
 const h=harness();h.start();h.send('pointermove',{clientX:25});
 if(reason==='escape')h.send('keydown',{key:'Escape'});else if(['pointercancel','lostpointercapture','scroll'].includes(reason))h.send(reason);else if(reason==='blur'||reason==='resize')h.surface.dispatchEvent(new Event(reason));else if(reason==='cancel')h.controller.cancel();else if(reason==='dispose')h.controller.dispose();else{if(reason==='stale')h.stale();if(reason==='generation')h.switchDocument();if(reason==='readonly')h.disable();if(reason==='disconnected')h.handle.isConnected=false;h.controller.refresh();}
 assert.equal(h.commits.length,0);assert.equal(h.previews.at(-1),null);assert.equal(h.controller.isResizing(),false);h.controller.dispose();
});

test('unchanged, non-primary, non-handle and disabled gestures never commit',()=>{
 const h=harness();assert.equal(h.start({button:2}).ok,false);assert.equal(h.start({isPrimary:false}).ok,false);assert.equal(h.start({target:{closest:()=>null}}).ok,false);h.start();h.send('pointerup');assert.equal(h.commits.length,0);h.disable();assert.equal(h.start().ok,false);h.controller.dispose();assert.equal(h.start().ok,false);
});

test('gesture end connects to actual PM command with a single Undo/Redo while previews leave the doc unchanged',()=>{
 const d=createEmptyManualDocument(),table=createManualPageTemplate('table').blocks[0];d.pages[0].blocks=[table];let state=createManualState({document:d});const before=state,dispatch=tr=>{state=state.applyTransaction(tr).state;};
 const h=harness({target:{kind:'column',tableId:table.id,columnIndex:0,columnWeights:[1,1],frameWidth:200,scale:1},commit:payload=>{assert.equal(setManualTableColumnWidths({...payload,revision:before.doc})(state,dispatch),true);}});h.start();h.send('pointermove',{clientX:20});assert.equal(state,before);h.send('pointerup',{clientX:20});const after=state;assert.equal(h.commits.length,1);assert.equal(manualCommands.undo(state,dispatch),true);assert.ok(state.doc.eq(before.doc));assert.equal(manualCommands.redo(state,dispatch),true);assert.ok(state.doc.eq(after.doc));h.controller.dispose();
});
