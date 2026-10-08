import {closeHistory} from '@tiptap/pm/history';
import {Selection} from '@tiptap/pm/state';
export {manualFigureWidthStyle,manualFigureAlignmentStyle} from '../../../../src/manual-figure-style.mjs';

export const MANUAL_FIGURE_LAYOUT_OWNER='@lk-design-system/manual-figure-layout';
const positive=value=>Number.isFinite(value)&&value>0;
const alignments=new Set(['left','center','right']);
function marker(extensions){if(!extensions||typeof extensions!=='object'||Array.isArray(extensions))return null;for(const [key,value]of Object.entries(extensions))if(value&&value.owner===MANUAL_FIGURE_LAYOUT_OWNER&&value.version===1&&value.kind==='figure-layout')return {key,value};return null;}
export function readManualFigureLayout(extensions){const found=marker(extensions);return found?{key:found.key,...(positive(found.value.widthPx)?{widthPx:found.value.widthPx}:{}),...(alignments.has(found.value.alignment)?{alignment:found.value.alignment}:{})}:null;}
export const resolveManualFigureAlignment=(extensions,{defaultAlignment='center'}={})=>readManualFigureLayout(extensions)?.alignment??(alignments.has(defaultAlignment)?defaultAlignment:'center');
export function withManualFigureAlignment(meta,alignment){
 if(!alignments.has(alignment))throw new TypeError('이미지 정렬이 올바르지 않습니다.');
 const result=structuredClone(meta||{}),old=marker(result.extensions),preserveEmpty=Object.hasOwn(result,'extensions')&&Object.keys(result.extensions).length===0,extensions=result.extensions??={};let key=old?.key||'manualFigureLayout';
 for(let suffix=2;!old&&Object.hasOwn(extensions,key);suffix++)key=`manualFigureLayout${suffix}`;
 extensions[key]={...(old?old.value:{}),owner:MANUAL_FIGURE_LAYOUT_OWNER,version:1,kind:'figure-layout',alignment,...(preserveEmpty?{preserveEmptyExtensions:true}:{})};result.extensions=extensions;return result;
}
export function withManualFigureWidth(meta,widthPx){
 if(!positive(widthPx))throw new TypeError('이미지 너비가 올바르지 않습니다.');
 const result=structuredClone(meta||{}),old=marker(result.extensions),preserveEmpty=Object.hasOwn(result,'extensions')&&Object.keys(result.extensions).length===0,extensions=result.extensions??={};let key=old?.key||'manualFigureLayout';
 for(let suffix=2;!old&&Object.hasOwn(extensions,key);suffix++)key=`manualFigureLayout${suffix}`;
 extensions[key]={...(old?old.value:{}),owner:MANUAL_FIGURE_LAYOUT_OWNER,version:1,kind:'figure-layout',widthPx,...(preserveEmpty?{preserveEmptyExtensions:true}:{})};result.extensions=extensions;return result;
}
export function withoutManualFigureWidth(meta){
 const result=structuredClone(meta||{}),old=marker(result.extensions);if(!old)return result;
 delete result.extensions[old.key].widthPx;const known=['owner','version','kind','preserveEmptyExtensions'];
 if(Object.keys(result.extensions[old.key]).every(key=>known.includes(key))){delete result.extensions[old.key];if(!Object.keys(result.extensions).length&&!old.value.preserveEmptyExtensions)delete result.extensions;}
 return result;
}
function find(doc,id){let found=null;doc.descendants((node,pos)=>{if(node.attrs.id===id)found={node,pos};});return found;}
function allowed(state,view,options){
 if(options.cancelled||options.readOnly||view?.composing||view?.editable===false||view?.state&&view.state!==state||options.revision!==undefined&&options.revision!==state.doc)return false;
 const guard=view?.props?.manualFigureResizeEnabled;return typeof guard==='function'?guard(view)!==false:guard!==false;
}
function resizableFigure(state,id){const found=find(state.doc,id);return found?.node.type.name==='figure'?found:null;}
function commit(state,dispatch,found,meta,details){
 if(JSON.stringify(found.node.attrs.meta)===JSON.stringify(meta))return false;
 if(dispatch){const tr=closeHistory(state.tr).setNodeMarkup(found.pos,undefined,{...found.node.attrs,meta},found.node.marks);tr.setSelection(Selection.fromJSON(tr.doc,state.selection.toJSON())).setStoredMarks(state.storedMarks);dispatch(tr.setMeta('manualFigureResize',details).scrollIntoView());}return true;
}
/** Width is in unscaled CSS pixels. Pointer preview is owned by the UI; only
 * pointer-up or a numeric commit calls this command and adds one Undo entry. */
export const setManualFigureWidth=(options={})=>(state,dispatch,view)=>{
 if(!allowed(state,view,options)||!positive(options.widthPx)||options.minWidthPx!==undefined&&(!positive(options.minWidthPx)||options.widthPx<options.minWidthPx)||options.maxWidthPx!==undefined&&(!positive(options.maxWidthPx)||options.widthPx>options.maxWidthPx))return false;
 const found=resizableFigure(state,options.figureId);return !!found&&commit(state,dispatch,found,withManualFigureWidth(found.node.attrs.meta,options.widthPx),{figureId:options.figureId,widthPx:options.widthPx});
};
export const resetManualFigureWidth=(options={})=>(state,dispatch,view)=>{
 if(!allowed(state,view,options))return false;const found=resizableFigure(state,options.figureId);return !!found&&commit(state,dispatch,found,withoutManualFigureWidth(found.node.attrs.meta),{figureId:options.figureId,reset:true});
};
/** Alignment shares the owned layout packet with width, keeping opaque fields. */
export const setManualFigureAlignment=(options={})=>(state,dispatch,view)=>{
 if(!allowed(state,view,options)||!alignments.has(options.alignment))return false;
 const found=resizableFigure(state,options.figureId);return !!found&&commit(state,dispatch,found,withManualFigureAlignment(found.node.attrs.meta,options.alignment),{figureId:options.figureId,alignment:options.alignment});
};
