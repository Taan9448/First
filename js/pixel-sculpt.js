// pixel-sculpt.js — 18단계 몬스터 도트 렌더러(조각 렌더러)와 새로 그린 몬스터 5종
// 부위(타원 e · 막대 c · 다각형 p · 점 r · 선 l · 고리 o)마다 왼쪽 위 조명으로 5단 명암을 칠하고,
// 진한 색 외곽선 · 윗면 테두리광 · 앞 부위 안쪽 선 · 발광 부위의 번짐을 자동으로 입힌다.
// 결과는 G.Shape 시트 규격(대기 8 + 공격 1프레임)으로 만든다. glowOut 이 있으면 바깥 발광 테두리를 굽는다
(function () {
  'use strict';
  var G = Game;
  function makeSculptor() {
    const cache = {};
    const hex = (h) => { if (cache[h]) return cache[h]; const n = parseInt(h.slice(1), 16); return (cache[h] = (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0); };
    const BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
    const bay = (x, y) => BY[((y & 3) << 2) | (x & 3)];
    const hash = (x, y, s) => { let h = Math.imul(x + 101, 374761393) ^ Math.imul(y + 211, 668265263) ^ Math.imul(s + 7, 982451653); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const darken = (c, f) => { const r = ((c & 255) * f) | 0, g = (((c >> 8) & 255) * f) | 0, b = (((c >>> 16) & 255) * f) | 0; return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; };
    const mix = (c1, c2, f) => { const r = ((c1 & 255) * (1 - f) + (c2 & 255) * f) | 0, g = (((c1 >> 8) & 255) * (1 - f) + ((c2 >> 8) & 255) * f) | 0, b = (((c1 >>> 16) & 255) * (1 - f) + ((c2 >>> 16) & 255) * f) | 0; return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; };
    const RH = {
      skin: ['#6a3226', '#b05a46', '#e89a74', '#fcc8a0', '#fff0dc'],
      hairB: ['#08060e', '#16122a', '#262244', '#3e3c6c', '#6a70b0'],
      red: ['#3a060c', '#7a1018', '#c42a28', '#f05a44', '#ffa080'],
      white: ['#4a4258', '#8a809c', '#cec6d8', '#f0ecf4', '#ffffff'],
      dark: ['#08080e', '#161624', '#26263a', '#3c3c56', '#62628a'],
      steel: ['#161a2a', '#34405e', '#62789e', '#a4bcdc', '#eef6ff'],
      blue: ['#0a1238', '#1a2e72', '#2e56b6', '#5a8ae4', '#acccff'],
      gold: ['#3e2404', '#82520c', '#d09a22', '#f8d050', '#fff6b8'],
      blond: ['#5e3e12', '#a07226', '#d8ac44', '#f6dc7c', '#fff8d0'],
      lav: ['#24143e', '#422c70', '#7256b6', '#a88ae4', '#e6d8ff'],
      purple: ['#140828', '#2e1456', '#542c9c', '#8658d0', '#caa8ff'],
      silver: ['#3e3e56', '#727290', '#acacc6', '#dcdcee', '#ffffff'],
      green: ['#061812', '#103222', '#1c5438', '#348a58', '#76cc90'],
      jade: ['#062416', '#104c34', '#1e8656', '#48ca88', '#acf4cc'],
      wood: ['#24120a', '#462612', '#6c4220', '#966234', '#c48c52'],
      bone: ['#4e4030', '#86724e', '#bca67c', '#e6d6b0', '#fffae6'],
      boneD: ['#140c0c', '#342422', '#644e44', '#9a826e', '#ccb69c'],
      jskin: ['#24342a', '#445a44', '#748c6c', '#a8bc96', '#dceac8'],
      jrobe: ['#081216', '#12282e', '#1c3e46', '#2c6066', '#5c9498'],
      tali: ['#5e4006', '#b0841a', '#f0c63e', '#ffe888', '#fffce0'],
      ice: ['#0c2046', '#1a4688', '#3a84ca', '#7cc6f2', '#dcf6ff'],
      stone: ['#161c2a', '#2e3a50', '#54647e', '#8a9cb6', '#cadae8'],
      snow: ['#76869e', '#a6b6ca', '#d0dcea', '#eef4fa', '#ffffff'],
      pine: ['#041210', '#0c281c', '#18482e', '#2c6c44', '#5a9a6a'],
      batfur: ['#0e0814', '#20122c', '#362444', '#563a66', '#866098'],
      batwing: ['#16060e', '#341020', '#561c32', '#7e2c44', '#b0485c'],
      batpink: ['#4a1a26', '#8a3a4a', '#c86a78', '#f0a0a8', '#ffd8dc'],
      batbelly: ['#342634', '#644c5c', '#987c8c', '#c8aeb6', '#f2e0e4'],
      demon: ['#12080c', '#2c141c', '#48222c', '#6c3440', '#9a505c'],
      armor: ['#08080e', '#1a1a28', '#30304a', '#52526e', '#8a8aac'],
      cape: ['#06040a', '#140e1c', '#24182e', '#382644', '#5a3e68'],
      bladeG: ['#5e320c', '#b06a1a', '#f0a43a', '#ffd88a', '#fffaee']
    };
    const RAMPS = {}, OUTC = {};
    Object.keys(RH).forEach((k) => { RAMPS[k] = RH[k].map(hex); OUTC[k] = darken(RAMPS[k][0], 0.45); });
    const OUTD = hex('#08050a');

    const render = (def, f) => {
      const W = def.w, H = def.h, N = W * H, parts = def.parts;
      const pid = new Int16Array(N).fill(-1), idx = new Int8Array(N), flat = new Uint8Array(N), fix = new Uint32Array(N), glow = new Uint8Array(N);
      const rk = [], nm = [];
      const dyB = def.fly ? [0, -1, -2, -1][f] : [0, 0, 1, 1][f], swv = [0, 1, 1, 0][f], flv = [0, -2, -3, -1][f];
      parts.forEach((pt, n) => {
        const last = pt[pt.length - 1];
        const o = last && typeof last === 'object' && !Array.isArray(last) ? last : {};
        const T = pt[0];
        const rn = T === 'e' ? pt[5] : T === 'c' ? pt[7] : T === 'p' ? pt[2] : null;
        const ramp = rn ? RAMPS[rn] : null;
        rk[n] = rn; nm[n] = !!o.nm;
        const dy = o.f ? 0 : dyB, sw = (o.s || 0) * swv;
        const F = (x, y) => (o.fl ? y + o.fl * flv * Math.min(1, Math.abs(x - o.fx) / o.fw) : y);
        const shade = (x, y, nx, ny, nz) => {
          if (x < 0 || y < 0 || x >= W || y >= H) return;
          const i = y * W + x, L = ramp.length - 1, dot = -0.55 * nx - 0.62 * ny + 0.56 * nz;
          let s = 0.12 + 0.88 * Math.max(0, dot);
          if (o.t) s += (hash(x, y, n) - 0.5) * o.t * 0.5;
          if (o.lit) s += o.lit;
          let k = Math.floor(s * L + 0.5 + (bay(x, y) - 0.5) * (o.sm ? 0 : 0.3));
          if (dot > 0.92 && !o.matte) k = L;
          k = k < 0 ? 0 : k > L ? L : k;
          pid[i] = n; idx[i] = k; flat[i] = 0; glow[i] = 0;
          if (o.g) { flat[i] = 1; fix[i] = ramp[Math.min(L, k + 1)]; glow[i] = 1; }
          else if (o.rim && nx > 0.5 && nz < 0.75) { flat[i] = 1; fix[i] = hex(o.rim); }
        };
        const flatPut = (x, y, col) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; pid[i] = n; flat[i] = 1; fix[i] = hex(col); glow[i] = o.g ? 1 : 0; };
        if (T === 'e') {
          const cx = pt[1] + sw, cy = pt[2] + dy, rx = pt[3], ry = pt[4];
          for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
            const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d = u * u + v * v;
            if (d <= 1) shade(x, y, u, v, Math.sqrt(1 - d));
          }
        } else if (T === 'c') {
          const x1 = pt[1], y1 = F(pt[1], pt[2] + dy), x2 = pt[3] + sw, y2 = F(pt[3], pt[4] + dy), r1 = pt[5], r2 = pt[6];
          const vx = x2 - x1, vy = y2 - y1, L2 = vx * vx + vy * vy || 1e-6, mr = Math.max(r1, r2) + 1;
          for (let y = Math.floor(Math.min(y1, y2) - mr); y <= Math.ceil(Math.max(y1, y2) + mr); y++) for (let x = Math.floor(Math.min(x1, x2) - mr); x <= Math.ceil(Math.max(x1, x2) + mr); x++) {
            const px = x + 0.5, py = y + 0.5;
            let t = ((px - x1) * vx + (py - y1) * vy) / L2;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const qx = x1 + vx * t, qy = y1 + vy * t, r = Math.max(0.55, r1 + (r2 - r1) * t), ddx = px - qx, ddy = py - qy, d = Math.sqrt(ddx * ddx + ddy * ddy);
            if (d > r) continue;
            const q = d / r;
            shade(x, y, ddx / r, ddy / r, Math.sqrt(Math.max(0, 1 - q * q)));
          }
        } else if (T === 'p') {
          const ps = pt[1], P2 = [];
          for (let k = 0; k < ps.length; k += 2) P2.push([ps[k] + sw, F(ps[k], ps[k + 1] + dy)]);
          let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
          P2.forEach((p) => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
          const bcx = (x0 + x1) / 2, bcy = (y0 + y1) / 2, bw = Math.max(1, (x1 - x0) / 2), bh = Math.max(1, (y1 - y0) / 2), bev = o.b || 2.2, M = P2.length;
          for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
            const px = x + 0.5, py = y + 0.5;
            let inside = false;
            for (let a = 0, b = M - 1; a < M; b = a++) {
              const A = P2[a], B = P2[b];
              if ((A[1] > py) !== (B[1] > py) && px < ((B[0] - A[0]) * (py - A[1])) / (B[1] - A[1]) + A[0]) inside = !inside;
            }
            if (!inside) continue;
            let best = 1e9, ex = 0, ey = 0;
            for (let a = 0; a < M; a++) {
              const A = P2[a], B = P2[(a + 1) % M], dx = B[0] - A[0], dyy = B[1] - A[1], l2 = dx * dx + dyy * dyy || 1e-6;
              let t = ((px - A[0]) * dx + (py - A[1]) * dyy) / l2;
              t = t < 0 ? 0 : t > 1 ? 1 : t;
              const cx = A[0] + dx * t, cy = A[1] + dyy * t, d = Math.hypot(px - cx, py - cy);
              if (d < best) { best = d; ex = cx - px; ey = cy - py; }
            }
            let nx = ((px - bcx) / bw) * 0.4, ny = ((py - bcy) / bh) * 0.4, nz = 1;
            if (best < bev) { const k = 1 - best / bev, el = Math.hypot(ex, ey) || 1; nx += (ex / el) * k * 1.1; ny += (ey / el) * k * 1.1; nz = 1 - k * 0.5; }
            const nl = Math.hypot(nx, ny, nz);
            shade(x, y, nx / nl, ny / nl, nz / nl);
          }
        } else if (T === 'r') {
          for (let j = 0; j < pt[4]; j++) for (let i = 0; i < pt[3]; i++) flatPut(pt[1] + i + sw, pt[2] + j + dy, pt[5]);
        } else if (T === 'l') {
          const ax = pt[1] + sw, ay = F(pt[1], pt[2] + dy), bx = pt[3] + sw, by = F(pt[3], pt[4] + dy);
          const dx = bx - ax, dyy = by - ay, st = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dyy))));
          for (let i = 0; i <= st; i++) flatPut(ax + (dx * i) / st, ay + (dyy * i) / st, pt[5]);
        } else if (T === 'o') {
          const cx = pt[1] + sw, cy = pt[2] + dy, rx = pt[3], ry = pt[4], th = 0.9 / Math.min(rx, ry);
          for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y++) for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x++) {
            const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
            if (Math.abs(Math.sqrt(u * u + v * v) - 1) < th) flatPut(x, y, pt[5]);
          }
        }
      });
      const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : pid[y * W + x]);
      const idx2 = Int8Array.from(idx), line = new Uint8Array(N);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, me = pid[i];
        if (me < 0 || flat[i]) continue;
        const nb = [x + 1 < W ? i + 1 : -1, x > 0 ? i - 1 : -1, y + 1 < H ? i + W : -1, y > 0 ? i - W : -1];
        for (const j of nb) { if (j >= 0 && pid[j] > me && !flat[j] && !nm[pid[j]]) { idx2[i] = Math.max(0, idx[i] - 2); line[i] = 1; break; } }
      }
      const idx3 = Int8Array.from(idx2);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, me = pid[i];
        if (me < 0 || flat[i] || line[i]) continue;
        const L = RAMPS[rk[me]].length - 1;
        if (at(x, y - 1) < 0 || at(x - 1, y) < 0) idx3[i] = Math.min(L, idx2[i] + 1);
        else if (at(x, y + 1) < 0 || at(x + 1, y) < 0) idx3[i] = Math.max(0, idx2[i] - 1);
      }
      const res = new Uint32Array(N);
      for (let i = 0; i < N; i++) if (pid[i] >= 0) res[i] = flat[i] ? fix[i] : RAMPS[rk[pid[i]]][idx3[i]];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (pid[i] >= 0) continue;
        let bj = -1;
        const nb = [x + 1 < W ? i + 1 : -1, x > 0 ? i - 1 : -1, y + 1 < H ? i + W : -1, y > 0 ? i - W : -1];
        for (const j of nb) if (j >= 0 && pid[j] >= 0 && (bj < 0 || pid[j] > pid[bj])) bj = j;
        if (bj >= 0) res[i] = flat[bj] || !rk[pid[bj]] ? OUTD : OUTC[rk[pid[bj]]];
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!glow[i]) continue;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const j = yy * W + xx;
          if (glow[j] || bay(xx, yy) >= 0.5) continue;
          res[j] = res[j] === 0 ? ((fix[i] & 0x00ffffff) | 0x99000000) >>> 0 : mix(res[j], fix[i], 0.45);
        }
      }
      return res;
    };
    return { hex: hex, bay: bay, darken: darken, mix: mix, render: render };
    }
  var SC = null;
  function sculptor() { return SC || (SC = makeSculptor()); }

  // 4프레임(숨쉬기) → 대기 8프레임 + 공격 1프레임(앞쪽, 왼쪽으로 3px 들이민다)
  function build(spec) {
    var S = sculptor(), def = spec.sculpt, W = def.w, H = def.h, PAD = 4, fw = W + PAD, F = G.Shape.FRAMES;
    var frames = [0, 1, 2, 3].map(function (f) { return S.render(def, f); });
    var cv = document.createElement('canvas'); cv.width = fw * F; cv.height = H;
    var ctx = cv.getContext('2d'), img = ctx.createImageData(fw * F, H), dd = img.data;
    var ring = def.glowOut ? S.hex(def.glowOut) : 0;
    for (var f = 0; f < F; f++) {
      var fr = frames[f < G.Shape.IDLE ? Math.floor(f / 2) : 0], ox = f < G.Shape.IDLE ? PAD : PAD - 3;
      var solid = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && (fr[y * W + x] >>> 24) === 255; };
      var put = function (x, y, c) {
        var X = ox + x; if (X < 0 || X >= fw || y < 0 || y >= H) return;
        var k = (y * fw * F + f * fw + X) * 4;
        dd[k] = c & 255; dd[k + 1] = (c >> 8) & 255; dd[k + 2] = (c >>> 16) & 255; dd[k + 3] = c >>> 24;
      };
      if (ring) {
        var r1 = new Uint8Array(W * H);
        for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
          if (solid(x, y)) continue;
          var n = false;
          for (var dy = -1; dy <= 1 && !n; dy++) for (var dx = -1; dx <= 1; dx++) if (solid(x + dx, y + dy)) { n = true; break; }
          if (n) { r1[y * W + x] = 1; put(x, y, ((ring & 0x00ffffff) | 0xcc000000) >>> 0); }
        }
        for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
          if (r1[y * W + x] || solid(x, y)) continue;
          var m2 = false;
          for (dy = -1; dy <= 1 && !m2; dy++) for (dx = -1; dx <= 1; dx++) { var xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && r1[yy * W + xx]) { m2 = true; break; } }
          if (m2) put(x, y, ((ring & 0x00ffffff) | 0x55000000) >>> 0);
        }
      }
      for (var i = 0; i < fr.length; i++) if (fr[i]) put(i % W, Math.floor(i / W), fr[i]);
    }
    ctx.putImageData(img, 0, 0);
    var K = G.Shape.K, cx = def.cx != null ? def.cx : W / 2;
    var pt = function (q, dx) { return q ? { x: (PAD + q[0] + (dx || 0) + 0.5) / fw, y: (q[1] + 0.5) / H } : null; };
    return { url: cv.toDataURL(), canvas: cv, frames: F, fw: fw, fh: H, w: fw * K, h: H * K, anchor: (PAD + cx) / fw, tip: pt(def.tip), tipAttack: pt(def.tip, -3) };
  }

  function M(id, def) { G.Shape.def(id, { sculpt: def, build: build, group: '18단계 몬스터' }); }

  var bat = [
        ['p', [44, 31, 56, 18, 68, 12, 76, 20, 74, 30, 68, 28, 66, 36, 60, 33, 56, 40, 48, 38], 'batwing', { fl: 1, fx: 44, fw: 32, b: 2 }],
        ['l', 46, 31, 68, 13, '#200814', { fl: 1, fx: 44, fw: 32 }], ['l', 58, 19, 66, 35, '#200814', { fl: 1, fx: 44, fw: 32 }], ['l', 58, 19, 74, 29, '#200814', { fl: 1, fx: 44, fw: 32 }],
        ['e', 40, 37, 7, 8, 'batfur', { t: 0.3 }], ['e', 41, 40, 4.5, 5, 'batbelly'],
        ['p', [34, 27, 32, 15, 39, 24], 'batfur'], ['p', [33.5, 25, 33, 18, 37, 24], 'batpink'],
        ['p', [41, 25, 45, 14, 46, 27], 'batfur'], ['p', [42, 25, 45, 17, 45, 26], 'batpink'],
        ['e', 38, 30, 6, 5.5, 'batfur', { t: 0.3 }], ['e', 34, 32, 2.6, 2, 'batfur'],
        ['r', 34, 29, 2, 2, '#ff3a3a', { g: 1 }], ['r', 39, 29, 2, 2, '#ff3a3a', { g: 1 }], ['r', 33, 34, 1, 2, '#ffffff'], ['r', 36, 34, 1, 2, '#ffffff'],
        ['p', [36, 32, 22, 18, 10, 12, 3, 20, 6, 30, 13, 27, 15, 36, 21, 33, 25, 40, 32, 38], 'batwing', { fl: 1, fx: 36, fw: 32, b: 2 }],
        ['l', 34, 32, 10, 13, '#200814', { fl: 1, fx: 36, fw: 32 }], ['l', 22, 19, 13, 27, '#200814', { fl: 1, fx: 36, fw: 32 }], ['l', 22, 19, 21, 33, '#200814', { fl: 1, fx: 36, fw: 32 }],
        ['c', 38, 45, 37, 49, 0.9, 0.6, 'batfur'], ['c', 43, 45, 44, 49, 0.9, 0.6, 'batfur']
      ];
  var demon = [
        ['p', [20, 32, 28, 18, 34, 26, 32, 40, 22, 64, 17, 50], 'batwing', { b: 2 }], ['l', 28, 19, 22, 62, '#200814'],
        ['p', [44, 32, 38, 20, 32, 28, 36, 40, 46, 62, 50, 48], 'batwing', { b: 2 }], ['l', 38, 21, 46, 60, '#200814'],
        ['c', 30, 58, 27, 66, 2.8, 2.2, 'demon', { f: 1 }], ['c', 27, 66, 29, 75, 2.2, 1.6, 'demon', { f: 1 }], ['c', 37, 58, 40, 66, 2.8, 2.2, 'demon', { f: 1 }], ['c', 40, 66, 38, 75, 2.2, 1.6, 'demon', { f: 1 }],
        ['c', 29, 75, 25, 76, 1.2, 0.6, 'demon', { f: 1 }], ['c', 38, 75, 34, 76, 1.2, 0.6, 'demon', { f: 1 }],
        ['c', 40, 42, 44, 52, 2.4, 2, 'demon'], ['c', 44, 52, 44, 61, 2, 1.6, 'demon'], ['c', 44, 61, 45, 66, 0.9, 0.4, 'boneD'], ['c', 43, 61, 41, 65, 0.9, 0.4, 'boneD'],
        ['p', [26, 55, 39, 55, 40, 63, 36, 60, 33, 65, 30, 60, 27, 63], 'dark'],
        ['p', [25, 40, 40, 39, 42, 50, 38, 58, 28, 58, 24, 50], 'demon', { b: 3 }], ['p', [27, 40, 37, 40, 34, 48, 32, 45, 30, 48], 'batbelly'],
        ['l', 29, 51, 34, 50, '#12080c'], ['l', 29, 54, 34, 53, '#12080c'],
        ['p', [27, 26, 24, 13, 31, 24], 'demon'], ['p', [27.5, 25, 25.5, 16, 30, 24], 'batpink'], ['p', [32, 25, 36, 13, 36, 26], 'demon'], ['p', [33, 25, 35.5, 16, 35.5, 25], 'batpink'],
        ['e', 30, 30, 6.5, 6, 'demon'], ['e', 25.5, 32, 3, 2.3, 'demon'],
        ['r', 25, 29, 2, 1, '#ff3a3a', { g: 1 }], ['r', 30, 29, 2, 1, '#ff3a3a', { g: 1 }], ['r', 24, 34, 1, 2, '#fffae6'], ['r', 27, 34, 1, 2, '#fffae6'],
        ['c', 26, 42, 21, 52, 2.4, 2, 'demon'], ['c', 21, 52, 18, 61, 2, 1.6, 'demon'], ['c', 18, 61, 15, 66, 0.9, 0.3, 'boneD'], ['c', 19, 61, 19, 67, 0.9, 0.3, 'boneD'], ['c', 17, 60, 13, 63, 0.9, 0.3, 'boneD']
      ];
  var jiang = [
        ['c', 37, 26, 41, 46, 1.6, 1, 'hairB', { s: 1 }],
        ['e', 26, 73.5, 4, 2.6, 'dark', { f: 1 }], ['e', 36, 73.5, 4, 2.6, 'dark', { f: 1 }],
        ['c', 30, 45, 15, 47, 3.2, 3.8, 'jrobe'], ['e', 15, 47, 1.8, 3.8, 'white'], ['c', 13, 47, 8, 47.5, 1.3, 0.8, 'jskin'],
        ['p', [22, 38, 40, 38, 43, 72, 19, 72], 'jrobe', { b: 3 }], ['p', [19, 68.5, 43, 68.5, 43, 72, 19, 72], 'red'], ['l', 19, 68, 43, 68, '#f8d050'],
        ['l', 31, 44, 31, 68, '#12282e'], ['l', 25, 58, 23, 68, '#12282e'], ['l', 37, 58, 39, 68, '#12282e'],
        ['r', 26, 47, 10, 9, '#d09a22'], ['r', 27, 48, 8, 7, '#3a1a0e'], ['l', 28, 53, 31, 49, '#f8d050'], ['l', 31, 49, 34, 52, '#f8d050'], ['r', 30, 51, 2, 2, '#f8d050'],
        ['p', [26, 38, 36, 38, 31, 44], 'red'], ['l', 26, 38, 31, 44, '#f8d050'],
        ['e', 31, 29, 7, 7.5, 'jskin'],
        ['e', 31, 21, 9.5, 3.5, 'dark'], ['l', 22, 22, 40, 22, '#c42a28'], ['e', 31, 17, 6.5, 4.5, 'dark'], ['e', 31, 12, 2.2, 2.2, 'red'],
        ['p', [30, 19, 35, 19, 35, 37, 30, 37], 'tali', { b: 1 }],
        ['l', 32.5, 21, 32.5, 35, '#c42a28'], ['l', 31, 24, 34, 24, '#c42a28'], ['l', 31, 28, 34, 28, '#c42a28'], ['r', 31, 31, 3, 1, '#c42a28'],
        ['r', 25, 29, 3, 1, '#1a0a0a'], ['r', 26, 29, 1, 1, '#ff4a3a', { g: 1 }], ['r', 25, 34, 4, 1, '#2a1a1a'], ['r', 26, 35, 1, 1, '#ffffff'],
        ['c', 27, 43, 12, 44, 3.4, 4, 'jrobe'], ['e', 12, 44, 1.8, 4, 'white'],
        ['c', 10, 43, 5, 42.5, 1.2, 0.7, 'jskin'], ['c', 10, 45, 5, 45.5, 1.2, 0.7, 'jskin'], ['r', 4, 42, 1, 1, '#2a1a1a'], ['r', 4, 45, 1, 1, '#2a1a1a']
      ];
  var golem = [
        ['c', 40, 70, 38, 86, 7.5, 7, 'stone', { f: 1, t: 0.5 }], ['c', 60, 70, 62, 86, 7.5, 7, 'stone', { f: 1, t: 0.5 }],
        ['e', 37, 88, 9.5, 4.5, 'stone', { f: 1, t: 0.5 }], ['e', 63, 88, 9.5, 4.5, 'stone', { f: 1, t: 0.5 }],
        ['c', 74, 44, 80, 64, 7, 6, 'stone', { t: 0.5 }], ['e', 81, 70, 8, 7.5, 'stone', { t: 0.5 }],
        ['p', [26, 34, 70, 32, 77, 52, 67, 74, 32, 74, 22, 54], 'stone', { t: 0.55, b: 4 }],
        ['l', 36, 44, 42, 52, '#141a26'], ['l', 42, 52, 40, 60, '#141a26'], ['l', 60, 40, 56, 50, '#141a26'], ['l', 62, 58, 66, 66, '#141a26'],
        ['o', 48, 54, 7.5, 8.5, '#7cc6f2', { g: 1 }], ['e', 48, 54, 5, 6, 'ice', { g: 1 }],
        ['p', [36, 73, 39, 73, 37.5, 80], 'ice'], ['p', [50, 74, 53, 74, 51.5, 82], 'ice'], ['p', [60, 73, 63, 73, 61.5, 79], 'ice'],
        ['e', 72, 36, 13, 11, 'stone', { t: 0.5 }], ['e', 72, 28.5, 11, 4.5, 'snow', { t: 0.3 }],
        ['p', [66, 28, 69, 12, 74, 28], 'ice'],
        ['c', 78, 28, 78, 22, 1.4, 1.4, 'wood'], ['p', [71, 24, 78, 10, 85, 24], 'pine'], ['p', [72, 18, 78, 4, 84, 18], 'pine'], ['l', 74, 17, 78, 11, '#eef4fa'], ['l', 73, 23, 78, 15, '#eef4fa'],
        ['e', 46, 31, 10, 8, 'stone', { t: 0.4 }], ['p', [36, 27, 56, 26, 55, 30, 37, 31], 'stone'],
        ['r', 38, 31, 4, 2, '#9fffff', { g: 1 }], ['r', 47, 31, 4, 2, '#9fffff', { g: 1 }],
        ['e', 24, 38, 12, 10, 'stone', { t: 0.5 }], ['e', 24, 31, 10, 4, 'snow', { t: 0.3 }],
        ['p', [18, 32, 14, 18, 25, 30], 'ice'], ['p', [24, 30, 27, 14, 31, 30], 'ice'],
        ['c', 22, 44, 16, 66, 7.5, 6.5, 'stone', { t: 0.5 }], ['e', 15, 72, 8.5, 7.5, 'stone', { t: 0.5 }],
        ['p', [8, 68, 4, 60, 12, 66], 'ice'], ['p', [14, 66, 15, 57, 19, 66], 'ice']
      ];
  var boss = [
        ['p', [44, 30, 66, 30, 84, 80, 72, 88, 62, 76, 52, 86, 42, 72], 'cape', { b: 3, s: 1 }], ['p', [62, 33, 67, 32, 82, 78, 77, 82], 'red', { s: 1 }],
        ['c', 60, 42, 64, 54, 2.6, 2.2, 'bone'], ['c', 64, 54, 62, 64, 3, 3.2, 'armor'], ['e', 62, 66, 3, 3, 'armor'],
        ['c', 44, 62, 42, 74, 2.4, 2.2, 'bone', { f: 1 }], ['c', 52, 62, 54, 74, 2.4, 2.2, 'bone', { f: 1 }],
        ['c', 42, 74, 41, 86, 4, 4.2, 'red', { f: 1 }], ['e', 42, 75, 4.6, 2, 'gold', { f: 1 }], ['c', 54, 74, 55, 86, 4, 4.2, 'red', { f: 1 }], ['e', 54, 75, 4.6, 2, 'gold', { f: 1 }],
        ['e', 39, 88.5, 6, 3.5, 'armor', { f: 1 }], ['e', 56, 88.5, 6, 3.5, 'armor', { f: 1 }],
        ['e', 48, 60, 7, 4, 'bone'],
        ['p', [36, 56, 42, 56, 40, 74, 34, 72], 'armor'], ['p', [54, 56, 60, 56, 62, 72, 56, 74], 'armor'],
        ['p', [41, 58, 55, 58, 57, 78, 49, 82, 39, 78], 'red', { b: 3 }], ['l', 41, 60, 55, 60, '#f8d050'], ['l', 48, 62, 48, 79, '#f8d050'], ['r', 46, 66, 5, 5, '#3a060c'], ['r', 47, 67, 3, 3, '#f8d050'],
        ['c', 40, 60, 39, 71, 0.9, 0.9, 'blue', { s: 1 }], ['c', 56, 60, 57, 71, 0.9, 0.9, 'blue', { s: 1 }],
        ['e', 48, 46, 9, 10, 'armor'], ['p', [43, 39, 53, 39, 52, 52, 44, 52], 'bone'],
        ['l', 44, 42, 52, 42, '#4e4030'], ['l', 44, 45, 52, 45, '#4e4030'], ['l', 45, 48, 51, 48, '#4e4030'],
        ['p', [46, 39, 50, 39, 50, 56, 46, 56], 'red'], ['p', [38, 54, 58, 54, 58, 58, 38, 58], 'gold'],
        ['e', 62, 38, 8, 6.5, 'armor'], ['c', 64, 34, 70, 25, 2, 0.5, 'gold'], ['c', 59, 34, 62, 27, 1.6, 0.5, 'gold'], ['l', 55, 40, 69, 40, '#d09a22'], ['c', 66, 41, 77, 37, 1.5, 0.8, 'red', { s: 2 }],
        ['e', 36, 39, 5, 4.5, 'armor'], ['l', 32, 41, 40, 41, '#d09a22'],
        ['e', 48, 28, 8, 8, 'bone'], ['e', 47, 34, 5.5, 3.5, 'bone'],
        ['r', 42, 27, 4, 4, '#140a10'], ['r', 49, 27, 4, 4, '#140a10'], ['r', 43, 28, 2, 2, '#ff3a3a', { g: 1 }], ['r', 50, 28, 2, 2, '#ff3a3a', { g: 1 }],
        ['r', 46, 31, 2, 2, '#140a10'], ['r', 43, 35, 8, 1, '#140a10'], ['r', 44, 34, 1, 3, '#4e4030'], ['r', 46, 34, 1, 3, '#4e4030'], ['r', 48, 34, 1, 3, '#4e4030'], ['r', 50, 34, 1, 3, '#4e4030'],
        ['e', 48, 21, 10, 3, 'dark'], ['p', [41, 21, 55, 21, 53, 12, 43, 12], 'dark'], ['l', 41, 19, 55, 19, '#d09a22'], ['r', 47, 15, 3, 3, '#c42a28'],
        ['c', 48, 12, 48, 4, 1.2, 1.2, 'gold'], ['c', 45, 7, 51, 7, 1, 1, 'gold'], ['e', 48, 3.5, 1.8, 1.8, 'gold'],
        ['c', 40, 21, 39, 28, 0.8, 0.8, 'red', { s: 1 }], ['c', 56, 21, 57, 28, 0.8, 0.8, 'red', { s: 1 }],
        ['c', 30, 60, 33, 63, 1, 1, 'wood'],
        ['p', [27, 57, 4, 65, 1, 72, 8, 70, 27, 62], 'bladeG', { b: 2 }], ['l', 26, 57.5, 4, 65.5, '#fffaee'],
        ['c', 38, 42, 33, 52, 2.6, 2.2, 'bone'], ['c', 33, 52, 28, 58, 3, 3.2, 'armor'], ['e', 27, 59, 3.4, 3.4, 'armor'], ['e', 28, 59, 1.6, 3.2, 'gold']
      ];

  // 화염 박쥐(화산) · 혈귀 · 혈강시 · 혈갑 호법(혈교 사당) · 빙하 골렘(설원). 모두 왼쪽(영웅 쪽)을 본다
  M('fire_bat', { w: 80, h: 72, cx: 40, tip: [34, 34], parts: bat, fly: true, glowOut: '#ff3a4a' });
  M('vampire', { w: 64, h: 80, cx: 32, tip: [16, 64], parts: demon, glowOut: '#ff3a4a' });
  M('skeleton', { w: 64, h: 80, cx: 30, tip: [6, 44], parts: jiang });
  M('glacier_golem', { w: 96, h: 96, cx: 48, tip: [12, 72], parts: golem, glowOut: '#9fe6ff' });
  M('death_knight', { w: 96, h: 96, cx: 48, tip: [4, 68], parts: boss, glowOut: '#ffb24a' });
  G.Sculpt = { sculptor: sculptor };
})();
