import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createEmptyManualDocument,validateManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {createManualPageTemplate,insertManualPageTemplate} from '../src/redesign/manual-page-templates.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';

const reference=JSON.parse(readFileSync(new URL('../../../examples/compact.json',import.meta.url),'utf8')).cover;
const text=runs=>runs.map(run=>run.text??'').join('');

test('cover starter reuses the existing compact LDS cover composition without copying product facts',()=>{
 const cover=createManualPageTemplate('cover',{title:'User title'}),document=createEmptyManualDocument();document.cover=cover;
 assert.deepEqual(cover.logo,reference.logo);assert.deepEqual(cover.metadata.map(item=>text(item.label)),reference.metadata.map(item=>item.label));assert.ok(cover.metadata.every(item=>item.value.length===0));
 assert.equal(text(cover.sectionTitle),reference.sectionTitle??'시작하기 전에');assert.deepEqual(cover.blocks.map(block=>block.type),reference.blocks.map(block=>block.type));
 assert.equal(text(cover.blocks[0].items[0].blocks[0].content),reference.blocks[0].items[0].label+': ');
 assert.equal(text(cover.blocks[1].title),reference.blocks[1].title);assert.equal(cover.blocks[1].tone,reference.blocks[1].tone??'signal');assert.deepEqual(cover.blocks[1].blocks[0].content,[]);
 validateManualDocument(document);assert.deepEqual(documentFromState(createManualState({document})),document);
});

test('updated LDS cover inserts at the leading boundary and retains source IDs, metadata, marks and one Undo/Redo',()=>{
 const source=createEmptyManualDocument({title:'User title'});source.extensions={vendor:{keep:true}};source.pages[0].blocks[0].content=[{type:'text',text:'Preserved',marks:[{type:'strong'}]}];const snapshot=structuredClone(source);
 let state=createManualState({document:source});const before=state,dispatch=tr=>{state=state.applyTransaction(tr).state;};
 assert.equal(insertManualPageTemplate('cover',{beforeFirstPage:true,revision:before.doc})(state,dispatch),true);
 const after=state,d=documentFromState(state);assert.equal(text(d.cover.title),source.title);assert.deepEqual(d.pages,source.pages);assert.deepEqual(d.extensions,source.extensions);assert.deepEqual(source,snapshot);
 const ids=[];state.doc.descendants(node=>{if(node.attrs.id)ids.push(node.attrs.id);});assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document:d,assets:{}})).document,d);

 assert.equal(manualCommands.undo(state,dispatch),true);assert.ok(state.doc.eq(before.doc));assert.ok(state.selection.eq(before.selection));
 assert.equal(manualCommands.redo(state,dispatch),true);assert.ok(state.doc.eq(after.doc));assert.ok(state.selection.eq(after.selection));
});
