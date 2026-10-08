import {readFile,writeFile} from 'node:fs/promises';
import {decodeDocumentFile,encodeDocumentFile} from '../../src/redesign/document-store.mjs';

const source=decodeDocumentFile(await readFile(new URL('./manual-large-document.manual.json',import.meta.url),'utf8'));
const candidates=source.document.pages.flatMap(page=>page.blocks);
const inline=text=>[{type:'text',text}];
const paragraph=(id,text)=>({id,type:'paragraph',content:text?inline(text):[]});
const sample=(type,prefix)=>{
 const value=structuredClone(candidates.find(block=>block.type===type));
 if(!value)throw new Error(`Missing synthetic block: ${type}`);
 const visit=node=>{if(!node||typeof node!=='object')return;if(node.id)node.id=`${prefix}-${node.id}`;for(const [key,child]of Object.entries(node))if(key!=='extensions'&&child&&typeof child==='object')Array.isArray(child)?child.forEach(visit):visit(child);};
 visit(value);return value;
};
const document={schemaVersion:2,id:'qa-layout-document',title:'작성 화면 간격 · 합성 검증',pages:[
 {id:'qa-layout-todo-page',title:inline('체크리스트와 손잡이'),blocks:[
  {id:'qa-layout-first-todo',type:'todo',checked:false,content:inline('첫 체크리스트 항목')},
  paragraph('qa-layout-break-body','같은 문단의 다음 줄입니다.'),sample('list','qa-layout-list'),
  {id:'qa-layout-divider',type:'divider'},paragraph('qa-layout-empty',''),
  sample('callout','qa-layout-nested'),paragraph('qa-layout-outside','안내 밖에서도 본문을 이어 씁니다.'),
 ]},
 {id:'qa-layout-paragraph-page',title:inline('본문과 다른 요소'),blocks:[
  paragraph('qa-layout-first-body','본문에서 이미지와 표, 코드까지 순서대로 확인합니다.'),
  sample('figure','qa-layout-image'),sample('table','qa-layout-table'),sample('toggle','qa-layout-toggle'),
  sample('codeBlock','qa-layout-code'),
  {id:'qa-layout-procedure',type:'procedure',start:1,steps:[1,2].map(number=>({id:`qa-layout-step${number}`,title:inline(`단계 ${number}`),blocks:[paragraph(`qa-layout-step${number}-body`,'단계 설명의 간격을 확인합니다.')]}))},
 ]},
 {id:'qa-layout-callout-page',title:inline('첫 안내와 제목 간격'),blocks:[
  sample('callout','qa-layout-first-callout'),
  ...[1,2,3].map(level=>({id:`qa-layout-heading${level}`,type:'heading',level,content:inline(`제목 ${level}`)})),
  paragraph('qa-layout-last-body','제목 아래 본문과 페이지 끝 여유를 확인합니다.'),
 ]},
]};
const bytes=encodeDocumentFile({document,assets:source.assets});
await writeFile(new URL('./manual-layout.manual.json',import.meta.url),bytes);
console.log(JSON.stringify({pages:document.pages.length,blocks:document.pages.reduce((total,page)=>total+page.blocks.length,0),bytes:Buffer.byteLength(bytes),assets:Object.keys(source.assets).length}));
