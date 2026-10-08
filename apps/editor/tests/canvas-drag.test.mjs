import test from 'node:test';
import assert from 'node:assert/strict';
import {installCanvasDrag,handleGeometry} from '../src/ui/canvas-drag.mjs';
import {createManualState,findManualObject,moveManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {manualDragLayout} from '../src/redesign/manual-drag-layout.mjs';
import {createManualPageTemplate} from '../src/redesign/manual-page-templates.mjs';

// Controller contract only: no browser rendering, hit testing or visual claim.
class Surface {
 constructor(){this.listeners=new Map();this.children=[];this.dataset={};this.style={setProperty(name,value){this[name]=value;}};this.hidden=false;this.attributes={};
  const classes=new Set();this.classList={add(name){classes.add(name);},remove(name){classes.delete(name);},contains:name=>classes.has(name),toggle(name,force){const enabled=force===undefined?!classes.has(name):force;if(enabled)classes.add(name);else classes.delete(name);return enabled;}};
 }
 addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(fn);}
 removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);}
 emit(name,event={}){for(const fn of this.listeners.get(name)||[])fn({target:this,...event});}
 append(child){this.children.push(child);child.parent=this;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
 contains(target){return target===this||this.children.some(child=>child.contains(target));}
 querySelectorAll(selector){const result=[];for(const child of this.children){if(selector.split(',').some(part=>part==='[data-move-path]'&&child.dataset.movePath||part==='[data-move-collection]'&&child.dataset.moveCollection||part===`[data-manual-node="${child.dataset.manualNode}"]`))result.push(child);result.push(...child.querySelectorAll(selector));}return result;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 setAttribute(name,value){this.attributes[name]=value;}
 removeAttribute(name){delete this.attributes[name];}
 closest(selector){if(selector==='[data-move-path]'&&this.dataset.movePath)return this;if(selector==='[data-move-handle]'&&this.dataset.moveHandle)return this;if(selector==='[data-move-insert]'&&this.dataset.moveInsert)return this;return this.parent?.closest(selector)||null;}
 get offsetWidth(){return this.layoutWidth??this.getBoundingClientRect().width;}
 get offsetHeight(){return this.layoutHeight??this.getBoundingClientRect().height;}
 get clientWidth(){return this.clientAreaWidth??this.offsetWidth;}
 get clientHeight(){return this.clientAreaHeight??this.offsetHeight;}
 get clientLeft(){return this.borderLeft??0;}
 get clientTop(){return this.borderTop??0;}
 getBoundingClientRect(){return this.rect||{left:100,right:500,top:100,bottom:150,width:400,height:50};}
 focus(){document.activeElement=this;}
 setPointerCapture(id){this.capture=id;}
 hasPointerCapture(id){return this.capture===id;}
 releasePointerCapture(){this.capture=null;}
}
function environment(callbacks={}){
 const saved={};for(const key of ['document','window','innerHeight','parent','location','cancelAnimationFrame','requestAnimationFrame'])saved[key]=globalThis[key];
 const doc=new Surface(),win=new Surface();win.innerWidth=1280;win.getSelection=()=>({removeAllRanges(){}});doc.body=new Surface();doc.createElement=()=>new Surface();doc.activeElement=null;
 const block=new Surface(),step=new Surface();block.dataset.movePath='/pages/0/blocks/0';block.dataset.moveLabel='절차';step.dataset.movePath='/pages/0/blocks/0/items/0';step.dataset.moveLabel='1단계';block.append(step);
 doc.querySelectorAll=selector=>selector==='[data-move-collection]'?[]:[block,step];
 const frames=[],cancelledFrames=[];win.scrolls=[];win.scrollBy=(x,y)=>win.scrolls.push([x,y]);
 Object.assign(globalThis,{document:doc,window:win,innerHeight:720,parent:{postMessage(){}},location:{origin:'http://example.invalid'},cancelAnimationFrame(id){cancelledFrames.push(id);},requestAnimationFrame(fn){frames.push(fn);return frames.length;}});
 const controller=installCanvasDrag({beforeDrag(){},onMove(){},onSelect(){},onEdit(){},onIdle(){},getRevision:()=>1,...callbacks});
 const layer=doc.body.children[0],handle=layer.children.find(child=>child.className==='manual-move-handle');
 return {doc,win,block,step,layer,handle,controller,frames,cancelledFrames,restore(){controller.dispose();for(const [key,value]of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}};
}
function startTargetedDrag(h){
 const collection=new Surface(),sibling=new Surface();collection.dataset.moveCollection='/pages/0/blocks';
 collection.rect={left:100,right:500,top:80,bottom:360,width:400,height:280};
 sibling.dataset.movePath='/pages/0/blocks/1';sibling.rect={left:100,right:500,top:220,bottom:270,width:400,height:50};collection.append(h.block);collection.append(sibling);
 h.doc.querySelectorAll=selector=>selector==='[data-move-collection]'?[collection]:[h.block,h.step,sibling];
 h.controller.show(h.block.dataset.movePath);
 h.layer.emit('pointerdown',{target:h.handle,button:0,pointerId:1,clientX:70,clientY:120,preventDefault(){}});
 h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:150,clientY:300,preventDefault(){}});
 assert.equal(h.layer.children.find(child=>child.className==='manual-move-line').hidden,false);
 assert.equal(h.block.classList.contains('manual-move-source'),true);
}
test('active drag ignores a second pointerdown and preserves the first pointer capture',()=>{
 let prepared=0,idle=0,moved=0;const h=environment({beforeDrag(){prepared++;},onIdle(){idle++;},onMove(){moved++;}});try{
  startTargetedDrag(h);
  h.layer.emit('pointerdown',{target:h.handle,button:0,pointerId:2,clientX:70,clientY:120,preventDefault(){}});
  h.layer.emit('pointercancel',{target:h.handle,pointerId:2});
  assert.equal(h.controller.isDragging(),true);assert.equal(h.handle.hasPointerCapture(1),true);assert.equal(h.block.classList.contains('manual-move-source'),true);
  assert.equal(prepared,1);assert.equal(idle,0);assert.equal(moved,0);
  h.layer.emit('pointercancel',{target:h.handle,pointerId:1});
  assert.equal(h.controller.isDragging(),false);assert.equal(h.handle.capture,null);assert.equal(h.block.classList.contains('manual-move-source'),false);assert.equal(idle,1);assert.equal(moved,0);
 }finally{h.restore();}
});

