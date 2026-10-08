export const MANUAL_COVER_FLOW_PROVENANCE_OWNER='@lk-design-system/manual-cover-flow';
const OWNER=MANUAL_COVER_FLOW_PROVENANCE_OWNER,VERSION=1,KIND='provenance';
const own=(value,key)=>Object.hasOwn(value,key);
const record=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const nonempty=value=>typeof value==='string'&&value.length>0;

function requireJson(value,ancestors=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return;
 if(!value||typeof value!=='object'||ancestors.has(value))throw new TypeError('표지 흐름 이력은 JSON 데이터여야 합니다.');
 const prototype=Object.getPrototypeOf(value);
 if(!Array.isArray(value)&&prototype!==Object.prototype&&prototype!==null||Object.getOwnPropertySymbols(value).length)throw new TypeError('표지 흐름 이력은 JSON 데이터여야 합니다.');
 ancestors.add(value);
 if(Array.isArray(value)){
  for(let index=0;index<value.length;index++){
   if(!own(value,index))throw new TypeError('표지 흐름 이력은 JSON 데이터여야 합니다.');
   requireJson(value[index],ancestors);
  }
 }else for(const child of Object.values(value))requireJson(child,ancestors);
 ancestors.delete(value);
}
function clone(value){requireJson(value);return JSON.parse(JSON.stringify(value));}
function cloneMeta(meta){
 if(!record(meta??{}))throw new TypeError('표지 메타데이터가 필요합니다.');
 const result=clone(meta??{});
 if(own(result,'extensions')&&!record(result.extensions))throw new TypeError('표지 확장 메타데이터가 올바르지 않습니다.');
 return result;
}
function markerAt(extensions){
 if(!record(extensions))return null;
 for(const [key,value]of Object.entries(extensions))if(record(value)&&value.owner===OWNER&&value.version===VERSION&&value.kind===KIND&&nonempty(value.coverId)&&Array.isArray(value.records))return {key,value};
 return null;
}
export function readManualCoverFlowProvenance(extensions){return markerAt(extensions)?.value??null;}

function snapshot(value){
 if(!record(value)||!['id','type','reason'].every(key=>typeof value[key]==='string')||!record(value.attrs))return null;
 return {id:value.id,type:value.type,reason:value.reason,attrs:value.attrs,...(own(value,'content')?{content:value.content}:{})};
}
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(record(value))return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
 return value;
}
const signature=value=>{const fields=snapshot(value);return fields?JSON.stringify(canonical(fields)):null;};

/** Historical node snapshots live only in the owned extension packet. Existing
 * opaque history stays intact; repeating a snapshot never appends it again. */
export function withManualCoverFlowProvenance(meta,{coverId,records}={}){
 if(!nonempty(coverId)||!Array.isArray(records))throw new TypeError('표지 ID와 흐름 이력 배열이 필요합니다.');
 for(const value of records)if(!snapshot(value))throw new TypeError('흐름 이력의 ID, 종류, 이유와 attrs가 필요합니다.');
 const additions=clone(records),result=cloneMeta(meta),old=markerAt(result.extensions);
 const empty=own(result,'extensions')&&Object.keys(result.extensions).length===0;
 const extensions=result.extensions??={},history=old?.value.records??[];
 const seen=new Set(history.map(signature).filter(value=>value!==null));
 for(const value of additions){const key=signature(value);if(!seen.has(key)){history.push(value);seen.add(key);}}
 let key=old?.key||'manualCoverFlow';
 for(let suffix=2;!old&&own(extensions,key);suffix++)key=`manualCoverFlow${suffix}`;
 extensions[key]={...(old?.value??{}),owner:OWNER,version:VERSION,kind:KIND,coverId,records:history,...(empty?{preserveEmptyExtensions:true}:{})};
 result.extensions=extensions;return result;
}

/** Only the current cover owner is a live reference. Snapshot identities and
 * every historical/opaque attrs or content payload remain original evidence. */
export function remapManualCoverFlowProvenanceMeta(meta,idMap){
 const result=cloneMeta(meta),marker=markerAt(result.extensions);
 if(!marker)return result;
 const mapping=idMap instanceof Map?idMap:new Map(Object.entries(idMap||{}));
 if(mapping.has(marker.value.coverId)){
  const coverId=mapping.get(marker.value.coverId);
  if(!nonempty(coverId))throw new TypeError('새 표지 ID가 필요합니다.');
  result.extensions[marker.key].coverId=coverId;
 }
 return result;
}
