import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { validateDocument } from '../../../src/validate.mjs';
import { hash, checkCopyReview } from '../../../src/copy-review.mjs';
import { imageDimensions as intrinsicDimensions, validateCropSource } from '../../../src/image-dimensions.mjs';

const files = ['manual.json', 'sources.json', 'copy-review.json'];
const themeLogo = '@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg';
export const sha = b => createHash('sha256').update(b).digest('hex');
export class HostError extends Error {
  constructor(status, code, message, details) { super(message); Object.assign(this, { status, code, details }); }
}
const fail = (status, code, message, details) => { throw new HostError(status, code, message, details); };
const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
function preserveFields(oldValue, newValue) {
  if (plain(oldValue) && plain(newValue)) return Object.fromEntries([...new Set([...Object.keys(oldValue),...Object.keys(newValue)])].map(k => [k,Object.hasOwn(newValue,k) ? preserveFields(oldValue[k],newValue[k]) : oldValue[k]]));
  if (Array.isArray(oldValue) && Array.isArray(newValue)) return newValue.map((value,i) => {
    const match = plain(value) && (value.id || value.key) ? oldValue.find(x => plain(x) && (x.id || x.key)===(value.id || value.key)) : oldValue[i];
    return preserveFields(match,value);
  });
  return newValue;
}
export function relativePath(src) {
  if (typeof src !== 'string' || !src || src.includes('\\') || src.includes('\0') || src.includes(':') || src.startsWith('/') || src.split('/').some(s => !s || s === '.' || s === '..')) fail(400, 'PATH_ESCAPE', 'Use a document-relative path without traversal.');
  return src;
}
export function figureRefs(document) {
  const refs = [];
  const blocks = (items, at) => {
    if (!Array.isArray(items)) return;
    items.forEach((b, i) => {
      if (!plain(b)) return;
      const p = `${at}[${i}]`;
      if (b.type === 'figure') refs.push({ path: p, ...b });
      if (b.type === 'steps' && Array.isArray(b.items)) b.items.forEach((s, j) => { if (s?.figure) refs.push({ path: `${p}.items[${j}].figure`, ...s.figure }); });
      if (b.type === 'columns') { if (b.figure) refs.push({ path: `${p}.figure`, ...b.figure }); blocks(b.blocks, `${p}.blocks`); }
    });
  };
  if (document?.cover?.logo) refs.push({ path: 'cover.logo', ...document.cover.logo });
  blocks(document?.cover?.blocks, 'cover.blocks');
  if (Array.isArray(document?.pages)) document.pages.forEach((p, i) => blocks(p?.blocks, `pages[${i}].blocks`));
  return refs;
}

