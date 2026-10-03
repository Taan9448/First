// GIF 프레임(2배 확대) → 1:1 도트, 배경·빛 번짐·나비 제거
const { decode } = require('./png.js'); const fs = require('fs');
const S = 2, BG = [92, 92, 92], GL = [140, 100, 255];
function glowLike(c) {
  // 회색 ↔ 붉은빛 사이 섞인 색인가
  let best = 1e9;
  for (let t = 0; t <= 1.0001; t += 0.05) { const m = BG.map((v, i) => v * (1 - t) + GL[i] * t); best = Math.min(best, Math.hypot(c[0] - m[0], c[1] - m[1], c[2] - m[2])); }
  return best < 22;
}
const frames = [];
for (let f = 1; f <= 16; f++) {
  const im = decode('../gif17/raw_' + String(f).padStart(2, '0') + '.png'), W = im.w, H = im.h;
  const at = (x, y) => { const i = (y * W + x) * 4; return [im.data[i], im.data[i + 1], im.data[i + 2]]; };
  // 격자 시작점: 짝/홀 중 색 경계가 더 많이 맞는 쪽
  let best = [0, 0], bs = -1;
  for (let ox = 0; ox < 2; ox++) for (let oy = 0; oy < 2; oy++) { let ok = 0; for (let y = oy + 200; y < 420; y += 2) for (let x = ox + 120; x < 380; x += 2) { const a = at(x, y), b = at(x + 1, y + 1); if (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) ok++; } if (ok > bs) { bs = ok; best = [ox, oy]; } }
  const gw = Math.floor((W - best[0]) / S), gh = Math.floor((H - best[1]) / S), g = [];
  for (let y = 0; y < gh; y++) { const r = []; for (let x = 0; x < gw; x++) r.push(at(best[0] + x * S, best[1] + y * S)); g.push(r); }
  // 배경·빛 번짐: 테두리에서 번지며, 회색-붉은빛 섞임 또는 밝은 살구빛 테두리
  const bg = g.map((r) => r.map(() => false)), q = [];
  const isOut = (c) => glowLike(c) || (c[0] > 225 && c[1] > 140 && c[1] < 222 && c[2] > 100 && c[2] < 185 && c[0] - c[2] > 60);
  for (let x = 0; x < gw; x++) q.push([x, 0], [x, gh - 1]); for (let y = 0; y < gh; y++) q.push([0, y], [gw - 1, y]);
  while (q.length) { const [x, y] = q.pop(); if (x < 0 || y < 0 || x >= gw || y >= gh || bg[y][x]) continue; if (!isOut(g[y][x])) continue; bg[y][x] = true; q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
  // 남은 덩어리 중 가장 큰 것(몸)만
  const lab = g.map((r) => r.map(() => 0)); let n = 0, sizes = [0];
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { if (bg[y][x] || lab[y][x]) continue; n++; let sz = 0; const st = [[x, y]]; while (st.length) { const [a, b] = st.pop(); if (a < 0 || b < 0 || a >= gw || b >= gh || bg[b][a] || lab[b][a]) continue; lab[b][a] = n; sz++; st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); } sizes.push(sz); }
  const main = sizes.indexOf(Math.max(...sizes));
  const px = g.map((r, y) => r.map((c, x) => (lab[y][x] === main ? '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('') : null)));
  frames.push(px);
}
// 모든 프레임 공통 상자로 자르기
let x0 = 1e9, x1 = 0, y0 = 1e9, y1 = 0;
frames.forEach((g) => g.forEach((r, y) => r.forEach((c, x) => { if (c) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } })));
const out = frames.map((g) => g.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1)));
fs.writeFileSync('g17_frames.json', JSON.stringify({ w: x1 - x0 + 1, h: y1 - y0 + 1, frames: out }));
const cols = new Set(); out.forEach((g) => g.forEach((r) => r.forEach((c) => c && cols.add(c))));
console.log('size', x1 - x0 + 1, y1 - y0 + 1, 'colors', cols.size);
const P = require('./pngout.js'), w = x1 - x0 + 1, h = y1 - y0 + 1;
P.save('../gif17/traced.png', (w + 2) * 8, (h + 2) * 2, (X, Y) => { const k = Math.floor(Y / (h + 2)) * 8 + Math.floor(X / (w + 2)), xx = X % (w + 2), yy = Y % (h + 2); if (k > 15 || xx >= w || yy >= h) return [255, 255, 255, 255]; const c = out[k][yy][xx]; if (!c) return [92, 92, 92, 255]; const v = parseInt(c.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255, 255]; }, 3);
