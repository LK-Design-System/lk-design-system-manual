import test from 'node:test';import assert from 'node:assert/strict';
import {getManualMarqueeRectangle,getManualMarqueeHits,isManualMarqueeBlankTarget,installManualMarqueeSelection} from '../src/redesign/manual-marquee-selection.mjs';
const rect={left:0,top:0,right:200,bottom:200};
const items=()=>[{id:'a',rect:{left:30,top:20,right:150,bottom:50}},{id:'b',rect:{left:30,top:70,right:150,bottom:100}},{id:'c',rect:{left:30,top:120,right:150,bottom:150}}];
function events(){const listeners=new Map();return {listeners,addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener(name,fn){listeners.get(name)?.delete(fn);if(!listeners.get(name)?.size)listeners.delete(name);},emit(type,options={}){const e={type,button:0,buttons:1,isPrimary:true,pointerType:'mouse',pointerId:1,clientX:5,clientY:10,detail:1,prevented:false,preventDefault(){this.prevented=true;},stopPropagation(){},...options};for(const fn of [...listeners.get(type)||[]])fn(e);return e;}};}
function harness(){
 const document=events(),surface=events(),frames=new Map(),overlays=[];let serial=0,revision={},enabled=true,captured=false;
 surface.scrollX=surface.scrollY=0;surface.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial;};surface.cancelAnimationFrame=id=>frames.delete(id);document.defaultView=surface;
 document.createElement=()=>({dataset:{},style:{},setAttribute(){},remove(){overlays.splice(overlays.indexOf(this),1);}});document.body={append:node=>overlays.push(node)};
 const target={dataset:{manualNode:'page'},closest:()=>null,classList:{contains:()=>false}};
 const element=Object.assign(events(),{ownerDocument:document,isConnected:true,contains:t=>t===target,scrollTop:0,scrollLeft:0,scrollHeight:600,clientHeight:200,getBoundingClientRect:()=>rect,setPointerCapture(){captured=true;},releasePointerCapture(){captured=false;document.emit('lostpointercapture');}});
 const previews=[],commits=[],cancels=[];const controller=installManualMarqueeSelection({element,surface,getRevision:()=>revision,isEnabled:()=>enabled,getItems:()=>items().map(x=>({...x,rect:{...x.rect,top:x.rect.top-element.scrollTop,bottom:x.rect.bottom-element.scrollTop}})),onPreview:x=>previews.push(x),onCommit:x=>commits.push(x),onCancel:x=>cancels.push(x)});
 const down=(options={})=>controller.begin({button:0,isPrimary:true,pointerType:'mouse',pointerId:1,clientX:5,clientY:10,target,...options});
 return {controller,element,document,surface,target,overlays,frames,previews,commits,cancels,down,captured:()=>captured,disable(){enabled=false;},changeRevision(){revision={};},move:(x,y,options={})=>document.emit('pointermove',{clientX:x,clientY:y,...options}),up:(x,y,options={})=>document.emit('pointerup',{clientX:x,clientY:y,...options}),frame(){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn());}};
}
test('reverse rectangles and strict intersections preserve exact sparse IDs and exclude boundaries',()=>{
 assert.deepEqual(getManualMarqueeRectangle({x:100,y:150},{x:0,y:0}),{left:0,top:0,right:100,bottom:150});
 const candidates=[...items(),{id:'nested',ancestorIds:['a'],rect:items()[0].rect},{id:'title',kind:'pageTitle',rect:items()[0].rect},{id:'cover',kind:'cover',rect:items()[0].rect},{id:'a',rect:items()[0].rect}];
 assert.deepEqual(getManualMarqueeHits({rect:{left:0,top:10,right:100,bottom:50},items:candidates}),['a']);
 const sparse=[items()[0],{...items()[1],rect:{left:200,top:70,right:300,bottom:100}},items()[2]];
 assert.deepEqual(getManualMarqueeHits({rect:{left:0,top:0,right:100,bottom:160},items:sparse}),['a','c']);
 assert.deepEqual(getManualMarqueeHits({rect:{left:150,top:0,right:160,bottom:50},items:items()}),[]);
});
test('blank-target policy keeps text, atomic blocks and every control out of marquee',()=>{
 assert.equal(isManualMarqueeBlankTarget({nodeType:3}),false);
 assert.equal(isManualMarqueeBlankTarget({dataset:{manualNode:'paragraph'},closest:()=>null}),false);
 assert.equal(isManualMarqueeBlankTarget({dataset:{manualNode:'cover'},closest:()=>null}),false);
 assert.equal(isManualMarqueeBlankTarget({dataset:{manualNode:'page'},closest:()=>({})}),false);
 assert.equal(isManualMarqueeBlankTarget({classList:{contains:x=>x==='lds-manual-content'},parentElement:{dataset:{manualNode:'page'}},closest:()=>null}),true);
});
test('threshold preserves ordinary click; rejected modifier/control/touch start never captures',()=>{
 const h=harness();for(const value of [{button:2},{ctrlKey:true},{shiftKey:true},{pointerType:'touch'},{isPrimary:false},{target:{}}])assert.equal(h.down(value),false);
 assert.equal(h.captured(),false);assert.equal(h.down(),true);assert.equal(h.move(8,12).prevented,false);assert.equal(h.overlays.length,0);h.up(8,12);assert.equal(h.commits.length,0);assert.equal(h.cancels[0].reason,'click');assert.equal(h.cancels[0].target,h.target);assert.deepEqual(h.cancels[0].point,{x:5,y:10});assert.equal(h.captured(),false);assert.equal(h.element.emit('click').prevented,false);
});
test('threshold creates visible feedback, final pointer geometry commits exact IDs and clears capture/box',()=>{
 const h=harness();h.down();assert.equal(h.move(100,80).prevented,true);assert.equal(h.overlays.length,1);assert.deepEqual(h.previews.at(-1).ids,['a','b']);h.up(100,145);assert.deepEqual(h.commits[0].ids,['a','b','c']);assert.equal(h.overlays.length,0);assert.equal(h.frames.size,0);assert.equal(h.captured(),false);assert.equal(h.previews.at(-1),null);
 assert.equal(h.element.emit('click').prevented,true);assert.equal(h.element.emit('click').prevented,false);
});
test('Escape, pointercancel and blur never commit and clean all transient state',()=>{
 for(const cancel of [h=>h.document.emit('keydown',{key:'Escape'}),h=>h.document.emit('pointercancel'),h=>h.surface.emit('blur')]){const h=harness();h.down();h.move(100,80);cancel(h);assert.equal(h.commits.length,0);assert.equal(h.overlays.length,0);assert.equal(h.frames.size,0);assert.equal(h.controller.isDragging(),false);}
});
test('revision and readonly change cancel pending/active gesture, never stale commit',()=>{
 for(const active of [false,true])for(const change of ['changeRevision','disable']){const h=harness();h.down();if(active)h.move(100,80);h[change]();h.controller.refresh();h.up(100,145);assert.equal(h.commits.length,0);assert.equal(h.controller.isDragging(),false);assert.equal(h.overlays.length,0);}
});
test('scroll refresh anchors origin in document space and reads fresh block rectangles',()=>{
 const h=harness();h.down();h.move(100,80);h.element.scrollTop=50;h.document.emit('scroll');const value=h.previews.at(-1);assert.equal(value.rect.top,-40);assert.deepEqual(value.ids,['a','b','c']);h.up(100,80);assert.equal(h.commits[0].rect.top,-40);
});
test('bounded edge scroll refreshes geometry and cancels its frame on Escape',()=>{
 const h=harness();h.down();h.move(100,195);h.frame();assert.ok(h.element.scrollTop>0);assert.ok(h.element.scrollTop<=18);assert.ok(h.frames.size>0);assert.equal(h.previews.at(-1).rect.top,10-h.element.scrollTop);h.document.emit('keydown',{key:'Escape'});assert.equal(h.frames.size,0);
 const outside=harness();outside.down();outside.move(250,195);outside.frame();assert.equal(outside.element.scrollTop,0);
});
test('foreign pointers and lost-button moves cannot change or commit selection',()=>{
 const h=harness();h.down();h.move(100,80,{pointerId:2});assert.equal(h.overlays.length,0);h.up(100,80,{pointerId:2});assert.equal(h.controller.isDragging(),true);h.move(100,80,{buttons:0});assert.equal(h.controller.isDragging(),false);assert.equal(h.commits.length,0);
});
test('empty hits stay exact empty array; next ordinary click and keyboard click remain available',()=>{
 const h=harness();h.down();h.move(20,60);h.up(20,60);assert.deepEqual(h.commits[0].ids,[]);assert.equal(h.element.emit('click',{detail:0}).prevented,false);h.down({target:{}});assert.equal(h.element.emit('click').prevented,false);
});
test('dispose releases capture/removes overlay, listeners and queued work exactly once',()=>{
 const h=harness();h.down();h.move(100,80);h.controller.dispose();h.controller.dispose();assert.equal(h.captured(),false);assert.equal(h.overlays.length,0);assert.equal(h.frames.size,0);assert.equal(h.document.listeners.size,0);assert.equal(h.surface.listeners.size,0);assert.equal(h.element.listeners.size,0);assert.equal(h.down(),false);
});
test('document change between pointer events cancels immediately and cannot later commit',()=>{
 const h=harness();h.down();h.move(100,80);h.changeRevision();h.move(100,100);assert.equal(h.overlays.length,0);assert.equal(h.controller.isDragging(),false);h.up(100,140);assert.equal(h.commits.length,0);
});

test('pointerup after document or readonly change cancels as stale without a move/refresh',()=>{
 for(const change of ['changeRevision','disable']){const h=harness();h.down();h.move(100,80);h[change]();h.up(100,140);assert.equal(h.commits.length,0);assert.equal(h.cancels.at(-1).reason,'stale');assert.equal(h.overlays.length,0);assert.equal(h.captured(),false);}
});
