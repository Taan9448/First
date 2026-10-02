// ascension.js — 승천 1~10단계 (GAME_DESIGN.md 19.9절, 10단계)
// 엔딩을 보면 '새 원정'을 승천 단계를 골라 1 스테이지부터 다시 시작한다. 규칙은 1단계부터 그 단계까지 누적된다.
// 초기화되는 것은 스테이지 진행(클리어 기록·진행 중인 스테이지·이번 원정의 이벤트 기록)뿐이다.
// mods 키
//   hpMult(모든 적 체력 +비율) · bossHpMult(정예·보스·최종 보스 체력 +비율) · finalHpMult(최종 보스 체력 +비율)
//   dmgMult(적 공격 피해 +비율) · triggerStr(정예·보스가 체력 조건을 발동하면 힘 +n) · doomMult(종말 피해 배율)
//   affixMult(변이 확률 배율) · restPct(휴식 회복 비율) · downedPct(쓰러진 아군 복귀 비율)
//   shopPriceMult · goldMult(전투 골드 배율) · rewardCards(카드 보상 후보 수)
// 승천 단계마다 공통으로 붙는 적 강화(단계 수만큼 곱해 더한다). 카드·유물·성장이 이어지므로 단계 규칙만으로는 약하다
Game.Data.ascensionScale = { hpMult: 0.3, dmgMult: 0.12 };
// 승천 원정의 스테이지 난이도: 이어진 카드·유물·성장 때문에 1 스테이지부터 기본 원정 막바지 수준에서 시작하고,
// 스테이지마다 조금씩 오른다(기본 원정의 difficulty 표 대신 쓴다)
Game.Data.ascensionCurve = { hp: 3.8, dmg: 2.1, hpPerStage: 0.04, dmgPerStage: 0.02 };
Game.Data.ascension = [
  { n: 1, name: '강해진 적', desc: '모든 적 체력 +10%', mods: { hpMult: 0.10 } },
  { n: 2, name: '변이의 확산', desc: '적 변이 확률 2배', mods: { affixMult: 2 } },
  { n: 3, name: '얕은 잠', desc: '휴식 회복 35% → 25%', mods: { restPct: 0.25 } },
  { n: 4, name: '우두머리의 위엄', desc: '정예·보스 체력 +15%', mods: { bossHpMult: 0.15 } },
  { n: 5, name: '인색한 상인', desc: '상점 가격 +20%, 전투 골드 -20%', mods: { shopPriceMult: 1.2, goldMult: 0.8 } },
  { n: 6, name: '날카로운 발톱', desc: '모든 적 공격 피해 +10%', mods: { dmgMult: 0.10 } },
  { n: 7, name: '깊은 상처', desc: '쓰러진 아군 복귀 25% → 10%', mods: { downedPct: 0.10 } },
  { n: 8, name: '광폭화', desc: '정예·보스가 체력 조건을 발동하면 힘 +2', mods: { triggerStr: 2 } },
  { n: 9, name: '빈약한 전리품', desc: '카드 보상 후보 3장 → 2장', mods: { rewardCards: 2 } },
  { n: 10, name: '혈마의 각성', desc: '최종 보스 체력 +20%, 종말 피해 2배', mods: { finalHpMult: 0.20, doomMult: 2 } }
];
