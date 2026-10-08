import {TextSelection} from '@tiptap/pm/state';
import {closeHistory} from '@tiptap/pm/history';
import {manualPaginationMarker} from './manual-pagination-meta.mjs';

// A quote frame is isolating, so PM's ordinary Backspace cannot lift its
// placeholder. Limit the escape to one genuinely empty, directly authored body.
export function deleteEmptyManualBlockAtStart(state,dispatch,view){
 if(view?.composing||view?.editable===false)return false;
 const {selection}=state,{$from}=selection;
 if(!(selection instanceof TextSelection)||!selection.empty||$from.parentOffset!==0||$from.parent.type.name!=='paragraph'||$from.parent.content.size||$from.depth<3)return false;
 const depth=$from.depth-1,quote=$from.node(depth),parent=$from.node(depth-1);
 if(quote.type.name!=='quote'||quote.childCount!==1||!['page','cover','coverBody','coverSectionFrame'].includes(parent.type.name))return false;
 // A visually empty fragment is not an empty logical quote. Leave its family
 // to the page-boundary command rather than orphaning a continuation's root ID.
 if(manualPaginationMarker(quote.attrs.meta?.extensions,'block')||manualPaginationMarker(quote.firstChild.attrs.meta?.extensions,'block'))return false;
 let continued=false;
 state.doc.descendants(node=>{if(manualPaginationMarker(node.attrs.meta?.extensions,'block')?.rootBlockId===quote.attrs.id)continued=true;});
 if(continued)return false;
 const index=$from.index(depth-1),paragraph=state.schema.nodes.paragraph;
 if(!parent.canReplaceWith(index,index+1,paragraph))return false;
 if(!dispatch)return true;
 // Keep the editable body's identity; retain the removed frame's identity and
 // opaque fields as provenance rather than discarding them with its decoration.
 const body=quote.firstChild,meta=structuredClone(body.attrs.meta||{}),extensions=meta.extensions||{};
 let key='convertedManualBlock',suffix=2;
 while(Object.hasOwn(extensions,key))key=`convertedManualBlock${suffix++}`;
 extensions[key]={...structuredClone(quote.attrs.meta||{}),id:quote.attrs.id,type:'quote'};
 meta.extensions=extensions;
 const replacement=paragraph.create({...body.attrs,meta},body.content,body.marks),pos=$from.before(depth);
 const tr=closeHistory(state.tr).replaceWith(pos,pos+quote.nodeSize,replacement);
 tr.setSelection(TextSelection.create(tr.doc,pos+1)).setStoredMarks(state.storedMarks);
 dispatch(tr.scrollIntoView());return true;
}
