import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {NodeSelection} from '@tiptap/pm/state';
import {createManualState,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {setManualDividerStyle,readManualDividerStyle} from '../src/redesign/manual-divider-style.mjs';
import {withManualPaginationMarker} from '../src/redesign/manual-pagination-meta.mjs';
import {selectManualBlockIds,selectManualBlocks} from '../src/redesign/manual-block-selection.mjs';
const require=createRequire(new URL('../../../../lk-design-system/package.json',import.meta.url)),{parse}=require('@babel/parser');
const source=readFileSync(process.env.LDS_DIVIDER_PARENT_SOURCE||new URL('../src/redesign/ManualEditor.jsx',import.meta.url),'utf8'),ast=parse(source,{sourceType:'module',plugins:['jsx']}),nodes=[];
function walk(node){if(!node||typeof node!=='object')return;nodes.push(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}
walk(ast);
const wanted=['selectionIds','command','dividerStyleEnabled','currentDividerStyleContext','inspectedDividerStyle'];
const functions=wanted.map(name=>{const node=nodes.find(node=>node.type==='FunctionDeclaration'&&node.id?.name===name);assert.ok(node,`actual Parent ${name}`);return source.slice(node.start,node.end);}).join('\n');
function harness(){
 const foreign={vendor:{keep:['opaque',7]},manualDividerStyle:{owner:'foreign',version:8,kind:'private',variant:'purple'}};
 let state=createManualState({document:{schemaVersion:2,id:'doc',title:'Synthetic',pages:[{id:'page',title:[],blocks:[{id:'line',type:'divider',extensions:foreign},{id:'other',type:'divider'},{id:'body',type:'paragraph',content:[{type:'text',text:'Body'}]}]}]}}),transactions=0;
 const dispatch=tr=>{state=state.applyTransaction(tr).state;transactions++;};dispatch(state.tr.setSelection(NodeSelection.create(state.doc,findManualObject(state,'line').pos)).setStoredMarks([state.schema.marks.strong.create()]));transactions=0;
 const editor={get state(){return state;},dispatch,editable:true,composing:false,props:{}};
 const flags=['disabled','replacementBusy','busy','printRequested','modal','menu'],refs=['replacing','replacementSaving','printing','figureResizeSession','tableUISession','tableResizeSession','ownOutlineSelectSession','marginDrag'],controllers=['dragController','outlineDragController','marqueeController'];
 const create=new Function('editor','findManualObject','setManualDividerStyle','NodeSelection',`let inspector=true,ready=true,inspectorTargetId='line',inspectedId='line',inspected={type:'divider'},${flags.map(key=>`${key}=false`).join(',')};const view={current:editor},generation={current:1},uiApi={current:null};${refs.map(key=>`const ${key}={current:null};`).join('')}${controllers.map(key=>`const ${key}={current:null};`).join('')}function setNotice(){}function scheduleFocus(){editor.focusCalls++;}${functions};uiApi.current={inspectorTargetId,dividerStyleEnabled};editor.props.manualDividerStyleEnabled=editor=>uiApi.current?.dividerStyleEnabled(editor)||false;return {descriptor:inspectedDividerStyle,gate:dividerStyleEnabled,block(name,value=true){switch(name){${flags.map(key=>`case '${key}':${key}=value;break;`).join('')}${refs.map(key=>`case '${key}':${key}.current=value?{}:null;break;`).join('')}${controllers.map(key=>`case '${key}':${key}.current=value?{isDragging:()=>true}:null;break;`).join('')}case 'inspector':inspector=value;break;case 'ready':ready=value;break;case 'generation':generation.current++;break;case 'target':inspectorTargetId=uiApi.current.inspectorTargetId='other';break;case 'editor':view.current={...editor};break;case 'nondivider':inspected={type:'paragraph'};break;}}};`);
 editor.focusCalls=0;const parent=create(editor,findManualObject,setManualDividerStyle,NodeSelection);
 return {editor,parent,foreign,dispatch,get state(){return state;},get transactions(){return transactions;},changeDoc(){const found=findManualObject(state,'body');dispatch(state.tr.setNodeMarkup(found.pos,undefined,{...found.node.attrs,meta:{vendor:'changed'}}));},select(id){dispatch(state.tr.setSelection(NodeSelection.create(state.doc,findManualObject(state,id).pos)));}};
}
for(const variant of ['default','emphasis'])test(`actual Parent divider inspector ${variant} preserves identity, foreign extensions, selection, marks and one Undo`,()=>{
 const h=harness(),before=h.state,descriptor=h.parent.descriptor();assert.equal(descriptor.disabled,false);assert.equal(descriptor.onCommit(variant),true);assert.equal(h.transactions,1);assert.equal(h.editor.focusCalls,0);
 const found=findManualObject(h.state,'line');assert.equal(found.node.attrs.id,'line');assert.deepEqual(found.node.attrs.meta.extensions.vendor,h.foreign.vendor);assert.deepEqual(found.node.attrs.meta.extensions.manualDividerStyle,h.foreign.manualDividerStyle);assert.equal(readManualDividerStyle(found.node.attrs.meta.extensions).variant,variant);assert.ok(h.state.selection.eq(before.selection));assert.deepEqual(h.state.storedMarks,before.storedMarks);
 const after=h.state;assert.equal(manualCommands.undo(h.state,h.dispatch,h.editor),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(manualCommands.redo(h.state,h.dispatch,h.editor),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));
});
for(const name of ['disabled','replacementBusy','busy','printRequested','modal','menu','replacing','replacementSaving','printing','figureResizeSession','tableUISession','tableResizeSession','ownOutlineSelectSession','marginDrag','dragController','outlineDragController','marqueeController','generation','target','editor'])test(`captured Parent divider panel rejects ${name} change`,()=>{
 const h=harness(),captured=h.parent.descriptor(),before=h.state;h.parent.block(name);assert.equal(captured.onCommit('emphasis'),false);assert.equal(h.state,before);assert.equal(h.transactions,0);assert.equal(h.editor.focusCalls,0);
});
for(const [flag,value] of [['inspector',false],['ready',false]])test(`captured divider panel rejects ${flag} becoming false`,()=>{const h=harness(),captured=h.parent.descriptor(),before=h.state;h.parent.block(flag,value);assert.equal(captured.onCommit('emphasis'),false);assert.equal(h.state,before);assert.equal(h.transactions,0);});
for(const property of ['composing','editable'])test(`captured divider panel rejects editor ${property} change`,()=>{const h=harness(),captured=h.parent.descriptor(),before=h.state;h.editor[property]=property==='composing';assert.equal(captured.onCommit('emphasis'),false);assert.equal(h.state,before);assert.equal(h.transactions,0);});
test('captured divider panel rejects a stale document and a changed selected divider',()=>{for(const change of ['changeDoc','select']){const h=harness(),captured=h.parent.descriptor();h[change]('other');const before=h.state,count=h.transactions;assert.equal(captured.onCommit('emphasis'),false);assert.equal(h.state,before);assert.equal(h.transactions,count);}});
test('Parent still delegates exact-single-divider selection validation to the core command',()=>{const h=harness();selectManualBlocks('line','other')(h.state,h.dispatch);const before=h.state,count=h.transactions;assert.equal(h.parent.descriptor().disabled,true);assert.equal(h.parent.descriptor().onCommit('emphasis'),false);assert.equal(h.state,before);assert.equal(h.transactions,count);});
test('Parent omits the divider descriptor for another inspected type',()=>{const h=harness();h.parent.block('nondivider');assert.equal(h.parent.descriptor(),undefined);});
test('actual Parent AST connects divider properties, guarded editor prop, UI descriptor and inspector callback',()=>{
 const imported=nodes.find(node=>node.type==='ImportDeclaration'&&node.source.value==='./manual-divider-style.mjs');assert.ok(imported?.specifiers.some(node=>node.imported?.name==='setManualDividerStyle'));
 const propertyTypes=nodes.find(node=>node.type==='VariableDeclarator'&&node.id?.name==='propertyTypes');assert.ok(propertyTypes?.init.arguments[0].elements.some(node=>node.value==='divider'));
 const props=nodes.filter(node=>node.type==='CallExpression'&&node.callee?.property?.name==='setProps').flatMap(node=>node.arguments[0]?.properties||[]),guard=props.find(node=>node.key?.name==='manualDividerStyleEnabled');assert.ok(guard);assert.match(source.slice(guard.start,guard.end),/uiApi\.current\?\.dividerStyleEnabled\(editor\)/);
 const descriptor=nodes.find(node=>node.type==='AssignmentExpression'&&node.left?.object?.name==='uiApi'&&node.left?.property?.name==='current');assert.ok(descriptor.right.properties.some(node=>node.key?.name==='dividerStyleEnabled'));
 const inspector=nodes.find(node=>node.type==='JSXOpeningElement'&&node.name?.name==='ManualObjectProperties');const attribute=inspector.attributes.find(node=>node.name?.name==='dividerStyle');assert.equal(attribute.value.expression.callee.name,'inspectedDividerStyle');
});

test('actual Parent applies a style to one manually selected divider while preserving block selection',()=>{const h=harness();selectManualBlocks('line','line')(h.state,h.dispatch);const before=h.state,count=h.transactions;assert.equal(h.parent.descriptor().onCommit('emphasis'),true);assert.equal(h.transactions,count+1);assert.ok(h.state.selection.eq(before.selection));assert.equal(manualCommands.undo(h.state,h.dispatch,h.editor),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));});

test('Parent disables divider style for a real incomplete automatic block selection before attempting a command',()=>{
 const h=harness(),other=findManualObject(h.state,'other');
 h.dispatch(h.state.tr.setNodeMarkup(other.pos,undefined,{...other.node.attrs,meta:withManualPaginationMarker(other.node.attrs.meta,{kind:'block',rootBlockId:'line',sourceType:'divider'})}));
 assert.equal(selectManualBlockIds(['line'],{logicalFragments:false})(h.state,h.dispatch),true);assert.equal(h.state.selection.manualIncompletePaginationSelection,true);assert.deepEqual(h.state.selection.ids,['line']);
 const before=h.state,count=h.transactions,descriptor=h.parent.descriptor();assert.equal(descriptor.disabled,true);assert.equal(descriptor.onCommit('emphasis'),false);assert.equal(h.state,before);assert.equal(h.transactions,count);
});
