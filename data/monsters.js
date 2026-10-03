// monsters.js — 몬스터 80종(34단계에 분열 2 · 정예 6 · 보스 후보 5. 테마 51 + 세계의 틈 10 + 거울의 그림자 6 — 30단계에 그림자 시엘, 31단계에 세계의 틈. 28단계에 테마마다 일반 2 · 정예 1 추가)과 행동 패턴. 15단계: 1~2장(만독곡)·9~10장(청운문)은 무림 몬스터
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
  // 34단계: 저주 카드 넣기 · 다음 턴 방해 · 같은 편 보호
  var curse = function (card, n, pile) { return { op: 'addCard', card: card, pile: pile || 'discard', count: n || 1 }; };
  var costUp = function (n) { return { op: 'costUp', value: n }; };
  var drainE = function (n) { return { op: 'drainEnergy', value: n }; };
  var drainD = function (n) { return { op: 'drainDraw', value: n }; };
  var guard = function (v, t) { return { op: 'block', value: v, target: t || 'lowestMonster' }; };
  var mv = function (name, effects, extra) { return Object.assign({ name: name, effects: effects }, extra); };
  // 그림자 몬스터의 스테이지 보정: 체력 × (0.6 + 0.08 × 스테이지), 힘 = (스테이지 - 3) × 0.75 내림
  var SCALE = { hpBase: 0.6, hpPer: 0.08, strFrom: 3, strPer: 0.75 };

  function M(id, name, theme, rank, hp, moves, pattern, extra) {
    return Object.assign({ id: id, name: name, theme: theme, rank: rank, hp: hp, moves: moves, pattern: pattern,
      sprite: id, size: 1 }, extra); // 11단계: 그림 자체가 등급마다 크다(정예 ~96px · 보스 ~124px · 최종 보스 148px)
  }

  var list = [
    // ---------------- 만독곡 (무림, 1~2장) ----------------
    M('slime', '독두꺼비', 'forest', 'normal', 18,
      { slam: mv('혀 채찍', [dmg(5)]), curl: mv('독껍질 부풀리기', [blk(4)]) },
      ['slam', 'curl'], { desc: '만독곡 늪에 사는 두꺼비. 등의 혹에서 독액이 끓는다.' }),
    M('mushroom', '독버섯', 'forest', 'normal', 28,
      { spore: mv('포자', [st('poison', 2)]), headbutt: mv('박치기', [dmg(4)]) },
      ['spore', 'headbutt'], { split: { into: 'spore', count: 2 }, desc: '독곡의 축축한 그늘에서 자라는 버섯 요괴. 반쯤 베이면 갓이 갈라져 작은 버섯 둘이 된다.' }),
    M('forest_wolf', '독곡 이리', 'forest', 'normal', 26,
      { bite: mv('물기', [dmg(7)]), flurry: mv('연속 물기', [dmg(3, { times: 2 })]), howl: mv('울부짖기', [selfSt('strength', 1)]) },
      ['bite', 'flurry', 'howl'], { desc: '독초를 뜯어 먹고 자라 이빨에 독이 밴 이리 떼.' }),
    M('vine', '식인 덩굴', 'forest', 'normal', 30,
      { wrap: mv('휘감기', [dmg(4), curse('CUR_BIND', 1)]), regrow: mv('자가 회복', [{ op: 'heal', value: 5, target: 'self' }]) },
      ['wrap', 'regrow'], { desc: '흑풍채가 독곡 길목에 심어 둔 식인 덩굴.' }),
    M('goblin', '흑풍채 졸개', 'forest', 'normal', 24,
      { stab: mv('칼찌르기', [dmg(6)]), poisonBlade: mv('독 묻은 단도', [dmg(4), st('poison', 2)]), guard: mv('엄호', [guard(6)]) },
      ['stab', 'poisonBlade', 'guard'], { desc: '만독곡을 지나는 길손을 터는 흑풍채의 졸개. 하린의 목에 걸린 현상금을 노린다.' }),
    M('giant_spider', '금선독지주', 'forest', 'elite', 55,
      { fang: mv('독니', [dmg(6), st('poison', 3)]), web: mv('거미줄', [allSt('weak', 2)]), flurry: mv('연속 찌르기', [dmg(4, { times: 2 })]) },
      ['fang', 'web', 'flurry'], { desc: '등에 금빛 줄이 난 천년 독거미. 만독곡 입구의 주인이다.' }),
    M('treant', '흑풍채주 마웅', 'forest', 'boss', 140,
      { root: mv('귀두대도 내려찍기', [dmg(12)]), sporeCloud: mv('독연막', [allSt('poison', 3)]),
        bark: mv('철포삼', [blk(12), selfSt('strength', 1)]), sapling: mv('덩굴 풀기', [summon('vine')]) },
      ['root', 'sporeCloud', 'bark', 'sapling'],
      { triggers: [{ hpBelow: 0.5, name: '격노', effects: [selfSt('strength', 2)] }],
        desc: '만독곡을 틀어쥔 흑풍채의 두목. 단목천에게 하린의 목을 가져가기로 약조했다.' }),

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
      { curse: mv('저주 붕대', [st('weak', 1), curse('CUR_BIND', 1, 'draw')]), smash: mv('후려치기', [dmg(10)]) },
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
        desc: '모래에 묻힌 왕조의 마지막 왕. 세계의 틈에서 스며든 핏빛 기운에 다시 눈을 떴다.' }),

    // ---------------- 얼어붙은 설원 ----------------
    M('snow_rabbit', '눈토끼', 'snow', 'normal', 30,
      { kicks: mv('연속 발차기', [dmg(4, { times: 2 })]), dodge: mv('깡충', [blk(4), selfSt('dodge', 1)]) },
      ['kicks', 'dodge'], { desc: '귀엽지만 뒷발차기가 매섭다.' }),
    M('frost_wolf', '서리 늑대', 'snow', 'normal', 46,
      { bite: mv('물어뜯기', [dmg(10), st('chill', 1)]), howl: mv('울부짖기', [st('strength', 2, 'allMonsters')]) },
      ['bite', 'bite', 'howl'], { desc: '숨결마저 얼어붙은 설원의 늑대.' }),
    M('frost_spirit', '서리 정령', 'snow', 'normal', 42,
      { breath: mv('서리 숨결', [dmgAll(4), allSt('chill', 1)]), iceShield: mv('얼음 방패', [guard(6, 'allMonsters')]) },
      ['breath', 'iceShield'], { desc: '눈보라 속에서 태어난 차가운 정령.' }),
    M('yeti', '설인', 'snow', 'normal', 60,
      { smash: mv('강타', [dmg(13)]), snowball: mv('눈덩이', [dmg(8), st('chill', 2)]) },
      ['smash', 'snowball'], { desc: '설원의 거대한 털북숭이.' }),
    M('ice_witch', '얼음 마녀', 'snow', 'normal', 48,
      { freeze: mv('얼음 족쇄', [st('chill', 1), costUp(2)]), icicle: mv('얼음 송곳', [dmg(9)]), mend: mv('치유', [{ op: 'heal', value: 10, target: 'self' }]) },
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
      { desc: '설원을 영원한 겨울에 가둔 여왕. 그 왕관에 핏빛 균열이 나 있다.' }),

    // ---------------- 용암 화산 ----------------
    M('fire_imp', '불꽃 임프', 'volcano', 'normal', 45,
      { fireball: mv('화염탄', [dmg(8), st('burn', 2)]), play: mv('불장난', [st('burn', 3)]) },
      ['fireball', 'play'], { desc: '불씨를 던지며 깔깔대는 작은 악마.' }),
    M('lava_slime', '용암 슬라임', 'volcano', 'normal', 60,
      { boil: mv('끓는 박치기', [dmg(9), st('burn', 1)]) },
      ['boil'], { split: { into: 'lava_blob', count: 2 }, desc: '반쯤 깨지면 끓는 방울 둘로 갈라진다. 방울은 잠시 뒤 터진다.' }),
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
        desc: '화산 깊은 곳에 잠들어 있던 고룡. 둥지 아래 세계의 틈을 품고 있다.' }),

    // ---------------- 청운문 (무림, 9~10장) ----------------
    M('skeleton', '혈강시', 'castle', 'normal', 60,
      { slash: mv('강시 손톱', [dmg(10)]), shield: mv('부적 결계', [blk(5), guard(8)]) },
      ['slash', 'shield'], { desc: '혈마대법으로 일으킨 강시. 이마의 부적이 핏빛으로 번뜩인다.' }),
    M('dark_mage', '혈교 술사', 'castle', 'normal', 55,
      { curse: mv('혈주', [st('vulnerable', 2), curse('CUR_BLOOD', 1)]), orb: mv('혈강구', [dmg(14)]), empower: mv('혈제', [st('strength', 2, 'allMonsters')]) },
      ['curse', 'orb', 'empower'], { desc: '단목천을 따르는 혈교의 술사. 피로 주문을 쓴다.' }),
    M('gargoyle', '석사자 수호수', 'castle', 'normal', 80,
      { petrify: mv('석화', [blk(16)]), swoop: mv('도약 할퀴기', [dmg(15)]) },
      ['petrify', 'swoop'], { startStatus: { shelter: 1 }, desc: '청운문 산문의 돌사자. 혈기를 머금고 깨어났다.' }),
    M('vampire', '혈귀', 'castle', 'normal', 75,
      { drain: mv('흡혈공', [dmg(10, { lifesteal: true })]), charm: mv('섭혼술', [st('weak', 2)]) },
      ['drain', 'charm'], { desc: '혈마경을 익히다 미쳐 버린 무인. 남의 피로 내공을 채운다.' }),
    M('cursed_armor', '혈고 꼭두각시', 'castle', 'normal', 90,
      { smash: mv('청운장', [dmg(15)]), grudge: mv('혈고 발작', [selfSt('strength', 3)]) },
      ['smash', 'grudge'], { desc: '몸속의 혈고에 조종당하는 청운문 제자. 눈에 초점이 없다.' }),
    M('death_knight', '혈갑 호법', 'castle', 'elite', 160,
      { strike: mv('혈룡참', [dmg(22)]), fear: mv('혈기 압박', [allSt('weak', 2), allSt('vulnerable', 1)]), raise: mv('강시 부르기', [summon('skeleton')]) },
      ['strike', 'fear', 'raise'], { desc: '청운문 산문을 지키던 호법. 혈갑을 입고 단목천의 개가 되었다.' }),
    M('baltar', '사부 청운자', 'castle', 'boss', 250,
      { dark: mv('청운검 · 혈', [dmg(18)]), slashes: mv('운해삼검', [dmg(6, { times: 3 })]),
        wall: mv('호신강기', [blk(24), selfSt('strength', 1)]), sentence: mv('파문의 일검', [dmg(22)]) },
      ['dark', 'slashes', 'wall', 'sentence'],
      { triggers: [{ hpBelow: 0.5, name: '혈고 폭주', everyTurn: [selfSt('strength', 1)] }],
        desc: '하린의 사부이자 청운문의 장문인. 단목천이 심은 혈고에 정신을 빼앗겼다.' }),
    M('astaroth', '혈마 단목천', 'castle', 'final', 380,
      { dark: mv('혈마참', [dmg(18)]), wave: mv('혈마파동', [dmgAll(7), allSt('vulnerable', 1)]),
        minions: mv('강시 소환', [summon('skeleton')]), barrier: mv('혈강기', [blk(20)]),
        fog: mv('독안개', [allSt('poison', 3)]), heavy: mv('강공', [dmg(16)]),
        sandstorm: mv('모래폭풍', [dmgAll(7), sand(2)]), blizzard: mv('눈보라', [dmgAll(6), allSt('chill', 1)]),
        hellfire: mv('업화', [dmgAll(8), allSt('burn', 2)]),
        combo: mv('혈마삼연참', [dmg(6, { times: 3 })]), drainStrike: mv('흡정대법', [dmg(14, { lifesteal: true })]),
        doom: mv('천마해체', [dmgAll(30)]) },
      ['dark', 'wave', 'minions', 'barrier'],
      { triggers: [
          { hpBelow: 0.6, name: '2페이즈 — 두 세계의 힘', effects: [blk(20)],
            pattern: ['fog', 'heavy', 'sandstorm', 'blizzard', 'heavy', 'hellfire'] },
          { hpBelow: 0.3, name: '3페이즈 — 혈마현신', effects: [blk(15), selfSt('doom', 5)],
            pattern: ['combo', 'drainStrike', 'combo', 'drainStrike', 'combo', 'doom'], everyTurn: [selfSt('strength', 1)] }
        ],
        desc: '하린의 사형. 청운문의 금서 혈마경을 훔쳐 고대의 혈마와 하나가 되었다. 두 세계의 틈에서 판타지 땅의 힘까지 빨아들였다.' }),

    // ---------------- 28단계: 테마마다 일반 2 · 정예 1 ----------------
    M('centipede', '천족오공', 'forest', 'normal', 28,
      { bite: mv('독턱', [dmg(3, { times: 2 }), st('poison', 1)]), coil: mv('똬리', [blk(5), selfSt('strength', 1)]) },
      ['bite', 'coil'], { desc: '발이 천 개라는 만독곡의 왕지네. 독턱이 두 번 문다.' }),
    M('assassin', '흑풍채 자객', 'forest', 'normal', 22,
      { needle: mv('독침', [dmg(3), st('weak', 1)]), vanish: mv('은신', [blk(4), selfSt('dodge', 1)]), backstab: mv('배후 습격', [dmg(9)]) },
      ['needle', 'vanish', 'backstab'], { desc: '안개 속에서 칼끝만 보이는 흑풍채의 자객.' }),
    M('python', '독룡 이무기', 'forest', 'elite', 62,
      { constrict: mv('휘감아 조르기', [dmg(7), st('weak', 2)]), breath: mv('독룡 숨결', [dmgAll(3), allSt('poison', 2)]), shed: mv('허물 벗기', [blk(12)]) },
      ['constrict', 'breath', 'shed'], { desc: '용이 되지 못하고 독곡에 눌러앉은 천년 이무기.' }),
    M('scarab', '황금 스카라브', 'desert', 'normal', 30,
      { swarm: mv('떼 지어 물기', [dmg(3, { times: 3 })]), burrow: mv('모래 파고들기', [blk(7)]) },
      ['swarm', 'burrow'], { desc: '파라오의 무덤을 지키는 황금빛 쇠똥구리. 떼로 덤빈다.' }),
    M('sand_archer', '사막 궁수', 'desert', 'normal', 34,
      { volley: mv('화살비', [dmgAll(4)]), aim: mv('조준', [blk(4), selfSt('strength', 1)]), snipe: mv('저격', [dmg(12)]) },
      ['volley', 'aim', 'snipe'], { desc: '모래 언덕 너머에서 활을 당기는 도적단의 궁수.' }),
    M('sphinx', '스핑크스', 'desert', 'elite', 96,
      { riddle: mv('수수께끼', [sand(2), allSt('vulnerable', 1)]), claw: mv('앞발 할퀴기', [dmg(8, { times: 2 })]), sunbeam: mv('태양 광선', [dmgAll(8)]) },
      ['riddle', 'claw', 'sunbeam'], { desc: '답을 틀린 여행자를 모래로 만드는 무덤의 문지기.' }),
    M('wisp', '얼음 도깨비불', 'snow', 'normal', 32,
      { touch: mv('냉기의 손', [dmg(6), st('chill', 1)]), flicker: mv('깜박임', [blk(10)]) },
      ['touch', 'flicker'], { onDeath: [allSt('chill', 2)], desc: '눈보라 속에 길 잃은 넋. 꺼질 때 한기를 흩뿌린다.' }),
    M('harpy', '설원 하피', 'snow', 'normal', 40,
      { talons: mv('발톱 연타', [dmg(4, { times: 3 })]), gust: mv('날갯바람', [dmgAll(4), allSt('weak', 1)]) },
      ['talons', 'gust', 'talons'], { desc: '서리 여왕의 성 위를 맴도는 새 여인.' }),
    M('frost_wyvern', '서리 와이번', 'snow', 'elite', 125,
      { freezeBreath: mv('빙결 숨결', [dmgAll(7), allSt('chill', 2)]), dive: mv('급강하', [dmg(20)]), roost: mv('날개 접기', [blk(16), selfSt('strength', 1)]) },
      ['freezeBreath', 'dive', 'roost'], { desc: '빙벽에 둥지를 튼 와이번. 숨결이 닿으면 손끝부터 언다.' }),
    M('salamander', '불도마뱀', 'volcano', 'normal', 48,
      { tongue: mv('불혀', [dmg(7), st('burn', 2)]), bask: mv('용암 목욕', [{ op: 'heal', value: 8, target: 'self' }, selfSt('strength', 1)]) },
      ['tongue', 'bask'], { desc: '용암 웅덩이에서 몸을 데우는 도마뱀. 데울수록 세진다.' }),
    M('obsidian', '흑요석 파수꾼', 'volcano', 'normal', 70,
      { spin: mv('파편 회전', [dmg(5, { times: 2 })]), harden: mv('굳기', [blk(14)]) },
      ['harden', 'spin'], { startStatus: { thorns: 2, shelter: 1 }, desc: '식은 용암이 굳어 생긴 파수꾼. 날카로운 결이 손을 벤다.' }),
    M('djinn', '화염 마신', 'volcano', 'elite', 150,
      { inferno: mv('업화', [dmgAll(9), allSt('burn', 2)]), fist: mv('화염권', [dmg(18), st('burn', 3)]), imps: mv('임프 부르기', [summon('fire_imp')]) },
      ['inferno', 'fist', 'imps'], { desc: '화산의 틈에서 새어 나온 불의 마신. 웃을 때마다 불씨가 튄다.' }),
    M('blood_monk', '혈교 승병', 'castle', 'normal', 70,
      { palm: mv('혈수장', [dmg(6, { times: 2 })]), iron: mv('금강불괴', [blk(12), selfSt('strength', 1)]) },
      ['palm', 'iron', 'palm'], { desc: '혈교에 귀의한 파계승. 피를 바른 손바닥이 쇠처럼 단단하다.' }),
    M('paper_ghost', '지전귀', 'castle', 'normal', 58,
      { haunt: mv('혼 흔들기', [st('vulnerable', 1), drainE(1)]), cut: mv('종이 칼날', [dmg(4, { times: 3 })]), burn: mv('지전 불사르기', [dmgAll(6)]) },
      ['haunt', 'cut', 'burn'], { desc: '제사상의 지전에 깃든 원귀. 종잇장이 칼날처럼 날아든다.' }),
    M('ghost_sword', '귀검 호법', 'castle', 'elite', 165,
      { flying: mv('어검 삼연', [dmg(7, { times: 3 })]), wall: mv('검막', [blk(18), selfSt('thornsTemp', 4)]), execute: mv('귀검일섬', [dmg(26)]) },
      ['flying', 'wall', 'execute'], { desc: '죽어서도 검을 놓지 못한 청운문의 옛 호법. 검이 스스로 날아다닌다.' }),

    // ---------------- 31단계: 세계의 틈 (엔딩 뒤 11~13장) — 두 세계의 파편과 고대 혈마의 잔재 ----------------
    M('rift_wisp', '틈새 혼불', 'rift', 'normal', 48,
      { flicker: mv('혼불 튀기기', [dmg(5, { times: 2 })]), hex: mv('넋 흔들기', [st('vulnerable', 2), drainD(1)]) },
      ['flicker', 'hex'], { desc: '틈 사이를 떠도는 넋의 불꽃. 무림의 원귀인지 엘단의 정령인지 아무도 모른다.' }),
    M('void_hound', '공허 사냥개', 'rift', 'normal', 64,
      { bite: mv('공허 물기', [dmg(12)]), pounce: mv('덮치기', [dmg(6, { times: 2 })]), howl: mv('틈의 울음', [selfSt('strength', 2)]) },
      ['pounce', 'bite', 'howl'], { startStatus: { dodge: 1 }, desc: '빛을 삼키는 털을 가진 사냥개. 틈을 건너는 자의 냄새를 쫓는다.' }),
    M('shard_golem', '세계 파편 골렘', 'rift', 'normal', 96,
      { slam: mv('파편 내려치기', [dmg(16)]), harden: mv('파편 두르기', [blk(16)]) },
      ['harden', 'slam'], { startStatus: { thorns: 2, shelter: 1 }, desc: '청운봉의 바위와 엘단의 얼음이 뒤엉켜 생긴 골렘. 몸에 두 세계의 결이 섞여 있다.' }),
    M('echo_swordsman', '메아리 검객', 'rift', 'normal', 72,
      { triple: mv('잔영 삼검', [dmg(5, { times: 3 })]), stance: mv('기수식', [blk(10), selfSt('strength', 1)]) },
      ['triple', 'stance'], { desc: '틈에 갇힌 옛 무림 고수의 잔상. 검로만 남아 끝없이 같은 초식을 되풀이한다.' }),
    M('echo_mage', '메아리 마법사', 'rift', 'normal', 62,
      { flame: mv('잔상 화염', [dmgAll(6), allSt('burn', 1)]), frost: mv('잔상 서리', [st('chill', 2), dmg(5), costUp(1)]), ward: mv('잔상 결계', [blk(10)]) },
      ['flame', 'frost', 'ward'], { desc: '엘단의 옛 마법사가 남긴 메아리. 주문의 끝맺음만 영원히 되뇐다.' }),
    M('blood_seed', '혈마의 씨앗', 'rift', 'normal', 54,
      { pulse: mv('혈맥 고동', [dmgAll(5)]), spit: mv('핏물 뱉기', [dmg(7), st('poison', 2)]), grow: mv('자라기', [selfSt('strength', 2), { op: 'heal', value: 6, target: 'self' }]) },
      ['pulse', 'spit', 'grow'], { onDeath: [curse('CUR_BLOOD', 1)], desc: '고대 혈마가 틈 곳곳에 심어 둔 씨앗. 터질 때 피를 흩뿌린다. 두 세계의 피를 빨며 자란다.' }),
    M('rift_warden', '틈의 파수꾼', 'rift', 'elite', 190,
      { gate: mv('관문 내려치기', [dmg(24)]), beam: mv('틈새 광선', [dmgAll(9), allSt('vulnerable', 1)]), seal: mv('봉인 결계', [blk(22), allSt('weak', 1)]) },
      ['beam', 'gate', 'seal'], { desc: '천외검선이 세계의 틈에 세워 둔 수문장. 혈마의 기운에 물들어 이제는 누구도 들이지 않는다.' }),
    M('echo_colossus', '두 세계의 거상', 'rift', 'boss', 300,
      { blade: mv('청운 대검', [dmg(20)]), aegis: mv('은빛 대방패', [blk(26), selfSt('strength', 1)]),
        quake: mv('세계 진동', [dmgAll(9), allSt('weak', 1)]), duo: mv('검과 방패', [dmg(8, { times: 2 }), blk(10)]) },
      ['blade', 'quake', 'aegis', 'duo'],
      { triggers: [{ hpBelow: 0.5, name: '두 세계 합일', effects: [blk(20)], pattern: ['duo', 'quake', 'blade', 'duo'], everyTurn: [selfSt('strength', 1)] }],
        desc: '틈으로 떨어진 두 세계의 잔해가 뭉쳐 일어선 거상. 한 손에 청운문의 검, 한 손에 은빛 기사단의 방패를 쥐었다.' }),
    M('danmok_shade', '단목천의 잔영', 'rift', 'boss', 280,
      { cut: mv('혈마참 · 잔영', [dmg(18)]), clones: mv('혈영분신', [summon('echo_swordsman')]),
        drain: mv('흡정대법', [dmg(14, { lifesteal: true })]), guard: mv('혈강기', [blk(20), selfSt('strength', 1)]) },
      ['cut', 'clones', 'drain', 'guard'],
      { desc: '혈마에게 먹힌 단목천의 마지막 그림자. 원망만 남아 사매의 길을 막는다.' }),
    M('blood_demon', '고대 혈마', 'rift', 'final', 460,
      { claw: mv('혈마조', [dmg(20)]), wave: mv('혈해파동', [dmgAll(8), allSt('vulnerable', 1)]),
        seeds: mv('씨앗 뿌리기', [summon('blood_seed')]), shell: mv('혈각', [blk(24)]),
        devour: mv('혈식', [dmg(16, { lifesteal: true })]), tear: mv('틈 찢기', [dmgAll(7), allSt('chill', 1), sand(1)]),
        storm: mv('혈우', [dmg(5, { times: 4 })]), doom: mv('세계 잠식', [dmgAll(32)]) },
      ['claw', 'wave', 'seeds', 'shell'],
      { triggers: [
          { hpBelow: 0.6, name: '2페이즈 — 틈을 삼키다', effects: [blk(20)], pattern: ['tear', 'devour', 'storm', 'wave', 'devour'] },
          { hpBelow: 0.3, name: '3페이즈 — 세계 잠식', effects: [blk(15), selfSt('doom', 5)],
            pattern: ['storm', 'devour', 'storm', 'devour', 'storm', 'doom'], everyTurn: [selfSt('strength', 1)] }
        ],
        desc: '천 년 전 두 세계를 갈라놓은 마물. 단목천이 빌린 힘의 주인으로, 틈 깊은 곳에서 다시 깨어났다.' }),

    // ---------------- 34단계: 분열한 작은 몬스터 · 테마마다 정예 1 · 보스 후보 5 ----------------
    M('spore', '포자 버섯', 'forest', 'normal', 12,
      { spore: mv('포자 뿜기', [st('poison', 1)]), bump: mv('통통 박치기', [dmg(3)]) },
      ['bump', 'spore'], { desc: '독버섯이 갈라져 생긴 작은 버섯. 작아도 독은 그대로다.' }),
    M('lava_blob', '용암 방울', 'volcano', 'normal', 16,
      { fuse: mv('부글부글', [blk(3)]), boom: mv('자폭', [dmgAll(7), allSt('burn', 2), { op: 'selfDestruct' }]) },
      ['fuse', 'fuse', 'boom'], { ai: 'pattern', desc: '용암 슬라임에서 떨어진 방울. 두 번 부글거린 뒤 터진다 — 그 전에 없애야 한다.' }),
    M('poison_witch', '만독파파', 'forest', 'elite', 72,
      { brew: mv('독탕 끓이기', [allSt('poison', 2), curse('CUR_POISON', 2)]), staff: mv('지팡이 후려치기', [dmg(9)]),
        toads: mv('두꺼비 부르기', [summon('slime')]), hex: mv('만독 저주', [st('weak', 2), st('poison', 3)]) },
      ['brew', 'staff', 'toads', 'hex'], { desc: '만독곡 깊은 곳에서 독탕을 끓이는 노파. 국자로 떠 준 독기가 손패에 스며든다.' }),
    M('anubis_guard', '아누비스 수문장', 'desert', 'elite', 104,
      { scale: mv('심판의 저울', [costUp(2), allSt('vulnerable', 1)]), spear: mv('창 찌르기', [dmg(15)]),
        guard: mv('수문장의 방패', [blk(18)]), soul: mv('영혼 수확', [dmg(6, { times: 2, lifesteal: true })]) },
      ['scale', 'spear', 'guard', 'soul'], { desc: '무덤의 문을 지키는 승냥이 머리 전사. 저울에 마음을 달아 무거운 자의 손을 묶는다.' }),
    M('ice_knight', '서리 기사', 'snow', 'elite', 128,
      { lance: mv('서리 창 돌격', [dmg(17), st('chill', 1)]), aegis: mv('얼음 방패', [blk(18), selfSt('thornsTemp', 4)]),
        sweep: mv('빙결 베기', [dmgAll(7), allSt('chill', 1)]), oath: mv('기사의 맹세', [selfSt('strength', 2), costUp(1)]) },
      ['oath', 'lance', 'aegis', 'sweep'], { desc: '서리 여왕에게 충성을 맹세한 얼음 갑주의 기사. 그 앞에 서면 손끝이 굳는다.' }),
    M('flame_dancer', '화염 무희', 'volcano', 'elite', 132,
      { step: mv('무희의 발걸음', [selfSt('dodge', 2), selfSt('strength', 1)]), fans: mv('선풍무', [dmg(3, { times: 4 }), st('burn', 1)]),
        wave: mv('불꽃 부채', [dmgAll(7), allSt('burn', 2)]), kiss: mv('불꽃 입맞춤', [dmg(16), st('burn', 3)]) },
      ['step', 'fans', 'wave', 'kiss'], { desc: '불의 마신을 섬기는 무희. 불꽃 사이로 몸을 흘려 칼끝을 피한다 — 여러 번 베어야 닿는다.' }),
    M('jiangshi_master', '강시술사', 'castle', 'elite', 150,
      { talisman: mv('혈부 소환', [summon('skeleton')]), ward: mv('혈부 결계', [guard(12, 'allMonsters')]),
        bell: mv('방울 흔들기', [dmg(8, { times: 2 })]), command: mv('조종술', [st('strength', 2, 'allMonsters')]),
        curse: mv('혈주', [st('vulnerable', 2), curse('CUR_BLOOD', 1)]) },
      ['talisman', 'ward', 'bell', 'command', 'curse'], { desc: '방울 하나로 강시를 부리는 혈교의 술사. 강시 뒤에 숨어 혈부를 날린다.' }),
    M('void_weaver', '공허 직조자', 'rift', 'elite', 196,
      { thread: mv('공허의 실', [curse('CUR_BIND', 2, 'draw'), st('weak', 1)]), bite: mv('공허 독니', [dmg(12), st('poison', 3)]),
        web: mv('틈의 그물', [dmgAll(8), drainD(1)]), spin: mv('실 감기', [blk(20), selfSt('strength', 2)]) },
      ['thread', 'bite', 'web', 'spin'], { desc: '틈 사이에 실을 걸어 두 세계를 꿰매는 거미. 그 실에 걸리면 손이 묶인다.' }),
    M('toad_king', '천년 독두꺼비 왕', 'forest', 'boss', 150,
      { tongue: mv('혀 휘감기', [dmg(10), st('weak', 1)]), venom: mv('독액 분수', [allSt('poison', 3), curse('CUR_POISON', 1)]),
        spawn: mv('알 깨기', [summon('slime'), summon('slime')]), swallow: mv('통째로 삼키기', [dmg(18)]), puff: mv('몸 부풀리기', [blk(16), selfSt('strength', 1)]) },
      ['tongue', 'venom', 'spawn', 'swallow', 'puff'],
      { triggers: [{ hpBelow: 0.5, name: '독피 분출', effects: [allSt('poison', 3)], everyTurn: [allSt('poison', 1)] }],
        desc: '만독곡 늪 밑바닥에서 천 년을 산 두꺼비. 흑풍채도 이 늪만은 돌아간다.' }),
    M('scorpion_queen', '전갈 여왕', 'desert', 'boss', 200,
      { pincers: mv('쌍집게', [dmg(9, { times: 2 })]), sting: mv('여왕의 독침', [dmg(8), st('poison', 5)]),
        burrow: mv('모래 잠행', [blk(22), selfSt('dodge', 1)]), brood: mv('새끼 부르기', [summon('scorpion')]),
        storm: mv('독사막', [dmgAll(6), allSt('poison', 2), sand(1)]) },
      ['pincers', 'sting', 'burrow', 'brood', 'storm'],
      { triggers: [{ hpBelow: 0.5, name: '여왕의 분노', effects: [selfSt('strength', 3)], pattern: ['sting', 'pincers', 'storm', 'brood', 'pincers'] }],
        desc: '모래 바다 밑 둥지의 여왕. 새끼들을 방패 삼아 몸을 숨긴다.' }),
    M('yeti_king', '설산 대왕', 'snow', 'boss', 280,
      { roar: mv('설산의 포효', [st('strength', 3, 'allMonsters'), costUp(2)]), slam: mv('대지 강타', [dmg(22)]),
        avalanche: mv('눈사태', [dmgAll(9), allSt('chill', 1)]), hurl: mv('얼음 바위 던지기', [dmg(12), st('chill', 2)]), call: mv('설인 부르기', [summon('yeti')]) },
      ['roar', 'slam', 'avalanche', 'hurl', 'call', 'slam'],
      { triggers: [{ hpBelow: 0.5, name: '광폭', effects: [blk(20)], everyTurn: [selfSt('strength', 1)] }],
        desc: '눈보라 고개의 꼭대기에 사는 설인들의 왕. 포효 한 번에 산이 무너진다.' }),
    M('fire_giant', '염마 거인', 'volcano', 'boss', 330,
      { hammer: mv('용암 망치', [dmg(24)]), sea: mv('불바다', [dmgAll(8), allSt('burn', 2)]), armor: mv('화산 갑옷', [blk(24), selfSt('lavaArmor', 3)]),
        flurry: mv('화염 연타', [dmg(7, { times: 3 })]),
        prep: mv('분화 준비', [blk(20), selfSt('charge', 1)], { charge: { cancelStatus: { vulnerable: 2 } } }),
        erupt: mv('대분화', [dmgAll(16), allSt('burn', 3)], { requiresCharge: true }) },
      ['hammer', 'sea', 'armor', 'flurry', 'prep', 'erupt'],
      { desc: '화산의 심장을 망치로 두드리는 거인. 분화를 준비할 때 보호막을 깨면 멈춘다.' }),
    M('rift_hydra', '틈의 히드라', 'rift', 'boss', 320,
      { bites: mv('세 머리 물기', [dmg(6, { times: 3 })]), venom: mv('독 숨결', [dmgAll(5), allSt('poison', 3)]),
        fire: mv('불 숨결', [dmgAll(6), allSt('burn', 3)]), frost: mv('얼음 숨결', [dmgAll(5), allSt('chill', 2), costUp(1)]),
        regrow: mv('머리 재생', [{ op: 'heal', value: 25, target: 'self' }, selfSt('strength', 2)]) },
      ['bites', 'venom', 'fire', 'frost', 'regrow'],
      { triggers: [{ hpBelow: 0.5, name: '머리가 둘로', pattern: ['bites', 'fire', 'bites', 'venom', 'frost', 'bites'], everyTurn: [selfSt('strength', 1)] }],
        desc: '머리마다 다른 세계의 숨을 내뱉는 틈의 괴수. 독 · 불 · 얼음이 번갈아 쏟아진다.' }),

    // ---------------- 거울의 방 (이벤트 E13): 파티 캐릭터의 그림자 ----------------
    // 그 캐릭터의 대표 카드를 흉내 낸다. 스테이지에 맞춰 체력·힘이 오른다(scaleByStage)
    M('shadow_kai', '그림자 하린', 'mirror', 'elite', 70,
      { twin: mv('그림자 쌍검식', [dmg(4, { times: 2 })]), bash: mv('그림자 파산검', [dmg(9), st('vulnerable', 1)]),
        shout: mv('그림자 운기', [selfSt('strength', 2)]), execute: mv('그림자 단혼검', [dmg(14)]) },
      ['twin', 'bash', 'shout', 'execute'], { mirror: 'kai', scaleByStage: SCALE, desc: '거울에서 걸어 나온 하린의 그림자. 칼끝에 망설임이 없다.' }),
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
    M('shadow_nox', '그림자 소연', 'mirror', 'elite', 60,
      { dagger: mv('그림자 독비도', [dmg(4), st('poison', 4)]), expose: mv('그림자 약점 노출', [st('weak', 2), st('vulnerable', 1)]),
        ambush: mv('그림자 암기 세례', [dmg(13)]), fog: mv('그림자 만독무', [allSt('poison', 2)]) },
      ['dagger', 'expose', 'ambush', 'fog'], { mirror: 'nox', scaleByStage: SCALE, desc: '소연의 그림자. 웃음소리만 먼저 들린다.' }),
    M('shadow_ciel', '그림자 시엘', 'mirror', 'elite', 58,
      { aim: mv('그림자 조준', [selfSt('strength', 2), blk(6)]), volley: mv('그림자 연사', [dmg(3, { times: 3 })]),
        pierce: mv('그림자 관통 화살', [dmg(12), st('vulnerable', 1)]), rain: mv('그림자 화살비', [dmgAll(5)]) },
      ['volley', 'aim', 'pierce', 'rain'], { mirror: 'ciel', scaleByStage: SCALE, desc: '시엘의 그림자. 시위 소리보다 화살이 먼저 닿는다.' })
  ];

  // 20단계: 보스·정예 고유 규칙. 상태로 붙어 화면에 아이콘과 설명이 뜬다(data/keywords.js)
  var RULES = {
    treant: { startStatus: { vengeance: 2 } },             // 덩굴이 쓰러질 때마다 힘 +2
    pharaoh: { startStatus: { sandglass: 7 } },            // 한 턴에 카드 7장을 쓰면 턴이 끝나고 힘 +1
    frost_queen: { startStatus: { frostAura: 1 } },        // 매 턴 손패 1장 비용 +1
    ignis: { startStatus: { scorch: 1 } },                 // 공격 카드에 맞을 때마다 공격자 화상 1
    baltar: { startStatus: { riposte: 6 } },               // 한 턴의 공격 카드 3장마다 반격 6
    astaroth: { startStatus: { spellward: 5 } },           // 스킬·지속 카드마다 보호막 5
    giant_spider: { triggers: [{ hpBelow: 0.5, name: '독 고치', effects: [blk(10), allSt('poison', 2)] }] },
    sandworm: { triggers: [{ hpBelow: 0.5, name: '모래 속으로', effects: [blk(20)], pattern: ['pounce', 'burrow', 'eruption', 'pounce', 'eruption'] }] },
    glacier_golem: { startStatus: { spellward: 4 }, triggers: [{ hpBelow: 0.5, name: '빙하 균열', effects: [selfSt('strength', 3)] }] },
    phoenix: { startStatus: { scorch: 1 } },
    death_knight: { startStatus: { riposte: 5 }, triggers: [{ hpBelow: 0.4, name: '혈갑 해방', effects: [selfSt('strength', 3), blk(15)] }] },
    // 28단계 정예
    python: { triggers: [{ hpBelow: 0.5, name: '역린', effects: [selfSt('strength', 2)] }] },
    sphinx: { startStatus: { spellward: 3 } },
    frost_wyvern: { triggers: [{ hpBelow: 0.5, name: '빙결 포효', effects: [allSt('chill', 3), blk(10)] }] },
    djinn: { startStatus: { scorch: 1 } },
    ghost_sword: { startStatus: { riposte: 4 }, triggers: [{ hpBelow: 0.4, name: '만검귀종', effects: [selfSt('strength', 3)] }] },
    // 31단계 세계의 틈
    rift_warden: { startStatus: { spellward: 4 }, triggers: [{ hpBelow: 0.5, name: '틈 폭주', effects: [selfSt('strength', 3)] }] },
    echo_colossus: { startStatus: { riposte: 6 } },
    danmok_shade: { startStatus: { spellward: 4 }, triggers: [{ hpBelow: 0.5, name: '원망', effects: [selfSt('strength', 3), blk(15)] }] },
    blood_demon: { startStatus: { vengeance: 2, scorch: 1 } },
    // 34단계 정예 · 보스 후보
    poison_witch: { triggers: [{ hpBelow: 0.5, name: '만독무', everyTurn: [allSt('poison', 1)] }] },
    anubis_guard: { triggers: [{ hpBelow: 0.5, name: '사자의 서', effects: [summon('mummy'), blk(12)] }] },
    ice_knight: { startStatus: { frostAura: 1 } },
    flame_dancer: { startStatus: { dodge: 1 } },
    jiangshi_master: { startStatus: { shelter: 1 }, triggers: [{ hpBelow: 0.4, name: '강시 대군', effects: [summon('skeleton'), summon('skeleton')] }] },
    void_weaver: { startStatus: { spellward: 3 }, triggers: [{ hpBelow: 0.5, name: '실타래 폭주', everyTurn: [curse('CUR_BIND', 1)] }] },
    toad_king: { startStatus: { vengeance: 1 } },
    scorpion_queen: { startStatus: { shelter: 1 } },
    fire_giant: { startStatus: { scorch: 1 } },
    rift_hydra: { startStatus: { spellward: 3 } }
  };
  list.forEach(function (m) {
    var r = RULES[m.id];
    if (r) {
      if (r.startStatus) m.startStatus = Object.assign({}, m.startStatus || {}, r.startStatus);
      if (r.triggers) m.triggers = (m.triggers || []).concat(r.triggers);
    }
    // 적 행동 방식(20단계): 행동이 2개 이상이고 차지가 없는 일반 몬스터는 가중치로 고른다(같은 행동은 두 번까지 연달아).
    // 소환은 적이 3마리 미만일 때만, 자기 회복은 체력 80% 미만일 때만 고른다. 첫 행동은 패턴의 첫 칸
    var keys = Object.keys(m.moves), charge = keys.some(function (k) { return m.moves[k].charge || m.moves[k].requiresCharge; });
    if (!m.ai && m.rank === 'normal' && keys.length >= 2 && !charge) m.ai = 'weighted';
    keys.forEach(function (k) {
      var mvv = m.moves[k];
      if (mvv.when) return;
      if (mvv.effects.some(function (e) { return e.op === 'summon'; })) mvv.when = { is: 'allies', op: '<', n: 3 };
      else if (mvv.effects.some(function (e) { return e.op === 'heal' && e.target === 'self'; })) mvv.when = { is: 'selfHp', op: '<', n: 0.8 };
    });
  });

  Game.Data.monsters = list;

  // 적 변이(접두어): 일반 몬스터에만 확률로 붙는다 (GAME_DESIGN.md 19.5절)
  Game.Data.affixes = {
    angry: { name: '분노한', color: '#ff5a5a', desc: '시작 시 힘 2.', startStatus: { strength: 2 } },
    spiky: { name: '가시 돋친', color: '#9be36a', desc: '시작 시 가시 3.', startStatus: { thorns: 3 } },
    regen: { name: '재생하는', color: '#7cf27c', desc: '매 턴 시작 시 체력 4 회복.', everyTurn: [{ op: 'heal', value: 4, target: 'self' }] },
    giant: { name: '거대한', color: '#ffd23f', desc: '체력 1.5배, 크기 1.3배.', hpMult: 1.5, sizeMult: 1.3 },
    tough: { name: '단단한', color: '#a9c8ff', desc: '공격 1회당 받는 피해 -1.', startStatus: { reduce: 1 } },
    venom: { name: '맹독의', color: '#c96aff', desc: '공격으로 피해를 줄 때마다 중독 1.', onHitStatus: { poison: 1 } },
    // 28단계
    swift: { name: '날랜', color: '#7fe0ff', desc: '매 턴 시작 시 보호막 4.', everyTurn: [{ op: 'block', value: 4, target: 'self' }] },
    burning: { name: '불타는', color: '#ff9a3a', desc: '공격으로 피해를 줄 때마다 화상 1.', onHitStatus: { burn: 1 } },
    frosty: { name: '서늘한', color: '#b8e8ff', desc: '공격으로 피해를 줄 때마다 한기 1.', onHitStatus: { chill: 1 } },
    frenzied: { name: '광포한', color: '#ff3a8a', desc: '매 턴 시작 시 힘 +1.', everyTurn: [{ op: 'status', status: 'strength', value: 1, target: 'self' }] }
  };
  // 변이 확률: 스테이지 1 → 10 사이 선형
  Game.Data.affixChance = { from: 0.10, to: 0.35 };
  Game.Data.monsterById = Game.util.byId(list);
})();
