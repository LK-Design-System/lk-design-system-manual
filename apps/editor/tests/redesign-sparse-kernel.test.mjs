import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,manualCommands,executeManualBlockCommand,setManualLink,findManualObject} from '../src/redesign/manual-kernel.mjs';
import {selectManualBlockIds} from '../src/redesign/manual-block-selection.mjs';
import {createManualPaginationTransaction,planManualPagination} from '../src/redesign/manual-pagination.mjs';
import {insertManualPageAfter} from '../src/redesign/manual-page-groups.mjs';

const paragraph=(id,text)=>({id,type:'paragraph',content:[{type:'text',text,marks:[{type:'strong'}]}],extensions:{opaque:{keep:id}}});
function harness(blocks=[paragraph('a','A'),paragraph('b','Untouched'),paragraph('c','C'),paragraph('d','Outside')]){
 const d=createEmptyManualDocument();d.pages[0].title=[{type:'text',text:'Title'}];d.pages[0].blocks=blocks;
 let state=createManualState({document:d});const dispatch=tr=>{state=state.applyTransaction(tr).state;};
 return {get state(){return state;},get document(){return documentFromState(state);},dispatch,run(command){return command(state,dispatch);}};
}

test('sparse block transformations cannot change an unselected block in the middle',()=>{
 const h=harness();h.run(selectManualBlockIds(['a','c']));const before=h.state;
 for(const id of ['paragraph','heading2','todo','codeBlock','bulletList','orderedList']){assert.equal(manualCommands[id](h.state),false);assert.equal(h.run(manualCommands[id]),false);assert.equal(h.state,before);}
});

test('sparse scalar fallback cannot replace the intended selection with one target or a page',()=>{
 const h=harness();h.run(selectManualBlockIds(['a','c']));const before=h.state;
 for(const id of ['delete','duplicate','moveUp','moveDown','heading2','quote','callout','toggle'])for(const targetId of ['a',undefined]){assert.equal(h.run(executeManualBlockCommand(id,{targetId})),false);assert.equal(h.state,before);}
});

test('ordinary contiguous text formatting still changes every selected block and preserves outside content',()=>{
 const h=harness(),before=h.document,a=findManualObject(h.state,'a'),c=findManualObject(h.state,'c');h.dispatch(h.state.tr.setSelection(TextSelection.create(h.state.doc,a.pos+1,c.pos+1+c.node.content.size)));assert.equal(h.run(manualCommands.heading2),true);
 assert.deepEqual(h.document.pages[0].blocks.slice(0,3),before.pages[0].blocks.slice(0,3).map(block=>({...block,type:'heading',level:2})));assert.deepEqual(h.document.pages[0].blocks[3],before.pages[0].blocks[3]);assert.deepEqual(h.document.pages[0].title,before.pages[0].title);
});

test('sparse list indentation and both Tab directions leave unselected list items unchanged',()=>{
 const list={id:'list',type:'list',ordered:false,items:['a','b','c'].map(id=>({id:'item-'+id,blocks:[paragraph(id,id)],extensions:{opaque:{item:id}}}))},h=harness([list]);h.run(selectManualBlockIds(['item-a','item-c']));const before=h.state;
 for(const id of ['indentList','outdentList','tab','shiftTab']){assert.equal(manualCommands[id](h.state),false);assert.equal(h.run(manualCommands[id]),false);assert.equal(h.state,before);}
});

for(const kind of ['strong','link'])test('sparse '+kind+' uses exact ranges and leaves intervening text and metadata untouched',()=>{
 const h=harness(),before=h.document;h.run(selectManualBlockIds(['a','c']));assert.equal(h.run(kind==='strong'?manualCommands.strong:setManualLink('https://example.invalid/sparse')),true);
 const after=h.document;assert.deepEqual(after.pages[0].blocks[1],before.pages[0].blocks[1]);assert.deepEqual(after.pages[0].blocks[3],before.pages[0].blocks[3]);assert.deepEqual(after.pages[0].title,before.pages[0].title);
 for(const index of [0,2]){assert.equal(after.pages[0].blocks[index].id,before.pages[0].blocks[index].id);assert.deepEqual(after.pages[0].blocks[index].extensions,before.pages[0].blocks[index].extensions);assert.deepEqual(after.pages[0].blocks[index].content,kind==='strong'?[{type:'text',text:before.pages[0].blocks[index].content[0].text}]:[{type:'text',text:before.pages[0].blocks[index].content[0].text,marks:[{type:'strong'},{type:'link',href:'https://example.invalid/sparse'}]}]);}
});

test('a physical partial automatic block selection rejects destructive key commands without throwing or changing source',()=>{
 const h=harness([paragraph('a','ABCDEFGH')]),page=h.document.pages[0],plan=planManualPagination(h.state,{doc:h.state.doc,revision:1,pages:[{id:page.id,capacity:100,blocks:[{id:'a',height:160,splits:[{kind:'text',at:4,headHeight:80,tailHeight:80}]}]}]});assert.equal(plan.status,'ready');h.dispatch(createManualPaginationTransaction(h.state,plan));h.run(selectManualBlockIds(['a'],{logicalFragments:false}));const before=h.state;assert.equal(before.selection.manualIncompletePaginationSelection,true);
 for(const id of ['backspace','deleteForward','enter']){assert.equal(manualCommands[id](h.state),false);assert.equal(h.run(manualCommands[id]),false);assert.equal(h.state,before);}
});

test('explicit page insertion stays available while sparse blocks are selected and Undo restores their exact selection',()=>{
 const h=harness();h.run(selectManualBlockIds(['a','c']));const before=h.state,document=h.document;assert.equal(h.run(insertManualPageAfter(document.pages[0].id,{revision:before.doc})),true);assert.deepEqual(h.document.pages[0],document.pages[0]);assert.equal(h.document.pages.length,2);assert.equal(h.state.selection.$from.parent.type.name,'pageTitle');
 const after=h.state;assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));
});
