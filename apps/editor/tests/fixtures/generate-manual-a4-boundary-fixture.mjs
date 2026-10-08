import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {encodeDocumentFile,decodeDocumentFile} from '../../src/redesign/document-store.mjs';
import {createManualState,documentFromState} from '../../src/redesign/manual-kernel.mjs';

const text=(value,marks)=>({type:'text',text:value,...(marks?{marks}:{})});
const title=value=>[text(value)];
const paragraph=(id,content)=>({id,type:'paragraph',content,extensions:{fixture:{keep:id},manualPagination:{opaque:'preserve'}}});
const longBody=prefix=>Array.from({length:80},(_,index)=>[
 text(`${prefix} ${String(index+1).padStart(3,'0')} · 자동 페이지는 편집 경계가 아닙니다. `,[{type:'strong'}]),
 text('한글 다, é, 👨‍👩‍👧‍👦와 🇰🇷를 한 글자씩 편집합니다. ',[{type:'link',href:'https://example.invalid/a4-boundary'},{type:'underline'}]),
 ...(index%8===7?[{type:'hardBreak'}]:[]),
]).flat();
const document={schemaVersion:2,id:'qa-a4-boundary-document',title:'자동 A4 경계 편집 · 합성 검증',pages:[
 {id:'qa-a4-boundary-text-page',title:title('문단 자동 분할'),blocks:[
  paragraph('qa-a4-boundary-long-text',longBody('문단')),
  paragraph('qa-a4-boundary-text-sentinel',[text('문단 다음 본문 · 보존')]),
 ],extensions:{fixture:{keep:'paragraph-page'}}},
 {id:'qa-a4-boundary-callout-page',title:title('안내 자동 분할'),blocks:[
  {id:'qa-a4-boundary-callout',type:'callout',tone:'signal',title:title('반복 안내 제목 · 보존'),blocks:[paragraph('qa-a4-boundary-callout-body',longBody('안내'))],extensions:{fixture:{keep:'callout'}}},
 ]},
 {id:'qa-a4-boundary-toggle-page',title:title('접기 자동 분할'),blocks:[
  {id:'qa-a4-boundary-toggle',type:'toggle',open:true,title:title('반복 접기 제목 · 보존'),blocks:[paragraph('qa-a4-boundary-toggle-body',longBody('접기'))],extensions:{fixture:{keep:'toggle'}}},
 ]},
 {id:'qa-a4-boundary-independent-page',title:title('독립 페이지 제목 · 보존'),blocks:[
  paragraph('qa-a4-boundary-independent-body',[text('독립 페이지 첫 본문은 제목에 합쳐지지 않습니다.',[{type:'emphasis'}])]),
  {id:'qa-a4-boundary-table',type:'table',label:'표 구조 보호',headers:[{id:'qa-a4-boundary-header',content:title('열 제목 · 보존')}],rows:[[{id:'qa-a4-boundary-cell',content:title('셀 본문 · 보존'),extensions:{fixture:{keep:'cell'}}}]]},
 ]},
]};
const value={document,assets:{}},bytes=encodeDocumentFile(value);
assert.deepEqual(decodeDocumentFile(bytes),value);
assert.deepEqual(documentFromState(createManualState({document})),document);
await writeFile(new URL('./manual-a4-boundary.manual.json',import.meta.url),bytes);
console.log(JSON.stringify({authoredPages:document.pages.length,automaticMarkers:0,assets:0,bytes:Buffer.byteLength(bytes),bodyTextUnits:longBody('문단').reduce((sum,run)=>sum+(run.text?.length??1),0)}));
