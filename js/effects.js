// effects.js — 저해상도 캔버스 도트 파티클, 화면 흔들림·번쩍임, 카드 고유 이펙트(sfx)
// 캔버스를 화면의 1/SCALE 해상도로 만들고 확대해서, 원·선·궤적까지 모두 굵은 픽셀로 보이게 한다.
(function () {
  'use strict';
  var G = Game;
  var SCALE = 3;
  var cv = null, ctx = null, parts = [], running = false;

  var FX = G.FX = { low: false };

  function host() { return document.getElementById('app'); }
  function ensure() {
    if (cv) return;
    cv = document.createElement('canvas');
    cv.id = 'fxcanvas';
    host().appendChild(cv);
    ctx = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function resize() {
    if (!cv) return;
    var r = host().getBoundingClientRect();
    cv.width = Math.ceil(r.width / SCALE);
    cv.height = Math.ceil(r.height / SCALE);
  }
  function n(count) { return Math.max(1, Math.round(count * (FX.low ? 0.3 : 1))); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // 화면 좌표(#app 기준 px) → 캔버스 좌표
  function cp(p) { return { x: p.x / SCALE, y: p.y / SCALE }; }

  function add(p) {
    p.life = p.max = p.life || 30;
    parts.push(p);
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  var frame = 0, slowUntil = 0;
  // 슬로모션: 그동안은 두 프레임에 한 번만 움직인다
  FX.slow = function (ms) { slowUntil = performance.now() + (FX.low ? 0 : ms); };

  function tick() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    frame++;
    var still = performance.now() < slowUntil && frame % 3 !== 0;
    var next = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (still) { draw(p); next.push(p); continue; }
      if (p.delay > 0) { p.delay--; next.push(p); continue; }
      p.life--;
      if (p.life <= 0) continue;
      if (p.update) p.update(p);
      else {
        p.vy += p.g || 0;
        p.vx *= p.drag || 1; p.vy *= p.drag || 1;
        p.x += p.vx; p.y += p.vy;
      }
      draw(p);
      next.push(p);
    }
    parts = next;
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, cv.width, cv.height); }
  }

  function draw(p) {
    var t = p.life / p.max;
    if (p.blink && t < 0.4 && (p.life & 1)) return;
    ctx.fillStyle = p.color;
    if (p.kind === 'ring') {
      var r = p.r0 + (p.r1 - p.r0) * (1 - t), steps = Math.max(12, Math.round(r * 5));
      for (var k = 0; k < steps; k++) {
        var a = k / steps * Math.PI * 2;
        ctx.fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y + Math.sin(a) * r * (p.squash || 1)), p.size || 1, p.size || 1);
      }
      return;
    }
    if (p.kind === 'line') {
      var len = Math.hypot(p.x2 - p.x, p.y2 - p.y), segs = Math.ceil(len);
      var shown = p.grow ? Math.ceil(segs * Math.min(1, (1 - t) * 3)) : segs;
      for (var s = 0; s <= shown; s++) {
        var u = s / segs;
        ctx.fillRect(Math.round(p.x + (p.x2 - p.x) * u), Math.round(p.y + (p.y2 - p.y) * u), p.size || 1, p.size || 1);
      }
      return;
    }
    var size = p.shrink ? Math.max(1, Math.round(p.size * t)) : p.size || 1;
    ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
  }

  // ================= 기본 도구 =================
  FX.init = function () { ensure(); };
  // 남은 입자를 모두 지운다(화면을 옮길 때 축포가 따라오지 않게)
  FX.clear = function () { parts.length = 0; if (ctx) ctx.clearRect(0, 0, cv.width, cv.height); };

  FX.burst = function (pt, o) {
    ensure();
    o = o || {};
    var c = cp(pt), colors = o.colors || [o.color || '#ffffff'];
    for (var i = 0; i < n(o.n || 14); i++) {
      var a = o.angle != null ? o.angle + rand(-(o.spread || Math.PI), o.spread || Math.PI) : rand(0, Math.PI * 2);
      var sp = rand((o.speed || 2) * 0.4, o.speed || 2);
      add({ x: c.x + rand(-(o.jitter || 0), o.jitter || 0), y: c.y + rand(-(o.jitter || 0), o.jitter || 0),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + (o.up ? -(o.up) : 0), g: o.g != null ? o.g : 0.08, drag: o.drag || 0.94,
        color: pick(colors), size: o.size || 2, life: Math.round(rand(o.life || 22, (o.life || 22) * 1.5)), shrink: o.shrink !== false,
        delay: o.delay ? Math.round(rand(0, o.delay)) : 0 });
    }
  };

  // 위로 떠오르는 입자 (회복, 버프)
  FX.rise = function (pt, o) {
    o = o || {};
    var c = cp(pt), w = (o.width || 40) / SCALE;
    for (var i = 0; i < n(o.n || 12); i++) {
      add({ x: c.x + rand(-w / 2, w / 2), y: c.y + rand(-4, 8), vx: 0, vy: (o.down ? 1 : -1) * rand(0.4, 1.1), g: 0, drag: 1,
        color: pick(o.colors || [o.color]), size: o.size || 2, life: Math.round(rand(20, 36)), blink: true, delay: Math.round(rand(0, 10)) });
    }
  };

  FX.ring = function (pt, color, r1, o) {
    ensure();
    o = o || {};
    var c = cp(pt);
    add({ kind: 'ring', x: c.x, y: c.y, r0: (o.r0 || 2) / SCALE, r1: r1 / SCALE, color: color, life: o.life || 16, size: o.size || 1, squash: o.squash });
  };

  FX.line = function (a, b, color, o) {
    ensure();
    o = o || {};
    var p = cp(a), q = cp(b);
    add({ kind: 'line', x: p.x, y: p.y, x2: q.x, y2: q.y, color: color, life: o.life || 10, size: o.size || 1, grow: o.grow !== false, delay: o.delay || 0 });
  };

  FX.slash = function (pt, color, o) {
    o = o || {};
    var len = o.len || 46, a = o.angle != null ? o.angle : rand(-0.9, -0.5);
    var dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
    FX.line({ x: pt.x - dx, y: pt.y - dy }, { x: pt.x + dx, y: pt.y + dy }, color || '#ffffff', { size: o.size || 2, life: 9, delay: o.delay });
    FX.line({ x: pt.x - dx + 3, y: pt.y - dy + 3 }, { x: pt.x + dx + 3, y: pt.y + dy + 3 }, o.shadow || '#9fe6ff', { size: 1, life: 9, delay: o.delay });
  };

  FX.bolt = function (a, b, color) {
    var pts = [a], segs = 6;
    for (var i = 1; i < segs; i++) {
      var t = i / segs;
      pts.push({ x: a.x + (b.x - a.x) * t + rand(-14, 14), y: a.y + (b.y - a.y) * t + rand(-14, 14) });
    }
    pts.push(b);
    for (var k = 0; k < pts.length - 1; k++) FX.line(pts[k], pts[k + 1], color || '#fff27a', { size: 2, life: 10, grow: false });
  };

  // 포물선 탄. 도착하면 onHit
  FX.projectile = function (from, to, color, onHit, o) {
    ensure();
    o = o || {};
    var a = cp(from), b = cp(to), frames = o.frames || 14, f = 0, arc = (o.arc != null ? o.arc : 40) / SCALE;
    add({ x: a.x, y: a.y, life: frames + 1, color: color, size: o.size || 3,
      update: function (p) {
        f++;
        var t = f / frames;
        p.x = a.x + (b.x - a.x) * t;
        p.y = a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * arc;
        add({ x: p.x, y: p.y, vx: 0, vy: 0, g: 0, color: o.trail || color, size: 2, life: 8, shrink: true });
        if (f === frames && onHit) onHit();
      } });
  };

  // 스프라이트를 도트 조각으로 흩어지게 한다
  FX.shatter = function (spriteEl) {
    ensure();
    var sh = spriteEl._sheet;
    if (!sh || !sh.canvas) return;
    var r = spriteEl.getBoundingClientRect(), h = host().getBoundingClientRect();
    var data = sh.canvas.getContext('2d').getImageData(0, 0, sh.w, sh.h).data;
    var step = FX.low ? 3 : 2, cx = r.left + r.width / 2;
    for (var y = 0; y < sh.h; y += step) {
      for (var x = 0; x < sh.w; x += step) {
        var i = (y * sh.w * 3 + x) * 4; // 시트는 3프레임 가로 배치
        if (data[i + 3] < 128) continue;
        var px = r.left + (x + 0.5) / sh.w * r.width - h.left, py = r.top + (y + 0.5) / sh.h * r.height - h.top;
        var c = cp({ x: px, y: py });
        var dir = (px + h.left - cx) / r.width;
        add({ x: c.x, y: c.y, vx: dir * rand(1, 2.4) + rand(-0.4, 0.4), vy: rand(-2.2, -0.4), g: 0.12, drag: 0.98,
          color: 'rgb(' + data[i] + ',' + data[i + 1] + ',' + data[i + 2] + ')', size: Math.max(1, Math.round(r.width / sh.w / SCALE * step)),
          life: Math.round(rand(26, 44)), blink: true });
      }
    }
  };

  FX.confetti = function () {
    ensure();
    var colors = ['#ff5a5a', '#ffe066', '#7cf27c', '#4fd8ff', '#c9a0ff', '#ffffff'];
    for (var i = 0; i < n(110); i++) {
      add({ x: rand(0, cv.width), y: rand(-30, -2), vx: rand(-0.4, 0.4), vy: rand(0.6, 1.6), g: 0.01, drag: 1,
        color: pick(colors), size: 2, life: Math.round(rand(70, 120)), delay: Math.round(rand(0, 40)),
        update: function (p) { p.vy += p.g; p.x += p.vx + Math.sin(p.life / 5) * 0.3; p.y += p.vy; } });
    }
  };

  // ---------------- 화면 연출 (낮음 설정에서는 끈다) ----------------
  function pulse(el, cls, ms) {
    if (!el || FX.low) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms);
  }
  FX.shake = function (strong) { pulse(document.querySelector('#screen-battle .field'), strong ? 'shake-hard' : 'shake-soft', 320); };
  FX.punch = function () { pulse(document.querySelector('#screen-battle .field'), 'punch', 260); };
  FX.flash = function (color) {
    if (FX.low) return;
    var f = document.createElement('div');
    f.className = 'screen-flash';
    f.style.background = color || '#ffffff';
    host().appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 260);
  };

  // ================= 속성별 피격 이펙트 =================
  var EL_COLORS = {
    fire: ['#ff5a2a', '#ff9a3a', '#ffd23f'], ice: ['#9fe6ff', '#ffffff', '#4fa8d9'], poison: ['#8be04a', '#3f8f2a', '#e6ffcc'],
    lightning: ['#fff27a', '#ffffff', '#7fe3ff'], arcane: ['#c9a0ff', '#ffffff', '#7c4dbd'], holy: ['#fff3a8', '#ffffff', '#f0c75e'],
    shadow: ['#7a5aa8', '#3b3557', '#c9a0ff'], nature: ['#7cf27c', '#4fae4a', '#e6ffcc'], earth: ['#c99a52', '#8a6230', '#e6c27a'],
    steel: ['#ffffff', '#c9d2dc', '#9fe6ff'], guard: ['#8fc6ff', '#ffffff', '#5b8fd9'], gold: ['#ffe066', '#ffffff', '#f0c75e'],
    neutral: ['#ffffff', '#c9d2dc', '#ffe066'], monster: ['#ff8a8a', '#ffffff', '#ffd0d0']
  };
  FX.colors = function (el) { return EL_COLORS[el] || EL_COLORS.neutral; };
  FX.MAGIC = { fire: 1, ice: 1, arcane: 1, poison: 1, holy: 1, lightning: 1, shadow: 1 };

  FX.impact = function (pt, el, crit) {
    var colors = FX.colors(el);
    switch (el) {
      case 'fire': FX.burst(pt, { colors: colors, n: 18, speed: 2, up: 0.8, g: -0.03 }); break;
      case 'ice': FX.burst(pt, { colors: colors, n: 16, speed: 2.6, g: 0.1, shrink: false }); FX.ring(pt, '#9fe6ff', 30); break;
      case 'poison': FX.rise(pt, { colors: colors, n: 12, width: 36 }); FX.burst(pt, { colors: colors, n: 8, speed: 1.2 }); break;
      case 'lightning': FX.bolt({ x: pt.x - 10, y: pt.y - 60 }, pt, '#fff27a'); FX.burst(pt, { colors: colors, n: 10, speed: 2.4 }); break;
      case 'arcane': case 'shadow': FX.ring(pt, colors[0], 28); FX.burst(pt, { colors: colors, n: 12, speed: 2 }); break;
      case 'holy': FX.burst(pt, { colors: colors, n: 14, speed: 2, g: -0.02 }); FX.ring(pt, '#fff3a8', 26); break;
      default:
        FX.slash(pt, '#ffffff');
        FX.burst(pt, { colors: colors, n: 10, speed: 2.4 });
    }
    if (crit) { FX.burst(pt, { colors: ['#ffe066', '#ffffff'], n: 22, speed: 3.4 }); FX.punch(); FX.flash('#fff8c0'); }
  };

  // ================= 카드 고유 이펙트 (희귀 이상) =================
  // ctx: { from: 시전 위치, targets: [대상 위치], enemies: [적 위치], allies: [아군 위치], center: 전장 중앙, el: 속성 }
  var SFX = FX.SFX = {
    slashX: function (c) { c.targets.forEach(function (t) { FX.slash(t, '#ffffff', { angle: -0.8, len: 70, size: 3 }); FX.slash(t, '#ffe066', { angle: 0.8, len: 70, size: 3, delay: 4 }); }); FX.shake(true); },
    storm: function (c) { c.enemies.forEach(function (t, i) { for (var k = 0; k < 3; k++) FX.slash(t, '#ffffff', { delay: i * 2 + k * 4, len: 50 }); }); FX.shake(); },
    thousand: function (c) { c.targets.forEach(function (t) { for (var k = 0; k < 8; k++) FX.slash({ x: t.x + rand(-20, 20), y: t.y + rand(-20, 20) }, '#ffffff', { delay: k * 2, len: 30 }); }); },
    dragon: function (c) { c.targets.forEach(function (t) { FX.slash(t, '#ff5a2a', { angle: -1.1, len: 110, size: 4 }); FX.burst(t, { colors: FX.colors('fire'), n: 30, speed: 3 }); }); FX.flash('#ffb08a'); FX.shake(true); },
    aura: function (c) { FX.rise(c.from, { colors: FX.colors(c.el), n: 20, width: 50 }); FX.ring(c.from, FX.colors(c.el)[0], 44, { squash: 0.5 }); },
    rage: function (c) { FX.rise(c.from, { colors: ['#ff5a5a', '#ff9a3a', '#ffe066'], n: 24, width: 50 }); FX.ring(c.from, '#ff5a5a', 50); FX.shake(); },
    pillar: function (c) { c.targets.forEach(function (t) { for (var k = 0; k < 6; k++) FX.line({ x: t.x - 10 + k * 4, y: t.y - 160 }, { x: t.x - 10 + k * 4, y: t.y + 20 }, k % 2 ? '#ffffff' : '#fff3a8', { size: 2, life: 14 }); FX.burst(t, { colors: FX.colors('holy'), n: 18 }); }); FX.flash('#fff8d0'); },
    quake: function (c) { c.enemies.forEach(function (t) { FX.burst({ x: t.x, y: t.y + 50 }, { colors: FX.colors('earth'), n: 18, angle: -Math.PI / 2, spread: 1, speed: 3, g: 0.15 }); }); FX.shake(true); },
    blizzard: function (c) {
      var w = c.center.x * 2;
      for (var i = 0; i < n(50); i++) {
        var x = rand(w * 0.45, w), p = cp({ x: x, y: 0 });
        add({ x: p.x, y: rand(-20, 0), vx: -rand(0.3, 0.9), vy: rand(1, 2), g: 0, drag: 1, color: pick(['#ffffff', '#9fe6ff']), size: 2, life: 60, delay: Math.round(rand(0, 25)) });
      }
    },
    explosion: function (c) { c.targets.concat(c.targets.length ? [] : c.enemies).forEach(function (t) { FX.burst(t, { colors: FX.colors('fire'), n: 36, speed: 4 }); FX.ring(t, '#ffd23f', 60); }); FX.flash('#ffd0a0'); FX.shake(true); },
    meteor: function (c) {
      c.enemies.forEach(function (t, i) {
        setTimeout(function () { FX.projectile({ x: t.x - 120, y: -20 }, t, '#ff9a3a', function () { FX.burst(t, { colors: FX.colors('fire'), n: 20, speed: 3 }); FX.shake(); }, { arc: 0, frames: 12, size: 4 }); }, i * 90);
      });
    },
    chain: function (c) { var pts = [c.from].concat(c.enemies); for (var i = 0; i < pts.length - 1; i++) FX.bolt(pts[i], pts[i + 1], '#fff27a'); FX.flash('#fffbd0'); },
    ice: function (c) { c.targets.concat(c.targets.length ? [] : c.enemies).forEach(function (t) { FX.burst(t, { colors: FX.colors('ice'), n: 26, speed: 3, shrink: false }); FX.ring(t, '#ffffff', 50); }); FX.flash('#d0f4ff'); },
    shield: function (c) { c.allies.forEach(function (t) { FX.ring(t, '#8fc6ff', 46, { size: 2 }); FX.ring(t, '#ffffff', 30, { life: 12 }); }); },
    heal: function (c) { c.allies.forEach(function (t) { FX.rise(t, { colors: FX.colors('nature'), n: 16 }); }); },
    revive: function (c) { var ts = c.targets.length ? c.targets : c.allies; ts.forEach(function (t) { SFX.pillar({ targets: [t] }); FX.rise(t, { colors: ['#ffe066', '#ffffff'], n: 20 }); }); },
    miracle: function (c) { FX.flash('#ffffff'); c.allies.forEach(function (t) { FX.rise(t, { colors: ['#ffe066', '#ffffff', '#7cf27c'], n: 24, width: 60 }); }); },
    wings: function (c) { c.allies.forEach(function (t) { FX.burst(t, { colors: ['#ffffff', '#fff3a8'], n: 16, speed: 1.6, g: 0.02, up: 0.4 }); }); },
    poisonCloud: function (c) { c.enemies.forEach(function (t) { FX.burst(t, { colors: FX.colors('poison'), n: 22, speed: 1, g: -0.01, drag: 0.97, life: 34 }); }); },
    curse: function (c) { c.enemies.forEach(function (t) { FX.rise(t, { colors: ['#c9a0ff', '#7a5aa8'], n: 14, down: true }); }); },
    shadow: function (c) { c.targets.concat(c.targets.length ? [] : c.enemies).forEach(function (t) { FX.burst(t, { colors: FX.colors('shadow'), n: 22, speed: 1.8, g: -0.02 }); FX.ring(t, '#3b3557', 40); }); },
    coin: function (c) { FX.projectile(c.from, { x: c.from.x, y: c.from.y - 10 }, '#ffd23f', function () { FX.burst({ x: c.from.x, y: c.from.y - 60 }, { colors: FX.colors('gold'), n: 14 }); }, { arc: 70, frames: 16, size: 4 }); },
    dice: function (c) { FX.burst(c.center, { colors: ['#ff5a5a', '#ffe066', '#7cf27c', '#4fd8ff', '#c9a0ff'], n: 30, speed: 3 }); },
    clock: function (c) { FX.ring(c.center, '#e6fbff', 120, { size: 2, life: 22 }); FX.ring(c.center, '#ffe066', 80, { life: 18 }); FX.flash('#e6f0ff'); },
    cards: function (c) { for (var i = 0; i < n(8); i++) FX.projectile(c.center, { x: c.center.x + rand(-160, 160), y: c.center.y * 2.2 }, '#e6eefc', null, { arc: 60, frames: 16, size: 3, trail: '#7fe3ff' }); },
    chaos: function (c) { (c.enemies.length ? c.enemies : [c.center]).forEach(function (t) { FX.burst(t, { colors: ['#ff6ad9', '#7fe3ff', '#ffe066', '#7cf27c'], n: 24, speed: 3 }); FX.ring(t, '#ff6ad9', 40); }); },
    flag: function (c) { c.allies.forEach(function (t) { FX.line({ x: t.x, y: t.y - 140 }, t, '#ffe066', { size: 2, life: 14 }); FX.rise(t, { colors: FX.colors('gold'), n: 12 }); }); }
  };

  // sfx 실행: 등록되지 않은 키는 속성 오라로 대신한다
  FX.play = function (key, c) {
    ensure();
    (SFX[key] || SFX.aura)(c);
  };
})();
