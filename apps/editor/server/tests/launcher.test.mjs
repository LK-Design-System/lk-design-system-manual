import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {launchManual} from '../../launch.mjs';
import {sha} from '../storage.mjs';

const launcher=fileURLToPath(new URL('../../launch.mjs',import.meta.url));
async function fixture(t) {
  const temp=await fs.realpath(os.tmpdir()),base=await fs.mkdtemp(path.join(temp,'lds-manual-launch-test-')),ui=path.join(base,'ui');
  await fs.mkdir(ui);await fs.writeFile(path.join(ui,'index.html'),'<!doctype html><html><head><title>合成 fixture</title><script type="module" src="/main.js"></script></head><body>합성 launcher fixture</body></html>');await fs.writeFile(path.join(ui,'main.js'),'/* synthetic UI entry */');
  t.after(async()=>{assert.equal(path.dirname(base),temp);assert.ok(path.basename(base).startsWith('lds-manual-launch-test-'));await fs.rm(base,{recursive:true,force:true});});
  return {base,ui,root:path.join(base,'manual')};
}
const bytes=async filename=>fs.readFile(filename);
async function bootstrap(launched) {
  const html=await fs.readFile(launched.ready.launchFile,'utf8'),ticket=html.match(/name="ticket" value="([^"]+)"/)?.[1];
  assert.ok(Boolean(ticket),'Private launch form contains its one-use capability.');
  const origin=launched.ready.baseUrl;
  // Node fetch rewrites Sec-Fetch-Mode to cors. Native http preserves the
  // browser navigation metadata this isolated protocol fixture must exercise.
  const request=(ticketValue=ticket,extra={})=>new Promise((resolve,reject)=>{
    const req=http.request(origin+'/bootstrap/launch',{method:'POST',headers:{Origin:'null','Content-Type':'application/x-www-form-urlencoded','Sec-Fetch-Dest':'document','Sec-Fetch-Mode':'navigate','Sec-Fetch-Site':'cross-site',...extra}},response=>{
      const chunks=[];response.on('data',b=>chunks.push(b));response.once('end',()=>{const headers=new Headers();for(const[k,v]of Object.entries(response.headers))for(const value of Array.isArray(v)?v:[v])if(value!==undefined)headers.append(k,value);resolve(new Response(Buffer.concat(chunks),{status:response.statusCode,headers}));});
    });req.once('error',reject);req.end(new URLSearchParams({ticket:ticketValue}).toString());
  });
  return {html,ticket,origin,request};
}

test('new fixed init and open preserve source, existing new destination refused; no browser action',async t=>{
  const {root,ui}=await fixture(t),title='합성 "새" 문서; & 내용';let selected;
  const launched=await launchManual({mode:'new',root,ui,title,documentVersion:'0.2',openBrowser:true,openFile:async file=>{selected=file;return{operation:'test double, no browser launched'};}});
  const before=await bytes(path.join(root,'manual.json'));const source=await bytes(path.join(root,'sources.json'));const asset=await bytes(path.join(root,'assets/sample.svg'));
  try {
    assert.equal(JSON.parse(before).title,title);assert.equal(JSON.parse(source).reviewStatus,'draft');assert.equal(selected,launched.ready.launchFile);assert.equal(launched.ready.commands[0].exitCode,0);assert.equal(launched.ready.commands[0].operation,'fixed CLI init');
    await assert.rejects(launchManual({mode:'new',root,ui}),e=>e.code==='INIT_FAILED');assert.equal(sha(await bytes(path.join(root,'manual.json'))),sha(before));
    assert.ok(!launched.ready.baseUrl.includes('?')&&!launched.ready.baseUrl.includes('#'),'Public base URL has no credentials.');
  } finally {await launched.close();}
  const opened=await launchManual({mode:'open',root,ui});
  try {assert.equal(sha(await bytes(path.join(root,'manual.json'))),sha(before));assert.equal(sha(await bytes(path.join(root,'sources.json'))),sha(source));assert.equal(sha(await bytes(path.join(root,'assets/sample.svg'))),sha(asset));assert.equal(opened.ready.commands.length,0);}
  finally {await opened.close();}
});

