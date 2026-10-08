import {decodeDocumentFile,encodeDocumentFile} from './document-store.mjs';

const TYPES=[{description:'Manual 문서',accept:{'application/json':['.manual.json','.json']}}];
export const manualFileName=document=>(document.title||'새 문서').replace(/[\\/:*?"<>|]/g,'-').slice(0,80)+'.manual.json';
export function getManualFileCapabilities(surface=globalThis){
 return {open:surface.isSecureContext===true&&typeof surface.showOpenFilePicker==='function',save:surface.isSecureContext===true&&typeof surface.showSaveFilePicker==='function'};
}
/** Memory-only file binding. Pickers start synchronously inside open/save/saveAs;
 * call these methods directly from a user gesture, before any awaited work.
 * capture returns {document,assets,token}. isActive checks document generation;
 * isCurrent checks exact doc/assets snapshot for dirty-baseline acknowledgement.
 * Open returns a candidate: the caller protects unsaved content and installs it,
 * then reset({handle:candidate.handle}) binds the accepted file. No PM/IDB writes.
 */
export function createManualFileSession({capture,isCurrent,isActive=()=>true,isEnabled=()=>true,surface=globalThis,pickOpen,pickSave,download,onSaved=()=>{},onStatus=()=>{},onError=()=>{},onCallbackError=()=>{}}={}){
 if(typeof capture!=='function'||typeof isCurrent!=='function')throw new TypeError('File snapshot and current-snapshot callbacks are required.');
 let epoch=0,disposed=false,handle=null,tail=Promise.resolve(),pendingTarget=null,readVersion=0,writes=0;
 const notify=(fn,value)=>{try{fn(value);}catch(error){try{onCallbackError(error);}catch{}}};
 const capability=()=>({open:!!pickOpen||getManualFileCapabilities(surface).open,save:!!pickSave||getManualFileCapabilities(surface).save});
 const openPicker=options=>pickOpen?pickOpen(options):surface.showOpenFilePicker(options);
 const savePicker=options=>pickSave?pickSave(options):surface.showSaveFilePicker(options);
 const active=job=>!disposed&&job.epoch===epoch&&isActive(job.token)&&capture()?.document?.id===job.documentId;
 const failure=(error,operation)=>{notify(onError,{error,operation});return {status:'error',error};};
 const context=()=>{const value=capture();return {epoch,documentId:value.document.id,token:value.token};};
 async function open(){
  if(disposed||!isEnabled())return {status:'blocked'};
  if(!capability().open)return {status:'unsupported'};
  const job=context(),read=++readVersion;let selected;
  // Do not move this call after reading, encoding, or another asynchronous task.
  try{selected=openPicker({multiple:false,types:TYPES});}catch(error){return error.name==='AbortError'?{status:'cancelled'}:failure(error,'open');}
  try{
   const [candidate]=await selected;if(!candidate)return {status:'cancelled'};
   const file=await candidate.getFile(),data=decodeDocumentFile(await file.text());
   if(!active(job)||read!==readVersion)return {status:'stale'};
   return {status:'opened',...data,handle:candidate,fileName:candidate.name||file.name};
  }catch(error){if(!active(job)||read!==readVersion)return {status:'stale'};return error.name==='AbortError'?{status:'cancelled'}:failure(error,'open');}
 }
 function save({as=false}={}){
  if(disposed||!isEnabled())return Promise.resolve({status:'blocked'});
  const job=context();let target,createdTarget=null;
  if(!as&&handle)target=Promise.resolve({current:true});
  else if(!as&&pendingTarget?.epoch===epoch)target=pendingTarget.promise;
  else if(capability().save){
   try{target=Promise.resolve(savePicker({suggestedName:manualFileName(capture().document),types:TYPES}));}catch(error){return Promise.resolve(error.name==='AbortError'?{status:'cancelled'}:failure(error,'save'));}
   // Observe picker rejection immediately even while another file write is queued.
   target=target.then(value=>({handle:value}),error=>({error}));
   if(!as)pendingTarget=createdTarget={epoch,promise:target};
  }else target=null;
  const run=async()=>{
   if(!active(job))return {status:'stale'};
   let writable;
   try{
    const picked=target?await target:null;
    if(!active(job))return {status:'stale'};
    if(picked?.error)return picked.error.name==='AbortError'?{status:'cancelled'}:failure(picked.error,'save');
    const selected=picked?.current?handle:target?(Object.hasOwn(picked||{},'handle')?picked.handle:picked):null;
    if(target&&!selected)return {status:'cancelled'};
    if(!isEnabled())return {status:'blocked'};
    const value=capture(),snapshot={document:structuredClone(value.document),assets:value.assets===undefined?{}:structuredClone(value.assets)},token=value.token,bytes=encodeDocumentFile(snapshot);
    if(!selected){
     if(typeof download!=='function')return failure(new Error('이 브라우저에서 파일 저장을 사용할 수 없습니다.'),'save');
     if(!active(job))return {status:'stale'};
     await download({bytes,fileName:manualFileName(snapshot.document),mime:'application/json',token});
     // A download request does not confirm filesystem completion or clear dirty.
     return {status:active(job)?'download-requested':'stale',fileName:manualFileName(snapshot.document)};
    }
    writes++;notify(onStatus,{state:'saving',fileName:selected.name||manualFileName(snapshot.document)});
    writable=await selected.createWritable();
    if(!active(job)){await writable.abort?.();return {status:'stale'};}
    await writable.write(bytes);
    if(!active(job)){await writable.abort?.();return {status:'stale'};}
    await writable.close();writable=null;
    if(!active(job))return {status:'stale',written:true};
    handle=selected;
    const result={status:'saved',fileName:selected.name||manualFileName(snapshot.document),snapshot,token,handle:selected,current:isCurrent(token)};
    notify(onSaved,result);if(active(job))notify(onStatus,{state:'saved',fileName:result.fileName,current:result.current});return result;
   }catch(error){
    try{await writable?.abort?.();}catch{}
    if(!active(job))return {status:'stale'};
    // Once writing starts, AbortError is a write failure, not a picker cancel.
    notify(onStatus,{state:'error',error});return failure(error,'save');
   }finally{if(writable||writes)writes=Math.max(0,writes-1);}
  };
  const result=tail.then(run,run);tail=result.then(()=>{},()=>{});const clear=()=>{if(createdTarget&&pendingTarget===createdTarget)pendingTarget=null;};result.then(clear,clear);return result;
 }
 return {open,save,saveAs:()=>save({as:true}),getCapabilities(){const value=capability();return {...value,mode:value.save?'native':'download'};},reset({handle:next=null}={}){epoch++;readVersion++;handle=next;pendingTarget=null;},getState:()=>({bound:!!handle,fileName:handle?.name??null,saving:writes>0}),dispose(){if(disposed)return;disposed=true;epoch++;readVersion++;handle=null;pendingTarget=null;}};
}
