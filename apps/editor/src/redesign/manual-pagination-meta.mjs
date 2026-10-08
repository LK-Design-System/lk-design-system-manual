// This namespace is an editor-owned contract; other extensions remain opaque.
export const MANUAL_PAGINATION_OWNER='@lk-design-system/manual-pagination';
export const MANUAL_PAGINATION_VERSION=1;
export function manualPaginationMarker(extensions,kind){
 if(!extensions||typeof extensions!=='object'||Array.isArray(extensions))return null;
 for(const [key,value]of Object.entries(extensions)){
  if(!value||value.owner!==MANUAL_PAGINATION_OWNER||value.version!==MANUAL_PAGINATION_VERSION||value.kind!==kind)continue;
  if(kind==='page'&&typeof value.rootPageId!=='string'||kind==='block'&&(typeof value.rootBlockId!=='string'||typeof value.sourceType!=='string'))continue;
  return {...value,key};
 }return null;
}
export function withManualPaginationMarker(meta,marker){
 const result=structuredClone(meta||{}),emptyExtensions=Object.hasOwn(result,'extensions')&&Object.keys(result.extensions).length===0,extensions=result.extensions??={},old=manualPaginationMarker(extensions,marker.kind);
 let key=old?.key||'manualPagination';for(let index=2;!old&&Object.hasOwn(extensions,key);index++)key=`manualPagination${index}`;
 extensions[key]={...marker,...(emptyExtensions||old?.preserveEmptyExtensions?{preserveEmptyExtensions:true}:{}),owner:MANUAL_PAGINATION_OWNER,version:MANUAL_PAGINATION_VERSION};return result;
}
export function withoutManualPaginationMarker(meta,kind){
 const result=structuredClone(meta||{}),marker=manualPaginationMarker(result.extensions,kind);
 if(marker){delete result.extensions[marker.key];if(!Object.keys(result.extensions).length&&!marker.preserveEmptyExtensions)delete result.extensions;}return result;
}
// Only recognized pagination references are remapped when structural IDs renew.
export function remapManualPaginationMeta(meta,idMap){
 const result=structuredClone(meta||{});
 for(const kind of ['page','block']){const marker=manualPaginationMarker(result.extensions,kind);if(!marker)continue;const field=kind==='page'?'rootPageId':'rootBlockId',value=idMap.get(marker[field]);if(value)result.extensions[marker.key][field]=value;else{delete result.extensions[marker.key];if(!Object.keys(result.extensions).length&&!marker.preserveEmptyExtensions)delete result.extensions;}}
 return result;
}
