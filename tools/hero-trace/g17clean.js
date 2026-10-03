const fs = require('fs');
const D = JSON.parse(fs.readFileSync('g17_frames.json')), W = D.w, H = D.h;
const rgb = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const lum = (c) => { const [r, g, b] = rgb(c); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// 1) 바깥에서 번지며 걷는다: 빛 번짐(회색-붉은 섞임)과 붉은·주황 계열만 지나가고, 어두운 외곽선·머리·살빛에서 멈춘다
const glowish = (c) => { const [r, g, b] = rgb(c); const L = lum(c); if (L < 0.13) return false; return (b - g > 35 && b > 110 && b - r > 10) || (Math.abs(r - g) < 14 && Math.abs(g - b) < 14 && L > 0.3 && L < 0.42); };
const frames = D.frames.map((g) => {
  const out = g.map((r) => r.slice()), seen = g.map((r) => r.map(() => false)), q = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!g[y][x]) q.push([x, y]);
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of N4) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H || seen[yy][xx]) continue; const c = out[yy][xx]; if (!c || !glowish(c)) continue; seen[yy][xx] = true; out[yy][xx] = null; q.push([xx, yy]); }
  }
  // 작은 조각(나비 잔재) 지우기: 10칸 미만 덩어리
  const lab = out.map((r) => r.map(() => 0)); let id = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!out[y][x] || lab[y][x]) continue; id++; const st = [[x, y]], cells = []; while (st.length) { const [a, b] = st.pop(); if (a < 0 || b < 0 || a >= W || b >= H || !out[b][a] || lab[b][a]) continue; lab[b][a] = id; cells.push([a, b]); st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); } if (cells.length < 40) cells.forEach(([a, b]) => { out[b][a] = null; }); }
  return out;
});
// 2) 공통 팔레트(k-평균 32색), 어두운 외곽선은 한 색으로
const pts = []; frames.forEach((g) => g.forEach((r) => r.forEach((c) => { if (c && lum(c) >= 0.13) pts.push(rgb(c)); })));
pts.sort((a, b) => a[0] + a[1] + a[2] - b[0] - b[1] - b[2]);
const K = 30; let cent = []; for (let k = 0; k < K; k++) cent.push(pts[Math.floor((k + 0.5) / K * pts.length)].slice());
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
for (let it = 0; it < 25; it++) { const sum = cent.map(() => [0, 0, 0, 0]); pts.forEach((c) => { let bi = 0, bd = 1e9; cent.forEach((m, k) => { const d = d2(c, m); if (d < bd) { bd = d; bi = k; } }); sum[bi][0] += c[0]; sum[bi][1] += c[1]; sum[bi][2] += c[2]; sum[bi][3]++; }); cent = cent.map((m, k) => (sum[k][3] ? sum[k].slice(0, 3).map((v) => v / sum[k][3]) : m)); }
const hex = (a) => '#' + a.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const near = (c) => { let bi = 0, bd = 1e9; cent.forEach((m, k) => { const d = d2(c, m); if (d < bd) { bd = d; bi = k; } }); return hex(cent[bi]); };
const OLC = '#140e10';
let clean = frames.map((g) => g.map((r) => r.map((c) => (!c ? null : lum(c) < 0.13 ? OLC : near(rgb(c))))));
// 외곽선 닫기: 칠한 칸이 빈칸과 맞닿으면 그 빈칸을 외곽선으로
clean = clean.map((g) => { const o = g.map((r) => r.slice()); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!g[y][x] && N4.some(([dx, dy]) => { const c = g[y + dy] && g[y + dy][x + dx]; return c && c !== OLC; })) o[y][x] = OLC; return o; });
// 3) 글자 격자로
const AL = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; const cols = {}; let n = 0;
const rows = clean.map((g) => g.map((r) => r.map((c) => { if (!c) return '.'; if (!(c in cols)) cols[c] = AL[n++]; return cols[c]; }).join('')));
const pal = {}; Object.keys(cols).forEach((c) => { pal[cols[c]] = c; });
fs.writeFileSync('g17_sprite.json', JSON.stringify({ w: W, h: H, pal, frames: rows }));
console.log('colors', n);
const P = require('./pngout.js');
P.save('../gif17/clean.png', (W + 2) * 8, (H + 2) * 2, (X, Y) => { const k = Math.floor(Y / (H + 2)) * 8 + Math.floor(X / (W + 2)), xx = X % (W + 2), yy = Y % (H + 2); if (k > 15 || xx >= W || yy >= H) return [255, 255, 255, 255]; const c = clean[k][yy][xx]; if (!c) return [92, 92, 92, 255]; return rgb(c).concat(255); }, 3);
