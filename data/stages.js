// stages.js — 스테이지 10개, 갈림길 맵 구성, 등장 몬스터 조합, 보상·상점 수치
// 노드: battle(일반) · elite(정예) · event(이벤트) · rest(휴식) · shop(상점) · boss(보스) · midboss(중간 보스) · final(최종 보스)
// 맵은 열(column)의 목록이고, 열마다 노드 1~2개 중 하나를 골라 지나간다 (GAME_DESIGN.md 3장).
// 일반 전투는 첫 전투에 easy, 그 뒤에 hard 조합에서 하나를 고른다.
// 마지막 열이 아닌 정예: midElite 가 있으면 그 몬스터, 없으면 hard 조합에 변이를 모두 붙인 '정예 무리'.
(function () {
  var ODD = [['battle'], ['battle', 'event'], ['battle', 'elite'], ['rest', 'shop'], ['elite']];
  var EVEN = [['battle'], ['event', 'elite'], ['rest', 'shop'], ['boss']];
  var FINAL = [['battle'], ['event', 'elite'], ['midboss'], ['rest', 'shop'], ['final']];
  Game.Data.mapLayouts = { odd: ODD, even: EVEN, final: FINAL };
Game.Data.stages = [
  { n: 1, theme: 'forest', cols: ODD, boss: 'giant_spider',
    easy: [['slime', 'slime'], ['mushroom', 'slime'], ['forest_wolf']],
    hard: [['goblin', 'slime'], ['forest_wolf', 'mushroom'], ['vine', 'slime']] },
  { n: 2, midElite: 'giant_spider', theme: 'forest', cols: EVEN, boss: 'treant', join: 'bram',
    easy: [['goblin', 'mushroom'], ['forest_wolf', 'slime'], ['vine', 'mushroom']],
    hard: [['forest_wolf', 'goblin'], ['vine', 'goblin', 'slime'], ['forest_wolf', 'forest_wolf']] },
  { n: 3, theme: 'desert', cols: ODD, boss: 'sandworm',
    easy: [['scorpion', 'cactus'], ['bandit', 'scorpion'], ['mummy']],
    hard: [['bandit', 'mummy'], ['sand_spirit', 'scorpion'], ['cactus', 'sand_spirit', 'scorpion']] },
  { n: 4, midElite: 'sandworm', theme: 'desert', cols: EVEN, boss: 'pharaoh', join: 'lyra',
    easy: [['bandit', 'cactus'], ['mummy', 'scorpion'], ['sand_spirit', 'bandit']],
    hard: [['mummy', 'mummy'], ['bandit', 'sand_spirit', 'cactus'], ['scorpion', 'mummy', 'bandit']] },
  { n: 5, theme: 'snow', cols: ODD, boss: 'glacier_golem',
    easy: [['snow_rabbit', 'frost_spirit'], ['frost_wolf', 'snow_rabbit'], ['yeti']],
    hard: [['frost_wolf', 'frost_spirit'], ['yeti', 'snow_rabbit'], ['ice_witch', 'snow_rabbit', 'frost_spirit']] },
  { n: 6, midElite: 'glacier_golem', theme: 'snow', cols: EVEN, boss: 'frost_queen', join: 'sera',
    easy: [['ice_witch', 'frost_wolf'], ['yeti', 'frost_spirit'], ['snow_rabbit', 'snow_rabbit', 'frost_wolf']],
    hard: [['yeti', 'ice_witch'], ['frost_wolf', 'frost_wolf', 'frost_spirit'], ['ice_witch', 'yeti', 'snow_rabbit']] },
  { n: 7, theme: 'volcano', cols: ODD, boss: 'phoenix',
    easy: [['fire_imp', 'fire_bat'], ['lava_slime', 'fire_imp'], ['magma_golem']],
    hard: [['fire_shaman', 'lava_slime'], ['magma_golem', 'fire_imp'], ['fire_bat', 'fire_bat', 'fire_shaman']] },
  { n: 8, midElite: 'phoenix', theme: 'volcano', cols: EVEN, boss: 'ignis', join: 'nox',
    easy: [['fire_shaman', 'fire_imp'], ['lava_slime', 'lava_slime'], ['magma_golem', 'fire_bat']],
    hard: [['magma_golem', 'fire_shaman'], ['lava_slime', 'fire_bat', 'fire_imp'], ['fire_shaman', 'lava_slime', 'fire_imp']] },
  { n: 9, theme: 'castle', cols: ODD, boss: 'death_knight',
    easy: [['skeleton', 'dark_mage'], ['gargoyle', 'skeleton'], ['vampire']],
    hard: [['cursed_armor', 'dark_mage'], ['vampire', 'gargoyle'], ['skeleton', 'skeleton', 'dark_mage']] },
  { n: 10, midElite: 'death_knight', theme: 'castle', cols: FINAL, boss: 'astaroth', midboss: 'baltar',
    easy: [['skeleton', 'dark_mage'], ['gargoyle', 'skeleton'], ['vampire', 'skeleton']],
    hard: [['skeleton', 'dark_mage'], ['gargoyle', 'skeleton'], ['vampire', 'skeleton']] }
];
})();

// 월드맵 위 스테이지 위치(1000×560 지도 좌표)와 지역 이름표 위치
Game.Data.mapPos = [[96, 418], [196, 318], [300, 430], [396, 330], [486, 232], [574, 142], [662, 268], [748, 172], [846, 318], [924, 196]];
Game.Data.regions = [
  { theme: 'forest', label: [140, 520], box: [0, 200, 250, 560] },
  { theme: 'desert', label: [350, 520], box: [240, 250, 450, 560] },
  { theme: 'snow', label: [470, 56], box: [420, 30, 630, 300] },
  { theme: 'volcano', label: [700, 56], box: [610, 60, 800, 360] },
  { theme: 'castle', label: [910, 56], box: [790, 60, 1000, 420] }
];
Game.Data.STAGE_NAME = ['숲 입구', '고목의 심장', '모래 바다', '파라오의 무덤', '눈보라 고개', '서리 궁전', '불타는 협곡', '화룡의 둥지', '마왕성 외곽', '마왕의 옥좌'];
Game.Data.THEME_COLOR = { forest: '#4fae4a', desert: '#e0a84a', snow: '#9fd6f2', volcano: '#e0584a', castle: '#a274dc' };

Game.Data.THEME_NAME = { forest: '속삭이는 숲', desert: '타오르는 사막', snow: '얼어붙은 설원', volcano: '용암 화산', castle: '마왕성', mirror: '거울의 방' };
Game.Data.NODE_NAME = { battle: '전투', elite: '정예', event: '이벤트', rest: '휴식', shop: '상점', boss: '보스', midboss: '중간 보스', final: '최종 보스' };

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
  mirrorGold: 30,         // 거울 속 그림자를 쓰러뜨리면 추가 골드
  downedPct: 0.25,        // 쓰러진 캐릭터는 전투 승리 후 이 비율로 복귀
  shopSize: 5,
  deckMin: 6, deckMax: 20,
  autoBuildSize: 15      // 자동 구성은 등급 순으로 이만큼
};
