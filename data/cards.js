// cards.js — 카드 277종(16단계 200 → 20단계 218 → 21단계 223 → 29단계 247 → 30단계 277) + 방해 카드
// 형식은 GAME_DESIGN.md 2.3절. 설명의 {d0}, {d1} … 은 damage 효과의 순서(깊이 우선)이며
// 화면에서 힘·약화를 반영한 값으로 바뀐다. 그 밖의 수치는 글자로 적는다.
(function () {
  var dmg = function (v, o) { return Object.assign({ op: 'damage', value: v }, o); };
  var blk = function (v, o) { return Object.assign({ op: 'block', value: v }, o); };
  var heal = function (v, o) { return Object.assign({ op: 'heal', value: v }, o); };
  var st = function (s, v, o) { return Object.assign({ op: 'status', status: s, value: v }, o); };
  var draw = function (n) { return { op: 'draw', value: n }; };
  var energy = function (n, o) { return Object.assign({ op: 'energy', value: n }, o); };
  var cleanse = function (o) { return Object.assign({ op: 'cleanse', count: 1 }, o); };
  var IF = function (cond, t, e) { return { op: 'if', cond: cond, then: t, else: e || [] }; };
  var chance = function (t, e) { return { op: 'chance', p: 0.5, then: t, else: e }; };
  var oneOf = function (opts) { return { op: 'oneOf', options: opts }; };
  var opt = function (label, effects) { return { label: label, effects: effects }; };
  var power = function (hook, effects) { return { op: 'power', hook: hook, effects: effects }; };
  var per = function (p, mult, base, o) { return Object.assign({ base: base || 0, per: p, mult: mult }, o); };

  var OWNER = { K: 'kai', B: 'bram', L: 'lyra', S: 'sera', N: 'nox', A: 'ciel', C: 'common' };
  var R = { c: 'common', u: 'uncommon', r: 'rare', e: 'epic', l: 'legendary' };
  var T = { a: 'attack', s: 'skill', b: 'block', h: 'heal', p: 'power' };
  var TG = { e: 'enemy', E: 'allEnemies', r: 'randomEnemy', a: 'ally', A: 'allAllies', s: 'self', d: 'downedAlly', n: 'none' };

  // C(id, 이름, 유형, 등급, 비용, 대상, 효과, 설명, 추가)
  // 추가: b 기본 카드 · x 소멸 · art 일러스트 · el 속성 · tags(조건/무작위/치명) · retain 보존 · innate 선천성 · onDiscard 버려지면(20단계)
  function C(id, name, type, rarity, cost, target, effects, text, extra) {
    extra = extra || {};
    var card = {
      id: id, name: name, owner: OWNER[id[0]], type: T[type], rarity: R[rarity], cost: cost,
      target: TG[target], effects: effects, text: text,
      basic: !!extra.b, exhaust: !!extra.x, art: extra.art || null, el: extra.el || null,
      tags: extra.tags || ''
    };
    // 20단계: 보존(턴이 끝나도 손패에 남음) · 선천성(첫 손패) · 버려지면(다른 카드 효과로 버려질 때)
    if (extra.retain) card.retain = true;
    if (extra.innate) card.innate = true;
    if (extra.onDiscard) card.onDiscard = extra.onDiscard;
    return card;
  }

  var list = [
    // ---------------- 하린 ----------------
    C('K01', '청운일검', 'a', 'c', 1, 'e', [dmg(6)], '피해 {d0}.', { b: 1, art: 'jian' }),
    C('K02', '운무보', 'b', 'c', 1, 's', [IF({ is: 'selfBlock', op: '==', n: 0 }, [blk(8)], [blk(5)])], '보호막 5. 보호막이 없을 때 쓰면 8.', { b: 1, art: 'shield', tags: '조건' }),
    C('K03', '쌍연검', 'a', 'c', 1, 'e', [IF({ is: 'firstCard' }, [dmg(3, { times: 3 })], [dmg(3, { times: 2 })])], '피해 {d1}을 2회. 이번 턴 첫 카드라면 3회.', { b: 1, art: 'twin', tags: '조건' }),
    C('K04', '파산검', 'a', 'c', 2, 'e', [dmg(10), st('vulnerable', 1)], '피해 {d0}. 취약 1 부여.', { b: 1, art: 'jian' }),
    C('K05', '유성검', 'a', 'c', 1, 'e', [IF({ is: 'targetHp', op: 'full' }, [dmg(9)], [dmg(5)]), draw(1)], '피해 {d1}. 대상의 체력이 가득 차 있으면 {d0}. 카드 1장을 뽑는다.', { b: 1, art: 'dash', tags: '조건' }),
    C('K06', '진기 집중', 's', 'c', 0, 's', [st('tempStr', 2)], '이번 턴 힘 +2.', { b: 1, art: 'shout' }),
    C('K07', '선풍검', 'a', 'c', 1, 'E', [dmg(4)], '적 전체에 피해 {d0}.', { b: 1, art: 'spin' }),
    C('K08', '반탄검', 'b', 'c', 1, 'e', [blk(4, { target: 'self' }), IF({ is: 'targetIntentAttack' }, [dmg(8)], [dmg(3)])], '보호막 4. 피해 {d1}. 대상이 공격을 예고했다면 피해 {d0}.', { b: 1, art: 'parry', tags: '조건' }),
    C('K09', '점혈검', 'a', 'c', 1, 'e', [dmg(4, { forceCrit: true })], '피해 {d0}. 반드시 치명타.', { art: 'pierce', tags: '치명' }),
    C('K10', '삼재검', 'a', 'u', 2, 'e', [dmg(4, { times: 3 })], '피해 {d0}을 3회.', { art: 'twin' }),
    C('K11', '파갑검', 'a', 'u', 1, 'e', [dmg(5, { breakBlock: true }), st('vulnerable', 2)], '대상에게 보호막이 있으면 먼저 부순다. 피해 {d0}. 취약 2 부여.', { art: 'jian', tags: '조건' }),
    C('K12', '정심결', 's', 'u', 1, 's', [st('focus', 2)], '집중 2.', { art: 'eye', tags: '치명' }),
    C('K13', '추풍검', 'a', 'u', 1, 'E', [dmg(5), IF({ is: 'enemyCount', op: '>=', n: 3 }, [draw(2)], [draw(1)])], '적 전체에 피해 {d0}. 카드 1장을 뽑는다. 적이 3명 이상이면 2장.', { art: 'wind', tags: '조건' }),
    C('K14', '반본귀원검', 'a', 'u', 1, 'e', [IF({ is: 'selfHp', op: '<=', n: 0.5 }, [dmg(7, { leech: 1 })], [dmg(7, { leech: 0.5 })])], '피해 {d1}. 입힌 피해의 절반만큼 회복. 하린의 체력이 절반 이하면 전부 회복.', { art: 'blood', tags: '조건' }),
    C('K15', '심법 수련', 'p', 'u', 1, 's', [st('strength', 1)], '지속 힘 +1.', { art: 'strength' }),
    C('K16', '금강호체', 'b', 'u', 1, 's', [blk(7), st('thornsTemp', 3)], '보호막 7. 다음 내 턴까지 가시 3.', { art: 'palm' }),
    C('K17', '단혼검', 'a', 'r', 2, 'e', [IF({ is: 'targetHp', op: '<=', n: 0.5 }, [dmg(28)], [dmg(14)])], '피해 {d1}. 대상의 체력이 절반 이하면 2배.', { art: 'axe', tags: '조건' }),
    C('K18', '천외검우', 'a', 'r', 2, 'E', [dmg(4, { times: 2 })], '적 전체에 피해 {d0}을 2회.', { art: 'spin' }),
    C('K19', '광검결', 'p', 'r', 1, 's', [st('strength', 2), power('turnStart', [{ op: 'loseHp', value: 2, target: 'self' }])], '지속 힘 +2. 매 턴 시작 시 체력을 2 잃는다.', { art: 'rage' }),
    C('K20', '무영연검', 'a', 'r', 1, 'e', [dmg(2, { times: 4, onCrit: [st('tempStr', 1, { target: 'self' })] })], '피해 {d0}를 4회. 치명타가 날 때마다 이번 턴 힘 +1.', { art: 'twin', tags: '치명' }),
    C('K21', '허점 간파', 's', 'r', 0, 'e', [st('vulnerable', 2), draw(1)], '취약 2 부여. 카드 1장을 뽑는다.', { art: 'eye' }),
    C('K22', '천외일섬', 'a', 'e', 3, 'e', [IF({ is: 'targetHas', status: 'vulnerable' }, [dmg(24, { forceCrit: true })], [dmg(24)])], '피해 {d1}. 대상이 취약이면 치명타.', { art: 'katana', tags: '조건·치명' }),
    C('K23', '검무', 'p', 'e', 2, 's', [power('onAttackCard', [blk(2, { target: 'self' })])], '지속 공격 카드를 쓸 때마다 하린이 보호막 2를 얻는다.', { art: 'dance' }),
    C('K24', '천검난무', 'a', 'e', 'X', 'e', [dmg(6, { times: per('x', 1, 1) })], '피해 {d0}을 X+1회.', { art: 'twin' }),
    C('K25', '천외참룡검', 'a', 'l', 3, 'e', [dmg(35, { onKill: [energy(3), draw(2)] })], '피해 {d0}. 이 카드로 처치하면 에너지 +3, 카드 2장을 뽑는다.', { art: 'dragon' }),
    C('K26', '일격필살', 'a', 'e', 2, 'e', [dmg(12, { critBonus: 0.3, onCrit: [energy(1), draw(1)] })], '피해 {d0}. 치명타 확률 +30%. 치명타가 나면 에너지 +1, 카드 1장을 뽑는다.', { art: 'star', tags: '치명' }),
    C('K27', '연환검', 'a', 'e', 1, 'e', [dmg(per('attacksThisTurn', 3, 5))], '피해 {d0}. 이번 턴에 이미 쓴 공격 카드 1장당 +3.', { art: 'twin', tags: '조건' }),
    C('K28', '마나검강', 'p', 'e', 2, 's', [st('keen', 2), st('critUp', 1)], '지속 예리함 2(치명타 확률 +20%). 치명 강화 1(치명타 피해 +50%).', { art: 'star', tags: '치명' }),
    C('K29', '천외난무', 'a', 'l', 3, 'E', [dmg(6, { times: 3, onCrit: [draw(1)] })], '적 전체에 피해 {d0}을 3회. 치명타가 날 때마다 카드 1장을 뽑는다.', { art: 'musou', tags: '치명' }),
    C('K30', '난검', 'a', 'c', 1, 'e', [dmg([2, 12])], '피해 {d0} (무작위).', { art: 'dice', tags: '무작위' }),
    C('K31', '광풍난검', 'a', 'u', 1, 'r', [dmg(3, { times: [2, 5] })], '무작위 적에게 피해 {d0}을 2~5회 (무작위).', { art: 'twin', tags: '무작위' }),
    C('K32', '천운검', 'a', 'r', 2, 'e', [chance([dmg(22)], [dmg(6)])], '동전을 던진다. 앞면이면 피해 {d0}, 뒷면이면 피해 {d1}.', { art: 'coin', tags: '무작위' }),
    // 16단계 추가: 엘단에서 익힌 융합 검식
    C('K33', '염화검', 'a', 'u', 1, 'e', [dmg(7), st('burn', 3)], '피해 {d0}. 화상 3 부여.', { art: 'jian', el: 'fire' }),
    C('K34', '양의검결', 'a', 'e', 2, 'e', [dmg(8, { times: 2 }), st('burn', 2), st('chill', 1)], '피해 {d0}을 2회. 화상 2, 한기 1 부여.', { art: 'twin', el: 'arcane' }),

    // ---------------- 브리아 ----------------
    C('B01', '방패 치기', 'a', 'c', 1, 'e', [IF({ is: 'selfBlock', op: '>=', n: 10 }, [dmg(10)], [dmg(5)]), blk(3, { target: 'self' })], '피해 {d1}. 보호막이 10 이상이면 {d0}. 보호막 3.', { b: 1, art: 'shieldBash', tags: '조건' }),
    C('B02', '굳건한 방패', 'b', 'c', 1, 's', [blk(7)], '보호막 7.', { b: 1, art: 'shield' }),
    C('B03', '도발', 's', 'c', 1, 's', [st('taunt', 1), blk(4)], '도발 1. 보호막 4.', { b: 1, art: 'taunt' }),
    C('B04', '엄호', 'b', 'c', 1, 'a', [IF({ is: 'targetHp', op: '<=', n: 0.5 }, [blk(10)], [blk(6)])], '아군 1명에게 보호막 6. 대상의 체력이 절반 이하면 10.', { b: 1, art: 'shield', tags: '조건' }),
    C('B05', '묵직한 일격', 'a', 'c', 2, 'e', [IF({ is: 'targetHas', status: 'weak' }, [dmg(16)], [dmg(11)])], '피해 {d1}. 대상이 약화 상태면 {d0}.', { b: 1, art: 'hammer', tags: '조건' }),
    C('B06', '방패 올리기', 'b', 'c', 0, 's', [blk(3)], '보호막 3.', { b: 1, art: 'shield' }),
    C('B07', '진형 유지', 'b', 'c', 2, 'A', [IF({ is: 'allAlive' }, [blk(7)], [blk(5)])], '아군 전체에 보호막 5. 편성한 아군이 모두 살아 있으면 7.', { b: 1, art: 'wall', tags: '조건' }),
    C('B08', '몸통 박치기', 'a', 'c', 1, 'e', [dmg(per('selfBlock', 1))], '자신의 현재 보호막만큼 피해({d0}).', { b: 1, art: 'shieldBash', tags: '조건' }),
    C('B09', '가시 갑옷', 'b', 'c', 1, 's', [blk(4), st('thornsTemp', 3)], '보호막 4. 다음 내 턴까지 가시 3.', { art: 'thorns' }),
    C('B10', '철벽', 'b', 'u', 2, 's', [blk(14)], '보호막 14.', { art: 'wall' }),
    C('B11', '방패 돌진', 'a', 'u', 2, 'e', [dmg(8), st('weak', 2)], '피해 {d0}. 약화 2 부여.', { art: 'shieldBash' }),
    C('B12', '수호 서약', 'b', 'u', 1, 'a', [blk(9), draw(1)], '아군 1명에게 보호막 9. 카드 1장을 뽑는다.', { art: 'shield' }),
    C('B13', '위압', 's', 'u', 1, 'E', [IF({ is: 'enemyCount', op: '==', n: 1 }, [st('weak', 3)], [st('weak', 1)])], '적 전체에 약화 1. 적이 1명뿐이면 3.', { art: 'shout', tags: '조건' }),
    C('B14', '버티기', 'b', 'u', 1, 's', [blk(6), st('hold', 1)], '보호막 6. 다음 턴 시작 시 보호막이 사라지지 않는다.', { art: 'shield' }),
    C('B15', '대지 강타', 'a', 'u', 2, 'E', [dmg(6), st('taunt', 1, { target: 'self' })], '적 전체에 피해 {d0}. 자신에게 도발 1.', { art: 'quake', el: 'earth' }),
    C('B16', '재정비', 's', 'u', 0, 's', [IF({ is: 'selfHas', status: 'debuff' }, [cleanse(), blk(3)], [blk(8)])], '디버프 1개를 없애고 보호막 3. 디버프가 없으면 대신 보호막 8.', { art: 'shield', tags: '조건' }),
    C('B17', '불굴', 'p', 'r', 1, 's', [power('turnEnd', [blk(3, { target: 'self' })])], '지속 턴 종료 시 브리아가 보호막 3을 얻는다.', { art: 'wall' }),
    C('B18', '강철 가시', 'p', 'r', 1, 's', [st('thorns', 2)], '지속 가시 2.', { art: 'thorns' }),
    C('B19', '파성추', 'a', 'r', 2, 'e', [dmg(12, { breakBlock: true })], '대상의 보호막을 모두 없앤 뒤 피해 {d0}.', { art: 'hammer' }),
    C('B20', '성벽', 'b', 'r', 3, 'A', [blk(12)], '아군 전체에 보호막 12.', { art: 'wall' }),
    C('B21', '최후의 보루', 'b', 'r', 1, 's', [blk(per('selfLostHp', 0.3, 0, { cap: 25 }))], '잃은 체력의 30%만큼 보호막 (최대 25).', { art: 'shield', tags: '조건' }),
    C('B22', '난공불락', 'p', 'e', 2, 's', [st('fortress', 1)], '지속 브리아의 보호막이 턴 시작 시 사라지지 않는다.', { art: 'wall' }),
    C('B23', '수호자의 맹세', 'p', 'e', 1, 's', [st('guardian', 1), st('reduce', 2)], '지속 적의 단일 공격이 항상 브리아를 향한다. 공격 1회당 받는 피해 -2.', { art: 'taunt' }),
    C('B24', '대지의 분노', 'a', 'e', 3, 'E', [dmg(per('selfBlock', 1))], '적 전체에 자신의 현재 보호막만큼 피해({d0}).', { art: 'quake', el: 'earth', tags: '조건' }),
    C('B25', '불멸의 수호자', 'p', 'l', 3, 'A', [blk(15), { op: 'custom', name: 'teamUndying' }], '지속 아군 전체에 보호막 15. 이번 전투에서 한 번, 아군이 쓰러질 피해를 받아도 체력 1로 버틴다.', { art: 'wings', el: 'holy' }),
    C('B26', '철옹성', 'b', 'e', 2, 's', [IF({ is: 'selfHp', op: '<=', n: 0.5 }, [blk(22)], [blk(11)])], '보호막 11. 브리아의 체력이 절반 이하면 22.', { art: 'wall', tags: '조건' }),
    C('B27', '복수의 일격', 'a', 'e', 2, 'e', [dmg(per('selfLostHp', 0.3, 8))], '피해 {d0}(8 + 브리아가 잃은 체력의 30%).', { art: 'hammer', tags: '조건' }),
    C('B28', '결의', 'p', 'e', 1, 's', [power('turnEnd', [IF({ is: 'selfBlock', op: '>=', n: 10 }, [st('strength', 1, { target: 'self' })])])], '지속 턴 종료 시 브리아의 보호막이 10 이상이면 힘 +1.', { art: 'strength', tags: '조건' }),
    C('B29', '천년 방벽', 'b', 'l', 3, 'A', [blk(18, { keep: true }), st('taunt', 2, { target: 'self' })], '아군 전체에 보호막 18. 이 보호막은 다음 턴에도 남는다. 브리아에게 도발 2.', { art: 'fortress' }),
    C('B30', '임기응변', 'b', 'c', 1, 's', [blk([3, 12])], '보호막 3~12 (무작위).', { art: 'dice', tags: '무작위' }),
    C('B31', '방패 던지기', 'a', 'u', 1, 'r', [dmg(per('selfBlock', 1, 4))], '무작위 적에게 피해 {d0}(4 + 자신의 현재 보호막).', { art: 'shieldBash', tags: '조건' }),
    C('B32', '행운의 부적', 's', 'r', 1, 's', [oneOf([opt('보호막 14', [blk(14)]), opt('가시 7', [st('thornsTemp', 7)]), opt('힘 +2', [st('strength', 2)]), opt('재생 5', [st('regen', 5)])])], '다음 중 하나가 무작위로 발동: 보호막 14 / 다음 턴까지 가시 7 / 힘 +2 / 재생 5.', { art: 'clover', tags: '무작위' }),
    // 16단계 추가: 하린에게 배운 호신강기
    C('B33', '금강호신벽', 'b', 'r', 1, 's', [blk(10), st('reduce', 1)], '보호막 10. 경감 1(공격 1회당 받는 피해 -1).', { art: 'wall' }),

    // ---------------- 리라 ----------------
    C('L01', '화염구', 'a', 'c', 1, 'e', [dmg(5), st('burn', 2)], '피해 {d0}. 화상 2 부여.', { b: 1, art: 'fire' }),
    C('L02', '얼음 화살', 'a', 'c', 1, 'e', [IF({ is: 'targetHas', status: 'burn' }, [dmg(9)], [dmg(5)]), st('chill', 1)], '피해 {d1}. 대상이 화상 상태면 {d0}. 한기 1 부여.', { b: 1, art: 'ice', tags: '조건' }),
    C('L03', '마력 방벽', 'b', 'c', 1, 's', [blk(5)], '보호막 5.', { b: 1, art: 'orb' }),
    C('L04', '불꽃 파동', 'a', 'c', 2, 'E', [dmg(6), st('burn', 1)], '적 전체에 피해 {d0}. 화상 1 부여.', { b: 1, art: 'flameWave' }),
    C('L05', '마력 화살', 'a', 'c', 0, 'e', [IF({ is: 'handSize', op: '<=', n: 3 }, [dmg(6)], [dmg(3)])], '피해 {d1}. 남은 손패가 3장 이하면 {d0}.', { b: 1, art: 'missile', tags: '조건' }),
    C('L06', '서리 고리', 'a', 'c', 1, 'E', [dmg(3), st('chill', 1)], '적 전체에 피해 {d0}. 한기 1 부여.', { b: 1, art: 'frostRing' }),
    C('L07', '명상', 's', 'c', 1, 'n', [IF({ is: 'noAttackInHand' }, [draw(3)], [draw(2)])], '카드 2장을 뽑는다. 손패에 공격 카드가 없으면 3장.', { b: 1, art: 'book', tags: '조건' }),
    C('L08', '전격', 'a', 'c', 1, 'r', [dmg(4, { times: 2 })], '무작위 적에게 피해 {d0}를 2회.', { b: 1, art: 'bolt' }),
    C('L09', '점화', 's', 'c', 1, 'e', [IF({ is: 'targetHas', status: 'burn' }, [st('burn', 8)], [st('burn', 5)])], '화상 5 부여. 대상이 이미 화상 상태면 8.', { art: 'fire', tags: '조건' }),
    C('L10', '연쇄 번개', 'a', 'u', 2, 'E', [IF({ is: 'enemyCount', op: '==', n: 1 }, [dmg(14)], [dmg(8)])], '적 전체에 피해 {d1}. 적이 1명뿐이면 {d0}.', { art: 'bolt', tags: '조건' }),
    C('L11', '빙결 창', 'a', 'u', 2, 'e', [IF({ is: 'targetHas', status: 'chill' }, [dmg(15)], [dmg(9)]), st('chill', 2)], '피해 {d1}. 대상이 한기 상태면 {d0}. 한기 2 부여.', { art: 'ice', tags: '조건' }),
    C('L12', '마력 충전', 's', 'u', 0, 'n', [energy(2)], '에너지 +2. 소멸.', { x: 1, art: 'orb' }),
    C('L13', '화염 기둥', 'a', 'u', 2, 'e', [dmg(8), IF({ is: 'lastCardType', type: 'attack' }, [st('burn', 7)], [st('burn', 4)])], '피해 {d0}. 화상 4 부여. 직전에 쓴 카드가 공격이면 화상 7.', { art: 'fire', tags: '조건' }),
    C('L14', '얼음 갑옷', 'b', 'u', 1, 'a', [blk(8), st('chill', 1, { target: 'randomEnemy' })], '아군 1명에게 보호막 8. 무작위 적에게 한기 1.', { art: 'ice' }),
    C('L15', '불씨 확산', 's', 'u', 1, 'e', [{ op: 'custom', name: 'spreadBurn' }], '대상의 화상을 다른 모든 적에게 똑같이 부여.', { art: 'flameWave' }),
    C('L16', '비전 통찰', 's', 'u', 1, 'n', [draw(2), { op: 'discount', value: 1 }], '카드 2장을 뽑는다. 이번 턴 다음 카드의 비용 -1.', { art: 'book' }),
    C('L17', '눈보라', 'a', 'r', 2, 'E', [dmg(5), st('chill', 2)], '적 전체에 피해 {d0}. 한기 2 부여.', { art: 'frostRing' }),
    C('L18', '폭발', 'a', 'r', 2, 'e', [dmg(per('targetStatus', 2, 6, { status: 'burn' }))], '피해 {d0}(6 + 대상의 화상 중첩 × 2).', { art: 'explosion', el: 'fire', tags: '조건' }),
    C('L19', '원소 친화', 'p', 'r', 1, 's', [st('affinity', 1)], '지속 리라가 부여하는 화상과 한기 +1.', { art: 'orb' }),
    C('L20', '절대 영도', 's', 'r', 2, 'e', [st('frozen', 1)], '대상을 즉시 빙결. 소멸.', { x: 1, art: 'ice' }),
    C('L21', '마력 폭주', 'p', 'r', 1, 's', [power('turnStart', [{ op: 'addCard', card: 'L05', pile: 'hand', temp: true }])], '지속 매 턴 시작 시 마력 화살 1장을 손패에 넣는다(그 턴에만 유지).', { art: 'missile' }),
    C('L22', '유성우', 'a', 'e', 3, 'r', [dmg(7, { times: 5, onHit: [st('burn', 1)] })], '무작위 적에게 피해 {d0}을 5회. 맞을 때마다 화상 1.', { art: 'meteor', el: 'fire' }),
    C('L23', '빙하기', 'a', 'e', 3, 'E', [dmg(10), st('chill', 3)], '적 전체에 피해 {d0}. 한기 3 부여. 소멸.', { x: 1, art: 'frostRing' }),
    C('L24', '마나의 샘', 'p', 'e', 2, 'n', [power('turnStart', [energy(1)])], '지속 매 턴 에너지 +1.', { art: 'orb' }),
    C('L25', '원소 대폭발', 'a', 'l', 'X', 'E', [dmg(per('x', 9)), st('burn', per('x', 1)), st('chill', per('x', 1))], '적 전체에 피해 9 × X({d0}). 화상 X, 한기 X 부여.', { art: 'explosion' }),
    C('L26', '원소 공명', 'a', 'e', 2, 'e', [dmg(10), IF({ is: 'targetHas', status: 'burn', pre: true }, [st('chill', 2)]), IF({ is: 'targetHas', status: 'chill', pre: true }, [st('burn', 5)])], '피해 {d0}. 대상이 화상 상태면 한기 2, 한기 상태면 화상 5 부여.', { art: 'orb', tags: '조건' }),
    C('L27', '마력 과부하', 's', 'e', 1, 'n', [energy(2), IF({ is: 'handSize', op: '<=', n: 2 }, [draw(2)])], '에너지 +2. 남은 손패가 2장 이하면 카드 2장을 뽑는다.', { art: 'bolt', tags: '조건' }),
    C('L28', '치명 주문', 'p', 'e', 1, 's', [st('keen', 3)], '지속 예리함 3(치명타 확률 +30%).', { art: 'star', tags: '치명' }),
    C('L29', '대마법: 혼돈', 'a', 'l', 3, 'r', [dmg(8, { times: 6, onHit: [st('randomDebuff', 1)] })], '무작위 적에게 피해 {d0}을 6회. 맞을 때마다 무작위 디버프를 건다.', { art: 'chaos', tags: '무작위' }),
    C('L30', '불안정한 마법', 'a', 'c', 1, 'e', [dmg([1, 14])], '피해 {d0} (무작위).', { art: 'chaos', tags: '무작위' }),
    C('L31', '원소 룰렛', 'a', 'u', 1, 'e', [dmg(6), oneOf([opt('화상 5', [st('burn', 5)]), opt('한기 2', [st('chill', 2)]), opt('중독 5', [st('poison', 5)]), opt('취약 2', [st('vulnerable', 2)])])], '피해 {d0}. 화상 5 / 한기 2 / 중독 5 / 취약 2 중 하나를 무작위로 부여.', { art: 'dice', tags: '무작위' }),
    C('L32', '마법 서적', 's', 'r', 1, 'n', [{ op: 'conjure', pool: { owner: 'lyra' }, count: 2 }], '리라의 카드 2장을 무작위로 만들어 손패에 넣는다. 이번 턴 비용 0. 턴이 끝나면 사라진다.', { art: 'book', tags: '무작위' }),
    // 16단계 추가: 내공으로 마나를 돌리는 경공
    C('L33', '풍마보', 'b', 'u', 1, 's', [blk(5), draw(1)], '보호막 5. 카드 1장을 뽑는다.', { art: 'wind' }),

    // ---------------- 세라 ----------------
    C('S01', '치유의 빛', 'h', 'c', 1, 'a', [IF({ is: 'targetHp', op: '<=', n: 0.5 }, [heal(12)], [heal(7)])], '아군 1명의 체력 7 회복. 대상의 체력이 절반 이하면 12.', { b: 1, art: 'heal', tags: '조건' }),
    C('S02', '신성한 일격', 'a', 'c', 1, 'e', [dmg(5), heal(2, { target: 'lowestAlly' })], '피해 {d0}. 체력이 가장 낮은 아군 2 회복.', { b: 1, art: 'holySword' }),
    C('S03', '축복의 방패', 'b', 'c', 1, 'a', [blk(6), cleanse()], '아군 1명에게 보호막 6. 대상에게 디버프가 있으면 1개 제거.', { b: 1, art: 'shield', el: 'holy', tags: '조건' }),
    C('S04', '정화', 's', 'c', 0, 'a', [cleanse()], '아군 1명의 디버프 1개 제거.', { b: 1, art: 'drop' }),
    C('S05', '기도', 'h', 'c', 1, 'A', [IF({ is: 'anyDown' }, [heal(6)], [heal(3)])], '아군 전체의 체력 3 회복. 쓰러진 아군이 있으면 6.', { b: 1, art: 'pray', tags: '조건' }),
    C('S06', '빛의 화살', 'a', 'c', 1, 'e', [IF({ is: 'allFull' }, [dmg(12)], [dmg(7)])], '피해 {d1}. 아군 전원의 체력이 가득 차 있으면 {d0}.', { b: 1, art: 'lightArrow', tags: '조건' }),
    C('S07', '재생의 손길', 'h', 'c', 1, 'a', [st('regen', 3)], '아군 1명에게 재생 3.', { b: 1, art: 'leaf' }),
    C('S08', '성역', 'b', 'c', 2, 'A', [blk(4), heal(2)], '아군 전체에 보호막 4, 체력 2 회복.', { b: 1, art: 'sun' }),
    C('S09', '응급 처치', 'h', 'c', 0, 'a', [IF({ is: 'firstCard' }, [heal(8)], [heal(4)])], '아군 1명의 체력 4 회복. 이번 턴 첫 카드라면 8.', { art: 'heal', tags: '조건' }),
    C('S10', '큰 치유', 'h', 'u', 2, 'a', [heal(15)], '아군 1명의 체력 15 회복.', { art: 'heal' }),
    C('S11', '심판', 'a', 'u', 2, 'e', [dmg(12), IF({ is: 'targetIntentAttack' }, [st('weak', 2)], [st('weak', 1)])], '피해 {d0}. 약화 1 부여. 대상이 공격을 예고했다면 2.', { art: 'lightArrow', tags: '조건' }),
    C('S12', '생명의 샘', 'h', 'u', 1, 'A', [st('regen', 2)], '아군 전체에 재생 2.', { art: 'leaf' }),
    C('S13', '대정화', 's', 'u', 1, 'A', [cleanse({ all: true })], '아군 전체의 모든 디버프 제거.', { art: 'drop' }),
    C('S14', '신의 가호', 'b', 'u', 1, 'a', [blk(8), st('regen', 2)], '아군 1명에게 보호막 8, 재생 2.', { art: 'wings' }),
    C('S15', '빛의 폭발', 'a', 'u', 2, 'E', [dmg(6), heal(2, { target: 'allAllies' })], '적 전체에 피해 {d0}. 아군 전체 2 회복.', { art: 'sun' }),
    C('S16', '헌신', 's', 'u', 0, 's', [{ op: 'loseHp', value: 4 }, draw(2)], '체력을 4 잃고 카드 2장을 뽑는다.', { art: 'pray' }),
    C('S17', '부활', 'h', 'r', 2, 'd', [{ op: 'revive', pct: 0.4 }], '쓰러진 아군 1명을 체력 40%로 되살린다. 소멸.', { x: 1, art: 'wings' }),
    C('S18', '신성한 불꽃', 'a', 'r', 1, 'e', [dmg(per('targetDebuffKinds', 3, 5))], '피해 {d0}(5 + 대상의 디버프 종류 수 × 3).', { art: 'sun', tags: '조건' }),
    C('S19', '치유의 오라', 'p', 'r', 1, 'A', [power('turnEnd', [heal(2, { target: 'allAllies' })])], '지속 턴 종료 시 아군 전체의 체력 2 회복.', { art: 'leaf' }),
    C('S20', '천상의 방벽', 'b', 'r', 2, 'A', [blk(8), cleanse()], '아군 전체에 보호막 8, 디버프 1개 제거.', { art: 'wings' }),
    C('S21', '생명 전이', 'h', 'r', 1, 'a', [heal(12, { overflowToBlock: true })], '아군 1명의 체력 12 회복. 넘치는 회복량은 보호막이 된다.', { art: 'heal' }),
    C('S22', '대치유', 'h', 'e', 3, 'A', [heal(15)], '아군 전체의 체력 15 회복.', { art: 'heal' }),
    C('S23', '천벌', 'a', 'e', 3, 'E', [dmg(12), heal(6, { target: 'allAllies' })], '적 전체에 피해 {d0}. 아군 전체 6 회복.', { art: 'lightArrow' }),
    C('S24', '수호천사', 'p', 'e', 2, 'A', [power('onHeal', [blk(3, { target: 'healed' })])], '지속 아군이 회복할 때마다 그 아군이 보호막 3을 얻는다.', { art: 'wings' }),
    C('S25', '기적', 'h', 'l', 3, 'A', [{ op: 'heal', pct: 0.5 }, { op: 'revive', pct: 0.5, target: 'allDowned' }, cleanse({ all: true })], '쓰러진 아군을 모두 체력 50%로 되살리고, 아군 전체의 체력을 최대치의 50% 회복, 모든 디버프 제거. 소멸.', { x: 1, art: 'miracle' }),
    C('S26', '구원', 'h', 'e', 2, 'a', [IF({ is: 'targetHp', op: '<=', n: 0.3 }, [{ op: 'heal', pct: 0.6 }], [heal(10)])], '아군 1명의 체력 10 회복. 대상의 체력이 30% 이하면 대신 최대 체력의 60% 회복.', { art: 'heal', tags: '조건' }),
    C('S27', '신성 폭발', 'a', 'e', 2, 'E', [dmg(9), IF({ is: 'allAlive' }, [st('regen', 3, { target: 'allAllies' })])], '적 전체에 피해 {d0}. 편성한 아군이 모두 살아 있으면 아군 전체에 재생 3.', { art: 'sun', tags: '조건' }),
    C('S28', '축복의 일격', 'p', 'e', 1, 'A', [st('keen', 1)], '지속 아군 전체에 예리함 1(치명타 확률 +10%).', { art: 'star', el: 'holy', tags: '치명' }),
    C('S29', '여신의 강림', 'p', 'l', 3, 'A', [heal(20), st('regen', 4), st('strength', 1), power('turnStart', [heal(5, { target: 'lowestAlly' })])], '지속 아군 전체의 체력 20 회복, 재생 4, 힘 +1. 매 턴 시작 시 체력이 가장 낮은 아군 5 회복.', { art: 'goddess' }),
    C('S30', '행운의 기도', 'h', 'c', 1, 'a', [heal([3, 14])], '아군 1명의 체력 3~14 회복 (무작위).', { art: 'clover', tags: '무작위' }),
    C('S31', '변덕스러운 축복', 's', 'u', 1, 'a', [oneOf([opt('힘 +2', [st('strength', 2)]), opt('재생 4', [st('regen', 4)]), opt('보호막 10', [blk(10)]), opt('집중 2', [st('focus', 2)]), opt('예리함 2', [st('keen', 2)])])], '아군 1명에게 다음 중 하나를 무작위로: 힘 +2 / 재생 4 / 보호막 10 / 집중 2 / 예리함 2.', { art: 'dice', tags: '무작위·치명' }),
    C('S32', '기적의 주사위', 's', 'r', 1, 'A', [oneOf([opt('체력 12 회복', [heal(12)]), opt('보호막 10', [blk(10)]), opt('정화와 재생 3', [cleanse({ all: true }), st('regen', 3)])])], '아군 전체에 다음 중 하나를 무작위로: 체력 12 회복 / 보호막 10 / 모든 디버프 제거와 재생 3.', { art: 'dice', tags: '무작위' }),
    // 16단계 추가: 신성력과 운기조식을 섞은 치유
    C('S33', '운기요상', 'h', 'r', 1, 'A', [heal(5), st('regen', 2)], '아군 전체의 체력 5 회복, 재생 2.', { art: 'pray' }),

    // ---------------- 소연 ----------------
    C('N01', '독비도', 'a', 'c', 1, 'e', [dmg(4), st('poison', 3)], '피해 {d0}. 중독 3 부여.', { b: 1, art: 'needles', el: 'poison' }),
    C('N02', '암영보', 'b', 'c', 1, 'e', [blk(5, { target: 'self' }), st('weak', 1)], '보호막 5. 적 1명에게 약화 1.', { b: 1, art: 'smoke' }),
    C('N03', '약점 지목', 's', 'c', 1, 'a', [st('tempStr', 2), draw(1)], '아군 1명에게 이번 턴 힘 +2. 카드 1장을 뽑는다.', { b: 1, art: 'flag' }),
    C('N04', '쾌수', 's', 'c', 0, 'n', [IF({ is: 'handSize', op: '<=', n: 3 }, [draw(2)], [draw(1)])], '카드 1장을 뽑는다. 남은 손패가 3장 이하면 2장.', { b: 1, art: 'scroll', tags: '조건' }),
    C('N05', '쌍비도', 'a', 'c', 1, 'e', [dmg(3, { times: 2, onCrit: [st('poison', 3)] })], '피해 {d0}을 2회. 치명타가 날 때마다 중독 3.', { b: 1, art: 'needles', tags: '치명' }),
    C('N06', '미혼분', 's', 'c', 1, 'e', [st('weak', 2), IF({ is: 'targetIntentAttack' }, [st('vulnerable', 1)])], '약화 2 부여. 대상이 공격을 예고했다면 취약 1도 부여.', { b: 1, art: 'eye', tags: '조건' }),
    C('N07', '만독무', 's', 'c', 2, 'E', [st('poison', 3)], '적 전체에 중독 3.', { b: 1, art: 'flask' }),
    C('N08', '암기 장전', 's', 'c', 1, 'n', [energy(2, { nextTurn: true })], '다음 턴 에너지 +2.', { b: 1, art: 'scroll' }),
    C('N09', '음영비수', 'a', 'c', 1, 'e', [IF({ is: 'targetDebuffKinds', op: '>=', n: 1 }, [dmg(10)], [dmg(6)])], '피해 {d1}. 대상에게 디버프가 있으면 {d0}.', { art: 'dagger', tags: '조건' }),
    C('N10', '칠보단혼산', 's', 'u', 1, 'e', [IF({ is: 'targetHas', status: 'poison' }, [st('poison', 9)], [st('poison', 6)])], '중독 6 부여. 대상이 이미 중독 상태면 9.', { art: 'flask', tags: '조건' }),
    C('N11', '미혼진', 's', 'u', 1, 'E', [st('weak', 1), st('vulnerable', 1)], '적 전체에 약화 1, 취약 1.', { art: 'smoke' }),
    C('N12', '기문둔갑', 's', 'u', 1, 'n', [draw(3)], '카드 3장을 뽑는다.', { art: 'scroll' }),
    C('N13', '암습', 'a', 'u', 0, 'e', [IF({ is: 'firstCard' }, [dmg(10)], [dmg(4)]), draw(1)], '피해 {d1}. 이번 턴 첫 카드라면 {d0}. 카드 1장을 뽑는다.', { art: 'dagger', tags: '조건' }),
    C('N14', '격장술', 's', 'u', 1, 'A', [st('tempStr', 2)], '아군 전체에 이번 턴 힘 +2.', { art: 'flag' }),
    C('N15', '부골산', 'a', 'u', 1, 'e', [dmg(4), st('poison', 2), st('vulnerable', 1)], '피해 {d0}. 중독 2, 취약 1 부여.', { art: 'flask' }),
    C('N16', '연막진', 'b', 'u', 1, 'A', [IF({ is: 'energyLeft', op: '==', n: 0 }, [blk(7)], [blk(4)])], '아군 전체에 보호막 4. 이 카드로 에너지를 다 쓰면 7.', { art: 'smoke', tags: '조건' }),
    C('N17', '촉독술', 's', 'r', 1, 'e', [{ op: 'custom', name: 'doublePoison' }], '대상의 중독을 2배로.', { art: 'flask' }),
    C('N18', '독경 심법', 'p', 'r', 1, 'n', [power('turnStart', [draw(1)])], '지속 매 턴 카드를 1장 더 뽑는다.', { art: 'scroll' }),
    C('N19', '독살', 'a', 'r', 2, 'e', [dmg(per('targetStatus', 1, 8, { status: 'poison' }))], '피해 {d0}(8 + 대상의 중독 중첩).', { art: 'dagger', el: 'poison', tags: '조건' }),
    C('N20', '대환단', 's', 'r', 1, 'n', [energy(2), draw(1)], '에너지 +2. 카드 1장을 뽑는다. 소멸.', { x: 1, art: 'pill' }),
    C('N21', '산공독', 's', 'r', 2, 'E', [st('weak', 2), st('vulnerable', 2)], '적 전체에 약화 2, 취약 2.', { art: 'skull' }),
    C('N22', '만독진', 'p', 'e', 2, 'n', [power('turnEnd', [st('poison', 2, { target: 'allEnemies' })])], '지속 턴 종료 시 모든 적에게 중독 2.', { art: 'skull' }),
    C('N23', '총공세', 's', 'e', 2, 'A', [st('tempStr', 3), draw(2)], '아군 전체에 이번 턴 힘 +3. 카드 2장을 뽑는다.', { art: 'flag' }),
    C('N24', '분영술', 's', 'e', 2, 'n', [{ op: 'doubleNext' }], '이번 턴 다음에 쓰는 카드가 2번 발동한다.', { art: 'mask' }),
    C('N25', '천기누설', 'p', 'l', 2, 'n', [power('turnStart', [energy(1), draw(1), { op: 'freeRandom' }])], '지속 매 턴 시작 시 에너지 +1, 카드 1장을 뽑고, 손패의 무작위 1장이 그 턴에 비용 0이 된다.', { art: 'fate' }),
    C('N26', '혈도 난자', 'a', 'e', 1, 'e', [dmg(3, { times: 3, critBonus: 0.3, onCrit: [st('vulnerable', 1)] })], '피해 {d0}을 3회. 치명타 확률 +30%. 치명타가 날 때마다 취약 1.', { art: 'dagger', tags: '치명' }),
    C('N27', '절명독수', 'a', 'e', 2, 'e', [IF({ is: 'targetDebuffKinds', op: '>=', n: 3 }, [dmg(28)], [dmg(14)])], '피해 {d1}. 대상에게 디버프가 3종류 이상이면 {d0}.', { art: 'mask', tags: '조건' }),
    C('N28', '천리안법', 'p', 'e', 1, 's', [st('keen', 2), st('critUp', 1)], '지속 예리함 2(치명타 확률 +20%). 치명 강화 1(치명타 피해 +50%).', { art: 'eye', tags: '치명' }),
    C('N29', '비장의 암기', 's', 'l', 1, 'n', [oneOf([opt('에너지 +3', [energy(3)]), opt('카드 4장', [draw(4)]), opt('적 전체 중독 8', [st('poison', 8, { target: 'allEnemies' })]), opt('아군 전체 힘 +2', [st('strength', 2, { target: 'allAllies' })]), opt('모든 적 정지', [st('stun', 1, { target: 'allEnemies' })])])], '다음 중 하나가 무작위로 발동: 에너지 +3 / 카드 4장 / 적 전체 중독 8 / 아군 전체 힘 +2 / 모든 적이 다음 행동을 건너뜀.', { art: 'dice', tags: '무작위' }),
    C('N30', '눈속임', 's', 'c', 0, 'n', [chance([draw(2)], [draw(1)])], '동전을 던진다. 앞면이면 카드 2장, 뒷면이면 1장을 뽑는다.', { art: 'coin', tags: '무작위' }),
    C('N31', '독단지', 's', 'u', 1, 'e', [st('poison', [2, 10])], '중독 2~10 부여 (무작위).', { art: 'flask', tags: '무작위' }),
    C('N32', '모방술', 's', 'r', 1, 'n', [{ op: 'conjure', pool: { owner: 'heroes' }, count: 1 }], '모든 캐릭터의 카드 중 1장을 무작위로 만들어 손패에 넣는다. 이번 턴 비용 0. 턴이 끝나면 사라진다.', { art: 'mask', tags: '무작위' }),
    // 16단계 추가: 리라의 불꽃을 입힌 당가 암기
    C('N33', '독염침', 'a', 'u', 1, 'e', [dmg(4), st('poison', 3), st('burn', 2)], '피해 {d0}. 중독 3, 화상 2 부여.', { art: 'needles', el: 'poison' }),
    C('N34', '만독마진', 's', 'r', 2, 'E', [st('poison', 4), st('weak', 1)], '적 전체에 중독 4, 약화 1.', { art: 'flask' }),

    // ---------------- 공용 ----------------
    C('C01', '권각', 'a', 'c', 1, 'e', [dmg(6)], '피해 {d0}.', { b: 1, art: 'palm' }),
    C('C02', '호위', 'b', 'c', 1, 'a', [blk(5)], '아군 1명에게 보호막 5.', { b: 1, art: 'shield' }),
    C('C03', '지혈', 'h', 'c', 1, 'a', [IF({ is: 'targetHp', op: '<=', n: 0.5 }, [heal(8)], [heal(5)])], '아군 1명의 체력 5 회복. 대상의 체력이 절반 이하면 8.', { b: 1, art: 'heal', tags: '조건' }),
    C('C04', '탄지공', 'a', 'c', 0, 'e', [IF({ is: 'targetBlock', op: '>', n: 0 }, [dmg(3)], [dmg(5)])], '피해 {d1}. 대상에게 보호막이 있으면 {d0}.', { b: 1, art: 'stone', tags: '조건' }),
    C('C05', '전열 정비', 's', 'c', 1, 'n', [draw(2)], '카드 2장을 뽑는다.', { b: 1, art: 'scroll' }),
    C('C06', '휩쓸기', 'a', 'c', 1, 'E', [IF({ is: 'enemyCount', op: '>=', n: 3 }, [dmg(6)], [dmg(4)])], '적 전체에 피해 {d1}. 적이 3명 이상이면 {d0}.', { b: 1, art: 'spin', tags: '조건' }),
    C('C07', '마나 방벽', 'b', 'c', 0, 'a', [blk(3)], '아군 1명에게 보호막 3.', { b: 1, art: 'shield' }),
    C('C08', '화염 부적', 'a', 'c', 1, 'e', [dmg(4), st('burn', 2)], '피해 {d0}. 화상 2 부여.', { b: 1, art: 'talisman', el: 'fire' }),
    C('C09', '독침', 'a', 'c', 1, 'e', [dmg(3), st('poison', 3)], '피해 {d0}. 중독 3 부여.', { b: 1, art: 'needles', el: 'poison' }),
    C('C10', '사자후', 's', 'c', 1, 'A', [st('tempStr', 1)], '아군 전체에 이번 턴 힘 +1.', { b: 1, art: 'shout' }),
    C('C11', '수호 마법진', 'b', 'c', 2, 'A', [blk(4)], '아군 전체에 보호막 4.', { b: 1, art: 'wall' }),
    C('C12', '그물 던지기', 'a', 'c', 1, 'e', [dmg(3), IF({ is: 'targetIntentAttack' }, [st('weak', 2)], [st('weak', 1)])], '피해 {d0}. 약화 1 부여. 대상이 공격을 예고했다면 2.', { b: 1, art: 'net', tags: '조건' }),
    C('C13', '급습', 'a', 'c', 2, 'e', [IF({ is: 'firstCard' }, [dmg(16)], [dmg(12)])], '피해 {d1}. 이번 턴 첫 카드라면 {d0}.', { b: 1, art: 'dash', tags: '조건' }),
    C('C14', '운기조식', 's', 'c', 1, 'n', [draw(1), energy(1, { nextTurn: true })], '카드 1장을 뽑는다. 다음 턴 에너지 +1.', { b: 1, art: 'leaf' }),
    C('C15', '해독초', 'h', 'c', 1, 'a', [heal(3), cleanse()], '아군 1명의 체력 3 회복, 디버프 1개 제거.', { b: 1, art: 'leaf' }),
    C('C16', '벽력탄', 'a', 'u', 2, 'E', [dmg(8)], '적 전체에 피해 {d0}. 소멸.', { x: 1, art: 'bomb' }),
    C('C17', '회복 물약', 'h', 'u', 1, 'a', [heal(12)], '아군 1명의 체력 12 회복. 소멸.', { x: 1, art: 'potion' }),
    C('C18', '마나 물약', 's', 'u', 0, 'n', [energy(2)], '에너지 +2. 소멸.', { x: 1, art: 'potion', el: 'lightning' }),
    C('C19', '연막탄', 's', 'u', 1, 'E', [st('weak', 2)], '적 전체에 약화 2.', { art: 'smoke' }),
    C('C20', '합격진', 'a', 'u', 1, 'e', [dmg(4, { times: per('aliveAllies', 1) })], '살아 있는 아군 수만큼 피해 {d0}.', { art: 'twin', tags: '조건' }),
    C('C21', '전리품 사냥', 'a', 'r', 1, 'e', [dmg(8, { onKill: [{ op: 'gold', value: 15 }] })], '피해 {d0}. 이 카드로 처치하면 골드 +15.', { art: 'chest' }),
    C('C22', '결의', 'p', 'r', 1, 'A', [power('turnStart', [IF({ is: 'allAlive' }, [blk(4, { target: 'allAllies' })], [blk(2, { target: 'allAllies' })])])], '지속 턴 시작 시 아군 전체에 보호막 2. 편성한 아군이 모두 살아 있으면 4.', { art: 'flag', tags: '조건' }),
    C('C23', '전술 재편', 's', 'r', 0, 'n', [{ op: 'custom', name: 'redraw' }], '손패를 전부 버리고, 버린 수보다 1장 더 뽑는다.', { art: 'scroll' }),
    C('C24', '영웅의 깃발', 'p', 'l', 2, 'A', [st('strength', 2), power('turnStart', [blk(3, { target: 'allAllies' })])], '지속 아군 전체 힘 +2. 턴 시작 시 아군 전체에 보호막 3.', { art: 'flag', el: 'gold' }),
    C('C25', '시간의 모래시계', 's', 'l', 3, 'E', [st('stun', 1)], '모든 적에게 정지 1(보스 포함). 소멸.', { x: 1, art: 'clock' }),
    C('C26', '판도라의 상자', 's', 'l', 2, 'n', [{ op: 'conjure', pool: { owner: 'partyAndCommon', minRarity: 'rare' }, count: 3 }], '편성한 캐릭터와 공용의 희귀 이상 카드 3장을 무작위로 만들어 손패에 넣는다. 이번 턴 비용 0. 턴이 끝나면 사라진다. 소멸.', { x: 1, art: 'pandora', tags: '무작위' }),
    C('C27', '신병이기', 's', 'l', 2, 'A', [st('keen', 2), st('tempStr', 3)], '아군 전체에 예리함 2(치명타 확률 +20%), 이번 턴 힘 +3.', { art: 'armory', el: 'gold', tags: '치명' }),
    C('C28', '주사위 굴리기', 'a', 'c', 1, 'e', [dmg([1, 6], { times: 3 })], '피해 {d0}(무작위)을 3회.', { art: 'dice', tags: '무작위' }),
    C('C29', '동전 던지기', 's', 'c', 0, 'n', [chance([energy(1)], [draw(1)])], '동전을 던진다. 앞면이면 에너지 +1, 뒷면이면 카드 1장을 뽑는다.', { art: 'coin', tags: '무작위' }),
    C('C30', '수상한 물약', 's', 'u', 1, 'a', [oneOf([opt('체력 12 회복', [heal(12)]), opt('이번 턴 힘 +4', [st('tempStr', 4)]), opt('보호막 10', [blk(10)]), opt('중독 3', [st('poison', 3)])])], '아군 1명에게 다음 중 하나를 무작위로: 체력 12 회복 / 이번 턴 힘 +4 / 보호막 10 / 중독 3.', { art: 'potion', tags: '무작위' }),
    C('C31', '보물 상자', 's', 'u', 1, 'n', [{ op: 'gold', value: [5, 30] }], '골드 5~30 획득 (무작위). 소멸.', { x: 1, art: 'chest', tags: '무작위' }),
    C('C32', '혼돈의 소용돌이', 's', 'r', 1, 'n', [{ op: 'randomizeCosts', min: 0, max: 2 }, draw(1)], '이번 턴 손패 모든 카드의 비용이 0~2로 무작위로 바뀐다. 카드 1장을 뽑는다.', { art: 'chaos', tags: '무작위' }),
    // 16단계 추가: 두 세계를 잇는 틈
    C('C33', '세계의 틈', 's', 'e', 1, 'n', [energy(1), draw(2)], '에너지 +1. 카드 2장을 뽑는다. 소멸.', { x: 1, art: 'chaos' }),
    // ---------------- 20단계: 아키타입 핵심 카드 18장 (보존 · 선천성 · 버리기 · 미리 보기 · 소멸 연계) ----------------
    // 하린: 연격 · 치명
    C('K35', '발도술', 'a', 'u', 1, 'e', [IF({ is: 'attacksThisTurn', op: '>=', n: 2 }, [dmg(9, { forceCrit: true })], [dmg(9)])], '보존. 피해 {d1}. 이번 턴 이미 공격 카드를 2장 이상 썼다면 치명타 확정.', { retain: 1, art: 'katana', tags: '조건·치명' }),
    C('K36', '난영검무', 'p', 'r', 1, 's', [power('onAttackCard', [IF({ is: 'attacksMod', n: 3 }, [draw(1), energy(1)])])], '선천성. 지속 이번 턴 3·6·9번째 공격 카드를 쓸 때마다 카드 1장을 뽑고 에너지 +1.', { innate: 1, art: 'dance', tags: '조건' }),
    C('K37', '검기 해방', 'a', 'e', 2, 'e', [dmg(per('attacksBattle', 2, 6, { cap: 40 }))], '피해 {d0}: 6 + 이번 전투에서 쓴 공격 카드 1장당 2(최대 40). 소멸.', { x: 1, art: 'slashX', tags: '조건' }),
    // 브리아: 보호막 · 반격
    C('B34', '굳은 맹세', 'b', 'c', 1, 's', [blk(7)], '보존. 보호막 7.', { retain: 1, art: 'shield' }),
    C('B35', '불굴의 진형', 'p', 'r', 2, 's', [power('onBlockGain', [dmg(2, { target: 'allEnemies' })])], '지속 동료가 카드로 보호막을 얻을 때마다 적 전체에 피해 2.', { art: 'fortress', tags: '조건' }),
    C('B36', '방패 투척', 'a', 'e', 1, 'e', [dmg(per('selfBlock', 1.5)), { op: 'loseBlock', target: 'self' }], '자신의 보호막 × 1.5만큼 피해({d0}). 그 뒤 자신의 보호막을 모두 잃는다. 소멸.', { x: 1, art: 'shieldBash', tags: '조건' }),
    // 리라: 원소 · 마나
    C('L34', '원소 폭주', 'a', 'r', 2, 'e', [dmg(per('targetStatus', 2, 4, { status: 'burn' })), { op: 'clearStatus', status: 'burn' }], '피해 {d0} + 대상의 화상 1당 2. 그 뒤 대상의 화상을 없앤다.', { art: 'explosion', el: 'fire', tags: '조건' }),
    C('L35', '마력 순환', 's', 'u', 0, 'n', [{ op: 'discard', value: 1 }, draw(2)], '보존. 손패 1장을 버린다. 카드 2장을 뽑는다.', { retain: 1, art: 'orb' }),
    C('L36', '빙결 파쇄', 'a', 'e', 2, 'e', [IF({ is: 'targetHas', status: 'frozen' }, [dmg(26)], [dmg(9), st('chill', 2)])], '대상이 빙결 상태면 피해 {d0}. 아니면 피해 {d1}, 한기 2 부여.', { art: 'ice', el: 'ice', tags: '조건' }),
    // 세라: 회복 · 신성
    C('S34', '은총의 순환', 'p', 'r', 1, 's', [power('onHeal', [dmg(3, { target: 'randomEnemy' })])], '선천성. 지속 동료가 회복할 때마다 무작위 적에게 피해 3.', { innate: 1, art: 'sun', el: 'holy' }),
    C('S35', '성스러운 인내', 'b', 'u', 1, 'A', [blk(4)], '보존. 아군 전체에 보호막 4.', { retain: 1, art: 'wings' }),
    C('S36', '천벌', 'a', 'e', 2, 'e', [dmg(per('healedBattle', 0.5, 6, { cap: 45 }))], '피해 {d0}: 6 + 이번 전투에서 동료가 회복한 체력의 절반(최대 45). 소멸.', { x: 1, art: 'holySword', el: 'holy', tags: '조건' }),
    // 소연: 독 · 암기(버리기)
    C('N35', '그림자 비수', 'a', 'c', 1, 'e', [dmg(5)], '피해 {d0}. 버려지면 무작위 적에게 피해 7.', { art: 'dagger', onDiscard: [dmg(7, { target: 'randomEnemy' })] }),
    C('N36', '암기 비장', 's', 'u', 0, 'n', [{ op: 'discard', value: 2 }, draw(2)], '손패 2장을 버린다. 카드 2장을 뽑는다.', { art: 'cards' }),
    C('N37', '독기 폭발', 'a', 'r', 1, 'e', [{ op: 'loseHp', target: 'target', value: per('targetStatus', 1, 0, { status: 'poison' }) }], '대상이 중독 수치만큼 즉시 체력을 잃는다(보호막 무시). 중독은 그대로 남는다. 소멸.', { x: 1, art: 'poisonCloud', el: 'poison', tags: '조건' }),
    // 공용
    C('C34', '숨 고르기', 's', 'c', 1, 'n', [{ op: 'scry', value: 3 }, draw(1)], '미리 보기 3. 카드 1장을 뽑는다.', { art: 'eye' }),
    C('C35', '결단', 's', 'u', 0, 'n', [{ op: 'exhaust', value: 1 }, energy(2)], '손패 1장을 소멸시킨다. 에너지 +2. 소멸.', { x: 1, art: 'rage' }),
    C('C36', '분노의 칼날', 'p', 'r', 1, 'n', [power('onExhaust', [dmg(4, { target: 'randomEnemy' })])], '지속 카드가 소멸할 때마다 무작위 적에게 피해 4.', { art: 'axe' }),
    // ---------------- 21단계: 고유 자원 카드 5장 ----------------
    C('K38', '검세 해방', 'a', 'r', 1, 'e', [dmg(per('selfRes', 6, 0)), { op: 'spendRes' }], '피해 {d0}: 하린의 검세 1당 6. 검세를 모두 쓴다.', { art: 'slashX', tags: '조건' }),
    C('B37', '반격 준비', 'b', 'u', 1, 's', [blk(5), { op: 'res', value: 2 }], '보호막 5. 반격 자세 +2(방어 카드라 1 더 쌓인다).', { art: 'parry' }),
    C('L37', '공명 증폭', 's', 'u', 0, 'n', [{ op: 'res', value: 2 }, draw(1)], '원소 공명 +2(카드라 1 더 쌓인다). 카드 1장을 뽑는다.', { art: 'orb', el: 'arcane' }),
    C('S37', '신앙 고백', 'h', 'r', 1, 'A', [heal(4), { op: 'res', value: 1 }], '아군 전체의 체력 4 회복. 신앙 +1(회복한 동료마다 1 더 쌓인다).', { art: 'pray', el: 'holy' }),
    C('N38', '표식 폭발', 'a', 'r', 1, 'e', [dmg(per('targetStatus', 5, 0, { status: 'venomMark' })), { op: 'clearStatus', status: 'venomMark' }], '피해 {d0}: 대상의 독 표식 1당 5. 그 뒤 표식을 없앤다.', { art: 'needles', el: 'poison', tags: '조건' }),
    // ---------------- 29단계: 캐릭터마다 4장 · 공용 4장 ----------------
    C('K39', '유수검', 'a', 'c', 1, 'e', [dmg(4, { times: 2 })], '피해 {d0}을 2회.', { art: 'twin' }),
    C('K40', '검세 응축', 's', 'u', 1, 's', [{ op: 'res', value: 2 }, blk(4, { target: 'self' })], '검세 +2. 보호막 4.', { art: 'shout' }),
    C('K41', '일섬 연파', 'a', 'r', 2, 'E', [dmg(7), IF({ is: 'attacksThisTurn', op: '>=', n: 2 }, [dmg(7)])], '적 전체에 피해 {d0}. 이번 턴 이미 공격 카드를 2장 이상 썼다면 한 번 더 피해 {d1}.', { art: 'slashX', tags: '조건' }),
    C('K42', '파천일격', 'a', 'e', 3, 'e', [dmg(18, { forceCrit: true })], '피해 {d0}. 반드시 치명타.', { art: 'katana', tags: '치명' }),
    C('B38', '방패 올리기', 'b', 'c', 1, 's', [blk(5), draw(1)], '보호막 5. 카드 1장을 뽑는다.', { art: 'shield' }),
    C('B39', '역습', 'a', 'u', 1, 'e', [dmg(per('selfBlock', 0.5, 4))], '피해 {d0}: 4 + 자신의 보호막 절반.', { art: 'shieldBash', tags: '조건' }),
    C('B40', '수호 결계', 'b', 'r', 2, 'A', [blk(6), st('thorns', 2)], '아군 전체에 보호막 6, 가시 2.', { art: 'fortress' }),
    C('B41', '불멸의 맹세', 'p', 'e', 2, 's', [power('turnStart', [blk(6, { target: 'self' })])], '지속 매 턴 시작 시 보호막 6.', { art: 'wall' }),
    C('L38', '불씨', 'a', 'c', 0, 'e', [dmg(3), st('burn', 2)], '피해 {d0}. 화상 2 부여.', { art: 'fire', el: 'fire' }),
    C('L39', '서리 고리', 'a', 'u', 1, 'E', [dmg(4), st('chill', 1)], '적 전체에 피해 {d0}, 한기 1 부여.', { art: 'frostRing', el: 'ice' }),
    C('L40', '마나 폭주', 's', 'r', 1, 'n', [energy(2), draw(1)], '에너지 +2. 카드 1장을 뽑는다. 소멸.', { x: 1, art: 'orb', el: 'arcane' }),
    C('L41', '삼원소 붕괴', 'a', 'e', 3, 'E', [dmg(8), st('burn', 2), st('chill', 2)], '적 전체에 피해 {d0}, 화상 2, 한기 2 부여.', { art: 'explosion', el: 'arcane' }),
    C('S38', '작은 축복', 'h', 'c', 1, 'a', [heal(6), blk(3)], '아군 1명의 체력 6 회복, 보호막 3.', { art: 'pray', el: 'holy' }),
    C('S39', '정화의 빛', 'h', 'u', 1, 'A', [cleanse(), heal(3)], '아군 전체의 디버프 1개를 지우고 체력 3 회복.', { art: 'sun', el: 'holy' }),
    C('S40', '심판의 빛', 'a', 'r', 2, 'e', [dmg(10), st('weak', 2), st('vulnerable', 1)], '피해 {d0}. 약화 2, 취약 1 부여.', { art: 'lightArrow', el: 'holy' }),
    C('S41', '천사의 날개', 'p', 'e', 2, 's', [power('turnStart', [heal(3, { target: 'allAllies' })])], '지속 매 턴 시작 시 아군 전체의 체력 3 회복.', { art: 'wings', el: 'holy' }),
    C('N39', '독침 투척', 'a', 'c', 1, 'r', [dmg(3), st('poison', 3)], '무작위 적에게 피해 {d0}, 중독 3 부여.', { art: 'needles', el: 'poison' }),
    C('N40', '연막', 'b', 'u', 1, 'A', [blk(4), st('weak', 1, { target: 'allEnemies' })], '아군 전체에 보호막 4. 적 전체에 약화 1 부여.', { art: 'smoke' }),
    C('N41', '독무', 's', 'r', 2, 'E', [st('poison', 5)], '적 전체에 중독 5 부여.', { art: 'poisonCloud', el: 'poison' }),
    C('N42', '천독만화', 'a', 'e', 2, 'e', [dmg(per('targetStatus', 1, 6, { status: 'poison' })), st('poison', 4)], '피해 {d0}: 6 + 대상의 중독 1당 1. 그 뒤 중독 4 부여.', { art: 'dagger', el: 'poison', tags: '조건' }),
    C('C37', '정비', 'b', 'c', 1, 's', [blk(4), draw(1)], '보호막 4. 카드 1장을 뽑는다.', { art: 'shield' }),
    C('C38', '기습', 'a', 'u', 0, 'e', [dmg(6)], '피해 {d0}. 소멸.', { x: 1, art: 'dash' }),
    C('C39', '전열 재정비', 's', 'r', 1, 'n', [draw(3), { op: 'discard', value: 1 }], '카드 3장을 뽑는다. 손패 1장을 버린다.', { art: 'flag' }),
    C('C40', '합공', 'a', 'e', 2, 'E', [dmg(10), energy(1)], '적 전체에 피해 {d0}. 에너지 +1.', { art: 'axe' }),

    // ---------------- 30단계: 시엘(정령 궁수, 카드 번호 A) — 스킬로 조준을 쌓고 공격 카드로 쏜다 ----------------
    C('A01', '정령 화살', 'a', 'c', 1, 'e', [dmg(6)], '피해 {d0}.', { b: 1, art: 'bow' }),
    C('A02', '바람 장막', 's', 'c', 1, 's', [blk(5)], '보호막 5. 스킬이라 조준 +1.', { b: 1, art: 'wind' }),
    C('A03', '겨누기', 's', 'c', 1, 'n', [{ op: 'res', value: 1 }, draw(1)], '조준 +1(스킬이라 1 더 쌓인다). 카드 1장을 뽑는다.', { b: 1, art: 'eye' }),
    C('A04', '연사', 'a', 'c', 1, 'r', [dmg(3, { times: 3 })], '무작위 적에게 피해 {d0}을 3회.', { b: 1, art: 'arrows' }),
    C('A05', '숲의 숨결', 's', 'c', 0, 'n', [{ op: 'scry', value: 2 }], '미리 보기 2.', { b: 1, art: 'leaf' }),
    C('A06', '꿰뚫는 화살', 'a', 'c', 2, 'e', [dmg(9), st('vulnerable', 2)], '피해 {d0}. 취약 2 부여.', { b: 1, art: 'pierce' }),
    C('A07', '견제 사격', 'a', 'c', 1, 'e', [dmg(4), st('weak', 1)], '피해 {d0}. 약화 1 부여.', { b: 1, art: 'bow' }),
    C('A08', '사냥꾼의 발걸음', 'b', 'c', 1, 's', [blk(4), draw(1)], '보호막 4. 카드 1장을 뽑는다.', { b: 1, art: 'leaf' }),
    C('A09', '서리 화살', 'a', 'c', 1, 'e', [dmg(5), st('chill', 1)], '피해 {d0}. 한기 1 부여.', { art: 'ice', el: 'ice' }),

    C('A10', '정령 부르기', 's', 'u', 1, 'n', [{ op: 'res', value: 2 }], '조준 +2(스킬이라 1 더 쌓인다).', { art: 'spirit' }),
    C('A11', '화살비', 'a', 'u', 2, 'E', [dmg(5, { times: 2 })], '적 전체에 피해 {d0}을 2회.', { art: 'arrows' }),
    C('A12', '숨죽이기', 's', 'u', 1, 's', [blk(5), { op: 'res', value: 1 }], '보호막 5. 조준 +1(스킬이라 1 더 쌓인다).', { art: 'leaf' }),
    C('A13', '약점 간파', 's', 'u', 0, 'e', [st('vulnerable', 1), draw(1)], '취약 1 부여. 카드 1장을 뽑는다.', { art: 'eye' }),
    C('A14', '바람 화살', 'a', 'u', 1, 'e', [dmg(5), draw(1)], '피해 {d0}. 카드 1장을 뽑는다.', { art: 'wind' }),
    C('A15', '나무 위 은신처', 'b', 'u', 1, 'a', [blk(8)], '아군 1명에게 보호막 8.', { art: 'wall' }),
    C('A16', '삼연시', 'a', 'u', 1, 'e', [dmg(3, { times: 3 })], '피해 {d0}을 3회.', { art: 'arrows' }),
    C('A17', '순풍', 's', 'u', 1, 'n', [energy(1, { nextTurn: true }), { op: 'res', value: 1 }], '다음 턴 에너지 +1. 조준 +1(스킬이라 1 더 쌓인다).', { art: 'wind' }),

    C('A18', '정조준', 'a', 'r', 2, 'e', [dmg(per('selfRes', 3, 8))], '피해 {d0}: 8 + 조준 1당 3(조준 보너스는 따로 더해진다).', { art: 'pierce', tags: '조건' }),
    C('A19', '바람 읽기', 'p', 'r', 1, 'n', [power('turnStart', [{ op: 'scry', value: 2 }, draw(1)])], '지속 매 턴 시작 시 미리 보기 2, 카드 1장을 뽑는다.', { art: 'eye' }),
    C('A20', '사냥꾼의 일격', 'a', 'r', 1, 'e', [dmg(7, { onKill: [energy(1), draw(1)] })], '피해 {d0}. 이 공격으로 처치하면 에너지 +1, 카드 1장을 뽑는다.', { art: 'bow', tags: '조건' }),
    C('A21', '서리 화살비', 'a', 'r', 2, 'E', [dmg(4), st('chill', 2)], '적 전체에 피해 {d0}, 한기 2 부여.', { art: 'ice', el: 'ice' }),
    C('A22', '바람 걸음', 's', 'r', 1, 'n', [{ op: 'discard', value: 1 }, draw(2), { op: 'res', value: 1 }], '손패 1장을 버린다. 카드 2장을 뽑는다. 조준 +1(스킬이라 1 더 쌓인다).', { art: 'wind' }),
    C('A23', '표적 지정', 's', 'r', 1, 'e', [st('vulnerable', 2), st('weak', 1), { op: 'res', value: 1 }], '취약 2, 약화 1 부여. 조준 +1(스킬이라 1 더 쌓인다).', { art: 'eye' }),

    C('A24', '천공의 화살', 'a', 'e', 3, 'e', [dmg(20, { critBonus: 0.3 })], '피해 {d0}. 치명타 확률 +30%.', { art: 'lightArrow', tags: '치명' }),
    C('A25', '정령 폭풍', 'a', 'e', 2, 'E', [dmg(per('selfRes', 2, 6))], '적 전체에 피해 {d0}: 6 + 조준 1당 2.', { art: 'spirit', tags: '조건' }),
    C('A26', '바람의 궁술', 'p', 'e', 1, 'n', [power('onSkillCard', [dmg(3, { target: 'randomEnemy' })])], '지속 스킬·지속 카드를 쓸 때마다 무작위 적에게 피해 3.', { art: 'bow' }),
    C('A27', '화살 폭풍', 'a', 'e', 2, 'r', [dmg(3, { times: 6 })], '무작위 적에게 피해 {d0}을 6회.', { art: 'arrows' }),
    C('A28', '바람의 장벽', 'b', 'e', 2, 'A', [blk(8), { op: 'res', value: 2 }], '아군 전체에 보호막 8. 조준 +2.', { art: 'wind' }),

    C('A29', '정령왕의 화살', 'a', 'l', 3, 'e', [dmg(per('selfRes', 6, 12))], '피해 {d0}: 12 + 조준 1당 6(조준 보너스는 따로 더해진다).', { art: 'lightArrow', tags: '조건' }),
    C('A30', '정령왕의 계약', 'p', 'l', 2, 'n', [power('turnStart', [{ op: 'res', value: 2 }, draw(1)])], '지속 매 턴 시작 시 조준 +2, 카드 1장을 뽑는다.', { art: 'spirit' })
  ];

  // 방해 카드 (보유·도감에 포함하지 않음)
  list.push({ id: 'SAND', name: '모래', owner: 'none', type: 'curse', rarity: 'common', cost: null,
    target: 'none', effects: [], text: '사용할 수 없다. 전투가 끝나면 사라진다.', unplayable: true, art: 'sand', el: 'earth', tags: '' });

  // 희귀 이상 카드의 사용 순간 고유 이펙트 (js/effects.js 의 FX.SFX). 성격이 같은 카드끼리 공유한다
  var SFX = {
    K17: 'slashX', K18: 'storm', K19: 'rage', K20: 'thousand', K21: 'curse', K22: 'slashX', K23: 'aura', K24: 'thousand',
    K25: 'dragon', K26: 'slashX', K27: 'thousand', K28: 'rage', K29: 'storm', K32: 'coin',
    B17: 'shield', B18: 'aura', B19: 'quake', B20: 'shield', B21: 'shield', B22: 'shield', B23: 'aura', B24: 'quake',
    B25: 'wings', B26: 'shield', B27: 'slashX', B28: 'rage', B29: 'shield', B32: 'dice',
    L17: 'blizzard', L18: 'explosion', L19: 'aura', L20: 'ice', L21: 'aura', L22: 'meteor', L23: 'blizzard', L24: 'aura',
    L25: 'explosion', L26: 'ice', L27: 'aura', L28: 'aura', L29: 'chaos', L32: 'cards',
    S17: 'revive', S18: 'pillar', S19: 'heal', S20: 'shield', S21: 'heal', S22: 'heal', S23: 'pillar', S24: 'wings',
    S25: 'miracle', S26: 'heal', S27: 'pillar', S28: 'aura', S29: 'wings', S32: 'dice',
    N17: 'poisonCloud', N18: 'cards', N19: 'shadow', N20: 'clock', N21: 'curse', N22: 'poisonCloud', N23: 'flag', N24: 'shadow',
    N25: 'cards', N26: 'thousand', N27: 'shadow', N28: 'aura', N29: 'dice', N32: 'cards',
    C21: 'coin', C22: 'shield', C23: 'cards', C24: 'flag', C25: 'clock', C26: 'cards', C27: 'flag', C32: 'chaos',
    K34: 'slashX', B33: 'shield', S33: 'heal', N34: 'poisonCloud', C33: 'chaos',
    K36: 'aura', K37: 'slashX', B35: 'shield', B36: 'quake', L34: 'explosion', L36: 'ice', S34: 'pillar', S36: 'pillar', N37: 'poisonCloud', C36: 'rage', K38: 'slashX', S37: 'heal', N38: 'poisonCloud',
    K41: 'storm', K42: 'slashX', B40: 'shield', B41: 'shield', L40: 'aura', L41: 'explosion', S40: 'pillar', S41: 'wings', N41: 'poisonCloud', N42: 'thousand', C39: 'flag', C40: 'thousand',
    A18: 'storm', A19: 'aura', A20: 'thousand', A21: 'blizzard', A22: 'aura', A23: 'curse', A24: 'slashX', A25: 'storm', A26: 'aura', A27: 'thousand', A28: 'shield', A29: 'pillar', A30: 'aura'
  };
  list.forEach(function (c) { if (SFX[c.id]) c.sfx = SFX[c.id]; });

  // 전설 카드의 컷인 대사(16단계). 영웅 카드와 대사가 없는 카드는 사용한 캐릭터의 cutin 대사 중 하나
  var LINE = {
    K25: '천외검결 최종식 — 참룡!', K29: '하늘 밖의 검이여, 춤춰라!',
    B25: '이 방패가 부서지기 전엔 아무도 쓰러지지 않는다.', B29: '천 년을 버틴 벽이다. 넘어 봐라.',
    L25: '원소 전부, 한꺼번에 간다!', L29: '혼돈의 대마법… 나도 결과는 몰라!',
    S25: '기적은 기도하는 자에게 와요!', S29: '여신이시여, 이곳에 내려오소서!',
    N25: '하늘의 비밀, 조금만 빌릴게.', N29: '마지막 한 수는 늘 숨겨 두는 법이지.',
    A29: '모든 정령이여, 이 한 발에!', A30: '숲의 왕이여, 나와 계약해 줘.',
    C24: '모두 함께라면 두렵지 않아!', C25: '시간아, 멈춰라!', C26: '무엇이 나올지는 나도 몰라!', C27: '천하의 신병이기여, 모두의 손에!'
  };
  list.forEach(function (c) { if (LINE[c.id]) c.line = LINE[c.id]; });

  // 15단계: 카드 계열 — 무공(martial) · 마법(magic) · 융합(fusion, 무공 + 마법) · 무계열(neutral)
  // 여기 적지 않은 카드는 주인 캐릭터의 기본 계열(data/characters.js 의 school)을 따른다. 공용 카드는 모두 적는다
  var SCHOOL = {
    fusion: 'C08 C24 C27 C33 K18 K22 K24 K25 K28 K29 K33 K34 N25 N32 N33 N34 B33 L33 S33',
    magic: 'C07 C11 C17 C18 C25 C26 C30 C32',
    neutral: 'C05 C12 C15 C21 C23 C28 C29 C31 C34 C37 C39',
    martial: 'C01 C02 C03 C04 C06 C09 C10 C13 C14 C16 C19 C20 C22 C35 C36 C38 C40'
  };
  Object.keys(SCHOOL).forEach(function (k) { SCHOOL[k].split(' ').forEach(function (id) { SCHOOL[id] = k; }); });
  list.forEach(function (c) {
    var owner = (Game.Data.characters || []).filter(function (x) { return x.id === c.owner; })[0];
    c.school = SCHOOL[c.id] || (owner && owner.school) || 'neutral';
  });

  Game.Data.cards = list;
  Game.Data.cardById = Game.util.byId(list);
})();
