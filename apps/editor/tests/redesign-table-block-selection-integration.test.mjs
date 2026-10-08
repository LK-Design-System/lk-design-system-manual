import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {selectManualTableCells,selectManualTableRow,selectManualTableColumn} from '../src/redesign/manual-table-selection.mjs';
import {manualBlockSelectionPlugin,selectCurrentManualBlock,deleteSelectedManualBlocks} from '../src/redesign/manual-block-selection.mjs';

function harness(){
 const d=createEmptyManualDocument(),rows=Array.from({length:3},(_,r)=>Array.from({length:3},(_,c)=>({id:crypto.randomUUID(),content:[{type:'text',text:`${r},${c}`,marks:[{type:'strong'}]}],extensions:{opaque:{r,c}}})));
 const table={id:crypto.randomUUID(),type:'table',label:'Synthetic',headers:rows[0],rows:rows.slice(1),extensions:{opaque:{keep:true}}};d.pages[0].blocks=[table];
 const block=manualBlockSelectionPlugin();let state=createManualState({document:d,plugins:[block]});
 const dispatch=tr=>{state=state.applyTransaction(tr).state;};
 return {rows,table,block,get state(){return state;},get document(){return documentFromState(state);},dispatch,run:(cmd,view)=>cmd(state,dispatch,view)};
}
test('actual kernel cell range clears only cells, keeps table IDs/metadata, and restores one undo/redo',()=>{
 const h=harness();h.run(selectManualTableCells(h.rows[0][1].id,h.rows[1][2].id));const before=h.state;
 assert.equal(h.run(deleteSelectedManualBlocks),false);assert.equal(h.run(selectCurrentManualBlock),false);assert.equal(h.state,before);
 assert.equal(h.run(manualCommands.backspace),true);const after=h.state;
 const table=h.document.pages[0].blocks[0];assert.equal(table.id,h.table.id);assert.deepEqual(table.extensions,h.table.extensions);
 const cells=[table.headers,...table.rows];for(let r=0;r<3;r++)for(let c=0;c<3;c++){
  assert.equal(cells[r][c].id,h.rows[r][c].id);assert.deepEqual(cells[r][c].extensions,h.rows[r][c].extensions);
  assert.deepEqual(cells[r][c].content,r<=1&&c>=1?[]:h.rows[r][c].content);
 }
 assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
 assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));
});
test('block Escape delegates cell selection; actual kernel Escape returns to a cell caret',()=>{
 const h=harness();h.run(selectManualTableRow(h.rows[1][1].id));assert.equal(h.state.selection.ids.length,3);
 const view={get state(){return h.state;},dispatch:h.dispatch,editable:true,composing:false,dom:{isConnected:true},props:{}};
 const event={key:'Escape',prevented:false,preventDefault(){this.prevented=true;}};
 assert.equal(h.block.props.handleKeyDown(view,event),false);assert.equal(event.prevented,false);
 assert.ok(h.state.plugins.some(plugin=>plugin.props.handleKeyDown?.(view,event)));
 assert.equal(event.prevented,true);assert.equal(h.state.selection.$from.parent.type.name,'tableCell');assert.equal(h.state.selection.manualBlockSelection,undefined);
 h.run(selectManualTableColumn(h.rows[0][2].id));assert.equal(h.state.selection.ids.length,3);
});
test('cell range readonly and composition cannot fall through to whole-block deletion',()=>{
 const h=harness();h.run(selectManualTableCells(h.rows[0][0].id,h.rows[2][1].id));const before=h.state;
 for(const view of [{editable:false,props:{}},{editable:true,composing:true,props:{}},{editable:true,props:{manualTableSelectionEnabled:false}}]){
  assert.equal(h.run(manualCommands.deleteForward,view),false);assert.equal(h.run(deleteSelectedManualBlocks,view),false);assert.equal(h.state,before);
 }
});
