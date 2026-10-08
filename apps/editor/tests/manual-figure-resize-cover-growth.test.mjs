import test from 'node:test';
import assert from 'node:assert/strict';
import {NodeSelection} from '@tiptap/pm/state';
import {undoDepth} from '@tiptap/pm/history';
import {getManualFigureResizeBounds,clampManualFigureResize,installManualFigureResize} from '../src/redesign/manual-figure-resize.mjs';
import {createManualState,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {setManualFigureWidth,readManualFigureLayout} from '../src/redesign/manual-figure-layout.mjs';

function geometry({scale=1,followingBottom=null,pageKind='cover',wrapperFill=true}={}){
 const styles=new Map(),rect=(top,bottom,width=700)=>({top:top*scale,bottom:bottom*scale,width:width*scale,height:(bottom-top)*scale});
 const dom=(kind,measure,style={})=>{const values={width:'365px',maxWidth:'100%'};Object.defineProperty(values,'cssText',{get:()=>JSON.stringify(values),set:text=>{for(const key of Object.keys(values))delete values[key];Object.assign(values,JSON.parse(text));}});const node={dataset:{manualNode:kind},children:[],getBoundingClientRect:measure,isConnected:true,style:values};styles.set(node,style);return node;};
 const width=()=>parseFloat(element.style.width),height=()=>width()*196/365;
 const media=dom('media',()=>rect(200,200+height(),width())),element=dom('figure',()=>rect(200,240+height(),width()),{marginBottom:'16px'});
 const body=dom('coverBody',()=>rect(200,wrapperFill?1040:256+height()));body.children=[element];
 if(followingBottom!==null)body.children.push(dom('table',()=>rect(256+height(),followingBottom+height()-196)));
 const frame=dom('coverSectionFrame',()=>rect(180,wrapperFill?1040:256+height()));frame.children=[body];element.parentElement=body;
 const content=dom('content',()=>rect(60,1040));content.children=[frame];
 const page=dom(pageKind,()=>rect(0,1120),{paddingBottom:'80px',getPropertyValue:()=>''});
 return {element,media,body,frame,content,page,styles,scale,bounds:()=>getManualFigureResizeBounds({element,media,content,page,scale,getComputedStyle:node=>styles.get(node)})};
}
for(const scale of [1,1.25,2])test(`sparse min-height cover permits growth at scale ${scale}`,()=>{
 const g=geometry({scale}),bounds=g.bounds();assert.equal(bounds.maxWidthPx,700);assert.equal(bounds.maxHeightPx,784);
 assert.equal(clampManualFigureResize({widthPx:365,heightPx:196,scale,...bounds,deltaX:120*scale}).widthPx,485);
 g.element.style.width='485px';assert.ok(Math.abs(g.bounds().maxHeightPx-784)<1e-9,'Preview must not consume the same free space twice');
});
test('following authored table, its trailing margin and wrapper padding retain a footer-safe cap',()=>{
 const g=geometry({followingBottom:980});g.styles.set(g.body.children[1],{marginBottom:'8px'});g.styles.set(g.body,{paddingBottom:'12px',borderBottomWidth:'2px'});g.styles.set(g.frame,{paddingBottom:'6px'});g.styles.set(g.content,{paddingBottom:'4px'});
 assert.equal(g.bounds().maxHeightPx,224);
 const capped=clampManualFigureResize({widthPx:365,heightPx:196,scale:1,...g.bounds(),deltaX:1000});assert.equal(capped.heightPx,224);
 g.element.style.width=`${capped.widthPx}px`;assert.ok(Math.abs(g.bounds().maxHeightPx-224)<1e-9);
});
test('ordinary pages and media-group width bounds retain their existing contracts',()=>{
 const g=geometry({pageKind:'page'});assert.equal(g.bounds().maxHeightPx,784);
 g.body.dataset={manualNode:'mediaGroup',layout:'sideBySide'};g.styles.set(g.body,{gridTemplateColumns:'420px 280px'});
 assert.equal(g.bounds().maxWidthPx,420);g.body.dataset.layout='stacked';assert.equal(g.bounds().maxWidthPx,700);
 assert.equal(clampManualFigureResize({widthPx:365,heightPx:196,scale:1,...g.bounds(),deltaX:-1000}).widthPx,32);
 g.styles.set(g.body,{paddingLeft:'690px'});assert.equal(clampManualFigureResize({widthPx:365,heightPx:196,scale:1,...g.bounds(),deltaX:120}),null);
});
class Bus{constructor(){this.handlers=new Map();}addEventListener(type,fn){const set=this.handlers.get(type)||new Set();set.add(fn);this.handlers.set(type,set);}removeEventListener(type,fn){this.handlers.get(type)?.delete(fn);}emit(type,event){for(const fn of this.handlers.get(type)||[])fn(event);}}
for(const cancel of [false,true])test(`cover pointer growth ${cancel?'cancels without mutation':'commits once with exact Undo and media preservation'}`,()=>{
 const figure={type:'figure',id:'image',asset:'synthetic.png',alt:'Keep',caption:[{type:'text',text:'Caption',marks:[{type:'strong'}]}],widthPreset:'compact',crop:{x:1,y:2,width:20,height:10,sourceWidth:40,sourceHeight:30},extensions:{vendor:{opaque:true}}};
 let state=createManualState({document:{schemaVersion:2,id:'doc',title:'',cover:{id:'cover',title:[],metadata:[],blocks:[figure]},pages:[{id:'page',title:[],blocks:[]}]}});
 state=state.apply(state.tr.setSelection(NodeSelection.create(state.doc,findManualObject(state,'image').pos)));const before=state.doc,original=findManualObject(state,'image').node;let commits=0,ends=0;
 const g=geometry(),document=new Bus(),surface=new Bus(),layer=new Bus();document.defaultView=surface;layer.ownerDocument=document;layer.contains=()=>true;
 const handle={isConnected:true,closest:()=>handle,setPointerCapture(){},releasePointerCapture(){}};
 const target={...g,...g.bounds(),figureId:'image',widthPx:365,heightPx:196,context:{revision:before},getBounds:g.bounds,canRestore:()=>true};
 const controller=installManualFigureResize({element:layer,getTarget:()=>target,isEnabled:()=>true,isCurrent:value=>value.context.revision===state.doc,onCommit:({widthPx})=>{assert.equal(setManualFigureWidth({figureId:'image',widthPx,revision:before,minWidthPx:32,maxWidthPx:700})(state,tr=>{state=state.applyTransaction(tr).state;commits++;}),true);},onEnd:()=>ends++,surface});
 const event=x=>({target:handle,button:0,pointerId:1,clientX:x,clientY:0,preventDefault(){},stopPropagation(){}});
 assert.equal(controller.begin(event(0)),true);document.emit('pointermove',event(120));assert.equal(g.element.style.width,'485px');assert.equal(state.doc,before);assert.equal(commits,0);
 if(cancel){controller.cancel();assert.equal(state.doc,before);assert.equal(commits,0);}else{
  document.emit('pointerup',event(120));assert.equal(commits,1);assert.equal(undoDepth(state),1);const result=findManualObject(state,'image').node;
  assert.equal(readManualFigureLayout(result.attrs.meta.extensions).widthPx,485);assert.deepEqual(result.attrs.meta.crop,original.attrs.meta.crop);assert.equal(result.attrs.meta.asset,original.attrs.meta.asset);assert.equal(result.attrs.meta.alt,original.attrs.meta.alt);assert.deepEqual(result.attrs.meta.extensions.vendor,original.attrs.meta.extensions.vendor);assert.deepEqual(result.content.toJSON(),original.content.toJSON());assert.equal(state.selection.node.attrs.id,'image');
  assert.equal(manualCommands.undo(state,tr=>{state=state.applyTransaction(tr).state;}),true);assert.ok(state.doc.eq(before));
 }
 assert.equal(g.element.style.width,'365px');assert.equal(g.media.style.width,'365px');assert.equal(ends,1);controller.dispose();
});
