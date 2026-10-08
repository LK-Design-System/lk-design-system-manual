import {manualPageParts} from './manual-page-shape.mjs';
import {Fragment,Slice} from '@tiptap/pm/model';
import {Selection,SelectionRange,TextSelection} from '@tiptap/pm/state';
import {manualPaginationMarker,withoutManualPaginationMarker} from './manual-pagination-meta.mjs';

const children=node=>Array.from({length:node.childCount},(_,index)=>node.child(index));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function repeatedManualPaginationHeaders(doc){
 const headers=[],objects=new Map();doc.descendants(node=>{if(node.attrs.id)objects.set(node.attrs.id,node);});
 let root=null;doc.forEach((page,pos)=>{if(page.type.name!=='page')return;const marker=manualPaginationMarker(page.attrs.meta.extensions,'page');if(root&&marker?.rootPageId===root.attrs.id){const title=manualPageParts(page,pos).title;if(title)headers.push({key:`${page.attrs.id}/pageTitle`,from:title.pos,to:title.pos+title.node.nodeSize});}else root=page;});
 doc.descendants((node,pos)=>{
  const marker=manualPaginationMarker(node.attrs.meta?.extensions,'block'),source=marker&&objects.get(marker.rootBlockId);if(!source||source.type.name!==marker.sourceType)return;
  const title=['callout','toggle'].includes(node.type.name)&&marker.repeatedTitle,table=node.type.name==='table'&&marker.repeatedHeader;
  if(title||table)headers.push({key:`${node.attrs.id}/${node.firstChild.type.name}`,from:pos+1,to:pos+1+node.firstChild.nodeSize});
 });return headers;
}
function logicalContent(slice,excludedHeaders){
 function mergeable(left,right){
  if(left.type!==right.type||!left.attrs.id)return false;
  const kind=right.type.name==='page'?'page':'block',marker=manualPaginationMarker(right.attrs.meta?.extensions,kind),previous=manualPaginationMarker(left.attrs.meta?.extensions,kind),field=kind==='page'?'rootPageId':'rootBlockId';
  if(!marker||marker[field]!==(previous?.[field]||left.attrs.id))return false;
  if(kind==='page')return !children(right).some(node=>node.type.name==='pageTitle');
  if(marker.repeatedTitle&&children(right).some(node=>['calloutTitle','toggleTitle'].includes(node.type.name))||marker.repeatedHeader&&children(right).some(node=>node.type.name==='tableRow'&&node.attrs.header))return false;
  const a=withoutManualPaginationMarker(left.attrs.meta,'block'),b=withoutManualPaginationMarker(right.attrs.meta,'block');
  if(['orderedList','procedure'].includes(left.type.name)){delete a.start;delete b.start;}
  return same({...left.attrs,id:null,meta:a},{...right.attrs,id:null,meta:b});
 }
 function coalesce(nodes){const result=[];for(const node of nodes){const last=result.at(-1);if(last&&mergeable(last,node)){result[result.length-1]=last.copy(Fragment.fromArray(coalesce([...children(last),...children(node)])));}else result.push(node);}return result;}
 function scrub(node){
  if(node.isText)return node;
  const page=manualPaginationMarker(node.attrs.meta?.extensions,'page'),block=manualPaginationMarker(node.attrs.meta?.extensions,'block');
  const excluded=kind=>excludedHeaders.includes(`${node.attrs.id}/${kind}`);
  const nodes=children(node).filter(child=>!(node.type.name==='page'&&page&&child.type.name==='pageTitle'&&excluded('pageTitle'))&&!(['callout','toggle'].includes(node.type.name)&&block?.repeatedTitle&&['calloutTitle','toggleTitle'].includes(child.type.name)&&excluded(child.type.name))&&!(node.type.name==='table'&&block?.repeatedHeader&&child.type.name==='tableRow'&&child.attrs.header&&excluded('tableRow'))).map(scrub);
  return node.copy(Fragment.fromArray(coalesce(nodes)));
 }
 const content=Fragment.fromArray(coalesce(children(slice.content).map(scrub)));return new Slice(content,slice.openStart,slice.openEnd);
}
/** A generated selection retains ordinary anchor/head DOM coordinates, while
 * its logical ranges operate only on the original editable inline content.
 * Empty page/container frames survive replacement and are merged by reflow.
 */
export class ManualPaginationTextSelection extends TextSelection{
 constructor(doc,anchor,head=anchor,excludedHeaders=[]){
  super(doc.resolve(anchor),doc.resolve(head));this.manualPaginationTextSelection=true;
  this.excludedHeaders=[...new Set(excludedHeaders)];const low=Math.min(anchor,head),high=Math.max(anchor,head),headers=repeatedManualPaginationHeaders(doc).filter(header=>this.excludedHeaders.includes(header.key)),ranges=[];
  doc.nodesBetween(low,high,(node,pos)=>{
   if(!node.inlineContent)return;
   if(headers.some(header=>pos>=header.from&&pos+node.nodeSize<=header.to))return false;
   const from=Math.max(low,pos+1),to=Math.min(high,pos+node.nodeSize-1);if(from<to)ranges.push(new SelectionRange(doc.resolve(from),doc.resolve(to)));return false;
  });if(ranges.length)this.ranges=ranges;
 }
 get $to(){return this.ranges.at(-1).$to;}
 eq(other){return other instanceof ManualPaginationTextSelection&&this.anchor===other.anchor&&this.head===other.head&&same(this.excludedHeaders,other.excludedHeaders)&&this.ranges.length===other.ranges.length&&this.ranges.every((range,index)=>range.$from.pos===other.ranges[index].$from.pos&&range.$to.pos===other.ranges[index].$to.pos);}
 map(doc,mapping){const head=doc.resolve(mapping.map(this.head)),anchor=doc.resolve(mapping.map(this.anchor));if(!head.parent.inlineContent)return Selection.near(head);return manualPaginationTextSelection(doc,anchor.parent.inlineContent?anchor.pos:head.pos,head.pos,this.excludedHeaders);}
 content(){return logicalContent(this.$anchor.doc.slice(Math.min(this.anchor,this.head),Math.max(this.anchor,this.head),true),this.excludedHeaders);}
 toJSON(){return {type:'manual-pagination-text',anchor:this.anchor,head:this.head,excludedHeaders:this.excludedHeaders};}
 static fromJSON(doc,json){return manualPaginationTextSelection(doc,json.anchor,json.head,json.excludedHeaders||[]);}
 getBookmark(){return bookmark(this.anchor,this.head,this.excludedHeaders);}
}
function bookmark(anchor,head,excludedHeaders){return {map:mapping=>bookmark(mapping.map(anchor),mapping.map(head),excludedHeaders),resolve:doc=>manualPaginationTextSelection(doc,anchor,head,excludedHeaders)};}
Selection.jsonID('manual-pagination-text',ManualPaginationTextSelection);
export function manualPaginationTextSelection(doc,anchor,head=anchor,excludedHeaders=[]){
 const low=Math.min(anchor,head),high=Math.max(anchor,head);
 return low<high&&repeatedManualPaginationHeaders(doc).some(header=>excludedHeaders.includes(header.key)&&header.from<high&&header.to>low)?new ManualPaginationTextSelection(doc,anchor,head,excludedHeaders):TextSelection.create(doc,anchor,head);
}
