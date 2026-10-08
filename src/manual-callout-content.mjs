/** Manual callout labels; persisted tone values are unchanged. */
export const MANUAL_CALLOUT_TONE_OPTIONS = Object.freeze([
  {value: 'signal', label: '안내'},
  {value: 'positive', label: '완료'},
  {value: 'cautionary', label: '주의'},
  {value: 'negative', label: '경고'},
  {value: 'offline', label: '참고'},
].map(Object.freeze));

const visibleText = text => typeof text === 'string' && /\S/u.test(text);
const visibleRun = run => run?.type === 'text' && visibleText(run.text);

/**
 * Read visible title content without normalizing or modifying authored data.
 * Accepts a string, DTO inline array, or a ProseMirror calloutTitle Node/Fragment.
 * Hard breaks, marks alone, and unrecognized objects do not supply title text.
 */
export function hasVisibleManualCalloutTitle(title) {
  if (typeof title === 'string') return visibleText(title);
  if (Array.isArray(title)) return title.some(visibleRun);
  if (!title || typeof title !== 'object') return false;
  let value = title;
  if (typeof title.toJSON === 'function') {
    try { value = title.toJSON(); } catch { return false; }
  }
  if (Array.isArray(value)) return value.some(visibleRun);
  if (value?.type === 'calloutTitle' && Array.isArray(value.content)) {
    return value.content.some(visibleRun);
  }
  return visibleRun(value);
}
