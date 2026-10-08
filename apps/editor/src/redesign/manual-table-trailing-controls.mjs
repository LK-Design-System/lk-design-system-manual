export function manualTableTrailingDelta(distance,unit,{threshold=5,maxDelta=40,dragged=false}={}){
 if(!Number.isFinite(distance)||!Number.isFinite(unit)||unit<=0)return null;
 if(Math.abs(distance)<threshold)return dragged?0:1;
 return Math.sign(distance)*Math.min(maxDelta,Math.max(1,Math.round(Math.abs(distance)/unit)));
}
export function positionManualTableTrailingControls(table,clip,reserved=[]){
 const valid=r=>r&&['left','right','top','bottom'].every(k=>Number.isFinite(r[k]))&&r.right>r.left&&r.bottom>r.top;
 if(!valid(table)||!valid(clip))return [];
 const candidates=[{mode:'row',left:table.left,right:table.right,top:table.bottom+2,bottom:table.bottom+14},{mode:'column',left:table.right+2,right:table.right+14,top:table.top,bottom:table.bottom}];
 return candidates.filter(r=>r.left>=clip.left&&r.right<=clip.right&&r.top>=clip.top&&r.bottom<=clip.bottom&&!reserved.filter(valid).some(b=>r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top)).map(r=>({...r,width:r.right-r.left,height:r.bottom-r.top}));
}
export function canCommitManualTableTrailingPreview(session,{editor,generation,enabled,previewShown=false}={}){
 return !!session&&enabled===true&&editor===session.target.editor&&editor?.editable!==false&&!editor?.composing&&editor?.state.doc===session.target.revision&&generation===session.target.generation&&session.description?.enabled===true&&session.delta!==0&&(!session.description.needsConfirmation||previewShown);
}
// Describe against the established own session, including stationary pointer
// releases and keyboard clicks that will not produce a later pointer move.
export function startManualTableTrailingPreview(session,{onStart,describe,onReject}){
 if(!session?.target)return null;
 onStart?.({target:session.target});
 const preview=describe(session,1);
 if(preview?.description?.enabled!==true){onReject?.(preview);return null;}
 return preview;
}
export function manualTableTrailingPreviewRects(rect,mode,delta,{unit,beforeCount}={}){
 if(!rect||!Number.isFinite(delta)||!Number.isFinite(unit)||unit<=0||!Number.isInteger(beforeCount)||beforeCount<1)return [];
 const amount=Math.min(Math.abs(delta),delta<0?beforeCount-1:40);if(!amount)return [];
 return Array.from({length:amount},(_,index)=>mode==='row'?{left:rect.left,top:delta>0?rect.bottom+index*unit:rect.bottom-(index+1)*unit,width:rect.right-rect.left,height:unit}:{left:delta>0?rect.right+index*unit:rect.right-(index+1)*unit,top:rect.top,width:unit,height:rect.bottom-rect.top});
}
