import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,findManualCoverRole,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {insertManualPageTemplate} from '../src/redesign/manual-page-templates.mjs';

test('adding the projected LDS cover focuses its title rather than the invisible logo caption with one Undo/Redo',()=>{
 const source=createEmptyManualDocument({title:'User cover title'}),snapshot=structuredClone(source);let state=createManualState({document:source});const before=state,dispatch=tr=>{state=state.applyTransaction(tr).state;};
 assert.equal(insertManualPageTemplate('cover',{beforeFirstPage:true,revision:before.doc})(state,dispatch),true);
 const cover=documentFromState(state).cover,role=findManualCoverRole(state,cover.id,'title'),after=state;
 assert.ok(role);assert.ok(state.selection instanceof TextSelection);assert.equal(state.selection.from,role.pos+1);assert.equal(state.selection.$from.parent.attrs.id,role.node.attrs.id);assert.equal(state.selection.$from.parentOffset,0);assert.notEqual(state.selection.$from.parent.type.name,'figureCaption');assert.equal(role.node.textContent,source.title);
 assert.deepEqual(documentFromState(state).pages,source.pages);assert.deepEqual(source,snapshot);
 assert.equal(manualCommands.undo(state,dispatch),true);assert.ok(state.doc.eq(before.doc));assert.ok(state.selection.eq(before.selection));assert.equal(manualCommands.redo(state,dispatch),true);assert.ok(state.doc.eq(after.doc));assert.ok(state.selection.eq(after.selection));
});
