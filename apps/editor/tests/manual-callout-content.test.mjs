import test from 'node:test';
import assert from 'node:assert/strict';
import {manualSchema} from '../src/redesign/manual-kernel.mjs';
import {hasVisibleManualCalloutTitle, MANUAL_CALLOUT_TONE_OPTIONS} from '../../../src/manual-callout-content.mjs';

test('strings and DTO titles distinguish visible text from empty rows without rewriting marks', () => {
  for (const title of [undefined, null, '', ' \t\n\u00a0', [], [{type: 'hardBreak'}], [{type: 'text', text: ' \n'}]]) {
    assert.equal(hasVisibleManualCalloutTitle(title), false);
  }
  const title = [{type: 'hardBreak'}, {type: 'text', text: '  제목 ', marks: [{type: 'strong'}]}];
  const before = JSON.stringify(title);
  assert.equal(hasVisibleManualCalloutTitle(title), true);
  assert.equal(hasVisibleManualCalloutTitle(' 제목 '), true);
  assert.equal(JSON.stringify(title), before);
});

test('actual PM title Nodes and Fragments agree with DTO visibility and preserve authored data', () => {
  for (const [content, visible] of [
    [[], false],
    [[manualSchema.nodes.hardBreak.create()], false],
    [[manualSchema.text(' \u00a0'), manualSchema.nodes.hardBreak.create()], false],
    [[manualSchema.text('주제', [manualSchema.marks.strong.create()])], true],
  ]) {
    const title = manualSchema.nodes.calloutTitle.create(null, content);
    const before = JSON.stringify(title.toJSON());
    assert.equal(hasVisibleManualCalloutTitle(title), visible);
    assert.equal(hasVisibleManualCalloutTitle(title.content), visible);
    assert.equal(JSON.stringify(title.toJSON()), before);
  }
});

test('unknown objects, foreign container text, and failed serialization are not fabricated titles', () => {
  for (const title of [{textContent: 'foreign'}, {type: 'image', text: 'foreign'}, {type: 'paragraph', content: [{type: 'text', text: 'foreign'}]}, [{marks: [{type: 'strong'}]}], {toJSON() {throw new Error('invalid');}}]) {
    assert.equal(hasVisibleManualCalloutTitle(title), false);
  }
});

test('all five persisted tones retain their canonical labels and immutable options', () => {
  assert.deepEqual(MANUAL_CALLOUT_TONE_OPTIONS, [
    {value: 'signal', label: '안내'}, {value: 'positive', label: '완료'},
    {value: 'cautionary', label: '주의'}, {value: 'negative', label: '경고'},
    {value: 'offline', label: '참고'},
  ]);
  assert.equal(Object.isFrozen(MANUAL_CALLOUT_TONE_OPTIONS), true);
  assert.equal(MANUAL_CALLOUT_TONE_OPTIONS.every(Object.isFrozen), true);
});
