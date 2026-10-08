import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {NodeSelection} from '@tiptap/pm/state';
import {createManualState,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {selectManualBlocks} from '../src/redesign/manual-block-selection.mjs';
import {getManualCoverProjection} from '../src/redesign/manual-cover-legacy-projection.mjs';
import {setManualDividerStyle,resolveManualDividerStyle} from '../src/redesign/manual-divider-style.mjs';
const require=createRequire(new URL('../../../../lk-design-system/package.json',import.meta.url)),{parse}=require('@babel/parser');
const source=readFileSync(new URL('../src/redesign/ManualEditor.jsx',import.meta.url),'utf8'),nodes=[];
function walk(n){if(!n||typeof n!=='object')return;nodes.push(n);for(const x of Object.values(n))if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object')walk(x);}
walk(parse(source,{sourceType:'module',plugins:['jsx']}));
const functions=['command','coverGestureBlocked','dividerStyleEnabled','dividerStyleMenuAction','chooseBlock'].map(name=>{const n=nodes.find(n=>n.type==='FunctionDeclaration'&&n.id?.name===name);assert.ok(n);return source.slice(n.start,n.end);}).join('\n');
function harness(cover=false){
 const document={schemaVersion:2,id:'doc',title:'Synthetic',pages:[{id:'page',title:[],blocks:[{id:'line',type:'divider',extensions:{vendor:{keep:7}}},{id:'other',type:'divider'}]}],...(cover?{cover:{id:'cover',title:[],metadata:[],sectionTitle:[],blocks:[]}}:{})};
 let state=createManualState({document}),count=0;const targetId=cover?'manual-cover:cover:divider':'line';
 const dispatch=tr=>{state=state.applyTransaction(tr).state;count++;};
 dispatch(state.tr.setSelection(NodeSelection.create(state.doc,findManualObject(state,targetId).pos)).setStoredMarks([state.schema.marks.strong.create()]));count=0;
 const editor={get state(){return state;},dispatch,editable:true,composing:false,props:{}},view={current:editor},generation={current:1};
 const make=new Function('view','generation','NodeSelection','findManualObject','getManualCoverProjection','setManualDividerStyle','resolveManualDividerStyle',`let menu=null,inspector=false,ready=true,disabled=false,replacementBusy=false,busy=false,printRequested=false,modal=null,menuPage=false,focus=0;const replacing={current:false},replacementSaving={current:false},printing={current:false},figureResizeSession={current:null},tableUISession={current:null},tableResizeSession={current:null},ownOutlineSelectSession={current:null},marginDrag={current:null},dragController={current:null},outlineDragController={current:null},marqueeController={current:null};function setMenu(value){menu=value;}function setBubble(){}function setNotice(){}function scheduleFocus(){focus++;}${functions};view.current.props.manualDividerStyleEnabled=dividerStyleEnabled;return {choose:chooseBlock,action:dividerStyleMenuAction,get menu(){return menu;},get inspector(){return inspector;},get focus(){return focus;},open(targetId){menu={mode:'block',targetId,editor:view.current,revision:view.current.state.doc,generation:generation.current,selection:view.current.state.selection};},block(flag){if(flag==='disabled')disabled=true;else if(flag==='busy')busy=true;else if(flag==='replacementBusy')replacementBusy=true;else if(flag==='modal')modal={};else if(flag==='gesture')marginDrag.current={};else if(flag==='generation')generation.current++;}};`);
 const parent=make(view,generation,NodeSelection,findManualObject,getManualCoverProjection,setManualDividerStyle,resolveManualDividerStyle);parent.open(targetId);
 return {parent,editor,dispatch,targetId,get state(){return state;},get count(){return count;}};
}
for(const cover of [false,true])test(`actual Parent ${cover?'cover':'normal'} line submenu changes style once, preserves selection/marks/ID/extensions and Undo`,()=>{
 const h=harness(cover),before=h.state;h.parent.choose({id:'dividerStyle'});assert.equal(h.parent.menu.mode,'dividerStyle');assert.equal(h.parent.inspector,false);assert.equal(h.state,before);
 h.parent.choose({id:'style',dividerVariant:cover?'default':'emphasis'});assert.equal(h.count,1);assert.equal(h.parent.menu,null);assert.ok(h.state.selection.eq(before.selection));assert.deepEqual(h.state.storedMarks,before.storedMarks);assert.equal(findManualObject(h.state,h.targetId).node.attrs.id,h.targetId);
 if(!cover)assert.deepEqual(findManualObject(h.state,h.targetId).node.attrs.meta.extensions.vendor,{keep:7});
 assert.equal(manualCommands.undo(h.state,h.dispatch,h.editor),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
});
for(const cover of [false,true])test(`current ${cover?'cover emphasis':'normal default'} style closes without document/history changes`,()=>{const h=harness(cover),before=h.state;h.parent.choose({id:'dividerStyle'});h.parent.choose({dividerVariant:cover?'emphasis':'default'});assert.equal(h.state,before);assert.equal(h.count,0);assert.equal(h.parent.menu,null);});
for(const flag of ['disabled','busy','replacementBusy','modal','gesture','generation','composing','readonly','selection','revision'])test(`captured line action rejects ${flag}`,()=>{
 const h=harness();h.parent.choose({id:'dividerStyle'});const action=h.parent.action('emphasis');
 if(flag==='composing')h.editor.composing=true;else if(flag==='readonly')h.editor.editable=false;else if(flag==='selection')h.dispatch(h.state.tr.setSelection(NodeSelection.create(h.state.doc,findManualObject(h.state,'other').pos)));else if(flag==='revision')h.dispatch(h.state.tr.setNodeMarkup(findManualObject(h.state,'other').pos,undefined,{id:'other',meta:{vendor:2}}));else h.parent.block(flag);
 const before=h.state,count=h.count;assert.equal(action(h.state,h.dispatch,h.editor),false);assert.equal(h.state,before);assert.equal(h.count,count);
});
test('multi-block selection cannot open single-line style menu',()=>{const h=harness();selectManualBlocks('line','other')(h.state,h.dispatch);h.parent.open('line');const before=h.state;h.parent.choose({id:'dividerStyle'});assert.equal(h.parent.menu.mode,'block');assert.equal(h.state,before);});
