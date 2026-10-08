import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createManualComponents} from '../../../src/components.mjs';
const runtime=process.env.LDS_PAGE_TEST_RUNTIME||fileURLToPath(new URL('../../../',import.meta.url)),require=createRequire(path.join(runtime,'package.json')),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{ManualPage}=createManualComponents(React,()=>null);
test('public ordered ManualPage preserves supplied title/body order and empty-title printing while its default and cover markup remain unchanged',()=>{
 const h=React.createElement,children=[h('p',{key:'body'},'Body'),h('h2',{key:'title',className:'lds-manual-section-title'},'Moved title')],ordered=renderToStaticMarkup(h(ManualPage,{ordered:true,title:'Scalar',lead:'Lead',number:1,total:2},children)),standard=renderToStaticMarkup(h(ManualPage,{title:'Scalar',lead:'Lead',number:1,total:2},h('p',null,'Body'))),empty=renderToStaticMarkup(h(ManualPage,{ordered:true,title:[],number:1,total:1},h('p',null,'Body'))),cover=renderToStaticMarkup(h(ManualPage,{cover:true,title:'Scalar',number:1,total:2},h('p',null,'Cover')));
 assert.ok(ordered.indexOf('>Body<')<ordered.indexOf('>Moved title<'));assert.doesNotMatch(ordered,/Scalar|>Lead</);assert.match(ordered,/aria-label="2쪽 중 1쪽"/);assert.match(standard,/>Scalar<\/h2>/);assert.match(standard,/>Lead<\/p>/);assert.ok(standard.indexOf('>Scalar<')<standard.indexOf('>Body<'));assert.doesNotMatch(empty,/<h2/);assert.match(empty,/>Body<\/p>/);assert.match(cover,/lds-manual-cover/);assert.doesNotMatch(cover,/Scalar/);
});
