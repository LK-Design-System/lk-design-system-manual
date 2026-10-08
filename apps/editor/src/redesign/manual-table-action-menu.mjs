import {positionBlockCommandMenu} from './block-command-catalog.mjs';

export function getManualTableActionMenuItems(mode,availability=()=>({enabled:false,reason:'표 작업을 사용할 수 없습니다.'})){
 if(!['row','column'].includes(mode))return [];
 const row=mode==='row';
 return [
  {id:'insert-before',label:row?'위에 행 삽입':'왼쪽에 열 삽입',icon:row?'arrow-up':'arrow-left'},
  {id:'insert-after',label:row?'아래에 행 삽입':'오른쪽에 열 삽입',icon:row?'arrow-down':'arrow-right'},
  {id:'duplicate',label:row?'행 복제':'열 복제',icon:'copy'},
  {id:'clear',label:row?'행 내용 비우기':'열 내용 비우기',icon:'minus'},
  {id:'delete',label:row?'행 삭제':'열 삭제',icon:'trash',danger:true},
 ].flatMap(item=>{let result;try{result=availability(item.id);}catch{result={enabled:false,reason:'대상을 확인할 수 없습니다.'};}if(result?.hidden===true)return [];return [{...item,disabled:result?.enabled!==true,reason:result?.enabled===true?'':result?.reason||'현재 사용할 수 없습니다.'}];});
}
export function positionManualTableActionMenu(anchor,viewport,items){
 const height=items&&items.length!==5?14+items.length*36+(items.some(item=>item.id==='delete')?9:0):206;
 return positionBlockCommandMenu(anchor,{width:216,height,viewportWidth:viewport.width,viewportHeight:viewport.height,viewportLeft:viewport.left,viewportTop:viewport.top,placementBounds:viewport,minimumWidth:80,minimumHeight:42});
}
export function isManualTableMenuTargetCurrent(target,{editor,generation,enabled=true}={}){
 return !!target&&enabled&&editor===target.editor&&editor?.editable!==false&&!editor?.composing&&editor.state?.doc===target.revision&&generation===target.generation;
}
export const manualTableActionItemId=(menuId,action)=>`${menuId}-action-${encodeURIComponent(action)}`;
export function nextManualTableActionIndex(items,index,key){
 if(!items.length)return -1;
 if(key==='Home')return 0;if(key==='End')return items.length-1;
 const direction=key==='ArrowUp'?-1:1;
 if(index<0||index>=items.length)return direction>0?0:items.length-1;
 return (index+direction+items.length)%items.length;
}
