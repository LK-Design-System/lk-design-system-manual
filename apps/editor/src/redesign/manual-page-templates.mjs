import {withManualDividerStyle} from './manual-divider-style.mjs';
import {projectManualCover,restoreManualCover,getManualCoverProjection} from './manual-cover-legacy-projection.mjs';
import {closeHistory} from '@tiptap/pm/history';
import {TextSelection} from '@tiptap/pm/state';
import {documentToNode,findManualObject,findManualCoverRole,getManualSlashTrigger} from './manual-kernel.mjs';
import {getManualPageGroups} from './manual-page-groups.mjs';
import {isSafeManualAsset,newManualId,plainInline} from './manual-v2.mjs';

// Presets are compositions of v2 nodes, not new serialized page types.
export const MANUAL_PAGE_TEMPLATES=Object.freeze([
 Object.freeze({id:'body',label:'기본 본문'}),
 Object.freeze({id:'procedure',label:'절차 안내'}),
 Object.freeze({id:'table',label:'표 중심'}),
 Object.freeze({id:'cover',label:'표지'}),
 Object.freeze({id:'screen',label:'화면과 설명',needsInput:'image'})
]);
const paragraph=()=>({id:newManualId(),type:'paragraph',content:[]});
const cell=(text='')=>({id:newManualId(),content:plainInline(text)});
const step=()=>({id:newManualId(),title:[],blocks:[paragraph()]});
const figureBlock=figure=>{
 // The caller must finish the image chooser and add its bytes to the asset store
 // before executing (resolveAsset checks that stored bytes exist). Cancellation never creates a missing-asset placeholder.
 if(!figure||!isSafeManualAsset(figure.asset)||typeof figure.alt!=='string')throw new TypeError('선택한 이미지와 대체 설명이 필요합니다.');
 return {id:newManualId(),type:'figure',asset:figure.asset,alt:figure.alt,caption:structuredClone(figure.caption??[]),widthPreset:figure.widthPreset??'reading',...(figure.crop?{crop:structuredClone(figure.crop)}:{})};
};

/** Returns fresh editable data; labels describe fields, never invented product facts.
 * Cover composition follows examples/compact.json and ManualCover in src/components.mjs.
 * Its metadata table, divider and section frame are presentation owned by the renderer.
 */
export function createManualPageTemplate(templateId,{title='',figure}={}){
 if(!MANUAL_PAGE_TEMPLATES.some(item=>item.id===templateId))throw new TypeError('알 수 없는 페이지 구성입니다.');
 if(templateId==='cover'){
  const cover={id:newManualId(),title:plainInline(title),logo:{src:'@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg',alt:'LK ROBOTICS'},metadata:['문서 버전','작성일','적용 기기','적용 환경'].map(label=>({id:newManualId(),label:plainInline(label),value:[]})),sectionTitle:plainInline('시작하기 전에'),blocks:[{id:newManualId(),type:'list',ordered:false,items:[{id:newManualId(),blocks:[{...paragraph(),content:plainInline('준비물: ')}]}]},{id:newManualId(),type:'callout',tone:'signal',title:plainInline('시작 전 확인사항'),blocks:[paragraph()]}]};
  const projection=projectManualCover(cover),divider=projection.headerBlocks.find(block=>getManualCoverProjection(block.extensions)?.role==='divider');
  divider.extensions=withManualDividerStyle({extensions:divider.extensions},'emphasis').extensions;
  return restoreManualCover(cover,projection);
 }
 const page={id:newManualId(),title:plainInline(title),blocks:[]};
 if(templateId==='body')page.blocks=[paragraph()];
 if(templateId==='procedure')page.blocks=[{id:newManualId(),type:'procedure',start:1,steps:[step(),step()]},{id:newManualId(),type:'callout',tone:'signal',title:plainInline('보충 안내'),blocks:[paragraph()]}];
 if(templateId==='table')page.blocks=[{id:newManualId(),type:'table',label:'',headers:[cell('항목'),cell('설명')],rows:[[cell(),cell()],[cell(),cell()]]},paragraph()];
 if(templateId==='screen')page.blocks=[{id:newManualId(),type:'mediaGroup',layout:'sideBySide',figure:figureBlock(figure),blocks:[paragraph()]}];
 return page;
}

