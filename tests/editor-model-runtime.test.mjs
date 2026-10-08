import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fixture } from './fixtures/editor-model.mjs';
import { toEditorJSON, fromEditorJSON, findEditorNode } from '../apps/editor/src/manual-adapter/index.mjs';
import { createManualExtensions } from '../apps/editor/src/editor/custom-nodes.mjs';
import { createManualCommandExtension, manualOperation } from '../apps/editor/src/editor/commands.mjs';

// This targeted suite requires the separately approved app-local runtime. Never installs it.
const require = createRequire(new URL('../apps/editor/package.json', import.meta.url));
const { Node, Extension, getSchema } = require('@tiptap/core');
const { Plugin, PluginKey, EditorState, TextSelection } = require('@tiptap/pm/state');
const { history, closeHistory, undo, redo, undoDepth, redoDepth } = require('@tiptap/pm/history');
const runtime = { Node, Extension, Plugin, PluginKey, TextSelection, history, closeHistory, undo, redo };

function harness(input = fixture()) {
  const errors = [];
  const rt = { ...runtime, onError: e => errors.push(e.message) };
  const schema = getSchema(createManualExtensions(rt));
  const extension = createManualCommandExtension(rt);
  const plugins = extension.config.addProseMirrorPlugins();
  let state = EditorState.create({ schema, doc: schema.nodeFromJSON(toEditorJSON(input.document, { sidecars: input.sidecars })), plugins });
  const dispatch = tr => { state = state.applyTransaction(tr).state; };
  return {
    errors, schema, plugins,
    get state() { return state; },
    get value() { return fromEditorJSON(state.doc.toJSON()); },
    dispatch,
    op(operation, composing = false) {
      const tr = state.tr;
      const ok = manualOperation(operation, { closeHistory, TextSelection, onError: e => errors.push(e.message) })({ state, tr, dispatch, view: { composing } });
      if (ok) dispatch(tr);
      return ok;
    },
    undo: () => undo(state, dispatch), redo: () => redo(state, dispatch),
    type(path, text) {
      const { pos, size } = findEditorNode(state.doc.toJSON(), path);
      const tr = state.tr.setSelection(TextSelection.create(state.doc, pos + 1, pos + size - 1)).insertText(text);
      dispatch(tr);
    },
  };
}

test('real Tiptap schema retains the complete domain and opaque sidecars without marks', () => {
  const h = harness();
  h.state.doc.check();
  assert.deepEqual(h.value, fixture());
  assert.equal(h.plugins.filter(p => p.key.startsWith('history$')).length, 1);
  assert.deepEqual(Object.keys(h.schema.marks), []);
  assert.equal(undoDepth(h.state), 0);
});

test('actual PM transaction history restores every structural and crop operation exactly', () => {
  const h = harness(), snapshots = [h.value];
  const ops = [
    { type: 'set', path: ['pages', 0, 'blocks', 6, 'crop', 'x'], value: 9.75 },
    { type: 'set', path: ['pages', 0, 'blocks', 6, 'previewTitle'], value: '수정 프레임' },
    { type: 'insert', path: ['pages', 1, 'blocks'], index: 1, value: { type: 'paragraph', text: '새 블록', future: { keep: true } } },
    { type: 'move', fromPath: ['pages', 0, 'blocks', 5, 'items'], fromIndex: 0, toPath: ['pages', 1, 'blocks', 0, 'items'], toIndex: 1 },
    { type: 'splitSteps', pageIndex: 0, blockIndex: 5, at: 1, title: '새 페이지' },
    { type: 'move', fromPath: ['pages'], fromIndex: 0, toPath: ['pages'], toIndex: 2 },
    { type: 'remove', path: ['pages', 1, 'blocks'], index: 1 },
    { type: 'unset', path: ['pages', 2, 'lead'] },
  ];
  for (const op of ops) { assert.equal(h.op(op), true, h.errors.join(';')); snapshots.push(h.value); }
  assert.equal(undoDepth(h.state), ops.length);
  for (let i = ops.length - 1; i >= 0; i--) { assert.equal(h.undo(), true); assert.deepEqual(h.value, snapshots[i]); }
  assert.equal(undoDepth(h.state), 0); assert.equal(redoDepth(h.state), ops.length);
  for (let i = 1; i < snapshots.length; i++) { assert.equal(h.redo(), true); assert.deepEqual(h.value, snapshots[i]); }
  assert.deepEqual(h.errors, []);
});

