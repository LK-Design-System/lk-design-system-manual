import {remapManualPageProjectionMeta,getManualPageRoleIds} from './manual-page-projection.mjs';
import {isPrototypeLinkSafe} from './prototype-kernel.mjs';
import {remapManualPaginationMeta} from './manual-pagination-meta.mjs';
import {remapManualPageOrder,getManualDocumentCovers,withManualDocumentCovers} from './manual-page-order.mjs';
import {remapManualCoverLayoutMeta,getManualCoverEditableTable,projectManualCover,getManualCoverProjection,isManualCoverProjectionBlock} from './manual-cover-legacy-projection.mjs';
import {remapManualCoverFlowProvenanceMeta} from './manual-cover-flow-provenance.mjs';

export const isSafeManualAsset=value=>typeof value==='string'&&value.length<=1024&&!/[\\\u0000-\u001f:]/.test(value)&&!value.startsWith('/')&&!value.split('/').some(part=>!part||part==='.'||part==='..')&&!['__proto__','constructor','prototype'].includes(value);
export const newManualId=()=>globalThis.crypto.randomUUID();
export const plainInline=value=>String(value).split('\n').flatMap((text,index)=>[...(index?[{type:'hardBreak'}]:[]),...(text?[{type:'text',text}]:[])]);
export function normalizeManualInline(runs){const result=[];for(const run of runs){const current=structuredClone(run),previous=result.at(-1);if(current.type==='text'&&previous?.type==='text'&&JSON.stringify(current.marks||[])===JSON.stringify(previous.marks||[]))previous.text+=current.text;else result.push(current);}return result;}
const object=(value,path)=>{if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${path}: 객체가 필요합니다.`);};
const array=(value,path)=>{if(!Array.isArray(value))throw new TypeError(`${path}: 배열이 필요합니다.`);};
const string=(value,path)=>{if(typeof value!=='string')throw new TypeError(`${path}: 문자열이 필요합니다.`);};
const fail=path=>{throw new TypeError(`${path}: 지원하지 않는 문서 구조입니다.`);};
const own=(obj,key)=>Object.hasOwn(obj,key);
const json=(value,path)=>{if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return;if(Array.isArray(value)){value.forEach((v,i)=>json(v,`${path}[${i}]`));return;}object(value,path);for(const [k,v]of Object.entries(value))json(v,`${path}.${k}`);};
const keys=(value,allowed,path)=>{for(const k of Object.keys(value))if(!allowed.includes(k))fail(`${path}.${k} (extensions에 보존하세요)`);if(own(value,'extensions')){object(value.extensions,`${path}.extensions`);json(value.extensions,`${path}.extensions`);}};
export function validateManualDocument(document){
 const ids=new Set();
 const identity=(value,path)=>{object(value,path);if(typeof value.id!=='string'||!value.id.trim()||ids.has(value.id))fail(`${path}.id`);ids.add(value.id);};
 const inline=(value,path)=>{array(value,path);value.forEach((run,i)=>{const at=`${path}[${i}]`;object(run,at);if(run.type==='hardBreak'){keys(run,['type'],at);return;}if(run.type!=='text'||typeof run.text!=='string'||!run.text)fail(at);keys(run,['type','text','marks'],at);if(own(run,'marks')){array(run.marks,`${at}.marks`);const seen=new Set();run.marks.forEach(mark=>{object(mark,at);if(!['strong','emphasis','code','link','strike','underline'].includes(mark.type)||seen.has(mark.type))fail(`${at}.marks`);seen.add(mark.type);keys(mark,mark.type==='link'?['type','href']:['type'],at);if(mark.type==='link'&&!isPrototypeLinkSafe(mark.href))fail(`${at}.href`);});if(seen.has('code')&&seen.size>1)fail(`${at}.marks`);}});};
 const blocks=(values,path,allowed)=>{array(values,path);values.forEach((value,i)=>{if(allowed&&!allowed.includes(value.type))fail(`${path}[${i}].type`);block(value,`${path}[${i}]`);});};
 const base=['id','type','extensions'];
 const block=(value,path)=>{
  identity(value,path);
  switch(value.type){
   case 'paragraph':case 'heading':keys(value,[...base,'content',...(value.type==='heading'?['level']:[])],path);inline(value.content,`${path}.content`);if(value.type==='heading'&&![1,2,3].includes(value.level))fail(`${path}.level`);break;
   case 'todo':keys(value,[...base,'checked','content'],path);if(typeof value.checked!=='boolean')fail(`${path}.checked`);inline(value.content,path);break;
   case 'toggle':keys(value,[...base,'title','open','blocks'],path);inline(value.title,path);if(typeof value.open!=='boolean')fail(`${path}.open`);blocks(value.blocks,path);break;
   case 'divider':keys(value,base,path);break;
   case 'codeBlock':keys(value,[...base,'language','text'],path);string(value.language,path);string(value.text,path);break;
   case 'list':
    keys(value,[...base,'ordered','start','items'],path);if(typeof value.ordered!=='boolean')fail(`${path}.ordered`);if(own(value,'start')&&(!Number.isInteger(value.start)||value.start<1))fail(`${path}.start`);array(value.items,`${path}.items`);if(!value.items.length)fail(`${path}.items`);
    value.items.forEach((item,i)=>{identity(item,`${path}.items[${i}]`);keys(item,['id','blocks','extensions'],path);blocks(item.blocks,path,['paragraph','list']);if(item.blocks[0]?.type!=='paragraph')fail(path);});break;
   case 'quote':keys(value,[...base,'blocks'],path);blocks(value.blocks,path,['paragraph']);if(!value.blocks.length)fail(path);break;
   case 'procedure':
    keys(value,[...base,'start','steps'],path);if(!Number.isInteger(value.start)||value.start<1)fail(`${path}.start`);array(value.steps,path);if(!value.steps.length)fail(path);
    value.steps.forEach(step=>{identity(step,path);keys(step,['id','title','blocks','extensions'],path);inline(step.title,path);blocks(step.blocks,path,['paragraph','heading','list','quote','figure','callout','todo','toggle','divider','codeBlock']);});break;
   case 'figure':
    keys(value,[...base,'asset','alt','caption','widthPreset','crop','previewTitle'],path);string(value.asset,path);if(value.asset&&!isSafeManualAsset(value.asset))fail(`${path}.asset`);string(value.alt,path);inline(value.caption,path);if(!['full','reading','compact'].includes(value.widthPreset))fail(`${path}.widthPreset`);if(own(value,'previewTitle'))string(value.previewTitle,path);
    if(own(value,'crop')){const c=value.crop;object(c,path);keys(c,['x','y','width','height','sourceWidth','sourceHeight'],path);for(const k of ['x','y','width','height','sourceWidth','sourceHeight'])if(!Number.isFinite(c[k])||c[k]<(k==='x'||k==='y'?0:Number.MIN_VALUE))fail(`${path}.crop.${k}`);if(c.x+c.width>c.sourceWidth||c.y+c.height>c.sourceHeight)fail(`${path}.crop`);}break;
   case 'table':{
    keys(value,[...base,'label','headers','rows'],path);string(value.label,path);array(value.headers,path);array(value.rows,path);if(!value.headers.length)fail(path);const cell=v=>{identity(v,path);keys(v,['id','content','extensions'],path);inline(v.content,path);};value.headers.forEach(cell);value.rows.forEach(row=>{array(row,path);if(row.length!==value.headers.length)fail(`${path}.rows`);row.forEach(cell);});break;}
   case 'callout':keys(value,[...base,'title','tone','blocks'],path);inline(value.title,path);if(!['signal','positive','cautionary','negative','offline'].includes(value.tone))fail(`${path}.tone`);blocks(value.blocks,path,['paragraph','heading','list','quote','figure','table','callout','todo','toggle','divider','codeBlock']);break;
   case 'mediaGroup':keys(value,[...base,'layout','figure','blocks'],path);if(!['stacked','sideBySide'].includes(value.layout))fail(path);if(value.figure?.type!=='figure')fail(path);block(value.figure,`${path}.figure`);blocks(value.blocks,path,['paragraph','heading','list','quote','procedure','figure','table','callout','todo','toggle','divider','codeBlock']);break;
   default:fail(`${path}.type`);
  }
 };
 identity(document,'document');keys(document,['schemaVersion','id','title','lang','cover','covers','pages','extensions'],'document');if(document.schemaVersion!==2)fail('schemaVersion');string(document.title,'title');if(own(document,'lang'))string(document.lang,'lang');
 if(own(document,'cover')&&own(document,'covers'))fail('cover/covers');
 if(own(document,'covers')){array(document.covers,'covers');if(document.covers.length<2)fail('covers');}
 for(const [coverIndex,c]of getManualDocumentCovers(document).entries()){const coverPath=own(document,'covers')?`covers[${coverIndex}]`:'cover';identity(c,coverPath);keys(c,['id','title','metadata','blocks','sectionTitle','logo','extensions'],coverPath);inline(c.title,`${coverPath}.title`);array(c.metadata,`${coverPath}.metadata`);c.metadata.forEach((item,index)=>{const itemPath=`${coverPath}.metadata[${index}]`;identity(item,itemPath);keys(item,['id','label','value','extensions'],itemPath);inline(item.label,`${itemPath}.label`);inline(item.value,`${itemPath}.value`);});if(own(c,'sectionTitle'))inline(c.sectionTitle,`${coverPath}.sectionTitle`);if(own(c,'logo')){object(c.logo,`${coverPath}.logo`);keys(c.logo,['src','alt'],`${coverPath}.logo`);string(c.logo.src,`${coverPath}.logo.src`);if(c.logo.src!=='@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg'&&!isSafeManualAsset(c.logo.src))fail(`${coverPath}.logo.src`);string(c.logo.alt,`${coverPath}.logo.alt`);}blocks(c.blocks,`${coverPath}.blocks`);}
 array(document.pages,'pages');if(!document.pages.length&&!getManualDocumentCovers(document).length)fail('pages');document.pages.forEach((p,i)=>{identity(p,`pages[${i}]`);keys(p,['id','title','lead','blocks','extensions'],`pages[${i}]`);inline(p.title,`pages[${i}].title`);if(own(p,'lead'))inline(p.lead,`pages[${i}].lead`);blocks(p.blocks,`pages[${i}].blocks`);});
 return document;
}
export const validateManualDraft=validateManualDocument;
export const createManualParagraph=()=>({type:'paragraph',id:newManualId(),content:[]});
export function createEmptyManualDocument({title=''}={}){return {schemaVersion:2,id:newManualId(),title,pages:[{id:newManualId(),title:[],blocks:[createManualParagraph()]}]};}

// Migration is explicit and returns the unmodified source copy alongside a review report.
export function migrateV1Document(source){
 if(source?.schemaVersion!==1)throw new TypeError('schemaVersion 1 원본이 필요합니다.');
 const report=[];
 const extras=(value,known)=>{const extra=Object.fromEntries(Object.entries(value).filter(([k])=>!known.includes(k)));return Object.keys(extra).length?{extensions:{legacy:structuredClone(extra)}}:{};};
 const paragraph=(value,marks)=>({type:'paragraph',id:newManualId(),content:plainInline(value).map(run=>run.type==='text'&&marks?{...run,marks}:run)});
 const figure=value=>({type:'figure',id:newManualId(),asset:value.src,alt:value.alt,caption:plainInline(value.caption),widthPreset:value.size||'full',...Object.fromEntries(['crop','previewTitle'].filter(k=>own(value,k)).map(k=>[k,structuredClone(value[k])])),...extras(value,['type','src','alt','caption','size','crop','previewTitle'])});
 const block=value=>{
  const id=newManualId();
  switch(value.type){
   case 'paragraph':return {...paragraph(value.text),...extras(value,['type','text'])};
   case 'subheading':return {type:'heading',id,level:3,content:plainInline(value.text),...extras(value,['type','text'])};
   case 'address':report.push({kind:'presentation',message:'주소는 링크를 만들지 않고 굵은 본문으로 보존합니다.'});return {...paragraph(value.value,[{type:'strong'}]),...extras(value,['type','value'])};
   case 'quote':return {type:'quote',id,blocks:[paragraph(value.text)],...extras(value,['type','text'])};
   case 'figure':return figure(value);
   case 'list':return {type:'list',id,ordered:false,items:value.items.map(item=>{let content;if(typeof item==='string')content=plainInline(item);else content=[...plainInline(item.label).map(run=>run.type==='text'&&item.labelEmphasis?{...run,marks:[{type:'strong'}]}:run),{type:'text',text:': '},...plainInline(item.value).map(run=>run.type==='text'&&item.emphasis?{...run,marks:[{type:'strong'}]}:run)];return {id:newManualId(),blocks:[{type:'paragraph',id:newManualId(),content:normalizeManualInline(content)}],...(typeof item==='object'?{extensions:{legacyListItem:structuredClone(item)}}:{})};}),...extras(value,['type','items'])};
   case 'steps':return {type:'procedure',id,start:value.start??1,steps:value.items.map(step=>({id:newManualId(),title:plainInline(step.title),blocks:[...(own(step,'text')?[paragraph(step.text)]:[]),...(own(step,'quote')?[{type:'quote',id:newManualId(),blocks:[paragraph(step.quote)]}]:[]),...(step.figure?[figure(step.figure)]:[])],...extras(step,['title','text','quote','figure'])})),...extras(value,['type','items','start'])};
   case 'callout':case 'help':return {type:'callout',id,title:plainInline(value.title),tone:value.tone||'signal',blocks:[paragraph(value.text)],...extras(value,['type','title','tone','text'])};
   case 'table':return {type:'table',id,label:value.label,headers:value.headers.map(v=>({id:newManualId(),content:plainInline(v)})),rows:value.rows.map(row=>row.map(v=>({id:newManualId(),content:plainInline(v)}))),...extras(value,['type','label','headers','rows'])};
   case 'columns':return {type:'mediaGroup',id,layout:'sideBySide',figure:figure(value.figure),blocks:value.blocks.map(block),...extras(value,['type','figure','blocks'])};
   default:throw new TypeError(`알 수 없는 v1 블록: ${value.type}. 원본을 유지합니다.`);
  }
 };
 const document={schemaVersion:2,id:newManualId(),title:source.title,...(own(source,'lang')?{lang:source.lang}:{}),pages:source.pages.map(page=>({id:newManualId(),title:plainInline(page.title),...(own(page,'lead')?{lead:plainInline(page.lead)}:{}),blocks:page.blocks.map(block),...extras(page,['title','lead','blocks'])})),...extras(source,['schemaVersion','title','lang','cover','pages'])};
 if(own(source,'cover')){const c=source.cover;document.cover={id:newManualId(),title:plainInline(c.title),metadata:c.metadata.map(m=>({id:newManualId(),label:plainInline(m.label),value:plainInline(m.value),...extras(m,['label','value'])})),blocks:c.blocks.map(block),...(own(c,'sectionTitle')?{sectionTitle:plainInline(c.sectionTitle)}:{}),...(own(c,'logo')?{logo:structuredClone(c.logo)}:{}),...extras(c,['title','metadata','blocks','sectionTitle','logo'])};}
 validateManualDocument(document);
 report.push({kind:'copy',message:'새 ID를 가진 v2 복사본입니다. 원본 v1은 변경하지 않았습니다.'});
 return {document,report,source:structuredClone(source)};
}

export function copyManualDocument(source){
 validateManualDocument(source);
 const document=structuredClone(source),ids=new Map();
 const visit=value=>{if(!value||typeof value!=='object')return;if(Object.hasOwn(value,'id')){const id=newManualId();ids.set(value.id,id);value.id=id;}for(const [key,child]of Object.entries(value)){if(key==='extensions')continue;if(child&&typeof child==='object')Array.isArray(child)?child.forEach(visit):visit(child);}};
 visit(document);
 for(const cover of getManualDocumentCovers(source)){const grid=getManualCoverEditableTable(cover.extensions);if(grid){for(const id of [grid.id,...[grid.headers,...grid.rows].flat().map(cell=>cell.id)])if(!ids.has(id))ids.set(id,newManualId());}}
 for(const page of document.pages)for(const id of Object.values(getManualPageRoleIds(page.extensions)))if(!ids.has(id))ids.set(id,newManualId());
 // Scalar cover roles exist only in the projection, outside the DTO ID walk.
 // Resolve both families using the same global collision context as PM import.
 const collectIds=(value,used)=>{if(!value||typeof value!=='object')return;if(value.id)used.push(value.id);for(const [key,child]of Object.entries(value))if(key!=='extensions')collectIds(child,used);};
 const sourceUsed=[],copyUsed=[];collectIds(source,sourceUsed);collectIds(document,copyUsed);
 const sourceCovers=getManualDocumentCovers(source),copyCovers=getManualDocumentCovers(document);
 for(let index=0;index<sourceCovers.length;index++){
  const original=projectManualCover(sourceCovers[index],{usedIds:sourceUsed}),copied=projectManualCover(copyCovers[index],{usedIds:copyUsed});
  collectIds(original,sourceUsed);collectIds(copied,copyUsed);
  const roleMap=(projection,coverId)=>{
   const roles=new Map(),ambiguous=new Set();
   for(const block of [...projection.headerBlocks,...projection.bodyBlocks]){
    const marker=getManualCoverProjection(block.extensions);
    if(marker?.coverId!==coverId||marker.blockId!==block.id||!isManualCoverProjectionBlock(block,marker.role)||ambiguous.has(marker.role))continue;
    if(roles.has(marker.role)){roles.delete(marker.role);ambiguous.add(marker.role);}else roles.set(marker.role,block);
   }return roles;
  };
  const originalRoles=roleMap(original,sourceCovers[index].id),copiedRoles=roleMap(copied,copyCovers[index].id);
  for(const [role,block]of originalRoles){const target=copiedRoles.get(role);if(target&&!ids.has(block.id))ids.set(block.id,target.id);}
 }
 // Rewrite known links and pagination references; other extensions stay opaque.
 const links=value=>{if(!value||typeof value!=='object')return;if(value.extensions){const remapped=remapManualPageProjectionMeta(remapManualPaginationMeta({extensions:value.extensions},ids),ids);if(remapped.extensions)value.extensions=remapped.extensions;else delete value.extensions;}if(value.type==='link'&&value.href?.startsWith('#')&&ids.has(value.href.slice(1)))value.href='#'+ids.get(value.href.slice(1));for(const [key,child]of Object.entries(value)){if(key==='extensions')continue;if(child&&typeof child==='object')Array.isArray(child)?child.forEach(links):links(child);}};
 links(document);if(document.extensions)document.extensions=remapManualPageOrder(document.extensions,ids);const covers=getManualDocumentCovers(document).map(cover=>remapManualCoverFlowProvenanceMeta(remapManualCoverLayoutMeta(cover,ids),ids));return validateManualDocument(withManualDocumentCovers(document,covers));
}
