import { validateDocument } from '../../../../src/validate.mjs';
import { MODEL_CONTRACT, OBJECT_NODES, ARRAY_ITEMS, BLOCK_TYPES, fieldRole, requiredFields, cloneJSON } from '../editor/model-contract.mjs';

const fail = (at, message) => { throw new Error(`${at}: ${message}`); };
const own = (o, k, v) => Object.defineProperty(o, k, { value: v, enumerable: true, configurable: true, writable: true });
function assertHierarchy(document) {
  const walk = (blocks, inColumns = false) => {
    if (!Array.isArray(blocks)) return;
    for (const block of blocks) if (block?.type === 'columns') {
      if (inColumns) fail('document', 'nested columns are not supported');
      walk(block.blocks, true);
    }
  };
  walk(document.cover?.blocks);
  for (const page of document.pages || []) walk(page.blocks);
}
function shape(value, role, at) {
  if (role === 'opaque') return;
  if (role === 'text' || (role === 'listItem' && typeof value === 'string')) { if (typeof value !== 'string') fail(at, 'text required'); return; }
  if (role === 'constant') return;
  if (role === 'number' || role === 'boolean') { if (typeof value !== role) fail(at, `${role} required`); return; }
  if (ARRAY_ITEMS[role]) { if (!Array.isArray(value)) fail(at, 'array required'); return; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(at, 'object required');
  if (role === 'document' && value.schemaVersion !== 1) fail(at, 'unsupported schemaVersion');
  if (role === 'block' && !BLOCK_TYPES.includes(value.type)) fail(at, `unsupported block type ${value.type}`);
  for (const key of requiredFields(role, value)) if (!Object.hasOwn(value, key)) fail(at, `missing structural field ${key}`);
}
function encode(value, role, at) {
  shape(value, role, at);
  if (role === 'opaque' || ['constant', 'number', 'boolean'].includes(role)) return { type: 'manualValue', attrs: { value, opaque: role === 'opaque' } };
  if (role === 'text' || (role === 'listItem' && typeof value === 'string')) return { type: 'manualString', ...(value.length ? { content: [{ type: 'text', text: value }] } : {}) };
  if (ARRAY_ITEMS[role]) return { type: 'manualArray', content: value.map((v, i) => encode(v, ARRAY_ITEMS[role], `${at}[${i}]`)) };
  return { type: OBJECT_NODES[role], content: Object.keys(value).map(key => ({ type: 'manualField', attrs: { key }, content: [encode(value[key], fieldRole(role, key, value) || 'opaque', `${at}.${key}`)] })) };
}
function decode(node, role, at) {
  if (!node || typeof node !== 'object' || node.marks?.length) fail(at, 'invalid or marked node');
  const children = node.content || [];
  if (!Array.isArray(children)) fail(at, 'node content must be an array');
  if (role === 'opaque' || ['constant', 'number', 'boolean'].includes(role)) {
    if (node.type !== 'manualValue' || !node.attrs || !Object.hasOwn(node.attrs, 'value') || children.length || Boolean(node.attrs.opaque) !== (role === 'opaque')) fail(at, 'value node required');
    shape(node.attrs.value, role, at); return cloneJSON(node.attrs.value);
  }
  if (role === 'text' || (role === 'listItem' && node.type === 'manualString')) {
    if (node.type !== 'manualString') fail(at, 'string node required');
    return children.map(n => {
      if (n.type !== 'text' || typeof n.text !== 'string' || n.marks?.length || n.content?.length) fail(at, 'plain unmarked text required');
      return n.text;
    }).join('');
  }
  if (ARRAY_ITEMS[role]) {
    if (node.type !== 'manualArray') fail(at, 'array node required');
    return children.map((n, i) => decode(n, ARRAY_ITEMS[role], `${at}[${i}]`));
  }
  if (node.type !== OBJECT_NODES[role]) fail(at, `expected ${OBJECT_NODES[role]}`);
  const value = {};
  if (role === 'block') {
    const typeField = children.find(n => n.attrs?.key === 'type');
    own(value, 'type', decode(typeField?.content?.[0], 'constant', `${at}.type`));
    if (!BLOCK_TYPES.includes(value.type)) fail(at, `unsupported block type ${value.type}`);
  }
  const keys = new Set();
  for (const field of children) {
    const key = field.attrs?.key;
    if (field.type !== 'manualField' || typeof key !== 'string' || keys.has(key) || field.content?.length !== 1 || field.marks?.length) fail(at, 'malformed or duplicate field');
    keys.add(key);
    own(value, key, decode(field.content[0], fieldRole(role, key, value) || 'opaque', `${at}.${key}`));
  }
  shape(value, role, at);
  return value;
}

/** Only this format is editable. Unsupported input throws without mutating it. */
export function toEditorJSON(document, { sidecars = {}, validate = true } = {}) {
  const copy = cloneJSON(document, 'document');
  if (validate) validateDocument(copy);
  assertHierarchy(copy);
  return { type: 'doc', attrs: { contract: MODEL_CONTRACT, sidecars: cloneJSON(sidecars, 'sidecars') }, content: [encode(copy, 'document', 'document')] };
}
/** Default is the canonical save/preview gate; validate:false is draft-only. */
export function fromEditorJSON(editorJSON, { validate = true } = {}) {
  if (editorJSON?.type !== 'doc' || editorJSON.attrs?.contract !== MODEL_CONTRACT || editorJSON.content?.length !== 1 || editorJSON.marks?.length) fail('editor', 'unsupported editor contract');
  const document = decode(editorJSON.content[0], 'document', 'document');
  assertHierarchy(document);
  if (validate) validateDocument(document);
  return { document, sidecars: cloneJSON(editorJSON.attrs.sidecars, 'sidecars') };
}

/** Paths refer to Manual data, not Tiptap positions; recalculate after each edit. */
export function findEditorNode(editorJSON, path) {
  if (!Array.isArray(path)) throw new Error('path must be an array');
  let node = editorJSON.content[0], pos = 0;
  const size = n => n.type === 'text' ? n.text.length : n.type === 'manualValue' ? 1 : 2 + (n.content || []).reduce((sum, child) => sum + size(child), 0);
  for (const key of path) {
    if (node.type === 'manualArray') {
      if (!Number.isInteger(key) || key < 0 || key >= (node.content || []).length) throw new Error('array path not found');
      pos += 1 + node.content.slice(0, key).reduce((sum, child) => sum + size(child), 0);
      node = node.content[key];
    } else {
      const index = (node.content || []).findIndex(n => n.type === 'manualField' && n.attrs.key === key);
      if (index < 0) throw new Error('field path not found');
      pos += 2 + node.content.slice(0, index).reduce((sum, child) => sum + size(child), 0);
      node = node.content[index].content[0];
    }
  }
  return { node, pos, size: size(node) };
}

export function textSelectionPath(editorJSON, position) {
  const walk = (node, path) => {
    const found = findEditorNode(editorJSON, path);
    if (position < found.pos || position > found.pos + found.size) return null;
    if (node.type === 'manualString') return { path, offset: Math.max(0, Math.min(found.size - 2, position - found.pos - 1)) };
    for (let i = 0; i < (node.content || []).length; i++) {
      const child = node.content[i];
      const hit = node.type === 'manualArray' ? walk(child, [...path, i]) : child.type === 'manualField' ? walk(child.content[0], [...path, child.attrs.key]) : null;
      if (hit) return hit;
    }
    return null;
  };
  return walk(editorJSON.content[0], []);
}
