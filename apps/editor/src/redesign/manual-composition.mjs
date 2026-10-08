// PM may finish composition without dispatching another document transaction.
// Its compositionend handler queues a 20ms flush before this listener runs.
export function installManualCompositionCompletion({editor,getEditor,getGeneration,onFinished,setTimer=setTimeout,clearTimer=clearTimeout,delay=20}){
 let timer=null,disposed=false;
 const cancel=()=>{if(timer!==null)clearTimer(timer);timer=null;};
 const end=()=>{
  cancel();const generation=getGeneration();
  timer=setTimer(()=>{timer=null;if(!disposed&&getEditor()===editor&&getGeneration()===generation&&!editor.composing)onFinished();},delay);
 };
 editor.dom.addEventListener('compositionend',end);
 return {cancel,dispose(){disposed=true;cancel();editor.dom.removeEventListener('compositionend',end);}};
}
