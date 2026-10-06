import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { startHost } from './server/host.mjs';
import { HostError } from './server/storage.mjs';

const repo=fileURLToPath(new URL('../../',import.meta.url));
const defaultUI=fileURLToPath(new URL('./dist',import.meta.url));
async function initDocument(root,title,version) {
  const args=[path.join(repo,'bin/lds-manual.mjs'),'init',root,'--title',title,'--document-version',version];
  const child=spawn(process.execPath,args,{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe'],cwd:repo});
  let stderr='';child.stdout.resume();child.stderr.on('data',b=>{if(stderr.length<8192)stderr+=b;});
  const exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
  if(exitCode!==0)throw new HostError(409,'INIT_FAILED',stderr.trim()||'New document initialization failed; existing source was not overwritten.');
  return {pid:child.pid,exitCode,operation:'fixed CLI init'};
}
export async function openPrivateLaunch(file,browser) {
  let executable,args;
  if(browser){executable=await fs.realpath(browser);args=[pathToFileURL(file).href];}
  else if(process.platform==='win32'){executable=path.join(process.env.SystemRoot||'C:\\Windows','explorer.exe');args=[file];}
  else {executable=process.platform==='darwin'?'open':'xdg-open';args=[file];}
  const child=spawn(executable,args,{shell:false,windowsHide:true,detached:true,stdio:'ignore'});
  await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});
  child.unref();return {pid:child.pid,operation:'open private launch file'};
}
export async function launchManual({mode,root,title='제품 사용 매뉴얼',documentVersion='0.1',runtime,browser,ui=defaultUI,port=0,openBrowser=false,openFile=openPrivateLaunch}) {
  if(!['new','open'].includes(mode)||typeof root!=='string'||!root.trim())throw new HostError(400,'LAUNCH_ARGS','Use new/open with an explicit document directory.');
  if(!Number.isInteger(port)||port<0||port>65535)throw new HostError(400,'LAUNCH_PORT','Choose a valid loopback port.');
  const selectedUI=await fs.realpath(ui);
  if(!(await fs.stat(path.join(selectedUI,'index.html'))).isFile())throw new HostError(400,'LAUNCH_UI','Build the editor UI before launching a document.');
  root=path.resolve(root);
  const commands=[];
  if(mode==='new') {
    if(typeof title!=='string'||!title.trim()||typeof documentVersion!=='string'||!documentVersion.trim())throw new HostError(400,'LAUNCH_TITLE','Title and version must be nonempty.');
    commands.push(await initDocument(root,title,documentVersion));
  } else {
    const stat=await fs.lstat(path.join(root,'manual.json'));
    if(!stat.isFile()||stat.isSymbolicLink())throw new HostError(400,'LAUNCH_DOCUMENT','Open a directory with a regular manual.json.');
  }
  const host=await startHost({root,runtime,browser,ui:selectedUI,port,bootstrap:true});
  try {
    if(openBrowser)commands.push(await openFile(host.launchPath,browser));
    const ready={mode,baseUrl:host.baseUrl,pid:process.pid,root:host.store.root,sessionPath:host.sessionPath,launchFile:host.launchPath,commands};
    return {host,ready,close:host.close};
  }catch(e){await host.close();throw e;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const {values,positionals}=parseArgs({allowPositionals:true,options:{title:{type:'string'},'document-version':{type:'string'},runtime:{type:'string'},browser:{type:'string'},ui:{type:'string'},port:{type:'string'},'open-browser':{type:'boolean'},help:{type:'boolean'}}});
  if(values.help||positionals.length!==2){console.log('Usage: node apps/editor/launch.mjs new|open <document-directory> [--title "제목"] [--document-version 0.1] [--runtime <installed-peers>] [--browser <Chromium>] [--ui <built-editor>] [--port 0] [--open-browser]');if(!values.help)process.exitCode=1;}
  else {
    try {
      const launched=await launchManual({mode:positionals[0],root:positionals[1],title:values.title,documentVersion:values['document-version'],runtime:values.runtime,browser:values.browser,ui:values.ui,port:Number(values.port||0),openBrowser:Boolean(values['open-browser'])});
      console.log(JSON.stringify(launched.ready));
      let closing=false;for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{if(closing)return;closing=true;await launched.close();process.exit();});
    }catch(e){console.error(e.message);process.exitCode=1;}
  }
}
