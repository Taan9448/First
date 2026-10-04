// ui-lobby.js — 로비(12단계). 큰 캐릭터 + 말풍선, 오른쪽의 깎은 메뉴 타일, 왼쪽 아래 목표 배너, 아래 메뉴
// 진행 상태(Game.Stage)를 읽어 보여 주기만 하고, 실제 동작은 맵·편성·도감·덱 화면으로 넘긴다
(function () {
  'use strict';
  var G = Game, UI = G.UI, D = G.Data, U = G.util;
  var Meta = G.Meta, St = G.Stage;

  var heroPick = null, bannerIdx = 0, timers = [];
  function charDef(id) { return D.characters.filter(function (c) { return c.id === id; })[0]; }
  function stop() { timers.forEach(clearInterval); timers = []; }
  function lastType(def) { return def.last; }

  // 지금 보여 줄 스테이지: 진행 중이면 그 스테이지, 아니면 다음 목표
  function focusStage() {
    var d = St.data, r = d.run;
    if (r) return r.stage;
    return Math.min(D.stages.length, d.clearedStage + 1);
  }
  function maxLevel() { return Math.max.apply(null, St.data.characters.map(function (id) { return St.levelOf(id); })); }
  function heroSize(el) {
    var h = (el.clientHeight || 600) * 0.62;
    return Math.max(2, Math.min(5, Math.floor(h / 112)));
  }

  // 목표 배너: 진행 중 · 다음 보스 · 다음 동료 · 승천
  function banners() {
    var d = St.data, r = d.run, list = [], n = focusStage(), def = St.stageDef(n);
    if (r) {
      list.push({ small: 'NOW · 진행 중', title: 'STAGE ' + r.stage + ' · ' + D.STAGE_NAME[r.stage - 1], sub: '깊이 ' + Math.min(r.col + 1, r.map.length) + '/' + r.map.length + ' · 눌러서 이어하기',
        sprite: d.party[0], go: function () { Meta.continueRun(); } });
    }
    var bossId = St.stageBoss(n), boss = D.monsterById[bossId], seen = n <= d.clearedStage || !!d.codex.monsters[bossId];
    var tag = { final: '최종 보스', boss: '보스', elite: '정예', midboss: '보스' }[lastType(def)] || '보스';
    list.push({ small: 'TARGET · ' + tag, title: seen ? boss.name : '???', sub: 'STAGE ' + n + ' · ' + D.THEME_NAME[def.theme], sprite: boss.sprite, dark: !seen, go: function () { Meta.map(n); } });
    var next = D.characters.filter(function (c) { return d.characters.indexOf(c.id) < 0; }).sort(function (a, b) { return a.joinAfter - b.joinAfter; })[0];   // 30단계: 시엘은 목록 끝이지만 5 스테이지에 합류
    if (next) list.push({ small: 'ALLY · 동료 합류', title: '???', sub: next.joinAfter + ' 스테이지를 클리어하면 합류', sprite: next.id, dark: true, go: function () { Meta.map(next.joinAfter); } });
    if (d.flags.ended) list.push({ small: 'ASCENSION · 승천', title: d.ascension.best ? '최고 기록 승천 ' + d.ascension.best : '승천 원정 열림', sub: '카드·유물·성장을 이어서 더 어려운 원정으로', icon: 'crown', go: function () { Meta.ascend(); } });
    return list;
  }

  Meta.lobby = function () {
    var d = St.data;
    if (!d) return Meta.title();
    stop();
    var el = document.getElementById('screen-lobby');
    var heroes = d.characters;
    if (!heroPick || heroes.indexOf(heroPick) < 0) heroPick = d.party[0] || heroes[0];
    var n = focusStage(), def = St.stageDef(n), r = d.run, asc = St.ascLevel();
    var allCards = D.cards.filter(function (c) { return c.owner !== 'none'; });
    var owned = allCards.filter(function (c) { return d.cards.indexOf(c.id) >= 0; }).length;
    var sp = St.storyProgress();
    var deckN = St.battleDeck(d.party).length;
    var canParty = !r || (r.col === 0 && !r.pending);
    var hc = charDef(heroPick);
    var skin = G.Assets && G.Assets.uiSkin && G.Assets.uiSkin('lobby');
    if (skin) return lobbySkin(el, skin, { n: n, def: def, r: r, asc: asc, owned: owned, all: allCards.length, sp: sp, deckN: deckN, canParty: canParty, hc: hc });

    el.innerHTML = '<div class="lb-bg"></div><div class="lb-shade"></div>' +
      '<header class="lb-top">' +
        '<div class="lb-plaque"><b>하린 일행</b><span class="mode-chip" style="--mc:' + St.mode().color + '">' + St.mode().name + '</span>' +
        '<small>LV ' + maxLevel() + ' · ' + G.Save.slot + '번 칸 · ' + (asc ? '승천 ' + asc : '기본 원정') + '</small></div>' +
        '<span class="spacer"></span>' +
        '<span class="res" data-tip="골드">' + UI.icon('gold') + d.gold + '</span>' +
        '<span class="res" data-tip="모은 카드">' + UI.icon('deck') + owned + '<small>/' + allCards.length + '</small></span>' +
        '<span class="res" data-tip="모은 유물">' + UI.icon('chest') + d.relics.length + '<small>/' + D.relics.length + '</small></span>' +
        '<button class="btn icon ghost to-title" data-tip="타이틀로">' + UI.icon('home') + '</button>' +
      '</header>' +
      '<nav class="lb-left">' +
        '<button class="navbtn nav-set" aria-label="설정" data-tip="설정">' + UI.icon('gear') + '</button>' +
        '<button class="navbtn nav-help" aria-label="도움말" data-tip="도움말">' + UI.icon('help') + '</button>' +
        (d.flags.ended ? '<button class="navbtn nav-asc" aria-label="승천" data-tip="승천">' + UI.icon('crown') + '<i class="dot"></i></button>' : '') +
      '</nav>' +
      '<div class="lb-hero"><div class="plat"></div><div class="lb-circle"></div></div>' +
      '<div class="lb-name"><i class="lb-compass"></i><div><small>' + (hc.en || hc.id.toUpperCase()) + '</small><b>' + hc.name + '</b><span>' + hc.job + ' · Lv ' + St.levelOf(hc.id) + '</span></div></div>' +
      (heroes.length > 1 ? '<button class="btn icon ghost lb-swap" data-tip="다른 동료 보기">' + UI.icon('swap') + '</button>' : '') +
      '<div class="lb-voice"><span class="tag">VOICE</span><p></p></div>' +
      '<section class="lb-tiles">' +
        tile('map', 't-small', '지도', 'WORLD MAP', '<div class="ti"><span>클리어 ' + d.clearedStage + '/' + St.stageCount() + '</span></div>') +
        tile('go', 't-wide hot', '원정', 'EXPEDITION', '<div class="ti"><span class="dim">' + D.THEME_NAME[def.theme] + '</span><b style="color:#fff;font-size:1.15em">STAGE ' + n + ' · ' + D.STAGE_NAME[n - 1] + '</b><span>' +
          (r ? '진행 중 · 깊이 ' + Math.min(r.col + 1, r.map.length) + '/' + r.map.length : n <= d.clearedStage ? '돌파한 스테이지' : '새 스테이지') + '</span></div>' + (asc ? '<span class="badge red">승천 ' + asc + '</span>' : '') +
          '<span class="tgo">' + (r ? '이어하기' : n <= d.clearedStage ? '다시 도전' : '출발') + '</span>') +
        tile('heroes', 't-wide', '동료', 'HEROES', '<div class="ti"><span>합류 ' + heroes.length + '/' + D.characters.length + ' · 최고 Lv ' + maxLevel() + '</span></div>') +
        tile('party', 't-small', '편성', 'SQUAD', '<div class="ti"><span>' + d.party.map(function (id) { return charDef(id).name; }).join(' · ') + '</span></div>' + UI.icon('party', 'ticon'), !canParty) +
        tile('deck', 't-small', '덱', 'DECK', '<span class="badge">' + deckN + '</span><div class="ti"><span>전투 덱 ' + deckN + '장</span></div>' + UI.icon('deck', 'ticon')) +
        tile('story', 't-wide', '스토리', 'STORY', '<div class="ti"><span>' + (sp.seen >= sp.total ? '모든 장면을 보았다' : '제' + n + '장 · ' + D.STAGE_NAME[n - 1] + ' · 본 장면 ' + sp.seen + '/' + sp.total) + '</span>' +
          '<div class="bar"><i style="width:calc(' + sp.pct + '% - 4px)"></i></div></div><span class="pct">' + sp.pct + '<small>%</small></span>', !Meta.story) +
        tile('forge', 't-full', '대장간', 'FORGE', '<div class="tpanel"><b>천외 대장간</b><span>4~10단계 강화 · 벼릴 수 있는 카드 <em>' + St.forgeList().length + '</em>장</span></div>') +
      '</section>' +
      '<div class="lb-banner"><div class="bn"></div><div class="lb-dots"></div></div>' +
      '<nav class="lb-bottom">' +
        [nav('heroes', 'party', '동료'), nav('cards', 'deck', '카드'), nav('monsters', 'skull', '몬스터'), nav('relics', 'chest', '유물'), nav('stats', 'stats', '기록')].join('<i class="lb-dia"></i>') +
      '</nav>' +
      '<div class="lb-foot"><i class="lb-seal"></i><b>원정 일지</b><span>' + journal() + '</span><i class="lb-quill"></i></div>';

    var lobbyBg = G.Assets && G.Assets.screenBg('lobby');
    (lobbyBg ? Promise.resolve(lobbyBg) : G.Art.scene(def.theme === 'mirror' ? 'castle' : def.theme)).then(function (u) { if (u) el.querySelector('.lb-bg').style.backgroundImage = 'url(' + u + ')'; });
    G.ArtMap.world().then(function (u) { var t = el.querySelector('[data-go="map"] .tart'); if (u && t) t.style.backgroundImage = 'url(' + u + ')'; });
    G.Art.scene(def.theme === 'mirror' ? 'castle' : def.theme).then(function (u) { var t = el.querySelector('[data-go="go"] .tart'); if (u && t) t.style.backgroundImage = 'url(' + u + ')'; });
    G.Art.scene('castle').then(function (u) { var t = el.querySelector('[data-go="story"] .tart'); if (u && t) t.style.backgroundImage = 'url(' + u + ')'; });
    G.Art.scene('volcano').then(function (u) { var t = el.querySelector('[data-go="forge"] .tart'); if (u && t) t.style.backgroundImage = 'url(' + u + ')'; });

    // 원정 타일: 다음 보스 그림(못 본 보스는 검은 실루엣)
    var bossId = St.stageBoss(n), boss = D.monsterById[bossId], seen = n <= d.clearedStage || !!d.codex.monsters[bossId];
    var bsp = UI.spriteEl(boss.sprite, { h: 120, max: 1 });
    bsp.style.position = 'absolute'; bsp.style.right = '10px'; bsp.style.bottom = '6px'; bsp.style.left = 'auto';
    if (!seen) { bsp.style.filter = 'brightness(0)'; bsp.style.animation = 'none'; }
    el.querySelector('[data-go="go"] .tart').appendChild(bsp);
    // 40단계(시안 lobby): 동료 타일은 동그란 얼굴 문장, 편성 타일은 출전 동료 그림, 덱 타일은 카드 그림
    var sps = UI.el('div', 'lb-medals');
    el.querySelector('[data-go="heroes"]').appendChild(sps);
    D.characters.forEach(function (c) {
      var m = UI.el('span', 'medal' + (heroes.indexOf(c.id) < 0 ? ' locked' : ''));
      m.setAttribute('data-tip', heroes.indexOf(c.id) < 0 ? '아직 합류하지 않았다' : c.name);
      m.appendChild(UI.portraitEl(c.id, 'medal-img') || UI.spriteEl(c.id, 0.6));
      sps.appendChild(m);
    });
    var pa = el.querySelector('[data-go="party"] .tart');
    d.party.forEach(function (id, i) { var im = UI.portraitEl(id, 'lb-pp p' + i); if (im) pa.appendChild(im); });
    var dk = el.querySelector('[data-go="deck"] .tart'), dcs = St.battleDeck(d.party).slice(0, 3);
    dcs.forEach(function (id, i) { var c = UI.el('span', 'lb-dc c' + i), u = G.Assets.cardArt(id); if (u) c.style.backgroundImage = 'url(' + u + ')'; dk.appendChild(c); });

    // 큰 캐릭터
    var stage = el.querySelector('.lb-hero');
    var sp = UI.portraitEl(heroPick, 'lb-portrait') || UI.spriteEl(heroPick, 1);   // 36단계: 전신 일러스트 리소스가 있으면 그것
    stage.appendChild(sp);
    var size = 0;
    var fit = function () {
      if (!sp._sheet) return;   // 일러스트는 CSS 로 화면 높이에 맞춘다
      var s = heroSize(el);
      var sh = sp._sheet;
      if (sh.art) s = Math.min(stage.clientHeight * 0.92 / (sh.h * 4), stage.clientWidth * 0.96 / (sh.w * 4));
      if (s === size) return;
      size = s;
      if (sh.anims && !sh.art) {   // 27단계 새 그림은 장면이 커서(66줄) 예전 키에 맞춘다. 정수배라 도트가 고르다
        s = Math.max(1, Math.round(s * 0.74));
        sp.style.marginLeft = sp.style.marginRight = 'calc(var(--px) * -' + Math.max(0, (sh.w - 34) * s / 2).toFixed(2) + ')';
      }
      if (sh.art) sp.style.marginLeft = sp.style.marginRight = '0';
      sp.style.width = 'calc(var(--px) * ' + (sh.w * s) + ')';
      sp.style.height = 'calc(var(--px) * ' + (sh.h * s) + ')';
      sp.style.left = 'calc(var(--px) * ' + ((0.5 - sh.anchor) * sh.w * s).toFixed(2) + ')';
    };
    fit();
    var voice = el.querySelector('.lb-voice p'), lines = hc.voice || [], vi = Math.floor(Math.random() * lines.length);
    var say = function () {
      if (!lines.length) return;
      vi = (vi + 1) % lines.length;
      voice.textContent = lines[vi];
      var box = el.querySelector('.lb-voice');
      box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
    };
    say();
    stage.onclick = function () { say(); if (UI.playAnim(sp, 'skill')) { SND('click'); return; } sp.classList.remove('pose'); void sp.offsetWidth; sp.classList.add('pose'); setTimeout(function () { sp.classList.remove('pose'); }, 420); SND('click'); };
    el.querySelector('.lb-voice').onclick = say;
    timers.push(setInterval(say, 9000));
    if (el.querySelector('.lb-swap')) el.querySelector('.lb-swap').onclick = function () {
      heroPick = heroes[(heroes.indexOf(heroPick) + 1) % heroes.length];
      Meta.lobby();
      el.querySelector('.lb-hero').classList.add('swap');
    };

    // 배너
    var list = banners(), bn = el.querySelector('.lb-banner .bn'), dots = el.querySelector('.lb-dots');
    dots.innerHTML = list.map(function (_, i) { return '<i data-i="' + i + '"></i>'; }).join('');
    var showBanner = function (i) {
      bannerIdx = (i + list.length) % list.length;
      var b = list[bannerIdx];
      bn.innerHTML = '<div class="pic"></div><small>' + b.small + '</small><b>' + U.esc(b.title) + '</b><span>' + U.esc(b.sub) + '</span>';
      if (b.sprite) {
        var s = UI.spriteEl(b.sprite, { h: 84, max: 0.75 });
        if (b.dark) { s.style.filter = 'brightness(0)'; s.style.animation = 'none'; }
        bn.querySelector('.pic').appendChild(s);
      } else if (b.icon) bn.querySelector('.pic').innerHTML = UI.icon(b.icon, 'big-ico');
      bn.style.animation = 'none'; void bn.offsetWidth; bn.style.animation = '';
      bn.onclick = b.go;
      UI.$$('i', dots).forEach(function (x, j) { x.classList.toggle('on', j === bannerIdx); });
    };
    UI.$$('i', dots).forEach(function (x) { x.onclick = function () { showBanner(+x.getAttribute('data-i')); }; });
    showBanner(bannerIdx);
    if (list.length > 1) timers.push(setInterval(function () { if (el.classList.contains('on')) showBanner(bannerIdx + 1); }, 5200));

    // 동작
    var go = {
      map: function () { Meta.map(); },
      go: function () { if (r) Meta.continueRun(); else Meta.map(n); },
      heroes: function () { G.Extra.codex('heroes'); },
      party: function () { if (canParty) Meta.party(Meta.lobby, '확인', Meta.lobby); },
      deck: function () { G.Extra.deck(); },
      story: function () { if (Meta.story) Meta.story(); },
      forge: function () { Meta.forge(); }
    };
    UI.$$('.tile', el).forEach(function (t) { t.onclick = function () { SND('click'); go[t.getAttribute('data-go')](); }; });
    UI.$$('.lb-bottom .navbtn', el).forEach(function (b) {
      b.onclick = function () { var k = b.getAttribute('data-nav'); if (k === 'stats') G.Extra.stats(); else G.Extra.codex(k); };
    });
    el.querySelector('.nav-set').onclick = function () { G.Extra.settingsWin(); };
    el.querySelector('.nav-help').onclick = function () { G.Extra.help(); };
    if (el.querySelector('.nav-asc')) el.querySelector('.nav-asc').onclick = function () { Meta.ascend(); };
    el.querySelector('.to-title').onclick = function () { stop(); Meta.title(); };
    if (!canParty) el.querySelector('[data-go="party"]').setAttribute('data-tip', '진행 중인 스테이지에서는 첫 갈림길·휴식·상점에서만 편성을 바꿀 수 있다');
    if (!Meta.story) el.querySelector('[data-go="story"]').setAttribute('data-tip', '스토리는 다음 단계에서 열린다');
    UI.show('lobby');
    fit();
  };

  var TILE_ICO = { go: 'compass', map: 'compass', party: 'party', deck: 'deck', heroes: 'party', story: 'scroll', forge: 'anvil' };
  var COMPASS = '<svg viewBox="0 0 40 40" class="ico"><path d="M20 3l3.2 13.8L37 20l-13.8 3.2L20 37l-3.2-13.8L3 20l13.8-3.2z" fill="#e9cf8a"/><path d="M20 10l1.6 8.4L30 20l-8.4 1.6L20 30l-1.6-8.4L10 20l8.4-1.6z" fill="#8a6a33"/></svg>';
  // 40단계(사용자 디자인 assets/ui/screens/lobby_skin.png, 1586×992): 그림을 화면 가득 깔고 빈 칸 자리에 글자 · 투명 단추만 얹는다
  var SW = 1586, SH = 992;
  function at(x1, y1, x2, y2) {
    return 'left:' + (x1 / SW * 100).toFixed(3) + '%;top:' + (y1 / SH * 100).toFixed(3) + '%;width:' + ((x2 - x1) / SW * 100).toFixed(3) + '%;height:' + ((y2 - y1) / SH * 100).toFixed(3) + '%';
  }
  function hit(cls, box, inner, tip) { return '<button type="button" class="lk-hit ' + cls + '" style="' + at.apply(null, box) + '"' + (tip ? ' aria-label="' + tip + '" data-tip="' + tip + '"' : '') + '>' + (inner || '') + '</button>'; }
  function txt(cls, box, inner) { return '<div class="lk-t ' + cls + '" style="' + at.apply(null, box) + '">' + inner + '</div>'; }
  function lobbySkin(el, skin, c) {
    var d = St.data, r = c.r, n = c.n, hc = c.hc;
    var b0 = banners()[0];
    var forgeN = St.forgeList().length;
    el.innerHTML = '<div class="lk"><img class="lk-img" src="' + skin + '" alt=""><div class="lk-ui">' +
      txt('lk-plaque', [92, 16, 365, 56], '<b>하린 일행</b><span class="mode-chip" style="--mc:' + St.mode().color + '">' + St.mode().name + '</span><small>LV ' + maxLevel() + ' · ' + G.Save.slot + '번 칸' + (c.asc ? ' · 승천 ' + c.asc : '') + '</small>') +
      txt('lk-res', [1000, 14, 1095, 54], '<b>' + d.gold + '</b>') +
      txt('lk-res', [1182, 14, 1278, 54], '<b>' + c.owned + '</b><small>/' + c.all + '</small>') +
      txt('lk-res', [1362, 14, 1472, 54], '<b>' + d.relics.length + '</b><small>/' + D.relics.length + '</small>') +
      hit('to-title', [1502, 12, 1564, 60], '', '타이틀로') +
      hit('nav-set', [38, 92, 96, 146], '', '설정') +
      hit('nav-help', [38, 160, 96, 214], '', '도움말') +
      txt('lk-name', [200, 156, 404, 202], '<b>' + hc.name + '</b><small>' + hc.job + ' · Lv ' + St.levelOf(hc.id) + '</small>') +
      hit('lk-hero', [60, 220, 600, 700], '', '') +
      txt('lk-voice', [42, 712, 282, 772], '<p></p>') +
      hit('lk-target', [28, 795, 617, 897], '<span class="lk-tx"><small>' + U.esc(b0.small) + '</small><b>' + U.esc(b0.title) + '</b><span>' + U.esc(b0.sub) + '</span></span>') +
      hit('t-go', [652, 82, 1545, 282], '<span class="lk-tl" style="left:9%;top:10%"><b>원정</b><small>EXPEDITION</small></span>' +
        '<span class="lk-info" style="left:9%;bottom:12%"><small>' + D.THEME_NAME[c.def.theme] + '</small><b>STAGE ' + n + ' · ' + D.STAGE_NAME[n - 1] + '</b><span>' +
        (r ? '진행 중 · 깊이 ' + Math.min(r.col + 1, r.map.length) + '/' + r.map.length : n <= d.clearedStage ? '돌파한 스테이지' : '새 스테이지') + (c.asc ? ' · 승천 ' + c.asc : '') + '</span></span>' +
        '<span class="lk-go">' + (r ? '이어하기' : n <= d.clearedStage ? '다시 도전' : '출발') + '</span>') +
      hit('t-map', [652, 293, 937, 485], '<span class="lk-tl"><b>지도</b><small>WORLD MAP</small></span><span class="lk-info"><span>클리어 ' + d.clearedStage + '/' + St.stageCount() + '</span></span>') +
      hit('t-party', [952, 293, 1302, 485], '<span class="lk-tl"><b>편성</b><small>SQUAD</small></span><span class="lk-info"><span>' + d.party.map(function (id) { return charDef(id).name; }).join(' · ') + '</span></span>', c.canParty ? '' : '진행 중인 스테이지에서는 첫 갈림길 · 휴식 · 상점에서만 편성을 바꿀 수 있다') +
      hit('t-deck', [1317, 293, 1545, 485], '<span class="lk-tl"><b>덱</b><small>DECK</small></span><span class="lk-info"><span>전투 덱 ' + c.deckN + '장</span></span>') +
      hit('t-heroes', [652, 497, 1102, 650], '<span class="lk-tl"><b>동료</b><small>HEROES · ' + d.characters.length + '/' + D.characters.length + '</small></span>') +
      hit('t-story', [1118, 497, 1545, 650], '<span class="lk-tl"><b>스토리</b><small>STORY</small></span><span class="lk-pct">' + c.sp.pct + '<small>%</small></span>' +
        '<span class="lk-bar" style="' + at(1185 - 1118, 620 - 497, 1483 - 1118, 633 - 497).replace(/[\d.]+%/g, function (v, i) { return v; }) + '"></span>') +
      hit('t-forge', [652, 662, 1545, 795], '<span class="lk-tl"><b>대장간</b><small>FORGE</small></span>') +
      txt('lk-forge', [1140, 690, 1505, 772], '<b>천외 대장간</b><span>4~10단계 강화 · 벼릴 수 있는 카드 <em>' + forgeN + '</em>장</span>') +
      txt('lk-journal', [740, 830, 1380, 885], '<b>원정 일지</b><span>' + journal() + '</span>') +
      [['heroes', 238, '동료'], ['cards', 490, '카드'], ['monsters', 755, '몬스터'], ['relics', 1015, '유물'], ['stats', 1272, '기록']].map(function (k) {
        return hit('lk-nav', [k[1], 915, k[1] + 76, 985], '', k[2]).replace('class="lk-hit lk-nav"', 'class="lk-hit lk-nav" data-nav="' + k[0] + '"');
      }).join('') +
      '</div></div>';
    // 스토리 진행 막대(타일 안 좌표)
    var bar = el.querySelector('.lk-bar');
    bar.style.cssText = 'left:' + ((1185 - 1118) / (1545 - 1118) * 100) + '%;top:' + ((619 - 497) / (650 - 497) * 100) + '%;width:' + ((1483 - 1185) / (1545 - 1118) * 100) + '%;height:' + (15 / (650 - 497) * 100) + '%';
    bar.innerHTML = '<i style="width:' + c.sp.pct + '%"></i>';
    // 대사
    var voice = el.querySelector('.lk-voice p'), lines = hc.voice || [], vi = Math.floor(Math.random() * lines.length);
    var say = function () { if (!lines.length) return; vi = (vi + 1) % lines.length; voice.textContent = lines[vi]; };
    say(); timers.push(setInterval(say, 9000));
    el.querySelector('.lk-hero').onclick = function () { say(); SND('click'); };
    // 동작
    var on = function (sel, f) { el.querySelector(sel).onclick = function () { SND('click'); f(); }; };
    on('.t-go', function () { if (r) Meta.continueRun(); else Meta.map(n); });
    on('.t-map', function () { Meta.map(); });
    on('.t-party', function () { if (c.canParty) Meta.party(Meta.lobby, '확인', Meta.lobby); });
    on('.t-deck', function () { G.Extra.deck(); });
    on('.t-heroes', function () { G.Extra.codex('heroes'); });
    on('.t-story', function () { if (Meta.story) Meta.story(); });
    on('.t-forge', function () { Meta.forge(); });
    on('.lk-target', function () { b0.go(); });
    on('.nav-set', function () { G.Extra.settingsWin(); });
    on('.nav-help', function () { G.Extra.help(); });
    on('.to-title', function () { stop(); Meta.title(); });
    UI.$$('.lk-nav', el).forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-nav'); if (k === 'stats') G.Extra.stats(); else G.Extra.codex(k); }; });
    UI.show('lobby');
  }

  function tile(key, cls, ko, en, inner, disabled) {
    var ic = TILE_ICO[key];
    return '<button class="tile ' + cls + '" data-go="' + key + '"' + (disabled ? ' disabled' : '') + '><div class="tart"></div>' +
      '<span class="tmed">' + (ic === 'compass' ? COMPASS : UI.icon(ic)) + '</span>' +
      '<div class="tl"><b>' + ko + '</b><small>' + en + '</small></div>' + (inner || '') + '</button>';
  }
  function nav(key, icon, label) { return '<button class="navbtn" data-nav="' + key + '">' + UI.icon(icon) + '<span>' + label + '</span></button>'; }
  function journal() {
    var d = St.data, r = d.run;
    var kills = Object.keys(d.codex.monsters).reduce(function (s, k) { return s + (d.codex.monsters[k].kills || 0); }, 0);
    return (r ? '스테이지 ' + r.stage + ' 진행 중' : d.flags.ended ? '혈마를 쓰러뜨렸다' : '스테이지 ' + (d.clearedStage + 1) + ' 출발 대기') + ' · 처치한 적 ' + kills + ' · 동료 ' + d.characters.length + '명';
  }
  function SND(k) { if (G.Audio) G.Audio.play(k); }

  // 로비가 아닌 화면으로 가면 배너·대사 타이머를 멈춘다
  var show = UI.show;
  UI.show = function (id) { if (id !== 'lobby') stop(); return show.apply(UI, arguments); };
  var rt = null;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var el = document.getElementById('screen-lobby');
      if (el && el.classList.contains('on') && St.data && !UI.$('.modal')) Meta.lobby();
    }, 250);
  });
})();
