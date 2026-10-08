import {readManualDividerStyle} from './manual-divider-style.mjs';
export const MANUAL_COVER_PROJECTION_OWNER='@lk-design-system/manual-cover-projection';
const OWNER=MANUAL_COVER_PROJECTION_OWNER,VERSION=1,ROLES=['logo','title','metadata','divider','sectionTitle'];
const clone=value=>structuredClone(value),own=(value,key)=>Object.hasOwn(value,key),record=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
function markerAt(extensions,kind){
 if(!record(extensions))return null;
 for(const [key,value]of Object.entries(extensions))if(record(value)&&value.owner===OWNER&&value.version===VERSION&&value.kind===kind){
  if(kind==='role'&&(!ROLES.includes(value.role)||typeof value.coverId!=='string'||typeof value.blockId!=='string'))continue;
  if(kind==='layout'&&(!Array.isArray(value.headerOrder)||!Array.isArray(value.bodyOrder)||![...value.headerOrder,...value.bodyOrder].every(id=>typeof id==='string')))continue;
  if(kind==='cell'&&(!['label','value'].includes(value.field)||typeof value.coverId!=='string'||typeof value.tableId!=='string'||typeof value.cellId!=='string'))continue;
  return {key,value};
 }return null;
}
export function getManualCoverEditableTable(extensions){return markerAt(extensions,'layout')?.value.metadataTable??null;}
export function getManualCoverProjection(extensions){return markerAt(extensions,'role')?.value??null;}
export function getManualCoverCellProjection(extensions){return markerAt(extensions,'cell')?.value??null;}
export function createManualCoverPaddingCell(valueCell,id,field,tableId){const marker=getManualCoverCellProjection(valueCell.extensions);return {id,content:[],extensions:putMarker({},'cell',{coverId:marker.coverId,tableId,cellId:id,field,entry:null,canonicalPadding:true})};}
function heightLayouts(extensions){return Object.fromEntries(Object.entries(extensions||{}).filter(([,value])=>record(value)&&value.owner==='@lk-design-system/manual-table-layout'&&value.version===1&&value.kind==='cell-layout'&&!own(value,'columnWeight')&&Number.isFinite(value.rowMinHeightPx)&&value.rowMinHeightPx>=0));}
function figureLayouts(extensions){return Object.fromEntries(Object.entries(extensions||{}).filter(([,value])=>record(value)&&value.owner==='@lk-design-system/manual-figure-layout'&&value.version===1&&value.kind==='figure-layout'));}
function putMarker(extensions,kind,value){
 const result=clone(extensions||{}),previous=markerAt(result,kind);let key=previous?.key||'manualCoverProjection';
 for(let n=2;!previous&&own(result,key);n++)key=`manualCoverProjection${n}`;
 const extra=clone(previous?.value||{});if(kind==='layout')for(const name of ['headerOrder','bodyOrder','roleIds','roleSlots','omittedRoles','preserveEmptyExtensions','metadataRowLayouts','metadataTable','logoFigureLayout','dividerLayout'])delete extra[name];
 result[key]={...extra,owner:OWNER,version:VERSION,kind,...clone(value)};return result;
}
function stripRole(block){
 const result=clone(block),marker=markerAt(result.extensions,'role');
 if(marker){delete result.extensions[marker.key];if(!Object.keys(result.extensions).length)delete result.extensions;}
 return result;
}
// A role released by an ordinary conversion or foreign move leaves opaque
// extension namespaces intact. This accepts both block DTOs and runtime meta.
export const withoutManualCoverRole=stripRole;
function collectIds(value,result=new Set()){
 if(!value||typeof value!=='object')return result;if(typeof value.id==='string')result.add(value.id);
 for(const [key,child]of Object.entries(value))if(key!=='extensions')collectIds(child,result);return result;
}
function freshId(base,used){let id=base;for(let n=2;used.has(id);n++)id=`${base}:${n}`;used.add(id);return id;}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(record(value))return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value;}
function normalizedInline(runs){
 const result=[];for(const source of runs||[]){const run=clone(source);if(run.marks?.length)run.marks=run.marks.map(canonical).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));else delete run.marks;
  const previous=result.at(-1),attrs=value=>{const result={...value};delete result.text;return JSON.stringify(canonical(result));};
  if(run.type==='text'&&previous?.type==='text'&&attrs(run)===attrs(previous))previous.text+=run.text;else result.push(run);
 }return result;
}
const sameInline=(a,b)=>JSON.stringify(normalizedInline(a))===JSON.stringify(normalizedInline(b));
const readContent=(current,original)=>clone(sameInline(current,original)?original:current);
function markRole(block,coverId,role,extra={}){return {...block,extensions:putMarker(block.extensions,'role',{coverId,role,blockId:block.id,...extra})};}
function dividerLayouts(extensions){return Object.fromEntries(Object.entries(extensions||{}).filter(([key,value])=>readManualDividerStyle({[key]:value})));}
function roleEligible(block,role){
 const known=markerAt(block.extensions,'role');if(role==='metadata'&&known?.value.role==='metadata'&&known.value.editableTable===true)return block.type==='table'&&block.label==='문서 정보';
 if(!known||Object.keys(block.extensions).some(key=>key!==known.key&&!(role==='logo'&&own(figureLayouts(block.extensions),key))&&!(role==='divider'&&own(dividerLayouts(block.extensions),key))))return false;
 if(role==='logo')return block.type==='figure'&&block.widthPreset==='compact'&&!block.caption?.length&&!own(block,'crop')&&!own(block,'previewTitle');
 if(role==='metadata')return block.type==='table'&&block.label==='문서 정보';
 if(role==='divider')return block.type==='divider';
 return block.type==='heading'&&block.level===(role==='title'?1:2);
}
export const isManualCoverProjectionBlock=(block,role=getManualCoverProjection(block?.extensions)?.role)=>ROLES.includes(role)&&roleEligible(block,role);
/** Produces existing block DTOs only. Projection identities/bindings remain
 * runtime metadata and are consumed by restore; original blocks are cloned.
 */