test('private body bootstrap, replay/Origin/Host rejection, blocking UI session and unchanged API auth',async t=>{
  const {root,ui}=await fixture(t),launched=await launchManual({mode:'new',root,ui});
  try {
    const entry=await bootstrap(launched),session=JSON.parse(await fs.readFile(launched.ready.sessionPath));
    const publicReady=JSON.stringify(launched.ready),publicHTML=await(await fetch(entry.origin+'/')).text();
    assert.ok(!publicReady.includes(session.token)&&!publicReady.includes(entry.ticket),'Public readiness excludes both secrets.');assert.ok(!publicHTML.includes(session.token)&&!publicHTML.includes(entry.ticket),'Public index excludes both secrets.');assert.ok(!entry.html.includes(session.token),'Private start file carries only a launch ticket, not bearer token.');
    assert.ok(publicHTML.indexOf('/bootstrap/session.js')<publicHTML.indexOf('type="module"'),'Blocking bootstrap script precedes existing module.');
    const scriptHeaders={'Sec-Fetch-Site':'same-origin','Sec-Fetch-Dest':'script','Sec-Fetch-Mode':'no-cors'};
    const anonymous=await fetch(entry.origin+'/bootstrap/session.js',{headers:scriptHeaders});assert.equal(anonymous.status,200);const receiver=await anonymous.text();assert.ok(!receiver.includes(session.token)&&!receiver.includes(entry.ticket),'Public receiver contains no credential.');const emptyContext=vm.createContext({sessionStorage:{getItem:()=>null}});vm.runInContext(receiver,emptyContext);assert.equal(emptyContext.__LDS_MANUAL_SESSION,undefined);
    assert.equal((await entry.request('wrong')).status,403);assert.equal((await entry.request(entry.ticket,{Origin:'https://other.invalid'})).status,403);
    assert.equal((await entry.request(entry.ticket,{'Sec-Fetch-Dest':'iframe'})).status,403);
    const wrongHost=await new Promise((resolve,reject)=>{const req=http.request(entry.origin+'/bootstrap/launch',{method:'POST',headers:{Host:'evil.invalid',Origin:'null','Content-Type':'application/x-www-form-urlencoded'}},r=>{r.resume();resolve(r.statusCode);});req.once('error',reject);req.end(new URLSearchParams({ticket:entry.ticket}).toString());});assert.equal(wrongHost,403);
    const accepted=await entry.request();assert.equal(accepted.status,200);assert.equal(accepted.headers.get('set-cookie'),null,'No cross-port cookie credential is issued.');assert.ok(accepted.headers.get('content-security-policy').includes("script-src 'nonce-"));const transition=await accepted.text();assert.ok(!transition.includes(entry.ticket),'Ticket is not reflected in navigation HTML.');assert.ok(transition.includes("location.replace('/')"));assert.equal((await entry.request()).status,409);
    assert.equal((await fetch(entry.origin+'/bootstrap/session.js',{headers:{...scriptHeaders,'Sec-Fetch-Site':'cross-site'}})).status,403);
    const otherPort='http://127.0.0.1:1';
    for(const headers of [
      {...scriptHeaders,'Sec-Fetch-Site':'same-site',Origin:otherPort,Referer:otherPort+'/',Cookie:'lds_manual_bootstrap=synthetic'},
      {...scriptHeaders,Origin:otherPort,Referer:otherPort+'/',Cookie:'lds_manual_bootstrap=synthetic'}
    ]) {
      const deniedScript=await fetch(entry.origin+'/bootstrap/session.js',{headers});assert.equal(deniedScript.status,403);assert.ok(!(await deniedScript.text()).includes(session.token),'Another loopback port receives no bearer even with cookies.');
    }
    const memory=new Map(),context=vm.createContext({sessionStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)},location:{replace:value=>{assert.equal(value,'/');}}});const bootstrapScript=transition.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)?.[1];assert.ok(Boolean(bootstrapScript));vm.runInContext(bootstrapScript,context);vm.runInContext(receiver,context);const delivered=context.__LDS_MANUAL_SESSION;assert.equal(delivered.contract,'lds-manual-editor-bootstrap/v1');assert.ok(delivered.token===session.token,'UI memory session matches private host session.');assert.ok(delivered.baseUrl===entry.origin);assert.ok(Object.isFrozen(delivered));
    const wrongContext=vm.createContext({sessionStorage:{getItem:()=>JSON.stringify({...delivered,baseUrl:'http://127.0.0.1:1'})}});vm.runInContext(receiver,wrongContext);assert.equal(wrongContext.__LDS_MANUAL_SESSION,undefined,'A different origin/port session is not accepted.');
    assert.equal((await fetch(entry.origin+'/api/document',{headers:{Cookie:'lds_manual_bootstrap=not-a-secret',Origin:entry.origin}})).status,401,'Cookies do not authorize APIs.');
    const api=await fetch(entry.origin+'/api/document',{headers:{Authorization:`Bearer ${delivered.token}`,Origin:entry.origin}});assert.equal(api.status,200);const data=await api.json();assert.equal(data.document.schemaVersion,1);
    const denied=await fetch(entry.origin+'/api/save',{method:'POST',headers:{Authorization:`Bearer ${delivered.token}`,Origin:'null','Content-Type':'application/json'},body:JSON.stringify({expectedRevision:data.revision,document:data.document})});assert.equal(denied.status,403,'Opaque file-origin exception cannot mutate /api.');
    assert.equal((await fetch(entry.origin+'/bootstrap/launch?ticket=not-a-secret')).status,400);assert.equal((await fetch(entry.origin+'/api/root-switch',{method:'POST',headers:{Authorization:`Bearer ${delivered.token}`,Origin:entry.origin,'Content-Type':'application/json'},body:'{}'})).status,404);
  } finally {await launched.close();}
});

