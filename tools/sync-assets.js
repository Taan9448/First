// tools/sync-assets.js — 36단계: assets/ 폴더를 훑어 리소스 목록(data/assets.js)을 만들고 규격(data/asset-spec.js)을 검사한다(개발 전용)
// 실행: node tools/sync-assets.js           → 검사 후 data/assets.js 를 다시 쓴다
//       node tools/sync-assets.js --check   → 쓰지 않고, 목록과 폴더가 다르거나 규격 오류가 있으면 실패(테스트가 부른다)
// 규칙: 파일 이름은 규격표의 이름(데이터 id 그대로). 투명이 필요한 그림은 PNG(또는 알파 있는 WebP). 비율 ±3%, 권장 크기의 절반 이상
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..'), DIR = path.join(ROOT, 'assets');
global.window = global;
['js/core.js', 'data/asset-spec.js', 'data/characters.js', 'data/keywords.js', 'data/cards.js', 'data/monsters.js', 'data/relics.js', 'data/items.js', 'data/bonds.js', 'data/events.js', 'data/stages.js'].forEach(f => {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
});
const D = global.Game.Data, SPEC = D.assetSpec;
const CHECK = process.argv.includes('--check');

// ---------------- 그림 크기 · 투명 여부 읽기(PNG · JPEG · WebP) ----------------
function info(file) {
  const b = fs.readFileSync(file);
  if (b.slice(1, 4).toString() === 'PNG') {
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20), ct = b[25];
    return { w, h, alpha: ct === 4 || ct === 6 || b.indexOf('tRNS') > 0 };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1], len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5), alpha: false };
      i += 2 + len;
    }
  }
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') {
    const c = b.slice(12, 16).toString();
    if (c === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3), alpha: !!(b[20] & 0x10) };
    if (c === 'VP8L') { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1, alpha: !!((v >> 28) & 1) }; }
    if (c === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff, alpha: false };
  }
  return null;
}

// ---------------- 경로 → 규격 종류 ----------------
const heroes = D.characters.map(c => c.id), monsters = D.monsterById, cards = D.cardById;
const duo = {}; (D.duoCards || []).forEach(c => { duo[c.id] = c; });
function kindOf(rel) {
  const p = rel.replace(/\.[a-z]+$/i, ''), parts = p.split('/'), base = parts[parts.length - 1];
  const poseRe = /^(.+)_(idle|attack|skill|hit|down)(?:_s(\d+))?$/;
  if (p.startsWith('characters/heroes/')) {
    let m = base.match(/^(.+)_(portrait|face)$/);
    if (m) return { kind: m[2], id: m[1], known: heroes.includes(m[1]) };
    m = base.match(poseRe);
    if (m) return { kind: 'heroPose', id: m[1], pose: m[2], frames: +(m[3] || 1), known: heroes.includes(m[1]) };
    return { kind: '?', id: base };
  }
  if (p.startsWith('characters/monsters/')) {
    const m = base.match(poseRe);
    if (m) return { kind: 'monsterPose', id: m[1], pose: m[2], frames: +(m[3] || 1), known: !!monsters[m[1]], rank: monsters[m[1]] && monsters[m[1]].rank };
    return { kind: '?', id: base };
  }
  if (p.startsWith('cards/art/')) return { kind: 'cardArt', id: base, known: !!(cards[base] || duo[base]) };
  if (p.startsWith('cards/frames/')) return { kind: 'cardFrame', id: base, known: /^(ink|split)_(common|uncommon|rare|epic|legendary)$|^duo$/.test(base) };
  if (p.startsWith('backgrounds/story/')) return { kind: 'story', id: base, known: /^ch\d+$/.test(base) };
  if (p.startsWith('backgrounds/events/')) return { kind: 'event', id: base, known: !!(D.events || []).find(e => e.id === base) };
  if (p.startsWith('backgrounds/')) {
    if (base === 'world_map') return { kind: 'worldMap', id: base, known: true };
    let m = base.match(/^battle_(.+)_fore$/);
    if (m) return { kind: 'bgFore', id: m[1], known: true };
    m = base.match(/^battle_(.+)$/);
    if (m) return { kind: 'bgBattle', id: m[1], known: ['forest', 'desert', 'snow', 'volcano', 'castle', 'rift', 'mirror'].includes(m[1]) };
    return { kind: 'bgScreen', id: base, known: ['title', 'lobby', 'dungeon_map'].includes(base) };
  }
  if (p.startsWith('icons/')) return { kind: 'icon', id: base, known: true };
  if (p.startsWith('items/relics/')) return { kind: 'relic', id: base, known: !!D.relicById[base] };
  if (p.startsWith('items/consumables/')) return { kind: 'item', id: base, known: !!D.itemById[base] };
  if (p.startsWith('ui/')) return { kind: 'ui', id: base, known: true };
  if (p.startsWith('effects/')) return { kind: 'effect', id: base, known: true };
  return { kind: '?', id: base };
}

