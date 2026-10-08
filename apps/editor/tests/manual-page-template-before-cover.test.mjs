import test from 'node:test';
import assert from 'node:assert/strict';
import {closeHistory} from '@tiptap/pm/history';
import {createEmptyManualDocument,copyManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {getOrderedPageEntries,withManualPageOrder} from '../src/redesign/manual-page-order.mjs';
import {createManualPageTemplate,insertManualPageTemplate} from '../src/redesign/manual-page-templates.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';

const physicalIds=state=>{const ids=[];state.doc.forEach(node=>ids.push(node.attrs.id));return ids;};
for(const originalPosition of ['first','middle'])test(`leading blank precedes actual ${originalPosition} cover order and persists through file/load/copy and one Undo/Redo`,()=>{
 const source=createEmptyManualDocument({title:'Order test'});source.pages.push(createManualPageTemplate('body'));source.pages[0].blocks[0].content=[{type:'text',text:'Original',marks:[{type:'strong'}]}];source.cover=createManualPageTemplate('cover',{title:'Existing'});source.cover.extensions={vendor:'cover'};source.extensions={manualPageOrder:{owner:'foreign',opaque:true},vendor:{keep:true}};
 const d=originalPosition==='middle'?withManualPageOrder(source,[source.pages[0].id,source.cover.id,source.pages[1].id]):source,snapshot=structuredClone(d);
 let state=createManualState({document:d});const dispatch=tr=>{state=state.applyTransaction(tr).state;};dispatch(closeHistory(state.tr).insertText('prior '));const before=state,beforeDocument=documentFromState(before),oldOrder=physicalIds(state);
 const command=insertManualPageTemplate('body',{beforeFirstPage:true,revision:before.doc});assert.equal(command(state),true);assert.equal(state,before);assert.equal(command(state,dispatch),true);
 const after=state,document=documentFromState(state),newId=state.doc.firstChild.attrs.id;
 assert.equal(state.doc.firstChild.type.name,'page');assert.deepEqual(state.doc.firstChild.firstChild.textContent,'');assert.equal(state.doc.firstChild.child(1).type.name,'paragraph');assert.equal(state.doc.firstChild.child(1).textContent,'');
 assert.deepEqual(physicalIds(state),[newId,...oldOrder]);assert.deepEqual(getOrderedPageEntries(document).map(page=>page.id),[newId,...oldOrder]);assert.deepEqual(document.cover,beforeDocument.cover);assert.deepEqual(document.pages.slice(1),beforeDocument.pages);assert.deepEqual(document.extensions.manualPageOrder,{owner:'foreign',opaque:true});assert.deepEqual(d,snapshot);
 const decoded=decodeDocumentFile(encodeDocumentFile({document,assets:{}}));assert.deepEqual(decoded.document,document);assert.deepEqual(physicalIds(createManualState({document:decoded.document})),[newId,...oldOrder]);
 const copied=copyManualDocument(document);assert.deepEqual(getOrderedPageEntries(copied).map(page=>page===copied.cover?'cover':'body'),getOrderedPageEntries(document).map(page=>page===document.cover?'cover':'body'));
 assert.equal(manualCommands.undo(state,dispatch),true);assert.ok(state.doc.eq(before.doc));assert.ok(state.selection.eq(before.selection));assert.equal(manualCommands.redo(state,dispatch),true);assert.ok(state.doc.eq(after.doc));assert.ok(state.selection.eq(after.selection));
});

test('explicit leading cover factory inserts a fresh cover at position zero without changing original body IDs',()=>{
 const d=createEmptyManualDocument(),beforeDocument=structuredClone(d);let state=createManualState({document:d});const before=state,dispatch=tr=>{state=state.applyTransaction(tr).state;};
 assert.equal(insertManualPageTemplate('cover',{beforeFirstPage:true,revision:state.doc})(state,dispatch),true);assert.equal(state.doc.firstChild.type.name,'cover');assert.deepEqual(documentFromState(state).pages,beforeDocument.pages);const after=state;
 assert.equal(manualCommands.undo(state,dispatch),true);assert.ok(state.doc.eq(before.doc));assert.equal(manualCommands.redo(state,dispatch),true);assert.ok(state.doc.eq(after.doc));
});
