// rig.js — 관절 리그 도트 렌더러(시험판). 브라우저와 node 양쪽에서 돈다
// 부위(다각형·캡슐·사슬·손도트)를 뒤에서 앞으로 칠하고, 부위마다 빛(왼쪽 위)·그늘(오른쪽 아래) 띠, 부위 경계선, 바깥 외곽선을 자동으로 넣는다
(function (root) {
  'use strict';
  var OL = '#140e18';
  function inPoly(pts, x, y) { var c = false; for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  function segD(px, py, a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? ((px - a[0]) * dx + (py - a[1]) * dy) / l : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; var x = a[0] + dx * t - px, y = a[1] + dy * t - py; return { d: Math.sqrt(x * x + y * y), t: t }; }
  // 모양 → 칸 판정 함수와 대략의 범위
  function maskOf(s) {
    if (s.k === 'poly') return function (x, y) { return inPoly(s.pts, x, y); };
    if (s.k === 'caps') return function (x, y) { for (var i = 0; i < s.pts.length - 1; i++) { var q = segD(x, y, s.pts[i], s.pts[i + 1]), r = s.r[i] + (s.r[i + 1] - s.r[i]) * q.t; if (q.d <= r) return true; } return s.pts.length === 1 && Math.hypot(x - s.pts[0][0], y - s.pts[0][1]) <= s.r[0]; };
    if (s.k === 'ell') return function (x, y) { var dx = (x - s.x) / s.rx, dy = (y - s.y) / s.ry; return dx * dx + dy * dy <= 1; };
    if (s.k === 'union') { var ms = s.list.map(maskOf); return function (x, y) { for (var i = 0; i < ms.length; i++) if (ms[i](x, y)) return true; return false; }; }
    return function () { return false; };
  }
  function render(W, H, shapes) {
    var N = W * H, col = new Array(N).fill(null), pid = new Int16Array(N).fill(-1), z = [];
    shapes.forEach(function (s, si) {
      if (s.k === 'sprite') { // 손도트: 글자 → 색, '.' 은 빈칸
        s.rows.forEach(function (r, j) { for (var i = 0; i < r.length; i++) { var ch = r[i]; if (ch === '.' || !s.pal[ch]) continue; var x = Math.round(s.x) + (s.flip ? r.length - 1 - i : i), y = Math.round(s.y) + j; if (x < 0 || y < 0 || x >= W || y >= H) continue; col[y * W + x] = s.pal[ch]; pid[y * W + x] = si; } });
        z[si] = s; return;
      }
      if (s.k === 'px') { s.pts.forEach(function (p) { var x = Math.round(p[0]), y = Math.round(p[1]); if (x >= 0 && y >= 0 && x < W && y < H) { col[y * W + x] = p[2]; if (!s.keep) pid[y * W + x] = si; } }); z[si] = s; return; }
      if (s.k === 'line') { // 부위 안쪽 주름·무늬: 이미 칠한 칸 위에만
        s.pts.forEach(function (p, i) { if (i === 0) return; var a = s.pts[i - 1], n = Math.ceil(Math.max(Math.abs(p[0] - a[0]), Math.abs(p[1] - a[1]))) || 1; for (var k = 0; k <= n; k++) { var x = Math.round(a[0] + (p[0] - a[0]) * k / n), y = Math.round(a[1] + (p[1] - a[1]) * k / n); if (x >= 0 && y >= 0 && x < W && y < H && col[y * W + x] && (!s.on || s.on.indexOf(pid[y * W + x]) >= 0 || s.on === 'any')) col[y * W + x] = s.c; } });
        return;
      }
      var m = maskOf(s), x0 = 0, y0 = 0, x1 = W - 1, y1 = H - 1, M = new Uint8Array(N);
      for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) if (m(x + 0.5, y + 0.5) && (s.clip == null || pid[y * W + x] === si + s.clip)) M[y * W + x] = 1;
      var at = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && M[y * W + x]; };
      var R = s.ramp; // [가장 어두움, 그늘, 바탕, 빛]
      for (var y2 = 0; y2 < H; y2++) for (var x2 = 0; x2 < W; x2++) {
        if (!M[y2 * W + x2]) continue;
        var t = 2;
        var lx = s.light ? s.light[0] : -1, ly = s.light ? s.light[1] : -1;
        if (!at(x2 + lx, y2) || !at(x2, y2 + ly)) t = 3;
        if (!at(x2 - lx, y2 - ly) || (s.deep !== 0 && !at(x2 - 2 * lx, y2 - 2 * ly))) t = t === 3 ? 2 : 1;
        if (s.flat) t = 2;
        if (s.shadeBelow != null && y2 > s.shadeBelow && t > 1) t--;
        col[y2 * W + x2] = R[Math.min(t, R.length - 1)]; pid[y2 * W + x2] = si;
      }
      z[si] = s;
    });
    // 부위 경계선: 뒤 부위 칸이 앞 부위와 닿으면 뒤 부위의 가장 어두운 색
    var out = col.slice();
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var i = y * W + x, a = pid[i]; if (a < 0 || !z[a] || !z[a].ramp) continue;
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var k = 0; k < 4; k++) { var X = x + nb[k][0], Y = y + nb[k][1]; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; var b = pid[Y * W + X]; if (b > a && z[b] && z[b].line !== false && (z[b].group == null || z[b].group !== z[a].group)) { out[i] = z[a].edge || z[a].ramp[0]; break; } }
    }
    // 바깥 외곽선
    var fin = out.slice();
    for (var y3 = 0; y3 < H; y3++) for (var x3 = 0; x3 < W; x3++) {
      if (out[y3 * W + x3]) continue;
      if ((x3 > 0 && out[y3 * W + x3 - 1]) || (x3 < W - 1 && out[y3 * W + x3 + 1]) || (y3 > 0 && out[(y3 - 1) * W + x3]) || (y3 < H - 1 && out[(y3 + 1) * W + x3])) fin[y3 * W + x3] = OL;
    }
    return fin;
  }
  var api = { render: render, OL: OL };
  if (typeof module !== 'undefined') module.exports = api; else (root.Game = root.Game || {}).Rig = api;
})(this);