test('typed text and property commands share one history, with boundaries on both sides', () => {
  const h = harness(), initial = h.value;
  h.type(['title'], '한글 입력\n다음 문장'); const typed = h.value;
  assert.equal(h.op({ type: 'set', path: ['pages', 0, 'lead'], value: '수정 안내' }), true); const property = h.value;
  h.type(['title'], '그 다음 입력'); const final = h.value;
  assert.equal(undoDepth(h.state), 3);
  assert.equal(h.undo(), true); assert.deepEqual(h.value, property);
  assert.equal(h.undo(), true); assert.deepEqual(h.value, typed);
  assert.equal(h.undo(), true); assert.deepEqual(h.value, initial);
  for (let i = 0; i < 3; i++) assert.equal(h.redo(), true);
  assert.deepEqual(h.value, final);
});

test('IME guard leaves actual state/history untouched and dry-run has no side effects', () => {
  const h = harness(), before = h.state;
  const op = { type: 'set', path: ['title'], value: '변경' };
  assert.equal(h.op(op, true), false); assert.equal(h.state, before); assert.equal(undoDepth(h.state), 0);
  const tr = h.state.tr;
  assert.equal(manualOperation(op, { closeHistory })({ state: h.state, tr, view: { composing: false } }), true);
  assert.equal(tr.docChanged, false); assert.equal(h.state, before);
  assert.equal(h.op(op), true); assert.equal(h.undo(), true); assert.deepEqual(h.value, fixture());
});

test('ordinary editor transactions cannot delete fields or alter opaque values', () => {
  const h = harness(), before = h.state.doc;
  const json = structuredClone(h.state.doc.toJSON());
  findEditorNode(json, ['future']).node.attrs.value = { lost: true };
  const other = h.schema.nodeFromJSON(json);
  h.dispatch(h.state.tr.replaceWith(0, h.state.doc.content.size, other.content));
  assert.equal(h.state.doc, before);
  assert.match(h.errors.at(-1), /structure/);
});

test('invalid canonical text remains recoverable draft and undo restores the valid document', () => {
  const h = harness(); h.type(['title'], '');
  assert.throws(() => h.value, /nonempty/);
  assert.equal(fromEditorJSON(h.state.doc.toJSON(), { validate: false }).document.title, '');
  assert.equal(h.undo(), true); assert.deepEqual(h.value, fixture());
});

test('selection follows moved steps and remains in the same text through split/undo', () => {
  const h = harness();
  const fromPath = ['pages', 0, 'blocks', 5, 'items'], toPath = ['pages', 1, 'blocks', 0, 'items'];
  const first = findEditorNode(h.state.doc.toJSON(), [...fromPath, 0, 'title']);
  h.dispatch(h.state.tr.setSelection(TextSelection.create(h.state.doc, first.pos + 2)));
  assert.equal(h.op({ type: 'move', fromPath, fromIndex: 0, toPath, toIndex: 1 }), true);
  const destination = findEditorNode(h.state.doc.toJSON(), [...toPath, 1, 'title']);
  assert.equal(h.state.selection.anchor, destination.pos + 2);
  assert.equal(h.undo(), true); assert.equal(h.state.selection.anchor, first.pos + 2);
  const tail = findEditorNode(h.state.doc.toJSON(), [...fromPath, 2, 'title']);
  h.dispatch(h.state.tr.setSelection(TextSelection.create(h.state.doc, tail.pos + 2)));
  assert.equal(h.op({ type: 'splitSteps', pageIndex: 0, blockIndex: 5, at: 1, title: '다음 과업' }), true);
  const split = findEditorNode(h.state.doc.toJSON(), ['pages', 1, 'blocks', 0, 'items', 1, 'title']);
  assert.equal(h.state.selection.anchor, split.pos + 2);
});

