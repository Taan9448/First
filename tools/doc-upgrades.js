// tools/doc-upgrades.js — GAME_DESIGN.md 8장 카드 표의 행 전체(32단계부터, 예전에는 '강화' 열만)를 데이터에서 다시 쓴다 (개발 전용)
// 실행: node tools/doc-upgrades.js   (강화 규칙·예외 표를 바꾼 뒤 실행하고, test-battle.js 가 일치를 검사한다)
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
global.window = global;
['js/core.js', 'data/keywords.js', 'data/characters.js', 'data/cards.js', 'data/upgrades.js', 'js/upgrade.js'].forEach(f => {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
});
const G = global.Game;
const file = path.join(ROOT, 'GAME_DESIGN.md');
// 32단계: 카드 표의 행 전체(이름 · 등급 · 유형 · 비용 · 대상 · 분류 · 효과 · 강화)를 데이터에서 다시 쓴다
const RAR = { common: '일반', uncommon: '고급', rare: '희귀', epic: '영웅', legendary: '전설' };
const TY = { attack: '공격', block: '방어', skill: '보조', heal: '회복', power: '지속' };
const TG = { enemy: '적1', allEnemies: '적전체', randomEnemy: '무작위', ally: '아군1', allAllies: '아군전체', self: '자신', downedAlly: '쓰러진 아군', none: '—' };
function dmgs(list, out) {
  (list || []).forEach(e => {
    if (e.op === 'damage') out.push(Array.isArray(e.value) ? e.value[0] + '~' + e.value[1] : typeof e.value === 'number' ? e.value : (e.value.base || 0));
    if (e.op === 'power') return;
    if (e.then) dmgs(e.then, out); if (e.else) dmgs(e.else, out);
  });
  return out;
}
function effectText(c) { const d = dmgs(c.effects, []); return c.text.replace(/\{d(\d)\}/g, (m, i) => d[+i]); }
let n = 0;
const out = fs.readFileSync(file, 'utf8').split('\n').map(line => {
  if (line === '| ID | 이름 | 등급 | 유형 | 비용 | 대상 | 분류 | 효과 |') return line + ' 강화 |';
  if (line === '|---|---|---|---|---|---|---|---|') return line + '---|';
  const m = line.match(/^\| ([KBLSNAC]\d\d)★? \|/);
  if (!m) return line;
  const c = G.Data.cardById[m[1]];
  if (!c) return line;
  n++;
  return '| ' + c.id + (c.basic ? '★' : '') + ' | ' + c.name + ' | ' + RAR[c.rarity] + ' | ' + TY[c.type] + ' | ' + c.cost + ' | ' + TG[c.target] + ' | ' + c.tags + ' | ' + effectText(c) + ' | ' + G.Upgrade.summary(c.id) + ' |';
});
fs.writeFileSync(file, out.join('\n'));
console.log('카드 표 ' + n + '행을 데이터에서 다시 썼다(강화 열 포함)');
