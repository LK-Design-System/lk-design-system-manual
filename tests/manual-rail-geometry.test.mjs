import test from 'node:test';
import assert from 'node:assert/strict';
import {getManualRailLeft} from '../apps/editor/src/redesign/manual-rail-geometry.mjs';
import {handleGeometry,canvasRailPairGeometry,canvasHoverTarget} from '../apps/editor/src/ui/canvas-drag.mjs';

function node(kind,left,parent=null,slots={}){
 const value={dataset:{manualNode:kind},parentElement:parent,slots,
  getBoundingClientRect:()=>({left,right:left+200,top:100,bottom:140,width:200,height:40}),
  querySelector:selector=>slots[selector]??null,
  closest(selector){for(let p=this;p;p=p.parentElement)if(selector===`[data-manual-node="${p.dataset.manualNode}"]`)return p;return null;},
  contains(child){for(let p=child;p;p=p.parentElement)if(p===this)return true;return false;}};
 return value;
}
const clip={left:200,right:1000,top:0,bottom:900};
function pair(element,bounds=clip){const railLeft=getManualRailLeft(element);return canvasRailPairGeometry({...handleGeometry({left:railLeft,top:100,lineHeight:24}),railLeft,clip:bounds});}

test('title, paragraph and figure share page content rail; cover wrappers stay transparent',()=>{
 const content=node('',304),page=node('page',240,null,{':scope > .lds-manual-content':content});
 for(const kind of ['pageTitle','paragraph','figure'])assert.equal(getManualRailLeft(node(kind,kind==='figure'?360:304,page)),304);
 const cover=node('cover',240,null,{':scope > .manual-v2-cover-content':content});
 const body=node('coverBody',320,node('coverSectionFrame',320,cover));
 assert.equal(getManualRailLeft(node('paragraph',356,body)),304);
});

test('callout child controls both remain outside the box and its info column',()=>{
 const slot=node('',356),callout=node('callout',304,null,{'[data-manual-content-slot]':slot});
 const paragraph=node('paragraph',356,callout),controls=pair(paragraph);
 assert.equal(getManualRailLeft(paragraph),304);
 assert.deepEqual(controls,{left:266,addLeft:238,top:100});
 assert.equal(controls.left-controls.addLeft-24,4);
 assert.ok(controls.left+24<=304-4);
 assert.ok(controls.addLeft+24<304);
 // Reproduce the old inner-slot anchor using the unchanged actual canvas helper.
 const old=canvasRailPairGeometry({...handleGeometry({left:356,top:100,lineHeight:24}),railLeft:356,clip});
 assert.ok(old.left>=304&&old.left+24>304);
});

test('standalone nested semantic containers share their outermost semantic edge',()=>{
 const outer=node('callout',304),quote=node('quote',356,outer,{'[data-manual-content-slot]':node('',380)});
 assert.equal(getManualRailLeft(quote),304);
 assert.equal(getManualRailLeft(node('paragraph',380,quote)),304);
 const nested=node('callout',360,outer,{'[data-manual-content-slot]':node('',412)});
 assert.equal(getManualRailLeft(nested),304);
 assert.equal(getManualRailLeft(node('paragraph',412,nested)),304);
});

test('page-context padded callout outer and child share the page content column',()=>{
 const content=node('',304),page=node('page',240,null,{':scope > .lds-manual-content':content});
 const box=node('callout',334,page,{'[data-manual-content-slot]':node('',386)}),child=node('paragraph',386,box);
 assert.equal(getManualRailLeft(box),304);
 assert.equal(getManualRailLeft(child),304);
 assert.deepEqual(pair(box),pair(child));
 assert.equal(pair(child).left+24,290);
 assert.ok(pair(child).left+24<=334-4);
});

test('page-context quotes and nested boxes preserve their common container column',()=>{
 const content=node('',304),cover=node('cover',240,null,{':scope > .manual-v2-cover-content':content});
 const quote=node('quote',334,cover),inner=node('callout',360,quote),child=node('paragraph',412,inner);
 assert.deepEqual([quote,inner,child].map(getManualRailLeft),[304,304,304]);
 const item=node('listItem',328),listQuote=node('quote',358,item),listChild=node('paragraph',384,listQuote);
 assert.deepEqual([listQuote,listChild].map(getManualRailLeft),[328,328]);
});

test('page-context scroll and fractional clipping keep outer/child controls equal',()=>{
 for(const shift of [0,-24.5,-62]){
  const content=node('',304+shift),page=node('page',240+shift,null,{':scope > .lds-manual-content':content});
  const box=node('callout',334+shift,page),child=node('paragraph',386+shift,box);
  assert.deepEqual(pair(box),pair(child));
  const position=pair(child);
  if(shift===-62)assert.equal(position,null);
  else {assert.ok(position);assert.equal(position.left-position.addLeft-24,4);assert.ok(position.left+24<=getManualRailLeft(child)-4);}
 }
});

test('step priority preserves its own rail through nested callout and quote',()=>{
 const step=node('step',340),callout=node('callout',380,step),quote=node('quote',420,callout);
 assert.equal(getManualRailLeft(node('paragraph',448,quote)),340);
 assert.equal(pair(node('paragraph',448,quote)).left,302);
});

test('deep child hover wins without moving controls into the semantic box',()=>{
 const box=node('callout',304),child=node('paragraph',356,box);
 const selected=canvasHoverTarget([box,child],{x:298,y:110,width:1100,height:900,railWidth:70,getRailLeft:getManualRailLeft});
 assert.equal(selected,child);
 assert.equal(pair(selected).left+24,290);
});

test('finite fallback and viewport clipping still fail closed for both controls',()=>{
 const plain=node('paragraph',304);
 assert.equal(getManualRailLeft(plain),304);
 assert.equal(getManualRailLeft(node('paragraph',NaN)),null);
 assert.equal(pair(plain,{left:280,right:1000,top:0,bottom:900}),null);
 assert.equal(pair(plain,{left:200,right:1000,top:110,bottom:900}),null);
 assert.equal(pair(plain,{left:200,right:NaN,top:0,bottom:900}),null);
 const fractional=node('paragraph',304.75);
 assert.equal(pair(fractional).left,266.75);
});