test('canvas text shares PM history, preserves opaque data and restores empty drafts', async () => {
  const { replaceManualText } = await import('../apps/editor/src/editor/direct-edit.mjs');
  const h = harness(), initial = h.value;
  const editor = { getJSON: () => h.state.doc.toJSON(), get state() { return h.state; }, view: { dispatch: h.dispatch } };
  const path = ['pages', 0, 'title'];
  assert.equal(replaceManualText(editor, path, '한글 😀 입력\n두 줄', runtime, true), true);
  assert.equal(replaceManualText(editor, path, '한글 😃 입력\n두 줄', runtime), true);
  assert.equal(h.value.document.pages[0].title, '한글 😃 입력\n두 줄');
  assert.deepEqual(h.value.sidecars, initial.sidecars);
  const edited = h.value;
  assert.equal(replaceManualText(editor, path, '', runtime, true), true);
  assert.equal(fromEditorJSON(h.state.doc.toJSON(), {validate:false}).document.pages[0].title, '');
  h.undo(); assert.deepEqual(h.value, edited);
  h.undo(); assert.deepEqual(h.value, initial);
  h.redo(); assert.deepEqual(h.value, edited);
  assert.equal(replaceManualText(editor, path, edited.document.pages[0].title, runtime), false);
  assert.throws(() => replaceManualText(editor, ['pages', 0], 'bad', runtime));
});

import {planCanvasKey,applyCanvasPlan,setCanvasSelection,canvasSelection} from '../apps/editor/src/editor/canvas-commands.mjs';
const draftOf=h=>fromEditorJSON(h.state.doc.toJSON(),{validate:false});
function canvasHarness(blocks){
 const h=harness({document:{schemaVersion:1,title:'키보드 검사',pages:[{title:'작성',blocks}]},sidecars:{future:{keep:true}}});
 const editor={getJSON:()=>h.state.doc.toJSON(),get state(){return h.state;},view:{dispatch:h.dispatch,composing:false}};
 return {h,editor,key(path,key,start=0,end=start){
   const current=draftOf(h).document;
   if(path.reduce((v,key)=>v?.[key],current)!==undefined)setCanvasSelection(editor,path,start,end,runtime);
   return applyCanvasPlan(editor,planCanvasKey(current,{path,key,start,end}),runtime);
 }};
}
for(const [label,start,end,left,right]of [['start',0,0,'','ABCDEF'],['middle',3,3,'ABC','DEF'],['end',6,6,'ABCDEF',''],['selected range',1,5,'A','F']]){
 test(`canvas Enter at ${label} splits once and undo restores text and selection`,()=>{
  const {h,editor,key}=canvasHarness([{type:'paragraph',text:'ABCDEF',future:{keep:true}}]),path=['pages',0,'blocks',0,'text'],before=h.value;
  assert.equal(key(path,'Enter',start,end),true);
  assert.deepEqual(draftOf(h).document.pages[0].blocks,[{type:'paragraph',text:left,future:{keep:true}},{type:'paragraph',text:right}]);
  assert.deepEqual(canvasSelection(editor),{path:['pages',0,'blocks',1,'text'],offset:0});
  assert.equal(undoDepth(h.state),1);
  assert.equal(h.undo(),true);assert.deepEqual(h.value,before);
  assert.deepEqual(canvasSelection(editor),{path,offset:end});
  assert.equal(h.redo(),true);assert.equal(draftOf(h).document.pages[0].blocks[1].text,right);
 });
}
test('Backspace and Delete join paragraphs, including an empty draft, without losing metadata',()=>{
 for(const backward of [true,false]){
  const {h,editor,key}=canvasHarness([{type:'paragraph',text:'앞 😀',future:7},{type:'paragraph',text:'뒤'}]);
  assert.equal(key(['pages',0,'blocks',backward?1:0,'text'],backward?'Backspace':'Delete',backward?0:4),true);
  assert.deepEqual(h.value.document.pages[0].blocks,[{type:'paragraph',text:'앞 😀뒤',future:7}]);
  assert.equal(canvasSelection(editor).offset,4);assert.equal(undoDepth(h.state),1);h.undo();assert.equal(h.value.document.pages[0].blocks.length,2);
 }
 const {h,key}=canvasHarness([{type:'paragraph',text:'앞'},{type:'paragraph',text:'뒤'}]);
 h.op({type:'set',path:['pages',0,'blocks',1,'text'],value:''});
 assert.equal(key(['pages',0,'blocks',1,'text'],'Backspace'),true);assert.equal(h.value.document.pages[0].blocks.length,1);h.undo();assert.equal(draftOf(h).document.pages[0].blocks[1].text,'');
 const guarded=canvasHarness([{type:'paragraph',text:'앞'},{type:'paragraph',text:'뒤',future:'retain'}]);
 assert.equal(guarded.key(['pages',0,'blocks',1,'text'],'Backspace'),false);assert.equal(undoDepth(guarded.h.state),0);
});
test('list Enter replaces selection, Backspace joins, and an empty final item exits the list',()=>{
 const {h,key}=canvasHarness([{type:'list',items:['ABCDEF']}]),path=['pages',0,'blocks',0,'items',0];
 assert.equal(key(path,'Enter',2,4),true);assert.deepEqual(h.value.document.pages[0].blocks[0].items,['AB','EF']);
 assert.equal(key([...path.slice(0,-1),1],'Backspace'),true);assert.deepEqual(h.value.document.pages[0].blocks[0].items,['ABEF']);
 assert.equal(key(path,'Enter',4),true);assert.equal(key([...path.slice(0,-1),1],'Enter'),true);
 assert.deepEqual(draftOf(h).document.pages[0].blocks,[{type:'list',items:['ABEF']},{type:'paragraph',text:''}]);
 h.undo();assert.deepEqual(draftOf(h).document.pages[0].blocks,[{type:'list',items:['ABEF','']}]);
});
test('step title Enter focuses an absent description without persisting a placeholder',()=>{
 const {h,key}=canvasHarness([{type:'steps',items:[{title:'단계',future:1}]}]),before=h.value;
 assert.equal(key(['pages',0,'blocks',0,'items',0,'title'],'Enter',2),true);
 assert.deepEqual(h.value,before);assert.equal(undoDepth(h.state),0);
 assert.equal(key(['pages',0,'blocks',0,'items',0,'text'],'Enter'),true);
 assert.deepEqual(draftOf(h).document.pages[0].blocks[0].items,[{title:'단계',future:1},{title:'',text:''}]);
 h.undo();assert.deepEqual(h.value,before);
});
test('split step description retains attached figure and unknown values; undo is atomic',()=>{
 const {h,key}=canvasHarness([{type:'steps',items:[{title:'단계',text:'ABCDEF',figure:{src:'assets/example.png',alt:'예제',caption:'그림'},future:{retain:1}}]}]),before=h.value;
 assert.equal(key(['pages',0,'blocks',0,'items',0,'text'],'Enter',3),true);
 const items=draftOf(h).document.pages[0].blocks[0].items;
 assert.equal(items[0].text,'ABC');assert.deepEqual(items[0].figure,before.document.pages[0].blocks[0].items[0].figure);
 assert.deepEqual(items[1],{title:'',text:'DEF'});assert.equal(undoDepth(h.state),1);h.undo();assert.deepEqual(h.value,before);
});
test('structural keyboard commands reject IME composition without partial dispatch',()=>{
 const {h,editor,key}=canvasHarness([{type:'paragraph',text:'한글'}]),before=h.value;
 editor.view.composing=true;assert.equal(key(['pages',0,'blocks',0,'text'],'Enter',1),false);
 assert.deepEqual(h.value,before);assert.equal(undoDepth(h.state),0);
});

