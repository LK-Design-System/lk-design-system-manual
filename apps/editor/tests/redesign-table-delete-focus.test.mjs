import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection,NodeSelection} from '@tiptap/pm/state';
import {closeHistory} from '@tiptap/pm/history';
import {createManualState,findManualObject,findManualCoverRole,documentFromState,manualCommands,addManualTableRow,addManualTableColumn,deleteManualTableRow,deleteManualTableColumn} from '../src/redesign/manual-kernel.mjs';
const inline=text=>[{type:'text',text}];
function fixture(metadata=false,rows=2,columns=5){return metadata?{schemaVersion:2,id:'doc',title:'',cover:{id:'cover',title:inline('Title'),metadata:[{id:'entry0',label:inline('Label'),value:inline('Value')}],blocks:[]},pages:[{id:'page',title:[],blocks:[]}]}:{schemaVersion:2,id:'doc',title:'',pages:[{id:'page',title:[],blocks:[{id:'table',type:'table',label:'',headers:Array.from({length:columns},(_,c)=>({id:`c0${c}`,content:inline(`H${c}`)})),rows:Array.from({length:rows-1},(_,r)=>Array.from({length:columns},(_,c)=>({id:`c${r+1}${c}`,content:inline(`${r+1}:${c}`)})))},{id:'divider',type:'divider'}]}]};}
function harness(metadata=false,rows=2,columns=5){
 let state=createManualState({document:fixture(metadata,rows,columns)}),dispatches=0;
 const dispatch=tr=>{dispatches++;state=state.applyTransaction(tr).state;},view={get state(){return state;},editable:true,composing:false,dispatch};
 const table=()=>metadata?findManualCoverRole(state,'cover','metadata')||(()=>{let f;state.doc.descendants((node,pos)=>{if(node.type.name==='table')f={node,pos};});return f;})():findManualObject(state,'table');
 return {get state(){return state;},get count(){return dispatches;},view,dispatch,table,run:cmd=>cmd(state,dispatch,view),select(id){const f=findManualObject(state,id);dispatch(state.tr.setSelection(TextSelection.create(state.doc,f.pos+1)).setStoredMarks([state.schema.marks.strong.create()]));},boundary(){dispatch(closeHistory(state.tr));}};
}
function verifyCaret(h,id){assert.ok(h.state.selection instanceof TextSelection);assert.ok(h.state.selection.empty);assert.equal(h.state.selection.$from.parent.type.name,'tableCell');assert.equal(h.state.selection.$from.parent.attrs.id,id);assert.equal(h.state.selection.$from.parentOffset,0);assert.ok(!(h.state.selection instanceof NodeSelection));}
function verifyUndoRedo(h,before,after){const beforeDTO=documentFromState(before),afterDTO=documentFromState(after);assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.deepEqual(documentFromState(h.state),beforeDTO);assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));assert.deepEqual(documentFromState(h.state),afterDTO);}
for(const metadata of [false,true])for(const mode of ['row','column-one-row','column-two-rows'])test(`${metadata?'metadata normalization':'ordinary table'} ${mode} deletion restores adjacent surviving cell caret and exact Undo/Redo`,()=>{
 const h=harness(metadata,mode==='column-one-row'?1:2);
 if(metadata){assert.equal(h.run(addManualTableColumn(h.table().node.attrs.id)),true);if(mode!=='column-one-row')assert.equal(h.run(addManualTableRow(h.table().node.attrs.id)),true);}
 const original=h.table().node,lastRow=original.child(mode==='column-two-rows'?0:original.childCount-1),selected=lastRow.lastChild;h.select(selected.attrs.id);h.boundary();const before=h.state,count=h.count;
 const expected=mode==='row'?original.child(0).lastChild.attrs.id:lastRow.child(lastRow.childCount-2).attrs.id;
 const cmd=mode==='row'?deleteManualTableRow(original.attrs.id,original.childCount-2):deleteManualTableColumn(original.attrs.id,lastRow.childCount-1);
 assert.equal(h.run(cmd),true);assert.equal(h.count,count+1);verifyCaret(h,expected);assert.equal(h.state.storedMarks?.[0].type.name,'strong');assert.equal(h.table().node.childCount,mode==='row'?1:original.childCount);assert.equal(h.table().node.firstChild.childCount,mode==='row'?original.firstChild.childCount:original.firstChild.childCount-1);const after=h.state;verifyUndoRedo(h,before,after);
});
test('merged metadata direct delete normalizes once and restores surviving cell by ID',()=>{
 const h=harness(true); // One merged metadata value spanning three logical columns.
 const original=h.table().node,value=original.firstChild.lastChild;assert.equal(value.attrs.colspan,3);h.select(value.attrs.id);h.boundary();const before=h.state,count=h.count;
 assert.equal(h.run(deleteManualTableColumn(original.attrs.id,3)),true);assert.equal(h.count,count+1);assert.equal(h.table().node.firstChild.childCount,3);verifyCaret(h,value.attrs.id);verifyUndoRedo(h,before,h.state);
});
test('middle row deletion keeps logical column and chooses next surviving row; another surviving row stays current',()=>{
 for(const selectedRow of [1,0]){const h=harness(false,3,3),table=h.table().node;h.select(table.child(selectedRow).child(2).attrs.id);const expected=table.child(selectedRow===1?2:0).child(2).attrs.id;assert.equal(h.run(deleteManualTableRow('table',0)),true);verifyCaret(h,expected);}
});
test('middle column deletion keeps physical row and chooses right adjacent cell, without moving to next row',()=>{
 for(const selectedColumn of [1,0]){const h=harness(false,3,3),table=h.table().node;h.select(table.child(1).child(selectedColumn).attrs.id);const expected=table.child(1).child(selectedColumn===1?2:0).attrs.id;assert.equal(h.run(deleteManualTableColumn('table',1)),true);verifyCaret(h,expected);}
});
test('minimum row/column, invalid indices, readonly and IME avoid dispatch and selection changes',()=>{
 const h=harness(false,1,1);h.select('c00');const before=h.state,count=h.count;
 for(const cmd of [deleteManualTableRow('table',0),deleteManualTableColumn('table',0),deleteManualTableRow('table',-1),deleteManualTableColumn('table',2)])assert.equal(h.run(cmd),false);
 assert.equal(h.state,before);assert.equal(h.count,count);
 for(const blocked of ['composing','readonly']){const x=harness(false,2,3);x.select('c12');if(blocked==='composing')x.view.composing=true;else x.view.editable=false;const s=x.state,c=x.count;assert.equal(x.run(deleteManualTableRow('table',0)),false);assert.equal(x.run(deleteManualTableColumn('table',2)),false);assert.equal(x.state,s);assert.equal(x.count,c);}
});

