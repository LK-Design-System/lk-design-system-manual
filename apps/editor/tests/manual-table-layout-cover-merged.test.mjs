import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {closeHistory} from '@tiptap/pm/history';
import {createEmptyManualDocument,plainInline} from '../src/redesign/manual-v2.mjs';
import {createManualPageTemplate} from '../src/redesign/manual-page-templates.mjs';
import {createManualState,documentFromState,findManualObject,findManualCoverRole,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {getManualCoverProjection} from '../src/redesign/manual-cover-legacy-projection.mjs';
import {getManualCoverLogicalRows} from '../src/redesign/manual-cover-table-shape.mjs';
import {getManualTableLayout,setManualTableColumnWidths,setManualTableRowHeight} from '../src/redesign/manual-table-layout.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';

function harness(){
 const source=createEmptyManualDocument({title:'Odd metadata'});source.cover=createManualPageTemplate('cover',{title:source.title});source.cover.metadata.pop();source.cover.metadata.forEach((entry,i)=>{entry.value=plainInline(`Value${i+1}`).map(run=>({...run,marks:[{type:'strong'}]}));entry.extensions={vendor:{keep:i}};});source.cover.extensions={vendor:{cover:true}};
 let state=createManualState({document:source});const dispatch=tr=>{state=state.applyTransaction(tr).state;};const table=findManualCoverRole(state,source.cover.id,'metadata');assert.ok(table);assert.equal(table.node.child(1).childCount,2);assert.equal(table.node.child(1).child(1).attrs.colspan,3);
 const valueId=table.node.child(1).child(1).attrs.id;dispatch(state.tr.setSelection(TextSelection.create(state.doc,findManualObject(state,valueId).pos+2)));dispatch(closeHistory(state.tr));
 return {source,valueId,get state(){return state;},get table(){return findManualObject(state,table.node.attrs.id);},get document(){return documentFromState(state);},run(command,view){return command(state,dispatch,view);}};
}
function history(h,before){const after=h.state;assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));}

test('odd cover metadata exposes canonical four logical weights without explicit column layout or virtual caret cells',()=>{
 const h=harness(),before=h.state,table=h.table.node,rows=getManualCoverLogicalRows(table);assert.equal(rows[1].length,4);assert.equal(table.child(1).childCount,2);
 const layout=getManualTableLayout(table);assert.deepEqual(layout.columnWeights,[2,3,2,3]);layout.columnPercentages.forEach((value,index)=>assert.ok(Math.abs(value-[20,30,20,30][index])<1e-9));assert.equal(layout.hasColumnWeights,false);assert.deepEqual(layout.rowMinHeightsPx,[null,null]);assert.equal(h.state,before);
});

test('column resize unmerges only the owned metadata grid and commits all four columns in one Undo/Redo',()=>{
 const h=harness(),before=h.state,id=h.table.node.attrs.id,oldIds=[];h.table.node.descendants(node=>{if(node.attrs.id)oldIds.push(node.attrs.id);});const command=setManualTableColumnWidths({tableId:id,columnWeights:[1,2,3,4],revision:before.doc});assert.equal(command(h.state),true);assert.equal(h.state,before);
 for(const options of [{cancelled:true},{readOnly:true},{revision:createManualState({document:h.document}).doc}])assert.equal(h.run(setManualTableColumnWidths({tableId:id,columnWeights:[1,2,3,4],...options})),false);
 for(const view of [{composing:true},{editable:false}])assert.equal(h.run(command,view),false);assert.equal(h.state,before);
 assert.equal(h.run(command),true);const table=h.table.node;assert.equal(table.child(1).childCount,4);table.forEach(row=>row.forEach(cell=>assert.equal(cell.attrs.colspan,1)));assert.equal(getManualCoverProjection(table.attrs.meta.extensions),null);
 assert.deepEqual(getManualTableLayout(table).columnWeights,[1,2,3,4]);assert.equal(h.state.selection.$from.parent.attrs.id,h.valueId);assert.equal(h.state.selection.$from.parentOffset,before.selection.$from.parentOffset);
 for(const cellId of oldIds)assert.ok(findManualObject(h.state,cellId));const decoded=decodeDocumentFile(encodeDocumentFile({document:h.document,assets:{}}));const reopened=createManualState({document:decoded.document});assert.deepEqual(documentFromState(reopened),decoded.document);assert.ok(findManualObject(reopened,id).node.eq(table));for(const cellId of oldIds)assert.ok(findManualObject(reopened,cellId));history(h,before);assert.equal(h.table.node.child(1).childCount,4);
});

test('row height changes real cells while retaining span3 and scalar cover metadata across save/reopen and one Undo/Redo',()=>{
 const h=harness(),before=h.state,id=h.table.node.attrs.id,old=h.document;assert.equal(h.run(setManualTableRowHeight({tableId:id,rowIndex:1,rowMinHeightPx:56,revision:before.doc})),true);
 assert.equal(h.table.node.child(1).childCount,2);assert.equal(h.table.node.child(1).child(1).attrs.colspan,3);assert.equal(getManualCoverProjection(h.table.node.attrs.meta.extensions).role,'metadata');assert.equal(getManualTableLayout(h.table.node).rowMinHeightsPx[1],56);assert.equal(getManualTableLayout(h.table.node).hasColumnWeights,false);
 assert.deepEqual(h.document.cover.metadata,old.cover.metadata);assert.deepEqual(h.document.pages,old.pages);assert.deepEqual(h.document.cover.extensions.vendor,old.cover.extensions.vendor);
 const reopened=createManualState({document:decodeDocumentFile(encodeDocumentFile({document:h.document,assets:{}})).document}),reloaded=findManualCoverRole(reopened,old.cover.id,'metadata').node;assert.equal(reloaded.child(1).childCount,2);assert.equal(reloaded.child(1).child(1).attrs.colspan,3);assert.equal(getManualTableLayout(reloaded).rowMinHeightsPx[1],56);history(h,before);
});
