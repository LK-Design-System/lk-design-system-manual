import test from 'node:test';
import assert from 'node:assert/strict';
import {AllSelection,NodeSelection,TextSelection} from '@tiptap/pm/state';
import {closeHistory} from '@tiptap/pm/history';
import {createEmptyManualDocument,validateManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {planManualPagination,createManualPaginationTransaction} from '../src/redesign/manual-pagination.mjs';
import {manualPaginationMarker,withManualPaginationMarker} from '../src/redesign/manual-pagination-meta.mjs';
import {manualPaginationTextSelection,repeatedManualPaginationHeaders} from '../src/redesign/manual-pagination-selection.mjs';
import {selectManualBlocks} from '../src/redesign/manual-block-selection.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
import {withManualPageOrder} from '../src/redesign/manual-page-order.mjs';
import {getManualPageGroups,moveManualPageGroup,insertManualPageAfter} from '../src/redesign/manual-page-groups.mjs';

const run=text=>({type:'text',text,marks:[{type:'strong'}]});
const paragraph=(id,text)=>({id,type:'paragraph',content:[run(text)],extensions:{vendor:{keep:id}}});
function fixture(){
 const d=createEmptyManualDocument();d.id='qa-page-groups-document';d.cover={id:'cover',title:[run('Cover')],metadata:[],blocks:[paragraph('cover-body','Cover body')],extensions:{vendor:{cover:true}}};
 d.pages=[{id:'root',title:[run('Root')],blocks:[paragraph('long-body','ABCDEFGHIJKL')],extensions:{vendor:{root:true},manualPagination:{opaque:'keep'}}},
  {id:'b',title:[run('B')],blocks:[paragraph('b-body','B body')],extensions:{vendor:{b:true}}},
  {id:'c',title:[run('C')],blocks:[paragraph('c-body','C body')],extensions:{vendor:{c:true}}}];
 let state=createManualState({document:d});
 for(let pass=0;pass<2;pass++){
  const splitId=pass===0?'long-body':documentFromState(state).pages[1].blocks[0].id,pages=[];
  state.doc.forEach(page=>{if(page.type.name!=='page')return;const blocks=[];page.forEach(node=>{if(node.type.name==='pageTitle')return;blocks.push({id:node.attrs.id,height:node.attrs.id===splitId?160:page.attrs.id==='root'?100:10,...(node.attrs.id===splitId?{splits:[{kind:'text',at:4,headHeight:80,tailHeight:80}]}:{})});});pages.push({id:page.attrs.id,capacity:100,blocks});});
  const plan=planManualPagination(state,{doc:state.doc,revision:pass,pages});assert.equal(plan.status,'ready');state=state.applyTransaction(createManualPaginationTransaction(state,plan)).state;
 }
 return documentFromState(state);
}
function harness(d=fixture()){
 let state=createManualState({document:d});const dispatch=tr=>{state=state.applyTransaction(tr).state;};
 return {get state(){return state;},get document(){const d=documentFromState(state);validateManualDocument(d);return d;},dispatch,run(command,view){return command(state,dispatch,view);},select(id,offset=0){const found=findManualObject(state,id);dispatch(state.tr.setSelection(TextSelection.create(state.doc,found.pos+1+offset)));}};
}
function field($pos){return {page:$pos.node(1).attrs.id,relative:$pos.pos-$pos.before(1)};}
function invariants(h){
 const d=h.document;assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document:d,assets:{}})).document,d);const ids=[];h.state.doc.descendants(node=>{if(node.attrs.id)ids.push(node.attrs.id);});assert.equal(new Set(ids).size,ids.length);
}
function undoRedo(h,before){
 const after=h.state;assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));invariants(h);
}

test('logical groups include the cover and only consecutive recognized automatic tails',()=>{
 const h=harness(),d=h.document,tailIds=d.pages.slice(1,3).map(page=>page.id);assert.deepEqual(getManualPageGroups(h.state.doc),[{id:'cover',kind:'cover',pageIds:['cover']},{id:'root',kind:'page',pageIds:['root',...tailIds]},{id:'b',kind:'page',pageIds:['b']},{id:'c',kind:'page',pageIds:['c']}]);
 const orphan={id:'orphan',title:[run('Orphan')],blocks:[paragraph('orphan-body','Orphan body')],...withManualPaginationMarker({}, {kind:'page',rootPageId:'root'})};d.pages.push(orphan);
 // Domain extensions can reserve the default key; only the owned marker counts.
 d.pages[2].extensions=withManualPaginationMarker({extensions:{manualPagination:{opaque:true}}},{kind:'page',rootPageId:'root'}).extensions;
 d.pages[3].extensions.manualPagination={kind:'page',rootPageId:'root',owner:'another-owner',version:1};
 const next=createManualState({document:d});assert.deepEqual(getManualPageGroups(next.doc).map(group=>group.pageIds),[['cover'],['root',...tailIds],['b'],['c'],['orphan']]);
});

