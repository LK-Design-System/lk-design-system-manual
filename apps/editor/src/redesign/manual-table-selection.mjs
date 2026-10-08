import {Plugin,PluginKey,Selection,TextSelection} from '@tiptap/pm/state';
import {CellSelection,TableMap} from '@tiptap/pm/tables';
import {Decoration,DecorationSet} from '@tiptap/pm/view';
import {closeHistory} from '@tiptap/pm/history';

const key=new PluginKey('manual-table-selection');
const modes=new Set(['rectangle','row','column']);
const blockedTarget='button,input,textarea,select,a,[role="menu"],[role="toolbar"],[role="separator"],[contenteditable="false"],[data-manual-table-resize],[data-resize-handle],[data-manual-resize-handle],.column-resize-handle,.manual-move-handle';
function cellById(doc,id){
 let found=null;doc.descendants((node,pos)=>{if(node.type.name==='tableCell'&&node.attrs.id===id)found=doc.resolve(pos);});return found;
}
function sameTable(a,b){return a&&b&&a.parent===b.parent?true:!!a&&!!b&&a.node(-1)===b.node(-1);}
function parts(doc,anchorId,headId,mode){
 const a=cellById(doc,anchorId),b=cellById(doc,headId);
 if(!sameTable(a,b)||!modes.has(mode))return null;
 try{
  TableMap.get(a.node(-1));
  const selection=mode==='row'?CellSelection.rowSelection(a,b):mode==='column'?CellSelection.colSelection(a,b):new CellSelection(a,b);
  return [selection.$anchorCell,selection.$headCell];
 }catch{return null;}
}
function fallback(doc,pos){return Selection.near(doc.resolve(Math.max(0,Math.min(doc.content.size,pos))));}
function bookmark(anchorId,headId,mode,pos){return {map:mapping=>bookmark(anchorId,headId,mode,mapping.map(pos)),resolve(doc){try{return new ManualTableCellSelection(doc,anchorId,headId,{mode});}catch{return fallback(doc,pos);}}};}

