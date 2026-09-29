#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createManualComponents } from '../src/components.mjs';
import { validateDocument } from '../src/validate.mjs';
import { scaffold } from '../src/scaffold.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  title: { type: 'string' }, 'document-version': { type: 'string' }, out: { type: 'string' }, runtime: { type: 'string' }, browser: { type: 'string' }, help: { type: 'boolean' }
} });
const [command, input] = positionals;
if (values.help || !command) {
  console.log(`LDS Manual (local alpha)\n  lds-manual init new-directory [--title "제품 사용 매뉴얼"] [--document-version 0.1]\n  lds-manual build document.json --out output/manual.html [--runtime installed-project]\n  lds-manual pdf output/manual.html --out output/manual.pdf [--runtime installed-project] [--browser chromium-path]\nBuild embeds local assets. PDF stops on missing assets or overflow; split the source page and rebuild.`);
} else {
  try {
    if (command === 'init') {
      if (!input || values.out) throw new Error('Use init with a new destination directory, without --out.');
      await scaffold(path.resolve(input), { title: values.title, version: values['document-version'] });
      console.log(`Created: ${path.resolve(input)} (manual.json, sources.json, assets)`);
    } else {
    if (!input || !values.out || !['build', 'pdf'].includes(command)) throw new Error('Use build/pdf, an input file, and --out. See --help.');
    if (path.resolve(input) === path.resolve(values.out)) throw new Error('Input and output must be different files.');
    const require = createRequire(path.resolve(values.runtime || root, 'package.json'));
    if (command === 'build') await build(require, path.resolve(input), path.resolve(values.out));
    else await pdf(require, path.resolve(input), path.resolve(values.out));
    }
  } catch (error) { console.error(`LDS Manual: ${error.message}`); process.exitCode = 1; }
}

