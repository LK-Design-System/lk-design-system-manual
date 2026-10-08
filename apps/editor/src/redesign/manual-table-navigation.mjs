import {Selection,TextSelection} from '@tiptap/pm/state';
import {TableMap} from '@tiptap/pm/tables';

function enabled(view){
 if(view?.composing||view?.editable===false)return false;
 const guard=view?.props?.manualTableSelectionEnabled;return typeof guard==='function'?guard(view)!==false:guard!==false;
}
function lastLine(state,view){
 if(typeof view?.endOfTextblock==='function')return view.endOfTextblock('down');
 const {$from}=state.selection;let lastBreak=-1;$from.parent.forEach((node,offset)=>{if(node.type.name==='hardBreak')lastBreak=offset;});return $from.parentOffset>lastBreak;
}
function targetCaret(state,view,cellPos,cell){
 const fallback=cellPos+1+Math.min(state.selection.$from.parentOffset,cell.content.size);
 if(!view?.nodeDOM||!view?.coordsAtPos||!view?.posAtCoords)return fallback;
 try{
  const element=view.nodeDOM(cellPos),rect=element?.getBoundingClientRect?.();if(!rect||rect.width<=2||rect.height<=2)return fallback;
  const source=view.coordsAtPos(state.selection.head),style=element.ownerDocument?.defaultView?.getComputedStyle?.(element),padding=parseFloat(style?.paddingTop)||0,lineHeight=parseFloat(style?.lineHeight)||(parseFloat(style?.fontSize)||14)*1.5;
  const hit=view.posAtCoords({left:Math.max(rect.left+1,Math.min(rect.right-1,source.left)),top:Math.min(rect.bottom-1,rect.top+padding+lineHeight/2)});
  return hit&&hit.pos>=cellPos+1&&hit.pos<=cellPos+1+cell.content.size&&state.doc.resolve(hit.pos).parent===cell?hit.pos:fallback;
 }catch{return fallback;}
}
/** Vertical navigation stays in its column. Tab keeps its separate row-major
 * command. No rows, paragraphs or history entries are created by ArrowDown.
 */
export function manualTableArrowDown(state,dispatch,view){
 const {selection}=state,{$from}=selection;
 if(!enabled(view)||!(selection instanceof TextSelection)||!selection.empty||$from.parent.type.name!=='tableCell'||$from.depth<2||!lastLine(state,view))return false;
 const table=$from.node($from.depth-2);if(table.type.name!=='table')return false;
 const tableStart=$from.start($from.depth-2);let target=null;
 try{
  const map=TableMap.get(table),cell=map.findCell($from.before()-tableStart);
  if(cell.bottom<map.height){const pos=tableStart+map.positionAt(cell.bottom,cell.left,table),node=state.doc.nodeAt(pos);if(node?.type.name!=='tableCell')return false;target=TextSelection.create(state.doc,targetCaret(state,view,pos,node));}
  else target=Selection.findFrom(state.doc.resolve(tableStart+table.nodeSize-1),1,true);
 }catch{return false;}
 if(dispatch&&target&&!target.eq(selection))dispatch(state.tr.setSelection(target).setStoredMarks(state.storedMarks).scrollIntoView());
 // Consume the last-row edge even when there is no following text field, so
 // the browser cannot choose the next horizontal cell as its next textblock.
 return true;
}

/** Only the outside horizontal edges leave the table. Interior cell movement
 * stays with the browser; an outside edge never inserts document content.
 */
export function manualTableArrowHorizontal(direction){
 return (state,dispatch,view)=>{
  const {selection}=state,{$from}=selection;
  if(!enabled(view)||!(selection instanceof TextSelection)||!selection.empty||$from.parent.type.name!=='tableCell'||$from.depth<2)return false;
  if($from.parentOffset!==(direction<0?0:$from.parent.content.size))return false;
  const table=$from.node($from.depth-2);if(table.type.name!=='table')return false;
  const tableStart=$from.start($from.depth-2);let target;
  try{
   const map=TableMap.get(table),edge=direction<0?map.map[0]:map.map.at(-1);
   if($from.before()-tableStart!==edge)return false;
   target=Selection.findFrom(state.doc.resolve(direction<0?tableStart-1:tableStart+table.nodeSize-1),direction,true);
  }catch{return false;}
  if(dispatch&&target&&!target.eq(selection))dispatch(state.tr.setSelection(target).setStoredMarks(state.storedMarks).scrollIntoView());
  return true;
 };
}
