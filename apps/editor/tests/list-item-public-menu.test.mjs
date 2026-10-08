import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {undoDepth} from '@tiptap/pm/history';
import {createManualState,documentFromState,getManualEditingDocument,findManualObject,selectManualObject,manualCommands,executeManualBlockCommand,duplicateManualObject,deleteManualObject,moveManualObject} from '../src/redesign/manual-kernel.mjs';
import {selectManualBlocks,deleteSelectedManualBlocks,duplicateSelectedManualBlocks,moveSelectedManualBlocks} from '../src/redesign/manual-block-selection.mjs';
import {getBlockMenuItems,getBlockMenuKeyAction,getBlockMenuViewport} from '../src/redesign/block-command-catalog.mjs';
import {getManualWritingBounds} from '../src/redesign/manual-format-bubble.mjs';
import {manualDragLayout} from '../src/redesign/manual-drag-layout.mjs';
import {installCanvasDrag} from '../src/ui/canvas-drag.mjs';
import {getManualRailLeft} from '../src/redesign/manual-rail-geometry.mjs';

const require=createRequire(new URL('../../../../lk-design-system/package.json',import.meta.url)),{parse}=require('@babel/parser');
const source=readFileSync(process.env.LDS_LIST_ITEM_PARENT_SOURCE||new URL('../src/redesign/ManualEditor.jsx',import.meta.url),'utf8'),nodes=[];
function walk(node){if(!node||typeof node!=='object')return;nodes.push(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}
walk(parse(source,{sourceType:'module',plugins:['jsx']}));
function actual(name,type='FunctionDeclaration'){const node=nodes.find(node=>node.type===type&&node.id?.name===name);assert.ok(node,`actual Parent ${name}`);return source.slice(type==='VariableDeclarator'?node.init.start:node.start,type==='VariableDeclarator'?node.init.end:node.end);}
const paragraph=(id,text='Content')=>({id,type:'paragraph',content:text?[{type:'text',text,marks:[{type:'strong'}]}]:[],extensions:{vendor:{keep:id}}});
function fixture(ordered=false,location='pageSibling',siblings=false){
 const list={id:'list',type:'list',ordered,items:[{id:'target-item',blocks:[paragraph('item-text')],extensions:{vendor:'target'}},...(siblings?[{id:'sibling-item',blocks:[paragraph('sibling-text','Keep sibling')]}]:[])],extensions:{vendor:'list'}};
 const outside=paragraph('outside','Keep outside'),container=location==='nestedList'?{id:'outer-list',type:'list',ordered:false,items:[{id:'outer-item',blocks:[paragraph('outer-text','Keep parent'),list]}]}:list;
 const document={schemaVersion:2,id:'doc',title:'Synthetic',pages:[{id:'page',title:[],blocks:location==='coverBody'?[outside]:[container,...(location==='pageSibling'?[outside]:[])]}]};
 if(location==='coverBody')document.cover={id:'cover',title:[],metadata:[],blocks:[container]};
 return document;
}

// Execute the product's actual Parent callbacks and menu availability expression.
// Rectangles and focus scheduling are simulated; this is not native browser QA.
function parentHarness(document=fixture()){
 let state=createManualState({document}),dispatches=0;
 const editor={get state(){return state;},editable:true,composing:false,dispatch(tr){dispatches++;state=state.applyTransaction(tr).state;},nodeDOM(){return {getBoundingClientRect:()=>({left:160,right:700,top:140,bottom:164,width:540,height:24})};},coordsAtPos(){return {left:160,top:140,bottom:164};}};
 const deps={getManualEditingDocument,findManualObject,selectManualObject,manualCommands,duplicateManualObject,deleteManualObject,moveManualObject,deleteSelectedManualBlocks,duplicateSelectedManualBlocks,moveSelectedManualBlocks,getBlockMenuItems,getBlockMenuKeyAction,getBlockMenuViewport,getManualWritingBounds,executeManualBlockCommand:(id,options)=>{calls.push({id,targetId:options?.targetId});return executeManualBlockCommand(id,options);}};
 const calls=[],view={current:editor},generation={current:7},dragPaths={current:manualDragLayout(state).paths},main={current:{getBoundingClientRect:()=>({left:0,right:1000,top:100,bottom:800,width:1000,height:700})}};
 const names=Object.keys(deps),fn=new Function(...names,'view','generation','dragPaths','main',`
  const names=${actual('names','VariableDeclarator')},coverRoles=${actual('coverRoles','VariableDeclarator')},propertyTypes=new Set(['figure','callout','codeBlock','procedure','table','divider']);
  let disabled=false,replacementBusy=false,modal=false,menu=null,menuPage=false,menuMulti=false;
  const replacing={current:false},ownOutlineSelectSession={current:null},tableUISession={current:null},tableResizeSession={current:null},dismissedSlash={current:null};
  const window={innerWidth:1280,innerHeight:900},setMenu=value=>{menu=value;},setBubble=()=>{},setNotice=()=>{},scheduleFocus=()=>{},setOutline=()=>{},setInspector=()=>{};
  const can=action=>!!action(view.current.state),coverElementAction=()=>{throw new Error('unexpected cover action');},coverInsertAction=coverElementAction,pageTitleAction=coverElementAction,outlinePageAction=coverElementAction,pageStructuralAction=coverElementAction;
  ${['objects','selectionIds','blockMenuSelection','command','openBlockMenu','openCurrentBlockMenu','handleEditorKey','blockAction','chooseBlock'].map(name=>actual(name)).join('\n')}
  function items(){const compactMenu=menu?.mode==='block',menuSelection=blockMenuSelection(view.current.state,menu);menuMulti=!!menuSelection&&menuSelection.ids.length>1;const index=objects(getManualEditingDocument(view.current.state)),menuTarget=index.get(menu?.targetId),menuTargetName=menuTarget?.type;menuPage=menu?.mode==='block'&&['page','cover'].includes(menuTarget?.type);const pageTitleState={enabled:false},pageTitleDescription='';return ${actual('baseMenuItems','VariableDeclarator')};}
  return {openBlockMenu,openCurrentBlockMenu,handleEditorKey,chooseBlock,items,get menu(){return menu;},block(flag,value=true){if(flag==='disabled')disabled=value;else if(flag==='replacementBusy')replacementBusy=value;else if(flag==='modal')modal=value;else replacing.current=value;}};
 `);
 const parent=fn(...Object.values(deps),view,generation,dragPaths,main);
 return {parent,editor,view,generation,dragPaths,calls,get state(){return state;},get dispatches(){return dispatches;},select(id='target-item',blocks=false){assert.equal((blocks?selectManualBlocks(id):selectManualObject(id,{text:false}))(state,editor.dispatch,editor),true);},undo(){return manualCommands.undo(state,editor.dispatch,editor);},redo(){return manualCommands.redo(state,editor.dispatch,editor);}};
}

for(const [key,modifiers]of [['/',{ctrlKey:true}],['/',{metaKey:true}],['F10',{shiftKey:true}],['ContextMenu',{}]])test(`selected list item remains the public ${key} menu target`,()=>{
 const h=parentHarness();h.select();const before=h.state,count=h.dispatches;let prevented=0;
 assert.equal(h.parent.handleEditorKey({key,...modifiers,preventDefault(){prevented++;}}),true);
 assert.equal(prevented,1);assert.equal(h.parent.menu.targetId,'target-item');assert.equal(h.parent.menu.keyboard,true);assert.equal(h.state,before);assert.equal(h.dispatches,count);
});
test('a block-selected item keeps its ID while ordinary body targeting is unchanged',()=>{
 const h=parentHarness();h.select('target-item',true);assert.equal(h.parent.openCurrentBlockMenu(),true);assert.equal(h.parent.menu.targetId,'target-item');assert.deepEqual(h.state.selection.ids,['target-item']);
 const body=parentHarness();body.select('outside');assert.equal(body.parent.openCurrentBlockMenu(),true);assert.equal(body.parent.menu.targetId,'outside');
});
for(const ordered of [false,true])for(const location of ['pageOnly','pageSibling','coverBody','nestedList'])test(`public item handle/menu/delete/Undo: ${ordered?'ordered':'bullet'} ${location}`,()=>{
 const document=fixture(ordered,location),h=parentHarness(document),layout=manualDragLayout(h.state),path='list/items/0';
 assert.equal(layout.paths.get(path),'target-item');assert.deepEqual(layout.collections.get('list/items').ids,['target-item']);
 const item=findManualObject(h.state,'target-item'),attrs=layout.decorations.find(item.pos,item.pos+item.node.nodeSize).find(d=>d.type.attrs['data-move-path']===path)?.type.attrs;
 assert.equal(attrs?.['data-move-label'],'목록 항목');assert.deepEqual(documentFromState(h.state),document);
 h.parent.openBlockMenu(path,{left:100,top:140,bottom:164});assert.equal(h.parent.menu.targetId,'target-item');assert.equal(h.state.selection.node.attrs.id,'target-item');
 const before=h.state,count=h.dispatches,depth=undoDepth(before),action=h.parent.items().find(item=>item.id==='delete');assert.ok(action);assert.equal(action.disabled,false);
 h.parent.chooseBlock(action);const after=h.state;assert.equal(h.parent.menu,null);assert.equal(h.dispatches,count+1);assert.equal(undoDepth(after),depth+1);assert.deepEqual(h.calls.at(-1),{id:'delete',targetId:'target-item'});assert.equal(findManualObject(after,'target-item'),null);assert.equal(findManualObject(after,'list'),null);after.doc.check();
 for(const id of ['outside','outer-text']){const prior=findManualObject(before,id);if(prior)assert.ok(findManualObject(after,id).node.eq(prior.node));}
 if(location==='pageOnly'){assert.equal(after.selection.$from.parent.type.name,'paragraph');assert.equal(after.selection.$from.parentOffset,0);}
 assert.equal(h.undo(),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.redo(),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));
});
test('public item deletion keeps the sibling item and list instead of deleting the whole list',()=>{
 const h=parentHarness(fixture(true,'pageSibling',true)),keep=findManualObject(h.state,'sibling-item').node;
 h.parent.openBlockMenu('list/items/0',{left:100,top:140,bottom:164});const before=h.state;h.parent.chooseBlock(h.parent.items().find(item=>item.id==='delete'));
 assert.deepEqual(h.calls.at(-1),{id:'delete',targetId:'target-item'});assert.equal(findManualObject(h.state,'target-item'),null);assert.ok(findManualObject(h.state,'sibling-item').node.eq(keep));assert.equal(findManualObject(h.state,'list').node.childCount,1);
 assert.equal(h.undo(),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
});
for(const flag of ['disabled','replacementBusy','modal','replacing','composing'])test(`item menu acquisition retains ${flag} guard`,()=>{
 const h=parentHarness();h.select();const before=h.state,count=h.dispatches;if(flag==='composing')h.editor.composing=true;else h.parent.block(flag);
 assert.equal(h.parent.openCurrentBlockMenu(),false);h.parent.openBlockMenu('list/items/0',{left:100,top:140,bottom:164});assert.equal(h.parent.menu,null);assert.equal(h.state,before);assert.equal(h.dispatches,count);
});

class Surface{
 constructor(kind){this.listeners=new Map();this.children=[];this.dataset=kind?{manualNode:kind}:{};this.attributes={};this.style={setProperty(){}};this.hidden=false;this.classList={toggle(){},add(){},remove(){},contains(){return false;}};}
 append(child){this.children.push(child);child.parentElement=this;}
 contains(target){return target===this||this.children.some(child=>child.contains(target));}
 addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(fn);}
 removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);}
 emit(name,event={}){for(const fn of this.listeners.get(name)||[])fn({target:this,...event});}
 setAttribute(name,value){this.attributes[name]=String(value);}
 removeAttribute(name){delete this.attributes[name];}
 hasAttribute(){return false;}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);}
 closest(selector){if(selector==='[data-move-path]'&&this.dataset.movePath||selector==='[data-move-handle]'&&this.dataset.moveHandle)return this;return this.parentElement?.closest(selector)||null;}
 querySelectorAll(selector){return this.children.flatMap(child=>[...(selector==='[data-move-path]'&&child.dataset.movePath?[child]:[]),...child.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 getBoundingClientRect(){return this.rect||{left:100,right:600,top:140,bottom:164,width:500,height:24};}
 get offsetWidth(){return this.getBoundingClientRect().width;}
}
test('actual controller list marker keeps the item handle; direct text and other wrapper rails stay specific',()=>{
 const saved=new Map(['document','window','innerHeight','requestAnimationFrame','cancelAnimationFrame'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),h=parentHarness(),doc=new Surface(),win=new Surface();
 doc.body=new Surface();doc.createElement=()=>new Surface();win.innerWidth=1280;win.innerHeight=900;win.getSelection=()=>({removeAllRanges(){}});
 const list=new Surface('list'),item=new Surface('listItem'),text=new Surface('paragraph');list.dataset.movePath='page/blocks/1';item.dataset.movePath='list/items/0';text.dataset.movePath='target-item/blocks/0';item.dataset.moveLabel='목록 항목';text.dataset.moveLabel='본문';
 list.rect={left:100,right:600,top:140,bottom:188,width:500,height:48};item.rect={left:124,right:600,top:140,bottom:164,width:476,height:24};text.rect={...item.rect};list.append(item);item.append(text);doc.body.append(list);
 doc.querySelectorAll=selector=>selector==='[data-move-path]'?[list,item,text]:[];doc.elementFromPoint=x=>x<100?doc.body:x<124?item:text;
 Object.assign(globalThis,{document:doc,window:win,innerHeight:900,requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
 let controller;try{
  controller=installCanvasDrag({beforeDrag(){},getRevision:()=>h.state.doc,getRailLeft:getManualRailLeft,onSelect(){},onEdit(){},onMove(){},onMenu:(path,anchor)=>h.parent.openBlockMenu(path,anchor)});
  const layer=doc.body.children.at(-1),handle=layer.children.find(child=>child.className==='manual-move-handle');
  doc.emit('pointermove',{target:item,clientX:110,clientY:150,pointerType:'mouse'});assert.equal(handle.dataset.moveHandle,item.dataset.movePath);assert.equal(handle.hidden,false);assert.equal(handle.attributes['aria-label'],'목록 항목 메뉴 및 이동');
  layer.emit('click',{target:handle,detail:0});assert.equal(h.parent.menu.targetId,'target-item');assert.equal(h.state.selection.node.attrs.id,'target-item');
  const before=h.state,count=h.dispatches;h.parent.chooseBlock(h.parent.items().find(action=>action.id==='delete'));assert.deepEqual(h.calls.at(-1),{id:'delete',targetId:'target-item'});assert.equal(h.dispatches,count+1);assert.equal(findManualObject(h.state,'target-item'),null);assert.ok(findManualObject(h.state,'outside').node.eq(findManualObject(before,'outside').node));assert.equal(h.undo(),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
  doc.emit('pointermove',{target:text,clientX:130,clientY:150,pointerType:'mouse'});assert.equal(handle.dataset.moveHandle,text.dataset.movePath);
  doc.emit('pointermove',{target:list,clientX:110,clientY:150,pointerType:'mouse'});assert.equal(handle.dataset.moveHandle,text.dataset.movePath);
 }finally{controller?.dispose();for(const [key,descriptor]of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
});
