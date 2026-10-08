import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {TextSelection,NodeSelection} from '@tiptap/pm/state';
import {undoDepth} from '@tiptap/pm/history';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,findManualObject,documentFromState} from '../src/redesign/manual-kernel.mjs';
import {manualNodeControlAllowed} from '../src/redesign/manual-node-control-guard.mjs';
import {hasVisibleManualCalloutTitle} from '../../../src/manual-callout-content.mjs';
const require=createRequire(new URL('../../../../lk-design-system/package.json',import.meta.url));
const {transformSync,buildSync}=require('esbuild'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function publicComponent(name,path){const result=buildSync({entryPoints:[new URL(path,import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'cjs',external:['react'],jsx:'automatic'});const mod={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,mod,mod.exports);return mod.exports[name];}
const Callout=publicComponent('Callout','../../../../lk-design-system/packages/core/src/components/status/Callout.jsx');
const Blockquote=publicComponent('Blockquote','../../../../lk-design-system/packages/core/src/components/content/Blockquote.jsx');
// Only the DOM/event surface is simulated. The actual adapter callback, public
// Core SSR markup and ProseMirror transactions/plugins are executed unchanged.
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.listeners={};this.isConnected=true;}
 append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 contains(node){return node===this||this.children.some(child=>child.contains(node));}
 closest(selector){return selector==='[aria-hidden="true"]'&&(this.hidden||this.parent?.closest(selector))?(this.hidden?this:this.parent.closest(selector)):null;}
 querySelector(){return this.slot;}
 querySelectorAll(){return this.icon?[this.icon]:[];}
 replaceWith(node){const parent=this.parent,index=parent.children.indexOf(this);parent.children[index]=node;node.parent=parent;parent.slot=node;}
 addEventListener(type,callback){this.listeners[type]=callback;}
 set innerHTML(markup){assert.match(markup,/data-manual-content-slot/);const root=new Element('root'),slot=new Element('slot');root.slot=slot;root.append(slot);if(markup.includes('aria-hidden="true"')){const icon=new Element('icon');icon.hidden=true;root.icon=icon;root.append(icon);}this.content={firstElementChild:root};}
}
const owner={createElement:tag=>new Element(tag)};
const raw=readFileSync(new URL('../src/redesign/manual-node-views.jsx',import.meta.url),'utf8');
const source=raw.slice(raw.indexOf('function coreFrame('),raw.indexOf('export const manualNodeViews='));
const code=transformSync(source,{loader:'jsx',jsxFactory:'React.createElement'}).code;
const coreFrame=new Function('React','renderToStaticMarkup','Callout','Blockquote','TextSelection','NodeSelection','manualNodeControlAllowed','window','identify','hasVisibleManualCalloutTitle',code+';return coreFrame;')(React,renderToStaticMarkup,Callout,Blockquote,TextSelection,NodeSelection,manualNodeControlAllowed,{document:owner},(dom,node)=>{dom.dataset.manualId=node.attrs.id;},hasVisibleManualCalloutTitle);
const paragraph=(id,text='body')=>({id,type:'paragraph',content:[{type:'text',text}],extensions:{keep:true}});
function harness({blocks=[paragraph('body')],title=[],kind='callout',guard=true}={}){
 const document=createEmptyManualDocument();document.pages[0].blocks=[paragraph('outside'),{id:'target',type:kind,...(kind==='callout'?{title,tone:'signal'}:{}),blocks,extensions:{foreign:{keep:true}}}];
 let state=createManualState({document}),calls=0,focuses=0;
 const view={get state(){return state;},editable:true,composing:false,props:{manualCalloutFocusEnabled:()=>guard},dispatch(tr){state=state.applyTransaction(tr).state;calls++;},focus(){focuses++;}};
 let pos=findManualObject(state,'target').pos;const node=findManualObject(state,'target').node,nv=coreFrame(kind)(node,view,()=>pos);
 const icon=nv.dom.children[0].icon,svg=new Element('svg');icon?.append(svg);
 function event(type='pointerdown',extra={}){const e={type,target:svg,button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra};nv.dom.listeners[type]?.(e);return e;}
 return {view,nv,event,icon,svg,setPos:value=>{pos=value;},get state(){return state;},get calls(){return calls;},get focuses(){return focuses;},select(id,offset=0,to=offset){const f=findManualObject(state,id);state=state.apply(state.tr.setSelection(TextSelection.create(state.doc,f.pos+1+offset,f.pos+1+to)));},original:documentFromState(state)};
}
test('same callout caret and text range survive icon pointerdown/mousedown without transactions',()=>{
 for(const range of [[2,2],[1,3]]){const h=harness();h.select('body',...range);const before=h.state,first=h.event(),second=h.event('mousedown');assert.ok(first.defaultPrevented&&second.defaultPrevented);assert.equal(h.state,before);assert.equal(h.calls,0);assert.equal(h.focuses,2);assert.deepEqual(documentFromState(h.state),h.original);}
});
test('outside caret moves to existing body once; second mouse event adds no transaction or history',()=>{
 const h=harness();h.select('outside',2);const doc=h.state.doc;h.event();h.event('mousedown');assert.equal(h.calls,1);assert.equal(h.state.selection.$from.parent.attrs.id,'body');assert.equal(h.state.selection.$from.parentOffset,0);assert.equal(h.state.doc,doc);assert.equal(undoDepth(h.state),0);assert.deepEqual(documentFromState(h.state),h.original);
});
for(const options of [{blocks:[]},{blocks:[{id:'line',type:'divider'}]}])test('bodyless/atom-only icon selects existing callout without inserting body',()=>{
 const h=harness(options);h.select('outside');const doc=h.state.doc;h.event();assert.ok(h.state.selection instanceof NodeSelection);assert.equal(h.state.selection.node.attrs.id,'target');assert.equal(h.state.doc,doc);assert.equal(undoDepth(h.state),0);assert.deepEqual(documentFromState(h.state),h.original);
});
test('existing title is fallback only when there is no editable body',()=>{
 const h=harness({blocks:[],title:[{type:'text',text:'Title'}]});h.select('outside');h.event();assert.equal(h.state.selection.$from.parent.type.name,'calloutTitle');assert.equal(h.state.selection.$from.parentOffset,0);assert.equal(undoDepth(h.state),0);
});
for(const name of ['readonly','composition','gate','stale','disconnected','gesture','modifier','destroyed','invalid-position','event-composition'])test(`${name} blocks caret mutation while suppressing icon native fallback`,()=>{
 const h=harness({guard:name!=='gate'});h.select('outside');if(name==='readonly')h.view.editable=false;if(name==='composition')h.view.composing=true;if(name==='stale')h.setPos(0);if(name==='destroyed')h.view.isDestroyed=true;if(name==='invalid-position')h.setPos(999999);if(name==='disconnected')h.nv.dom.isConnected=false;if(name==='gesture')h.view.props.manualTableSelectionGestureBlocked=()=>true;
 const before=h.state,event=h.event('pointerdown',name==='modifier'?{shiftKey:true}:name==='event-composition'?{isComposing:true}:{});assert.equal(event.defaultPrevented,true);assert.equal(h.state,before);assert.equal(h.calls,0);assert.equal(h.focuses,0);
});
test('content, right button, unrelated chrome and quote do not use callout icon interception',()=>{
 const h=harness(),content=new Element('span');h.nv.contentDOM.append(content);assert.equal(h.event('pointerdown',{target:content}).defaultPrevented,false);assert.equal(h.event('pointerdown',{button:2}).defaultPrevented,false);assert.equal(h.event('pointerdown',{target:h.nv.dom}).defaultPrevented,false);assert.equal(h.nv.stopEvent({type:'keydown',target:h.svg,button:0}),false);assert.equal(h.nv.stopEvent({type:'mousedown',target:h.svg,button:0}),true);assert.equal(h.nv.stopEvent({type:'mousedown',target:content,button:0}),false);assert.equal(h.calls,0);
 const q=harness({kind:'quote'});assert.deepEqual(q.nv.dom.listeners,{});assert.equal(q.nv.stopEvent({type:'mousedown',target:q.nv.dom,button:0}),false);
});
test('nested editable body is selected without entering an empty nested title slot or changing source',()=>{
 const h=harness({blocks:[{id:'nested',type:'callout',title:[],tone:'signal',blocks:[paragraph('nested-body')]}]});h.select('outside');const doc=h.state.doc;h.event();assert.equal(h.state.selection.$from.parent.attrs.id,'nested-body');assert.equal(h.state.doc,doc);assert.equal(undoDepth(h.state),0);
});
test('icon selection changes do not add to or consume an existing text edit history',()=>{
 const h=harness();h.select('outside',2);h.view.dispatch(h.state.tr.insertText('X'));const doc=h.state.doc,depth=undoDepth(h.state);assert.equal(depth,1);h.event();h.event('mousedown');assert.equal(h.state.doc,doc);assert.equal(undoDepth(h.state),depth);
});

for(const [label,title,visible] of [ ['absent',[],false],['spaces',[{type:'text',text:'  \t'}],false],['break',[{type:'hardBreak'}],false],['authored',[{type:'text',text:' Title ',marks:[{type:'strong'}]}],true]])test(`actual node view ${label} title visibility is read-only and refreshed on update`,()=>{
 const h=harness({title}),before=h.state.doc;assert.equal(h.nv.dom.dataset.manualCalloutVisibleTitle,String(visible));assert.equal(h.nv.contentDOM.dataset.manualCalloutVisibleTitle,String(visible));assert.equal(h.state.doc,before);assert.equal(h.calls,0);assert.deepEqual(documentFromState(h.state),h.original);
 const body=h.nv.contentDOM,node=findManualObject(h.state,'target').node;assert.equal(h.nv.update(node),true);assert.equal(h.nv.contentDOM,body);assert.equal(h.nv.dom.dataset.manualCalloutVisibleTitle,String(visible));
});

for(const title of [[{type:'text',text:' \t'}],[{type:'hardBreak'}]])test('nonvisible authored bodyless title is preserved while icon selects the visible frame',()=>{
 const h=harness({blocks:[],title});h.select('outside');const doc=h.state.doc;h.event();assert.ok(h.state.selection instanceof NodeSelection);assert.equal(h.state.selection.node.attrs.id,'target');assert.equal(h.state.doc,doc);assert.deepEqual(documentFromState(h.state),h.original);assert.equal(undoDepth(h.state),0);
});
