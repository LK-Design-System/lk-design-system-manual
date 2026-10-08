const INTERACTIVE='[data-outline-page-row],button,a,input,select,textarea,[data-outline-boundary-id]';
const finite=value=>Number.isFinite(value);
function box(value){if(!value)return null;const {left,top}=value,right=value.right??left+value.width,bottom=value.bottom??top+value.height;return [left,top,right,bottom].every(finite)&&right>left&&bottom>top?{left,top,right,bottom}:null;}
function groupMap(groups){const result=new Map();for(const group of groups||[])for(const id of group.pageIds||[group.id])result.set(id,group.id);return result;}
export function normalizeOutlinePageSelection(groups,selection={}){
 const lookup=groupMap(groups),wanted=new Set((selection.selectedIds||[]).map(id=>lookup.get(id)).filter(Boolean));
 return {...selection,anchorId:lookup.get(selection.anchorId)||null,selectedIds:(groups||[]).map(group=>group.id).filter(id=>wanted.has(id))};
}
export function selectOutlinePageTarget(groups,selection,targetId,{shiftKey=false,ctrlKey=false,metaKey=false}={}){
 const current=normalizeOutlinePageSelection(groups,selection),target=groupMap(groups).get(targetId);if(!target)return null;
 const ids=groups.map(group=>group.id);
 if(shiftKey){const anchor=current.anchorId||target,a=ids.indexOf(anchor),b=ids.indexOf(target);return {...current,anchorId:anchor,selectedIds:ids.slice(Math.min(a,b),Math.max(a,b)+1)};}
 if(ctrlKey||metaKey){const chosen=new Set(current.selectedIds);if(chosen.has(target))chosen.delete(target);else chosen.add(target);return {...current,anchorId:current.anchorId||target,selectedIds:ids.filter(id=>chosen.has(id))};}
 return {...current,anchorId:target,selectedIds:[target]};
}
export function intersectOutlinePageRows(groups,rows,rectangle,bounds){
 const area=box(rectangle),clip=box(bounds);if(!area||!clip)return [];
 const intersection={left:Math.max(area.left,clip.left),right:Math.min(area.right,clip.right),top:Math.max(area.top,clip.top),bottom:Math.min(area.bottom,clip.bottom)};
 if(intersection.right<=intersection.left||intersection.bottom<=intersection.top)return [];
 const hit=[];for(const row of rows||[]){const rect=box(row.rect);if(rect&&rect.right>intersection.left&&rect.left<intersection.right&&rect.bottom>intersection.top&&rect.top<intersection.bottom)hit.push(row.id);}
 return normalizeOutlinePageSelection(groups,{selectedIds:hit}).selectedIds;
}
export function outlineSelectionContextMatches(a,b){return !!a&&!!b&&a.editor===b.editor&&a.revision===b.revision&&a.generation===b.generation;}
export function outlineSelectionSources(groups,selection,pageId){const current=normalizeOutlinePageSelection(groups,selection),id=groupMap(groups).get(pageId);return id?(current.selectedIds.includes(id)?current.selectedIds:[id]):[];}

