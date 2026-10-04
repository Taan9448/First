// pixel.js — 도트 아이콘, SVG → 도트 변환, 스프라이트 시트 창구
// 캐릭터·몬스터 그림은 11단계부터 도형 렌더러(pixel-render.js · sprites-*.js)가 그리고, 이 파일은 시트 요청을 넘겨준다.
// 아이콘은 글자 격자로 적는다. half(왼쪽 절반)는 좌우 대칭으로 펼치고, rows(전체)는 그대로 쓴다.
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
    // 그림자 변형: 색을 어두운 보랏빛으로 바꾸고 눈을 붉게, 좌우를 뒤집는다(적 쪽에서 왼쪽을 본다)
    shadow: function (id, base) {
      var src = defs[base], p = {};
      Object.keys(src.pal).forEach(function (k) {
        var a = hex(src.pal[k]), l = (a[0] * 0.3 + a[1] * 0.5 + a[2] * 0.2) / 255;
        p[k] = toHex(28 + l * 70, 18 + l * 40, 48 + l * 95);
      });
      p.e = '#ff3a5a'; p.w = '#ffd0d8';
      defs[id] = Object.assign({}, src, { pal: p, flip: true });
    },

    // 스프라이트 시트. 캐릭터·몬스터는 도형 렌더러(js/pixel-render.js, 대기 8 + 공격 1프레임)가 그린다.
    // 글자 격자 시트(대기, 숨쉬기, 공격 3프레임)는 정의가 남아 있는 경우에만 쓴다
    sheet: function (id) {
      var art = G.CharacterArt && G.CharacterArt.sheet(id);
      if (art) return art;
      if (G.Shape && G.Shape.has(id)) return G.Shape.sheet(id);
      if (sheets[id]) return sheets[id];
      if (!defs[id] && G.Shape) return G.Shape.sheet('_unknown');
      var spec = defs[id] || defs._unknown;
      var frames = [
        grid(spec, spec.over),
        grid(spec, spec.over, spec.breathe || 0),
        grid(spec, spec.attackOver || spec.over)
      ];
      var width = spec.rows ? spec.rows[0].length : spec.half[0].length * 2;
      if (spec.flip) {
        frames = frames.map(function (g) {
          var f = {};
          Object.keys(g).forEach(function (k) { var q = k.split(','); f[(width - 1 - q[0]) + ',' + q[1]] = g[k]; });
          return f;
        });
      }
      var b = bbox(frames);
      var c = canvas(b.w * 3, b.h);
      var ctx = c.getContext('2d');
      var flat = spec.flat || 'ew';
      frames.forEach(function (g, i) { paint(ctx, g, spec.pal, b, i * b.w, 0, flat); });
      var frac = function (p) {
        if (!p) return null;
        var x = spec.flip ? width - 1 - p.x : p.x;
        return { x: (x - b.x0 + 0.5) / b.w, y: (p.y - b.y0 + 0.5) / b.h };
      };
      return (sheets[id] = {
        url: c.toDataURL(), canvas: c, w: b.w, h: b.h, fw: b.w, fh: b.h, frames: 3,
        anchor: (width / 2 - b.x0) / b.w, // 몸 중심의 가로 위치(0~1)
        tip: frac(spec.tip), tipAttack: frac(spec.tipAttack || spec.tip)
      });
    },

    // 도트 아이콘 (rows 전체 격자, 윤곽선 자동, 음영 없음)
    iconNames: function () { return Object.keys(ICONS); },   // 36단계: 리소스 요청서·확인 화면이 아이콘 목록을 쓴다
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
    vector: function (key, svg) {
      if (!rasters[key]) rasters[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg).replace(/[!'()*]/g, function (c) { return '%' + c.charCodeAt(0).toString(16); });
      return Promise.resolve(rasters[key]);
    },
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
      '......g', '.....gg', 'g...gg.', 'gg.gg..', '.ggg...', '..g....'] },
    // 맵 노드·이벤트
    book: { pal: { r: '#d9504a', R: '#8a2a2a', w: '#f2ead8', y: '#ffd23f' }, rows: [
      '.rrrrrr.', 'rRwwwwwr', 'rRwyywwr', 'rRwwwwwr', 'rRwwyywr', 'rRwwwwwr', 'rRrrrrrr', '.RRRRRRR'] },
    gear: { pal: { a: '#c8d0e8', A: '#7a84a8', k: '#1a1028' }, rows: [
      '...aa...', '.a.aa.a.', '..aaaa..', 'aaaAAaaa', 'aaAkkAaa', '..aAAa..', '.a.aa.a.', '...aa...'] },
    event: { pal: { y: '#ffd23f', Y: '#c99a20' }, rows: [
      '.yyyy.', 'yY..yY', '....yY', '...yY.', '..yY..', '......', '..yY..'] },
    shop: { pal: { b: '#c98a4a', B: '#8a5a2a', y: '#ffd23f', k: '#5a3a20' }, rows: [
      '..k.k..', '.k...k.', 'bbbbbbb', 'bbbyybB', 'bbyybbB', 'bbbbbbB', '.BBBBB.'] },
    anvil: { pal: { a: '#9aa7b8', A: '#5a6070', y: '#ffd23f' }, rows: [
      '..y.y..', '...y...', 'aaaaaaa', '.aaaaaA', '..aaA..', '.aaaaA.', 'AAAAAAA'] },
    skull: { pal: { w: '#e8e4d8', W: '#a8a090', k: '#1a1028' }, rows: [
      '.wwwww.', 'wwwwwwW', 'wkkwkkW', 'wkkwkkW', 'wwwkwwW', '.wwwwW.', '.wkwkW.'] },
    chest: { pal: { b: '#a8683a', B: '#6a3a1a', y: '#ffd23f' }, rows: [
      '.bbbbb.', 'bbbbbbB', 'yyyyyyy', 'bbbybbB', 'bbbbbbB', 'BBBBBBB'] },
    dice: { pal: { w: '#f2f2f2', W: '#a8a8b8', k: '#1a1028' }, rows: [
      'wwwwwwW', 'wkwwwkW', 'wwwwwwW', 'wwwkwwW', 'wwwwwwW', 'wkwwwkW', 'WWWWWWW'] },
    mirror: { pal: { g: '#f0c75e', s: '#cfe3ff', S: '#7a8ab8', k: '#3a2a5a' }, rows: [
      '.ggggg.', 'gsssSSg', 'gssSSkg', 'gsSSkkg', 'gSSkkSg', 'gSkkSSg', '.ggggg.', '...g...', '.ggggg.'] },

    // 유물
    r_hourglass: { pal: { y: '#f0c75e', w: '#cfefff', s: '#e0c27a' }, rows: ['yyyyyyy', '.wsssw.', '..wsw..', '...s...', '..w.w..', '.wsssw.', 'yyyyyyy'] },
    r_whetstone: { pal: { a: '#9aa7b8', A: '#5a6070', y: '#fff27a' }, rows: ['......y', '.....y.', '.aaaa..', 'aAAAAa.', 'aAAAAAa', '.aaaaa.'] },
    r_amulet: { pal: { g: '#f0c75e', b: '#5b8fd9', B: '#35589a', w: '#cfe3ff' }, rows: ['..g.g..', '...g...', '.bbbbb.', 'bbwbbbb', 'bbbbbbB', '.bbbbB.', '..bbB..'] },
    r_herbs: { pal: { b: '#8a5a35', B: '#5a3a20', g: '#7cd65a', G: '#3f8f2a' }, rows: ['..g.g..', '.gGgG..', '..bbb..', '.bbbbb.', 'bbBbbbb', 'bbbbbBb', '.bbbbb.'] },
    r_coin: { pal: { y: '#ffd23f', Y: '#c99a20', g: '#4fbf4f' }, rows: ['.yyyyy.', 'yyyyyyY', 'yyg.gyY', 'yy.g.yY', 'yyg.gyY', 'yyyyyyY', '.YYYYY.'] },
    r_powder: { pal: { k: '#3b3557', K: '#24203a', b: '#8a5a35', y: '#ffe066', r: '#ff7a2a' }, rows: ['.....yr', '....b..', '..kkb..', '.kkkkk.', 'kkKkkkk', 'kkkkkKk', '.kkkkk.'] },
    r_glove: { pal: { b: '#a8683a', B: '#6a3a1a', g: '#f0c75e' }, rows: ['.b.b.b.', '.b.b.b.', 'bbbbbb.', 'bbbbbbb', 'bBbbbbb', '.gggggg', '.bbbbb.'] },
    r_bell: { pal: { s: '#dfe7f2', S: '#9aa7b8', y: '#f0c75e' }, rows: ['...y...', '..sss..', '.sssss.', '.sssss.', 'ssssssS', 'SSSSSSS', '...y...'] },
    r_needle: { pal: { s: '#dfe7f2', g: '#8be04a', G: '#3f8f2a' }, rows: ['......s', '.....s.', '....s..', '...s...', '..s....', '.g.....', 'gG.....'] },
    r_flint: { pal: { a: '#8a8f99', A: '#4f535c', r: '#ff7a2a', y: '#ffe066' }, rows: ['....y.r', '...r.y.', '.aaaa..', 'aAaaaa.', 'aaAaaaa', '.aaaAa.'] },
    r_frost: { pal: { b: '#9fe6ff', B: '#4fa8d9', w: '#ffffff' }, rows: ['...b...', '..bwb..', '.bbwbb.', 'bbbbbbb', '.bbBbb.', '..bBb..', '...b...'] },
    r_bandage: { pal: { w: '#f4f1ea', W: '#c9c3b6', r: '#d94a4a' }, rows: ['.wwwww.', 'wWwwwWw', 'ww.r.ww', 'w.rrr.w', 'ww.r.ww', 'wWwwwWw', '.wwwww.'] },
    r_crest: { pal: { b: '#d94a4a', B: '#8a2a2a', s: '#dfe7f2', y: '#f0c75e' }, rows: ['bbbsbbb', 'bbbsbbB', 'bysssyB', 'bbbsbbB', '.bbsbB.', '..bbB..', '...B...'] },
    r_feather: { pal: { r: '#ff5a2a', y: '#ffe066', o: '#ff9a3a' }, rows: ['.....yr', '....yor', '...yor.', '..yor..', '.yor...', '.or....', 'r......'] },
    r_mana: { pal: { b: '#4fd8ff', B: '#1f8fb8', w: '#ffffff' }, rows: ['...b...', '..bwb..', '.bwbbb.', 'bbbbbbB', '.bbbbB.', '..bbB..', '...B...'] },
    r_thorn: { pal: { g: '#7cb84a', G: '#3f6a2a', w: '#ffffff' }, rows: ['.w.w.w.', 'ggggggg', 'g.....g', 'g.....G', 'g.....G', 'GGGGGGG', '.w.w.w.'] },
    r_flask: { pal: { g: '#e6fff0', p: '#c96aff', P: '#7a3aa8' }, rows: ['..ggg..', '..g.g..', '.g...g.', 'gpppppg', 'gpPpppg', 'gppppPg', '.ggggg.'] },
    r_mark: { pal: { r: '#ff5a5a', w: '#ffffff' }, rows: ['...r...', '.rrrrr.', '.r...r.', 'rr.w.rr', '.r...r.', '.rrrrr.', '...r...'] },
    r_boots: { pal: { a: '#9aa7b8', A: '#5a6070', b: '#6a4a2a' }, rows: ['.aa.aa.', '.aa.aa.', '.aa.aa.', '.Aa.Aa.', 'aaa.aaa', 'aaa.aaa', 'bbb.bbb'] },
    r_horn: { pal: { y: '#f0c75e', Y: '#a8792a', w: '#fff3c0' }, rows: ['y......', 'yy.....', '.yyy...', '..yyyy.', '...yyyw', '....Yyw', '......w'] },
    r_heart: { pal: { r: '#d9334a', R: '#8a1a2a', y: '#ffd23f', o: '#ff7a2a' }, rows: ['.o...o.', 'rroyrr.', 'rrrrrrR', 'rrrrrrR', '.rrrrR.', '..rrR..', '...R...'] },
    r_book: { pal: { p: '#7c4dbd', P: '#4f2c86', y: '#f0c75e', w: '#f4f1ea' }, rows: ['.ppppp.', 'pyyyyyp', 'pwwwwwp', 'pw.y.wp', 'pwwwwwp', 'pyyyyyP', '.PPPPP.'] },
    r_dagger: { pal: { k: '#3b3557', s: '#9a8fbf', w: '#e6e0ff', g: '#c9a0ff' }, rows: ['......w', '.....ws', '....ws.', '...ws..', 'k.ws...', '.kk....', 'kgk....'] },
    r_seed: { pal: { g: '#7cd65a', G: '#3f8f2a', b: '#8a5a35' }, rows: ['..g.g..', '.ggGgg.', '...G...', '...G...', '..bbb..', '.bbbbb.', '..bbb..'] },
    r_icecrown: { pal: { i: '#9fe6ff', I: '#4fa8d9', w: '#ffffff' }, rows: ['i..i..i', 'ii.i.ii', 'iiiwiii', 'iwiiiwi', 'IIIIIII'] },
    r_scales: { pal: { y: '#f0c75e', Y: '#a8792a' }, rows: ['...y...', 'yyyyyyy', 'y..y..y', 'y..y..y', 'YY.y.YY', '...y...', '.yyyyy.'] },
    r_demoncrown: { pal: { k: '#3a2852', r: '#ff3a5a', y: '#f0c75e' }, rows: ['k..k..k', 'kk.k.kk', 'kkkkkkk', 'kykrkyk', 'yyyyyyy'] },
    r_gear: { pal: { a: '#c9ccd4', A: '#7a8090', k: '#1a1028' }, rows: ['.a.a.a.', 'aaaaaaa', '.aakaa.', 'aakkkaA', '.aakaA.', 'aaaaaaA', '.A.A.A.'] },
    r_contract: { pal: { w: '#f4e6c0', r: '#d9334a', b: '#8a5a35' }, rows: ['bwwwwwb', '.w.r.w.', '.wwwww.', '.w.r.w.', '.wwwrr.', '.wwwrr.', 'bwwwwwb'] },
    r_stone: { pal: { r: '#ff3a5a', R: '#a3203a', w: '#ffd0d6' }, rows: ['..rrr..', '.rwrrr.', 'rwrrrrR', 'rrrrrrR', 'rrrrrRR', '.rrRRR.', '..RRR..'] }
  };
  // 12단계: 로비·메뉴 아이콘
  Object.assign(ICONS, {
    map: { pal: { p: '#e8d8a8', P: '#b8a070', r: '#ff5a5a', g: '#6fb36a' }, rows: [
      'ppPPppPPp', 'pgPPpgPPp', 'pgPPggPPp', 'ppPPrpPPp', 'ppPrrrPPp', 'ppPPrpPPp', 'ppPPppPPp'] },
    party: { pal: { a: '#9ab8ff', A: '#4a6ad0', b: '#ffcb52', B: '#c08a20' }, rows: [
      '.aa..bb.', 'aaaabbbb', 'aaaabbbb', '.aa..bb.', '........', 'aaaabbbb', 'aaaabbbb', 'AAAABBBB'] },
    scroll: { pal: { p: '#f0e0b0', P: '#b89a60', k: '#6a4a22' }, rows: [
      'PPPPPPPP.', 'PppppppPP', '.pkkkkpP.', '.ppppppP.', '.pkkkppP.', '.ppppppP.', '.pkkkkpP.', 'PPppppppP', '.PPPPPPPP'] },
    stats: { pal: { c: '#5ee6ff', C: '#2a8fb8', w: '#e8f0ff' }, rows: [
      '......cc', '......cC', '...cc.cC', '...cC.cC', 'cc.cC.cC', 'cC.cC.cC', 'wwwwwwww'] },
    home: { pal: { a: '#e8f0ff', A: '#8aa0c8', r: '#ff6a6a', R: '#b33a3a' }, rows: [
      '...rr...', '..rrrr..', '.rrrrrr.', 'rRRRRRRr', '.aaaaaa.', '.aaAAaa.', '.aaAAaa.'] },
    swap: { pal: { w: '#e8f0ff', c: '#5ee6ff' }, rows: [
      '..w.....', '.wwwwww.', '..w.....', '........', '.....c..', '.cccccc.', '.....c..'] },
    help: { pal: { w: '#e8f0ff', c: '#5ee6ff' }, rows: [
      '.cccc.', 'cc..cc', '....cc', '...cc.', '..cc..', '......', '..cc..'] },
    // 던전 지도(14단계): 모르는 방, 입구 문, 열린 상자
    unknown: { pal: { w: '#b8a888', W: '#6a5a48' }, rows: [
      '..www..', '.w...W.', 'w..ww.W', 'w.w.W.W', 'w.WW..W', '.W...W.', '..WWW..'] },
    door: { pal: { s: '#8a8a9a', S: '#55556a', b: '#7a4a24', B: '#4a2a14', y: '#ffd23f' }, rows: [
      '.sssss.', 'ssbbbsS', 'sbbBbbS', 'sbbBbbS', 'sbbByBS', 'sbbBbbS', 'SSSSSSS'] },
    chest_open: { pal: { b: '#a8683a', B: '#6a3a1a', y: '#ffd23f', w: '#fff6c0' }, rows: [
      '.bbbbb.', 'bBBBBBb', '.wyywy.', 'yyyyyyy', 'bbbybbB', 'bbbbbbB', 'BBBBBBB'] },
    sword2: { pal: { k: '#e9eef5', K: '#9aa7b8', r: '#ff5a5a', g: '#f0c75e' }, rows: [
      'k.......k', '.k.....k.', '..k...k..', '...kKk...', '....K....', '...kKk...', '..g...g..', '.r.....r.', 'r.......r'] }
  });
  // 카드 등급 별(1~5단계 색)
  [['common', '#c9ced8', '#7a808c'], ['uncommon', '#7cf27c', '#2f9a3f'], ['rare', '#7ac4ff', '#2f6fc8'], ['epic', '#e09aff', '#8a3ad0'], ['legendary', '#ffe066', '#c98a10']].forEach(function (r) {
    ICONS['star_' + r[0]] = { pal: { y: r[1], Y: r[2], w: '#ffffff' }, rows: ['...y...', '...w...', 'yyywyyy', '.yyyyY.', '..yyY..', '.yY.yY.', 'Y.....Y'] };
  });
  P.ICONS = ICONS;
})();
