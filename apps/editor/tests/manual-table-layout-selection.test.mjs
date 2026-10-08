import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualPageTemplate} from '../src/redesign/manual-page-templates.mjs';
import {createManualState,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {selectManualTableCells} from '../src/redesign/manual-table-selection.mjs';
import {setManualTableColumnWidths,setManualTableRowHeight} from '../src/redesign/manual-table-layout.mjs';

for(const operation of ['column','row'])test(`${operation} resize preserves custom table cell selection membership and stored marks through Undo/Redo`,()=>{
 const d=createEmptyManualDocument(),table=createManualPageTemplate('table').blocks[0];d.pages[0].blocks=[table];let state=createManualState({document:d});const dispatch=tr=>{state=state.applyTransaction(tr).state;};
 assert.equal(selectManualTableCells(table.rows[0][0].id,table.rows[1][1].id)(state,dispatch),true);dispatch(state.tr.setStoredMarks([state.schema.marks.emphasis.create()]));const before=state,selected=state.selection.toJSON();
 const command=operation==='column'?setManualTableColumnWidths({tableId:table.id,columnWeights:[2,1],revision:state.doc}):setManualTableRowHeight({tableId:table.id,rowIndex:1,rowMinHeightPx:40,revision:state.doc});
 assert.equal(command(state,dispatch),true);const after=state;assert.deepEqual(state.selection.toJSON(),selected);assert.deepEqual(state.storedMarks,before.storedMarks);
 assert.equal(manualCommands.undo(state,dispatch),true);assert.ok(state.doc.eq(before.doc));assert.deepEqual(state.selection.toJSON(),selected);
 assert.equal(manualCommands.redo(state,dispatch),true);assert.ok(state.doc.eq(after.doc));assert.deepEqual(state.selection.toJSON(),selected);
});
