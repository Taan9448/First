// tools/test-campaign.js — 진행(갈림길·보상·상점·휴식·강화·이벤트·합류·저장) 자동 테스트 (개발 전용)
// 실행: node tools/test-campaign.js [캠페인 횟수]
// 간단한 AI가 전투를 하고, 같은 스테이지에서 3번 지면 적을 즉사시켜 흐름을 끝까지 확인한다.
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
global.window = global;
['js/core.js', 'data/keywords.js', 'data/characters.js', 'data/cards.js', 'data/monsters.js', 'data/stages.js', 'data/relics.js', 'data/items.js',
 'data/upgrades.js', 'data/events.js', 'data/bonds.js', 'data/traits.js', 'data/ascension.js', 'data/modes.js', 'data/story.js', 'data/achievements.js', 'js/status.js', 'js/deck.js', 'js/upgrade.js', 'js/battle.js', 'js/save.js', 'js/stage.js', 'js/profile.js'].forEach(f => {
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
    if (d.run && d.run.decks) check(St.runDeckList().length >= e.runDeckMin || St.runDeckList().length >= 10, where + ': 스테이지 덱이 너무 적다');
    d.decks[o].forEach(id => check(d.cards.includes(id), where + ': 덱에 미보유 카드 ' + id));
  });
  check(d.party.length >= 1 && d.party.length <= 3, where + ': 파티 인원');
  d.party.forEach(id => check(d.characters.includes(id), where + ': 파티에 미합류 캐릭터'));
  check(d.upgraded && typeof d.upgraded === 'object' && !Array.isArray(d.upgraded), where + ': 강화 단계 표 형식');
  Object.keys(d.upgraded).forEach(id => {
    check(d.cards.includes(id), where + ': 미보유 카드 강화 ' + id);
    check(d.upgraded[id] >= 1 && d.upgraded[id] <= G.Upgrade.MAX, where + ': 강화 단계 ' + id + '=' + d.upgraded[id]);
  });
  d.buffs.forEach(b => check(b.battles > 0, where + ': 다 쓴 이벤트 효과가 남음'));
  d.characters.forEach(id => check(St.growthOf(id).traits.length <= St.levelOf(id), where + ': ' + id + ' 특성이 레벨보다 많음'));
  if (d.run) {
    check(d.run.col < d.run.map.length, where + ': 열 번호');
    d.run.path.forEach((i, c) => check(i == null || d.run.map[c][i], where + ': 고른 길이 없음'));
  }
  if (d.run) Object.keys(d.run.hp).forEach(id => {
    const max = St.maxHp(id);
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
  let totalBattles = 0, losses = 0, kills = 0, bought = 0, rests = 0, shops = 0, ups = 0, mirrors = 0, eventFights = 0, traitsPicked = 0, talks = 0, treasures = 0, ambushes = 0;
  const eventsSeen = new Set(), typesSeen = new Set();
  const useUpgrades = () => {
    while (St.data.run.upgrades) {
      const list = St.upgradable();
      if (!list.length) { St.skipUpgrade(); break; }
      const id = G.rng.pick(list);
      const lv = St.upLevel(id);
      check(St.upgradeCard(id) && St.upLevel(id) === lv + 1, '카드 강화 ' + id + ' ' + lv + ' → ' + (lv + 1));
      check(St.battleDeck(St.data.party).every(x => G.Upgrade.levelOf(x) === St.upLevel(G.Upgrade.baseOf(x)) && D.cardById[x]), '전투 덱에 강화 단계가 맞는 카드가 들어감');
      ups++;
    }
  };
  for (let run = 0; run < N; run++) {
    G.rng.seed(77 + run);
    G.Save.clear();
    St.newGame();
    check(St.data.cards.length === 23, '새 게임 보유 카드 23장 (' + St.data.cards.length + ')');
    check(St.data.decks.kai.length === 5 && St.data.decks.common.length === 5, '시작 준비 덱 하린 5 + 공용 5');
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
          check(ch.length >= 1 && ch.length <= 4, '갈림길 노드 1~4개');
          check(St.choiceIdx().every(j => j >= 0 && j < St.data.run.map[St.data.run.col].length), '갈 수 있는 방 번호');
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
          const talk = St.pendingTalk();
          if (talk) {
            const bond0 = St.data.bonds[talk.key] || 0, seen0 = St.data.talks[talk.key] || 0;
            check(talk.lines.length >= 3 && bond0 >= D.bondLevels[talk.index], '대화 조건(친밀도 단계)');
            St.finishTalk(talk.key);
            talks++;
            check(St.data.bonds[talk.key] === bond0 + D.bondGain.talk && St.data.talks[talk.key] === seen0 + 1, '대화: 친밀도 +3, 본 대화 수 +1');
            check(!St.pendingTalk(), '휴식 노드마다 대화는 한 번');
          }
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
        } else if (node.type === 'treasure' && !(node.result && node.result.ambush)) {
          const g0 = St.data.gold, res = St.openTreasure();
          treasures++;
          if (res.ambush) { ambushes++; check(node.fight && node.fight.monsters.length, '매복 전투'); continue; }
          check(St.data.gold === g0 + res.gold, '보물 골드');
          if (res.relic) check(St.hasRelic(res.relic), '보물 유물');
          clearInfo = St.leaveTreasure();
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
        check(opts.deck.length >= 10, '전투 덱 10장 이상 (' + opts.deck.length + ')');
        if (opts.monsters.some(id => D.monsterById[id].mirror)) mirrors++;
        const b = G.Battle.create(opts);
        if (tries >= 3) { await b.start(); await b.debugKillAll(); kills++; }
        else await autoBattle(b);
        totalBattles++;
        if (b.result === 'win') {
          const party = b.heroes.map(h => h.id);
          const exp0 = party.map(id => St.growthOf(id).exp);
          const res = St.battleWon(b);
          check(party.every((id, i) => St.growthOf(id).exp > exp0[i]), '이긴 전투마다 경험치');
          let pend;
          while ((pend = St.pendingTrait())) {
            const hpBefore = St.data.run ? St.data.run.hp[pend.id] : null, max0 = St.maxHp(pend.id);
            const pick = G.rng.int(0, 1);
            check(St.chooseTrait(pend.id, pick), '특성 고르기');
            traitsPicked++;
            const add = pend.options[pick].mods.maxHp || 0;
            check(St.maxHp(pend.id) === max0 + add, '특성 최대 체력 반영');
            if (St.data.run && hpBefore != null) check(St.data.run.hp[pend.id] === hpBefore + add, '최대 체력이 늘면 지금 체력도');
          }
          if (res.ending) {
            check(n === 10, '엔딩은 10 스테이지에서만');
            check(St.data.flags.ended && St.data.clearedStage === 10 && !St.data.run, '엔딩 후 상태');
            done = true;
            break;
          }
          const p = St.data.run.pending;
          check(p && p.cards.length + p.fill === St.rewardCount(), '보상 후보 자리 수');
          p.cards.forEach(id => check(!St.inRunDeck(id), '보상에 스테이지 덱에 이미 있는 카드 ' + id));
          p.cards.forEach(id => { const o = D.cardById[id].owner; check(o === 'common' || St.data.party.includes(o), '보상은 편성한 동료·공용 카드 ' + id); });
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
          if (pick) check(St.owns(pick) && (clear || St.inRunDeck(pick)), '보상 카드 획득(보유 + 스테이지 덱)');
          if (clear) {
            check(clear.stage === n && clear.first, '첫 클리어 정보');
            const def = St.stageDef(n);
            if (def.join) {
              check(clear.joined === def.join && St.data.characters.includes(def.join), def.join + ' 합류');
              check(St.data.decks[def.join].length === 5, def.join + ' 시작 준비 덱 5장');
            }
            done = true;
          }
          invariants('스테이지 ' + n + ' 보상 뒤');
        } else {
          losses++; tries++;
          const goldBefore = St.data.gold, cardsBefore = St.data.cards.length;
          const lost = St.battleLost(b);
          check(St.data.run.col === 0 && St.data.gold === goldBefore - lost.goldLost && lost.goldLost === Math.floor(goldBefore * D.economy.defeatGold) && St.data.cards.length === cardsBefore, '패배 → 처음부터, 보유 카드 유지 · 골드 ' + D.economy.defeatGold * 100 + '% 잃음');
          check(JSON.stringify(St.data.run.decks.common) === JSON.stringify(St.data.decks.common), '패배 → 스테이지 덱은 준비 덱으로');
          invariants('스테이지 ' + n + ' 패배 뒤');
        }
      }
    }
    check(St.data.characters.length === 6, '6명 모두 합류');
    // 클리어한 스테이지 재도전: 합류는 다시 일어나지 않는다
    St.startStage(2);
    check(St.data.run.replay, '재도전 표시');
    St.abandon();
    check(!St.data.run, '스테이지 포기');
    const seen = Object.keys(St.data.codex.monsters).length;
    check(seen >= 20, '도감에 만난 몬스터 기록 (' + seen + ')');
  }

  if (N >= 3) {
    check(eventsSeen.size >= 22, '이벤트 대부분 등장 (' + eventsSeen.size + '/40)');
    ['battle', 'elite', 'event', 'rest', 'shop', 'boss', 'midboss', 'final'].forEach(t => check(typesSeen.has(t), '노드 종류 등장: ' + t));
  }

  // 승천: 엔딩 뒤 새 원정. 스테이지 진행만 초기화되고 나머지는 그대로
  {
    const d = St.data;
    check(d.flags.ended && St.maxAscension() === 1, '엔딩 뒤 승천 1 열림');
    check(!St.newExpedition(2), '아직 열리지 않은 단계는 시작할 수 없음');
    const keep = JSON.stringify([d.cards, d.relics, d.gold, d.characters, d.growth, d.upgraded, d.codex]);
    check(St.riftKnown() && St.stageCount() === 13, '엔딩 뒤 세계의 틈이 드러난다');
    check(St.newExpedition(1), '승천 1 원정 시작');
    check(St.riftKnown() && !St.canEnter(11), '승천 원정: 세계의 틈은 보이지만 10을 다시 깨야 열린다');
    check(d.clearedStage === 0 && !d.run && !d.flags.ended && d.ascension.current === 1, '스테이지 진행만 처음부터');
    check(JSON.stringify([d.cards, d.relics, d.gold, d.characters, d.growth, d.upgraded, d.codex]) === keep, '카드·유물·골드·동료·성장·강화·도감 유지');
    const m = St.ascMods(10);
    check(m.restPct === 0.25 && m.downedPct === 0.1 && m.rewardCards === 2 && m.affixMult === 2 && m.doomMult === 2 && m.triggerStr === 2, '승천 10 규칙 누적');
    check(St.enemyMods(1).hpMult > St.enemyMods(1).dmgMult && St.enemyMods(10).hpMult > St.enemyMods(1).hpMult, '승천 적 보정은 스테이지가 오를수록 큼');
    // 승천 1 원정을 빠르게(전투는 즉시 승리) 끝까지. 31단계: 이어서 세계의 틈(11~13)
    const quick = async (n) => {
      St.startStage(n);
      let guard = 0, end = null;
      while (!end && guard++ < 60) {
        if (!St.node()) { St.choose(0); continue; }
        const node = St.node();
        if (node.type === 'rest') { const t = St.pendingTalk(); if (t) St.finishTalk(t.key); end = St.rest(); continue; }
        if (node.type === 'shop') { St.openShop(); end = St.leaveShop(); continue; }
        if (node.type === 'treasure' && !St.openTreasure().ambush) { end = St.leaveTreasure(); continue; }
        if (node.type === 'event' && !(node.result && node.result.fight)) {
          const ev = St.eventDef(); const res = St.eventChoose(ev.choices.findIndex(c => St.canChoose(c)));
          if (res.cards) St.eventTakeCard(null);
          St.skipUpgrade();
          if (!res.fight) end = St.eventFinish();
          continue;
        }
        const b = G.Battle.create(St.battleOptions());
        await b.start(); await b.debugKillAll();
        const res = St.battleWon(b);
        while (St.pendingTrait()) St.chooseTrait(St.pendingTrait().id, 0);
        if (res.ending) { end = res.clear; break; }
        check(St.data.run.pending.cards.length + St.data.run.pending.fill === St.rewardCount(), '승천 보상 후보 수');
        end = St.takeReward(null);
      }
      return end;
    };
    for (let n = 1; n <= 10; n++) {
      if (n === 10) check(!St.canEnter(11) || G.debug, '10 스테이지 전에는 세계의 틈이 잠겨 있다');
      const end = await quick(n);
      check(end && end.stage === n, '승천 1 · ' + n + ' 스테이지 클리어');
      if (n === 10) check(end.ending && !end.riftEnding, '10 스테이지가 본편 엔딩');
    }
    check(d.flags.ended && d.ascension.best === 1 && St.maxAscension() === 2, '승천 1 클리어 → 최고 기록 1, 승천 2 열림');
    invariants('승천 1 뒤');
    // 31단계: 세계의 틈 — 엔딩 뒤 11 스테이지가 열리고, 13 스테이지(최종 보스 고대 혈마)가 두 번째 엔딩
    check(St.canEnter(11) && !St.canEnter(12), '엔딩 뒤 세계의 틈 11 스테이지가 열린다');
    check(St.stageDef(13).boss === 'blood_demon' && St.stageDef(13).midboss === 'danmok_shade' && St.stageDef(12).boss === 'echo_colossus', '세계의 틈 보스');
    for (let n = 11; n <= 13; n++) {
      const end = await quick(n);
      check(end && end.stage === n && !end.ending, '세계의 틈 · ' + n + ' 스테이지 클리어');
      if (n === 13) check(end.riftEnding && d.flags.riftEnded && d.flags.ended && d.clearedStage === 13, '13 스테이지 → 두 번째 엔딩');
    }
    check(St.sceneFor('epilogue', 21) && St.sceneFor('epilogue', 21).id === 'rift-epilogue', '세계의 틈 에필로그는 장 21');
    check(D.storyById['rift-epilogue'] && D.storyById['c11-intro'] && D.storyById['c13-mid'] && D.storyById['c13-midout'], '세계의 틈 장면');
    invariants('세계의 틈 뒤');
  }

  // 성장·친밀도·합동기
  check(traitsPicked > 0, '레벨업 특성을 골랐다 (' + traitsPicked + ')');
  check(Object.keys(St.data.bonds).length > 0, '친밀도가 쌓였다');
  St.data.bonds['kai+bram'] = 45;
  check(St.duoDeck(['kai', 'bram']).includes('D01') && !St.duoDeck(['kai', 'lyra']).includes('D01'), '친밀도 3단계 짝이 함께 편성되면 합동기');
  St.data.party = ['kai', 'bram'];
  St.startStage(1);
  St.autoPick();
  check(St.battleOptions().deck.includes('D01'), '전투 덱에 합동기');
  check(St.battleOptions().party.every(p => Array.isArray(p.traits)), '전투에 특성 전달');
  St.abandon();

  // 22단계: 이벤트 40종(29단계)의 선택지를 모두 실행해 본다(테마 이벤트는 그 테마 스테이지에서), 소모품
  {
    check(D.events.length === 40, '이벤트 40종');
    St.data.party = ['kai']; St.data.gold = 999;
    const stageOfTheme = th => D.stages.findIndex(s => s.theme === th) + 1;
    let ran = 0;
    D.events.forEach(ev => {
      ev.choices.forEach((ch, ci) => {
        St.startStage(ev.themes ? stageOfTheme(ev.themes[0]) : 1); St.autoPick();
        const node = St.node(); node.type = 'event'; node.event = ev.id; node.result = null;
        St.data.gold = 999; St.data.items = [];
        let res = null;
        try { res = St.eventChoose(ci); } catch (e) { check(false, ev.id + ' 선택지 ' + ci + ' 오류: ' + e.message); }
        if (res) {
          ran++;
          if (res.cards) St.eventTakeCard(res.cards[0]);
          while (St.data.run.purges) St.eventPurge(St.runDeckList()[0]);
          while (St.data.run.dups) St.eventDup(St.runDeckList()[0]);
        }
      });
    });
    check(ran === D.events.reduce((a, e) => a + e.choices.length, 0), '이벤트 선택지 모두 실행 (' + ran + ')');
    // 테마 이벤트는 다른 테마에서 나오지 않는다
    St.startStage(1);
    const themed = St.data.run.map.flat().filter(n => n.event).map(n => D.eventById[n.event]).filter(e => e.themes);
    check(themed.every(e => e.themes.includes('forest')), '만독곡에는 만독곡 이벤트만');
    // 소모품: 칸 3개, 전투 중 사용
    St.data.items = [];
    check(St.addItem('I02') && St.addItem('I05') && St.addItem('I06') && !St.addItem('I01'), '소모품 칸 3개');
    St.abandon();
  }

  // 19단계: 스테이지 덱 — 제거·복제·정리, 준비 덱은 그대로
  {
    St.data.party = ['kai'];
    St.data.gold = 500;
    St.startStage(1); St.autoPick();
    const before = St.runDeckList().length, prep = St.data.decks.kai.slice();
    St.data.run.shop = St.openShop();
    const c1 = St.removeCost();
    check(St.shopRemove(prep[0]) && St.runDeckList().length === before - 1 && St.data.gold === 500 - c1, '상점 제거: 스테이지 덱에서 1장 · 골드');
    check(St.removeCost() === c1 + D.economy.removeStep, '제거 값은 쓸 때마다 오른다');
    check(St.data.decks.kai.join() === prep.join(), '제거해도 준비 덱은 그대로');
    check(St.shopDuplicate('C01') && St.runDeckList().filter(id => id === 'C01').length === 2 && !St.shopDuplicate('C02'), '복제: 한 장 더, 상점마다 한 번');
    check(St.battleOptions().deck.filter(id => id.indexOf('C01') === 0).length === 2, '복제한 카드는 전투 덱에 두 장');
    St.restPurgeStart();
    const n0 = St.runDeckList().length;
    check(St.restPurge('C02') && St.runDeckList().length === n0 - 1, '휴식 정리: 공짜로 1장 빼기');
    while (St.runDeckList().length > D.economy.runDeckMin) St.removeFromRun(St.runDeckList()[0]);
    check(!St.canRemove() && !St.removeFromRun(St.runDeckList()[0]), '스테이지 덱 최소 장수 아래로는 뺄 수 없다');
    St.abandon();
    check(!St.runDecks() && St.battleDeck(['kai']).length === St.data.decks.kai.length + St.data.decks.common.length, '스테이지 밖에서는 준비 덱으로 싸운다');
    // v5 → v6: 넘치는 준비 덱은 8장으로, 진행 중인 스테이지에는 스테이지 덱
    const v5 = { version: 5, gold: 1, clearedStage: 2, characters: ['kai'], party: ['kai'], cards: D.cards.filter(c => c.owner === 'kai').map(c => c.id).slice(0, 12),
      decks: { kai: D.cards.filter(c => c.owner === 'kai').map(c => c.id).slice(0, 12) }, relics: [], upgraded: {}, codex: { monsters: {} }, flags: {},
      run: { stage: 3, col: 0, path: [], map: [[{ type: 'battle', next: [] }]], hp: { kai: 10 } } };
    const m6 = G.Save.sanitize(G.Save.migrate(JSON.parse(JSON.stringify(v5))));
    check(m6.decks.kai.length === D.economy.deckMax && m6.run && m6.run.decks.kai.length === D.economy.deckMax, 'v5 → v6: 준비 덱 8장 · 스테이지 덱');
  }

  // 저장 v1 → v2: 진행 중인 스테이지는 지우고 카드·골드·동료·유물은 유지
  const v1 = { version: 1, gold: 77, clearedStage: 3, characters: ['kai', 'bram'], party: ['kai'], cards: ['K01', 'C01'], decks: { kai: ['K01'], common: ['C01'] },
    relics: ['R01'], run: { stage: 4, node: 1, nodes: [{ type: 'battle' }], hp: { kai: 50 } }, codex: { monsters: {} }, flags: {} };
  const m2 = G.Save.sanitize(G.Save.migrate(JSON.parse(JSON.stringify(v1))));
  check(m2.version === G.Save.VERSION && m2.run === null && m2.gold === 77 && m2.cards.length === 2 && m2.relics[0] === 'R01', 'v1 → 최신 마이그레이션');
  check(m2.upgraded && !Array.isArray(m2.upgraded) && m2.growth && m2.bonds && m2.ascension && Array.isArray(m2.buffs), 'v2 기본값');
  // 저장 v4 → v5 (18단계): 강화 목록(배열) → 강화 단계 표
  const v4 = Object.assign(JSON.parse(JSON.stringify(v1)), { version: 4, upgraded: ['K01', 'X99'], mode: 'normal', dead: [] });
  const m5 = G.Save.sanitize(G.Save.migrate(v4));
  check(m5.version === G.Save.VERSION && m5.upgraded.K01 === 1 && !('X99' in m5.upgraded) && Object.keys(m5.upgraded).length === 1, 'v4 → v5: 강화 목록을 단계 표로');
  // 3단계까지만 강화된다
  {
    const keep = JSON.stringify(St.data);
    St.data.cards.push('K01'); St.data.run = St.data.run || { upgrades: 0 };
    St.data.upgraded.K01 = 2; St.data.run.upgrades = 3;
    check(St.upgradeCard('K01') && St.upLevel('K01') === 3 && St.cardDef('K01').id === 'K01+3', '2 → 3단계 강화');
    check(!St.upgradeCard('K01') && St.data.run.upgrades === 2 && St.upgradable().indexOf('K01') < 0, '3단계에서 더 강화되지 않음');
    St.data = JSON.parse(keep);
  }

  // 던전 지도(14단계): 길이·갈림 수·통로·숨은 방
  {
    let maxFork = 0, minCols = 99, maxCols = 0, types = new Set();
    for (let k = 0; k < 120; k++) {
      const def = St.stageDef(1 + (k % 10)), map = St.genMap(def);
      minCols = Math.min(minCols, map.length); maxCols = Math.max(maxCols, map.length);
      check(map[0].length === 1 && map[0][0].type === 'battle' && map[0][0].known, '입구는 전투 1칸, 공개');
      const last = map[map.length - 1];
      check(last.length === 1 && last[0].type === def.last && last[0].known, '마지막 방은 ' + def.last);
      check(map[map.length - 2].every(n => n.type === 'rest' || n.type === 'shop'), '마지막 방 앞은 야영지');
      if (def.layout === 'final') check(map.some(col => col.length === 1 && col[0].type === 'midboss'), '10 스테이지 중간 보스');
      for (let c = 0; c < map.length - 1; c++) {
        const A = map[c], B = map[c + 1];
        A.forEach(n => { check(n.next.length >= 1 && n.next.every(j => j >= 0 && j < B.length), '통로 번호'); maxFork = Math.max(maxFork, n.next.length); });
        B.forEach((_, j) => check(A.some(n => n.next.includes(j)), '모든 방에 들어오는 통로 (' + c + ')'));
        for (let i = 0; i < A.length - 1; i++) check(Math.max(...A[i].next) <= Math.min(...A[i + 1].next), '통로가 엇갈리지 않는다');
      }
      map.forEach((col, c) => col.forEach(n => { types.add(n.type); if (c > 0 && c < map.length - 1 && n.type !== 'midboss') check(!n.known, '중간 방은 처음에 숨겨져 있다'); }));
    }
    check(minCols >= 7 && maxCols <= 9, '스테이지는 7~9열 (' + minCols + '~' + maxCols + ')');
    check(maxFork >= 3, '갈림길 3갈래 이상 (' + maxFork + ')');
    ['battle', 'elite', 'event', 'treasure', 'rest', 'shop'].forEach(t => check(types.has(t), '방 종류 ' + t));
  }

  // 스토리(13단계): 데이터 검사
  const heroIds = D.characters.map(c => c.id), themes = ['forest', 'desert', 'snow', 'volcano', 'castle', 'rift'];
  D.story.forEach(ch => ch.scenes.forEach(sc => {
    check(themes.includes(sc.bg), '장면 배경 테마: ' + sc.id);
    check(!sc.right || heroIds.includes(sc.right) || D.monsterById[sc.right], '장면 상대: ' + sc.id);
    sc.lines.forEach(l => check(l[0] === 'narr' || heroIds.includes(l[0]) || l[0] === sc.right, '장면 화자: ' + sc.id + ' ' + l[0]));
    check(sc.lines.every(l => l[1] && l[1].length < 90), '대사 길이: ' + sc.id);
  }));
  for (let n = 1; n <= D.stages.length; n++) {
    const kinds = D.story.find(c => c.n === n).scenes.map(s => s.kind);
    check(kinds.includes('intro') && kinds.includes('boss') && (n === D.MAIN_STAGES || kinds.includes('outro')), n + '장 도입·결전·결말');
  }
  check(D.storyById['c10-mid'] && D.storyById['c10-midout'] && D.storyById.epilogue && D.storyById.prologue, '중간 보스·에필로그·프롤로그 장면');
  // 스토리: 처음 한 번만 나오고, 본 장면은 저장된다(승천 장면은 매번)
  St.newGame();
  check(St.data.story && St.data.story.seen.length === 0, '새 게임 스토리 기록 비어 있음');
  // 31단계: 엔딩 전에는 세계의 틈이 드러나지 않는다(스테이지 수 10, 스토리 장면 수에서 빠짐)
  {
    const riftScenes = D.story.filter(c => St.riftChapter(c.n)).reduce((a, c) => a + c.scenes.length, 0);
    const allScenes = D.story.reduce((a, c) => a + c.scenes.filter(x => x.kind !== 'ascend').length, 0);
    check(!St.riftKnown() && St.stageCount() === 10 && riftScenes === 12 && St.storyProgress().total === allScenes - riftScenes, '엔딩 전에는 세계의 틈을 숨긴다');
  }
  check(St.sceneFor('intro', 1).id === 'c1-intro' && St.sceneFor('prologue', 0).id === 'prologue', '장면 찾기');
  St.markStory('c1-intro');
  check(!St.sceneFor('intro', 1) && St.sceneFor('boss', 1), '본 장면은 다시 나오지 않는다');
  check(St.sceneFor('ascend', 20) && (St.markStory('ascend'), St.sceneFor('ascend', 20)), '승천 장면은 매번');
  const sp = St.storyProgress();
  check(sp.seen === 1 && sp.total > 30, '스토리 진행률 (' + sp.seen + '/' + sp.total + ')');
  St.save();
  check(G.Save.load().story.seen.includes('c1-intro'), '스토리 기록 저장');
  // 스토리 이전 저장: 클리어한 장까지 본 것으로 친다
  const old = { version: 2, gold: 5, clearedStage: 4, characters: ['kai', 'bram'], party: ['kai'], cards: ['K01'], decks: {}, relics: [], codex: { monsters: {} }, flags: {} };
  const ms = G.Save.sanitize(JSON.parse(JSON.stringify(old)));
  check(ms.story.seen.includes('prologue') && ms.story.seen.includes('c4-outro') && !ms.story.seen.includes('c5-intro'), '예전 저장의 스토리 기본값');

  // 마이그레이션·정리: 알 수 없는 카드 ID 는 버린다
  St.data.cards.push('ZZZ99');
  St.data.decks.common.push('ZZZ99');
  St.save();
  const cleaned = G.Save.load();
  check(!cleaned.cards.includes('ZZZ99') && !cleaned.decks.common.includes('ZZZ99'), '알 수 없는 카드 ID 제거');

  // 저장 칸 3개·게임 모드(15단계)
  {
    G.Save.clear(1); G.Save.clear(2); G.Save.clear(3);
    // 칸이 하나이던 예전 저장은 1번 칸으로 옮겨진다
    const legacy = { version: 3, gold: 42, clearedStage: 2, characters: ['kai'], party: ['kai'], cards: ['K01'], decks: {}, relics: [], codex: { monsters: {} }, flags: {} };
    G.Save.store().setItem(G.Save.base(), JSON.stringify(legacy));
    G.Save.use(2); St.newGame('hard'); St.data.gold = 7; St.save();
    G.Save.use(3); St.newGame('hardcore'); St.save();
    check(G.Save.peek(2).mode === 'hard' && G.Save.peek(2).gold === 7 && G.Save.peek(3).mode === 'hardcore', '칸마다 따로 저장');
    // 24단계: 저장 내보내기 · 가져오기
    {
      const txt = G.Save.exportText(2);
      check(txt.indexOf('CHG1:') === 0 && G.Save.parseExport(txt).gold === 7 && G.Save.parseExport(txt).mode === 'hard', '내보내기 → 해석');
      check(G.Save.parseExport('CHG1:@@@') === null && G.Save.parseExport('아무 글자') === null && G.Save.parseExport('CHG1:' + btoa('{"a":1}')) === null, '잘못된 글자는 거절');
      const back = G.Save.peek(1);
      check(G.Save.importText(txt, 1) && G.Save.peek(1).gold === 7 && G.Save.peek(1).mode === 'hard', '가져오기 → 다른 칸');
      G.Save.importText(G.Save.EXPORT_TAG + btoa(unescape(encodeURIComponent(JSON.stringify(back)))), 1);
      check(G.Save.peek(1).gold === back.gold, '가져오기로 되돌림');
    }
    check(G.Save.lastSlot() === 3, '마지막으로 쓴 칸');
    G.Save.use(1);
    const l1 = G.Save.peek(1);
    check(!!l1 && (l1.mode === 'normal' && l1.gold === 42 && l1.version === G.Save.VERSION), '예전 저장 → 1번 칸, 노말 모드');
    // 하드: 적 체력·피해 배율 + 규칙(23단계)
    G.Save.use(2); St.load();
    const hm = St.enemyMods(3);
    G.Save.use(3); St.load();
    const nm = St.enemyMods(3);
    check(Math.abs((1 + hm.hpMult) - (1 + nm.hpMult) * D.modes.hard.enemyHp) < 1e-9 && Math.abs((1 + hm.dmgMult) - (1 + nm.dmgMult) * D.modes.hard.enemyDmg) < 1e-9 && D.modes.hard.enemyHp > 1, '하드 모드 적 보정');
    G.Save.use(2); St.load();
    const ha = St.ascMods();
    check(hm.eliteStr === D.modes.hard.rules.eliteStr && hm.triggerStr >= D.modes.hard.rules.triggerStr && ha.restPct === D.modes.hard.rules.restPct && ha.affixMult === D.modes.hard.rules.affixMult && ha.shopPriceMult === D.modes.hard.rules.shopPriceMult, '하드 모드 규칙(정예 힘·회복·변이·상점가)');
    check(hm.bossHpMult > 0 && D.difficulty.bossHp.length === D.stages.length && D.difficulty.hp.length === D.stages.length && D.difficulty.dmg.length === D.stages.length, '정예·보스 체력 추가 보정(스테이지마다)');
    G.Save.use(3); St.load();
    // 하드코어: 쓰러진 채 이기면 그 동료는 죽는다
    const d = St.data;
    d.characters = ['kai', 'bram', 'lyra', 'sera']; ['bram', 'lyra', 'sera'].forEach(id => { d.decks[id] = []; });
    d.party = ['kai', 'bram', 'lyra'];
    St.startStage(1); St.autoPick();
    const fake = (deadIds) => ({ heroes: d.party.map(id => ({ id, dead: deadIds.includes(id), hp: deadIds.includes(id) ? 0 : 10, maxHp: St.maxHp(id) })),
      monsters: [], kills: [], goldDelta: 0 });
    St.battleWon(fake(['bram']));
    check(St.isDead('bram') && !d.party.includes('bram') && d.run.hp.bram == null, '하드코어: 쓰러진 동료 사망');
    check(!St.setParty(['bram']) && St.setParty(['bram', 'kai']) && !d.party.includes('bram'), '죽은 동료는 편성할 수 없다');
    d.run.pending = null;
    // 지면 싸운 동료가 모두 죽고, 남은 동료로 다시 시작
    d.party = ['kai', 'lyra'];
    let lost = St.battleLost(fake(['kai', 'lyra']));
    check(!lost.wiped && St.isDead('kai') && St.isDead('lyra') && d.party.join() === 'sera' && St.data.run.col === 0, '하드코어 패배: 남은 동료로 재시작');
    lost = St.battleLost(fake(['sera']));
    check(lost.wiped && !G.Save.exists(3) && St.data === null, '모두 죽으면 저장 칸 삭제');
    // 노말: 쓰러져도 25%로 복귀
    G.Save.use(2); St.load(); St.data.mode = 'normal';
    St.data.characters = ['kai', 'bram']; St.data.decks.bram = []; St.data.party = ['kai', 'bram'];
    St.startStage(1); St.autoPick();
    St.battleWon({ heroes: [{ id: 'kai', dead: false, hp: 5, maxHp: 70 }, { id: 'bram', dead: true, hp: 0, maxHp: 95 }], monsters: [], kills: [], goldDelta: 0 });
    check(!St.isDead('bram') && St.data.run.hp.bram > 0, '노말: 쓰러진 동료는 복귀');
    G.Save.clear(1); G.Save.clear(2); G.Save.use(1);
  }

  // ---- 26단계: 업적 · 시작 선물 · 오늘의 원정 ----
  {
    const P = G.Profile;
    check(D.achievements.length >= 30 && D.achievements.every(a => !a.reward || D.boonById[a.reward]), '업적 30개 이상, 보상 선물이 있다');
    const ids = new Set(); D.achievements.forEach(a => ids.add(a.id));
    check(ids.size === D.achievements.length, '업적 id 중복 없음');
    P.reset();
    G.Save.use(1); St.newGame('normal');
    St.startStage(1); St.autoPick();
    const fb = (tally, turn) => ({ heroes: [{ id: 'kai', dead: false, hp: 50, maxHp: 70 }], monsters: [{ id: 'slime' }], kills: ['slime'], goldDelta: 0, turn: turn || 4, tally: tally || {} });
    St.battleWon(fb({ dealt: 30, taken: 5, maxHit: 70, cards: 8, plays: { K01: 3 }, maxCombo: 2 }, 4));
    check(P.stat('wins') === 1 && P.stat('kills') === 1 && P.stat('maxHit') === 70 && P.get().cardUse.K01 === 3 && P.get().heroUse.kai === 1, '기록: 승리·처치·최대 피해·카드 사용');
    check(P.has('A01') && P.has('A18') && !P.has('A19') && P.boons().indexOf('B01') >= 0 && P.boons().indexOf('B05') >= 0, '업적: 첫 승리·일격필살 → 시작 선물 해금');
    St.data.run.pending = null;
    St.battleWon(fb({ taken: 0 }, 1));
    check(P.has('A21') && !P.has('A17'), '업적: 첫 턴에 끝냄(정예·보스가 아니면 무결 아님)');
    St.data.run.pending = null;
    check(!P.has('A07'), '아직 2 스테이지 업적 없음');
    P.stage({ stage: 2 }); P.ending({ mode: 'hard', asc: 5 });
    check(P.has('A07') && P.has('A11') && P.has('A12') && P.has('A14') && P.has('A15') && !P.has('A16') && !P.has('A13'), '업적: 스테이지·엔딩·모드·승천');
    const prog = P.progress(D.achievementById.A02);
    check(prog[0] === 2 && prog[1] === 100 && P.progress(D.achievementById.A17) === null, '업적 진행도');
    // 시작 선물
    const g0 = St.data.gold;
    check(St.applyBoon('B01') && St.data.gold === g0 + 60 && St.data.flags.boon === 'B01', '시작 선물: 여비');
    St.applyBoon('B05');
    check(Object.keys(St.data.upgraded).length === 2, '시작 선물: 숙련의 증표 2장 강화');
    // 오늘의 원정
    const key = '20261003';
    const p1 = St.dailyPlan(key), p2 = St.dailyPlan(key), p3 = St.dailyPlan('20261004');
    check(JSON.stringify(p1) === JSON.stringify(p2) && p1.party.length === 3 && p1.mods.length === 3 && D.daily.stages.indexOf(p1.stage) >= 0, '오늘의 원정: 같은 날은 같은 구성');
    check(JSON.stringify(p1) !== JSON.stringify(p3), '오늘의 원정: 날마다 다르다');
    St.newDaily(key);
    const map1 = JSON.stringify(St.data.run.map);
    check(St.isDaily() && G.Save.slot === 'daily' && St.data.run.stage === p1.stage && St.data.party.join() === p1.party.join() && P.stat('dailyPlays') === 1 && P.has('A29'), '오늘의 원정 시작');
    const hasHp = St.dailyMods(p1.mods).reduce((a, x) => a + (x.mods.hpMult || 0), 0);
    check(Math.abs(St.ascMods().hpMult - hasHp) < 1e-9, '오늘의 원정 규칙이 적 보정에 들어간다');
    check(St.data.party.every(id => St.levelOf(id) >= 1 && (St.data.growth[id].traits.length === St.levelOf(id))), '오늘의 원정: 동료 레벨·특성');
    St.newDaily(key);
    check(JSON.stringify(St.data.run.map) === map1, '오늘의 원정: 같은 날은 같은 지도');
    const b = G.Battle.create(St.battleOptions());
    const lostD = St.battleLost(b);
    check(lostD.daily && lostD.daily.cleared === false && lostD.daily.attempts === 1 && St.data === null && !G.Save.exists('daily') && P.get().daily[key].attempts === 1, '오늘의 원정: 지면 끝나고 기록');
    St.newDaily(key);
    St.data.flags.daily.wins = 4; St.data.flags.daily.elites = 1;
    const sc = St.dailyScore(true);
    const res = St.clearStage().daily;
    check(res.cleared && res.score === sc.score && res.score > lostD.daily.score && res.record && P.get().daily[key].best.score === res.score && P.stat('dailyClears') === 1 && P.has('A30'), '오늘의 원정: 돌파 점수·최고 기록·업적');
    check(G.Save.lastSlot() !== 'daily', '오늘의 원정 칸은 이어하기 대상이 아니다');
    P.reset(); G.Save.use(1); G.Save.clear(1);
  }

  console.log('캠페인 ' + N + '회 · 전투 ' + totalBattles + ' · AI 패배 ' + losses + ' · 강제 승리 ' + kills +
    ' · 상점 ' + shops + '(구매 ' + bought + ') · 휴식 ' + rests + ' · 강화 ' + ups + ' · 이벤트 ' + eventsSeen.size + '종(전투 ' + eventFights + ') · 그림자 ' + mirrors + ' · 특성 ' + traitsPicked + ' · 대화 ' + talks + ' · 보물 ' + treasures + '(매복 ' + ambushes + ')');
  console.log(failures ? '실패 ' + failures + '건' : '모든 테스트 통과');
  process.exit(failures ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
