import {manualPaginationMarker} from './manual-pagination-meta.mjs';
export const MANUAL_PAGE_PROJECTION_OWNER='@lk-design-system/manual-page-projection';
const OWNER=MANUAL_PAGE_PROJECTION_OWNER,ROLES=['title','lead'];
const clone=value=>structuredClone(value),record=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
function markerAt(extensions,kind){
 if(!record(extensions))return null;
 for(const [key,value]of Object.entries(extensions))if(record(value)&&value.owner===OWNER&&value.version===1&&value.kind===kind){
  if(kind==='role'&&(!ROLES.includes(value.role)||typeof value.pageId!=='string'||typeof value.blockId!=='string'))continue;
  if(kind==='layout'&&(!Array.isArray(value.order)||!value.order.every(id=>typeof id==='string')))continue;
  return {key,value};
 }return null;
}
export const getManualPageProjection=extensions=>markerAt(extensions,'role')?.value??null;
export function getManualPageRoleIds(extensions){const layout=markerAt(extensions,'layout')?.value;return Object.fromEntries(Object.entries(layout?.roleIds||{}).filter(([role,id])=>ROLES.includes(role)&&typeof id==='string'));}
export function withManualPageRole(meta,pageId,role,blockId,{originalInline=[],identityPinned=false}={}){
 if(!ROLES.includes(role)||typeof pageId!=='string'||!pageId||typeof blockId!=='string'||!blockId)throw new TypeError('페이지 필드 역할과 ID가 필요합니다.');
 const result=clone(meta||{}),empty=Object.hasOwn(result,'extensions')&&Object.keys(result.extensions).length===0;
 result.extensions=put(result.extensions,'role',{pageId,role,blockId,originalInline,...(identityPinned?{identityPinned:true}:{}),...(empty?{preserveEmptyExtensions:true}:{})});return result;
}
function put(extensions,kind,fields){
 const result=clone(extensions||{}),old=markerAt(result,kind);let key=old?.key||'manualPageProjection';
 for(let n=2;!old&&Object.hasOwn(result,key);n++)key=`manualPageProjection${n}`;
 result[key]={...clone(old?.value||{}),owner:OWNER,version:1,kind,...clone(fields)};return result;
}
export function withoutManualPageRole(meta){
 const result=clone(meta||{}),marker=markerAt(result.extensions,'role');
 if(marker){delete result.extensions[marker.key];if(!Object.keys(result.extensions).length&&!marker.value.preserveEmptyExtensions)delete result.extensions;}
 return result;
}
function collectIds(value,result){if(!value||typeof value!=='object')return;if(typeof value.id==='string')result.add(value.id);for(const [key,child]of Object.entries(value))if(key!=='extensions')collectIds(child,result);}
function fresh(base,used){let id=base;for(let n=2;used.has(id);n++)id=`${base}:${n}`;used.add(id);return id;}
function normalized(runs){
 const result=[];for(const source of runs||[]){const run=clone(source);if(run.marks?.length)run.marks=run.marks.map(mark=>Object.fromEntries(Object.entries(mark).sort())).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));else delete run.marks;
  const last=result.at(-1);if(run.type==='text'&&last?.type==='text'&&JSON.stringify(run.marks||[])===JSON.stringify(last.marks||[]))last.text+=run.text;else result.push(run);
 }return result;
}
const originalInline=(current,original)=>clone(JSON.stringify(normalized(current))===JSON.stringify(normalized(original))?original:current);
/** Existing v2 heading/paragraph DTOs; the scalar fields remain the file contract. */
export function projectManualPage(page,{usedIds=[]}={}){
 const used=new Set(usedIds);collectIds(page,used);const layout=markerAt(page.extensions,'layout')?.value,roles={};
 for(const role of ROLES){const saved=layout?.roleIds?.[role];roles[role]=typeof saved==='string'&&!used.has(saved)?(used.add(saved),saved):fresh(`manual-page:${page.id}:${role}`,used);}
 const fields=[];
 for(const role of ROLES){if(layout?.omittedRoles?.includes(role)||role==='lead'&&!Object.hasOwn(page,'lead'))continue;
  const block={id:roles[role],type:role==='title'?'heading':'paragraph',...(role==='title'?{level:2}:{}),content:clone(page[role])};
  const extensions=clone(layout?.roleExtensions?.[role]||{}),automatic=manualPaginationMarker(page.extensions,'page');block.extensions=put(extensions,'role',{pageId:page.id,role,blockId:block.id,originalInline:page[role],...(Array.isArray(layout?.pinnedRoles)&&layout.pinnedRoles.includes(role)?{identityPinned:true}:{}),...(role==='title'&&automatic?{derivedFrom:automatic.rootPageId}:{}),...(Object.keys(extensions).length===0&&layout?.roleExtensions?.[role]?{preserveEmptyExtensions:true}:{})});fields.push(block);
 }
 const all=[...fields,...clone(page.blocks)],pool=new Map(all.map(block=>[block.id,block])),taken=new Set();
 const aliases=new Map(Object.entries(layout?.roleIds||{}).filter(([role])=>ROLES.includes(role)).map(([role,id])=>[id,roles[role]]));
 const blocks=(layout?.order||[]).flatMap(raw=>{const id=aliases.get(raw)||raw,block=pool.get(id);if(!block||taken.has(id))return [];taken.add(id);return [block];});
 blocks.push(...all.filter(block=>!taken.has(block.id)));return {blocks,roleIds:roles};
}
export function restoreManualPage(pageMeta,blocks){
 const roles=new Map();for(const block of blocks){const role=getManualPageProjection(block.extensions);
  if(role?.pageId!==pageMeta.id||role.blockId!==block.id||!(role.role==='title'?block.type==='heading'&&block.level===2:block.type==='paragraph'))continue;
  if(roles.has(role.role))roles.set(role.role,null);else roles.set(role.role,block);
 }
 const result=clone(pageMeta);delete result.title;delete result.lead;delete result.blocks;
 const title=roles.get('title'),lead=roles.get('lead');result.title=title?originalInline(title.content,getManualPageProjection(title.extensions).originalInline??title.content):[];
 if(lead)result.lead=originalInline(lead.content,getManualPageProjection(lead.extensions).originalInline??lead.content);
 const consumed=new Set([title?.id,lead?.id].filter(Boolean));result.blocks=blocks.filter(block=>!consumed.has(block.id)).map(withoutManualPageRole);
 const old=markerAt(result.extensions,'layout'),roleIds={...clone(old?.value.roleIds||{}),...Object.fromEntries([...roles].filter(([,block])=>block).map(([role,block])=>[role,block.id]))};
 const order=blocks.map(block=>block.id),expected=[title?.id,lead?.id,...result.blocks.map(block=>block.id)].filter(Boolean),omittedRoles=title?[]:['title'],roleExtensions={};
 for(const [role,block]of roles)if(block){const clean=withoutManualPageRole(block);if(Object.hasOwn(clean,'extensions'))roleExtensions[role]=clean.extensions;}
 const pinnedRoles=[...(Array.isArray(old?.value.pinnedRoles)?old.value.pinnedRoles.filter(role=>!ROLES.includes(role)):[]),...[...roles].filter(([,block])=>block&&getManualPageProjection(block.extensions)?.identityPinned).map(([role])=>role)];
 const nondefault=pinnedRoles.length||omittedRoles.length||JSON.stringify(order)!==JSON.stringify(expected)||Object.keys(roleExtensions).length;
 if(nondefault||old&&Object.keys(old.value).some(key=>!['owner','version','kind','order','roleIds','omittedRoles','roleExtensions','preserveEmptyExtensions','pinnedRoles'].includes(key))||old&&Object.hasOwn(old.value,'pinnedRoles')&&!Array.isArray(old.value.pinnedRoles))result.extensions=put(result.extensions,'layout',{order,roleIds,omittedRoles,roleExtensions,...(pinnedRoles.length||Array.isArray(old?.value.pinnedRoles)?{pinnedRoles}:{}),...(old?.value.preserveEmptyExtensions||Object.hasOwn(result,'extensions')&&!Object.keys(result.extensions).length?{preserveEmptyExtensions:true}:{})});
 else if(old){delete result.extensions[old.key];if(!Object.keys(result.extensions).length&&!old.value.preserveEmptyExtensions)delete result.extensions;}
 return result;
}
/** Only owned references change. Standalone field copies lose their scalar binding. */
export function remapManualPageProjectionMeta(meta,idMap){
 const result=clone(meta||{}),role=markerAt(result.extensions,'role'),layout=markerAt(result.extensions,'layout');
 if(role){if(idMap.has(role.value.pageId)){result.extensions[role.key].pageId=idMap.get(role.value.pageId);result.extensions[role.key].blockId=idMap.get(role.value.blockId)||role.value.blockId;}
  else return withoutManualPageRole(result);}
 if(layout){result.extensions[layout.key].order=layout.value.order.map(id=>idMap.get(id)||id);result.extensions[layout.key].roleIds=Object.fromEntries(Object.entries(layout.value.roleIds||{}).map(([key,id])=>[key,idMap.get(id)||id]));}
 return result;
}
