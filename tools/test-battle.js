// tools/test-battle.js — 전투 엔진 자동 테스트 (개발 전용, 게임에서 로드하지 않음)
// 실행: node tools/test-battle.js [전투 횟수]
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
global.window = global;
['js/core.js', 'data/keywords.js', 'data/characters.js', 'data/cards.js', 'data/monsters.js', 'data/relics.js',
 'js/status.js', 'js/deck.js', 'js/battle.js', 'js/effects.js'].forEach(f => {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
});
const G = global.Game;
G.instant = true;

let failures = 0;
function check(cond, msg) {
  if (!cond) { failures++; console.log('  실패: ' + msg); }
}
function section(name) { console.log('\n■ ' + name); }

// ---------------------------------------------------------------- 데이터 검사
section('데이터');
const cards = G.Data.cards.filter(c => c.owner !== 'none');
check(cards.length === 192, '카드 192장 (현재 ' + cards.length + ')');
const KNOWN_OPS = ['damage', 'block', 'heal', 'status', 'cleanse', 'revive', 'loseHp', 'draw', 'energy', 'discount',
  'doubleNext', 'gold', 'power', 'if', 'chance', 'oneOf', 'conjure', 'addCard', 'randomizeCosts', 'freeRandom', 'summon', 'custom'];
function walk(effects, where) {
  effects.forEach(e => {
    check(KNOWN_OPS.includes(e.op), where + ': 알 수 없는 op ' + e.op);
    if (e.op === 'status') check(e.status === 'randomDebuff' || G.Data.statuses[e.status], where + ': 알 수 없는 상태 ' + e.status);
    if (e.op === 'addCard') check(G.Data.cardById[e.card], where + ': 알 수 없는 카드 ' + e.card);
    if (e.op === 'summon') check(G.Data.monsterById[e.monster], where + ': 알 수 없는 몬스터 ' + e.monster);
    ['then', 'else', 'effects', 'onHit', 'onCrit', 'onKill'].forEach(k => { if (Array.isArray(e[k])) walk(e[k], where); });
    if (e.options) e.options.forEach(o => walk(o.effects, where));
  });
}
G.Data.cards.forEach(c => walk(c.effects, c.id));
G.Data.monsters.forEach(m => {
  Object.keys(m.moves).forEach(k => walk(m.moves[k].effects, m.id + '.' + k));
  m.pattern.forEach(k => check(m.moves[k], m.id + ': 패턴의 행동 없음 ' + k));
  (m.triggers || []).forEach(t => {
    if (t.effects) walk(t.effects, m.id + ' trigger');
    if (t.everyTurn) walk(t.everyTurn, m.id + ' everyTurn');
    (t.pattern || []).forEach(k => check(m.moves[k], m.id + ': 트리거 패턴의 행동 없음 ' + k));
  });
  if (m.onDeath) walk(m.onDeath, m.id + ' onDeath');
});
check(G.Data.monsters.length === 36, '몬스터 36종 (현재 ' + G.Data.monsters.length + ')');

// 희귀 이상 카드는 모두 고유 이펙트(sfx)를 가지고, 그 키가 effects.js 에 있다
cards.forEach(c => {
  const rare = ['rare', 'epic', 'legendary'].includes(c.rarity);
  if (rare) check(c.sfx && G.FX.SFX[c.sfx], c.id + ': 희귀 이상인데 고유 이펙트 없음 (' + c.sfx + ')');
  else check(!c.sfx, c.id + ': 일반·고급인데 고유 이펙트가 있음');
});

// 설명의 {dN} 자리표시자가 damage 효과 수를 넘지 않는지
cards.forEach(c => {
  let n = 0;
  (function count(list) {
    list.forEach(e => {
      if (e.op === 'damage') n++;
      if (e.op === 'power') return;
      ['then', 'else'].forEach(k => e[k] && count(e[k]));
    });
  })(c.effects);
  (c.text.match(/\{d(\d)\}/g) || []).forEach(m => check(+m[2] < n, c.id + ': 설명의 ' + m + ' 에 해당하는 피해 효과 없음'));
});

