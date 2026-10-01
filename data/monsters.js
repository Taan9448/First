// monsters.js — 몬스터 41종(테마 36 + 거울의 그림자 5)과 행동 패턴
// 형식은 GAME_DESIGN.md 2.3절. 행동 효과의 대상 기본값은 예고 때 정한 아군 1명('target').
// 'allAllies' = 아군(플레이어 파티) 전체, 'self' = 자신, 'allMonsters' = 몬스터 전체.
(function () {
  var dmg = function (v, o) { return Object.assign({ op: 'damage', value: v }, o); };
  var dmgAll = function (v, o) { return dmg(v, Object.assign({ target: 'allAllies' }, o)); };
  var blk = function (v) { return { op: 'block', value: v, target: 'self' }; };
  var st = function (s, v, t) { return { op: 'status', status: s, value: v, target: t || 'target' }; };
  var selfSt = function (s, v) { return st(s, v, 'self'); };
  var allSt = function (s, v) { return st(s, v, 'allAllies'); };
  var sand = function (n) { return { op: 'addCard', card: 'SAND', pile: 'discard', count: n }; };
  var summon = function (id) { return { op: 'summon', monster: id }; };
  var mv = function (name, effects, extra) { return Object.assign({ name: name, effects: effects }, extra); };
  // 그림자 몬스터의 스테이지 보정: 체력 × (0.6 + 0.08 × 스테이지), 힘 = (스테이지 - 3) × 0.75 내림
  var SCALE = { hpBase: 0.6, hpPer: 0.08, strFrom: 3, strPer: 0.75 };

  function M(id, name, theme, rank, hp, moves, pattern, extra) {
    return Object.assign({ id: id, name: name, theme: theme, rank: rank, hp: hp, moves: moves, pattern: pattern,
      sprite: id, size: rank === 'boss' || rank === 'final' ? 1.5 : rank === 'elite' ? 1.25 : 1 }, extra);
  }

  var list = [
    // ---------------- 속삭이는 숲 ----------------
    M('slime', '슬라임', 'forest', 'normal', 18,
      { slam: mv('몸통 박치기', [dmg(5)]), curl: mv('웅크리기', [blk(4)]) },
      ['slam', 'curl'], { desc: '숲길 어디에나 있는 끈적한 덩어리.' }),
    M('mushroom', '독버섯', 'forest', 'normal', 22,
      { spore: mv('포자', [st('poison', 2)]), headbutt: mv('박치기', [dmg(4)]) },
      ['spore', 'headbutt'], { desc: '건드리면 독 포자를 뿜는다.' }),
    M('forest_wolf', '숲 늑대', 'forest', 'normal', 26,
      { bite: mv('물기', [dmg(7)]), flurry: mv('연속 물기', [dmg(3, { times: 2 })]), howl: mv('울부짖기', [selfSt('strength', 1)]) },
      ['bite', 'flurry', 'howl'], { desc: '무리를 지어 사냥하는 숲의 포식자.' }),
    M('vine', '덩굴 정령', 'forest', 'normal', 30,
      { wrap: mv('휘감기', [dmg(4), st('weak', 1)]), regrow: mv('자가 회복', [{ op: 'heal', value: 5, target: 'self' }]) },
      ['wrap', 'regrow'], { desc: '타락한 고목에서 뻗어 나온 덩굴.' }),
    M('goblin', '고블린 도적', 'forest', 'normal', 24,
      { stab: mv('찌르기', [dmg(6)]), poisonBlade: mv('독칼', [dmg(4), st('poison', 2)]), guard: mv('몸 사리기', [blk(5)]) },
      ['stab', 'poisonBlade', 'guard'], { desc: '숲길의 여행자를 노리는 좀도둑.' }),
    M('giant_spider', '거대 거미', 'forest', 'elite', 55,
      { fang: mv('독니', [dmg(6), st('poison', 3)]), web: mv('거미줄', [allSt('weak', 2)]), flurry: mv('연속 찌르기', [dmg(4, { times: 2 })]) },
      ['fang', 'web', 'flurry'], { desc: '숲 깊은 곳에 거미줄 성을 짓는 여왕 거미.' }),
    M('treant', '고목의 수호자', 'forest', 'boss', 140,
      { root: mv('뿌리 강타', [dmg(12)]), sporeCloud: mv('포자 구름', [allSt('poison', 3)]),
        bark: mv('나무껍질', [blk(12), selfSt('strength', 1)]), sapling: mv('묘목 소환', [summon('vine')]) },
      ['root', 'sporeCloud', 'bark', 'sapling'],
      { triggers: [{ hpBelow: 0.5, name: '격노', effects: [selfSt('strength', 2)] }],
        desc: '숲을 지키던 고목. 마왕의 저주로 타락했다.' }),

    // ---------------- 타오르는 사막 ----------------
    M('scorpion', '모래 전갈', 'desert', 'normal', 34,
      { sting: mv('독침', [dmg(6), st('poison', 2)]), claw: mv('집게', [dmg(9)]), shell: mv('껍질', [blk(6)]) },
      ['sting', 'claw', 'shell'], { desc: '모래 속에 숨어 꼬리를 세운다.' }),
    M('cactus', '선인장 괴물', 'desert', 'normal', 38,
      { punch: mv('가시 주먹', [dmg(7)]), spray: mv('가시 뿌리기', [dmgAll(3)]) },
      ['punch', 'spray'], { startStatus: { thorns: 3 }, desc: '온몸이 가시로 덮여 있어 때리면 아프다.' }),
    M('bandit', '사막 도적', 'desert', 'normal', 36,
      { slash: mv('베기', [dmg(8)]), sandThrow: mv('모래 뿌리기', [sand(1), st('weak', 1)]), pickpocket: mv('소매치기', [dmg(5), { op: 'gold', value: -5 }]) },
      ['slash', 'sandThrow', 'pickpocket'], { desc: '눈에 모래를 뿌리고 주머니를 노린다.' }),
    M('mummy', '미라', 'desert', 'normal', 44,
      { curse: mv('저주 붕대', [st('weak', 2)]), smash: mv('후려치기', [dmg(10)]) },
      ['curse', 'smash'], { desc: '왕의 무덤을 지키는 붕대 감은 병사.' }),
    M('sand_spirit', '모래 정령', 'desert', 'normal', 40,
      { sandstorm: mv('모래바람', [sand(2)]), whirl: mv('회오리', [dmgAll(5)]) },
      ['sandstorm', 'whirl'], { desc: '사막 바람이 뭉쳐 생긴 정령.' }),
    M('sandworm', '거대 모래벌레', 'desert', 'elite', 90,
      { burrow: mv('잠복', [blk(15)]), pounce: mv('덮치기', [dmg(18)]), eruption: mv('모래 분출', [dmgAll(6), sand(1)]) },
      ['burrow', 'pounce', 'eruption'], { desc: '사막 아래를 헤엄치는 거대한 벌레.' }),
    M('pharaoh', '파라오 세트', 'desert', 'boss', 190,
      { curse: mv('왕의 저주', [allSt('weak', 2)]), judge: mv('심판', [dmg(14)]), raise: mv('미라 소환', [summon('mummy')]),
        storm: mv('모래폭풍', [dmgAll(7), sand(2)]), gold: mv('황금 갑옷', [blk(20)]) },
      ['curse', 'judge', 'raise', 'storm'],
      { triggers: [{ hpBelow: 0.5, name: '황금 갑옷', effects: [blk(20)], pattern: ['judge', 'storm', 'gold', 'curse', 'judge', 'gold'] }],
        desc: '모래에 묻힌 왕조의 마지막 왕.' }),

    // ---------------- 얼어붙은 설원 ----------------
    M('snow_rabbit', '눈토끼', 'snow', 'normal', 30,
      { kicks: mv('연속 발차기', [dmg(4, { times: 2 })]), dodge: mv('회피', [blk(8)]) },
      ['kicks', 'dodge'], { desc: '귀엽지만 뒷발차기가 매섭다.' }),
    M('frost_wolf', '서리 늑대', 'snow', 'normal', 46,
      { bite: mv('물어뜯기', [dmg(10), st('chill', 1)]), howl: mv('울부짖기', [st('strength', 2, 'allMonsters')]) },
      ['bite', 'bite', 'howl'], { desc: '숨결마저 얼어붙은 설원의 늑대.' }),
    M('frost_spirit', '서리 정령', 'snow', 'normal', 42,
      { breath: mv('서리 숨결', [dmgAll(4), allSt('chill', 1)]), iceShield: mv('얼음 방패', [blk(10)]) },
      ['breath', 'iceShield'], { desc: '눈보라 속에서 태어난 차가운 정령.' }),
    M('yeti', '설인', 'snow', 'normal', 60,
      { smash: mv('강타', [dmg(13)]), snowball: mv('눈덩이', [dmg(8), st('chill', 2)]) },
      ['smash', 'snowball'], { desc: '설원의 거대한 털북숭이.' }),
    M('ice_witch', '얼음 마녀', 'snow', 'normal', 48,
      { freeze: mv('빙결 주문', [st('chill', 2)]), icicle: mv('얼음 송곳', [dmg(9)]), mend: mv('치유', [{ op: 'heal', value: 10, target: 'self' }]) },
      ['freeze', 'icicle', 'mend'], { desc: '서리 여왕을 섬기는 마녀.' }),
    M('glacier_golem', '빙하 골렘', 'snow', 'elite', 120,
      { fist: mv('얼음 주먹', [dmg(15), st('chill', 1)]), armor: mv('얼음 갑옷', [blk(18)]), quake: mv('지진', [dmgAll(8)]) },
      ['fist', 'armor', 'quake'], { desc: '천 년 묵은 빙하가 움직이기 시작했다.' }),
    M('frost_queen', '서리 여왕', 'snow', 'boss', 270,
      { blizzard: mv('눈보라', [dmgAll(6), allSt('chill', 1)]), spear: mv('얼음 창', [dmg(18), st('chill', 2)]),
        mirror: mv('얼음 거울', [blk(20), selfSt('thornsTemp', 3)]),
        prep: mv('절대영도 준비', [blk(25), selfSt('charge', 1)], { charge: { cancelStatus: { vulnerable: 2 } } }),
        zero: mv('절대영도', [dmgAll(12), allSt('frozen', 1)], { requiresCharge: true }) },
      ['blizzard', 'spear', 'mirror', 'prep', 'zero'],
      { desc: '설원을 영원한 겨울에 가둔 여왕.' }),

    // ---------------- 용암 화산 ----------------
    M('fire_imp', '불꽃 임프', 'volcano', 'normal', 45,
      { fireball: mv('화염탄', [dmg(8), st('burn', 2)]), play: mv('불장난', [st('burn', 3)]) },
      ['fireball', 'play'], { desc: '불씨를 던지며 깔깔대는 작은 악마.' }),
    M('lava_slime', '용암 슬라임', 'volcano', 'normal', 55,
      { boil: mv('끓는 박치기', [dmg(9), st('burn', 1)]) },
      ['boil'], { onDeath: [allSt('burn', 3)], desc: '죽을 때 펑 터지며 용암을 흩뿌린다.' }),
    M('fire_bat', '화염 박쥐', 'volcano', 'normal', 40,
      { flurry: mv('연속 공격', [dmg(3, { times: 3 })]), drain: mv('흡혈', [dmg(6, { lifesteal: true })]) },
      ['flurry', 'drain'], { desc: '불타는 날개로 동굴을 누빈다.' }),
    M('magma_golem', '마그마 골렘', 'volcano', 'normal', 85,
      { smash: mv('강타', [dmg(14)]), armor: mv('용암 갑옷', [blk(12), selfSt('lavaArmor', 2)]) },
      ['smash', 'armor'], { desc: '식지 않는 마그마로 빚은 골렘.' }),
    M('fire_shaman', '불의 주술사', 'volcano', 'normal', 60,
      { ritual: mv('전투 의식', [st('strength', 2, 'allMonsters')]), pillar: mv('화염 기둥', [dmg(10), st('burn', 3)]), heat: mv('열기', [allSt('burn', 2)]) },
      ['ritual', 'pillar', 'heat'], { desc: '화산의 정령을 부르는 주술사.' }),
    M('phoenix', '불사조', 'volcano', 'elite', 140,
      { wings: mv('화염 날개', [dmgAll(8), allSt('burn', 2)]), dive: mv('급강하', [dmg(20)]) },
      ['wings', 'dive'], { revive: { pct: 0.3 }, desc: '재가 되어도 다시 날아오르는 불새.' }),
    M('ignis', '화룡 이그니스', 'volcano', 'boss', 320,
      { breath: mv('화염 브레스', [dmgAll(8), allSt('burn', 2)]), claw: mv('발톱', [dmg(11, { times: 2 })]),
        soar: mv('비상', [blk(25)]), meteor: mv('메테오', [dmg(24)]) },
      ['breath', 'claw', 'soar', 'meteor'],
      { triggers: [{ hpBelow: 0.5, name: '용암 지대', everyTurn: [allSt('burn', 1)] }],
        desc: '화산 깊은 곳에 잠들어 있던 고룡.' }),

    // ---------------- 마왕성 ----------------
    M('skeleton', '해골 병사', 'castle', 'normal', 60,
      { slash: mv('베기', [dmg(10)]), shield: mv('방패', [blk(10)]) },
      ['slash', 'shield'], { desc: '마왕성을 지키는 불사의 병사.' }),
    M('dark_mage', '암흑 마법사', 'castle', 'normal', 55,
      { curse: mv('저주', [st('vulnerable', 2)]), orb: mv('암흑구', [dmg(14)]), empower: mv('강화', [st('strength', 2, 'allMonsters')]) },
      ['curse', 'orb', 'empower'], { desc: '금지된 마법에 영혼을 판 마법사.' }),
    M('gargoyle', '가고일', 'castle', 'normal', 80,
      { petrify: mv('석화', [blk(16)]), swoop: mv('급습', [dmg(15)]) },
      ['petrify', 'swoop'], { desc: '성벽의 석상이 날개를 편다.' }),
    M('vampire', '흡혈귀', 'castle', 'normal', 75,
      { drain: mv('흡혈', [dmg(10, { lifesteal: true })]), charm: mv('매혹', [st('weak', 2)]) },
      ['drain', 'charm'], { desc: '마왕의 연회에 초대받은 귀족.' }),
    M('cursed_armor', '저주받은 갑옷', 'castle', 'normal', 90,
      { smash: mv('강타', [dmg(15)]), grudge: mv('원한', [selfSt('strength', 3)]) },
      ['smash', 'grudge'], { desc: '주인 없는 갑옷이 원한으로 움직인다.' }),
    M('death_knight', '죽음의 기사', 'castle', 'elite', 160,
      { strike: mv('죽음의 일격', [dmg(22)]), fear: mv('공포', [allSt('weak', 2), allSt('vulnerable', 1)]), raise: mv('해골 소환', [summon('skeleton')]) },
      ['strike', 'fear', 'raise'], { desc: '마왕에게 영혼을 바친 기사.' }),
    M('baltar', '기사단장 발타르', 'castle', 'boss', 250,
      { dark: mv('암흑 참격', [dmg(18)]), slashes: mv('연속 베기', [dmg(6, { times: 3 })]),
        wall: mv('철벽', [blk(24), selfSt('strength', 1)]), sentence: mv('처형 선고', [dmg(22)]) },
      ['dark', 'slashes', 'wall', 'sentence'],
      { triggers: [{ hpBelow: 0.5, name: '광기', everyTurn: [selfSt('strength', 1)] }],
        desc: '카이의 기사단을 무너뜨린 배신자.' }),
    M('astaroth', '마왕 아스타로트', 'castle', 'final', 380,
      { dark: mv('암흑 참격', [dmg(18)]), wave: mv('저주의 파동', [dmgAll(7), allSt('vulnerable', 1)]),
        minions: mv('하수인 소환', [summon('skeleton')]), barrier: mv('암흑 방벽', [blk(20)]),
        fog: mv('독안개', [allSt('poison', 3)]), heavy: mv('강공', [dmg(16)]),
        sandstorm: mv('모래폭풍', [dmgAll(7), sand(2)]), blizzard: mv('눈보라', [dmgAll(6), allSt('chill', 1)]),
        hellfire: mv('업화', [dmgAll(8), allSt('burn', 2)]),
        combo: mv('연속 참격', [dmg(6, { times: 3 })]), drainStrike: mv('흡혈 강타', [dmg(14, { lifesteal: true })]),
        doom: mv('종말', [dmgAll(30)]) },
      ['dark', 'wave', 'minions', 'barrier'],
      { triggers: [
          { hpBelow: 0.6, name: '2페이즈 — 네 원소의 지배', effects: [blk(20)],
            pattern: ['fog', 'heavy', 'sandstorm', 'blizzard', 'heavy', 'hellfire'] },
          { hpBelow: 0.3, name: '3페이즈 — 종말', effects: [blk(15), selfSt('doom', 5)],
            pattern: ['combo', 'drainStrike', 'combo', 'drainStrike', 'combo', 'doom'], everyTurn: [selfSt('strength', 1)] }
        ],
        desc: '세상을 집어삼키려는 마왕.' }),

    // ---------------- 거울의 방 (이벤트 E13): 파티 캐릭터의 그림자 ----------------
    // 그 캐릭터의 대표 카드를 흉내 낸다. 스테이지에 맞춰 체력·힘이 오른다(scaleByStage)
    M('shadow_kai', '그림자 카이', 'mirror', 'elite', 70,
      { twin: mv('그림자 연속 베기', [dmg(4, { times: 2 })]), bash: mv('그림자 강타', [dmg(9), st('vulnerable', 1)]),
        shout: mv('그림자 기합', [selfSt('strength', 2)]), execute: mv('그림자 처형', [dmg(14)]) },
      ['twin', 'bash', 'shout', 'execute'], { mirror: 'kai', scaleByStage: SCALE, desc: '거울에서 걸어 나온 카이의 그림자. 칼끝에 망설임이 없다.' }),
    M('shadow_bram', '그림자 브리아', 'mirror', 'elite', 90,
      { bashShield: mv('그림자 방패 치기', [dmg(6), blk(8)]), wall: mv('그림자 철벽', [blk(16)]),
        charge: mv('그림자 방패 돌진', [dmg(8), st('weak', 2)]), quake: mv('그림자 대지 강타', [dmgAll(6)]) },
      ['bashShield', 'charge', 'wall', 'quake'], { mirror: 'bram', scaleByStage: SCALE, startStatus: { thorns: 2 }, desc: '브리아의 그림자. 가시 돋친 방패를 든다.' }),
    M('shadow_lyra', '그림자 리라', 'mirror', 'elite', 58,
      { fireball: mv('그림자 화염구', [dmg(6), st('burn', 3)]), frost: mv('그림자 서리 고리', [dmgAll(4), allSt('chill', 1)]),
        wave: mv('그림자 불꽃 파동', [dmgAll(5), allSt('burn', 2)]), focus: mv('마력 응축', [blk(8), selfSt('strength', 2)]) },
      ['fireball', 'frost', 'focus', 'wave'], { mirror: 'lyra', scaleByStage: SCALE, desc: '리라의 그림자. 차가운 불꽃을 다룬다.' }),
    M('shadow_sera', '그림자 세라', 'mirror', 'elite', 64,
      { smite: mv('그림자 신성한 일격', [dmg(7)]), mend: mv('그림자 치유', [{ op: 'heal', value: 12, target: 'self' }, blk(6)]),
        judge: mv('그림자 심판', [dmg(10), st('weak', 1)]), pray: mv('그림자 기도', [{ op: 'heal', value: 6, target: 'allMonsters' }, selfSt('regen', 3)]) },
      ['smite', 'judge', 'mend', 'pray'], { mirror: 'sera', scaleByStage: SCALE, desc: '세라의 그림자. 자신의 상처만 돌본다.' }),
    M('shadow_nox', '그림자 녹스', 'mirror', 'elite', 60,
      { dagger: mv('그림자 독 단검', [dmg(4), st('poison', 4)]), expose: mv('그림자 약점 노출', [st('weak', 2), st('vulnerable', 1)]),
        ambush: mv('그림자 암습', [dmg(13)]), fog: mv('그림자 독안개', [allSt('poison', 2)]) },
      ['dagger', 'expose', 'ambush', 'fog'], { mirror: 'nox', scaleByStage: SCALE, desc: '녹스의 그림자. 웃음소리만 먼저 들린다.' })
  ];

  Game.Data.monsters = list;

  // 적 변이(접두어): 일반 몬스터에만 확률로 붙는다 (GAME_DESIGN.md 19.5절)
  Game.Data.affixes = {
    angry: { name: '분노한', color: '#ff5a5a', desc: '시작 시 힘 2.', startStatus: { strength: 2 } },
    spiky: { name: '가시 돋친', color: '#9be36a', desc: '시작 시 가시 3.', startStatus: { thorns: 3 } },
    regen: { name: '재생하는', color: '#7cf27c', desc: '매 턴 시작 시 체력 4 회복.', everyTurn: [{ op: 'heal', value: 4, target: 'self' }] },
    giant: { name: '거대한', color: '#ffd23f', desc: '체력 1.5배, 크기 1.3배.', hpMult: 1.5, sizeMult: 1.3 },
    tough: { name: '단단한', color: '#a9c8ff', desc: '공격 1회당 받는 피해 -1.', startStatus: { reduce: 1 } },
    venom: { name: '맹독의', color: '#c96aff', desc: '공격으로 피해를 줄 때마다 중독 1.', onHitStatus: { poison: 1 } }
  };
  // 변이 확률: 스테이지 1 → 10 사이 선형
  Game.Data.affixChance = { from: 0.10, to: 0.35 };
  Game.Data.monsterById = Game.util.byId(list);
})();
