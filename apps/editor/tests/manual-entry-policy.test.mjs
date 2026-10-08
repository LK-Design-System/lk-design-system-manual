import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {resolveManualEntry,startManualEntry} from '../src/manual-entry-policy.mjs';
test('ordinary root/index uses canonical manual on the same origin without copying flags or secrets',()=>{
 for(const path of ['/','/index.html','/?editor=1','/index.html?ui=old#outline','/index.html?token=query-unsupported']){
  assert.deepEqual(resolveManualEntry({href:'http://127.0.0.1:44589'+path}),{kind:'manual',href:'http://127.0.0.1:44589/manual.html'});
 }
});
test('explicit v1 compatibility, bootstrap memory session and existing fragment session keep v1 entry',()=>{
 for(const value of [{href:'http://localhost/index.html?legacy=1'},{href:'http://localhost/',session:{token:'synthetic-memory-token'}},{href:'http://localhost/#token=synthetic-fragment-token'}])assert.deepEqual(resolveManualEntry(value),{kind:'legacy'});
 assert.equal(resolveManualEntry({href:'http://localhost/?legacy=0#token=',session:{token:''}}).kind,'manual');
});
test('subdirectory entry resolves adjacent canonical page without changing port',()=>{
 assert.equal(resolveManualEntry({href:'http://127.0.0.1:4000/editor/index.html'}).href,'http://127.0.0.1:4000/editor/manual.html');
});
test('router never mounts old editor before redirect and compatibility never navigates',async()=>{
 const calls=[];await startManualEntry({location:{href:'http://localhost/',replace:href=>calls.push(['replace',href])},loadLegacy:()=>calls.push(['loadLegacy'])});assert.deepEqual(calls,[['replace','http://localhost/manual.html']]);
 calls.length=0;await startManualEntry({location:{href:'http://localhost/?legacy=1',replace:href=>calls.push(['replace',href])},loadLegacy:()=>calls.push(['loadLegacy'])});assert.deepEqual(calls,[['loadLegacy']]);
});

test('actual bootstrap receiver precedes index router and restores the legacy host branch',async()=>{
 const {createBootstrap}=await import('../server/bootstrap.mjs');
 const {runInNewContext}=await import('node:vm');
 const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const bootstrap=createBootstrap({token:'synthetic-host-token'}),decorated=bootstrap.decorateHTML(Buffer.from(index)).toString();
 assert.ok(decorated.indexOf('src="/bootstrap/session.js"')<decorated.indexOf('src="./src/index-main.mjs"'));
 let receiver='';const response={writeHead(){},end:value=>{receiver=value;}};
 await bootstrap.handle({method:'GET',headers:{'sec-fetch-site':'same-origin','sec-fetch-dest':'script'}},response,new URL('http://localhost:44589/bootstrap/session.js'),'http://localhost:44589');
 const session={contract:'lds-manual-editor-bootstrap/v1',baseUrl:'http://localhost:44589',token:'synthetic-host-token'};
 const context={sessionStorage:{getItem:()=>JSON.stringify(session)}};runInNewContext(receiver,context);
 assert.equal(resolveManualEntry({href:'http://localhost:44589/',session:context.__LDS_MANUAL_SESSION}).kind,'legacy');
 const wrongOrigin={sessionStorage:{getItem:()=>JSON.stringify({...session,baseUrl:'http://localhost:44590'})}};runInNewContext(receiver,wrongOrigin);
 assert.equal(resolveManualEntry({href:'http://localhost:44589/',session:wrongOrigin.__LDS_MANUAL_SESSION}).kind,'manual');
});
