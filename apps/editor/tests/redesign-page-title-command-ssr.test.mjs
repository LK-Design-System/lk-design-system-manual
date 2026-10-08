import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createManualState,findManualPageRole,deleteManualObject,applyManualPageTitle,documentFromState} from '../src/redesign/manual-kernel.mjs';
import {projectManualPage,getManualPageProjection} from '../src/redesign/manual-page-projection.mjs';
import {createManualComponents} from '../../../src/components.mjs';
const runtime=process.env.LDS_PAGE_TEST_RUNTIME||fileURLToPath(new URL('../../../',import.meta.url)),require=createRequire(path.join(runtime,'package.json')),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{ManualPage}=createManualComponents(React,()=>null);
test('actual promoted scalar DTO projects one title before body in the public ordered renderer and outline title text stays consistent',()=>{
 let state=createManualState({document:{schemaVersion:2,id:'doc',title:'Synthetic',pages:[{id:'page',title:[],blocks:[{id:'promoted',type:'paragraph',content:[{type:'text',text:'Promoted title',marks:[{type:'strong'}]}]},{id:'body',type:'paragraph',content:[{type:'text',text:'Body'}]}]}]}});const dispatch=tr=>state=state.applyTransaction(tr).state;deleteManualObject(findManualPageRole(state,'page','title').node.attrs.id)(state,dispatch);assert.equal(applyManualPageTitle({mode:'turnInto',targetId:'promoted'})(state,dispatch),true);const page=documentFromState(state).pages[0],blocks=projectManualPage(page).blocks,h=React.createElement;
 const children=blocks.map(block=>{const role=getManualPageProjection(block.extensions);const content=block.content.map((run,index)=>run.marks?.some(mark=>mark.type==='strong')?h('strong',{key:index},run.text):run.text);return h(role?.role==='title'?'h2':'p',{key:block.id,'data-print-id':block.id,...(role?.role==='title'?{className:'lds-manual-section-title'}:{})},content);}),html=renderToStaticMarkup(h(ManualPage,{ordered:true,number:1,total:1},children));assert.equal((html.match(/<h2/g)||[]).length,1);assert.match(html,/<h2 data-print-id="promoted" class="lds-manual-section-title"><strong>Promoted title<\/strong><\/h2>/);assert.ok(html.indexOf('Promoted title')<html.indexOf('>Body<'));assert.equal(page.title.map(run=>run.text||'').join(''),'Promoted title');assert.deepEqual(page.blocks.map(block=>block.id),['body']);
});
