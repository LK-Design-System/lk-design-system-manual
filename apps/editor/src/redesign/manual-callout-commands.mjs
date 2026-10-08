import {Plugin,PluginKey,TextSelection,NodeSelection} from '@tiptap/pm/state';
import {Decoration,DecorationSet} from '@tiptap/pm/view';
import {closeHistory,isHistoryTransaction} from '@tiptap/pm/history';
import {newManualId} from './manual-v2.mjs';
import {hasVisibleManualCalloutTitle} from '../../../../src/manual-callout-content.mjs';

export const manualCalloutFocusKey=new PluginKey('manual-callout-focus');
function findCallout(doc,id){let found=null;doc.descendants((node,pos)=>{if(node.type.name==='callout'&&node.attrs.id===id)found={node,pos};});return found;}
function activeTitle(state){
 const {selection}=state,{$from}=selection;
 if(!(selection instanceof TextSelection)||$from.parent.type.name!=='calloutTitle'||!$from.sameParent(selection.$to))return null;
 const node=$from.node($from.depth-1);return node.type.name==='callout'?{node,pos:$from.before($from.depth-1)}:null;
}
const editable=view=>!view?.composing&&view?.editable!==false;
function firstBodyText({node,pos}){
 let target=null;node.forEach((child,offset,index)=>{
  if(index===0||target!==null)return;
  const start=pos+1+offset;
  if(child.isTextblock&&!(child.type.name==='calloutTitle'&&!child.content.size))target=start+1;
  else child.descendants((nested,relative)=>{if(target!==null)return false;if(nested.isTextblock&&!(nested.type.name==='calloutTitle'&&!nested.content.size)){target=start+1+relative+1;return false;}});
 });return target;
}
function bodyTransaction(state,found,{boundary=false,allowInsert=true}={}){
 let tr=boundary?closeHistory(state.tr):state.tr,target=firstBodyText(found);
 if(target===null&&found.node.childCount===1&&allowInsert){
  const paragraph=state.schema.nodes.paragraph;if(!found.node.canReplaceWith(1,1,paragraph))return null;
  const pos=found.pos+1+found.node.firstChild.nodeSize;
  tr.insert(pos,paragraph.create({id:newManualId(),meta:{}}));target=pos+1;
 }
 tr.setSelection(target===null?NodeSelection.create(tr.doc,found.pos):TextSelection.create(tr.doc,target));
 return tr.setStoredMarks(state.storedMarks).setMeta(manualCalloutFocusKey,{editingId:null}).scrollIntoView();
}
export const focusManualCalloutBody=id=>(state,dispatch,view)=>{
 if(!editable(view))return false;const found=findCallout(state.doc,id);if(!found)return false;
 if(dispatch){const tr=bodyTransaction(state,found,{boundary:true});if(!tr)return false;dispatch(tr);}return true;
};
export const editManualCalloutTitle=id=>(state,dispatch,view)=>{
 if(!editable(view))return false;const found=findCallout(state.doc,id);if(!found)return false;
 if(dispatch)dispatch(state.tr.setSelection(TextSelection.create(state.doc,found.pos+2)).setStoredMarks(state.storedMarks).setMeta(manualCalloutFocusKey,{editingId:id}).scrollIntoView());return true;
};
/** Move authored title content into the first body paragraph without discarding
 * its inline marks or changing the required title slot and existing body. */
export const moveManualCalloutTitleToBody=(options={})=>(state,dispatch,view)=>{
 if(options.cancelled||options.readOnly||!editable(view)||view?.state&&view.state!==state||options.revision!==undefined&&options.revision!==state.doc)return false;
 const guard=view?.props?.manualCalloutFocusEnabled;if(typeof guard==='function'?guard(view,state)===false:guard===false)return false;
 let found=null,count=0;state.doc.descendants((node,pos)=>{if(node.attrs.id===options.id){count++;found={node,pos};}});
 if(count!==1||found?.node.type.name!=='callout')return false;
 const title=found.node.firstChild,paragraph=state.schema.nodes.paragraph;
 if(title?.type.name!=='calloutTitle'||!hasVisibleManualCalloutTitle(title)||!paragraph?.validContent(title.content)||!found.node.canReplaceWith(1,1,paragraph))return false;
 if(dispatch){
  const body=paragraph.create({id:newManualId(),meta:{}},title.content),start=found.pos+2;
  const tr=closeHistory(state.tr).delete(start,start+title.content.size),bodyPos=found.pos+1+tr.doc.nodeAt(found.pos).firstChild.nodeSize;
  tr.insert(bodyPos,body).setSelection(TextSelection.create(tr.doc,bodyPos+1)).setStoredMarks(state.storedMarks);
  dispatch(tr.setMeta(manualCalloutFocusKey,{editingId:null,deletedTitleId:options.id}).scrollIntoView());
 }
 return true;
};
/** Empty titles remain required schema slots. They are visible for explicit title
 * editing only; no load-time migration or mutation of an untouched callout. */
export function manualCalloutFocusPlugin({isEnabled=()=>true}={}){
 let liveView=null;
 return new Plugin({key:manualCalloutFocusKey,state:{
  init(){return {editingId:null,deletedTitleIds:[]};},
  apply(tr,previous,_old,state){
   const explicit=tr.getMeta(manualCalloutFocusKey),active=activeTitle(state),deletedTitleIds=explicit?.deletedTitleId&&!previous.deletedTitleIds.includes(explicit.deletedTitleId)?[...previous.deletedTitleIds,explicit.deletedTitleId]:previous.deletedTitleIds;
   // A deleted explicit title is a real caret location in its history event.
   // Keep that location on Undo while ordinary empty-title focus still goes to body.
   const editingId=isHistoryTransaction(tr)&&active&&deletedTitleIds.includes(active.node.attrs.id)?active.node.attrs.id:explicit?explicit.editingId:previous.editingId;
   return {editingId:editingId&&active?.node.attrs.id===editingId?editingId:null,deletedTitleIds};
  }
 },appendTransaction(transactions,_old,state){
  if(!transactions.some(tr=>tr.selectionSet||tr.docChanged)||!editable(liveView)||isEnabled(liveView,state)===false)return null;
  const active=activeTitle(state);if(!active||!state.selection.empty||hasVisibleManualCalloutTitle(active.node.firstChild)||manualCalloutFocusKey.getState(state)?.editingId===active.node.attrs.id)return null;
  // Undo must restore an originally bodyless callout, never immediately recreate
  // the paragraph just removed by history. Its frame remains a safe focus target.
  const allowInsert=!transactions.some(isHistoryTransaction);
  return bodyTransaction(state,active,{allowInsert,boundary:allowInsert&&active.node.childCount===1&&!transactions.some(tr=>tr.docChanged)});
 },props:{decorations(state){
  const id=manualCalloutFocusKey.getState(state)?.editingId;if(!id)return null;const found=findCallout(state.doc,id);if(!found)return null;
  const pos=found.pos+1;return DecorationSet.create(state.doc,[Decoration.node(pos,pos+found.node.firstChild.nodeSize,{class:'manual-callout-title-editing'})]);
 }},view(view){liveView=view;return {destroy(){if(liveView===view)liveView=null;}};}});
}
