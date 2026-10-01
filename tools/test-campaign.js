// tools/test-campaign.js — 진행(갈림길·보상·상점·휴식·강화·이벤트·합류·저장) 자동 테스트 (개발 전용)
// 실행: node tools/test-campaign.js [캠페인 횟수]
// 간단한 AI가 전투를 하고, 같은 스테이지에서 3번 지면 적을 즉사시켜 흐름을 끝까지 확인한다.
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
global.window = global;
['js/core.js', 'data/keywords.js', 'data/characters.js', 'data/cards.js', 'data/monsters.js', 'data/stages.js', 'data/relics.js',
 'data/upgrades.js', 'data/events.js', 'js/status.js', 'js/deck.js', 'js/upgrade.js', 'js/battle.js', 'js/save.js', 'js/stage.js'].forEach(f => {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
});
const G = global.Game, St = G.Stage, D = G.Data;
G.instant = true;

let failures = 0;
function check(cond, msg) { if (!cond) { failures++; console.log('  실패: ' + msg); } }

// 아주 단순한 AI: 쓸 수 있는 카드 중 무작위, 대상은 체력이 가장 낮은 적 / 가장 다친 아군
async function autoBattle(b) {
  await b.start();
  let guard = 0;
  while (!b.over() && b.turn < 60 && guard++ < 3000) {
    const opts = b.piles.hand.filter(c => b.canPlay(c).ok && (!b.needsTarget(c) || b.validTargets(c).length));
    if (!opts.length) { await b.endTurn(); continue; }
    const c = G.rng.pick(opts);
    let t = null;
    if (b.needsTarget(c)) {
      const v = b.validTargets(c);
      t = v.sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
    }
    await b.play(c, t);
  }
  if (!b.over()) await b.debugKillAll(); // 끝나지 않는 전투는 정리
}

function invariants(where) {
  const d = St.data, e = D.economy;
  check(d.gold >= 0, where + ': 골드 음수');
  check(new Set(d.cards).size === d.cards.length, where + ': 카드 중복 보유');
  Object.keys(d.decks).forEach(o => {
    check(d.decks[o].length <= e.deckMax, where + ': ' + o + ' 덱 ' + d.decks[o].length + '장 > 최대');
    d.decks[o].forEach(id => check(d.cards.includes(id), where + ': 덱에 미보유 카드 ' + id));
  });
  check(d.party.length >= 1 && d.party.length <= 3, where + ': 파티 인원');
  d.party.forEach(id => check(d.characters.includes(id), where + ': 파티에 미합류 캐릭터'));
  d.upgraded.forEach(id => check(d.cards.includes(id), where + ': 미보유 카드 강화 ' + id));
  check(new Set(d.upgraded).size === d.upgraded.length, where + ': 강화 중복');
  d.buffs.forEach(b => check(b.battles > 0, where + ': 다 쓴 이벤트 효과가 남음'));
  if (d.run) {
    check(d.run.col < d.run.map.length, where + ': 열 번호');
    d.run.path.forEach((i, c) => check(i == null || d.run.map[c][i], where + ': 고른 길이 없음'));
  }
  if (d.run) Object.keys(d.run.hp).forEach(id => {
    const max = D.characters.find(c => c.id === id).hp;
    check(d.run.hp[id] > 0 && d.run.hp[id] <= max, where + ': ' + id + ' 체력 ' + d.run.hp[id]);
  });
  // 저장 → 불러오기 왕복
  const before = JSON.stringify(d);
  St.save();
  const loaded = G.Save.load();
  check(JSON.stringify(Object.assign({}, loaded, { version: d.version })) === before, where + ': 저장/불러오기 결과가 다름');
}

