import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {decodeDocumentFile,encodeDocumentFile,prepareDocumentRecord,validateAssets,listDocuments} from '../src/redesign/document-store.mjs';
const make=()=>({document:createEmptyManualDocument(),assets:{}});
const revision={revision:'revision-1',savedAt:1};

test('portable v2 draft preserves empty content, IDs, metadata and original image bytes',()=>{
 const source=make();source.document.extensions={example:{unrecognized:'preserve'}};
 source.assets={'assets/example.png':'data:image/png;base64,iVBORw0KGgo='};
 const before=structuredClone(source),encoded=encodeDocumentFile(source);
 assert.deepEqual(decodeDocumentFile(encoded),source);assert.deepEqual(source,before);
 assert.equal(JSON.parse(encoded).format,'lds-manual-document/v2');
});
test('v1 and unknown file versions never silently become editable v2 documents',()=>{
 for(const input of [{schemaVersion:1},{format:'lds-manual-browser/v1'}])assert.throws(()=>decodeDocumentFile(JSON.stringify(input)),{code:'LEGACY_DOCUMENT'});
 for(const input of [{format:'future'}, {format:'lds-manual-document/v2',...make(),future:{keep:true}}])assert.throws(()=>decodeDocumentFile(JSON.stringify(input)),{code:'UNSUPPORTED_FORMAT'});
 assert.throws(()=>decodeDocumentFile('{'),{code:'INVALID_DOCUMENT'});
});
test('portable assets reject executable data, external sources, malformed base64 and traversal',()=>{
 for(const data of ['javascript:alert(1)','https://example.invalid/a.png','data:image/svg+xml;base64,AAAA','data:image/png;base64,A','data:image/png;base64,!!!!'])assert.throws(()=>validateAssets({'assets/a.png':data}),{code:'INVALID_ASSETS'});
 for(const name of ['../a.png','/a.png','a\\b.png','a//b.png','a/../b.png','constructor','C:a.png'])assert.throws(()=>validateAssets({[name]:'data:image/png;base64,AAAA'}),{code:'INVALID_ASSETS'});
 assert.throws(()=>validateAssets([]),{code:'INVALID_ASSETS'});
});
test('first save requires explicit null base and returns a detached snapshot',()=>{
 const value={...make(),expectedRevision:null},before=structuredClone(value);
 const saved=prepareDocumentRecord(value,undefined,revision);
 assert.equal(saved.id,value.document.id);assert.equal(saved.revision,'revision-1');assert.equal(saved.savedAt,1);
 value.document.title='later editing';assert.notEqual(saved.document.title,value.document.title);
 assert.deepEqual(saved.document,before.document);
 assert.throws(()=>prepareDocumentRecord(make(),undefined,revision),{code:'REVISION_REQUIRED'});
});
test('compare-and-swap rejects stale tabs and imported identity collisions without mutating the original',()=>{
 const value=make(),current=prepareDocumentRecord({...value,expectedRevision:null},undefined,revision),before=structuredClone(current);
 for(const expectedRevision of [null,'old',''])assert.throws(()=>prepareDocumentRecord({...value,expectedRevision},current,revision),{code:'CONFLICT'});
 const saved=prepareDocumentRecord({...value,expectedRevision:current.revision},current,{revision:'revision-2',savedAt:2});
 assert.equal(saved.revision,'revision-2');assert.deepEqual(current,before);
});
test('save validation prevents malformed document replacing a valid saved record',()=>{
 const value=make(),current=prepareDocumentRecord({...value,expectedRevision:null},undefined,revision),before=structuredClone(current);
 value.document.schemaVersion=999;
 assert.throws(()=>prepareDocumentRecord({...value,expectedRevision:current.revision},current,revision));
 assert.deepEqual(current,before);
});

test('portable import rejects duplicate IDs and unsafe links without accepting a partial document',()=>{
 const duplicate=make();duplicate.document.pages[0].id=duplicate.document.id;
 assert.throws(()=>decodeDocumentFile(JSON.stringify({format:'lds-manual-document/v2',...duplicate})));
 const unsafe=make();unsafe.document.pages[0].blocks[0].content=[{type:'text',text:'link',marks:[{type:'link',href:'javascript:alert(1)'}]}];
 assert.throws(()=>encodeDocumentFile(unsafe));
});
test('a document can retain an incomplete image slot as a draft without inventing image bytes',()=>{
 const value=make();value.document.pages[0].blocks.push({type:'figure',id:crypto.randomUUID(),asset:'',alt:'',caption:[],widthPreset:'full'});
 assert.deepEqual(decodeDocumentFile(encodeDocumentFile(value)),value);
});


test('explicit null assets are rejected rather than silently replaced with an empty collection',()=>{
 assert.throws(()=>encodeDocumentFile({...make(),assets:null}),{code:'INVALID_ASSETS'});
});
test('a database connection arriving after blocked rejection is closed',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');
 const request={};let closed=0;
 Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:{open:()=>request}});
 try{
  const pending=listDocuments();request.onblocked();
  await assert.rejects(pending,{code:'STORAGE_BLOCKED'});
  request.result={close:()=>closed++};request.onsuccess();
  assert.equal(closed,1);
 }finally{if(descriptor)Object.defineProperty(globalThis,'indexedDB',descriptor);else delete globalThis.indexedDB;}
});
test('portable draft preserves every new basic block and its marks, checked state, folded children and code whitespace',()=>{
 const value=make(),id=()=>crypto.randomUUID(),text=content=>[{type:'text',text:content}];
 value.document.pages[0].blocks=[
  ...[1,2,3].map(level=>({id:id(),type:'heading',level,content:text('제목 '+level)})),
  {id:id(),type:'todo',checked:true,content:[{type:'text',text:'완료',marks:[{type:'underline'},{type:'strike'}]}]},
  {id:id(),type:'toggle',open:false,title:text('접힌 내용'),blocks:[{id:id(),type:'paragraph',content:text('내부 내용 보존')}]},
  {id:id(),type:'divider'},
  {id:id(),type:'codeBlock',language:'js',text:'const a = 1;\n  a++;\n',extensions:{example:{preserve:true}}},
 ];
 const before=structuredClone(value),encoded=encodeDocumentFile(value);
 assert.deepEqual(decodeDocumentFile(encoded),before);assert.deepEqual(value,before);
 const saved=prepareDocumentRecord({...value,expectedRevision:null},undefined,revision);assert.deepEqual(saved.document,before.document);
});
