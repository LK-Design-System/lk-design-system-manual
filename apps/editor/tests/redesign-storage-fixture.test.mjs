import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualStorageFixture} from './fixtures/manual-storage-support.mjs';

test('synthetic quota failure preserves canonical saved content and explicit normal retry uses the same revision',async()=>{
 const document=createEmptyManualDocument(),fixture=createManualStorageFixture([document]);const initial=await fixture.api.loadDocument(document.id);fixture.setMode('quota');
 const value={document:{...document,title:'latest edit'},assets:{},expectedRevision:initial.revision};
 await assert.rejects(fixture.api.saveDocument(value),{name:'QuotaExceededError',code:'QuotaExceededError'});assert.deepEqual(fixture.readSaved(document.id),initial);
 fixture.setMode('normal');const saved=await fixture.api.saveDocument(value);assert.equal(saved.document.title,'latest edit');assert.equal(fixture.getStatus().commits,1);assert.equal(fixture.getStatus().attempts,2);
});
test('delayed storage snapshots input and compares revisions at commit time',async()=>{
 const gates=[],document=createEmptyManualDocument(),fixture=createManualStorageFixture([document],{wait:()=>new Promise(resolve=>gates.push(resolve))});
 const initial=await fixture.api.loadDocument(document.id),value={document:{...document,title:'captured'},assets:{},expectedRevision:initial.revision};fixture.setMode('delayed');const delayed=fixture.api.saveDocument(value);value.document.title='mutated';assert.equal(fixture.getStatus().activeWrites,1);
 gates.shift()();const saved=await delayed;assert.equal(saved.document.title,'captured');assert.equal(fixture.getStatus().activeWrites,0);
 await assert.rejects((()=>{fixture.setMode('normal');return fixture.api.saveDocument({...value,expectedRevision:initial.revision});})(),{code:'CONFLICT'});
});
test('delayed opening keeps a detached response and reports active loads',async()=>{
 const gates=[],document=createEmptyManualDocument(),fixture=createManualStorageFixture([document],{wait:()=>new Promise(resolve=>gates.push(resolve))});fixture.setDelayLoads(true);const loading=fixture.api.loadDocument(document.id);assert.equal(fixture.getStatus().activeLoads,1);gates.shift()();const loaded=await loading;loaded.document.title='changed by caller';assert.notEqual(fixture.readSaved(document.id).document.title,loaded.document.title);assert.equal(fixture.getStatus().activeLoads,0);
});

test('an initially saved long fixture includes detached image bytes without counting a save or changing its pages',async()=>{
 const source=JSON.parse(readFileSync(new URL('./fixtures/manual-pagination.manual.json',import.meta.url),'utf8'));
 const before=structuredClone(source),fixture=createManualStorageFixture([source.document],{initialAssets:{[source.document.id]:source.assets}}),loaded=await fixture.api.loadDocument(source.document.id);
 assert.equal(loaded.document.pages.length,8);assert.deepEqual(loaded.document,before.document);assert.deepEqual(loaded.assets,before.assets);assert.equal(Object.keys(loaded.assets).length,1);
 assert.equal(fixture.getStatus().attempts,0);assert.equal(fixture.getStatus().commits,0);
 source.document.title='mutated seed';source.assets[Object.keys(source.assets)[0]]='mutated bytes';loaded.document.title='mutated response';
 assert.deepEqual(fixture.readSaved(before.document.id).document,before.document);assert.deepEqual(fixture.readSaved(before.document.id).assets,before.assets);
});
