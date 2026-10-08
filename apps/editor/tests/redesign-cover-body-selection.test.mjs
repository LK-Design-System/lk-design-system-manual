import test from 'node:test';
import assert from 'node:assert/strict';
import {Schema} from '@tiptap/pm/model';
import {EditorState} from '@tiptap/pm/state';
import {history,undo,redo} from '@tiptap/pm/history';
import {selectManualBlocks,selectManualBlockIds,extendManualBlockSelection,deleteSelectedManualBlocks,moveSelectedManualBlocks} from '../src/redesign/manual-block-selection.mjs';

// Test the transparent-container selection contract independently of the cover codec.
const attrs={id:{default:null},meta:{default:{}}};
const schema=new Schema({nodes:{
 doc:{content:'cover page+'},cover:{attrs,content:'coverTitle coverSectionFrame'},
 coverTitle:{content:'text*'},coverSectionFrame:{attrs,content:'heading* coverBody'},coverBody:{attrs,content:'block*',group:'block'},
 page:{attrs,content:'pageTitle block*'},pageTitle:{content:'text*'},
 heading:{attrs,content:'text*',group:'block'},paragraph:{attrs,content:'text*',group:'block'},text:{group:'inline'}
},marks:{strong:{}}});
function fixture(){
 const text=(type,id,value)=>schema.nodes[type].create({id},schema.text(value,[schema.marks.strong.create()]));
 const doc=schema.nodes.doc.create(null,[schema.nodes.cover.create({id:'cover'},[
  schema.nodes.coverTitle.create(null,schema.text('Required cover title')),
  schema.nodes.coverSectionFrame.create({id:'frame-only'},[text('heading','section','준비사항'),schema.nodes.coverBody.create({id:'layout-only'},[text('paragraph','last-cover','cover body')])])
 ]),schema.nodes.page.create({id:'page'},[schema.nodes.pageTitle.create(null,schema.text('Required page title')),text('paragraph','first-page','page body')])]);
 let state=EditorState.create({schema,doc,plugins:[history()]});
 return {original:doc,get state(){return state;},run:command=>command(state,tr=>{state=state.apply(tr);})};
}
test('cover body is transparent across forward/reverse ranges, preserving titles, marks and one undo/redo',()=>{
 for(const reverse of [false,true]){
  const h=fixture();assert.equal(h.run(selectManualBlocks(...(reverse?['first-page','section']:['section','first-page']))),true);
  assert.deepEqual(h.state.selection.ids,['section','last-cover','first-page']);assert.equal(h.state.selection.ranges.length,3);
  assert.ok(h.state.selection.items.every(item=>item.node.firstChild.marks[0].type.name==='strong'));
  assert.equal(h.run(deleteSelectedManualBlocks),true);const deleted=h.state.doc;
  assert.equal(deleted.firstChild.child(0).textContent,'Required cover title');assert.equal(deleted.child(1).child(0).textContent,'Required page title');
  assert.equal(h.run(undo),true);assert.ok(h.state.doc.eq(h.original));assert.equal(h.run(redo),true);assert.ok(h.state.doc.eq(deleted));
 }
});
test('ShiftArrow crosses cover body/page boundary both ways; layout container is never selectable',()=>{
 const h=fixture();assert.equal(h.run(selectManualBlocks('last-cover')),true);assert.equal(h.run(extendManualBlockSelection(1)),true);
 assert.deepEqual(h.state.selection.ids,['last-cover','first-page']);
 assert.equal(h.run(selectManualBlocks('first-page')),true);assert.equal(h.run(extendManualBlockSelection(-1)),true);
 assert.deepEqual(h.state.selection.ids,['last-cover','first-page']);
 const selection=h.state.selection;for(const id of ['layout-only','frame-only']){assert.equal(h.run(selectManualBlockIds([id])),false);assert.equal(h.state.selection,selection);}
});
test('cover ID absolute move targets the transparent body at its actual sibling index',()=>{
 const h=fixture();h.run(selectManualBlocks('first-page'));
 assert.equal(h.run(moveSelectedManualBlocks({parentId:'cover',index:1})),true);
 const frame=h.state.doc.firstChild.child(1),body=frame.lastChild;assert.equal(frame.firstChild.attrs.id,'section');assert.deepEqual(Array.from({length:body.childCount},(_,i)=>body.child(i).attrs.id),['last-cover','first-page']);
 assert.equal(body.child(1).firstChild.marks[0].type.name,'strong');assert.deepEqual(h.state.selection.ids,['first-page']);
 const moved=h.state.doc;assert.equal(h.run(undo),true);assert.ok(h.state.doc.eq(h.original));assert.equal(h.run(redo),true);assert.ok(h.state.doc.eq(moved));
});
