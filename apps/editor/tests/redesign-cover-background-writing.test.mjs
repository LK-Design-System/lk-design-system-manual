import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {closeHistory} from '@tiptap/pm/history';
import {TextSelection} from '@tiptap/pm/state';
import {createManualState,findManualCoverRole,ensureParagraphAfter,manualCommands} from '../src/redesign/manual-kernel.mjs';
const require=createRequire(new URL('../../../../lk-design-system/package.json',import.meta.url)),{parse}=require('@babel/parser');
const source=readFileSync(new URL('../src/redesign/ManualEditor.jsx',import.meta.url),'utf8');let handler;
function walk(node){if(!node||typeof node!=='object')return;if(node.type==='FunctionDeclaration'&&node.id?.name==='continueWriting')handler=source.slice(node.start,node.end);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}
walk(parse(source,{sourceType:'module',plugins:['jsx']}));assert.ok(handler);
function harness({paragraph=false,session=false,geometry}={}){
 let state=createManualState({document:{schemaVersion:2,id:'doc',title:'Synthetic',cover:{id:'cover',title:[],sectionTitle:[{type:'text',text:'Before you begin'}],metadata:[],blocks:paragraph?[{type:'paragraph',id:'existing',content:[]}]:[]},pages:[{id:'page',title:[],blocks:[]}]}}),commands=0,focused=0;
 const dispatch=tr=>{state=state.applyTransaction(tr).state;},view={current:{get state(){return state;},dispatch,editable:true,composing:false}};
 const section=findManualCoverRole(state,'cover','sectionTitle');dispatch(state.tr.setSelection(TextSelection.create(state.doc,section.pos+1+section.node.content.size)));
 const bounds=geometry?.content??{left:100,right:800,top:100,bottom:900,height:800},block={dataset:{manualNode:'heading'},getBoundingClientRect:()=>({bottom:geometry?.lastBottom??300,height:40})};
 const content={lastElementChild:{getBoundingClientRect:()=>({bottom:900})},contains:target=>target.owner==='cover',getBoundingClientRect:()=>bounds,querySelectorAll:()=>[block]};
 const page={dataset:{manualNode:'cover',manualId:'cover'},querySelector:()=>content,querySelectorAll:()=>[],getBoundingClientRect:()=>geometry?.paper??bounds};
 const run=new Function('view','ensureParagraphAfter','closeHistory','getManualOutsideCalloutTarget','command',`const marqueeController={current:null},disabled=false,replacementBusy=false,modal=null,replacing={current:false},ownOutlineSelectSession={current:null},tableUISession={current:${session?'{}':'null'}},tableResizeSession={current:null},dragController={current:null},marginDrag={current:null};${handler};return continueWriting;`)(view,ensureParagraphAfter,closeHistory,()=>null,action=>{commands++;const ok=action(state,dispatch,view.current);if(ok)focused++;return ok;});
 return {get state(){return state;},get commands(){return commands;},get focused(){return focused;},dispatch,click(node='coverBody',x=400,y=400,owner='cover'){const target=node==='pageBackground'?page:node==='contentBackground'?content:{dataset:{manualNode:node},owner,closest:()=>page};target.closest=()=>page;run({button:0,shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,target,clientX:x,clientY:y,preventDefault(){},stopPropagation(){}});}};
}
for(const node of ['coverBody','coverSectionFrame','pageBackground','contentBackground'])test(`actual Parent ${node} blank click creates body caret with one Undo and preserves section title`,()=>{
 const h=harness(),before=h.state,section=findManualCoverRole(before,'cover','sectionTitle').node;h.click(node);assert.equal(h.commands,1);assert.equal(h.focused,1);assert.equal(h.state.selection.$from.parent.type.name,'paragraph');assert.equal(h.state.selection.$from.parentOffset,0);assert.ok(findManualCoverRole(h.state,'cover','sectionTitle').node.eq(section));manualCommands.undo(h.state,h.dispatch);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
});
test('existing trailing empty paragraph is reused without a document mutation',()=>{const h=harness({paragraph:true}),before=h.state;h.click();assert.equal(h.commands,1);assert.ok(h.state.doc.eq(before.doc));assert.equal(h.state.selection.$from.parent.attrs.id,'existing');});
for(const args of [['coverBody',99,400],['coverBody',400,900],['coverBody',400,250],['coverBody',400,400,'foreign'],['heading',400,400]])test(`outside/before-content/nonbackground click ${JSON.stringify(args)} does not mutate or focus`,()=>{const h=harness(),before=h.state;h.click(...args);assert.equal(h.commands,0);assert.ok(h.state===before);});
test('active table UI session remains protected',()=>{const h=harness({session:true}),before=h.state;h.click();assert.equal(h.commands,0);assert.ok(h.state===before);});

