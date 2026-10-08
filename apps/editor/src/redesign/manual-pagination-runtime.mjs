import {manualPaginationPageParts} from './manual-page-shape.mjs';
import {planManualPagination,createManualPaginationTransaction,MAX_MANUAL_PAGINATION_PASSES} from './manual-pagination.mjs';
import {manualPaginationMarker} from './manual-pagination-meta.mjs';

const textTypes=new Set(['paragraph','heading','todo','codeBlock']);
const containers=new Set(['callout','quote','toggle']);
const titled=node=>['callout','toggle'].includes(node.type.name);
const graphemes=new Intl.Segmenter(undefined,{granularity:'grapheme'});
const nodes=parent=>Array.from({length:parent.childCount},(_,index)=>parent.child(index));
const number=value=>parseFloat(value)||0;
function path(root,child){const result=[];while(child&&child!==root){const parent=child.parentNode;if(!parent)return null;result.unshift(Array.prototype.indexOf.call(parent.childNodes,child));child=parent;}return child===root?result:null;}
function atPath(root,indices){return indices?.reduce((node,index)=>node?.childNodes[index],root)||null;}
function inlineElement(dom,type){return type==='todo'?dom.querySelector('p'):type==='codeBlock'?dom.querySelector('code'):dom;}
function trimInline(dom,from,to,type){
 let offset=0,last=null;
 const visit=node=>{
  if(node.nodeType===3){const text=node.nodeValue||'',start=offset;offset+=text.length;node.nodeValue=text.slice(Math.max(0,from-start),Math.max(0,Math.min(text.length,to-start)));if(!node.nodeValue)node.remove();else last=node;return;}
  if(node.nodeType!==1)return;
  if(node.nodeName==='BR'){
   if(node.classList.contains('ProseMirror-trailingBreak')){node.remove();return;}
   const keep=offset>=from&&offset<to;offset++;if(!keep)node.remove();else last=node;return;
  }
  for(const child of Array.from(node.childNodes))visit(child);
 };
 for(const child of Array.from(dom.childNodes))visit(child);
 if(last?.nodeName==='BR'||type==='codeBlock'&&last?.nodeValue?.endsWith('\n')){const br=dom.ownerDocument.createElement('br');br.className='ProseMirror-trailingBreak';dom.append(br);}
}
function childPositions(node,pos){let offset=1;return nodes(node).map(child=>{const item={node:child,pos:pos+offset};offset+=child.nodeSize;return item;});}
function lineEnds(editor,node,pos,maximumHeight,maxCandidates){
 const text=node.textBetween(0,node.content.size,'','\n');if(text.length<2)return [];
 const dom=inlineElement(editor.nodeDOM(pos),node.type.name),surface=editor.dom.ownerDocument.defaultView,style=surface.getComputedStyle(dom),line=number(style.lineHeight)||number(style.fontSize)*1.5||24;
 const scale=dom.getBoundingClientRect().width/(number(style.width)||dom.offsetWidth||1),threshold=line*Math.max(.1,scale)*.55,segments=graphemes.segment(text),ends=[];
 let start=0,first=editor.coordsAtPos(pos+1,1).top;
 while(start<text.length-1&&ends.length<maxCandidates){
  const top=editor.coordsAtPos(pos+1+start,1).top;if((top-first)/Math.max(.1,scale)>maximumHeight+line*2)break;
  let low=start+1,high=text.length;if(editor.coordsAtPos(pos+1+high,1).top<=top+threshold)break;
  while(low<high){const mid=Math.floor((low+high)/2);if(editor.coordsAtPos(pos+1+mid,1).top>top+threshold)high=mid;else low=mid+1;}
  const boundary=segments.containing(low)?.index??low;if(boundary<=start||boundary>=text.length)break;ends.push(boundary);start=boundary;
 }return ends;
}
function probeFragments(editor,item,split){
 const {node,dom}=item,document=dom.ownerDocument,surface=document.defaultView,rect=dom.getBoundingClientRect(),width=rect.width/item.scale;
 const host=document.createElement('div');host.className=editor.dom.className;host.setAttribute('aria-hidden','true');host.inert=true;
 Object.assign(host.style,{position:'fixed',left:'-100000px',top:'0',width:`${width}px`,visibility:'hidden',pointerEvents:'none',display:'flow-root',zoom:'1',transform:'none'});
 const children=childPositions(node,item.pos).map(child=>({...child,path:path(dom,editor.nodeDOM(child.pos))}));
 function fragment(head){
  const clone=dom.cloneNode(true);clone.removeAttribute('id');clone.querySelectorAll('[id]').forEach(element=>element.removeAttribute('id'));
  Object.assign(clone.style,{width:`${width}px`,height:'auto',maxHeight:'none'});
  if(split.kind==='text')trimInline(inlineElement(clone,node.type.name),head?0:split.at,head?split.at:node.content.size,node.type.name);
  else{
   const header=node.type.name==='table'||titled(node)?1:0,cut=split.kind==='nested-text'?split.childIndex+header:split.at+header;
   const mapped=children.map(child=>atPath(clone,child.path));
   mapped.forEach((element,index)=>{if(index<header)return;if(split.kind==='nested-text'&&index===cut){const child=node.child(index);trimInline(inlineElement(element,child.type.name),head?0:split.at,head?split.at:child.content.size,child.type.name);}else if(head?index>=cut+(split.kind==='nested-text'?1:0):index<cut)element?.remove();});
   if(!head&&['orderedList','procedure'].includes(node.type.name)){const start=(node.attrs.meta.start||1)+split.at;clone.start=start;if(node.type.name==='procedure')clone.style.counterReset=`manual-author-step ${start-1}`;}
  }
  host.replaceChildren(clone);const rect=clone.getBoundingClientRect(),scale=rect.width/width,style=surface.getComputedStyle(clone);return rect.height/scale+Math.max(item.spacing,number(style.marginBottom));
 }
 try{editor.dom.parentElement.append(host);return {headHeight:fragment(true),tailHeight:fragment(false)};}finally{host.remove();}
}
function candidates(editor,item,available,maxCandidates){
 const {node,pos}=item,type=node.type.name,result=[];
 const accept=split=>{try{const size=probeFragments(editor,item,split);return size.headHeight>0&&size.tailHeight>0?{...split,...size}:null;}catch{return null;}};
 const best=(points,make)=>{
  let low=0,high=points.length-1,found=null;
  while(low<=high){const mid=Math.floor((low+high)/2),candidate=accept(make(points[mid]));if(candidate&&candidate.headHeight<=available+.5){found=candidate;low=mid+1;}else high=mid-1;}if(found)result.push(found);
 };
 if(textTypes.has(type)){best(lineEnds(editor,node,pos,available,maxCandidates),at=>({kind:'text',at}));return result;}
 if(['bulletList','orderedList','procedure','table'].includes(type)||containers.has(type)){
  const header=type==='table'||titled(node)?1:0,count=node.childCount-header;
  best(Array.from({length:Math.min(Math.max(0,count-1),maxCandidates)},(_,i)=>i+1),at=>({kind:'child',at}));
  if(containers.has(type))for(const [index,child]of childPositions(node,pos).slice(header).entries()){
   if(!textTypes.has(child.node.type.name))continue;
   const childDOM=editor.nodeDOM(child.pos),prefix=(childDOM.getBoundingClientRect().top-item.dom.getBoundingClientRect().top)/item.scale;if(prefix>available+.5)break;
   best(lineEnds(editor,child.node,child.pos,Math.max(0,available-prefix),maxCandidates),at=>({kind:'nested-text',childIndex:index,at}));
  }
 }return result;
}
function probeJoinGap(editor,page,next){
 const {dom,content,headers,blocks,scale}=page.layout,last=blocks.at(-1),first=next.layout.blocks[0],document=dom.ownerDocument,surface=document.defaultView,width=number(surface.getComputedStyle(dom).width)||dom.getBoundingClientRect().width/scale;
 const host=document.createElement('div');host.className=editor.dom.className;host.setAttribute('aria-hidden','true');host.inert=true;Object.assign(host.style,{position:'fixed',left:'-100000px',top:'0',width:`${width}px`,visibility:'hidden',pointerEvents:'none',display:'flow-root',zoom:'1',transform:'none'});
 const paper=dom.cloneNode(!!page.layout.cover),body=page.layout.cover?atPath(paper,path(dom,content)):content.cloneNode(false),clonedHeaders=headers.map(header=>page.layout.cover?atPath(paper,path(dom,header)):header.cloneNode(true)),previous=last?(page.layout.cover?atPath(paper,path(dom,last.dom)):last.dom.cloneNode(true)):null,candidate=first.dom.cloneNode(true);
 if(page.layout.cover){const removed=blocks.filter(block=>block!==last).map(block=>atPath(paper,path(dom,block.dom)));for(const element of removed)element?.remove();body.append(candidate);}
 paper.style.width=`${width}px`;if(!page.layout.cover){body.replaceChildren(...clonedHeaders,...(previous?[previous]:[]),candidate);paper.replaceChildren(body);}paper.removeAttribute('id');paper.querySelectorAll('[id]').forEach(element=>element.removeAttribute('id'));host.append(paper);
 try{
  editor.dom.parentElement.append(host);const probeScale=paper.getBoundingClientRect().width/width,prior=page.layout.cover?(body.children[body.children.length-2]||null):previous||clonedHeaders.at(-1),gap=prior?(candidate.getBoundingClientRect().top-prior.getBoundingClientRect().bottom)/probeScale:0,before=page.layout.cover?(prior?(prior===previous?last.spacing:number(surface.getComputedStyle(prior).marginBottom)):0):last?last.spacing:headers.length?number(surface.getComputedStyle(headers.at(-1)).marginBottom):0;
  if(!probeScale||!Number.isFinite(gap))throw new Error('Unmeasurable join');return Math.max(0,gap-before);
 }finally{host.remove();}
}
/** Reads actual canonical-width editor DOM, with temporary sibling probes.
 * It never changes PM selection, the document, storage, or the visible canvas.
 */
