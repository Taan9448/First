// save.js — localStorage 저장/불러오기(저장 칸 3개, 15단계), 버전 마이그레이션, 설정 저장
// 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 메모리에만 보관한다.
(function () {
  'use strict';
  var G = Game;
  var VERSION = 6;
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
    // v1 → v2 (8단계): 갈림길 맵으로 바뀌어 진행 중인 스테이지는 지운다. 카드·골드·동료·유물은 그대로
    1: function (d) {
      d.run = null;
      d.upgraded = d.upgraded || [];
      d.growth = d.growth || {};
      d.bonds = d.bonds || {};
      d.talks = d.talks || {};
      d.ascension = d.ascension || { current: 0, best: 0 };
      d.eventsSeen = d.eventsSeen || [];
      d.buffs = d.buffs || [];
      return d;
    },
    // v2 → v3 (14단계): 던전 지도(통로·정찰)로 바뀌어 진행 중인 스테이지는 지운다
    2: function (d) {
      d.run = null;
      return d;
    },
    // v3 → v4 (15단계): 게임 모드와 사망 기록. 예전 저장은 노말 모드로, 던전 길이가 바뀌어 진행 중인 스테이지는 지운다
    3: function (d) {
      d.mode = d.mode || 'normal';
      d.dead = d.dead || [];
      d.run = null;
      return d;
    },
    // v4 → v5 (18단계): 강화가 3단계까지 늘어 강화 목록(카드 id 배열)을 단계 표({ 카드 id: 단계 })로 바꾼다
    4: function (d) {
      var map = {};
      if (Array.isArray(d.upgraded)) d.upgraded.forEach(function (id) { map[id] = 1; });
      d.upgraded = map;
      return d;
    },
    // v5 → v6 (19단계): 준비 덱이 4~8장으로 줄었다. 넘치면 등급이 높은 카드부터 8장을 남기고, 진행 중인 스테이지에는 스테이지 덱을 만든다
    5: function (d) {
      var E = G.Data.economy, byId = G.Data.cardById, R = G.RARITIES || [];
      var rank = function (id) { return byId[id] ? R.indexOf(byId[id].rarity) : -1; };
      d.decks = d.decks || {};
      Object.keys(d.decks).forEach(function (o) {
        var deck = (d.decks[o] || []).filter(function (id) { return byId[id]; });
        if (deck.length > E.deckMax) deck = deck.slice().sort(function (a, b) { return rank(b) - rank(a) || (a < b ? -1 : 1); }).slice(0, E.deckMax);
        var owned = (d.cards || []).filter(function (id) { return byId[id] && byId[id].owner === o && deck.indexOf(id) < 0; });
        while (deck.length < E.deckMin && owned.length) deck.push(owned.shift());
        d.decks[o] = deck;
      });
      if (d.run) {
        d.run.decks = {};
        Object.keys(d.decks).forEach(function (o) { d.run.decks[o] = d.decks[o].slice(); });
        d.run.purges = 0;
        d.run.removed = 0;
      }
      return d;
    }
  };

  var Save = G.Save = {
    VERSION: VERSION,
    store: store,                              // 테스트용
    SLOTS: 3,
    slot: 1,                                   // 지금 쓰는 저장 칸(1~3)
    store: store,   // 26단계: 프로필(업적·기록)도 같은 저장소를 쓴다
    base: function () { return G.debug ? 'fiveHeroes.save.debug' : 'fiveHeroes.save'; },
    key: function (slot) { return Save.base() + '.' + (slot || Save.slot); },
    SETTINGS_KEY: 'fiveHeroes.settings',

    // 칸이 하나뿐이던 예전 저장(키에 칸 번호 없음)은 1번 칸으로 옮긴다
    adoptLegacy: function () {
      var s = store(), old = s.getItem(Save.base());
      if (old == null) return;
      if (s.getItem(Save.key(1)) == null) s.setItem(Save.key(1), old);
      s.removeItem(Save.base());
    },
    // slot 을 주면 그 칸, 없으면 아무 칸에나 저장이 있는지
    exists: function (slot) {
      Save.adoptLegacy();
      if (slot) return !!store().getItem(Save.key(slot));
      for (var i = 1; i <= Save.SLOTS; i++) if (store().getItem(Save.key(i))) return true;
      return false;
    },
    // 마지막으로 쓴 칸(타이틀의 '이어하기')
    lastSlot: function () {
      var n = +store().getItem(Save.base() + '.last');
      if (n >= 1 && n <= Save.SLOTS && Save.exists(n)) return n;
      for (var i = 1; i <= Save.SLOTS; i++) if (Save.exists(i)) return i;
      return 0;
    },
    use: function (slot) {
      Save.slot = slot;
      if (typeof slot !== 'number') return;   // 오늘의 원정('daily') 칸은 '이어하기' 대상이 아니다
      try { store().setItem(Save.base() + '.last', String(slot)); } catch (e) { /* 무시 */ }
    },
    // 칸의 내용을 미리 본다(지금 칸은 바꾸지 않는다)
    peek: function (slot) { return Save.load(slot); },

    load: function (slot) {
      Save.adoptLegacy();
      var raw = store().getItem(Save.key(slot));
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
      d.relics = (d.relics || []).filter(function (id) { return G.Data.relicById && G.Data.relicById[id]; });
      var up = d.upgraded && typeof d.upgraded === 'object' && !Array.isArray(d.upgraded) ? d.upgraded : {};
      d.upgraded = {};
      Object.keys(up).forEach(function (id) {
        var lv = Math.min(G.Upgrade ? G.Upgrade.MAX : 3, up[id] | 0);
        if (lv > 0 && d.cards.indexOf(id) >= 0) d.upgraded[id] = lv;
      });
      d.growth = d.growth && typeof d.growth === 'object' ? d.growth : {};
      Object.keys(d.growth).forEach(function (k) {
        if (chars.indexOf(k) < 0) { delete d.growth[k]; return; }
        var g = d.growth[k];
        g.exp = Math.max(0, g.exp | 0);
        g.traits = (g.traits || []).filter(function (t) { return t === 0 || t === 1; }).slice(0, 5);
      });
      d.bonds = d.bonds && typeof d.bonds === 'object' ? d.bonds : {};
      d.talks = d.talks && typeof d.talks === 'object' ? d.talks : {};
      d.ascension = d.ascension || { current: 0, best: 0 };
      d.eventsSeen = (d.eventsSeen || []).filter(function (id) { return G.Data.eventById && G.Data.eventById[id]; });
      d.buffs = (d.buffs || []).filter(function (b) {
        return b && b.battles > 0 && (!b.mirror || chars.indexOf(b.mirror) >= 0) && (!b.card || cards[b.card]);
      });
      if (d.run && d.run.decks) Object.keys(d.run.decks).forEach(function (k) { d.run.decks[k] = (d.run.decks[k] || []).filter(okCard); });
      if (d.run && !d.run.decks) d.run = null;
      if (d.run && (!Array.isArray(d.run.map) || !d.run.map.every(function (col) { return Array.isArray(col) && col.every(function (n) { return n && Array.isArray(n.next); }); }))) d.run = null;
      d.codex = d.codex || { monsters: {} };
      d.codex.monsters = d.codex.monsters || {};
      d.flags = d.flags || {};
      // 스토리(13단계): 예전 저장은 이미 지나온 장(클리어한 스테이지까지)과 프롤로그를 본 것으로 친다
      var byId = G.Data.storyById || {};
      if (!d.story || !Array.isArray(d.story.seen)) {
        var seen = ['prologue'];
        (G.Data.story || []).forEach(function (ch) {
          if (ch.n >= 1 && ch.n <= (d.clearedStage | 0)) ch.scenes.forEach(function (sc) { seen.push(sc.id); });
        });
        if (d.flags.ended) seen.push('epilogue');
        d.story = { seen: seen };
      }
      d.story.seen = d.story.seen.filter(function (id, i, a) { return byId[id] && a.indexOf(id) === i; });
      d.items = (d.items || []).filter(function (id) { return G.Data.itemById && G.Data.itemById[id]; }).slice(0, G.Data.itemEconomy ? G.Data.itemEconomy.slots : 3);
      d.gold = Math.max(0, d.gold | 0);
      d.clearedStage = d.clearedStage | 0;
      // 30단계: 새 동료(시엘, 5 스테이지 합류)가 생기기 전에 그 스테이지를 지나온 저장에도 합류시킨다
      (G.Data.stages || []).forEach(function (st) {
        if (!st.join || st.n > d.clearedStage || d.characters.indexOf(st.join) >= 0 || chars.indexOf(st.join) < 0) return;
        d.characters.push(st.join);
        G.Data.cards.forEach(function (c) { if (c.basic && c.owner === st.join && d.cards.indexOf(c.id) < 0) d.cards.push(c.id); });
        var ch = G.Data.characters.filter(function (c) { return c.id === st.join; })[0];
        d.decks[st.join] = ((ch && ch.starter) || []).filter(function (id) { return d.cards.indexOf(id) >= 0; });
      });
      d.mode = G.Data.modes && G.Data.modes[d.mode] ? d.mode : 'normal';
      d.dead = (d.dead || []).filter(function (id, i, a) { return d.characters.indexOf(id) >= 0 && a.indexOf(id) === i; });
      if (d.party.every(function (id) { return d.dead.indexOf(id) >= 0; })) {
        d.party = d.characters.filter(function (id) { return d.dead.indexOf(id) < 0; }).slice(0, 3);
      } else d.party = d.party.filter(function (id) { return d.dead.indexOf(id) < 0; });
      return d;
    },

    write: function (d) {
      d.version = VERSION;
      try { store().setItem(Save.key(), JSON.stringify(d)); } catch (e) { /* 용량 초과 등은 무시 */ }
    },

    clear: function (slot) { store().removeItem(Save.key(slot)); },

    // ---------------- 24단계: 내보내기 · 가져오기 ----------------
    // 저장 칸을 글자 한 줄로 바꿔 다른 PC·브라우저로 옮긴다. 'CHG1:' + base64(UTF-8 JSON)
    EXPORT_TAG: 'CHG1:',
    exportText: function (slot) {
      var raw = store().getItem(Save.key(slot));
      if (!raw) return '';
      return Save.EXPORT_TAG + btoa(unescape(encodeURIComponent(raw)));
    },
    // 글자를 해석해 저장 데이터로 돌려준다(잘못되면 null). 마이그레이션·정리를 거쳐 지금 버전으로
    parseExport: function (text) {
      text = String(text || '').replace(/\s+/g, '');
      if (text.indexOf(Save.EXPORT_TAG) !== 0) return null;
      var d;
      try { d = JSON.parse(decodeURIComponent(escape(atob(text.slice(Save.EXPORT_TAG.length))))); } catch (e) { return null; }
      if (!d || typeof d !== 'object' || !Array.isArray(d.characters) || !Array.isArray(d.cards)) return null;
      d = Save.migrate(d);
      return d ? Save.sanitize(d) : null;
    },
    importText: function (text, slot) {
      var d = Save.parseExport(text);
      if (!d) return false;
      d.version = VERSION;
      try { store().setItem(Save.key(slot), JSON.stringify(d)); } catch (e) { return false; }
      return true;
    },

    // ---------------- 설정 ----------------
    DEFAULT_SETTINGS: { volume: 70, bgm: 45, fx: 'normal', speed: 1, textScale: 1, cb: false, hotkeys: true },
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