// Production controller geometry only; no native pointer or bitmap acceptance.
function guideClipDrag({mainTop=114,clientWidth=375,clientHeight=586,y=300,onMove=()=>{}}={}){
 const main=new Surface();main.rect={left:0,right:390,top:mainTop,bottom:700,width:390,height:700-mainTop};main.clientAreaWidth=clientWidth;main.clientAreaHeight=clientHeight;
 const h=environment({getScrollContainer:()=>main,onMove});h.win.innerWidth=390;
 const collection=new Surface(),sibling=new Surface();collection.dataset.moveCollection='/pages/0/blocks';collection.rect={left:12,right:805.6875,top:80,bottom:360,width:793.6875,height:280};
 h.block.rect={left:12,right:805.6875,top:100,bottom:140,width:793.6875,height:40};sibling.dataset.movePath='/pages/0/blocks/1';sibling.rect={left:12,right:805.6875,top:220,bottom:270,width:793.6875,height:50};collection.append(h.block);collection.append(sibling);
 h.doc.querySelectorAll=selector=>selector==='[data-move-collection]'?[collection]:[h.block,h.step,sibling];h.controller.show(h.block.dataset.movePath);
 h.layer.emit('pointerdown',{target:h.handle,button:0,pointerId:1,clientX:10,clientY:125,preventDefault(){}});
 h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:150,clientY:y,preventDefault(){}});
 return {...h,main,collection,line:h.layer.children.find(child=>child.className==='manual-move-line')};
}
test('drag guide clip: native scrollbar stays outside the line and drop order is unchanged',()=>{
 const moves=[],h=guideClipDrag({onMove:(...args)=>moves.push(args)});try{
  assert.equal(h.line.hidden,false);assert.equal(parseFloat(h.line.style.left),12);assert.equal(parseFloat(h.line.style.top),270);assert.equal(parseFloat(h.line.style.width),363);
  h.collection.rect={...h.collection.rect,left:0,width:805.6875};h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:150,clientY:300,preventDefault(){}});
  assert.equal(parseFloat(h.line.style.left)-4,0);assert.equal(parseFloat(h.line.style.left)+parseFloat(h.line.style.width),375);assert.ok(parseFloat(h.line.style.left)+4<=375);
  h.layer.emit('pointerup',{target:h.handle,pointerId:1});assert.deepEqual(moves,[[h.block.dataset.movePath,h.collection.dataset.moveCollection,2,1]]);
 }finally{h.restore();}
});
test('drag guide clip: boundary above the main header is unavailable and never commits',()=>{
 const moves=[],h=guideClipDrag({y:115,onMove:(...args)=>moves.push(args)});try{
  assert.equal(h.line.hidden,true);const status=h.layer.children.find(child=>child.className==='manual-move-status');assert.equal(status.textContent,'편집 영역 안의 표시된 위치에 놓으세요 · Esc 취소');
  h.layer.emit('pointerup',{target:h.handle,pointerId:1});assert.deepEqual(moves,[]);assert.equal(status.hidden,false);assert.equal(status.textContent,'표시된 위치에 놓지 않아 이동하지 않았습니다.');
 }finally{h.restore();}
});
test('drag guide clip: fully visible collection retains its exact guide geometry',()=>{
 const h=guideClipDrag({clientWidth:390});try{
  h.collection.rect={left:24,right:350,top:80,bottom:360,width:326,height:280};h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:150,clientY:300,preventDefault(){}});
  assert.equal(h.line.hidden,false);assert.equal(h.line.style.left,'24px');assert.equal(h.line.style.top,'270px');assert.equal(h.line.style.width,'326px');
  h.main.rect={...h.main.rect,top:270,height:430};h.main.clientAreaHeight=430;h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:150,clientY:300,preventDefault(){}});assert.equal(h.line.hidden,true);
  h.main.rect={...h.main.rect,top:267,height:433};h.main.clientAreaHeight=8;h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:150,clientY:270,preventDefault(){}});assert.equal(h.line.hidden,false);assert.equal(parseFloat(h.line.style.top)-3,267);assert.equal(parseFloat(h.line.style.top)+5,275);
  h.main.clientAreaHeight=7;h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:150,clientY:270,preventDefault(){}});assert.equal(h.line.hidden,true);
 }finally{h.restore();}
});
test('drag guide clip: zero client area rejects release without a document commit',()=>{
 const moves=[],h=guideClipDrag({clientWidth:0,onMove:(...args)=>moves.push(args)});try{
  assert.equal(h.line.hidden,true);h.layer.emit('pointerup',{target:h.handle,pointerId:1});assert.deepEqual(moves,[]);
 }finally{h.restore();}
});
test('drag guide clip: a partially clipped circle rejects release even if the line was previously visible',()=>{
 const moves=[],h=guideClipDrag({onMove:(...args)=>moves.push(args)});try{
  assert.equal(h.line.hidden,false);h.main.rect={...h.main.rect,top:270,height:430};h.main.clientAreaHeight=430;
  // No move/paint between the layout change and release: availability must be current.
  h.layer.emit('pointerup',{target:h.handle,pointerId:1});assert.deepEqual(moves,[]);assert.equal(h.layer.children.find(child=>child.className==='manual-move-status').hidden,false);
 }finally{h.restore();}
});
test('drag guide clip: autoscroll reveals the same gap and restores exactly one valid commit',()=>{
 const moves=[],h=guideClipDrag({y:115,onMove:(...args)=>moves.push(args)});try{
  assert.equal(h.line.hidden,true);const deltas=[];h.main.scrollBy=(_x,dy)=>{deltas.push(dy);for(const element of [h.block,h.collection,...h.collection.children.filter(child=>child!==h.block)])element.rect={...element.rect,top:element.rect.top-dy,bottom:element.rect.bottom-dy};};
  h.frames[0]();assert.equal(h.line.hidden,true);h.frames[1]();assert.deepEqual(deltas,[-16,-16]);assert.equal(h.line.hidden,false);assert.equal(h.line.style.top,'132px');assert.equal(h.layer.children.find(child=>child.className==='manual-move-status').textContent,'여기에 놓기 · Esc 취소');
  h.layer.emit('pointerup',{target:h.handle,pointerId:1});assert.deepEqual(moves,[[h.block.dataset.movePath,h.collection.dataset.moveCollection,0,1]]);h.layer.emit('pointerup',{target:h.handle,pointerId:1});assert.equal(moves.length,1);
 }finally{h.restore();}
});
test('drag guide clip: Escape clears an unavailable guide without a commit',()=>{
 const moves=[],h=guideClipDrag({y:115,onMove:(...args)=>moves.push(args)});try{
  h.layer.emit('keydown',{target:h.handle,key:'Escape',preventDefault(){},stopImmediatePropagation(){}});assert.equal(h.line.hidden,true);assert.equal(h.controller.isDragging(),false);assert.equal(h.handle.capture,null);assert.deepEqual(moves,[]);assert.equal(h.layer.children.find(child=>child.className==='manual-move-status').hidden,true);
 }finally{h.restore();}
});
test('drag guide clip: release uses current finite coordinates and retains the last pointer for invalid coordinates',()=>{
 for(const [coordinates,gap] of [[{clientX:150,clientY:115},null],[{clientX:150,clientY:230},1],[{clientX:NaN,clientY:Infinity},2]]){
  const moves=[],h=guideClipDrag({onMove:(...args)=>moves.push(args)});try{
   assert.equal(h.line.hidden,false);h.layer.emit('pointerup',{target:h.handle,pointerId:1,...coordinates});
   assert.deepEqual(moves,gap===null?[]:[[h.block.dataset.movePath,h.collection.dataset.moveCollection,gap,1]]);
  }finally{h.restore();}
 }
});
for(const [label,x,y,bodyTop] of [['native scrollbar',380,300],['outside viewport',500,300],['above client header',150,100,140]])test(`drag guide clip: release in ${label} rejects an otherwise visible gap`,()=>{
 const moves=[],h=guideClipDrag({onMove:(...args)=>moves.push(args)});try{
  if(bodyTop)h.block.rect={...h.block.rect,top:bodyTop,bottom:bodyTop+40};
  h.layer.emit('pointerup',{target:h.handle,pointerId:1,clientX:x,clientY:y});assert.deepEqual(moves,[]);assert.equal(h.layer.children.find(child=>child.className==='manual-move-status').hidden,false);
 }finally{h.restore();}
});
test('drag guide clip: rail release inside the client remains a valid drop',()=>{
 const moves=[],h=guideClipDrag({onMove:(...args)=>moves.push(args)});try{
  h.layer.emit('pointerup',{target:h.handle,pointerId:1,clientX:10,clientY:300});assert.deepEqual(moves,[[h.block.dataset.movePath,h.collection.dataset.moveCollection,2,1]]);
 }finally{h.restore();}
});
test('drag guide clip: right and bottom client edges are exclusive and fractional interior points commit',()=>{
 for(const [x,y,bottom,gap] of [[375,300,false,null],[374.5,300,false,2],[150,595,true,null],[150,594.5,true,2]]){
  const moves=[],h=guideClipDrag({onMove:(...args)=>moves.push(args)});try{
   if(bottom){h.main.clientAreaHeight=481;h.collection.rect={...h.collection.rect,bottom:650,height:570};h.collection.children.at(-1).rect={left:12,right:805.6875,top:550,bottom:590,width:793.6875,height:40};}
   h.layer.emit('pointerup',{target:h.handle,pointerId:1,clientX:x,clientY:y});assert.deepEqual(moves,gap===null?[]:[[h.block.dataset.movePath,h.collection.dataset.moveCollection,gap,1]]);
  }finally{h.restore();}
 }
});
test('drag guide clip: outside pointer can autoscroll but commits only after reentering the client',()=>{
 const moves=[],h=guideClipDrag({y:110,onMove:(...args)=>moves.push(args)});try{
  h.main.scrollBy=(_x,dy)=>{for(const element of [h.block,h.collection,...h.collection.children.filter(child=>child!==h.block)])element.rect={...element.rect,top:element.rect.top-dy,bottom:element.rect.bottom-dy};};
  h.frames[0]();h.frames[1]();assert.equal(h.block.rect.top,134);assert.equal(h.line.hidden,true);
  h.layer.emit('pointerup',{target:h.handle,pointerId:1,clientX:150,clientY:130});assert.deepEqual(moves,[[h.block.dataset.movePath,h.collection.dataset.moveCollection,0,1]]);
 }finally{h.restore();}
});
test('drag guide clip: cancellation clears a visible guide and never commits',()=>{
 const moves=[],h=guideClipDrag({onMove:(...args)=>moves.push(args)});try{
  assert.equal(h.line.hidden,false);h.layer.emit('pointercancel',{target:h.handle,pointerId:1});assert.equal(h.line.hidden,true);assert.equal(h.controller.isDragging(),false);assert.equal(h.handle.capture,null);assert.deepEqual(moves,[]);
 }finally{h.restore();}
});
test('nested cover drop: actual layout IDs choose the inner body gap after the table regardless of frame ID length',()=>{
 const cover=createManualPageTemplate('cover');cover.id='qa-page-controls-cover';cover.blocks=[
  {type:'paragraph',id:'qa-consumer-paragraph',content:[{type:'text',text:'Synthetic preserved body',marks:[{type:'strong'}]}],extensions:{vendor:{opaque:[1,2]}}},
  {type:'callout',id:'callout',title:[],tone:'signal',blocks:[{type:'paragraph',id:'callout-body',content:[]}]},
  {type:'table',id:'table',label:'Synthetic',headers:[{id:'h1',content:[]},{id:'h2',content:[]}],rows:[[{id:'c1',content:[]},{id:'c2',content:[]}]]},
  {type:'figure',id:'figure',asset:'assets/synthetic.png',alt:'Synthetic',caption:[],widthPreset:'full'},
 ];
 let state=createManualState({document:{schemaVersion:2,id:'document',title:'Synthetic',cover,pages:[{id:'page',title:[],blocks:[{type:'paragraph',id:'page-body',content:[]}]}]}}),dispatches=0;
 const dispatch=tr=>{state=state.applyTransaction(tr).state;dispatches++;},layout=manualDragLayout(state),moves=[];
 const bodyPath=[...layout.collections].find(([,target])=>target.parentId.endsWith('layout:body'))[0],framePath=[...layout.collections].find(([,target])=>target.parentId.endsWith('layout:frame'))[0];
 assert.ok(framePath.length>bodyPath.length);assert.deepEqual(layout.collections.get(bodyPath).ids,cover.blocks.map(block=>block.id));
 const main=new Surface();main.rect={left:196,right:1280,top:114,bottom:683,width:1084,height:569};main.clientAreaWidth=1069;
 const h=environment({getScrollContainer:()=>main,getRevision:()=>state.doc,onMove:(path,collection,gap,revision)=>{
  moves.push({path,collection,gap});assert.equal(revision,state.doc);const target=layout.collections.get(collection),parent=findManualObject(state,target.parentId),next=target.ids[gap]&&findManualObject(state,target.ids[gap]);
  assert.equal(moveManualObject(layout.paths.get(path),{parentId:target.parentId,index:next?.index??parent.node.childCount})(state,dispatch),true);
 }});try{
  const frame=new Surface(),body=new Surface(),title=new Surface();frame.dataset.moveCollection=framePath;body.dataset.moveCollection=bodyPath;title.dataset.movePath=framePath+'/0';title.rect={left:383,right:1077,top:187,bottom:229,width:694,height:42};
  frame.rect={left:383,right:1077,top:187,bottom:605,width:694,height:418};body.rect={left:383,right:1077,top:235,bottom:605,width:694,height:370};frame.append(title);frame.append(body);
  h.block.dataset.movePath=bodyPath+'/0';h.block.rect={left:383,right:1077,top:243.5625,bottom:267.5625,width:694,height:24};body.append(h.block);
  const siblings=[[279,337],[353,432],[448,592]].map(([top,bottom],index)=>{const node=new Surface();node.dataset.movePath=bodyPath+'/'+(index+1);node.rect={left:399,right:1062,top,bottom,width:663,height:bottom-top};body.append(node);return node;});
  h.doc.querySelectorAll=selector=>selector==='[data-move-collection]'?[frame,body]:[title,h.block,...siblings];h.controller.show(h.block.dataset.movePath);
  const before=state,original=findManualObject(state,'qa-consumer-paragraph').node;
  h.layer.emit('pointerdown',{target:h.handle,button:0,pointerId:1,clientX:356,clientY:255,preventDefault(){}});h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:700,clientY:444,preventDefault(){}});
  const line=h.layer.children.find(child=>child.className==='manual-move-line');assert.equal(line.hidden,false);assert.equal(line.style.top,'448px');
  h.layer.emit('pointerup',{target:h.handle,pointerId:1,clientX:700,clientY:444});assert.equal(moves[0].collection,bodyPath);assert.equal(moves[0].gap,3);assert.equal(dispatches,1);
  const moved=findManualObject(state,'qa-consumer-paragraph');assert.equal(moved.parent.type.name,'coverBody');assert.equal(moved.index,2);assert.ok(moved.node.eq(original));
  assert.equal(manualCommands.undo(state,dispatch),true);assert.ok(state.doc.eq(before.doc));assert.equal(manualDragLayout(state).paths.get(bodyPath+'/0'),'qa-consumer-paragraph');
 }finally{h.restore();}
});
test('foreign pointercancel and lostpointercapture leave an active drag untouched',()=>{
 let idle=0,moved=0;const h=environment({onIdle(){idle++;},onMove(){moved++;}});try{
  startTargetedDrag(h);
  for(const event of ['pointercancel','lostpointercapture']){
   h.layer.emit(event,{target:h.handle,pointerId:2});
   assert.equal(h.controller.isDragging(),true);assert.equal(h.handle.hasPointerCapture(1),true);assert.equal(h.block.classList.contains('manual-move-source'),true);assert.equal(idle,0);assert.equal(moved,0);
  }
  h.win.emit('blur');assert.equal(h.controller.isDragging(),false);assert.equal(h.handle.capture,null);assert.equal(h.block.classList.contains('manual-move-source'),false);assert.equal(idle,1);assert.equal(moved,0);
 }finally{h.restore();}
});
test('disposing an active drag cleans up without resuming a terminated owner',()=>{
 let idle=0,moved=0;const h=environment({onIdle(){idle++;throw new Error('Terminated owner');},onMove(){moved++;}});try{
  startTargetedDrag(h);
  assert.doesNotThrow(()=>h.controller.dispose());
  assert.equal(idle,0);assert.equal(moved,0);assert.equal(h.controller.isDragging(),false);assert.equal(h.handle.capture,null);assert.equal(h.block.classList.contains('manual-move-source'),false);assert.ok(h.cancelledFrames.includes(1));
  assert.equal(h.doc.body.children.length,0);
  for(const surface of [h.doc,h.win,h.layer])for(const listeners of surface.listeners.values())assert.equal(listeners.size,0);
 }finally{h.restore();}
});
test('started Escape cancels a valid drop and handles capture-loss reentry once',()=>{
 let idle=0,moved=0,selected=0,menus=0,prevented=0,stopped=0;const h=environment({onIdle(){idle++;},onMove(){moved++;},onSelect(){selected++;},onMenu(){menus++;}});try{
  startTargetedDrag(h);
  const release=h.handle.releasePointerCapture.bind(h.handle);h.handle.releasePointerCapture=()=>{release();h.layer.emit('lostpointercapture',{target:h.handle,pointerId:1});};
  h.layer.emit('keydown',{target:h.handle,key:'Escape',preventDefault(){prevented++;},stopImmediatePropagation(){stopped++;}});
  assert.equal(prevented,1);assert.equal(stopped,1);assert.equal(idle,1);assert.equal(moved,0);assert.equal(selected,0);assert.equal(menus,0);
  assert.equal(h.controller.isDragging(),false);assert.equal(h.handle.capture,null);assert.equal(h.block.classList.contains('manual-move-source'),false);assert.equal(h.layer.dataset.dragging,undefined);assert.ok(h.cancelledFrames.includes(1));
  for(const name of ['manual-move-line','manual-move-status'])assert.equal(h.layer.children.find(child=>child.className===name).hidden,true);
 }finally{h.restore();}
});
test('canvas has one hidden handle; nested hover shows only the nearest movable item',()=>{
 const h=environment();try{
  assert.equal(h.handle.hidden,true);
  h.doc.emit('pointermove',{target:h.step,clientX:110,clientY:110,pointerType:'mouse'});
  assert.equal(h.handle.hidden,false);assert.equal(h.handle.dataset.moveHandle,h.step.dataset.movePath);
  h.doc.emit('pointermove',{target:h.block,clientX:110,clientY:110,pointerType:'mouse'});
  assert.equal(h.handle.dataset.moveHandle,h.block.dataset.movePath);
  assert.equal(h.layer.children.filter(child=>child.className==='manual-move-handle').length,1);
 }finally{h.restore();}
});
test('gutter crossing keeps the handle reachable; leaving content hides it',()=>{
 const h=environment();try{
  h.controller.show(h.step.dataset.movePath);
  h.doc.emit('pointermove',{target:h.doc.body,clientX:90,clientY:110,pointerType:'mouse'});assert.equal(h.handle.hidden,false);
  h.doc.emit('pointermove',{target:h.doc.body,clientX:550,clientY:300,pointerType:'mouse'});assert.equal(h.handle.hidden,true);
 }finally{h.restore();}
});
test('first entry into the handle rail discovers the nearest nested target without prior content hover',()=>{
 const h=environment();try{
  h.doc.emit('pointermove',{target:h.doc.body,clientX:70,clientY:120,pointerType:'mouse'});
  assert.equal(h.handle.hidden,false);assert.equal(h.handle.dataset.moveHandle,h.step.dataset.movePath);
  assert.equal(h.handle.attributes['aria-pressed'],'false');
  h.doc.emit('pointermove',{target:h.step,clientX:105,clientY:120,pointerType:'mouse'});
  h.doc.emit('pointermove',{target:h.doc.body,clientX:90,clientY:120,pointerType:'mouse'});
  assert.equal(h.handle.hidden,false);assert.equal(h.handle.dataset.moveHandle,h.step.dataset.movePath);
 }finally{h.restore();}
});
test('vertical rail movement changes targets and hides the handle outside their rows',()=>{
 const h=environment();try{
  h.block.rect={left:100,right:500,top:100,bottom:240,width:400,height:140};
  h.step.rect={left:100,right:500,top:160,bottom:210,width:400,height:50};
  const hover=y=>h.doc.emit('pointermove',{target:h.doc.body,clientX:70,clientY:y,pointerType:'mouse'});
  hover(120);assert.equal(h.handle.dataset.moveHandle,h.block.dataset.movePath);
  hover(180);assert.equal(h.handle.dataset.moveHandle,h.step.dataset.movePath);
  hover(225);assert.equal(h.handle.dataset.moveHandle,h.block.dataset.movePath);
  hover(260);assert.equal(h.handle.hidden,true);
  hover(120);assert.equal(h.handle.hidden,false);
  h.doc.emit('pointermove',{target:h.doc.body,clientX:40,clientY:120,pointerType:'mouse'});assert.equal(h.handle.hidden,true);
 }finally{h.restore();}
});
test('child rail wins over a directly hovered parent wrapper, while direct child content stays specific',()=>{
 const h=environment();try{
  h.block.rect={left:50,right:500,top:80,bottom:240,width:450,height:160};
  h.doc.emit('pointermove',{target:h.block,clientX:70,clientY:120,pointerType:'mouse'});
  assert.equal(h.handle.dataset.moveHandle,h.step.dataset.movePath);
  h.doc.emit('pointermove',{target:h.step,clientX:110,clientY:120,pointerType:'mouse'});
  assert.equal(h.handle.dataset.moveHandle,h.step.dataset.movePath);
  h.doc.emit('pointermove',{target:h.block,clientX:70,clientY:220,pointerType:'mouse'});
  assert.equal(h.handle.dataset.moveHandle,h.block.dataset.movePath);
 }finally{h.restore();}
});
test('rail ignores collapsed, offscreen and occluded content and unrelated overlays',()=>{
 const h=environment();try{
  const hover=()=>h.doc.emit('pointermove',{target:h.doc.body,clientX:70,clientY:120,pointerType:'mouse'});
  h.block.rect=h.step.rect={left:100,right:100,top:100,bottom:150,width:0,height:50};hover();assert.equal(h.handle.hidden,true);
  h.block.rect=h.step.rect={left:100,right:500,top:800,bottom:850,width:400,height:50};hover();assert.equal(h.handle.hidden,true);
  h.block.rect=h.step.rect={left:100,right:500,top:100,bottom:150,width:400,height:50};
  const overlay=new Surface();h.doc.elementFromPoint=()=>overlay;hover();assert.equal(h.handle.hidden,true);
  h.doc.elementFromPoint=x=>x<100?overlay:h.step;hover();assert.equal(h.handle.hidden,true);
  h.doc.elementFromPoint=x=>x<100?h.doc.body:h.step;hover();assert.equal(h.handle.hidden,false);
  h.doc.elementFromPoint=()=>overlay;h.win.emit('scroll');assert.equal(h.handle.hidden,true);
 }finally{h.restore();}
});
test('scroll keeps the same control and focus; off-screen targets hide; dispose removes listeners',()=>{
 const h=environment();try{
  h.controller.show(h.step.dataset.movePath);h.handle.focus();h.win.emit('scroll');assert.equal(document.activeElement,h.handle);
  h.step.rect={left:100,right:500,top:-100,bottom:-50,width:400,height:50};h.win.emit('scroll');assert.equal(h.handle.hidden,true);
  h.controller.dispose();assert.equal(h.doc.listeners.get('pointermove').size,0);assert.equal(h.doc.body.children.length,0);
 }finally{h.restore();}
});
test('drag autoscroll uses the specified scroll surface and its edges, and removes its listener',()=>{
 const scroller=new Surface(),scrolls=[];scroller.rect={left:0,right:600,top:100,bottom:500,width:600,height:400};scroller.scrollBy=(x,y)=>scrolls.push([x,y]);
 const h=environment({getScrollContainer:()=>scroller});try{
  h.controller.show(h.step.dataset.movePath);
  h.layer.emit('pointerdown',{target:h.handle,button:0,pointerId:1,clientX:70,clientY:120,preventDefault(){}});
  h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:70,clientY:480,preventDefault(){}});
  h.frames.shift()();assert.deepEqual(scrolls,[[0,11]]);assert.deepEqual(h.win.scrolls,[]);
  h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:70,clientY:120,preventDefault(){}});
  h.frames.shift()();assert.deepEqual(scrolls.at(-1),[0,-11]);
  h.layer.emit('pointerup',{target:h.handle,pointerId:1});
  h.step.rect={left:100,right:500,top:-100,bottom:-50,width:400,height:50};scroller.emit('scroll');assert.equal(h.handle.hidden,true);
  h.controller.dispose();assert.equal(scroller.listeners.get('scroll').size,0);
 }finally{h.restore();}
});
test('drag autoscroll defaults to the window viewport',()=>{
 const h=environment();try{
  h.controller.show(h.step.dataset.movePath);
  h.layer.emit('pointerdown',{target:h.handle,button:0,pointerId:1,clientX:70,clientY:120,preventDefault(){}});
  h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:70,clientY:700,preventDefault(){}});
  h.frames.shift()();assert.deepEqual(h.win.scrolls,[[0,11]]);
 }finally{h.restore();}
});
test('drop gaps use path parentage through wrappers and exclude nested movable descendants',()=>{
 const moves=[];const h=environment({onMove:(...args)=>moves.push(args)});try{
  const collection=new Surface(),slot=new Surface(),second=new Surface(),third=new Surface();collection.dataset.moveCollection='/pages/0/blocks';
  collection.rect={left:100,right:500,top:80,bottom:360,width:400,height:280};
  second.dataset.movePath='/pages/0/blocks/1';second.rect={left:100,right:500,top:220,bottom:270,width:400,height:50};
  third.dataset.movePath='/pages/0/blocks/2';third.rect={left:100,right:500,top:310,bottom:360,width:400,height:50};
  collection.append(slot);slot.append(h.block);slot.append(second);slot.append(third);
  h.doc.querySelectorAll=selector=>selector==='[data-move-collection]'?[collection]:[h.block,h.step,second,third];
  h.controller.show(h.block.dataset.movePath);
  h.layer.emit('pointerdown',{target:h.handle,button:0,pointerId:1,clientX:70,clientY:120,preventDefault(){}});
  const line=h.layer.children.find(child=>child.className==='manual-move-line');
  h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:120,clientY:195,preventDefault(){}});assert.equal(line.style.top,'220px');
  h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:120,clientY:290,preventDefault(){}});assert.equal(line.style.top,'310px');
  h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:120,clientY:365,preventDefault(){}});assert.equal(line.style.top,'360px');
  h.layer.emit('pointerup',{target:h.handle,pointerId:1});assert.deepEqual(moves,[[h.block.dataset.movePath,collection.dataset.moveCollection,3,1]]);
 }finally{h.restore();}
});
test('wrapped nested collections still win over the page and expose only their own sibling gaps',()=>{
 const moves=[];const h=environment({onMove:(...args)=>moves.push(args)});try{
  const page=new Surface(),nested=new Surface(),outerSlot=new Surface(),innerSlot=new Surface(),source=new Surface(),first=new Surface(),last=new Surface();
  page.dataset.moveCollection='/pages/0/blocks';page.rect={left:100,right:500,top:80,bottom:400,width:400,height:320};
  nested.dataset.moveCollection='/pages/0/blocks/0/items/0/blocks';nested.rect={left:110,right:480,top:160,bottom:260,width:370,height:100};
  source.dataset.movePath='/pages/0/blocks/1';first.dataset.movePath=nested.dataset.moveCollection+'/0';last.dataset.movePath=nested.dataset.moveCollection+'/1';
  first.rect={left:110,right:480,top:170,bottom:200,width:370,height:30};last.rect={left:110,right:480,top:220,bottom:250,width:370,height:30};
  page.append(outerSlot);outerSlot.append(h.block);outerSlot.append(source);h.step.append(nested);nested.append(innerSlot);innerSlot.append(first);innerSlot.append(last);
  h.doc.querySelectorAll=selector=>selector==='[data-move-collection]'?[page,nested]:[h.block,h.step,source,first,last];
  h.controller.show(source.dataset.movePath);
  h.layer.emit('pointerdown',{target:h.handle,button:0,pointerId:1,clientX:70,clientY:120,preventDefault(){}});
  h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:120,clientY:210,preventDefault(){}});
  h.layer.emit('pointerup',{target:h.handle,pointerId:1});assert.deepEqual(moves,[[source.dataset.movePath,nested.dataset.moveCollection,1,1]]);
 }finally{h.restore();}
});
test('non-drag menu click and cancellation write no document classes while started drags clean only their source class',()=>{
 const writes=[];const h=environment({onMenu(){}});try{
  for(const element of [h.block,h.step]){
   const original=element.classList,path=element.dataset.movePath;
   element.classList={...original,add(name){writes.push({method:'add',name,path});original.add(name);},remove(name){writes.push({method:'remove',name,path});original.remove(name);},toggle(name,force){const before=original.contains(name),after=original.toggle(name,force);if(before!==after)writes.push({method:'toggle',name,path});return after;}};
  }
  h.controller.show(h.step.dataset.movePath);
  const down=()=>h.layer.emit('pointerdown',{target:h.handle,button:0,pointerId:1,clientX:70,clientY:120,preventDefault(){}});
  down();h.layer.emit('pointerup',{target:h.handle,pointerId:1});
  assert.deepEqual(writes,[]);
  down();h.layer.emit('pointercancel',{target:h.handle,pointerId:1});
  assert.deepEqual(writes,[]);
  for(const ending of ['pointerup','pointercancel']){
   down();h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:90,clientY:160,preventDefault(){}});
   assert.equal(h.step.classList.contains('manual-move-source'),true);
   const cleanupStart=writes.length;
   h.layer.emit(ending,{target:h.handle,pointerId:1});
   assert.equal(h.step.classList.contains('manual-move-source'),false);
   assert.deepEqual(writes.slice(cleanupStart),[{method:'remove',name:'manual-move-source',path:h.step.dataset.movePath}]);
  }
  assert.ok(writes.some(write=>write.method==='remove'&&write.name==='manual-move-source'));
 }finally{h.restore();}
});
test('optional handle menu opens on pointer click but never on a drag or pointer cancellation',()=>{
 const menus=[],selections=[];const h=environment({onMenu:(path,anchor)=>menus.push({path,anchor}),onSelect:path=>selections.push(path)});try{
  h.controller.show(h.step.dataset.movePath);
  const down=()=>h.layer.emit('pointerdown',{target:h.handle,button:0,pointerId:1,clientX:70,clientY:120,preventDefault(){}});
  down();h.layer.emit('pointerup',{target:h.handle,pointerId:1});
  assert.equal(menus.length,1);assert.equal(menus[0].path,h.step.dataset.movePath);assert.deepEqual(Object.keys(menus[0].anchor),['left','top','bottom']);
  assert.deepEqual(selections,[]);assert.equal(h.handle.attributes['aria-pressed'],'false');assert.equal(h.step.classList.contains('manual-element-selected'),false);
  down();h.layer.emit('pointermove',{target:h.handle,pointerId:1,clientX:90,clientY:160,preventDefault(){}});h.layer.emit('pointerup',{target:h.handle,pointerId:1});
  assert.equal(menus.length,1);
  down();h.layer.emit('pointercancel',{target:h.handle,pointerId:1});assert.equal(menus.length,1);
 }finally{h.restore();}
});
test('menu-only pointer, Space and context shortcuts preserve the original selection and Delete authority',()=>{
 for(const activation of ['pointer','Space','ShiftF10','ContextMenu'])for(const selectedBefore of [false,true]){
  const menus=[],selections=[],deleted=[];
  const h=environment({onMenu:(path,anchor,keys)=>menus.push({path,anchor,keys}),onSelect:path=>selections.push(path),onDelete:path=>deleted.push(path)});try{
   let clears=0;h.win.getSelection=()=>({removeAllRanges(){clears++;}});
   if(selectedBefore)h.controller.select(h.block.dataset.movePath);
   h.controller.show(h.step.dataset.movePath);
   const originalSelections=[...selections],originalClears=clears;
   const key=(key,extra={})=>h.layer.emit('keydown',{target:h.handle,key,preventDefault(){},stopPropagation(){},...extra});
   if(activation==='pointer'){
    h.layer.emit('pointerdown',{target:h.handle,button:0,pointerId:1,clientX:70,clientY:120,preventDefault(){}});
    h.layer.emit('pointerup',{target:h.handle,pointerId:1});
   }else if(activation==='Space')h.layer.emit('click',{target:h.handle,detail:0});
   else key(activation==='ShiftF10'?'F10':'ContextMenu',{shiftKey:activation==='ShiftF10'});
   assert.equal(menus.length,1);assert.equal(menus[0].path,h.step.dataset.movePath);
   assert.deepEqual(Object.keys(menus[0].anchor),['left','top','bottom']);
   assert.equal(menus[0].keys.shiftKey,activation==='ShiftF10');
   assert.deepEqual(selections,originalSelections);assert.equal(clears,originalClears);
   assert.equal(h.handle.attributes['aria-pressed'],'false');
   assert.equal(h.step.classList.contains('manual-element-selected'),false);
   assert.equal(h.block.classList.contains('manual-element-selected'),selectedBefore);
   key('Delete');assert.deepEqual(deleted,[]);
  }finally{h.restore();}
 }
});
test('legacy handle pointer and Space clicks still select when no menu callback is supplied',()=>{
 const selections=[];const h=environment({onSelect:path=>selections.push(path)});try{
  h.controller.show(h.step.dataset.movePath);
  h.layer.emit('pointerdown',{target:h.handle,button:0,pointerId:1,clientX:70,clientY:120,preventDefault(){}});
  h.layer.emit('pointerup',{target:h.handle,pointerId:1});
  assert.deepEqual(selections,[h.step.dataset.movePath]);assert.equal(h.handle.attributes['aria-pressed'],'true');
  assert.equal(h.step.classList.contains('manual-element-selected'),true);
  h.layer.emit('click',{target:h.handle,detail:0});
  assert.deepEqual(selections,[h.step.dataset.movePath,h.step.dataset.movePath]);
 }finally{h.restore();}
});
test('handle menu shortcut and Space activation remain available without changing Enter selection/editing',()=>{
 const menus=[],edited=[];const h=environment({onMenu:path=>menus.push(path),onEdit:path=>edited.push(path)});try{
  h.controller.show(h.step.dataset.movePath);
  const key=(key,extra={})=>h.layer.emit('keydown',{target:h.handle,key,preventDefault(){},stopPropagation(){},...extra});
  key('Enter');assert.equal(menus.length,0);key('Enter');assert.deepEqual(edited,[h.step.dataset.movePath]);
  key('F10',{shiftKey:true,isComposing:true});assert.equal(menus.length,0);
  key('F10',{shiftKey:true});assert.deepEqual(menus,[h.step.dataset.movePath]);
  h.layer.emit('click',{target:h.handle,detail:0});assert.equal(menus.length,2);
 }finally{h.restore();}
});
test('gutter plus is found from its own rail, shares visibility, and supports keyboard and touch activation',()=>{
 const adds=[];const h=environment({onInsert:(path,anchor)=>adds.push({path,anchor})});try{
  const plus=h.layer.children.find(child=>child.className.includes('manual-insert-handle'));
  assert.equal(plus.hidden,true);
  h.doc.emit('pointermove',{target:h.doc.body,clientX:38,clientY:120,pointerType:'mouse'});
  assert.equal(plus.hidden,false);assert.equal(plus.dataset.moveInsert,h.step.dataset.movePath);
  h.layer.emit('click',{target:plus,detail:0});assert.equal(adds.length,1);assert.equal(adds[0].path,h.step.dataset.movePath);
  h.doc.emit('pointermove',{target:h.doc.body,clientX:550,clientY:300,pointerType:'mouse'});assert.equal(plus.hidden,true);assert.equal(h.handle.hidden,true);
  h.doc.emit('pointerdown',{target:h.step,pointerType:'touch'});assert.equal(plus.hidden,false);
  h.layer.emit('click',{target:plus,detail:1});assert.equal(adds.length,2);
 }finally{h.restore();}
});
test('optional Shift click range callback does not collapse selection or open a single-block menu',()=>{
 const ranges=[],menus=[],selected=[];const h=environment({onRangeSelect:(path,keys,anchor)=>ranges.push({path,keys,anchor}),onMenu:path=>menus.push(path),onSelect:path=>selected.push(path)});try{
  h.controller.show(h.step.dataset.movePath);
  h.layer.emit('pointerdown',{target:h.handle,button:0,pointerId:1,clientX:70,clientY:120,shiftKey:true,preventDefault(){}});
  h.layer.emit('pointerup',{target:h.handle,pointerId:1});
  assert.equal(ranges.length,1);assert.equal(ranges[0].path,h.step.dataset.movePath);assert.equal(ranges[0].keys.shiftKey,true);
  assert.deepEqual(menus,[]);assert.deepEqual(selected,[]);
 }finally{h.restore();}
});