// ---------------- 훑기 ----------------
const files = {}, errors = [], warns = [];
function walk(d) {
  if (!fs.existsSync(d)) return;
  fs.readdirSync(d).forEach(n => {
    const f = path.join(d, n);
    if (fs.statSync(f).isDirectory()) return walk(f);
    if (!/\.(png|jpe?g|webp)$/i.test(n)) return;
    const rel = path.relative(DIR, f).split(path.sep).join('/');
    if (/[^A-Za-z0-9_\/.-]/.test(rel)) errors.push(rel + ': 파일 이름은 영문 · 숫자 · _ 만 쓴다(데이터 id 그대로)');
    const im = info(f);
    if (!im) { errors.push(rel + ': 그림 형식을 읽지 못했다(png · jpg · webp)'); return; }
    const k = kindOf(rel), s = SPEC[k.kind];
    if (k.kind === '?' || !s) { warns.push(rel + ': 이름 규칙에 맞지 않아 게임에서 쓰지 않는다(docs/ASSET_SPEC.md)'); }
    else {
      if (!k.known) warns.push(rel + ': 게임 데이터에 없는 id "' + k.id + '"');
      const want = s.sizes ? s.sizes[k.rank] || s.sizes.normal : s.size;
      const fw = im.w / (k.frames || 1);
      if (want) {
        const r0 = want[0] / want[1], r1 = fw / im.h;
        if (Math.abs(r1 / r0 - 1) > 0.03) errors.push(rel + ': 비율 ' + fw + '×' + im.h + (k.frames > 1 ? '(한 칸)' : '') + ' — 권장 ' + want.join('×') + ' 비율이어야 한다');
        else if (fw < want[0] / 2) errors.push(rel + ': 너무 작다 ' + fw + '×' + im.h + ' — 권장 ' + want.join('×'));
        else if (fw !== want[0]) warns.push(rel + ': 크기 ' + fw + '×' + im.h + '(권장 ' + want.join('×') + ', 비율이 같아 그대로 쓴다)');
      }
      if (s.alpha && !im.alpha) errors.push(rel + ': 투명 배경이어야 한다(PNG 알파)');
    }
    files[rel] = [im.w, im.h, im.alpha ? 1 : 0];
  });
}
walk(DIR);
// 동작 그림: 필수 동작(idle · attack)이 빠졌으면 알린다
const poseSets = {};
Object.keys(files).forEach(rel => { const k = kindOf(rel); if (k.kind === 'heroPose' || k.kind === 'monsterPose') (poseSets[k.kind + ':' + k.id] = poseSets[k.kind + ':' + k.id] || []).push(k.pose); });
Object.keys(poseSets).forEach(key => {
  const [kind, id] = key.split(':'), need = SPEC[kind].need.filter(n => !poseSets[key].includes(n));
  if (need.length) warns.push(id + ': 필수 동작이 빠졌다 — ' + need.join(', ') + (poseSets[key].includes('idle') ? '' : ' (idle 이 없으면 코드 그림을 쓴다)'));
});

const keys = Object.keys(files).sort();
const body = '// assets.js — 36단계: 리소스 목록. tools/sync-assets.js 가 assets/ 폴더를 훑어 만든다(손으로 고치지 않는다)\n' +
  '// file:// 에서는 파일이 있는지 알 수 없으므로 이 목록에 있는 파일만 쓴다. 값: [가로, 세로, 투명 여부(1/0)]\n' +
  'Game.Data.assets = { files: {' + (keys.length ? '\n' + keys.map(k => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(files[k])).join(',\n') + '\n' : '') + '} };\n';
const out = path.join(ROOT, 'data/assets.js');
warns.forEach(w => console.log('  주의: ' + w));
errors.forEach(e => console.log('  오류: ' + e));
if (CHECK) {
  const same = fs.readFileSync(out, 'utf8') === body;
  if (!same) console.log('  오류: data/assets.js 가 assets/ 폴더와 다르다 — node tools/sync-assets.js 를 실행한다');
  console.log('리소스 ' + keys.length + '개 · 오류 ' + (errors.length + (same ? 0 : 1)) + ' · 주의 ' + warns.length);
  process.exit(errors.length || !same ? 1 : 0);
}
fs.writeFileSync(out, body);
console.log('리소스 ' + keys.length + '개를 data/assets.js 에 썼다 · 오류 ' + errors.length + ' · 주의 ' + warns.length);
process.exit(errors.length ? 1 : 0);
