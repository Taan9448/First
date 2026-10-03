// 시트 데이터: 글자 격자 + 팔레트
const Rig = require('./rig.js'), H = require('./harin.js'), fs = require('fs');
const W = 96, Hh = 72, AL = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+-=?@^_~', cols = {}; let n = 0;
const anims = {};
Object.keys(H.ANIM).forEach((k) => { anims[k] = H.ANIM[k].map((p, i) => { const f = Rig.render(W, Hh, H.shapes(p, i / H.ANIM[k].length)); const rows = []; for (let y = 0; y < Hh; y++) { let r = ''; for (let x = 0; x < W; x++) { const c = f[y * W + x]; if (!c) { r += '.'; continue; } if (!(c in cols)) cols[c] = AL[n++]; r += cols[c]; } rows.push(r); } return rows; }); });
const pal = {}; Object.keys(cols).forEach((c) => { pal[cols[c]] = c; });
fs.writeFileSync('harin_data.json', JSON.stringify({ w: W, h: Hh, pal, anims }));
console.log('colors', n);
