// modes.js — 게임 모드 3종(15단계). 새 게임을 시작할 때 고르고, 그 저장 칸에서는 바꿀 수 없다
// enemyHp · enemyDmg: 적 체력·적이 주는 피해 배율(스테이지 난이도·승천 보정 위에 곱한다)
// permadeath: 전투가 끝날 때 쓰러져 있던 동료는 죽어서 다시 편성할 수 없다. 살아 있는 동료가 없으면 저장 칸을 지운다
Game.Data.modes = {
  normal: { name: '노말', en: 'NORMAL', color: '#5ee6ff', enemyHp: 1, enemyDmg: 1,
    desc: '기본 난이도. 쓰러진 동료는 전투가 끝나면 일어나고, 지면 스테이지를 처음부터 다시 한다.' },
  hard: { name: '하드', en: 'HARD', color: '#ff9a4a', enemyHp: 1.5, enemyDmg: 1.25,
    desc: '적의 체력 1.5배, 공격 피해 1.25배. 규칙은 노말과 같다.' },
  hardcore: { name: '하드코어', en: 'HARDCORE', color: '#ff4f62', enemyHp: 1, enemyDmg: 1, permadeath: true,
    desc: '수치는 노말과 같지만, 전투가 끝날 때 쓰러져 있던 동료는 영영 돌아오지 않는다. 동료가 모두 죽으면 이 저장 칸이 지워진다.' }
};
Game.Data.MODE_ORDER = ['normal', 'hard', 'hardcore'];