// 기획서 8장 표와 데이터 일치
const doc = fs.readFileSync(path.join(ROOT, 'GAME_DESIGN.md'), 'utf8');
const RAR = { 일반: 'common', 고급: 'uncommon', 희귀: 'rare', 영웅: 'epic', 전설: 'legendary' };
const TYPE = { 공격: 'attack', 방어: 'block', 보조: 'skill', 회복: 'heal', 지속: 'power' };
const TGT = { 적1: 'enemy', 적전체: 'allEnemies', 무작위: 'randomEnemy', 아군1: 'ally', 아군전체: 'allAllies', 자신: 'self', '쓰러진 아군': 'downedAlly', '—': 'none' };
let docRows = 0;
doc.split('\n').forEach(line => {
  const m = line.match(/^\| ([KBLSNC]\d\d)(★?) \| ([^|]+) \| (\S+) \| (\S+) \| (\S+) \| ([^|]+) \| ([^|]*) \|/);
  if (!m) return;
  docRows++;
  const c = G.Data.cardById[m[1]];
  if (!c) { check(false, '기획서에만 있는 카드 ' + m[1]); return; }
  const id = m[1];
  check(c.name === m[3].trim(), id + ' 이름 ' + c.name + ' ≠ ' + m[3].trim());
  check(c.basic === (m[2] === '★'), id + ' 기본 카드 여부');
  check(c.rarity === RAR[m[4]], id + ' 등급');
  check(c.type === TYPE[m[5]], id + ' 유형');
  check(String(c.cost) === m[6], id + ' 비용 ' + c.cost + ' ≠ ' + m[6]);
  check(c.target === TGT[m[7].trim()], id + ' 대상 ' + c.target + ' ≠ ' + m[7].trim());
  check(c.tags === m[8].trim(), id + ' 분류 "' + c.tags + '" ≠ "' + m[8].trim() + '"');
});
check(docRows === 192, '기획서 카드 표 192행 (현재 ' + docRows + ')');

// ---------------------------------------------------------------- 규칙 단위 테스트
section('규칙');
async function newBattle(party, monsters, deck, extra) {
  G.rng.seed(42);
  const b = G.Battle.create(Object.assign({ party: party.map(id => ({ id })), monsters, deck: deck || ['C01'], gold: 50 }, extra));
  await b.start();
  return b;
}
function handCard(b, id) {
  const c = G.Deck.inst(id);
  b.piles.hand.push(c);
  return c;
}

