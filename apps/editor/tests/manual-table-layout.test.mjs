import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {closeHistory} from '@tiptap/pm/history';
import {createEmptyManualDocument,copyManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {planManualPagination,createManualPaginationTransaction} from '../src/redesign/manual-pagination.mjs';
import {withManualPaginationMarker} from '../src/redesign/manual-pagination-meta.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
import {MANUAL_TABLE_LAYOUT_OWNER,readManualTableCellLayout,withManualTableCellLayout,getManualTableLayout,setManualTableColumnWidths,setManualTableRowHeight} from '../src/redesign/manual-table-layout.mjs';
const cell=(id,text)=>({id,content:[{type:'text',text,marks:[{type:'strong'}]}],extensions:{manualTableLayout:{owner:'foreign',columnWeight:999},vendor:{keep:id}}});
function fixture(){const d=createEmptyManualDocument();d.extensions={vendor:'document'};d.pages[0].blocks=[{id:'table-root',type:'table',label:'Preserved',extensions:{vendor:'table'},headers:[cell('h1','A'),cell('h2','B')],rows:[1,2,3].map(i=>[cell(`r${i}a`,'Left'),cell(`r${i}b`,'Right')])}];let state=createManualState({document:d});const plan=planManualPagination(state,{doc:state.doc,revision:0,pages:[{id:d.pages[0].id,capacity:100,blocks:[{id:'table-root',height:150,splits:[{kind:'child',at:1,headHeight:80,tailHeight:70}]}]}]});assert.equal(plan.status,'ready');state=state.applyTransaction(createManualPaginationTransaction(state,plan)).state;return documentFromState(state);}
function harness(d=fixture()){let state=createManualState({document:d});const dispatch=tr=>{state=state.applyTransaction(tr).state;};const found=findManualObject(state,'r2a');dispatch(state.tr.setSelection(TextSelection.create(state.doc,found.pos+2)));dispatch(closeHistory(state.tr).insertText('Prior '));return {get state(){return state;},get document(){return documentFromState(state);},run(cmd,view){return cmd(state,dispatch,view);}};}
function tables(d){return d.pages.flatMap(page=>page.blocks).filter(block=>block.type==='table');}
function stripOwned(value){if(!value||typeof value!=='object')return;for(const key of Object.keys(value)){if(key==='extensions'){for(const [name,entry]of Object.entries(value.extensions))if(entry?.owner===MANUAL_TABLE_LAYOUT_OWNER)delete value.extensions[name];}else stripOwned(value[key]);}}
function undoRedo(h,before){const after=h.state;assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document:h.document,assets:{}})).document,h.document);const clean=structuredClone(h.document),old=documentFromState(before);stripOwned(clean);assert.deepEqual(clean,old);}

test('owned layout uses collision-safe namespace and preserves unknown payload, sibling metadata and independent fields',()=>{
 const meta={label:'keep',extensions:{manualTableLayout:{owner:'foreign'},vendor:{value:1}}},before=structuredClone(meta),one=withManualTableCellLayout(meta,{columnWeight:2});assert.deepEqual(meta,before);assert.equal(readManualTableCellLayout(one.extensions).key,'manualTableLayout2');
 one.extensions.manualTableLayout2.unknown={keep:true};const two=withManualTableCellLayout(one,{rowMinHeightPx:0});assert.equal(readManualTableCellLayout(two.extensions).columnWeight,2);assert.equal(readManualTableCellLayout(two.extensions).rowMinHeightPx,0);assert.deepEqual(two.extensions.manualTableLayout2.unknown,{keep:true});assert.deepEqual(two.extensions.manualTableLayout,{owner:'foreign'});
 for(const patch of [{columnWeight:0},{columnWeight:Infinity},{rowMinHeightPx:-1},{rowMinHeightPx:NaN},{width:1}])assert.throws(()=>withManualTableCellLayout(meta,patch));
 assert.deepEqual(readManualTableCellLayout({foreign:{owner:MANUAL_TABLE_LAYOUT_OWNER,version:2,kind:'cell-layout'}}),null);
});

test('column resize from a real automatic tail updates every family cell with one Undo and serializes without altering source',()=>{
 const d=fixture(),snapshot=structuredClone(d),h=harness(d),before=h.state,tail=tables(h.document)[1],command=setManualTableColumnWidths({tableId:tail.id,columnWeights:[2,3],revision:before.doc});assert.equal(command(h.state),true);assert.equal(h.state,before);assert.equal(h.run(command),true);
 for(const table of tables(h.document)){getManualTableLayout(table).columnPercentages.forEach((value,i)=>assert.ok(Math.abs(value-[40,60][i])<1e-9));for(const row of [table.headers,...table.rows])for(let index=0;index<row.length;index++)assert.equal(readManualTableCellLayout(row[index].extensions).columnWeight,[2,3][index]);}
 assert.deepEqual(d,snapshot);assert.deepEqual(getManualTableLayout(findManualObject(h.state,'table-root').node),getManualTableLayout(tables(h.document)[0]));undoRedo(h,before);
 const copied=copyManualDocument(h.document);assert.deepEqual(tables(copied).map(getManualTableLayout),tables(h.document).map(getManualTableLayout));
});
for(const rowIndex of [0,1])test(`row resize at tail row ${rowIndex} ${rowIndex===0?'synchronizes repeated headers':'changes only the clicked physical row'}`,()=>{
 const h=harness(),before=h.state,old=h.document,tail=tables(old)[1];assert.equal(h.run(setManualTableRowHeight({tableId:tail.id,rowIndex,rowMinHeightPx:48,revision:before.doc})),true);
 const current=tables(h.document);assert.equal(getManualTableLayout(current[1]).rowMinHeightsPx[rowIndex],48);
 if(rowIndex===0)assert.equal(getManualTableLayout(current[0]).rowMinHeightsPx[0],48);else assert.deepEqual(current[0],tables(old)[0]);
 assert.equal(getManualTableLayout(current[1]).rowMinHeightsPx[rowIndex===0?1:0],null);undoRedo(h,before);
});

