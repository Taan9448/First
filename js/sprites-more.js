// sprites-more.js — 28단계 몬스터 15종의 도형 도트 그림(js/pixel-render.js). 몬스터는 왼쪽(영웅 쪽)을 본다
// 테마마다 일반 2 · 정예 1: 천족오공 · 흑풍채 자객 · 독룡 이무기 / 황금 스카라브 · 사막 궁수 · 스핑크스 / 얼음 도깨비불 · 설원 하피 · 서리 와이번 /
// 불도마뱀 · 흑요석 파수꾼 · 화염 마신 / 혈교 승병 · 지전귀 · 귀검 호법
(function () {
  'use strict';
  var S = Game.Shape, E = S.E, C = S.C, B = S.B, P = S.P, mat = S.mat;
  var TAU = S.TAU, wave = S.wave;
  var RIM = { forest: '#b8f07a', desert: '#ffd27a', snow: '#c8f0ff', volcano: '#ff9a4a', castle: '#c9a0ff' };
  function M(id, theme, h, fn) { S.def(id, { h: h, group: theme, rim: RIM[theme], fn: fn }); }
  function concat() { return [].concat.apply([], arguments); }
  function emitRamp(dark, mid, light) { return [S.darken(dark, 0.4), dark, mid, S.mix(mid, light, 0.5), light, '#ffffff']; }
  function chain(pts, r0, r1, m, o) {
    var out = [], n = pts.length - 1;
    for (var i = 0; i < n; i++) out.push(C(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n, m, o));
    return out;
  }
  function fangs(x0, x1, y, n, len, dir) {
    var out = [], w = (x1 - x0) / n;
    for (var i = 0; i < n; i++) { var a = x0 + i * w; out.push(P([[a, y], [a + w, y], [a + w * 0.5, y + len * (i % 2 ? 0.7 : 1) * dir]], 'm2tooth', { line: false, ao: false, bev: 0 })); }
    return out;
  }
  function eye(x, y, rx, ry, m, rot) { return E(x, y, rx, ry, m, { rot: rot || 0, keep: true, line: false }); }
  function leg(x0, y0, kx, ky, fx, fy, r, m, g) { return [C(x0, y0, kx, ky, r, r * 0.85, m, { g: g }), C(kx, ky, fx, fy, r * 0.85, r * 0.35, m, { g: g })]; }

  mat('m2tooth', '#ece4c8', { solid: true });
  mat('m2mouth', '#1a0e14', { solid: true });
  mat('m2eyeR', '', { emit: true, ramp: emitRamp('#7a0a1a', '#ff3a3a', '#ffc0b0') });
  mat('m2eyeY', '', { emit: true, ramp: emitRamp('#8a5a06', '#ffb02a', '#fff3a8') });
  mat('m2eyeG', '', { emit: true, ramp: emitRamp('#2a5a06', '#a8ff3a', '#f0ffc0') });
  mat('m2eyeC', '', { emit: true, ramp: emitRamp('#0a3a6a', '#3fd0ff', '#e0fbff') });
  mat('m2eyeV', '', { emit: true, ramp: emitRamp('#4a1a7a', '#c060ff', '#f0d0ff') });

  // ================= 만독곡 =================
  mat('m2cent', '#7a2a2a', { spec: 0.5, shin: 12, dark: 0.2, shift: 16 });
  mat('m2centD', '#4a1a22', { dark: 0.16, shift: 16 });
  mat('m2centL', '#e0a83a', { dark: 0.24 });
  // 천족오공: 몸을 S자로 세운 거대한 지네, 마디마다 노란 다리, 독 턱
  M('centipede', 'forest', 64, function (t, pose) {
    var atk = pose === 'attack', sw = wave(t) * 1.5, hx = atk ? 10 : 16, hy = atk ? 26 : 20;
    var spine = [[64, 58], [56, 56], [48, 52 + sw * 0.3], [42, 45], [36, 37 + sw * 0.5], [30, 30], [24 + (atk ? -4 : 0), 24]];
    spine[spine.length - 1] = [hx + 8, hy + 4];
    var legs = [], segs = [];
    spine.forEach(function (q, i) {
      if (i === spine.length - 1) return;
      var ph = Math.sin(t * TAU * 2 + i) * 2;
      legs.push(C(q[0], q[1] + 2, q[0] - 6, q[1] + 7 + ph, 0.9, 0.6, 'm2centL', { g: 'lg' + i }));
      legs.push(C(q[0] + 2, q[1] + 2, q[0] + 7, q[1] + 8 - ph, 0.9, 0.6, 'm2centL', { g: 'lh' + i }));
      segs.push(E(q[0], q[1], 6.2 - i * 0.25, 5.2 - i * 0.2, i % 2 ? 'm2centD' : 'm2cent', { g: 'seg' + i }));
      segs.push(C(q[0] - 4, q[1] - 2, q[0] + 4, q[1] - 2, 0.6, 0.6, 'm2centL', { line: false, ao: false }));
    });
    return { w: 72, h: 62, cx: 40, tipAttack: [hx - 4, hy + 6], parts: concat(legs, chain(spine, 4.6, 3.6, 'm2centD', { g: 'core' }), segs, [
      E(hx + 5, hy + 3, 8, 6.5, 'm2cent', { g: 'head' }),
      C(hx, hy + 6, hx - 6, hy + (atk ? 12 : 9), 1.6, 0.6, 'm2centL', { g: 'jaw1' }), C(hx + 2, hy + 8, hx - 3, hy + (atk ? 14 : 11), 1.6, 0.6, 'm2centL', { g: 'jaw2' }),
      C(hx + 6, hy - 2, hx + 2, hy - 12 + sw, 0.7, 0.4, 'm2centL', { line: false }), C(hx + 9, hy - 2, hx + 10, hy - 13 - sw, 0.7, 0.4, 'm2centL', { line: false }),
      eye(hx + 2, hy + 1, 1.5, 1.1, 'm2eyeG'), eye(hx + 7, hy + 0.5, 1.4, 1, 'm2eyeG')
    ]) };
  });

  mat('m2cloak', '#2a2a36', { dark: 0.16, shift: 18 });
  mat('m2cloakL', '#44445a', { dark: 0.2, shift: 18 });
  mat('m2skin', '#c89a7a', { dark: 0.22 });
  mat('m2steel', '#b8c4d8', { spec: 0.8, shin: 16, dark: 0.3 });
  mat('m2redS', '#a8242e', { dark: 0.2 });
  // 흑풍채 자객: 삿갓과 검은 복면, 낮은 자세로 쌍단검
  M('assassin', 'forest', 62, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 0.8), y = function (v) { return v + b; }, w = wave(t), lean = atk ? -6 : 0;
    var hF = atk ? [8, 38] : [16, 40], hB = atk ? [40, 30] : [38, 38];
    return { w: 56, h: 60, cx: 30, tipAttack: [hF[0] - 6, hF[1] - 2], parts: concat([
      P([[34 + lean, y(22)], [42, y(26)], [48 + w * 1.5, y(52)], [36, y(50)]], 'm2cloak', { g: 'cape', bev: 1.2 }),
      C(36, y(30), hB[0], y(hB[1]), 2.4, 2.2, 'm2cloakL', { g: 'armB' }),
      C(hB[0], y(hB[1]), hB[0] + 6, y(hB[1] - 6), 1, 0.5, 'm2steel', { g: 'knifeB' }),
      C(32, 44, 38, 56, 3.6, 3, 'm2cloak', { g: 'legB' }), B(38.5, 58, 3.6, 2.2, 3, 'm2cloakL', { g: 'legB' }),
      C(26, 44, 18, 54, 3.8, 3, 'm2cloak', { g: 'legF' }), B(17, 57, 4, 2.4, 3, 'm2cloakL', { g: 'legF' }),
      B(29 + lean * 0.5, y(36), 7.4, 9, 2, 'm2cloak', { g: 'torso' }),
      C(22 + lean * 0.5, y(42), 36 + lean * 0.5, y(42), 1.6, 1.6, 'm2redS', { line: false }),
      E(29 + lean, y(19), 7, 6.4, 'm2cloak', { g: 'hd' }),
      B(26 + lean, y(20.5), 5.6, 2, 3, 'm2skin', { line: false, ao: false }),
      eye(23.5 + lean, y(20.5), 1.4, 0.8, 'm2eyeR'), eye(28 + lean, y(20.5), 1.2, 0.7, 'm2eyeR'),
      P([[14 + lean, y(15)], [30 + lean, y(5)], [46 + lean, y(15)], [30 + lean, y(13)]], 'm2cloakL', { g: 'hat', bev: 1 }),
      C(26, y(30), hF[0] + 1, y(hF[1]), 2.6, 2.2, 'm2cloakL', { g: 'armF' }),
      E(hF[0], y(hF[1]), 2, 2, 'm2skin', { g: 'armF' })
    ], chain([[hF[0], y(hF[1])], [hF[0] - 4, y(hF[1] - 3)], [hF[0] - 8, y(hF[1] - 4)]], 1.1, 0.4, 'm2steel', { g: 'knifeF' })) };
  });

  mat('m2snake', '#3a7a3a', { spec: 0.5, shin: 12, dark: 0.18, shift: 18 });
  mat('m2snakeD', '#24502a', { dark: 0.15, shift: 18 });
  mat('m2belly', '#d8d090', { dark: 0.24 });
  mat('m2horn', '#d8c8a0', { dark: 0.28 });
  mat('m2venom', '', { emit: true, ramp: emitRamp('#2a5a10', '#8aff3a', '#e8ffc0') });
  // 독룡 이무기: 똬리를 튼 거대한 뱀, 뿔 하나와 갈기, 독 안개
  M('python', 'forest', 94, function (t, pose) {
    var atk = pose === 'attack', sw = wave(t) * 2, hx = atk ? 14 : 22, hy = atk ? 34 : 24;
    var neck = [[70, 72], [76, 60], [72, 48 + sw * 0.4], [60, 40], [46, 36 + sw * 0.5], [hx + 12, hy + 6]];
    var mist = [];
    for (var i = 0; i < 5; i++) { var ph = (t + i / 5) % 1; mist.push(E(hx - 4 - ph * 10, hy + 10 + Math.sin(ph * TAU + i) * 3, 2 + ph * 2, 1.6 + ph * 1.5, 'm2venom', { line: false, ao: false, emitLv: 2 })); }
    return { w: 100, h: 92, cx: 56, tipAttack: [hx - 8, hy + 8], glow: [{ x: hx + 2, y: hy + 6, r: 12, c: '#8aff3a', k: 0.6 }], parts: concat([
      E(56, 84, 36, 6, 'm2snakeD', { g: 'coil0' }),
      E(54, 78, 30, 9, 'm2snake', { g: 'coil1' }), E(58, 70, 22, 8, 'm2snakeD', { g: 'coil2' }),
      C(36, 76, 72, 76, 2, 2, 'm2belly', { line: false, ao: false })
    ], chain(neck, 8.5, 6, 'm2snake', { g: 'neck' }),
    neck.slice(0, -1).map(function (q, j) { return C(q[0] - 3, q[1] + 4, q[0] + 3, q[1] + 5, 2.2, 2.2, 'm2belly', { line: false, ao: false }); }), [
      E(hx + 8, hy + 2, 13, 8.6, 'm2snake', { g: 'head', rot: -0.1 }),
      P([[hx - 4, hy + 4], [hx + 6, hy + (atk ? 14 : 9)], [hx + 14, hy + 8]], 'm2mouth', { bev: 0 }),
      eye(hx + 3, hy - 1, 2.6, 1.3, 'm2eyeY', -0.2),
      P([[hx + 10, hy - 5], [hx + 16, hy - 20], [hx + 17, hy - 4]], 'm2horn', { g: 'horn', bev: 1 }),
      P([[hx + 18, hy - 4], [hx + 30, hy - 10 - sw], [hx + 26, hy + 2], [hx + 34, hy + 0 + sw], [hx + 22, hy + 8]], 'm2snakeD', { g: 'mane', bev: 1 })
    ], fangs(hx - 2, hx + 8, hy + 5, 3, 3, 1), mist) };
  });

  // ================= 타오르는 사막 =================
  mat('m2gold', '#d8a830', { spec: 0.9, shin: 18, dark: 0.26, shift: 14 });
  mat('m2goldD', '#8a6018', { spec: 0.5, dark: 0.2 });
  mat('m2blackC', '#2a2234', { spec: 0.6, shin: 14, dark: 0.14, shift: 18 });
  // 황금 스카라브: 금빛 등껍질, 뿔 턱, 여섯 다리
  M('scarab', 'desert', 56, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 0.6), y = function (v) { return v + b; }, lx = atk ? -5 : 0;
    var legs = [];
    for (var i = 0; i < 3; i++) {
      var sx = 24 + i * 8, ph = Math.sin(t * TAU * 2 + i * 2) * 1.5;
      legs = legs.concat(leg(sx, y(42), sx - 5, y(46), sx - 7 + ph, 54, 1.4, 'm2blackC', 'lf' + i));
      legs = legs.concat(leg(sx + 3, y(43), sx + 8, y(47), sx + 10 - ph, 55, 1.5, 'm2blackC', 'lb' + i));
    }
    return { w: 64, h: 56, cx: 34, tipAttack: [8 + lx, 36], parts: concat(legs, [
      E(36 + lx * 0.4, y(36), 18, 12, 'm2gold', { g: 'shell' }),
      C(36 + lx * 0.4, y(25), 36 + lx * 0.4, y(46), 0.7, 0.7, 'm2goldD', { line: false, ao: false }),
      E(29 + lx * 0.4, y(31), 4, 2, 'm2goldD', { line: false, ao: false, rot: -0.4 }),
      E(16 + lx, y(39), 7, 6, 'm2blackC', { g: 'head' }),
      P([[10 + lx, y(36)], [2 + lx, y(24)], [8 + lx, y(34)]], 'm2goldD', { g: 'horn', bev: 0.8 }),
      C(10 + lx, y(43), 4 + lx, y(46), 1.2, 0.5, 'm2blackC', { g: 'jaw' }),
      eye(12 + lx, y(37), 1.3, 1, 'm2eyeR')
    ]) };
  });

  mat('m2robeS', '#c8a878', { dark: 0.26, shift: 16 });
  mat('m2robeSD', '#8a6a48', { dark: 0.2 });
  mat('m2wood', '#7a4a26', { dark: 0.2 });
  mat('m2string', '#f0e8d0', { solid: true });
  // 사막 궁수: 두건과 터번 꼬리, 큰 활을 당긴다
  M('sand_archer', 'desert', 68, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t), y = function (v) { return v + b; }, w = wave(t);
    var bowX = atk ? 10 : 13, pull = atk ? 30 : 24;
    return { w: 56, h: 66, cx: 30, tipAttack: [bowX - 4, 32], parts: concat([
      P([[32, y(20)], [38, y(22)], [46 + w * 1.5, y(36)], [38, y(30)]], 'm2robeS', { g: 'tail', bev: 1 }),
      C(30, 44, 34, 58, 4, 3.2, 'm2robeSD', { g: 'legB' }), B(34.5, 61, 4.4, 2.6, 3, 'm2wood', { g: 'legB' }),
      C(25, 44, 20, 58, 4.2, 3.2, 'm2robeSD', { g: 'legF' }), B(19.5, 61, 4.8, 2.6, 3, 'm2wood', { g: 'legF' }),
      B(28, y(36), 8, 9.6, 2.2, 'm2robeS', { g: 'torso' }),
      C(22, y(44), 34, y(44), 1.4, 1.4, 'm2goldD', { line: false }),
      C(31, y(30), pull, y(32), 2.4, 2.2, 'm2robeSD', { g: 'armB' }),
      E(29, y(17), 8.4, 7.6, 'm2robeS', { g: 'hd' }),
      B(24.5, y(19.6), 6, 2, 3, 'm2skin', { line: false, ao: false }),
      eye(22, y(19.6), 1.3, 0.8, 'm2eyeY'), eye(26.4, y(19.6), 1.2, 0.7, 'm2eyeY')
    ], chain([[bowX + 6, y(14)], [bowX, y(22)], [bowX - 2, y(32)], [bowX, y(42)], [bowX + 6, y(50)]], 1.4, 1.4, 'm2wood', { g: 'bow' }), [
      C(bowX + 6, y(14), pull, y(32), 0.4, 0.4, 'm2string', { line: false, ao: false }),
      C(pull, y(32), bowX + 6, y(50), 0.4, 0.4, 'm2string', { line: false, ao: false }),
      C(pull, y(32), bowX - 6, y(32), 0.6, 0.6, 'm2wood', { line: false }),
      P([[bowX - 6, y(30.5)], [bowX - 10, y(32)], [bowX - 6, y(33.5)]], 'm2steel', { bev: 0 }),
      C(26, y(30), bowX + 1, y(32), 2.4, 2.2, 'm2robeS', { g: 'armF' }), E(bowX + 1, y(32), 2, 2, 'm2skin', { g: 'armF' })
    ]) };
  });

  mat('m2lion', '#d8b068', { dark: 0.24, shift: 16 });
  mat('m2lionD', '#a07840', { dark: 0.2, shift: 16 });
  mat('m2nemes', '#2a5ab0', { dark: 0.2 });
  mat('m2wingS', '#e8d4a0', { dark: 0.26, shift: 14 });
  // 스핑크스: 사자 몸에 금·청 줄무늬 두건을 쓴 얼굴, 등의 깃 날개
  M('sphinx', 'desert', 96, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 0.8), y = function (v) { return v + b; }, wf = wave(t) * 3, px = atk ? -8 : 0;
    var feathers = [];
    for (var i = 0; i < 5; i++) feathers.push(P([[58, y(52)], [64 + i * 7, y(18 + i * 4) - wf], [60 + i * 6, y(50 + i)]], i % 2 ? 'm2wingS' : 'm2goldD', { g: 'wing' + i, bev: 0.8 }));
    return { w: 104, h: 96, cx: 58, tipAttack: [10 + px, 74], parts: concat(feathers, [
      C(84, y(60), 96, y(48), 2, 1.4, 'm2lionD', { g: 'tail' }), E(96, y(46), 2.6, 3, 'm2lionD', { g: 'tail' }),
      C(76, y(68), 82, 90, 5.4, 4, 'm2lionD', { g: 'legBB' }), C(46, y(68), 48, 90, 5.4, 4, 'm2lionD', { g: 'legFB' }),
      E(62, y(62), 26, 15, 'm2lion', { g: 'body' }),
      C(72, y(70), 74, 90, 6, 4.4, 'm2lion', { g: 'legBF' }), E(73, 90, 6, 3, 'm2lion', { g: 'legBF' }),
      C(38 + px, y(66), 24 + px, 86, 6, 4.4, 'm2lion', { g: 'paw' }), E(20 + px, 88, 7.4, 3.4, 'm2lion', { g: 'paw' }),
      P([[16 + px, y(87)], [12 + px, y(91)], [18 + px, y(90)]], 'm2tooth', { bev: 0 }),
      C(40, y(40), 52, y(58), 10, 11, 'm2lion', { g: 'chest' }),
      P([[22, y(20)], [44, y(18)], [50, y(48)], [16, y(48)]], 'm2nemes', { g: 'nemes', bev: 1 }),
      C(20, y(30), 46, y(30), 1.2, 1.2, 'm2gold', { line: false }), C(18, y(38), 48, y(38), 1.2, 1.2, 'm2gold', { line: false }),
      E(32, y(28), 9.6, 10.4, 'm2lion', { g: 'face' }),
      E(32, y(16), 11, 5, 'm2nemes', { g: 'cap' }), C(22, y(17), 42, y(17), 1.2, 1.2, 'm2gold', { line: false }),
      eye(27, y(27), 1.8, 1.1, 'm2eyeC'), eye(34, y(27), 1.8, 1.1, 'm2eyeC'),
      C(28, y(34), 34, y(34), 0.8, 0.8, 'm2mouth'),
      C(32, y(38), 32, y(46), 1.6, 1.2, 'm2gold', { g: 'beard' })
    ]) };
  });

  // ================= 얼어붙은 설원 =================
  mat('m2wispC', '', { emit: true, ramp: emitRamp('#1a4a8a', '#5ec8ff', '#f0fbff') });
  mat('m2wispD', '', { emit: true, ramp: emitRamp('#0a2048', '#2a70c8', '#9ad8ff') });
  // 얼음 도깨비불: 꼬리를 늘어뜨린 푸른 불꽃 넋과 얼음 결정
  M('wisp', 'snow', 58, function (t, pose) {
    var atk = pose === 'attack', fl = wave(t) * 2, lx = atk ? -6 : 0;
    var tail = [];
    for (var i = 0; i < 5; i++) tail.push(E(34 + i * 4 + Math.sin(t * TAU + i) * 2, 34 + i * 3.5, 9 - i * 1.6, 8 - i * 1.4, i % 2 ? 'm2wispD' : 'm2wispC', { line: false, ao: false, emitLv: 2 }));
    var shards = [];
    for (var k = 0; k < 4; k++) { var a = t * TAU + k * TAU / 4; shards.push(P([[30 + Math.cos(a) * 18, 30 + Math.sin(a) * 9 - 3], [30 + Math.cos(a) * 18 + 2, 30 + Math.sin(a) * 9], [30 + Math.cos(a) * 18, 30 + Math.sin(a) * 9 + 3], [30 + Math.cos(a) * 18 - 2, 30 + Math.sin(a) * 9]], 'm2wispC', { bev: 0, line: false })); }
    return { w: 60, h: 56, cx: 32, tipAttack: [12 + lx, 28], glow: [{ x: 30 + lx, y: 28, r: 18, c: '#5ec8ff', k: 0.8 }], parts: concat(tail.reverse(), [
      E(30 + lx, 28 - fl, 12, 13, 'm2wispD', { line: false, ao: false, emitLv: 2 }),
      E(29 + lx, 27 - fl, 9, 10, 'm2wispC', { line: false, ao: false, emitLv: 3 }),
      P([[22 + lx, 18 - fl], [26 + lx, 6 - fl * 2], [30 + lx, 16 - fl]], 'm2wispC', { bev: 0, line: false }),
      P([[30 + lx, 16 - fl], [35 + lx, 2 - fl * 2], [37 + lx, 17 - fl]], 'm2wispD', { bev: 0, line: false }),
      E(24 + lx, 27 - fl, 2.4, 3.2, 'm2mouth'), E(32 + lx, 26 - fl, 2.2, 3, 'm2mouth'),
      E(27 + lx, 34 - fl, 3, atk ? 2.6 : 1.4, 'm2mouth')
    ], shards) };
  });

  mat('m2feather', '#c8d8f0', { dark: 0.26, shift: 16 });
  mat('m2featherD', '#7a90b8', { dark: 0.2, shift: 16 });
  mat('m2skinP', '#e8d8e8', { dark: 0.22 });
  mat('m2hairI', '#a8c8f0', { dark: 0.24 });
  mat('m2talon', '#2a2a3a', { spec: 0.4, dark: 0.16 });
  // 설원 하피: 얼음빛 깃털 날개를 편 새 여인, 발톱이 날카롭다
  M('harpy', 'snow', 72, function (t, pose) {
    var atk = pose === 'attack', f = wave(t) * 5, b = -wave(t) * 2, y = function (v) { return v + b; }, lx = atk ? -6 : 0;
    function wingP(x0, sgn, m, md, g) {
      var out = [];
      for (var i = 0; i < 5; i++) out.push(P([[x0, y(26)], [x0 + sgn * (14 + i * 4), y(8 + i * 7) - f * (1 - i * 0.15)], [x0 + sgn * (8 + i * 3), y(26 + i * 4)]], i % 2 ? md : m, { g: g + i, bev: 0.8 }));
      return out;
    }
    return { w: 84, h: 72, cx: 42, tipAttack: [26 + lx, 62], parts: concat(wingP(48, 1, 'm2featherD', 'm2feather', 'wb'), [
      C(40 + lx * 0.5, y(46), 34 + lx, 62, 2, 1.4, 'm2featherD', { g: 'legB' }), C(46 + lx * 0.5, y(46), 46 + lx, 62, 2, 1.4, 'm2featherD', { g: 'legF' }),
      C(34 + lx, 62, 28 + lx, 66, 1.2, 0.5, 'm2talon'), C(46 + lx, 62, 40 + lx, 67, 1.2, 0.5, 'm2talon'),
      E(43, y(38), 8, 10, 'm2feather', { g: 'body' }),
      B(43, y(30), 5.6, 5, 2, 'm2skinP', { g: 'chest' }),
      C(38, y(14), 50, y(36), 3, 2, 'm2hairI', { g: 'hairB' }),
      E(41, y(18), 6.4, 6.6, 'm2skinP', { g: 'head' }),
      P([[34, y(14)], [44, y(10)], [48, y(18)], [38, y(15)]], 'm2hairI', { g: 'bang', bev: 0.8 }),
      eye(37.5, y(19), 1.4, 0.9, 'm2eyeC'), eye(42, y(19), 1.2, 0.8, 'm2eyeC'),
      C(37, y(23), 40, y(23), 0.6, 0.6, 'm2mouth')
    ], wingP(38, -1, 'm2feather', 'm2featherD', 'wf')) };
  });

  mat('m2wyv', '#7aa8d8', { spec: 0.6, shin: 14, dark: 0.2, shift: 18 });
  mat('m2wyvD', '#3e6090', { dark: 0.16, shift: 18 });
  mat('m2wyvW', '#a8d0f0', { dark: 0.26, shift: 16 });
  mat('m2ice', '#e0f4ff', { spec: 0.9, shin: 20, dark: 0.3 });
  // 서리 와이번: 반쯤 편 날개막, 얼음 가시 등, 서리 숨결
  M('frost_wyvern', 'snow', 98, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1), y = function (v) { return v + b; }, f = wave(t) * 4, hx = atk ? 12 : 20, hy = atk ? 40 : 30;
    var spikes = [];
    [[56, 38], [66, 36], [76, 42], [86, 52]].forEach(function (q) { spikes.push(P([[q[0] - 3, y(q[1] + 2)], [q[0], y(q[1] - 7)], [q[0] + 3, y(q[1] + 2)]], 'm2ice', { bev: 0 })); });
    var breath = [];
    if (atk) for (var i = 0; i < 6; i++) breath.push(E(hx - 8 - i * 4, hy + 6 + Math.sin(i + t * TAU) * 2, 3 + i * 0.6, 2.4 + i * 0.4, 'm2wispC', { line: false, ao: false, emitLv: 2 }));
    return { w: 108, h: 96, cx: 60, tipAttack: [hx - 10, hy + 6], glow: atk ? [{ x: hx - 14, y: hy + 6, r: 12, c: '#9ad8ff', k: 0.7 }] : null, parts: concat([
      P([[64, y(40)], [84, y(4) - f], [104, y(14) - f], [96, y(40)], [80, y(48)]], 'm2wyvW', { g: 'wingB', bev: 1 }),
      C(84, y(4) - f, 80, y(46), 1.2, 1, 'm2wyvD', { line: false }), C(104, y(14) - f, 88, y(46), 1.2, 1, 'm2wyvD', { line: false }),
      C(86, y(66), 104, y(78), 4, 2, 'm2wyvD', { g: 'tail' }),
      C(76, y(70), 80, 92, 4.4, 3.4, 'm2wyvD', { g: 'legB' }), E(80, 92, 5, 2.6, 'm2wyvD', { g: 'legB' }),
      E(68, y(60), 22, 14, 'm2wyv', { g: 'body' }),
      C(58, y(70), 54, 92, 5, 3.6, 'm2wyv', { g: 'legF' }), E(52, 92, 6, 2.8, 'm2wyv', { g: 'legF' })
    ], spikes, chain([[54, y(50)], [42, y(42)], [32, y(36)], [hx + 10, hy + 2]], 6, 5, 'm2wyv', { g: 'neck' }), [
      E(hx + 4, hy, 11, 7, 'm2wyv', { g: 'head' }),
      P([[hx - 6, hy + 2], [hx + 4, hy + (atk ? 10 : 6)], [hx + 12, hy + 4]], 'm2mouth', { bev: 0 }),
      eye(hx + 1, hy - 2, 2.2, 1.1, 'm2eyeC', -0.2),
      P([[hx + 8, hy - 4], [hx + 18, hy - 14], [hx + 14, hy - 2]], 'm2ice', { g: 'horn', bev: 1 }),
      P([[50, y(44)], [40, y(8) - f], [24, y(16) - f], [34, y(40)]], 'm2wyvW', { g: 'wingF', bev: 1 }),
      C(40, y(8) - f, 44, y(44), 1.2, 1, 'm2wyvD', { line: false })
    ], fangs(hx - 4, hx + 6, hy + 3, 3, 2.4, 1), breath) };
  });

  // ================= 용암 화산 =================
  mat('m2sala', '#c84a2a', { spec: 0.5, shin: 12, dark: 0.2, shift: 18 });
  mat('m2salaD', '#7a2418', { dark: 0.16, shift: 18 });
  mat('m2lava', '', { emit: true, ramp: S.FIRE });
  // 불도마뱀: 등에 불꽃 지느러미, 혀끝이 타오른다
  M('salamander', 'volcano', 58, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 0.6), y = function (v) { return v + b; }, sw = wave(t) * 2, hx = atk ? 8 : 14;
    var fins = [];
    for (var i = 0; i < 5; i++) fins.push(P([[30 + i * 7, y(34)], [33 + i * 7, y(22 - (i % 2) * 4) - sw], [36 + i * 7, y(34)]], 'm2lava', { bev: 0, line: false, emitLv: 3 + (i % 2) }));
    return { w: 78, h: 56, cx: 40, tipAttack: [hx - 8, 40], glow: [{ x: 46, y: 30, r: 14, c: '#ff8a2a', k: 0.5 }], parts: concat(fins,
      chain([[62, y(40)], [70, y(36)], [76, y(28) + sw]], 4, 1.4, 'm2salaD', { g: 'tail' }), [
      C(34, y(44), 30, 54, 2.6, 2, 'm2salaD', { g: 'lb1' }), C(54, y(44), 58, 54, 2.6, 2, 'm2salaD', { g: 'lb2' }),
      E(44, y(40), 20, 7.6, 'm2sala', { g: 'body' }),
      C(28, y(44), 22, 54, 2.8, 2, 'm2sala', { g: 'lf1' }), C(50, y(45), 48, 55, 2.8, 2, 'm2sala', { g: 'lf2' }),
      E(hx + 10, y(38), 9, 6, 'm2sala', { g: 'head' }),
      eye(hx + 7, y(35), 1.6, 1.1, 'm2eyeY'),
      C(hx + 2, y(41), hx - (atk ? 8 : 3), y(42), 0.9, 0.6, 'm2lava', { line: false, emitLv: 4 })
    ]) };
  });

  mat('m2obs', '#2a2238', { spec: 0.9, shin: 22, dark: 0.12, shift: 20 });
  mat('m2obsL', '#5a4a78', { spec: 0.9, shin: 22, dark: 0.16, shift: 20 });
  // 흑요석 파수꾼: 날카롭게 깨진 검은 유리 몸, 가슴의 용암 심장
  M('obsidian', 'volcano', 80, function (t, pose) {
    var atk = pose === 'attack', b = wave(t) * 0.8, y = function (v) { return v + b; }, fx = atk ? -8 : 0;
    var shards = [];
    for (var i = 0; i < 4; i++) { var a = t * TAU + i * 1.6; shards.push(P([[30 + Math.cos(a) * 26, y(30) + Math.sin(a) * 10 - 3], [32 + Math.cos(a) * 26, y(30) + Math.sin(a) * 10 + 2], [28 + Math.cos(a) * 26, y(30) + Math.sin(a) * 10 + 2]], 'm2obsL', { bev: 0 })); }
    return { w: 64, h: 78, cx: 32, tipAttack: [6 + fx, 46], glow: [{ x: 32, y: y(38), r: 8, c: '#ff6a2a', k: 0.8 }], parts: concat([
      P([[22, 54], [16, 76], [26, 76], [30, 56]], 'm2obs', { g: 'legF', bev: 1 }), P([[36, 54], [36, 76], [46, 76], [42, 54]], 'm2obs', { g: 'legB', bev: 1 }),
      P([[44, y(24)], [58, y(32)], [56, y(52)], [48, y(46)]], 'm2obs', { g: 'armB', bev: 1 }),
      P([[16, y(20)], [32, y(14)], [48, y(22)], [46, y(52)], [32, y(58)], [18, y(50)]], 'm2obs', { g: 'torso', bev: 1.6 }),
      P([[24, y(22)], [32, y(18)], [30, y(34)]], 'm2obsL', { line: false, bev: 0 }),
      E(32, y(38), 4, 4.6, 'm2lava', { line: false, emitLv: 4 }),
      C(32, y(42), 28, y(52), 0.8, 0.6, 'm2lava', { line: false, emitLv: 3 }),
      P([[24, y(4)], [34, y(0)], [40, y(10)], [32, y(16)], [22, y(12)]], 'm2obs', { g: 'head', bev: 1.2 }),
      eye(28, y(9), 1.6, 1, 'm2eyeY'), eye(34, y(8), 1.4, 0.9, 'm2eyeY'),
      P([[18, y(24)], [8 + fx, y(34)], [4 + fx, y(48)], [14 + fx * 0.5, y(44)], [20, y(34)]], 'm2obs', { g: 'armF', bev: 1.2 }),
      P([[4 + fx, y(48)], [0 + fx, y(56)], [10 + fx, y(50)]], 'm2obsL', { bev: 0 })
    ], shards) };
  });

  mat('m2djinn', '', { emit: true, ramp: emitRamp('#8a1a06', '#ff6a1a', '#ffe08a') });
  mat('m2djinnD', '', { emit: true, ramp: emitRamp('#4a0a06', '#c8300e', '#ff9a3a') });
  mat('m2band', '#e8b838', { spec: 0.8, shin: 16, dark: 0.26 });
  mat('m2djSkin', '#c8501e', { dark: 0.2, shift: 14 });
  // 화염 마신: 아래가 불꽃 꼬리로 흩어지는 거대한 상반신, 금팔찌, 뿔
  M('djinn', 'volcano', 100, function (t, pose) {
    var atk = pose === 'attack', b = wave(t) * 2, y = function (v) { return v + b; }, fx = atk ? -14 : 0, fy = atk ? 10 : 0;
    var flames = [];
    for (var i = 0; i < 8; i++) { var ph = (t + i / 8) % 1; flames.push(E(40 + Math.sin(i * 2.3) * 12 + Math.sin(ph * TAU) * 3, 92 - ph * 34, 7 - ph * 4, 9 - ph * 5, i % 2 ? 'm2djinnD' : 'm2djinn', { line: false, ao: false, emitLv: 2 + (i % 3) })); }
    return { w: 92, h: 98, cx: 46, tipAttack: [8 + fx, 52 + fy], glow: [{ x: 46, y: y(50), r: 30, c: '#ff6a1a', k: 0.5 }], parts: concat(flames, [
      P([[34, y(58)], [58, y(58)], [52, y(80)], [40, y(80)]], 'm2djinnD', { line: false, ao: false, emitLv: 3 }),
      C(60, y(36), 76, y(54), 5, 4.4, 'm2djSkin', { g: 'armB' }), E(77, y(56), 5, 5, 'm2djSkin', { g: 'armB' }),
      B(46, y(46), 15, 14, 3, 'm2djSkin', { g: 'torso' }),
      C(34, y(56), 58, y(56), 2, 2, 'm2band', { line: false }),
      E(46, y(22), 11, 11, 'm2djSkin', { g: 'head' }),
      P([[36, y(14)], [28, y(0)], [40, y(10)]], 'm2band', { g: 'hornL', bev: 1 }), P([[54, y(12)], [62, y(-2)], [58, y(14)]], 'm2band', { g: 'hornR', bev: 1 }),
      P([[38, y(14)], [46, y(4)], [54, y(14)], [50, y(10)], [46, y(14)], [42, y(10)]], 'm2djinn', { line: false, ao: false, emitLv: 4 }),
      eye(41, y(21), 2.2, 1.2, 'm2eyeY', -0.2), eye(50, y(21), 2, 1.1, 'm2eyeY', 0.2),
      P([[38, y(28)], [54, y(28)], [50, y(33)], [42, y(33)]], 'm2mouth', { bev: 0 })
    ], fangs(40, 52, y(28), 4, 2, 1), [
      C(32, y(36), 16 + fx, y(48 + fy), 5.6, 5, 'm2djSkin', { g: 'armF' }),
      C(18 + fx, y(46 + fy), 22 + fx, y(46 + fy), 3.2, 3.2, 'm2band', { line: false }),
      E(12 + fx, y(52 + fy), 6.4, 6, 'm2djSkin', { g: 'armF' }),
      E(10 + fx, y(52 + fy), 4, 4, 'm2djinn', { line: false, ao: false, emitLv: atk ? 5 : 3 })
    ]) };
  });

  // ================= 청운문 =================
  mat('m2monk', '#8a2a2a', { dark: 0.2, shift: 16 });
  mat('m2monkD', '#5a1a1e', { dark: 0.16, shift: 16 });
  mat('m2skinM', '#d8a888', { dark: 0.22 });
  mat('m2bead', '#3a2a1a', { spec: 0.6, dark: 0.16 });
  mat('m2bloodH', '', { emit: true, ramp: emitRamp('#5a0a0e', '#d42020', '#ff8a7a') });
  // 혈교 승병: 핏빛 가사, 염주, 피 묻은 손바닥을 내민다
  M('blood_monk', 'castle', 74, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t), y = function (v) { return v + b; }, w = wave(t);
    var hF = atk ? [6, 34] : [16, 40];
    var beads = [];
    for (var i = 0; i < 9; i++) { var a = 0.4 + i * 0.28; beads.push(E(30 + Math.cos(a) * 9, y(30) + Math.sin(a) * 9, 1.4, 1.4, 'm2bead', { line: false })); }
    return { w: 60, h: 72, cx: 32, tipAttack: [hF[0] - 2, hF[1]], glow: atk ? [{ x: hF[0], y: y(hF[1]), r: 8, c: '#ff3a3a', k: 0.7 }] : null, parts: concat([
      C(38, y(30), 46, y(42), 3, 2.6, 'm2skinM', { g: 'armB' }), E(47, y(43), 2.8, 2.8, 'm2skinM', { g: 'armB' }),
      C(30, 52, 36, 68, 4.4, 3.6, 'm2monkD', { g: 'legB' }), B(37, 69, 4.6, 2.4, 3, 'm2bead', { g: 'legB' }),
      C(26, 52, 20, 68, 4.6, 3.6, 'm2monkD', { g: 'legF' }), B(19, 69, 5, 2.4, 3, 'm2bead', { g: 'legF' }),
      P([[20, y(24)], [42, y(24)], [48 + w, y(60)], [13, y(60)]], 'm2monk', { g: 'robe', bev: 1.4 }),
      P([[22, y(24)], [40, y(52)], [34, y(52)], [18, y(30)]], 'm2monkD', { line: false, bev: 0 }),
      E(31, y(16), 8, 8.4, 'm2skinM', { g: 'head' }),
      eye(26.5, y(16), 1.4, 0.8, 'm2eyeR'), eye(31.5, y(16), 1.2, 0.7, 'm2eyeR'),
      C(26, y(12), 30, y(13), 0.7, 0.7, 'm2monkD', { line: false }),
      C(27, y(21), 31, y(21), 0.6, 0.6, 'm2mouth')
    ], beads, [
      C(24, y(30), hF[0] + 2, y(hF[1]), 3.2, 2.8, 'm2skinM', { g: 'armF' }),
      E(hF[0], y(hF[1]), 3.4, 3.6, 'm2skinM', { g: 'armF' }),
      E(hF[0] - 0.5, y(hF[1]), 2, 2.4, 'm2bloodH', { line: false, ao: false, emitLv: atk ? 4 : 2 })
    ]) };
  });

  mat('m2paper', '#e8dcc0', { dark: 0.24, shift: 14 });
  mat('m2paperD', '#b8a888', { dark: 0.2 });
  mat('m2ghostH', '#1a1420', { dark: 0.12 });
  mat('m2ink', '#b8221c', { solid: true });
  // 지전귀: 지전을 겹겹이 두른 원귀, 길게 늘어진 검은 머리, 날아다니는 종잇장
  M('paper_ghost', 'castle', 76, function (t, pose) {
    var atk = pose === 'attack', fl = wave(t) * 2, y = function (v) { return v - fl; }, lx = atk ? -6 : 0;
    var papers = [];
    for (var i = 0; i < 6; i++) {
      var a = t * TAU + i * TAU / 6, px = 30 + Math.cos(a) * (20 + (atk ? -8 : 0)) + lx, py = y(36) + Math.sin(a) * 12;
      papers.push(B(px, py, 3, 4, 2, 'm2paper', { rot: a, g: 'pp' + i }));
      papers.push(C(px - 1, py, px + 1, py, 0.5, 0.5, 'm2ink', { line: false, ao: false }));
    }
    var strips = [];
    for (var k = 0; k < 5; k++) strips.push(P([[18 + k * 6 + lx * 0.5, y(36)], [22 + k * 6 + lx * 0.5, y(36)], [21 + k * 6 + Math.sin(t * TAU + k) * 2, y(70)], [17 + k * 6 + Math.sin(t * TAU + k) * 2, y(70)]], k % 2 ? 'm2paperD' : 'm2paper', { g: 'st' + k, bev: 0.6 }));
    return { w: 64, h: 76, cx: 32, tipAttack: [8 + lx, 36], glow: [{ x: 30, y: y(30), r: 14, c: '#c9a0ff', k: 0.5 }], parts: concat(strips, [
      C(26 + lx, y(14), 40, y(48), 6, 3, 'm2ghostH', { g: 'hairB' }),
      B(30 + lx * 0.5, y(32), 10, 8, 3, 'm2paper', { g: 'torso' }),
      E(29 + lx, y(16), 7.6, 8.4, 'm2paper', { g: 'head' }),
      P([[21 + lx, y(10)], [30 + lx, y(6)], [38 + lx, y(12)], [36 + lx, y(30)], [33 + lx, y(14)], [26 + lx, y(14)], [22 + lx, y(30)]], 'm2ghostH', { g: 'hair', bev: 0.6 }),
      eye(26 + lx, y(18), 1.4, 1.8, 'm2eyeV'),
      C(25 + lx, y(24), 29 + lx, y(25), 0.7, 0.7, 'm2ink', { line: false }),
      B(29 + lx, y(5), 2, 5, 1, 'm2paperD', { g: 'charm' }), C(28 + lx, y(4), 30 + lx, y(6), 0.4, 0.4, 'm2ink', { line: false })
    ], papers) };
  });

  mat('m2armor', '#3a3448', { spec: 0.6, shin: 14, dark: 0.16, shift: 18 });
  mat('m2armorL', '#6a6080', { spec: 0.7, shin: 14, dark: 0.2, shift: 18 });
  mat('m2spirit', '', { emit: true, ramp: emitRamp('#3a1a6a', '#a070ff', '#f0e0ff') });
  mat('m2swordG', '#d0d8f0', { spec: 0.9, shin: 20, dark: 0.3 });
  // 귀검 호법: 반쯤 투명한 옛 호법의 넋이 갑옷을 입고, 등 뒤로 비검 다섯 자루가 떠 있다
  M('ghost_sword', 'castle', 100, function (t, pose) {
    var atk = pose === 'attack', b = wave(t) * 1.6, y = function (v) { return v - b; }, ax = atk ? -10 : 0;
    var swords = [];
    for (var i = 0; i < 5; i++) {
      var a = -2.2 + i * 0.55 + Math.sin(t * TAU) * 0.08, R = 30, cx = 52 + Math.cos(a) * R + (atk ? -20 + i * 4 : 0), cy = y(42) + Math.sin(a) * R;
      var dx = atk ? -1 : Math.cos(a), dy = atk ? 0.15 : Math.sin(a);
      swords.push(C(cx, cy, cx + dx * 14, cy + dy * 14, 1.3, 0.4, 'm2swordG', { g: 'fs' + i }));
      swords.push(C(cx - dx * 4, cy - dy * 4, cx, cy, 1.1, 1.1, 'm2spirit', { line: false, emitLv: 3 }));
    }
    var mist = [];
    for (var k = 0; k < 6; k++) { var ph = (t + k / 6) % 1; mist.push(E(44 + Math.sin(k * 2) * 10, 94 - ph * 22, 6 - ph * 3, 4 - ph * 2, 'm2spirit', { line: false, ao: false, emitLv: 1 })); }
    return { w: 104, h: 98, cx: 54, tipAttack: [10 + ax, 50], glow: [{ x: 50, y: y(44), r: 26, c: '#a070ff', k: 0.45 }], parts: concat(swords.slice(0, 6), mist, [
      P([[38, y(60)], [62, y(60)], [58, y(84)], [42, y(84)]], 'm2spirit', { line: false, ao: false, emitLv: 2 }),
      C(62, y(36), 68, y(50), 4, 3.6, 'm2armor', { g: 'armB' }), E(68, y(51), 3.2, 3.2, 'm2armorL', { g: 'armB' }),
      B(50, y(48), 13, 14, 3, 'm2armor', { g: 'torso' }),
      C(40, y(44), 60, y(44), 1.2, 1.2, 'm2armorL', { line: false }), C(40, y(52), 60, y(52), 1.2, 1.2, 'm2armorL', { line: false }),
      E(38, y(34), 6, 5, 'm2armorL', { g: 'pauldron' }),
      E(50, y(22), 9, 9.6, 'm2spirit', { g: 'head', emitLv: 2 }),
      P([[40, y(18)], [50, y(8)], [60, y(18)], [58, y(14)], [42, y(14)]], 'm2armor', { g: 'helm', bev: 1 }),
      eye(46, y(23), 1.8, 1, 'm2eyeY'), eye(53, y(23), 1.6, 0.9, 'm2eyeY'),
      C(38, y(38), 30 + ax, y(52), 4.4, 4, 'm2armor', { g: 'armF' }), E(29 + ax, y(53), 3.6, 3.6, 'm2armorL', { g: 'armF' }),
      C(29 + ax, y(53), 8 + ax * 1.4, y(atk ? 50 : 72), 2, 0.6, 'm2swordG', { g: 'blade' })
    ], swords.slice(6)) };
  });
})();
