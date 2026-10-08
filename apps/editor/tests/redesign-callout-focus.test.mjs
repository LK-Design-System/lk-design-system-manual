import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection,NodeSelection} from '@tiptap/pm/state';
import {createEmptyManualDocument,newManualId} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,findManualObject,insertManualBlock,selectManualObject,manualCommands,executeManualBlockCommand} from '../src/redesign/manual-kernel.mjs';
import {manualCalloutFocusPlugin,manualCalloutFocusKey,focusManualCalloutBody,editManualCalloutTitle} from '../src/redesign/manual-callout-commands.mjs';

const paragraph=(text='')=>({type:'paragraph',id:newManualId(),content:text?[{type:'text',text,marks:[{type:'strong'}]}]:[],extensions:{opaque:{keep:true}}});
const callout=(options={})=>({type:'callout',id:newManualId(),title:[],tone:'cautionary',blocks:[paragraph()],extensions:{vendor:{keep:[1,2]}},...options});
function harness(blocks=[],options={}){
 const document=createEmptyManualDocument();document.pages[0].blocks=blocks;document.pages.push({id:newManualId(),title:[{type:'text',text:'Other'}],blocks:[paragraph('Other page')]});
 const plugin=manualCalloutFocusPlugin(options);let state=createManualState({document,plugins:[plugin]}),count=0,last=[];
 const dispatch=tr=>{const result=state.applyTransaction(tr);state=result.state;last=result.transactions;count++;};
 return {plugin,dispatch,get state(){return state;},get document(){return documentFromState(state);},get count(){return count;},get last(){return last;},run:(command,view)=>command(state,dispatch,view),title(id){const found=findManualObject(state,id);dispatch(state.tr.setSelection(TextSelection.create(state.doc,found.pos+2)));}};
}
function exactUndo(h,before,after){assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection.eq(before.selection));assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));}
test('untouched loaded empty-title/bodyless callout stays byte-equivalent with no history changes',()=>{
 const block=callout({blocks:[]}),h=harness([block]);assert.deepEqual(h.document.pages[0].blocks,[block]);assert.equal(h.count,0);assert.equal(h.run(manualCommands.undo),false);assert.equal(manualCalloutFocusKey.getState(h.state).editingId,null);
});
test('implicit empty title caret redirects to existing body without changing IDs, text, metadata or history',()=>{
 const block=callout({blocks:[paragraph('Keep body')]}),h=harness([block]),original=h.document;
 h.title(block.id);assert.equal(h.state.selection.$from.parent.attrs.id,block.blocks[0].id);assert.equal(h.state.selection.$from.parentOffset,0);assert.deepEqual(h.document,original);assert.equal(h.run(manualCommands.undo),false);
});
test('explicit body focus creates one paragraph only for body[] and has exact one undo/redo',()=>{
 const block=callout({blocks:[]}),h=harness([block]),before=h.state,original=h.document;
 assert.equal(focusManualCalloutBody(block.id)(h.state),true);assert.equal(h.state,before);assert.equal(h.run(focusManualCalloutBody(block.id)),true);const after=h.state,result=h.document;
 assert.equal(result.pages[0].blocks[0].blocks.length,1);assert.equal(result.pages[0].blocks[0].blocks[0].type,'paragraph');assert.equal(after.selection.$from.parent.attrs.id,result.pages[0].blocks[0].blocks[0].id);assert.deepEqual(result.pages[1],original.pages[1]);assert.deepEqual(result.pages[0].blocks[0].extensions,block.extensions);exactUndo(h,before,after);
});
test('implicit bodyless title focus inserts one body paragraph with one undo restoring original document',()=>{
 const block=callout({blocks:[]}),h=harness([block]),before=h.state;
 assert.equal(h.run(selectManualObject(block.id)),true);assert.equal(h.document.pages[0].blocks[0].blocks.length,1);const after=h.state;
 assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.ok(h.state.selection instanceof NodeSelection);assert.equal(h.state.selection.node.attrs.id,block.id);
 assert.equal(h.run(manualCommands.redo),true);assert.ok(h.state.doc.eq(after.doc));assert.ok(h.state.selection.eq(after.selection));
});
test('public insertion appends redirect to the original insertion history, keeping required title slot empty',()=>{
 const h=harness([paragraph('Before')]),before=h.state;assert.equal(h.run(insertManualBlock('callout')),true);const after=h.state,block=h.document.pages[0].blocks.find(b=>b.type==='callout');
 assert.deepEqual(block.title,[]);assert.equal(h.state.selection.$from.parent.attrs.id,block.blocks[0].id);assert.equal(h.state.selection.$from.parent.type.name,'paragraph');assert.equal(h.count,1);exactUndo(h,before,after);
});
test('slash/block command callout conversion focuses body with one undo and preserves original source metadata',()=>{
 const empty=paragraph(),h=harness([empty]);h.run(selectManualObject(empty.id));const before=h.state;
 assert.equal(h.run(executeManualBlockCommand('callout')),true);const after=h.state,block=h.document.pages[0].blocks[0];assert.equal(block.type,'callout');assert.equal(block.id,empty.id);assert.deepEqual(block.extensions,empty.extensions);assert.deepEqual(block.title,[]);assert.equal(after.selection.$from.parent.attrs.id,block.blocks[0].id);exactUndo(h,before,after);
});
test('explicit title editing displays the empty slot and moving elsewhere resets the permission',()=>{
 const block=callout(),outside=paragraph('Outside'),h=harness([block,outside]),original=h.document;
 assert.equal(h.run(editManualCalloutTitle(block.id)),true);assert.equal(h.state.selection.$from.parent.type.name,'calloutTitle');assert.equal(manualCalloutFocusKey.getState(h.state).editingId,block.id);
 const decorations=h.plugin.props.decorations(h.state).find();assert.equal(decorations.length,1);assert.equal(decorations[0].type.attrs.class,'manual-callout-title-editing');assert.deepEqual(h.document,original);
 h.run(selectManualObject(outside.id));assert.equal(manualCalloutFocusKey.getState(h.state).editingId,null);assert.equal(h.plugin.props.decorations(h.state),null);
 h.title(block.id);assert.equal(h.state.selection.$from.parent.attrs.id,block.blocks[0].id);
});
test('existing rich title remains directly editable and title/body/meta/IDs stay exact',()=>{
 const block=callout({title:[{type:'text',text:'Real title',marks:[{type:'emphasis'},{type:'underline'}]}],blocks:[paragraph('Body')]}),h=harness([block]),original=h.document;
 h.title(block.id);assert.equal(h.state.selection.$from.parent.type.name,'calloutTitle');assert.deepEqual(h.document,original);assert.equal(h.plugin.props.decorations(h.state),null);
});
test('a title text range is never redirected or deleted',()=>{
 const block=callout({title:[{type:'text',text:'ABC',marks:[{type:'strong'}]}]}),h=harness([block]),found=findManualObject(h.state,block.id),original=h.document;
 h.dispatch(h.state.tr.setSelection(TextSelection.create(h.state.doc,found.pos+2,found.pos+4)));assert.equal(h.state.selection.$from.parent.type.name,'calloutTitle');assert.equal(h.state.selection.empty,false);assert.deepEqual(h.document,original);
});
test('explicit empty title typing becomes visible title and preserves body content and unknown metadata',()=>{
 const block=callout({blocks:[paragraph('Body')]}),h=harness([block]);h.run(editManualCalloutTitle(block.id));const before=h.state;
 h.dispatch(h.state.tr.insertText('Title'));const after=h.state;assert.equal(h.state.selection.$from.parent.type.name,'calloutTitle');assert.deepEqual(h.document.pages[0].blocks[0].title,[{type:'text',text:'Title'}]);assert.deepEqual(h.document.pages[0].blocks[0].blocks,block.blocks);exactUndo(h,before,after);
});
for(const view of [{editable:false},{composing:true}])test(`public callout focus guards ${JSON.stringify(view)}`,()=>{
 const block=callout({blocks:[]}),h=harness([block]),before=h.state;assert.equal(h.run(focusManualCalloutBody(block.id),view),false);assert.equal(h.run(editManualCalloutTitle(block.id),view),false);assert.equal(h.state,before);
});
for(const guard of ['readonly','composition','disabled'])test(`live plugin ${guard} guard leaves empty title/bodyless source unchanged`,()=>{
 const block=callout({blocks:[]}),h=harness([block],{isEnabled:()=>guard!=='disabled'}),view={state:h.state,editable:guard!=='readonly',composing:guard==='composition'};
 const lease=h.plugin.spec.view(view);h.title(block.id);assert.equal(h.state.selection.$from.parent.type.name,'calloutTitle');assert.deepEqual(h.document.pages[0].blocks,[block]);lease.destroy();
});
test('body focus finds nested editable content without changing wrappers or IDs',()=>{
 const nested=callout({blocks:[paragraph('Nested body')]}),block=callout({blocks:[nested]}),h=harness([block]),original=h.document;
 assert.equal(h.run(focusManualCalloutBody(block.id)),true);assert.equal(h.state.selection.$from.parent.attrs.id,nested.blocks[0].id);assert.deepEqual(h.document,original);
});
test('an atom-only body keeps its source and selects the callout instead of inserting another body',()=>{
 const block=callout({blocks:[{type:'divider',id:newManualId(),extensions:{keep:true}}]}),h=harness([block]),original=h.document;
 h.title(block.id);assert.ok(h.state.selection instanceof NodeSelection);assert.equal(h.state.selection.node.attrs.id,block.id);assert.deepEqual(h.document,original);
});
test('missing callout IDs reject focus and title commands without mutation',()=>{
 const h=harness([callout()]),before=h.state;assert.equal(h.run(focusManualCalloutBody('missing')),false);assert.equal(h.run(editManualCalloutTitle('missing')),false);assert.equal(h.state,before);
});
test('implicit body paragraph creation has its own undo without undoing the preceding typing',()=>{
 const outside=paragraph(),block=callout({blocks:[]}),h=harness([outside,block]);h.run(selectManualObject(outside.id));h.dispatch(h.state.tr.insertText('Recent edit'));
 const before=h.state;h.run(selectManualObject(block.id));assert.equal(h.document.pages[0].blocks[1].blocks.length,1);
 assert.equal(h.run(manualCommands.undo),true);assert.ok(h.state.doc.eq(before.doc));assert.deepEqual(h.document.pages[0].blocks[0].content,[{type:'text',text:'Recent edit'}]);
});
function defaultHarness(blocks=[]){
 const document=createEmptyManualDocument();document.pages[0].blocks=blocks;let state=createManualState({document});
 const dispatch=tr=>{state=state.applyTransaction(tr).state;};
 return {dispatch,get state(){return state;},get document(){return documentFromState(state);},get plugin(){return manualCalloutFocusKey.get(state);},run:(command,view)=>command(state,dispatch,view)};
}
test('actual default callout plugin is single and public insertion focuses body with one exact undo',()=>{
 const h=defaultHarness([paragraph('Before')]);assert.equal(h.state.plugins.filter(p=>p.key===manualCalloutFocusKey.key).length,1);
 const custom=manualCalloutFocusPlugin(),injected=createManualState({document:h.document,plugins:[custom]});assert.equal(injected.plugins.filter(p=>p.key===manualCalloutFocusKey.key).length,1);assert.equal(manualCalloutFocusKey.get(injected),custom);
 const before=h.state;assert.equal(h.run(insertManualBlock('callout')),true);const after=h.state,block=h.document.pages[0].blocks.find(b=>b.type==='callout');assert.deepEqual(block.title,[]);assert.equal(after.selection.$from.parent.attrs.id,block.blocks[0].id);exactUndo(h,before,after);
});
test('actual default callout explicit title permission displays the slot then resets and returns body focus',()=>{
 const block=callout(),outside=paragraph('Outside'),h=defaultHarness([block,outside]),original=h.document;
 h.run(editManualCalloutTitle(block.id));assert.equal(h.state.selection.$from.parent.type.name,'calloutTitle');assert.equal(h.plugin.props.decorations(h.state).find()[0].type.attrs.class,'manual-callout-title-editing');
 h.run(selectManualObject(outside.id));assert.equal(manualCalloutFocusKey.getState(h.state).editingId,null);assert.equal(h.plugin.props.decorations(h.state),null);
 h.run(selectManualObject(block.id));assert.equal(h.state.selection.$from.parent.attrs.id,block.blocks[0].id);assert.deepEqual(h.document,original);
});
test('actual default callout live readonly, composition and dynamic host gate prevent bodyless source mutation',()=>{
 for(const guard of ['readonly','composition',false,()=>false]){
  const block=callout({blocks:[]}),h=defaultHarness([block]),original=h.document,view={editable:guard!=='readonly',composing:guard==='composition',props:{manualCalloutFocusEnabled:guard}};
  const lease=h.plugin.spec.view(view);h.run(selectManualObject(block.id));assert.equal(h.state.selection.$from.parent.type.name,'calloutTitle');assert.deepEqual(h.document,original);lease.destroy();
 }
});
