// upgrades.js — 카드 강화 규칙과 예외 표, 2·3단계 각인 (GAME_DESIGN.md 8장 '강화' 열, 19.4절)
// 강화 카드는 js/upgrade.js 가 이 규칙으로 만든다. 설명의 {+N} 은 강화로 바뀐 수치(초록색), {*이름} 은 각인(금색)이다.
// 18단계: 강화는 3단계까지. 1단계(+)는 아래 규칙, 2단계(+2)·3단계(+3)는 수치를 조금 더 올리고 각인이 붙는다.
Game.Data.upgradeRules = {
  maxLevel: 10,                  // 33단계: 최대 10단계
  fieldMax: 3,                   // 원정 중(휴식·이벤트)에는 3단계까지. 4단계부터는 로비 대장간에서 금화로
  pctHigh: 0.1, minAddHigh: 1,   // 4단계부터 한 단계마다: +10%(올림), 최소 +1
  pct: 0.25, minAdd: 2,          // 피해·보호막·회복·골드: 1단계 +25%(올림), 최소 +2
  pctNext: 0.15, minAddNext: 1,  // 2·3단계에서 한 번 더: +15%(올림), 최소 +1
  statusAdd: 1,                  // 상태 부여 1단계 +1, 3단계에서 +1 더 (statusAddAt)
  statusAddAt: [1, 3],
  noStatusUp: ['taunt', 'hold', 'fortress', 'guardian', 'frozen', 'stun', 'reduce'],
  costDownAt: 3,                 // 비용 3 카드와 지속 카드는 1단계에서 수치 대신 비용 -1 (X 비용 제외). 2·3단계는 수치가 오른다
  // 조건 완화: 기본 규칙에 더해 문턱을 한 단계 낮춘다(설명에서 해당 문구를 찾을 때만)
  ease: [
    { is: ['selfHp', 'targetHp'], op: '<=', from: 0.5, to: 0.6, text: ['절반 이하', '60% 이하'] },
    { is: ['selfHp', 'targetHp'], op: '<=', from: 0.3, to: 0.4, text: ['30% 이하', '40% 이하'] },
    { is: ['handSize'], op: '<=', step: 1, text: ['{n}장 이하', '{m}장 이하'] },
    { is: ['enemyCount'], op: '>=', min: 3, step: -1, text: ['{n}명 이상', '{m}명 이상'] },
    { is: ['targetDebuffKinds'], op: '>=', min: 2, step: -1, text: ['{n}종류 이상', '{m}종류 이상'] },
    { is: ['selfBlock'], op: '>=', min: 10, step: -2, text: ['{n} 이상', '{m} 이상'] }
  ],
  // 위 규칙으로 아무것도 바뀌지 않는 카드는 드로우 +1(드로우가 없으면 에너지 +1). 2·3단계에서 더 늘지 않는다
  fallbackDraw: 1,
  // 33단계: 높은 단계의 각인(3단계 각인의 수치를 배로 키운다). 각성부터 비용 -1, 극의는 보존도 붙는다
  tiers: [
    { from: 4, to: 6, name: '진(眞)', mult: [1.35, 1.7, 2.05] },
    { from: 7, to: 9, name: '각성', mult: [2.4, 2.75, 3.1], costDown: 1 },
    { from: 10, to: 10, name: '극의', mult: [3.6], costDown: 1, retain: true }
  ]
};

// 33단계: 로비 대장간(4~10단계 강화). 금화를 내고 확률로 오르며, 실패하면 1단계 내려간다(3단계 아래로는 안 떨어진다)
Game.Data.forge = {
  minLevel: 3,                                                     // 이 단계부터 대장간에서 강화한다(3 → 4)
  cost: { 4: 150, 5: 220, 6: 320, 7: 450, 8: 620, 9: 850, 10: 1150 },   // 오를 단계 → 기본 금화
  rarityMult: { common: 1, uncommon: 1.2, rare: 1.5, epic: 1.8, legendary: 2.2 },
  chance: { 4: 0.8, 5: 0.7, 6: 0.6, 7: 0.5, 8: 0.4, 9: 0.3, 10: 0.2 },  // 오를 단계 → 성공 확률
  failDrop: 1, floor: 3
};

