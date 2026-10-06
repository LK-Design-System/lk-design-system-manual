import { ARRAY_ITEMS, fieldRole, cloneJSON } from '../editor/model-contract.mjs';
import { toEditorJSON, fromEditorJSON } from './index.mjs';

function locate(doc, path, allowMissingLast = false) {
  if (!Array.isArray(path)) throw new Error('path must be an array');
  let value = doc, role = 'document';
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    if (ARRAY_ITEMS[role]) {
      if (!Number.isInteger(key) || key < 0 || key >= value.length) throw new Error('invalid array index');
      role = ARRAY_ITEMS[role];
    } else {
      if (!value || typeof value !== 'object' || typeof key !== 'string') throw new Error('invalid object path');
      role = fieldRole(role, key, value);
      if (!role || role === 'constant') throw new Error('unknown/identity fields are read-only');
    }
    if (!Object.hasOwn(value, key) && !(allowMissingLast && i === path.length - 1)) throw new Error('path not found');
    value = value[key];
  }
  return { value, role };
}
function array(doc, path) {
  const found = locate(doc, path);
  if (!ARRAY_ITEMS[found.role] || !Array.isArray(found.value)) throw new Error('array required');
  return found;
}
function index(value, length, end = false) { if (!Number.isInteger(value) || value < 0 || value >= length + (end ? 1 : 0)) throw new Error('index out of range'); }
const define = (obj, key, value) => Object.defineProperty(obj, key, { value, configurable: true, writable: true, enumerable: true });
const sameJSON = (a, b) => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(k => Object.hasOwn(b, k) && sameJSON(a[k], b[k]));
};
function preserveOpaque(before, after, role) {
  if (!before || typeof before !== 'object') return;
  if (ARRAY_ITEMS[role]) {
    if (!Array.isArray(after) || before.length !== after.length) throw new Error('use insert/remove/move for array structure');
    before.forEach((value, i) => preserveOpaque(value, after[i], ARRAY_ITEMS[role]));
    return;
  }
  for (const key of Object.keys(before)) {
    const childRole = fieldRole(role, key, before);
    if (!childRole) {
      if (!after || !Object.hasOwn(after, key) || !sameJSON(before[key], after[key])) throw new Error('replacement would lose opaque fields; edit known leaves instead');
    } else preserveOpaque(before[key], after?.[key], childRole);
  }
}

/** Pure commands: returned draft may be incomplete, but never silently drops fields. */
export function applyOperation(envelope, operation, { validate = false } = {}) {
  const doc = cloneJSON(envelope.document), sidecars = cloneJSON(envelope.sidecars ?? {});
  const op = cloneJSON(operation);
  if (op.type === 'set' || op.type === 'unset') {
    if (!op.path?.length) throw new Error('document replacement is not a property operation');
    const target = locate(doc, op.path, op.type === 'set');
    const parent = locate(doc, op.path.slice(0, -1)).value, key = op.path.at(-1);
    if (op.type === 'unset') {
      if (Array.isArray(parent)) throw new Error('use remove for array items');
      delete parent[key];
    } else { preserveOpaque(target.value, op.value, target.role); define(parent, key, op.value); }
  } else if (op.type === 'insert' || op.type === 'remove') {
    const { value } = array(doc, op.path);
    index(op.index, value.length, op.type === 'insert');
    value.splice(op.index, op.type === 'insert' ? 0 : 1, ...(op.type === 'insert' ? [op.value] : []));
  } else if (op.type === 'move') {
    const source = array(doc, op.fromPath), target = array(doc, op.toPath);
    if (source.role !== target.role) throw new Error('move requires the same array role');
    index(op.fromIndex, source.value.length);
    const item = source.value[op.fromIndex];
    // Reject moving an ancestor into its own descendant.
    const prefix = [...op.fromPath, op.fromIndex];
    if (prefix.every((key, i) => op.toPath[i] === key) && op.toPath.length >= prefix.length) throw new Error('cannot move into own descendant');
    const destinationLength = target.value.length - (source.value === target.value ? 1 : 0);
    index(op.toIndex, destinationLength, true);
    source.value.splice(op.fromIndex, 1);
    target.value.splice(op.toIndex, 0, item);
  } else if (op.type === 'splitSteps') {
    index(op.pageIndex, doc.pages.length);
    const page = doc.pages[op.pageIndex]; index(op.blockIndex, page.blocks.length);
    const block = page.blocks[op.blockIndex];
    if (block.type !== 'steps' || !Number.isInteger(op.at) || op.at <= 0 || op.at >= block.items.length || typeof op.title !== 'string' || !op.title.trim()) throw new Error('split requires an interior step and a new page title');
    const nextBlock = cloneJSON(block);
    nextBlock.items = block.items.splice(op.at);
    nextBlock.start = (block.start ?? 1) + op.at;
    const following = page.blocks.splice(op.blockIndex + 1);
    const nextPage = { title: op.title, ...(Object.hasOwn(op, 'lead') ? { lead: op.lead } : {}), blocks: [nextBlock, ...following] };
    doc.pages.splice(op.pageIndex + 1, 0, nextPage);
  } else throw new Error(`unsupported operation ${op.type}`);
  // Re-encode/decode also checks roles while draft validation is intentionally deferred.
  return fromEditorJSON(toEditorJSON(doc, { sidecars, validate }), { validate });
}
