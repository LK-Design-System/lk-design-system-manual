import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';
import {getManualClientClip} from '../src/redesign/manual-client-clip.mjs';
const require=createRequire(new URL('../../../../lk-design-system/package.json',import.meta.url)),{parse}=require('@babel/parser');
const source=readFileSync(process.env.LDS_RESIZE_CLIP_SOURCE||new URL('../src/redesign/ManualTableResizeControls.jsx',import.meta.url),'utf8'),ast=parse(source,{sourceType:'module',plugins:['jsx']});let initializer,fn,preview;
function walk(node){if(!node||typeof node!=='object')return;if(node.type==='VariableDeclarator'&&node.id.name==='clip'&&!initializer)initializer=source.slice(node.init.start,node.init.end);if(node.type==='ObjectProperty'&&node.key.name==='onPreview')preview=source.slice(node.value.start,node.value.end);if(node.type==='FunctionDeclaration'&&node.id.name==='manualTableResizeTargets')fn=source.slice(node.start,node.end);for(const x of Object.values(node))if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object')walk(x);}walk(ast);
const targets=new Function(`${fn};return manualTableResizeTargets;`)();
const vp={left:0,top:0,width:500,height:800},host=(changes={})=>({isConnected:true,offsetWidth:390,offsetHeight:600,clientLeft:0,clientTop:0,clientWidth:375,clientHeight:585,getBoundingClientRect:()=>({left:0,right:390,top:10,bottom:610}),...changes});
const measure=main=>new Function('main','bounds','viewport','getManualClientClip',`return (${initializer});`)(main,main.getBoundingClientRect(),vp,getManualClientClip);
function table({left=40,right=390,top=50,bottom=610,boundary=380,rowBottom=600}={}){return {getBoundingClientRect:()=>({left,right,top,bottom}),rows:[{getBoundingClientRect:()=>({bottom:rowBottom}),cells:[{getBoundingClientRect:()=>({right:boundary})},{}]}]};}
test('actual resize measure clip excludes vertical and horizontal scrollbar-only handles',()=>{
 const clip=measure(host()),result=targets(table(),clip);assert.equal(clip.right,375);assert.equal(clip.bottom,595);assert.deepEqual(result,[]);
 const visible=targets(table({boundary:300,rowBottom:200}),clip);assert.equal(visible.length,2);for(const item of visible){assert.ok(item.left+item.width<=375);assert.ok(item.top+item.height<=595);}
});
test('actual resize targets preserve non-scrollbar geometry and clip scrolled rows at the client top',()=>{
 const clip=measure(host({clientWidth:390,clientHeight:600}));assert.equal(targets(table({boundary:380,rowBottom:600}),clip).length,2);
 const result=targets(table({top:-100,bottom:200,boundary:300,rowBottom:190}),measure(host()));assert.equal(result.find(x=>x.kind==='column').top,10);assert.equal(result.find(x=>x.kind==='column').height,190);
});
test('actual resize measure reflects RTL client offset and scaled client bounds; invalid area yields no clip',()=>{
 const rtl=measure(host({clientLeft:15}));assert.equal(rtl.left,15);assert.equal(rtl.right,390);
 const scaled=measure(host({getBoundingClientRect:()=>({left:20,right:800,top:30,bottom:330})}));assert.deepEqual(scaled,{left:20,right:500,top:30,bottom:322.5});
 assert.equal(measure(host({clientWidth:0})),null);assert.equal(measure(host({isConnected:false})),null);
});

function previewCallback(main,value,setGuide){return new Function('session','current','valid','setGuide','mainRef','getManualClientClip','getBlockMenuViewport','window',`return (${preview});`)({current:value},{current:value},()=>true,setGuide,{current:main},getManualClientClip,()=>vp,{});}
test('actual preview callback clips row and column guides, and clears clipped or canceled guides',()=>{
 const frame={left:-40,right:440,top:-20,bottom:700,width:480,height:720},t={offsetWidth:480,getBoundingClientRect:()=>frame,rows:[{getBoundingClientRect:()=>({top:180})}]};
 const main=host(),value={table:t,handle:{dataset:{manualTableResizeIndex:'0'}}},guides=[],callback=previewCallback(main,value,x=>guides.push(x));
 callback({columnWeights:[1,1]});assert.deepEqual(guides.at(-1),{left:200,top:10,width:1,height:585});
 callback({rowIndex:0,rowMinHeightPx:20});assert.deepEqual(guides.at(-1),{left:0,top:200,width:375,height:1});
 callback({columnWeights:[9,1]});assert.equal(guides.at(-1),null);
 callback({rowIndex:0,rowMinHeightPx:450});assert.equal(guides.at(-1),null);
 callback(null);assert.equal(guides.at(-1),null);
 main.isConnected=false;callback({columnWeights:[1,1]});assert.equal(guides.at(-1),null);
});
