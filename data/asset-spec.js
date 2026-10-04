// asset-spec.js — 36단계: ChatGPT 리소스 규격(크기 · 비율 · 투명 여부 · 폴더 · 파일 이름). 사람이 고치는 기준표
// tools/sync-assets.js(검사·목록 만들기) · js/assets.js(연결) · index.html?assets=1(확인 화면) · tools/gen-image-requests.js(요청서)가 모두 이 표를 쓴다.
// size: 권장 크기 [가로, 세로](px). 비율이 ±3% 안이고 권장 크기의 절반 이상이면 받는다. alpha: 투명 배경이어야 하는지
// 파일 이름의 {id}는 게임 데이터 id, {pose}는 동작 이름. 확장자는 .png(투명이 필요하면 반드시 png) · .jpg · .webp
Game.Data.assetSpec = {
  heroPose:    { dir: 'characters/heroes', name: '{id}_{pose}', size: [512, 512], alpha: true, poses: ['idle', 'attack', 'skill', 'hit', 'down'], need: ['idle', 'attack'],
                 desc: '전투 중 동료. 오른쪽(적 쪽)을 본다. 발이 아래 가운데에 닿고, 몸이 높이의 80~88%. 모든 동작이 같은 캔버스 · 같은 크기 · 같은 발 위치' },
  monsterPose: { dir: 'characters/monsters', name: '{id}_{pose}', sizes: { normal: [512, 512], elite: [768, 768], boss: [1024, 1024], final: [1024, 1024] }, alpha: true,
                 poses: ['idle', 'attack', 'hit', 'down'], need: ['idle', 'attack'],
                 desc: '전투 중 몬스터. 왼쪽(동료 쪽)을 본다. 발(떠 있으면 몸 아래)이 아래 가운데. 모든 동작이 같은 캔버스 · 같은 크기 · 같은 위치' },
  portrait:    { dir: 'characters/heroes', name: '{id}_portrait', size: [1024, 1536], alpha: true, desc: '동료 전신 일러스트(로비 큰 그림 · 이야기 화면). 무릎 위 또는 전신, 살짝 오른쪽을 보는 3/4 자세' },
  face:        { dir: 'characters/heroes', name: '{id}_face', size: [512, 512], alpha: true, desc: '필살기 컷인 얼굴(가슴 위). 얼굴이 가운데보다 조금 위' },
  cardArt:     { dir: 'cards/art', name: '{id}', size: [600, 500], alpha: false, desc: '카드 그림 창(가로 6 : 세로 5). 가장자리까지 채운 그림, 글자 넣지 않음' },
  cardFrame:   { dir: 'cards/frames', name: '{id}', size: [500, 700], alpha: true, desc: '카드 틀(5:7). 그림 창 · 이름 · 비용 · 본문 자리는 투명. {id} = ink_등급 · split_등급(등급: common uncommon rare epic legendary)' },
  bgBattle:    { dir: 'backgrounds', name: 'battle_{id}', size: [1920, 1080], alpha: false, desc: '전투 배경(16:9). 위에서 70% 높이쯤이 땅(캐릭터가 선다). 가운데는 차분하게(캐릭터·숫자가 잘 보이게)' },
  bgFore:      { dir: 'backgrounds', name: 'battle_{id}_fore', size: [1920, 240], alpha: true, desc: '(선택) 전투 앞쪽 장식 띠. 화면 맨 아래 캐릭터 발 앞에 깔린다' },
  bgScreen:    { dir: 'backgrounds', name: '{id}', size: [1920, 1080], alpha: false, desc: '화면 배경(타이틀 · 로비 · 던전 지도)' },
  worldMap:    { dir: 'backgrounds', name: 'world_map', size: [2000, 1120], alpha: false, desc: '월드맵(무림 · 세계의 틈 · 엘단). 스테이지 13곳의 좌표는 요청서 표를 따른다' },
  icon:        { dir: 'icons', name: '{id}', size: [128, 128], alpha: true, desc: '아이콘. 화면에서 22~32px로 줄어도 알아보게 굵고 단순하게. 하위 폴더(status · intent · ui · map)는 자유, 이름이 키' },
  relic:       { dir: 'items/relics', name: '{id}', size: [128, 128], alpha: true, desc: '유물 아이콘' },
  item:        { dir: 'items/consumables', name: '{id}', size: [128, 128], alpha: true, desc: '소모품 아이콘' },
  story:       { dir: 'backgrounds/story', name: '{id}', size: [1600, 900], alpha: false, desc: '이야기 장면 삽화' },
  event:       { dir: 'backgrounds/events', name: '{id}', size: [800, 450], alpha: false, desc: '이벤트 삽화' },
  ui:          { dir: 'ui', name: '{id}', alpha: true, desc: 'UI 부품(39단계에 시안과 함께 정한다)' },
  effect:      { dir: 'effects', name: '{id}', alpha: true, desc: '이펙트 그림(42단계에 정한다)' },
  // 프레임이 고른 스프라이트 시트(선택): 동작 파일 이름 뒤에 _s{프레임 수} — 예: kai_idle_s8.png 는 가로로 8칸, 칸마다 위 크기
  sheet: { suffix: '_s', fps: { idle: 8, attack: 14, skill: 14, hit: 12, down: 10 } }
};
