import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const runtime = process.env.LDS_MANUAL_TEST_RUNTIME;
const root = fileURLToPath(new URL('../', import.meta.url));
const run = promisify(execFile);

test('standalone HTML preserves upstream atomic colors needed by semantic Callout colors', {
  skip: runtime ? false : 'Set LDS_MANUAL_TEST_RUNTIME to an installed LDS Core/Theme 0.4.3 project.'
}, async t => {
  const outputRoot = path.resolve(process.env.LDS_MANUAL_TEST_OUTPUT || os.tmpdir());
  await fs.mkdir(outputRoot, { recursive: true });
  const outputDir = await fs.mkdtemp(path.join(outputRoot, 'lds-manual-color-tokens-'));
  t.after(async () => {
    const resolved = path.resolve(outputDir);
    assert.equal(path.dirname(resolved), outputRoot);
    assert.ok(path.basename(resolved).startsWith('lds-manual-color-tokens-'));
    await fs.rm(resolved, { recursive: true, force: true });
  });
  const require = createRequire(path.resolve(runtime, 'package.json'));
  const theme = path.dirname(require.resolve('@lk-design-system/lds-theme/package.json'));
  const atomic = await fs.readFile(path.join(theme, 'tokens/color-atomic.css'), 'utf8');
  const semantic = await fs.readFile(path.join(theme, 'tokens/color-semantic.css'), 'utf8');
  const output = path.join(outputDir, 'manual.html');
  await run(process.execPath, [path.join(root, 'bin/lds-manual.mjs'), 'build',
    path.join(root, 'examples/authoring-guide/manual.json'), '--runtime', runtime, '--out', output]);
  const html = await fs.readFile(output, 'utf8');
  const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  assert.ok(css, 'generated HTML has embedded styles');
  assert.ok(css.includes(atomic), 'includes unchanged upstream atomic colors');
  assert.ok(css.includes(semantic), 'includes unchanged upstream semantic colors');
  assert.ok(css.indexOf(atomic) < css.indexOf(semantic), 'atomic input precedes semantic mappings');
  const definedAtomic = new Set([...css.matchAll(/(--color-atomic-[\w-]+)\s*:/g)].map(match => match[1]));
  const requiredAtomic = new Set([...semantic.matchAll(/var\((--color-atomic-[\w-]+)/g)].map(match => match[1]));
  assert.ok(requiredAtomic.size > 0, 'semantic colors actually require atomic input');
  for (const name of requiredAtomic) assert.ok(definedAtomic.has(name), `missing atomic input: ${name}`);
  assert.ok(html.includes('lds-manual-callout'), 'example renders actual Manual Callouts');
});