test('page and cover badges use the paper top margin and title left with no insert control',()=>{
 for(const kind of ['pageTitle','coverTitle']){
  const main=new Surface();main.rect={left:0,right:390,top:297.1875,bottom:844,width:390,height:546.8125};
  const h=environment({onInsert(){},onMenu(){},getScrollContainer:()=>main});try{
   h.block.dataset.manualNode=kind==='pageTitle'?'page':'cover';
   h.block.dataset.moveLabel=kind==='pageTitle'?'페이지':'표지';
   h.block.rect={left:12,right:378,top:309.1875,bottom:809.1875,width:366,height:500};
   const title=new Surface();title.dataset.manualNode=kind;
   title.rect={left:32,right:358,top:359.1875,bottom:401.1875,width:326,height:42};
   h.block.append(title);h.controller.show(h.block.dataset.movePath);
   const plus=h.layer.children.find(child=>child.className.includes('manual-insert-handle'));
   assert.equal(h.handle.hidden,false);assert.equal(plus.hidden,true);
   assert.equal(h.handle.dataset.moveKind,h.block.dataset.manualNode);
   assert.equal(h.handle.attributes['aria-label'],`${h.block.dataset.moveLabel} 메뉴 및 이동`);
   assert.equal(parseFloat(h.handle.style.top),h.block.rect.top+12);
   assert.equal(parseFloat(h.handle.style.left),title.rect.left);
   assert.ok(parseFloat(h.handle.style.top)+24<title.rect.top);
  }finally{h.restore();}
 }
});
test('page and cover badges fit 64 pixels inside the main and restore the body control kind and spacing',()=>{
 for(const kind of ['pageTitle','coverTitle']){
  const main=new Surface();main.rect={left:196,right:1028,top:194.09375,bottom:864.5,width:832,height:670.40625};
  const h=environment({onInsert(){},getScrollContainer:()=>main});try{
   h.block.dataset.manualNode=kind==='pageTitle'?'page':'cover';
   h.block.rect={left:212,right:1012,top:210.09375,bottom:810.09375,width:800,height:600};
   const title=new Surface();title.dataset.manualNode=kind;
   title.rect={left:261,right:963,top:259.09375,bottom:301.09375,width:702,height:42};
   h.block.append(title);h.controller.show(h.block.dataset.movePath);
   const plus=h.layer.children.find(child=>child.className.includes('manual-insert-handle'));
   assert.equal(h.handle.hidden,false);assert.equal(plus.hidden,true);
   assert.ok(parseFloat(h.handle.style.left)>=main.rect.left+8);
   assert.ok(parseFloat(h.handle.style.left)+64<=main.rect.right-8);
   assert.equal(parseFloat(h.handle.style.left),title.rect.left);
   assert.equal(parseFloat(h.handle.style.top),h.block.rect.top+12);
   h.block.dataset.manualNode='paragraph';h.block.children=[];
   h.block.rect={left:290,right:963,top:330,bottom:354,width:673,height:24};h.controller.refresh();
   assert.equal(h.handle.dataset.moveKind,'paragraph');assert.equal(plus.hidden,false);
   assert.equal(parseFloat(h.handle.style.left)+24,h.block.rect.left-14);
   assert.equal(parseFloat(plus.style.left)+24,parseFloat(h.handle.style.left)-4);
   assert.equal(plus.style.top,h.handle.style.top);
  }finally{h.restore();}
 }
});
test('page badge hides when its paper margin or 64 pixel width cannot fit the main clip',()=>{
 const main=new Surface();main.rect={left:0,right:390,top:297.1875,bottom:700,width:390,height:402.8125};
 const h=environment({onInsert(){},getScrollContainer:()=>main});try{
  h.block.dataset.manualNode='page';h.block.rect={left:12,right:378,top:280,bottom:800,width:366,height:520};
  const title=new Surface();title.dataset.manualNode='pageTitle';
  title.rect={left:32,right:358,top:305,bottom:347,width:326,height:42};
  h.block.append(title);h.controller.show(h.block.dataset.movePath);
  const plus=h.layer.children.find(child=>child.className.includes('manual-insert-handle'));
  assert.equal(h.handle.hidden,true);assert.equal(plus.hidden,true);
  h.block.rect={...h.block.rect,top:309.1875,bottom:829.1875};title.rect={...title.rect,top:359.1875,bottom:401.1875};h.controller.refresh();
  assert.equal(h.handle.hidden,false);assert.equal(plus.hidden,true);
  main.rect={...main.rect,right:60,width:60};h.controller.refresh();
  assert.equal(h.handle.hidden,true);assert.equal(plus.hidden,true);
 }finally{h.restore();}
});
test('v2 body plus stays in the handle row and hides without room while legacy placement is preserved',()=>{
 const main=new Surface();main.rect={left:100,right:500,top:100,bottom:500,width:400,height:400};
 const h=environment({onInsert(){},getScrollContainer:()=>main});try{
  // The main clip starts at 108. A 24px plus, 4px gap and 24px handle
  // need handle.left >= 136; rail 170 requires only a 4px correction.
  h.block.dataset.manualNode='paragraph';h.block.children=[];h.block.rect={left:170,right:480,top:200,bottom:224,width:310,height:24};h.controller.show(h.block.dataset.movePath);
  const plus=h.layer.children.find(child=>child.className.includes('manual-insert-handle'));
  assert.equal(h.handle.hidden,false);assert.equal(plus.hidden,false);assert.equal(plus.style.top,h.handle.style.top);assert.equal(parseFloat(plus.style.left),parseFloat(h.handle.style.left)-28);
  // Rail 160 would require a 14px correction, beyond the 10px limit.
  // Both paired controls hide instead of leaving a detached handle.
  h.block.rect={...h.block.rect,left:160,width:320};h.controller.refresh();
  assert.equal(h.handle.hidden,true);assert.equal(plus.hidden,true);assert.equal(plus.style.top,h.handle.style.top);assert.equal(parseFloat(plus.style.left)+24,parseFloat(h.handle.style.left)-4);
  delete h.block.dataset.manualNode;h.block.rect={...h.block.rect,left:50,width:430};h.controller.refresh();
  assert.equal(h.handle.dataset.moveKind,'');assert.equal(plus.hidden,false);assert.equal(parseFloat(plus.style.left),0);assert.equal(parseFloat(plus.style.top)+26,parseFloat(h.handle.style.top));
 }finally{h.restore();}
});
test('handle stays centered on the first text line while its visible icon follows canvas scale',()=>{
 for(const scale of [.3,.65,1]){
  const position=handleGeometry({left:100,top:200,lineHeight:24*scale,scale});
  assert.equal(position.top+12,200+12*scale);
  assert.equal(position.left+24,86);
  assert.ok(position.iconHeight>=9&&position.iconHeight<=13);
  assert.ok(position.iconWidth<10);
 }
 const above=handleGeometry({left:12,top:-30,lineHeight:12,scale:.5});
 assert.equal(above.left,0);assert.ok(above.top<0); // no pinned, detached handle at viewport top
});


