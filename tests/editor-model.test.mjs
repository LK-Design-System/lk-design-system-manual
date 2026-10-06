import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { toEditorJSON, fromEditorJSON, findEditorNode } from '../apps/editor/src/manual-adapter/index.mjs';
import { applyOperation } from '../apps/editor/src/manual-adapter/operations.mjs';
import { manualOperation, structuralFingerprint } from '../apps/editor/src/editor/commands.mjs';
import { fixture, figure } from './fixtures/editor-model.mjs';

test('every schema field, unknown object field and sidecar survives JSON serialization both ways', () => {
  const input = fixture();
  const encoded = toEditorJSON(input.document, { sidecars: input.sidecars });
  const decoded = fromEditorJSON(JSON.parse(JSON.stringify(encoded)));
  assert.deepEqual(decoded, input);
  assert.equal(Object.hasOwn(decoded.document.pages[1], 'lead'), false);
  assert.equal(Object.hasOwn(decoded.document.pages[1].blocks[0], 'start'), false);
  assert.equal(decoded.document.pages[0].blocks.at(-2).type, 'help');
  decoded.document.title = 'changed';
  assert.equal(input.document.title, '가상 매뉴얼');
});

test('all shipped documents round trip without modifying input or adding schema IDs', async () => {
  for (const name of ['compact', 'gallery', 'authoring-guide/manual']) {
    const document = JSON.parse(await fs.readFile(new URL(`../examples/${name}.json`, import.meta.url)));
    assert.deepEqual(fromEditorJSON(toEditorJSON(document)).document, document);
  }
  const input = fixture().document; delete input.cover;
  assert.deepEqual(fromEditorJSON(toEditorJSON(input)).document, input);
});

test('unsupported schema/block/nesting and non-JSON values are rejected without mutation', () => {
  for (const mutate of [d => d.schemaVersion = 2, d => d.pages[0].blocks[0].type = 'unknown', d => d.pages[0].blocks.at(-1).blocks.push({ type: 'columns', figure: figure(), blocks: [{ type: 'paragraph', text: 'nested' }] }), d => d.future = undefined, d => d.future = NaN]) {
    const d = fixture().document; mutate(d); const snapshot = structuredClone(d);
    assert.throws(() => toEditorJSON(d)); assert.deepEqual(d, snapshot);
  }
  const d = fixture().document; d.future = d;
  assert.throws(() => toEditorJSON(d), /JSON/);
});

test('property editing preserves unknown siblings, CRLF, absent flags and original review sidecars', () => {
  const before = fixture();
  const after = applyOperation(before, { type: 'set', path: ['pages', 0, 'blocks', 5, 'items', 0, 'text'], value: '수정\r\n본문' });
  const expected = structuredClone(before); expected.document.pages[0].blocks[5].items[0].text = '수정\r\n본문';
  assert.deepEqual(after, expected);
  assert.deepEqual(before, fixture());
  assert.throws(() => applyOperation(before, { type: 'set', path: ['future'], value: {} }), /read-only/);
  assert.throws(() => applyOperation(before, { type: 'set', path: ['schemaVersion'], value: 2 }), /read-only/);
});

test('optional field removal stays absent and incomplete text is a draft, never canonical', () => {
  const base = fixture();
  const noLead = applyOperation(base, { type: 'unset', path: ['pages', 0, 'lead'] });
  assert.equal(Object.hasOwn(noLead.document.pages[0], 'lead'), false);
  const draft = applyOperation(base, { type: 'set', path: ['title'], value: '' });
  assert.throws(() => toEditorJSON(draft.document));
  assert.equal(fromEditorJSON(toEditorJSON(draft.document, { validate: false }), { validate: false }).document.title, '');
  assert.throws(() => applyOperation(base, { type: 'unset', path: ['title'] }), /structural field/);
});

test('steps and pages move as whole structures with destination index measured after removal', () => {
  const input = fixture();
  const source = ['pages', 0, 'blocks', 5, 'items'], target = ['pages', 1, 'blocks', 0, 'items'];
  const after = applyOperation(input, { type: 'move', fromPath: source, fromIndex: 0, toPath: target, toIndex: 1 });
  assert.deepEqual(after.document.pages[1].blocks[0].items[1], input.document.pages[0].blocks[5].items[0]);
  assert.equal(after.document.pages[0].blocks[5].start, 7);
  assert.equal(Object.hasOwn(after.document.pages[1].blocks[0], 'start'), false);
  const swapped = applyOperation(after, { type: 'move', fromPath: ['pages'], fromIndex: 0, toPath: ['pages'], toIndex: 1 });
  assert.equal(swapped.document.pages[0].title, '둘째 과업');
  assert.deepEqual(swapped.document.pages[1], after.document.pages[0]);
  assert.throws(() => applyOperation(input, { type: 'move', fromPath: source, fromIndex: 0, toPath: ['pages'], toIndex: 0 }), /same array role/);
});

