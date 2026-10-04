// tools/import-card-v2.js — 40단계: ChatGPT 카드 v2 전달물(design-delivery/card-v2)을 게임 리소스로 옮긴다(개발 전용)
// 실행: node tools/import-card-v2.js  → 그 뒤 node tools/sync-assets.js
//  · 원화 art/{id}.png → assets/cards/art/{id}.png (같은 id 의 예전 그림은 v2 로 바뀐다)
//  · 이펙트 effects/{id}.png → assets/effects/card-v2/{id}.png
//  · 공통 틀 · 하단 등급 띠 → assets/cards/v2/frame_{ink|split}.png · grade_{등급}.png
//  · 카드별 틀 종류 · 원화 위치 · 이펙트 대상/시간/움직임 → data/card-v2.js (file:// 라 JSON 을 읽지 않고 JS 데이터로 쓴다)
// generated 가 false 이거나 파일이 없는 카드는 건너뛴다(예전 그림 · 코드 그림을 그대로 쓴다). 다음 납품 뒤 다시 돌리면 된다
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'design-delivery/card-v2');
global.window = global;
require(path.join(SRC, 'manifest.js'));
const list = global.Game.CardDelivery;
const cp = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
let nArt = 0, nFx = 0;
const data = {};
list.forEach(c => {
  const e = { f: /split/.test(c.frame) ? 'split' : 'ink' };
  const art = c.art && path.join(SRC, c.art.path);
  if (c.art && c.art.generated && fs.existsSync(art)) { cp(art, path.join(ROOT, 'assets/cards/art', c.id + '.png')); nArt++; if (c.art.position && c.art.position !== '50% 50%') e.p = c.art.position; }
  const fx = c.effect, fxf = fx && path.join(SRC, fx.path);
  if (fx && fx.generated && fs.existsSync(fxf)) {
    cp(fxf, path.join(ROOT, 'assets/effects/card-v2', c.id + '.png')); nFx++;
    const a = fx.animation || {};
    e.fx = { t: fx.target, d: fx.durationMs, dir: fx.direction === 'left-to-right' ? 'lr' : 'c', src: fx.source, imp: fx.impact,
      ease: a.easing, kf: (a.keyframes || []).map(k => [k.at, k.opacity, k.scale, (k.translate || [0, 0])[0], (k.translate || [0, 0])[1]]), blend: a.blendMode !== 'normal' ? a.blendMode : undefined };
  }
  data[c.id] = e;
});
cp(path.join(SRC, 'frames/ink_base.png'), path.join(ROOT, 'assets/cards/v2/frame_ink.png'));
cp(path.join(SRC, 'frames/split_base.png'), path.join(ROOT, 'assets/cards/v2/frame_split.png'));
['common', 'uncommon', 'rare', 'epic', 'legendary'].forEach(r => cp(path.join(SRC, 'rarity', r + '.png'), path.join(ROOT, 'assets/cards/v2/grade_' + r + '.png')));
fs.writeFileSync(path.join(ROOT, 'data/card-v2.js'),
  '// card-v2.js — 40단계: 카드 v2 연결표. tools/import-card-v2.js 가 design-delivery/card-v2/manifest.js 에서 만든다(손으로 고치지 않는다)\n' +
  '// f = 공통 틀(ink 무공 · split 마법), p = 원화 위치, fx = 사용 이펙트 { t 대상, d 시간(ms), dir lr 왼→오 / c 가운데, src · imp 출발 · 타격점(0~1), kf [at, opacity, scale, tx, ty] }\n' +
  'Game.Data.cardV2 = ' + JSON.stringify(data) + ';\n');
console.log('원화 ' + nArt + '장 · 이펙트 ' + nFx + '개 · 틀 2 · 등급 띠 5 → data/card-v2.js ' + Object.keys(data).length + '장');
