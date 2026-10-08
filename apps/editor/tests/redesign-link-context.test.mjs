import test from 'node:test';
import assert from 'node:assert/strict';
import {NodeSelection,TextSelection} from '@tiptap/pm/state';
import {createManualState,findManualObject,setManualLink} from '../src/redesign/manual-kernel.mjs';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {getManualLinkContext} from '../src/redesign/manual-link-context.mjs';

function fixture(content=[{type:'text',text:'plain text'}],type='paragraph'){
 const document=createEmptyManualDocument(),id=document.pages[0].blocks[0].id;
 document.pages[0].blocks=[type==='codeBlock'?{id,type,language:'',text:'code text'}:{id,type,content}];
 let state=createManualState({document});const start=findManualObject(state,id).pos+1;
 return {start,get state(){return state;},select(from,to=from){state=state.apply(state.tr.setSelection(TextSelection.create(state.doc,start+from,start+to)));return state;},stored(href){state=state.apply(state.tr.addStoredMark(state.schema.marks.link.create({href})));return state;},clearStored(){state=state.apply(state.tr.setStoredMarks([]));return state;}};
}
test('ordinary carets cannot start an invisible future link, including an empty paragraph or stored mark alone',()=>{
 for(const content of [[{type:'text',text:'plain text'}],[]]){
  const h=fixture(content);h.select(0);assert.equal(setManualLink('https://example.invalid')(h.state),true);
  const before=h.state;assert.deepEqual(getManualLinkContext(h.state),{eligible:false,href:'',mode:'add'});assert.equal(h.state,before);
  h.stored('https://example.invalid/future');const stored=h.state.storedMarks;assert.equal(getManualLinkContext(h.state).eligible,false);assert.equal(h.state.storedMarks,stored);
 }
});
test('selecting plain text provides a link target without changing the selection or document',()=>{
 const h=fixture();h.select(1,6);const before=h.state;
 assert.deepEqual(getManualLinkContext(h.state),{eligible:true,href:'',mode:'add'});assert.equal(h.state,before);
});
test('a caret within a real link edits that URL even if future typing marks were cleared',()=>{
 const h=fixture([{type:'text',text:'See '},{type:'text',text:'guide',marks:[{type:'link',href:'https://example.invalid/guide'}]}]);h.select(6);
 h.clearStored();assert.deepEqual(h.state.storedMarks,[]);
 assert.deepEqual(getManualLinkContext(h.state),{eligible:true,href:'https://example.invalid/guide',mode:'edit'});
});
test('a selection at a link boundary uses its first selected text, while a plain prefix does not inherit a later URL',()=>{
 const h=fixture([{type:'text',text:'See '},{type:'text',text:'guide',marks:[{type:'link',href:'https://example.invalid/guide'}]}]);
 h.select(4,9);assert.deepEqual(getManualLinkContext(h.state),{eligible:true,href:'https://example.invalid/guide',mode:'edit'});
 h.select(0,9);assert.deepEqual(getManualLinkContext(h.state),{eligible:true,href:'',mode:'add'});
});
test('code text remains ineligible and a missing editor has no link target',()=>{
 const h=fixture(undefined,'codeBlock');h.select(0,4);assert.equal(getManualLinkContext(h.state).eligible,false);
 assert.deepEqual(getManualLinkContext(null),{eligible:false,href:'',mode:'add'});
});
test('selecting a whole page or cover for page management does not turn all its content into a link target',()=>{
 for(const role of ['page','cover']){
  const document=createEmptyManualDocument();document.pages[0].blocks[0].content=[{type:'text',text:'body'}];
  if(role==='cover')document.cover={id:crypto.randomUUID(),title:[{type:'text',text:'cover'}],metadata:[],blocks:[{id:crypto.randomUUID(),type:'paragraph',content:[{type:'text',text:'cover body'}]}]};
  let state=createManualState({document});state=state.apply(state.tr.setSelection(NodeSelection.create(state.doc,0)));
  assert.equal(state.selection.node.type.name,role);assert.equal(setManualLink('https://example.invalid')(state),true);
  const before=state;assert.deepEqual(getManualLinkContext(state),{eligible:false,href:'',mode:'add'});assert.equal(state,before);
 }
});
