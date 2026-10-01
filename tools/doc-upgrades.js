// tools/doc-upgrades.js — GAME_DESIGN.md 8장 카드 표의 '강화' 열을 데이터에서 다시 쓴다 (개발 전용)
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
let n = 0;
const out = fs.readFileSync(file, 'utf8').split('\n').map(line => {
  if (line === '| ID | 이름 | 등급 | 유형 | 비용 | 대상 | 분류 | 효과 |') return line + ' 강화 |';
  if (line === '|---|---|---|---|---|---|---|---|') return line + '---|';
  const m = line.match(/^\| ([KBLSNC]\d\d)★? \|(?:[^|]*\|){7}/);
  if (!m) return line;
  n++;
  return m[0] + ' ' + G.Upgrade.summary(m[1]) + ' |';
});
fs.writeFileSync(file, out.join('\n'));
console.log('강화 열 ' + n + '행을 다시 썼다');
