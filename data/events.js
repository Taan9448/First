// events.js — 이벤트 노드 46종 (GAME_DESIGN.md 19.3절, 22단계에 15종 · 29단계에 10종 · 38단계에 동료 개인 이벤트 6종 추가)
// 선택지의 effects 는 이벤트 효과 목록이다. 처리는 js/stage.js 의 St.eventOp 가 맡는다.
//   gold{value}                  골드 증감
//   hp{who, value | pct}         who: leader(선두) · party(파티 전원) · random(파티 중 1명). 음수는 잃음(1 아래로는 안 내려감)
//                                pct 는 최대 체력 비율
//   card{minRarity | rarity, owner?} 미보유 카드 1장을 무작위로 얻음. owner: 'hero' 면 그 동료의 카드
//   cardChoice{count, minRarity} 미보유 카드 count장 중 1장 고르기
//   relic{pool}                  common(일반) · low(일반·고급) · any(보스 제외 전부)
//   upgrade{count}               보유 카드 강화
//   buff{name, battles, effects} 다음 battles번의 전투 시작 때 효과(아군 대상)
//   curse{card, count, battles}  다음 battles번의 전투 덱에 방해 카드
//   mirror{}                     다음 전투에 파티 중 무작위 캐릭터의 그림자가 함께 나온다
//   exp{value, who?}             파티 전원 경험치(9단계 캐릭터 성장에 쓰인다). who: 'hero' 면 그 동료만
//   bond{value, who?}            파티의 짝마다 친밀도(9단계). who: 'hero' 면 그 동료가 든 짝만
//   chance{p | crit, then, else} 확률 판정. crit:3 은 파티 최고 치명타 확률 × 3
//   fight{kind}                  이 자리에서 전투(kind: elite = 이 테마의 정예)
//   cutNext{}                    다음 열의 갈림길 하나를 없앤다
//   item{id | rarity}            (22단계) 소모품 1개. 칸이 가득 차면 골드 +25
//   purge{} · dup{}              (22단계) 스테이지 덱에서 카드 1장 빼기 · 1장 복제(고르는 화면)
// themes: 이 테마의 스테이지에서만 나온다(없으면 어디서나)
// need: 선택 조건(gold 이상). text: 결과 문구
// hero(38단계): 동료 개인 이벤트 — 그 동료가 파티에 있을 때만, 저장 칸마다 한 번. who: 'hero'(hp · exp · bond) · card{owner: 'hero'} 는 그 동료
Game.Data.events = [
  { id: 'E01', name: '수상한 상인', icon: 'gold',
    text: '두건을 깊게 눌러쓴 상인이 길을 막는다. "피 몇 방울이면 전설의 무기를 넘기지. 금화는 필요 없어."',
    choices: [
      { label: '체력 10을 낸다', desc: '선두 캐릭터 체력 -10, 무작위 전설 카드', effects: [{ op: 'hp', who: 'leader', value: -10 }, { op: 'card', rarity: 'legendary' }],
        text: '상인이 손끝의 피를 병에 담고, 낡은 천에 싼 물건을 건넸다.' },
      { label: '거절한다', desc: '아무 일도 없다', effects: [], text: '상인은 어깨를 으쓱하고 안개 속으로 사라졌다.' }
    ] },
  { id: 'E02', name: '저주받은 샘', icon: 'regen',
    text: '검붉은 물이 고인 샘. 물에서 은은한 생기가 느껴지지만, 바닥에 해골이 가라앉아 있다.',
    choices: [
      { label: '마신다', desc: '전원 체력 30% 회복, 다음 전투 첫 턴 아군 전체 약화 2', effects: [{ op: 'hp', who: 'all', pct: 0.3 },
        { op: 'buff', name: '샘의 저주', battles: 1, effects: [{ op: 'status', status: 'weak', value: 2, target: 'allAllies' }] }],
        text: '상처가 아물었다. 하지만 팔다리가 묘하게 무겁다.' },
      { label: '지나간다', desc: '아무 일도 없다', effects: [], text: '샘을 뒤로하고 길을 재촉했다.' }
    ] },
  { id: 'E03', name: '버려진 대장간', icon: 'anvil',
    text: '불씨가 아직 살아 있는 대장간. 모루 위에 쓸 만한 도구가 남아 있다.',
    choices: [
      { label: '무기를 손본다', desc: '카드 1장 강화', effects: [{ op: 'upgrade', count: 1 }], text: '쇳소리가 숲에 울려 퍼졌다.' },
      { label: '고철을 판다', desc: '골드 +30', effects: [{ op: 'gold', value: 30 }], text: '쓸 만한 고철을 모아 챙겼다.' }
    ] },
  { id: 'E04', name: '길 잃은 마차', icon: 'chest',
    text: '바퀴가 빠진 마차 옆에서 상인이 울상이다. "금화 50닢이면 짐 하나를 드리리다!"',
    choices: [
      { label: '골드 50을 낸다', desc: '무작위 일반·고급 유물', need: { gold: 50 }, effects: [{ op: 'gold', value: -50 }, { op: 'relic', pool: 'low' }],
        text: '상인이 짐 더미에서 반짝이는 물건 하나를 꺼냈다.' },
      { label: '그냥 간다', desc: '아무 일도 없다', effects: [], text: '마차를 지나쳐 갔다.' }
    ] },
  { id: 'E05', name: '고대 제단', icon: 'skull',
    text: '이끼 낀 제단에 붉은 문양이 빛난다. 무언가가 제물을 기다리고 있다.',
    choices: [
      { label: '피를 바친다', desc: '파티 전원 최대 체력의 15% 잃음, 무작위 희귀 이상 카드', effects: [{ op: 'hp', who: 'party', pct: -0.15 }, { op: 'card', minRarity: 'rare' }],
        text: '문양이 피를 삼키고, 제단 위에 무언가가 떠올랐다.' },
      { label: '기도만 한다', desc: '파티 전원 체력 8 회복', effects: [{ op: 'hp', who: 'party', value: 8 }], text: '고요한 기도 끝에 몸이 가벼워졌다.' }
    ] },
  { id: 'E06', name: '노름판', icon: 'dice',
    text: '길가 노름판의 사내가 주사위 통을 흔든다. "30닢 걸어! 이기면 두 배!"',
    choices: [
      { label: '골드 30을 건다', desc: '50% 확률로 골드 60, 아니면 잃음', need: { gold: 30 }, effects: [{ op: 'gold', value: -30 },
        { op: 'chance', p: 0.5, then: [{ op: 'gold', value: 60 }], else: [], thenText: '주사위가 6을 가리켰다. 노름꾼이 투덜대며 돈을 내놓았다.', elseText: '주사위는 1. 노름꾼이 낄낄대며 금화를 쓸어 갔다.' }],
        text: '' },
      { label: '무시한다', desc: '아무 일도 없다', effects: [], text: '노름꾼의 야유를 뒤로하고 걸었다.' }
    ] },
  { id: 'E07', name: '쓰러진 모험가', icon: 'skull',
    text: '길가에 낡은 갑옷을 입은 모험가가 쓰러져 있다. 짐 꾸러미가 그대로다.',
    choices: [
      { label: '짐을 뒤진다', desc: '골드 +40, 25% 확률로 정예 전투', effects: [{ op: 'gold', value: 40 },
        { op: 'chance', p: 0.25, then: [{ op: 'fight', kind: 'elite' }], else: [], thenText: '짐을 지키던 무언가가 덤벼든다!', elseText: '조용히 금화를 챙겼다.' }],
        text: '' },
      { label: '묻어 준다', desc: '파티 짝마다 친밀도 +3', effects: [{ op: 'bond', value: 3 }], text: '함께 흙을 덮으며 서로 말없이 고개를 끄덕였다.' }
    ] },
  { id: 'E08', name: '숲의 정령', icon: 'regen',
    text: '반딧불 같은 빛이 모여 작은 정령이 된다. 정령이 손을 내민다.',
    choices: [
      { label: '축복을 받는다', desc: '무작위 일반 유물', effects: [{ op: 'relic', pool: 'common' }], text: '정령이 웃으며 작은 선물을 남기고 흩어졌다.' },
      { label: '거절한다', desc: '아무 일도 없다', effects: [], text: '정령은 아쉬운 듯 빛을 깜박였다.' }
    ] },
  { id: 'E09', name: '낡은 비급서', icon: 'focus',
    text: '바위틈에 끼어 있는 책. 무공 비급인지 마법서인지 모를 글자가 빼곡하다. 펼치면 무언가 튀어나올 것 같다.',
    choices: [
      { label: '읽는다', desc: '고급 이상 카드 2장 중 1장, 무작위 아군 체력 8 잃음', effects: [{ op: 'hp', who: 'random', value: -8 }, { op: 'cardChoice', count: 2, minRarity: 'uncommon' }],
        text: '책장에서 불꽃이 튀었지만, 새로운 기술을 깨쳤다.' },
      { label: '덮는다', desc: '아무 일도 없다', effects: [], text: '책을 바위틈에 도로 밀어 넣었다.' }
    ] },
  { id: 'E10', name: '버려진 연무장', icon: 'strength',
    text: '문 닫은 무관의 연무장. 목인장과 목검이 그대로 남아 있다.',
    choices: [
      { label: '수련한다', desc: '파티 전원 경험치 +20, 파티 전원 체력 10% 잃음', effects: [{ op: 'exp', value: 20 }, { op: 'hp', who: 'party', pct: -0.1 }],
        text: '땀을 흘린 만큼 몸이 기억했다.' },
      { label: '지나간다', desc: '아무 일도 없다', effects: [], text: '연무장을 지나쳤다.' }
    ] },
  { id: 'E11', name: '모닥불 이야기', icon: 'campfire',
    text: '바람이 잦아든 밤. 모닥불이 유난히 따뜻하다.',
    choices: [
      { label: '밤새 이야기한다', desc: '파티 짝마다 친밀도 +5', effects: [{ op: 'bond', value: 5 }], text: '웃음소리가 새벽까지 이어졌다.' },
      { label: '일찍 잔다', desc: '전원 체력 15% 회복', effects: [{ op: 'hp', who: 'all', pct: 0.15 }], text: '오랜만에 깊이 잤다.' }
    ] },
  { id: 'E12', name: '무너진 다리', icon: 'attack',
    text: '협곡 위 다리가 반쯤 무너졌다. 건너편에 누군가 떨어뜨린 금화 주머니가 보인다.',
    choices: [
      { label: '뛰어넘는다', desc: '치명타 확률이 가장 높은 동료의 판정(확률 × 3). 성공 골드 +40, 실패 파티 전원 체력 8 잃음',
        effects: [{ op: 'chance', crit: 3, then: [{ op: 'gold', value: 40 }], else: [{ op: 'hp', who: 'party', value: -8 }],
          thenText: '훌쩍 뛰어넘어 주머니를 낚아챘다!', elseText: '발을 헛디뎌 모두 함께 굴러떨어졌다.' }], text: '' },
      { label: '돌아간다', desc: '다음 갈림길 하나가 사라진다', effects: [{ op: 'cutNext' }], text: '먼 길을 돌아가느라 갈 수 있는 길이 줄었다.' }
    ] },
  { id: 'E13', name: '거울의 방', icon: 'mirror',
    text: '벽 한 면이 거울인 방. 거울 속의 동료들이 한 박자 늦게 움직인다.',
    choices: [
      { label: '들여다본다', desc: '카드 1장 강화, 다음 전투에 거울 속 그림자(정예급)가 함께 나온다', effects: [{ op: 'upgrade', count: 1 }, { op: 'mirror' }],
        text: '거울 속 그림자가 씩 웃었다. 그리고 거울에서 사라졌다.' },
      { label: '깬다', desc: '골드 +20', effects: [{ op: 'gold', value: 20 }], text: '거울이 산산이 부서졌다. 조각 사이에서 금화가 굴러 나왔다.' }
    ] },
  { id: 'E14', name: '떠돌이 음유시인', icon: 'strength',
    text: '류트를 든 음유시인이 영웅담을 들려주겠다고 한다. "단돈 25닢!"',
    choices: [
      { label: '노래를 듣는다', desc: '골드 -25, 다음 3번의 전투 첫 턴 아군 전체 힘 +2', need: { gold: 25 }, effects: [{ op: 'gold', value: -25 },
        { op: 'buff', name: '영웅의 노래', battles: 3, effects: [{ op: 'status', status: 'tempStr', value: 2, target: 'allAllies' }] }],
        text: '노랫가락이 귓가에 맴돈다. 검을 쥔 손에 힘이 들어간다.' },
      { label: '사양한다', desc: '아무 일도 없다', effects: [], text: '음유시인은 다른 청중을 찾아 떠났다.' }
    ] },
  { id: 'E15', name: '봉인된 상자', icon: 'chest',
    text: '쇠사슬로 묶인 상자. 봉인 부적이 반쯤 떨어져 있다.',
    choices: [
      { label: '연다', desc: '50%: 무작위 유물(보스 유물 제외) / 50%: 다음 전투 덱에 모래 2장', effects: [
        { op: 'chance', p: 0.5, then: [{ op: 'relic', pool: 'any' }], else: [{ op: 'curse', card: 'SAND', count: 2, battles: 1 }],
          thenText: '상자 안에서 빛나는 유물이 나왔다!', elseText: '모래가 쏟아져 나와 짐 속으로 스며들었다.' }], text: '' },
      { label: '둔다', desc: '아무 일도 없다', effects: [], text: '봉인은 봉인된 채로 두었다.' }
    ] },
  // ---------------- 22단계: 이벤트 15종 (테마 9 + 공통 6) ----------------
  { id: 'E16', name: '약초 노파', icon: 'regen', themes: ['forest'],
    text: '만독곡 바위틈에서 노파가 약초를 말리고 있다. "독에 쓰러지기 싫으면 하나 사 가. 서른 닢이야."',
    choices: [
      { label: '골드 30을 낸다', desc: '소모품 회기단', need: { gold: 30 }, effects: [{ op: 'gold', value: -30 }, { op: 'item', id: 'I01' }], text: '노파가 쓴 냄새가 나는 환약을 쥐여 주었다.' },
      { label: '이야기를 듣는다', desc: '파티 전원 경험치 +20', effects: [{ op: 'exp', value: 20 }], text: '만독곡의 옛이야기가 밤늦도록 이어졌다.' },
      { label: '지나간다', desc: '아무 일도 없다', effects: [], text: '노파는 고개도 들지 않았다.' }
    ] },
  { id: 'E17', name: '흑풍채의 덫', icon: 'skull', themes: ['forest'],
    text: '길 한가운데 덫이 숨겨져 있다. 덫 너머로 흑풍채가 숨긴 짐 꾸러미가 보인다.',
    choices: [
      { label: '덫을 푼다', desc: '파티 최고 치명타 확률 × 3으로 성공: 일반·고급 유물 / 실패: 파티 전원 체력 -8', effects: [
        { op: 'chance', crit: 3, then: [{ op: 'relic', pool: 'low' }], else: [{ op: 'hp', who: 'party', value: -8 }],
          thenText: '덫이 소리 없이 풀렸다. 꾸러미 안에 쓸 만한 물건이 들어 있다.', elseText: '덫이 튀어 올라 모두 상처를 입었다.' }], text: '' },
      { label: '돌아간다', desc: '앞으로 이어진 통로 하나가 막힌다', effects: [{ op: 'cutNext' }], text: '덫을 피해 먼 길로 돌았다.' }
    ] },
  { id: 'E18', name: '오아시스', icon: 'regen', themes: ['desert'],
    text: '모래 언덕 너머로 야자수가 흔들린다. 맑은 물이 고인 작은 오아시스다.',
    choices: [
      { label: '쉬어 간다', desc: '파티 전원 체력 20% 회복', effects: [{ op: 'hp', who: 'party', pct: 0.2 }], text: '시원한 물에 모래 먼지를 씻어 냈다.' },
      { label: '물을 길어 간다', desc: '소모품 정심환', effects: [{ op: 'item', id: 'I09' }], text: '맑은 물을 약병에 담아 두었다.' }
    ] },
  { id: 'E19', name: '모래 속 석상', icon: 'skull', themes: ['desert'],
    text: '반쯤 묻힌 석상이 슬픈 얼굴로 하늘을 본다. 발치에 오래된 제물 그릇이 놓여 있다.',
    choices: [
      { label: '기도한다', desc: '스테이지 덱에서 카드 1장 빼기', effects: [{ op: 'purge' }], text: '마음이 가벼워졌다. 쓸데없는 기술 하나를 잊었다.' },
      { label: '부순다', desc: '골드 +45, 다음 전투 덱에 모래 2장', effects: [{ op: 'gold', value: 45 }, { op: 'curse', card: 'SAND', count: 2, battles: 1 }], text: '석상 속에 금화가 있었다. 모래가 우수수 쏟아졌다.' }
    ] },
  { id: 'E20', name: '사막 상단', icon: 'gold', themes: ['desert'],
    text: '낙타 상단이 모래도적에게 쫓기고 있다. 상단주가 소리친다. "도와주면 후히 사례하겠소!"',
    choices: [
      { label: '돕는다', desc: '정예 전투 (정예 보상)', effects: [{ op: 'fight', kind: 'elite' }], text: '모래 언덕 너머에서 거대한 그림자가 솟아올랐다.' },
      { label: '물건을 산다', desc: '골드 40, 소모품 1개', need: { gold: 40 }, effects: [{ op: 'gold', value: -40 }, { op: 'item' }], text: '상단주가 서둘러 짐을 풀었다.' },
      { label: '못 본 척한다', desc: '아무 일도 없다', effects: [], text: '상단은 모래바람 속으로 사라졌다.' }
    ] },
  { id: 'E21', name: '얼음 거울 호수', icon: 'mirror', themes: ['snow'],
    text: '꽁꽁 언 호수가 거울처럼 하늘을 비춘다. 얼음에 비친 모습이 한 박자 늦게 움직인다.',
    choices: [
      { label: '비춰 본다', desc: '스테이지 덱의 카드 1장 복제', effects: [{ op: 'dup' }], text: '얼음 속 그림자가 같은 기술을 따라 했다.' },
      { label: '얼음을 깬다', desc: '파티 전원 체력 10 회복', effects: [{ op: 'hp', who: 'party', value: 10 }], text: '얼음 아래 물고기로 따뜻한 국을 끓였다.' }
    ] },
  { id: 'E22', name: '눈보라 속 오두막', icon: 'campfire', themes: ['snow'],
    text: '눈보라를 뚫고 불빛이 새는 오두막에 닿았다. 늙은 나무꾼이 문을 열어 준다.',
    choices: [
      { label: '하룻밤 묵는다', desc: '파티 전원 체력 25% 회복, 다음 전투 첫 턴 아군 전체 한기 1', effects: [{ op: 'hp', who: 'party', pct: 0.25 },
        { op: 'buff', name: '몸이 덜 녹았다', battles: 1, effects: [{ op: 'status', status: 'chill', value: 1, target: 'allAllies' }] }], text: '푹 잤다. 손끝이 아직 시리다.' },
      { label: '장작을 패 준다', desc: '파티 전원 경험치 +25', effects: [{ op: 'exp', value: 25 }], text: '도끼질 끝에 나무꾼이 검술 이야기를 들려주었다.' }
    ] },
  { id: 'E23', name: '용암 대장장이', icon: 'anvil', themes: ['volcano'],
    text: '용암 강가에서 드워프 대장장이가 망치를 두드린다. "용암 불로 벼리면 무엇이든 단단해지지."',
    choices: [
      { label: '골드 60을 낸다', desc: '카드 2장 강화', need: { gold: 60 }, effects: [{ op: 'gold', value: -60 }, { op: 'upgrade', count: 2 }], text: '용암 불꽃 속에서 쇠가 새로 태어났다.' },
      { label: '풀무를 돌린다', desc: '선두 캐릭터 체력 -10, 카드 1장 강화', effects: [{ op: 'hp', who: 'leader', value: -10 }, { op: 'upgrade', count: 1 }], text: '땀범벅이 되어 풀무를 돌렸다.' }
    ] },
  { id: 'E24', name: '불새의 둥지', icon: 'chest', themes: ['volcano'],
    text: '절벽 위 둥지에 불타는 알이 놓여 있다. 어미 새는 보이지 않는다.',
    choices: [
      { label: '알을 가져간다', desc: '50%: 무작위 유물 / 50%: 정예 전투', effects: [
        { op: 'chance', p: 0.5, then: [{ op: 'relic', pool: 'any' }], else: [{ op: 'fight', kind: 'elite' }],
          thenText: '알껍데기 속에서 빛나는 깃털이 나왔다!', elseText: '하늘을 찢는 울음소리와 함께 불새가 내려왔다!' }], text: '' },
      { label: '그대로 둔다', desc: '파티의 짝마다 친밀도 +3', effects: [{ op: 'bond', value: 3 }], text: '둥지를 지켜보며 서로의 이야기를 나눴다.' }
    ] },
  { id: 'E25', name: '혈교 첩자', icon: 'mask', themes: ['castle'],
    text: '산문 그늘에서 붉은 두건의 첩자를 붙잡았다. "살려만 주면… 비급을 넘기겠다!"',
    choices: [
      { label: '심문한다', desc: '고급 이상 카드 2장 중 1장', effects: [{ op: 'cardChoice', count: 2, minRarity: 'uncommon' }], text: '첩자가 품에서 낡은 비급을 꺼냈다.' },
      { label: '골드를 받고 놓아준다', desc: '골드 +50, 다음 전투에 거울 속 그림자', effects: [{ op: 'gold', value: 50 }, { op: 'mirror' }], text: '첩자는 금화를 던지고 사라졌다. 뒤에서 수상한 기척이 느껴진다.' }
    ] },
  { id: 'E26', name: '청운문 서고', icon: 'book', themes: ['castle'],
    text: '불탄 서고에 비급 몇 권이 남아 있다. 혈교가 뒤진 흔적이 역력하다.',
    choices: [
      { label: '비급을 읽는다', desc: '선두 캐릭터 체력 -6, 희귀 이상 카드 3장 중 1장', effects: [{ op: 'hp', who: 'leader', value: -6 }, { op: 'cardChoice', count: 3, minRarity: 'rare' }], text: '밤을 새워 읽은 끝에 한 구절이 눈에 들어왔다.' },
      { label: '서고를 정리한다', desc: '스테이지 덱에서 카드 2장 빼기', effects: [{ op: 'purge' }, { op: 'purge' }], text: '흩어진 책을 정리하며 마음도 정리했다.' }
    ] },
  { id: 'E27', name: '떠돌이 연금술사', icon: 'shop',
    text: '등에 플라스크를 주렁주렁 단 연금술사가 다가온다. "단 하나뿐인 명약! 마흔 닢!"',
    choices: [
      { label: '골드 40을 낸다', desc: '희귀 소모품 1개', need: { gold: 40 }, effects: [{ op: 'gold', value: -40 }, { op: 'item', rarity: 'rare' }], text: '연금술사가 반짝이는 병을 건넸다.' },
      { label: '실험을 돕는다', desc: '50%: 소모품 2개 / 50%: 파티 전원 중독(다음 전투 첫 턴 중독 4)', effects: [
        { op: 'chance', p: 0.5, then: [{ op: 'item' }, { op: 'item' }], else: [{ op: 'buff', name: '실험의 부작용', battles: 1, effects: [{ op: 'status', status: 'poison', value: 4, target: 'allAllies' }] }],
          thenText: '실험이 성공했다! 연금술사가 남은 약을 나눠 주었다.', elseText: '연기가 피어오르고 모두 기침을 했다.' }], text: '' }
    ] },
  { id: 'E28', name: '수련의 폭포', icon: 'strength',
    text: '세찬 폭포 아래 평평한 바위가 있다. 옛 고수들이 내공을 닦던 자리라고 한다.',
    choices: [
      { label: '폭포 수련', desc: '파티 전원 경험치 +30, 체력 -5', effects: [{ op: 'exp', value: 30 }, { op: 'hp', who: 'party', value: -5 }], text: '물살을 견디며 내공을 닦았다.' },
      { label: '명상', desc: '스테이지 덱에서 카드 1장 빼기', effects: [{ op: 'purge' }], text: '물소리 속에서 잡념 하나가 씻겨 나갔다.' }
    ] },
  { id: 'E29', name: '재주 원숭이', icon: 'dice',
    text: '원숭이 한 마리가 금화를 굴리며 재주를 부린다. 손을 내밀면 무언가를 줄 것 같기도 하다.',
    choices: [
      { label: '손을 내민다', desc: '50%: 골드 +60 / 50%: 골드 -30', effects: [
        { op: 'chance', p: 0.5, then: [{ op: 'gold', value: 60 }], else: [{ op: 'gold', value: -30 }],
          thenText: '원숭이가 금화를 한 움큼 쥐여 주었다.', elseText: '원숭이가 주머니를 털어 달아났다!' }], text: '' },
      { label: '먹이를 준다', desc: '소모품 천리안 부적', effects: [{ op: 'item', id: 'I06' }], text: '원숭이가 답례로 낡은 부적을 내밀었다.' }
    ] },
  { id: 'E30', name: '세계의 틈 조각', icon: 'mirror',
    text: '허공에 손바닥만 한 틈이 떠 있다. 틈 너머로 다른 세계의 빛이 새어 나온다.',
    choices: [
      { label: '손을 넣는다', desc: '무작위 유물, 다음 전투 2번 덱에 모래 1장', effects: [{ op: 'relic', pool: 'any' }, { op: 'curse', card: 'SAND', count: 1, battles: 2 }], text: '무언가를 움켜쥐고 손을 빼냈다. 손가락 사이로 모래가 흘렀다.' },
      { label: '닫는다', desc: '파티 전원 경험치 +15', effects: [{ op: 'exp', value: 15 }], text: '틈이 사라지자 바람이 잦아들었다.' }
    ] },
  // ---------------- 29단계: 이벤트 10종 (테마 5 + 공통 5) ----------------
  { id: 'E31', name: '거미줄 동굴', icon: 'chest', themes: ['forest'],
    text: '끈끈한 거미줄이 동굴 입구를 겹겹이 덮었다. 안쪽에서 무언가 반짝인다.',
    choices: [
      { label: '헤치고 들어간다', desc: '파티 전원 체력 -6, 일반·고급 유물', effects: [{ op: 'hp', who: 'party', value: -6 }, { op: 'relic', pool: 'low' }], text: '거미줄에 온몸이 쓸렸지만, 먼저 온 이가 남긴 물건을 찾았다.' },
      { label: '돌아간다', desc: '아무 일도 없다', effects: [], text: '어둠 속에서 여러 개의 눈이 반짝였다.' }
    ] },
  { id: 'E32', name: '신기루 시장', icon: 'shop', themes: ['desert'],
    text: '모래 위에 천막이 늘어선 시장이 나타났다. 상인들의 얼굴이 아지랑이처럼 흔들린다.',
    choices: [
      { label: '골드 50을 낸다', desc: '고급 이상 카드 3장 중 1장', need: { gold: 50 }, effects: [{ op: 'gold', value: -50 }, { op: 'cardChoice', count: 3, minRarity: 'uncommon' }], text: '비급 한 권을 집어 들자 시장이 모래로 흩어졌다.' },
      { label: '구경만 한다', desc: '50%: 소모품 1개 / 50%: 아무 일도 없다', effects: [
        { op: 'chance', p: 0.5, then: [{ op: 'item' }], else: [],
          thenText: '발밑에 누군가 떨어뜨린 약병이 굴러 왔다.', elseText: '눈을 비비자 시장은 사라지고 모래만 남았다.' }], text: '' }
    ] },
  { id: 'E33', name: '얼어붙은 검객', icon: 'chill', themes: ['snow'],
    text: '빙벽 속에 검을 뽑아 든 검객이 그대로 얼어 있다. 검끝이 아직도 무언가를 겨눈다.',
    choices: [
      { label: '검세를 읽는다', desc: '선두 캐릭터 체력 -8, 희귀 이상 카드 1장', effects: [{ op: 'hp', who: 'leader', value: -8 }, { op: 'card', minRarity: 'rare' }], text: '한기에 손끝이 갈라졌지만 검객의 마지막 초식을 깨달았다.' },
      { label: '예를 갖춘다', desc: '카드 1장 강화', effects: [{ op: 'upgrade', count: 1 }], text: '빙벽 앞에 고개를 숙이자 마음이 맑아졌다.' }
    ] },
  { id: 'E34', name: '용암 온천', icon: 'burn', themes: ['volcano'],
    text: '바위틈에서 뜨거운 물이 솟는다. 김 사이로 붉은 광석이 반짝인다.',
    choices: [
      { label: '몸을 담근다', desc: '파티 전원 체력 30% 회복, 다음 전투 첫 턴 아군 전체 화상 2', effects: [{ op: 'hp', who: 'party', pct: 0.3 },
        { op: 'buff', name: '아직 뜨겁다', battles: 1, effects: [{ op: 'status', status: 'burn', value: 2, target: 'allAllies' }] }], text: '피로가 풀렸다. 살갗이 아직 화끈거린다.' },
      { label: '광석을 캔다', desc: '골드 +40', effects: [{ op: 'gold', value: 40 }], text: '붉은 광석을 자루에 담았다.' }
    ] },
  { id: 'E35', name: '무너진 연무장', icon: 'strength', themes: ['castle'],
    text: '청운문 제자들이 수련하던 연무장이다. 목인 몇 개가 아직 서 있다.',
    choices: [
      { label: '목인과 대련한다', desc: '파티 전원 경험치 +25, 파티의 짝마다 친밀도 +2', effects: [{ op: 'exp', value: 25 }, { op: 'bond', value: 2 }], text: '서로 자세를 바로잡아 주며 땀을 흘렸다.' },
      { label: '무기고를 뒤진다', desc: '고급 소모품 1개', effects: [{ op: 'item', rarity: 'uncommon' }], text: '먼지 쌓인 선반 뒤에 단약 하나가 남아 있었다.' }
    ] },
  { id: 'E36', name: '떠돌이 검객', icon: 'attack',
    text: '삿갓을 쓴 검객이 길가 바위에 앉아 있다. "지나가려면 한 수 겨루고 가시오."',
    choices: [
      { label: '비무를 청한다', desc: '파티 최고 치명타 확률 × 3으로 성공: 희귀 이상 카드 / 실패: 선두 캐릭터 체력 -12', effects: [
        { op: 'chance', crit: 3, then: [{ op: 'card', minRarity: 'rare' }], else: [{ op: 'hp', who: 'leader', value: -12 }],
          thenText: '검객이 검을 거두며 웃었다. "좋은 칼이군. 이걸 가져가시오."', elseText: '눈 깜짝할 새 검끝이 어깨를 스쳤다.' }], text: '' },
      { label: '술을 대접한다', desc: '골드 -25, 파티의 짝마다 친밀도 +3', need: { gold: 25 }, effects: [{ op: 'gold', value: -25 }, { op: 'bond', value: 3 }], text: '검객의 강호 이야기에 모두 밤늦도록 웃었다.' }
    ] },
  { id: 'E37', name: '점쟁이 노인', icon: 'scroll',
    text: '길모퉁이에 산통을 든 노인이 앉아 있다. "앞길이 궁금하지 않은가?"',
    choices: [
      { label: '점을 본다', desc: '골드 -20, 다음 전투 2번 시작 시 아군 전체 보호막 5', need: { gold: 20 }, effects: [{ op: 'gold', value: -20 },
        { op: 'buff', name: '길조', battles: 2, effects: [{ op: 'block', value: 5, target: 'allAllies' }] }], text: '"동쪽에서 귀인을 만나리라." 왠지 든든하다.' },
      { label: '손금을 내민다', desc: '50%: 일반 유물 / 50%: 다음 전투 2번 덱에 모래 1장', effects: [
        { op: 'chance', p: 0.5, then: [{ op: 'relic', pool: 'common' }], else: [{ op: 'curse', card: 'SAND', count: 1, battles: 2 }],
          thenText: '노인이 품에서 낡은 부적을 꺼내 주었다.', elseText: '"흉하구나." 노인이 모래 한 줌을 뿌렸다.' }], text: '' }
    ] },
  { id: 'E38', name: '버려진 수레', icon: 'chest',
    text: '바퀴가 빠진 수레가 길가에 기울어 있다. 주인은 보이지 않는다.',
    choices: [
      { label: '짐을 뒤진다', desc: '소모품 1개, 골드 +15', effects: [{ op: 'item' }, { op: 'gold', value: 15 }], text: '짐 꾸러미 속에서 쓸 만한 것을 찾았다.' },
      { label: '불을 피워 쉰다', desc: '파티 전원 체력 8 회복', effects: [{ op: 'hp', who: 'party', value: 8 }], text: '부서진 수레로 불을 피워 몸을 녹였다.' }
    ] },
  { id: 'E39', name: '고수의 무덤', icon: 'skull',
    text: '이끼 낀 비석에 이름 모를 고수의 무덤이라 적혀 있다. 무덤 앞에 녹슨 검이 꽂혀 있다.',
    choices: [
      { label: '절을 올린다', desc: '카드 1장 강화, 파티 전원 경험치 +10', effects: [{ op: 'upgrade', count: 1 }, { op: 'exp', value: 10 }], text: '바람결에 누군가의 칭찬이 들린 것 같았다.' },
      { label: '무덤을 연다', desc: '무작위 유물, 다음 전투에 거울 속 그림자', effects: [{ op: 'relic', pool: 'any' }, { op: 'mirror' }], text: '부장품을 챙기자 등 뒤로 서늘한 기척이 따라붙었다.' }
    ] },
  { id: 'E40', name: '두 세계의 다리', icon: 'mirror',
    text: '안개 위로 돌다리가 걸려 있다. 한쪽 끝은 무림의 산, 다른 끝은 엘단의 숲으로 이어진다.',
    choices: [
      { label: '다리를 건넌다', desc: '스테이지 덱의 카드 1장 복제, 1장 빼기', effects: [{ op: 'dup' }, { op: 'purge' }], text: '다리를 건너는 동안 익힌 것과 잊은 것이 하나씩 생겼다.' },
      { label: '다리 아래서 쉰다', desc: '파티 전원 체력 15% 회복, 경험치 +10', effects: [{ op: 'hp', who: 'party', pct: 0.15 }, { op: 'exp', value: 10 }], text: '두 세계의 바람이 번갈아 불어왔다.' }
    ] },

  // ---------------- 38단계: 동료 개인 이벤트(그 동료가 파티에 있을 때만, 저장 칸마다 한 번) ----------------
  // hero: 이 동료가 파티에 있어야 나온다. 효과의 who: 'hero' · owner: 'hero' 는 그 동료를 가리킨다
  { id: 'P01', name: '먹 가는 소리', icon: 'book', hero: 'kai',
    text: '버려진 서당 툇마루에 금 간 벼루와 몽당 먹이 놓여 있다. 하린이 걸음을 멈춘다. "금서각에서 밤마다 이 소리를 들었어. 사각, 사각… 먹 가는 소리."',
    choices: [
      { label: '먹을 갈아 검결을 옮겨 쓴다', desc: '하린 경험치 +40, 하린의 고급 이상 카드 1장', effects: [{ op: 'exp', who: 'hero', value: 40 }, { op: 'card', owner: 'hero', minRarity: 'uncommon' }],
        text: '하린이 붓을 세우자 먹 획마다 희미한 검기가 일었다. "천외검선도 이렇게 썼겠지. 한 획이 한 검이야."' },
      { label: '사부님께 편지를 쓴다', desc: '파티 전원 체력 15% 회복, 하린과 동료들의 친밀도 +3', effects: [{ op: 'hp', who: 'party', pct: 0.15 }, { op: 'bond', who: 'hero', value: 3 }],
        text: '"사부님, 저는 살아 있어요. 좋은 친구들이 생겼어요." 하린은 편지를 접어 품에 넣었다. 언젠가 직접 건넬 날을 위해.' }
    ] },
  { id: 'P02', name: '모래 속의 묘비', icon: 'shield', hero: 'bram',
    text: '모래에 반쯤 묻힌 은빛 묘비들이 줄지어 서 있다. 브리아가 투구를 벗었다. "……은빛 기사단. 내 형제들이다."',
    choices: [
      { label: '이름을 하나씩 부른다', desc: '브리아 경험치 +40, 다음 3번의 전투 첫 턴 아군 전체 보호막 6', effects: [{ op: 'exp', who: 'hero', value: 40 },
        { op: 'buff', name: '기사단의 맹세', battles: 3, effects: [{ op: 'block', value: 6, target: 'allAllies' }] }],
        text: '브리아는 묘비마다 이름을 불렀다. 마지막 이름을 부르고 나서야 고개를 들었다. "……이제 너희가 내 기사단이다."' },
      { label: '방패를 닦고 떠난다', desc: '브리아의 희귀 이상 카드 1장', effects: [{ op: 'card', owner: 'hero', minRarity: 'rare' }],
        text: '브리아는 말없이 방패의 모래를 털었다. 방패에 새겨진 십자가가 햇빛을 받아 빛났다.' }
    ] },
  { id: 'P03', name: '백 년 전의 연구 노트', icon: 'book', hero: 'lyra',
    text: '무너진 탑 아래에서 리라가 비명을 질렀다. "내 노트! 봉인되기 전에 숨겨 둔 거야! 백 년 동안 아무도 안 열어 봤어!"',
    choices: [
      { label: '미완성 공식을 완성한다', desc: '60% 확률로 리라의 영웅 이상 카드 1장, 아니면 리라 체력 -12', effects: [{ op: 'chance', p: 0.6,
        then: [{ op: 'card', owner: 'hero', minRarity: 'epic' }], else: [{ op: 'hp', who: 'hero', value: -12 }],
        thenText: '공식의 마지막 줄이 맞아떨어지자 노트가 빛으로 타올랐다. "됐다! 백 년 걸린 답이 이거였어!"', elseText: '펑! 노트 대신 리라의 앞머리가 타올랐다. "…괜찮아, 실패도 데이터야."' }],
        text: '' },
      { label: '하린에게 내공 공식을 묻는다', desc: '리라 경험치 +30, 리라와 동료들의 친밀도 +4', effects: [{ op: 'exp', who: 'hero', value: 30 }, { op: 'bond', who: 'hero', value: 4 }],
        text: '둘은 밤새 노트에 단전과 마나 회로를 그렸다. 리라는 "무림 수학"이라고 부르며 즐거워했다.' }
    ] },
  { id: 'P04', name: '깨진 종의 조각', icon: 'regen', hero: 'sera',
    text: '눈 속에서 금빛 쇳조각이 반짝인다. 세라가 무릎을 꿇고 조심스레 들어 올렸다. "수도원의 종이에요. 서리 여왕이 깨뜨린…."',
    choices: [
      { label: '조각을 안고 기도한다', desc: '파티 전원 체력 25% 회복, 세라 경험치 +30', effects: [{ op: 'hp', who: 'party', pct: 0.25 }, { op: 'exp', who: 'hero', value: 30 }],
        text: '세라의 기도에 조각이 맑게 울렸다. 지친 몸들이 종소리 속에서 조금씩 데워졌다.' },
      { label: '조각을 지팡이에 단다', desc: '세라의 희귀 이상 카드 1장, 일반·고급 유물', effects: [{ op: 'card', owner: 'hero', minRarity: 'rare' }, { op: 'relic', pool: 'low' }],
        text: '"언젠가 이 조각들을 다 모아 종을 다시 울릴 거예요." 지팡이 끝에서 작은 종소리가 났다.' }
    ] },
  { id: 'P05', name: '당가의 전서구', icon: 'poison', hero: 'nox',
    text: '다리에 붉은 끈을 묶은 비둘기가 소연의 어깨에 내려앉았다. "…당가의 전서구야. 이 세계까지 날아오다니, 할아버지가 보낸 거야."',
    choices: [
      { label: '답장을 보낸다', desc: '골드 -20, 소연 경험치 +40, 소연과 동료들의 친밀도 +3', need: { gold: 20 }, effects: [{ op: 'gold', value: -20 }, { op: 'exp', who: 'hero', value: 40 }, { op: 'bond', who: 'hero', value: 3 }],
        text: '"막내는 살아 있어요. 독도 잘 쓰고, 친구도 다섯이나 생겼어요." 소연은 모이를 넉넉히 주어 비둘기를 날려 보냈다.' },
      { label: '전서구가 물고 온 비급을 펼친다', desc: '소연 체력 -10, 소연의 희귀 이상 카드 1장', effects: [{ op: 'hp', who: 'hero', value: -10 }, { op: 'card', owner: 'hero', minRarity: 'rare' }],
        text: '쪽지에는 당가 비전의 독 배합이 적혀 있었다. 소연이 손끝으로 맛을 보고 얼굴을 찌푸렸다. "…역시 할아버지 독은 맵다."' }
    ] },
  { id: 'P06', name: '길 잃은 정령', icon: 'buff', hero: 'ciel',
    text: '얼어붙은 덤불 속에서 손톱만 한 빛이 떨고 있다. 시엘이 숨을 죽였다. "서리숲의 정령이야. 붉은 금에 쫓겨 여기까지 왔나 봐."',
    choices: [
      { label: '숨결로 녹여 준다', desc: '시엘 경험치 +30, 다음 2번의 전투 첫 턴 아군 전체 힘 +2', effects: [{ op: 'exp', who: 'hero', value: 30 },
        { op: 'buff', name: '정령의 축복', battles: 2, effects: [{ op: 'status', status: 'tempStr', value: 2, target: 'allAllies' }] }],
        text: '정령이 시엘의 손바닥에서 깨어나 파티 주위를 한 바퀴 돌았다. 바람이 등을 밀어 주는 것 같았다.' },
      { label: '숲으로 가는 길을 일러 준다', desc: '소모품 1개, 시엘과 동료들의 친밀도 +3', effects: [{ op: 'item' }, { op: 'bond', who: 'hero', value: 3 }],
        text: '정령은 북쪽으로 날아가며 반짝이는 씨앗 하나를 떨어뜨렸다. "고맙대. 숲에서 기다리겠대."' }
    ] }
];
// 38단계: 지나가는 이벤트 칸에서 개인 이벤트가 먼저 나올 확률(그 동료가 파티에 있고 아직 보지 않았을 때)
Game.Data.personalEventChance = 0.35;
Game.Data.eventById = Game.util.byId(Game.Data.events);
