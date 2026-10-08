import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection,AllSelection} from '@tiptap/pm/state';
import {closeHistory,undoDepth,redoDepth} from '@tiptap/pm/history';
import {createPrototypeState,prototypeSchema as schema,prototypeCommands as commands,setHeading,setLink,isPrototypeLinkSafe} from '../src/redesign/prototype-kernel.mjs';
const text=value=>({type:'text',text:value});
const p=value=>({type:'paragraph',...(value?{content:[text(value)]}:{})});
const doc=(...content)=>({type:'doc',content});
function harness(input=doc(p('ABCDEF'))){
 let state=createPrototypeState({doc:input});
 const dispatch=tr=>{state=state.applyTransaction(tr).state;};
 return {get state(){return state;},get json(){return state.doc.toJSON();},dispatch,
  select:(from,to=from)=>dispatch(state.tr.setSelection(TextSelection.create(state.doc,from,to))),
  run:(command,view)=>command(state,dispatch,view),
  insert:value=>dispatch(state.tr.insertText(value)),
  boundary:()=>dispatch(closeHistory(state.tr)),
 };
}
test('empty draft has one editable paragraph, exactly one history and no isolating text fields',()=>{
 const state=createPrototypeState();assert.deepEqual(state.doc.toJSON(),doc(p('')));
 assert.equal(state.plugins.filter(plugin=>plugin.key.startsWith('history$')).length,1);
 for(const node of Object.values(schema.nodes))assert.notEqual(node.spec.isolating,true);
 assert.deepEqual(Object.keys(schema.marks),['strong','emphasis','link','code']);
});
for(const [name,from,to,left,right]of [['start',1,1,'','ABCDEF'],['middle',4,4,'ABC','DEF'],['end',7,7,'ABCDEF',''],['selection',2,6,'A','F']]){
 test(`Enter ${name} splits selection in a single history event`,()=>{
  const h=harness(),before=h.json;h.select(from,to);assert.equal(h.run(commands.enter),true);
  assert.deepEqual(h.json,doc(p(left),p(right)));assert.equal(undoDepth(h.state),1);
  h.run(commands.undo);assert.deepEqual(h.json,before);assert.equal(h.state.selection.from,from);assert.equal(h.state.selection.to,to);
  h.run(commands.redo);assert.deepEqual(h.json,doc(p(left),p(right)));
 });
}
test('Backspace merges adjacent paragraphs and Delete forwards shares the same model',()=>{
 for(const [command,position]of [[commands.backspace,6],[commands.deleteForward,4]]){
  const h=harness(doc(p('ABC'),p('DEF'))),before=h.json;h.select(position);
  assert.equal(h.run(command),true);assert.deepEqual(h.json,doc(p('ABCDEF')));
  assert.equal(h.state.selection.from,4);h.run(commands.undo);assert.deepEqual(h.json,before);
 }
});
test('a multi-paragraph selection replaces and undo restores both structure and selection',()=>{
 const h=harness(doc(p('AB😀'),p('한글'),p('끝'))),before=h.json;
 h.select(3,8);h.insert('교체');assert.deepEqual(h.json,doc(p('AB교체글'),p('끝')));
 h.run(commands.undo);assert.deepEqual(h.json,before);assert.equal(h.state.selection.from,3);assert.equal(h.state.selection.to,8);
});
test('select-all deletion leaves an editable empty document, recovered by undo',()=>{
 const h=harness(doc(p('첫째'),p('둘째'))),before=h.json;
 h.dispatch(h.state.tr.setSelection(new AllSelection(h.state.doc)).deleteSelection());
 assert.deepEqual(h.json,doc(p('')));h.run(commands.undo);assert.deepEqual(h.json,before);
});
test('Shift-Enter command inserts a hardBreak without creating another paragraph',()=>{
 const h=harness();h.select(4);h.run(commands.hardBreak);
 assert.deepEqual(h.json,doc({type:'paragraph',content:[text('ABC'),{type:'hardBreak'},text('DEF')]}));
 h.run(commands.undo);assert.deepEqual(h.json,doc(p('ABCDEF')));
});
test('headings and inline marks use ordinary PM selections and one shared history',()=>{
 const h=harness();h.select(2,5);h.run(commands.strong);h.boundary();h.run(commands.emphasis);h.boundary();h.run(setHeading(3));
 assert.equal(h.json.content[0].type,'heading');assert.equal(h.json.content[0].attrs.level,3);
 assert.deepEqual(h.json.content[0].content[1].marks,[{type:'strong'},{type:'emphasis'}]);
 assert.equal(undoDepth(h.state),3);for(let i=0;i<3;i++)h.run(commands.undo);
 assert.deepEqual(h.json,doc(p('ABCDEF')));assert.equal(redoDepth(h.state),3);
});
test('code mark excludes other inline marks and supports undo',()=>{
 const h=harness();h.select(1,7);h.run(commands.strong);h.boundary();h.run(commands.code);
 assert.deepEqual(h.json.content[0].content[0].marks,[{type:'code'}]);
 h.run(commands.undo);assert.deepEqual(h.json.content[0].content[0].marks,[{type:'strong'}]);
});
test('lists wrap paragraphs, split items, exit empty final items and restore with undo',()=>{
 const h=harness(doc(p('항목')));h.select(1);h.run(commands.bulletList);
 assert.equal(h.json.content[0].type,'bulletList');h.select(5);h.boundary();h.run(commands.enter);
 assert.equal(h.json.content[0].content.length,2);h.boundary();h.run(commands.enter);
 assert.deepEqual(h.json,doc({type:'bulletList',content:[{type:'listItem',content:[p('항목')]}]},p('')));
 h.run(commands.undo);assert.equal(h.json.content[0].content.length,2);
});
test('changing list kind preserves content and changing it again lifts the selected item',()=>{
 const h=harness(doc(p('항목')));h.select(1);h.run(commands.bulletList);h.boundary();h.run(commands.orderedList);
 assert.equal(h.json.content[0].type,'orderedList');assert.equal(h.json.content[0].attrs.order,1);
 h.boundary();h.run(commands.orderedList);assert.deepEqual(h.json,doc(p('항목')));
 h.run(commands.undo);assert.equal(h.json.content[0].type,'orderedList');
});
test('safe explicit links replace links without toggling them off, and unsafe schemes are rejected',()=>{
 const h=harness();h.select(1,4);h.run(setLink('https://example.invalid'));h.boundary();h.run(setLink('mailto:test@example.invalid'));
 assert.equal(h.json.content[0].content[0].marks[0].attrs.href,'mailto:test@example.invalid');
 h.boundary();h.run(setLink(null));assert.equal(h.json.content[0].content[0].marks,undefined);
 h.run(commands.undo);assert.equal(h.json.content[0].content[0].marks[0].type,'link');
 for(const href of ['javascript:alert(1)','data:text/html,test','file:///tmp/private','//example.invalid','java\nscript:alert(1)',' https://example.invalid','']){
  assert.equal(isPrototypeLinkSafe(href),false);assert.throws(()=>setLink(href));
  assert.equal(schema.marks.link.spec.parseDOM[0].getAttrs({getAttribute:()=>href}),false);
 }
 assert.equal(isPrototypeLinkSafe('#section'),true);
});
test('invalid node structures and attribute values fail before creating a view',()=>{
 for(const input of [doc(),{type:'paragraph'},doc({type:'heading',attrs:{level:7}}),doc({type:'orderedList',attrs:{order:-1},content:[{type:'listItem',content:[p('x')]}]}),doc({type:'paragraph',content:[{...text('x'),marks:[{type:'link',attrs:{href:'javascript:bad'}}]}]})])assert.throws(()=>createPrototypeState({doc:input}));
});
test('dry-run commands are read-only and composing guards block toolbar actions',()=>{
 const h=harness();h.select(2,4);const before=h.state;
 assert.equal(commands.strong(h.state),true);assert.equal(h.state,before);
 for(const command of [commands.strong,commands.heading,commands.bulletList,commands.enter,commands.undo,commands.hardBreak,setLink('https://example.invalid')])assert.equal(h.run(command,{composing:true}),false);
 assert.equal(h.state,before);assert.equal(undoDepth(h.state),0);
});

