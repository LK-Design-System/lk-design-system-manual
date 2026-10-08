import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutosaveController,saveBeforeReplacement} from '../src/redesign/autosave-controller.mjs';
import {prepareDocumentRecord,encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState} from '../src/redesign/manual-kernel.mjs';
import {planManualPagination,createManualPaginationTransaction} from '../src/redesign/manual-pagination.mjs';
import {createManualStorageFixture} from './fixtures/manual-storage-support.mjs';

const snapshot=(text,id='a')=>({document:{id,title:text},assets:{}});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function harness(){
 const writes=[],statuses=[],saved=[],timers=new Map();let serial=0;
 const controller=createAutosaveController({save:value=>{const job=deferred();writes.push({value,...job});return job.promise;},onStatus:value=>statuses.push(value),onSaved:(record,meta)=>saved.push({record,meta}),setTimer:fn=>{const id=++serial;timers.set(id,fn);return id;},clearTimer:id=>timers.delete(id)});
 controller.reset({documentId:'a',revision:'r0'});
 return {controller,writes,statuses,saved,fire:()=>{const queue=[...timers.values()];timers.clear();queue.forEach(fn=>fn());},timers};
}

test('debounce coalesces edits and persists an immutable snapshot with its captured token',async()=>{
 const h=harness(),value=snapshot('first'),token={caret:'first'};
 h.controller.schedule(value,token);value.document.title='mutated';
 h.controller.schedule(snapshot('latest'),token);assert.equal(h.timers.size,1);
 h.fire();await tick();assert.equal(h.writes.length,1);assert.equal(h.writes[0].value.document.title,'latest');assert.equal(h.writes[0].value.expectedRevision,'r0');
 h.writes[0].resolve({revision:'r1'});await tick();assert.equal(h.controller.getState().dirty,false);assert.equal(h.saved[0].meta.token,token);
});
test('edits during a save stay queued and use the revision from the previous commit',async()=>{
 const h=harness();h.controller.schedule(snapshot('one'));h.fire();await tick();
 h.controller.schedule(snapshot('two'));h.fire();await tick();assert.equal(h.writes.length,1);
 const flushed=h.controller.flush();h.writes[0].resolve({revision:'r1'});await tick();
 assert.equal(h.writes.length,2);assert.equal(h.saved[0].meta.current,false);assert.equal(h.writes[1].value.document.title,'two');assert.equal(h.writes[1].value.expectedRevision,'r1');
 h.writes[1].resolve({revision:'r2'});assert.equal(await flushed,true);await tick();assert.equal(h.controller.getState().revision,'r2');
});
test('a newer edit keeps its debounce interval when an older write finishes',async()=>{
 const h=harness();h.controller.schedule(snapshot('one'));h.fire();await tick();h.controller.schedule(snapshot('two'));
 h.writes[0].resolve({revision:'r1'});await tick();assert.equal(h.writes.length,1);assert.equal(h.controller.getState().dirty,true);
 h.fire();await tick();assert.equal(h.writes.length,2);h.writes[1].resolve({revision:'r2'});await tick();
});
test('failure retains the newest edit, stops automatic retries, and explicit retry uses the original revision',async()=>{
 const h=harness();h.controller.schedule(snapshot('one'));h.fire();await tick();h.controller.schedule(snapshot('two'));
 const flushed=h.controller.flush();h.writes[0].reject(Object.assign(new Error('full'),{code:'QuotaExceededError'}));assert.equal(await flushed,false);await tick();
 assert.equal(h.timers.size,0);assert.equal(h.controller.getState().dirty,true);assert.equal(await h.controller.flush(),false);
 h.controller.schedule(snapshot('three'));h.fire();await tick();assert.equal(h.writes.length,1);
 const retried=h.controller.retry();await tick();assert.equal(h.writes[1].value.document.title,'three');assert.equal(h.writes[1].value.expectedRevision,'r0');
 h.writes[1].resolve({revision:'r1'});assert.equal(await retried,true);
});
test('conflicts cannot be retried as overwrites and preserve pending edits',async()=>{
 const h=harness();h.controller.schedule(snapshot('draft'));const flushed=h.controller.flush();await tick();
 h.writes[0].reject(Object.assign(new Error('changed'),{code:'CONFLICT'}));assert.equal(await flushed,false);await tick();
 assert.equal(await h.controller.retry(),false);h.controller.schedule(snapshot('still editing'));h.fire();await tick();
 assert.equal(h.writes.length,1);assert.equal(h.statuses.at(-1).state,'conflict');assert.equal(h.controller.getState().revision,'r0');
});
test('switching documents invalidates old callbacks without allowing overlapping writes',async()=>{
 const h=harness();h.controller.schedule(snapshot('a'));const oldFlush=h.controller.flush();await tick();
 h.controller.reset({documentId:'b',revision:'rb'});assert.equal(await oldFlush,false);h.controller.schedule(snapshot('b','b'));const newFlush=h.controller.flush();await tick();assert.equal(h.writes.length,1);
 h.writes[0].resolve({revision:'ra'});await tick();assert.equal(h.saved.length,0);assert.equal(h.writes[1].value.expectedRevision,'rb');assert.equal(h.writes[1].value.document.id,'b');
 h.writes[1].resolve({revision:'rb2'});assert.equal(await newFlush,true);assert.equal(h.controller.getState().revision,'rb2');
});
test('late failures after replacement do not poison the new document',async()=>{
 const h=harness();h.controller.schedule(snapshot('a'));h.fire();await tick();h.controller.reset({documentId:'b',revision:null});h.controller.schedule(snapshot('b','b'));h.fire();
 h.writes[0].reject(new Error('old failure'));await tick();assert.equal(h.controller.getState().error,null);assert.equal(h.writes[1].value.expectedRevision,null);
 h.writes[1].resolve({revision:'rb'});await tick();
});
test('dispose settles waiters and prevents late saves from updating UI',async()=>{
 const h=harness();h.controller.schedule(snapshot('a'));const flushed=h.controller.flush();await tick();h.controller.dispose();assert.equal(await flushed,false);
 h.writes[0].resolve({revision:'r1'});await tick();assert.equal(h.saved.length,0);assert.throws(()=>h.controller.schedule(snapshot('b')));assert.equal(await h.controller.flush(),false);
});
test('identity mismatch cannot replace queued work, and callback errors do not turn commits into storage failures',async()=>{
 const h=harness();h.controller.schedule(snapshot('right'));assert.throws(()=>h.controller.schedule(snapshot('wrong','b')));h.fire();await tick();assert.equal(h.writes[0].value.document.title,'right');h.writes[0].resolve({revision:'r1'});await tick();
 let callbacks=0;const c=createAutosaveController({save:async()=>({revision:'r2'}),onSaved:()=>{throw new Error('UI failed');},onCallbackError:()=>callbacks++});c.reset({documentId:'a'});c.schedule(snapshot('a'));assert.equal(await c.flush(),true);assert.equal(c.getState().error,null);assert.equal(callbacks,1);c.dispose();
});
test('two editor controllers use the actual storage CAS contract and preserve the losing draft',async()=>{
 const document=createEmptyManualDocument();let current=prepareDocumentRecord({document,assets:{},expectedRevision:null},undefined,{revision:'base',savedAt:1}),serial=0;
 const save=async value=>{const record=prepareDocumentRecord(value,current,{revision:`save-${++serial}`,savedAt:serial+1});current=record;return record;};
 const a=createAutosaveController({save}),b=createAutosaveController({save});for(const c of [a,b])c.reset({documentId:document.id,revision:'base'});
 a.schedule({document:{...document,title:'first tab'},assets:{}});b.schedule({document:{...document,title:'second tab'},assets:{}});
 const results=await Promise.all([a.flush(),b.flush()]);assert.deepEqual(results,[true,false]);assert.equal(current.document.title,'first tab');assert.equal(b.getState().error.code,'CONFLICT');assert.equal(b.getState().dirty,true);assert.equal(await b.retry(),false);assert.equal(current.document.title,'first tab');a.dispose();b.dispose();
});
test('actual storage validation rejects null image collections without treating the draft as saved',async()=>{
 const document=createEmptyManualDocument(),c=createAutosaveController({save:async value=>prepareDocumentRecord(value,undefined,{revision:'r1',savedAt:1})});c.reset({documentId:document.id});c.schedule({document,assets:null});assert.equal(await c.flush(),false);assert.equal(c.getState().error.code,'INVALID_ASSETS');assert.equal(c.getState().revision,null);assert.equal(c.getState().dirty,true);c.dispose();
});
test('replacement saves late edits and assets rather than switching after an older snapshot commit',async()=>{
 let current={doc:'initial',assets:{}},replaced=null;const writes=[];
 const pending=saveBeforeReplacement({capture:()=>current,save:value=>{const job=deferred();writes.push({value,...job});return job.promise;},isCurrent:value=>value===current,replace:value=>replaced=value});
 assert.equal(writes.length,1);current={doc:'late image',assets:{'assets/a.png':'data:image/png;base64,AAAA'}};
 writes[0].resolve(true);await tick();assert.equal(replaced,null);assert.equal(writes.length,2);assert.equal(writes[1].value,current);
 writes[1].resolve(true);assert.equal(await pending,true);assert.equal(replaced,current);
});
test('replacement failure retains the latest document and never runs the switch',async()=>{
 let current={doc:'initial'},replaced=false;const writes=[];
 const pending=saveBeforeReplacement({capture:()=>current,save:value=>{const job=deferred();writes.push({value,...job});return job.promise;},isCurrent:value=>value===current,replace:()=>replaced=true});
 current={doc:'newest draft'};writes[0].resolve(true);await tick();writes[1].resolve(false);
 assert.equal(await pending,false);assert.equal(replaced,false);assert.equal(current.doc,'newest draft');
});
test('replacement installs its generation barrier in the same task as the current-snapshot check',async()=>{
 let generation=1,lateImageApplied=false;const snapshot={generation:1};
 const pending=saveBeforeReplacement({capture:()=>snapshot,save:async()=>true,isCurrent:()=>{queueMicrotask(()=>{if(generation===1)lateImageApplied=true;});return true;},replace:()=>generation++});
 assert.equal(await pending,true);await tick();assert.equal(generation,2);assert.equal(lateImageApplied,false);
});
test('replacement and real CAS scheduler commit a late image before resetting the storage session',async()=>{
 const gates=[],document=createEmptyManualDocument(),fixture=createManualStorageFixture([document],{wait:()=>new Promise(resolve=>gates.push(resolve))});
 const initial=await fixture.api.loadDocument(document.id),controller=createAutosaveController({save:fixture.api.saveDocument});controller.reset({documentId:document.id,revision:initial.revision});fixture.setMode('delayed');
 let current={document:{...document,title:'first edit'},assets:{}},installed=false;
 const replacing=saveBeforeReplacement({capture:()=>current,save:value=>{controller.schedule(value);return controller.flush();},isCurrent:value=>value===current&&!controller.getState().dirty,replace:()=>{installed=true;controller.reset({documentId:'next-document'});}});
 await tick();assert.equal(gates.length,1);
 current={document:{...current.document,title:'late image edit',pages:current.document.pages.map(page=>({...page,blocks:[...page.blocks,{id:crypto.randomUUID(),type:'figure',asset:'assets/late.png',alt:'late synthetic image',caption:[],widthPreset:'full'}]}))},assets:{'assets/late.png':'data:image/png;base64,AAAA'}};
 gates.shift()();await tick();assert.equal(installed,false);assert.equal(gates.length,1);gates.shift()();assert.equal(await replacing,true);
 const saved=fixture.readSaved(document.id);assert.equal(saved.document.title,'late image edit');assert.deepEqual(saved.assets,current.assets);assert.equal(saved.document.pages[0].blocks.at(-1).asset,'assets/late.png');assert.equal(fixture.getStatus().commits,2);assert.equal(controller.getState().documentId,'next-document');controller.dispose();
});
test('a late-edit replacement failure keeps the newest source and original storage session',async()=>{
 const gates=[],document=createEmptyManualDocument(),fixture=createManualStorageFixture([document],{wait:()=>new Promise(resolve=>gates.push(resolve))}),initial=await fixture.api.loadDocument(document.id);
 const controller=createAutosaveController({save:fixture.api.saveDocument});controller.reset({documentId:document.id,revision:initial.revision});fixture.setMode('delayed');let current={document:{...document,title:'first edit'},assets:{}},installed=false;
 const replacing=saveBeforeReplacement({capture:()=>current,save:value=>{controller.schedule(value);return controller.flush();},isCurrent:value=>value===current&&!controller.getState().dirty,replace:()=>installed=true});
 await tick();current={document:{...document,title:'latest unsaved edit'},assets:{}};fixture.setMode('quota');gates.shift()();assert.equal(await replacing,false);
 assert.equal(installed,false);assert.equal(current.document.title,'latest unsaved edit');assert.equal(controller.getState().documentId,document.id);assert.equal(controller.getState().dirty,true);assert.equal(fixture.readSaved(document.id).document.title,'first edit');controller.dispose();
});

