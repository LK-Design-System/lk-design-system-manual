// Isolated v2 workspace: never opens the v1 editor database or host save API.
import {validateManualDocument} from './manual-v2.mjs';

export const DOCUMENT_FILE_FORMAT='lds-manual-document/v2';
const DATABASE='lds-manual-redesign-v2';
const MAX_IMAGE_BYTES=20*1024*1024;
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const clone=value=>JSON.parse(JSON.stringify(value));
function error(code,message){return Object.assign(new Error(message),{code});}
function record(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}

export function validateAssets(assets={}){
 if(!record(assets))throw error('INVALID_ASSETS','그림 데이터 형식을 확인하세요.');
 for(const [name,source]of Object.entries(assets)){
  if(!name||name.length>1024||/[\\\u0000-\u001f:]/.test(name)||name.startsWith('/')||name.split('/').some(part=>!part||part==='.'||part==='..')||['__proto__','constructor','prototype'].includes(name))throw error('INVALID_ASSETS','그림 이름은 안전한 상대 경로여야 합니다.');
  if(typeof source!=='string')throw error('INVALID_ASSETS','그림 데이터 형식을 확인하세요.');
  const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(source);
  if(!match||match[2].length%4!==0)throw error('INVALID_ASSETS','PNG, JPEG, WebP 그림만 저장할 수 있습니다.');
  const bytes=match[2].length/4*3-(match[2].endsWith('==')?2:match[2].endsWith('=')?1:0);
  if(bytes>MAX_IMAGE_BYTES)throw error('INVALID_ASSETS','그림 한 장의 크기는 20MB 이하여야 합니다.');
 }
 return assets;
}
function payload(value){
 if(!record(value))throw error('INVALID_DOCUMENT','문서 파일 형식을 확인하세요.');
 validateManualDocument(value.document);
 const assets=value.assets===undefined?{}:value.assets;
 validateAssets(assets);
 return clone({document:value.document,assets});
}
export function encodeDocumentFile(value){
 return JSON.stringify({format:DOCUMENT_FILE_FORMAT,...payload(value)},null,2)+'\n';
}
export function decodeDocumentFile(text){
 let value;
 try{value=typeof text==='string'?JSON.parse(text):text;}catch{throw error('INVALID_DOCUMENT','JSON 문서 파일을 읽을 수 없습니다.');}
 if(value?.schemaVersion===1||value?.format==='lds-manual-browser/v1')throw error('LEGACY_DOCUMENT','기존 형식의 문서입니다. 기존 에디터에서 열어 주세요. 원본은 변경되지 않았습니다.');
 if(value?.format!==DOCUMENT_FILE_FORMAT)throw error('UNSUPPORTED_FORMAT','지원하지 않는 문서 파일 형식입니다.');
 const unknown=Object.keys(value).filter(key=>!['format','document','assets'].includes(key));
 if(unknown.length)throw error('UNSUPPORTED_FORMAT','알 수 없는 파일 정보가 있어 손실 없이 열 수 없습니다.');
 return payload(value);
}
export function prepareDocumentRecord(value,current,{revision=globalThis.crypto.randomUUID(),savedAt=Date.now()}={}){
 const data=payload(value);
 if(!own(value,'expectedRevision'))throw error('REVISION_REQUIRED','저장할 문서의 기준 버전이 필요합니다.');
 if((current?.revision??null)!==value.expectedRevision)throw error('CONFLICT','다른 탭에서 이 문서가 변경됐습니다. 현재 내용을 파일로 보관하거나 저장된 문서를 다시 열어 주세요.');
 if(current&&current.id!==data.document.id)throw error('INVALID_DOCUMENT','문서 식별자가 일치하지 않습니다.');
 return {id:data.document.id,revision,savedAt,...data};
}
function openDatabase(){
 return new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(error('STORAGE_UNAVAILABLE','이 브라우저에서 문서 보관함을 사용할 수 없습니다. 파일로 내려받아 보관하세요.'));return;}
  const request=indexedDB.open(DATABASE,1);let rejected=false;
  request.onupgradeneeded=()=>request.result.createObjectStore('documents',{keyPath:'id'});
  request.onerror=()=>{rejected=true;reject(request.error);};
  request.onblocked=()=>{rejected=true;reject(error('STORAGE_BLOCKED','다른 탭을 닫고 보관함을 다시 열어 주세요.'));};
  request.onsuccess=()=>{if(rejected){request.result.close();return;}request.result.onversionchange=()=>request.result.close();resolve(request.result);};
 });
}
export async function listDocuments(){
 const db=await openDatabase();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('documents','readonly'),request=tx.objectStore('documents').getAll();
  tx.oncomplete=()=>{
   try{resolve(request.result.map(({id,revision,savedAt,document})=>({id,revision,savedAt,title:typeof document?.title==='string'?document.title:'읽을 수 없는 문서'})).sort((a,b)=>b.savedAt-a.savedAt));}catch(cause){reject(cause);}
  };
  tx.onabort=tx.onerror=()=>reject(tx.error||request.error||error('STORAGE_FAILED','보관함을 읽지 못했습니다.'));
 });}finally{db.close();}
}
export async function loadDocument(id){
 const db=await openDatabase();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('documents','readonly'),request=tx.objectStore('documents').get(id);
  tx.oncomplete=()=>{
   try{if(!request.result)throw error('NOT_FOUND','보관함에서 문서를 찾을 수 없습니다.');payload(request.result);resolve(request.result);}catch(cause){reject(cause);}
  };
  tx.onabort=tx.onerror=()=>reject(tx.error||request.error||error('STORAGE_FAILED','문서를 열지 못했습니다.'));
 });}finally{db.close();}
}
export async function saveDocument(value){
 // Validate before opening storage; repeat at the atomic compare-and-swap boundary.
 const data=payload(value),input={...value,...data};
 const db=await openDatabase();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('documents','readwrite'),store=tx.objectStore('documents');
  const request=store.get(data.document.id);let result,failure;
  request.onsuccess=()=>{
   try{result=prepareDocumentRecord(input,request.result);store.put(result);}catch(cause){failure=cause;tx.abort();}
  };
  tx.oncomplete=()=>resolve(result);
  tx.onabort=tx.onerror=()=>reject(failure||tx.error||request.error||error('STORAGE_FAILED','저장하지 못했습니다. 현재 내용을 파일로 내려받아 보관하세요.'));
 });}finally{db.close();}
}
