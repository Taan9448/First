// puppet-heroes.js — 27단계 영웅 다섯(js/puppet.js 렌더러로 그린다). 오른쪽을 보는 3/4 각도, 몸 약 50도트, 장면 80×66
// 공통 몸(머리·얼굴·머리채·저고리·치마·소매·팔·발)을 자세 값으로 움직이고, 영웅마다 머리 모양·옷·무기·광채 색을 바꾼다.
// 동작: idle 8(숨쉬기·바람) · attack 8 · skill 16(돌아서 기를 모아 내지르기) · hit 2. 원본 GIF의 그림은 쓰지 않고 자세 순서만 참고했다
(function () {
  'use strict';
  var P = Game.Puppet, TAU = Math.PI * 2;
  var W = 80, H = 66, GX = 34, GY = 61;   // 장면 크기, 발 가운데
  var sin = Math.sin, cos = Math.cos;

  // ---------------- 기본 자세 ----------------
  // lean 몸 기울기(+ 앞으로), bob 들썩임(+ 아래로), dx/dy 몸 위치, head 고개, aF/aB 앞·뒤 팔 [어깨, 팔꿈치](0 = 아래, + 앞으로),
  // wpn 무기 각도(손에서), wind 머리채·옷자락 바람(+ 뒤로 날림), turn 0 앞 · 1 뒤돌아 봄, crouch 무릎 굽힘, glow 광채 세기, fx 연출
  var BASE = { lean: 0, bob: 0, dx: 0, dy: 0, head: 0, aF: [0.25, -0.35], aB: [-0.2, -0.3], wpn: 0.4, wind: 0.3, flare: 0, turn: 0, crouch: 0, glow: 1, step: 0, fx: 0, fxk: 0 };

  var HS = 1.16;   // 머리 크기(꼬마 비율)
  function hp(h, dx, dy) { return [h[0] + dx * HS, h[1] + dy * HS]; }
  function rot(px, py, ox, oy, a) { var c = cos(a), s = sin(a), x = px - ox, y = py - oy; return [ox + x * c - y * s, oy + x * s + y * c]; }
  function limb(S, a1, a2, l1, l2) {
    var E = [S[0] + l1 * sin(a1), S[1] + l1 * cos(a1)];
    return { S: S, E: E, H: [E[0] + l2 * sin(a1 + a2), E[1] + l2 * cos(a1 + a2)] };
  }

  // 손도트 얼굴(오른쪽을 보는 3/4). L 속눈썹 · i 눈동자 · I 밝은 눈동자 · W 빛 · m 입 · b 볼
  var FACE = [
    'LLLL...LLL',
    'LiIW...LIW',
    'LiII...LiI',
    'LiiI...Lii',
    '.LL.....L.',
    'bb......b.',
    '.....m....'
  ];
  var FACE_BLINK = [
    '..........',
    '..........',
    'LLLL...LLL',
    '.LL.....L.',
    '..........',
    'bb......b.',
    '.....m....'
  ];

  // ---------------- 공통 몸 ----------------
  // d: 영웅 설계(재질 번호 ids, 머리·옷·무기 그리는 함수들)
  function body(F, p, t, anim, f, d) {
    var M = d.ids, lean = p.lean, turn = p.turn, back = turn > 0.5;
    var bx = GX + p.dx, by = GY + p.dy;
    var hipY = by - 14 + p.crouch * 2, shY = by - 27 + p.bob + p.crouch * 3;
    var sway = sin(t * TAU) * 0.6;
    var lx = function (y) { return bx + (by - y) * lean * 0.35; };   // 기울기에 따라 위쪽일수록 앞으로
    var neck = [lx(shY) + 1, shY - 1];
    var head = [lx(shY - 10) + 1.5 + p.head * 2, shY - 12 + p.bob * 0.3];
    var shF = [lx(shY) + 4.5 - turn * 9, shY + 1.5], shB = [lx(shY) - 4 + turn * 8, shY + 1.5];
    var armF = limb(shF, p.aF[0] - lean * 0.3, p.aF[1], 6, 6), armB = limb(shB, p.aB[0] - lean * 0.3, p.aB[1], 5.5, 5.5);
    var ctx = { F: F, p: p, t: t, f: f, anim: anim, M: M, bx: bx, by: by, hipY: hipY, shY: shY, head: head, neck: neck, lx: lx,
      armF: armF, armB: armB, back: back, turn: turn, sway: sway, wind: p.wind };
    if (back) { var tmp = ctx.armF; ctx.armF = ctx.armB; ctx.armB = tmp; }

    d.hairBack(ctx);                                     // 등 뒤 머리채
    if (d.cape) d.cape(ctx);
    if (!back && d.weaponBack) d.weaponBack(ctx);
    sleeve(ctx, ctx.armB, d, true);                      // 뒤쪽 팔
    feet(ctx, d);
    d.skirt(ctx);                                        // 치마·하카마
    d.torso(ctx);                                        // 저고리·갑옷
    if (d.mid) d.mid(ctx);                               // 방패 등 몸 앞·앞팔 뒤
    if (back) { d.backHead(ctx); }
    else {
      headBase(ctx, d);
      var blink = anim === 'idle' && f === 5;
      F.stamp(blink ? FACE_BLINK : FACE, d.facePal, head[0] - 1.5, head[1] - 1.5);
      d.hairFront(ctx);                                  // 앞머리·옆머리·장식
    }
    if (d.weapon && !d.weaponFront) d.weapon(ctx);
    sleeve(ctx, ctx.armF, d, false);                     // 앞쪽 팔
    if (d.weapon && d.weaponFront) d.weapon(ctx);
    if (d.extra) d.extra(ctx);
    return ctx;
  }
  function headBase(c, d) {
    var F = c.F, h = c.head, M = c.M;
    F.put(P.ribbon([[c.neck[0] - 0.5, c.neck[1] - 3], [c.neck[0], c.neck[1] + 1]], 4, 4), M.skin, { cast: false, grp: 1 });
    // 귀(엘프는 길다)
    if (d.elf) F.put(P.ribbon([hp(h, -2, 1), hp(h, -9.5, -4.5)], 3.4, 0.6), M.skin, { grp: 1, line: 'soft' });
    var face = P.blob([hp(h, -8, -3), hp(h, -5, -9), hp(h, 3, -9.5), hp(h, 8.5, -4), hp(h, 9, 2), hp(h, 6.5, 6.2),
      hp(h, 2, 7.6), hp(h, -4, 6.8), hp(h, -8, 3)]);
    F.put(face, M.skin, { grp: 1, bias: 0.06, round: 4 });
  }
  function feet(c, d) {
    var F = c.F, M = c.M, st = c.p.step;
    F.put(P.ellipse(c.bx - 3.5 - st, c.by - 0.5, 3.2, 1.8), M.shoe, { line: 'soft' });
    F.put(P.ellipse(c.bx + 4 + st, c.by - 0.2, 3.4, 1.9), M.shoe, { line: 'soft' });
  }
  // 팔과 넓은 소매(바람에 날리는 소맷자락), 손
  function sleeve(c, arm, d, isBack) {
    var F = c.F, M = c.M, sm = isBack ? M.sleeveB : M.sleeve;
    var wide = d.sleeveWide == null ? 1 : d.sleeveWide;
    F.put(P.ribbon([arm.S, arm.E, arm.H], 4.6, 4.6 + 2.6 * wide), sm, { cast: !isBack, grp: isBack ? 20 : 21 });
    if (wide > 0.4) {
      // 소맷자락: 팔꿈치~손목 아래로 늘어지고 바람에 뒤로
      var dn = 5.5 * wide, wv = c.wind * 3 + sin(c.t * TAU + (isBack ? 1 : 0)) * 0.8;
      var cuff = [(arm.E[0] + arm.H[0]) / 2, (arm.E[1] + arm.H[1]) / 2];
      var flap = P.blob([arm.E, arm.H, [arm.H[0] - wv * 0.5, arm.H[1] + dn * 0.8], [cuff[0] - wv - 1, cuff[1] + dn], [arm.E[0] - wv * 0.6, arm.E[1] + dn * 0.6]]);
      F.put(flap, sm, { grp: isBack ? 20 : 21, cast: !isBack, line: 'soft' });
      if (d.lining != null) {   // 소맷자락 안감: 아래 가장자리
        for (var yy = 0; yy < flap.h; yy++) for (var xx = 0; xx < flap.w; xx++) {
          var X = flap.x0 + xx, Y = flap.y0 + yy;
          if (X >= 0 && Y >= 0 && X < F.w && Y < F.h && flap.d[yy * flap.w + xx] && !flap.has(X, Y + 2) && F.mat[Y * F.w + X] === sm) { F.mat[Y * F.w + X] = M[d.lining]; F.lv[Y * F.w + X] = isBack ? 1 : 2; }
        }
      }
    }
    if (d.cuff) F.put(P.ribbon([[arm.H[0] - (arm.H[0] - arm.E[0]) * 0.25, arm.H[1] - (arm.H[1] - arm.E[1]) * 0.25], arm.H], 3.2, 3.2), M[d.cuff], { grp: isBack ? 20 : 21, line: 'soft' });
    F.put(P.ellipse(arm.H[0] + 0.6 * Math.sign(arm.H[0] - arm.E[0] || 1), arm.H[1] + 0.8, 1.7, 1.6), M.skin, { line: 'soft' });
  }

  // 공통 치마: 허리에서 단까지 퍼지고, 단은 바람·걸음에 물결친다. 주름(그늘 줄) 몇 개
  function skirt(c, mi, o) {
    o = o || {};
    var F = c.F, x = c.lx(c.hipY), y = c.hipY, by = c.by - (o.lift || 0), fl = c.p.flare, wv = c.wind;
    var len = o.len || 1, wl = o.waist || 6.5, hw = (o.hem || 12) + fl * 2;
    var pts = [[x - wl, y - 1], [x + wl - 0.5, y - 1]], n = 6;
    var yH = y + (by - y) * len;
    for (var i = 0; i <= n; i++) {
      var k = i / n, hx = x + hw * 0.9 - k * hw * 2 - wv * 3 * k * k;
      var hy = yH + sin(c.t * TAU * (o.fast ? 2 : 1) + k * 5) * (0.7 + fl * 0.6) - (k > 0.7 ? wv * 2 * (k - 0.7) * 3 : 0);
      pts.push([hx + (i === 0 ? 1 : 0), hy]);
    }
    var m = P.blob(pts);
    F.put(m, mi, { pattern: o.pattern, line: o.line, grp: o.grp || 30, round: 5 });
    // 주름: 허리에서 단으로 내려가는 그늘 줄
    var folds = o.folds || [-0.45, 0.1, 0.55];
    folds.forEach(function (fk, j) {
      for (var s = 0.25; s <= 1; s += 0.06) {
        var px = x + fk * wl + (fk * hw - fk * wl) * s * 1.05 - wv * 1.5 * s * s, py = y + (yH - y) * s;
        var X = Math.round(px), Y = Math.round(py), i2 = Y * F.w + X;
        if (m.has(X, Y) && F.mat[i2] === mi) F.lv[i2] = Math.max(0, Math.min(F.lv[i2], 1));
        if (j === 1 && m.has(X + 1, Y) && F.mat[i2 + 1] === mi && F.lv[i2 + 1] < 5) F.lv[i2 + 1] = Math.max(F.lv[i2 + 1], 3);
      }
    });
    // 단 장식: 아래 가장자리 두 칸을 다른 색으로
    if (o.trim != null) {
      for (var yy = 0; yy < m.h; yy++) for (var xx = 0; xx < m.w; xx++) {
        if (!m.d[yy * m.w + xx]) continue;
        var X2 = m.x0 + xx, Y2 = m.y0 + yy;
        if (X2 >= 0 && Y2 >= 0 && X2 < F.w && Y2 < F.h && !m.has(X2, Y2 + (o.trimW || 2)) && F.mat[Y2 * F.w + X2] === mi) { F.mat[Y2 * F.w + X2] = o.trim; F.lv[Y2 * F.w + X2] = m.has(X2, Y2 + 1) ? 2 : 1; }
      }
    }
    return m;
  }
  // 공통 저고리: 어깨에서 허리까지, 깃(V)과 띠
  function torso(c, mi, o) {
    o = o || {};
    var F = c.F, s = c.shY, hy = c.hipY, x0 = c.lx(s), x1 = c.lx(hy), tw = o.w || 6;
    var m = P.blob([[x0 - tw, s + 0.5], [x0 - 1, s - 1.5], [x0 + tw - 0.5, s + 0.5], [x0 + tw + 0.8, s + 5], [x1 + tw - 0.5, hy + 1], [x1 - tw, hy + 1], [x0 - tw - 1, s + 5]]);
    F.put(m, mi, { grp: 40, round: 4, pattern: o.pattern });
    if (o.collar != null) {   // 깃: 목에서 가슴으로 V
      F.put(P.ribbon([[x0 - 2.5, s - 0.5], [x0 + 1.5, s + 5.5]], 2, 1.4), o.collar, { grp: 41, line: 'soft' });
      F.put(P.ribbon([[x0 + 3.5, s - 0.5], [x0 + 1.5, s + 5.5]], 2, 1.4), o.collar, { grp: 41, line: 'soft' });
    }
    if (o.sash != null) {
      F.put(P.ribbon([[x1 - tw - 0.5, hy - 2], [x1 + tw + 0.5, hy - 2]], 4, 4), o.sash, { grp: 42, cast: true, pattern: o.sashPat });
      if (o.sashTie) {   // 띠 매듭과 뒤로 날리는 끈
        var wv = c.wind, tx = x1 - tw + 1;
        F.put(P.ribbon([[tx, hy - 1], [tx - 3 - wv * 3, hy + 4], [tx - 6 - wv * 6, hy + 8 + sin(c.t * TAU) * 1.2]], 2.2, 1.2), o.sashTie, { grp: 43 });
        F.put(P.ribbon([[tx + 1, hy - 1], [tx - 1 - wv * 2, hy + 6], [tx - 3 - wv * 4, hy + 11 + sin(c.t * TAU + 1) * 1.2]], 2, 1), o.sashTie, { grp: 43 });
      }
    }
    return m;
  }
  // 머리 뒤통수(앞머리 없이) — 뒤돌아 봄
  function backHead(c, mi) {
    var h = c.head;
    c.F.put(P.blob([hp(h, -9, -1), hp(h, -6, -9), hp(h, 2, -11), hp(h, 8.5, -6), hp(h, 9, 2), hp(h, 5, 8), hp(h, -5, 8)]), mi, { grp: 50, round: 4 });
    // 정수리에서 아래로 흐르는 머리카락 결
    for (var i = -3; i <= 3; i++) {
      c.F.put(P.ribbon([hp(h, i * 2, -9), hp(h, i * 2.4 - c.wind * 1.5, 3), hp(h, i * 2.6 - c.wind * 3, 9)], 2.4, 1.2), mi, { grp: 50, line: 'none' });
    }
  }
  // 머리채(긴 머리): 정수리 근처에서 등 뒤로 흘러내리는 굵은 띠 여러 개
  function longHair(c, mi, o) {
    o = o || {};
    var h = c.head, wv = c.wind, F = c.F, n = o.n || 6, len = o.len || 28, spread = o.spread || 1;
    var ph = c.t * TAU;
    // 바탕 덩어리
    var mass = [hp(h, -6, -7), hp(h, 4, -9.5), hp(h, 7.5, 0), [h[0] + 4, h[1] + len * 0.45], [h[0] - 2 - wv * 6, h[1] + len * 0.8],
      [h[0] - 9 - wv * 10, h[1] + len * 0.75 + sin(ph) * 1.2], [h[0] - 11 - wv * 6, h[1] + len * 0.3], [h[0] - 10, h[1] + 2]];
    F.put(P.blob(mass), mi, { grp: 60, round: 4, bias: -0.06 });
    for (var i = 0; i < n; i++) {
      var k = i / (n - 1), sx = h[0] - 8 + k * 13, ex = sx - 4 - k * 2 - wv * (8 + k * 8) * spread;
      var ey = h[1] + len * (0.55 + 0.45 * (1 - Math.abs(k - 0.4))) + sin(ph + k * 3) * 1.5;
      var mx = (sx + ex) / 2 - wv * 3 + sin(ph * 1 + k * 4) * 1.2, my = (h[1] + ey) / 2;
      F.put(P.ribbon([[sx, h[1] - 4], [mx, my], [ex + sin(ph + k * 2) * 1.5, ey]], 4.4 - k * 0.6, 0.6, 0.8), mi, { grp: 60, line: i % 2 ? 'soft' : 'full' });
    }
  }
  // 앞머리: 이마를 덮는 끝이 뾰족한 머리채, 옆머리 한 가닥
  function bangs(c, mi, o) {
    o = o || {};
    var h = c.head, F = c.F, wv = c.wind;
    // 머리 위쪽 덮개
    F.put(P.blob([hp(h, -9.5, 2), hp(h, -8.5, -7), hp(h, -2, -11.5), hp(h, 5, -10.5), hp(h, 10, -5), hp(h, 10, -1),
      hp(h, 4, -3.5), hp(h, -3, -3), hp(h, -6, 3)]), mi, { grp: 61, cast: true, round: 4 });
    // 머리 위 빛 고리(천사 고리): 정수리 둘레의 밝은 띠
    for (var a = -2.75; a <= -0.75; a += 0.06) {
      for (var rr = 7.2; rr <= 8.2; rr += 0.5) {
        var X = Math.round(h[0] + 0.5 + cos(a) * rr * HS), Y = Math.round(h[1] - 1 + sin(a) * rr * HS * 0.92), ii = Y * F.w + X;
        if (X >= 0 && Y >= 0 && X < F.w && F.mat[ii] === mi && F.lv[ii] > 0) F.lv[ii] = (Math.round(a * 10) % 3 === 0) ? 4 : 3;
      }
    }
    var locks = o.locks || [[-4, 0.2, 5.5], [-1, 0.25, 6.5], [2.5, 0.35, 6], [5.5, 0.45, 5.5], [8, 0.6, 4.5]];
    locks.forEach(function (L, i) {
      var q = hp(h, L[0] - 1, -9), sx = q[0], sy = q[1];
      F.put(P.ribbon([[sx, sy], [sx + L[1] * 6 + 0.5, sy + L[2] * 0.65], [sx + L[1] * 8 + 1 - wv * 0.5, sy + L[2] * HS + 3]], 3.8, 0.5, 0.7), mi, { grp: 61, cast: true, line: i % 2 ? 'soft' : 'full' });
    });
    // 옆머리(얼굴 앞, 뺨을 따라)
    if (o.side !== false) F.put(P.ribbon([hp(h, 8, -5), hp(h, 9.5 - wv, 3), hp(h, 8.5 - wv * 2 + sin(c.t * TAU) * 0.6, 10)], 3, 0.6), mi, { grp: 61, cast: true });
    // 귀 뒤 옆머리
    F.put(P.ribbon([hp(h, -6, -3), hp(h, -7 - wv, 5), hp(h, -8 - wv * 2, 11)], 3.4, 0.8), mi, { grp: 61, cast: true, line: 'soft' });
  }

  // ---------------- 무기 ----------------
  function sword(c, o) {
    o = o || {};
    var F = c.F, M = c.M, Hn = c.armF.H, a = c.p.wpn + (c.armF.H[0] < c.armF.E[0] ? 0 : 0), L = o.len || 17;
    var dir = [sin(a + Math.PI / 2), -cos(a + Math.PI / 2)];   // 0 = 앞으로 수평, + 아래로
    dir = [cos(a), sin(a)];
    var guard = [Hn[0] + dir[0] * 1.5, Hn[1] + dir[1] * 1.5], tip = [Hn[0] + dir[0] * (L + 2), Hn[1] + dir[1] * (L + 2)];
    F.put(P.ribbon([[Hn[0] - dir[0] * 3, Hn[1] - dir[1] * 3], guard], 2, 2), M.hilt, { line: 'soft' });
    F.put(P.ribbon([guard, tip], o.w || 2.4, 1.2), M.blade, { line: 'soft', shade: 'ribbon' });
    F.put(P.ribbon([[guard[0] - dir[1] * 2.5, guard[1] + dir[0] * 2.5], [guard[0] + dir[1] * 2.5, guard[1] - dir[0] * 2.5]], 1.6, 1.6), M.guard, { line: 'soft' });
    if (o.tassel != null) F.put(P.ribbon([[Hn[0] - dir[0] * 3, Hn[1] - dir[1] * 3], [Hn[0] - dir[0] * 4 - c.wind * 2, Hn[1] + 3], [Hn[0] - dir[0] * 4 - c.wind * 4 - 1, Hn[1] + 6 + sin(c.t * TAU) * 0.8]], 1.6, 0.8), o.tassel, {});
    c.tip = tip;
    return tip;
  }
  // 지팡이: 손이 가운데쯤을 쥐고, 위 끝에 장식(top 함수)
  function staff(c, o) {
    var F = c.F, M = c.M, Hn = c.armF.H, a = c.p.wpn, dir = [cos(a), sin(a)], up = o.up || 15, dn = o.down || 9;
    var top = [Hn[0] + dir[0] * up, Hn[1] + dir[1] * up], bot = [Hn[0] - dir[0] * dn, Hn[1] - dir[1] * dn];
    F.put(P.ribbon([bot, top], 2, 2), M[o.pole || 'pole'], { line: 'soft' });
    if (o.top) o.top(c, top, dir);
    c.tip = top;
    return top;
  }
  function dagger(c, Hn, a, o) {
    var F = c.F, M = c.M, dir = [cos(a), sin(a)], L = (o && o.len) || 7;
    F.put(P.ribbon([[Hn[0] - dir[0] * 2, Hn[1] - dir[1] * 2], [Hn[0] + dir[0] * 1, Hn[1] + dir[1] * 1]], 1.8, 1.8), M.hilt, { line: 'soft' });
    F.put(P.ribbon([[Hn[0] + dir[0] * 1, Hn[1] + dir[1] * 1], [Hn[0] + dir[0] * L, Hn[1] + dir[1] * L]], 2, 0.6), M.blade, { line: 'soft' });
    return [Hn[0] + dir[0] * L, Hn[1] + dir[1] * L];
  }
  // 연 모양 방패(뒤쪽 팔)
  function shield(c, mi, emb) {
    var F = c.F, Hn = c.armB.H, x = Hn[0] + 2, y = Hn[1] - 3;
    var m = P.blob([[x - 6, y - 7], [x + 6, y - 7], [x + 6.5, y + 1], [x, y + 9], [x - 6.5, y + 1]]);
    F.put(m, mi, { cast: true, round: 3, grp: 70 });
    for (var yy = -6; yy <= 7; yy++) { var X = Math.round(x), Y = Math.round(y + yy); if (m.has(X, Y)) { F.mat[Y * F.w + X] = emb; F.lv[Y * F.w + X] = 3; } }
    for (var xx = -4; xx <= 4; xx++) { X = Math.round(x + xx); Y = Math.round(y - 2); if (m.has(X, Y)) { F.mat[Y * F.w + X] = emb; F.lv[Y * F.w + X] = 3; } }
    // 테두리 금색
    for (yy = 0; yy < m.h; yy++) for (xx = 0; xx < m.w; xx++) {
      X = m.x0 + xx; Y = m.y0 + yy;
      if (m.d[yy * m.w + xx] && (!m.has(X + 1, Y) || !m.has(X - 1, Y) || !m.has(X, Y - 1) || !m.has(X, Y + 1)) && X >= 0 && Y >= 0 && X < F.w && Y < F.h) { F.mat[Y * F.w + X] = emb; F.lv[Y * F.w + X] = 2; }
    }
  }
  // 둥근 보석(빛나는)
  function gem(F, x, y, r, mi) {
    F.put(P.ellipse(x, y, r, r), mi, { line: 'soft', round: 2 });
    F.dot(x - r * 0.4, y - r * 0.4, mi, 4);
  }
  // 칼 궤적: 중심 c 에서 반지름 r, 각도 a0 → a1 의 초승달(반투명, 바깥이 밝다)
  function slash(F, cx, cy, r, a0, a1, colA, colB, thick, alpha) {
    var A = P.hexRgb(colA), B = P.hexRgb(colB);
    for (var s = 0; s <= 1; s += 0.01) {
      var a = a0 + (a1 - a0) * s, w = thick * Math.sin(s * Math.PI);
      for (var k = 0; k <= w; k += 0.5) {
        var rr = r - k, x = cx + cos(a) * rr, y = cy + sin(a) * rr, e = k / Math.max(1, w);
        var c = [A[0] + (B[0] - A[0]) * e, A[1] + (B[1] - A[1]) * e, A[2] + (B[2] - A[2]) * e];
        F.glowPx('fx', x, y, c, alpha * (1 - e * 0.6) * (0.4 + 0.6 * s));
      }
    }
  }
  function sparkle(F, x, y, col, a) {
    var c = P.hexRgb(col);
    F.glowPx('fx', x, y, [255, 255, 255], a);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { F.glowPx('fx', x + d[0], y + d[1], c, a * 0.7); });
  }

  // ---------------- 오로라 ----------------
  // 몸 뒤로 너울거리는 빛의 장막(아래가 진하고 위로 갈수록 흐려진다) + 떠오르는 빛 알갱이. 점묘(4×4 바이엘)로 도트 느낌
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function aurora(cols, strength) {
    var C = cols.map(P.hexRgb);
    return function (F, t, p, anim) {
      var k = (p.glow == null ? 1 : p.glow) * (strength || 1), ph = t * TAU;
      for (var band = 0; band < 3; band++) {
        var bx = GX + [-20, -8, 15][band] + sin(ph + band * 2.1) * 2.5, top = 3 + band * 4, bot = GY - 2;
        for (var y = top; y < bot; y++) {
          var v = (y - top) / (bot - top), wav = sin(y * 0.16 + ph * (band % 2 ? -1 : 1) + band) * 3.5 + sin(y * 0.05 + ph) * 2;
          var wdt = 2.5 + v * 3.5, a = Math.pow(v, 1.1) * 0.62 * k * (0.75 + 0.25 * sin(ph + band));
          var c0 = C[band % C.length], c1 = C[(band + 1) % C.length];
          for (var x = Math.floor(bx + wav - wdt); x <= bx + wav + wdt; x++) {
            var e = 1 - Math.abs(x - (bx + wav)) / (wdt + 0.5);
            var aa = a * (0.3 + 0.7 * e);
            if (e < 0.22) aa = Math.min(1, aa * 1.5);   // 장막 가장자리가 더 밝다
            aa = Math.floor(aa * 5) / 5 * 0.7;          // 투명도를 몇 단계로 끊어 도트 느낌
            if (aa <= 0) continue;
            var cc = [c0[0] + (c1[0] - c0[0]) * (1 - v), c0[1] + (c1[1] - c0[1]) * (1 - v), c0[2] + (c1[2] - c0[2]) * (1 - v)];
            F.glowPx('under', x, y, cc, Math.min(0.6, aa));
          }
        }
      }
      // 빛 알갱이
      for (var i = 0; i < 7; i++) {
        var s = (i * 0.37 + t) % 1, x0 = GX - 18 + ((i * 17) % 36) + sin(ph + i) * 2, y0 = GY - 4 - s * 46;
        var a2 = sin(s * Math.PI) * 0.9 * k;
        F.glowPx('fx', x0, y0, C[i % C.length], a2);
        if (i % 3 === 0) F.glowPx('fx', x0, y0 - 1, [255, 255, 255], a2 * 0.6);
      }
    };
  }

  // ---------------- 동작 ----------------
  // 무기 종류마다 공격·스킬 열쇠 장면이 다르다(검 · 지팡이 · 암기)
  function anims(kind) {
    var idle = { n: 8, loop: true, keys: [[0, { bob: 0, wind: 0.25 }], [0.5, kind === 'sword' ? { bob: 1, wind: 0.4, aF: [0.2, -0.3] } : { bob: 1, wind: 0.4 }], [1, { bob: 0, wind: 0.25 }]] };
    var hit = { n: 2, keys: [[0, { lean: -0.35, dx: -2, head: -0.6, aF: [-0.5, -0.6], aB: [-0.8, -0.4], wind: -0.2, glow: 0.5 }], [1, { lean: -0.2, dx: -1, head: -0.3, wind: 0 }]] };
    var attack, skill;
    if (kind === 'sword') {
      attack = { n: 8, keys: [
        [0, {}],
        [0.18, { lean: -0.15, dx: -1, aF: [-2.4, -0.2], wpn: -2.2, wind: 0.2, crouch: 0.5 }],
        [0.38, { lean: 0.35, dx: 4, aF: [1.5, 0.1], wpn: 0.3, wind: 0.9, flare: 1, step: 1.5, fx: 1, fxk: 0.4 }],
        [0.55, { lean: 0.45, dx: 6, aF: [1.9, 0.2], wpn: 0.9, wind: 1, flare: 1.2, step: 2, fx: 1, fxk: 1 }],
        [0.8, { lean: 0.15, dx: 3, aF: [1, -0.2], wpn: 0.7, wind: 0.6, fx: 0 }],
        [1, {}]] };
      skill = { n: 16, keys: [
        [0, {}],
        [0.12, { turn: 1, lean: -0.05, wind: 0.6, flare: 0.8, glow: 1.4 }],
        [0.24, { turn: 1, lean: 0.05, wind: -0.3, flare: 1.2, glow: 1.6 }],
        [0.34, { turn: 0, aF: [1.3, -0.1], wpn: -0.2, wind: 0.5, glow: 1.8, fx: 2, fxk: 0.3 }],
        [0.46, { aF: [1.6, -0.2], aB: [1.2, -0.4], wpn: -0.6, wind: 0.7, glow: 2, fx: 2, fxk: 0.8, crouch: 0.3 }],
        [0.58, { lean: -0.2, aF: [-2.6, 0], wpn: -2.4, crouch: 1, wind: 0.3, glow: 2.2, fx: 2, fxk: 1 }],
        [0.7, { lean: 0.55, dx: 6, aF: [1.6, 0.2], wpn: 0.4, step: 2.5, wind: 1.2, flare: 1.5, glow: 2.4, fx: 3, fxk: 0.5 }],
        [0.82, { lean: 0.6, dx: 7, aF: [1.75, 0.15], wpn: 0.5, step: 2.5, wind: 1.1, flare: 1.4, glow: 2, fx: 3, fxk: 1 }],
        [1, { glow: 1 }]] };
    } else if (kind === 'staff') {
      attack = { n: 8, keys: [
        [0, {}],
        [0.25, { lean: -0.1, aF: [-0.9, -0.8], wpn: -1.9, wind: 0.2, glow: 1.3 }],
        [0.5, { lean: 0.25, dx: 2, aF: [1.6, -0.1], wpn: -0.3, wind: 0.8, flare: 0.8, glow: 1.8, fx: 1, fxk: 1 }],
        [0.75, { lean: 0.2, dx: 2, aF: [1.5, -0.1], wpn: -0.3, wind: 0.6, glow: 1.4, fx: 1, fxk: 0.5 }],
        [1, {}]] };
      skill = { n: 16, keys: [
        [0, {}],
        [0.14, { turn: 1, wind: 0.6, flare: 1, glow: 1.4 }],
        [0.28, { turn: 0, aF: [-0.6, -1], wpn: -1.6, aB: [2.4, -0.2], wind: -0.2, glow: 1.8, fx: 2, fxk: 0.3 }],
        [0.45, { aF: [-0.5, -1.1], wpn: -1.6, aB: [2.6, -0.3], wind: 0.5, flare: 1.2, glow: 2.2, fx: 2, fxk: 0.8, dy: -1 }],
        [0.6, { aF: [-0.6, -1.1], wpn: -1.6, aB: [2.7, -0.3], wind: 0.8, flare: 1.4, glow: 2.6, fx: 2, fxk: 1, dy: -2 }],
        [0.75, { lean: 0.3, dx: 3, aF: [1.7, -0.1], wpn: -0.2, aB: [1.2, -0.2], wind: 1.2, flare: 1.6, glow: 2.6, fx: 3, fxk: 1 }],
        [1, { glow: 1 }]] };
    } else {   // 암기(소연)
      attack = { n: 8, keys: [
        [0, {}],
        [0.2, { lean: -0.2, aF: [-1.8, -1.2], wpn: -2, crouch: 0.6, wind: 0.2 }],
        [0.45, { lean: 0.4, dx: 3, aF: [1.7, 0], wpn: 0, wind: 0.9, flare: 1, step: 1.5, fx: 1, fxk: 0.6 }],
        [0.65, { lean: 0.35, dx: 3, aF: [1.6, -0.1], aB: [1.3, -0.2], wpn: 0, wind: 0.8, fx: 1, fxk: 1 }],
        [1, {}]] };
      skill = { n: 16, keys: [
        [0, {}],
        [0.12, { turn: 1, wind: 0.7, flare: 1, crouch: 0.4 }],
        [0.24, { turn: 0, lean: -0.3, crouch: 1, dy: 0, aF: [-2, -1], aB: [-1.8, -1], wind: 0.3, glow: 1.6 }],
        [0.36, { lean: 0.1, dy: -6, aF: [2.2, 0], aB: [-2.2, 0], wind: -0.4, flare: 1.4, glow: 2, fx: 2, fxk: 0.5 }],
        [0.5, { lean: 0.2, dy: -7, aF: [2.6, 0], aB: [0.6, 0], wind: -0.2, flare: 1.4, glow: 2.2, fx: 2, fxk: 1 }],
        [0.66, { lean: 0.45, dy: 0, dx: 4, aF: [1.7, 0], aB: [1.5, -0.1], crouch: 0.8, wind: 1.1, flare: 1.5, glow: 2.4, fx: 3, fxk: 0.6 }],
        [0.8, { lean: 0.4, dx: 4, aF: [1.75, 0], aB: [1.55, 0], wind: 1, glow: 2, fx: 3, fxk: 1 }],
        [1, { glow: 1 }]] };
    }
    return { idle: idle, attack: attack, skill: skill, hit: hit };
  }

  // ---------------- 설계 묶기 ----------------
  // spec: { mats: { 이름: 재질 }, glow, aurora: [색…], kind, draw: { hairBack, hairFront, backHead, skirt, torso, weapon, cape, extra }, facePal… }
  function hero(id, spec) {
    var names = Object.keys(spec.mats), ids = {};
    names.forEach(function (n, i) { ids[n] = i; });
    var d = Object.assign({ ids: ids, sleeveWide: 1 }, spec.draw);
    d.facePal = { L: [ids.lash, 2], i: [ids.iris, 2], I: [ids.iris, 3], W: [ids.lash, 4], m: [ids.lip, 2], b: [ids.blush, 2, true] };
    d.backHead = d.backHead || function (c) { backHead(c, ids.hair); };
    d.weaponFront = !!spec.weaponFront; d.elf = !!spec.elf; d.cuff = spec.cuff; d.lining = spec.lining; d.sleeveWide = spec.sleeveWide == null ? 1 : spec.sleeveWide;
    P.define(id, {
      w: W, h: H, cx: GX, k: 0.75, base: Object.assign({}, BASE, spec.base || {}), mats: names.map(function (n) { return spec.mats[n]; }),
      glow: spec.glow, face: [GX + 3, GY - 39], tip: [GX + 20, GY - 22], tipAttack: [GX + 26, GY - 22],
      anims: anims(spec.kind),
      aurora: aurora(spec.aurora, spec.auroraK),
      draw: function (F, p, t, anim, f) {
        var c = body(F, p, t, anim, f, d);
        if (spec.fx) spec.fx(c, F, p, t, anim, f);
      }
    });
  }
  var SKIN = { ramp: ['#6a3438', '#e0a693', '#f8d6c2', '#fde7d8', '#fff5ec'], round: 4, th: [0.26, 0.7, 0.97] };
  var LIP = { base: '#c4606a' }, BLUSH = { ramp: ['#d98a8a', '#e9a19a', '#f0b0a6', '#f4c0b4', '#ffd8cc'] };
  var LASH = { ramp: ['#120810', '#1e1018', '#2a1620', '#ffffff', '#ffffff'] };
  var SHOE = { base: '#2a2230' };
  var SKILL_FX = { slash: slash, sparkle: sparkle };

  // ================= 하린 — 검은 머리를 높게 묶은 검객. 검은 무복, 붉은·흰 띠, 붉은 끈 직검. 광채는 붉은 보라 =================
  hero('kai', {
    kind: 'sword',
    glow: { color: [255, 70, 96], width: 3, alpha: 0.5 },
    aurora: ['#ff3d6e', '#b35cff', '#ff9a6a'],
    mats: {
      skin: SKIN, lash: LASH, iris: { ramp: ['#3a0610', '#6a0e1c', '#b8202e', '#ff5a5a', '#ffffff'], eye: true }, lip: LIP, blush: BLUSH, shoe: SHOE,
      hair: { ramp: ['#0a0812', '#17152a', '#26264a', '#3e4278', '#6a70b0'], strand: true, th: [0.28, 0.66, 0.92] },
      robe: { ramp: ['#0a0a12', '#22222f', '#363648', '#54546e', '#7c7c9c'], th: [0.3, 0.64, 0.9] },
      sleeve: { ramp: ['#09090f', '#20202c', '#353546', '#525270', '#7a7a9a'] },
      sleeveB: { ramp: ['#060609', '#13131b', '#1f1f2a', '#2c2c3a', '#3c3c50'] },
      inner: { base: '#e6e2ec', light: 0.4 },
      sash: { base: '#c22c38', pat: '#f2e6d8' },
      tie: { base: '#d83a40' },
      ribbonR: { base: '#e0303c', light: 0.36 },
      blade: { ramp: ['#2a3040', '#8a94ac', '#c8d2e4', '#eef4ff', '#ffffff'] },
      hilt: { base: '#2a1e24' }, guard: { base: '#c8a040' },
      cuffR: { base: '#b8222e' }
    },
    cuff: 'cuffR', lining: 'cuffR',
    draw: {
      hairBack: function (c) {
        longHair(c, c.M.hair, { n: 5, len: 26 });
        // 높게 묶은 포니테일: 뒤통수 위에서 등 뒤로 길게
        var h = c.head, wv = c.wind, ph = c.t * TAU;
        var root = hp(h, -7.5, -8);
        for (var i = 0; i < 4; i++) {
          var k = i / 3;
          c.F.put(P.ribbon([root, [root[0] - 7 - wv * 6 - k * 2, root[1] + 3 + k * 3 + sin(ph) * 0.8], [root[0] - 12 - wv * 12 - k * 3, root[1] + 14 + k * 6 + sin(ph + k) * 1.5],
            [root[0] - 14 - wv * 15 - k * 2, root[1] + 26 + k * 4 + sin(ph + 1 + k) * 2]], 6 - k * 1.2, 0.6, 0.9), c.M.hair, { grp: 62, line: i ? 'soft' : 'full' });
        }
      },
      hairFront: function (c) {
        bangs(c, c.M.hair);
        // 붉은 리본(묶은 자리)
        var h = c.head, r = hp(h, -7.5, -8), wv = c.wind;
        c.F.put(P.blob([[r[0], r[1]], [r[0] - 3.5, r[1] - 3], [r[0] - 4, r[1] + 1]]), c.M.ribbonR, { cast: true });
        c.F.put(P.blob([[r[0], r[1]], [r[0] + 1.5, r[1] - 3.5], [r[0] + 3, r[1] - 0.5]]), c.M.ribbonR, { cast: true });
        c.F.put(P.ribbon([[r[0], r[1] + 0.5], [r[0] - 2 - wv * 2, r[1] + 5], [r[0] - 4 - wv * 4, r[1] + 9 + sin(c.t * TAU) * 0.8]], 1.8, 1), c.M.ribbonR, {});
        c.F.dot(r[0], r[1], c.M.ribbonR, 4);
      },
      skirt: function (c) { skirt(c, c.M.robe, { hem: 12, folds: [-0.55, 0.05, 0.6], trim: c.M.cuffR, trimW: 1 }); },
      torso: function (c) { torso(c, c.M.robe, { collar: c.M.inner, sash: c.M.sash, sashTie: c.M.tie, sashPat: { rows: ['x'], step: [1, 2], oy: 1 } }); },
      weapon: function (c) { sword(c, { tassel: c.M.tie, len: 17 }); }
    },
    fx: function (c, F, p, t, anim) {
      if (anim === 'attack' && p.fx >= 1 && c.tip) slash(F, c.bx + 6, c.shY + 6, 22, -0.85, -0.85 + 2.1 * p.fxk, '#ffffff', '#ff3d6e', 4.5, 0.85);
      if (anim === 'skill' && p.fx >= 2 && c.tip) for (var i = 0; i < 4; i++) sparkle(F, c.tip[0] + sin(i * 1.7 + t * 9) * 3, c.tip[1] + cos(i * 2.3 + t * 9) * 3, '#ff5a8a', 0.8 * p.fxk);
      if (anim === 'skill' && p.fx >= 3) { slash(F, c.bx + 8, c.shY + 6, 26, -0.9, -0.9 + 2.3 * p.fxk, '#ffffff', '#b35cff', 5.5, 0.9); slash(F, c.bx + 12, c.shY + 7, 18, -0.6, -0.6 + 1.7 * p.fxk, '#ffd0e0', '#ff3d6e', 3, 0.75); }
    }
  });

  // ================= 브리아 — 금발 땋은 머리의 수호기사. 은빛 흉갑·견갑, 푸른 겉옷과 망토, 연 모양 방패. 광채는 하늘빛 =================
  hero('bram', {
    kind: 'sword', sleeveWide: 0,
    glow: { color: [110, 180, 255], width: 3, alpha: 0.5 },
    aurora: ['#5ec8ff', '#7f9cff', '#fff2b0'],
    base: { aB: [0.5, -1.0] },
    mats: {
      skin: SKIN, lash: LASH, iris: { ramp: ['#08203a', '#103a6a', '#2a6ac8', '#6ab0ff', '#ffffff'], eye: true }, lip: LIP, blush: BLUSH, shoe: { base: '#5a6278' },
      hair: { ramp: ['#3a2410', '#a8742a', '#e2b048', '#f6d27a', '#fff0b8'], strand: true, th: [0.28, 0.62, 0.9] },
      plate: { ramp: ['#1a2234', '#5a6a8a', '#9aaccc', '#d0dcf0', '#ffffff'], th: [0.3, 0.6, 0.86], round: 3 },
      sleeve: { ramp: ['#1a2234', '#5a6a8a', '#9aaccc', '#d0dcf0', '#ffffff'] },
      sleeveB: { ramp: ['#12182a', '#3a4660', '#62708e', '#8a98b6', '#b0bcd6'] },
      coat: { ramp: ['#0a1430', '#1e3a7a', '#3462b8', '#5a8ae0', '#8ab4ff'] },
      cape: { ramp: ['#08102a', '#16285a', '#22408a', '#3458aa', '#4e74c8'] },
      gold: { ramp: ['#3a2408', '#a06a1a', '#e2a83a', '#ffd870', '#fff4c0'] },
      blade: { ramp: ['#2a3040', '#8a94ac', '#c8d2e4', '#eef4ff', '#ffffff'] },
      hilt: { base: '#3a2a20' }, guard: { base: '#e2a83a' }
    },
    cuff: 'gold',
    draw: {
      hairBack: function (c) {
        longHair(c, c.M.hair, { n: 4, len: 18 });
        // 땋은 머리: 굵은 마디를 번갈아 찍는다
        var h = c.head, wv = c.wind, ph = c.t * TAU, pts = [];
        for (var i = 0; i <= 7; i++) { var k = i / 7; pts.push([h[0] - 8 - k * 4 - wv * 8 * k * k + sin(ph + k * 3) * k, h[1] + 2 + k * 24]); }
        for (i = 0; i < 7; i++) c.F.put(P.ellipse((pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2, 2.6 - i * 0.15, 2.2, 0.3 * (i % 2 ? 1 : -1)), c.M.hair, { grp: 63 + i, line: 'soft' });
        c.F.put(P.ellipse(pts[7][0], pts[7][1] + 1, 1.6, 1.4), c.M.coat, { line: 'soft' });
      },
      cape: function (c) {
        var x = c.lx(c.shY), y = c.shY, wv = c.wind, ph = c.t * TAU;
        c.F.put(P.blob([[x - 5, y], [x + 3, y], [x + 1, y + 10], [x - 4 - wv * 6, c.by - 2 + sin(ph) * 0.8], [x - 13 - wv * 10, c.by - 1 + sin(ph + 1)], [x - 14 - wv * 9, y + 14], [x - 8, y + 3]]), c.M.cape, { round: 4, grp: 65 });
      },
      hairFront: function (c) {
        bangs(c, c.M.hair, { locks: [[-4, 0.15, 5], [-0.5, 0.25, 6], [3, 0.4, 5.5], [6, 0.55, 4.5], [8.5, 0.65, 3.5]] });
        var h = c.head;
        c.F.put(P.ribbon([hp(h, -7, -8), hp(h, 0, -11), hp(h, 7, -9)], 1.6, 1.6), c.M.gold, { line: 'soft' });   // 머리띠
      },
      skirt: function (c) { skirt(c, c.M.coat, { hem: 11, len: 0.92, trim: c.M.gold, trimW: 1, folds: [-0.5, 0.15, 0.6] }); },
      torso: function (c) {
        torso(c, c.M.plate, { w: 6.5, sash: c.M.gold });
        var s = c.shY, x0 = c.lx(s);
        // 가슴 가운데 장식과 견갑
        c.F.put(P.ellipse(x0 + 1, s + 5, 1.6, 1.6), c.M.coat, { line: 'soft' });
        c.F.put(P.ellipse(c.armF.S[0] + 0.5, c.armF.S[1] - 0.5, 4, 3, -0.3), c.M.plate, { cast: true, grp: 44 });
      },
      mid: function (c) { if (!c.back) shield(c, c.M.coat, c.M.gold); },
      weapon: function (c) { sword(c, { len: 16, w: 2.8 }); }
    },
    weaponFront: true,
    fx: function (c, F, p, t, anim) {
      if (anim === 'attack' && p.fx >= 1) slash(F, c.bx + 6, c.shY + 6, 21, -0.85, -0.85 + 2.1 * p.fxk, '#ffffff', '#5ec8ff', 4.5, 0.85);
      if (anim === 'skill' && p.fx >= 2 && c.tip) for (var i = 0; i < 5; i++) sparkle(F, c.tip[0] + sin(i * 1.9 + t * 9) * 4, c.tip[1] + cos(i * 2.1 + t * 9) * 4, '#fff2b0', 0.8 * p.fxk);
      if (anim === 'skill' && p.fx >= 3) { slash(F, c.bx + 8, c.shY + 6, 26, -0.9, -0.9 + 2.3 * p.fxk, '#ffffff', '#fff2b0', 6, 0.9); }
    }
  });

  // ================= 리라 — 엘프 원소술사. 구릿빛 긴 머리, 보석 머리띠, 금빛 무늬 보라 로브, 수정 지팡이. 광채는 보라·청록 =================
  hero('lyra', {
    kind: 'staff', elf: true,
    glow: { color: [190, 140, 255], width: 3, alpha: 0.5 },
    aurora: ['#c58cff', '#5ef0e0', '#ff8ad8'],
    base: { aF: [1.5, -0.9], wpn: -1.35 },
    mats: {
      skin: SKIN, lash: LASH, iris: { ramp: ['#062a24', '#0e5a4a', '#1fa88a', '#6af0d0', '#ffffff'], eye: true }, lip: LIP, blush: BLUSH, shoe: { base: '#4a2a5a' },
      hair: { ramp: ['#3a1206', '#9a3a16', '#d8642a', '#f69a52', '#ffd0a0'], strand: true, th: [0.28, 0.64, 0.9] },
      robe: { ramp: ['#160a2a', '#3a1e6a', '#5e36a8', '#8a5ad8', '#b88cff'], pat: '#f0c860', th: [0.3, 0.64, 0.9] },
      sleeve: { ramp: ['#160a2a', '#432474', '#6a3eb8', '#9468e0', '#c09cff'] },
      sleeveB: { ramp: ['#100620', '#2a1450', '#40247a', '#583a9a', '#7454b8'] },
      inner: { ramp: ['#2a1a10', '#b08a5a', '#f0dcb0', '#fff2d8', '#ffffff'] },
      gold: { ramp: ['#3a2408', '#a06a1a', '#e2a83a', '#ffd870', '#fff4c0'] },
      pole: { ramp: ['#1a0e08', '#4a2a16', '#7a4a26', '#a8703a', '#d09a5a'] },
      crystal: { ramp: ['#0a3a3a', '#1aa8a0', '#5ef0e0', '#b8fff4', '#ffffff'], emit: true }
    },
    cuff: 'gold', lining: 'gold',
    draw: {
      hairBack: function (c) { longHair(c, c.M.hair, { n: 7, len: 30, spread: 1.1 }); },
      hairFront: function (c) {
        bangs(c, c.M.hair, { locks: [[-4.5, 0.1, 5], [-1.5, 0.2, 6.5], [1.5, 0.3, 7], [4.5, 0.45, 6], [7.5, 0.6, 5]] });
        var h = c.head;
        c.F.put(P.ribbon([hp(h, -7.5, -6.5), hp(h, 0, -10.2), hp(h, 8, -7)], 1.2, 1.2), c.M.gold, { line: 'none' });
        gem(c.F, hp(h, 1.5, -10)[0], hp(h, 1.5, -10)[1], 1.4, c.M.crystal);
      },
      skirt: function (c) { skirt(c, c.M.robe, { hem: 13, pattern: { rows: ['.x.', 'x.x', '.x.'], step: [7, 6] }, trim: c.M.gold, trimW: 1 }); },
      torso: function (c) { torso(c, c.M.robe, { collar: c.M.inner, sash: c.M.gold }); },
      weapon: function (c) {
        staff(c, { up: 16, down: 10, top: function (cc, top, dir) {
          cc.F.put(P.ribbon([[top[0] - 3, top[1] + 2], [top[0] - 2.5, top[1] - 2], [top[0], top[1] - 4]], 1.4, 1.2), cc.M.gold, { line: 'soft' });
          cc.F.put(P.blob([[top[0], top[1] - 6], [top[0] + 2.2, top[1] - 2.5], [top[0], top[1] + 1], [top[0] - 2.2, top[1] - 2.5]]), cc.M.crystal, { line: 'soft' });
        } });
      }
    },
    weaponFront: true,
    fx: function (c, F, p, t, anim) {
      if ((anim === 'attack' || anim === 'skill') && p.fx >= 1 && c.tip) {
        var r = 3 + p.fxk * (anim === 'skill' ? 6 : 3);
        for (var a = 0; a < TAU; a += 0.25) F.glowPx('fx', c.tip[0] + cos(a + t * 6) * r, c.tip[1] - 3 + sin(a + t * 6) * r, P.hexRgb(a > 3 ? '#5ef0e0' : '#c58cff'), 0.7 * p.fxk);
        for (var i = 0; i < 6; i++) sparkle(F, c.tip[0] + sin(i * 2.2 + t * 7) * (r + 2), c.tip[1] - 3 + cos(i * 1.7 + t * 7) * (r + 2), '#b8fff4', 0.8 * p.fxk);
      }
    }
  });

  // ================= 세라 — 설원의 사제. 아주 긴 은빛 머리, 흰 베일과 금관, 금 테 흰 사제복과 푸른 띠, 해 문양 지팡이. 광채는 금빛 =================
  hero('sera', {
    kind: 'staff',
    glow: { color: [255, 220, 120], width: 3, alpha: 0.55 },
    aurora: ['#ffe27a', '#ffb0d8', '#9ae8ff'],
    base: { aF: [1.5, -0.9], wpn: -1.4 },
    mats: {
      skin: SKIN, lash: LASH, iris: { ramp: ['#2a1a06', '#6a4a10', '#c89a2a', '#ffe27a', '#ffffff'], eye: true }, lip: LIP, blush: BLUSH, shoe: { base: '#c8b890' },
      hair: { ramp: ['#3a3848', '#9a98b0', '#d6d4e4', '#f0eef8', '#ffffff'], strand: true, th: [0.28, 0.62, 0.9] },
      robe: { ramp: ['#3a3a52', '#a8aac4', '#e2e4f0', '#f6f6fc', '#ffffff'], th: [0.3, 0.62, 0.88] },
      sleeve: { ramp: ['#3a3a52', '#b0b2cc', '#e6e8f4', '#f8f8fe', '#ffffff'] },
      sleeveB: { ramp: ['#2a2a3e', '#8486a2', '#b4b6cc', '#cccee0', '#e0e2f0'] },
      veil: { ramp: ['#3a3a52', '#b8bcd4', '#eceef8', '#ffffff', '#ffffff'] },
      sash: { ramp: ['#081a3a', '#1a3a7a', '#2e62c0', '#5a8ae8', '#9ab8ff'] },
      gold: { ramp: ['#3a2408', '#a06a1a', '#e2a83a', '#ffd870', '#fff4c0'] },
      pole: { ramp: ['#3a2408', '#a06a1a', '#e2a83a', '#ffd870', '#fff4c0'] },
      sun: { ramp: ['#6a4a10', '#e2a83a', '#ffe27a', '#fff6c8', '#ffffff'], emit: true }
    },
    cuff: 'gold', lining: 'sash',
    draw: {
      hairBack: function (c) {
        // 베일(머리 뒤로 늘어진 흰 천)
        var h = c.head, wv = c.wind, ph = c.t * TAU;
        c.F.put(P.blob([hp(h, -7, -9), hp(h, 3, -11), [h[0] + 2, h[1] + 4], [h[0] - 4 - wv * 6, c.by - 8 + sin(ph)], [h[0] - 14 - wv * 9, c.by - 10 + sin(ph + 1)], [h[0] - 13, h[1] + 4]]), c.M.veil, { round: 4, grp: 59 });
        longHair(c, c.M.hair, { n: 7, len: 34 });
      },
      hairFront: function (c) {
        bangs(c, c.M.hair, { locks: [[-4, 0.05, 5.5], [-1, 0.15, 7], [2, 0.25, 7.5], [5, 0.4, 6.5], [8, 0.55, 5.5]] });
        var h = c.head;
        c.F.put(P.ribbon([hp(h, -7, -7.5), hp(h, 0, -11), hp(h, 7.5, -8)], 1.8, 1.8), c.M.gold, { line: 'soft' });   // 금관
        gem(c.F, hp(h, 0.5, -11.5)[0], hp(h, 0.5, -11.5)[1], 1.3, c.M.sun);
      },
      skirt: function (c) { skirt(c, c.M.robe, { hem: 13, trim: c.M.gold, trimW: 2, folds: [-0.5, 0.05, 0.55] }); },
      torso: function (c) {
        torso(c, c.M.robe, { collar: c.M.gold, sash: c.M.sash, sashTie: c.M.sash });
        var s = c.shY, x0 = c.lx(s);
        c.F.put(P.ribbon([[x0 + 1, s + 1], [x0 + 1, s + 8]], 1.4, 1.4), c.M.gold, { line: 'none' });   // 가슴 금줄
      },
      weapon: function (c) {
        staff(c, { up: 16, down: 10, top: function (cc, top) {
          cc.F.put(P.ellipse(top[0], top[1] - 3.5, 4, 4), cc.M.gold, { line: 'soft' });
          cc.F.put(P.ellipse(top[0], top[1] - 3.5, 2.2, 2.2), cc.M.sun, { line: 'none' });
          for (var a = 0; a < TAU; a += TAU / 8) cc.F.dot(top[0] + cos(a) * 5.4, top[1] - 3.5 + sin(a) * 5.4, cc.M.gold, 3);
        } });
      }
    },
    weaponFront: true,
    fx: function (c, F, p, t, anim) {
      if ((anim === 'attack' || anim === 'skill') && p.fx >= 1 && c.tip) {
        var r = 5 + p.fxk * (anim === 'skill' ? 7 : 3);
        for (var a = 0; a < TAU; a += TAU / 12) {
          for (var k = 0; k < r; k += 0.7) F.glowPx('fx', c.tip[0] + cos(a + t * 2) * (r * 0.6 + k), c.tip[1] - 3.5 + sin(a + t * 2) * (r * 0.6 + k), [255, 236, 160], 0.35 * p.fxk * (1 - k / r));
        }
        sparkle(F, c.tip[0], c.tip[1] - 3.5, '#fff6c8', 0.9 * p.fxk);
      }
    }
  });

  // ================= 소연 — 사천당가의 암기술사. 검은 머리 쌍상투와 긴 꼬리, 얼굴 가리개, 초록 무복과 흰 바지, 비수 두 자루. 광채는 독빛 초록 =================
  hero('nox', {
    kind: 'dagger', sleeveWide: 0.6,
    glow: { color: [120, 240, 130], width: 2, alpha: 0.32 },
    aurora: ['#7cf27c', '#3ad8c0', '#d8ff6a'],
    base: { aF: [0.6, -1.2], aB: [-0.1, -1.4], wpn: -0.2 },
    mats: {
      skin: SKIN, lash: LASH, iris: { ramp: ['#062a12', '#0e5a26', '#1fa84a', '#7cf27c', '#ffffff'], eye: true }, lip: LIP, blush: BLUSH, shoe: { base: '#1e2a22' },
      hair: { ramp: ['#060810', '#121624', '#1e2436', '#323c58', '#56648a'], strand: true, th: [0.28, 0.66, 0.92] },
      robe: { ramp: ['#04140c', '#0e3a22', '#1c6a3e', '#2e9a5a', '#5ccc86'], th: [0.3, 0.64, 0.9] },
      sleeve: { ramp: ['#04140c', '#104226', '#20764a', '#34a868', '#64d896'] },
      sleeveB: { ramp: ['#030c08', '#0a2a18', '#124a2c', '#1c6a40', '#2e8a58'] },
      pants: { ramp: ['#202430', '#8a90a4', '#c8ccd8', '#e6e8f0', '#ffffff'] },
      mask: { ramp: ['#0a1a10', '#2a4a36', '#3e6a50', '#5a8a6a', '#7aaa8a'] },
      sash: { base: '#2a2a3a', pat: '#7cf27c' },
      tie: { base: '#7cf27c' },
      blade: { ramp: ['#1a3a2a', '#6aa88a', '#b8e8cc', '#e8fff2', '#ffffff'] },
      hilt: { base: '#1a1a24' }
    },
    cuff: 'tie',
    draw: {
      hairBack: function (c) {
        longHair(c, c.M.hair, { n: 4, len: 16 });
        // 쌍상투에서 늘어진 두 꼬리
        var h = c.head, wv = c.wind, ph = c.t * TAU;
        [-1, 1].forEach(function (sd, i) {
          var r = hp(h, sd < 0 ? -7 : 3, -10);
          c.F.put(P.ribbon([r, [r[0] - 4 - wv * 5, r[1] + 8], [r[0] - 7 - wv * 10 + sin(ph + i) * 1.2, r[1] + 20 + i * 2]], 3.6, 0.6, 0.8), c.M.hair, { grp: 62 + i });
        });
      },
      hairFront: function (c) {
        bangs(c, c.M.hair, { locks: [[-4, 0.2, 4.5], [-1, 0.3, 5.5], [2.5, 0.4, 5], [5.5, 0.55, 4], [8, 0.65, 3.5]] });
        var h = c.head;
        [[-6.5, -10.5], [3.5, -11.5]].forEach(function (b) {   // 상투
          var q = hp(h, b[0], b[1]);
          c.F.put(P.ellipse(q[0], q[1], 3.4, 3), c.M.hair, { cast: true });
          c.F.put(P.ribbon([[q[0] - 2.5, q[1] + 1.8], [q[0] + 2.5, q[1] + 1.8]], 1.2, 1.2), c.M.tie, { line: 'none' });
        });
        // 얼굴 가리개: 코 아래를 덮는 천
        var m1 = hp(h, -1, 3.2), m2 = hp(h, 9, 2.5);
        c.F.put(P.blob([[m1[0], m1[1]], [m2[0], m2[1]], [m2[0] - 0.5, m2[1] + 4.5], [m1[0] + 4, m1[1] + 6], [m1[0] - 1, m1[1] + 4]]), c.M.mask, { cast: true, round: 2 });
      },
      skirt: function (c) {
        // 바지 + 짧은 저고리 자락
        var x = c.lx(c.hipY), y = c.hipY, st = c.p.step;
        c.F.put(P.ribbon([[x - 2.5, y], [x - 3.5 - st, c.by - 2]], 4.6, 4), c.M.pants, { grp: 31 });
        c.F.put(P.ribbon([[x + 2.5, y], [x + 4 + st, c.by - 2]], 4.6, 4), c.M.pants, { grp: 32 });
        skirt(c, c.M.robe, { hem: 9.5, len: 0.55, waist: 6.5, folds: [-0.5, 0.4], fast: true });
      },
      torso: function (c) { torso(c, c.M.robe, { collar: c.M.pants, sash: c.M.sash, sashTie: c.M.tie, sashPat: { rows: ['x.'], step: [2, 4], oy: 1 } }); },
      weapon: function (c) { c.tip = dagger(c, c.armF.H, c.p.wpn); dagger(c, c.armB.H, c.p.wpn + 0.6); }
    },
    weaponFront: true,
    fx: function (c, F, p, t, anim) {
      if ((anim === 'attack' || anim === 'skill') && p.fx >= 1 && c.tip) {
        // 날아가는 암기: 손에서 앞으로 줄지어
        var n = anim === 'skill' ? 5 : 2;
        for (var i = 0; i < n; i++) {
          var d = 4 + p.fxk * (14 + i * 4), y = c.tip[1] + (i - n / 2) * 2.5 * (anim === 'skill' ? 1.6 : 1);
          for (var k = 0; k < 5; k++) F.glowPx('fx', c.tip[0] + d - k, y, k ? [124, 242, 124] : [255, 255, 255], (1 - k / 5) * 0.9);
        }
        for (var j = 0; j < 4; j++) F.glowPx('fx', c.bx + sin(j * 2 + t * 8) * 8, c.shY + 6 + cos(j * 1.5 + t * 8) * 6, [124, 242, 124], 0.5 * p.fxk);
      }
    }
  });

  // 거울의 그림자(5종)도 새 그림에서 다시 만든다(왼쪽을 보고 어두운 보랏빛)
  var Sh = Game.Shape;
  if (Sh && Sh.variant) ['kai', 'bram', 'lyra', 'sera', 'nox'].forEach(function (id) { Sh.variant('shadow_' + id, id, { flip: true, remap: Sh.shadowRemap }); });

  Game.PuppetKit = { body: body, skirt: skirt, torso: torso, longHair: longHair, bangs: bangs, backHead: backHead, sword: sword, slash: slash, sparkle: sparkle, aurora: aurora, anims: anims, hero: hero,
    SKIN: SKIN, LIP: LIP, BLUSH: BLUSH, LASH: LASH, SHOE: SHOE, FX: SKILL_FX, GX: GX, GY: GY };
})();
