import {TextSelection,NodeSelection} from '@tiptap/pm/state';
import {closeHistory} from '@tiptap/pm/history';
import {manualPaginationMarker} from './manual-pagination-meta.mjs';

// Backspace on the empty title exits a placeholder toggle. A populated toggle
// is selected first so the same gesture cannot silently discard its body.
export function deleteEmptyManualToggleAtStart(state,dispatch,view){
 const {selection}=state,{$from}=selection;
 if(view?.composing||view?.editable===false||!(selection instanceof TextSelection)||!selection.empty||$from.parent.type.name!=='toggleTitle'||$from.parentOffset!==0||$from.parent.content.size||$from.depth<2)return false;
 if(view?.state&&view.state!==state)return true;
 const depth=$from.depth-1,toggle=$from.node(depth),parent=$from.node(depth-1),index=$from.index(depth-1),pos=$from.before(depth);
 if(toggle.type.name!=='toggle')return false;
 const body=[];toggle.forEach((node,_offset,i)=>{if(i)body.push(node);});
 let fragmented=!!manualPaginationMarker(toggle.attrs.meta?.extensions,'block')||body.some(node=>manualPaginationMarker(node.attrs.meta?.extensions,'block'));
 state.doc.descendants(node=>{const marker=manualPaginationMarker(node.attrs.meta?.extensions,'block');if(marker?.rootBlockId===toggle.attrs.id)fragmented=true;});
 const empty=!fragmented&&body.every(node=>node.type.name==='paragraph'&&!node.content.size),paragraph=state.schema.nodes.paragraph;
 if(!empty||!parent.canReplaceWith(index,index+1,paragraph)){
  if(dispatch)dispatch(state.tr.setSelection(NodeSelection.create(state.doc,pos)).scrollIntoView());
  return true;
 }
 if(!dispatch)return true;
 const meta=structuredClone(toggle.attrs.meta||{}),extensions=meta.extensions||{};let key='convertedManualBlock',suffix=2;
 while(Object.hasOwn(extensions,key))key=`convertedManualBlock${suffix++}`;
 // Preserve opaque fields and placeholder identities even after the disclosure
 // is removed. Undo restores the exact original node, including its title.
 extensions[key]={...structuredClone(toggle.attrs.meta||{}),id:toggle.attrs.id,type:'toggle',blocks:body.map(node=>node.toJSON())};meta.extensions=extensions;delete meta.open;
 const replacement=paragraph.create({...toggle.attrs,meta});
 const tr=closeHistory(state.tr).replaceWith(pos,pos+toggle.nodeSize,replacement);
 tr.setSelection(TextSelection.create(tr.doc,pos+1)).setStoredMarks(state.storedMarks);
 dispatch(tr.scrollIntoView());return true;
}
