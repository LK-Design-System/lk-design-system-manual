import test from 'node:test';
import assert from 'node:assert/strict';
import {createManualRecoverySession} from '../src/redesign/manual-recovery-session.mjs';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {prepareDocumentRecord} from '../src/redesign/document-store.mjs';
import {createAutosaveController} from '../src/redesign/autosave-controller.mjs';
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const document=createEmptyManualDocument();document.extensions={opaque:{id:'opaque-id',keep:[null,'한글😀']}};
 const snapshot={document,assets:{'assets/a.png':'data:image/png;base64,AAAA'}};
 const records=new Map();let ids=0,revisions=0,gate=null,quota=false;
 const options={createId:()=>`recovery-${++ids}`,saveDocument:async value=>{if(gate)await gate;if(quota)throw Object.assign(new Error('quota'),{code:'QUOTA'});const record=prepareDocumentRecord(value,records.get(value.document.id),{revision:`revision-${++revisions}`});records.set(record.id,structuredClone(record));return record;},loadDocument:async id=>{if(!records.has(id))throw new Error('missing');return structuredClone(records.get(id));}};
 return {snapshot,records,options,session:createManualRecoverySession(options),gate:value=>gate=value,quota:()=>quota=true};
}
test('normal file open with existing same-ID record and twin sessions use independent CAS records',async()=>{
 const h=fixture(),original=prepareDocumentRecord({...h.snapshot,expectedRevision:null},null,{revision:'original'});h.records.set(original.id,original);
 const second=createManualRecoverySession(h.options);h.session.reset({documentId:original.id});second.reset({documentId:original.id});
 const a=await h.session.save({...h.snapshot,expectedRevision:null}),b=await second.save({...h.snapshot,expectedRevision:null});
 assert.notEqual(a.recovery.recordId,b.recovery.recordId);assert.deepEqual(h.records.get(original.id),original);assert.deepEqual(a.document,h.snapshot.document);assert.deepEqual(a.assets,h.snapshot.assets);assert.equal(a.id,original.id);
});
test('CAS mismatch automatically forks once without rebasing or overwriting the conflicting record',async()=>{
 const h=fixture();h.session.reset({documentId:h.snapshot.document.id});const a=await h.session.save({...h.snapshot,expectedRevision:null});const before=structuredClone(h.records.get(a.recovery.recordId));
 const b=await h.session.save({...h.snapshot,expectedRevision:null});assert.notEqual(b.recovery.recordId,a.recovery.recordId);assert.deepEqual(h.records.get(a.recovery.recordId),before);assert.deepEqual(b.document,h.snapshot.document);
 const c=await h.session.save({...h.snapshot,expectedRevision:b.revision});assert.equal(c.recovery.recordId,b.recovery.recordId);
});
test('fresh copy persists before activation without touching input IDs, assets, metadata or binding',async()=>{
 const h=fixture(),before=structuredClone(h.snapshot);h.session.reset({documentId:before.document.id});const binding=h.session.getState();
 const fresh=await h.session.createFresh(h.snapshot);assert.deepEqual(h.session.getState(),binding);assert.deepEqual(h.snapshot,before);assert.deepEqual(fresh.record.document,before.document);assert.deepEqual(fresh.record.assets,before.assets);
 assert.equal(h.session.activate(fresh.descriptor),true);assert.equal(h.session.getState().recordId,fresh.descriptor.recordId);assert.equal(h.session.getState().revision,fresh.record.revision);
});
test('quota failure never changes binding and latest remains original',async()=>{
 const h=fixture();h.session.reset({documentId:h.snapshot.document.id});const a=await h.session.save({...h.snapshot,expectedRevision:null}),before=h.session.getState();h.quota();
 await assert.rejects(h.session.createFresh(h.snapshot),{code:'QUOTA'});assert.deepEqual(h.session.getState(),before);assert.deepEqual(await h.session.loadCurrentRecord(),a);
});
test('cancel/reset fence delayed fresh activation and old-save binding updates',async()=>{
 const h=fixture();let release;h.gate(new Promise(resolve=>release=resolve));h.session.reset({documentId:h.snapshot.document.id});const fresh=h.session.createFresh(h.snapshot),saving=h.session.save({...h.snapshot,expectedRevision:null});
 h.session.reset({documentId:h.snapshot.document.id});const binding=h.session.getState();release();const result=await fresh;await saving;assert.equal(h.session.activate(result.descriptor),false);assert.deepEqual(h.session.getState(),binding);assert.equal(h.records.has(result.descriptor.recordId),true);
 const next=await h.session.createFresh(h.snapshot);h.session.cancel();assert.equal(h.session.activate(next.descriptor),false);
});
test('two sessions restoring the same backup always save into fresh independent branches',async()=>{
 const h=fixture();h.session.reset({documentId:h.snapshot.document.id});const a=await h.session.save({...h.snapshot,expectedRevision:null}),restored=await h.session.loadRecord(a.recovery.recordId);
 const original=structuredClone(h.records.get(a.recovery.recordId)),second=createManualRecoverySession(h.options);
 h.session.reset({documentId:restored.document.id,record:restored});second.reset({documentId:restored.document.id,record:restored});
 const b=await h.session.save({...h.snapshot,expectedRevision:h.session.getState().revision}),c=await second.save({...h.snapshot,expectedRevision:second.getState().revision});
 assert.notEqual(b.recovery.recordId,a.recovery.recordId);assert.notEqual(c.recovery.recordId,a.recovery.recordId);assert.notEqual(b.recovery.recordId,c.recovery.recordId);assert.deepEqual(h.records.get(a.recovery.recordId),original);assert.deepEqual(b.document,h.snapshot.document);assert.deepEqual(c.document,h.snapshot.document);
});
test('normal existing record restore ignores legacy resume flag and starts at null revision',async()=>{
 const h=fixture(),original=prepareDocumentRecord({...h.snapshot,expectedRevision:null},null,{revision:'original'});h.records.set(original.id,original);
 h.session.reset({documentId:original.id,record:original});assert.equal(h.session.getState().revision,null);await h.session.save({...h.snapshot,expectedRevision:null});
 h.session.reset({documentId:original.id,record:original,independent:false});assert.equal(h.session.getState().revision,null);assert.notEqual((await h.session.save({...h.snapshot,expectedRevision:null})).recovery.recordId,original.id);assert.deepEqual(h.records.get(original.id),original);
});
test('absent versus empty extensions restored exactly and opaque marker key is never overwritten',async()=>{
 for(const extension of [undefined,{}]){const h=fixture();if(extension===undefined)delete h.snapshot.document.extensions;else h.snapshot.document.extensions=extension;h.session.reset({documentId:h.snapshot.document.id});assert.deepEqual((await h.session.save({...h.snapshot,expectedRevision:null})).document,h.snapshot.document);}
 const h=fixture();h.snapshot.document.extensions['ldsManualRecovery:recovery-1']={opaque:true};h.session.reset({documentId:h.snapshot.document.id});await assert.rejects(h.session.save({...h.snapshot,expectedRevision:null}),{code:'RECOVERY_MARKER_COLLISION'});assert.equal(h.records.size,0);
});
test('backup root ID may not collide with structural IDs and legacy records remain exact',async()=>{
 const h=fixture(),session=createManualRecoverySession({...h.options,createId:()=>h.snapshot.document.pages[0].id});session.reset({documentId:h.snapshot.document.id});await assert.rejects(session.save({...h.snapshot,expectedRevision:null}),{code:'INVALID_RECOVERY_ID'});
 const original=prepareDocumentRecord({...h.snapshot,expectedRevision:null},null,{revision:'legacy'});h.records.set(original.id,original);const loaded=await h.session.loadRecord(original.id);assert.deepEqual(loaded.document,original.document);assert.equal(loaded.recovery.recordId,original.id);
});
test('persistent UUID collision retries once and never overwrites either existing record',async()=>{
 const h=fixture();for(const id of ['recovery-1','recovery-2'])h.records.set(id,prepareDocumentRecord({document:{...h.snapshot.document,id},assets:h.snapshot.assets,expectedRevision:null},null,{revision:'existing'}));
 const before=structuredClone([...h.records]);let calls=0;const session=createManualRecoverySession({...h.options,saveDocument:value=>{calls++;return h.options.saveDocument(value);}});session.reset({documentId:h.snapshot.document.id});const binding=session.getState();
 await assert.rejects(session.save({...h.snapshot,expectedRevision:null}),{code:'CONFLICT'});assert.equal(calls,2);assert.deepEqual([...h.records],before);assert.deepEqual(session.getState(),binding);
});
test('replacement during failed first write fences automatic fork before any retry',async()=>{
 const h=fixture(),gate=deferred();let calls=0;const session=createManualRecoverySession({...h.options,saveDocument:async()=>{calls++;await gate.promise;throw Object.assign(new Error('collision'),{code:'CONFLICT'});}});
 session.reset({documentId:h.snapshot.document.id});const saving=session.save({...h.snapshot,expectedRevision:null});session.reset({documentId:h.snapshot.document.id});const binding=session.getState();gate.resolve();
 await assert.rejects(saving,{code:'STALE_RECOVERY'});assert.equal(calls,1);assert.deepEqual(session.getState(),binding);
});
test('replacement during fork commit keeps additive old snapshot without changing new binding',async()=>{
 const h=fixture(),gate=deferred();let calls=0;const session=createManualRecoverySession({...h.options,saveDocument:async value=>{if(++calls===1)throw Object.assign(new Error('collision'),{code:'CONFLICT'});await gate.promise;return h.options.saveDocument(value);}});
 session.reset({documentId:h.snapshot.document.id});const saving=session.save({...h.snapshot,expectedRevision:null});await tick();assert.equal(calls,2);session.reset({documentId:h.snapshot.document.id});const binding=session.getState();gate.resolve();
 const old=await saving;assert.notEqual(old.recovery.recordId,binding.recordId);assert.deepEqual(session.getState(),binding);assert.deepEqual(old.document,h.snapshot.document);assert.equal(h.records.size,1);
});
test('autosave preserves newest pending snapshot during automatic fork and commits it on new revision',async()=>{
 const h=fixture(),gate=deferred(),before=structuredClone(h.snapshot);let calls=0;
 const session=createManualRecoverySession({...h.options,saveDocument:async value=>{calls++;if(calls===1){await gate.promise;throw Object.assign(new Error('collision'),{code:'CONFLICT'});}return h.options.saveDocument(value);}});
 const controller=createAutosaveController({save:value=>session.save(value)});session.reset({documentId:h.snapshot.document.id});controller.reset({documentId:h.snapshot.document.id});
 controller.schedule(h.snapshot);const first=controller.flush();await tick();controller.schedule({...h.snapshot,document:{...h.snapshot.document,title:'newest pending edit'}});const latest=controller.flush();gate.resolve();
 assert.equal(await first,true);assert.equal(await latest,true);assert.equal(calls,3);assert.equal(h.records.size,1);assert.equal(h.records.get(session.getState().recordId).document.title,'newest pending edit');assert.deepEqual(h.snapshot,before);assert.equal(controller.getState().error,null);assert.equal(controller.getState().revision,session.getState().revision);controller.dispose();
});
