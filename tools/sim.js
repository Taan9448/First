// tools/sim.js — 밸런스 시뮬레이터 (개발 전용, 게임에서 로드하지 않음)
// 간단한 판단 규칙 AI가 캠페인 전체를 반복 플레이하고 스테이지별 시도 횟수와 실패 지점을 보고한다.
// 실행: node tools/sim.js [캠페인 횟수=12] [시드=1]
//
// AI 규칙
//  - 카드 점수 = 예상 피해(처치 보너스) + 막아야 할 만큼의 보호막 + 잃은 체력만큼의 회복 + 드로우·에너지·상태 가치
//  - 에너지 1당 점수가 높은 카드부터 쓴다. 단일 공격은 처치 가능한 적 → 체력이 낮은 적 순서로 노린다
//  - 보상은 높은 등급 우선, 휴식/상점은 평균 체력 60% 미만이면 휴식, 아니면 상점에서 높은 등급부터 산다
//  - 덱은 카드를 얻을 때마다 자동 구성, 파티는 캠페인마다 정한 선호 순서로 3명
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
global.window = global;
['js/core.js', 'data/keywords.js', 'data/characters.js', 'data/cards.js', 'data/monsters.js', 'data/stages.js',
 'js/status.js', 'js/deck.js', 'js/battle.js', 'js/save.js', 'js/stage.js'].forEach(f => {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
});
const G = global.Game, St = G.Stage, D = G.Data, S = G.Status;
G.instant = true;

const MAX_TRIES = 8;
const PARTY_ORDERS = [
  ['kai', 'bram', 'lyra', 'sera', 'nox'],
  ['bram', 'sera', 'kai', 'lyra', 'nox'],
  ['kai', 'lyra', 'nox', 'bram', 'sera'],
  ['bram', 'kai', 'sera', 'nox', 'lyra']
];

// ---------------------------------------------------------------- 카드 가치 추정
function avg(v, b, ctx, tgt) {
  if (Array.isArray(v)) return (v[0] + v[1]) / 2;
  return b.num(v, ctx, tgt);
}

function estimate(b, inst, target) {
  const def = inst.def, caster = b.casterOf(inst);
  const cost = b.costOf(inst);
  const ctx = { src: caster, target, x: cost === 'X' ? b.energy : 0, attacksBefore: b.attacksThisTurn, cardsBefore: b.cardsThisTurn,
    lastType: b.lastType, card: def, pre: target ? Object.assign({}, target.status) : {}, preview: { hand: b.piles.hand.length - 1, energy: cost === 'X' ? 0 : b.energy - cost } };
  const r = { dmg: 0, kill: 0, block: 0, heal: 0, util: 0 };
  const enemies = b.alive('enemy');
  const str = caster ? S.get(caster, 'strength') + S.get(caster, 'tempStr') : 0;
  const weak = caster && S.has(caster, 'weak') ? 0.75 : 1;
  const crit = caster ? 1 + caster.crit + S.get(caster, 'keen') * 0.1 : 1.05;

  function walk(list, mult) {
    list.forEach(e => {
      const spec = e.target || def.target;
      switch (e.op) {
        case 'damage': {
          const times = avg(e.times == null ? 1 : e.times, b, ctx, target);
          const tg = spec === 'allEnemies' ? enemies : spec === 'randomEnemy' ? [enemies[0]] : target ? [target] : [];
          tg.forEach(t => {
            if (!t) return;
            let d = (avg(e.value, b, ctx, t) + str) * weak * (S.has(t, 'vulnerable') ? 1.5 : 1) * (e.forceCrit ? 2 : crit);
            d = Math.max(0, d - S.get(t, 'reduce')) * times;
            const through = Math.max(0, d - (e.breakBlock ? 0 : t.block));
            r.dmg += Math.min(through, t.hp) * mult * (spec === 'randomEnemy' ? 1 : 1);
            if (through >= t.hp) r.kill += mult;
          });
          break;
        }
        case 'block': {
          const tg = spec === 'allAllies' ? b.alive('ally') : spec === 'self' ? [caster].filter(Boolean) : target ? [target] : [];
          tg.forEach(h => { r.block += Math.min(avg(e.value, b, ctx, h), need(b, h)) * mult; r.util += 0.3 * mult; });
          break;
        }
        case 'heal': {
          const tg = spec === 'allAllies' ? b.alive('ally') : spec === 'lowestAlly' ? [b.alive('ally').sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]] : target ? [target] : [];
          tg.forEach(h => { if (h) r.heal += Math.min(e.pct ? h.maxHp * e.pct : avg(e.value, b, ctx, h), h.maxHp - h.hp) * mult; });
          break;
        }
        case 'status': {
          const v = avg(e.value, b, ctx, target) * mult;
          const debuff = S.isDebuff(e.status) || e.status === 'randomDebuff';
          const n = spec === 'allEnemies' || spec === 'allAllies' ? (spec === 'allEnemies' ? enemies.length : b.alive('ally').length) : 1;
          const w = { poison: 1.2, burn: 1.2, weak: 3, vulnerable: 3, chill: 2, frozen: 8, stun: 8, strength: 4, tempStr: 1.5,
            focus: 4, keen: 3, critUp: 3, regen: 1.5, thorns: 2, thornsTemp: 1, taunt: 2, guardian: 6, reduce: 6, hold: 3, fortress: 10, affinity: 4 }[e.status] || 1.5;
          r.util += v * w * n * (debuff ? 1 : 1);
          break;
        }
        case 'draw': r.util += avg(e.value, b, ctx) * 3 * mult; break;
        case 'energy': r.util += avg(e.value, b, ctx) * (e.nextTurn ? 4 : 5) * mult; break;
        case 'power': r.util += 10 * mult; break;
        case 'if': walk(b.evalCond(e.cond, ctx, target) ? e.then : e.else || [], mult); break;
        case 'chance': walk(e.then, mult * 0.5); walk(e.else, mult * 0.5); break;
        case 'oneOf': e.options.forEach(o => walk(o.effects, mult / e.options.length)); break;
        case 'revive': r.heal += 40 * mult; break;
        case 'conjure': r.util += 8 * (e.count || 1) * mult; break;
        case 'cleanse': r.util += 2 * mult; break;
        case 'loseHp': r.heal -= avg(e.value, b, ctx) * mult; break;
        default: r.util += 3 * mult;
      }
      ['onHit', 'onCrit', 'onKill'].forEach(k => { if (e[k]) walk(e[k], mult * 0.3); });
    });
  }
  walk(def.effects, 1);
  return r;
}

