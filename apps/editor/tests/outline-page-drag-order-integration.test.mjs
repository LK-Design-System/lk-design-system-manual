import test from 'node:test';import assert from 'node:assert/strict';
import {installOutlinePageDrag,getOutlinePageDropTarget} from '../src/redesign/outline-page-drag.mjs';
import {createManualState,documentFromState,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {getManualPageGroups,moveManualPageGroup} from '../src/redesign/manual-page-groups.mjs';
import {createManualPageTemplate} from '../src/redesign/manual-page-templates.mjs';
import {withManualPageOrder} from '../src/redesign/manual-page-order.mjs';
import {withManualPaginationMarker} from '../src/redesign/manual-pagination-meta.mjs';
import {selectManualTableCells} from '../src/redesign/manual-table-selection.mjs';
function surface(){const listeners=new Map();return {addEventListener(k,f){if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(f);},removeEventListener(k,f){listeners.get(k)?.delete(f);},emit(k,extra={}){const e={type:k,button:0,pointerId:1,pointerType:'mouse',isPrimary:true,clientX:90,clientY:30,target:null,preventDefault(){},stopPropagation(){},...extra};for(const f of [...listeners.get(k)||[]])f(e);}};}
function harness({ids=['a','b'],cellSelection=false,document,top=10,bounds={left:0,top:0,right:190,bottom:500},fixedIds=[]}={}){
 const table=createManualPageTemplate('table').blocks[0];let state=createManualState({document:document??{schemaVersion:2,id:'doc',title:'synthetic',pages:ids.map((id,i)=>({id,title:[],extensions:{'qa:opaque':{owner:id}},blocks:i===0?[table]:[]}))}}),count=0,enabled=true;
 const dispatch=tr=>{count++;state=state.applyTransaction(tr).state;};if(cellSelection)selectManualTableCells(table.rows[0][0].id,table.rows[1][1].id)(state,dispatch);count=0;
 const before=state,doc=surface(),win=surface(),frames=new Map();let seq=0;win.requestAnimationFrame=fn=>{frames.set(++seq,fn);return seq;};win.cancelAnimationFrame=id=>frames.delete(id);doc.defaultView=win;
 const handles=ids.map(id=>({pageId:id,dataset:{outlinePageHandle:getManualPageGroups(state.doc).find(group=>group.pageIds.includes(id))?.id??id},closest(){return this;},setPointerCapture(){},releasePointerCapture(){}}));
 const nav=Object.assign(surface(),{ownerDocument:doc,contains:el=>handles.includes(el),scrollTop:0,scrollHeight:500,clientHeight:500,getBoundingClientRect:()=>bounds});const moves=[];
 const controller=installOutlinePageDrag({container:nav,surface:win,activationMode:'row',canStart:()=>enabled,getRevision:()=>state.doc,getGroups:()=>getManualPageGroups(state.doc).map((p,i)=>({...p,fixed:fixedIds.includes(p.id),rect:{top:top+Math.min(...p.pageIds.map(id=>ids.indexOf(id)).filter(index=>index>=0))*46,bottom:top+40+Math.max(...p.pageIds.map(id=>ids.indexOf(id)).filter(index=>index>=0))*46}})),onMove:payload=>{moves.push(moveManualPageGroup(payload)(state,dispatch,{editable:enabled,composing:false}));}});
 return {controller,nav,doc,handles,before,get state(){return state},get count(){return count},moves,disable(){enabled=false;},drag(id,y){nav.emit('pointerdown',{target:handles.find(h=>h.pageId===id),clientY:top+ids.indexOf(id)*46+20});doc.emit('pointermove',{clientY:y});doc.emit('pointerup',{clientY:y});},undo(){return manualCommands.undo(state,dispatch)},redo(){return manualCommands.redo(state,dispatch)}};
}
for(const cells of [false,true])for(const direction of ['down','up'])test(`actual two-page row drag ${direction} preserves ${cells?'cell range':'caret'} and commits once`,()=>{
 const h=harness({cellSelection:cells}),selection=h.state.selection.toJSON();h.drag(direction==='down'?'a':'b',direction==='down'?90:20);assert.deepEqual(h.moves,[true]);assert.equal(h.count,1);assert.deepEqual(documentFromState(h.state).pages, [...documentFromState(h.before).pages].reverse());assert.deepEqual(h.state.storedMarks,h.before.storedMarks);if(cells){assert.deepEqual(h.state.selection.ids,h.before.selection.ids);assert.equal(h.state.selection.anchorId,h.before.selection.anchorId);assert.equal(h.state.selection.headId,h.before.selection.headId);}else{assert.equal(h.state.selection.$from.node(1).attrs.id,h.before.selection.$from.node(1).attrs.id);assert.equal(h.state.selection.$from.parentOffset,h.before.selection.$from.parentOffset);}const moved=h.state;assert.equal(h.undo(),true);assert.ok(h.state.doc.eq(h.before.doc));assert.equal(h.redo(),true);assert.ok(h.state.doc.eq(moved.doc));h.controller.dispose();
});
test('actual last-page bottom gap and first-page top gap move a four-page root',()=>{for(const [id,y,order] of [['a',210,['b','c','d','a']],['d',2,['d','a','b','c']]]){const h=harness({ids:['a','b','c','d']});h.drag(id,y);assert.deepEqual(documentFromState(h.state).pages.map(p=>p.id),order);assert.deepEqual(h.moves,[true]);h.controller.dispose();}});
test('readonly transition cancels the actual outline gesture without a transaction',()=>{const h=harness();h.nav.emit('pointerdown',{target:h.handles[0]});h.disable();h.doc.emit('pointermove',{clientY:90});h.doc.emit('pointerup',{clientY:90});assert.equal(h.count,0);assert.deepEqual(h.moves,[]);assert.equal(h.state,h.before);h.controller.dispose();});

test('both halves of an immediate neighbor are symmetric swap targets',()=>{for(const [id,ys] of [['a',[58,74,90]],['b',[12,30,48]]])for(const y of ys){const h=harness();h.drag(id,y);assert.deepEqual(h.moves,[true],`${id} release ${y}`);assert.deepEqual(documentFromState(h.state).pages.map(p=>p.id),['b','a']);h.controller.dispose();}});
test('distant rows, source row, covers and gaps preserve before/after target rules',()=>{const groups=['a','b','c','d'].map((id,i)=>({id,rect:{top:10+i*46,bottom:50+i*46}})),bounds={left:0,top:0,right:190,bottom:500},drop=(sourceId,y,items=groups)=>getOutlinePageDropTarget({sourceId,groups:items,bounds,point:{x:90,y}});assert.equal(drop('a',30),null);assert.equal(drop('a',110).targetId,'c');assert.equal(drop('a',110).edge,'before');assert.equal(drop('d',40).targetId,'b');assert.equal(drop('d',40).edge,'before');assert.equal(drop('a',54),null);const covered=[{id:'cover',kind:'cover',rect:{top:10,bottom:50}},{id:'a',rect:{top:56,bottom:96}}];assert.equal(drop('cover',90,covered)?.edge,'after');assert.equal(drop('cover',90,[{...covered[0],fixed:true},covered[1]]),null);assert.equal(drop('a',48,covered)?.edge,'before');assert.equal(drop('a',12,covered).edge,'before');});

function coverFixture(){
 const paragraph=(id,text)=>({id,type:'paragraph',content:[{type:'text',text}],extensions:{vendor:{keep:id}}});
 return {schemaVersion:2,id:'cover-drag-doc',title:'synthetic',cover:{id:'cover',title:[{type:'text',text:'Cover'}],metadata:[],blocks:[paragraph('cover-body','Cover content')],extensions:{vendor:{keep:'cover'}}},pages:[
  {id:'cover-tail',title:[],blocks:[paragraph('tail-body','Continued cover')],...withManualPaginationMarker({extensions:{vendor:{keep:'tail'}}},{kind:'page',rootPageId:'cover'})},
  {id:'body',title:[],blocks:[paragraph('body-content','Second logical page')],extensions:{vendor:{keep:'body'}}}
 ]};
}
for(const [label,top,bounds,ys] of [
 ['both cover row halves',170,{left:0,top:114,right:190,bottom:864},[180,190,200,209]],
 ['cover row clipped by the viewport top',170,{left:0,top:190,right:190,bottom:864},[191,209]]
])test(`second logical page moves before ${label}, preserving the entire cover family and UndoRedo`,()=>{
 for(const y of ys){
  const h=harness({ids:['cover','body'],document:coverFixture(),top,bounds}),beforeNodes=[];
  h.before.doc.forEach(node=>beforeNodes.push(node));h.drag('body',y);
  assert.deepEqual(h.moves,[true],`release ${y}`);assert.equal(h.count,1);
  const nodes=[];h.state.doc.forEach(node=>nodes.push(node));
  assert.deepEqual(nodes.map(node=>node.attrs.id),['body','cover','cover-tail']);
  for(const node of beforeNodes)assert.ok(nodes.find(next=>next.attrs.id===node.attrs.id).eq(node),`preserved ${node.attrs.id}`);
  assert.deepEqual(getManualPageGroups(h.state.doc),[{id:'body',kind:'page',pageIds:['body']},{id:'cover',kind:'cover',pageIds:['cover','cover-tail']}]);
  assert.deepEqual(documentFromState(h.state).cover,documentFromState(h.before).cover);
  const moved=h.state;assert.equal(h.undo(),true);assert.ok(h.state.doc.eq(h.before.doc));assert.ok(h.state.selection.eq(h.before.selection));
  assert.equal(h.redo(),true);assert.ok(h.state.doc.eq(moved.doc));assert.ok(h.state.selection.eq(moved.selection));h.controller.dispose();
 }
});
test('explicitly fixed cover family cannot start a pointer drag while ordinary pages may target it',()=>{
 const h=harness({ids:['cover','body'],document:coverFixture(),fixedIds:['cover']});h.drag('cover',90);
 assert.deepEqual(h.moves,[]);assert.equal(h.count,0);assert.equal(h.state,h.before);h.controller.dispose();
});

for(const handle of ['cover','cover-tail'])test(`cover in second position moves upward from ${handle} row as one entire family`,()=>{
 const document=withManualPageOrder(coverFixture(),['body','cover','cover-tail']);
 for(const y of [180,190,200,209]){
  const h=harness({ids:['body','cover','cover-tail'],document,top:170,bounds:{left:0,top:114,right:190,bottom:864}}),beforeNodes=[];
  h.before.doc.forEach(node=>beforeNodes.push(node));h.drag(handle,y);assert.deepEqual(h.moves,[true],`${handle} release ${y}`);assert.equal(h.count,1);
  const nodes=[];h.state.doc.forEach(node=>nodes.push(node));assert.deepEqual(nodes.map(node=>node.attrs.id),['cover','cover-tail','body']);
  for(const node of beforeNodes)assert.ok(nodes.find(next=>next.attrs.id===node.attrs.id).eq(node));
  assert.deepEqual(documentFromState(h.state).cover,documentFromState(h.before).cover);
  const moved=h.state;assert.equal(h.undo(),true);assert.ok(h.state.doc.eq(h.before.doc));assert.ok(h.state.selection.eq(h.before.selection));
  assert.equal(h.redo(),true);assert.ok(h.state.doc.eq(moved.doc));assert.ok(h.state.selection.eq(moved.selection));h.controller.dispose();
 }
});
