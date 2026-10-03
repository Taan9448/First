// events.js — 이벤트 노드 30종 (GAME_DESIGN.md 19.3절, 22단계에 15종 추가)
// 선택지의 effects 는 이벤트 효과 목록이다. 처리는 js/stage.js 의 St.eventOp 가 맡는다.
//   gold{value}                  골드 증감
//   hp{who, value | pct}         who: leader(선두) · party(파티 전원) · random(파티 중 1명). 음수는 잃음(1 아래로는 안 내려감)
//                                pct 는 최대 체력 비율
//   card{minRarity | rarity}     미보유 카드 1장을 무작위로 얻음
//   cardChoice{count, minRarity} 미보유 카드 count장 중 1장 고르기
//   relic{pool}                  common(일반) · low(일반·고급) · any(보스 제외 전부)
//   upgrade{count}               보유 카드 강화
//   buff{name, battles, effects} 다음 battles번의 전투 시작 때 효과(아군 대상)
//   curse{card, count, battles}  다음 battles번의 전투 덱에 방해 카드
//   mirror{}                     다음 전투에 파티 중 무작위 캐릭터의 그림자가 함께 나온다
//   exp{value}                   파티 전원 경험치(9단계 캐릭터 성장에 쓰인다)
//   bond{value}                  파티의 짝마다 친밀도(9단계)
//   chance{p | crit, then, else} 확률 판정. crit:3 은 파티 최고 치명타 확률 × 3
//   fight{kind}                  이 자리에서 전투(kind: elite = 이 테마의 정예)
//   cutNext{}                    다음 열의 갈림길 하나를 없앤다
//   item{id | rarity}            (22단계) 소모품 1개. 칸이 가득 차면 골드 +25
//   purge{} · dup{}              (22단계) 스테이지 덱에서 카드 1장 빼기 · 1장 복제(고르는 화면)
// themes: 이 테마의 스테이지에서만 나온다(없으면 어디서나)
// need: 선택 조건(gold 이상). text: 결과 문구
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
    ] }
];
Game.Data.eventById = Game.util.byId(Game.Data.events);
