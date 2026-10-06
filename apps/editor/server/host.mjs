import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomBytes, timingSafeEqual, randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { createStore, HostError, relativePath } from './storage.mjs';
import { createExports } from './exports.mjs';
import { createBootstrap } from './bootstrap.mjs';

const mime = {'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.pdf':'application/pdf','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2'};
export async function startHost({root,runtime,browser,port=0,ui,validateAssets,checkpoint,sessionFile,bootstrap=false}) {
  if(bootstrap&&sessionFile)throw new HostError(400,'BOOTSTRAP_PRIVATE','Launcher bootstrap uses its own per-user private directory.');
  const store = await createStore({root,validateAssets,checkpoint});
  const leasePath=await store.resolve('.editor/host-lock.json',{missing:true});
  await fs.mkdir(path.dirname(leasePath),{recursive:true});
  const lease={pid:process.pid,id:randomUUID()};
  for(let attempt=0;;attempt++) {
    try {const handle=await fs.open(leasePath,'wx',0o600);try{await handle.writeFile(JSON.stringify(lease));await handle.sync();}finally{await handle.close();}break;}
    catch(e){
      if(e.code!=='EEXIST'||attempt>0)throw e;
      const old=JSON.parse(await store.read('.editor/host-lock.json'));
      if(!Number.isInteger(old.pid)||old.pid<1)throw new HostError(409,'HOST_LOCK','Invalid document host lease; manual inspection required.');
      try{process.kill(old.pid,0);throw new HostError(409,'HOST_LOCK','Another live host owns this document root.');}
      catch(error){if(error.code!=='ESRCH')throw error;}
      await fs.unlink(await store.resolve('.editor/host-lock.json'));
    }
  }
  const releaseLease=async()=>{const current=await store.read('.editor/host-lock.json');if(current&&JSON.parse(current).id===lease.id)await fs.unlink(await store.resolve('.editor/host-lock.json'));};
  let exports;
  try {exports=await createExports({store,runtime,browser});ui=ui?await fs.realpath(ui):null;}
  catch(e){await releaseLease();throw e;}
  const token = randomBytes(32).toString('base64url');
  const bootstrapDelivery=bootstrap?createBootstrap({token}):null;
  const server = http.createServer(async (req,res) => {
    const json = (status,body) => { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(body)); };
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const address = server.address();
      const host = `127.0.0.1:${address.port}`, origin = `http://${host}`;
      if(req.headers.host!==host)throw new HostError(403,'ORIGIN','Request must use this loopback host.');
      const url = new URL(req.url,origin);
      if(bootstrapDelivery&&await bootstrapDelivery.handle(req,res,url,origin))return;
      if ((req.headers.origin && req.headers.origin !== origin) || (req.headers['sec-fetch-site'] && !['same-origin','none'].includes(req.headers['sec-fetch-site']))) throw new HostError(403,'ORIGIN','Request must use this loopback origin.');
      if (url.pathname.startsWith('/api/')) {
        const received = Buffer.from(req.headers.authorization || ''), expected = Buffer.from(`Bearer ${token}`);
        if (received.length !== expected.length || !timingSafeEqual(received,expected)) throw new HostError(401,'SESSION','Valid local session required.');
        if (!['GET','POST'].includes(req.method)) throw new HostError(405,'METHOD','Unsupported method.');
        let body;
        if (req.method === 'POST') {
          if (req.headers.origin !== origin) throw new HostError(403,'ORIGIN','Mutations require an explicit same-origin header.');
          if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new HostError(415,'CONTENT_TYPE','Use JSON requests.');
          const chunks=[]; let size=0;
          for await (const chunk of req) { size+=chunk.length; if(size>30*1024*1024) throw new HostError(413,'SIZE','Request exceeds 30 MiB.'); chunks.push(chunk); }
          try { body=JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HostError(400,'JSON','Invalid JSON request.'); }
          if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HostError(400,'JSON','Request object required.');
        }
        if (req.method==='GET' && url.pathname==='/api/document') return json(200,await store.load());
        if (req.method==='POST' && url.pathname==='/api/validate') return json(200,await store.validateDraft(body));
        if (req.method==='POST' && url.pathname==='/api/save') return json(200,await store.save(body));
        if (req.method==='POST' && url.pathname==='/api/draft') return json(200,await store.draft(body));
        if (req.method==='POST' && url.pathname==='/api/assets') return json(201,await store.importAsset(body));
        if (req.method==='GET' && url.pathname==='/api/asset') {
          const src=relativePath(url.searchParams.get('src'));
          if (!['.png','.jpg','.jpeg','.svg','.webp'].includes(path.extname(src).toLowerCase()) || src.startsWith('.editor/')) throw new HostError(404,'ASSET','Only document image assets are exposed.');
          const bytes=await store.read(src); if(!bytes) throw new HostError(404,'ASSET','Missing image asset.');
          res.writeHead(200,{'Content-Type':mime[path.extname(src).toLowerCase()]}); return res.end(bytes);
        }
        if (req.method==='POST' && url.pathname==='/api/exports') return json(202,await exports.start(body));
        if (req.method==='GET' && url.pathname==='/api/exports') return json(200,{jobs:await exports.list()});
        if (req.method==='POST' && url.pathname==='/api/visual-review') return json(200,await exports.visualReview(body));
        const job=url.pathname.match(/^\/api\/exports\/([a-f0-9-]{36})(?:\/file\/([^/]+))?$/);
        if(req.method==='GET' && job) {
          if(!job[2]) return json(200,await exports.status(job[1]));
          const bytes=await exports.artifact(job[1],job[2]);
          res.setHeader('Content-Security-Policy',"default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'; sandbox allow-same-origin");
          res.writeHead(200,{'Content-Type':mime[path.extname(job[2])]||(job[2]==='command.log'?'text/plain; charset=utf-8':'application/octet-stream'),'Content-Disposition':`inline; filename="${job[2]}"`}); return res.end(bytes);
        }
        throw new HostError(404,'API','Unknown API route.');
      }
      if(req.method!=='GET') throw new HostError(405,'METHOD','Use GET for the editor UI.');
      if(!ui) {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); return res.end('<!doctype html><meta charset="utf-8"><title>LDS Manual local host</title><h1>LDS Manual local host</h1><p>The file API is running. Start with a built Tiptap editor directory to use the authoring UI.</p>');}
      const src=url.pathname==='/'?'index.html':relativePath(decodeURIComponent(url.pathname.slice(1)));
      const target=await fs.realpath(path.join(ui,...src.split('/')));
      if(!target.startsWith(ui+path.sep)) throw new HostError(403,'UI_PATH','UI path leaves its fixed directory.');
      if(src==='preview.html') {
        // The editor's fixed preview entry is the sole script-bearing UI frame.
        // Keep other UI/API responses unembeddable; do not relax authentication.
        res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
        res.setHeader('X-Frame-Options','SAMEORIGIN');
      }
      let bytes=await fs.readFile(target);
      if(bootstrapDelivery&&src==='index.html')bytes=bootstrapDelivery.decorateHTML(bytes);
      res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'}); return res.end(bytes);
    } catch(e) { json(e.status || (e.code==='ENOENT'?404:500),{error:{code:e instanceof HostError?e.code:'HOST',message:e instanceof HostError?e.message:'Local operation failed; original files were retained.',details:e.details}}); }
  });
  try {await new Promise((resolve,reject) => {server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});}
  catch(e){await releaseLease();throw e;}
  const baseUrl=`http://127.0.0.1:${server.address().port}`;
  const session = {baseUrl,token,pid:process.pid,root:store.root,createdAt:new Date().toISOString()};
  let privateDirectory=null,sessionPath,launchPath,createdSession=false;
  try {
    privateDirectory=sessionFile?null:await fs.mkdtemp(path.join(os.tmpdir(),'lds-manual-host-'));
    if(privateDirectory)await fs.chmod(privateDirectory,0o700);
    sessionPath=sessionFile ? path.resolve(sessionFile) : path.join(privateDirectory,'session.json');
    await fs.mkdir(path.dirname(sessionPath),{recursive:true});
    const sessionHandle=await fs.open(sessionPath,'wx',0o600);createdSession=true;
    try{await sessionHandle.writeFile(JSON.stringify(session));await sessionHandle.sync();}finally{await sessionHandle.close();}
    if(bootstrapDelivery)launchPath=await bootstrapDelivery.createLaunchFile(privateDirectory,baseUrl);
  }catch(e){
    await new Promise(resolve=>server.close(resolve));await releaseLease();
    if(createdSession)await fs.unlink(sessionPath).catch(()=>{});
    if(privateDirectory&&bootstrapDelivery)await fs.unlink(path.join(privateDirectory,'start.html')).catch(()=>{});
    if(privateDirectory)await fs.rmdir(privateDirectory).catch(()=>{});
    throw e;
  }
  return {server,store,exports,baseUrl,sessionPath,launchPath,token,close:async()=>{await exports.close();await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));await releaseLease();await fs.unlink(sessionPath).catch(e=>{if(e.code!=='ENOENT')throw e;});if(launchPath)await fs.unlink(launchPath).catch(e=>{if(e.code!=='ENOENT')throw e;});if(privateDirectory)await fs.rmdir(privateDirectory);}};
}
if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const {values}=parseArgs({options:{root:{type:'string'},runtime:{type:'string'},browser:{type:'string'},ui:{type:'string'},port:{type:'string'},'session-file':{type:'string'},bootstrap:{type:'boolean'}}});
  if(!values.root) {console.error('Usage: node apps/editor/server/host.mjs --root <document-folder> [--runtime <installed-peers>] [--browser <chromium>] [--ui <built-editor>] [--port 0]');process.exitCode=1;}
  else {
    try {const host=await startHost({...values,port:Number(values.port||0),sessionFile:values['session-file']}); console.log(JSON.stringify({baseUrl:host.baseUrl,pid:process.pid,sessionPath:host.sessionPath,...(host.launchPath?{launchPath:host.launchPath}:{})})); for(const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>host.close().then(()=>process.exit()));}
    catch(e){console.error(e.message);process.exitCode=1;}
  }
}
