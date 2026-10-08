import {manualPageRole} from './manual-page-shape.mjs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Callout} from '@lk-design-system/lds-core/components/status/Callout';
import {Blockquote} from '@lk-design-system/lds-core/components/content/Blockquote';
import {createManualTableNodeView,applyManualTableRowLayout} from './manual-table-view.mjs';
import {getManualCoverProjection} from './manual-cover-legacy-projection.mjs';
import {createManualDividerNodeView} from './manual-divider-view.mjs';
import {createManualHeadingNodeView} from './manual-heading-view.mjs';
import {createManualTodoNodeView} from './manual-todo-view.mjs';
import {createManualToggleNodeView,createManualToggleTitleNodeView} from './manual-toggle-view.mjs';
import {TextSelection,NodeSelection} from '@tiptap/pm/state';
import {manualNodeControlAllowed} from './manual-node-control-guard.mjs';
import {hasVisibleManualCalloutTitle} from '../../../../src/manual-callout-content.mjs';

function identify(dom,node){dom.dataset.manualId=node.attrs.id||'';dom.dataset.manualNode=node.type.name;dom.dataset.manualKind=node.type.name;}
function tableCellContext(view,getPos){const $pos=view.state.doc.resolve(getPos()),table=$pos.node($pos.depth-1),role=getManualCoverProjection(table.attrs.meta?.extensions),metadata=role?.role==='metadata'&&role.blockId===table.attrs.id,column=$pos.index();return {metadata,header:metadata?column%2===0:!!$pos.parent.attrs.header,labelId:metadata&&column%2?$pos.parent.child(column-1).attrs.id:null};}
function simple(tag,className='',configure=()=>{}){return node=>{
 const dom=window.document.createElement(tag);identify(dom,node);dom.className=className;configure(dom,node);
 return {dom,contentDOM:dom,update(next){if(next.type!==node.type)return false;node=next;identify(dom,node);configure(dom,node);return true;}};
};}
// Render the public component. Only the app-owned child slot is managed by PM.
// No Core markup, colors, icons, or layout styles are duplicated in this adapter.
function coreFrame(kind){return (node,view,getPos)=>{
 const dom=window.document.createElement('div');dom.className=kind==='callout'?'lds-manual-callout':'lds-manual-quote';identify(dom,node);
 let contentDOM;
 function titleVisibility(){if(kind==='callout'){const visible=String(hasVisibleManualCalloutTitle(node.firstChild));dom.dataset.manualCalloutVisibleTitle=visible;if(contentDOM)contentDOM.dataset.manualCalloutVisibleTitle=visible;}}
 function render(){
  const slot=<div data-manual-content-slot=""/>;
  const markup=kind==='callout'?<Callout tone={node.attrs.meta.tone||'signal'} variant="bordered" radius="body" density="compact">{slot}</Callout>:<Blockquote radius="body">{slot}</Blockquote>;
  const template=window.document.createElement('template');template.innerHTML=renderToStaticMarkup(markup);
  const root=template.content.firstElementChild,nextSlot=root.querySelector('[data-manual-content-slot]');
  if(contentDOM)nextSlot.replaceWith(contentDOM);else contentDOM=nextSlot;
  root.querySelectorAll('[aria-hidden="true"]').forEach(element=>{element.contentEditable='false';});
  dom.replaceChildren(root);
  titleVisibility();
 }
 titleVisibility();render();
 function iconEvent(event){
  if(kind!=='callout'||!event.target||contentDOM.contains(event.target))return false;
  const icon=event.target.closest?.('[aria-hidden="true"]');return !!icon&&dom.contains(icon);
 }
 function focusIcon(event){
  if(!iconEvent(event)||event.button!==0)return;
  const allowed=!view?.isDestroyed&&manualNodeControlAllowed(view,event,dom);event.preventDefault();
  if(!allowed||event.shiftKey||event.altKey||event.ctrlKey||event.metaKey)return;
  const gate=view.props?.manualCalloutFocusEnabled;
  if(typeof gate==='function'?gate(view)!==true:gate===false)return;
  let pos;try{pos=getPos();}catch{return;}
  const state=view.state;if(!Number.isInteger(pos)||pos<0||pos>state.doc.content.size||state.doc.nodeAt(pos)!==node)return;
  const selection=state.selection,end=pos+node.nodeSize;
  if(!(selection instanceof TextSelection&&selection.from>pos&&selection.to<end)){
   let target=null;
   node.forEach((child,offset,index)=>{
    if(index===0||target!==null)return;
    const start=pos+1+offset;
    if(child.isTextblock)target=start+1;
    else child.descendants((nested,relative)=>{if(target!==null)return false;if(nested.isTextblock&&!(nested.type.name==='calloutTitle'&&!hasVisibleManualCalloutTitle(nested))){target=start+relative+2;return false;}});
   });
   if(target===null&&hasVisibleManualCalloutTitle(node.firstChild))target=pos+2;
   const next=target===null?NodeSelection.create(state.doc,pos):TextSelection.create(state.doc,target);
   if(!selection.eq(next))view.dispatch(state.tr.setSelection(next).setStoredMarks(state.storedMarks).setMeta('addToHistory',false));
  }
  view.focus();
 }
 if(kind==='callout'){
  dom.addEventListener('pointerdown',focusIcon);dom.addEventListener('mousedown',focusIcon);
  dom.addEventListener('click',event=>{if(iconEvent(event)&&event.button===0)event.preventDefault();});
 }
 return {dom,contentDOM,update(next){if(next.type!==node.type)return false;const changed=next.attrs.meta.tone!==node.attrs.meta.tone;node=next;identify(dom,node);titleVisibility();if(changed)render();return true;},stopEvent:event=>iconEvent(event)&&event.button===0&&/^(pointerdown|pointerup|mousedown|mouseup|click|dblclick)$/.test(event.type),ignoreMutation(mutation){return mutation.type!=='selection'&&!contentDOM.contains(mutation.target);}};
};}
export const manualNodeViews={
 page:node=>{const dom=window.document.createElement('section'),contentDOM=window.document.createElement('div');dom.className='lds-manual-page';contentDOM.className='lds-manual-content';identify(dom,node);dom.append(contentDOM);return {dom,contentDOM,update(next){if(next.type!==node.type)return false;node=next;identify(dom,node);return true;}};},
 pageTitle:simple('h2','lds-manual-section-title',(dom,node)=>{const role=manualPageRole(node);if(role)dom.dataset.manualPageRole=role.role;else delete dom.dataset.manualPageRole;}),pageLead:simple('p','lds-manual-lead',(dom,node)=>{const role=manualPageRole(node);if(role)dom.dataset.manualPageRole=role.role;else delete dom.dataset.manualPageRole;}),
 heading:node=>createManualHeadingNodeView(node,window.document),
 todo:(node,view)=>createManualTodoNodeView(node,view,window.document),
 toggle:(node,view)=>createManualToggleNodeView(node,view,window.document),
 toggleTitle:node=>createManualToggleTitleNodeView(node,window.document),
 codeBlock:node=>{const dom=window.document.createElement('div'),pre=window.document.createElement('pre'),contentDOM=window.document.createElement('code');dom.className='manual-v2-code-block';pre.append(contentDOM);dom.append(pre);identify(dom,node);dom.dataset.language=node.attrs.meta.language||'';return {dom,contentDOM,update(next){if(next.type!==node.type)return false;node=next;identify(dom,node);dom.dataset.language=node.attrs.meta.language||'';return true;}};},
 divider:(node,view)=>createManualDividerNodeView(node,view,window.document),calloutTitle:simple('h3','lds-manual-callout-title'),
 procedure:simple('ol','lds-manual-steps',(dom,node)=>{dom.start=node.attrs.meta.start||1;dom.style.counterReset=`manual-author-step ${(node.attrs.meta.start||1)-1}`;}),
 step:simple('li','lds-manual-step'),stepTitle:simple('h3','manual-v2-step-title'),
 table:node=>createManualTableNodeView(node,window.document),
 tableRow:simple('tr','',(dom,node)=>{dom.dataset.header=String(!!node.attrs.header);applyManualTableRowLayout(dom,node);}),
 tableCell:(node,view,getPos)=>{const initial=tableCellContext(view,getPos),dom=window.document.createElement(initial.header?'th':'td');const render=()=>{identify(dom,node);dom.colSpan=node.attrs.colspan||1;dom.rowSpan=node.attrs.rowspan||1;const context=tableCellContext(view,getPos);if(context.header)dom.scope=context.metadata?'row':'col';if(context.metadata){dom.id=node.attrs.id;if(context.labelId)dom.setAttribute('headers',context.labelId);else dom.removeAttribute('headers');}};render();return {dom,contentDOM:dom,update(next){const context=tableCellContext(view,getPos);if(next.type!==node.type||context.header!==initial.header||context.metadata!==initial.metadata)return false;node=next;render();return true;}};},
 callout:coreFrame('callout'),quote:coreFrame('quote'),
};
