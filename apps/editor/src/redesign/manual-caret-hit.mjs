const validRect=rect=>rect&&[rect.left,rect.top,rect.right,rect.bottom].every(Number.isFinite)&&rect.right>rect.left&&rect.bottom>rect.top;
const inside=(point,rect)=>point.x>=rect.left&&point.x<rect.right&&point.y>=rect.top&&point.y<rect.bottom;

// Client-pixel geometry only. The caller supplies visible frames from this page
// and excludes controls, menus, modifiers and active drags through target/blocked.
export function getManualOutsideCalloutTarget({point,page,target,callouts=[],blocked=false}={}){
 if(blocked||!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.y<0||
  !page?.id||!validRect(page.rect)||!validRect(page.contentRect)||
  !(target?.isPageBackground||target?.isContentBackground)||!inside(point,page.rect)||
  point.x<page.contentRect.left||point.y<page.contentRect.top||point.y>=page.contentRect.bottom)return null;
 const frames=callouts.filter(frame=>frame.visible!==false&&validRect(frame.rect));
 // The colored frame's padding still belongs to the callout, including ancestors.
 if(frames.some(frame=>inside(point,frame.rect)))return null;
 let nearest=null;
 for(const frame of frames){
  // Page background does not become whitespace in a nested callout's parent.
  if(!frame.id||frame.parentId!==page.id||point.x<=frame.rect.right||point.y<frame.rect.top||point.y>=frame.rect.bottom)continue;
  if(!nearest||frame.rect.right>nearest.rect.right)nearest=frame;
 }
 return nearest?.id||null;
}
