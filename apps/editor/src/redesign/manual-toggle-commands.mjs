import {TextSelection} from '@tiptap/pm/state';

const graphemes=new Intl.Segmenter(undefined,{granularity:'grapheme'});
// The disclosure button and hidden body can affect native browser deletion.
// Delete title text through PM rather than relying on that DOM fallback.
export function deleteManualToggleTitleBackward(state,dispatch,view){
 const {selection}=state,{$from}=selection;
 if(view?.composing||view?.editable===false||!(selection instanceof TextSelection)||!selection.empty||$from.parent.type.name!=='toggleTitle'||$from.parentOffset===0)return false;
 if(view?.state&&view.state!==state)return true;
 const text=$from.parent.textBetween(0,$from.parentOffset,'','\uFFFC'),segments=[...graphemes.segment(text)],last=segments.at(-1);
 if(!last)return false;
 if(dispatch){
  const tr=state.tr.delete($from.start()+last.index,$from.pos);
  tr.setSelection(TextSelection.create(tr.doc,$from.start()+last.index)).setStoredMarks(state.storedMarks);
  dispatch(tr.scrollIntoView());
 }
 return true;
}
