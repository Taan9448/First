// 게임용 다섯 영웅: 올려 주신 두 GIF 몸(A 홍의 · B 흑의)에 영웅별 색 · 머리 장식 · 갑옷 색 · 무기를 입힌다
const fs = require('fs');
const A = JSON.parse(fs.readFileSync('gif_sprite.json')), B = JSON.parse(fs.readFileSync('g17_sprite.json'));
const W = 116, H = 64, OL = '#140e10';
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], N8 = N4.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
// 몸마다 손 [x, y, 무기 각도] (몸 원래 좌표)
const HAND = {
  A: [[50, 35, 62], [48, 35, 70], [56, 34, 40], [63, 33, 22], [65, 40, 10], [70, 25, -12], [22, 36, 160], [21, 37, 165], [21, 37, 170], [23, 33, 150], [21, 32, 150], [58, 45, 28], [76, 30, 0], [75, 29, 0], [75, 25, -15], [49, 34, 60]],
  B: [[14, 27, 165], [15, 27, 165], [17, 33, 150], [17, 34, 150], [16, 34, 150], [14, 35, 150], [37, 32, 20], [37, 33, 25], [35, 33, 30], [14, 36, 160], [14, 36, 160], [45, 30, -60], [61, 30, 0], [61, 30, 0], [59, 30, 5], [15, 31, 155]]
};
const PAD = { A: [12, 6], B: [22, 11] };
// B 몸: 머리 꼭대기(머리채 가운데)와 얼굴 칸
const TOP = B.frames.map((g) => { let top = 99, xs = []; g.forEach((r, y) => [...r].forEach((c, x) => { if ('fgt'.includes(c)) { if (y < top) { top = y; xs = [x]; } else if (y === top) xs.push(x); } })); return [Math.round(xs.reduce((a, b) => a + b, 0) / xs.length), top]; });
const robeA = (o, x, y, z, t, p, q, s) => ({ o, x, y, z, w: z, t, p, q, s });
const hairA = (k, h, j, e, g, f) => ({ k, h, i: h, j, e, g, f });
// B 글자: 머리 d·e < f·t < g, 옷 r < m·q < o < k·s < c < p, 붉은 띠 l·n, 띠 줄 h
const coatB = (r, m, o, k, c, p) => ({ r, m, q: m, o, k, s: k, c, p });
const hairB = (d, f, g) => ({ d, e: d, f, t: f, g });
const HEROES = {
  kai: { body: 'B', map: Object.assign(hairB('#1a1628', '#2a2442', '#433c74'), coatB('#0e0c14', '#16131e', '#201c2a', '#2a2636', '#3e384e', '#585270'), { l: '#d83a3a', n: '#7a1c28', h: '#e6e2d8' }), weapon: 'inksword', head: 'ribbon' },
  bram: { body: 'B', map: Object.assign(hairB('#5a3418', '#9a6434', '#d89a58'), coatB('#2a3042', '#3c465c', '#5a6680', '#7e8ca8', '#aab8d0', '#dce6f4'), { l: '#3a6cd8', n: '#1c3a80', h: '#e2c25a' }), weapon: 'shield', head: 'wings' },
  nox: { body: 'B', map: Object.assign(hairB('#121e18', '#20342a', '#365646'), coatB('#08180f', '#0e2618', '#143a28', '#1c5238', '#2a7050', '#4fbf8a'), { l: '#9a3ad0', n: '#56208a', h: '#c8a040' }), weapon: 'dagger', mask: true },
  lyra: { body: 'A', map: Object.assign(hairA('#c8f0d8', '#90d0b0', '#5a9c84', '#2e5c50', '#b0e4c8', '#e4fff0'), robeA('#7a3cc0', '#8a4cd0', '#9a60dc', '#6a30a8', '#4c2080', '#2a1050', '#b88af0', '#dcc0ff'), { l: '#fff4c0', v: '#e8c35a', u: '#2a1050', b: '#e8c35a', d: '#fff0a0' }), weapon: 'crystal', head: 'hat' },
  sera: { body: 'A', map: Object.assign(hairA('#fff0b8', '#f0d080', '#c8a050', '#8a6430', '#f8e0a0', '#fffad8'), robeA('#e8e4da', '#f2eee6', '#fbf9f4', '#d0cabc', '#aea694', '#706654', '#ffffff', '#ffffff'), { l: '#d8a838', v: '#e8c35a', u: '#4a7ad0', b: '#e8c35a', d: '#fff4c0' }), weapon: 'sunstaff', head: 'halo' }
};
const WEAPON = {
  inksword(put) {
    for (let k = 2; k <= 22; k += 0.5) { put(k, 0, k > 21 ? '#ff6a5a' : '#2a2630'); if (k < 20) put(k, 0.9, '#100e14'); if (k > 3 && k < 20) put(k, -0.9, '#6a6680'); }
    for (let s = -2; s <= 2; s++) put(1.5, s, '#c8323a');
    for (let k = 0; k <= 3; k++) put(-k, 0, '#5a1820');
    return { tassel: [-4, '#c8323a', '#ff6a5a'] };
  },
  shield() { return { sprite: ['..aaaaaaa..', '.abbbbbbba.', 'abbbbcbbbba', 'abbbbcbbbba', 'abccccccc ba'.replace(' ', ''), 'abbbbcbbbba', 'abbbbcbbbba', '.abbbcbbba.', '.abbbcbbba.', '..abbcbba..', '...abcba...', '....aba....', '.....a.....'], col: { a: '#4a5670', b: '#c8d2e0', c: '#3a6cd8' }, at: 2 }; },
  crystal(put) {
    for (let k = -8; k <= 15; k += 0.5) put(k, 0, Math.round(k) % 5 === 0 ? '#e8c35a' : '#7a5236');
    for (let k = 16; k <= 21; k += 0.5) { const wd = k < 18.5 ? (k - 16) * 0.9 : (21 - k) * 0.9; for (let s = -wd; s <= wd; s += 0.5) put(k, s, s < -0.5 ? '#7a3cc0' : s > 0.6 ? '#c8a0ff' : '#f0e0ff'); }
  },
  sunstaff(put) {
    for (let k = -8; k <= 15; k += 0.5) put(k, 0, Math.round(k) % 6 === 0 ? '#e8c35a' : '#f4ecd8');
    for (let a = 0; a < 32; a++) { const t = a / 32 * Math.PI * 2; put(19 + Math.cos(t) * 3.6, Math.sin(t) * 3.6, '#e8c35a'); }
    put(19, 0, '#ffffff'); put(18, 0, '#fff4c0'); put(20, 0, '#fff4c0'); put(19, 1, '#fff4c0'); put(19, -1, '#fff4c0');
  },
  dagger(put, f) {
    for (let k = 2; k <= 11; k += 0.5) { put(k, 0, k > 10 ? '#d8f8e0' : '#c8d4cc'); if (k < 10) put(k, 0.9, '#4fbf8a'); }
    for (let s = -2; s <= 2; s++) put(1.5, s, '#9a3ad0');
    for (let k = 0; k <= 2; k++) put(-k, 0, '#1e3029');
    // 내지르는 장면: 앞으로 날아가는 독침 셋
    if (f >= 12 && f <= 14) [[-3, 16], [0, 21], [3, 17]].forEach(([s, k0]) => { for (let k = 0; k < 5; k++) put(k0 + k + (f - 12) * 4, s, k === 4 ? '#d8f8e0' : '#7ae0aa'); });
    return { tassel: [-3, '#9a3ad0', '#d8a0ff'] };
  }
};
const HEAD = {
  hat: { s: ['.........aa....', '........abba...', '.......abbba...', '......abbbba...', '.....abbbbba...', '....abbbcbbba..', '...abbbbbbbbba.', '..accccccccccca', 'abbbbbbbbbbbbba', '.aaaaaaaaaaaaa.'], col: { a: '#2a1050', b: '#7a3cc0', c: '#e8c35a' }, dy: 2 },
  wings: { s: ['a.........a', 'ab.......ba', 'abb.ccc.bba', '.abbbcbbba.', '..abbbbba..'], col: { a: '#4a5670', b: '#e6eef8', c: '#3a6cd8' }, dy: 0 },
  halo: { s: ['..ccccccc..', '.c.......c.', '..ccccccc..'], col: { c: '#ffe680' }, dy: -9, glow: true },
  ribbon: { s: ['aa..aa', 'abaaba', 'abccba', 'aa.aaa', '...aba', '...ab.', '....a.'], col: { a: '#5a1018', b: '#d83a3a', c: '#ff8070' }, dy: 3 }
};
// 머리 장식 기준: A 는 리본(b·d) 자리, B 는 머리 꼭대기
const BOW = A.frames.map((r) => { let p = []; r.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'b' || c === 'd') p.push([x, y]); })); const m = Math.min(...p.map((q) => q[1])); p = p.filter((q) => q[1] <= m + 6); const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return { cx: Math.round((Math.min(...xs) + Math.max(...xs)) / 2), by: Math.max(...ys) }; });
function build(id) {
  const hero = HEROES[id], S = hero.body === 'A' ? A : B, [PL, PT] = PAD[hero.body];
  return S.frames.map((rows, f) => {
    const G = [], L = []; for (let y = 0; y < H; y++) { G.push(new Array(W).fill(null)); L.push(new Array(W).fill(null)); }
    const ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const low = { d: 'm', e: 'm', f: 'o', t: 'o', g: 'k' };
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '.') return; if (hero.body === 'B' && low[ch] && y > TOP[f][1] + 26) ch = low[ch]; G[y + PT][x + PL] = hero.map[ch] || S.pal[ch]; }));
    // 복면(소연): 머리 근처 살빛 칸의 아래쪽을 검은 천으로
    if (hero.mask) { const [tx, ty] = TOP[f]; rows.forEach((r, y) => [...r].forEach((ch, x) => { if ('ijb'.includes(ch) && y >= ty + 9 && y < ty + 16 && Math.abs(x - tx) < 9 && y > ty + 11) G[y + PT][x + PL] = y === ty + 12 ? '#2a7050' : '#0e2618'; })); }
    const [hx0, hy0, deg] = HAND[hero.body][f], hx = hx0 + PL, hy = hy0 + PT, a = deg * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const put = (k, s, c) => { const x = Math.round(hx + ux * k + nx * s), y = Math.round(hy + uy * k + ny * s); if (ok(x, y)) L[y][x] = c; };
    const res = WEAPON[hero.weapon](put, f) || {};
    if (res.sprite) { const cx = Math.round(hx + ux * res.at), cy = Math.round(hy + uy * res.at), sw = res.sprite[0].length, sh = res.sprite.length; res.sprite.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.' && res.col[ch]) { const x = cx + i - (sw >> 1), y = cy + j - (sh >> 1); if (ok(x, y)) L[y][x] = res.col[ch]; } })); }
    if (res.tassel) { const t = res.tassel; for (let k = 1; k <= 5; k++) { const x = Math.round(hx + ux * t[0] + k * 0.25), y = Math.round(hy + uy * t[0] + k); if (ok(x, y)) L[y][x] = k % 2 ? t[1] : t[2]; } }
    const HL = [];
    if (hero.head) {
      const hd = HEAD[hero.head], sw = hd.s[0].length, sh = hd.s.length;
      let ax, ay; if (hero.body === 'A') { ax = BOW[f].cx + PL; ay = BOW[f].by + PT + 1 + hd.dy - sh; } else { ax = TOP[f][0] + PL - (hero.head === 'ribbon' ? 7 : 0); ay = TOP[f][1] + PT + hd.dy - sh + (hero.head === 'ribbon' ? 6 : 2); }
      hd.s.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '.') return; const x = ax + i - (sw >> 1), y = ay + j; if (!ok(x, y)) return; if (hd.glow) HL.push([x, y, hd.col[ch]]); else L[y][x] = hd.col[ch]; }));
    }
    const add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!L[y][x]) { const near = (Ns) => Ns.some(([dx, dy]) => ok(x + dx, y + dy) && L[y + dy][x + dx]); if (!G[y][x] ? near(N8) : (G[y][x] !== OL && near(N4))) add.push([x, y]); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (L[y][x]) G[y][x] = L[y][x];
    add.forEach(([x, y]) => { G[y][x] = OL; });
    HL.forEach(([x, y, c]) => { if (!G[y][x] || G[y][x] === OL) G[y][x] = c; });
    return G;
  });
}
const out = {}, AL = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
Object.keys(HEROES).forEach((id) => {
  const frames = build(id), cols = {}; let n = 0;
  const fr = frames.map((g) => g.map((r) => r.map((c) => { if (!c) return '.'; if (!(c in cols)) cols[c] = AL[n++]; return cols[c]; }).join('')));
  const pal = {}; Object.keys(cols).forEach((c) => { pal[cols[c]] = c; });
  out[id] = { pal, frames: fr, raw: frames, body: HEROES[id].body };
});
fs.writeFileSync('heroes2.json', JSON.stringify({ w: W, h: H, heroes: Object.fromEntries(Object.keys(out).map((k) => [k, { pal: out[k].pal, frames: out[k].frames, body: out[k].body }])) }));
const P = require('./pngout.js'), ids = Object.keys(out);
P.save('../gif17/heroes2.png', (W + 2) * 8, (H + 2) * 2 * ids.length, (X, Y) => { const row = Math.floor(Y / (H + 2)), hid = ids[row >> 1], k = (row & 1) * 8 + Math.floor(X / (W + 2)), xx = X % (W + 2), yy = Y % (H + 2); if (xx >= W || yy >= H) return [255, 255, 255, 255]; const c = out[hid].raw[k][yy][xx]; if (!c) return [92, 92, 92, 255]; const v = parseInt(c.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255, 255]; }, 2);
console.log('ok');
