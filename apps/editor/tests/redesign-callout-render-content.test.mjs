import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {hasVisibleManualCalloutTitle} from '../../../src/manual-callout-content.mjs';
import {resolveManualFigureAlignment} from '../src/redesign/manual-figure-layout.mjs';
import {createManualComponents} from '../../../src/components.mjs';
const require=createRequire(new URL('../../../../lk-design-system/package.json',import.meta.url));
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{transformSync,buildSync}=require('esbuild');
function component(name,path){const result=buildSync({entryPoints:[new URL(path,import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'cjs',external:['react'],jsx:'automatic'}),mod={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,mod,mod.exports);return mod.exports[name];}
const Callout=component('Callout','../../../../lk-design-system/packages/core/src/components/status/Callout.jsx'),Blockquote=component('Blockquote','../../../../lk-design-system/packages/core/src/components/content/Blockquote.jsx');
const {ManualDivider,ManualFigure}=createManualComponents(React,Callout);
const raw=readFileSync(new URL('../src/redesign/ManualPrint.jsx',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
const code=transformSync(raw,{loader:'jsx',jsxFactory:'React.createElement'}).code;
const Blocks=new Function('React','Callout','Blockquote','ManualDivider','ManualFigure','hasVisibleManualCalloutTitle','getManualPageProjection','resolveManualDividerStyle','resolveManualAsset','readManualFigureLayout','getManualBrandRenderAttributes','resolveManualFigureAlignment',code+';return Blocks;')(React,Callout,Blockquote,ManualDivider,ManualFigure,hasVisibleManualCalloutTitle,()=>null,()=> 'default',asset=>asset,()=>null,()=>({}),resolveManualFigureAlignment);
const p={id:'body',type:'paragraph',content:[{type:'text',text:'Authored body',marks:[{type:'emphasis'}]}]};
const print=block=>renderToStaticMarkup(React.createElement(Blocks,{blocks:[block],assets:{}}));
for(const [label,title,visible] of [['absent',[],false],['spaces',[{type:'text',text:' \t'}],false],['break',[{type:'hardBreak'}],false],['title',[{type:'text',text:'Original title',marks:[{type:'strong'}]}],true]])test(`Print ${label} title uses the shared visible-content decision without modifying authored data`,()=>{
 const block={id:'callout',type:'callout',tone:'signal',title,blocks:[p],extensions:{foreign:{keep:true}}},before=structuredClone(block),html=print(block);
 assert.deepEqual(block,before);assert.match(html,new RegExp('data-manual-callout-visible-title="'+visible+'"'));assert.equal(html.includes('class="lds-manual-callout-title"'),visible);assert.match(html,/<em>Authored body<\/em>/);assert.doesNotMatch(html,/콜아웃 제목|내용을 입력|data-manual-empty/);if(visible)assert.match(html,/<strong>Original title<\/strong>/);
});
for(const [label,body,pattern] of [
 ['list',{id:'list',type:'list',ordered:true,start:3,items:[{id:'item',blocks:[p]}]},/<ol start="3"><li id="item">/],
 ['heading',{id:'heading',type:'heading',level:2,content:[{type:'text',text:'Body heading'}]},/manual-v2-heading2/],
 ['code',{id:'code',type:'codeBlock',language:'text',text:'Code body'},/<code>Code body<\/code>/],
 ['nested',{id:'nested',type:'callout',tone:'offline',title:[],blocks:[p]},/id="nested"/],
 ['quote',{id:'quote',type:'quote',blocks:[p]},/lds-manual-quote/],
 ['divider',{id:'divider',type:'divider'},/<hr/],
 ['image',{id:'image',type:'figure',asset:'data:image/png;base64,AAA',alt:'Alternative',caption:[],widthPreset:'full'},/<img/],
])test(`Print first ${label} body preserves its own block structure and omits the empty heading`,()=>{
 const block={id:'callout',type:'callout',tone:'signal',title:[{type:'hardBreak'}],blocks:[body]},before=structuredClone(block),html=print(block);assert.deepEqual(block,before);assert.match(html,pattern);assert.doesNotMatch(html,/lds-manual-callout-title/);
});
test('title-only and bodyless callouts do not acquire paragraphs or placeholders during Print',()=>{
 for(const title of [[],[{type:'text',text:'Title only'}]]){const block={id:'callout',type:'callout',tone:'positive',title,blocks:[]},html=print(block);assert.equal(block.blocks.length,0);assert.doesNotMatch(html,/<p(?: |>)|manual-v2-print-block[^>]*id="body"|내용을 입력/);}
});

test('nested callouts keep their own visible-title decisions in either parent-child direction',()=>{
 for(const parentVisible of [false,true]){const title=[{type:'text',text:'Nested topic'}],block={id:'outer',type:'callout',tone:'signal',title:parentVisible?title:[],blocks:[{id:'inner',type:'callout',tone:'offline',title:parentVisible?[]:title,blocks:[p]}]},html=print(block);assert.equal((html.match(/class="lds-manual-callout-title"/g)||[]).length,1);assert.equal((html.match(/data-manual-callout-content="true" data-manual-callout-visible-title="true"/g)||[]).length,1);assert.equal((html.match(/data-manual-callout-content="true" data-manual-callout-visible-title="false"/g)||[]).length,1);assert.match(html,/Authored body/);}
});
