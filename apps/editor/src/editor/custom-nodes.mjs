import { MODEL_CONTRACT, OBJECT_NODES } from './model-contract.mjs';
import { createManualCommandExtension } from './commands.mjs';

/** Inject the approved Tiptap runtime. No StarterKit or second history extension. */
export function createManualExtensions(runtime) {
  const { Node } = runtime;
  if (!Node?.create) throw new Error('inject Node from @tiptap/core');
  const nodes = [
    Node.create({
      name: 'doc', topNode: true, content: 'manualDocument',
      addAttributes: () => ({ contract: { default: MODEL_CONTRACT, rendered: false }, sidecars: { default: {}, rendered: false } }),
    }),
    Node.create({ name: 'text', group: 'inline' }),
    ...[...new Set(Object.values(OBJECT_NODES))].map(name => Node.create({
      name, group: 'manualValueGroup', content: 'manualField*', isolating: true, defining: true,
      parseHTML: () => [],
      renderHTML: () => ['div', { 'data-manual-node': name }, 0],
    })),
    Node.create({
      name: 'manualField', content: 'manualValueGroup', isolating: true, defining: true,
      addAttributes: () => ({ key: { default: null, rendered: false } }),
      parseHTML: () => [],
      renderHTML: ({ node }) => ['div', { 'data-manual-field': node.attrs.key }, 0],
    }),
    Node.create({
      name: 'manualArray', group: 'manualValueGroup', content: 'manualValueGroup*', isolating: true,
      parseHTML: () => [], renderHTML: () => ['div', { 'data-manual-node': 'array' }, 0],
    }),
    Node.create({
      name: 'manualString', group: 'manualValueGroup', content: 'text*', marks: '', code: true, whitespace: 'pre', isolating: true,
      parseHTML: () => [], renderHTML: () => ['div', { 'data-manual-node': 'text', style: 'white-space:pre-wrap' }, 0],
    }),
    Node.create({
      name: 'manualValue', group: 'manualValueGroup', atom: true, selectable: false,
      addAttributes: () => ({ value: { default: null, rendered: false }, opaque: { default: false, rendered: false } }),
      parseHTML: () => [],
      renderHTML: ({ node }) => ['span', { contenteditable: 'false', 'data-manual-node': 'value' }, node.attrs.opaque ? '보존 데이터' : String(node.attrs.value)],
    }),
  ];
  return [...nodes, createManualCommandExtension(runtime)];
}
