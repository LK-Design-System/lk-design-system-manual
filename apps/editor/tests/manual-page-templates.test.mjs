import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {getOrderedPageEntries} from '../src/redesign/manual-page-order.mjs';
import {getManualSlashTrigger} from '../src/redesign/manual-kernel.mjs';
import {closeHistory} from '@tiptap/pm/history';
import {createEmptyManualDocument,validateManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,manualCommands,findManualCoverRole,findManualObject} from '../src/redesign/manual-kernel.mjs';
import {withManualPaginationMarker} from '../src/redesign/manual-pagination-meta.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
import {MANUAL_PAGE_TEMPLATES,createManualPageTemplate,insertManualPageTemplate,configureManualCoverTemplate} from '../src/redesign/manual-page-templates.mjs';

function fixture(){
 const d=createEmptyManualDocument({title:'문서 제목'});d.extensions={vendor:{keep:'document'}};d.pages[0].extensions={vendor:{keep:'root'}};
 const root=d.pages[0].id;
 for(let i=0;i<2;i++)d.pages.push({...createManualPageTemplate('body'),...withManualPaginationMarker({extensions:{vendor:{tail:i}}},{kind:'page',rootPageId:root})});
 d.pages.push(createManualPageTemplate('body'));return d;
}
function harness(document=fixture()){
 let state=createManualState({document});const dispatch=tr=>{state=state.applyTransaction(tr).state;};
 return {get state(){return state;},get document(){return documentFromState(state);},dispatch,run(command,view){return command(state,dispatch,view);}};
}
function history(h,before){
 const after=h.state;assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
 assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));
 assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document:h.document,assets:{}})).document,h.document);
 const ids=[];h.state.doc.descendants(node=>{if(node.attrs.id)ids.push(node.attrs.id);});assert.equal(new Set(ids).size,ids.length);
}

test('presets serialize as distinct v2 compositions with independent nested IDs',()=>{
 assert.ok(Object.isFrozen(MANUAL_PAGE_TEMPLATES));const source=createEmptyManualDocument(),before=structuredClone(source),ids=[];
 for(const id of ['body','procedure','table','cover'])for(let i=0;i<2;i++){
  const data=createManualPageTemplate(id),d=structuredClone(source);if(id==='cover')d.cover=data;else d.pages=[data];
  validateManualDocument(d);const node=createManualState({document:d});assert.deepEqual(documentFromState(node),d);
  const visit=value=>{if(!value||typeof value!=='object')return;if(value.id)ids.push(value.id);for(const child of Object.values(value))if(child&&typeof child==='object')Array.isArray(child)?child.forEach(visit):visit(child);};visit(data);
 }
 assert.equal(new Set(ids).size,ids.length);assert.deepEqual(source,before);
 assert.deepEqual(createManualPageTemplate('body').blocks.map(b=>b.type),['paragraph']);
 assert.deepEqual(createManualPageTemplate('procedure').blocks.map(b=>b.type),['procedure','callout']);
 assert.deepEqual(createManualPageTemplate('table').blocks.map(b=>b.type),['table','paragraph']);
});

for(const preset of ['body','procedure','table'])for(const slot of [0,1,2,3])test(`${preset} at physical page ${slot} follows the whole logical group, one Undo/Redo`,()=>{
 const h=harness(),before=h.state,original=h.document,source=structuredClone(original),anchor=original.pages[slot].id;
 // A prior unrelated edit belongs to its own history event.
 h.dispatch(closeHistory(h.state.tr).insertText('prior',2));const prior=h.state;
 const command=insertManualPageTemplate(preset,{afterPageId:anchor,revision:prior.doc});assert.equal(command(h.state),true);assert.equal(h.state,prior);
 assert.equal(h.run(command),true);const after=h.document,added=after.pages.find(page=>!source.pages.some(p=>p.id===page.id));assert.equal(after.pages[slot===3?4:3].id,added.id);
 assert.deepEqual(after.pages.filter(page=>page!==added),documentFromState(prior).pages);assert.deepEqual(after.extensions,source.extensions);
 assert.equal(h.state.selection.$from.node(1).attrs.id,added.id);assert.equal(h.state.selection.$from.parent.type.name,'pageTitle');
 history(h,prior);assert.ok(!h.state.doc.eq(before.doc));
});

