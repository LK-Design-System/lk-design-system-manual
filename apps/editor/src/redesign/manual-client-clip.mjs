// Overlay controls belong to the scroll container's client area. Borders and
// native scrollbars are outside that area, even when CSS transforms scale it.
export function getManualClientClip(element,viewport){
 if(!element||element.isConnected===false||typeof element.getBoundingClientRect!=='function')return null;
 let rect;try{rect=element.getBoundingClientRect();}catch{return null;}
 const {offsetWidth,offsetHeight,clientLeft,clientTop,clientWidth,clientHeight}=element;
 if(!rect||![rect.left,rect.right,rect.top,rect.bottom,offsetWidth,offsetHeight,clientLeft,clientTop,clientWidth,clientHeight,viewport?.left,viewport?.top,viewport?.width,viewport?.height].every(Number.isFinite)||offsetWidth<=0||offsetHeight<=0||clientWidth<=0||clientHeight<=0||clientLeft<0||clientTop<0||viewport.width<=0||viewport.height<=0)return null;
 const sx=(rect.right-rect.left)/offsetWidth,sy=(rect.bottom-rect.top)/offsetHeight;
 if(sx<=0||sy<=0)return null;
 const left=rect.left+clientLeft*sx,top=rect.top+clientTop*sy;
 const clip={left:Math.max(left,viewport.left),right:Math.min(left+clientWidth*sx,rect.right,viewport.left+viewport.width),top:Math.max(top,viewport.top),bottom:Math.min(top+clientHeight*sy,rect.bottom,viewport.top+viewport.height)};
 return clip.right>clip.left&&clip.bottom>clip.top?clip:null;
}