// UI-only selection. It never writes a ProseMirror selection or document.
export function installOutlinePageSelection({container,getGroups,getSelection,getContext,isEnabled=()=>true,onChange,onPreview=()=>{},onSessionChange=()=>{},surface=container.ownerDocument.defaultView}){
 const document=container.ownerDocument;let alive=true,session=null,frame=null,suppressClick=false;
 const bounds=()=>box(container.getBoundingClientRect());
 const valid=current=>alive&&current===session&&isEnabled()&&outlineSelectionContextMatches(current.context,getContext());
 const release=current=>{try{if(current.captured)container.releasePointerCapture?.(current.pointerId);}catch{}};
 const stop=(cancel=false)=>{const current=session;if(!current)return;session=null;if(frame!==null)surface.cancelAnimationFrame(frame);frame=null;release(current);
  try{if(alive&&cancel&&current.started&&outlineSelectionContextMatches(current.context,getContext()))onChange(current.baseline,{reason:'marquee-cancel',navigate:false});}
  finally{if(alive){onPreview(null);onSessionChange(false);}}};
 const contentPoint=(point,clip)=>({x:point.x-clip.left+(container.scrollLeft||0),y:point.y-clip.top+container.scrollTop});
 const publish=current=>{const clip=bounds();if(!clip)return;const point=contentPoint(current.point,clip),area={left:Math.min(current.contentStart.x,point.x),top:Math.min(current.contentStart.y,point.y),right:Math.max(current.contentStart.x,point.x),bottom:Math.max(current.contentStart.y,point.y)};
  const rows=[...container.querySelectorAll('[data-outline-page-row]')].map(row=>{const rect=row.getBoundingClientRect(),left=rect.left-clip.left+(container.scrollLeft||0),top=rect.top-clip.top+container.scrollTop;return {id:row.dataset.outlinePageRow,rect:{left,top,right:left+rect.right-rect.left,bottom:top+rect.bottom-rect.top}};});
  // Hit-testing uses content coordinates, so autoscroll retains earlier pages.
  // The rectangle is recomputed from the origin: reversing shrinks the range.
  const contentBounds={left:0,top:0,right:Math.max(clip.right-clip.left,container.scrollWidth||0),bottom:Math.max(clip.bottom-clip.top,container.scrollHeight||0)};
  const selectedIds=intersectOutlinePageRows(getGroups(),rows,area,contentBounds),next={...current.baseline,anchorId:selectedIds[0]||current.baseline.anchorId,selectedIds};
  current.next=next;onChange(next,{reason:'marquee-preview',navigate:false});
  const clientArea={left:area.left+clip.left-(container.scrollLeft||0),top:area.top+clip.top-container.scrollTop,right:area.right+clip.left-(container.scrollLeft||0),bottom:area.bottom+clip.top-container.scrollTop};
  onPreview({left:Math.max(clientArea.left,clip.left),top:Math.max(clientArea.top,clip.top),right:Math.min(clientArea.right,clip.right),bottom:Math.min(clientArea.bottom,clip.bottom)});};
 const refresh=()=>{frame=null;const current=session;if(!current?.started)return;if(!valid(current)){stop(true);return;}
  const clip=bounds();let scrolled=false;
  if(clip&&current.point.x>=clip.left&&current.point.x<=clip.right){const zone=Math.min(28,(clip.bottom-clip.top)/2),y=current.point.y;
   const velocity=y<clip.top+zone&&y>=clip.top?-12*(1-(y-clip.top)/zone):y>clip.bottom-zone&&y<=clip.bottom?12*(1-(clip.bottom-y)/zone):0;
   const previous=container.scrollTop;if(velocity)container.scrollTop=Math.max(0,Math.min(previous+velocity,Math.max(0,container.scrollHeight-container.clientHeight)));scrolled=Math.abs(container.scrollTop-previous)>.01;}
  if(!valid(current)){stop(true);return;}publish(current);if(scrolled)schedule();};
 const schedule=()=>{if(alive&&frame===null&&session?.started)frame=surface.requestAnimationFrame(refresh);};
 const point=event=>({x:event.clientX,y:event.clientY});
 const down=event=>{if(!alive||session||event.defaultPrevented||event.button!==0||event.isPrimary===false||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||event.isComposing||!isEnabled())return;
  if(event.target?.closest?.(INTERACTIVE))return;const p=point(event),clip=bounds(),context=getContext();if(!clip||![p.x,p.y].every(finite)||p.x<clip.left||p.x>clip.right||p.y<clip.top||p.y>clip.bottom||!context)return;
  const baseline={...normalizeOutlinePageSelection(getGroups(),getSelection()),...context};session={pointerId:event.pointerId,start:p,contentStart:contentPoint(p,clip),point:p,baseline,context,started:false,captured:false,next:null};suppressClick=false;event.preventDefault();onSessionChange(true);};
 const move=event=>{const current=session;if(!current||event.pointerId!==current.pointerId)return;if(!valid(current)){stop(true);return;}current.point=point(event);if(![current.point.x,current.point.y].every(finite)){stop(true);return;}
  if(!current.started&&(current.point.x-current.start.x)**2+(current.point.y-current.start.y)**2>=36){current.started=true;try{container.setPointerCapture?.(current.pointerId);current.captured=true;}catch{}}
  if(current.started){event.preventDefault();schedule();}};
 const up=event=>{const current=session;if(!current||event.pointerId!==current.pointerId)return;if(!valid(current)){stop(true);return;}current.point=point(event);if(![current.point.x,current.point.y].every(finite)){stop(true);return;}
  if(current.started){event.preventDefault();publish(current);suppressClick=true;const next=current.next;stop();if(alive&&isEnabled()&&outlineSelectionContextMatches(current.context,getContext()))onChange(next,{reason:'marquee-commit',navigate:false});}else stop();};
 const cancel=event=>{if(session&&session.pointerId===event.pointerId)stop(true);};
 const key=event=>{if(!session)return;if(event.isComposing||event.keyCode===229||event.key==='Process'){stop(true);return;}if(event.key==='Escape'){event.preventDefault();event.stopPropagation();stop(true);}};
 const click=event=>{if(!suppressClick||event.detail===0)return;suppressClick=false;event.preventDefault();event.stopImmediatePropagation?.();};
 const blur=()=>stop(true),scroll=()=>schedule();
 const bindings=[[container,'pointerdown',down,false],[container,'click',click,true],[container,'scroll',scroll,false],[document,'pointermove',move,true],[document,'pointerup',up,true],[document,'pointercancel',cancel,true],[document,'lostpointercapture',cancel,true],[document,'keydown',key,true],[surface,'blur',blur,false]];
 for(const [target,name,listener,capture]of bindings)target.addEventListener(name,listener,capture);
 return {isSelecting:()=>session!==null,cancel:()=>stop(true),dispose(){stop(true);alive=false;for(const [target,name,listener,capture]of bindings)target.removeEventListener(name,listener,capture);}};
}
