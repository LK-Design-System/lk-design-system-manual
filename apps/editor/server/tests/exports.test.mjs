import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createStore, sha } from '../storage.mjs';
import { createExports } from '../exports.mjs';
import { imageDimensions } from '../../../../src/image-dimensions.mjs';
import { copySets,hash } from '../../../../src/copy-review.mjs';
const repo=fileURLToPath(new URL('../../../../',import.meta.url));
const runtime=process.env.LDS_EDITOR_TEST_RUNTIME,browser=process.env.LDS_EDITOR_TEST_BROWSER;
const enabled=Boolean(runtime&&browser);
const recordFor=doc=>({schemaVersion:1,contract:'lds-manual-copy-review/v1',reviewer:'Synthetic contract fixture',reviewedAt:'2026-10-05',ruleset:'fixture only',audience:'synthetic test',reviewKind:'contextual-agent-review',documentHash:hash(doc),sets:copySets(doc).map(s=>({...s,task:'합성 fixture 검토 gate',contextReason:'자동 gate의 현재성만 검증하며 제품 승인이나 언어 품질 판정이 아니다.',sourceItems:s.items,sourceHash:hash(s.items),decisions:s.items.map(i=>({...i,verdict:'KEEP',reason:'합성 gate fixture의 고정 문자열'}))}))});

