// sprites-murim.js — 무림 몬스터 8종의 도형 도트 그림(15단계)
// 만독곡: 독두꺼비(slime) · 흑풍채 졸개(goblin) · 흑풍채주 마웅(treant)
// 청운문: 혈강시(skeleton) · 혈교 술사(dark_mage) · 혈고 꼭두각시(cursed_armor) · 사부 청운자(baltar) · 혈마 단목천(astaroth)
// 사람 모양은 영웅과 같은 좌표(상자 56×64, 오른쪽을 본다)로 그린 뒤 배율을 곱하고, 좌우를 뒤집어 왼쪽을 보게 한다.
(function () {
  'use strict';
  var S = Game.Shape, E = S.E, C = S.C, B = S.B, P = S.P, L = S.L, mat = S.mat;
  var TAU = S.TAU, wave = S.wave;
  var RIM = { forest: '#b8f07a', castle: '#ff7a8a' };
  function emitRamp(dark, mid, light) { return [S.darken(dark, 0.4), dark, mid, S.mix(mid, light, 0.5), light, '#ffffff']; }
  function concat() { return [].concat.apply([], arguments); }

  mat('blood', '', { emit: true, ramp: emitRamp('#5a0612', '#e0203a', '#ffb0b8') });
  mat('eyeBl', '', { emit: true, ramp: emitRamp('#6a0010', '#ff2a3a', '#ffd0d0') });
  mat('toad', '#6a7a3a', { dark: 0.22, light: 0.14, shift: 18 });
  mat('toadD', '#455228', { dark: 0.16, shift: 18 });
  mat('toadB', '#c9b47a', { dark: 0.26, shift: 20 });
  mat('wart', '', { emit: true, ramp: emitRamp('#2a5a10', '#9aff3a', '#eaffc0') });
  mat('eyeT', '', { emit: true, ramp: emitRamp('#7a5a06', '#ffd02a', '#fff8c0') });
  mat('bandana', '#2a2a32', { dark: 0.16 });
  mat('vestF', '#7a5a3a', { dark: 0.22, shift: 18 });
  mat('vestFL', '#a8845a', { dark: 0.24, shift: 18 });
  mat('skinT', '#c98a5a', { dark: 0.22, light: 0.14, shift: 14 });
  mat('clothR', '#5a2a24', { dark: 0.18 });
  mat('beardK', '#2a2028', { dark: 0.14 });
  mat('jsSkin', '#9fb0a0', { dark: 0.26, shift: 22 });
  mat('qing', '#262036', { dark: 0.14, shift: 20 });
  mat('qingR', '#7a1a2a', { dark: 0.18 });
  mat('talis', '#f2d36a', { solid: true });
  mat('talisR', '#c0302a', { solid: true });
  mat('robeR', '#5a1420', { dark: 0.16, shift: 20 });
  mat('robeK', '#1c1824', { dark: 0.12, shift: 20 });
  mat('hairW', '#e6e4ee', { dark: 0.28, shift: 24 });
  mat('daoB', '#c8d2e2', { spec: 0.9, shin: 18, dark: 0.3 });
  mat('demon', '#7a1a2a', { spec: 0.4, dark: 0.18, shift: 20 });
  mat('demonD', '#3a0a14', { dark: 0.12, shift: 20 });
  mat('skinAsh', '#e0bca8', { dark: 0.24, shift: 16 });

  // 영웅 좌표로 그린 부품에 배율 k 와 이동(dx, dy)을 곱한다
  var GEO = { k: 1, x: 1, y: 1, rx: 1, ry: 1, x1: 1, y1: 1, x2: 1, y2: 1, r1: 1, r2: 1, w: 1, n: 1, pts: 1, m: 1, b: 1, cx: 1, cy: 1 };
  // ky 를 주면 세로만 따로 늘인다(키 큰 체형)
  function scaled(parts, k, dx, dy, ky) {
    dx = dx || 0; dy = dy || 0; ky = ky || k;
    var X = function (v) { return v * k + dx; }, Y = function (v) { return v * ky + dy; };
    return parts.map(function (p) {
      var o = {};
      for (var key in p) if (!GEO[key]) o[key] = p[key];
      if (o.bev) o.bev *= k;
      if (p.k === 'E') return E(X(p.x), Y(p.y), p.rx * k, p.ry * ky, p.m, o);
      if (p.k === 'B') return B(X(p.x), Y(p.y), p.rx * k, p.ry * ky, p.n, p.m, o);
      if (p.k === 'C') return C(X(p.x1), Y(p.y1), X(p.x2), Y(p.y2), p.r1 * k, p.r2 * k, p.m, o);
      if (p.k === 'L') return L(X(p.x1), Y(p.y1), X(p.x2), Y(p.y2), p.w * k, p.m, o);
      return P(p.pts.map(function (q) { return [X(q[0]), Y(q[1])]; }), p.m, o);
    });
  }
  function M(id, theme, h, fn, o) { S.def(id, Object.assign({ h: h, group: theme, rim: RIM[theme], fn: fn }, o)); }

  // ---------------- 무림 사람 ----------------
  // o: skin · robe(윗옷) · robeD(아랫자락) · trim(깃) · sash · pants · shoe · long(긴 자락) · bulk(덩치) · hunch(구부정)
  //    head: 'bandana' | 'bald' | 'topknot' | 'qing'(강시 관모) | 'hood' | 'loose'(풀어 헤친 머리) | 'whiteTop'(흰 상투)
  //    hair · beard · eye: 'dot' | 'red' | 'blank' · arms: 'out'(강시) · weapon: 'dao' | 'bigdao' | 'jian' | 'staff' | 'claw' | 'none'
  //    bareChest(맨가슴 + 털조끼) · veins(붉은 핏줄) · talisman(이마 부적)
  function figure(t, pose, o) {
    var atk = pose === 'attack', b = o.still ? 0 : atk ? 0.6 : S.bob(t, o.bobK || 1), w = wave(t), lx = atk ? 1.6 : 0;
    var hu = o.hunch ? 1.6 : 0, bk = o.bulk || 1;
    var y = function (v) { return v + b; }, x = function (v) { return v + lx; }, hx = function (v) { return x(v) + hu; };
    var out = o.arms === 'out';
    var hand = out ? (atk ? [43, 30.5] : [40.5, 32.5]) : atk ? [37.2, 36.4] : [33.5, 41.4];
    var parts = [], head = [], hairB = [];
    // 뒤 머리카락(풀어 헤친 머리·긴 머리)
    if (o.head === 'loose') hairB.push(C(hx(18), y(14), x(12) + w * 0.8, y(40), 6, 3, o.hair, { g: 'hairL' }), C(hx(17), y(16), x(9) + w, y(34), 3, 1.6, o.hair, { g: 'hairL2' }));
    if (o.head === 'whiteTop') hairB.push(C(hx(18), y(16), x(15) + w * 0.4, y(30), 3.2, 1.6, o.hair, { g: 'hairL' }));
    // 뒤 팔
    if (out) parts.push(C(x(21), y(31), x(38), y(30.5), 3 * bk, 2.6 * bk, o.robe, { g: 'armB' }), E(x(39.5), y(30.5), 2, 2, o.skin, { g: 'armB' }));
    else parts.push(C(x(19), y(31), x(15) - (atk ? 2 : 0), y(40), 3.3 * bk, 3.6 * bk, o.bareChest ? o.skin : o.robe, { g: 'armB' }),
      E(x(15) - (atk ? 2 : 0), y(41.8), 2.2 * bk, 2.2 * bk, o.skin, { g: 'armB' }));
    // 다리
    var lb = out ? [21.5, 22] : atk ? [18.5, 19] : [20, 20.4], lf = out ? [26.5, 27] : atk ? [31, 32] : [28.5, 29.4];
    parts.push(C(21, 47, lb[0], 58, 3.4 * bk, 3 * bk, o.pants, { g: 'legB' }), B(lb[1], 59.8, 4.1 * bk, 2.9, 3, o.shoe, { g: 'legB' }),
      C(27.5, 47, lf[0], 58, 3.5 * bk, 3.1 * bk, o.pants, { g: 'legF' }), B(lf[1], 59.8, 4.5 * bk, 2.9, 3, o.shoe, { g: 'legF' }));
    // 아랫자락
    var hem = o.long ? 60 : 52;
    parts.push(P([[x(16.5) - (bk - 1) * 4, y(42)], [x(31.5) + (bk - 1) * 4, y(42)], [x(33.5) + (bk - 1) * 4 + (atk ? 2 : 0), y(hem)], [x(14.5) - (bk - 1) * 4 - (atk ? 2 : 0), y(hem) + w * 0.6]], o.robeD, { g: 'skirt', bev: 1.4 }));
    if (o.trim) parts.push(C(x(15) - (bk - 1) * 4, y(hem - 0.6), x(33.2) + (bk - 1) * 4, y(hem - 0.6), 0.8, 0.8, o.trim, { line: false, ao: false }));
    // 몸통
    if (o.bareChest) {
      parts.push(B(hx(24), y(37), 8.6 * bk, 8.6, 2.6, o.skin, { g: 'torso' }),
        C(hx(22), y(33), hx(22.5), y(41), 0.5, 0.5, 'beardK', { line: false, ao: false }),
        P([[hx(15.5) - (bk - 1) * 6, y(29)], [hx(20), y(29)], [hx(19), y(44)], [hx(15) - (bk - 1) * 6, y(44)]], 'vestF', { g: 'vestB', bev: 1 }),
        P([[hx(29), y(29)], [hx(33) + (bk - 1) * 6, y(29)], [hx(33) + (bk - 1) * 6, y(44)], [hx(28.5), y(44)]], 'vestFL', { g: 'vestF', bev: 1 }));
    } else {
      parts.push(B(hx(24), y(37), 8.4 * bk, 8.4, 2.4, o.robe, { g: 'torso' }));
      if (o.trim) parts.push(C(hx(21.2), y(30.2), hx(26.6), y(38), 1.1, 1.1, o.trim, { line: false }), C(hx(27.8), y(30.2), hx(25.4), y(34.5), 1, 1, o.trim, { line: false }));
    }
    if (o.veins) parts.push(C(hx(20), y(33), hx(24), y(39), 0.5, 0.4, 'blood', { line: false, ao: false, emitLv: 3 }), C(hx(27), y(32), hx(25), y(37), 0.5, 0.4, 'blood', { line: false, ao: false, emitLv: 3 }));
    parts.push(B(hx(24), y(43.2), 9 * bk, 2, 6, o.sash, { g: 'sash' }));
    // 머리
    var fx = hx(28.5), fy = y(19.8);
    if (o.head !== 'hood') head.push(E(hx(23), y(16.5), 9.6, 9.4, o.head === 'bald' ? o.skin : o.hair || 'hairK', { g: 'hair' }));
    head.push(E(fx, fy, 7.2, 7.4, o.skin, { g: 'face' }));
    if (o.head === 'bandana') head.push(E(hx(24), y(12.5), 10, 5.4, 'bandana', { rot: -0.15, g: 'band' }), P([[hx(15), y(14)], [hx(9), y(17) + w], [hx(10.5), y(20) + w]], 'bandana', { g: 'bandT', bev: 0.6 }));
    if (o.head === 'bald') head.push(E(hx(19), y(9), 2.6, 2.6, o.hair, { g: 'knot' }), E(hx(26), y(12), 5, 2, o.skin, { line: false, ao: false, flat: 0.4 }));
    if (o.head === 'topknot' || o.head === 'whiteTop') head.push(E(hx(26), y(12), 9.2, 4.6, o.hair, { rot: -0.22, g: 'bang' }), E(hx(19.5), y(7.6), 3, 2.8, o.hair, { g: 'knot' }),
      C(hx(16.5), y(7), hx(22.5), y(6.4), 0.5, 0.5, 'gold', { line: false }));
    if (o.head === 'loose') head.push(E(hx(26), y(11.8), 9.6, 5, o.hair, { rot: -0.25, g: 'bang' }), P([[hx(28), y(11)], [hx(35.5), y(15.5)], [hx(32), y(19)], [hx(27), y(15)]], o.hair, { g: 'bang2', bev: 1 }));
    if (o.head === 'hood') head.push(E(hx(24), y(17), 10.8, 10.6, o.robe, { g: 'hood' }), P([[hx(18), y(10)], [hx(24), y(5)], [hx(11), y(2)]], o.robe, { g: 'hoodT', bev: 1.2 }),
      E(hx(26), y(13), 9.6, 4.6, o.robe, { rot: -0.18, g: 'hoodF' }));
    if (o.head === 'qing') head.push(B(hx(25), y(10.5), 9.8, 3, 3, 'qing', { g: 'hat' }), B(hx(25), y(6), 6.6, 3.4, 4, 'qing', { g: 'hatT' }),
      E(hx(25), y(3), 1.8, 1.8, 'qingR', { g: 'bead' }), C(hx(17), y(10), hx(13) + w * 0.5, y(22), 0.9, 1.4, 'qingR', { g: 'tail' }));
    // 얼굴
    if (o.eye === 'red') head.push(E(hx(31.6), y(19.4), 1.3, 0.8, 'eyeBl', { keep: true, line: false, rot: 0.2 }),
      C(hx(29.8), y(16.6), hx(33.4), y(17.6), 0.6, 0.5, 'beardK', { line: false, minS: 0.9, ao: false }), C(hx(31.5), y(24.4), hx(34), y(24), 0.4, 0.4, 'mouthD', { line: false, ao: false }));
    else if (o.eye === 'blank') head.push(E(hx(31.6), y(19.6), 1.1, 1.1, 'white', { keep: true, line: false }), C(hx(30.4), y(17.4), hx(33), y(17.8), 0.5, 0.5, 'brow', { line: false, minS: 0.9, ao: false }));
    else head.push(E(hx(31.6), y(19.6), 0.9, 1.5, 'eye', { keep: true, line: false }), C(hx(30.2), y(17.2), hx(33.2), y(16.6), 0.55, 0.55, 'beardK', { line: false, minS: 0.9, ao: false }));
    if (o.beard) head.push(P([[hx(27), y(23)], [hx(34.5), y(22.5)], [hx(33) + w * 0.3, y(o.longBeard ? 34 : 28)], [hx(28.5), y(o.longBeard ? 31 : 27)]], o.beard, { g: 'beard', bev: 1 }));
    if (o.talisman) head.push(P([[hx(29.5), y(9)], [hx(33.5), y(9.5)], [hx(33) + w * 0.4, y(24)], [hx(29.6) + w * 0.4, y(23.6)]], 'talis', { g: 'tal', bev: 0.3 }),
      C(hx(31.5), y(11), hx(31.4) + w * 0.4, y(21.5), 0.45, 0.45, 'talisR', { line: false, ao: false }), C(hx(30.4), y(14), hx(32.6), y(14.2), 0.4, 0.4, 'talisR', { line: false, ao: false }));
    var front = [];
    // 무기와 앞 팔
    var wp = o.weapon;
    if (wp === 'jian') {
      var bl = atk ? [38.9, 35.8, 54, 31] : [35.2, 38.7, 45.6, 21.6];
      front.push(L(x(bl[0]), y(bl[1]), x(bl[2]), y(bl[3]), 1.7, o.bladeM || 'blade'));
      if (o.bladeGlow) front.push(C(x(bl[0] + (bl[2] - bl[0]) * 0.2), y(bl[1] + (bl[3] - bl[1]) * 0.2), x(bl[0] + (bl[2] - bl[0]) * 0.9), y(bl[1] + (bl[3] - bl[1]) * 0.9), 0.5, 0.4, 'blood', { line: false, ao: false, emitLv: 4 }));
      front.push(C(x(atk ? 38.2 : 32.6), y(atk ? 33.6 : 37.8), x(atk ? 39.6 : 37), y(atk ? 38 : 40.6), 1, 1, 'gold', { g: 'guard' }));
    } else if (wp === 'dao' || wp === 'bigdao') {
      var big = wp === 'bigdao' ? 1.5 : 1;
      var h0 = hand, tipD = atk ? [h0[0] + 17 * big, h0[1] - 6 * big] : [h0[0] + 6 * big, h0[1] - 17 * big];
      var nx = atk ? 0.3 : 1, ny = atk ? 1 : -0.35;
      front.push(P([[x(h0[0] + 1), y(h0[1] - 1)], [x(tipD[0]), y(tipD[1])], [x(tipD[0] + nx * 3.2 * big), y(tipD[1] + ny * 3.2 * big + (atk ? 1 : 3))], [x(h0[0] + 1 + nx * 3 * big), y(h0[1] + ny * 3 * big)]], 'daoB', { g: 'blade', bev: 0.6 }));
      if (wp === 'bigdao') front.push(E(x(h0[0] + 3 + nx * 2), y(h0[1] - 3 + ny * 2), 2.2, 2.2, 'bone', { g: 'ring' }));
      front.push(C(x(h0[0] - 2), y(h0[1] - 2.4), x(h0[0] + 2.4), y(h0[1] + 1.6), 0.9, 0.9, 'gold', { g: 'guard' }));
    } else if (wp === 'staff') {
      var st = atk ? [41.6, 10.5, 35.5, 60] : [37.6, 14, 38.4, 60], orb = atk ? [42.6, 6.4] : [37.8, 9.8];
      front.push(C(x(st[0]), y(st[1]), x(st[2]), st[3], 1.05, 1.05, 'barkD', { g: 'staff' }), E(x(orb[0]), y(orb[1]), atk ? 4.6 : 3.6, atk ? 4.6 : 3.6, 'blood', { g: 'orb', emitLv: atk ? 5 : 4 }));
    }
    if (out) {
      front.push(C(hx(28), y(31.5), x(hand[0]), y(hand[1]), 3 * bk, 2.6 * bk, o.robe, { g: 'armF' }), E(x(hand[0] + 1.6), y(hand[1]), 2.2, 2, o.skin, { g: 'armF' }),
        C(x(hand[0] + 3), y(hand[1] - 0.6), x(hand[0] + 6), y(hand[1] + 0.4), 0.45, 0.35, 'claw', { line: false }),
        C(x(hand[0] + 3), y(hand[1] + 0.8), x(hand[0] + 5.6), y(hand[1] + 1.8), 0.45, 0.35, 'claw', { line: false }));
    } else {
      front.push(C(hx(29.5), y(32), x(hand[0] - 1.2), y(hand[1] - 2), 3.2 * bk, 3.3 * bk, o.bareChest ? o.skin : o.robe, { g: 'arm' }));
      if (o.trim && !o.bareChest) front.push(E(x(hand[0] - 1.4), y(hand[1] - 1.6), 2.3 * bk, 2.5 * bk, o.trim, { g: 'cuff' }));
      front.push(E(x(hand[0]), y(hand[1]), 2.3 * bk, 2.3 * bk, o.skin, { g: 'arm' }));
      if (wp === 'claw') front.push(C(x(hand[0] + 1.5), y(hand[1] - 1), x(hand[0] + 5), y(hand[1] - 2.4), 0.5, 0.35, 'claw', { line: false }));
    }
    // 어른 체형: 머리를 목(26, 28)을 중심으로 줄이고(adult), 몸을 발끝(y 63)에서 위로 늘인다(tall)
    var tall = o.tall || 1, ty = function (v) { return v * tall + 63 * (1 - tall); }, neck = -35 * (tall - 1);
    if (o.adult) { hairB = scaled(hairB, o.adult, 26 * (1 - o.adult), 28 * (1 - o.adult) + neck); head = scaled(head, o.adult, 26 * (1 - o.adult), 28 * (1 - o.adult) + neck); }
    if (tall !== 1) { parts = scaled(parts, 1, 0, 63 * (1 - tall), tall); front = scaled(front, 1, 0, 63 * (1 - tall), tall); }
    var tip0 = wp === 'jian' ? (atk ? [55.6, 31] : [45.6, 21.6]) : wp === 'staff' ? (atk ? [42.6, 6.4] : [37.8, 9.8]) : [hand[0] + 8, hand[1] - 6];
    return { parts: concat(hairB, parts, head, front), top: o.adult ? 28 - 26 * o.adult + neck : 0, tip: [tip0[0], ty(tip0[1])] };
  }
  // 사람 모양 몬스터 정의: k 배율, extra(t, pose, k) 로 배경·장식 부품을 더한다(그림 좌표)
  function human(id, theme, h, k, opts, extra) {
    M(id, theme, h, function (t, pose) {
      var f = figure(t, pose, opts), cut = Math.max(0, Math.floor(f.top - 1)), W = Math.round(56 * k), H = Math.round((64 - cut) * k), dy = -cut * k;
      var ex = extra ? extra(t, pose, k) : { back: [], front: [], glow: [] };
      return { w: W, h: H, cx: Math.round(24 * k), tipAttack: [f.tip[0] * k, f.tip[1] * k + dy],
        glow: (ex.glow || []).map(function (g) { return Object.assign({}, g, { y: g.y + dy }); }),
        parts: scaled(concat(ex.back || [], scaled(f.parts, k), ex.front || []), 1, 0, dy) };
    }, { flip: true });
  }

  // =====================================================================
  // 만독곡
  // =====================================================================
  // 독두꺼비: 등에 독혹이 빛나는 거대한 두꺼비. 왼쪽을 본다
  M('slime', 'forest', 58, function (t, pose) {
    var atk = pose === 'attack', sq = wave(t) * 0.04, b = S.bob(t, 0.8), y = function (v) { return v + b; };
    var tongue = atk ? [[16, 38], [6, 36], [0, 34]] : null;
    var warts = [[34, 22, 2.2], [42, 20, 1.8], [48, 26, 2], [38, 30, 1.6], [28, 26, 1.6], [52, 34, 1.6]];
    return { w: 64, h: 58, cx: 32, tipAttack: [1, 34], glow: [{ x: 40, y: y(24), r: 12, c: '#9aff3a', k: 0.6 }], parts: concat([
      // 뒷다리
      E(50, 48, 9, 7, 'toadD', { g: 'legB' }), E(56, 55, 6, 2.4, 'toadD', { g: 'footB' }),
      // 몸통과 배
      E(36, y(36), 24 * (1 + sq), 17 * (1 - sq), 'toad', { g: 'body' }),
      E(30, y(45), 15, 7.5, 'toadB', { g: 'belly' }),
      // 머리와 큰 입
      E(20, y(30), 12, 10, 'toad', { g: 'head' }),
      C(10, y(35.4), 26, y(36.6) + (atk ? 2 : 0), 1, 1, 'mouthD', { line: false }),
      // 튀어나온 눈
      E(18, y(20.5), 5, 4.6, 'toad', { g: 'eyeL' }), E(26, y(19.5), 4.6, 4.2, 'toadD', { g: 'eyeR' }),
      E(17.2, y(20), 2.6, 2.2, 'eyeT', { keep: true, line: false }), E(16.8, y(20), 0.6, 1.6, 'mouthD', { keep: true, line: false }),
      E(25.4, y(19.2), 2.2, 1.9, 'eyeT', { keep: true, line: false }),
      // 앞다리
      C(22, y(42), 16, 52, 3.2, 2.6, 'toad', { g: 'legF' }), E(14, 54, 5, 2.2, 'toad', { g: 'footF' })
    ], warts.map(function (wt, i) {
      return E(wt[0], y(wt[1]), wt[2], wt[2], 'wart', { keep: true, line: false, emitLv: 2 + ((i + Math.floor(t * 8)) % 3) });
    }), tongue ? [C(tongue[0][0], y(tongue[0][1]), tongue[1][0], y(tongue[1][1]), 1.6, 1.4, 'petal', { g: 'tongue' }),
      C(tongue[1][0], y(tongue[1][1]), tongue[2][0], y(tongue[2][1]), 1.4, 1.8, 'petal', { g: 'tongue' })] : []) };
  });

  // 흑풍채 졸개: 검은 두건, 찢어진 갈색 옷, 넓적한 도
  human('goblin', 'forest', 64, 1, { skin: 'skinT', robe: 'clothR', robeD: 'ragD', sash: 'bandana', pants: 'ragD', shoe: 'shoeK',
    head: 'bandana', hair: 'hairK', beard: 'beardK', weapon: 'dao', adult: 0.78, tall: 1.1 });

  // 흑풍채주 마웅(보스): 상투를 튼 대머리 거한, 털조끼에 맨가슴, 고리 달린 귀두대도
  human('treant', 'forest', 124, 1.9, { skin: 'skinT', robe: 'clothR', robeD: 'vestF', sash: 'qingR', pants: 'bandana', shoe: 'shoeK',
    head: 'bald', hair: 'hairK', beard: 'beardK', bareChest: true, bulk: 1.3, weapon: 'bigdao', bobK: 1.2, adult: 0.6, tall: 1.25 }, function (t, pose, k) {
    // 뒤에 꽂힌 흑풍채 깃발
    var w = wave(t);
    return { back: [C(14 * k, 6 * k, 14 * k, 44 * k, 0.9 * k, 0.9 * k, 'barkD', { g: 'pole' }),
      P([[14 * k, 7 * k], [3 * k + w * 2, 9 * k], [5 * k + w * 2, 15 * k], [14 * k, 18 * k]], 'bandana', { g: 'flag', bev: 1 }),
      E(9 * k, 12.5 * k, 2 * k, 2 * k, 'qingR', { line: false, ao: false })], glow: [] };
  });

  // =====================================================================
  // 청운문
  // =====================================================================
  // 혈강시: 청나라 관모, 이마에 붙은 노란 부적, 앞으로 뻗은 두 팔과 긴 손톱
  human('skeleton', 'castle', 72, 1.12, { skin: 'jsSkin', robe: 'qing', robeD: 'qing', trim: 'qingR', sash: 'qingR', pants: 'qing', shoe: 'shoeK', long: true,
    head: 'qing', hair: 'hairK', eye: 'red', arms: 'out', talisman: true, weapon: 'none', bobK: 1.6 }, function (t, pose, k) {
    return { glow: [{ x: 33 * k, y: 19 * k, r: 6 * k, c: '#ff3a3a', k: 0.7 }] };
  });

  // 혈교 술사: 핏빛 두건 로브, 붉은 눈, 피 구슬 지팡이
  human('dark_mage', 'castle', 78, 1.2, { skin: 'skinV', robe: 'robeR', robeD: 'robeK', trim: 'blood', sash: 'robeK', pants: 'robeK', shoe: 'shoeK', long: true,
    head: 'hood', eye: 'red', weapon: 'staff' }, function (t, pose, k) {
    var atk = pose === 'attack', orb = atk ? [42.6, 6.4] : [37.8, 9.8], drops = [];
    for (var i = 0; i < 3; i++) { var ph = (t + i / 3) % 1; drops.push(E((orb[0] + Math.sin(ph * TAU + i) * 3) * k, (orb[1] + 6 + ph * 14) * k, 0.8 * k, 1.1 * k, 'blood', { keep: true, line: false, ao: false })); }
    return { front: drops, glow: [{ x: orb[0] * k, y: orb[1] * k, r: 11 * k, c: '#ff2a3a' }] };
  });

  // 혈고 꼭두각시: 청운문 제자(흰 무복·푸른 깃), 초점 없는 눈, 몸에 번지는 붉은 핏줄. 구부정하게 선다
  human('cursed_armor', 'castle', 84, 1.3, { skin: 'skin', robe: 'muW', robeD: 'muW', trim: 'muB', sash: 'muB', pants: 'pants', shoe: 'shoeK',
    head: 'topknot', hair: 'hairK', eye: 'blank', veins: true, hunch: true, weapon: 'jian', adult: 0.72, tall: 1.15 }, function (t, pose, k) {
    var motes = [];
    for (var i = 0; i < 4; i++) { var ph = (t + i / 4) % 1; motes.push(E((22 + Math.sin(ph * TAU + i) * 6) * k, (42 - ph * 26) * k, 0.9 * k, 0.9 * k, 'blood', { keep: true, line: false, ao: false })); }
    return { front: motes, glow: [{ x: 24 * k, y: 36 * k, r: 14 * k, c: '#ff2a3a', k: 0.5 }] };
  });

  // 사부 청운자(보스): 흰 상투와 긴 흰 수염, 청운문 장문인의 긴 도포, 혈고에 물든 붉은 눈과 검
  human('baltar', 'castle', 124, 1.9, { skin: 'skin', robe: 'muW', robeD: 'muB', trim: 'gold', sash: 'muB', pants: 'muB', shoe: 'shoeK', long: true,
    head: 'whiteTop', hair: 'hairW', beard: 'hairW', longBeard: true, eye: 'red', veins: true, weapon: 'jian', bladeGlow: true, adult: 0.6, tall: 1.3 }, function (t, pose, k) {
    // 등 뒤로 흐르는 핏빛 혈고 기운
    var w = wave(t), wisps = [];
    for (var i = 0; i < 5; i++) { var ph = (t + i / 5) % 1; wisps.push(E((12 + i * 7 + Math.sin(ph * TAU) * 3) * k, (58 - ph * 44) * k, 1 * k, 1 * k, 'blood', { keep: true, line: false, ao: false })); }
    return { back: [P([[18 * k, 26 * k], [8 * k + w * 2, 40 * k], [12 * k + w * 2, 58 * k], [20 * k, 46 * k]], 'muB', { g: 'sleeveFlow', bev: 2 })],
      front: wisps, glow: [{ x: 32 * k, y: 19 * k, r: 7 * k, c: '#ff3a3a' }] };
  });

  // 혈마 단목천(최종 보스): 풀어 헤친 검은 머리, 검붉은 도포, 핏빛 날개 같은 혈기, 마물과 하나가 된 거대한 왼팔, 붉은 검
  human('astaroth', 'castle', 148, 2.3, { skin: 'skinAsh', robe: 'robeK', robeD: 'robeR', trim: 'blood', sash: 'demon', pants: 'robeK', shoe: 'shoeK', long: true,
    head: 'loose', hair: 'hairK', eye: 'red', veins: true, weapon: 'jian', bladeM: 'demon', bladeGlow: true, bobK: 1.3, adult: 0.56, tall: 1.38 }, function (t, pose, k) {
    var w = wave(t), atk = pose === 'attack';
    // 혈기 날개: 등 뒤로 펼쳐진 붉은 깃 다섯
    var wings = [];
    for (var i = 0; i < 5; i++) {
      var a = -2.5 + i * 0.32 + w * 0.04, len = (20 + i * 3) * k, ox = 18 * k, oy = 30 * k;
      wings.push(P([[ox, oy], [ox + Math.cos(a - 0.08) * len, oy + Math.sin(a - 0.08) * len], [ox + Math.cos(a) * (len + 4 * k), oy + Math.sin(a) * (len + 4 * k)], [ox + Math.cos(a + 0.1) * len * 0.9, oy + Math.sin(a + 0.1) * len * 0.9]],
        i % 2 ? 'demonD' : 'demon', { g: 'wing' + i, bev: 1.2 }));
      wings.push(C(ox, oy, ox + Math.cos(a) * len * 0.85, oy + Math.sin(a) * len * 0.85, 0.6 * k, 0.3 * k, 'blood', { line: false, ao: false, emitLv: 3 }));
    }
    // 마물의 왼팔(뒤쪽): 붉은 비늘 팔과 갈고리 손톱
    var arm = atk ? [[20, 30], [8, 22], [2, 12]] : [[20, 30], [10, 40], [6, 52]];
    var demonArm = [C(arm[0][0] * k, arm[0][1] * k, arm[1][0] * k, arm[1][1] * k, 4.2 * k, 3.6 * k, 'demon', { g: 'darm' }),
      C(arm[1][0] * k, arm[1][1] * k, arm[2][0] * k, arm[2][1] * k, 3.6 * k, 3 * k, 'demon', { g: 'darm2' }),
      E(arm[2][0] * k, arm[2][1] * k, 3.6 * k, 3.2 * k, 'demonD', { g: 'dhand' })];
    [-1, 0, 1].forEach(function (d) { demonArm.push(C(arm[2][0] * k, arm[2][1] * k, (arm[2][0] - 4 + d * 2.5) * k, (arm[2][1] + (atk ? -5 : 5) + d) * k, 0.9 * k, 0.4 * k, 'claw', { line: false })); });
    var motes = [];
    for (var j = 0; j < 6; j++) { var ph = (t + j / 6) % 1; motes.push(E((10 + j * 7 + Math.sin(ph * TAU + j) * 3) * k, (60 - ph * 56) * k, 0.9 * k, 0.9 * k, 'blood', { keep: true, line: false, ao: false })); }
    return { back: wings.concat(demonArm), front: motes,
      glow: [{ x: 32 * k, y: 19 * k, r: 8 * k, c: '#ff2a3a' }, { x: 24 * k, y: 34 * k, r: 22 * k, c: '#b0102a', k: 0.6 }] };
  });
})();
