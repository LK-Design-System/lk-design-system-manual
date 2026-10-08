import test from 'node:test';
import assert from 'node:assert/strict';
import {positionManualFormatBubble,installManualFormatBubbleUpdates} from '../src/redesign/manual-format-bubble.mjs';

const rect=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
const size={width:226,height:38};

test('text toolbar uses its measured size and stays centered above a visible selection',()=>{
 assert.deepEqual(positionManualFormatBubble([rect(350,300,100,20)],size,{left:0,top:0,width:1280,height:720},rect(196,114,1084,570)),{left:287,top:256});
});

test('the same selection state can be positioned again after a viewport or panel reflow',()=>{
 const wide=positionManualFormatBubble([rect(800,300,100,20)],size,{left:0,top:0,width:1280,height:720},rect(196,114,1084,570));
 const narrow=positionManualFormatBubble([rect(60,300,100,20)],size,{left:0,top:0,width:390,height:720},rect(0,164,390,520));
 assert.notEqual(narrow.left,wide.left);
 assert.equal(narrow.left,8);assert.ok(narrow.left+size.width<=382);
});

test('visual viewport panning and the actual writing top bound constrain placement',()=>{
 const panned=positionManualFormatBubble([rect(100,490,100,20)],size,{left:0,top:250,width:390,height:260},rect(0,164,390,556));
 assert.deepEqual(panned,{left:37,top:446});assert.ok(panned.top>=258&&panned.top+size.height<=502);
 const toolbar=positionManualFormatBubble([rect(100,180,100,20)],size,{left:0,top:0,width:390,height:720},rect(0,175,390,500));
 assert.deepEqual(toolbar,{left:37,top:206});
});

test('offscreen selection lines are ignored and a toolbar that cannot fit is hidden',()=>{
 const viewport={left:0,top:0,width:390,height:720},main=rect(0,164,390,520);
 assert.equal(positionManualFormatBubble([rect(100,100,100,20)],size,viewport,main),null);
 assert.deepEqual(positionManualFormatBubble([rect(100,100,100,20),rect(100,300,100,20)],size,viewport,main),{left:37,top:256});
 assert.equal(positionManualFormatBubble([rect(10,300,100,20)],size,viewport,rect(0,164,200,520)),null);
 assert.equal(positionManualFormatBubble([rect(100,180,100,20)],size,viewport,rect(0,164,390,42)),null);
});

function surfaceFixture(){
 const surface=new EventTarget(),frames=new Map();let next=0;
 surface.visualViewport=new EventTarget();
 surface.requestAnimationFrame=callback=>{frames.set(++next,callback);return next;};
 surface.cancelAnimationFrame=id=>frames.delete(id);
 return {surface,frames,tick(){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(callback=>callback());}};
}

test('manual refresh and viewport geometry events share one pending frame without a PM transaction',()=>{
 const {surface,frames,tick}=surfaceFixture();let updates=0;
 const controller=installManualFormatBubbleUpdates({surface,isCurrent:()=>true,update:()=>updates++});
 controller.refresh();surface.dispatchEvent(new Event('resize'));surface.visualViewport.dispatchEvent(new Event('resize'));surface.visualViewport.dispatchEvent(new Event('scroll'));
 assert.equal(frames.size,1);assert.equal(updates,0);tick();assert.equal(updates,1);
 controller.dispose();
});

test('an old view or a disposed toolbar cannot apply a queued geometry update',()=>{
 const {surface,frames,tick}=surfaceFixture();let current=true,updates=0;
 const controller=installManualFormatBubbleUpdates({surface,isCurrent:()=>current,update:()=>updates++});
 surface.dispatchEvent(new Event('resize'));current=false;tick();assert.equal(updates,0);
 current=true;surface.visualViewport.dispatchEvent(new Event('scroll'));const queued=[...frames.values()][0];controller.dispose();
 assert.equal(frames.size,0);queued();assert.equal(updates,0);
 surface.dispatchEvent(new Event('resize'));surface.visualViewport.dispatchEvent(new Event('resize'));assert.equal(frames.size,0);
});
