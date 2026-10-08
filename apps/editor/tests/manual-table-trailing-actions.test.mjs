import test from 'node:test';
import assert from 'node:assert/strict';
import {undo,redo,undoDepth} from '@tiptap/pm/history';
import {createManualState,documentFromState,findManualObject,findManualCoverRole} from '../src/redesign/manual-kernel.mjs';
import {captureManualTableActionTarget} from '../src/redesign/manual-table-actions.mjs';
import {selectManualTableCells} from '../src/redesign/manual-table-selection.mjs';
import {getManualTableTrailingAvailability,describeManualTableTrailingChange,executeManualTableTrailingChange} from '../src/redesign/manual-table-trailing-actions.mjs';
import {getManualTableLayout,withManualTableCellLayout} from '../src/redesign/manual-table-layout.mjs';
import {withManualPaginationMarker} from '../src/redesign/manual-pagination-meta.mjs';

function fixture({empty=false}={}){
 const rows=Array.from({length:3},(_,r)=>Array.from({length:3},(_,c)=>({id:`cell${r}${c}`,content:empty&&r>0&&c>0?[]:[{type:'text',text:`${r}:${c}`,marks:[{type:'strong'},{type:'link',href:'https://example.com/synthetic'}]}],extensions:withManualTableCellLayout({extensions:{vendor:{asset:'synthetic.png',opaque:[r,c]}}},{columnWeight:[2,5,8][c],rowMinHeightPx:40+r*10}).extensions})));
 return {schemaVersion:2,id:'doc',title:'Synthetic',pages:[{id:'page',title:[],blocks:[{id:'before',type:'paragraph',content:[{type:'text',text:'Before'}]},{id:'table',type:'table',label:'Synthetic table',headers:rows[0],rows:rows.slice(1),extensions:{vendor:{keep:true}}},{id:'after',type:'paragraph',content:[{type:'text',text:'After'}]}]},{id:'other',title:[],blocks:[{id:'otherText',type:'paragraph',content:[{type:'text',text:'Other page'}]}]}]};
}
function harness(document=fixture()){
 let state=createManualState({document}),count=0;
 const dispatch=tr=>{count++;state=state.applyTransaction(tr).state;},view={get state(){return state;},dispatch,editable:true,composing:false};
 const options={generation:7};
 return {get state(){return state;},get count(){return count;},dispatch,view,table:()=>findManualObject(state,'table').node,pin:(mode='row',cellId='cell22',tableId='table')=>captureManualTableActionTarget(state,{tableId,cellId,mode,generation:7}),describe:(target,delta,extra={})=>describeManualTableTrailingChange(state,target,delta,{...options,...extra}),run:(target,delta,extra={})=>executeManualTableTrailingChange(view,target,delta,{...options,...extra}),command:command=>command(state,dispatch,view),select:target=>selectManualTableCells(target.cellId,target.cellId,{mode:target.mode,revision:target.revision})(state,dispatch,view)};
}
function selectionEqual(actual,expected){assert.ok(actual.eq(expected));assert.equal(actual.anchorCellId,expected.anchorCellId);assert.equal(actual.headCellId,expected.headCellId);assert.equal(actual.mode,expected.mode);assert.deepEqual(actual.ids,expected.ids);}
function roundtrip(h,before,previous){const after=documentFromState(h.state),changed=h.state.selection;assert.equal(undoDepth(h.state),1);assert.deepEqual(documentFromState(createManualState({document:after})),after);assert.equal(h.command(undo),true);assert.deepEqual(documentFromState(h.state),before);selectionEqual(h.state.selection,previous);assert.equal(h.command(redo),true);assert.deepEqual(documentFromState(h.state),after);selectionEqual(h.state.selection,changed);}

