import {getManualBrandAssetByKey} from './manual-brand-assets.mjs';
const positive=value=>Number.isFinite(value)&&value>0;
export const getManualFigureMinimumWidth=(asset,mediaInsetXPx=0)=>{
 const brand=getManualBrandAssetByKey(asset);
 return brand?brand.minimumWidthPx+mediaInsetXPx:32;
};
/** Stored widths are media border-box CSS pixels; artwork occupies the content box. */
export function getManualFigureResizeLimits({widthPx,heightPx,maxWidthPx,maxHeightPx,context,minWidthPx,mediaInsetXPx=0,mediaInsetYPx=0}){
 minWidthPx=minWidthPx===undefined?getManualFigureMinimumWidth(context?.asset,mediaInsetXPx):Math.max(minWidthPx,getManualFigureMinimumWidth(context?.asset,mediaInsetXPx));
 if(![widthPx,heightPx,maxWidthPx,maxHeightPx,minWidthPx].every(positive)||![mediaInsetXPx,mediaInsetYPx].every(value=>Number.isFinite(value)&&value>=0))return null;
 const contentWidth=widthPx-mediaInsetXPx,contentHeight=heightPx-mediaInsetYPx;
 if(!positive(contentWidth)||!positive(contentHeight))return null;
 const ratio=contentWidth/contentHeight,maximum=Math.min(maxWidthPx,(maxHeightPx-mediaInsetYPx)*ratio+mediaInsetXPx);
 return {minWidthPx,maxWidthPx:maximum,ratio,mediaInsetXPx,mediaInsetYPx,fits:maximum>=minWidthPx};
}
/** Preserve measured artwork aspect ratio, including the media surface's fixed inset. */
export function clampManualFigureResize(target){
 const {widthPx,scale,deltaX=0,deltaY=0}=target,limits=getManualFigureResizeLimits(target);
 if(!limits?.fits||!positive(scale)||!Number.isFinite(deltaX)||!Number.isFinite(deltaY))return null;
 const {ratio,minWidthPx,maxWidthPx,mediaInsetXPx,mediaInsetYPx}=limits;
 const horizontal=deltaX/scale,vertical=deltaY/scale*ratio,delta=Math.abs(horizontal)>=Math.abs(vertical)?horizontal:vertical;
 const width=Math.max(minWidthPx,Math.min(maxWidthPx,widthPx+delta));return {widthPx:width,heightPx:(width-mediaInsetXPx)/ratio+mediaInsetYPx};
}
/** Computed width retains subpixel precision lost by integer offsetWidth. */
export function getManualFigureResizeScale(element,getComputedStyle=window.getComputedStyle.bind(window)){
 const style=getComputedStyle(element),px=value=>parseFloat(value)||0,width=px(style.width);
 const extra=style.boxSizing==='border-box'?0:px(style.paddingLeft)+px(style.paddingRight)+px(style.borderLeftWidth)+px(style.borderRightWidth);
 const logicalWidth=width>0?width+extra:element.offsetWidth;
 return element.getBoundingClientRect().width/logicalWidth;
}
/** DOM bounds shared by pointer and numeric width controls; values are unscaled CSS pixels. */
export function getManualFigureResizeBounds({element,media,content,page,scale,alignment='center',getComputedStyle=window.getComputedStyle.bind(window)}){
 const parent=element.parentElement,parentRect=parent.getBoundingClientRect(),contentRect=content.getBoundingClientRect(),mediaRect=media.getBoundingClientRect(),figureRect=element.getBoundingClientRect(),pageRect=page.getBoundingClientRect();
 const parentStyle=getComputedStyle(parent),contentStyle=getComputedStyle(content),style=getComputedStyle(element),pageStyle=getComputedStyle(page),mediaStyle=getComputedStyle(media),px=value=>parseFloat(value)||0;
 const mediaInsetXPx=px(mediaStyle.paddingLeft)+px(mediaStyle.paddingRight)+px(mediaStyle.borderLeftWidth)+px(mediaStyle.borderRightWidth),mediaInsetYPx=px(mediaStyle.paddingTop)+px(mediaStyle.paddingBottom)+px(mediaStyle.borderTopWidth)+px(mediaStyle.borderBottomWidth);
 // Automatic alignment margins are free space, not fixed gutters. Subtracting
 // their computed pixel values would prevent a centered image growing again.
 const normalizedAlignment=['left','center','right'].includes(alignment)?alignment:'center';
 const padding=px(parentStyle.paddingLeft)+px(parentStyle.paddingRight),margins=(normalizedAlignment==='left'?px(style.marginLeft):0)+(normalizedAlignment==='right'?px(style.marginRight):0),contentWidth=contentRect.width/scale-px(contentStyle.paddingLeft)-px(contentStyle.paddingRight);
 const firstTrack=parent.dataset?.manualNode==='mediaGroup'&&parent.dataset.layout==='sideBySide'?parentStyle.gridTemplateColumns?.match(/^([\d.]+)px(?:\s|$)/):null;
 const parentWidth=Math.min(parentRect.width/scale-padding,firstTrack?Number(firstTrack[1]):Infinity);
 const reserveValue=pageStyle.getPropertyValue?.('--manual-footer-reserve')?.trim()||'',length=reserveValue.match(/^([\d.]+)(px|mm|cm|in|pt)$/),units={px:1,mm:96/25.4,cm:96/2.54,in:96,pt:96/72};
 const footerReserve=length?Number(length[1])*units[length[2]]:px(pageStyle.paddingBottom);
 const paperBottom=pageRect.bottom-Math.max(px(pageStyle.paddingBottom),footerReserve)*scale;
 const contentBottom=page.dataset.manualNode==='cover'?paperBottom:Math.min(paperBottom,contentRect.bottom-px(contentStyle.paddingBottom)*scale);
 const captionReserve=Math.max(0,figureRect.bottom-mediaRect.bottom)/scale+px(style.marginBottom);
 // Cover content fills the sheet through min-height, even when its authored
 // blocks end much earlier. Reserve occupied flow, not that empty fill area.
 const occupiedBottom=node=>{
  const rect=node.getBoundingClientRect(),computed=getComputedStyle(node);
  if(computed.display==='none')return -Infinity;
  let bottom=rect.bottom;
  if(['coverBody','coverSectionFrame'].includes(node.dataset?.manualNode)){
   bottom=Math.max(rect.top+(px(computed.borderTopWidth)+px(computed.paddingTop))*scale,...Array.from(node.children||[],occupiedBottom))+(px(computed.paddingBottom)+px(computed.borderBottomWidth))*scale;
  }
  return bottom+px(computed.marginBottom)*scale;
 };
 const coverOccupiedBottom=page.dataset.manualNode==='cover'&&content.children?Math.max(contentRect.top+px(contentStyle.paddingTop)*scale,...Array.from(content.children,occupiedBottom))+px(contentStyle.paddingBottom)*scale:contentRect.bottom;
 const ownHeightCap=(contentBottom-mediaRect.top)/scale-captionReserve;
 const followingContentCap=page.dataset.manualNode==='cover'?mediaRect.height/scale+(paperBottom-coverOccupiedBottom)/scale:Infinity;
 return {maxWidthPx:Math.min(parentWidth-margins,contentWidth-margins),maxHeightPx:Math.min(ownHeightCap,followingContentCap),mediaInsetXPx,mediaInsetYPx};
}
/** DOM-only preview; the parent owns the single persisted transaction. */
export function installManualFigureResize({element,getTarget,isEnabled,isCurrent,onStart=()=>{},onPreview=()=>{},onCommit=()=>{},onEnd=()=>{},surface=element.ownerDocument.defaultView}={}){
 if(!element||typeof getTarget!=='function'||typeof isCurrent!=='function')throw new TypeError('Figure target and current-session guards are required.');
 const document=element.ownerDocument;let alive=true,session=null;
 const valid=value=>alive&&isEnabled?.()===true&&value.handle.isConnected!==false&&isCurrent(value.target);
 function restore(value){
  if(value.target.canRestore?.()===false)return;
  if(value.target.element.style.width===value.appliedWidth)value.target.element.style.cssText=value.figureStyle;
  if(value.target.media.isConnected!==false)value.target.media.style.cssText=value.mediaStyle;
 }
 function finish(commit,reason){
  const value=session;if(!value)return false;const current=valid(value);session=null;
  restore(value);try{value.handle.releasePointerCapture?.(value.pointerId);}catch{}onPreview(null);
  try{if(commit&&current&&value.changed){onCommit({figureId:value.target.figureId,widthPx:value.payload.widthPx,context:value.target.context});return true;}return false;}finally{onEnd({reason:current?reason:'stale'});}
 }
 function begin(event){
  if(!alive||session||isEnabled?.()!==true||event.button!==0||event.isPrimary===false||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return false;
  const handle=event.target.closest?.('[data-manual-figure-resize]');if(!handle||!element.contains(handle))return false;
  let target;try{target=getTarget(event,handle);}catch{return false;}
  if(!target||typeof target.figureId!=='string'||!target.element?.style||!target.media?.style||!isCurrent(target)||!clampManualFigureResize(target))return false;
  session={target,handle,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,figureStyle:target.element.style.cssText,mediaStyle:target.media.style.cssText,appliedWidth:null,payload:null,changed:false};
  event.preventDefault();event.stopPropagation();try{handle.setPointerCapture?.(event.pointerId);}catch{}onStart(target);return true;
 }
 function move(event){
  const value=session;if(!value||event.pointerId!==value.pointerId)return;
  if(!valid(value)){finish(false,'stale');return;}
  if(!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
  const deltaX=event.clientX-value.startX,deltaY=event.clientY-value.startY;if(!value.changed&&Math.hypot(deltaX,deltaY)<2)return;
  let bounds=value.target.getBounds?.()||value.target,payload=clampManualFigureResize({...value.target,...bounds,deltaX,deltaY});if(!payload){finish(false,'bounds');return;}
  // Re-measure caption reserve after wrapping at the narrower preview width.
  for(let pass=0;pass<8;pass++){
   value.appliedWidth=`${payload.widthPx}px`;value.target.element.style.width=value.appliedWidth;value.target.element.style.maxWidth='100%';value.target.media.style.width='100%';value.target.media.style.height='auto';
   bounds=value.target.getBounds?.()||value.target;const next=clampManualFigureResize({...value.target,...bounds,deltaX,deltaY});if(!next){finish(false,'bounds');return;}if(next.widthPx>=payload.widthPx-.01)break;payload=next;
  }
  value.appliedWidth=`${payload.widthPx}px`;value.target.element.style.width=value.appliedWidth;
  const final=clampManualFigureResize({...value.target,...(value.target.getBounds?.()||value.target),deltaX,deltaY});
  if(!final||final.widthPx<payload.widthPx-.01){finish(false,'bounds');return;}
  value.payload=payload;value.changed=Math.abs(payload.widthPx-value.target.widthPx)>.01;event.preventDefault();event.stopPropagation();onPreview({figureId:value.target.figureId,...payload});
 }
 function up(event){if(!session||event.pointerId!==session.pointerId)return;move(event);finish(true,'pointerup');}
 const cancelPointer=event=>{if(session&&event.pointerId===session.pointerId)finish(false,event.type||'pointercancel');};
 const key=event=>{if(session&&event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(false,'escape');}};
 const cancel=()=>finish(false,'geometry');
 element.addEventListener('pointerdown',begin,true);document.addEventListener('pointermove',move,{capture:true,passive:false});document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',cancelPointer,true);document.addEventListener('lostpointercapture',cancelPointer,true);document.addEventListener('keydown',key,true);document.addEventListener('scroll',cancel,true);surface.addEventListener('resize',cancel);surface.addEventListener('blur',cancel);
 return {begin,isResizing:()=>!!session,cancel:()=>finish(false,'cancel'),refresh(){if(session&&!valid(session))finish(false,'stale');},dispose(){if(!alive)return;finish(false,'dispose');alive=false;element.removeEventListener('pointerdown',begin,true);document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',cancelPointer,true);document.removeEventListener('lostpointercapture',cancelPointer,true);document.removeEventListener('keydown',key,true);document.removeEventListener('scroll',cancel,true);surface.removeEventListener('resize',cancel);surface.removeEventListener('blur',cancel);}};
}
