// profile.js — 업적 · 누적 기록 · 오늘의 원정 기록(26단계). 저장 칸과 상관없이 이 브라우저 전체에 하나
// 진행 코드(stage.js)가 전투·스테이지·엔딩·오늘의 원정이 끝날 때 알려 주면 기록을 더하고 업적을 판정한다.
// 새로 달성한 업적은 onUnlock(목록)으로 화면에 알린다(ui-extra.js 가 걸어 둔다)
(function () {
  'use strict';
  var G = Game, D = G.Data;
  function key() { return G.debug ? 'fiveHeroes.profile.debug' : 'fiveHeroes.profile'; }
  function blank() { return { version: 1, stats: {}, heroUse: {}, cardUse: {}, cardStat: {}, ach: {}, daily: {} }; }   // 35단계 cardStat: { 카드 id: [덱에 든 전투, 그중 승리, 쓴 횟수] }

  var P = G.Profile = {
    data: null,
    onUnlock: null,
    load: function () {
      var d = null;
      try { d = JSON.parse(G.Save.store().getItem(key())); } catch (e) { d = null; }
      d = d && typeof d === 'object' ? d : blank();
      var b = blank();
      Object.keys(b).forEach(function (k) { if (!d[k] || typeof d[k] !== 'object') d[k] = b[k]; });
      Object.keys(d.ach).forEach(function (id) { if (!D.achievementById[id]) delete d.ach[id]; });
      P.data = d;
      return d;
    },
    get: function () { return P.data || P.load(); },
    save: function () { try { G.Save.store().setItem(key(), JSON.stringify(P.get())); } catch (e) { /* 무시 */ } },
    reset: function () { P.data = blank(); P.save(); },

    stat: function (k) { return P.get().stats[k] || 0; },
    add: function (k, n) { var s = P.get().stats; s[k] = (s[k] || 0) + (n == null ? 1 : n); },
    max: function (k, v) { var s = P.get().stats; if (v > (s[k] || 0)) s[k] = v; },
    has: function (id) { return !!P.get().ach[id]; },
    // 해금한 시작 선물
    boons: function () {
      return D.achievements.filter(function (a) { return a.reward && P.has(a.id); }).map(function (a) { return a.reward; });
    },

    // ---------------- 판정 ----------------
    // 지금 저장 칸의 수집 수
    collect: function (kind) {
      var d = G.Stage && G.Stage.data;
      if (!d) return 0;
      if (kind === 'heroes') return d.characters.length;
      if (kind === 'cards') return d.cards.filter(function (id, i, a) { return a.indexOf(id) === i && D.cardById[id] && D.cardById[id].owner !== 'none'; }).length;
      if (kind === 'relics') return d.relics.length;
      if (kind === 'up3') return Object.keys(d.upgraded || {}).filter(function (id) { return d.upgraded[id] >= 3; }).length;
      if (kind === 'bond') return Object.keys(d.bonds || {}).reduce(function (m, k) { return Math.max(m, d.bonds[k] || 0); }, 0);
      return 0;
    },
    // 진행도 [지금, 목표] (누적·수집 업적만, 나머지는 null)
    progress: function (a) {
      var n = a.need;
      if (n.stat) return [Math.min(P.stat(n.stat), n.n), n.n];
      if (n.collect) return [Math.min(P.collect(n.collect), n.n), n.n];
      return null;
    },
    test: function (a, ev, ctx) {
      var n = a.need;
      if (n.stat) return P.stat(n.stat) >= n.n;
      if (n.collect) return P.collect(n.collect) >= n.n;
      if (n.on !== ev) return false;
      ctx = ctx || {};
      var range = function (v, r) { return !r || ((r.min == null || v >= r.min) && (r.max == null || v <= r.max)); };
      if (ev === 'battleWin') {
        if (n.node && n.node.indexOf(ctx.node) < 0) return false;
        if (!range(ctx.turn, n.turn)) return false;
        return Object.keys(n.tally || {}).every(function (k) { return range((ctx.tally || {})[k] || 0, n.tally[k]); });
      }
      if (ev === 'stageClear') return ctx.stage === n.stage;
      if (ev === 'ending') return (!n.mode || ctx.mode === n.mode) && (!n.asc || (ctx.asc || 0) >= n.asc);
      if (ev === 'daily') return n.cleared == null || !!ctx.cleared === n.cleared;
      return false;
    },
    // 사건 하나를 판정해 새로 달성한 업적 목록을 돌려준다
    check: function (ev, ctx) {
      var got = D.achievements.filter(function (a) { return !P.has(a.id) && P.test(a, ev, ctx); });
      var now = Date.now();
      got.forEach(function (a) { P.get().ach[a.id] = now; });
      P.save();
      if (got.length && P.onUnlock) { try { P.onUnlock(got); } catch (e) { /* 알림 실패는 무시 */ } }
      return got;
    },

    // ---------------- 진행 코드가 부른다 ----------------
    // info: { node(칸 종류), stage, mode, asc }
    battle: function (b, result, info) {
      var t = b.tally || {}, win = result === 'win';
      P.add('battles'); P.add(win ? 'wins' : 'losses');
      P.add('kills', (b.kills || []).length);
      if (win && info.node === 'elite') P.add('elites');
      if (win && (info.node === 'boss' || info.node === 'midboss' || info.node === 'final')) P.add('bosses');
      P.add('dealt', t.dealt || 0); P.add('taken', t.taken || 0); P.add('cards', t.cards || 0); P.add('turns', b.turn || 0);
      P.max('maxHit', t.maxHit || 0); P.max('maxCombo', t.maxCombo || 0);
      var pr = P.get();
      b.heroes.forEach(function (h) { pr.heroUse[h.id] = (pr.heroUse[h.id] || 0) + 1; });
      Object.keys(t.plays || {}).forEach(function (id) { pr.cardUse[id] = (pr.cardUse[id] || 0) + t.plays[id]; });
      // 35단계: 카드별 통계(강화 단계는 합쳐 원래 카드 id 로). 덱에 든 전투 · 이긴 전투 · 쓴 횟수
      var base = function (id) { return String(id).split('+')[0]; }, seenIds = {};
      ((b.opts && b.opts.deck) || []).forEach(function (id) { var k = base(id); if (D.cardById[k] && D.cardById[k].owner !== 'none') seenIds[k] = 1; });
      Object.keys(seenIds).forEach(function (k) { var c = pr.cardStat[k] || (pr.cardStat[k] = [0, 0, 0]); c[0]++; if (win) c[1]++; });
      Object.keys(t.plays || {}).forEach(function (id) { var k = base(id); if (pr.cardStat[k]) pr.cardStat[k][2] += t.plays[id]; });
      return P.check(win ? 'battleWin' : 'battleLost', { node: info.node, stage: info.stage, mode: info.mode, asc: info.asc, turn: b.turn, tally: t });
    },
    stage: function (info) { P.add('stages'); return P.check('stageClear', info); },
    ending: function (info) { P.add('endings'); return P.check('ending', info); },
    // 33단계: 대장간 강화 시도·성공, 가장 높이 올린 단계
    forge: function (info) { P.add('forgeTries'); if (info.success) P.add('forgeWins'); P.max('forgeBest', info.level || 0); return P.check('forge', info); },
    dailyStart: function () { P.add('dailyPlays'); return P.check('dailyStart', {}); },
    // res: { key, score, cleared, stage, party, mods } → { best, attempts, record(이번이 최고인지) }
    dailyDone: function (res) {
      var all = P.get().daily, cur = all[res.key] || { best: null, attempts: 0 };
      cur.attempts++;
      var record = !cur.best || res.score > cur.best.score;
      if (record) cur.best = { score: res.score, cleared: res.cleared, stage: res.stage, party: res.party, mods: res.mods };
      all[res.key] = cur;
      // 오래된 날짜는 60일만 남긴다
      var keys = Object.keys(all).sort();
      while (keys.length > 60) delete all[keys.shift()];
      if (res.cleared) P.add('dailyClears');
      P.check('daily', res);
      return { best: cur.best, attempts: cur.attempts, record: record };
    }
  };
})();
