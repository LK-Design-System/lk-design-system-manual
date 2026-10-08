import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutosaveController} from '../src/redesign/autosave-controller.mjs';
import {createManualRecoverySession} from '../src/redesign/manual-recovery-session.mjs';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {prepareDocumentRecord} from '../src/redesign/document-store.mjs';

test('same-ID reset between pump and invocation never writes old snapshot to new recovery binding',async()=>{
 const document=createEmptyManualDocument(),records=new Map(),calls=[],saved=[];let ids=0;
 const recovery=createManualRecoverySession({createId:()=>`backup-${++ids}`,loadDocument:async id=>records.get(id),saveDocument:async value=>{calls.push(value);const record=prepareDocumentRecord(value,records.get(value.document.id),{revision:`revision-${calls.length}`});records.set(record.id,record);return record;}});
 const controller=createAutosaveController({save:value=>recovery.save(value),onSaved:record=>saved.push(record)});
 recovery.reset({documentId:document.id});controller.reset({documentId:document.id});
 controller.schedule({document:{...document,title:'old content'},assets:{}});const oldFlush=controller.flush();
 // Keep this in the same synchronous task: save has not entered its microtask.
 const binding=recovery.reset({documentId:document.id});controller.reset({documentId:document.id});
 controller.schedule({document:{...document,title:'replacement content'},assets:{}});const newFlush=controller.flush();
 assert.equal(await oldFlush,false);assert.equal(await newFlush,true);
 assert.equal(calls.length,1);assert.equal(calls[0].document.title,'replacement content');assert.equal(calls[0].document.id,binding.recordId);assert.equal(records.has('backup-1'),false);assert.equal(records.get(binding.recordId).document.title,'replacement content');assert.equal(saved.length,1);assert.equal(saved[0].document.id,document.id);assert.equal(controller.getState().error,null);controller.dispose();
});
test('dispose between pump and invocation prevents storage entry and settles the waiter',async()=>{
 let calls=0;const controller=createAutosaveController({save:async()=>{calls++;return {revision:'unexpected'};}});
 controller.reset({documentId:'document'});controller.schedule({document:{id:'document'},assets:{}});const flushed=controller.flush();controller.dispose();
 assert.equal(await flushed,false);await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,0);
});