test('keyboard focus alone does not select or authorize Delete; Enter selects then enters editing',()=>{
 const selected=[],deleted=[],edited=[];
 const h=environment({onSelect:path=>selected.push(path),onDelete:path=>deleted.push(path),onEdit:path=>edited.push(path)});
 try{
  h.controller.show(h.step.dataset.movePath);h.handle.focus();h.doc.emit('focusin',{target:h.handle});
  const key=key=>h.layer.emit('keydown',{target:h.handle,key,preventDefault(){},stopPropagation(){}});
  assert.equal(h.handle.attributes['aria-pressed'],'false');
  key('Delete');assert.deepEqual(deleted,[]);
  key('Enter');assert.deepEqual(selected,[h.step.dataset.movePath]);assert.equal(h.handle.attributes['aria-pressed'],'true');
  key('Delete');assert.deepEqual(deleted,[h.step.dataset.movePath]);
  key('Enter');assert.deepEqual(edited,[h.step.dataset.movePath]);assert.equal(h.handle.attributes['aria-pressed'],'false');
 }finally{h.restore();}
});

test('Escape returns to the selected content, while focus in text clears block selection',()=>{
 const edited=[];const h=environment({onEdit:path=>edited.push(path)});
 try{
  h.controller.select(h.step.dataset.movePath);
  h.layer.emit('keydown',{target:h.handle,key:'Escape',preventDefault(){},stopPropagation(){}});
  assert.deepEqual(edited,[h.step.dataset.movePath]);assert.equal(h.handle.attributes['aria-pressed'],'false');
  h.controller.select(h.step.dataset.movePath);h.doc.emit('focusin',{target:h.step});
  assert.equal(h.handle.attributes['aria-pressed'],'false');
 }finally{h.restore();}
});

