// save.js — localStorage 저장/불러오기, 버전 마이그레이션, 설정 저장
// 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 메모리에만 보관한다.
(function () {
  'use strict';
  var G = Game;
  var VERSION = 1;
  var memory = {};

  function store() {
    try {
      var s = window.localStorage;
      s.setItem('__t', '1'); s.removeItem('__t');
      return s;
    } catch (e) {
      return { getItem: function (k) { return k in memory ? memory[k] : null; },
        setItem: function (k, v) { memory[k] = String(v); }, removeItem: function (k) { delete memory[k]; } };
    }
  }

  // 버전 n → n+1 로 올리는 함수들. 저장 형식을 바꾸면 여기에 추가한다
  var MIGRATIONS = {
    // 1: function (d) { ...; return d; }
  };

  var Save = G.Save = {
    VERSION: VERSION,
    key: function () { return G.debug ? 'fiveHeroes.save.debug' : 'fiveHeroes.save'; },
    SETTINGS_KEY: 'fiveHeroes.settings',

    exists: function () { return !!store().getItem(Save.key()); },

    load: function () {
      var raw = store().getItem(Save.key());
      if (!raw) return null;
      var d;
      try { d = JSON.parse(raw); } catch (e) { return null; }
      if (!d || typeof d !== 'object') return null;
      d = Save.migrate(d);
      return d ? Save.sanitize(d) : null;
    },

    migrate: function (d) {
      var v = d.version || 1;
      while (v < VERSION) {
        if (!MIGRATIONS[v]) return null;
        d = MIGRATIONS[v](d);
        v++;
        d.version = v;
      }
      return d;
    },

    // 알 수 없는 카드·캐릭터 ID 는 버린다
    sanitize: function (d) {
      var cards = G.Data.cardById, chars = G.Data.characters.map(function (c) { return c.id; });
      var okCard = function (id) { return cards[id] && cards[id].owner !== 'none'; };
      d.cards = (d.cards || []).filter(okCard);
      d.characters = (d.characters || ['kai']).filter(function (id) { return chars.indexOf(id) >= 0; });
      if (!d.characters.length) d.characters = ['kai'];
      d.party = (d.party || []).filter(function (id) { return d.characters.indexOf(id) >= 0; });
      if (!d.party.length) d.party = [d.characters[0]];
      d.decks = d.decks || {};
      Object.keys(d.decks).forEach(function (k) {
        d.decks[k] = d.decks[k].filter(function (id) { return okCard(id) && d.cards.indexOf(id) >= 0; });
      });
      d.codex = d.codex || { monsters: {} };
      d.codex.monsters = d.codex.monsters || {};
      d.flags = d.flags || {};
      d.gold = Math.max(0, d.gold | 0);
      d.clearedStage = d.clearedStage | 0;
      return d;
    },

    write: function (d) {
      d.version = VERSION;
      try { store().setItem(Save.key(), JSON.stringify(d)); } catch (e) { /* 용량 초과 등은 무시 */ }
    },

    clear: function () { store().removeItem(Save.key()); },

    // ---------------- 설정 ----------------
    DEFAULT_SETTINGS: { volume: 70, fx: 'normal', speed: 1 },
    loadSettings: function () {
      var s = null;
      try { s = JSON.parse(store().getItem(Save.SETTINGS_KEY)); } catch (e) { s = null; }
      return Object.assign({}, Save.DEFAULT_SETTINGS, s || {});
    },
    writeSettings: function (s) {
      try { store().setItem(Save.SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* 무시 */ }
    }
  };
})();