test('the default heading command follows the manual level 3 convention',()=>{
 const h=harness();h.run(commands.heading);assert.equal(h.json.content[0].attrs.level,3);
});

for(const kind of ['paragraph','heading'])test(`toolbar ${kind} exits list in one undoable transaction`,()=>{
 const input=doc({type:'bulletList',content:[{type:'listItem',content:[p('첫째')]},{type:'listItem',content:[p('둘째')]},{type:'listItem',content:[p('셋째')]}]});
 const h=harness(input);h.select(9,11);const before=h.state;
 assert.equal(commands[kind](h.state),true);assert.equal(h.state,before);assert.equal(undoDepth(h.state),0);
 assert.equal(h.run(commands[kind]),true);assert.equal(h.json.content[1].type,kind);
 assert.equal(h.json.content[1].content[0].text,'둘째');assert.equal(h.json.content[0].type,'bulletList');assert.equal(h.json.content[2].type,'bulletList');
 if(kind==='heading')assert.equal(h.json.content[1].attrs.level,3);
 assert.equal(undoDepth(h.state),1);h.run(commands.undo);assert.deepEqual(h.json,input);assert.equal(h.state.selection.from,9);assert.equal(h.state.selection.to,11);
});
test('toolbar heading converts multiple sibling list items atomically',()=>{
 const input=doc({type:'orderedList',attrs:{order:1},content:[{type:'listItem',content:[p('AB')]},{type:'listItem',content:[p('CD')]}]});
 const h=harness(input);h.select(3,11);const before=h.state;assert.equal(h.run(commands.heading),true);
 assert.deepEqual(h.json.content.map(node=>node.type),['heading','heading']);assert.equal(undoDepth(h.state),1);
 h.run(commands.undo);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
});
test('unsupported nested or mixed-container block conversions are disabled without mutation',()=>{
 const input=doc({type:'bulletList',content:[{type:'listItem',content:[p('AB'),{type:'bulletList',content:[{type:'listItem',content:[p('CD')]}]}]}]},p('EF'));
 const h=harness(input);h.select(9);const before=h.state;
 assert.equal(commands.paragraph(h.state),false);assert.equal(h.run(commands.heading),false);assert.equal(h.state,before);
 h.dispatch(h.state.tr.setSelection(new AllSelection(h.state.doc)));assert.equal(commands.paragraph(h.state),false);
 assert.equal(undoDepth(h.state),0);
});