// The public CellSelection owns rectangular geometry and ranges. Stable cell IDs
// additionally restore history after a whole table moves to another page.
export class ManualTableCellSelection extends CellSelection{
 constructor(doc,anchorId,headId=anchorId,{mode='rectangle'}={}){
  const range=parts(doc,anchorId,headId,mode);if(!range)throw new RangeError('The table cell range is unavailable.');
  super(...range);this.manualTableCellSelection=true;this.mode=mode;
  this.anchorCellId=this.$anchorCell.nodeAfter.attrs.id;this.headCellId=this.$headCell.nodeAfter.attrs.id;
 }
 get ids(){const ids=[];this.forEachCell(node=>ids.push(node.attrs.id));return ids;}
 eq(other){return other instanceof ManualTableCellSelection&&other.mode===this.mode&&super.eq(other);}
 map(doc,mapping){try{return new ManualTableCellSelection(doc,this.anchorCellId,this.headCellId,{mode:this.mode});}catch{return fallback(doc,mapping.map(this.head));}}
 getBookmark(){return bookmark(this.anchorCellId,this.headCellId,this.mode,this.head);}
 toJSON(){return {type:'manual-table-cells',anchorCellId:this.anchorCellId,headCellId:this.headCellId,mode:this.mode};}
 static fromJSON(doc,json){return new ManualTableCellSelection(doc,json.anchorCellId,json.headCellId,{mode:json.mode});}
}
Selection.jsonID('manual-table-cells',ManualTableCellSelection);
const editable=view=>!view?.composing&&view?.editable!==false;
export const selectManualTableCells=(anchorCellId,headCellId=anchorCellId,{mode='rectangle',revision}={})=>(state,dispatch,view)=>{
 if(!editable(view)||revision&&revision!==state.doc)return false;
 let selection;try{selection=new ManualTableCellSelection(state.doc,anchorCellId,headCellId,{mode});}catch{return false;}
 if(dispatch)dispatch(state.tr.setSelection(selection).setMeta('pointer',true).scrollIntoView());return true;
};
export const selectManualTableRow=(id,options={})=>selectManualTableCells(id,id,{...options,mode:'row'});
export const selectManualTableColumn=(id,options={})=>selectManualTableCells(id,id,{...options,mode:'column'});
export const clearManualTableCells=(state,dispatch,view)=>{
 if(!editable(view)||!(state.selection instanceof ManualTableCellSelection))return false;
 if(dispatch){
  const tr=closeHistory(state.tr);const ranges=[...state.selection.ranges].sort((a,b)=>b.$from.pos-a.$from.pos);
  for(const range of ranges)if(range.$to.pos>range.$from.pos)tr.delete(range.$from.pos,range.$to.pos);
  if(tr.docChanged){tr.setSelection(state.selection.map(tr.doc,tr.mapping)).setStoredMarks(state.storedMarks);dispatch(tr.scrollIntoView());}
 }return true;
};
export const replaceManualTableCellText=text=>(state,dispatch,view)=>{
 if(!editable(view)||typeof text!=='string'||!(state.selection instanceof ManualTableCellSelection))return false;
 if(dispatch){
  const tr=closeHistory(state.tr),ranges=[...state.selection.ranges].sort((a,b)=>b.$from.pos-a.$from.pos);
  for(const range of ranges)if(range.$to.pos>range.$from.pos)tr.delete(range.$from.pos,range.$to.pos);
  const anchor=cellById(tr.doc,state.selection.anchorCellId),at=anchor.pos+1;
  if(text)tr.insert(at,state.schema.text(text,state.storedMarks||state.selection.$anchorCell.nodeAfter.firstChild?.marks||[]));
  tr.setSelection(TextSelection.create(tr.doc,at+text.length)).setStoredMarks(state.storedMarks);dispatch(tr.scrollIntoView());
 }return true;
};
function targetCell(view,event){
 const target=event.target?.nodeType===3?event.target.parentElement:event.target;
 if(!target||target.closest?.(blockedTarget))return null;
 const cell=target.closest?.('td[data-manual-id],th[data-manual-id]');
 if(!cell||!view.dom.contains(cell))return null;
 return cellById(view.state.doc,cell.dataset.manualId);
}
/** Flat-cell selection only: no table repair, resizing, header conversion or
 * clipboard HTML engine. Cell text uses the public rectangular slice as TSV.
 * The caller supplies current modal/menu/drag guards. */
