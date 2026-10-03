// items.js — 소모품(단약·부적) 12종 (22단계)
// 전투 중 언제든(내 턴, 카드를 쓰는 중이 아닐 때) 에너지 없이 쓴다. 칸은 3개(economy.itemSlots), 쓰면 사라진다.
// 효과 목록은 카드와 같은 형식이고 시전자가 없다. 대상은 고르지 않는다(전체 · 무작위 · 체력이 가장 낮은 아군 · 쓰러진 아군 전원)
(function () {
  var I = function (id, name, rarity, icon, desc, effects) { return { id: id, name: name, rarity: rarity, icon: icon, desc: desc, effects: effects }; };
  var list = [
    I('I01', '회기단', 'common', 'heart', '체력 비율이 가장 낮은 아군의 체력 20 회복.', [{ op: 'heal', value: 20, target: 'lowestAlly' }]),
    I('I02', '금강단', 'common', 'block', '아군 전체 보호막 12.', [{ op: 'block', value: 12, target: 'allAllies' }]),
    I('I03', '폭염부', 'common', 'burn', '적 전체에 피해 10, 화상 3.', [{ op: 'damage', value: 10, target: 'allEnemies' }, { op: 'status', status: 'burn', value: 3, target: 'allEnemies' }]),
    I('I04', '빙백부', 'common', 'chill', '적 전체에 한기 2.', [{ op: 'status', status: 'chill', value: 2, target: 'allEnemies' }]),
    I('I05', '공청석유', 'uncommon', 'energy', '에너지 +2.', [{ op: 'energy', value: 2 }]),
    I('I06', '천리안 부적', 'common', 'deck', '카드 3장을 뽑는다.', [{ op: 'draw', value: 3 }]),
    I('I07', '독무탄', 'uncommon', 'poison', '적 전체에 중독 6.', [{ op: 'status', status: 'poison', value: 6, target: 'allEnemies' }]),
    I('I08', '파천부', 'uncommon', 'vulnerable', '적 전체에 취약 2.', [{ op: 'status', status: 'vulnerable', value: 2, target: 'allEnemies' }]),
    I('I09', '정심환', 'uncommon', 'regen', '아군 전체의 디버프를 모두 지우고 재생 3.', [{ op: 'cleanse', all: true, target: 'allAllies' }, { op: 'status', status: 'regen', value: 3, target: 'allAllies' }]),
    I('I10', '기세 환단', 'uncommon', 'special', '동료 전원의 고유 자원 +3.', [{ op: 'res', value: 3, target: 'allAllies' }]),
    I('I11', '혈기단', 'rare', 'strength', '아군 전체 이번 턴 힘 +3.', [{ op: 'status', status: 'tempStr', value: 3, target: 'allAllies' }]),
    I('I12', '대환단', 'rare', 'heart', '쓰러진 아군을 모두 체력 30%로 되살린다.', [{ op: 'revive', pct: 0.3, target: 'allDowned' }])
  ];
  Game.Data.items = list;
  Game.Data.itemById = Game.util.byId(list);
  // 얻는 확률: 전투에서 이기면(빈 칸이 있을 때) 일반 25% · 정예 50% · 보스 100%. 상점에 2개 진열
  Game.Data.itemEconomy = { slots: 3, drop: { battle: 0.25, elite: 0.5, boss: 1 }, price: { common: 35, uncommon: 55, rare: 85 }, shop: 2,
    // 등급 가중치(일반/고급/희귀): 스테이지 1~4, 5~10
    weights: [[60, 35, 5], [40, 42, 18]] };
})();
