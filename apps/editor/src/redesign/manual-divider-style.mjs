import {NodeSelection,Selection} from '@tiptap/pm/state';
import {closeHistory} from '@tiptap/pm/history';

export const MANUAL_DIVIDER_STYLE_OWNER='@lk-design-system/manual-divider-style';
const variants=new Set(['default','emphasis']);
const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
function marker(extensions){
 if(!record(extensions))return null;
 for(const [key,value]of Object.entries(extensions))if(record(value)&&value.owner===MANUAL_DIVIDER_STYLE_OWNER&&value.version===1&&value.kind==='divider-style'&&variants.has(value.variant))return {key,value};
 return null;
}
export function readManualDividerStyle(extensions){const found=marker(extensions);return found?{variant:found.value.variant}:null;}
/** Missing legacy cover styles keep their emphasized presentation. */
export function resolveManualDividerStyle(extensions,{cover=false}={}){return readManualDividerStyle(extensions)?.variant??(cover?'emphasis':'default');}
export function withManualDividerStyle(meta,variant){
 if(!variants.has(variant))throw new TypeError('구분선 스타일이 올바르지 않습니다.');
 const result=structuredClone(meta||{}),old=marker(result.extensions),preserveEmpty=Object.hasOwn(result,'extensions')&&record(result.extensions)&&!Object.keys(result.extensions).length,extensions=result.extensions??={};
 let key=old?.key||'manualDividerStyle';for(let suffix=2;!old&&Object.hasOwn(extensions,key);suffix++)key=`manualDividerStyle${suffix}`;
 extensions[key]={...(old?.value||{}),owner:MANUAL_DIVIDER_STYLE_OWNER,version:1,kind:'divider-style',variant,...(preserveEmpty?{preserveEmptyExtensions:true}:{})};result.extensions=extensions;return result;
}
/** Only an explicitly selected single divider can receive this atomic style edit. */
export const setManualDividerStyle=(options={})=>(state,dispatch,view)=>{
 if(!variants.has(options.variant)||options.cancelled||options.readOnly||view?.composing||view?.editable===false||view?.state&&view.state!==state||options.revision!==undefined&&options.revision!==state.doc)return false;
 const guard=view?.props?.manualDividerStyleEnabled;if(typeof guard==='function'?guard(view)===false:guard===false)return false;
 let found=null;state.doc.descendants((node,pos)=>{if(node.attrs.id===options.dividerId)found={node,pos};});
 if(found?.node.type.name!=='divider')return false;
 const selection=state.selection,selected=selection instanceof NodeSelection&&selection.from===found.pos||selection.manualBlockSelection&&!selection.manualIncompletePaginationSelection&&selection.ids.length===1&&selection.ids[0]===options.dividerId;
 if(!selected)return false;
 const meta=withManualDividerStyle(found.node.attrs.meta,options.variant);if(JSON.stringify(meta)===JSON.stringify(found.node.attrs.meta))return false;
 if(dispatch){const tr=closeHistory(state.tr).setNodeMarkup(found.pos,undefined,{...found.node.attrs,meta},found.node.marks);tr.setSelection(Selection.fromJSON(tr.doc,selection.toJSON())).setStoredMarks(state.storedMarks);dispatch(tr.setMeta('manualDividerStyle',{dividerId:options.dividerId,variant:options.variant}).scrollIntoView());}
 return true;
};
