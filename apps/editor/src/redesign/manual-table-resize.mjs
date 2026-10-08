const finite=value=>Number.isFinite(value);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

/** Handles are view-only elements marked data-manual-table-resize. Cell-selection
 * listeners must ignore that marker. getTarget supplies unscaled CSS geometry.
 * onPreview(payload|null) changes/restores DOM only; onCommit is called once.
 */
export function installManualTableResize({element,getTarget,getRevision,getGeneration=()=>0,isEnabled=()=>true,onPreview=()=>{},onCommit=()=>{},onCancel=()=>{},surface=element.ownerDocument.defaultView,minColumnPx=24}={}){
 const document=element.ownerDocument;let session=null,alive=true;
 const current=s=>alive&&isEnabled()&&getRevision()===s.revision&&getGeneration()===s.generation&&s.handle.isConnected!==false;
 function finish(commit,reason){
  const s=session;if(!s)return false;const valid=current(s);session=null;
  try{s.handle.releasePointerCapture?.(s.pointerId);}catch{}
  onPreview(null);
  if(commit&&valid&&s.changed){onCommit({...s.payload,revision:s.revision,generation:s.generation});return true;}
  onCancel({reason:valid?reason:'stale'});return false;
 }
 function begin(event){
  if(!alive||session||!isEnabled()||event.button!==0||event.isPrimary===false||!finite(event.clientX)||!finite(event.clientY))return false;
  const handle=event.target.closest?.('[data-manual-table-resize]');if(!handle||!element.contains(handle))return false;
  let target;try{target=getTarget(event,handle);}catch{return false;}
  if(!target||typeof target.tableId!=='string'||!['column','row'].includes(target.kind)||!finite(target.scale)||target.scale<=0)return false;
  if(target.kind==='column'&&(!Array.isArray(target.columnWeights)||!target.columnWeights.every(value=>finite(value)&&value>0)||!Number.isInteger(target.columnIndex)||target.columnIndex<0||target.columnIndex>=target.columnWeights.length-1||!finite(target.frameWidth)||target.frameWidth<=0||!finite(minColumnPx)||minColumnPx<=0))return false;
  if(target.kind==='row'&&(!Number.isInteger(target.rowIndex)||target.rowIndex<0||!finite(target.rowHeightPx)||target.rowHeightPx<0))return false;
  const origin=structuredClone(target);
  if(origin.kind==='column'){
   // Normalize to avoid overflow for valid very large persisted weights.
   const max=Math.max(...origin.columnWeights);origin.columnWeights=origin.columnWeights.map(value=>value/max);
   const total=origin.columnWeights.reduce((a,b)=>a+b,0),minimum=minColumnPx/origin.frameWidth*total,index=origin.columnIndex;
   if(origin.columnWeights[index]+origin.columnWeights[index+1]<minimum*2)return false;
  }
  session={handle,pointerId:event.pointerId,revision:getRevision(),generation:getGeneration(),origin,startX:event.clientX,startY:event.clientY,payload:null,changed:false};
  event.preventDefault();event.stopPropagation();try{handle.setPointerCapture?.(event.pointerId);}catch{}return true;
 }
 function move(event){
  const s=session;if(!s||event.pointerId!==s.pointerId)return;
  if(!current(s)){finish(false,'stale');return;}if(!finite(event.clientX)||!finite(event.clientY))return;
  const o=s.origin;let payload;
  if(o.kind==='column'){
   const columnWeights=[...o.columnWeights],index=o.columnIndex,total=columnWeights.reduce((a,b)=>a+b,0),minimum=minColumnPx/o.frameWidth*total,pair=columnWeights[index]+columnWeights[index+1],delta=(event.clientX-s.startX)/o.scale/o.frameWidth*total;
   columnWeights[index]=Math.max(minimum,Math.min(pair-minimum,o.columnWeights[index]+delta));columnWeights[index+1]=pair-columnWeights[index];
   payload={tableId:o.tableId,columnWeights};s.changed=!equal(columnWeights,o.columnWeights);
  }else{const rowMinHeightPx=Math.max(0,o.rowHeightPx+(event.clientY-s.startY)/o.scale);payload={tableId:o.tableId,rowIndex:o.rowIndex,rowMinHeightPx};s.changed=rowMinHeightPx!==o.rowHeightPx;}
  s.payload=payload;event.preventDefault();event.stopPropagation();onPreview(payload);
 }
 function up(event){if(!session||event.pointerId!==session.pointerId)return;move(event);finish(true,'unchanged');}
 function pointerCancel(event){if(session&&event.pointerId===session.pointerId)finish(false,event.type||'pointercancel');}
 function key(event){if(session&&event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(false,'escape');}}
 const cancelExternal=()=>finish(false,'geometry'),blur=()=>finish(false,'blur');
 element.addEventListener('pointerdown',begin,true);document.addEventListener('pointermove',move,{capture:true,passive:false});document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',pointerCancel,true);document.addEventListener('lostpointercapture',pointerCancel,true);document.addEventListener('keydown',key,true);document.addEventListener('scroll',cancelExternal,true);surface.addEventListener('resize',cancelExternal);surface.addEventListener('blur',blur);
 return {begin,cancel:()=>finish(false,'cancel'),refresh(){if(session&&!current(session))finish(false,'stale');},isResizing:()=>!!session,dispose(){if(!alive)return;finish(false,'dispose');alive=false;element.removeEventListener('pointerdown',begin,true);document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',pointerCancel,true);document.removeEventListener('lostpointercapture',pointerCancel,true);document.removeEventListener('keydown',key,true);document.removeEventListener('scroll',cancelExternal,true);surface.removeEventListener('resize',cancelExternal);surface.removeEventListener('blur',blur);}};
}
