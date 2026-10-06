import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {startHost} from '../host.mjs';
import {sha,createStore} from '../storage.mjs';
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50"/></svg>';
const document={schemaVersion:1,title:'합성 검증',pages:[{title:'확인',blocks:[{type:'figure',src:'assets/source.svg',alt:'합성 그림',caption:'합성',crop:{x:0,y:0,width:50,height:25,sourceWidth:100,sourceHeight:50}}]}]};
async function fixture(t){const temp=await fs.realpath(os.tmpdir()),root=await fs.mkdtemp(path.join(temp,'lds-validate-test-'));await fs.mkdir(path.join(root,'assets'));await fs.writeFile(path.join(root,'manual.json'),JSON.stringify(document));await fs.writeFile(path.join(root,'sources.json'),'{"reviewStatus":"approved"}');await fs.writeFile(path.join(root,'assets/source.svg'),svg);t.after(async()=>{assert.equal(path.dirname(root),temp);assert.ok(path.basename(root).startsWith('lds-validate-test-'));await fs.rm(root,{recursive:true,force:true});});return root;}
async function tree(root){const result={};async function walk(dir,rel=''){for(const e of await fs.readdir(dir,{withFileTypes:true})){const name=rel+e.name;if(e.isDirectory())await walk(path.join(dir,e.name),name+'/');else result[name]=sha(await fs.readFile(path.join(dir,e.name)));}}await walk(root);return result;}
async function post(host,revision,doc,extra={}){const r=await fetch(host.baseUrl+'/api/validate',{method:'POST',headers:{Authorization:`Bearer ${host.token}`,Origin:host.baseUrl,'Content-Type':'application/json',...extra},body:JSON.stringify({expectedRevision:revision,document:doc})});return {status:r.status,body:await r.json()};}
test('draft validation reports actual assets/crop/schema errors without writing any root file',async t=>{
 const root=await fixture(t),host=await startHost({root});try{
 const revision=(await host.store.snapshot()).revision,before=await tree(root);
 const valid=await post(host,revision,document);assert.equal(valid.status,200);assert.equal(valid.body.validation.valid,true);assert.deepEqual(valid.body.validation.assets[0].dimensions,{width:100,height:50});assert.equal(valid.body.validation.assets[0].sha256,sha(Buffer.from(svg)));assert.equal(valid.body.validation.assets[0].absolutePath,undefined);assert.equal(valid.body.validation.assets[0].bytes,undefined);
 const wrong=structuredClone(document);wrong.pages[0].blocks[0].crop.sourceWidth=99;const crop=await post(host,revision,wrong);assert.equal(crop.body.validation.valid,false);assert.ok(crop.body.validation.errors.some(e=>e.path==='pages[0].blocks[0].crop'&&e.code==='CROP_SOURCE'));
 delete wrong.pages[0].blocks[0].crop.sourceWidth;assert.ok((await post(host,revision,wrong)).body.validation.errors.some(e=>e.code==='SCHEMA'));
 for(const src of ['assets/missing.svg','../outside.svg','https://other.invalid/image.svg']){wrong.pages[0].blocks[0].src=src;assert.equal((await post(host,revision,wrong)).body.validation.valid,false);}
 assert.equal((await post(host,revision,{pages:{}})).body.validation.valid,false);
 assert.deepEqual(await tree(root),before);
 }finally{await host.close();}
});
test('same src changed original invalidates revision; pending recovery and mid-validation changes do not write',async t=>{
 const root=await fixture(t),store=await createStore({root}),revision=(await store.snapshot()).revision;
 await fs.writeFile(path.join(root,'assets/source.svg'),svg.replace('width="100"','width="101"'));
 const changed=await tree(root);await assert.rejects(store.validateDraft({expectedRevision:revision,document}),e=>e.code==='CONFLICT');assert.deepEqual(await tree(root),changed);
 const fresh=(await store.snapshot()).revision;assert.equal((await store.validateDraft({expectedRevision:fresh,document})).validation.valid,false);
 await fs.mkdir(path.join(root,'.editor'));await fs.writeFile(path.join(root,'.editor/transaction.json'),'{"synthetic":"pending"}');const pending=await tree(root);await assert.rejects(store.validateDraft({expectedRevision:fresh,document}),e=>e.code==='RECOVERY_PENDING');assert.deepEqual(await tree(root),pending);
 await fs.unlink(path.join(root,'.editor/transaction.json'));
 const race=await createStore({root,validateAssets:async()=>{await fs.writeFile(path.join(root,'assets/source.svg'),svg);return [];}});await assert.rejects(race.validateDraft({expectedRevision:fresh,document}),e=>e.code==='CONFLICT');
});
test('read-only POST still requires bearer and exact Host/Origin',async t=>{
 const root=await fixture(t),host=await startHost({root});try{const revision=(await host.store.snapshot()).revision,before=await tree(root);
 assert.equal((await post(host,revision,document,{Authorization:''})).status,401);
 assert.equal((await post(host,revision,document,{Origin:'http://127.0.0.1:1'})).status,403);
 assert.equal((await post(host,revision,document,{Origin:'null'})).status,403);
 assert.equal(await new Promise((resolve,reject)=>{http.get(host.baseUrl+'/api/validate',{headers:{Host:'other.invalid',Authorization:`Bearer ${host.token}`}},r=>{r.resume();resolve(r.statusCode);}).once('error',reject);}),403);
 assert.deepEqual(await tree(root),before);
 }finally{await host.close();}
});
