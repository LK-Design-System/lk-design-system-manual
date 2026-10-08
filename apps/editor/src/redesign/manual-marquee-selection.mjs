const BLOCKED='input,textarea,select,button,a,[role="menu"],[role="toolbar"],[role="slider"],[role="spinbutton"],[contenteditable="false"],.manual-move-handle,[data-outline-page-handle],[data-resize-handle],[data-manual-resize-handle]';
const EXCLUDED=new Set(['page','pageTitle','pageLead','cover','coverTitle','coverMetadata','coverSection']);
const point=event=>({x:event.clientX,y:event.clientY});
const finitePoint=value=>Number.isFinite(value?.x)&&Number.isFinite(value?.y);
function rectangle(value){
 if(!value)return null;
 const left=value.left,top=value.top,right=value.right??left+value.width,bottom=value.bottom??top+value.height;
 return [left,top,right,bottom].every(Number.isFinite)&&right>left&&bottom>top?{left,top,right,bottom}:null;
}
export function getManualMarqueeRectangle(start,end){
 if(!finitePoint(start)||!finitePoint(end))return null;
 return {left:Math.min(start.x,end.x),top:Math.min(start.y,end.y),right:Math.max(start.x,end.x),bottom:Math.max(start.y,end.y)};
}
// Geometry is viewport-relative and read anew after scrolling. IDs stay in caller
// order; the caller supplies model-selectable objects, never range endpoints.
export function getManualMarqueeHits({rect,items}){
 if(!rect||!Array.isArray(items)||![rect.left,rect.top,rect.right,rect.bottom].every(Number.isFinite)||rect.right<=rect.left||rect.bottom<=rect.top)return [];
 const seen=new Set(),hits=[];
 for(const item of items){
  const box=rectangle(item?.rect);
  if(!item||typeof item.id!=='string'||!item.id||seen.has(item.id)||!box||item.visible===false||EXCLUDED.has(item.kind))continue;
  seen.add(item.id);
  if(box.left<rect.right&&box.right>rect.left&&box.top<rect.bottom&&box.bottom>rect.top)hits.push(item);
 }
 const ids=new Set(hits.map(item=>item.id));
 return hits.filter(item=>!(item.ancestorIds||[]).some(id=>ids.has(id))).map(item=>item.id);
}
// Editable roots can contain blank paper. Only the exact page/content background
// is eligible there; descendant text/atomic blocks always keep native behavior.
export function isManualMarqueeBlankTarget(target){
 if(!target||target.nodeType===3||target.closest?.(BLOCKED))return false;
 const kind=target.dataset?.manualNode;
 if(kind==='page')return true;
 if(target.classList?.contains('lds-manual-content')&&target.parentElement?.dataset?.manualNode==='page')return true;
 return !!target.classList?.contains('manual-v2-writing')||!!target.classList?.contains('manual-v2-editor');
}
/** Owns transient DOM feedback and pointer lifecycle only. begin is called by the
 * parent's pointerdown handler; no pointerdown listener or PM mutation is added.
 * onPreview/onCommit receive exact IDs, including []. Do not convert sparse hits
 * into selectManualBlocks(first,last); the model owner must preserve exact IDs.
 */