const moves=[['root','b','before',['root','b','c']],['root','b','after',['b','root','c']],['root','c','before',['b','root','c']],['root','c','after',['b','c','root']],['b','root','before',['b','root','c']],['b','root','after',['root','b','c']],['b','c','before',['root','b','c']],['b','c','after',['root','c','b']],['c','root','before',['c','root','b']],['c','root','after',['root','c','b']],['c','b','before',['root','c','b']],['c','b','after',['root','b','c']]];
for(const [sourceId,targetId,edge,order]of moves)test(`${sourceId} ${edge} ${targetId} moves the whole page group or rejects its original slot`,()=>{
 const h=harness(),d=h.document,groups=getManualPageGroups(h.state.doc),tail=d.pages[2];h.select(tail.blocks[0].id,1);h.dispatch(h.state.tr.setStoredMarks([h.state.schema.marks.emphasis.create()]));const before=h.state,point=field(before.selection.$from),command=moveManualPageGroup({sourceId,targetId,edge,revision:before.doc}),changed=order.join(',')!=='root,b,c';
 assert.equal(command(h.state),changed);assert.equal(h.state,before);assert.equal(h.run(command),changed);if(!changed){assert.equal(h.state,before);return;}
 const after=h.document,byId=new Map(d.pages.map(page=>[page.id,page])),expectedIds=order.flatMap(id=>groups.find(group=>group.id===id).pageIds);assert.deepEqual(after.pages,expectedIds.map(id=>byId.get(id)));assert.deepEqual(after.cover,d.cover);assert.deepEqual(field(h.state.selection.$from),point);assert.deepEqual(h.state.storedMarks,before.storedMarks);assert.deepEqual(getManualPageGroups(h.state.doc).map(group=>group.id),['cover',...order]);undoRedo(h,before);
});

for(const kind of ['node','all','blocks','title','forward range','reverse range'])test(`page group movement preserves ${kind} selection`,()=>{
 const h=harness(),d=h.document;
 if(kind==='node')h.dispatch(h.state.tr.setSelection(NodeSelection.create(h.state.doc,findManualObject(h.state,'root').pos)));
 else if(kind==='all')h.dispatch(h.state.tr.setSelection(new AllSelection(h.state.doc)));
 else if(kind==='blocks')h.run(selectManualBlocks('long-body',d.pages[2].blocks[0].id));
 else if(kind==='title')h.dispatch(h.state.tr.setSelection(TextSelection.create(h.state.doc,findManualObject(h.state,'root').pos+2+2)));
 else{const a=findManualObject(h.state,'long-body').pos+2,b=findManualObject(h.state,d.pages[2].blocks[0].id).pos+3,excluded=repeatedManualPaginationHeaders(h.state.doc).map(header=>header.key);h.dispatch(h.state.tr.setSelection(manualPaginationTextSelection(h.state.doc,kind==='forward range'?a:b,kind==='forward range'?b:a,excluded)));}
 const before=h.state,anchor=kind==='title'||kind.includes('range')?field(before.selection.$anchor):null,head=anchor?field(before.selection.$head):null;
 assert.equal(h.run(moveManualPageGroup({sourceId:'root',targetId:'c',edge:'after'})),true);
 if(anchor){assert.deepEqual(field(h.state.selection.$anchor),anchor);assert.deepEqual(field(h.state.selection.$head),head);assert.deepEqual(h.state.selection.excludedHeaders,before.selection.excludedHeaders);}
 else if(kind==='node')assert.equal(h.state.selection.node.attrs.id,'root');
 else if(kind==='all')assert.ok(h.state.selection instanceof AllSelection);
 else{assert.deepEqual(h.state.selection.ids,before.selection.ids);assert.deepEqual(h.state.selection.toJSON(),before.selection.toJSON());}
 undoRedo(h,before);
});

test('move guards reject physical tails, invalid slots, stale revisions, readonly and composition without mutation',()=>{
 const h=harness(),before=h.state,tail=h.document.pages[1].id;
 for(const options of [{sourceId:tail,targetId:'b',edge:'after'},{sourceId:'b',targetId:tail,edge:'before'},{sourceId:'missing',targetId:'b',edge:'after'},{sourceId:'b',targetId:'missing',edge:'after'},{sourceId:'root',targetId:'root',edge:'before'},{sourceId:'root',targetId:'b',edge:'middle'},{sourceId:'root',targetId:'b',edge:'after',revision:createManualState({document:h.document}).doc}]){assert.equal(h.run(moveManualPageGroup(options)),false);assert.equal(h.state,before);}
 for(const view of [{composing:true},{editable:false}]){assert.equal(h.run(moveManualPageGroup({sourceId:'root',targetId:'b',edge:'after'}),view),false);assert.equal(h.state,before);}
});

