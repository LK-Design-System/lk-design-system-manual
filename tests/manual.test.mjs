import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { validateDocument } from '../src/validate.mjs';
import { scaffold } from '../src/scaffold.mjs';
const doc = () => ({ schemaVersion: 1, title: 'Sample', pages: [{ title: 'Start', blocks: [{ type: 'paragraph', text: 'Content' }] }] });

test('accepts both shipped examples', async () => {
  for (const name of ['compact', 'gallery']) assert.ok(validateDocument(JSON.parse(await fs.readFile(new URL(`../examples/${name}.json`, import.meta.url)))));
});
test('preserves typed copy and rejects incomplete figures, notes and tables', () => {
  const d = doc(); d.pages[0].blocks = [{ type: 'list', items: [{ label: '주소', value: '<script>literal</script>', emphasis: true }] }];
  assert.equal(validateDocument(d).pages[0].blocks[0].items[0].value, '<script>literal</script>');
  for (const block of [
    { type: 'figure', src: 'a.png', caption: 'A' },
    { type: 'callout', text: 'Missing title' },
    { type: 'steps', start: 0, items: [{ title: 'Step' }] },
    { type: 'table', label: 'Table', headers: ['A','B'], rows: [['A']] },
    { type: 'figure', src: 'a.png', alt: 'A', caption: 'A', size: 'tiny' }
  ]) { const invalid = doc(); invalid.pages[0].blocks = [block]; assert.throws(() => validateDocument(invalid)); }
});
test('scaffold keeps the branded cover, source record and renderable starter', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'lds-manual-init-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const destination = path.join(root, 'manual');
  await scaffold(destination, { title: '새 매뉴얼', version: '2.1' });
  const made = validateDocument(JSON.parse(await fs.readFile(path.join(destination, 'manual.json'))));
  assert.equal(made.title, '새 매뉴얼'); assert.equal(made.cover.logo.alt, 'LK ROBOTICS');
  assert.equal(made.cover.metadata[0].value, '2.1'); assert.equal(made.cover.metadata.length, 4);
  await fs.access(path.join(destination, made.pages[0].blocks[0].items[0].figure.src));
  assert.equal(JSON.parse(await fs.readFile(path.join(destination, 'sources.json'))).reviewStatus, 'draft');
});
test('init refuses existing directories and preserves their files', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'lds-manual-existing-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const marker = path.join(root, 'manual.json'); await fs.writeFile(marker, 'keep');
  await assert.rejects(scaffold(root), { code: 'EEXIST' });
  assert.equal(await fs.readFile(marker, 'utf8'), 'keep');
});
