// relics.js — 유물 65종 (GAME_DESIGN.md 19.2절, 22단계에 20종 · 29단계에 15종 추가)
// hooks: [{ on, effects }] — on: battleStart · turnStart. 효과 목록은 카드와 같은 형식(시전자 없음)
//   22단계: attackCard · skillCard · blockCard · healCard · powerCard · anyCard · turnEnd · turnEndHand · kill · exhaust · discard
//           heroHit(아군이 맞음, target = 그 아군) · enemyDebuff(적에게 디버프, target = 그 적) · freeze · resFull(고유 자원이 가득 참)
//   every(전투 누적 n번마다) · nth(이번 턴 n번째 카드일 때) · perTurn(턴마다 최대 횟수)
// mods : 전투·진행 코드가 읽는 상시 보정값
//   firstTurnEnergy, turnEnergy, everyN:{n,v}(N턴마다 에너지), firstTurnDraw, turnDraw, firstAttackBonus,
//   statusAdd:{상태:+n}, statusMult:{상태:배}, healBonus, phoenix(처음 쓰러지는 아군 체력 비율), turnEndBlockIfNone,
//   thirdCardBlock, turnFirstAttackCrit, freezeVuln, emptyHandDraw, onPowerDraw, onKillDraw, onCritBlock,
//   goldMult, downedPct, winHeal, noRestHeal, shopPriceMult, rewardCards(22단계: 카드 보상 후보 수)
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
    R('R09', '당가 독침', 'common', 'r_needle', '적에게 중독을 걸 때마다 +1.', { mods: { statusAdd: { poison: 1 } } }),
    R('R10', '부싯돌', 'common', 'r_flint', '적에게 화상을 걸 때마다 +1.', { mods: { statusAdd: { burn: 1 } } }),
    R('R11', '서리 결정', 'common', 'r_frost', '전투 시작 시 무작위 적 1명에게 한기 2.', { hooks: [{ on: 'battleStart', effects: [st('chill', 2, 'randomEnemy')] }] }),
    R('R12', '금창약', 'common', 'r_bandage', '쓰러진 아군이 전투 후 25% 대신 50% 체력으로 복귀.', { mods: { downedPct: 0.5 } }),

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

    R('R27', '혈마의 관', 'boss', 'r_demoncrown', '매 턴 에너지 +1. 휴식으로 회복할 수 없다.', { mods: { turnEnergy: 1, noRestHeal: true } }),
    R('R28', '시간의 톱니바퀴', 'boss', 'r_gear', '매 턴 에너지 +1. 매 턴 뽑는 카드 -1.', { mods: { turnEnergy: 1, turnDraw: -1 } }),
    R('R29', '피의 계약서', 'boss', 'r_contract', '매 턴 에너지 +1. 전투 시작 시 아군 전체 체력 5 잃음.', { mods: { turnEnergy: 1 }, hooks: [{ on: 'battleStart', effects: [{ op: 'loseHp', value: 5, target: 'allAllies' }] }] }),
    R('R30', '현자의 돌', 'boss', 'r_stone', '매 턴 에너지 +1. 상점 가격 +50%.', { mods: { turnEnergy: 1, shopPriceMult: 1.5 } }),

    // ---------------- 22단계: 사건마다 발동하는 유물 20종 ----------------
    R('R31', '청운 검수', 'common', 'r_glove', '공격 카드를 4장 쓸 때마다(전투 누적) 카드 1장 뽑기.', { hooks: [{ on: 'attackCard', every: 4, effects: [{ op: 'draw', value: 1 }] }] }),
    R('R32', '방패 휘장', 'common', 'r_crest', '방어 카드를 쓸 때마다 무작위 적에게 피해 2.', { hooks: [{ on: 'blockCard', effects: [{ op: 'damage', value: 2, target: 'randomEnemy' }] }] }),
    R('R33', '향낭', 'common', 'r_herbs', '턴 종료 시 아군 전체 체력 1 회복.', { hooks: [{ on: 'turnEnd', effects: [{ op: 'heal', value: 1, target: 'allAllies' }] }] }),
    R('R34', '먹물 벼루', 'common', 'r_book', '카드가 소멸할 때마다 체력 비율이 가장 낮은 아군에게 보호막 3.', { hooks: [{ on: 'exhaust', effects: [{ op: 'block', value: 3, target: 'lowestAlly' }] }] }),
    R('R35', '비도 주머니', 'common', 'r_dagger', '카드를 효과로 버릴 때마다 무작위 적에게 피해 3.', { hooks: [{ on: 'discard', effects: [{ op: 'damage', value: 3, target: 'randomEnemy' }] }] }),
    R('R36', '단전 수련서', 'common', 'r_mana', '전투 시작 시 동료 전원의 고유 자원 +2.', { hooks: [{ on: 'battleStart', effects: [{ op: 'res', value: 2, target: 'allAllies' }] }] }),

    R('R37', '혈전의 깃발', 'uncommon', 'r_horn', '적을 처치할 때마다 에너지 +1.', { hooks: [{ on: 'kill', effects: [{ op: 'energy', value: 1 }] }] }),
    R('R38', '응혈 부적', 'uncommon', 'r_amulet', '아군이 적의 공격에 맞으면 그 아군 보호막 4(턴마다 1번).', { hooks: [{ on: 'heroHit', perTurn: 1, effects: [{ op: 'block', value: 4, target: 'target' }] }] }),
    R('R39', '오행 나침반', 'uncommon', 'r_mana', '스킬 카드를 3장 쓸 때마다(전투 누적) 에너지 +1.', { hooks: [{ on: 'skillCard', every: 3, effects: [{ op: 'energy', value: 1 }] }] }),
    R('R40', '역린의 비늘', 'uncommon', 'r_scales', '적에게 디버프를 걸면 그 적에게 피해 2(턴마다 3번).', { hooks: [{ on: 'enemyDebuff', perTurn: 3, effects: [{ op: 'damage', value: 2, target: 'target' }] }] }),
    R('R41', '신목 가지', 'uncommon', 'r_seed', '회복 카드를 쓸 때마다 무작위 적에게 피해 4.', { hooks: [{ on: 'healCard', effects: [{ op: 'damage', value: 4, target: 'randomEnemy' }] }] }),
    R('R42', '얼음 사슬', 'uncommon', 'r_frost', '적이 빙결될 때마다 아군 전체 보호막 4.', { hooks: [{ on: 'freeze', effects: [{ op: 'block', value: 4, target: 'allAllies' }] }] }),
    R('R43', '독룡 비늘', 'uncommon', 'r_needle', '턴 종료 시 중독된 적마다 중독 +1.', { hooks: [{ on: 'turnEnd', effects: [{ op: 'status', status: 'poison', value: 1, target: 'allEnemies', ifHas: 'poison' }] }] }),

    R('R44', '천외검선의 검집', 'rare', 'r_dagger', '동료의 고유 자원이 가득 찰 때마다 카드 1장 뽑기, 에너지 +1.', { hooks: [{ on: 'resFull', effects: [{ op: 'draw', value: 1 }, { op: 'energy', value: 1 }] }] }),
    R('R45', '공명석', 'rare', 'r_stone', '지속 카드를 쓸 때마다 아군 전체 보호막 5.', { hooks: [{ on: 'powerCard', effects: [{ op: 'block', value: 5, target: 'allAllies' }] }] }),
    R('R46', '사천당가 비전서', 'rare', 'r_book', '카드를 효과로 버릴 때마다 무작위 적에게 중독 2.', { hooks: [{ on: 'discard', effects: [{ op: 'status', status: 'poison', value: 2, target: 'randomEnemy' }] }] }),
    R('R47', '수정 거북 등딱지', 'rare', 'r_icecrown', '턴 종료 시 손패에 남은 카드 1장당 체력 비율이 가장 낮은 아군 보호막 2.', { hooks: [{ on: 'turnEndHand', effects: [{ op: 'block', value: { base: 0, per: 'hand', mult: 2 }, target: 'lowestAlly' }] }] }),
    R('R48', '천둥새 깃털', 'rare', 'r_feather', '한 턴에 5번째 카드를 쓰면 적 전체에 피해 6.', { hooks: [{ on: 'anyCard', nth: 5, effects: [{ op: 'damage', value: 6, target: 'allEnemies' }] }] }),

    R('R49', '태극 문양', 'boss', 'r_gear', '매 턴 에너지 +1. 카드 보상 후보가 3장에서 2장으로 준다.', { mods: { turnEnergy: 1, rewardCards: 2 } }),
    R('R50', '혼돈의 주사위', 'boss', 'dice', '매 턴 에너지 +1. 턴 시작 시 손패의 비용이 0~2로 무작위로 바뀐다.', { mods: { turnEnergy: 1 }, hooks: [{ on: 'turnStart', effects: [{ op: 'randomizeCosts', min: 0, max: 2 }] }] }),

    // ---------------- 29단계: 유물 15종(22단계의 발동 사건을 그대로 쓴다) ----------------
    R('R51', '청동 거울', 'common', 'r_stone', '전투 시작 시 무작위 적 1명에게 취약 2.', { hooks: [{ on: 'battleStart', effects: [st('vulnerable', 2, 'randomEnemy')] }] }),
    R('R52', '대나무 물통', 'common', 'r_flask', '전투 시작 시 아군 전체 재생 3.', { hooks: [{ on: 'battleStart', effects: [st('regen', 3, 'allAllies')] }] }),
    R('R53', '연꽃 향로', 'common', 'r_herbs', '회복 카드를 쓸 때마다 체력 비율이 가장 낮은 아군 보호막 3.', { hooks: [{ on: 'healCard', effects: [{ op: 'block', value: 3, target: 'lowestAlly' }] }] }),
    R('R54', '숯불 화로', 'common', 'r_flint', '턴 종료 시 무작위 적에게 화상 1.', { hooks: [{ on: 'turnEnd', effects: [st('burn', 1, 'randomEnemy')] }] }),
    R('R55', '수련용 목검', 'common', 'r_glove', '한 턴에 3번째 카드를 쓰면 카드 1장 뽑기.', { hooks: [{ on: 'anyCard', nth: 3, effects: [{ op: 'draw', value: 1 }] }] }),

    R('R56', '빙경', 'uncommon', 'r_frost', '스킬 카드를 쓸 때마다 무작위 적에게 한기 1(턴마다 2번).', { hooks: [{ on: 'skillCard', perTurn: 2, effects: [st('chill', 1, 'randomEnemy')] }] }),
    R('R57', '맹세의 반지', 'uncommon', 'r_amulet', '방어 카드를 4장 쓸 때마다(전투 누적) 아군 전체 힘 1.', { hooks: [{ on: 'blockCard', every: 4, effects: [st('strength', 1, 'allAllies')] }] }),
    R('R58', '독사의 송곳니', 'uncommon', 'r_needle', '적을 처치할 때마다 적 전체에 중독 3.', { hooks: [{ on: 'kill', effects: [st('poison', 3, 'allEnemies')] }] }),
    R('R59', '감로 호리병', 'uncommon', 'r_bandage', '아군이 적의 공격에 맞으면 그 아군 체력 2 회복(턴마다 2번).', { hooks: [{ on: 'heroHit', perTurn: 2, effects: [{ op: 'heal', value: 2, target: 'target' }] }] }),
    R('R60', '원소 결정', 'uncommon', 'r_mana', '카드가 소멸할 때마다 무작위 적에게 피해 4.', { hooks: [{ on: 'exhaust', effects: [{ op: 'damage', value: 4, target: 'randomEnemy' }] }] }),

    R('R61', '검성의 띠', 'rare', 'r_crest', '공격 카드를 쓸 때마다 무작위 적에게 피해 2(턴마다 4번).', { hooks: [{ on: 'attackCard', perTurn: 4, effects: [{ op: 'damage', value: 2, target: 'randomEnemy' }] }] }),
    R('R62', '천년 영약', 'rare', 'r_seed', '동료의 고유 자원이 가득 찰 때마다 아군 전체 보호막 6.', { hooks: [{ on: 'resFull', effects: [{ op: 'block', value: 6, target: 'allAllies' }] }] }),
    R('R63', '봉황의 꼬리깃', 'rare', 'r_feather', '턴 종료 시 손패에 남은 카드 1장당 무작위 적에게 피해 3.', { hooks: [{ on: 'turnEndHand', effects: [{ op: 'damage', value: { base: 0, per: 'hand', mult: 3 }, target: 'randomEnemy' }] }] }),

    R('R64', '천마의 인장', 'boss', 'r_demoncrown', '매 턴 에너지 +1. 전투 시작 시 적 전체가 힘 1을 얻는다.', { mods: { turnEnergy: 1 }, hooks: [{ on: 'battleStart', effects: [st('strength', 1, 'allEnemies')] }] }),
    R('R65', '청빈의 염주', 'boss', 'r_bell', '매 턴 에너지 +1. 전투 골드 -50%.', { mods: { turnEnergy: 1, goldMult: 0.5 } })
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
