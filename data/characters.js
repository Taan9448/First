// characters.js — 캐릭터 5명
// id 는 저장 데이터·카드 소유자에 쓰이므로 바꾸지 않는다. crit: 기본 치명타 확률
Game.Data.characters = [
  { id: 'kai', name: '카이', role: '공격', job: '검사', hp: 70, crit: 0.15, joinAfter: 0, color: '#d9534a',
    attackStyle: 'slash',
    desc: '몰락한 기사단의 마지막 검사. 마왕에게 빼앗긴 고향을 되찾으려 원정을 시작한다.' },
  { id: 'bram', name: '브리아', role: '탱커', job: '수호기사', hp: 95, crit: 0.05, joinAfter: 2, color: '#5b8fd9',
    attackStyle: 'bash',
    desc: '숲의 고목을 지키던 과묵한 수호기사. 고목이 타락에서 풀려나자 카이의 방패가 된다.' },
  { id: 'lyra', name: '리라', role: '마법', job: '원소술사', hp: 55, crit: 0.10, joinAfter: 4, color: '#a46ad9',
    attackStyle: 'cast',
    desc: '사막 유적에 갇혀 있던 천재 원소술사. 호기심이 많고 화력 조절을 못 한다.' },
  { id: 'sera', name: '세라', role: '회복', job: '사제', hp: 60, crit: 0.05, joinAfter: 6, color: '#e8c35a',
    attackStyle: 'cast',
    desc: '설원의 수도원에서 서리 여왕의 저주를 막아내던 사제. 누구도 잃지 않으려 한다.' },
  { id: 'nox', name: '녹스', role: '서포트', job: '책략가', hp: 60, crit: 0.20, joinAfter: 8, color: '#4fbf8a',
    attackStyle: 'stab',
    desc: '마왕군을 배신한 전직 참모. 화산 감옥에서 풀려난 뒤 마왕성의 길을 안내한다.' }
];
Game.Data.COMMON_CRIT = 0.05;