// 2·3단계 각인: 카드 효과 뒤에 붙는 특수 효과. 3단계는 같은 각인의 강한 형태로 바뀐다
// 설명의 {d} 는 각인이 더하는 피해의 자리(빌드할 때 {dN} 으로 바뀐다)
// 고르는 순서: byCard → 공격 카드는 속성(byElement) → 계열(bySchool) → 카드 유형(byType)
(function () {
  var dmg = function (v, o) { return Object.assign({ op: 'damage', value: v }, o); };
  var st = function (s, v, o) { return Object.assign({ op: 'status', status: s, value: v }, o); };
  var blk = function (v, o) { return Object.assign({ op: 'block', value: v }, o); };
  var heal = function (v, o) { return Object.assign({ op: 'heal', value: v }, o); };
  var self = { target: 'self' };

  Game.Data.upgradeSkills = {
    pick: {
      byCard: {},
      byElement: { fire: 'ember', ice: 'frost', lightning: 'arc', poison: 'venom', holy: 'grace', arcane: 'echo' },
      bySchool: { martial: 'swordQi', fusion: 'swordQi', neutral: 'swordQi', magic: 'echo' },
      byType: { attack: 'swordQi', block: 'counter', heal: 'purify', skill: 'reserve', power: 'resolve' }
    },
    skills: {
      swordQi: { name: '검기', lv2: { effects: [dmg(3, { target: 'randomEnemy' })], text: '무작위 적에게 피해 {d}.' },
        lv3: { effects: [dmg(4, { target: 'randomEnemy', times: 2 })], text: '무작위 적에게 피해 {d}을 2회.' } },
      ember: { name: '불씨', lv2: { effects: [st('burn', 2)], text: '화상 2 부여.' },
        lv3: { effects: [st('burn', 3), st('burn', 1, { target: 'allEnemies' })], text: '화상 3 부여. 적 전체에 화상 1.' } },
      frost: { name: '서리', lv2: { effects: [st('chill', 1)], text: '한기 1 부여.' },
        lv3: { effects: [st('chill', 2), blk(5, self)], text: '한기 2 부여. 보호막 5.' } },
      arc: { name: '연쇄', lv2: { effects: [dmg(3, { target: 'randomEnemy' })], text: '무작위 적에게 피해 {d}.' },
        lv3: { effects: [dmg(3, { target: 'randomEnemy', times: 3 })], text: '무작위 적에게 피해 {d}을 3회.' } },
      venom: { name: '맹독', lv2: { effects: [st('poison', 2)], text: '중독 2 부여.' },
        lv3: { effects: [st('poison', 3), st('weak', 1)], text: '중독 3, 약화 1 부여.' } },
      grace: { name: '은총', lv2: { effects: [heal(3, { target: 'lowestAlly' })], text: '체력이 가장 낮은 아군 3 회복.' },
        lv3: { effects: [heal(5, { target: 'lowestAlly' }), { op: 'cleanse', count: 1, target: 'lowestAlly' }], text: '체력이 가장 낮은 아군 5 회복, 디버프 1개 제거.' } },
      echo: { name: '마력 잔향', lv2: { effects: [st('weak', 1)], text: '약화 1 부여.' },
        lv3: { effects: [st('weak', 1), { op: 'draw', value: 1 }], text: '약화 1 부여. 카드 1장을 뽑는다.' } },
      counter: { name: '반격', lv2: { effects: [st('thornsTemp', 2, self)], text: '다음 내 턴까지 가시 2.' },
        lv3: { effects: [st('thornsTemp', 3, self), st('tempStr', 1, self)], text: '다음 내 턴까지 가시 3. 이번 턴 힘 +1.' } },
      purify: { name: '정화', lv2: { effects: [{ op: 'cleanse', count: 1 }], text: '디버프 1개 제거.' },
        lv3: { effects: [{ op: 'cleanse', count: 1 }, st('regen', 2)], text: '디버프 1개 제거, 재생 2.' } },
      reserve: { name: '여력', lv2: { effects: [blk(3, self)], text: '보호막 3.' },
        lv3: { effects: [blk(4, self), { op: 'draw', value: 1 }], text: '보호막 4. 카드 1장을 뽑는다.' } },
      resolve: { name: '결의', lv2: { effects: [blk(5, self)], text: '보호막 5.' },
        lv3: { effects: [blk(6, self), { op: 'draw', value: 1 }], text: '보호막 6. 카드 1장을 뽑는다.' } }
    }
  };
})();

