const channel='lds-manual-preview';
const send=value=>parent.postMessage({channel,...value},location.origin);
const textOf=element=>element.textContent.replace(/\r\n/g,'\n');
export function caretRange(element){
 const selection=window.getSelection();
 if(!selection.rangeCount)return null;
 const range=selection.getRangeAt(0);
 if(!element.contains(range.startContainer)||!element.contains(range.endContainer))return null;
 const prefix=range.cloneRange();prefix.selectNodeContents(element);prefix.setEnd(range.startContainer,range.startOffset);
 return {start:prefix.toString().length,end:prefix.toString().length+range.toString().length};
}
export function focusEditable(element,offset=0){
 element.focus();const range=document.createRange(),walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
 let node,remaining=offset;
 while((node=walker.nextNode())){if(remaining<=node.length){range.setStart(node,remaining);break;}remaining-=node.length;}
 if(!node){range.selectNodeContents(element);range.collapse(false);}else range.collapse(true);
 const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
 element.scrollIntoView({block:'nearest',inline:'nearest'});
}
export function installCanvasInput({onIdle,onElementSelect}){
 let composing=false,active=null;
 const editable=event=>event.target.closest?.('[data-edit-path]');
 function commit(element){if(element&&!composing)send({kind:'text',path:element.dataset.editPath,text:textOf(element),...caretRange(element)});}
 function focus(event){const element=editable(event);if(!element)return;active=element;send({kind:'canvas-select',path:element.closest('[data-source-path]')?.dataset.sourcePath});send({kind:'edit-start',path:element.dataset.editPath});}
 function input(event){commit(editable(event));}
 function start(){composing=true;}
 function end(event){composing=false;commit(editable(event));}
 function blur(event){commit(editable(event));active=null;setTimeout(onIdle,0);}
 function selection(){if(active&&!composing){const range=caretRange(active);if(range)send({kind:'caret',path:active.dataset.editPath,...range});}}
 function history(element,redo){commit(element);element?.blur();send({kind:'history',redo});}
 function key(event){
  if(composing||event.isComposing)return;
  const element=editable(event),modified=event.ctrlKey||event.metaKey;
  if(modified&&event.key.toLowerCase()==='s'){event.preventDefault();send({kind:'save'});return;}
  if(modified&&['z','y'].includes(event.key.toLowerCase())){event.preventDefault();history(element,event.key.toLowerCase()==='y'||event.shiftKey);return;}
  if(!element)return;
  if(['Enter','Backspace','Delete'].includes(event.key)&&unsupportedRange(event,element))return;
  const range=caretRange(element);if(!range)return;
  const collapsed=range.start===range.end;
  const boundary=(event.key==='Backspace'&&range.start===0)||(event.key==='Delete'&&range.end===textOf(element).length);
  if(!modified&&!event.altKey&&((event.key==='Enter'&&!event.shiftKey&&element.dataset.enterAfter)||(collapsed&&boundary))){
   event.preventDefault();commit(element);element.blur();send({kind:'key',path:element.dataset.editPath,key:event.key,...range});return;
  }
  if(!modified&&!event.altKey&&!event.shiftKey&&collapsed&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){
   const backward=['ArrowUp','ArrowLeft'].includes(event.key);
   if((backward&&range.start===0)||(!backward&&range.end===textOf(element).length)){
    const fields=[...document.querySelectorAll('[data-edit-path]')],next=fields[fields.indexOf(element)+(backward?-1:1)];
    if(next){event.preventDefault();commit(element);focusEditable(next,backward?textOf(next).length:0);return;}
   }
  }
  if(event.key==='Enter'){event.preventDefault();insertText('\n');commit(element);}
  if(event.key==='Escape'){event.preventDefault();const owner=element.closest('[data-move-path]');if(owner){commit(element);element.blur();onElementSelect?.(owner.dataset.movePath);}}
 }
 function crossFieldSelection(element){return element&&!caretRange(element)&&window.getSelection().rangeCount>0&&!window.getSelection().isCollapsed;}
 function unsupportedRange(event,element){if(!crossFieldSelection(element))return false;event.preventDefault();send({kind:'notice',message:'여러 입력칸에 걸친 편집은 아직 지원하지 않습니다. 한 문단 안에서 선택해 주세요.'});return true;}
 function before(event){if(unsupportedRange(event,editable(event)))return;if(!composing&&['historyUndo','historyRedo'].includes(event.inputType)){event.preventDefault();history(editable(event),event.inputType==='historyRedo');}}
 function paste(event){
  if(composing)return;
  const image=[...(event.clipboardData?.files||[])].find(file=>file.type.startsWith('image/'));
  const element=editable(event),owner=event.target.closest?.('[data-source-path]')?.dataset.sourcePath;
  if(image){event.preventDefault();commit(element);element?.blur();send({kind:'image',file:image,path:owner});return;}
  if(unsupportedRange(event,element))return;
  if(element){event.preventDefault();insertText(event.clipboardData?.getData('text/plain')||'');commit(element);}
 }
 function drop(event){const file=[...(event.dataTransfer?.files||[])].find(file=>file.type.startsWith('image/'));if(file){event.preventDefault();send({kind:'image',file,path:event.target.closest?.('[data-source-path]')?.dataset.sourcePath});}}
 function drag(event){if(event.dataTransfer?.types.includes('Files'))event.preventDefault();}
 function click(event){const button=event.target.closest('[data-canvas-action]');if(button){send({kind:button.dataset.canvasAction,path:button.dataset.path});return;}if(editable(event))return;const target=event.target.closest('[data-source-path]');if(target)send({kind:'canvas-select',path:target.dataset.sourcePath});}
 const events={focusin:focus,focusout:blur,input,compositionstart:start,compositionend:end,selectionchange:selection,keydown:key,beforeinput:before,paste,drop,dragover:drag,click};
 for(const [name,fn]of Object.entries(events))document.addEventListener(name,fn);
 return {flush(){if(composing)throw new Error('한글 조합을 마친 뒤 저장하세요.');commit(active);active?.blur();},isEditing:()=>!!active||composing,dispose(){for(const [name,fn]of Object.entries(events))document.removeEventListener(name,fn);}};
}
function insertText(text){const selection=window.getSelection();if(!selection.rangeCount)return;const range=selection.getRangeAt(0);range.deleteContents();const node=document.createTextNode(text);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);}
export function markEditable(element,path,label,enterAfter){
 if(!element)return;
 element.contentEditable='plaintext-only';element.removeAttribute('tabindex');element.dataset.editPath=path;element.setAttribute('role','textbox');element.setAttribute('aria-label',label);element.setAttribute('aria-multiline','true');element.title='클릭해서 직접 입력';element.dataset.placeholder=label;
 if(enterAfter)element.dataset.enterAfter=enterAfter;
}
export function actionButton(parent,label,kind,path){
 const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.canvasAction=kind;button.dataset.path=path;button.className='manual-canvas-action';parent.append(button);
}
