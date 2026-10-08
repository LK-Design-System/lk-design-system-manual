import test from 'node:test';import assert from 'node:assert/strict';
import {projectManualCover,restoreManualCover,getManualCoverProjection,remapManualCoverLayoutMeta} from '../src/redesign/manual-cover-legacy-projection.mjs';
import {createEmptyManualDocument,validateManualDocument} from '../src/redesign/manual-v2.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
const text=value=>[{type:'text',text:value}],clone=value=>structuredClone(value);
const cover=()=>({id:'synthetic-cover',title:[{type:'text',text:'제목 ',marks:[{type:'underline'},{type:'strong'}]},{type:'text',text:'연속',marks:[{type:'strong'},{type:'underline'}]}],metadata:[{id:'entry-a',label:text('제품'),value:[{type:'text',text:'제품 A',marks:[{type:'link',href:'https://example.invalid/a'},{type:'strong'}]}],extensions:{manualCoverProjection:{owner:'other',keep:true},future:{externalId:'keep'}}},{id:'entry-b',label:text('버전'),value:text('1.0')},{id:'entry-c',label:[],value:[],extensions:{empty:true}}],sectionTitle:[],logo:{src:'assets/logo.png',alt:'합성 로고'},blocks:[{id:'body-a',type:'paragraph',content:text('본문 A'),extensions:{opaque:{id:'external',future:[null,true]}}},{id:'body-b',type:'heading',level:3,content:text('본문 B')}],extensions:{manualCoverProjection:{owner:'other',version:9,opaque:true},future:{id:'opaque-id'}}});
const meta=source=>Object.fromEntries(Object.entries(clone(source)).filter(([key])=>!['title','metadata','sectionTitle','logo','blocks'].includes(key)));
const role=(blocks,name)=>blocks.find(block=>getManualCoverProjection(block.extensions)?.role===name);
const restored=(source,projected)=>restoreManualCover(meta(source),projected);
function ids(value,result=[]){if(value&&typeof value==='object'){if(typeof value.id==='string')result.push(value.id);for(const [k,v]of Object.entries(value))if(k!=='extensions')ids(v,result);}return result;}

