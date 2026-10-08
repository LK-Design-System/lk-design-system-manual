import test from 'node:test';
import assert from 'node:assert/strict';
import {createManualState,findManualObject,addManualTableRow,addManualTableColumn,documentFromState} from '../src/redesign/manual-kernel.mjs';
import {setManualTableColumnWidths,setManualTableRowHeight,readManualTableCellLayout,getManualTableLayout} from '../src/redesign/manual-table-layout.mjs';
const cell=id=>({id,content:[],extensions:{vendor:{id}}}),document={schemaVersion:2,id:'doc',title:'',pages:[{id:'page',title:[],blocks:[{id:'table',type:'table',label:'',headers:[cell('h1'),cell('h2')],rows:[[cell('c1'),cell('c2')]]}]}]};
function h(){let state=createManualState({document});const dispatch=tr=>{state=state.applyTransaction(tr).state;};return {get state(){return state;},run:command=>command(state,dispatch),get table(){return findManualObject(state,'table').node;}};}
test('new table rows inherit column weights and start with content-driven height',()=>{
 const a=h();a.run(setManualTableColumnWidths({tableId:'table',columnWeights:[2,5]}));a.run(setManualTableRowHeight({tableId:'table',rowIndex:1,rowMinHeightPx:60}));const original=a.table;a.run(addManualTableRow('table'));assert.deepEqual(getManualTableLayout(a.table).columnWeights,[2,5]);assert.deepEqual(getManualTableLayout(a.table).rowMinHeightsPx,[null,60,null]);a.table.lastChild.forEach((cell,_pos,index)=>{const layout=readManualTableCellLayout(cell.attrs.meta.extensions);assert.equal(layout.columnWeight,[2,5][index]);assert.equal(layout.rowMinHeightPx,undefined);assert.equal(cell.attrs.meta.extensions.vendor,undefined);});assert.ok(a.table.child(0).eq(original.child(0)));assert.ok(a.table.child(1).eq(original.child(1)));
});
test('new table column inherits its adjacent width and each row minimum without vendor metadata',()=>{
 const a=h();a.run(setManualTableColumnWidths({tableId:'table',columnWeights:[2,5]}));a.run(setManualTableRowHeight({tableId:'table',rowIndex:1,rowMinHeightPx:60}));const original=a.table;a.run(addManualTableColumn('table'));assert.deepEqual(getManualTableLayout(a.table).columnWeights,[2,5,5]);assert.deepEqual(getManualTableLayout(a.table).rowMinHeightsPx,[null,60]);a.table.forEach((row,_pos,index)=>{assert.ok(row.child(0).eq(original.child(index).child(0)));assert.ok(row.child(1).eq(original.child(index).child(1)));assert.equal(readManualTableCellLayout(row.lastChild.attrs.meta.extensions).columnWeight,5);assert.equal(row.lastChild.attrs.meta.extensions.vendor,undefined);});assert.deepEqual(getManualTableLayout(findManualObject(createManualState({document:documentFromState(a.state)}),'table').node),getManualTableLayout(a.table));
});
test('unresized tables add no layout metadata when rows and columns are inserted',()=>{
 const a=h();a.run(addManualTableRow('table'));a.run(addManualTableColumn('table'));a.table.forEach(row=>row.forEach(cell=>assert.equal(readManualTableCellLayout(cell.attrs.meta.extensions),null)));assert.equal(getManualTableLayout(a.table).hasColumnWeights,false);
});
