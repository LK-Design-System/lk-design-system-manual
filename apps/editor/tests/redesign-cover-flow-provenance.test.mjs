import test from 'node:test';
import assert from 'node:assert/strict';
import {MANUAL_COVER_FLOW_PROVENANCE_OWNER,withManualCoverFlowProvenance,readManualCoverFlowProvenance,remapManualCoverFlowProvenanceMeta} from '../src/redesign/manual-cover-flow-provenance.mjs';

const clone=value=>structuredClone(value);
const owner=MANUAL_COVER_FLOW_PROVENANCE_OWNER;
const packet=(records=[])=>({owner,version:1,kind:'provenance',coverId:'synthetic-cover',records});
const snapshot=(overrides={})=>({
 id:'synthetic-tail',type:'page',reason:'automatic-tail-removed',
 attrs:{id:'synthetic-tail',meta:{extensions:{vendor:{id:'opaque-history',future:[null,true,{keep:'value'}]}}}},
 content:[{type:'heading',attrs:{id:'synthetic-header',level:2,meta:{extensions:{vendor:{keep:true}}}},content:[{type:'text',text:'합성 제목',marks:[{type:'strong'}]}]}],
 ...overrides,
});

test('owned history clones all synthetic node attrs/content and keeps identities inside extensions',()=>{
 const meta={id:'synthetic-cover',vendor:{id:'opaque-cover',keep:[]}},records=[snapshot({future:{id:'opaque-record',keep:[false,null]}})];
 const before={meta:clone(meta),records:clone(records)},result=withManualCoverFlowProvenance(meta,{coverId:'synthetic-cover',records});
 const marker=readManualCoverFlowProvenance(result.extensions);
 assert.deepEqual(marker,packet(records));
 assert.deepEqual(Object.keys(result),['id','vendor','extensions']);
 assert.equal(result.id,meta.id);
 assert.deepEqual(result.vendor,meta.vendor);
 assert.equal(Object.hasOwn(result,'records'),false);
 assert.notEqual(result,meta);
 assert.notEqual(marker.records[0].attrs,records[0].attrs);
 assert.notEqual(marker.records[0].content,records[0].content);
 marker.records[0].attrs.meta.extensions.vendor.keep='changed-result-only';
 assert.deepEqual(meta,before.meta);
 assert.deepEqual(records,before.records);
});

test('foreign namespace, future version and same-key collisions remain opaque',()=>{
 const extensions={
  manualCoverFlow:{owner:'foreign',version:1,kind:'provenance',id:'opaque-namespace'},
  manualCoverFlow2:{...packet(),version:2,future:{id:'future-cover'}},
  vendor:{id:'external-id',coverId:'synthetic-cover'},
 };
 const before=clone(extensions),result=withManualCoverFlowProvenance({extensions},{coverId:'synthetic-cover',records:[snapshot()]});
 assert.deepEqual(result.extensions.manualCoverFlow,before.manualCoverFlow);
 assert.deepEqual(result.extensions.manualCoverFlow2,before.manualCoverFlow2);
 assert.deepEqual(result.extensions.vendor,before.vendor);
 assert.deepEqual(result.extensions.manualCoverFlow3,packet([snapshot()]));
 assert.deepEqual(extensions,before);
 assert.equal(readManualCoverFlowProvenance({manualCoverFlow:extensions.manualCoverFlow,manualCoverFlow2:extensions.manualCoverFlow2}),null);
});

test('a recognized marker at an existing custom key is reused without growing namespaces',()=>{
 const meta={extensions:{manualCoverFlow:'opaque-value',customHistory:packet([snapshot()]),vendor:{keep:true}}};
 const result=withManualCoverFlowProvenance(meta,{coverId:'synthetic-cover',records:[snapshot()]});
 assert.deepEqual(result,meta);
 assert.deepEqual(Object.keys(result.extensions),Object.keys(meta.extensions));
 assert.equal(readManualCoverFlowProvenance(result.extensions),result.extensions.customHistory);
});

