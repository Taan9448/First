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
    var boss = D.monsterById[def.boss], seen = n <= d.clearedStage || !!d.codex.monsters[def.boss];
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

    el.innerHTML = '<div class="lb-bg"></div><div class="lb-shade"></div>' +
      '<header class="lb-top">' +
        '<div class="lb-profile"><div class="lv"><small>LV</small><b>' + maxLevel() + '</b></div>' +
        '<div class="pf"><b>하린 일행 <span class="mode-chip" style="--mc:' + St.mode().color + '">' + St.mode().name + '</span></b><small>' + G.Save.slot + '번 칸 · ' + (asc ? '승천 ' + asc + ' 원정' : '기본 원정') + ' · 최고 기록 ' + (d.ascension.best ? '승천 ' + d.ascension.best : d.flags.ended ? '원정 완료' : '진행 중') + '</small><i></i></div></div>' +
        '<span class="spacer"></span>' +
        '<span class="res" data-tip="골드">' + UI.icon('gold') + d.gold + '</span>' +
        '<span class="res" data-tip="모은 카드">' + UI.icon('deck') + owned + '<small>/' + allCards.length + '</small></span>' +
        '<span class="res" data-tip="모은 유물">' + UI.icon('chest') + d.relics.length + '<small>/' + D.relics.length + '</small></span>' +
        '<button class="btn icon ghost to-title" data-tip="타이틀로">' + UI.icon('home') + '</button>' +
      '</header>' +
      '<nav class="lb-left">' +
        '<button class="navbtn nav-set">' + UI.icon('gear') + '<span>설정</span></button>' +
        '<button class="navbtn nav-help">' + UI.icon('help') + '<span>도움말</span></button>' +
        (d.flags.ended ? '<button class="navbtn nav-asc">' + UI.icon('crown') + '<span>승천</span><i class="dot"></i></button>' : '') +
      '</nav>' +
      '<div class="lb-hero"><div class="plat"></div></div>' +
      '<div class="lb-name"><small>' + (hc.en || hc.id.toUpperCase()) + '</small><b>' + hc.name + '</b><span>' + hc.job + ' · Lv ' + St.levelOf(hc.id) + '</span></div>' +
      (heroes.length > 1 ? '<button class="btn icon ghost lb-swap" data-tip="다른 동료 보기">' + UI.icon('swap') + '</button>' : '') +
      '<div class="lb-voice"><span class="tag">VOICE</span><p></p></div>' +
      '<section class="lb-tiles">' +
        tile('map', 't-small', '지도', 'WORLD MAP', '<div class="ti"><span>클리어 ' + d.clearedStage + '/' + St.stageCount() + '</span></div>') +
        tile('go', 't-wide hot', '원정', 'EXPEDITION', '<div class="ti"><span class="dim">' + D.THEME_NAME[def.theme] + '</span><b style="color:#fff;font-size:1.15em">STAGE ' + n + ' · ' + D.STAGE_NAME[n - 1] + '</b><span>' +
          (r ? '진행 중 · 눌러서 이어하기' : n <= d.clearedStage ? '다시 도전' : '지도에서 출발') + '</span></div>' + (asc ? '<span class="badge red">승천 ' + asc + '</span>' : '')) +
        tile('heroes', 't-wide', '동료', 'HEROES', '<div class="ti"><span>합류 ' + heroes.length + '/' + D.characters.length + ' · 최고 Lv ' + maxLevel() + '</span></div>') +
        tile('party', 't-small', '편성', 'SQUAD', '<div class="ti"><span>' + d.party.map(function (id) { return charDef(id).name; }).join(' · ') + '</span></div>' + UI.icon('party', 'ticon'), !canParty) +
        tile('deck', 't-small', '덱', 'DECK', '<span class="badge">' + deckN + '</span><div class="ti"><span>전투 덱 ' + deckN + '장</span></div>' + UI.icon('deck', 'ticon')) +
        tile('story', 't-wide', '스토리', 'STORY', '<div class="ti"><span>' + (sp.seen >= sp.total ? '모든 장면을 보았다' : '제' + n + '장 · ' + D.STAGE_NAME[n - 1] + ' · 본 장면 ' + sp.seen + '/' + sp.total) + '</span>' +
          '<div class="bar"><i style="width:calc(' + sp.pct + '% - 4px)"></i></div></div><span class="pct">' + sp.pct + '<small>%</small></span>', !Meta.story) +
        tile('forge', 't-full', '대장간', 'FORGE', '<div class="ti"><span>4~10단계 강화 · 벼릴 수 있는 카드 ' + St.forgeList().length + '장</span></div>' + UI.icon('anvil', 'ticon')) +
      '</section>' +
      '<div class="lb-banner"><div class="bn"></div><div class="lb-dots"></div></div>' +
      '<nav class="lb-bottom">' +
        nav('heroes', 'party', '동료') + nav('cards', 'deck', '카드') + nav('monsters', 'skull', '몬스터') + nav('relics', 'chest', '유물') + nav('stats', 'stats', '기록') +
      '</nav>' +
      '<div class="lb-foot"><b>[원정 일지]</b> ' + journal() + '</div>';

    G.Art.scene(def.theme === 'mirror' ? 'castle' : def.theme).then(function (u) { if (u) el.querySelector('.lb-bg').style.backgroundImage = 'url(' + u + ')'; });
    G.ArtMap.world().then(function (u) { var t = el.querySelector('[data-go="map"] .tart'); if (u && t) t.style.backgroundImage = 'url(' + u + ')'; });
    G.Art.scene(def.theme === 'mirror' ? 'castle' : def.theme).then(function (u) { var t = el.querySelector('[data-go="go"] .tart'); if (u && t) t.style.backgroundImage = 'url(' + u + ')'; });
    G.Art.scene('castle').then(function (u) { var t = el.querySelector('[data-go="story"] .tart'); if (u && t) t.style.backgroundImage = 'url(' + u + ')'; });

    // 원정 타일: 다음 보스 그림(못 본 보스는 검은 실루엣)
    var boss = D.monsterById[def.boss], seen = n <= d.clearedStage || !!d.codex.monsters[def.boss];
    var bsp = UI.spriteEl(boss.sprite, { h: 120, max: 1 });
    bsp.style.position = 'absolute'; bsp.style.right = '10px'; bsp.style.bottom = '6px'; bsp.style.left = 'auto';
    if (!seen) { bsp.style.filter = 'brightness(0)'; bsp.style.animation = 'none'; }
    el.querySelector('[data-go="go"] .tart').appendChild(bsp);
    var sps = UI.el('div', 'sprites');
    el.querySelector('[data-go="heroes"] .tart').appendChild(sps);
    heroes.forEach(function (id) { sps.appendChild(UI.spriteEl(id, heroes.length > 3 ? 0.62 : 0.8)); });

    // 큰 캐릭터
    var stage = el.querySelector('.lb-hero');
    var sp = UI.spriteEl(heroPick, 1);
    stage.appendChild(sp);
    var size = 0;
    var fit = function () {
      var s = heroSize(el);
      if (s === size) return;
      size = s;
      var sh = sp._sheet;
      if (sh.anims) {   // 27단계 새 그림은 장면이 커서(66줄) 예전 키에 맞춘다. 정수배라 도트가 고르다
        s = Math.max(1, Math.round(s * 0.74));
        sp.style.marginLeft = sp.style.marginRight = 'calc(var(--px) * -' + Math.max(0, (sh.w - 34) * s / 2).toFixed(2) + ')';
      }
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

  function tile(key, cls, ko, en, inner, disabled) {
    return '<button class="tile ' + cls + '" data-go="' + key + '"' + (disabled ? ' disabled' : '') + '><div class="tart"></div>' +
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