// 이번 적 턴에 이 아군이 받을 것으로 보이는 피해 중 보호막이 막지 못하는 양
function need(b, h) {
  let incoming = 0;
  b.alive('enemy').forEach(m => {
    if (S.has(m, 'frozen') || S.has(m, 'stun')) return;
    const info = b.intentInfo(m);
    if (info.dmg == null) return;
    if (info.all || info.target === h) incoming += info.dmg * info.times;
  });
  return Math.max(0, incoming - h.block);
}

function score(b, inst, target) {
  const e = estimate(b, inst, target);
  const danger = b.alive('ally').reduce((s, h) => s + need(b, h), 0) > 0 ? 1.3 : 0.4;
  return e.dmg + e.kill * 12 + e.block * danger + e.heal * 0.9 + e.util;
}

function bestTarget(b, inst) {
  const list = b.validTargets(inst);
  if (!list.length) return null;
  let best = null, bs = -1e9;
  list.forEach(t => {
    const s = score(b, inst, t) + (t.side === 'enemy' ? (1 - t.hp / t.maxHp) * 2 : 0);
    if (s > bs) { bs = s; best = t; }
  });
  return best;
}

async function playTurn(b) {
  for (let guard = 0; guard < 25 && b.phase === 'player' && !b.over(); guard++) {
    let pick = null, pickT = null, best = 0.5;
    b.piles.hand.forEach(c => {
      if (!b.canPlay(c).ok) return;
      const t = b.needsTarget(c) ? bestTarget(b, c) : null;
      if (b.needsTarget(c) && !t) return;
      const cost = b.costOf(c);
      const per = score(b, c, t) / Math.max(0.6, cost === 'X' ? Math.max(1, b.energy) : cost);
      if (per > best) { best = per; pick = c; pickT = t; }
    });
    if (!pick) break;
    await b.play(pick, pickT);
  }
}

async function fight(b) {
  await b.start();
  while (!b.over() && b.turn < 50) {
    await playTurn(b);
    if (!b.over()) await b.endTurn();
  }
  return b.result || 'timeout';
}

// ---------------------------------------------------------------- 캠페인
function rarityIdx(id) { return G.RARITIES.indexOf(D.cardById[id].rarity); }
function rebuildDecks() { const d = St.data; d.characters.concat(['common']).forEach(o => { d.decks[o] = St.autoBuild(o); }); }
function chooseParty(order) { St.setParty(order.filter(id => St.data.characters.includes(id)).slice(0, 3)); }

