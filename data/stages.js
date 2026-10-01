// stages.js — 스테이지 10개, 노드 구성, 등장 몬스터 조합, 보상·상점 수치
// 노드: battle(일반) · elite(정예) · boss(보스) · midboss(중간 보스) · final(최종 보스) · rest(휴식/상점 중 선택)
// 일반 전투는 첫 전투에 easy, 그 뒤에 hard 조합에서 하나를 고른다.
Game.Data.stages = [
  { n: 1, theme: 'forest', nodes: ['battle', 'battle', 'rest', 'elite'], boss: 'giant_spider',
    easy: [['slime', 'slime'], ['mushroom', 'slime'], ['forest_wolf']],
    hard: [['goblin', 'slime'], ['forest_wolf', 'mushroom'], ['vine', 'slime']] },
  { n: 2, theme: 'forest', nodes: ['battle', 'battle', 'rest', 'boss'], boss: 'treant', join: 'bram',
    easy: [['goblin', 'mushroom'], ['forest_wolf', 'slime'], ['vine', 'mushroom']],
    hard: [['forest_wolf', 'goblin'], ['vine', 'goblin', 'slime'], ['forest_wolf', 'forest_wolf']] },
  { n: 3, theme: 'desert', nodes: ['battle', 'battle', 'battle', 'rest', 'elite'], boss: 'sandworm',
    easy: [['scorpion', 'cactus'], ['bandit', 'scorpion'], ['mummy']],
    hard: [['bandit', 'mummy'], ['sand_spirit', 'scorpion'], ['cactus', 'sand_spirit', 'scorpion']] },
  { n: 4, theme: 'desert', nodes: ['battle', 'battle', 'rest', 'boss'], boss: 'pharaoh', join: 'lyra',
    easy: [['bandit', 'cactus'], ['mummy', 'scorpion'], ['sand_spirit', 'bandit']],
    hard: [['mummy', 'mummy'], ['bandit', 'sand_spirit', 'cactus'], ['scorpion', 'mummy', 'bandit']] },
  { n: 5, theme: 'snow', nodes: ['battle', 'battle', 'battle', 'rest', 'elite'], boss: 'glacier_golem',
    easy: [['snow_rabbit', 'frost_spirit'], ['frost_wolf', 'snow_rabbit'], ['yeti']],
    hard: [['frost_wolf', 'frost_spirit'], ['yeti', 'snow_rabbit'], ['ice_witch', 'snow_rabbit', 'frost_spirit']] },
  { n: 6, theme: 'snow', nodes: ['battle', 'battle', 'rest', 'boss'], boss: 'frost_queen', join: 'sera',
    easy: [['ice_witch', 'frost_wolf'], ['yeti', 'frost_spirit'], ['snow_rabbit', 'snow_rabbit', 'frost_wolf']],
    hard: [['yeti', 'ice_witch'], ['frost_wolf', 'frost_wolf', 'frost_spirit'], ['ice_witch', 'yeti', 'snow_rabbit']] },
  { n: 7, theme: 'volcano', nodes: ['battle', 'battle', 'battle', 'rest', 'elite'], boss: 'phoenix',
    easy: [['fire_imp', 'fire_bat'], ['lava_slime', 'fire_imp'], ['magma_golem']],
    hard: [['fire_shaman', 'lava_slime'], ['magma_golem', 'fire_imp'], ['fire_bat', 'fire_bat', 'fire_shaman']] },
  { n: 8, theme: 'volcano', nodes: ['battle', 'battle', 'rest', 'boss'], boss: 'ignis', join: 'nox',
    easy: [['fire_shaman', 'fire_imp'], ['lava_slime', 'lava_slime'], ['magma_golem', 'fire_bat']],
    hard: [['magma_golem', 'fire_shaman'], ['lava_slime', 'fire_bat', 'fire_imp'], ['fire_shaman', 'lava_slime', 'fire_imp']] },
  { n: 9, theme: 'castle', nodes: ['battle', 'battle', 'battle', 'rest', 'elite'], boss: 'death_knight',
    easy: [['skeleton', 'dark_mage'], ['gargoyle', 'skeleton'], ['vampire']],
    hard: [['cursed_armor', 'dark_mage'], ['vampire', 'gargoyle'], ['skeleton', 'skeleton', 'dark_mage']] },
  { n: 10, theme: 'castle', nodes: ['battle', 'midboss', 'rest', 'final'], boss: 'astaroth', midboss: 'baltar',
    easy: [['skeleton', 'dark_mage'], ['gargoyle', 'skeleton'], ['vampire', 'skeleton']],
    hard: [['skeleton', 'dark_mage'], ['gargoyle', 'skeleton'], ['vampire', 'skeleton']] }
];

Game.Data.THEME_NAME = { forest: '속삭이는 숲', desert: '타오르는 사막', snow: '얼어붙은 설원', volcano: '용암 화산', castle: '마왕성' };
Game.Data.NODE_NAME = { battle: '전투', elite: '정예', boss: '보스', midboss: '중간 보스', final: '최종 보스', rest: '휴식/상점' };

Game.Data.economy = {
  // 일반 전투 카드 등급 확률(%) — 스테이지 1–2, 3–4, 5–6, 7–8, 9–10
  rarity: [
    [60, 30, 9, 1, 0],
    [45, 35, 16, 3.5, 0.5],
    [32, 36, 23, 7.5, 1.5],
    [20, 34, 30, 13, 3],
    [10, 30, 35, 20, 5]
  ],
  // 보스 보상(희귀/영웅/전설): 스테이지 2 → 10 사이는 선형 보간
  bossFrom: [85, 13, 2],
  bossTo: [40, 40, 20],
  gold: { battle: [15, 25], elite: [35, 45], boss: [60, 100] },
  skipGold: 10,
  fillGold: 20,           // 후보 카드가 3장이 안 될 때 빈자리 대신 주는 골드
  price: { common: 30, uncommon: 55, rare: 90, epic: 150, legendary: 250 },
  healCost: 40, healPct: 0.25,
  refreshCost: 20,
  restPct: 0.35,
  downedPct: 0.25,        // 쓰러진 캐릭터는 전투 승리 후 이 비율로 복귀
  shopSize: 5,
  deckMin: 6, deckMax: 10
};