test('insert/remove and explicit step split preserve trailing blocks and calculate continuation start', () => {
  const base = fixture(), blocks = ['pages', 1, 'blocks'];
  const added = applyOperation(base, { type: 'insert', path: blocks, index: 1, value: { type: 'paragraph', text: '새 문단', unknown: false } });
  assert.deepEqual(applyOperation(added, { type: 'remove', path: blocks, index: 1 }), base);
  const split = applyOperation(base, { type: 'splitSteps', pageIndex: 0, blockIndex: 5, at: 1, title: '이어 하기' });
  assert.equal(split.document.pages[0].blocks[5].items.length, 1);
  assert.equal(split.document.pages[1].blocks[0].start, 8);
  assert.deepEqual(split.document.pages[1].blocks[0].items, base.document.pages[0].blocks[5].items.slice(1));
  assert.deepEqual(split.document.pages[1].blocks.slice(1), base.document.pages[0].blocks.slice(6));
  assert.equal(split.document.pages[2].title, '둘째 과업');
  assert.throws(() => applyOperation(base, { type: 'splitSteps', pageIndex: 0, blockIndex: 5, at: 0, title: 'invalid' }));
});

test('crop properties change without rewriting src, dimensions, extras or captions', () => {
  const base = fixture();
  const after = applyOperation(base, { type: 'set', path: ['pages', 0, 'blocks', 6, 'crop', 'x'], value: 2.75 }, { validate: true });
  const expected = structuredClone(base); expected.document.pages[0].blocks[6].crop.x = 2.75;
  assert.deepEqual(after, expected);
  assert.throws(() => applyOperation(base, { type: 'set', path: ['pages', 0, 'blocks', 6, 'crop', 'x'], value: 1000 }, { validate: true }), /crop/);
});

test('tampered editor structure, marked text and duplicate fields never silently normalize', () => {
  const base = toEditorJSON(fixture().document);
  const duplicate = structuredClone(base); duplicate.content[0].content.push(duplicate.content[0].content[0]);
  assert.throws(() => fromEditorJSON(duplicate), /duplicate/);
  const marked = structuredClone(base); findEditorNode(marked, ['title']).node.content[0].marks = [{ type: 'bold' }];
  assert.throws(() => fromEditorJSON(marked), /unmarked/);
  const unsupported = structuredClone(base); findEditorNode(unsupported, ['pages', 0, 'blocks', 0, 'type']).node.attrs.value = 'section';
  assert.throws(() => fromEditorJSON(unsupported, { validate: false }), /unsupported/);
});

test('composition guard returns before decoding, dispatching or replacing editor state', () => {
  let touched = false;
  const command = manualOperation({ type: 'set', path: ['title'], value: 'no' });
  assert.equal(command({ view: { composing: true }, get tr() { touched = true; throw new Error('must not read'); } }), false);
  assert.equal(touched, false);
});

test('text-only changes keep structural fingerprint; opaque/field deletion changes it', () => {
  const base = toEditorJSON(fixture().document), changed = structuredClone(base);
  findEditorNode(changed, ['title']).node.content[0].text = 'changed';
  assert.equal(structuralFingerprint(changed), structuralFingerprint(base));
  changed.content[0].content.pop();
  assert.notEqual(structuralFingerprint(changed), structuralFingerprint(base));
});

test('prototype-shaped unknown JSON remains an own property and never mutates prototypes', () => {
  const base = fixture();
  Object.defineProperty(base.document, '__proto__', { value: { injected: true }, enumerable: true });
  const after = fromEditorJSON(toEditorJSON(base.document));
  assert.equal(Object.hasOwn(after.document, '__proto__'), true);
  assert.equal(after.document.injected, undefined);
  assert.equal({}.injected, undefined);
});

test('container replacement cannot silently lose opaque fields, and draft nesting is restricted', () => {
  const base = fixture();
  const crop = structuredClone(figure().crop); delete crop.vendor;
  assert.throws(() => applyOperation(base, { type: 'set', path: ['pages', 0, 'blocks', 6, 'crop'], value: crop }), /opaque/);
  const nested = { type: 'columns', figure: figure(), blocks: [{ type: 'columns', figure: figure(), blocks: [{ type: 'paragraph', text: 'nested' }] }] };
  assert.throws(() => applyOperation(base, { type: 'insert', path: ['pages', 1, 'blocks'], index: 0, value: nested }), /nested columns/);
});
