// art-cards.js — 카드 속성 배경, 카드 틀(17단계: 무공 = 수묵 족자, 그 밖 = 두 세계 분할), 카드 그림 조합
// 프레임(125×175)과 그림(80×66)은 SVG를 직접 표시해 부드럽게 축소한다.
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
  // 속성 판정은 core.js 의 G.cardElement (강화 각인 고르기와 같이 쓴다)
  var elementOf = function (def) { return G.cardElement(def); };

  function bgSvg(el) {
    var c = EL[el] || EL.neutral;
    return '<defs><radialGradient id="bg" cx="0.5" cy="0.55" r="0.75"><stop offset="0" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[0] + '"/></radialGradient></defs>' +
      '<rect width="80" height="66" fill="url(#bg)"/>' +
      '<path d="M0 54 Q20 48 40 54 T80 52 V66 H0 Z" fill="' + c[0] + '" opacity="0.6"/>';
  }

  // ---------------- 17단계 카드 틀 두 종 ----------------
  // 무공 카드 = 수묵 족자: 위아래 족자 막대(끝 장식 = 등급 색), 한지 바탕, 그림 뒤 먹 원(엔소), 본문 위 가는 먹줄
  // 세로 이름은 왼쪽 줄(손패에서 카드가 겹쳐도 가려지지 않게), 그림은 오른쪽
  var CAP = { common: '#8a7a62', uncommon: '#4f9a5a', rare: '#4f86c8', epic: '#8a4ac9', legendary: '#e8b83a' };
  function inkFrameSvg(rarity) {
    var cap = CAP[rarity] || CAP.common, lines = '';
    for (var i = 0; i < 26; i++) lines += '<rect x="5" y="' + (9 + i * 6.2).toFixed(1) + '" width="115" height="0.8" fill="#c8b48a" opacity="0.35"/>';
    var rod = function (y) {
      return '<rect x="0" y="' + y + '" width="125" height="7" rx="2" fill="#4a2814"/><rect x="0" y="' + y + '" width="125" height="2" fill="#7a4a24"/>' +
        '<rect x="0" y="' + (y - 1) + '" width="6" height="9" rx="1" fill="' + cap + '"/><rect x="119" y="' + (y - 1) + '" width="6" height="9" rx="1" fill="' + cap + '"/>';
    };
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 125 175" width="125" height="175">' +
      '<rect x="4" y="5" width="117" height="165" fill="#eadcb8"/>' + lines +
      '<rect x="4" y="5" width="117" height="165" fill="none" stroke="#c8ae7a" stroke-width="3"/>' +
      '<ellipse cx="69" cy="49" rx="44" ry="34" fill="#1a1410" opacity="0.08"/>' +
      '<circle cx="69" cy="49" r="33" fill="none" stroke="#1a1410" stroke-width="4.5" stroke-dasharray="168 40" transform="rotate(-60 69 49)" opacity="0.85"/>' +
      '<rect x="10" y="99" width="105" height="1" fill="#6a4a2a" opacity="0.7"/>' +
      rod(0) + rod(168) + '</svg>';
  }
  // 그 밖의 카드 = 두 세계 분할: 붉은 옻칠(무림)과 푸른 별빛(엘단)을 대각선으로 나눈다. 마법은 푸른 쪽, 융합은 반반
  var SPLIT = { magic: 0.3, fusion: 0.5, neutral: 0.5 };
  var EDGE = { common: '#9aa0aa', uncommon: '#5fbf6a', rare: '#5fa8ff', epic: '#b06aff', legendary: '#ffd23f' };
  function splitFrameSvg(rarity, school) {
    var t = SPLIT[school] != null ? SPLIT[school] : 0.5, edge = EDGE[rarity] || EDGE.common, grey = school === 'neutral';
    var xT = Math.round(t * 125 + 26), xB = Math.round(t * 125 - 26);
    var red0 = grey ? '#4a4650' : '#6a1414', red1 = grey ? '#2e2c34' : '#2e0a0a', blu0 = grey ? '#2e3240' : '#13265a', blu1 = grey ? '#1a1c26' : '#060c22';
    var dots = '', r = 7;
    for (var y = 6; y < 175; y += 9) for (var x = 4 + (y % 2) * 4; x < 125; x += 11) {
      r = (r * 9301 + 49297) % 233280;
      var left = x < xT + (xB - xT) * (y / 175);
      dots += left ? '<circle cx="' + x + '" cy="' + y + '" r="1" fill="#ffc8a0" opacity="0.18"/>' : (r % 3 ? '' : '<rect x="' + x + '" y="' + y + '" width="1.2" height="1.2" fill="#bfe8ff" opacity="0.6"/>');
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 125 175" width="125" height="175">' +
      '<defs><linearGradient id="gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + red0 + '"/><stop offset="1" stop-color="' + red1 + '"/></linearGradient>' +
      '<linearGradient id="gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + blu0 + '"/><stop offset="1" stop-color="' + blu1 + '"/></linearGradient></defs>' +
      '<rect x="0" y="0" width="125" height="175" rx="4" fill="' + edge + '"/><rect x="0" y="0" width="125" height="175" rx="4" fill="none" stroke="' + K + '" stroke-width="2"/>' +
      '<polygon points="3,3 ' + xT + ',3 ' + xB + ',172 3,172" fill="url(#gr)"/><polygon points="' + xT + ',3 122,3 122,172 ' + xB + ',172" fill="url(#gb)"/>' + dots +
      '<line x1="' + xT + '" y1="3" x2="' + xB + '" y2="172" stroke="#ffffff" stroke-width="1.6" opacity="0.85"/>' +
      '<rect x="12" y="15" width="101" height="82" fill="#050913" opacity="0.35" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1.5"/>' +
      '<rect x="3" y="96" width="119" height="23" fill="#050913" opacity="0.82"/><rect x="3" y="96" width="119" height="1.5" fill="' + edge + '"/>' +
      '<rect x="7" y="122" width="111" height="47" rx="2" fill="#050913" opacity="0.62"/>' +
      '</svg>';
  }
  // 무공 카드 그림: 배경 없이 글리프만(먹빛은 화면에서 입힌다)
  function inkArtSvg(def) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 66" width="80" height="66"><g transform="translate(0 5)">' + G.Art.glyph(def.art || 'star') + '</g></svg>';
  }

  // 그림 창이 커져서(12단계) 배경을 80×66 으로 늘리고, 80×56 기준으로 그린 글리프를 가운데로 내린다
  function artSvg(def) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 66" width="80" height="66">' +
      bgSvg(elementOf(def)) + '<g transform="translate(0 5)">' + G.Art.glyph(def.art || 'star') + '</g></svg>';
  }

  G.ArtCards = {
    elementOf: elementOf,
    // 17단계: 무공 = 수묵 족자 틀, 그 밖 = 두 세계 분할 틀(125×175 그대로 찍어 가는 선을 살린다)
    layoutOf: function (school) { return school === 'martial' ? 'ink' : 'split'; },
    frame: function (rarity, school) {
      school = school || 'neutral';
      var ink = school === 'martial';
      return G.Pixel.vector('frame4:' + rarity + ':' + school, ink ? inkFrameSvg(rarity) : splitFrameSvg(rarity, school), 125, 175, 14);
    },
    frameCached: function (rarity, school) { return G.Pixel.rasterCached('frame4:' + rarity + ':' + (school || 'neutral')); },
    art: function (def) {
      if (def.school === 'martial') return G.Pixel.vector('artInk:' + (def.base || def.id), inkArtSvg(def), 50, 41, 10);
      return G.Pixel.vector('art2:' + (def.base || def.id), artSvg(def), 50, 41, 10);
    },
    artCached: function (def) { return G.Pixel.rasterCached((def.school === 'martial' ? 'artInk:' : 'art2:') + (def.base || def.id)); },
    // 미리 변환해 둔다(화면에 처음 뜰 때 빈 그림이 보이지 않도록)
    preload: function (defs) {
      var jobs = [];
      defs.forEach(function (d) { jobs.push(G.ArtCards.art(d)); jobs.push(G.ArtCards.frame(d.rarity, d.school)); });
      return Promise.all(jobs);
    }
  };
})();