test('opt-in handle eligibility hides page and cover controls while preserving legacy defaults',()=>{
 for(const kind of ['page','cover']){
  const selected=[],menus=[];
  const h=environment({onInsert(){},onSelect:path=>selected.push(path),onMenu:path=>menus.push(path),isHandleTarget:element=>!['page','cover'].includes(element.dataset.manualNode)});try{
   h.block.dataset.manualNode=kind;h.block.children=[];
   const plus=h.layer.children.find(child=>child.className.includes('manual-insert-handle'));
   h.controller.show(h.block.dataset.movePath);
   assert.equal(h.handle.hidden,true);assert.equal(plus.hidden,true);
   h.doc.emit('pointermove',{target:h.block,clientX:110,clientY:120,pointerType:'mouse'});
   assert.equal(h.handle.hidden,true);assert.equal(plus.hidden,true);
   h.doc.emit('pointerdown',{target:h.block,pointerType:'touch'});
   assert.equal(h.handle.hidden,true);assert.equal(plus.hidden,true);
   h.doc.emit('focusin',{target:h.block});
   assert.equal(h.handle.hidden,true);assert.equal(plus.hidden,true);
   assert.deepEqual(selected,[]);assert.deepEqual(menus,[]);
  }finally{h.restore();}
 }
});

