// modes.js — 게임 모드 3종(15단계). 새 게임을 시작할 때 고르고, 그 저장 칸에서는 바꿀 수 없다
// enemyHp · enemyDmg: 적 체력·적이 주는 피해 배율(스테이지 난이도·승천 보정 위에 곱한다)
// rules: 23단계 — 승천 규칙과 같은 보정(affixMult · restPct · shopPriceMult · eliteStr · triggerStr …) / defeatGold: 지면 잃는 골드 비율
// undo: 24단계 — 전투에서 그 턴에 한 일을 되돌릴 수 있다(노말만)
// permadeath: 전투가 끝날 때 쓰러져 있던 동료는 죽어서 다시 편성할 수 없다. 살아 있는 동료가 없으면 저장 칸을 지운다
Game.Data.modes = {
  normal: { name: '노말', en: 'NORMAL', color: '#5ee6ff', enemyHp: 1, enemyDmg: 1, undo: true,
    desc: '기본 난이도. 쓰러진 동료는 전투가 끝나면 일어나고, 지면 스테이지를 처음부터 다시 한다. 전투에서 그 턴을 되돌릴 수 있다.' },
  // 23단계: 하드는 배율을 줄이고 규칙을 바꾼다(rules 는 승천 규칙과 같은 형식, St.ascMods 가 함께 더한다)
  hard: { name: '하드', en: 'HARD', color: '#ff9a4a', enemyHp: 1.2, enemyDmg: 1.1, defeatGold: 0.25,
    rules: { affixMult: 1.6, restPct: 0.25, shopPriceMult: 1.2, eliteStr: 1, triggerStr: 1 },
    desc: '적 체력 1.2배·공격 1.1배. 변이 몬스터가 더 자주 나오고, 정예·보스는 힘 1을 갖고 시작하며 체력이 줄 때 힘을 더 얻는다. 휴식 회복 25%, 상점 가격 +20%, 지면 골드 25%를 잃는다.' },
  hardcore: { name: '하드코어', en: 'HARDCORE', color: '#ff4f62', enemyHp: 1, enemyDmg: 1, permadeath: true,
    desc: '수치는 노말과 같지만, 전투가 끝날 때 쓰러져 있던 동료는 영영 돌아오지 않는다. 동료가 모두 죽으면 이 저장 칸이 지워진다.' }
};
Game.Data.MODE_ORDER = ['normal', 'hard', 'hardcore'];
