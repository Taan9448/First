// stage.js — 진행 상태: 새 게임, 갈림길 맵 진행, 보상, 상점, 휴식, 이벤트, 카드 강화, 합류, 덱 관리
// 화면을 만지지 않는다. 화면(ui-meta.js)은 여기 함수의 결과를 보고 다음 화면을 고른다.
(function () {
  'use strict';
  var G = Game, D = G.Data;

  function eco() { return D.economy; }
  function charDef(id) { return D.characters.filter(function (c) { return c.id === id; })[0]; }
  function rarityIdx(r) { return G.RARITIES.indexOf(r); }

  var St = G.Stage = {
    data: null,

    // ================= 저장 =================
    load: function () { St.data = G.Save.load(); return St.data; },
    save: function () { if (St.data) G.Save.write(St.data); },

    // mode: 'normal' | 'hard' | 'hardcore' (data/modes.js). 저장 칸은 G.Save.use(n)로 먼저 고른다
    newGame: function (mode) {
      var d = {
        version: G.Save.VERSION, gold: 0, clearedStage: 0, run: null, mode: D.modes && D.modes[mode] ? mode : 'normal', dead: [],
        characters: ['kai'], party: ['kai'], cards: [], decks: {}, relics: [], items: [], upgraded: {},
        growth: {}, bonds: {}, talks: {}, ascension: { current: 0, best: 0 }, eventsSeen: [], buffs: [],
        codex: { monsters: {} }, flags: { tutorialDone: false }, story: { seen: [] }
      };
      St.data = d;
      D.cards.forEach(function (c) { if (c.basic && (c.owner === 'kai' || c.owner === 'common')) d.cards.push(c.id); });
      d.decks.kai = St.starterDeck('kai');
      d.decks.common = St.starterDeck('common');
      if (G.debug) {
        // 디버그: 모든 캐릭터·카드 해금
        d.characters = D.characters.map(function (c) { return c.id; });
        d.cards = D.cards.filter(function (c) { return c.owner !== 'none'; }).map(function (c) { return c.id; });
        d.characters.concat(['common']).forEach(function (o) { d.decks[o] = St.autoBuild(o); });
        d.party = ['kai', 'bram', 'lyra'];
        d.gold = 500;
      }
      St.save();
      return d;
    },

    // ================= 게임 모드(15단계) =================
    mode: function () { return D.modes[(St.data && St.data.mode) || 'normal'] || D.modes.normal; },
    isDead: function (id) { return !!St.data && (St.data.dead || []).indexOf(id) >= 0; },
    living: function () { return St.data.characters.filter(function (id) { return !St.isDead(id); }); },
    // 하드코어: 동료가 죽는다. 편성에서 빠지고 이번 스테이지 체력 기록도 지운다
    kill: function (id) {
      var d = St.data;
      if (St.isDead(id)) return;
      d.dead = d.dead || [];
      d.dead.push(id);
      d.party = d.party.filter(function (x) { return x !== id; });
      if (d.run) delete d.run.hp[id];
    },

    // ================= 승천(10단계) =================
    ascLevel: function () { var a = St.data && St.data.ascension; return a ? a.current || 0 : 0; },
    // 1단계부터 lv 단계까지의 규칙을 합친다: 비율은 더하고, 배율은 곱하고, 나머지는 높은 단계 값
    ascMods: function (lv) {
      if (lv == null) lv = St.ascLevel();
      var m = { hpMult: 0, bossHpMult: 0, finalHpMult: 0, dmgMult: 0, triggerStr: 0, eliteStr: 0, affixMult: 1, shopPriceMult: 1, goldMult: 1, doomMult: 1 };
      var ADD = { hpMult: 1, bossHpMult: 1, finalHpMult: 1, dmgMult: 1, triggerStr: 1, eliteStr: 1 }, MUL = { affixMult: 1, shopPriceMult: 1, goldMult: 1, doomMult: 1 };
      var per = D.ascensionScale || {};
      m.hpMult += (per.hpMult || 0) * lv;
      m.dmgMult += (per.dmgMult || 0) * lv;
      var merge = function (mods) {
        Object.keys(mods || {}).forEach(function (k) {
          var v = mods[k];
          if (ADD[k]) m[k] = (m[k] || 0) + v; else if (MUL[k]) m[k] = (m[k] == null ? 1 : m[k]) * v;
          else m[k] = m[k] == null ? v : Math.min(m[k], v);   // restPct · downedPct · rewardCards: 더 엄한 쪽
        });
      };
      (D.ascension || []).forEach(function (a) { if (a.n <= lv) merge(a.mods); });
      // 23단계: 게임 모드의 규칙(하드)도 같은 방식으로 더한다
      if (St.data) merge(St.mode().rules);
      // 26단계: 오늘의 원정 규칙
      var dl = St.data && St.data.flags && St.data.flags.daily;
      if (dl) St.dailyMods(dl.mods).forEach(function (x) { merge(x.mods); });
      return m;
    },
    // 전투에 넘길 적 강화 보정: 스테이지 난이도(data/stages.js 의 difficulty) + 승천
    enemyMods: function (stage) {
      var a = St.ascMods(), dif = D.difficulty || {}, curve = D.ascensionCurve;
      var hp = dif.hp ? dif.hp[stage - 1] || 1 : 1, dmg = dif.dmg ? dif.dmg[stage - 1] || 1 : 1;
      if (St.ascLevel() > 0 && curve) {
        hp = curve.hp * (1 + curve.hpPerStage * (stage - 1));
        dmg = curve.dmg * (1 + curve.dmgPerStage * (stage - 1));
        var gr = D.ascensionGrowth, lv = St.ascLevel() - 1;
        if (gr && lv > 0) { hp *= Math.min(gr.cap || 99, Math.pow(gr.hp, lv)); dmg *= Math.min(gr.cap || 99, Math.pow(gr.dmg, lv)); }
      }
      // 게임 모드(15단계): 체력·피해 배율을 모두 곱한다
      var md = St.mode(), mh = md.enemyHp || 1, mdg = md.enemyDmg || 1;
      // 23단계: 정예·보스 체력 보정(difficulty.bossHp, 보스전이 너무 빨리 끝나지 않게)
      var bh = (dif.bossHp ? dif.bossHp[stage - 1] || 1 : 1) - 1;
      return { hpMult: (a.hpMult + hp) * mh - 1, bossHpMult: (a.bossHpMult + bh * hp) * mh, finalHpMult: a.finalHpMult * mh, dmgMult: (a.dmgMult + dmg) * mdg - 1,
        triggerStr: a.triggerStr, doomMult: a.doomMult, eliteStr: a.eliteStr || 0 };
    },
    maxAscension: function () { return Math.min((D.ascension || []).length, ((St.data.ascension || {}).best || 0) + 1); },
    // 새 원정: 엔딩을 본 뒤 승천 단계를 골라 1 스테이지부터. 카드·강화·유물·골드·동료·성장·친밀도·도감은 그대로
    newExpedition: function (level) {
      var d = St.data;
      if (!d.flags.ended || level < 0 || level > St.maxAscension()) return false;
      d.ascension = d.ascension || { current: 0, best: 0 };
      d.ascension.current = level;
      d.clearedStage = 0;
      d.run = null;
      d.eventsSeen = [];
      d.buffs = [];
      d.flags.ended = false;
      d.expeditions = (d.expeditions || 1) + 1;
      St.save();
      return true;
    },

    // ================= 유물 =================
    mods: function () {
      return G.Battle.mergeMods((St.data.relics || []).map(function (id) { return D.relicById[id]; }).filter(Boolean));
    },
    hasRelic: function (id) { return St.data.relics.indexOf(id) >= 0; },
    addRelic: function (id) {
      if (!id || St.hasRelic(id)) return false;
      St.data.relics.push(id);
      return true;
    },
    // kind: elite · shop · choice(보스 보상, 희귀·고급) · boss(보스 유물)
    rollRelic: function (kind, exclude) {
      exclude = exclude || [];
      var free = D.relics.filter(function (r) { return !St.hasRelic(r.id) && exclude.indexOf(r.id) < 0; });
      if (kind === 'boss') {
        var boss = free.filter(function (r) { return r.rarity === 'boss'; });
        return boss.length ? G.rng.pick(boss).id : null;
      }
      free = free.filter(function (r) { return r.rarity !== 'boss'; });
      var e = D.relicEconomy, stage = St.data.run ? St.data.run.stage : 1;
      var w = kind === 'shop' ? [50, 35, 15] : kind === 'choice' ? [0, 50, 50] : e.elite[stage <= 4 ? 0 : 1];
      var names = ['common', 'uncommon', 'rare'], total = w[0] + w[1] + w[2], roll = G.rng.next() * total, k = 0;
      while (k < 2 && roll >= w[k]) { roll -= w[k]; k++; }
      for (var step = 0; step < 3; step++) {
        var at = free.filter(function (r) { return r.rarity === names[(k + step) % 3]; });
        if (at.length) return G.rng.pick(at).id;
      }
      return null;
    },
    rollRelicChoice: function (stage) {
      var boss = D.relicEconomy.bossActs.indexOf(stage) >= 0, out = [];
      for (var i = 0; i < 3; i++) {
        var id = St.rollRelic(boss ? 'boss' : 'choice', out) || St.rollRelic('choice', out);
        if (id) out.push(id);
      }
      return out;
    },
    takeRelic: function (id) {
      var p = St.data.run && St.data.run.pending;
      if (!p || !p.relicChoice) return false;
      if (id && p.relicChoice.indexOf(id) >= 0) St.addRelic(id);
      p.relicChoice = null;
      St.save();
      return true;
    },

    // ================= 소모품(22단계) =================
    items: function () { return St.data.items || (St.data.items = []); },
    itemRoom: function () { return St.items().length < D.itemEconomy.slots; },
    addItem: function (id) {
      if (!id || !D.itemById[id] || !St.itemRoom()) return false;
      St.items().push(id);
      return true;
    },
    dropItem: function (index) { St.items().splice(index, 1); St.save(); },
    rollItem: function () {
      var w = D.itemEconomy.weights[(St.data.run && St.data.run.stage > 4) ? 1 : 0], names = ['common', 'uncommon', 'rare'];
      var total = w[0] + w[1] + w[2], roll = G.rng.next() * total, k = 0;
      while (k < 2 && roll >= w[k]) { roll -= w[k]; k++; }
      var at = D.items.filter(function (it) { return it.rarity === names[k]; });
      return (at.length ? G.rng.pick(at) : G.rng.pick(D.items)).id;
    },
    itemPrice: function (id) { return Math.round(D.itemEconomy.price[D.itemById[id].rarity] * (St.mods().shopPriceMult || 1) * St.ascMods().shopPriceMult); },
    buyItem: function (i) {
      var d = St.data, s = d.run.shop, id = s && s.items && s.items[i];
      if (!id || s.itemSold[i] || !St.itemRoom() || d.gold < St.itemPrice(id)) return false;
      d.gold -= St.itemPrice(id);
      s.itemSold[i] = true;
      St.addItem(id);
      St.save();
      return true;
    },

    // ================= 카드·덱 =================
    owns: function (id) { return St.data.cards.indexOf(id) >= 0; },
    ownedOf: function (owner) {
      return St.data.cards.filter(function (id) { return D.cardById[id].owner === owner; });
    },

    // 카드를 보유 카드(수집)에 넣는다. 처음 얻은 카드이고 준비 덱에 자리가 있으면 준비 덱에도 넣는다
    addCard: function (id) {
      var d = St.data;
      if (St.owns(id)) return false;
      d.cards.push(id);
      var owner = D.cardById[id].owner;
      d.decks[owner] = d.decks[owner] || [];
      if (d.decks[owner].length < eco().deckMax) d.decks[owner].push(id);
      return true;
    },
    // 시작 카드(19단계): data/characters.js 의 starter, 공용은 economy.starterCommon
    starterDeck: function (owner) {
      var list = owner === 'common' ? eco().starterCommon : (charDef(owner) || {}).starter;
      list = (list || []).filter(function (id) { return St.owns(id); });
      return list.length ? list.slice() : St.autoBuild(owner, eco().startDeck);
    },

    // ================= 스테이지 덱(19단계) =================
    // 스테이지에 들어갈 때 준비 덱을 그대로 복사한다. 그 스테이지에서 얻은 카드는 스테이지 덱에 들어가고(보유 카드에도 남는다),
    // 제거·복제는 스테이지 덱에만 적용된다. 스테이지가 끝나거나 지면 스테이지 덱은 사라진다
    runDecks: function () { var r = St.data.run; return r && r.decks ? r.decks : null; },
    inRunDeck: function (id) {
      var rd = St.runDecks();
      if (!rd) return false;
      return Object.keys(rd).some(function (o) { return rd[o].indexOf(id) >= 0; });
    },
    runDeckList: function (owners) {
      var rd = St.runDecks() || St.data.decks, out = [];
      (owners || Object.keys(rd)).forEach(function (o) { (rd[o] || []).forEach(function (id) { out.push(id); }); });
      return out;
    },
    // 스테이지 동안 카드를 얻는다: 보유 카드에 넣고(처음이면) 스테이지 덱에 넣는다. 반환: 처음 얻은 카드인지
    gainCard: function (id) {
      var d = St.data, r = d.run, isNew = !St.owns(id);
      if (isNew) St.addCard(id);
      if (r && r.decks) {
        var o = D.cardById[id].owner;
        (r.decks[o] = r.decks[o] || []).push(id);
      }
      return isNew;
    },
    // 제거: 스테이지 덱에서 한 장. 값은 스테이지 안에서 쓸 때마다 오른다(상점). 휴식의 '정리'는 공짜
    removeCost: function () { var r = St.data.run; return eco().removeCost + eco().removeStep * ((r && r.removed) || 0); },
    canRemove: function () { return St.runDeckList().length > eco().runDeckMin; },
    removeFromRun: function (id) {
      var rd = St.runDecks();
      if (!rd || !St.canRemove()) return false;
      var o = D.cardById[id].owner, i = (rd[o] || []).indexOf(id);
      if (i < 0) return false;
      rd[o].splice(i, 1);
      return true;
    },
    shopRemove: function (id) {
      var d = St.data, s = d.run.shop, cost = St.removeCost();
      if (!s || d.gold < cost || !St.removeFromRun(id)) return false;
      d.gold -= cost;
      d.run.removed = (d.run.removed || 0) + 1;
      St.save();
      return true;
    },
    // 복제: 스테이지 덱의 카드 한 장을 한 장 더(상점마다 한 번)
    shopDuplicate: function (id) {
      var d = St.data, s = d.run.shop, cost = eco().dupCost, rd = St.runDecks();
      if (!s || s.duped || d.gold < cost || !St.inRunDeck(id)) return false;
      d.gold -= cost;
      s.duped = true;
      rd[D.cardById[id].owner].push(id);
      St.save();
      return true;
    },
    // 이벤트의 정리·복제(22단계): 남은 기회(run.purges / run.dups)를 쓴다
    eventPurge: function (id) {
      var r = St.data.run;
      if (!r || !r.purges || !St.removeFromRun(id)) return false;
      r.purges--; St.save(); return true;
    },
    eventDup: function (id) {
      var r = St.data.run, rd = St.runDecks();
      if (!r || !r.dups || !St.inRunDeck(id)) return false;
      rd[D.cardById[id].owner].push(id);
      r.dups--; St.save(); return true;
    },
    skipEventDeck: function () { var r = St.data.run; if (r) { r.purges = 0; r.dups = 0; St.save(); } },
    // 휴식의 정리: 한 장을 공짜로 뺀다
    // 반환: 실패하면 false, 성공하면 { info: 스테이지 클리어 정보 또는 null }
    restPurge: function (id) {
      var r = St.data.run;
      if (!r || !r.purges || !St.removeFromRun(id)) return false;
      r.purges = 0;
      return { info: St.advance() };
    },

    // 자동 구성: 등급이 높은 카드부터 최대 size(기본 autoBuildSize)장, 공격 카드는 최소 3장
    autoBuild: function (owner, size) {
      size = size || eco().autoBuildSize;
      var list = St.ownedOf(owner).map(function (id) { return D.cardById[id]; });
      list.sort(function (a, b) { return rarityIdx(b.rarity) - rarityIdx(a.rarity) || (a.id < b.id ? -1 : 1); });
      var pick = list.slice(0, size);
      var rest = list.slice(size);
      var attacks = function () { return pick.filter(function (c) { return c.type === 'attack'; }).length; };
      while (attacks() < Math.min(3, Math.ceil(size / 2))) {
        var a = rest.filter(function (c) { return c.type === 'attack'; })[0];
        var drop = pick.slice().reverse().filter(function (c) { return c.type !== 'attack'; })[0];
        if (!a || !drop) break;
        pick.splice(pick.indexOf(drop), 1, a);
        rest.splice(rest.indexOf(a), 1);
      }
      return pick.map(function (c) { return c.id; });
    },

    // 전투 덱: 강화한 카드는 단계에 맞게 'K01+' · 'K01+2' · 'K01+3' 으로 바꿔 넣는다
    battleDeck: function (party) {
      var d = St.data, ids = [], src = St.runDecks() || d.decks;
      party.concat(['common']).forEach(function (o) { ids = ids.concat(src[o] || []); });
      return ids.map(function (id) { return G.Upgrade.idOf(id, d.upgraded); });
    },

    // ================= 카드 강화 (18단계: 3단계까지) =================
    // 보유 카드의 강화 단계(0~3). St.data.upgraded = { 카드 id: 단계 }
    upLevel: function (id) { return G.Upgrade.levelIn(id, St.data.upgraded); },
    isUpgraded: function (id) { return St.upLevel(id) > 0; },
    // 보유 카드의 지금 모습(강화했으면 그 단계의 강화 카드)
    cardDef: function (id) { return D.cardById[G.Upgrade.idOf(id, St.data.upgraded)]; },
    // 한 단계 더 강화했을 때의 모습
    nextDef: function (id) { return G.Upgrade.def(id, St.upLevel(id) + 1); },
    upgradable: function () {
      return St.data.cards.filter(function (id) { return St.upLevel(id) < G.Upgrade.MAX; });
    },
    // 강화 기회(휴식·이벤트)를 쓴다. 한 번에 한 단계 오른다
    upgradeCard: function (id) {
      var d = St.data, r = d.run;
      if (!r || !r.upgrades || !St.owns(id) || St.upLevel(id) >= G.Upgrade.MAX) return false;
      d.upgraded[id] = St.upLevel(id) + 1;
      r.upgrades--;
      St.save();
      return true;
    },
    skipUpgrade: function () {
      var r = St.data.run;
      if (r) { r.upgrades = 0; St.save(); }
    },

    setParty: function (ids) {
      var d = St.data;
      ids = ids.filter(function (id) { return d.characters.indexOf(id) >= 0 && !St.isDead(id); }).slice(0, 3);
      if (!ids.length) return false;
      d.party = ids;
      St.save();
      return true;
    },

    // ================= 스테이지 =================
    stageDef: function (n) { return D.stages[n - 1]; },
    canEnter: function (n) { return G.debug || n <= St.data.clearedStage + 1; },

    startStage: function (n) {
      var d = St.data, def = St.stageDef(n);
      var hp = {};
      St.living().forEach(function (id) { hp[id] = St.maxHp(id); });
      d.party = d.party.filter(function (id) { return !St.isDead(id); });
      if (!d.party.length) d.party = St.living().slice(0, 3);
      var map = St.genMap(def);
      var decks = {};
      St.living().concat(['common']).forEach(function (o) { decks[o] = (d.decks[o] || []).slice(); });
      d.run = { stage: n, col: 0, path: [], map: map, hp: hp, pending: null, shop: null, upgrades: 0, purges: 0, removed: 0, decks: decks, replay: n <= d.clearedStage };
      St.autoPick();
      St.save();
      return d.run;
    },

    // ================= 던전 지도(14단계) =================
    // 입구 → 경로 모듈을 무작위로 이은 중간 구역 → 야영지 → 마지막 방. 방: { type, lane, module, next:[다음 열 방 번호], known }
    genMap: function (def) {
      var R = D.mapRules, counts = {};
      St._genTheme = def.theme;
      var pickW = function (pool) {
        var keys = Object.keys(pool), total = 0;
        keys.forEach(function (k) { total += pool[k]; });
        var roll = G.rng.next() * total;
        for (var i = 0; i < keys.length; i++) { roll -= pool[keys[i]]; if (roll < 0) return keys[i]; }
        return keys[keys.length - 1];
      };
      var colFrom = function (spec, free) {
        var w = G.rng.int(spec.w[0], spec.w[1]), out = [];
        for (var i = 0; i < w; i++) {
          var t = pickW(spec.pool);
          if (!free && R.limits[t] != null && (counts[t] || 0) >= R.limits[t]) t = 'battle';
          counts[t] = (counts[t] || 0) + 1;
          out.push(t);
        }
        return out;
      };
      var middle = function (n) {
        var out = [], used = {};
        while (out.length < n) {
          var mods = D.pathModules.filter(function (m) { return !(m.max && (used[m.id] || 0) >= m.max) && m.cols.length <= n - out.length; });
          if (!mods.length) mods = [D.pathModules[0]];
          var weights = {};
          mods.forEach(function (m, i) { weights[i] = m.weight; });
          var m = mods[+pickW(weights)];
          used[m.id] = (used[m.id] || 0) + 1;
          m.cols.forEach(function (c) { out.push({ types: colFrom(c), module: m.id }); });
        }
        return out;
      };
      var cols = [{ types: ['battle'], module: 'entrance' }];
      if (def.layout === 'final') {
        cols = cols.concat(middle(R.finalSplit[0]));
        cols.push({ types: colFrom(R.campBeforeBoss, true), module: 'camp' });
        cols.push({ types: ['midboss'], module: 'midboss' });
        cols = cols.concat(middle(R.finalSplit[1]));
      } else cols = cols.concat(middle(G.rng.int(R.middleCols[0], R.middleCols[1])));
      cols.push({ types: colFrom(R.campBeforeBoss, true), module: 'camp' });
      cols.push({ types: [def.last], module: 'boss' });
      var map = cols.map(function (c, ci) {
        var last = ci === cols.length - 1;
        return c.types.map(function (t, i) {
          var node = St.makeNode(def, t, last, ci <= R.easyCols);
          node.lane = i; node.module = c.module;
          if (c.module === 'entrance' || c.module === 'boss' || t === 'midboss') node.known = true;
          return node;
        });
      });
      St.linkMap(map);
      St._genTheme = null;
      return map;
    },

    // 열과 열 사이 통로: 방마다 가장 가까운 레인 + 확률로 바로 옆 레인. 통로가 엇갈리지 않게 하고, 모든 방에 들어오는 길을 만든다
    linkMap: function (map) {
      var side = D.mapRules.link.side;
      var num = function (x, y) { return x - y; };
      for (var c = 0; c < map.length - 1; c++) {
        var A = map[c], Bn = map[c + 1], a = A.length, b = Bn.length;
        if (a === 1) { A[0].next = Bn.map(function (_, j) { return j; }); continue; }
        if (b === 1) { A.forEach(function (n) { n.next = [0]; }); continue; }
        var base = A.map(function (_, i) { return Math.round(i * (b - 1) / (a - 1)); });
        A.forEach(function (n, i) {
          var set = [base[i]];
          if (base[i] - 1 >= 0 && G.rng.chance(side)) set.push(base[i] - 1);
          if (base[i] + 1 < b && G.rng.chance(side)) set.push(base[i] + 1);
          n.next = set.sort(num);
        });
        for (var i = 0; i < a - 1; i++) {
          var x = A[i].next, y = A[i + 1].next;
          while (x[x.length - 1] > y[0]) {
            if (x.length > 1 && x[x.length - 1] !== base[i]) x.pop();
            else if (y.length > 1 && y[0] !== base[i + 1]) y.shift();
            else break;
          }
        }
        for (var j = 0; j < b; j++) {
          if (A.some(function (n) { return n.next.indexOf(j) >= 0; })) continue;
          var k = 0;
          for (var q = 0; q < a; q++) if (base[q] <= j) k = q;
          A[k].next.push(j); A[k].next.sort(num);
        }
      }
      map[map.length - 1].forEach(function (n) { n.next = []; });
    },

    makeNode: function (def, type, last, first) {
      var node = { type: type };
      if (type === 'battle') node.monsters = G.rng.pick(first ? def.easy : def.hard).slice();
      else if (type === 'elite' && !last) {
        // 28단계: 스테이지마다 정예 후보(elites)가 있다. 중간 정예가 정해진 스테이지는 둘 중 하나, 아니면 55%로 정예 · 45%로 변이 무리
        var pool = (def.elites || []).concat(def.midElite ? [def.midElite] : []);
        if (pool.length && (def.midElite || G.rng.chance(0.55))) node.monsters = [G.rng.pick(pool)];
        else { // 정예 무리: 변이를 모두 붙인 일반 몬스터 조합
          node.monsters = G.rng.pick(def.hard).slice();
          var keys = Object.keys(D.affixes);
          node.affixes = node.monsters.map(function () { return G.rng.pick(keys); });
          node.squad = true;
        }
      }
      else if (type === 'midboss') node.monsters = [def.midboss];
      else if (type === 'elite' || type === 'boss' || type === 'final') node.monsters = [def.boss];
      else if (type === 'event') node.event = St.pickEvent();
      return node;
    },

    // 한 원정에서 같은 이벤트는 다시 나오지 않는다(다 쓰면 처음부터)
    pickEvent: function () {
      var d = St.data, seen = d.eventsSeen = d.eventsSeen || [];
      // 22단계: 테마 이벤트는 그 테마의 스테이지에서만
      var theme = St._genTheme || (d.run ? (St.stageDef(d.run.stage) || {}).theme : null);
      var ok = function (e) { return !e.themes || !theme || e.themes.indexOf(theme) >= 0; };
      var free = D.events.filter(function (e) { return seen.indexOf(e.id) < 0 && ok(e); });
      if (!free.length) { seen.length = 0; free = D.events.filter(ok); }
      var e = G.rng.pick(free);
      seen.push(e.id);
      return e.id;
    },

    abandon: function () { St.data.run = null; St.save(); },
    // 지금 열의 고른 노드(아직 고르지 않았으면 null)
    node: function () {
      var r = St.data.run;
      if (!r) return null;
      var i = r.path[r.col];
      return i == null ? null : r.map[r.col][i];
    },
    // 지금 열에서 갈 수 있는 방 번호(앞 방에서 통로가 이어진 방)
    choiceIdx: function () {
      var r = St.data.run;
      if (!r || r.col >= r.map.length) return [];
      if (r.col === 0) return r.map[0].map(function (_, i) { return i; });
      var prev = r.map[r.col - 1][r.path[r.col - 1]];
      return prev && prev.next ? prev.next.slice() : r.map[r.col].map(function (_, i) { return i; });
    },
    choices: function () { var r = St.data.run; return r ? St.choiceIdx().map(function (j) { return r.map[r.col][j]; }) : []; },
    // 갈림길에서 k번째 길을 고른다(고르면 바꿀 수 없다). 방 번호로 고를 때는 chooseRoom
    choose: function (k) {
      var r = St.data.run, idx = St.choiceIdx();
      if (!r || r.path[r.col] != null || idx[k] == null) return false;
      r.path[r.col] = idx[k];
      St.scout();
      St.save();
      return true;
    },
    chooseRoom: function (j) { return St.choose(St.choiceIdx().indexOf(j)); },
    autoPick: function () {
      var r = St.data.run;
      if (r && r.col < r.map.length && r.path[r.col] == null) {
        var idx = St.choiceIdx();
        if (idx.length === 1) { r.path[r.col] = idx[0]; St.scout(); }
      }
    },
    // 정찰: 방에 들어가면 그 방에서 이어진 다음 방마다 확률로 내용이 드러난다
    scoutChance: function () {
      var R = D.mapRules;
      return Math.min(0.95, R.scout + (St.data.party.indexOf('nox') >= 0 ? R.scoutBonus : 0) + (St.mods().scout || 0));
    },
    scout: function () {
      var r = St.data.run, node = St.node();
      if (!node) return [];
      node.known = true;
      var next = r.map[r.col + 1], p = St.scoutChance(), found = [];
      (node.next || []).forEach(function (j) {
        var n = next && next[j];
        if (n && !n.known && G.rng.chance(p)) { n.known = true; found.push(j); }
      });
      r.scouted = found;
      return found;
    },

    // 보물 방(14단계): 상자를 열면 골드(가끔 유물), 일정 확률로 매복 전투(이기면 골드를 더 받는다)
    openTreasure: function () {
      var d = St.data, r = d.run, node = St.node(), T = D.mapRules.treasure, def = St.stageDef(r.stage);
      if (node.result) return node.result;
      var res = { ambush: G.rng.chance(T.ambush), gold: G.rng.int(T.gold[0], T.gold[1]), relic: null };
      if (res.ambush) {
        res.gold += T.ambushGold;
        node.fight = { kind: 'battle', monsters: G.rng.pick(def.hard).slice() };
      } else {
        d.gold += res.gold;
        if (G.rng.chance(T.relic)) { res.relic = St.rollRelic('shop'); if (res.relic) St.addRelic(res.relic); }
      }
      node.result = res;
      St.save();
      return res;
    },
    leaveTreasure: function () { return St.advance(); },

    // ================= 전투 =================
    battleOptions: function () {
      var d = St.data, r = d.run, node = St.node(), def = St.stageDef(r.stage);
      var party = d.party.filter(function (id) { return r.hp[id] != null; });
      var fight = node.fight || node;
      // 적 변이: 일반 전투의 몬스터마다 확률로 접두어. 처음 들어갈 때 정해 저장한다(다시 해도 같음)
      if (!fight.affixes) {
        var ac = D.affixChance, chance = Math.min(0.9, (ac.from + (ac.to - ac.from) * (r.stage - 1) / 9) * St.ascMods().affixMult);
        var keys = Object.keys(D.affixes);
        fight.affixes = fight.monsters.map(function (id) {
          return node.type === 'battle' && D.monsterById[id].rank === 'normal' && G.rng.chance(chance) ? G.rng.pick(keys) : null;
        });
        St.save();
      }
      var monsters = fight.monsters.slice();
      var affixes = fight.affixes.map(function (a) { return D.affixes[a] ? a : null; });
      // 이벤트가 남긴 효과: 전투 시작 효과, 방해 카드, 거울 속 그림자
      var buffs = d.buffs || [], startEffects = [], extra = [];
      buffs.forEach(function (b) {
        if (b.effects) startEffects.push({ name: b.name, effects: b.effects });
        if (b.card) for (var i = 0; i < b.count; i++) extra.push(b.card);
        if (b.mirror && monsters.length < 4) { monsters.push('shadow_' + b.mirror); affixes.push(null); }
      });
      var type = node.fight ? node.fight.kind : node.type;
      return {
        title: '스테이지 ' + r.stage + ' · ' + D.NODE_NAME[type] + (St.ascLevel() ? ' · 승천 ' + St.ascLevel() : ''),
        enemy: St.enemyMods(r.stage),
        stage: r.stage, nodeType: type, theme: def.theme,
        party: party.map(function (id) { return { id: id, hp: Math.max(1, r.hp[id]), traits: St.traitMods(id) }; }),
        bonds: Object.assign({}, d.bonds),
        monsters: monsters,
        affixes: affixes,
        relics: (d.relics || []).slice(),
        items: (d.items || []).slice(),
        startEffects: startEffects,
        deck: St.battleDeck(party).concat(St.duoDeck(party), extra),
        gold: d.gold,
        boss: type !== 'battle',
        undo: !!St.mode().undo   // 24단계: 턴 되돌리기(노말만)
      };
    },

    markSeen: function (ids) {
      var m = St.data.codex.monsters;
      ids.forEach(function (id) { m[id] = m[id] || { seen: true, kills: 0 }; m[id].seen = true; });
    },

    // 승리: 체력 반영, 처치 기록, 골드. 반환: { ending } 또는 { reward }
    battleWon: function (battle) {
      var d = St.data, r = d.run, node = St.node(), mods = St.mods();
      var asc = St.ascMods();
      var downed = Math.max(asc.downedPct != null ? asc.downedPct : eco().downedPct, mods.downedPct || 0);
      var winHeal = (mods.winHeal || 0);
      battle.heroes.forEach(function (h) { winHeal += h.tm && h.tm.winHeal || 0; });
      var died = [];
      battle.heroes.forEach(function (h) {
        if (h.dead && St.mode().permadeath) { died.push(h.id); return; } // 하드코어: 쓰러진 채 끝나면 죽는다
        var hp = h.dead ? Math.max(1, Math.floor(h.maxHp * downed)) : h.hp;
        if (winHeal) hp = Math.min(h.maxHp, hp + winHeal);
        r.hp[h.id] = hp;
      });
      St.lastDied = died;
      // 성장·친밀도(9단계): 편성된 동료는 쓰러져 있어도 경험치를 받고, 함께 이긴 짝은 친밀도 +1
      var fightType = node.fight ? node.fight.kind : node.type;
      var exp = (D.growth.exp[fightType] || D.growth.exp.battle);
      battle.heroes.forEach(function (h) { if (died.indexOf(h.id) < 0) St.growthOf(h.id).exp += exp; });
      died.forEach(St.kill);
      St.partyPairs(battle.heroes.filter(function (h) { return died.indexOf(h.id) < 0; }).map(function (h) { return h.id; })).forEach(function (k) { d.bonds[k] = (d.bonds[k] || 0) + D.bondGain.battle; });
      St.lastExp = { amount: exp, heroes: battle.heroes.filter(function (h) { return died.indexOf(h.id) < 0; }).map(function (h) { return h.id; }) };
      battle.monsters.forEach(function (m) { St.markSeen([m.id]); });
      battle.kills.forEach(function (id) { d.codex.monsters[id].kills++; });
      d.gold = Math.max(0, d.gold + battle.goldDelta);
      if (battle.items) d.items = battle.items.slice();   // 쓴 소모품은 사라진다
      // 이벤트 효과는 이긴 전투 수만큼 줄어든다
      d.buffs = (d.buffs || []).filter(function (b) { return --b.battles > 0; });
      // 26단계: 기록·업적, 오늘의 원정 점수
      if (G.Profile) G.Profile.battle(battle, 'win', { node: fightType, stage: r.stage, mode: d.mode, asc: St.ascLevel() });
      if (d.flags.daily) { d.flags.daily.wins++; if (fightType === 'elite') d.flags.daily.elites++; }
      if (node.type === 'final') {
        var info = St.clearStage();
        d.flags.ended = true;
        St.save();
        return { ending: true, clear: info };
      }
      var type = node.fight ? node.fight.kind : node.type;
      var kind = type === 'battle' ? 'battle' : type === 'elite' ? 'elite' : 'boss';
      r.pending = St.rollReward(kind);
      var p = r.pending;
      var mirrors = battle.kills.filter(function (id) { return D.monsterById[id].mirror; }).length;
      p.gold = Math.round(p.gold * (mods.goldMult || 1) * asc.goldMult) + (battle.affixKills || 0) * 5 + mirrors * eco().mirrorGold;
      if (node.type === 'treasure' && node.result) p.gold += node.result.gold; // 보물 방 매복을 이기면 상자 골드
      if (kind === 'elite') { p.relic = St.rollRelic('elite'); St.addRelic(p.relic); }
      // 22단계: 소모품 — 빈 칸이 있으면 확률로 하나
      if (St.itemRoom() && G.rng.chance(D.itemEconomy.drop[kind] || 0)) { p.item = St.rollItem(); if (p.item) St.addItem(p.item); }
      if (kind === 'boss') p.relicChoice = St.rollRelicChoice(r.stage);
      d.gold += p.gold + p.fill * eco().fillGold;
      St.save();
      return { reward: r.pending };
    },

    // 패배: 스테이지 처음부터 (카드·골드는 유지). 하드코어면 싸운 동료가 모두 죽고, 살아 있는 동료가 없으면 저장 칸을 지운다
    // 반환: { died: [...], wiped: bool }
    battleLost: function (battle) {
      battle.monsters.forEach(function (m) { St.markSeen([m.id]); });
      var lnode = St.node(), lkind = lnode ? (lnode.fight ? lnode.fight.kind : lnode.type) : 'battle';
      if (G.Profile) G.Profile.battle(battle, 'lose', { node: lkind, stage: St.data.run.stage, mode: St.data.mode, asc: St.ascLevel() });
      // 26단계: 오늘의 원정은 지면 끝난다
      if (St.data.flags.daily) return { daily: St.finishDaily(false), died: [], wiped: false };
      if (battle.items) St.data.items = battle.items.slice();   // 진 전투에서 쓴 소모품도 사라진다
      var n = St.data.run.stage, died = [];
      if (St.mode().permadeath) {
        died = battle.heroes.map(function (h) { return h.id; });
        died.forEach(St.kill);
        if (!St.living().length) {
          G.Save.clear();
          St.data = null;
          return { died: died, wiped: true };
        }
      }
      // 19단계: 지면 골드 일부를 잃는다(모드마다 비율). 그 스테이지에서 얻은 카드는 보유 카드에 남지만 스테이지 덱은 준비 덱으로 돌아간다
      var lossPct = St.mode().defeatGold != null ? St.mode().defeatGold : eco().defeatGold, lost = Math.floor(St.data.gold * lossPct);
      St.data.gold -= lost;
      St.startStage(n);
      return { died: died, wiped: false, goldLost: lost };
    },

    // ================= 보상 =================
    rarityWeights: function (kind, stage) {
      var e = eco(), g = Math.min(4, Math.floor((stage - 1) / 2));
      if (kind === 'shop') return e.rarity[Math.min(4, g + 1)].slice();
      if (kind === 'boss') {
        var t = Math.max(0, Math.min(1, (stage - 2) / 8));
        return [0, 0].concat(e.bossFrom.map(function (v, i) { return v + (e.bossTo[i] - v) * t; }));
      }
      var w = e.rarity[g].slice();
      if (kind === 'elite') w[0] = 0;
      return w;
    },

    // 보상 후보(19단계): 편성한 동료와 공용 카드 중 스테이지 덱에 없는 카드. 보유한 카드도 다시 나온다(스테이지 덱을 키우려고)
    // 스테이지 밖(이벤트 시험 등)에서는 예전처럼 보유 캐릭터의 미보유 카드
    candidatePool: function (exclude) {
      var d = St.data, r = d.run;
      if (r && r.decks) {
        var party = d.party.filter(function (id) { return !St.isDead(id); });
        return D.cards.filter(function (c) {
          return (c.owner === 'common' || party.indexOf(c.owner) >= 0) && !c.duo && c.owner !== 'none' && !St.inRunDeck(c.id) && exclude.indexOf(c.id) < 0;
        });
      }
      return D.cards.filter(function (c) {
        return (c.owner === 'common' || (d.characters.indexOf(c.owner) >= 0 && !St.isDead(c.owner))) && !St.owns(c.id) && exclude.indexOf(c.id) < 0;
      });
    },
    // 같은 등급 안에서는 아직 보유하지 않은 카드가 더 자주 나온다
    pickCandidate: function (at) {
      var w = at.map(function (c) { return St.owns(c.id) ? 1 : eco().newCardWeight; }), total = w.reduce(function (a, b) { return a + b; }, 0), roll = G.rng.next() * total;
      for (var i = 0; i < at.length; i++) { roll -= w[i]; if (roll < 0) return at[i]; }
      return at[at.length - 1];
    },

    // 등급을 굴리고, 그 등급에 남은 카드가 없으면 한 단계씩 낮추되 보상의 최저 등급은 지킨다(그래도 없으면 높인다)
    rollCards: function (count, kind, stage) {
      var w = St.rarityWeights(kind, stage), out = [];
      var total = w.reduce(function (a, b) { return a + b; }, 0);
      for (var i = 0; i < count; i++) {
        var roll = G.rng.next() * total, r = 0;
        while (r < 4 && roll >= w[r]) { roll -= w[r]; r++; }
        var pool = St.candidatePool(out);
        // 굴린 등급 → 낮은 등급(가중치가 있는 것만) → 높은 등급 → 그래도 없으면 최저 보장 아래
        var order = [];
        for (var k = r; k >= 0; k--) if (w[k] > 0) order.push(k);
        for (k = r + 1; k < 5; k++) order.push(k);
        for (k = r; k >= 0; k--) if (order.indexOf(k) < 0) order.push(k);
        var found = null;
        for (var j = 0; j < order.length && !found; j++) {
          var at = pool.filter(function (c) { return rarityIdx(c.rarity) === order[j]; });
          if (at.length) found = St.pickCandidate(at);
        }
        if (!found) break;
        out.push(found.id);
      }
      return out;
    },

    rewardCount: function () { return Math.min(St.ascMods().rewardCards || 3, St.mods().rewardCards || 3); },
    rollReward: function (kind) {
      var g = eco().gold[kind], stage = St.data.run.stage;
      var count = St.rewardCount();
      var cards = St.rollCards(count, kind, stage);
      return { kind: kind, gold: G.rng.int(g[0], g[1]), cards: cards, fill: count - cards.length };
    },

    // 보상 선택(cardId) 또는 건너뛰기(null). 반환: 스테이지가 끝났으면 클리어 정보
    takeReward: function (cardId) {
      var d = St.data, r = d.run;
      if (!r || !r.pending) return null;
      if (cardId && r.pending.cards.indexOf(cardId) >= 0) St.gainCard(cardId);
      else d.gold += eco().skipGold;
      r.pending = null;
      return St.advance();
    },

    // 다음 노드로. 마지막 노드였으면 클리어
    advance: function () {
      var r = St.data.run;
      r.col++;
      r.shop = null;
      r.upgrades = 0;
      r.purges = 0;
      r.dups = 0;
      if (r.col >= r.map.length) return St.clearStage();
      St.autoPick();
      St.save();
      return null;
    },

    // ================= 휴식·상점 =================
    // 휴식: 회복(동료 전원 35%) 또는 강화(카드 1장) 중 하나
    rest: function () {
      var r = St.data.run;
      if (St.mods().noRestHeal) return St.advance();
      St.healAll(St.restPct());
      return St.advance();
    },
    restPct: function () { var a = St.ascMods(); return a.restPct != null ? a.restPct : eco().restPct; },
    restUpgrade: function () {
      St.data.run.upgrades = 1;
      St.save();
    },
    restPurgeStart: function () {
      St.data.run.purges = 1;
      St.save();
    },
    healAll: function (pct) {
      var r = St.data.run;
      St.living().forEach(function (id) {
        var max = St.maxHp(id);
        if (r.hp[id] != null) r.hp[id] = Math.min(max, r.hp[id] + Math.floor(max * pct));
      });
    },

    openShop: function () {
      var r = St.data.run;
      if (!r.shop) {
        r.shop = { cards: St.rollCards(eco().shopSize, 'shop', r.stage), sold: [], healed: false, relic: St.rollRelic('shop'), relicSold: false };
        r.shop.items = []; r.shop.itemSold = [];
        for (var ii = 0; ii < D.itemEconomy.shop; ii++) r.shop.items.push(St.rollItem());
        St.save();
      }
      return r.shop;
    },
    price: function (id) {
      var base = D.relicById[id] ? D.relicEconomy.price[D.relicById[id].rarity] : eco().price[D.cardById[id].rarity];
      return Math.round(base * (St.mods().shopPriceMult || 1) * St.ascMods().shopPriceMult);
    },
    buyRelic: function () {
      var d = St.data, s = d.run.shop;
      if (!s || !s.relic || s.relicSold) return false;
      var p = St.price(s.relic);
      if (d.gold < p) return false;
      d.gold -= p;
      s.relicSold = true;
      St.addRelic(s.relic);
      St.save();
      return true;
    },
    buy: function (id) {
      var d = St.data, s = d.run.shop, p = St.price(id);
      if (!s || s.cards.indexOf(id) < 0 || s.sold.indexOf(id) >= 0 || d.gold < p || St.inRunDeck(id)) return false;
      d.gold -= p;
      s.sold.push(id);
      St.gainCard(id);
      St.save();
      return true;
    },
    shopHeal: function () {
      var d = St.data, s = d.run.shop;
      if (!s || s.healed || d.gold < eco().healCost) return false;
      d.gold -= eco().healCost;
      s.healed = true;
      St.living().forEach(function (id) {
        var max = St.maxHp(id);
        if (d.run.hp[id] != null) d.run.hp[id] = Math.min(max, d.run.hp[id] + Math.floor(max * eco().healPct));
      });
      St.save();
      return true;
    },
    shopRefresh: function () {
      var d = St.data, s = d.run.shop;
      if (!s || d.gold < eco().refreshCost) return false;
      d.gold -= eco().refreshCost;
      s.cards = St.rollCards(eco().shopSize, 'shop', d.run.stage);
      s.sold = [];
      if (!s.relicSold) s.relic = St.rollRelic('shop');
      St.save();
      return true;
    },
    leaveShop: function () {
      St.data.run.shop = null;
      return St.advance();
    },

    // ================= 이벤트 =================
    eventDef: function () { var n = St.node(); return n && n.event ? D.eventById[n.event] : null; },
    canChoose: function (ch) { return !ch.need || !ch.need.gold || St.data.gold >= ch.need.gold; },
    // 선택지를 고르고 결과를 노드에 저장한다(새로고침해도 결과 화면이 이어진다)
    eventChoose: function (i) {
      var node = St.node(), ev = St.eventDef();
      if (!ev || node.result) return null;
      var ch = ev.choices[i];
      if (!ch || !St.canChoose(ch)) return null;
      var res = node.result = { choice: i, log: [], text: ch.text || '', cards: null, fight: false };
      ch.effects.forEach(function (op) { St.eventOp(op, res); });
      St.save();
      return res;
    },
    partyAlive: function () {
      var d = St.data, r = d.run;
      return d.party.filter(function (id) { return r.hp[id] != null; });
    },
    eventOp: function (op, res) {
      var d = St.data, r = d.run, party = St.partyAlive(), node = St.node(), def = St.stageDef(r.stage);
      var name = function (id) { return charDef(id).name; };
      switch (op.op) {
        case 'gold':
          d.gold = Math.max(0, d.gold + op.value);
          res.log.push('골드 ' + (op.value > 0 ? '+' : '') + op.value);
          break;
        case 'hp': {
          var who = op.who === 'leader' ? party.slice(0, 1) : op.who === 'random' ? [G.rng.pick(party)] :
            op.who === 'all' ? Object.keys(r.hp) : party;
          var sum = 0;
          who.forEach(function (id) {
            var max = St.maxHp(id), n = op.pct != null ? Math.floor(max * Math.abs(op.pct)) : Math.abs(op.value);
            var loss = (op.pct != null ? op.pct : op.value) < 0;
            r.hp[id] = loss ? Math.max(1, r.hp[id] - n) : Math.min(max, r.hp[id] + n);
            sum = n;
          });
          var label = op.who === 'all' ? '동료 전원' : op.who === 'party' ? '파티 전원' : name(who[0]);
          var sign = (op.pct != null ? op.pct : op.value) < 0 ? '-' : '+';
          res.log.push(label + ' 체력 ' + sign + (op.pct != null ? Math.round(Math.abs(op.pct) * 100) + '%' : sum));
          break;
        }
        case 'card': {
          var id = St.rollEventCards(1, op.minRarity, op.rarity)[0];
          if (id) { St.gainCard(id); res.log.push('카드 획득: ' + D.cardById[id].name + ' (' + G.RARITY_NAME[D.cardById[id].rarity] + ')'); res.gotCard = id; }
          else { d.gold += 30; res.log.push('얻을 카드가 없어 골드 +30'); }
          break;
        }
        case 'cardChoice':
          res.cards = St.rollEventCards(op.count, op.minRarity);
          if (!res.cards.length) { res.cards = null; d.gold += 30; res.log.push('얻을 카드가 없어 골드 +30'); }
          break;
        case 'relic': {
          var rid = St.rollRelicPool(op.pool);
          if (rid) { St.addRelic(rid); res.relic = rid; res.log.push('유물 획득: ' + D.relicById[rid].name); }
          else { d.gold += 50; res.log.push('얻을 유물이 없어 골드 +50'); }
          break;
        }
        case 'upgrade':
          r.upgrades = (r.upgrades || 0) + op.count;
          res.log.push('카드 ' + op.count + '장 강화');
          break;
        case 'buff':
          d.buffs.push({ name: op.name, battles: op.battles, effects: op.effects });
          res.log.push(op.name + ' (다음 전투 ' + op.battles + '번)');
          break;
        case 'curse':
          d.buffs.push({ name: '방해 카드', battles: op.battles, card: op.card, count: op.count });
          res.log.push('다음 전투 덱에 ' + D.cardById[op.card].name + ' ' + op.count + '장');
          break;
        case 'mirror': {
          var m = G.rng.pick(party);
          d.buffs.push({ name: '거울 속 그림자', battles: 1, mirror: m });
          res.log.push('다음 전투에 ' + D.monsterById['shadow_' + m].name + ' 등장');
          break;
        }
        case 'item': {
          var iid = op.id || (op.rarity ? (G.rng.pick(D.items.filter(function (x) { return x.rarity === op.rarity; })) || {}).id : null) || St.rollItem();
          if (St.addItem(iid)) { res.log.push('소모품 획득: ' + D.itemById[iid].name); res.item = iid; }
          else { d.gold += 25; res.log.push('소모품 칸이 가득 차 골드 +25'); }
          break;
        }
        case 'purge':
          r.purges = (r.purges || 0) + 1;
          res.log.push('스테이지 덱에서 카드 1장 빼기');
          break;
        case 'dup':
          r.dups = (r.dups || 0) + 1;
          res.log.push('스테이지 덱의 카드 1장 복제');
          break;
        case 'exp':
          party.forEach(function (id) { St.growthOf(id).exp += op.value; });
          res.log.push('파티 전원 경험치 +' + op.value);
          break;
        case 'bond': {
          var pairs = St.partyPairs(party);
          pairs.forEach(function (k) { d.bonds[k] = (d.bonds[k] || 0) + op.value; });
          res.log.push(pairs.length ? '파티 짝마다 친밀도 +' + op.value : '친밀도를 나눌 동료가 없다');
          break;
        }
        case 'chance': {
          var p = op.crit ? Math.min(0.95, Math.max.apply(null, party.map(function (id) { return charDef(id).crit; })) * op.crit) : op.p;
          var ok = G.rng.chance(p);
          res.roll = { p: p, ok: ok };
          res.text = (res.text ? res.text + ' ' : '') + (ok ? op.thenText : op.elseText);
          (ok ? op.then : op.else || []).forEach(function (o) { St.eventOp(o, res); });
          break;
        }
        case 'fight':
          node.fight = { kind: 'elite', monsters: [def.midElite || def.boss] };
          res.fight = true;
          res.log.push('정예 전투');
          break;
        case 'cutNext': {
          var cur = St.node();
          if (cur && cur.next && cur.next.length > 1) {
            cur.next.splice(G.rng.int(0, cur.next.length - 1), 1);
            res.log.push('앞으로 이어진 통로 하나가 무너져 막혔다');
          } else res.log.push('앞으로 난 통로는 원래 하나뿐이다');
          break;
        }
      }
    },
    // 미보유 카드 count장. rarity 를 주면 그 등급(없으면 가까운 등급), minRarity 는 그 이상
    rollEventCards: function (count, minRarity, rarity) {
      var out = [];
      for (var i = 0; i < count; i++) {
        var pool = St.candidatePool(out), at = [];
        if (rarity) {
          var want = rarityIdx(rarity);
          for (var k = 0; k < 5 && !at.length; k++) {
            [want - k, want + k].forEach(function (ri) { if (!at.length) at = pool.filter(function (c) { return rarityIdx(c.rarity) === ri; }); });
          }
        } else at = pool.filter(function (c) { return rarityIdx(c.rarity) >= rarityIdx(minRarity || 'common'); });
        if (!at.length) at = pool;
        if (!at.length) break;
        out.push(St.pickCandidate(at).id);
      }
      return out;
    },
    rollRelicPool: function (pool) {
      var ok = { common: ['common'], low: ['common', 'uncommon'], any: ['common', 'uncommon', 'rare'] }[pool] || ['common'];
      var free = D.relics.filter(function (r) { return !St.hasRelic(r.id) && ok.indexOf(r.rarity) >= 0; });
      return free.length ? G.rng.pick(free).id : null;
    },
    eventTakeCard: function (id) {
      var res = St.node().result;
      if (!res || !res.cards) return false;
      if (id && res.cards.indexOf(id) >= 0) { St.gainCard(id); res.log.push('카드 획득: ' + D.cardById[id].name); }
      res.cards = null;
      St.save();
      return true;
    },
    // 이벤트를 마친다(전투가 남았으면 UI 가 전투를 시작한다)
    eventFinish: function () { return St.advance(); },

    // ================= 성장·친밀도(9단계에서 쓴다) =================
    growthOf: function (id) {
      var g = St.data.growth = St.data.growth || {};
      return (g[id] = g[id] || { exp: 0, traits: [] });
    },

    levelOf: function (id) {
      var exp = St.growthOf(id).exp, lv = 0;
      D.growth.levels.forEach(function (t) { if (exp >= t) lv++; });
      return lv;
    },
    // 다음 레벨까지: { level, exp, need(다음 문턱, 최고 레벨이면 null) }
    expInfo: function (id) {
      var lv = St.levelOf(id);
      return { level: lv, exp: St.growthOf(id).exp, need: D.growth.levels[lv] || null, prev: lv ? D.growth.levels[lv - 1] : 0 };
    },
    traitMods: function (id) {
      var g = St.growthOf(id), list = D.traits[id] || [];
      return g.traits.map(function (pick, lv) { return list[lv] && list[lv][pick] ? list[lv][pick].mods : null; }).filter(Boolean);
    },
    maxHp: function (id) {
      var add = 0;
      St.traitMods(id).forEach(function (m) { add += m.maxHp || 0; });
      return charDef(id).hp + add;
    },
    // 레벨업했는데 아직 특성을 고르지 않은 동료(합류한 순서대로)
    pendingTrait: function () {
      var d = St.data;
      for (var i = 0; i < d.characters.length; i++) {
        var id = d.characters[i], g = St.growthOf(id), lv = St.levelOf(id);
        if (g.traits.length < lv && D.traits[id]) return { id: id, level: g.traits.length + 1, options: D.traits[id][g.traits.length] };
      }
      return null;
    },
    chooseTrait: function (id, pick) {
      var g = St.growthOf(id), lv = St.levelOf(id);
      if (g.traits.length >= lv || (pick !== 0 && pick !== 1)) return false;
      var opt = D.traits[id][g.traits.length][pick];
      g.traits.push(pick);
      // 최대 체력이 늘면 지금 체력도 같이 는다
      var r = St.data.run;
      if (opt.mods.maxHp && r && r.hp[id] != null) r.hp[id] += opt.mods.maxHp;
      St.save();
      return true;
    },
    // 친밀도 단계(0~3)
    bondLevel: function (key) {
      var v = St.data.bonds[key] || 0, lv = 0;
      D.bondLevels.forEach(function (t) { if (v >= t) lv++; });
      return lv;
    },
    // 합동기: 친밀도 3단계인 짝이 둘 다 편성되어 있으면 전투 덱에 1장
    duoDeck: function (party) {
      return St.partyPairs(party).filter(function (k) { return St.bondLevel(k) >= 3 && D.duoByPair[k]; })
        .map(function (k) { return D.duoByPair[k].id; });
    },
    // 휴식 노드의 대화: 편성된 짝 중 볼 대화가 남은 짝(친밀도가 가장 높은 짝 먼저)
    pendingTalk: function () {
      var d = St.data, r = d.run, node = St.node();
      if (!r || !node || node.type !== 'rest' || node.talked) return null;
      d.talks = d.talks || {};
      var best = null;
      St.partyPairs(St.partyAlive()).forEach(function (k) {
        var seen = d.talks[k] || 0, lines = D.dialogues[k];
        if (!lines || seen >= lines.length || (d.bonds[k] || 0) < D.bondLevels[seen]) return;
        if (!best || (d.bonds[k] || 0) > (d.bonds[best.key] || 0)) best = { key: k, index: seen, lines: lines[seen] };
      });
      return best;
    },
    finishTalk: function (key) {
      var d = St.data, node = St.node();
      if (node) node.talked = true;
      if (key) {
        d.talks[key] = (d.talks[key] || 0) + 1;
        d.bonds[key] = (d.bonds[key] || 0) + D.bondGain.talk;
      }
      St.save();
    },

    // 짝 이름: 캐릭터 순서대로 'kai+lyra'
    pairKey: function (a, b) {
      var order = D.characters.map(function (c) { return c.id; });
      return order.indexOf(a) < order.indexOf(b) ? a + '+' + b : b + '+' + a;
    },
    partyPairs: function (party) {
      var out = [];
      for (var i = 0; i < party.length; i++) for (var j = i + 1; j < party.length; j++) out.push(St.pairKey(party[i], party[j]));
      return out;
    },

    // ================= 클리어·합류 =================
    clearStage: function () {
      var d = St.data, n = d.run.stage, def = St.stageDef(n);
      if (G.Profile) G.Profile.stage({ stage: n });
      if (d.flags.daily) return { stage: n, daily: St.finishDaily(true) };
      var first = n > d.clearedStage;
      var joined = null;
      if (first) d.clearedStage = n;
      if (first && def.join && d.characters.indexOf(def.join) < 0) {
        joined = def.join;
        d.characters.push(def.join);
        D.cards.forEach(function (c) { if (c.basic && c.owner === def.join && !St.owns(c.id)) d.cards.push(c.id); });
        d.decks[def.join] = St.starterDeck(def.join);
        if (d.party.length < 3) d.party.push(def.join);
      }
      var ending = n === D.stages.length;
      if (ending) {
        d.ascension = d.ascension || { current: 0, best: 0 };
        d.ascension.best = Math.max(d.ascension.best || 0, d.ascension.current || 0);
        if (G.Profile) G.Profile.ending({ mode: d.mode, asc: St.ascLevel() });
      }
      d.run = null;
      St.save();
      return { stage: n, first: first, joined: joined, ending: ending, ascension: St.ascLevel() };
    },

    // ================= 26단계: 시작 선물 =================
    applyBoon: function (id) {
      var b = D.boonById[id], d = St.data;
      if (!b || !d) return false;
      var e = b.effect;
      if (e.gold) d.gold += e.gold;
      if (e.items) (e.items === 'random3' ? [St.rollItem(), St.rollItem(), St.rollItem()] : e.items).forEach(function (it) { St.addItem(it); });
      if (e.relic) {
        var free = D.relics.filter(function (r) { return r.rarity === e.relic && !St.hasRelic(r.id); });
        if (free.length) St.addRelic(G.rng.pick(free).id);
      }
      if (e.exp) St.growthOf(d.party[0]).exp += e.exp;
      if (e.upgrade) {
        var pool = (d.decks[d.party[0]] || []).concat(d.decks.common || []).filter(function (cid) { return !d.upgraded[cid]; });
        G.rng.shuffle(pool).slice(0, e.upgrade).forEach(function (cid) { d.upgraded[cid] = 1; });
      }
      d.flags.boon = id;
      St.save();
      return true;
    },

    // ================= 26단계: 오늘의 원정 =================
    // 날짜(이 기기의 날짜)로 정한 시드로 스테이지 하나 · 동료 셋 · 카드 · 유물 · 규칙. 같은 날에는 지도도 같다. 지면 끝나고 점수를 남긴다
    dailyKey: function (date) {
      var t = date || new Date(), p = function (v) { return (v < 10 ? '0' : '') + v; };
      return t.getFullYear() + p(t.getMonth() + 1) + p(t.getDate());
    },
    dailySeed: function (key) {
      var h = 2166136261;
      for (var i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
      return h || 1;
    },
    dailyMods: function (ids) {
      var all = D.daily.hard.concat(D.daily.good);
      return (ids || []).map(function (id) { return all.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
    },
    // 그날의 구성(새 게임 데이터를 만들기 전에 화면에 보여 준다)
    dailyPlan: function (key) {
      key = key || St.dailyKey();
      var seed = St.dailySeed(key);
      G.rng.seed(seed);
      var stage = G.rng.pick(D.daily.stages);
      var party = G.rng.shuffle(D.characters.map(function (c) { return c.id; })).slice(0, 3);
      var hard = G.rng.shuffle(D.daily.hard.slice()).slice(0, 2).map(function (x) { return x.id; });
      var good = G.rng.pick(D.daily.good).id;
      G.rng.seed(Date.now() >>> 0);
      return { key: key, seed: seed, stage: stage, party: party, mods: hard.concat([good]), theme: St.stageDef(stage).theme };
    },
    isDaily: function () { return !!(St.data && St.data.flags && St.data.flags.daily); },
    // 오늘의 원정 저장 칸('daily')에 새 데이터를 만들고 그 스테이지를 시작한다
    newDaily: function (key) {
      var plan = St.dailyPlan(key), stage = plan.stage;
      G.Save.use('daily');
      var d = St.newGame('normal');
      G.rng.seed(plan.seed + 1);
      d.characters = plan.party.slice(); d.party = plan.party.slice();
      d.cards = [];
      var owners = plan.party.concat(['common']);
      D.cards.forEach(function (c) { if (c.basic && owners.indexOf(c.owner) >= 0) d.cards.push(c.id); });
      owners.forEach(function (o) {
        var pool = D.cards.filter(function (c) { return c.owner === o && !c.basic && !c.duo && (stage >= 6 || c.rarity !== 'legendary'); });
        G.rng.shuffle(pool).slice(0, (o === 'common' ? 2 : 3) + Math.floor(stage / 2)).forEach(function (c) { d.cards.push(c.id); });
      });
      d.decks = {};
      owners.forEach(function (o) { d.decks[o] = St.autoBuild(o); });
      var lv = Math.min(D.growth.levels.length, 1 + Math.floor(stage / 2));
      plan.party.forEach(function (id) {
        var traits = [];
        for (var i = 0; i < lv; i++) traits.push(G.rng.int(0, 1));
        d.growth[id] = { exp: D.growth.levels[lv - 1], traits: traits };
      });
      for (var k = 0; k < 1 + Math.floor(stage * 0.7); k++) St.addRelic(St.rollRelic('shop'));
      St.addItem(St.rollItem());
      d.gold = 80 + stage * 20;
      d.clearedStage = stage - 1;
      d.flags.tutorialDone = true;
      d.story.seen = ['prologue'];
      (D.story || []).forEach(function (ch) { ch.scenes.forEach(function (sc) { d.story.seen.push(sc.id); }); });
      d.flags.daily = { key: plan.key, stage: stage, mods: plan.mods, wins: 0, elites: 0 };
      if (G.Profile) G.Profile.dailyStart();
      G.rng.seed(plan.seed + 2);   // 지도는 그날 모두 같다
      St.startStage(stage);
      G.rng.seed(Date.now() >>> 0);
      return d;
    },
    dailyScore: function (cleared) {
      var d = St.data, f = d.flags.daily, sc = D.daily.score, r = d.run, hp = 0, max = 0;
      if (cleared && r) d.party.forEach(function (id) { hp += Math.max(0, r.hp[id] || 0); max += St.maxHp(id); });
      var parts = { win: f.wins * sc.win, elite: f.elites * sc.elite, clear: cleared ? sc.clear : 0,
        hp: cleared && max ? Math.round(hp / max * 100 * sc.hpPct) : 0, gold: Math.round(d.gold * sc.gold) };
      var sum = 0;
      Object.keys(parts).forEach(function (k) { sum += parts[k]; });
      return { parts: parts, mult: 1 + f.stage * sc.stageMult, score: Math.round(sum * (1 + f.stage * sc.stageMult)) };
    },
    // 끝: 점수를 프로필에 남기고 오늘의 원정 저장을 지운다. 반환: { score, parts, mult, cleared, best, attempts, record, … }
    finishDaily: function (cleared) {
      var d = St.data, f = d.flags.daily, s = St.dailyScore(cleared);
      var res = { key: f.key, score: s.score, parts: s.parts, mult: s.mult, cleared: cleared, stage: f.stage, party: d.party.slice(), mods: f.mods.slice() };
      var rec = G.Profile ? G.Profile.dailyDone(res) : {};
      Object.assign(res, rec);
      G.Save.clear('daily');
      St.data = null;
      return res;
    },

    // ================= 스토리(13단계) =================
    storySeen: function (id) { return !!St.data && (St.data.story.seen || []).indexOf(id) >= 0; },
    markStory: function (id) {
      var sv = St.data.story;
      if (sv.seen.indexOf(id) < 0) { sv.seen.push(id); St.save(); }
    },
    // n 장의 kind 장면 중 아직 보지 않은 것(승천 장면은 매번 보여 준다)
    sceneFor: function (kind, n) {
      var ch = (D.story || []).filter(function (c) { return c.n === n; })[0];
      if (!ch && kind === 'ascend') ch = (D.story || [])[(D.story || []).length - 1];
      if (!ch) return null;
      var sc = ch.scenes.filter(function (x) { return x.kind === kind; })[0];
      if (!sc || (kind !== 'ascend' && St.storySeen(sc.id))) return null;
      return sc;
    },
    storyProgress: function () {
      var all = [];
      (D.story || []).forEach(function (c) { c.scenes.forEach(function (x) { if (x.kind !== 'ascend') all.push(x.id); }); });
      var seen = all.filter(function (id) { return St.storySeen(id); }).length;
      return { seen: seen, total: all.length, pct: all.length ? Math.round(seen / all.length * 100) : 0 };
    },

    // ================= 디버그 =================
    debugGold: function (n) { St.data.gold += n; St.save(); },
    debugHealAll: function () {
      var r = St.data.run;
      if (!r) return;
      St.living().forEach(function (id) { r.hp[id] = St.maxHp(id); });
      St.save();
    }
  };
})();
