// keywords.js — 상태이상·키워드 정의와 툴팁 문구
// kind: buff / debuff / special.  {n} 은 현재 수치로 바뀐다.
// decay: 'round'(라운드 끝 1 감소) · 'turnStart'(주인의 턴 시작 시 1 감소) · 'turnStartClear'(주인의 턴 시작 시 제거)
//        'turnEndClear'(주인의 턴 끝에 제거) · 없음(전투 끝까지 유지)
Game.Data.statuses = {
  strength:  { name: '힘', kind: 'buff', icon: 'strength', desc: '공격 1회당 피해 +{n}.' },
  tempStr:   { name: '힘(이번 턴)', kind: 'buff', icon: 'strength', decay: 'turnEndClear', desc: '이번 턴 동안 공격 1회당 피해 +{n}.' },
  focus:     { name: '집중', kind: 'buff', icon: 'focus', desc: '다음 공격 {n}회가 반드시 치명타.' },
  keen:      { name: '예리함', kind: 'buff', icon: 'keen', desc: '치명타 확률 +{p}%.', pct: 10 },
  critUp:    { name: '치명 강화', kind: 'buff', icon: 'critUp', desc: '치명타 피해 배율 +{h}배.', half: true },
  regen:     { name: '재생', kind: 'buff', icon: 'regen', desc: '턴 시작 시 체력 {n} 회복 후 1 감소.' },
  thorns:    { name: '가시', kind: 'buff', icon: 'thorns', desc: '공격받을 때마다 공격자에게 {n} 피해.' },
  thornsTemp:{ name: '가시(일시)', kind: 'buff', icon: 'thorns', decay: 'turnStartClear', desc: '다음 턴 시작 전까지 공격받을 때마다 공격자에게 {n} 피해.' },
  taunt:     { name: '도발', kind: 'buff', icon: 'taunt', decay: 'turnStart', desc: '적의 단일 공격이 이 캐릭터를 향한다. {n}턴 남음.' },
  guardian:  { name: '수호', kind: 'buff', icon: 'taunt', desc: '적의 단일 공격이 항상 이 캐릭터를 향한다.' },
  reduce:    { name: '경감', kind: 'buff', icon: 'reduce', desc: '공격 1회당 받는 피해 -{n}.' },
  hold:      { name: '버티기', kind: 'buff', icon: 'hold', desc: '다음 턴 시작 시 보호막이 사라지지 않는다.' },
  fortress:  { name: '난공불락', kind: 'buff', icon: 'hold', desc: '턴 시작 시 보호막이 사라지지 않는다.' },
  affinity:  { name: '원소 친화', kind: 'buff', icon: 'affinity', desc: '부여하는 화상과 한기 +{n}.' },
  lavaArmor: { name: '용암 갑옷', kind: 'buff', icon: 'burn', decay: 'turnStartClear', desc: '다음 턴까지 공격받을 때마다 공격자에게 화상 {n}.' },
  charge:    { name: '차지', kind: 'special', icon: 'charge', desc: '강력한 공격을 준비 중. 보호막이 모두 깨지면 취소된다.' },
  doom:      { name: '종말', kind: 'special', icon: 'doom', desc: '{n}턴 뒤 종말이 찾아온다.' },
  // 20단계: 적의 고유 규칙(줄지 않는다)
  riposte:   { name: '반격 태세', kind: 'special', icon: 'thorns', desc: '한 턴에 공격 카드를 3장 쓸 때마다(3·6·9번째) 그 카드를 쓴 동료에게 {n} 피해.' },
  spellward: { name: '주문 결계', kind: 'special', icon: 'block', desc: '스킬·지속 카드를 쓸 때마다 보호막 {n}을 얻는다.' },
  sandglass: { name: '시간의 모래', kind: 'special', icon: 'r_hourglass', desc: '한 턴에 카드를 {n}장 쓰면 그 턴이 바로 끝나고 힘 +1.' },
  frostAura: { name: '서리 기운', kind: 'special', icon: 'chill', desc: '내 턴 시작 시 손패 무작위 {n}장의 이번 턴 비용 +1.' },
  scorch:    { name: '불타는 비늘', kind: 'special', icon: 'burn', desc: '공격 카드에 맞을 때마다 공격한 동료에게 화상 {n}.' },
  vengeance: { name: '복수', kind: 'special', icon: 'strength', desc: '다른 적이 쓰러질 때마다 힘 +{n}.' },
  // 34단계: 적 기믹
  dodge:     { name: '회피', kind: 'buff', icon: 'r_feather', desc: '공격 {n}회를 통째로 피한다(1회마다 1 감소). 여러 번 때리는 공격에 약하다.' },
  shelter:   { name: '엄호', kind: 'special', icon: 'r_crest', desc: '같은 편이 하나라도 더 살아 있으면 받는 공격 피해가 절반이 된다.' },
  freezeImmune: { name: '빙결 면역', kind: 'special', icon: 'freezeImmune', decay: 'round', desc: '한기가 쌓이지 않는다. {n}라운드 남음.' },

  ink:       { name: '획', kind: 'debuff', icon: 'scroll', desc: '하린의 붓이 남긴 먹 자국. 하린의 공격은 획 1당 피해 +1(최대 5). 낙관 카드가 획을 터뜨린다. (최대 9)' },
  venomMark: { name: '독 표식', kind: 'debuff', icon: 'poison', desc: '중독 피해를 받을 때 {n}만큼 더 받는다(소연, 최대 5).' },
  poison:    { name: '중독', kind: 'debuff', icon: 'poison', desc: '턴 종료 시 {n} 피해(보호막 무시) 후 1 감소.' },
  burn:      { name: '화상', kind: 'debuff', icon: 'burn', desc: '턴 종료 시 {n} 피해(보호막에 막힘) 후 절반으로 감소.' },
  weak:      { name: '약화', kind: 'debuff', icon: 'weak', decay: 'round', desc: '주는 공격 피해 -25%. {n}턴 남음.' },
  vulnerable:{ name: '취약', kind: 'debuff', icon: 'vulnerable', decay: 'round', desc: '받는 공격 피해 +50%. {n}턴 남음.' },
  chill:     { name: '한기', kind: 'debuff', icon: 'chill', desc: '3 중첩되면 사라지며 빙결된다. 화상인 적에게 걸면 증기 폭발. ({n}/3)' },
  frozen:    { name: '빙결', kind: 'debuff', icon: 'frozen', desc: '적: 다음 행동을 건너뛴다. 아군: 이번 턴 이 캐릭터의 카드를 쓸 수 없다.' },
  stun:      { name: '정지', kind: 'debuff', icon: 'stun', desc: '다음 행동을 건너뛴다.' }
};

