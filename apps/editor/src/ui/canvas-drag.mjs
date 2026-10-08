import {getManualClientClip} from '../redesign/manual-client-clip.mjs';

export function handleGeometry({left,top,lineHeight,scale=1}){
 const iconHeight=Math.max(9,Math.min(13,13*scale));
 return {left:Math.max(0,left-38),top:top+(lineHeight-24)/2,iconHeight,iconWidth:iconHeight*2/3};
}

// Keep the authoring controls together inside the gutter, without entering content.
export function canvasRailPairGeometry({left,top,railLeft,clip}){
 if(!clip||![clip.left,clip.right,clip.top,clip.bottom].every(Number.isFinite)||clip.right<=clip.left||clip.bottom<=clip.top)return null;
 const pairedLeft=Math.max(left,clip.left+28);
 if(![left,top,railLeft,pairedLeft].every(Number.isFinite)||pairedLeft-left>10||pairedLeft+24>railLeft-4||railLeft<clip.left||railLeft>clip.right||top<clip.top||top+24>clip.bottom||pairedLeft+24>clip.right)return null;
 return {left:pairedLeft,addLeft:pairedLeft-28,top};
}

// Shared hit rule for a contextual handle rail, independent of the editor model.
export function canvasHoverTarget(elements,{x,y,width=Infinity,height=Infinity,visible=()=>true,railWidth=42,getRailLeft=element=>element.getBoundingClientRect().left}){
 if(x<0||y<0||x>=width||y>=height)return null;
 return elements.filter(element=>{
  const r=element.getBoundingClientRect(),left=getRailLeft(element);
  return Number.isFinite(left)&&r.width>0&&r.height>0&&r.right>0&&r.left<width&&r.bottom>0&&r.top<height&&
   x>=Math.max(0,left-railWidth)&&x<=left&&y>=(element.dataset?.manualNode==='divider'?r.top+r.height/2-12:r.top)&&y<=(element.dataset?.manualNode==='divider'?r.top+r.height/2+12:r.bottom)&&visible(element);
 }).sort((a,b)=>{
  if(a.contains(b))return 1;if(b.contains(a))return -1;
  // A divider's enlarged gutter band cannot take a neighboring block's real row.
  const extended=element=>{const r=element.getBoundingClientRect();return element.dataset?.manualNode==='divider'&&(y<r.top||y>r.bottom);};
  if(extended(a)!==extended(b))return extended(a)?1:-1;
  return Math.abs(getRailLeft(a)-x)-Math.abs(getRailLeft(b)-x);
 })[0]||null;
}

