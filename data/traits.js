// traits.js — 캐릭터 성장: 경험치·레벨·특성 50개 (GAME_DESIGN.md 19.8절, 9단계)
// 특성 효과는 mods(수정자)로 적고, 해석은 js/battle.js(전투) · js/stage.js(최대 체력·승리 회복)가 맡는다.
// mods 키
//   maxHp · critAdd(치명타 확률) · startStatus{상태:수치} · startBlock · turnStartBlock
//   firstAttackBonus(매 전투 첫 공격 카드 피해) · lowHpDamage(체력 절반 이하일 때 공격 피해) · aoeDamage · singleDamage
//   selfBlockDmgMult(보호막 비례 피해 배율) · frozenDmgMult(빙결된 적에게 주는 피해 배율)
//   onKillBlock · onKillHeal · onKillEnergy(그 캐릭터의 카드로 처치) · thirdAttackDraw(한 턴의 3·6·9번째 공격 카드마다)
//   firstOwnAttackDiscount · firstOwnCardDiscount(매 턴 그 캐릭터의 첫 (공격) 카드 비용 -1)
//   blockAdd · healAdd(그 캐릭터 카드의 보호막·회복) · statusAdd{상태:+n}(그 캐릭터가 거는 상태)
//   endTurnThornsIfBlock · shareBlock(다른 아군에게 보호막을 주면 자신도) · undyingOnce · onHitBlock
//   onFreezeDraw · burnVuln · cleanseBlock · overhealBlock · revivePct · selfRevive · turnStartHealLowest · attackHealLowest
//   firstDebuffDraw · 전투 전체: firstTurnEnergy · firstTurnDraw · everyN{n, v} · winHeal(전투 승리 후 아군 전체 회복)
Game.Data.growth = {
  exp: { battle: 5, elite: 12, boss: 35, midboss: 35, final: 50 },  // 14단계: 스테이지가 길어져 일반·정예 전투 경험치를 줄였다
  levels: [40, 120, 250, 450, 700]   // 레벨 1~5 문턱(누적 경험치). 10단계: 한 원정에 최고 레벨까지 가지 않게 올림
};

