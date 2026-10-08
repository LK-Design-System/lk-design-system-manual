import {validateManualDocument} from './manual-v2.mjs';

const OWNER='lds-manual-recovery/v1';
const prefix='ldsManualRecovery:';
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const copy=value=>structuredClone(value);
function identityAvailable(document,id){
 if(typeof id!=='string'||!id||id===document.id)return false;
 const visit=value=>{
  if(!value||typeof value!=='object')return true;
  if(value.id===id)return false;
  return Object.entries(value).every(([key,child])=>key==='extensions'||visit(child));
 };
 return visit(document);
}
/** Separate auxiliary storage identity from the formal document/file identity.
 * No editor or file mutations. save delegates to the existing atomic CAS store.
 * createFresh persists only; activate must follow the caller's exact snapshot,
 * generation and IME guard. reset/cancel fences late activation, not committed IO.
 */
export function createManualRecoverySession({saveDocument,loadDocument,createId=()=>globalThis.crypto.randomUUID()}={}){
 if(typeof saveDocument!=='function'||typeof loadDocument!=='function')throw new TypeError('Recovery storage callbacks are required.');
 let binding=null,epoch=0;
 const state=()=>binding?{...binding}:null;
 const freshId=sourceId=>{const id=createId();if(typeof id!=='string'||!id||id===sourceId)fail('INVALID_RECOVERY_ID','복구본 식별자를 만들지 못했습니다.');return id;};
 function decode(record){
  const result=copy(record),key=prefix+result.id,marker=result.document?.extensions?.[key];
  let sourceId=result.document?.id;
  if(marker?.owner===OWNER&&marker.version===1&&marker.recordId===result.id&&marker.sourceDocumentId!==result.id&&typeof marker.sourceDocumentId==='string'&&typeof marker.hadExtensions==='boolean'){
   sourceId=marker.sourceDocumentId;delete result.document.extensions[key];
   if(!marker.hadExtensions&&Object.keys(result.document.extensions).length===0)delete result.document.extensions;
   result.document.id=sourceId;validateManualDocument(result.document);
  }
  result.id=sourceId;
  result.recovery={documentId:sourceId,recordId:record.id,revision:record.revision};
  return result;
 }
 async function persist(snapshot,target){
  if(snapshot.document?.id!==target.documentId)fail('STALE_RECOVERY','현재 문서와 복구본 연결이 다릅니다.');
  const document=copy(snapshot.document),assets=copy(snapshot.assets??{});
  if(target.recordId!==document.id){
   if(!identityAvailable(document,target.recordId))fail('INVALID_RECOVERY_ID','복구본 식별자가 문서 내용과 겹칩니다.');
   const key=prefix+target.recordId;
   if(Object.hasOwn(document.extensions??{},key))fail('RECOVERY_MARKER_COLLISION','기존 문서 정보를 보존하기 위해 복구본 저장을 중단했습니다.');
   const hadExtensions=Object.hasOwn(document,'extensions');
   document.extensions={...document.extensions,[key]:{owner:OWNER,version:1,sourceDocumentId:document.id,recordId:target.recordId,hadExtensions}};
   document.id=target.recordId;
  }
  const raw=await saveDocument({document,assets,expectedRevision:target.revision});
  if(raw.id!==target.recordId||raw.document?.id!==target.recordId)fail('INVALID_RECOVERY_RECORD','저장된 복구본 식별자가 다릅니다.');
  return decode(raw);
 }
 return {
  reset({documentId,record=null}){
   epoch++;
   const descriptor=record?.recovery;
   if(descriptor&&descriptor.documentId!==documentId)fail('INVALID_RECOVERY_RECORD','복구본의 원문서 식별자가 다릅니다.');
   // Loaded provenance describes the source, never a shared writer binding.
   // Every editor session owns a fresh auxiliary record, including restores.
   binding={documentId,recordId:freshId(documentId),revision:null};
   return state();
  },
  async save(snapshot){
   if(!binding)fail('RECOVERY_NOT_READY','복구본 연결이 없습니다.');
   const captured=state(),generation=epoch,detached=copy(snapshot);
   let record;
   try{record=await persist(detached,{...captured,revision:detached.expectedRevision});}
   catch(error){
    if(error.code!=='CONFLICT')throw error;
    if(generation!==epoch||binding.recordId!==captured.recordId)fail('STALE_RECOVERY','이전 문서의 복구본 저장이 취소되었습니다.');
    // Preserve the conflicting record. Fork this exact snapshot once rather
    // than rebasing its revision, overwriting another writer, or looping.
    record=await persist(detached,{documentId:captured.documentId,recordId:freshId(captured.documentId),revision:null});
   }
   if(generation===epoch&&binding.recordId===captured.recordId)binding={...record.recovery};
   return record;
  },
  async createFresh(snapshot){
   const generation=epoch,documentId=snapshot.document.id;
   const record=await persist(snapshot,{documentId,recordId:freshId(documentId),revision:null});
   return {record,descriptor:{...record.recovery,epoch:generation}};
  },
  activate(descriptor){
   if(descriptor?.epoch!==epoch||descriptor.documentId!==binding?.documentId)return false;
   binding={documentId:descriptor.documentId,recordId:descriptor.recordId,revision:descriptor.revision};epoch++;return true;
  },
  async loadRecord(id){return decode(await loadDocument(id));},
  async loadCurrentRecord(){if(!binding)fail('RECOVERY_NOT_READY','복구본 연결이 없습니다.');const id=binding.recordId;return decode(await loadDocument(id));},
  getState:state,
  cancel(){epoch++;},
 };
}
