import {fromEditorJSON,findEditorNode,textSelectionPath} from '../manual-adapter/index.mjs';
import {manualOperation} from './commands.mjs';

const at=(value,path)=>path.reduce((v,key)=>v?.[key],value);
const set=(path,value)=>({type:'set',path,value});
const insert=(path,index,value)=>({type:'insert',path,index,value});
const remove=(path,index)=>({type:'remove',path,index});
const point=(path,offset=0)=>({path,offset});
const plainParagraph=block=>block?.type==='paragraph'&&Object.keys(block).every(key=>['type','text'].includes(key));

// A keyboard gesture is planned against the current draft, then dispatched once.
// Merges only remove plain paragraphs/strings: attached metadata is never discarded.
export function planCanvasKey(document,{path,key,start=0,end=start}){
 const owner=path.slice(0,-1),block=at(document,owner),list=at(document,path.slice(0,-2));
 const optionalStepText=path.at(-1)==='text'&&owner.at(-2)==='items'&&at(document,owner.slice(0,-2))?.type==='steps';
 const text=at(document,path)??(optionalStepText?'':undefined);
 if(typeof text!=='string')return null;
 start=Math.max(0,Math.min(start,text.length));end=Math.max(start,Math.min(end,text.length));
 if(key==='Enter'){
  if(['paragraph','subheading'].includes(block?.type)&&path.at(-1)==='text'){
   const collection=owner.slice(0,-1),index=owner.at(-1);
   return {ops:[set(path,text.slice(0,start)),insert(collection,index+1,{type:'paragraph',text:text.slice(end)})],focus:point([...collection,index+1,'text'])};
  }
  if(path.at(-2)==='items'&&list?.type==='list'){
   const collection=path.slice(0,-1),index=path.at(-1);
   if(text===''&&index===list.items.length-1){
    const listPath=path.slice(0,-2),blocks=listPath.slice(0,-1),blockIndex=listPath.at(-1);
    if(listPath.at(-2)==='blocks'){
     if(index>0)return {ops:[remove(collection,index),insert(blocks,blockIndex+1,{type:'paragraph',text:''})],focus:point([...blocks,blockIndex+1,'text'])};
     if(Object.keys(list).every(key=>['type','items'].includes(key)))return {ops:[remove(blocks,blockIndex),insert(blocks,blockIndex,{type:'paragraph',text:''})],focus:point([...blocks,blockIndex,'text'])};
    }
   }
   return {ops:[set(path,text.slice(0,start)),insert(collection,index+1,text.slice(end))],focus:point([...collection,index+1])};
  }
  const steps=at(document,owner.slice(0,-2));
  if(owner.at(-2)==='items'&&steps?.type==='steps'){
   if(path.at(-1)==='title')return {ops:[],focus:point([...owner,'text'])};
   if(path.at(-1)==='text'){
    const collection=owner.slice(0,-1),index=owner.at(-1);
    return {ops:[...(block.text===undefined?[]:[set(path,text.slice(0,start))]),insert(collection,index+1,{title:'',text:text.slice(end)})],focus:point([...collection,index+1,'title'])};
   }
  }
 }
 if(start!==end)return null;
 if((key==='Backspace'&&start===0)||(key==='Delete'&&end===text.length)){
  const backward=key==='Backspace';
  if(block?.type==='paragraph'&&owner.at(-2)==='blocks'){
   const collection=owner.slice(0,-1),index=owner.at(-1),adjacent=index+(backward?-1:1),other=at(document,[...collection,adjacent]);
   const left=backward?other:block,right=backward?block:other,leftIndex=backward?adjacent:index,rightIndex=leftIndex+1;
   if(left?.type==='paragraph'&&plainParagraph(right))return {ops:[set([...collection,leftIndex,'text'],left.text+right.text),remove(collection,rightIndex)],focus:point([...collection,leftIndex,'text'],left.text.length)};
  }
  if(path.at(-2)==='items'&&list?.type==='list'){
   const collection=path.slice(0,-1),index=path.at(-1),leftIndex=backward?index-1:index,rightIndex=leftIndex+1;
   const left=at(document,[...collection,leftIndex]),right=at(document,[...collection,rightIndex]);
   if(typeof left==='string'&&typeof right==='string')return {ops:[set([...collection,leftIndex],left+right),remove(collection,rightIndex)],focus:point([...collection,leftIndex],left.length)};
  }
 }
 return null;
}

export function setCanvasSelection(editor,path,start,end=start,{TextSelection}){
 const found=findEditorNode(editor.getJSON(),path);
 if(found.node.type!=='manualString')return false;
 const offset=value=>found.pos+1+Math.max(0,Math.min(value,found.size-2));
 const selection=TextSelection.create(editor.state.doc,offset(start),offset(end));
 if(!selection.eq(editor.state.selection))editor.view.dispatch(editor.state.tr.setSelection(selection).setMeta('addToHistory',false));
 return true;
}
export function canvasSelection(editor){
 return textSelectionPath(editor.getJSON(),editor.state.selection.head);
}
export function applyCanvasPlan(editor,plan,runtime){
 if(!plan)return false;
 const tr=editor.state.tr;
 for(const operation of plan.ops){
  // Setting an unchanged prefix is a valid no-op at either end of a paragraph.
  const before=fromEditorJSON(tr.doc.toJSON(),{validate:false}).document;
  if(operation.type==='set'&&at(before,operation.path)===operation.value)continue;
  if(!manualOperation(operation,runtime)({state:editor.state,tr,dispatch:()=>{},view:editor.view}))return false;
 }
 if(plan.ops.length===0&&at(fromEditorJSON(tr.doc.toJSON(),{validate:false}).document,plan.focus.path)===undefined)return true;
 const found=findEditorNode(tr.doc.toJSON(),plan.focus.path);
 tr.setSelection(runtime.TextSelection.create(tr.doc,found.pos+1+Math.min(plan.focus.offset,found.size-2)));
 editor.view.dispatch(tr);
 return true;
}
