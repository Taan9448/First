// music.js — 배경음악 재생기(25단계). data/music.js 의 곡 글자를 해석해 Web Audio 로 합성한다(음원 파일 없음)
// 미리 0.15초씩 음을 예약하는 방식이라 화면이 바빠도 박자가 흔들리지 않는다. 곡을 바꾸면 1.2초 동안 엇갈려 바뀐다
(function () {
  'use strict';
  var G = Game;
  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], sus4: [0, 5, 7], dim: [0, 3, 6], '5': [0, 7] };
  var DRUMS = { k: 1, s: 1, h: 1, o: 1, t: 1, b: 1, g: 1 };
  var NOTE_RE = /^([A-G])([#b]?)(-?\d)$/, CHORD_RE = /^([A-G])([#b]?)(m7|M7|sus4|dim|m|7|5)?(\d)?$/;

  // ---------------- 해석(소리 없이도 돈다: 테스트에서 쓴다) ----------------
  function pc(letter, acc) { return NOTE[letter] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0); }
  // 글자 하나 → 음 번호(MIDI) 목록. 북은 { drums: [...] }. 쉼은 null, 늘림은 '-', 알 수 없으면 undefined
  function token(t, inst) {
    if (t === '.') return null;
    if (t === '-') return '-';
    if (inst === 'drums') {
      var ds = t.split('+');
      return ds.every(function (d) { return DRUMS[d]; }) ? { drums: ds } : undefined;
    }
    var m = NOTE_RE.exec(t);
    if (m) return { notes: [12 * (+m[3] + 1) + pc(m[1], m[2])] };
    m = CHORD_RE.exec(t);
    if (m) {
      var root = 12 * ((m[4] == null ? 3 : +m[4]) + 1) + pc(m[1], m[2]);
      return { notes: QUAL[m[3] || ''].map(function (i) { return root + i; }) };
    }
    return undefined;
  }
  // 목소리 → 칸마다 사건 [{ notes|drums, len(칸 수) } | null]
  function parseVoice(v, errors, where) {
    var toks = String(v.notes || '').split(/\s+/).filter(function (t) { return t && t !== '|'; });
    var ev = toks.map(function (t, i) {
      var x = token(t, v.inst);
      if (x === undefined && errors) errors.push(where + ' ' + (i + 1) + '번째 칸 "' + t + '"');
      return x === undefined ? null : x;
    });
    for (var i = 0; i < ev.length; i++) {
      if (ev[i] && ev[i] !== '-') {
        var n = 1;
        while (ev[(i + n) % ev.length] === '-' && n < ev.length) n++;
        ev[i] = Object.assign({ len: n }, ev[i]);
      }
    }
    return ev.map(function (x) { return x === '-' ? null : x; });
  }
  function validate() {
    var errors = [], M = G.Data.music || {};
    Object.keys(M).forEach(function (id) {
      var s = M[id];
      if (!(s.bpm > 30 && s.bpm < 260)) errors.push(id + ': bpm ' + s.bpm);
      (s.voices || []).forEach(function (v, i) {
        if (!INST[v.inst]) errors.push(id + ' 목소리 ' + (i + 1) + ': 악기 ' + v.inst);
        var ev = parseVoice(v, errors, id + ' 목소리 ' + (i + 1));
        if (ev.length % 8) errors.push(id + ' 목소리 ' + (i + 1) + ': 칸 수 ' + ev.length + '가 마디(8칸)로 나뉘지 않는다');
        if (!ev.some(Boolean)) errors.push(id + ' 목소리 ' + (i + 1) + ': 소리가 없다');
      });
    });
    Object.keys(G.Data.MUSIC_FOR_THEME || {}).forEach(function (t) { if (!M[G.Data.MUSIC_FOR_THEME[t]]) errors.push('테마 ' + t + ' → 없는 곡'); });
    return errors;
  }

  // ---------------- 악기 ----------------
  var ac = null, out = null, noiseBuf = null, volume = 0.5;
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    if (hold > a) g.gain.setValueAtTime(peak, t + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(hold, a) + rel);
    return t + Math.max(hold, a) + rel + 0.05;
  }
  function osc(type, f, t, end, dest, detune) {
    var o = ac.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (detune) o.detune.setValueAtTime(detune, t);
    o.connect(dest); o.start(t); o.stop(end);
    return o;
  }
  function lp(freq, q, dest) { var f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q || 0.7; f.connect(dest); return f; }
  function vibrato(o, t, end, rate, depth, delay) {
    var l = ac.createOscillator(), g = ac.createGain();
    l.frequency.value = rate; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(depth, t + (delay || 0.2));
    l.connect(g); g.connect(o.frequency); l.start(t); l.stop(end);
  }
  function noise(t, dur, type, freq, q, vol, dest) {
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.05);
  }
  function drop(type, f0, f1, t, dur, vol, dest) {
    var g = ac.createGain(), o = osc(type, f0, t, t + dur + 0.05, g);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(dest);
  }
  // 악기마다 (음 목록, 시작, 길이(초), 세기, 출력)
  var INST = {
    pluck: function (ns, t, d, v, dest) {
      ns.forEach(function (m) {
        var g = ac.createGain(), f = lp(3800, 1, g), end = env(g, t, 0.004, v, 0, Math.min(1.4, d + 0.5));
        f.frequency.setValueAtTime(3800, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.6);
        var o = osc('triangle', hz(m) * 1.004, t, end, f); o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.05);
        osc('square', hz(m), t, end, lp(2400, 0.5, f)).detune.value = 3;
        g.connect(dest);
      });
    },
    flute: function (ns, t, d, v, dest) {
      ns.forEach(function (m) {
        var g = ac.createGain(), end = env(g, t, 0.07, v, d * 0.92, 0.14);
        var o = osc('sine', hz(m), t, end, g); vibrato(o, t, end, 5.2, hz(m) * 0.006, 0.25);
        var h = ac.createGain(); h.gain.value = 0.18; h.connect(g); osc('triangle', hz(m) * 2, t, end, h);
        noise(t, 0.09, 'bandpass', hz(m) * 2, 2, v * 0.5, dest);
        g.connect(dest);
      });
    },
    erhu: function (ns, t, d, v, dest) {
      ns.forEach(function (m) {
        var g = ac.createGain(), f = lp(1900, 1.4, g), end = env(g, t, 0.09, v, d * 0.9, 0.18);
        var o = osc('sawtooth', hz(m) * 0.985, t, end, f); o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.07);
        vibrato(o, t, end, 5.6, hz(m) * 0.008, 0.18);
        g.connect(dest);
      });
    },
    bell: function (ns, t, d, v, dest) {
      ns.forEach(function (m) {
        [[1, 1], [2.76, 0.32], [5.4, 0.1]].forEach(function (p) {
          var g = ac.createGain(), end = env(g, t, 0.003, v * p[1], 0, 2.4 / p[0] + 0.6);
          osc('sine', hz(m) * p[0], t, end, g); g.connect(dest);
        });
      });
    },
    pad: function (ns, t, d, v, dest) {
      var g = ac.createGain(), f = lp(950, 0.6, g), end = env(g, t, Math.min(0.8, d * 0.4), v, d, 0.9);
      ns.forEach(function (m) { osc('sawtooth', hz(m), t, end, f, -7); osc('sawtooth', hz(m), t, end, f, 7); });
      g.connect(dest);
    },
    stab: function (ns, t, d, v, dest) {
      var g = ac.createGain(), f = lp(2600, 1, g), end = env(g, t, 0.01, v, 0.05, 0.28);
      ns.forEach(function (m) { osc('sawtooth', hz(m + 12), t, end, f, -5); osc('square', hz(m), t, end, f, 5); });
      g.connect(dest);
    },
    bass: function (ns, t, d, v, dest) {
      ns.forEach(function (m) {
        var g = ac.createGain(), end = env(g, t, 0.012, v, d * 0.85, 0.12);
        osc('triangle', hz(m), t, end, g); var s = ac.createGain(); s.gain.value = 0.6; s.connect(g); osc('sine', hz(m) / 2, t, end, s);
        g.connect(dest);
      });
    },
    subbass: function (ns, t, d, v, dest) {
      ns.forEach(function (m) {
        var g = ac.createGain(), f = lp(520, 2, g), end = env(g, t, 0.006, v, Math.min(d, 0.22) * 0.8, 0.09);
        osc('sawtooth', hz(m), t, end, f); osc('sine', hz(m), t, end, g);
        g.connect(dest);
      });
    },
    brass: function (ns, t, d, v, dest) {
      ns.forEach(function (m) {
        var g = ac.createGain(), f = lp(700, 1.2, g), end = env(g, t, 0.05, v, d * 0.9, 0.16);
        f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(2600, t + 0.06); f.frequency.exponentialRampToValueAtTime(1400, t + 0.3);
        osc('sawtooth', hz(m), t, end, f, -6); osc('sawtooth', hz(m), t, end, f, 6);
        g.connect(dest);
      });
    },
    drums: function (ds, t, d, v, dest) {
      ds.forEach(function (k) {
        if (k === 'k') drop('sine', 150, 42, t, 0.32, v * 1.4, dest);
        else if (k === 's') { noise(t, 0.16, 'highpass', 1600, 0.7, v * 0.7, dest); drop('triangle', 200, 140, t, 0.08, v * 0.5, dest); }
        else if (k === 'h') noise(t, 0.04, 'highpass', 7000, 0.7, v * 0.35, dest);
        else if (k === 'o') noise(t, 0.26, 'highpass', 6500, 0.7, v * 0.3, dest);
        else if (k === 't') drop('sine', 210, 95, t, 0.28, v * 0.9, dest);
        else if (k === 'b') { drop('sine', 95, 48, t, 0.62, v * 1.5, dest); noise(t, 0.14, 'lowpass', 320, 0.7, v * 0.7, dest); }
        else if (k === 'g') { noise(t, 3.2, 'bandpass', 480, 3, v * 0.6, dest); drop('sine', 112, 104, t, 3.2, v * 0.4, dest); drop('sine', 167, 160, t, 2.6, v * 0.25, dest); }
      });
    }
  };

  // ---------------- 재생 ----------------
  var cur = null, want = null, layer = 'calm', timer = null, unlocked = false;
  function ready() {
    if (ac) return true;
    if (!unlocked || !G.Audio || !G.Audio.context) return false;
    ac = G.Audio.context();
    if (!ac) return false;
    out = ac.createGain(); out.gain.value = volume; out.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    var nd = noiseBuf.getChannelData(0);
    for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }
  function layerGain(v) { return !v.layer ? 1 : v.layer === layer ? 1 : 0; }
  function start(id) {
    var def = G.Data.music[id];
    if (!def || !ready()) return;
    var t = ac.currentTime, bus = ac.createGain();
    bus.gain.setValueAtTime(0.0001, t); bus.gain.exponentialRampToValueAtTime(1, t + 1.2);
    bus.connect(out);
    var voices = def.voices.map(function (v) {
      var g = ac.createGain(); g.gain.value = layerGain(v); g.connect(bus);
      return { def: v, ev: parseVoice(v), gain: g };
    });
    cur = { id: id, bus: bus, voices: voices, step: 0, next: t + 0.1, dur: 60 / def.bpm / 2 };
  }
  function fadeOut(tr) {
    if (!tr || !ac) return;
    var t = ac.currentTime;
    tr.bus.gain.cancelScheduledValues(t); tr.bus.gain.setValueAtTime(Math.max(0.0001, tr.bus.gain.value), t);
    tr.bus.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    setTimeout(function () { try { tr.bus.disconnect(); } catch (e) { /* 이미 끊김 */ } }, 1600);
  }
  function tick() {
    if (!cur || !ac || ac.state !== 'running' || (typeof document !== 'undefined' && document.hidden)) return;
    var now = ac.currentTime;
    if (cur.next < now) cur.next = now + 0.05;   // 탭을 떠났다 돌아오면 밀린 음을 몰아 치지 않는다
    while (cur.next < now + 0.15) {
      var t = cur.next, s = cur.step;
      cur.voices.forEach(function (v) {
        var e = v.ev[s % v.ev.length];
        if (!e) return;
        try { INST[v.def.inst](e.drums || e.notes, t, e.len * cur.dur, v.def.vol, v.gain); } catch (err) { /* 소리 실패는 무시 */ }
      });
      cur.step++; cur.next += cur.dur;
    }
  }

  var Music = G.Music = {
    parse: parseVoice, validate: validate, token: token, INST: INST,
    // 곡 틀기(같은 곡이면 그대로). 소리를 켤 수 있기 전(첫 클릭 전)이면 기억해 두었다가 튼다
    play: function (id) {
      want = id;
      if (cur && cur.id === id) return;
      if (!ready()) return;
      fadeOut(cur); cur = null;
      if (id) start(id);
      if (!timer) timer = setInterval(tick, 25);
    },
    stop: function () { want = null; fadeOut(cur); cur = null; },
    current: function () { return cur ? cur.id : want; },
    // 'battle' 이면 전투 층(북)을, 'calm' 이면 잔잔한 층을 켠다
    setLayer: function (l) {
      layer = l;
      if (!cur || !ac) return;
      var t = ac.currentTime;
      cur.voices.forEach(function (v) { v.gain.gain.setTargetAtTime(layerGain(v.def), t, 0.25); });
    },
    setVolume: function (v) {
      volume = Math.max(0, Math.min(1, v));
      if (out) out.gain.setTargetAtTime(volume, ac.currentTime, 0.05);
    },
    unlock: function () {
      if (unlocked) return;
      unlocked = true;
      if (ready() && ac.state === 'suspended') ac.resume();
      if (want) Music.play(want);
    },
    // 개발용: 곡을 소리 없이 secs 초 동안 그려 세기(최대·평균)를 잰다. 반환: Promise({ peak, rms })
    render: function (id, secs, lay) {
      var def = G.Data.music[id], OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!def || !OAC) return Promise.resolve(null);
      var keep = [ac, out, noiseBuf, layer], sr = 22050;
      ac = new OAC(1, Math.ceil(sr * secs), sr); out = ac.createGain(); out.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, sr, sr);
      var nd = noiseBuf.getChannelData(0);
      for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      layer = lay || 'battle';
      var dur = 60 / def.bpm / 2, steps = Math.floor(secs / dur) - 2, oac = ac;
      def.voices.forEach(function (v) {
        if (!layerGain(v)) return;
        var ev = parseVoice(v);
        for (var st = 0; st < steps; st++) { var e = ev[st % ev.length]; if (e) INST[v.inst](e.drums || e.notes, st * dur + 0.01, e.len * dur, v.vol, out); }
      });
      ac = keep[0]; out = keep[1]; noiseBuf = keep[2]; layer = keep[3];
      return oac.startRendering().then(function (buf) {
        var d = buf.getChannelData(0), peak = 0, sum = 0;
        for (var j = 0; j < d.length; j++) { var a = Math.abs(d[j]); if (a > peak) peak = a; sum += d[j] * d[j]; }
        return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4) };
      });
    },
    // 화면 → 곡
    forScreen: function (id) {
      if (id === 'battle') return null;   // 전투는 BattleUI 가 forBattle 로 정한다
      var St = G.Stage, r = St && St.data && St.data.run;
      var calm = ['title', 'lobby', 'story', 'ending', 'test'].indexOf(id) >= 0 || !r;
      return calm ? 'lobby' : G.Data.MUSIC_FOR_THEME[St.stageDef(r.stage).theme] || 'lobby';
    },
    forBattle: function (opts) {
      var mons = (opts.monsters || []).map(function (m) { return G.Data.monsterById[m]; }).filter(Boolean);
      if (mons.some(function (m) { return m.rank === 'final'; })) return 'final';
      if (opts.nodeType === 'boss' || opts.nodeType === 'midboss' || (!opts.nodeType && mons.some(function (m) { return m.rank === 'boss'; }))) return 'boss';
      var theme = opts.theme || (mons[mons.length - 1] || {}).theme;
      return G.Data.MUSIC_FOR_THEME[theme] || 'forest';
    },
    battle: function (opts) { Music.setLayer('battle'); Music.play(Music.forBattle(opts)); },
    screen: function (id) {
      var song = Music.forScreen(id);
      if (!song) return;
      Music.setLayer('calm');
      Music.play(song);
    }
  };

  if (typeof document !== 'undefined') {
    ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, Music.unlock, true); });
    // 화면이 바뀔 때 곡을 고른다
    if (G.UI && G.UI.show) {
      var show = G.UI.show;
      G.UI.show = function (id) { var r = show.apply(G.UI, arguments); Music.screen(id); return r; };
    }
  }
})();
