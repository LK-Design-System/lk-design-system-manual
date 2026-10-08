import test from 'node:test';
import assert from 'node:assert/strict';
import {captureManualImageRequest,isManualImageRequestCurrent} from '../src/redesign/manual-image-request.mjs';

test('an open chooser cannot insert into a different document or a reloaded copy of its original document',()=>{
 const request=captureManualImageRequest({generation:3,documentId:'first',insertionAnchor:'first-paragraph'});
 assert.equal(isManualImageRequestCurrent(request,{generation:3,documentId:'first'}),true);
 assert.equal(isManualImageRequestCurrent(request,{generation:4,documentId:'second'}),false);
 assert.equal(isManualImageRequestCurrent(request,{generation:5,documentId:'first'}),false);
});
test('file completion retains the requested target and caret even if the current selection changes',()=>{
 const selection={generation:3,documentId:'first',targetId:'figure',insertionAnchor:'paragraph'};
 const request=captureManualImageRequest(selection);
 selection.targetId='other-figure';selection.insertionAnchor='other-paragraph';
 assert.equal(request.targetId,'figure');assert.equal(request.insertionAnchor,'paragraph');
 assert.equal(isManualImageRequestCurrent(null,selection),false);
});
