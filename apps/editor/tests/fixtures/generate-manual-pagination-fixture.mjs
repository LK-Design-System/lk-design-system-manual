import {readFile,writeFile} from 'node:fs/promises';
import {decodeDocumentFile,encodeDocumentFile} from '../../src/redesign/document-store.mjs';

// Synthetic, reproducible overflow cases; no product content or browser storage.
const source=decodeDocumentFile(await readFile(new URL('./manual-layout.manual.json',import.meta.url),'utf8'));
const text=value=>[{type:'text',text:value}];
const paragraph=(id,value)=>({id,type:'paragraph',content:text(value),extensions:{qa:{originalId:id}}});
const longContent=prefix=>Array.from({length:62},(_,index)=>[
 {type:'text',text:`${prefix} ${String(index+1).padStart(2,'0')} · 경계에서도 내용과 순서를 보존합니다. 😀 가́`,marks:index%3===0?[{type:'strong'},{type:'underline'}]:[]},
 ...(index<61?[{type:'hardBreak'}]:[]),
]).flat();
const longBody=prefix=>({id:`${prefix}-long-body`,type:'paragraph',content:longContent(prefix),extensions:{qa:{originalId:`${prefix}-long-body`},opaque:{keep:true}}});
const page=(prefix,title,blocks)=>({id:`${prefix}-page`,title:text(title),blocks,extensions:{qa:{explicitPage:true}}});
const containers=['callout','quote','toggle'].map(type=>page(`qa-flow-${type}`,`${type} 내부 본문 경계`,[
 {id:`qa-flow-${type}`,type,blocks:[paragraph(`qa-flow-${type}-before`,'앞 문단'),longBody(`qa-flow-${type}`),paragraph(`qa-flow-${type}-after`,'뒤 문단')],extensions:{qa:{container:type}},...(type==='quote'?{}:{title:text('분할된 뒤에도 이어지는 제목')}),...(type==='callout'?{tone:'signal'}:type==='toggle'?{open:true}:{})},
]));
const figure=structuredClone(source.document.pages.flatMap(item=>item.blocks).find(item=>item.type==='figure'));
if(!figure)throw new Error('Missing synthetic figure');
figure.id='qa-flow-figure';
const document={schemaVersion:2,id:'qa-pagination-document',title:'A4 자동 넘김 · 합성 검증',pages:[
 page('qa-flow-text','긴 문단과 입력 경계',[longBody('qa-flow-text'),paragraph('qa-flow-text-after','원래 끝 문단'),{id:'qa-flow-todo',type:'todo',checked:false,content:text('체크리스트의 내용과 상태 보존')}]),
 ...containers,
 page('qa-flow-list','목록 항목 경계',[{id:'qa-flow-list',type:'list',ordered:true,start:7,items:Array.from({length:32},(_,index)=>({id:`qa-flow-item-${index+1}`,blocks:[paragraph(`qa-flow-item-body-${index+1}`,`목록 항목 ${index+1} · 시작 번호 7에서 이어집니다.`)],extensions:{qa:{item:index+1}}}))}]),
 page('qa-flow-procedure','절차 단계 경계',[{id:'qa-flow-procedure',type:'procedure',start:4,steps:Array.from({length:16},(_,index)=>({id:`qa-flow-step-${index+1}`,title:text(`단계 ${index+1}`),blocks:[paragraph(`qa-flow-step-body-${index+1}`,'제목과 설명은 같은 단계에 둡니다.')],extensions:{qa:{step:index+1}}}))}]),
 page('qa-flow-table','표 행과 반복 머리글',[{id:'qa-flow-table',type:'table',label:'경계 표',headers:['번호','내용'].map((value,index)=>({id:`qa-flow-header-${index}`,content:text(value),extensions:{qa:{header:index}}})),rows:Array.from({length:45},(_,row)=>[String(row+1),`행 ${row+1} · 셀 내용 보존`].map((value,column)=>({id:`qa-flow-cell-${row+1}-${column}`,content:text(value),extensions:{qa:{row:row+1,column}}})))}]),
 page('qa-flow-assets','별도 명시 페이지와 그림',[paragraph('qa-flow-assets-body','이 명시 페이지와 그림 자산은 앞 페이지의 넘김으로 없어지지 않습니다.'),figure]),
]};
const bytes=encodeDocumentFile({document,assets:source.assets});
await writeFile(new URL('./manual-pagination.manual.json',import.meta.url),bytes);
console.log(JSON.stringify({pages:document.pages.length,blocks:document.pages.reduce((sum,item)=>sum+item.blocks.length,0),bytes:Buffer.byteLength(bytes),assets:Object.keys(source.assets).length}));
