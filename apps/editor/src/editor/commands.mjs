import { fromEditorJSON, toEditorJSON, findEditorNode, textSelectionPath } from '../manual-adapter/index.mjs';
import { applyOperation } from '../manual-adapter/operations.mjs';

export const MANUAL_OPERATION = 'lds-manual-operation';
export const MANUAL_HISTORY_BOUNDARY = 'lds-manual-history-boundary';

/** A real Tiptap command. Runtime injection avoids installing/duplicating PM. */
export function manualOperation(operation, { closeHistory, TextSelection, onError = () => {} } = {}) {
  return props => {
    const view = props.view || props.editor?.view;
    if (view?.composing) return false;
    const { tr, state, dispatch } = props;
    try {
      const beforeJSON = tr.doc.toJSON();
      const current = fromEditorJSON(beforeJSON, { validate: false });
      const next = applyOperation(current, operation);
      const nextJSON = toEditorJSON(next.document, { sidecars: next.sidecars, validate: false });
      const nextDoc = state.schema.nodeFromJSON(nextJSON);
      nextDoc.check();
      const start = tr.doc.content.findDiffStart(nextDoc.content);
      if (start === null) return false;
      if (!dispatch) return true;
      if (typeof closeHistory !== 'function' || !TextSelection?.create) throw new Error('inject closeHistory and TextSelection from the same @tiptap/pm runtime');
      const anchor = textSelectionPath(beforeJSON, tr.selection.anchor);
      const head = textSelectionPath(beforeJSON, tr.selection.head);
      closeHistory(tr);
      // Domain containers must never be fitted into a neighboring field by PM's replace fitter.
      // A complete structured replacement remains one undoable transaction, not setContent.
      tr.replaceWith(0, tr.doc.content.size, nextDoc.content);
      if (TextSelection && anchor && head) {
        const resolve = point => {
          const path = mapSelectionPath(point.path, operation);
          if (!path) return null;
          try {
            const found = findEditorNode(nextJSON, path);
            return found.node.type === 'manualString' ? found.pos + 1 + Math.min(point.offset, found.size - 2) : null;
          } catch { return null; }
        };
        const a = resolve(anchor), b = resolve(head);
        if (a !== null && b !== null) tr.setSelection(TextSelection.create(tr.doc, a, b));
      }
      tr.setMeta(MANUAL_OPERATION, { type: operation.type });
      tr.setMeta('addToHistory', true);
      // Tiptap dispatches this chain transaction; do not dispatch it a second time here.
      return true;
    } catch (error) { onError(error); return false; }
  };
}

/** Exclude plain text only, so ordinary editor transactions cannot delete structure. */
export function structuralFingerprint(json) {
  const visit = node => {
    if (node.type === 'manualString') return { ...node, content: [] };
    return { ...node, ...(node.content ? { content: node.content.map(visit) } : {}) };
  };
  return JSON.stringify(visit(json));
}

export function createManualCommandExtension({ Extension, Plugin, PluginKey, TextSelection, history, closeHistory, undo, redo, onError = () => {}, onUnsupportedPaste = () => {} }) {
  for (const [name, value] of Object.entries({ Extension, Plugin, PluginKey, TextSelection, history, closeHistory, undo, redo })) if (!value) throw new Error(`missing runtime ${name}`);
  return Extension.create({
    name: 'manualCommands',
    addCommands() {
      return {
        applyManualOperation: operation => manualOperation(operation, { closeHistory, TextSelection, onError }),
        manualUndo: () => ({ state, dispatch, editor }) => !editor.view.composing && undo(state, dispatch),
        manualRedo: () => ({ state, dispatch, editor }) => !editor.view.composing && redo(state, dispatch),
      };
    },
    addKeyboardShortcuts() {
      return {
        'Mod-z': () => this.editor.commands.manualUndo(),
        'Mod-Shift-z': () => this.editor.commands.manualRedo(),
        'Mod-y': () => this.editor.commands.manualRedo(),
        Enter: () => insertNewline(this.editor),
        'Shift-Enter': () => insertNewline(this.editor),
      };
    },
    addProseMirrorPlugins() {
      const historyPlugin = history();
      return [historyPlugin, new Plugin({
        key: new PluginKey('manualModelGuard'),
        filterTransaction(tr, state) {
          if (!tr.docChanged) return true;
          try {
            fromEditorJSON(tr.doc.toJSON(), { validate: false });
            // Undo/redo must also restore structure; PM history marks its own transactions.
            if (tr.getMeta(MANUAL_OPERATION) || tr.getMeta(historyPlugin)) return true;
            if (structuralFingerprint(tr.doc.toJSON()) !== structuralFingerprint(state.doc.toJSON())) throw new Error('use a Manual command to change document structure');
            return true;
          } catch (error) { onError(error); return false; }
        },
        appendTransaction(transactions, _old, state) {
          if (!transactions.some(tr => tr.getMeta(MANUAL_OPERATION))) return null;
          // Close AFTER the structural operation so subsequent typing is a different undo group.
          return closeHistory(state.tr).setMeta(MANUAL_HISTORY_BOUNDARY, true).setMeta('addToHistory', false);
        },
        props: {
          handlePaste(view, event) {
            if (view.composing) return true;
            const clipboard = event.clipboardData;
            if (!clipboard) return true;
            if (clipboard.getData('text/html') || clipboard.files?.length) { onUnsupportedPaste(event); return true; }
            const { $from, $to } = view.state.selection;
            if ($from.parent.type.name !== 'manualString' || !$from.sameParent($to)) return true;
            view.dispatch(view.state.tr.insertText(clipboard.getData('text/plain')));
            return true;
          },
          handleDrop(_view, event) { onUnsupportedPaste(event); return true; },
        },
      })];
    },
  });
}

const startsWith = (path, prefix) => prefix.length <= path.length && prefix.every((part, i) => path[i] === part);
function shifted(path, arrayPath, index, delta) {
  if (!path || !startsWith(path, arrayPath) || !Number.isInteger(path[arrayPath.length])) return path;
  const current = path[arrayPath.length];
  if (delta < 0 && current === index) return null;
  const result = [...path];
  if (current >= index) result[arrayPath.length] += delta;
  return result;
}
export function mapSelectionPath(path, op) {
  if (op.type === 'insert') return shifted(path, op.path, op.index, 1);
  if (op.type === 'remove') return shifted(path, op.path, op.index, -1);
  if (op.type === 'unset' && startsWith(path, op.path)) return null;
  if (op.type === 'move') {
    const target = shifted(op.toPath, op.fromPath, op.fromIndex, -1);
    const moved = [...op.fromPath, op.fromIndex];
    if (startsWith(path, moved)) return [...target, op.toIndex, ...path.slice(moved.length)];
    return shifted(shifted(path, op.fromPath, op.fromIndex, -1), target, op.toIndex, 1);
  }
  if (op.type === 'splitSteps' && path[0] === 'pages') {
    const result = [...path];
    if (path[1] > op.pageIndex) result[1]++;
    if (path[1] === op.pageIndex && path[2] === 'blocks') {
      if (path[3] > op.blockIndex) { result[1]++; result[3] -= op.blockIndex; }
      else if (path[3] === op.blockIndex && path[4] === 'items' && path[5] >= op.at) { result[1]++; result[3] = 0; result[5] -= op.at; }
    }
    return result;
  }
  return path;
}

function insertNewline(editor) {
  if (editor.view.composing) return false;
  const { $from, $to } = editor.state.selection;
  if ($from.parent.type.name !== 'manualString' || !$from.sameParent($to)) return false;
  editor.view.dispatch(editor.state.tr.insertText('\n'));
  return true;
}
