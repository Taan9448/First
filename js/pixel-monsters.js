// pixel-monsters.js — 몬스터 36종 도트 스프라이트 (왼쪽을 바라본다)
// 형식은 pixel.js 머리말과 GAME_DESIGN.md 2.3절. 같은 종류의 변형은 Pixel.alias 로 색만 바꾼다.
(function () {
  'use strict';
  var P = Game.Pixel;

  // ---------------- 속삭이는 숲 ----------------
  P.def('slime', {
    pal: { a: '#6fd36a', A: '#3f9a46', w: '#ffffff', e: '#1d2b1e', m: '#2b6e33' },
    flat: 'ewm',
    half: [
      '.....aaa',
      '...aaaaa',
      '..aaaaaa',
      '.aawaaaa',
      '.awwaeea',
      'aaaaaeea',
      'aaaaaaaa',
      'aaaaaamm',
      'aAaaaaaa',
      'AAAaaaaa',
      '.AAAAAAA'
    ],
    breathe: 4
  });

  P.def('mushroom', {
    pal: { r: '#d9473f', R: '#9c2b2b', w: '#fff4e0', s: '#efe0c4', S: '#c9b28c', e: '#2a1b3d', m: '#8a5040' },
    flat: 'em',
    half: [
      '.....rrr',
      '...rrrrr',
      '..rrwwrr',
      '.rrrwwrr',
      '.rrrrrrw',
      'rrwwrrrr',
      'rrwwrrrr',
      'RRRRRRRR',
      '...sssss',
      '...seess',
      '...seess',
      '...sssmm',
      '...sssss',
      '..SSSSSS'
    ],
    breathe: 7
  });

  P.def('forest_wolf', {
    pal: { a: '#8a8f9e', A: '#5c6070', c: '#c8ccd6', e: '#ffd23f', k: '#2a1b3d', t: '#ffffff', n: '#2a1b3d' },
    flat: 'ekn',
    rows: [
      '..a.a...................',
      '..aaaa..................',
      '.aaeaaa.................',
      'naaaaaaa................',
      'nntttaaaaaaaaaaaaaa.....',
      '...cccaaaaaaaaaaaaaaa...',
      '....ccaaaaaaaaaaaaaaaaa.',
      '.....aaaaaaaaaaaaaaa.aaa',
      '.....aaAAAAAAAAAaaa...aa',
      '.....aa.aa....aa.aa.....',
      '.....aa.aa....aa.aa.....',
      '.....AA.AA....AA.AA.....'
    ],
    breathe: 4
  });

  P.def('vine', {
    pal: { g: '#5fbf4f', G: '#357a35', l: '#9be36a', e: '#ffe066', k: '#2a1b3d', r: '#e05a8a' },
    flat: 'ek',
    rows: [
      '....r.......r...',
      '...rrr..l..rrr..',
      '....g..lll..g...',
      '.l..gg.ggg.gg..l',
      'lll..gggggggg.ll',
      '.g..ggkeeekgg.g.',
      '.gg.gggeeeggg.g.',
      '..ggggggggggggg.',
      '...gggGgggGggg..',
      '....ggGgggGgg...',
      '..lgggGgggGgggl.',
      '.ll.gGG.g.GGg.ll',
      '...gG..ggg..Gg..',
      '..GG..gG.Gg..GG.'
    ],
    breathe: 7
  });

  P.def('goblin', {
    pal: { g: '#7cc95a', G: '#4e8f3a', e: '#ffdb4d', k: '#2a1b3d', a: '#7a5233', A: '#4f3420', w: '#e9e4d6', s: '#cfd6e0' },
    flat: 'ek',
    rows: [
      '................',
      'gg....gggg....gg',
      '.ggg.gggggg.ggg.',
      '..gggggggggggg..',
      '....ggekggekg...',
      '....gggggggggg..',
      '....ggwgwgwggg..',
      '.....gggggggg...',
      '...aaaaaaaaaaa..',
      '..gaaAaaaaAaaag.',
      's.gaaAaaaaAaaag.',
      'sgg.aaaaaaaaa.gg',
      's...AAAAAAAAA...',
      '.....gg...gg....',
      '.....gg...gg....',
      '....GGG...GGG...'
    ],
    breathe: 8
  });

  P.def('giant_spider', {
    pal: { a: '#5a3f7a', A: '#3a2852', r: '#d94a6a', e: '#ff5a5a', w: '#ffd0d0', l: '#43305e' },
    flat: 'ew',
    half: [
      '...........',
      '.......aaaa',
      '.....aaaaaa',
      '....aaaraaa',
      '....aaarraa',
      'l...aaaaaaa',
      '.l..aaaaaaa',
      '..l.aaewaew',
      '..lllaeeaee',
      '.l...aaaaaa',
      'l...llaaaaw',
      '...l..lAAAA',
      '..l..l..lAA',
      '.l..l..l...',
      'l..l..l....'
    ],
    breathe: 7
  });

  P.def('treant', {
    pal: { b: '#7a5233', B: '#4f3420', g: '#4fae4a', G: '#2f7a35', l: '#8fdc6a', e: '#ffcf4d', k: '#1a1028', m: '#2a1b10' },
    flat: 'ekm',
    half: [
      '......llll..',
      '...lllgggggg',
      '..lgggggGggg',
      '.lggGggggggg',
      'lgggggggGggg',
      'lggggGgggggg',
      '.gggggggggGg',
      '..gGgg.gggbb',
      '....bbbbbbbb',
      '...bbbbBbbbb',
      'b..bkkkbbbBb',
      'bb.bkeekbbbb',
      '.bbbbkkbbbbb',
      '..bbbbbbbbbB',
      '...bbBbmmmmm',
      '...bbBbbmbmb',
      '...bbbbbbbbb',
      '...bbbBbbbbb',
      '..bbbbBbbbbb',
      '.bbBbbbbbBbb',
      'bbB.bbb..bbb',
      'bB..Bb....Bb'
    ],
    breathe: 9
  });

  // ---------------- 타오르는 사막 ----------------
  P.def('scorpion', {
    pal: { a: '#d9a85a', A: '#8a6230', k: '#3a2410', e: '#ff5a3a' },
    flat: 'ek',
    rows: [
      '..........aaaa........',
      '.........a....aa......',
      '........kk......a.....',
      '.................a....',
      '.................aa...',
      '.......aaaaaaaaaaaa...',
      'aa....aaaaaaaaaaaaa...',
      'aaa..aaeaAaaaAaaaAa...',
      '.aaaaaaaaAaaaAaaaAa...',
      'aaa..aaAAAAAAAAAAAa...',
      'aa....aa.aa.aa.aa.....',
      '.....a..a..a..a..a....'
    ],
    breathe: 5
  });

  P.def('cactus', {
    pal: { g: '#5fbf4f', G: '#357a35', w: '#f2e6a0', r: '#ff6a9a', y: '#ffe066', e: '#1a1028', m: '#7a2a2a', p: '#c97a45', P: '#8a4a25' },
    flat: 'em',
    half: [
      '......r',
      '.....ry',
      '....ggg',
      '...gwgg',
      'g..gggg',
      'gw.gggg',
      'gg.gegg',
      'ggggggg',
      '.gggggm',
      '...gwgg',
      '...gggg',
      '...gGgg',
      '...gggg',
      '..ppppp',
      '..PPPPP',
      '...PPPP'
    ],
    breathe: 8
  });

  P.def('bandit', {
    pal: { t: '#e8d8b0', T: '#b8a880', s: '#d9a37f', e: '#1a1028', c: '#b33a3a', v: '#7a5aa8', V: '#4a2f66', b: '#c9a441',
      p: '#3a3550', l: '#5a3b28', w: '#e3eaf4', K: '#9aa7b8' },
    flat: 'e',
    rows: [
      '.......tttt.....',
      '......tttttt....',
      'w....tttTtttt...',
      'ww...ttsssstt...',
      '.w...tseessst...',
      '.ww..tcccccct...',
      '..w...cccccc....',
      '..wb.vvvvvvvv...',
      '...sbvvvbvvvvv..',
      '....vvvvbvvvvvs.',
      '.....vVvbvvVv.s.',
      '.....bbbbbbbbb..',
      '.....ppppppppp..',
      '.....pppp.pppp..',
      '.....ppp...ppp..',
      '.....ppp...ppp..',
      '....llll...llll.'
    ],
    breathe: 7
  });

  P.def('mummy', {
    pal: { b: '#e6dcc0', B: '#b3a888', k: '#2a1b10', e: '#ffd23f' },
    flat: 'ke',
    half: [
      '....bbbb',
      '...bBbbb',
      '..bbbbbB',
      '..bBbbbb',
      '..bkkbbb',
      '..bkkBbb',
      '..bbbbbb',
      '...bBbbb',
      '....bbbb',
      '.bbbbBbb',
      'bbBbbbbb',
      'bb.bbBbb',
      'Bb.bbbbB',
      'bb.bBbbb',
      '...bbbbb',
      '...bbBbb',
      '...bbb..',
      '...bbb..',
      '...bBb..',
      '..bbbb..'
    ],
    over: [{ x: 3, y: 4, rows: ['e'] }],
    breathe: 9
  });

  P.def('sand_spirit', {
    pal: { s: '#e6c27a', S: '#b08f45', w: '#fff3c0', e: '#5a3410' },
    flat: 'e',
    half: [
      '.....sss',
      '...sssss',
      '..sswwss',
      '.ssssSss',
      '.sseesss',
      '.sseesss',
      '..ssssss',
      '...sSsss',
      '....ssss',
      '.....sss',
      '....sSss',
      '...sss..',
      '.....ss.',
      '......ss',
      '.......s'
    ],
    over: [{ x: -2, y: 5, rows: ['s..', '.s.', '..s'] }, { x: 17, y: 8, rows: ['..s', '.s.', 's..'] }],
    breathe: 7
  });

  P.def('sandworm', {
    pal: { a: '#d9a85a', A: '#8a6230', m: '#5a1a1a', w: '#fff3c0', r: '#d94a4a', s: '#e6c27a' },
    flat: 'mwr',
    half: [
      '....aaaaaa',
      '..aaaaaaaa',
      '.aaawawawa',
      '.aawmmmmmm',
      'aaawmmmmmm',
      'aaammmmrrr',
      'aaawmmmmmm',
      '.aawmmmmmm',
      '.aaawawawa',
      '..aaaaaaaa',
      '...aaaaaaa',
      '...AAAAAAA',
      '....aaaaaa',
      '....aaaaaa',
      '....AAAAAA',
      '...aaaaaaa',
      '..aaaaaaaa',
      'ssssssssss',
      'ssssssssss'
    ],
    breathe: 10
  });

  P.def('pharaoh', {
    pal: { y: '#f0c75e', Y: '#b08f2a', u: '#2f5fb0', U: '#1f3f80', s: '#c9905a', e: '#1a1028', r: '#d94a4a', w: '#f4f1ea', W: '#c9c3b6' },
    flat: 'er',
    half: [
      '........yyy',
      '......yyyyy',
      '.....yuyuyy',
      '....yuyuyyy',
      '....uyuysss',
      '...yuyussss',
      '...uyuysess',
      '...yuyussss',
      '...uyuyssss',
      '...yuyusssr',
      '..uyuyuyssy',
      '..yuyuyyyyy',
      '.uuyyuuyyuu',
      '.yyuuyyuuyy',
      '..swwwwwwww',
      '.sswwwwwwww',
      '.ss.wwwwwww',
      '....wwwyyyy',
      '....wwwwwyw',
      '....wwwwWyw',
      '....wwwwwyw',
      '...wwwWwwyw',
      '...wwwwwwyw',
      '..wwwwWwwyw',
      '..uuuuuuuuu'
    ],
    over: [{ x: -1, y: 4, rows: ['yy.', 'y.Y', '..Y', '..Y', '..Y', '..Y', '..Y', '..Y', '..Y', '..Y', '..Y', '..Y', '..Y', '..Y', '..Y', '..Y', '..Y', '..Y', '..Y', '..Y'] }],
    breathe: 11
  });

  // ---------------- 얼어붙은 설원 ----------------
  P.def('snow_rabbit', {
    pal: { w: '#f4f6fb', W: '#b8c4d6', p: '#ffb0c0', e: '#1a1028' },
    flat: 'ep',
    half: [
      '..ww...',
      '.wpw...',
      '.wpw...',
      '.wpw...',
      '.www...',
      '..wwwww',
      '.wwwwww',
      '.wewwww',
      '.wwwwwp',
      '..wwwww',
      '.wwwwww',
      'wwwwwww',
      'wWwwwww',
      '.WW.WWW'
    ],
    breathe: 7
  });

  P.alias('frost_wolf', 'forest_wolf', { a: '#cfe6f5', A: '#8fb0cc', c: '#ffffff', e: '#7fe3ff' });

  P.def('frost_spirit', {
    pal: { i: '#9fe6ff', I: '#4fa8d9', w: '#ffffff', e: '#1a3a5a' },
    flat: 'ew',
    half: [
      '.......i',
      '......ii',
      '.....iwi',
      '....iiwi',
      '...iiiii',
      '..iiiiii',
      '.iieeiii',
      'iiieeiii',
      '.iiiiiii',
      '..iiiIii',
      '...iiiii',
      '....iiIi',
      '.....iii',
      '......ii',
      '.......i'
    ],
    over: [{ x: -3, y: 2, rows: ['i', 'i'] }, { x: 18, y: 10, rows: ['i', 'i'] }, { x: 16, y: 1, rows: ['w'] }],
    breathe: 7
  });

  P.def('yeti', {
    pal: { f: '#e9f1f7', F: '#a9bccf', s: '#8fb0cc', e: '#1a1028', m: '#3a2a4a', w: '#ffffff' },
    flat: 'emw',
    half: [
      '......ffff',
      '....ffffff',
      '...fffffff',
      '..ffffffff',
      '..ffssssss',
      '..ffseesss',
      '..ffssssss',
      '..ffsmmmmm',
      '..ffswmwmm',
      '.fffffffff',
      'ffffffffff',
      'ffFfffffff',
      'ffFffffFff',
      'fffffffFff',
      'ss.fffffff',
      'ss.fffffff',
      '...fffff..',
      '...ffff...',
      '..ssss....',
      '..ssss....'
    ],
    breathe: 9
  });

  P.def('ice_witch', {
    pal: { c: '#e6fbff', i: '#9fe6ff', h: '#e6f0ff', H: '#a9c8e6', s: '#dfe6f5', e: '#1a3a6a', m: '#7a8fd9',
      r: '#4f7fc8', R: '#2f4f8f', f: '#8fb0cc' },
    flat: 'em',
    rows: [
      '..i....c.c.c......',
      '.iii...ccccc......',
      '..i..hhhhhhhh.....',
      '..f.hhhhhhhhhh....',
      '..f.hhssssshhh....',
      '..f.hsesseshhh....',
      '..f.hssssssshh....',
      '..f.hhssmsshhh....',
      '..f.hhhsssshhhh...',
      '..fs.rrrrrrrhhh...',
      '..fsrrrRrrrrrhh...',
      '..f.rrrRrrrrrrh...',
      '..f.rrrRrrrrrr....',
      '..f.rrrRrrrrrr....',
      '..f.rrRrrrrrrrr...',
      '..f.rrRrrrrrrrr...',
      '..frrrRrrrrrrrrr..',
      '..frrRrrrrrrrrrr..',
      '..frrRrrrrrrrrrrr.',
      '..RRRRRRRRRRRRRRR.'
    ],
    breathe: 9
  });

  P.def('glacier_golem', {
    pal: { i: '#9fd0ef', I: '#5a8fb3', w: '#e6fbff', e: '#1fd8ff' },
    flat: 'e',
    half: [
      '......iiiiii',
      '.....iiwiiii',
      '.....iiiiiii',
      '.....ieeiiii',
      '.....iiiiiIi',
      '...iiiiiiiii',
      '.iiiiwiiiiii',
      'iiiiiiiiiIii',
      'iiiIiiiiiiii',
      'iiii.iiiiiii',
      'iiwi.iiiIiii',
      'iiii.iiiiiii',
      'iIii.iiiiiii',
      '.ii..iiiiiii',
      '.....iiiIiii',
      '.....iiii...',
      '....iiiii...',
      '....iiIii...',
      '...iiiiii...',
      '...IIIIII...'
    ],
    breathe: 5
  });

  P.def('frost_queen', {
    pal: { c: '#e6fbff', C: '#7fe3ff', h: '#cfe6f5', H: '#8fb0cc', s: '#eef3fa', e: '#3a5a9a', m: '#7a8fd9',
      g: '#7fb8e6', G: '#4f7fb3', w: '#ffffff', i: '#9fe6ff' },
    flat: 'em',
    half: [
      '......c...c',
      '.....cc..cc',
      '.....cCccCc',
      '.....cccccc',
      '....hhhhhhh',
      '...hhhhhhhh',
      '...hhssssss',
      '...hhseesss',
      '...hhssssss',
      '...hhsssssm',
      '...hhhsssss',
      '..hhhh.wwww',
      '..hhhgggwgg',
      '..hhgggggwg',
      '..hsgggGgwg',
      '..ssgggGggg',
      '...ggggGggg',
      '...gggGgggg',
      '...gggGgggg',
      '..ggggGgggg',
      '..gggGggggg',
      '.gggGgggggg',
      '.ggGggggggg',
      'gggGggggggg',
      'GGGGGGGGGGG'
    ],
    over: [{ x: -1, y: 9, rows: ['.C.', 'CwC', '.C.', '.i.', '.i.', '.i.', '.i.', '.i.', '.i.', '.i.', '.i.', '.i.', '.i.', '.i.', '.i.'] }],
    breathe: 11
  });

  // ---------------- 용암 화산 ----------------
  P.def('fire_imp', {
    pal: { r: '#e0584a', R: '#9c2f2a', h: '#3a2a2a', e: '#ffe066', w: '#ffffff', v: '#7a2a3a' },
    flat: 'ew',
    half: [
      '..h.....',
      '..hh....',
      '...hrrrr',
      '..rrrrrr',
      'v.rreerr',
      'vvrrrrrr',
      'vvrrwrwr',
      'vv.rrrrr',
      'v.rrrrrr',
      '..rrRrrr',
      '...rrrrr',
      '...rrRrr',
      '....rr..',
      '....rr..',
      '...RRR..'
    ],
    over: [{ x: 1, y: 10, rows: ['R..', '.R.', '..R', 'RR.'] }],
    breathe: 8
  });

  P.alias('lava_slime', 'slime', { a: '#ff8a3d', A: '#c24a1f', w: '#ffe066', e: '#3a1010', m: '#7a1a10' });

  P.def('fire_bat', {
    pal: { b: '#7a2a20', w: '#c24a2f', W: '#7a2418', e: '#ffe066', f: '#ffffff' },
    flat: 'ef',
    half: [
      'w.......b..',
      'ww......bb.',
      'www...wbbbb',
      'wwww.wwbebb',
      'wWwwwwwbbbb',
      'wWwWwwwbbfb',
      '.WwWwWwbbbb',
      '..WwWwWbbbb',
      '...W.W.bbbb',
      '........bbb',
      '.........bb'
    ],
    breathe: 4
  });

  P.def('magma_golem', {
    pal: { k: '#5a4444', K: '#2f2222', l: '#ff8a3d', L: '#ffd23f', e: '#ffd23f' },
    flat: 'elL',
    half: [
      '......kkkkkk',
      '.....kkkkkkk',
      '.....klkkkkk',
      '.....keekkkk',
      '.....kkkkklk',
      '...kkkkkkkkk',
      '.kkkkLkkkkkk',
      'kkkklkkkkkkk',
      'kkKklkkklkkk',
      'kkkk.kkklLkk',
      'klkk.kkkkkkk',
      'kLkk.kkKkkkk',
      'kkkk.kkkklkk',
      '.kk..kkkkLkk',
      '.....kkKkkkk',
      '.....kkkk...',
      '....kkklk...',
      '....kkkkk...',
      '...kkKkkk...',
      '...KKKKKK...'
    ],
    breathe: 5
  });

  P.def('fire_shaman', {
    pal: { m: '#e9e4d6', h: '#8a2a1a', H: '#5a1a10', r: '#c24a1f', R: '#7a2a12', s: '#a8683a', e: '#ffd23f', k: '#1a1028',
      f: '#5a3a28', o: '#ff7a2a', y: '#ffe066', p: '#ffd23f' },
    flat: 'ek',
    rows: [
      '.oyo..............',
      'oyyyo...p.p.p.....',
      '.ooo...hhhhhhh....',
      '..f...hhhhhhhhh...',
      '..f..hhmmmmmmhh...',
      '..f..hmkemmkemh...',
      '..f..hmmmmmmmmh...',
      '..f..hhmmkkmmhh...',
      '..f..hhhmmmmhhhh..',
      '..fs.rrrrrrrrhhh..',
      '..fsrrrrRrrrrrhh..',
      '..f.rrrrRrrrrrrh..',
      '..f.rpprRrrpprr...',
      '..f.rrrrRrrrrrr...',
      '..f.rrrRrrrrrrr...',
      '..f.rrrRrrrrrrrr..',
      '..frrrrRrrrrrrrr..',
      '..frrrRrrrrrrrrrr.',
      '..RRRRRRRRRRRRRRR.'
    ],
    breathe: 9
  });

  P.def('phoenix', {
    pal: { o: '#ff8a3d', O: '#c24a1f', y: '#ffe066', r: '#ff5a2a', e: '#1a1028', b: '#ffd23f' },
    flat: 'eb',
    half: [
      'y..........r',
      'oy........ry',
      'ooy......ooo',
      'oooy....oooo',
      'Oooyy..ooeoo',
      '.Oooyy.oooob',
      '..Oooyyooooo',
      '...Oooyooooo',
      '....Oooooooo',
      '.....Ooooyoo',
      '......ooyyoo',
      '.......oyyyo',
      '........yyyo',
      '.......ryyr.',
      '......r.rr..',
      '.......r....'
    ],
    breathe: 6
  });

  P.def('ignis', {
    pal: { d: '#c24a1f', D: '#7a2412', b: '#ffb04a', h: '#e9e4d6', e: '#ffe066', w: '#a33a2f', W: '#6b1c12', t: '#ffffff' },
    flat: 'et',
    half: [
      '.........h....',
      '.........hh...',
      'w.........hddd',
      'ww......dddddd',
      'wWw....dddeddd',
      'wWww...ddddddd',
      'wWwww..dddtdtd',
      'wWwWww..dddddd',
      'wWwWwww..ddddd',
      'wWwWwWww.ddbbb',
      '.WwWwWwwddbbbb',
      '..WwWwWddbbbbb',
      '...WwWdddbbbbb',
      '....WddddbbDbb',
      '.....dddbbbbbb',
      '.....dddbbbDbb',
      '....dddddbbbbb',
      '...dd.dddbbbbb',
      '..dd..ddddbbbb',
      '.d...dddd..ddd',
      '....ddddd.....',
      '....DDDDD.....'
    ],
    breathe: 9
  });

  // ---------------- 마왕성 ----------------
  P.def('skeleton', {
    pal: { b: '#e9e4d6', B: '#a8a090', k: '#1a1028', w: '#e3eaf4', g: '#8a8f99', r: '#7a2a2a', y: '#f0c75e' },
    flat: 'k',
    rows: [
      '......bbbbb.....',
      '.....bbbbbbb....',
      'w....bkkbkkb....',
      'w....bbbkbbb....',
      'w.....bkbkb.....',
      'w......bbb......',
      'w...bbbbbbbbb...',
      'gg.b.b.b.b.b.rrr',
      '.bb..bbbbbb.rryr',
      '.....bbbbbb.rrrr',
      '......bbbb..rryr',
      '.......bb....rr.',
      '......bBBb......',
      '.....bb..bb.....',
      '.....b....b.....',
      '.....b....b.....',
      '....bb....bb....'
    ],
    breathe: 6
  });

  P.def('dark_mage', {
    pal: { p: '#3a2852', P: '#241838', r: '#6a4a8a', R: '#3a2852', e: '#c9a0ff', s: '#1a1028', o: '#c9a0ff', O: '#ffffff', g: '#c9a441' },
    flat: 'esoO',
    half: [
      '.......pp',
      '......ppp',
      '.....pppp',
      '....ppppp',
      '...pppppp',
      '...pppsss',
      '..pppsess',
      '..pppssss',
      '..ppppsss',
      '.ppppprrr',
      '.pprrrrgr',
      'pprrRrrgr',
      'prrrRrrgr',
      '.rrrRrrgr',
      '.rrRrrrgr',
      '.rrRrrrgr',
      'rrrRrrrgr',
      'rrRrrrrgr',
      'RRRRRRRRR'
    ],
    over: [{ x: -4, y: 9, rows: ['.O.', 'oOo', '.o.'] }],
    breathe: 9
  });

  P.def('gargoyle', {
    pal: { a: '#8a8f99', A: '#5a5f69', e: '#ff5a3a', W: '#6a6f79', h: '#c9ccd4', w: '#ffffff', p: '#4a4f59' },
    flat: 'ew',
    half: [
      'W.......h...',
      'WW.......h..',
      'WWW.....aaaa',
      'WWAW...aaaaa',
      'WAWAW..aaeaa',
      'WAWAWW.aaaaa',
      '.WAWAWWaaawa',
      '..WAWAaaaaaa',
      '...WAaaaAaaa',
      '....aaaaAaaa',
      '...aa.aaaaaa',
      '..aa..aaaaaa',
      '.....aaaaAaa',
      '....aaa.....',
      '...aaaa.....',
      '...AAAA.....',
      '..pppppppppp',
      '..pppppppppp'
    ],
    breathe: 7
  });

  P.def('vampire', {
    pal: { k: '#1a1028', s: '#e6e0ee', e: '#ff3a5a', c: '#a3203a', C: '#5a1020', u: '#2a1838', w: '#ffffff', g: '#f0c75e' },
    flat: 'ekw',
    half: [
      '.......kkk',
      '.....kkkkk',
      '....kkkkkk',
      '....kksssk',
      '....ksssss',
      '....ksesss',
      '....ksssss',
      '.....sssws',
      'cc..cwssss',
      'cccccwuuuw',
      'cccccuuuwu',
      'cCcccuuuwu',
      'cCccsuuuwu',
      'cCccsuuguu',
      'cCcc.uuuuu',
      'cCcc.uuuuu',
      'cCcc.uuuuu',
      'cCcc..uuu.',
      'cCcc..uuu.',
      'cCccc.uuu.',
      'cCcccuuuu.',
      'CCCCC.....'
    ],
    breathe: 8
  });

  P.def('cursed_armor', {
    pal: { a: '#6a6f79', A: '#3a3e46', g: '#8a3a5a', e: '#c9a0ff', k: '#1a1028', w: '#c9d2dc', W: '#7a8696', b: '#5a3b28' },
    flat: 'ek',
    half: [
      '.......aaa',
      '.....aaaaa',
      '....aaaaaa',
      '....aAkkkk',
      '....aAkekk',
      '....aAkkkk',
      '....aaaaaa',
      '.aaaa.aaaa',
      'aaaaaaaaga',
      'aAaaaAaaga',
      'aAa.aAaaga',
      'aa..aAaaga',
      'Aa..aaaaga',
      '....gggggg',
      '....aaaaaa',
      '....aAaaaa',
      '....aAa...',
      '....aAa...',
      '....aAa...',
      '...aaaa...',
      '...AAAA...'
    ],
    over: [{ x: -3, y: 0, rows: ['.w.', 'wWw', 'wWw', 'wWw', 'wWw', 'wWw', 'wWw', 'wWw', 'wWw', 'wWw', 'ggg', '.b.', '.b.', '.g.'] }],
    breathe: 7
  });

  P.def('death_knight', {
    pal: { d: '#3a3e46', D: '#24272e', b: '#e9e4d6', k: '#1a1028', e: '#7fe3ff', c: '#4a1f5a', C: '#2a1038', p: '#7fe3ff',
      w: '#c9d2dc', W: '#7a8696', g: '#5a5f69' },
    flat: 'ekp',
    half: [
      '........ppp',
      '......ddddd',
      '.....dddddd',
      '.....dbbbbb',
      '.....dbkebb',
      '.....dbbbbb',
      '.....ddbbkb',
      '...ccdddddd',
      '..cddddDddd',
      '.ccddDdddDd',
      '.cdd.DdddDd',
      'ccdd.Dddddd',
      'ccdd.Dddddd',
      'cc...dddDdd',
      'cc...Dddddd',
      'cc...dddddd',
      'cc...ddd...',
      'cc...ddd...',
      'cc...dDd...',
      'cc...dDd...',
      'cc..ddDd...',
      'cc..DDDD...'
    ],
    over: [{ x: -3, y: 1, rows: ['.w.', 'wWw', 'wWw', 'wWw', 'wWw', 'wWw', 'wWw', 'wWw', 'wWw', 'wWw', 'wWw', 'ggg', '.d.', '.d.'] }],
    breathe: 7
  });

  P.def('baltar', {
    pal: { h: '#e9e4d6', a: '#3a2852', A: '#241838', r: '#d94a6a', R: '#8a2440', g: '#f0c75e', e: '#ff5a5a', k: '#1a1028',
      w: '#dfe7f2', W: '#8a93b8' },
    flat: 'ek',
    half: [
      '.hh........',
      '..hh.......',
      '...hhaaaaaa',
      '....haaaaaa',
      '.....agaaga',
      '.....akkekk',
      '.....akkkkk',
      '.....aagaga',
      '...rraaaaaa',
      '..raaaagaaa',
      '.rraaAaaaga',
      '.raa.Aaaaga',
      'rraa.Aaaaga',
      'rr...aaagaa',
      'rr...gggggg',
      'rr...aaaaaa',
      'rr...aaa...',
      'rr...aAa...',
      'rR...aAa...',
      'rR...aAa...',
      'rR..aaAa...',
      'RR..AAAA...'
    ],
    over: [{ x: -4, y: 0, rows: ['..w.', '.wWw', '.wWw', '.wWw', '.wWw', '.wWw', '.wWw', '.wWw', '.wWw', '.wWw', '.wWw', '.wWw', 'gggg', '..k.', '..k.', '..g.'] }],
    breathe: 8
  });

  P.def('astaroth', {
    pal: { h: '#e9e4d6', g: '#f0c75e', p: '#8a4a9a', P: '#5a2a6a', e: '#ffd23f', w: '#ffffff', k: '#2a1838', K: '#160c22',
      c: '#6a1428', C: '#3a0814' },
    flat: 'ew',
    half: [
      'hh............',
      '.hh...........',
      '..hh.......g.g',
      '...hh......ggg',
      '....hh....pppp',
      '.....hhh.ppppp',
      '.......hpppppp',
      '.......ppppppp',
      '.......ppeeppp',
      '.......ppppppp',
      '........ppwpwp',
      'cc......kkkkkk',
      'ccc...kkkgkkkk',
      'cCcc.kkkkgkkkk',
      'cCccckkkkkgkkk',
      'cCcCckpkkkkgkk',
      'cCcCcpp.kkkkgk',
      'cCcCc...kkkkgk',
      'cCcCc...kkkkkk',
      'cCcCc...kkkkkk',
      'cCcCc..kkkkkkk',
      'cCcCc..kkkkkkk',
      'cCcC..kkkkkkkk',
      'cCc...kkkkkkkk',
      'cC...kkkkkkkkk',
      'c....KKKKKKKKK'
    ],
    breathe: 11
  });

  P.def('_unknown', { pal: { a: '#888', A: '#555', e: '#fff' }, flat: 'e', half: ['..aa', '.aaa', 'aaee', 'aaaa', 'AAAA'] });
})();
