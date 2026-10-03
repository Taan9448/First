// 파편 지우기: 외곽선이 아닌 칸의 작은 덩어리를 지우고, 붙을 데가 없어진 외곽선을 지운다
const fs = require('fs'), d = JSON.parse(fs.readFileSync('g17_sprite.json')), W = d.w, H = d.h;
const OLk = Object.keys(d.pal).find((k) => d.pal[k] === '#140e10');
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], N8 = N4.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
d.frames = d.frames.map((rows) => {
  const g = rows.map((r) => [...r]);
  const lab = g.map((r) => r.map(() => 0)); let id = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (g[y][x] === '.' || g[y][x] === OLk || lab[y][x]) continue; id++; const st = [[x, y]], cells = []; while (st.length) { const [a, b] = st.pop(); if (a < 0 || b < 0 || a >= W || b >= H || g[b][a] === '.' || g[b][a] === OLk || lab[b][a]) continue; lab[b][a] = id; cells.push([a, b]); N4.forEach(([dx, dy]) => st.push([a + dx, b + dy])); } if (cells.length < 18) cells.forEach(([a, b]) => { g[b][a] = '.'; }); }
  for (let pass = 0; pass < 3; pass++) { const kill = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === OLk && !N8.some(([dx, dy]) => { const c = g[y + dy] && g[y + dy][x + dx]; return c && c !== '.' && c !== OLk; })) kill.push([x, y]); kill.forEach(([x, y]) => { g[y][x] = '.'; }); }
  return g.map((r) => r.join(''));
});
fs.writeFileSync('g17_sprite.json', JSON.stringify(d));
const P = require('./pngout.js');
P.save('../gif17/fixed.png', (W + 2) * 8, (H + 2) * 2, (X, Y) => { const k = Math.floor(Y / (H + 2)) * 8 + Math.floor(X / (W + 2)), xx = X % (W + 2), yy = Y % (H + 2); if (xx >= W || yy >= H) return [255, 255, 255, 255]; const c = d.frames[k][yy][xx]; if (c === '.') return [92, 92, 92, 255]; const v = parseInt(d.pal[c].slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255, 255]; }, 3);
console.log(Object.entries(d.pal).map(([k, v]) => k + v).join(' '));
