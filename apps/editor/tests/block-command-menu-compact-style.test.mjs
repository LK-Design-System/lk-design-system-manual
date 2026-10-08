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
test('short block and style menus use 160px; long conversion menus retain 320px',()=>{
 assert.equal(harness().render().props.style.width,160);
 assert.equal(harness({mode:'dividerStyle',onBack:()=>{}}).render().props.style.width,160);
 assert.equal(harness({mode:'turnInto',compact:false,onBack:()=>{}}).render().props.style.width,320);
});
function all(tree){const result=[];function visit(n){if(!n||typeof n!=='object')return;result.push(n);for(const c of n.children||[])if(Array.isArray(c))c.flat(Infinity).forEach(visit);else visit(c);}visit(tree);return result;}
test('style choices expose current radio check and compact back header without search focus',()=>{
 let backed=0;const tree=harness({mode:'dividerStyle',ariaLabel:'선 스타일',onBack:()=>backed++,items:[{id:'default',label:'기본',checked:true},{id:'emphasis',label:'강조',checked:false}]}).render(),nodes=all(tree);
 const choices=nodes.filter(n=>n.props.role==='menuitemradio');assert.equal(choices.length,2);assert.deepEqual(choices.map(n=>n.props['aria-checked']),[true,false]);
 const back=nodes.find(n=>n.props['aria-label']==='블록 작업으로 돌아가기');assert.ok(back);back.props.onClick();assert.equal(backed,1);assert.equal(nodes.some(n=>n.type==='Input'),false);
});
test('compact submenu remains inside narrow writing bounds with long labels and reserved check',()=>{
 const bounds={left:196,top:114,right:336,bottom:500},tree=harness({mode:'dividerStyle',ariaLabel:'선 스타일',onBack:()=>{},getPlacementBounds:()=>bounds,anchor:{left:330,top:200,bottom:224},items:[{id:'long',label:'기본 구분선의 아주 긴 합성 메뉴 이름',checked:true}]}).render();
 const p=tree.props.style;assert.ok(p.width<160);assert.ok(p.left>=bounds.left);assert.ok(p.left+p.width<=bounds.right);assert.ok(p.top+p.maxHeight<=bounds.bottom);assert.ok(all(tree).some(n=>n.props.className==='manual-block-command-menu-check'));
});

test('checked compact styles reject insufficient 68/96/118px bounds instead of clipping labels/checks',()=>{
 for(const width of [68,96,118])assert.equal(harness({mode:'dividerStyle',onBack:()=>{},getPlacementBounds:()=>({left:196,top:114,right:196+width,bottom:500}),items:[{id:'default',label:'기본',checked:true}]}).render(),null);
});
test('minimum checked width retains return and close controls for pixel QA',()=>{
 const tree=harness({mode:'dividerStyle',onBack:()=>{},ariaLabel:'선 스타일',getPlacementBounds:()=>({left:196,top:114,right:336,bottom:500}),items:[{id:'default',label:'기본',checked:true}]}).render();
 assert.equal(tree.props.style.width,124);assert.ok(all(tree).some(n=>n.props['aria-label']==='블록 작업으로 돌아가기'));assert.ok(all(tree).some(n=>n.props['aria-label']==='메뉴 닫기'));
});
