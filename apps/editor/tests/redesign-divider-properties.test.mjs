import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createManualComponents} from '../../../src/components.mjs';
import {getManualCoverProjection,projectManualCover} from '../src/redesign/manual-cover-legacy-projection.mjs';
import {resolveManualDividerStyle,withManualDividerStyle} from '../src/redesign/manual-divider-style.mjs';

const require=createRequire(new URL('../../../../lk-design-system/package.json',import.meta.url)),{transformSync}=require('esbuild'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function source(name){return transformSync(readFileSync(new URL(`../src/redesign/${name}.jsx`,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,''),{loader:'jsx',jsxFactory:'React.createElement'}).code;}
const treeReact={createElement:(type,props,...children)=>({type,props:props||{},children})};
const properties=new Function('React','useEffect','useRef','useState','Button','Icon','Input','Select','readManualFigureLayout','getManualCoverProjection','resolveManualDividerStyle',source('ManualObjectProperties')+';return ManualObjectProperties;')(treeReact,()=>{},value=>({current:value}),value=>[value,()=>{}],'Button','Icon','Input','Select',()=>null,getManualCoverProjection,resolveManualDividerStyle);
function find(tree,type){if(!tree||typeof tree!=='object')return null;if(tree.type===type)return tree;return (tree.children||[]).flat(Infinity).map(child=>find(child,type)).find(Boolean)||null;}
function inspected(cover=false,variant){const value={id:'line',type:'divider',...(cover?projectManualCover({id:'cover',title:[],metadata:[],blocks:[]}).headerBlocks.find(block=>getManualCoverProjection(block.extensions)?.role==='divider'):{})};if(variant)value.extensions=withManualDividerStyle({extensions:value.extensions},variant).extensions;return {type:'divider',value};}
test('actual divider property JSX exposes basic/emphasis options and delegates through its pinned descriptor',()=>{
 for(const cover of [false,true])for(const variant of [undefined,'default','emphasis']){
  const item=inspected(cover,variant),calls=[],patches=[];
  const tree=properties({inspected:item,dividerStyle:{onCommit:value=>calls.push([item.value.id,value])},update:(...args)=>patches.push(args)}),select=find(tree,'Select');
  assert.equal(select.props.label,'구분선 스타일');assert.equal(select.props.value,variant||(cover?'emphasis':'default'));
  assert.deepEqual(select.props.options,[{value:'default',label:'기본'},{value:'emphasis',label:'강조'}]);
  select.props.onChange('emphasis');assert.deepEqual(calls,[[item.value.id,'emphasis']]);assert.deepEqual(patches,[]);
 }
});
test('disabled/readOnly/missing or disabled descriptor block style edits; stale inspected IDs render no form',()=>{
 for(const guard of [{disabled:true},{readOnly:true},{dividerStyle:{disabled:true,onCommit:()=>{throw new Error('disabled');}}},{dividerStyle:{}}]){
  const calls=[],tree=properties({inspected:inspected(),dividerStyle:{onCommit:value=>calls.push(value)},...guard}),select=find(tree,'Select');
  assert.equal(select.props.disabled,true);select.props.onChange('emphasis');assert.deepEqual(calls,[]);
 }
 assert.equal(properties({inspected:inspected(),inspectedId:'stale'}),null);
});
const components=createManualComponents(React,()=>null),print=new Function('React','ManualDivider','Inline','getManualPageProjection','getManualCoverProjection','projectManualCover','resolveManualDividerStyle',source('ManualPrint')+';return {Blocks,PrintCover};')(React,components.ManualDivider,()=>null,()=>null,getManualCoverProjection,projectManualCover,resolveManualDividerStyle);
test('public ManualDivider and actual Print ordinary/cover branches honor explicit variants with unchanged cover markers',()=>{
 for(const cover of [false,true])for(const variant of [undefined,'default','emphasis']){
  const expected=variant||(cover?'emphasis':'default'),html=renderToStaticMarkup(React.createElement(components.ManualDivider,{id:'line',cover,variant}));
  assert.match(html,new RegExp('data-manual-divider-variant="'+expected+'"'));assert.equal(html.includes('data-manual-cover-role="divider"'),cover);
 }
 for(const variant of ['default','emphasis']){
  const extensions=withManualDividerStyle({},variant).extensions;
  const ordinary=renderToStaticMarkup(React.createElement(print.Blocks,{blocks:[{id:'line',type:'divider',extensions}]}));
  assert.match(ordinary,new RegExp('data-manual-divider-variant="'+variant+'"'));assert.doesNotMatch(ordinary,/data-manual-cover-role/);
  const block=inspected(true,variant).value,projection={headerBlocks:[block],bodyBlocks:[]};
  const renderCover=new Function('React','ManualDivider','getManualCoverProjection','projectManualCover','resolveManualDividerStyle',source('ManualPrint')+';return PrintCover;')(React,components.ManualDivider,getManualCoverProjection,()=>projection,resolveManualDividerStyle);
  const cover=renderToStaticMarkup(React.createElement(renderCover,{cover:{id:'cover',metadata:[]}}));
  assert.match(cover,new RegExp('data-manual-divider-variant="'+variant+'"'));assert.match(cover,/data-manual-cover-role="divider"/);
 }
});
