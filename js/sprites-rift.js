// sprites-rift.js — 31단계 세계의 틈 몬스터 10종의 도형 도트 그림(js/pixel-render.js). 몬스터는 왼쪽(영웅 쪽)을 본다
// 새로 그린 넷: 혈마의 씨앗 · 틈의 파수꾼 · 두 세계의 거상 · 고대 혈마
// 옛 그림의 색만 바꾼 여섯(틈에 비친 메아리·잔영): 틈새 혼불(도깨비불) · 공허 사냥개(설원 늑대) · 세계 파편 골렘(흑요석 파수꾼) ·
//   메아리 검객(사부 청운자) · 메아리 마법사(얼음 마녀) · 단목천의 잔영(혈마 단목천)
// pixel-sculpt.js 뒤에 읽는다(바탕 그림이 먼저 있어야 한다)
(function () {
  'use strict';
  var S = Game.Shape, E = S.E, C = S.C, B = S.B, P = S.P, mat = S.mat;
  var TAU = S.TAU, wave = S.wave;
  var RIM = '#5ef0d0';
  function M(id, h, fn) { S.def(id, { h: h, group: 'rift', rim: RIM, fn: fn }); }
  function concat() { return [].concat.apply([], arguments); }
  function emitRamp(dark, mid, light) { return [S.darken(dark, 0.4), dark, mid, S.mix(mid, light, 0.5), light, '#ffffff']; }
  function eye(x, y, rx, ry, m, rot) { return E(x, y, rx, ry, m, { rot: rot || 0, keep: true, line: false }); }

  // ---------------- 색 바꾸기(밝기만 남기고 틈의 색으로) ----------------
  function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function rgbHex(r, g, b) { return '#' + [r, g, b].map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function lum(hex) { var a = hexRgb(hex); return (a[0] * 0.3 + a[1] * 0.5 + a[2] * 0.2) / 255; }
  function remap(body, glow) {
    return function (hex, mname) {
      var m = S.MAT[mname], l = lum(hex);
      if (mname === 'eye' || mname === 'glow' || (m && m.emit)) return rgbHex(glow[0] + l * glow[3], glow[1] + l * glow[4], glow[2] + l * glow[5]);
      return rgbHex(body[0] + l * body[3], body[1] + l * body[4], body[2] + l * body[5]);
    };
  }
  var ECHO = remap([18, 52, 62, 100, 190, 170], [120, 230, 220, 135, 25, 35]);    // 메아리: 청록빛 잔상
  var VOID = remap([16, 10, 36, 70, 60, 150], [60, 200, 180, 160, 55, 70]);       // 공허: 짙은 남보라, 청록 눈
  var SHARD = remap([52, 50, 74, 150, 140, 165], [90, 220, 200, 150, 35, 50]);    // 파편: 회청색 돌, 청록 결
  var WISP = remap([60, 24, 110, 150, 100, 140], [200, 120, 255, 55, 120, 0]);     // 혼불: 보랏빛

  // ---------------- 새 재질 ----------------
  mat('m3eyeT', '', { emit: true, ramp: emitRamp('#0a4a4a', '#5ef0d0', '#e0fff8') });
  mat('m3eyeR', '', { emit: true, ramp: emitRamp('#6a0a1a', '#ff3a4a', '#ffd0c0') });
  mat('m3flesh', '#6a1424', { spec: 0.5, shin: 10, dark: 0.18, shift: 14 });
  mat('m3fleshL', '#a8303e', { spec: 0.6, shin: 12, dark: 0.2, shift: 14 });
  mat('m3root', '#3a1a24', { dark: 0.16, shift: 16 });
  mat('m3vein', '', { emit: true, ramp: emitRamp('#7a0a1a', '#ff4a5a', '#ffc8c0') });
  mat('m3stone', '#5a5470', { spec: 0.4, shin: 10, dark: 0.18, shift: 18 });
  mat('m3stoneD', '#3a344a', { dark: 0.16, shift: 18 });
  mat('m3stoneL', '#8a84a0', { spec: 0.5, shin: 12, dark: 0.2 });
  mat('m3rune', '', { emit: true, ramp: emitRamp('#0a4a4a', '#3fe0c8', '#e0fff8') });
  mat('m3void', '', { emit: true, ramp: emitRamp('#2a0a5a', '#9a4aff', '#f0d8ff') });
  mat('m3roof', '#242838', { spec: 0.4, shin: 10, dark: 0.16 });
  mat('m3roofR', '#7a2028', { dark: 0.2 });
  mat('m3silver', '#c8d4ea', { spec: 0.9, shin: 20, dark: 0.3 });
  mat('m3blue', '#2e4a8a', { spec: 0.5, shin: 12, dark: 0.18 });
  mat('m3gold', '#e2a83a', { spec: 0.8, shin: 16, dark: 0.26 });
  mat('m3blade', '#dfe6f4', { spec: 0.9, shin: 22, dark: 0.3 });
  mat('m3demon', '#5a0e1a', { spec: 0.5, shin: 12, dark: 0.16, shift: 16 });
  mat('m3demonL', '#8e1e2c', { spec: 0.6, shin: 14, dark: 0.2, shift: 16 });
  mat('m3horn', '#2a1a1e', { spec: 0.7, shin: 16, dark: 0.2 });
  mat('m3wing', '#3a0a16', { dark: 0.14, shift: 18 });
  mat('m3bone', '#e6dcc8', { solid: true });

  // ================= 혈마의 씨앗: 핏줄이 도는 구근, 땅에 박힌 뿌리, 꽃잎 같은 껍질, 외눈 =================
  M('blood_seed', 60, function (t, pose) {
    var atk = pose === 'attack', p = 1 + Math.sin(t * TAU) * 0.05, w = wave(t), open = atk ? 4 : 0;
    var roots = [];
    [[-10, 8], [-4, 10], [4, 10], [11, 7], [-14, 4]].forEach(function (r, i) {
      var x0 = 28 + r[0] * 0.5, y0 = 44;
      roots.push(C(x0, y0, x0 + r[0], 54 + (i % 2), 2.2, 0.7, 'm3root', { g: 'r' + i }));
    });
    var petals = [];
    [-0.9, -0.3, 0.3, 0.9].forEach(function (a, i) {
      var tx = 28 + Math.sin(a) * (16 + open), ty = 18 - Math.cos(a) * (12 + open) + w * 0.6;
      petals.push(P([[28 + Math.sin(a) * 6, 24], [tx - 4, ty + 3], [tx, ty - 3], [tx + 4, ty + 3]], i % 2 ? 'm3flesh' : 'm3fleshL', { g: 'pt' + i, bev: 1 }));
    });
    return { w: 56, h: 58, cx: 28, tipAttack: [10, 30], glow: [{ x: 28, y: 32, r: 16, c: '#ff3a5a', k: 0.35 }], parts: concat(roots, petals, [
      E(28, 33, 15 * p, 14 * p, 'm3flesh', { g: 'bulb' }),
      E(31, 29, 9 * p, 7 * p, 'm3fleshL', { line: false, ao: false }),
      C(18, 26, 24, 42, 0.7, 0.5, 'm3vein', { line: false, emitLv: 2 }), C(36, 24, 34, 43, 0.7, 0.5, 'm3vein', { line: false, emitLv: 2 }),
      C(28, 20, 30, 44, 0.6, 0.5, 'm3vein', { line: false, emitLv: 2 }),
      E(22, 32, 4.4, atk ? 4 : 3.2, 'm3bone', { line: false }), eye(21.5, 32, 2.4, atk ? 2.6 : 2, 'm3eyeR'),
      atk ? E(20, 40, 5, 2.2, 'm2mouth', { line: false }) : C(17, 40, 24, 41, 0.6, 0.6, 'm2mouth', { line: false })
    ]) };
  });

  // ================= 틈의 파수꾼: 허공에 뜬 돌 관문 몸통, 청록 룬과 붉게 물든 금, 따로 떠 있는 두 주먹 =================
  M('rift_warden', 104, function (t, pose) {
    var atk = pose === 'attack', b = wave(t) * 2, y = function (v) { return v - b; }, ph = Math.sin(t * TAU * 2) * 1.5;
    var fistF = atk ? [10, y(56)] : [22, y(66) + ph], fistB = [86, y(60) - ph];
    var shards = [];
    for (var i = 0; i < 6; i++) {
      var a = t * TAU + i * TAU / 6, R = 44;
      shards.push(P([[52 + Math.cos(a) * R, y(48) + Math.sin(a) * R * 0.35], [56 + Math.cos(a) * R, y(44) + Math.sin(a) * R * 0.35], [54 + Math.cos(a) * R, y(52) + Math.sin(a) * R * 0.35]], 'm3stoneL', { g: 'sh' + i, bev: 0.6 }));
    }
    return { w: 104, h: 100, cx: 52, tipAttack: [8, 56], glow: [{ x: 52, y: y(46), r: 30, c: '#3fe0c8', k: 0.35 }], parts: concat(shards.slice(0, 3), [
      // 등 뒤의 관문 테
      P([[30, y(14)], [74, y(14)], [80, y(84)], [24, y(84)]], 'm3stoneD', { g: 'gate', bev: 1.5 }),
      P([[38, y(22)], [66, y(22)], [70, y(78)], [34, y(78)]], 'm3void', { line: false, ao: false, emitLv: 2 }),
      // 몸통: 겹친 돌판
      B(52, y(50), 17, 20, 3, 'm3stone', { g: 'torso' }),
      B(52, y(38), 20, 6, 2, 'm3stoneL', { g: 'chest' }),
      C(40, y(50), 64, y(50), 1, 1, 'm3rune', { line: false, emitLv: 3 }), C(52, y(40), 52, y(66), 1, 1, 'm3rune', { line: false, emitLv: 3 }),
      C(44, y(56), 58, y(70), 0.7, 0.5, 'm3vein', { line: false, emitLv: 2 }),
      // 머리: 돌 투구와 가로 눈 틈
      B(50, y(18), 11, 9, 3, 'm3stone', { g: 'head' }), P([[38, y(12)], [50, y(4)], [62, y(12)]], 'm3stoneL', { g: 'crest', bev: 1 }),
      B(46, y(19), 7, 1.6, 1, 'm3eyeT', { line: false, keep: true }),
      // 주먹
      E(fistB[0], fistB[1], 9, 8, 'm3stoneD', { g: 'fistB' }), C(fistB[0] - 4, fistB[1], fistB[0] + 4, fistB[1], 0.6, 0.6, 'm3rune', { line: false, emitLv: 2 }),
      E(fistF[0], fistF[1], 10, 9, 'm3stone', { g: 'fistF' }), C(fistF[0] - 5, fistF[1] - 2, fistF[0] + 5, fistF[1] - 2, 0.7, 0.7, 'm3rune', { line: false, emitLv: 3 })
    ], shards.slice(3)) };
  });

  // ================= 두 세계의 거상: 기와지붕 어깨와 엘단 성벽 가슴, 앞손에 청운문 대검, 뒷손에 은빛 연 방패 =================
  M('echo_colossus', 126, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1.4), y = function (v) { return v + b; };
    var hand = atk ? [14, y(50)] : [26, y(64)], tip = atk ? [-2, y(14)] : [8, y(104)];
    return { w: 120, h: 122, cx: 60, tipAttack: [2, 30], glow: [{ x: 60, y: y(52), r: 28, c: '#5ef0d0', k: 0.25 }], parts: [
      // 다리: 무너진 돌기둥
      C(48, y(84), 42, 116, 9, 8, 'm3stoneD', { g: 'legF' }), B(41, 117, 11, 4, 2, 'm3stone', { g: 'legF' }),
      C(72, y(84), 80, 116, 9, 8, 'm3stoneD', { g: 'legB' }), B(82, 117, 11, 4, 2, 'm3stone', { g: 'legB' }),
      // 뒷팔과 은빛 방패
      C(82, y(40), 96, y(62), 7, 6, 'm3stoneD', { g: 'armB' }),
      P([[90, y(44)], [112, y(44)], [114, y(70)], [101, y(92)], [88, y(70)]], 'm3silver', { g: 'shield', bev: 2 }),
      C(101, y(48), 101, y(86), 1.6, 1.6, 'm3gold', { line: false }), C(92, y(60), 110, y(60), 1.6, 1.6, 'm3gold', { line: false }),
      // 몸통: 엘단 성벽(푸른 돌) + 성가퀴
      B(60, y(64), 24, 22, 3, 'm3blue', { g: 'torso' }),
      B(46, y(44), 4, 3, 1, 'm3stoneL', { g: 'mer' }), B(60, y(44), 4, 3, 1, 'm3stoneL', { g: 'mer' }), B(74, y(44), 4, 3, 1, 'm3stoneL', { g: 'mer' }),
      C(40, y(66), 80, y(66), 1, 1, 'm3stoneD', { line: false }), C(40, y(76), 80, y(76), 1, 1, 'm3stoneD', { line: false }),
      E(60, y(62), 6, 6, 'm3rune', { line: false, emitLv: 2 }),
      // 어깨: 청운문 기와지붕
      P([[24, y(46)], [42, y(34)], [56, y(38)], [52, y(48)], [30, y(52)]], 'm3roof', { g: 'roofF', bev: 1.5 }),
      C(26, y(50), 50, y(46), 1.2, 1.2, 'm3roofR', { line: false }),
      // 머리: 투구 모양 돌덩이, 청록 눈 둘
      B(56, y(24), 12, 11, 4, 'm3stone', { g: 'head' }), P([[44, y(16)], [56, y(4)], [68, y(16)]], 'm3roof', { g: 'hat', bev: 1 }),
      eye(50, y(25), 2.2, 1.4, 'm3eyeT'), eye(58, y(25), 2, 1.3, 'm3eyeT'),
      // 앞팔과 청운문 대검
      C(40, y(44), hand[0] + 4, hand[1], 8, 7, 'm3stone', { g: 'armF' }), E(hand[0], hand[1], 7, 6.5, 'm3stoneL', { g: 'armF' }),
      C(hand[0], hand[1], tip[0], tip[1], 3.4, 1.2, 'm3blade', { g: 'blade' }),
      C(hand[0] - 7, hand[1] + (atk ? 4 : -2), hand[0] + 7, hand[1] + (atk ? -4 : 2), 1.6, 1.6, 'm3gold', { line: false }),
      C(hand[0] + 2, hand[1] + 2, hand[0] + 10, hand[1] + 12, 0.8, 0.5, 'm3roofR', { line: false })
    ] };
  });

  // ================= 고대 혈마: 뿔 달린 거대한 마물, 가슴에 열린 틈(보랏빛 소용돌이), 피의 날개, 앞으로 뻗은 갈퀴 손 =================
  M('blood_demon', 150, function (t, pose) {
    var atk = pose === 'attack', b = wave(t) * 2, y = function (v) { return v - b; }, fl = Math.sin(t * TAU) * 3;
    var claw = atk ? [10, y(66)] : [30, y(84)];
    var tend = [];
    for (var i = 0; i < 4; i++) {
      var ph = t * TAU + i * 1.6, x0 = 52 + i * 10, y0 = y(110);
      tend.push(C(x0, y0, x0 - 8 + Math.sin(ph) * 6, 146, 4, 1.2, i % 2 ? 'm3demon' : 'm3demonL', { g: 'td' + i }));
    }
    var orbs = [];
    for (var k = 0; k < 5; k++) { var a = t * TAU * 1.5 + k * TAU / 5; orbs.push(E(70 + Math.cos(a) * 12, y(70) + Math.sin(a) * 9, 1.6, 1.6, 'm3void', { line: false, emitLv: 3 })); }
    return { w: 140, h: 148, cx: 70, tipAttack: [4, 66], glow: [{ x: 70, y: y(70), r: 40, c: '#ff3a5a', k: 0.3 }, { x: 70, y: y(70), r: 18, c: '#9a4aff', k: 0.45 }], parts: concat([
      // 날개
      P([[80, y(46)], [128, y(10) - fl], [136, y(40)], [124, y(54) + fl], [132, y(74)], [96, y(76)]], 'm3wing', { g: 'wingB', bev: 1.5 }),
      C(84, y(48), 126, y(14) - fl, 1.4, 0.8, 'm3demonL', { line: false }), C(88, y(56), 130, y(70), 1.2, 0.7, 'm3demonL', { line: false }),
      P([[60, y(46)], [20, y(6) + fl], [10, y(34)], [22, y(50) - fl], [14, y(70)], [46, y(72)]], 'm3wing', { g: 'wingF', bev: 1.5 })
    ], tend, [
      // 몸통
      B(70, y(84), 26, 30, 6, 'm3demon', { g: 'torso' }),
      E(70, y(70), 15, 13, 'm3void', { line: false, emitLv: 2 }), E(70, y(70), 8, 7, 'm3eyeT', { line: false }),
      C(50, y(96), 90, y(96), 1, 1, 'm3vein', { line: false, emitLv: 2 }), C(54, y(56), 60, y(108), 0.8, 0.6, 'm3vein', { line: false, emitLv: 2 }),
      C(86, y(56), 82, y(108), 0.8, 0.6, 'm3vein', { line: false, emitLv: 2 }),
      // 뒷팔
      C(94, y(60), 108, y(92), 7, 5, 'm3demonL', { g: 'armB' }), E(110, y(95), 6, 5, 'm3demon', { g: 'armB' }),
      // 머리와 뿔
      E(64, y(36), 15, 14, 'm3demonL', { g: 'head' }),
      C(54, y(26), 36, y(6), 4, 1, 'm3horn', { g: 'hornF' }), C(74, y(24), 92, y(2), 4, 1, 'm3horn', { g: 'hornB' }),
      eye(56, y(36), 2.8, 1.6, 'm3eyeR', -0.2), eye(66, y(35), 2.6, 1.5, 'm3eyeR', -0.2),
      P([[52, y(44)], [68, y(43)], [64, y(atk ? 52 : 48)], [56, y(atk ? 52 : 48)]], 'm2mouth', { line: false }),
      C(53, y(44), 55, y(48), 0.7, 0.5, 'm3bone', { line: false }), C(63, y(44), 61, y(48), 0.7, 0.5, 'm3bone', { line: false }),
      // 앞팔과 갈퀴
      C(50, y(58), claw[0] + 6, claw[1], 8, 6, 'm3demonL', { g: 'armF' }), E(claw[0], claw[1], 7, 6, 'm3demon', { g: 'armF' }),
      C(claw[0] - 4, claw[1] - 3, claw[0] - 14, claw[1] - 6, 1.6, 0.4, 'm3bone', { g: 'cl1' }), C(claw[0] - 5, claw[1] + 1, claw[0] - 16, claw[1] + 2, 1.6, 0.4, 'm3bone', { g: 'cl2' }),
      C(claw[0] - 3, claw[1] + 5, claw[0] - 12, claw[1] + 10, 1.6, 0.4, 'm3bone', { g: 'cl3' })
    ], orbs) };
  });

  // ================= 색을 바꾼 메아리 · 잔영 =================
  // h: 그림 높이(일반 몬스터 크기로 줄인다), rim: 테두리 빛
  [['rift_wisp', 'wisp', 58, WISP], ['void_hound', 'frost_wolf', 64, VOID], ['shard_golem', 'obsidian', 82, SHARD],
   ['echo_swordsman', 'baltar', 80, ECHO], ['echo_mage', 'ice_witch', 76, ECHO], ['danmok_shade', 'astaroth', 132, S.shadowRemap]].forEach(function (v) {
    if (S.has(v[1])) S.variant(v[0], v[1], { h: v[2], remap: v[3], group: 'rift', rim: RIM });
  });
})();