/** Physical root/tail anchors resolve to the end of the whole consecutive group.
 * Capture revision=state.doc when opening the menu/chooser; keep it through await.
 * beforeFirstPage:true inserts before the first actual item, including a cover.
 * Cover templates follow the same explicit page boundary as other templates.
 * Optional cover-only trigger consumes the exact live slash prefix in this same transaction.
 * No dispatch is a dry run. A cancelled/stale/readonly request is a no-op.
 */
export const insertManualPageTemplate=(templateId,{afterPageId,beforePageId,beforeFirstPage=false,revision,cancelled=false,readOnly=false,title,figure,resolveAsset,trigger}={})=>(state,dispatch,view)=>{
 if(cancelled||readOnly||view?.composing||view?.editable===false||revision!==undefined&&revision!==state.doc)return false;
 if(beforeFirstPage!==false&&beforeFirstPage!==true||beforeFirstPage&&(afterPageId!==undefined&&afterPageId!==null||beforePageId!==undefined))return false;
 if(trigger){
  if(templateId!=='cover')return false;
  const live=getManualSlashTrigger(state);if(!live||['from','to','query','blockId'].some(key=>live[key]!==trigger[key]))return false;
 }
 if(beforePageId!==undefined&&afterPageId!==undefined)return false;
 const groups=getManualPageGroups(state.doc),group=beforeFirstPage?groups[0]:groups.find(item=>item.pageIds.includes(beforePageId??afterPageId));
 if(!group)return false;
 if(templateId==='screen'){
  try{if(!isSafeManualAsset(figure?.asset)||typeof resolveAsset!=='function'||!/^data:image\//.test(resolveAsset(figure.asset)))return false;}catch{return false;}
 }
 let data,node;
 try{
  data=createManualPageTemplate(templateId,{title:templateId==='cover'?(title??state.doc.attrs.meta.title??''):title??'',figure});
  const shell={schemaVersion:2,id:newManualId(),title:'',pages:templateId==='cover'?[{id:newManualId(),title:[],blocks:[]}]:[data],...(templateId==='cover'?{cover:data}:{})};
  node=documentToNode(shell).firstChild;
 }catch{return false;}
 let pos=0;
 if(!beforeFirstPage){
  const anchor=beforePageId!==undefined?group.pageIds[0]:group.pageIds.at(-1);state.doc.forEach((page,at)=>{if(page.attrs.id===anchor)pos=beforePageId!==undefined?at:at+page.nodeSize;});
 }
 if(!state.doc.canReplaceWith(state.doc.content.findIndex(pos).index,state.doc.content.findIndex(pos).index,node.type))return false;
 if(dispatch){
  const tr=closeHistory(state.tr);if(trigger)tr.delete(trigger.from,trigger.to);tr.insert(tr.mapping.map(pos),node);
  const title=templateId==='cover'?findManualCoverRole({doc:tr.doc},data.id,'title'):null;
  if(templateId==='cover'&&!title)return false;
  tr.setSelection(TextSelection.create(tr.doc,title?title.pos+1:pos+2));tr.doc.check();
  dispatch(tr.setMeta('manualPageTemplate',{templateId,pageId:data.id,...(beforeFirstPage?{beforeFirstPage:true}:beforePageId!==undefined?{beforePageId}:{afterPageId})}).scrollIntoView());
 }return true;
};

/** Insert a fresh independent cover at the current logical page's position.
 * Never reuse, move, overwrite or delete existing pages or cover templates. */
export const configureManualCoverTemplate=({targetId,revision,cancelled=false,readOnly=false,trigger}={})=>(state,dispatch,view)=>{
 const target=targetId&&findManualObject(state,targetId);if(targetId&&!target)return false;
 const point=target?state.doc.resolve(target.pos+1):state.selection.$from;
 let surface=state.selection.node&&['page','cover'].includes(state.selection.node.type.name)?state.selection.node:null;
 for(let depth=point.depth;depth>0;depth--){const node=point.node(depth);if(['page','cover'].includes(node.type.name)){surface=node;break;}}
 if(!surface)return false;
 return insertManualPageTemplate('cover',{beforePageId:surface.attrs.id,revision,cancelled,readOnly,trigger})(state,dispatch,view);
};