(async () => {
  // 피해 계산: (6 + 힘 2) × 약화 0.75 × 취약 1.5 = 9
  let b = await newBattle(['kai'], ['slime', 'slime']);
  const kai = b.heroes[0], s1 = b.monsters[0];
  kai.crit = 0;
  kai.status.strength = 2; kai.status.weak = 1; s1.status.vulnerable = 1;
  let hp0 = s1.hp;
  b.energy = 3;
  await b.play(handCard(b, 'K01'), s1);
  check(hp0 - s1.hp === 9, '피해 계산 (6+2)×0.75×1.5 = 9 (실제 ' + (hp0 - s1.hp) + ')');

  // 보호막 먼저 차감
  b.monsters[1].block = 4; hp0 = b.monsters[1].hp;
  kai.status = {}; b.energy = 3;
  await b.play(handCard(b, 'K01'), b.monsters[1]);
  check(b.monsters[1].block === 0 && hp0 - b.monsters[1].hp === 2, '보호막 4 → 피해 6 중 2만 체력');

  // 집중은 확정 치명타 (2배)
  b = await newBattle(['kai'], ['treant']);
  b.heroes[0].crit = 0; b.heroes[0].status.focus = 1; b.energy = 3;
  hp0 = b.monsters[0].hp;
  await b.play(handCard(b, 'K01'), b.monsters[0]);
  check(hp0 - b.monsters[0].hp === 12 && !b.heroes[0].status.focus, '집중 → 치명타 12, 집중 소모');

  // 한기 3 → 빙결, 보스는 이후 빙결 면역
  b = await newBattle(['lyra'], ['treant']);
  const boss = b.monsters[0];
  G.Status.add(b, boss, 'chill', 3, null);
  check(boss.status.frozen === 1 && !boss.status.chill, '한기 3 → 빙결');
  check(boss.status.freezeImmune > 0, '보스 빙결 후 면역');
  G.Status.add(b, boss, 'chill', 1, null);
  check(!boss.status.chill, '면역 중 한기 무시');
  const pIdx = boss.pIndex;
  await b.endTurn();
  check(boss.pIndex === pIdx + 1 && !boss.status.frozen, '빙결된 적은 행동을 건너뛰고 패턴은 다음으로');

  // 원소 친화: 리라가 부여하는 화상 +1
  b = await newBattle(['lyra'], ['treant']);
  b.heroes[0].status.affinity = 1; b.energy = 3;
  await b.play(handCard(b, 'L01'), b.monsters[0]);
  check(b.monsters[0].status.burn === 3, '원소 친화 화상 2+1 = 3 (실제 ' + b.monsters[0].status.burn + ')');

  // 약화: 적 턴에 걸린 것은 그 라운드에 줄지 않는다
  b = await newBattle(['kai'], ['giant_spider']);
  b.monsters[0].pIndex = 1; b.predict(b.monsters[0]); // 거미줄(약화 2 전체)
  await b.endTurn();
  check(b.heroes[0].status.weak === 2, '적 턴에 걸린 약화 2는 라운드 끝에도 2 (실제 ' + b.heroes[0].status.weak + ')');

  // 내 턴에 건 취약 1은 라운드 끝에 사라진다
  b = await newBattle(['kai'], ['treant']);
  b.energy = 3; b.heroes[0].crit = 0;
  await b.play(handCard(b, 'K04'), b.monsters[0]);
  check(b.monsters[0].status.vulnerable === 1, '강타 → 취약 1');
  await b.endTurn();
  check(!b.monsters[0].status.vulnerable, '라운드 끝에 취약 1 → 0');

  // 조건: 이번 턴 첫 카드
  b = await newBattle(['kai'], ['treant']);
  b.heroes[0].crit = 0; b.energy = 3;
  const k03 = handCard(b, 'K03');
  check(b.condMet(k03) === true, '첫 카드일 때 조건 충족 표시');
  hp0 = b.monsters[0].hp;
  await b.play(k03, b.monsters[0]);
  check(hp0 - b.monsters[0].hp === 9, '연속 베기 첫 카드 3×3 = 9');
  hp0 = b.monsters[0].hp;
  await b.play(handCard(b, 'K03'), b.monsters[0]);
  check(hp0 - b.monsters[0].hp === 6, '연속 베기 두 번째 3×2 = 6');

  // X 비용
  b = await newBattle(['kai'], ['treant']);
  b.heroes[0].crit = 0; b.energy = 2;
  hp0 = b.monsters[0].hp;
  await b.play(handCard(b, 'K24'), b.monsters[0]);
  check(hp0 - b.monsters[0].hp === 18 && b.energy === 0, '천 번의 베기 X=2 → 6×3 = 18');

  // 쓰러진 캐릭터의 카드는 사용 불가, 공용 카드는 가능
  b = await newBattle(['kai', 'bram'], ['treant']);
  b.heroes[0].hp = 0; b.heroes[0].dead = true;
  check(!b.canPlay(handCard(b, 'K01')).ok, '쓰러진 카이 카드 사용 불가');
  check(b.canPlay(handCard(b, 'C01')).ok, '공용 카드는 사용 가능');

  // 그림자 분신: 다음 카드 2번 발동
  b = await newBattle(['nox'], ['treant']);
  b.energy = 3; b.heroes[0].crit = 0;
  await b.play(handCard(b, 'N24'), null);
  hp0 = b.monsters[0].hp;
  b.energy = 3;
  await b.play(handCard(b, 'C01'), b.monsters[0]);
  check(hp0 - b.monsters[0].hp >= 12, '그림자 분신 → 타격 2번');

  // 차지: 보호막을 깨면 취소되고 취약 2
  b = await newBattle(['kai'], ['frost_queen']);
  const q = b.monsters[0];
  q.pIndex = 3; b.predict(q);
  await b.endTurn(); // 절대영도 준비
  check(q.status.charge === 1 && q.block === 25, '절대영도 준비 → 보호막 25, 차지');
  check(q.intent === 'zero', '다음 예고는 절대영도');
  b.energy = 9; b.heroes[0].crit = 0; b.heroes[0].status.strength = 30;
  await b.play(handCard(b, 'K01'), q);
  check(!q.status.charge && q.status.vulnerable === 2, '보호막 파괴 → 차지 취소 + 취약 2');
  check(q.intent !== 'zero', '취소 후 예고가 다음 행동으로 바뀜 (' + q.intent + ')');

  // 체력 조건 발동: 고목 50% 이하 → 힘 2
  b = await newBattle(['kai'], ['treant']);
  b.energy = 9; b.heroes[0].crit = 0; b.heroes[0].status.strength = 64;
  await b.play(handCard(b, 'K01'), b.monsters[0]);
  check(b.monsters[0].status.strength === 2, '고목 격노 → 힘 2');

  // 소환 최대 4마리, 넘치면 보호막 8
  b = await newBattle(['kai'], ['treant', 'slime', 'slime', 'slime']);
  await b.summon('vine', b.monsters[0]);
  check(b.alive('enemy').length === 4 && b.monsters[0].block === 8, '자리가 없으면 소환 대신 보호막 8');

  // 불사조 1회 부활
  b = await newBattle(['kai'], ['phoenix']);
  b.energy = 9; b.heroes[0].status.strength = 300;
  await b.play(handCard(b, 'K01'), b.monsters[0]);
  const rev = Math.floor(b.monsters[0].maxHp * G.Data.monsterById.phoenix.revive.pct);
  check(!b.monsters[0].dead && b.monsters[0].hp === rev, '불사조 부활 체력 = ' + rev + ' (실제 ' + b.monsters[0].hp + ')');
  await b.play(handCard(b, 'K01'), b.monsters[0]);
  check(b.result === 'win', '두 번째에는 처치 → 승리');

  // 모래: 사용 불가, 버린 더미에 들어감
  b = await newBattle(['kai'], ['sand_spirit']);
  await b.endTurn();
  const sandCount = b.piles.discard.concat(b.piles.draw, b.piles.hand).filter(c => c.id === 'SAND').length;
  check(sandCount === 2, '모래바람 → 모래 2장 (실제 ' + sandCount + ')');
  check(!b.canPlay(G.Deck.inst('SAND')).ok, '모래 사용 불가');

  // 도발: 단일 공격이 도발한 캐릭터를 향한다
  b = await newBattle(['kai', 'bram'], ['slime']);
  b.energy = 3;
  await b.play(handCard(b, 'B03'), null);
  check(b.monsters[0].intentTarget === b.heroes[1], '도발 → 슬라임의 대상이 브리아');

  // 불멸의 수호자: 1회 체력 1로 버팀
  b = await newBattle(['bram'], ['slime']);
  b.energy = 9;
  await b.play(handCard(b, 'B25'), null);
  b.heroes[0].block = 0;
  await b.loseHp(b.heroes[0], 999);
  check(b.heroes[0].hp === 1 && !b.heroes[0].dead, '불멸의 수호자 → 체력 1로 버팀');

  // 부활
  b = await newBattle(['sera', 'kai'], ['treant']);
  b.heroes[1].hp = 0; b.heroes[1].dead = true; b.energy = 3;
  await b.play(handCard(b, 'S17'), b.heroes[1]);
  check(!b.heroes[1].dead && b.heroes[1].hp === 28, '부활 → 카이 체력 40% = 28');

  // ---------------------------------------------------------------- 유물·변이
  check(G.Data.relics.length === 30, '유물 30종');
  G.Data.relics.forEach(r => (r.hooks || []).forEach(h => walk(h.effects, r.id)));
  b = await newBattle(['kai'], ['treant'], ['C01'], { relics: ['R01', 'R03', 'R08'] });
  check(b.energy === 4, '여명의 모래시계: 첫 턴 에너지 4 (실제 ' + b.energy + ')');
  check(b.heroes[0].block === 6, '수호 부적: 보호막 6');
  check(b.piles.hand.length === 1, '은방울: 덱이 1장뿐이라 손패 1장 (드로우 시도 7)');
  await b.endTurn();
  check(b.energy === 3, '둘째 턴 에너지 3');

  b = await newBattle(['lyra'], ['treant'], ['C01'], { relics: ['R10', 'R21'] });
  b.energy = 3;
  await b.play(handCard(b, 'L01'), b.monsters[0]);
  check(b.monsters[0].status.burn === 6, '부싯돌+용의 심장: 화상 (2+1)×2 = 6 (실제 ' + b.monsters[0].status.burn + ')');

  b = await newBattle(['kai'], ['treant'], ['C01'], { relics: ['R07'] });
  b.heroes[0].crit = 0; b.energy = 3; hp0 = b.monsters[0].hp;
  await b.play(handCard(b, 'K01'), b.monsters[0]);
  check(hp0 - b.monsters[0].hp === 11, '가죽 장갑: 첫 공격 6+5 = 11');
  hp0 = b.monsters[0].hp;
  await b.play(handCard(b, 'K01'), b.monsters[0]);
  check(hp0 - b.monsters[0].hp === 6, '두 번째 공격은 보너스 없음');

  b = await newBattle(['kai'], ['treant'], ['C01'], { relics: ['R14'] });
  await b.loseHp(b.heroes[0], 999);
  check(!b.heroes[0].dead && b.heroes[0].hp === 14, '불사조 깃털: 체력 20% = 14로 일어남');
  await b.loseHp(b.heroes[0], 999);
  check(b.heroes[0].dead, '불사조 깃털은 전투당 한 번');

  b = await newBattle(['lyra'], ['slime'], ['C01'], { relics: ['R25'] });
  G.Status.add(b, b.monsters[0], 'chill', 3, null);
  check(b.monsters[0].status.vulnerable === 2, '얼음 왕관: 빙결 → 취약 2');

  b = await newBattle(['kai'], ['slime', 'slime'], ['C01'], { affixes: ['giant', 'angry'] });
  check(b.monsters[0].maxHp === 27 && b.monsters[0].name === '거대한 슬라임', '거대한: 체력 1.5배·이름');
  check(b.monsters[1].status.strength === 2, '분노한: 힘 2');

  // ---------------------------------------------------------------- 무작위 전투
  const N = +(process.argv[2] || 3000);
  section('무작위 전투 ' + N + '회');
  const heroes = G.Data.characters.map(c => c.id);
  const monsters = G.Data.monsters;
  const played = new Set();
  const seenMonsters = new Set();
  let wins = 0, losses = 0, stuck = 0, errors = 0;
  for (let run = 0; run < N; run++) {
    G.rng.seed(1000 + run);
    const party = G.rng.shuffle(heroes.slice()).slice(0, G.rng.int(1, 3));
    const pool = G.Data.cards.filter(c => c.owner === 'common' || party.includes(c.owner));
    const deck = G.rng.shuffle(pool.map(c => c.id)).slice(0, 20);
    const theme = G.rng.pick(['forest', 'desert', 'snow', 'volcano', 'castle']);
    const themed = monsters.filter(m => m.theme === theme);
    const roll = G.rng.next();
    let enc;
    if (roll < 0.15) enc = [G.rng.pick(themed.filter(m => m.rank !== 'normal')).id];
    else enc = G.rng.shuffle(themed.filter(m => m.rank === 'normal').map(m => m.id)).slice(0, G.rng.int(1, 3));
    enc.forEach(id => seenMonsters.add(id));
    const relics = G.rng.shuffle(G.Data.relics.map(r => r.id)).slice(0, G.rng.int(0, 6));
    const affixes = enc.map(() => G.rng.chance(0.3) ? G.rng.pick(Object.keys(G.Data.affixes)) : null);
    try {
      const b = G.Battle.create({ party: party.map(id => ({ id })), monsters: enc, deck, gold: 30, relics, affixes });
      await b.start();
      let guard = 0;
      while (!b.over() && b.turn < 80 && guard++ < 5000) {
        const options = b.piles.hand.filter(c => b.canPlay(c).ok && (!b.needsTarget(c) || b.validTargets(c).length));
        if (!options.length || G.rng.next() < 0.08) { await b.endTurn(); continue; }
        const c = options[Math.floor(G.rng.next() * options.length)];
        const tg = b.needsTarget(c) ? G.rng.pick(b.validTargets(c)) : null;
        const ok = await b.play(c, tg);
        if (!ok) throw new Error('play 실패: ' + c.id);
        played.add(c.id);
        // 불변 조건
        b.heroes.concat(b.monsters).forEach(u => {
          if (u.hp > u.maxHp || u.hp < 0 || u.block < 0) throw new Error('불변 조건 위반: ' + u.name + ' hp=' + u.hp + ' block=' + u.block);
          if (u.dead !== (u.hp <= 0)) throw new Error('사망 상태 불일치: ' + u.name);
        });
        if (b.energy < 0) throw new Error('에너지 음수');
        if (b.piles.hand.length > 10) throw new Error('손패 10장 초과');
      }
      if (b.result === 'win') wins++;
      else if (b.result === 'lose') losses++;
      else stuck++;
    } catch (err) {
      errors++;
      if (errors <= 5) console.log('  오류 (시드 ' + (1000 + run) + '): ' + err.stack.split('\n').slice(0, 3).join(' / '));
    }
  }
  console.log('  승리 ' + wins + ' · 패배 ' + losses + ' · 80턴 초과 ' + stuck + ' · 오류 ' + errors);
  check(errors === 0, '무작위 전투 중 오류 없음');
  // 사용·등장 범위 검사는 충분히 많이 돌렸을 때만 (적게 돌리면 우연히 빠질 수 있다)
  const never = cards.filter(c => !played.has(c.id)).map(c => c.id);
  if (N >= 1000) {
    check(!never.length, '모든 카드가 한 번 이상 사용됨 (미사용: ' + never.join(', ') + ')');
    check(seenMonsters.size === 36, '모든 몬스터 등장 (' + seenMonsters.size + '/36)');
  } else console.log('  (사용 범위 검사 생략: 1000회 미만)');

  console.log(failures ? '\n실패 ' + failures + '건' : '\n모든 테스트 통과');
  process.exit(failures ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
