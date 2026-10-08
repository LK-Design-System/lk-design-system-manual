import {readFile,writeFile} from 'node:fs/promises';
import {encodeDocumentFile} from '../../src/redesign/document-store.mjs';
let serial=0;const id=()=>`qa-large-${String(++serial).padStart(5,'0')}`,inline=text=>[{type:'text',text}],paragraph=text=>({id:id(),type:'paragraph',content:inline(text)}),cell=text=>({id:id(),content:inline(text)});
const document={schemaVersion:2,id:id(),title:'50쪽 기본 편집 경계 검증 · 합성 자료',pages:[]};
for(let index=1;index<=50;index++){
 const number=String(index).padStart(2,'0');
 document.pages.push({id:id(),title:inline(index===1?'긴 페이지 제목을 문서와 목차에서 확인합니다. '.repeat(4):`대용량 페이지 ${number}`),blocks:[
  {id:id(),type:'heading',level:1+(index-1)%3,content:inline(`제목 ${number}`)},
  paragraph(`페이지 ${number} 본문입니다. 입력과 선택, 저장을 확인합니다.`),
  {id:id(),type:'todo',checked:index%2===0,content:inline(`합성 항목 ${number}`)},
  {id:id(),type:'toggle',open:index%2===1,title:inline(`접을 내용 ${number}`),blocks:[paragraph(`토글 안의 합성 본문 ${number}`)]},
  {id:id(),type:'callout',tone:['signal','positive','cautionary','negative','offline'][(index-1)%5],title:inline(`안내 ${number}`),blocks:[paragraph(`안내 안의 합성 본문 ${number}`)]},
  {id:id(),type:'codeBlock',language:'javascript',text:`const page = ${index};\n  console.log(page);`},
  {id:id(),type:'table',label:`합성 표 ${number}`,headers:[cell('항목'),cell('내용')],rows:[[cell(number),cell('합성 값')]]},
  {id:id(),type:'figure',asset:'assets/qa-large.png',alt:'합성 200px 검증 이미지',caption:inline(`합성 그림 ${number}`),widthPreset:'compact'},
  {id:id(),type:'list',ordered:false,items:[{id:id(),blocks:[paragraph(`목록 첫 항목 ${number}`)]},{id:id(),blocks:[paragraph(`목록 둘째 항목 ${number}`)]}]},
 ]});
}
const png=await readFile(new URL('../../../../tests/fixtures/intrinsic/valid.png',import.meta.url));
const encoded=encodeDocumentFile({document,assets:{'assets/qa-large.png':`data:image/png;base64,${png.toString('base64')}`}});
await writeFile(new URL('./manual-large-document.manual.json',import.meta.url),encoded);
console.log(JSON.stringify({pages:document.pages.length,topLevelBlocks:document.pages.reduce((sum,page)=>sum+page.blocks.length,0),bytes:Buffer.byteLength(encoded),assets:1}));
