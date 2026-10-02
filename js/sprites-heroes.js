// sprites-heroes.js — 영웅 5명의 도형 도트 그림(56px, 오른쪽을 본다) + 그림자 변형 5종. 15단계: 하린·소연은 무림 복장
// 단위 좌표: 상자 56×64, 발끝 y=63, 몸 중심 x=24. pose === 'attack' 이면 공격 자세
(function () {
  'use strict';
  var S = Game.Shape, E = S.E, C = S.C, B = S.B, P = S.P, L = S.L, mat = S.mat;
  var TAU = S.TAU;

  mat('skin', '#f4c49c', { light: 0.14, dark: 0.2, shift: 12 });
  mat('eye', '#24173b', { solid: true });
  mat('white', '#ffffff', { solid: true });
  mat('blush', '#ee8f8a', { solid: true });
  mat('brow', '#7d7568', { solid: true });
  mat('hairR', '#d6493a', { dark: 0.22 });
  mat('steel', '#93acd6', { spec: 0.55, shin: 10 });
  mat('steelD', '#6a7fa8', { spec: 0.3 });
  mat('gold', '#e9b94a', { spec: 0.7, shin: 14, light: 0.18 });
  mat('goldD', '#c58f2c', { spec: 0.3 });
  mat('scarf', '#d9443f');
  mat('leather', '#7a4a2a');
  mat('pants', '#3a3658', { dark: 0.18 });
  mat('boot', '#5a3a28', { dark: 0.2 });
  mat('blade', '#d4deee', { spec: 0.9, shin: 18, dark: 0.3 });
  mat('hairS', '#d9d3c4', { dark: 0.28 });
  mat('plate', '#4f86d6', { spec: 0.55, shin: 10 });
  mat('plateD', '#34599d', { spec: 0.3 });
  mat('hairF', '#f08a4b');
  mat('robe', '#8a55c9');
  mat('robeD', '#5e3a96', { dark: 0.2 });
  mat('hat', '#55308f', { dark: 0.2 });
  mat('wood', '#835434');
  mat('fire', '', { emit: true, ramp: S.FIRE });
  mat('holy', '', { emit: true, ramp: ['#7a5a1a', '#c9902a', '#f0c75e', '#ffe58a', '#fff6cf', '#ffffff'] });
  mat('robeW', '#e6e9f2', { dark: 0.3, shift: 22 });
  mat('hairB', '#f2cd6a');
  mat('shoe', '#a8824e');
  mat('gemB', '', { emit: true, ramp: ['#103a6a', '#1f6ab3', '#3fa8ff', '#7fd0ff', '#c8ecff', '#ffffff'] });
  mat('cloak', '#2f7a5c', { dark: 0.2 });
  mat('cloakD', '#235a46', { dark: 0.18 });
  mat('cloth', '#2c3044', { dark: 0.16 });
  mat('mask', '#1f2733', { dark: 0.14 });
  mat('scarfG', '#4fbf8a');
  mat('glintG', '', { emit: true, ramp: ['#0c3a2a', '#1f7a55', '#4fd99a', '#8fffc8', '#d0ffe8', '#ffffff'] });
  // 15단계 무림 복장
  mat('hairK', '#2e2840', { dark: 0.2, light: 0.12, shift: 18 });
  mat('muW', '#e9edf5', { dark: 0.3, shift: 20 });
  mat('muB', '#3f6fc4', { dark: 0.2 });
  mat('shoeK', '#33303f', { dark: 0.16 });
  mat('jade', '#5fd9a0', { spec: 0.6, shin: 12 });
  mat('veil', '#cfe9dc', { dark: 0.25, light: 0.1 });
  mat('muG', '#2e6a52', { dark: 0.2 });
  mat('muGD', '#1e4a3a', { dark: 0.16 });
  mat('sashP', '#8a4ac9', { dark: 0.2 });

  function face(x, y, o) {
    o = o || {};
    return [
      E(x, y, 0.9, o.eh || 1.7, 'eye', { keep: true, line: false }),
      E(x + 0.3, y - 0.8, 0.45, 0.5, 'white', { keep: true, line: false, minS: 1.1 }),
      E(x + 1.2, y + 3.4, 1.2, 0.6, 'blush', { line: false, minS: 1.1, ao: false })
    ];
  }
  var RIM = '#a8d8ff';

  // 하린(kai) — 검은 머리를 높이 묶은 붉은 댕기, 청운문의 흰 무복과 푸른 깃, 붉은 허리띠, 술 달린 직검. 공격: 앞으로 크게 찌른다
  S.def('kai', { h: 56, rim: RIM, fn: function (t, pose) {
    var atk = pose === 'attack', b = atk ? 0.6 : S.bob(t), w = S.wave(t), lx = atk ? 1.6 : 0;
    var y = function (v) { return v + b; }, x = function (v) { return v + lx; };
    var hand = atk ? [37.2, 36.4] : [33.5, 41.4];
    var blade = atk ? [38.9, 35.8, 54, 31] : [35.2, 38.7, 45.6, 21.6];
    var guard = atk ? [38.2, 33.6, 39.6, 38] : [32.6, 37.8, 37, 40.6];
    var pommel = atk ? [35.2, 37.2] : [32.3, 43.4];
    var tas = atk ? [[35.2, 37.2], [31, 41.5], [29.5, 46]] : [[32.3, 43.4], [31.2, 48.5 + w * 0.8], [29.6, 52 + w]];
    return { w: 56, h: 64, cx: 24, tip: [45.6, 21.6], tipAttack: [55.6, 31], parts: [
      // 높이 묶은 긴 머리(뒤로 날린다)
      E(x(14), y(17), 3.8, 9.4, 'hairK', { rot: 0.95 + w * 0.08 + (atk ? 0.3 : 0), g: 'hair' }),
      E(x(9.5), y(26), 2.8, 7, 'hairK', { rot: 0.55 + w * 0.14 + (atk ? 0.4 : 0), g: 'hair' }),
      E(x(7.6), y(33) + w, 1.8, 4.2, 'hairK', { rot: 0.35 + w * 0.2 + (atk ? 0.5 : 0), g: 'hair' }),
      // 뒤 소매와 손
      C(x(19), y(31), x(15) - (atk ? 2 : 0), y(40), 3.3, 3.7, 'muW', { g: 'armB' }),
      E(x(15) - (atk ? 2 : 0), y(41.8), 2.2, 2.2, 'skin', { g: 'armB' }),
      // 다리와 신
      C(21, 47, atk ? 18.5 : 20, 58, 3.4, 3, 'pants', { g: 'legB' }),
      B(atk ? 19 : 20.4, 59.8, 4.1, 2.9, 3, 'shoeK', { g: 'legB' }),
      C(27.5, 47, atk ? 31 : 28.5, 58, 3.5, 3.1, 'pants', { g: 'legF' }),
      B(atk ? 32 : 29.4, 59.8, 4.5, 2.9, 3, 'shoeK', { g: 'legF' }),
      // 무복 아랫자락(앞뒤 두 폭)과 푸른 단
      P([[x(16.5), y(42)], [x(24), y(42)], [x(22.5) - (atk ? 2 : 0), y(53) + w * 0.4], [x(14.5) - (atk ? 2 : 0), y(51.5) + w * 0.6]], 'muW', { g: 'skirtB', bev: 1.4 }),
      P([[x(24), y(42)], [x(31.5), y(42)], [x(33.5) + (atk ? 2 : 0), y(51.5)], [x(25), y(53)]], 'muW', { g: 'skirtF', bev: 1.4 }),
      C(x(25.2), y(52.6), x(33.3) + (atk ? 2 : 0), y(51.3), 0.8, 0.8, 'muB', { line: false, ao: false }),
      // 몸통, 교차 깃, 붉은 허리띠
      B(x(24), y(37), 8.4, 8.4, 2.4, 'muW', { g: 'torso' }),
      C(x(21.2), y(30.2), x(26.6), y(38), 1.1, 1.1, 'muB', { line: false }),
      C(x(27.8), y(30.2), x(25.4), y(34.5), 1, 1, 'muB', { line: false }),
      B(x(24), y(43.2), 9, 2, 6, 'scarf', { g: 'sash' }),
      P([[x(18.5), y(43)], [x(14.5) - (atk ? 2 : 0), y(48) + w], [x(16.5) - (atk ? 2 : 0), y(49.5) + w], [x(20), y(44.5)]], 'scarf', { g: 'sashT', bev: 0.8 }),
      // 머리
      E(x(23), y(16), 10.4, 10, 'hairK', { g: 'hair' }),
      E(x(28.5), y(19.8), 7.2, 7.4, 'skin', { g: 'face' }),
      E(x(26), y(11.5), 9.6, 5, 'hairK', { rot: -0.25, g: 'bang' }),
      P([[x(28), y(11)], [x(35.5), y(15.5)], [x(32.5), y(17.5)], [x(27), y(15)]], 'hairK', { g: 'bang', bev: 1 }),
      C(x(23.5), y(18), x(22.6), y(27.5), 1.9, 1.3, 'hairK', { g: 'lock' }),
      // 정수리 묶음과 붉은 댕기
      E(x(17), y(8.6), 3, 2.8, 'hairK', { g: 'bun' }),
      P([[x(15.5), y(7.5)], [x(10.5), y(4.5) + w * 0.6], [x(11.5), y(8.5) + w * 0.6]], 'scarf', { g: 'rib', bev: 0.6 }),
      P([[x(15.5), y(9)], [x(11), y(12) + w * 0.8], [x(13), y(13.5) + w * 0.8]], 'scarf', { g: 'rib2', bev: 0.6 })
    ].concat(face(x(31.8), y(19.8)), [
      // 직검: 가는 날, 금 코등이, 술
      L(x(blade[0]), y(blade[1]), x(blade[2]), y(blade[3]), 1.7, 'blade'),
      C(x(guard[0]), y(guard[1]), x(guard[2]), y(guard[3]), 1, 1, 'gold', { g: 'guard' }),
      C(x(tas[0][0]), y(tas[0][1]), x(tas[1][0]), y(tas[1][1]), 0.8, 0.9, 'scarf', { g: 'tassel' }),
      C(x(tas[1][0]), y(tas[1][1]), x(tas[2][0]), y(tas[2][1]), 0.9, 1.3, 'scarf', { g: 'tassel' }),
      // 앞 소매(넓은 소매 끝에 푸른 단)와 손
      C(x(29.5), y(32), x(hand[0] - 1.2), y(hand[1] - 2), 3.2, 3.4, 'muW', { g: 'arm' }),
      E(x(hand[0] - 1.4), y(hand[1] - 1.6), 2.4, 2.6, 'muB', { g: 'cuff' }),
      E(x(hand[0]), y(hand[1]), 2.3, 2.3, 'skin', { g: 'arm' }),
      E(x(pommel[0]), y(pommel[1]), 1.1, 1.1, 'gold', { g: 'pommel' })
    ]) };
  } });

  // 브리아 — 은발, 금 머리띠, 푸른 판금, 큰 방패. 공격: 방패를 앞으로 밀어낸다
  S.def('bram', { h: 56, rim: RIM, fn: function (t, pose) {
    var atk = pose === 'attack', b = atk ? 0.4 : S.bob(t, 0.9), lx = atk ? 1.4 : 0, sx = atk ? 5 : 0;
    var y = function (v) { return v + b; }, x = function (v) { return v + lx; };
    return { w: 56, h: 64, cx: 24, tip: [43, 40], tipAttack: [48, 40], parts: [
      E(x(16.5), y(31), 5.6, 4.8, 'plateD', { g: 'paulB' }),
      C(x(16), y(33), x(13.5), y(42), 3.4, 3, 'plateD', { g: 'armB' }),
      C(20, 48, atk ? 17.5 : 19, 58, 4.2, 3.8, 'pants', { g: 'legB' }),
      B(atk ? 17.6 : 19.2, 59.6, 4.9, 3.3, 3, 'plateD', { g: 'legB' }),
      C(28, 48, atk ? 31 : 29, 58, 4.3, 3.9, 'pants', { g: 'legF' }),
      B(atk ? 31.8 : 29.8, 59.6, 5.3, 3.3, 3, 'plateD', { g: 'legF' }),
      B(x(23.5), y(47), 10.6, 3.8, 2.5, 'plateD', { g: 'tas' }),
      B(x(23.5), y(38), 10.6, 9.8, 2.4, 'plate', { g: 'torso' }),
      B(x(23.5), y(45), 10.4, 1.5, 6, 'leather', { line: false }),
      E(x(23), y(17.5), 9.6, 9.2, 'hairS', { g: 'hair' }),
      E(x(27.6), y(20.5), 7, 7.2, 'skin', { g: 'face' }),
      E(x(25), y(13), 9.2, 4.6, 'hairS', { rot: -0.15, g: 'bang' }),
      C(x(15.5), y(15.5), x(33), y(12.8), 1.1, 1.1, 'gold', { g: 'circ' }),
      C(x(29.4), y(18.4), x(33.2), y(17.9), 0.55, 0.55, 'brow', { line: false, minS: 0.9, ao: false }),
      E(x(31.6), y(20.6), 1.0, 1.15, 'eye', { keep: true, line: false }),
      E(x(30), y(31), 6, 5, 'plate', { g: 'paulF' }),
      C(x(31), y(33.5), x(34) + sx * 0.6, y(40), 3.2, 2.9, 'plate', { g: 'armF' }),
      B(x(35.5) + sx, y(42), 8.6, 11.6, 2.4, 'gold', { g: 'sh' }),
      B(x(35.5) + sx, y(42), 7, 10, 2.4, 'plate', { g: 'sh', bev: 0.3 }),
      P([[x(35.5) + sx, y(35.5)], [x(38.6) + sx, y(42)], [x(35.5) + sx, y(48.5)], [x(32.4) + sx, y(42)]], 'gold', { g: 'em', bev: 1 })
    ] };
  } });

  // 리라 — 주황 머리, 보라 고깔모자와 로브, 불꽃 구슬 지팡이. 공격: 지팡이를 앞으로 기울이고 구슬이 커진다
  S.def('lyra', { h: 56, rim: RIM, fn: function (t, pose) {
    var atk = pose === 'attack', b = atk ? 0 : S.bob(t), w = S.wave(t), y = function (v) { return v + b; };
    var orb = atk ? [42.6, 6.4, 4.6] : [37.8, 9.8, 3.7];
    var staff = atk ? [41.6, 10.5, 35.5, 60] : [37.6, 14, 38.4, 60];
    var hand = atk ? [39, 33.2] : [37.2, 38.2];
    var claws = atk ? [[39.6, 10.2, 40.4, 5.8], [45.3, 11, 45.2, 6.6]] : [[35, 13.6, 35.4, 9], [40.6, 13.6, 40.2, 9]];
    return { w: 56, h: 64, cx: 24, tip: [37.8, 9.8], tipAttack: [42.6, 6.4], glow: [{ x: orb[0], y: y(orb[1]), r: atk ? 15 : 11, c: '#ff8a3a', k: atk ? 1.3 : 1 }], parts: [
      E(20, y(25), 6.4, 11, 'hairF', { rot: 0.22 + w * 0.04, g: 'hair' }),
      C(19, y(32), 15, y(40), 3, 3.8, 'robeD', { g: 'armB' }),
      E(16.5, y(41.2), 2.1, 2.1, 'skin', { g: 'armB' }),
      E(18.5, 61.6, 3.4, 1.9, 'boot', { g: 'ft' }),
      E(29.5, 61.6, 3.8, 1.9, 'boot', { g: 'ft2' }),
      P([[16.5, y(36)], [31.5, y(36)], [35.5, 61], [12.5, 61]], 'robe', { g: 'robe', bev: 2.2 }),
      B(24, y(37), 7.6, 7, 2.4, 'robe', { g: 'robe' }),
      C(13, 60.6, 35, 60.6, 1, 1, 'gold', { line: false, ao: false }),
      B(24, y(43), 8.2, 1.5, 6, 'gold', { line: false }),
      C(staff[0], y(staff[1]), staff[2], staff[3], 1.05, 1.05, 'wood', { g: 'staff' }),
      E(28, y(21), 7, 7.2, 'skin', { g: 'face' }),
      E(26, y(17), 8.2, 4, 'hairF', { rot: -0.2, g: 'bang' }),
      C(22.5, y(19), 21, y(29), 2.6, 1.6, 'hairF', { g: 'bang' }),
      P([[16, y(14)], [33, y(12)], [29, y(5)], [23, y(1.5)], [12, y(1) + w * 0.6], [19, y(7)]], 'hat', { g: 'hat', bev: 1.6 }),
      C(17.5, y(12.2), 32.5, y(10.4), 1.4, 1.4, 'gold', { g: 'hatb' }),
      E(25, y(14.3), 14, 3, 'hat', { rot: -0.12, g: 'brim' })
    ].concat(face(31.5, y(21.8)), [
      C(29, y(32), hand[0] - 2, y(hand[1] - 1), 3, 3.4, 'robe', { g: 'armF' }),
      E(hand[0], y(hand[1]), 2.4, 2.4, 'skin', { g: 'armF' }),
      E(orb[0], y(orb[1]), orb[2], orb[2], 'fire', { g: 'orb' }),
      C(claws[0][0], y(claws[0][1]), claws[0][2], y(claws[0][3]), 0.8, 0.6, 'gold', { g: 'claw1' }),
      C(claws[1][0], y(claws[1][1]), claws[1][2], y(claws[1][3]), 0.8, 0.6, 'gold', { g: 'claw2' })
    ]) };
  } });

  // 세라 — 금발, 흰 사제복과 금 장식, 고리 지팡이. 공격: 지팡이를 높이 들고 고리가 빛난다
  S.def('sera', { h: 56, rim: RIM, fn: function (t, pose) {
    var atk = pose === 'attack', b = atk ? 0 : S.bob(t), y = function (v) { return v + b; };
    var ring = atk ? [39, 7, 5.4] : [36.2, 10.5, 5.2];
    var staff = atk ? [38.6, 12, 35.6, 60] : [36, 15, 36.4, 60];
    var hand = atk ? [38, 34] : [35.8, 39];
    return { w: 56, h: 64, cx: 24, tip: [36.2, 10.5], tipAttack: [39, 7], glow: [{ x: ring[0], y: y(ring[1]), r: atk ? 14 : 10, c: '#ffd96a', k: atk ? 1.3 : 1 }], parts: [
      E(19.5, y(27), 6.2, 12, 'hairB', { rot: 0.12, g: 'hair' }),
      C(19, y(32), 15.5, y(41), 3, 3.9, 'robeW', { g: 'armB' }),
      E(17.5, 61.6, 3.4, 1.9, 'shoe', { g: 'ft' }),
      E(29, 61.6, 3.8, 1.9, 'shoe', { g: 'ft2' }),
      P([[16, y(36)], [31.5, y(36)], [34.5, 61], [13.5, 61]], 'robeW', { g: 'robe', bev: 2.2 }),
      B(24, y(37), 7.6, 7, 2.4, 'robeW', { g: 'robe' }),
      P([[26.5, y(39)], [29.5, y(39)], [31, 61], [27.5, 61]], 'gold', { line: false, bev: 0.8 }),
      C(14, 60.6, 34, 60.6, 0.9, 0.9, 'gold', { line: false, ao: false }),
      C(20, y(30.5), 30.5, y(32.5), 2.2, 2.2, 'gold', { g: 'stole' }),
      C(staff[0], y(staff[1]), staff[2], staff[3], 1, 1, 'gold', { g: 'staff' }),
      E(28, y(21), 7, 7.2, 'skin', { g: 'face' }),
      E(25.5, y(15.8), 8.8, 5, 'hairB', { rot: -0.2, g: 'bang' }),
      C(22, y(19), 20.2, y(34), 2.8, 2, 'hairB', { g: 'bang' }),
      C(18.5, y(13.6), 31.5, y(11.3), 1, 1, 'gold', { g: 'tiara' }),
      E(30.6, y(11.6), 1.2, 1.2, 'gemB', { keep: true, minS: 0.6, line: false })
    ].concat(face(31.5, y(21.8)), [
      C(29, y(32), hand[0] - 1.8, y(hand[1] - 1), 3, 3.4, 'robeW', { g: 'armF' }),
      E(hand[0], y(hand[1]), 2.3, 2.3, 'skin', { g: 'armF' }),
      E(ring[0], y(ring[1]), ring[2], ring[2], 'gold', { g: 'ring' }),
      E(ring[0], y(ring[1]), ring[2] * 0.64, ring[2] * 0.64, 'cut'),
      E(ring[0], y(ring[1]), ring[2] * 0.37, ring[2] * 0.37, 'holy', { g: 'core' })
    ]) };
  } });

  // 소연(nox) — 사천당가. 검은 쌍상투와 옥비녀, 연녹색 면사, 짙은 녹색 무복에 보라 허리띠, 손가락 사이의 비도 세 자루.
  // 공격: 몸을 틀며 비도를 날린다
  S.def('nox', { h: 56, rim: RIM, fn: function (t, pose) {
    var atk = pose === 'attack', b = atk ? 1 : S.bob(t), w = S.wave(t), lx = atk ? 1.8 : 0;
    var y = function (v) { return v + b; }, x = function (v) { return v + lx; };
    var hand = atk ? [38, 36.4] : [33.6, 41.6];
    var fan = atk ? [[39, 35, 48, 31], [39.4, 36.4, 49.4, 35.4], [39, 37.8, 48, 39.6]] : [[34.6, 40.4, 40.4, 35.6], [35.2, 41.4, 42, 39.4], [34.6, 42.6, 40.6, 44]];
    var parts = [
      // 뒤로 늘어진 긴 머리
      C(x(17.5), y(18), x(14) + w * 0.6, y(36), 3.6, 2.2, 'hairK', { g: 'hairL' }),
      // 뒤 소매와 손
      C(x(19), y(32), x(16) - (atk ? 1.5 : 0), y(40), 3.1, 3.4, 'muG', { g: 'armB' }),
      E(x(16) - (atk ? 1.5 : 0), y(41.6), 2.1, 2.1, 'skin', { g: 'armB' }),
      // 다리
      C(21, 47, atk ? 18 : 20, 58, 3.2, 2.9, 'cloth', { g: 'legB' }),
      B(atk ? 18.4 : 20.4, 59.8, 4.1, 2.9, 3, 'shoeK', { g: 'legB' }),
      C(27.3, 47, atk ? 32 : 28.6, 58, 3.3, 3, 'cloth', { g: 'legF' }),
      B(atk ? 33 : 29.6, 59.8, 4.5, 2.9, 3, 'shoeK', { g: 'legF' }),
      // 짧은 치마폭
      P([[x(16.5), y(42)], [x(31.5), y(42)], [x(33) + (atk ? 1.5 : 0), y(50)], [x(15) - (atk ? 1.5 : 0), y(50) + w * 0.5]], 'muGD', { g: 'skirt', bev: 1.4 }),
      // 몸통과 깃, 보라 허리띠(늘어진 끈)
      B(x(24), y(37.5), 8, 8.4, 2.4, 'muG', { g: 'torso' }),
      C(x(21), y(30.4), x(26.6), y(37.8), 1, 1, 'muGD', { line: false }),
      B(x(24), y(43.2), 8.8, 1.9, 6, 'sashP', { g: 'sash' }),
      C(x(19), y(44), x(17) - (atk ? 2 : 0), y(50) + w, 0.9, 0.9, 'sashP', { g: 'sashT' }),
      E(x(19.5), y(46.6), 1.8, 2.2, 'leather', { g: 'pouch' }),
      // 머리: 쌍상투, 옥비녀
      E(x(23.5), y(16.5), 10, 9.8, 'hairK', { g: 'hair' }),
      E(x(17.5), y(8), 3.6, 3.4, 'hairK', { g: 'bunB' }),
      E(x(29), y(6.6), 3.6, 3.4, 'hairK', { g: 'bunF' }),
      C(x(26), y(5.2), x(33.5), y(3.8), 0.7, 0.7, 'jade', { g: 'pin' }),
      E(x(33.6), y(3.8), 1.1, 1.1, 'jade', { keep: true, line: false, minS: 0.6 }),
      E(x(29), y(20.4), 6.8, 7, 'skin', { g: 'face' }),
      E(x(26), y(12.5), 9.2, 4.4, 'hairK', { rot: -0.2, g: 'bang' }),
      C(x(23.6), y(18), x(22.4), y(27), 1.8, 1.2, 'hairK', { g: 'lock' }),
      // 면사(코 아래를 가린다)
      P([[x(25.5), y(22.6)], [x(35.6), y(21.6)], [x(34.6), y(27.4)], [x(26.5), y(28.6)]], 'veil', { g: 'veil', bev: 0.8 }),
      E(x(32.4), y(19.4), 0.9, 1.4, 'eye', { keep: true, line: false }),
      E(x(32.7), y(18.6), 0.4, 0.45, 'white', { keep: true, line: false, minS: 1.1 }),
      E(x(32.8), y(19.5), 1.1, 0.6, 'glintG', { keep: true, line: false, emitLv: atk ? 4 : 2 }),
      // 앞 소매와 손, 비도 세 자루
      C(x(29.5), y(32), x(hand[0] - 1), y(hand[1] - 2), 3, 3.2, 'muG', { g: 'armF' })
    ];
    fan.forEach(function (f, i) { parts.push(L(x(f[0]), y(f[1]), x(f[2]), y(f[3]), 1.2, 'blade')); });
    parts.push(E(x(hand[0]), y(hand[1]), 2.3, 2.3, 'skin', { g: 'armF' }));
    return { w: 56, h: 64, cx: 24, tip: [42, 39.4], tipAttack: [49.4, 35.4], parts: parts };
  } });

  // 거울의 그림자: 영웅 그림을 왼쪽으로 돌리고 어두운 보랏빛으로
  ['kai', 'bram', 'lyra', 'sera', 'nox'].forEach(function (id) {
    S.variant('shadow_' + id, id, { flip: true, remap: S.shadowRemap, rim: '#ff5a7a' });
  });
})();