test('existing future marker fields, unknown record shapes and opaque snapshot fields survive appends',()=>{
 const futureRecord={futureShape:{id:'opaque-future-record',attrs:[1,2,null]},futureVersion:8};
 const original=snapshot({future:{id:'opaque-snapshot',annotations:[null,{keep:true}]}});
 const meta={extensions:{manualCoverFlow:{...packet([futureRecord,original]),future:{coverId:'opaque-cover-id',id:'opaque-packet',keep:true}}}};
 const before=clone(meta),changed=snapshot({reason:'automatic-header-retargeted'});
 const result=withManualCoverFlowProvenance(meta,{coverId:'synthetic-cover',records:[original,changed]});
 const marker=readManualCoverFlowProvenance(result.extensions);
 assert.deepEqual(marker.future,meta.extensions.manualCoverFlow.future);
 assert.deepEqual(marker.records,[futureRecord,original,changed]);
 assert.deepEqual(meta,before);
 assert.deepEqual(withManualCoverFlowProvenance(result,{coverId:'synthetic-cover',records:[original,changed]}),result);
});

test('snapshot deduplication is stable across JSON object key order and repeated additions',()=>{
 const first=snapshot({attrs:{id:'synthetic-tail',meta:{extensions:{vendor:{a:1,b:2}}}}});
 const equivalent=snapshot({attrs:{meta:{extensions:{vendor:{b:2,a:1}}},id:'synthetic-tail'}});
 const result=withManualCoverFlowProvenance({}, {coverId:'synthetic-cover',records:[first,equivalent,first]});
 assert.deepEqual(readManualCoverFlowProvenance(result.extensions).records,[first]);
 assert.deepEqual(withManualCoverFlowProvenance(result,{coverId:'synthetic-cover',records:[equivalent,first]}),result);
});

test('the same historical ID keeps changed attrs, content, reason and type snapshots',()=>{
 const first=snapshot(),records=[first,
  snapshot({attrs:{...first.attrs,revision:2}}),
  snapshot({content:[{type:'text',text:'수정된 합성 제목'}]}),
  snapshot({reason:'automatic-header-retargeted'}),
  snapshot({type:'heading'}),
 ];
 const result=withManualCoverFlowProvenance({}, {coverId:'synthetic-cover',records});
 assert.deepEqual(readManualCoverFlowProvenance(result.extensions).records,records);
 assert.equal(new Set(records.map(value=>value.id)).size,1);
 assert.deepEqual(withManualCoverFlowProvenance(result,{coverId:'synthetic-cover',records}),result);
});

test('absent, null and empty content remain distinct snapshot states',()=>{
 const first=snapshot();delete first.content;
 const records=[first,snapshot({content:null}),snapshot({content:[]})];
 const result=withManualCoverFlowProvenance({}, {coverId:'synthetic-cover',records});
 assert.deepEqual(readManualCoverFlowProvenance(result.extensions).records,records);
 assert.deepEqual(withManualCoverFlowProvenance(result,{coverId:'synthetic-cover',records}),result);
});

test('copy remapping changes only the current owner coverId while historical IDs and opaque data stay exact',()=>{
 const historical=snapshot({attrs:{id:'synthetic-tail',meta:{extensions:{vendor:{coverId:'synthetic-cover',rootPageId:'synthetic-cover',blockId:'synthetic-header'}}}}});
 const meta={id:'already-copied-cover',extensions:{manualCoverFlow:{...packet([historical]),future:{coverId:'synthetic-cover',id:'synthetic-tail'}},vendor:{coverId:'synthetic-cover'}}};
 const before=clone(meta),map=new Map([['synthetic-cover','copied-cover'],['synthetic-tail','copied-tail'],['synthetic-header','copied-header']]);
 const result=remapManualCoverFlowProvenanceMeta(meta,map),marker=readManualCoverFlowProvenance(result.extensions);
 assert.equal(marker.coverId,'copied-cover');
 assert.deepEqual(marker.records,[historical]);
 assert.deepEqual(marker.future,meta.extensions.manualCoverFlow.future);
 assert.deepEqual(result.extensions.vendor,meta.extensions.vendor);
 assert.equal(result.id,'already-copied-cover');
 assert.deepEqual(meta,before);
 assert.deepEqual(remapManualCoverFlowProvenanceMeta(meta,Object.fromEntries(map)),result);
 assert.deepEqual(remapManualCoverFlowProvenanceMeta(meta,new Map([['synthetic-tail','copied-tail']])),meta);
});

