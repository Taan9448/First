// sfx.js — 37단계: 타격음 고르기 표. 소리 자체는 js/audio.js 가 Web Audio 로 합성한다(음원 파일 없음)
// 동료의 공격: 카드 속성이 마법 속성이면 그 속성 소리, 아니면 동료(hero) → 공격 자세(style) 순으로 찾는다
// 몬스터의 공격: 행동 이름에 든 낱말(moves, 위에서부터 먼저 맞는 것)로 찾고, 없으면 'hit'
(function () {
  Game.Data.sfx = {
    hero: { kai: 'brush', ciel: 'arrow' },                         // 하린은 서예 붓 — 먹 획이 지나가는 소리 · 시엘은 활
    style: { slash: 'slash', bash: 'blunt', stab: 'pierce', shoot: 'arrow', cast: 'magic', pray: 'holy' },
    element: { fire: 'fire', ice: 'ice', lightning: 'zap', arcane: 'magic', poison: 'poison', holy: 'holy', shadow: 'dark', nature: 'thorns' },
    // 몸으로 치는 속성(이 속성의 카드는 동료의 무기 소리를 쓴다)
    physical: ['neutral', 'steel', 'guard'],
    moves: [
      ['fire', '불|화염|용암|업화|메테오|분화|열기|화산'],
      ['ice', '얼음|빙결|서리|냉기|눈보라|절대영도|눈사태|눈덩이'],
      ['poison', '독|포자'],
      ['whip', '혀|채찍|휘감|감기|덩굴|거미줄|의 실'],
      ['bite', '물기|물어뜯|독니|턱|삼키|흡혈|입맞춤'],
      ['claw', '할퀴|발톱|손톱|집게|혈마조'],
      ['pierce', '찌르|창|침|화살|송곳|가시|저격|단도|비도|관통'],
      ['slash', '검|참|베기|일섬|칼날|대도|선풍'],
      ['blunt', '박치기|강타|내려|주먹|망치|후려|덮치|돌진|강공|바위|방패|지진|대지|급강하'],
      ['dark', '혈|공허|틈|그림자|영혼|넋|혼'],
      ['holy', '심판|태양|신성']
    ],
    heavyAt: 20,          // 이만큼 이상 피해면 묵직한 울림을 더한다
    comboRise: 0.025,     // 한 턴에 연달아 맞힐 때마다 음이 이만큼(비율) 올라간다(최대 8번)
    vary: 0.05            // 타격음마다 음 높이를 ±이만큼 흔들어 같은 소리가 되풀이되지 않게 한다
  };
})();
