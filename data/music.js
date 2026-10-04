// music.js — 배경음악 곡 데이터(25단계). 소리는 js/music.js 가 Web Audio 로 합성한다(음원 파일 없음)
// 곡: { name, bpm, voices: [ { inst, vol, layer?, notes } ] }
//   notes: 8분음표 한 칸씩 공백으로 구분한 글자. '|' 는 마디 구분(무시), '.' 쉼, '-' 앞 음을 늘림
//     음표: 음이름+옥타브(A4, C#5, Bb3) · 화음(pad·stab): 'Am' 'F' 'G7' 'Bb' 'C#m' 'Esus4' 'F#dim'(+옥타브 숫자를 붙이면 그 옥타브, 기본 3)
//     북(drums): k 큰북 · s 작은북 · h 닫힌 하이햇 · o 열린 하이햇 · t 탐 · b 태고 · g 징. '+' 로 겹친다(k+h)
//   목소리마다 길이가 달라도 각자 되풀이한다(멜로디 16마디 위에 반주 8마디가 두 번 도는 식)
//   layer: 'battle' 은 전투 중에만, 'calm' 은 전투가 아닐 때만 들린다(없으면 늘)
//   alt: B 구간(변주)에서 칠 글자 · section: 'A'|'B' 그 구간에서만 · phase: 2|3 보스 페이즈 이상에서만(37단계, 아래 변주 표)
//   inst: pluck(고쟁·비파 뜯는 소리) · flute(죽적) · erhu(이호) · bell(종) · pad(현악 바탕) · stab(짧은 화음) · bass · subbass · brass(금관) · drums
// 화면 → 곡: 타이틀·로비·스토리 lobby, 던전·보상·휴식 그 스테이지 테마, 전투는 같은 테마 + 전투 층, 보스전 boss, 혈마 final
(function () {
  var R = '. . . . . . . .';           // 쉬는 마디
  var bars = function () { return Array.prototype.slice.call(arguments).join(' | '); };
  var rest = function (n) { var a = []; for (var i = 0; i < n; i++) a.push(R); return a.join(' | '); };
  var hold = function (chord) { return chord + ' - - - - - - -'; };   // 한 마디 내내 누르는 화음

  Game.Data.music = {
    lobby: {
      name: '청운의 밤', bpm: 72,
      voices: [
        { inst: 'pad', vol: 0.07, notes: bars(hold('Am'), hold('F'), hold('C'), hold('G'), hold('Am'), hold('F'), hold('Dm'), hold('E')) },
        { inst: 'pluck', vol: 0.09, notes: bars('A3 E4 A4 C5 E5 C5 A4 E4', 'F3 C4 F4 A4 C5 A4 F4 C4', 'C4 G4 C5 E5 G5 E5 C5 G4', 'G3 D4 G4 B4 D5 B4 G4 D4',
          'A3 E4 A4 C5 E5 C5 A4 E4', 'F3 C4 F4 A4 C5 A4 F4 C4', 'D4 A4 D5 F5 A5 F5 D5 A4', 'E3 B3 E4 G#4 B4 G#4 E4 B3') },
        { inst: 'flute', vol: 0.1, notes: bars('E5 - - - D5 C5 D5 -', 'C5 - A4 - - - . .', 'G4 - C5 - D5 - E5 -', 'D5 - - - - - . .',
          'E5 - G5 - A5 - G5 E5', 'D5 - C5 - A4 - C5 -', 'D5 - - - F5 - E5 D5', 'B4 - - - - - . .') + ' | ' + rest(8) },
        { inst: 'bass', vol: 0.11, notes: bars('A2 - - - - - - -', 'F2 - - - - - - -', 'C3 - - - - - - -', 'G2 - - - - - - -', 'A2 - - - - - - -', 'F2 - - - - - - -', 'D2 - - - - - - -', 'E2 - - - - - - -') }
      ]
    },
    // 1·2 스테이지 만독곡 — 무림의 독 골짜기. D 단조 오음계, 뜯는 소리 반복 위에 낮은 죽적
    forest: {
      name: '만독곡', bpm: 92,
      voices: [
        { inst: 'pad', vol: 0.05, notes: bars(hold('Dm'), hold('C'), hold('Bb'), hold('C'), hold('Dm'), hold('Bb'), hold('Gm'), hold('A')) },
        { inst: 'pluck', vol: 0.09, notes: bars('D4 . A4 . F4 . A4 C5', 'C4 . G4 . E4 . G4 C5', 'Bb3 . F4 . D4 . F4 Bb4', 'C4 . G4 . E4 . G4 A4',
          'D4 . A4 . F4 . A4 C5', 'Bb3 . F4 . D4 . F4 Bb4', 'G3 . D4 . Bb3 . D4 G4', 'A3 . E4 . C#4 . E4 A4') },
        { inst: 'flute', vol: 0.1, notes: bars('A4 - - - C5 - D5 -', 'C5 - - - A4 - G4 -', 'F4 - - - G4 - A4 -', 'G4 - - - - - . .',
          'A4 - C5 - D5 - F5 -', 'D5 - - - C5 - A4 -', 'G4 - Bb4 - A4 - G4 -', 'A4 - - - - - . .') + ' | ' + rest(8) },
        { inst: 'bass', vol: 0.12, notes: bars('D2 - - - D2 - A2 -', 'C2 - - - C2 - G2 -', 'Bb1 - - - Bb1 - F2 -', 'C2 - - - C2 - G2 -',
          'D2 - - - D2 - A2 -', 'Bb1 - - - Bb1 - F2 -', 'G1 - - - G1 - D2 -', 'A1 - - - A1 - E2 -') },
        { inst: 'drums', vol: 0.16, layer: 'battle', notes: bars('k . h . s . h k', 'k . h . s . h h', 'k . h k s . h .', 'k . h . s t t t') }
      ]
    },
    // 3·4 스테이지 타오르는 사막 — E 프리지안 도미넌트, 우드 같은 뜯는 소리와 다르부카
    desert: {
      name: '타오르는 사막', bpm: 100,
      voices: [
        { inst: 'pad', vol: 0.05, notes: bars(hold('E'), hold('F'), hold('G'), hold('F'), hold('E'), hold('Dm'), hold('F'), hold('E')) },
        { inst: 'pluck', vol: 0.09, notes: bars('E3 . B3 E4 F4 . E4 B3', 'F3 . C4 F4 A4 . F4 C4', 'G3 . D4 G4 B4 . G4 D4', 'F3 . C4 F4 A4 . F4 C4',
          'E3 . B3 E4 F4 . E4 B3', 'D3 . A3 D4 F4 . D4 A3', 'F3 . C4 F4 A4 . F4 C4', 'E3 . B3 E4 G#4 . E4 B3') },
        { inst: 'erhu', vol: 0.085, notes: bars('E5 - F5 - G#5 - F5 E5', 'F5 - - - E5 - D5 -', 'D5 - E5 - F5 - G#5 -', 'F5 - E5 - - - . .',
          'B4 - C5 - B4 - G#4 -', 'A4 - - - F4 - G#4 -', 'A4 - B4 - C5 - D5 -', 'E5 - - - - - . .') + ' | ' + rest(8) },
        { inst: 'bass', vol: 0.12, notes: bars('E2 - - - E2 - - E2', 'F2 - - - F2 - - F2', 'G2 - - - G2 - - G2', 'F2 - - - F2 - - F2',
          'E2 - - - E2 - - E2', 'D2 - - - D2 - - D2', 'F2 - - - F2 - - F2', 'E2 - - - E2 - - E2') },
        { inst: 'drums', vol: 0.15, layer: 'battle', notes: bars('k . h s . h k .', 'k . h s h h s .') },
        { inst: 'drums', vol: 0.08, layer: 'calm', notes: bars('k . . . . . h .', 'k . . . . . h h') }
      ]
    },
    // 5·6 스테이지 얼어붙은 설원 — F 리디안, 느린 종소리와 넓은 바탕
    snow: {
      name: '얼어붙은 설원', bpm: 66,
      voices: [
        { inst: 'pad', vol: 0.07, notes: bars(hold('F'), hold('G'), hold('F'), hold('G'), hold('Dm'), hold('Em'), hold('F'), hold('G')) },
        { inst: 'bell', vol: 0.07, notes: bars('F4 . C5 . E5 . A5 .', 'G4 . B4 . D5 . A5 .', 'F4 . C5 . E5 . A5 .', 'G4 . B4 . D5 . B5 .',
          'D4 . A4 . F5 . A5 .', 'E4 . B4 . G5 . B5 .', 'F4 . C5 . E5 . A5 .', 'G4 . D5 . B5 . D6 .') },
        { inst: 'flute', vol: 0.09, notes: rest(8) + ' | ' + bars('E5 - - - - - - -', 'D5 - - - B4 - - -', 'C5 - - - A4 - - -', 'B4 - - - - - - -',
          'A4 - - - F5 - - -', 'E5 - - - D5 - - -', 'C5 - - - E5 - - -', 'D5 - - - - - - -') },
        { inst: 'bass', vol: 0.1, notes: bars('F2 - - - - - - -', 'G2 - - - - - - -', 'F2 - - - - - - -', 'G2 - - - - - - -', 'D2 - - - - - - -', 'E2 - - - - - - -', 'F2 - - - - - - -', 'G2 - - - - - - -') },
        { inst: 'drums', vol: 0.14, layer: 'battle', notes: bars('k . . h s . h .', 'k . k h s . h h') }
      ]
    },
    // 7·8 스테이지 용암 화산 — C 화성 단조, 빠른 베이스 반복과 금관
    volcano: {
      name: '용암 화산', bpm: 132,
      voices: [
        { inst: 'stab', vol: 0.06, notes: bars('Cm . . Cm . . Cm .', 'Ab . . Ab . . Ab .', 'Bb . . Bb . . Bb .', 'G . . G . . G .') },
        { inst: 'subbass', vol: 0.13, notes: bars('C2 C2 G2 C2 C2 C2 Bb2 G2', 'Ab1 Ab1 Eb2 Ab1 Ab1 Ab1 G2 Eb2', 'Bb1 Bb1 F2 Bb1 Bb1 Bb1 Ab2 F2', 'G1 G1 D2 G1 G1 G1 B1 D2') },
        { inst: 'brass', vol: 0.075, notes: bars('C5 - - - Eb5 - D5 C5', 'Eb5 - - - - - . .', 'D5 - - - F5 - Eb5 D5', 'B4 - - - - - . .',
          'G5 - - - F5 - Eb5 -', 'Ab5 - G5 - F5 - Eb5 -', 'F5 - Eb5 - D5 - Bb4 -', 'B4 - - - D5 - G4 -') + ' | ' + rest(4) },
        { inst: 'drums', vol: 0.17, layer: 'battle', notes: bars('k . h k s . h .', 'k k h . s . h s', 'k . h k s . h .', 'k . t t s t t t') },
        { inst: 'drums', vol: 0.1, layer: 'calm', notes: bars('t . . . t . . .', 't . . . t . t .') }
      ]
    },
    // 9·10 스테이지 청운문 — G 단조 오음계, 고쟁 아르페지오 위에 이호, 전투에는 태고
    castle: {
      name: '청운문', bpm: 84,
      voices: [
        { inst: 'pad', vol: 0.06, notes: bars(hold('Gm'), hold('Eb'), hold('F'), hold('D'), hold('Gm'), hold('Eb'), hold('Cm'), hold('D')) },
        { inst: 'pluck', vol: 0.09, notes: bars('G3 D4 G4 Bb4 D5 Bb4 G4 D4', 'Eb3 Bb3 Eb4 G4 Bb4 G4 Eb4 Bb3', 'F3 C4 F4 A4 C5 A4 F4 C4', 'D3 A3 D4 F#4 A4 F#4 D4 A3',
          'G3 D4 G4 Bb4 D5 Bb4 G4 D4', 'Eb3 Bb3 Eb4 G4 Bb4 G4 Eb4 Bb3', 'C3 G3 C4 Eb4 G4 Eb4 C4 G3', 'D3 A3 D4 F#4 A4 F#4 D4 A3') },
        { inst: 'erhu', vol: 0.09, notes: bars('D5 - - - Bb4 - C5 D5', 'G5 - - - F5 - Eb5 -', 'F5 - - - D5 - C5 -', 'D5 - - - - - . .',
          'G5 - - - A5 - Bb5 -', 'A5 - G5 - F5 - D5 -', 'Eb5 - - - D5 - C5 -', 'D5 - - - - - . .') + ' | ' + rest(8) },
        { inst: 'bass', vol: 0.12, notes: bars('G2 - - - G2 - D2 -', 'Eb2 - - - Eb2 - Bb1 -', 'F2 - - - F2 - C2 -', 'D2 - - - D2 - A1 -',
          'G2 - - - G2 - D2 -', 'Eb2 - - - Eb2 - Bb1 -', 'C2 - - - C2 - G1 -', 'D2 - - - D2 - A1 -') },
        { inst: 'drums', vol: 0.18, layer: 'battle', notes: bars('b . . b . . b .', 'b . b . s . . .', 'b . . b . . b .', 'b . b . s . s s') }
      ]
    },
    // 보스전(정예 보스·중간 보스) — D 단조, 빠르고 무겁게
    boss: {
      name: '결전', bpm: 148,
      voices: [
        { inst: 'stab', vol: 0.065, notes: bars('Dm . . Dm . Dm . .', 'Bb . . Bb . Bb . .', 'C . . C . C . .', 'A . . A . A . .',
          'Dm . . Dm . Dm . .', 'Bb . . Bb . Bb . .', 'Gm . . Gm . Gm . .', 'A . . A . A . .') },
        { inst: 'subbass', vol: 0.13, notes: bars('D2 D2 D3 D2 D2 D3 D2 C3', 'Bb1 Bb1 Bb2 Bb1 Bb1 Bb2 Bb1 A2', 'C2 C2 C3 C2 C2 C3 C2 E2', 'A1 A1 A2 A1 A1 A2 C#2 E2',
          'D2 D2 D3 D2 D2 D3 D2 C3', 'Bb1 Bb1 Bb2 Bb1 Bb1 Bb2 Bb1 A2', 'G1 G1 G2 G1 G1 G2 G1 Bb1', 'A1 A1 A2 A1 A1 A2 C#2 E2') },
        { inst: 'brass', vol: 0.08, notes: bars('D5 - A4 - D5 - E5 F5', 'F5 - E5 - D5 - . .', 'E5 - C5 - E5 - F5 G5', 'E5 - - - C#5 - A4 -',
          'A5 - - - G5 F5 E5 D5', 'F5 - - - D5 - Bb4 -', 'Bb4 - D5 - G5 - F5 E5', 'E5 - - - A4 - C#5 E5') },
        { inst: 'drums', vol: 0.18, notes: bars('k h s h k k s h', 'k h s h k h s s', 'k h s h k k s h', 'k t s t k t t t') }
      ]
    },
    // 혈마 단목천 — E 단조와 나폴리 화음(F), 합창 같은 바탕과 징·태고
    final: {
      name: '혈마', bpm: 120,
      voices: [
        { inst: 'pad', vol: 0.08, notes: bars(hold('Em'), hold('C'), hold('Am'), hold('B'), hold('Em'), hold('F'), hold('B'), hold('B')) },
        { inst: 'subbass', vol: 0.13, notes: bars('E2 - - E2 - - E2 -', 'C2 - - C2 - - C2 -', 'A1 - - A1 - - A1 -', 'B1 - - B1 - - B1 -',
          'E2 - - E2 - - E2 -', 'F2 - - F2 - - F2 -', 'B1 - - B1 - - B1 -', 'B1 - - B1 - - B1 B1') },
        { inst: 'erhu', vol: 0.09, notes: bars('B4 - - - E5 - - -', 'G5 - - - F#5 - E5 -', 'E5 - - - C5 - A4 -', 'B4 - - - D#5 - F#5 -',
          'G5 - - - B5 - A5 G5', 'F5 - - - E5 - C5 -', 'B4 - C5 - B4 - A4 -', 'B4 - - - - - - -') },
        { inst: 'drums', vol: 0.19, notes: bars('g+b . . b k . s .', 'b . k b s . s s', 'b . . b k . s .', 'b . k b s t t t',
          'b . . b k . s .', 'b . k b s . s s', 'b . . b k . s .', 'b t b t s s s s') }
      ]
    }
  };

  // 31단계: 세계의 틈 — D 리디아(G#), 종 아르페지오가 허공에 떠다니고 죽적이 길게 운다. 전투에는 탐과 하이햇
  Game.Data.music.rift = {
    name: '세계의 틈', bpm: 90,
    voices: [
      { inst: 'pad', vol: 0.07, notes: bars(hold('D'), hold('E'), hold('C#m'), hold('Bm'), hold('D'), hold('E'), hold('F#m'), hold('E')) },
      { inst: 'bell', vol: 0.06, notes: bars('D4 . A4 . F#5 . G#5 .', 'E4 . B4 . G#5 . B5 .', 'C#4 . G#4 . E5 . G#5 .', 'B3 . F#4 . D5 . F#5 .',
        'D4 . A4 . F#5 . A5 .', 'E4 . B4 . G#5 . E5 .', 'F#4 . C#5 . A5 . F#5 .', 'E4 . G#4 . B4 . D5 .') },
      { inst: 'flute', vol: 0.08, notes: bars('F#5 - - - G#5 - A5 -', 'B5 - - - G#5 - E5 -', 'E5 - - - G#5 - C#6 -', 'B5 - - - - - . .',
        'A5 - - - G#5 - F#5 -', 'E5 - G#5 - B5 - - -', 'C#6 - - - A5 - F#5 -', 'G#5 - - - - - . .') + ' | ' + rest(8) },
      { inst: 'subbass', vol: 0.11, notes: bars('D2 - - - - - A1 -', 'E2 - - - - - B1 -', 'C#2 - - - - - G#1 -', 'B1 - - - - - F#1 -',
        'D2 - - - - - A1 -', 'E2 - - - - - B1 -', 'F#2 - - - - - C#2 -', 'E2 - - - - - B1 -') },
      { inst: 'drums', vol: 0.16, layer: 'battle', notes: bars('k . h . t . h .', 'k . h k s . h .', 'k . h . t . h t', 'k . h k s . t t') }
    ]
  };
  // 31단계: 고대 혈마 — C# 단조와 D 장화음(나폴리), 징·태고 위로 금관과 종이 부딪친다
  Game.Data.music.riftFinal = {
    name: '고대 혈마', bpm: 132,
    voices: [
      { inst: 'pad', vol: 0.08, notes: bars(hold('C#m'), hold('A'), hold('F#m'), hold('G#'), hold('C#m'), hold('D'), hold('G#'), hold('G#')) },
      { inst: 'subbass', vol: 0.13, notes: bars('C#2 C#2 C#3 C#2 C#2 C#3 C#2 B1', 'A1 A1 A2 A1 A1 A2 A1 G#1', 'F#1 F#1 F#2 F#1 F#1 F#2 F#1 A1', 'G#1 G#1 G#2 G#1 G#1 G#2 B#1 D#2',
        'C#2 C#2 C#3 C#2 C#2 C#3 C#2 B1', 'D2 D2 D3 D2 D2 D3 D2 C#2', 'G#1 G#1 G#2 G#1 G#1 G#2 G#1 G#1', 'G#1 G#1 G#2 G#1 B#1 D#2 G#2 G#2') },
      { inst: 'brass', vol: 0.08, notes: bars('C#5 - G#4 - C#5 - D#5 E5', 'E5 - C#5 - A4 - . .', 'F#5 - E5 - C#5 - A4 -', 'G#4 - - - B#4 - D#5 -',
        'E5 - - - G#5 F#5 E5 D#5', 'D5 - - - A4 - F#4 -', 'G#4 - B#4 - D#5 - G#5 -', 'G#5 - - - - - . .') },
      { inst: 'bell', vol: 0.05, notes: bars('C#6 . . . G#5 . . .', 'A5 . . . E5 . . .', 'F#5 . . . C#6 . . .', 'G#5 . . . D#6 . . .') },
      { inst: 'drums', vol: 0.19, notes: bars('g+b . . b k . s .', 'b . k b s . s s', 'b . . b k . s .', 'b . k b s t t t',
        'b . . b k . s .', 'b . k b s . s s', 'b . . b k . s .', 'b t b t s s s s') }
    ]
  };

  // ---------------- 37단계: 변주 구간 · 보스 페이즈 ----------------
  // 곡은 한 바퀴(목소리 길이들의 최소공배수)마다 A 구간 → B 구간(변주)을 번갈아 친다.
  //   vary(곡, 목소리 번호, 글자): 그 목소리가 B 구간에서 칠 변주 · add(곡, 목소리): 목소리를 더한다
  //   목소리의 section: 'B' → B 구간에서만 · phase: 2|3 → 보스가 그 페이즈 이상일 때만(페이즈 2부터는 늘 B 구간, 빠르기 × phaseTempo)
  var M = Game.Data.music;
  var vary = function (id, i, notes) { M[id].voices[i].alt = notes; };
  var add = function (id, v) { M[id].voices.push(v); };

  // 로비 — 죽적이 한 옥타브 위에서 대답하고, 종이 화음 꼭대기를 짚는다
  vary('lobby', 2, bars('A5 - - - G5 E5 G5 -', 'F5 - E5 - C5 - . .', 'E5 - G5 - C6 - B5 A5', 'B5 - - - G5 - . .',
    'C6 - B5 - A5 - E5 -', 'F5 - E5 - C5 - A4 -', 'D5 - F5 - A5 - G5 F5', 'E5 - - - G#5 - . .') + ' | ' + rest(8));
  add('lobby', { inst: 'bell', vol: 0.035, section: 'B', notes: bars('. . . . E6 . . .', '. . . . C6 . . .', '. . . . G5 . . .', '. . . . D6 . . .',
    '. . . . E6 . . .', '. . . . A5 . . .', '. . . . F5 . . .', '. . . . B5 . . .') });

  // 만독곡 — 뜯는 소리가 쉼 없이 흐르고, 죽적이 높이 올라간다. 북은 끝 마디를 채운다
  vary('forest', 1, bars('D4 F4 A4 D5 A4 F4 D4 A3', 'C4 E4 G4 C5 G4 E4 C4 G3', 'Bb3 D4 F4 Bb4 F4 D4 Bb3 F3', 'C4 E4 G4 C5 G4 E4 C4 G3',
    'D4 F4 A4 D5 A4 F4 D4 A3', 'Bb3 D4 F4 Bb4 F4 D4 Bb3 F3', 'G3 Bb3 D4 G4 D4 Bb3 G3 D3', 'A3 C#4 E4 A4 E4 C#4 A3 E3'));
  vary('forest', 2, bars('D5 - - - F5 - A5 -', 'G5 - E5 - C5 - . .', 'D5 - - - F5 - D5 -', 'C5 - - - E5 - G5 -',
    'F5 - - - A5 - D6 -', 'D6 - C6 - Bb5 - F5 -', 'G5 - Bb5 - D6 - C6 Bb5', 'A5 - - - C#6 - . .') + ' | ' + rest(8));
  vary('forest', 4, bars('k . h . s . h k', 'k . h k s . h h', 'k . h k s . h .', 's s t t t t s s'));

  // 타오르는 사막 — 이호가 높은 음에서 내려오며 꺾이고, 북이 엇박을 친다
  vary('desert', 2, bars('B5 - - - G#5 - F5 E5', 'F5 - A5 - - - F5 -', 'G5 - F5 - D5 - B4 -', 'C5 - - - A4 - . .',
    'E5 - F5 - E5 - D5 -', 'D5 - F5 - A5 - F5 -', 'F5 - E5 - C5 - A4 -', 'B4 - - - G#4 - . .') + ' | ' + rest(8));
  vary('desert', 4, bars('k . h s k h s .', 'k k h s t t s s'));
  add('desert', { inst: 'flute', vol: 0.05, section: 'B', notes: rest(8) + ' | ' + bars('E6 - - - - - . .', 'F6 - - - - - . .', 'D6 - - - - - . .', 'C6 - - - - - . .',
    'B5 - - - - - . .', 'A5 - - - - - . .', 'C6 - - - - - . .', 'B5 - - - - - . .') });

  // 얼어붙은 설원 — 종이 위에서 아래로 떨어지고, 죽적이 더 높이 운다
  vary('snow', 1, bars('A5 . E5 . C5 . F4 .', 'A5 . D5 . B4 . G4 .', 'A5 . E5 . C5 . F4 .', 'B5 . D5 . B4 . G4 .',
    'A5 . F5 . A4 . D4 .', 'B5 . G5 . B4 . E4 .', 'A5 . E5 . C5 . F4 .', 'D6 . B5 . D5 . G4 .'));
  vary('snow', 2, rest(8) + ' | ' + bars('C6 - - - - - A5 -', 'B5 - - - G5 - - -', 'A5 - - - F5 - E5 -', 'D5 - - - - - - -',
    'F5 - - - A5 - - -', 'G5 - - - B5 - - -', 'A5 - - - G5 - E5 -', 'D5 - - - - - . .'));
  vary('snow', 4, bars('k . . h s . h h', 'k k . h s . s s'));

  // 용암 화산 — 금관이 한 옥타브 위로 치솟고, 끝 마디는 북이 몰아친다
  vary('volcano', 2, bars('G5 - - - Ab5 - G5 Eb5', 'C5 - Eb5 - Ab5 - . .', 'F5 - - - D5 - Bb4 D5', 'D5 - - - B4 - G4 -',
    'C5 - Eb5 - G5 - C6 -', 'C6 - Bb5 - Ab5 - Eb5 -', 'D5 - F5 - Bb5 - Ab5 -', 'G5 - - - F5 - D5 -') + ' | ' + rest(4));
  vary('volcano', 3, bars('k . h k s k h s', 'k k h k s . h s', 'k . h k s k h s', 's s s s t t t t'));

  // 청운문 — 이호의 두 번째 노래, 죽적의 긴 대답, 태고가 굴러간다
  vary('castle', 2, bars('G5 - - - F5 - D5 -', 'Eb5 - G5 - Bb5 - G5 -', 'A5 - - - F5 - C5 -', 'D5 - - - F#5 - A5 -',
    'Bb5 - - - A5 - G5 -', 'G5 - - - Eb5 - Bb4 -', 'C5 - Eb5 - G5 - F5 Eb5', 'D5 - - - - - . .') + ' | ' + rest(8));
  vary('castle', 4, bars('b . b . b . s .', 'b . b b s . s .', 'b . . b . b b .', 'b b s s b b s s'));
  add('castle', { inst: 'flute', vol: 0.055, section: 'B', notes: bars('. . . . D6 - - -', '. . . . G5 - - -', '. . . . C6 - - -', '. . . . A5 - - -',
    '. . . . D6 - - -', '. . . . Bb5 - - -', '. . . . G5 - - -', '. . . . F#5 - - -') });

  // 세계의 틈 — 종이 거꾸로 흐르고, 죽적이 균열 너머로 올라간다
  vary('rift', 1, bars('F#5 . D5 . A4 . D4 .', 'G#5 . E5 . B4 . E4 .', 'G#5 . E5 . C#5 . G#4 .', 'F#5 . D5 . B4 . F#4 .',
    'A5 . F#5 . D5 . A4 .', 'B5 . G#5 . E5 . B4 .', 'A5 . F#5 . C#5 . F#4 .', 'D5 . B4 . G#4 . E4 .'));
  vary('rift', 2, bars('A5 - - - B5 - A5 F#5', 'G#5 - - - E5 - B4 -', 'C#6 - - - B5 - G#5 -', 'F#5 - - - D5 - . .',
    'D6 - - - C#6 - A5 -', 'B5 - G#5 - E5 - - -', 'F#5 - A5 - C#6 - E6 -', 'D6 - - - B5 - . .') + ' | ' + rest(8));
  vary('rift', 4, bars('k . h t t . h .', 'k . h k s . h h', 'k t h . t . h t', 't t s t t s t t'));

  // 결전(보스) — B 구간은 금관의 두 번째 노래. 페이즈 2: 종의 급한 반복 + 열린 하이햇, 페이즈 3: 이호가 높이 운다
  M.boss.phaseTempo = 1.06;
  vary('boss', 2, bars('A5 - - - F5 - D5 -', 'D5 - F5 - Bb5 - A5 G5', 'G5 - - - E5 - C5 -', 'C#5 - E5 - A5 - G5 -',
    'F5 - A5 - D6 - C6 -', 'Bb5 - A5 - F5 - D5 -', 'D5 - G5 - Bb5 - A5 G5', 'A5 - - - - - . .'));
  vary('boss', 3, bars('k h s h k k s s', 'k h s k k h s s', 'k k s h k k s h', 's s s s t t t t'));
  add('boss', { inst: 'bell', vol: 0.04, phase: 2, notes: bars('D6 . A5 . D6 . A5 .', 'D6 . Bb5 . D6 . Bb5 .', 'E6 . C6 . E6 . C6 .', 'E6 . C#6 . E6 . C#6 .',
    'D6 . A5 . D6 . A5 .', 'D6 . Bb5 . D6 . Bb5 .', 'D6 . Bb5 . D6 . Bb5 .', 'E6 . C#6 . E6 . C#6 .') });
  add('boss', { inst: 'drums', vol: 0.09, phase: 2, notes: bars('o . o . o . o .', 'o . o . o . o o') });
  add('boss', { inst: 'erhu', vol: 0.05, phase: 3, notes: bars('D6 - - - - - - -', 'D6 - - - - - - -', 'E6 - - - - - - -', 'E6 - - - - - - -',
    'F6 - - - - - - -', 'F6 - - - - - - -', 'G6 - - - - - - -', 'E6 - - - - - - -') });

  // 혈마 — B 구간은 이호가 한 옥타브 위에서 비명처럼. 페이즈 2: 금관 합창, 페이즈 3: 종이 몰아친다
  M.final.phaseTempo = 1.05;
  vary('final', 2, bars('E6 - - - D#6 - B5 -', 'C6 - - - G5 - E5 -', 'A5 - - - C6 - E6 -', 'D#6 - - - F#6 - B5 -',
    'B5 - - - G5 - E5 -', 'A5 - - - F5 - C6 -', 'B5 - A5 - F#5 - D#5 -', 'B4 - - - - - - -'));
  vary('final', 3, bars('g+b . . b k . s s', 'b . k b s s s s', 'b . . b k b s .', 'b . k b s t t t',
    'b . . b k . s s', 'b b k b s . s s', 'b . . b k . s .', 'b t b t b t b t'));
  add('final', { inst: 'brass', vol: 0.065, phase: 2, notes: bars('E5 - - - B4 - E5 -', 'E5 - - - G5 - - -', 'E5 - - - C5 - A4 -', 'F#5 - - - D#5 - B4 -',
    'G5 - - - E5 - B4 -', 'A5 - - - F5 - C5 -', 'B5 - - - F#5 - D#5 -', 'B5 - - - - - . .') });
  add('final', { inst: 'bell', vol: 0.035, phase: 3, notes: bars('E6 . B5 . E6 . B5 .', 'E6 . C6 . E6 . C6 .', 'E6 . C6 . E6 . A5 .', 'D#6 . B5 . D#6 . F#6 .',
    'E6 . B5 . E6 . B5 .', 'F6 . C6 . F6 . A5 .', 'D#6 . B5 . F#6 . B5 .', 'D#6 . B5 . F#6 . B5 .') });

  // 고대 혈마 — B 구간은 금관의 두 번째 노래. 페이즈 2: 이호가 높이, 페이즈 3: 열린 하이햇이 몰아친다
  M.riftFinal.phaseTempo = 1.05;
  vary('riftFinal', 2, bars('G#5 - - - E5 - C#5 -', 'C#5 - E5 - A5 - G#5 -', 'A5 - - - F#5 - C#5 -', 'B#4 - D#5 - G#5 - F#5 -',
    'E5 - G#5 - C#6 - B5 -', 'A5 - F#5 - D5 - A4 -', 'G#4 - - - B#4 - D#5 -', 'G#5 - - - - - . .'));
  vary('riftFinal', 4, bars('g+b . . b k . s s', 'b . k b s s s s', 'b . . b k b s .', 'b . k b s t t t',
    'b . . b k . s s', 'b b k b s . s s', 'b . . b k . s .', 'b t b t b t b t'));
  add('riftFinal', { inst: 'erhu', vol: 0.055, phase: 2, notes: bars('C#6 - - - B5 - G#5 -', 'A5 - - - C#6 - E6 -', 'F#5 - - - A5 - C#6 -', 'B#5 - - - D#6 - - -',
    'E6 - - - C#6 - G#5 -', 'F#6 - - - D6 - A5 -', 'G#5 - B#5 - D#6 - F#6 -', 'G#6 - - - - - . .') });
  add('riftFinal', { inst: 'drums', vol: 0.09, phase: 3, notes: bars('o . o . o . o .', 'o o o . o . o o') });

  // 스테이지 테마 → 곡(거울의 방은 청운문)
  Game.Data.MUSIC_FOR_THEME = { forest: 'forest', desert: 'desert', snow: 'snow', volcano: 'volcano', castle: 'castle', rift: 'rift', mirror: 'castle' };
})();
