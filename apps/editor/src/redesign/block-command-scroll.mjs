export function getBlockMenuScrollTop(item,bounds,{scrollTop,scrollHeight,clientHeight,padding=4}){
 if(!item||!bounds||![item.top,item.bottom,bounds.top,bounds.bottom,scrollTop,scrollHeight,clientHeight,padding].every(Number.isFinite)||item.bottom<=item.top||bounds.bottom<=bounds.top||clientHeight<=0)return null;
 const inset=Math.min(Math.max(0,padding),(bounds.bottom-bounds.top)/2),top=bounds.top+inset,bottom=bounds.bottom-inset;
 const next=item.top<top?scrollTop+item.top-top:item.bottom>bottom?scrollTop+item.bottom-bottom:scrollTop;
 return Math.max(0,Math.min(next,Math.max(0,scrollHeight-clientHeight)));
}

// Keyboard navigation keeps the rendered selection visible until a new pointer gesture.
// A wheel scroll is free to leave the active item behind; the next key reveals it again.
export function installBlockMenuScrollKeeper({container,getActiveOption,surface}){
 let alive=true,keyboard=false,frame=null;
 const refresh=()=>{
  if(!alive)return;
  const option=getActiveOption();if(!option)return;
  const next=getBlockMenuScrollTop(option.getBoundingClientRect(),container.getBoundingClientRect(),container);
  if(next!==null&&Math.abs(next-container.scrollTop)>.5)container.scrollTop=next;
 };
 const schedule=()=>{if(!alive||frame!==null)return;frame=surface.requestAnimationFrame(()=>{frame=null;if(keyboard)refresh();});};
 const release=()=>{keyboard=false;if(frame!==null){surface.cancelAnimationFrame(frame);frame=null;}};
 const scroll=()=>{if(keyboard)schedule();};
 container.addEventListener('scroll',scroll);
 container.addEventListener('wheel',release,{passive:true});
 container.addEventListener('pointermove',release);
 container.addEventListener('pointerdown',release);
 return {refresh,navigate(){if(alive){keyboard=true;schedule();}},dispose(){alive=false;release();container.removeEventListener('scroll',scroll);container.removeEventListener('wheel',release);container.removeEventListener('pointermove',release);container.removeEventListener('pointerdown',release);}};
}
