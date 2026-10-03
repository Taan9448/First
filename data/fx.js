// fx.js — 18단계: 카드를 쓸 때의 도트 이펙트 배정 (js/fx-pixel.js 의 연출 이름)
// 카드가 떠올라 빛나고 도트 조각으로 부서진 뒤, 아래 규칙으로 고른 연출이 이어진다.
// 고르는 순서: byCard → (회복 카드) heal → (공격 카드) byOwner → byElement → bySchool. 어느 것도 아니면 카드만 부서진다.
(function () {
  Game.Data.cardFx = {
    // 카드별 지정. 신화 무공 3종(어검술 · 대붕우 · 혈뢰)과 전설 참룡
    byCard: {
      K25: 'dragon', K29: 'swords', K24: 'swords',
      B24: 'roc',
      N26: 'bloodBolt', N27: 'bloodBolt', N33: 'toxicNeedles',
      K22: 'goldInk', K34: 'goldInk', B27: 'goldInk',
      L25: 'fireOrb', L29: 'arcaneOrb',
      // 27단계: 초승달 연참 · 혈성 · 천검강림 · 빙결 초승달
      K27: 'crescentStorm', K20: 'crescentStorm', K37: 'crescentStorm', K26: 'bloodStar',
      K18: 'skyBlades', S23: 'skyBlades', S36: 'skyBlades',
      L23: 'frostCrescent', L36: 'frostCrescent', L17: 'frostCrescent'
    },
    // 회복 카드: 속성이 신성이면 금빛 기둥, 그 밖에는 초록 빛
    heal: { holy: 'holyHeal', other: 'natureHeal' },
    // 공격 카드: 캐릭터별 기본 (소연은 암기를 던진다 · 30단계 시엘은 정령 화살을 쏜다)
    byOwner: { nox: 'needles', ciel: 'arrows' },
    // 공격 카드: 속성별
    byElement: {
      fire: 'fireOrb', ice: 'iceLance', lightning: 'thunder', poison: 'toxicNeedles',
      holy: 'holyStrike', arcane: 'arcaneOrb', shadow: 'shadowOrb'
    },
    // 공격 카드: 계열별 (무공은 먹 붓 획)
    bySchool: { martial: 'ink', fusion: 'ink', magic: 'arcaneOrb', neutral: 'ink' },
    // 카드가 부서질 때의 도트 색 (속성 → 팔레트)
    elPal: {
      fire: 'fire', ice: 'ice', lightning: 'bolt', poison: 'toxic', holy: 'holy', arcane: 'arcane', shadow: 'shadow',
      nature: 'heal', earth: 'holy', steel: 'steel', guard: 'ice', gold: 'holy', neutral: 'steel'
    },
    // 카드가 떠올라 모이는 시간(초). 전설은 화면이 어두워지고 금빛 마법진이 돈다
    gather: { normal: 0.24, epic: 0.34, legendary: 0.6 }
  };
})();
