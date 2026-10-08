// Preserve empty editable slots in the renderer without changing source data.
// Validation still blocks export; these placeholders are editor-only.
export function canvasDocument(source) {
  const document = structuredClone(source);
  const slot = (object, key) => { if (object[key] === '') object[key] = '\u200b'; };
  function blocks(items) {
    for (const block of items) {
      if (['callout', 'help'].includes(block.type) && !block.title?.trim()) block.title = '제목 입력 필요';
      if (block.type === 'figure') slot(block, 'caption');
      if (block.type === 'steps') for (const item of block.items) {
        if(item.text===undefined)item.text='\u200b';else slot(item, 'text');
        if (item.figure) slot(item.figure, 'caption');
      }
      if (block.type === 'columns') { slot(block.figure, 'caption'); blocks(block.blocks); }
    }
  }
  if (document.cover) blocks(document.cover.blocks);
  for (const page of document.pages) { slot(page, 'lead'); blocks(page.blocks); }
  return document;
}
