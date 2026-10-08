import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {undoDepth} from '@tiptap/pm/history';
import {createManualState,documentFromState,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';

const rich=(text,type='strong')=>[{type:'text',text,marks:[{type}]}];
const p=(id,text)=>({id,type:'paragraph',content:rich(text,id==='right'?'underline':'strong'),extensions:{vendor:{id},joinedManualBlock:{existing:true}}});
function harness(key,blocks=[p('left','Left'),p('right','Right')]){
 let state=createManualState({document:{schemaVersion:2,id:'doc',title:'Synthetic',pages:[{id:'page',title:rich('Title'),blocks}]}}),count=0;
 const dispatch=tr=>{count++;state=state.applyTransaction(tr).state;};
 const view={get state(){return state;},dispatch,editable:true,composing:false,dom:{isConnected:true},props:{},endOfTextblock:direction=>direction==='backward'?state.selection.$from.parentOffset===0:state.selection.$from.parentOffset===state.selection.$from.parent.content.size};
 const select=(id,offset)=>{const at=findManualObject(state,id);dispatch(state.tr.setSelection(TextSelection.create(state.doc,at.pos+1+offset)));};
 select(key==='Backspace'?'right':'left',key==='Backspace'?0:4);
 return {get state(){return state;},get count(){return count;},dispatch,view,select,key(event={}){return state.plugins.at(-2).props.handleKeyDown(view,{key,keyCode:key==='Backspace'?8:46,shiftKey:false,altKey:false,ctrlKey:false,metaKey:false,...event});},run(command){return command(state,dispatch,view);}};
}
for(const key of ['Backspace','Delete'])test(`ordinary body ${key} joins text with opaque collision provenance, marks, caret, codec and exact one Undo/Redo`,()=>{
 const h=harness(key),left=findManualObject(h.state,'left');
 h.dispatch(h.state.tr.insertText('X',left.pos+1));h.select(key==='Backspace'?'right':'left',key==='Backspace'?0:5);
 h.dispatch(h.state.tr.setStoredMarks([h.state.schema.marks.emphasis.create()]));
 const before=h.state,count=h.count,depth=undoDepth(before),original=documentFromState(before);
 assert.equal(h.key(),true);assert.equal(h.count,count+1);
 const after=h.state,document=documentFromState(after),merged=document.pages[0].blocks[0];
 assert.equal(document.pages[0].blocks.length,1);assert.equal(merged.id,'left');
 assert.deepEqual(merged.content,[...original.pages[0].blocks[0].content,...original.pages[0].blocks[1].content]);
 assert.deepEqual(merged.extensions.vendor,{id:'left'});assert.deepEqual(merged.extensions.joinedManualBlock,{existing:true});
 assert.deepEqual(merged.extensions.joinedManualBlock2,{id:'right',type:'paragraph',extensions:original.pages[0].blocks[1].extensions});
 assert.equal(after.selection.$from.parent.attrs.id,'left');assert.equal(after.selection.$from.parentOffset,5);assert.deepEqual(after.storedMarks,before.storedMarks);
 assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document,assets:{}})).document,document);
 assert.equal(undoDepth(after),depth+1);assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
 assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));
});
for(const key of ['Backspace','Delete'])for(const flag of ['composing','readonly','interior','range'])test(`${key} ${flag} keeps body merge out of guarded or non-boundary input`,()=>{
 const h=harness(key);if(flag==='composing')h.view.composing=true;if(flag==='readonly')h.view.editable=false;
 if(flag==='interior')h.select('right',2);if(flag==='range'){h.select('right',1);h.dispatch(h.state.tr.setSelection(TextSelection.create(h.state.doc,h.state.selection.from,h.state.selection.from+1)));}
 const before=h.state;h.key();
 if(flag==='range'){assert.ok(findManualObject(h.state,'left'));assert.ok(findManualObject(h.state,'right'));}
 else assert.ok(h.state.doc.eq(before.doc));
});
for(const key of ['Backspace','Delete'])for(const type of ['figure','table'])test(`${key} does not merge bodies across a ${type}`,()=>{
 const barrier=type==='figure'?{id:'barrier',type,asset:'',alt:'',widthPreset:'full',caption:rich('Caption')}:{id:'barrier',type,label:'Table',headers:[{id:'cell',content:rich('Header')}],rows:[]};
 const h=harness(key,[p('left','Left'),barrier,p('right','Right')]),before=h.state;
 h.key();assert.ok(h.state.doc.eq(before.doc));assert.ok(findManualObject(h.state,'barrier').node.eq(findManualObject(before,'barrier').node));
});
