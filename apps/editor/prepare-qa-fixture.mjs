import fs from 'node:fs/promises';
import { fixture } from '../../tests/fixtures/editor-model.mjs';
const root=new URL('./.qa-document/',import.meta.url);
await fs.mkdir(new URL('./assets/',root),{recursive:true});
try{await fs.access(new URL('./manual.json',root));throw new Error('QA document already exists; never reset an edited document');}catch(error){if(error.code!=='ENOENT')throw error;}
const {document,sidecars}=fixture();
const first=document.pages[0];
document.pages=first.blocks.map((block,i)=>({title:`구성 확인 ${i+1} · ${block.type}`,blocks:[block],...(i===0?{lead:first.lead,pageExtra:first.pageExtra}:{})}));
function rewrite(blocks){for(const b of blocks){if(b.type==='figure')figure(b);if(b.type==='steps')for(const step of b.items)if(step.figure)figure(step.figure);if(b.type==='columns'){figure(b.figure);rewrite(b.blocks);}}}
function figure(value){value.src='assets/document-list.jpg';if(value.crop){value.crop.sourceWidth=640;value.crop.sourceHeight=366;}}
for(const page of document.pages)rewrite(page.blocks);
await fs.copyFile(new URL('../../stories/assets/document-list.jpg',import.meta.url),new URL('./assets/document-list.jpg',root));
for(const [name,value] of Object.entries({'manual.json':document,...sidecars}))await fs.writeFile(new URL(name,root),JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({root:root.pathname,pages:document.pages.length+1,synthetic:true}));
