import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {blockCommandOptionId,getBlockMenuKeyAction,positionBlockCommandMenu,getBlockMenuViewport} from '../src/redesign/block-command-catalog.mjs';
const require=createRequire(new URL('../../../../lk-design-system/package.json',import.meta.url)),{transformSync}=require('esbuild');
const source=readFileSync(new URL('../src/redesign/BlockCommandMenu.jsx',import.meta.url),'utf8');
const code=transformSync(source.replace(/^import .*;\n/gm,'').replace('export function BlockCommandMenu','function BlockCommandMenu'),{loader:'jsx',jsxFactory:'React.createElement'}).code;
function harness(props={}){
 const slots=[],layout=[];let index=0;
 const React={createElement:(type,props,...children)=>({type,props:props||{},children})};
 const useState=initial=>{const at=index++;if(!(at in slots))slots[at]=typeof initial==='function'?initial():initial;return [slots[at],value=>{slots[at]=typeof value==='function'?value(slots[at]):value;}];};
 const window={innerWidth:1000,innerHeight:900},document={body:{}};
 const component=new Function('React','useEffect','useId','useLayoutEffect','useRef','useState','createPortal','Input','Icon','blockCommandOptionId','getBlockMenuKeyAction','positionBlockCommandMenu','getBlockMenuViewport','installBlockMenuScrollKeeper','window','document',code+';return BlockCommandMenu;')(React,()=>{},()=> 'synthetic',callback=>layout.push(callback),value=>({current:value}),useState,tree=>tree,'Input','Icon',blockCommandOptionId,getBlockMenuKeyAction,positionBlockCommandMenu,getBlockMenuViewport,()=>null,window,document);
 let currentProps={items:[{id:'first',label:'First'},{id:'second',label:'Second'}],mode:'block',compact:true,anchor:{left:100,top:100,bottom:110},captureKeyboard:false,...props};
 function render(update={}){currentProps={...currentProps,...update};index=0;layout.length=0;return component(currentProps);}
 return {render,reset(){layout[0]();}};
}
test('keyboard-opened compact menu identifies the first active item on the initial render',()=>{
 const h=harness({initialKeyboardNavigation:true}),tree=h.render();
 assert.equal(tree.props['data-keyboard-navigation'],true);
 const list=tree.children.flat().find(child=>child?.props?.role==='menu');
 assert.equal(list.props['aria-activedescendant'],blockCommandOptionId('manual-block-menu-synthetic','first'));
});
test('pointer-opened menu remains neutral and pointer movement clears the keyboard cue',()=>{
 const pointer=harness();assert.equal(pointer.render().props['data-keyboard-navigation'],undefined);
 const keyboard=harness({initialKeyboardNavigation:true});keyboard.render().props.onPointerMove();assert.equal(keyboard.render().props['data-keyboard-navigation'],undefined);
});
test('reused menu resets modality when entering another menu mode and respects a new opening mode',()=>{
 const h=harness({initialKeyboardNavigation:true});h.render().props.onPointerDown();assert.equal(h.render().props['data-keyboard-navigation'],undefined);
 h.render({mode:'turnInto'});h.reset();assert.equal(h.render().props['data-keyboard-navigation'],true);
 h.render({initialKeyboardNavigation:false});h.reset();assert.equal(h.render().props['data-keyboard-navigation'],undefined);
});
test('disabled and composing pointer events cannot change the keyboard cue',()=>{
 for(const guard of [{disabled:true},{composing:true}]){const h=harness({initialKeyboardNavigation:true,...guard});h.render().props.onPointerMove();assert.equal(h.render().props['data-keyboard-navigation'],true);}
});
