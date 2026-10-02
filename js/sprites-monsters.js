// sprites-monsters.js — 몬스터 도형 도트 그림(11단계). 몬스터는 왼쪽(영웅 쪽)을 본다.
// 단위 = 그림 픽셀(모델 높이 = h - 2). 크기: 일반 56~80 · 정예 88~100 · 보스 116~128 · 최종 보스 148
// 귀여움보다 위압감: 빛나는 가는 눈, 송곳니·발톱·뿔, 큰 덩치, 테마 색 역광
(function () {
  'use strict';
  var S = Game.Shape, E = S.E, C = S.C, B = S.B, P = S.P, L = S.L, mat = S.mat;
  var TAU = S.TAU, wave = S.wave;
  var RIM = { forest: '#b8f07a', desert: '#ffd27a', snow: '#c8f0ff', volcano: '#ff9a4a', castle: '#c9a0ff', mirror: '#ff5a7a' };

  function emitRamp(dark, mid, light) { return [S.darken(dark, 0.4), dark, mid, S.mix(mid, light, 0.5), light, '#ffffff']; }
  // 눈(발광)
  mat('eyeY', '', { emit: true, ramp: emitRamp('#8a5a06', '#ffb02a', '#fff3a8') });
  mat('eyeR', '', { emit: true, ramp: emitRamp('#7a0a1a', '#ff3a3a', '#ffc0b0') });
  mat('eyeG', '', { emit: true, ramp: emitRamp('#2a5a06', '#a8ff3a', '#f0ffc0') });
  mat('eyeV', '', { emit: true, ramp: emitRamp('#4a1a7a', '#c060ff', '#f0d0ff') });
  mat('eyeC', '', { emit: true, ramp: emitRamp('#0a3a6a', '#3fd0ff', '#e0fbff') });
  mat('mouthD', '#1a0e14', { solid: true });
  mat('tooth', '#ece4c8', { solid: true });
  mat('claw', '#e2d8c0', { spec: 0.4, dark: 0.3 });
  mat('bone', '#e6dcc0', { dark: 0.3, spec: 0.2 });

  // 송곳니 줄: x0~x1 사이에 n개, 위(dir=1 아래로 뾰족) 또는 아래(dir=-1)
  function fangs(x0, x1, y, n, len, dir, o) {
    var out = [], w = (x1 - x0) / n;
    for (var i = 0; i < n; i++) {
      var a = x0 + i * w, l = len * (i % 2 ? 0.7 : 1);
      out.push(P([[a, y], [a + w, y], [a + w * 0.5, y + l * dir]], 'tooth', Object.assign({ line: false, ao: false, bev: 0 }, o)));
    }
    return out;
  }
  // 두 마디 다리(어깨 → 무릎 → 발끝)
  function leg(x0, y0, kx, ky, fx, fy, r, m, g) {
    return [C(x0, y0, kx, ky, r, r * 0.85, m, { g: g }), C(kx, ky, fx, fy, r * 0.85, r * 0.35, m, { g: g }), E(kx, ky, r * 0.95, r * 0.95, m, { g: g })];
  }
  // 굽이치는 줄기(덩굴·꼬리): 점 목록을 굵기 r0 → r1 로 잇는다
  function chain(pts, r0, r1, m, o) {
    var out = [], n = pts.length - 1;
    for (var i = 0; i < n; i++) {
      var a = r0 + (r1 - r0) * i / n, b = r0 + (r1 - r0) * (i + 1) / n;
      out.push(C(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], a, b, m, o));
    }
    return out;
  }
  function concat() { return [].concat.apply([], arguments); }
  function M(id, theme, h, fn, o) { S.def(id, Object.assign({ h: h, group: theme, rim: RIM[theme], fn: fn }, o)); }

  // 정의가 없는 그림을 찾으면 그리는 그림자 덩어리
  M('_unknown', 'misc', 48, function (t) {
    var sq = wave(t) * 0.05;
    return { w: 40, h: 46, parts: [E(20, 28, 17 * (1 + sq), 16 * (1 - sq), 'voidRobe', { g: 'b' }), B(20, 50, 30, 6, 8, 'cut'),
      E(14, 24, 2, 1, 'eyeV', { keep: true, line: false }), E(24, 24, 2, 1, 'eyeV', { keep: true, line: false })] };
  });

  // =====================================================================
  // 만독곡(옛 속삭이는 숲) — 무림 몬스터 일부는 js/sprites-murim.js
  // =====================================================================
  mat('ooze', '#4f9a3c', { spec: 0.6, shin: 10, dark: 0.22 });
  mat('oozeCore', '#2c5e2a', { dark: 0.14 });
  mat('oozeShine', '#e4ffd0', { solid: true });
  mat('boneMurk', '#a9b88e', { dark: 0.22 });
  mat('lavaCrust', '#4a2a26', { dark: 0.16, shift: 20 });
  mat('lavaGlow', '', { emit: true, ramp: S.FIRE });
  mat('cap', '#9a2e5a', { spec: 0.35, dark: 0.22 });
  mat('spot', '#f0d8a0', { dark: 0.2 });
  mat('gill', '#5a2c3a', { dark: 0.14 });
  mat('stalk', '#b8a48a', { dark: 0.28, shift: 22 });
  mat('stalkD', '#8a7662', { dark: 0.22, shift: 22 });
  mat('spore', '', { emit: true, ramp: emitRamp('#4a5a10', '#d8f04a', '#fbffd0') });
  mat('fur', '#5d5464', { dark: 0.2, shift: 18 });
  mat('furD', '#3f3848', { dark: 0.16, shift: 18 });
  mat('furL', '#7c7384', { dark: 0.22, shift: 18 });
  mat('nose', '#160e18', { solid: true });
  mat('bark', '#5a3f2e', { dark: 0.2, shift: 20 });
  mat('barkD', '#3a281e', { dark: 0.14, shift: 20 });
  mat('vine', '#2f6a34', { dark: 0.2 });
  mat('vineL', '#4f8a3a', { dark: 0.22 });
  mat('thorn', '#c9b07a', { dark: 0.3 });
  mat('petal', '#8a1f3a', { spec: 0.3 });
  mat('maw', '#2a0c14', { dark: 0.1 });
  mat('skinG', '#7a9448', { dark: 0.24, light: 0.16 });
  mat('hood', '#4e3a2c', { dark: 0.18 });
  mat('rag', '#6a5a40', { dark: 0.2 });
  mat('ragD', '#4a3e2c', { dark: 0.16 });
  mat('rust', '#9a8a7a', { spec: 0.5, dark: 0.3 });
  mat('sack', '#8a7450', { dark: 0.24 });
  mat('chitin', '#3a2e4a', { spec: 0.5, shin: 14, dark: 0.14, shift: 20 });
  mat('chitinL', '#5c4a72', { spec: 0.5, shin: 14, dark: 0.18, shift: 20 });
  mat('venom', '', { emit: true, ramp: emitRamp('#2a5a10', '#8aff3a', '#e8ffc0') });
  mat('leafD', '#253f22', { dark: 0.14 });
  mat('leaf', '#35582c', { dark: 0.18 });
  mat('moss', '#5f8a3a', { dark: 0.2 });
  mat('corrupt', '', { emit: true, ramp: emitRamp('#3a0a5a', '#b04aff', '#f0c8ff') });

  // 늪의 점액괴물(슬라임·용암 슬라임): 뼈를 삼킨 거대한 덩어리, 눈 셋, 이빨 난 입
  function ooze(pal) {
    return function (t, pose) {
      var atk = pose === 'attack', sq = wave(t) * 0.05, lx = atk ? -4 : 0, mo = atk ? 6.5 : 4.2;
      var x = function (v) { return v + lx * (1 - v / 90); };
      return { w: 78, h: 58, cx: 40, tipAttack: [14, 40], glow: pal.glow ? [{ x: 44, y: 36, r: 22, c: pal.glow }] : null, parts: concat([
        E(40, 55, 37, 4.2, pal.body, { g: 'b' }),
        E(x(40), 35 + sq * 10, 28 * (1 + sq), 21 * (1 - sq), pal.body, { g: 'b' }),
        E(x(23), 23 + sq * 6, 12, 11, pal.body, { g: 'b' }),
        E(x(52), 20 - sq * 6, 13, 12.5, pal.body, { g: 'b' }),
        E(x(37), 14 + sq * 4, 9, 8, pal.body, { g: 'b' }),
        B(40, 64, 52, 7, 8, 'cut'),
        E(x(44), 36, 16, 12, pal.core, { line: false, ao: false, flat: 0.4 }),
        E(x(47), 33, 5.6, 5, pal.inner, { line: false, ao: false }),
        E(x(45), 35, 1.4, 1.6, pal.core, { line: false, ao: false, keep: true }),
        E(x(49.5), 34.6, 1.4, 1.6, pal.core, { line: false, ao: false, keep: true }),
        C(x(52), 39, x(60), 43, 1.1, 0.9, pal.inner, { line: false, ao: false }),
        C(x(54), 42, x(58), 47, 1, 0.8, pal.inner, { line: false, ao: false }),
        E(x(23), 41.5, 10.5, mo, 'mouthD', { rot: 0.08 })
      ], fangs(x(14), x(32), 38.2 - (atk ? 1.6 : 0), 6, 3.4, 1), fangs(x(16), x(30), 45 + (atk ? 2.4 : 0), 5, 2.6, -1), [
        C(x(13), 44, x(12), 51 + wave(t, 1) * 1.5, 1.6, 1.1, pal.body, { g: 'drip' }),
        C(x(31), 47, x(31), 53, 1.4, 1, pal.body, { g: 'drip2' }),
        E(x(17), 29, 3.2, 1.4, pal.eye, { rot: 0.38, keep: true, line: false }),
        E(x(29), 27, 3.6, 1.5, pal.eye, { rot: -0.3, keep: true, line: false }),
        E(x(40), 19.5, 2, 1.1, pal.eye, { keep: true, line: false }),
        E(x(19), 16, 4, 1.8, pal.shine, { rot: -0.5, line: false, ao: false }),
        E(x(56), 13, 2, 1, pal.shine, { rot: -0.4, line: false, ao: false })
      ]) };
    };
  }
  // 독두꺼비(slime)는 js/sprites-murim.js

  // 독버섯: 거대한 독갓을 쓴 균사 거인
  M('mushroom', 'forest', 72, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1.2), y = function (v) { return v + b; };
    var fist = atk ? [4, 40] : [9, 55];
    var spores = [];
    for (var i = 0; i < 6; i++) {
      var ph = (t + i / 6) % 1;
      spores.push(E(8 + i * 9 + Math.sin(ph * TAU + i) * 3, 30 - ph * 26, 1.1, 1.1, 'spore', { keep: true, line: false, ao: false }));
    }
    return { w: 64, h: 70, cx: 32, tipAttack: [4, 40], glow: [{ x: 30, y: 30, r: 12, c: '#c8f04a', k: 0.7 }], parts: concat([
      C(41, y(41), 50, y(51), 3.8, 3.2, 'stalkD', { g: 'armB' }), E(51, y(53), 4, 3.6, 'stalkD', { g: 'armB' }),
      C(27, 57, 25, 66, 4.8, 4.2, 'stalkD', { g: 'legB' }), E(24, 66.5, 6, 2.6, 'stalkD', { g: 'legB' }),
      C(38, 57, 40, 66, 4.8, 4.2, 'stalk', { g: 'legF' }), E(41, 66.5, 6.5, 2.6, 'stalk', { g: 'legF' }),
      B(32, y(46), 12, 14, 2, 'stalk', { g: 'body' }),
      C(25, y(46), 39, y(46), 0.6, 0.6, 'stalkD', { line: false, ao: false }),
      C(26, y(52), 38, y(52), 0.6, 0.6, 'stalkD', { line: false, ao: false }),
      E(32, y(28), 21, 5.5, 'gill', { g: 'gill' }),
      E(32, y(18), 29, 15, 'cap', { g: 'cap' }),
      B(32, y(36), 34, 8, 6, 'cut'),
      E(18, y(13), 4.5, 3, 'spot', { line: false, flat: 0.6 }), E(33, y(8), 5, 3, 'spot', { line: false, flat: 0.6 }),
      E(46, y(14), 4, 2.6, 'spot', { line: false, flat: 0.6 }), E(26, y(20), 2.6, 1.8, 'spot', { line: false, flat: 0.6 }),
      E(54, y(22), 2.6, 1.6, 'spot', { line: false, flat: 0.6 }), E(10, y(22), 2.4, 1.6, 'spot', { line: false, flat: 0.6 }),
      E(24, y(33), 2.8, 1.2, 'eyeV', { rot: 0.32, keep: true, line: false }),
      E(34, y(33), 2.8, 1.2, 'eyeV', { rot: -0.32, keep: true, line: false }),
      P([[22, y(38)], [36, y(38)], [33, y(41.5)], [30, y(39.5)], [27, y(42)], [24, y(39.5)]], 'mouthD', { bev: 0 }),
      C(22, y(41), fist[0] + 3, y(fist[1] - 3), 4.2, 3.4, 'stalk', { g: 'armF' }),
      E(fist[0], y(fist[1]), 5, 4.6, 'stalk', { g: 'armF' })
    ], spores) };
  });

  // 숲 늑대 · 서리 늑대: 낮게 웅크린 다이어울프
  function wolf(pal) {
    return function (t, pose) {
      var atk = pose === 'attack', b = S.bob(t, 0.8), y = function (v) { return v + b; }, hx = atk ? -5 : 0, jaw = atk ? 0.55 : 0.22;
      var tail = wave(t) * 1.5;
      var spikes = [];
      if (pal.ice) [[44, 22], [52, 21], [60, 22], [68, 24]].forEach(function (q, i) {
        spikes.push(P([[q[0] - 3, y(q[1] + 3)], [q[0] + 1, y(q[1] - 7 - (i % 2) * 3)], [q[0] + 3, y(q[1] + 3)]], 'ice', { bev: 1, g: 'ice' + i }));
      });
      return { w: 92, h: 62, cx: 50, tipAttack: [4 + hx, 30], parts: concat(
        chain([[78, y(30)], [85, y(22) + tail], [90, y(17) + tail]], 4.2, 2.4, pal.d, { g: 'tail' }),
        leg(70, y(40), 75, y(50), 72, 59, 4.2, pal.d, 'lb1'), leg(40, y(42), 44, y(51), 40, 59, 4, pal.d, 'lb2'),
        [E(70, 59.5, 4, 2, pal.d, { g: 'lb1' }), E(40, 59.5, 4, 2, pal.d, { g: 'lb2' })],
        [E(58, y(34), 23, 12.5, pal.m, { rot: -0.06, g: 'body' }),
          E(64, y(40), 15, 7, pal.l, { g: 'body', flat: 0.6 })],
        [P([[46, y(24)], [50, y(16)], [53, y(23)], [57, y(15)], [60, y(23)], [65, y(17)], [67, y(25)]], pal.d, { g: 'mane2', bev: 1 })],
        spikes,
        [E(36, y(31), 13, 14, pal.l, { rot: 0.3, g: 'mane' }),
          P([[28, y(20)], [33, y(13)], [37, y(20)], [42, y(15)], [44, y(24)]], pal.l, { g: 'mane', bev: 1.2 })],
        leg(68, y(40), 63, y(50), 66, 59, 4.6, pal.m, 'lf1'), [E(65, 59.6, 4.6, 2, pal.m, { g: 'lf1' })],
        [P([[x0(22, hx), y(19)], [x0(25, hx), y(7)], [x0(31, hx), y(19)]], pal.d, { g: 'earB', bev: 1 })],
        [E(x0(22, hx), y(26), 10.5, 8.5, pal.m, { g: 'head' }),
          B(x0(10, hx), y(29), 8.5, 4.2, 2.2, pal.m, { rot: 0.12, g: 'head' }),
          B(x0(12, hx), y(35) + jaw * 4, 7.5, 2.2, 3, pal.d, { rot: jaw, g: 'jaw' })],
        fangs(x0(4, hx), x0(14, hx), y(32.2), 4, 2.6, 1),
        [E(x0(2.5, hx), y(27.6), 1.9, 1.5, 'nose', { keep: true }),
          P([[x0(15, hx), y(19)], [x0(17, hx), y(9)], [x0(23, hx), y(19)]], pal.m, { g: 'earF', bev: 1 }),
          C(x0(13, hx), y(21.6), x0(22, hx), y(22.6), 0.8, 0.8, pal.d, { line: false, ao: false }),
          E(x0(17, hx), y(24.2), 2.6, 1.1, pal.eye, { rot: -0.25, keep: true, line: false })],
        leg(36, y(42), 30, y(50), 28, 59, 4.6, pal.m, 'lf2'),
        [E(27, 59.6, 5, 2, pal.m, { g: 'lf2' })],
        fangs(23, 31, 60.5, 3, 1.8, -1, { minS: 0 })
      ) };
    };
  }
  function x0(v, d) { return v + d; }
  mat('ice', '#a8e8ff', { spec: 1, shin: 24, dark: 0.3 });
  M('forest_wolf', 'forest', 62, wolf({ m: 'fur', d: 'furD', l: 'furL', eye: 'eyeY' }));

  // 덩굴 정령: 가시 덩굴이 휘감은 식인 꽃
  M('vine', 'forest', 74, function (t, pose) {
    var atk = pose === 'attack', w1 = wave(t), w2 = wave(t, 2), lx = atk ? -4 : 0;
    var vines = concat(
      chain([[30, 66], [18, 56], [12 + w1 * 2, 44], [6 + w1 * 3, 34], [9 + w1 * 3, 26]], 3.6, 1.2, 'vine', { g: 'v1' }),
      chain([[38, 66], [50, 56], [56 - w2 * 2, 46], [60 - w2 * 2, 36], [56 - w2 * 3, 28]], 3.4, 1.1, 'vine', { g: 'v2' }),
      chain([[34, 66], [44, 60], [58, 58], [64 + w1, 50]], 2.8, 1, 'vine', { g: 'v3' })
    );
    var thorns = [];
    [[13, 50], [7, 38], [54, 52], [59, 40], [52, 58], [20, 58]].forEach(function (q, i) {
      thorns.push(P([[q[0] - 1.2, q[1]], [q[0] + (i % 2 ? 3 : -3), q[1] - 2.5], [q[0] + 1.2, q[1] + 0.8]], 'thorn', { bev: 0, line: false, ao: false }));
    });
    var petals = [];
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * TAU + w1 * 0.05, r = atk ? 14 : 12;
      petals.push(E(32 + lx + Math.cos(a) * r, 34 + Math.sin(a) * r * 0.9, 7.5, 4.6, 'petal', { rot: a, g: 'petal' }));
    }
    return { w: 66, h: 72, cx: 33, tipAttack: [16, 34], glow: [{ x: 32, y: 20, r: 9, c: '#ff4a4a', k: 0.8 }], parts: concat(
      [E(34, 67, 22, 4.6, 'barkD', { g: 'root' })],
      chain([[22, 68], [12, 70]], 2.6, 1.2, 'bark', { g: 'root' }), chain([[46, 68], [58, 70]], 2.6, 1.2, 'bark', { g: 'root' }),
      vines, thorns,
      [C(33, 66, 32 + lx * 0.5, 44, 5.5, 4.2, 'vineL', { g: 'stem' })],
      petals,
      [E(32 + lx, 34, 11, 11.5, 'vineL', { g: 'bulb' }),
        E(31 + lx, 37, 7, atk ? 8 : 6.5, 'maw', { g: 'maw' })],
      fangs(26 + lx, 36 + lx, 31.5, 5, 3, 1), fangs(27 + lx, 35 + lx, 42.5 + (atk ? 2 : 0), 4, 2.4, -1),
      [E(32 + lx, 24.5, 3.2, 1.8, 'eyeR', { keep: true, line: false })]
    ) };
  });

  // goblin 는 js/sprites-murim.js(15단계 무림 몬스터)

  // 거대 거미(정예): 해골 무늬 배, 여덟 다리, 붉은 눈 여섯
  M('giant_spider', 'forest', 92, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1.4), y = function (v) { return v + b; }, lx = atk ? -6 : 0, lift = atk ? -8 : 0;
    var legs = [];
    function lg(sx, sy, kx, ky, fx, fy, r, m, g) { legs.push.apply(legs, leg(sx, y(sy), kx, y(ky), fx, fy, r, m, g)); }
    // 먼 다리(어둡게)
    lg(52, 52, 72, 24, 92, 86, 3.2, 'chitin', 'fb1'); lg(50, 54, 62, 22, 76, 86, 3.2, 'chitin', 'fb2');
    lg(46, 54, 36, 22, 30, 86, 3.2, 'chitin', 'ff1'); lg(44, 52, 24, 26, 8 + lx, 70 + lift, 3.2, 'chitin', 'ff2');
    var near = [];
    function ng(sx, sy, kx, ky, fx, fy, r, g) { near.push.apply(near, leg(sx, y(sy), kx, y(ky), fx, fy, r, 'chitinL', g)); }
    ng(56, 58, 82, 30, 104, 88, 3.6, 'nb1'); ng(54, 60, 70, 30, 86, 88, 3.6, 'nb2');
    ng(48, 60, 40, 30, 42, 88, 3.6, 'nf1'); ng(44, 58, 26, 32 + lift * 0.5, 14 + lx, 82 + lift, 3.6, 'nf2');
    return { w: 108, h: 90, cx: 58, tipAttack: [18 + lx, 62], glow: [{ x: 30 + lx, y: 54, r: 10, c: '#ff3a3a', k: 0.8 }], parts: concat(
      legs,
      [E(80, y(44), 27, 23, 'chitin', { g: 'abd', rot: -0.2 }),
        P([[74, y(34)], [86, y(31)], [90, y(42)], [84, y(50)], [78, y(48)], [72, y(42)]], 'bone', { line: false, bev: 1.2 }),
        E(77.5, y(39.5), 2.2, 2.4, 'chitin', { line: false, ao: false }), E(84.5, y(38.5), 2.2, 2.4, 'chitin', { line: false, ao: false }),
        C(78, y(46), 84, y(45), 0.6, 0.6, 'chitin', { line: false, ao: false }),
        E(52, y(56), 13, 10, 'chitinL', { g: 'thx' }),
        E(36 + lx, y(57), 11, 9, 'chitinL', { g: 'head' })],
      [E(29 + lx, y(52), 1.6, 1.4, 'eyeR', { keep: true, line: false }), E(33.5 + lx, y(50.5), 1.8, 1.6, 'eyeR', { keep: true, line: false }),
        E(38.5 + lx, y(50.5), 1.4, 1.2, 'eyeR', { keep: true, line: false }), E(27 + lx, y(56), 1.2, 1.1, 'eyeR', { keep: true, line: false }),
        E(31.5 + lx, y(55.5), 1.3, 1.2, 'eyeR', { keep: true, line: false }), E(36 + lx, y(54.6), 1.1, 1, 'eyeR', { keep: true, line: false })],
      chain([[30 + lx, y(62)], [26 + lx, y(68)], [29 + lx, y(73)]], 2.4, 1, 'claw', { g: 'fang1' }),
      chain([[37 + lx, y(63)], [35 + lx, y(69)], [38 + lx, y(73)]], 2.4, 1, 'claw', { g: 'fang2' }),
      [E(29 + lx, y(75), 0.9, 1.4, 'venom', { keep: true, line: false })],
      near
    ) };
  });

  // treant 는 js/sprites-murim.js(15단계 무림 몬스터)

  // 면이 나뉜 결정 덩어리: 중심에서 각 변으로 삼각형을 만들고, 변 쪽으로 기운 법선을 준다
  function facets(cx, cy, pts, m, g, tilt, o) {
    var out = [];
    tilt = tilt == null ? 0.55 : tilt;
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length], mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy, l = Math.sqrt(mx * mx + my * my) || 1;
      out.push(P([[cx, cy], a, b], m, Object.assign({ nrm: [mx / l * tilt, my / l * tilt, 1], bev: 0, g: g }, o)));
    }
    return out;
  }
  function offset(pts, dx, dy) { return pts.map(function (q) { return [q[0] + dx, q[1] + dy]; }); }

  // =====================================================================
  // 타오르는 사막
  // =====================================================================
  mat('carap', '#8a4428', { spec: 0.55, shin: 12, dark: 0.22 });
  mat('carapD', '#5e2c1c', { spec: 0.4, dark: 0.16 });
  mat('stingG', '', { emit: true, ramp: emitRamp('#4a1a6a', '#c04aff', '#f0d0ff') });
  mat('cactus', '#3f7a46', { dark: 0.2 });
  mat('cactusD', '#2c5a36', { dark: 0.16 });
  mat('needle', '#f2ead0', { solid: true });
  mat('bloom', '#ff4a6a', { spec: 0.3 });
  mat('sand', '#d8b070', { dark: 0.22, shift: 18 });
  mat('sandD', '#a8804a', { dark: 0.2, shift: 18 });
  mat('wrap', '#5a3426', { dark: 0.18 });
  mat('turban', '#d8c49a', { dark: 0.26 });
  mat('vest', '#6a4a30');
  mat('sash', '#b8342e');
  mat('pantsS', '#c8b48a', { dark: 0.26, shift: 20 });
  mat('skinD', '#b07a52', { dark: 0.22 });
  mat('bandage', '#d6cba8', { dark: 0.3, shift: 22 });
  mat('bandageD', '#a89c78', { dark: 0.24, shift: 22 });
  mat('amulet', '', { emit: true, ramp: emitRamp('#1a3a7a', '#3fa8ff', '#d0f0ff') });
  mat('stoneS', '#7a6a5a', { dark: 0.2, shift: 20 });
  mat('worm', '#b0705a', { dark: 0.22, shift: 20 });
  mat('wormD', '#7a4a3e', { dark: 0.18, shift: 20 });
  mat('obsid', '#2c2640', { spec: 0.5, dark: 0.14, shift: 20 });
  mat('lapis', '#2f55b0', { spec: 0.5 });
  mat('linen', '#e8e0c8', { dark: 0.28, shift: 20 });
  mat('goldB', '#f0c040', { spec: 0.8, shin: 16, light: 0.16 });
  mat('capeP', '#3a2a6a', { dark: 0.16 });

  // 모래 전갈: 머리 위로 휜 꼬리와 보랏빛 독침, 큰 집게
  M('scorpion', 'desert', 66, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 0.8), y = function (v) { return v + b; }, sw = wave(t) * 1.2;
    var tail = atk ? [[74, 42], [84, 30], [82, 18], [70, 10], [56, 10], [42, 15], [32, 24]] : [[74, 42], [84, 31], [85, 19], [78, 10], [66, 6], [56, 7], [49, 13 + sw]];
    var segs = chain(tail.map(function (q) { return [q[0], y(q[1])]; }), 5.6, 3.2, 'carapD', { g: 'tail' }).concat(tail.map(function (q, i) { var r = 7.4 - i * 0.55; return E(q[0], y(q[1]), r, r * 0.86, 'carap', { g: 'tail' }); }));
    var last = tail[tail.length - 1], prev = tail[tail.length - 2], dx = last[0] - prev[0], dy = last[1] - prev[1], dl = Math.sqrt(dx * dx + dy * dy);
    var tip = [last[0] + dx / dl * 9 - 1, last[1] + dy / dl * 9 + 3];
    var legs = [], near = [];
    for (var i = 0; i < 4; i++) {
      var sx = 46 + i * 9, back = i >= 2 ? 1 : -1;
      legs.push.apply(legs, leg(sx, y(48), sx + back * 6, y(40), sx + back * 11, 62, 2.1, 'carapD', 'lf' + i));
      near.push.apply(near, leg(sx + 3, y(50), sx + 3 + back * 6, y(42), sx + 3 + back * 11, 63, 2.5, 'carap', 'ln' + i));
    }
    var claw = atk ? [8, 46] : [14, 52], claw2 = atk ? [12, 36] : [18, 40];
    return { w: 98, h: 64, cx: 56, tipAttack: [tip[0], tip[1]], glow: [{ x: tip[0], y: y(tip[1]), r: 7, c: '#c04aff' }], parts: concat(
      legs,
      [C(38, y(47), claw2[0] + 6, y(claw2[1] + 1), 3, 2.6, 'carapD', { g: 'armB' }),
        E(claw2[0], y(claw2[1]), 7, 4.6, 'carapD', { rot: -0.2, g: 'armB' }),
        P([[claw2[0] - 8, y(claw2[1] - 1.2)], [claw2[0] + 1, y(claw2[1])], [claw2[0] - 8, y(claw2[1] + 1.8)]], 'cut')],
      [E(60, y(46), 22, 10, 'carap', { g: 'body' })],
      [50, 58, 66, 74].map(function (xx) { return C(xx, y(37.5), xx + 1, y(54.5), 0.6, 0.6, 'carapD', { line: false, ao: false }); }),
      segs,
      [C(last[0], y(last[1]), tip[0], y(tip[1]), 2.8, 0.6, 'claw', { g: 'sting' }),
        E(tip[0], y(tip[1]), 1.2, 1.2, 'stingG', { keep: true, line: false })],
      [E(36, y(47), 10, 8, 'carap', { g: 'head' }),
        E(31, y(42.5), 1.4, 1.1, 'eyeR', { keep: true, line: false }), E(35.5, y(41.5), 1.4, 1.1, 'eyeR', { keep: true, line: false }),
        C(28, y(52), 25, y(55), 1.2, 0.6, 'carapD'), C(31, y(53), 29, y(56), 1.2, 0.6, 'carapD')],
      near,
      [C(34, y(50), claw[0] + 7, y(claw[1]), 3.4, 3, 'carap', { g: 'armF' }),
        E(claw[0], y(claw[1]), 9, 5.6, 'carap', { rot: 0.1, g: 'armF' }),
        P([[claw[0] - 10, y(claw[1] - (atk ? 2.6 : 1.4))], [claw[0] + 1, y(claw[1])], [claw[0] - 10, y(claw[1] + (atk ? 2.8 : 1.8))]], 'cut')]
    ) };
  });

  // 선인장 괴물: 꽃을 피운 거대한 선인장, 성난 얼굴이 새겨져 있다
  M('cactus', 'desert', 78, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 0.7), y = function (v) { return v + b; };
    var needles = [];
    [[16, 22], [40, 24], [15, 40], [41, 44], [16, 58], [40, 62], [4, 38], [10, 30], [53, 30], [46, 22], [19, 70], [37, 72]].forEach(function (q) {
      needles.push(E(q[0], y(q[1]), 0.6, 0.6, 'needle', { keep: true, line: false, ao: false }));
    });
    var petals = [];
    for (var i = 0; i < 5; i++) { var a = i / 5 * TAU - 0.3; petals.push(E(28 + Math.cos(a) * 4, y(8) + Math.sin(a) * 2.6, 3.4, 2.2, 'bloom', { rot: a, g: 'bloom' })); }
    var arm = atk ? [C(18, y(44), 6, y(40), 5, 4.6, 'cactus', { g: 'armF' }), E(4, y(40), 4.8, 4.6, 'cactus', { g: 'armF' })] :
      [C(18, y(48), 8, y(48), 5, 5, 'cactus', { g: 'armF' }), C(8, y(48), 7, y(33), 5, 4.4, 'cactus', { g: 'armF' }), E(7, y(32), 4.4, 4.4, 'cactus', { g: 'armF' })];
    return { w: 58, h: 76, cx: 28, tipAttack: [3, 40], parts: concat(
      [E(29, 73, 25, 3.6, 'sandD', { g: 'base' }),
        C(40, y(42), 50, y(42), 4.6, 4.6, 'cactusD', { g: 'armB' }), C(50, y(42), 50, y(26), 4.6, 4, 'cactusD', { g: 'armB' }), E(50, y(25), 4, 4, 'cactusD', { g: 'armB' }),
        B(28, y(45), 12, 28, 2.2, 'cactus', { g: 'trunk' }), E(28, y(18), 12, 9, 'cactus', { g: 'trunk' })],
      [21, 28, 35].map(function (xx) { return C(xx, y(16), xx, y(70), 0.55, 0.55, 'cactusD', { line: false, ao: false }); }),
      [P([[18, y(26)], [26, y(29)], [25, y(31)], [18, y(29)]], 'mouthD', { bev: 0 }), P([[38, y(26)], [30, y(29)], [31, y(31)], [38, y(29)]], 'mouthD', { bev: 0 }),
        E(21.6, y(30), 2.6, 1.6, 'mouthD'), E(33.6, y(30), 2.6, 1.6, 'mouthD'),
        E(21.6, y(30), 1.6, 0.9, 'eyeY', { keep: true, line: false }), E(33.6, y(30), 1.6, 0.9, 'eyeY', { keep: true, line: false }),
        P([[17, y(37)], [39, y(37)], [36, y(43)], [32, y(40)], [28, y(44)], [24, y(40)], [20, y(43)]], 'mouthD', { bev: 0 })],
      fangs(19, 37, y(37), 6, 2, 1),
      needles, petals,
      [E(28, y(8), 2, 1.6, 'spot', { line: false })],
      arm
    ) };
  });

  // 사막 도적: 두건과 복면, 굽은 언월도
  M('bandit', 'desert', 68, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t), y = function (v) { return v + b; }, w = wave(t);
    var hand = atk ? [12, 38] : [16, 35];
    var blade = atk ? [[11, 38], [5, 43], [2, 50], [4, 57]] : [[15, 33], [10, 25], [9, 16], [13, 8]];
    return { w: 56, h: 66, cx: 28, tipAttack: blade[3], parts: concat([
      P([[30, y(24)], [40, y(24)], [47 + w, y(54)], [34, y(57)]], 'wrap', { g: 'cape', bev: 1.4 }),
      C(32, y(30), 38, y(40), 2.6, 2.4, 'skinD', { g: 'armB' }), E(39, y(41), 2.3, 2.3, 'skinD', { g: 'armB' }),
      C(31, 44, 34, 57, 4.2, 3.4, 'pantsS', { g: 'legB' }), B(34.5, 61, 4.4, 3, 3, 'wrap', { g: 'legB' }),
      C(25, 44, 20, 57, 4.4, 3.4, 'pantsS', { g: 'legF' }), B(19.5, 61, 4.8, 3, 3, 'wrap', { g: 'legF' }),
      B(28, y(36), 8.4, 9.5, 2.2, 'vest', { g: 'torso' }),
      B(28, y(44), 9, 2, 5, 'sash', { line: false }),
      P([[33, y(44)], [38, y(45)], [40 + w * 0.6, y(53)], [36, y(52)]], 'sash', { g: 'sashT', bev: 0.8 }),
      E(29, y(17), 9.5, 8.4, 'turban', { g: 'hd' }),
      P([[34, y(13)], [44, y(17)], [43 + w, y(30)], [36, y(22)]], 'turban', { g: 'hdT', bev: 1 }),
      B(25, y(22), 7.6, 5.2, 2.4, 'wrap', { g: 'mask' }),
      B(24, y(19.6), 6.6, 1.5, 4, 'skinD', { line: false, ao: false }),
      E(20.6, y(19.6), 1.5, 0.9, 'eyeY', { keep: true, line: false }), E(25.6, y(19.6), 1.3, 0.8, 'eyeY', { keep: true, line: false }),
      C(27, y(11), 34, y(10), 1, 1, 'goldB', { line: false })
    ], chain(blade, 1.7, 0.5, 'blade', { g: 'blade' }), [
      C(hand[0] - 1.6, y(hand[1] - 1.6), hand[0] + 1.6, y(hand[1] + 1.4), 0.9, 0.9, 'goldB', { g: 'guard' }),
      C(26, y(30), hand[0] + 1.5, y(hand[1]), 2.8, 2.4, 'skinD', { g: 'armF' }),
      E(hand[0], y(hand[1]), 2.5, 2.4, 'skinD', { g: 'armF' })
    ]) };
  });

  // 미라: 붕대 틈으로 푸른 눈빛, 가슴에 빛나는 부적
  M('mummy', 'desert', 76, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 0.9), y = function (v) { return v + b; }, w = wave(t), ax = atk ? -5 : 0;
    var lines = [];
    [[22, 34, 34, 37], [21, 40, 35, 44], [22, 47, 34, 50], [22, 12, 32, 14], [21, 19, 33, 22]].forEach(function (q) {
      lines.push(C(q[0], y(q[1]), q[2], y(q[3]), 0.6, 0.6, 'bandageD', { line: false, ao: false }));
    });
    return { w: 54, h: 74, cx: 28, tipAttack: [5 + ax, 36], glow: [{ x: 29, y: y(34), r: 7, c: '#3fa8ff' }, { x: 23, y: y(16), r: 5, c: '#3fd0ff' }], parts: concat([
      P([[33, y(28)], [36, y(28)], [39 + w * 1.5, y(52)], [36 + w, y(52)]], 'bandageD', { g: 'strip1', bev: 0.6 }),
      C(31, y(30), 14 + ax, y(31), 2.8, 2.4, 'bandageD', { g: 'armB' }), E(12 + ax, y(31.5), 2.6, 2.4, 'bandageD', { g: 'armB' }),
      C(31, 50, 33, 70, 3.6, 3.2, 'bandageD', { g: 'legB' }), E(33, 71, 4, 2, 'bandageD', { g: 'legB' }),
      C(25, 50, 23, 70, 3.8, 3.3, 'bandage', { g: 'legF' }), E(22, 71, 4.4, 2, 'bandage', { g: 'legF' }),
      B(28, y(40), 8.6, 12, 2, 'bandage', { g: 'torso' })
    ], lines, [
      C(22, y(32), 34, y(32), 0.7, 0.7, 'goldB', { line: false, ao: false }),
      E(29, y(34), 2.2, 2.6, 'amulet', { keep: true, line: false }),
      E(27, y(17), 7.6, 8.6, 'bandage', { g: 'head' }),
      E(23, y(16), 2.6, 1.7, 'mouthD'), E(23, y(16), 1.5, 0.9, 'eyeC', { keep: true, line: false }),
      C(21, y(23), 28, y(24), 0.9, 0.9, 'mouthD'),
      C(28, y(31), 10 + ax, y(34), 3, 2.6, 'bandage', { g: 'armF' }), E(8 + ax, y(34.5), 2.8, 2.6, 'bandage', { g: 'armF' }),
      P([[12 + ax, y(35)], [14 + ax, y(35)], [13 + ax + w * 1.2, y(44)], [11 + ax + w, y(44)]], 'bandage', { g: 'strip2', bev: 0.5 })
    ]) };
  });

  // 모래 정령: 회오리치는 모래 몸통과 바위 주먹
  M('sand_spirit', 'desert', 76, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1.4), y = function (v) { return v + b; };
    var rings = [];
    for (var i = 0; i < 7; i++) {
      var yy = 70 - i * 5.6, rx = 4 + i * 2.3;
      rings.push(E(32 + Math.sin(t * TAU * 2 + i) * 1.6, y(yy), rx, 2.8, i % 2 ? 'sandD' : 'sand', { g: 'vortex' }));
    }
    var dust = [];
    for (var j = 0; j < 7; j++) { var a = t * TAU + j * TAU / 7; dust.push(E(32 + Math.cos(a) * (18 + j % 3 * 3), y(46 + Math.sin(a) * 6 - j), 0.8, 0.8, j % 2 ? 'sand' : 'sandD', { keep: true, line: false, ao: false })); }
    var fist = atk ? [5, 26] : [10, 44];
    return { w: 64, h: 74, cx: 32, tipAttack: [5, 26], glow: [{ x: 30, y: y(14), r: 8, c: '#ffb040' }], parts: concat(
      rings,
      chain([[42, y(26)], [50, y(34)], [52, y(44)]], 4, 4.6, 'sandD', { g: 'armB' }), [E(53, y(47), 5.4, 5, 'stoneS', { g: 'armB' })],
      [E(32, y(27), 13, 11, 'sand', { g: 'body' }),
        E(26, y(30), 3, 2.4, 'stoneS', { line: false }), E(37, y(24), 2.4, 2, 'stoneS', { line: false }),
        E(30, y(14), 8.4, 7.4, 'sand', { g: 'head' }),
        P([[24, y(10)], [28, y(4)], [30, y(9)]], 'sandD', { g: 'hc', bev: 0.8 }), P([[31, y(8)], [36, y(2)], [37, y(10)]], 'sandD', { g: 'hc2', bev: 0.8 }),
        E(26, y(13), 2, 0.9, 'eyeY', { rot: 0.3, keep: true, line: false }), E(32, y(13), 2, 0.9, 'eyeY', { rot: -0.3, keep: true, line: false }),
        C(25, y(18), 31, y(18.5), 0.9, 0.9, 'eyeY', { line: false, emitLv: 3 })],
      chain([[22, y(26)], [14, y(34)], [fist[0] + 3, y(fist[1] - 3)]], 4.4, 4, 'sand', { g: 'armF' }),
      [E(fist[0], y(fist[1]), 6, 5.6, 'stoneS', { g: 'armF' })],
      dust
    ) };
  });

  // 거대 모래벌레(정예): 모래 언덕에서 솟아오른 몸통, 이빨이 둥글게 난 아가리
  M('sandworm', 'desert', 98, function (t, pose) {
    var atk = pose === 'attack', sw = wave(t) * 1.6;
    var pts = atk ? [[84, 92], [86, 74], [80, 60], [66, 50], [50, 46], [34, 48]] : [[84, 92], [87, 74], [82, 56], [70, 42], [54, 34], [38, 32 + sw]];
    var segs = [], bands = [];
    pts.forEach(function (q, i) {
      var r = 15 - i * 0.5;
      segs.push(E(q[0], q[1], r, r * 0.92, i % 2 ? 'wormD' : 'worm', { g: 'seg' + i }));
    });
    var hx = pts[pts.length - 1][0] - 4, hy = pts[pts.length - 1][1];
    var teeth = [];
    for (var k = 0; k < 12; k++) {
      var a = k / 12 * TAU, cx = hx - 2, rr = 10.5;
      var ox = cx + Math.cos(a) * rr, oy = hy + Math.sin(a) * rr * 1.08, ix = cx + Math.cos(a) * 5.5, iy = hy + Math.sin(a) * 5.8;
      var px = -Math.sin(a) * 1.6, py = Math.cos(a) * 1.6;
      teeth.push(P([[ox + px, oy + py], [ox - px, oy - py], [ix, iy]], 'tooth', { line: false, ao: false, bev: 0 }));
    }
    var rocks = [];
    for (var j = 0; j < 4; j++) { var ph = (t + j / 4) % 1; rocks.push(E(56 + j * 12 + ph * 6, 84 - ph * 20, 1.6, 1.4, 'sandD', { keep: true, ao: false })); }
    return { w: 104, h: 96, cx: 60, tipAttack: [hx - 10, hy], parts: concat(
      [E(66, 92, 40, 6, 'sandD', { g: 'dune' })],
      segs,
      pts.slice(0, -1).map(function (q, i) { var r = 14 - i * 0.5; return C(q[0] - r * 0.7, q[1] - r * 0.2, q[0] + r * 0.6, q[1] + r * 0.5, 0.7, 0.7, 'wormD', { line: false, ao: false }); }),
      [E(hx, hy, 15, 16, 'worm', { g: 'head' }),
        E(hx - 2, hy, 11.5, 12.5, 'maw', { g: 'maw' }),
        E(hx - 2.5, hy, 6, 6.5, 'mouthD', { g: 'throat' })],
      teeth,
      [E(68, 90, 30, 4, 'sand', { g: 'dune2' })],
      rocks
    ) };
  });

  // 파라오 세트(보스): 자칼 가면, 줄무늬 머리 장식, 황금 깃 장식, 와스 지팡이
  M('pharaoh', 'desert', 122, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1.2), y = function (v) { return v + b; }, w = wave(t);
    var staffX = atk ? 14 : 20, staffTop = atk ? 14 : 22;
    var glyphs = [];
    for (var i = 0; i < 4; i++) {
      var a = t * TAU + i * TAU / 4;
      glyphs.push(E(46 + Math.cos(a) * 34, y(54 + Math.sin(a) * 8), 1.6, 2.2, 'amulet', { keep: true, line: false, ao: false }));
    }
    return { w: 92, h: 120, cx: 48, tipAttack: [staffX, staffTop - 6], glow: [{ x: 40, y: y(21), r: 7, c: '#ffd040' }, { x: staffX, y: y(staffTop - 4), r: 8, c: '#3fa8ff' }], parts: concat(
      [P([[38, y(36)], [60, y(36)], [74 + w * 2, y(108)], [44, y(112)]], 'capeP', { g: 'cape', bev: 2 }),
        // 머리 장식 뒷자락
        P([[48, y(16)], [60, y(22)], [60, y(46)], [50, y(40)]], 'goldB', { g: 'nemes', bev: 1.4 }),
        C(51, y(24), 59, y(28), 1, 1, 'lapis', { line: false }), C(51, y(31), 59, y(35), 1, 1, 'lapis', { line: false }), C(51, y(38), 59, y(42), 1, 1, 'lapis', { line: false }),
        C(56, y(44), 64, y(70), 4.4, 3.6, 'obsid', { g: 'armB' }), E(64, y(72), 3.6, 3.6, 'obsid', { g: 'armB' }), C(58, y(56), 63, y(58), 1.4, 1.4, 'goldB', { line: false }),
        C(42, 86, 40, 114, 5, 4.4, 'obsid', { g: 'legB' }), B(38, 116, 6, 2.6, 3, 'goldB', { g: 'legB' }),
        C(52, 86, 56, 114, 5, 4.4, 'obsid', { g: 'legF' }), B(58, 116, 6.4, 2.6, 3, 'goldB', { g: 'legF' }),
        C(40, 108, 44, 108, 1.4, 1.4, 'goldB', { line: false }),
        P([[34, y(70)], [62, y(70)], [66, y(94)], [30, y(94)]], 'linen', { g: 'kilt', bev: 2 }),
        P([[44, y(72)], [52, y(72)], [50, y(94)], [46, y(94)]], 'goldB', { line: false, bev: 1 }),
        B(48, y(56), 14, 15, 2.4, 'obsid', { g: 'torso' }),
        B(48, y(70), 15, 2.2, 6, 'goldB', { line: false }),
        E(46, y(42), 17, 8, 'goldB', { g: 'collar' }),
        C(32, y(42), 60, y(42), 1, 1, 'lapis', { line: false, ao: false }), C(34, y(46), 58, y(46), 1, 1, 'lapis', { line: false, ao: false }),
        B(46, y(42), 13, 3, 3, 'cut'),
        // 자칼 머리
        P([[46, y(14)], [48, y(0.5)], [52, y(13)]], 'obsid', { g: 'ear', bev: 1 }), P([[40, y(14)], [41, y(2)], [45, y(13)]], 'obsid', { g: 'ear2', bev: 1 }),
        E(45, y(22), 9.6, 9, 'obsid', { g: 'head' }),
        P([[38, y(18)], [24, y(24)], [25, y(27)], [38, y(30)]], 'obsid', { g: 'head', bev: 1.6 }),
        C(26, y(25.5), 37, y(26.5), 0.6, 0.6, 'goldB', { line: false, ao: false }),
        E(25, y(24.4), 1.4, 1.2, 'nose', { keep: true }),
        B(46, y(15), 9.4, 2.4, 4, 'goldB', { g: 'band' }),
        E(39.5, y(20.5), 2.6, 1.1, 'eyeY', { rot: -0.2, keep: true, line: false }),
        C(36, y(20), 43, y(19), 0.5, 0.5, 'goldB', { line: false, ao: false })],
      // 와스 지팡이와 앞팔
      [C(staffX, y(staffTop), staffX + 2, 116, 1.4, 1.4, 'goldB', { g: 'staff' }),
        P([[staffX - 1, y(staffTop)], [staffX - 7, y(staffTop - 4)], [staffX - 5, y(staffTop - 6)], [staffX + 2, y(staffTop - 3)]], 'goldB', { g: 'staffH', bev: 0.8 }),
        C(staffX + 1, 114, staffX - 2, 119, 1, 0.6, 'goldB', { g: 'staff' }), C(staffX + 2, 114, staffX + 5, 119, 1, 0.6, 'goldB', { g: 'staff' }),
        C(36, y(46), staffX + 3, y(atk ? 48 : 58), 4.6, 3.8, 'obsid', { g: 'armF' }),
        C(31, y(52), 27, y(53), 1.6, 1.6, 'goldB', { line: false }),
        E(staffX + 1, y(atk ? 49 : 59), 3.6, 3.6, 'obsid', { g: 'armF' })],
      glyphs
    ) };
  });

  // =====================================================================
  // 얼어붙은 설원
  // =====================================================================
  mat('snowFur', '#e6eef6', { dark: 0.32, shift: 24 });
  mat('snowFurD', '#a9b9cc', { dark: 0.26, shift: 24 });
  mat('iceSkin', '#6f9cc4', { dark: 0.22 });
  mat('iceDeep', '#3f74b8', { spec: 0.7, shin: 16 });
  mat('frost', '', { emit: true, ramp: ['#0f3a5a', '#1f7ab3', '#4fc3ff', '#9fe6ff', '#e0f8ff', '#ffffff'] });
  mat('robeI', '#8ab4de', { dark: 0.26, shift: 20 });
  mat('robeID', '#4a6aa8', { dark: 0.2 });
  mat('skinP', '#dbe6f2', { dark: 0.24, shift: 20 });
  mat('furI', '#c4d6e6', { dark: 0.28, shift: 22 });
  mat('furID', '#8aa2bc', { dark: 0.22, shift: 22 });
  mat('furIL', '#e8f2fa', { dark: 0.3, shift: 22 });
  mat('frostCloak', '#b8d6ee', { dark: 0.3, shift: 22 });
  mat('frostCloakD', '#6f8fb8', { dark: 0.22 });
  mat('hairI', '#e2ecf8', { dark: 0.3, shift: 26 });

  // 눈토끼: 얼음뿔이 돋은 사나운 설원 토끼
  M('snow_rabbit', 'snow', 62, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1), y = function (v) { return v + b; }, hx = atk ? -6 : 0, w = wave(t);
    var spikes = [[40, 26], [47, 25], [54, 28]].map(function (q, i) { return P([[q[0] - 3, y(q[1] + 3)], [q[0] + 1, y(q[1] - 6 - i % 2 * 2)], [q[0] + 3, y(q[1] + 3)]], 'ice', { bev: 1, g: 'sp' + i }); });
    return { w: 66, h: 60, cx: 36, tipAttack: [6 + hx, 28], parts: concat(
      [E(40 + hx * 0.2, y(12) + w * 0.5, 11, 3.2, 'snowFurD', { rot: -0.4, g: 'earB' }),
        E(58, y(36), 4.6, 4.4, 'snowFur', { g: 'tail' }),
        B(46, 57.5, 10, 2.6, 3, 'snowFurD', { g: 'hindF' })],
      spikes,
      [E(40, y(38), 16, 13, 'snowFur', { rot: -0.3, g: 'body' }), E(48, y(46), 12, 10.5, 'snowFur', { g: 'hind' }),
        C(26, y(44), 24, 57, 2.8, 2.4, 'snowFurD', { g: 'fl1' }), E(23, 57.6, 3.4, 1.8, 'snowFurD', { g: 'fl1' }),
        C(31, y(46), 32, 57, 2.8, 2.4, 'snowFur', { g: 'fl2' }), E(31, 57.6, 3.4, 1.8, 'snowFur', { g: 'fl2' }),
        E(23 + hx, y(25), 10, 9, 'snowFur', { g: 'head' }),
        E(13 + hx, y(28), 5.4, 4.4, 'snowFur', { g: 'head' }),
        E(9 + hx, y(26.6), 1.3, 1.1, 'nose', { keep: true }),
        C(11 + hx, y(31.5), 13 + hx, y(36 + (atk ? 2 : 0)), 1.1, 0.5, 'tooth', { line: false }), C(14 + hx, y(31.5), 15.5 + hx, y(35.5 + (atk ? 2 : 0)), 1.1, 0.5, 'tooth', { line: false }),
        P([[22 + hx, y(17)], [19 + hx, y(4)], [25 + hx, y(13)], [28 + hx, y(3)], [27 + hx, y(16)]], 'ice', { g: 'horn', bev: 1 }),
        E(40 + hx * 0.4, y(15) + w * 0.6, 12, 3.4, 'snowFur', { rot: -0.3, g: 'earF' }),
        E(18 + hx, y(23), 2.4, 1.2, 'eyeR', { rot: -0.3, keep: true, line: false }),
        C(15 + hx, y(20.5), 21 + hx, y(21.5), 0.7, 0.7, 'snowFurD', { line: false, ao: false })]
    ) };
  });

  M('frost_wolf', 'snow', 62, wolf({ m: 'furI', d: 'furID', l: 'furIL', eye: 'eyeC', ice: true }));

  // 서리 정령: 얼음 해골 얼굴의 망령, 둘레를 도는 얼음 결정
  M('frost_spirit', 'snow', 72, function (t, pose) {
    var atk = pose === 'attack', b = wave(t) * 1.6, y = function (v) { return v + b; }, a0 = t * TAU, cl = atk ? -6 : 0;
    function shard(cx, cy, sz, g) {
      return [P([[cx, cy - sz * 1.6], [cx, cy + sz * 0.6], [cx - sz, cy]], 'ice', { nrm: [-0.6, -0.3, 0.75], bev: 0, g: g }),
        P([[cx, cy - sz * 1.6], [cx + sz, cy], [cx, cy + sz * 0.6]], 'ice', { nrm: [0.45, -0.15, 0.88], bev: 0, g: g })];
    }
    var back = [], front = [];
    for (var i = 0; i < 3; i++) {
      var ang = a0 + i * TAU / 3, sx = 30 + Math.cos(ang) * 24, sy = y(30) + Math.sin(ang) * 6;
      (Math.sin(ang) < 0 ? back : front).push.apply(Math.sin(ang) < 0 ? back : front, shard(sx, sy, 2.8, 'o' + i));
    }
    var tatters = [];
    for (var k = 0; k < 5; k++) tatters.push([20 + k * 5, y(60) + (k % 2 ? 4 : 0) + Math.sin(a0 + k) * 1.5]);
    var wisps = [];
    for (var j = 0; j < 3; j++) wisps.push(E(25 + j * 5 + Math.sin(a0 * 2 + j) * 1.5, y(64) + j % 2 * 3, 2.4 - j * 0.4, 1.8, 'frost', { emitLv: 2, line: false, ao: false }));
    return { w: 60, h: 70, cx: 30, tipAttack: [4 + cl, 34], glow: [{ x: 26, y: y(19), r: 10, c: '#4fc3ff' }], parts: concat(
      back, wisps,
      [P([[18, y(26)], [42, y(26)]].concat(tatters.slice().reverse().map(function (q, i) { return i % 2 ? [q[0] + 2.5, q[1] - 7] : q; })).concat([[16, y(52)]]), 'frostCloak', { g: 'cloak', bev: 2 }),
        C(38, y(30), 48, y(42), 2.6, 2, 'frostCloakD', { g: 'armB' }), P([[46, y(41)], [52, y(46)], [47, y(45)], [49, y(50)], [45, y(44)]], 'ice', { g: 'armB', bev: 0.5 }),
        E(30, y(30), 11, 11, 'frostCloak', { g: 'cloak' }),
        E(28, y(17), 10.4, 10, 'frostCloakD', { g: 'hood' }),
        E(25.5, y(17), 6.4, 6.2, 'mouthD', { g: 'void' }),
        E(25, y(18.5), 5.2, 5.6, 'bone', { g: 'skull' }),
        E(25, y(23.5), 3.4, 1.8, 'bone', { g: 'skull' }),
        E(22.8, y(18), 1.6, 1.4, 'mouthD'), E(27.6, y(18), 1.6, 1.4, 'mouthD'),
        E(22.8, y(18), 0.9, 0.8, 'eyeC', { keep: true, line: false }), E(27.6, y(18), 0.9, 0.8, 'eyeC', { keep: true, line: false }),
        C(22, y(22.6), 28, y(22.6), 0.6, 0.6, 'mouthD', { line: false }),
        E(29, y(10), 9, 4, 'frostCloakD', { rot: -0.2, g: 'hoodF' })],
      chain([[22, y(31)], [14 + cl * 0.5, y(36)], [8 + cl, y(34)]], 2.6, 1.8, 'frostCloakD', { g: 'armF' }),
      [P([[9 + cl, y(32)], [1 + cl, y(31)], [6 + cl, y(34)], [0 + cl, y(36)], [7 + cl, y(36.5)]], 'ice', { g: 'armF', bev: 0.5 })],
      shard(29, y(4), 3.4, 'c0'), shard(21, y(7), 2.4, 'c1'), shard(37, y(7), 2.4, 'c2'),
      front
    ) };
  });

  // 설인: 굽은 뿔과 긴 팔, 포효하는 아가리
  M('yeti', 'snow', 84, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1.4), y = function (v) { return v + b; };
    var fist = atk ? [12, 12] : [14, 70];
    var elbow = atk ? [18, 26] : [16, 52];
    var shag = [];
    [[54, 24], [60, 30], [64, 40], [34, 22]].forEach(function (q, i) { shag.push(P([[q[0] - 3, y(q[1])], [q[0] + 2, y(q[1] - 5)], [q[0] + 3, y(q[1] + 2)]], 'snowFur', { g: 'body', bev: 1 })); });
    return { w: 78, h: 82, cx: 42, tipAttack: [fist[0] - 4, fist[1]], parts: concat(
      chain([[54, y(36)], [62, y(52)], [64, y(66)]], 5.4, 4.4, 'snowFurD', { g: 'armB' }), [E(64, y(70), 6, 5.4, 'snowFurD', { g: 'armB' })],
      [C(46, 64, 50, 78, 6, 5, 'snowFurD', { g: 'legB' }), E(51, 79, 6.4, 2.4, 'iceSkin', { g: 'legB' }),
        C(34, 64, 32, 78, 6.4, 5.4, 'snowFur', { g: 'legF' }), E(30, 79, 7, 2.4, 'iceSkin', { g: 'legF' }),
        E(44, y(46), 21, 21, 'snowFur', { rot: -0.15, g: 'body' }),
        E(48, y(30), 17, 12, 'snowFur', { g: 'body' })],
      shag,
      chain([[30, y(26)], [33, y(18)], [40, y(15)], [44, y(20)]], 2.6, 1.1, 'claw', { g: 'hornB' }),
      [E(25, y(32), 11, 10, 'snowFur', { g: 'head' }),
        E(20, y(35), 7.6, 7, 'iceSkin', { g: 'face' }),
        B(20, y(30), 7.4, 2, 3, 'snowFurD', { rot: 0.15, g: 'brow' }),
        E(16.5, y(32), 1.8, 0.9, 'eyeC', { keep: true, line: false }), E(23, y(32.4), 1.6, 0.8, 'eyeC', { keep: true, line: false }),
        E(18, y(39), 5.6, atk ? 4.6 : 3.4, 'mouthD', { g: 'mouth' })],
      chain([[24, y(25)], [22, y(17)], [15, y(14)], [11, y(18)]], 2.8, 1.1, 'claw', { g: 'hornF' }),
      fangs(13, 23, y(36.2), 4, 2.4, 1), fangs(14, 22, y(41.6) + (atk ? 1.2 : 0), 3, 2, -1),
      chain([[30, y(38)], elbow.map(function (v, i) { return i ? y(v) : v; }), [fist[0] + 1, y(fist[1] - 4)]], 6, 4.6, 'snowFur', { g: 'armF' }),
      [E(fist[0], y(fist[1]), 7, 6.4, 'snowFur', { g: 'armF' }),
        C(fist[0] - 5, y(fist[1] + 3), fist[0] - 7, y(fist[1] + 6), 1, 0.5, 'claw', { line: false }), C(fist[0] - 2, y(fist[1] + 5), fist[0] - 3, y(fist[1] + 8), 1, 0.5, 'claw', { line: false })]
    ) };
  });

  // 얼음 마녀: 얼음 왕관과 결정 지팡이
  M('ice_witch', 'snow', 78, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t), y = function (v) { return v + b; }, w = wave(t);
    var top = atk ? [10, 12] : [14, 20], hand = atk ? [13, 30] : [16, 38];
    return { w: 58, h: 76, cx: 30, tipAttack: [top[0], top[1] - 6], glow: [{ x: top[0], y: y(top[1] - 5), r: 10, c: '#4fc3ff' }], parts: concat([
      P([[30, y(16)], [42, y(18)], [46 + w * 1.5, y(52)], [36, y(48)]], 'hairI', { g: 'hair', bev: 1.6 }),
      C(37, y(32), 42, y(44), 3, 3.6, 'robeID', { g: 'armB' }), E(42, y(46), 2.2, 2.2, 'skinP', { g: 'armB' }),
      P([[22, y(36)], [38, y(36)], [46, 74], [14, 74]], 'robeI', { g: 'robe', bev: 2.4 }),
      P([[26, y(40)], [34, y(40)], [36, 74], [24, 74]], 'robeID', { line: false, bev: 1.2 }),
      C(15, 73, 45, 73, 1.2, 1.2, 'ice', { line: false, ao: false }),
      B(30, y(36), 8, 7.6, 2.4, 'robeI', { g: 'robe' }),
      C(23, y(30), 37, y(30), 1.4, 1.4, 'ice', { g: 'collar' }),
      E(31, y(16), 8.4, 9, 'hairI', { g: 'hairF' }),
      E(27, y(19), 6.6, 7, 'skinP', { g: 'face' }),
      E(27, y(13), 8, 3.6, 'hairI', { rot: -0.2, g: 'bang' }),
      E(24.4, y(19), 1.9, 0.9, 'eyeC', { rot: -0.2, keep: true, line: false }), E(29, y(19.2), 1.6, 0.8, 'eyeC', { rot: 0.2, keep: true, line: false }),
      C(24.5, y(24), 27, y(24), 0.5, 0.5, 'iceDeep', { line: false, minS: 0 })
    ], facets(30, y(9), [[23, y(10)], [25, y(1)], [28, y(7)], [31, y(0)], [34, y(7)], [37, y(2)], [38, y(11)]], 'ice', 'crown', 0.5), [
      C(top[0] + 1, y(top[1]), top[0] + 4, 74, 1.1, 1.1, 'iceDeep', { g: 'staff' })
    ], facets(top[0], y(top[1] - 4), [[top[0] - 3.4, y(top[1] - 3)], [top[0], y(top[1] - 11)], [top[0] + 3.4, y(top[1] - 3)], [top[0], y(top[1] + 1)]], 'ice', 'cryst', 0.6), [
      E(top[0], y(top[1] - 4), 1.4, 1.8, 'frost', { line: false, keep: true }),
      C(24, y(32), hand[0] + 2, y(hand[1] - 1), 2.8, 3.2, 'robeI', { g: 'armF' }),
      E(hand[0], y(hand[1]), 2.3, 2.3, 'skinP', { g: 'armF' })
    ]) };
  });

  // 빙하 골렘(정예): 면이 나뉜 얼음 덩어리 몸, 빛나는 핵
  M('glacier_golem', 'snow', 98, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1), y = function (v) { return v + b; };
    var fx = atk ? -8 : 0, fy = atk ? -18 : 0;
    function chunk(cx, cy, pts, g) { return facets(cx, y(cy), pts.map(function (q) { return [q[0], y(q[1])]; }), 'ice', g, 0.6); }
    return { w: 98, h: 96, cx: 50, tipAttack: [10 + fx, 66 + fy], glow: [{ x: 48, y: y(52), r: 18, c: '#4fc3ff' }], parts: concat(
      chunk(70, 50, [[62, 38], [78, 40], [82, 56], [74, 66], [64, 58]], 'armB'),
      chunk(76, 72, [[70, 62], [82, 64], [84, 80], [74, 84], [68, 76]], 'armB'),
      chunk(40, 82, [[32, 72], [46, 72], [48, 92], [30, 92]], 'legB'),
      chunk(62, 82, [[54, 72], [68, 72], [70, 92], [52, 92]], 'legF'),
      chunk(50, 52, [[30, 32], [70, 28], [76, 56], [66, 78], [34, 80], [26, 56]], 'body'),
      [E(48, y(52), 6, 7, 'frost', { line: false, g: 'core' }),
        E(52, y(31), 14, 3, 'snowFur', { line: false, flat: 0.5 })],
      chunk(32, 26, [[22, 18], [38, 14], [44, 26], [36, 36], [24, 34]], 'head'),
      [E(26, y(25), 1.8, 1.1, 'eyeC', { keep: true, line: false }), E(34, y(24), 1.8, 1.1, 'eyeC', { keep: true, line: false }),
        E(32, y(15.5), 7, 2, 'snowFur', { line: false, flat: 0.5 })],
      chunk(26, 46, [[18, 36], [34, 36], [36, 52], [24, 58], [16, 50]], 'shF'),
      chunk(16 + fx * 0.5, 64 + fy * 0.5, [[10 + fx * 0.5, 54 + fy * 0.5], [24 + fx * 0.5, 56 + fy * 0.5], [24 + fx * 0.5, 70 + fy * 0.5], [12 + fx * 0.5, 72 + fy * 0.5]], 'armF'),
      chunk(14 + fx, 76 + fy, [[6 + fx, 68 + fy], [22 + fx, 68 + fy], [24 + fx, 82 + fy], [14 + fx, 88 + fy], [4 + fx, 82 + fy]], 'fist'),
      [E(23, y(37.5), 8, 2, 'snowFur', { line: false, flat: 0.5 })]
    ) };
  });

  // 서리 여왕(보스): 가시 왕관, 넓게 퍼진 얼음 드레스, 결정 홀
  M('frost_queen', 'snow', 124, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1.2), y = function (v) { return v + b; }, w = wave(t), a0 = t * TAU;
    var top = atk ? [14, 18] : [20, 30], hand = atk ? [17, 42] : [22, 52];
    var shards = [];
    for (var i = 0; i < 4; i++) {
      var a = a0 + i * TAU / 4, sx = 48 + Math.cos(a) * 40, sy = y(64 + Math.sin(a) * 10);
      shards = shards.concat(facets(sx, sy, [[sx - 2.4, sy], [sx, sy - 5], [sx + 2.4, sy], [sx, sy + 3]], 'ice', 'sh' + i, 0.6));
    }
    return { w: 96, h: 122, cx: 48, tipAttack: [top[0], top[1] - 8], glow: [{ x: top[0], y: y(top[1] - 6), r: 13, c: '#4fc3ff' }, { x: 40, y: y(30), r: 8, c: '#9fe6ff', k: 0.7 }], parts: concat([
      P([[40, y(40)], [60, y(40)], [82 + w * 2, y(112)], [50, 118]], 'robeID', { g: 'cape', bev: 2.4 }),
      P([[44, y(18)], [58, y(24)], [64 + w * 1.5, y(70)], [50, y(60)]], 'hairI', { g: 'hair', bev: 2 }),
      C(56, y(50), 64, y(70), 3.4, 4.4, 'robeID', { g: 'armB' }), E(65, y(73), 2.6, 2.6, 'skinP', { g: 'armB' }),
      P([[36, y(60)], [60, y(60)], [80, 120], [64, 116], [48, 121], [32, 116], [16, 120]], 'robeI', { g: 'gown', bev: 3 }),
      P([[42, y(64)], [54, y(64)], [60, 118], [36, 118]], 'robeID', { line: false, bev: 1.6 }),
      C(18, 119, 78, 119, 1.4, 1.4, 'ice', { line: false, ao: false }),
      B(48, y(52), 11, 12, 2.4, 'robeI', { g: 'gown' }),
      P([[40, y(42)], [56, y(42)], [52, y(60)], [44, y(60)]], 'iceDeep', { g: 'bodice', bev: 1.2 }),
      C(36, y(42), 60, y(42), 2, 2, 'ice', { g: 'collar' }),
      E(48, y(28), 11, 12, 'hairI', { g: 'hairF' }),
      E(43, y(30), 8.4, 9, 'skinP', { g: 'face' }),
      E(44, y(22), 10.4, 4.4, 'hairI', { rot: -0.2, g: 'bang' }),
      E(39.6, y(30), 2.4, 1, 'eyeC', { rot: -0.2, keep: true, line: false }), E(45.6, y(30.3), 2, 0.9, 'eyeC', { rot: 0.2, keep: true, line: false }),
      C(40, y(36.5), 43.5, y(36.5), 0.6, 0.6, 'iceDeep', { line: false })
    ], facets(46, y(15), [[33, y(18)], [35, y(6)], [39, y(13)], [42, y(1)], [46, y(11)], [50, y(0.5)], [53, y(11)], [57, y(4)], [59, y(18)]], 'ice', 'crown', 0.5), [
      C(top[0] + 1, y(top[1]), top[0] + 4, 118, 1.4, 1.4, 'iceDeep', { g: 'staff' })
    ], facets(top[0], y(top[1] - 6), [[top[0] - 4.6, y(top[1] - 5)], [top[0], y(top[1] - 16)], [top[0] + 4.6, y(top[1] - 5)], [top[0], y(top[1] + 1)]], 'ice', 'cryst', 0.6), [
      E(top[0], y(top[1] - 6), 1.8, 2.4, 'frost', { line: false, keep: true }),
      C(38, y(46), hand[0] + 2.6, y(hand[1] - 1.4), 3.6, 4.2, 'robeI', { g: 'armF' }),
      E(hand[0], y(hand[1]), 2.8, 2.8, 'skinP', { g: 'armF' })
    ], shards) };
  });

  // 박쥐 날개: 어깨(ox, oy)에서 손가락 끝(tips)까지 막을 펴고 뼈를 긋는다. 막 가장자리는 손가락 사이에서 안쪽으로 파인다
  function wing(ox, oy, tips, mem, bone, g, o) {
    var poly = [[ox, oy]];
    tips.forEach(function (q, i) {
      poly.push(q);
      var nx = tips[i + 1];
      if (nx) poly.push([(q[0] + nx[0]) / 2 * 0.72 + ox * 0.28, (q[1] + nx[1]) / 2 * 0.72 + oy * 0.28]);
    });
    var out = [P(poly, mem, Object.assign({ g: g, bev: 1.4 }, o))];
    tips.forEach(function (q) { out.push(C(ox, oy, q[0], q[1], 1.5, 0.5, bone, { g: g, line: false })); });
    return out;
  }
  // 깃털 하나(밑동 → 끝, 가운데가 넓은 마름모)
  function feather(ox, oy, ang, len, wid, m, o) {
    var dx = Math.cos(ang), dy = Math.sin(ang), px = -dy * wid, py = dx * wid;
    return P([[ox, oy], [ox + dx * len * 0.4 + px, oy + dy * len * 0.4 + py], [ox + dx * len, oy + dy * len], [ox + dx * len * 0.4 - px, oy + dy * len * 0.4 - py]], m, Object.assign({ bev: 1 }, o));
  }

  // =====================================================================
  // 용암 화산
  // =====================================================================
  mat('impSkin', '#b0302a', { dark: 0.22 });
  mat('impD', '#6e1c1e', { dark: 0.16 });
  mat('hornD', '#2e1e22', { spec: 0.4, dark: 0.12 });
  mat('batFur', '#4a2a2e', { dark: 0.16, shift: 20 });
  mat('batWing', '#7a2a22', { dark: 0.2 });
  mat('rock', '#6e605c', { dark: 0.22, shift: 20 });
  mat('rockD', '#4c4146', { dark: 0.18, shift: 20 });
  mat('lava', '', { emit: true, ramp: S.FIRE });
  mat('eyeF', '', { emit: true, ramp: ['#7a3a06', '#c96a0c', '#ffb02a', '#ffd84a', '#fff3a8', '#ffffff'] });
  mat('shRobe', '#5a2a22', { dark: 0.18 });
  mat('skinS', '#7a4a32', { dark: 0.2 });
  mat('plumeR', '#d8401a', { spec: 0.3, dark: 0.24 });
  mat('scale', '#8a2a1a', { spec: 0.5, shin: 12, dark: 0.2 });
  mat('scaleD', '#5a1a14', { spec: 0.4, dark: 0.14 });
  mat('belly', '#d8a050', { dark: 0.26 });
  mat('wingM', '#6a1f1a', { dark: 0.18 });

  // 불꽃 임프: 박쥐 날개와 꼬리 불꽃, 손 위의 화염구
  M('fire_imp', 'volcano', 64, function (t, pose) {
    var atk = pose === 'attack', b = wave(t) * 1.4, y = function (v) { return v + b; }, f = wave(t, 1) * 2;
    var ball = atk ? [8, 30] : [14, 18];
    return { w: 66, h: 62, cx: 33, tipAttack: ball, glow: [{ x: ball[0], y: y(ball[1]), r: 10, c: '#ff8a2a' }, { x: 60, y: y(16), r: 5, c: '#ff8a2a' }], parts: concat(
      wing(38, y(28), [[60, y(6) - f], [64, y(22) - f * 0.5], [58, y(36)], [46, y(40)]], 'impD', 'hornD', 'wB'),
      chain([[38, y(44)], [48, y(50)], [56, y(42)], [58, y(30)], [60, y(20)]], 2.2, 1, 'impD', { g: 'tail' }),
      [P([[57, y(20)], [60, y(10)], [63, y(20)]], 'lava', { emitLv: 4, line: false })],
      leg(34, 46, 38, 52, 35, 60, 2.6, 'impD', 'lgB'), leg(29, 46, 24, 52, 27, 60, 2.8, 'impSkin', 'lgF'),
      [E(35, 60.5, 3, 1.4, 'hornD', { g: 'lgB' }), E(27, 60.5, 3.2, 1.4, 'hornD', { g: 'lgF' }),
        E(32, y(38), 9, 10.5, 'impSkin', { g: 'body' }),
        C(37, y(32), 43, y(40), 2.4, 2, 'impD', { g: 'armB' }), E(44, y(41), 2.2, 2.2, 'impD', { g: 'armB' }),
        E(26, y(22), 8.4, 7.8, 'impSkin', { g: 'head' })],
      chain([[30, y(16)], [35, y(10)], [36, y(4)]], 2, 0.6, 'hornD', { g: 'hornB' }),
      chain([[23, y(16)], [22, y(9)], [18, y(4)]], 2.2, 0.6, 'hornD', { g: 'hornF' }),
      [P([[31, y(21)], [40, y(17)], [32, y(25)]], 'impSkin', { g: 'ear', bev: 0.8 }),
        E(21, y(21), 2.2, 1.1, 'eyeY', { rot: -0.3, keep: true, line: false }), E(27, y(21), 2, 1, 'eyeY', { rot: 0.3, keep: true, line: false }),
        C(18, y(26.5), 28, y(27.5), 1.4, 1.2, 'mouthD')],
      fangs(19, 27, y(26), 5, 1.8, 1),
      [C(25, y(33), ball[0] + 3, y(ball[1] + 3), 2.6, 2.2, 'impSkin', { g: 'armF' }), E(ball[0] + 2, y(ball[1] + 3), 2.4, 2.4, 'impSkin', { g: 'armF' }),
        E(ball[0], y(ball[1]), 4.6, 4.6, 'lava', { line: false, g: 'ball' })]
    ) };
  });

  M('lava_slime', 'volcano', 58, ooze({ body: 'lavaCrust', core: 'lavaGlow', inner: 'rockD', eye: 'eyeY', shine: 'eyeF', glow: '#ff6a2a' }));

  // 화염 박쥐: 활짝 편 날개 끝이 타오른다
  M('fire_bat', 'volcano', 66, function (t, pose) {
    var atk = pose === 'attack', f = wave(t) * 6, b = -wave(t) * 2, y = function (v) { return v + b; };
    var sweep = atk ? 10 : 0;
    var flames = [];
    [[8, 10], [5, 30], [15, 47], [96, 10], [99, 30], [89, 47]].forEach(function (q, i) {
      flames.push(E(q[0] + (i < 3 ? sweep : -sweep * 0.6), y(q[1]) - (q[1] < 20 ? f : f * 0.4), 2.6, 3.2, 'lava', { emitLv: 3 + (i % 2), line: false, ao: false }));
    });
    return { w: 104, h: 64, cx: 52, tipAttack: [44, 36], glow: [{ x: 10, y: y(12), r: 8, c: '#ff8a2a', k: 0.6 }, { x: 94, y: y(12), r: 8, c: '#ff8a2a', k: 0.6 }], parts: concat(
      wing(58, y(26), [[96 - sweep * 0.6, y(8) - f], [100 - sweep * 0.6, y(30) - f * 0.4], [90, y(48)], [68, y(46)]], 'scaleD', 'hornD', 'wR'),
      flames.slice(3),
      [E(52, y(32), 10, 13, 'batFur', { g: 'body' }),
        C(48, y(42), 45, y(52), 1.8, 1.2, 'batFur', { g: 'ftL' }), C(56, y(42), 58, y(52), 1.8, 1.2, 'batFur', { g: 'ftR' })],
      wing(46, y(26), [[8 + sweep, y(8) - f], [4 + sweep, y(30) - f * 0.4], [14 + sweep, y(48)], [36, y(46)]], 'batWing', 'hornD', 'wL'),
      flames.slice(0, 3),
      [P([[42, y(16)], [42, y(2)], [48, y(12)]], 'batFur', { g: 'earL', bev: 1 }), P([[56, y(12)], [62, y(2)], [62, y(16)]], 'batFur', { g: 'earR', bev: 1 }),
        E(52, y(18), 9, 7.6, 'batFur', { g: 'head' }),
        B(49, y(22), 5, 3, 2.4, 'batFur', { g: 'head' }),
        E(47, y(16), 2, 1.1, 'eyeY', { rot: -0.3, keep: true, line: false }), E(55, y(16), 2, 1.1, 'eyeY', { rot: 0.3, keep: true, line: false }),
        C(45, y(23.5), 54, y(23.5), 1.2, 1.2, 'mouthD')],
      fangs(45, 54, y(23), 4, 2.4, 1)
    ) };
  });

  // 마그마 골렘: 빛나는 균열과 떠다니는 바위
  M('magma_golem', 'volcano', 86, function (t, pose) {
    var atk = pose === 'attack', b = wave(t) * 0.8, y = function (v) { return v + b; }, f1 = Math.sin(t * TAU + 1) * 2, f2 = Math.cos(t * TAU) * 2;
    var fx = atk ? -6 : 0, fy = atk ? -14 : 0;
    var lava = function (x1, y1, x2, y2, r) { return C(x1, y(y1), x2, y(y2), r || 0.9, (r || 0.9) * 0.75, 'lava', { line: false, ao: false, emitLv: 4 }); };
    return { w: 84, h: 96, cx: 44, tipAttack: [8 + fx, 70 + fy], glow: [{ x: 43, y: y(51), r: 30, c: '#ff6a2a' }, { x: 29, y: y(26.5), r: 11, c: '#ffb040' }], parts: [
      E(74 + f2 * 0.5, y(22) + f1, 4, 3.4, 'rock', { g: 'r1' }),
      E(60, y(40), 10, 9, 'rockD', { g: 'shB' }),
      C(62, y(47), 66, y(66), 7, 8, 'rockD', { g: 'armB' }),
      E(66, y(72), 9, 8, 'rockD', { g: 'armB' }),
      C(52, y(72), 55, 88, 8, 8.5, 'rockD', { g: 'legB' }),
      B(57, 91, 11, 4.6, 3, 'rockD', { g: 'legB' }),
      C(33, y(72), 29, 88, 8, 8.5, 'rock', { g: 'legF' }),
      B(27, 91, 11.5, 4.6, 3, 'rock', { g: 'legF' }),
      lava(31, 80, 27, 86, 0.7),
      P([[50, y(35)], [56, y(23)], [61, y(34)]], 'rockD', { g: 'spk', bev: 1.4 }),
      E(45, y(53), 22, 20, 'rock', { g: 'torso' }),
      lava(43, 51, 30, 44), lava(43, 51, 52, 64), lava(43, 51, 57, 42), lava(52, 64, 58, 69, 0.7), lava(30, 44, 27, 47, 0.6),
      E(43, y(51), 5.6, 5.6, 'lava', { line: false, ao: false }),
      E(31, y(27), 10.5, 9.5, 'rock', { g: 'head' }),
      B(29, y(22), 10.5, 3, 3, 'rockD', { g: 'brow', rot: 0.12 }),
      E(29.5, y(33.5), 7.5, 4, 'rockD', { g: 'jaw' }),
      E(25, y(26.5), 2.1, 1.3, 'eyeF', { keep: true, line: false, emitLv: 4 }),
      E(33, y(26), 2.1, 1.3, 'eyeF', { keep: true, line: false, emitLv: 4 }),
      E(26, y(41), 11, 10, 'rock', { g: 'shF' }),
      P([[17, y(37)], [21, y(26)], [28, y(33)]], 'rock', { g: 'spk2', bev: 1.4 }),
      C(24, y(47), 18 + fx * 0.5, y(62 + fy * 0.6), 7.5, 8, 'rock', { g: 'armF' }),
      E(16 + fx, y(70 + fy), 10, 9, 'rock', { g: 'armF' }),
      lava(10 + fx, 66 + fy, 15 + fx, 71 + fy, 0.7),
      E(8 + f2 * 0.4, y(46) - f1, 2.8, 2.4, 'rock', { g: 'r2' })
    ] };
  });

  // 불의 주술사: 해골 가면과 깃털 장식, 불타는 해골 지팡이
  M('fire_shaman', 'volcano', 76, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t), y = function (v) { return v + b; }, w = wave(t);
    var top = atk ? [10, 14] : [14, 20], hand = atk ? [13, 32] : [16, 38];
    var plumes = [];
    for (var i = 0; i < 5; i++) plumes.push(feather(30, y(14), -2.2 + i * 0.32, 15 - Math.abs(i - 2) * 1.6, 2.2, i % 2 ? 'goldB' : 'bloom', { g: 'plume' + i }));
    return { w: 58, h: 74, cx: 30, tipAttack: [top[0], top[1] - 8], glow: [{ x: top[0], y: y(top[1] - 6), r: 11, c: '#ff8a2a' }], parts: concat(
      plumes,
      [P([[22, y(28)], [40, y(28)], [46 + w, y(66)], [16, y(66)]], 'shRobe', { g: 'robe', bev: 2 }),
        C(36, y(32), 42, y(42), 2.4, 2, 'skinS', { g: 'armB' }), E(43, y(43), 2.2, 2.2, 'skinS', { g: 'armB' }),
        E(43, y(39), 1, 1, 'lava', { keep: true, line: false }),
        C(24, 64, 23, 72, 2.2, 2, 'skinS', { g: 'lgF' }), C(34, 64, 36, 72, 2.2, 2, 'skinS', { g: 'lgB' }),
        B(30, y(34), 8, 7, 2.2, 'shRobe', { g: 'robe' })],
      fangs(23, 37, y(30), 6, 2.2, 1, { line: false }),
      [E(29, y(18), 8, 8.4, 'bone', { g: 'mask' }),
        E(25.6, y(17), 2.4, 2.2, 'mouthD'), E(31.4, y(17), 2.4, 2.2, 'mouthD'),
        E(25.6, y(17), 1.3, 1, 'eyeY', { keep: true, line: false }), E(31.4, y(17), 1.3, 1, 'eyeY', { keep: true, line: false }),
        E(28.5, y(21.4), 1, 1.2, 'mouthD'),
        B(28.5, y(25), 5.6, 2, 3, 'bone', { g: 'jaw' }),
        C(25, y(25), 32, y(25), 0.5, 0.5, 'mouthD', { line: false, ao: false }),
        C(top[0] + 1, y(top[1]), top[0] + 3, 72, 1.2, 1.2, 'wood', { g: 'staff' }),
        E(top[0], y(top[1] - 1), 3.4, 3.2, 'bone', { g: 'skullT' }),
        E(top[0] - 1, y(top[1] - 1.4), 0.9, 0.9, 'mouthD', { keep: true }), E(top[0] + 1.4, y(top[1] - 1.4), 0.9, 0.9, 'mouthD', { keep: true }),
        P([[top[0] - 3, y(top[1] - 3)], [top[0] - 1 + w, y(top[1] - 12)], [top[0] + 1, y(top[1] - 7)], [top[0] + 3 - w * 0.5, y(top[1] - 11)], [top[0] + 3.4, y(top[1] - 3)]], 'lava', { emitLv: 3, line: false }),
        C(24, y(30), hand[0] + 2, y(hand[1] - 1), 2.6, 2.2, 'skinS', { g: 'armF' }),
        E(hand[0], y(hand[1]), 2.3, 2.3, 'skinS', { g: 'armF' })]
    ) };
  });

  // 불사조(정예): 불꽃 깃털 날개와 긴 꼬리 깃
  M('phoenix', 'volcano', 100, function (t, pose) {
    var atk = pose === 'attack', b = wave(t) * 2.4, y = function (v) { return v + b; }, f = wave(t, 0.6) * 0.12;
    var back = [], front = [], tail = [];
    var lift = atk ? 0.35 : 0;
    for (var i = 0; i < 6; i++) back.push(feather(66, y(44), -0.55 - i * 0.2 + f, 38 - i * 2, 4, 'lava', { emitLv: 2, line: false, g: 'wB' }));
    for (var j = 0; j < 7; j++) front.push(feather(58, y(46), -0.95 - j * 0.22 + f - lift, 46 - j * 2.6, 4.8, 'lava', { emitLv: 3 + (j % 2), line: false, g: 'wF' }));
    for (var c = 0; c < 4; c++) front.push(feather(58, y(46), -1.05 - c * 0.3 + f - lift, 18, 3.4, 'plumeR', { g: 'wC' }));
    [[96, 78], [104, 88], [92, 95]].forEach(function (q, k) {
      tail.push.apply(tail, chain([[64, y(60)], [76 + k * 2, y(68 + k * 6)], [q[0], y(q[1]) + wave(t, k) * 2]], 3.2 - k * 0.5, 1, 'lava', { emitLv: 2 + k, line: false, g: 'tail' + k }));
      tail.push(feather(q[0] - 4, y(q[1] - 2), 0.5 + k * 0.3, 10, 3, 'lava', { emitLv: 4, line: false, g: 'tail' + k }));
    });
    return { w: 110, h: 98, cx: 56, tipAttack: [22, 38], glow: [{ x: 50, y: y(46), r: 34, c: '#ff6a2a', k: 0.9 }], parts: concat(
      back, tail,
      [E(58, y(54), 15, 17, 'plumeR', { rot: 0.5, g: 'body' }),
        E(52, y(60), 9, 10, 'lava', { emitLv: 3, line: false, ao: false })],
      chain([[52, y(44)], [42, y(34)], [34, y(30)]], 6.4, 4.8, 'plumeR', { g: 'neck' }),
      [0, 1, 2].map(function (q) { return feather(34, y(24), -1.5 - q * 0.42, 14 - q * 2, 2, 'lava', { emitLv: 4, line: false, g: 'crest' }); }),
      [E(30, y(28), 8, 7, 'plumeR', { g: 'head' }),
        P([[24, y(25)], [12, y(30)], [24, y(32)]], 'goldB', { g: 'beak', bev: 0.8 }),
        E(27, y(27), 2, 1.1, 'eyeY', { rot: -0.2, keep: true, line: false })],
      front
    ) };
  });

  // 화룡 이그니스(보스): 뿔, 큰 날개, 불을 머금은 아가리
  M('ignis', 'volcano', 126, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1.4), y = function (v) { return v + b; }, f = wave(t) * 2;
    var hx = atk ? -8 : 0, hy = atk ? 10 : 0, jaw = atk ? 0.5 : 0.2;
    var spikes = [];
    [[58, 56], [52, 46], [48, 36], [76, 60], [90, 62]].forEach(function (q, i) { spikes.push(P([[q[0] - 3, y(q[1] + 2)], [q[0] + 2, y(q[1] - 7)], [q[0] + 4, y(q[1] + 2)]], 'bone', { g: 'spk' + i, bev: 0.8 })); });
    var breath = atk ? [P([[10 + hx, y(42 + hy)], [-2, y(30 + hy)], [-2, y(56 + hy)]], 'lava', { emitLv: 4, line: false, ao: false })] : [];
    return { w: 136, h: 124, cx: 72, tipAttack: [2, 44 + hy], glow: [{ x: 18 + hx, y: y(42 + hy), r: atk ? 20 : 10, c: '#ff8a2a' }], parts: concat(
      wing(84, y(56), [[118, y(6) - f], [134, y(30) - f], [130, y(58)], [112, y(70)], [96, y(72)]], 'scaleD', 'scaleD', 'wB'),
      chain([[96, y(92)], [114, y(104)], [128, 112], [134, 100]], 9, 3, 'scaleD', { g: 'tail' }),
      [P([[132, 98], [136, 92], [134, 104]], 'bone', { g: 'tailS', bev: 0.6 })],
      leg(92, y(92), 100, y(104), 96, 120, 7, 'scaleD', 'lgB'), [E(95, 120.5, 7, 2.6, 'scaleD', { g: 'lgB' })],
      [E(80, y(80), 31, 23, 'scale', { rot: -0.2, g: 'body' }),
        E(66, y(90), 18, 12, 'belly', { rot: -0.3, g: 'belly' }),
        C(56, y(84), 76, y(96), 0.6, 0.6, 'scaleD', { line: false, ao: false }), C(60, y(80), 80, y(92), 0.6, 0.6, 'scaleD', { line: false, ao: false })],
      chain([[62, y(70)], [50, y(56)], [42 + hx * 0.4, y(44 + hy * 0.4)], [36 + hx * 0.7, y(38 + hy * 0.7)]], 11, 8, 'scale', { g: 'neck' }),
      spikes,
      chain([[38 + hx, y(28 + hy)], [48 + hx, y(14 + hy)], [58 + hx, y(10 + hy)]], 3.4, 1, 'bone', { g: 'hornB' }),
      [E(30 + hx, y(34 + hy), 13, 10, 'scale', { g: 'head' }),
        B(16 + hx, y(37 + hy), 10, 5.4, 2.4, 'scale', { rot: 0.1, g: 'head' }),
        B(18 + hx, y(45 + hy) + jaw * 6, 10, 3, 3, 'scaleD', { rot: jaw, g: 'jaw' }),
        E(16 + hx, y(42 + hy), 7, 2.6, 'lava', { emitLv: 3, line: false, ao: false })],
      fangs(8 + hx, 22 + hx, y(41 + hy), 5, 2.6, 1),
      [E(8 + hx, y(34 + hy), 1.4, 1.1, 'nose', { keep: true }),
        B(28 + hx, y(28 + hy), 8, 2.2, 3, 'scaleD', { rot: 0.2, g: 'brow' }),
        E(26 + hx, y(31 + hy), 2.6, 1.1, 'eyeY', { rot: -0.2, keep: true, line: false })],
      chain([[32 + hx, y(26 + hy)], [40 + hx, y(10 + hy)], [50 + hx, y(4 + hy)]], 3.8, 1, 'bone', { g: 'hornF' }),
      breath,
      wing(70, y(58), [[86, y(4) - f], [104, y(18) - f], [108, y(44)], [94, y(58)]], 'wingM', 'scale', 'wF'),
      leg(60, y(92), 50, y(102), 52, 120, 7.4, 'scale', 'lgF'),
      [E(49, 120.5, 7.6, 2.6, 'scale', { g: 'lgF' })],
      fangs(43, 55, 122, 3, 2.4, -1)
    ) };
  });

  // =====================================================================
  // 청운문(옛 마왕성) — 사람 모양 몬스터는 js/sprites-murim.js
  // =====================================================================
  mat('voidRobe', '#2c2046', { dark: 0.14, shift: 20 });
  mat('voidRobeL', '#43306a', { dark: 0.18, shift: 20 });
  mat('stoneG', '#6e6c7c', { dark: 0.22, shift: 20 });
  mat('stoneGD', '#4a4858', { dark: 0.18, shift: 20 });
  mat('capeV', '#221828', { dark: 0.12, shift: 20 });
  mat('capeR', '#8a1a2a', { dark: 0.18 });
  mat('darkCloth', '#2a2436', { dark: 0.14, shift: 20 });
  mat('skinV', '#d6cede', { dark: 0.26, shift: 22 });
  mat('hairV', '#1e1826', { spec: 0.4, dark: 0.12 });
  mat('armorC', '#5c5c6e', { spec: 0.6, shin: 12, dark: 0.2 });
  mat('armorK', '#2e2e40', { spec: 0.6, shin: 12, dark: 0.14 });
  mat('steelK', '#8a90a8', { spec: 0.8, shin: 16, dark: 0.28 });
  mat('armorB', '#4a1a26', { spec: 0.6, shin: 12, dark: 0.16 });
  mat('skinA', '#5a2a6a', { dark: 0.18 });
  mat('wingA', '#33183c', { dark: 0.14 });

  // skeleton 는 js/sprites-murim.js(15단계 무림 몬스터)

  // dark_mage 는 js/sprites-murim.js(15단계 무림 몬스터)

  // 가고일: 웅크린 돌 악마, 펼친 날개와 갈고리 발톱
  M('gargoyle', 'castle', 78, function (t, pose) {
    var atk = pose === 'attack', f = wave(t) * 2, b = S.bob(t, 0.6), y = function (v) { return v + b; };
    var claw = atk ? [10, 40] : [18, 60];
    return { w: 86, h: 76, cx: 44, tipAttack: [6, 40], glow: [{ x: 26, y: y(26), r: 6, c: '#ff3a3a', k: 0.8 }], parts: concat(
      wing(50, y(30), [[70, y(2) - f], [84, y(18) - f], [82, y(40)], [68, y(46)]], 'stoneGD', 'stoneGD', 'wB'),
      chain([[56, y(58)], [68, y(66)], [78, y(62)], [82, y(54)]], 2.6, 1.2, 'stoneGD', { g: 'tail' }),
      [P([[80, y(56)], [86, y(50)], [84, y(58)]], 'stoneGD', { g: 'tailT', bev: 0.6 })],
      leg(52, y(54), 60, y(62), 56, 72, 4.4, 'stoneGD', 'lgB'), [E(55, 72.6, 4.6, 1.8, 'stoneGD', { g: 'lgB' })],
      [E(44, y(46), 14, 14, 'stoneG', { rot: -0.4, g: 'body' }),
        C(36, y(40), 48, y(54), 0.6, 0.6, 'stoneGD', { line: false, ao: false })],
      leg(42, y(56), 34, y(62), 38, 72, 4.8, 'stoneG', 'lgF'), [E(36, 72.6, 5, 1.8, 'stoneG', { g: 'lgF' })],
      fangs(31, 41, 73.6, 3, 2, -1),
      chain([[34, y(20)], [38, y(10)], [46, y(8)]], 2.4, 0.8, 'stoneGD', { g: 'hornB' }),
      [E(28, y(26), 9.6, 8.6, 'stoneG', { g: 'head' }),
        B(18, y(30), 6, 3.6, 2.4, 'stoneG', { g: 'head' }),
        B(26, y(22), 7, 1.8, 3, 'stoneGD', { rot: 0.2, g: 'brow' }),
        E(23, y(25), 2, 1, 'eyeR', { rot: -0.25, keep: true, line: false }), E(29, y(25), 1.8, 0.9, 'eyeR', { rot: 0.25, keep: true, line: false }),
        C(14, y(33), 24, y(34), 1.2, 1.2, 'mouthD')],
      fangs(14, 23, y(32.6), 4, 2, 1),
      chain([[30, y(18)], [30, y(8)], [24, y(4)]], 2.6, 0.8, 'stoneGD', { g: 'hornF' }),
      wing(46, y(34), [[56, y(0) - f], [70, y(12) - f], [70, y(30)], [58, y(40)]], 'stoneG', 'stoneGD', 'wF'),
      chain([[34, y(40)], [24, y(48)], [claw[0] + 2, y(claw[1] - 3)]], 3.6, 2.6, 'stoneG', { g: 'armF' }),
      [E(claw[0], y(claw[1]), 3.4, 3, 'stoneG', { g: 'armF' }),
        C(claw[0] - 2, y(claw[1] + 2), claw[0] - 5, y(claw[1] + 5), 1, 0.4, 'claw', { line: false }), C(claw[0] + 1, y(claw[1] + 2.4), claw[0], y(claw[1] + 6), 1, 0.4, 'claw', { line: false })]
    ) };
  });

  // 흡혈귀: 높은 깃의 망토, 창백한 얼굴, 붉은 눈과 긴 손톱
  M('vampire', 'castle', 78, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t), y = function (v) { return v + b; }, w = wave(t);
    var hand = atk ? [8, 30] : [14, 38];
    return { w: 64, h: 76, cx: 32, tipAttack: [3, 28], glow: [{ x: 25, y: y(18), r: 5, c: '#ff3a3a', k: 0.8 }], parts: concat([
      P([[22, y(16)], [44, y(16)], [56 + w * 2, y(70)], [10, y(70)]], 'capeV', { g: 'cape', bev: 2 }),
      P([[26, y(22)], [42, y(22)], [50 + w * 2, y(68)], [16, y(68)]], 'capeR', { g: 'capeIn', bev: 1.4, line: false }),
      P([[22, y(20)], [24, y(4)], [30, y(14)]], 'capeV', { g: 'collar', bev: 1 }), P([[36, y(14)], [42, y(3)], [44, y(20)]], 'capeV', { g: 'collar', bev: 1 }),
      C(37, y(32), 42, y(44), 2.6, 2.4, 'darkCloth', { g: 'armB' }), E(43, y(46), 2, 2, 'skinV', { g: 'armB' }),
      C(30, 50, 33, 70, 3, 2.6, 'darkCloth', { g: 'lgB' }), B(34, 72, 4, 2.2, 3, 'hairV', { g: 'lgB' }),
      C(26, 50, 22, 70, 3.2, 2.8, 'darkCloth', { g: 'lgF' }), B(21, 72, 4.4, 2.2, 3, 'hairV', { g: 'lgF' }),
      B(30, y(38), 8, 12, 2.2, 'darkCloth', { g: 'torso' }),
      P([[26, y(28)], [34, y(28)], [32, y(44)], [28, y(44)]], 'capeR', { line: false, bev: 0.8 }),
      P([[27, y(26)], [33, y(26)], [30, y(34)]], 'linen', { line: false, bev: 0.6 }),
      E(28, y(17), 7.4, 8.4, 'skinV', { g: 'face' }),
      P([[34, y(16)], [40, y(12)], [35, y(20)]], 'skinV', { g: 'ear', bev: 0.6 }),
      P([[20, y(14)], [28, y(6)], [37, y(10)], [36, y(18)], [30, y(13)], [26, y(16)]], 'hairV', { g: 'hair', bev: 1.2 }),
      E(24.4, y(17.6), 1.8, 0.9, 'eyeR', { rot: -0.25, keep: true, line: false }), E(29.6, y(17.8), 1.5, 0.8, 'eyeR', { rot: 0.25, keep: true, line: false }),
      C(24, y(23), 29, y(23), 0.5, 0.5, 'mouthD', { line: false }),
      C(24.6, y(23), 24.8, y(25), 0.6, 0.3, 'tooth', { line: false, keep: true }), C(28.4, y(23), 28.2, y(25), 0.6, 0.3, 'tooth', { line: false, keep: true }),
      C(24, y(32), hand[0] + 2, y(hand[1]), 2.6, 2.4, 'darkCloth', { g: 'armF' }),
      E(hand[0], y(hand[1]), 2.2, 2.2, 'skinV', { g: 'armF' }),
      C(hand[0] - 1, y(hand[1] - 1), hand[0] - 5, y(hand[1] - 3), 0.7, 0.3, 'claw', { line: false }),
      C(hand[0] - 1, y(hand[1] + 0.6), hand[0] - 5.4, y(hand[1] + 0.4), 0.7, 0.3, 'claw', { line: false }),
      C(hand[0] - 0.6, y(hand[1] + 1.8), hand[0] - 4.4, y(hand[1] + 3.6), 0.7, 0.3, 'claw', { line: false })
    ]) };
  });

  // cursed_armor 는 js/sprites-murim.js(15단계 무림 몬스터)

  // 죽음의 기사(정예): 뿔 투구에 푸른 불꽃 눈, 해골 어깨, 들쭉날쭉한 대검
  M('death_knight', 'castle', 100, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1), y = function (v) { return v + b; }, w = wave(t);
    var hand = atk ? [16, 40] : [20, 50], tip = atk ? [2, 8] : [6, 18];
    var hem = [];
    for (var k = 0; k <= 5; k++) hem.push([72 - k * 6, y(92) - (k % 2) * 6 + (k % 2 ? w : 0)]);
    return { w: 88, h: 98, cx: 44, tipAttack: tip, glow: [{ x: 32, y: y(22), r: 9, c: '#3fd0ff' }], parts: concat([
      P([[38, y(30)], [58, y(30)]].concat(hem), 'capeV', { g: 'cape', bev: 2 }),
      E(56, y(36), 9, 7.6, 'armorK', { g: 'paulB' }),
      C(56, y(40), 62, y(58), 4.2, 3.6, 'armorK', { g: 'armB' }),
      C(50, 68, 54, 94, 5.2, 4.6, 'armorK', { g: 'lgB' }), B(55, 95, 6.6, 2.6, 3, 'armorK', { g: 'lgB' }),
      C(38, 68, 34, 94, 5.6, 5, 'armorK', { g: 'lgF' }), B(33, 95, 7, 2.6, 3, 'armorK', { g: 'lgF' }),
      P([[33, 78], [30, 74], [36, 76]], 'bone', { g: 'kneeS', bev: 0 }),
      B(44, y(64), 13, 6, 2.4, 'armorK', { g: 'tas' }),
      B(44, y(48), 14, 14, 2.2, 'armorK', { g: 'torso' }),
      E(43, y(46), 4, 4.2, 'bone', { line: false }), E(41.6, y(45.4), 1.1, 1.1, 'mouthD', { keep: true }), E(44.6, y(45.4), 1.1, 1.1, 'mouthD', { keep: true }),
      B(36, y(22), 9, 10, 2.6, 'armorK', { g: 'helm' }),
      chain([[40, y(16)], [48, y(8)], [52, y(0.5)]], 2.6, 0.8, 'bone', { g: 'hornB' }),
      chain([[30, y(16)], [26, y(8)], [20, y(4)]], 2.6, 0.8, 'bone', { g: 'hornF' }),
      B(31, y(23), 6, 1.4, 5, 'mouthD'),
      E(29, y(23), 1.8, 0.9, 'eyeC', { keep: true, line: false }), E(34, y(23), 1.6, 0.8, 'eyeC', { keep: true, line: false }),
      P([[27, y(21)], [29, y(13) - w], [31, y(21)]], 'frost', { emitLv: 3, line: false, ao: false }),
      P([[32, y(21)], [34, y(14) + w], [36, y(21)]], 'frost', { emitLv: 2, line: false, ao: false }),
      E(30, y(36), 9.6, 8, 'armorK', { g: 'paulF' }),
      E(29, y(33), 4.4, 4, 'bone', { g: 'skullP' }), E(27.6, y(32.6), 1.1, 1.1, 'mouthD', { keep: true }), E(30.6, y(32.6), 1.1, 1.1, 'mouthD', { keep: true }),
      P([[24, y(30)], [22, y(24)], [27, y(29)]], 'bone', { g: 'spkP', bev: 0 }),
      L(hand[0], y(hand[1]), tip[0], y(tip[1]), 3.4, 'steelK', { taper: 0.8 }),
      C(hand[0] + (tip[0] - hand[0]) * 0.15, y(hand[1] + (tip[1] - hand[1]) * 0.15), hand[0] + (tip[0] - hand[0]) * 0.75, y(hand[1] + (tip[1] - hand[1]) * 0.75), 0.6, 0.6, 'frost', { emitLv: 3, line: false, ao: false }),
      C(hand[0] - 5, y(hand[1] + 1), hand[0] + 5, y(hand[1] - 1), 1.4, 1.4, 'bone', { g: 'guard' }),
      C(30, y(42), hand[0] + 2, y(hand[1] + 2), 3.8, 3.4, 'armorK', { g: 'armF' }),
      E(hand[0] + 1, y(hand[1] + 2), 3.2, 3, 'armorK', { g: 'armF' })
    ]) };
  });

  // baltar 는 js/sprites-murim.js(15단계 무림 몬스터)

  // astaroth 는 js/sprites-murim.js(15단계 무림 몬스터)
})();
