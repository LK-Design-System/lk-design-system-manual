import {readFile,writeFile} from 'node:fs/promises';
import {decodeDocumentFile,encodeDocumentFile} from '../../src/redesign/document-store.mjs';

const source=decodeDocumentFile(await readFile(new URL('./manual-large-document.manual.json',import.meta.url),'utf8'));
const inline=text=>text?[{type:'text',text}]:[];
const paragraph=(id,text='')=>({id,type:'paragraph',content:inline(text)});
const step=(id,title,blocks)=>({id,title:inline(title),blocks});
const figure=structuredClone(source.document.pages[0].blocks.find(block=>block.type==='figure'));
figure.id='qa-outdent-figure';
const document={schemaVersion:2,id:'qa-procedure-outdent-document',title:'절차 단계 내어쓰기 · 합성 검증',pages:[
 {id:'qa-outdent-empty-page',title:inline('빈 세 번째 단계'),blocks:[
  {id:'qa-outdent-empty-procedure',type:'procedure',start:1,steps:[
   step('qa-outdent-step1','첫 단계',[paragraph('qa-outdent-description1','첫 설명을 유지합니다.')]),
   step('qa-outdent-step2','둘째 단계',[paragraph('qa-outdent-description2','둘째 설명을 유지합니다.')]),
   step('qa-outdent-step3','',[paragraph('qa-outdent-description3')]),
  ]},
  {id:'qa-outdent-after-callout',type:'callout',tone:'signal',title:inline('다음 안내'),blocks:[paragraph('qa-outdent-after-body','내어쓰기 뒤에도 안내를 유지합니다.')]},
 ]},
 {id:'qa-outdent-middle-page',title:inline('내용이 있는 중간 단계'),blocks:[
  {id:'qa-outdent-middle-procedure',type:'procedure',start:4,extensions:{fixture:'procedure metadata'},steps:[
   step('qa-outdent-middle-before','앞 단계',[paragraph('qa-outdent-before-body','앞 단계입니다.')]),
   {...step('qa-outdent-middle-target','확인 단계',[paragraph('qa-outdent-middle-body','제목과 설명을 본문으로 꺼냅니다.'),figure]),extensions:{fixture:'step metadata'}},
   step('qa-outdent-middle-after','뒤 단계',[paragraph('qa-outdent-next-body','뒤 단계입니다.')]),
  ]},
 ]},
]};
const bytes=encodeDocumentFile({document,assets:source.assets});
await writeFile(new URL('./manual-procedure-outdent.manual.json',import.meta.url),bytes);
console.log(JSON.stringify({pages:document.pages.length,bytes:Buffer.byteLength(bytes),assets:Object.keys(source.assets).length}));
