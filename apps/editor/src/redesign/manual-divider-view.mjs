import {findManualObject,selectManualObject} from './manual-kernel.mjs';
import {getManualCoverProjection} from './manual-cover-legacy-projection.mjs';
import {resolveManualDividerStyle} from './manual-divider-style.mjs';

// Screen hit chrome is CSS-only; the actual HR remains the model/measurement box.
export function createManualDividerNodeView(initialNode,view,owner){
 let node=initialNode,alive=true;
 const dom=owner.createElement('hr'),handled=new WeakSet();dom.className='manual-v2-divider-block';
 function render(){
  dom.dataset.manualId=node.attrs.id||'';dom.dataset.manualNode=node.type.name;dom.dataset.manualKind=node.type.name;
  const marker=getManualCoverProjection(node.attrs.meta?.extensions);
  const cover=marker?.role==='divider'&&marker.blockId===node.attrs.id;
  if(cover)dom.dataset.manualCoverRole='divider';else delete dom.dataset.manualCoverRole;
  dom.dataset.manualDividerVariant=resolveManualDividerStyle(node.attrs.meta?.extensions,{cover});
 }
 function down(event){
  if(!alive||!view?.editable||view.composing||event.defaultPrevented||event.isComposing||event.keyCode===229||event.button!==0||event.shiftKey||event.ctrlKey||event.metaKey||event.altKey||dom.isConnected===false)return;
  if(view.props?.manualTableSelectionGestureBlocked?.(view,event)){handled.add(event);event.preventDefault();return;}
  const current=findManualObject(view.state,node.attrs.id);
  if(!current||current.node.type!==node.type)return;
  // Absolute hit chrome can be outside the HR rectangle; select by current ID,
  // rather than asking PM to infer a text position from that whitespace.
  if(selectManualObject(node.attrs.id,{text:false})(view.state,view.dispatch,view)){
   handled.add(event);event.preventDefault();view.focus?.();
  }
 }
 render();dom.addEventListener('mousedown',down);
 return {dom,update(next){if(next.type!==node.type)return false;node=next;render();return true;},stopEvent:event=>handled.has(event),destroy(){alive=false;dom.removeEventListener('mousedown',down);}};
}
