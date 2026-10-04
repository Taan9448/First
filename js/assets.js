// assets.js — 36단계: ChatGPT 리소스(assets/)를 게임에 잇는다. 규격은 data/asset-spec.js, 목록은 data/assets.js(tools/sync-assets.js 가 만든다)
// 원칙: 파일 이름 규칙으로 찾는다 → 목록에 있으면 그 그림, 없으면 null(부르는 쪽이 지금의 코드 그림을 쓴다).
// file:// 에서는 불러온 그림을 캔버스로 가공할 수 없으므로 <img>와 CSS 배경으로만 쓴다(움직임은 CSS 애니메이션)
(function () {
  'use strict';
  var G = Game, D = G.Data;
  var EXT = ['png', 'webp', 'jpg', 'jpeg'];
  var missing = {};   // 목록에는 있지만 읽지 못한 파일(이름이 바뀌었거나 지워졌다) — 코드 그림으로 되돌린다

  function files() { return (D.assets && D.assets.files) || {}; }
  function spec(k) { return (D.assetSpec || {})[k] || {}; }
  // 확장자 없는 경로로 찾는다. 반환: 'characters/heroes/kai_idle.png' 같은 상대 경로 또는 null
  function find(base) {
    var f = files();
    for (var i = 0; i < EXT.length; i++) { var p = base + '.' + EXT[i]; if (f[p] && !missing[p]) return p; }
    return null;
  }
  function path(kind, id) { var s = spec(kind); return s.dir + '/' + s.name.replace('{id}', id); }
  function url(p) { return p ? 'assets/' + p : null; }
  var heroIds = null;
  function isHero(id) { if (!heroIds) heroIds = (D.characters || []).map(function (c) { return c.id; }); return heroIds.indexOf(id) >= 0; }

  // 동작 하나: 한 장 또는 가로 스프라이트 시트(_s{n})
  function pose(dir, id, name) {
    var p = find(dir + '/' + id + '_' + name);
    if (p) { var d = files()[p]; return { url: url(p), w: d[0], h: d[1], frames: 1 }; }
    var f = files(), pre = dir + '/' + id + '_' + name + (spec('sheet').suffix || '_s');
    for (var k in f) {
      if (k.indexOf(pre) !== 0 || missing[k]) continue;
      var n = parseInt(k.slice(pre.length), 10);
      if (n > 1) return { url: url(k), w: f[k][0] / n, h: f[k][1], frames: n, fps: (spec('sheet').fps || {})[name] || 10 };
    }
    return null;
  }

  var A = G.Assets = {
    files: files, find: find, url: url,
    has: function (p) { return !!(p && files()[p] && !missing[p]); },
    count: function () { return Object.keys(files()).length; },
    // 전투 그림(동료 · 몬스터). idle 이 있어야 쓴다. 반환: { hero, poses: { idle, attack, … } }
    sprite: function (id) {
      var hero = isHero(id), dir = spec(hero ? 'heroPose' : 'monsterPose').dir;
      if (!dir) return null;
      var idle = pose(dir, id, 'idle');
      if (!idle) {
        var atlas = G.CharacterArt && G.CharacterArt.sheet(id);
        return atlas ? { hero: hero, id: id, atlas: atlas, poses: atlas.anims } : null;
      }
      var out = { hero: hero, id: id, poses: { idle: idle } };
      (spec(hero ? 'heroPose' : 'monsterPose').poses || []).forEach(function (n) { if (n !== 'idle') { var p = pose(dir, id, n); if (p) out.poses[n] = p; } });
      return out;
    },
    portrait: function (id) { return url(find(path('portrait', id))); },
    face: function (id) { return url(find(path('face', id))); },
    // 카드 그림: 전용(cards/art/{id}) → 40단계: 주인별 공유(cards/shared/{owner}) → 없으면 null(코드 그림)
    cardArt: function (id) {
      var base = String(id).split('+')[0], own = url(find(path('cardArt', base)));
      if (own) return own;
      var c = D.cardById && D.cardById[base];
      return c && c.owner && c.owner !== 'none' ? url(find(path('cardShared', c.owner))) : null;
    },
    cardArtOwn: function (id) { return url(find(path('cardArt', String(id).split('+')[0]))); },
    cardFrame: function (lay, rarity, duo) { return url(find(path('cardFrame', duo ? 'duo' : lay + '_' + rarity))); },
    battleBg: function (theme) { return url(find(path('bgBattle', theme))); },
    battleFore: function (theme) { return url(find(path('bgFore', theme))); },
    screenBg: function (name) { return url(find(path('bgScreen', name))); },
    worldMap: function () { return url(find(spec('worldMap').dir + '/' + spec('worldMap').name)); },
    // 아이콘은 icons/ 아래 어느 하위 폴더에 있어도 파일 이름이 키다
    icon: function (name) {
      var f = files(), dir = spec('icon').dir + '/';
      for (var k in f) {
        if (k.indexOf(dir) !== 0 || missing[k]) continue;
        var b = k.slice(k.lastIndexOf('/') + 1).replace(/\.[a-z]+$/, '');
        if (b === name) return url(k);
      }
      return null;
    },
    relic: function (id) { return url(find(path('relic', id))); },
    item: function (id) { return url(find(path('item', id))); },
    story: function (id) { return url(find(path('story', id))); },
    event: function (id) { return url(find(path('event', id))); },

    // 시작할 때 목록의 그림을 모두 미리 읽는다. 읽지 못한 파일은 빼서 코드 그림으로 되돌린다(최대 wait ms 기다린다)
    preload: function (wait) {
      var list = Object.keys(files());
      if (!list.length || typeof Image === 'undefined') return Promise.resolve(0);
      var done = 0;
      return new Promise(function (res) {
        var fin = function () { if (++done === list.length) res(list.length); };
        list.forEach(function (p) {
          var im = new Image();
          im.onload = fin;
          im.onerror = function () { missing[p] = 1; if (G.debug && window.console) console.warn('리소스를 읽지 못함: assets/' + p); fin(); };
          im.src = url(p);
        });
        setTimeout(function () { res(done); }, wait || 4000);
      });
    },
    missing: function () { return Object.keys(missing); },
    // 40단계: UI 부품(버튼 · 패널 테두리)이 모두 읽혔으면 body 에 ui-parts 를 붙여 CSS 가 그 그림을 쓴다
    applyUiParts: function () {
      if (typeof document === 'undefined' || !document.body) return;
      var need = ['button_primary', 'button_secondary', 'panel_border'];
      var ok = need.every(function (n) { return A.has('ui/components/' + n + '.png'); });
      document.body.classList.toggle('ui-parts', ok);
    },

    // ---------------- 필요한 그림 전체 목록(확인 화면 · 요청서) ----------------
    // 반환: [{ group, kind, id, label, base(확장자 없는 경로), size, alpha, need, desc, have }]
    expected: function () {
      var out = [];
      var add = function (group, kind, id, label, base, extra) {
        var s = spec(kind), o = Object.assign({ group: group, kind: kind, id: id, label: label, base: base, size: s.size, alpha: !!s.alpha, need: true, desc: '' }, extra || {});
        o.have = !!find(base) || (kind.indexOf('Pose') > 0 && !!pose(base.slice(0, base.lastIndexOf('/')), id, o.pose));
        // The approved mockups use measured rectangles, rather than uniform frame cells.
        var atlas = kind === 'heroPose' && G.CharacterArt && G.CharacterArt.sheet(id);
        if (!o.have && atlas && atlas.anims[o.pose]) {
          o.have = true;
          o.base = atlas.url.replace(/^assets\//, '').replace(/\.png$/, '');
          o.size = [atlas.art.width, atlas.art.height];
          o.desc += ' (atlas: ' + o.pose + ')';
        }
        out.push(o);
      };
      (D.characters || []).forEach(function (c) {
        spec('heroPose').poses.forEach(function (n) {
          add('동료 전투', 'heroPose', c.id, c.name + ' · ' + n, spec('heroPose').dir + '/' + c.id + '_' + n, { pose: n, need: spec('heroPose').need.indexOf(n) >= 0, desc: c.role + ' — ' + (c.desc || '') });
        });
        add('동료 일러스트', 'portrait', c.id, c.name + ' 전신', path('portrait', c.id), { desc: c.role });
        add('동료 일러스트', 'face', c.id, c.name + ' 컷인 얼굴', path('face', c.id), { desc: c.role });
      });
      (D.monsters || []).forEach(function (m) {
        var s = spec('monsterPose');
        s.poses.forEach(function (n) {
          add(m.rank === 'normal' ? '몬스터(일반)' : '몬스터(정예 · 보스)', 'monsterPose', m.id, m.name + ' · ' + n, s.dir + '/' + m.id + '_' + n,
            { pose: n, size: s.sizes[m.rank], need: s.need.indexOf(n) >= 0, desc: m.desc || '', rank: m.rank, theme: m.theme });
        });
      });
      ['ink', 'split'].forEach(function (lay) { (G.RARITIES || []).forEach(function (r) { add('카드 틀', 'cardFrame', lay + '_' + r, (lay === 'ink' ? '무공(수묵)' : '마법·융합(두 세계)') + ' · ' + (G.RARITY_NAME || {})[r], path('cardFrame', lay + '_' + r)); }); });
      add('카드 틀', 'cardFrame', 'duo', '합동기', path('cardFrame', 'duo'));
      (D.characters || []).map(function (c) { return [c.id, c.name]; }).concat([['common', '공용']]).forEach(function (o) {   // 40단계
        add('카드 공유 그림', 'cardShared', o[0], o[1] + ' 카드 공유 그림', path('cardShared', o[0]), { need: false, desc: '전용 그림이 없는 카드가 쓴다' });
      });
      (D.cards || []).concat(D.duoCards || []).forEach(function (c) {
        if (String(c.id).indexOf('+') >= 0) return;
        add('카드 그림', 'cardArt', c.id, c.name, path('cardArt', c.id), { rarity: c.rarity, owner: c.owner, desc: c.text, need: c.owner !== 'none' });
      });
      ['forest', 'desert', 'snow', 'volcano', 'castle', 'rift', 'mirror'].forEach(function (t) {
        add('배경', 'bgBattle', t, '전투 · ' + ((D.THEME_NAME || {})[t] || t), path('bgBattle', t));
        add('배경', 'bgFore', t, '전투 앞쪽 띠 · ' + ((D.THEME_NAME || {})[t] || t), path('bgFore', t), { need: false });
      });
      add('배경', 'worldMap', 'world_map', '월드맵', spec('worldMap').dir + '/' + spec('worldMap').name);
      [['title', '타이틀'], ['lobby', '로비'], ['dungeon_map', '던전 지도 바탕']].forEach(function (x) { add('배경', 'bgScreen', x[0], x[1], path('bgScreen', x[0])); });
      var iconNames = G.Pixel && G.Pixel.iconNames ? G.Pixel.iconNames() : [];
      iconNames.forEach(function (n) { add('아이콘', 'icon', n, n, spec('icon').dir + '/' + n); });
      (D.relics || []).forEach(function (r) { add('유물', 'relic', r.id, r.name, path('relic', r.id), { desc: r.desc }); });
      (D.items || []).forEach(function (r) { add('소모품', 'item', r.id, r.name, path('item', r.id), { desc: r.desc }); });
      (D.story || []).forEach(function (ch) { add('이야기 삽화', 'story', 'ch' + ch.n, ch.title, path('story', 'ch' + ch.n), { need: false }); });
      add('이야기 삽화', 'story', 'ascend', '승천 원정 시작', path('story', 'ascend'), { need: false });   // 38단계
      (D.events || []).forEach(function (e) { add('이벤트 삽화', 'event', e.id, e.name, path('event', e.id), { need: false, desc: e.text }); });
      // 아이콘 목록이 비면(테스트 환경 등) 찾을 때 쓰는 경로 판단을 위해 하위 폴더 이름을 바로잡는다
      out.forEach(function (o) { if (o.kind === 'icon') o.have = !!A.icon(o.id); });
      return out;
    }
  };
})();