import {planCanvasMove} from '../apps/editor/src/editor/canvas-move.mjs';
test('canvas drop gaps move blocks before/after with one undo and preserve all fields',()=>{
 const h=harness(),before=h.value;
 const plan=planCanvasMove(before.document,'/pages/0/blocks/0','/pages/0/blocks',3);
 assert.equal(plan.operation.toIndex,2);assert.equal(h.op(plan.operation),true);
 assert.deepEqual(h.value.document.pages[0].blocks[2],before.document.pages[0].blocks[0]);
 assert.deepEqual(h.value.sidecars,before.sidecars);assert.equal(undoDepth(h.state),1);h.undo();assert.deepEqual(h.value,before);h.redo();assert.equal(undoDepth(h.state),1);
});
test('canvas drops between pages and into empty pages preserve block and step payloads',()=>{
 const h=harness(),before=h.value;
 const block=planCanvasMove(h.value.document,'/pages/0/blocks/6','/pages/1/blocks',0);
 assert.equal(h.op(block.operation),true);assert.deepEqual(h.value.document.pages[1].blocks[0],before.document.pages[0].blocks[6]);h.undo();
 const step=planCanvasMove(h.value.document,'/pages/0/blocks/5/items/0','/pages/1/blocks/0/items',1);
 assert.equal(h.op(step.operation),true);assert.deepEqual(h.value.document.pages[1].blocks[0].items[1],before.document.pages[0].blocks[5].items[0]);h.undo();assert.deepEqual(h.value,before);
 h.op({type:'insert',path:['pages'],index:2,value:{title:'빈 페이지',blocks:[]}});
 const empty=planCanvasMove(draftOf(h).document,'/pages/0/blocks/0','/pages/2/blocks',0);
 assert.equal(h.op(empty.operation),true);assert.deepEqual(h.value.document.pages[2].blocks,[before.document.pages[0].blocks[0]]);
});
test('canvas drop rejects no-op gaps, incompatible kinds, descendants and stale indices',()=>{
 const doc=fixture().document;
 for(const gap of [0,1,-1,999,1.5])assert.equal(planCanvasMove(doc,'/pages/0/blocks/0','/pages/0/blocks',gap),null);
 assert.equal(planCanvasMove(doc,'/pages/0/blocks/5/items/0','/pages/1/blocks',0),null);
 assert.equal(planCanvasMove(doc,'/pages/0/blocks/0','/pages/0/blocks/5/items',0),null);
 assert.equal(planCanvasMove(doc,'/pages/0/blocks/999','/pages/1/blocks',0),null);
 const nested={pages:[{blocks:[{type:'columns',blocks:[]}]}]};
 assert.equal(planCanvasMove(nested,'/pages/0/blocks/0','/pages/0/blocks/0/blocks',0),null);
});

