import {closeHistory} from '@tiptap/pm/history';
import {updateManualObject,findManualObject} from './manual-kernel.mjs';
import {manualNodeControlAllowed} from './manual-node-control-guard.mjs';
export function createManualTodoNodeView(node,view,owner){
 const dom=owner.createElement('div'),checkbox=owner.createElement('input'),contentDOM=owner.createElement('p');
 dom.className='manual-v2-todo';checkbox.type='checkbox';checkbox.contentEditable='false';checkbox.setAttribute('aria-label','완료 표시');
 dom.append(checkbox,contentDOM);
 const render=()=>{dom.dataset.manualId=node.attrs.id||'';dom.dataset.manualNode=node.type.name;dom.dataset.manualKind=node.type.name;dom.dataset.checked=String(!!node.attrs.meta.checked);checkbox.checked=!!node.attrs.meta.checked;};render();
 checkbox.addEventListener('change',(event={})=>{
  const checked=checkbox.checked,current=findManualObject(view.state,node.attrs.id);
  if(current?.node.type===node.type)node=current.node;
  if(!manualNodeControlAllowed(view,event,dom)||current?.node.type!==node.type||!updateManualObject(node.attrs.id,{checked})(view.state,tr=>view.dispatch(closeHistory(tr)),view))render();
 });
 return {dom,contentDOM,update(next){if(next.type!==node.type)return false;node=next;render();return true;},stopEvent:event=>event.target===checkbox,ignoreMutation:mutation=>mutation.type!=='selection'&&!contentDOM.contains(mutation.target)};
}
