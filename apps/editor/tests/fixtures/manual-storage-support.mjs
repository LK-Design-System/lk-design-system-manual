// Isolated QA storage: the editor uses its ordinary storage contract, while
// this fixture never opens IndexedDB or the host file API.
import {prepareDocumentRecord} from '../../src/redesign/document-store.mjs';
const clone=value=>structuredClone(value);
export function createManualStorageFixture(initialDocuments=[],{wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),delay=1200,initialAssets={}}={}){
 const records=new Map(),listeners=new Set();let mode='normal',delayLoads=false,attempts=0,commits=0,activeWrites=0,activeLoads=0,serial=0;
 for(const document of initialDocuments){const record=prepareDocumentRecord({document,assets:initialAssets[document.id]??{},expectedRevision:null},undefined,{revision:`qa-initial-${++serial}`,savedAt:100-serial});records.set(record.id,record);}
 const getStatus=()=>({mode,delayLoads,attempts,commits,activeWrites,activeLoads,records:[...records.values()].map(record=>({id:record.id,title:record.document.title,revision:record.revision,pages:record.document.pages.length,assets:Object.keys(record.assets).length,content:record.document.pages.flatMap(page=>page.blocks).map(block=>({type:block.type,text:block.content?.map(run=>run.text||'\n').join('')??block.text??''}))}))});
 const emit=()=>{for(const listener of listeners)listener(getStatus());};
 const api={
  async listDocuments(){return [...records.values()].sort((a,b)=>b.savedAt-a.savedAt).map(({id,revision,savedAt,document})=>({id,revision,savedAt,title:document.title}));},
  async loadDocument(id){
   const record=records.get(id);if(!record)throw Object.assign(new Error('합성 문서를 찾을 수 없습니다.'),{code:'NOT_FOUND'});
   const snapshot=clone(record);activeLoads++;emit();
   try{if(delayLoads)await wait(delay);return snapshot;}finally{activeLoads--;emit();}
  },
  async saveDocument(value){
   const snapshot=clone(value),startedMode=mode;attempts++;activeWrites++;emit();
   try{
    if(startedMode==='delayed')await wait(delay);
    if(startedMode==='quota')throw Object.assign(new Error('합성 저장 공간 부족: 현재 내용은 편집기에 남아 있습니다.'),{name:'QuotaExceededError',code:'QuotaExceededError'});
    const record=prepareDocumentRecord(snapshot,records.get(snapshot.document.id),{revision:`qa-save-${++serial}`,savedAt:Date.now()});records.set(record.id,record);commits++;emit();return clone(record);
   }finally{activeWrites--;emit();}
  }
 };
 return {api,getStatus,subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},setMode:value=>{if(!['normal','quota','delayed'].includes(value))throw new TypeError('Unsupported QA mode');mode=value;emit();},setDelayLoads:value=>{delayLoads=!!value;emit();},readSaved:id=>clone(records.get(id))};
}
