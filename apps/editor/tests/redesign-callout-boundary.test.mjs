import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {createEmptyManualDocument,newManualId} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,findManualObject,manualCommands,selectManualObject} from '../src/redesign/manual-kernel.mjs';
import {editManualCalloutTitle,manualCalloutFocusKey} from '../src/redesign/manual-callout-commands.mjs';

const paragraph=(content=[])=>({type:'paragraph',id:newManualId(),content,extensions:{source:'body'}});
const callout=(options={})=>({type:'callout',id:newManualId(),title:[],tone:'cautionary',blocks:[paragraph()],extensions:{source:'callout'},...options});
function harness(blocks){
 const document=createEmptyManualDocument();document.pages[0].title=[{type:'text',text:'페이지 제목'}];document.pages[0].blocks=blocks;
 let state=createManualState({document});const dispatch=tr=>{state=state.applyTransaction(tr).state;};
 return {get state(){return state;},get document(){return documentFromState(state);},dispatch,run:(command,view)=>command(state,dispatch,view),select:pos=>dispatch(state.tr.setSelection(TextSelection.create(state.doc,pos)))};
}
function undoRedo(h,before,after){
 assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
 assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));
}
function editTitle(h,id){
 const original=h.document;
 assert.equal(h.run(editManualCalloutTitle(id)),true);
 assert.equal(h.state.selection.$from.parent.type.name,'calloutTitle');
 assert.equal(h.state.selection.$from.node(h.state.selection.$from.depth-1).attrs.id,id);
 assert.equal(h.state.selection.$from.parentOffset,0);
 assert.equal(manualCalloutFocusKey.getState(h.state).editingId,id);
 assert.deepEqual(h.document,original);
}

test('Backspace removes the only empty callout and leaves editable page body, with one exact undo and redo',()=>{
 const empty=callout(),h=harness([empty]);editTitle(h,empty.id);const before=h.state,original=h.document;
 assert.equal(h.run(manualCommands.backspace),true);
 const after=h.state,result=h.document;
 assert.deepEqual(result.pages.map(page=>page.id),original.pages.map(page=>page.id));assert.deepEqual(result.pages[0].title,original.pages[0].title);
 assert.equal(result.pages[0].blocks.length,1);assert.equal(result.pages[0].blocks[0].type,'paragraph');assert.deepEqual(result.pages[0].blocks[0].content,[]);
 assert.equal(findManualObject(h.state,empty.id),null);assert.equal(h.state.selection.$from.parent.attrs.id,result.pages[0].blocks[0].id);assert.equal(h.state.selection.$from.parentOffset,0);
 undoRedo(h,before,after);
 h.dispatch(h.state.tr.insertText('계속 입력'));assert.equal(h.document.pages[0].blocks[0].content[0].text,'계속 입력');
});

test('Backspace returns to the preceding rich paragraph without removing its content or grouping the previous edit into undo',()=>{
 const previous=paragraph([{type:'text',text:'기존 본문',marks:[{type:'strong'},{type:'underline'}]}]),empty=callout(),h=harness([previous,empty]);
 h.run(selectManualObject(previous.id));h.dispatch(h.state.tr.insertText('최근 입력 '));editTitle(h,empty.id);const before=h.state,original=h.document;
 assert.equal(h.run(manualCommands.backspace),true);
 const after=h.state;assert.deepEqual(h.document.pages[0].blocks,[original.pages[0].blocks[0]]);
 const found=findManualObject(h.state,previous.id);assert.equal(h.state.selection.$from.parent.attrs.id,previous.id);assert.equal(h.state.selection.from,found.pos+found.node.nodeSize-1);
 undoRedo(h,before,after);
});

for(const [label,options]of [
 ['title text',{title:[{type:'text',text:'안내 내용'}]}],
 ['body text',{blocks:[paragraph([{type:'text',text:'보존할 본문',marks:[{type:'emphasis'}]}])]}],
 ['body whitespace',{blocks:[paragraph([{type:'text',text:' '}])]}],
 ['nested image',{blocks:[{type:'figure',id:newManualId(),asset:'assets/keep.png',alt:'보존할 이미지',caption:[],widthPreset:'full'}]}],
 ['nested structure',{blocks:[callout()]}],
])test(`Backspace at an empty title boundary preserves a callout with ${label}`,()=>{
 const block=callout(options),h=harness([block]);editTitle(h,block.id);const before=h.state;
 assert.equal(h.run(manualCommands.backspace),false);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
});

test('Backspace at another field or title offset keeps the callout wrapper',()=>{
 for(const bodyField of [false,true]){
  const block=callout(bodyField?{}:{title:[{type:'text',text:'제목'}]}),h=harness([block]);
  if(bodyField)h.run(selectManualObject(block.blocks[0].id));else{h.run(selectManualObject(block.id));h.select(h.state.selection.from+1);}
  h.run(manualCommands.backspace);assert.equal(h.document.pages[0].blocks[0].type,'callout');assert.equal(h.document.pages[0].blocks[0].id,block.id);
 }
});

test('Backspace deletes a selected title character through the existing range command without removing the wrapper or body',()=>{
 const block=callout({title:[{type:'text',text:'ABC'}],blocks:[paragraph([{type:'text',text:'본문'}])]}),h=harness([block]);h.run(selectManualObject(block.id));const pos=h.state.selection.from;
 h.dispatch(h.state.tr.setSelection(TextSelection.create(h.state.doc,pos+1,pos+2)));const before=h.state;
 assert.equal(h.run(manualCommands.backspace),true);const after=h.state;
 assert.equal(h.document.pages[0].blocks[0].id,block.id);assert.deepEqual(h.document.pages[0].blocks[0].title,[{type:'text',text:'AC'}]);assert.deepEqual(h.document.pages[0].blocks[0].blocks,block.blocks);
 undoRedo(h,before,after);
});

test('Backspace during composition leaves the empty callout and selection unchanged',()=>{
 const block=callout(),h=harness([block]);editTitle(h,block.id);const before=h.state;
 assert.equal(h.run(manualCommands.backspace,{composing:true}),false);assert.equal(h.state,before);
});

test('actual Backspace key binding removes a bodyless explicit-title callout in one transaction and restores title permission on Undo',()=>{
 const block=callout({blocks:[]}),h=harness([block]);editTitle(h,block.id);const before=h.state;
 let count=0;const view={get state(){return h.state;},dispatch:tr=>{count++;h.dispatch(tr);},dom:{isConnected:true},props:{},composing:false,editable:true,endOfTextblock:()=>true};
 assert.equal(h.state.plugins.some(plugin=>plugin.props.handleKeyDown?.(view,{key:'Backspace',keyCode:8,shiftKey:false,altKey:false,ctrlKey:false,metaKey:false})),true);
 assert.equal(count,1);assert.equal(h.document.pages[0].blocks[0].type,'paragraph');const after=h.state;
 undoRedo(h,before,after);
 assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.selection.eq(before.selection));
 assert.equal(manualCalloutFocusKey.getState(h.state).editingId,block.id);
 assert.equal(manualCalloutFocusKey.get(h.state).props.decorations(h.state).find()[0].type.attrs.class,'manual-callout-title-editing');
 // The history permission does not enable ordinary later focus on an empty title.
 h.run(selectManualObject(findManualObject(h.state,h.document.pages[0].id).node.firstChild.attrs.id));
 h.run(selectManualObject(block.id));assert.equal(h.state.selection.$from.parent.type.name,'paragraph');assert.equal(manualCalloutFocusKey.getState(h.state).editingId,null);
});
