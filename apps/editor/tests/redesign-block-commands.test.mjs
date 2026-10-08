import test from 'node:test';
import assert from 'node:assert/strict';
import {BLOCK_COMMANDS,BLOCK_ACTIONS,filterBlockCommands,getBlockMenuItems,getBlockCommand,getBlockMenuKeyAction,positionBlockCommandMenu,blockCommandOptionId,getBlockMenuViewport} from '../src/redesign/block-command-catalog.mjs';

test('catalog contains the basic block types and separates inline code from a code block',()=>{
 const required=['paragraph','heading1','heading2','heading3','bulletList','orderedList','todo','toggle','quote','callout','divider','codeBlock','figure','table'];
 for(const id of required)assert.ok(getBlockCommand(id));
 assert.equal(new Set(BLOCK_COMMANDS.map(item=>item.id)).size,BLOCK_COMMANDS.length);
 assert.equal(getBlockCommand('code'),null);
 assert.equal(getBlockCommand('heading2').attrs.level,2);
 assert.equal(getBlockCommand('figure').needsInput,'image');
 assert.ok(Object.isFrozen(BLOCK_COMMANDS)&&Object.isFrozen(getBlockCommand('table').attrs));
});
test('Korean and English queries, slash prefixes, unicode width and multiple words find the same commands',()=>{
 for(const query of ['할 일','할일','todo','ＴＯＤＯ','/To Do','checkbox'])assert.equal(filterBlockCommands(query)[0].id,'todo');
 for(const query of ['번호','numbered list',' / NUMBERED  LIST '])assert.equal(filterBlockCommands(query)[0].id,'orderedList');
 assert.equal(filterBlockCommands('h2')[0].id,'heading2');
 assert.equal(filterBlockCommands('소제목')[0].id,'heading3');
 assert.equal(filterBlockCommands('image')[0].id,'figure');
 assert.equal(filterBlockCommands('없는명령').length,0);
 assert.deepEqual(filterBlockCommands(''),filterBlockCommands('/'));
});
test('context actions and conversion share the catalog but never convert into media or delete content implicitly',()=>{
 assert.deepEqual(getBlockMenuItems('',{mode:'block'}).map(item=>item.id),BLOCK_ACTIONS.map(item=>item.id));
 assert.equal(getBlockMenuItems('copy',{mode:'block'})[0].id,'duplicate');
 const conversion=getBlockMenuItems('',{mode:'turnInto'});
 assert.ok(conversion.some(item=>item.id==='heading1'));
 for(const id of ['figure','table','divider','page','procedure'])assert.ok(!conversion.some(item=>item.id===id));
 assert.equal(getBlockCommand('delete').danger,true);
});
test('enablement follows owner dry-run availability without mutating the frozen command definitions',()=>{
 const items=filterBlockCommands('',{enabledIds:['paragraph','heading1'],isEnabled:item=>item.id!=='heading1'});
 assert.equal(items.find(item=>item.id==='paragraph').disabled,false);
 assert.equal(items.find(item=>item.id==='heading1').disabled,true);
 assert.equal(items.find(item=>item.id==='table').disabled,true);
 assert.equal(Object.hasOwn(getBlockCommand('table'),'disabled'),false);
});
const keys=[{id:'a'},{id:'b',disabled:true},{id:'c'}];
test('keyboard navigation wraps, skips disabled commands and repairs missing active selection',()=>{
 const key=(key,activeId)=>getBlockMenuKeyAction(keys,activeId,{key});
 assert.deepEqual(key('ArrowDown','a'),{type:'move',activeId:'c'});
 assert.deepEqual(key('ArrowDown','c'),{type:'move',activeId:'a'});
 assert.deepEqual(key('ArrowUp','a'),{type:'move',activeId:'c'});
 assert.deepEqual(key('ArrowUp','missing'),{type:'move',activeId:'c'});
 assert.deepEqual(key('ArrowDown','missing'),{type:'move',activeId:'a'});
 assert.deepEqual(key('Home','c'),{type:'move',activeId:'a'});
 assert.deepEqual(key('End','a'),{type:'move',activeId:'c'});
 assert.equal(key('Enter','c').item.id,'c');
 assert.equal(key('Enter','b').item.id,'a');
});
test('IME composition and editor shortcuts are not consumed by the menu',()=>{
 for(const key of ['Enter','ArrowDown','Escape']){
  assert.equal(getBlockMenuKeyAction(keys,'a',{key,isComposing:true}),null);
  assert.equal(getBlockMenuKeyAction(keys,'a',{key,keyCode:229}),null);
  assert.equal(getBlockMenuKeyAction(keys,'a',{key},{composing:true}),null);
 }
 for(const flags of [{shiftKey:true},{altKey:true},{ctrlKey:true},{metaKey:true}])assert.equal(getBlockMenuKeyAction(keys,'a',{key:'Enter',...flags}),null);
 for(const key of ['a','Backspace','Delete','Tab','Process'])assert.equal(getBlockMenuKeyAction(keys,'a',{key}),null);
});
test('empty and fully disabled results allow Escape but never execute or move an item',()=>{
 for(const items of [[],[{id:'a',disabled:true}]]){
  assert.equal(getBlockMenuKeyAction(items,null,{key:'Enter'}),null);
  assert.equal(getBlockMenuKeyAction(items,null,{key:'ArrowDown'}),null);
  assert.deepEqual(getBlockMenuKeyAction(items,null,{key:'Escape'}),{type:'close'});
 }
});
test('menu positioning stays in a narrow viewport and flips above a low cursor',()=>{
 const narrow=positionBlockCommandMenu({left:360,top:600,bottom:624},{viewportWidth:390,viewportHeight:844});
 assert.ok(narrow.left>=8);assert.ok(narrow.left+narrow.width<=382);
 assert.ok(narrow.top+narrow.maxHeight<=836);
 const low=positionBlockCommandMenu({left:100,top:680,bottom:700},{viewportHeight:720});
 assert.ok(low.top+low.maxHeight<680);
 const high=positionBlockCommandMenu({left:-100,top:20,bottom:40},{viewportWidth:200,viewportHeight:180});
 assert.equal(high.left,8);assert.equal(high.width,184);assert.equal(high.top,46);
 assert.ok(high.top+high.maxHeight<=172);
});
test('option IDs are stable and do not inject spaces from arbitrary command IDs',()=>{
 assert.equal(blockCommandOptionId('menu','heading1'),'menu-option-heading1');
 assert.equal(blockCommandOptionId('menu','with space'),'menu-option-with%20space');
});
test('menu stays above a mobile keyboard when only the visual viewport shrinks or pans',()=>{
 const viewport=getBlockMenuViewport({innerWidth:390,innerHeight:844,visualViewport:{width:390,height:360,offsetTop:160,offsetLeft:0}});
 assert.deepEqual(viewport,{width:390,height:360,left:0,top:160});
 const position=positionBlockCommandMenu({left:300,top:460,bottom:484},{viewportWidth:viewport.width,viewportHeight:viewport.height,viewportTop:viewport.top,viewportLeft:viewport.left});
 assert.ok(position.top>=168);assert.ok(position.top+position.maxHeight<=512);
 assert.ok(position.left+position.width<=382);
 assert.deepEqual(getBlockMenuViewport({innerWidth:1000,innerHeight:800}),{width:1000,height:800,left:0,top:0});
});
test('above placement fits a measured toolbar above the selection in a panned viewport',()=>{
 const anchor={left:400,top:400,bottom:424};
 const position=positionBlockCommandMenu(anchor,{placement:'above',width:264,height:38,viewportWidth:390,viewportHeight:360,viewportLeft:20,viewportTop:160});
 assert.equal(position.top+position.maxHeight,anchor.top-6);
 assert.equal(position.maxHeight,38);
 assert.ok(position.left>=28);assert.ok(position.left+position.width<=402);
 assert.ok(position.top>=168);assert.ok(position.top+position.maxHeight<=512);
});
test('above placement falls below a high selection and uses the larger side when neither side fits',()=>{
 const high=positionBlockCommandMenu({left:100,top:12,bottom:30},{placement:'above',height:38,viewportHeight:180});
 assert.equal(high.top,36);assert.equal(high.maxHeight,38);
 const cramped=positionBlockCommandMenu({left:100,top:150,bottom:174},{placement:'above',height:180,viewportHeight:220});
 assert.equal(cramped.top+cramped.maxHeight,144);
 assert.equal(cramped.maxHeight,136);assert.equal(cramped.top,8);
});
test('default placement keeps the existing below preference when a tall menu could fit above',()=>{
 const anchor={left:100,top:400,bottom:424},options={height:360,viewportHeight:650};
 const implicit=positionBlockCommandMenu(anchor,options);
 assert.deepEqual(implicit,positionBlockCommandMenu(anchor,{...options,placement:'below'}));
 assert.equal(implicit.top,430);assert.equal(implicit.maxHeight,212);
 const above=positionBlockCommandMenu(anchor,{...options,placement:'above'});
 assert.equal(above.top,34);assert.equal(above.maxHeight,360);
});
