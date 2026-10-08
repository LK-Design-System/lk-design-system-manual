import test from 'node:test';import assert from 'node:assert/strict';
import {createManualFileSession,getManualFileCapabilities} from '../src/redesign/manual-file-session.mjs';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fileHandle(name='document.manual.json',{writeGate,failWrite,closeGate}={}){
 let bytes='',written='',creates=0,aborts=0,closes=0;
 const handle={name,getFile:async()=>({name,text:async()=>bytes}),createWritable:async()=>{creates++;return {write:async value=>{written=value;if(writeGate)await writeGate.promise;if(failWrite)throw new Error('disk write failed');},close:async()=>{if(closeGate)await closeGate.promise;bytes=written;closes++;},abort:async()=>{aborts++;}};}};
 return {handle,setBytes:value=>bytes=value,state:()=>({bytes,written,creates,aborts,closes})};
}
function harness(options={}){
 const document=createEmptyManualDocument();document.extensions={opaque:{keep:[null,'한글😀']}};let current={document,assets:{'assets/a.png':'data:image/png;base64,AAAA'},token:{}},generation=1;
 const events=[],errors=[],saved=[],downloads=[];const session=createManualFileSession({capture:()=>({...current,token:{reference:current.token,generation}}),isCurrent:token=>token.reference===current.token,isActive:token=>token.generation===generation,onStatus:x=>events.push(x),onSaved:x=>saved.push(x),onError:x=>errors.push(x),download:async x=>downloads.push(x),...options});
 return {session,document,events,errors,saved,downloads,get:()=>current,edit:title=>{current={...current,document:{...current.document,title},token:{}};},replace(){generation++;current={document:createEmptyManualDocument(),assets:{},token:{}};session.reset();}};
}
test('feature detection requires secure context and public picker methods only',()=>{
 assert.deepEqual(getManualFileCapabilities({isSecureContext:true,showOpenFilePicker(){},showSaveFilePicker(){}}),{open:true,save:true});assert.deepEqual(getManualFileCapabilities({isSecureContext:false,showOpenFilePicker(){},showSaveFilePicker(){}}),{open:false,save:false});
});
test('first Save picker starts synchronously, close commits codec bytes and repeated Save writes same file',async()=>{
 const file=fileHandle(),calls=[],h=harness({pickSave:options=>{calls.push(options);return Promise.resolve(file.handle);}});const first=h.session.save();assert.equal(calls.length,1);assert.equal(calls[0].suggestedName.endsWith('.manual.json'),true);assert.equal((await first).status,'saved');assert.deepEqual(decodeDocumentFile(file.state().bytes),{document:h.get().document,assets:h.get().assets});
 h.edit('next');assert.equal((await h.session.save()).status,'saved');assert.equal(calls.length,1);assert.equal(file.state().creates,2);assert.equal(decodeDocumentFile(file.state().bytes).document.title,'next');
});
test('Save As always picks a new file; failed or cancelled picker never changes old binding',async()=>{
 const a=fileHandle('a.manual.json'),b=fileHandle('b.manual.json'),choice=deferred();let picked=0;const h=harness({pickSave:()=>{picked++;return choice.promise;}});h.session.reset({handle:a.handle});const saveAs=h.session.saveAs();assert.equal(picked,1);choice.resolve(b.handle);assert.equal((await saveAs).status,'saved');assert.equal(h.session.getState().fileName,'b.manual.json');assert.equal(a.state().creates,0);
 const cancel=harness({pickSave:()=>Promise.reject(Object.assign(new Error('cancel'),{name:'AbortError'}))});cancel.session.reset({handle:a.handle});assert.equal((await cancel.session.saveAs()).status,'cancelled');assert.equal(cancel.session.getState().fileName,'a.manual.json');assert.equal(cancel.saved.length,0);assert.equal(cancel.errors.length,0);
});
test('Open preserves actual file IDs/opaque bytes and leaves binding unchanged until caller accepts candidate',async()=>{
 const file=fileHandle(),h=harness({pickOpen:()=>Promise.resolve([file.handle])}),original=structuredClone(h.get());file.setBytes(encodeDocumentFile(original));const result=await h.session.open();assert.equal(result.status,'opened');assert.equal(result.document.id,original.document.id);assert.deepEqual(result.assets,original.assets);assert.equal(h.session.getState().bound,false);h.session.reset({handle:result.handle});assert.equal(h.session.getState().bound,true);
});
test('Open cancel/malformed file or late document replacement never installs or binds content',async()=>{
 const gate=deferred(),file=fileHandle(),h=harness({pickOpen:()=>gate.promise});const opening=h.session.open();h.replace();file.setBytes(encodeDocumentFile(h.get()));gate.resolve([file.handle]);assert.equal((await opening).status,'stale');assert.equal(h.session.getState().bound,false);
 const malformed=harness({pickOpen:()=>Promise.resolve([file.handle])});file.setBytes('{');assert.equal((await malformed.session.open()).status,'error');assert.equal(malformed.session.getState().bound,false);assert.equal(malformed.saved.length,0);
});
test('editing during file write keeps newer content dirty through current:false snapshot acknowledgement',async()=>{
 const gate=deferred(),file=fileHandle('a.manual.json',{writeGate:gate}),h=harness();h.session.reset({handle:file.handle});const saving=h.session.save();await tick();h.edit('late edit');gate.resolve();const result=await saving;assert.equal(result.status,'saved');assert.equal(result.current,false);assert.notEqual(decodeDocumentFile(file.state().bytes).document.title,h.get().document.title);assert.equal(h.saved[0].current,false);
});
test('single writer serializes queued Save and shares fresh pending picker without duplicate prompts',async()=>{
 const gate=deferred(),file=fileHandle('a.manual.json',{writeGate:gate});let picks=0;const h=harness({pickSave:()=>{picks++;return Promise.resolve(file.handle);}});const first=h.session.save();await tick();h.edit('second');const second=h.session.save();await tick();assert.equal(file.state().creates,1);assert.equal(picks,1);gate.resolve();assert.equal((await first).status,'saved');assert.equal((await second).status,'saved');assert.equal(file.state().creates,2);assert.equal(decodeDocumentFile(file.state().bytes).document.title,'second');
});
test('document replacement before close aborts stale stream and does not bind file or announce saved',async()=>{
 const gate=deferred(),file=fileHandle('a.manual.json',{writeGate:gate}),h=harness();h.session.reset({handle:file.handle});const saving=h.session.save();await tick();h.replace();gate.resolve();assert.equal((await saving).status,'stale');assert.equal(file.state().aborts,1);assert.equal(file.state().closes,0);assert.equal(file.state().bytes,'');assert.equal(h.saved.length,0);assert.equal(h.session.getState().bound,false);
});
test('write failure aborts stream and retains old file binding and unsaved snapshot',async()=>{
 const file=fileHandle('a.manual.json',{failWrite:true}),h=harness();h.session.reset({handle:file.handle});h.edit('unsaved');assert.equal((await h.session.save()).status,'error');assert.equal(file.state().aborts,1);assert.equal(file.state().closes,0);assert.equal(h.saved.length,0);assert.equal(h.session.getState().fileName,'a.manual.json');assert.equal(h.get().document.title,'unsaved');assert.equal(h.errors.length,1);
});
test('unsupported save requests portable download without falsely clearing dirty or binding a file',async()=>{
 const h=harness({surface:{isSecureContext:false}});assert.equal((await h.session.save()).status,'download-requested');assert.equal(h.downloads.length,1);assert.equal(h.downloads[0].mime,'application/json');assert.equal(h.downloads[0].fileName.endsWith('.manual.json'),true);assert.deepEqual(decodeDocumentFile(h.downloads[0].bytes),{document:h.get().document,assets:h.get().assets});assert.equal(h.saved.length,0);assert.equal(h.session.getState().bound,false);assert.equal((await h.session.open()).status,'unsupported');
});
test('disabled/compose guard blocks picker and disposed session suppresses late picker result',async()=>{
 let picks=0;const blocked=harness({isEnabled:()=>false,pickSave:()=>{picks++;}});assert.equal((await blocked.session.save()).status,'blocked');assert.equal(picks,0);
 const gate=deferred(),file=fileHandle(),h=harness({pickSave:()=>gate.promise});const saving=h.session.save();h.session.dispose();gate.resolve(file.handle);assert.equal((await saving).status,'stale');assert.equal(file.state().creates,0);assert.equal(h.saved.length,0);
});
test('replacement during close cannot roll back the old commit but never marks the replacement document saved',async()=>{
 const gate=deferred(),file=fileHandle('a.manual.json',{closeGate:gate}),h=harness();h.session.reset({handle:file.handle});const saving=h.session.save();await tick();h.replace();gate.resolve();const result=await saving;assert.equal(result.status,'stale');assert.equal(result.written,true);assert.equal(file.state().closes,1);assert.equal(h.saved.length,0);assert.equal(h.session.getState().bound,false);
});
test('failed Save As keeps previous binding and does not acknowledge or alter current document',async()=>{
 const old=fileHandle('old.manual.json'),next=fileHandle('new.manual.json',{failWrite:true}),h=harness({pickSave:()=>Promise.resolve(next.handle)});h.session.reset({handle:old.handle});const before=structuredClone(h.get());assert.equal((await h.session.saveAs()).status,'error');assert.equal(h.session.getState().fileName,'old.manual.json');assert.deepEqual(h.get(),before);assert.equal(old.state().creates,0);assert.equal(h.saved.length,0);
});
test('public runtime mode and callbacks distinguish native commit from download request',async()=>{
 const file=fileHandle(),native=harness({pickSave:()=>Promise.resolve(file.handle)}),fallback=harness({surface:{isSecureContext:true}});assert.equal(native.session.getCapabilities().mode,'native');assert.equal(fallback.session.getCapabilities().mode,'download');const result=await native.session.save();assert.equal(result.handle,file.handle);assert.equal(native.saved[0].handle,file.handle);assert.equal(native.saved[0].current,true);
});
test('stale picker after replacement performs no write and a denied createWritable remains an explicit failure',async()=>{
 const gate=deferred(),file=fileHandle(),h=harness({pickSave:()=>gate.promise});const saving=h.session.save();h.replace();gate.resolve(file.handle);assert.equal((await saving).status,'stale');assert.equal(file.state().creates,0);
 const denied=harness();denied.session.reset({handle:{name:'denied.manual.json',createWritable:async()=>{throw Object.assign(new Error('write permission denied'),{name:'NotAllowedError'});}}});assert.equal((await denied.session.save()).status,'error');assert.equal(denied.errors[0].error.name,'NotAllowedError');assert.equal(denied.saved.length,0);assert.equal(denied.session.getState().bound,true);
});