test('cancelled, stale, readonly, composing, invalid anchor and unknown preset do not dispatch',()=>{
 const h=harness(),before=h.state,id=h.document.pages[0].id;
 for(const options of [{cancelled:true},{readOnly:true},{revision:createManualState({document:h.document}).doc},{afterPageId:'missing'},{afterPageId:h.document.pages[0].blocks[0].id}]){
  assert.equal(h.run(insertManualPageTemplate('procedure',{afterPageId:id,...options})),false);assert.equal(h.state,before);
 }
 for(const view of [{editable:false},{composing:true}])assert.equal(h.run(insertManualPageTemplate('table',{afterPageId:id}),view),false);
 assert.equal(h.run(insertManualPageTemplate('unknown',{afterPageId:id})),false);assert.equal(h.state,before);
});

test('screen layout requires selected image; selection data and asset map are immutable',()=>{
 const h=harness(),before=h.state,afterPageId=h.document.pages[0].id;
 for(const figure of [undefined,{asset:'',alt:''},{asset:'../image.png',alt:''},{asset:'https://image.png',alt:''}])assert.equal(h.run(insertManualPageTemplate('screen',{afterPageId,figure})),false);
 assert.equal(h.state,before);
 const figure={asset:'assets/selected.png',alt:'선택한 화면',caption:[{type:'text',text:'화면 설명',marks:[{type:'emphasis'}]}]},snapshot=structuredClone(figure),assets={'assets/selected.png':'data:image/png;base64,AA=='};
 for(const resolveAsset of [undefined,()=>'',()=> 'https://example.test/image.png',()=>{throw new Error('asset removed');}])assert.equal(h.run(insertManualPageTemplate('screen',{afterPageId,figure,resolveAsset})),false);
 assert.equal(h.state,before);
 assert.equal(h.run(insertManualPageTemplate('screen',{afterPageId,figure,resolveAsset:key=>assets[key]})),true);const page=h.document.pages[3];
 assert.equal(page.blocks[0].type,'mediaGroup');assert.deepEqual(page.blocks[0].figure.caption,figure.caption);assert.deepEqual(figure,snapshot);
 assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document:h.document,assets})).assets,assets);history(h,before);
});


