// stages.js — 스테이지 13개(1~10 본편 + 31단계 세계의 틈 11~13, 10 스테이지 엔딩 뒤에 열린다), 던전 지도 규칙(14단계), 등장 몬스터 조합, 보상·상점 수치
// 노드: battle(일반) · elite(정예) · event(이벤트) · treasure(보물) · rest(휴식) · shop(상점) · boss(보스) · midboss(중간 보스) · final(최종 보스)
// 던전 지도(GAME_DESIGN.md 3장): 입구(1칸) → 경로 모듈을 무작위로 이어 붙인 중간 구역(4~5열) → 야영지(휴식/상점) → 마지막 방(정예/보스)
//   열마다 방이 1~4개, 방마다 다음 열의 이웃 방 1~3개로 통로가 이어진다. 방의 내용은 정찰하거나 들어가기 전까지 보이지 않는다.
// 일반 전투는 앞쪽 2열까지 easy, 그 뒤에는 hard 조합에서 하나를 고른다(34단계: 스테이지마다 easy · hard 6개씩).
// 34단계: altBosses = 마지막 방 후보. 처음 돌파하기 전(이야기)에는 boss 가 나오고, 돌파한 스테이지를 다시 하거나 승천·오늘의 원정에서는 [boss + altBosses] 중 무작위.
//   elites = 정예 방 후보(2종, 짝수 스테이지는 midElite 를 더해 3종)
// 마지막 방이 아닌 정예: midElite 가 있으면 그 몬스터, 없으면 hard 조합에 변이를 모두 붙인 '정예 무리'.
(function () {
  // 경로 모듈: 이어 붙일 열 목록. w = 그 열의 방 수 범위, pool = 방 종류 가중치
  Game.Data.pathModules = [
    { id: 'skirmish', name: '교전 지대', weight: 3, cols: [{ w: [2, 3], pool: { battle: 4, event: 1 } }] },
    { id: 'crossroads', name: '네 갈래 길', weight: 2, cols: [{ w: [3, 4], pool: { battle: 2, event: 2, treasure: 1, elite: 1 } }] },
    { id: 'camp', name: '야영 공터', weight: 1, max: 1, cols: [{ w: [2, 3], pool: { rest: 2, shop: 1, event: 1 } }] },
    { id: 'danger', name: '위험 구역', weight: 2, cols: [{ w: [2, 3], pool: { battle: 2, elite: 2 } }, { w: [2, 3], pool: { treasure: 2, event: 1, rest: 1 } }] },
    { id: 'mystery', name: '수수께끼 통로', weight: 2, cols: [{ w: [2, 3], pool: { event: 3, treasure: 1, battle: 1 } }] },
    { id: 'gauntlet', name: '매복 회랑', weight: 2, cols: [{ w: [2, 3], pool: { battle: 3 } }, { w: [2, 4], pool: { battle: 2, event: 1, treasure: 1 } }] },
    { id: 'vault', name: '잊힌 보물고', weight: 1, cols: [{ w: [2, 3], pool: { treasure: 2, elite: 1, battle: 1 } }] }
  ];
  Game.Data.mapRules = {
    middleCols: [4, 5],              // 입구와 야영지 사이 열 수(최종 스테이지는 중간 보스 앞뒤로 나눈다). 15단계에서 10~11 → 4~5
    finalSplit: [3, 1],              // 10 스테이지: 중간 보스 앞 열 수, 뒤 열 수
    campBeforeBoss: { w: [2, 3], pool: { rest: 2, shop: 2 } },
    limits: { elite: 1, rest: 1, shop: 1, treasure: 2 },   // 중간 구역에서 종류별 최대 개수(넘치면 전투로)
    easyCols: 2,                     // 이 열까지의 일반 전투는 easy 조합
    link: { side: 0.5 },             // 방마다 바로 옆 레인 방으로 통로가 더 날 확률
    scout: 0.3, scoutBonus: 0.2,     // 방에 들어가면 이어진 다음 방마다 정찰 확률(파티에 소연이 있으면 더한다)
    treasure: { gold: [35, 60], relic: 0.15, ambush: 0.3, ambushGold: 30 }   // 39단계: 금화 약 1.4배
  };
Game.Data.stages = [
  { n: 1, theme: 'forest', last: 'elite', boss: 'giant_spider',
    easy: [['slime', 'slime'], ['mushroom', 'slime'], ['forest_wolf'], ['centipede', 'slime'], ['spore', 'spore', 'slime'], ['assassin', 'mushroom']],
    hard: [['goblin', 'slime'], ['forest_wolf', 'mushroom'], ['vine', 'slime'], ['assassin', 'centipede'], ['mushroom', 'goblin', 'vine'], ['goblin', 'assassin', 'slime']], elites: ['python', 'poison_witch'], altBosses: ['python', 'poison_witch'] },
  { n: 2, midElite: 'giant_spider', theme: 'forest', last: 'boss', boss: 'treant', join: 'bram',
    easy: [['goblin', 'mushroom'], ['forest_wolf', 'slime'], ['vine', 'mushroom'], ['assassin', 'slime'], ['mushroom', 'centipede'], ['goblin', 'spore', 'spore']],
    hard: [['forest_wolf', 'goblin'], ['vine', 'goblin', 'slime'], ['forest_wolf', 'forest_wolf'], ['centipede', 'assassin', 'mushroom'], ['mushroom', 'mushroom', 'goblin'], ['vine', 'assassin', 'centipede']], elites: ['python', 'poison_witch'], altBosses: ['toad_king'] },
  { n: 3, theme: 'desert', last: 'elite', boss: 'sandworm',
    easy: [['scorpion', 'cactus'], ['bandit', 'scorpion'], ['mummy'], ['scarab', 'scarab'], ['mummy', 'scarab'], ['cactus', 'bandit']],
    hard: [['bandit', 'mummy'], ['sand_spirit', 'scorpion'], ['cactus', 'sand_spirit', 'scorpion'], ['sand_archer', 'bandit'], ['mummy', 'sand_archer', 'scarab'], ['sand_spirit', 'bandit', 'scorpion']], elites: ['sphinx', 'anubis_guard'], altBosses: ['sphinx', 'anubis_guard'] },
  { n: 4, midElite: 'sandworm', theme: 'desert', last: 'boss', boss: 'pharaoh', join: 'lyra',
    easy: [['bandit', 'cactus'], ['mummy', 'scorpion'], ['sand_spirit', 'bandit'], ['sand_archer', 'scarab'], ['mummy', 'sand_spirit'], ['scarab', 'scarab', 'bandit']],
    hard: [['mummy', 'mummy'], ['bandit', 'sand_spirit', 'cactus'], ['scorpion', 'mummy', 'bandit'], ['sand_archer', 'scarab', 'mummy'], ['mummy', 'mummy', 'sand_archer'], ['cactus', 'sand_spirit', 'sand_archer']], elites: ['sphinx', 'anubis_guard'], altBosses: ['scorpion_queen'] },
  { n: 5, theme: 'snow', last: 'elite', boss: 'glacier_golem', join: 'ciel',
    easy: [['snow_rabbit', 'frost_spirit'], ['frost_wolf', 'snow_rabbit'], ['yeti'], ['wisp', 'wisp'], ['snow_rabbit', 'ice_witch'], ['harpy', 'frost_spirit']],
    hard: [['frost_wolf', 'frost_spirit'], ['yeti', 'snow_rabbit'], ['ice_witch', 'snow_rabbit', 'frost_spirit'], ['harpy', 'wisp'], ['ice_witch', 'frost_wolf', 'wisp'], ['yeti', 'frost_spirit', 'snow_rabbit']], elites: ['frost_wyvern', 'ice_knight'], altBosses: ['frost_wyvern', 'ice_knight'] },
  { n: 6, midElite: 'glacier_golem', theme: 'snow', last: 'boss', boss: 'frost_queen', join: 'sera',
    easy: [['ice_witch', 'frost_wolf'], ['yeti', 'frost_spirit'], ['snow_rabbit', 'snow_rabbit', 'frost_wolf'], ['harpy', 'snow_rabbit'], ['ice_witch', 'wisp'], ['frost_spirit', 'frost_wolf']],
    hard: [['yeti', 'ice_witch'], ['frost_wolf', 'frost_wolf', 'frost_spirit'], ['ice_witch', 'yeti', 'snow_rabbit'], ['harpy', 'wisp', 'frost_wolf'], ['ice_witch', 'ice_witch', 'frost_spirit'], ['yeti', 'harpy', 'snow_rabbit']], elites: ['frost_wyvern', 'ice_knight'], altBosses: ['yeti_king'] },
  { n: 7, theme: 'volcano', last: 'elite', boss: 'phoenix',
    easy: [['fire_imp', 'fire_bat'], ['lava_slime', 'fire_imp'], ['magma_golem'], ['salamander', 'fire_imp'], ['lava_slime'], ['obsidian', 'fire_imp']],
    hard: [['fire_shaman', 'lava_slime'], ['magma_golem', 'fire_imp'], ['fire_bat', 'fire_bat', 'fire_shaman'], ['obsidian', 'salamander'], ['lava_slime', 'fire_shaman'], ['obsidian', 'fire_bat', 'salamander']], elites: ['djinn', 'flame_dancer'], altBosses: ['djinn', 'flame_dancer'] },
  { n: 8, midElite: 'phoenix', theme: 'volcano', last: 'boss', boss: 'ignis', join: 'nox',
    easy: [['fire_shaman', 'fire_imp'], ['lava_slime', 'lava_slime'], ['magma_golem', 'fire_bat'], ['obsidian', 'fire_bat'], ['lava_slime', 'fire_imp'], ['obsidian', 'salamander']],
    hard: [['magma_golem', 'fire_shaman'], ['lava_slime', 'fire_bat', 'fire_imp'], ['fire_shaman', 'lava_slime', 'fire_imp'], ['salamander', 'obsidian', 'fire_imp'], ['lava_slime', 'lava_slime', 'fire_shaman'], ['obsidian', 'magma_golem', 'fire_imp']], elites: ['djinn', 'flame_dancer'], altBosses: ['fire_giant'] },
  { n: 9, theme: 'castle', last: 'elite', boss: 'death_knight',
    easy: [['skeleton', 'dark_mage'], ['gargoyle', 'skeleton'], ['vampire'], ['blood_monk', 'skeleton'], ['paper_ghost', 'skeleton'], ['gargoyle', 'dark_mage']],
    hard: [['cursed_armor', 'dark_mage'], ['vampire', 'gargoyle'], ['skeleton', 'skeleton', 'dark_mage'], ['paper_ghost', 'blood_monk'], ['gargoyle', 'skeleton', 'dark_mage'], ['paper_ghost', 'vampire', 'skeleton']], elites: ['ghost_sword', 'jiangshi_master'], altBosses: ['ghost_sword', 'jiangshi_master'] },
  { n: 10, midElite: 'death_knight', theme: 'castle', last: 'final', layout: 'final', boss: 'astaroth', midboss: 'baltar',
    easy: [['skeleton', 'dark_mage'], ['gargoyle', 'skeleton'], ['vampire', 'skeleton'], ['paper_ghost', 'skeleton'], ['blood_monk', 'dark_mage'], ['gargoyle', 'paper_ghost']],
    hard: [['skeleton', 'dark_mage'], ['gargoyle', 'skeleton'], ['vampire', 'skeleton'], ['blood_monk', 'paper_ghost'], ['gargoyle', 'blood_monk', 'dark_mage'], ['cursed_armor', 'paper_ghost', 'skeleton']], elites: ['ghost_sword', 'jiangshi_master'] },
  // ---------------- 31단계: 세계의 틈(엔딩 뒤) ----------------
  { n: 11, theme: 'rift', last: 'elite', boss: 'rift_warden', rift: true,
    easy: [['rift_wisp', 'void_hound'], ['echo_swordsman', 'rift_wisp'], ['shard_golem'], ['echo_mage', 'rift_wisp'], ['blood_seed', 'echo_swordsman'], ['void_hound', 'shard_golem']],
    hard: [['void_hound', 'echo_mage'], ['shard_golem', 'rift_wisp'], ['echo_swordsman', 'echo_mage'], ['void_hound', 'void_hound', 'rift_wisp'], ['shard_golem', 'echo_mage', 'rift_wisp'], ['void_hound', 'echo_swordsman', 'blood_seed']], elites: ['void_weaver'], altBosses: ['void_weaver'] },
  { n: 12, midElite: 'rift_warden', theme: 'rift', last: 'boss', boss: 'echo_colossus', rift: true,
    easy: [['echo_swordsman', 'echo_mage'], ['shard_golem', 'rift_wisp'], ['void_hound', 'blood_seed'], ['blood_seed', 'rift_wisp', 'rift_wisp'], ['rift_wisp', 'void_hound', 'rift_wisp'], ['echo_mage', 'shard_golem']],
    hard: [['shard_golem', 'echo_mage'], ['echo_swordsman', 'void_hound', 'rift_wisp'], ['blood_seed', 'blood_seed', 'echo_mage'], ['void_hound', 'shard_golem'], ['shard_golem', 'void_hound', 'echo_mage'], ['blood_seed', 'echo_swordsman', 'rift_wisp']], elites: ['void_weaver'], altBosses: ['rift_hydra'] },
  { n: 13, midElite: 'rift_warden', theme: 'rift', last: 'final', layout: 'final', boss: 'blood_demon', midboss: 'danmok_shade', rift: true,
    easy: [['blood_seed', 'void_hound'], ['echo_swordsman', 'echo_mage'], ['shard_golem', 'blood_seed'], ['rift_wisp', 'rift_wisp', 'blood_seed'], ['void_hound', 'echo_mage'], ['shard_golem', 'rift_wisp', 'rift_wisp']],
    hard: [['blood_seed', 'shard_golem'], ['echo_swordsman', 'echo_mage'], ['void_hound', 'blood_seed', 'rift_wisp'], ['shard_golem', 'echo_mage'], ['shard_golem', 'blood_seed', 'echo_mage'], ['void_hound', 'void_hound', 'echo_swordsman']], elites: ['void_weaver'] }
];
// 31단계: 본편은 10 스테이지까지(엔딩·승천 기록). 그 뒤는 세계의 틈(두 번째 엔딩)
Game.Data.MAIN_STAGES = 10;
})();