async function campaign(seed, order) {
  G.rng.seed(seed);
  G.Save.clear();
  St.newGame();
  const out = [];
  for (let n = 1; n <= 10; n++) {
    const rec = { stage: n, tries: 0, lostAt: [], turns: [], forced: false };
    chooseParty(order);
    St.startStage(n);
    let done = false;
    while (!done) {
      const node = St.node();
      if (node.type === 'rest') {
        const d = St.data, hp = d.characters.map(id => d.run.hp[id] / D.characters.find(c => c.id === id).hp);
        const next = St.data.run.nodes[St.data.run.node + 1];
        const limit = next && next.type !== 'battle' ? 0.8 : 0.6; // 보스·정예 앞에서는 더 쉽게 쉰다
        if (hp.reduce((a, b) => a + b, 0) / hp.length < limit) St.rest();
        else {
          const s = St.openShop();
          s.cards.slice().sort((a, b) => rarityIdx(b) - rarityIdx(a)).forEach(id => { if (St.data.gold - St.price(id) >= 0) St.buy(id); });
          St.leaveShop();
          rebuildDecks();
        }
        continue;
      }
      const b = G.Battle.create(St.battleOptions());
      let result;
      if (rec.tries >= MAX_TRIES) { await b.start(); await b.debugKillAll(); result = 'win'; rec.forced = true; }
      else result = await fight(b);
      if (result === 'win') {
        rec.turns.push(b.turn);
        const res = St.battleWon(b);
        if (res.ending) { done = true; break; }
        const p = St.data.run.pending;
        const pick = p.cards.slice().sort((a, b) => rarityIdx(b) - rarityIdx(a))[0] || null;
        const clear = St.takeReward(pick);
        rebuildDecks();
        if (clear) done = true;
      } else {
        rec.tries++;
        rec.lostAt.push(node.type + (result === 'timeout' ? '(시간초과)' : ''));
        const left = b.monsters.filter(m => m.def.rank !== 'normal' || node.type === 'battle');
        rec.left = (rec.left || []).concat([left.reduce((a, m) => a + Math.max(0, m.hp), 0) / left.reduce((a, m) => a + m.maxHp, 0)]);
        rec.lostTurn = (rec.lostTurn || []).concat([b.turn]);
        St.battleLost(b);
      }
    }
    out.push(rec);
  }
  return out;
}

(async () => {
  const N = +(process.argv[2] || 12), seed0 = +(process.argv[3] || 1);
  const stats = [];
  for (let n = 1; n <= 10; n++) stats.push({ attempts: 0, first: 0, within3: 0, forced: 0, lost: {}, turns: [], left: [], lostTurn: [] });
  const byOrder = PARTY_ORDERS.map(() => ({ runs: 0, fails: 0 }));
  for (let i = 0; i < N; i++) {
    const oi = i % PARTY_ORDERS.length;
    const res = await campaign(seed0 * 1000 + i, PARTY_ORDERS[oi]);
    byOrder[oi].runs++;
    res.forEach((r, k) => {
      const s = stats[k];
      s.attempts += r.tries + 1;
      if (r.tries === 0) s.first++;
      if (r.tries <= 2) s.within3++;
      if (r.forced) s.forced++;
      r.lostAt.forEach(t => { s.lost[t] = (s.lost[t] || 0) + 1; });
      s.turns = s.turns.concat(r.turns);
      s.left = s.left.concat(r.left || []);
      s.lostTurn = s.lostTurn.concat(r.lostTurn || []);
      byOrder[oi].fails += r.tries;
    });
  }
  const pad = (v, w) => String(v).padStart(w);
  console.log('캠페인 ' + N + '회 (AI 기준, 시드 ' + seed0 + ')');
  console.log('스테이지 | 평균 시도 | 첫 시도 클리어 | 3번 안에 | 강제 | 평균 턴 | 진 곳');
  stats.forEach((s, k) => {
    const lost = Object.keys(s.lost).map(t => t + ' ' + s.lost[t]).join(', ') || '-';
    const turns = s.turns.length ? (s.turns.reduce((a, b) => a + b, 0) / s.turns.length).toFixed(1) : '-';
    const left = s.left.length ? ' (질 때 적 체력 평균 ' + Math.round(s.left.reduce((a, b) => a + b, 0) / s.left.length * 100) + '%, ' +
      (s.lostTurn.reduce((a, b) => a + b, 0) / s.lostTurn.length).toFixed(1) + '턴)' : '';
    console.log(pad(k + 1, 6) + '   | ' + pad((s.attempts / N).toFixed(2), 8) + ' | ' + pad(Math.round(s.first / N * 100) + '%', 13) +
      ' | ' + pad(Math.round(s.within3 / N * 100) + '%', 7) + ' | ' + pad(s.forced, 4) + ' | ' + pad(turns, 6) + ' | ' + lost + left);
  });
  console.log('\n파티 선호 순서별 총 패배 수');
  byOrder.forEach((o, i) => console.log('  ' + PARTY_ORDERS[i].slice(0, 3).join('/') + ' 우선: 캠페인 ' + o.runs + '회, 패배 ' + o.fails));
})().catch(err => { console.error(err); process.exit(1); });
