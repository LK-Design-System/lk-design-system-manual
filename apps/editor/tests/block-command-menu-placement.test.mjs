import test from 'node:test';
import assert from 'node:assert/strict';
import {positionBlockCommandMenu} from '../src/redesign/block-command-catalog.mjs';

function inside(position,bounds){
 assert.ok(position);assert.ok(position.left>=bounds.left);assert.ok(position.top>=bounds.top);
 assert.ok(position.left+position.width<=bounds.right);assert.ok(position.top+position.maxHeight<=bounds.bottom);
}
test('menu box stays inside the desktop writing area beside the inspector, rather than only clamping its anchor',()=>{
 const placementBounds={left:196,top:114,right:1028,bottom:687};
 const position=positionBlockCommandMenu({left:1010,top:250,bottom:274},{placementBounds});
 inside(position,placementBounds);assert.equal(position.left,700);assert.equal(position.width,320);
});
test('narrow writing bounds shrink the entire menu and cap its height',()=>{
 const placementBounds={left:80,top:120,width:210,height:430};
 const position=positionBlockCommandMenu({left:280,top:510,bottom:534},{placementBounds,viewportWidth:390,viewportHeight:844});
 inside(position,{left:80,top:120,right:290,bottom:550});assert.equal(position.width,194);
});
test('placement intersects live writing bounds with a panned visual viewport',()=>{
 const placementBounds={left:0,top:100,right:600,bottom:800};
 const position=positionBlockCommandMenu({left:590,top:510,bottom:534},{placementBounds,viewportLeft:20,viewportTop:160,viewportWidth:390,viewportHeight:360});
 inside(position,{left:20,top:160,right:410,bottom:520});
});
test('absent placement bounds preserve the existing viewport default',()=>{
 const anchor={left:100,top:400,bottom:424},options={viewportHeight:650};
 assert.deepEqual(positionBlockCommandMenu(anchor,options),{left:100,top:430,width:320,maxHeight:212});
 assert.deepEqual(positionBlockCommandMenu(anchor,{...options,placementBounds:undefined}),positionBlockCommandMenu(anchor,options));
});
test('provided unavailable, invalid, offscreen or tiny bounds never fall back to the full viewport',()=>{
 for(const placementBounds of [null,{left:0,top:0,right:0,bottom:300},{left:NaN,top:0,right:300,bottom:300},{left:1300,top:0,right:1500,bottom:300},{left:10,top:10,right:40,bottom:30}]){
  assert.equal(positionBlockCommandMenu({left:20,top:20,bottom:22},{placementBounds}),null);
 }
});
test('a bounds update changes placement for resize, scroll or panel reflow without changing the anchor',()=>{
 const anchor={left:1010,top:250,bottom:274};
 const first=positionBlockCommandMenu(anchor,{placementBounds:{left:196,top:114,right:1280,bottom:687}});
 const next=positionBlockCommandMenu(anchor,{placementBounds:{left:196,top:160,right:1028,bottom:520}});
 inside(next,{left:196,top:160,right:1028,bottom:520});assert.ok(next.left<first.left);assert.ok(next.maxHeight<first.maxHeight);
});
test('an anchor outside the writing area after reflow cannot make a taller menu escape its bounds',()=>{
 const placementBounds={left:196,top:114,right:1028,bottom:320};
 const position=positionBlockCommandMenu({left:1100,top:1000,bottom:1024},{placementBounds});
 inside(position,placementBounds);assert.ok(position.maxHeight<=placementBounds.bottom-placementBounds.top);
});
