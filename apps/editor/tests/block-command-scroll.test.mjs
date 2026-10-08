import test from 'node:test';
import assert from 'node:assert/strict';
import {getBlockMenuScrollTop,installBlockMenuScrollKeeper} from '../src/redesign/block-command-scroll.mjs';

function harness(){
 const listeners=new Map(),frames=new Map();let counter=0,contentTop=400;
 const surface={requestAnimationFrame(fn){const id=++counter;frames.set(id,fn);return id;},cancelAnimationFrame(id){frames.delete(id);}};
 const container={scrollTop:0,scrollHeight:1000,clientHeight:315.5,getBoundingClientRect:()=>({top:196.5,bottom:512}),addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name,fn){if(listeners.get(name)===fn)listeners.delete(name);}};
 const option={getBoundingClientRect(){const top=196.5+contentTop-container.scrollTop;return {top,bottom:top+49};}};
 const keeper=installBlockMenuScrollKeeper({container,getActiveOption:()=>option,surface});
 return {container,keeper,frames,listeners,emit:name=>listeners.get(name)?.(),select:top=>{contentTop=top;},flush(){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());},visible(){const item=option.getBoundingClientRect();return item.top>=196.5&&item.bottom<=512;}};
}
test('the first keyboard move reveals the same active item after manual wheel scrolling',()=>{
 const h=harness();h.emit('wheel');h.container.scrollTop=684.5;h.emit('scroll');h.flush();
 assert.equal(h.container.scrollTop,684.5);assert.equal(h.visible(),false);
 h.keeper.navigate();h.flush();assert.equal(h.visible(),true);assert.equal(h.container.scrollTop,396);
 h.keeper.dispose();
});
test('a pending scroll after keyboard navigation re-reveals the selection without another active-ID change',()=>{
 const h=harness();h.container.scrollTop=684.5;h.keeper.navigate();h.flush();assert.equal(h.visible(),true);
 h.container.scrollTop=650;h.emit('scroll');h.flush();assert.equal(h.visible(),true);assert.equal(h.container.scrollTop,396);
 h.keeper.dispose();
});
for(const gesture of ['wheel','pointermove','pointerdown'])test(`a new ${gesture} gesture releases the keyboard scroll keeper`,()=>{
 const h=harness();h.keeper.navigate();h.emit(gesture);h.container.scrollTop=684.5;h.emit('scroll');h.flush();
 assert.equal(h.container.scrollTop,684.5);assert.equal(h.visible(),false);
 h.keeper.navigate();h.flush();assert.equal(h.visible(),true);h.keeper.dispose();
});
test('navigation uses the latest rendered selection after the event has committed',()=>{
 const h=harness();h.keeper.navigate();h.select(850);h.flush();assert.equal(h.visible(),true);
 assert.equal(h.container.scrollTop,587.5);h.keeper.dispose();
});
test('disposing cancels pending frames and releases all menu scroll listeners',()=>{
 const h=harness();h.keeper.navigate();assert.equal(h.frames.size,1);h.keeper.dispose();
 assert.equal(h.frames.size,0);assert.equal(h.listeners.size,0);h.keeper.navigate();h.keeper.refresh();assert.equal(h.frames.size,0);
});
test('scroll calculations keep visible items still, clamp to available content and reject unavailable geometry',()=>{
 const bounds={top:100,bottom:300},state={scrollTop:80,scrollHeight:1000,clientHeight:200};
 assert.equal(getBlockMenuScrollTop({top:120,bottom:160},bounds,state),80);
 assert.equal(getBlockMenuScrollTop({top:90,bottom:130},bounds,state),66);
 assert.equal(getBlockMenuScrollTop({top:280,bottom:330},bounds,state),114);
 assert.equal(getBlockMenuScrollTop({top:-100,bottom:-50},bounds,state),0);
 assert.equal(getBlockMenuScrollTop({top:1000,bottom:1050},bounds,state),800);
 assert.equal(getBlockMenuScrollTop(null,bounds,state),null);
 assert.equal(getBlockMenuScrollTop({top:120,bottom:160},bounds,{...state,clientHeight:0}),null);
});
