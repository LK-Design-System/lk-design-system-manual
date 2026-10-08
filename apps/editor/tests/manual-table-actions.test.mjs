import test from 'node:test';
import assert from 'node:assert/strict';
import {undo,redo,undoDepth} from '@tiptap/pm/history';
import {Fragment} from '@tiptap/pm/model';
import {createManualState,findManualObject,findManualCoverRole,documentFromState} from '../src/redesign/manual-kernel.mjs';
import {captureManualTableActionTarget,getManualTableActionAvailability,executeManualTableAction} from '../src/redesign/manual-table-actions.mjs';
import {getManualTableActionMenuItems} from '../src/redesign/manual-table-action-menu.mjs';
import {withManualTableCellLayout,getManualTableLayout} from '../src/redesign/manual-table-layout.mjs';
import {withManualPaginationMarker} from '../src/redesign/manual-pagination-meta.mjs';
import {selectManualTableCells} from '../src/redesign/manual-table-selection.mjs';

const cell=(r,c)=>({id:`cell${r}${c}`,content:[{type:'text',text:`${r},${c}`,marks:[{type:'strong'},{type:'link',href:'https://example.com/asset'}]}],extensions:withManualTableCellLayout({extensions:{vendor:{asset:'synthetic.png',opaque:[r,c]}}},{columnWeight:[2,5,7][c],rowMinHeightPx:40+r*10}).extensions});
function fixture(rowCount=3,colCount=3){const rows=Array.from({length:rowCount},(_,r)=>Array.from({length:colCount},(_,c)=>cell(r,c)));return {schemaVersion:2,id:'document',title:'Synthetic',pages:[{id:'page',title:[],blocks:[{id:'before',type:'paragraph',content:[{type:'text',text:'Keep before'}]},{id:'table',type:'table',label:'Table',headers:rows[0],rows:rows.slice(1),extensions:{vendor:{opaque:true}}},{id:'after',type:'paragraph',content:[{type:'text',text:'Keep after'}]}]},{id:'otherPage',title:[],blocks:[{id:'other',type:'paragraph',content:[{type:'text',text:'Keep other page'}]}]}]};}
function harness(document=fixture()){
 let state=createManualState({document}),count=0;
 const dispatch=tr=>{count++;state=state.applyTransaction(tr).state;};
 const view={get state(){return state;},dispatch,editable:true,composing:false};
 return {get state(){return state;},get count(){return count;},view,dispatch,run:command=>command(state,dispatch,view),table:()=>findManualObject(state,'table').node,pin:(mode='row',cellId='cell11',tableId='table')=>captureManualTableActionTarget(state,{tableId,cellId,mode,generation:7}),available:(target,action,options={})=>getManualTableActionAvailability(state,target,action,{generation:7,...options}),execute:(target,action,options={})=>executeManualTableAction(target,action,{generation:7,...options})(state,dispatch,view)};
}
const cells=table=>{const result=[];table.descendants(node=>{if(node.type.name==='tableCell')result.push(node);});return result;};
function unchangedOutside(h,before){const after=documentFromState(h.state);assert.deepEqual(after.pages[1],before.pages[1]);assert.deepEqual(after.pages[0].blocks[0],before.pages[0].blocks[0]);assert.deepEqual(after.pages[0].blocks[2],before.pages[0].blocks[2]);}

