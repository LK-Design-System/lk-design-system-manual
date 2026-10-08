// A document switch must save edits that arrive during a write before installing
// the next document. Finalize synchronously with the successful current check.
export async function saveBeforeReplacement({capture,save,isCurrent,replace}){
 for(;;){
  const snapshot=capture();
  if(!snapshot||await save(snapshot)!==true)return false;
  if(!isCurrent(snapshot))continue;
  replace(snapshot);return true;
 }
}

// One writer per editor. Editing can continue while a detached snapshot is saved.
export function createAutosaveController({save,delay=750,onStatus=()=>{},onSaved=()=>{},onCallbackError=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}={}){
 if(typeof save!=='function')throw new TypeError('An autosave writer is required.');
 let epoch=0,session=null,version=0,committed=0,pending=null,active=null,timer=null,due=false,failure=null,disposed=false;
 const waiters=new Set();
 function callback(fn,...args){try{fn(...args);}catch(cause){try{onCallbackError(cause);}catch{ /* A UI callback cannot change a committed write. */ }}}
 function dirty(){return !!pending||!!failure||!!active&&active.epoch===epoch;}
 function status(state){callback(onStatus,{state,dirty:dirty(),documentId:session?.documentId??null,revision:session?.revision??null,error:failure});}
 function cancelTimer(){if(timer!==null){clearTimer(timer);timer=null;}}
 function settle(){
  for(const waiter of waiters){
   if(disposed||waiter.epoch!==epoch||failure){waiters.delete(waiter);waiter.resolve(false);}
   else if(committed>=waiter.version){waiters.delete(waiter);waiter.resolve(true);}
  }
 }
 function pump(){
  if(disposed||active||failure||!pending||!due)return;
  const job=pending;pending=null;due=false;
  job.expectedRevision=session.revision;active=job;status('saving');
  Promise.resolve().then(()=>{
   // reset may run after pump but before this microtask. Do not let the old
   // snapshot enter a writer now bound to the replacement's recovery record.
   if(disposed||job.epoch!==epoch)return;
   return save({...job.snapshot,expectedRevision:job.expectedRevision});
  }).then(record=>{
   if(disposed||job.epoch!==epoch)return;
   session.revision=record.revision;committed=job.version;
   callback(onSaved,record,{token:job.token,version:job.version,current:!pending,snapshot:job.snapshot});
  },cause=>{
   if(disposed||job.epoch!==epoch)return;
   failure=cause;
   // Keep the newest edit, including edits that arrived while the write failed.
   if(!pending)pending=job;
   due=false;cancelTimer();
  }).finally(()=>{
   active=null;
   if(disposed)return;
   settle();
   if(failure){status(failure.code==='CONFLICT'?'conflict':'error');return;}
   if(pending){status('pending');pump();}
   else status(committed?'saved':'idle');
  });
 }
 function schedule(value,token){
  if(disposed)throw new Error('Autosave has been disposed.');
  if(!session||value?.document?.id!==session.documentId)throw new Error('Autosave document identity does not match the current editor.');
  // Clone before queuing: later mutations must never alter the persisted revision.
  const snapshot=structuredClone({document:value.document,assets:value.assets===undefined?{}:value.assets});
  pending={epoch,version:++version,snapshot,token};due=false;cancelTimer();
  if(!failure)timer=setTimer(()=>{timer=null;due=true;pump();},delay);
  status(failure?(failure.code==='CONFLICT'?'conflict':'error'):'pending');
  return version;
 }
 function flush(){
  if(disposed||!session||failure)return Promise.resolve(false);
  if(committed>=version)return Promise.resolve(true);
  const result=new Promise(resolve=>waiters.add({epoch,version,resolve}));
  cancelTimer();due=true;pump();return result;
 }
 return {
  reset({documentId,revision=null}){
   if(disposed)throw new Error('Autosave has been disposed.');
   if(typeof documentId!=='string'||!documentId)throw new TypeError('A document identity is required.');
   epoch++;cancelTimer();session={documentId,revision};version=0;committed=0;pending=null;due=false;failure=null;settle();status(revision===null?'idle':'saved');
  },
  schedule,flush,
  retry(){
   if(disposed||!session)return Promise.resolve(false);
   // A conflict needs reload or a new document identity, never an overwrite retry.
   if(failure?.code==='CONFLICT')return Promise.resolve(false);
   failure=null;return flush();
  },
  getState(){return {documentId:session?.documentId??null,revision:session?.revision??null,dirty:dirty(),saving:!!active&&active.epoch===epoch,error:failure};},
  dispose(){if(disposed)return;disposed=true;cancelTimer();pending=null;settle();}
 };
}