// 카드 설명에서 굵게 표시하고 툴팁을 띄우는 키워드
Game.Data.keywords = {
  '보호막': '받는 피해를 대신 흡수한다. 자신의 다음 턴 시작 시 사라진다.',
  '소멸': '사용하면 이번 전투에서 제거된다.',
  '지속': '사용하면 전투가 끝날 때까지 효과가 유지되고 덱으로 돌아가지 않는다.',
  '치명타': '피해 2배. 캐릭터마다 확률이 다르고, 공용 카드는 5%.',
  '모래': '사용할 수 없는 방해 카드. 손패 자리만 차지하고 전투가 끝나면 사라진다.',
  // 20단계
  '보존': '턴이 끝나도 버려지지 않고 손패에 남는다.',
  '선천성': '전투를 시작할 때 첫 손패에 반드시 들어온다.',
  '버린다': '손패에서 골라 버린 더미로 보낸다. 버려지면 효과가 나는 카드도 있다.',
  '버려지면': '다른 카드의 효과로 손패에서 버려질 때 이 효과가 난다(턴 종료로 버려질 때는 아니다).',
  '미리 보기': '뽑을 덱 맨 위 카드를 보고, 그중 원하는 만큼 버린 더미로 보낸다.',
  // 34단계: 적이 섞어 넣는 저주 카드와 적의 기믹
  '독기': '적이 섞어 넣는 저주 카드. 쓸 수 없고, 손패에 든 채로 턴이 끝나면 무작위 아군 중독 2. 전투가 끝나면 사라진다.',
  '혈흔': '적이 섞어 넣는 저주 카드. 쓸 수 없고, 손패에 든 채로 턴이 끝나면 무작위 아군이 체력 3을 잃는다. 전투가 끝나면 사라진다.',
  '속박': '적이 섞어 넣는 저주 카드. 에너지 1로 써서 없앨 수 있다(소멸). 전투가 끝나면 사라진다.',
  '분열': '체력이 절반 아래로 내려가면 남은 체력을 나눠 가진 작은 몬스터 둘로 갈라진다.',
  '자폭': '예고한 턴이 되면 터지며 아군 전체에 피해를 주고 사라진다. 그 전에 쓰러뜨리면 터지지 않는다.',
  // 39단계: 카드 개편 — 동료마다 쌓고(준비) 터뜨리는(마무리) 고리
  '획': '하린의 붓이 남긴 먹 자국(적, 최대 9). 하린의 공격은 획 1당 피해 +1(최대 5). 낙관 카드가 획을 터뜨린다.',
  '낙관': '하린의 마무리 — 대상의 획에 비례해 크게 베고 획을 모두 지운다. 획을 쌓아 둘지(공격 +1) 터뜨릴지 고른다.',
  '증기 폭발': '화상인 적에게 한기를 걸면 터진다 — 화상 × 2 피해(보호막에 막힘), 화상은 절반으로. 리라가 불로 준비하고 얼음으로 터뜨린다.'
};
// 39단계: 카드 규칙 수치 — 획 최대 · 획 공격 보너스 최대 · 증기 폭발 배율
Game.Data.cardRules = { inkMax: 9, inkBonusCap: 5, steamMult: 2 };
['strength', 'focus', 'keen', 'critUp', 'regen', 'thorns', 'taunt', 'poison', 'burn', 'weak',
 'vulnerable', 'chill', 'frozen', 'stun'].forEach(function (k) {
  var s = Game.Data.statuses[k];
  Game.Data.keywords[s.name] = s.desc.replace(/\{n\}턴 남음\.|\(\{n\}\/3\)|\{n\}회|\{n\}/g, function (m) {
    return m === '{n}' ? 'N' : m === '{n}회' ? 'N회' : m.indexOf('/3') > 0 ? '' : 'N턴 지속.';
  }).replace('{p}', '10/중첩').replace('{h}', '0.5/중첩').trim();
});
