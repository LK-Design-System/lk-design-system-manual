import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {closeHistory} from '@tiptap/pm/history';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,findManualObject,manualCommands,manualSchema} from '../src/redesign/manual-kernel.mjs';
import {withManualPaginationMarker} from '../src/redesign/manual-pagination-meta.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
import {createManualPageTemplate,insertManualPageTemplate} from '../src/redesign/manual-page-templates.mjs';

function fixture(cover){
 const document=createEmptyManualDocument({title:'Leading boundary'});document.extensions={vendor:{keep:'document'}};
 const root=document.pages[0];root.title=[{type:'text',text:'Root'}];root.blocks[0].content=[{type:'text',text:'Keep body',marks:[{type:'strong'}]}];root.extensions={vendor:{root:true}};
 document.pages.push({...createManualPageTemplate('body'),...withManualPaginationMarker({extensions:{vendor:{tail:true}}},{kind:'page',rootPageId:root.id})},createManualPageTemplate('table'));
 if(cover){document.cover=createManualPageTemplate('cover',{title:'Existing cover'});document.cover.extensions={vendor:{cover:true}};}
 return document;
}
function harness(document){
 let state=createManualState({document});const dispatch=tr=>{state=state.applyTransaction(tr).state;};
 const root=document.pages[0].blocks[0].id;dispatch(state.tr.setSelection(TextSelection.create(state.doc,findManualObject(state,root).pos+3)));
 dispatch(closeHistory(state.tr).insertText('Prior ',state.selection.from));
 return {get state(){return state;},get document(){return documentFromState(state);},run(command,view){return command(state,dispatch,view);}};
}
function undoRedo(h,before,assets={}){
 const after=h.state;assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));
 assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));
 assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document:h.document,assets})),{document:h.document,assets});
 const ids=[];h.state.doc.descendants(node=>{if(node.attrs.id)ids.push(node.attrs.id);});assert.equal(new Set(ids).size,ids.length);
}
for(const cover of [false,true])for(const templateId of ['body','procedure','table'])test(`explicit leading ${templateId} ${cover?'before cover':'at document start'} preserves original pages and one Undo/Redo`,()=>{
 const source=fixture(cover),snapshot=structuredClone(source),h=harness(source),before=h.state,d=h.document;
 const command=insertManualPageTemplate(templateId,{beforeFirstPage:true,revision:before.doc});assert.equal(command(h.state),true);assert.equal(h.state,before);assert.equal(h.run(command),true);
 assert.deepEqual(h.document.pages.slice(1),d.pages);assert.deepEqual(h.document.cover,d.cover);assert.deepEqual(h.document.extensions?.vendor,d.extensions?.vendor);assert.deepEqual(source,snapshot);
 assert.equal(h.state.doc.firstChild.type.name,'page');assert.equal(h.state.selection.$from.node(1).attrs.id,h.document.pages[0].id);assert.equal(h.state.selection.$from.parent.type.name,'pageTitle');assert.equal(h.state.selection.$from.parentOffset,0);
 undoRedo(h,before);
});

test('explicit leading cover creates a complete fresh template',()=>{
 const h=harness(fixture(false)),before=h.state,d=h.document;assert.equal(h.run(insertManualPageTemplate('cover',{beforeFirstPage:true,revision:before.doc})),true);
 assert.equal(h.state.doc.firstChild.type.name,'cover');assert.deepEqual(h.document.pages,d.pages);assert.equal(h.document.cover.title[0].text,'Leading boundary');
 undoRedo(h,before);
});

test('leading guards reject cancelled, composing, readonly, stale, ambiguous or missing insertion boundaries',()=>{
 const h=harness(fixture(true)),before=h.state;
 for(const options of [{cancelled:true},{readOnly:true},{revision:createManualState({document:h.document}).doc},{beforeFirstPage:'start'},{afterPageId:h.document.pages[0].id}]){assert.equal(h.run(insertManualPageTemplate('body',{beforeFirstPage:true,...options})),false);assert.equal(h.state,before);}
 for(const view of [{editable:false},{composing:true}]){assert.equal(h.run(insertManualPageTemplate('body',{beforeFirstPage:true}),view),false);assert.equal(h.state,before);}
 for(const afterPageId of [undefined,null,'missing']){assert.equal(h.run(insertManualPageTemplate('body',{afterPageId})),false);assert.equal(h.state,before);}
 const invalid={doc:manualSchema.nodes.doc.create({meta:{schemaVersion:2,id:'invalid',title:''}})};assert.equal(insertManualPageTemplate('body',{beforeFirstPage:true})(invalid),false);
});

test('leading image composition requires stored image bytes and preserves source assets',()=>{
 const h=harness(fixture(true)),before=h.state,d=h.document,assets={'assets/selected.png':'data:image/png;base64,AA=='},snapshot=structuredClone(assets),figure={asset:'assets/selected.png',alt:'Selected',caption:[{type:'text',text:'Caption'}]};
 assert.equal(h.run(insertManualPageTemplate('screen',{beforeFirstPage:true,figure,resolveAsset:()=>''})),false);assert.equal(h.state,before);
 assert.equal(h.run(insertManualPageTemplate('screen',{beforeFirstPage:true,revision:before.doc,figure,resolveAsset:key=>assets[key]})),true);
 assert.deepEqual(h.document.pages.slice(1),d.pages);assert.deepEqual(h.document.cover,d.cover);assert.deepEqual(assets,snapshot);undoRedo(h,before,assets);
});