(async () => {
  const N = +(process.argv[2] || 3);
  let totalBattles = 0, losses = 0, kills = 0, bought = 0, rests = 0, shops = 0, ups = 0, mirrors = 0, eventFights = 0;
  const eventsSeen = new Set(), typesSeen = new Set();
  const useUpgrades = () => {
    while (St.data.run.upgrades) {
      const list = St.upgradable();
      if (!list.length) { St.skipUpgrade(); break; }
      const id = G.rng.pick(list);
      check(St.upgradeCard(id) && St.isUpgraded(id), '카드 강화 ' + id);
      check(St.battleDeck(St.data.party).every(x => !St.isUpgraded(G.Upgrade.baseOf(x)) || x.endsWith('+')), '전투 덱에 강화 카드가 들어감');
      ups++;
    }
  };
  for (let run = 0; run < N; run++) {
    G.rng.seed(77 + run);
    G.Save.clear();
    St.newGame();
    check(St.data.cards.length === 23, '새 게임 보유 카드 23장 (' + St.data.cards.length + ')');
    check(St.data.decks.kai.length === 8 && St.data.decks.common.length === 15, '시작 덱 카이 8 + 공용 15');
    invariants('새 게임');

    for (let n = 1; n <= 10; n++) {
      check(St.canEnter(n), n + ' 스테이지 입장 가능');
      if (n < 10) check(!St.canEnter(n + 1), (n + 1) + ' 스테이지는 아직 잠김');
      // 파티: 합류한 캐릭터 중 앞의 3명
      St.setParty(St.data.characters.slice(-3));
      St.startStage(n);
      let tries = 0, done = false;
      while (!done) {
        if (!St.node()) {
          const ch = St.choices();
          check(ch.length >= 1 && ch.length <= 2, '갈림길 노드 1~2개');
          // 이벤트를 자주 고르게 해서 15종을 고루 지나가게 한다
          const ev = ch.findIndex(x => x.type === 'event');
          check(St.choose(ev >= 0 ? ev : G.rng.int(0, ch.length - 1)), '갈림길 선택');
          check(!St.choose(0), '고른 길은 바꿀 수 없다');
          continue;
        }
        const node = St.node();
        typesSeen.add(node.type);
        let clearInfo = null, handled = true;
        if (node.type === 'rest') {
          if (G.rng.next() < 0.5) { rests++; clearInfo = St.rest(); }
          else { St.restUpgrade(); useUpgrades(); clearInfo = St.advance(); }
        } else if (node.type === 'shop') {
          shops++;
          const s = St.openShop();
          check(s.cards.length <= D.economy.shopSize, '상점 진열 5장 이하');
          s.cards.slice().forEach(id => { if (St.data.gold >= St.price(id) && St.buy(id)) bought++; });
          if (St.data.gold >= D.economy.refreshCost) check(St.shopRefresh(), '진열 새로고침');
          if (St.data.gold >= D.economy.healCost) check(St.shopHeal(), '치료') ;
          check(!St.shopHeal(), '치료는 한 번만');
          clearInfo = St.leaveShop();
        } else if (node.type === 'event' && !(node.result && node.result.fight)) {
          const ev = St.eventDef();
          eventsSeen.add(ev.id);
          const okChoices = ev.choices.map((c, i) => i).filter(i => St.canChoose(ev.choices[i]));
          const res = St.eventChoose(okChoices.includes(0) && G.rng.chance(0.75) ? 0 : G.rng.pick(okChoices));
          check(res && St.node().result === res, '이벤트 결과 저장');
          check(!St.eventChoose(0), '이벤트는 한 번만 고른다');
          if (res.cards) { const id = res.cards[0]; St.eventTakeCard(id); check(St.owns(id), '이벤트 카드 획득'); }
          useUpgrades();
          if (res.fight) { eventFights++; continue; }
          clearInfo = St.eventFinish();
        } else handled = false;
        if (handled) {
          invariants('스테이지 ' + n + ' ' + node.type + ' 뒤');
          if (clearInfo) done = true;
          continue;
        }
        const opts = St.battleOptions();
        check(opts.deck.length >= 12, '전투 덱 12장 이상 (' + opts.deck.length + ')');
        if (opts.monsters.some(id => D.monsterById[id].mirror)) mirrors++;
        const b = G.Battle.create(opts);
        if (tries >= 3) { await b.start(); await b.debugKillAll(); kills++; }
        else await autoBattle(b);
        totalBattles++;
        if (b.result === 'win') {
          const res = St.battleWon(b);
          if (res.ending) {
            check(n === 10, '엔딩은 10 스테이지에서만');
            check(St.data.flags.ended && St.data.clearedStage === 10 && !St.data.run, '엔딩 후 상태');
            done = true;
            break;
          }
          const p = St.data.run.pending;
          check(p && p.cards.length + p.fill === 3, '보상 후보 3자리');
          p.cards.forEach(id => check(!St.owns(id), '보상에 이미 가진 카드 ' + id));
          if (p.kind === 'boss') p.cards.forEach(id => check(['rare', 'epic', 'legendary'].includes(D.cardById[id].rarity), '보스 보상은 희귀 이상 (' + id + ')'));
          if (p.kind === 'elite') p.cards.forEach(id => check(D.cardById[id].rarity !== 'common', '정예 보상은 고급 이상 (' + id + ')'));
          if (p.relic) check(D.relicById[p.relic], '정예 유물 ID (' + p.relic + ')');
          if (p.relicChoice) {
            check(p.relicChoice.length && p.relicChoice.every(id => typeof id === 'string' && D.relicById[id]), '보스 유물 후보는 유물 ID (' + JSON.stringify(p.relicChoice) + ')');
            if ([4, 8].includes(n)) check(p.relicChoice.some(id => D.relicById[id].rarity === 'boss'), n + ' 스테이지 보스는 보스 유물 후보');
            const want = p.relicChoice[0];
            check(St.takeRelic(want) && St.hasRelic(want), '보스 유물 고르기');
          }
          const pick = G.rng.next() < 0.85 ? p.cards[0] : null;
          const clear = St.takeReward(pick);
          if (pick) check(St.owns(pick), '보상 카드 획득');
          if (clear) {
            check(clear.stage === n && clear.first, '첫 클리어 정보');
            const def = St.stageDef(n);
            if (def.join) {
              check(clear.joined === def.join && St.data.characters.includes(def.join), def.join + ' 합류');
              check(St.data.decks[def.join].length === 8, def.join + ' 기본 덱 8장');
            }
            done = true;
          }
          invariants('스테이지 ' + n + ' 보상 뒤');
        } else {
          losses++; tries++;
          const goldBefore = St.data.gold, cardsBefore = St.data.cards.length;
          St.battleLost(b);
          check(St.data.run.col === 0 && St.data.gold === goldBefore && St.data.cards.length === cardsBefore, '패배 → 처음부터, 카드·골드 유지');
          invariants('스테이지 ' + n + ' 패배 뒤');
        }
      }
    }
    check(St.data.characters.length === 5, '5명 모두 합류');
    // 클리어한 스테이지 재도전: 합류는 다시 일어나지 않는다
    St.startStage(2);
    check(St.data.run.replay, '재도전 표시');
    St.abandon();
    check(!St.data.run, '스테이지 포기');
    const seen = Object.keys(St.data.codex.monsters).length;
    check(seen >= 20, '도감에 만난 몬스터 기록 (' + seen + ')');
  }

  if (N >= 3) {
    check(eventsSeen.size === 15, '이벤트 15종 모두 등장 (' + eventsSeen.size + ')');
    ['battle', 'elite', 'event', 'rest', 'shop', 'boss', 'midboss', 'final'].forEach(t => check(typesSeen.has(t), '노드 종류 등장: ' + t));
  }

  // 저장 v1 → v2: 진행 중인 스테이지는 지우고 카드·골드·동료·유물은 유지
  const v1 = { version: 1, gold: 77, clearedStage: 3, characters: ['kai', 'bram'], party: ['kai'], cards: ['K01', 'C01'], decks: { kai: ['K01'], common: ['C01'] },
    relics: ['R01'], run: { stage: 4, node: 1, nodes: [{ type: 'battle' }], hp: { kai: 50 } }, codex: { monsters: {} }, flags: {} };
  const m2 = G.Save.sanitize(G.Save.migrate(JSON.parse(JSON.stringify(v1))));
  check(m2.version === 2 && m2.run === null && m2.gold === 77 && m2.cards.length === 2 && m2.relics[0] === 'R01', 'v1 → v2 마이그레이션');
  check(Array.isArray(m2.upgraded) && m2.growth && m2.bonds && m2.ascension && Array.isArray(m2.buffs), 'v2 기본값');

  // 마이그레이션·정리: 알 수 없는 카드 ID 는 버린다
  St.data.cards.push('ZZZ99');
  St.data.decks.common.push('ZZZ99');
  St.save();
  const cleaned = G.Save.load();
  check(!cleaned.cards.includes('ZZZ99') && !cleaned.decks.common.includes('ZZZ99'), '알 수 없는 카드 ID 제거');

  console.log('캠페인 ' + N + '회 · 전투 ' + totalBattles + ' · AI 패배 ' + losses + ' · 강제 승리 ' + kills +
    ' · 상점 ' + shops + '(구매 ' + bought + ') · 휴식 ' + rests + ' · 강화 ' + ups + ' · 이벤트 ' + eventsSeen.size + '종(전투 ' + eventFights + ') · 그림자 ' + mirrors);
  console.log(failures ? '실패 ' + failures + '건' : '모든 테스트 통과');
  process.exit(failures ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