test('headers remain mergeable after layout commits, with all body IDs and heights preserved on pagination pull',()=>{
 const h=harness(),tail=tables(h.document)[1];h.run(setManualTableColumnWidths({tableId:tail.id,columnWeights:[3,1]}));h.run(setManualTableRowHeight({tableId:tail.id,rowIndex:0,rowMinHeightPx:40}));
 const state=h.state,pages=[];state.doc.forEach(page=>{const blocks=[];page.forEach(node=>{if(node.type.name==='table')blocks.push({id:node.attrs.id,height:20});});pages.push({id:page.attrs.id,capacity:200,blocks});});const plan=planManualPagination(state,{doc:state.doc,revision:1,pages});assert.equal(plan.status,'ready');const next=state.applyTransaction(createManualPaginationTransaction(state,plan)).state,merged=tables(documentFromState(next));assert.equal(merged.length,1);assert.equal(merged[0].rows.length,3);assert.deepEqual(getManualTableLayout(merged[0]).columnPercentages,[75,25]);assert.equal(getManualTableLayout(merged[0]).rowMinHeightsPx[0],40);
});

test('invalid values, stale docs, readonly, composition, cancellation and malformed table family are no-ops',()=>{
 const h=harness(),before=h.state;
 for(const options of [{columnWeights:[0,1]},{columnWeights:[1]},{columnWeights:[Infinity,1]},{revision:createManualState({document:h.document}).doc},{readOnly:true},{cancelled:true},{tableId:'missing'},{tableId:'r2a'}]){assert.equal(h.run(setManualTableColumnWidths({tableId:'table-root',columnWeights:[1,2],...options})),false);assert.equal(h.state,before);}
 for(const view of [{editable:false},{composing:true}]){assert.equal(h.run(setManualTableColumnWidths({tableId:'table-root',columnWeights:[1,2]}),view),false);assert.equal(h.state,before);}
 for(const options of [{rowIndex:-1},{rowIndex:99},{rowMinHeightPx:NaN},{rowMinHeightPx:-1},{cancelled:true},{readOnly:true},{revision:createManualState({document:h.document}).doc}])assert.equal(h.run(setManualTableRowHeight({tableId:'table-root',rowIndex:1,rowMinHeightPx:20,...options})),false);
 for(const mode of ['missingRoot','typeMismatch','columnMismatch']){
  const d=fixture(),tail=tables(d)[1];if(mode==='missingRoot')tail.extensions=withManualPaginationMarker({extensions:tail.extensions},{kind:'block',rootBlockId:'missing',sourceType:'table',repeatedHeader:true}).extensions;
  if(mode==='typeMismatch')tail.extensions=withManualPaginationMarker({extensions:tail.extensions},{kind:'block',rootBlockId:'table-root',sourceType:'callout',repeatedHeader:true}).extensions;
  if(mode==='columnMismatch'){tail.headers.pop();tail.rows.forEach(row=>row.pop());}
  const bad=harness(d),original=bad.state;assert.equal(bad.run(setManualTableColumnWidths({tableId:tail.id,columnWeights:[1,2]})),false);assert.equal(bad.state,original);
 }
});

test('no-op resize dispatches nothing and zero height preserves unrelated column and empty-extension semantics',()=>{
 const h=harness(),tail=tables(h.document)[1];assert.equal(h.run(setManualTableColumnWidths({tableId:tail.id,columnWeights:[1,2]})),true);
 assert.equal(h.run(setManualTableRowHeight({tableId:tail.id,rowIndex:1,rowMinHeightPx:0})),true);const before=h.state;
 assert.equal(h.run(setManualTableColumnWidths({tableId:tail.id,columnWeights:[1,2]})),false);assert.equal(h.run(setManualTableRowHeight({tableId:tail.id,rowIndex:1,rowMinHeightPx:0})),false);assert.equal(h.state,before);
 for(const cell of tables(h.document)[1].rows[0]){const layout=readManualTableCellLayout(cell.extensions);assert.equal(layout.rowMinHeightPx,0);assert.ok(layout.columnWeight>0);}
 const opaque={extensions:{}};assert.deepEqual(opaque,{extensions:{}});assert.deepEqual(withManualTableCellLayout(opaque,{columnWeight:1}).extensions.manualTableLayout.columnWeight,1);
});
