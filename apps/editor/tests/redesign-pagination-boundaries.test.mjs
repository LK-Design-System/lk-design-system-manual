import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {closeHistory} from '@tiptap/pm/history';
import {createEmptyManualDocument,validateManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {planManualPagination,createManualPaginationTransaction} from '../src/redesign/manual-pagination.mjs';
import {manualPaginationMarker} from '../src/redesign/manual-pagination-meta.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';

const id=()=>crypto.randomUUID();
const run=(text,marks=[{type:'strong'}])=>({type:'text',text,marks});
const paragraph=(content)=>({id:id(),type:'paragraph',content,extensions:{vendor:{keep:true},manualPagination:{opaque:'keep'}}});
function harness(document){
 let state=createManualState({document}),last;
 return {get state(){return state;},get document(){return documentFromState(state);},get last(){return last;},dispatch(tr){last=tr;state=state.applyTransaction(tr).state;},run(command,view){return command(state,this.dispatch.bind(this),view);},select(blockId,offset){const found=findManualObject(state,blockId);this.dispatch(state.tr.setSelection(TextSelection.create(state.doc,found.pos+1+offset)));this.dispatch(closeHistory(state.tr));}};
}
function measure(state,height=160,split,capacity=100){
 const pages=[];state.doc.forEach(page=>{if(page.type.name!=='page')return;const blocks=[];page.forEach(node=>{if(!['pageTitle','pageLead'].includes(node.type.name))blocks.push({id:node.attrs.id,height,...(split?{splits:[{...split,headHeight:80,tailHeight:80}]}:{})});});pages.push({id:page.attrs.id,capacity,blocks});});return {doc:state.doc,revision:1,pages};
}
function flow(h,split,options={}){
 const plan=planManualPagination(h.state,measure(h.state,160,split));assert.equal(plan.status,'ready');
 const tr=createManualPaginationTransaction(h.state,plan,options);assert.ok(tr);h.dispatch(tr);
}
function roundTrip(h,before,after){
 assert.equal(h.run(manualCommands.undo),true);assert.deepEqual(h.document,documentFromState(before));assert.ok(h.state.selection.eq(before.selection));
 assert.equal(h.run(manualCommands.redo),true);assert.deepEqual(h.document,documentFromState(after));assert.ok(h.state.selection.eq(after.selection));
 assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document:h.document,assets:{}})).document,h.document);
}
function referencesValid(state){
 const nodes=new Map();state.doc.descendants(node=>{if(node.attrs.id)nodes.set(node.attrs.id,node);});
 state.doc.descendants(node=>{const marker=manualPaginationMarker(node.attrs.meta?.extensions,'block');if(marker){assert.ok(nodes.has(marker.rootBlockId));assert.equal(nodes.get(marker.rootBlockId).type.name,marker.sourceType);}});
}

for(const [label,left,right] of [['ASCII','ABCD','EFGH'],['Korean','가나다','라마'],['emoji','A👨‍👩‍👧‍👦','🇰🇷B'],['combining mark','Aé','öB']])for(const back of [true,false]){
 test(`${label}: automatic wrap ${back?'Backspace':'Delete'} deletes one logical grapheme and one Undo includes flow`,()=>{
  const d=createEmptyManualDocument();d.pages[0].title=[run('Task')];const p=paragraph([run(left),run(right,[{type:'link',href:'https://example.invalid'},{type:'underline'}])]);d.pages[0].blocks=[p];
  const h=harness(d);flow(h,{kind:'text',at:left.length});const tail=h.document.pages[1].blocks[0];h.select(back?tail.id:p.id,back?0:left.length);h.dispatch(h.state.tr.setStoredMarks([h.state.schema.marks.emphasis.create()]));const before=h.state;
  assert.equal(h.run(back?manualCommands.backspace:manualCommands.deleteForward),true);const key=h.last,parts=[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(back?left:right)],removed=back?parts.at(-1):parts[0];
  const expected=structuredClone(d);expected.pages[0].blocks[0].content=back?[run(left.slice(0,removed.index)),run(right,[{type:'link',href:'https://example.invalid'},{type:'underline'}])]:[run(left),run(right.slice(removed.segment.length),[{type:'link',href:'https://example.invalid'},{type:'underline'}])];expected.pages[0].blocks[0].content=expected.pages[0].blocks[0].content.filter(run=>run.text);
  assert.deepEqual(h.document,expected);assert.equal(h.state.selection.$from.parent.attrs.id,p.id);assert.equal(h.state.selection.$from.parentOffset,back?removed.index:left.length);assert.deepEqual(h.state.storedMarks,before.storedMarks);referencesValid(h.state);
  const cut=back?left.slice(0,removed.index).length:left.length;
  if(cut>0&&cut<h.state.selection.$from.parent.content.size){flow(h,{kind:'text',at:cut},{historyTransaction:key});referencesValid(h.state);}
  roundTrip(h,before,h.state);
 });
}