test('real fixed CLI exports: coverless/crops, cover, failed PDF separation and stale review gates',{skip:!enabled},async t=>{
 const parent=process.env.LDS_EDITOR_TEST_OUTPUT || await fs.realpath(os.tmpdir());
 await fs.mkdir(parent,{recursive:true});
 const root=await fs.mkdtemp(path.join(parent,'lds-editor-export-'));
 if(!process.env.LDS_EDITOR_TEST_OUTPUT)t.after(async()=>{assert.ok(path.basename(root).startsWith('lds-editor-export-'));await fs.rm(root,{recursive:true,force:true});});
 await fs.mkdir(path.join(root,'assets'));
 const names=['orientation-6.jpg','physical.svg','fractional.svg'],pages=[],assetHashes={};
 for(const name of names){const bytes=await fs.readFile(path.join(repo,'tests/fixtures/intrinsic',name));await fs.writeFile(path.join(root,'assets',name),bytes);assetHashes[name]=sha(bytes);const mime=name.endsWith('.jpg')?'image/jpeg':'image/svg+xml';const d=imageDimensions(bytes,mime);pages.push({title:`원본 확대 확인 · ${name}`,lead:'합성 원본의 방향과 확대 영역을 확인합니다.',blocks:[{type:'steps',items:[{title:'그림의 확대 영역 확인',text:'원본 방향과 경계를 보존한 그림을 확인합니다.'}]},{type:'figure',src:`assets/${name}`,alt:`합성 ${name} 그림`,caption:'브라우저 intrinsic 좌표로 지정한 확대 영역입니다.',size:'compact',crop:{x:0,y:0,width:d.width,height:Math.min(d.height,Math.max(1,Math.round(d.width/3))),sourceWidth:d.width,sourceHeight:d.height}}]});}
 const document={schemaVersion:1,title:'표지 없는 합성 crop 검증',pages};
 await fs.writeFile(path.join(root,'manual.json'),JSON.stringify(document));
 await fs.writeFile(path.join(root,'copy-review.json'),JSON.stringify(recordFor(document)));
 const store=await createStore({root}),outputs=await createExports({store,runtime,browser}),loaded=await store.load();assert.equal(loaded.validation.valid,true);
 await assert.rejects(outputs.start({expectedRevision:loaded.revision,format:'pdf',mode:'reviewed'}),e=>e.code==='VISUAL_REVIEW');
 const draft=await outputs.start({expectedRevision:loaded.revision,format:'pdf',mode:'draft'});assert.equal(draft.state,'running');const finished=await outputs.wait(draft.jobId);assert.equal(finished.state,'succeeded',finished.error);const job=await outputs.status(draft.jobId);assert.equal(job.current,true);const html=(await outputs.artifact(draft.jobId,'manual.html')).toString();assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.match(html,/<h1[^>]*clip-path:inset\(50%\)/);assert.equal((html.match(/data-manual-page=/g)||[]).length,3);
 for(const name of names)assert.equal(sha(await fs.readFile(path.join(root,'assets',name))),assetHashes[name]);
 await outputs.visualReview({expectedRevision:loaded.revision,jobId:draft.jobId,reviewer:'Synthetic gate fixture',outcome:'pass',reason:'Gate binding fixture only; independent rendered visual check is recorded separately.'});
 const reviewed=await outputs.start({expectedRevision:loaded.revision,format:'html',mode:'reviewed'}).catch(e=>e);assert.equal(reviewed.code,'VISUAL_REVIEW','PDF review must not approve a different output format');
 const htmlDraft=await outputs.start({expectedRevision:loaded.revision,format:'html',mode:'draft'});assert.equal((await outputs.wait(htmlDraft.jobId)).state,'succeeded');
 await outputs.visualReview({expectedRevision:loaded.revision,jobId:htmlDraft.jobId,reviewer:'Synthetic gate fixture',outcome:'pass',reason:'Positive same-revision/format gate fixture; actual output inspection remains independent.'});
 const htmlReviewed=await outputs.start({expectedRevision:loaded.revision,format:'html',mode:'reviewed'});const htmlDone=await outputs.wait(htmlReviewed.jobId);assert.equal(htmlDone.state,'succeeded');assert.equal(htmlDone.mode,'reviewed');
 const current=await store.load();const coverDoc={...document,title:'표지 있는 합성 검증',cover:{title:'표지 있는 합성 검증',sectionTitle:'시작하기 전',metadata:[{label:'문서 상태',value:'합성 시험'}],blocks:[{type:'paragraph',text:'실제 제품 승인을 포함하지 않는 검증 자료입니다.'}]},pages:[pages[0]]};
 const saved=await store.save({expectedRevision:current.revision,document:coverDoc});assert.equal((await outputs.status(draft.jobId)).current,false);assert.equal(saved.review.copy.current,false);await assert.rejects(outputs.start({expectedRevision:saved.revision,format:'pdf',mode:'reviewed'}),e=>e.code==='COPY_REVIEW');
 const covered=await outputs.start({expectedRevision:saved.revision,format:'pdf',mode:'draft'});assert.equal((await outputs.wait(covered.jobId)).state,'succeeded');
 const longDoc={schemaVersion:1,title:'의도적 분량 초과',pages:[{title:'길이 초과',blocks:Array.from({length:100},()=>({type:'paragraph',text:'의도적으로 긴 합성 문장입니다. 분량을 숨기거나 글자를 줄이지 않습니다.'}))}]};
 const last=await store.save({expectedRevision:(await store.load()).revision,document:longDoc});const failure=await outputs.start({expectedRevision:last.revision,format:'pdf',mode:'draft'});const failed=await outputs.wait(failure.jobId);assert.equal(failed.state,'failed');assert.match((await outputs.artifact(failure.jobId,'manual.layout.json')).toString(),/overflow|exceeds/);await assert.rejects(outputs.artifact(failure.jobId,'manual.pdf'),e=>e.code==='ARTIFACT');assert.ok((await outputs.artifact(draft.jobId,'manual.pdf')).length>0);assert.notEqual(failure.jobId,draft.jobId);
 const evidence={root,environment:{node:process.version,platform:process.platform,runtime,browser},jobs:{coverless:await outputs.status(draft.jobId),cover:await outputs.status(covered.jobId),failed:await outputs.status(failure.jobId)},assetHashes,scope:'Synthetic fixtures; gate fixture does not claim contextual quality or product approval',remaining:['Independent PDF text/font/page geometry extraction and visual review']};
 await fs.writeFile(path.join(root,'export-evidence.json'),JSON.stringify(evidence,null,2));
 if(process.env.LDS_EDITOR_TEST_OUTPUT){await fs.copyFile(path.join(root,`.editor/exports/${draft.jobId}/output/manual.pdf`),path.join(parent,'editor-coverless-crops.pdf'));await fs.copyFile(path.join(root,`.editor/exports/${covered.jobId}/output/manual.pdf`),path.join(parent,'editor-cover.pdf'));await fs.writeFile(path.join(parent,'latest-export-evidence.json'),JSON.stringify(evidence,null,2));}
 await outputs.close();
});
