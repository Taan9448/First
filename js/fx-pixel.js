// fx-pixel.js — 18단계: 카드 사용 도트 이펙트
// 화면의 1/SCALE 해상도 버퍼(Uint32)에 직접 칠해서 확대한다. 불·독·빛은 열 확산 필드로, 먹 붓 획은 붓털 갈래로 그린다.
// 연출 배정은 data/fx.js. ui-battle.js 가 card:play 때 PFX.play 를 부르고, 첫 타격까지의 시간(ms)을 돌려받는다.
(function () {
  'use strict';
  var G = Game;
  var SCALE = 4;
  var cv = null, ctx = null, img = null, buf = null, W = 0, H = 0;
  var runs = [], raf = 0, last = 0, acc = 0;
  var parts = [], rings = [], beams = [], fields = {};
  var flashV = 0, shakeA = 0, shakeT = 0;

  // ---------------- 색 ----------------
  function hex(h) { var n = parseInt(h.slice(1), 16); return (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0; }
  var PAL = {
    fire: ['#4a0a0a', '#8a1610', '#c8301a', '#ee5a1a', '#ff9426', '#ffcc3a', '#fff08a', '#ffffff'],
    toxic: ['#24083a', '#4a1a7a', '#7a32b8', '#2e9a4a', '#58d24e', '#a4f56a', '#e2ffc8', '#ffffff'],
    holy: ['#4a2e06', '#8a5a0e', '#c8901a', '#f0bc2a', '#ffdc4a', '#fff08a', '#fffbe0', '#ffffff'],
    ice: ['#0c1640', '#18307a', '#2460c4', '#3c9cf4', '#74d0ff', '#b4ecff', '#e4faff', '#ffffff'],
    bolt: ['#14145a', '#2430c0', '#3a6cf4', '#56b8ff', '#96ecff', '#d4fcff', '#fffbe0', '#ffffff'],
    ink: ['#060504', '#14110e', '#2a241e', '#463e34', '#746a5a', '#ada28a', '#e6dcc4', '#ffffff'],
    blood: ['#2a0406', '#5a0a0e', '#9a1216', '#d42020', '#ff4a3a', '#ff8a7a', '#ffd0c8', '#ffffff'],
    heal: ['#06301a', '#0c5a2a', '#16883a', '#26b84a', '#4ee060', '#9cff8a', '#dcffd0', '#ffffff'],
    arcane: ['#1a0838', '#3a1470', '#6a2ab8', '#9a4ae8', '#c080ff', '#e0b0ff', '#f6e4ff', '#ffffff'],
    shadow: ['#0c0614', '#1e1030', '#3a2058', '#5a3a86', '#8a64b8', '#b89ae0', '#e4d8f6', '#ffffff'],
    steel: ['#101418', '#262e38', '#3c4858', '#5a6a7e', '#8494a8', '#b4c2d2', '#e0e8f0', '#ffffff']
  };
  var P = {};
  Object.keys(PAL).forEach(function (k) { P[k] = PAL[k].map(hex); });
  var OL = hex('#140c12'), WASH = hex('#8a8070'), SEAL = hex('#b8221c'), SEALW = hex('#f4dcc4'), HILT = hex('#1a2a5a');
  var BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(function (v) { return (v + 0.5) / 16; });
  function bay(x, y) { return BY[((y & 3) << 2) | (x & 3)]; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function once(st, k) { if (st.once[k]) return false; st.once[k] = true; return true; }

  // ---------------- 캔버스 ----------------
  function host() { return document.getElementById('app'); }
  function ensure() {
    if (cv) return;
    cv = document.createElement('canvas');
    cv.id = 'pfxcanvas';
    host().appendChild(cv);
    ctx = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function resize() {
    if (!cv) return;
    var r = host().getBoundingClientRect();
    W = Math.max(1, Math.ceil(r.width / SCALE)); H = Math.max(1, Math.ceil(r.height / SCALE));
    cv.width = W; cv.height = H;
    img = ctx.createImageData(W, H);
    buf = new Uint32Array(img.data.buffer);
    fields = {};
  }

  // ---------------- 칠하기 ----------------
  function put(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= W || y >= H) return; buf[y * W + x] = c; }
  function putA(x, y, c, a) { if (a == null || a >= 1 || bay(Math.floor(x), Math.floor(y)) < a) put(x, y, c); }
  function rect(x, y, w, h, c, a) { x = Math.round(x); y = Math.round(y); for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) putA(x + i, y + j, c, a); }
  function disc(cx, cy, r, c, a) {
    if (r <= 0) return;
    var r2 = r * r;
    for (var y = Math.floor(cy - r); y <= cy + r; y++) for (var x = Math.floor(cx - r); x <= cx + r; x++) {
      var dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) putA(x, y, c, a);
    }
  }
  function ring(cx, cy, r, th, c, a, ry) {
    ry = ry || 1;
    var ro = r + th / 2, ri = Math.max(0, r - th / 2);
    for (var y = Math.floor(cy - ro * ry) - 1; y <= cy + ro * ry + 1; y++) for (var x = Math.floor(cx - ro) - 1; x <= cx + ro + 1; x++) {
      var dx = x + 0.5 - cx, dy = (y + 0.5 - cy) / ry, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= ro && d >= ri) putA(x, y, c, a);
    }
  }
  function line(x0, y0, x1, y1, c, w, a) {
    var n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (var i = 0; i <= n; i++) {
      var x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      if (w > 1) rect(x - w / 2, y - w / 2, w, w, c, a); else putA(Math.round(x), Math.round(y), c, a);
    }
  }
  function frameRect(x, y, w, h, c, a) {
    x = Math.round(x); y = Math.round(y);
    for (var i = 0; i < w; i++) { putA(x + i, y, c, a); putA(x + i, y + h - 1, c, a); }
    for (var j = 0; j < h; j++) { putA(x, y + j, c, a); putA(x + w - 1, y + j, c, a); }
  }
  // 투명 캔버스 위에 한 색을 a 만큼 덮는다(암전·번쩍임·붉은 물듦)
  function wash(c, a) {
    if (a <= 0) return;
    var cr = c & 255, cg = (c >> 8) & 255, cb = (c >>> 16) & 255;
    for (var i = 0; i < W * H; i++) {
      var o = buf[i], oa = (o >>> 24) / 255;
      if (!oa) { buf[i] = ((Math.round(a * 255) << 24) | (cb << 16) | (cg << 8) | cr) >>> 0; continue; }
      var na = oa + (1 - oa) * a, f = a / na;
      var r = (o & 255) * (1 - f) + cr * f, g = ((o >> 8) & 255) * (1 - f) + cg * f, b = ((o >>> 16) & 255) * (1 - f) + cb * f;
      buf[i] = ((Math.round(na * 255) << 24) | (b << 16) | (g << 8) | r) >>> 0;
    }
  }

  // ---------------- 열 확산 필드 (불길 · 독불 · 빛불) ----------------
  var TH = [0.07, 0.15, 0.25, 0.37, 0.5, 0.63, 0.77, 0.9];
  var DEC = { fire: 0.972, toxic: 0.968, holy: 0.976, blood: 0.966, ice: 0.96 };
  function field(n) { return fields[n] || (fields[n] = { h: new Float32Array(W * H), t: new Float32Array(W * H), pal: P[n], live: 0, dec: DEC[n] || 0.97 }); }
  function heat(n, cx, cy, r, amt) {
    var f = field(n);
    f.live = 120;
    var x0 = Math.max(1, Math.floor(cx - r)), x1 = Math.min(W - 2, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var dx = x - cx, dy = y - cy, d2 = (dx * dx + dy * dy) / ((r + 0.01) * (r + 0.01));
      if (d2 > 1) continue;
      var i = y * W + x, v = amt * (1 - d2) * (0.65 + Math.random() * 0.55);
      if (v > f.h[i]) f.h[i] = v > 1.25 ? 1.25 : v;
    }
  }
  function stepField(f) {
    if (f.live <= 0) return;
    f.live--;
    var h = f.h, t = f.t, dec = f.dec, any = false;
    for (var y = 0; y < H; y++) {
      var row = y * W;
      for (var x = 1; x < W - 1; x++) {
        var i = row + x, v;
        if (y >= H - 1) v = h[i] * 0.8;
        else {
          var s = x + ((Math.random() * 3) | 0) - 1;
          if (s < 1) s = 1; else if (s > W - 2) s = W - 2;
          var b = row + W + s;
          v = (h[b - 1] + h[b] * 2 + h[b + 1] + h[i]) * 0.2 * dec - Math.random() * 0.03;
        }
        if (v < 0.01) v = 0; else any = true;
        t[i] = v;
      }
    }
    f.h = t; f.t = h;
    if (any && f.live < 3) f.live = 3;
  }
  function drawField(f) {
    if (f.live <= 0) return;
    var h = f.h, pal = f.pal;
    for (var i = W; i < W * H; i++) {
      var v = h[i];
      if (v < 0.07) continue;
      var k = 0;
      while (k < 7 && v >= TH[k + 1]) k++;
      buf[i] = pal[k];
    }
  }

  // ---------------- 입자 ----------------
  function add(p) {
    p.age = 0;
    if (p.life == null) p.life = 0.5;
    p.vx = p.vx || 0; p.vy = p.vy || 0; p.g = p.g || 0; p.drag = p.drag || 0; p.s = p.s || 1; p.pal = p.pal || 'fire';
    parts.push(p);
    return p;
  }
  function stepParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); if (p.onDie) p.onDie(p); continue; }
      if (p.home) {
        var ax = (p.home.x - p.x) * p.home.k - p.vx * p.home.d, ay = (p.home.y - p.y) * p.home.k - p.vy * p.home.d;
        p.vx += ax * dt; p.vy += ay * dt;
      }
      p.vy += p.g * dt;
      if (p.drag) { var d = Math.pow(1 - p.drag, dt * 60); p.vx *= d; p.vy *= d; }
      if (p.kind === 'feather') p.vx = Math.sin(p.age * 5 + p.ph) * 14;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.floor != null && p.y > p.floor) { p.y = p.floor; p.vy *= -0.25; p.vx *= 0.5; }
      if (p.heat) heat(p.heat, p.x, p.y, p.hr || 2, p.ha || 0.9);
      if (p.trail && Math.random() < p.trail) add({ x: p.x, y: p.y, life: 0.25, pal: p.pal, hot: 5, cold: 1 });
    }
  }
  function drawParts() {
    for (var n = 0; n < parts.length; n++) {
      var p = parts[n], r = p.age / p.life, pal = P[p.pal];
      var hot = p.hot == null ? 7 : p.hot, cold = p.cold == null ? 1 : p.cold;
      var c = pal[clamp(Math.round(hot + (cold - hot) * r), 0, 7)];
      var a = p.fade === false ? 1 : r < 0.6 ? 1 : 1 - (r - 0.6) / 0.4;
      var x = Math.round(p.x), y = Math.round(p.y), j, cc;
      if (p.kind === 'spark') {
        var L = Math.max(0, Math.round(p.s * (1 - r)));
        put(x, y, pal[7]);
        for (j = 1; j <= L; j++) { cc = pal[clamp(6 - j, 1, 7)]; putA(x + j, y, cc, a); putA(x - j, y, cc, a); putA(x, y + j, cc, a); putA(x, y - j, cc, a); }
      } else if (p.kind === 'streak') {
        var sp = Math.hypot(p.vx, p.vy) || 1, SL = p.len || 6, ux = p.vx / sp, uy = p.vy / sp;
        for (j = 0; j < SL; j++) { cc = j < 2 ? pal[7] : pal[clamp(6 - Math.floor(j * 5 / SL), 1, 7)]; putA(x - ux * j, y - uy * j, cc, 1 - j / SL); }
      } else if (p.kind === 'bubble') {
        ring(p.x, p.y, p.s, 1, c, a);
      } else if (p.kind === 'feather') {
        var hz = Math.sin(p.age * 5 + p.ph) > 0;
        rect(x - (hz ? 1 : 0), y - (hz ? 0 : 1), hz ? 3 : 1, hz ? 1 : 3, c, a);
        put(x, y, pal[7]);
      } else {
        rect(x - (p.s >> 1), y - (p.s >> 1), p.s, p.s, c, a);
      }
    }
  }
  function ringFx(x, y, r0, r1, life, pal, th, ry) { rings.push({ x: x, y: y, r0: r0, r1: r1, life: life, pal: pal, th: th || 2, ry: ry || 1, age: 0 }); }
  function beam(x, y, ang, len, life, pal) { beams.push({ x: x, y: y, ang: ang, len: len, life: life, pal: pal, age: 0 }); }
  function flash(v) { if (!G.FX.low) flashV = Math.max(flashV, v); }
  // 화면 흔들림은 전장 흔들기(G.FX.shake)로 넘긴다
  function shake(t, a) { if (a >= shakeA || shakeT <= 0) { shakeA = a; shakeT = t; G.FX.shake(a >= 3); } }

  function burst(x, y, pal, n, spd, o) {
    o = o || {};
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = spd * (0.25 + Math.random() * 0.75);
      add({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up || 0), life: rnd(0.3, 0.75), pal: pal, s: Math.random() < 0.3 ? 2 : 1, drag: 0.05,
        g: o.g == null ? 70 : o.g, hot: 7, cold: 1, heat: o.heat && Math.random() < 0.3 ? o.heat : null, hr: 1.6, ha: 0.75, floor: o.floor });
    }
  }
  function sparks(x, y, pal, n, spd) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = (spd || 70) * (0.4 + Math.random() * 0.6);
      add({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.3, 0.6), pal: pal, s: Math.random() < 0.5 ? 3 : 2, drag: 0.08 });
    }
  }
  function converge(x, y, pal, R) {
    var a = Math.random() * Math.PI * 2, r = R * (0.8 + Math.random() * 0.4), t = 0.22;
    add({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: -Math.cos(a) * r / t, vy: -Math.sin(a) * r / t, life: t, pal: pal, hot: 7, cold: 4, s: 1, fade: false });
  }

  // ---------------- 모양 ----------------
  function brush(pt, prog, a, wmax, gold) {
    var N = 80, n = Math.floor(N * clamp(prog, 0, 1));
    if (n < 1) return;
    for (var pass = 0; pass < 3; pass++) for (var i = 0; i <= n; i++) {
      var u = i / N, q = pt(u), q2 = pt(Math.min(1, u + 0.0125));
      var nx = -(q2[1] - q[1]), ny = q2[0] - q[0], L = Math.hypot(nx, ny) || 1;
      nx /= L; ny /= L;
      var w = 0.4 + wmax * Math.pow(Math.sin(Math.PI * u), 0.7);
      if (pass === 0) disc(q[0], q[1], w + 1.2, gold ? P.ink[0] : P.ink[5], gold ? a : a * 0.5);
      else if (pass === 1) disc(q[0], q[1], w, gold ? P.holy[5] : P.ink[0], a);
      else if (gold) disc(q[0], q[1], Math.max(0.6, w * 0.4), P.holy[7], a);
      else putA(q[0] + nx * w * 0.5, q[1] + ny * w * 0.5, P.ink[7], a);
    }
  }
  function boltPath(x0, y0, x1, y1, segs, jit, jy) {
    var pts = [[x0, y0]];
    if (jy == null) jy = jit * 0.3;
    for (var i = 1; i < segs; i++) { var u = i / segs; pts.push([x0 + (x1 - x0) * u + rnd(-jit, jit), y0 + (y1 - y0) * u + rnd(-jy, jy)]); }
    pts.push([x1, y1]);
    return pts;
  }
  function drawBolt(pts, a, pn) {
    var B = P[pn || 'bolt'];
    [[4, B[2], 0.55 * a], [2, B[4], a], [1, B[7], a]].forEach(function (s) {
      for (var i = 1; i < pts.length; i++) line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], s[1], s[0], s[2]);
    });
  }
  function drawSpike(x, base, h, w, g, lean) {
    var I = P.ice, hh = h * g;
    if (hh < 1) return;
    var top = base - hh;
    for (var y = Math.floor(top); y <= base; y++) {
      var f = (y - top) / hh, half = Math.max(0.5, w * f), cx = x + lean * (1 - f);
      for (var xx = Math.floor(cx - half); xx <= Math.ceil(cx + half); xx++) {
        var c = xx < cx ? I[6] : I[3];
        if (Math.abs(xx - cx) > half - 1) c = I[1];
        if (y <= top + 1) c = I[7];
        put(xx, y, c);
      }
    }
  }
  function drawPillar(x, top, bottom, a, t, palN, wd) {
    var Pl = P[palN || 'holy'], k = wd || 1;
    for (var y = Math.floor(top); y <= bottom; y++) {
      var sh = Math.sin(y * 0.45 - t * 18) * 0.5 + 0.5;
      [[6, Pl[3], 0.45 * a], [4, Pl[5], 0.8 * a * (0.6 + sh * 0.4)], [2, Pl[6], a], [0, Pl[7], a]].forEach(function (b) {
        var r = Math.round(b[0] * k);
        for (var xx = -r; xx <= r; xx++) putA(x + xx, y, b[1], b[2]);
      });
    }
  }
  function drawCloud(x, y, a, lit) {
    var d = hex('#1c1e36'), m = lit ? P.bolt[3] : hex('#2c3052'), tp = lit ? P.bolt[5] : hex('#444a76');
    var B = [[-11, 3, 6], [0, 0, 8], [11, 3, 6], [5, 5, 6], [-5, 5, 5]];
    B.forEach(function (b) { disc(x + b[0], y + b[1] + 1, b[2], d, a); });
    B.forEach(function (b) { disc(x + b[0], y + b[1], b[2] - 1, m, a); });
    B.forEach(function (b) { disc(x + b[0] - 1, y + b[1] - 2, b[2] - 3, tp, a); });
  }
  // 먹 붓 획: 먹 고임 → 붓털 갈래(갈필) → 번짐과 먹물 튐
  function makeInk(p0, p1, p2, p3, wmax) {
    var N = 90, pts = [], nrm = [], wid = [], i, k;
    for (i = 0; i <= N; i++) {
      var u = i / N, v = 1 - u;
      pts.push([v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]);
    }
    for (i = 0; i <= N; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
      var nx = -(b[1] - a[1]), ny = b[0] - a[0], L = Math.hypot(nx, ny) || 1, uu = i / N;
      nrm.push([nx / L, ny / L]);
      wid.push(wmax * (uu < 0.1 ? 0.75 + uu * 4.5 : Math.max(0.15, 1.2 - 1.05 * Math.pow((uu - 0.1) / 0.9, 1.15))));
    }
    var br = [], BR = 13;
    for (k = 0; k < BR; k++) {
      var o = -1 + (2 * k) / (BR - 1), end = 0.45 + 0.55 * (1 - Math.abs(o) * 0.55) * (0.6 + Math.random() * 0.4), dry = [], on = true;
      for (i = 0; i <= N; i++) {
        var w = i / N;
        if (w > end) on = false;
        else if (w > 0.28) { var pp = (w - 0.28) * (0.5 + Math.abs(o)) * 0.5; if (on && Math.random() < pp) on = false; else if (!on && Math.random() < 0.3) on = true; }
        dry.push(!on);
      }
      br.push({ o: o * 0.95 + rnd(-0.05, 0.05), dry: dry, tone: Math.random() < 0.22 ? 2 : Math.random() < 0.3 ? 1 : 0 });
    }
    var pool = [];
    for (k = 0; k < 7; k++) { var an = rnd(0, Math.PI * 2), rr = wmax * rnd(0.3, 0.9); pool.push([p0[0] + Math.cos(an) * rr, p0[1] + Math.sin(an) * rr, wmax * rnd(0.55, 0.95)]); }
    var splats = [];
    for (k = 0; k < 7; k++) {
      var j = Math.floor(rnd(0.15, 0.85) * N), sg = Math.random() < 0.5 ? -1 : 1, off = wid[j] + rnd(2, 9);
      var sx = pts[j][0] + nrm[j][0] * off * sg, sy = pts[j][1] + nrm[j][1] * off * sg;
      splats.push([sx, sy, rnd(0.7, 2.1)]);
      if (Math.random() < 0.6) splats.push([sx + rnd(-3, 3), sy + rnd(-3, 3), 0.6]);
    }
    var dx = pts[N][0] - pts[N - 4][0], dy = pts[N][1] - pts[N - 4][1], dl = Math.hypot(dx, dy) || 1;
    for (k = 0; k < 4; k++) { var s = rnd(3, 14); splats.push([p3[0] + (dx / dl) * s + rnd(-2, 2), p3[1] + (dy / dl) * s + rnd(-2, 2), rnd(0.5, 1.1)]); }
    return { pts: pts, nrm: nrm, wid: wid, br: br, N: N, pool: pool, splats: splats };
  }
  function drawInk(S, prog, a, wsh) {
    var n = Math.floor(S.N * clamp(prog, 0, 1)), i, q;
    if (n < 1) return;
    if (wsh > 0) {
      for (i = 0; i <= n; i += 2) { q = S.pts[i]; disc(q[0], q[1], S.wid[i] + 2.6, WASH, wsh * a); }
      if (prog >= 1) S.splats.forEach(function (s) { disc(s[0], s[1], s[2] + 1.4, WASH, wsh * a); });
    }
    S.pool.forEach(function (d) { disc(d[0], d[1], d[2], P.ink[0], a); });
    S.br.forEach(function (b) {
      var c = P.ink[b.tone];
      for (var k = 0; k <= n; k++) {
        if (b.dry[k]) continue;
        var p = S.pts[k], nn = S.nrm[k], w = S.wid[k], x = p[0] + nn[0] * b.o * w, y = p[1] + nn[1] * b.o * w;
        putA(x, y, c, a); putA(x + 1, y, c, a); putA(x, y + 1, c, a);
      }
    });
    if (prog >= 1) S.splats.forEach(function (s) { disc(s[0], s[1], s[2], P.ink[0], a); });
  }
  var SEAL_G = ['1110111', '0101010', '1111111', '0010100', '1111111', '0101010', '1010101'];
  function drawSeal(x, y, a) {
    rect(x, y, 9, 9, SEAL, a);
    for (var j = 0; j < 7; j++) for (var i = 0; i < 7; i++) if (SEAL_G[j][i] === '1') putA(x + 1 + i, y + 1 + j, SEALW, a);
  }
  function drawSword(x, y, ang, a) {
    var cx = Math.cos(ang), cy = Math.sin(ang), px = -cy, py = cx;
    line(x, y, x + cx * 13, y + cy * 13, P.ice[3], 3, 0.4 * a);
    line(x, y, x + cx * 12, y + cy * 12, P.ice[5], 2, a);
    line(x + cx, y + cy, x + cx * 12, y + cy * 12, P.ice[7], 1, a);
    line(x - px * 3, y - py * 3, x + px * 3, y + py * 3, P.ice[2], 1, a);
    line(x, y, x - cx * 4, y - cy * 4, HILT, 1, a);
  }
  // 작은 도트 그림: [x, y, w, h, 색] 목록 → 테두리를 두른 픽셀 목록
  function sprite(w, h, rects) {
    var g = new Array(w * h).fill(0);
    rects.forEach(function (r) { var c = hex(r[4]); for (var j = 0; j < r[3]; j++) for (var i = 0; i < r[2]; i++) { var x = r[0] + i, y = r[1] + j; if (x >= 0 && y >= 0 && x < w && y < h) g[y * w + x] = c; } });
    function at(x, y) { return x >= 0 && y >= 0 && x < w && y < h ? g[y * w + x] : 0; }
    var px = [];
    for (var y = -1; y <= h; y++) for (var x = -1; x <= w; x++) {
      var c = at(x, y);
      if (c) px.push([x, y, c]);
      else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) px.push([x, y, OL]);
    }
    return px;
  }
  function drawSprite(px, ox, oy) { ox = Math.round(ox); oy = Math.round(oy); px.forEach(function (q) { put(ox + q[0], oy + q[1], q[2]); }); }
  var DHEAD = sprite(13, 10, [[0, 3, 8, 4, '#c0302a'], [6, 2, 4, 4, '#c0302a'], [8, 4, 5, 2, '#d8402e'], [2, 1, 3, 2, '#c0302a'], [3, 0, 1, 2, '#ffd23f'], [5, 0, 1, 1, '#ffd23f'], [7, 3, 1, 1, '#ffe066'], [9, 6, 3, 1, '#fff6c8'], [0, 7, 6, 2, '#8a1a14']]);

  // ================= 연출 =================
  // c: { C: 카드 위치, card: 카드 사각형, hero: 시전자 상자, targets: [상자], leg } — 모두 버퍼 좌표
  // 상자: { x: 가운데, y: 몸 가운데, top, foot, h, z: 크기 배율 }
  function each(c, st, gap, fn) {
    c.targets.forEach(function (b, k) {
      var s = st.o[k] || (st.o[k] = { once: {} });
      fn(b, k, s, k * gap);
    });
  }

  function orb(pal) {
    return { ch: pal, sh: pal, hit: 0.3, dur: 1.7,
      run: function (T, dt, st, c) {
        each(c, st, 0.06, function (b, k, s, d) {
          var t = T - d;
          if (t < 0) return;
          if (t < 0.3) {
            var p = t / 0.3, x = lerp(c.C.x, b.x, p), y = lerp(c.C.y, b.y, p) - Math.sin(p * Math.PI) * 18 * b.z;
            heat(pal, x, y, 4.5 * b.z, 1.1); heat(pal, x - 4 * b.z, y + 1, 3.5 * b.z, 0.85);
            if (Math.random() < 0.8) add({ x: x + rnd(-2, 2), y: y + rnd(-2, 2), vx: rnd(-40, -10), vy: rnd(-25, 5), life: rnd(0.25, 0.5), pal: pal, hot: 6, cold: 1, drag: 0.04 });
            s.ball = [x, y, b.z];
          } else s.ball = null;
          if (t >= 0.3 && once(s, 'hit')) {
            heat(pal, b.x, b.y, 13 * b.z, 1.25);
            burst(b.x, b.y, pal, 46, 120 * b.z, { heat: pal, floor: b.foot + 2 });
            sparks(b.x, b.y, pal, 9, 90 * b.z);
            ringFx(b.x, b.y, 4, 30 * b.z, 0.35, pal, 2);
            if (k === 0) { shake(0.22, 2); flash(0.14); }
          }
          if (t > 0.3 && t < 1.2) {
            heat(pal, b.x + rnd(-13, 13) * b.z, b.foot - rnd(0, 3), rnd(2, 4) * b.z, rnd(0.75, 1.05));
            if (Math.random() < 0.15) add({ kind: 'spark', x: b.x + rnd(-12, 12) * b.z, y: b.foot - rnd(4, 20) * b.z, vy: rnd(-40, -20), life: 0.4, pal: pal, s: 2 });
          }
        });
      },
      draw: function (T, st) {
        st.o.forEach(function (s) { if (s.ball) { disc(s.ball[0], s.ball[1], 3.6 * s.ball[2], P[pal][5]); disc(s.ball[0], s.ball[1], 2.2 * s.ball[2], P[pal][7]); } });
      } };
  }

  function inkFx(gold) {
    return { ch: 'holy', sh: 'ink', hit: 0.06, dur: 1.4,
      run: function (T, dt, st, c) {
        each(c, st, 0.08, function (b, k, s, d) {
          var t = T - d, z = b.z;
          if (t < 0) return;
          if (!s.S) {
            var m = (k + (Math.random() < 0.5 ? 1 : 0)) % 2 ? -1 : 1;
            var X = function (dx) { return b.x + dx * z * m; };
            s.S = makeInk([X(-34), b.y - 26 * z], [X(-6), b.y - 24 * z], [X(2), b.y + 12 * z], [X(30), b.y + 22 * z], 6.5 * z);
            s.m = m;
          }
          if (t >= 0.06 && once(s, 'hit')) {
            var S = s.S, i, q, nn;
            for (i = 0; i < 30; i++) {
              var j = Math.floor(rnd(0.1, 0.9) * S.N), sg = Math.random() < 0.5 ? -1 : 1, v = rnd(30, 110) * z;
              q = S.pts[j]; nn = S.nrm[j];
              add({ x: q[0], y: q[1], vx: nn[0] * sg * v + rnd(10, 50) * s.m, vy: nn[1] * sg * v + rnd(-20, 10), g: 170, drag: 0.03, life: rnd(0.4, 0.9), pal: 'ink', hot: 0, cold: 1, s: Math.random() < 0.35 ? 2 : 1, floor: b.foot + rnd(0, 4) });
            }
            for (i = 0; i < 8; i++) {
              q = S.pts[Math.floor(rnd(0.3, 0.8) * S.N)];
              add({ x: q[0], y: q[1], vx: rnd(10, 70) * s.m, vy: rnd(-60, 0), g: 160, drag: 0.02, life: rnd(0.5, 0.9), pal: 'blood', hot: 4, cold: 2, s: Math.random() < 0.3 ? 2 : 1, floor: b.foot + rnd(0, 4) });
            }
            if (gold) { sparks(b.x, b.y, 'holy', 12, 100 * z); ringFx(b.x, b.y, 3, 34 * z, 0.4, 'holy', 2); }
            if (k === 0) { shake(0.16, gold ? 3 : 2); flash(gold ? 0.25 : 0.1); }
          }
        });
      },
      draw: function (T, st, c) {
        each(c, st, 0.08, function (b, k, s, d) {
          var t = T - d;
          if (t < 0 || !s.S) return;
          var S = s.S, a = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.55;
          if (t < 0.035) for (var i = 0; i <= S.N; i++) put(S.pts[i][0], S.pts[i][1] - 1, P.ink[7]);
          if (a <= 0) return;
          drawInk(S, t / 0.09, a, Math.min(1, t / 0.15) * 0.45);
          if (gold && t < 1.2) {
            var z = b.z, L0 = [b.x - 40 * z * s.m, b.y - 34 * z], L1 = [b.x + 34 * z * s.m, b.y + 30 * z];
            brush(function (u) { return [lerp(L0[0], L1[0], u), lerp(L0[1], L1[1], u)]; }, t / 0.07, a, 2.6 * z, true);
          }
          if (t >= 0.18) drawSeal(Math.round(b.x + 22 * b.z * s.m - (s.m < 0 ? 9 : 0)), Math.round(b.y - 8 * b.z), Math.min(1, (t - 0.18) / 0.06) * a);
        });
      } };
  }

  // ================= 27단계 연출 도구 =================
  // 초승달 베기: 가운데(cx, cy) 반지름 r, 각도 a0 → a1, 굵기 th. 바깥 가장자리가 가장 밝다(pal 의 7 → 5 → 3)
  function crescent(cx, cy, r, a0, a1, th, pal, a, edgePal) {
    var span = Math.abs(a1 - a0), n = Math.max(8, Math.ceil(r * span * 1.6)), E = P[edgePal || pal];
    for (var i = 0; i <= n; i++) {
      var s = i / n, ang = a0 + (a1 - a0) * s, w = th * Math.sin(Math.PI * s);
      for (var k = 0; k <= w; k += 0.6) {
        var rr = r - k, x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
        putA(x, y, k < 1 ? E[7] : k < w * 0.45 ? P[pal][5] : P[pal][3], a * (k < 1 ? 1 : 0.9));
      }
    }
  }
  // 하늘에서 떨어지는 거대한 검(끝이 아래, tip 이 칼끝)
  function drawGreatSword(x, tip, len, w, a, pal) {
    var Q = P[pal || 'holy'];
    for (var j = 0; j < len; j++) {
      var u = j / len, hw = Math.max(0.5, w * (u < 0.15 ? u / 0.15 : 1) * (1 - u * 0.15)), y = tip - j;
      for (var i = -Math.ceil(hw) - 1; i <= Math.ceil(hw) + 1; i++) {
        var ad = Math.abs(i);
        if (ad > hw + 1) continue;
        putA(x + i, y, ad > hw ? OL : i < -hw * 0.3 ? Q[3] : ad < 1 ? Q[7] : Q[5], a);
      }
    }
    var gy = tip - len;
    rect(x - w * 2.6, gy - 2, w * 5.2, 3, Q[4], a); rect(x - w * 2.6, gy - 2, w * 5.2, 1, Q[6], a);   // 코등이
    rect(x - 1.5, gy - 9, 3, 7, HILT, a);                                                            // 손잡이
    disc(x, gy - 10.5, 2.2, Q[4], a); disc(x - 0.5, gy - 11, 1, Q[7], a);                             // 칼자루 끝
  }
  // 붉은 별빛: 가로·세로 긴 빛줄기, 대각선 짧은 빛줄기
  function starFlare(x, y, r, pal, a) {
    var Q = P[pal];
    line(x - r, y, x + r, y, Q[5], 2, a); line(x, y - r * 0.8, x, y + r * 0.8, Q[5], 2, a);
    line(x - r * 1.3, y, x + r * 1.3, y, Q[7], 1, a); line(x, y - r, x, y + r, Q[7], 1, a);
    var d = r * 0.42;
    line(x - d, y - d, x + d, y + d, Q[4], 1, a * 0.8); line(x - d, y + d, x + d, y - d, Q[4], 1, a * 0.8);
    disc(x, y, r * 0.22, Q[6], a); disc(x, y, r * 0.12, Q[7], a);
  }
  // 끝이 가는 직선 베기
  function slashLine(x0, y0, x1, y1, w, pal, a) {
    var L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(4, Math.ceil(L)), Q = P[pal];
    for (var i = 0; i <= n; i++) {
      var u = i / n, ww = w * Math.sin(Math.PI * u), x = lerp(x0, x1, u), y = lerp(y0, y1, u);
      disc(x, y, ww + 0.8, Q[3], a * 0.7); disc(x, y, ww, Q[5], a); if (ww > 0.6) disc(x, y, ww * 0.45, Q[7], a);
    }
  }

  var FXS = {
    fireOrb: orb('fire'), arcaneOrb: orb('arcane'), shadowOrb: orb('shadow'),
    // 27단계 · 빙결 초승달(1번 참고): 시전자 앞에 얼음 초승달이 소용돌이친 뒤, 얼음 베기가 적을 엇갈려 가른다
    frostCrescent: { ch: 'ice', sh: 'ice', hit: 0.55, dur: 1.9, dim: 0.35,
      run: function (T, dt, st, c) {
        var h = c.hero || { x: c.C.x, y: c.C.y, z: 1 };
        if (T < 0.55) { heat('ice', h.x + 12 * h.z + rnd(-6, 6), h.y + rnd(-6, 6), 2.5, 0.8); if (Math.random() < 0.5) add({ kind: 'spark', x: h.x + 12 * h.z + rnd(-14, 14), y: h.y + rnd(-12, 12), life: 0.3, pal: 'ice', s: 2 }); }
        if (T >= 0.55 && once(st, 'hit')) {
          st.sl = [];
          c.targets.forEach(function (b, k) {
            for (var i = 0; i < 9; i++) {
              var ang = rnd(0, Math.PI), L = rnd(26, 40) * b.z;
              st.sl.push({ x: b.x + rnd(-5, 5) * b.z, y: b.y + rnd(-8, 6) * b.z, ang: ang, L: L, t0: 0.55 + i * 0.045 + k * 0.03 });
            }
            burst(b.x, b.y, 'ice', 30, 100 * b.z, { floor: b.foot + 2 }); ringFx(b.x, b.y, 3, 30 * b.z, 0.35, 'ice', 2); heat('ice', b.x, b.y, 12 * b.z, 1.1);
          });
          flash(0.22); shake(0.2, 2);
        }
        if (T > 0.6 && T < 1.4) c.targets.forEach(function (b) { if (Math.random() < 0.3) add({ x: b.x + rnd(-12, 12) * b.z, y: b.y + rnd(-14, 10) * b.z, vy: rnd(-30, -5), life: 0.5, pal: 'ice', hot: 7, cold: 4, s: 1 }); });
      },
      draw: function (T, st, c) {
        var h = c.hero || { x: c.C.x, y: c.C.y, z: 1 };
        if (T < 0.75) {
          var a = T < 0.1 ? T / 0.1 : T > 0.6 ? (0.75 - T) / 0.15 : 1, cx = h.x + 12 * h.z, cy = h.y;
          for (var k = 0; k < 3; k++) { var rot = T * 13 + k * 2.1; crescent(cx, cy, (9 + T * 16) * h.z, rot, rot + 2.3, 4.5 * h.z, 'ice', a, 'steel'); }
        }
        (st.sl || []).forEach(function (q) {
          var t = T - q.t0;
          if (t < 0 || t > 0.32) return;
          var p = Math.min(1, t / 0.08), a = t < 0.2 ? 1 : (0.32 - t) / 0.12, dx = Math.cos(q.ang) * q.L / 2, dy = Math.sin(q.ang) * q.L / 2;
          slashLine(q.x - dx, q.y - dy, q.x - dx + dx * 2 * p, q.y - dy + dy * 2 * p, 1.6, 'ice', a);
        });
      } },

    // 27단계 · 천검강림(2번 참고): 시전자에게 금빛이 모인 뒤, 하늘에서 거대한 금빛 검 셋이 적에게 꽂힌다
    skyBlades: { ch: 'holy', sh: 'holy', hit: 0.85, dur: 2.2, dim: 0.45,
      run: function (T, dt, st, c) {
        var h = c.hero || { x: c.C.x, y: c.C.y, z: 1 }, b = c.targets[0];
        if (T < 0.5 && Math.random() < 0.7) converge(h.x, h.y, 'holy', 14);
        if (!st.bl) {
          st.bl = [];
          c.targets.forEach(function (t, k) {
            (k ? [0] : [-1, 0, 1]).forEach(function (o, i) { st.bl.push({ b: t, x: t.x + o * 15 * t.z, land: t.foot - 2, t0: 0.5 + i * 0.12 + k * 0.08, len: 50 * t.z, w: 3.6 * t.z }); });
          });
        }
        st.bl.forEach(function (s, i) {
          var u = clamp((T - s.t0) / 0.25, 0, 1);
          s.tip = lerp(-10, s.land, u * u);
          if (u >= 1 && once(st, 'land' + i)) {
            var t = s.b;
            ringFx(s.x, s.land, 3, 30 * t.z, 0.45, 'holy', 2, 0.35); burst(s.x, s.land - 4, 'steel', 22, 90 * t.z, { floor: t.foot + 2 });
            burst(s.x, s.land - 6, 'holy', 18, 80 * t.z, { heat: 'holy' }); heat('holy', s.x, s.land - 4, 9 * t.z, 1.1);
            flash(0.18); shake(0.18, 2 + (i === 1 ? 1 : 0));
          }
        });
        if (T >= 0.95 && once(st, 'dome')) { c.targets.forEach(function (t) { ringFx(t.x, t.foot - 6, 4, 44 * t.z, 0.5, 'holy', 3, 0.6); for (var j = 0; j < 8; j++) beam(t.x, t.foot - 8, -Math.PI / 2 + rnd(-1.2, 1.2), rnd(24, 40) * t.z, 0.4, 'holy'); }); flash(0.35); shake(0.28, 3); }
        if (T > 0.95 && T < 1.8) c.targets.forEach(function (t) { heat('holy', t.x + rnd(-18, 18) * t.z, t.foot - rnd(0, 4), rnd(2, 3.5), rnd(0.6, 0.9)); });
      },
      draw: function (T, st) {
        (st.bl || []).forEach(function (s) {
          if (T < s.t0 || T > 1.9) return;
          var a = T > 1.6 ? (1.9 - T) / 0.3 : 1;
          if (s.tip < s.land) line(s.x, s.tip - s.len - 16, s.x, s.tip - s.len, P.holy[5], 1, 0.5 * a);   // 떨어지는 빛줄기
          drawGreatSword(s.x, s.tip, s.len, s.w, a, 'holy');
        });
      } },

    // 27단계 · 혈성(3번 참고): 시전자에게 붉은 별빛이 번쩍이고, 핏빛 X자 베기와 세 줄 할퀴기가 적을 가른다
    bloodStar: { ch: 'blood', sh: 'blood', hit: 0.5, dur: 2.0, dim: 0.55,
      run: function (T, dt, st, c) {
        var h = c.hero || { x: c.C.x, y: c.C.y, foot: c.C.y + 20, z: 1 };
        if (T < 0.4 && Math.random() < 0.6) add({ kind: 'spark', x: h.x + rnd(-16, 16) * h.z, y: h.y + rnd(-16, 16) * h.z, life: 0.3, pal: 'blood', s: 2 });
        [[0.5, 'x'], [0.95, 'claw']].forEach(function (ev) {
          if (T >= ev[0] && once(st, ev[1])) {
            c.targets.forEach(function (b) {
              heat('blood', b.x, b.y, 12 * b.z, 1.2);
              for (var i = 0; i < 26; i++) add({ x: b.x + rnd(-6, 6) * b.z, y: b.y + rnd(-8, 6) * b.z, vx: rnd(-70, 90) * b.z, vy: rnd(-90, 10), g: 220, drag: 0.02, life: rnd(0.5, 1.0), pal: 'blood', hot: 4, cold: 1, s: Math.random() < 0.4 ? 2 : 1, floor: b.foot + rnd(0, 4) });
              ringFx(b.x, b.y, 3, 28 * b.z, 0.35, 'blood', 2);
            });
            flash(ev[1] === 'claw' ? 0.35 : 0.25); shake(0.22, ev[1] === 'claw' ? 3 : 2);
          }
        });
        if (T > 0.5 && T < 1.8) c.targets.forEach(function (b) { heat('blood', b.x + rnd(-16, 16) * b.z, b.foot, rnd(2, 3), rnd(0.6, 0.85)); });
      },
      draw: function (T, st, c) {
        var h = c.hero || { x: c.C.x, y: c.C.y, z: 1 };
        if (T < 0.5) { var a = T < 0.08 ? T / 0.08 : T > 0.38 ? (0.5 - T) / 0.12 : 1; starFlare(h.x + 10 * h.z, h.y - 4 * h.z, (14 + T * 30) * h.z, 'blood', a); }
        c.targets.forEach(function (b) {
          var z = b.z, t = T - 0.5;
          if (T > 0.35 && T < 0.55) { var u = (T - 0.35) / 0.15; slashLine(h.x + 10 * h.z, h.y, lerp(h.x, b.x, u), lerp(h.y, b.y, u), 1.2, 'blood', 0.9); }
          if (t >= 0 && t < 0.45) {
            var p = Math.min(1, t / 0.07), a2 = t < 0.3 ? 1 : (0.45 - t) / 0.15;
            slashLine(b.x - 22 * z, b.y - 20 * z, b.x - 22 * z + 44 * z * p, b.y - 20 * z + 40 * z * p, 3 * z, 'blood', a2);
            if (t > 0.06) { var p2 = Math.min(1, (t - 0.06) / 0.07); slashLine(b.x + 22 * z, b.y - 20 * z, b.x + 22 * z - 44 * z * p2, b.y - 20 * z + 40 * z * p2, 3 * z, 'blood', a2); }
          }
          var t3 = T - 0.95;
          if (t3 >= 0 && t3 < 0.45) {
            var p3 = Math.min(1, t3 / 0.08), a3 = t3 < 0.3 ? 1 : (0.45 - t3) / 0.15;
            for (var j = -1; j <= 1; j++) crescent(b.x - 4 * z, b.y + j * 8 * z - 30 * z, 34 * z, Math.PI * 0.2, Math.PI * (0.2 + 0.6 * p3), 3 * z, 'blood', a3);
          }
        });
      } },

    // 27단계 · 초승달 연참(cap 참고): 적 둘레에서 먹빛·은빛 초승달 베기가 사방으로 몰아친다
    crescentStorm: { ch: 'steel', sh: 'steel', hit: 0.12, dur: 1.7, dim: 0.3,
      run: function (T, dt, st, c) {
        if (!st.cr) {
          st.cr = [];
          c.targets.forEach(function (b, k) {
            for (var i = 0; i < 7; i++) st.cr.push({ b: b, x: b.x + rnd(-8, 8) * b.z, y: b.y + rnd(-10, 6) * b.z, r: rnd(14, 22) * b.z, a0: rnd(0, Math.PI * 2), sp: rnd(2, 2.8) * (Math.random() < 0.5 ? -1 : 1), t0: 0.05 + i * 0.11 + k * 0.04, big: i === 6 });
          });
        }
        st.cr.forEach(function (q, i) {
          if (T >= q.t0 && once(st, 'c' + i)) {
            sparks(q.x, q.y, 'steel', q.big ? 12 : 5, q.big ? 110 : 60); heat('steel', q.x, q.y, (q.big ? 10 : 5) * q.b.z, 0.9);
            if (q.big) { flash(0.3); shake(0.25, 3); ringFx(q.x, q.y, 3, 34 * q.b.z, 0.4, 'steel', 2); } else shake(0.06, 1);
          }
        });
      },
      draw: function (T, st) {
        (st.cr || []).forEach(function (q) {
          var t = T - q.t0, life = q.big ? 0.4 : 0.24;
          if (t < 0 || t > life) return;
          var p = Math.min(1, t / 0.07), a = t < life * 0.6 ? 1 : (life - t) / (life * 0.4), r = q.big ? q.r * 1.6 : q.r;
          crescent(q.x, q.y, r + 1.5, q.a0, q.a0 + q.sp * p, (q.big ? 6 : 4) * q.b.z + 1, 'ink', a * 0.85, 'ink');
          crescent(q.x, q.y, r, q.a0, q.a0 + q.sp * p, (q.big ? 4.5 : 3) * q.b.z, 'steel', a);
        });
      } },

    ink: inkFx(false), goldInk: inkFx(true),

    iceLance: { ch: 'ice', sh: 'ice', hit: 0.28, dur: 1.8,
      run: function (T, dt, st, c) {
        each(c, st, 0.05, function (b, k, s, d) {
          var t = T - d, z = b.z;
          if (t < 0) return;
          if (t < 0.28) {
            var p = t / 0.28;
            s.lance = [lerp(c.C.x, b.x - 6 * z, p), lerp(c.C.y, b.y, p), Math.atan2(b.y - c.C.y, b.x - 6 * z - c.C.x)];
            if (Math.random() < 0.9) add({ x: s.lance[0] - rnd(4, 10), y: s.lance[1] + rnd(-2, 2), vx: rnd(-20, 0), vy: rnd(-8, 8), life: rnd(0.3, 0.6), pal: 'ice', hot: 7, cold: 3, drag: 0.05 });
          } else s.lance = null;
          if (t >= 0.28 && once(s, 'hit')) {
            s.spikes = [];
            for (var q = 0; q < 7; q++) { var off = q - 3; s.spikes.push({ x: b.x + off * 5 * z + rnd(-1, 1), h: (24 - Math.abs(off) * 5 + rnd(-2, 2)) * z, w: rnd(2.5, 3.5) * Math.sqrt(z), lean: off * 1.2 }); }
            ringFx(b.x, b.y, 3, 28 * z, 0.35, 'ice', 2); burst(b.x, b.y, 'ice', 30, 90 * z, { g: 90 }); sparks(b.x, b.y, 'ice', 6, 70 * z);
            if (k === 0) { shake(0.14, 2); flash(0.1); }
          }
          if (t >= 1.15 && once(s, 'shatter')) {
            (s.spikes || []).forEach(function (sp) {
              for (var i = 0; i < 9; i++) add({ x: sp.x + rnd(-sp.w, sp.w), y: b.foot - rnd(0, sp.h), vx: rnd(-60, 60), vy: rnd(-90, -20), g: 220, life: rnd(0.4, 0.8), pal: 'ice', hot: 7, cold: 2, s: Math.random() < 0.4 ? 2 : 1, floor: b.foot + rnd(0, 3) });
            });
            s.spikes = null;
            sparks(b.x, b.y, 'ice', 6, 80); ringFx(b.x, b.foot - 4, 4, 22 * z, 0.3, 'ice', 1, 0.4);
          }
          s.g = clamp((t - 0.28) / 0.1, 0, 1);
        });
      },
      draw: function (T, st, c) {
        each(c, st, 0.05, function (b, k, s) {
          if (s.lance) {
            var x = s.lance[0], y = s.lance[1], a = s.lance[2], ux = Math.cos(a), uy = Math.sin(a);
            line(x - ux * 14, y - uy * 14, x, y, P.ice[2], 3); line(x - ux * 15, y - uy * 15, x + ux, y + uy, P.ice[5], 1);
            put(x + ux, y + uy, P.ice[7]); put(x + ux * 2, y + uy * 2, P.ice[7]); rect(x - 1, y - 1, 2, 2, P.ice[6]);
          }
          if (s.spikes) s.spikes.forEach(function (sp) { drawSpike(sp.x, b.foot + 1, sp.h, sp.w, s.g, sp.lean); });
        });
      } },

    thunder: { ch: 'bolt', sh: 'bolt', hit: 0.24, dur: 1.7,
      run: function (T, dt, st, c) {
        each(c, st, 0.07, function (b, k, s, d) {
          var t = T - d, z = b.z, cy = Math.max(8, b.top - 14 * z);
          if (t < 0) return;
          if (once(s, 'up')) for (var i = 0; i < 14; i++) add({ x: c.C.x + rnd(-10, 10), y: c.C.y + rnd(-14, 14), vx: rnd(-20, 20), vy: rnd(-40, -10), life: 0.5, pal: 'bolt', hot: 7, cold: 4, home: { x: b.x + rnd(-8, 8), y: cy, k: 40, d: 5 } });
          [0.24, 0.5].forEach(function (tt, n) {
            if (t >= tt && once(s, 'b' + n)) {
              var pts = boltPath(b.x + rnd(-6, 6), cy + 4, b.x + rnd(-3, 3), b.y - 2, 8, 6 * z), br = pts[3];
              s.bolt = { pts: pts, br: boltPath(br[0], br[1], br[0] + rnd(8, 14) * z * (Math.random() < 0.5 ? -1 : 1), br[1] + rnd(10, 16) * z, 3, 3), t0: t };
              sparks(b.x, b.y, 'bolt', 9, 90 * z); burst(b.x, b.foot, 'bolt', 14, 60, { g: 120 });
              if (k === 0) { flash(0.28); shake(0.12, 2); }
            }
          });
          if (!s.crack) s.crack = [];
          if (t > 0.24 && t < 0.95 && Math.random() < 0.35) { var x = b.x + rnd(-12, 12) * z, y = b.y + rnd(-12, 14) * z; s.crack.push({ x: x, y: y, x2: x + rnd(-4, 4), y2: y + rnd(-4, 4), life: 0.06 }); }
          s.crack = s.crack.filter(function (q) { return (q.life -= dt) > 0; });
          s.cloudA = t < 0.2 ? t / 0.2 : t < 1.2 ? 1 : Math.max(0, 1 - (t - 1.2) / 0.4);
          s.t = t; s.cy = cy;
        });
      },
      draw: function (T, st, c) {
        each(c, st, 0.07, function (b, k, s) {
          if (s.cloudA > 0) drawCloud(b.x, s.cy, s.cloudA, !!(s.bolt && s.t - s.bolt.t0 < 0.1));
          if (s.bolt && s.t - s.bolt.t0 < 0.16 && Math.floor((s.t - s.bolt.t0) * 60) % 3 !== 1) { drawBolt(s.bolt.pts, 1); drawBolt(s.bolt.br, 0.8); }
          if (s.crack) s.crack.forEach(function (q) { line(q.x, q.y, q.x2, q.y2, P.bolt[5], 1); });
        });
      } },

    holyStrike: { ch: 'holy', sh: 'holy', hit: 0.12, dur: 1.3,
      run: function (T, dt, st, c) {
        each(c, st, 0.06, function (b, k, s, d) {
          var t = T - d;
          if (t < 0) return;
          s.t = t;
          if (t >= 0.12 && once(s, 'hit')) {
            burst(b.x, b.foot - 4, 'holy', 34, 100 * b.z, { heat: 'holy', floor: b.foot + 2 }); sparks(b.x, b.y, 'holy', 8, 80 * b.z);
            ringFx(b.x, b.foot, 4, 26 * b.z, 0.45, 'holy', 2, 0.35);
            if (k === 0) { flash(0.22); shake(0.14, 2); }
          }
          if (t > 0.12 && t < 0.9 && Math.random() < 0.6) heat('holy', b.x + rnd(-8, 8) * b.z, b.foot, rnd(2, 3), rnd(0.7, 1));
        });
      },
      draw: function (T, st, c) {
        each(c, st, 0.06, function (b, k, s) {
          var t = s.t;
          if (t == null || t < 0 || t > 1.0) return;
          var a = t < 0.1 ? t / 0.1 : t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
          drawPillar(b.x, 0, Math.min(b.foot, t * 900), a, t, 'holy', b.z);
        });
      } },

    needles: needles('steel'), toxicNeedles: needles('toxic'),
    arrows: arrows(),

    holyHeal: heal('holy'), natureHeal: heal('heal'),

    // 천외참룡검: 금빛 붓 참격 → 불꽃 용이 적을 꿰뚫음 → 대폭발
    dragon: { ch: 'holy', sh: 'holy', hit: 0.6, dur: 2.6,
      run: function (T, dt, st, c) {
        var b = c.targets[0], z = b.z;
        if (once(st, 'rel2')) { burst(c.C.x, c.C.y, 'fire', 24, 80, { g: 40 }); flash(0.2); }
        if (T >= 0.06 && once(st, 'slash')) {
          flash(0.4); shake(0.3, 3);
          for (var i = 0; i < 26; i++) { var u = Math.random(); add({ kind: Math.random() < 0.3 ? 'spark' : 'px', x: lerp(b.x - 62 * z, b.x + 44 * z, u), y: lerp(b.y - 56 * z, b.y + 44 * z, u), vx: rnd(-50, 50), vy: rnd(-60, 20), g: 60, drag: 0.04, life: rnd(0.3, 0.7), pal: 'holy', s: 2 }); }
        }
        if (T >= 0.2 && T < 0.95) {
          var w = clamp((T - 0.2) / 0.7, 0, 1), q = dragonAt(b, w), q2 = dragonAt(b, Math.max(0, w - 0.03));
          st.head = q;
          heat('fire', q[0], q[1], 6 * z, 1.15); heat('fire', q2[0], q2[1], 5 * z, 0.95);
          if (Math.random() < 0.8) add({ x: q[0] + rnd(-4, 4), y: q[1] + rnd(-4, 4), vx: rnd(-20, 20), vy: rnd(-30, 0), life: rnd(0.3, 0.6), pal: 'holy', hot: 7, cold: 3, drag: 0.05 });
          if (w > 0.58 && once(st, 'boom')) {
            heat('fire', b.x, b.y, 20 * z, 1.3); burst(b.x, b.y, 'fire', 80, 150 * z, { heat: 'fire', floor: b.foot + 3 }); sparks(b.x, b.y, 'holy', 14, 110 * z);
            ringFx(b.x, b.y, 4, 46 * z, 0.5, 'holy', 3); ringFx(b.x, b.y, 2, 34 * z, 0.45, 'fire', 2); ringFx(b.x, b.y, 6, 60 * z, 0.7, 'ink', 1);
            shake(0.45, 4); flash(0.5);
          }
        } else st.head = null;
        if (T > 0.6 && T < 1.9) for (var k = 0; k < 2; k++) heat('fire', b.x + rnd(-16, 16) * z, b.foot - rnd(0, 3), rnd(2, 4.5) * z, rnd(0.75, 1.1));
      },
      draw: function (T, st, c) {
        var b = c.targets[0], z = b.z;
        if (T >= 0.02 && T < 1.5) {
          var a = T < 0.9 ? 1 : 1 - (T - 0.9) / 0.6, L0 = [b.x - 62 * z, b.y - 56 * z], L1 = [b.x + 44 * z, b.y + 44 * z];
          brush(function (u) { return [lerp(L0[0], L1[0], u), lerp(L0[1], L1[1], u)]; }, T / 0.07, a, 4 * z, true);
        }
        if (st.head) drawSprite(DHEAD, st.head[0] - 4, st.head[1] - 5);
      } },

    // 신화 · 어검술: 얼음빛 검 다섯 자루가 머리 위에 떠올라 겨눈 뒤 날아가 별처럼 터진다
    swords: { ch: 'ice', sh: 'ice', hit: 1.25, dur: 2.4, dim: 0.5,
      // 첫 검이 닿는 때: 1.05초에 출발해 SWORD_V 로 날아간다
      hitAt: function (c) {
        var h = c.hero, b = c.targets[0];
        return h ? 1.05 + Math.hypot(b.x - Math.max(12, h.x - 2), b.y - h.top) / SWORD_V : 1.25;
      },
      run: function (T, dt, st, c) {
        var h = c.hero || { x: c.C.x, top: c.C.y - 30, z: 1 }, n = c.targets.length;
        if (!st.sw) st.sw = [];
        for (var k = 0; k < 5; k++) {
          if (T >= 0.1 + k * 0.1 && !st.sw[k]) {
            var b = c.targets[k % n], hx = Math.max(12, h.x + 16 + (k - 2) * 9), hy = Math.max(10, h.top - 10 + Math.abs(k - 2) * 3);
            st.sw[k] = { hx: hx, hy: hy, x: hx, y: hy, ang: Math.PI / 2, st: 0, born: T, b: b, tx: b.x + rnd(-6, 6) * b.z, ty: b.y + rnd(-14, 8) * b.z };
            sparks(hx, hy + 6, 'ice', 5, 50); ringFx(hx, hy + 6, 1, 8, 0.25, 'ice', 1);
          }
          var s = st.sw[k];
          if (!s || s.st === 2) continue;
          if (s.st === 0) {
            s.y = s.hy + Math.sin(T * 4 + k) * 1.2;
            var want = Math.atan2(s.ty - s.y, s.tx - s.x), aim = clamp((T - 0.85) / 0.2, 0, 1);
            s.ang = Math.PI / 2 + (want - Math.PI / 2) * aim;
            if (T >= 1.05 + k * 0.07) { s.st = 1; s.vx = Math.cos(want) * SWORD_V; s.vy = Math.sin(want) * SWORD_V; s.ang = want; }
          } else {
            s.x += s.vx * dt; s.y += s.vy * dt;
            add({ x: s.x - Math.cos(s.ang) * 4, y: s.y - Math.sin(s.ang) * 4, life: 0.2, pal: 'ice', hot: 6, cold: 3 });
            if (Math.hypot(s.tx - s.x, s.ty - s.y) < 12 || (s.tx - s.x) * s.vx + (s.ty - s.y) * s.vy < 0) {
              s.st = 2;
              for (var j = 0; j < 6; j++) beam(s.tx, s.ty, rnd(0, Math.PI * 2), rnd(14, 26) * s.b.z, 0.28, 'ice');
              sparks(s.tx, s.ty, 'ice', 6, 70); shake(0.08, 1); flash(0.1);
            }
          }
        }
        if (T >= 1.55 && once(st, 'star')) {
          c.targets.forEach(function (b) {
            for (var j = 0; j < 12; j++) beam(b.x, b.y - 4, (j / 12) * Math.PI * 2 + rnd(-0.1, 0.1), rnd(30, 46) * b.z, 0.45, 'ice');
            ringFx(b.x, b.y - 4, 3, 30 * b.z, 0.4, 'ice', 2);
          });
          flash(0.3); shake(0.2, 3);
        }
      },
      draw: function (T, st) { (st.sw || []).forEach(function (s) { if (s && s.st !== 2) drawSword(s.x, s.y, s.ang, Math.min(1, (T - s.born) / 0.15)); }); } },

    // 신화 · 대붕우: 금빛 깃털 날개가 펼쳐져 땅을 쓸며 적을 덮친다
    roc: { ch: 'holy', sh: 'holy', hit: 1.25, dur: 2.3, dim: 0.45,
      run: function (T, dt, st, c) {
        var h = c.hero || { x: c.C.x, y: c.C.y, foot: c.C.y + 20, z: 1 }, b = c.targets[0];
        if (T < 0.45 && Math.random() < 0.8) converge(h.x, h.y, 'holy', 16);
        if (T > 0.3 && T < 1.1) heat('holy', h.x + rnd(-1, 1), h.y + 1, 2.2, 0.85);
        var g = clamp((T - 0.45) / 0.35, 0, 1), sp = clamp((T - 0.95) / 0.3, 0, 1), e = sp * sp;
        st.fan = T >= 0.45 && T < 1.25 ? { ox: lerp(h.x, b.x - 8 * b.z, e), oy: lerp(h.foot, b.foot, e) - 2, g: g, flat: 1 - 0.55 * e, sc: (1 - 0.3 * e) * h.z } : null;
        if (st.fan) for (var k = 0; k < FEA; k++) if (Math.random() < 0.45) { var q = feather(st.fan, k, 1); heat('holy', q[0], q[1], 2.2, 0.85); }
        if (T >= 1.25 && once(st, 'hit')) {
          c.targets.forEach(function (t) {
            heat('holy', t.x, t.y + 6, 18 * t.z, 1.25); burst(t.x, t.y, 'holy', 46, 110 * t.z, { heat: 'holy' }); sparks(t.x, t.y, 'holy', 10, 90);
            for (var j = 0; j < 8; j++) beam(t.x, t.y, rnd(0, Math.PI * 2), rnd(20, 34) * t.z, 0.35, 'holy');
            ringFx(t.x, t.y, 3, 34 * t.z, 0.45, 'holy', 3);
            for (var i = 0; i < 14; i++) add({ kind: 'feather', x: t.x + rnd(-26, 26) * t.z, y: t.y + rnd(-34, 0) * t.z, vy: rnd(6, 20), life: rnd(0.9, 1.5), pal: 'holy', hot: 7, cold: 4, ph: rnd(0, 6) });
          });
          shake(0.3, 3); flash(0.4);
        }
        if (T > 1.25 && T < 2.0) c.targets.forEach(function (t) { heat('holy', t.x + rnd(-14, 14) * t.z, t.foot, rnd(2, 3.5), rnd(0.7, 1)); });
      },
      draw: function (T, st, c) {
        var h = c.hero || { x: c.C.x, y: c.C.y };
        if (T > 0.15 && T < 1.0) {
          var a = T < 0.25 ? (T - 0.15) / 0.1 : T > 0.85 ? (1 - T) / 0.15 : 1;
          ring(h.x, h.y, 5 + Math.sin(T * 20), 1, P.holy[4], 0.6 * a); disc(h.x, h.y, 3.2, P.holy[5], a); disc(h.x, h.y, 2, P.holy[7], a);
        }
        var fan = st.fan;
        if (fan) {
          for (var pass = 0; pass < 3; pass++) for (var k = 0; k < FEA; k++) for (var i = 0; i <= 22; i++) {
            var u = i / 22, q = feather(fan, k, u), w = (0.6 + 2.4 * Math.sin(Math.PI * Math.min(1, u * 1.1))) * (1 - u * 0.3) * fan.sc;
            if (pass === 0) disc(q[0], q[1], w + 1, P.holy[1]);
            else if (pass === 1) disc(q[0], q[1], w, P.holy[4]);
            else if (u < 0.7) disc(q[0], q[1], w * 0.4, P.holy[7]);
          }
        }
      } },

    // 신화 · 혈뢰: 붉은 번개가 꽂힌 뒤 발밑에서 핏빛 낙뢰가 솟구친다
    bloodBolt: { ch: 'blood', sh: 'blood', hit: 0.45, dur: 2.2, dim: 0.55,
      run: function (T, dt, st, c) {
        var h = c.hero || { x: c.C.x, y: c.C.y, foot: c.C.y + 20, z: 1 }, b = c.targets[0], z = b.z;
        if (T < 0.5 && Math.random() < 0.5) add({ kind: 'spark', x: h.x + rnd(-14, 14) * h.z, y: h.y + rnd(-24, 20) * h.z, life: 0.3, pal: 'blood', s: 2 });
        if (T < 0.6) heat('blood', h.x + rnd(-10, 10) * h.z, h.foot, 2, 0.7);
        [0.45, 0.6].forEach(function (tt, n) {
          if (T >= tt && once(st, 'z' + n)) { var L = Math.hypot(b.x - h.x, b.y - h.y); st.zap = { pts: boltPath(h.x + 8 * h.z, h.y + 4, b.x, b.y, Math.max(10, Math.round(L / 9)), 4, Math.max(7, L / 16)), t0: T }; flash(0.15); shake(0.1, 1); sparks(b.x, b.y, 'blood', 6, 60); }
        });
        if (T >= 0.75 && once(st, 'boom')) {
          heat('blood', b.x, b.foot - 4, 14 * z, 1.2); burst(b.x, b.y, 'blood', 40, 100 * z, { heat: 'blood' });
          ringFx(b.x, b.foot - 2, 4, 36 * z, 0.5, 'blood', 2, 0.35); flash(0.3); shake(0.3, 3);
        }
        if (!st.bolts) st.bolts = [];
        if (T >= 0.75 && T < 1.75) {
          st.nb = (st.nb || 0) + dt;
          if (st.nb > 0.06) {
            st.nb = 0;
            var a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), r = rnd(36, 72) * z, x0 = b.x + rnd(-6, 6) * z;
            st.bolts.push({ pts: boltPath(x0, b.foot, x0 + Math.cos(a) * r, b.foot + Math.sin(a) * r * 1.2, 7, 5, 5), life: 0.14 });
          }
          for (var k = 0; k < 3; k++) heat('blood', b.x + rnd(-26, 26) * z, b.foot, rnd(2, 4) * z, rnd(0.75, 1.1));
          st.tint = 0.18;
          st.pool = Math.min(1, (T - 0.75) / 0.3);
        } else { st.tint = Math.max(0, (st.tint || 0) - dt); if (T > 1.75) st.pool = Math.max(0, (st.pool || 0) - dt * 1.2); }
        st.bolts = st.bolts.filter(function (q) { return (q.life -= dt) > 0; });
      },
      under: function (T, st, c) {
        if (!(st.pool > 0)) return;
        var b = c.targets[0], rx = 34 * b.z * st.pool, ry = 4.5 * b.z * st.pool;
        for (var y = Math.floor(b.foot - ry); y <= b.foot + ry; y++) for (var x = Math.floor(b.x - rx); x <= b.x + rx; x++) {
          var u = (x + 0.5 - b.x) / rx, v = (y + 0.5 - b.foot) / ry, d = u * u + v * v;
          if (d <= 1) putA(x, y, d < 0.35 ? P.blood[2] : P.blood[1], d < 0.35 ? 1 : 0.75);
        }
      },
      draw: function (T, st) {
        if (st.zap && T - st.zap.t0 < 0.13 && Math.floor((T - st.zap.t0) * 60) % 3 !== 1) drawBolt(st.zap.pts, 1, 'blood');
        (st.bolts || []).forEach(function (q) { if (Math.random() < 0.85) drawBolt(q.pts, 1, 'blood'); });
      } },

    // 카드만 부서지고 끝 (공격·회복이 아닌 카드). 이어지는 효과는 effects.js 의 sfx 가 맡는다
    release: { hit: 0, dur: 0, run: function () {}, draw: function () {} }
  };

  function dragonAt(b, u) {
    var z = b.z, DR = [[-135, 70], [-99, 16], [-49, 38], [0, 0], [27, -34], [51, -56]].map(function (q) { return [b.x + q[0] * z, b.y + q[1] * z]; });
    var n = DR.length - 1, f = u * n, i = Math.min(n - 1, Math.floor(f)), s = f - i;
    var p0 = DR[Math.max(0, i - 1)], p1 = DR[i], p2 = DR[i + 1], p3 = DR[Math.min(n, i + 2)];
    function cr(a, bb, cc, d) { return 0.5 * (2 * bb + (-a + cc) * s + (2 * a - 5 * bb + 4 * cc - d) * s * s + (-a + 3 * bb - 3 * cc + d) * s * s * s); }
    return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
  }
  var FEA = 12, SWORD_V = 900;
  function feather(fan, k, u) {
    var a = ((-175 + (170 * k) / (FEA - 1)) * Math.PI) / 180, L = (34 + 18 * Math.sin((k / (FEA - 1)) * Math.PI)) * fan.g * fan.sc;
    var dx = Math.cos(a), dy = Math.sin(a) * fan.flat, ex = fan.ox + dx * L, ey = fan.oy + dy * L;
    var mx = fan.ox + dx * L * 0.55 - dy * 5, my = fan.oy + dy * L * 0.55 + dx * 5, v = 1 - u;
    return [v * v * fan.ox + 2 * v * u * mx + u * u * ex, v * v * fan.oy + 2 * v * u * my + u * u * ey];
  }

  // 암기: 침 일곱 개가 날아가 꽂히고, 독이면 꽂힌 자리에서 보라·초록 독불이 인다
  function needles(pal) {
    var toxic = pal === 'toxic';
    return { ch: pal, sh: pal, hit: 0.2, dur: toxic ? 1.8 : 1.0,
      run: function (T, dt, st, c) {
        each(c, st, 0.05, function (b, k, s, d) {
          var t = T - d, z = b.z;
          if (t < 0) return;
          for (var q = 0; q < 7; q++) {
            if (t >= q * 0.035 && once(s, 'n' + q)) {
              (function () {
                var tx = b.x + rnd(-10, 8) * z, ty = b.y + rnd(-12, 12) * z, sx = c.C.x + rnd(-4, 4), sy = c.C.y + rnd(-10, 10), fl = 0.2;
                add({ kind: 'streak', x: sx, y: sy, vx: (tx - sx) / fl, vy: (ty - sy) / fl, life: fl, pal: pal, len: 10, fade: false,
                  onDie: function () {
                    (s.stuck = s.stuck || []).push([tx, ty, Math.atan2(ty - sy, tx - sx)]);
                    if (toxic) heat('toxic', tx, ty, 3, 0.9);
                    add({ kind: 'spark', x: tx, y: ty, life: 0.25, pal: pal, s: 2 });
                  } });
              })();
            }
          }
          if (t >= 0.24 && once(s, 'hit') && k === 0) shake(0.1, 1);
          if (toxic && t >= 0.3 && t < 1.35) {
            for (var j = 0; j < 2; j++) heat('toxic', b.x + rnd(-11, 11) * z, b.y + rnd(-6, 14) * z, rnd(2, 3.5) * z, rnd(0.75, 1.05));
            if (Math.random() < 0.2) add({ kind: 'bubble', x: b.x + rnd(-12, 12) * z, y: b.y + rnd(-4, 12) * z, vy: rnd(-22, -12), life: rnd(0.5, 0.8), pal: 'toxic', hot: 6, cold: 4, s: Math.random() < 0.5 ? 1 : 2 });
          }
          s.t = t;
        });
      },
      draw: function (T, st, c) {
        each(c, st, 0.05, function (b, k, s) {
          if (s.stuck && s.t < (toxic ? 1.4 : 0.8)) s.stuck.forEach(function (q) {
            var ux = Math.cos(q[2]), uy = Math.sin(q[2]);
            line(q[0] - ux * 4, q[1] - uy * 4, q[0], q[1], P.ink[6], 1); put(q[0] - ux * 4, q[1] - uy * 4, P[pal][4]);
          });
        });
      } };
  }

  // 30단계 시엘: 정령 화살 셋이 곧게 날아가 꽂히고, 꽂힌 자리에서 초록 바람이 원을 그리며 흩어진다
  function arrows() {
    return { ch: 'heal', sh: 'heal', hit: 0.22, dur: 1.0,
      run: function (T, dt, st, c) {
        each(c, st, 0.06, function (b, k, s, d) {
          var t = T - d, z = b.z;
          if (t < 0) return;
          for (var q = 0; q < 3; q++) {
            if (t >= q * 0.05 && once(s, 'a' + q)) {
              (function (q) {
                var tx = b.x + (q - 1) * 6 * z, ty = b.y + (q - 1) * 7 * z, sx = c.C.x, sy = c.C.y + (q - 1) * 4, fl = 0.17;
                add({ kind: 'streak', x: sx, y: sy, vx: (tx - sx) / fl, vy: (ty - sy) / fl, life: fl, pal: 'heal', len: 16, fade: false,
                  onDie: function () {
                    (s.stuck = s.stuck || []).push([tx, ty, Math.atan2(ty - sy, tx - sx)]);
                    sparks(tx, ty, 'heal', 4, 50 * z);
                  } });
              })(q);
            }
          }
          if (t >= 0.24 && once(s, 'hit')) { ringFx(b.x, b.y, 3, 16 * z, 0.35, 'heal', 1, 0.3); if (k === 0) shake(0.1, 1); }
          s.t = t;
        });
      },
      draw: function (T, st, c) {
        each(c, st, 0.06, function (b, k, s) {
          if (s.stuck && s.t < 0.8) s.stuck.forEach(function (q) {
            var ux = Math.cos(q[2]), uy = Math.sin(q[2]);
            line(q[0] - ux * 7, q[1] - uy * 7, q[0], q[1], P.ink[5], 1);
            put(q[0] - ux * 7, q[1] - uy * 7 - 1, P.heal[5]); put(q[0] - ux * 7, q[1] - uy * 7 + 1, P.heal[5]); put(q[0], q[1], P.heal[7]);
          });
        });
      } };
  }

  // 회복: 빛 구슬이 아군에게 날아가 빛기둥이 서고 발밑에서 불꽃이 인다
  function heal(pal) {
    return { ch: pal, sh: pal, hit: 0.36, dur: 1.6,
      run: function (T, dt, st, c) {
        if (once(st, 'orbs')) c.targets.forEach(function (b) {
          for (var i = 0; i < Math.max(4, Math.round(12 / c.targets.length)); i++) {
            var a = rnd(-Math.PI, 0);
            add({ x: c.C.x + rnd(-8, 8), y: c.C.y + rnd(-12, 12), vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.42, pal: pal, hot: 7, cold: 5, s: 2, fade: false, trail: 0.7, home: { x: b.x + rnd(-4, 4), y: b.y + rnd(-6, 4), k: 90, d: 7 } });
          }
        });
        if (T >= 0.36 && once(st, 'heal')) c.targets.forEach(function (b) { ringFx(b.x, b.foot, 4, 18 * b.z, 0.5, pal, 1, 0.35); sparks(b.x, b.y, pal, 8, 60); });
        if (T >= 0.36 && T < 1.5) c.targets.forEach(function (b) {
          if (Math.random() < 0.6) heat('holy', b.x + rnd(-8, 8) * b.z, b.foot, rnd(2, 3), rnd(0.7, 1));
          if (Math.random() < 0.25) add({ kind: 'spark', x: b.x + rnd(-10, 10) * b.z, y: b.foot - rnd(0, 16) * b.z, vy: rnd(-40, -20), life: rnd(0.4, 0.7), pal: 'heal', s: 2 });
        });
      },
      draw: function (T, st, c) {
        if (T < 0.3 || T >= 1.5) return;
        var a = T < 0.38 ? (T - 0.3) / 0.08 : T > 1.1 ? 1 - (T - 1.1) / 0.4 : 1;
        c.targets.forEach(function (b) { drawPillar(b.x, 0, Math.min(b.foot, (T - 0.3) * 900), a, T, pal === 'heal' ? 'heal' : 'holy', b.z * 0.8); });
      } };
  }

  // ================= 실행 =================
  // 카드가 모이는 동안: 둘레에 빛 테두리, 전설은 금빛 마법진. 다 모이면 카드가 도트 조각으로 부서진다
  function stepRun(r, dt) {
    var fx = r.fx, c = r.c, t = r.t, R = r.R, ch = fx.ch || c.pal, C = c.C;
    if (t >= R * 0.3 && t < R) {
      if (Math.random() < (c.leg ? 1 : 0.6)) converge(C.x, C.y, ch, c.leg ? 34 : 26);
      if (ch === 'fire' && Math.random() < 0.7) heat('fire', C.x + rnd(-14, 14), C.y - c.card.h / 2, 2.2, 0.9);
      if (c.leg && Math.random() < 0.8) heat('holy', C.x + rnd(-15, 15), C.y - c.card.h / 2, 2.4, 0.95);
    }
    if (t >= R && once(r.st, 'rel')) {
      var sh = fx.sh || c.pal, hw = c.card.w / 2, hh = c.card.h / 2;
      for (var i = 0; i < 80; i++) {
        var x = C.x + rnd(-hw, hw), y = C.y + rnd(-hh, hh);
        add({ x: x, y: y, vx: (x - C.x) * rnd(3, 7) + rnd(-10, 10), vy: (y - C.y) * rnd(2, 5) + rnd(-20, 5), life: rnd(0.35, 0.8), pal: sh, hot: 7, cold: 1, s: Math.random() < 0.35 ? 2 : 1, drag: 0.06, g: 30 });
      }
      var rp = sh === 'ink' ? 'holy' : sh;
      ringFx(C.x, C.y, 3, hw * 1.6, 0.3, rp, 2); sparks(C.x, C.y, rp, 5, 60);
    }
    if (t >= R) fx.run(t - R, dt, r.st, c);
  }
  function drawRun(r) {
    var c = r.c, t = r.t, C = c.C;
    if (t >= r.R * 0.5 && t < r.R) {
      var pal = P[r.fx.ch || c.pal], pulse = 0.55 + 0.45 * Math.sin(t * 22), hw = Math.round(c.card.w / 2), hh = Math.round(c.card.h / 2);
      frameRect(C.x - hw - 1, C.y - hh - 1, hw * 2 + 2, hh * 2 + 2, pal[6], pulse);
      frameRect(C.x - hw - 3, C.y - hh - 3, hw * 2 + 6, hh * 2 + 6, pal[3], pulse * 0.5);
      if (c.leg) {
        var R0 = Math.max(hw, hh) + 8;
        for (var k = 0; k < 96; k++) { var an = (k / 96) * Math.PI * 2; if ((k + Math.floor(t * 24)) % 6 < 3) put(C.x + Math.cos(an) * R0, C.y + Math.sin(an) * R0, P.holy[6]); }
        ring(C.x, C.y, R0 - 5, 1, P.holy[3], 0.6);
      }
    }
    if (t >= r.R) r.fx.draw(t - r.R, r.st, c);
  }
  function dimOf(r) {
    var m = r.c.leg ? 0.55 : r.fx.dim || 0, t = r.t, end = r.R + r.fx.dur;
    if (!m) return 0;
    return t < 0.3 ? (t / 0.3) * m : t < end - 0.5 ? m : Math.max(0, m * (end - t) / 0.5);
  }

  function frame(now) {
    raf = 0;
    if (!cv) return;
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)) * (G.speed || 1);
    last = now;
    acc += dt;
    var step = 1 / 60;
    while (acc >= step) {
      acc -= step;
      runs.forEach(function (r) { r.t += step; stepRun(r, step); });
      runs = runs.filter(function (r) { return r.t < r.R + r.fx.dur; });
      Object.keys(fields).forEach(function (n) { stepField(fields[n]); });
      stepParts(step);
      rings = rings.filter(function (g) { return (g.age += step) < g.life; });
      beams = beams.filter(function (b) { return (b.age += step) < b.life; });
      flashV = Math.max(0, flashV - step * 4);
      if (shakeT > 0) shakeT -= step; else shakeA = 0;
    }
    buf.fill(0);
    var dim = 0, tint = 0;
    runs.forEach(function (r) { dim = Math.max(dim, dimOf(r)); tint = Math.max(tint, r.st.tint || 0); });
    if (dim > 0) wash(hex('#05030a'), dim);
    runs.forEach(function (r) { if (r.fx.under && r.t >= r.R) r.fx.under(r.t - r.R, r.st, r.c); });
    Object.keys(fields).forEach(function (n) { drawField(fields[n]); });
    runs.forEach(drawRun);
    rings.forEach(function (g) {
      var q = g.age / g.life, rad = g.r0 + (g.r1 - g.r0) * (1 - Math.pow(1 - q, 2));
      ring(g.x, g.y, rad, Math.max(1, g.th * (1 - q * 0.5)), P[g.pal][clamp(Math.round(6 - q * 5), 1, 7)], 1 - q, g.ry);
    });
    beams.forEach(function (b) {
      var q = b.age / b.life, s0 = b.len * q * 0.5, L = b.len * (0.45 + 0.55 * (1 - q)), cs = Math.cos(b.ang), sn = Math.sin(b.ang);
      line(b.x + cs * s0, b.y + sn * s0, b.x + cs * (s0 + L), b.y + sn * (s0 + L), P[b.pal][3], 3, (1 - q) * 0.8);
      line(b.x + cs * s0, b.y + sn * s0, b.x + cs * (s0 + L), b.y + sn * (s0 + L), P[b.pal][6], 1, 1 - q * 0.5);
    });
    drawParts();
    if (tint > 0) wash(hex('#ff2030'), tint * 0.5);
    if (flashV > 0) wash(P.holy[7], Math.min(0.6, flashV));
    ctx.putImageData(img, 0, 0);
    var live = runs.length || parts.length || rings.length || beams.length || flashV > 0 ||
      Object.keys(fields).some(function (n) { return fields[n].live > 0; });
    if (live) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  }
  function kick() { if (!raf) { last = performance.now(); acc = 0; raf = requestAnimationFrame(frame); } }

  // 화면 좌표(#app 기준 px)의 사각형 → 버퍼 좌표 상자
  function box(r) {
    var x = (r.x + r.w / 2) / SCALE, top = r.y / SCALE, h = r.h / SCALE;
    return { x: x, y: top + h * 0.55, top: top + h * 0.1, foot: top + h * 0.95, h: h, z: clamp(h / 52, 0.7, 1.4) };
  }

  var PFX = G.PFX = {
    SCALE: SCALE,
    // 카드에 맞는 연출 이름 (data/fx.js 규칙)
    keyFor: function (def, el) {
      var D = G.Data.cardFx, base = String(def.id).replace(/\+\d*$/, '');
      if (D.byCard[base]) return D.byCard[base];
      if (def.type === 'heal') return el === 'holy' || def.owner === 'sera' ? D.heal.holy : D.heal.other;
      if (def.type !== 'attack') return 'release';
      return D.byOwner[def.owner] && el !== 'poison' ? D.byOwner[def.owner] : D.byElement[el] || D.bySchool[def.school] || 'ink';
    },
    palFor: function (key, el) { var fx = FXS[key]; return (fx && fx.ch) || G.Data.cardFx.elPal[el] || 'steel'; },
    glowOf: function (pal) { return PAL[pal] ? PAL[pal][5] : '#ffffff'; },
    // o: { key, card: 카드 사각형(화면 px), hero: 시전자 스프라이트 사각형, targets: [사각형], rarity, pal }
    // 돌려주는 값: 카드가 다 모인 뒤 첫 타격까지의 시간(ms, 속도 배율 반영 전)
    play: function (o) {
      if (G.FX.low) return 0;
      ensure();
      var fx = FXS[o.key] || FXS.release, gt = G.Data.cardFx.gather;
      var R = o.rarity === 'legendary' ? gt.legendary : o.rarity === 'epic' ? gt.epic : gt.normal;
      var cb = { x: (o.card.x + o.card.w / 2) / SCALE, y: (o.card.y + o.card.h / 2) / SCALE, w: o.card.w / SCALE, h: o.card.h / SCALE };
      var c = { C: { x: cb.x, y: cb.y }, card: cb, hero: o.hero ? box(o.hero) : null, targets: (o.targets || []).map(box), leg: o.rarity === 'legendary', pal: o.pal || 'steel' };
      if (fx !== FXS.release && !c.targets.length) fx = FXS.release;
      runs.push({ fx: fx, c: c, t: 0, R: R, st: { once: {}, o: [] } });
      kick();
      return Math.round((R + (fx.hitAt ? fx.hitAt(c) : fx.hit)) * 1000);
    },
    // 카드가 부서지는 순간까지의 시간(ms)
    gatherMs: function (rarity) { var gt = G.Data.cardFx.gather; return Math.round((rarity === 'legendary' ? gt.legendary : rarity === 'epic' ? gt.epic : gt.normal) * 1000); },
    has: function (key) { return !!FXS[key]; },
    keys: function () { return Object.keys(FXS); },
    clear: function () {
      runs = []; parts = []; rings = []; beams = []; fields = {}; flashV = 0;
      if (ctx) ctx.clearRect(0, 0, W, H);
    }
  };

  var oldClear = G.FX.clear;
  G.FX.clear = function () { oldClear(); PFX.clear(); };
})();