for(const edge of ['before','after'])test(`ordinary page movement ${edge} the cover preserves the cover identity and one UndoRedo`,()=>{
 const h=harness(),cover=h.state.doc.firstChild;h.dispatch(closeHistory(h.state.tr));const before=h.state;assert.equal(h.run(moveManualPageGroup({sourceId:'b',targetId:'cover',edge})),true);assert.ok(findManualObject(h.state,'cover').node.eq(cover));const ids=[];h.state.doc.forEach(node=>ids.push(node.attrs.id));assert.deepEqual(ids.slice(0,2),edge==='before'?['b','cover']:['cover','b']);assert.deepEqual(h.document.cover,before.doc.firstChild.type.name==='cover'?documentFromState(before).cover:null);undoRedo(h,before);
});

test('moving a page keeps the same selected blocks when an intervening page becomes a gap',()=>{
 const h=harness();h.run(selectManualBlocks('long-body','b-body'));const before=h.state,ids=new Set(before.selection.ids);assert.equal(h.run(moveManualPageGroup({sourceId:'root',targetId:'c',edge:'after'})),true);
 assert.deepEqual(new Set(h.state.selection.ids),ids);assert.equal(h.state.selection.manualSparseBlockSelection,true);assert.equal(h.state.selection.ids.includes('c-body'),false);undoRedo(h,before);
});

for(const at of ['root','middle tail','last tail','b','cover'])test(`page button at ${at} inserts an independent page after its logical group with one Undo`,()=>{
 const h=harness(),d=h.document,clicked=at==='middle tail'?d.pages[1].id:at==='last tail'?d.pages[2].id:at;h.select('c-body',2);const before=h.state,groups=getManualPageGroups(before.doc),anchor=groups.find(group=>group.pageIds.includes(clicked)),command=insertManualPageAfter(clicked,{revision:before.doc});assert.equal(command(h.state),true);assert.equal(h.state,before);assert.equal(h.run(command),true);
 const after=h.document,oldIds=new Set(d.pages.map(page=>page.id)),added=after.pages.find(page=>!oldIds.has(page.id)),slot=at==='cover'?0:d.pages.findIndex(page=>page.id===anchor.pageIds.at(-1))+1;
 assert.equal(after.pages[slot].id,added.id);assert.deepEqual(after.pages.filter(page=>page.id!==added.id),d.pages);assert.deepEqual(after.cover,d.cover);assert.equal(manualPaginationMarker(added.extensions,'page'),null);assert.deepEqual(added.title,[]);assert.deepEqual(added.blocks[0].content,[]);assert.equal(h.state.selection.$from.node(1).attrs.id,added.id);assert.equal(h.state.selection.$from.parent.type.name,'pageTitle');assert.equal(h.state.selection.$from.parentOffset,0);undoRedo(h,before);
});

test('page insert rejects missing/non-page targets, stale revisions, readonly and composition',()=>{
 const h=harness(),before=h.state;for(const id of ['missing','long-body']){assert.equal(h.run(insertManualPageAfter(id)),false);assert.equal(h.state,before);}
 assert.equal(h.run(insertManualPageAfter('root',{revision:createManualState({document:h.document}).doc})),false);assert.equal(h.state,before);
 for(const view of [{composing:true},{editable:false}]){assert.equal(h.run(insertManualPageAfter('root'),view),false);assert.equal(h.state,before);}
});

test('cover in second position moves before the first body with its consecutive automatic tail intact',()=>{
 const d=createEmptyManualDocument();d.cover={id:'cover',title:[run('Cover')],metadata:[],blocks:[paragraph('cover-body','Cover')],extensions:{vendor:{keep:'cover'}}};d.pages=[{id:'root',title:[],blocks:[paragraph('root-body','First body')],extensions:{vendor:{keep:'body'}}}];const tail={id:'cover-tail',title:[],blocks:[paragraph('cover-tail-body','Continued cover')],...withManualPaginationMarker({extensions:{vendor:{keep:'cover-tail'}}},{kind:'page',rootPageId:'cover'})};
 d.pages.push(tail);const ids=d.pages.map(page=>page.id);const order=[ids[0],...ids.slice(1,-1),'cover','cover-tail'];
 const h=harness(withManualPageOrder(d,order));h.select('cover-tail-body',4);const before=h.state,nodes=[];before.doc.forEach(node=>nodes.push(node));
 assert.equal(h.run(moveManualPageGroup({sourceId:'cover',targetId:'root',edge:'before'})),true);
 const after=[];h.state.doc.forEach(node=>after.push(node));assert.deepEqual(after.map(node=>node.attrs.id),['cover','cover-tail',...ids.slice(0,-1)]);
 for(const node of nodes)assert.ok(after.find(next=>next.attrs.id===node.attrs.id).eq(node));assert.deepEqual(h.document.cover,documentFromState(before).cover);
 assert.deepEqual(field(h.state.selection.$from),field(before.selection.$from));undoRedo(h,before);
});