export function measureManualPagination(editor,{revision=0,maxCandidates=256}={}){
 if(!editor?.dom?.isConnected||!Number.isInteger(maxCandidates)||maxCandidates<1||maxCandidates>256)return null;
 const doc=editor.state.doc,surface=editor.dom.ownerDocument.defaultView,pages=[],items=[],requests=new Map();let root=null;
 try{
  doc.forEach((page,pos)=>{
   if(!['page','cover'].includes(page.type.name)){root=null;return;}
   const shape=manualPaginationPageParts(page,pos),dom=editor.nodeDOM(pos),content=shape.cover?editor.nodeDOM(shape.body.pos):dom.querySelector('.lds-manual-content')||dom,rect=dom.getBoundingClientRect(),scale=rect.width/(dom.offsetWidth||number(surface.getComputedStyle(dom).width)||rect.width);
   if(!scale||rect.height<=0)throw new Error('Unmeasurable page');
   const blocks=shape.blocks.map(child=>({...child,dom:editor.nodeDOM(child.pos),scale})),contentRect=content.getBoundingClientRect(),headers=shape.headers.map(child=>editor.nodeDOM(child.pos)),header=headers.at(-1);
   const headerSize=element=>{const style=surface.getComputedStyle(element);return element.getBoundingClientRect().height+(number(style.marginTop)+number(style.marginBottom))*scale;};
   const start=shape.cover?contentRect.top:shape.leading?(blocks[0]?.dom.getBoundingClientRect().top??(header?header.getBoundingClientRect().bottom+number(surface.getComputedStyle(header).marginBottom)*scale:contentRect.top+number(surface.getComputedStyle(content).paddingTop)*scale)):contentRect.top+number(surface.getComputedStyle(content).paddingTop)*scale+headers.reduce((sum,item)=>sum+headerSize(item),0);
   let capacity=(contentRect.bottom-start)/scale;
   if(shape.cover){
    // coverBody grows with its content; the physical A4 footer boundary does not.
    const reserve=surface.getComputedStyle(dom).getPropertyValue('--manual-footer-reserve').trim(),match=reserve.match(/^([\d.]+)(px|mm|cm|in|pt|pc)$/),units={px:1,mm:96/25.4,cm:96/2.54,in:96,pt:96/72,pc:16};
    if(!match)throw new Error('Unmeasurable footer reserve');
    const bodyTop=contentRect.top+number(surface.getComputedStyle(content).paddingTop)*scale,first=blocks[0]?.dom.getBoundingClientRect().top,bodyHeaders=(shape.bodyHeaders||[]).map(child=>editor.nodeDOM(child.pos));
    const lastBodyHeader=bodyHeaders.at(-1),coverStart=first??Math.max(bodyTop,lastBodyHeader?lastBodyHeader.getBoundingClientRect().bottom+number(surface.getComputedStyle(lastBodyHeader).marginBottom)*scale:bodyTop),remainingHeaders=first===undefined?0:bodyHeaders.filter(element=>element.getBoundingClientRect().top>=first).reduce((sum,element)=>sum+element.getBoundingClientRect().height/scale,0);
    capacity=(rect.bottom-coverStart)/scale-Number(match[1])*units[match[2]]-number(surface.getComputedStyle(content).paddingBottom)-remainingHeaders;
   }
   if(!Number.isFinite(capacity))throw new Error('Unmeasurable capacity');
   const record={id:page.attrs.id,capacity:Math.max(0,capacity),blocks:[],layout:{dom,content,headers:shape.cover?(shape.bodyHeaders||[]).map(child=>editor.nodeDOM(child.pos)):headers,blocks,scale,cover:shape.cover}},marker=manualPaginationMarker(page.attrs.meta.extensions,'page'),automatic=!!root&&marker?.rootPageId===root;
   if(!automatic)root=page.attrs.id;record.rootPageId=root;record.automatic=automatic;
   blocks.forEach((block,index)=>{
    const box=block.dom.getBoundingClientRect(),next=blocks[index+1]?.dom.getBoundingClientRect(),between=next?headers.filter(element=>{const rect=element.getBoundingClientRect();return rect.top>=box.bottom&&rect.bottom<=next.top;}).reduce((sum,element)=>sum+(shape.cover?element.getBoundingClientRect().height:headerSize(element))/scale,0):0,spacing=next?(next.top-box.bottom)/scale-between:number(surface.getComputedStyle(block.dom).marginBottom);block.spacing=Math.max(0,spacing);
    if(shape.cover&&!next){const trailing=(shape.bodyHeaders||[]).map(child=>editor.nodeDOM(child.pos)).filter(element=>element.getBoundingClientRect().top>=box.bottom),last=trailing.at(-1);if(last){const occupied=(last.getBoundingClientRect().bottom-box.bottom)/scale+number(surface.getComputedStyle(last).marginBottom),reserved=trailing.reduce((sum,element)=>sum+element.getBoundingClientRect().height/scale,0);block.spacing=Math.max(0,occupied-reserved);}}
    record.blocks.push({id:block.node.attrs.id,height:box.height/scale+block.spacing});items.push(block);
   });pages.push(record);
  });
  const request=(id,available)=>{if(available<=0)return;const list=requests.get(id)||[];if(!list.some(value=>Math.abs(value-available)<.5))list.push(available);requests.set(id,list);};
  pages.forEach((page,index)=>{
   let used=0,overflow=false;for(const block of page.blocks){if(used+block.height>page.capacity+.5){request(block.id,page.capacity-used);overflow=true;break;}used+=block.height;}
   const next=pages[index+1];if(!overflow&&next?.automatic&&next.rootPageId===page.rootPageId&&next.blocks.length){page.pullGap=probeJoinGap(editor,page,next);const available=page.capacity-used-page.pullGap;if(next.blocks[0].height>available+.5)request(next.blocks[0].id,available);}
  });
  for(const item of items){const needs=requests.get(item.node.attrs.id);if(!needs)continue;const record=pages.flatMap(page=>page.blocks).find(block=>block.id===item.node.attrs.id);record.splits=needs.flatMap(available=>candidates(editor,item,available,maxCandidates));}
  return editor.state.doc===doc?{doc,revision,coverFlow:true,pages:pages.map(({id,capacity,blocks,pullGap})=>({id,capacity,blocks,...(pullGap===undefined?{}:{pullGap})}))}:null;
 }catch{return null;}
}
function progressKey(state,action){
 if(['title','remove-empty'].includes(action.type))return JSON.stringify([action.type,action.pageId]);
 let block=null,page=null;state.doc.descendants(node=>{if(node.attrs.id===action.blockId)block=node;if(node.attrs.id===action.pageId)page=node;});
 return JSON.stringify([action.type,manualPaginationMarker(page?.attrs.meta?.extensions,'page')?.rootPageId||action.pageId,manualPaginationMarker(block?.attrs.meta?.extensions,'block')?.rootBlockId||action.blockId,block?.content.size,page?.content.size,action.split?.kind,action.split?.childIndex,action.split?.at]);
}
export function installManualPaginationRuntime({editor,getEditor=()=>editor,getGeneration=()=>0,isEnabled=()=>editor.editable,onResult=()=>{},measure=measureManualPagination,surface=editor.dom.ownerDocument.defaultView,maxPasses=MAX_MANUAL_PAGINATION_PASSES,requestFrame=callback=>surface.requestAnimationFrame(callback),cancelFrame=id=>surface.cancelAnimationFrame(id),setTimer=setTimeout,clearTimer=clearTimeout,compositionDelay=100}={}){
 let disposed=false,frame=null,timer=null,revision=0,pass=0,generation=getGeneration(),historyTransaction=null,armed=false,normalizing=false,waitingFont=false,status='idle';const seen=new Set();
 const current=()=>!disposed&&getEditor()===editor&&editor.dom.isConnected&&getGeneration()===generation;
 const report=result=>{status=result.status;onResult({...result,pass,revision,normalizing,origin:normalizing?'initial':historyTransaction?'user':'layout'});if(['stable','blocked','limit','invalid','unmeasurable','stale'].includes(result.status))normalizing=false;};
 const schedule=()=>{if(!disposed&&frame===null)frame=requestFrame(tick);};
 function tick(){
  frame=null;if(!current()){report({status:'stale',diagnostics:[]});return;}if(!isEnabled()){report({status:'paused',diagnostics:[]});return;}if(editor.composing){report({status:'composing',diagnostics:[]});return;}
  const fonts=editor.dom.ownerDocument.fonts;if(fonts?.status==='loading'){report({status:'waiting-fonts',diagnostics:[]});if(!waitingFont){waitingFont=true;fonts.ready.then(()=>{waitingFont=false;if(current())schedule();});}return;}
  if([...editor.dom.querySelectorAll('img')].some(img=>!img.complete)){report({status:'waiting-images',diagnostics:[]});return;}
  const state=editor.state,measurement=measure(editor,{revision});if(!measurement){report({status:'unmeasurable',diagnostics:[]});return;}if(!current()||editor.state.doc!==state.doc){if(current())schedule();return;}
  const plan=planManualPagination(state,measurement,{pass,maxPasses});
  if(plan.status!=='ready'){report(plan);if(['stable','blocked','limit','invalid'].includes(plan.status))historyTransaction=null;return;}
  if(!armed){report({status:'needs-edit',diagnostics:plan.diagnostics});return;}
  const key=progressKey(state,plan.action);if(seen.has(key)){report({status:'limit',diagnostics:[...plan.diagnostics,{reason:'no-progress'}]});return;}seen.add(key);
  const tr=createManualPaginationTransaction(state,plan,{historyTransaction,composing:editor.composing});if(!tr){report({status:'invalid',diagnostics:[{reason:'transaction'}]});return;}if(!historyTransaction)tr.setMeta('addToHistory',false);tr.setMeta('manualPagination',{...tr.getMeta('manualPagination'),origin:normalizing?'initial':historyTransaction?'user':'layout'});
  if(historyTransaction&&!normalizing)tr.scrollIntoView();
  pass++;editor.dispatch(tr);report({status:'flowing',diagnostics:plan.diagnostics,action:plan.action});if(current())schedule();
 }
 function reset(){if(frame!==null)cancelFrame(frame);if(timer!==null)clearTimer(timer);frame=timer=null;generation=getGeneration();revision++;pass=0;historyTransaction=null;armed=normalizing=false;seen.clear();status='idle';}
 const request=()=>{if(!current())return false;if(['stable','blocked','limit','invalid','needs-edit','idle'].includes(status)){pass=0;seen.clear();}schedule();return true;};
 const compositionEnd=()=>{if(timer!==null)clearTimer(timer);timer=setTimer(()=>{timer=null;if(current())request();},compositionDelay);};
 const load=()=>{if(current())request();};
 editor.dom.addEventListener('compositionend',compositionEnd);editor.dom.addEventListener('load',load,true);editor.dom.addEventListener('error',load,true);surface.addEventListener('resize',load);
 return {changed(transaction){if(disposed||!transaction?.docChanged||transaction.getMeta('manualPagination'))return false;if(generation!==getGeneration())reset();if(!current())return false;revision++;pass=0;seen.clear();historyTransaction=transaction;armed=true;normalizing=false;schedule();return true;},request,normalize(){if(disposed||getEditor()!==editor)return false;reset();armed=normalizing=true;schedule();return true;},reset,getState:()=>({status,revision,pass,armed,normalizing,scheduled:frame!==null}),dispose(){disposed=true;reset();editor.dom.removeEventListener('compositionend',compositionEnd);editor.dom.removeEventListener('load',load,true);editor.dom.removeEventListener('error',load,true);surface.removeEventListener('resize',load);}};
}
