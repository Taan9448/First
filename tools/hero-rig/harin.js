// 하린: 자세 → 부위 목록. 머리도 도형(머리채·앞머리·옆머리·얼굴)으로 짜고 눈·입만 칸으로 찍는다
const R = {
  hair: ['#16142a', '#26223e', '#3a345e', '#5a5488', '#8e86c0'],
  white: ['#7c8098', '#bcc0d4', '#e6e8f2', '#ffffff'],
  ink: ['#08080e', '#12121c', '#1e1e2c', '#2e2e40'],
  red: ['#5a1018', '#9a2430', '#d03c3c', '#f06a5a'],
  skirt: ['#0a0a10', '#14141c', '#20202c', '#2e2e3e'],
  skin: ['#c98478', '#f2b8a4', '#fde2d0', '#fff2e8'],
  blade: ['#060408', '#141018', '#221c2a', '#3a3246'],
};
const EYE = { k: '#1c1424', w: '#ffffff', E: '#c8343c', F: '#ff8a70', e: '#4a0c18', b: '#f6a4a0', m: '#b04c4c', S: '#e8a490' };
const rad = (d) => d * Math.PI / 180, dir = (d, l) => [Math.cos(rad(d)) * l, Math.sin(rad(d)) * l];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const wave = (t, k, a) => Math.sin(t * Math.PI * 2 + k * 1.1) * a;
function arc(cx, cy, a0, a1, r0, r1, n) {
  const out = [], inn = [];
  for (let i = 0; i <= n; i++) { const t = i / n, a = rad(a0 + (a1 - a0) * t), w = Math.sin(t * Math.PI); out.push([cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]); inn.push([cx + Math.cos(a) * (r1 - (r1 - r0) * w), cy + Math.sin(a) * (r1 - (r1 - r0) * w)]); }
  return out.concat(inn.reverse());
}
// 눈·눈썹·입: 얼굴 기준점(C)에서의 칸. 앞눈(왼쪽, 큼) · 뒷눈(오른쪽, 좁음)
const FACE = [
  // 앞눈(왼쪽): 두꺼운 윗속눈썹 + 바깥 꼬리, 눈동자 3줄
  [0, -2, 'k'], [1, -2, 'k'], [2, -2, 'k'], [-1, -1, 'k'], [0, -1, 'k'], [1, -1, 'k'], [2, -1, 'k'], [-1, 0, 'k'],
  [0, 0, 'w'], [1, 0, 'e'], [2, 0, 'e'],
  [0, 1, 'E'], [1, 1, 'e'], [2, 1, 'E'],
  [0, 2, 'F'], [1, 2, 'E'], [2, 2, 'F'],
  // 뒷눈(오른쪽, 좁음)
  [6, -2, 'k'], [7, -2, 'k'], [6, -1, 'k'], [7, -1, 'k'], [8, -1, 'k'],
  [6, 0, 'w'], [7, 0, 'e'],
  [6, 1, 'E'], [7, 1, 'e'],
  [6, 2, 'F'], [7, 2, 'E'],
  // 볼·입
  [-1, 3, 'b'], [0, 3, 'b'], [7, 3, 'b'], [8, 3, 'b'], [4, 5, 'm']
];
function headShapes(N, t, p) {
  const C = [N[0] + 1, N[1] - 9], c = (x, y) => [C[0] + x, C[1] + y], S = [];
  // 뒷머리 덩어리
  S.push({ k: 'ell', x: C[0] - 0.5, y: C[1] - 3, rx: 11, ry: 9.4, ramp: R.hair, group: 'hairB' });
  // 얼굴
  S.push({ k: 'poly', pts: [c(-5, -6), c(9.5, -6), c(10, 1), c(8.5, 5), c(5.5, 7.6), c(2, 7.8), c(-2, 6), c(-5.2, 2)], ramp: R.skin, light: [1, -1], deep: 0, group: 'face' });
  // 앞머리: 아래 끝이 톱니처럼 갈라진다
  const bang = [c(-8, -9), c(-2, -12.5), c(5, -12.2), c(10.4, -8), c(11, -3), c(10, 1), c(8.8, -3.6), c(7.6, -2.6), c(6, -4.4), c(4.4, 0.4), c(3.2, -4.4), c(1.8, -2.8), c(0, -4.5), c(-2.2, -0.6), c(-4, -4), c(-7, 1)];
  S.push({ k: 'poly', pts: bang, ramp: R.hair, group: 'hairF' });
  // 윤기 띠
  S.push({ k: 'line', pts: [c(-5, -8), c(-2, -10), c(2, -10.4), c(5, -9.4)], c: R.hair[4], on: 'any' });
  S.push({ k: 'line', pts: [c(-6, -6), c(-4, -8)], c: R.hair[3], on: 'any' });
  // 옆머리: 앞(왼쪽 볼 앞) · 뒤(오른쪽 볼 끝)
  const sw = p.wind * 0.6;
  S.push({ k: 'caps', pts: [c(-5.6, -3), c(-6.2 - sw, 4), c(-5.8 - sw * 1.6, 10 + wave(t, 1, 0.3))], r: [2.2, 1.7, 0.7], ramp: R.hair, group: 'hairF' });
  S.push({ k: 'caps', pts: [c(10.2, -2), c(10.4 - sw, 3), c(9.8 - sw * 1.4, 7)], r: [1.3, 1.1, 0.6], ramp: R.hair, group: 'hairF' });
  S.push({ k: 'px', pts: FACE.map((q) => [C[0] + q[0], C[1] + q[1], EYE[q[2]]]), keep: 1 });
  return { S, C };
}
function shapes(p, t) {
  p = Object.assign({ x: 0, y: 0, lean: 1, crouch: 0, aF: [58, -38], aB: [105, 15], sw: 18, wind: 0.25, flare: 0, step: 1 }, p);
  const S = [], Hp = [40 + p.x, 50 + p.y + p.crouch * 0.5], N = [Hp[0] + p.lean, Hp[1] - 12 + p.crouch];
  const rel = (q, o) => [o[0] + q[0], o[1] + q[1]], w = p.wind;
  const hd = headShapes(N, t, p), C = hd.C;
  // 포니테일: 정수리 뒤에서 솟았다가 허리까지 처진다. 바람이 불면 뒤로 눕는다
  const base = [C[0] - 4, C[1] - 10];
  const steps = [[-2.6, -2.6], [-3, -0.4], [-2.4, 2], [-1.4, 3.2], [-0.8, 3.6], [-0.4, 3.8], [0, 3.8], [0.2, 3.4]];
  const pt = [base], rr = [2.6, 3.6, 3.9, 3.6, 3.2, 2.7, 2.2, 1.5, 0.8];
  steps.forEach((d, k) => { const q = pt[k]; pt.push([q[0] + d[0] - w * (0.5 + k * 0.45), q[1] + d[1] - w * k * 0.42 + wave(t, k, 0.18 * k)]); });
  S.push({ k: 'caps', pts: pt, r: rr, ramp: R.hair, group: 'tail' });
  const n = pt.length, tipA = pt[n - 3];
  S.push({ k: 'caps', pts: [tipA, [tipA[0] - 3 - w, tipA[1] + 3 + wave(t, 3, 0.4)]], r: [1.2, 0.5], ramp: R.hair, group: 'tail' });
  S.push({ k: 'line', pts: pt.slice(1, 6).map((q, i) => [q[0] + 0.8, q[1] - 2 + i * 0.4]), c: R.hair[3], on: 'any' });
  S.push({ k: 'line', pts: pt.slice(2, 7).map((q) => [q[0] - 0.6, q[1] + 0.8]), c: R.hair[1], on: 'any' });
  // 허리띠 꼬리
  [0, 1].forEach((j) => {
    const b = rel([-4.5, 12 + j], N), pts = [b];
    for (let k = 1; k <= 6; k++) pts.push([pts[k - 1][0] - 2.1 - w * 1.4 + j * 0.4, pts[k - 1][1] + 1.6 - w * 0.55 + wave(t + j * 0.3, k, 0.7)]);
    S.push({ k: 'caps', pts, r: [1.1, 1, 1, 0.9, 0.9, 0.8, 1.3], ramp: R.red, deep: 0, group: 'sash' + j });
  });
  // 큰 소매: 팔뚝에서 자루처럼 늘어지고 끝이 먹에 물든다
  function sleeve(sh, a, dark, L) {
    const e = add(sh, dir(a[0], 5)), wr = add(e, dir(a[0] + a[1], 5)), fa = a[0] + a[1];
    const gl = Math.hypot(-w * 0.7, 1), g = [(-w * 0.7 - 0.15) / gl, 1 / gl];
    const A = add(e, dir(fa - 90, 1.8)), B = add(wr, dir(fa - 90, 2.4)), Cc = add(wr, dir(fa + 90, 2.6));
    const D = add(add(wr, g, L * 0.85), dir(fa, 0.4)), E = add(add(e, g, L), dir(fa + 180, 3)), F = add(add(e, g, L * 0.35), dir(fa + 180, 3.6));
    const ramp = dark ? R.white.map((c, i) => R.white[Math.max(0, i - 1)]) : R.white, grp = 'sl' + (dark ? 'B' : 'F');
    const out = [{ k: 'union', list: [{ k: 'caps', pts: [sh, e, wr], r: [2.6, 2.6, 2.3] }, { k: 'poly', pts: [A, B, Cc, D, E, F] }], ramp, group: grp, edge: '#4a4c66' }];
    const lo = [];
    for (let i = 0; i <= 5; i++) { const u = i / 5, q = add(add(wr, g, L * 0.66), dir(fa, 2.5)), r = add(add(e, g, L * 0.8), dir(fa + 180, 5)); lo.push([q[0] + (r[0] - q[0]) * u, q[1] + (r[1] - q[1]) * u + (i % 2 ? 1 : -0.4)]); }
    out.push({ k: 'poly', pts: lo.concat([add(E, g, 4), add(D, g, 4)]).concat([add(add(wr, g, L * 0.66), dir(fa, 2.5))]), ramp: dark ? R.ink.map((c, i) => R.ink[Math.max(0, i - 1)]) : R.ink, group: grp, clip: -1 });
    out.push({ k: 'line', pts: [B, Cc], c: R.red[2], on: 'any' });
    out.push({ k: 'line', pts: [add(B, dir(fa + 180, 1)), add(Cc, dir(fa + 180, 1))], c: R.red[1], on: 'any' });
    return { out, wr, fa };
  }
  const back = sleeve(rel([-3, 3], N), p.aB, true, 10);
  S.push(...back.out);
  S.push({ k: 'ell', x: back.wr[0] + 0.5, y: back.wr[1] + 0.5, rx: 1.3, ry: 1.3, ramp: R.skin, flat: 1 });
  // 발
  S.push({ k: 'ell', x: Hp[0] - 4 - p.step, y: Hp[1] + 17.5, rx: 2.6, ry: 1.3, ramp: R.ink });
  // 하카마: 허리에서 넓게 퍼지고 단이 흔들린다. 흰 먹꽃 무늬
  const top = N[1] + 12, bot = Hp[1] + 17, hem = [];
  for (let k = 0; k <= 8; k++) { const u = k / 8; hem.push([Hp[0] + 11 + p.flare + p.step * 0.6 - u * (23 + p.flare * 2 + p.step * 1.2) - w * 2.5 * u, bot + wave(t, k, 0.6) * (0.3 + Math.abs(w)) - w * u * 1.8 + (k % 2 ? 0.7 : 0)]); }
  const mid = (Hp[0] - N[0]) * 0.3;
  S.push({ k: 'poly', pts: [[N[0] - 5 + mid, top], [N[0] + 5 + mid, top]].concat(hem), ramp: R.skirt }); const sk = S.length - 1;
  [[3, 2], [-1.5, 4], [-5, 6.5]].forEach(([dx, h]) => S.push({ k: 'line', pts: [[Hp[0] + dx * 0.7, top + 1.5], [hem[Math.round(h)][0] + 1, hem[Math.round(h)][1] - 1.2]], c: R.skirt[0], on: [sk] }));
  [[5, 13, 1], [-6, 11, 0], [1, 7, 2]].forEach(([dx, dy, s]) => {
    const c0 = [Hp[0] + dx - w * dy * 0.12, top + dy], pet = s === 2 ? [[0, 0], [1, 0], [0, 1]] : [[0, -1], [-1, 0], [1, 0], [0, 1]];
    S.push({ k: 'line', pts: pet.map((q) => [c0[0] + q[0], c0[1] + q[1]]), c: R.white[1], on: [sk] });
    S.push({ k: 'line', pts: [c0, c0], c: R.red[2], on: [sk] });
  });
  S.push({ k: 'line', pts: hem.map((q) => [q[0], q[1] - 1.2]), c: R.red[1], on: [sk] });
  S.push({ k: 'ell', x: Hp[0] + 6 + p.step, y: Hp[1] + 17.5, rx: 2.8, ry: 1.3, ramp: R.ink });
  // 몸통: 흰 저고리에 먹빛 깃, 붉은 띠
  S.push({ k: 'poly', pts: [[-4.5, 0.5], [3.5, 0], [6, 3.5], [5, 12], [-5, 12], [-6, 4.5]].map((q) => rel(q, N)), ramp: R.white, group: 'torso', edge: '#4a4c66' });
  S.push({ k: 'poly', pts: [[-2.2, 0], [-0.4, 0], [3.6, 8.8], [1.8, 8.8]].map((q) => rel(q, N)), ramp: R.ink, line: false, group: 'torso' });
  S.push({ k: 'poly', pts: [[2.6, 0], [4.2, 0.4], [3.2, 4.4]].map((q) => rel(q, N)), ramp: R.ink, line: false, group: 'torso' });
  S.push({ k: 'poly', pts: [[-5.6, 8.6], [5.8, 8.6], [5.6, 12.6], [-5.4, 12.6]].map((q) => rel(q, N)), ramp: R.red, group: 'belt' });
  S.push({ k: 'line', pts: [rel([-5, 10.6], N), rel([5.5, 10.6], N)], c: R.ink[1], on: [S.length - 1] });
  S.push({ k: 'line', pts: [rel([1, 9.6], N), rel([1, 11.6], N)], c: '#e8c35a', on: 'any' });
  // 머리
  S.push(...hd.S);
  // 리본: 포니테일 뿌리에 나비 매듭
  const rb = [Math.round(pt[0][0] + 1), Math.round(pt[0][1] - 1)], RB = [
    [-3, -2, 1], [-2, -2, 2], [-3, -1, 1], [-2, -1, 2], [-1, -1, 2], [-3, 0, 1], [-2, 0, 1], [-1, 0, 2], [-3, 1, 0], [-2, 1, 1],
    [0, -1, 3], [0, 0, 2], [1, -1, 2], [2, -2, 2], [3, -2, 1], [1, 0, 2], [2, -1, 3], [3, -1, 1], [2, 0, 1], [3, 0, 1], [3, 1, 0], [2, 1, 1],
    [0, 1, 1], [0, 2, 1], [1, 2, 2], [1, 3, 1], [-1, 2, 1], [-1, 3, 1], [-1, 4, 0], [1, 4, 0]];
  S.push({ k: 'px', pts: RB.map((q) => [rb[0] + q[0], rb[1] + q[1], R.red[q[2]]]) });
  // 앞팔과 검
  const front = sleeve(rel([2, 3.5], N), p.aF, false, 11), wf = front.wr;
  const tip = add(wf, dir(p.sw, 23)), gr = add(wf, dir(p.sw, -3.6));
  const sword = [
    { k: 'caps', pts: [wf, add(wf, dir(p.sw, 21)), tip], r: [1.05, 1, 0.4], ramp: R.blade, deep: 0, group: 'sword' },
    { k: 'line', pts: [add(add(wf, dir(p.sw, 3)), dir(p.sw - 90, 0.8)), add(add(wf, dir(p.sw, 21)), dir(p.sw - 90, 0.6))], c: '#8a86a8', on: 'any' },
    { k: 'caps', pts: [add(wf, dir(p.sw + 90, 2)), add(wf, dir(p.sw - 90, 2))], r: [0.8, 0.8], ramp: R.red, flat: 1, group: 'sword' },
    { k: 'caps', pts: [wf, gr], r: [0.8, 0.8], ramp: R.ink, group: 'sword' }
  ];
  const ts = [gr]; for (let k = 1; k <= 4; k++) ts.push([ts[k - 1][0] - 0.7 - w, ts[k - 1][1] + 1.4 + wave(t, k, 0.4)]);
  sword.push({ k: 'caps', pts: ts, r: [0.7, 0.7, 0.7, 0.6, 1], ramp: R.red, deep: 0, group: 'tassel' });
  const behind = p.sw < -100 || p.sw > 150;
  if (behind) S.push(...sword);
  S.push(...front.out);
  if (!behind) S.push(...sword);
  S.push({ k: 'ell', x: wf[0] + 0.5, y: wf[1] + 0.5, rx: 1.5, ry: 1.4, ramp: R.skin, line: false });
  // 검기
  const sfp = rel([2, 3.5], N);
  (p.fx || []).forEach((f, i) => {
    const cc = f.c ? rel(f.c, N) : sfp;
    S.push({ k: 'poly', pts: arc(cc[0], cc[1], f.a0, f.a1, f.r0, f.r1, 16), ramp: ['#000000', '#0c080e', '#1a1018', '#3a1820'], group: 'fx' + i, line: false });
    S.push({ k: 'poly', pts: arc(cc[0], cc[1], f.a0 + (f.a1 - f.a0) * 0.2, f.a1, f.r1 - 1.4, f.r1 + 0.2, 14), ramp: ['#ffffff', '#ffffff', '#fff0ea', '#ffffff'], flat: 1, line: false, group: 'fx' + i });
    S.push({ k: 'poly', pts: arc(cc[0], cc[1], f.a0 + (f.a1 - f.a0) * 0.45, f.a1, f.r1 - 2.6, f.r1 - 1.3, 12), ramp: ['#e04848', '#e04848', '#e04848', '#e04848'], flat: 1, line: false, group: 'fx' + i });
  });
  return S;
}
const IDLE = { lean: 1, step: 1, aF: [58, -38], aB: [105, 15], sw: 18, wind: 0.25 };
const K = (o) => Object.assign({}, IDLE, o);
const ANIM = {
  idle: [0, 1, 2, 3, 4, 5].map((i) => { const b = Math.round((1 - Math.cos(i / 6 * Math.PI * 2)) * 0.5); return K({ crouch: b, aF: [58, -38 + b * 3], sw: 18 + b * 3, wind: 0.25 + b * 0.1 }); }),
  attack: [
    K({ crouch: 1, aF: [40, -60], sw: -20 }),
    K({ lean: -2, crouch: 1, aF: [-115, -30], aB: [120, 20], sw: -165, wind: -0.2, step: 0 }),
    K({ lean: -3, crouch: 2, aF: [-135, -25], aB: [125, 20], sw: -178, wind: -0.3, step: 1 }),
    K({ x: 5, lean: 3, aF: [-25, 0], aB: [150, 10], sw: -12, wind: 1, step: 3, flare: 1, fx: [{ a0: -175, a1: -15, r0: 14, r1: 25 }] }),
    K({ x: 8, lean: 4, crouch: 2, aF: [35, 10], aB: [160, 10], sw: 55, wind: 1.1, step: 4, flare: 2, fx: [{ a0: -150, a1: 50, r0: 16, r1: 26 }] }),
    K({ x: 8, lean: 3, crouch: 2, aF: [42, 10], aB: [140, 10], sw: 66, wind: 0.8, step: 4, flare: 1, fx: [{ a0: -40, a1: 55, r0: 20, r1: 26 }] }),
    K({ x: 4, lean: 2, crouch: 1, aF: [52, -20], sw: 40, wind: 0.5, step: 2 }),
    K({ x: 1, aF: [56, -34], sw: 22, wind: 0.3 })
  ],
  skill: [
    K({ crouch: 1, aF: [-20, -80], sw: -80, wind: 0.4 }),
    K({ crouch: 2, aF: [-25, -80], sw: -86, wind: 0.6 }),
    K({ crouch: 3, lean: -2, aF: [130, 10], aB: [70, -20], sw: 170, wind: 0.2, step: 2 }),
    K({ y: -7, x: 3, aF: [-100, -20], aB: [150, 0], sw: -150, wind: 1.2, flare: 2, step: 3 }),
    K({ y: -6, x: 7, lean: 3, aF: [30, 10], aB: [160, 0], sw: 55, wind: 1.2, flare: 2, step: 3, fx: [{ a0: -140, a1: 60, r0: 15, r1: 25 }] }),
    K({ y: -5, x: 8, aF: [-140, -20], aB: [150, 0], sw: -170, wind: 1, flare: 1, step: 2 }),
    K({ y: -4, x: 10, lean: 3, aF: [-10, 0], aB: [170, 0], sw: 0, wind: 1.3, flare: 2, step: 3, fx: [{ a0: -170, a1: 10, r0: 12, r1: 24 }] }),
    K({ y: -8, x: 10, aF: [-150, -20], aB: [140, 0], sw: -95, wind: 0.8, flare: 1, step: 2 }),
    K({ y: -10, x: 11, lean: -1, aF: [-160, -10], aB: [130, 0], sw: -112, wind: 0.6, flare: 2, step: 3 }),
    K({ x: 13, crouch: 3, lean: 5, aF: [60, 10], aB: [170, 0], sw: 80, wind: 1.4, flare: 3, step: 4, fx: [{ a0: -120, a1: 90, r0: 18, r1: 31 }] }),
    K({ x: 13, crouch: 3, lean: 5, aF: [62, 10], aB: [170, 0], sw: 82, wind: 1.1, flare: 3, step: 4, fx: [{ a0: -60, a1: 90, r0: 25, r1: 31 }] }),
    K({ x: 13, crouch: 3, lean: 4, aF: [62, 10], aB: [160, 0], sw: 82, wind: 0.8, flare: 2, step: 4 }),
    K({ x: 12, crouch: 2, lean: 3, aF: [58, 0], aB: [140, 10], sw: 70, wind: 0.6, flare: 1, step: 3 }),
    K({ x: 8, crouch: 1, aF: [40, -20], aB: [120, 10], sw: 8, wind: 0.5, step: 2 }),
    K({ x: 4, aF: [50, -30], sw: 14, wind: 0.4 }),
    K({ x: 1, aF: [56, -36], sw: 18, wind: 0.3 })
  ]
};
module.exports = { shapes, ANIM };
