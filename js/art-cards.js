// art-cards.js — 카드 속성 배경, 등급 × 계열(15단계) 프레임, 카드 그림 조합
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
  // 15단계 카드 틀: 계열마다 재질이 다르다. 등급은 바깥 테두리 금속 색과 별로 나타낸다
  //   무공: 검은 옻칠 나무 + 붉은 칠 안쪽 테 + 금 모서리 장식, 본문은 밝은 한지
  //   마법: 짙은 남색 + 빛나는 룬 테, 본문은 어두운 유리
  //   융합: 옻칠 바깥 + 보랏빛 룬 안쪽, 본문은 보랏빛이 도는 한지
  //   무계열: 강철
  var SCHOOL_SKIN = {
    martial: { outer: '#2a1a14', inner: '#a8322c', line: '#e0b050', art: '#1a100c', name: '#3a1c16', text: '#efe3c4', textEdge: '#b89a62' },
    magic: { outer: '#141e3c', inner: '#2f4fa8', line: '#7ad0ff', art: '#0b1226', name: '#141e38', text: '#101a32', textEdge: '#3f6ab8' },
    fusion: { outer: '#2a1a24', inner: '#7a3aa8', line: '#ffd27a', art: '#160c1e', name: '#2c1630', text: '#ece0d4', textEdge: '#a07ac0' },
    neutral: { outer: '#1c2232', inner: '#4f5a74', line: '#aab4c8', art: '#0b1226', name: '#141e38', text: '#101a32', textEdge: '#5a6680' }
  };
  function frameSvg(rarity, school) {
    var m = METAL[rarity] || METAL.common, k = SCHOOL_SKIN[school] || SCHOOL_SKIN.neutral;
    var rune = '';
    if (school === 'magic' || school === 'fusion') {
      // 본문 판 둘레의 룬 점
      for (var i = 0; i < 9; i++) rune += '<rect x="' + (14 + i * 12) + '" y="166" width="3" height="1.5" fill="' + k.line + '" opacity="0.8"/>';
    }
    var corner = school === 'martial' || school === 'fusion' ?
      // 금 모서리 장식(구름무늬 꺾쇠)
      '<polyline points="9,22 9,9 22,9" fill="none" stroke="' + k.line + '" stroke-width="2"/><rect x="11" y="11" width="3" height="3" fill="' + k.line + '"/>' +
      '<polyline points="103,9 116,9 116,22" fill="none" stroke="' + k.line + '" stroke-width="2"/><rect x="111" y="11" width="3" height="3" fill="' + k.line + '"/>' : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 125 175" width="125" height="175">' +
      // 바깥 금속 틀(등급 색, 깎은 모서리)
      '<polygon points="13,1 124,1 124,162 112,174 1,174 1,13" fill="' + m.lo + '" stroke="' + K + '" stroke-width="2"/>' +
      '<polygon points="14,4 121,4 121,161 111,171 4,171 4,14" fill="' + m.mid + '"/>' +
      '<polyline points="5,14 14,5 120,5" fill="none" stroke="' + m.hi + '" stroke-width="2"/>' +
      // 계열 재질
      '<polygon points="15,7 118,7 118,159 109,168 7,168 7,15" fill="' + k.outer + '" stroke="' + K + '" stroke-width="1.5"/>' +
      // 그림 창 테두리(계열 안쪽 테)
      '<rect x="7" y="7" width="111" height="93" fill="' + k.inner + '"/>' +
      '<rect x="9" y="9" width="107" height="89" fill="' + k.art + '"/>' + corner +
      // 이름 판
      '<rect x="7" y="99" width="111" height="18" fill="' + k.name + '" stroke="' + K + '" stroke-width="1.5"/>' +
      '<rect x="8" y="100" width="4" height="16" fill="' + m.gem + '"/>' +
      '<rect x="9" y="116" width="107" height="1" fill="' + k.line + '" opacity="0.6"/>' +
      // 본문 판
      '<rect x="9" y="119" width="107" height="46" fill="' + k.text + '"/>' +
      '<rect x="9" y="119" width="107" height="2" fill="' + k.textEdge + '"/>' +
      '<rect x="9" y="163" width="107" height="2" fill="' + k.textEdge + '"/>' + rune +
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
    SCHOOLS: Object.keys(SCHOOL_SKIN),
    frame: function (rarity, school) { school = school || 'neutral'; return G.Pixel.raster('frame3:' + rarity + ':' + school, frameSvg(rarity, school), 63, 88, 12); },
    frameCached: function (rarity, school) { return G.Pixel.rasterCached('frame3:' + rarity + ':' + (school || 'neutral')); },
    art: function (def) { return G.Pixel.raster('art2:' + (def.base || def.id), artSvg(def), 50, 41, 10); },
    artCached: function (def) { return G.Pixel.rasterCached('art2:' + (def.base || def.id)); },
    // 미리 변환해 둔다(화면에 처음 뜰 때 빈 그림이 보이지 않도록)
    preload: function (defs) {
      var jobs = [];
      defs.forEach(function (d) { jobs.push(G.ArtCards.art(d)); jobs.push(G.ArtCards.frame(d.rarity, d.school)); });
      return Promise.all(jobs);
    }
  };
})();