test('untouched all-role projection restores exact IDs/inline runs/marks/opaque metadata and creates no layout marker',()=>{
 const source=cover(),before=clone(source),projected=projectManualCover(source);assert.deepEqual(restored(source,projected),source);assert.deepEqual(source,before);assert.deepEqual(projected.headerBlocks.map(b=>b.type),['figure','heading','table']);assert.equal(projected.bodyBlocks[0].level,2);assert.equal(role(projected.headerBlocks,'metadata').headers.length,4);assert.equal(role(projected.headerBlocks,'metadata').rows.length,1);assert.equal(new Set(ids(projected)).size,ids(projected).length);
});
test('projection DTOs validate without schema changes; portable codec preserves restored document/assets',()=>{
 const source=cover(),projected=projectManualCover(source),doc=createEmptyManualDocument();doc.cover=clone(source);doc.pages[0].blocks=[...projected.headerBlocks,...projected.bodyBlocks].map(block=>({...block,id:'dto-'+block.id}));
 // cover originals and projected ordinary IDs must not duplicate in this artificial combined DTO.
 doc.cover.blocks=[];doc.cover.metadata=[];validateManualDocument(doc);
 const payload={document:{...doc,cover:restored(source,projected)},assets:{'assets/logo.png':'data:image/png;base64,AAAA'}};payload.document.pages[0].blocks=[];assert.deepEqual(decodeDocumentFile(encodeDocumentFile(payload)),payload);
});
test('stable runtime IDs honor collisions and ignore opaque external IDs',()=>{
 const source=cover(),a=projectManualCover(source),base=role(a.headerBlocks,'title').id,b=projectManualCover(source,{usedIds:[base,base+':2']});assert.equal(role(b.headerBlocks,'title').id,base+':3');assert.deepEqual(projectManualCover(source,{usedIds:[base,base+':2']}),b);assert.deepEqual(restored(source,b),source);
});
test('absent section and present empty section remain distinct; empty metadata still has four empty header cells',()=>{
 const source=cover();delete source.sectionTitle;delete source.logo;source.metadata=[];const p=projectManualCover(source);assert.equal(role(p.bodyBlocks,'sectionTitle'),undefined);assert.deepEqual(role(p.headerBlocks,'metadata').headers.map(c=>c.content),[[],[],[],[]]);assert.deepEqual(restored(source,p),source);source.sectionTitle=[];assert.deepEqual(restored(source,projectManualCover(source)),source);
});
test('PM equivalent adjacent runs/mark order recover untouched original scalar bytes, real edits update scalar',()=>{
 const source=cover(),p=projectManualCover(source),title=role(p.headerBlocks,'title');title.content=[{type:'text',text:'제목 연속',marks:[{type:'strong'},{type:'underline'}]}];assert.deepEqual(restored(source,p).title,source.title);title.content=text('새 제목');assert.deepEqual(restored(source,p).title,text('새 제목'));
});
test('metadata edits preserve original entry IDs and every unknown extension; a filled padded pair creates one fresh entry',()=>{
 const source=cover(),p=projectManualCover(source),table=role(p.headerBlocks,'metadata');table.headers[1].content=text('새 값');table.rows[0][2].content=text('날짜');table.rows[0][3].content=text('합성 날짜');const result=restored(source,p);assert.equal(result.metadata[0].id,'entry-a');assert.deepEqual(result.metadata[0].extensions,source.metadata[0].extensions);assert.deepEqual(result.metadata[0].value,text('새 값'));assert.equal(result.metadata.length,4);assert.equal(new Set(result.metadata.map(x=>x.id)).size,4);
});
test('same-cover header and mid-body section reorder retains scalars and replays exact runtime ID layout',()=>{
 const source=cover(),p=projectManualCover(source);p.headerBlocks=[p.headerBlocks[1],p.headerBlocks[2],p.headerBlocks[0]];p.bodyBlocks=[p.bodyBlocks[1],p.bodyBlocks[0],p.bodyBlocks[2]];const stored=restored(source,p),again=projectManualCover(stored);assert.deepEqual(stored.sectionTitle,source.sectionTitle);assert.deepEqual(stored.blocks,source.blocks);assert.deepEqual(again.headerBlocks.map(b=>b.id),p.headerBlocks.map(b=>b.id));assert.deepEqual(again.bodyBlocks.map(b=>b.id),p.bodyBlocks.map(b=>b.id));assert.deepEqual(stored.extensions.manualCoverProjection,source.extensions.manualCoverProjection);
});
test('same-cover cross-section role moves remain scalar-bound and preserve header/body placement',()=>{
 const source=cover(),p=projectManualCover(source),logo=p.headerBlocks.shift();p.bodyBlocks.push(logo);const stored=restored(source,p),again=projectManualCover(stored);assert.deepEqual(stored.logo,source.logo);assert.deepEqual(again.headerBlocks.map(b=>b.id),p.headerBlocks.map(b=>b.id));assert.deepEqual(again.bodyBlocks.map(b=>b.id),p.bodyBlocks.map(b=>b.id));
});
test('new-ID clones are ordinary blocks while only original bound node consumes the scalar',()=>{
 const source=cover(),p=projectManualCover(source),title=clone(role(p.headerBlocks,'title'));title.id='clone-title';p.headerBlocks.unshift(title);const stored=restored(source,p);assert.deepEqual(stored.title,source.title);assert.equal(stored.blocks[0].id,'clone-title');assert.equal(getManualCoverProjection(stored.blocks[0].extensions),null);assert.deepEqual(projectManualCover(stored).headerBlocks.map(b=>b.id),p.headerBlocks.map(b=>b.id));
});
test('foreign cover binding and malformed metadata shape become lossless ordinary DTOs without duplicate scalar',()=>{
 const source=cover(),p=projectManualCover(source),section=p.bodyBlocks.shift();const other=cover();other.id='other-cover';other.blocks=[section];delete other.sectionTitle;const storedOther=restored(other,projectManualCover(other));assert.equal(own(storedOther,'sectionTitle'),false);assert.equal(storedOther.blocks[0].type,'heading');assert.equal(getManualCoverProjection(storedOther.blocks[0].extensions),null);
 const table=role(p.headerBlocks,'metadata');table.headers.push({id:'new-col',content:text('확장')});table.rows[0].push({id:'new-col-row',content:[]});const stored=restored(source,p);assert.deepEqual(stored.metadata,[]);assert.equal(stored.blocks.find(b=>b.id===table.id).headers.length,5);assert.deepEqual(projectManualCover(stored).headerBlocks.map(b=>b.id),p.headerBlocks.map(b=>b.id));
});
const own=(v,k)=>Object.hasOwn(v,k);
test('deletion omits logo/section and keeps metadata empty without resurrecting a deleted metadata block',()=>{
 const source=cover(),p=projectManualCover(source);p.headerBlocks=p.headerBlocks.filter(b=>getManualCoverProjection(b.extensions)?.role==='title');p.bodyBlocks=p.bodyBlocks.slice(1);const stored=restored(source,p),again=projectManualCover(stored);assert.equal(own(stored,'logo'),false);assert.equal(own(stored,'sectionTitle'),false);assert.deepEqual(stored.metadata,[]);assert.deepEqual(again.headerBlocks.map(b=>getManualCoverProjection(b.extensions)?.role),['title']);
});
test('known layout reference remap plus role aliases preserves order across document ID copy; opaque IDs never remap',()=>{
 const source=cover(),p=projectManualCover(source);p.headerBlocks.reverse();p.bodyBlocks=[p.bodyBlocks[1],p.bodyBlocks[0],p.bodyBlocks[2]];const stored=restored(source,p),copy=clone(stored),mapping=new Map([[stored.id,'copied-cover'],...stored.blocks.map(b=>[b.id,'copied-'+b.id]),...stored.metadata.map(e=>[e.id,'copied-'+e.id])]);copy.id='copied-cover';copy.blocks.forEach(b=>b.id=mapping.get(b.id));copy.metadata.forEach(e=>e.id=mapping.get(e.id));copy.extensions=remapManualCoverLayoutMeta({extensions:copy.extensions},mapping).extensions;const again=projectManualCover(copy);
 assert.deepEqual(again.headerBlocks.map(b=>getManualCoverProjection(b.extensions)?.role),p.headerBlocks.map(b=>getManualCoverProjection(b.extensions)?.role));assert.deepEqual(again.bodyBlocks.map(b=>getManualCoverProjection(b.extensions)?.role||b.id),p.bodyBlocks.map(b=>getManualCoverProjection(b.extensions)?.role||mapping.get(b.id)));assert.deepEqual(copy.extensions.future,source.extensions.future);
});
test('layout added then returned to default preserves explicitly empty extensions and never overwrites unknown namespace',()=>{
 const source=cover();source.extensions={};const p=projectManualCover(source);p.headerBlocks.reverse();const stored=restored(source,p),again=projectManualCover(stored);again.headerBlocks.reverse();const reset=restored(stored,again);assert.deepEqual(reset,source);
 const unknown={manualCoverProjection:{owner:'future-owner',version:2,kind:'role',opaque:true}};assert.equal(getManualCoverProjection(unknown),null);assert.deepEqual(remapManualCoverLayoutMeta({extensions:unknown},new Map([['opaque','changed']])),{extensions:unknown});
});
test('unknown fields inside a recognized layout marker remain opaque through restore and known ID remap',()=>{
 const source=cover(),p=projectManualCover(source);p.headerBlocks.reverse();const stored=restored(source,p);const key=Object.keys(stored.extensions).find(key=>stored.extensions[key]?.kind==='layout');stored.extensions[key].future={id:'external-layout',keep:[null,true]};stored.extensions[key].roleIds.futureRole='external-role';const again=projectManualCover(stored),roundtrip=restored(stored,again);assert.deepEqual(roundtrip.extensions[key].future,stored.extensions[key].future);assert.equal(roundtrip.extensions[key].roleIds.futureRole,'external-role');const remap=remapManualCoverLayoutMeta({extensions:stored.extensions},new Map([['external-layout','do-not-change']]));assert.deepEqual(remap.extensions[key].future,stored.extensions[key].future);
});
test('metadata entry structural IDs remain actual label-cell targets after ordinary table release',()=>{
 const source=cover(),p=projectManualCover(source),table=role(p.headerBlocks,'metadata');assert.equal(table.headers[0].id,source.metadata[0].id);assert.equal(table.headers[2].id,source.metadata[1].id);assert.equal(table.rows[0][0].id,source.metadata[2].id);table.label='사용자 정보 표';const stored=restored(source,p),ordinary=stored.blocks.find(b=>b.id===table.id);assert.equal(ordinary.headers[0].id,'entry-a');assert.deepEqual(stored.metadata,[]);const doc=createEmptyManualDocument();doc.cover=stored;doc.pages[0].blocks[0].content=[{type:'text',text:'정보 항목 링크',marks:[{type:'link',href:'#entry-a'}]}];validateManualDocument(doc);assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document:doc,assets:{}})).document,doc);
});
test('logo/title/metadata clones retain only original scalar binding and preserve ordinary clone content/IDs',()=>{
 const source=cover(),p=projectManualCover(source),clones=p.headerBlocks.map(block=>{const result=clone(block);const renew=value=>{if(!value||typeof value!=='object')return;if(value.id)value.id='copy-'+value.id;for(const [key,child]of Object.entries(value))if(key!=='extensions')renew(child);};renew(result);return result;});p.headerBlocks.push(...clones);const stored=restored(source,p);assert.deepEqual(stored.logo,source.logo);assert.deepEqual(stored.title,source.title);assert.deepEqual(stored.metadata,source.metadata);assert.equal(stored.blocks.filter(b=>b.id.startsWith('copy-')).length,3);for(const copy of clones){const block=stored.blocks.find(b=>b.id===copy.id);assert.equal(getManualCoverProjection(block.extensions),null);assert.deepEqual(block.type==='table'?block.headers:block.content||block.asset,copy.type==='table'?copy.headers:copy.content||copy.asset);}const doc=createEmptyManualDocument();doc.cover=stored;validateManualDocument(doc);
});
test('unknown projection-block extensions release to ordinary DTOs instead of being silently discarded',()=>{
 const source=cover(),p=projectManualCover(source),logo=role(p.headerBlocks,'logo');logo.extensions.futureConsumer={id:'external-image-info',revision:7};const stored=restored(source,p),ordinary=stored.blocks.find(b=>b.id===logo.id);assert.equal(own(stored,'logo'),false);assert.deepEqual(ordinary.extensions.futureConsumer,logo.extensions.futureConsumer);assert.equal(getManualCoverProjection(ordinary.extensions),null);
});