test('opt-in page and cover exclusion still discovers body and nested step rails after paper hover',()=>{
 for(const kind of ['page','cover']){
  const h=environment({onInsert(){},isHandleTarget:element=>!['page','cover'].includes(element.dataset.manualNode)});try{
   const paper=new Surface();paper.dataset.movePath='/pages/0';paper.dataset.manualNode=kind;
   paper.rect={left:50,right:500,top:80,bottom:400,width:450,height:320};paper.append(h.block);
   h.block.dataset.manualNode='paragraph';h.step.dataset.manualNode='step';
   h.block.rect={left:100,right:500,top:160,bottom:260,width:400,height:100};
   h.step.rect={left:100,right:500,top:200,bottom:240,width:400,height:40};
   h.doc.querySelectorAll=selector=>selector==='[data-move-collection]'?[]:[paper,h.block,h.step];
   const plus=h.layer.children.find(child=>child.className.includes('manual-insert-handle'));
   h.doc.emit('pointermove',{target:paper,clientX:60,clientY:100,pointerType:'mouse'});
   assert.equal(h.handle.hidden,true);assert.equal(plus.hidden,true);
   h.doc.emit('pointermove',{target:paper,clientX:70,clientY:180,pointerType:'mouse'});
   assert.equal(h.handle.hidden,false);assert.equal(plus.hidden,false);assert.equal(h.handle.dataset.moveHandle,h.block.dataset.movePath);
   h.doc.emit('pointermove',{target:paper,clientX:70,clientY:220,pointerType:'mouse'});
   assert.equal(h.handle.hidden,false);assert.equal(plus.hidden,false);assert.equal(h.handle.dataset.moveHandle,h.step.dataset.movePath);
   h.doc.emit('pointermove',{target:paper,clientX:60,clientY:100,pointerType:'mouse'});
   assert.equal(h.handle.hidden,true);assert.equal(plus.hidden,true);
  }finally{h.restore();}
 }
});