test('a cursor in a parent list item with nested children cannot convert block kind',()=>{
 const h=harness(doc({type:'bulletList',content:[{type:'listItem',content:[p('AB'),{type:'bulletList',content:[{type:'listItem',content:[p('CD')]}]}]}]}));
 h.select(3);const before=h.state;
 assert.equal(commands.heading(h.state),false);assert.equal(h.run(commands.paragraph),false);assert.equal(h.state,before);
});

for(const kind of ['paragraph','heading','bulletList','orderedList'])test(`whole-document list selection supports ${kind} and restores AllSelection on undo`,()=>{
 const h=harness(doc(p('AB'),p('CD')));
 h.run(commands.selectAll);assert.equal(h.run(commands.orderedList),true);
 assert.ok(h.state.selection instanceof AllSelection);
 h.boundary();const before=h.state;
 assert.equal(commands[kind](h.state),true);assert.equal(h.state,before);
 assert.equal(h.run(commands[kind]),true);
 assert.ok(h.state.selection instanceof AllSelection);
 const expected=kind==='orderedList'?'paragraph':kind;
 assert.equal(h.json.content[0].type,expected);
 assert.equal(h.state.doc.textContent,'ABCD');
 h.run(commands.undo);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection instanceof AllSelection);
 h.run(commands.redo);assert.equal(h.json.content[0].type,expected);assert.ok(h.state.selection instanceof AllSelection);
});
