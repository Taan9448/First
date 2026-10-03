const fs = require('fs'), zlib = require('zlib');
function png(w, h, rgba) {
  const t = []; for (let n = 0; n < 256; n++) { let x = n; for (let k = 0; k < 8; k++) x = x & 1 ? 0xedb88320 ^ (x >>> 1) : x >>> 1; t[n] = x >>> 0; }
  const crc = (b) => { let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
exports.png = png;
exports.save = (file, w, h, fn, sc) => { const o = Buffer.alloc(w * sc * h * sc * 4); for (let y = 0; y < h * sc; y++) for (let x = 0; x < w * sc; x++) { const c = fn(Math.floor(x / sc), Math.floor(y / sc)); o.set(c, (y * w * sc + x) * 4); } fs.writeFileSync(file, png(w * sc, h * sc, o)); };
