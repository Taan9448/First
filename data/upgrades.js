// upgrades.js — 카드 강화 규칙과 예외 표 (GAME_DESIGN.md 8장 '강화' 열, 19.4절)
// 강화 카드는 js/upgrade.js 가 이 규칙으로 만든다. 설명의 {+N} 은 강화로 바뀐 수치(초록색)다.
Game.Data.upgradeRules = {
  pct: 0.25, minAdd: 2,          // 피해·보호막·회복·골드: +25%(올림), 최소 +2
  statusAdd: 1,                  // 상태 부여 +1
  noStatusUp: ['taunt', 'hold', 'fortress', 'guardian', 'frozen', 'stun', 'reduce'],
  costDownAt: 3,                 // 비용 3 카드와 지속 카드는 수치 대신 비용 -1 (X 비용 제외)
  // 조건 완화: 기본 규칙에 더해 문턱을 한 단계 낮춘다(설명에서 해당 문구를 찾을 때만)
  ease: [
    { is: ['selfHp', 'targetHp'], op: '<=', from: 0.5, to: 0.6, text: ['절반 이하', '60% 이하'] },
    { is: ['selfHp', 'targetHp'], op: '<=', from: 0.3, to: 0.4, text: ['30% 이하', '40% 이하'] },
    { is: ['handSize'], op: '<=', step: 1, text: ['{n}장 이하', '{m}장 이하'] },
    { is: ['enemyCount'], op: '>=', min: 3, step: -1, text: ['{n}명 이상', '{m}명 이상'] },
    { is: ['targetDebuffKinds'], op: '>=', min: 2, step: -1, text: ['{n}종류 이상', '{m}종류 이상'] },
    { is: ['selfBlock'], op: '>=', min: 10, step: -2, text: ['{n} 이상', '{m} 이상'] }
  ],
  // 위 규칙으로 아무것도 바뀌지 않는 카드는 드로우 +1(드로우가 없으면 에너지 +1)
  fallbackDraw: 1
};

// 예외: 자동 규칙 대신(또는 자동 결과 위에) 덮어쓴다. effects 를 바꾸면 text 도 함께 적는다
(function () {
  var st = function (s, v, o) { return Object.assign({ op: 'status', status: s, value: v }, o); };
  var blk = function (v, o) { return Object.assign({ op: 'block', value: v }, o); };
  var heal = function (v, o) { return Object.assign({ op: 'heal', value: v }, o); };
  var draw = function (n) { return { op: 'draw', value: n }; };
  var energy = function (n) { return { op: 'energy', value: n }; };

  Game.Data.upgradeExceptions = {
    // 소멸 제거
    L12: { exhaust: false, text: '에너지 +2. {+소멸하지 않는다}.' },
    // 동전 던지기 앞면 확률 65%
    C29: { effects: [{ op: 'chance', p: 0.65, then: [energy(1)], else: [draw(1)] }],
      text: '동전을 던진다(앞면 {+65%}). 앞면이면 에너지 +1, 뒷면이면 카드 1장을 뽑는다.' },
    N30: { effects: [{ op: 'chance', p: 0.65, then: [draw(2)], else: [draw(1)] }],
      text: '동전을 던진다(앞면 {+65%}). 앞면이면 카드 2장, 뒷면이면 1장을 뽑는다.' },
    K32: { effects: [{ op: 'chance', p: 0.65, then: [{ op: 'damage', value: 22 }], else: [{ op: 'damage', value: 6 }] }],
      text: '동전을 던진다(앞면 {+65%}). 앞면이면 피해 {d0}, 뒷면이면 피해 {d1}.' },
    // 보호막 비례 피해: 기본 피해를 더한다
    B08: { effects: [{ op: 'damage', value: { base: 4, per: 'selfBlock', mult: 1 } }],
      text: '자신의 현재 보호막 {++ 4}만큼 피해({d0}).' },
    B21: { effects: [blk({ base: 0, per: 'selfLostHp', mult: 0.4, cap: 32 })],
      text: '잃은 체력의 {+40%}만큼 보호막 (최대 {+32}).' },
    B27: { effects: [{ op: 'damage', value: { base: 10, per: 'selfLostHp', mult: 0.4 } }],
      text: '피해 {d0}({+10} + 브리아가 잃은 체력의 {+40%}).' },
    // 디버프 제거 카드
    S04: { effects: [{ op: 'cleanse', count: 1 }, blk(4)], text: '아군 1명의 디버프 1개 제거{+, 보호막 4}.' },
    S13: { effects: [{ op: 'cleanse', all: true }, heal(3)], text: '아군 전체의 모든 디버프 제거{+, 체력 3 회복}.' },
    S17: { effects: [{ op: 'revive', pct: 0.6 }], text: '쓰러진 아군 1명을 체력 {+60%}로 되살린다. 소멸.' },
    // 효과를 더한다
    L15: { effects: [st('burn', 2), { op: 'custom', name: 'spreadBurn' }],
      text: '{+화상 2를 부여하고} 대상의 화상을 다른 모든 적에게 똑같이 부여.' },
    N17: { effects: [st('poison', 3), { op: 'custom', name: 'doublePoison' }],
      text: '{+중독 3을 부여하고} 대상의 중독을 2배로.' },
    C23: { effects: [{ op: 'custom', name: 'redraw', extra: 2 }], text: '손패를 전부 버리고, 버린 수보다 {+2}장 더 뽑는다.' },
    L32: { effects: [{ op: 'conjure', pool: { owner: 'lyra' }, count: 3 }],
      text: '리라의 카드 {+3}장을 무작위로 만들어 손패에 넣는다. 이번 턴 비용 0. 턴이 끝나면 사라진다.' },
    N32: { effects: [{ op: 'conjure', pool: { owner: 'heroes' }, count: 2 }],
      text: '모든 캐릭터의 카드 중 {+2}장을 무작위로 만들어 손패에 넣는다. 이번 턴 비용 0. 턴이 끝나면 사라진다.' },
    // 비용을 줄인다
    N24: { cost: 1 },
    L20: { cost: 1 },
    C26: { cost: 1 },
    S16: { effects: [{ op: 'loseHp', value: 2 }, draw(2)], text: '체력을 {+2} 잃고 카드 2장을 뽑는다.' },
    L25: { effects: [{ op: 'damage', value: { base: 0, per: 'x', mult: 12 } }, st('burn', { base: 0, per: 'x', mult: 1 }), st('chill', { base: 0, per: 'x', mult: 1 })],
      text: '적 전체에 피해 {+12} × X({d0}). 화상 X, 한기 X 부여.' },
    // 설명의 확률 표기까지 함께 바뀌는 카드
    C27: { effects: [st('keen', 3), st('tempStr', 4)],
      text: '아군 전체에 예리함 {+3}(치명타 확률 {++30%}), 이번 턴 힘 +{+4}.' }
  };
})();
