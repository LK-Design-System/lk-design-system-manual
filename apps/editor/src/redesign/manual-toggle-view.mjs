import {closeHistory} from '@tiptap/pm/history';
import {manualNodeControlAllowed} from './manual-node-control-guard.mjs';
import {updateManualObject,findManualObject} from './manual-kernel.mjs';
function identify(dom,node){dom.dataset.manualId=node.attrs.id||'';dom.dataset.manualNode=node.type.name;dom.dataset.manualKind=node.type.name;}
export function createManualToggleNodeView(node,view,owner){
 const dom=owner.createElement('section'),button=owner.createElement('button'),contentDOM=owner.createElement('div');
 dom.className='manual-v2-toggle';button.type='button';button.contentEditable='false';button.className='manual-v2-toggle-button';
 dom.append(button,contentDOM);
 const render=()=>{identify(dom,node);const open=node.attrs.meta.open!==false;dom.dataset.open=String(open);button.textContent=open?'▾':'▸';button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'내용 접기':'내용 펼치기');};render();
 button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',(event={})=>{if(!manualNodeControlAllowed(view,event,dom))return;const current=findManualObject(view.state,node.attrs.id);if(current?.node.type!==node.type)return;updateManualObject(node.attrs.id,{open:current.node.attrs.meta.open===false})(view.state,tr=>view.dispatch(closeHistory(tr)),view);});
 return {dom,contentDOM,update(next){if(next.type!==node.type)return false;node=next;render();return true;},stopEvent:event=>button.contains(event.target),ignoreMutation:mutation=>mutation.type!=='selection'&&!contentDOM.contains(mutation.target)};
}
export function createManualToggleTitleNodeView(node,owner){
 const dom=owner.createElement('p');identify(dom,node);dom.className='manual-v2-toggle-title';
 return {dom,contentDOM:dom,update(next){if(next.type!==node.type)return false;node=next;identify(dom,node);return true;}};
}
