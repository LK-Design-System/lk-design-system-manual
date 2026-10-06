import test from 'node:test';
import assert from 'node:assert/strict';
import {stepBlockIndexes,normalizeStepTarget,canSplitStepsAt} from '../src/ui/step-controls.mjs';
import {applyOperation} from '../src/manual-adapter/operations.mjs';

const steps = title => ({type:'steps',items:[{title}],opaque:{retained:true}});
const destination = {title:'대상',blocks:[
  {type:'paragraph',text:'준비사항'}, {type:'list',items:['조건']}, steps('첫 절차'),
  {type:'paragraph',text:'보충'}, steps('두 번째 절차')
]};
function moveToTarget(preferred) {
  const document={schemaVersion:1,title:'합성 이동 검사',pages:[
    {title:'원본',blocks:[{type:'steps',items:[{title:'옮길 단계',unknown:'keep'},{title:'남을 단계'}]}]},
    structuredClone(destination)
  ]};
  return applyOperation({document,sidecars:{}},{
    type:'move',fromPath:['pages',0,'blocks',0,'items'],fromIndex:0,
    toPath:['pages',1,'blocks',normalizeStepTarget(document.pages[1],preferred),'items'],toIndex:1
  },{validate:true}).document;
}

test('nonzero first steps is both the visible default and the actual move destination',()=>{
  assert.deepEqual(stepBlockIndexes(destination),[2,4]);
  assert.equal(normalizeStepTarget(destination,0),2);
  const moved=moveToTarget(null);
  assert.equal(moved.pages[1].blocks[2].items[1].title,'옮길 단계');
  assert.equal(moved.pages[1].blocks[2].items[1].unknown,'keep');
  assert.equal(moved.pages[1].blocks[4].items.length,1);
});

test('an explicit second steps choice survives normalization and receives the move',()=>{
  assert.equal(normalizeStepTarget(destination,4),4);
  const moved=moveToTarget(4);
  assert.equal(moved.pages[1].blocks[4].items[1].title,'옮길 단계');
  assert.equal(moved.pages[1].blocks[2].items.length,1);
});

test('page and structure changes normalize to available choices; empty target has no command destination',()=>{
  assert.equal(normalizeStepTarget({blocks:destination.blocks.slice(0,4)},4),2);
  assert.equal(normalizeStepTarget({blocks:[{type:'paragraph'},{type:'list'},{type:'paragraph'},steps('別 과업')]},null),3);
  assert.equal(normalizeStepTarget({blocks:[{type:'paragraph'},{type:'list'}]},2),null);
  assert.equal(normalizeStepTarget(undefined,4),null);
});

test('manual page splitting is restricted to top-level body blocks',()=>{
  assert.equal(canSplitStepsAt(['pages',3,'blocks',2]),true);
  assert.equal(canSplitStepsAt(['cover','blocks',0]),false);
  assert.equal(canSplitStepsAt(['pages',3,'blocks',2,'blocks',0]),false);
  assert.equal(canSplitStepsAt(['pages',3,'blocks',2,'items',0]),false);
});