function physical(h){const result=[];h.state.doc.forEach(node=>result.push(node));return result;}
for(const hasCover of [false,true])for(const tails of [false,true])test(`fresh cover before current logical page (existing=${hasCover}, tails=${tails}) preserves all prior nodes and serializes every cover`,()=>{
 let d=createEmptyManualDocument({title:'제품 매뉴얼'});const first=d.pages[0];d.extensions={vendor:{keep:'document'}};first.extensions={vendor:{keep:'page'}};
 if(hasCover)d.cover=createManualPageTemplate('cover',{title:'기존 표지'});
 let tail;if(tails){tail={...createManualPageTemplate('body'),...withManualPaginationMarker({extensions:{vendor:{keep:'tail'}}},{kind:'page',rootPageId:first.id})};d.pages.push(tail);}
 const h=harness(d),source=findManualObject(h.state,(tail??first).blocks[0].id);h.dispatch(closeHistory(h.state.tr).setSelection(TextSelection.create(h.state.doc,source.pos+1)).insertText('/표지'));
 const before=h.state,trigger=getManualSlashTrigger(before),command=configureManualCoverTemplate({trigger,revision:before.doc});assert.equal(command(before),true);assert.equal(h.state,before);
 const oldNodes=physical(h);assert.equal(h.run(command),true);const added=physical(h).find(node=>!oldNodes.some(old=>old.attrs.id===node.attrs.id));assert.equal(added.type.name,'cover');
 const expectedOrder=[...(hasCover?[d.cover.id]:[]),added.attrs.id,first.id,...(tail?[tail.id]:[])];assert.deepEqual(physical(h).map(node=>node.attrs.id),expectedOrder);assert.equal(h.state.selection.$from.node(1).attrs.id,added.attrs.id);
 for(const node of oldNodes){const current=findManualObject(h.state,node.attrs.id).node;if(node.attrs.id!==sourceSurfaceId(before,source.pos))assert.ok(current.eq(node));}
 assert.deepEqual(h.document.extensions.vendor,{keep:'document'});assert.equal(getOrderedPageEntries(h.document).filter(page=>page.metadata!==undefined).length,hasCover?2:1);assert.ok(!JSON.stringify(h.document).includes('/표지'));history(h,before);
});
function sourceSurfaceId(state,pos){return state.doc.resolve(pos+1).node(1).attrs.id;}
test('repeated cover insertion at an existing cover creates independent templates, keeps content and one Undo each',()=>{
 const d=createEmptyManualDocument();d.cover=createManualPageTemplate('cover',{title:'사용자 표지'});const h=harness(d),original=physical(h);
 for(let repeat=0;repeat<3;repeat++){
  const before=h.state;assert.equal(h.run(configureManualCoverTemplate()),true);const all=physical(h);assert.equal(all.filter(node=>node.type.name==='cover').length,repeat+2);
  for(const node of original)assert.ok(findManualObject(h.state,node.attrs.id).node.eq(node));history(h,before);
 }
});
test('explicit after-page boundary inserts a cover after the entire anchored family',()=>{
 const h=harness(),before=h.state,anchor=h.document.pages[1].id,root=h.document.pages[0].id;
 assert.equal(h.run(insertManualPageTemplate('cover',{afterPageId:anchor})),true);const ids=physical(h).map(node=>node.attrs.id),added=physical(h).find(node=>node.type.name==='cover');assert.equal(ids.indexOf(added.attrs.id),3);assert.equal(ids[0],root);history(h,before);
});
test('cover-only insertion adds a fresh template and preserves existing cover',()=>{
 const d=createEmptyManualDocument();d.cover=createManualPageTemplate('cover');d.pages=[];const h=harness(d),before=h.state,original=h.state.doc.firstChild;
 assert.equal(h.run(configureManualCoverTemplate()),true);assert.equal(h.state.doc.childCount,2);assert.ok(h.state.doc.lastChild.eq(original));history(h,before);
});
test('fresh cover insertion guards stale, readonly, composing, cancelled and missing target without dispatch',()=>{
 const d=createEmptyManualDocument();d.cover=createManualPageTemplate('cover');const h=harness(d),before=h.state;
 for(const options of [{revision:createManualState({document:d}).doc},{readOnly:true},{cancelled:true},{targetId:'missing'}])assert.equal(h.run(configureManualCoverTemplate(options)),false);
 for(const view of [{editable:false},{composing:true}])assert.equal(h.run(configureManualCoverTemplate(),view),false);assert.equal(h.state,before);
});

test('inserting beside a depleted cover leaves its omitted roles untouched and creates a full independent template',()=>{
 const d=createEmptyManualDocument();d.cover=createManualPageTemplate('cover');const h=harness(d);
 for(const role of ['logo','metadata']){const found=findManualCoverRole(h.state,d.cover.id,role);h.dispatch(h.state.tr.delete(found.pos,found.pos+found.node.nodeSize));}
 const before=h.state,existing=findManualObject(before,d.cover.id).node;assert.equal(h.run(configureManualCoverTemplate()),true);
 assert.ok(findManualObject(h.state,d.cover.id).node.eq(existing));assert.equal(findManualCoverRole(h.state,d.cover.id,'logo'),null);assert.equal(findManualCoverRole(h.state,d.cover.id,'metadata'),null);
 const added=h.state.doc.firstChild;for(const role of ['logo','title','metadata','divider','sectionTitle'])assert.ok(findManualCoverRole(h.state,added.attrs.id,role));history(h,before);
});