test('replacement waits for A4 flow produced during a delayed save and reopens the final pages, IDs and marks',async()=>{
 const source=createEmptyManualDocument();source.pages[0].title=[{type:'text',text:'A4 delayed save'}];
 source.pages[0].blocks=Array.from({length:5},(_,index)=>({id:crypto.randomUUID(),type:'paragraph',content:[{type:'text',text:`paragraph ${index}`,marks:[{type:'strong'}]}],extensions:{keep:index}}));
 let state=createManualState({document:source});const document=documentFromState(state),gates=[],fixture=createManualStorageFixture([document],{wait:()=>new Promise(resolve=>gates.push(resolve))}),initial=await fixture.api.loadDocument(document.id);
 const controller=createAutosaveController({save:fixture.api.saveDocument});controller.reset({documentId:document.id,revision:initial.revision});fixture.setMode('delayed');
 let current={document,assets:{}},replaced=null;
 const pending=saveBeforeReplacement({capture:()=>current,save:value=>{controller.schedule(value);return controller.flush();},isCurrent:value=>value===current&&!controller.getState().dirty,replace:value=>{replaced=value;controller.reset({documentId:'next-document'});}});
 await tick();assert.equal(gates.length,1);
 for(let pass=0;;pass++){
  assert.ok(pass<10,'flow terminates');const pages=[];
  state.doc.forEach(page=>{const blocks=[];page.forEach(block=>{if(!['pageTitle','pageLead'].includes(block.type.name))blocks.push({id:block.attrs.id,height:40});});pages.push({id:page.attrs.id,capacity:100,blocks});});
  const plan=planManualPagination(state,{doc:state.doc,revision:pass,pages});if(plan.status==='stable')break;
  assert.equal(plan.status,'ready');const transaction=createManualPaginationTransaction(state,plan);assert.ok(transaction);state=state.applyTransaction(transaction).state;
 }
 current={document:documentFromState(state),assets:{'assets/synthetic.png':'data:image/png;base64,AAAA'}};
 assert.equal(current.document.pages.length,3);assert.deepEqual(current.document.pages.flatMap(page=>page.blocks),document.pages[0].blocks);
 gates.shift()();await tick();assert.equal(replaced,null);assert.equal(fixture.readSaved(document.id).document.pages.length,1);assert.equal(gates.length,1);
 gates.shift()();assert.equal(await pending,true);assert.equal(replaced,current);
 const saved=await fixture.api.loadDocument(document.id);assert.deepEqual(saved.document,current.document);assert.deepEqual(saved.assets,current.assets);assert.equal(fixture.getStatus().commits,2);
 const portable=decodeDocumentFile(encodeDocumentFile(saved));assert.deepEqual(portable,current);assert.ok(createManualState({document:portable.document}).doc.eq(state.doc));
 controller.dispose();
});