export function projectManualCover(cover,{usedIds=[]}={}){
 const used=collectIds(cover,new Set(usedIds)),ids={},headers=[];for(const role of ROLES)ids[role]=freshId(`manual-cover:${cover.id}:${role}`,used);
 if(cover.logo)headers.push(markRole({id:ids.logo,type:'figure',asset:cover.logo.src,alt:cover.logo.alt,caption:[],widthPreset:'compact',extensions:clone(figureLayouts(markerAt(cover.extensions,'layout')?.value.logoFigureLayout))},cover.id,'logo',{originalLogo:cover.logo}));
 headers.push(markRole({id:ids.title,type:'heading',level:1,content:clone(cover.title)},cover.id,'title',{originalInline:cover.title}));
 const entries=cover.metadata||[],rows=[],presentation=markerAt(cover.extensions,'layout')?.value.metadataRowLayouts;
 for(let row=0;row<Math.max(1,Math.ceil(entries.length/2));row++){
  const cells=[];for(let col=0;col<4;col++){
   const entry=entries[row*2+Math.floor(col/2)]??null,field=col%2?'value':'label',id=entry&&field==='label'?entry.id:freshId(`manual-cover:${cover.id}:metadata:${row}:${col}`,used);
   const odd=entries.length%2===1&&row===Math.floor(entries.length/2);
   cells.push({id,content:clone(entry?.[field]||[]),extensions:{...putMarker({},'cell',{coverId:cover.id,tableId:ids.metadata,cellId:id,field,entry,...(odd&&col===1?{canonicalColspan:3}:{}),...(odd&&col>1?{canonicalPadding:true}:{})}),...clone(heightLayouts(presentation?.[row]?.[col]))}});
  }rows.push(cells);
 }
 const saved=getManualCoverEditableTable(cover.extensions);
 if(saved?.type==='table'&&Array.isArray(saved.headers)&&Array.isArray(saved.rows)){ids.metadata=saved.id;headers.push(markRole(clone(saved),cover.id,'metadata',{editableTable:true}));}
 else headers.push(markRole({id:ids.metadata,type:'table',label:'문서 정보',headers:rows[0],rows:rows.slice(1)},cover.id,'metadata'));
 headers.push(markRole({id:ids.divider,type:'divider',...(Object.keys(dividerLayouts(markerAt(cover.extensions,'layout')?.value.dividerLayout)).length?{extensions:clone(dividerLayouts(markerAt(cover.extensions,'layout')?.value.dividerLayout))}:{})},cover.id,'divider'));
 const body=[...(own(cover,'sectionTitle')?[markRole({id:ids.sectionTitle,type:'heading',level:2,content:clone(cover.sectionTitle)},cover.id,'sectionTitle',{originalInline:cover.sectionTitle})]:[]),...clone(cover.blocks)];
 const layout=markerAt(cover.extensions,'layout')?.value;if(!layout)return {headerBlocks:headers,bodyBlocks:body};
 const omitted=new Set(layout.omittedRoles||[]),all=[...headers,...body].filter(block=>{const role=getManualCoverProjection(block.extensions)?.role;return !role||!omitted.has(role);}),pool=new Map(all.map(block=>[block.id,block])),taken=new Set();
 const aliases=new Map(Object.entries(layout.roleIds||{}).filter(([role])=>ROLES.includes(role)).map(([role,id])=>[id,role]));
 const take=(order,group)=>order.flatMap((raw,index)=>{
  const role=aliases.get(raw),slot=layout.roleSlots?.[role],validSlot=record(slot)&&['header','body'].includes(slot.group)&&Number.isInteger(slot.index)&&slot.index>=0;
  const claimsRole=role&&(validSlot?slot.group===group&&slot.index===index:group===(role==='sectionTitle'?'body':'header')&&!taken.has(ids[role]));
  const id=claimsRole?ids[role]:pool.has(raw)?raw:role&&!validSlot?ids[role]:null,block=pool.get(id);if(!block||taken.has(id))return [];taken.add(id);return [block];
 });
 const headerBlocks=take(layout.headerOrder,'header'),bodyBlocks=take(layout.bodyOrder,'body');
 headerBlocks.push(...headers.filter(block=>pool.has(block.id)&&!taken.has(block.id)).map(block=>{taken.add(block.id);return block;}));
 bodyBlocks.push(...body.filter(block=>pool.has(block.id)&&!taken.has(block.id)).map(block=>{taken.add(block.id);return block;}));
 // Older layouts had a separator inside the metadata view. Its first independent
 // projection stays beside that table, even when the table was moved to the body.
 if(!own(layout.roleIds||{},'divider')&&!omitted.has('divider')){
  let separator;for(const list of [headerBlocks,bodyBlocks]){const index=list.findIndex(block=>getManualCoverProjection(block.extensions)?.role==='divider');if(index>=0)separator=list.splice(index,1)[0];}
  if(separator){const list=[headerBlocks,bodyBlocks].find(list=>list.some(block=>getManualCoverProjection(block.extensions)?.role==='metadata'))||headerBlocks,index=list.findIndex(block=>getManualCoverProjection(block.extensions)?.role==='metadata');list.splice(index<0?list.length:index+1,0,separator);}
 }
 return {headerBlocks,bodyBlocks};
}
function metadataFromTable(table,coverId,occupied){
 if(table.headers.length!==4||table.rows.some(row=>row.length!==4))return null;
 const entries=[],seen=new Set();for(const row of [table.headers,...table.rows])for(let offset=0;offset<4;offset+=2){
  const label=row[offset],value=row[offset+1],bindings=[label,value].map(cell=>markerAt(cell.extensions,'cell'));
  if(bindings.some((binding,index)=>binding&&(binding.value.cellId!==row[offset+index].id||binding.value.tableId!==table.id||binding.value.coverId!==coverId||binding.value.field!==(index?'value':'label'))))return null;
  if([label,value].some((cell,index)=>Object.keys(cell.extensions||{}).some(key=>key!==bindings[index]?.key&&!own(heightLayouts(cell.extensions),key))))return null;
  const left=bindings[0]?.value.entry,right=bindings[1]?.value.entry;
  if((left?.id??null)!==(right?.id??null))return null;
  if(left){if(seen.has(left.id)||occupied.has(left.id))return null;seen.add(left.id);entries.push({...clone(left),label:readContent(label.content,left.label),value:readContent(value.content,left.value)});}
  else if(label.content.length||value.content.length){const id=freshId(`manual-cover:${coverId}:entry:${label.id}`,occupied);seen.add(id);entries.push({id,label:clone(label.content),value:clone(value.content)});}
 }return entries;
}
// Editable grids retain the original scalar entry only while at least one of
// its field cells survives. New/duplicated cells belong to the saved table DTO.
function metadataFromEditableTable(table,coverId){
 const entries=new Map();
 for(const row of [table.headers,...table.rows])for(const cell of row){
  const binding=getManualCoverCellProjection(cell.extensions);
  if(!binding?.entry||binding.coverId!==coverId||binding.tableId!==table.id||binding.cellId!==cell.id)continue;
  const original=binding.entry;if(!entries.has(original.id))entries.set(original.id,{...clone(original),label:[],value:[]});
  entries.get(original.id)[binding.field]=readContent(cell.content,original[binding.field]);
 }return [...entries.values()];
}
export function withEditableManualCoverTableMeta(meta){
 const result=clone(meta),marker=markerAt(result.extensions,'role');
 if(marker?.value.role==='metadata')result.extensions[marker.key].editableTable=true;
 return result;
}
export function withoutManualCoverCellProjection(meta){
 const result=clone(meta),marker=markerAt(result.extensions,'cell');
 if(marker){delete result.extensions[marker.key];if(!Object.keys(result.extensions).length)delete result.extensions;}return result;
}
/** coverMeta contains id and opaque info, with the legacy scalar fields removed.
 * A binding must match this cover, this ID, and be unique. Different-ID clones
 * and foreign-cover blocks are preserved as ordinary blocks, never as scalars.
 */
