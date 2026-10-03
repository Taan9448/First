// achievements.js — 업적 · 시작 선물 · 오늘의 원정 규칙(26단계)
// 업적은 저장 칸과 상관없이 이 브라우저 전체(프로필)에 쌓인다. 판정은 js/profile.js 가 한다
//   need 형식(모두 데이터):
//     { stat: 키, n }                       프로필 누적 기록이 n 이상(battles · wins · kills · elites · bosses · cards · dealt · stages · dailyPlays · dailyClears …)
//     { on: 'battleWin', node?, tally?, turn? }   전투에서 이겼을 때. node: 그 칸 종류 목록, tally: { 키: { min | max } } — 그 전투 집계(dealt · taken · maxHit · cards · maxCombo)
//     { on: 'stageClear', stage }           그 스테이지를 깼을 때
//     { on: 'ending', mode?, asc? }         혈마를 쓰러뜨렸을 때(mode: 그 모드에서, asc: 승천 그 단계 이상에서)
//     { on: 'daily', cleared? }             오늘의 원정을 마쳤을 때
//     { collect: 'heroes' | 'cards' | 'relics' | 'up3' | 'bond', n }   지금 저장 칸의 수집 수(up3: 3단계 강화 카드 수, bond: 가장 높은 친밀도)
//   reward: 시작 선물 id — 업적을 달성하면 새 게임을 시작할 때 고를 수 있다
(function () {
  var A = function (id, name, desc, need, reward, secret) { return { id: id, name: name, desc: desc, need: need, reward: reward || null, secret: !!secret }; };
  var BOSS = ['boss', 'midboss', 'final'], BIG = ['elite', 'boss', 'midboss', 'final'];
  var list = [
    // 누적
    A('A01', '첫 승리', '전투에서 처음 이긴다.', { stat: 'wins', n: 1 }, 'B01'),
    A('A02', '백전노장', '전투에서 100번 이긴다.', { stat: 'wins', n: 100 }),
    A('A03', '삼백 처치', '적을 300마리 쓰러뜨린다.', { stat: 'kills', n: 300 }),
    A('A04', '손에 익은 카드', '카드를 2000장 쓴다.', { stat: 'cards', n: 2000 }),
    A('A05', '정예 사냥꾼', '정예를 20번 쓰러뜨린다.', { stat: 'elites', n: 20 }, 'B04'),
    A('A06', '보스 사냥꾼', '보스를 10번 쓰러뜨린다.', { stat: 'bosses', n: 10 }),
    // 이야기
    A('A07', '만독곡 돌파', '2 스테이지를 깬다.', { on: 'stageClear', stage: 2 }, 'B02'),
    A('A08', '사막을 건너', '4 스테이지를 깬다.', { on: 'stageClear', stage: 4 }),
    A('A09', '설원의 끝', '6 스테이지를 깬다.', { on: 'stageClear', stage: 6 }),
    A('A10', '화산을 넘어', '8 스테이지를 깬다.', { on: 'stageClear', stage: 8 }),
    A('A11', '천외검결', '혈마 단목천을 쓰러뜨린다.', { on: 'ending' }, 'B03'),
    A('A12', '험한 길', '하드 모드에서 혈마를 쓰러뜨린다.', { on: 'ending', mode: 'hard' }),
    A('A13', '한 번뿐인 목숨', '하드코어 모드에서 혈마를 쓰러뜨린다.', { on: 'ending', mode: 'hardcore' }),
    A('A14', '승천의 첫걸음', '승천 1 원정을 마친다.', { on: 'ending', asc: 1 }),
    A('A15', '구름 위로', '승천 5 원정을 마친다.', { on: 'ending', asc: 5 }),
    A('A16', '천외의 끝', '승천 10 원정을 마친다.', { on: 'ending', asc: 10 }),
    // 전투 솜씨
    A('A17', '무결', '정예나 보스를 피해 없이 쓰러뜨린다.', { on: 'battleWin', node: BIG, tally: { taken: { max: 0 } } }),
    A('A18', '일격필살', '한 번에 60 이상의 피해를 준다.', { on: 'battleWin', tally: { maxHit: { min: 60 } } }, 'B05'),
    A('A19', '천근추', '한 번에 150 이상의 피해를 준다.', { on: 'battleWin', tally: { maxHit: { min: 150 } } }),
    A('A20', '연계의 달인', '한 턴에 연계를 6번 잇는다.', { on: 'battleWin', tally: { maxCombo: { min: 6 } } }),
    A('A21', '속전속결', '첫 턴에 전투를 끝낸다.', { on: 'battleWin', turn: { max: 1 } }),
    A('A22', '단칼', '보스를 3턴 안에 쓰러뜨린다.', { on: 'battleWin', node: BOSS, turn: { max: 3 } }),
    A('A23', '카드 폭풍', '한 전투에서 카드를 25장 쓴다.', { on: 'battleWin', tally: { cards: { min: 25 } } }),
    // 수집
    A('A24', '여섯 동료', '동료 여섯이 모두 모인다(30단계부터 여섯).', { collect: 'heroes', n: 6 }),
    A('A25', '수집가', '카드를 120종 모은다.', { collect: 'cards', n: 120 }),
    A('A26', '보물 창고', '유물을 25개 모은다.', { collect: 'relics', n: 25 }),
    A('A27', '삼단 연마', '카드 하나를 3단계까지 강화한다.', { collect: 'up3', n: 1 }),
    A('A28', '생사지교', '두 동료의 친밀도를 45까지 쌓는다.', { collect: 'bond', n: 45 }),
    // 오늘의 원정
    A('A29', '오늘의 원정', '오늘의 원정에 나선다.', { stat: 'dailyPlays', n: 1 }),
    A('A30', '오늘의 승자', '오늘의 원정을 끝까지 마친다.', { on: 'daily', cleared: true }, 'B06'),
    A('A31', '한결같이', '오늘의 원정을 7번 마친다.', { stat: 'dailyClears', n: 7 }),
    // 31단계: 세계의 틈
    // secret: 엔딩을 한 번이라도 보기 전에는 이름·설명이 '???'로 보인다
    A('A32', '틈 너머로', '세계의 틈 11 스테이지를 돌파한다.', { on: 'stageClear', stage: 11 }, null, true),
    A('A33', '천외로', '세계의 틈을 닫는다(13 스테이지 돌파).', { on: 'stageClear', stage: 13 }, null, true),
    // 대장간(33단계)
    A('A34', '담금질', '대장간에서 카드를 10번 벼린다.', { stat: 'forgeTries', n: 10 }),
    A('A35', '극의', '대장간에서 카드 하나를 10단계 극의까지 벼린다.', { stat: 'forgeBest', n: 10 })
  ];
  Game.Data.achievements = list;
  Game.Data.achievementById = Game.util.byId(list);

  // 시작 선물: 새 게임(1 스테이지)을 시작할 때 해금한 것 중 하나를 고른다
  //   gold · items(소모품 id) · relic('common' 이면 일반 유물 무작위) · exp(시작 동료 경험치) · upgrade(시작 덱에서 무작위 n장 1단계 강화)
  var B = function (id, name, desc, effect) { return { id: id, name: name, desc: desc, effect: effect }; };
  var boons = [
    B('B01', '여비', '시작 골드 +60.', { gold: 60 }),
    B('B02', '비상약', '회기단과 금강단을 갖고 시작한다.', { items: ['I01', 'I02'] }),
    B('B03', '오래된 부적', '일반 유물 하나를 갖고 시작한다.', { relic: 'common' }),
    B('B04', '수련 일지', '하린이 경험치 40을 갖고 시작한다(바로 레벨 1).', { exp: 40 }),
    B('B05', '숙련의 증표', '준비 덱의 카드 2장이 1단계 강화된 채 시작한다.', { upgrade: 2 }),
    B('B06', '단약 주머니', '무작위 소모품 3개를 갖고 시작한다.', { items: 'random3' })
  ];
  Game.Data.boons = boons;
  Game.Data.boonById = Game.util.byId(boons);

  // 오늘의 원정: 날짜로 정한 시드로 스테이지 하나 · 동료 셋 · 카드 · 유물 · 규칙을 정한다. 모두 같은 날에는 같은 지도
  //   규칙(mods)은 승천 규칙과 같은 형식(St.ascMods 가 함께 합친다). 어려운 규칙 2개 + 좋은 규칙 1개
  Game.Data.daily = {
    stages: [3, 4, 5, 6, 7, 8, 9],      // 고를 수 있는 스테이지
    hard: [
      { id: 'D1', name: '독한 적', desc: '모든 적 체력 +20%.', mods: { hpMult: 0.2 } },
      { id: 'D2', name: '날카로운 칼날', desc: '모든 적 공격 피해 +15%.', mods: { dmgMult: 0.15 } },
      { id: 'D3', name: '변이 폭주', desc: '변이 몬스터가 세 배 자주 나온다.', mods: { affixMult: 3 } },
      { id: 'D4', name: '광폭화', desc: '정예·보스가 체력 조건을 발동하면 힘 +2.', mods: { triggerStr: 2 } },
      { id: 'D5', name: '우두머리의 위엄', desc: '정예·보스가 힘 2를 갖고 시작한다.', mods: { eliteStr: 2 } },
      { id: 'D6', name: '얕은 잠', desc: '휴식 회복 20%.', mods: { restPct: 0.2 } },
      { id: 'D7', name: '빈약한 전리품', desc: '카드 보상 후보 2장.', mods: { rewardCards: 2 } }
    ],
    good: [
      { id: 'G1', name: '황금의 날', desc: '전투 골드 ×1.6.', mods: { goldMult: 1.6 } },
      { id: 'G2', name: '할인 장터', desc: '상점 가격 -30%.', mods: { shopPriceMult: 0.7 } }
    ],
    // 점수: 이긴 전투 · 정예 · 스테이지 돌파 · 남은 체력 비율(%) · 남은 골드, 스테이지가 높을수록 배율
    score: { win: 50, elite: 120, clear: 600, hpPct: 3, gold: 0.5, stageMult: 0.1 }
  };
})();
