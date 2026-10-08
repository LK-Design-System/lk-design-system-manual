import {manualFigureWidthStyle,manualFigureAlignmentStyle} from './manual-figure-style.mjs';
// The adapter receives the upstream peers; Callout is never reimplemented here.
export function createManualComponents(React, Callout, Blockquote) {
  const h = React.createElement;
  function ManualFigure({ src, alt, caption, size = 'full', previewTitle, crop, widthPx, alignment = 'center' }) {
    const media = crop
      ? h('svg', { role: 'img', 'aria-label': alt, viewBox: `${crop.x} ${crop.y} ${crop.width} ${crop.height}` },
        h('image', { href: src, width: crop.sourceWidth, height: crop.sourceHeight }))
      : h('img', { src, alt });
    return h('figure', { className: `lds-manual-figure lds-manual-figure--${size}`, style: { ...manualFigureWidthStyle(widthPx), ...manualFigureAlignmentStyle(alignment) } },
      previewTitle ? h('div', { className: 'lds-manual-document-preview' },
        h('p', { className: 'lds-manual-document-preview-label' }, previewTitle), media) : media,
      caption && h('figcaption', null, caption));
  }
  function ManualTable({ headers, rows, label = '안내 표' }) {
    return h('div', { className: 'lds-manual-table-frame' }, h('table', { 'aria-label': label },
      h('thead', null, h('tr', null, headers.map((text, i) => h('th', { key: i, scope: 'col' }, text)))),
      h('tbody', null, rows.map((row, i) => h('tr', { key: i }, row.map((text, j) => h('td', { key: j }, text)))))));
  }
  function ManualMetadata({ items, rowMinHeightsPx }) {
    const id = React.useId();
    const rows = [];
    for (let i = 0; i < items.length; i += 2) {
      const pair = items.slice(i, i + 2);
      const minimum = rowMinHeightsPx?.[i / 2];
      rows.push(h('tr', { key: i, ...(Number.isFinite(minimum) && minimum >= 0 ? { style: { height: `${minimum}px` } } : {}) }, pair.flatMap(({ label, value }, j) => [
        h('th', { key: `label-${j}`, id: `${id}-${i+j}` }, label),
        h('td', { key: `value-${j}`, headers: `${id}-${i+j}`, colSpan: pair.length === 1 ? 3 : 1 }, value)
      ])));
    }
    return h('div', { className: 'lds-manual-table-frame lds-manual-meta' },
      h('table', { 'aria-label': '문서 정보' }, h('tbody', null, rows)));
  }
  function ManualAddress({ value }) {
    return h('p', { className: 'lds-manual-address' }, h('strong', null, value));
  }
  function ManualCallout({ title, text, tone = 'signal' }) {
    const visibleTitle = typeof title === 'string' && !title.trim() ? undefined : title;
    return h('div', { className: 'lds-manual-callout' },
      h(Callout, { title: visibleTitle, tone, variant: 'bordered', radius: 'body', density: 'compact', headingLevel: 3 }, text));
  }
  function ManualQuote({ text }) {
    if (!Blockquote) throw new Error('ManualQuote requires LDS Core Blockquote.');
    return h('div', { className: 'lds-manual-quote' },
      h(Blockquote, { radius: 'body', style: { border: '1px solid var(--color-semantic-line-solid-normal)', padding: 'calc(var(--space-3) - 1px) calc(var(--space-4) - 1px)' } }, text.split(/\n+/).map((line, i) => h('p', { key: i, className: 'lds-manual-quote-text' }, line))));
  }
  function ManualSteps({ items, start = 1 }) {
    return h('ol', { className: 'lds-manual-steps', start }, items.map((item, i) =>
      h('li', { key: i, className: 'lds-manual-step' },
        h('div', { className: 'lds-manual-step-label' },
          h('span', { 'aria-hidden': true }, `${start + i}.`),
          h('div', null, h('h3', null, item.title), item.text && h('p', null, item.text))),
        item.quote && h(ManualQuote, { text: item.quote }),
        item.figure && h(ManualFigure, item.figure))));
  }
  function ManualSectionTitle({ children }) { return h('h2', { className: 'lds-manual-section-title' }, children); }
  function ManualDivider({ id, cover = false, variant = cover ? 'emphasis' : 'default' } = {}) {
    return h('hr', { ...(id ? { id, 'data-manual-id': id } : {}), ...(cover ? { 'data-manual-cover-role': 'divider' } : {}), 'data-manual-divider-variant': variant === 'emphasis' ? 'emphasis' : 'default' });
  }
  function ManualSection({ title, lead, children }) {
    return h('div', { className: 'lds-manual-section' },
      h(ManualSectionTitle, null, title),
      h('div', { className: 'lds-manual-section-body' },
        lead && h('p', { className: 'lds-manual-lead' }, lead), children));
  }
  function blocks(items) {
    return items.map((block, i) => {
      const { type, ...props } = block;
      switch (type) {
        case 'quote': return h(ManualQuote, { ...props, key: i });
        case 'address': return h(ManualAddress, { ...props, key: i });
        case 'paragraph': return h('p', { key: i }, props.text);
        case 'subheading': return h('h3', { key: i, className: 'lds-manual-subheading' }, props.text);
        case 'steps': return h(ManualSteps, { ...props, key: i });
        case 'figure': return h(ManualFigure, { ...props, key: i });
        case 'table': return h(ManualTable, { ...props, key: i });
        case 'callout': return h(ManualCallout, { ...props, key: i });
        case 'list': return h('ul', { key: i }, props.items.map((item, j) => h('li', { key: j }, typeof item === 'string' ? item : [item.labelEmphasis ? h('strong', { key: 'label' }, item.label + ': ') : item.label + ': ', item.emphasis ? h('strong', { key: 'value' }, item.value) : item.value])));
        case 'help': return h(ManualCallout, { ...props, key: i }); // Legacy input alias; one presentation for supplemental guidance.
        case 'columns': return h('div', { key: i, className: 'lds-manual-columns' },
          h(ManualFigure, { ...props.figure, alignment: props.figure.alignment ?? (props.figure.size === 'compact' || props.figure.size === 'reading' ? 'center' : 'left') }), h('div', null, blocks(props.blocks)));
        default: throw new Error(`Unknown manual block: ${type}`);
      }
    });
  }
  function ManualPage({ title, lead, children, number, total, cover = false, ordered = false }) {
    return h('section', { className: `lds-manual-page${cover ? ' lds-manual-cover' : ''}`, 'data-manual-page': number },
      h('div', { className: 'lds-manual-content' },
        cover || ordered ? children : h(ManualSection, { title, lead }, children)),
      h('footer', null, h('span', { 'aria-label': `${total}쪽 중 ${number}쪽` }, `${String(number).padStart(2, '0')} / ${String(total).padStart(2, '0')}`)));
  }
  function ManualCover({ cover, number, total, titleId, logoWidthPx, ordered = false, children }) {
    if (ordered) return h(ManualPage, { cover: true, number, total }, children);
    return h(ManualPage, { cover: true, number, total },
      cover.logo && h('img', { className: 'lds-manual-logo', src: cover.logo.src, alt: cover.logo.alt, ...(manualFigureWidthStyle(logoWidthPx) ? { style: manualFigureWidthStyle(logoWidthPx) } : {}) }),
      h('h1', { id: titleId }, cover.title), h(ManualMetadata, { items: cover.metadata }), h(ManualDivider, { cover: true }),
      h(ManualSection, { title: cover.sectionTitle ?? '시작하기 전에' }, blocks(cover.blocks)));
  }
  function ManualDocument({ document }) {
    const titleId = React.useId();
    const total = document.pages.length + (document.cover ? 1 : 0);
    return h('main', { className: 'lds-manual', 'data-manual-preset': 'compact', lang: document.lang || 'ko', 'aria-labelledby': titleId },
      !document.cover && h('h1', { id: titleId, style: { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap', border: 0 } }, document.title),
      document.cover && h(ManualCover, { cover: document.cover, number: 1, total, titleId }),
      document.pages.map((page, i) => h(ManualPage, { ...page, key: i, number: i + (document.cover ? 2 : 1), total }, blocks(page.blocks))));
  }
  return { ManualDocument, ManualCover, ManualPage, ManualSectionTitle, ManualDivider, ManualSteps, ManualFigure, ManualTable, ManualMetadata, ManualAddress, ManualCallout, ManualQuote };
}