for(const back of [true,false])test(`hardBreak at an automatic ${back?'backward':'forward'} boundary is deleted as one inline node`,()=>{
 const d=createEmptyManualDocument(),p=paragraph([run('ABC'),{type:'hardBreak'},run('DEF')]);d.pages[0].title=[run('Task')];d.pages[0].blocks=[p];const h=harness(d),at=back?4:3;
 flow(h,{kind:'text',at});const tail=h.document.pages[1].blocks[0];h.select(back?tail.id:p.id,back?0:at);const before=h.state;
 assert.equal(h.run(back?manualCommands.backspace:manualCommands.deleteForward),true);assert.equal(h.state.doc.textBetween(0,h.state.doc.content.size,'','\n').includes('ABCDEF'),true);assert.deepEqual(h.document.pages[0].blocks[0].content,[run('ABCDEF')]);assert.equal(h.state.selection.$from.parentOffset,3);roundTrip(h,before,h.state);
});

for(const type of ['callout','toggle'])for(const back of [true,false])test(`${type} nested text wrap edits the body, never the repeated title`,()=>{
 const d=createEmptyManualDocument(),p=paragraph([run('ABCD'),run('EFGH')]),container={type,id:id(),title:[run('Notice')],blocks:[p],extensions:{container:'keep'},...(type==='callout'?{tone:'signal'}:{open:true})};d.pages[0].title=[run('Task')];d.pages[0].blocks=[container];const h=harness(d);
 flow(h,{kind:'nested-text',childIndex:0,at:4});const tail=h.document.pages[1].blocks[0].blocks[0];h.select(back?tail.id:p.id,back?0:4);const before=h.state;
 assert.equal(h.run(back?manualCommands.backspace:manualCommands.deleteForward),true);const expected=structuredClone(d);expected.pages[0].blocks[0].blocks[0].content=[run(back?'ABCEFGH':'ABCDFGH')];assert.deepEqual(h.document,expected);assert.equal(h.state.selection.$from.parent.attrs.id,p.id);roundTrip(h,before,h.state);
});

for(const back of [true,false])test(`whole paragraph spill ${back?'Backspace':'Delete'} safely joins body paragraphs and preserves opaque provenance`,()=>{
 const d=createEmptyManualDocument(),left=paragraph([run('LEFT')]),right=paragraph([run('RIGHT',[{type:'underline'}])]);left.extensions.vendor={side:'left'};right.extensions.vendor={side:'right'};d.pages[0].title=[run('Task')];d.pages[0].blocks=[left,right];const h=harness(d);
 const plan=planManualPagination(h.state,measure(h.state,60));assert.equal(plan.status,'ready');h.dispatch(createManualPaginationTransaction(h.state,plan));h.select(back?right.id:left.id,back?0:4);const before=h.state;
 assert.equal(h.run(back?manualCommands.backspace:manualCommands.deleteForward),true);const merged=h.document.pages[0].blocks[0];assert.equal(merged.id,left.id);assert.deepEqual(merged.content,[...left.content,...right.content]);assert.deepEqual(merged.extensions.vendor,left.extensions.vendor);assert.deepEqual(merged.extensions.joinedManualBlock,{id:right.id,type:'paragraph',extensions:right.extensions});assert.equal(h.state.selection.$from.parentOffset,4);assert.equal(h.document.pages[0].title[0].text,'Task');referencesValid(h.state);roundTrip(h,before,h.state);
});

test('explicit independent page start cannot absorb its body into the title',()=>{
 const d=createEmptyManualDocument(),first=paragraph([run('FIRST')]),second=paragraph([run('SECOND')]);d.pages[0].title=[run('First task')];d.pages[0].blocks=[first];d.pages.push({id:id(),title:[run('Independent')],blocks:[second]});const h=harness(d);h.select(second.id,0);const before=h.state;
 assert.equal(h.run(manualCommands.backspace),true);assert.equal(h.state.doc,before.doc);assert.ok(h.state.selection.eq(before.selection));assert.deepEqual(h.document,d);
 h.select(first.id,5);h.run(manualCommands.deleteForward);assert.deepEqual(h.document,d);
});

for(const type of ['callout','toggle','procedure'])test(`${type} first body start cannot join the structural title`,()=>{
 const d=createEmptyManualDocument(),p=paragraph([run('BODY')]);d.pages[0].blocks=[type==='procedure'?{type,id:id(),start:1,steps:[{id:id(),title:[run('Step')],blocks:[p]}]}:{type,id:id(),title:[run('Notice')],blocks:[p],...(type==='callout'?{tone:'signal'}:{open:true})}];const h=harness(d);h.select(p.id,0);const before=h.state;
 assert.equal(h.run(manualCommands.backspace),true);assert.equal(h.state.doc,before.doc);assert.deepEqual(h.document,d);
});

