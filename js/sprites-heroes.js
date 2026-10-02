// sprites-heroes.js — 영웅 5명의 손도트(36×48, 오른쪽을 본다) + 그림자 변형 5종
// 18단계에 도형 렌더러 그림을 버리고 픽셀을 한 칸씩 찍은 격자로 바꿨다(js/pixel-render.js 의 gridSheet)
(function () {
  'use strict';
  var S = Game.Shape, E = S.E, C = S.C, B = S.B, P = S.P, L = S.L, mat = S.mat;
  var TAU = S.TAU;

  mat('skin', '#f4c49c', { light: 0.14, dark: 0.2, shift: 12 });
  mat('eye', '#24173b', { solid: true });
  mat('white', '#ffffff', { solid: true });
  mat('blush', '#ee8f8a', { solid: true });
  mat('brow', '#7d7568', { solid: true });
  mat('hairR', '#d6493a', { dark: 0.22 });
  mat('steel', '#93acd6', { spec: 0.55, shin: 10 });
  mat('steelD', '#6a7fa8', { spec: 0.3 });
  mat('gold', '#e9b94a', { spec: 0.7, shin: 14, light: 0.18 });
  mat('goldD', '#c58f2c', { spec: 0.3 });
  mat('scarf', '#d9443f');
  mat('leather', '#7a4a2a');
  mat('pants', '#3a3658', { dark: 0.18 });
  mat('boot', '#5a3a28', { dark: 0.2 });
  mat('blade', '#d4deee', { spec: 0.9, shin: 18, dark: 0.3 });
  mat('hairS', '#d9d3c4', { dark: 0.28 });
  mat('plate', '#4f86d6', { spec: 0.55, shin: 10 });
  mat('plateD', '#34599d', { spec: 0.3 });
  mat('hairF', '#f08a4b');
  mat('robe', '#8a55c9');
  mat('robeD', '#5e3a96', { dark: 0.2 });
  mat('hat', '#55308f', { dark: 0.2 });
  mat('wood', '#835434');
  mat('fire', '', { emit: true, ramp: S.FIRE });
  mat('holy', '', { emit: true, ramp: ['#7a5a1a', '#c9902a', '#f0c75e', '#ffe58a', '#fff6cf', '#ffffff'] });
  mat('robeW', '#e6e9f2', { dark: 0.3, shift: 22 });
  mat('hairB', '#f2cd6a');
  mat('shoe', '#a8824e');
  mat('gemB', '', { emit: true, ramp: ['#103a6a', '#1f6ab3', '#3fa8ff', '#7fd0ff', '#c8ecff', '#ffffff'] });
  mat('cloak', '#2f7a5c', { dark: 0.2 });
  mat('cloakD', '#235a46', { dark: 0.18 });
  mat('cloth', '#2c3044', { dark: 0.16 });
  mat('mask', '#1f2733', { dark: 0.14 });
  mat('scarfG', '#4fbf8a');
  mat('glintG', '', { emit: true, ramp: ['#0c3a2a', '#1f7a55', '#4fd99a', '#8fffc8', '#d0ffe8', '#ffffff'] });
  // 15단계 무림 복장
  mat('hairK', '#2e2840', { dark: 0.2, light: 0.12, shift: 18 });
  mat('muW', '#e9edf5', { dark: 0.3, shift: 20 });
  mat('muB', '#3f6fc4', { dark: 0.2 });
  mat('shoeK', '#33303f', { dark: 0.16 });
  mat('jade', '#5fd9a0', { spec: 0.6, shin: 12 });
  mat('veil', '#cfe9dc', { dark: 0.25, light: 0.1 });
  mat('muG', '#2e6a52', { dark: 0.2 });
  mat('muGD', '#1e4a3a', { dark: 0.16 });
  mat('sashP', '#8a4ac9', { dark: 0.2 });

  // 18단계: 손으로 찍은 36×48 도트. 글자 하나가 한 픽셀이고 '.'은 빈칸. 화면 배율 0.75(도트 1칸 = --px × 0.75)
  // waist 줄까지가 숨쉴 때 내려앉는 윗몸, cx 는 몸 중심, tip 은 무기 끝, face 는 컷인에서 창 가운데에 놓을 얼굴 중심(모두 격자 좌표)
  function hero(id, rows, pal, o) {
    S.def(id, { grid: { rows: rows, pal: pal, k: 0.75, waist: 30, cx: 18, face: [20, 13], tip: o.tip, glow: o.glow } });
  }

  // 하린 — 높게 묶은 검은 포니테일과 붉은 리본, 남색 무복, 붉은 띠, 직검
  hero('kai', [
    '...................KK...............',
    '..............K.KKKHHK..............',
    '........KKKK.KHKjjHKKK.K.K..........',
    '.......KjjrqKjhjhhhjjHKHKyK.........',
    '.......KjRrrRhjjjjjjhhHKgK..........',
    '......KjhhhhjjhhhhhhjjhgK...........',
    '.....KjhhhhhhhhHhhhHhhHhHK..........',
    '.....KjhhhhhhhHhhhhhHhhHHK..........',
    '....KjhhhhhhhHhhhhhhhhhhhHK.........',
    '...KjhhhhhhhhhhhhhHhhHHhhHK.........',
    '...KjhhhhhhhhhhhhHsHHssHhHK.........',
    '...KjhhhhhhhhhhhHSSSSSSSjHK.........',
    '...KjhhhhHHhhhhhHseesseejHK.........',
    '..KjhhhjHKHhhhhhHsEWssEWjHK.........',
    '..KHhhhhHKHhhhhhHsEEssEsjHK.........',
    '...KjhhHKKHHhhhhHpssssspjHK.........',
    '...KjhjHKKHKHhhhhHsssosHHK..........',
    '..KHhhhHKKHHHHHHhhHssssKK...........',
    '...KHhhHKKHKHHHHHHHSSKKK............',
    '....KjHK..KKKKbbbRSSSRbAKK........K.',
    '...KjhHK..KvCbaaaaRSRaaavCK......KnK',
    '...KHhHK..KvCbaaaaabaaaavcCK....KnmM',
    '....KHK..KvcCAaaaaabaaaavcCK...KnmMK',
    '....KjHK.KvccCbaaaaabaaavccCK.KnmMK.',
    '....KHHK.KvccCbaaaaabaaACccCKKnmMK..',
    '.....KK..KvccCbaaaaaabaAKwwgKnmMK...',
    '.........KvcCKAAAAAAAbAAKwwgnmMK....',
    '.........KwwwqqqqqqqqqqqRssKmMK.....',
    '.........KwwwRqqRRRRRRRRRsSKKK......',
    '..........KssbRbbAqRbbbbuKK.........',
    '...........KKbRaaAqRbaauAK..........',
    '...........KbRaaaAqRbaaRaAK.........',
    '...........KbaaaaAqRbaaRaAK.........',
    '...........KbaaaaAqRbaRaaAK.........',
    '..........KgggggggRRgggggggK........',
    '...........KKKddDKKddDKKKKK.........',
    '.............KddDKKddDK.............',
    '.............KddDKKddDK.............',
    '.............KDDDKKDDDKK............',
    '............KgggggKgggggK...........',
    '............KkkkkDKkkkkDK...........',
    '............KkkkkkkkkkkkDK..........',
    '............KkkkkkkkkkkkDK..........',
    '............KDDDDDDDDDDDDK..........',
    '.............KKKKKKKKKKKK...........',
    '....................................',
    '....................................',
    '....................................'
  ], { K: '#100810', s: '#fbdcbc', S: '#e0a684', e: '#1a0c12', W: '#ffffff', o: '#b04a50', p: '#f8b4a4', h: '#2a2646', H: '#141020', j: '#5a5e94', E: '#8a1e24', a: '#2e3458', A: '#1a1e36', b: '#4e5a8a', c: '#343c64', C: '#1c2140', v: '#566494', w: '#e8e4ee', r: '#c82c2a', R: '#761018', q: '#f46048', d: '#1e1e2c', D: '#0e0e16', k: '#2a1e1e', g: '#e8b838', G: '#9a6414', y: '#fff2a8', u: '#6a3a1a', m: '#a8bcd8', M: '#6a7a98', n: '#f6fbff' }, { tip: [34, 20], glow: '' });

  // 브리아 — 금발 땋은 머리, 은빛 판금과 푸른 겉옷·망토, 연 모양 방패
  hero('bram', [
    '....................................',
    '................KKK.................',
    '.............KKKjjHKKK..............',
    '............KjjjhhhjjHK.............',
    '...........KjhjjjjjjhhHK............',
    '..........KjjjhhhhhhjjhHK...........',
    '.........KjhhnhHhhhHhhHhHK..........',
    '........KjhhmhHhhhhhHhhHHK..........',
    '.......KjhhhhhhhhhhhhhhhhHK.........',
    '.......KjhhhhhhhhhHhhHHhhHK.........',
    '.......KjhHhhhhhhHsHHssHhHK.........',
    '......KjhhhhhhhhHSSSSSSSjHK.........',
    '......KjhhhhhhhhHseesseejHK.........',
    '......KjhHhhhhhhHsEWssEWjHK.........',
    '......KjhhHhhhhhHsEEssEsjHK.........',
    '......KjhHKHhhhhHpssssspjHK.........',
    '......KjhHKKHhhhhHsssosHHK..........',
    '.....KjhhHKKKHHHhhHssssKK...........',
    '.....KHhhHKmmmKKHHHSSKmmmK..........',
    '......KjHHmnmmmnnnnnnmnmmmK.........',
    '.....KjhHxmmmmmmmmmmmmmmmmKKKKKK....',
    '.....KHhHxFmmMmmmmmmmmmyGGGyGGGGK...',
    '......KHHFnmmmmmmmmmmmmGxxxGxxFGK...',
    '......KjHFnmmmmmvvGvvCmGxffGffFGK...',
    '......KHHFnmmmmmvcGccCmGxffGffFGK...',
    '......KxxFnmmMmmvcGccCmyGGGyGGGGK...',
    '......KxfFnmMFnmvcGccCmGxffGffFGK...',
    '......KxfFnmMFnmvcGccCmGxffGffFGK...',
    '......KxfFnmMFGGGGyyGGGGFffGffFGK...',
    '.....KxffFMMMnmmvcGccCmmGxfGfFGK....',
    '.....KxfffxxFnmmvcGccCmmGFfGfFGK....',
    '.....KxfffffFnmmvcGccCmmMGFGFGK.....',
    '.....KxffffFnmmmvcGcccCmmMGFGK......',
    '.....KxffffFMMMvccGcccCMMMKGK.......',
    '.....KxfffffFKKvccGcccCKKK.K........',
    '.....KFfffffFKnCCCGCCCCK............',
    '......KxffffFKnmMKKnmMK.............',
    '......KFFFFFKKnmMKKnmMK.............',
    '.......KKKKK.KnmMKKnmMKK............',
    '............KnmmmMKnmmnMK...........',
    '............KnmmmMKnmmmMK...........',
    '............KnmmmmnmmmmmMK..........',
    '............KnmmmmmmmmmmMK..........',
    '............KMMMMMMMMMMMMK..........',
    '.............KKKKKKKKKKKK...........',
    '....................................',
    '....................................',
    '....................................'
  ], { K: '#100810', s: '#fbdcbc', S: '#e0a684', e: '#1a0c12', W: '#ffffff', o: '#b04a50', p: '#f8b4a4', h: '#e2b850', H: '#9a6e22', j: '#fff0a8', E: '#2a4aa0', m: '#9aaccc', M: '#56668a', n: '#e8f2ff', c: '#2e56b6', C: '#1a2e72', v: '#5a8ae4', f: '#2a4ea8', F: '#162a66', x: '#5482d8', g: '#e8b838', G: '#9a6414', y: '#fff2a8' }, { tip: [27, 26], glow: '' });

  // 리라 — 허리까지 오는 보랏빛 머리와 엘프 귀, 보라 로브, 얼음 수정 지팡이
  hero('lyra', [
    '............................KiK.....',
    '................KKK........KiiiK....',
    '.............KKKjjHKKK.....KziiK....',
    '............KjjjhhhjjHK...KiziiiK...',
    '...........KjhjjjjjjhhHK..KiiiIiK...',
    '..........KjjjhhhhhhjjhHK..KiiIK....',
    '.........KjhhhhHhhhHhhHhHK.KiIiK....',
    '.........KjhhhHhhhhhHhhHHK.KgggK....',
    '........KHhhhhhhhhhhhhhhhHK.KUK.....',
    '.......KsSHhhhhhhhHgzgHhhHK.KuK.....',
    '........KssHhhhhhHsHHssHhHK.KUK.....',
    '........KHsSjhhhHSSSSSSSjHK.KuK.....',
    '........KHjjhhhhHseesseejHK.KUK.....',
    '........KKjhhhhhHsEWssEWjHK.KuK.....',
    '.......KjjhhhhhhHsEEssEsjHK.KUK.....',
    '.......KjhhhhhhhHpssssspjHK.KuK.....',
    '......KjhhHhhhhhhHsssosjHKK.KUK.....',
    '......KjhhhhhhHHhhHssssjhjHKKuK.....',
    '......KjjhHhhHKKHHHSSKKHhhHKKUK.....',
    '......KjhhhHHHbbbgSSSgbAHHHKKuK.....',
    '......KjhhHvCbaaaagggaaavCHKKUK.....',
    '......KjhhHvCbaaaaaaaaaavcCKKuK.....',
    '......KjjHHcCAaaaaaaaaaavcCKKUK.....',
    '......KjhHvccCbaaaaaaaaavccCKuK.....',
    '......KHhHHccCbaaaaaaaaAvccCKUK.....',
    '.......KHvcccCbaaaaaaaaAvcccCuK.....',
    '.......KHCHCCCbaaaaaaaaACggggUK.....',
    '.......KjHssjHbaaaaaaaaAKKKssuK.....',
    '.......KHHHsHKggggygggggK.KssUK.....',
    '........KjjjHbaagwwwwgaaAK.KKuK.....',
    '........KjHhHbaagwwwwgaaAK..KUK.....',
    '........KHhHbaaagwwwwgaaaAK.KuK.....',
    '.........KHHbaaagwwwwgaaaAK.KUK.....',
    '.........KHHbaaagwwwwgaaaAK.KuK.....',
    '..........KbaaaagwwwwgaaaAK.KUK.....',
    '..........KbaaaagwwwwwgaaaAKKuK.....',
    '..........KbaaaagwwwwwgaaaAKKUK.....',
    '..........KbaaaagwwwwwgaaaAKKuK.....',
    '.........KbaaaagwwwwwwgaaaAKKUK.....',
    '.........KbaaaagwwwwwwgaaaAKKuK.....',
    '.........KbaaaagwwwwwwgaaaaAKUK.....',
    '.........KbaaaagwwwwwwgaaaaAKuK.....',
    '.........KbaaaagwwwwwwgaaaaAKUK.....',
    '.........KggggggggggggggggggKuK.....',
    '..........KKKkkKKKKKKKkkKKKKKUK.....',
    '.............KK.......KK.....K......',
    '....................................',
    '....................................'
  ], { K: '#100810', s: '#fbdcbc', S: '#e0a684', e: '#1a0c12', W: '#ffffff', o: '#b04a50', p: '#f8b4a4', h: '#9a7ad8', H: '#5e4498', j: '#e0d0ff', E: '#5a2aa8', a: '#5a32a0', A: '#341a5e', b: '#8a5ad0', c: '#5e36a8', C: '#341a5e', v: '#9064d8', w: '#ece6f4', g: '#e8b838', y: '#fff2a8', k: '#2a2238', u: '#7a4a26', U: '#a8703c', i: '#7cc6f2', I: '#2a6ab8', z: '#e8faff' }, { tip: [29, 3], glow: 'iIz' });

  // 세라 — 은발과 후광, 흰 사제복과 금빛 영대, 태양 지팡이
  hero('sera', [
    '.............KYYYYYYYYK......KyK....',
    '............KYKKKKKKKKYK...KKKKK.K..',
    '.............KKKjjHKKKK...KyggggKyK.',
    '............KjjjhhhjjHK...KggiiggK..',
    '...........KjhjjjjjjhhHK..KgiziigKK.',
    '..........KjjjhhhhhhjjhHKKygiiiigKyK',
    '.........KjhhhhHhhhHhhHhHKKggiiggKK.',
    '.........KjhhhHhhhhhHhhHHK.KggggK...',
    '........KjhhhhhhhhhhhhhhhHK.KKKK....',
    '........KjhhhhhhhhHhhHHhhHK..KgK....',
    '........KjhhhhhhhHsHHssHhHK..KGK....',
    '........KjhhhhhhHSSSSSSSjHK..KgK....',
    '........KHhhhhhhHseesseejHK..KGK....',
    '........KKjhhhhhHsEWssEWjHK..KgK....',
    '.......KjjhhhhhhHsEEssEsjHK..KGK....',
    '.......KjhhhhhhhHpssssspjHK..KgK....',
    '......KjhhHhhhhhhHsssosjHKK..KGK....',
    '......KjhhhhhhHHhhHssssjhjHK.KgK....',
    '......KjhhHhhHKKHHHSSKKHhhHK.KGK....',
    '......KjhhhHHHbbgbbbbgbAHHHK.KgK....',
    '......KjhhHvCbaagaaaagaavCHK.KGK....',
    '......KjhhHvCbaagaaaagaavcCK.KgK....',
    '......KjhHHcCAaagaaaagaavcCK.KGK....',
    '......KHhHvccCbagaaaagaavccCKKgK....',
    '.......KjHHccCbagaaaagaAvccCKKGK....',
    '.......KHvcccCbagaaaagaAvcccCKgK....',
    '.......KHCHCCCbagaaaagaACgggggGK....',
    '........KHssHKbagaaaagaAKKKKssgK....',
    '........KHHsHKbagaaaagaAK..KssGK....',
    '.........KHHHbaagaaaagaaAK..KKgK....',
    '..........KKKbaagaaaagaaAK...KGK....',
    '...........KbaaagaaaaagaaAK..KgK....',
    '...........KbaaagaaaaagaaAK..KGK....',
    '...........KbaaagaaaaagaaAK..KgK....',
    '..........KbaaaagaaaaagaaAK..KGK....',
    '..........KbaaaagaaaaagaaaAK.KgK....',
    '..........KbaaaaraaaaaraaaAK.KGK....',
    '..........KbaaarrraaarrraaAK.KgK....',
    '.........KbaaaaaraaaaaraaaAK.KGK....',
    '.........KbaaaaagaaaaagaaaAK.KgK....',
    '.........KbaaaaagaaaaagaaaaAKKGK....',
    '.........KbaaaaagaaaaagaaaaAKKgK....',
    '.........KbaaaaagaaaaagaaaaAKKGK....',
    '.........KggggggggggggggggggKKgK....',
    '..........KKKggKKKKKKKggKKKK.KGK....',
    '.............KK.......KK......K.....',
    '....................................',
    '....................................'
  ], { K: '#100810', s: '#fbdcbc', S: '#e0a684', e: '#1a0c12', W: '#ffffff', o: '#b04a50', p: '#f8b4a4', h: '#c8c8dc', H: '#7a7a98', j: '#ffffff', E: '#a8700e', a: '#f2eef6', A: '#aca4bc', b: '#ffffff', c: '#e6e0ee', C: '#a49cb6', v: '#ffffff', g: '#e8b838', G: '#9a6414', y: '#fff6c0', Y: '#ffe060', r: '#c42a28', i: '#7cc6f2', z: '#ffffff' }, { tip: [30, 5], glow: 'iyY' });

  // 당소연 — 올림머리와 비녀, 비취 복면과 스카프, 녹색 무복, 비수와 암기
  hero('nox', [
    '..........KnKKKnK...................',
    '.........KnjjjjHmKK.................',
    '........KmjhjhhhjjHKKK..............',
    '.........KjhhhhhhhhjjHK.............',
    '.........KHhhhjjjjjjhhHK............',
    '..........KjjjhhhhhhjjhHK...........',
    '.........KjhhhhHhhhHhhHhHK..........',
    '.........KjhhhHhhhhhHhhHHK..........',
    '........KjhhhhhhhhhhhhhhhHK.........',
    '........KjhhhhhhhhHhhHHhhHK.........',
    '........KjhhhhhhhHsHHssHhHK.........',
    '........KjhhhhhhHSSSSSSSjHK.........',
    '........KHhhhhhhHseesseejHK.........',
    '.........KjhhhhhHsEWssEWHHK.........',
    '.........KHhhhhhHzzzzzzzXHK.........',
    '..........KHhhhhHXxxxxxxXHK.........',
    '...........KHhhhhHXxxxxXHK..........',
    '..........KHHHHHhhHXXXXKK...........',
    '.........KKKKKKKHHHSSKKK............',
    '........KzzzXKbbbDkkkDbAKK..........',
    '.......KzxXvCbaaaaDDDaaavCK.........',
    '......KzxxXvCbaaaaaaaaaavcCK........',
    '.....KzxxXvcCAaaaaaaaaaavcCK........',
    '.....KzxXKvccCbaaaaaaaaavcCK........',
    '....KzxXKKvccCbaaaaaaaaAvcCK.K......',
    '....KzXK.KvccCbaaaaaaaaAkkDKKnK.....',
    '...KXXK..KvcCKbaaaaaaaaAkDDKnK......',
    '....KK...KkkkgggggyggggggssnKKK.....',
    '.........KDDDGGGGGGGGGGGGssmnnnK....',
    '..........KsKbbbbbbbbbbbAKGKKKK.....',
    '...........KKbaAaaaaaaAaAKKmK.......',
    '...........KbaaAaaAaaaAaaAKnK.......',
    '...........KbaaaaaAaaaaaaAKKmK......',
    '...........KAAAAAAAAAAAAAAKKnK......',
    '............KKKKKKKKKKKKKK..K.......',
    '.............KkkDKKkkDK.............',
    '.............KkkDKKkkDK.............',
    '.............KkkDKKkkDK.............',
    '.............KkkDKKkkDKK............',
    '............KgggggKgggggK...........',
    '............KvvvvCKvvvvCK...........',
    '............KvccccvcccccCK..........',
    '............KvccccccccccCK..........',
    '............KCCCCCCCCCCCCK..........',
    '.............KKKKKKKKKKKK...........',
    '....................................',
    '....................................',
    '....................................'
  ], { K: '#100810', s: '#fbdcbc', S: '#e0a684', e: '#1a0c12', W: '#ffffff', o: '#b04a50', p: '#f8b4a4', h: '#2a2646', H: '#141020', j: '#5a5e94', E: '#1e7a4a', a: '#22583c', A: '#103222', b: '#3a8a5a', c: '#265e42', C: '#123424', v: '#3e9262', k: '#1e1e2c', D: '#0e0e16', x: '#3ab878', X: '#1a7048', z: '#9cf0c4', g: '#e8b838', G: '#9a6414', y: '#fff2a8', m: '#a8bcd8', n: '#f6fbff' }, { tip: [30, 27], glow: '' });

  // 거울의 그림자: 영웅 그림을 왼쪽으로 돌리고 어두운 보랏빛으로
  ['kai', 'bram', 'lyra', 'sera', 'nox'].forEach(function (id) {
    S.variant('shadow_' + id, id, { flip: true, remap: S.shadowRemap, rim: '#ff5a7a' });
  });
})();
