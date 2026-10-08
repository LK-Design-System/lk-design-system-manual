import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection,NodeSelection} from '@tiptap/pm/state';
import {undo,redo} from '@tiptap/pm/history';
import {createEmptyManualDocument,newManualId} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {deleteEmptyManualBlockAtStart as command} from '../src/redesign/manual-empty-block-commands.mjs';
import {MANUAL_PAGINATION_OWNER} from '../src/redesign/manual-pagination-meta.mjs';

const p=(content=[])=>({type:'paragraph',id:newManualId(),content,extensions:{opaque:{keep:[1,2]}}});
const quote=(blocks=[p()])=>({type:'quote',id:newManualId(),blocks,extensions:{source:{keep:'frame'}}});
function harness(blocks,{cover=false}={}){
 const document=createEmptyManualDocument();document.pages[0].title=[{type:'text',text:'Page'}];document.pages[0].blocks=blocks;
 document.pages.push({id:newManualId(),title:[{type:'text',text:'Other'}],blocks:[p([{type:'text',text:'Keep',marks:[{type:'strong'}]}])]});
 if(cover){document.cover={id:newManualId(),title:[],metadata:[],blocks};document.pages[0].blocks=[];}
 let state=createManualState({document}),count=0;
 const dispatch=tr=>{state=state.applyTransaction(tr).state;count++;};
 return {get state(){return state;},get count(){return count;},get document(){return documentFromState(state);},dispatch,select(id,offset=0){const found=findManualObject(state,id);dispatch(state.tr.setSelection(TextSelection.create(state.doc,found.pos+1+offset)));},run:(fn=command,view)=>fn(state,dispatch,view)};
}
for(const cover of [false,true])test(`empty quote becomes editable body in ${cover?'cover':'page'}, with exact single undo/redo`,()=>{
 const block=quote(),h=harness([p([{type:'text',text:'Before',marks:[{type:'underline'}]}]),block,p([{type:'text',text:'After'}])],{cover});h.select(block.blocks[0].id);
 const before=h.state,original=h.document,count=h.count;
 assert.equal(command(before),true);assert.equal(h.state,before);assert.equal(h.run(),true);assert.equal(h.count,count+1);
 const after=h.state,result=h.document,container=cover?result.cover:result.pages[0],source=cover?original.cover:original.pages[0];
 assert.equal(container.blocks[1].type,'paragraph');assert.equal(container.blocks[1].id,block.blocks[0].id);
 assert.deepEqual(container.blocks[1].extensions.opaque,block.blocks[0].extensions.opaque);
 assert.deepEqual(container.blocks[1].extensions.convertedManualBlock,{extensions:block.extensions,id:block.id,type:'quote'});
 assert.deepEqual(container.blocks[0],source.blocks[0]);assert.deepEqual(container.blocks[2],source.blocks[2]);assert.deepEqual(result.pages[1],original.pages[1]);
 assert.equal(after.selection.$from.parent.attrs.id,block.blocks[0].id);assert.equal(after.selection.$from.parentOffset,0);
 assert.equal(h.run(undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
 assert.equal(h.run(redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));
 h.dispatch(h.state.tr.insertText('Continue'));assert.equal((cover?h.document.cover:h.document.pages[0]).blocks[1].content[0].text,'Continue');
});
for(const [label,blocks] of [['text',[p([{type:'text',text:'Keep'}])]],['whitespace',[p([{type:'text',text:' '}])]],['hard break',[p([{type:'hardBreak'}])]],['multiple empty bodies',[p(),p()]],['later content',[p(),p([{type:'text',text:'Keep'}])]]])test(`preserves quote with ${label}`,()=>{
 const block=quote(blocks),h=harness([block]);h.select(block.blocks[0].id);const before=h.state;assert.equal(h.run(),false);assert.equal(h.state,before);
});
test('nested callout child and ordinary empty body cannot delete a wrapper',()=>{
 const block=quote(),callout={type:'callout',id:newManualId(),tone:'signal',title:[],blocks:[block]},body=p(),h=harness([callout,body]);
 for(const id of [block.blocks[0].id,body.id]){h.select(id);const before=h.state;assert.equal(h.run(),false);assert.equal(h.state,before);}
});
test('cell selection cannot affect a quote or another page',()=>{
 const cell={id:newManualId(),content:[]},h=harness([quote(),{type:'table',id:newManualId(),label:'',headers:[cell],rows:[]}]);h.select(cell.id);const before=h.state;assert.equal(h.run(),false);assert.equal(h.state,before);
});
test('node and text range selections are left to their existing commands',()=>{
 const block=quote(),h=harness([block]);const found=findManualObject(h.state,block.id);h.dispatch(h.state.tr.setSelection(NodeSelection.create(h.state.doc,found.pos)));assert.equal(h.run(),false);
 const rich=quote([p([{type:'text',text:'ABC'}])]),range=harness([rich]),ppos=findManualObject(range.state,rich.blocks[0].id).pos;
 range.dispatch(range.state.tr.setSelection(TextSelection.create(range.state.doc,ppos+1,ppos+2)));assert.equal(range.run(),false);
});
for(const view of [{composing:true},{editable:false}])test(`guards ${JSON.stringify(view)}`,()=>{
 const block=quote(),h=harness([block]);h.select(block.blocks[0].id);const before=h.state;assert.equal(h.run(command,view),false);assert.equal(h.state,before);
});
test('stored marks and existing provenance survive without key overwrite',()=>{
 const block=quote();block.blocks[0].extensions.convertedManualBlock={original:true};const h=harness([block]);h.select(block.blocks[0].id);h.dispatch(h.state.tr.setStoredMarks([h.state.schema.marks.emphasis.create()]));h.run();
 assert.equal(h.state.storedMarks[0].type.name,'emphasis');assert.deepEqual(h.document.pages[0].blocks[0].extensions.convertedManualBlock,{original:true});assert.equal(h.document.pages[0].blocks[0].extensions.convertedManualBlock2.id,block.id);
});
test('one undo restores the frame without undoing the preceding typing',()=>{
 const previous=p(),block=quote(),h=harness([previous,block]);h.select(previous.id);h.dispatch(h.state.tr.insertText('Recent typing'));h.select(block.blocks[0].id);
 const before=h.state;assert.equal(h.run(),true);assert.equal(h.run(undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
});
test('the actual editor Backspace command reaches empty quote escape',()=>{
 const block=quote(),h=harness([block]);h.select(block.blocks[0].id);const before=h.state;
 assert.equal(h.run(manualCommands.backspace),true);assert.equal(h.document.pages[0].blocks[0].type,'paragraph');
 assert.equal(h.state.selection.$from.parent.attrs.id,block.blocks[0].id);assert.equal(h.state.selection.$from.parentOffset,0);
 assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
});
test('editor Backspace key binding dispatches one empty quote transaction',()=>{
 const block=quote(),h=harness([block]);h.select(block.blocks[0].id);const count=h.count;
 // The public plugin chain receives an EditorView with a connected DOM surface.
 const view={get state(){return h.state;},dispatch:h.dispatch,dom:{isConnected:true,ownerDocument:{defaultView:new EventTarget()}},props:{},composing:false,editable:true,endOfTextblock:()=>true};
 const event={key:'Backspace',keyCode:8,shiftKey:false,altKey:false,ctrlKey:false,metaKey:false};
 assert.equal(h.state.plugins.some(plugin=>plugin.props.handleKeyDown?.(view,event)),true);
 assert.equal(h.count,count+1);assert.equal(h.document.pages[0].blocks[0].type,'paragraph');
});
for(const mode of ['tail','head','body'])test(`empty ${mode} fragment cannot orphan its logical quote`,()=>{
 const block=quote(),marker=rootBlockId=>({owner:MANUAL_PAGINATION_OWNER,version:1,kind:'block',rootBlockId,sourceType:'quote'});
 if(mode==='tail')block.extensions.flow=marker('root-quote');
 if(mode==='body')block.blocks[0].extensions.flow=marker('root-body');
 const h=harness([block]);
 if(mode==='head'){
  const d=h.document;const tail=quote([p([{type:'text',text:'Logical content',marks:[{type:'strong'}]}])]);tail.extensions.flow=marker(block.id);d.pages[1].blocks=[tail];
  const state=createManualState({document:d}),found=findManualObject(state,block.blocks[0].id),selected=state.apply(state.tr.setSelection(TextSelection.create(state.doc,found.pos+1)));
  let count=0;assert.equal(command(selected,()=>count++),false);assert.equal(count,0);assert.deepEqual(documentFromState(selected),d);return;
 }
 h.select(block.blocks[0].id);const before=h.state;assert.equal(h.run(),false);assert.equal(h.state,before);
});
test('opaque pagination-looking fields do not disable the empty quote escape',()=>{
 const block=quote();block.extensions.flow={owner:'vendor',version:1,kind:'block',rootBlockId:block.id,sourceType:'quote'};
 const h=harness([block]);h.select(block.blocks[0].id);assert.equal(h.run(),true);assert.deepEqual(h.document.pages[0].blocks[0].extensions.convertedManualBlock.extensions,block.extensions);
});
for(const parent of ['coverBody','coverSectionFrame'])test(`actual cover alias ${parent} allows empty quote escape without touching header or other pages`,()=>{
 const block=quote(),h=harness([block],{cover:true});
 if(parent==='coverSectionFrame'){
  const found=findManualObject(h.state,block.id);let framePos;
  h.state.doc.descendants((node,pos)=>{if(node.type.name==='coverSectionFrame')framePos=pos;});
  const tr=h.state.tr.delete(found.pos,found.pos+found.node.nodeSize);tr.insert(framePos+1,found.node);h.dispatch(tr);
 }
 h.select(block.blocks[0].id);assert.equal(h.state.selection.$from.node(h.state.selection.$from.depth-2).type.name,parent);
 const before=h.state,original=h.document;assert.equal(h.run(manualCommands.backspace),true);const after=h.state,result=h.document;
 assert.equal(result.cover.blocks[0].type,'paragraph');assert.equal(result.cover.blocks[0].id,block.blocks[0].id);assert.deepEqual(result.cover.title,original.cover.title);assert.deepEqual(result.cover.metadata,original.cover.metadata);assert.deepEqual(result.pages,original.pages);
 assert.equal(h.state.selection.$from.parent.attrs.id,block.blocks[0].id);assert.equal(h.state.selection.$from.parentOffset,0);
 assert.equal(h.run(undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.run(redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));
});
