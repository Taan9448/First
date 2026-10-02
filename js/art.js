// art.js — 카드 일러스트 글리프(SVG, 80×56), 테마별 전투 배경(SVG, 400×150)
// 모두 낮은 해상도로 도트 변환(Pixel.raster)해서 쓴다.
(function () {
  'use strict';
  var K = '#140d24'; // 윤곽선
  // 기본 윤곽선 속성에 extra 의 속성을 덮어쓴다 (같은 속성이 두 번 나오면 SVG 가 깨진다)
  function attrs(fill, extra) {
    var a = { fill: fill, stroke: K, 'stroke-width': '2.4', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
    (extra || '').replace(/([\w-]+)="([^"]*)"/g, function (_, k, v) { a[k] = v; });
    return Object.keys(a).map(function (k) { return k + '="' + a[k] + '"'; }).join(' ');
  }
  function path(d, fill, extra) { return '<path d="' + d + '" ' + attrs(fill, extra) + '/>'; }
  function circ(x, y, r, fill, extra) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" ' + attrs(fill, extra) + '/>'; }
  function rect(x, y, w, h, fill, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" ' + attrs(fill, extra) + '/>'; }
  function g(tf, body) { return '<g transform="' + tf + '">' + body + '</g>'; }
  function glow(x, y, r, c) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c + '" opacity="0.35"/>'; }

  // 세로 검 (중심 x=0, 칼끝 y=-22, 손잡이 끝 y=18)
  function swordShape(blade, guard, grip, len) {
    len = len || 22;
    return path('M-3 8 L-3 ' + (-len + 4) + ' L0 ' + (-len) + ' L3 ' + (-len + 4) + ' L3 8 Z', blade) +
      rect(-9, 8, 18, 4, guard) + rect(-2, 12, 4, 7, grip) + circ(0, 21, 2.5, guard);
  }
  var steel = '#e3eaf4', gold = '#f0c75e', brown = '#7a4a2a';

  var GLYPH = {
    sword: g('translate(40 28) rotate(40)', swordShape(steel, gold, brown)),
    twin: g('translate(40 28) rotate(35)', swordShape(steel, gold, brown)) + g('translate(40 28) rotate(-35)', swordShape('#cfd8e6', gold, brown)),
    katana: g('translate(40 30) rotate(50)', path('M-2 8 Q-4 -12 1 -28 Q3 -12 2 8 Z', steel) + rect(-6, 8, 12, 3, gold) + rect(-2, 11, 4, 10, '#3b3557')),
    holySword: glow(40, 28, 22, '#fff3a8') + g('translate(40 28) rotate(40)', swordShape('#fff8d8', gold, '#d9b25a')),
    dagger: g('translate(40 30) rotate(35)', swordShape(steel, '#4fbf8a', '#3b3557', 12)),
    pierce: g('translate(36 32) rotate(45)', path('M-1.5 10 L-1.5 -24 L0 -28 L1.5 -24 L1.5 10 Z', steel) + circ(0, 12, 5, gold) + rect(-1.5, 15, 3, 7, brown)) +
      path('M58 10 l3 6 6 1 -5 4 1 6 -5 -3 -5 3 1 -6 -5 -4 6 -1 Z', '#fff27a'),
    hammer: g('translate(40 28) rotate(30)', rect(-2.5, -6, 5, 28, brown) + rect(-12, -18, 24, 12, '#9aa7b8') + rect(-12, -18, 6, 12, '#c9d2dc')),
    axe: g('translate(40 28) rotate(25)', rect(-2, -16, 4, 36, brown) + path('M2 -16 Q18 -14 18 -2 Q10 -6 2 -4 Z', steel)),
    dash: path('M8 20 H30 M4 28 H28 M10 36 H30', 'none', 'stroke="#9fe6ff"') + g('translate(48 28) rotate(90)', swordShape(steel, gold, brown)),
    spin: path('M40 8 A20 20 0 1 1 20 30', 'none', 'stroke-width="5" stroke="#9fe6ff"') + path('M40 8 A20 20 0 1 1 20 30', 'none', 'stroke="#e6fbff" stroke-width="2"') +
      g('translate(40 30) rotate(-60) scale(0.7)', swordShape(steel, gold, brown)),
    parry: g('translate(34 28) rotate(-35)', swordShape(steel, gold, brown)) + path('M44 12 H66 V30 Q66 42 55 48 Q44 42 44 30 Z', '#5b8fd9'),
    shield: path('M24 8 H56 V28 Q56 44 40 52 Q24 44 24 28 Z', '#5b8fd9') + path('M40 12 V46 M28 24 H52', 'none', 'stroke="' + gold + '" stroke-width="3"'),
    shieldBash: path('M10 18 H22 M6 28 H20 M10 38 H22', 'none', 'stroke="#9fe6ff"') + path('M30 8 H62 V28 Q62 44 46 52 Q30 44 30 28 Z', '#5b8fd9') + circ(46, 26, 5, gold),
    wall: rect(14, 14, 52, 34, '#8a8f99') + path('M14 25 H66 M14 36 H66 M27 14 V25 M45 14 V25 M36 25 V36 M54 25 V36 M27 36 V48 M45 36 V48', 'none', 'stroke-width="2"') + rect(12, 8, 10, 8, '#8a8f99') + rect(35, 8, 10, 8, '#8a8f99') + rect(58, 8, 10, 8, '#8a8f99'),
    taunt: path('M20 10 H48 V28 Q48 42 34 48 Q20 42 20 28 Z', '#5b8fd9') + rect(56, 8, 8, 24, '#ff5a5a') + rect(56, 38, 8, 8, '#ff5a5a'),
    thorns: circ(40, 28, 13, '#4f8f3a') + [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) {
      return g('translate(40 28) rotate(' + a + ')', path('M-4 -12 L0 -26 L4 -12 Z', '#9be36a'));
    }).join(''),
    quake: path('M4 40 H76 V54 H4 Z', '#8a6230') + path('M40 40 L34 48 L42 52 L38 56', 'none', 'stroke-width="3"') + path('M14 32 l6 -8 6 8 Z', '#c99a52') + path('M54 30 l8 -10 8 10 Z', '#c99a52') + path('M30 22 l4 -6 4 6 Z', '#c99a52'),
    shout: path('M30 18 Q40 10 50 18 L50 38 Q40 46 30 38 Z', '#ffd0b0') + path('M56 16 Q64 28 56 40 M62 10 Q74 28 62 46', 'none', 'stroke="#ffe066" stroke-width="3"') + path('M24 16 Q16 28 24 40', 'none', 'stroke="#ffe066" stroke-width="3"'),
    eye: path('M8 28 Q40 4 72 28 Q40 52 8 28 Z', '#ffffff') + circ(40, 28, 11, '#4fc3ff') + circ(40, 28, 5, K) + circ(36, 24, 2, '#ffffff', 'stroke="none"'),
    wind: path('M8 18 H48 Q58 18 58 10 M8 30 H62 Q72 30 72 22 M8 42 H44 Q54 42 54 50', 'none', 'stroke="#c8f0ff" stroke-width="4"'),
    blood: path('M28 10 Q38 26 38 34 A10 10 0 0 1 18 34 Q18 26 28 10 Z', '#d9334a') + path('M54 18 Q62 30 62 36 A8 8 0 0 1 46 36 Q46 30 54 18 Z', '#d9334a'),
    strength: path('M20 44 L28 22 Q30 14 40 14 L50 14 Q58 16 56 24 L50 28 L44 26 L40 34 L56 34 L60 44 Z', '#ffb08a') + path('M60 10 L66 2 L72 10 M66 2 V22', 'none', 'stroke="#7cf27c" stroke-width="3"'),
    rage: circ(40, 30, 18, '#d9334a') + path('M30 24 L36 27 M50 24 L44 27', 'none', 'stroke-width="3"') + path('M32 38 Q40 32 48 38', 'none', 'stroke-width="3"') + path('M22 10 L28 18 M58 10 L52 18 M40 4 V12', 'none', 'stroke="#ff9a3a" stroke-width="3"'),
    dance: path('M14 42 Q30 10 46 30 Q60 48 70 14', 'none', 'stroke="#9fe6ff" stroke-width="4"') + g('translate(40 28) rotate(60) scale(0.6)', swordShape(steel, gold, brown)),
    dragon: path('M6 44 Q20 8 46 12 L64 6 L58 16 L72 18 L60 24 Q56 40 40 44 Z', '#c24a1f') + circ(54, 16, 2, '#ffe066', 'stroke="none"') + g('translate(36 32) rotate(45) scale(0.8)', swordShape(steel, gold, brown)),
    star: path('M40 4 L46 22 L66 22 L50 33 L56 52 L40 40 L24 52 L30 33 L14 22 L34 22 Z', '#ffe066'),
    dice: path('M22 14 L42 6 L62 14 L42 22 Z', '#ffffff') + path('M22 14 L42 22 V48 L22 40 Z', '#e6e6f0') + path('M42 22 L62 14 V40 L42 48 Z', '#c9c9d6') +
      circ(42, 14, 2, K) + circ(30, 26, 2, K) + circ(34, 36, 2, K) + circ(50, 28, 2, K) + circ(56, 36, 2, K),
    coin: circ(40, 28, 20, '#ffd23f') + circ(40, 28, 14, '#f0b42a') + path('M40 18 L43 25 L50 25 L44 30 L46 38 L40 33 L34 38 L36 30 L30 25 L37 25 Z', '#fff3a8', 'stroke-width="1.5"'),
    clover: circ(32, 20, 9, '#4fbf4f') + circ(48, 20, 9, '#4fbf4f') + circ(32, 34, 9, '#4fbf4f') + circ(48, 34, 9, '#4fbf4f') + path('M40 30 Q44 44 52 52', 'none', 'stroke="#2f7a35" stroke-width="3"'),
    wings: path('M38 30 Q20 6 4 16 Q12 22 8 28 Q16 30 14 36 Q26 36 38 34 Z', '#ffffff') + path('M42 30 Q60 6 76 16 Q68 22 72 28 Q64 30 66 36 Q54 36 42 34 Z', '#ffffff') + circ(40, 32, 5, gold),
    fire: path('M40 6 Q52 20 50 30 Q58 24 56 16 Q66 30 60 42 Q54 52 40 52 Q24 52 20 42 Q16 30 26 22 Q26 32 32 34 Q28 18 40 6 Z', '#ff5a2a') + path('M40 26 Q48 34 46 42 Q44 48 40 48 Q34 48 34 42 Q34 34 40 26 Z', '#ffd23f'),
    flameWave: [10, 30, 50].map(function (x) { return path('M' + x + ' 48 Q' + (x - 2) + ' 30 ' + (x + 8) + ' 14 Q' + (x + 18) + ' 30 ' + (x + 16) + ' 48 Z', '#ff7a2a'); }).join('') + path('M4 48 H76', 'none', 'stroke="#ffd23f" stroke-width="4"'),
    ice: path('M40 4 L52 20 L48 52 L32 52 L28 20 Z', '#9fe6ff') + path('M40 4 L40 52 M28 20 L52 20', 'none', 'stroke="#ffffff" stroke-width="2"') + path('M18 30 L26 24 L28 42 Z', '#cfefff') + path('M62 30 L54 24 L52 42 Z', '#cfefff'),
    frostRing: circ(40, 28, 18, 'none', 'stroke="#9fe6ff" stroke-width="5"') + [0, 60, 120, 180, 240, 300].map(function (a) {
      return g('translate(40 28) rotate(' + a + ') translate(0 -18)', path('M0 -6 V6 M-5 -3 L5 3 M-5 3 L5 -3', 'none', 'stroke="#ffffff" stroke-width="2"'));
    }).join(''),
    orb: glow(40, 28, 24, '#c9a0ff') + circ(40, 28, 15, '#9a6ad6') + circ(35, 23, 5, '#e6d6ff', 'stroke="none"'),
    missile: path('M8 40 Q30 36 52 22', 'none', 'stroke="#c9a0ff" stroke-width="6" opacity="0.6"') + path('M44 18 L66 12 L58 32 Z', '#c9a0ff') + circ(58, 20, 5, '#ffffff'),
    book: path('M8 14 Q24 8 40 16 V50 Q24 42 8 48 Z', '#e9e4d6') + path('M72 14 Q56 8 40 16 V50 Q56 42 72 48 Z', '#f4f1ea') + path('M14 22 H32 M14 30 H32 M48 22 H66 M48 30 H66', 'none', 'stroke="#7c4dbd" stroke-width="2"'),
    bolt: path('M46 4 L22 32 H38 L30 52 L58 20 H42 Z', '#ffe066'),
    explosion: path('M40 4 L46 18 L62 8 L56 24 L74 28 L56 34 L64 50 L46 40 L40 54 L34 40 L16 50 L24 34 L6 28 L24 24 L18 8 L34 18 Z', '#ff7a2a') + circ(40, 28, 9, '#ffe066'),
    meteor: path('M6 4 L34 30 M18 4 L40 24 M4 16 L28 36', 'none', 'stroke="#ff9a3a" stroke-width="4"') + circ(46, 36, 13, '#8a5a3a') + circ(42, 32, 3, '#5a3a28', 'stroke="none"'),
    chaos: path('M40 28 m0 -4 a4 4 0 1 1 -4 4 a8 8 0 1 1 8 -8 a12 12 0 1 1 -12 12 a16 16 0 1 1 16 -16', 'none', 'stroke="#ff6ad9" stroke-width="4"') + circ(58, 14, 3, '#7fe3ff') + circ(20, 44, 3, '#ffe066'),
    heal: rect(33, 8, 14, 40, '#7cf27c') + rect(20, 21, 40, 14, '#7cf27c') + path('M62 8 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 Z', '#ffffff', 'stroke-width="1"'),
    drop: path('M40 6 Q56 28 56 36 A16 16 0 0 1 24 36 Q24 28 40 6 Z', '#7fd3ff') + circ(34, 36, 3, '#ffffff', 'stroke="none"'),
    pray: circ(40, 30, 16, '#fff3a8', 'opacity="0.6" stroke="none"') + path('M40 52 L32 30 Q32 18 40 10 Q48 18 48 30 Z', '#ffd0b0') + path('M40 10 V52', 'none', 'stroke-width="2"') + circ(40, 10, 10, 'none', 'stroke="' + gold + '" stroke-width="3"'),
    lightArrow: path('M8 46 L58 12', 'none', 'stroke="#fff3a8" stroke-width="5"') + path('M50 8 L68 6 L64 22 Z', gold) + path('M8 46 L16 36 M8 46 L18 48', 'none', 'stroke="' + gold + '" stroke-width="3"'),
    leaf: path('M14 46 Q14 10 66 10 Q66 46 14 46 Z', '#7cd65a') + path('M14 46 L56 18', 'none', 'stroke="#2f7a35" stroke-width="2"'),
    sun: [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) {
      return g('translate(40 28) rotate(' + a + ')', path('M-4 -16 L0 -27 L4 -16 Z', '#ffe066'));
    }).join('') + circ(40, 28, 13, '#ffd23f'),
    smoke: circ(28, 34, 12, '#8a8f99') + circ(44, 26, 14, '#a8adb8') + circ(56, 36, 10, '#8a8f99') + circ(38, 40, 9, '#6a6f79'),
    flag: rect(18, 6, 4, 46, brown) + path('M22 8 H64 L56 20 L64 32 H22 Z', '#d94a4a') + path('M34 14 l3 5 5 1 -4 3 1 5 -5 -3 -5 3 1 -5 -4 -3 5 -1 Z', gold, 'stroke-width="1"'),
    scroll: rect(18, 12, 44, 32, '#f4e6c0') + circ(18, 28, 6, '#d9c08a') + circ(62, 28, 6, '#d9c08a') + path('M26 22 H54 M26 30 H54 M26 38 H46', 'none', 'stroke="#7a5233" stroke-width="2"'),
    flask: path('M34 6 H46 V20 L58 46 Q58 52 52 52 H28 Q22 52 22 46 L34 20 Z', '#e6fff0') + path('M27 38 H53 L57 46 Q57 50 52 50 H28 Q23 50 23 46 Z', '#8be04a', 'stroke="none"') + circ(36, 44, 2, '#e6ffcc', 'stroke="none"'),
    clock: path('M24 6 H56 M24 50 H56', 'none', 'stroke="' + gold + '" stroke-width="4"') + path('M28 8 H52 Q52 22 40 28 Q52 34 52 48 H28 Q28 34 40 28 Q28 22 28 8 Z', '#e6fbff') + path('M32 44 H48 L40 34 Z', '#e0c27a', 'stroke="none"'),
    skull: path('M24 26 Q24 8 40 8 Q56 8 56 26 Q56 34 50 36 V44 H30 V36 Q24 34 24 26 Z', '#e9e4d6') + circ(33, 26, 5, K) + circ(47, 26, 5, K) + path('M36 44 V38 M44 44 V38', 'none', 'stroke-width="2"'),
    mask: path('M14 16 Q40 4 66 16 Q66 40 40 50 Q14 40 14 16 Z', '#3b3557') + path('M22 24 Q28 20 34 26 Q28 30 22 24 Z M46 26 Q52 20 58 24 Q52 30 46 26 Z', '#4fbf8a'),
    stone: path('M20 40 Q16 24 30 16 Q46 10 56 20 Q66 32 58 42 Q44 50 20 40 Z', '#9a9aa8') + path('M30 24 Q36 20 42 22', 'none', 'stroke="#d0d0dc" stroke-width="3"'),
    torch: rect(36, 24, 8, 30, brown) + path('M40 2 Q50 12 48 20 Q46 26 40 26 Q34 26 32 20 Q30 12 40 2 Z', '#ff7a2a') + path('M40 10 Q44 16 43 20 Q42 23 40 23 Q38 23 37 20 Q36 16 40 10 Z', '#ffe066', 'stroke="none"'),
    net: path('M12 10 L68 10 L60 50 L20 50 Z', 'none', 'stroke="#d9c08a" stroke-width="3"') + path('M26 10 L28 50 M40 10 V50 M54 10 L52 50 M14 23 H66 M17 36 H63', 'none', 'stroke="#d9c08a" stroke-width="2"'),
    bomb: circ(36, 34, 17, '#3b3557') + circ(30, 28, 4, '#8a8fb0', 'stroke="none"') + path('M46 20 Q54 10 60 12', 'none', 'stroke="' + brown + '" stroke-width="3"') + path('M60 4 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 Z', '#ffe066', 'stroke-width="1"'),
    potion: path('M34 6 H46 V16 Q60 22 60 36 Q60 52 40 52 Q20 52 20 36 Q20 22 34 16 Z', '#ff6a8a') + rect(32, 4, 16, 5, '#c9a441') + circ(32, 34, 4, '#ffd0dc', 'stroke="none"'),
    // 15단계 무림 그림: 직검(술 달린 검), 암기(비도 세 자루), 부적, 단약, 장법(손바닥)
    jian: g('rotate(-40 40 28)', rect(37, 2, 6, 38, steel) + path('M37 2 L40 -4 L43 2 Z', steel) + rect(30, 40, 20, 4, gold) + rect(37, 44, 6, 10, brown) + circ(40, 56, 3, gold)) +
      path('M30 46 Q22 52 24 60 M30 46 Q30 54 34 60', 'none', 'stroke="#d9443f" stroke-width="3"'),
    needles: [[14, 18], [22, 32], [30, 46]].map(function (p) {
      return g('translate(' + p[0] + ' ' + p[1] + ') rotate(-18)', path('M18 0 L30 -5 L44 0 L30 5 Z', steel) + rect(4, -2, 14, 4, '#5a6070') + path('M4 0 L-6 -5 M4 0 L-6 5', 'none', 'stroke="#4fbf8a" stroke-width="3"'));
    }).join(''),
    talisman: rect(26, 4, 28, 48, '#f2d36a') + rect(26, 4, 28, 48, 'none', 'stroke="#c99a20" stroke-width="2"') +
      path('M40 10 V44 M32 16 H48 M33 24 Q40 30 47 24 M32 34 H48 M36 40 L44 46', 'none', 'stroke="#c0302a" stroke-width="3"') + circ(40, 52, 3, '#c0302a'),
    pill: glow(40, 30, 22, '#ffe066') + circ(40, 30, 13, '#f0b030') + circ(35, 25, 4, '#fff6c0', 'stroke="none"') +
      path('M18 50 Q40 40 62 50', 'none', 'stroke="#ffd23f" stroke-width="2" opacity="0.7"'),
    palm: path('M24 52 V28 Q24 22 28 22 Q32 22 32 28 V18 Q32 12 36 12 Q40 12 40 18 V14 Q40 8 44 8 Q48 8 48 14 V20 Q48 14 52 14 Q56 14 56 20 V40 Q56 52 44 54 H32 Q24 54 24 52 Z', '#f4c49c') +
      [12, 20, 28].map(function (r) { return circ(40, 32, r + 10, 'none', 'stroke="#9fe6ff" stroke-width="2" opacity="' + (0.7 - r / 50) + '"'); }).join(''),
    chest: rect(14, 24, 52, 26, '#a8683a') + path('M14 24 Q14 8 40 8 Q66 8 66 24 Z', '#c27a45') + rect(14, 22, 52, 5, gold) + rect(36, 26, 8, 10, gold),
    // 전설 카드 전용
    musou: [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) {
      return g('translate(40 28) rotate(' + a + ') translate(0 -14) scale(0.45)', swordShape(steel, gold, brown));
    }).join('') + circ(40, 28, 6, '#ffe066'),
    fortress: rect(14, 22, 52, 30, '#9aa7b8') + rect(10, 10, 14, 42, '#b8c4d6') + rect(56, 10, 14, 42, '#b8c4d6') +
      path('M10 10 V6 H14 V10 M20 10 V6 H24 V10 M56 10 V6 H60 V10 M66 10 V6 H70 V10', 'none', 'stroke-width="2"') + path('M34 52 V38 Q40 30 46 38 V52 Z', '#3b3557') + rect(37, 14, 6, 6, '#ffe066'),
    miracle: glow(40, 28, 26, '#fff3a8') + path('M40 2 L45 22 L66 28 L45 34 L40 54 L35 34 L14 28 L35 22 Z', '#ffffff') + circ(40, 28, 6, '#ffe066'),
    goddess: circ(40, 12, 9, 'none', 'stroke="' + gold + '" stroke-width="3"') + path('M36 30 Q12 8 2 20 Q12 26 6 34 Q20 36 36 36 Z', '#ffffff') +
      path('M44 30 Q68 8 78 20 Q68 26 74 34 Q60 36 44 36 Z', '#ffffff') + path('M34 54 L36 24 Q40 18 44 24 L46 54 Z', '#fff3a8') + circ(40, 20, 5, '#ffd0b0'),
    fate: path('M6 10 Q40 50 74 10', 'none', 'stroke="#ff6ad9" stroke-width="3"') + path('M6 46 Q40 6 74 46', 'none', 'stroke="#7fe3ff" stroke-width="3"') +
      rect(30, 18, 20, 22, '#3b3557') + path('M34 24 H46 M34 30 H46', 'none', 'stroke="#4fbf8a" stroke-width="2"'),
    pandora: glow(40, 18, 22, '#ff9ad9') + path('M12 30 L40 22 L68 30 L40 38 Z', '#7a4aa8') + path('M12 30 V48 L40 56 V38 Z', '#5a2f86') + path('M68 30 V48 L40 56 V38 Z', '#4a2470') +
      path('M14 26 L36 6 L64 14 L44 20 Z', '#9a6ad6') + circ(30, 14, 2, '#ffe066') + circ(52, 8, 2, '#7fe3ff') + circ(42, 4, 2, '#ff6ad9'),
    armory: g('translate(28 30) rotate(-25) scale(0.8)', swordShape(steel, gold, brown)) + g('translate(52 30) rotate(25) scale(0.8)', swordShape(steel, gold, brown)) +
      g('translate(40 30) scale(0.75)', rect(-2, -16, 4, 36, brown) + path('M2 -16 Q18 -14 18 -2 Q10 -6 2 -4 Z', steel) + path('M-2 -16 Q-18 -14 -18 -2 Q-10 -6 -2 -4 Z', steel)),
    sand: path('M2 44 Q20 30 40 40 Q60 50 78 36 V56 H2 Z', '#e0c27a') + path('M10 52 Q30 42 50 50 Q66 56 78 48', 'none', 'stroke="#b08f45" stroke-width="2"') + circ(24, 20, 2, '#e0c27a') + circ(44, 14, 2, '#e0c27a') + circ(58, 24, 2, '#e0c27a')
  };

  // ---------------- 전투 배경 (400×150) ----------------
  function trees(n, y, h, color, seed) {
    var s = '', x = -10, r = seed;
    for (var i = 0; i < n; i++) {
      r = (r * 9301 + 49297) % 233280;
      var w = 24 + (r % 20), hh = h * (0.7 + (r % 30) / 100);
      s += '<path d="M' + x + ' ' + y + ' L' + (x + w / 2) + ' ' + (y - hh) + ' L' + (x + w) + ' ' + y + ' Z" fill="' + color + '"/>';
      x += w * 0.7;
    }
    return s;
  }
  function hills(y, amp, color, seed) {
    var d = 'M0 150 L0 ' + y, r = seed;
    for (var x = 0; x <= 400; x += 25) { r = (r * 9301 + 49297) % 233280; d += ' L' + x + ' ' + (y - (r % amp)); }
    return '<path d="' + d + ' L400 150 Z" fill="' + color + '"/>';
  }
  function sky(top, bottom) {
    return '<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + top + '"/><stop offset="1" stop-color="' + bottom + '"/></linearGradient></defs>' +
      '<rect width="400" height="150" fill="url(#sk)"/>';
  }
  var SCENE = {
    // 만독곡(15단계): 양쪽 절벽 사이의 독 늪, 보랏빛·초록 독안개
    forest: function () {
      return sky('#14202a', '#2f5a46') + '<circle cx="300" cy="28" r="12" fill="#d8f0c0" opacity="0.7"/>' +
        '<path d="M0 0 H70 L84 40 L60 80 L78 120 H0 Z" fill="#1a2a24"/><path d="M400 0 H330 L316 50 L338 90 L320 120 H400 Z" fill="#1a2a24"/>' +
        '<path d="M70 0 L84 40 L60 80 L78 120 H64 L48 80 L70 40 Z" fill="#26392f"/><path d="M330 0 L316 50 L338 90 L320 120 H334 L352 90 L330 50 Z" fill="#26392f"/>' +
        trees(14, 112, 46, '#1a3a2c', 3) +
        '<rect y="70" width="400" height="10" fill="#9a5ad0" opacity="0.12"/><rect y="88" width="400" height="12" fill="#8ad04a" opacity="0.12"/>' +
        '<rect y="118" width="400" height="32" fill="#25351f"/><path d="M0 128 Q60 122 120 128 T240 127 T400 126 V138 H0 Z" fill="#5a8a2a" opacity="0.8"/>' +
        '<circle cx="90" cy="130" r="3" fill="#b8ff6a"/><circle cx="210" cy="132" r="2" fill="#b8ff6a"/><circle cx="330" cy="129" r="2.5" fill="#b8ff6a"/>';
    },
    desert: function () {
      return sky('#f29a4a', '#ffd88a') + '<circle cx="80" cy="40" r="20" fill="#fff3c0"/>' +
        '<path d="M250 110 L300 50 L350 110 Z" fill="#c9893a"/><path d="M300 50 L350 110 L320 110 Z" fill="#a8702e"/>' +
        hills(112, 14, '#e6b060', 11) + '<rect y="120" width="400" height="30" fill="#d9a050"/><rect y="120" width="400" height="3" fill="#f0c070"/>';
    },
    snow: function () {
      return sky('#2a4f7a', '#a9d0ec') + '<path d="M0 110 L70 40 L130 100 L200 30 L280 105 L340 50 L400 100 V150 H0 Z" fill="#dbe9f5"/>' +
        '<path d="M70 40 L85 55 L60 58 Z M200 30 L218 50 L186 52 Z M340 50 L352 62 L330 63 Z" fill="#ffffff"/>' +
        trees(20, 122, 40, '#2f5a6a', 5) + '<rect y="120" width="400" height="30" fill="#eef5fb"/><rect y="120" width="400" height="3" fill="#ffffff"/>';
    },
    volcano: function () {
      return sky('#2a0d0d', '#a3301f') + '<path d="M120 112 L190 30 L230 30 L300 112 Z" fill="#3a1f1f"/>' +
        '<path d="M190 30 L230 30 L222 22 L198 22 Z" fill="#ff7a2a"/><path d="M205 30 L200 70 L212 70 L215 30 Z" fill="#ff5a2a" opacity="0.8"/>' +
        hills(115, 18, '#2a1414', 9) + '<rect y="120" width="400" height="30" fill="#3a1a14"/><path d="M0 132 Q100 126 200 134 T400 130 V136 H0 Z" fill="#ff6a2a" opacity="0.7"/>';
    },
    // 청운문(15단계): 붉은 달 아래 구름 낀 봉우리, 기와지붕 전각, 핏빛 안개
    castle: function () {
      return sky('#1a0f22', '#5a2a3a') + '<circle cx="78" cy="32" r="15" fill="#ff8a7a"/><circle cx="78" cy="32" r="15" fill="#ffd0c0" opacity="0.35"/>' +
        '<path d="M0 120 L40 50 L70 80 L110 30 L150 90 L190 60 L230 100 V120 Z" fill="#2a2038"/>' +
        '<path d="M170 120 L240 40 L280 70 L330 20 L400 90 V120 Z" fill="#231a30"/>' +
        '<rect y="58" width="400" height="8" fill="#e8d8f0" opacity="0.12"/><rect y="84" width="400" height="10" fill="#e8d8f0" opacity="0.1"/>' +
        // 전각: 기단, 기둥, 두 겹 처마
        '<rect x="248" y="96" width="96" height="6" fill="#3a2a30"/><rect x="258" y="78" width="76" height="18" fill="#4a1a22"/>' +
        '<rect x="264" y="80" width="4" height="16" fill="#8a2a2a"/><rect x="292" y="80" width="4" height="16" fill="#8a2a2a"/><rect x="320" y="80" width="4" height="16" fill="#8a2a2a"/>' +
        '<path d="M240 80 Q250 74 262 72 H330 Q342 74 352 80 L344 82 H248 Z" fill="#1a1a2a"/>' +
        '<rect x="270" y="62" width="52" height="10" fill="#4a1a22"/><path d="M256 64 Q266 58 276 56 H316 Q326 58 336 64 L330 66 H262 Z" fill="#1a1a2a"/>' +
        '<rect x="292" y="66" width="8" height="5" fill="#ffd23f"/>' +
        '<rect y="112" width="400" height="12" fill="#c03040" opacity="0.18"/>' +
        '<rect y="120" width="400" height="30" fill="#2a2030"/><rect y="120" width="400" height="3" fill="#5a3a4a"/>' +
        '<path d="M0 134 H400 M0 142 H400" stroke="#3a2a3a" stroke-width="2"/>';
    }
  };

  Game.Art = {
    GLYPH: GLYPH,
    glyph: function (key) { return GLYPH[key] || GLYPH.star; },
    sceneSvg: function (theme) {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 150" width="400" height="150">' + (SCENE[theme] || SCENE.forest)() + '</svg>';
    },
    // 전투 배경을 도트로 변환해 url 을 넘긴다
    scene: function (theme) { return Game.Pixel.raster('scene:' + theme, Game.Art.sceneSvg(theme), 200, 75, 12); }
  };
})();
