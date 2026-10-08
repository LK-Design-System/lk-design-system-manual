import test from 'node:test';
import assert from 'node:assert/strict';
import {MANUAL_COVER_ELEMENT_ROLES,createManualCoverElement,createMinimalManualCover} from '../src/redesign/manual-cover-elements.mjs';
import {MANUAL_BRAND_ASSETS} from '../src/redesign/manual-brand-assets.mjs';
import {projectManualCover,restoreManualCover,getManualCoverProjection,getManualCoverCellProjection,MANUAL_COVER_PROJECTION_OWNER} from '../src/redesign/manual-cover-legacy-projection.mjs';

const clone=value=>structuredClone(value);
const roles=['logo','title','metadata','divider','sectionTitle'];
const metadataLabels=['문서 버전','작성일','적용 기기','적용 환경'];
const options={logoVariantId:'logo-inline-navy'};
const roleOf=block=>getManualCoverProjection(block.extensions)?.role;
const coverMeta=cover=>Object.fromEntries(Object.entries(clone(cover)).filter(([key])=>!['title','metadata','logo','sectionTitle','blocks'].includes(key)));
const allBlocks=projected=>[...projected.headerBlocks,...projected.bodyBlocks];
function ids(value,result=[]){
 if(!value||typeof value!=='object')return result;
 if(typeof value.id==='string')result.push(value.id);
 for(const [key,child]of Object.entries(value))if(key!=='extensions')ids(child,result);
 return result;
}
function body(){return [
 {id:'synthetic-heading',type:'heading',level:2,content:[{type:'text',text:'합성 본문 제목',marks:[{type:'underline'},{type:'strong'}]}],extensions:{vendor:{id:'opaque-heading',future:[null,true]}}},
 {id:'synthetic-paragraph',type:'paragraph',content:[{type:'text',text:'합성 ',marks:[{type:'link',href:'https://example.invalid/synthetic'},{type:'strong'}]},{type:'text',text:'본문',marks:[{type:'strong'},{type:'link',href:'https://example.invalid/synthetic'}]}],extensions:{manualCoverProjection:{owner:'foreign',id:'opaque-role'},vendor:{empty:{}}}},
];}
const metadataEntries=block=>[block.headers,...block.rows].flatMap(row=>[row[0],row[2]]).map(cell=>clone(getManualCoverCellProjection(cell.extensions).entry));

test('the cover element vocabulary is exactly five frozen roles',()=>{
 assert.deepEqual(MANUAL_COVER_ELEMENT_ROLES,roles);
 assert.equal(Object.isFrozen(MANUAL_COVER_ELEMENT_ROLES),true);
 assert.throws(()=>MANUAL_COVER_ELEMENT_ROLES.push('wholeTemplate'),TypeError);
});

for(const role of roles)test(`${role} returns only the exact existing projection block and binding`,()=>{
 const element=createManualCoverElement('synthetic-cover',role,options);
 const source={id:'synthetic-cover',title:[],metadata:role==='metadata'?metadataEntries(element.block):[],blocks:[],
  ...(role==='logo'?{logo:{src:MANUAL_BRAND_ASSETS.find(asset=>asset.id===options.logoVariantId).asset,alt:'LK Robotics 로고'}}:{}),
  ...(role==='sectionTitle'?{sectionTitle:[]}:{}),
 };
 const expected=allBlocks(projectManualCover(source)).find(block=>roleOf(block)===role);
 assert.deepEqual(element.block,expected);
 const marker=getManualCoverProjection(element.block.extensions);
 assert.equal(marker.owner,MANUAL_COVER_PROJECTION_OWNER);
 assert.equal(marker.coverId,'synthetic-cover');
 assert.equal(marker.blockId,element.block.id);
 assert.equal(marker.role,role);
 assert.equal(element.block.type,{logo:'figure',title:'heading',metadata:'table',divider:'divider',sectionTitle:'heading'}[role]);
 assert.deepEqual(Object.keys(element).sort(),role==='logo'?['block','defaultWidthPx','minimumWidthPx']:['block']);
 if(role==='title'||role==='sectionTitle'){
  assert.equal(element.block.level,role==='title'?1:2);
  assert.deepEqual(element.block.content,[]);
 }
 const restored=restoreManualCover({id:'synthetic-cover'},{headerBlocks:role==='sectionTitle'?[]:[element.block],bodyBlocks:role==='sectionTitle'?[element.block]:[]});
 const again=projectManualCover(restored);
 assert.deepEqual(allBlocks(again).map(roleOf),[role]);
 assert.deepEqual(allBlocks(again)[0],element.block);
 assert.deepEqual(restoreManualCover(coverMeta(restored),again),restored);
});