(function () {
  var t = function (name, desc, mods) { return { name: name, desc: desc, mods: mods }; };
  Game.Data.traits = {
    kai: [
      [t('날카로운 눈', '치명타 확률 +5%', { critAdd: 0.05 }), t('선제 일격', '매 전투 첫 공격 카드 피해 +4', { firstAttackBonus: 4 })],
      [t('단련된 몸', '최대 체력 +10', { maxHp: 10 }), t('투지', '전투 시작 시 힘 +1', { startStatus: { strength: 1 } })],
      [t('필살의 기술', '전투 시작 시 치명 강화 1', { startStatus: { critUp: 1 } }), t('검의 흐름', '한 턴에 세 번째 공격 카드마다 카드 1장 뽑기', { thirdAttackDraw: 1 })],
      [t('승리의 방패', '카이의 카드로 처치하면 보호막 5', { onKillBlock: 5 }), t('전리의 숨', '카이의 카드로 처치하면 체력 3 회복', { onKillHeal: 3 })],
      [t('빠른 검', '매 턴 카이의 첫 공격 카드 비용 -1', { firstOwnAttackDiscount: 1 }), t('배수의 진', '체력이 절반 이하일 때 공격 피해 +3', { lowHpDamage: 3 })]
    ],
    bram: [
      [t('강철 체력', '최대 체력 +12', { maxHp: 12 }), t('선봉의 방패', '전투 시작 시 보호막 8', { startBlock: 8 })],
      [t('두꺼운 방패', '브리아 카드의 보호막 +2', { blockAdd: 2 }), t('단단한 갑옷', '전투 시작 시 경감 1', { startStatus: { reduce: 1 } })],
      [t('가시 방벽', '턴 종료 시 보호막이 있으면 다음 턴까지 가시 2', { endTurnThornsIfBlock: 2 }), t('나눔의 방패', '다른 아군에게 보호막을 주면 브리아도 보호막 2', { shareBlock: 2 })],
      [t('불굴의 의지', '전투당 한 번, 쓰러질 피해를 받아도 체력 1로 버틴다', { undyingOnce: true }), t('방패 강타', '보호막 비례 피해 +25%', { selfBlockDmgMult: 1.25 })],
      [t('철벽 태세', '매 턴 시작 시 보호막 4', { turnStartBlock: 4 }), t('반사 신경', '공격받을 때마다 보호막 1', { onHitBlock: 1 })]
    ],
    lyra: [
      [t('불꽃의 재능', '리라가 거는 화상 +1', { statusAdd: { burn: 1 } }), t('서리의 재능', '리라가 거는 한기 +1', { statusAdd: { chill: 1 } })],
      [t('마력 그릇', '최대 체력 +8', { maxHp: 8 }), t('예열', '매 전투 첫 턴 에너지 +1', { firstTurnEnergy: 1 })],
      [t('폭넓은 주문', '리라의 광역 공격 피해 +2', { aoeDamage: 2 }), t('집중 주문', '리라의 단일 공격 피해 +3', { singleDamage: 3 })],
      [t('빠른 영창', '매 턴 리라의 첫 카드 비용 -1', { firstOwnCardDiscount: 1 }), t('얼음 영감', '적이 빙결되면 카드 1장 뽑기', { onFreezeDraw: 1 })],
      [t('잔불', '턴 시작 시 화상을 입은 적 모두 취약 1', { burnVuln: 1 }), t('얼음 파쇄', '빙결된 적이 받는 피해 +50%', { frozenDmgMult: 1.5 })]
    ],
    sera: [
      [t('따뜻한 손', '세라 카드의 회복 +2', { healAdd: 2 }), t('생명의 축복', '세라가 거는 재생 +1', { statusAdd: { regen: 1 } })],
      [t('신앙의 갑옷', '최대 체력 +10', { maxHp: 10 }), t('승리의 기도', '전투에서 이기면 아군 전체 체력 5 회복', { winHeal: 5 })],
      [t('정화의 손길', '세라가 디버프를 없앨 때마다 그 아군 보호막 4', { cleanseBlock: 4 }), t('넘치는 은총', '세라의 넘치는 회복량은 보호막이 된다', { overhealBlock: true })],
      [t('부활의 기적', '세라가 되살리는 체력 +20%p', { revivePct: 0.2 }), t('수호 천사', '전투당 한 번, 세라가 쓰러지면 체력 30%로 일어난다', { selfRevive: 0.3 })],
      [t('돌보는 눈', '턴 시작 시 체력 비율이 가장 낮은 아군 3 회복', { turnStartHealLowest: 3 }), t('심판의 은혜', '세라의 공격 카드를 쓰면 체력이 가장 낮은 아군 2 회복', { attackHealLowest: 2 })]
    ],
    nox: [
      [t('급소 감각', '치명타 확률 +5%', { critAdd: 0.05 }), t('독의 달인', '녹스가 거는 중독 +1', { statusAdd: { poison: 1 } })],
      [t('잠입 훈련', '최대 체력 +8', { maxHp: 8 }), t('준비된 계획', '매 전투 첫 턴 카드 1장 더 뽑기', { firstTurnDraw: 1 })],
      [t('약점 공략', '녹스가 거는 약화 +1', { statusAdd: { weak: 1 } }), t('허점 공략', '녹스가 거는 취약 +1', { statusAdd: { vulnerable: 1 } })],
      [t('책략가의 눈', '매 턴 녹스가 처음 디버프를 걸면 카드 1장 뽑기', { firstDebuffDraw: 1 }), t('암살자의 흐름', '녹스의 카드로 처치하면 에너지 +1', { onKillEnergy: 1 })],
      [t('긴 호흡', '3턴마다 에너지 +1', { everyN: { n: 3, v: 1 } }), t('치명의 비수', '전투 시작 시 치명 강화 1', { startStatus: { critUp: 1 } })]
    ]
  };
})();
