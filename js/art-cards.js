// art-cards.js — 카드 속성 배경, 등급별 금속 프레임, 카드 그림 조합
// 프레임(125×175)과 그림(80×66)은 SVG로 그린 뒤 절반 해상도로 찍어 도트 그림으로 쓴다.
(function () {
  'use strict';
  var G = Game;
  var K = '#140d24';

  var EL = {
    fire: ['#4a140c', '#c2401f'], ice: ['#10284a', '#4f9cc8'], lightning: ['#1f1f4a', '#6a6ad9'],
    arcane: ['#22123d', '#7c4dbd'], poison: ['#102a16', '#3f8f2a'], shadow: ['#120b20', '#3b3557'],
    holy: ['#4a3a14', '#d9b25a'], nature: ['#12301a', '#4fae4a'], earth: ['#33240f', '#8a6230'],
    steel: ['#1a2436', '#56719f'], guard: ['#13223f', '#35589a'], gold: ['#40300c', '#c9a020'], neutral: ['#22253a', '#5a5f80']
  };
  var OWNER_EL = { kai: 'steel', bram: 'guard', lyra: 'arcane', sera: 'holy', nox: 'shadow', common: 'neutral', none: 'earth' };

  // 속성: 데이터의 el, 없으면 효과로 추정, 그래도 없으면 소유자 기본값
  function elementOf(def) {
    if (def.el) return def.el;
    var found = null;
    (function walk(list) {
      list.forEach(function (e) {
        if (found) return;
        if (e.op === 'status') {
          if (e.status === 'burn') found = 'fire';
          else if (e.status === 'chill' || e.status === 'frozen') found = 'ice';
          else if (e.status === 'poison') found = 'poison';
        }
        ['then', 'else', 'effects', 'onHit', 'onCrit'].forEach(function (k) { if (Array.isArray(e[k])) walk(e[k]); });
      });
    })(def.effects);
    if (!found && def.art === 'bolt') found = 'lightning';
    if (!found && (def.type === 'heal') && def.owner !== 'sera') found = 'nature';
    return found || OWNER_EL[def.owner] || 'neutral';
  }

  function bgSvg(el) {
    var c = EL[el] || EL.neutral;
    return '<defs><radialGradient id="bg" cx="0.5" cy="0.55" r="0.75"><stop offset="0" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[0] + '"/></radialGradient></defs>' +
      '<rect width="80" height="66" fill="url(#bg)"/>' +
      '<path d="M0 54 Q20 48 40 54 T80 52 V66 H0 Z" fill="' + c[0] + '" opacity="0.6"/>';
  }

  // ---------------- 등급별 금속 프레임 ----------------
  var METAL = {
    common: { hi: '#c3c8d0', mid: '#8a8f99', lo: '#4f535c', gem: '#d0d4dc' },
    uncommon: { hi: '#e6b07a', mid: '#b07a45', lo: '#6a4422', gem: '#5fe07a' },
    rare: { hi: '#eef3fa', mid: '#a9b8c9', lo: '#5f6f84', gem: '#4fa8ff' },
    epic: { hi: '#d9b8ff', mid: '#9b6bd6', lo: '#55307f', gem: '#e07aff' },
    legendary: { hi: '#fff0a8', mid: '#e8b83a', lo: '#8a5f12', gem: '#ff5a5a' }
  };
  // 12단계 카드 틀: 왼쪽 위·오른쪽 아래를 깎은 금속 틀, 큰 그림 창, 아래쪽 이름 판과 본문 판, 왼쪽 위 육각 비용
  function frameSvg(rarity) {
    var m = METAL[rarity] || METAL.common;
    var hex = function (cx, cy, r) {
      var p = [];
      for (var i = 0; i < 6; i++) { var a = Math.PI / 3 * i + Math.PI / 6; p.push((cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1)); }
      return p.join(' ');
    };
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 125 175" width="125" height="175">' +
      // 바깥 금속 틀(깎은 모서리)
      '<polygon points="13,1 124,1 124,162 112,174 1,174 1,13" fill="' + m.lo + '" stroke="' + K + '" stroke-width="2"/>' +
      '<polygon points="14,4 121,4 121,161 111,171 4,171 4,14" fill="' + m.mid + '"/>' +
      '<polyline points="5,14 14,5 120,5" fill="none" stroke="' + m.hi + '" stroke-width="2"/>' +
      '<polygon points="15,7 118,7 118,159 109,168 7,168 7,15" fill="#0b1226" stroke="' + K + '" stroke-width="1.5"/>' +
      // 그림 창 테두리
      '<rect x="7" y="7" width="111" height="93" fill="' + m.lo + '"/>' +
      // 이름 판(왼쪽에 등급 색 띠)
      '<rect x="7" y="99" width="111" height="18" fill="#141e38" stroke="' + K + '" stroke-width="1.5"/>' +
      '<rect x="8" y="100" width="4" height="16" fill="' + m.gem + '"/>' +
      '<rect x="112" y="104" width="4" height="2" fill="' + m.hi + '"/><rect x="112" y="108" width="4" height="2" fill="' + m.hi + '"/>' +
      // 본문 판
      '<rect x="9" y="119" width="107" height="46" fill="#101a32"/>' +
      '<rect x="9" y="119" width="107" height="2" fill="' + m.lo + '"/>' +
      '<rect x="9" y="119" width="6" height="2" fill="' + m.hi + '"/><rect x="110" y="119" width="6" height="2" fill="' + m.hi + '"/>' +
      // 비용 육각
      '<polygon points="' + hex(16.5, 16.5, 13) + '" fill="' + m.mid + '" stroke="' + K + '" stroke-width="2"/>' +
      '<polygon points="' + hex(16.5, 16.5, 10) + '" fill="#1f5fd0"/>' +
      '<polygon points="' + hex(16.5, 16.5, 10) + '" fill="none" stroke="#5aa0ff" stroke-width="1.5"/>' +
      // 오른쪽 아래 장식
      '<polygon points="104,171 111,171 121,161 121,154" fill="' + m.hi + '" opacity="0.8"/>' +
      '</svg>';
  }

  // 그림 창이 커져서(12단계) 배경을 80×66 으로 늘리고, 80×56 기준으로 그린 글리프를 가운데로 내린다
  function artSvg(def) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 66" width="80" height="66">' +
      bgSvg(elementOf(def)) + '<g transform="translate(0 5)">' + G.Art.glyph(def.art || 'star') + '</g></svg>';
  }

  G.ArtCards = {
    elementOf: elementOf,
    frame: function (rarity) { return G.Pixel.raster('frame2:' + rarity, frameSvg(rarity), 63, 88, 12); },
    frameCached: function (rarity) { return G.Pixel.rasterCached('frame2:' + rarity); },
    art: function (def) { return G.Pixel.raster('art2:' + (def.base || def.id), artSvg(def), 50, 41, 10); },
    artCached: function (def) { return G.Pixel.rasterCached('art2:' + (def.base || def.id)); },
    // 미리 변환해 둔다(화면에 처음 뜰 때 빈 그림이 보이지 않도록)
    preload: function (defs) {
      var jobs = G.RARITIES.map(function (r) { return G.ArtCards.frame(r); });
      defs.forEach(function (d) { jobs.push(G.ArtCards.art(d)); });
      return Promise.all(jobs);
    }
  };
})();
