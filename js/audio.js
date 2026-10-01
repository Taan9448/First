// audio.js — Web Audio 효과음 합성 (음원 파일 없음)
// 브라우저 정책상 첫 클릭 뒤에 소리를 켤 수 있다. 같은 소리는 짧은 간격 안에 겹쳐 내지 않는다.
(function () {
  'use strict';
  var G = Game;
  var ac = null, master = null, noiseBuf = null, volume = 0.7, last = {};

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
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
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
    f.frequency.setValueAtTime(o.freq || 1200, t);
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
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
    turn: function () { tone(660, 0.07, { type: 'triangle', vol: 0.08 }); tone(990, 0.1, { type: 'triangle', vol: 0.08, at: 0.07 }); }
  };

  G.Audio = {
    setVolume: function (v) {
      volume = Math.max(0, Math.min(1, v));
      if (master) master.gain.value = volume;
    },
    play: function (name) {
      if (volume <= 0 || !SOUNDS[name]) return;
      var c = ctx();
      if (!c) return;
      if (c.state === 'suspended') c.resume();
      var now = performance.now();
      if (last[name] && now - last[name] < 40) return;
      last[name] = now;
      try { SOUNDS[name](); } catch (e) { /* 소리 실패는 게임에 영향 없음 */ }
    },
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
