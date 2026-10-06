import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createStore, sha } from '../storage.mjs';
import { startHost } from '../host.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
const hostPath=path.resolve(here,'../host.mjs'), worker=path.join(here,'fault-worker.mjs');
const original={schemaVersion:1,title:'합성 시험 문서',future:{preserved:true},pages:[{title:'결과 확인',blocks:[{type:'paragraph',text:'화면의 결과를 확인합니다.',future:{unknown:'그대로'}}]}]};
const sources={reviewStatus:'approved',reviews:[{reviewer:'합성 담당자',result:'approved',future:'keep'}],unknown:{nested:true}};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH1sAAAAASUVORK5CYII=','base64');
async function fixture(t){const root=await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()),'lds-manual-editor-test-'));await fs.writeFile(path.join(root,'manual.json'),JSON.stringify(original));await fs.writeFile(path.join(root,'sources.json'),JSON.stringify(sources));t.after(async()=>{assert.ok(path.basename(root).startsWith('lds-manual-editor-test-'));assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));await fs.rm(root,{recursive:true,force:true});});return root;}
async function childRun(args){const child=spawn(process.execPath,args,{windowsHide:true,stdio:['ignore','pipe','pipe'],shell:false});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});return{code,stdout,stderr};}
async function processHost(root){const child=spawn(process.execPath,[hostPath,'--root',root],{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});let data='',stderr='';child.stderr.on('data',b=>stderr+=b);const ready=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Host startup timeout')),5000);child.stdout.on('data',b=>{data+=b;const line=data.split('\n')[0];try{const value=JSON.parse(line);clearTimeout(timer);resolve(value);}catch{}});child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(new Error(`Host exited ${code}: ${stderr}`));});});const session=JSON.parse(await fs.readFile(ready.sessionPath));return{...ready,token:session.token,stop:async()=>{child.kill();await new Promise(resolve=>child.once('exit',resolve));}};}
const request=async(h,route,body,extra={})=>{const response=await fetch(h.baseUrl+route,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${h.token}`,Origin:h.baseUrl,...(body?{'Content-Type':'application/json'}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,data:await response.json()};};

test('real HTTP disk save, process shutdown/restart, unknown document/sidecar preservation',async t=>{
 const root=await fixture(t);let host=await processHost(root);
 try{const loaded=await request(host,'/api/document');assert.equal(loaded.status,200);const document=structuredClone(loaded.data.document);document.pages[0].blocks[0].text='수정한 결과를 확인합니다.';
 const saved=await request(host,'/api/save',{expectedRevision:loaded.data.revision,document,sources:{reviewStatus:'in-review'}});assert.equal(saved.status,200);assert.deepEqual(saved.data.sources.unknown,sources.unknown);assert.deepEqual(saved.data.sources.reviews,sources.reviews);assert.deepEqual(saved.data.document.future,original.future);assert.equal(saved.data.review.product.current,false);
 await host.stop();host=await processHost(root);const reopened=await request(host,'/api/document');assert.deepEqual(reopened.data.document,document);assert.deepEqual(reopened.data.sources.reviews,sources.reviews);
 }finally{await host.stop();}
});
test('external document and asset conflicts are not overwritten',async t=>{
 const root=await fixture(t),store=await createStore({root});const initial=await store.load();await fs.writeFile(path.join(root,'manual.json'),JSON.stringify({...original,title:'외부 수정'}));await assert.rejects(store.save({expectedRevision:initial.revision,document:original}),e=>e.code==='CONFLICT');assert.equal(JSON.parse(await fs.readFile(path.join(root,'manual.json'))).title,'외부 수정');
 const current=await store.load();const asset=await store.importAsset({expectedRevision:current.revision,name:'화면.png',bytesBase64:png.toString('base64')});const newer=await store.load();await fs.writeFile(path.join(root,asset.src),Buffer.concat([png,Buffer.from('external')]));await assert.rejects(store.draft({expectedRevision:newer.revision,document:original}),e=>e.code==='CONFLICT');
});
test('unfinished draft remains separate; invalid canonical save rejected',async t=>{
 const root=await fixture(t),store=await createStore({root}),loaded=await store.load();const before=await fs.readFile(path.join(root,'manual.json'));const doc={...original,title:''};await store.draft({expectedRevision:loaded.revision,document:doc,editorState:{selected:['pages',0]}});await assert.rejects(store.save({expectedRevision:loaded.revision,document:doc}),e=>e.code==='INVALID_DOCUMENT');const reopen=await(await createStore({root})).load();assert.equal(reopen.draft.document.title,'');assert.deepEqual(await fs.readFile(path.join(root,'manual.json')),before);assert.equal(reopen.revision,loaded.revision);
});
test('interrupted staged/prepared/partially applied writes recover across a real process exit',async t=>{
 for(const point of ['staged','prepared','applied:manual.json','applied:sources.json']){const root=await fixture(t);const result=await childRun([worker,root,point]);assert.equal(result.code,73,result.stderr);const reopened=await(await createStore({root})).load();assert.equal(reopened.document.title,point==='staged'?original.title:'저장 후 제목');assert.deepEqual(reopened.sources.unknown,sources.unknown);assert.deepEqual(reopened.sources.reviews,sources.reviews);if(point!=='staged')assert.equal(reopened.recovery.outcome,'completed-prepared-save');}
});
test('damaged prepared generation rolls back, concurrent external recovery change blocks',async t=>{
 const root=await fixture(t);assert.equal((await childRun([worker,root,'applied:manual.json'])).code,73);const journal=JSON.parse(await fs.readFile(path.join(root,'.editor/transaction.json')));await fs.writeFile(path.join(root,`.editor/generations/${journal.next.id}/sources.json`),'damaged');const rolled=await(await createStore({root})).load();assert.equal(rolled.document.title,original.title);assert.equal(rolled.recovery.outcome,'restored-previous-generation');
 const root2=await fixture(t);await childRun([worker,root2,'applied:manual.json']);await fs.writeFile(path.join(root2,'sources.json'),JSON.stringify({external:true}));await assert.rejects((await createStore({root:root2})).load(),e=>e.code==='RECOVERY_CONFLICT');assert.deepEqual(JSON.parse(await fs.readFile(path.join(root2,'sources.json'))),{external:true});
});
test('asset originals, collision-free names, missing paths, traversal and crop intrinsic sizes',async t=>{
 const root=await fixture(t),store=await createStore({root});const first=await store.importAsset({expectedRevision:(await store.load()).revision,name:'same.png',bytesBase64:png.toString('base64')});const second=await store.importAsset({expectedRevision:first.revision,name:'same.png',bytesBase64:png.toString('base64')});assert.notEqual(first.src,second.src);assert.equal(sha(await fs.readFile(path.join(root,first.src))),sha(png));
 const doc=structuredClone(original);doc.pages[0].blocks.push({type:'figure',src:first.src,alt:'합성 한 픽셀',caption:'자산 바이트 보존 시험',crop:{x:0,y:0,width:1,height:1,sourceWidth:2,sourceHeight:1}});const invalid=await store.validate(doc);assert.equal(invalid.valid,false);assert.match(invalid.errors[0].message,/dimensions/);doc.pages[0].blocks[1].crop.sourceWidth=1;assert.equal((await store.validate(doc)).valid,true);doc.pages[0].blocks[1].src='../outside.png';assert.equal((await store.validate(doc)).valid,false);await assert.rejects(store.resolve('../manual.json'),e=>e.code==='PATH_ESCAPE');doc.pages[0].blocks[1].src='assets/missing.png';assert.ok((await store.validate(doc)).errors.some(e=>e.code==='MISSING_ASSET'));
});
test('HTTP requires session, exact loopback origin, fixed methods and closed paths',async t=>{
 const root=await fixture(t),host=await startHost({root});try{assert.equal((await fetch(host.baseUrl+'/api/document')).status,401);assert.equal((await request(host,'/api/document',null,{Origin:'https://other.invalid'})).status,403);const wrongHost=await new Promise((resolve,reject)=>{http.get(host.baseUrl+'/api/document',{headers:{Host:'evil.invalid',Authorization:`Bearer ${host.token}`}},r=>{r.resume();resolve(r.statusCode);}).once('error',reject);});assert.equal(wrongHost,403);assert.equal((await request(host,'/api/asset?src=../manual.json')).status,400);assert.equal((await request(host,'/api/asset?src=.editor/host-session.json')).status,404);assert.equal((await request(host,'/api/arbitrary-shell',{})).status,404);assert.equal((await fetch(host.baseUrl+'/api/save',{method:'POST',headers:{Authorization:`Bearer ${host.token}`,'Content-Type':'application/json'},body:'{}'})).status,403);}finally{await host.close();}
});
test('existing copy review becomes stale after edit without changing its original record',async t=>{
 const root=await fixture(t),store=await createStore({root});const review={schemaVersion:1,contract:'lds-manual-copy-review/v1',unknown:{keep:true},reviewer:'합성 검토자',reviewedAt:'2026-10-05',ruleset:'synthetic',audience:'test',reviewKind:'contextual-agent-review',documentHash:'old',sets:[]};await fs.writeFile(path.join(root,'copy-review.json'),JSON.stringify(review));const old=await fs.readFile(path.join(root,'copy-review.json'));const loaded=await store.load();const changed={...original,title:'변경'};const saved=await store.save({expectedRevision:loaded.revision,document:changed});assert.equal(saved.review.copy.current,false);assert.deepEqual(await fs.readFile(path.join(root,'copy-review.json')),old);assert.deepEqual(saved.copyReview.unknown,review.unknown);
});
test('one live host per root and symlink asset/internal paths cannot leave selected root',async t=>{
 const root=await fixture(t),outside=await fixture(t),host=await startHost({root});
 try{await assert.rejects(startHost({root}),e=>e.code==='HOST_LOCK');}finally{await host.close();}
 const next=await startHost({root});await next.close();
 const existingSession=path.join(root,'existing-session.json');await fs.writeFile(existingSession,'preserve');await assert.rejects(startHost({root,sessionFile:existingSession}),e=>e.code==='EEXIST');assert.equal(await fs.readFile(existingSession,'utf8'),'preserve');const retry=await startHost({root});await retry.close();
 await fs.symlink(outside,path.join(root,'assets'),process.platform==='win32'?'junction':'dir');
 try{const store=await createStore({root});await assert.rejects(store.load(),e=>e.code==='SYMLINK');await assert.rejects(store.resolve('assets/manual.json'),e=>e.code==='SYMLINK');assert.equal(JSON.parse(await fs.readFile(path.join(outside,'manual.json'))).title,original.title);}finally{await fs.unlink(path.join(root,'assets'));}
});
test('fixed same-origin A4 preview is embeddable; editor/API remain restricted',async t=>{
 const root=await fixture(t),ui=path.join(root,'ui');await fs.mkdir(ui);await fs.writeFile(path.join(ui,'index.html'),'<iframe src="preview.html"></iframe>');await fs.writeFile(path.join(ui,'preview.html'),'<p>Synthetic A4 preview entry</p>');const host=await startHost({root,ui});
 try {
  const home=await fetch(host.baseUrl+'/');assert.match(home.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.match(home.headers.get('content-security-policy'),/frame-src 'self' blob:/);await home.text();
  const preview=await fetch(host.baseUrl+'/preview.html');assert.equal(preview.status,200);assert.match(preview.headers.get('content-security-policy'),/frame-ancestors 'self'/);assert.equal(preview.headers.get('x-frame-options'),'SAMEORIGIN');assert.match(preview.headers.get('content-security-policy'),/object-src 'none'/);await preview.text();
  const outside=await fetch(host.baseUrl+'/preview.html',{headers:{Origin:'https://other.invalid'}});assert.equal(outside.status,403);await outside.text();
  const api=await fetch(host.baseUrl+'/api/document',{headers:{Authorization:`Bearer ${host.token}`}});assert.match(api.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.equal(api.status,200);await api.text();assert.equal((await fetch(host.baseUrl+'/api/document')).status,401);
 } finally {await host.close();}
});
