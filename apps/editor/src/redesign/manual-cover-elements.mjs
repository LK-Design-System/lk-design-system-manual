import {getManualBrandAsset} from './manual-brand-assets.mjs';
import {projectManualCover,restoreManualCover,getManualCoverProjection} from './manual-cover-legacy-projection.mjs';

export const MANUAL_COVER_ELEMENT_ROLES=Object.freeze(['logo','title','metadata','divider','sectionTitle']);
// Field labels from the canonical cover composition in manual-page-templates.mjs.
const METADATA_LABELS=['문서 버전','작성일','적용 기기','적용 환경'];
const clone=value=>structuredClone(value);
const record=value=>!!value&&typeof value==='object'&&!Array.isArray(value);

function requireCoverId(id){
 if(typeof id!=='string'||!id.length)throw new TypeError('표지 ID가 필요합니다.');
}
function requireRole(role){
 if(!MANUAL_COVER_ELEMENT_ROLES.includes(role))throw new TypeError('알 수 없는 표지 구성 요소입니다.');
}
function collectIds(value,result){
 if(!value||typeof value!=='object')return result;
 if(typeof value.id==='string')result.add(value.id);
 for(const [key,child]of Object.entries(value))if(key!=='extensions')collectIds(child,result);
 return result;
}
function freshId(base,used){
 let id=base;for(let suffix=2;used.has(id);suffix++)id=`${base}:${suffix}`;
 used.add(id);return id;
}

/** One existing block DTO with the projection owner's binding. Logo selection
 * is required; its width policy is returned for the caller's layout command. */
export function createManualCoverElement(coverId,role,{usedIds=[],logoVariantId}={}){
 requireCoverId(coverId);requireRole(role);
 const brand=role==='logo'?getManualBrandAsset(logoVariantId):null;
 if(role==='logo'&&!brand)throw new TypeError('공식 로고를 선택해야 합니다.');
 const used=new Set(usedIds);used.add(coverId);
 const metadata=role==='metadata'?METADATA_LABELS.map((label,index)=>({
  id:freshId(`manual-cover:${coverId}:metadata:entry:${index}`,used),
  label:[{type:'text',text:label}],value:[],
 })):[];
 const source={id:coverId,title:[],metadata,blocks:[],
  ...(brand?{logo:{src:brand.asset,alt:brand.alt}}:{}),
  ...(role==='sectionTitle'?{sectionTitle:[]}:{}),
 };
 const projected=projectManualCover(source,{usedIds:used});
 const block=[...projected.headerBlocks,...projected.bodyBlocks].find(value=>{
  const binding=getManualCoverProjection(value.extensions);
  return binding?.coverId===coverId&&binding.blockId===value.id&&binding.role===role;
 });
 return {block,...(brand?{defaultWidthPx:brand.defaultWidthPx,minimumWidthPx:brand.minimumWidthPx}:{})};
}

/** Converts already normalized ordinary body DTOs without adding a template.
 * Restore writes omission/order metadata, including absent optional scalars. */
export function createMinimalManualCover(pageMeta,bodyBlocks,role,options={}){
 if(!record(pageMeta))throw new TypeError('페이지 메타데이터가 필요합니다.');
 requireCoverId(pageMeta.id);
 if(!Array.isArray(bodyBlocks))throw new TypeError('본문 블록 배열이 필요합니다.');
 const usedIds=collectIds(bodyBlocks,new Set(options.usedIds||[]));
 const element=createManualCoverElement(pageMeta.id,role,{...options,usedIds});
 const projected={
  headerBlocks:role==='sectionTitle'?[]:[element.block],
  bodyBlocks:[...(role==='sectionTitle'?[element.block]:[]),...clone(bodyBlocks)],
 };
 const cover=restoreManualCover(clone(pageMeta),projected);
 return {cover,element};
}
