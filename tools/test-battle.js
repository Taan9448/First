// tools/test-battle.js — 전투 엔진 자동 테스트 (개발 전용, 게임에서 로드하지 않음)
// 실행: node tools/test-battle.js [전투 횟수]
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
global.window = global;
['js/core.js', 'data/keywords.js', 'data/characters.js', 'data/cards.js', 'data/monsters.js', 'data/relics.js', 'data/items.js',
 'data/upgrades.js', 'data/events.js', 'data/bonds.js', 'data/traits.js', 'data/ascension.js', 'data/modes.js', 'js/status.js', 'js/deck.js', 'js/upgrade.js', 'js/battle.js', 'js/effects.js', 'data/fx.js', 'js/fx-pixel.js', 'data/music.js', 'js/music.js', 'js/puppet.js', 'js/puppet-heroes.js', 'data/asset-spec.js', 'data/assets.js', 'js/assets.js', 'data/relics.js', 'data/stages.js'].forEach(f => {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
});
const G = global.Game;
G.instant = true;

let failures = 0;
function check(cond, msg) {
  if (!cond) { failures++; console.log('  실패: ' + msg); }
}
function section(name) { console.log('\n■ ' + name); }

// ---------------------------------------------------------------- 36단계: 리소스 연결
section('리소스');
{
  const A = G.Assets, real = G.Data.assets.files;
  check(A.sprite('kai') === null && A.cardArt('K01') === null && A.icon('strength') === null, '리소스가 없으면 null(코드 그림)');
  G.Data.assets.files = { 'characters/heroes/kai_idle.png': [512, 512, 1], 'characters/heroes/kai_attack_s6.png': [3072, 512, 1], 'characters/monsters/toad_king_idle.webp': [1024, 1024, 1],
    'cards/art/K01.jpg': [600, 500, 0], 'cards/frames/ink_rare.png': [500, 700, 1], 'icons/status/strength.png': [128, 128, 1], 'items/relics/R01.png': [128, 128, 1],
    'backgrounds/battle_forest.jpg': [1920, 1080, 0], 'backgrounds/world_map.png': [2000, 1120, 0], 'characters/heroes/kai_portrait.png': [1024, 1536, 1] };
  const k = A.sprite('kai'), t = A.sprite('toad_king');
  check(k && k.hero && k.poses.idle.url === 'assets/characters/heroes/kai_idle.png' && k.poses.attack.frames === 6 && k.poses.attack.w === 512 && !k.poses.hit, '동료 동작: 한 장 · 가로 시트(_s6)');
  check(t && !t.hero && /toad_king_idle\.webp$/.test(t.poses.idle.url) && A.sprite('slime') === null, '몬스터 동작(확장자 webp), 없는 몬스터는 null');
  check(A.cardArt('K01+3') === 'assets/cards/art/K01.jpg' && A.cardFrame('ink', 'rare') && !A.cardFrame('split', 'rare'), '카드 그림은 강화 단계와 상관없이 원래 id, 틀은 계열·등급');
  check(A.icon('strength') === 'assets/icons/status/strength.png' && A.relic('R01') && !A.item('I01'), '아이콘은 하위 폴더와 상관없이 이름으로');
  check(A.battleBg('forest') && !A.battleFore('forest') && A.worldMap() && A.portrait('kai') && !A.face('kai'), '배경 · 월드맵 · 전신 일러스트');
  const ex = A.expected();
  check(ex.filter(o => o.kind === 'monsterPose' && o.pose === 'idle').length === G.Data.monsters.length && ex.some(o => o.kind === 'cardArt' && o.id === 'K01' && o.have), '필요한 그림 목록(몬스터마다 동작 · 있는 것 표시)');
  G.Data.assets.files = real;
  const r = require('child_process').spawnSync('node', [path.join(ROOT, 'tools/sync-assets.js'), '--check'], { encoding: 'utf8' });
  check(r.status === 0, '리소스 폴더와 목록이 같고 규격 오류가 없다 (node tools/sync-assets.js)' + (r.status ? '\n' + r.stdout : ''));
}

// ---------------------------------------------------------------- 데이터 검사
section('데이터');
// 27단계: 새 영웅 그림 — 다섯 명 모두 대기 8 · 공격 8 · 스킬 16 · 맞음 2장면, 장면마다 몸이 그려지고 얼굴 칸에 피부색이 있다
{
  const P = G.Puppet;
  ['kai', 'bram', 'lyra', 'sera', 'nox', 'ciel'].forEach(id => {
    const d = P.designs[id];
    check(!!d, id + ': 새 영웅 그림 설계');
    if (!d) return;
    const r = P.renderAll(d), ix = r.index;
    check(ix.idle.n === 8 && ix.attack.n === 8 && ix.skill.n === 16 && ix.hit.n === 2 && r.frames.length === 34, id + ': 동작 장면 수');
    const solid = r.frames.map(px => { let n = 0; for (let k = 3; k < px.length; k += 4) if (px[k] === 255) n++; return n; });
    check(solid.every(n => n > 700 && n < r.w * r.h * 0.6), id + ': 장면마다 몸이 그려진다 (' + Math.min(...solid) + '~' + Math.max(...solid) + ')');
    const f0 = r.frames[0], fx = Math.round(d.face[0]), fy = Math.round(d.face[1]), k = (fy * r.w + fx) * 4;
    check(f0[k] > 200 && f0[k + 1] > 150 && f0[k + 2] > 120, id + ': 얼굴 위치(컷인)가 얼굴 위에 있다');
    const changed = r.frames.slice(ix.attack.start, ix.attack.start + 8).some(px => px.some((v, j) => v !== r.frames[0][j]));
    check(changed, id + ': 공격 동작이 대기와 다르다');
  });
}
// 25단계: 배경음악 곡 글자 · 화면 → 곡
{
  const errs = G.Music.validate();
  check(errs.length === 0, '배경음악 곡 글자 (' + errs.slice(0, 5).join(' / ') + ')');
  check(['lobby', 'forest', 'desert', 'snow', 'volcano', 'castle', 'boss', 'final'].every(id => G.Data.music[id]), '배경음악 8곡');
  const ev = G.Music.parse({ inst: 'bass', notes: 'A2 - - . C3 - . .' });
  check(ev[0].len === 3 && ev[0].notes[0] === 45 && ev[4].len === 2 && ev[4].notes[0] === 48 && !ev[1] && !ev[3], '곡 글자: 늘림·쉼 해석');
  check(G.Music.token('Am', 'pad').notes.join() === '57,60,64' && G.Music.token('k+h', 'drums').drums.length === 2 && G.Music.token('X9', 'bass') === undefined, '곡 글자: 화음·북·잘못된 글자');
  check(G.Music.forBattle({ monsters: ['astaroth'], nodeType: 'final' }) === 'final' && G.Music.forBattle({ monsters: ['treant'], nodeType: 'boss', theme: 'forest' }) === 'boss' &&
    G.Music.forBattle({ monsters: ['slime'], nodeType: 'battle', theme: 'desert' }) === 'desert' && G.Music.forBattle({ monsters: ['slime'], nodeType: 'elite', theme: 'mirror' }) === 'castle', '전투 → 곡(혈마·보스·테마·거울의 방)');
}
// 24단계: 내장 글꼴(css/fonts.css)이 게임에 쓰는 글자를 모두 담는지 — 빠졌으면 python3 tools/embed-fonts.py 를 다시 돌린다
{
  const css = fs.readFileSync(path.join(ROOT, 'css/fonts.css'), 'utf8');
  const ur = (css.match(/font-family: 'Galmuri11';[^}]*unicode-range: ([^;]+);/) || [])[1] || '';
  const rs = ur.split(',').map(x => x.trim().slice(2).split('-').map(h => parseInt(h, 16))).map(a => [a[0], a[1] == null ? a[0] : a[1]]);
  const missing = new Set();
  ['index.html', 'css/style.css'].concat(fs.readdirSync(path.join(ROOT, 'data')).map(f => 'data/' + f), fs.readdirSync(path.join(ROOT, 'js')).map(f => 'js/' + f)).forEach(f => {
    let src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (f.endsWith('.js')) src = src.replace(/(^|\s)\/\/.*$/gm, '');   // 화면에 나오지 않는 // 주석은 뺀다
    if (f.endsWith('.css')) src = src.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const ch of src) {
      const cp = ch.codePointAt(0);
      if (cp >= 0x20 && cp !== 0xfeff && !rs.some(r => cp >= r[0] && cp <= r[1])) missing.add(ch);
    }
  });
  check(missing.size === 0, '내장 글꼴에 없는 글자 ' + missing.size + '자(' + [...missing].slice(0, 20).join('') + ') — python3 tools/embed-fonts.py 를 다시 실행');
}
const cards = G.Data.cards.filter(c => c.owner !== 'none');
check(cards.length === 277, '카드 277장 (현재 ' + cards.length + ')');
const KNOWN_OPS = ['damage', 'block', 'heal', 'status', 'cleanse', 'revive', 'loseHp', 'draw', 'energy', 'discount',
  'doubleNext', 'gold', 'power', 'if', 'chance', 'oneOf', 'conjure', 'addCard', 'randomizeCosts', 'freeRandom', 'summon', 'custom',
  'discard', 'exhaust', 'scry', 'clearStatus', 'loseBlock', 'res', 'spendRes',
  'costUp', 'drainEnergy', 'drainDraw', 'selfDestruct'];   // 34단계: 적의 방해·자폭
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
check(G.Data.monsters.length === 80, '몬스터 80종 (현재 ' + G.Data.monsters.length + ')');
check(G.Data.monsters.filter(m => m.mirror).length === 6, '거울 속 그림자 6종');

