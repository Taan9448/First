// puppet.js — 27단계 영웅 도트 렌더러. 부위(머리·머리채·옷·팔·무기)를 도형으로 찍고, 부위마다 가장자리까지의 거리로
// 입체 음영을 넣은 뒤 같은 규칙으로 부위 경계선 · 겹친 그늘 · 바깥 외곽선 · 광채 · 오로라를 더한다. 그림 파일은 쓰지 않는다.
// 브라우저(Game.Puppet)와 node(tools/puppet-preview.js) 양쪽에서 돈다. 영웅 설계는 js/puppet-heroes.js
(function () {
  'use strict';
  var G = window.Game = window.Game || {};
  var TAU = Math.PI * 2;
  var LX = -0.6, LY = -0.8;   // 빛: 왼쪽 위에서

  // ---------------- 색 ----------------
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function rgbHex(c) { return '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function toHsl(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0;
    if (mx !== mn) {
      var d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
    }
    return [h, s, l];
  }
  function fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    var f = function (t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h / 360 + 1 / 3) * 255, f(h / 360) * 255, f(h / 360 - 1 / 3) * 255];
  }
  // 색을 향해 색상을 돌린다(그늘은 푸른 보라 쪽, 밝은 곳은 노란 쪽)
  function towards(h, target, k) { var d = ((target - h + 540) % 360) - 180; return h + d * k; }
  // 기본색 하나로 [외곽, 그늘, 기본, 밝음, 하이라이트] 다섯 단계
  function ramp(base, o) {
    o = o || {};
    var hsl = toHsl(hexRgb(base)), h = hsl[0], s = hsl[1], l = hsl[2];
    var dk = o.dark == null ? 0.66 : o.dark, lt = o.light == null ? 0.3 : o.light;
    return [
      fromHsl(towards(h, 265, 0.3), Math.min(1, s * 0.9 + 0.1), l * 0.28),
      fromHsl(towards(h, 255, 0.16), Math.min(1, s + 0.06), l * dk),
      hexRgb(base),
      fromHsl(towards(h, 50, 0.08), s * 0.95, l + (1 - l) * lt),
      fromHsl(towards(h, 55, 0.14), s * 0.8, l + (1 - l) * (lt + 0.32))
    ];
  }

  // ---------------- 마스크(한 부위의 모양) ----------------
  function Mask(x0, y0, w, h) { this.x0 = x0; this.y0 = y0; this.w = w; this.h = h; this.d = new Uint8Array(w * h); this.v = null; this.u = null; }
  Mask.prototype.has = function (x, y) { x -= this.x0; y -= this.y0; return x >= 0 && y >= 0 && x < this.w && y < this.h && this.d[y * this.w + x] === 1; };
  function boundsOf(pts, pad) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
    pad = pad || 0;
    return [Math.floor(x0 - pad), Math.floor(y0 - pad), Math.ceil(x1 + pad) + 1, Math.ceil(y1 + pad) + 1];
  }
  // 다각형(픽셀 가운데 기준, 짝홀 규칙)
  function poly(pts) {
    var b = boundsOf(pts), m = new Mask(b[0], b[1], b[2] - b[0], b[3] - b[1]);
    for (var y = 0; y < m.h; y++) {
      var py = m.y0 + y + 0.5, xs = [];
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var a = pts[i], c = pts[j];
        if ((a[1] > py) !== (c[1] > py)) xs.push(a[0] + (py - a[1]) / (c[1] - a[1]) * (c[0] - a[0]));
      }
      xs.sort(function (p, q) { return p - q; });
      for (var k = 0; k + 1 < xs.length; k += 2) {
        for (var x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) {
          var lx = x - m.x0;
          if (lx >= 0 && lx < m.w) m.d[y * m.w + lx] = 1;
        }
      }
    }
    return m;
  }
  // 점들을 부드러운 곡선으로(Catmull-Rom)
  function smooth(pts, closed, n) {
    n = n || 5;
    var out = [], L = pts.length;
    var get = function (i) { return closed ? pts[(i + L) % L] : pts[Math.max(0, Math.min(L - 1, i))]; };
    var last = closed ? L : L - 1;
    for (var i = 0; i < last; i++) {
      var p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      for (var s = 0; s < n; s++) {
        var t = s / n, t2 = t * t, t3 = t2 * t;
        out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    if (!closed) out.push(pts[L - 1]);
    return out;
  }
  function blob(pts) { return poly(smooth(pts, true, 6)); }
  function ellipse(cx, cy, rx, ry, rot) {
    var pts = [], c = Math.cos(rot || 0), s = Math.sin(rot || 0);
    for (var i = 0; i < 28; i++) { var a = i / 28 * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; pts.push([cx + x * c - y * s, cy + x * s + y * c]); }
    return poly(pts);
  }
  // 띠(머리채·소매·다리·칼날): 경로를 따라 굵기 w(t)로. v 는 가로 위치(-1 ~ 1), u 는 길이 위치(0 ~ 1)
  function ribbon(path, w0, w1, curve) {
    var pts = path.length > 2 ? smooth(path, false, 4) : path;
    var len = [0];
    for (var i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    var total = len[len.length - 1] || 1, wf = typeof w0 === 'function' ? w0 : function (u) { var k = curve ? Math.pow(u, curve) : u; return w0 + (w1 - w0) * k; };
    var b = boundsOf(pts, Math.max(wf(0), wf(1), wf(0.5)) + 1), m = new Mask(b[0], b[1], b[2] - b[0], b[3] - b[1]);
    m.v = new Float32Array(m.w * m.h); m.u = new Float32Array(m.w * m.h);
    var best = new Float32Array(m.w * m.h).fill(9), wj = len.map(function (l) { return wf(l / total) / 2; });
    for (var j = 0; j + 1 < pts.length; j++) {
      var a = pts[j], c = pts[j + 1], dx = c[0] - a[0], dy = c[1] - a[1], sl = Math.hypot(dx, dy) || 1e-6, nx = -dy / sl, ny = dx / sl;
      var w0j = wj[j], w1j = wj[j + 1], ul0 = len[j] / total, ul1 = len[j + 1] / total, sl2 = sl * sl;
      var r = Math.max(w0j, w1j) + 1;
      var bx0 = Math.floor(Math.min(a[0], c[0]) - r) - m.x0, bx1 = Math.ceil(Math.max(a[0], c[0]) + r) - m.x0;
      var by0 = Math.floor(Math.min(a[1], c[1]) - r) - m.y0, by1 = Math.ceil(Math.max(a[1], c[1]) + r) - m.y0;
      for (var y = Math.max(0, by0); y <= Math.min(m.h - 1, by1); y++) for (var x = Math.max(0, bx0); x <= Math.min(m.w - 1, bx1); x++) {
        var px = m.x0 + x + 0.5, py = m.y0 + y + 0.5;
        var t = ((px - a[0]) * dx + (py - a[1]) * dy) / sl2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        var qx = a[0] + dx * t, qy = a[1] + dy * t, ex = px - qx, ey = py - qy, dist2 = ex * ex + ey * ey;
        var hw = w0j + (w1j - w0j) * t;
        if (hw <= 0.2 || dist2 > hw * hw) continue;
        var rel = Math.sqrt(dist2) / hw, k = y * m.w + x;
        if (rel < best[k]) { best[k] = rel; m.d[k] = 1; m.v[k] = (ex * nx + ey * ny) / hw; m.u[k] = ul0 + (ul1 - ul0) * t; }
      }
    }
    m.dir = [pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1]];
    return m;
  }
  function union(list) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    list.forEach(function (m) { x0 = Math.min(x0, m.x0); y0 = Math.min(y0, m.y0); x1 = Math.max(x1, m.x0 + m.w); y1 = Math.max(y1, m.y0 + m.h); });
    var o = new Mask(x0, y0, x1 - x0, y1 - y0);
    list.forEach(function (m) { for (var y = 0; y < m.h; y++) for (var x = 0; x < m.w; x++) if (m.d[y * m.w + x]) o.d[(y + m.y0 - y0) * o.w + (x + m.x0 - x0)] = 1; });
    return o;
  }
  function subtract(m, cut) {
    for (var y = 0; y < m.h; y++) for (var x = 0; x < m.w; x++) if (m.d[y * m.w + x] && cut.has(m.x0 + x, m.y0 + y)) m.d[y * m.w + x] = 0;
    return m;
  }
  // 가장자리까지의 거리(체스판 거리 근사)
  function distance(m) {
    var W = m.w + 2, H = m.h + 2, d = new Float32Array(W * H), INF = 99;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) d[y * W + x] = (x > 0 && y > 0 && x <= m.w && y <= m.h && m.d[(y - 1) * m.w + x - 1]) ? INF : 0;
    var f = function (x, y, dx, dy, c) { var v = d[(y + dy) * W + x + dx] + c; if (v < d[y * W + x]) d[y * W + x] = v; };
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) if (d[y * W + x]) { f(x, y, -1, 0, 1); f(x, y, 0, -1, 1); f(x, y, -1, -1, 1.414); f(x, y, 1, -1, 1.414); }
    for (y = H - 2; y > 0; y--) for (x = W - 2; x > 0; x--) if (d[y * W + x]) { f(x, y, 1, 0, 1); f(x, y, 0, 1, 1); f(x, y, 1, 1, 1.414); f(x, y, -1, 1, 1.414); }
    return { W: W, d: d };
  }

  // ---------------- 한 장면 ----------------
  // 픽셀마다 재질 번호 · 밝기 단계(-1 외곽 ~ 4 무늬) · 부위 번호(그리는 순서) · 그림자를 드리우는지
  function Frame(w, h, mats) {
    this.w = w; this.h = h; this.mats = mats;
    this.mat = new Int16Array(w * h).fill(-1); this.lv = new Int8Array(w * h); this.z = new Int16Array(w * h).fill(-1);
    this.grp = new Int16Array(w * h).fill(-1); this.cast = []; this.nz = 0;
    this.fx = new Float32Array(w * h * 4);   // 광채·궤적(위에 얹는 반투명)
    this.under = new Float32Array(w * h * 4); // 오로라(뒤에 까는 반투명)
  }
  // o: { shade: 'vol'|'ribbon'|'flat', lv(flat 단계), line: 'full'|'soft'|'none', cast(그림자를 드리움), grp(같은 묶음끼리는 경계선 없음), round, bias, pattern }
  Frame.prototype.put = function (m, mi, o) {
    o = o || {};
    var mat = this.mats[mi], z = ++this.nz, grp = o.grp != null ? o.grp : z, W = this.w;
    this.cast[z] = !!o.cast;
    var shade = o.shade || (m.v ? 'ribbon' : 'vol'), R = o.round || mat.round || 3.2, bias = (o.bias || 0) + (mat.bias || 0);
    var th = mat.th || [0.3, 0.64, 0.9];
    var dist = shade === 'vol' ? distance(m) : null;
    var level = function (val) { return val < th[0] ? 1 - (val < th[0] - 0.32 ? 1 : 0) : val < th[1] ? 2 : val < th[2] ? 3 : 4; };
    for (var y = 0; y < m.h; y++) for (var x = 0; x < m.w; x++) {
      var k = y * m.w + x;
      if (!m.d[k]) continue;
      var X = m.x0 + x, Y = m.y0 + y;
      if (X < 0 || Y < 0 || X >= W || Y >= this.h) continue;
      var val;
      if (shade === 'flat') val = null;
      else if (shade === 'ribbon') {
        var v = m.v[k];
        // 띠: 빛 쪽 가장자리가 밝고, 반대쪽이 어둡다. 가운데 가는 하이라이트 줄
        var side = (m.dir ? Math.sign(-m.dir[1] * LX + m.dir[0] * LY) || 1 : 1);
        val = 0.56 + 0.42 * v * side - 0.18 * Math.abs(v) * Math.abs(v);
        if (mat.strand && Math.abs(v * side + 0.36) < 0.2 && m.u[k] > 0.06 && m.u[k] < 0.82) val += 0.42;
        val += (o.uFade || 0) * (m.u[k] - 0.5);
      } else {
        var D = dist.d, DW = dist.W, gi = (y + 1) * DW + x + 1;
        var dd = D[gi], gx = D[gi + 1] - D[gi - 1], gy = D[gi + DW] - D[gi - DW], gl = Math.hypot(gx, gy) || 1;
        var edge = Math.max(0, 1 - (dd - 1) / R), lam = (-gx / gl) * LX + (-gy / gl) * LY;
        val = 0.56 + 0.5 * lam * edge - 0.1 * (y / Math.max(1, m.h) - 0.5);
      }
      var L = shade === 'flat' ? (o.lv == null ? 2 : o.lv) : level(val + bias);
      if (o.maxLv != null) L = Math.min(L, o.maxLv);
      var idx = Y * W + X;
      this.mat[idx] = mi; this.lv[idx] = L; this.z[idx] = z; this.grp[idx] = grp;
    }
    // 무늬(옷감): 부위 좌표에 고정된 작은 도장
    if (o.pattern) this.pattern(m, mi, z, o.pattern);
    // 부위 경계선: 이 부위 가장자리 중 먼저 그린 다른 묶음과 닿는 칸
    var line = o.line || mat.line || 'full';
    if (line !== 'none') {
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]], marks = [];
      for (y = 0; y < m.h; y++) for (x = 0; x < m.w; x++) {
        if (!m.d[y * m.w + x]) continue;
        X = m.x0 + x; Y = m.y0 + y;
        if (X < 0 || Y < 0 || X >= W || Y >= this.h || this.z[Y * W + X] !== z) continue;
        for (var q = 0; q < 4; q++) {
          var nx2 = X + nb[q][0], ny2 = Y + nb[q][1];
          if (nx2 < 0 || ny2 < 0 || nx2 >= W || ny2 >= this.h) continue;
          var ni = ny2 * W + nx2;
          if (this.z[ni] >= 0 && this.z[ni] !== z && this.grp[ni] !== grp && !m.has(nx2, ny2)) { marks.push(Y * W + X); break; }
        }
      }
      var self = this;
      marks.forEach(function (i) { self.lv[i] = line === 'soft' ? Math.min(self.lv[i], 1) : 0; });
    }
    return z;
  };
  Frame.prototype.pattern = function (m, mi, z, p) {
    var rows = p.rows, sx = p.step[0], sy = p.step[1], ox = p.ox || 0, oy = p.oy || 0;
    for (var y = 0; y < m.h; y++) for (var x = 0; x < m.w; x++) {
      if (!m.d[y * m.w + x]) continue;
      var X = m.x0 + x, Y = m.y0 + y;
      if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue;
      var idx = Y * this.w + X;
      if (this.z[idx] !== z) continue;
      var row = Math.floor((Y - m.y0 - oy) / sy), lx = ((X - m.x0 - ox + (row % 2 ? Math.floor(sx / 2) : 0)) % sx + sx) % sx, ly = ((Y - m.y0 - oy) % sy + sy) % sy;
      if (ly < rows.length && lx < rows[0].length && rows[ly][lx] === 'x' && this.lv[idx] > 0) this.lv[idx] = this.lv[idx] >= 2 ? 5 : 6;
    }
  };
  // 손도트 도장(얼굴 등): rows 글자 → pal[글자] = [재질, 단계]
  Frame.prototype.stamp = function (rows, pal, x0, y0, flip) {
    var z = ++this.nz;
    for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) {
      var p = pal[rows[y][x]];
      if (!p) continue;
      var X = Math.round(x0) + (flip ? rows[y].length - 1 - x : x), Y = Math.round(y0) + y;
      if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue;
      var i = Y * this.w + X;
      if (p[2] && this.mat[i] < 0) continue;   // 세 번째 값이 참이면 이미 칠한 곳에만
      this.mat[i] = p[0]; this.lv[i] = p[1]; this.z[i] = z; this.grp[i] = -2;
    }
  };
  Frame.prototype.dot = function (x, y, mi, lv) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    var i = y * this.w + x; this.mat[i] = mi; this.lv[i] = lv; this.z[i] = ++this.nz; this.grp[i] = -2;
  };
  // 반투명 덧칠(광채·궤적은 fx, 오로라는 under)
  Frame.prototype.glowPx = function (layer, x, y, c, a) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    var L = layer === 'under' ? this.under : this.fx, i = (y * this.w + x) * 4, ea = L[i + 3], na = a + ea * (1 - a);
    if (na <= 0) return;
    for (var k = 0; k < 3; k++) L[i + k] = (c[k] * a + L[i + k] * ea * (1 - a)) / na;
    L[i + 3] = na;
  };

  // 겹친 그늘: 그림자를 드리우는 부위 바로 아래(1~2칸) 뒤쪽 부위를 한 단계 어둡게
  Frame.prototype.shadows = function () {
    var W = this.w, out = [];
    for (var y = 0; y < this.h; y++) for (var x = 0; x < W; x++) {
      var i = y * W + x, z = this.z[i];
      if (z < 0 || this.lv[i] <= 0 || this.lv[i] >= 5) continue;
      for (var d = 1; d <= 2; d++) {
        if (y - d < 0) break;
        var j = (y - d) * W + x - (d === 2 ? 1 : 0);
        if (this.z[j] > z && this.cast[this.z[j]] && this.grp[j] !== this.grp[i]) { out.push(i); break; }
      }
    }
    var self = this;
    out.forEach(function (i) { self.lv[i] = Math.max(0, self.lv[i] - 1); });
  };

  // 최종: RGBA. glow = { color, width, alpha } 실루엣 바깥 빛 번짐, remap(rgb, 재질) 색 바꾸기(그림자 변형)
  Frame.prototype.compose = function (o) {
    o = o || {};
    this.shadows();
    var W = this.w, H = this.h, out = new Uint8ClampedArray(W * H * 4), mats = this.mats, self = this;
    var MA = this.mat, filled = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && MA[y * W + x] >= 0; };
    var col = function (i) {
      var m = mats[self.mat[i]], L = self.lv[i];
      var c = L === 5 ? m.pat : L === 6 ? m.patD : m.ramp[L];
      if (m.emit && L >= 2) return c;
      return o.remap ? o.remap(c, m) : c;
    };
    // 오로라(뒤)
    for (var i = 0; i < W * H; i++) {
      var a = this.under[i * 4 + 3];
      if (a > 0) { out[i * 4] = this.under[i * 4]; out[i * 4 + 1] = this.under[i * 4 + 1]; out[i * 4 + 2] = this.under[i * 4 + 2]; out[i * 4 + 3] = a * 255; }
    }
    // 광채: 실루엣까지의 거리
    if (o.glow && o.glow.width > 0) {
      var gw = o.glow.width, gc = o.glow.color, gd = new Float32Array(W * H);
      // 실루엣까지의 거리(두 번 훑는 근사)
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) gd[y * W + x] = filled(x, y) ? 0 : 99;
      var rel = function (x, y, dx, dy, c) { var X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) return; var v = gd[Y * W + X] + c; if (v < gd[y * W + x]) gd[y * W + x] = v; };
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) { rel(x, y, -1, 0, 1); rel(x, y, 0, -1, 1); rel(x, y, -1, -1, 1.414); rel(x, y, 1, -1, 1.414); }
      for (y = H - 1; y >= 0; y--) for (x = W - 1; x >= 0; x--) { rel(x, y, 1, 0, 1); rel(x, y, 0, 1, 1); rel(x, y, 1, 1, 1.414); rel(x, y, -1, 1, 1.414); }
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
        var best = gd[y * W + x];
        if (best === 0 || best > gw) continue;
        var ga = Math.pow(1 - (best - 1) / gw, 1.7) * (o.glow.alpha || 0.7);
        blend(out, (y * W + x) * 4, gc, ga);
      }
    }
    // 캐릭터
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      i = y * W + x;
      if (this.mat[i] < 0) continue;
      var c = col(i);
      out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255;
    }
    // 바깥 외곽선(4방향): 이웃 재질의 외곽색
    var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (filled(x, y)) continue;
      for (var q = 0; q < 4; q++) {
        if (!filled(x + nb[q][0], y + nb[q][1])) continue;
        var n = (y + nb[q][1]) * W + x + nb[q][0], m = mats[this.mat[n]];
        if (m.noOutline) continue;
        var oc = o.remap ? o.remap(m.ramp[0], m) : m.ramp[0];
        if (o.outline) oc = o.outline;
        i = (y * W + x) * 4; out[i] = oc[0]; out[i + 1] = oc[1]; out[i + 2] = oc[2]; out[i + 3] = 255;
        break;
      }
    }
    // 궤적·불꽃(위)
    for (i = 0; i < W * H; i++) { var fa = this.fx[i * 4 + 3]; if (fa > 0) blend(out, i * 4, [this.fx[i * 4], this.fx[i * 4 + 1], this.fx[i * 4 + 2]], fa); }
    return out;
  };
  function blend(out, k, c, a) {
    var ea = out[k + 3] / 255, na = a + ea * (1 - a);
    if (na <= 0) return;
    for (var j = 0; j < 3; j++) out[k + j] = (c[j] * a + out[k + j] * ea * (1 - a)) / na;
    out[k + 3] = na * 255;
  }

  // ---------------- 재질 · 자세 ----------------
  // 재질: { base 또는 ramp(5색), strand(머리카락 줄), pat(무늬색), emit(발광), th(단계 문턱), round, bias, line }
  function material(spec) {
    var m = Object.assign({}, spec);
    m.ramp = spec.ramp ? spec.ramp.map(function (c) { return typeof c === 'string' ? hexRgb(c) : c; }) : ramp(spec.base, spec);
    if (spec.pat) { m.pat = hexRgb(spec.pat); m.patD = spec.patD ? hexRgb(spec.patD) : ramp(spec.pat)[1]; }
    return m;
  }
  // 열쇠 장면 사이를 부드럽게: keys = [[t, {값}], …] (값은 숫자나 숫자 배열)
  function ease(t) { return t * t * (3 - 2 * t); }
  function pose(keys, t, base) {
    var out = JSON.parse(JSON.stringify(base || {}));
    var a = keys[0], b = keys[keys.length - 1];
    for (var i = 0; i + 1 < keys.length; i++) if (t >= keys[i][0] && t <= keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; break; }
    var k = b[0] === a[0] ? 0 : ease((t - a[0]) / (b[0] - a[0]));
    var mixIn = function (o, pa, pb) {
      Object.keys(Object.assign({}, pa, pb)).forEach(function (key) {
        var va = pa[key] != null ? pa[key] : pb[key], vb = pb[key] != null ? pb[key] : pa[key];
        if (typeof va === 'number') o[key] = va + (vb - va) * k;
        else if (Array.isArray(va)) o[key] = va.map(function (v, j) { return v + ((vb[j] != null ? vb[j] : v) - v) * k; });
        else if (va && typeof va === 'object') { o[key] = o[key] || {}; mixIn(o[key], va, vb || {}); }
        else o[key] = k < 0.5 ? va : vb;
      });
    };
    mixIn(out, a[1], b[1]);
    return out;
  }

  // ---------------- 시트 ----------------
  // design: { w, h, cx, ground, mats, draw(F, pose, t, anim), anims: { name: { n, keys } }, glow, aurora(F, t, pose), face, k }
  var ORDER = ['idle', 'attack', 'skill', 'hit'];
  function renderAll(design, o) {
    o = o || {};
    var mats = design.mats.map(material), frames = [], index = {};
    ORDER.forEach(function (name) {
      var an = design.anims[name];
      if (!an) return;
      index[name] = { start: frames.length, n: an.n, fps: an.fps || 10, loop: !!an.loop };
      for (var f = 0; f < an.n; f++) {
        var t = f / an.n, p = pose(an.keys, an.loop ? t : f / Math.max(1, an.n - 1), design.base);
        var F = new Frame(design.w, design.h, mats);
        if (design.aurora && o.aurora !== false) design.aurora(F, f / an.n + (index[name].start * 0.13), p, name);
        design.draw(F, p, t, name, f);
        var gl = o.glow === false ? null : Object.assign({}, design.glow, { alpha: design.glow.alpha * (p.glow == null ? 1 : p.glow) }, o.remap ? { color: [255, 70, 110] } : {});
        frames.push(F.compose({ glow: gl, remap: o.remap }));
      }
    });
    return { frames: frames, index: index, w: design.w, h: design.h };
  }
  function flipFrames(r) {
    r.frames = r.frames.map(function (px) {
      var o = new Uint8ClampedArray(px.length), W = r.w;
      for (var y = 0; y < r.h; y++) for (var x = 0; x < W; x++) for (var k = 0; k < 4; k++) o[(y * W + x) * 4 + k] = px[(y * W + (W - 1 - x)) * 4 + k];
      return o;
    });
  }
  var designs = {};
  // 게임용 시트(G.Shape.def 의 build 로 불린다): 한 줄로 이은 캔버스 + 동작 표
  function sheet(id, spec) {
    var d = designs[spec.puppet || id], rm = spec.remap;   // 얼굴 위치(face)는 대기 첫 장면 기준
    // 그림자 변형(거울의 방): 색을 바꾸고 눈·발광은 붉게, 광채도 붉게, 오로라는 끈다
    var r = renderAll(d, rm ? { remap: function (c, m) { return hexRgb(rm(rgbHex(c), m && (m.emit || m.eye) ? 'eye' : '')); }, aurora: false } : {});
    if (rm) d = Object.assign({}, d);
    if (spec.flip) flipFrames(r);
    var N = r.frames.length, cv = document.createElement('canvas');
    cv.width = r.w * N; cv.height = r.h;
    var ctx = cv.getContext('2d'), img = ctx.createImageData(r.w * N, r.h);
    r.frames.forEach(function (px, f) { for (var y = 0; y < r.h; y++) img.data.set(px.subarray(y * r.w * 4, (y + 1) * r.w * 4), (y * r.w * N + f * r.w) * 4); });
    ctx.putImageData(img, 0, 0);
    var K = d.k || 0.75, fx = function (x) { var px = (x + 0.5) / r.w; return spec.flip ? 1 - px : px; };
    var pt = function (q) { return q ? { x: fx(q[0]), y: (q[1] + 0.5) / r.h } : null; };
    var atk = r.index.attack;
    return {
      url: cv.toDataURL(), canvas: cv, frames: N, fw: r.w, fh: r.h, w: r.w * K, h: r.h * K,
      anchor: fx(d.cx), tip: pt(d.tip), tipAttack: pt(d.tipAttack || d.tip), face: pt(d.face),
      anims: r.index, poseFrame: atk ? atk.start + Math.floor(atk.n / 2) : 0, puppet: true
    };
  }

  G.Puppet = {
    TAU: TAU, hexRgb: hexRgb, rgbHex: rgbHex, ramp: ramp, material: material, pose: pose, ease: ease,
    poly: poly, blob: blob, smooth: smooth, ellipse: ellipse, ribbon: ribbon, union: union, subtract: subtract, Frame: Frame,
    designs: designs, renderAll: renderAll, sheet: sheet, flipFrames: flipFrames,
    define: function (id, design) {
      designs[id] = design;
      if (G.Shape && G.Shape.def) G.Shape.def(id, { puppet: id, build: function (spec) { return sheet(id, spec); } });
    }
  };
})();
