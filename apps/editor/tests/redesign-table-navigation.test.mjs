import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {undoDepth,redoDepth,closeHistory} from '@tiptap/pm/history';
import {createManualState,documentFromState,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
const text=value=>[{type:'text',text:value}],cell=(r,c)=>({id:`cell${r}${c}`,content:r===0?text(`Header${c}`):r===1&&c===0?text('애'):[],extensions:{vendor:{r,c}}});
function fixture({after=true}={}){return {schemaVersion:2,id:'doc',title:'',pages:[{id:'page',title:[],blocks:[{id:'table',type:'table',label:'',headers:[cell(0,0),cell(0,1)],rows:[[cell(1,0),cell(1,1)],[cell(2,0),cell(2,1)]],extensions:{vendor:{keep:true}}},...(after?[{id:'after',type:'paragraph',content:text('After')}]:[])]}]};}
function h(document=fixture()){let state=createManualState({document}),transactions=[];const dispatch=tr=>{transactions.push(tr);state=state.applyTransaction(tr).state;};const view={get state(){return state;},dispatch,props:{},dom:{isConnected:true},editable:true,composing:false,endOfTextblock:()=>true};return {get state(){return state;},transactions,dispatch,view,run:(command,v=view)=>command(state,dispatch,v),select(id,offset=0){const found=findManualObject(state,id);dispatch(state.tr.setSelection(TextSelection.create(state.doc,found.pos+1+offset)));},key(){const event={key:'ArrowDown',keyCode:40,preventDefault(){}};return state.plugins.some(plugin=>plugin.props.handleKeyDown?.(view,event));}};}
function unchanged(a,before){assert.equal(a.state.doc,before.doc);assert.deepEqual(documentFromState(a.state),documentFromState(before));assert.deepEqual(a.state.storedMarks,before.storedMarks);assert.equal(undoDepth(a.state),undoDepth(before));assert.equal(redoDepth(a.state),redoDepth(before));}
for(const [source,target,offset]of [['cell00','cell10',1],['cell01','cell11',2],['cell10','cell20',1],['cell11','cell21',0]])test(`public ArrowDown ${source} -> ${target} stays in the same column without history or document change`,()=>{
 const a=h();a.select(source,offset);a.dispatch(a.state.tr.setStoredMarks([a.state.schema.marks.emphasis.create()]));const before=a.state;assert.equal(a.key(),true);assert.equal(a.state.selection.$from.parent.attrs.id,target);assert.equal(a.state.selection.$from.parentOffset,Math.min(offset,findManualObject(a.state,target).node.content.size));unchanged(a,before);assert.equal(a.transactions.at(-1).docChanged,false);
});
test('a multiline or wrapped source cell leaves native within-cell visual movement alone until its last line',()=>{
 const d=fixture();d.pages[0].blocks[0].rows[0][0].content=[...text('First'),{type:'hardBreak'},...text('Second')];const a=h(d);a.select('cell10',2);a.view.endOfTextblock=()=>false;const before=a.state;assert.equal(a.run(manualCommands.arrowDown),false);assert.equal(a.state,before);a.view.endOfTextblock=()=>true;assert.equal(a.run(manualCommands.arrowDown),true);assert.equal(a.state.selection.$from.parent.attrs.id,'cell20');unchanged(a,before);
});
test('a destination cell uses the same visual x on its first line, rejecting hits in another column',()=>{
 const d=fixture();d.pages[0].blocks[0].rows[1][0].content=text('Destination');const a=h(d);a.select('cell10',1);const target=findManualObject(a.state,'cell20');let point;a.view.coordsAtPos=()=>({left:27});a.view.nodeDOM=()=>({getBoundingClientRect:()=>({left:10,right:110,top:40,bottom:110,width:100,height:70}),ownerDocument:{defaultView:{getComputedStyle:()=>({paddingTop:'8px',lineHeight:'20px'})}}});a.view.posAtCoords=coords=>{point=coords;return {pos:target.pos+1+3};};const before=a.state;assert.equal(a.run(manualCommands.arrowDown),true);assert.equal(a.state.selection.from,target.pos+4);assert.deepEqual(point,{left:27,top:58});unchanged(a,before);
 a.select('cell10',1);a.view.posAtCoords=()=>({pos:findManualObject(a.state,'cell21').pos+1});assert.equal(a.run(manualCommands.arrowDown),true);assert.equal(a.state.selection.$from.parent.attrs.id,'cell20');assert.equal(a.state.selection.$from.parentOffset,1);
});
for(const column of [0,1])test(`last row column ${column} exits to existing text without adding a row or paragraph`,()=>{
 const a=h();a.select(`cell2${column}`);const before=a.state;assert.equal(a.key(),true);assert.equal(a.state.selection.$from.parent.attrs.id,'after');unchanged(a,before);
});
test('last table at document end consumes ArrowDown and preserves the current cell instead of adding content',()=>{
 const a=h(fixture({after:false}));a.select('cell20');const before=a.state,count=a.transactions.length;assert.equal(a.key(),true);assert.equal(a.state,before);assert.equal(a.transactions.length,count);a.select('cell21');const last=a.state;assert.equal(a.key(),true);assert.equal(a.state,last);
});
test('range, readonly, composition and dynamic host guards cannot dispatch table navigation or structural exit',()=>{
 const a=h();a.select('cell10');for(const patch of [{editable:false},{composing:true},{props:{manualTableSelectionEnabled:false}},{props:{manualTableSelectionEnabled:()=>false}}]){const before=a.state;assert.equal(a.run(manualCommands.arrowDown,{...a.view,...patch}),false);assert.equal(a.state,before);}const from=findManualObject(a.state,'cell10').pos+1,to=findManualObject(a.state,'cell11').pos+1;a.dispatch(a.state.tr.setSelection(TextSelection.create(a.state.doc,from,to)));const before=a.state;assert.equal(a.run(manualCommands.arrowDown),false);assert.equal(a.state,before);
});
test('Tab remains row-major and ArrowDown does not create an undo entry over prior typing',()=>{
 const a=h();a.select('cell10',1);a.dispatch(closeHistory(a.state.tr).insertText('X'));const typed=a.state;assert.equal(a.run(manualCommands.arrowDown),true);assert.equal(undoDepth(a.state),undoDepth(typed));assert.equal(a.run(manualCommands.undo),true);assert.equal(findManualObject(a.state,'cell10').node.textContent,'애');a.select('cell10',1);assert.equal(a.run(manualCommands.tab),true);assert.equal(a.state.selection.$from.parent.attrs.id,'cell11');
});
