import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchManual } from '../launch.mjs';
import { fixture as modelFixture } from '../../../tests/fixtures/editor-model.mjs';
import { copySets, hash } from '../../../src/copy-review.mjs';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const runtime = process.env.LDS_EDITOR_TEST_RUNTIME;
const executable = process.env.LDS_EDITOR_TEST_BROWSER;
const enabled = Boolean(runtime && executable);
const readJSON = async file => JSON.parse(await fs.readFile(file, 'utf8'));
// Use native keyboard changes inside PM node views; DOM-only selectOption does not
// exercise the focused control's interaction with the editor selection observer.
async function choose(locator, value) {
  const index = await locator.locator('option').evaluateAll((options, wanted) => options.findIndex(option => option.value === wanted), value);
  assert.ok(index >= 0);
  await locator.press('Home');
  for (let i = 0; i < index; i++) await locator.press('ArrowDown');
  await locator.press('Tab');
  assert.equal(await locator.inputValue(), value);
}

// These records test current/stale status, never copy quality or product approval.
function reviewFixture(document) {
  return {
    schemaVersion: 1, contract: 'lds-manual-copy-review/v1',
    reviewKind: 'contextual-agent-review', reviewer: 'Synthetic status fixture only',
    reviewedAt: '2026-10-06', ruleset: 'Browser contract fixture', audience: 'Synthetic test',
    documentHash: hash(document), unknown: { preserve: true },
    sets: copySets(document).map(set => ({
      ...set, task: '합성 저작 흐름 검사', contextReason: '상태 경계를 검사하며 문구 품질이나 제품 승인을 주장하지 않습니다.',
      sourceItems: set.items, sourceHash: hash(set.items),
      decisions: set.items.map(item => ({ ...item, verdict: 'KEEP', reason: '합성 상태 검사의 고정 문구입니다.' }))
    })),
    placementReview: [{ reason: 'Unidentified legacy record', unknown: 'retain' }, {
      id: 'pages[0].blocks[2]', title: '보충 안내', role: '보충', relatedAction: '항목 확인',
      placement: '절차 뒤', reason: '합성 상태 fixture; 실제 배치 승인이 아닙니다.', decision: 'KEEP', unknown: 'retain'
    }]
  };
}

function documentFixture() {
  return {
    schemaVersion: 1, title: '가상 편집 매뉴얼', lang: 'ko', unknown: { keep: true },
    cover: {
      title: '가상 편집 매뉴얼', sectionTitle: '시작하기 전에',
      logo: { src: '@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg', alt: 'LK ROBOTICS' },
      metadata: [{ label: '상태', value: '합성 검증' }],
      blocks: [{ type: 'paragraph', text: '로컬 편집 동작을 확인하는 가상 문서입니다.' }]
    },
    pages: [
      { title: '항목 확인하기', blocks: [
        { type: 'paragraph', text: '목록에서 확인할 항목을 선택합니다.' },
        { type: 'steps', start: 1, items: [{ title: '항목 선택하기', text: '목록에서 항목을 선택합니다.', unknown: 'keep' }, { title: '결과 확인하기', text: '상세 화면을 확인합니다.' }] },
        { type: 'callout', title: '보충 안내', text: '선택한 항목의 제목을 확인합니다.', tone: 'signal' }
      ] },
      { title: '다음 항목 확인하기', blocks: [
        { type: 'paragraph', text: '다음 항목을 확인합니다.' },
        { type: 'list', items: ['제목', { label: '상태', value: '확인 대기', unknown: 'keep' }] },
        { type: 'steps', items: [{ title: '목록 돌아가기', text: '목록으로 돌아갑니다.' }] }
      ] }
    ]
  };
}