// This is declared-CSS geometry plus the real Parent handler and PM command,
// not a browser layout measurement. Cover content has natural height without
// the editor rule; its section frame can end well above the A4 paper bottom.
function declaredCoverGeometry(scale=1){
 const css=readFileSync(process.env.LDS_COVER_GEOMETRY_CSS||new URL('../src/redesign/manual-editor.css',import.meta.url),'utf8');
 const tokens=readFileSync(new URL('../../../tokens/manual.css',import.meta.url),'utf8');
 const px=name=>{const value=tokens.match(new RegExp(`${name}:\\s*([\\d.]+)mm`));assert.ok(value,`${name} physical token`);return Number(value[1])*96/25.4*scale;};
 const pageHeight=px('--manual-page-height'),inset=px('--manual-page-inset'),footer=px('--manual-footer-reserve');
 const declaration=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([,selector,body])=>selector.includes('.manual-v2-cover-content')&&/min-height\s*:/.test(body));
 if(declaration)assert.match(declaration[2],/min-height\s*:\s*calc\(var\(--manual-page-height\)\s*-\s*var\(--manual-page-inset\)\s*-\s*var\(--manual-footer-reserve\)\)/);
 const paper={left:100,right:800,top:100,bottom:100+pageHeight,height:pageHeight},lastBottom=100+317*scale,top=paper.top+inset;
 const bottom=declaration?Math.max(lastBottom,top+pageHeight-inset-footer):lastBottom;
 return {paper,lastBottom,content:{left:paper.left+inset,right:paper.right-inset,top,bottom,height:bottom-top},clickY:100+350*scale,hasMinimum:!!declaration};
}
for(const scale of [1,.75])test(`declared A4 cover writing area at scale ${scale} accepts blank space below intrinsic section frame and preserves one Undo`,()=>{
 const geometry=declaredCoverGeometry(scale),h=harness({geometry}),before=h.state,section=findManualCoverRole(before,'cover','sectionTitle').node;
 assert.ok(geometry.clickY>geometry.lastBottom);assert.ok(geometry.paper.bottom>geometry.clickY);
 h.click('pageBackground',400,geometry.clickY);assert.equal(h.commands,1,'below-section blank click must reach the paragraph command');assert.equal(h.focused,1);
 assert.equal(h.state.selection.$from.parent.type.name,'paragraph');assert.equal(h.state.selection.$from.parentOffset,0);assert.ok(findManualCoverRole(h.state,'cover','sectionTitle').node.eq(section));
 const after=h.state;h.click('coverBody',400,geometry.clickY);assert.equal(h.commands,2);assert.ok(h.state.doc.eq(after.doc),'repeat click reuses its trailing empty paragraph');
 manualCommands.undo(h.state,h.dispatch);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
});
test('declared A4 cover footer remains outside the writable blank area',()=>{
 const geometry=declaredCoverGeometry(),h=harness({geometry}),before=h.state;assert.equal(geometry.hasMinimum,true);assert.ok(geometry.content.bottom<geometry.paper.bottom);
 h.click('pageBackground',400,geometry.content.bottom+1);assert.equal(h.commands,0);assert.equal(h.focused,0);assert.equal(h.state,before);
});
