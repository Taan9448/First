// bonds.js — 연계·짝 연계·합동기·친밀도·야영지 대화 (GAME_DESIGN.md 19.6~19.7절, 9단계)
// 짝 이름은 캐릭터 순서(kai, bram, lyra, sera, nox)대로 'kai+lyra' 처럼 적는다.
(function () {
  var dmg = function (v, o) { return Object.assign({ op: 'damage', value: v }, o); };
  var blk = function (v, o) { return Object.assign({ op: 'block', value: v }, o); };
  var heal = function (v, o) { return Object.assign({ op: 'heal', value: v }, o); };
  var st = function (s, v, o) { return Object.assign({ op: 'status', status: s, value: v }, o); };

  // 친밀도 단계 문턱: 1단계 10(대화 1) · 2단계 25(대화 2, 짝 연계 1.5배) · 3단계 45(대화 3, 합동기)
  Game.Data.bondLevels = [10, 25, 45];
  Game.Data.bondGain = { battle: 1, talk: 3 };

  // 연계: 한 턴에 직전 캐릭터 카드와 다른 캐릭터의 카드를 쓰면 연계 수 +1.
  // 연계 2부터 공격 카드 피해 +(연계 수 - 1), 최대 +4. 공용 카드·합동기는 연계를 끊지도 올리지도 않는다
  Game.Data.combo = { maxBonus: 4 };

  // 짝 연계: from 의 카드 바로 다음에 to 의 카드를 쓰면 턴당 한 번 발동.
  // dmgAdd(그 카드의 공격 1회당 피해) · blockAdd · healAdd(그 카드의 보호막·회복) · statusAdd(그 카드가 적에게 거는 상태)
  // forceCrit(그 카드의 첫 공격 치명타) · after(그 카드를 쓴 뒤 효과, 대상은 그 카드를 따름. prevCaster = 앞 카드의 주인)
  // attackOnly: 그 카드가 공격일 때만 발동. 친밀도 2단계에서 수치 1.5배(올림)
  Game.Data.pairCombos = [
    { from: 'kai', to: 'lyra', name: '검기 마법', desc: '리라의 공격 카드가 대상(전체 공격이면 각자)에게 추가 피해 4', attackOnly: true, after: [dmg(4)] },
    { from: 'bram', to: 'kai', name: '방패 뒤의 일격', desc: '카이의 그 카드 피해 +4', dmgAdd: 4 },
    { from: 'sera', to: 'bram', name: '축복받은 방패', desc: '브리아의 그 카드 보호막 +4', blockAdd: 4 },
    { from: 'nox', to: 'kai', name: '급소 지시', desc: '카이의 그 카드 첫 공격이 반드시 치명타', forceCrit: true },
    { from: 'lyra', to: 'nox', name: '독기 증폭', desc: '녹스의 그 카드가 거는 중독 +3', statusAdd: { poison: 3 } },
    { from: 'kai', to: 'sera', name: '전장의 기도', desc: '세라의 그 카드 회복 +4', healAdd: 4 },
    { from: 'bram', to: 'lyra', name: '엄호 영창', desc: '리라의 그 카드 피해 +3, 브리아 보호막 3', dmgAdd: 3, after: [blk(3, { target: 'prevCaster' })] },
    { from: 'sera', to: 'nox', name: '그림자 축복', desc: '녹스의 그 카드를 쓰고 카드 1장 뽑기', after: [{ op: 'draw', value: 1 }] },
    { from: 'nox', to: 'bram', name: '함정 유도', desc: '브리아의 그 카드를 쓰고 모든 적 약화 1', after: [st('weak', 1, { target: 'allEnemies' })] },
    { from: 'lyra', to: 'sera', name: '원소 치유', desc: '세라의 그 카드를 쓰고 아군 전체 보호막 4', after: [blk(4, { target: 'allAllies' })] }
  ];

  // 합동기: 짝마다 1장. 친밀도 3단계에서 해금되고, 두 사람이 함께 편성되면 전투 덱에 1장 들어간다(덱 칸을 차지하지 않음).
  // 두 사람 중 누구라도 쓰러지거나 빙결되면 쓸 수 없다. caster 는 힘·약화·치명타를 따지는 캐릭터
  function duo(id, a, b, caster, name, type, cost, target, effects, text, art, el, sfx) {
    return { id: id, name: name, owner: 'duo', duo: [a, b], caster: caster, type: type, rarity: 'epic', cost: cost, target: target,
      effects: effects, text: text, basic: false, exhaust: false, art: art, el: el || null, tags: '', sfx: sfx };
  }
  Game.Data.duoCards = [
    duo('D01', 'kai', 'bram', 'bram', '철벽 돌격', 'attack', 2, 'enemy',
      [dmg({ base: 0, per: 'selfBlock', mult: 1 }), blk(5, { target: 'allAllies' })], '브리아의 보호막만큼 피해({d0}). 아군 전체 보호막 5.', 'shieldBash', 'steel', 'shield'),
    duo('D02', 'kai', 'lyra', 'kai', '마검 일섬', 'attack', 2, 'allEnemies',
      [dmg(10), st('burn', 3)], '적 전체에 피해 {d0}, 화상 3.', 'katana', 'fire', 'slashX'),
    duo('D03', 'kai', 'sera', 'kai', '성검', 'attack', 2, 'enemy',
      [dmg(18), heal(10, { target: 'lowestAlly' })], '피해 {d0}. 체력이 가장 낮은 아군 10 회복.', 'holySword', 'holy', 'pillar'),
    duo('D04', 'kai', 'nox', 'nox', '그림자 연격', 'attack', 2, 'enemy',
      [dmg(4, { times: 5, critBonus: 0.3 })], '피해 {d0}을 5회. 치명타 확률 +30%.', 'twin', 'shadow', 'thousand'),
    duo('D05', 'bram', 'lyra', 'bram', '얼음 성벽', 'block', 2, 'allAllies',
      [blk(10), st('chill', 2, { target: 'allEnemies' })], '아군 전체 보호막 10. 적 전체 한기 2.', 'wall', 'ice', 'blizzard'),
    duo('D06', 'bram', 'sera', 'sera', '성역의 맹세', 'block', 2, 'allAllies',
      [blk(8), st('regen', 3)], '아군 전체 보호막 8, 재생 3.', 'wings', 'holy', 'shield'),
    duo('D07', 'bram', 'nox', 'bram', '철벽 함정', 'skill', 1, 'self',
      [st('taunt', 2), st('thornsTemp', 5), st('weak', 2, { target: 'allEnemies' })], '브리아 도발 2, 다음 턴까지 가시 5. 적 전체 약화 2.', 'thorns', 'guard', 'curse'),
    duo('D08', 'lyra', 'sera', 'lyra', '정화의 불꽃', 'attack', 2, 'allEnemies',
      [dmg(8), { op: 'cleanse', all: true, target: 'allAllies' }], '적 전체에 피해 {d0}. 아군 전체의 디버프를 모두 제거.', 'flameWave', 'holy', 'pillar'),
    duo('D09', 'lyra', 'nox', 'nox', '맹독 폭발', 'skill', 2, 'allEnemies',
      [st('poison', 6), st('burn', 4)], '적 전체에 중독 6, 화상 4.', 'flask', 'poison', 'poisonCloud'),
    duo('D10', 'sera', 'nox', 'sera', '그림자 기도', 'skill', 1, 'none',
      [{ op: 'draw', value: 3 }, { op: 'energy', value: 1 }, heal(3, { target: 'allAllies' })], '카드 3장을 뽑고 에너지 +1. 아군 전체 체력 3 회복.', 'pray', 'shadow', 'wings')
  ];

  // 야영지 대화: 짝마다 3편. [말하는 캐릭터, 대사]
  // 성격: 카이(직진·책임감) 브리아(과묵·다정) 리라(호기심·수다) 세라(걱정 많음·단호함) 녹스(냉소·속은 따뜻함)
  Game.Data.dialogues = {
    'kai+bram': [
      [['kai', '브리아, 아까 그 덩굴이 날 감았을 때… 고마웠어.'], ['bram', '…방패가 할 일이다.'], ['kai', '방패라도 고맙다는 말은 들어야지.'], ['bram', '…그럼, 받겠다.']],
      [['bram', '카이. 넌 늘 맨 앞으로 뛰어든다.'], ['kai', '기사단에서 그렇게 배웠어. 대장이 먼저 길을 연다고.'], ['bram', '이제는 네 앞에 내가 있다.'], ['kai', '…하하, 든든하네. 대장 자리 뺏기는 거 아냐?'], ['bram', '자리는 필요 없다. 네 등만 지키면 된다.']],
      [['kai', '고향을 되찾으면, 넌 숲으로 돌아갈 거야?'], ['bram', '고목은 이제 혼자서도 선다.'], ['bram', '…네가 부르면, 언제든 온다.'], ['kai', '약속이다. 그때는 방패 말고 친구로 와.']]
    ],
    'kai+lyra': [
      [['lyra', '카이! 그 칼, 어떤 금속이야? 마력이 하나도 안 통하던데!'], ['kai', '그냥… 기사단 대장장이가 만든 검이야.'], ['lyra', '그냥이라니! 한 번만 녹여 봐도 돼?'], ['kai', '절대 안 돼.']],
      [['kai', '리라, 아까 화염구가 내 머리카락을 스쳤어.'], ['lyra', '스치기만 했잖아! 그 정도면 명중률 아주 좋은 편이야.'], ['kai', '…내 머리카락이 원래 이렇게 짧았던 건 아니야.'], ['lyra', '앗. 그, 그건 다음에 보상할게. 진짜로.']],
      [['lyra', '있지, 너랑 싸우면 계산이 잘 맞아. 네가 길을 열면 내가 터뜨리고.'], ['kai', '나도 그래. 뒤에서 불꽃이 날아오면 안심이 돼.'], ['lyra', '…안심? 내 불꽃에서?'], ['kai', '이제는 피하는 법도 익혔으니까.'], ['lyra', '흥, 칭찬으로 들을게!']]
    ],
    'kai+sera': [
      [['sera', '카이, 팔 좀 보여 줘요. 또 숨겼죠?'], ['kai', '긁힌 거야. 별거 아니야.'], ['sera', '별거인지 아닌지는 제가 정해요. 앉으세요.'], ['kai', '…네.']],
      [['kai', '세라는 왜 우리를 따라왔어? 수도원이 더 안전할 텐데.'], ['sera', '안전한 곳에서 기도만 하면, 다치는 사람을 못 지켜요.'], ['sera', '저는 이제 아무도 잃고 싶지 않아요.'], ['kai', '…나도야. 같이 지키자.']],
      [['sera', '오늘 밤은 별이 많네요. 고향 하늘도 이랬어요?'], ['kai', '응. 성벽 위에서 보면 손에 잡힐 것 같았어.'], ['sera', '그럼 되찾으면, 성벽 위에서 같이 봐요.'], ['kai', '약속할게. 그땐 다친 데 없이.'], ['sera', '그건 제가 지켜 드릴게요.']]
    ],
    'kai+nox': [
      [['nox', '기사단 마지막 생존자라. 마왕군 문서에선 그렇게 불렀지.'], ['kai', '…넌 그 문서를 쓰던 쪽이었고.'], ['nox', '맞아. 그래서 네 약점도 다 알아. 왼쪽이 늘 비어.'], ['kai', '…고맙다고 해야 하나.'], ['nox', '살아 있으면 해.']],
      [['kai', '녹스, 왜 마왕군을 떠났어?'], ['nox', '이유 같은 거 없어. 이길 쪽으로 옮긴 거지.'], ['kai', '감옥에 갇혀 있던 쪽이 이길 쪽이었어?'], ['nox', '…말꼬리 잡는 거 하나는 대장감이네.']],
      [['nox', '내일 길은 내가 앞장선다. 성의 뒷문을 알아.'], ['kai', '위험하잖아.'], ['nox', '너희가 다치는 게 더 귀찮아.'], ['kai', '…그 말, 걱정한다는 뜻이지?'], ['nox', '자라. 대장.']]
    ],
    'bram+lyra': [
      [['lyra', '브리아, 그 방패에 마법진 새겨도 돼? 불꽃이 반사되게!'], ['bram', '…안 된다.'], ['lyra', '조그맣게! 아주 조그맣게!'], ['bram', '…모서리에만.']],
      [['bram', '리라. 아까 무서웠나.'], ['lyra', '무, 무섭긴! 그냥 마력이 좀 떨렸을 뿐이야.'], ['bram', '…내 뒤에 서라. 떨려도 된다.'], ['lyra', '…응. 고마워.']],
      [['lyra', '사막 유적에 갇혀 있을 때, 아무도 안 올 줄 알았어.'], ['bram', '…왔다.'], ['lyra', '응. 그래서 지금 이렇게 시끄럽게 떠들 수 있는 거야.'], ['bram', '…떠들어라. 듣고 있다.']]
    ],
    'bram+sera': [
      [['sera', '브리아, 방패 든 팔이 떨려요. 치료할게요.'], ['bram', '괜찮다.'], ['sera', '괜찮다는 사람이 제일 안 괜찮아요.'], ['bram', '…부탁한다.']],
      [['bram', '세라. 넌 남의 상처만 본다.'], ['sera', '그게 제 일인걸요.'], ['bram', '네 상처는 누가 보나.'], ['sera', '…글쎄요. 생각해 본 적 없어요.'], ['bram', '…이제 내가 본다.']],
      [['sera', '서리 여왕의 저주를 막던 밤, 너무 추웠어요.'], ['bram', '…지금은.'], ['sera', '모닥불도 있고, 든든한 방패도 있고. 따뜻해요.'], ['bram', '…다행이다.']]
    ],
    'bram+nox': [
      [['nox', '덩치 큰 기사님은 말이 없네. 재미없게.'], ['bram', '…'], ['nox', '봐, 또 없잖아.'], ['bram', '…네 단검, 날이 상했다. 갈아 주겠다.'], ['nox', '…뭐야, 갑자기.']],
      [['bram', '녹스. 함정을 미리 알려 줘서, 다친 사람이 없었다.'], ['nox', '내가 피하려고 말한 거야.'], ['bram', '…그래도 고맙다.'], ['nox', '…그 표정으로 고맙다고 하지 마. 어색하잖아.']],
      [['nox', '나 같은 배신자를 왜 등 뒤에 두는 거야?'], ['bram', '등 뒤가 아니다. 옆이다.'], ['nox', '…'], ['bram', '옆에 있는 자는 지킨다. 그뿐이다.'], ['nox', '…바보 같긴.']]
    ],
    'lyra+sera': [
      [['lyra', '세라, 치유 마법은 어떤 원리야? 원소랑 다르지?'], ['sera', '음… 기도에 가까워요. 낫기를 진심으로 바라는 거죠.'], ['lyra', '진심…? 그건 수식으로 못 쓰는데!'], ['sera', '그래서 리라는 불꽃 담당이에요.']],
      [['sera', '리라, 또 밤새 마법서 읽었죠? 눈이 빨개요.'], ['lyra', '딱 한 장만 더 읽으려다가…'], ['sera', '자요. 지금. 당장.'], ['lyra', '…세라, 화나면 무섭다.']],
      [['lyra', '나 사실 사람 고치는 마법이 부러웠어. 내 건 다 태우기만 하니까.'], ['sera', '리라의 불꽃이 길을 열어 줘서 제가 치료할 시간이 생기는 거예요.'], ['lyra', '…그럼 우리, 둘이서 하나네?'], ['sera', '네. 좋은 짝이에요.']]
    ],
    'lyra+nox': [
      [['lyra', '녹스! 그 독, 성분이 뭐야? 화상이랑 섞으면 어떻게 돼?'], ['nox', '궁금하면 맞아 보든가.'], ['lyra', '…진짜 맞아 볼까 고민했어.'], ['nox', '하지 마. 진심으로.']],
      [['nox', '네 마법, 낭비가 심해. 반만 써도 같은 결과야.'], ['lyra', '반만 쓰면 재미가 없잖아!'], ['nox', '…재미로 싸우는 녀석은 처음 보네.'], ['lyra', '그러니까 오래 살아남는 거지!']],
      [['lyra', '녹스는 왜 늘 혼자 앉아 있어?'], ['nox', '조용한 게 좋아.'], ['lyra', '그럼 조용히 옆에 있을게.'], ['nox', '…넌 조용히가 안 되잖아.'], ['lyra', '…'], ['nox', '…됐어. 앉아.']]
    ],
    'sera+nox': [
      [['sera', '녹스, 손목에 감옥 족쇄 자국이 남아 있어요.'], ['nox', '별거 아냐. 오래된 거야.'], ['sera', '오래된 상처일수록 잘 봐야 해요.'], ['nox', '…마음대로 해.']],
      [['nox', '사제님은 날 왜 믿어? 마왕군이었는데.'], ['sera', '믿는 게 아니라, 지켜보는 중이에요.'], ['nox', '…그거 더 무서운데.'], ['sera', '그리고 지금까지는 합격이에요.']],
      [['sera', '오늘 저를 감싸 줬죠. 일부러 그런 거 알아요.'], ['nox', '착각이야. 발이 미끄러졌어.'], ['sera', '그럼 다음에도 미끄러져 주세요.'], ['nox', '…말은 잘하네, 사제님.'], ['sera', '세라라고 불러요.']]
    ]
  };

  // 합동기·짝 연계를 카드 조회 표에 등록한다(카드 목록 Data.cards 와 보상·도감 집계에는 넣지 않는다)
  Game.Data.duoCards.forEach(function (c) { Game.Data.cardById[c.id] = c; });
  Game.Data.duoByPair = {};
  Game.Data.duoCards.forEach(function (c) { Game.Data.duoByPair[c.duo.join('+')] = c; });
})();