test('table continuation first body cell cannot join the repeated header and still serializes after backfill',()=>{
 const cell=text=>({id:id(),content:[run(text)],extensions:{cell:'keep'}}),table={id:id(),type:'table',label:'Table',headers:[cell('HEADER')],rows:[[cell('ROW1')],[cell('ROW2')]]};const d=createEmptyManualDocument();d.pages[0].title=[run('Task')];d.pages[0].blocks=[table];const h=harness(d);flow(h,{kind:'child',at:1});const body=h.document.pages[1].blocks[0].rows[0][0];h.select(body.id,0);const before=h.state;
 assert.equal(h.run(manualCommands.backspace),true);assert.equal(h.state.doc,before.doc);assert.deepEqual(h.document.pages[1].blocks[0].headers[0].content,[run('HEADER')]);
 const plan=planManualPagination(h.state,measure(h.state,10,undefined,1000));assert.equal(plan.status,'ready');h.dispatch(createManualPaginationTransaction(h.state,plan));assert.deepEqual(h.document,d);validateManualDocument(h.document);assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document:h.document,assets:{}})).document,d);
});

test('composition leaves automatic fragments, caret and history unchanged',()=>{
 const d=createEmptyManualDocument(),p=paragraph([run('ABCDEFGH')]);d.pages[0].blocks=[p];const h=harness(d);flow(h,{kind:'text',at:4});h.select(h.document.pages[1].blocks[0].id,0);const before=h.state;
 assert.equal(h.run(manualCommands.backspace,{composing:true}),false);assert.equal(h.run(manualCommands.deleteForward,{composing:true}),false);assert.equal(h.state,before);
});

for(const back of [true,false])test(`middle fragment in three automatic pages deletes ${back?'the preceding':'the following'} logical grapheme`,()=>{
 const d=createEmptyManualDocument(),p=paragraph([run('ABCDEFGHIJKL')]);d.pages[0].title=[run('Task')];d.pages[0].blocks=[p];const h=harness(d);flow(h,{kind:'text',at:4});
 const firstTail=h.document.pages[1].blocks[0],measurement=measure(h.state,10);measurement.pages[0].blocks[0].height=100;measurement.pages[1].blocks[0]={id:firstTail.id,height:160,splits:[{kind:'text',at:4,headHeight:80,tailHeight:80}]};
 const plan=planManualPagination(h.state,measurement);assert.equal(plan.status,'ready');h.dispatch(createManualPaginationTransaction(h.state,plan));assert.equal(h.document.pages.length,3);
 h.select(firstTail.id,back?0:4);const before=h.state;assert.equal(h.run(back?manualCommands.backspace:manualCommands.deleteForward),true);
 const expected=structuredClone(d);expected.pages[0].blocks[0].content=[run(back?'ABCEFGHIJKL':'ABCDEFGHJKL')];assert.deepEqual(h.document,expected);assert.equal(h.state.selection.$from.parentOffset,back?3:8);referencesValid(h.state);roundTrip(h,before,h.state);
});

for(const back of [true,false])test(`automatic list item boundary uses safe PM ${back?'backward':'forward'} body merge without losing metadata`,()=>{
 const d=createEmptyManualDocument(),left=paragraph([run('LEFT')]),right=paragraph([run('RIGHT')]),a={id:id(),blocks:[left],extensions:{item:'left'}},b={id:id(),blocks:[right],extensions:{item:'right'}},list={id:id(),type:'list',ordered:false,items:[a,b]};d.pages[0].title=[run('Task')];d.pages[0].blocks=[list];const h=harness(d);flow(h,{kind:'child',at:1});h.select(back?right.id:left.id,back?0:4);const before=h.state;
 assert.equal(h.run(back?manualCommands.backspace:manualCommands.deleteForward),true);const merged=h.document.pages[0].blocks[0];assert.equal(merged.id,list.id);assert.equal(merged.items.length,1);assert.deepEqual(merged.items[0].extensions,a.extensions);
 // PM joins the list items while keeping their two authored paragraphs.
 assert.deepEqual(merged.items[0].blocks.map(block=>({id:block.id,content:block.content})),[left,right].map(block=>({id:block.id,content:block.content})));
 const selected=merged.items[0].blocks[back?1:0],untouched=merged.items[0].blocks[back?0:1];assert.deepEqual(untouched,back?left:right);assert.deepEqual(selected.extensions.vendor,(back?right:left).extensions.vendor);assert.deepEqual(selected.extensions.joinedManualBlocks,[{id:b.id,type:'listItem',extensions:b.extensions}]);assert.equal(h.state.selection.$from.parent.attrs.id,selected.id);assert.equal(h.state.selection.$from.parentOffset,back?0:4);assert.equal(h.document.pages[0].title[0].text,'Task');referencesValid(h.state);roundTrip(h,before,h.state);
});
