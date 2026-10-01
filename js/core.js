// core.js — 네임스페이스, 이벤트 버스, 난수, 대기, 유틸
(function () {
  'use strict';
  var G = window.Game = window.Game || {};
  G.Data = G.Data || {};

  // ---------- 이벤트 버스 ----------
  var handlers = {};
  G.bus = {
    on: function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return fn; },
    off: function (ev, fn) {
      var list = handlers[ev];
      if (list) handlers[ev] = list.filter(function (f) { return f !== fn; });
    },
    emit: function (ev, data) {
      var list = handlers[ev];
      if (!list) return;
      list.slice().forEach(function (fn) { fn(data); });
    },
    clear: function () { handlers = {}; }
  };

  // ---------- 시드 난수 (mulberry32) ----------
  var state = (Date.now() ^ 0x9e3779b9) >>> 0;
  G.rng = {
    seed: function (s) { state = (s >>> 0) || 1; },
    next: function () {
      state = (state + 0x6d2b79f5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int: function (a, b) { return a + Math.floor(G.rng.next() * (b - a + 1)); },
    chance: function (p) { return G.rng.next() < p; },
    pick: function (arr) { return arr.length ? arr[Math.floor(G.rng.next() * arr.length)] : undefined; },
    shuffle: function (arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(G.rng.next() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
  };

  // ---------- 연출 대기 ----------
  // 테스트·시뮬레이션에서는 G.instant = true 로 즉시 완료시킨다
  G.instant = false;
  G.speed = 1;
  G.wait = function (ms) {
    if (G.instant || !ms) return Promise.resolve();
    return new Promise(function (r) { setTimeout(r, ms / G.speed); });
  };

  // ---------- 유틸 ----------
  G.util = {
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    clone: function (o) { return JSON.parse(JSON.stringify(o)); },
    byId: function (list) {
      var m = {};
      list.forEach(function (x) { m[x.id] = x; });
      return m;
    },
    esc: function (s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    },
    // 조사: josa('브리아', '이/가') → '브리아가', josa('검', '을/를') → '검을'
    josa: function (word, pair) {
      var c = word.charCodeAt(word.length - 1);
      var batchim = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
      var p = pair.split('/');
      return word + (batchim ? p[0] : p[1]);
    },
    // 숫자 바로 뒤 조사를 숫자 읽기에 맞춘다: '4을' → '4를', '6를' → '6을', '7으로' → '7로'
    // tail: 숫자와 조사 사이에 끼어 있는 HTML 태그(</span>)를 허용한다
    numJosa: function (s) {
      var PAIRS = { '을': '을/를', '를': '을/를', '이': '이/가', '가': '이/가', '은': '은/는', '는': '은/는' };
      return String(s).replace(/(\d)((?:<\/[a-z]+>)?)(으로|로|을|를|이|가|은|는)(?![가-힣])/g, function (m, d, tag, j) {
        var bat = '013678'.indexOf(d) >= 0, rieul = '178'.indexOf(d) >= 0;
        if (j === '로' || j === '으로') return d + tag + (bat && !rieul ? '으로' : '로');
        var p = PAIRS[j].split('/');
        return d + tag + (bat ? p[0] : p[1]);
      });
    },
    cmp: function (a, op, n) {
      switch (op) {
        case '<': return a < n;
        case '<=': return a <= n;
        case '>': return a > n;
        case '>=': return a >= n;
        case '==': return a === n;
        case '!=': return a !== n;
      }
      return !!a;
    }
  };

  G.RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  G.RARITY_NAME = { common: '일반', uncommon: '고급', rare: '희귀', epic: '영웅', legendary: '전설' };
  G.TYPE_NAME = { attack: '공격', skill: '보조', block: '방어', heal: '회복', power: '지속', curse: '방해' };
})();