test('built editor browser workflows (synthetic documents; excludes native OS IME)', { skip: !enabled }, async t => {
  const { chromium } = createRequire(path.join(path.resolve(runtime), 'package.json'))('playwright');
  const browser = await chromium.launch({ executablePath: executable, headless: true });
  t.after(() => browser.close());
  const output = process.env.LDS_EDITOR_TEST_OUTPUT ? path.resolve(process.env.LDS_EDITOR_TEST_OUTPUT) : null;
  if (output) await fs.mkdir(output, { recursive: true });
  const workflow = (name, run) => t.test(name, { skip: Boolean(process.env.LDS_EDITOR_TEST_CASE && !name.includes(process.env.LDS_EDITOR_TEST_CASE)) }, run);

  async function open(t, { document = documentFixture(), sidecars, newDocument = false, width = 1680 } = {}) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'lds-manual-ui-'));
    const sources = { schemaVersion: 1, reviewStatus: 'approved', reviews: [{ reviewer: 'synthetic', revision: 'old' }], unknown: { preserve: true } };
    if (!newDocument) {
      await fs.mkdir(path.join(root, 'assets'));
      await fs.copyFile(path.join(repo, 'stories/assets/document-list.jpg'), path.join(root, 'assets/screen.jpg'));
      for (const [name, value] of Object.entries({ 'manual.json': document, 'sources.json': sources, 'copy-review.json': reviewFixture(document), ...sidecars })) {
        await fs.writeFile(path.join(root, name), JSON.stringify(value, null, 2) + '\n');
      }
    } else await fs.rmdir(root);
    let launched = await launchManual({ mode: newDocument ? 'new' : 'open', root, title: '새 가상 매뉴얼', runtime, browser: executable });
    const context = await browser.newContext({ viewport: { width, height: 1050 } });
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(7000);
    page.on('pageerror', error => errors.push(error.message));
    t.after(async () => {
      try {
        if (output && !page.isClosed() && page.url() === launched.host.baseUrl + '/') await page.screenshot({ path: path.join(output, t.name.replace(/[^a-z0-9]+/gi, '-').slice(0,100) + '.png') });
      } finally {
        await context.close();
        await launched.close();
        assert.ok(path.basename(root).startsWith('lds-manual-ui-'));
        await fs.rm(root, { recursive: true, force: true });
      }
      assert.deepEqual(errors, [], 'No browser runtime errors');
    });
    async function connect() {
      await page.goto(pathToFileURL(launched.host.launchPath).href);
      await page.waitForURL(launched.host.baseUrl + '/');
      await loaded();
      assert.equal(new URL(page.url()).search + new URL(page.url()).hash, '', 'No credentials in displayed URL');
    }
    async function loaded() {
      await page.waitForFunction(() => document.querySelector('.manual-editor-notice')?.textContent.includes('문서를 불러왔습니다'));
    }
    async function save() {
      const response = page.waitForResponse(r => r.url().endsWith('/api/save') && r.request().method() === 'POST');
      await page.getByRole('button', { name: '저장', exact: true }).click();
      assert.equal((await response).status(), 200);
      await page.waitForFunction(() => document.querySelector('.manual-editor-notice')?.textContent === '정본 저장 완료');
      return readJSON(path.join(root, 'manual.json'));
    }
    async function properties(){const detail=page.locator('.manual-editor-properties');if(await detail.getAttribute('open')===null)await detail.locator('summary').click();}
    async function reviewOpen(){if(!await page.locator('.manual-editor-review-dialog').evaluate(e=>e.open))await page.getByRole('button',{name:'검토·출력',exact:true}).click();}
    async function select(sourcePath,{settings=true}={}){
      if(await page.locator('.manual-editor-review-dialog').evaluate(e=>e.open))await page.getByRole('button',{name:'닫기',exact:true}).click();
      if(sourcePath==='/')await page.locator('.manual-editor-document-title').click();
      else {
        const bits=sourcePath.split('/').filter(Boolean),pagePath=bits[0]==='cover'?'/cover':`/pages/${bits[1]}`;
        await page.locator(`.manual-editor-outline [data-path="${pagePath}"]`).click();
        if(bits.length>2){const blockLength=bits[0]==='cover'?3:4,blockPath='/'+bits.slice(0,blockLength).join('/');await page.locator(`.manual-editor-outline [data-path="${blockPath}"]`).click();
          if(bits.length>blockLength)await page.locator(`[data-object-path="${sourcePath}"] > .manual-editor-object-label button`).click();}
      }
      if(settings)await properties();
    }
    const text=(pageIndex,field='text')=>{
      const locator=page.locator('.manualPage').nth(pageIndex).locator(`[data-field="${field}"] .manual-editor-string [data-node-view-content-react]`).first();
      async function prepare(){const sourcePath=await locator.evaluate(e=>e.closest('[data-object-path]').dataset.objectPath);await select(sourcePath,{settings:false});}
      return {async fill(value){await prepare();await locator.fill(value);},async click(){await prepare();await locator.click();}};
    };
    await connect();
    await page.locator('.manual-editor-file-menu > summary').click();
    return { select, properties, reviewOpen, root, page, context, text, loaded, save, errors, source: document,
      state: () => launched.host.store.load(),
      async restart() { await launched.close(); launched = await launchManual({ mode: 'open', root, runtime, browser: executable }); await connect(); }
    };
  }

  await workflow('new/open secure bootstrap, reload and host restart preserve original files', async t => {
    const h = await open(t, { newDocument: true });
    const before = await fs.readFile(path.join(h.root, 'manual.json'));
    await h.page.reload(); await h.loaded();
    await h.restart();
    assert.deepEqual(await fs.readFile(path.join(h.root, 'manual.json')), before);
    assert.equal((await h.state()).document.title, '새 가상 매뉴얼');
  });

  await workflow('all schema fields, opaque fields, sidecars and originals survive UI save/reopen', async t => {
    const full = modelFixture();
    function figures(blocks) {
      for (const block of blocks) {
        const update = figure => { figure.src = 'assets/screen.jpg'; if (figure.crop) figure.crop.sourceHeight = 366; };
        if (block.type === 'figure') update(block);
        if (block.type === 'steps') for (const step of block.items) if (step.figure) update(step.figure);
        if (block.type === 'columns') { update(block.figure); figures(block.blocks); }
      }
    }
    figures(full.document.pages[0].blocks);
    // Dedicated pages keep the complete schema fixture within explicit A4 boundaries.
    full.document.pages = [...full.document.pages[0].blocks.map((block, i) => ({ title: `구성 ${i + 1}`, blocks: [block], ...(i === 0 ? { lead: full.document.pages[0].lead, pageExtra: full.document.pages[0].pageExtra } : {}) })), full.document.pages[1]];
    const h = await open(t, { document: full.document, sidecars: full.sidecars });
    const original = await fs.readFile(path.join(h.root, 'assets/screen.jpg'));
    const sources = await fs.readFile(path.join(h.root, 'sources.json'));
    const copy = await fs.readFile(path.join(h.root, 'copy-review.json'));
    assert.deepEqual(await h.save(), full.document);
    await h.page.reload(); await h.loaded();
    assert.deepEqual((await h.state()).document, full.document);
    assert.deepEqual(await fs.readFile(path.join(h.root, 'assets/screen.jpg')), original);
    assert.deepEqual(await fs.readFile(path.join(h.root, 'sources.json')), sources);
    assert.deepEqual(await fs.readFile(path.join(h.root, 'copy-review.json')), copy);
  });

  await workflow('Unicode text/newlines, structural move and split share undo and disk persistence', async t => {
    const h = await open(t);
    await h.text(0).fill('한글과 공백  보존');
    await h.page.keyboard.press('End'); await h.page.keyboard.press('Enter'); await h.page.keyboard.insertText('다음 문장');
    assert.equal((await h.save()).pages[0].blocks[0].text, '한글과 공백  보존\n다음 문장');
    await h.select('/pages/0/blocks/1/items/0');
    await h.page.getByLabel(/^이동할 페이지/).selectOption('1');
    assert.equal(await h.page.getByLabel(/^대상 절차 블록/).inputValue(), '2');
    await h.page.getByRole('button', { name: '선택 구성 옮기기', exact: true }).click();
    const moved = await h.save();
    assert.equal(moved.pages[1].blocks[2].items[0].title, '항목 선택하기');
    assert.equal(moved.pages[1].blocks[2].items[0].unknown, 'keep');
    await h.page.getByRole('button', { name: '실행 취소', exact: true }).click();
    assert.deepEqual((await h.save()).pages[0].blocks[1], h.source.pages[0].blocks[1]);
    await h.select('/pages/0/blocks/1');
    await h.page.getByRole('button', { name: '선택한 경계에서 단계 나누기', exact: true }).click();
    const split = await h.save();
    assert.equal(split.pages.length, 3);
    assert.equal(split.pages[1].blocks[0].start, 2);
    assert.equal(split.pages[1].blocks[0].items[0].title, '결과 확인하기');
    await h.restart();
    assert.deepEqual((await h.state()).document, split);
  });

  await workflow('table columns/rows, labeled list and optional removal use actual UI commands', async t => {
    const document = documentFixture();
    document.pages[0].blocks = [{ type: 'table', label: '합성 표', headers: ['이름', '상태'], rows: [['A', '대기'], ['B', '완료']], unknown: { keep: true } }];
    const h = await open(t, { document });
    await h.select('/pages/0/blocks/0');
    const headers = h.page.locator('[data-array-path="/pages/0/blocks/0/headers"]');
    await headers.locator('summary').click();
    await headers.getByLabel(/^삽입·선택 위치/).focus();
    await h.page.keyboard.press('ArrowDown');
    await h.page.keyboard.press('Tab');
    assert.equal(await headers.getByLabel(/^삽입·선택 위치/).inputValue(), '1', 'Selected middle-column insertion point stays selected');
    await headers.getByRole('button', { name: '항목 추가', exact: true }).click();
    const inserted = await h.save();
    assert.deepEqual(inserted.pages[0].blocks[0].headers, ['이름', '새 열', '상태']);
    assert.deepEqual(inserted.pages[0].blocks[0].rows, [['A', '내용', '대기'], ['B', '내용', '완료']]);
    await choose(headers.getByLabel(/^삽입·선택 위치/), '1');
    await choose(headers.getByLabel(/^항목 이동 위치/), '2');
    await headers.getByRole('button', { name: '선택 항목 이동', exact: true }).click();
    assert.deepEqual((await h.save()).pages[0].blocks[0].headers, ['이름', '상태', '새 열']);
    await choose(headers.getByLabel(/^삽입·선택 위치/), '2');
    await headers.getByRole('button', { name: '선택 항목 삭제', exact: true }).click();
    const rows = h.page.locator('[data-array-path="/pages/0/blocks/0/rows"]');
    await rows.locator('summary').click();
    await choose(rows.getByLabel(/^삽입·선택 위치/), '1');
    await rows.getByRole('button', { name: '항목 추가', exact: true }).click();
    assert.deepEqual((await h.save()).pages[0].blocks[0].rows, [['A', '대기'], ['내용', '내용'], ['B', '완료']]);
    await h.select('/pages/1/blocks/1');
    const items = h.page.locator('[data-array-path="/pages/1/blocks/1/items"]');
    await items.locator('summary').click();
    await choose(items.getByLabel(/^삽입·선택 위치/), '2');
    await items.getByRole('button', { name: '이름·값 항목 추가', exact: true }).click();
    await items.locator('.manualRecord').last().getByRole('button', { name: '항목', exact: true }).click();
    await h.properties();
    await h.page.getByRole('button', { name: '값 강조 필드 제거', exact: true }).click();
    await h.page.getByRole('button', { name: '이름 강조 필드 제거', exact: true }).click();
    const result = await h.save();
    assert.deepEqual(result.pages[1].blocks[1].items[2], { label: '항목', value: '내용' });
    assert.equal(result.pages[1].blocks[1].items[1].unknown, 'keep');
    assert.deepEqual(result.pages[0].blocks[0].unknown, { keep: true });
    await h.restart(); assert.deepEqual((await h.state()).document, result);
  });

  await workflow('outline drag and keyboard activation preserve order, selection and undo', async t => {
    const h = await open(t);
    const outline = h.page.locator('.manual-editor-outline');
    await outline.getByRole('button', { name: /목록에서 확인할/ }).dragTo(outline.getByRole('button', { name: /보충 안내/ }));
    assert.deepEqual((await h.save()).pages[0].blocks.map(b => b.type), ['steps', 'callout', 'paragraph']);
    assert.equal(await outline.getByRole('button', { name: /목록에서 확인할/ }).getAttribute('aria-current'), 'true');
    await h.page.getByRole('button', { name: '위로 이동', exact: true }).press('Enter');
    assert.deepEqual((await h.save()).pages[0].blocks.map(b => b.type), ['steps', 'paragraph', 'callout']);
    await h.page.getByRole('button', { name: '실행 취소', exact: true }).click();
    await h.text(0).click();
    await h.page.keyboard.press('Control+z');
    assert.deepEqual((await h.save()).pages[0].blocks, h.source.pages[0].blocks);
    await h.text(0).click();
    await h.page.keyboard.press('Control+Shift+z');
    assert.deepEqual((await h.save()).pages[0].blocks.map(b => b.type), ['steps', 'callout', 'paragraph']);
  });

  await workflow('unfinished draft, dirty protection and external conflict retain both versions', async t => {
    const h = await open(t);
    await h.select('/');
    const title = h.page.locator('[data-field="title"] .manual-editor-string [data-node-view-content-react]').first();
    await title.fill('');
    assert.equal(await h.page.getByRole('button', { name: '저장', exact: true }).isDisabled(), true);
    await h.page.getByRole('button', { name: '초안 복구 저장', exact: true }).click();
    await h.page.waitForFunction(() => document.querySelector('.manual-editor-notice')?.textContent.includes('미완성 초안'));
    assert.equal((await h.state()).document.title, h.source.title);
    assert.equal((await h.state()).draft.document.title, '');
    await h.page.getByRole('button', { name: '열기', exact: true }).click();
    const dialog = h.page.getByRole('alertdialog', { name: '편집 내용 보존' });
    assert.equal(await dialog.isVisible(), true);
    await dialog.getByRole('button', { name: '취소', exact: true }).press('Escape');
    assert.equal(await dialog.count(), 0);
    assert.equal(await h.page.getByRole('button', { name: '열기', exact: true }).evaluate(element => element === document.activeElement), true, 'Dialog cancellation restores the invoking control focus');
    await h.page.getByRole('button', { name: '열기', exact: true }).click();
    await dialog.getByRole('button', { name: '현재 변경을 버리고 계속', exact: true }).click();
    await h.loaded();
    await h.page.getByRole('button', { name: '보관 초안 복원', exact: true }).click();
    await h.page.waitForFunction(() => document.querySelector('.manual-editor-notice')?.textContent.includes('보관 초안을 복원'));
    assert.equal(await title.textContent(), '');
    await title.fill('복원한 가상 매뉴얼'); await h.save();
    const external = await readJSON(path.join(h.root, 'manual.json')); external.title = '외부에서 변경한 제목';
    await fs.writeFile(path.join(h.root, 'manual.json'), JSON.stringify(external));
    await title.fill('저장하지 않은 내 편집');
    await h.page.waitForFunction(() => document.querySelector('.manual-editor-notice')?.textContent.includes('changed'));
    await h.page.getByRole('button', { name: '열기', exact: true }).click();
    assert.equal(await dialog.getByRole('button', { name: '정본 저장 후 계속', exact: true }).isDisabled(), true);
    const downloading = h.page.waitForEvent('download');
    await dialog.getByRole('button', { name: '편집 JSON 내려받기', exact: true }).click();
    assert.equal((await readJSON(await (await downloading).path())).title, '저장하지 않은 내 편집');
    assert.equal((await readJSON(path.join(h.root, 'manual.json'))).title, external.title);
    await dialog.getByRole('button', { name: '취소', exact: true }).click();
  });

  await workflow('review drafts remain pending, preserve legacy records and become stale after editing', async t => {
    const h = await open(t);
    assert.equal((await h.state()).review.copy.current, true);
    const original = await fs.readFile(path.join(h.root, 'copy-review.json'));
    await h.text(0).fill('수정한 문장을 다시 검토합니다.'); await h.save();
    assert.equal((await h.state()).review.copy.current, false);
    assert.deepEqual(await fs.readFile(path.join(h.root, 'copy-review.json')), original);
    await h.reviewOpen();
    await h.page.locator('.manual-editor-context-review > summary').click();
    await h.page.getByRole('button', { name: '현재 과업의 검토 초안 만들기', exact: true }).click();
    await h.page.getByLabel('검토자', { exact: true }).fill('Synthetic draft verifier');
    await h.page.getByLabel('대상 독자', { exact: true }).fill('합성 검사');
    await h.page.getByLabel(/^검토할 과업/).selectOption('2');
    await h.page.getByLabel('사용자 과업', { exact: true }).fill('수정한 문구 검토');
    await h.page.getByLabel('맥락 판단 근거', { exact: true }).fill('미검토 기록 저장과 재열기만 검사합니다.');
    await h.page.getByLabel(/^배치 판정/).selectOption('BLOCKED');
    await h.page.getByRole('button', { name: '검토 기록 저장', exact: true }).click();
    await h.page.waitForFunction(() => document.querySelector('.manual-editor-context-review [role=status]')?.textContent.includes('검토 기록을 저장했습니다'));
    await h.page.reload(); await h.loaded();
    const loaded = await h.state();
    assert.equal(loaded.review.copy.current, false);
    assert.equal(loaded.copyReview.placementReview[0].unknown, 'retain');
    assert.equal(loaded.copyReview.placementReview[1].decision, 'BLOCKED');
    assert.equal(loaded.copyReview.placementReview[1].unknown, 'retain');
    assert.deepEqual(loaded.copyReview.unknown, { preserve: true });
    assert.equal(loaded.copyReview.editorReviewHistory.length, 1);
    assert.equal(loaded.copyReview.sets[2].decisions[0].verdict, 'PENDING');
  });

  await workflow('crop errors persist through text editing and locate the owning figure for correction', async t => {
    const document = documentFixture();
    document.pages[0].blocks.unshift({ type: 'figure', src: 'assets/screen.jpg', alt: '합성 목록 화면', caption: '원본 목록', crop: { x: 0, y: 0, width: 320, height: 183, sourceWidth: 640, sourceHeight: 366 } });
    const h = await open(t, { document });
    const original = await fs.readFile(path.join(h.root, 'assets/screen.jpg'));
    await h.select('/pages/0/blocks/0');
    await h.page.getByLabel('왼쪽', { exact: true }).fill('20');
    await h.page.getByRole('button', { name: '속성 적용', exact: true }).click();
    assert.equal((await h.save()).pages[0].blocks[0].crop.x, 20);
    await h.page.getByLabel('원본 폭', { exact: true }).fill('800');
    await h.page.getByRole('button', { name: '속성 적용', exact: true }).click();
    const error = h.page.locator('.manual-editor-review li button').filter({ hasText: /crop source dimensions|원본 좌표 기준/ }).first();
    await h.reviewOpen(); await error.waitFor();
    await h.text(0).fill('이미지 오류가 있는 동안 다른 문구를 편집합니다.');
    await h.reviewOpen(); await error.waitFor();
    assert.equal(await h.page.getByRole('button', { name: '저장', exact: true }).isDisabled(), true);
    await error.click();
    assert.equal(await h.page.getByLabel('원본 폭', { exact: true }).count(), 1, 'Error navigation opens the figure properties, not the crop scalar');
    await h.page.getByLabel('원본 폭', { exact: true }).fill('640');
    await h.page.getByRole('button', { name: '속성 적용', exact: true }).click(); await h.save();
    await h.restart();
    assert.equal((await h.state()).document.pages[0].blocks[0].crop.x, 20);
    assert.deepEqual(await fs.readFile(path.join(h.root, 'assets/screen.jpg')), original);
  });

  await workflow('missing image correction imports a new original without overwriting existing assets', async t => {
    const document = documentFixture();
    document.pages[0].blocks.unshift({ type: 'figure', src: 'assets/missing.jpg', alt: '합성 목록 화면', caption: '원본 목록' });
    const h = await open(t, { document });
    const original = await fs.readFile(path.join(h.root, 'assets/screen.jpg'));
    const error = h.page.locator('.manual-editor-review li button').filter({ hasText: /missing|ENOENT|Missing/ }).first();
    await h.reviewOpen(); await error.waitFor(); await error.click();
    await h.page.getByLabel('원본 이미지 가져오기', { exact: true }).setInputFiles(path.join(repo, 'stories/assets/document-list.jpg'));
    await h.page.waitForFunction(() => document.querySelector('.manual-editor-notice')?.textContent.includes('원본 바이트를 문서 자산으로 보관'));
    const imported = await h.save();
    const src = imported.pages[0].blocks[0].src;
    assert.notEqual(src, 'assets/screen.jpg');
    assert.deepEqual(await fs.readFile(path.join(h.root, src)), original);
    assert.deepEqual(await fs.readFile(path.join(h.root, 'assets/screen.jpg')), original);
    await h.restart(); assert.equal((await h.state()).validation.valid, true);
  });

  await workflow('unsupported document locks editing, preserves source and recovers after an explicit retry', async t => {
    const h = await open(t);
    const unsupported = structuredClone(h.source);
    unsupported.pages[0].blocks[0] = { type: 'future-block', text: '미지원 원문 보존' };
    const bytes = JSON.stringify(unsupported);
    await fs.writeFile(path.join(h.root, 'manual.json'), bytes);
    await h.page.getByRole('button', { name: '열기', exact: true }).click();
    await h.reviewOpen();
    await h.page.getByRole('button', { name: '다시 읽기', exact: true }).waitFor();
    assert.equal(await h.page.locator('.tiptap').getAttribute('contenteditable'), 'false');
    assert.equal(await h.page.getByRole('button', { name: '저장', exact: true }).isDisabled(), true);
    assert.equal(await fs.readFile(path.join(h.root, 'manual.json'), 'utf8'), bytes);
    await fs.writeFile(path.join(h.root, 'manual.json'), JSON.stringify(h.source));
    await h.page.getByRole('button', { name: '다시 읽기', exact: true }).click(); await h.loaded();
    assert.deepEqual(await h.save(), h.source);
  });

  await workflow('successful PDF, authenticated artifact, failed overflow job and stopped polling remain distinct', async t => {
    const h = await open(t);
    await h.reviewOpen();
    await h.page.getByLabel(/^출력 형식/).selectOption('pdf');
    const started = h.page.waitForResponse(r => r.url().endsWith('/api/exports') && r.request().method() === 'POST');
    await h.page.getByRole('button', { name: '출력', exact: true }).click();
    const first = await (await started).json();
    await h.page.waitForFunction(() => document.querySelector('.manual-editor-review')?.textContent.includes('PDF · succeeded'), null, { timeout: 20000 });
    await h.page.getByText('출력 리비전과 시각 검토', { exact: true }).click();
    const popup = h.page.waitForEvent('popup');
    await h.page.getByRole('button', { name: 'manual.pdf 열기', exact: true }).click();
    const opened = await popup; await opened.waitForURL('blob:**'); await opened.close();
    const pdfPath = path.join(h.root, '.editor/exports', first.jobId, 'output/manual.pdf');
    const pdf = await fs.readFile(pdfPath); assert.ok(pdf.length > 1000);
    if (output) await fs.copyFile(pdfPath, path.join(output, 'workflow-manual.pdf'));
    await h.page.getByLabel('시각 검토자', { exact: true }).fill('Synthetic UI gate fixture');
    await h.page.getByLabel(/^시각 검토 결과/).selectOption('pass');
    await h.page.getByLabel('시각 검토 근거', { exact: true }).fill('합성 출력의 리비전과 검토 gate 연결 검사입니다. 제품 승인이 아닙니다.');
    await h.page.getByRole('button', { name: '이 출력의 시각 검토 기록', exact: true }).click();
    await h.page.waitForFunction(() => document.querySelector('.manual-editor-notice')?.textContent.includes('시각 검토를 기록했습니다'));
    assert.equal((await readJSON(path.join(h.root, '.editor/visual-review.json'))).productApproval, false);
    await h.page.getByLabel(/^출력 상태/).selectOption('reviewed');
    await h.page.getByRole('button', { name: '출력', exact: true }).click();
    await h.page.waitForFunction(() => document.querySelector('.manual-editor-review > p')?.textContent.includes('검토 후 PDF · succeeded'), null, { timeout: 20000 });
    await h.page.getByLabel(/^출력 상태/).selectOption('draft');
    await h.text(0).fill('의도적인 분량 초과를 확인합니다. '.repeat(1000)); await h.save(); await h.reviewOpen();
    await h.page.getByRole('button', { name: '출력', exact: true }).click();
    await h.page.waitForFunction(() => document.querySelector('.manual-editor-review')?.textContent.includes('PDF · failed'), null, { timeout: 20000 });
    assert.equal(await h.page.getByRole('button', { name: 'manual.pdf 열기', exact: true }).count(), 0);
    assert.equal(await h.page.getByRole('button', { name: '진단 manual.layout.json 열기', exact: true }).count(), 1);
    assert.deepEqual(await fs.readFile(pdfPath), pdf);
    let polling = 0;
    h.page.on('request', r => { if (/\/api\/exports\/[a-f0-9-]+$/.test(r.url())) polling++; });
    await new Promise(resolve => setTimeout(resolve, 3200));
    assert.equal(polling, 0, 'Terminal output state stops status polling');
    await h.page.setViewportSize({ width: 760, height: 1050 });
    await h.page.getByRole('button',{name:'닫기',exact:true}).click();
    await h.page.getByRole('button', { name: '문서 보기', exact: true }).click();
    assert.equal(await h.page.locator('.manual-editor-preview-pane').isVisible(), true);
    assert.equal(await h.page.locator('.manual-editor-edit-pane').isVisible(), false);
  });
});
