// battle.js — 전투 진행, 카드 효과 해석기, 조건 판정, 몬스터 AI
// 화면을 직접 만지지 않는다. 이벤트(fx:*, card:*, battle:*)만 내보내고 그리기는 UI가 맡는다.
(function () {
  'use strict';
  var G = Game, S = G.Status, D = G.Deck, U = G.util;
  var ENERGY = 3, DRAW = 5, MAX_MONSTERS = 4;
  var T = { card: 220, hit: 140, act: 320, between: 260, turn: 300 };
  var uidSeq = 1;

  var TARGET_DEPENDENT = { targetHp: 1, targetBlock: 1, targetHas: 1, targetDebuffKinds: 1, targetIntentAttack: 1 };
  var NEEDS_TARGET = { enemy: 1, ally: 1, downedAlly: 1 };

  // 캐릭터 특성(9단계)을 하나로 합친다: 숫자는 더하고, 배율은 곱하고, 상태 표는 합친다
  function mergeTraits(list) {
    var m = { statusAdd: {}, startStatus: {} };
    (list || []).forEach(function (x) {
      Object.keys(x || {}).forEach(function (k) {
        var v = x[k];
        if (k === 'statusAdd' || k === 'startStatus') Object.keys(v).forEach(function (s) { m[k][s] = (m[k][s] || 0) + v[s]; });
        else if (k === 'selfBlockDmgMult' || k === 'frozenDmgMult') m[k] = (m[k] || 1) * v;
        else if (k === 'everyN' || typeof v === 'boolean') m[k] = v;
        else m[k] = (m[k] || 0) + v;
      });
    });
    return m;
  }
  G.mergeTraits = mergeTraits;

  function makeHero(id, hp, traits) {
    var c = G.Data.characters.filter(function (x) { return x.id === id; })[0];
    if (!c) throw new Error('알 수 없는 캐릭터: ' + id);
    var tm = mergeTraits(traits);
    var max = c.hp + (tm.maxHp || 0);
    var cur = hp == null ? max : Math.min(hp, max);
    return { uid: uidSeq++, side: 'ally', id: id, name: c.name, def: c, maxHp: max, hp: Math.max(0, cur),
      block: 0, status: {}, dead: cur <= 0, crit: c.crit + (tm.critAdd || 0), tm: tm };
  }

  // em: 적 강화 보정(스테이지 난이도 + 승천). hpMult · bossHpMult · finalHpMult
  function makeMonster(id, affix, stage, em) {
    var d = G.Data.monsterById[id];
    if (!d) throw new Error('알 수 없는 몬스터: ' + id);
    var m = { uid: uidSeq++, side: 'enemy', id: id, name: d.name, def: d, maxHp: d.hp, hp: d.hp, block: 0, size: d.size,
      status: Object.assign({}, d.startStatus || {}), dead: false, boss: d.rank === 'boss' || d.rank === 'final',
      pattern: d.pattern.slice(), pIndex: 0, intent: null, intentTarget: null, fired: {}, everyTurn: [], revived: false, affix: null };
    // 스테이지에 맞춰 강해지는 몬스터(거울 속 그림자): 체력 배율과 힘
    if (d.scaleByStage && stage) {
      var sc = d.scaleByStage;
      m.maxHp = m.hp = Math.round(d.hp * (sc.hpBase + sc.hpPer * stage));
      var str = Math.max(0, Math.floor((stage - sc.strFrom) * sc.strPer));
      if (str) m.status.strength = (m.status.strength || 0) + str;
    }
    if (em) {
      var k = 1 + (em.hpMult || 0) + (d.rank !== 'normal' ? em.bossHpMult || 0 : 0) + (d.rank === 'final' ? em.finalHpMult || 0 : 0);
      if (k !== 1) m.maxHp = m.hp = Math.max(1, Math.round(m.maxHp * k));
    }
    var a = affix && G.Data.affixes[affix];
    if (a) {
      m.affix = affix;
      m.name = a.name + ' ' + d.name;
      if (a.hpMult) m.maxHp = m.hp = Math.round(d.hp * a.hpMult);
      if (a.sizeMult) m.size = d.size * a.sizeMult;
      Object.keys(a.startStatus || {}).forEach(function (k) { m.status[k] = (m.status[k] || 0) + a.startStatus[k]; });
      if (a.everyTurn) m.everyTurn = a.everyTurn.slice();
    }
    return m;
  }

  // 유물 보정값을 하나로 합친다: 숫자는 더하고, statusMult·배율은 곱하고, 참/거짓은 OR
  function mergeMods(relics) {
    var m = { statusAdd: {}, statusMult: {}, everyN: [] };
    relics.forEach(function (r) {
      var x = r.mods || {};
      Object.keys(x).forEach(function (k) {
        var v = x[k];
        if (k === 'statusAdd') Object.keys(v).forEach(function (s) { m.statusAdd[s] = (m.statusAdd[s] || 0) + v[s]; });
        else if (k === 'statusMult') Object.keys(v).forEach(function (s) { m.statusMult[s] = (m.statusMult[s] || 1) * v[s]; });
        else if (k === 'everyN') m.everyN.push(v);
        else if (k === 'goldMult' || k === 'shopPriceMult') m[k] = (m[k] || 1) * v;
        else if (k === 'downedPct' || k === 'phoenix') m[k] = Math.max(m[k] || 0, v);
        else if (typeof v === 'boolean') m[k] = m[k] || v;
        else m[k] = (m[k] || 0) + v;
      });
    });
    return m;
  }

  function Battle(opts) {
    this.opts = opts;
    this.heroes = opts.party.map(function (p) { return makeHero(p.id, p.hp, p.traits); });
    var affixes = opts.affixes || [];
    this.em = opts.enemy || {};   // 적 강화 보정(스테이지 난이도 + 승천)
    var em = this.em;
    this.monsters = opts.monsters.map(function (id, i) { return makeMonster(id, affixes[i], opts.stage, em); });
    this.startEffects = opts.startEffects || [];  // 이벤트가 남긴 전투 시작 효과 [{ name, effects }]
    this.relics = (opts.relics || []).map(function (id) { return G.Data.relicById[id]; }).filter(Boolean);
    this.mods = mergeMods(this.relics);
    // 전투 전체에 걸리는 특성(첫 턴 에너지·드로우, N턴마다 에너지)은 유물 보정에 더한다
    var mods = this.mods;
    this.heroes.forEach(function (h) {
      var t = h.tm;
      if (t.firstTurnEnergy) mods.firstTurnEnergy = (mods.firstTurnEnergy || 0) + t.firstTurnEnergy;
      if (t.firstTurnDraw) mods.firstTurnDraw = (mods.firstTurnDraw || 0) + t.firstTurnDraw;
      if (t.everyN) mods.everyN.push(t.everyN);
    });
    this.bonds = opts.bonds || {};
    this.chain = { last: null, count: 0, used: {} };   // 연계(9단계)
    this.phoenixUsed = false;
    this.firstAttackDone = false;
    this.nextDraw = 0;
    this.piles = D.create(opts.deck);
    this.gold = opts.gold || 0;
    this.goldDelta = 0;
    this.energy = 0;
    this.turn = 0;
    this.phase = 'start';
    this.result = null;
    this.powers = [];
    this.busy = false;
    this.cardsThisTurn = 0;
    this.attacksThisTurn = 0;
    this.lastType = null;
    this.discount = 0;
    this.doubleNext = false;
    this.nextEnergy = 0;
    this.teamUndying = 0;
    this.kills = [];
  }

  var P = Battle.prototype;

  // 다시 시작해서 버려진 전투는 이벤트를 내보내지 않는다
  P.emit = function (ev, data) { if (G.Battle.current === this) G.bus.emit(ev, data); };
  P.update = function () { this.emit('battle:update', this); };
  P.alive = function (side) {
    return (side === 'ally' ? this.heroes : this.monsters).filter(function (u) { return !u.dead; });
  };
  P.over = function () { return this.phase === 'over'; };
  P.heroById = function (id) { return this.heroes.filter(function (h) { return h.id === id; })[0] || null; };

  // ================= 흐름 =================
  P.start = async function () {
    this.emit('battle:start', this);
    var self = this;
    this.monsters.forEach(function (m) { self.predict(m); });
    await this.relicHooks('battleStart');
    // 특성: 시작 상태·보호막
    this.heroes.forEach(function (h) {
      if (h.dead) return;
      Object.keys(h.tm.startStatus).forEach(function (k) { S.set(h, k, S.get(h, k) + h.tm.startStatus[k]); });
      if (h.tm.startBlock) self.addBlock(h, h.tm.startBlock);
    });
    for (var i = 0; i < this.startEffects.length && !this.over(); i++) {
      this.emit('fx:text', { text: this.startEffects[i].name, kind: 'buff' });
      await this.run(this.startEffects[i].effects, { src: null, target: null, isCard: false, defTarget: 'none', pre: {} });
    }
    await this.startPlayerTurn();
  };

  // 유물의 반복 효과
  P.relicHooks = async function (on) {
    for (var i = 0; i < this.relics.length && !this.over(); i++) {
      var r = this.relics[i];
      var hooks = (r.hooks || []).filter(function (h) { return h.on === on; });
      for (var j = 0; j < hooks.length; j++) {
        this.relicFx(r.id);
        await this.run(hooks[j].effects, { src: null, target: null, isCard: false, defTarget: 'none', pre: {} });
      }
    }
  };
  P.relicFx = function (id) { this.emit('relic:trigger', { id: id }); };
  P.relicWith = function (mod) {
    var r = this.relics.filter(function (x) { return x.mods && x.mods[mod] != null; })[0];
    return r ? r.id : null;
  };

  // 아군이 적에게 거는 상태의 유물 보정 (status.js 가 부른다)
  P.statusMod = function (u, key, n, src) {
    // 특성: 그 캐릭터가 거는 상태 +n (적에게 거는 것, 재생은 아군에게)
    if (src && src.side === 'ally' && src.tm) {
      var toEnemy = u.side === 'enemy';
      if (src.tm.statusAdd[key] && (toEnemy || key === 'regen')) n += src.tm.statusAdd[key];
      if (toEnemy && src.tm.firstDebuffDraw && !src._debuffDrawn && S.isDebuff(key)) {
        src._debuffDrawn = true;
        this.drawCards(src.tm.firstDebuffDraw);
      }
    }
    if (u.side !== 'enemy' || (src && src.side === 'enemy')) return n;
    var m = this.mods;
    if (m.statusAdd[key]) n += m.statusAdd[key];
    if (m.statusMult[key]) n = Math.floor(n * m.statusMult[key]);
    return n;
  };

  P.startPlayerTurn = async function () {
    if (this.over()) return;
    this.turn++;
    this.phase = 'player';
    this.cardsThisTurn = 0;
    this.attacksThisTurn = 0;
    this.lastType = null;
    this.discount = 0;
    this.doubleNext = false;
    this.chain = { last: null, count: 0, used: {} };
    this.heroes.forEach(function (h) { h._cardTurn = false; h._atkTurn = false; h._debuffDrawn = false; });
    this.emit('battle:turn', { turn: this.turn, side: 'ally' });
    var self = this;
    for (var i = 0; i < this.heroes.length; i++) {
      var h = this.heroes[i];
      if (h.dead) continue;
      if (S.has(h, 'hold')) S.dec(h, 'hold');
      else if (!S.has(h, 'fortress') && this.turn > 1) h.block = 0; // 첫 턴에는 전투 시작 효과의 보호막을 남긴다
      S.turnStart(h);
      if (h.tm.turnStartBlock) this.addBlock(h, h.tm.turnStartBlock);
      var r = S.get(h, 'regen');
      if (r > 0) { await this.heal(h, r); S.dec(h, 'regen'); }
    }
    var m = this.mods, turn = this.turn;
    var energy = ENERGY + this.nextEnergy + (m.turnEnergy || 0) + (turn === 1 ? m.firstTurnEnergy || 0 : 0);
    m.everyN.forEach(function (e) { if (turn % e.n === 0) energy += e.v; });
    this.energy = energy;
    this.energyMax = energy; // 화면 표시용(이번 턴에 채운 에너지)
    this.nextEnergy = 0;
    this.drawCards(Math.max(0, DRAW + this.nextDraw + (m.turnDraw || 0) + (turn === 1 ? m.firstTurnDraw || 0 : 0)));
    this.nextDraw = 0;
    await this.traitTurnStart();
    await this.runHooks('turnStart');
    await this.relicHooks('turnStart');
    this.retarget();
    this.update();
    this.checkEnd();
  };

  P.endTurn = async function () {
    if (this.phase !== 'player' || this.busy) return;
    this.busy = true;
    // 손패 버림 (그 턴 한정 카드는 사라짐)
    var piles = this.piles;
    if (this.mods.emptyHandDraw && !piles.hand.length) { this.nextDraw += this.mods.emptyHandDraw; this.relicFx(this.relicWith('emptyHandDraw')); }
    piles.hand.forEach(function (c) {
      D.resetTurn(c);
      if (!c.temp) piles.discard.push(c);
    });
    piles.hand = [];
    this.emit('cards:discardHand', null);
    await this.runHooks('turnEnd');
    if (this.mods.turnEndBlockIfNone) {
      var bare = this.alive('ally').filter(function (h) { return h.block === 0; });
      if (bare.length) this.relicFx(this.relicWith('turnEndBlockIfNone'));
      for (var b = 0; b < bare.length; b++) this.addBlock(bare[b], this.mods.turnEndBlockIfNone);
    }
    var self = this;
    this.alive('ally').forEach(function (h) { if (h.tm.endTurnThornsIfBlock && h.block > 0) S.add(self, h, 'thornsTemp', h.tm.endTurnThornsIfBlock, h); });
    var heroes = this.alive('ally');
    for (var i = 0; i < heroes.length && !this.over(); i++) await this.tickDots(heroes[i]);
    this.heroes.forEach(function (h) { S.turnEnd(h); });
    this.update();
    if (this.checkEnd()) { this.busy = false; return; }
    await G.wait(T.turn);
    await this.enemyPhase();
    this.busy = false;
    if (!this.over()) await this.startPlayerTurn();
  };

  P.enemyPhase = async function () {
    this.phase = 'enemy';
    this.emit('battle:turn', { turn: this.turn, side: 'enemy' });
    var acting = this.alive('enemy');
    acting.forEach(function (m) { m.block = 0; S.turnStart(m); });
    this.update();
    for (var i = 0; i < acting.length; i++) {
      var m = acting[i];
      if (m.dead || this.over()) continue;
      if (m.everyTurn.length) await this.run(m.everyTurn, this.monsterCtx(m));
      if (m.dead || this.over()) continue;
      await this.act(m);
      this.update();
      if (this.checkEnd()) return;
      await G.wait(T.between);
    }
    var alive = this.alive('enemy');
    for (var j = 0; j < alive.length && !this.over(); j++) {
      await this.tickDots(alive[j]);
      S.turnEnd(alive[j]);
    }
    if (this.checkEnd()) return;
    // 라운드 끝
    this.heroes.concat(this.monsters).forEach(function (u) { if (!u.dead) S.roundEnd(u); });
    var self = this;
    this.alive('enemy').forEach(function (m) { self.predict(m); });
    this.update();
  };

  P.checkEnd = function () {
    if (this.phase === 'over') return true;
    var res = null;
    if (!this.alive('enemy').length) res = 'win';
    else if (!this.alive('ally').length) res = 'lose';
    if (!res) return false;
    this.phase = 'over';
    this.result = res;
    this.emit('battle:end', { result: res, goldDelta: this.goldDelta, battle: this });
    return true;
  };

  // ================= 카드 =================
  P.casterOf = function (inst) {
    var o = inst.def.owner;
    if (o === 'common' || o === 'none') return null;
    if (o === 'duo') return this.heroById(inst.def.caster);
    return this.heroById(o); // 편성에 없는 캐릭터의 카드(훔친 기술 등)는 시전자 없음
  };

  P.costOf = function (inst) {
    var def = inst.def;
    if (def.cost === 'X') return 'X';
    if (def.cost == null) return null;
    if (inst.freeTurn) return 0;
    var c = inst.costTurn != null ? inst.costTurn : def.cost;
    // 특성: 매 턴 그 캐릭터의 첫 (공격) 카드 비용 -1
    var h = def.owner !== 'duo' ? this.casterOf(inst) : null;
    if (h && h.tm) {
      if (h.tm.firstOwnCardDiscount && !h._cardTurn) c -= h.tm.firstOwnCardDiscount;
      if (h.tm.firstOwnAttackDiscount && def.type === 'attack' && !h._atkTurn) c -= h.tm.firstOwnAttackDiscount;
    }
    return Math.max(0, c - this.discount);
  };

  P.canPlay = function (inst) {
    var def = inst.def;
    if (def.unplayable) return { ok: false, reason: '사용할 수 없는 카드' };
    if (this.phase !== 'player') return { ok: false, reason: '내 턴이 아님' };
    var caster = this.casterOf(inst);
    // 합동기: 두 사람 모두 편성되어 있고, 쓰러지거나 빙결되지 않아야 한다
    if (def.duo) {
      for (var di = 0; di < def.duo.length; di++) {
        var dh = this.heroById(def.duo[di]);
        if (!dh) return { ok: false, reason: '함께할 동료가 편성되지 않음' };
        if (dh.dead) return { ok: false, reason: U.josa(dh.name, '이/가') + ' 쓰러짐' };
        if (S.has(dh, 'frozen')) return { ok: false, reason: U.josa(dh.name, '이/가') + ' 빙결됨' };
      }
    }
    if (caster && caster.dead) return { ok: false, reason: U.josa(caster.name, '이/가') + ' 쓰러짐' };
    if (caster && S.has(caster, 'frozen')) return { ok: false, reason: U.josa(caster.name, '이/가') + ' 빙결됨' };
    var cost = this.costOf(inst);
    if (cost !== 'X' && cost > this.energy) return { ok: false, reason: '에너지 부족' };
    if (def.target === 'downedAlly' && !this.heroes.some(function (h) { return h.dead; })) {
      return { ok: false, reason: '쓰러진 아군이 없음' };
    }
    return { ok: true };
  };

  P.needsTarget = function (inst) { return !!NEEDS_TARGET[inst.def.target]; };

  P.validTargets = function (inst) {
    switch (inst.def.target) {
      case 'enemy': return this.alive('enemy');
      case 'ally': return this.alive('ally');
      case 'downedAlly': return this.heroes.filter(function (h) { return h.dead; });
      default: return [];
    }
  };

  P.play = async function (inst, target) {
    if (this.busy || this.phase !== 'player') return false;
    var hand = this.piles.hand;
    var idx = hand.indexOf(inst);
    if (idx < 0 || !this.canPlay(inst).ok) return false;
    if (this.needsTarget(inst) && this.validTargets(inst).indexOf(target) < 0) return false;
    if (!this.needsTarget(inst)) target = null;
    this.busy = true;
    var def = inst.def, x = null;
    var cost = this.costOf(inst);
    if (cost === 'X') { x = this.energy; this.energy = 0; }
    else this.energy -= cost;
    this.discount = 0;
    var dbl = this.doubleNext;
    this.doubleNext = false;
    hand.splice(idx, 1);
    var caster = this.casterOf(inst);
    var link = this.linkCard(inst);
    var ctx = {
      card: def, inst: inst, src: caster, target: target, x: x, isCard: true, defTarget: def.target,
      cardsBefore: this.cardsThisTurn, attacksBefore: this.attacksThisTurn, lastType: this.lastType,
      pre: target ? Object.assign({}, target.status) : {},
      firstAttackOfBattle: def.type === 'attack' && !this.firstAttackDone,
      firstAttackOfTurn: def.type === 'attack' && this.attacksThisTurn === 0,
      heroFirstAttack: def.type === 'attack' && caster && !caster._firstAtkDone,
      comboBonus: link.bonus, pair: link.pair, prevCaster: link.prev
    };
    if (def.type === 'attack') this.firstAttackDone = true;
    if (caster) { caster._cardTurn = true; if (def.type === 'attack') { caster._atkTurn = true; caster._firstAtkDone = true; } }
    if (link.count >= 2 || link.pair) this.emit('combo', { count: link.count, pair: link.pair, unit: caster });
    this.emit('card:play', { inst: inst, caster: caster, target: target });
    this.update();
    await G.wait(T.card);
    await this.run(def.effects, ctx);
    if (dbl && !this.over()) {
      this.emit('fx:text', { unit: caster, text: '분신!', kind: 'info' });
      await this.run(def.effects, ctx);
    }
    // 짝 연계의 뒤 효과
    if (ctx.pair && ctx.pair.after && !this.over()) {
      await this.run(ctx.pair.after, Object.assign({}, ctx, { pair: null, comboBonus: 0, heroFirstAttack: false }));
    }
    if (def.type === 'attack' && !this.over()) await this.runHooks('onAttackCard');
    this.cardsThisTurn++;
    if (def.type === 'attack') this.attacksThisTurn++;
    if (!this.over()) await this.traitAfterCard(def, caster);
    this.lastType = def.type;
    if (!this.over()) {
      if (this.mods.thirdCardBlock && this.cardsThisTurn === 3) {
        this.relicFx(this.relicWith('thirdCardBlock'));
        var al = this.alive('ally');
        for (var k = 0; k < al.length; k++) this.addBlock(al[k], this.mods.thirdCardBlock);
      }
      if (this.mods.onPowerDraw && def.type === 'power') { this.relicFx(this.relicWith('onPowerDraw')); this.drawCards(this.mods.onPowerDraw); }
    }
    D.resetTurn(inst);
    if (inst.temp) { /* 사라짐 */ }
    else if (def.exhaust) this.piles.exhaust.push(inst);
    else if (def.type === 'power') this.piles.powers.push(inst);
    else this.piles.discard.push(inst);
    this.busy = false;
    this.emit('card:done', { inst: inst });
    this.update();
    this.checkEnd();
    return true;
  };

  // ================= 연계(9단계) =================
  // 캐릭터 카드를 직전과 다른 캐릭터의 카드로 이어 쓰면 연계 수 +1. 공용·합동기는 그대로 둔다
  P.linkCard = function (inst) {
    var o = inst.def.owner, ch = this.chain;
    if (o === 'common' || o === 'none' || o === 'duo' || !this.heroById(o)) return { count: ch.count, bonus: 0, pair: null, prev: null };
    var prev = ch.last, pair = null;
    if (prev && prev !== o) {
      ch.count++;
      var key = prev + '>' + o;
      var pc = (G.Data.pairCombos || []).filter(function (p) { return p.from === prev && p.to === o; })[0];
      if (pc && !ch.used[key] && (!pc.attackOnly || inst.def.type === 'attack')) {
        ch.used[key] = true;
        pair = this.scalePair(pc);
      }
    } else ch.count = 1;
    ch.last = o;
    var bonus = inst.def.type === 'attack' && ch.count >= 2 ? Math.min((G.Data.combo || { maxBonus: 4 }).maxBonus, ch.count - 1) : 0;
    return { count: ch.count, bonus: bonus, pair: pair, prev: prev ? this.heroById(prev) : null };
  };
  // 친밀도 2단계면 짝 연계 수치 1.5배(올림)
  P.scalePair = function (pc) {
    var key = G.Stage && G.Stage.pairKey ? G.Stage.pairKey(pc.from, pc.to) : pc.from + '+' + pc.to;
    var lv2 = (this.bonds[key] || 0) >= (G.Data.bondLevels || [10, 25, 45])[1];
    var k = lv2 ? 1.5 : 1;
    var up = function (v) { return typeof v === 'number' ? Math.ceil(v * k) : v; };
    var out = { name: pc.name, desc: pc.desc, boosted: lv2, forceCrit: pc.forceCrit };
    if (pc.dmgAdd) out.dmgAdd = up(pc.dmgAdd);
    if (pc.blockAdd) out.blockAdd = up(pc.blockAdd);
    if (pc.healAdd) out.healAdd = up(pc.healAdd);
    if (pc.statusAdd) { out.statusAdd = {}; Object.keys(pc.statusAdd).forEach(function (s) { out.statusAdd[s] = up(pc.statusAdd[s]); }); }
    if (pc.after) out.after = pc.after.map(function (e) { return Object.assign({}, e, { value: up(e.value) }); });
    return out;
  };
  // 손패 미리보기: 지금 쓰면 연계가 이어지는가, 짝 연계가 발동하는가
  P.comboPreview = function (inst) {
    var o = inst.def.owner, ch = this.chain;
    if (o === 'common' || o === 'none' || o === 'duo' || !this.heroById(o) || !ch.last || ch.last === o) return null;
    var pc = (G.Data.pairCombos || []).filter(function (p) { return p.from === ch.last && p.to === o; })[0];
    var pairOk = pc && !ch.used[ch.last + '>' + o] && (!pc.attackOnly || inst.def.type === 'attack');
    return { count: ch.count + 1, pair: pairOk ? pc : null };
  };

  // ================= 특성(9단계) =================
  P.traitTurnStart = async function () {
    var self = this, heroes = this.alive('ally');
    if (heroes.some(function (h) { return h.tm.burnVuln; })) {
      var src = heroes.filter(function (h) { return h.tm.burnVuln; })[0];
      this.alive('enemy').forEach(function (m) { if (S.has(m, 'burn')) S.add(self, m, 'vulnerable', src.tm.burnVuln, null); });
    }
    for (var i = 0; i < heroes.length && !this.over(); i++) {
      var h = heroes[i];
      if (h.tm.turnStartHealLowest && !h.dead) {
        var low = this.targets('lowestAlly', {})[0];
        if (low) await this.heal(low, h.tm.turnStartHealLowest);
      }
    }
  };
  P.traitAfterCard = async function (def, caster) {
    // 한 턴의 3·6·9번째 공격 카드마다 카드 1장(하린 특성)
    if (def.type === 'attack' && this.attacksThisTurn % 3 === 0) {
      var n = 0;
      this.alive('ally').forEach(function (h) { n += h.tm.thirdAttackDraw || 0; });
      if (n) this.drawCards(n);
    }
    // 세라의 공격 카드: 체력이 가장 낮은 아군 회복
    if (def.type === 'attack' && caster && !caster.dead && caster.tm.attackHealLowest) {
      var low = this.targets('lowestAlly', {})[0];
      if (low) await this.heal(low, caster.tm.attackHealLowest);
    }
  };
  // 적이 빙결되면(리라 특성) 카드 뽑기 — status.js 가 부른다
  P.onEnemyFrozen = function () {
    var n = 0;
    this.alive('ally').forEach(function (h) { n += h.tm.onFreezeDraw || 0; });
    if (n && this.phase === 'player') this.drawCards(n);
  };

  P.drawCards = function (n) {
    var drawn = D.draw(this.piles, n);
    if (drawn.length) this.emit('cards:draw', drawn);
    return drawn;
  };

  // 손패에서 지금 쓰면 조건이 충족되는가. 조건부가 아니거나 대상에 따라 달라지면 null
  P.condMet = function (inst) {
    var conds = [];
    (function walk(list) {
      list.forEach(function (e) {
        if (e.op === 'if') conds.push(e.cond);
        if (e.op === 'power') return;
        ['then', 'else'].forEach(function (k) { if (e[k]) walk(e[k]); });
      });
    })(inst.def.effects);
    if (!conds.length) return null;
    if (conds.some(function (c) { return TARGET_DEPENDENT[c.is]; })) return null;
    var cost = this.costOf(inst);
    var ctx = { src: this.casterOf(inst), cardsBefore: this.cardsThisTurn, attacksBefore: this.attacksThisTurn,
      lastType: this.lastType, preview: { hand: this.piles.hand.length - 1, energy: cost === 'X' ? 0 : this.energy - cost },
      card: inst.def };
    var self = this;
    return conds.some(function (c) { return self.evalCond(c, ctx, null); });
  };

  // ================= 효과 해석기 =================
  P.run = async function (effects, ctx) {
    for (var i = 0; i < effects.length; i++) {
      if (this.over()) return;
      await this.exec(effects[i], ctx);
    }
  };

  P.targets = function (spec, ctx) {
    var t = ctx.target;
    switch (spec) {
      case 'target': case 'enemy': case 'ally':
        return t && !t.dead ? [t] : [];
      case 'self': return ctx.src && !ctx.src.dead ? [ctx.src] : [];
      case 'allEnemies': case 'allMonsters': return this.alive('enemy');
      case 'allAllies': return this.alive('ally');
      case 'randomEnemy': var r = G.rng.pick(this.alive('enemy')); return r ? [r] : [];
      case 'lowestAlly':
        var low = this.alive('ally').sort(function (a, b) { return a.hp / a.maxHp - b.hp / b.maxHp; })[0];
        return low ? [low] : [];
      case 'downedAlly': return t && t.dead ? [t] : [];
      case 'allDowned': return this.heroes.filter(function (h) { return h.dead; });
      case 'healed': return ctx.healed && !ctx.healed.dead ? [ctx.healed] : [];
      case 'prevCaster': return ctx.prevCaster && !ctx.prevCaster.dead ? [ctx.prevCaster] : [];
      default: return [];
    }
  };

  // 수치: 숫자 / [최소, 최대] 무작위 / {base, per, mult, status, cap} 비례식
  P.num = function (v, ctx, tgt) {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (Array.isArray(v)) return G.rng.int(v[0], v[1]);
    var p = 0, src = ctx.src;
    switch (v.per) {
      case 'selfBlock': p = src ? src.block * (src.tm && src.tm.selfBlockDmgMult || 1) : 0; break;
      case 'targetStatus': p = tgt ? S.get(tgt, v.status) : 0; break;
      case 'targetDebuffKinds': p = tgt ? S.debuffKinds(tgt) : 0; break;
      case 'selfLostHp': p = src ? src.maxHp - src.hp : 0; break;
      case 'attacksThisTurn': p = ctx.attacksBefore || 0; break;
      case 'aliveAllies': p = this.alive('ally').length; break;
      case 'x': p = ctx.x || 0; break;
    }
    var n = Math.floor((v.base || 0) + v.mult * p);
    return v.cap != null ? Math.min(n, v.cap) : n;
  };

  P.evalCond = function (c, ctx, tgt) {
    var src = ctx.src, pv = ctx.preview;
    var ratio = function (u) { return u ? u.hp / u.maxHp : 1; };
    var hpCheck = function (u) { return !u ? false : c.op === 'full' ? u.hp >= u.maxHp : U.cmp(ratio(u), c.op, c.n); };
    var hasSt = function (u, snap) {
      if (!u) return false;
      if (c.status === 'debuff') return S.debuffKinds(u) > 0;
      return ((snap || u.status)[c.status] || 0) > 0;
    };
    switch (c.is) {
      case 'firstCard': return ctx.cardsBefore === 0;
      case 'attacksThisTurn': return U.cmp(ctx.attacksBefore, c.op, c.n);
      case 'lastCardType': return ctx.lastType === c.type;
      case 'handSize': return U.cmp(pv ? pv.hand : this.piles.hand.length, c.op, c.n);
      case 'energyLeft': return U.cmp(pv ? pv.energy : this.energy, c.op, c.n);
      case 'enemyCount': return U.cmp(this.alive('enemy').length, c.op, c.n);
      case 'allAlive': return this.heroes.every(function (h) { return !h.dead; });
      case 'anyDown': return this.heroes.some(function (h) { return h.dead; });
      case 'allFull': return this.alive('ally').every(function (h) { return h.hp >= h.maxHp; });
      case 'noAttackInHand': return !this.piles.hand.some(function (x) { return x.def.type === 'attack' && x.def !== ctx.card; });
      case 'selfHp': return hpCheck(src);
      case 'targetHp': return hpCheck(tgt);
      case 'selfBlock': return src ? U.cmp(src.block, c.op, c.n) : false;
      case 'targetBlock': return tgt ? U.cmp(tgt.block, c.op, c.n) : false;
      case 'selfHas': return hasSt(src);
      case 'targetHas': return hasSt(tgt, c.pre ? ctx.pre : null);
      case 'targetDebuffKinds': return tgt ? U.cmp(S.debuffKinds(tgt), c.op, c.n) : false;
      case 'targetIntentAttack': return !!(tgt && tgt.side === 'enemy' && this.intentInfo(tgt).dmg != null);
    }
    throw new Error('알 수 없는 조건: ' + c.is);
  };

  P.exec = async function (e, ctx) {
    var self = this;
    var spec = e.target || ctx.defTarget;
    var list, i, n;
    switch (e.op) {
      case 'damage': return this.execDamage(e, ctx, spec);

      case 'block':
        list = this.targets(spec, ctx);
        var bAdd = ctx.isCard ? (ctx.pair && ctx.pair.blockAdd || 0) + (ctx.src && ctx.src.tm && ctx.src.tm.blockAdd || 0) : 0;
        for (i = 0; i < list.length; i++) {
          this.addBlock(list[i], this.num(e.value, ctx, list[i]) + bAdd);
          if (e.keep) S.set(list[i], 'hold', Math.max(1, S.get(list[i], 'hold')));
          // 특성: 다른 아군에게 보호막을 주면 자신도
          if (ctx.isCard && ctx.src && ctx.src.tm && ctx.src.tm.shareBlock && list[i] !== ctx.src && !ctx.src.dead) this.addBlock(ctx.src, ctx.src.tm.shareBlock);
        }
        return;

      case 'heal':
        list = this.targets(spec, ctx);
        for (i = 0; i < list.length; i++) {
          n = e.pct ? Math.floor(list[i].maxHp * e.pct) : this.num(e.value, ctx, list[i]);
          var stm = ctx.isCard && ctx.src && ctx.src.tm;
          if (ctx.isCard) n += (ctx.pair && ctx.pair.healAdd || 0) + (stm && stm.healAdd || 0);
          await this.heal(list[i], n, { overflowToBlock: e.overflowToBlock || !!(stm && stm.overhealBlock) });
        }
        return;

      case 'status':
        list = this.targets(spec, ctx);
        list.forEach(function (u) {
          var sv = self.num(e.value, ctx, u);
          if (ctx.pair && ctx.pair.statusAdd && ctx.pair.statusAdd[e.status] && u.side === 'enemy') sv += ctx.pair.statusAdd[e.status];
          S.add(self, u, e.status, sv, ctx.src);
        });
        this.update();
        return;

      case 'cleanse':
        list = this.targets(spec, ctx);
        list.forEach(function (u) {
          if (S.cleanse(u, e.all ? 'all' : e.count || 1)) {
            self.emit('fx:cleanse', { unit: u });
            if (ctx.isCard && ctx.src && ctx.src.tm && ctx.src.tm.cleanseBlock) self.addBlock(u, ctx.src.tm.cleanseBlock);
          }
        });
        return;

      case 'revive':
        list = this.targets(e.target || 'downedAlly', ctx);
        list.forEach(function (u) {
          var rp = e.pct + (ctx.isCard && ctx.src && ctx.src.tm && ctx.src.tm.revivePct || 0);
          u.dead = false; u.hp = Math.max(1, Math.floor(u.maxHp * Math.min(1, rp))); u.block = 0; u.status = {};
          self.emit('fx:revive', { unit: u });
        });
        this.retarget();
        this.update();
        return;

      case 'loseHp':
        list = this.targets(e.target || 'self', ctx);
        for (i = 0; i < list.length; i++) await this.loseHp(list[i], this.num(e.value, ctx, list[i]));
        return;

      case 'draw': this.drawCards(this.num(e.value, ctx)); this.update(); return;
      case 'energy':
        n = this.num(e.value, ctx);
        if (e.nextTurn) this.nextEnergy += n; else this.energy += n;
        this.emit('fx:energy', { n: n, next: !!e.nextTurn });
        this.update();
        return;
      case 'discount': this.discount += e.value; this.update(); return;
      case 'doubleNext': this.doubleNext = true; return;

      case 'gold':
        n = this.num(e.value, ctx);
        this.goldDelta = Math.max(-this.gold, this.goldDelta + n);
        this.emit('fx:gold', { n: n, unit: ctx.src && ctx.src.side === 'enemy' ? ctx.src : null });
        return;

      case 'power':
        this.powers.push({ hook: e.hook, effects: e.effects, src: ctx.src, card: ctx.card });
        return;

      case 'if':
        return this.run(this.evalCond(e.cond, ctx, ctx.target) ? e.then : e.else || [], ctx);

      case 'chance':
        var heads = G.rng.chance(e.p == null ? 0.5 : e.p);
        this.emit('fx:text', { unit: ctx.src, text: heads ? '앞면!' : '뒷면', kind: heads ? 'good' : 'info' });
        await G.wait(T.hit);
        return this.run(heads ? e.then : e.else, ctx);

      case 'oneOf':
        var o = G.rng.pick(e.options);
        this.emit('fx:text', { unit: ctx.src, text: o.label, kind: 'good' });
        await G.wait(T.hit);
        return this.run(o.effects, ctx);

      case 'conjure': return this.conjure(e);

      case 'addCard':
        n = e.count || 1;
        for (i = 0; i < n; i++) {
          var c = D.inst(e.card, { temp: !!e.temp });
          if (e.pile === 'hand' && this.piles.hand.length < D.HAND_MAX) this.piles.hand.push(c);
          else if (e.pile === 'draw') this.piles.draw.splice(G.rng.int(0, this.piles.draw.length), 0, c);
          else if (!c.temp) this.piles.discard.push(c);
        }
        this.emit('cards:add', { card: e.card, n: n, pile: e.pile, unit: ctx.src });
        this.update();
        return;

      case 'randomizeCosts':
        this.piles.hand.forEach(function (c) {
          if (!c.def.unplayable && c.def.cost !== 'X') c.costTurn = G.rng.int(e.min, e.max);
        });
        this.update();
        return;

      case 'freeRandom':
        var cands = this.piles.hand.filter(function (c) { return !c.def.unplayable && self.costOf(c) > 0 && c.def.cost !== 'X'; });
        var pick = G.rng.pick(cands);
        if (pick) pick.freeTurn = true;
        this.update();
        return;

      case 'summon': return this.summon(e.monster, ctx.src);

      case 'custom': return this.custom(e.name, ctx, e);
    }
    throw new Error('알 수 없는 효과: ' + e.op);
  };

  P.execDamage = async function (e, ctx, spec) {
    var times = this.num(e.times == null ? 1 : e.times, ctx, ctx.target);
    var fixed = spec === 'randomEnemy' ? null : this.targets(spec, ctx);
    for (var t = 0; t < times; t++) {
      if (this.over()) return;
      var list = fixed ? fixed.filter(function (u) { return !u.dead; }) : this.targets('randomEnemy', ctx);
      if (!list.length) return;
      for (var i = 0; i < list.length; i++) {
        var tgt = list[i];
        if (tgt.dead) continue;
        var res = await this.hit(ctx.src, tgt, this.num(e.value, ctx, tgt), e, ctx);
        if (!res) continue;
        var sub = Object.assign({}, ctx, { target: tgt, defTarget: 'target' });
        if (e.onHit && !tgt.dead) await this.run(e.onHit, sub);
        if (res.crit && e.onCrit) await this.run(e.onCrit, sub);
        if (res.killed && e.onKill) await this.run(e.onKill, sub);
      }
      if (times > 1) await G.wait(T.hit);
    }
  };

  // 공격 피해 1회. 반환: { dealt, blocked, crit, killed }
  P.hit = async function (src, tgt, base, e, ctx) {
    if (!tgt || tgt.dead) return null;
    var d = base;
    var m = this.mods;
    var cardAttack = ctx.isCard && ctx.card && ctx.card.type === 'attack' && tgt.side === 'enemy';
    if (cardAttack && ctx.firstAttackOfBattle && m.firstAttackBonus) d += m.firstAttackBonus;
    if (cardAttack) {
      d += ctx.comboBonus || 0;                                      // 연계
      if (ctx.pair && ctx.pair.dmgAdd) d += ctx.pair.dmgAdd;         // 짝 연계
      var tm = src && src.tm;
      if (tm) {                                                      // 특성
        if (ctx.heroFirstAttack && tm.firstAttackBonus) d += tm.firstAttackBonus;
        if (tm.lowHpDamage && src.hp <= src.maxHp / 2) d += tm.lowHpDamage;
        if (tm.aoeDamage && ctx.card.target === 'allEnemies') d += tm.aoeDamage;
        if (tm.singleDamage && (ctx.card.target === 'enemy' || ctx.card.target === 'randomEnemy')) d += tm.singleDamage;
      }
    }
    if (src) d += S.get(src, 'strength') + S.get(src, 'tempStr');
    if (src && S.has(src, 'weak')) d *= 0.75;
    if (S.has(tgt, 'vulnerable')) d *= 1.5;
    if (src && src.side === 'enemy') d *= (1 + (this.em.dmgMult || 0)) * (ctx.dmgMult || 1);
    var crit = false;
    if (ctx.isCard && tgt.side === 'enemy') {
      if (cardAttack && ctx.pair && ctx.pair.forceCrit && !ctx.pair._critUsed) { crit = true; ctx.pair._critUsed = true; }
      else if (e.forceCrit || (cardAttack && m.turnFirstAttackCrit && ctx.firstAttackOfTurn)) crit = true;
      else if (src && S.has(src, 'focus')) { crit = true; S.dec(src, 'focus'); }
      else {
        var p = src ? src.crit + S.get(src, 'keen') * 0.1 : G.Data.COMMON_CRIT;
        crit = G.rng.chance(p + (e.critBonus || 0));
      }
    }
    if (crit) d *= 2 + (src ? S.get(src, 'critUp') * 0.5 : 0);
    if (src && src.tm && src.tm.frozenDmgMult && S.has(tgt, 'frozen')) d *= src.tm.frozenDmgMult;
    d = Math.max(0, Math.floor(d));
    d = Math.max(0, d - S.get(tgt, 'reduce'));
    if (e.breakBlock && tgt.block > 0) {
      tgt.block = 0;
      this.emit('fx:text', { unit: tgt, text: '방어 파괴', kind: 'info' });
    }
    var hadBlock = tgt.block > 0;
    var blocked = Math.min(tgt.block, d);
    tgt.block -= blocked;
    var loss = d - blocked;
    var overkill = loss > tgt.hp && !(tgt.def.revive && !tgt.revived) ? loss - tgt.hp : 0;
    this.emit('fx:hit', { src: src, unit: tgt, amount: loss, blocked: blocked, crit: crit, overkill: overkill });
    if (crit && src && src.side === 'ally' && m.onCritBlock) { this.relicFx(this.relicWith('onCritBlock')); this.addBlock(src, m.onCritBlock); }
    if (hadBlock && tgt.block === 0 && S.has(tgt, 'charge')) this.cancelCharge(tgt);
    // 반격 수치는 쓰러지면 상태가 지워지므로 먼저 읽는다
    var thorns = S.get(tgt, 'thorns') + S.get(tgt, 'thornsTemp');
    var lava = S.get(tgt, 'lavaArmor');
    await this.applyLoss(tgt, loss);
    if (src && !src.dead) {
      if (thorns > 0) await this.takeDamage(src, thorns, { kind: 'thorns' });
      if (lava > 0 && !src.dead) S.add(this, src, 'burn', lava, null);
    }
    if (src && src.affix && loss > 0 && !tgt.dead) {
      var oh = G.Data.affixes[src.affix].onHitStatus || {};
      for (var key in oh) S.add(this, tgt, key, oh[key], src);
    }
    if (src && !src.dead && loss > 0) {
      if (e.lifesteal) await this.heal(src, loss);
      if (e.leech) await this.heal(src, Math.floor(loss * e.leech));
    }
    // 특성: 공격받으면 보호막 / 처치하면 보호막·회복·에너지
    if (tgt.side === 'ally' && !tgt.dead && src && src.side === 'enemy' && tgt.tm.onHitBlock) this.addBlock(tgt, tgt.tm.onHitBlock);
    if (tgt.dead && src && src.side === 'ally' && !src.dead && ctx.isCard) {
      if (src.tm.onKillBlock) this.addBlock(src, src.tm.onKillBlock);
      if (src.tm.onKillHeal) await this.heal(src, src.tm.onKillHeal);
      if (src.tm.onKillEnergy) { this.energy += src.tm.onKillEnergy; this.emit('fx:energy', { n: src.tm.onKillEnergy }); }
    }
    this.update();
    await G.wait(T.hit);
    return { dealt: loss, blocked: blocked, crit: crit, killed: tgt.dead };
  };

  // 공격이 아닌 피해(가시, 화상). 보호막에 막힌다
  P.takeDamage = async function (u, n, opts) {
    if (u.dead || n <= 0) return;
    var hadBlock = u.block > 0;
    var blocked = Math.min(u.block, n);
    u.block -= blocked;
    this.emit('fx:hit', { src: null, unit: u, amount: n - blocked, blocked: blocked, kind: opts && opts.kind });
    if (hadBlock && u.block === 0 && S.has(u, 'charge')) this.cancelCharge(u);
    await this.applyLoss(u, n - blocked);
  };

  // 체력 손실(보호막 무시): 중독, 헌신, 광전사
  P.loseHp = async function (u, n, kind) {
    if (u.dead || n <= 0) return;
    this.emit('fx:hit', { src: null, unit: u, amount: n, blocked: 0, kind: kind || 'lose' });
    await this.applyLoss(u, n);
  };

  P.applyLoss = async function (u, n) {
    if (n <= 0 || u.dead) return;
    u.hp -= n;
    if (u.hp > 0) {
      if (u.side === 'enemy') await this.checkTriggers(u);
      return;
    }
    if (u.side === 'ally' && this.mods.phoenix && !this.phoenixUsed) {
      this.phoenixUsed = true;
      u.hp = Math.max(1, Math.floor(u.maxHp * this.mods.phoenix));
      this.relicFx(this.relicWith('phoenix'));
      this.emit('fx:revive', { unit: u });
      this.emit('fx:text', { unit: u, text: '불사조 깃털!', kind: 'good' });
      return;
    }
    if (u.side === 'ally' && u.tm.undyingOnce && !u._undyingUsed) {
      u._undyingUsed = true;
      u.hp = 1;
      this.emit('fx:text', { unit: u, text: '불굴!', kind: 'good' });
      return;
    }
    if (u.side === 'ally' && u.tm.selfRevive && !u._selfRevived) {
      u._selfRevived = true;
      u.hp = Math.max(1, Math.floor(u.maxHp * u.tm.selfRevive));
      this.emit('fx:revive', { unit: u });
      this.emit('fx:text', { unit: u, text: '수호 천사!', kind: 'good' });
      return;
    }
    if (u.side === 'ally' && this.teamUndying > 0) {
      this.teamUndying--;
      u.hp = 1;
      this.emit('fx:text', { unit: u, text: '버텼다!', kind: 'good' });
      return;
    }
    if (u.side === 'enemy' && u.def.revive && !u.revived) {
      u.revived = true;
      u.hp = Math.max(1, Math.floor(u.maxHp * u.def.revive.pct));
      u.block = 0;
      S.cleanse(u, 'all');
      this.emit('fx:revive', { unit: u });
      this.emit('fx:text', { unit: u, text: '부활!', kind: 'bad' });
      return;
    }
    await this.die(u);
  };

  P.die = async function (u) {
    u.hp = 0; u.dead = true; u.block = 0; u.status = {};
    this.emit('fx:death', { unit: u });
    if (u.side === 'enemy') {
      this.kills.push(u.id);
      if (u.affix) this.affixKills = (this.affixKills || 0) + 1;
      if (u.def.onDeath) await this.run(u.def.onDeath, this.monsterCtx(u));
      if (this.mods.onKillDraw && this.alive('enemy').length) { this.relicFx(this.relicWith('onKillDraw')); this.drawCards(this.mods.onKillDraw); }
    } else {
      this.retarget();
    }
    this.update();
    this.checkEnd();
  };

  P.addBlock = function (u, n) {
    if (u.dead || n <= 0) return;
    u.block += n;
    this.emit('fx:block', { unit: u, n: n });
  };

  P.heal = async function (u, n, opts) {
    if (u.dead || n <= 0) return 0;
    if (u.side === 'ally' && this.mods.healBonus) n += this.mods.healBonus;
    var real = Math.min(n, u.maxHp - u.hp);
    u.hp += real;
    var over = n - real;
    if (opts && opts.overflowToBlock && over > 0) this.addBlock(u, over);
    this.emit('fx:heal', { unit: u, n: real });
    if (u.side === 'ally') await this.runHooks('onHeal', { healed: u });
    return real;
  };

  P.tickDots = async function (u) {
    var p = S.get(u, 'poison');
    if (p > 0) { await this.loseHp(u, p, 'poison'); if (!u.dead) S.dec(u, 'poison'); }
    var b = S.get(u, 'burn');
    if (b > 0 && !u.dead) { await this.takeDamage(u, b, { kind: 'burn' }); if (!u.dead) S.set(u, 'burn', Math.floor(b / 2)); }
    if (p || b) await G.wait(T.hit);
  };

  // 지속 카드 반복 효과. 주인이 쓰러져 있으면 멈춘다
  P.runHooks = async function (hook, extra) {
    var list = this.powers.filter(function (p) { return p.hook === hook; });
    for (var i = 0; i < list.length && !this.over(); i++) {
      var p = list[i];
      if (p.src && p.src.dead) continue;
      var ctx = Object.assign({ card: p.card, src: p.src, target: null, isCard: true, defTarget: p.card.target,
        cardsBefore: this.cardsThisTurn, attacksBefore: this.attacksThisTurn, lastType: this.lastType, pre: {} }, extra);
      await this.run(p.effects, ctx);
    }
  };

  P.conjure = function (e) {
    var pool = e.pool || {}, party = this.heroes.map(function (h) { return h.id; });
    var minR = pool.minRarity ? G.RARITIES.indexOf(pool.minRarity) : 0;
    var cands = G.Data.cards.filter(function (c) {
      if (c.owner === 'none' || G.RARITIES.indexOf(c.rarity) < minR) return false;
      switch (pool.owner) {
        case 'heroes': return c.owner !== 'common';
        case 'partyAndCommon': return c.owner === 'common' || party.indexOf(c.owner) >= 0;
        default: return c.owner === pool.owner;
      }
    });
    G.rng.shuffle(cands);
    var made = [];
    for (var i = 0; i < (e.count || 1) && i < cands.length; i++) {
      if (this.piles.hand.length >= D.HAND_MAX) break;
      var c = D.inst(cands[i].id, { temp: true, freeTurn: true });
      this.piles.hand.push(c);
      made.push(c);
    }
    this.emit('cards:conjure', made);
    this.update();
  };

  P.custom = async function (name, ctx, e) {
    var self = this, t = ctx.target;
    switch (name) {
      case 'teamUndying':
        this.teamUndying = 1;
        return;
      case 'spreadBurn':
        var b = t ? S.get(t, 'burn') : 0;
        if (b > 0) this.alive('enemy').forEach(function (m) { if (m !== t) S.add(self, m, 'burn', b, null); });
        this.update();
        return;
      case 'doublePoison':
        if (t && S.has(t, 'poison')) S.add(this, t, 'poison', S.get(t, 'poison'), null);
        this.update();
        return;
      case 'redraw':
        var n = this.piles.hand.length;
        this.piles.hand.forEach(function (c) { D.resetTurn(c); if (!c.temp) self.piles.discard.push(c); });
        this.piles.hand = [];
        this.drawCards(n + ((e && e.extra) || 1));
        this.update();
        return;
    }
    throw new Error('알 수 없는 custom 효과: ' + name);
  };

  // ================= 몬스터 =================
  P.monsterCtx = function (m) {
    return { src: m, target: m.intentTarget, isMonster: true, defTarget: 'target', pre: {} };
  };

  P.moveOf = function (m) { return m.def.moves[m.intent]; };

  function needsSingleTarget(move) {
    return move.effects.some(function (e) {
      return (e.op === 'damage' || e.op === 'status') && (!e.target || e.target === 'target');
    });
  }

  P.pickHeroTarget = function () {
    var alive = this.alive('ally');
    var guard = alive.filter(function (h) { return S.has(h, 'guardian'); });
    if (guard.length) return guard[0];
    var taunt = alive.filter(function (h) { return S.has(h, 'taunt'); });
    if (taunt.length) return G.rng.pick(taunt);
    return G.rng.pick(alive) || null;
  };

  P.predict = function (m) {
    if (m.dead) return;
    m.intent = m.pattern[m.pIndex % m.pattern.length];
    var move = this.moveOf(m);
    m.intentTarget = needsSingleTarget(move) ? this.pickHeroTarget() : null;
  };

  // 도발·사망에 따라 단일 대상 예고를 다시 정한다
  P.retarget = function () {
    var self = this;
    var alive = this.alive('ally');
    var forced = alive.filter(function (h) { return S.has(h, 'guardian'); })[0] ||
      alive.filter(function (h) { return S.has(h, 'taunt'); })[0];
    this.alive('enemy').forEach(function (m) {
      if (!m.intent || !needsSingleTarget(self.moveOf(m))) return;
      if (forced && !(S.has(m.intentTarget, 'taunt') || S.has(m.intentTarget, 'guardian'))) m.intentTarget = forced;
      else if (!m.intentTarget || m.intentTarget.dead) m.intentTarget = self.pickHeroTarget();
    });
  };

  // 화면 표시용 행동 예고 정보
  P.intentInfo = function (m) {
    var move = this.moveOf(m);
    var info = { name: move.name, kinds: [], dmg: null, times: 1, all: false, target: m.intentTarget };
    var self = this;
    move.effects.forEach(function (e) {
      var allT = e.target === 'allAllies';
      switch (e.op) {
        case 'damage':
          var d = self.num(e.value, {}, null) + S.get(m, 'strength');
          if (S.has(m, 'weak')) d *= 0.75;
          d *= (1 + (self.em.dmgMult || 0)) * (m.intent === 'doom' && self.em.doomMult ? self.em.doomMult : 1);
          if (!allT && m.intentTarget && S.has(m.intentTarget, 'vulnerable')) d *= 1.5;
          info.dmg = Math.floor(d);
          info.times = self.num(e.times || 1, {}, null);
          info.all = allT;
          if (info.kinds.indexOf('attack') < 0) info.kinds.push('attack');
          break;
        case 'block': if (info.kinds.indexOf('block') < 0) info.kinds.push('block'); break;
        case 'heal': case 'status':
          var debuff = S.isDebuff(e.status) && e.target !== 'self' && e.target !== 'allMonsters';
          var k = e.op === 'heal' ? 'buff' : debuff ? 'debuff' : 'buff';
          if (info.kinds.indexOf(k) < 0) info.kinds.push(k);
          break;
        default: if (info.kinds.indexOf('special') < 0) info.kinds.push('special');
      }
    });
    return info;
  };

  P.act = async function (m) {
    var pattern = m.pattern;
    var advance = function () { if (m.pattern === pattern) m.pIndex++; };
    if (S.has(m, 'frozen') || S.has(m, 'stun')) {
      var frozen = S.has(m, 'frozen');
      delete m.status[frozen ? 'frozen' : 'stun'];
      this.emit('fx:text', { unit: m, text: frozen ? '얼어붙음' : '정지', kind: 'ice' });
      advance();
      await G.wait(T.act);
      return;
    }
    var move = this.moveOf(m);
    if (move.requiresCharge && !S.has(m, 'charge')) {
      this.emit('fx:text', { unit: m, text: '취소됨', kind: 'info' });
      advance();
      return;
    }
    if (m.intentTarget && m.intentTarget.dead && needsSingleTarget(move)) m.intentTarget = this.pickHeroTarget();
    this.emit('monster:act', { unit: m, move: move, info: this.intentInfo(m) });
    await G.wait(T.act);
    var mctx = this.monsterCtx(m);
    if (m.intent === 'doom' && this.em.doomMult) mctx.dmgMult = this.em.doomMult;
    await this.run(move.effects, mctx);
    if (move.requiresCharge) delete m.status.charge;
    advance();
  };

  P.cancelCharge = function (m) {
    delete m.status.charge;
    var move = m.def.moves[m.pattern[(m.pIndex - 1 + m.pattern.length) % m.pattern.length]];
    var cancel = (move && move.charge && move.charge.cancelStatus) || {};
    var self = this;
    Object.keys(cancel).forEach(function (k) { S.add(self, m, k, cancel[k], null); });
    this.emit('fx:text', { unit: m, text: '차지 취소!', kind: 'good' });
    // 예고된 행동(차지 공격)을 건너뛰고 다음 행동을 예고한다
    if (this.moveOf(m).requiresCharge) { m.pIndex++; this.predict(m); }
  };

  P.checkTriggers = async function (m) {
    var trig = m.def.triggers || [];
    for (var i = 0; i < trig.length; i++) {
      var t = trig[i];
      if (m.fired[i] || m.dead || m.hp > m.maxHp * t.hpBelow) continue;
      m.fired[i] = true;
      this.emit('monster:trigger', { unit: m, name: t.name });
      this.emit('fx:text', { unit: m, text: t.name, kind: 'bad' });
      await G.wait(T.act);
      if (t.effects) await this.run(t.effects, this.monsterCtx(m));
      if (this.em.triggerStr && m.def.rank !== 'normal') S.add(this, m, 'strength', this.em.triggerStr, m);
      if (t.pattern) { m.pattern = t.pattern.slice(); m.pIndex = 0; this.predict(m); }
      if (t.everyTurn) m.everyTurn = m.everyTurn.concat(t.everyTurn);
      this.update();
    }
  };

  P.summon = async function (id, by) {
    if (this.alive('enemy').length >= MAX_MONSTERS) {
      if (by) this.addBlock(by, 8);
      return;
    }
    var m = makeMonster(id, null, this.opts.stage, this.em);
    this.monsters.push(m);
    this.predict(m);
    this.emit('monster:summon', { unit: m, by: by });
    this.update();
    await G.wait(T.act);
  };

  // 디버그: 적 전원 즉사
  P.debugKillAll = async function () {
    var list = this.alive('enemy');
    for (var i = 0; i < list.length; i++) { list[i].revived = true; await this.die(list[i]); }
  };

  G.Battle = {
    current: null,
    mergeMods: mergeMods,
    create: function (opts) { return (G.Battle.current = new Battle(opts)); },
    Battle: Battle
  };
})();
