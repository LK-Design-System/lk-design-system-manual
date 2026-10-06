export const MODEL_CONTRACT = 'lds-manual-editor/v1';
export const BLOCK_TYPES = Object.freeze(['paragraph', 'subheading', 'address', 'quote', 'list', 'steps', 'figure', 'table', 'callout', 'help', 'columns']);
export const OBJECT_NODES = Object.freeze({ document: 'manualDocument', cover: 'manualCover', page: 'manualPage', block: 'manualBlock', step: 'manualStep', figure: 'manualFigure', logo: 'manualRecord', metadataItem: 'manualRecord', listItem: 'manualRecord', crop: 'manualRecord' });
export const ARRAY_ITEMS = Object.freeze({ pages: 'page', blocks: 'block', steps: 'step', list: 'listItem', metadata: 'metadataItem', headers: 'text', rows: 'row', row: 'text' });
export function requiredFields(role, value) {
  if (role === 'block') return { paragraph: ['type', 'text'], subheading: ['type', 'text'], quote: ['type', 'text'], address: ['type', 'value'], list: ['type', 'items'], steps: ['type', 'items'], figure: ['type', 'src', 'alt', 'caption'], table: ['type', 'label', 'headers', 'rows'], callout: ['type', 'title', 'text'], help: ['type', 'title', 'text'], columns: ['type', 'figure', 'blocks'] }[value.type] || [];
  return { document: ['schemaVersion', 'title', 'pages'], cover: ['title', 'metadata', 'blocks'], page: ['title', 'blocks'], step: ['title'], figure: ['src', 'alt', 'caption'], logo: ['src', 'alt'], metadataItem: ['label', 'value'], listItem: ['label', 'value'], crop: ['x', 'y', 'width', 'height', 'sourceWidth', 'sourceHeight'] }[role] || [];
}
const fields = {
  document: { schemaVersion: 'constant', title: 'text', lang: 'text', cover: 'cover', pages: 'pages' },
  cover: { title: 'text', sectionTitle: 'text', logo: 'logo', metadata: 'metadata', blocks: 'blocks' },
  page: { title: 'text', lead: 'text', blocks: 'blocks' },
  logo: { src: 'text', alt: 'text' },
  metadataItem: { label: 'text', value: 'text' },
  listItem: { label: 'text', value: 'text', emphasis: 'boolean', labelEmphasis: 'boolean' },
  step: { title: 'text', text: 'text', quote: 'text', figure: 'figure' },
  figure: { src: 'text', alt: 'text', caption: 'text', size: 'text', previewTitle: 'text', crop: 'crop' },
  crop: { x: 'number', y: 'number', width: 'number', height: 'number', sourceWidth: 'number', sourceHeight: 'number' },
};
const blockFields = {
  paragraph: { text: 'text' }, subheading: { text: 'text' }, quote: { text: 'text' }, address: { value: 'text' },
  list: { items: 'list' }, steps: { items: 'steps', start: 'number' }, figure: fields.figure,
  table: { label: 'text', headers: 'headers', rows: 'rows' },
  callout: { title: 'text', text: 'text', tone: 'text' }, help: { title: 'text', text: 'text', tone: 'text' },
  columns: { figure: 'figure', blocks: 'blocks' },
};
export function fieldRole(role, key, object) {
  const shape = role === 'block' ? { type: 'constant', ...blockFields[object.type] } : fields[role];
  return shape && Object.hasOwn(shape, key) ? shape[key] : null;
}
export function cloneJSON(value, at = 'value') {
  const seen = new Set();
  function check(v, path) {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
    if (typeof v === 'number' && Number.isFinite(v) && !Object.is(v, -0)) return;
    if (!v || typeof v !== 'object' || seen.has(v)) throw new Error(`${path}: plain JSON required`);
    if (!Array.isArray(v) && ![Object.prototype, null].includes(Object.getPrototypeOf(v))) throw new Error(`${path}: plain object required`);
    seen.add(v);
    if (Object.getOwnPropertySymbols(v).length) throw new Error(`${path}: symbol fields are not JSON`);
    if (Array.isArray(v) && (Object.keys(v).length !== v.length || Array.from({ length: v.length }, (_, i) => i).some(i => !Object.hasOwn(v, i)))) throw new Error(`${path}: dense JSON array required`);
    for (const key of Object.keys(v)) {
      const d = Object.getOwnPropertyDescriptor(v, key);
      if (!d || !('value' in d)) throw new Error(`${path}: getters are not JSON`);
      check(d.value, `${path}.${key}`);
    }
    seen.delete(v);
  }
  check(value, at);
  return structuredClone(value);
}