import {planCanvasDelete} from '../apps/editor/src/editor/canvas-delete.mjs';
test('handle Delete removes only the selected figure or step and undo restores opaque payloads',()=>{
 for(const path of ['/pages/0/blocks/6','/pages/0/blocks/5/items/0']){
  const h=harness(),before=h.value,plan=planCanvasDelete(before.document,path);
  assert.ok(plan);assert.equal(h.op(plan.operation),true);assert.equal(undoDepth(h.state),1);
  assert.deepEqual(h.value.sidecars,before.sidecars);
  const {path:collection,index}=plan.operation;
  const original=collection.reduce((value,key)=>value[key],before.document),after=collection.reduce((value,key)=>value[key],h.value.document);
  assert.deepEqual(after,original.filter((_,i)=>i!==index));
  h.undo();assert.deepEqual(h.value,before);h.redo();assert.deepEqual(collection.reduce((v,k)=>v[k],h.value.document),after);
 }
});
test('handle Delete chooses the next or previous element and preserves an empty page',()=>{
 const {h}=canvasHarness([{type:'paragraph',text:'첫째'},{type:'paragraph',text:'둘째'}]);
 assert.equal(planCanvasDelete(h.value.document,'/pages/0/blocks/1').path,'/pages/0/blocks/0');
 let plan=planCanvasDelete(h.value.document,'/pages/0/blocks/0');
 assert.equal(plan.path,'/pages/0/blocks/0');assert.equal(plan.handle,true);h.op(plan.operation);
 plan=planCanvasDelete(h.value.document,'/pages/0/blocks/0');
 assert.equal(plan.path,'/pages/0');assert.equal(plan.handle,false);h.op(plan.operation);
 assert.deepEqual(draftOf(h).document.pages,[{title:'작성',blocks:[]}]);
 h.undo();assert.equal(h.value.document.pages[0].blocks[0].text,'둘째');
});
test('last step deletion retains the owning steps and rejects fields, pages and invalid indices',()=>{
 const {h}=canvasHarness([{type:'steps',start:4,items:[{title:'하나',extra:{keep:1}}]}]),before=h.value;
 const plan=planCanvasDelete(before.document,'/pages/0/blocks/0/items/0');
 assert.equal(plan.path,'/pages/0/blocks/0');assert.equal(plan.handle,true);h.op(plan.operation);
 assert.deepEqual(draftOf(h).document.pages[0].blocks,[{type:'steps',start:4,items:[]}]);h.undo();assert.deepEqual(h.value,before);
 for(const path of ['/pages/0','/pages/0/blocks/0/items/0/title','/pages/0/blocks/99','/pages/0/blocks/-1','/pages/0/blocks/0/figure','/pages/0/blocks/0/headers/0'])assert.equal(planCanvasDelete(before.document,path),null);
});
