import {getManualTableLayout,readManualTableCellLayout} from './manual-table-layout.mjs';
import {getManualCoverProjection} from './manual-cover-legacy-projection.mjs';
export function applyManualTableRowLayout(dom,node){
 const heights=[];node.forEach(cell=>{const height=readManualTableCellLayout(cell.attrs.meta?.extensions)?.rowMinHeightPx;if(height!==undefined)heights.push(height);});
 dom.style.height=heights.length?`${Math.max(...heights)}px`:'';
}
/** Colgroup is owned by the view; only tbody is edited by ProseMirror. */
export function createManualTableNodeView(initial,ownerDocument){
 let node=initial;const dom=ownerDocument.createElement('div'),table=ownerDocument.createElement('table'),contentDOM=ownerDocument.createElement('tbody');
 dom.className='lds-manual-table-frame';table.append(contentDOM);dom.append(table);let colgroup=null,metadataFrame=null;
 const render=()=>{
  dom.dataset.manualId=node.attrs.id||'';dom.dataset.manualNode='table';dom.dataset.manualKind='table';table.setAttribute('aria-label',node.attrs.meta.label||'표');
  const marker=getManualCoverProjection(node.attrs.meta?.extensions),metadata=marker?.role==='metadata'&&marker.blockId===node.attrs.id;
  if(metadata){
   dom.className='manual-v2-cover-metadata';dom.dataset.manualCoverRole='metadata';
   if(!metadataFrame){metadataFrame=ownerDocument.createElement('div');metadataFrame.className='lds-manual-table-frame lds-manual-meta';metadataFrame.append(table);dom.replaceChildren(metadataFrame);}
  }else{dom.className='lds-manual-table-frame';delete dom.dataset.manualCoverRole;if(metadataFrame){dom.replaceChildren(table);metadataFrame=null;}}
  const layout=getManualTableLayout(node);
  table.style.tableLayout=layout.hasColumnWeights?'fixed':'';
  if(layout.hasColumnWeights){
   if(!colgroup){colgroup=ownerDocument.createElement('colgroup');table.insertBefore(colgroup,contentDOM);}
   colgroup.replaceChildren(...layout.columnPercentages.map(width=>{const col=ownerDocument.createElement('col');col.style.width=`${width}%`;return col;}));
  }else if(colgroup){colgroup.remove();colgroup=null;}
 };
 render();return {dom,contentDOM,update(next){if(next.type!==node.type)return false;node=next;render();return true;},ignoreMutation(mutation){return mutation.type!=='selection'&&!contentDOM.contains(mutation.target);}};
}
