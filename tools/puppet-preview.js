// tools/puppet-preview.js — 27단계 영웅 도트 미리보기(개발 전용). node tools/puppet-preview.js [영웅 id…] [--scale 4] → tools/puppet-<id>.png
// 줄마다 동작 하나(대기 · 공격 · 스킬 · 맞음), 회색 바탕. --noaura 로 오로라를 끈다
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = global;
['js/puppet.js', 'js/puppet-heroes.js'].forEach((f) => vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f }));
const P = global.Game.Puppet, out = require('./hero-rig/pngout.js');
const args = process.argv.slice(2), sc = +(args[args.indexOf('--scale') + 1] || 0) || 4;
const ids = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--scale');
(ids.length ? ids : Object.keys(P.designs)).forEach((id) => {
  const d = P.designs[id], r = P.renderAll(d, { aurora: !args.includes('--noaura') });
  const rows = Object.keys(r.index), cols = Math.max(...rows.map((k) => r.index[k].n)), W = r.w + 2, H = r.h + 2;
  out.save(path.join(__dirname, 'puppet-' + id + '.png'), W * cols, H * rows.length, (X, Y) => {
    const ri = Math.floor(Y / H), ci = Math.floor(X / W), x = X % W - 1, y = Y % H - 1, a = r.index[rows[ri]];
    if (x < 0 || y < 0 || x >= r.w || y >= r.h || ci >= a.n) return [40, 40, 46, 255];
    const px = r.frames[a.start + ci], k = (y * r.w + x) * 4, al = px[k + 3] / 255, bg = [86, 88, 96];
    return [px[k] * al + bg[0] * (1 - al), px[k + 1] * al + bg[1] * (1 - al), px[k + 2] * al + bg[2] * (1 - al), 255];
  }, sc);
  console.log(id, rows.map((k) => k + ' ' + r.index[k].n).join(' · '));
});