// 강화 카드: 200장 모두 무언가 바뀌고, 설명의 {dN}·{+…} 가 올바르다
cards.forEach(c => {
  const u = G.Data.cardById[c.id + '+'];
  check(u && u.upgraded && u.base === c.id, c.id + ': 강화 카드 없음');
  if (!u) return;
  check(u.changed, c.id + ': 강화해도 바뀌는 것이 없음');
  check(JSON.stringify(u) !== JSON.stringify(Object.assign({}, c, { id: u.id, base: u.base, upgraded: true, name: u.name, changed: true, upDmg: u.upDmg })),
    c.id + ': 강화 카드가 원래 카드와 같음');
  walk(u.effects, u.id);
  let n = 0;
  (function count(list) { list.forEach(e => { if (e.op === 'damage') n++; if (e.op === 'power') return; ['then', 'else'].forEach(k => e[k] && count(e[k])); }); })(u.effects);
  (u.text.match(/\{d(\d)\}/g) || []).forEach(m => check(+m[2] < n, u.id + ': 설명의 ' + m + ' 에 해당하는 피해 효과 없음'));
  check(!/\{(?![d+])/.test(u.text) && (u.text.match(/\{/g) || []).length === (u.text.match(/\}/g) || []).length, u.id + ': 설명의 { } 짝이 맞지 않음');
  check(/\{\+|\{d/.test(u.text) || u.cost !== c.cost || u.exhaust !== c.exhaust, u.id + ': 강화로 바뀐 수치 표시({+N})가 없음');
});
// 18단계: 2·3단계 강화 카드 — 수치가 1단계 이상이고 각인이 붙는다
const SK = G.Data.upgradeSkills;
Object.values(SK.pick).forEach(m => Object.values(m).forEach(k => check(SK.skills[k], 'data/upgrades.js: 없는 각인 ' + k)));
Object.keys(SK.skills).forEach(k => ['lv2', 'lv3'].forEach(l => {
  const s = SK.skills[k][l];
  check(s && s.effects.length && s.text, k + '.' + l + ': 각인 효과·설명 없음');
  if (s) walk(s.effects, '각인 ' + k + '.' + l);
}));
cards.forEach(c => {
  [2, 3].forEach(l => {
    const u = G.Data.cardById[c.id + '+' + l], prev = G.Upgrade.def(c.id, l - 1);
    check(u && u.level === l && u.base === c.id && u.engrave && u.engrave.level === l, c.id + '+' + l + ': ' + l + '단계 강화 카드·각인 없음');
    if (!u) return;
    check(u.cost === prev.cost || (u.cost === c.cost - 1 && prev.cost === u.cost), u.id + ': 2·3단계에서 비용이 바뀜');
    check(u.text.indexOf('{*' + u.engrave.name + '}') >= 0, u.id + ': 설명에 각인 표시({*이름})가 없음');
    walk(u.effects, u.id);
    let n = 0;
    (function count(list) { list.forEach(e => { if (e.op === 'damage') n++; if (e.op === 'power') return; ['then', 'else'].forEach(k => e[k] && count(e[k])); }); })(u.effects);
    (u.text.match(/\{d(\d)\}/g) || []).forEach(m => check(+m[2] < n, u.id + ': 설명의 ' + m + ' 에 해당하는 피해 효과 없음'));
    check(!/\{(?![d+*])/.test(u.text) && (u.text.match(/\{/g) || []).length === (u.text.match(/\}/g) || []).length, u.id + ': 설명의 { } 짝이 맞지 않음');
  });
});
check(G.Data.cardById['K01+2'].effects[0].value === 10 && G.Data.cardById['K01+3'].effects[0].value === 12, '강화 규칙: 청운일검 6 → 8 → 10 → 12');
check(G.Data.cardById['K01+2'].engrave.id === 'swordQi' && G.Data.cardById['L01+3'].engrave.id === 'ember' && G.Data.cardById['S01+2'].engrave.id === 'purify', '각인 고르기: 무공 공격 검기 · 불 공격 불씨 · 회복 정화');
check(G.Upgrade.levelOf('K01+3') === 3 && G.Upgrade.levelOf('K01+') === 1 && G.Upgrade.levelOf('K01') === 0 && G.Upgrade.baseOf('K01+2') === 'K01', '강화 id 규칙');
check(G.Upgrade.idOf('K01', { K01: 2 }) === 'K01+2' && G.Upgrade.idOf('K01', {}) === 'K01', '강화 단계 표 → 카드 id');
check(G.Data.cardById['K01+'].effects[0].value === 8, '강화 규칙: 베기 6 → 8');
check(G.Data.cardById['K22+'].cost === 2, '강화 규칙: 비용 3 → 2');
check(G.Data.cardById['K15+'].cost === 0, '강화 규칙: 지속 카드 비용 -1');
check(G.Data.cardById['K17+'].effects[0].then[0].value === 36 && G.Data.cardById['K17+'].effects[0].else[0].value === 18, '강화 규칙: 2배 관계 유지 (처형 18/36)');
check(G.Data.cardById['K17+'].effects[0].cond.n === 0.6, '강화 규칙: 조건 완화 절반 → 60%');
check(!G.Data.cardById['L12+'].exhaust, '예외: 마력 충전+ 소멸 제거');
check(G.Data.cardById['C29+'].effects[0].p === 0.65, '예외: 동전 던지기+ 앞면 65%');
check(G.Data.cardById['C30+'].effects[0].options[3].effects[0].value === 3, '아군에게 거는 디버프(수상한 물약의 중독)는 올리지 않음');
check(G.util.numJosa('피해 4을 3회, 6를, 7으로') === '피해 4를 3회, 6을, 7로', '숫자 조사 교정');

// 9단계: 짝 연계 10 · 합동기 10 · 대화 30 · 특성 50 (30단계 시엘: 15 · 15 · 45 · 60)
const HEROES = G.Data.characters.map(c => c.id);
check(G.Data.pairCombos.length === 15, '짝 연계 15종');
check(new Set(G.Data.pairCombos.map(p => p.from + '>' + p.to)).size === 15, '짝 연계 중복 없음');
G.Data.pairCombos.forEach(p => { check(HEROES.includes(p.from) && HEROES.includes(p.to) && p.from !== p.to, p.name + ': 캐릭터'); if (p.after) walk(p.after, p.name); });
check(G.Data.duoCards.length === 15, '합동기 15장');
G.Data.duoCards.forEach(c => {
  walk(c.effects, c.id);
  check(c.duo.length === 2 && c.duo.includes(c.caster), c.id + ': 짝과 시전자');
  check(G.Data.cardById[c.id] === c && !G.Data.cards.includes(c), c.id + ': 조회 표에만 등록');
  check(c.sfx && G.FX.SFX[c.sfx], c.id + ': 고유 이펙트');
});
const pairKeys = []; for (let i = 0; i < HEROES.length; i++) for (let j = i + 1; j < HEROES.length; j++) pairKeys.push(HEROES[i] + '+' + HEROES[j]);
check(pairKeys.every(k => G.Data.duoByPair[k]), '짝마다 합동기 1장');
check(Object.keys(G.Data.dialogues).length === 15 && pairKeys.every(k => G.Data.dialogues[k] && G.Data.dialogues[k].length === 3), '대화 짝 15 × 3편');
pairKeys.forEach(k => G.Data.dialogues[k].forEach((d, i) => {
  check(d.length >= 3 && d.length <= 6, k + ' 대화 ' + (i + 1) + ': 3~6줄');
  check(d.every(l => k.split('+').includes(l[0]) && l[1]), k + ' 대화 ' + (i + 1) + ': 말하는 사람은 그 짝');
}));
const TRAIT_KEYS = ['maxHp', 'critAdd', 'startStatus', 'startBlock', 'turnStartBlock', 'firstAttackBonus', 'lowHpDamage', 'aoeDamage', 'singleDamage',
  'selfBlockDmgMult', 'frozenDmgMult', 'onKillBlock', 'onKillHeal', 'onKillEnergy', 'thirdAttackDraw', 'firstOwnAttackDiscount', 'firstOwnCardDiscount',
  'blockAdd', 'healAdd', 'statusAdd', 'endTurnThornsIfBlock', 'shareBlock', 'undyingOnce', 'onHitBlock', 'onFreezeDraw', 'burnVuln', 'cleanseBlock',
  'overhealBlock', 'revivePct', 'selfRevive', 'turnStartHealLowest', 'attackHealLowest', 'firstDebuffDraw', 'firstTurnEnergy', 'firstTurnDraw', 'everyN', 'winHeal', 'startRes'];
let traitN = 0;
HEROES.forEach(id => {
  check(G.Data.traits[id] && G.Data.traits[id].length === 5, id + ': 특성 5레벨');
  (G.Data.traits[id] || []).forEach(lv => { check(lv.length === 2, id + ': 레벨마다 2개'); lv.forEach(t => { traitN++; Object.keys(t.mods).forEach(k => check(TRAIT_KEYS.includes(k), id + ' ' + t.name + ': 알 수 없는 특성 효과 ' + k)); }); });
});
check(traitN === 60, '특성 60개 (' + traitN + ')');

// 이벤트 40종(22단계 30, 29단계 40)
check(G.Data.events.length === 40, '이벤트 40종');
const EVENT_OPS = ['gold', 'hp', 'card', 'cardChoice', 'relic', 'upgrade', 'buff', 'curse', 'mirror', 'exp', 'bond', 'chance', 'fight', 'cutNext', 'item', 'purge', 'dup'];
G.Data.events.forEach(ev => {
  check(ev.choices.length >= 2, ev.id + ': 선택지 2개 이상');
  (function w(list) {
    list.forEach(op => {
      check(EVENT_OPS.includes(op.op), ev.id + ': 알 수 없는 이벤트 효과 ' + op.op);
      if (op.effects) walk(op.effects, ev.id);
      if (op.then) w(op.then);
      if (op.else) w(op.else);
    });
  })([].concat(...ev.choices.map(c => c.effects)));
});

// 희귀 이상 카드는 모두 고유 이펙트(sfx)를 가지고, 그 키가 effects.js 에 있다
cards.forEach(c => {
  const rare = ['rare', 'epic', 'legendary'].includes(c.rarity);
  if (rare) check(c.sfx && G.FX.SFX[c.sfx], c.id + ': 희귀 이상인데 고유 이펙트 없음 (' + c.sfx + ')');
  else check(!c.sfx, c.id + ': 일반·고급인데 고유 이펙트가 있음');
});

// 18단계: 카드 도트 연출 배정(data/fx.js)의 이름이 모두 js/fx-pixel.js 에 있고, 모든 카드가 연출을 고를 수 있다
(function () {
  const D = G.Data.cardFx;
  const names = [].concat(Object.values(D.byCard), Object.values(D.heal), Object.values(D.byOwner), Object.values(D.byElement), Object.values(D.bySchool));
  names.forEach(k => check(G.PFX.has(k), 'data/fx.js: 없는 도트 연출 ' + k));
  Object.keys(D.byCard).forEach(id => check(G.Data.cardById[id], 'data/fx.js: 없는 카드 ' + id));
  Object.values(D.elPal).forEach(p => check(G.PFX.glowOf(p) !== '#ffffff' || p === 'none', 'data/fx.js: 없는 팔레트 ' + p));
  cards.forEach(c => { const k = G.PFX.keyFor(c, c.el || 'neutral'); check(G.PFX.has(k), c.id + ': 도트 연출을 고르지 못함 (' + k + ')'); });
})();

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
  const m = line.match(/^\| ([KBLSNAC]\d\d)(★?) \| ([^|]+) \| (\S+) \| (\S+) \| (\S+) \| ([^|]+) \| ([^|]*) \|/);
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
check(docRows === 277, '기획서 카드 표 277행 (현재 ' + docRows + ')');
// '강화' 열은 데이터에서 만든 문구와 같아야 한다 (다르면 node tools/doc-upgrades.js)
let upRows = 0;
doc.split('\n').forEach(line => {
  const m = line.match(/^\| ([KBLSNAC]\d\d)★? \|(?:[^|]*\|){7} ([^|]*) \|$/);
  if (!m) return;
  upRows++;
  check(G.Upgrade.summary(m[1]) === m[2], m[1] + ' 강화 열이 데이터와 다름 (node tools/doc-upgrades.js)');
});
check(upRows === 277, '기획서 카드 표 강화 열 277행 (현재 ' + upRows + ')');

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
  b.heroes.forEach(h => { h.res = 0; }); // 21단계: 하린 검세를 비워 둔다
  await b.play(handCard(b, 'K01'), b.monsters[1]);
  check(b.monsters[1].block === 0 && hp0 - b.monsters[1].hp === 2, '보호막 4 → 피해 6 중 2만 체력');

  // 집중은 확정 치명타 (2배)
  b = await newBattle(['kai'], ['treant']);
  b.heroes[0].crit = 0; b.heroes[0].status.focus = 1; b.energy = 3;
  hp0 = b.monsters[0].hp;
  await b.play(handCard(b, 'K01'), b.monsters[0]);
  check(hp0 - b.monsters[0].hp === 12 && !b.heroes[0].status.focus, '집중 → 치명타 12, 집중 소모');

  // ---- 34단계: 적 기믹 ----
  {
    const plain = (bb) => { bb.heroes.forEach(h => { h.crit = 0; h.res = 0; }); bb.energy = 9; };
    // 회피: 공격 1회를 통째로 피한다
    b = await newBattle(['kai'], ['assassin']); plain(b);
    let m = b.monsters[0]; m.status.dodge = 1; hp0 = m.hp;
    await b.play(handCard(b, 'K01'), m);
    check(m.hp === hp0 && !m.status.dodge, '회피: 첫 공격을 피하고 1 감소');
    plain(b); await b.play(handCard(b, 'K01'), m);
    check(m.hp === hp0 - 6, '회피가 없으면 맞는다');
    // 엄호: 같은 편이 살아 있으면 받는 피해 절반
    b = await newBattle(['kai'], ['gargoyle', 'skeleton']); plain(b);
    m = b.monsters[0]; hp0 = m.hp;
    await b.play(handCard(b, 'K01'), m);
    check(hp0 - m.hp === 3, '엄호: 피해 6 → 3 (실제 ' + (hp0 - m.hp) + ')');
    await b.die(b.monsters[1]); plain(b); hp0 = m.hp;
    await b.play(handCard(b, 'K01'), m);
    check(hp0 - m.hp === 6, '엄호: 혼자 남으면 그대로');
    // 분열: 절반 아래로 내려가면 남은 체력을 나눠 가진 둘로
    b = await newBattle(['kai'], ['mushroom']); plain(b);
    m = b.monsters[0]; m.hp = 16;
    await b.play(handCard(b, 'K01'), m);
    const sp = b.alive('enemy');
    check(m.dead && sp.length === 2 && sp.every(x => x.id === 'spore' && x.hp === 5 && x.maxHp === 5) && !b.over(), '분열: 독버섯 10 → 포자 버섯 5 · 5');
    // 자폭: 아군 전체 피해 후 사라진다(전투도 끝난다)
    b = await newBattle(['kai', 'bram'], ['lava_blob']);
    m = b.monsters[0]; m.intent = 'boom'; m.intentTarget = null;
    const hpK = b.heroes[0].hp, hpB = b.heroes[1].hp;
    await b.act(m);
    check(m.dead && b.heroes[0].hp < hpK && b.heroes[1].hp < hpB && b.over() && b.result === 'win', '자폭: 전체 피해 후 사라진다');
    // 비용 올리기 · 에너지 줄이기 · 뽑기 줄이기(다음 내 턴에 적용)
    const deck10 = Array(10).fill('K01');
    b = await newBattle(['kai'], ['ice_witch'], deck10);
    b.piles.draw = b.piles.draw.concat(b.piles.hand); b.piles.hand = [];
    m = b.monsters[0]; m.intent = 'freeze'; m.intentTarget = b.heroes[0];
    await b.act(m);
    check(b.costUpNext === 2, '얼음 족쇄: 다음 턴 비용 올리기 2');
    await b.startPlayerTurn();
    check(b.piles.hand.filter(c => c.frosted).length === 2 && !b.costUpNext, '다음 턴 손패 2장 비용 +1');
    b = await newBattle(['kai'], ['paper_ghost', 'rift_wisp'], deck10);
    b.monsters[0].intent = 'haunt'; b.monsters[0].intentTarget = b.heroes[0];
    b.monsters[1].intent = 'hex'; b.monsters[1].intentTarget = b.heroes[0];
    await b.act(b.monsters[0]); await b.act(b.monsters[1]);
    b.piles.draw = b.piles.draw.concat(b.piles.hand, b.piles.discard); b.piles.hand = []; b.piles.discard = [];
    await b.startPlayerTurn();
    check(b.energy === 2 && b.piles.hand.length === 4, '혼 흔들기 에너지 -1 · 넋 흔들기 카드 -1 (에너지 ' + b.energy + ', 손패 ' + b.piles.hand.length + ')');
    // 엄호 자세: 체력 비율이 가장 낮은 같은 편에게 보호막
    b = await newBattle(['kai'], ['goblin', 'slime']);
    b.monsters[1].hp = 1; b.monsters[0].intent = 'guard';
    await b.act(b.monsters[0]);
    check(b.monsters[1].block === 6 && b.monsters[0].block === 0, '엄호 자세: 약한 동료에게 보호막 6');
    // 저주 카드: 독기는 손패에 든 채 턴이 끝나면 중독 2, 속박은 에너지 1로 써서 없앤다
    b = await newBattle(['kai'], ['gargoyle']);
    const k = b.heroes[0], kHp = k.hp;
    b.piles.hand = [G.Deck.inst('CUR_POISON')];
    check(!b.canPlay(b.piles.hand[0]).ok, '독기는 쓸 수 없다');
    await b.endTurn();
    check(kHp - k.hp >= 2, '독기: 턴이 끝나면 중독 (잃은 체력 ' + (kHp - k.hp) + ')');
    b = await newBattle(['kai'], ['slime']); b.energy = 1;
    const bind = handCard(b, 'CUR_BIND');
    check(b.canPlay(bind).ok, '속박은 쓸 수 있다');
    await b.play(bind, null);
    check(b.energy === 0 && b.piles.exhaust.indexOf(bind) >= 0, '속박: 에너지 1, 소멸');
    // 몬스터 행동이 저주 카드를 섞어 넣는다
    b = await newBattle(['kai'], ['dark_mage']);
    b.monsters[0].intent = 'curse'; b.monsters[0].intentTarget = b.heroes[0];
    await b.act(b.monsters[0]);
    check(b.piles.discard.some(c => c.id === 'CUR_BLOOD'), '혈교 술사: 혈흔을 버린 더미에');
  }

  {
  // ---- 24단계: 턴 되돌리기 ----
  b = await newBattle(['kai', 'bram'], ['slime', 'slime'], ['K01', 'K01', 'K01', 'K01', 'K01', 'B01', 'B01', 'C01'], { undo: true });
  const u0 = { hand: b.piles.hand.map(c => c.uid).join(), energy: b.energy, mhp: b.monsters.map(m => m.hp).join(), items: b.items.length };
  check(!b.canUndo(), '되돌리기: 아무것도 안 했으면 되돌릴 게 없다');
  const atk = b.piles.hand.find(c => c.id === 'K01');
  await b.play(atk, b.monsters[0]);
  check(b.canUndo() && b.monsters[0].hp < +u0.mhp.split(',')[0], '되돌리기: 카드를 쓰면 되돌릴 수 있다');
  b.undo();
  check(b.piles.hand.map(c => c.uid).join() === u0.hand && b.energy === u0.energy && b.monsters.map(m => m.hp).join() === u0.mhp, '되돌리기: 손패·에너지·적 체력이 턴 시작으로');
  check(b.monsters.every(m => m.def === G.Data.monsterById[m.id]) && b.piles.hand.every(c => c.def === G.Data.cardById[c.id]), '되돌리기: 데이터 정의는 같은 객체를 가리킨다');
  check(b.heroes.every(h => b.alive('ally').indexOf(h) >= 0), '되돌리기: 복제된 영웅끼리 참조가 이어진다');
  // 되돌린 뒤에도 정상 진행되고 다시 되돌릴 수 있다
  const atk2 = b.piles.hand.find(c => c.id === 'K01');
  await b.play(atk2, b.monsters[1]);
  check(b.undo() && b.monsters.map(m => m.hp).join() === u0.mhp, '되돌리기: 여러 번');
  await b.endTurn();
  check(b.turn === 2 && b.phase === 'player' && !b.canUndo(), '되돌리기: 다음 턴 시작에 새로 떠 둔다');
  const nb = await newBattle(['kai'], ['slime']);
  const a3 = nb.piles.hand.find(c => c.def.type === 'attack') || handCard(nb, 'K01');
  await nb.play(a3, nb.monsters[0]);
  check(!nb.canUndo(), '되돌리기: undo 옵션이 없으면(하드·하드코어) 쓸 수 없다');
  }

  {
  // ---- 20단계: 보존 · 선천성 · 버리기(버려지면) · 미리 보기 · 소멸 연계 · 적의 반응 ----
  b = await newBattle(['kai'], ['slime'], ['C01', 'C01', 'C01', 'C01', 'C01', 'C01', 'C01', 'K36']);
  check(b.piles.hand.some(c => c.id === 'K36'), '선천성: 첫 손패에 들어온다');
  b = await newBattle(['kai'], ['slime', 'slime']);
  const ret = handCard(b, 'K35');
  await b.endTurn();
  check(b.piles.hand.indexOf(ret) >= 0, '보존: 턴이 끝나도 손패에 남는다');
  b = await newBattle(['nox'], ['slime', 'slime']);
  b.piles.hand = [];
  const sly = handCard(b, 'N35'); handCard(b, 'C01');
  const hpSum = () => b.monsters.reduce((a, m) => a + m.hp, 0);
  let hb = hpSum(); b.energy = 3;
  await b.play(handCard(b, 'N36'), null);
  check(b.discardedTurn === 2 && hpSum() < hb && sly, '버리기: 2장, 버려지면 피해');
  check(b.evalCond({ is: 'discardedTurn', op: '>=', n: 2 }, {}, null), '조건: 이번 턴 버린 수');
  b = await newBattle(['kai'], ['slime'], ['C01', 'C02', 'C03', 'C05', 'C07', 'K01', 'K02', 'K03', 'K04', 'K08']);
  const drawN = b.piles.draw.length, discN = b.piles.discard.length;
  b.energy = 3;
  await b.play(handCard(b, 'C34'), null);
  check(b.piles.draw.length + (b.piles.discard.length - discN) <= drawN && b.piles.hand.length >= 6, '미리 보기 3 + 1장 뽑기');
  b = await newBattle(['kai'], ['slime', 'slime']);
  b.energy = 5;
  await b.play(handCard(b, 'C36'), null);
  handCard(b, 'C01');
  hb = hpSum();
  await b.play(handCard(b, 'C35'), null);
  check(b.exhaustedBattle === 2 && hpSum() < hb && b.energy === 6, '결단: 1장 소멸 + 자신 소멸 → 분노의 칼날 2번, 에너지 +2 (에너지 ' + b.energy + ')');
  // 반격 태세: 한 턴 3번째 공격 카드
  b = await newBattle(['kai'], ['baltar']);
  check(b.monsters[0].status.riposte === 6, '사부 청운자: 반격 태세 6');
  const kh = b.heroes[0].hp; b.energy = 9; b.heroes[0].crit = 0;
  for (let i = 0; i < 3; i++) await b.play(handCard(b, 'K01'), b.monsters[0]);
  check(b.heroes[0].hp === kh - 6, '반격 태세: 세 번째 공격 카드에 6 피해 (' + (kh - b.heroes[0].hp) + ')');
  // 시간의 모래: 7장째에 턴이 끝난다
  b = await newBattle(['kai'], ['pharaoh']);
  b.energy = 20;
  const t0 = b.turn;
  for (let i = 0; i < 7 && b.turn === t0; i++) await b.play(handCard(b, 'K06'), null);
  check(b.turn === t0 + 1 && b.monsters[0].status.strength >= 1, '시간의 모래: 7장째 카드에 턴 종료 + 힘 1');
  // 서리 기운: 턴 시작 시 손패 1장 비용 +1
  b = await newBattle(['kai'], ['frost_queen'], ['C01', 'C01', 'C01', 'C01', 'C01', 'C01']);
  check(b.piles.hand.filter(c => c.frosted).length === 1 && b.piles.hand.some(c => b.costOf(c) === 2), '서리 기운: 손패 1장 비용 +1');
  // 복수: 덩굴이 쓰러지면 마웅 힘 +2
  b = await newBattle(['kai'], ['treant', 'vine']);
  await b.die(b.monsters[1]);
  check(b.monsters[0].status.strength === 2, '복수: 다른 적이 쓰러지면 힘 +2');
  // 가중치 행동: 같은 행동 세 번 연속 없음, 소환은 적이 3마리 미만일 때만
  {
    const w = G.Data.monsters.filter(m => m.ai === 'weighted');
    check(w.length >= 15, '가중치 행동 몬스터 ' + w.length + '종');
    b = await newBattle(['bram'], [w[0].id]);
    const m = b.monsters[0], seq = [];
    for (let i = 0; i < 60; i++) { b.predict(m); seq.push(m.intent); (m.history = m.history || []).push(m.intent); }
    let tri = false; for (let i = 2; i < seq.length; i++) if (seq[i] === seq[i - 1] && seq[i] === seq[i - 2]) tri = true;
    check(!tri && new Set(seq).size >= 2, '가중치 행동: 같은 행동 3연속 없음, 행동이 섞인다');
  }

  }
  // ---- 32단계: 연계형 · 성장형 · 자원 조건 ----
  {
    let cb = await newBattle(['kai', 'lyra'], ['treant'], ['C01']); cb.energy = 30; cb.heroes.forEach(h => { h.crit = 0; });
    // 진기 집중: 직전에 다른 동료 카드 → 힘 +3, 아니면 +2
    await cb.play(handCard(cb, 'K06'), null);
    check(cb.heroes[0].status.tempStr === 2, '진기 집중: 처음엔 +2');
    await cb.play(handCard(cb, 'L03'), null); await cb.play(handCard(cb, 'K06'), null);
    check(cb.heroes[0].status.tempStr === 5, '진기 집중: 직전 리라 카드 → +3 (' + cb.heroes[0].status.tempStr + ')');
    // 유수검: 쓸 때마다 타격 +1
    cb = await newBattle(['kai'], ['treant'], ['C01']); cb.energy = 30; cb.heroes[0].crit = 0;
    let mh = cb.monsters[0].hp; await cb.play(handCard(cb, 'K39'), cb.monsters[0]); const d1 = mh - cb.monsters[0].hp;
    mh = cb.monsters[0].hp; await cb.play(handCard(cb, 'K39'), cb.monsters[0]); const d2 = mh - cb.monsters[0].hp;
    check(d2 > d1, '유수검: 두 번째가 더 세다 (' + d1 + ' → ' + d2 + ')');
    // 삼재검: 연계 2 이상이면 4회
    cb = await newBattle(['kai', 'lyra'], ['treant'], ['C01']); cb.energy = 30; cb.heroes.forEach(h => { h.crit = 0; });
    await cb.play(handCard(cb, 'L03'), null);
    mh = cb.monsters[0].hp; await cb.play(handCard(cb, 'K10'), cb.monsters[0]);
    check(cb.chain.count === 2 && mh - cb.monsters[0].hp === (4 + 1) * 4, '삼재검: 연계 2 → 피해 (4+1)×4 (' + (mh - cb.monsters[0].hp) + ')');
    // 정심결: 검세 3 이상이면 집중 3
    cb = await newBattle(['kai'], ['treant'], ['C01']); cb.energy = 30; cb.heroes[0].res = 3;
    await cb.play(handCard(cb, 'K12'), null);
    check(cb.heroes[0].status.focus === 3, '정심결: 검세 3 → 집중 3');
    // 철벽: 쓸 때마다 보호막 +4
    cb = await newBattle(['bram'], ['treant'], ['C01']); cb.energy = 30;
    await cb.play(handCard(cb, 'B10'), null); const b1 = cb.heroes[0].block;
    await cb.play(handCard(cb, 'B10'), null);
    check(b1 === 12 && cb.heroes[0].block === 12 + 16, '철벽: 12 → 16 (' + b1 + ', ' + (cb.heroes[0].block - b1) + ')');
  }
  // ---- 21단계: 고유 자원 ----
  {
    let rb = await newBattle(['kai', 'bram', 'lyra', 'sera', 'nox'].slice(0, 3), ['treant']);
    const [hk, hb2, hl] = rb.heroes; hk.crit = 0; rb.energy = 20;
    for (let i = 0; i < 5; i++) await rb.play(handCard(rb, 'K01'), rb.monsters[0]);
    check(hk.res === 5, '검세: 공격 카드 5장 → 5 (' + hk.res + ')');
    let mh = rb.monsters[0].hp;
    await rb.play(handCard(rb, 'K01'), rb.monsters[0]);
    check(hk.res === 0 && mh - rb.monsters[0].hp === 12, '검세 5: 다음 공격 치명타 확정 후 0 (피해 ' + (mh - rb.monsters[0].hp) + ')');
    await rb.play(handCard(rb, 'B02'), null); await rb.play(handCard(rb, 'B02'), null);
    check(hb2.res === 2, '반격 자세: 방어 카드 2장 → 2');
    mh = rb.monsters[0].hp;
    await rb.hit(rb.monsters[0], hb2, 1, {}, rb.monsterCtx(rb.monsters[0]));
    check(hb2.res === 0 && mh - rb.monsters[0].hp === 6, '반격 자세: 맞으면 2 × 3 = 6 되갚기');
    mh = rb.monsters[0].hp;
    for (let i = 0; i < 5; i++) await rb.play(handCard(rb, 'L03'), null);
    check(hl.res === 0 && rb.monsters[0].hp <= mh - 8 && rb.monsters[0].status.burn >= 2, '원소 공명 5: 원소 폭발 후 0');
    rb = await newBattle(['sera', 'kai'], ['treant']);
    const hs = rb.heroes[0], hk2 = rb.heroes[1]; rb.energy = 20;
    hk2.hp = 30; hs.hp = 30;
    for (let i = 0; i < 3; i++) await rb.play(handCard(rb, 'S37'), null);
    check(hs.res === 5, '신앙: 회복할 때마다 쌓인다 (' + hs.res + ')');
    hk2.hp = 3;
    await rb.loseHp(hk2, 50);
    check(!hk2.dead && hk2.hp === Math.floor(hk2.maxHp * 0.2) && hs.res === 0, '기도의 응답: 신앙 5로 쓰러질 동료가 버틴다');
    rb = await newBattle(['nox'], ['treant']); rb.energy = 20;
    await rb.play(handCard(rb, 'N01'), rb.monsters[0]); await rb.play(handCard(rb, 'N01'), rb.monsters[0]);
    const mk = rb.monsters[0].status.venomMark;
    check(mk === 2, '독 표식: 소연의 중독마다 +1 (' + mk + ')');
    mh = rb.monsters[0].hp; const pz = rb.monsters[0].status.poison;
    await rb.tickDots(rb.monsters[0]);
    check(mh - rb.monsters[0].hp === pz + 2, '독 표식: 중독 피해 + 표식');
    mh = rb.monsters[0].hp;
    await rb.play(handCard(rb, 'N38'), rb.monsters[0]);
    check(!rb.monsters[0].status.venomMark && mh - rb.monsters[0].hp >= 10, '표식 폭발: 표식 1당 5, 표식 제거');
    // 30단계: 시엘의 조준 — 스킬로 쌓고, 공격 카드의 첫 공격에 조준 × 3, 가득 차 있었으면 관통(적 전체 8)
    rb = await newBattle(['ciel'], ['treant', 'treant']); rb.energy = 20;
    const hc = rb.heroes[0]; hc.crit = 0;
    await rb.play(handCard(rb, 'A03'), null);
    check(hc.res === 2, '조준: 겨누기 → 2 (' + hc.res + ')');
    mh = rb.monsters[0].hp;
    await rb.play(handCard(rb, 'A01'), rb.monsters[0]);
    check(hc.res === 0 && mh - rb.monsters[0].hp === 12, '조준 2: 정령 화살 6 + 6, 조준을 모두 쓴다 (' + (mh - rb.monsters[0].hp) + ')');
    await rb.play(handCard(rb, 'A10'), null); await rb.play(handCard(rb, 'A10'), null);
    check(hc.res === 5, '조준: 최대 5');
    const m1 = rb.monsters[1].hp; mh = rb.monsters[0].hp;
    await rb.play(handCard(rb, 'A01'), rb.monsters[0]);
    check(mh - rb.monsters[0].hp === 6 + 15 + 8 && m1 - rb.monsters[1].hp === 8 && hc.res === 0, '조준 5: 피해 +15, 관통 적 전체 8');
    await rb.play(handCard(rb, 'A16'), rb.monsters[1]);
    check(hc.res === 0, '조준 없이 공격하면 그대로 0');
  }

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
  b.heroes.forEach(h => { h.res = 0; }); // 21단계: 하린 검세를 비워 둔다
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
  check(G.Data.relics.length === 65, '유물 65종');
  // 22단계: 소모품
  {
    const ib = await newBattle(['kai'], ['slime', 'slime'], ['C01'], { items: ['I02', 'I05', 'I03'] });
    const e0 = ib.energy;
    check(await ib.useItem(1) && ib.energy === e0 + 2 && ib.items.length === 2, '공청석유: 에너지 +2, 칸에서 사라진다');
    check(await ib.useItem(0) && ib.heroes[0].block === 12, '금강단: 아군 전체 보호막 12');
    const hp0 = ib.monsters.map(m => m.hp);
    await ib.useItem(0);
    check(ib.monsters.every((m, i) => m.dead || m.hp <= hp0[i] - 10) && ib.items.length === 0 && ib.itemsUsed.length === 3, '폭염부: 적 전체 10 + 화상');
    check(G.Data.items.length === 18, '소모품 18종');
    const ib2 = await newBattle(['kai', 'bram'], ['slime', 'slime'], ['C01'], { items: ['I13', 'I17', 'I16'] });
    await ib2.useItem(0);
    check(ib2.heroes.every(h => h.block === 6 && h.status.hold === 1), '철벽부: 아군 전체 보호막 6 + 버티기');
    await ib2.useItem(0);
    check(ib2.monsters.some(m => m.status.frozen > 0), '빙혼부: 무작위 적 빙결');
    await ib2.useItem(0);
    check(ib2.heroes.every(h => h.status.focus === 1), '청심단: 아군 전체 집중 1');
  }
  // 22단계: 사건 유물
  {
    let rb = await newBattle(['kai'], ['slime', 'slime'], ['C01'], { relics: ['R31'] });
    rb.energy = 20; rb.piles.draw = [G.Deck.inst('C01'), G.Deck.inst('C01')];
    const h0 = rb.piles.hand.length;
    for (let i = 0; i < 4; i++) await rb.play(handCard(rb, 'C04'), rb.alive('enemy')[0]);
    check(rb.piles.hand.length === h0 + 1, '청운 검수: 공격 카드 4장마다 1장 뽑기');
    rb = await newBattle(['bram'], ['treant'], ['C01'], { relics: ['R32'] });
    rb.energy = 5; let mh = rb.monsters[0].hp;
    await rb.play(handCard(rb, 'B02'), null);
    check(rb.monsters[0].hp === mh - 2, '방패 휘장: 방어 카드마다 무작위 적 피해 2');
    rb = await newBattle(['kai'], ['slime', 'slime'], ['C01'], { relics: ['R37'] });
    rb.energy = 0;
    await rb.die(rb.monsters[0]);
    check(rb.energy === 1, '혈전의 깃발: 처치하면 에너지 +1');
    rb = await newBattle(['kai'], ['treant'], ['C01'], { relics: ['R38'] });
    const hp1 = rb.heroes[0].hp;
    await rb.hit(rb.monsters[0], rb.heroes[0], 5, {}, rb.monsterCtx(rb.monsters[0]));
    check(rb.heroes[0].block === 4, '응혈 부적: 맞으면 보호막 4 (' + rb.heroes[0].block + ')');
    await rb.hit(rb.monsters[0], rb.heroes[0], 5, {}, rb.monsterCtx(rb.monsters[0]));
    check(rb.heroes[0].block === 0 && rb.heroes[0].hp === hp1 - 6, '응혈 부적: 턴마다 1번');
    rb = await newBattle(['nox'], ['treant'], ['C01'], { relics: ['R40'] });
    rb.energy = 5; mh = rb.monsters[0].hp;
    await rb.play(handCard(rb, 'N03'), rb.heroes[0]);
    await rb.play(handCard(rb, 'C09'), rb.monsters[0]);
    check(rb.monsters[0].hp < mh - 3, '역린의 비늘: 디버프를 걸면 그 적에게 피해 2');
    rb = await newBattle(['kai'], ['slime', 'slime'], ['C01'], { relics: ['R48'] });
    rb.energy = 20; const sum = () => rb.monsters.reduce((a, m) => a + Math.max(0, m.hp), 0); let s0 = sum();
    for (let i = 0; i < 5; i++) await rb.play(handCard(rb, 'K06'), null);
    check(sum() === s0 - 12, '천둥새 깃털: 한 턴 5번째 카드에 적 전체 6');
    rb = await newBattle(['kai', 'bram'], ['treant'], ['C01'], { relics: ['R36'] });
    check(rb.heroes[0].res === 2 && rb.heroes[1].res === 2, '단전 수련서: 시작 시 고유 자원 +2');
    rb = await newBattle(['kai'], ['treant'], ['C01'], { relics: ['R44'] });
    rb.heroes[0].res = 4; rb.energy = 5; rb.piles.draw = [G.Deck.inst('C01')]; const hh = rb.piles.hand.length;
    await rb.play(handCard(rb, 'K01'), rb.monsters[0]);
    check(rb.energy === 5 && rb.piles.hand.length === hh + 1, '천외검선의 검집: 자원이 차면 1장 + 에너지 1 (' + rb.energy + ')');
    // 29단계 유물
    rb = await newBattle(['kai'], ['treant'], ['C01'], { relics: ['R55'] });
    rb.energy = 20; rb.piles.draw = [G.Deck.inst('C01'), G.Deck.inst('C01')];
    const h55 = rb.piles.hand.length;
    for (let i = 0; i < 3; i++) await rb.play(handCard(rb, 'K06'), null);
    check(rb.piles.hand.length === h55 + 1, '수련용 목검: 한 턴 3번째 카드에 1장 뽑기');
    rb = await newBattle(['kai'], ['slime', 'slime'], ['C01'], { relics: ['R58'] });
    await rb.die(rb.monsters[0]);
    check(G.Status.get(rb.monsters[1], 'poison') === 3, '독사의 송곳니: 처치하면 적 전체 중독 3');
    rb = await newBattle(['kai'], ['treant'], ['C01'], { relics: ['R59'] });
    const hp59 = rb.heroes[0].hp;
    await rb.hit(rb.monsters[0], rb.heroes[0], 5, {}, rb.monsterCtx(rb.monsters[0]));
    check(rb.heroes[0].hp === hp59 - 3, '감로 호리병: 맞으면 체력 2 회복 (' + (hp59 - rb.heroes[0].hp) + ')');
    rb = await newBattle(['kai'], ['slime', 'slime'], ['C01'], { relics: ['R64'] });
    check(rb.energy === 4 && rb.monsters.every(m => G.Status.get(m, 'strength') === 1), '천마의 인장: 에너지 +1, 적 전체 힘 1');
  }
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
  b.heroes.forEach(h => { h.res = 0; }); // 21단계: 하린 검세를 비워 둔다
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

  // 강화 카드는 전투에서 그대로 쓰인다
  b = await newBattle(['kai'], ['treant'], ['C01']);
  b.heroes[0].crit = 0; b.energy = 3; hp0 = b.monsters[0].hp;
  await b.play(handCard(b, 'K01+'), b.monsters[0]);
  check(hp0 - b.monsters[0].hp === 8, '베기+ 피해 8');
  // 전술 재편+ : 버린 수보다 2장 더
  b = await newBattle(['kai'], ['treant'], Array(20).fill('C01'));
  const before = b.piles.hand.length;
  await b.play(handCard(b, 'C23+'), null);
  check(b.piles.hand.length === before + 2, '전술 재편+ 손패 ' + (before + 2) + '장 (실제 ' + b.piles.hand.length + ')');

  // 거울 속 그림자: 스테이지에 맞춰 체력·힘
  b = await newBattle(['kai'], ['shadow_kai'], ['C01'], { stage: 10 });
  check(b.monsters[0].maxHp === 98 && b.monsters[0].status.strength === 5, '그림자 카이 10스테이지: 체력 98, 힘 5 (실제 ' + b.monsters[0].maxHp + ', ' + b.monsters[0].status.strength + ')');
  b = await newBattle(['kai'], ['shadow_kai'], ['C01'], { stage: 1 });
  check(b.monsters[0].maxHp === 48 && !b.monsters[0].status.strength, '그림자 카이 1스테이지: 체력 48, 힘 0');
  // 이벤트가 남긴 전투 시작 효과
  b = await newBattle(['kai', 'bram'], ['slime'], ['C01'], { startEffects: [{ name: '샘의 저주', effects: [{ op: 'status', status: 'weak', value: 2, target: 'allAllies' }] }] });
  check(b.heroes.every(h => h.status.weak === 2), '전투 시작 효과: 아군 전체 약화 2');

  // ---------------------------------------------------------------- 9단계: 연계·짝 연계·합동기·특성
  // 카이 → 리라: 연계 2(공격 피해 +1) + 짝 연계 '검기 마법'(추가 피해 4)
  b = await newBattle(['kai', 'lyra'], ['treant'], ['C01']);
  b.heroes.forEach(h => { h.crit = 0; }); b.energy = 5;
  hp0 = b.monsters[0].hp;
  await b.play(handCard(b, 'K01'), b.monsters[0]);
  check(hp0 - b.monsters[0].hp === 6 && b.chain.count === 1, '연계 1: 베기 6');
  hp0 = b.monsters[0].hp;
  await b.play(handCard(b, 'L01'), b.monsters[0]);
  check(b.chain.count === 2, '연계 2');
  check(hp0 - b.monsters[0].hp === (5 + 1) + 4, '연계 +1 + 검기 마법 4 = 10 (실제 ' + (hp0 - b.monsters[0].hp) + ')');
  hp0 = b.monsters[0].hp;
  await b.play(handCard(b, 'L01'), b.monsters[0]);
  check(b.chain.count === 1 && hp0 - b.monsters[0].hp === 5, '같은 캐릭터를 이어 쓰면 연계가 1로');
  // 공용 카드는 연계를 끊지 않는다 / 짝 연계는 턴당 한 번
  b = await newBattle(['kai', 'lyra'], ['treant'], ['C01']);
  b.heroes.forEach(h => { h.crit = 0; }); b.energy = 9;
  await b.play(handCard(b, 'K01'), b.monsters[0]);
  await b.play(handCard(b, 'C01'), b.monsters[0]);
  check(b.chain.last === 'kai' && b.chain.count === 1, '공용 카드는 연계를 끊지도 올리지도 않음');
  // 친밀도 2단계: 짝 연계 1.5배
  b = await newBattle(['kai', 'lyra'], ['treant'], ['C01'], { bonds: { 'kai+lyra': 25 } });
  b.heroes.forEach(h => { h.crit = 0; }); b.energy = 5;
  await b.play(handCard(b, 'K01'), b.monsters[0]);
  hp0 = b.monsters[0].hp;
  await b.play(handCard(b, 'L01'), b.monsters[0]);
  check(hp0 - b.monsters[0].hp === 6 + 6, '친밀도 2단계: 검기 마법 6 (실제 ' + (hp0 - b.monsters[0].hp - 6) + ')');
  // 합동기: 두 사람 모두 편성·생존해야 쓸 수 있다
  b = await newBattle(['kai'], ['treant'], ['C01']);
  b.energy = 3;
  check(!b.canPlay(handCard(b, 'D02')).ok, '합동기: 짝이 편성되지 않으면 못 씀');
  b = await newBattle(['kai', 'lyra'], ['treant', 'slime'], ['C01']);
  b.energy = 3;
  const duoC = handCard(b, 'D02');
  check(b.canPlay(duoC).ok, '합동기: 두 사람이 있으면 씀');
  b.heroes[1].hp = 0; b.heroes[1].dead = true;
  check(!b.canPlay(duoC).ok, '합동기: 한 사람이 쓰러지면 못 씀');
  // 특성
  b = await newBattle(['kai'], ['treant'], ['C01'], { party: [{ id: 'kai', traits: [{ maxHp: 10 }, { firstOwnAttackDiscount: 1 }, { startStatus: { strength: 1 } }] }] });
  check(b.heroes[0].maxHp === 80 && b.heroes[0].hp === 80, '특성: 최대 체력 +10');
  check(b.heroes[0].status.strength === 1, '특성: 시작 힘 1');
  const k1 = handCard(b, 'K01');
  check(b.costOf(k1) === 0, '특성: 매 턴 첫 공격 카드 비용 -1');
  b.energy = 3; await b.play(k1, b.monsters[0]);
  check(b.costOf(handCard(b, 'K01')) === 1, '두 번째 공격 카드는 그대로');
  b = await newBattle(['bram'], ['treant'], ['C01'], { party: [{ id: 'bram', traits: [{ undyingOnce: true }, { startBlock: 8 }] }] });
  check(b.heroes[0].block === 8, '특성: 시작 보호막 8');
  await b.loseHp(b.heroes[0], 999);
  check(!b.heroes[0].dead && b.heroes[0].hp === 1, '특성: 불굴(체력 1로 버팀)');
  b = await newBattle(['lyra'], ['treant'], ['C01'], { party: [{ id: 'lyra', traits: [{ statusAdd: { burn: 1 } }] }] });
  b.energy = 3; await b.play(handCard(b, 'L01'), b.monsters[0]);
  check(b.monsters[0].status.burn === 3, '특성: 리라가 거는 화상 +1');

  // ---------------------------------------------------------------- 10단계: 적 강화 보정(난이도·승천)
  check(G.Data.ascension.length === 10 && G.Data.ascension.every((x, i) => x.n === i + 1 && x.desc), '승천 10단계');
  b = await newBattle(['kai'], ['slime', 'treant'], ['C01'], { enemy: { hpMult: 0.5, bossHpMult: 0.5 } });
  check(b.monsters[0].maxHp === 27 && b.monsters[1].maxHp === Math.round(G.Data.monsterById.treant.hp * 2), '적 체력 보정(일반 ×1.5, 보스 ×2)');
  b = await newBattle(['kai'], ['slime'], ['C01'], { enemy: { dmgMult: 0.5 } });
  b.monsters[0].intent = 'slam'; b.monsters[0].intentTarget = b.heroes[0];
  check(b.intentInfo(b.monsters[0]).dmg === Math.floor(5 * 1.5), '적 공격 보정이 행동 예고에도 반영 (' + b.intentInfo(b.monsters[0]).dmg + ')');
  hp0 = b.heroes[0].hp;
  await b.endTurn();
  check(hp0 - b.heroes[0].hp === 7, '적 공격 피해 ×1.5 = 7 (실제 ' + (hp0 - b.heroes[0].hp) + ')');
  b = await newBattle(['kai'], ['astaroth'], ['C01'], { enemy: { doomMult: 2 } });
  b.monsters[0].intent = 'doom'; b.monsters[0].intentTarget = b.heroes[0];
  check(b.intentInfo(b.monsters[0]).dmg === 60, '종말 피해 2배 = 60');
  b = await newBattle(['kai'], ['baltar'], ['C01'], { enemy: { triggerStr: 2 } });
  await b.loseHp(b.monsters[0], Math.ceil(b.monsters[0].maxHp * 0.6));
  check(b.monsters[0].status.strength === 2, '광폭화: 체력 조건 발동 때 힘 +2');

  b = await newBattle(['kai'], ['slime', 'slime'], ['C01'], { affixes: ['giant', 'angry'] });
  check(b.monsters[0].maxHp === 27 && b.monsters[0].name === '거대한 ' + G.Data.monsterById.slime.name, '거대한: 체력 1.5배·이름');
  check(b.monsters[1].status.strength === 2, '분노한: 힘 2');

  // ---------------------------------------------------------------- 무작위 전투
  const N = +(process.argv[2] || 6000); // 16단계: 카드가 200장이 되어 모든 강화 카드가 한 번 이상 나오도록 3000 → 6000
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
    const deck = G.rng.shuffle(pool.map(c => c.id)).slice(0, 20).map(id => G.rng.chance(0.5) ? id + G.rng.pick(['+', '+', '+2', '+3']) : id);
    const theme = G.rng.pick(['forest', 'desert', 'snow', 'volcano', 'castle', 'mirror']);
    const themed = monsters.filter(m => m.theme === theme);
    const roll = G.rng.next();
    let enc;
    if (theme === 'mirror') enc = [G.rng.pick(themed).id].concat(roll < 0.5 ? ['skeleton'] : []);
    else if (roll < 0.15) enc = [G.rng.pick(themed.filter(m => m.rank !== 'normal')).id];
    else enc = G.rng.shuffle(themed.filter(m => m.rank === 'normal').map(m => m.id)).slice(0, G.rng.int(1, 3));
    enc.forEach(id => seenMonsters.add(id));
    const relics = G.rng.shuffle(G.Data.relics.map(r => r.id)).slice(0, G.rng.int(0, 6));
    const affixes = enc.map(() => G.rng.chance(0.3) ? G.rng.pick(Object.keys(G.Data.affixes)) : null);
    try {
      // 특성(무작위로 고른 레벨), 친밀도, 합동기도 섞는다
      const pty = party.map(id => ({ id, traits: G.Data.traits[id].slice(0, G.rng.int(0, 5)).map(lv => G.rng.pick(lv).mods) }));
      const bonds = {}; for (let i = 0; i < party.length; i++) for (let j = i + 1; j < party.length; j++) bonds[[party[i], party[j]].sort((x, y) => heroes.indexOf(x) - heroes.indexOf(y)).join('+')] = G.rng.int(0, 60);
      const duos = Object.keys(bonds).filter(k => G.Data.duoByPair[k]).map(k => G.Data.duoByPair[k].id);
      const b = G.Battle.create({ party: pty, monsters: enc, deck: deck.concat(duos), gold: 30, relics, affixes, stage: G.rng.int(1, 10), bonds });
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
        played.add(G.Upgrade.baseOf(c.id));
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
    const neverUp = cards.filter(c => c.target !== 'downedAlly' && !played.has(c.id + '+')).map(c => c.id + '+');  // 부활 카드는 쓰러진 동료가 있어야 쓰여 우연에 맡긴다
    const neverUp3 = cards.filter(c => !played.has(c.id + '+3')).map(c => c.id + '+3');
    check(neverUp3.length <= cards.length * 0.1, '3단계 강화 카드 대부분이 한 번 이상 사용됨 (미사용 ' + neverUp3.length + '장)');
    const neverDuo = G.Data.duoCards.filter(c => !played.has(c.id)).map(c => c.id);
    check(!neverDuo.length, '모든 합동기가 한 번 이상 사용됨 (미사용: ' + neverDuo.join(', ') + ')');
    check(!neverUp.length, '모든 강화 카드가 한 번 이상 사용됨 (미사용: ' + neverUp.join(', ') + ')');
    check(seenMonsters.size === 68, '모든 몬스터 등장 (' + seenMonsters.size + '/68)');
  } else console.log('  (사용 범위 검사 생략: 1000회 미만)');

  console.log(failures ? '\n실패 ' + failures + '건' : '\n모든 테스트 통과');
  process.exit(failures ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