test('opt-in root rail aligns an indented step child without changing its row or path',()=>{
 const h=environment({getRailLeft:()=>100});try{
  const child=new Surface();child.dataset.movePath='/pages/0/blocks/0/items/0/description/0';child.dataset.manualNode='paragraph';
  child.rect={left:124,right:500,top:220,bottom:244,width:376,height:24};h.step.append(child);
  h.doc.querySelectorAll=selector=>selector==='[data-move-collection]'?[]:[h.block,h.step,child];
  h.controller.show(child.dataset.movePath);
  assert.equal(h.handle.hidden,false);assert.equal(parseFloat(h.handle.style.left),62);
  assert.equal(parseFloat(h.handle.style.top),220);assert.equal(h.handle.dataset.moveHandle,child.dataset.movePath);
  assert.equal(child.rect.left,124);assert.equal(child.dataset.movePath,'/pages/0/blocks/0/items/0/description/0');
 }finally{h.restore();}
});

test('opt-in root rail discovery keeps the nested step child target in its own vertical slot',()=>{
 const h=environment({getRailLeft:()=>100});try{
  h.block.rect={left:100,right:500,top:100,bottom:340,width:400,height:240};
  h.step.rect={left:124,right:500,top:160,bottom:300,width:376,height:140};
  const child=new Surface();child.dataset.movePath='/pages/0/blocks/0/items/0/description/0';child.dataset.manualNode='paragraph';
  child.rect={left:124,right:500,top:220,bottom:244,width:376,height:24};h.step.append(child);
  h.doc.querySelectorAll=selector=>selector==='[data-move-collection]'?[]:[h.block,h.step,child];
  h.doc.emit('pointermove',{target:h.doc.body,clientX:80,clientY:232,pointerType:'mouse'});
  assert.equal(h.handle.hidden,false);assert.equal(h.handle.dataset.moveHandle,child.dataset.movePath);assert.equal(parseFloat(h.handle.style.left),62);
  h.doc.emit('pointermove',{target:h.block,clientX:80,clientY:232,pointerType:'mouse'});
  assert.equal(h.handle.dataset.moveHandle,child.dataset.movePath);
  h.doc.emit('pointermove',{target:h.doc.body,clientX:80,clientY:180,pointerType:'mouse'});
  assert.equal(h.handle.dataset.moveHandle,h.step.dataset.movePath);
 }finally{h.restore();}
});

test('default rail callback preserves the indented child left offset',()=>{
 const h=environment();try{
  h.step.rect={left:124,right:500,top:220,bottom:244,width:376,height:24};
  h.controller.show(h.step.dataset.movePath);
  assert.equal(h.handle.hidden,false);assert.equal(parseFloat(h.handle.style.left),86);
  assert.equal(parseFloat(h.handle.style.top),220);assert.equal(h.handle.dataset.moveHandle,h.step.dataset.movePath);
 }finally{h.restore();}
});

test('thin divider gutter acquires paired controls using line-center occlusion without stealing neighboring rows',()=>{
 const h=environment({onMenu(){},onInsert(){}});try{
  h.handle.removeAttribute=name=>delete h.handle.attributes[name];
  h.block.dataset.manualNode='divider';h.block.rect={left:100,right:500,top:100,bottom:101,width:400,height:1};
  const page=new Surface(),neighbor=new Surface();page.append(h.block);page.append(neighbor);neighbor.dataset.movePath='/pages/0/blocks/1';neighbor.dataset.manualNode='paragraph';neighbor.rect={left:100,right:500,top:106,bottom:126,width:400,height:20};
  h.doc.querySelectorAll=selector=>selector==='[data-move-collection]'?[]:[h.block,neighbor];
  const samples=[];h.doc.elementFromPoint=(x,y)=>{samples.push(y);return y>=100&&y<=101?h.block:y>=106&&y<=126?neighbor:page;};
  h.doc.emit('pointermove',{target:page,pointerType:'mouse',clientX:80,clientY:96});
  assert.equal(h.handle.hidden,false);assert.equal(h.handle.dataset.moveHandle,h.block.dataset.movePath);
  const add=h.layer.children.find(child=>child.className==='manual-move-handle manual-insert-handle');assert.equal(add.hidden,false);assert.equal(add.dataset.moveInsert,h.block.dataset.movePath);assert.ok(samples.includes(100.5));
  h.doc.emit('pointermove',{target:page,pointerType:'mouse',clientX:80,clientY:110});assert.equal(h.handle.dataset.moveHandle,neighbor.dataset.movePath);
  h.doc.elementFromPoint=()=>new Surface();h.doc.emit('pointermove',{target:page,pointerType:'mouse',clientX:80,clientY:96});assert.equal(h.handle.hidden,true);
 }finally{h.restore();}
});

