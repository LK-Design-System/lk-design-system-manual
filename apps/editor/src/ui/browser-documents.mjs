const DB='lds-manual-browser-documents';
function database(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore('documents',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function transaction(mode,run){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('documents',mode),request=run(tx.objectStore('documents'));tx.oncomplete=()=>resolve(request.result);tx.onabort=()=>reject(tx.error||new Error('브라우저 저장 실패'));tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
export const saveBrowserDocument=record=>transaction('readwrite',store=>store.put(record));
export const listBrowserDocuments=async()=> (await transaction('readonly',store=>store.getAll())).sort((a,b)=>b.savedAt-a.savedAt);
export function decodeBrowserFile(value){
  const bundle=value?.format==='lds-manual-browser/v1';
  const result=bundle?{document:value.document,sidecars:value.sidecars||{},assets:value.assets||{}}:{document:value,sidecars:{},assets:{}};
  if(!result.assets||typeof result.assets!=='object'||Array.isArray(result.assets))throw new Error('그림 데이터 형식을 확인하세요.');
  for(const source of Object.values(result.assets))if(typeof source!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(source))throw new Error('PNG, JPEG, WebP 그림만 열 수 있습니다.');
  return result;
}
export function imageData(file){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))return Promise.reject(new Error('PNG, JPEG, WebP 이미지를 선택하세요.'));
  if(file.size>20*1024*1024)return Promise.reject(new Error('20MB 이하의 이미지를 선택하세요.'));
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});
}
