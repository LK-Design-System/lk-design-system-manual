import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,TextSelection,Selection} from '@tiptap/pm/state';
import {CellSelection,TableMap} from '@tiptap/pm/tables';
import {history,undo,redo} from '@tiptap/pm/history';
import {manualSchema,createManualState,documentFromState,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {manualBlockSelectionPlugin} from '../src/redesign/manual-block-selection.mjs';
import {createEmptyManualDocument,newManualId} from '../src/redesign/manual-v2.mjs';
import {createManualPaginationTransaction} from '../src/redesign/manual-pagination.mjs';
import {ManualTableCellSelection,selectManualTableCells,selectManualTableRow,selectManualTableColumn,clearManualTableCells,replaceManualTableCellText,manualTableSelectionPlugin} from '../src/redesign/manual-table-selection.mjs';

// Use the actual kernel schema, including its additive role/span attributes.
const schema=manualSchema;
const cell=label=>({id:newManualId(),content:[{type:'text',text:label,marks:[{type:'strong'}]}],extensions:{opaque:{label}}});
function harness(options={}){
 const document=createEmptyManualDocument(),rows=Array.from({length:4},(_,r)=>Array.from({length:4},(_,c)=>cell(`${r},${c}`)));
 const table={type:'table',id:newManualId(),label:'Synthetic',headers:rows[0],rows:rows.slice(1),extensions:{vendor:{keep:true}}};document.pages[0].blocks=[table];
 document.pages.push({id:newManualId(),title:[],blocks:[{type:'paragraph',id:newManualId(),content:[{type:'text',text:'Other page'}]}]});
 const plugin=manualTableSelectionPlugin(options),doc=schema.nodeFromJSON(createManualState({document}).doc.toJSON());
 let state=EditorState.create({schema,doc,plugins:[history(),plugin]}),dispatches=0;
 const dispatch=tr=>{state=state.applyTransaction(tr).state;dispatches++;};
 return {rows,table,plugin,get state(){return state;},get count(){return dispatches;},dispatch,run:(cmd,view)=>cmd(state,dispatch,view),get document(){return documentFromState(state);}};
}
const choose=(h,from=[0,0],to=from,options={})=>h.run(selectManualTableCells(h.rows[from[0]][from[1]].id,h.rows[to[0]][to[1]].id,options));
const ids=(h,r0,c0,r1,c1)=>h.rows.slice(r0,r1+1).flatMap(row=>row.slice(c0,c1+1)).map(cell=>cell.id);
function exactUndo(h,before,after){assert.equal(h.run(undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.run(redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));}
test('public CellSelection rectangle includes only the hit cells, in either direction',()=>{
 const h=harness(),before=h.document;for(const [a,b]of [[[0,1],[2,2]],[[2,2],[0,1]]]){
  assert.equal(choose(h,a,b),true);assert.ok(h.state.selection instanceof CellSelection);assert.ok(h.state.selection instanceof ManualTableCellSelection);
  assert.deepEqual(h.state.selection.ids,ids(h,0,1,2,2));assert.equal(h.state.selection.ranges.length,6);assert.deepEqual(h.document,before);
 }assert.equal(TableMap.get(h.state.doc.firstChild.lastChild).width,4);
});
for(const [mode,command,expected]of [['row',selectManualTableRow,[2,0,2,3]],['column',selectManualTableColumn,[0,2,3,2]]])test(`${mode} selection expands to the entire physical row or column`,()=>{
 const h=harness(),before=h.document;assert.equal(h.run(command(h.rows[2][2].id)),true);assert.deepEqual(h.state.selection.ids,ids(h,...expected));assert.deepEqual(h.document,before);
});
test('invalid, stale and foreign-table targets do not mutate state; dry run stays pure',()=>{
 const h=harness(),before=h.state,command=selectManualTableCells(h.rows[0][0].id,h.rows[3][3].id);
 assert.equal(command(h.state),true);assert.equal(h.state,before);
 for(const bad of [selectManualTableCells('missing'),selectManualTableCells(h.rows[0][0].id,h.rows[0][1].id,{mode:'unknown'}),selectManualTableCells(h.rows[0][0].id,h.rows[0][1].id,{revision:{}})]){assert.equal(h.run(bad),false);assert.equal(h.state,before);}
});
for(const view of [{editable:false},{composing:true}])test(`selection and cell edit guards ${JSON.stringify(view)}`,()=>{
 const h=harness(),before=h.state;assert.equal(h.run(selectManualTableRow(h.rows[0][0].id),view),false);assert.equal(h.state,before);
 choose(h,[0,1],[2,2]);const selected=h.state;assert.equal(h.run(clearManualTableCells,view),false);assert.equal(h.run(replaceManualTableCellText('x'),view),false);assert.equal(h.state,selected);
});
test('Delete clears only selected inline content, preserves table/cell IDs/opaque fields, and has exact one undo',()=>{
 const h=harness();choose(h,[0,1],[2,2]);const before=h.state,original=h.document;
 assert.equal(h.run(clearManualTableCells),true);const after=h.state,d=h.document;
 for(let r=0;r<4;r++)for(let c=0;c<4;c++){
  const source=r?original.pages[0].blocks[0].rows[r-1][c]:original.pages[0].blocks[0].headers[c],target=r?d.pages[0].blocks[0].rows[r-1][c]:d.pages[0].blocks[0].headers[c];
  assert.deepEqual(target,{...source,content:r<=2&&c>=1&&c<=2?[]:source.content});
 }assert.deepEqual(d.pages[1],original.pages[1]);assert.equal(d.pages[0].blocks[0].id,h.table.id);assert.deepEqual(d.pages[0].blocks[0].extensions,original.pages[0].blocks[0].extensions);exactUndo(h,before,after);
});
test('typing replaces selected cells, writes once in anchor, keeps marks and one undo/redo',()=>{
 const h=harness();choose(h,[1,1],[2,2]);const before=h.state,original=h.document;
 assert.equal(h.run(replaceManualTableCellText('New')),true);const after=h.state,d=h.document;
 assert.deepEqual(d.pages[0].blocks[0].rows[0][1].content,[{type:'text',text:'New',marks:[{type:'strong'}]}]);
 for(const [r,c]of [[1,2],[2,1],[2,2]])assert.deepEqual(d.pages[0].blocks[0].rows[r-1][c].content,[]);
 assert.deepEqual(d.pages[0].blocks[0].headers,original.pages[0].blocks[0].headers);assert.equal(after.selection.$from.parent.attrs.id,h.rows[1][1].id);assert.equal(after.selection.$from.parentOffset,3);exactUndo(h,before,after);
});
test('selection JSON/bookmark restores by cell IDs after the table moves to another page',()=>{
 const h=harness();choose(h,[1,1],[3,2]);const selection=h.state.selection,b=selection.getBookmark(),table=findManualObject(h.state,h.table.id);
 const tr=h.state.tr.delete(table.pos,table.pos+table.node.nodeSize),nextPage=tr.doc.lastChild,at=tr.doc.content.size-nextPage.nodeSize+1+nextPage.firstChild.nodeSize;tr.insert(at,table.node);
 const mapped=selection.map(tr.doc,tr.mapping),restored=b.map(tr.mapping).resolve(tr.doc);assert.ok(mapped instanceof ManualTableCellSelection);assert.deepEqual(mapped.ids,selection.ids);assert.ok(restored.eq(mapped));assert.ok(Selection.fromJSON(tr.doc,mapped.toJSON()).eq(mapped));
});
test('forced A4 split spanning selected cells is rejected before state changes',()=>{
 const h=harness();choose(h,[1,1],[3,2]);const before=h.state,original=h.document;
 const tr=createManualPaginationTransaction(h.state,{status:'ready',doc:h.state.doc,revision:1,action:{type:'push',pageId:original.pages[0].id,blockId:h.table.id,split:{kind:'child',at:1}}});
 assert.ok(tr);assert.ok(tr.docChanged);h.dispatch(tr);assert.equal(h.state,before);assert.deepEqual(h.document,original);
});
test('moving a whole selected table through actual A4 flow preserves its cell range',()=>{
 const h=harness();choose(h,[1,1],[3,2]);const original=h.document,ids=h.state.selection.ids;
 const tr=createManualPaginationTransaction(h.state,{status:'ready',doc:h.state.doc,revision:1,action:{type:'push',pageId:original.pages[0].id,blockId:h.table.id}});
 assert.ok(tr);h.dispatch(tr);assert.ok(h.state.selection instanceof ManualTableCellSelection);assert.deepEqual(h.state.selection.ids,ids);assert.equal(h.document.pages[1].blocks[0].id,h.table.id);
});
test('cross-table endpoints are rejected without changing either table',()=>{
 const h=harness(),table=findManualObject(h.state,h.table.id),copy=table.node.type.create({...table.node.attrs,id:newManualId()},table.node.content);
 const json=copy.toJSON();json.content.forEach(row=>row.content.forEach(cell=>cell.attrs.id=newManualId()));const other=schema.nodeFromJSON(json),foreign=other.firstChild.firstChild.attrs.id;
 h.dispatch(h.state.tr.insert(table.pos+table.node.nodeSize,other));const before=h.state;assert.equal(h.run(selectManualTableCells(h.rows[0][0].id,foreign)),false);assert.equal(h.state,before);
});

function surface(h){
 const listeners=new Map(),root={addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name,fn){if(listeners.get(name)===fn)listeners.delete(name);}},dom={isConnected:true,contains:target=>!!target?.dataset?.manualId,ownerDocument:{defaultView:root}};
 const view={get state(){return h.state;},dispatch:h.dispatch,dom,root,props:{},editable:true,composing:false,endOfTextblock:()=>true};
 const target=(r,c,blocked=false)=>({dataset:{manualId:h.rows[r][c].id},closest(selector){return selector.startsWith('td')?this:blocked?this:null;}});
 const event=(target,extra={})=>({target,button:0,shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra});
 return {view,target,event,listeners,send:(name,event)=>listeners.get(name)?.(event)};
}
test('same-cell text drag stays native; crossing cells selects the exact rectangle',()=>{
 const h=harness(),s=surface(h),down=s.event(s.target(1,1));assert.equal(h.plugin.props.handleDOMEvents.mousedown(s.view,down),false);assert.equal(down.defaultPrevented,false);
 const before=h.state;s.send('mousemove',s.event(s.target(1,1)));assert.equal(h.state,before);
 const move=s.event(s.target(3,2));s.send('mousemove',move);assert.equal(move.defaultPrevented,true);assert.deepEqual(h.state.selection.ids,ids(h,1,1,3,2));s.send('mouseup',move);assert.equal(s.listeners.size,0);
});
test('Shift click extends from the existing cell anchor',()=>{
 const h=harness(),s=surface(h);choose(h,[0,1],[1,1]);const down=s.event(s.target(3,2),{shiftKey:true});assert.equal(h.plugin.props.handleDOMEvents.mousedown(s.view,down),true);assert.equal(down.defaultPrevented,true);assert.deepEqual(h.state.selection.ids,ids(h,0,1,3,2));s.send('mouseup',down);
});
test('readonly, composition, modifiers, resize targets and caller menu/drag guard cannot start selection',()=>{
 for(const option of ['readonly','composing','control','meta','alt','resize','disabled','gesture']){
  const h=harness({isEnabled:()=>option!=='disabled',isGestureBlocked:()=>option==='gesture'}),s=surface(h);if(option==='readonly')s.view.editable=false;if(option==='composing')s.view.composing=true;
  const down=s.event(s.target(0,0,option==='resize'),{ctrlKey:option==='control',metaKey:option==='meta',altKey:option==='alt'}),before=h.state;
  assert.equal(h.plugin.props.handleDOMEvents.mousedown(s.view,down),false);assert.equal(h.state,before);assert.equal(s.listeners.size,0);
 }
});
test('stale revision and blur cancel gesture listeners without selecting new cells',()=>{
 for(const reason of ['stale','blur']){const h=harness(),s=surface(h);h.plugin.props.handleDOMEvents.mousedown(s.view,s.event(s.target(0,0)));
  if(reason==='stale')h.dispatch(h.state.tr.insertText('Edit',findManualObject(h.state,h.rows[0][0].id).pos+1));else s.send('blur');
  const before=h.state;s.send('mousemove',s.event(s.target(3,3)));assert.equal(h.state,before);assert.equal(s.listeners.size,0);
 }
});
test('key Delete and Escape operate on cells rather than selecting or deleting the whole table',()=>{
 const h=harness(),s=surface(h);choose(h,[1,1],[2,2]);const event=s.event(s.target(1,1),{key:'Delete'});assert.equal(h.plugin.props.handleKeyDown(s.view,event),true);assert.equal(h.document.pages[0].blocks[0].type,'table');
 assert.equal(h.plugin.props.handleKeyDown(s.view,s.event(s.target(1,1),{key:'Escape'})),true);assert.ok(h.state.selection instanceof TextSelection);assert.equal(h.state.selection.$from.parent.attrs.id,h.rows[1][1].id);
});
test('decorations cover selected cell nodes only and preserve empty cell ranges',()=>{
 const h=harness();choose(h,[0,1],[1,2]);h.run(clearManualTableCells);const decorations=h.plugin.props.decorations(h.state).find();assert.equal(decorations.length,4);assert.ok(decorations.every(d=>d.type.attrs.class==='manual-table-cell-selected'));assert.ok(h.state.selection instanceof CellSelection);
});
test('composing events cannot clear a cell selection and compositionstart cancels active gesture',()=>{
 const h=harness(),s=surface(h);choose(h,[1,1],[2,2]);const before=h.state;
 assert.equal(h.plugin.props.handleKeyDown(s.view,s.event(s.target(1,1),{key:'Delete',isComposing:true})),false);
 assert.equal(h.plugin.props.handleDOMEvents.beforeinput(s.view,s.event(s.target(1,1),{inputType:'deleteContentBackward',isComposing:true})),false);assert.equal(h.state,before);
 h.plugin.props.handleDOMEvents.mousedown(s.view,s.event(s.target(1,1)));assert.ok(s.listeners.size);assert.equal(h.plugin.props.handleDOMEvents.compositionstart(s.view,{}),false);assert.equal(s.listeners.size,0);
});

function production(options={}){
 const seed=harness(),block=manualBlockSelectionPlugin();let state=createManualState({document:seed.document,plugins:[block],...options}),count=0;
 const dispatch=tr=>{state=state.applyTransaction(tr).state;count++;};
 return {rows:seed.rows,table:seed.table,block,get state(){return state;},get count(){return count;},get document(){return documentFromState(state);},dispatch,run:(fn,view)=>fn(state,dispatch,view),get plugin(){return state.plugins.find(p=>p.key.startsWith('manual-table-selection'));}};
}
const keyEvent=(s,key)=>s.event(s.target(1,1),{key,keyCode:{Backspace:8,Delete:46,Escape:27,Enter:13}[key]});
const dispatchKey=(h,s,key)=>h.state.plugins.some(p=>p.props.handleKeyDown?.(s.view,keyEvent(s,key)));
test('actual kernel creates one table plugin before input rules and block Escape handlers',()=>{
 const h=production(),plugins=h.state.plugins;assert.equal(plugins.filter(p=>p.key.startsWith('manual-table-selection')).length,1);
 assert.ok(plugins.indexOf(h.plugin)<plugins.indexOf(h.block));assert.ok(plugins.indexOf(h.plugin)<plugins.findIndex(p=>p.spec.isInputRules));
 const s=surface(h);choose(h,[1,1],[2,2]);assert.equal(dispatchKey(h,s,'Escape'),true);assert.ok(h.state.selection instanceof TextSelection);assert.equal(h.state.selection.$from.parent.attrs.id,h.rows[1][1].id);assert.equal(h.state.selection.node,undefined);
});
test('actual kernel public Backspace and Delete clear selected cells with exact undo/redo and retain table metadata',()=>{
 for(const command of [manualCommands.backspace,manualCommands.deleteForward]){
  const h=production(),s=surface(h);choose(h,[1,1],[2,2]);const before=h.state,original=h.document,count=h.count;
  assert.equal(h.run(command,s.view),true);const after=h.state;assert.equal(h.count,count+1);assert.equal(h.document.pages[0].blocks[0].id,h.table.id);
  assert.deepEqual(h.document.pages[0].blocks[0].headers,original.pages[0].blocks[0].headers);assert.deepEqual(h.document.pages[1],original.pages[1]);exactUndo(h,before,after);
 }
});
test('actual kernel dynamic host gate and readonly block public commands and consume key fallback safely',()=>{
 for(const guard of [false,()=>false,'readonly']){
  const h=production(),s=surface(h);choose(h,[1,1],[2,2]);if(guard==='readonly')s.view.editable=false;else s.view.props.manualTableSelectionEnabled=guard;
  const before=h.state;assert.equal(h.run(manualCommands.backspace,s.view),false);assert.equal(h.run(manualCommands.deleteForward,s.view),false);
  for(const key of ['Backspace','Delete','Enter']){assert.equal(dispatchKey(h,s,key),true);assert.equal(h.state,before);}
 }
});
test('actual kernel dynamic gesture gate blocks resize/menu drag and then allows clean cell selection',()=>{
 const h=production(),s=surface(h);s.view.props.manualTableSelectionGestureBlocked=()=>true;const before=h.state;
 assert.equal(h.plugin.props.handleDOMEvents.mousedown(s.view,s.event(s.target(1,1))),false);assert.equal(h.state,before);assert.equal(s.listeners.size,0);
 s.view.props.manualTableSelectionGestureBlocked=false;h.plugin.props.handleDOMEvents.mousedown(s.view,s.event(s.target(1,1)));s.send('mousemove',s.event(s.target(2,2)));assert.deepEqual(h.state.selection.ids,ids(h,1,1,2,2));s.send('mouseup',{});
});
test('actual kernel table plugin typing path clears only selected cells and has one undo',()=>{
 const h=production(),s=surface(h);choose(h,[1,1],[2,2]);const before=h.state,original=h.document,count=h.count;
 assert.equal(h.plugin.props.handleTextInput(s.view,0,0,'Inserted'),true);const after=h.state;assert.equal(h.count,count+1);
 assert.deepEqual(h.document.pages[0].blocks[0].rows[0][1].content,[{type:'text',text:'Inserted',marks:[{type:'strong'}]}]);
 assert.deepEqual(h.document.pages[0].blocks[0].headers,original.pages[0].blocks[0].headers);assert.deepEqual(h.document.pages[1],original.pages[1]);exactUndo(h,before,after);
});
test('actual kernel option seam blocks gestures without replacing its default single plugin',()=>{
 const h=production({tableSelectionOptions:{isEnabled:()=>false}}),s=surface(h),before=h.state;
 assert.equal(h.plugin.props.handleDOMEvents.mousedown(s.view,s.event(s.target(1,1))),false);assert.equal(h.state,before);assert.equal(s.listeners.size,0);
 assert.equal(h.state.plugins.filter(p=>p.key.startsWith('manual-table-selection')).length,1);
});
