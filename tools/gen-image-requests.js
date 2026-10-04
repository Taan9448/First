// tools/gen-image-requests.js — 36단계: 게임 데이터에서 그림 요청서(docs/IMAGE_REQUESTS.md)를 만든다(개발 전용)
// 실행: node tools/gen-image-requests.js   — 카드 · 몬스터 · 유물이 바뀌면 다시 돌린다. 이미 올라온 그림은 '있음'으로 표시한다
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
global.window = global;
['js/core.js', 'data/asset-spec.js', 'data/assets.js', 'data/character-art.js', 'data/keywords.js', 'data/characters.js', 'data/cards.js', 'data/monsters.js', 'data/relics.js', 'data/items.js',
 'data/bonds.js', 'data/events.js', 'data/stages.js', 'data/story.js'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f }));
const G = global.Game, D = G.Data, SP = D.assetSpec;
const have = base => {
  if (['png', 'webp', 'jpg', 'jpeg'].some(e => D.assets.files[base + '.' + e])) return true;
  const m = base.match(/^characters\/heroes\/(.+)_(idle|attack|skill|hit)$/);
  const a = m && (D.characterArt || {})[m[1]];
  return !!(a && D.assets.files[a.url.replace(/^assets\//, '')]);
};
const mark = base => have(base) ? '있음' : '';
const sz = k => SP[k].size.join('×');
const plain = t => String(t || '').replace(/\{d\d+\}/g, 'N').replace(/\{\+([^}]*)\}/g, '$1').replace(/\{\*([^}]*)\}/g, '$1').replace(/\|/g, '/');
const THEME = D.THEME_NAME, RARITY = G.RARITY_NAME;
const out = [];
const P = s => out.push(s);

// ---------------- 동료 외형(지금 게임 그림의 설계 그대로 — 화풍은 바뀌어도 외형은 지킨다) ----------------
const LOOK = {
  kai: '승인된 하린 목업: 검은 긴 머리와 높은 둥근 상투, 금색 머리 장식과 붉은 리본, 붉은 눈. 흑백 도포의 넓은 흰 소매와 붉은 허리띠, 금색 테두리. 큰 서예 붓(나무 손잡이, 금색 띠, 흰 붓털과 검은 먹 끝). 수묵 기운과 차분한 표정. 게임의 직업과 카드 규칙은 그대로 유지',
  bram: '여성 수호기사. 금발 땋은 머리, 푸른 눈. 은빛 흉갑과 견갑, 푸른 겉옷과 망토, 금빛 십자가 새겨진 연 모양 큰 방패와 한손검. 기운의 빛은 하늘빛. 듬직하고 다정한 표정',
  lyra: '여성 엘프 원소술사(뾰족한 귀). 구릿빛(짙은 주황) 긴 머리, 보라 눈, 보석 머리띠. 금빛 무늬가 들어간 보라 로브와 청록 안감, 끝에 보라 수정이 달린 지팡이. 기운의 빛은 보라와 청록. 호기심 많고 들뜬 표정',
  sera: '여성 사제. 아주 긴 은빛 머리, 금빛 눈, 흰 베일과 작은 금관. 금 테를 두른 흰 사제복과 푸른 띠, 해 문양 지팡이. 기운의 빛은 금빛. 온화하고 단단한 표정',
  nox: '여성 암기술사(사천당가). 검은 머리를 양쪽 둥근 상투로 올리고 긴 꼬리머리, 초록 눈, 입을 가린 얼굴 가리개. 초록 무복과 흰 바지, 비수 두 자루. 기운의 빛은 독빛 초록. 장난스럽고 날카로운 눈매',
  ciel: '여성 엘프 정령 궁수(뾰족한 귀). 연둣빛 은발을 한쪽으로 땋은 머리, 잎사귀 머리띠. 이끼색 짧은 망토와 청록 사냥복, 가죽 띠와 화살통, 나무 활. 기운의 빛은 숲빛 초록과 하늘빛. 조용하고 집중한 표정'
};
const THEME_LOOK = {
  forest: '무림 · 만독곡: 독안개가 깔린 깊은 골짜기, 독 늪과 기암괴석, 뒤틀린 나무와 덩굴, 독버섯. 초록·보랏빛 독기',
  desert: '엘단 · 타오르는 사막: 붉은 해 아래 모래 언덕, 무너진 석상과 피라미드, 오아시스의 흔적. 금빛·주황',
  snow: '엘단 · 얼어붙은 설원: 눈보라 치는 고개, 얼음 결정과 침엽수, 멀리 서리 궁전. 하늘빛·흰빛',
  volcano: '엘단 · 용암 화산: 용암이 흐르는 협곡, 검은 현무암과 불씨, 화룡의 둥지. 붉은·주황빛',
  castle: '무림 · 청운문: 산 위 문파의 산문과 기와 전각, 돌계단과 석사자, 핏빛 기운이 번진 하늘. 남색·붉은빛',
  rift: '세계의 틈: 별이 뜬 허공과 소용돌이치는 균열, 거꾸로 떠 있는 청운문 전각과 엘단 성벽, 무림의 바위와 엘단의 모래가 섞인 떠 있는 땅. 청록·보랏빛',
  mirror: '거울의 방: 깨진 거울 조각이 떠 있는 어두운 방, 비친 그림자. 보랏빛'
};

P('# 그림 요청서 (ChatGPT용)');
P('');
P('`tools/gen-image-requests.js`가 게임 데이터에서 만든 문서다(손으로 고치지 않는다). 기술 조건은 `docs/ASSET_SPEC.md`, 작업 방식은 `docs/CHATGPT_BRIEF.md`.');
P('**묶음 0(시범)을 먼저** 만들어 화풍을 확정한 뒤 묶음 1부터 진행한다. 표의 "있음"은 이미 올라온 그림이다.');
P('');
P('공통: 그림 안에 글자 · 서명 · 워터마크 없음 · 파일 이름은 표 그대로 · 투명이 필요한 것은 PNG 알파 · 같은 묶음은 같은 화풍(선 굵기 · 왼쪽 위 빛 · 채도)');
P('');

// ---------------- 묶음 0 ----------------
P('## 묶음 0 — 아트 디렉션과 시범 (가장 먼저, 사용자가 화풍을 확정한다)');
P('');
P('```');
P('[IMAGE REQUEST] 0-1 스타일 가이드');
P('용도: 게임 전체 그림의 기준. 그림이 아니라 문서(docs/STYLE_GUIDE.md)로 저장소에 올린다');
P('내용: 화풍(무림의 수묵·한지·옻칠·금박 + 판타지의 룬·마법진·보석 테두리를 섞은 "두 세계 융합"), 색 팔레트(무림 · 엘단 · 세계의 틈),');
P('      선 굵기 · 명암 · 빛 방향(왼쪽 위), 캐릭터 비례(머리:몸), 아이콘 규칙, 금지 사항, 시범 그림 링크');
P('```');
P('');
const pilot = [
  ['0-2', '동료 전투 그림 — 하린 대기 · 공격', 'assets/characters/heroes/kai_idle.png · kai_attack.png', sz('heroPose') + ' (정사각)', '투명', LOOK.kai + '. 오른쪽을 본다. 발이 아래 가운데, 몸이 높이의 80~88%. 두 동작은 같은 캔버스 · 같은 크기 · 같은 발 위치. 공격은 승인된 붓을 앞으로 휘두른 순간'],
  ['0-3', '전투 배경 — 만독곡', 'assets/backgrounds/battle_forest.jpg', sz('bgBattle'), '불투명', THEME_LOOK.forest + '. 위에서 70% 높이가 땅. 가운데 위쪽은 차분하게(숫자가 잘 보이게)'],
  ['0-4', '보스 전투 그림 — 천년 독두꺼비 왕 대기 · 공격', 'assets/characters/monsters/toad_king_idle.png · toad_king_attack.png', '1024×1024', '투명', '만독곡 늪 밑바닥에서 천 년을 산 거대한 독두꺼비. 금관, 혹투성이 등, 보랏빛 띠. 왼쪽을 본다. 공격은 혀를 길게 내뻗는 순간'],
  (function () { const L = D.cards.find(c => c.owner === 'kai' && c.rarity === 'legendary'); return ['0-5', '카드 그림 — ' + D.cardById.K01.name + '(일반) · ' + L.name + '(전설)', 'assets/cards/art/K01.png · ' + L.id + '.png', sz('cardArt'), '불투명',
    D.cardById.K01.name + ': 하린이 곧은 검으로 내지르는 기본 검식, 푸른 검기 한 줄. ' + L.name + '(' + plain(L.text) + '): 하린의 최종 검식, 수묵 붓 획과 마법진이 겹친 화려한 장면. 작게(약 98×81px) 보여도 주제가 하나로 또렷하게']; })(),
  ['0-6', '아이콘 — 힘 · 중독 · 공격 예고 · 방어 예고', 'assets/icons/status/strength.png · poison.png, assets/icons/intent/attack.png · block.png', sz('icon'), '투명', '22~32px로 줄어도 알아보게 굵고 단순하게. 배경 판 없음']
];
pilot.forEach(r => {
  P('```');
  P('[IMAGE REQUEST] ' + r[0] + ' ' + r[1]);
  P('파일: ' + r[2]);
  P('크기: ' + r[3] + ' · 배경: ' + r[4]);
  P('내용: ' + r[5]);
  P('스타일: 0-1 스타일 가이드(시범이므로 이 그림들로 화풍을 정한다)');
  P('```');
  P('');
});

// ---------------- 묶음 1 동료 ----------------
P('## 묶음 1 — 동료 6명 (전투 동작 5 + 전신 일러스트 + 컷인 얼굴)');
P('');
P('승인된 6명 목업의 대기·공격·스킬·피격은 assets/characters/{id}_poses.png에 적용되어 있다. 좌표는 data/character-art.js. 아래 있음 표시는 이 아틀라스도 포함한다. 쓰러짐 전용 그림과 별도 전신·얼굴은 아직 없고, 현재 전신과 얼굴은 대기 자세를 표시·확대한다. 승인된 외형은 assets/README.md를 따른다.');
P('');
P('동작: `idle`(대기, 필수) · `attack`(공격, 필수) · `skill`(기술·마법 시전) · `hit`(맞아서 움찔) · `down`(쓰러짐). 동료는 **오른쪽**을 본다. 여섯 명의 키 차이는 작게(같은 캔버스에서 머리 높이가 비슷하게).');
P('');
D.characters.forEach(c => {
  P('```');
  P('[IMAGE REQUEST] 1-' + c.id + ' ' + c.name + ' (' + c.role + (c.job ? ' · ' + c.job : '') + ')');
  P('파일: assets/characters/heroes/' + c.id + '_{idle,attack,skill,hit,down}.png (' + sz('heroPose') + ', 투명)');
  P('      assets/characters/heroes/' + c.id + '_portrait.png (' + sz('portrait') + ', 투명) · ' + c.id + '_face.png (' + sz('face') + ', 투명)');
  P('외형: ' + LOOK[c.id]);
  P('설정: ' + c.desc);
  const ATK = { slash: '검을 앞으로 크게 휘두른 순간', bash: '방패로 앞을 들이받는 순간', cast: '지팡이를 앞으로 내밀어 마법을 쏘는 순간', pray: '지팡이를 들어 빛을 내리는 순간', stab: '비수로 찌르거나 암기를 던지는 순간', shoot: '활시위를 놓은 순간' };
  P('공격 동작: ' + (c.id === 'kai' ? '서예 붓을 앞으로 크게 휘두른 순간' : c.id === 'sera' ? ATK.pray : ATK[c.attackStyle] || (c.id === 'ciel' ? ATK.shoot : '주 무기로 공격하는 순간')) + ' · 기술 동작: 기운의 빛이 몸을 감싸는 시전 자세');
  P('전신 일러스트: 무릎 위 또는 전신, 살짝 오른쪽을 보는 3/4 자세(로비 큰 그림 · 이야기 화면) · 컷인 얼굴: 가슴 위, 결의에 찬 표정(필살기 장면)');
  P('상태: ' + ['idle', 'attack', 'skill', 'hit', 'down', 'portrait', 'face'].map(n => n + (have('characters/heroes/' + c.id + '_' + n) ? '(있음)' : '')).join(' · '));
  P('```');
  P('');
});
P('그림자 몬스터(`shadow_kai` 등 6종, 이벤트 "거울의 방")는 동료 그림을 어둡게 칠한 버전이다 — 묶음 4에서 동료 그림이 정해진 뒤 만든다.');
P('');

// ---------------- 묶음 2 배경 ----------------
P('## 묶음 2 — 배경 · 지도');
P('');
P('| 파일 | 크기 | 내용 | 상태 |');
P('|---|---|---|---|');
Object.keys(THEME_LOOK).forEach(t => {
  P('| `assets/backgrounds/battle_' + t + '.jpg` | ' + sz('bgBattle') + ' | 전투 배경 · ' + THEME_LOOK[t] + '. 위에서 70% 높이가 땅 | ' + mark('backgrounds/battle_' + t) + ' |');
});
P('| `assets/backgrounds/battle_{테마}_fore.png` | ' + sz('bgFore') + ' 투명 | (선택) 캐릭터 발 앞에 깔리는 앞쪽 장식 띠(풀 · 바위 · 얼음 조각 등) | |');
P('| `assets/backgrounds/world_map.jpg` | ' + SP.worldMap.size.join('×') + ' | 월드맵 — 왼쪽 무림(만독곡 · 청운문), 가운데 세계의 틈(검은 균열), 오른쪽 엘단 대륙(사막 · 설원 · 화산). 스테이지 13곳 위치는 ASSET_SPEC 5장 표 | ' + mark('backgrounds/world_map') + ' |');
P('| `assets/backgrounds/title.jpg` | ' + sz('bgScreen') + ' | 타이틀 — 두 세계가 맞닿은 하늘, 가운데 위는 제목 자리로 비운다(제목 글자는 게임이 쓴다) | ' + mark('backgrounds/title') + ' |');
P('| `assets/backgrounds/lobby.jpg` | ' + sz('bgScreen') + ' | 로비 — 원정대의 야영지(무림 천막과 엘단 마법 등불), 왼쪽에 동료 큰 그림이 서고 오른쪽에 메뉴 타일이 놓인다 | ' + mark('backgrounds/lobby') + ' |');
P('| `assets/backgrounds/dungeon_map.jpg` | ' + sz('bgScreen') + ' | 던전 지도 바탕 — 낡은 한지 · 양피지 지도(그 위에 방 아이콘과 길이 그려진다) | ' + mark('backgrounds/dungeon_map') + ' |');
P('');

// ---------------- 묶음 3 UI ----------------
P('## 묶음 3 — UI/UX 시안과 부품 (39단계)');
P('');
P('```');
P('[IMAGE REQUEST] 3-1 화면 시안');
P('용도: UI/UX 전면 개편의 기준. 1280×800 화면 시안 — 타이틀 · 로비 · 월드맵 · 던전 지도 · 전투 · 보상 · 상점 · 휴식 · 대장간 · 도감 · 기록 · 설정');
P('조건: 지금 게임의 기능과 정보는 모두 남긴다(무엇이 어디 있는지는 index.html 을 열어 확인). 글자는 시안에서만 쓰고 부품 그림에는 넣지 않는다');
P('결과물: 시안 이미지(assets/ui/mockups/*.png) + 부품 목록(아래 3-2) 제안');
P('```');
P('');
P('```');
P('[IMAGE REQUEST] 3-2 UI 부품');
P('후보: 패널 틀(9칸 늘이기용 — 모서리 · 가장자리를 가운데와 나눠 그린다), 버튼(보통 · 눌림 · 금빛 강조), 메뉴 타일, 리본 · 제목 띠, 체력 막대, 에너지 보석,');
P('      행동 예고 판, 툴팁 틀, 창 틀, 탭, 지도 방 표식, 카드 뒷면, 진행 막대, 구분선 장식');
P('크기 · 9칸 나누기 규칙은 3-1 시안을 본 뒤 Claude가 부품마다 정해 요청서를 갱신한다');
P('```');
P('');

// ---------------- 묶음 4 · 5 몬스터 ----------------
const monTable = list => {
  P('| id(파일 이름 앞부분) | 이름 | 테마 | 등급 · 크기 | 설명 | 공격 동작 힌트 | 상태 |');
  P('|---|---|---|---|---|---|---|');
  list.forEach(m => {
    const size = SP.monsterPose.sizes[m.rank].join('×');
    const atk = Object.keys(m.moves).map(k => m.moves[k].name).slice(0, 3).join(' · ');
    const st = ['idle', 'attack'].map(n => have('characters/monsters/' + m.id + '_' + n) ? n : '').filter(Boolean).join('·');
    P('| `' + m.id + '` | ' + m.name + ' | ' + (THEME[m.theme] || m.theme) + ' | ' + ({ normal: '일반', elite: '정예', boss: '보스', final: '최종 보스' })[m.rank] + ' · ' + size + ' | ' + plain(m.desc) + ' | ' + atk + ' | ' + st + ' |');
  });
  P('');
};
P('## 묶음 4 — 보스 · 정예 몬스터 (' + D.monsters.filter(m => m.rank !== 'normal').length + '종)');
P('');
P('파일: `assets/characters/monsters/{id}_{idle,attack,hit,down}.png` (투명, 정사각, 크기는 표). **왼쪽**을 본다. idle · attack 필수. 같은 테마끼리 색과 질감을 맞춘다.');
P('세계의 틈 몬스터 일부(메아리 · 잔영 · 공허)는 옛 세계의 몬스터가 틈에 비친 잔상이라 원래 몬스터를 청록 · 보랏빛으로 바꾼 모습이어도 된다. 그림자 6종(`shadow_*`)은 해당 동료 그림을 어두운 보라로 칠하고 붉은 눈.');
P('');
monTable(D.monsters.filter(m => m.rank !== 'normal'));
P('## 묶음 5 — 일반 몬스터 (' + D.monsters.filter(m => m.rank === 'normal').length + '종)');
P('');
P('파일 규칙은 묶음 4와 같다(512×512). `spore`(포자 버섯)는 `mushroom`의, `lava_blob`(용암 방울)은 `lava_slime`의 작은 조각이라 같은 모습을 작고 둥글게.');
P('');
monTable(D.monsters.filter(m => m.rank === 'normal'));

// ---------------- 묶음 6 카드 ----------------
P('## 묶음 6 — 카드 틀과 카드 그림');
P('');
P('### 6-1 카드 틀 (41단계, 3-1 시안 뒤)');
P('`assets/cards/frames/ink_{등급}.png`(무공 — 수묵 족자 느낌), `split_{등급}.png`(마법 · 융합 · 무계열 — 무림 붉은 옻칠과 엘단 푸른 별빛을 대각선으로 나눈 느낌), `duo.png`(합동기 — 두 동료의 색). 등급 `common uncommon rare epic legendary` 순으로 장식이 화려해진다. ' + SP.cardFrame.size.join('×') + ' 투명, 그림 창 · 글자 자리는 비운다.');
P('');
const owner = id => { const c = D.characters.find(x => x.id === id); return c ? c.name : id === 'common' ? '공용' : id === 'none' ? '방해' : id; };
const order = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
order.forEach((r, i) => {
  const list = D.cards.filter(c => c.rarity === r && c.owner !== 'none');
  P('### 6-' + (i + 2) + ' 카드 그림 — ' + RARITY[r] + ' (' + list.length + '장)');
  P('');
  P('파일: `assets/cards/art/{id}.png` · ' + sz('cardArt') + ' · 불투명 · 틀 · 글자 없이 그림 창을 꽉 채운다. 화면에서 약 98×81px로 작게 보인다.');
  P('');
  P('| id | 이름 | 주인 | 계열 · 유형 | 효과(그림 주제의 힌트) | 상태 |');
  P('|---|---|---|---|---|---|');
  list.forEach(c => P('| `' + c.id + '` | ' + c.name + ' | ' + owner(c.owner) + ' | ' + (G.SCHOOL_NAME[c.school] || '무계열') + ' · ' + (G.TYPE_NAME[c.type] || c.type) + ' | ' + plain(c.text) + ' | ' + mark('cards/art/' + c.id) + ' |'));
  P('');
});
P('### 6-7 합동기 · 방해 카드');
P('');
P('| id | 이름 | 주인 | 효과 | 상태 |');
P('|---|---|---|---|---|');
(D.duoCards || []).forEach(c => P('| `' + c.id + '` | ' + c.name + ' | ' + (c.duo || []).map(owner).join(' + ') + ' | ' + plain(c.text) + ' | ' + mark('cards/art/' + c.id) + ' |'));
D.cards.filter(c => c.owner === 'none').forEach(c => P('| `' + c.id + '` | ' + c.name + ' | 적이 섞어 넣는 방해 카드 | ' + plain(c.text) + ' | ' + mark('cards/art/' + c.id) + ' |'));
P('');

// ---------------- 묶음 7 아이콘 ----------------
P('## 묶음 7 — 아이콘 · 유물 · 소모품 (43단계)');
P('');
P('128×128 투명, 22~32px로 줄어도 알아보게. 아이콘은 `assets/icons/{status|intent|ui|map}/{이름}.png`(하위 폴더는 자유, 이름이 키).');
P('');
const stIcon = {};
Object.keys(D.statuses).forEach(k => { const s = D.statuses[k]; (stIcon[s.icon] = stIcon[s.icon] || []).push(s.name); });
const ICON_HINT = { attack: '행동 예고 — 공격', block: '행동 예고 — 방어 · 보호막', buff: '행동 예고 — 강화', debuff: '행동 예고 — 약화', special: '행동 예고 — 특수', energy: '에너지', gold: '골드', heart: '체력', deck: '덱', discard: '버린 더미', exhaust: '소멸 더미', crown: '보스 방', elite: '정예 방', campfire: '휴식 방', lock: '잠김', check: '완료', book: '도감', gear: '설정', event: '이벤트 방', shop: '상점 방', anvil: '대장간', skull: '몬스터 · 쓰러뜨린 적', chest: '보물 방', dice: '무작위', mirror: '거울', map: '지도', party: '편성', scroll: '이야기', stats: '기록', home: '로비', swap: '바꾸기', help: '도움말', unknown: '미지의 방', door: '입구', chest_open: '열린 상자' };
const iconNames = fs.readFileSync(path.join(ROOT, 'js/pixel.js'), 'utf8').match(/\n    ([a-z_]+): \{ pal:/g).map(s => s.trim().split(':')[0]);
P('| 아이콘 이름 | 뜻 | 상태 |');
P('|---|---|---|');
iconNames.forEach(n => P('| `' + n + '` | ' + (stIcon[n] ? '상태: ' + stIcon[n].join(' · ') : ICON_HINT[n] || (n.startsWith('r_') ? '유물 기본 아이콘(유물 그림이 없을 때)' : '')) + ' | ' + (fs.existsSync(path.join(ROOT, 'assets/icons')) && Object.keys(D.assets.files).some(k => k.startsWith('icons/') && k.endsWith('/' + n + '.png')) ? '있음' : '') + ' |'));
P('');
P('### 유물 (' + D.relics.length + '종) — `assets/items/relics/{id}.png`');
P('');
P('| id | 이름 | 등급 | 효과 | 상태 |');
P('|---|---|---|---|---|');
D.relics.forEach(r => P('| `' + r.id + '` | ' + r.name + ' | ' + (D.RELIC_RARITY || {})[r.rarity] + ' | ' + plain(r.desc) + ' | ' + mark('items/relics/' + r.id) + ' |'));
P('');
P('### 소모품 (' + D.items.length + '종) — `assets/items/consumables/{id}.png`');
P('');
P('| id | 이름 | 효과 | 상태 |');
P('|---|---|---|---|');
D.items.forEach(r => P('| `' + r.id + '` | ' + r.name + ' | ' + plain(r.desc) + ' | ' + mark('items/consumables/' + r.id) + ' |'));
P('');

// ---------------- 묶음 8 이야기 ----------------
P('## 묶음 8 — 이야기 · 이벤트 삽화 (44단계, 선택)');
P('');
P('| 파일 | 크기 | 장면 | 상태 |');
P('|---|---|---|---|');
(D.story || []).forEach(ch => P('| `assets/backgrounds/story/ch' + ch.n + '.jpg` | ' + sz('story') + ' | ' + ch.title + ' | ' + mark('backgrounds/story/ch' + ch.n) + ' |'));
(D.events || []).forEach(e => P('| `assets/backgrounds/events/' + e.id + '.jpg` | ' + sz('event') + ' | 이벤트 「' + e.name + '」 — ' + plain(e.text).slice(0, 70) + ' | ' + mark('backgrounds/events/' + e.id) + ' |'));
P('');

fs.writeFileSync(path.join(ROOT, 'docs/IMAGE_REQUESTS.md'), out.join('\n'));
console.log('docs/IMAGE_REQUESTS.md 를 썼다 (' + out.length + '줄)');
