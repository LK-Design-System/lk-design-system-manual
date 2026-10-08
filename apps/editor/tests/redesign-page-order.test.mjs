import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {createManualState,documentFromState,documentToNode,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {copyManualDocument} from '../src/redesign/manual-v2.mjs';
import {getOrderedPageEntries,withManualPageOrder,readManualPageOrder} from '../src/redesign/manual-page-order.mjs';
import {moveManualPageGroup} from '../src/redesign/manual-page-groups.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
import {setManualTableColumnWidths,setManualTableRowHeight} from '../src/redesign/manual-table-layout.mjs';
const inline=text=>[{type:'text',text,marks:[{type:'strong'}]}];
const para=(id,text)=>({id,type:'paragraph',content:inline(text),extensions:{vendor:{id}}});
const fixture=()=>({schemaVersion:2,id:'doc',title:'Ordering',extensions:{manualPageOrder:{foreign:true},vendor:{doc:1}},cover:{id:'cover',title:inline('Cover'),metadata:[],blocks:[para('cover-body','Body')],extensions:{vendor:{cover:1}}},pages:[{id:'a',title:inline('A'),blocks:[para('a-body','AAA')]},{id:'b',title:inline('B'),blocks:[para('b-body','BBB')]}]});
function harness(document=fixture()){let state=createManualState({document});const dispatch=tr=>{state=state.applyTransaction(tr).state;};return {get state(){return state;},dispatch,run(command){return command(state,dispatch);}};}
test('legacy cover-first document load/save stays exact and returns original object identities',()=>{
 const document=fixture();assert.equal(getOrderedPageEntries(document)[0],document.cover);assert.equal(getOrderedPageEntries(document)[1],document.pages[0]);assert.deepEqual(documentFromState(createManualState({document})),document);
});
for(const order of [['a','cover','b'],['a','b','cover']])test(`cover at ${order.indexOf('cover')} survives PM, file and copied IDs`,()=>{
 const original=fixture(),document=withManualPageOrder(original,order),marker=readManualPageOrder(document.extensions);assert.equal(marker.key,'manualPageOrder2');assert.deepEqual(document.extensions.manualPageOrder,original.extensions.manualPageOrder);
 assert.deepEqual(getOrderedPageEntries(document).map(page=>page.id),order);const node=documentToNode(document);assert.deepEqual(Array.from({length:node.childCount},(_,index)=>node.child(index).attrs.id),order);
 assert.deepEqual(documentFromState(createManualState({document})),document);assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document,assets:{}})).document,document);
 const copy=copyManualDocument(document);assert.notEqual(copy.id,document.id);assert.deepEqual(getOrderedPageEntries(copy).map(page=>page===copy.cover?'cover':copy.pages.indexOf(page)),order.map(id=>id==='cover'?'cover':original.pages.findIndex(page=>page.id===id)));assert.deepEqual(copy.extensions.manualPageOrder,original.extensions.manualPageOrder);
});
test('body group moves across cover in one Undo/Redo while preserving caret and all objects',()=>{
 const h=harness(),beforeDoc=documentFromState(h.state),found=findManualObject(h.state,'b-body');h.dispatch(h.state.tr.setSelection(TextSelection.create(h.state.doc,found.pos+2)));const before=h.state;
 assert.equal(h.run(moveManualPageGroup({sourceId:'b',targetId:'cover',edge:'before',revision:h.state.doc})),true);const after=h.state,document=documentFromState(after);assert.deepEqual(getOrderedPageEntries(document).map(page=>page.id),['b','cover','a']);assert.deepEqual(document.cover,beforeDoc.cover);assert.deepEqual(document.pages,[beforeDoc.pages[1],beforeDoc.pages[0]]);assert.equal(after.selection.$from.parent.attrs.id,'b-body');assert.equal(after.selection.$from.parentOffset,1);
 assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));
});
test('recognized opaque marker fields and foreign namespace collisions survive order updates',()=>{
 const d=withManualPageOrder(fixture(),['a','cover','b']),key=readManualPageOrder(d.extensions).key;d.extensions[key].opaque={future:[1,2]};const next=withManualPageOrder(d,['a','b','cover']);assert.deepEqual(next.extensions[key].opaque,d.extensions[key].opaque);assert.deepEqual(next.extensions.manualPageOrder,d.extensions.manualPageOrder);assert.throws(()=>withManualPageOrder(d,['a','a','cover']));
});
test('semantic page guard rejects duplicate root identities and permits a cover-only document',()=>{
 const h=harness({schemaVersion:2,id:'doc',title:'',cover:fixture().cover,pages:[fixture().pages[0]]}),before=h.state;h.dispatch(h.state.tr.insert(0,h.state.doc.firstChild));assert.equal(h.state,before);const page=findManualObject(h.state,'a');h.dispatch(h.state.tr.delete(page.pos,page.pos+page.node.nodeSize).setMeta('manualExplicitDelete',true));assert.notEqual(h.state,before);assert.equal(documentFromState(h.state).pages.length,0);assert.equal(documentFromState(h.state).cover.id,before.doc.firstChild.attrs.id);
});
test('persisted table layout renders colgroup percentages and content-growing row minimum',()=>{
 const cell=(id,text)=>({id,content:inline(text),extensions:{vendor:{id}}}),d=fixture();d.pages[0].blocks=[{id:'table',type:'table',label:'',headers:[cell('h1','H1'),cell('h2','H2')],rows:[[cell('c1','C1'),cell('c2','C2')]]}];const h=harness(d);
 assert.equal(h.run(setManualTableColumnWidths({tableId:'table',columnWeights:[1,3]})),true);assert.equal(h.run(setManualTableRowHeight({tableId:'table',rowIndex:1,rowMinHeightPx:64})),true);const table=findManualObject(h.state,'table').node,spec=table.type.spec.toDOM(table),rowSpec=table.child(1).type.spec.toDOM(table.child(1));assert.equal(spec[2][0],'colgroup');assert.equal(spec[2][1][1].style,'width: 25%;');assert.equal(spec[2][2][1].style,'width: 75%;');assert.deepEqual(spec[3],['tbody',0]);assert.equal(rowSpec[1].style,'height: 64px;');assert.equal(rowSpec[1].style.includes('overflow'),false);
 const reload=createManualState({document:documentFromState(h.state)}),again=findManualObject(reload,'table').node;assert.deepEqual(again.type.spec.toDOM(again),spec);assert.deepEqual(again.child(1).type.spec.toDOM(again.child(1)),rowSpec);
});
