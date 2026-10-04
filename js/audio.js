// audio.js — Web Audio 효과음 합성 (음원 파일 없음)
// 브라우저 정책상 첫 클릭 뒤에 소리를 켤 수 있다. 같은 소리는 짧은 간격 안에 겹쳐 내지 않는다.
(function () {
  'use strict';
  var G = Game;
  var ac = null, master = null, noiseBuf = null, volume = 0.7, last = {};
  var P = 1;   // 37단계: 지금 내는 소리의 음 높이 배율(타격음마다 조금씩 흔든다)

  function ctx() {
    if (ac) return ac;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ac = new AC(); } catch (e) { return null; }
    master = ac.createGain();
    master.gain.value = volume;
    master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ac;
  }

  // 음 하나: 주파수에서 slide 까지 미끄러지며 dur 초 동안
  function tone(freq, dur, o) {
    o = o || {};
    var t = ac.currentTime + (o.at || 0);
    var osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq * P, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide * P), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol || 0.18, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  function noise(dur, o) {
    o = o || {};
    var t = ac.currentTime + (o.at || 0);
    var src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf;
    f.type = o.filter || 'lowpass';
    if (o.q) f.Q.value = o.q;
    f.frequency.setValueAtTime((o.freq || 1200) * P, t);
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep * P, t + dur);
    g.gain.setValueAtTime(o.vol || 0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  var SOUNDS = {
    click: function () { tone(880, 0.04, { vol: 0.08 }); },
    draw: function () { tone(1320, 0.03, { type: 'triangle', vol: 0.06 }); },
    play: function () { tone(520, 0.06, { type: 'triangle', slide: 900, vol: 0.1 }); },
    slash: function () { noise(0.12, { filter: 'highpass', freq: 3000, sweep: 800, vol: 0.3 }); },
    hit: function () { tone(140, 0.12, { type: 'sine', slide: 50, vol: 0.35 }); noise(0.06, { freq: 900, vol: 0.2 }); },
    crit: function () { tone(1600, 0.08, { slide: 600, vol: 0.12 }); tone(160, 0.18, { type: 'sine', slide: 40, vol: 0.4 }); noise(0.12, { filter: 'highpass', freq: 2000, vol: 0.25 }); },
    fire: function () { noise(0.35, { freq: 600, sweep: 2400, vol: 0.28 }); },
    ice: function () { [1760, 2349, 2637].forEach(function (f, i) { tone(f, 0.18, { type: 'sine', vol: 0.08, at: i * 0.04 }); }); },
    zap: function () { tone(1800, 0.12, { type: 'sawtooth', slide: 200, vol: 0.1 }); noise(0.08, { filter: 'highpass', freq: 4000, vol: 0.15 }); },
    magic: function () { tone(660, 0.16, { type: 'triangle', slide: 1320, vol: 0.12 }); },
    poison: function () { tone(200, 0.2, { type: 'triangle', slide: 120, vol: 0.12 }); noise(0.15, { freq: 400, vol: 0.12 }); },
    block: function () { tone(330, 0.09, { vol: 0.12 }); tone(495, 0.12, { vol: 0.1, at: 0.03 }); },
    heal: function () { [523, 659, 784].forEach(function (f, i) { tone(f, 0.16, { type: 'sine', vol: 0.12, at: i * 0.06 }); }); },
    buff: function () { [392, 523, 659].forEach(function (f, i) { tone(f, 0.08, { vol: 0.08, at: i * 0.04 }); }); },
    debuff: function () { [523, 415, 330].forEach(function (f, i) { tone(f, 0.09, { type: 'triangle', vol: 0.1, at: i * 0.05 }); }); },
    coin: function () { tone(988, 0.06, { vol: 0.1 }); tone(1319, 0.14, { vol: 0.1, at: 0.06 }); },
    death: function () { noise(0.4, { freq: 1600, sweep: 120, vol: 0.3 }); tone(220, 0.35, { type: 'sawtooth', slide: 55, vol: 0.12 }); },
    big: function () { noise(0.5, { freq: 300, sweep: 60, vol: 0.45 }); tone(90, 0.45, { type: 'sine', slide: 30, vol: 0.4 }); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i === 3 ? 0.4 : 0.14, { vol: 0.14, at: i * 0.12 }); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.25, { type: 'triangle', vol: 0.14, at: i * 0.18 }); }); },
    turn: function () { tone(660, 0.07, { type: 'triangle', vol: 0.08 }); tone(990, 0.1, { type: 'triangle', vol: 0.08, at: 0.07 }); },
    // ---------------- 37단계: 타격음 종류(data/sfx.js 가 고른다) ----------------
    // 붓(하린): 먹 획이 휙 지나가고 종이에 먹이 번지는 낮은 울림
    brush: function () { noise(0.16, { filter: 'bandpass', freq: 900, sweep: 3200, q: 1.4, vol: 0.32 }); noise(0.1, { filter: 'lowpass', freq: 500, vol: 0.18, at: 0.07 }); tone(110, 0.14, { type: 'sine', slide: 60, vol: 0.22, at: 0.06 }); },
    // 둔기 · 방패: 낮은 쿵 + 나무를 두드리는 소리
    blunt: function () { tone(95, 0.16, { type: 'sine', slide: 40, vol: 0.42 }); tone(260, 0.05, { type: 'triangle', slide: 180, vol: 0.14 }); noise(0.07, { freq: 700, vol: 0.22 }); },
    // 찌르기 · 비도: 짧고 날카로운 쇳소리
    pierce: function () { tone(2400, 0.04, { type: 'square', slide: 1200, vol: 0.07 }); noise(0.05, { filter: 'highpass', freq: 3500, vol: 0.22 }); tone(180, 0.06, { type: 'sine', slide: 90, vol: 0.2, at: 0.02 }); },
    // 화살: 바람 가르는 소리 뒤에 박히는 소리
    arrow: function () { noise(0.1, { filter: 'bandpass', freq: 2600, sweep: 5200, q: 2, vol: 0.2 }); tone(220, 0.06, { type: 'triangle', slide: 120, vol: 0.2, at: 0.08 }); noise(0.04, { freq: 1600, vol: 0.14, at: 0.08 }); },
    // 묵직한 한 방(큰 피해): 깊은 울림과 부서지는 소리
    heavy: function () { tone(70, 0.3, { type: 'sine', slide: 30, vol: 0.4 }); noise(0.22, { freq: 500, sweep: 90, vol: 0.3 }); },
    // 몬스터: 물기 · 할퀴기 · 채찍 · 어둠
    bite: function () { noise(0.05, { freq: 1800, vol: 0.24 }); noise(0.05, { freq: 1400, vol: 0.24, at: 0.06 }); tone(150, 0.1, { type: 'sine', slide: 70, vol: 0.28, at: 0.03 }); },
    claw: function () { [0, 0.045, 0.09].forEach(function (a, i) { noise(0.06, { filter: 'highpass', freq: 2600 - i * 400, sweep: 900, vol: 0.2, at: a }); }); tone(130, 0.1, { type: 'sine', slide: 60, vol: 0.22, at: 0.05 }); },
    whip: function () { noise(0.09, { filter: 'bandpass', freq: 1200, sweep: 5000, q: 1.6, vol: 0.26 }); noise(0.03, { filter: 'highpass', freq: 5000, vol: 0.3, at: 0.08 }); },
    dark: function () { tone(180, 0.22, { type: 'sawtooth', slide: 70, vol: 0.1 }); noise(0.2, { freq: 300, sweep: 1200, vol: 0.2 }); tone(90, 0.16, { type: 'sine', slide: 45, vol: 0.28, at: 0.04 }); },
    holy: function () { [1319, 1760, 2093].forEach(function (f, i) { tone(f, 0.2, { type: 'sine', vol: 0.07, at: i * 0.03 }); }); tone(160, 0.12, { type: 'sine', slide: 80, vol: 0.24 }); },
    thorns: function () { noise(0.07, { filter: 'highpass', freq: 2200, vol: 0.18 }); tone(300, 0.08, { type: 'triangle', slide: 160, vol: 0.12 }); },
    // 지속 피해(중독 · 화상) · 체력 잃기
    poisonTick: function () { [0, 0.06, 0.11].forEach(function (a, i) { tone(260 + i * 70, 0.06, { type: 'sine', slide: 420 + i * 60, vol: 0.09, at: a }); }); },
    burnTick: function () { noise(0.18, { filter: 'bandpass', freq: 1800, q: 0.8, vol: 0.2 }); noise(0.05, { filter: 'highpass', freq: 4000, vol: 0.16, at: 0.08 }); },
    drain: function () { tone(440, 0.2, { type: 'triangle', slide: 160, vol: 0.12 }); },
    // 보호막: 다 막으면 쇳소리, 보호막이 깨지며 뚫리면 유리 깨지는 소리
    clang: function () { tone(1180, 0.16, { type: 'square', vol: 0.06 }); tone(1770, 0.12, { type: 'sine', vol: 0.06, at: 0.01 }); noise(0.05, { filter: 'highpass', freq: 3000, vol: 0.16 }); },
    shatter: function () { [2637, 2093, 1568, 1175].forEach(function (f, i) { tone(f, 0.08, { type: 'sine', vol: 0.07, at: i * 0.025 }); }); noise(0.18, { filter: 'highpass', freq: 3000, sweep: 1200, vol: 0.22 }); },
    dodge: function () { noise(0.14, { filter: 'bandpass', freq: 700, sweep: 2600, q: 1.2, vol: 0.18 }); },
    // 보스 페이즈 전환: 징처럼 길게 우는 소리
    phase: function () { noise(0.9, { filter: 'bandpass', freq: 420, q: 3, vol: 0.4 }); tone(110, 1.1, { type: 'sine', slide: 98, vol: 0.3 }); tone(166, 0.9, { type: 'sine', slide: 150, vol: 0.18 }); tone(55, 0.6, { type: 'sine', slide: 35, vol: 0.4 }); }
  };
  // 음 높이를 흔드는 타격음
  var VARY = { slash: 1, hit: 1, brush: 1, blunt: 1, pierce: 1, arrow: 1, bite: 1, claw: 1, whip: 1, thorns: 1, poisonTick: 1, burnTick: 1, clang: 1, fire: 1, ice: 1, zap: 1, magic: 1, poison: 1, dark: 1, holy: 1 };
  function pickMove(name) {
    var M = (G.Data.sfx || {}).moves || [];
    for (var i = 0; i < M.length; i++) if (new RegExp(M[i][1]).test(name || '')) return M[i][0];
    return 'hit';
  }

  G.Audio = {
    // 25단계: 배경음악(js/music.js)이 같은 오디오 문맥을 쓴다
    context: function () { var c = ctx(); if (c && c.state === 'suspended') c.resume(); return c; },
    setVolume: function (v) {
      volume = Math.max(0, Math.min(1, v));
      if (master) master.gain.value = volume;
    },
    // opts.pitch: 음 높이 배율(연달아 맞힐 때 올라간다). 타격음은 data/sfx.js 의 vary 만큼 저절로 흔든다
    play: function (name, opts) {
      if (volume <= 0 || !SOUNDS[name]) return;
      var c = ctx();
      if (!c) return;
      if (c.state === 'suspended') c.resume();
      var now = performance.now();
      if (last[name] && now - last[name] < 40) return;
      last[name] = now;
      var vary = VARY[name] ? ((G.Data.sfx || {}).vary || 0) : 0;
      P = ((opts && opts.pitch) || 1) * (1 + (Math.random() * 2 - 1) * vary);
      try { SOUNDS[name](); } catch (e) { /* 소리 실패는 게임에 영향 없음 */ }
      P = 1;
    },
    has: function (name) { return !!SOUNDS[name]; },
    names: function () { return Object.keys(SOUNDS); },
    // 37단계: 맞는 순간의 소리들. info = { kind, crit, amount, blocked, el(카드 속성), caster(동료 유닛), move(몬스터 행동 이름), enemy(몬스터가 친 것인지), streak }
    // 반환: [{ name, pitch }] — 비어 있으면 소리 없음
    forHit: function (info) {
      var X = G.Data.sfx || {}, out = [], pitch = 1 + Math.min(8, Math.max(0, (info.streak || 1) - 1)) * (X.comboRise || 0);
      var add = function (n, p) { if (n && SOUNDS[n]) out.push({ name: n, pitch: p || 1 }); };
      if (info.dodged) return [{ name: 'dodge', pitch: 1 }];
      if (info.kind === 'poison') add('poisonTick');
      else if (info.kind === 'burn') add('burnTick');
      else if (info.kind === 'thorns') add('thorns');
      else if (info.kind === 'lose') add('drain');
      else if (info.kind === 'steam') { add('fire'); add('zap'); }   // 39단계: 증기 폭발
      else if (info.enemy) add(pickMove(info.move));
      else if (info.el && (X.physical || []).indexOf(info.el) < 0 && X.element && X.element[info.el]) add(X.element[info.el], pitch);
      else {
        var c = info.caster && info.caster.def;
        add(c && ((X.hero || {})[c.id] || (X.style || {})[c.attackStyle]) || 'slash', pitch);
      }
      if (!info.amount) return info.blocked > 0 ? [{ name: 'clang', pitch: 1 }] : [];
      if (info.blocked > 0) add('shatter');
      if (info.crit) add('crit');
      else if (!info.kind && info.amount >= (X.heavyAt || 20)) add('heavy');
      return out;
    },
    pickMove: pickMove,
    // 속성 → 피격 소리
    forElement: function (el) {
      return { fire: 'fire', ice: 'ice', lightning: 'zap', arcane: 'magic', poison: 'poison', holy: 'magic', shadow: 'magic' }[el] || 'hit';
    }
  };

  // 버튼 클릭 소리
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.btn, .choice, .choice-line, .stage-node, .hero-pick, .tab')) G.Audio.play('click');
  });
})();
