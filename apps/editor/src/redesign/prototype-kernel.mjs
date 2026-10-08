import {Schema} from '@tiptap/pm/model';
import {EditorState,Selection,AllSelection,TextSelection} from '@tiptap/pm/state';
import {EditorView} from '@tiptap/pm/view';
import {baseKeymap,chainCommands,setBlockType,toggleMark,selectAll} from '@tiptap/pm/commands';
import {keymap} from '@tiptap/pm/keymap';
import {history,undo,redo} from '@tiptap/pm/history';
import {bulletList,orderedList,listItem,wrapInList,splitListItem,liftListItem,sinkListItem} from '@tiptap/pm/schema-list';

// Stage 1 only: this JSON is an in-memory PM fixture, NOT the v2 file contract.
export function isPrototypeLinkSafe(href){
 if(typeof href!=='string'||!href.trim()||/[\u0000-\u0020\u007f]/.test(href))return false;
 if(href.startsWith('#'))return true;
 try{return ['https:','http:','mailto:'].includes(new URL(href).protocol);}catch{return false;}
}
function validLink(value){if(!isPrototypeLinkSafe(value))throw new RangeError('링크는 http, https, mailto 또는 문서 내 #주소를 사용하세요.');}
function validLevel(value){if(![1,2,3].includes(value))throw new RangeError('지원하는 제목 단계는 1–3입니다.');}
function validOrder(value){if(!Number.isInteger(value)||value<1)throw new RangeError('목록 시작 번호는 양의 정수여야 합니다.');}
export const prototypeSchema=new Schema({
 nodes:{
  doc:{content:'block+'},
  paragraph:{content:'inline*',group:'block',parseDOM:[{tag:'p'}],toDOM:()=>['p',0]},
  heading:{attrs:{level:{default:3,validate:validLevel}},content:'inline*',group:'block',defining:true,
   parseDOM:[1,2,3].map(level=>({tag:`h${level}`,attrs:{level}})),toDOM:node=>[`h${node.attrs.level}`,0]},
  text:{group:'inline'},
  hardBreak:{inline:true,group:'inline',selectable:false,parseDOM:[{tag:'br'}],toDOM:()=>['br']},
  bulletList:{...bulletList,content:'listItem+',group:'block'},
  orderedList:{...orderedList,attrs:{order:{default:1,validate:validOrder}},content:'listItem+',group:'block',
   parseDOM:[{tag:'ol',getAttrs:dom=>{const order=Number(dom.getAttribute('start')||1);return {order:Number.isInteger(order)&&order>0?order:1};}}]},
  listItem:{...listItem,content:'paragraph block*'},
 },
 marks:{
  strong:{parseDOM:[{tag:'strong'},{tag:'b',getAttrs:dom=>dom.style.fontWeight==='normal'?false:null},{style:'font-weight',getAttrs:value=>/^(bold(er)?|[5-9]00)$/.test(value)?null:false}],toDOM:()=>['strong',0]},
  emphasis:{parseDOM:[{tag:'em'},{tag:'i'},{style:'font-style=italic'}],toDOM:()=>['em',0]},
  link:{attrs:{href:{validate:validLink}},inclusive:false,
   parseDOM:[{tag:'a[href]',getAttrs:dom=>isPrototypeLinkSafe(dom.getAttribute('href'))?{href:dom.getAttribute('href')}:false}],
   toDOM:mark=>['a',{href:mark.attrs.href,rel:'noopener noreferrer'},0]},
  code:{code:true,excludes:'_',parseDOM:[{tag:'code'}],toDOM:()=>['code',0]},
 },
});
const guard=command=>(state,dispatch,view)=>view?.composing?false:command(state,dispatch,view);
// Whole-document selection of one list has the same block operations as its items.
const blockGuard=command=>guard((state,dispatch,view)=>{
 const only=state.doc.firstChild;
 if(!(state.selection instanceof AllSelection)||state.doc.childCount!==1||!['bulletList','orderedList'].includes(only.type.name))return command(state,dispatch,view);
 const start=Selection.findFrom(state.doc.resolve(0),1,true);
 const end=Selection.findFrom(state.doc.resolve(state.doc.content.size),-1,true);
 if(!start||!end)return false;
 const normalized=state.apply(state.tr.setSelection(TextSelection.create(state.doc,start.from,end.to)));
 return command(normalized,dispatch?tr=>{
  const combined=state.tr;
  for(const step of tr.steps)combined.step(step);
  combined.setSelection(new AllSelection(combined.doc));
  dispatch(combined.scrollIntoView());
 }:undefined,view);
});
// Changing the toolbar's block kind exits a single, non-nested list first.
// Plan on a detached state; only the combined transaction enters live history.
function textBlock(type,attrs){
 return blockGuard((state,dispatch,view)=>{
  const lists=position=>{const result=[];for(let d=1;d<=position.depth;d++)if(['bulletList','orderedList'].includes(position.node(d).type.name))result.push(position.before(d));return result;};
  const from=lists(state.selection.$from),to=lists(state.selection.$to);
  if(!from.length&&!to.length){
   let containsList=false;state.doc.nodesBetween(state.selection.from,state.selection.to,node=>{if(['bulletList','orderedList'].includes(node.type.name))containsList=true;});
   return containsList?false:setBlockType(type,attrs)(state,dispatch,view);
  }
  if(from.length!==1||to.length!==1||from[0]!==to[0])return false;
  let nested=false;
  state.doc.nodesBetween(state.selection.from,state.selection.to,(node,pos)=>{
   if(['bulletList','orderedList'].includes(node.type.name)&&pos!==from[0])nested=true;
   if(node.type===prototypeSchema.nodes.listItem){
    node.descendants(child=>{if(['bulletList','orderedList'].includes(child.type.name))nested=true;});
    return false;
   }
  });
  if(nested)return false;
  let working=state;
  const combined=state.tr;
  const collect=tr=>{for(const step of tr.steps)combined.step(step);working=working.apply(tr);};
  if(!liftListItem(prototypeSchema.nodes.listItem)(working,collect))return false;
  setBlockType(type,attrs)(working,collect);
  if(dispatch){
   combined.setSelection(Selection.fromJSON(combined.doc,working.selection.toJSON()));
   combined.setStoredMarks(working.storedMarks);
   dispatch(combined.scrollIntoView());
  }
  return true;
 });
}
export const setHeading=level=>{validLevel(level);return textBlock(prototypeSchema.nodes.heading,{level});};
export function setLink(href){
 if(href!==null)validLink(href);
 return guard((state,dispatch)=>{
  const {from,to,empty,$from}=state.selection,mark=prototypeSchema.marks.link;
  if(empty){
   if(!$from.parent.isTextblock)return false;
   if(dispatch)dispatch(href===null?state.tr.removeStoredMark(mark):state.tr.addStoredMark(mark.create({href})));
  }else{
   let allowed=false;state.doc.nodesBetween(from,to,node=>{if(node.isTextblock&&node.type.allowsMarkType(mark))allowed=true;});
   if(!allowed)return false;
   if(dispatch){let tr=state.tr.removeMark(from,to,mark);if(href!==null)tr=tr.addMark(from,to,mark.create({href}));dispatch(tr.scrollIntoView());}
  }
  return true;
 });
}
function toggleList(type){
 return blockGuard((state,dispatch,view)=>{
  const {$from,$to}=state.selection;
  for(let depth=$from.depth;depth>0;depth--){
   const node=$from.node(depth);
   if(!['bulletList','orderedList'].includes(node.type.name))continue;
   // A selection across independent containers must use normal wrap semantics.
   if($to.pos>$from.end(depth))break;
   if(node.type===type)return liftListItem(prototypeSchema.nodes.listItem)(state,dispatch,view);
   if(dispatch)dispatch(state.tr.setNodeMarkup($from.before(depth),type).scrollIntoView());
   return true;
  }
  return wrapInList(type)(state,dispatch,view);
 });
}
const hardBreak=guard((state,dispatch)=>{
 const {$from,$to}=state.selection;
 if(!$from.parent.isTextblock||!$to.parent.isTextblock)return false;
 if(dispatch)dispatch(state.tr.replaceSelectionWith(prototypeSchema.nodes.hardBreak.create()).scrollIntoView());
 return true;
});
export const prototypeCommands=Object.freeze({
 paragraph:textBlock(prototypeSchema.nodes.paragraph),heading:setHeading(3),
 bulletList:toggleList(prototypeSchema.nodes.bulletList),orderedList:toggleList(prototypeSchema.nodes.orderedList),
 strong:guard(toggleMark(prototypeSchema.marks.strong)),emphasis:guard(toggleMark(prototypeSchema.marks.emphasis)),code:guard(toggleMark(prototypeSchema.marks.code)),
 undo:guard(undo),redo:guard(redo),hardBreak,
 enter:guard(chainCommands(splitListItem(prototypeSchema.nodes.listItem),baseKeymap.Enter)),
 backspace:guard(baseKeymap.Backspace),deleteForward:guard(baseKeymap.Delete),selectAll:guard(selectAll),
 indentList:guard(sinkListItem(prototypeSchema.nodes.listItem)),outdentList:guard(liftListItem(prototypeSchema.nodes.listItem)),
});
export function createPrototypeState({doc}={}){
 const parsed=doc===undefined?prototypeSchema.topNodeType.createAndFill():prototypeSchema.nodeFromJSON(doc);
 if(parsed.type!==prototypeSchema.nodes.doc)throw new RangeError('프로토타입 입력은 doc 노드여야 합니다.');
 parsed.check();
 return EditorState.create({schema:prototypeSchema,doc:parsed,plugins:[
  history(),
  keymap({
   'Mod-z':prototypeCommands.undo,'Mod-Shift-z':prototypeCommands.redo,'Mod-y':prototypeCommands.redo,
   'Mod-b':prototypeCommands.strong,'Mod-i':prototypeCommands.emphasis,'Mod-`':prototypeCommands.code,
   Enter:prototypeCommands.enter,'Shift-Enter':hardBreak,'Mod-Enter':hardBreak,
   'Mod-Shift-7':prototypeCommands.orderedList,'Mod-Shift-8':prototypeCommands.bulletList,
   'Mod-[':prototypeCommands.outdentList,'Mod-]':prototypeCommands.indentList,
  }),keymap(baseKeymap),
 ]});
}
/** Returns the only editable view. onChange(state,view) observes every transaction,
 * including selection. Call view.destroy() on unmount. No storage or host requests. */
export function createPrototypeView(element,{doc,onChange}={}){
 const view=new EditorView(element,{
  state:createPrototypeState({doc}),
  attributes:{class:'manual-prototype-content',role:'textbox','aria-label':'입력 기반 시험 문서','aria-multiline':'true'},
  dispatchTransaction(transaction){
   const next=this.state.applyTransaction(transaction);this.updateState(next.state);onChange?.(next.state,this);
  },
  handleClick(_view,_pos,event){
   if(event.target.closest?.('a[href]')){event.preventDefault();return true;}return false;
  },
 });
 return view;
}
