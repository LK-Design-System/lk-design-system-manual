import test from 'node:test';
import assert from 'node:assert/strict';
import {Selection,TextSelection} from '@tiptap/pm/state';
import {closeHistory} from '@tiptap/pm/history';
import {createEmptyManualDocument,validateManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {ManualBlockSelection,selectManualBlockIds,manualBlockSelectionPlugin,deleteSelectedManualBlocks,duplicateSelectedManualBlocks,moveSelectedManualBlocks,extendManualBlockSelection} from '../src/redesign/manual-block-selection.mjs';
import {withManualPaginationMarker,manualPaginationMarker} from '../src/redesign/manual-pagination-meta.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
const id=()=>crypto.randomUUID(),p=text=>({id:id(),type:'paragraph',content:[{type:'text',text,marks:[{type:'strong'}]}],extensions:{vendor:text}});
function fixture(){const d=createEmptyManualDocument(),blocks=['A','UNHIT','C','KEEP'].map(p);d.pages[0].title=[{type:'text',text:'TITLE'}];d.pages[0].blocks=blocks;return {d,blocks};}
function harness(d){let state=createManualState({document:d,plugins:[manualBlockSelectionPlugin()]});const dispatch=tr=>state=state.applyTransaction(tr).state;return {get state(){return state;},get document(){return documentFromState(state);},dispatch,run:c=>c(state,dispatch),boundary(){dispatch(closeHistory(state.tr));}};}
function valid(h){validateManualDocument(h.document);assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document:h.document,assets:{}})).document,h.document);const ids=[];h.state.doc.descendants(n=>{if(n.attrs.id)ids.push(n.attrs.id);});assert.equal(new Set(ids).size,ids.length);}
function undoRedo(h,before){const after=h.state;h.run(manualCommands.undo);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));h.run(manualCommands.redo);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));valid(h);}
function sparse(h,blocks){assert.equal(h.run(selectManualBlockIds([blocks[2].id,blocks[0].id,blocks[2].id])),true);assert.deepEqual(h.state.selection.ids,[blocks[0].id,blocks[2].id]);}
test('exact sparse IDs exclude an unhit middle block from ranges, clipboard and decorations',()=>{
 const {d,blocks}=fixture(),h=harness(d);sparse(h,blocks);const s=h.state.selection;assert.equal(s.manualSparseBlockSelection,true);assert.equal(s.ranges.length,2);assert.deepEqual([...s.content().content.content].map(n=>n.attrs.id),s.ids);assert.deepEqual(h.document,d);
 const decorations=h.state.plugins.find(plugin=>plugin.props.decorations)?.props.decorations(h.state).find();assert.deepEqual(decorations.map(x=>x.from),s.items.map(x=>x.pos));
});
test('sparse JSON and history bookmarks round trip the exact IDs',()=>{
 const {d,blocks}=fixture(),h=harness(d);sparse(h,blocks);const s=h.state.selection;assert.ok(Selection.fromJSON(h.state.doc,s.toJSON()).eq(s));assert.ok(s.getBookmark().resolve(h.state.doc).eq(s));
});
test('mapping unrelated edits and removed selected IDs never expands into unhit blocks',()=>{
 const {d,blocks}=fixture(),h=harness(d);sparse(h,blocks);const unhit=findManualObject(h.state,blocks[1].id);h.dispatch(h.state.tr.insertText('!',unhit.pos+1));assert.deepEqual(h.state.selection.ids,[blocks[0].id,blocks[2].id]);
 const selected=findManualObject(h.state,blocks[0].id);h.dispatch(h.state.tr.delete(selected.pos,selected.pos+selected.node.nodeSize));assert.deepEqual(h.state.selection.ids,[blocks[2].id]);valid(h);
});
test('selected ancestors remove duplicate descendant hits without selecting nearby siblings',()=>{
 const {d,blocks}=fixture(),inner=p('INNER'),callout={id:id(),type:'callout',tone:'signal',title:[],blocks:[inner],extensions:{vendor:'wrapper'}};d.pages[0].blocks=[callout,blocks[1],blocks[2]];const h=harness(d);assert.equal(h.run(selectManualBlockIds([inner.id,blocks[2].id,callout.id])),true);assert.deepEqual(h.state.selection.ids,[callout.id,blocks[2].id]);assert.equal(h.state.selection.content().content.childCount,2);
});
test('empty, missing, page and cell IDs reject without changing current selection',()=>{
 const {d,blocks}=fixture(),cell={id:id(),content:[]};d.pages[0].blocks.push({id:id(),type:'table',label:'',headers:[cell],rows:[]});const h=harness(d);sparse(h,blocks);const before=h.state;for(const ids of [[],['missing'],[d.pages[0].id],[cell.id],[blocks[0].id,d.pages[0].id],null])assert.equal(h.run(selectManualBlockIds(ids)),false);assert.equal(h.state,before);
});
test('sparse deletion preserves unhit blocks, page title and one exact UndoRedo',()=>{
 const {d,blocks}=fixture(),h=harness(d);sparse(h,blocks);h.boundary();const before=h.state;assert.equal(h.run(deleteSelectedManualBlocks),true);assert.deepEqual(h.document.pages[0].blocks,[blocks[1],blocks[3]]);assert.deepEqual(h.document.pages[0].title,d.pages[0].title);undoRedo(h,before);
});
test('sparse typing replaces only selected blocks and continues at the inserted body end',()=>{
 const {d,blocks}=fixture(),h=harness(d);sparse(h,blocks);h.boundary();const before=h.state;h.dispatch(h.state.tr.insertText('교체😀'));assert.deepEqual(h.document.pages[0].blocks.slice(1),[blocks[1],blocks[3]]);assert.equal(h.state.selection.$from.parent.type.name,'paragraph');assert.equal(h.state.selection.$from.parentOffset,4);undoRedo(h,before);h.boundary();h.dispatch(h.state.tr.insertText('계속'));assert.equal(h.document.pages[0].blocks[0].content[0].text,'교체😀계속');valid(h);
});
test('sparse duplication copies only hit objects with fresh IDs and preserved opaque metadata',()=>{
 const {d,blocks}=fixture(),h=harness(d);sparse(h,blocks);h.boundary();const before=h.state;assert.equal(h.run(duplicateSelectedManualBlocks),true);const result=h.document.pages[0].blocks;assert.deepEqual(result.filter(b=>blocks.some(x=>x.id===b.id)),blocks);assert.deepEqual(result.slice(3,5).map(b=>b.content),[blocks[0].content,blocks[2].content]);assert.deepEqual(result.slice(3,5).map(b=>b.extensions),[blocks[0].extensions,blocks[2].extensions]);undoRedo(h,before);
});
test('absolute sparse move keeps unhit objects intact; directional expansion/move stays unsupported',()=>{
 const {d,blocks}=fixture();d.pages.push({id:id(),title:[],blocks:[]});const h=harness(d);sparse(h,blocks);const untouched=h.state;assert.equal(h.run(moveSelectedManualBlocks({direction:'down'})),false);assert.equal(h.run(extendManualBlockSelection(1)),false);assert.equal(h.state,untouched);h.boundary();const before=h.state;assert.equal(h.run(moveSelectedManualBlocks({parentId:d.pages[1].id,index:1})),true);assert.deepEqual(h.document.pages[0].blocks,[blocks[1],blocks[3]]);assert.deepEqual(h.document.pages[1].blocks,[blocks[0],blocks[2]]);undoRedo(h,before);
});
function automatic(){const {d,blocks}=fixture(),head=blocks[0],tail={...p('TAIL'),...withManualPaginationMarker({extensions:{vendor:'tail'}},{kind:'block',rootBlockId:head.id,sourceType:'paragraph'})};tail.extensions=tail.extensions||{};d.pages[0].blocks=[head,blocks[1]];d.pages.push({id:id(),title:d.pages[0].title,blocks:[tail,blocks[3]],...withManualPaginationMarker({},{kind:'page',rootPageId:d.pages[0].id})});return {d,head,tail,unhit:blocks[1],keep:blocks[3]};}
test('recognized automatic family normalization selects all fragments but no unrelated intervening block',()=>{
 const {d,head,tail}=automatic(),h=harness(d);assert.equal(h.run(selectManualBlockIds([tail.id])),true);assert.deepEqual(h.state.selection.ids,[head.id,tail.id]);assert.equal(h.state.selection.manualIncompletePaginationSelection,false);assert.deepEqual(h.document,d);assert.equal(h.state.selection.ranges.length,2);
});
test('complete automatic sparse family deletion and typing preserve unrelated content and exact history',()=>{
 for(const typed of [false,true]){const {d,head,tail,unhit,keep}=automatic(),h=harness(d);h.run(selectManualBlockIds([tail.id]));h.boundary();const before=h.state;if(typed)h.dispatch(h.state.tr.insertText('X'));else assert.equal(h.run(deleteSelectedManualBlocks),true);assert.deepEqual(h.document.pages[0].blocks.filter(b=>b.id===unhit.id),[unhit]);assert.deepEqual(h.document.pages[1].blocks,[keep]);assert.equal(findManualObject(h.state,head.id),null);assert.equal(findManualObject(h.state,tail.id),null);undoRedo(h,before);}
});
test('physical partial automatic selection is exact and destructive operations safely reject',()=>{
 const {d,head,tail}=automatic(),h=harness(d);h.run(selectManualBlockIds([tail.id],{logicalFragments:false}));assert.deepEqual(h.state.selection.ids,[tail.id]);assert.equal(h.state.selection.manualIncompletePaginationSelection,true);const before=h.state;for(const command of [deleteSelectedManualBlocks,duplicateSelectedManualBlocks,moveSelectedManualBlocks({parentId:d.pages[0].id,index:1})])assert.equal(h.run(command),false);assert.throws(()=>h.state.tr.insertText('X'),/complete automatic block/);assert.equal(h.state,before);
});
test('complete automatic sparse duplication rewrites recognized references and preserves opaque fields',()=>{
 const {d,head,tail}=automatic(),h=harness(d);h.run(selectManualBlockIds([tail.id]));h.boundary();const before=h.state;assert.equal(h.run(duplicateSelectedManualBlocks),true);const copies=h.document.pages[1].blocks.slice(1,3);assert.notEqual(copies[0].id,head.id);assert.equal(manualPaginationMarker(copies[1].extensions,'block').rootBlockId,copies[0].id);assert.deepEqual(copies[1].extensions.vendor,tail.extensions.vendor);undoRedo(h,before);
});

test('marks apply to exact ranges without formatting the unhit block',()=>{
 const {d,blocks}=fixture(),h=harness(d);sparse(h,blocks);h.boundary();const before=h.state;assert.equal(h.run(manualCommands.strong),true);assert.deepEqual(h.document.pages[0].blocks[1],blocks[1]);assert.equal(h.document.pages[0].blocks[0].content[0].marks,undefined);assert.equal(h.document.pages[0].blocks[2].content[0].marks,undefined);undoRedo(h,before);
});