test('remapping foreign or future-version packets is a lossless clone',()=>{
 const meta={extensions:{manualCoverFlow:{...packet([snapshot()]),version:2},vendor:{owner:'foreign',coverId:'synthetic-cover'}}};
 const result=remapManualCoverFlowProvenanceMeta(meta,new Map([['synthetic-cover','copied-cover']]));
 assert.deepEqual(result,meta);
 assert.notEqual(result,meta);
 assert.notEqual(result.extensions.manualCoverFlow,meta.extensions.manualCoverFlow);
});

test('explicit empty extensions are recorded and remain stable through append/remap',()=>{
 const meta={extensions:{}},result=withManualCoverFlowProvenance(meta,{coverId:'synthetic-cover',records:[]});
 const marker=readManualCoverFlowProvenance(result.extensions);
 assert.equal(marker.preserveEmptyExtensions,true);
 assert.deepEqual(meta,{extensions:{}});
 assert.deepEqual(withManualCoverFlowProvenance(result,{coverId:'synthetic-cover',records:[]}),result);
 const remapped=remapManualCoverFlowProvenanceMeta(result,{ 'synthetic-cover':'copied-cover' });
 assert.equal(readManualCoverFlowProvenance(remapped.extensions).preserveEmptyExtensions,true);
 assert.equal(readManualCoverFlowProvenance(withManualCoverFlowProvenance({}, {coverId:'synthetic-cover',records:[]}).extensions).preserveEmptyExtensions,undefined);
});

test('marker recognition rejects malformed known fields while preserving unknown packets as collisions',()=>{
 for(const value of [{...packet(),owner:'foreign'},{...packet(),version:2},{...packet(),kind:'future'},{...packet(),coverId:''},{...packet(),records:{}},null]){
  const meta={extensions:{manualCoverFlow:value}};
  assert.equal(readManualCoverFlowProvenance(meta.extensions),null);
  const result=withManualCoverFlowProvenance(meta,{coverId:'synthetic-cover',records:[]});
  assert.deepEqual(result.extensions.manualCoverFlow,value);
  assert.deepEqual(result.extensions.manualCoverFlow2,packet());
 }
 assert.equal(readManualCoverFlowProvenance(undefined),null);
 assert.equal(readManualCoverFlowProvenance([]),null);
});

test('required cover/record fields and non-JSON snapshots fail without mutating inputs',()=>{
 const meta={extensions:{vendor:{keep:true}}},before=clone(meta);
 for(const coverId of [undefined,null,'',1])assert.throws(()=>withManualCoverFlowProvenance(meta,{coverId,records:[]}),TypeError);
 for(const records of [undefined,null,{},'records'])assert.throws(()=>withManualCoverFlowProvenance(meta,{coverId:'synthetic-cover',records}),TypeError);
 for(const value of [null,[],snapshot({id:1}),snapshot({type:null}),snapshot({reason:undefined}),snapshot({attrs:[]}),snapshot({attrs:null}),snapshot({content:undefined}),snapshot({content:NaN}),snapshot({attrs:{bad:()=>true}}),snapshot({content:new Map()})]){
  assert.throws(()=>withManualCoverFlowProvenance(meta,{coverId:'synthetic-cover',records:[value]}),TypeError);
 }
 const cyclic=snapshot();cyclic.attrs.self=cyclic.attrs;
 assert.throws(()=>withManualCoverFlowProvenance(meta,{coverId:'synthetic-cover',records:[cyclic]}),TypeError);
 const sparse=snapshot({content:Array(1)});
 assert.throws(()=>withManualCoverFlowProvenance(meta,{coverId:'synthetic-cover',records:[sparse]}),TypeError);
 assert.deepEqual(meta,before);
 const valid=withManualCoverFlowProvenance(meta,{coverId:'synthetic-cover',records:[]});
 assert.throws(()=>remapManualCoverFlowProvenanceMeta(valid,{'synthetic-cover':''}),TypeError);
});