async function packageRoot(require, name) { return path.dirname(require.resolve(`${name}/package.json`)); }
async function publicModule(require, name, subpath) {
  const dir = await packageRoot(require, name);
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf8'));
  let target = manifest.exports[subpath];
  if (!target) for (const [key, value] of Object.entries(manifest.exports)) {
    if (!key.includes('*')) continue;
    const [before, after] = key.split('*');
    if (subpath.startsWith(before) && subpath.endsWith(after)) {
      const match = subpath.slice(before.length, after ? -after.length : undefined);
      target = (typeof value === 'string' ? value : value.import).replace('*', match); break;
    }
  }
  const entry = typeof target === 'string' ? target : target?.import;
  if (!entry) throw new Error(`Missing public export ${name}/${subpath}`);
  return import(pathToFileURL(path.join(dir, entry)).href);
}
async function build(require, input, output) {
  const core = await packageRoot(require, '@lk-design-system/lds-core');
  const theme = await packageRoot(require, '@lk-design-system/lds-theme');
  const coreVersion = JSON.parse(await fs.readFile(path.join(core, 'package.json'))).version;
  const themeVersion = JSON.parse(await fs.readFile(path.join(theme, 'package.json'))).version;
  if (coreVersion !== '0.4.3' || themeVersion !== '0.4.3') throw new Error('This alpha targets LDS Core/Theme 0.4.3. Use matching peers.');
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { Callout } = await publicModule(require, '@lk-design-system/lds-core', './components/status/Callout');
  const { Blockquote } = await publicModule(require, '@lk-design-system/lds-core', './components/content/Blockquote');
  const doc = validateDocument(JSON.parse(await fs.readFile(input, 'utf8')));
  const sourceDir = path.dirname(input);
  async function embed(src) {
    if (src === '@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg') {
      const bytes = await fs.readFile(path.join(theme, 'assets/brand/lk-logo-inline-navy.svg'));
      return `data:image/svg+xml;base64,${bytes.toString('base64')}`;
    }
    if (/^[a-z][a-z\d+.-]*:/i.test(src) || path.isAbsolute(src)) throw new Error(`Use a relative local asset path: ${src}`);
    const asset = await fs.realpath(path.resolve(sourceDir, src));
    const sourceRoot = await fs.realpath(sourceDir);
    if (!asset.startsWith(sourceRoot + path.sep)) throw new Error('Assets must stay inside the document directory.');
    const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
    const mime = types[path.extname(asset).toLowerCase()];
    if (!mime) throw new Error(`Unsupported image type: ${src}`);
    const bytes = await fs.readFile(asset);
    if (bytes.length > 20 * 1024 * 1024) throw new Error(`Image exceeds 20 MiB: ${src}`);
    return `data:${mime};base64,${bytes.toString('base64')}`;
  }
  async function assets(blocks) {
    for (const b of blocks) {
      if (b.type === 'figure') b.src = await embed(b.src);
      if (b.type === 'steps') for (const s of b.items) if (s.figure) s.figure.src = await embed(s.figure.src);
      if (b.type === 'columns') { b.figure.src = await embed(b.figure.src); await assets(b.blocks); }
    }
  }
  if (doc.cover) { if (doc.cover.logo) doc.cover.logo.src = await embed(doc.cover.logo.src); await assets(doc.cover.blocks); }
  for (const page of doc.pages) await assets(page.blocks);
  let css = '';
  for (const [owner, name] of [[core, 'spacing.css'], [theme, 'color-semantic.css'], [theme, 'typography.css']]) css += await fs.readFile(path.join(owner, 'tokens', name), 'utf8');
  // Embed upstream font files in the generated artifact, not in this repository.
  for (const [weight, name] of [[400, 'Regular'], [500, 'Medium'], [600, 'SemiBold'], [700, 'Bold'], [800, 'ExtraBold']]) {
    const bytes = await fs.readFile(path.join(theme, 'assets/fonts', `Pretendard-${name}.woff2`));
    css += `@font-face{font-family:LDSManual;src:url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2');font-weight:${weight};font-display:block}`;
  }
  css += await fs.readFile(path.join(root, 'tokens/manual.css'), 'utf8');
  css += (await fs.readFile(path.join(root, 'styles.css'), 'utf8')).replace("@import './tokens/manual.css';", '');
  // This standalone document is the font host. The library never overrides Core tokens.
  css += ':root{--font-sans:LDSManual,sans-serif}body{margin:0;background:var(--color-semantic-background-band)}';
  const { ManualDocument } = createManualComponents(React, Callout, Blockquote);
  const html = '<!doctype html>' + renderToStaticMarkup(React.createElement('html', { lang: doc.lang || 'ko' },
    React.createElement('head', null, React.createElement('meta', { charSet: 'utf-8' }), React.createElement('title', null, doc.title),
      React.createElement('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' }),
      React.createElement('meta', { httpEquiv: 'Content-Security-Policy', content: "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" }),
      React.createElement('style', { dangerouslySetInnerHTML: { __html: css } })),
    React.createElement('body', null, React.createElement(ManualDocument, { document: doc }))));
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, html);
  await fs.copyFile(path.join(theme, 'assets/fonts/Pretendard-LICENSE.txt'), path.join(path.dirname(output), 'Pretendard-LICENSE.txt'));
  console.log(`HTML: ${output} (${doc.pages.length + Number(Boolean(doc.cover))} pages)`);
}
async function pdf(require, input, output) {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { throw new Error('PDF export requires Playwright in the selected runtime. HTML build does not.'); }
  const browser = await chromium.launch({ headless: true, ...(values.browser ? { executablePath: path.resolve(values.browser) } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } });
    await page.goto(pathToFileURL(input).href);
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => document.fonts.ready);
    const report = await page.evaluate(async () => {
      await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
      const pages = [...document.querySelectorAll('[data-manual-page]')];
      const errors = [];
      // Cropped figures use an SVG viewport around a raster source. Wait for
      // that source too; document.images only includes HTML <img> elements.
      for (const image of document.querySelectorAll('svg image')) {
        const probe = new Image();
        probe.src = image.getAttribute('href') || '';
        try { await probe.decode(); } catch { errors.push('Missing cropped figure image.'); }
      }
      if (!pages.length) errors.push('No LDS Manual pages found.');
      if (![...document.fonts].some(f => f.family.replaceAll('"', '') === 'LDSManual' && f.status === 'loaded') || !document.fonts.check('14px LDSManual')) errors.push('Document font did not load.');
      for (const img of document.images) if (!img.naturalWidth) errors.push(`Missing image: ${img.alt}`);
      const measurements = pages.map((p, i) => {
        const content = p.querySelector('.lds-manual-content');
        const bounds = content.getBoundingClientRect();
        let bottom = bounds.top;
        for (const e of content.querySelectorAll('*')) {
          // Measure the crop viewport, not the deliberately larger source
          // inside it. Other content remains subject to the full bounds check.
          if (e instanceof SVGElement && e.tagName.toLowerCase() !== 'svg') continue;
          const b = e.getBoundingClientRect();
          if (!b.width || !b.height) continue;
          bottom = Math.max(bottom, b.bottom);
          if (b.left < bounds.left - 1 || b.right > bounds.right + 1 || b.bottom > bounds.bottom + 1)
            errors.push(`Page ${i + 1}: ${e.tagName} exceeds the content area. Split the page; do not shrink the font.`);
        }
        if(content.scrollWidth>content.clientWidth+1 || content.scrollHeight>content.clientHeight+1) errors.push(`Page ${i+1}: content overflow.`);
        return { page: i + 1, remainingPx: Math.round(bounds.bottom - bottom) };
      });
      return { pages: pages.length, errors: [...new Set(errors)], measurements };
    });
    await fs.mkdir(path.dirname(output), { recursive: true });
    const reportPath = output.replace(/\.pdf$/i, '') + '.layout.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
    if (report.errors.length) throw new Error(`${report.errors.join('\n')}\nNo new PDF written. Report: ${reportPath}`);
    await page.pdf({ path: output, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
    console.log(`PDF: ${output} (${report.pages} pages); layout report: ${reportPath}`);
  } finally { await browser.close(); }
}
