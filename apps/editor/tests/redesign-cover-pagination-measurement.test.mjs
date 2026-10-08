import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@tiptap/pm/state';
import {Fragment} from '@tiptap/pm/model';
import {createManualState} from '../src/redesign/manual-kernel.mjs';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {manualPaginationPageParts} from '../src/redesign/manual-page-shape.mjs';
import {withManualPaginationMarker} from '../src/redesign/manual-pagination-meta.mjs';
import {measureManualPagination} from '../src/redesign/manual-pagination-runtime.mjs';

// Real PM nodes and absolute positions; geometry is an explicit test adapter, not browser evidence.
function fixture({scale=1,rolePosition='before',overflow=false,reserve='20px',firstTop=null,betweenGap=0,roleMarginTop=0,roleMarginBottom=0,emptyBody=false,roleTop=null}={}){
 const d=createEmptyManualDocument();d.cover={id:'cover',title:[{type:'text',text:'C'}],metadata:[],sectionTitle:[],blocks:[{id:'a',type:'paragraph',content:[]},{id:'b',type:'paragraph',content:[]}]};
 const initial=createManualState({document:d}),cover=initial.doc.firstChild,shape=manualPaginationPageParts(cover,0),role=shape.headers.find(h=>h.node.type.name==='divider').node,body=shape.body.node;
 const originals=Array.from({length:cover.childCount},(_,i)=>cover.child(i)).filter(n=>n!==role),frame=originals.at(-1),frameChildren=Array.from({length:frame.childCount},(_,i)=>frame.child(i));
 const entries=emptyBody?[role]:rolePosition==='before'?[role,...Array.from({length:body.childCount},(_,i)=>body.child(i))]:rolePosition==='between'?[body.child(0),role,body.child(1)]:[body.child(0),body.child(1),role];
 frameChildren[frameChildren.length-1]=body.copy(Fragment.fromArray(entries));originals[originals.length-1]=frame.copy(Fragment.fromArray(frameChildren));
 // The cover deliberately follows an ordinary page, so all cover positions are nonzero.
 const doc=initial.doc.copy(Fragment.fromArray([initial.doc.lastChild,cover.copy(Fragment.fromArray(originals))])),state=EditorState.create({doc}),positions=new Map(),reads=[];
 const rect=(top,height)=>({top:top*scale,bottom:(top+height)*scale,width:100*scale,height:height*scale});
 const document={defaultView:{getComputedStyle:element=>({marginBottom:`${element.marginBottom||0}px`,marginTop:`${element.marginTop||0}px`,paddingTop:'0px',paddingBottom:'0px',width:'100px',getPropertyValue:()=>reserve})}};
 const el=(top,height)=>({ownerDocument:document,offsetWidth:100,getBoundingClientRect:()=>rect(top,height)});
 doc.forEach((node,pos)=>{
  const parts=manualPaginationPageParts(node,pos),paper=el(0,200),content=el(parts.cover?50:0,parts.cover?(overflow?1000:120):180);paper.querySelector=()=>content;positions.set(pos,paper);
  if(parts.cover)positions.set(parts.body.pos,content);
  for(const header of parts.headers){const element=el(header.node===role?(roleTop??(rolePosition==='before'?50:rolePosition==='between'?90+betweenGap:150)):10,20);if(header.node===role){element.marginTop=roleMarginTop;element.marginBottom=roleMarginBottom;}positions.set(header.pos,element);}
  parts.blocks.forEach((block,index)=>positions.set(block.pos,el(parts.cover?(index===0?(firstTop??(rolePosition==='before'?70:50)):rolePosition==='between'?110+betweenGap*2:90):20,overflow?300:40)));
 });
 const editor={state,dom:{isConnected:true,ownerDocument:document},nodeDOM(pos){reads.push(pos);return positions.get(pos);}};
 return {editor,reads,state,positions,document,coverPos:doc.firstChild.nodeSize};
}
for(const scale of [1,2])for(const rolePosition of ['before','between','after'])test(`cover capacity uses A4 bottom, each retained role once: ${rolePosition}, scale ${scale}`,()=>{
 const h=fixture({scale,rolePosition}),before=h.editor.state,measured=measureManualPagination(h.editor);
 assert.ok(measured);assert.equal(measured.coverFlow,true);assert.equal(measured.pages.length,2);assert.equal(measured.pages[1].capacity,110);
 assert.deepEqual(measured.pages[1].blocks,[{id:'a',height:40},{id:'b',height:rolePosition==='after'?60:40}]);assert.equal(measured.pages[0].capacity,160);assert.equal(h.editor.state,before);
 const parts=manualPaginationPageParts(h.state.doc.lastChild,h.coverPos);for(const block of parts.blocks)assert.ok(h.reads.includes(block.pos));assert.ok(parts.blocks.every(block=>block.pos>h.coverPos));
});
test('growing coverBody cannot increase physical A4 capacity or mutate PM state',()=>{
 const h=fixture({overflow:true}),before=h.editor.state,measured=measureManualPagination(h.editor);assert.ok(measured);assert.equal(measured.pages[1].capacity,110);assert.equal(measured.pages[1].blocks[0].height,300);assert.equal(h.editor.state,before);
});
test('unsupported footer reserve fails measurement instead of assuming infinite cover space',()=>{assert.equal(measureManualPagination(fixture({reserve:'unresolved-variable'}).editor),null);});