test('ordinary runtime colspan deletion uses physical cell index and preserves surviving caret without RangeError',()=>{
 const h=harness(false,2,2);for(const id of ['c00','c10']){const f=findManualObject(h.state,id);h.dispatch(h.state.tr.setNodeMarkup(f.pos,null,{...f.node.attrs,colspan:2}));}h.state.doc.check();h.select('c01');h.boundary();const before=h.state,count=h.count;
 assert.equal(h.run(deleteManualTableColumn('table',0)),true);assert.equal(h.count,count+1);verifyCaret(h,'c01');verifyUndoRedo(h,before,h.state);
});
test('ordinary runtime colspan row deletion resolves logical column to surviving spanning cell',()=>{
 const h=harness(false,2,3); // Source logical column1 sits inside surviving header span2.
 const f=findManualObject(h.state,'c00'),extra=findManualObject(h.state,'c01');h.dispatch(h.state.tr.delete(extra.pos,extra.pos+extra.node.nodeSize).setNodeMarkup(f.pos,null,{...f.node.attrs,colspan:2}));h.state.doc.check();h.select('c11');h.boundary();const before=h.state,count=h.count;
 assert.equal(h.run(deleteManualTableRow('table',0)),true);assert.equal(h.count,count+1);verifyCaret(h,'c00');const after=h.state;assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));
});