test('selected range undo restores row duplicate and column insertion selection exactly, then redo restores changed selection',()=>{
 for(const [mode,action]of [['row','duplicate'],['column','insert-before']]){
  const h=harness(),target=h.pin(mode);
  assert.equal(h.run(selectManualTableCells(target.cellId,target.cellId,{mode:target.mode,revision:target.revision})),true);
  const previous=h.state.selection,before=documentFromState(h.state),assertSelection=expected=>{
   assert.ok(h.state.selection.eq(expected));assert.equal(h.state.selection.anchorCellId,expected.anchorCellId);assert.equal(h.state.selection.headCellId,expected.headCellId);assert.equal(h.state.selection.mode,expected.mode);assert.deepEqual(h.state.selection.ids,expected.ids);
  };
  assert.equal(h.execute(target,action),true);const changed=h.state.selection,after=documentFromState(h.state);
  assert.equal(changed.mode,mode);assert.notDeepEqual(changed.ids,previous.ids);assert.equal(undoDepth(h.state),1);
  assert.equal(h.run(undo),true);assert.deepEqual(documentFromState(h.state),before);assertSelection(previous);
  assert.equal(h.run(redo),true);assert.deepEqual(documentFromState(h.state),after);assertSelection(changed);
 }
});
test('selected range undo restores row and column clear selection exactly, then redo preserves exact changed selection',()=>{
 for(const mode of ['row','column']){
  const h=harness(),target=h.pin(mode);
  assert.equal(h.run(selectManualTableCells(target.cellId,target.cellId,{mode:target.mode,revision:target.revision})),true);
  const previous=h.state.selection,before=documentFromState(h.state),assertSelection=expected=>{
   assert.ok(h.state.selection.eq(expected));assert.equal(h.state.selection.anchorCellId,expected.anchorCellId);assert.equal(h.state.selection.headCellId,expected.headCellId);assert.equal(h.state.selection.mode,expected.mode);assert.deepEqual(h.state.selection.ids,expected.ids);
  };
  assert.equal(h.execute(target,'clear'),true);const changed=h.state.selection,after=documentFromState(h.state);
  assert.equal(changed.mode,mode);assert.deepEqual(changed.ids,previous.ids);assert.equal(undoDepth(h.state),1);
  assert.equal(h.run(undo),true);assert.deepEqual(documentFromState(h.state),before);assertSelection(previous);
  assert.equal(h.run(redo),true);assert.deepEqual(documentFromState(h.state),after);assertSelection(changed);
 }
});

