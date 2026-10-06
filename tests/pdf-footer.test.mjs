import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const runtime = process.env.LDS_MANUAL_TEST_RUNTIME;
const python = process.env.LDS_MANUAL_TEST_PYTHON;
const browser = process.env.LDS_MANUAL_TEST_BROWSER;
const keepOutput = process.env.LDS_MANUAL_TEST_KEEP_OUTPUT === '1';
const root = fileURLToPath(new URL('../', import.meta.url));
const run = promisify(execFile);

test('exported PDF page and step numbers remain searchable ASCII text in both extractors', {
  skip: runtime && python ? false : 'Set LDS_MANUAL_TEST_RUNTIME and LDS_MANUAL_TEST_PYTHON (pypdf/pdfplumber); optionally LDS_MANUAL_TEST_BROWSER.'
}, async t => {
  const outputRoot = path.resolve(process.env.LDS_MANUAL_TEST_OUTPUT || os.tmpdir());
  await fs.mkdir(outputRoot, { recursive: true });
  const outputDir = await fs.mkdtemp(path.join(outputRoot, 'lds-manual-pdf-footer-'));
  t.after(async () => {
    const resolved = path.resolve(outputDir);
    assert.equal(path.dirname(resolved), outputRoot);
    assert.ok(path.basename(resolved).startsWith('lds-manual-pdf-footer-'));
    if (!keepOutput) await fs.rm(resolved, { recursive: true, force: true });
  });
  const cli = path.join(root, 'bin/lds-manual.mjs');
  const html = path.join(outputDir, 'manual.html');
  const pdf = path.join(outputDir, 'manual.pdf');
  await run(process.execPath, [cli, 'build', path.join(root, 'examples/authoring-guide/manual.json'), '--runtime', runtime, '--out', html]);
  await run(process.execPath, [cli, 'pdf', html, '--runtime', runtime, '--out', pdf, ...(browser ? ['--browser', browser] : [])]);
  const { stdout } = await run(python, ['-c', `
import json, sys
from pypdf import PdfReader
import pdfplumber
reader = PdfReader(sys.argv[1])
with pdfplumber.open(sys.argv[1]) as document:
    print(json.dumps({"pypdf": [p.extract_text() for p in reader.pages],
      "pdfplumber": [p.extract_text() for p in document.pages],
      "sizes": [[float(p.mediabox.width), float(p.mediabox.height)] for p in reader.pages]}))
`, pdf]);
  const extracted = JSON.parse(stdout);
  const expected = Array.from({ length: 6 }, (_, i) => `${String(i + 1).padStart(2, '0')} / 06`);
  const source = JSON.parse(await fs.readFile(path.join(root, 'examples/authoring-guide/manual.json'), 'utf8'));
  const pageBlocks = [...(source.cover ? [source.cover.blocks] : []), ...source.pages.map(page => page.blocks)];
  const steps = [];
  const collect = (blocks, page) => {
    for (const block of blocks) {
      if (block.type === 'steps') block.items.forEach((step, index) => steps.push({ page, number: (block.start || 1) + index, title: step.title }));
      if (block.type === 'columns') collect(block.blocks, page);
    }
  };
  pageBlocks.forEach((blocks, page) => collect(blocks, page));
  assert.ok(steps.length > 0, 'fixture has actual numbered steps');
  for (const extractor of ['pypdf', 'pdfplumber']) {
    const pages = extracted[extractor];
    assert.deepEqual(pages.map(text => text.trim().split(/\r?\n/).at(-1)), expected);
    assert.ok(pages.every(text => !/[\uE000-\uF8FF]/u.test(text)), `${extractor}: no Private Use glyphs`);
    for (const step of steps) {
      const needle = `${step.number}.${step.title}`.replace(/\s/g, '');
      assert.ok(pages[step.page].replace(/\s/g, '').includes(needle), `${extractor}: page ${step.page + 1} step ${step.number} text`);
    }
  }
  for (const [width, height] of extracted.sizes) {
    assert.ok(Math.abs(width - 595.276) < 1 && Math.abs(height - 841.89) < 1, 'A4 page size');
  }
  const layout = JSON.parse(await fs.readFile(path.join(outputDir, 'manual.layout.json'), 'utf8'));
  assert.equal(layout.pages, 6);
  assert.deepEqual(layout.errors, []);
  assert.ok(layout.measurements[1].remainingPx >= 0, 'attachment task remains inside its A4 content area');
  if (keepOutput) {
    await fs.writeFile(path.join(outputRoot, 'latest-pdf-output.json'), JSON.stringify({ html, pdf, layout: path.join(outputDir, 'manual.layout.json'), steps, extracted }, null, 2) + '\n');
    t.diagnostic(`Retained verified PDF: ${pdf}`);
  }
});
