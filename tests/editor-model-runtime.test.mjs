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
