import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {encodeDocumentFile,decodeDocumentFile} from '../../src/redesign/document-store.mjs';

const text=value=>[{type:'text',text:value}];
const paragraph=(id,value)=>({id,type:'paragraph',content:text(value)});
const document={schemaVersion:2,id:'qa-page-controls-document',title:'페이지와 본문 조작 · 합성 검증',cover:{
 id:'qa-page-controls-cover',title:text('표지 조작 확인'),
 logo:{src:'@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg',alt:'LK 로고'},
 metadata:[{id:'qa-page-controls-cover-meta',label:text('문서 종류'),value:text('합성 검증 문서')}],
 sectionTitle:text('페이지 관리'),blocks:[paragraph('qa-page-controls-cover-body','표지와 페이지의 조작을 구분합니다.')],
},pages:[
 {id:'qa-page-controls-first-page',title:text('첫 페이지'),blocks:[
  paragraph('qa-page-controls-first-body','글자를 선택하면 부분 서식을 사용할 수 있습니다.'),
  {id:'qa-page-controls-todo',type:'todo',checked:false,content:text('본문 손잡이와 추가 버튼 확인')},
  {id:'qa-page-controls-callout',type:'callout',tone:'signal',title:text('안내'),blocks:[paragraph('qa-page-controls-inner-body','안내 안에서도 본문을 추가합니다.')]},
 ],extensions:{fixture:{keep:'first-page'}}},
 {id:'qa-page-controls-second-page',title:text('둘째 페이지'),blocks:[
  {id:'qa-page-controls-heading',type:'heading',level:2,content:text('독립 페이지 추가')},
  paragraph('qa-page-controls-second-body','선택한 쪽 뒤에 새 페이지를 추가합니다.'),
 ]},
 {id:'qa-page-controls-third-page',title:text('셋째 페이지'),blocks:[
  paragraph('qa-page-controls-third-body','기존 페이지와 본문은 그대로 유지합니다.'),
  {id:'qa-page-controls-code',type:'codeBlock',language:'text',text:'synthetic page controls\n  keep whitespace'},
 ]},
]};
const value={document,assets:{}},bytes=encodeDocumentFile(value);
assert.deepEqual(decodeDocumentFile(bytes),value);
await writeFile(new URL('./manual-page-controls.manual.json',import.meta.url),bytes);
console.log(JSON.stringify({pages:document.pages.length,cover:true,papers:4,assets:0,bytes:Buffer.byteLength(bytes)}));