test('headers that consume the whole A4 surface report zero capacity',()=>{const measured=measureManualPagination(fixture({firstTop:210}).editor);assert.ok(measured);assert.equal(measured.pages[1].capacity,0);});

for(const [rolePosition,margin] of [['before',0],['after',0],['after',5],['after',18]])test(`cover join probe preserves frame/body and retained role order: ${rolePosition}, margin ${margin}`,()=>{
 const h=fixture({rolePosition}),shape=manualPaginationPageParts(h.state.doc.lastChild,h.coverPos),rect=(top,height)=>({top,bottom:top+height,width:100,height});let probes=0,checked=false;
 h.document.defaultView.getComputedStyle=element=>({width:'100px',marginBottom:`${element?.marginBottom||0}px`,marginTop:'0px',paddingTop:'0px',paddingBottom:'0px',getPropertyValue:()=> '20px'});
 class Element{
  constructor(kind,top,height){this.kind=kind;this.top=top;this.height=height;this.offsetWidth=100;this.style={};this.ownerDocument=h.document;this.childNodes=[];this.children=this.childNodes;this.marginBottom=0;}
  getBoundingClientRect(){if(this.top!==null)return rect(this.top,this.height);const prior=this.parentNode.children[this.parentNode.children.indexOf(this)-1];return rect(prior?prior.getBoundingClientRect().bottom+Math.max(14,prior.marginBottom):50,this.height);}
  setAttribute(){}removeAttribute(){}querySelectorAll(){return [];}querySelector(){return this.content||null;}
  append(...nodes){for(const node of nodes){this.childNodes.push(node);node.parentNode=this;}}
  replaceChildren(...nodes){this.childNodes.length=0;this.append(...nodes);}
  cloneNode(deep){const copy=new Element(this.kind,this.kind==='incoming'?null:this.top,this.height);copy.marginBottom=this.marginBottom;if(deep)copy.append(...this.children.map(c=>c.cloneNode(true)));return copy;}
  remove(){if(this.parentNode){const index=this.parentNode.children.indexOf(this);this.parentNode.children.splice(index,1);}if(this.kind==='host')probes--;}
 }
 const paper=new Element('paper',0,200),outer=new Element('outer',0,200),frame=new Element('frame',40,140),body=new Element('body',50,120);paper.append(outer);outer.append(frame);frame.append(body);
 h.positions.set(h.coverPos,paper);h.positions.set(shape.body.pos,body);
 for(const header of shape.headers){const old=h.positions.get(header.pos).getBoundingClientRect(),element=new Element('role',old.top,old.height);h.positions.set(header.pos,element);if(shape.bodyHeaders.includes(header))continue;outer.childNodes.splice(outer.childNodes.length-1,0,element);element.parentNode=outer;}
 const bodyNodes=[];shape.body.node.forEach((node,offset)=>{const pos=shape.body.pos+1+offset,old=h.positions.get(pos).getBoundingClientRect(),element=new Element(node.attrs.id==='a'||node.attrs.id==='b'?'ordinary':'role',old.top,old.height);h.positions.set(pos,element);if(element.kind==='role')element.marginBottom=margin;bodyNodes.push(element);});body.append(...bodyNodes);
 const incomingNode=h.state.doc.firstChild.lastChild.type.create({id:'incoming',meta:{}},null),tail=h.state.doc.firstChild.type.create({id:'tail',meta:{extensions:withManualPaginationMarker({},{kind:'page',rootPageId:'cover'}).extensions}},[incomingNode]),tailPos=h.state.doc.content.size,doc=h.state.doc.copy(h.state.doc.content.append(Fragment.from(tail)));
 h.editor.state=EditorState.create({doc});const tailPaper=new Element('tail',0,200),tailBody=new Element('tail-body',0,180),incoming=new Element('incoming',20,10);tailPaper.content=tailBody;h.positions.set(tailPos,tailPaper);h.positions.set(tailPos+1,incoming);
 h.document.createElement=()=>new Element('host',0,0);h.editor.dom.className='manual-v2-editor';h.editor.dom.parentElement={append(host){probes++;const clonedPaper=host.children[0],clonedOuter=clonedPaper.children[0],clonedFrame=clonedOuter.children.at(-1),clonedBody=clonedFrame.children[0];assert.equal(clonedFrame.kind,'frame');assert.equal(clonedBody.kind,'body');assert.equal(clonedBody.children.at(-1).kind,'incoming');assert.equal(clonedBody.children.at(-2).kind,rolePosition==='after'?'role':'ordinary');checked=true;}};
 const measured=measureManualPagination(h.editor);assert.ok(measured);if(rolePosition==='after'&&margin>10){assert.equal(checked,false);assert.equal(probes,0);assert.ok(measured.pages[1].blocks.reduce((sum,b)=>sum+b.height,0)>measured.pages[1].capacity);assert.equal(measured.pages[1].pullGap,undefined);return;}assert.equal(checked,true);assert.equal(probes,0);assert.equal(measured.pages[1].pullGap,rolePosition==='after'?Math.max(14,margin)-margin:14);
 const root=measured.pages[1],used=root.blocks.reduce((sum,block)=>sum+block.height,0),incomingHeight=measured.pages[2].blocks[0].height,available=root.capacity-used-root.pullGap;
 if(rolePosition==='after'){assert.equal(available,10-Math.max(14,margin));assert.ok(incomingHeight>available,'incoming bottom194 exceeds fixed content bottom180');}else assert.ok(incomingHeight<=available);
});