export function manualTableSelectionPlugin({isEnabled=()=>true,isGestureBlocked=()=>false}={}){
 let drag=null;
 const enabled=(view,event)=>editable(view)&&view.dom.isConnected!==false&&isEnabled(view)&&(!event||!event.defaultPrevented&&!event.isComposing&&event.keyCode!==229&&!isGestureBlocked(view,event));
 const stop=()=>{if(!drag)return;const old=drag;drag=null;for(const [name,handler]of old.listeners)old.root.removeEventListener(name,handler);old.surface?.removeEventListener('blur',stop);};
 const valid=()=>drag&&enabled(drag.view)&&drag.view.state.doc===drag.revision;
 function down(view,event){
  stop();if(!enabled(view,event)||event.button!==0||event.ctrlKey||event.metaKey||event.altKey)return false;
  const start=targetCell(view,event);if(!start)return false;
  const selection=view.state.selection,anchor=event.shiftKey&&selection instanceof ManualTableCellSelection?cellById(view.state.doc,selection.anchorCellId):event.shiftKey?cellById(view.state.doc,selection.$anchor.parent.attrs.id):start;
  if(!sameTable(anchor,start))return false;
  const update=cell=>selectManualTableCells(anchor.nodeAfter.attrs.id,cell.nodeAfter.attrs.id,{revision:view.state.doc})(view.state,view.dispatch,view);
  if(event.shiftKey&&anchor.pos!==start.pos){update(start);event.preventDefault();}
  const move=next=>{
   if(!valid()){stop();return;}
   const cell=targetCell(view,next);if(!cell||!sameTable(anchor,cell)||!event.shiftKey&&cell.pos===start.pos&&!drag.started)return;
   if(next.ctrlKey||next.metaKey||next.altKey||next.isComposing){stop();return;}
   if(isGestureBlocked(view,next)||next.defaultPrevented)return;
   drag.started=true;update(cell);next.preventDefault();
  };
  const up=()=>stop(),root=view.root,surface=view.dom.ownerDocument?.defaultView;
  drag={view,event,revision:view.state.doc,started:event.shiftKey&&anchor.pos!==start.pos,root,surface,listeners:[['mousemove',move],['mouseup',up],['dragstart',up],['pointercancel',up],['keydown',next=>{if(next.key==='Escape'){stop();}}]]};
  for(const [name,handler]of drag.listeners)root.addEventListener(name,handler);surface?.addEventListener('blur',stop);
  return !!drag.started;
 }
 return new Plugin({key,props:{
  clipboardTextSerializer(slice,view){
   if(!(view?.state.selection instanceof ManualTableCellSelection)||!slice?.content.childCount)return null;
   // CellSelection uses a table wrapper for a whole table and row fragments
   // for partial rectangles; both are the same single-table public slice.
   const fragment=slice.content.childCount===1&&slice.content.firstChild.type.name==='table'?slice.content.firstChild.content:slice.content;
   let valid=true;fragment.forEach(row=>{if(row.type.name!=='tableRow')valid=false;});if(!valid)return null;
   const rows=[];
   fragment.forEach(row=>{const cells=[];row.forEach(cell=>{const text=cell.textBetween(0,cell.content.size,'',leaf=>leaf.type.name==='hardBreak'?'\n':'');cells.push(/[\t\r\n"]/.test(text)?'"'+text.replaceAll('"','""')+'"':text);});rows.push(cells.join('\t'));});
   return rows.join('\n');
  },
  handleDOMEvents:{mousedown:down,compositionstart(){stop();return false;},beforeinput(view,event){if(!enabled(view,event)||!(view.state.selection instanceof ManualTableCellSelection))return false;
   if(['deleteContentBackward','deleteContentForward','deleteByCut'].includes(event.inputType)){event.preventDefault();return clearManualTableCells(view.state,view.dispatch,view);}return false;
  }},
  handleKeyDown(view,event){if(!enabled(view,event)||!(view.state.selection instanceof ManualTableCellSelection))return false;
   if(['Backspace','Delete'].includes(event.key)){event.preventDefault();return clearManualTableCells(view.state,view.dispatch,view);}
   if(event.key==='Escape'){stop();const cell=cellById(view.state.doc,view.state.selection.anchorCellId);view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,cell.pos+1)));event.preventDefault();return true;}return false;
  },
  handleTextInput(view,_from,_to,text){return enabled(view)&&replaceManualTableCellText(text)(view.state,view.dispatch,view);},
  createSelectionBetween(view){return drag?.view===view&&drag.started&&valid()?view.state.selection:null;},
  decorations(state){
   if(!(state.selection instanceof ManualTableCellSelection))return null;
   const selection=state.selection,table=selection.$anchorCell.node(-1),map=TableMap.get(table),start=selection.$anchorCell.start(-1),corners=[
    ['data-manual-table-corner-top-left',map.map[0]],['data-manual-table-corner-top-right',map.map[map.width-1]],
    ['data-manual-table-corner-bottom-left',map.map[(map.height-1)*map.width]],['data-manual-table-corner-bottom-right',map.map.at(-1)],
   ],cells=[];
   selection.forEachCell((node,pos)=>cells.push(Decoration.node(pos,pos+node.nodeSize,{'class':'manual-table-cell-selected',...Object.fromEntries(corners.filter(([,offset])=>offset===pos-start).map(([name])=>[name,'true']))})));
   return DecorationSet.create(state.doc,cells);
  }
 },filterTransaction(tr,state){
  if(!tr.docChanged||!tr.getMeta('manualPagination')||!(state.selection instanceof ManualTableCellSelection))return true;
  // Reject a flow step that would turn a rectangle into a cross-table text range.
  const cells=state.selection.ids.map(id=>cellById(tr.doc,id));return cells.every(cell=>sameTable(cells[0],cell));
 },view(view){return {update(){if(drag?.view===view&&!valid())stop();},destroy:stop};}});
}
