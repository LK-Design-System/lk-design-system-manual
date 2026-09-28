export function validateDocument(doc) {
  const fail = (at, message) => { throw new Error(`${at}: ${message}`); };
  const text = (s, at) => { if (typeof s !== 'string' || !s.trim()) fail(at, 'nonempty text required'); };
  const array = (a, at) => { if (!Array.isArray(a) || !a.length) fail(at, 'nonempty array required'); };
  const figure = (f, at) => {
    if (!f || typeof f !== 'object') fail(at, 'figure required');
    text(f.src, `${at}.src`); text(f.alt, `${at}.alt`); text(f.caption, `${at}.caption`);
    if (f.size && !['full', 'reading', 'compact'].includes(f.size)) fail(at, 'unknown figure size');
    if (f.previewTitle !== undefined) text(f.previewTitle, `${at}.previewTitle`);
    if (f.crop !== undefined) {
      const c = f.crop;
      if (!c || typeof c !== 'object') fail(at, 'crop object required');
      for (const key of ['x', 'y', 'width', 'height', 'sourceWidth', 'sourceHeight']) {
        if (!Number.isFinite(c[key]) || (['x', 'y'].includes(key) ? c[key] < 0 : c[key] <= 0)) fail(at, `invalid crop.${key}`);
      }
      if (c.x + c.width > c.sourceWidth || c.y + c.height > c.sourceHeight) fail(at, 'crop exceeds source bounds');
    }
  };
  function blocks(items, at, depth = 0) {
    array(items, at);
    items.forEach((b, i) => {
      const p = `${at}[${i}]`;
      if (!b || typeof b !== 'object') fail(p, 'block object required');
      switch (b.type) {
        case 'address': text(b.value, p); break;
        case 'quote': case 'paragraph': case 'subheading': text(b.text, p); break;
        case 'list':
          array(b.items, p); b.items.forEach((s,j)=>{
            const at=`${p}.items[${j}]`;
            if(typeof s==='string') text(s,at);
            else if(s && typeof s==='object') { text(s.label,at);text(s.value,at);if(s.labelEmphasis!==undefined && typeof s.labelEmphasis!=='boolean') fail(at,'labelEmphasis must be boolean');if(s.emphasis!==undefined && typeof s.emphasis!=='boolean') fail(at,'emphasis must be boolean'); }
            else fail(at,'text or labeled value required');
          }); break;
        case 'help': case 'callout':
          text(b.title, `${p}.title`); text(b.text, `${p}.text`);
          if (b.tone && !['signal','positive','cautionary','negative','offline'].includes(b.tone)) fail(p, 'unknown tone');
          break;
        case 'figure': figure(b, p); break;
        case 'steps':
          if (b.start !== undefined && (!Number.isInteger(b.start) || b.start < 1)) fail(p, 'start must be a positive integer');
          array(b.items, p); b.items.forEach((s,j)=> { const q=`${p}.items[${j}]`; text(s.title,q); if(s.text !== undefined) text(s.text,q); if(s.quote !== undefined) text(s.quote,`${q}.quote`); if(s.figure) figure(s.figure,q); }); break;
        case 'table':
          text(b.label, `${p}.label`); array(b.headers,p); b.headers.forEach(s=>text(s,p)); array(b.rows,p);
          b.rows.forEach(row=>{if(!Array.isArray(row)||row.length!==b.headers.length) fail(p,'table row width mismatch');row.forEach(s=>text(s,p));}); break;
        case 'columns':
          if(depth) fail(p,'nested columns are not supported'); figure(b.figure,p); blocks(b.blocks,`${p}.blocks`,depth+1); break;
        default: fail(p,`unknown block type ${b.type}`);
      }
    });
  }
  if (!doc || doc.schemaVersion !== 1) fail('document','schemaVersion must be 1');
  text(doc.title,'document.title');
  if(doc.lang !== undefined) text(doc.lang,'document.lang');
  if(doc.cover) {
    text(doc.cover.title,'cover.title');array(doc.cover.metadata,'cover.metadata');
    doc.cover.metadata.forEach(m=>{text(m.label,'metadata.label');text(m.value,'metadata.value');});
    if(doc.cover.logo){text(doc.cover.logo.src,'logo.src');text(doc.cover.logo.alt,'logo.alt');}
    blocks(doc.cover.blocks,'cover.blocks');
  }
  array(doc.pages,'document.pages');
  doc.pages.forEach((p,i)=>{text(p.title,`pages[${i}].title`);if(p.lead!==undefined)text(p.lead,`pages[${i}].lead`);blocks(p.blocks,`pages[${i}].blocks`);});
  return doc;
}
