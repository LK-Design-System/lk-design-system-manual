import {readFile,writeFile} from 'node:fs/promises';
import {decodeDocumentFile,encodeDocumentFile} from '../../src/redesign/document-store.mjs';

const source=decodeDocumentFile(await readFile(new URL('./manual-large-document.manual.json',import.meta.url),'utf8'));
const document=structuredClone(source.document);
document.id='qa-connected-workflow-document';
document.title='두 페이지 편집 연결 · 합성 검증';
document.pages=document.pages.slice(0,2);
const inline=text=>[{type:'text',text}],paragraph=(id,text)=>({id,type:'paragraph',content:inline(text)});
document.pages[0].title=inline('블록 작성과 부분 서식');
document.pages[1].title=inline('블록 이동과 문서 보관');
// The figure and body are adjacent so a real two-block range can move together.
const first=document.pages[0],figureAt=first.blocks.findIndex(block=>block.type==='figure');
const [figure]=first.blocks.splice(figureAt,1);
first.blocks.splice(1,0,figure);
first.blocks.push({id:'qa-workflow-quote',type:'quote',blocks:[paragraph('qa-workflow-quote-body','복사와 이동 후에도 인용을 보존합니다.')]});
document.pages[1].blocks.push(
 {id:'qa-workflow-heading3',type:'heading',level:3,content:inline('저장 확인')},
 {id:'qa-workflow-procedure',type:'procedure',start:1,steps:[
  {id:'qa-workflow-step1',title:inline('내용 작성'),blocks:[paragraph('qa-workflow-step1-body','본문을 편집합니다.')]},
  {id:'qa-workflow-step2',title:inline('보관 확인'),blocks:[paragraph('qa-workflow-step2-body','저장한 내용을 다시 엽니다.')]},
 ]},
);
const bytes=encodeDocumentFile({document,assets:source.assets});
await writeFile(new URL('./manual-connected-workflow.manual.json',import.meta.url),bytes);
console.log(JSON.stringify({pages:document.pages.length,topLevelBlocks:document.pages.reduce((sum,page)=>sum+page.blocks.length,0),bytes:Buffer.byteLength(bytes),assets:Object.keys(source.assets).length}));
