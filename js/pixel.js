// pixel.js — 도트 스프라이트, 도트 아이콘, SVG → 도트 변환
// 스프라이트는 글자 격자로 적는다. half(왼쪽 절반)는 좌우 대칭으로 펼치고, rows(전체)는 그대로 쓴다.
// over 는 비대칭 덧그림('.' 투명, '_' 지우기). 그릴 때 윤곽선 1px과 음영을 자동으로 입힌다.
(function () {
  'use strict';
  var G = Game;
  var OUTLINE = '#140d24';
  var defs = {}, sheets = {}, icons = {}, rasters = {}, pending = {};

  function hex(c) {
    var n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function toHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  }
  function shade(c, k) { // k > 0 밝게, k < 0 어둡게
    var a = hex(c);
    return k > 0 ? toHex(a[0] + (255 - a[0]) * k, a[1] + (255 - a[1]) * k, a[2] + (255 - a[2]) * k)
      : toHex(a[0] * (1 + k), a[1] * (1 + k), a[2] * (1 + k));
  }

  // 격자 → {key:"x,y" → 문자}
  function grid(spec, overList, shiftRows) {
    var g = {};
    var put = function (x, y, ch) {
      if (ch === '.' || ch === ' ') return;
      if (ch === '_') delete g[x + ',' + y]; else g[x + ',' + y] = ch;
    };
    var rows = spec.rows || spec.half.map(function (r) { return r + r.split('').reverse().join(''); });
    rows.forEach(function (row, y) {
      var yy = shiftRows && y < shiftRows ? y + 1 : y;
      for (var x = 0; x < row.length; x++) {
        if (shiftRows && y === shiftRows - 1) put(x, y, row[x]); // 숨쉬기: 어깨선 아래를 비우지 않게 한 줄 남긴다
        put(x, yy, row[x]);
      }
    });
    (overList || []).forEach(function (o) {
      o.rows.forEach(function (row, dy) {
        for (var dx = 0; dx < row.length; dx++) put(o.x + dx, o.y + dy, row[dx]);
      });
    });
    return g;
  }

  function bbox(grids) {
    var b = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    grids.forEach(function (g) {
      Object.keys(g).forEach(function (k) {
        var p = k.split(','), x = +p[0], y = +p[1];
        if (x < b.x0) b.x0 = x; if (y < b.y0) b.y0 = y;
        if (x > b.x1) b.x1 = x; if (y > b.y1) b.y1 = y;
      });
    });
    b.x0--; b.y0--; b.x1++; b.y1++; // 윤곽선 여백
    b.w = b.x1 - b.x0 + 1; b.h = b.y1 - b.y0 + 1;
    return b;
  }

  // 한 프레임을 ctx 의 (ox, oy)에 그린다
  function paint(ctx, g, pal, b, ox, oy, flat) {
    var filled = function (x, y) { return g[x + ',' + y] !== undefined; };
    for (var y = b.y0; y <= b.y1; y++) {
      for (var x = b.x0; x <= b.x1; x++) {
        var ch = g[x + ',' + y], col;
        if (ch === undefined) {
          if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) col = OUTLINE;
          else continue;
        } else {
          col = pal[ch];
          if (!col) continue;
          if (flat.indexOf(ch) < 0) {
            if (!filled(x, y - 1)) col = shade(col, 0.22);
            else if (!filled(x, y + 1) || !filled(x + 1, y)) col = shade(col, -0.22);
          }
        }
        ctx.fillStyle = col;
        ctx.fillRect(ox + x - b.x0, oy + y - b.y0, 1, 1);
      }
    }
  }

  function canvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  var P = G.Pixel = {
    defs: defs,
    def: function (id, spec) { defs[id] = spec; },
    alias: function (id, base, palOver, extra) {
      defs[id] = Object.assign({}, defs[base], { pal: Object.assign({}, defs[base].pal, palOver) }, extra);
    },
    has: function (id) { return !!defs[id]; },

    // 스프라이트 시트: [대기, 숨쉬기, 공격] 3프레임 가로 배치
    sheet: function (id) {
      if (sheets[id]) return sheets[id];
      var spec = defs[id] || defs._unknown;
      var frames = [
        grid(spec, spec.over),
        grid(spec, spec.over, spec.breathe || 0),
        grid(spec, spec.attackOver || spec.over)
      ];
      var b = bbox(frames);
      var c = canvas(b.w * 3, b.h);
      var ctx = c.getContext('2d');
      var flat = spec.flat || 'ew';
      frames.forEach(function (g, i) { paint(ctx, g, spec.pal, b, i * b.w, 0, flat); });
      var width = spec.rows ? spec.rows[0].length : spec.half[0].length * 2;
      var frac = function (p) { return p ? { x: (p.x - b.x0 + 0.5) / b.w, y: (p.y - b.y0 + 0.5) / b.h } : null; };
      return (sheets[id] = {
        url: c.toDataURL(), canvas: c, w: b.w, h: b.h,
        anchor: (width / 2 - b.x0) / b.w, // 몸 중심의 가로 위치(0~1)
        tip: frac(spec.tip), tipAttack: frac(spec.tipAttack || spec.tip)
      });
    },

    // 도트 아이콘 (rows 전체 격자, 윤곽선 자동, 음영 없음)
    icon: function (id) {
      if (icons[id]) return icons[id];
      var spec = ICONS[id] || ICONS.special;
      var g = grid({ rows: spec.rows });
      var b = bbox([g]);
      var c = canvas(b.w, b.h);
      paint(c.getContext('2d'), g, spec.pal, b, 0, 0, Object.keys(spec.pal).join(''));
      return (icons[id] = c.toDataURL());
    },

    // SVG → 낮은 해상도 도트 그림. 같은 key 는 한 번만 변환한다
    rasterCached: function (key) { return rasters[key] || null; },
    raster: function (key, svg, w, h, levels) {
      if (rasters[key]) return Promise.resolve(rasters[key]);
      if (pending[key]) return pending[key];
      pending[key] = new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () {
          var c = canvas(w, h), ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(img, 0, 0, w, h);
          var data = ctx.getImageData(0, 0, w, h), d = data.data, step = 256 / (levels || 10);
          for (var i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
            d[i + 3] = 255;
            for (var k = 0; k < 3; k++) d[i + k] = Math.min(255, Math.round(Math.floor(d[i + k] / step) * step + step / 2));
          }
          ctx.putImageData(data, 0, 0);
          rasters[key] = c.toDataURL();
          delete pending[key];
          resolve(rasters[key]);
        };
        img.onerror = function () { delete pending[key]; resolve(null); };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });
      return pending[key];
    }
  };

  // =====================================================================
  // 캐릭터 (얼굴 공통: e 눈, w 눈 빛, m 입/볼, s 피부, S 피부 그늘)
  // =====================================================================
  var SKIN = { s: '#f7d2ae', S: '#d9a37f', e: '#2a1b3d', w: '#ffffff', m: '#e57f7a' };
  function pal(o) { return Object.assign({}, SKIN, o); }

  // 카이 — 붉은 포니테일, 강철 갑옷, 붉은 스카프, 오른손에 검
  P.def('kai', {
    pal: pal({ h: '#d9503f', H: '#a3322b', a: '#8eaee0', A: '#56719f', g: '#f0c75e', r: '#e0584a', b: '#7a4a2a', p: '#3d3a5c', l: '#5c3b28', k: '#dfe7f2', K: '#9aa7b8' }),
    half: [
      '..........',
      '......hhhh',
      '....hhhhhh',
      '...hhhhhhh',
      '..hhhhhhhh',
      '..hggggggg',
      '..hhhhhhhh',
      '..hhhHshhH',
      '..hhssssss',
      '..hhswesss',
      '..hhseesss',
      '...hsmssss',
      '....sssssm',
      '.....SSSSS',
      '....rrrrrr',
      '..aaarrrrr',
      '.aaAaaaaga',
      '.aaAaaaaga',
      '.ss.Aaaaga',
      '.ss.bbbbgb',
      '....pppppp',
      '....pppppp',
      '.....ppp..',
      '.....ppp..',
      '....llll..',
      '....llll..'
    ],
    over: [
      { x: 1, y: 2, rows: ['..hh', '.hhh', 'hhh.', 'hh..', 'hH..', 'hH..', 'H...'] }, // 포니테일(뒤)
      { x: 18, y: 4, rows: ['.k', '.k', '.k', '.k', '.k', '.k', '.k', '.k', '.k', '.k', '.k', '.K', 'ggg', '.b', '.b'] }
    ],
    attackOver: [
      { x: 1, y: 2, rows: ['..hh', '.hhh', 'hhh.', 'hh..', 'hH..', 'hH..', 'H...'] },
      { x: 18, y: 16, rows: ['.g', 'bgkkkkkkkkkK', '.g'] }
    ],
    breathe: 13,
    tip: { x: 19, y: 5 }, tipAttack: { x: 29, y: 17 }
  });

  // 브리아 — 은발, 금 머리띠, 푸른 판금 갑옷, 큰 방패
  P.def('bram', {
    pal: pal({ h: '#e9e4d6', H: '#b3ab98', a: '#5b8fd9', A: '#35589a', g: '#f0c75e', b: '#6b4a2f', l: '#3b3f5c', d: '#a9bccf', D: '#6f839b' }),
    half: [
      '..........',
      '......hhhh',
      '....hhhhhh',
      '...hhhhhhh',
      '..hhhhhhhh',
      '..hhgggggg',
      '..hhhhhhhh',
      '..hhhHhhhh',
      '..hhssssss',
      '..hhswesss',
      '..hhseesss',
      '..hhsmssss',
      '..h.sssssm',
      '...aa.SSSS',
      '.aaaaaaaaa',
      'aaAaaaaaga',
      'aaAaaaaaga',
      'ssAAaaaaga',
      'ss.AAaaaga',
      '...bbbbbgb',
      '...aaaaaaa',
      '...aAaaaaa',
      '....AAA...',
      '....AAA...',
      '...llll...',
      '...llll...'
    ],
    over: [{ x: 13, y: 13, rows: ['ggggggg', 'gdddddg', 'gddgddg', 'gdgggdg', 'gddgddg', 'gddgddg', 'gDdddDg', '.gDdDg.', '..gDg..', '...g...'] }],
    attackOver: [{ x: 17, y: 13, rows: ['ggggggg', 'gdddddg', 'gddgddg', 'gdgggdg', 'gddgddg', 'gddgddg', 'gDdddDg', '.gDdDg.', '..gDg..', '...g...'] }],
    breathe: 13,
    tip: { x: 16, y: 17 }, tipAttack: { x: 22, y: 17 }
  });

  // 리라 — 보라 마녀 모자, 금발, 보라 로브, 수정 지팡이
  P.def('lyra', {
    pal: pal({ h: '#f2d36b', H: '#c9a441', t: '#7c4dbd', T: '#55308f', g: '#f0c75e', a: '#a274dc', A: '#6d41ad', f: '#8a5a35', o: '#7fe3ff', O: '#e6fbff' }),
    half: [
      '.........T',
      '........TT',
      '.......tTt',
      '......tttt',
      '.....ttttt',
      '....tttggg',
      '.ttttttttt',
      '..hhhhhhhh',
      '..hhhHhhhh',
      '..hhssssss',
      '..hhswesss',
      '..hhseesss',
      '..hhsmssss',
      '..hh.ssssm',
      '..hh..SSSS',
      '..h.aaaaaa',
      '...aaAaaga',
      '..aaaAaaga',
      '.ssaaAaaga',
      '.ssaAAaaga',
      '..aaAaaaga',
      '..aaAaaaaa',
      '.aaaAaaaaa',
      '.aaAAaaaaa',
      '.AAAAAAAAA'
    ],
    over: [
      { x: 6, y: 0, rows: ['____'] },
      { x: 7, y: -2, rows: ['.T', 'TT', 'Tt'] },
      { x: 18, y: 6, rows: ['.O.', 'OoO', 'ooo', '.g.', '.f.', '.f.', '.f.', '.f.', '.f.', '.f.', '.f.', '.f.', '.f.', '.f.', '.f.', '.f.', '.f.', '.f.', '.f.'] }
    ],
    attackOver: [
      { x: 6, y: 0, rows: ['____'] },
      { x: 7, y: -2, rows: ['.T', 'TT', 'Tt'] },
      { x: 18, y: 4, rows: ['O.O.O', '.OoO.', 'OoooO', '.ooo.', '.OgO.', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..'] }
    ],
    breathe: 14,
    tip: { x: 19, y: 7 }, tipAttack: { x: 20, y: 6 }
  });

  // 세라 — 흰 베일, 하늘색 로브, 태양 지팡이
  P.def('sera', {
    pal: pal({ v: '#f4f1ea', V: '#c9c3b6', h: '#9b6a45', g: '#f0c75e', a: '#cfe3f5', A: '#86a9cc', c: '#5b8fd9', f: '#d9b25a', o: '#fff3a8' }),
    half: [
      '..........',
      '......vvvv',
      '....vvvvvv',
      '...vvvvvvv',
      '..vvvggggg',
      '..vvvvvvvv',
      '..vvhhhhhh',
      '..vvhhssss',
      '..vvhsssss',
      '..vvswesss',
      '..vvseesss',
      '..vvsmssss',
      '..vv.ssssm',
      '..Vv..SSSS',
      '..Vvaaaaaa',
      '..VaaacAga',
      '..aaaacAgg',
      '.ssaaacAgg',
      '.ssaaacAgg',
      '..aaaacAga',
      '..aaaacaaa',
      '.aaaaacaaa',
      '.aaaaacaaa',
      '.aAAaacaaa',
      '.AAAAAAAAA'
    ],
    over: [{ x: 18, y: 3, rows: ['.o.o.', '..g..', 'ogggo', '..g..', '.o.o.', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..'] }],
    attackOver: [{ x: 18, y: 1, rows: ['o.o.o', '.ogo.', 'ogggo', '.ogo.', 'o.o.o', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..', '..f..'] }],
    breathe: 13,
    tip: { x: 20, y: 5 }, tipAttack: { x: 20, y: 3 }
  });

  // 녹스 — 짙은 후드, 초록 목도리, 오른손에 단검
  P.def('nox', {
    pal: pal({ v: '#3b3557', V: '#25213a', h: '#2e2a45', g: '#4fbf8a', G: '#2f8a5e', a: '#4a4466', A: '#2f2a47', b: '#6b4a2f', l: '#24203a', k: '#dfe7f2', K: '#9aa7b8', y: '#b6ff9e' }),
    half: [
      '..........',
      '......vvvv',
      '....vvvvvv',
      '...vvvvvvv',
      '..vvvvvvvv',
      '..vvvvvvvv',
      '..vvVhhhhh',
      '..vvhhhhhh',
      '..vvhsssss',
      '..vvsyesss',
      '..vvseesss',
      '..vvssssss',
      '..vv.sssss',
      '..vv.ggggg',
      '...ggggggg',
      '..aagGaaaa',
      '..aaaGaaba',
      '.ssaaGaaba',
      '.ssaaAaaba',
      '...bbbbbbb',
      '....aaaaaa',
      '....aaaaaa',
      '.....AAA..',
      '.....AAA..',
      '....llll..',
      '....llll..'
    ],
    flat: 'ewy',
    over: [{ x: 18, y: 16, rows: ['.k', '.k', 'gK', '.b'] }, { x: 2, y: 14, rows: ['gg', 'gG', '.G'] }],
    attackOver: [{ x: 18, y: 17, rows: ['bgKkkk'] }, { x: 2, y: 14, rows: ['gg', 'gG', '.G'] }],
    breathe: 13,
    tip: { x: 19, y: 16 }, tipAttack: { x: 23, y: 17 }
  });

  // =====================================================================
  // 아이콘 (행동 예고·상태이상·메뉴)
  // =====================================================================
  var ICONS = {
    attack: { pal: { k: '#e9eef5', K: '#9aa7b8', g: '#f0c75e', b: '#7a4a2a' }, rows: [
      '.......kk', '......kkK', '.....kkK.', '....kkK..', 'g..kkK...', '.gkkK....', '..gK.....', '.b.g.....', 'b...g....'] },
    block: { pal: { a: '#7fb3ff', A: '#3f6fc8', w: '#ffffff' }, rows: [
      'aaaaaaaa', 'awwaaaaA', 'awaaaaaA', 'aaaaaaaA', 'aaaaaaaA', '.aaaaaA.', '..aaaA..', '...aA...'] },
    buff: { pal: { g: '#7cf27c', G: '#2f9a3f' }, rows: [
      '...gg...', '..gggg..', '.gggggg.', 'gggggggg', '..gGGg..', '..gGGg..', '..gGGg..', '..GGGG..'] },
    debuff: { pal: { r: '#ff6a6a', R: '#a32a3a' }, rows: [
      '..rRRr..', '..rRRr..', '..rRRr..', '..rRRr..', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '...rr...'] },
    special: { pal: { y: '#ffe066', Y: '#c9a020' }, rows: [
      '....y....', '...yyy...', 'yyyyyyyyy', '.yyyYyyy.', '..yyyyy..', '.yyy.yyy.', '.yy...yy.', 'y.......y'] },
    strength: { pal: { r: '#ff7a5a', R: '#b3402f', w: '#ffd0b0' }, rows: [
      '..rrr...', '.rwrrr..', '.rrrrr..', '..rRrr..', '...rrrr.', '..rrrrrr', '..rrRRrr', '...rrrr.'] },
    focus: { pal: { w: '#ffffff', b: '#4fc3ff', k: '#1a1028' }, rows: [
      '..wwww..', '.wbbbbw.', 'wbbkkbbw', 'wbkkkkbw', 'wbbkkbbw', '.wbbbbw.', '..wwww..'] },
    keen: { pal: { y: '#fff27a', o: '#ffb43a' }, rows: [
      '...y...', 'y..y..y', '.y.y.y.', '..ooo..', 'yyoooyy', '..ooo..', '.y.y.y.', 'y..y..y', '...y...'] },
    critUp: { pal: { y: '#ffd23f', r: '#ff5a5a' }, rows: [
      'r..y..r', '.r.y.r.', '..yyy..', 'yyyyyyy', '..yyy..', '.r.y.r.', 'r..y..r'] },
    regen: { pal: { g: '#7cf27c', G: '#2f9a3f' }, rows: [
      '...gg...', '...gg...', '.gggggg.', '.gggggg.', '...gg...', '...gg...', '..GGGG..'] },
    thorns: { pal: { g: '#9be36a', G: '#4f8f3a', w: '#ffffff' }, rows: [
      'w...w...w', 'gw.gwg.wg', '.gGgggGg.', 'ggggggggg', '.GgGgGgG.'] },
    taunt: { pal: { r: '#ff5a5a', R: '#a32a3a' }, rows: [
      '.rrr.', '.rrr.', '.rrr.', '.rrr.', '..r..', '.....', '.rrr.', '.RRR.'] },
    reduce: { pal: { a: '#9fb3c8', A: '#6b7f96', g: '#f0c75e' }, rows: [
      'gggggg', 'gaaaag', 'gaAAag', 'gaAAag', '.gaag.', '..gg..'] },
    hold: { pal: { a: '#7fb3ff', A: '#3f6fc8', g: '#f0c75e' }, rows: [
      'gaaaaaag', 'gaaaaaag', 'gaaggaag', 'gaaggaag', '.gaaaag.', '..gaag..', '...gg...'] },
    affinity: { pal: { r: '#ff7a3a', b: '#7fe3ff' }, rows: [
      'r.....b', '.r...b.', '..r.b..', '...rb..', '..b.r..', '.b...r.', 'b.....r'] },
    burn: { pal: { r: '#ff5a2a', y: '#ffd23f', o: '#ff9a3a' }, rows: [
      '...r....', '..rr..r.', '.rror.rr', '.roorrrr', 'rooyyorr', 'royyyyor', 'royyyyor', '.rooyor.'] },
    poison: { pal: { g: '#8be04a', G: '#3f8f2a', w: '#e6ffcc' }, rows: [
      '...g...', '..ggg..', '.ggggg.', 'gwggggg', 'gwggggg', 'gggggGg', '.gGGGg.'] },
    weak: { pal: { k: '#c9d2dc', K: '#7a8696', r: '#ff6a6a' }, rows: [
      '......kk', '.....kK.', '....kK..', '........', '..kK.r..', '.kK...r.', 'kK......', 'K.......'] },
    vulnerable: { pal: { a: '#ff9a7a', A: '#b3402f', k: '#1a1028' }, rows: [
      'aaaaaaaa', 'aaakaaaA', 'aaaakaaA', 'aaakkaaA', 'aaaakaaA', '.aaakaA.', '..aakA..', '...aA...'] },
    chill: { pal: { b: '#9fe6ff', B: '#4fa8d9' }, rows: [
      '...b...', 'b.bbb.b', '.b.b.b.', 'bbbBbbb', '.b.b.b.', 'b.bbb.b', '...b...'] },
    frozen: { pal: { b: '#9fe6ff', B: '#4fa8d9', w: '#ffffff' }, rows: [
      'bbbbbbbb', 'bwwbbbbB', 'bwbbbbbB', 'bbbbbbbB', 'bbbbbwbB', 'bbbbbbbB', 'BBBBBBBB'] },
    stun: { pal: { y: '#ffe066' }, rows: [
      'y.....y', '.y...y.', '..y.y..', '...y...', '..y.y..', '.y...y.', 'y.....y'] },
    charge: { pal: { y: '#ffe066', Y: '#ff9a3a' }, rows: [
      '....yy', '...yy.', '..yy..', '.yyyyy', '...yy.', '..yY..', '.yY...', 'yY....'] },
    doom: { pal: { w: '#e9e4d6', k: '#1a1028', r: '#ff3a5a' }, rows: [
      '.wwwww.', 'wwwwwww', 'wkkwkkw', 'wkrwkrw', 'wwwkwww', '.wwwww.', '.wkwkw.'] },
    freezeImmune: { pal: { b: '#9fe6ff', g: '#f0c75e' }, rows: [
      'gggggg', 'gb.b.g', 'g.bb.g', 'gb.b.g', '.g..g.', '..gg..'] },
    energy: { pal: { b: '#7fe3ff', B: '#2e8fd8', w: '#ffffff' }, rows: [
      '...bb...', '..bwbb..', '.bwbbbb.', 'bbbbbbbB', '.bbbbbB.', '..bbBB..', '...BB...'] },
    gold: { pal: { y: '#ffd23f', Y: '#c99a20', w: '#fff8c0' }, rows: [
      '.yyyy.', 'ywyyyy', 'yyYYyY', 'yyYyyY', 'yyyyyY', '.YYYY.'] },
    heart: { pal: { r: '#ff5a6a', w: '#ffd0d6' }, rows: [
      '.rr.rr.', 'rwrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'] },
    deck: { pal: { a: '#5b8fd9', A: '#2f4f8f', w: '#e6eefc' }, rows: [
      '..aaaaa', '.aAAAAa', 'aAwwwAa', 'aAwwwAa', 'aAwwwAa', 'aAAAAa.', 'aaaaa..'] },
    discard: { pal: { a: '#8a8f99', A: '#5a5f69', r: '#ff6a6a' }, rows: [
      'aaaaa..', 'aAAAAa.', 'aArrrAa', 'aAAAAAa', 'aArrrAa', '.aAAAAa', '..aaaaa'] },
    exhaust: { pal: { r: '#ff7a3a', y: '#ffd23f' }, rows: [
      '..r..r.', '.rr.rr.', '.ryrryr', 'ryyyyyr', 'ryyyyyr', '.ryyyr.'] },
    // 맵·노드
    crown: { pal: { y: '#ffd23f', Y: '#c99a20', r: '#ff5a5a' }, rows: [
      'y..y..y', 'yy.y.yy', 'yyyyyyy', 'yryyyry', 'YYYYYYY'] },
    elite: { pal: { w: '#e9e4d6', k: '#1a1028', r: '#ff5a5a' }, rows: [
      'r.....r', 'rr...rr', '.wwwww.', 'wkkwkkw', 'wwwkwww', '.wkwkw.'] },
    campfire: { pal: { r: '#ff7a2a', y: '#ffd23f', b: '#8a5a35' }, rows: [
      '...r...', '..rr.r.', '.ryrrr.', '.ryyyr.', '..ryr..', 'b.bbb.b', '.b...b.'] },
    lock: { pal: { a: '#8a93b8', A: '#5a6080', k: '#1a1028' }, rows: [
      '.aaa.', 'a...a', 'a...a', 'AAAAA', 'AAkAA', 'AAkAA', 'AAAAA'] },
    check: { pal: { g: '#7cf27c' }, rows: [
      '......g', '.....gg', 'g...gg.', 'gg.gg..', '.ggg...', '..g....'] }
  };
  P.ICONS = ICONS;
})();