// Actual controller callbacks with synthetic DOM client metrics, not native UI acceptance.
test('canvas page badge excludes both scrollbar strips and scaled borders while retaining 8px horizontal margin',()=>{
 const main=new Surface();main.rect={left:0,right:390,top:0,bottom:600,width:390,height:600};main.clientAreaWidth=375;main.clientAreaHeight=585;
 const h=environment({onInsert(){},getScrollContainer:()=>main});try{
  h.block.dataset.manualNode='page';h.block.children=[];h.block.rect={left:370,right:760,top:100,bottom:500,width:390,height:400};
  h.controller.show(h.block.dataset.movePath);assert.equal(h.handle.hidden,false);assert.equal(parseFloat(h.handle.style.left)+64,367);
  h.block.rect={...h.block.rect,top:564,bottom:964};h.controller.refresh();assert.equal(h.handle.hidden,true);
  main.clientAreaHeight=600;h.controller.refresh();assert.equal(h.handle.hidden,false);
  main.clientAreaWidth=390;h.controller.refresh();assert.equal(parseFloat(h.handle.style.left)+64,382);
  main.rect={left:20,right:800,top:30,bottom:330,width:780,height:300};main.layoutWidth=390;main.layoutHeight=600;main.clientAreaWidth=375;main.clientAreaHeight=585;main.borderLeft=2;main.borderTop=4;
  h.block.rect={left:760,right:900,top:100,bottom:500,width:140,height:400};h.controller.refresh();assert.equal(h.handle.hidden,false);assert.equal(parseFloat(h.handle.style.left)+64,766);
  main.isConnected=false;h.controller.refresh();assert.equal(h.handle.hidden,true);
 }finally{h.restore();}
});
test('canvas window fallback retains original viewport margin and legacy behavior',()=>{
 const h=environment({onInsert(){}});try{
  h.block.dataset.manualNode='page';h.block.children=[];h.block.rect={left:1260,right:1500,top:100,bottom:500,width:240,height:400};h.controller.show(h.block.dataset.movePath);assert.equal(h.handle.hidden,false);assert.equal(parseFloat(h.handle.style.left)+64,1272);
  delete h.block.dataset.manualNode;h.block.rect={left:50,right:500,top:100,bottom:150,width:450,height:50};h.controller.refresh();const plus=h.layer.children.find(child=>child.className.includes('manual-insert-handle'));assert.equal(plus.hidden,false);assert.equal(parseFloat(plus.style.left),0);
 }finally{h.restore();}
});

// PM NodeView markers and synthetic client metrics through the production refresh.
// These contracts do not claim native rendered pixels or OS pointer acceptance.
function firstLineSurface(kind,top,height=24){
 const node=new Surface();node.dataset.manualNode=kind;
 node.rect={left:124,right:500,top,bottom:top+height,width:376,height};
 return node;
}
test('PM callout, procedure, step, list and quote rails anchor the first visible text row',()=>{
 for(const [kind,textKind] of [['callout','calloutTitle'],['procedure','stepTitle'],['step','stepTitle'],['list','paragraph'],['listItem','paragraph'],['quote','paragraph']]){
  const h=environment({onInsert(){}});try{
   h.block.children=[];h.block.dataset.manualNode=kind;
   h.block.rect={left:100,right:500,top:100,bottom:240,width:400,height:140};
   const slot=new Surface(),first=firstLineSurface(textKind,132),second=firstLineSurface('paragraph',180);
   h.block.append(slot);slot.append(first);slot.append(second);
   h.controller.show(h.block.dataset.movePath);
   const plus=h.layer.children.find(child=>child.className.includes('manual-insert-handle'));
   assert.equal(parseFloat(h.handle.style.top),132,kind);
   assert.equal(h.handle.hidden,false);assert.equal(plus.hidden,false);assert.equal(plus.style.top,h.handle.style.top);
   assert.equal(h.handle.dataset.moveHandle,h.block.dataset.movePath);
   assert.equal(plus.dataset.moveInsert,h.block.dataset.movePath);
  }finally{h.restore();}
 }
});
test('body-only callout skips hidden title, hidden containers and zero-size rows inside its own block',()=>{
 const savedStyle=globalThis.getComputedStyle;
 globalThis.getComputedStyle=node=>({lineHeight:'24px',display:node.style.display||'block',visibility:node.style.visibility||'visible',opacity:'1'});
 const h=environment({onInsert(){}});try{
  h.block.children=[];h.block.dataset.manualNode='callout';
  const title=firstLineSurface('calloutTitle',108),hidden=new Surface(),zero=firstLineSurface('paragraph',120,0),body=firstLineSurface('paragraph',148);
  title.style.display='none';hidden.hidden=true;hidden.append(firstLineSurface('paragraph',124));
  h.block.append(title);h.block.append(hidden);h.block.append(zero);h.block.append(body);
  h.controller.show(h.block.dataset.movePath);assert.equal(parseFloat(h.handle.style.top),148);
  title.style.display='block';title.rect={...title.rect,top:112,bottom:136};
  h.controller.refresh();assert.equal(parseFloat(h.handle.style.top),112); // explicit blank-title editing is visible
  title.style.visibility='hidden';h.controller.refresh();assert.equal(parseFloat(h.handle.style.top),148);
  h.block.children=[];h.controller.refresh();assert.equal(parseFloat(h.handle.style.top),100); // bodyless frame fallback
 }finally{h.restore();if(savedStyle===undefined)delete globalThis.getComputedStyle;else globalThis.getComputedStyle=savedStyle;}
});
test('PM paragraph uses itself while figure/table keep their frame rather than caption/cell text',()=>{
 for(const kind of ['paragraph','figure','table']){
  const h=environment();try{
   h.block.children=[];h.block.dataset.manualNode=kind;
   h.block.append(firstLineSurface(kind==='figure'?'figureCaption':kind==='table'?'tableCell':'paragraph',160));
   h.controller.show(h.block.dataset.movePath);assert.equal(parseFloat(h.handle.style.top),100,kind);
  }finally{h.restore();}
 }
});
test('text anchor never escapes its own block or enters figure/table descendants',()=>{
 const h=environment();try{
  h.block.children=[];h.block.dataset.manualNode='callout';
  const figure=firstLineSurface('figure',105),table=firstLineSurface('table',120),body=firstLineSurface('paragraph',180);
  figure.append(firstLineSurface('paragraph',110));table.append(firstLineSurface('paragraph',130));
  h.block.append(figure);h.block.append(table);h.block.append(body);
  const outside=firstLineSurface('paragraph',40);h.doc.body.append(outside);
  h.controller.show(h.block.dataset.movePath);assert.equal(parseFloat(h.handle.style.top),100);
 }finally{h.restore();}
});
test('PM first-row anchor keeps scaled line centering and paired clip rejection',()=>{
 const savedStyle=globalThis.getComputedStyle;
 globalThis.getComputedStyle=()=>({lineHeight:'24px',display:'block',visibility:'visible',opacity:'1'});
 const main=new Surface();main.rect={left:0,right:600,top:0,bottom:500,width:600,height:500};
 const h=environment({onInsert(){},getScrollContainer:()=>main});try{
  h.block.children=[];h.block.dataset.manualNode='quote';h.block.layoutWidth=800;
  const text=firstLineSurface('paragraph',140,36);h.block.append(text);
  h.controller.show(h.block.dataset.movePath);assert.equal(parseFloat(h.handle.style.top)+12,146);
  const plus=h.layer.children.find(child=>child.className.includes('manual-insert-handle'));
  assert.equal(plus.style.top,h.handle.style.top);assert.equal(parseFloat(plus.style.left)+28,parseFloat(h.handle.style.left));
  text.rect={...text.rect,top:490,bottom:526};h.controller.refresh();assert.equal(h.handle.hidden,true);assert.equal(plus.hidden,true);
 }finally{h.restore();if(savedStyle===undefined)delete globalThis.getComputedStyle;else globalThis.getComputedStyle=savedStyle;}
});

for(const kind of ['todo','codeBlock']){
 test(`PM ${kind} anchors its own text surface before the next paragraph`,()=>{
  for(const standalone of [false,true]){
   const h=environment({onInsert(){}});try{
    h.block.children=[];h.block.dataset.manualNode=standalone?kind:'callout';
    const textBlock=standalone?h.block:firstLineSurface(kind,128,64);
    const text=firstLineSurface('',148,24);text.tagName=kind==='todo'?'P':'CODE';
    if(kind==='todo'){
     const checkbox=new Surface();checkbox.tagName='INPUT';textBlock.append(checkbox);textBlock.append(text);
    }else{
     const pre=firstLineSurface('',136,60);pre.tagName='PRE';pre.append(text);textBlock.append(pre);
    }
    if(!standalone)h.block.append(textBlock);
    h.block.append(firstLineSurface('paragraph',208));
    h.controller.show(h.block.dataset.movePath);
    assert.equal(parseFloat(h.handle.style.top),148,standalone?'own block':'callout first content');
    const plus=h.layer.children.find(child=>child.className.includes('manual-insert-handle'));
    assert.equal(plus.style.top,h.handle.style.top);
   }finally{h.restore();}
  }
 });
}
test('body-only callout stops at first visible figure/table rather than later paragraph',()=>{
 for(const kind of ['figure','table']){
  const h=environment();try{
   h.block.children=[];h.block.dataset.manualNode='callout';
   const title=firstLineSurface('calloutTitle',108);title.hidden=true;
   const media=firstLineSurface(kind,132,60);media.append(firstLineSurface(kind==='figure'?'figureCaption':'tableCell',156));
   h.block.append(title);h.block.append(media);h.block.append(firstLineSurface('paragraph',220));
   h.controller.show(h.block.dataset.movePath);assert.equal(parseFloat(h.handle.style.top),100,kind);
   media.hidden=true;h.controller.refresh();assert.equal(parseFloat(h.handle.style.top),220,`${kind} hidden`);
  }finally{h.restore();}
 }
});