test('metadata reuses four canonical labels with empty values and four logical cells per row',()=>{
 const {block}=createManualCoverElement('synthetic-cover','metadata');
 assert.equal(block.label,'문서 정보');
 assert.equal(block.headers.length,4);
 assert.equal(block.rows.length,1);
 const entries=metadataEntries(block);
 assert.deepEqual(entries.map(entry=>entry.label),metadataLabels.map(text=>[{type:'text',text}]));
 assert.deepEqual(entries.map(entry=>entry.value),[[],[],[],[]]);
 for(const [rowIndex,row]of [block.headers,...block.rows].entries())for(const [index,cell]of row.entries()){
  assert.equal(row.length,4);
  const marker=getManualCoverCellProjection(cell.extensions);
  assert.equal(marker.coverId,'synthetic-cover');
  assert.equal(marker.tableId,block.id);
  assert.equal(marker.cellId,cell.id);
  assert.equal(marker.field,index%2?'value':'label');
  const entry=entries[rowIndex*2+Math.floor(index/2)];
  assert.deepEqual(marker.entry,entry);
  assert.equal(Object.hasOwn(marker,'canonicalColspan'),false);
  assert.deepEqual(cell.content,index%2?[]:entry.label);
  if(index%2===0)assert.equal(cell.id,entry.id);
 }
 assert.equal(new Set(ids(block)).size,ids(block).length);
});

test('removing one factory metadata entry preserves the projection odd-row span/padding contract',()=>{
 const {cover}=createMinimalManualCover({id:'synthetic-cover'},[],'metadata');
 cover.metadata.pop();
 cover.metadata[2].value=[{type:'text',text:'합성 값',marks:[{type:'strong'}]}];
 const projected=projectManualCover(cover),table=projected.headerBlocks[0],odd=table.rows.at(-1);
 assert.equal(table.headers.length,4);
 assert.equal(odd.length,4);
 assert.equal(odd[0].id,cover.metadata[2].id);
 assert.equal(getManualCoverCellProjection(odd[1].extensions).canonicalColspan,3);
 assert.equal(getManualCoverCellProjection(odd[2].extensions).canonicalPadding,true);
 assert.equal(getManualCoverCellProjection(odd[3].extensions).canonicalPadding,true);
 assert.deepEqual(restoreManualCover(coverMeta(cover),projected),cover);
});

test('all twelve finite official logo choices return asset keys and caller-owned width policy',()=>{
 assert.equal(MANUAL_BRAND_ASSETS.length,12);
 assert.equal(new Set(MANUAL_BRAND_ASSETS.map(asset=>asset.id)).size,12);
 for(const asset of MANUAL_BRAND_ASSETS){
  const before=clone(asset),element=createManualCoverElement('synthetic-cover','logo',{logoVariantId:asset.id});
  assert.equal(element.block.asset,asset.asset);
  assert.equal(element.block.alt,asset.alt);
  assert.equal(element.block.widthPreset,'compact');
  assert.deepEqual(element.block.caption,[]);
  assert.equal(element.defaultWidthPx,asset.defaultWidthPx);
  assert.equal(element.minimumWidthPx,asset.minimumWidthPx);
  assert.equal(Object.values(element.block.extensions).some(value=>value.owner==='@lk-design-system/manual-figure-layout'),false);
  assert.deepEqual(asset,before);
 }
});

test('missing, cancelled and unknown logo choices fail without silently choosing a default',()=>{
 for(const logoVariantId of [undefined,null,'','cancelled','unknown','https://example.invalid/logo.svg',MANUAL_BRAND_ASSETS[0].asset]){
  const request={usedIds:['occupied'],logoVariantId},before=clone(request);
  assert.throws(()=>createManualCoverElement('synthetic-cover','logo',request),TypeError);
  assert.throws(()=>createMinimalManualCover({id:'synthetic-cover'},body(),'logo',request),TypeError);
  assert.deepEqual(request,before);
 }
 // A picker cancellation is handled before calling this pure factory.
 assert.doesNotThrow(()=>createManualCoverElement('synthetic-cover','title'));
});

test('unknown roles and missing cover/page identities fail before creating a DTO',()=>{
 for(const role of [undefined,null,'cover','wholeTemplate','figure'])assert.throws(()=>createManualCoverElement('synthetic-cover',role),TypeError);
 for(const id of [undefined,null,'',1])assert.throws(()=>createManualCoverElement(id,'title'),TypeError);
 assert.throws(()=>createMinimalManualCover(null,[],'title'),TypeError);
 assert.throws(()=>createMinimalManualCover({id:'synthetic-cover'},null,'title'),TypeError);
});