// PM NodeViews identify text with manual-node, not the legacy edit-path.
// Search only this frame, in DOM reading order, and never use image captions or
// table cells as a surrounding block's text anchor.
const canvasTextKinds=new Set(['paragraph','heading','pageLead','stepTitle','calloutTitle','toggleTitle']);
const canvasTextFrames=new Set(['callout','procedure','step','list','listItem','quote','toggle','mediaGroup']);
function canvasTextAnchor(element){
 const kind=element.dataset?.manualNode;
 if(!kind)return element.matches?.('[data-edit-path]')?element:element.querySelector?.('[data-manual-node="pageTitle"],[data-manual-node="coverTitle"],h3[data-edit-path],p[data-edit-path]')||element;
 if(kind==='page'||kind==='cover')return element.querySelector?.('[data-manual-node="pageTitle"],[data-manual-node="coverTitle"]')||element;
 if(!canvasTextFrames.has(kind)&&kind!=='todo'&&kind!=='codeBlock')return element;
 function rendered(node){
  if(!node||node.hidden||node.hasAttribute?.('inert'))return false;
  const rect=node.getBoundingClientRect();
  if(rect.width<=0||rect.height<=0)return false;
  const style=typeof getComputedStyle==='function'?getComputedStyle(node):null;
  return !style||!(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'||style.opacity==='0');
 }
 const direct=(node,tag)=>[...node.children||[]].find(child=>child.tagName?.toLowerCase()===tag);
 function firstVisible(node){
  if(!rendered(node))return null;
  const nodeKind=node.dataset?.manualNode;
  // A visible media frame is first content: do not skip it for later prose.
  if(nodeKind==='figure'||nodeKind==='table')return element;
  if(nodeKind==='todo'){
   const text=direct(node,'p');return rendered(text)?text:element;
  }
  if(nodeKind==='codeBlock'){
   const pre=direct(node,'pre'),code=pre&&direct(pre,'code');
   return rendered(pre)?rendered(code)?code:pre:element;
  }
  if(canvasTextKinds.has(nodeKind))return node;
  for(const child of node.children||[]){const found=firstVisible(child);if(found)return found;}
  return null;
 }
 return firstVisible(element)||element;
}

// Pointer handles live outside the rendered document: they cannot enter text,
// affect A4 measurement, or become part of a saved/printed manual.
export function installCanvasDrag({beforeDrag,onMove,onDelete,onSelect,onEdit,onIdle,getRevision,getScrollContainer=()=>window,onMenu,onInsert,onRangeSelect,isHandleTarget=()=>true,getRailLeft=element=>element.getBoundingClientRect().left}){
 const scrollContainer=getScrollContainer()||window;
 const layer=document.createElement('div');layer.className='manual-move-layer';document.body.append(layer);
 const line=document.createElement('div');line.className='manual-move-line';line.hidden=true;layer.append(line);
 const status=document.createElement('div');status.className='manual-move-status';status.setAttribute('role','status');status.hidden=true;layer.append(status);
 // One stable contextual control, not one button for every block on screen.
 const handle=document.createElement('button');handle.type='button';handle.className='manual-move-handle';handle.hidden=true;
 handle.innerHTML='<svg width="12" height="18" viewBox="0 0 12 18" aria-hidden="true"><g fill="currentColor"><circle cx="3" cy="3" r="1.4"/><circle cx="9" cy="3" r="1.4"/><circle cx="3" cy="9" r="1.4"/><circle cx="9" cy="9" r="1.4"/><circle cx="3" cy="15" r="1.4"/><circle cx="9" cy="15" r="1.4"/></g></svg>';
 layer.append(handle);
 const insert=onInsert?document.createElement('button'):null;
 if(insert){insert.type='button';insert.className='manual-move-handle manual-insert-handle';insert.hidden=true;insert.textContent='+';layer.append(insert);}
 let drag=null,frame=0,activePath=null,selectedPath=null;
 const sameKind=(path,collection)=>path.split('/').at(-2)===collection.split('/').at(-1);
 const self=(path,collection)=>collection===path||collection.startsWith(path+'/');
 function entries(){return [...document.querySelectorAll('[data-move-path]')];}
 function visible(element,y){
  if(!isHandleTarget(element))return false;
  const r=element.getBoundingClientRect(),width=window.innerWidth||Infinity;
  if(r.width<=0||r.height<=0||r.right<=0||r.left>=width||r.bottom<=0||r.top>=innerHeight)return false;
  if(element.closest?.('[hidden], [inert]'))return false;
  if(typeof getComputedStyle==='function'){
   for(let node=element;node&&node!==document;node=node.parentElement){
    const style=getComputedStyle(node);
    if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'||style.opacity==='0')return false;
   }
  }
  // A rail can sit over page whitespace, so test the adjacent content for occlusion.
  if(typeof document.elementFromPoint==='function'){
   // Divider whitespace is acquired around the line, but occlusion is tested on the line.
   const atY=Math.max(0,Math.min(innerHeight-1,element.dataset?.manualNode==='divider'?r.top+r.height/2:y??r.top+Math.min(r.height/2,12)));
   const hit=document.elementFromPoint(Math.max(0,Math.min(width-1,r.left+Math.min(r.width/2,2))),atY);
   if(!hit||!element.contains(hit))return false;
  }
  return true;
 }
 function markSelection(path){
  selectedPath=path;
  for(const element of entries())element.classList.toggle('manual-element-selected',element.dataset.movePath===path);
  handle.setAttribute('aria-pressed',String(!!path&&path===activePath));
 }
 function selectElement(path){
  activePath=path;markSelection(path);window.getSelection()?.removeAllRanges();
  refresh();onSelect(path);
 }
 function show(path){activePath=path;refresh();}
 const modifiers=event=>({shiftKey:!!event?.shiftKey,ctrlKey:!!event?.ctrlKey,metaKey:!!event?.metaKey,altKey:!!event?.altKey});
 function hide(){handle.hidden=true;if(insert)insert.hidden=true;}
 function controlAnchor(button){const r=button.getBoundingClientRect();return {left:r.left,top:r.top,bottom:r.bottom};}
 function openMenu(path,keys=modifiers()){if(!onMenu)return;try{beforeDrag();onMenu(path,controlAnchor(handle),keys);}catch(error){status.hidden=false;status.textContent=error.message;}}
 function refresh(){
  if(drag)return;
  markSelection(selectedPath);
  const element=entries().find(element=>element.dataset.movePath===activePath);
  const kind=element?.dataset.manualNode||'';handle.dataset.moveKind=kind;
  if(!element||!visible(element)){hide();return;}
  const rect=element.getBoundingClientRect();
  const anchor=canvasTextAnchor(element);
  const first=anchor.getBoundingClientRect(),scale=element.offsetWidth?rect.width/element.offsetWidth:1;
  const style=typeof getComputedStyle==='function'?getComputedStyle(anchor):null;
  const lineHeight=Math.min(first.height,(parseFloat(style?.lineHeight)||parseFloat(style?.fontSize)*1.5||24)*scale);
  const railLeft=getRailLeft(element);if(!Number.isFinite(railLeft)){hide();return;}
  const position=handleGeometry({left:railLeft,top:first.top,lineHeight,scale});
  const pageControl=['page','cover'].includes(kind);
  if(pageControl){position.left=first.left;position.top=rect.top+12;}
  const bounds=kind?scrollContainer===window?{left:0,right:window.innerWidth||Infinity,top:0,bottom:innerHeight}:getManualClientClip(scrollContainer,{left:0,top:0,width:window.innerWidth||Infinity,height:innerHeight}):null;
  if(kind&&!bounds){hide();return;}
  const clip=bounds?{left:Math.max(0,bounds.left)+8,right:Math.min(window.innerWidth||Infinity,bounds.right)-8,top:Math.max(0,bounds.top),bottom:Math.min(innerHeight,bounds.bottom)}:null;
  if(pageControl&&clip){
   if(clip.right-clip.left<64||position.top<clip.top||position.top+24>clip.bottom){hide();return;}
   position.left=Math.max(clip.left,Math.min(position.left,clip.right-64));
  }
  if(insert&&kind&&!pageControl&&clip){
   const pair=canvasRailPairGeometry({left:position.left,top:position.top,railLeft,clip});
   if(!pair){hide();return;}position.left=pair.left;
  }
  handle.hidden=position.top+24<0||position.top>innerHeight;
  handle.dataset.moveHandle=activePath;
  const label=element.dataset.moveLabel||'내용';
  handle.setAttribute('aria-label',`${label} ${onMenu?'메뉴 및 이동':'선택 및 이동'}`);
  if(onMenu)handle.removeAttribute('title');
  else handle.title=`${label} · 클릭하여 선택 · Enter 편집 · Delete 삭제 · 끌어서 이동`;
  if(onMenu){handle.setAttribute('aria-haspopup','dialog');handle.setAttribute('aria-keyshortcuts','Shift+F10');}
  handle.style.left=`${position.left}px`;handle.style.top=`${position.top}px`;
  handle.style.setProperty('--manual-handle-icon-height',`${position.iconHeight}px`);
  handle.style.setProperty('--manual-handle-icon-width',`${position.iconWidth}px`);
  if(insert){
   const stacked=!kind&&position.left<28,addLeft=kind?position.left-28:Math.max(0,position.left-28),addTop=position.top-(stacked?26:0);
   insert.hidden=pageControl||handle.hidden||!!clip&&(addLeft<clip.left||addLeft+24>clip.right||addTop<clip.top||addTop+24>clip.bottom);insert.dataset.moveInsert=activePath;insert.setAttribute('aria-label',`${label} 아래에 블록 추가`);insert.title=`${label} 아래에 블록 추가`;insert.style.left=`${addLeft}px`;insert.style.top=`${addTop}px`;
  }
 }
 function hover(event){
  if(drag||document.activeElement===handle||insert&&document.activeElement===insert||event.pointerType==='touch'||layer.contains(event.target))return;
  const element=event.target.closest?.('[data-move-path]');
  const direct=element&&visible(element,event.clientY)?element:null;
  const rail=canvasHoverTarget(entries(),{x:event.clientX,y:event.clientY,width:window.innerWidth||Infinity,height:innerHeight,railWidth:insert?70:42,getRailLeft,visible:element=>{
   if(!visible(element,event.clientY))return false;
   const hit=document.elementFromPoint?.(event.clientX,event.clientY)||event.target;
   return hit===document.body||hit===document.documentElement||hit?.contains?.(element)||element.contains(hit);
  }});
  // A page/step wrapper also owns its whitespace; its child's rail is more specific.
  // A list marker belongs to its item even when a child paragraph's rail overlaps it.
  const target=direct?.dataset.manualNode==='listItem'?direct:rail&&(!direct||direct.contains(rail))?rail:direct||rail;
  if(target){show(target.dataset.movePath);return;}
  // Keep the control reachable while the pointer crosses the small text/gutter gap.
  const current=entries().find(element=>element.dataset.movePath===activePath),r=current?.getBoundingClientRect();
  if(r&&visible(current,event.clientY)&&event.clientX>=getRailLeft(current)-(insert?70:42)&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=Math.max(r.bottom,r.top+28)&&
   (event.target===document.body||event.target.contains?.(current)||current.contains(event.target)))return;
  activePath=null;hide();
 }
 function focus(event){
  if(event.target===handle)return; // Reaching a control is not selecting its block.
  if(layer.contains(event.target))return;
  markSelection(null);
  const element=event.target.closest?.('[data-move-path]');
  show(element?.dataset.movePath||null);
 }
 function targetAt(x,y){
  const candidates=[...document.querySelectorAll('[data-move-collection]')].filter(element=>sameKind(drag.path,element.dataset.moveCollection)&&!self(drag.path,element.dataset.moveCollection));
  const hits=candidates.filter(element=>{
   const r=element.getBoundingClientRect(),empty=!element.querySelector('[data-move-path]');
   const bottom=empty?Math.max(r.bottom,r.top+48):r.bottom;
   return x>=r.left-28&&x<=r.right+12&&y>=r.top-12&&y<=bottom+12;
  }).sort((a,b)=>a.contains(b)?1:b.contains(a)?-1:b.dataset.moveCollection.length-a.dataset.moveCollection.length);
  const collection=hits[0];if(!collection)return null;
  const path=collection.dataset.moveCollection;
  // Public component/contentDOM wrappers need not match domain parentage.
  // Descendants are direct collection members only when their path says so.
  const children=[...collection.querySelectorAll('[data-move-path]')].filter(element=>element.dataset.movePath?.slice(0,element.dataset.movePath.lastIndexOf('/'))===path);
  let gap=children.findIndex(element=>{const r=element.getBoundingClientRect();return y<r.top+r.height/2;});if(gap<0)gap=children.length;
  const r=collection.getBoundingClientRect(),boundary=children[gap]?.getBoundingClientRect().top??children.at(-1)?.getBoundingClientRect().bottom??r.top;
  return {path,gap,left:r.left,top:boundary,width:r.width};
 }
 function guideGeometry(target,x,y){
  const clip=scrollContainer===window?{left:0,right:window.innerWidth,top:0,bottom:innerHeight}:getManualClientClip(scrollContainer,{left:0,top:0,width:window.innerWidth,height:innerHeight});
  // The guide includes an 8px circle at left-4/top-3, beyond its 2px line.
  const left=target&&clip?Math.max(target.left,clip.left+4):0,right=target&&clip?Math.min(target.left+target.width,clip.right):0;
  if(!target||!clip||![left,right,target.top,x,y].every(Number.isFinite)||x<clip.left||x>=clip.right||y<clip.top||y>=clip.bottom||right<=left||left+4>clip.right||target.top-3<clip.top||target.top+5>clip.bottom)return null;
  return {left,top:target.top,width:right-left};
 }
 function paint(){
  if(!drag?.started)return;
  drag.target=targetAt(drag.x,drag.y);const target=drag.target,guide=guideGeometry(target,drag.x,drag.y);line.hidden=!guide;
  if(guide){line.style.left=`${guide.left}px`;line.style.top=`${guide.top}px`;line.style.width=`${guide.width}px`;}
  status.hidden=false;status.textContent=guide?'여기에 놓기 · Esc 취소':target?'편집 영역 안의 표시된 위치에 놓으세요 · Esc 취소':'이동할 내용 사이에 놓으세요 · Esc 취소';
 }
 function scroll(){
  if(!drag?.started)return;
  const bounds=scrollContainer===window?{top:0,bottom:innerHeight}:scrollContainer.getBoundingClientRect();
  const top=Math.max(0,bounds.top),bottom=Math.min(innerHeight,bounds.bottom),margin=Math.min(64,Math.max(0,(bottom-top)/2));
  const delta=drag.y<top+margin?-Math.ceil((top+margin-drag.y)/4):drag.y>bottom-margin?Math.ceil((drag.y-bottom+margin)/4):0;
  if(delta&&bottom>top)scrollContainer.scrollBy(0,delta);
  paint();frame=requestAnimationFrame(scroll);
 }
 function down(event){
  const button=event.target.closest('[data-move-handle]');if(!button||event.button!==0||drag)return;
  event.preventDefault();
  try{beforeDrag();}catch(error){status.hidden=false;status.textContent=error.message;return;}
  drag={revision:getRevision(),path:button.dataset.moveHandle,id:event.pointerId,button,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,started:false,modifiers:modifiers(event)};
  handle.dataset.pointerFocus='true';button.setPointerCapture(event.pointerId);button.focus();
 }
 function move(event){
  if(!drag||event.pointerId!==drag.id)return;
  drag.x=event.clientX;drag.y=event.clientY;
  if(!drag.started&&Math.hypot(drag.x-drag.startX,drag.y-drag.startY)<5)return;
  if(!drag.started){markSelection(null);drag.started=true;entries().find(e=>e.dataset.movePath===drag.path)?.classList.add('manual-move-source');layer.dataset.dragging='true';frame=requestAnimationFrame(scroll);}
  event.preventDefault();paint();
 }
 function finish(commit,notifyIdle=true){
  if(!drag)return;const current=drag,guide=commit&&current.started?guideGeometry(current.target,current.x,current.y):null;drag=null;cancelAnimationFrame(frame);
  if(current.button.hasPointerCapture(current.id))current.button.releasePointerCapture(current.id);
  if(current.started)entries().forEach(element=>{if(element.classList.contains('manual-move-source'))element.classList.remove('manual-move-source');});delete layer.dataset.dragging;line.hidden=true;status.hidden=true;
  if(commit&&!current.started){if(current.modifiers.shiftKey&&onRangeSelect){markSelection(null);onRangeSelect(current.path,current.modifiers,controlAnchor(handle));}else if(onMenu)openMenu(current.path,current.modifiers);else selectElement(current.path);}
  if(commit&&current.started&&guide)onMove(current.path,current.target.path,current.target.gap,current.revision);
  if(commit&&current.started&&!guide){status.hidden=false;status.textContent=current.target?'표시된 위치에 놓지 않아 이동하지 않았습니다.':'이동할 내용 사이에 놓지 않아 이동하지 않았습니다.';}
  activePath=current.path;if(notifyIdle){onIdle();refresh();}
 }
 function up(event){if(drag&&event.pointerId===drag.id){if(drag.started){if(Number.isFinite(event.clientX))drag.x=event.clientX;if(Number.isFinite(event.clientY))drag.y=event.clientY;paint();}finish(true);}}
 function cancel(event){if(drag&&event?.pointerId!==undefined&&event.pointerId!==drag.id)return;finish(false);}
 function key(event){
  delete handle.dataset.pointerFocus;
  if(event.key==='Escape'&&drag){event.preventDefault();event.stopImmediatePropagation();finish(false);return;}
  const button=event.target.closest('[data-move-handle]');if(!button)return;
  if(event.isComposing||event.keyCode===229)return;
  if(onMenu&&(event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey)){event.preventDefault();event.stopPropagation();openMenu(button.dataset.moveHandle,modifiers(event));return;}
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();markSelection(null);onEdit(button.dataset.moveHandle);return;}
  if(event.key==='Enter'){event.preventDefault();event.stopPropagation();if(selectedPath===button.dataset.moveHandle){markSelection(null);onEdit(button.dataset.moveHandle);}else selectElement(button.dataset.moveHandle);return;}
  if(event.key==='Delete'||event.key==='Backspace'){
   event.preventDefault();event.stopPropagation();
   if(event.repeat||event.isComposing||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||drag||selectedPath!==button.dataset.moveHandle)return;
   try{beforeDrag();}catch(error){status.hidden=false;status.textContent=error.message;return;}
   onDelete(selectedPath,getRevision());return;
  }
  if(!event.altKey||!['ArrowUp','ArrowDown'].includes(event.key))return;
  event.preventDefault();try{beforeDrag();}catch{return;}
  const path=button.dataset.moveHandle,index=Number(path.split('/').at(-1));onMove(path,path.slice(0,path.lastIndexOf('/')),index+(event.key==='ArrowUp'?-1:2),getRevision());
 }

 function click(event){
  const add=event.target.closest('[data-move-insert]');
  if(add&&onInsert){try{beforeDrag();onInsert(add.dataset.moveInsert,controlAnchor(insert),modifiers(event));}catch(error){status.hidden=false;status.textContent=error.message;}return;}
  if(event.detail===0&&event.target.closest('[data-move-handle]')){if(onMenu)openMenu(handle.dataset.moveHandle,modifiers(event));else selectElement(handle.dataset.moveHandle);}
 }
 const events={click,pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,lostpointercapture:cancel,keydown:key};
 for(const [name,handler]of Object.entries(events))layer.addEventListener(name,handler);
 function keyboard(){delete handle.dataset.pointerFocus;}
 document.addEventListener('keydown',keyboard);
 function outside(event){if(!layer.contains(event.target)){markSelection(null);if(event.pointerType==='touch'){const element=event.target.closest?.('[data-move-path]');if(element)show(element.dataset.movePath);}}}
 document.addEventListener('pointerdown',outside);
 document.addEventListener('pointermove',hover);document.addEventListener('focusin',focus);
 window.addEventListener('blur',cancel);window.addEventListener('scroll',refresh);window.addEventListener('resize',refresh);
 if(scrollContainer!==window)scrollContainer.addEventListener('scroll',refresh);
 return {refresh,show,select:selectElement,isDragging:()=>!!drag,dispose(){finish(false,false);for(const [name,handler]of Object.entries(events))layer.removeEventListener(name,handler);window.removeEventListener('blur',cancel);window.removeEventListener('scroll',refresh);window.removeEventListener('resize',refresh);if(scrollContainer!==window)scrollContainer.removeEventListener('scroll',refresh);document.removeEventListener('keydown',keyboard);document.removeEventListener('pointerdown',outside);document.removeEventListener('pointermove',hover);document.removeEventListener('focusin',focus);layer.remove();}};
}
