// characters.js — 캐릭터 5명 (15단계: 무림 + 마법 세계관)
// id 는 저장 데이터·카드 소유자에 쓰이므로 바꾸지 않는다(kai = 하린, nox = 소연). crit: 기본 치명타 확률, voice: 로비 대사(12단계), en: 로비의 영문 이름
// school: 그 캐릭터 카드의 기본 계열(martial 무공 · magic 마법). 카드마다 따로 정할 수 있다(data/cards.js)
Game.Data.characters = [
  { id: 'kai', en: 'SEO HARIN', name: '하린', role: '공격', job: '검객', hp: 70, crit: 0.15, joinAfter: 0, color: '#d9534a', school: 'martial',
    attackStyle: 'slash', fullName: '서하린',
    desc: '청운문의 가난한 외문 제자. 사형 단목천의 누명을 쓰고 벼랑에서 떨어졌다. 천외검선의 기연으로 두 세계의 검과 마나를 함께 다룬다.',
    voice: ['사부님은 아직 살아 계셔. 그러니 난 멈출 수 없어.', '검은 하나, 길은 둘. 무공과 마법, 둘 다 내 것이야.', '단목천… 네가 훔친 건 비급만이 아니야.', '배고픈 건 익숙해. 지는 건 익숙하지 않아.'] },
  { id: 'bram', en: 'BRIA', name: '브리아', role: '탱커', job: '수호기사', hp: 95, crit: 0.05, joinAfter: 2, color: '#5b8fd9', school: 'martial',
    attackStyle: 'bash',
    desc: '엘단 대륙 은빛 기사단의 마지막 수호기사. 사막 끝 오아시스에서 세계의 틈으로 떨어진 하린을 처음 발견했다.',
    voice: ['……방패는 내가 든다. 넌 앞만 봐라.', '네 세계의 검술은 이상하다. ……하지만 강하다.', '무리하지 마라. 다 함께 돌아가는 게 원정이다.', '……준비는 끝났다.'] },
  { id: 'lyra', en: 'LYRA', name: '리라', role: '마법', job: '엘프 원소술사', hp: 55, crit: 0.10, joinAfter: 4, color: '#a46ad9', school: 'magic',
    attackStyle: 'cast',
    desc: '파라오의 무덤에 백 년 동안 봉인되어 있던 엘프 원소술사. 하린의 내공을 보고 마나의 새 공식을 찾았다며 들떠 있다.',
    voice: ['하린, 그 내공이라는 거 한 번만 더 보여 줘! 공식 좀 적게!', '불꽃이 좀 크게 나가도 이해해 줘. 일부러 그런 거 아니야.', '무림이라는 세계, 마법진은 없대도 기는 있다며? 완전 궁금해!', '오늘은 몇 마리나 태울 수 있을까?'] },
  { id: 'sera', en: 'SERA', name: '세라', role: '회복', job: '사제', hp: 60, crit: 0.05, joinAfter: 6, color: '#e8c35a', school: 'magic',
    attackStyle: 'cast',
    desc: '설원의 수도원에서 서리 여왕의 저주를 버텨 온 사제. 하린의 사부를 덮친 혈고를 신성력으로 풀 수 있을지도 모른다.',
    voice: ['다친 곳은 없나요? 출발하기 전에 꼭 말해 주세요.', '누구도 잃지 않을 거예요. 그게 제 기도니까요.', '하린 씨의 사부님도, 꼭 함께 구해요.', '천천히, 하지만 멈추지 말고 가요.'] },
  { id: 'nox', en: 'DANG SOYEON', name: '소연', role: '서포트', job: '암기술사', hp: 60, crit: 0.20, joinAfter: 8, color: '#4fbf8a', school: 'martial',
    attackStyle: 'stab', fullName: '당소연',
    desc: '사천당가의 막내. 독공과 암기의 달인. 일 년 전 단목천의 혈마대법이 연 틈에 휩쓸려 엘단으로 떨어졌고, 화룡의 둥지에 갇혀 있었다.',
    voice: ['당가의 암기는 빗나가지 않아. 빗나간 척할 뿐이지.', '단목천 그 자식, 내 몫까지 남겨 둬.', '독은 약이 되기도 해. 쓰는 사람에 따라서.', '……돌아가는 길은 내가 안다. 따라와.'] }
];
Game.Data.COMMON_CRIT = 0.05;
