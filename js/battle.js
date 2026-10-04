// battle.js — 전투 진행, 카드 효과 해석기, 조건 판정, 몬스터 AI
// 화면을 직접 만지지 않는다. 이벤트(fx:*, card:*, battle:*)만 내보내고 그리기는 UI가 맡는다.
(function () {
  'use strict';
  var G = Game, S = G.Status, D = G.Deck, U = G.util;
  var ENERGY = 3, DRAW = 5, MAX_MONSTERS = 4;
  var T = { card: 220, hit: 140, act: 320, between: 260, turn: 300, cutin: 1100 };
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
      block: 0, status: {}, dead: cur <= 0, crit: c.crit + (tm.critAdd || 0), tm: tm, res: 0, resMax: c.resource && !c.resource.onEnemy ? c.resource.max : 0 };  // 소연의 독 표식은 적에게 붙는다
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
      // 23단계(하드): 정예·보스는 힘을 갖고 시작한다
      if (em.eliteStr && d.rank !== 'normal') m.status.strength = (m.status.strength || 0) + em.eliteStr;
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
    this.items = (opts.items || []).filter(function (id) { return G.Data.itemById && G.Data.itemById[id]; });   // 22단계: 소모품 칸
    this.itemsUsed = [];
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
    // 20단계: 전투 전체에서 센 값(카드 수치 비례식에 쓴다)
    this.attacksBattle = 0;
    this.healedBattle = 0;
    this.exhaustedBattle = 0;
    this.discardedTurn = 0;
    this.forceEnd = false;
    // 26단계: 기록·업적용 집계(되돌리기와 함께 되돌아간다)
    this.tally = { dealt: 0, taken: 0, maxHit: 0, cards: 0, plays: {}, maxCombo: 0 };
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
    // 20단계: 선천성 카드는 첫 손패에 들어오도록 뽑을 덱 위로 올린다
    var draw = this.piles.draw, innate = draw.filter(function (c) { return c.def.innate; });
    if (innate.length) { this.piles.draw = draw.filter(function (c) { return !c.def.innate; }).concat(innate); }
    this.emit('battle:start', this);
    var self = this;
    this.monsters.forEach(function (m) { self.predict(m); });
    await this.relicHooks('battleStart');
    // 특성: 시작 상태·보호막
    this.heroes.forEach(function (h) {
      if (h.dead) return;
      Object.keys(h.tm.startStatus).forEach(function (k) { S.set(h, k, S.get(h, k) + h.tm.startStatus[k]); });
      if (h.tm.startBlock) self.addBlock(h, h.tm.startBlock);
      if (h.tm.startRes) self.gainRes(h, h.tm.startRes);   // 30단계: 시엘 '미리 겨눈 화살'
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
  // 22단계: 전투 중 사건마다 발동하는 유물. hook = { on, effects, every(전투 누적 n번마다), nth(이번 턴 n번째 카드일 때), perTurn(턴당 최대 횟수) }
  // extra.target 은 사건의 주인공(맞은 아군, 디버프를 받은 적 등). 효과는 시전자 없이 돈다
  P.relicEvent = async function (on, extra) {
    extra = extra || {};
    this.relicCount = this.relicCount || {};
    this.relicTurnCount = this.relicTurnCount || {};
    for (var i = 0; i < this.relics.length && !this.over(); i++) {
      var r = this.relics[i], hooks = r.hooks || [];
      for (var j = 0; j < hooks.length && !this.over(); j++) {
        var h = hooks[j];
        if (h.on !== on) continue;
        var key = r.id + ':' + j;
        if (h.every) { this.relicCount[key] = (this.relicCount[key] || 0) + 1; if (this.relicCount[key] % h.every) continue; }
        if (h.nth && this.cardsThisTurn !== h.nth) continue;
        if (h.perTurn) { var used = this.relicTurnCount[key] || 0; if (used >= h.perTurn) continue; this.relicTurnCount[key] = used + 1; }
        this.relicFx(r.id);
        await this.run(h.effects, { src: null, target: extra.target || null, isCard: false, isRelic: true, defTarget: 'none', pre: {} });
      }
    }
  };
  // 동기 지점(상태 부여·자원 계산 중)에서 생긴 사건은 쌓아 두었다가 다음 비동기 지점에서 처리한다
  P.queueRelic = function (on, extra) { (this.relicQueue = this.relicQueue || []).push([on, extra]); };
  P.flushRelics = async function () {
    while (this.relicQueue && this.relicQueue.length && !this.over()) { var q = this.relicQueue.shift(); await this.relicEvent(q[0], q[1]); }
  };
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
    this.discardedTurn = 0;
    this.forceEnd = false;
    this.relicTurnCount = {};
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
    this.frostAura();
    this.retarget();
    this.update();
    if (!this.checkEnd()) this.snapshot();
  };

  P.endTurn = async function () {
    if (this.phase !== 'player' || this.busy) return;
    this.busy = true;
    // 손패 버림 (그 턴 한정 카드는 사라짐)
    var piles = this.piles;
    if (this.mods.emptyHandDraw && !piles.hand.length) { this.nextDraw += this.mods.emptyHandDraw; this.relicFx(this.relicWith('emptyHandDraw')); }
    if (piles.hand.length) await this.relicEvent('turnEndHand');
    // 34단계: 저주 카드 — 손패에 든 채로 턴이 끝나면 효과가 난다
    var curses = piles.hand.filter(function (c) { return c.def.inHandEnd; });
    for (var ci = 0; ci < curses.length && !this.over(); ci++) {
      this.emit('fx:text', { text: curses[ci].def.name + ' — ' + curses[ci].def.text, kind: 'bad' });
      await this.run(curses[ci].def.inHandEnd, { src: null, target: null, isMonster: true, defTarget: 'randomAlly', pre: {} });
    }
    if (this.checkEnd()) { this.busy = false; return; }
    // 20단계: 보존 카드는 손패에 남는다
    var kept = [];
    piles.hand.forEach(function (c) {
      D.resetTurn(c);
      if (c.def.retain && !c.temp) kept.push(c);
      else if (!c.temp) piles.discard.push(c);
    });
    piles.hand = kept;
    this.emit('cards:discardHand', { kept: kept.length });
    await this.runHooks('turnEnd');
    await this.relicEvent('turnEnd');
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
      await this.flushRelics();
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
    var prevOwner = this.chain.last;   // 32단계 연계형 카드: 직전에 쓴 동료 카드의 주인
    var link = this.linkCard(inst);
    var ctx = {
      card: def, inst: inst, src: caster, target: target, x: x, isCard: true, defTarget: def.target,
      cardsBefore: this.cardsThisTurn, attacksBefore: this.attacksThisTurn, lastType: this.lastType,
      pre: target ? Object.assign({}, target.status) : {},
      firstAttackOfBattle: def.type === 'attack' && !this.firstAttackDone,
      firstAttackOfTurn: def.type === 'attack' && this.attacksThisTurn === 0,
      heroFirstAttack: def.type === 'attack' && caster && !caster._firstAtkDone,
      comboBonus: link.bonus, pair: link.pair, prevCaster: link.prev,
      combo: link.count, prevOwner: prevOwner, timesPlayed: this.tally.plays[def.id] || 0
    };
    if (def.type === 'attack') this.firstAttackDone = true;
    // 21단계 고유 자원: 하린의 검세가 차 있으면 이 공격 카드는 치명타 확정
    if (caster && caster.id === 'kai' && def.type === 'attack' && caster.res >= caster.resMax) ctx.momentum = true;
    // 30단계: 시엘의 조준 — 이 공격 카드가 쌓인 조준을 모두 쓴다(첫 공격 피해 + 조준 × 3, 가득 찼으면 관통)
    if (caster && caster.id === 'ciel' && def.type === 'attack' && caster.res > 0) ctx.aim = caster.res;
    if (caster) { caster._cardTurn = true; if (def.type === 'attack') { caster._atkTurn = true; caster._firstAtkDone = true; } }
    this.tally.cards++;
    this.tally.plays[def.id] = (this.tally.plays[def.id] || 0) + 1;
    if (link.count > this.tally.maxCombo) this.tally.maxCombo = link.count;
    if (link.count >= 2 || link.pair) this.emit('combo', { count: link.count, pair: link.pair, unit: caster });
    // 16단계: 영웅·전설 카드와 합동기는 사용한 캐릭터의 얼굴과 대사가 먼저 지나간다(opts.cutin 이 false 면 생략)
    if (this.opts.cutin && caster && (def.rarity === 'epic' || def.rarity === 'legendary' || def.duo)) {
      this.emit('card:cutin', { def: def, caster: caster });
      await G.wait(T.cutin);
    }
    // 화면 쪽이 카드 연출의 첫 타격까지 걸리는 시간을 hold(ms)에 적어 주면 그만큼 기다린 뒤 효과를 낸다
    var play = { inst: inst, caster: caster, target: target, hold: 0 };
    this.emit('card:play', play);
    this.update();
    await G.wait(Math.max(T.card, play.hold || 0));
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
    if ((def.type === 'skill' || def.type === 'power') && !this.over()) await this.runHooks('onSkillCard');
    if (!this.over()) await this.resourceAfterCard(def, caster, ctx);
    var cardOn = { attack: 'attackCard', skill: 'skillCard', block: 'blockCard', heal: 'healCard', power: 'powerCard' }[def.type];
    this.cardsThisTurn++;
    if (cardOn && !this.over()) await this.relicEvent(cardOn);
    if (!this.over()) await this.relicEvent('anyCard');
    this.cardsThisTurn--;
    if (!this.over()) await this.flushRelics();
    this.cardsThisTurn++;
    if (def.type === 'attack') { this.attacksThisTurn++; this.attacksBattle++; }
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
    else if (def.exhaust) await this.exhaustCard(inst, true);
    else if (def.type === 'power') this.piles.powers.push(inst);
    else this.piles.discard.push(inst);
    if (!this.over()) await this.reactions(def, caster);
    this.busy = false;
    this.emit('card:done', { inst: inst });
    this.update();
    this.checkEnd();
    // 20단계: 시간의 모래(파라오) — 한 턴에 카드를 너무 많이 쓰면 턴이 끝난다
    if (this.forceEnd && !this.over() && this.phase === 'player') { this.forceEnd = false; await this.endTurn(); }
    return true;
  };

  // ================= 24단계: 턴 되돌리기 =================
  // 내 턴이 시작될 때 전투 상태를 통째로 떠 두고, 그 턴에 한 일을 모두 되돌린다(노말 모드·전투 테스트에서만).
  // 데이터 객체(카드·몬스터·유물 정의)는 그대로 가리키고, 전투 안의 객체끼리의 참조(대상·주인)는 복제본끼리 다시 잇는다
  var dataObjs = null;
  function collectData() {
    dataObjs = new WeakSet();
    var walk = function (o) {
      if (!o || typeof o !== 'object' || dataObjs.has(o)) return;
      dataObjs.add(o);
      Object.keys(o).forEach(function (k) { walk(o[k]); });
    };
    walk(G.Data);
  }
  function cloneDeep(v, memo) {
    if (!v || typeof v !== 'object') return v;
    if (dataObjs.has(v)) return v;
    if (memo.has(v)) return memo.get(v);
    var out = Array.isArray(v) ? [] : Object.create(Object.getPrototypeOf(v));
    memo.set(v, out);
    Object.keys(v).forEach(function (k) { out[k] = cloneDeep(v[k], memo); });
    return out;
  }
  var UNDO_SKIP = { opts: 1, _snap: 1, _undoCount: 1 };
  P.snapshot = function () {
    if (!this.opts.undo) return;
    if (!dataObjs) collectData();
    var memo = new Map(), snap = {}, self = this;
    Object.keys(this).forEach(function (k) { if (!UNDO_SKIP[k]) snap[k] = cloneDeep(self[k], memo); });
    this._snap = snap;
  };
  // 35단계: 전투 상태 전체를 저장·복구한다(시뮬레이터가 카드를 써 보고 되돌릴 때). 턴 되돌리기와 같은 복제를 쓴다
  P.saveState = function () {
    if (!dataObjs) collectData();
    var memo = new Map(), snap = {}, self = this;
    Object.keys(this).forEach(function (k) { if (!UNDO_SKIP[k]) snap[k] = cloneDeep(self[k], memo); });
    return { snap: snap, rng: G.rng.getState() };
  };
  P.loadState = function (st) {
    var snap = st.snap, memo = new Map(), self = this;
    Object.keys(this).forEach(function (k) { if (!UNDO_SKIP[k] && !(k in snap)) delete self[k]; });
    Object.keys(snap).forEach(function (k) { self[k] = cloneDeep(snap[k], memo); });
    G.rng.setState(st.rng);
  };
  // 되돌릴 게 있을 때만(카드를 썼거나 소모품을 썼을 때)
  P.canUndo = function () {
    return !!(this._snap && this.phase === 'player' && !this.busy && !this.over() &&
      (this.cardsThisTurn > 0 || this.itemsUsed.length !== this._snap.itemsUsed.length || this.piles.hand.length !== this._snap.piles.hand.length));
  };
  P.undo = function () {
    if (!this.canUndo()) return false;
    var snap = this._snap, memo = new Map(), self = this;
    Object.keys(this).forEach(function (k) { if (!UNDO_SKIP[k] && !(k in snap)) delete self[k]; });
    Object.keys(snap).forEach(function (k) { self[k] = cloneDeep(snap[k], memo); });   // 다시 복제해 두어 여러 번 되돌릴 수 있다
    this._undoCount = (this._undoCount || 0) + 1;
    this.emit('battle:undo', this);
    this.update();
    return true;
  };

  // ================= 22단계: 소모품 =================
  // 내 턴에 카드를 쓰는 중이 아닐 때 에너지 없이 쓴다. 반환: 썼으면 true
  P.canUseItem = function () { return this.phase === 'player' && !this.busy && !this.over(); };
  P.useItem = async function (index) {
    var id = this.items[index], def = id && G.Data.itemById[id];
    if (!def || !this.canUseItem()) return false;
    this.busy = true;
    this.items.splice(index, 1);
    this.itemsUsed.push(id);
    this.emit('item:use', { id: id, def: def });
    this.emit('fx:text', { text: def.name, kind: 'good' });
    await G.wait(T.card);
    await this.run(def.effects, { src: null, target: null, isCard: false, isItem: true, defTarget: 'none', pre: {} });
    await this.flushRelics();
    this.busy = false;
    this.update();
    this.checkEnd();
    return true;
  };

  // ================= 21단계: 캐릭터 고유 자원 =================
  P.gainRes = function (h, n) {
    if (!h || h.dead || !h.resMax || !n) return;
    var before = h.res;
    h.res = Math.max(0, Math.min(h.resMax, h.res + n));
    if (h.res !== before) this.emit('hero:res', { unit: h });
    if (h.res >= h.resMax && before < h.resMax) this.queueRelic('resFull', { target: h });
  };
  // 카드를 쓴 뒤: 하린 검세(공격 카드) · 브리아 반격 자세(방어 카드) · 리라 원소 공명(모든 카드, 5가 차면 폭발) · 시엘 조준(스킬·지속 카드로 쌓고 공격 카드로 씀)
  P.resourceAfterCard = async function (def, caster, ctx) {
    if (!caster || caster.dead) return;
    if (caster.id === 'kai' && def.type === 'attack') {
      if (ctx.momentum) { caster.res = 0; this.emit('hero:res', { unit: caster }); }
      else if (!ctx.spent) this.gainRes(caster, 1);
    }
    if (caster.id === 'bram' && def.type === 'block') this.gainRes(caster, 1);
    if (caster.id === 'ciel') {
      if ((def.type === 'skill' || def.type === 'power') && !ctx.spent) this.gainRes(caster, 1);
      if (def.type === 'attack' && ctx.aim) {
        caster.res = 0;
        this.emit('hero:res', { unit: caster });
        if (ctx.aim >= caster.resMax) {
          this.emit('fx:text', { unit: caster, text: '관통!', kind: 'good' });
          this.emit('hero:burst', { unit: caster });
          var all = this.alive('enemy');
          for (var k = 0; k < all.length && !this.over(); k++) await this.takeDamage(all[k], 8, { kind: 'pierce' });
          this.update();
        }
      }
    }
    if (caster.id === 'lyra') {
      this.gainRes(caster, 1);
      if (caster.res >= caster.resMax) {
        caster.res = 0;
        this.emit('hero:res', { unit: caster });
        this.emit('fx:text', { unit: caster, text: '원소 폭발!', kind: 'good' });
        this.emit('hero:burst', { unit: caster });
        var foes = this.alive('enemy');
        for (var i = 0; i < foes.length && !this.over(); i++) {
          await this.takeDamage(foes[i], 8, { kind: 'burn' });
          if (!foes[i].dead) { S.add(this, foes[i], 'burn', 2, caster); S.add(this, foes[i], 'chill', 1, caster); }
        }
        this.update();
      }
    }
  };

  // ================= 20단계: 버리기 · 소멸 · 미리 보기 · 고르기 =================
  // 손패(또는 뽑을 덱 위)에서 카드를 고른다. 화면이 'pick:request'를 받아 handled 를 세우면 그 선택을 기다리고,
  // 아무도 받지 않으면(테스트·시뮬레이터) 값이 낮은 카드부터 자동으로 고른다
  P.pickCards = function (opts) {
    var self = this, list = opts.cards.slice();
    if (!list.length) return Promise.resolve([]);
    var max = Math.min(opts.max == null ? 1 : opts.max, list.length), min = Math.min(opts.min == null ? max : opts.min, list.length);
    return new Promise(function (resolve) {
      var req = { title: opts.title, verb: opts.verb, cards: list, min: min, max: max, handled: false, battle: self,
        resolve: function (picked) { resolve((picked || []).filter(function (c) { return list.indexOf(c) >= 0; }).slice(0, max)); } };
      if (!G.instant) self.emit('pick:request', req);
      if (!req.handled) resolve(self.autoPick(list, min, opts.prefer));
    });
  };
  P.autoPick = function (list, n, prefer) {
    var self = this;
    var val = function (c) {
      if (c.def.unplayable) return -10;
      if (prefer === 'sly' && c.def.onDiscard) return -5;
      var v = G.RARITIES.indexOf(c.def.rarity) * 2 + (c.def.type === 'attack' ? 1 : 0) + (c.def.basic ? -1 : 0);
      var cost = self.costOf(c);
      if (prefer === 'scry' && typeof cost === 'number' && cost > 2) v -= 2;
      return v;
    };
    return list.slice().sort(function (a, b) { return val(a) - val(b); }).slice(0, n);
  };
  P.discardCard = async function (inst, srcCtx) {
    var i = this.piles.hand.indexOf(inst);
    if (i < 0) return;
    this.piles.hand.splice(i, 1);
    D.resetTurn(inst);
    if (!inst.temp) this.piles.discard.push(inst);
    this.discardedTurn++;
    this.emit('cards:discard', { inst: inst });
    if (!this.over()) await this.relicEvent('discard');
    // 버려지면(소연 '그림자 비수' 등): 그 카드의 주인이 효과를 낸다
    if (inst.def.onDiscard && !this.over()) {
      this.emit('fx:text', { unit: this.casterOf(inst), text: inst.def.name + '!', kind: 'good' });
      await this.run(inst.def.onDiscard, { card: inst.def, inst: inst, src: this.casterOf(inst), target: null, isCard: true, defTarget: 'randomEnemy', pre: {},
        cardsBefore: this.cardsThisTurn, attacksBefore: this.attacksThisTurn });
    }
    if (!this.over()) await this.runHooks('onDiscard');
    this.update();
  };
  P.exhaustCard = async function (inst, played) {
    if (!played) {
      var i = this.piles.hand.indexOf(inst);
      if (i < 0) return;
      this.piles.hand.splice(i, 1);
      D.resetTurn(inst);
    }
    if (!inst.temp) this.piles.exhaust.push(inst);
    this.exhaustedBattle++;
    this.emit('cards:exhaust', { inst: inst });
    if (!this.over()) await this.relicEvent('exhaust');
    if (!this.over()) await this.runHooks('onExhaust');
    this.update();
  };
  // 뽑을 덱 맨 위 n장을 보고 원하는 만큼 버린다
  P.scry = async function (n) {
    var draw = this.piles.draw;
    if (draw.length < n && this.piles.discard.length) { this.piles.draw = G.rng.shuffle(this.piles.discard).concat(draw); this.piles.discard = []; draw = this.piles.draw; }
    var top = draw.slice(-n).reverse();
    if (!top.length) return;
    var picked = await this.pickCards({ cards: top, min: 0, max: top.length, title: '뽑을 덱 위 ' + top.length + '장 — 버릴 카드를 고른다', verb: '버리기', prefer: 'scry' });
    var self = this;
    picked.forEach(function (c) {
      var k = self.piles.draw.indexOf(c);
      if (k >= 0) { self.piles.draw.splice(k, 1); self.piles.discard.push(c); self.discardedTurn++; }
    });
    this.emit('cards:scry', { seen: top.length, dropped: picked.length });
    this.update();
  };

  // ================= 20단계: 적의 반응 =================
  // 반격 태세: 한 턴의 3·6·9번째 공격 카드마다 그 카드의 시전자(공용이면 무작위 아군)에게 피해
  // 주문 결계: 스킬·지속 카드를 쓸 때마다 보호막 / 시간의 모래: 한 턴에 그 수만큼 카드를 쓰면 턴이 끝나고 힘 +1
  P.reactions = async function (def, caster) {
    var mons = this.alive('enemy');
    for (var i = 0; i < mons.length && !this.over(); i++) {
      var m = mons[i];
      if (def.type === 'attack' && S.has(m, 'riposte') && this.attacksThisTurn % 3 === 0) {
        var who = caster && !caster.dead ? caster : this.pickHeroTarget();
        if (who) {
          this.emit('fx:text', { unit: m, text: '반격!', kind: 'bad' });
          await this.hit(m, who, S.get(m, 'riposte'), {}, this.monsterCtx(m));
        }
      }
      if ((def.type === 'skill' || def.type === 'power') && S.has(m, 'spellward')) this.addBlock(m, S.get(m, 'spellward'));
      if (S.has(m, 'sandglass') && this.cardsThisTurn >= S.get(m, 'sandglass') && !this.forceEnd) {
        this.forceEnd = true;
        S.add(this, m, 'strength', 1, m);
        this.emit('fx:text', { unit: m, text: '시간이 멈춘다!', kind: 'bad' });
      }
    }
  };
  // 서리 기운(서리 여왕): 턴 시작 시 손패 무작위 n장의 이번 턴 비용 +1
  P.frostAura = function () {
    var n = this.costUpNext || 0;   // 34단계: 적이 지난 턴에 건 '비용 올리기'
    this.costUpNext = 0;
    this.alive('enemy').forEach(function (m) { n += S.get(m, 'frostAura'); });
    if (!n) return;
    var cands = this.piles.hand.filter(function (c) { return !c.def.unplayable && c.def.cost !== 'X' && c.def.cost != null; });
    G.rng.shuffle(cands).slice(0, n).forEach(function (c) { c.costTurn = (c.costTurn != null ? c.costTurn : c.def.cost) + 1; c.frosted = true; });
    this.emit('fx:text', { text: '손이 얼어붙는다 — 카드 ' + Math.min(n, cands.length) + '장 비용 +1', kind: 'ice' });
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
  // 32단계: 지금 쓰면 연계 수가 몇이 되는가(바꾸지 않고 본다). 공용 카드는 이어진 수 그대로
  P.peekCombo = function (inst) {
    var o = inst.def.owner, ch = this.chain;
    if (o === 'common' || o === 'none' || o === 'duo' || !this.heroById(o)) return ch.count;
    return ch.last && ch.last !== o ? ch.count + 1 : 1;
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
    this.queueRelic('freeze');
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
      card: inst.def, combo: this.peekCombo(inst), prevOwner: this.chain.last, timesPlayed: this.tally.plays[inst.def.id] || 0 };
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
      // 34단계: 적이 쓰는 대상 — 체력 비율이 가장 낮은 적 · 자신을 뺀 적 · 무작위 아군
      case 'lowestMonster':
        var lm = this.alive('enemy').sort(function (a, b) { return a.hp / a.maxHp - b.hp / b.maxHp; })[0];
        return lm ? [lm] : [];
      case 'otherMonsters': return this.alive('enemy').filter(function (u) { return u !== ctx.src; });
      case 'randomAlly': var ra = G.rng.pick(this.alive('ally')); return ra ? [ra] : [];
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
      case 'attacksBattle': p = this.attacksBattle; break;
      case 'healedBattle': p = this.healedBattle; break;
      case 'exhaustedBattle': p = this.exhaustedBattle; break;
      case 'discardedTurn': p = this.discardedTurn; break;
      case 'drawPile': p = this.piles.draw.length; break;
      case 'selfRes': p = src ? src.res || 0 : 0; break;
      case 'hand': p = this.piles.hand.length; break;
      // 32단계: 연계 수 · 이번 턴 앞서 쓴 카드 수 · 이번 전투에서 이 카드를 앞서 쓴 횟수 · 살아 있는 적 수
      case 'combo': p = ctx.combo || 0; break;
      case 'cardsThisTurn': p = ctx.cardsBefore || 0; break;
      case 'timesPlayed': p = ctx.timesPlayed || 0; break;
      case 'enemyCount': p = this.alive('enemy').length; break;
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
      case 'attacksMod': return ctx.attacksBefore > 0 && (ctx.attacksBefore + 1) % c.n === 0;   // 이 카드가 이번 턴 n·2n·3n번째 공격 카드인가
      case 'discardedTurn': return U.cmp(this.discardedTurn, c.op, c.n);
      // 32단계: 연계형 · 자원 · 성장 조건
      case 'combo': return U.cmp(ctx.combo || 0, c.op, c.n);                                   // 연계 수(이 카드 포함)
      case 'prevOther': return !!(ctx.prevOwner && src && ctx.prevOwner !== src.id);           // 직전 동료 카드가 다른 동료의 것
      case 'prevOwner': return ctx.prevOwner === c.owner;                                     // 직전 동료 카드가 그 동료의 것
      case 'cardsThisTurn': return U.cmp(ctx.cardsBefore || 0, c.op, c.n);                     // 이번 턴 앞서 쓴 카드 수
      case 'selfRes': return src ? U.cmp(src.res || 0, c.op, c.n) : false;                    // 시전자의 고유 자원
      case 'timesPlayed': return U.cmp(ctx.timesPlayed || 0, c.op, c.n);                       // 이번 전투에서 이 카드를 앞서 쓴 횟수
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
          if (ctx.isCard && !ctx.inHook && list[i].side === 'ally') await this.runHooks('onBlockGain', { inHook: true });
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
          var got = await this.heal(list[i], n, { overflowToBlock: e.overflowToBlock || !!(stm && stm.overhealBlock) });
          if (got > 0 && ctx.isCard && ctx.src && ctx.src.id === 'sera') this.gainRes(ctx.src, 1);
        }
        return;

      case 'status':
        list = this.targets(spec, ctx);
        if (e.ifHas) list = list.filter(function (u) { return S.has(u, e.ifHas); });   // 22단계: 그 상태가 있는 대상에게만
        list.forEach(function (u) {
          var sv = self.num(e.value, ctx, u);
          if (ctx.pair && ctx.pair.statusAdd && ctx.pair.statusAdd[e.status] && u.side === 'enemy') sv += ctx.pair.statusAdd[e.status];
          S.add(self, u, e.status, sv, ctx.src);
          // 독 표식(소연): 소연의 카드가 적에게 중독을 걸면 표식 +1(최대 5)
          if (e.status === 'poison' && u.side === 'enemy' && !u.dead && ctx.src && ctx.src.id === 'nox') S.set(u, 'venomMark', Math.min(5, S.get(u, 'venomMark') + 1));
          if (u.side === 'enemy' && !u.dead && !ctx.isRelic && !ctx.isMonster && S.isDebuff(e.status)) self.queueRelic('enemyDebuff', { target: u });
        });
        this.update();
        return;

      case 'cleanse':
        list = this.targets(spec, ctx);
        list.forEach(function (u) {
          if (S.cleanse(u, e.all ? 'all' : e.count || 1)) {
            self.emit('fx:cleanse', { unit: u });
            if (ctx.isCard && ctx.src && ctx.src.id === 'sera') self.gainRes(ctx.src, 1);
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
      // 34단계: 적의 방해 — 다음 내 턴 손패 비용 올리기 · 에너지 줄이기 · 뽑기 줄이기, 자폭
      case 'costUp':
        n = e.value || 1;
        this.costUpNext = (this.costUpNext || 0) + n;
        this.emit('fx:text', { unit: ctx.src, text: '다음 턴 카드 ' + n + '장 비용 +1', kind: 'ice' });
        return;
      case 'drainEnergy':
        n = e.value || 1;
        this.nextEnergy -= n;
        this.emit('fx:text', { unit: ctx.src, text: '다음 턴 에너지 -' + n, kind: 'bad' });
        return;
      case 'drainDraw':
        n = e.value || 1;
        this.nextDraw -= n;
        this.emit('fx:text', { unit: ctx.src, text: '다음 턴 카드 -' + n + '장', kind: 'bad' });
        return;
      case 'selfDestruct':
        if (ctx.src && !ctx.src.dead) { ctx.src.revived = true; await this.die(ctx.src); }
        return;
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

      // 20단계: 버리기 · 소멸 · 미리 보기 · 상태 터뜨리기
      case 'discard': {
        var dh = this.piles.hand.filter(function (c) { return c !== ctx.inst; });
        n = Math.min(this.num(e.value || 1, ctx), dh.length);
        var dpick = e.random ? G.rng.shuffle(dh).slice(0, n) : await this.pickCards({ cards: dh, min: n, max: n, title: '버릴 카드 ' + n + '장을 고른다', verb: '버리기', prefer: 'sly' });
        for (i = 0; i < dpick.length && !this.over(); i++) await this.discardCard(dpick[i], ctx);
        return;
      }
      case 'exhaust': {
        var xh = this.piles.hand.filter(function (c) { return c !== ctx.inst; });
        n = Math.min(this.num(e.value || 1, ctx), xh.length);
        var xpick = await this.pickCards({ cards: xh, min: n, max: n, title: '소멸할 카드 ' + n + '장을 고른다', verb: '소멸' });
        for (i = 0; i < xpick.length && !this.over(); i++) await this.exhaustCard(xpick[i], false);
        return;
      }
      case 'scry': return this.scry(this.num(e.value, ctx));
      // 21단계: 고유 자원 얻기 · 모두 쓰기(시전자)
      case 'res':
        if (e.target) { var rl = this.targets(e.target, ctx); for (i = 0; i < rl.length; i++) this.gainRes(rl[i], this.num(e.value, ctx)); }
        else this.gainRes(ctx.src, this.num(e.value, ctx));
        this.update();
        return;
      case 'spendRes': ctx.spent = true; if (ctx.src && ctx.src.res) { ctx.src.res = 0; this.emit('hero:res', { unit: ctx.src }); } this.update(); return;
      case 'clearStatus':
        list = this.targets(spec, ctx);
        list.forEach(function (u) { S.set(u, e.status, 0); });
        this.update();
        return;
      case 'loseBlock':
        list = this.targets(spec, ctx);
        list.forEach(function (u) { u.block = 0; });
        this.update();
        return;

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
      if (src && src.id === 'kai' && src.res && !ctx.momentum) d += src.res;    // 검세
      if (src && src.id === 'ciel' && ctx.aim && !ctx.aimUsed) { d += ctx.aim * 3; ctx.aimUsed = true; }   // 조준(첫 공격만)
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
      else if (e.forceCrit || ctx.momentum || (cardAttack && m.turnFirstAttackCrit && ctx.firstAttackOfTurn)) crit = true;
      else if (src && S.has(src, 'focus')) { crit = true; S.dec(src, 'focus'); }
      else {
        var p = src ? src.crit + S.get(src, 'keen') * 0.1 : G.Data.COMMON_CRIT;
        crit = G.rng.chance(p + (e.critBonus || 0));
      }
    }
    if (crit) d *= 2 + (src ? S.get(src, 'critUp') * 0.5 : 0);
    if (src && src.tm && src.tm.frozenDmgMult && S.has(tgt, 'frozen')) d *= src.tm.frozenDmgMult;
    d = Math.min(Math.max(0, Math.floor(d)), this.hitCap(src, tgt));
    d = Math.max(0, d - S.get(tgt, 'reduce'));
    // 34단계: 엄호(같은 편이 하나라도 더 살아 있으면 받는 공격 피해 절반) · 회피(공격 1회를 통째로 피한다)
    if (S.has(tgt, 'shelter') && this.alive(tgt.side).some(function (u) { return u !== tgt; })) d = Math.floor(d / 2);
    if (S.has(tgt, 'dodge') && d > 0) {
      S.dec(tgt, 'dodge');
      this.emit('fx:text', { unit: tgt, text: '회피!', kind: 'info' });
      this.emit('fx:hit', { src: src, unit: tgt, amount: 0, blocked: 0, crit: false, dodged: true });
      this.update();
      await G.wait(T.hit);
      return { dealt: 0, blocked: 0, crit: false, killed: false, dodged: true };
    }
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
    var lava = S.get(tgt, 'lavaArmor') + (cardAttack ? S.get(tgt, 'scorch') : 0);
    if (src && src.side === 'ally' && tgt.side === 'enemy' && loss > this.tally.maxHit) this.tally.maxHit = loss;
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
    if (tgt.side === 'ally' && !tgt.dead && src && src.side === 'enemy' && (loss > 0 || blocked > 0)) await this.relicEvent('heroHit', { target: tgt });
    // 반격 자세(브리아): 적의 공격에 맞으면 쌓인 수 × 3을 되갚는다
    if (tgt.side === 'ally' && tgt.id === 'bram' && !tgt.dead && tgt.res > 0 && src && src.side === 'enemy' && !src.dead && !ctx.isCounter) {
      var cn = tgt.res * 3;
      tgt.res = 0;
      this.emit('fx:text', { unit: tgt, text: '반격!', kind: 'good' });
      this.emit('hero:res', { unit: tgt });
      await this.takeDamage(src, cn, { kind: 'thorns' });
    }
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
    var real = Math.min(n, u.hp);
    if (u.side === 'enemy') this.tally.dealt += real; else this.tally.taken += real;
    u.hp -= n;
    if (u.hp > 0) {
      // 34단계: 분열 — 체력이 기준 아래로 내려가면 남은 체력을 나눠 가진 작은 몬스터들로 갈라진다
      if (u.side === 'enemy' && u.def.split && !u.splitDone && u.hp <= u.maxHp * (u.def.split.hpBelow || 0.5)) { await this.split(u); return; }
      if (u.side === 'enemy') await this.checkTriggers(u);
      return;
    }
    // 기도의 응답(세라): 신앙이 가득 차 있으면 모두 써서 쓰러질 아군을 체력 20%로 버티게 한다
    var sera = u.side === 'ally' ? this.alive('ally').filter(function (h) { return h.id === 'sera' && h.res >= h.resMax && h.resMax; })[0] || (u.id === 'sera' && u.res >= u.resMax && u.resMax ? u : null) : null;
    if (sera) {
      sera.res = 0;
      u.hp = Math.max(1, Math.floor(u.maxHp * 0.2));
      this.emit('fx:revive', { unit: u });
      this.emit('fx:text', { unit: u, text: '기도의 응답!', kind: 'good' });
      this.emit('hero:res', { unit: sera });
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
      // 복수(20단계): 다른 몬스터가 쓰러지면 힘
      var self2 = this;
      this.alive('enemy').forEach(function (m) { if (S.has(m, 'vengeance')) { S.add(self2, m, 'strength', S.get(m, 'vengeance'), m); self2.emit('fx:text', { unit: m, text: '복수!', kind: 'bad' }); } });
      if (this.alive('enemy').length) await this.relicEvent('kill', { target: u });
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
    if (u.side === 'ally') this.healedBattle += real;
    var over = n - real;
    if (opts && opts.overflowToBlock && over > 0) this.addBlock(u, over);
    this.emit('fx:heal', { unit: u, n: real });
    if (u.side === 'ally') await this.runHooks('onHeal', { healed: u });
    return real;
  };

  P.tickDots = async function (u) {
    var p = S.get(u, 'poison');
    if (p > 0) { await this.loseHp(u, p + S.get(u, 'venomMark'), 'poison'); if (!u.dead) S.dec(u, 'poison'); }
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
    m.intent = m.def.ai === 'weighted' && !m.locked ? this.chooseMove(m) : m.pattern[m.pIndex % m.pattern.length];
    var move = this.moveOf(m);
    m.intentTarget = needsSingleTarget(move) ? this.pickHeroTarget() : null;
  };

  // 20단계: 가중치 행동 고르기. 같은 행동은 두 번까지 연달아, 조건(when)에 맞지 않는 행동은 빼고, 첫 행동은 패턴의 첫 칸
  P.moveOk = function (m, k) {
    var w = m.def.moves[k].when;
    if (!w) return true;
    switch (w.is) {
      case 'allies': return U.cmp(this.alive('enemy').length, w.op, w.n);
      case 'selfHp': return U.cmp(m.hp / m.maxHp, w.op, w.n);
      case 'heroBlock': return U.cmp(Math.max.apply(null, this.alive('ally').map(function (h) { return h.block; }).concat([0])), w.op, w.n);
      case 'turn': return U.cmp(this.turn + 1, w.op, w.n);
    }
    return true;
  };
  P.chooseMove = function (m) {
    var hist = m.history || (m.history = []), d = m.def, self = this;
    if (!hist.length && d.pattern && d.pattern.length) return d.pattern[0];
    var keys = Object.keys(d.moves).filter(function (k) { return self.moveOk(m, k); });
    var l = hist.length, rep = l >= 2 && hist[l - 1] === hist[l - 2] ? hist[l - 1] : null;
    var cand = keys.filter(function (k) { return k !== rep; });
    if (!cand.length) cand = keys.length ? keys : Object.keys(d.moves);
    var w = cand.map(function (k) { return (d.weights && d.weights[k]) || d.moves[k].weight || 1; }), total = w.reduce(function (a, b) { return a + b; }, 0);
    var roll = G.rng.next() * total;
    for (var i = 0; i < cand.length; i++) { roll -= w[i]; if (roll < 0) return cand[i]; }
    return cand[cand.length - 1];
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
  // 39단계(밸런스): 적 공격 1회가 동료 최대 체력의 일정 비율을 넘지 않는다(한 방에 쓰러지지 않게, data/stages.js 의 difficulty.hitCap)
  P.hitCap = function (src, tgt) {
    var cap = (G.Data.difficulty || {}).hitCap;
    if (!cap || !src || src.side !== 'enemy' || !tgt || tgt.side !== 'ally') return Infinity;
    var pct = cap[src.def && src.def.rank] || cap.normal;
    return Math.max(1, Math.floor(tgt.maxHp * pct));
  };
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
          // 상한: 노린 동료(전체 공격이면 가장 많이 맞을 동료) 기준
          var capT = allT ? Math.max.apply(null, self.alive('ally').map(function (u) { return self.hitCap(m, u); }).concat([0])) : m.intentTarget ? self.hitCap(m, m.intentTarget) : Infinity;
          info.dmg = Math.min(Math.floor(d), capT || Infinity);
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
    (m.history || (m.history = [])).push(m.intent);
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
      if (t.pattern) { m.pattern = t.pattern.slice(); m.pIndex = 0; m.locked = true; this.predict(m); }
      if (t.everyTurn) m.everyTurn = m.everyTurn.concat(t.everyTurn);
      this.update();
    }
  };

  P.split = async function (u) {
    var sp = u.def.split, n = sp.count || 2, hp = Math.max(1, Math.ceil(u.hp / n));
    u.splitDone = true;
    this.emit('fx:text', { unit: u, text: '분열!', kind: 'bad' });
    await G.wait(T.act);
    var idx = this.monsters.indexOf(u);
    u.hp = 0; u.dead = true; u.block = 0; u.status = {}; u.vanished = true;
    this.kills.push(u.id);
    this.emit('fx:death', { unit: u, split: true });
    var room = Math.max(1, MAX_MONSTERS - this.alive('enemy').length);
    for (var i = 0; i < Math.min(n, room); i++) {
      var m = makeMonster(sp.into, null, this.opts.stage, this.em);
      m.maxHp = m.hp = hp;
      this.monsters.splice(idx + 1 + i, 0, m);
      this.predict(m);
      this.emit('monster:summon', { unit: m, by: u, split: true });
    }
    this.update();
    await G.wait(T.act);
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
