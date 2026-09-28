#!/usr/bin/env node
import fs from 'node:fs/promises';
import { checkCopyReview } from '../src/copy-review.mjs';
import { validateDocument } from '../src/validate.mjs';
try {
  const [documentPath, reviewPath] = process.argv.slice(2);
  if (!documentPath || !reviewPath) throw new Error('Usage: node scripts/check-copy-review.mjs document.json copy-review.json');
  const doc = validateDocument(JSON.parse(await fs.readFile(documentPath, 'utf8')));
  const review = JSON.parse(await fs.readFile(reviewPath, 'utf8'));
  const errors = checkCopyReview(doc, review);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PASS: all current copy has contextual review records. This verifies coverage/freshness, not language quality or product approval.');
} catch (e) { console.error(e.message); process.exitCode = 1; }
