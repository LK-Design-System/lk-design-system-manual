import test from 'node:test';
import assert from 'node:assert/strict';
import {copySets,hash,checkCopyReview} from '../src/copy-review.mjs';
const doc={title:'예제',pages:[{title:'파일 첨부하기',blocks:[{type:'paragraph',text:'파일을 첨부합니다.'}]}]};
const record=()=>({schemaVersion:1,contract:'lds-manual-copy-review/v1',reviewKind:'contextual-agent-review',reviewer:'reviewer',reviewedAt:'2026-09-28',ruleset:'test',audience:'사용자',documentHash:hash(doc),sets:copySets(doc).map(s=>({...s,sourceItems:s.items,sourceHash:hash(s.items),task:'첨부',contextReason:'파일을 선택하는 과업',decisions:s.items.map(i=>({...i,verdict:'KEEP',reason:'대상과 행동 명시'}))}))});
test('accepts complete current review',()=>assert.deepEqual(checkCopyReview(doc,record()),[]));
test('rejects stale text',()=>{const d=structuredClone(doc);d.pages[0].blocks[0].text='변경';assert.ok(checkCopyReview(d,record()).length);});
test('rejects omissions and blocked decisions',()=>{const r=record();r.sets[1].decisions.pop();assert.ok(checkCopyReview(doc,r).length);const b=record();b.sets[0].decisions[0].verdict='BLOCKED';assert.ok(checkCopyReview(doc,b).length);});
test('rejects altered source snapshot',()=>{const r=record();r.sets[0].sourceItems=[{key:'x',text:'changed'}];assert.ok(checkCopyReview(doc,r).length);});