test('capture uses header-inclusive coordinates and exact ID ownership; selection changes alone keep revision',()=>{
 const h=harness(),pin=h.pin('row','cell01');assert.equal(pin.rowIndex,0);assert.equal(pin.columnIndex,1);assert.equal(pin.columnSpan,1);assert.ok(Object.isFrozen(pin));
 assert.equal(h.pin('row','other'),null);assert.equal(h.pin('column','cell01','after'),null);
 assert.equal(captureManualTableActionTarget(h.state,{tableId:'table',cellId:'cell01',mode:'rectangle'}),null);
 h.dispatch(h.state.tr.setStoredMarks(null));assert.equal(h.available(pin,'duplicate').enabled,true);
});
test('all stale, generation, readOnly, composing, removed and forged indices guards avoid dispatch',()=>{
 const h=harness(),pin=h.pin();
 for(const options of [{generation:8},{readOnly:true}])assert.equal(h.execute(pin,'delete',options),false);
 h.view.composing=true;assert.equal(h.execute(pin,'clear'),false);h.view.composing=false;h.view.editable=false;assert.equal(h.execute(pin,'delete'),false);h.view.editable=true;
 assert.equal(h.execute({...pin,rowIndex:0},'delete'),false);assert.equal(h.execute({...pin,columnSpan:2},'delete'),false);assert.equal(h.count,0);
 h.dispatch(h.state.tr.insertText('x',findManualObject(h.state,'before').pos+1));const count=h.count;assert.equal(h.execute(pin,'delete'),false);assert.match(h.available(pin,'clear').reason,/변경/);assert.equal(h.count,count);
 const removed=h.pin();const table=findManualObject(h.state,'table');h.dispatch(h.state.tr.delete(table.pos,table.pos+table.node.nodeSize));assert.equal(h.execute(removed,'delete'),false);
});
for(const action of ['insert-before','insert-after'])test(`${action} uses physical row zero, fresh empty IDs, inherited width/height, single Undo/Redo`,()=>{
 const h=harness(),before=documentFromState(h.state),original=h.table(),pin=h.pin('row','cell01');assert.equal(h.execute(pin,action),true);const table=h.table(),index=action==='insert-before'?0:1,newRow=table.child(index);
 assert.equal(table.childCount,4);assert.equal(newRow.textContent,'');assert.deepEqual(getManualTableLayout(table).columnWeights,[2,5,7]);assert.deepEqual(getManualTableLayout(table).rowMinHeightsPx,[40,40,50,60]);
 const oldIds=new Set(cells(original).map(cell=>cell.attrs.id));newRow.forEach(cell=>{assert.ok(!oldIds.has(cell.attrs.id));assert.equal(cell.attrs.meta.extensions.vendor,undefined);});
 table.forEach((row,_pos,index)=>assert.equal(row.attrs.header,index===0));assert.equal(table.child(action==='insert-before'?1:0).child(1).attrs.id,'cell01');unchangedOutside(h,before);assert.equal(h.count,1);assert.equal(undoDepth(h.state),1);
 const edited=documentFromState(h.state);h.run(undo);assert.deepEqual(documentFromState(h.state),before);h.run(redo);assert.deepEqual(documentFromState(h.state),edited);
});
test('duplicate row keeps inline marks, assets, opaque metadata and row heights with fresh cell IDs',()=>{
 const h=harness(),before=documentFromState(h.state),source=h.table().child(1);h.execute(h.pin(),'duplicate');const duplicate=h.table().child(2);
 source.forEach((cell,_pos,index)=>{const copy=duplicate.child(index);assert.notEqual(copy.attrs.id,cell.attrs.id);assert.ok(copy.content.eq(cell.content));assert.deepEqual(copy.attrs.meta,cell.attrs.meta);});
 assert.deepEqual(getManualTableLayout(h.table()).rowMinHeightsPx,[40,50,50,60]);assert.deepEqual(h.table().attrs.meta,{label:'Table',extensions:{vendor:{opaque:true}}});unchangedOutside(h,before);h.run(undo);assert.deepEqual(documentFromState(h.state),before);
});
for(const action of ['insert-before','insert-after','duplicate'])test(`${action} column uses logical index and preserves other columns and layout`,()=>{
 const h=harness(),before=documentFromState(h.state),source=h.table();h.execute(h.pin('column'),action);const table=h.table(),index=action==='insert-before'?1:2;
 assert.deepEqual(getManualTableLayout(table).columnWeights,[2,5,5,7]);assert.deepEqual(getManualTableLayout(table).rowMinHeightsPx,[40,50,60]);
 table.forEach((row,_pos,r)=>{assert.ok(row.firstChild.eq(source.child(r).firstChild));assert.ok(row.lastChild.eq(source.child(r).lastChild));const copy=row.child(index),old=source.child(r).child(1);assert.notEqual(copy.attrs.id,old.attrs.id);if(action==='duplicate'){assert.ok(copy.content.eq(old.content));assert.deepEqual(copy.attrs.meta,old.attrs.meta);}else assert.equal(copy.content.size,0);});
 unchangedOutside(h,before);assert.equal(undoDepth(h.state),1);h.run(undo);assert.deepEqual(documentFromState(h.state),before);
});
test('delete header row promotes next physical row and delete column removes only chosen logical column',()=>{
 const h=harness(),before=documentFromState(h.state);h.execute(h.pin('row','cell01'),'delete');assert.equal(h.table().firstChild.firstChild.attrs.id,'cell10');assert.equal(h.table().firstChild.attrs.header,true);assert.equal(h.table().child(1).attrs.header,false);assert.deepEqual(getManualTableLayout(h.table()).columnWeights,[2,5,7]);assert.deepEqual(getManualTableLayout(h.table()).rowMinHeightsPx,[50,60]);
 h.run(undo);assert.deepEqual(documentFromState(h.state),before);h.execute(h.pin('column'),'delete');assert.deepEqual(getManualTableLayout(h.table()).columnWeights,[2,7]);h.table().forEach((row,_pos,r)=>assert.deepEqual([row.child(0).attrs.id,row.child(1).attrs.id],[`cell${r}0`,`cell${r}2`]));
});
for(const mode of ['row','column'])test(`${mode} clear retains exact cells attrs and other content even when caret is elsewhere`,()=>{
 const h=harness(),before=h.table(),beforeDoc=documentFromState(h.state),pin=h.pin(mode);h.execute(pin,'clear');const after=h.table();
 after.forEach((row,_pos,r)=>row.forEach((cell,_offset,c)=>{const old=before.child(r).child(c);assert.deepEqual(cell.attrs,old.attrs);assert.equal(cell.textContent,(mode==='row'?r===1:c===1)?'':old.textContent);}));
 assert.deepEqual(getManualTableLayout(after),getManualTableLayout(before));assert.equal(h.state.selection.mode,mode);unchangedOutside(h,beforeDoc);assert.equal(h.count,1);h.run(undo);assert.deepEqual(documentFromState(h.state),beforeDoc);
});
test('minimum one physical row/column, dry run and unknown action never mutate',()=>{
 const h=harness(fixture(1,1)),pin=h.pin('row','cell00');assert.equal(h.available(pin,'delete').enabled,false);assert.match(h.available(pin,'delete').reason,/마지막/);assert.equal(h.execute(pin,'delete'),false);assert.equal(h.execute(h.pin('column','cell00'),'delete'),false);assert.equal(h.execute(pin,'header'),false);
 assert.equal(executeManualTableAction(pin,'duplicate',{generation:7})(h.state,undefined,h.view),true);assert.equal(h.count,0);
});
test('pagination roots and tails disable every action including clear without changing logical family',()=>{
 const d=fixture();d.pages[0].blocks[1].extensions=withManualPaginationMarker({extensions:d.pages[0].blocks[1].extensions},{kind:'block',rootBlockId:'table',sourceType:'table',repeatedHeader:true}).extensions;
 const h=harness(d),pin=h.pin();for(const action of ['insert-before','insert-after','duplicate','clear','delete']){assert.match(h.available(pin,action).reason,/자동으로 나뉜/);assert.equal(h.execute(pin,action),false);}assert.equal(h.count,0);
 const plainDoc=fixture(),tail=structuredClone(plainDoc.pages[0].blocks[1]);tail.id='tail';for(const row of [tail.headers,...tail.rows])for(const cell of row)cell.id=`tail-${cell.id}`;tail.extensions=withManualPaginationMarker({extensions:tail.extensions},{kind:'block',rootBlockId:'table',sourceType:'table',repeatedHeader:true}).extensions;plainDoc.pages[1].blocks.push(tail);const plain=harness(plainDoc);for(const target of [plain.pin(),plain.pin('row','tail-cell11','tail')])for(const action of ['clear','delete']){assert.match(plain.available(target,action).reason,/자동으로 나뉜/);assert.equal(plain.execute(target,action),false);}assert.equal(plain.count,0);
});
test('metadata canonical merged row clear roundtrips production DTO without touching another entry or binding',()=>{
 const d=fixture();d.cover={id:'cover',title:[],metadata:Array.from({length:3},(_,r)=>({id:`entry${r}`,label:[{type:'text',text:`Label${r}`}],value:[{type:'text',text:`Value${r}`,marks:[{type:'strong'}]}],extensions:{vendor:{entry:r}}})),blocks:[]};
 const h=harness(d),found=findManualCoverRole(h.state,'cover','metadata'),table=found.node,last=table.child(1).firstChild.attrs.id,pin=h.pin('row',last,table.attrs.id);
 assert.equal(table.child(1).child(1).attrs.colspan,3);for(const action of ['insert-before','insert-after','duplicate','delete']){assert.equal(h.available(pin,action).enabled,true);}assert.deepEqual(getManualTableActionMenuItems('row',id=>h.available(pin,id)).map(item=>item.id),['insert-before','insert-after','duplicate','clear','delete']);assert.equal(h.count,0);assert.equal(h.available(pin,'duplicate').enabled,true);const column=h.pin('column',table.child(1).child(1).attrs.id,table.attrs.id);assert.match(h.available(column,'clear').reason,/병합/);
 const before=documentFromState(h.state);assert.equal(h.execute(pin,'clear'),true);const afterTable=findManualCoverRole(h.state,'cover','metadata').node;
 table.forEach((row,_pos,r)=>row.forEach((cell,_offset,c)=>{const after=afterTable.child(r).child(c);assert.deepEqual(after.attrs,cell.attrs);assert.equal(after.textContent,r===1?'':cell.textContent);}));
 const after=documentFromState(h.state);assert.deepEqual(after.cover.metadata.slice(0,2),before.cover.metadata.slice(0,2));assert.deepEqual(after.cover.metadata[2],{...before.cover.metadata[2],label:[],value:[]});assert.deepEqual(documentFromState(createManualState({document:after})),after);h.run(undo);assert.deepEqual(documentFromState(h.state),before);
});
test('rowspan protects physical row clear and generic merged tables protect all structure and column clear',()=>{
 const h=harness(),found=findManualObject(h.state,'table'),rows=[];found.node.forEach(row=>rows.push(row));const first=rows[0],second=rows[1];
 rows[0]=first.copy(Fragment.fromArray([first.firstChild.type.create({...first.firstChild.attrs,rowspan:2},first.firstChild.content),first.child(1),first.child(2)]));rows[1]=second.copy(Fragment.fromArray([second.child(1),second.child(2)]));h.dispatch(h.state.tr.replaceWith(found.pos,found.pos+found.node.nodeSize,found.node.copy(Fragment.fromArray(rows))));
 assert.match(h.available(h.pin('row','cell11'),'clear').reason,/여러 행/);assert.match(h.available(h.pin('column','cell11'),'clear').reason,/병합/);assert.match(h.available(h.pin('row','cell11'),'delete').reason,/병합/);
});
