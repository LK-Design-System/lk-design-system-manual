import {findEditorNode} from '../manual-adapter/index.mjs';

// All canvas input enters the existing PM history. The canvas keeps only the
// active DOM composition; it has no document model or independent undo stack.
export function replaceManualText(editor,path,text,{TextSelection,closeHistory},boundary=false){
  const found=findEditorNode(editor.getJSON(),path);
  if(found.node.type!=='manualString'||typeof text!=='string')throw new Error('편집할 문구를 다시 선택하세요.');
  const before=editor.state.doc.nodeAt(found.pos).textContent;
  if(before===text)return false;
  let prefix=0,suffix=0;
  while(prefix<before.length&&prefix<text.length&&before[prefix]===text[prefix])prefix++;
  while(suffix<before.length-prefix&&suffix<text.length-prefix&&before.at(-1-suffix)===text.at(-1-suffix))suffix++;
  let tr=editor.state.tr;
  if(boundary)tr=closeHistory(tr);
  tr.insertText(text.slice(prefix,text.length-suffix),found.pos+1+prefix,found.pos+1+before.length-suffix);
  tr.setSelection(TextSelection.create(tr.doc,found.pos+1+text.length));
  editor.view.dispatch(tr);
  return true;
}
