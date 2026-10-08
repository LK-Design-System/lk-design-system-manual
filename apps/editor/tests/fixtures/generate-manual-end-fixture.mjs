import {readFile,writeFile} from 'node:fs/promises';
import {decodeDocumentFile,encodeDocumentFile} from '../../src/redesign/document-store.mjs';

// Each page ends in one compound block, with no following paragraph to reuse.
const large=decodeDocumentFile(await readFile(new URL('./manual-large-document.manual.json',import.meta.url),'utf8'));
const labels={callout:'안내',table:'표',figure:'그림',toggle:'토글',codeBlock:'코드'};
const inline=text=>[{type:'text',text}];
const document={schemaVersion:2,id:'qa-end-boundaries-document',title:'복합 블록 끝 이어 쓰기 · 합성 검증',pages:Object.entries(labels).map(([type,label])=>({
 id:`qa-end-page-${type}`,title:inline(`${label} 아래 이어 쓰기`),blocks:[
  {id:`qa-end-before-${type}`,type:'paragraph',content:inline(`${label} 내부 내용과 바깥 본문의 구분을 확인합니다.`)},
  structuredClone(large.document.pages[0].blocks.find(block=>block.type===type)),
 ],
}))};
const bytes=encodeDocumentFile({document,assets:large.assets});
await writeFile(new URL('./manual-end-boundaries.manual.json',import.meta.url),bytes);
console.log(JSON.stringify({pages:document.pages.length,endKinds:document.pages.map(page=>page.blocks.at(-1).type),bytes:Buffer.byteLength(bytes),assets:Object.keys(large.assets).length}));
