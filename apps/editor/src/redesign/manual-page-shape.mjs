import {getManualPageProjection,withoutManualPageRole,withManualPageRole} from './manual-page-projection.mjs';
import {getManualCoverProjection,withoutManualCoverRole,isManualCoverProjectionBlock} from './manual-cover-legacy-projection.mjs';
export function manualPageRole(node){const marker=getManualPageProjection(node?.attrs?.meta?.extensions);return marker?.blockId===node?.attrs?.id?marker:null;}
export function manualPageParts(node,pos=-1){
 const headers=[],blocks=[];node.forEach((child,offset,index)=>{const entry={node:child,pos:pos+1+offset,index};(['pageTitle','pageLead'].includes(child.type.name)?headers:blocks).push(entry);});
 const leading=headers.every((entry,index)=>entry.index===index),title=headers.find(entry=>entry.node.type.name==='pageTitle');return {headers,blocks,leading,title,bodyStart:pos+1+headers.reduce((sum,item)=>sum+item.node.nodeSize,0)};
}
/** Cover roles remain attached to their authored first surface even when moved
 * inside its body. Ordinary body blocks alone flow into continuation pages. */
export function manualPaginationPageParts(node,pos=-1){
 if(node.type.name!=='cover')return {...manualPageParts(node,pos),body:{node,pos},cover:false};
 const headers=[],bodyHeaders=[],blocks=[];let body=null,title=null;
 const roleOf=child=>{const marker=getManualCoverProjection(child.attrs.meta?.extensions),block={...child.attrs.meta,id:child.attrs.id,type:child.type.name,...(child.type.name==='heading'?{level:child.attrs.level}:{}),...(child.type.name==='figure'?{caption:child.firstChild?.content.size?[null]:[]}:{})};return marker?.coverId===node.attrs.id&&marker.blockId===child.attrs.id&&isManualCoverProjectionBlock(block,marker.role)?marker:null;};
 node.forEach((child,offset,index)=>{
  const at=pos+1+offset;
  if(child.type.name!=='coverSectionFrame'){const entry={node:child,pos:at,index};headers.push(entry);if(roleOf(child)?.role==='title')title=entry;return;}
  child.forEach((part,inner,partIndex)=>{
   const partPos=at+1+inner;
   if(part.type.name!=='coverBody'){const entry={node:part,pos:partPos,index:partIndex};headers.push(entry);if(roleOf(part)?.role==='title')title=entry;return;}
   body={node:part,pos:partPos};part.forEach((block,blockOffset,blockIndex)=>{const entry={node:block,pos:partPos+1+blockOffset,index:blockIndex};if(roleOf(block)){headers.push(entry);bodyHeaders.push(entry);if(roleOf(block).role==='title')title=entry;}else blocks.push(entry);});
  });
 });
 return {headers,bodyHeaders,blocks,body,title,cover:true,leading:false,bodyStart:body?body.pos+1:pos+1};
}
export function ordinaryManualPageField(node){
 if(!['pageTitle','pageLead'].includes(node.type.name))return node;
 return node.type.schema.nodes[node.type.name==='pageTitle'?'heading':'paragraph'].create({...node.attrs,meta:withoutManualPageRole(node.attrs.meta),...(node.type.name==='pageTitle'?{level:2}:{})},node.content,node.marks);
}
export function manualContinuationTitle(root,pageId,{usedIds=[],id}={}){
 const source=manualPaginationPageParts(root).title?.node;if(!source)return null;
 const used=new Set(usedIds),base=`manual-page:${pageId}:title`;if(!id){id=base;for(let suffix=2;used.has(id);suffix++)id=`${base}:${suffix}`;}
 const meta=root.type.name==='cover'?withManualPageRole(withoutManualCoverRole(source.attrs.meta),pageId,'title',id,{originalInline:getManualCoverProjection(source.attrs.meta.extensions)?.originalInline||[]}):structuredClone(source.attrs.meta),role=getManualPageProjection(meta.extensions);if(role)for(const value of Object.values(meta.extensions))if(value===role){value.pageId=pageId;value.blockId=id;value.derivedFrom=root.attrs.id;delete value.identityPinned;}
 return root.type.schema.nodes.pageTitle.create({id,meta},source.content,source.marks);
}