test('new existing empty folder, open missing document, invalid UI and private cleanup boundaries',async t=>{
  const {root,ui,base}=await fixture(t);await fs.mkdir(root);await assert.rejects(launchManual({mode:'new',root,ui}),e=>e.code==='INIT_FAILED');assert.deepEqual(await fs.readdir(root),[]);await assert.rejects(launchManual({mode:'open',root,ui}),e=>e.code==='ENOENT');
  const absent=path.join(base,'new-untouched');await assert.rejects(launchManual({mode:'new',root:absent,ui:path.join(base,'missing-ui')}),e=>e.code==='ENOENT');assert.equal(await fs.stat(absent).then(()=>true,()=>false),false);
  const launched=await launchManual({mode:'new',root:absent,ui});const {sessionPath,launchFile}=launched.ready;await launched.close();assert.equal(await fs.stat(sessionPath).then(()=>true,()=>false),false);assert.equal(await fs.stat(launchFile).then(()=>true,()=>false),false);
});

test('real launcher CLI stdout only metadata and private file URL excludes credentials',async t=>{
  const {root,ui}=await fixture(t);const child=spawn(process.execPath,[launcher,'new',root,'--ui',ui,'--title','합성 CLI 새 문서'],{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='',ready;
  try {
    ready=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Launcher startup timeout')),5000);child.stdout.on('data',b=>{stdout+=b;try{const value=JSON.parse(stdout.split('\n')[0]);clearTimeout(timer);resolve(value);}catch{}});child.stderr.on('data',b=>stderr+=b);child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(new Error(`Launcher exited ${code}.`));});});
    const session=JSON.parse(await fs.readFile(ready.sessionPath)),privateHTML=await fs.readFile(ready.launchFile,'utf8'),ticket=privateHTML.match(/name="ticket" value="([^"]+)"/)?.[1];
    assert.ok(!stdout.includes(session.token)&&!stderr.includes(session.token),'No bearer in CLI stdout/stderr.');assert.ok(!stdout.includes(ticket)&&!stderr.includes(ticket),'No launch ticket in CLI stdout/stderr.');assert.ok(!pathToFileURL(ready.launchFile).href.includes(ticket),'Private file URI includes no secret.');assert.equal(ready.mode,'new');assert.equal(JSON.parse(await fs.readFile(path.join(root,'manual.json'))).title,'합성 CLI 새 문서');
  } finally {
    child.kill();await new Promise(resolve=>child.once('exit',resolve));
    // Windows process termination may bypass JS close. Clean only this process's
    // identified private files, never other session directories.
    if(ready){const directory=path.dirname(ready.sessionPath);assert.equal(path.dirname(directory),await fs.realpath(os.tmpdir()));assert.ok(path.basename(directory).startsWith('lds-manual-host-'));for(const filename of [ready.sessionPath,ready.launchFile]){assert.equal(path.dirname(filename),directory);await fs.unlink(filename).catch(e=>{if(e.code!=='ENOENT')throw e;});}await fs.rmdir(directory).catch(e=>{if(e.code!=='ENOENT')throw e;});}
  }
});
