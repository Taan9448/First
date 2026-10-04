// tools/sim-bench.js — 같은 전투 묶음을 AI마다 다시 싸워 비교한다(개발 전용, 35단계)
// 준비: SIM_DUMP=/tmp/b.json node tools/sim.js 6 1   → 실행: node tools/sim-bench.js /tmp/b.json [look,greedy] [최대 전투 수]
'use strict';
const fs = require('fs');
const sim = require('./sim.js');
const G = global.Game;
const all = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
// BOSS=1 이면 정예·보스만, HARD=0.3 이면 적 체력·피해 배율을 그만큼 더 올려 차이를 키운다
const list = process.env.BOSS ? all.filter(o => o.boss) : all, HARD = +(process.env.HARD || 0);
list.forEach(o => { o.enemy = Object.assign({}, o.enemy); o.enemy.hpMult = (o.enemy.hpMult || 0) + HARD; o.enemy.dmgMult = (o.enemy.dmgMult || 0) + HARD; });
const ais = (process.argv[3] || 'look,greedy').split(','), max = +(process.argv[4] || list.length);
(async () => {
  for (const ai of ais) {
    sim.setAI(ai);
    let win = 0, hpLost = 0, turns = 0, n = 0;
    const t0 = Date.now();
    for (let i = 0; i < Math.min(max, list.length); i++) {
      G.rng.seed(7000 + i);
      const opts = list[i], b = G.Battle.create(JSON.parse(JSON.stringify(opts)));
      const hp0 = opts.party.reduce((a, p) => a + p.hp, 0);
      const r = await sim.fight(b);
      n++; if (r === 'win') win++;
      hpLost += hp0 - b.heroes.reduce((a, h) => a + Math.max(0, h.hp), 0);
      turns += b.turn;
    }
    console.log(ai.padEnd(7) + ' 승률 ' + (win / n * 100).toFixed(1) + '% · 잃은 체력 평균 ' + (hpLost / n).toFixed(1) + ' · 평균 턴 ' + (turns / n).toFixed(2) + ' · ' + ((Date.now() - t0) / 1000).toFixed(1) + '초 (' + n + '전)');
  }
})();
