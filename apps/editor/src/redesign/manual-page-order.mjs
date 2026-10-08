/** All logical cover records; legacy single-cover documents keep their shape. */
export function getManualDocumentCovers(document){return Array.isArray(document?.covers)?document.covers:document?.cover?[document.cover]:[];}
export function withManualDocumentCovers(document,covers){
 if(!Array.isArray(covers))throw new TypeError('Manual covers must be an array');
 const result=structuredClone(document);delete result.cover;delete result.covers;
 if(covers.length===1)result.cover=structuredClone(covers[0]);else if(covers.length>1)result.covers=structuredClone(covers);
 return result;
}
export const MANUAL_PAGE_ORDER_OWNER='@lk-design-system/manual-page-order';
const recognized=value=>value&&value.owner===MANUAL_PAGE_ORDER_OWNER&&value.version===1&&value.kind==='pages';
export function readManualPageOrder(extensions){
 if(!extensions||typeof extensions!=='object'||Array.isArray(extensions))return null;
 for(const [key,value]of Object.entries(extensions))if(recognized(value))return {key,order:value.order};
 return null;
}
/** Returns the original page objects, including a cover at its actual position. */
export function getOrderedPageEntries(document){
 const canonical=[...getManualDocumentCovers(document),...document.pages],marker=readManualPageOrder(document.extensions),byId=new Map(canonical.map(page=>[page.id,page]));
 if(!Array.isArray(marker?.order)||marker.order.length!==canonical.length||new Set(marker.order).size!==canonical.length||marker.order.some(id=>!byId.has(id)))return canonical;
 return marker.order.map(id=>byId.get(id));
}
/** Add our marker only for a noncanonical order; leave foreign namespaces opaque. */
export function withManualPageOrder(document,order){
 const result=structuredClone(document),canonical=[...getManualDocumentCovers(document).map(cover=>cover.id),...document.pages.map(page=>page.id)],old=readManualPageOrder(document.extensions);
 if(!Array.isArray(order)||order.length!==canonical.length||new Set(order).size!==canonical.length||order.some(id=>!canonical.includes(id)))throw new TypeError('Invalid manual page order');
 if(!old&&order.every((id,index)=>id===canonical[index]))return result;
 const extensions=result.extensions??={},keyBase='manualPageOrder';let key=old?.key||keyBase;
 for(let i=2;!old&&Object.hasOwn(extensions,key);i++)key=`${keyBase}${i}`;
 extensions[key]={...(old?extensions[key]:{}),owner:MANUAL_PAGE_ORDER_OWNER,version:1,kind:'pages',order:[...order]};result.extensions=extensions;
 return result;
}
export function remapManualPageOrder(extensions,idMap){
 const result=structuredClone(extensions),old=readManualPageOrder(result);
 if(old&&Array.isArray(old.order))result[old.key].order=old.order.map(id=>idMap.get(id)||id);
 return result;
}
