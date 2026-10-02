// pixel-render.js — 도형 도트 렌더러 (11단계, GAME_DESIGN.md 2.4절)
// 캐릭터·몬스터를 도형 목록(타원 E · 막대 C · 둥근 판 B · 다각형 P · 칼날 L)으로 적고,
// 픽셀마다 앞쪽 도형의 법선으로 빛(왼쪽 위)을 계산해 재질의 6칸 색 띠로 칠한다.
// 겹침 그림자 · 셀아웃 외곽선 · 앞 부위 안쪽 선 · 역광 · 발광 재질 · 번지는 빛을 자동으로 입힌다.
// 시트는 [대기 8프레임 + 공격 자세 1프레임] 가로 배치. 도트 1칸 = 화면 --px 의 절반(K)
(function () {
  'use strict';
  var G = Game;
  var TAU = Math.PI * 2;
  var K = 0.5; // 시트 크기 단위: 그림 1픽셀 = var(--px) × K
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(function (v) { return (v + 0.5) / 16; });
  function bayer(x, y) { return BAYER[(y & 3) * 4 + (x & 3)]; }
  function hash(x, y, f) { var h = (x * 374761393 + y * 668265263 + f * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------------- 색 ----------------
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbHex(r, g, b) { return '#' + [r, g, b].map(function (v) { v = clamp(Math.round(v), 0, 255); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function rgbHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0;
    if (mx !== mn) {
      var d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
    }
    return [h, s, l];
  }
  function hslRgb(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    if (!s) return [l * 255, l * 255, l * 255];
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    function f(t) { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  function towardHue(h, target, amt) { var d = ((target - h + 540) % 360) - 180; return h + (d < 0 ? -1 : 1) * Math.min(Math.abs(d), amt); }
  function mix(a, b, k) { var x = hexRgb(a), y = hexRgb(b); return rgbHex(x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k); }
  function darken(a, k) { var x = hexRgb(a); return rgbHex(x[0] * (1 - k), x[1] * (1 - k), x[2] * (1 - k)); }

  // 6칸 색 띠: 0 외곽 · 1 그늘 · 2 반그늘 · 3 기본 · 4 밝음 · 5 반사광.
  // 어두운 칸은 남보라 쪽, 밝은 칸은 노란 쪽으로 색조를 옮긴다
  var STEPS = [-1.25, -0.8, -0.38, 0, 0.42, 0.85];
  function makeRamp(hex, o) {
    var c = hexRgb(hex), hsl = rgbHsl(c[0], c[1], c[2]);
    return STEPS.map(function (t) {
      var h = towardHue(hsl[0], t < 0 ? 255 : 52, Math.abs(t) * (o.shift == null ? 16 : o.shift));
      var l = clamp(hsl[2] + t * (t < 0 ? (o.dark || 0.24) : (o.light || 0.2)), 0.05, 0.97);
      var s = clamp(hsl[1] * (t < 0 ? 1 + 0.12 * -t : 1 - 0.22 * t), 0, 1);
      var r = hslRgb(h, s, l); return rgbHex(r[0], r[1], r[2]);
    });
  }
  var MAT = {};
  // o: spec(반사 0~1) · shin(반사 날카로움) · emit(스스로 빛남, ramp 직접 지정) · solid(한 색) · dark/light/shift(색 띠 폭·색조 이동)
  function mat(name, hex, o) {
    o = o || {};
    MAT[name] = { ramp: o.ramp || makeRamp(hex, o), spec: o.spec || 0, shin: o.shin || 12, emit: !!o.emit, solid: o.solid ? hex : null };
  }
  var FIRE = ['#5a1406', '#a3260c', '#e8501a', '#ff8a2a', '#ffc84a', '#fff3b8'];

  // ---------------- 도형 ----------------
  function part(p, m, o) {
    p.m = m; o = o || {};
    for (var k in o) p[k] = o[k];
    if (p.rot == null) p.rot = 0;
    var r;
    if (p.k === 'E' || p.k === 'B') { r = Math.max(p.rx, p.ry); p.b = [p.x - r, p.y - r, p.x + r, p.y + r]; p.cx = p.x; p.cy = p.y; }
    else if (p.k === 'C') { r = Math.max(p.r1, p.r2); p.b = [Math.min(p.x1, p.x2) - r, Math.min(p.y1, p.y2) - r, Math.max(p.x1, p.x2) + r, Math.max(p.y1, p.y2) + r]; p.cx = (p.x1 + p.x2) / 2; p.cy = (p.y1 + p.y2) / 2; }
    else if (p.k === 'L') { r = p.w; p.b = [Math.min(p.x1, p.x2) - r, Math.min(p.y1, p.y2) - r, Math.max(p.x1, p.x2) + r, Math.max(p.y1, p.y2) + r]; p.cx = (p.x1 + p.x2) / 2; p.cy = (p.y1 + p.y2) / 2; }
    else {
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      p.pts.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
      p.b = [x0, y0, x1, y1]; p.cx = (x0 + x1) / 2; p.cy = (y0 + y1) / 2;
    }
    return p;
  }
  // 타원(둥근 덩어리) · 막대(팔다리, 굵기가 r1→r2) · 둥근 판(n이 클수록 네모, 가장자리만 깎임) · 다각형(가장자리 bev 만큼 깎임) · 칼날(양면)
  function E(x, y, rx, ry, m, o) { return part({ k: 'E', x: x, y: y, rx: rx, ry: ry }, m, o); }
  function C(x1, y1, x2, y2, r1, r2, m, o) { return part({ k: 'C', x1: x1, y1: y1, x2: x2, y2: y2, r1: r1, r2: r2 }, m, o); }
  function B(x, y, rx, ry, n, m, o) { return part({ k: 'B', x: x, y: y, rx: rx, ry: ry, n: n }, m, o); }
  function P(pts, m, o) { return part({ k: 'P', pts: pts }, m, o); }
  function L(x1, y1, x2, y2, w, m, o) { return part({ k: 'L', x1: x1, y1: y1, x2: x2, y2: y2, w: w }, m, o); }

  function norm(x, y, z) { var l = Math.sqrt(x * x + y * y + z * z) || 1; return [x / l, y / l, z / l]; }
  function evalPart(p, X, Y) {
    var c, s, dx, dy, lx, ly, u, v;
    switch (p.k) {
      case 'E':
        c = Math.cos(p.rot); s = Math.sin(p.rot); dx = X - p.x; dy = Y - p.y;
        lx = dx * c + dy * s; ly = -dx * s + dy * c; u = lx / p.rx; v = ly / p.ry;
        var d2 = u * u + v * v; if (d2 > 1) return null;
        var f = p.flat == null ? 1 : p.flat;
        return norm((u * c - v * s) * f, (u * s + v * c) * f, Math.sqrt(1 - d2));
      case 'C':
        var ax = p.x2 - p.x1, ay = p.y2 - p.y1, l2 = ax * ax + ay * ay;
        var t = l2 ? clamp(((X - p.x1) * ax + (Y - p.y1) * ay) / l2, 0, 1) : 0;
        dx = X - (p.x1 + ax * t); dy = Y - (p.y1 + ay * t);
        var d = Math.sqrt(dx * dx + dy * dy), r = p.r1 + (p.r2 - p.r1) * t;
        if (d > r) return null; if (d < 1e-6) return [0, 0, 1];
        var q = d / r * (p.flat == null ? 1 : p.flat); return [dx / d * q, dy / d * q, Math.sqrt(1 - q * q)];
      case 'B':
        c = Math.cos(p.rot); s = Math.sin(p.rot); dx = X - p.x; dy = Y - p.y;
        lx = dx * c + dy * s; ly = -dx * s + dy * c; u = lx / p.rx; v = ly / p.ry;
        var au = Math.abs(u), av = Math.abs(v), e = Math.pow(au, p.n) + Math.pow(av, p.n);
        if (e > 1) return null;
        var k = Math.pow(e, 1 / p.n), gx = (u < 0 ? -1 : 1) * Math.pow(au, p.n - 1) / p.rx, gy = (v < 0 ? -1 : 1) * Math.pow(av, p.n - 1) / p.ry;
        var gl = Math.sqrt(gx * gx + gy * gy) || 1; gx /= gl; gy /= gl;
        var bev = p.bev == null ? 0.35 : p.bev, qq = k < 1 - bev ? 0 : (k - (1 - bev)) / bev;
        qq = qq * qq * (3 - 2 * qq); var tilt = Math.min(0.92, qq * 0.8 + k * 0.15);
        var wx = gx * c - gy * s, wy = gx * s + gy * c;
        return [wx * tilt, wy * tilt, Math.sqrt(1 - tilt * tilt)];
      case 'L':
        var bx = p.x2 - p.x1, by = p.y2 - p.y1, len = Math.sqrt(bx * bx + by * by);
        var tt = ((X - p.x1) * bx + (Y - p.y1) * by) / (len * len); if (tt < 0 || tt > 1) return null;
        var sd = ((X - p.x1) * by - (Y - p.y1) * bx) / len, hw = p.w * (tt < (p.taper || 0.72) ? 1 : (1 - tt) / (1 - (p.taper || 0.72)));
        if (Math.abs(sd) > hw) return null;
        var px = by / len, py = -bx / len, sg = sd >= 0 ? 1 : -1;
        return norm(px * sg * 0.6, py * sg * 0.6, 0.8);
      default: // P
        var pts = p.pts, inside = false, best = 1e9, ox = 0, oy = 0;
        for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
          if ((yi > Y) !== (yj > Y) && X < (xj - xi) * (Y - yi) / (yj - yi) + xi) inside = !inside;
          var ex = xi - xj, ey = yi - yj, el = ex * ex + ey * ey;
          var et = el ? clamp(((X - xj) * ex + (Y - yj) * ey) / el, 0, 1) : 0;
          var qx = xj + ex * et - X, qy = yj + ey * et - Y, qd = Math.sqrt(qx * qx + qy * qy);
          if (qd < best) { best = qd; ox = qx; oy = qy; }
        }
        if (!inside) return null;
        var base = p.nrm || [0, 0, 1], bw = p.bev == null ? 1.6 : p.bev;
        var w = bw > 0 && best < bw ? (1 - best / bw) * 0.9 : 0;
        if (best > 1e-6) { ox /= best; oy /= best; }
        return norm(base[0] + ox * w, base[1] + oy * w, base[2]);
    }
  }

  // ---------------- 렌더러 ----------------
  function flat(list, out) { list.forEach(function (q) { if (Array.isArray(q)) flat(q, out); else out.push(q); }); return out; }
  var LIGHT = norm(-0.5, -0.72, 0.48), HALF = norm(LIGHT[0], LIGHT[1], LIGHT[2] + 1);
  var OUTLINE = '#140d24';

  // model: { w, h, parts, glow }  s: 단위 → 픽셀 배율  style: { rim, dither, black, inner }  opts: { flip, remap(hex, matName) }
  function render(model, s, style, frame, opts) {
    opts = opts || {};
    var W = Math.ceil(model.w * s) + 2, H = Math.ceil(model.h * s) + 2, N = W * H;
    var id = new Int16Array(N).fill(-1), NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N);
    var parts = flat(model.parts, []).filter(function (p) { return p && !(p.minS && s < p.minS); });
    var x, y, k, i, p, n;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      var x0 = clamp(Math.floor(p.b[0] * s), 0, W - 1), x1 = clamp(Math.ceil(p.b[2] * s) + 2, 0, W - 1);
      var y0 = clamp(Math.floor(p.b[1] * s), 0, H - 1), y1 = clamp(Math.ceil(p.b[3] * s) + 2, 0, H - 1);
      var hit = false;
      for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
        n = evalPart(p, (x - 0.5) / s, (y - 0.5) / s);
        if (!n) continue;
        k = y * W + x;
        if (p.m === 'cut') { id[k] = -1; continue; }
        id[k] = i; NX[k] = n[0]; NY[k] = n[1]; NZ[k] = n[2]; hit = true;
      }
      if (!hit && p.keep && p.m !== 'cut') {
        x = clamp(Math.floor(p.cx * s) + 1, 0, W - 1); y = clamp(Math.floor(p.cy * s) + 1, 0, H - 1); k = y * W + x;
        id[k] = i; NX[k] = 0; NY[k] = 0; NZ[k] = 1;
      }
    }
    var grp = parts.map(function (q, j) { return q.g || '#' + j; });
    var lvl = new Int8Array(N).fill(-9), rim = new Uint8Array(N);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      k = y * W + x; if (id[k] < 0) continue;
      var pp = parts[id[k]], m = MAT[pp.m];
      if (!m) { m = MAT[pp.m] = MAT._missing; }
      if (m.solid) { lvl[k] = 9; continue; }
      if (m.emit) {
        var r = hash(x, y, frame), base = pp.emitLv != null ? pp.emitLv : 1 + Math.round(NZ[k] * 3.2);
        lvl[k] = clamp(base + (r < 0.14 ? -1 : r > 0.9 ? 1 : 0), 1, 5); continue;
      }
      var d = NX[k] * LIGHT[0] + NY[k] * LIGHT[1] + NZ[k] * LIGHT[2];
      var v = clamp(0.5 + 0.5 * d, 0, 1);
      var dith = style.dither ? (bayer(x, y) - 0.5) * 0.95 : 0;
      var li = clamp(1 + Math.floor(v * 4 + dith), 1, 4);
      if (m.spec) {
        var sp = Math.pow(Math.max(0, NX[k] * HALF[0] + NY[k] * HALF[1] + NZ[k] * HALF[2]), m.shin);
        if (sp > 1 - m.spec * 0.45) li = 5;
      }
      lvl[k] = li;
    }
    // 겹침 그림자: 왼쪽 위에 앞쪽 부위가 있으면 한 단계 어둡게
    var ao = new Int8Array(N);
    for (y = 1; y < H; y++) for (x = 1; x < W; x++) {
      k = y * W + x; if (id[k] < 0 || lvl[k] < 1 || lvl[k] > 5) continue;
      if (MAT[parts[id[k]].m].emit) continue;
      var nb = [k - 1, k - W, k - W - 1];
      for (var a = 0; a < 3; a++) {
        var j = id[nb[a]];
        if (j > id[k] && grp[j] !== grp[id[k]] && parts[j].ao !== false) { ao[k] = 1; break; }
      }
    }
    for (k = 0; k < N; k++) if (ao[k]) lvl[k] = Math.max(1, Math.min(lvl[k], 4) - 1);
    // 덩어리 정리: 사방이 같은 단계인데 혼자 다른 점은 맞춘다
    if (!style.dither) {
      var copy = lvl.slice();
      for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
        k = y * W + x; var c0 = copy[k]; if (c0 < 1 || c0 > 4) continue;
        var nn = [k - 1, k + 1, k - W, k + W], same = true, l0 = copy[nn[0]];
        for (var b = 0; b < 4; b++) if (id[nn[b]] !== id[k] || copy[nn[b]] !== l0) { same = false; break; }
        if (same && l0 !== c0 && l0 >= 1 && l0 <= 4) lvl[k] = l0;
      }
    }
    // 안쪽 선: 앞 부위가 뒤 부위와 맞닿은 가장자리
    if (style.inner !== false && s >= 0.5) {
      var cur = lvl.slice();
      for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
        k = y * W + x; i = id[k]; if (i < 0 || parts[i].line === false) continue;
        var mm = MAT[parts[i].m]; if (mm.emit || mm.solid) continue;
        var dirs = [[k + 1, 1], [k + W, 1], [k - 1, 0], [k - W, 0]];
        for (var q = 0; q < 4; q++) {
          var jj = id[dirs[q][0]];
          if (jj >= 0 && jj < i && grp[jj] !== grp[i] && parts[jj].line !== false) {
            cur[k] = style.black ? -2 : (dirs[q][1] ? 0 : Math.max(0, Math.min(1, lvl[k])));
            break;
          }
        }
      }
      lvl = cur;
    }
    // 역광: 오른쪽 윤곽(뒤집으면 왼쪽)
    if (style.rim) {
      for (y = 0; y < H; y++) for (x = 0; x < W - 1; x++) {
        k = y * W + x; if (id[k] < 0 || id[k + 1] >= 0 || lvl[k] < 1) continue;
        var mt = MAT[parts[id[k]].m]; if (mt.emit || mt.solid) continue;
        if (NX[k] > 0.2) rim[k] = 1;
      }
    }
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), dd = img.data;
    var remap = opts.remap;
    function put(xx, yy, hex, mname) {
      if (remap) hex = remap(hex, mname);
      var c = hexRgb(hex), kk = (yy * W + (opts.flip ? W - 1 - xx : xx)) * 4;
      dd[kk] = c[0]; dd[kk + 1] = c[1]; dd[kk + 2] = c[2]; dd[kk + 3] = 255;
    }
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      k = y * W + x;
      if (id[k] >= 0) {
        var pn = parts[id[k]].m, mk = MAT[pn], col;
        if (lvl[k] === 9) col = mk.solid;
        else if (lvl[k] === -2) col = OUTLINE;
        else col = mk.ramp[clamp(lvl[k], 0, 5)];
        if (rim[k]) col = mix(mk.ramp[4], style.rim, 0.55);
        put(x, y, col, pn); continue;
      }
      var R = x < W - 1 ? id[k + 1] : -1, D = y < H - 1 ? id[k + W] : -1, Lf = x > 0 ? id[k - 1] : -1, U = y > 0 ? id[k - W] : -1;
      var src = D >= 0 ? D : R >= 0 ? R : Lf >= 0 ? Lf : U;
      if (src < 0) continue;
      var sn = parts[src].m;
      if (style.black) { put(x, y, OUTLINE, sn); continue; }
      var ms = MAT[sn], lit = D >= 0 || R >= 0;
      var baseC = ms.emit ? ms.ramp[1] : ms.solid ? darken(ms.solid, 0.55) : ms.ramp[0];
      put(x, y, ms.emit || lit ? baseC : darken(baseC, 0.38), sn);
    }
    ctx.putImageData(img, 0, 0);
    (model.glow || []).forEach(function (g) {
      var gx = Math.round(1 + g.x * s);
      drawGlow(ctx, opts.flip ? W - 1 - gx : gx, Math.round(1 + g.y * s), Math.max(2, Math.round(g.r * s)), remap ? remap(g.c, 'glow') : g.c, g.k);
    });
    return cv;
  }

  // 점무늬로 번지는 빛(더하기 합성)
  function drawGlow(ctx, cx, cy, r, color, strength) {
    var c = hexRgb(color); strength = strength || 1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) {
      var d = Math.sqrt(x * x + y * y) / r; if (d >= 1) continue;
      var a = (1 - d); a = a * a * 3 + (bayer(cx + x + 64, cy + y + 64) - 0.5) * 0.9;
      var lv = Math.floor(a); if (lv <= 0) continue;
      ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (Math.min(lv, 3) * 0.085 * strength).toFixed(3) + ')';
      ctx.fillRect(cx + x, cy + y, 1, 1);
    }
    ctx.restore();
  }

  // ---------------- 스프라이트 정의 · 시트 ----------------
  // spec: { h: 그림 높이(px), fn(t, pose) → model, flip, style, remap }
  //   model.tip / model.tipAttack: 무기 끝(단위 좌표) · model.cx: 몸 중심 x(단위)
  var specs = {}, sheets = {};
  var IDLE = 8, FRAMES = IDLE + 1;
  function def(id, spec) { specs[id] = spec; delete sheets[id]; }
  function variant(id, base, extra) { specs[id] = Object.assign({}, specs[base], extra); delete sheets[id]; }

  // 18단계: 손으로 찍은 도트 격자(글자 1개 = 1픽셀)로 시트를 만든다.
  // spec.grid = { rows, pal, k(화면 배율), waist(숨쉴 때 내려앉는 윗몸의 마지막 줄), cx, tip, face }
  // 대기 8프레임은 윗몸이 1px 내려앉았다 돌아오고, 공격 프레임은 몸 전체가 앞으로 2px(윗몸 3px) 기운다
  var EYES = 'eEW';
  function gridSheet(spec) {
    var g = spec.grid, rows = g.rows, gw = rows[0].length, gh = rows.length;
    var PADX = 2, fw = gw + 4, fh = gh + 1;
    var cv = document.createElement('canvas'); cv.width = fw * FRAMES; cv.height = fh;
    var ctx = cv.getContext('2d'), img = ctx.createImageData(fw * FRAMES, fh), dd = img.data;
    var col = {};
    Object.keys(g.pal).forEach(function (ch) {
      var hex = g.pal[ch];
      if (spec.remap) hex = spec.remap(hex, EYES.indexOf(ch) >= 0 ? 'eye' : (g.glow || '').indexOf(ch) >= 0 ? 'glow' : ch);
      col[ch] = hexRgb(hex);
    });
    for (var f = 0; f < FRAMES; f++) {
      var atk = f === IDLE, dy = atk ? 0 : Math.round(G.Shape.bob(f / IDLE, 1));
      for (var pass = 0; pass < 2; pass++) for (var y = 0; y < gh; y++) {
        var upper = y <= g.waist;
        if ((pass === 1) !== upper) continue;
        var row = rows[y];
        for (var x = 0; x < gw; x++) {
          var c = col[row[x]];
          if (!c) continue;
          var X = PADX + x + (atk ? (upper ? 3 : 2) : 0), Y = y + (upper ? dy : 0);
          if (X < 0 || X >= fw || Y < 0 || Y >= fh) continue;
          if (spec.flip) X = fw - 1 - X;
          var k = (Y * fw * FRAMES + f * fw + X) * 4;
          dd[k] = c[0]; dd[k + 1] = c[1]; dd[k + 2] = c[2]; dd[k + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    var KK = g.k || K;
    var fx = function (gx) { var px = (PADX + gx + 0.5) / fw; return spec.flip ? 1 - px : px; };
    var pt = function (q, dx) { return q ? { x: fx(q[0] + (dx || 0)), y: (q[1] + 0.5) / fh } : null; };
    return {
      url: cv.toDataURL(), canvas: cv, frames: FRAMES, fw: fw, fh: fh,
      w: fw * KK, h: fh * KK, anchor: fx(g.cx), tip: pt(g.tip), tipAttack: pt(g.tip, 3),
      face: g.face ? pt(g.face) : null
    };
  }

  function sheet(id) {
    if (sheets[id]) return sheets[id];
    var spec = specs[id];
    if (!spec) return null;
    if (spec.grid) return (sheets[id] = gridSheet(spec));
    if (spec.build) return (sheets[id] = spec.build(spec));
    var m0 = spec.fn(0, null), s = (spec.h - 2) / m0.h;
    var style = spec.style || { rim: spec.rim };
    var opts = { flip: !!spec.flip, remap: spec.remap };
    var frames = [], models = [];
    for (var i = 0; i < IDLE; i++) { var m = i ? spec.fn(i / IDLE, null) : m0; models.push(m); frames.push(render(m, s, style, i, opts)); }
    var atk = spec.fn(0.25, 'attack'); models.push(atk); frames.push(render(atk, s, style, IDLE, opts));
    var fw = frames[0].width, fh = frames[0].height;
    var cv = document.createElement('canvas'); cv.width = fw * FRAMES; cv.height = fh;
    var ctx = cv.getContext('2d');
    frames.forEach(function (f, j) { ctx.drawImage(f, j * fw, 0); });
    var fx = function (ux) { var px = (1 + ux * s) / fw; return spec.flip ? 1 - px : px; };
    var pt = function (q) { return q ? { x: fx(q[0]), y: (1 + q[1] * s) / fh } : null; };
    return (sheets[id] = {
      url: cv.toDataURL(), canvas: cv, frames: FRAMES, fw: fw, fh: fh,
      w: fw * K, h: fh * K,
      anchor: fx(m0.cx != null ? m0.cx : m0.w / 2),
      tip: pt(m0.tip), tipAttack: pt(atk.tipAttack || atk.tip || m0.tip)
    });
  }

  // 그림자 변형: 어두운 보랏빛으로, 눈과 발광은 붉게
  function shadowRemap(hex, mname) {
    var m = MAT[mname];
    if (mname === 'eye' || mname === 'glow' || (m && m.emit)) {
      var e = hexRgb(hex), l = (e[0] * 0.3 + e[1] * 0.5 + e[2] * 0.2) / 255;
      return rgbHex(120 + l * 135, 20 + l * 70, 40 + l * 70);
    }
    var a = hexRgb(hex), lum = (a[0] * 0.3 + a[1] * 0.5 + a[2] * 0.2) / 255;
    return rgbHex(26 + lum * 125, 16 + lum * 72, 46 + lum * 160);
  }

  mat('_missing', '#ff00ff');
  G.Shape = {
    TAU: TAU, K: K, FIRE: FIRE, MAT: MAT, mat: mat, makeRamp: makeRamp, mix: mix, darken: darken,
    E: E, C: C, B: B, P: P, L: L,
    render: render, drawGlow: drawGlow, def: def, variant: variant, has: function (id) { return !!specs[id]; },
    specs: specs, sheet: sheet, shadowRemap: shadowRemap, IDLE: IDLE, FRAMES: FRAMES,
    // 숨쉬기 곡선(0 → 최대 → 0): 위로 들썩이지 않고 살짝 내려앉는다
    bob: function (t, amp) { return (1 - Math.cos(t * TAU)) * 0.5 * (amp == null ? 1.1 : amp); },
    wave: function (t, ph) { return Math.sin(t * TAU + (ph || 0)); }
  };
})();