export function installManualMarqueeSelection({element,getItems,getRevision,isEnabled=()=>true,isBlankTarget=isManualMarqueeBlankTarget,onPreview=()=>{},onCommit=()=>{},onCancel=()=>{},getScrollElement=()=>element,threshold=6,edgeSize=32,maxScrollSpeed=18,surface=element.ownerDocument.defaultView}={}){
 if(!element||typeof getItems!=='function'||typeof getRevision!=='function')throw new TypeError('Marquee geometry and revision providers are required.');
 const document=element.ownerDocument;let alive=true,session=null,frame=null,box=null,suppressClick=false;
 const valid=current=>alive&&session===current&&element.isConnected!==false&&isEnabled()&&Object.is(current.revision,getRevision());
 const scrollOffset=scroll=>({x:(surface.scrollX||0)+(scroll&&scroll!==document.scrollingElement?scroll.scrollLeft||0:0),y:(surface.scrollY||0)+(scroll&&scroll!==document.scrollingElement?scroll.scrollTop||0:0)});
 const cancelFrame=()=>{if(frame!==null){surface.cancelAnimationFrame(frame);frame=null;}};
 const feedback=()=>{const current=session;if(!current)return null;const offset=scrollOffset(current.scroll),start={x:current.origin.x-offset.x,y:current.origin.y-offset.y},rect=getManualMarqueeRectangle(start,current.point);return {rect,ids:getManualMarqueeHits({rect,items:getItems()}),pointerId:current.pointerId};};
 function draw(value){
  if(!box){box=document.createElement('div');box.dataset.manualMarquee='true';box.setAttribute('aria-hidden','true');Object.assign(box.style,{position:'fixed',pointerEvents:'none',boxSizing:'border-box',zIndex:'20',border:'1px solid var(--color-semantic-primary-normal)',background:'color-mix(in srgb, var(--color-semantic-primary-normal) 10%, transparent)'});(document.body||element).append(box);}
  const rect=value.rect;Object.assign(box.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.right-rect.left}px`,height:`${rect.bottom-rect.top}px`});
 }
 function finish({commit=false,reason='cancel'}={}){
  const current=session;if(!current)return;let value;
  if(commit&&current.started&&!valid(current))reason='stale';
  try{if(commit&&current.started&&valid(current))value=feedback();}catch{reason='geometry';}
  session=null;cancelFrame();box?.remove();box=null;
  if(current.started)suppressClick=true;
  try{element.releasePointerCapture?.(current.pointerId);}catch{}
  onPreview(null);
  if(value)onCommit(value);else onCancel({reason:current.started?reason:reason==='pointerup'?'click':reason,started:current.started,pointerId:current.pointerId,point:{...current.start},target:current.target});
 }
 function refresh(){
  const current=session;if(!current)return false;
  if(!valid(current)){finish({reason:'stale'});return false;}
  if(!current.started)return true;
  try{const value=feedback();draw(value);onPreview(value);if(!valid(current)){finish({reason:'stale'});return false;}return true;}catch{finish({reason:'geometry'});return false;}
 }
 const schedule=()=>{if(session?.started&&frame===null)frame=surface.requestAnimationFrame(tick);};
 function tick(){
  frame=null;const current=session;if(!current||!refresh()||session!==current)return;
  const scroll=current.scroll,bounds=rectangle(scroll?.getBoundingClientRect?.());
  if(!bounds||!Number.isFinite(scroll?.scrollHeight)||!Number.isFinite(scroll?.clientHeight))return;
  const {x,y}=current.point;
  // Scroll only while the pointer remains within the scroll surface's horizontal
  // band and close to its top/bottom edge. No window/other panel scrolling.
  if(x<bounds.left||x>bounds.right||y<bounds.top-edgeSize||y>bounds.bottom+edgeSize)return;
  const velocity=y<bounds.top+edgeSize?-maxScrollSpeed*Math.min(1,(bounds.top+edgeSize-y)/edgeSize):y>bounds.bottom-edgeSize?maxScrollSpeed*Math.min(1,(y-bounds.bottom+edgeSize)/edgeSize):0;
  const before=scroll.scrollTop||0;if(velocity)scroll.scrollTop=Math.max(0,Math.min(before+velocity,Math.max(0,scroll.scrollHeight-scroll.clientHeight)));
  if((scroll.scrollTop||0)!==before){refresh();schedule();}
 }
 function begin(event){
  if(!session)suppressClick=false;
  if(!alive||session||!isEnabled()||event.defaultPrevented||event.button!==0||event.isPrimary===false||event.pointerType&&event.pointerType!=='mouse'||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||!finitePoint(point(event))||!element.contains(event.target)||!isBlankTarget(event.target,event))return false;
  suppressClick=false;const scroll=getScrollElement(),offset=scrollOffset(scroll),start=point(event);
  session={target:event.target,pointerId:event.pointerId,revision:getRevision(),start,point:start,origin:{x:start.x+offset.x,y:start.y+offset.y},scroll,started:false};
  try{element.setPointerCapture?.(event.pointerId);}catch{}
  return true;
 }
 function move(event){
  const current=session;if(!current||event.pointerId!==current.pointerId)return;
  if(!valid(current)){finish({reason:'stale'});return;}
  if(event.buttons===0){finish({reason:'buttons'});return;}
  if(!finitePoint(point(event))){finish({reason:'geometry'});return;}
  current.point=point(event);
  if(!current.started&&Math.hypot(current.point.x-current.start.x,current.point.y-current.start.y)<threshold)return;
  current.started=true;event.preventDefault();refresh();schedule();
 }
 function up(event){const current=session;if(!current||event.pointerId!==current.pointerId)return;if(finitePoint(point(event)))current.point=point(event);if(current.started)event.preventDefault();finish({commit:true,reason:'pointerup'});}
 const cancelPointer=event=>{if(session&&event.pointerId===session.pointerId)finish({reason:event.type||'pointercancel'});};
 const key=event=>{if(session&&event.key==='Escape'){event.preventDefault();event.stopPropagation();finish({reason:'escape'});}};
 const blur=()=>finish({reason:'blur'});
 const scroll=()=>{if(session?.started){refresh();schedule();}};
 const click=event=>{if(suppressClick&&event.detail!==0){suppressClick=false;event.preventDefault();event.stopPropagation();}};
 document.addEventListener('pointermove',move,{capture:true,passive:false});document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',cancelPointer,true);document.addEventListener('lostpointercapture',cancelPointer,true);document.addEventListener('keydown',key,true);document.addEventListener('scroll',scroll,true);element.addEventListener('click',click,true);surface.addEventListener('blur',blur);surface.addEventListener('resize',scroll);
 return {begin,refresh,cancel:()=>finish({reason:'cancel'}),isDragging:()=>!!session,isSelecting:()=>!!session?.started,dispose(){if(!alive)return;finish({reason:'dispose'});alive=false;document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',cancelPointer,true);document.removeEventListener('lostpointercapture',cancelPointer,true);document.removeEventListener('keydown',key,true);document.removeEventListener('scroll',scroll,true);element.removeEventListener('click',click,true);surface.removeEventListener('blur',blur);surface.removeEventListener('resize',scroll);}};
}
