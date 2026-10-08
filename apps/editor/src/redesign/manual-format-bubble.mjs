import {positionBlockCommandMenu} from './block-command-catalog.mjs';

function intersection(a,b){
 const left=Math.max(a.left,b.left),top=Math.max(a.top,b.top),right=Math.min(a.right,b.right),bottom=Math.min(a.bottom,b.bottom);
 return right>left&&bottom>top?{left,top,right,bottom,width:right-left,height:bottom-top}:null;
}

export function getManualWritingBounds(viewport,main){
 return intersection(main,{left:viewport.left,top:viewport.top,right:viewport.left+viewport.width,bottom:viewport.top+viewport.height});
}
export function positionManualFormatBubble(rects,size,viewport,main){
 // A text toolbar must fit in the writing area without clipping its buttons.
 const clip=getManualWritingBounds(viewport,main);
 if(!clip||!size.width||!size.height||size.width>clip.width-16)return null;
 const visible=rects.map(rect=>rect.width&&rect.height?intersection(rect,clip):null).find(Boolean);
 if(!visible)return null;
 const position=positionBlockCommandMenu({left:(visible.left+visible.right-size.width)/2,top:visible.top,bottom:visible.bottom},{
  placement:'above',width:size.width,height:size.height,viewportWidth:clip.width,viewportHeight:clip.height,viewportLeft:clip.left,viewportTop:clip.top,
 });
 return position.maxHeight>=size.height?{left:position.left,top:position.top}:null;
}

export function installManualFormatBubbleUpdates({surface,isCurrent,update}){
 let active=true,frame=null;
 const viewport=surface.visualViewport;
 const refresh=()=>{
  if(!active||frame!==null)return;
  frame=surface.requestAnimationFrame(()=>{frame=null;if(active&&isCurrent())update();});
 };
 surface.addEventListener('resize',refresh);
 viewport?.addEventListener('resize',refresh);viewport?.addEventListener('scroll',refresh);
 return {refresh,dispose(){
  active=false;
  surface.removeEventListener('resize',refresh);
  viewport?.removeEventListener('resize',refresh);viewport?.removeEventListener('scroll',refresh);
  if(frame!==null)surface.cancelAnimationFrame(frame);
  frame=null;
 }};
}
