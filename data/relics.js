// relics.js — 유물 30종 (GAME_DESIGN.md 19.2절)
// hooks: [{ on, effects }] — on: battleStart · turnStart. 효과 목록은 카드와 같은 형식(시전자 없음)
// mods : 전투·진행 코드가 읽는 상시 보정값
//   firstTurnEnergy, turnEnergy, everyN:{n,v}(N턴마다 에너지), firstTurnDraw, turnDraw, firstAttackBonus,
//   statusAdd:{상태:+n}, statusMult:{상태:배}, healBonus, phoenix(처음 쓰러지는 아군 체력 비율), turnEndBlockIfNone,
//   thirdCardBlock, turnFirstAttackCrit, freezeVuln, emptyHandDraw, onPowerDraw, onKillDraw, onCritBlock,
//   goldMult, downedPct, winHeal, noRestHeal, shopPriceMult
(function () {
  var st = function (s, v, t) { return { op: 'status', status: s, value: v, target: t }; };
  var R = function (id, name, rarity, icon, desc, x) { return Object.assign({ id: id, name: name, rarity: rarity, icon: icon, desc: desc }, x); };

  var list = [
    R('R01', '여명의 모래시계', 'common', 'r_hourglass', '매 전투 첫 턴 에너지 +1.', { mods: { firstTurnEnergy: 1 } }),
    R('R02', '낡은 숫돌', 'common', 'r_whetstone', '전투 시작 시 아군 전체 예리함 1.', { hooks: [{ on: 'battleStart', effects: [st('keen', 1, 'allAllies')] }] }),
    R('R03', '수호 부적', 'common', 'r_amulet', '전투 시작 시 아군 전체 보호막 6.', { hooks: [{ on: 'battleStart', effects: [{ op: 'block', value: 6, target: 'allAllies' }] }] }),
    R('R04', '약초 주머니', 'common', 'r_herbs', '전투에서 이기면 아군 전체 체력 4 회복.', { mods: { winHeal: 4 } }),
    R('R05', '행운의 동전', 'common', 'r_coin', '전투 골드 +25%.', { mods: { goldMult: 1.25 } }),
    R('R06', '화약 주머니', 'common', 'r_powder', '전투 시작 시 모든 적에게 피해 5.', { hooks: [{ on: 'battleStart', effects: [{ op: 'damage', value: 5, target: 'allEnemies' }] }] }),
    R('R07', '가죽 장갑', 'common', 'r_glove', '매 전투 첫 공격 카드 피해 +5.', { mods: { firstAttackBonus: 5 } }),
    R('R08', '은방울', 'common', 'r_bell', '매 전투 첫 턴 카드 2장 더 뽑기.', { mods: { firstTurnDraw: 2 } }),
    R('R09', '독 바른 바늘', 'common', 'r_needle', '적에게 중독을 걸 때마다 +1.', { mods: { statusAdd: { poison: 1 } } }),
    R('R10', '부싯돌', 'common', 'r_flint', '적에게 화상을 걸 때마다 +1.', { mods: { statusAdd: { burn: 1 } } }),
    R('R11', '서리 결정', 'common', 'r_frost', '전투 시작 시 무작위 적 1명에게 한기 2.', { hooks: [{ on: 'battleStart', effects: [st('chill', 2, 'randomEnemy')] }] }),
    R('R12', '붕대 뭉치', 'common', 'r_bandage', '쓰러진 아군이 전투 후 25% 대신 50% 체력으로 복귀.', { mods: { downedPct: 0.5 } }),

    R('R13', '전사의 문장', 'uncommon', 'r_crest', '치명타가 나면 그 캐릭터가 보호막 3.', { mods: { onCritBlock: 3 } }),
    R('R14', '불사조 깃털', 'uncommon', 'r_feather', '전투마다 처음 쓰러지는 아군 1명이 체력 20%로 즉시 일어난다.', { mods: { phoenix: 0.2 } }),
    R('R15', '마나 수정', 'uncommon', 'r_mana', '3턴마다 에너지 +1.', { mods: { everyN: { n: 3, v: 1 } } }),
    R('R16', '가시 팔찌', 'uncommon', 'r_thorn', '전투 시작 시 아군 전체 가시 2.', { hooks: [{ on: 'battleStart', effects: [st('thorns', 2, 'allAllies')] }] }),
    R('R17', '연금술 플라스크', 'uncommon', 'r_flask', '아군의 모든 회복량 +2.', { mods: { healBonus: 2 } }),
    R('R18', '사냥꾼의 표식', 'uncommon', 'r_mark', '적을 처치할 때마다 카드 1장 뽑기.', { mods: { onKillDraw: 1 } }),
    R('R19', '철갑 장화', 'uncommon', 'r_boots', '턴 종료 시 보호막이 없는 아군에게 보호막 3.', { mods: { turnEndBlockIfNone: 3 } }),
    R('R20', '지휘관의 나팔', 'uncommon', 'r_horn', '한 턴에 세 번째로 쓰는 카드마다 아군 전체 보호막 3.', { mods: { thirdCardBlock: 3 } }),

    R('R21', '용의 심장', 'rare', 'r_heart', '적에게 거는 화상이 2배로 쌓인다.', { mods: { statusMult: { burn: 2 } } }),
    R('R22', '영원의 서', 'rare', 'r_book', '지속 카드를 쓰면 카드 1장 뽑기.', { mods: { onPowerDraw: 1 } }),
    R('R23', '그림자 단검', 'rare', 'r_dagger', '매 턴 첫 공격 카드는 반드시 치명타.', { mods: { turnFirstAttackCrit: true } }),
    R('R24', '생명의 나무 씨앗', 'rare', 'r_seed', '턴 시작 시 체력 비율이 가장 낮은 아군 3 회복.', { hooks: [{ on: 'turnStart', effects: [{ op: 'heal', value: 3, target: 'lowestAlly' }] }] }),
    R('R25', '얼음 왕관', 'rare', 'r_icecrown', '적이 빙결되면 취약 2도 받는다.', { mods: { freezeVuln: 2 } }),
    R('R26', '빈 손의 천칭', 'rare', 'r_scales', '손패를 모두 쓰고 턴을 끝내면 다음 턴 카드 2장 더.', { mods: { emptyHandDraw: 2 } }),

    R('R27', '마왕의 왕관', 'boss', 'r_demoncrown', '매 턴 에너지 +1. 휴식으로 회복할 수 없다.', { mods: { turnEnergy: 1, noRestHeal: true } }),
    R('R28', '시간의 톱니바퀴', 'boss', 'r_gear', '매 턴 에너지 +1. 매 턴 뽑는 카드 -1.', { mods: { turnEnergy: 1, turnDraw: -1 } }),
    R('R29', '피의 계약서', 'boss', 'r_contract', '매 턴 에너지 +1. 전투 시작 시 아군 전체 체력 5 잃음.', { mods: { turnEnergy: 1 }, hooks: [{ on: 'battleStart', effects: [{ op: 'loseHp', value: 5, target: 'allAllies' }] }] }),
    R('R30', '현자의 돌', 'boss', 'r_stone', '매 턴 에너지 +1. 상점 가격 +50%.', { mods: { turnEnergy: 1, shopPriceMult: 1.5 } })
  ];

  Game.Data.relics = list;
  Game.Data.relicById = Game.util.byId(list);
  Game.Data.RELIC_RARITY = { common: '일반', uncommon: '고급', rare: '희귀', boss: '보스' };
  Game.Data.relicEconomy = {
    price: { common: 120, uncommon: 180, rare: 260 },
    // 정예 유물 등급 확률(일반/고급/희귀): 1~4 스테이지, 5~10 스테이지
    elite: [[70, 30, 0], [45, 40, 15]],
    bossActs: [4, 8]       // 이 스테이지의 보스는 보스 유물 3개 중 1개
  };
})();
