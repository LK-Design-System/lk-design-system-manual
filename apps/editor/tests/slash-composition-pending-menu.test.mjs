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
 const component=new Function('React','useEffect','useId','useLayoutEffect','useRef','useState','createPortal','Input','Icon','blockCommandOptionId','getBlockMenuKeyAction','positionBlockCommandMenu','getBlockMenuViewport','installBlockMenuScrollKeeper','window','document',code+';return BlockCommandMenu;')(React,()=>{},()=> 'synthetic',callback=>layout.push(callback),value=>{const at=index++;if(!(at in slots))slots[at]={current:value};return slots[at];},useState,tree=>tree,'Input','Icon',blockCommandOptionId,getBlockMenuKeyAction,positionBlockCommandMenu,getBlockMenuViewport,()=>null,window,document);
 let currentProps={items:[{id:'first',label:'First'},{id:'second',label:'Second'}],mode:'block',compact:true,anchor:{left:100,top:100,bottom:110},captureKeyboard:false,...props};
 function render(update={}){currentProps={...currentProps,...update};index=0;layout.length=0;return component(currentProps);}
 return {render,reset(){layout[0]();}};
}

function option(tree){const scan=value=>{if(!value||typeof value!=='object')return null;if(value.type==='button'&&value.props.role==='option')return value;for(const child of value.children?.flat(Infinity)||[]){const found=scan(child);if(found)return found;}return null;};return scan(tree);}
test('composing slash option arms a pending request and allows natural button focus without executing',()=>{
 let requested=0,chosen=0,prevented=false;const button={isConnected:true};
 const h=harness({mode:'slash',compact:false,composing:true,items:[{id:'cover',label:'Cover',compositionChoice:true}],onCompositionChoice:(item,target)=>{assert.equal(item.id,'cover');assert.equal(target,button);requested++;return true;},onChoose:()=>chosen++});
 const row=option(h.render());assert.equal(row.props.disabled,false);row.props.onMouseDown({button:0,currentTarget:button,preventDefault(){prevented=true;}});assert.equal(prevented,false);assert.equal(requested,1);row.props.onClick();assert.equal(chosen,0);
});
test('ordinary composing rows and readonly rows remain blocked and preserve editor focus',()=>{
 for(const props of [{composing:true},{composing:true,disabled:true}]){let chosen=0,requested=0,prevented=false;const h=harness({mode:'slash',compact:false,...props,items:[{id:'cover',label:'Cover'}],onCompositionChoice:()=>{requested++;return true;},onChoose:()=>chosen++});const row=option(h.render());row.props.onMouseDown({button:0,preventDefault(){prevented=true;}});row.props.onClick();assert.equal(prevented,true);assert.equal(chosen,0);assert.equal(requested,0);}
});

test('the original pending pointer click cannot execute again after composition ends and the option re-renders',()=>{
 let chosen=0;const h=harness({mode:'slash',compact:false,composing:true,items:[{id:'cover',label:'Cover',compositionChoice:true}],onCompositionChoice:()=>true,onChoose:()=>chosen++});option(h.render()).props.onMouseDown({button:0,currentTarget:{},preventDefault(){assert.fail('natural focus allowed');}});
 const committed=option(h.render({composing:false,items:[{id:'cover',label:'Cover'}]}));committed.props.onClick();assert.equal(chosen,0);committed.props.onClick();assert.equal(chosen,1);
});

test('aborted initial gesture does not swallow the next ordinary click on the same row',()=>{
 let chosen=0,cancelled=0;const h=harness({mode:'slash',compact:false,composing:true,items:[{id:'cover',label:'Cover',compositionChoice:true}],onCompositionChoice:()=>true,onCompositionChoiceCancel:()=>cancelled++,onChoose:()=>chosen++});option(h.render()).props.onMouseDown({button:0,currentTarget:{},preventDefault(){}});
 const next=option(h.render({composing:false,items:[{id:'cover',label:'Cover'}]}));next.props.onMouseDown({button:0,currentTarget:{},preventDefault(){}});next.props.onClick();assert.equal(cancelled,1);assert.equal(chosen,1);
});
test('row click confirms pending choice rather than invoking ordinary choose after composition ends',()=>{
 let confirmed=0,chosen=0;const button={};const h=harness({mode:'slash',compact:false,composing:true,items:[{id:'cover',label:'Cover',compositionChoice:true}],onCompositionChoice:()=>true,onCompositionChoiceConfirm:(item,target)=>{assert.equal(item.id,'cover');assert.equal(target,button);confirmed++;},onChoose:()=>chosen++});option(h.render()).props.onMouseDown({button:0,currentTarget:button,preventDefault(){}});
 option(h.render({composing:false,items:[{id:'cover',label:'Cover'}]})).props.onClick();assert.equal(confirmed,1);assert.equal(chosen,0);
});
