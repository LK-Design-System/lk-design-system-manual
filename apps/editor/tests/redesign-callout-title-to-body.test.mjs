import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {createEmptyManualDocument,newManualId} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {editManualCalloutTitle,manualCalloutFocusKey,moveManualCalloutTitleToBody} from '../src/redesign/manual-callout-commands.mjs';

const paragraph=(text='Body')=>({type:'paragraph',id:newManualId(),content:[{type:'text',text}],extensions:{vendor:{keep:true}}});
const rich=[{type:'text',text:'Rich ',marks:[{type:'strong'},{type:'underline'}]},{type:'hardBreak'},{type:'text',text:'title',marks:[{type:'emphasis'}]}];
const callout=(blocks=[paragraph()],title=rich)=>({type:'callout',id:newManualId(),tone:'cautionary',title,blocks,extensions:{opaque:{keep:[1,2]}}});
function harness(block){
 const document=createEmptyManualDocument();document.pages[0].blocks=[paragraph('Outside'),block];let state=createManualState({document}),count=0;
 const dispatch=tr=>{state=state.applyTransaction(tr).state;count++;};
 return {get state(){return state;},get document(){return documentFromState(state);},get count(){return count;},dispatch,run:(command,view)=>command(state,dispatch,view)};
}
for(const [label,body]of [
 ['existing body',[paragraph()]],['bodyless',[]],['atom first',[{type:'divider',id:newManualId(),extensions:{opaque:{keep:true}}}]],
 ['nested body',[callout([paragraph('Nested')],[{type:'text',text:'Nested title'}])]],
])test(`title moves losslessly before ${label}, preserving required slot and one Undo/Redo`,()=>{
 const block=callout(body),h=harness(block);h.run(editManualCalloutTitle(block.id));
 const found=findManualObject(h.state,block.id),title=found.node.firstChild;
 h.dispatch(h.state.tr.setNodeMarkup(found.pos+1,undefined,{...title.attrs,meta:{opaque:{title:true}}}));
 const before=h.state,source=h.document,original=findManualObject(before,block.id).node;
 assert.equal(moveManualCalloutTitleToBody({id:block.id,revision:before.doc})(before),true);assert.equal(h.state,before);
 const count=h.count;assert.equal(h.run(moveManualCalloutTitleToBody({id:block.id,revision:before.doc})),true);assert.equal(h.count,count+1);
 const after=h.state,result=h.document.pages[0].blocks[1],moved=findManualObject(after,block.id).node;
 assert.deepEqual(result.title,[]);assert.deepEqual(result.blocks[0].content,rich);assert.deepEqual(result.blocks.slice(1),body);
 assert.deepEqual(moved.firstChild.attrs,original.firstChild.attrs);assert.ok(moved.firstChild.marks.every((mark,i)=>mark.eq(original.firstChild.marks[i])));
 assert.deepEqual(moved.attrs,original.attrs);assert.deepEqual(result.extensions,block.extensions);assert.equal(result.tone,block.tone);
 const allIds=[];after.doc.descendants(node=>{if(node.attrs.id)allIds.push(node.attrs.id);});assert.equal(new Set(allIds).size,allIds.length);
 assert.equal(after.selection.$from.parent.attrs.id,result.blocks[0].id);assert.equal(after.selection.$from.parentOffset,0);
 assert.equal(manualCalloutFocusKey.getState(after).editingId,null);assert.deepEqual(h.document.pages[0].blocks[0],source.pages[0].blocks[0]);
 assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
 assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));
});
test('one Undo restores the title without undoing preceding typing; stored marks survive',()=>{
 const block=callout(),h=harness(block);h.run(editManualCalloutTitle(block.id));h.dispatch(h.state.tr.insertText('Recent '));
 const marks=[h.state.schema.marks.strong.create()];h.dispatch(h.state.tr.setStoredMarks(marks));const before=h.state;
 assert.equal(h.run(moveManualCalloutTitleToBody({id:block.id})),true);assert.deepEqual(h.state.storedMarks,marks);
 assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
 assert.match(h.document.pages[0].blocks[1].title[0].text,/Recent /);
});
for(const [label,options,view]of [
 ['cancelled',{cancelled:true}],['readonly option',{readOnly:true}],['stale revision',{revision:{}}],
 ['readonly view',{}, {editable:false}],['composition',{}, {composing:true}],['stale view',{}, {state:{}}],
 ['disabled host',{}, {props:{manualCalloutFocusEnabled:false}}],['dynamic disabled host',{}, {props:{manualCalloutFocusEnabled:()=>false}}],
 ['missing id',{id:'missing'}],
])test(`${label} refuses title transfer without dispatch or mutation`,()=>{
 const block=callout(),h=harness(block),before=h.state,count=h.count;
 assert.equal(h.run(moveManualCalloutTitleToBody({id:block.id,...options}),view),false);assert.equal(h.state,before);assert.equal(h.count,count);
});
for(const [label,title]of [['empty',[]],['whitespace',[{type:'text',text:' \t '}]],['hard break',[{type:'hardBreak'}]]]){
 test(`${label} title loads unchanged and transfer is a no-op`,()=>{
  const block=callout([],title),h=harness(block),before=h.state;assert.deepEqual(h.document.pages[0].blocks[1],block);
  assert.equal(h.run(moveManualCalloutTitleToBody({id:block.id})),false);assert.equal(h.state,before);assert.equal(h.count,0);
 });
}
test('explicit whitespace title range remains editable, then ordinary caret returns to existing body',()=>{
 const block=callout([paragraph()],[{type:'text',text:'   '},{type:'hardBreak'}]),h=harness(block),source=h.document;
 h.run(editManualCalloutTitle(block.id));const found=findManualObject(h.state,block.id),start=found.pos+2;
 h.dispatch(h.state.tr.setSelection(TextSelection.create(h.state.doc,start,start+2)));
 assert.equal(manualCalloutFocusKey.getState(h.state).editingId,block.id);assert.equal(h.state.selection.empty,false);
 assert.equal(manualCalloutFocusKey.get(h.state).props.decorations(h.state).find()[0].type.attrs.class,'manual-callout-title-editing');
 const outside=findManualObject(h.state,source.pages[0].blocks[0].id);h.dispatch(h.state.tr.setSelection(TextSelection.create(h.state.doc,outside.pos+1)));
 h.dispatch(h.state.tr.setSelection(TextSelection.create(h.state.doc,start)));assert.equal(h.state.selection.$from.parent.attrs.id,block.blocks[0].id);
 assert.deepEqual(h.document,source);assert.equal(h.run(manualCommands.undo),false);
});
test('ordinary nonvisible title range remains selected; composition prevents caret fallback',()=>{
 const block=callout([paragraph()],[{type:'text',text:'   '}]),h=harness(block),source=h.document,found=findManualObject(h.state,block.id),start=found.pos+2;
 h.dispatch(h.state.tr.setSelection(TextSelection.create(h.state.doc,start,start+2)));assert.equal(h.state.selection.$from.parent.type.name,'calloutTitle');assert.equal(h.state.selection.empty,false);
 const plugin=manualCalloutFocusKey.get(h.state),lease=plugin.spec.view({composing:true,editable:true});
 h.dispatch(h.state.tr.setSelection(TextSelection.create(h.state.doc,start)));assert.equal(h.state.selection.$from.parent.type.name,'calloutTitle');assert.deepEqual(h.document,source);lease.destroy();
});