for(const scale of [1,2])test(`body role margins and geometric gaps are counted once between blocks, scale ${scale}`,()=>{
 const measured=measureManualPagination(fixture({scale,rolePosition:'between',betweenGap:10,roleMarginTop:8,roleMarginBottom:5}).editor),cover=measured.pages[1];
 assert.equal(cover.capacity,110);assert.deepEqual(cover.blocks,[{id:'a',height:60},{id:'b',height:40}]);
 assert.equal(cover.capacity-cover.blocks.reduce((sum,b)=>sum+b.height,0),10,'physical bottom180 minus last ordinary bottom170');
});
for(const scale of [1,2])test(`trailing role margins are counted once with its real preceding gap, scale ${scale}`,()=>{
 const measured=measureManualPagination(fixture({scale,rolePosition:'after',roleMarginTop:10,roleMarginBottom:5}).editor),cover=measured.pages[1];
 assert.equal(cover.capacity,110);assert.deepEqual(cover.blocks,[{id:'a',height:40},{id:'b',height:65}]);
 assert.equal(cover.capacity-cover.blocks.reduce((sum,b)=>sum+b.height,0),5,'physical bottom180 minus trailing role bottom170 and margin5');
});

for(const scale of [1,2])test(`empty ordinary body uses actual last retained-role bottom including leading gap, scale ${scale}`,()=>{
 const measured=measureManualPagination(fixture({scale,emptyBody:true,roleTop:100,roleMarginTop:10,roleMarginBottom:5}).editor),cover=measured.pages[1];
 assert.deepEqual(cover.blocks,[]);assert.equal(cover.capacity,55,'footer boundary180 minus actual retained role bottom120 + margin5');
});
