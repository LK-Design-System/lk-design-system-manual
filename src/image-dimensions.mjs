// Browser-decoded intrinsic CSS pixel coordinates; never rewrite crops or bytes.
function exifOrientation(bytes, start, end) {
  if (bytes.toString('ascii', start, start+6) !== 'Exif\0\0') return 1;
  const tiff = start+6;
  if (tiff+8 > end) return 1;
  const order = bytes.toString('ascii',tiff,tiff+2);
  if (!['II','MM'].includes(order)) return 1;
  const u16 = at => order==='II'?bytes.readUInt16LE(at):bytes.readUInt16BE(at);
  const u32 = at => order==='II'?bytes.readUInt32LE(at):bytes.readUInt32BE(at);
  if (u16(tiff+2)!==42) return 1;
  const ifd = tiff+u32(tiff+4);
  if (ifd<tiff+8 || ifd+2>end) return 1;
  const count=u16(ifd);
  for (let p=ifd+2; p+12<=end && p<ifd+2+count*12; p+=12) {
    if (u16(p)===0x112 && u16(p+2)===3 && u32(p+4)===1) {
      const value=u16(p+8);return value>=1&&value<=8?value:1;
    }
  }
  return 1;
}
export function imageDimensions(bytes, mime) {
  let width, height;
  if (mime === 'image/png' && bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.toString('ascii',12,16) === 'IHDR') {
    width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20);
  } else if (mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) {
    let orientation=1;
    const frames = new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
    for (let p = 2; p < bytes.length;) {
      if (bytes[p++] !== 255) break;
      while (bytes[p] === 255) p++;
      const marker = bytes[p++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (p + 2 > bytes.length) break;
      const length = bytes.readUInt16BE(p);
      if (length < 2 || p + length > bytes.length) break;
      if (marker===0xe1) orientation=exifOrientation(bytes,p+2,p+length);
      if (frames.has(marker) && length >= 8) { height = bytes.readUInt16BE(p+3); width = bytes.readUInt16BE(p+5); }
      p += length;
    }
    if (orientation>=5) [width,height]=[height,width];
  } else if (mime === 'image/webp' && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP') {
    for (let p = 12; p + 8 <= bytes.length;) {
      const tag = bytes.toString('ascii',p,p+4), length = bytes.readUInt32LE(p+4), data = p+8;
      if (data + length > bytes.length) break;
      if (tag === 'VP8X' && length >= 10) { width = bytes.readUIntLE(data+4,3)+1; height = bytes.readUIntLE(data+7,3)+1; break; }
      if (tag === 'VP8L' && length >= 5 && bytes[data] === 0x2f) { const bits = bytes.readUInt32LE(data+1); width = (bits & 0x3fff)+1; height = ((bits >>> 14)&0x3fff)+1; break; }
      if (tag === 'VP8 ' && length >= 10 && bytes.toString('hex',data+3,data+6) === '9d012a') { width = bytes.readUInt16LE(data+6)&0x3fff; height = bytes.readUInt16LE(data+8)&0x3fff; break; }
      p = data + length + (length%2);
    }
  } else if (mime === 'image/svg+xml') {
    const source = bytes.toString('utf8').replace(/<!--[\s\S]*?-->/g, '');
    const root = source.match(/<svg\b([^>]*)>/i)?.[1];
    const attr = name => root?.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];
    const dimension = value => {
      const match = value?.trim().match(/^([\d.]+)(px|in|cm|mm|pt|pc)?$/);
      return match ? Number(match[1]) * ({px:1,in:96,cm:96/2.54,mm:96/25.4,pt:96/72,pc:16}[match[2] || 'px']) : undefined;
    };
    width = dimension(attr('width')); height = dimension(attr('height'));
    const viewBox = attr('viewBox')?.trim().split(/[\s,]+/).map(Number);
    if (viewBox?.length === 4 && viewBox.every(Number.isFinite) && viewBox[2] > 0 && viewBox[3] > 0) {
      if (width && !height && attr('height') === undefined) height = width * viewBox[3]/viewBox[2];
      if (height && !width && attr('width') === undefined) width = height * viewBox[2]/viewBox[3];
    }
    // A viewBox alone has no fixed intrinsic pixel viewport. Require explicit dimensions for crops.
    // Image.naturalWidth/Height report integer CSS pixels for physical/fractional SVG sizes.
    if (Number.isFinite(width)) width=Math.round(width);
    if (Number.isFinite(height)) height=Math.round(height);
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('Cannot determine intrinsic image dimensions for crop. Use a supported image with explicit source dimensions.');
  return { width, height };
}

export function validateCropSource(crop, bytes, mime, at) {
  if (!crop) return;
  const { width, height } = imageDimensions(bytes, mime);
  if (Math.abs(crop.sourceWidth-width) > 1e-6 || Math.abs(crop.sourceHeight-height) > 1e-6)
    throw new Error(`${at}: crop source dimensions ${crop.sourceWidth}x${crop.sourceHeight} do not match image ${width}x${height}. Recheck the original asset; coordinates were not changed.`);
}
