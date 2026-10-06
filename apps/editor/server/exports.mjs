import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { HostError, sha } from './storage.mjs';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const rendererFiles = ['bin/lds-manual.mjs','src/components.mjs','src/validate.mjs','src/image-dimensions.mjs','styles.css','tokens/manual.css'];
export async function rendererFingerprint() {
  const files = {};
  for (const name of rendererFiles) files[name] = sha(await fs.readFile(path.join(repo,name)));
  return { files, hash: sha(Buffer.from(JSON.stringify(files))) };
}
const parse = bytes => bytes ? JSON.parse(bytes.toString('utf8')) : null;
export async function createExports({ store, runtime, browser, commandTimeoutMs = 120000 }) {
  runtime = runtime ? await fs.realpath(runtime) : repo;
  if (browser) browser = await fs.realpath(browser);
  const running = new Map();
  async function runtimeFingerprint() {
    const require=createRequire(path.join(runtime,'package.json')), files={};
    for(const name of ['@lk-design-system/lds-core/package.json','@lk-design-system/lds-theme/package.json','@lk-design-system/lds-core/components/status/Callout','@lk-design-system/lds-core/components/content/Blockquote','react/package.json','react-dom/package.json','playwright/package.json']) {
      try {
        let target;
        try {target=require.resolve(name);}
        catch(e){
          if(!name.startsWith('@lk-design-system/lds-core/components/'))throw e;
          const owner=path.dirname(require.resolve('@lk-design-system/lds-core/package.json'));
          const manifest=JSON.parse(await fs.readFile(path.join(owner,'package.json')));
          const entry=manifest.exports['./components/*'];
          target=path.join(owner,(typeof entry==='string'?entry:entry.import).replace('*',name.slice('@lk-design-system/lds-core/components/'.length)));
        }
        files[name]=sha(await fs.readFile(target));
      }catch(e){files[name]=`unavailable:${e.code}`;}
    }
    for(const [name,relativeFiles] of [['@lk-design-system/lds-core',['tokens/spacing.css']],['@lk-design-system/lds-theme',['tokens/color-atomic.css','tokens/color-semantic.css','tokens/typography.css',...['Regular','Medium','SemiBold','Bold','ExtraBold'].map(n=>`assets/fonts/Pretendard-${n}.woff2`),'assets/brand/lk-logo-inline-navy.svg']]]) {
      try {const owner=path.dirname(require.resolve(`${name}/package.json`));for(const file of relativeFiles)files[`${name}/${file}`]=sha(await fs.readFile(path.join(owner,file)));}catch(e){files[name]=`unavailable:${e.code}`;}
    }
    const stat=browser?await fs.stat(browser):null;
    const environment={node:process.version,platform:process.platform,runtime,browser:browser||'playwright-default',browserStat:stat?{size:stat.size,mtimeMs:stat.mtimeMs}:null,files};
    return { ...environment,hash:sha(Buffer.from(JSON.stringify(environment))) };
  }
  const jobSrc = id => {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new HostError(400,'JOB','Invalid export job.');
    return `.editor/exports/${id}`;
  };
  async function status(id) {
    const src = `${jobSrc(id)}/status.json`, bytes = await store.read(src);
    if (!bytes) throw new HostError(404,'JOB','Export job not found.');
    const record = parse(bytes);
    if (record.state === 'running' && !running.has(id)) {
      record.state = 'interrupted'; record.error = 'Host stopped before export finished; this is not a current successful output.';
      await store.atomic(src,Buffer.from(JSON.stringify(record,null,2)+'\n'));
    }
    const current = await store.snapshot();
    const renderer = await rendererFingerprint();
    return { ...record, current: record.revision === current.revision && record.rendererHash === renderer.hash && record.runtimeHash === (await runtimeFingerprint()).hash, running: running.has(id) };
  }
  async function writeStatus(record) { await store.atomic(`${jobSrc(record.jobId)}/status.json`,Buffer.from(JSON.stringify(record,null,2)+'\n')); }
  async function runCommand(args, src, onStart) {
    const log = await fs.open(await store.resolve(`${src}/command.log`,{missing:true}),'a',0o600);
    const child = spawn(process.execPath, [path.join(repo,'bin/lds-manual.mjs'), ...args], { shell:false, windowsHide:true, stdio:['ignore',log.fd,log.fd], cwd:repo });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); },commandTimeoutMs);
    try {
      const finished = new Promise((resolve,reject) => {
        child.once('error',reject);
        child.once('exit',(code,signal) => resolve({ code, signal, timedOut, pid:child.pid }));
      });
      await onStart(child.pid);
      return await finished;
    } finally { clearTimeout(timer); await log.close(); }
  }
  async function execute(record, input, output) {
    try {
      const before = await rendererFingerprint();
      if (before.hash !== record.rendererHash) throw new HostError(409,'RENDERER_CHANGED','Renderer changed before output.');
      if ((await runtimeFingerprint()).hash!==record.runtimeHash) throw new Error('Installed output runtime changed before generation.');
      const command=async(operation,args)=>{
        const index=record.commands.length;
        const result=await runCommand(args,jobSrc(record.jobId),async pid=>{record.commands.push({operation,pid,state:'running'});await writeStatus(record);});
        record.commands[index]={operation,...result,state:'finished'};
        return result;
      };
      const html = path.join(output,'manual.html');
      const build = await command('build',['build',input,'--out',html,'--runtime',runtime]);
      if (build.code !== 0) throw new Error('HTML generation failed. Inspect this job log; previous output remains separate.');
      if (record.format === 'pdf') {
        const args = ['pdf',html,'--out',path.join(output,'manual.pdf'),'--runtime',runtime];
        if (browser) args.push('--browser',browser);
        const pdf = await command('pdf',args);
        if (pdf.code !== 0) throw new Error('PDF generation failed. Layout evidence belongs to this failed job; previous PDFs remain separate.');
      }
      if ((await rendererFingerprint()).hash !== record.rendererHash) throw new Error('Renderer changed during output; result is not a valid current artifact.');
      if ((await runtimeFingerprint()).hash!==record.runtimeHash) throw new Error('Installed output runtime changed during generation.');
      record.artifacts = {};
      for (const name of ['manual.html','manual.pdf','manual.layout.json','Pretendard-LICENSE.txt']) {
        const b = await store.read(`${jobSrc(record.jobId)}/output/${name}`);
        if (b) record.artifacts[name] = { sha256:sha(b), bytes:b.length, url:`/api/exports/${record.jobId}/file/${name}` };
      }
      record.state = 'succeeded';
    } catch (error) { record.state = 'failed'; record.error = error.message; }
    record.diagnostics = {};
    for (const name of ['command.log','output/manual.layout.json']) {
      const bytes = await store.read(`${jobSrc(record.jobId)}/${name}`);
      if (bytes) record.diagnostics[path.basename(name)] = {sha256:sha(bytes),bytes:bytes.length,url:`/api/exports/${record.jobId}/file/${path.basename(name)}`};
    }
    record.finishedAt = new Date().toISOString();
    await writeStatus(record);
    return record;
  }
  async function start(input) {
    if (!['html','pdf'].includes(input.format) || !['draft','reviewed'].includes(input.mode)) throw new HostError(422,'EXPORT','Choose html/pdf and draft/reviewed.');
    return store.withRevision(input.expectedRevision, async snapshot => {
      const loaded = await store.validate(snapshot.document);
      if (!loaded.valid) throw new HostError(422,'INVALID_DOCUMENT','Only valid canonical content can be exported.',loaded.errors);
      const renderer = await rendererFingerprint();
      const environment=await runtimeFingerprint();
      if (input.mode === 'reviewed') {
        // Use existing copy-review contract; no hash-only repair or auto approval.
        const { checkCopyReview } = await import('../../../src/copy-review.mjs');
        const review = parse(snapshot.bytes['copy-review.json']);
        const errors = review ? checkCopyReview(snapshot.document,review) : ['No copy-review record'];
        if (errors.length) throw new HostError(422,'COPY_REVIEW','Current contextual review is required.',errors);
        const visual = parse(await store.read('.editor/visual-review.json'));
        if (!visual || visual.outcome !== 'pass' || visual.revision !== snapshot.revision || visual.rendererHash !== renderer.hash || visual.runtimeHash!==environment.hash || visual.format !== input.format) throw new HostError(422,'VISUAL_REVIEW','Inspect a draft output of this revision and format, then record visual review.');
      }
      const jobId = randomUUID(), src = jobSrc(jobId);
      await store.atomic(`${src}/input/manual.json`,snapshot.bytes['manual.json']);
      for (const [asset,bytes] of snapshot.assets) if (bytes !== null) await store.atomic(`${src}/input/${asset}`,bytes);
      await fs.mkdir(await store.resolve(`${src}/output`,{missing:true}),{recursive:true});
      const record = { jobId,state:'running',revision:snapshot.revision,documentHash:sha(snapshot.bytes['manual.json']),rendererHash:renderer.hash,rendererFiles:renderer.files,runtimeHash:environment.hash,environment,mode:input.mode,format:input.format,startedAt:new Date().toISOString(),commands:[],artifacts:{},productApproval:'Not inferred from editor or output status' };
      await writeStatus(record);
      const done = execute(record,await store.resolve(`${src}/input/manual.json`),await store.resolve(`${src}/output`));
      running.set(jobId,done);
      done.finally(() => running.delete(jobId)).catch(() => {});
      return { jobId,state:'running',revision:snapshot.revision,statusUrl:`/api/exports/${jobId}` };
    });
  }
  async function visualReview(input) {
    return store.withRevision(input.expectedRevision, async snapshot => {
      const job = await status(input.jobId);
      if (job.state !== 'succeeded' || !job.current) throw new HostError(409,'OUTPUT_STALE','Review a successful output for the current document and renderer.');
      if (!['pass','fail'].includes(input.outcome) || typeof input.reviewer !== 'string' || !input.reviewer.trim() || typeof input.reason !== 'string' || !input.reason.trim()) throw new HostError(422,'REVIEW','Reviewer, outcome and visual reasoning required.');
      const record = {revision:snapshot.revision,rendererHash:job.rendererHash,runtimeHash:job.runtimeHash,jobId:input.jobId,format:job.format,reviewer:input.reviewer,outcome:input.outcome,reason:input.reason,reviewedAt:new Date().toISOString(),productApproval:false};
      await store.atomic('.editor/visual-review.json',Buffer.from(JSON.stringify(record,null,2)+'\n'));
      return record;
    });
  }
  async function artifact(id, name) {
    if (!['manual.html','manual.pdf','manual.layout.json','Pretendard-LICENSE.txt','command.log'].includes(name)) throw new HostError(404,'ARTIFACT','Unknown output artifact.');
    const job = await status(id);
    const proof=job.diagnostics?.[name];
    if ((!job.artifacts[name] || job.state !== 'succeeded') && !proof) throw new HostError(409,'ARTIFACT','Failed or incomplete output is not a successful artifact.');
    const bytes = await store.read(`${jobSrc(id)}/${name==='command.log'?'command.log':`output/${name}`}`);
    if (!bytes || sha(bytes) !== (job.artifacts[name]||proof).sha256) throw new HostError(409,'ARTIFACT_CHANGED','Output file changed after generation.');
    return bytes;
  }
  async function list() {let ids;try{ids=await fs.readdir(await store.resolve('.editor/exports'));}catch(e){if(e.code==='ENOENT')return [];throw e;}const jobs=[];for(const id of ids.filter(x=>/^[a-f0-9-]{36}$/.test(x)))jobs.push(await status(id));return jobs.sort((a,b)=>b.startedAt.localeCompare(a.startedAt));}
  return { start,status,list,visualReview,artifact, wait:id => running.get(id) || status(id), running, close:()=>Promise.allSettled([...running.values()]) };
}