for(const role of roles)test(`${role} makes a minimal cover preserving ordinary body order, marks and opaque extensions`,()=>{
 const pageMeta={id:'synthetic-page',extensions:{manualCoverProjection:{owner:'foreign',version:7,future:true},vendor:{id:'external-id',future:[null,{},true]}}};
 const blocks=body(),before={pageMeta:clone(pageMeta),blocks:clone(blocks),options:clone(options)};
 const {cover,element}=createMinimalManualCover(pageMeta,blocks,role,options);
 assert.equal(cover.id,pageMeta.id);
 assert.deepEqual(cover.title,[]);
 if(role==='metadata')assert.deepEqual(cover.metadata,metadataEntries(element.block));
 else assert.deepEqual(cover.metadata,[]);
 assert.deepEqual(cover.blocks,blocks);
 assert.deepEqual(cover.extensions.manualCoverProjection,pageMeta.extensions.manualCoverProjection);
 assert.deepEqual(cover.extensions.vendor,pageMeta.extensions.vendor);
 assert.equal(Object.hasOwn(cover,'logo'),role==='logo');
 assert.equal(Object.hasOwn(cover,'sectionTitle'),role==='sectionTitle');
 if(role==='logo')assert.deepEqual(cover.logo,{src:element.block.asset,alt:element.block.alt});
 if(role==='sectionTitle')assert.deepEqual(cover.sectionTitle,[]);
 const projected=projectManualCover(cover);
 assert.deepEqual(allBlocks(projected).filter(block=>roleOf(block)).map(roleOf),[role]);
 assert.deepEqual(projected.headerBlocks.map(roleOf),role==='sectionTitle'?[]:[role]);
 assert.deepEqual(projected.bodyBlocks.filter(block=>!roleOf(block)),blocks);
 assert.deepEqual(allBlocks(projected).find(block=>roleOf(block)),element.block);
 assert.deepEqual(restoreManualCover(coverMeta(cover),projected),cover);
 assert.deepEqual(pageMeta,before.pageMeta);
 assert.deepEqual(blocks,before.blocks);
 assert.deepEqual(options,before.options);
 element.block.id='changed-result-only';
 assert.deepEqual(restoreManualCover(coverMeta(cover),projectManualCover(cover)),cover);
});

test('factory and minimal cover avoid global, ordinary body and logical cell ID collisions deterministically',()=>{
 const coverId='synthetic-cover',base=`manual-cover:${coverId}:metadata`;
 const blocks=[{id:base,type:'heading',level:2,content:[]},{id:base+':2',type:'paragraph',content:[],extensions:{vendor:{id:base+':4'}}},{id:`${base}:entry:0`,type:'paragraph',content:[]}];
 const request={usedIds:[base+':3',`${base}:entry:1`,`${base}:0:1`]},before=clone(request);
 const result=createMinimalManualCover({id:coverId},blocks,'metadata',request);
 assert.equal(result.element.block.id,base+':4');
 assert.equal(result.element.block.headers[0].id,`${base}:entry:0:2`);
 assert.equal(result.element.block.headers[2].id,`${base}:entry:1:2`);
 assert.equal(result.element.block.headers[1].id,`${base}:0:1:2`);
 assert.deepEqual(createMinimalManualCover({id:coverId},blocks,'metadata',request),result);
 assert.deepEqual(request,before);
 const projected=projectManualCover(result.cover,request),allIds=ids(projected);
 assert.equal(new Set(allIds).size,allIds.length);
 assert.equal(allIds.some(id=>request.usedIds.includes(id)),false);
 assert.deepEqual(projected.headerBlocks[0],result.element.block);
 assert.deepEqual(restoreManualCover(coverMeta(result.cover),projected),result.cover);
 for(const role of roles){
  const id=`manual-cover:${coverId}:${role}`,usedIds=[id,id+':2'];
  assert.equal(createManualCoverElement(coverId,role,{usedIds,...options}).block.id,id+':3');
  assert.deepEqual(usedIds,[id,id+':2']);
 }
});

test('explicit empty page extensions survive the minimal-cover projection/restore roundtrip',()=>{
 const {cover}=createMinimalManualCover({id:'synthetic-cover',extensions:{}},[],'divider');
 const projected=projectManualCover(cover);
 assert.deepEqual(allBlocks(projected).map(roleOf),['divider']);
 assert.deepEqual(restoreManualCover(coverMeta(cover),projected),cover);
 assert.equal(Object.values(cover.extensions).some(value=>value.preserveEmptyExtensions===true),true);
});
