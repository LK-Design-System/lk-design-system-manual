import {Fragment} from '@tiptap/pm/model';
import {findManualObject,getManualSlashTrigger} from './manual-kernel.mjs';
// A pointer request may wait for the browser's real compositionend. This helper
// never focuses, dispatches, synthesizes input, or changes editor.composing.
function withoutInline(doc,id){
 const copy=node=>node.attrs.id===id?node.copy(Fragment.empty):node.isLeaf?node:node.copy(Fragment.fromArray([...Array(node.childCount)].map((_,index)=>copy(node.child(index)))));
 return copy(doc);
}
export function installManualSlashCompositionChoice({editor,getEditor,getGeneration,getMenu,isEnabled,onReady,surface=editor.dom.ownerDocument}){
 let pending=null,disposed=false;
 const cancel=()=>{pending=null;};
 function current({allowChangedDoc=false}={}){
  const request=pending,menu=getMenu(),trigger=getManualSlashTrigger(editor.state);
  return !!request&&!disposed&&getEditor()===editor&&getGeneration()===request.generation&&isEnabled(editor)&&(allowChangedDoc||request.doc===editor.state.doc)&&request.button.isConnected&&menu?.mode==='slash'&&menu.editor===editor&&menu.generation===request.generation&&trigger?.blockId===request.trigger.blockId&&trigger.from===request.trigger.from&&menu.trigger?.blockId===request.trigger.blockId&&menu.trigger.from===request.trigger.from;
 }
 function request(item,button){
  cancel();const menu=getMenu(),trigger=getManualSlashTrigger(editor.state);
  if(disposed||!editor.composing||!item.compositionChoice||!button?.isConnected||getEditor()!==editor||!isEnabled(editor)||menu?.mode!=='slash'||menu.editor!==editor||menu.generation!==getGeneration()||menu.revision!==editor.state.doc||!menu.selection?.eq(editor.state.selection)||!trigger||JSON.stringify(trigger)!==JSON.stringify(menu.trigger))return false;
  pending={itemId:item.id,button,generation:getGeneration(),trigger,doc:editor.state.doc,ended:false,settled:false,clicked:false};return true;
 }
 function observe(state,transaction){
  if(!pending)return;
  const before=pending.doc,old=findManualObject({doc:before},pending.trigger.blockId),next=findManualObject(state,pending.trigger.blockId);
  if(!current({allowChangedDoc:true})||!old||!next||transaction?.docChanged&&(transaction.getMeta('composition')==null||!withoutInline(before,old.node.attrs.id).eq(withoutInline(state.doc,next.node.attrs.id)))){cancel();return;}
  pending.doc=state.doc;
 }
 function validate(){if(pending&&!current())cancel();}
 function deliver(){
  if(!pending)return false;const request=pending,trigger=getManualSlashTrigger(editor.state);
  if(!current()||surface.activeElement!==request.button){cancel();return false;}
  if(!request.ended||!request.settled||!request.clicked||editor.composing)return false;
  pending=null;onReady({itemId:request.itemId,button:request.button,editor,generation:request.generation,doc:editor.state.doc,selection:editor.state.selection,trigger});return true;
 }
 function finish(){
  if(!pending)return false;
  if(!current()||!pending.ended||editor.composing||surface.activeElement!==pending.button){cancel();return false;}
  pending.settled=true;return deliver();
 }
 function confirm(item,button){
  if(!pending||pending.itemId!==item.id||pending.button!==button||!current()||surface.activeElement!==button){cancel();return false;}
  pending.clicked=true;deliver();return true;
 }
 const end=()=>{if(pending)pending.ended=true;};
 const key=event=>{if(event.key==='Escape')cancel();};
 const outside=event=>{if(pending&&event.target!==pending.button&&!pending.button.contains?.(event.target))cancel();};
 editor.dom.addEventListener('compositionend',end);surface.addEventListener('keydown',key,true);surface.addEventListener('pointerdown',outside,true);surface.addEventListener('focusin',outside,true);surface.addEventListener('pointerup',outside,true);surface.addEventListener('mouseup',outside,true);surface.addEventListener('pointercancel',cancel,true);
 return {request,confirm,observe,validate,finish,cancel,get pending(){return pending;},dispose(){disposed=true;cancel();editor.dom.removeEventListener('compositionend',end);surface.removeEventListener('keydown',key,true);surface.removeEventListener('pointerdown',outside,true);surface.removeEventListener('focusin',outside,true);surface.removeEventListener('pointerup',outside,true);surface.removeEventListener('mouseup',outside,true);surface.removeEventListener('pointercancel',cancel,true);}};
}
