import {getManualCoverProjection} from './manual-cover-legacy-projection.mjs';

/** The app NodeView owns heading classes, so it must retain cover role styling. */
export function createManualHeadingNodeView(initial,ownerDocument){
 let node=initial;const level=node.attrs.level||3,dom=ownerDocument.createElement(`h${level}`);
 const render=()=>{
  dom.dataset.manualId=node.attrs.id||'';dom.dataset.manualNode='heading';dom.dataset.manualKind='heading';
  const marker=getManualCoverProjection(node.attrs.meta?.extensions),role=marker?.blockId===node.attrs.id&&['title','sectionTitle'].includes(marker.role)?marker.role:null;
  dom.className=role==='title'?'manual-v2-cover-title':role==='sectionTitle'?'lds-manual-section-title':`lds-manual-subheading manual-v2-heading${level}`;
  if(role)dom.dataset.manualCoverRole=role;else delete dom.dataset.manualCoverRole;
 };
 render();return {dom,contentDOM:dom,update(next){if(next.type!==node.type||next.attrs.level!==level)return false;node=next;render();return true;}};
}
