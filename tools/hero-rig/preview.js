const Rig = require('./rig.js'), H = require('./harin.js'), P = require('./pngout.js');
const W = 96, Hh = 72, sc = +process.argv[2] || 3;
const rows = ['idle', 'attack', 'skill'].filter((k) => H.ANIM[k]);
const frames = rows.map((k) => H.ANIM[k].map((p, i) => Rig.render(W, Hh, H.shapes(p, i / H.ANIM[k].length))));
const cols = Math.max(...frames.map((f) => f.length));
P.save('sheet.png', (W + 1) * cols, (Hh + 1) * rows.length, (X, Y) => { const r = Math.floor(Y / (Hh + 1)), c = Math.floor(X / (W + 1)), x = X % (W + 1), y = Y % (Hh + 1); if (x >= W || y >= Hh || !frames[r][c]) return [40, 40, 40, 255]; const v = frames[r][c][y * W + x]; if (!v) return [92, 92, 92, 255]; const n = parseInt(v.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255, 255]; }, sc);
console.log('ok');
