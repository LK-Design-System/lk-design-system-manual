import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {getManualClientClip} from '../src/redesign/manual-client-clip.mjs';
import {positionManualTableTrailingControls} from '../src/redesign/manual-table-trailing-controls.mjs';
const viewport={left:0,top:0,width:500,height:800};
const host=(changes={})=>({isConnected:true,offsetWidth:390,offsetHeight:600,clientLeft:0,clientTop:0,clientWidth:375,clientHeight:585,getBoundingClientRect:()=>({left:0,right:390,top:10,bottom:610}),...changes});
test('scrollbar strips are excluded on either axis without changing a no-scrollbar area',()=>{
 assert.deepEqual(getManualClientClip(host(),viewport),{left:0,right:375,top:10,bottom:595});
 assert.deepEqual(getManualClientClip(host({clientWidth:390,clientHeight:600}),viewport),{left:0,right:390,top:10,bottom:610});
 assert.equal(getManualClientClip(host({clientHeight:600}),viewport).bottom,610);
 assert.equal(getManualClientClip(host({clientWidth:390}),viewport).right,390);
});
test('borders, left-side scrollbars, scale and visual viewport offsets use client coordinates',()=>{
 assert.deepEqual(getManualClientClip(host({clientLeft:17,clientTop:2,clientWidth:371,clientHeight:581}),viewport),{left:17,right:388,top:12,bottom:593});
 const scaled=host({getBoundingClientRect:()=>({left:20,right:800,top:30,bottom:330}),clientLeft:2,clientTop:4});
 assert.deepEqual(getManualClientClip(scaled,{left:25,top:40,width:740,height:250}),{left:25,right:765,top:40,bottom:290});
});
test('detached, hidden, invalid or completely clipped hosts fail closed',()=>{
 for(const changes of [{isConnected:false},{offsetWidth:0},{clientHeight:0},{clientWidth:NaN},{clientTop:-1},{getBoundingClientRect:()=>{throw Error('detached');}}])assert.equal(getManualClientClip(host(changes),viewport),null);
 assert.equal(getManualClientClip(host(),{left:400,top:0,width:50,height:50}),null);
 assert.equal(getManualClientClip(null,viewport),null);
});
const require=createRequire(new URL('../../../../lk-design-system/package.json',import.meta.url));
const {parse}=require('@babel/parser');
function clips(file){const source=readFileSync(file,'utf8'),ast=parse(source,{sourceType:'module',plugins:['jsx']}),results=[];function walk(node){if(!node||typeof node!=='object')return;if(node.type==='VariableDeclarator'&&node.id.name==='clip'&&node.init.type==='CallExpression')results.push(source.slice(node.init.start,node.init.end));for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}walk(ast);return results;}
function evaluate(expression,main){const bounds=main.getBoundingClientRect();return new Function('main','mainRef','bounds','mainRect','viewport','vp','getManualClientClip',`return (${expression});`)(main,{current:main},bounds,bounds,viewport,viewport,getManualClientClip);}
test('actual control clip initializers reject scrollbar-only trailing strips; baseline admitted them',()=>{
 const names=['ManualTableSelectionControls.jsx','ManualTableTrailingControls.jsx','ManualFigureResizeControls.jsx'];let count=0;
 const table={left:50,right:376,top:50,bottom:200};
 for(const name of names){
  const after=clips(new URL(`../src/redesign/${name}`,import.meta.url));
  for(let i=0;i<after.length;i++){
   const bounds=host().getBoundingClientRect(),old={left:Math.max(bounds.left,viewport.left),right:Math.min(bounds.right,viewport.left+viewport.width),top:Math.max(bounds.top,viewport.top),bottom:Math.min(bounds.bottom,viewport.top+viewport.height)},fixed=evaluate(after[i],host());assert.equal(old.right,390);assert.equal(fixed.right,375);assert.equal(fixed.bottom,595);
   assert.ok(positionManualTableTrailingControls(table,old).some(x=>x.mode==='column'));
   assert.ok(!positionManualTableTrailingControls(table,fixed).some(x=>x.mode==='column'));
   assert.equal(evaluate(after[i],host({isConnected:false})),null);count++;
  }
 }
 assert.equal(count,4);
});
