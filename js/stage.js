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

    newGame: function () {
      var d = {
        version: G.Save.VERSION, gold: 0, clearedStage: 0, run: null,
        characters: ['kai'], party: ['kai'], cards: [], decks: {}, relics: [], upgraded: [],
        growth: {}, bonds: {}, talks: {}, ascension: { current: 0, best: 0 }, eventsSeen: [], buffs: [],
        codex: { monsters: {} }, flags: { tutorialDone: false }, story: { seen: [] }
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

    // ================= 승천(10단계) =================
    ascLevel: function () { var a = St.data && St.data.ascension; return a ? a.current || 0 : 0; },
    // 1단계부터 lv 단계까지의 규칙을 합친다: 비율은 더하고, 배율은 곱하고, 나머지는 높은 단계 값
    ascMods: function (lv) {
      if (lv == null) lv = St.ascLevel();
      var m = { hpMult: 0, bossHpMult: 0, finalHpMult: 0, dmgMult: 0, triggerStr: 0, affixMult: 1, shopPriceMult: 1, goldMult: 1, doomMult: 1 };
      var ADD = { hpMult: 1, bossHpMult: 1, finalHpMult: 1, dmgMult: 1, triggerStr: 1 }, MUL = { affixMult: 1, shopPriceMult: 1, goldMult: 1, doomMult: 1 };
      var per = D.ascensionScale || {};
      m.hpMult += (per.hpMult || 0) * lv;
      m.dmgMult += (per.dmgMult || 0) * lv;
      (D.ascension || []).forEach(function (a) {
        if (a.n > lv) return;
        Object.keys(a.mods).forEach(function (k) {
          var v = a.mods[k];
          if (ADD[k]) m[k] += v; else if (MUL[k]) m[k] *= v; else m[k] = v;
        });
      });
      return m;
    },
    // 전투에 넘길 적 강화 보정: 스테이지 난이도(data/stages.js 의 difficulty) + 승천
    enemyMods: function (stage) {
      var a = St.ascMods(), dif = D.difficulty || {}, curve = D.ascensionCurve;
      var hp = dif.hp ? dif.hp[stage - 1] || 1 : 1, dmg = dif.dmg ? dif.dmg[stage - 1] || 1 : 1;
      if (St.ascLevel() > 0 && curve) {
        hp = curve.hp * (1 + curve.hpPerStage * (stage - 1));
        dmg = curve.dmg * (1 + curve.dmgPerStage * (stage - 1));
      }
      return { hpMult: a.hpMult + hp - 1, bossHpMult: a.bossHpMult, finalHpMult: a.finalHpMult, dmgMult: a.dmgMult + dmg - 1,
        triggerStr: a.triggerStr, doomMult: a.doomMult };
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

    // 전투 덱: 강화한 카드는 'K01+' 로 바꿔 넣는다
    battleDeck: function (party) {
      var d = St.data, ids = [];
      party.concat(['common']).forEach(function (o) { ids = ids.concat(d.decks[o] || []); });
      return ids.map(function (id) { return G.Upgrade.idOf(id, d.upgraded); });
    },

    // ================= 카드 강화 =================
    isUpgraded: function (id) { return (St.data.upgraded || []).indexOf(id) >= 0; },
    // 보유 카드의 지금 모습(강화했으면 강화 카드)
    cardDef: function (id) { return St.isUpgraded(id) ? D.cardById[id + '+'] : D.cardById[id]; },
    upgradable: function () {
      return St.data.cards.filter(function (id) { return !St.isUpgraded(id); });
    },
    // 강화 기회(휴식·이벤트)를 쓴다
    upgradeCard: function (id) {
      var d = St.data, r = d.run;
      if (!r || !r.upgrades || !St.owns(id) || St.isUpgraded(id)) return false;
      d.upgraded.push(id);
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
      d.characters.forEach(function (id) { hp[id] = St.maxHp(id); });
      var battles = 0;
      var map = def.cols.map(function (col, ci) {
        var last = ci === def.cols.length - 1;
        return col.map(function (type) { return St.makeNode(def, type, last, battles++ === 0); });
      });
      d.run = { stage: n, col: 0, path: [], map: map, hp: hp, pending: null, shop: null, upgrades: 0, replay: n <= d.clearedStage };
      St.autoPick();
      St.save();
      return d.run;
    },

    makeNode: function (def, type, last, first) {
      var node = { type: type };
      if (type === 'battle') node.monsters = G.rng.pick(first ? def.easy : def.hard).slice();
      else if (type === 'elite' && !last) {
        if (def.midElite) node.monsters = [def.midElite];
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
      var free = D.events.filter(function (e) { return seen.indexOf(e.id) < 0; });
      if (!free.length) { seen.length = 0; free = D.events.slice(); }
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
    choices: function () { var r = St.data.run; return r ? r.map[r.col] : []; },
    // 갈림길에서 노드를 고른다(고르면 바꿀 수 없다)
    choose: function (i) {
      var r = St.data.run;
      if (!r || r.path[r.col] != null || !r.map[r.col][i]) return false;
      r.path[r.col] = i;
      St.save();
      return true;
    },
    autoPick: function () {
      var r = St.data.run;
      if (r && r.col < r.map.length && r.map[r.col].length === 1) r.path[r.col] = 0;
    },

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
        startEffects: startEffects,
        deck: St.battleDeck(party).concat(St.duoDeck(party), extra),
        gold: d.gold,
        boss: type !== 'battle'
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
      battle.heroes.forEach(function (h) {
        var hp = h.dead ? Math.max(1, Math.floor(h.maxHp * downed)) : h.hp;
        if (winHeal) hp = Math.min(h.maxHp, hp + winHeal);
        r.hp[h.id] = hp;
      });
      // 성장·친밀도(9단계): 편성된 동료는 쓰러져 있어도 경험치를 받고, 함께 이긴 짝은 친밀도 +1
      var fightType = node.fight ? node.fight.kind : node.type;
      var exp = (D.growth.exp[fightType] || D.growth.exp.battle);
      battle.heroes.forEach(function (h) { St.growthOf(h.id).exp += exp; });
      St.partyPairs(battle.heroes.map(function (h) { return h.id; })).forEach(function (k) { d.bonds[k] = (d.bonds[k] || 0) + D.bondGain.battle; });
      St.lastExp = { amount: exp, heroes: battle.heroes.map(function (h) { return h.id; }) };
      battle.monsters.forEach(function (m) { St.markSeen([m.id]); });
      battle.kills.forEach(function (id) { d.codex.monsters[id].kills++; });
      d.gold = Math.max(0, d.gold + battle.goldDelta);
      // 이벤트 효과는 이긴 전투 수만큼 줄어든다
      d.buffs = (d.buffs || []).filter(function (b) { return --b.battles > 0; });
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
      if (kind === 'elite') { p.relic = St.rollRelic('elite'); St.addRelic(p.relic); }
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

    rewardCount: function () { return St.ascMods().rewardCards || 3; },
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
      if (cardId && r.pending.cards.indexOf(cardId) >= 0) St.addCard(cardId);
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
    healAll: function (pct) {
      var r = St.data.run;
      St.data.characters.forEach(function (id) {
        var max = St.maxHp(id);
        if (r.hp[id] != null) r.hp[id] = Math.min(max, r.hp[id] + Math.floor(max * pct));
      });
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
        var max = St.maxHp(id);
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
          if (id) { St.addCard(id); res.log.push('카드 획득: ' + D.cardById[id].name + ' (' + G.RARITY_NAME[D.cardById[id].rarity] + ')'); res.gotCard = id; }
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
          var next = r.map[r.col + 1];
          if (next && next.length > 1) {
            var cut = next.splice(G.rng.int(0, next.length - 1), 1)[0];
            res.log.push('다음 갈림길의 ' + D.NODE_NAME[cut.type] + ' 길이 사라졌다');
          } else res.log.push('다음 길은 원래 하나뿐이다');
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
        out.push(G.rng.pick(at).id);
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
      if (id && res.cards.indexOf(id) >= 0) { St.addCard(id); res.log.push('카드 획득: ' + D.cardById[id].name); }
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
      var ending = n === D.stages.length;
      if (ending) {
        d.ascension = d.ascension || { current: 0, best: 0 };
        d.ascension.best = Math.max(d.ascension.best || 0, d.ascension.current || 0);
      }
      d.run = null;
      St.save();
      return { stage: n, first: first, joined: joined, ending: ending, ascension: St.ascLevel() };
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
      St.data.characters.forEach(function (id) { r.hp[id] = St.maxHp(id); });
      St.save();
    }
  };
})();
