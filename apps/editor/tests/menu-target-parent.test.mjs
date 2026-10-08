import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {undoDepth} from '@tiptap/pm/history';
import {createManualState} from '../src/redesign/manual-kernel.mjs';
import {manualDragLayout} from '../src/redesign/manual-drag-layout.mjs';
import {manualMenuTargetDecorations} from '../src/redesign/manual-menu-target-decoration.mjs';
const require=createRequire(new URL('../../../../lk-design-system/package.json',import.meta.url)),{parse}=require('@babel/parser');
const source=readFileSync(process.env.LDS_MENU_TARGET_PARENT_SOURCE||new URL('../src/redesign/ManualEditor.jsx',import.meta.url),'utf8'),nodes=[];
function walk(node){if(!node||typeof node!=='object')return;nodes.push(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}
walk(parse(source,{sourceType:'module',plugins:['jsx']}));
const gate=nodes.find(node=>node.type==='FunctionDeclaration'&&node.id?.name==='menuTargetEnabled');
const decorations=nodes.filter(node=>node.type==='CallExpression'&&node.callee?.property?.name==='setProps').flatMap(node=>node.arguments[0]?.properties||[]).find(node=>node.key?.name==='decorations');
function harness(){
 let state=createManualState({document:{schemaVersion:2,id:'doc',title:'Synthetic',pages:[{id:'page',title:[],blocks:[{id:'body',type:'paragraph',content:[{type:'text',text:'Text'}]}]}]}});
 const editor={get state(){return state;},editable:true,composing:false},view={current:editor},generation={current:7},menuRef={current:{mode:'block',keyboard:true,targetId:'body',editor,revision:state.doc,generation:7}},dragPaths={current:null},dragCollections={current:null};
 assert.ok(gate,'actual Parent gate exists');assert.ok(decorations,'actual Parent decorations exists');
 const flags=['ready','busy','printRequested','replacementBusy','modal'],refs=['replacing','replacementSaving','printing'];
 const create=new Function('view','generation','menuRef','dragPaths','dragCollections','manualDragLayout','manualMenuTargetDecorations',`let ready=true,busy=false,printRequested=false,replacementBusy=false,modal=false;${refs.map(key=>`const ${key}={current:false};`).join('')}${source.slice(gate.start,gate.end)}const uiApi={current:{menuTargetEnabled}};return {render:${source.slice(decorations.value.start,decorations.value.end)},block(name,value=true){switch(name){${flags.map(key=>`case '${key}':${key}=value;break;`).join('')}${refs.map(key=>`case '${key}':${key}.current=value;break;`).join('')}}}};`);
 const parent=create(view,generation,menuRef,dragPaths,dragCollections,manualDragLayout,manualMenuTargetDecorations);
 return {parent,editor,view,generation,menuRef,get state(){return state;},change(){state=state.apply(state.tr.insertText('!'));}};
}
function targets(set){return set.find().filter(item=>item.type.attrs['data-manual-menu-target']);}
test('actual Parent composes drag attributes and menu emphasis without transactions or caret/history changes',()=>{
 const h=harness(),before=h.state,selection=before.selection,depth=undoDepth(before),base=manualDragLayout(before).decorations.find();
 const set=h.parent.render(before);assert.equal(targets(set).length,1);assert.equal(set.find().length,base.length+1);assert.equal(h.state,before);assert.equal(h.state.selection,selection);assert.equal(undoDepth(h.state),depth);
 h.menuRef.current=null;assert.equal(targets(h.parent.render(before)).length,0);assert.equal(h.state,before);
});
for(const flag of ['ready','busy','printRequested','replacementBusy','modal','replacing','replacementSaving','printing'])test(`actual Parent ${flag} guard clears menu emphasis`,()=>{const h=harness();h.parent.block(flag,flag==='ready'?false:true);assert.equal(targets(h.parent.render(h.state)).length,0);});
for(const cause of ['readonly','composing','generation','editor','doc','slash'])test(`actual Parent current ${cause} clears stale emphasis`,()=>{
 const h=harness();if(cause==='readonly')h.editor.editable=false;else if(cause==='composing')h.editor.composing=true;else if(cause==='generation')h.generation.current++;else if(cause==='editor')h.view.current={...h.editor};else if(cause==='doc')h.change();else h.menuRef.current.mode='slash';
 assert.equal(targets(h.parent.render(h.state)).length,0);
});
test('actual Parent keyboard menu flag reaches initial keyboard cue; pointer open remains unmarked',()=>{
 const keyboard=nodes.find(node=>node.type==='FunctionDeclaration'&&node.id?.name==='openCurrentBlockMenu'),pointer=nodes.find(node=>node.type==='FunctionDeclaration'&&node.id?.name==='openBlockMenu');
 assert.match(source.slice(keyboard.start,keyboard.end),/setMenu\(\{mode:'block',keyboard:true/);assert.doesNotMatch(source.slice(pointer.start,pointer.end),/keyboard:true/);
 const component=nodes.find(node=>node.type==='JSXOpeningElement'&&node.name?.name==='BlockCommandMenu'),prop=component.attributes.find(node=>node.name?.name==='initialKeyboardNavigation');
 assert.equal(source.slice(prop.value.expression.start,prop.value.expression.end),'menu.keyboard===true');assert.ok(!component.attributes.some(node=>node.name?.name==='keyboardOpened'));
});
