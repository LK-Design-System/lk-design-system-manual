import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {encodeDocumentFile,decodeDocumentFile} from '../../src/redesign/document-store.mjs';

const text=value=>[{type:'text',text:value}];
const paragraph=(id,value)=>({id,type:'paragraph',content:text(value)});
const document={schemaVersion:2,id:'qa-range-flow-document',title:'범위 이동과 A4 흐름 · 합성 검증',pages:[
 {id:'qa-range-flow-source',title:text('함께 옮길 내용'),blocks:[
  {id:'qa-range-flow-callout',type:'callout',tone:'signal',title:text('함께 옮길 안내'),blocks:[
   paragraph('qa-range-flow-inner-first','안내의 첫 본문을 보존합니다.'),
   {id:'qa-range-flow-inner-marked',type:'paragraph',content:[{type:'text',text:'서식과 링크 보존',marks:[{type:'strong'},{type:'underline'},{type:'link',href:'https://example.invalid/manual'}]}],extensions:{fixture:{keep:'inner-marked'}}},
   paragraph('qa-range-flow-inner-last','안내의 마지막 본문을 보존합니다.'),
  ],extensions:{fixture:{keep:'callout'}}},
  {id:'qa-range-flow-paragraph',type:'paragraph',content:[{type:'text',text:'함께 옮길 본문',marks:[{type:'emphasis'}]},{type:'hardBreak'},{type:'text',text:'같은 문단의 다음 줄'}],extensions:{fixture:{keep:'paragraph'}}},
  {id:'qa-range-flow-todo',type:'todo',checked:true,content:text('함께 옮길 체크 항목'),extensions:{fixture:{keep:'todo'}}},
 ],extensions:{fixture:{keep:'source-page'}}},
 {id:'qa-range-flow-target',title:text('내용을 받을 페이지'),blocks:Array.from({length:24},(_,i)=>
  paragraph(`qa-range-flow-filler-${String(i+1).padStart(2,'0')}`,`받는 쪽의 기존 본문 ${String(i+1).padStart(2,'0')}`)
 ),extensions:{fixture:{keep:'target-page'}}},
 {id:'qa-range-flow-sentinel',title:text('뒤의 독립 페이지'),blocks:[
  paragraph('qa-range-flow-sentinel-body','뒤의 독립 페이지와 원래 본문을 보존합니다.'),
 ],extensions:{fixture:{keep:'sentinel-page'}}},
]};
const value={document,assets:{}},bytes=encodeDocumentFile(value);
assert.deepEqual(decodeDocumentFile(bytes),value);
await writeFile(new URL('./manual-range-flow.manual.json',import.meta.url),bytes);
console.log(JSON.stringify({pages:3,sourceBlocks:3,targetParagraphs:24,assets:0,bytes:Buffer.byteLength(bytes)}));
