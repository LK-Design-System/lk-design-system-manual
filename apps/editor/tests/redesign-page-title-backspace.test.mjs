import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection,NodeSelection} from '@tiptap/pm/state';
import {createManualState,documentFromState,findManualObject,findManualPageRole,manualCommands,deleteManualObject,selectManualObject,applyManualPageTitle} from '../src/redesign/manual-kernel.mjs';
import {withManualPageRole,MANUAL_PAGE_PROJECTION_OWNER} from '../src/redesign/manual-page-projection.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
import {withManualPaginationMarker} from '../src/redesign/manual-pagination-meta.mjs';
import {selectManualBlocks} from '../src/redesign/manual-block-selection.mjs';
const p=(id,content=[])=>({type:'paragraph',id,content,extensions:{opaque:{id}}});
const text=txt=>[{type:'text',text:txt,marks:[{type:'strong'}]}];
function harness({explicit=false,title=[],blocks=[p('body')],tail=false}={}){
 const page={id:'page',title,blocks,extensions:{vendor:{page:'keep'}}};
 if(explicit){page.title=[];page.blocks=[p('authored-title',title),...blocks];page.blocks[0].extensions={opaqueTitle:{keep:[1,2]}};}
 const document={schemaVersion:2,id:'document',title:'Synthetic',cover:{id:'cover',title:[],metadata:[],blocks:[]},pages:[page,{id:'other',title:text('Other'),blocks:[p('other-body',tail?[]:text('Keep'))],...(tail?withManualPaginationMarker({}, {kind:'page',rootPageId:'page'}):{})}]};
 let state=createManualState({document}),count=0;const dispatch=tr=>{count++;state=state.applyTransaction(tr).state;};
 if(explicit){deleteManualObject(findManualPageRole(state,'page','title').node.attrs.id)(state,dispatch);selectManualObject('authored-title')(state,dispatch);applyManualPageTitle({mode:'turnInto',targetId:'authored-title'})(state,dispatch);}
 const view={get state(){return state;},dispatch,dom:{isConnected:true},props:{},composing:false,editable:true,endOfTextblock:()=>true};
 return {get state(){return state;},get count(){return count;},get document(){return documentFromState(state);},view,dispatch,run:(fn=manualCommands.backspace,v=view)=>fn(state,dispatch,v),select(id,offset=0){const obj=findManualObject(state,id);dispatch(state.tr.setSelection(TextSelection.create(state.doc,obj.pos+1+offset)));}};
}
function exact(h,before){const after=h.state;assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));}
for(const explicit of [false,true])test(`${explicit?'authored pinned':'legacy scalar'} empty title Backspace removes actual role, keeps body/caret, omission survives file reopen, exact Undo/Redo`,()=>{
 const h=harness({explicit});h.select('body');const before=h.state,d=h.document,title=findManualPageRole(before,'page','title');assert.equal(title.node.type.name,'pageTitle');assert.equal(title.node.content.size,0);
 const count=h.count;assert.equal(manualCommands.backspace(before),true);assert.equal(h.state,before);assert.equal(h.count,count);assert.equal(h.run(),true);assert.equal(h.count,count+1);
 assert.equal(findManualPageRole(h.state,'page','title'),null);assert.equal(h.state.selection.$from.parent.attrs.id,'body');assert.equal(h.state.selection.$from.parentOffset,0);
 const out=h.document;assert.deepEqual(out.cover,d.cover);assert.deepEqual(out.pages[1],d.pages[1]);assert.deepEqual(out.pages[0].title,[]);assert.deepEqual(out.pages[0].blocks[0].content,[]);assert.deepEqual(out.pages[0].blocks[0].extensions.opaque,d.pages[0].blocks[0].extensions.opaque);assert.deepEqual(out.pages[0].extensions.vendor,d.pages[0].extensions.vendor);
 const savedTitle=out.pages[0].blocks[0].extensions.removedManualPageTitle;assert.equal(savedTitle.id,title.node.attrs.id);assert.deepEqual(savedTitle.extensions,title.node.attrs.meta.extensions);
 const layout=Object.values(out.pages[0].extensions).find(value=>value?.owner===MANUAL_PAGE_PROJECTION_OWNER&&value.kind==='layout');assert.ok(layout.omittedRoles.includes('title'));
 const reopened=decodeDocumentFile(encodeDocumentFile({document:out,assets:{}})).document;assert.deepEqual(reopened,out);const restored=createManualState({document:reopened});assert.equal(findManualPageRole(restored,'page','title'),null);assert.deepEqual(documentFromState(restored),out);
 exact(h,before);
 h.dispatch(h.state.tr.insertText('Continue'));assert.equal(h.document.pages[0].blocks[0].content[0].text,'Continue');
});
for(const explicit of [false,true])test(`${explicit?'authored':'legacy'} nonempty title moves caret to its end without text or metadata mutation`,()=>{
 const h=harness({explicit,title:text('Title')});h.select('body');const before=h.state,original=h.document,title=findManualPageRole(before,'page','title');assert.equal(h.run(),true);assert.equal(h.state.doc,before.doc);assert.deepEqual(h.document,original);assert.equal(h.state.selection.$from.parent.attrs.id,title.node.attrs.id);assert.equal(h.state.selection.$from.parentOffset,title.node.content.size);
});
test('actual Backspace key binding applies exactly one title deletion transaction',()=>{const h=harness();h.select('body');const n=h.count;assert.equal(h.state.plugins.some(plugin=>plugin.props.handleKeyDown?.(h.view,{key:'Backspace',keyCode:8,shiftKey:false,altKey:false,ctrlKey:false,metaKey:false})),true);assert.equal(h.count,n+1);assert.equal(findManualPageRole(h.state,'page','title'),null);});
for(const mode of ['composing','read-only','stale','node','multi','cell'])test(`${mode} selection cannot remove a page title`,()=>{
 const blocks=mode==='cell'?[{type:'table',id:'table',label:'',headers:[{id:'cell',content:[]}],rows:[]}]:[p('body'),p('next')],h=harness({blocks});h.select(mode==='cell'?'cell':'body');
 let view=h.view;if(mode==='composing')view={...view,composing:true};if(mode==='read-only')view={...view,editable:false};if(mode==='stale')view={...view,state:createManualState({document:h.document})};
 if(mode==='node')h.dispatch(h.state.tr.setSelection(NodeSelection.create(h.state.doc,findManualObject(h.state,'body').pos)));if(mode==='multi')h.run(selectManualBlocks('body','next'));
 const title=findManualPageRole(h.state,'page','title').node;h.run(manualCommands.backspace,view);assert.ok(findManualPageRole(h.state,'page','title').node.eq(title));
});
test('generated continuation title and physical pages are preserved at an empty continuation body beside the root title',()=>{const h=harness({tail:true,blocks:[]});h.select('other-body');const before=h.state,d=h.document;h.run();assert.deepEqual(h.document,d);assert.ok(h.state.doc.eq(before.doc));});
for(const [label,left] of [['paragraph',p('prior',text('Before'))],['heading',{type:'heading',id:'prior',level:3,content:text('Before')}],['list',{type:'list',id:'prior',ordered:false,items:[{id:'item',blocks:[p('item-body',text('Before'))]}]}],['callout',{type:'callout',id:'prior',tone:'signal',title:text('Notice'),blocks:[p('callout-body',text('Before'))]}],['divider',{type:'divider',id:'prior'}]])test(`previous ${label} does not remove page title or preceding text`,()=>{const h=harness({title:text('Title'),blocks:[left,p('body')]});h.select('body');const original=h.document;h.run();assert.deepEqual(h.document.pages[0].title,original.pages[0].title);assert.ok(h.state.doc.textContent.includes('Before')||label==='divider');assert.deepEqual(h.document.pages[1],original.pages[1]);});
