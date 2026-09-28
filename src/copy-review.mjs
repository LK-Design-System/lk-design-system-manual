import { createHash } from 'node:crypto';

export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function copySets(doc) {
  const collect = (value, key, out = []) => {
    if (typeof value === 'string') out.push({ key, text: value });
    else if (Array.isArray(value)) value.forEach((v, i) => collect(v, `${key}[${i}]`, out));
    else if (value && typeof value === 'object') Object.keys(value).sort().forEach(k => {
      if (!['type', 'src', 'size', 'tone', 'lang'].includes(k)) collect(value[k], `${key}.${k}`, out);
    });
    return out;
  };
  return [
    { id: 'document', items: collect({ title: doc.title }, 'document') },
    ...(doc.cover ? [{ id: 'cover', items: collect(doc.cover, 'cover') }] : []),
    ...doc.pages.map((p, i) => ({ id: `pages[${i}]`, items: collect(p, `pages[${i}]`) }))
  ].map(s => ({ ...s, candidateHash: hash(s.items) }));
}
export function checkCopyReview(doc, review) {
  const errors = [];
  const nonempty = s => typeof s === 'string' && s.trim().length > 0;
  if (review.schemaVersion !== 1 || review.contract !== 'lds-manual-copy-review/v1') errors.push('Unsupported review format');
  for (const k of ['reviewer', 'reviewedAt', 'ruleset', 'audience']) if (!nonempty(review[k])) errors.push(`Missing ${k}`);
  if (review.reviewKind !== 'contextual-agent-review' && review.reviewKind !== 'human-review') errors.push('Contextual reviewer required');
  if (review.documentHash !== hash(doc)) errors.push('Document changed since review');
  const expected = copySets(doc), actual = review.sets || [];
  if (actual.length !== expected.length) errors.push('Copy set count mismatch');
  expected.forEach((s, i) => {
    const r = actual[i];
    if (!r || r.id !== s.id) { errors.push(`Missing/ordered set ${s.id}`); return; }
    if (!nonempty(r.task) || !nonempty(r.contextReason)) errors.push(`${s.id}: missing task/context reasoning`);
    if (r.candidateHash !== s.candidateHash) errors.push(`${s.id}: stale text`);
    if (!Array.isArray(r.sourceItems) || r.sourceHash !== hash(r.sourceItems)) errors.push(`${s.id}: invalid source snapshot`);
    const decisions = r.decisions || [];
    if (decisions.length !== s.items.length) errors.push(`${s.id}: missing/extra decisions`);
    s.items.forEach((item, j) => {
      const d = decisions[j];
      if (!d || d.key !== item.key || d.text !== item.text || !nonempty(d.reason)) { errors.push(`${item.key}: missing/mismatched decision`); return; }
      if (!['KEEP', 'REVISE'].includes(d.verdict)) errors.push(`${item.key}: pending or blocked`);
      const old = r.sourceItems?.find(x => x.key === item.key)?.text;
      if (d.verdict === 'KEEP' && old !== item.text) errors.push(`${item.key}: changed text marked KEEP`);
      if (d.verdict === 'REVISE' && old === item.text) errors.push(`${item.key}: unchanged text marked REVISE`);
    });
  });
  return errors;
}