// 월드맵 위 스테이지 위치(1000×560 지도 좌표)와 지역 이름표 위치
Game.Data.mapPos = [[96, 470], [232, 372], [530, 456], [636, 352], [780, 456], [900, 332], [880, 200], [600, 150], [236, 196], [132, 96], [366, 344], [416, 282], [370, 222]];
// 16단계 월드맵: 왼쪽 무림(만독곡·청운문), 가운데 세계의 틈, 오른쪽 엘단. riftAfter: 그 스테이지 다음 길은 세계의 틈을 건넌다
Game.Data.riftAfter = [2, 8, 10];
Game.Data.riftPos = [[386, 420], [390, 150], [250, 330]];   // 틈의 위치(지도 좌표). 31단계: 10 → 11은 청운봉에서 틈의 심연으로
Game.Data.regions = [
  { theme: 'forest', label: [150, 534], box: [0, 262, 320, 560] },
  { theme: 'desert', label: [580, 534], box: [440, 280, 720, 560] },
  { theme: 'snow', label: [860, 534], box: [700, 250, 1000, 560] },
  { theme: 'volcano', label: [720, 30], box: [446, 0, 1000, 290] },
  { theme: 'castle', label: [150, 248], box: [0, 0, 326, 262] },
  { theme: 'rift', label: [392, 384], box: [330, 176, 446, 360] }   // 31단계: 틈의 심연(11 스테이지부터)
];
// 세계 이름표(지도 위 큰 글씨)
Game.Data.worldLabels = [{ text: '무림 · 중원', pos: [150, 300], world: 'murim' }, { text: '세계의 틈', pos: [388, 286], world: 'rift' }, { text: '엘단 대륙', pos: [720, 290], world: 'eldan' }];
Game.Data.STAGE_NAME = ['만독곡 입구', '흑풍채', '모래 바다', '파라오의 무덤', '눈보라 고개', '서리 궁전', '불타는 협곡', '화룡의 둥지', '청운문 산문', '청운봉 혈마단', '틈의 관문', '부서진 두 세계', '혈마의 근원'];
Game.Data.THEME_COLOR = { forest: '#4fae4a', desert: '#e0a84a', snow: '#9fd6f2', volcano: '#e0584a', castle: '#a274dc', rift: '#5ef0d0' };

