// sprites-variety.js — 34단계 새 몬스터 13종의 도형 도트 그림(js/pixel-render.js). 몬스터는 왼쪽(영웅 쪽)을 본다
// 새로 그린 열하나: 정예 — 만독파파 · 아누비스 수문장 · 서리 기사 · 화염 무희 · 강시술사 · 공허 직조자
//                   보스 후보 — 천년 독두꺼비 왕 · 전갈 여왕 · 설산 대왕 · 염마 거인 · 틈의 히드라
// 크기만 줄인 둘(분열한 조각): 포자 버섯(독버섯) · 용암 방울(용암 슬라임)
// 앞의 그림 파일들(재질 m2* · toad · carap · snowFur · lava*)과 pixel-sculpt.js 뒤에 읽는다
(function () {
  'use strict';
  var S = Game.Shape, E = S.E, C = S.C, B = S.B, P = S.P, mat = S.mat;
  var TAU = S.TAU, wave = S.wave;
  var RIM = { forest: '#b8f07a', desert: '#ffd27a', snow: '#c8f0ff', volcano: '#ff9a4a', castle: '#c9a0ff', rift: '#5ef0d0' };
  function M(id, theme, h, fn) { S.def(id, { h: h, group: theme, rim: RIM[theme], fn: fn }); }
  function concat() { return [].concat.apply([], arguments); }
  function emitRamp(dark, mid, light) { return [S.darken(dark, 0.4), dark, mid, S.mix(mid, light, 0.5), light, '#ffffff']; }
  function eye(x, y, rx, ry, m, rot) { return E(x, y, rx, ry, m, { rot: rot || 0, keep: true, line: false }); }
  function chain(pts, r0, r1, m, o) {
    var out = [], n = pts.length - 1;
    for (var i = 0; i < n; i++) out.push(C(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n, m, o));
    return out;
  }
  function teeth(x0, x1, y, n, len, dir) {
    var out = [], w = (x1 - x0) / n;
    for (var i = 0; i < n; i++) { var a = x0 + i * w; out.push(P([[a, y], [a + w, y], [a + w * 0.5, y + len * dir]], 'm4tooth', { line: false, ao: false, bev: 0 })); }
    return out;
  }

  // ---------------- 재질 ----------------
  mat('m4tooth', '#f4ecd8', { solid: true });
  mat('m4mouth', '#3a0a14', { solid: true });
  mat('m4eyeG', '', { emit: true, ramp: emitRamp('#1a4a0a', '#8aff3a', '#eaffc0') });
  mat('m4eyeY', '', { emit: true, ramp: emitRamp('#5a3a06', '#ffd23a', '#fff6c0') });
  mat('m4eyeB', '', { emit: true, ramp: emitRamp('#0a2a5a', '#5ad0ff', '#e8faff') });
  mat('m4eyeR', '', { emit: true, ramp: emitRamp('#5a0a0a', '#ff4a3a', '#ffd8c0') });
  mat('m4eyeV', '', { emit: true, ramp: emitRamp('#2a0a5a', '#b06aff', '#f4e4ff') });
  mat('m4gold', '#e0a838', { spec: 0.85, shin: 18, dark: 0.26 });
  mat('m4goldD', '#9a6a1a', { spec: 0.6, dark: 0.2 });
  // 만독파파
  mat('m4hag', '#8a9a72', { dark: 0.2, shift: 14 });
  mat('m4hagRobe', '#4a2a5a', { dark: 0.16, shift: 18 });
  mat('m4hagRobeD', '#2e1a3a', { dark: 0.14, shift: 18 });
  mat('m4hair', '#d8d4c8', { dark: 0.24 });
  mat('m4straw', '#b0904a', { dark: 0.2 });
  mat('m4iron', '#3a3a44', { spec: 0.6, shin: 14, dark: 0.16 });
  mat('m4brew', '', { emit: true, ramp: emitRamp('#1a5a0a', '#6aff2a', '#e0ffb0') });
  mat('m4wood', '#6a4422', { dark: 0.2 });
  // 아누비스
  mat('m4jackal', '#2a2a36', { spec: 0.4, shin: 10, dark: 0.14, shift: 18 });
  mat('m4jackalL', '#484858', { spec: 0.5, dark: 0.18 });
  mat('m4linen', '#ece2c8', { dark: 0.24 });
  mat('m4lapis', '#2a4ab0', { spec: 0.7, shin: 16, dark: 0.2 });
  mat('m4spear', '#c8ccd8', { spec: 0.9, shin: 20, dark: 0.3 });
  // 서리 기사
  mat('m4iceArm', '#9cc8ec', { spec: 0.9, shin: 20, dark: 0.26, shift: 12 });
  mat('m4iceArmD', '#4a78b0', { spec: 0.7, shin: 16, dark: 0.2 });
  mat('m4iceCry', '', { emit: true, ramp: emitRamp('#1a4a8a', '#8ae0ff', '#ffffff') });
  mat('m4cape', '#1e3a6a', { dark: 0.16, shift: 16 });
  // 화염 무희
  mat('m4danSkin', '#e8a07a', { dark: 0.22 });
  mat('m4silk', '#c8241e', { spec: 0.5, shin: 12, dark: 0.2, shift: 14 });
  mat('m4silkL', '#ff7a2a', { spec: 0.5, dark: 0.22 });
  mat('m4flame', '', { emit: true, ramp: emitRamp('#8a1a06', '#ff7a1a', '#fff0a0') });
  mat('m4flameD', '', { emit: true, ramp: emitRamp('#5a0a06', '#e0401a', '#ffb050') });
  mat('m4fan', '#f0d8a8', { dark: 0.22 });
  // 강시술사
  mat('m4taoRobe', '#1a1a26', { dark: 0.12, shift: 18 });
  mat('m4taoRobeL', '#2e2e42', { dark: 0.16, shift: 18 });
  mat('m4taoTrim', '#d8b02a', { spec: 0.6, dark: 0.22 });
  mat('m4pale', '#d8ccbc', { dark: 0.24 });
  mat('m4beard', '#e8e4dc', { dark: 0.24 });
  mat('m4paper', '#f0d860', { dark: 0.2 });
  mat('m4ink', '#b81a1a', { solid: true });
  mat('m4bell', '#c89a3a', { spec: 0.9, shin: 18, dark: 0.26 });
  // 공허 직조자
  mat('m4void', '#1e1436', { spec: 0.5, shin: 12, dark: 0.14, shift: 18 });
  mat('m4voidL', '#3a2a62', { spec: 0.6, shin: 14, dark: 0.18, shift: 18 });
  mat('m4rune', '', { emit: true, ramp: emitRamp('#0a4a4a', '#5ef0d0', '#e8fff8') });
  mat('m4thread', '', { emit: true, ramp: emitRamp('#3a1a6a', '#c8a0ff', '#ffffff') });
  // 독두꺼비 왕
  mat('m4toad', '#4a7a3a', { spec: 0.6, shin: 12, dark: 0.18, shift: 14 });
  mat('m4toadD', '#2e4e26', { dark: 0.16, shift: 14 });
  mat('m4toadB', '#c8c07a', { dark: 0.22 });
  mat('m4wart', '#8a6a2a', { spec: 0.5, dark: 0.2 });
  mat('m4tongue', '#d84a6a', { spec: 0.6, dark: 0.2 });
  mat('m4sash', '#6a2a8a', { dark: 0.18 });
  // 전갈 여왕
  mat('m4carap', '#7a3a1a', { spec: 0.8, shin: 18, dark: 0.18, shift: 14 });
  mat('m4carapD', '#4a1e10', { spec: 0.6, shin: 14, dark: 0.16, shift: 14 });
  mat('m4carapL', '#b0602a', { spec: 0.8, shin: 18, dark: 0.22 });
  mat('m4sting', '', { emit: true, ramp: emitRamp('#3a5a0a', '#c8ff3a', '#f4ffd0') });
  // 설산 대왕
  mat('m4fur', '#d8e4ee', { dark: 0.26, shift: 12 });
  mat('m4furD', '#98aec4', { dark: 0.22, shift: 12 });
  mat('m4face', '#5a6a8a', { dark: 0.18 });
  mat('m4ice', '#a8dcf4', { spec: 0.95, shin: 22, dark: 0.28 });
  // 염마 거인
  mat('m4magma', '#3a1e1a', { spec: 0.4, shin: 10, dark: 0.14, shift: 16 });
  mat('m4magmaL', '#5a2e22', { spec: 0.5, dark: 0.18, shift: 16 });
  mat('m4crack', '', { emit: true, ramp: emitRamp('#8a1a06', '#ff8a1a', '#fff4b0') });
  mat('m4horn', '#2a1e1e', { spec: 0.7, shin: 16, dark: 0.2 });
  mat('m4hammer', '#4a4a54', { spec: 0.7, shin: 16, dark: 0.18 });
  // 틈의 히드라
  mat('m4hyd', '#1e3a46', { spec: 0.6, shin: 14, dark: 0.16, shift: 16 });
  mat('m4hydL', '#3a6a72', { spec: 0.7, shin: 14, dark: 0.2, shift: 16 });
  mat('m4hydB', '#a8c8b8', { dark: 0.22 });
  mat('m4headG', '#3a7a2a', { spec: 0.6, shin: 12, dark: 0.18 });
  mat('m4headR', '#9a2a1a', { spec: 0.6, shin: 12, dark: 0.18 });
  mat('m4headB', '#2a5a9a', { spec: 0.6, shin: 12, dark: 0.18 });

  // ================= 만독파파: 굽은 등의 독곡 노파, 삿갓, 국자를 든 손, 옆에서 끓는 독탕 솥 =================
  M('poison_witch', 'forest', 96, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t), y = function (v) { return v + b; }, w = wave(t);
    var lad = atk ? [6, y(38)] : [18, y(50)];
    var bub = [];
    for (var i = 0; i < 5; i++) { var ph = (t + i / 5) % 1; bub.push(E(62 + Math.sin(i * 2.1) * 9, 66 - ph * 22, 2.4 - ph * 1.2, 2.4 - ph * 1.2, 'm4brew', { line: false, ao: false, emitLv: 3 })); }
    return { w: 88, h: 92, cx: 40, tipAttack: [lad[0] - 2, lad[1]], glow: [{ x: 62, y: 68, r: 16, c: '#6aff2a', k: 0.45 }], parts: concat([
      // 솥(뒤쪽 오른편)
      E(62, 80, 17, 11, 'm4iron', { g: 'pot' }), E(62, 70, 16, 4, 'm4iron', { g: 'rim' }),
      E(62, 70, 13, 3, 'm4brew', { line: false, ao: false, emitLv: 3 }),
      C(48, 88, 46, 92, 1.6, 1.6, 'm4iron', { line: false }), C(76, 88, 78, 92, 1.6, 1.6, 'm4iron', { line: false }),
      // 뒷팔과 지팡이
      C(48, y(42), 54, y(56), 3, 2.6, 'm4hag', { g: 'armB' }), C(56, y(30), 50, 90, 1.6, 1.6, 'm4wood', { g: 'staff' }),
      E(56, y(28), 3.4, 3.4, 'm4brew', { line: false, emitLv: 2 }),
      // 몸: 굽은 등의 누더기 도포
      P([[22, y(40)], [44, y(30)], [56, y(44)], [54 + w, y(88)], [16, y(88)], [20, y(60)]], 'm4hagRobe', { g: 'robe', bev: 1.4 }),
      P([[20, y(62)], [30, y(58)], [34, y(88)], [16, y(88)]], 'm4hagRobeD', { line: false, bev: 0 }),
      P([[40, y(88)], [46, y(84)], [50, y(88)]], 'm4hagRobeD', { line: false }), P([[22, y(88)], [26, y(84)], [30, y(88)]], 'm4hagRobeD', { line: false }),
      // 머리: 흰 머리칼, 매부리코, 삿갓
      C(36, y(26), 46, y(46), 4, 2, 'm4hair', { g: 'hairB' }),
      E(32, y(28), 8, 8.6, 'm4hag', { g: 'head' }),
      P([[25, y(28)], [20, y(33)], [25, y(32)]], 'm4hag', { g: 'nose', bev: 0.5 }),
      eye(27, y(26), 1.6, 1.2, 'm4eyeG'), eye(32, y(25.5), 1.3, 1, 'm4eyeG'),
      C(26, y(34), 31, y(35), 0.6, 0.6, 'm4mouth', { line: false }),
      P([[14, y(22)], [32, y(10)], [52, y(22)], [44, y(24)], [22, y(24)]], 'm4straw', { g: 'hat', bev: 1 }),
      C(18, y(22), 48, y(22), 0.7, 0.7, 'm4wood', { line: false }),
      C(30, y(12), 34, y(16), 0.6, 0.6, 'm4wood', { line: false }),
      // 앞팔과 독 국자
      C(28, y(42), lad[0] + 6, lad[1] + 2, 3, 2.6, 'm4hag', { g: 'armF' }), E(lad[0] + 5, lad[1] + 2, 2.8, 2.8, 'm4hag', { g: 'armF' }),
      C(lad[0] + 6, lad[1] + 4, lad[0] - 1, lad[1] - 6, 1, 1, 'm4wood', { g: 'ladle' }),
      E(lad[0] - 2, lad[1] - 8, 3.4, 2.4, 'm4iron', { g: 'ladle' }), E(lad[0] - 2, lad[1] - 9, 2.4, 1.2, 'm4brew', { line: false, emitLv: atk ? 5 : 3 })
    ], bub) };
  });

  // ================= 아누비스 수문장: 승냥이 머리, 금빛 목장식, 흰 허리옷, 앞으로 겨눈 긴 창 =================
  M('anubis_guard', 'desert', 104, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1.2), y = function (v) { return v + b; };
    var hand = atk ? [20, y(50)] : [28, y(56)], tip = atk ? [-4, y(46)] : [10, y(14)], butt = atk ? [62, y(56)] : [38, 98];
    return { w: 84, h: 100, cx: 44, tipAttack: [tip[0], tip[1]], glow: [{ x: 38, y: y(22), r: 10, c: '#ffd23a', k: 0.35 }], parts: [
      // 다리
      C(48, y(64), 54, 94, 4.4, 3.6, 'm4jackal', { g: 'legB' }), B(56, 96, 5, 2.4, 3, 'm4goldD', { g: 'legB' }),
      C(40, y(64), 34, 94, 4.6, 3.6, 'm4jackal', { g: 'legF' }), B(32, 96, 5.4, 2.4, 3, 'm4goldD', { g: 'legF' }),
      // 뒷팔과 방패(원반)
      C(56, y(36), 64, y(52), 3.6, 3.2, 'm4jackal', { g: 'armB' }),
      E(68, y(54), 10, 12, 'm4gold', { g: 'shield' }), E(68, y(54), 6, 7.6, 'm4lapis', { g: 'shield', line: false }), E(68, y(54), 2.2, 2.6, 'm4gold', { line: false }),
      // 몸통과 허리옷
      B(46, y(46), 12, 14, 3, 'm4jackal', { g: 'torso' }),
      P([[32, y(58)], [60, y(58)], [64, y(76)], [28, y(76)]], 'm4linen', { g: 'kilt', bev: 1 }),
      C(32, y(58), 60, y(58), 2, 2, 'm4gold', { line: false }), P([[42, y(60)], [50, y(60)], [48, y(78)], [44, y(78)]], 'm4gold', { line: false, bev: 0.4 }),
      // 목장식(우세크)
      P([[32, y(32)], [60, y(32)], [56, y(42)], [36, y(42)]], 'm4gold', { g: 'collar', bev: 1 }),
      C(34, y(36), 58, y(36), 1, 1, 'm4lapis', { line: false }), C(36, y(40), 56, y(40), 0.8, 0.8, 'm4lapis', { line: false }),
      // 머리: 길쭉한 주둥이, 높이 선 귀
      E(46, y(22), 9, 9, 'm4jackal', { g: 'head' }),
      P([[40, y(20)], [24, y(26)], [26, y(30)], [42, y(30)]], 'm4jackal', { g: 'snout', bev: 1 }),
      E(25, y(27), 2, 1.6, 'm4jackalL', { line: false }),
      P([[44, y(14)], [42, y(-6)], [50, y(10)]], 'm4jackal', { g: 'earF', bev: 0.8 }), P([[44, y(10)], [43.5, y(-2)], [47, y(9)]], 'm4jackalL', { line: false }),
      P([[50, y(14)], [54, y(-4)], [56, y(14)]], 'm4jackal', { g: 'earB', bev: 0.8 }),
      eye(39, y(19), 2, 1, 'm4eyeY', -0.2),
      C(30, y(30), 40, y(30), 0.5, 0.5, 'm4mouth', { line: false }),
      // 머리띠
      C(40, y(14), 54, y(16), 1, 1, 'm4gold', { line: false }),
      // 앞팔과 창
      C(36, y(36), hand[0] + 4, hand[1], 3.8, 3.2, 'm4jackal', { g: 'armF' }), C(hand[0] + 3, hand[1] - 1, hand[0] + 6, hand[1] + 1, 2.4, 2.4, 'm4gold', { line: false }),
      C(butt[0], butt[1], tip[0], tip[1], 1.2, 1.2, 'm4wood', { g: 'spear' }),
      P([[tip[0], tip[1]], [tip[0] + (atk ? 9 : 2), tip[1] + (atk ? -3 : 9)], [tip[0] + (atk ? 9 : 5), tip[1] + (atk ? 3 : 8)]], 'm4spear', { g: 'tip', bev: 0.4 }),
      E(hand[0], hand[1], 3.4, 3.4, 'm4jackal', { g: 'armF' })
    ] };
  });

  // ================= 서리 기사: 얼음 갑주, 얼음 결정 투구 깃, 왼손 긴 창, 뒤로 휘날리는 망토 =================
  M('ice_knight', 'snow', 104, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1.2), y = function (v) { return v + b; }, w = wave(t) * 2;
    var hand = atk ? [22, y(52)] : [28, y(56)], tip = atk ? [-4, y(50)] : [6, y(24)];
    var crys = [];
    for (var i = 0; i < 4; i++) { var a = -1.2 + i * 0.35; crys.push(P([[44 + i * 3, y(10)], [44 + i * 3 + Math.cos(a) * 3, y(10) - 10 + i], [47 + i * 3, y(10)]], 'm4iceCry', { line: false, emitLv: 3 })); }
    return { w: 88, h: 100, cx: 46, tipAttack: [tip[0], tip[1]], glow: [{ x: 40, y: y(22), r: 10, c: '#8ae0ff', k: 0.4 }], parts: concat([
      // 망토
      P([[50, y(30)], [70, y(34)], [78 + w, y(90)], [54, y(88)]], 'm4cape', { g: 'cape', bev: 1.2 }),
      // 다리(갑주)
      C(50, y(64), 56, 94, 5, 4.2, 'm4iceArmD', { g: 'legB' }), B(58, 96, 6, 3, 2, 'm4iceArm', { g: 'legB' }),
      C(42, y(64), 36, 94, 5.2, 4.4, 'm4iceArm', { g: 'legF' }), B(34, 96, 6.4, 3, 2, 'm4iceArmD', { g: 'legF' }),
      // 뒷팔과 방패
      C(58, y(36), 64, y(54), 4, 3.6, 'm4iceArmD', { g: 'armB' }),
      P([[60, y(40)], [76, y(40)], [78, y(62)], [68, y(76)], [58, y(62)]], 'm4iceArm', { g: 'shield', bev: 1.6 }),
      C(68, y(44), 68, y(70), 1.2, 1.2, 'm4iceCry', { line: false, emitLv: 2 }), C(61, y(52), 76, y(52), 1.2, 1.2, 'm4iceCry', { line: false, emitLv: 2 }),
      // 몸통
      B(46, y(48), 13, 16, 3, 'm4iceArm', { g: 'torso' }), B(46, y(40), 11, 5, 2, 'm4iceArmD', { line: false }),
      P([[40, y(46)], [52, y(46)], [46, y(56)]], 'm4iceCry', { line: false, emitLv: 2 }),
      C(34, y(64), 58, y(64), 2.4, 2.4, 'm4iceArmD', { line: false }),
      // 투구: 앞이 뚫린 얼굴 가리개, 빛나는 눈 틈
      B(44, y(22), 9, 10, 4, 'm4iceArm', { g: 'helm' }),
      P([[34, y(22)], [44, y(30)], [36, y(32)]], 'm4iceArmD', { g: 'visor', bev: 0.6 }),
      C(36, y(21), 44, y(21), 1, 1, 'm4eyeB', { line: false, emitLv: 3 }),
      C(44, y(12), 44, y(32), 0.8, 0.8, 'm4iceArmD', { line: false }),
      // 어깨
      E(36, y(36), 7, 5, 'm4iceArmD', { g: 'paul' }), P([[30, y(34)], [32, y(26)], [38, y(33)]], 'm4iceCry', { line: false, emitLv: 2 }),
      // 앞팔과 창
      C(36, y(38), hand[0] + 4, hand[1], 4, 3.4, 'm4iceArm', { g: 'armF' }),
      C(hand[0] + 24, hand[1] + (atk ? 2 : 22), tip[0], tip[1], 1.6, 1, 'm4iceArmD', { g: 'lance' }),
      P([[tip[0] + (atk ? 12 : 4), tip[1] + (atk ? -4 : 10)], [tip[0], tip[1]], [tip[0] + (atk ? 12 : 9), tip[1] + (atk ? 4 : 7)]], 'm4iceCry', { line: false, emitLv: 3 }),
      E(hand[0], hand[1], 3.6, 3.6, 'm4iceArmD', { g: 'armF' })
    ], crys) };
  });

  // ================= 화염 무희: 불꽃 머리칼, 붉은 비단, 두 손의 쥘부채, 몸을 휘감는 불꽃 띠 =================
  M('flame_dancer', 'volcano', 100, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1.4), y = function (v) { return v + b; }, w = wave(t), w2 = wave(t, 1.6);
    var hF = atk ? [10, y(40)] : [18, y(30) + w * 2], hB = atk ? [62, y(28)] : [62, y(36) - w * 2];
    var ribbon = [];
    for (var i = 0; i < 7; i++) { var a = t * TAU + i * 0.9; ribbon.push(E(44 + Math.cos(a) * (22 - i), y(56) + Math.sin(a) * 8 - i * 4, 3 - i * 0.2, 2.2, i % 2 ? 'm4flameD' : 'm4flame', { line: false, ao: false, emitLv: 2 + (i % 3) })); }
    function fan(x, y0, a) {
      var pts = [[x, y0]];
      for (var k = 0; k <= 4; k++) { var aa = a - 0.8 + k * 0.4; pts.push([x + Math.cos(aa) * 12, y0 + Math.sin(aa) * 12]); }
      return [P(pts, 'm4fan', { g: 'fan' + x, bev: 0.6 }), C(x, y0, x + Math.cos(a) * 11, y0 + Math.sin(a) * 11, 0.5, 0.5, 'm4silk', { line: false }),
        E(x + Math.cos(a) * 12, y0 + Math.sin(a) * 12, 2.4, 2.4, 'm4flame', { line: false, ao: false, emitLv: 4 })];
    }
    var hair = [];
    for (var j = 0; j < 6; j++) { var ph = (t + j / 6) % 1; hair.push(E(48 + j * 2 + ph * 6, y(14) - ph * 14 + j, 4 - ph * 2.4, 5 - ph * 3, j % 2 ? 'm4flame' : 'm4flameD', { line: false, ao: false, emitLv: 3 })); }
    return { w: 84, h: 98, cx: 42, tipAttack: [hF[0] - 10, hF[1] - 6], glow: [{ x: 44, y: y(48), r: 24, c: '#ff6a1a', k: 0.35 }], parts: concat(hair, [
      // 다리와 치마
      C(46, y(70), 54, 94, 3.2, 2.4, 'm4danSkin', { g: 'legB' }), C(40, y(70), 30, 92, 3.4, 2.4, 'm4danSkin', { g: 'legF' }),
      P([[32, y(56)], [56, y(56)], [66 + w2 * 3, y(84)], [24 - w2 * 3, y(84)]], 'm4silk', { g: 'skirt', bev: 1 }),
      P([[36, y(60)], [44, y(60)], [38 + w2 * 2, y(84)], [30 - w2 * 2, y(84)]], 'm4silkL', { line: false, bev: 0 }),
      C(32, y(56), 56, y(56), 1.8, 1.8, 'm4gold', { line: false }),
      // 뒷팔과 뒷부채
      C(52, y(36), hB[0], hB[1], 2.4, 2, 'm4danSkin', { g: 'armB' })
    ], fan(hB[0], hB[1], -1.2), [
      // 몸통
      B(44, y(46), 9, 10, 3, 'm4danSkin', { g: 'torso' }),
      P([[35, y(38)], [53, y(38)], [52, y(48)], [36, y(48)]], 'm4silk', { g: 'top', bev: 0.8 }),
      C(36, y(42), 52, y(42), 0.8, 0.8, 'm4gold', { line: false }),
      // 머리: 얼굴 가리개(면사)와 금장식
      E(44, y(24), 7.6, 8, 'm4danSkin', { g: 'head' }),
      P([[38, y(14)], [52, y(14)], [54, y(26)], [50, y(20)], [40, y(18)]], 'm4flameD', { g: 'hairF', bev: 0.6, emitLv: 2 }),
      eye(39, y(23), 1.6, 1.1, 'm4eyeY', -0.1), eye(44, y(23), 1.4, 1, 'm4eyeY', 0.1),
      P([[36, y(27)], [48, y(27)], [46, y(36)], [38, y(36)]], 'm4silkL', { g: 'veil', bev: 0.4 }),
      C(40, y(14), 50, y(14), 1, 1, 'm4gold', { line: false }), E(45, y(14), 1.6, 1.6, 'm4flame', { line: false, emitLv: 4 }),
      // 앞팔과 앞부채
      C(38, y(36), hF[0] + 2, hF[1], 2.4, 2, 'm4danSkin', { g: 'armF' })
    ], fan(hF[0], hF[1], atk ? 3.4 : 3.8), ribbon) };
  });

  // ================= 강시술사: 검은 도포의 늙은 도사, 높은 관, 흰 수염, 방울과 떠다니는 혈부 =================
  M('jiangshi_master', 'castle', 100, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t), y = function (v) { return v + b; }, w = wave(t);
    var hF = atk ? [10, y(38)] : [20, y(46)];
    var tal = [];
    for (var i = 0; i < 5; i++) {
      var a = t * TAU + i * TAU / 5, tx = 46 + Math.cos(a) * 30, ty = y(44) + Math.sin(a) * 10;
      tal.push(B(tx, ty, 2.6, 5, 1, 'm4paper', { rot: Math.sin(a) * 0.3, g: 'tl' + i }));
      tal.push(C(tx, ty - 3, tx, ty + 3, 0.5, 0.5, 'm4ink', { line: false, ao: false }));
    }
    return { w: 84, h: 98, cx: 44, tipAttack: [hF[0] - 4, hF[1] - 4], glow: [{ x: 44, y: y(44), r: 22, c: '#ff3a3a', k: 0.25 }], parts: concat(tal.slice(0, 4), [
      // 도포
      C(50, y(36), 60, y(56), 3.6, 3.4, 'm4taoRobe', { g: 'armB' }), E(61, y(58), 3, 3, 'm4pale', { g: 'armB' }),
      P([[30, y(32)], [58, y(32)], [66 + w, y(92)], [22 - w, y(92)]], 'm4taoRobe', { g: 'robe', bev: 1.4 }),
      P([[40, y(34)], [48, y(34)], [50, y(92)], [38, y(92)]], 'm4taoRobeL', { line: false, bev: 0 }),
      C(42, y(34), 40, y(92), 1, 1, 'm4taoTrim', { line: false }), C(46, y(34), 48, y(92), 1, 1, 'm4taoTrim', { line: false }),
      // 팔괘 문양
      E(44, y(62), 6, 6, 'm4taoTrim', { line: false }), E(44, y(62), 4, 4, 'm4taoRobe', { line: false }),
      P([[44, y(58)], [48, y(62)], [44, y(66)]], 'm4pale', { line: false, bev: 0 }),
      C(32, y(56), 56, y(56), 1.6, 1.6, 'm4taoTrim', { line: false }),
      // 머리: 수척한 얼굴, 긴 흰 수염, 높은 도관
      E(44, y(22), 7.6, 8.4, 'm4pale', { g: 'head' }),
      P([[38, y(26)], [50, y(26)], [46, y(46)], [42, y(44)]], 'm4beard', { g: 'beard', bev: 0.6 }),
      C(37, y(18), 42, y(19), 0.6, 0.6, 'm4taoRobe', { line: false }),
      eye(39, y(21), 1.4, 0.9, 'm4eyeR'), eye(44, y(21), 1.2, 0.8, 'm4eyeR'),
      B(44, y(8), 6, 6, 2, 'm4taoRobe', { g: 'hat' }), C(36, y(13), 52, y(13), 1.4, 1.4, 'm4taoRobe', { g: 'hat' }),
      E(44, y(7), 2, 2, 'm4taoTrim', { line: false }),
      // 앞팔: 방울과 붉은 술
      C(36, y(36), hF[0] + 4, hF[1], 3.4, 3, 'm4taoRobe', { g: 'armF' }), E(hF[0] + 3, hF[1], 2.8, 2.8, 'm4pale', { g: 'armF' }),
      C(hF[0] + 2, hF[1] - 1, hF[0] - 2, hF[1] - 6, 0.6, 0.6, 'm4ink', { line: false }),
      E(hF[0] - 3, hF[1] - 8, 3.4, 3.8, 'm4bell', { g: 'bell' }), E(hF[0] - 3, hF[1] - 5, 1, 1, 'm4goldD', { line: false }),
      P([[hF[0] + 3, hF[1] + 2], [hF[0] + 5, hF[1] + 10], [hF[0] + 1, hF[1] + 10]], 'm4ink', { line: false })
    ], tal.slice(4)) };
  });

  // ================= 공허 직조자: 룬이 박힌 둥근 배, 여덟 다리, 뿔 난 머리, 등 뒤로 걸린 빛나는 실 =================
  M('void_weaver', 'rift', 104, function (t, pose) {
    var atk = pose === 'attack', b = wave(t) * 1.6, y = function (v) { return v - b; }, ph = t * TAU;
    var legs = [];
    [[30, 76, 4], [40, 80, 3], [56, 80, 2], [66, 76, 1]].forEach(function (L, i) {
      var k = Math.sin(ph + i * 1.3) * 2, fx = L[0] - 18 + i * 4 + (atk && i === 0 ? -10 : 0), fy = 96;
      legs.push(C(L[0], y(60), L[0] - 10 + i * 2, y(46) + k, 2.4, 2, i % 2 ? 'm4void' : 'm4voidL', { g: 'lu' + i }));
      legs.push(C(L[0] - 10 + i * 2, y(46) + k, fx, fy - (i === 0 && atk ? 30 : 0), 2, 1, i % 2 ? 'm4void' : 'm4voidL', { g: 'll' + i }));
    });
    var threads = [];
    for (var j = 0; j < 4; j++) threads.push(C(64 + j * 4, y(44), 74 + j * 6, -2, 0.4, 0.4, 'm4thread', { line: false, ao: false, emitLv: 2 }));
    return { w: 100, h: 100, cx: 50, tipAttack: [8, 56], glow: [{ x: 66, y: y(50), r: 18, c: '#5ef0d0', k: 0.35 }], parts: concat(threads, legs.slice(4), [
      // 배: 룬 고리
      E(68, y(52), 20, 17, 'm4void', { g: 'abdomen' }),
      E(70, y(50), 11, 9, 'm4rune', { line: false, ao: false, emitLv: 2 }), E(70, y(50), 6, 5, 'm4void', { line: false }),
      C(54, y(46), 84, y(46), 0.6, 0.6, 'm4rune', { line: false, emitLv: 3 }), C(56, y(60), 82, y(60), 0.6, 0.6, 'm4rune', { line: false, emitLv: 3 }),
      // 앞몸통과 머리
      E(42, y(52), 13, 11, 'm4voidL', { g: 'thorax' }),
      E(30, y(44), 10, 9, 'm4void', { g: 'head' }),
      P([[30, y(36)], [24, y(20)], [34, y(34)]], 'm4voidL', { g: 'hornF', bev: 0.6 }), P([[36, y(36)], [40, y(22)], [40, y(36)]], 'm4voidL', { g: 'hornB', bev: 0.6 }),
      eye(24, y(42), 1.8, 1.8, 'm4eyeV'), eye(29, y(41), 1.6, 1.6, 'm4eyeV'), eye(25, y(47), 1.2, 1.2, 'm4eyeV'), eye(30, y(46.5), 1.1, 1.1, 'm4eyeV'),
      // 독니
      C(22, y(50), 18 - (atk ? 4 : 0), y(58), 1.4, 0.4, 'm4tooth', { g: 'fangF' }), C(28, y(52), 26 - (atk ? 2 : 0), y(60), 1.2, 0.4, 'm4tooth', { g: 'fangB' })
    ], legs.slice(0, 4)) };
  });

  // ================= 천년 독두꺼비 왕: 거대한 두꺼비, 금관, 혹투성이 등, 보랏빛 띠, 공격 때 혀를 내뻗는다 =================
  M('toad_king', 'forest', 124, function (t, pose) {
    var atk = pose === 'attack', br = 1 + Math.sin(t * TAU) * 0.03, b = S.bob(t, 1.4), y = function (v) { return v + b; };
    var warts = [];
    [[70, 46, 3], [82, 52, 2.6], [62, 38, 2.4], [90, 64, 2.2], [76, 34, 2], [56, 52, 2]].forEach(function (q, i) { warts.push(E(q[0], y(q[1]), q[2], q[2] * 0.9, 'm4wart', { g: 'w' + i })); });
    return { w: 120, h: 118, cx: 62, tipAttack: atk ? [-2, 64] : [20, 70], glow: [{ x: 40, y: y(70), r: 16, c: '#8aff3a', k: 0.3 }], parts: concat([
      // 뒷다리
      E(92, y(92), 20, 14, 'm4toadD', { g: 'legB' }), E(98, 108, 12, 5, 'm4toadD', { g: 'footB' }),
      // 몸
      E(66, y(68) , 46 * br, 36 * br, 'm4toad', { g: 'body' }),
      E(54, y(82), 30, 18, 'm4toadB', { g: 'belly', line: false }),
      C(40, y(64), 92, y(70), 3, 3, 'm4sash', { line: false }), E(46, y(66), 4, 4, 'm4gold', { line: false }),
      // 앞다리
      C(40, y(84), 28, 106, 7, 6, 'm4toad', { g: 'legF' }), E(24, 108, 11, 4.6, 'm4toadD', { g: 'footF' }),
      // 머리: 큰 눈, 넓은 입
      E(40, y(48), 26, 18, 'm4toad', { g: 'head' }),
      E(32, y(32), 8, 8, 'm4toad', { g: 'eyeL' }), E(52, y(30), 7.6, 7.6, 'm4toad', { g: 'eyeR' }),
      eye(30.5, y(32), 4, 4.4, 'm4eyeY'), C(30.5, y(29.5), 30.5, y(34.5), 0.8, 0.8, 'm4mouth', { line: false }),
      eye(51, y(30), 3.6, 4, 'm4eyeY'), C(51, y(28), 51, y(32), 0.7, 0.7, 'm4mouth', { line: false }),
      atk ? P([[16, y(52)], [56, y(56)], [50, y(68)], [20, y(64)]], 'm4mouth', { g: 'mouth', bev: 0.6 }) : C(16, y(56), 56, y(58), 1.2, 1, 'm4mouth', { line: false }),
      atk ? C(30, y(60), -2, y(64), 3.4, 2.6, 'm4tongue', { g: 'tongue' }) : null,
      atk ? E(-1, y(64), 4, 3.4, 'm4tongue', { g: 'tongue' }) : null,
      // 금관
      P([[30, y(22)], [32, y(10)], [38, y(18)], [44, y(6)], [50, y(18)], [56, y(10)], [58, y(22)]], 'm4gold', { g: 'crown', bev: 1 }),
      E(44, y(16), 2, 2, 'm4eyeG', { line: false, emitLv: 3 })
    ].filter(Boolean), warts) };
  });

  // ================= 전갈 여왕: 왕관 쓴 거대한 전갈, 머리 위로 휜 독침 꼬리, 앞으로 벌린 두 집게 =================
  M('scorpion_queen', 'desert', 124, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1.2), y = function (v) { return v + b; }, ph = t * TAU;
    var tail = atk ? [[80, 70], [96, 52], [100, 30], [88, 14], [66, 14], [44, 28]] : [[80, 70], [100, 56], [106, 34], [98, 14], [80, 6], [66, 14]];
    var tailParts = [];
    for (var i = 0; i < tail.length - 1; i++) tailParts.push(C(tail[i][0], y(tail[i][1]), tail[i + 1][0], y(tail[i + 1][1]), 7 - i, 6 - i, i % 2 ? 'm4carapD' : 'm4carap', { g: 'tl' + i }));
    var st = tail[tail.length - 1];
    var legs = [];
    // 다리: 앞 둘은 앞으로, 뒤 둘은 뒤로 벌려 무릎을 세운다
    [[54, -16, 30], [62, -9, 46], [76, 10, 96], [86, 18, 114]].forEach(function (L, k) {
      var sw = Math.sin(ph + k) * 1.6, kx = L[0] + L[1] + sw, ky = y(94);
      legs.push(C(L[0], y(82), kx, ky, 2.8, 2.4, k % 2 ? 'm4carap' : 'm4carapD', { g: 'lu' + k }), C(kx, ky, L[2] + sw, 112, 2.4, 1, k % 2 ? 'm4carap' : 'm4carapD', { g: 'll' + k }));
    });
    var claw = atk ? [6, y(66)] : [14, y(76)];
    return { w: 120, h: 118, cx: 62, tipAttack: atk ? [st[0] - 10, y(st[1]) + 8] : [claw[0] - 6, claw[1]], glow: [{ x: st[0], y: y(st[1]), r: 10, c: '#c8ff3a', k: 0.55 }], parts: concat(legs, [
      // 몸통 마디
      E(76, y(80), 20, 12, 'm4carap', { g: 'body' }), E(62, y(78), 18, 12, 'm4carapL', { g: 'body2' }),
      C(60, y(72), 90, y(76), 1, 1, 'm4carapD', { line: false })
    ], tailParts, [
      P([[st[0] - 4, y(st[1]) - 2], [st[0] - 14, y(st[1]) + 8], [st[0] + 2, y(st[1]) + 4]], 'm4sting', { g: 'sting', bev: 0.4, emitLv: 4 }),
      // 머리와 왕관
      E(44, y(74), 14, 11, 'm4carap', { g: 'head' }),
      eye(36, y(70), 2, 1.6, 'm4eyeR'), eye(42, y(69), 1.8, 1.4, 'm4eyeR'), eye(38.5, y(74), 1.2, 1, 'm4eyeR'),
      P([[34, y(64)], [36, y(54)], [40, y(60)], [44, y(50)], [48, y(60)], [52, y(54)], [54, y(64)]], 'm4gold', { g: 'crown', bev: 1 }),
      E(44, y(58), 1.8, 1.8, 'm4lapis', { line: false }),
      // 집게
      C(46, y(80), 26, y(86), 4.6, 4, 'm4carapD', { g: 'armB' }), E(22, y(86), 8, 6, 'm4carap', { g: 'clawB' }),
      C(38, y(76), claw[0] + 10, claw[1], 5, 4.4, 'm4carap', { g: 'armF' }),
      P([[claw[0] + 12, claw[1] - 6], [claw[0] - 6, claw[1] - 8], [claw[0] - 2, claw[1] - 2], [claw[0] + 10, claw[1]]], 'm4carapL', { g: 'clawF1', bev: 0.8 }),
      P([[claw[0] + 12, claw[1] + 2], [claw[0] - 4, claw[1] + 6], [claw[0], claw[1] + 1], [claw[0] + 10, claw[1] - 1]], 'm4carap', { g: 'clawF2', bev: 0.8 })
    ]) };
  });

  // ================= 설산 대왕: 흰 털의 거대한 설인, 얼음 왕관과 어깨 고드름, 내려치는 두 주먹 =================
  M('yeti_king', 'snow', 128, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1.6), y = function (v) { return v + b; };
    var fist = atk ? [14, y(56)] : [22, y(86)], fistB = atk ? [92, y(40)] : [96, y(84)];
    var spikes = [];
    [[30, 40, -0.6], [38, 32, -0.3], [86, 34, 0.3], [94, 42, 0.6]].forEach(function (q, i) { spikes.push(P([[q[0] - 3, y(q[1])], [q[0] + Math.sin(q[2]) * 10, y(q[1]) - 12], [q[0] + 3, y(q[1])]], 'm4ice', { g: 'sp' + i, bev: 0.4 })); });
    return { w: 120, h: 124, cx: 62, tipAttack: [fist[0] - 4, fist[1]], glow: [{ x: 58, y: y(18), r: 12, c: '#8ae0ff', k: 0.4 }], parts: concat([
      // 다리
      C(70, y(92), 80, 118, 11, 9, 'm4furD', { g: 'legB' }), E(82, 120, 11, 4, 'm4face', { g: 'footB' }),
      C(52, y(92), 42, 118, 12, 9, 'm4fur', { g: 'legF' }), E(38, 120, 12, 4, 'm4face', { g: 'footF' }),
      // 뒷팔
      C(86, y(44), fistB[0], fistB[1] - 6, 9, 8, 'm4furD', { g: 'armB' }), E(fistB[0], fistB[1], 9, 8, 'm4face', { g: 'fistB' }),
      // 몸통
      E(62, y(66), 30, 32, 'm4fur', { g: 'torso' }),
      E(58, y(74), 16, 18, 'm4furD', { g: 'belly', line: false })
    ], spikes, [
      // 머리
      E(58, y(30), 16, 14, 'm4fur', { g: 'head' }),
      E(52, y(34), 10, 8, 'm4face', { g: 'face' }),
      eye(47, y(31), 2, 1.6, 'm4eyeB'), eye(55, y(31), 1.8, 1.5, 'm4eyeB'),
      C(44, y(28), 50, y(29), 1, 0.8, 'm4furD', { line: false }), C(53, y(28), 58, y(29), 0.9, 0.8, 'm4furD', { line: false }),
      P([[44, y(37)], [58, y(37)], [56, y(atk ? 44 : 41)], [46, y(atk ? 44 : 41)]], 'm4mouth', { bev: 0.4 })
    ], teeth(45, 57, y(37), 4, 2, 1), [
      // 얼음 왕관
      P([[44, y(18)], [46, y(4)], [51, y(14)], [57, y(0)], [63, y(14)], [68, y(4)], [70, y(18)]], 'm4ice', { g: 'crown', bev: 1 }),
      E(57, y(12), 2, 2.4, 'm4iceCry', { line: false, emitLv: 4 }),
      // 앞팔과 주먹
      C(40, y(48), fist[0] + 6, fist[1] - 4, 10, 9, 'm4fur', { g: 'armF' }), E(fist[0], fist[1], 10, 9, 'm4face', { g: 'fistF' }),
      C(fist[0] - 6, fist[1] - 3, fist[0] + 2, fist[1] - 6, 1, 1, 'm4furD', { line: false })
    ]) };
  });

  // ================= 염마 거인: 갈라진 마그마 살갗의 거인, 뿔 투구, 불꽃 수염, 어깨에 멘 용암 망치 =================
  M('fire_giant', 'volcano', 132, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1.6), y = function (v) { return v + b; };
    var hand = atk ? [24, y(66)] : [30, y(52)], head = atk ? [-6, y(80)] : [20, y(8)];
    var beard = [];
    for (var i = 0; i < 6; i++) { var ph = (t + i / 6) % 1; beard.push(E(52 + Math.sin(i * 1.9) * 6, y(40) + ph * 14, 5 - ph * 3, 4 - ph * 2, i % 2 ? 'm4flameD' : 'm4flame', { line: false, ao: false, emitLv: 3 })); }
    var cracks = [
      C(54, y(52), 62, y(70), 0.8, 0.6, 'm4crack', { line: false, emitLv: 3 }), C(70, y(56), 64, y(78), 0.8, 0.6, 'm4crack', { line: false, emitLv: 3 }),
      C(48, y(74), 58, y(88), 0.7, 0.5, 'm4crack', { line: false, emitLv: 2 }), C(80, y(66), 76, y(84), 0.7, 0.5, 'm4crack', { line: false, emitLv: 2 })
    ];
    var hx = head[0], hy = head[1];
    return { w: 124, h: 128, cx: 64, tipAttack: [hx, hy], glow: [{ x: hx + 4, y: hy + 6, r: 16, c: '#ff7a1a', k: 0.5 }, { x: 64, y: y(66), r: 30, c: '#ff5a1a', k: 0.25 }], parts: concat([
      // 다리
      C(74, y(96), 82, 122, 10, 8, 'm4magma', { g: 'legB' }), B(84, 124, 11, 3, 2, 'm4magmaL', { g: 'footB' }),
      C(56, y(96), 46, 122, 11, 8, 'm4magmaL', { g: 'legF' }), B(44, 124, 12, 3, 2, 'm4magma', { g: 'footF' }),
      C(50, y(100), 46, 118, 0.7, 0.5, 'm4crack', { line: false, emitLv: 2 }),
      // 뒷팔
      C(86, y(48), 98, y(78), 9, 7, 'm4magma', { g: 'armB' }), E(100, y(82), 8, 7, 'm4magmaL', { g: 'armB' }),
      // 몸통과 허리띠
      B(66, y(70), 26, 28, 6, 'm4magmaL', { g: 'torso' }),
      B(66, y(94), 26, 6, 2, 'm4hammer', { g: 'belt' }), E(60, y(94), 5, 5, 'm4gold', { line: false })
    ], cracks, [
      // 머리: 뿔 투구
      E(58, y(30), 14, 13, 'm4magmaL', { g: 'head' }),
      B(58, y(22), 15, 8, 3, 'm4hammer', { g: 'helm' }),
      C(46, y(18), 32, y(4), 4, 1.2, 'm4horn', { g: 'hornF' }), C(70, y(18), 84, y(2), 4, 1.2, 'm4horn', { g: 'hornB' }),
      C(44, y(26), 54, y(28), 1.4, 1.2, 'm4horn', { line: false }), C(56, y(28), 64, y(27), 1.3, 1.1, 'm4horn', { line: false }),
      eye(50, y(30), 2.4, 1.4, 'm4eyeY', -0.2), eye(58, y(30), 2.2, 1.3, 'm4eyeY', -0.2),
      P([[46, y(36)], [60, y(36)], [58, y(atk ? 42 : 40)], [48, y(atk ? 42 : 40)]], 'm4crack', { line: false, emitLv: atk ? 5 : 3 }),
      C(64, y(24), 66, y(36), 0.6, 0.5, 'm4crack', { line: false, emitLv: 2 })
    ], beard, [
      // 앞팔과 망치
      C(44, y(48), hand[0] + 4, hand[1], 9, 7, 'm4magmaL', { g: 'armF' }),
      C(hand[0], hand[1], hx + 6, hy + 6, 2.4, 2.4, 'm4wood', { g: 'haft' }),
      B(hx + 4, hy + 6, 11, 8, 2, 'm4hammer', { g: 'hammer', rot: atk ? 0.3 : -0.4 }),
      C(hx - 2, hy + 4, hx + 10, hy + 8, 1.2, 1.2, 'm4crack', { line: false, emitLv: 4 }),
      E(hand[0], hand[1], 7, 6.4, 'm4magma', { g: 'armF' })
    ]) };
  });

  // ================= 틈의 히드라: 청록 비늘의 몸통에서 뻗은 세 목 — 독(초록) · 불(빨강) · 얼음(파랑) 머리 =================
  M('rift_hydra', 'rift', 128, function (t, pose) {
    var atk = pose === 'attack', b = S.bob(t, 1.4), y = function (v) { return v + b; }, ph = t * TAU;
    function neck(base, mid, head, m) { return chain([base, mid, head], 9, 6.4, m, { g: 'n' + head[0] }); }
    function headP(x, hy, m, em, open) {
      return [E(x, hy, 12, 9, m, { g: 'h' + x }), P([[x - 5, hy - 4], [x - 24, hy + (open ? -4 : 0)], [x - 22, hy + 4], [x - 5, hy + 6]], m, { g: 'sn' + x, bev: 1 }),
        open ? P([[x - 7, hy + 3], [x - 22, hy + 6], [x - 20, hy + 12], [x - 7, hy + 9]], m, { g: 'jaw' + x, bev: 0.8 }) : C(x - 21, hy + 3, x - 6, hy + 4, 0.6, 0.6, 'm4mouth', { line: false }),
        open ? P([[x - 20, hy + 3], [x - 8, hy + 3], [x - 8, hy + 6], [x - 18, hy + 6]], 'm4mouth', { line: false }) : null,
        eye(x - 4, hy - 3, 2.4, 1.8, em, -0.2), P([[x + 2, hy - 8], [x + 14, hy - 18], [x + 8, hy - 5]], 'm4hydB', { line: false, bev: 0.5 }),
        P([[x + 6, hy - 4], [x + 16, hy - 10], [x + 10, hy - 1]], 'm4hydB', { line: false, bev: 0.4 })].filter(Boolean);
    }
    var s1 = Math.sin(ph) * 3, s2 = Math.sin(ph + 2) * 3, s3 = Math.sin(ph + 4) * 3, ax = atk ? -10 : 0;
    var H1 = [38 + ax + s1, y(26)], H2 = [30 + ax + s2, y(56)], H3 = [56 + ax * 0.6 + s3, y(10)];
    return { w: 124, h: 124, cx: 70, tipAttack: [H2[0] - 18, H2[1] + 2], glow: [{ x: H1[0] - 10, y: H1[1], r: 8, c: '#ff5a3a', k: 0.5 }, { x: H2[0] - 10, y: H2[1], r: 8, c: '#8aff3a', k: 0.5 }, { x: H3[0] - 10, y: H3[1], r: 8, c: '#5ad0ff', k: 0.5 }], parts: concat([
      // 꼬리와 다리
      C(96, y(98), 118, 112, 8, 3, 'm4hyd', { g: 'tail' }),
      C(84, y(98), 92, 120, 8, 6, 'm4hyd', { g: 'legB' }), E(92, 122, 9, 3.4, 'm4hydL', { g: 'legB' }),
      // 몸통
      E(76, y(86), 28, 22, 'm4hyd', { g: 'body' }), E(70, y(94), 18, 10, 'm4hydB', { g: 'belly', line: false }),
      P([[66, y(64)], [70, y(56)], [74, y(64)]], 'm4hydL', { line: false }), P([[80, y(66)], [84, y(58)], [88, y(66)]], 'm4hydL', { line: false }),
      E(80, y(80), 6, 6, 'm4rune', { line: false, emitLv: 2 }),
      C(58, y(100), 50, 120, 8, 6, 'm4hydL', { g: 'legF' }), E(48, 122, 10, 3.4, 'm4hyd', { g: 'legF' })
    ], neck([70, y(70)], [62, y(30)], H3, 'm4hyd'), headP(H3[0], H3[1], 'm4headB', 'm4eyeB', false),
      neck([64, y(76)], [50, y(44)], H1, 'm4hydL'), headP(H1[0], H1[1], 'm4headR', 'm4eyeY', atk),
      neck([62, y(82)], [44, y(70)], H2, 'm4hyd'), headP(H2[0], H2[1], 'm4headG', 'm4eyeG', atk)) };
  });

  // ================= 분열한 조각: 원본 그림을 작게 =================
  if (S.has('mushroom')) S.variant('spore', 'mushroom', { h: 44 });
  if (S.has('lava_slime')) S.variant('lava_blob', 'lava_slime', { h: 36 });
})();