// 예외: 자동 규칙 대신(또는 자동 결과 위에) 덮어쓴다. effects 를 바꾸면 text 도 함께 적는다
(function () {
  var st = function (s, v, o) { return Object.assign({ op: 'status', status: s, value: v }, o); };
  var blk = function (v, o) { return Object.assign({ op: 'block', value: v }, o); };
  var heal = function (v, o) { return Object.assign({ op: 'heal', value: v }, o); };
  var draw = function (n) { return { op: 'draw', value: n }; };
  var energy = function (n) { return { op: 'energy', value: n }; };

  Game.Data.upgradeExceptions = {
    // 소멸 제거
    L12: { exhaust: false, text: '에너지 +2. 이번 턴 이미 카드를 2장 이상 썼다면 +3. {+소멸하지 않는다}.' },
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
    S04: { effects: [{ op: 'if', cond: { is: 'targetHas', status: 'debuff' }, then: [{ op: 'cleanse', count: 1 }, draw(1)], else: [{ op: 'cleanse', count: 1 }] }, blk(4)],
      text: '아군 1명의 디버프 1개 제거. 디버프가 있었다면 카드 1장을 뽑는다{+, 보호막 4}.' },
    S13: { effects: [{ op: 'cleanse', all: true }, { op: 'if', cond: { is: 'prevOther' }, then: [blk(4)], else: [] }, heal(3)],
      text: '아군 전체의 모든 디버프 제거{+, 체력 3 회복}. 직전에 다른 동료의 카드를 썼다면 아군 전체 보호막 4.' },
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
    S16: { effects: [{ op: 'loseHp', value: 2 }, draw(2), { op: 'if', cond: { is: 'selfRes', op: '>=', n: 3 }, then: [energy(1)], else: [] }],
      text: '체력을 {+2} 잃고 카드 2장을 뽑는다. 신앙이 3 이상이면 에너지 +1.' },
    L25: { effects: [{ op: 'damage', value: { base: 0, per: 'x', mult: 12 } }, st('burn', { base: 0, per: 'x', mult: 1 }), st('chill', { base: 0, per: 'x', mult: 1 })],
      text: '적 전체에 피해 {+12} × X({d0}). 화상 X, 한기 X 부여.' },
    // 20단계 카드
    B36: { effects: [{ op: 'damage', value: { base: 4, per: 'selfBlock', mult: 1.5 } }, { op: 'loseBlock', target: 'self' }],
      text: '자신의 보호막 × 1.5 {++ 4}만큼 피해({d0}). 그 뒤 자신의 보호막을 모두 잃는다. 소멸.' },
    K38: { effects: [{ op: 'damage', value: { base: 4, per: 'selfRes', mult: 6 } }, { op: 'spendRes' }], text: '피해 {d0}: {+4} + 하린의 검세 1당 6. 검세를 모두 쓴다.' },
    N38: { effects: [{ op: 'damage', value: { base: 4, per: 'targetStatus', status: 'venomMark', mult: 5 } }, { op: 'clearStatus', status: 'venomMark' }], text: '피해 {d0}: {+4} + 대상의 독 표식 1당 5. 그 뒤 표식을 없앤다.' },
    N37: { exhaust: false, text: '대상이 중독 수치만큼 즉시 체력을 잃는다(보호막 무시). 중독은 그대로 남는다. {+소멸하지 않는다}.' },
    // 30단계 시엘: 미리 보기 · 조준만 있는 카드
    A05: { effects: [{ op: 'scry', value: 3 }, draw(1)], text: '미리 보기 {+3}{+, 카드 1장을 뽑는다}.' },
    A10: { effects: [{ op: 'res', value: 3 }], text: '조준 {++3}(스킬이라 1 더 쌓인다).' },
    // 설명의 확률 표기까지 함께 바뀌는 카드
    C27: { effects: [st('keen', 3), st('tempStr', { base: 4, per: 'combo', mult: 1, cap: 7 })],
      text: '아군 전체에 예리함 {+3}(치명타 확률 {++30%}), 이번 턴 힘 +{+4} + 지금 연계 수(최대 {+7}).' }
  };
})();