Game.Data.THEME_NAME = { forest: '만독곡', desert: '타오르는 사막', snow: '얼어붙은 설원', volcano: '용암 화산', castle: '청운문', rift: '틈의 심연', mirror: '거울의 방' };
// 테마가 속한 세계(15단계): 무림(1~2장, 9~10장) · 엘단 대륙(3~8장)
Game.Data.THEME_WORLD = { forest: '무림', desert: '엘단', snow: '엘단', volcano: '엘단', castle: '무림', rift: '세계의 틈', mirror: '거울' };
Game.Data.NODE_NAME = { battle: '전투', elite: '정예', event: '이벤트', treasure: '보물', rest: '휴식', shop: '상점', boss: '보스', midboss: '중간 보스', final: '최종 보스' };

// 스테이지 난이도(10단계 재조정): 그 스테이지 적의 체력·공격 피해 배율. 승천 보정과 더해진다
// 35단계: 노말 첫 시도 클리어 20% 이하(사용자 요청)를 목표로 앞보기 AI(tools/sim.js)로 스테이지마다 다시 맞췄다(대략 ×1.6~2.8)
Game.Data.difficulty = {
  hp: [1.44, 1.14, 1.7, 1.31, 2.71, 2.1, 2.92, 2.75, 5.06, 4.68, 5.43, 5.06, 5.16],   // 31단계: 11~13 세계의 틈. 39단계: 피해를 낮추며 체력도 0.55~0.8배로(앞보기 AI 첫 시도 60~80%)
  // 39단계: 피해 배율은 '적 한 행동이 동료 체력의 몇 %인가'로 정한다 — 일반 몬스터 최대 행동이 그 스테이지 동료 평균 체력의 25%(1) → 38%(13),
  //   정예·보스는 55% 이하. 35단계 표(2.1~5.2배)는 9 스테이지부터 일반 몬스터 한 방이 평균 체력을 넘었다. 어려움은 체력 배율과 기믹으로 준다
  dmg: [1.85, 2.05, 1.85, 1.9, 1.95, 2.0, 1.95, 2.05, 1.95, 1.75, 2.15, 2.2, 1.75],
  // 23단계: 정예·보스 체력 추가 보정(스테이지 체력 배율에 곱해 더한다). 보스전이 4~6턴에 끝나서 늘렸다
  bossHp: [1.2, 1.3, 1.3, 1.3, 1.3, 1.15, 1.3, 1.1, 1.25, 1.25, 1.25, 1.25, 1.25],
  // 39단계: 적 공격 1회의 상한(맞는 동료 최대 체력 대비, 적 등급별) — 배율이 어떻게 쌓여도 한 방에 쓰러지지 않는다
  hitCap: { normal: 0.4, elite: 0.55, boss: 0.65, final: 0.7 }
};

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
  // 39단계: 대장간 강화(150~1150 × 등급)에 비해 수입이 적어 약 1.5배. 모드 · 승천에 따라 더 준다(goldByMode · ascensionScale.goldPer)
  gold: { battle: [24, 38], elite: [60, 80], boss: [120, 170] },  // 15단계: 던전 길이를 절반으로 줄이며 조정. 33단계: 대장간 때문에 약 1.25배
  clearGold: { first: [120, 45], replay: [60, 25] },   // 33단계: 스테이지 돌파 금화 = 앞 + 뒤 × 스테이지 번호(처음 · 다시)
  skipGold: 10,
  fillGold: 20,           // 후보 카드가 3장이 안 될 때 빈자리 대신 주는 골드
  price: { common: 30, uncommon: 55, rare: 90, epic: 150, legendary: 250 },
  healCost: 40, healPct: 0.25,
  refreshCost: 20,
  restPct: 0.35,
  mirrorGold: 30,         // 거울 속 그림자를 쓰러뜨리면 추가 골드
  downedPct: 0.25,        // 쓰러진 캐릭터는 전투 승리 후 이 비율로 복귀
  shopSize: 5,
  // 19단계 덱빌딩: 준비 덱(캐릭터마다·공용) 4~8장, 처음과 합류할 때는 시작 카드 5장
  deckMin: 4, deckMax: 8,
  autoBuildSize: 8,       // 자동 구성은 등급 순으로 이만큼
  startDeck: 5,
  starterCommon: ['C01', 'C02', 'C03', 'C05', 'C07'],
  runDeckMin: 6,          // 스테이지 덱은 이보다 적게 줄일 수 없다
  removeCost: 50, removeStep: 25,   // 상점 카드 제거: 50, 그 스테이지에서 한 번 쓸 때마다 +25
  dupCost: 75,            // 상점 카드 복제(상점마다 한 번)
  newCardWeight: 1.6,     // 보상 후보: 같은 등급 안에서 아직 없는 카드가 나올 가중치
  defeatGold: 0.15        // 지면 가진 골드의 이만큼을 잃는다
};