export function restoreManualCover(coverMeta,{headerBlocks=[],bodyBlocks=[]}={}){
 const all=[...headerBlocks,...bodyBlocks],roles=new Map(),markers=new Map();
 for(const block of all){const marker=getManualCoverProjection(block.extensions);if(marker?.coverId===coverMeta.id&&marker.blockId===block.id&&roleEligible(block,marker.role)){if(!roles.has(marker.role))roles.set(marker.role,[]);roles.get(marker.role).push(block);markers.set(block.id,marker);}}
 const bound=new Map([...roles].filter(([,blocks])=>blocks.length===1).map(([role,blocks])=>[role,blocks[0]]));
 const consumed=new Set([...bound.values()].map(block=>block.id));
 const occupied=collectIds({id:coverMeta.id,blocks:all.filter(block=>!consumed.has(block.id))});
 let metadata=[];if(bound.has('metadata')){metadata=markers.get(bound.get('metadata').id)?.editableTable===true?metadataFromEditableTable(bound.get('metadata'),coverMeta.id):metadataFromTable(bound.get('metadata'),coverMeta.id,occupied);if(metadata===null){bound.delete('metadata');metadata=[];}}
 const result=clone(coverMeta);for(const field of ['title','metadata','sectionTitle','logo','blocks'])delete result[field];
 const title=bound.get('title');result.title=title?readContent(title.content,markers.get(title.id).originalInline??title.content):[];result.metadata=metadata;
 const logo=bound.get('logo');if(logo)result.logo={...clone(markers.get(logo.id).originalLogo||{}),src:logo.asset,alt:logo.alt};
 const section=bound.get('sectionTitle');if(section)result.sectionTitle=readContent(section.content,markers.get(section.id).originalInline??section.content);
 const scalarIds=new Set([...bound.values()].map(block=>block.id));result.blocks=all.filter(block=>!scalarIds.has(block.id)).map(stripRole);
 const actualHeader=headerBlocks.map(block=>block.id),actualBody=bodyBlocks.map(block=>block.id);
 const old=markerAt(result.extensions,'layout');
 const roleIds=Object.fromEntries([...Object.entries(old?.value.roleIds||{}).filter(([role])=>!ROLES.includes(role)),...[...bound].map(([role,block])=>[role,block.id])]);
 const roleSlots=Object.fromEntries([...Object.entries(record(old?.value.roleSlots)?old.value.roleSlots:{}).filter(([role])=>!ROLES.includes(role)),...[...bound].map(([role,block])=>{const group=actualHeader.includes(block.id)?'header':'body',index=(group==='header'?actualHeader:actualBody).indexOf(block.id);return [role,{...clone(record(old?.value.roleSlots?.[role])?old.value.roleSlots[role]:{}),group,index}];})]);
 const expectedHeader=['logo','title','metadata','divider'].flatMap(role=>roleIds[role]?[roleIds[role]]:[]),expectedBody=[...(roleIds.sectionTitle?[roleIds.sectionTitle]:[]),...result.blocks.map(block=>block.id)];
 const omittedRoles=['title','metadata','divider'].filter(role=>!bound.has(role));
 const metadataRowLayouts=bound.has('metadata')?[bound.get('metadata').headers,...bound.get('metadata').rows].map(row=>row.map(cell=>heightLayouts(cell.extensions))):[],hasPresentation=metadataRowLayouts.some(row=>row.some(value=>Object.keys(value).length));
 const logoFigureLayout=clone(figureLayouts(logo?.extensions)),hasLogoLayout=Object.keys(logoFigureLayout).length>0;
 const dividerLayout={...clone(record(old?.value.dividerLayout)?old.value.dividerLayout:{}),...clone(dividerLayouts(bound.get('divider')?.extensions))},hasDividerLayout=Object.keys(dividerLayout).length>0;
 const metadataTable=bound.has('metadata')&&markers.get(bound.get('metadata').id)?.editableTable===true?stripRole(bound.get('metadata')):null;
 const nondefault=!!metadataTable||hasDividerLayout||hasLogoLayout||hasPresentation||omittedRoles.length>0||JSON.stringify(actualHeader)!==JSON.stringify(expectedHeader)||JSON.stringify(actualBody)!==JSON.stringify(expectedBody);
 if(nondefault)result.extensions=putMarker(result.extensions,'layout',{headerOrder:actualHeader,bodyOrder:actualBody,roleIds,roleSlots,...(hasDividerLayout?{dividerLayout}:{}),...(hasLogoLayout?{logoFigureLayout}:{}),...(hasPresentation?{metadataRowLayouts}:{}),...(metadataTable?{metadataTable}:{}),...(omittedRoles.length?{omittedRoles}:{}),...(own(result,'extensions')&&Object.keys(result.extensions).length===0||old?.value.preserveEmptyExtensions?{preserveEmptyExtensions:true}:{})});
 else if(old){
  const fields=['owner','version','kind','headerOrder','bodyOrder','roleIds','roleSlots','omittedRoles','preserveEmptyExtensions','metadataRowLayouts','metadataTable','logoFigureLayout','dividerLayout'];
  if(Object.keys(old.value).some(key=>!fields.includes(key))||Object.keys(old.value.roleIds||{}).some(role=>!ROLES.includes(role))||Object.keys(old.value.roleSlots||{}).some(role=>!ROLES.includes(role)))result.extensions=putMarker(result.extensions,'layout',{headerOrder:actualHeader,bodyOrder:actualBody,roleIds,roleSlots,...(old.value.preserveEmptyExtensions?{preserveEmptyExtensions:true}:{})});
  else{delete result.extensions[old.key];if(!Object.keys(result.extensions).length&&!old.value.preserveEmptyExtensions)delete result.extensions;}
 }
 return result;
}
// File/document copies remap only known layout references. Scalar runtime aliases
// remain mapped by role on projection; unknown extensions stay completely opaque.
export function remapManualCoverLayoutMeta(meta,idMap){
 const result=clone(meta),marker=markerAt(result.extensions,'layout');if(!marker)return result;
 const mapping=new Map(idMap instanceof Map?idMap:Object.entries(idMap||{}));
 const sourceId=[...mapping].find(([,id])=>id===result.id)?.[0]||result.id;
 const saved=result.extensions[marker.key].metadataTable;
 if(saved){
  for(const [role,id]of Object.entries(marker.value.roleIds||{}))if(ROLES.includes(role)&&!mapping.has(id))mapping.set(id,`manual-cover:${result.id}:${role}`);
  for(const [role,id]of Object.entries(marker.value.roleIds||{}))if(ROLES.includes(role))result.extensions[marker.key].roleIds[role]=mapping.get(id)??id;
  const gridIds=new Map(),renew=id=>{if(mapping.has(id))return mapping.get(id);if(!gridIds.has(id))gridIds.set(id,`manual-cover:${result.id}:grid:${id}`);return gridIds.get(id);};
  const oldTableId=saved.id;saved.id=renew(saved.id);
  for(const row of [saved.headers,...saved.rows])for(const cell of row){cell.id=renew(cell.id);const binding=markerAt(cell.extensions,'cell');if(binding){binding.value.coverId=result.id;binding.value.tableId=saved.id;binding.value.cellId=cell.id;if(binding.value.entry)binding.value.entry.id=renew(binding.value.entry.id);}}
  const links=value=>{if(!value||typeof value!=='object')return;if(value.type==='link'&&value.href?.startsWith('#')){const id=value.href.slice(1);if(mapping.has(id)||gridIds.has(id))value.href='#'+(mapping.get(id)||gridIds.get(id));}for(const [key,child]of Object.entries(value))if(key!=='extensions'&&child&&typeof child==='object')Array.isArray(child)?child.forEach(links):links(child);};links(saved);
  for(const field of ['headerOrder','bodyOrder'])result.extensions[marker.key][field]=result.extensions[marker.key][field].map(id=>id===oldTableId?saved.id:id);
  result.extensions[marker.key].roleIds.metadata=saved.id;
 }

 // Legacy layouts may record a canonical scalar slot in the order without
 // listing that role's alias. Only non-primary references can be inferred.
 for(const role of ROLES)if(!own(marker.value.roleIds||{},role)){
  const base=`manual-cover:${sourceId}:${role}`,id=[...marker.value.headerOrder,...marker.value.bodyOrder].find(raw=>!mapping.has(raw)&&(raw===base||raw.startsWith(base+':')&&/^\d+$/.test(raw.slice(base.length+1))));
  if(id)(result.extensions[marker.key].roleIds??={})[role]=id;
 }
 const aliases=new Map(Object.entries(marker.value.roleIds||{}).filter(([role])=>ROLES.includes(role)).map(([role,id])=>[id,role])),claimed=new Set();
 for(const [field,group]of [['headerOrder','header'],['bodyOrder','body']])result.extensions[marker.key][field]=marker.value[field].map((id,index)=>{
  const role=aliases.get(id),slot=marker.value.roleSlots?.[role],validSlot=record(slot)&&['header','body'].includes(slot.group)&&Number.isInteger(slot.index)&&slot.index>=0;
  const virtual=role&&(validSlot?slot.group===group&&slot.index===index:group===(role==='sectionTitle'?'body':'header')&&!claimed.has(role));
  if(virtual){claimed.add(role);return id;}return mapping.get(id)??id;
 });
 return result;
}
