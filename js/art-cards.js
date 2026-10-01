// art-cards.js — 카드 속성 배경, 등급별 금속 프레임, 카드 그림 조합
// 프레임(125×175)과 그림(80×56)은 SVG로 그린 뒤 절반 해상도로 찍어 도트 그림으로 쓴다.
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
      '<rect width="80" height="56" fill="url(#bg)"/>' +
      '<path d="M0 46 Q20 40 40 46 T80 44 V56 H0 Z" fill="' + c[0] + '" opacity="0.6"/>';
  }

  // ---------------- 등급별 금속 프레임 ----------------
  var METAL = {
    common: { hi: '#c3c8d0', mid: '#8a8f99', lo: '#4f535c', gem: '#d0d4dc' },
    uncommon: { hi: '#e6b07a', mid: '#b07a45', lo: '#6a4422', gem: '#5fe07a' },
    rare: { hi: '#eef3fa', mid: '#a9b8c9', lo: '#5f6f84', gem: '#4fa8ff' },
    epic: { hi: '#d9b8ff', mid: '#9b6bd6', lo: '#55307f', gem: '#e07aff' },
    legendary: { hi: '#fff0a8', mid: '#e8b83a', lo: '#8a5f12', gem: '#ff5a5a' }
  };
  function frameSvg(rarity) {
    var m = METAL[rarity];
    var corner = function (x, y) {
      return '<rect x="' + (x - 6) + '" y="' + (y - 6) + '" width="12" height="12" fill="' + m.mid + '" stroke="' + K + '" stroke-width="2" transform="rotate(45 ' + x + ' ' + y + ')"/>' +
        '<rect x="' + (x - 2.5) + '" y="' + (y - 2.5) + '" width="5" height="5" fill="' + m.hi + '" transform="rotate(45 ' + x + ' ' + y + ')"/>';
    };
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 125 175" width="125" height="175">' +
      // 바깥 금속 테두리
      '<rect x="1" y="1" width="123" height="173" fill="' + m.lo + '" stroke="' + K + '" stroke-width="2"/>' +
      '<rect x="4" y="4" width="117" height="167" fill="' + m.mid + '"/>' +
      '<rect x="4" y="4" width="117" height="3" fill="' + m.hi + '"/>' +
      '<rect x="8" y="8" width="109" height="159" fill="#1a1d38" stroke="' + K + '" stroke-width="2"/>' +
      // 그림 창
      '<rect x="11" y="27" width="103" height="72" fill="' + m.lo + '" stroke="' + K + '" stroke-width="2"/>' +
      // 이름 띠
      '<rect x="22" y="9" width="92" height="16" fill="' + m.mid + '" stroke="' + K + '" stroke-width="2"/>' +
      '<rect x="24" y="11" width="88" height="12" fill="#2a2e52"/>' +
      // 유형 메달
      '<rect x="38" y="98" width="49" height="13" fill="' + m.mid + '" stroke="' + K + '" stroke-width="2"/>' +
      '<rect x="40" y="100" width="45" height="9" fill="#2a2e52"/>' +
      // 본문 판
      '<rect x="12" y="113" width="101" height="50" fill="#232746" stroke="' + K + '" stroke-width="1.5"/>' +
      // 비용 보석
      '<circle cx="15" cy="15" r="12" fill="' + m.mid + '" stroke="' + K + '" stroke-width="2"/>' +
      '<circle cx="15" cy="15" r="9" fill="#2e6fd8"/><circle cx="12" cy="12" r="3" fill="#8fc6ff"/>' +
      // 등급 보석
      '<rect x="56" y="161" width="13" height="13" fill="' + m.gem + '" stroke="' + K + '" stroke-width="2" transform="rotate(45 62.5 167.5)"/>' +
      corner(118, 9) + corner(7, 168) + corner(118, 168) +
      '</svg>';
  }

  function artSvg(def) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 56" width="80" height="56">' +
      bgSvg(elementOf(def)) + G.Art.glyph(def.art || 'star') + '</svg>';
  }

  G.ArtCards = {
    elementOf: elementOf,
    frame: function (rarity) { return G.Pixel.raster('frame:' + rarity, frameSvg(rarity), 63, 88, 12); },
    frameCached: function (rarity) { return G.Pixel.rasterCached('frame:' + rarity); },
    art: function (def) { return G.Pixel.raster('art:' + def.id, artSvg(def), 50, 35, 10); },
    artCached: function (def) { return G.Pixel.rasterCached('art:' + def.id); },
    // 미리 변환해 둔다(화면에 처음 뜰 때 빈 그림이 보이지 않도록)
    preload: function (defs) {
      var jobs = G.RARITIES.map(function (r) { return G.ArtCards.frame(r); });
      defs.forEach(function (d) { jobs.push(G.ArtCards.art(d)); });
      return Promise.all(jobs);
    }
  };
})();
