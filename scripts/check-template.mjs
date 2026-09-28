#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseArgs } from 'node:util';
const exec = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const { values } = parseArgs({ options: { runtime: { type: 'string' }, browser: { type: 'string' } } });
const runtime = path.resolve(values.runtime || root);
const require = createRequire(path.join(runtime, 'package.json'));
const { chromium } = require('playwright');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'lds-manual-regression-'));
const checks = [];
let browser;
const cli = (...args) => exec(process.execPath, [path.join(root, 'bin/lds-manual.mjs'), ...args], { maxBuffer: 2 * 1024 * 1024 });
const near = (actual, expected, label, tolerance = 1) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);
try {
  browser = await chromium.launch({ headless: true, ...(values.browser ? { executablePath: path.resolve(values.browser) } : {}) });
  const page = await browser.newPage({ viewport: { width: 1158, height: 926 } });
  for (const [name, count] of [['compact',4],['gallery',6]]) {
    const html = path.join(temp, `${name}.html`);
    await cli('build', path.join(root, `examples/${name}.json`), '--runtime', runtime, '--out', html);
    await page.goto(pathToFileURL(html).href); await page.emulateMedia({ media: 'print' });
    const got = await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(i=>i.decode()));
      await Promise.all(['400','500','600','700','800'].map(w=>document.fonts.load(`${w} 14px LDSManual`)));
      const rect=e=>e.getBoundingClientRect();
      const steps=[...document.querySelectorAll('.lds-manual-step')];
      const meta=document.querySelector('.lds-manual-meta');
      return {
        pages: document.querySelectorAll('[data-manual-page]').length,
        logoWidth: rect(document.querySelector('.lds-manual-logo')).width,
        logoLoaded: document.querySelector('.lds-manual-logo').naturalWidth > 0,
        metadata: [...meta.querySelectorAll('tr')].map(tr=>[...tr.cells].map(c=>({tag:c.tagName,span:c.colSpan,width:rect(c).width,headers:c.getAttribute('headers'),id:c.id}))),
        stepStyles: steps.map(e=>{const s=getComputedStyle(e.querySelector('h3'));return [s.fontSize,s.lineHeight,s.fontWeight]}),
        captionSizes: [...new Set([...document.querySelectorAll('figcaption')].map(e=>getComputedStyle(e).fontSize))],
        fontWeights: [...document.fonts].filter(f=>f.family.replaceAll('"','')==='LDSManual' && f.status==='loaded').map(f=>f.weight).sort(),
        gaps: [...document.querySelectorAll('.lds-manual-step+.lds-manual-step')].map(e=>rect(e).top-rect(e.previousElementSibling).bottom),
        imageGaps: [...document.querySelectorAll('.lds-manual-step>.lds-manual-figure')].map(e=>rect(e).top-rect(e.previousElementSibling).bottom),
        captionGaps: [...document.querySelectorAll('figcaption')].map(e=>rect(e).top-rect(e.previousElementSibling).bottom),
        sectionRadii: [...new Set([...document.querySelectorAll('.lds-manual-section-title')].map(e=>getComputedStyle(e).borderRadius))],
        callouts: [...document.querySelectorAll('.lds-manual-callout')].map(e=>({title:!!e.querySelector('h3'),radius:getComputedStyle(e.firstElementChild).borderRadius,icon:!!e.querySelector('svg,img')})),
        numberedSteps: [...document.querySelectorAll('.lds-manual-step-label>span')].map(e=>e.textContent),
        figureWidths: [...document.querySelectorAll('.lds-manual-figure')].map(e=>({kind:e.className,width:rect(e).width})),
        footers: [...document.querySelectorAll('.lds-manual-page footer')].map(e=>e.textContent),
        overflow: [...document.querySelectorAll('.lds-manual-content')].flatMap((c,i)=>[...c.querySelectorAll('*')].filter(e=>{const b=rect(e),a=rect(c);return b.width>0&&(b.left<a.left-1||b.right>a.right+1||b.bottom>a.bottom+1)}).map(e=>({page:i+1,tag:e.tagName})))
      };
    });
    assert.equal(got.pages,count); assert.ok(got.logoLoaded); near(got.logoWidth,35*96/25.4,'logo width');
    assert.deepEqual(got.metadata.slice(0,2).map(r=>r.length),[4,4]);
    for(const row of got.metadata.slice(0,2)) {
      near(row[0].width/row[1].width,2/3,'metadata proportions',0.02);
      assert.equal(row[1].headers,row[0].id); assert.equal(row[3].headers,row[2].id);
    }
    if(name==='gallery'){assert.equal(got.metadata[2][1].span,3); assert.ok(got.numberedSteps.includes('3.'));}
    for(const style of got.stepStyles) assert.deepEqual(style,['17px','24px','600']);
    assert.deepEqual(got.captionSizes,['12px']); assert.deepEqual(got.fontWeights,['400','500','600','700','800']);
    for(const gap of got.gaps) near(gap,24,'step gap');
    for(const gap of got.imageGaps) near(gap,12,'image gap');
    for(const gap of got.captionGaps) near(gap,8,'caption gap');
    assert.deepEqual(got.sectionRadii,['8px']);
    for(const c of got.callouts) {assert.ok(c.title);assert.ok(c.icon);assert.equal(c.radius,'16px');}
    for(const figure of got.figureWidths) {
      if(figure.kind.includes('--reading')) near(figure.width,170*96/25.4,'reading width');
      if(figure.kind.includes('--compact')) near(figure.width,151*96/25.4,'compact width');
    }
    assert.deepEqual(got.footers,Array.from({length:count},(_,i)=>`${String(i+1).padStart(2,'0')} / ${String(count).padStart(2,'0')}`));
    assert.deepEqual(got.overflow,[]);
    checks.push({ name, pages:count, result:'passed', contracts:['brand','metadata','type','fonts','spacing','callout','figures','pagination','overflow'] });
    console.log(`PASS ${name}: ${count} pages, brand/type/spacing/layout`);
  }
  // The init output must build without including the private source record in HTML.
  const starter=path.join(temp,'starter');
  await cli('init',starter,'--title','테스트 초안');
  await fs.writeFile(path.join(starter,'sources.json'),JSON.stringify({privateReviewNote:'DO_NOT_EMBED_SOURCE_RECORD'}));
  const starterHtml=path.join(temp,'starter.html');
  await cli('build',path.join(starter,'manual.json'),'--runtime',runtime,'--out',starterHtml);
  assert.ok(!(await fs.readFile(starterHtml,'utf8')).includes('DO_NOT_EMBED_SOURCE_RECORD'));
  checks.push({name:'starter-source-separation',result:'passed'});
  // Local copy is arbitrary text, never interpreted as HTML.
  const invalid=JSON.parse(await fs.readFile(path.join(starter,'manual.json'),'utf8'));
  invalid.pages[0].blocks=[{type:'paragraph',text:'<script>alert("copy")</script>'}];
  const data=path.join(starter,'literal.json'); await fs.writeFile(data,JSON.stringify(invalid));
  await cli('build',data,'--runtime',runtime,'--out',path.join(temp,'literal.html'));
  const markup=await fs.readFile(path.join(temp,'literal.html'),'utf8');
  assert.ok(markup.includes('&lt;script&gt;')); assert.ok(!markup.includes('<script>'));
  checks.push({name:'literal-copy',result:'passed'});
  // Deliberately oversized page: fail and preserve an existing PDF byte-for-byte.
  invalid.pages[0].blocks=[{type:'steps',items:Array.from({length:80},(_,i)=>({title:`긴 단계 ${i+1}`,text:'자동 축소로 내용을 숨기지 않습니다.'}))}];
  await fs.writeFile(data,JSON.stringify(invalid));
  const overflowHtml=path.join(temp,'overflow.html'), output=path.join(temp,'blocked.pdf');
  await cli('build',data,'--runtime',runtime,'--out',overflowHtml);await fs.writeFile(output,'PREVIOUS_OUTPUT');
  let failed=false;
  try { await cli('pdf',overflowHtml,'--runtime',runtime,'--out',output,...(values.browser?['--browser',path.resolve(values.browser)]:[])); }
  catch(error) {failed=true;assert.match(error.stderr,/exceeds|overflow/);}
  assert.ok(failed);assert.equal(await fs.readFile(output,'utf8'),'PREVIOUS_OUTPUT');
  assert.ok(JSON.parse(await fs.readFile(path.join(temp,'blocked.layout.json'),'utf8')).errors.length);
  checks.push({name:'overflow-refusal',result:'passed'});
  console.log('PASS starter, private source separation, literal copy, overflow refusal');
  await fs.mkdir(path.join(root,'output'),{recursive:true});
  await fs.writeFile(path.join(root,'output/template-check.json'),JSON.stringify({status:'passed',checks},null,2)+'\n');
  await fs.rm(temp,{recursive:true,force:true});
} catch(error) {
  console.error(`FAIL: ${error.message}\nDiagnostic artifacts: ${temp}`);process.exitCode=1;
} finally { if(browser) await browser.close(); }
