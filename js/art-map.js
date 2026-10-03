// art-map.js — 월드맵(1000×560, 16단계: 무림 · 세계의 틈 · 엘단) SVG와 지역 안개 구름. 낮은 해상도로 찍어 도트 지도로 쓴다
(function () {
  'use strict';
  var G = Game;
  var K = '#0d1426';

  // 고정 난수(그릴 때마다 같은 지도)
  function rnd(seed) {
    var s = seed;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }
  function poly(pts, fill, extra) { return '<polygon points="' + pts + '" fill="' + fill + '" ' + (extra || '') + '/>'; }
  function path(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '" ' + (extra || '') + '/>'; }

  // 16단계 월드맵: 왼쪽은 무림(북쪽 청운봉 · 남쪽 만독곡), 가운데는 세계의 틈(별이 뜬 허공), 오른쪽은 엘단 대륙(사막 · 설원 · 화산)
  var MURIM = '0,0 300,0 318,60 304,140 326,230 306,320 322,420 300,500 310,560 0,560';
  var ELDAN = '452,24 560,8 700,20 840,10 960,30 994,90 990,260 1000,380 970,470 900,540 760,552 620,546 500,540 460,470 476,380 448,300 470,200 446,110';
  var REGION = {
    castle: '0,0 300,0 318,60 304,140 326,230 320,262 0,262',
    forest: '0,262 320,262 306,320 322,420 300,500 310,560 0,560',
    volcano: '446,0 1000,0 1000,250 820,270 700,262 600,280 470,290 470,200 446,110',
    desert: '470,290 600,280 700,262 720,330 700,420 720,560 440,560 460,470 476,380 448,300',
    snow: '700,262 820,270 1000,250 1000,560 720,560 700,420 720,330',
    rift: '332,176 444,176 452,250 444,360 332,360 324,270'   // 31단계: 틈의 심연(무림과 엘단 사이)
  };
  // 무림은 먹빛이 도는 차분한 색, 엘단은 선명한 색
  var FILL = { forest: '#35503a', castle: '#3e4658', desert: '#d9b062', snow: '#dce8f0', volcano: '#5a3434' };
  function trees(r, n, x0, y0, x1, y1, avoid) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), h = 14 + r() * 10;
      if (avoid && avoid(x, y)) continue;
      s += poly((x - h * 0.45) + ',' + y + ' ' + x + ',' + (y - h) + ' ' + (x + h * 0.45) + ',' + y, i % 3 ? '#24603a' : '#2f7a45') +
        poly(x + ',' + (y - h) + ' ' + (x + h * 0.45) + ',' + y + ' ' + (x + h * 0.12) + ',' + y, '#1b4a2c');
    }
    return s;
  }
  function mountain(x, y, w, h, base, snow) {
    return poly((x - w / 2) + ',' + y + ' ' + x + ',' + (y - h) + ' ' + (x + w / 2) + ',' + y, base) +
      poly(x + ',' + (y - h) + ' ' + (x + w / 2) + ',' + y + ' ' + (x + w * 0.1) + ',' + y, '#6f84a0') +
      poly((x - w * 0.16) + ',' + (y - h * 0.68) + ' ' + x + ',' + (y - h) + ' ' + (x + w * 0.16) + ',' + (y - h * 0.68) + ' ' + (x + w * 0.05) + ',' + (y - h * 0.6), snow);
  }

  function rift(cx, cy, h) {
    // 세계의 틈: 지그재그로 갈라진 보랏빛 균열과 빛
    var pts = [], k;
    for (k = 0; k <= 8; k++) pts.push((cx + (k % 2 ? 9 : -9) + Math.sin(k) * 3) + ',' + (cy - h / 2 + k * h / 8));
    var line = 'M' + pts.join(' L');
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="34" ry="' + (h * 0.62) + '" fill="#7a3ad0" opacity="0.28"/>' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="18" ry="' + (h * 0.5) + '" fill="#c070ff" opacity="0.3"/>' +
      path(line, 'none', 'stroke="#2a0a4a" stroke-width="12" stroke-linejoin="bevel"') +
      path(line, 'none', 'stroke="#d8a0ff" stroke-width="5" stroke-linejoin="bevel"') +
      path(line, 'none', 'stroke="#ffffff" stroke-width="1.5" stroke-linejoin="bevel"');
  }
  function pagoda(x, y, k) {
    return '<rect x="' + (x - 14 * k) + '" y="' + (y - 10 * k) + '" width="' + 28 * k + '" height="' + 10 * k + '" fill="#5a1a24"/>' +
      '<rect x="' + (x - 11 * k) + '" y="' + (y - 9 * k) + '" width="' + 2 * k + '" height="' + 9 * k + '" fill="#9a2a2a"/><rect x="' + (x + 9 * k) + '" y="' + (y - 9 * k) + '" width="' + 2 * k + '" height="' + 9 * k + '" fill="#9a2a2a"/>' +
      path('M' + (x - 22 * k) + ' ' + (y - 9 * k) + ' Q' + (x - 14 * k) + ' ' + (y - 15 * k) + ' ' + (x - 8 * k) + ' ' + (y - 16 * k) + ' H' + (x + 8 * k) + ' Q' + (x + 14 * k) + ' ' + (y - 15 * k) + ' ' + (x + 22 * k) + ' ' + (y - 9 * k) + ' Z', '#1a1a2a') +
      '<rect x="' + (x - 8 * k) + '" y="' + (y - 24 * k) + '" width="' + 16 * k + '" height="' + 8 * k + '" fill="#5a1a24"/>' +
      path('M' + (x - 15 * k) + ' ' + (y - 23 * k) + ' Q' + (x - 9 * k) + ' ' + (y - 28 * k) + ' ' + (x - 5 * k) + ' ' + (y - 29 * k) + ' H' + (x + 5 * k) + ' Q' + (x + 9 * k) + ' ' + (y - 28 * k) + ' ' + (x + 15 * k) + ' ' + (y - 23 * k) + ' Z', '#1a1a2a') +
      '<rect x="' + (x - 2 * k) + '" y="' + (y - 21 * k) + '" width="' + 4 * k + '" height="' + 3 * k + '" fill="#ffd23f"/>';
  }
  function worldSvg() {
    var r = rnd(17), s = '', i;
    // 세계의 틈: 별이 뜬 허공
    s += '<rect width="1000" height="560" fill="#0b0818"/>';
    for (i = 0; i < 90; i++) s += '<rect x="' + (r() * 1000).toFixed(0) + '" y="' + (r() * 560).toFixed(0) + '" width="2" height="2" fill="' + (i % 4 ? '#6a5a9a' : '#e8d8ff') + '"/>';
    for (i = 0; i < 6; i++) s += '<ellipse cx="' + (330 + r() * 120) + '" cy="' + (r() * 560) + '" rx="' + (30 + r() * 30) + '" ry="12" fill="#5a2a9a" opacity="0.25"/>';
    // 두 땅(가장자리의 빛 번짐)
    s += poly(MURIM, '#2a3a4a', 'stroke="#4a5a7a" stroke-width="18" stroke-linejoin="round" opacity="0.6"');
    s += poly(ELDAN, '#2c6aa0', 'stroke="#2c6aa0" stroke-width="22" stroke-linejoin="round"');
    s += '<clipPath id="landM"><polygon points="' + MURIM + '"/></clipPath><clipPath id="landE"><polygon points="' + ELDAN + '"/></clipPath>';
    // ---------- 무림 ----------
    s += '<g clip-path="url(#landM)">';
    s += poly(REGION.castle, FILL.castle) + poly(REGION.forest, FILL.forest);
    s += poly(REGION.castle, 'none', 'stroke="#000" stroke-opacity="0.2" stroke-width="5"');
    // 청운봉: 먹빛 봉우리들, 정상의 전각, 소나무, 구름 띠
    [[60, 150, 120, 120], [150, 120, 130, 110], [250, 160, 110, 100], [110, 240, 120, 70], [230, 250, 110, 70]].forEach(function (m) {
      s += poly((m[0] - m[2] / 2) + ',' + m[1] + ' ' + m[0] + ',' + (m[1] - m[3]) + ' ' + (m[0] + m[2] / 2) + ',' + m[1], '#5a6478') +
        poly(m[0] + ',' + (m[1] - m[3]) + ' ' + (m[0] + m[2] / 2) + ',' + m[1] + ' ' + (m[0] + m[2] * 0.12) + ',' + m[1], '#3a4256');
    });
    s += pagoda(196, 50, 1.1);
    for (i = 0; i < 4; i++) s += '<rect x="' + (10 + r() * 240) + '" y="' + (60 + i * 46) + '" width="' + (70 + r() * 60) + '" height="7" fill="#e8e4f0" opacity="0.35"/>';
    for (i = 0; i < 14; i++) {
      var px = 20 + r() * 280, py = 170 + r() * 80;
      s += poly((px - 7) + ',' + py + ' ' + px + ',' + (py - 12) + ' ' + (px + 7) + ',' + py, '#24402e') + '<rect x="' + (px - 1) + '" y="' + py + '" width="2" height="4" fill="#3a2418"/>';
    }
    for (i = 0; i < 5; i++) s += '<ellipse cx="' + (40 + r() * 240) + '" cy="' + (90 + r() * 150) + '" rx="30" ry="6" fill="#c04a5a" opacity="0.28"/>';
    // 단애: 청운봉과 만독곡 사이 절벽
    s += path('M0 262 L60 270 L120 258 L190 272 L260 260 L320 266', 'none', 'stroke="#1a1a24" stroke-width="8"');
    // 만독곡: 양쪽 절벽 사이의 독 늪과 숲, 흑풍채
    s += trees(r, 70, 14, 300, 300, 548, function (x, y) { return Math.abs(x - 90) < 34 && Math.abs(y - 470) < 28 || Math.abs(x - 230) < 34 && Math.abs(y - 380) < 28; });
    for (i = 0; i < 7; i++) s += '<ellipse cx="' + (30 + r() * 260) + '" cy="' + (310 + r() * 230) + '" rx="' + (16 + r() * 16) + '" ry="7" fill="#7a4aa8" opacity="0.45"/>';
    for (i = 0; i < 10; i++) s += '<circle cx="' + (30 + r() * 260) + '" cy="' + (310 + r() * 230) + '" r="2.5" fill="#b8ff6a"/>';
    s += '<rect x="214" y="400" width="34" height="14" fill="#3a2418"/>' + poly('210,400 231,388 252,400', '#1a1a1a') + '<rect x="244" y="380" width="2" height="22" fill="#1a1a1a"/>' + poly('246,380 260,384 246,390', '#2a2a32');
    s += '</g>';
    // ---------- 엘단 ----------
    s += '<g clip-path="url(#landE)">';
    ['volcano', 'desert', 'snow'].forEach(function (k) { s += poly(REGION[k], FILL[k]); });
    ['volcano', 'desert', 'snow'].forEach(function (k) { s += poly(REGION[k], 'none', 'stroke="#000" stroke-opacity="0.18" stroke-width="5"'); });
    // 사막: 모래 언덕, 피라미드, 선인장
    for (i = 0; i < 16; i++) {
      var dx = 470 + r() * 230, dy = 310 + r() * 230;
      s += path('M' + dx + ' ' + dy + ' q16 -12 32 0', 'none', 'stroke="#b88a42" stroke-width="3"');
    }
    s += poly('600,420 636,360 672,420', '#e8c070') + poly('636,360 672,420 646,420', '#b88a42');
    s += poly('560,500 580,468 600,500', '#e8c070') + poly('580,468 600,500 588,500', '#b88a42');
    for (i = 0; i < 8; i++) {
      var cx = 480 + r() * 200, cy = 330 + r() * 200;
      s += '<rect x="' + cx + '" y="' + (cy - 12) + '" width="4" height="12" fill="#3f8a3f"/><rect x="' + (cx - 4) + '" y="' + (cy - 8) + '" width="4" height="3" fill="#3f8a3f"/>';
    }
    // 설원: 산맥, 침엽수, 서리 궁전
    [[790, 380, 110, 90], [880, 300, 120, 100], [960, 420, 110, 90], [840, 500, 100, 70]].forEach(function (m) { s += mountain(m[0], m[1], m[2], m[3], '#9fb3cc', '#ffffff'); });
    for (i = 0; i < 22; i++) {
      var sx = 720 + r() * 270, sy = 290 + r() * 250;
      if (Math.abs(sx - 780) < 26 && Math.abs(sy - 450) < 24 || Math.abs(sx - 900) < 26 && Math.abs(sy - 330) < 24) continue;
      s += poly((sx - 5) + ',' + sy + ' ' + sx + ',' + (sy - 13) + ' ' + (sx + 5) + ',' + sy, '#2f5a6a');
    }
    // 화산: 용암 강, 화산, 바위
    s += poly('760,170 820,60 880,170', '#3a2020') + poly('820,60 880,170 842,170', '#241414') + poly('806,64 820,44 834,64', '#ff7a2a') +
      path('M820 44 l-3 -16 m6 16 l4 -20', 'none', 'stroke="#ffd23f" stroke-width="3"');
    s += path('M820 170 Q760 210 700 200 T560 230', 'none', 'stroke="#ff7a2a" stroke-width="6"') + path('M820 170 Q760 210 700 200 T560 230', 'none', 'stroke="#ffd23f" stroke-width="2"');
    for (i = 0; i < 16; i++) {
      var rx = 470 + r() * 500, ry = 30 + r() * 210;
      s += poly(rx + ',' + ry + ' ' + (rx + 6) + ',' + (ry - 7) + ' ' + (rx + 12) + ',' + ry, '#2a1818');
    }
    s += '</g>';
    // 해안선
    s += poly(MURIM, 'none', 'stroke="' + K + '" stroke-width="4" stroke-linejoin="round"') + poly(ELDAN, 'none', 'stroke="' + K + '" stroke-width="4" stroke-linejoin="round"');
    // 세계의 틈: 두 갈래 균열(2장 → 3장, 8장 → 9장)
    s += rift(386, 420, 120) + rift(390, 150, 110);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 560" width="1000" height="560">' + s + '</svg>';
  }

  // 31단계: 틈의 심연 — 두 균열 사이의 소용돌이와 떠 있는 파편 섬 셋. 엔딩 전에는 그리지 않도록 지도 그림과 따로 둔다(지도 위 SVG 겹)
  function riftLayer() {
    var s = '';
    s += '<ellipse cx="390" cy="268" rx="62" ry="86" fill="#3a1a7a" opacity="0.35"/><ellipse cx="390" cy="268" rx="38" ry="58" fill="#6a2ac0" opacity="0.3"/><ellipse cx="390" cy="268" rx="18" ry="28" fill="#5ef0d0" opacity="0.25"/>';
    [[366, 344, 22], [416, 282, 20], [370, 222, 22]].forEach(function (q) {
      s += poly((q[0] - q[2]) + ',' + (q[1] + 6) + ' ' + (q[0] + q[2]) + ',' + (q[1] + 6) + ' ' + (q[0] + q[2] * 0.4) + ',' + (q[1] + 6 + q[2] * 0.8) + ' ' + (q[0] - q[2] * 0.5) + ',' + (q[1] + 6 + q[2] * 0.6), '#2a2440') +
        '<rect x="' + (q[0] - q[2]) + '" y="' + (q[1] + 4) + '" width="' + q[2] * 2 + '" height="3" fill="#5ef0d0" opacity="0.7"/>';
    });
    return s;
  }

  function fogSvg() {
    var r = rnd(5), s = '';
    for (var i = 0; i < 26; i++) {
      var x = r() * 200, y = r() * 140, rr = 18 + r() * 22;
      s += '<circle cx="' + x + '" cy="' + y + '" r="' + rr + '" fill="' + (i % 3 ? '#3a4266' : '#4a5480') + '"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140" width="200" height="140">' + s + '</svg>';
  }

  // 잠긴 지역을 덮는 안개(지도 위 SVG 오버레이, 지역 경계 그대로)
  function fogLayer(theme, seed) {
    var r = rnd(seed), puffs = '';
    var pts = REGION[theme].split(' ').map(function (p) { return p.split(',').map(Number); });
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    // 구름 덩어리: 겹친 원 몇 개를 한 색으로 묶어 그린다(그룹 투명도라 겹쳐도 얼룩지지 않음)
    for (var i = 0; i < 18; i++) {
      var cx = x0 + r() * (x1 - x0), cy = y0 + r() * (y1 - y0), w = 22 + r() * 22, c = '';
      for (var k = 0; k < 4; k++) {
        c += '<circle cx="' + Math.round(cx + (k - 1.5) * w * 0.55) + '" cy="' + Math.round(cy - (k % 2 ? w * 0.25 : 0)) + '" r="' + Math.round(w * (k % 3 ? 0.55 : 0.42)) + '"/>';
      }
      puffs += '<g fill="' + (i % 2 ? '#6a73a0' : '#525a88') + '" opacity="0.5">' + c + '</g>';
    }
    return '<clipPath id="fog-' + theme + '"><polygon points="' + REGION[theme] + '"/></clipPath>' +
      '<g clip-path="url(#fog-' + theme + ')" class="fog-' + theme + '"><polygon points="' + REGION[theme] + '" fill="#0a0d1a" fill-opacity="0.6"/>' + puffs + '</g>';
  }

  // 던전 지도의 낡은 양피지(14단계): 도트 한 칸 = 화면 3px. 얼룩·주름·탄 가장자리·옅은 모눈·나침반
  var parchCache = {};
  function parchment(w, h, seed) {
    var key = w + 'x' + h + ':' + seed;
    if (parchCache[key]) return parchCache[key];
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data, r = rnd(seed);
    // 낮은 해상도 값 노이즈 두 겹 + 얼룩
    var cell = function (cw) {
      var gw = Math.ceil(w / cw) + 2, g = [];
      for (var i = 0; i < gw * (Math.ceil(h / cw) + 2); i++) g.push(r());
      return function (x, y) {
        var gx = x / cw, gy = y / cw, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
        var a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1], cc = g[(y0 + 1) * gw + x0], dd = g[(y0 + 1) * gw + x0 + 1];
        return (a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + dd * fx) * fy;
      };
    };
    var big = cell(40), mid = cell(11);
    var stains = [];
    for (var s = 0; s < Math.max(4, Math.round(w * h / 9000)); s++) stains.push([r() * w, r() * h, 6 + r() * 18]);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var v = big(x, y) * 0.55 + mid(x, y) * 0.3 + r() * 0.15;
      stains.forEach(function (st) {
        var dx = x - st[0], dy = y - st[1], dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < st[2]) v -= 0.22 * (1 - dist / st[2]);
        else if (dist < st[2] + 1.5) v -= 0.12; // 얼룩 테두리
      });
      var edge = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (edge < 10) v -= (10 - edge) * 0.05;
      if ((x % 24 === 0 || y % 24 === 0) && (x + y) % 2) v -= 0.07; // 옅은 모눈
      // 다섯 단계로 끊어 칠한다
      var lv = Math.max(0, Math.min(4, Math.floor(v * 5)));
      var col = [[58, 40, 22], [104, 76, 42], [146, 112, 66], [178, 142, 90], [204, 172, 116]][lv];
      var o = (y * w + x) * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // 나침반(왼쪽 위)
    ctx.fillStyle = 'rgba(58, 36, 16, 0.85)';
    var cx = 22, cy = 22;
    for (var k = -9; k <= 9; k++) { ctx.fillRect(cx + k, cy, 1, 1); ctx.fillRect(cx, cy + k, 1, 1); }
    for (k = -3; k <= 3; k++) { ctx.fillRect(cx + k, cy + k, 1, 1); ctx.fillRect(cx + k, cy - k, 1, 1); }
    ctx.fillRect(cx - 1, cy - 12, 3, 2);
    return (parchCache[key] = c.toDataURL());
  }

  G.ArtMap = {
    parchment: parchment,
    fogLayer: fogLayer,
    riftLayer: riftLayer,
    world: function () { return G.Pixel.raster('map:world', worldSvg(), 500, 280, 16); },
    fog: function () { return G.Pixel.raster('map:fog', fogSvg(), 100, 70, 8); }
  };
})();