for(const mode of ['row','column'])test(`${mode} trailing multi-add uses fresh empty cells, preserves marks/meta/layout and one dispatch/Undo exact selection`,()=>{
 const h=harness(),target=h.pin(mode),original=h.table(),before=documentFromState(h.state);assert.equal(h.select(target),true);const previous=h.state.selection,count=h.count;
 const preview=h.describe(target,3);assert.deepEqual([preview.enabled,preview.beforeCount,preview.afterCount,preview.addedCount,preview.removedCount,preview.needsConfirmation],[true,3,6,3,0,false]);assert.equal(h.count,count);assert.equal(h.run(target,3),true);assert.equal(h.count,count+1);
 const table=h.table(),ids=new Set();table.forEach((row,_pos,r)=>{assert.equal(row.attrs.header,r===0);row.forEach((cell,_offset,c)=>{assert.ok(!ids.has(cell.attrs.id));ids.add(cell.attrs.id);if(r<3&&c<3)assert.ok(cell.eq(original.child(r).child(c)));else assert.equal(cell.content.size,0);});});
 assert.deepEqual(table.attrs,original.attrs);assert.deepEqual(getManualTableLayout(table).columnWeights,mode==='row'?[2,5,8]:[2,5,8,8,8,8]);assert.deepEqual(getManualTableLayout(table).rowMinHeightsPx,mode==='row'?[40,50,60,60,60,60]:[40,50,60]);
 const after=documentFromState(h.state);assert.deepEqual(after.pages[1],before.pages[1]);assert.deepEqual(after.pages[0].blocks[0],before.pages[0].blocks[0]);assert.deepEqual(after.pages[0].blocks[2],before.pages[0].blocks[2]);roundtrip(h,before,previous);
});
for(const mode of ['row','column'])test(`${mode} trailing empty reduction keeps minimum header/column and exact Undo/Redo selection`,()=>{
 const d=fixture();const table=d.pages[0].blocks[1];for(const [r,row]of [table.headers,...table.rows].entries())for(const [c,cell]of row.entries())if(mode==='row'?r>0:c>0)cell.content=[];
 const h=harness(d),target=h.pin(mode),before=documentFromState(h.state),original=h.table();h.select(target);const previous=h.state.selection,count=h.count,preview=h.describe(target,-2);
 assert.equal(preview.needsConfirmation,false);assert.equal(preview.removesContent,false);assert.equal(preview.removedCount,2);assert.equal(preview.afterCount,1);assert.equal(h.run(target,-2),true);assert.equal(h.count,count+1);
 assert.equal(h.table().firstChild.attrs.header,true);if(mode==='row')assert.ok(h.table().firstChild.eq(original.firstChild));else h.table().forEach((row,_pos,r)=>assert.ok(row.firstChild.eq(original.child(r).firstChild)));roundtrip(h,before,previous);
});
for(const mode of ['row','column'])test(`${mode} trailing content deletion demands preview and explicit confirmation, then one Undo restores all data`,()=>{
 const h=harness(),target=h.pin(mode),before=documentFromState(h.state);h.select(target);const previous=h.state.selection,count=h.count,preview=h.describe(target,-2),unit=mode==='row'?'행':'열';
 assert.equal(preview.enabled,true);assert.equal(preview.removesContent,true);assert.equal(preview.needsConfirmation,true);assert.equal(preview.contentCount,2);assert.equal(preview.previewText,`내용 있는 ${unit} 2개 삭제 • 놓으면 삭제`);
 for(const extra of [{},{confirmedDeletion:false},{confirmedDeletion:'true'}])assert.equal(h.run(target,-2,extra),false);assert.equal(h.count,count);assert.deepEqual(documentFromState(h.state),before);
 assert.equal(h.run(target,-2,{confirmedDeletion:true}),true);assert.equal(h.count,count+1);roundtrip(h,before,previous);
});
test('cancel/Escape, readOnly, composing, disconnected generation, malformed delta and minimum count are no-ops',()=>{
 const h=harness(),target=h.pin(),before=documentFromState(h.state);
 for(const extra of [{cancelled:true},{readOnly:true},{composing:true},{generation:8}])assert.equal(h.run(target,2,extra),false);
 for(const delta of [0,1.5,NaN,Infinity,101,-3,-100])assert.equal(h.run(target,delta,{confirmedDeletion:true}),false);
 h.view.composing=true;assert.equal(h.run(target,1),false);h.view.composing=false;h.view.editable=false;assert.equal(h.run(target,1),false);h.view.editable=true;
 assert.equal(h.count,0);assert.deepEqual(documentFromState(h.state),before);assert.match(h.describe(target,-3).reason,/최소/);assert.match(h.describe(target,101).reason,/100/);
});
test('non-trailing target, replaced document and removed table cannot silently retarget preview',()=>{
 const h=harness();assert.equal(h.run(h.pin('row','cell11'),1),false);assert.equal(h.run(h.pin('column','cell21'),1),false);assert.equal(h.count,0);
 const target=h.pin();h.dispatch(h.state.tr.insertText('x',findManualObject(h.state,'before').pos+1));const count=h.count;assert.equal(h.run(target,2),false);assert.equal(h.count,count);
 const removed=h.pin(),found=findManualObject(h.state,'table');h.dispatch(h.state.tr.delete(found.pos,found.pos+found.node.nodeSize));assert.equal(h.run(removed,-1,{confirmedDeletion:true}),false);
});
test('bound metadata and canonical spans support trailing addition while automatic pagination stays guarded',()=>{
 for(const entryCount of [1,2]){
  const d=fixture();d.cover={id:'cover',title:[],metadata:Array.from({length:entryCount},(_,index)=>({id:`entry${index}`,label:[{type:'text',text:'Label'}],value:[{type:'text',text:'Value'}]})),blocks:[]};const h=harness(d),table=findManualCoverRole(h.state,'cover','metadata').node,target=h.pin('row',table.lastChild.lastChild.attrs.id,table.attrs.id);
  assert.equal(h.describe(target,1).enabled,true);const before=documentFromState(h.state);assert.equal(h.run(target,1),true);assert.equal(h.count,1);const changed=findManualCoverRole(h.state,'cover','metadata').node;assert.equal(changed.attrs.id,table.attrs.id);assert.equal(changed.childCount,2);assert.deepEqual(documentFromState(createManualState({document:documentFromState(h.state)})),documentFromState(h.state));assert.equal(h.command(undo),true);assert.deepEqual(documentFromState(h.state),before);
 }
 const d=fixture();d.pages[0].blocks[1].extensions=withManualPaginationMarker({extensions:d.pages[0].blocks[1].extensions},{kind:'block',rootBlockId:'table',sourceType:'table',repeatedHeader:true}).extensions;
 const h=harness(d),target=h.pin();assert.match(h.describe(target,1).reason,/자동으로 나뉜/);assert.equal(h.run(target,1),false);assert.equal(h.run(target,-1,{confirmedDeletion:true}),false);assert.equal(h.count,0);
});
test('public availability and description never dispatch, and mixed empty/content tail counts content units accurately',()=>{
 const d=fixture(),table=d.pages[0].blocks[1];table.rows[1].forEach(cell=>cell.content=[]);const h=harness(d),target=h.pin(),preview=h.describe(target,-2);
 assert.equal(getManualTableTrailingAvailability(h.state,target,-2,{generation:7}).enabled,true);assert.equal(preview.removedCount,2);assert.equal(preview.contentCount,1);assert.equal(preview.previewText,'내용 있는 행 1개 삭제 • 놓으면 삭제');assert.equal(h.count,0);
});
