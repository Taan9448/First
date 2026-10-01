// stage.js — 진행 상태: 새 게임, 스테이지·노드 진행, 보상, 상점, 휴식, 합류, 덱 관리
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

    newGame: function () {
      var d = {
        version: G.Save.VERSION, gold: 0, clearedStage: 0, run: null,
        characters: ['kai'], party: ['kai'], cards: [], decks: {}, relics: [],
        codex: { monsters: {} }, flags: { tutorialDone: false }
      };
      St.data = d;
      D.cards.forEach(function (c) { if (c.basic && (c.owner === 'kai' || c.owner === 'common')) d.cards.push(c.id); });
      d.decks.kai = St.ownedOf('kai');
      d.decks.common = St.autoBuild('common');
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
      if (kind === 'boss') return G.rng.pick(free.filter(function (r) { return r.rarity === 'boss'; })) || null;
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

    // ================= 카드·덱 =================
    owns: function (id) { return St.data.cards.indexOf(id) >= 0; },
    ownedOf: function (owner) {
      return St.data.cards.filter(function (id) { return D.cardById[id].owner === owner; });
    },

    // 카드를 얻는다. 해당 덱에 자리가 있으면 자동으로 넣는다
    addCard: function (id) {
      var d = St.data;
      if (St.owns(id)) return false;
      d.cards.push(id);
      var owner = D.cardById[id].owner;
      d.decks[owner] = d.decks[owner] || [];
      if (d.decks[owner].length < eco().deckMax) d.decks[owner].push(id);
      return true;
    },

    // 자동 구성: 등급이 높은 카드부터 최대 autoBuildSize장, 공격 카드는 최소 3장
    autoBuild: function (owner) {
      var list = St.ownedOf(owner).map(function (id) { return D.cardById[id]; });
      list.sort(function (a, b) { return rarityIdx(b.rarity) - rarityIdx(a.rarity) || (a.id < b.id ? -1 : 1); });
      var pick = list.slice(0, eco().autoBuildSize);
      var rest = list.slice(eco().autoBuildSize);
      var attacks = function () { return pick.filter(function (c) { return c.type === 'attack'; }).length; };
      while (attacks() < 3) {
        var a = rest.filter(function (c) { return c.type === 'attack'; })[0];
        var drop = pick.slice().reverse().filter(function (c) { return c.type !== 'attack'; })[0];
        if (!a || !drop) break;
        pick.splice(pick.indexOf(drop), 1, a);
        rest.splice(rest.indexOf(a), 1);
      }
      return pick.map(function (c) { return c.id; });
    },

    battleDeck: function (party) {
      var d = St.data, ids = [];
      party.concat(['common']).forEach(function (o) { ids = ids.concat(d.decks[o] || []); });
      return ids;
    },

    setParty: function (ids) {
      var d = St.data;
      ids = ids.filter(function (id) { return d.characters.indexOf(id) >= 0; }).slice(0, 3);
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
      d.characters.forEach(function (id) { hp[id] = charDef(id).hp; });
      var battles = 0;
      var nodes = def.nodes.map(function (type) {
        var node = { type: type };
        if (type === 'battle') node.monsters = G.rng.pick(battles++ === 0 ? def.easy : def.hard).slice();
        else if (type === 'midboss') node.monsters = [def.midboss];
        else if (type !== 'rest') node.monsters = [def.boss];
        return node;
      });
      d.run = { stage: n, node: 0, hp: hp, nodes: nodes, pending: null, shop: null, replay: n <= d.clearedStage };
      St.save();
      return d.run;
    },

    abandon: function () { St.data.run = null; St.save(); },
    node: function () { var r = St.data.run; return r ? r.nodes[r.node] : null; },

    // ================= 전투 =================
    battleOptions: function () {
      var d = St.data, r = d.run, node = St.node();
      var party = d.party.filter(function (id) { return r.hp[id] != null; });
      // 적 변이: 일반 전투의 몬스터마다 확률로 접두어. 처음 들어갈 때 정해 저장한다(다시 해도 같음)
      if (!node.affixes) {
        var ac = D.affixChance, chance = ac.from + (ac.to - ac.from) * (r.stage - 1) / 9;
        var keys = Object.keys(D.affixes);
        node.affixes = node.monsters.map(function (id) {
          return node.type === 'battle' && D.monsterById[id].rank === 'normal' && G.rng.chance(chance) ? G.rng.pick(keys) : null;
        });
        St.save();
      }
      var affixes = node.affixes.map(function (a) { return D.affixes[a] ? a : null; });
      return {
        title: '스테이지 ' + r.stage + ' · ' + D.NODE_NAME[node.type],
        stage: r.stage, nodeType: node.type,
        party: party.map(function (id) { return { id: id, hp: Math.max(1, r.hp[id]) }; }),
        monsters: node.monsters.slice(),
        affixes: affixes,
        relics: (d.relics || []).slice(),
        deck: St.battleDeck(party),
        gold: d.gold,
        boss: node.type !== 'battle'
      };
    },

    markSeen: function (ids) {
      var m = St.data.codex.monsters;
      ids.forEach(function (id) { m[id] = m[id] || { seen: true, kills: 0 }; m[id].seen = true; });
    },

    // 승리: 체력 반영, 처치 기록, 골드. 반환: { ending } 또는 { reward }
    battleWon: function (battle) {
      var d = St.data, r = d.run, node = St.node(), mods = St.mods();
      var downed = Math.max(eco().downedPct, mods.downedPct || 0);
      battle.heroes.forEach(function (h) {
        var hp = h.dead ? Math.max(1, Math.floor(h.maxHp * downed)) : h.hp;
        if (mods.winHeal) hp = Math.min(h.maxHp, hp + mods.winHeal);
        r.hp[h.id] = hp;
      });
      battle.monsters.forEach(function (m) { St.markSeen([m.id]); });
      battle.kills.forEach(function (id) { d.codex.monsters[id].kills++; });
      d.gold = Math.max(0, d.gold + battle.goldDelta);
      if (node.type === 'final') {
        var info = St.clearStage();
        d.flags.ended = true;
        St.save();
        return { ending: true, clear: info };
      }
      var kind = node.type === 'battle' ? 'battle' : node.type === 'elite' ? 'elite' : 'boss';
      r.pending = St.rollReward(kind);
      var p = r.pending;
      p.gold = Math.round(p.gold * (mods.goldMult || 1)) + (battle.affixKills || 0) * 5;
      if (node.type === 'elite') { p.relic = St.rollRelic('elite'); St.addRelic(p.relic); }
      if (kind === 'boss') p.relicChoice = St.rollRelicChoice(r.stage);
      d.gold += p.gold + p.fill * eco().fillGold;
      St.save();
      return { reward: r.pending };
    },

    // 패배: 스테이지 처음부터 (카드·골드는 유지)
    battleLost: function (battle) {
      battle.monsters.forEach(function (m) { St.markSeen([m.id]); });
      var n = St.data.run.stage;
      return St.startStage(n);
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

    // 아직 없는 카드 중 보유 캐릭터·공용 카드
    candidatePool: function (exclude) {
      var d = St.data;
      return D.cards.filter(function (c) {
        return (c.owner === 'common' || d.characters.indexOf(c.owner) >= 0) && !St.owns(c.id) && exclude.indexOf(c.id) < 0;
      });
    },

    // 등급을 굴리고, 그 등급에 남은 카드가 없으면 한 단계씩 낮춰(그래도 없으면 높여) 찾는다
    rollCards: function (count, kind, stage) {
      var w = St.rarityWeights(kind, stage), out = [];
      var total = w.reduce(function (a, b) { return a + b; }, 0);
      for (var i = 0; i < count; i++) {
        var roll = G.rng.next() * total, r = 0;
        while (r < 4 && roll >= w[r]) { roll -= w[r]; r++; }
        var pool = St.candidatePool(out);
        var order = [];
        for (var k = r; k >= 0; k--) order.push(k);
        for (k = r + 1; k < 5; k++) order.push(k);
        var found = null;
        for (var j = 0; j < order.length && !found; j++) {
          var at = pool.filter(function (c) { return rarityIdx(c.rarity) === order[j]; });
          if (at.length) found = G.rng.pick(at);
        }
        if (!found) break;
        out.push(found.id);
      }
      return out;
    },

    rollReward: function (kind) {
      var g = eco().gold[kind], stage = St.data.run.stage;
      var cards = St.rollCards(3, kind, stage);
      return { kind: kind, gold: G.rng.int(g[0], g[1]), cards: cards, fill: 3 - cards.length };
    },

    // 보상 선택(cardId) 또는 건너뛰기(null). 반환: 스테이지가 끝났으면 클리어 정보
    takeReward: function (cardId) {
      var d = St.data, r = d.run;
      if (!r || !r.pending) return null;
      if (cardId && r.pending.cards.indexOf(cardId) >= 0) St.addCard(cardId);
      else d.gold += eco().skipGold;
      r.pending = null;
      return St.advance();
    },

    // 다음 노드로. 마지막 노드였으면 클리어
    advance: function () {
      var r = St.data.run;
      r.node++;
      if (r.node >= r.nodes.length) return St.clearStage();
      St.save();
      return null;
    },

    // ================= 휴식·상점 =================
    rest: function () {
      var r = St.data.run;
      if (St.mods().noRestHeal) return St.advance();
      St.data.characters.forEach(function (id) {
        var max = charDef(id).hp;
        r.hp[id] = Math.min(max, r.hp[id] + Math.floor(max * eco().restPct));
      });
      return St.advance();
    },

    openShop: function () {
      var r = St.data.run;
      if (!r.shop) {
        r.shop = { cards: St.rollCards(eco().shopSize, 'shop', r.stage), sold: [], healed: false, relic: St.rollRelic('shop'), relicSold: false };
        St.save();
      }
      return r.shop;
    },
    price: function (id) {
      var base = D.relicById[id] ? D.relicEconomy.price[D.relicById[id].rarity] : eco().price[D.cardById[id].rarity];
      return Math.round(base * (St.mods().shopPriceMult || 1));
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
      if (!s || s.cards.indexOf(id) < 0 || s.sold.indexOf(id) >= 0 || d.gold < p || St.owns(id)) return false;
      d.gold -= p;
      s.sold.push(id);
      St.addCard(id);
      St.save();
      return true;
    },
    shopHeal: function () {
      var d = St.data, s = d.run.shop;
      if (!s || s.healed || d.gold < eco().healCost) return false;
      d.gold -= eco().healCost;
      s.healed = true;
      d.characters.forEach(function (id) {
        var max = charDef(id).hp;
        d.run.hp[id] = Math.min(max, d.run.hp[id] + Math.floor(max * eco().healPct));
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

    // ================= 클리어·합류 =================
    clearStage: function () {
      var d = St.data, n = d.run.stage, def = St.stageDef(n);
      var first = n > d.clearedStage;
      var joined = null;
      if (first) d.clearedStage = n;
      if (first && def.join && d.characters.indexOf(def.join) < 0) {
        joined = def.join;
        d.characters.push(def.join);
        D.cards.forEach(function (c) { if (c.basic && c.owner === def.join && !St.owns(c.id)) d.cards.push(c.id); });
        d.decks[def.join] = St.ownedOf(def.join);
        if (d.party.length < 3) d.party.push(def.join);
      }
      d.run = null;
      St.save();
      return { stage: n, first: first, joined: joined, ending: n === D.stages.length };
    },

    // ================= 디버그 =================
    debugGold: function (n) { St.data.gold += n; St.save(); },
    debugHealAll: function () {
      var r = St.data.run;
      if (!r) return;
      St.data.characters.forEach(function (id) { r.hp[id] = charDef(id).hp; });
      St.save();
    }
  };
})();