export function imageDimensions(bytes, extension) {
  const mime = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'}[extension];
  if (!mime) fail(422,'ASSET_TYPE','Unsupported image type.');
  if (extension === '.svg') {
    const text = bytes.toString('utf8');
    if (/<!DOCTYPE|<script\b|<foreignObject\b|\bon\w+\s*=|(?:href|src)\s*=\s*["']\s*(?!#)[^"']+/i.test(text) || /url\(\s*(?!#)[^)]*\)/i.test(text)) fail(422,'UNSAFE_SVG','SVG must be self-contained without executable or external content.');
    try { return intrinsicDimensions(bytes,mime); }
    catch (e) {
      // A normal vector can have a viewBox without an intrinsic pixel viewport.
      // Keep it usable without crop; A's crop validator still rejects missing intrinsic dimensions.
      const box=text.match(/<svg\b[^>]*\bviewBox\s*=\s*["']([^"']+)["']/i)?.[1]?.trim().split(/[\s,]+/).map(Number);
      if (box?.length===4 && box.every(Number.isFinite) && box[2]>0 && box[3]>0) return {width:null,height:null,viewBox:box};
      fail(422,'INVALID_IMAGE',e.message);
    }
  }
  try { return intrinsicDimensions(bytes,mime); } catch(e) { fail(422,'INVALID_IMAGE',e.message); }
}

export async function createStore({ root, validateAssets, checkpoint = async () => {} }) {
  root = await fs.realpath(root);
  if (!(await fs.stat(root)).isDirectory()) fail(400, 'ROOT', 'Select a document directory.');
  let queue = Promise.resolve();
  const locked = work => { const next = queue.then(work); queue = next.catch(() => {}); return next; };
  async function resolve(src, { missing = false } = {}) {
    relativePath(src);
    const target = path.resolve(root, ...src.split('/'));
    const rel = path.relative(root, target);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) fail(400, 'PATH_ESCAPE', 'Path leaves document root.');
    let current = root;
    for (const part of rel.split(path.sep)) {
      current = path.join(current, part);
      try { if ((await fs.lstat(current)).isSymbolicLink()) fail(400, 'SYMLINK', 'Symlink paths are not allowed.'); }
      catch (e) { if (e.code !== 'ENOENT' || !missing) throw e; }
    }
    return target;
  }
  async function read(src) { try { return await fs.readFile(await resolve(src)); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }
  async function atomic(src, bytes) {
    const target = await resolve(src, { missing: true });
    await fs.mkdir(path.dirname(target), { recursive: true });
    const tmp = `${src}.${randomUUID()}.tmp`;
    const handle = await fs.open(await resolve(tmp, { missing: true }), 'wx', 0o600);
    try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
    await fs.rename(await resolve(tmp), await resolve(src, { missing: true }));
  }
  async function assetFiles() {
    const found = [];
    async function walk(src) {
      let entries;
      try { entries = await fs.readdir(await resolve(src), { withFileTypes: true }); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
      for (const entry of entries.sort((a,b) => a.name.localeCompare(b.name))) {
        const child = `${src}/${entry.name}`;
        if (entry.isSymbolicLink()) fail(400, 'SYMLINK', 'Asset symlinks are not allowed.');
        if (entry.isDirectory()) await walk(child);
        else if (entry.isFile()) found.push(child);
      }
    }
    await walk('assets');
    return found;
  }
  async function snapshot() {
    const bytes = {}, digests = {};
    for (const name of files) { bytes[name] = await read(name); digests[name] = bytes[name] === null ? null : sha(bytes[name]); }
    const document = parse(bytes['manual.json'], 'manual.json');
    const assets = new Map();
    for (const src of [...await assetFiles(), ...figureRefs(document).map(f => f.src).filter(s => s !== themeLogo)]) {
      if (assets.has(src)) continue;
      try { const b = await read(src); assets.set(src, b); digests[`asset:${src}`] = b === null ? null : sha(b); }
      catch (e) { if (e instanceof HostError || e.code === 'ENOENT') { digests[`asset:${src}`] = `error:${e.code}`; assets.set(src, null); } else throw e; }
    }
    return { bytes, document, digests, assets, revision: sha(Buffer.from(JSON.stringify(digests))) };
  }
  function parse(bytes, name) {
    if (bytes === null) return null;
    try { return JSON.parse(bytes.toString('utf8')); } catch { fail(422, 'INVALID_JSON', `${name} is not valid JSON. Original bytes were not changed.`); }
  }
  async function validate(document) {
    const errors = [], assets = [];
    try { validateDocument(document); } catch (e) { errors.push({ path: 'document', code: 'SCHEMA', message: e.message }); }
    if (document?.cover?.sectionTitle !== undefined && (typeof document.cover.sectionTitle !== 'string' || !document.cover.sectionTitle.trim())) errors.push({ path: 'cover.sectionTitle', code: 'SCHEMA', message: 'Nonempty section title required.' });
    for (const f of figureRefs(document)) {
      if (f.src === themeLogo) continue;
      try {
        const absolutePath = await resolve(f.src);
        const bytes = await fs.readFile(absolutePath);
        if (bytes.length > 20 * 1024 * 1024) fail(422, 'ASSET_SIZE', 'Image exceeds 20 MiB.');
        const extension = path.extname(f.src).toLowerCase();
        const mime = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'}[extension];
        const dimensions = imageDimensions(bytes, extension);
        try { validateCropSource(f.crop,bytes,mime,`${f.path}.crop`); }
        catch (e) { errors.push({path:`${f.path}.crop`,code:'CROP_SOURCE',message:e.message}); }
        assets.push({ path: f.path, src: f.src, absolutePath, bytes, sha256: sha(bytes), dimensions });
      } catch (e) { errors.push({ path: `${f.path}.src`, code: e.code === 'ENOENT' ? 'MISSING_ASSET' : e.code || 'ASSET', message: e.code === 'ENOENT' ? 'Original asset is missing; select the correct local image.' : e.message }); }
    }
    if (validateAssets) errors.push(...await validateAssets({ document, assets, resolveAsset: resolve }));
    return { valid: errors.length === 0, errors, assets: assets.map(({ bytes, absolutePath, ...a }) => a) };
  }
  async function generation(id, bytes) {
    const hashes = {};
    for (const name of files) {
      hashes[name] = bytes[name] === null ? null : sha(bytes[name]);
      if (bytes[name] !== null) await atomic(`.editor/generations/${id}/${name}`, bytes[name]);
    }
    await atomic(`.editor/generations/${id}/manifest.json`, jsonBytes({ id, hashes }));
    return { id, hashes };
  }
  async function recover() {
    const journalBytes = await read('.editor/transaction.json');
    if (!journalBytes) return null;
    const journal = parse(journalBytes, 'transaction');
    if (!/^[\w-]+$/.test(journal.next?.id) || !/^[\w-]+$/.test(journal.previous?.id)) fail(409, 'RECOVERY_CORRUPT', 'Save journal is invalid; retain files for recovery.');
    let nextValid = true;
    for (const name of files) {
      const b = await read(`.editor/generations/${journal.next.id}/${name}`);
      if ((b === null ? null : sha(b)) !== journal.next.hashes[name]) nextValid = false;
      const disk = await read(name), digest = disk === null ? null : sha(disk);
      if (digest !== journal.previous.hashes[name] && digest !== journal.next.hashes[name]) fail(409, 'RECOVERY_CONFLICT', `External change to ${name}; automatic recovery refused.`);
    }
    const target = nextValid ? journal.next : journal.previous;
    for (const name of files) {
      const b = await read(`.editor/generations/${target.id}/${name}`);
      if ((b === null ? null : sha(b)) !== target.hashes[name]) fail(409, 'RECOVERY_CORRUPT', 'Recovery generation is damaged.');
      if (b !== null) await atomic(name, b);
      else await fs.unlink(await resolve(name, { missing: true })).catch(e => { if (e.code !== 'ENOENT') throw e; });
    }
    await atomic('.editor/last-good.json', jsonBytes(target));
    await fs.unlink(await resolve('.editor/transaction.json'));
    return { outcome: nextValid ? 'completed-prepared-save' : 'restored-previous-generation', generation: target.id };
  }
  function currentReview(document, sources, copyReview) {
    let errors;
    try { errors = copyReview ? checkCopyReview(document, copyReview) : ['No copy-review record']; } catch (e) { errors = [e.message]; }
    return { documentHash: document ? hash(document) : null, copy: { current: errors.length === 0, errors }, product: { recordedStatus: sources?.reviewStatus || 'unrecorded', current: false, reason: 'Historical owner approval is preserved; current editor revision requires explicit owner evidence.' } };
  }
  async function loadUnlocked() {
    const recovery = await recover(), snap = await snapshot();
    const sources = parse(snap.bytes['sources.json'], 'sources.json'), copyReview = parse(snap.bytes['copy-review.json'], 'copy-review.json');
    return { revision: snap.revision, document: snap.document, sources, copyReview, draft: parse(await read('.editor/draft.json'), 'draft'), validation: await validate(snap.document), review: currentReview(snap.document, sources, copyReview), recovery };
  }
  async function expected(revision) {
    await recover();
    const snap = await snapshot();
    if (revision !== snap.revision) fail(409, 'CONFLICT', 'Document or asset changed on disk. Reload before saving.', { revision: snap.revision });
    return snap;
  }
  const store = {
    root, resolve, read, atomic, validate, snapshot,
    validateDraft: input => locked(async () => {
      // Validation must never recover a prepared transaction or write any file.
      if (await read('.editor/transaction.json')) fail(409,'RECOVERY_PENDING','Reload to resolve a pending save before validating.');
      const before=await snapshot();
      if(input.expectedRevision!==before.revision) fail(409,'CONFLICT','Document or asset changed on disk. Reload before validating.',{revision:before.revision});
      const validation=await validate(input.document);
      const after=await snapshot();
      if(after.revision!==before.revision) fail(409,'CONFLICT','Document or asset changed during validation.',{revision:after.revision});
      // Draft references may include a local image not yet used by the canonical document.
      for(const asset of validation.assets) if(sha(await read(asset.src)||Buffer.alloc(0))!==asset.sha256) fail(409,'CONFLICT','Draft asset changed during validation.',{revision:after.revision});
      if(await read('.editor/transaction.json')) fail(409,'RECOVERY_PENDING','A save became pending during validation.');
      return {revision:after.revision,validation};
    }),
    load: () => locked(loadUnlocked),
    save: input => locked(async () => {
      const before = await expected(input.expectedRevision);
      const validation = await validate(input.document);
      if (!validation.valid) fail(422, 'INVALID_DOCUMENT', 'Save incomplete content as a draft.', validation.errors);
      for (const name of ['sources','copyReview']) if (Object.hasOwn(input,name) && !plain(input[name])) fail(422, 'SIDECAR', 'Sidecars must be JSON objects; omit to preserve existing bytes.');
      const bytes = { ...before.bytes, 'manual.json': jsonBytes(input.document) };
      if (Object.hasOwn(input,'sources')) bytes['sources.json'] = jsonBytes(preserveFields(parse(before.bytes['sources.json'],'sources.json'),input.sources));
      if (Object.hasOwn(input,'copyReview')) bytes['copy-review.json'] = jsonBytes(preserveFields(parse(before.bytes['copy-review.json'],'copy-review.json'),input.copyReview));
      const previous = await generation(`previous-${randomUUID()}`, before.bytes);
      const next = await generation(`saved-${randomUUID()}`, bytes);
      await checkpoint('staged');
      if ((await snapshot()).revision !== before.revision) fail(409, 'CONFLICT', 'External change while preparing save; no canonical files written.');
      await atomic('.editor/transaction.json', jsonBytes({ previous, next }));
      await checkpoint('prepared');
      for (const name of files) {
        const current = await read(name);
        if ((current === null ? null : sha(current)) !== previous.hashes[name]) fail(409, 'CONFLICT', `External change to ${name} during save; recovery retained.`);
        if (bytes[name] !== null) await atomic(name, bytes[name]);
        await checkpoint(`applied:${name}`);
      }
      await atomic('.editor/last-good.json', jsonBytes(next));
      await fs.unlink(await resolve('.editor/transaction.json'));
      return loadUnlocked();
    }),
    draft: input => locked(async () => {
      await expected(input.expectedRevision);
      if (!plain(input.document)) fail(422, 'DRAFT', 'Draft must be a JSON object.');
      await atomic('.editor/draft.json', jsonBytes({ savedAt: new Date().toISOString(), baseRevision: input.expectedRevision, document: input.document, editorState: input.editorState ?? null }));
      return { revision: input.expectedRevision, draftSaved: true, canonicalChanged: false };
    }),
    importAsset: input => locked(async () => {
      await expected(input.expectedRevision);
      if (typeof input.bytesBase64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.bytesBase64)) fail(422, 'ASSET_BYTES', 'Provide base64 image bytes.');
      const bytes = Buffer.from(input.bytesBase64,'base64');
      if (!bytes.length || bytes.length > 20*1024*1024) fail(422, 'ASSET_SIZE', 'Image must be between 1 byte and 20 MiB.');
      if (typeof input.name !== 'string' || input.name !== path.basename(input.name) || /[\\/:\0]/.test(input.name)) fail(400,'ASSET_NAME','Use a filename, not a filesystem path.');
      const ext = path.extname(input.name).toLowerCase();
      if (!['.png','.jpg','.jpeg','.webp','.svg'].includes(ext)) fail(422,'ASSET_TYPE','Unsupported image type.');
      const dimensions = imageDimensions(bytes,ext);
      const stem = path.basename(input.name,ext).replace(/[^\p{L}\p{N}_.-]/gu,'-').slice(0,80) || 'image';
      const src = `assets/${stem}-${randomUUID()}${ext}`;
      const target = await resolve(src,{missing:true}); await fs.mkdir(path.dirname(target),{recursive:true});
      const handle = await fs.open(await resolve(src,{missing:true}),'wx',0o600);
      try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
      return { src, sha256: sha(bytes), dimensions, revision: (await snapshot()).revision };
    }),
    withRevision: (revision, work) => locked(async () => work(await expected(revision)))
  };
  await resolve('.editor',{missing:true});
  return store;
}
