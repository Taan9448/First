// art-map.js — 월드맵(1000×560) SVG와 지역 안개 구름. 낮은 해상도로 찍어 도트 지도로 쓴다
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

  var LAND = '20,548 8,330 40,230 120,170 220,150 300,120 380,70 470,30 600,18 720,30 830,14 940,26 992,70 994,320 972,430 900,486 800,470 700,500 600,530 480,546 360,552 220,556 100,556';
  var REGION = {
    forest: '0,0 262,0 250,170 272,262 246,402 256,560 0,560',
    snow: '262,0 642,0 632,140 602,250 560,302 470,292 430,262 272,262 250,170',
    desert: '272,262 430,262 470,292 502,382 472,472 482,560 256,560 246,402',
    volcano: '642,0 822,0 802,150 812,300 782,420 700,472 482,560 472,472 502,382 470,292 560,302 602,250 632,140',
    castle: '822,0 1000,0 1000,560 482,560 700,472 782,420 812,300 802,150'
  };
  var FILL = { forest: '#3f8a3f', snow: '#dce8f0', desert: '#d9b062', volcano: '#5a3434', castle: '#3a2c4c' };

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

  function worldSvg() {
    var r = rnd(17), s = '';
    // 바다와 물결
    s += '<rect width="1000" height="560" fill="#16305a"/>';
    for (var i = 0; i < 70; i++) {
      var x = r() * 1000, y = r() * 560;
      s += path('M' + x + ' ' + y + ' q5 -4 10 0 q5 4 10 0', 'none', 'stroke="#28528a" stroke-width="2"');
    }
    // 얕은 바다, 땅
    s += poly(LAND, '#2c6aa0', 'stroke="#2c6aa0" stroke-width="26" stroke-linejoin="round"');
    s += '<clipPath id="land"><polygon points="' + LAND + '"/></clipPath><g clip-path="url(#land)">';
    Object.keys(REGION).forEach(function (k) { s += poly(REGION[k], FILL[k]); });
    // 지역 경계의 굵은 그림자
    Object.keys(REGION).forEach(function (k) { s += poly(REGION[k], 'none', 'stroke="#000" stroke-opacity="0.18" stroke-width="5"'); });

    // 숲: 나무 숲
    s += trees(r, 120, 20, 180, 250, 545, function (x, y) { return Math.abs(x - 96) < 30 && Math.abs(y - 418) < 26 || Math.abs(x - 196) < 30 && Math.abs(y - 318) < 26; });
    // 설원: 산맥과 침엽수
    [[300, 150, 110, 90], [380, 120, 120, 100], [470, 95, 130, 90], [560, 70, 140, 90], [620, 190, 90, 70], [340, 240, 80, 60], [430, 210, 90, 70]].forEach(function (m) {
      s += mountain(m[0], m[1], m[2], m[3], '#9fb3cc', '#ffffff');
    });
    for (i = 0; i < 26; i++) {
      var px = 290 + r() * 330, py = 150 + r() * 130;
      if (Math.abs(px - 486) < 26 && Math.abs(py - 232) < 24) continue;
      s += poly((px - 5) + ',' + py + ' ' + px + ',' + (py - 13) + ' ' + (px + 5) + ',' + py, '#2f5a6a');
    }
    // 사막: 모래 언덕, 피라미드, 선인장
    for (i = 0; i < 16; i++) {
      var dx = 270 + r() * 200, dy = 300 + r() * 240;
      s += path('M' + dx + ' ' + dy + ' q16 -12 32 0', 'none', 'stroke="#b88a42" stroke-width="3"');
    }
    s += poly('350,360 386,300 422,360', '#e8c070') + poly('386,300 422,360 396,360', '#b88a42');
    s += poly('420,372 444,332 468,372', '#e8c070') + poly('444,332 468,372 452,372', '#b88a42');
    for (i = 0; i < 10; i++) {
      var cx = 280 + r() * 180, cy = 380 + r() * 150;
      s += '<rect x="' + cx + '" y="' + (cy - 12) + '" width="4" height="12" fill="#3f8a3f"/><rect x="' + (cx - 4) + '" y="' + (cy - 8) + '" width="4" height="3" fill="#3f8a3f"/>';
    }
    // 화산: 용암 강, 화산, 바위
    s += path('M700 210 Q690 300 640 360 T560 470', 'none', 'stroke="#ff7a2a" stroke-width="6"');
    s += path('M700 210 Q690 300 640 360 T560 470', 'none', 'stroke="#ffd23f" stroke-width="2"');
    s += poly('690,210 748,120 806,210', '#3a2020') + poly('748,120 806,210 770,210', '#241414') +
      poly('734,124 748,104 762,124', '#ff7a2a') + path('M748 104 l-3 -16 m6 16 l4 -20', 'none', 'stroke="#ffd23f" stroke-width="3"');
    for (i = 0; i < 18; i++) {
      var rx = 630 + r() * 170, ry = 230 + r() * 220;
      s += poly(rx + ',' + ry + ' ' + (rx + 6) + ',' + (ry - 7) + ' ' + (rx + 12) + ',' + ry, '#2a1818');
    }
    // 마왕성: 성, 죽은 나무, 보랏빛 안개
    s += '<rect x="884" y="150" width="80" height="50" fill="#1c1428"/><rect x="876" y="120" width="20" height="80" fill="#241a34"/>' +
      '<rect x="952" y="120" width="20" height="80" fill="#241a34"/><rect x="912" y="92" width="24" height="108" fill="#2a1e3c"/>' +
      poly('872,120 886,96 900,120', '#3a2852') + poly('948,120 962,96 976,120', '#3a2852') + poly('908,92 924,62 940,92', '#3a2852') +
      '<rect x="920" y="110" width="6" height="8" fill="#ffd23f"/><rect x="884" y="140" width="4" height="6" fill="#ff5a5a"/>';
    for (i = 0; i < 12; i++) {
      var tx = 820 + r() * 160, ty = 240 + r() * 200;
      s += path('M' + tx + ' ' + ty + ' v-16 m0 6 l-6 -6 m6 2 l6 -7', 'none', 'stroke="#1a1028" stroke-width="2"');
    }
    for (i = 0; i < 8; i++) s += '<ellipse cx="' + (820 + r() * 170) + '" cy="' + (260 + r() * 220) + '" rx="34" ry="8" fill="#7a5aa8" opacity="0.35"/>';
    // 강: 설원에서 숲을 지나 바다로
    var river = 'M470 120 Q430 200 380 230 T300 280 Q250 330 230 380 T150 470 Q110 520 90 560';
    s += path(river, 'none', 'stroke="#2c6aa0" stroke-width="10"') + path(river, 'none', 'stroke="#6fb8e6" stroke-width="3"');
    s += '</g>';
    // 해안선
    s += poly(LAND, 'none', 'stroke="' + K + '" stroke-width="4" stroke-linejoin="round"');
    // 나침반
    s += '<g transform="translate(60 80)">' + poly('0,-26 6,-6 0,0 -6,-6', '#f0c75e') + poly('0,26 6,6 0,0 -6,6', '#8a93b8') +
      poly('-26,0 -6,-6 0,0 -6,6', '#8a93b8') + poly('26,0 6,-6 0,0 6,6', '#8a93b8') + '<circle r="4" fill="#f0c75e"/></g>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 560" width="1000" height="560">' + s + '</svg>';
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
    world: function () { return G.Pixel.raster('map:world', worldSvg(), 500, 280, 16); },
    fog: function () { return G.Pixel.raster('map:fog', fogSvg(), 100, 70, 8); }
  };
})();
