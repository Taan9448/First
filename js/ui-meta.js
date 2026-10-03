// ui-meta.js — 타이틀, 월드맵, 파티 편성, 보상(카드·유물), 야영지, 상점, 스테이지 클리어, 엔딩
(function () {
  'use strict';
  var G = Game, UI = G.UI, D = G.Data, St = G.Stage, U = G.util;

  var Meta = G.Meta = {};
  var NODE_ICON = { battle: 'attack', elite: 'elite', event: 'event', rest: 'campfire', shop: 'shop', boss: 'crown', midboss: 'crown', final: 'crown' };
  function lastType(def) { return def.last; }
  var THEMES = ['forest', 'desert', 'snow', 'volcano', 'castle'];
  // 31단계: 저장 칸 미리 보기의 스테이지 수(엔딩 전에는 본편 10)
  function stageCountOf(d) { var main = D.MAIN_STAGES || D.stages.length; return d.flags.riftSeen || d.flags.ended || d.flags.riftEnded || d.clearedStage >= main ? D.stages.length : main; }

  function charDef(id) { return D.characters.filter(function (c) { return c.id === id; })[0]; }
  function screen(id) { return document.getElementById('screen-' + id); }
  function goldHTML() {
    return '<span class="gold"><i class="ico" style="' + UI.iconStyle('gold') + '"></i>' + St.data.gold + '</span>';
  }
  // 화면 제목 + 작은 영문 부제(12단계)
  var TITLE_SUB = 'SWORD BEYOND THE HEAVENS · MURIM × MAGIC';
  var TITLE_EN = { '원정 지도': 'WORLD MAP', '파티 편성': 'SQUAD', '보상': 'REWARD', '휴식': 'CAMP', '카드 강화': 'UPGRADE', '이벤트': 'EVENT', '상점': 'SHOP',
    '새 원정': 'NEW EXPEDITION', '스테이지 클리어': 'STAGE CLEAR', '모닥불 이야기': 'CAMPFIRE TALK', '스토리': 'STORY' };
  function topbar(title, extra) {
    var key = title.replace(/<[^>]*>.*$/, '').trim();
    return '<div class="topbar"><span class="title">' + title + '</span>' + (TITLE_EN[key] ? '<small class="title-en">' + TITLE_EN[key] + '</small>' : '') +
      '<span class="spacer"></span>' + (extra || '') + goldHTML() + '</div>';
  }
  Meta.topbar = topbar;
  // 메타 화면 배경: 지금 테마의 전투 배경을 어둡게 깐다
  function backdrop(el, theme) {
    var bg = UI.el('div', 'meta-bg');
    el.insertBefore(bg, el.children[1] || null);
    G.Art.scene(theme || 'forest').then(function (u) { if (u) bg.style.backgroundImage = 'url(' + u + ')'; });
  }
  function runTheme() {
    var r = St.data.run;
    return r ? St.stageDef(r.stage).theme : 'forest';
  }
  function hpBar(id) {
    var r = St.data.run, max = St.maxHp(id), hp = r && r.hp[id] != null ? r.hp[id] : max;
    return '<div class="hpbar"><i style="width:' + (hp / max * 100) + '%"></i><span>' + hp + '/' + max + '</span></div>';
  }
  function miniHero(id) {
    if (St.isDead(id)) return '<div class="mini-hero dead"><div class="sp" data-id="' + id + '"></div><span>' + charDef(id).name + '</span><small>사망</small></div>';
    return '<div class="mini-hero"><div class="sp" data-id="' + id + '"></div><span>' + charDef(id).name + '</span>' + hpBar(id) + '</div>';
  }
  function fillSprites(root, size) {
    UI.$$('.sp[data-id]', root).forEach(function (s) { s.appendChild(UI.spriteEl(s.getAttribute('data-id'), size || 0.75)); });
  }
  function confirmBox(text, yes, onYes) {
    var m = UI.modal('<h2>' + text + '</h2><div class="row" style="justify-content:flex-end">' +
      '<button class="btn no">취소</button><button class="btn gold yes">' + yes + '</button></div>');
    m.querySelector('.no').onclick = function () { UI.closeModal(m); };
    m.querySelector('.yes').onclick = function () { UI.closeModal(m); onYes(); };
  }

  // ================= 타이틀 =================
  Meta.title = function () {
    var el = screen('title');
    var last = G.Save.lastSlot();
    el.innerHTML = titleFrame('<div class="lineup"></div>' +
      '<div class="menu">' +
      (last ? '<button class="btn gold big cont">이어하기 <small>' + last + '번 칸</small></button>'
        : '<button class="btn gold big quick-new">새 게임</button>') +   // 24단계: 저장이 하나도 없으면 바로 모드 선택(1번 칸)
      '<button class="btn big slots">저장 칸 · 새 게임</button>' +
      '<div class="row sub-menu"><button class="btn daily">오늘의 원정' + (G.Save.exists('daily') ? ' <small>이어하기</small>' : '') + '</button><button class="btn records">업적 · 기록</button></div>' +
      (G.debug ? '<button class="btn small test">전투 테스트 (디버그)</button>' : '') +
      '</div>');
    var line = el.querySelector('.lineup');
    D.characters.forEach(function (c) { var w = UI.el('div', 'slot'); w.appendChild(UI.spriteEl(c.id, 1.1)); line.appendChild(w); });
    if (last) el.querySelector('.cont').onclick = function () { openSlot(last); };
    else el.querySelector('.quick-new').onclick = function () { Meta.modeSelect(1); };
    el.querySelector('.slots').onclick = function () { Meta.slots(); };
    el.querySelector('.daily').onclick = function () { Meta.dailyIntro(); };
    el.querySelector('.records').onclick = function () { St.data = null; G.Extra.stats('all'); };
    if (G.debug) el.querySelector('.test').onclick = function () { G.TestMenu.open(); };
    UI.show('title');
  };
  function titleFrame(inner) {
    var stars = '';
    for (var i = 0; i < 40; i++) {
      stars += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 45).toFixed(1) + '%;animation-delay:-' + (Math.random() * 2.4).toFixed(2) + 's"></i>';
    }
    var html = '<div class="title-bg"></div><div class="title-shade"></div><div class="stars">' + stars + '</div>' +
      '<div class="title-wrap">' +
      '<div class="logo-sub">' + TITLE_SUB + '</div>' +
      '<h1 class="logo">천외검결</h1><div class="logo-tag">두 세계의 검</div><div class="logo-line"></div>' + inner +
      (G.debug ? '<div class="debugtag">디버그 모드 · 별도 저장</div>' : '') + '</div>' +
      '<div class="title-foot">저장 칸 3개 · 진행은 브라우저에 자동 저장된다</div>';
    setTimeout(function () {
      var bg = screen('title').querySelector('.title-bg');
      G.Art.scene('castle').then(function (u) { if (u && bg) bg.style.backgroundImage = 'url(' + u + ')'; });
    }, 0);
    return html;
  }
  function openSlot(n) {
    if (!n) return;
    G.Save.use(n);
    if (St.load()) Meta.lobby(); else Meta.title();
  }

  // ================= 저장 칸(15단계) =================
  // 칸마다 모드·진행·동료를 보여 준다. 빈 칸은 모드를 골라 새 게임
  Meta.slots = function () {
    var el = screen('title');
    var cards = '';
    for (var n = 1; n <= G.Save.SLOTS; n++) {
      var d = G.Save.peek(n);
      if (!d) {
        cards += '<div class="slot-card empty" data-n="' + n + '"><small>SLOT ' + n + '</small><b>빈 칸</b><p class="dim">새 원정을 시작한다</p>' +
          '<div class="row"><button class="btn gold new" data-n="' + n + '">새 게임</button><button class="btn small imp" data-n="' + n + '">가져오기</button></div></div>';
        continue;
      }
      var md = D.modes[d.mode] || D.modes.normal;
      var alive = d.characters.filter(function (id) { return (d.dead || []).indexOf(id) < 0; });
      var prog = d.flags.riftEnded ? '세계의 틈을 닫음' : d.flags.ended ? '엔딩 도달' : d.run ? '스테이지 ' + d.run.stage + ' 진행 중' : '스테이지 ' + Math.min(D.stages.length, d.clearedStage + 1) + ' 대기';
      cards += '<div class="slot-card" data-n="' + n + '" style="--mc:' + md.color + '"><small>SLOT ' + n + '</small>' +
        '<span class="mode-chip">' + md.name + '</span><b>' + prog + '</b>' +
        '<div class="slot-heroes" data-heroes="' + d.characters.join(',') + '" data-dead="' + (d.dead || []).join(',') + '"></div>' +
        '<div class="info-line"><span>클리어</span><span>' + d.clearedStage + '/' + stageCountOf(d) + (d.ascension && d.ascension.current ? ' · 승천 ' + d.ascension.current : '') + '</span></div>' +
        '<div class="info-line"><span>동료</span><span>' + alive.length + '명' + ((d.dead || []).length ? ' · 사망 ' + d.dead.length : '') + '</span></div>' +
        '<div class="info-line"><span>골드 · 카드</span><span>' + d.gold + ' · ' + d.cards.length + '장</span></div>' +
        '<div class="row"><button class="btn gold go" data-n="' + n + '">이어하기</button><button class="btn small exp" data-n="' + n + '">내보내기</button><button class="btn small imp" data-n="' + n + '">가져오기</button><button class="btn small danger del" data-n="' + n + '">지우기</button></div></div>';
    }
    el.innerHTML = titleFrame('<span class="ribbon">저장 칸을 고른다</span><div class="slot-grid">' + cards + '</div>' +
      '<div class="menu"><button class="btn back">뒤로</button></div>');
    UI.$$('.slot-heroes', el).forEach(function (h) {
      var dead = h.getAttribute('data-dead').split(',');
      h.getAttribute('data-heroes').split(',').forEach(function (id) {
        if (!id) return;
        var sp = UI.spriteEl(id, 0.55);
        if (dead.indexOf(id) >= 0) { sp.classList.add('dead'); sp.setAttribute('data-tip', charDef(id).name + ' · 사망'); }
        h.appendChild(sp);
      });
    });
    UI.$$('.slot-card .go', el).forEach(function (b) { b.onclick = function () { openSlot(+b.getAttribute('data-n')); }; });
    // 24단계: 저장 내보내기 · 가져오기
    UI.$$('.slot-card .exp', el).forEach(function (b) { b.onclick = function () { G.Extra.exportWin(+b.getAttribute('data-n')); }; });
    UI.$$('.slot-card .imp', el).forEach(function (b) { b.onclick = function () { G.Extra.importWin(+b.getAttribute('data-n'), Meta.slots); }; });
    UI.$$('.slot-card .new', el).forEach(function (b) { b.onclick = function () { Meta.modeSelect(+b.getAttribute('data-n')); }; });
    UI.$$('.slot-card .del', el).forEach(function (b) {
      b.onclick = function () {
        var n = +b.getAttribute('data-n');
        confirmBox(n + '번 칸의 기록을 지울까요? 되돌릴 수 없다.', '지우기', function () { G.Save.clear(n); Meta.slots(); });
      };
    });
    el.querySelector('.back').onclick = Meta.title;
    UI.show('title');
  };

  // ================= 모드 선택(15단계) =================
  Meta.modeSelect = function (slot) {
    var el = screen('title'), pick = 'normal', boon = null;
    var boons = G.Profile ? G.Profile.boons() : [];
    var render = function () {
      el.innerHTML = titleFrame('<span class="ribbon">' + slot + '번 칸 · 게임 모드를 고른다 (나중에 바꿀 수 없다)</span><div class="mode-grid">' +
        D.MODE_ORDER.map(function (k) {
          var m = D.modes[k];
          return '<button class="mode-card' + (k === pick ? ' on' : '') + '" data-k="' + k + '" style="--mc:' + m.color + '"><small>' + m.en + '</small><b>' + m.name + '</b><p>' + U.esc(m.desc) + '</p></button>';
        }).join('') + '</div>' +
        // 26단계: 업적으로 해금한 시작 선물 하나
        (boons.length ? '<div class="boon-row"><span class="ribbon cyan">시작 선물</span><div class="boons">' +
          ['none'].concat(boons).map(function (id) {
            var b = D.boonById[id];
            return '<button class="boon' + ((boon || 'none') === id ? ' on' : '') + '" data-b="' + id + '"' + (b ? ' data-tip="' + U.esc(b.desc) + '"' : '') + '>' + (b ? U.esc(b.name) : '없음') + '</button>';
          }).join('') + '</div></div>' : '') +
        '<div class="menu row"><button class="btn back">뒤로</button><button class="btn gold big start">' + D.modes[pick].name + ' 모드로 시작</button></div>');
      UI.$$('.boon', el).forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-b'); boon = id === 'none' ? null : id; SND('click'); render(); }; });
      UI.$$('.mode-card', el).forEach(function (b) { b.onclick = function () { pick = b.getAttribute('data-k'); SND('click'); render(); }; });
      el.querySelector('.back').onclick = Meta.slots;
      el.querySelector('.start').onclick = function () {
        G.Save.use(slot);
        St.newGame(pick);
        if (boon) St.applyBoon(boon);
        // 24단계: 첫 게임은 로비·세계 지도·편성을 건너뛰고 프롤로그 뒤 바로 1 스테이지 던전으로
        Meta.scene('prologue', function () { Meta.enterStage(1); });
      };
    };
    render();
    UI.show('title');
  };

  // ================= 월드맵 =================
  var mapSel = null;
  var resizeBound = false;

  // 진행 중인 스테이지가 있으면 던전 지도(14단계)를, 없으면 월드맵을 보인다. 위의 버튼으로 바꿔 볼 수 있다
  var mapView = 'dungeon';
  Meta.map = function (sel) {
    var d = St.data, r = d.run, el = screen('map');
    mapSel = sel || (r ? r.stage : mapSel) || Math.min(D.stages.length, d.clearedStage + 1);
    var asc = St.ascLevel();
    var dungeon = !!r && mapView === 'dungeon' && mapSel === r.stage;
    el.innerHTML = topbar((dungeon ? '던전 지도' : '원정 지도') + (asc ? ' <span class="asc-chip">승천 ' + asc + '</span>' : ''),
      (r ? '<button class="btn small ghost view">' + UI.icon('map') + (dungeon ? '월드맵' : '던전 지도') + '</button>' : '') +
      (d.flags.ended ? '<button class="btn small cyan ascend">새 원정</button>' : '') + '<button class="btn small ghost to-title">' + UI.icon('home') + (St.isDaily() ? '타이틀' : '로비') + '</button>') +
      '<div class="map-layout"><div class="map-frame"><div class="map-canvas"></div></div><aside class="map-side frame"></aside></div>' +
      '<div class="map-bottom"><div class="party-row"></div><div class="items-row item-bar"></div><div class="relic-bar"></div></div>';
    var common = function () {
      renderSide(el.querySelector('.map-side'), mapSel, dungeon);
      el.querySelector('.party-row').innerHTML = d.party.map(miniHero).join('');
      fillSprites(el.querySelector('.party-row'), 0.6);
      el.querySelector('.map-bottom .relic-bar').innerHTML = UI.relicBar(d.relics);
      el.querySelector('.map-bottom .items-row').innerHTML = UI.itemBar(St.items(), false, D.itemEconomy.slots);
      el.querySelector('.to-title').onclick = function () { if (St.isDaily()) Meta.title(); else Meta.lobby(); };   // 오늘의 원정에는 로비가 없다
      if (el.querySelector('.view')) el.querySelector('.view').onclick = function () { mapView = dungeon ? 'world' : 'dungeon'; Meta.map(r.stage); };
      if (el.querySelector('.ascend')) el.querySelector('.ascend').onclick = function () { Meta.ascend(); };
    };
    if (dungeon) {
      common();
      UI.show('map');
      drawDungeon();
      if (!resizeBound) { resizeBound = true; window.addEventListener('resize', fitMap); }
      return;
    }
    var canvas = el.querySelector('.map-canvas');
    G.ArtMap.world().then(function (u) { if (u) canvas.style.backgroundImage = 'url(' + u + ')'; });

    // 길: 클리어한 구간은 금빛
    var route = '', count = St.stageCount();   // 31단계: 엔딩 전에는 세계의 틈(11~13)을 숨긴다
    for (var i = 0; i < Math.min(D.mapPos.length, count) - 1; i++) {
      var a = D.mapPos[i], b = D.mapPos[i + 1], done = i + 1 <= d.clearedStage;
      var ri = (D.riftAfter || []).indexOf(i + 1);
      // 세계의 틈을 건너는 길은 틈을 지나 보랏빛으로 굽는다(16단계)
      var dPath = ri >= 0 ? 'M' + a[0] + ' ' + a[1] + ' Q' + D.riftPos[ri][0] + ' ' + D.riftPos[ri][1] + ' ' + b[0] + ' ' + b[1] : 'M' + a[0] + ' ' + a[1] + ' L' + b[0] + ' ' + b[1];
      route += '<path d="' + dPath + '" fill="none" stroke="#1a1208" stroke-width="12"/>' +
        '<path d="' + dPath + '" fill="none" stroke="' + (ri >= 0 ? (done ? '#e8b0ff' : '#9a6ad0') : done ? '#ffd23f' : '#c9b48a') + '" stroke-width="' + (done ? 6 : 4) + '" stroke-dasharray="' + (done ? '14 6' : '8 10') + '"/>';
    }
    // 잠긴 지역은 경계 그대로 안개로 덮는다
    var fog = '';
    var regions = D.regions.filter(function (rg) { return rg.theme !== 'rift' || St.riftKnown(); });
    regions.forEach(function (rg, ri) { if (!St.canEnter(ri * 2 + 1)) fog += G.ArtMap.fogLayer(rg.theme, 11 + ri); });
    canvas.innerHTML = '<svg class="map-route" viewBox="0 0 1000 560" preserveAspectRatio="none" shape-rendering="crispEdges">' + (St.riftKnown() ? G.ArtMap.riftLayer() : '') + fog + route + '</svg>';

    // 세계 이름표(16단계)
    (D.worldLabels || []).forEach(function (wl) {
      var t = UI.el('div', 'world-tag w-' + wl.world, wl.text);
      t.style.left = wl.pos[0] / 10 + '%'; t.style.top = wl.pos[1] / 5.6 + '%';
      canvas.appendChild(t);
    });
    // 지역 이름표
    regions.forEach(function (rg, ri) {
      var open = St.canEnter(ri * 2 + 1);
      var t = UI.el('div', 'region-tag' + (open ? '' : ' locked'),
        '<i style="background:' + D.THEME_COLOR[rg.theme] + '"></i>' + D.THEME_NAME[rg.theme] + (open ? '' : '<span class="lk"> · 잠김</span>'));
      t.style.left = rg.label[0] / 10 + '%'; t.style.top = rg.label[1] / 5.6 + '%';
      canvas.appendChild(t);
    });

    // 스테이지 표지
    D.stages.slice(0, count).forEach(function (def) {
      var n = def.n, p = D.mapPos[n - 1];
      var cleared = n <= d.clearedStage, open = St.canEnter(n), cur = r && r.stage === n;
      var last = lastType(def);
      var big = last !== 'elite';
      var cls = cur ? 'current' : cleared ? 'cleared' : open ? 'open' : 'locked';
      var icon = cleared ? 'check' : open || cur ? NODE_ICON[last] : 'lock';
      var b = UI.el('button', 'smark ' + cls + (big ? ' boss' : '') + (n === mapSel ? ' sel' : ''),
        n + '<i class="ico" style="' + UI.iconStyle(icon) + '"></i>');
      b.style.left = p[0] / 10 + '%'; b.style.top = p[1] / 5.6 + '%';
      b.setAttribute('data-tip', '<b>' + n + '. ' + D.STAGE_NAME[n - 1] + '</b><br>' + D.THEME_NAME[def.theme]);
      b.onclick = function () { mapSel = n; Meta.map(n); };
      b.ondblclick = function () { if (open || cur) startOrContinue(n); };
      canvas.appendChild(b);
    });

    // 파티 말: 진행 중인 스테이지 또는 다음 목표 위에 선다
    var at = r ? r.stage : Math.min(D.stages.length, Math.max(1, d.clearedStage + (d.clearedStage < D.stages.length ? 1 : 0)));
    var tp = D.mapPos[at - 1];
    var token = UI.el('div', 'token');
    token.appendChild(UI.spriteEl(d.party[0] || 'kai', 0.7));
    token.style.left = tp[0] / 10 + '%'; token.style.top = 'calc(' + tp[1] / 5.6 + '% - 26px)';
    canvas.appendChild(token);

    common();
    UI.show('map');
    fitMap();
    if (!resizeBound) { resizeBound = true; window.addEventListener('resize', fitMap); }
  };

  // 지도는 1000:560 비율을 지키며 틀 안에 꽉 차게
  function drawDungeon() {
    var frame = screen('map').querySelector('.map-frame');
    if (!frame) return;
    G.DungeonMap.render(frame, {
      onPick: function (j) { if (St.chooseRoom(j)) { SND('click'); Meta.continueRun(); } },
      onEnter: function () { Meta.continueRun(); }
    });
  }
  function fitMap() {
    var el = screen('map');
    if (!el.classList.contains('on')) return;
    if (el.querySelector('.map-frame.dungeon')) return drawDungeon();
    var frame = el.querySelector('.map-frame'), canvas = el.querySelector('.map-canvas');
    if (!frame || !canvas) return;
    var w = frame.clientWidth - 30, h = frame.clientHeight - 30;
    var cw = Math.min(w, h * 1000 / 560);
    canvas.style.width = Math.floor(cw) + 'px';
    canvas.style.height = Math.floor(cw * 560 / 1000) + 'px';
    canvas.classList.toggle('compact', cw < 760);
  }

  function roomLabel(node, r) {
    if (r.pending) return '보상 받기';
    if (r.upgrades) return '카드 강화하기';
    var t = node.type;
    if (t === 'rest') return '휴식처로';
    if (t === 'shop') return '상점으로';
    if (t === 'treasure') return node.result && node.result.ambush ? '전투 시작' : '보물 방으로';
    if (t === 'event') return node.result && node.result.fight ? '전투 시작' : '이벤트 보기';
    return D.NODE_NAME[t] + ' 시작';
  }

  function renderSide(side, n, dungeon) {
    var d = St.data, r = d.run, def = St.stageDef(n);
    var cleared = n <= d.clearedStage, open = St.canEnter(n), cur = r && r.stage === n;
    var last = lastType(def);
    var bossId = def.boss, seen = cleared || !!d.codex.monsters[bossId];
    var tag = last === 'final' ? '최종 보스' : last === 'boss' ? '보스' : '정예';
    var tc = UI.shade(D.THEME_COLOR[def.theme], -0.55);
    var join = def.join && d.characters.indexOf(def.join) < 0 ? charDef(def.join).name + ' 합류' : '—';
    var state = cur ? '진행 중' : cleared ? '클리어' : open ? '도전 가능' : '잠김 (앞 스테이지를 클리어)';
    var html = '<div class="side-head"><small>' + D.THEME_NAME[def.theme] + ' · STAGE ' + n + '</small><b>' + D.STAGE_NAME[n - 1] + '</b></div>' +
      '<div class="boss-card" style="--tc:' + tc + '"><span class="ribbon ' + (last === 'elite' ? 'cyan' : 'red') + '">' + tag + '</span><div class="sp boss-sp"></div>' +
      '<div class="name">' + (seen ? D.monsterById[bossId].name : '???') + '</div></div>';
    if (dungeon) {
      var sm = G.DungeonMap.summary(), sp = Math.round(St.scoutChance() * 100);
      html += '<div class="depth"><span>깊이</span><div class="bar"><i style="width:calc(' + Math.round(sm.depth / sm.total * 100) + '% - 4px)"></i></div><b>' + sm.depth + '/' + sm.total + '</b></div>' +
        '<div class="info-line" data-tip="방에 들어갈 때 그 방과 이어진 다음 방의 내용이 드러날 확률' + (d.party.indexOf('nox') >= 0 ? ' (소연이 정찰을 돕는다)' : '') + '"><span>정찰</span><span>' + sp + '%</span></div>' +
        '<div class="info-line"><span>밝혀진 방</span><span>' + sm.known + '/' + sm.ahead + '</span></div>' +
        '<div class="info-line"><span>보상</span><span>' + join + '</span></div>';
      var node = St.node();
      if (r.scouted && r.scouted.length && node && !r.pending) html += '<p class="scout-note">정찰: 앞의 방 ' + r.scouted.length + '곳이 드러났다.</p>';
      if (!node && !r.pending) {
        var ch = St.choices();
        html += '<div class="fork"><span class="dim">갈림길 — ' + ch.length + '갈래. 지도에서 방을 고른다</span><div class="fork-btns">' + ch.map(function (nd, i) {
          return '<button class="btn fork-btn" data-i="' + i + '">' + UI.icon(nd.known ? G.DungeonMap.ICON[nd.type] : 'unknown') + (nd.known ? D.NODE_NAME[nd.type] : '미지') + '</button>';
        }).join('') + '</div></div>';
      } else html += '<button class="btn gold go">' + roomLabel(node, r) + '</button>';
      if (r.col === 0 && !r.pending) html += '<button class="btn party">파티 편성</button>';
    } else {
      var R = D.mapRules, cols = def.layout === 'final' ? R.finalSplit[0] + R.finalSplit[1] + 5 : R.middleCols[0] + 3 + '~' + (R.middleCols[1] + 3);
      html += '<div class="info-line"><span>상태</span><span>' + state + '</span></div>' +
        '<div class="info-line"><span>보상</span><span>' + join + '</span></div>' +
        '<div class="info-line"><span>깊이</span><span>' + cols + '칸</span></div>' +
        '<p class="dim route-note">들어갈 때마다 길이 새로 짜인다. 방 안에 무엇이 있는지는 들어가거나 정찰해야 알 수 있다.</p>';
      if (cur) html += '<button class="btn gold goto">던전 지도로</button>';
      else if (r) html += '<p class="dim">스테이지 ' + r.stage + '을(를) 진행 중이다.</p><button class="btn goto">진행 중인 스테이지 보기</button>';
      else html += '<button class="btn gold go" ' + (open ? '' : 'disabled') + '>' + (cleared ? '다시 도전' : '출발') + '</button>';
    }
    side.innerHTML = html;
    var spr = UI.spriteEl(D.monsterById[bossId].sprite, { h: 150, max: 1.2 });
    spr.style.animation = seen ? '' : 'none';
    if (!seen) spr.style.filter = 'brightness(0)';
    side.querySelector('.boss-sp').appendChild(spr);
    var go = side.querySelector('.go');
    if (go) go.onclick = function () { startOrContinue(n); };
    UI.$$('.fork-btn', side).forEach(function (b) {
      b.onclick = function () { if (St.choose(+b.getAttribute('data-i'))) Meta.continueRun(); };
    });
    if (side.querySelector('.party')) side.querySelector('.party').onclick = function () { Meta.party(Meta.map, '확인', Meta.map); };
    if (side.querySelector('.goto')) side.querySelector('.goto').onclick = function () { mapView = 'dungeon'; Meta.map(r.stage); };
  }

  function startOrContinue(n) {
    var r = St.data.run;
    if (r) { if (r.stage === n) Meta.continueRun(); return; }
    if (!St.canEnter(n)) return;
    // 24단계: 고를 동료가 한 명뿐이면 편성 화면을 건너뛴다
    var able = St.data.characters.filter(function (id) { return !St.isDead(id); });
    if (able.length === 1 && St.setParty(able)) return Meta.enterStage(n);
    Meta.party(function () { Meta.enterStage(n); }, '스테이지 ' + n + ' 출발', function () { Meta.map(n); });
  }
  Meta.enterStage = function (n) { St.startStage(n); mapView = 'dungeon'; Meta.stageIntro(n, function () { Meta.map(n); }); };

  // 진행 중인 스테이지의 현재 노드로
  var starting = false; // 전투 시작 버튼을 빠르게 두 번 눌러도 전투는 하나만
  Meta.continueRun = function () {
    if (starting) return;
    var r = St.data.run;
    if (!r) return Meta.map();
    if (r.pending) return Meta.reward();
    var node = St.node();
    if (!node) return Meta.map();
    if (node.type === 'rest') return r.upgrades ? Meta.upgrade() : r.purges ? (St.data.run.purges = 0, Meta.rest()) : Meta.rest();
    if (node.type === 'shop') return Meta.shop();
    if (node.type === 'event' && !(node.result && node.result.fight && !node.result.cards && !r.upgrades && !r.purges && !r.dups)) return Meta.event();
    if (node.type === 'treasure' && !(node.result && node.result.ambush)) return Meta.treasure();
    // 스토리(13단계): 중간 보스·마지막 전투 직전 장면(처음 한 번)
    var kind = node.type === 'midboss' ? 'mid' : r.col === r.map.length - 1 ? 'boss' : null;
    var sc = kind && St.sceneFor(kind, r.stage);
    if (sc) return Meta.scene(sc, Meta.continueRun);
    var opts = St.battleOptions();
    var defs = opts.deck.map(function (id) { return D.cardById[id]; });
    starting = true;
    G.ArtCards.preload(defs).then(function () {
      starting = false;
      G.BattleUI.start(opts, {
        exitLabel: '맵으로', confirmExit: true,
        onExit: function () { Meta.map(); },
        onEnd: onBattleEnd
      });
      setTimeout(G.Extra.maybeTutorial, opts.boss ? 2600 : 1100);
    });
  };

  function onBattleEnd(result, battle) {
    if (result === 'win') {
      var cur = St.node(), stage = St.data.run.stage;
      var res = St.battleWon(battle);
      var next = function () {
        if (res.ending) return Meta.clear(res.clear);
        var sc = cur && cur.type === 'midboss' && St.sceneFor('midout', stage);
        if (sc) Meta.scene(sc, Meta.reward); else Meta.reward();
      };
      if (St.lastDied && St.lastDied.length) {
        var dm = UI.modal('<h2>전사</h2><p class="died">' + St.lastDied.map(function (id) { return charDef(id).name; }).join(', ') + '은(는) 쓰러진 채 다시 일어나지 못했다.</p>' +
          '<div class="row" style="justify-content:center"><button class="btn gold ok">계속</button></div>', 'result lose');
        dm.querySelector('.ok').onclick = function () { UI.closeModal(dm); Meta.traits(next); };
        return;
      }
      return Meta.traits(next);
    }
    var lost = St.battleLost(battle);
    if (lost.daily) return Meta.dailyEnd(lost.daily);
    var names = lost.died.map(function (id) { return charDef(id).name; }).join(', ');
    if (lost.wiped) {
      var w = UI.modal('<h2>원정의 끝</h2><p>' + names + '… 모두 쓰러져 다시 일어나지 못했다.<br>하드코어 모드의 기록은 여기서 사라진다.</p>' +
        '<div class="row" style="justify-content:center"><button class="btn gold ok">타이틀로</button></div>', 'result lose');
      w.querySelector('.ok').onclick = function () { UI.closeModal(w); Meta.title(); };
      return;
    }
    var m = UI.modal('<h2>패배…</h2>' + (names ? '<p class="died">' + names + '은(는) 돌아오지 못했다.</p>' : '') +
      '<p>스테이지를 처음부터 다시 시작한다. 스테이지 덱은 준비 덱으로 돌아가고,<br>골드 ' + (lost.goldLost || 0) + '을(를) 잃었다. 처음 얻은 카드·강화·유물은 남는다.</p>' +
      '<div class="row" style="justify-content:center"><button class="btn gold ok">맵으로</button></div>', 'result lose');
    m.querySelector('.ok').onclick = function () { UI.closeModal(m); Meta.map(); };
  }

  // ================= 파티 편성 =================
  Meta.party = function (onOk, okLabel, onBack) {
    var d = St.data, el = screen('party');
    var pick = d.party.slice();
    var e = D.economy;
    function render() {
      var heroes = d.characters.map(function (id) {
        var c = charDef(id), on = pick.indexOf(id) >= 0;
        if (St.isDead(id)) return '<div class="hero-pick locked dead"><div class="portrait"><div class="sp" data-id="' + id + '"></div></div><b>' + c.name + '</b><small>사망 — 다시 편성할 수 없다</small></div>';
        return '<div class="hero-pick ' + (on ? 'on' : '') + '" data-hero="' + id + '"><div class="portrait" style="--hc:' + UI.shade(c.color, -0.55) + '"><div class="sp" data-id="' + id + '"></div></div>' +
          '<b>' + c.name + ' <span class="lvtag">Lv ' + St.levelOf(id) + '</span></b><small>' + c.role + ' · ' + c.job + '<br>치명타 ' + Math.round(c.crit * 100) + '% · 덱 ' + (d.decks[id] || []).length + '장</small>' + hpBar(id) + '</div>';
      }).join('');
      var locked = D.characters.filter(function (c) { return d.characters.indexOf(c.id) < 0; }).sort(function (a, b) { return a.joinAfter - b.joinAfter; }).map(function (c) {
        return '<div class="hero-pick locked"><div class="portrait"><div class="sp lock-sp" data-lock="' + c.id + '"></div></div><b>???</b><small>' + c.joinAfter + ' 스테이지 클리어 시 합류</small></div>';
      }).join('');
      var deckSize = St.battleDeck(pick).length;
      el.innerHTML = topbar('파티 편성') +
        '<div class="meta-body"><span class="ribbon">출전할 동료를 최대 3명 고른다</span><div class="row heroes" style="justify-content:center;gap:14px">' + heroes + locked + '</div>' +
        '<div class="deck-count" data-tip="' + (St.runDecks() ? '이번 스테이지 덱 = 고른 동료들의 스테이지 덱 + 공용 스테이지 덱' : '전투 덱 = 고른 동료들의 준비 덱 + 공용 준비 덱 ' + ((d.decks.common || []).length) + '장<br>준비 덱마다 ' + e.deckMin + '~' + e.deckMax + '장 (오른쪽 위 덱 메뉴에서 편집)') + '">' +
        UI.icon('deck') + '<b>' + deckSize + '</b><span>장</span></div>' +
        '<div class="row"><button class="btn back">뒤로</button><button class="btn gold ok" ' + (pick.length ? '' : 'disabled') + '>' + okLabel + '</button></div></div>';
      backdrop(el, runTheme());
      fillSprites(el, 1);
      UI.$$('.lock-sp', el).forEach(function (s) {
        var sp = UI.spriteEl(s.getAttribute('data-lock'), 1); sp.style.filter = 'brightness(0)'; sp.style.animation = 'none'; s.appendChild(sp);
      });
      UI.$$('.hero-pick:not(.locked)', el).forEach(function (p) {
        var id = p.getAttribute('data-hero');
        p.onclick = function () {
          var i = pick.indexOf(id);
          if (i >= 0) pick.splice(i, 1); else if (pick.length < 3) pick.push(id);
          render();
        };
      });
      el.querySelector('.back').onclick = onBack;
      el.querySelector('.ok').onclick = function () { if (St.setParty(pick)) onOk(); };
    }
    render();
    UI.show('party');
  };

  // ================= 보상 =================
  Meta.reward = function () {
    var r = St.data.run, p = r.pending, el = screen('reward');
    var title = p.kind === 'boss' ? '보스 처치!' : p.kind === 'elite' ? '정예 처치!' : '승리!';
    var chosen = null;
    var relicPart = '';
    if (p.relic) relicPart += '<span class="ribbon cyan">유물 획득</span><div class="relic-tiles">' + UI.relicTile(p.relic, 'static') + '</div>';
    if (p.item && D.itemById[p.item]) relicPart += '<p class="gain item-gain">' + UI.itemBar([p.item], false, 1) + ' 소모품 <b>' + D.itemById[p.item].name + '</b> 획득 <span class="dim">— ' + U.esc(D.itemById[p.item].desc) + '</span></p>';
    if (p.relicChoice && p.relicChoice.length) {
      relicPart += '<span class="ribbon red">유물 1개를 고른다</span><div class="relic-tiles choose">' +
        p.relicChoice.map(function (id) { return UI.relicTile(id); }).join('') + '</div>' +
        '<button class="btn small skip-relic">유물 받지 않기</button>';
    }
    el.innerHTML = topbar('보상') + '<div class="meta-body">' +
      '<h1 class="big-title">' + title + '</h1>' +
      '<p class="gain"><i class="ico" style="' + UI.iconStyle('gold') + '"></i> 골드 +' + p.gold +
      (p.fill ? ' <span class="dim">(카드 후보가 모자라 +' + p.fill * D.economy.fillGold + ')</span>' : '') + '</p>' +
      (St.lastExp ? '<p class="exp-gain">' + St.lastExp.heroes.map(function (id) { return charDef(id).name; }).join(' · ') + ' 경험치 <b>+' + St.lastExp.amount + '</b></p>' : '') +
      relicPart +
      '<span class="ribbon">카드 1장을 고른다</span><div class="row reward-cards"></div>' +
      '<p class="dim deck-note">&nbsp;</p>' +
      '<div class="row"><button class="btn skip">건너뛰기 (골드 +' + D.economy.skipGold + ')</button><button class="btn gold take" disabled>카드 받기</button></div></div>';
    backdrop(el, runTheme());
    UI.$$('.relic-tiles.choose .relic-tile', el).forEach(function (t) {
      t.onclick = function () {
        St.takeRelic(t.getAttribute('data-id'));
        var rt = el.querySelector('.relic-tiles.choose');
        rt.innerHTML = UI.relicTile(t.getAttribute('data-id'), 'static sel');
        var sk = el.querySelector('.skip-relic'); if (sk) sk.remove();
      };
    });
    var skr = el.querySelector('.skip-relic');
    if (skr) skr.onclick = function () { St.takeRelic(null); el.querySelector('.relic-tiles.choose').innerHTML = '<p class="dim">유물을 받지 않았다.</p>'; skr.remove(); };
    var box = el.querySelector('.reward-cards');
    var runSize = St.runDeckList().length;
    el.querySelector('.deck-note').textContent = '고른 카드는 이번 스테이지 덱(지금 ' + runSize + '장)에 들어간다. 덱이 두꺼워지면 좋은 카드가 덜 잡힌다.';
    p.cards.forEach(function (id) {
      var c = UI.cardEl(St.cardDef(id), { static: true }), isNew = !St.owns(id);
      if (isNew) c.appendChild(UI.el('div', 'ctemp new', '<span>NEW</span>'));
      c.onclick = function () {
        chosen = id;
        UI.$$('.card', box).forEach(function (x) { x.classList.toggle('selected', x === c); });
        el.querySelector('.take').disabled = false;
        var owner = D.cardById[id].owner;
        el.querySelector('.deck-note').textContent = (owner === 'common' ? '공용' : charDef(owner).name) + ' 카드 · 스테이지 덱 ' + runSize + ' → ' + (runSize + 1) + '장' +
          (isNew ? ' · 처음 얻는 카드라 보유 카드에도 남는다' : '');
      };
      c.ondblclick = function () { finish(id); };
      box.appendChild(c);
    });
    if (!p.cards.length) box.innerHTML = '<p class="dim">얻을 수 있는 카드를 모두 모았다!</p>';
    function finish(id) {
      if (St.data.run.pending && St.data.run.pending.relicChoice) St.takeRelic(null);
      var res = St.takeReward(id);
      nodeDone(res);
    }
    el.querySelector('.take').onclick = function () { if (chosen) finish(chosen); };
    el.querySelector('.skip').onclick = function () { finish(null); };
    UI.show('reward');
  };

  // 노드를 마치고 다음으로(스테이지가 끝났으면 클리어 화면)
  function nodeDone(info) { if (info) Meta.clear(info); else Meta.map(); }

  // ================= 휴식 =================
  Meta.rest = function () {
    var talk = St.pendingTalk();
    if (talk) return Meta.talk(talk, Meta.rest);
    var d = St.data, el = screen('camp'), e = D.economy, mods = St.mods();
    el.innerHTML = topbar('휴식') + '<div class="meta-body">' +
      '<h1 class="big-title">모닥불</h1><p class="dim">하나만 고를 수 있다.</p>' +
      '<div class="row choices">' +
      '<button class="choice rest" ' + (mods.noRestHeal ? 'disabled' : '') + '><i class="ico" style="' + UI.iconStyle('campfire') + '"></i><span>회복</span><small>' +
      (mods.noRestHeal ? '혈마의 관: 휴식으로 회복할 수 없다' : '동료 전원 체력 ' + e.restPct * 100 + '% 회복') + '</small></button>' +
      '<button class="choice up" ' + (St.upgradable().length ? '' : 'disabled') + '><i class="ico" style="' + UI.iconStyle('anvil') + '"></i><span>강화</span><small>' +
      (St.upgradable().length ? '보유 카드 1장 강화' : '강화할 카드가 없다') + '</small></button>' +
      '<button class="choice purge" ' + (St.canRemove() ? '' : 'disabled') + '><i class="ico" style="' + UI.iconStyle('scroll') + '"></i><span>정리</span><small>' +
      (St.canRemove() ? '스테이지 덱에서 카드 1장 빼기' : '덱이 ' + e.runDeckMin + '장이라 더 뺄 수 없다') + '</small></button>' +
      '</div><div class="panel-box"><div class="party-row">' + d.characters.map(miniHero).join('') + '</div></div>' +
      '<div class="row"><button class="btn party">파티 편성</button><button class="btn back">맵으로</button></div></div>';
    backdrop(el, runTheme());
    fillSprites(el, 0.75);
    el.querySelector('.rest').onclick = function () {
      var info = St.rest();
      var m = UI.modal('<h2>모닥불 곁에서 쉬었다</h2><p>동료 전원의 체력이 회복되었다.</p><div class="row" style="justify-content:center"><button class="btn gold ok">계속</button></div>');
      m.querySelector('.ok').onclick = function () { UI.closeModal(m); nodeDone(info); };
    };
    el.querySelector('.up').onclick = function () { St.restUpgrade(); Meta.upgrade(); };
    el.querySelector('.purge').onclick = function () {
      St.restPurgeStart();
      Meta.pickRunCard('정리', '스테이지 덱에서 뺄 카드 1장을 고른다. 이번 스테이지에서만 빠지고, 다음 스테이지에는 준비 덱 그대로 돌아온다.', '빼기', function (id) {
        var out = St.restPurge(id);
        if (out) { SND('buff'); nodeDone(out.info); }
      }, function () { St.data.run.purges = 0; St.save(); Meta.rest(); });
    };
    el.querySelector('.party').onclick = function () { Meta.party(Meta.rest, '확인', Meta.rest); };
    el.querySelector('.back').onclick = function () { Meta.map(); };
    UI.show('camp');
  };

  // ================= 카드 강화 =================
  // 휴식·이벤트에서 받은 강화 기회(run.upgrades)를 쓴다. 끝나면 휴식은 다음 노드로, 이벤트는 결과 화면으로
  var upFilter = 'all';
  Meta.upgrade = function () {
    var d = St.data, r = d.run, el = screen('camp');
    var after = function () {
      var node = St.node();
      if (node && node.type === 'rest') nodeDone(St.advance()); else Meta.continueRun();
    };
    if (!r || !r.upgrades) return after();
    var owners = ['all'].concat(d.characters, ['common']);
    var list = St.upgradable().filter(function (id) { return upFilter === 'all' || D.cardById[id].owner === upFilter; });
    var inDeck = function (id) { return St.inRunDeck(id); };
    list.sort(function (a, b) { return (inDeck(b) - inDeck(a)) || (a < b ? -1 : 1); });
    el.innerHTML = topbar('카드 강화') + '<div class="meta-body">' +
      '<h1 class="big-title">카드 강화</h1><p class="dim">카드 1장을 골라 한 단계 강화한다(원정 중에는 ' + G.Upgrade.FIELD_MAX + '단계까지, 그 위는 로비 대장간에서 금화로). 2단계부터는 수치와 함께 각인이 붙는다. 강화는 그 카드에 영구히 남는다. (남은 강화 ' + r.upgrades + ')</p>' +
      '<div class="row up-filters">' + owners.map(function (o) {
        return '<button class="btn small ' + (upFilter === o ? 'on' : '') + '" data-o="' + o + '">' + (o === 'all' ? '전체' : o === 'common' ? '공용' : charDef(o).name) + '</button>';
      }).join('') + '</div>' +
      '<div class="up-wrap"><div class="up-grid"></div><div class="up-preview frame"><p class="dim">카드를 고르면<br>강화 전·후를 보여 준다.</p></div></div>' +
      '<div class="row"><button class="btn skip">강화하지 않기</button><button class="btn gold ok" disabled>강화</button></div></div>';
    backdrop(el, runTheme());
    var grid = el.querySelector('.up-grid'), prev = el.querySelector('.up-preview'), chosen = null;
    list.forEach(function (id) {
      var c = UI.cardEl(St.cardDef(id), { static: true });
      c.classList.add('mini');
      if (inDeck(id)) c.appendChild(UI.el('div', 'ctemp', '<span>덱</span>'));
      c.appendChild(UI.el('div', 'up-lv', '<span>' + St.upLevel(id) + ' &#8594; ' + (St.upLevel(id) + 1) + '단계</span>'));
      c.onclick = function () {
        chosen = id;
        UI.$$('.card', grid).forEach(function (x) { x.classList.toggle('selected', x === c); });
        prev.innerHTML = '<div class="up-pair"></div>';
        var pair = prev.querySelector('.up-pair');
        var nx = St.nextDef(id);
        pair.appendChild(UI.cardEl(St.cardDef(id), { static: true }));
        pair.appendChild(UI.el('div', 'up-arrow', '&#9654;'));
        pair.appendChild(UI.cardEl(nx, { static: true }));
        if (nx.engrave) prev.appendChild(UI.el('p', 'up-engr', '<b>' + nx.level + '단계 각인 「' + nx.engrave.name + '」</b><br>' + U.esc(nx.engrave.text) +
          (nx.level === 2 ? '<br><span class="dim">3단계에서 더 강한 각인으로 바뀐다.</span>' : '')));
        el.querySelector('.ok').disabled = false;
      };
      c.ondblclick = function () { chosen = id; done(); };
      grid.appendChild(c);
    });
    if (!list.length) grid.innerHTML = '<p class="dim">강화할 카드가 없다.</p>';
    function done() {
      if (!chosen || !St.upgradeCard(chosen)) return;
      var name = St.cardDef(chosen).name;
      var m = UI.modal('<h2>' + U.josa(name, '이/가') + ' 되었다!</h2><div class="row" style="justify-content:center"></div><div class="row" style="justify-content:center"><button class="btn gold ok">계속</button></div>');
      m.querySelector('.row').appendChild(UI.cardEl(St.cardDef(chosen), { static: true }));
      SND('buff');
      m.querySelector('.ok').onclick = function () { UI.closeModal(m); if (St.data.run.upgrades) Meta.upgrade(); else after(); };
    }
    UI.$$('[data-o]', el).forEach(function (b) { b.onclick = function () { upFilter = b.getAttribute('data-o'); Meta.upgrade(); }; });
    el.querySelector('.ok').onclick = done;
    el.querySelector('.skip').onclick = function () {
      confirmBox('강화하지 않고 넘어갈까요?', '넘어가기', function () { St.skipUpgrade(); after(); });
    };
    UI.show('camp');
  };

  // ================= 33단계: 대장간(로비, 4~10단계 강화) =================
  var forgeFilter = 'all', forgePick = null;
  Meta.forge = function () {
    var d = St.data, el = screen('camp'), F = D.forge;
    var owners = ['all'].concat(d.characters, ['common']);
    var all = St.forgeList();
    var list = all.filter(function (id) { return forgeFilter === 'all' || D.cardById[id].owner === forgeFilter; });
    list.sort(function (a, b) { return (St.upLevel(b) - St.upLevel(a)) || (a < b ? -1 : 1); });
    var lowN = d.cards.filter(function (id) { return St.upLevel(id) < F.minLevel; }).length;
    el.innerHTML = topbar('대장간') + '<div class="meta-body forge">' +
      '<h1 class="big-title">천외 대장간</h1>' +
      '<p class="dim forge-rule">3단계까지 강화한 카드를 금화로 <b>10단계</b>까지 벼린다. 단계가 오를수록 금화가 많이 들고 성공 확률이 낮아진다. ' +
      '<b class="bad">실패하면 1단계 내려간다</b>(3단계 아래로는 떨어지지 않는다). 4~6단계 <b>진(眞)</b> · 7~9단계 <b>각성</b>(비용 -1) · 10단계 <b>극의</b>(보존)는 각인이 크게 강해진다.' +
      (lowN ? ' <span class="dim">1~3단계 강화는 원정 중 휴식·이벤트에서 한다.</span>' : '') + '</p>' +
      '<div class="row up-filters">' + owners.map(function (o) {
        return '<button class="btn small ' + (forgeFilter === o ? 'on' : '') + '" data-o="' + o + '">' + (o === 'all' ? '전체' : o === 'common' ? '공용' : charDef(o).name) + '</button>';
      }).join('') + '</div>' +
      '<div class="up-wrap"><div class="up-grid"></div><div class="up-preview frame forge-preview"><p class="dim">벼릴 카드를 고르면<br>다음 단계와 확률·금화를 보여 준다.</p></div></div>' +
      '<div class="row"><button class="btn back">로비로</button></div></div>';
    backdrop(el, 'volcano');
    var grid = el.querySelector('.up-grid'), prev = el.querySelector('.forge-preview');
    var show = function (id) {
      forgePick = id;
      UI.$$('.card', grid).forEach(function (x) { x.classList.toggle('selected', x._id === id); });
      var lv = St.upLevel(id), nx = St.nextDef(id), cost = St.forgeCost(id), p = St.forgeChance(id), failTo = St.forgeFailTo(id);
      prev.innerHTML = '<div class="up-pair"></div>' +
        '<div class="forge-odds"><div><span>성공</span><b class="good">' + Math.round(p * 100) + '%</b><small>' + lv + ' → ' + (lv + 1) + '단계</small></div>' +
        '<div><span>실패</span><b class="bad">' + Math.round((1 - p) * 100) + '%</b><small>' + (failTo === lv ? lv + '단계 유지' : lv + ' → ' + failTo + '단계') + '</small></div>' +
        '<div><span>금화</span><b class="gold">' + cost + '</b><small>가진 금화 ' + d.gold + '</small></div></div>' +
        (nx.engrave ? '<p class="up-engr"><b>' + nx.level + '단계 각인 「' + U.esc(nx.engrave.name) + '」</b><br>' + U.esc(nx.engrave.text) + '</p>' : '') +
        '<button class="btn gold big go"' + (d.gold < cost ? ' disabled' : '') + '>' + (d.gold < cost ? '금화가 모자라다' : '벼리기 · ' + cost + ' 골드') + '</button>';
      var pair = prev.querySelector('.up-pair');
      pair.appendChild(UI.cardEl(St.cardDef(id), { static: true }));
      pair.appendChild(UI.el('div', 'up-arrow', '&#9654;'));
      pair.appendChild(UI.cardEl(nx, { static: true }));
      prev.querySelector('.go').onclick = function () { strike(id); };
    };
    var strike = function (id) {
      var res = St.forge(id);
      if (!res.ok) return;
      SND(res.success ? 'big' : 'hit');
      var def = St.cardDef(id);
      var m = UI.modal('<h2>' + (res.success ? '강화 성공! ' + res.to + '단계' : res.to === res.from ? '강화 실패 — ' + res.to + '단계는 지켰다' : '강화 실패… ' + res.from + ' → ' + res.to + '단계') + '</h2>' +
        '<div class="row forge-result ' + (res.success ? 'win' : 'lose') + '" style="justify-content:center"></div>' +
        '<p class="dim" style="text-align:center">금화 ' + res.cost + '을 썼다 · 남은 금화 ' + St.data.gold + '</p>' +
        '<div class="row" style="justify-content:center"><button class="btn gold ok">확인</button></div>', 'result forge-res' + (res.success ? '' : ' lose'));
      m.querySelector('.forge-result').appendChild(UI.cardEl(def, { static: true }));
      m.querySelector('.ok').onclick = function () { UI.closeModal(m); Meta.forge(); };
    };
    list.forEach(function (id) {
      var c = UI.cardEl(St.cardDef(id), { static: true });
      c._id = id;
      c.classList.add('mini');
      if (St.data.run && St.inRunDeck(id)) c.appendChild(UI.el('div', 'ctemp', '<span>덱</span>'));
      c.appendChild(UI.el('div', 'up-lv', '<span>' + St.upLevel(id) + '단계 · ' + Math.round(St.forgeChance(id) * 100) + '%</span>'));
      c.onclick = function () { show(id); };
      grid.appendChild(c);
    });
    if (!list.length) grid.innerHTML = '<p class="dim">벼릴 수 있는 카드가 없다. 원정 중 휴식·이벤트에서 카드를 3단계까지 강화하면 여기서 더 올릴 수 있다.</p>';
    if (forgePick && list.indexOf(forgePick) >= 0) show(forgePick);
    UI.$$('[data-o]', el).forEach(function (b) { b.onclick = function () { forgeFilter = b.getAttribute('data-o'); Meta.forge(); }; });
    el.querySelector('.back').onclick = function () { Meta.lobby(); };
    UI.show('camp');
  };

  // ================= 이벤트 =================
  Meta.event = function () {
    var d = St.data, r = d.run, node = St.node(), ev = St.eventDef(), el = screen('camp');
    if (!ev) return Meta.map();
    var res = node.result;
    var body = '<div class="event-card frame"><div class="event-icon"><i class="ico" style="' + UI.iconStyle(ev.icon) + '"></i></div>' +
      '<div class="event-text"><p>' + U.esc(ev.text) + '</p>';
    if (!res) {
      body += '<div class="event-choices">' + ev.choices.map(function (ch, i) {
        var ok = St.canChoose(ch);
        return '<button class="choice-line" data-i="' + i + '" ' + (ok ? '' : 'disabled') + '><b>' + U.esc(ch.label) + '</b><small>' + U.esc(ch.desc) +
          (ok ? '' : ' (골드 ' + ch.need.gold + ' 필요)') + '</small></button>';
      }).join('') + '</div>';
    } else {
      body += '<p class="event-result">' + U.esc(res.text || '') + '</p>' +
        (res.log.length ? '<ul class="event-log">' + res.log.map(function (l) { return '<li>' + U.esc(l) + '</li>'; }).join('') + '</ul>' : '');
    }
    body += '</div></div>';
    var waiting = res && (res.cards || r.upgrades || r.purges || r.dups);
    el.innerHTML = topbar('이벤트') + '<div class="meta-body">' +
      '<span class="ribbon">이벤트</span><h1 class="big-title">' + U.esc(ev.name) + '</h1>' + body +
      (res && res.cards ? '<span class="ribbon">카드 1장을 고른다</span><div class="row reward-cards"></div><button class="btn small skip-card">받지 않기</button>' : '') +
      (res && res.relic ? '<div class="relic-tiles">' + UI.relicTile(res.relic, 'static') + '</div>' : '') +
      (res && res.item && D.itemById[res.item] ? '<p class="gain item-gain">' + UI.itemBar([res.item], false, 1) + ' 소모품 <b>' + D.itemById[res.item].name + '</b></p>' : '') +
      (res && res.gotCard ? '<div class="row got-card"></div>' : '') +
      (res ? '<div class="row">' + (r.upgrades ? '<button class="btn gold up">카드 강화하기</button>' : '') +
        (r.purges ? '<button class="btn gold epurge">카드 정리하기 (' + r.purges + ')</button>' : '') + (r.dups ? '<button class="btn gold edup">카드 복제하기</button>' : '') +
        '<button class="btn ' + (waiting ? '' : 'gold ') + 'next" ' + (waiting ? 'disabled' : '') + '>' + (res.fight ? '전투 시작' : '계속') + '</button></div>' :
        '<div class="row"><button class="btn back">맵으로</button></div>') + '</div>';
    backdrop(el, runTheme());
    UI.$$('.choice-line', el).forEach(function (b) {
      b.onclick = function () { if (St.eventChoose(+b.getAttribute('data-i'))) { SND('coin'); Meta.event(); } };
    });
    if (res && res.cards) {
      var box = el.querySelector('.reward-cards');
      res.cards.forEach(function (id) {
        var c = UI.cardEl(D.cardById[id], { static: true });
        c.onclick = function () { St.eventTakeCard(id); Meta.event(); };
        box.appendChild(c);
      });
      el.querySelector('.skip-card').onclick = function () { St.eventTakeCard(null); Meta.event(); };
    }
    if (res && res.gotCard) el.querySelector('.got-card').appendChild(UI.cardEl(D.cardById[res.gotCard], { static: true }));
    if (el.querySelector('.up')) el.querySelector('.up').onclick = function () { Meta.upgrade(); };
    if (el.querySelector('.epurge')) el.querySelector('.epurge').onclick = function () {
      Meta.pickRunCard('카드 정리', '스테이지 덱에서 뺄 카드를 고른다. 이번 스테이지에서만 빠진다.', '빼기', function (id) { St.eventPurge(id); Meta.event(); },
        function () { St.skipEventDeck(); Meta.event(); });
    };
    if (el.querySelector('.edup')) el.querySelector('.edup').onclick = function () {
      Meta.pickRunCard('카드 복제', '스테이지 덱에서 한 장 더 넣을 카드를 고른다.', '복제', function (id) { St.eventDup(id); Meta.event(); },
        function () { St.skipEventDeck(); Meta.event(); });
    };
    if (el.querySelector('.next')) el.querySelector('.next').onclick = function () {
      if (res.fight) Meta.continueRun(); else nodeDone(St.eventFinish());
    };
    if (el.querySelector('.back')) el.querySelector('.back').onclick = function () { Meta.map(); };
    UI.show('camp');
  };
  // ================= 보물 방(14단계) =================
  // 상자를 열지(골드·가끔 유물, 그러나 매복일 수도) 그냥 지나칠지 고른다
  Meta.treasure = function () {
    var r = St.data.run, node = St.node(), el = screen('camp');
    if (!node || node.type !== 'treasure') return Meta.map();
    var res = node.result;
    var text = !res ? '먼지 쌓인 상자가 어둠 속에 놓여 있다. 자물쇠는 녹슬었고, 주위가 너무 조용하다. 무언가 숨죽이고 있는 것만 같다.' :
      res.ambush ? '상자는 미끼였다! 그림자 속에 숨어 있던 적들이 덮쳐 온다. 물리치면 상자 안의 골드를 챙길 수 있다.' :
      '삐걱이며 뚜껑이 열린다. 오래 잠들어 있던 보물이 횃불에 반짝인다.';
    var loot = res && !res.ambush ? '<div class="loot"><span class="res">' + UI.icon('gold') + '+' + res.gold + '</span></div>' +
      (res.relic ? '<div class="relic-tiles">' + UI.relicTile(res.relic, 'static') + '</div>' : '') : '';
    el.innerHTML = topbar('보물 방') + '<div class="meta-body">' +
      '<span class="ribbon">보물 방</span><h1 class="big-title">' + (res && res.ambush ? '매복!' : '잊힌 상자') + '</h1>' +
      '<div class="event-card frame treasure-card"><div class="chest-stage' + (res ? res.ambush ? ' trap' : ' opened' : '') + '"><i class="ico chest-big" style="' +
      UI.iconStyle(res && !res.ambush ? 'chest_open' : 'chest') + '"></i></div>' +
      '<div class="event-text"><p>' + text + '</p>' + loot + '</div></div>' +
      '<div class="row">' + (!res ? '<button class="btn gold open">상자를 연다</button><button class="btn ghost pass">그냥 지나간다</button>' :
        res.ambush ? '<button class="btn danger fight">전투 시작</button>' : '<button class="btn gold next">계속</button>') +
      '<button class="btn small ghost back">지도로</button></div></div>';
    backdrop(el, runTheme());
    var q = function (c) { return el.querySelector(c); };
    if (q('.open')) q('.open').onclick = function () {
      var out = St.openTreasure();
      SND(out.ambush ? 'big' : 'coin');
      Meta.treasure();
    };
    if (q('.pass')) q('.pass').onclick = function () { nodeDone(St.leaveTreasure()); };
    if (q('.fight')) q('.fight').onclick = function () { Meta.continueRun(); };
    if (q('.next')) q('.next').onclick = function () { nodeDone(St.leaveTreasure()); };
    q('.back').onclick = function () { Meta.map(); };
    UI.show('camp');
  };

  function SND(k) { if (G.Audio) G.Audio.play(k); }

  // ================= 야영지 대화(9단계) =================
  // 두 캐릭터의 도트 초상이 좌우에 서고, 말하는 쪽이 밝아진다. 누르면 다음 줄, 건너뛰기 가능
  Meta.talk = function (t, done) {
    var pair = t.key.split('+'), el = screen('camp'), i = 0;
    el.innerHTML = topbar('모닥불 이야기') + '<div class="talk">' +
      '<div class="talk-stage"><div class="portrait-l"></div><div class="fire"><i class="ico" style="' + UI.iconStyle('campfire') + '"></i></div><div class="portrait-r"></div></div>' +
      '<div class="talk-box frame"><b class="who"></b><p class="line"></p><div class="row talk-btns"><button class="btn small ghost skip">건너뛰기</button><button class="btn gold next">다음</button></div></div>' +
      '<p class="dim talk-note">' + charDef(pair[0]).name + ' · ' + charDef(pair[1]).name + ' — 이야기 ' + (t.index + 1) + '/3 · 끝까지 들으면 친밀도 +' + D.bondGain.talk + '</p></div>';
    backdrop(el, runTheme());
    var pl = el.querySelector('.portrait-l'), pr = el.querySelector('.portrait-r');
    [[pl, pair[0], false], [pr, pair[1], true]].forEach(function (x) {
      var sp = UI.spriteEl(x[1], 2.6);
      if (x[2]) sp.style.transform = 'scaleX(-1)';
      x[0].appendChild(sp);
      x[0].setAttribute('data-id', x[1]);
    });
    var show = function () {
      var ln = t.lines[i], who = ln[0];
      el.querySelector('.who').textContent = charDef(who).name;
      el.querySelector('.who').style.color = charDef(who).color;
      var line = el.querySelector('.line');
      line.textContent = ln[1];
      line.classList.remove('in'); void line.offsetWidth; line.classList.add('in');
      pl.classList.toggle('speak', who === pair[0]); pr.classList.toggle('speak', who === pair[1]);
      el.querySelector('.next').textContent = i === t.lines.length - 1 ? '마치기' : '다음';
    };
    var end = function (finished) { St.finishTalk(finished ? t.key : null); done(); };
    el.querySelector('.next').onclick = function () { if (++i >= t.lines.length) end(true); else show(); };
    el.querySelector('.talk-box').addEventListener('click', function (e) { if (!e.target.closest('.btn')) el.querySelector('.next').click(); });
    el.querySelector('.skip').onclick = function () { end(true); };
    show();
    UI.show('camp');
  };

  // ================= 레벨업 특성 고르기(9단계) =================
  Meta.traits = function (next) {
    var p = St.pendingTrait();
    if (!p) return next();
    var c = charDef(p.id);
    var m = UI.modal('<div class="lvup"><div class="lvup-sp"></div><div><small class="dim">LEVEL UP</small><h2>' + c.name + ' Lv ' + p.level + '</h2>' +
      '<p class="dim">두 특성 중 하나를 고른다. 고른 특성은 바꿀 수 없다.</p></div></div>' +
      '<div class="row choices">' + p.options.map(function (o, i) {
        return '<button class="choice trait" data-i="' + i + '"><span>' + U.esc(o.name) + '</span><small>' + U.esc(o.desc) + '</small></button>';
      }).join('') + '</div>', 'lvmodal', true);
    m.querySelector('.lvup-sp').appendChild(UI.spriteEl(p.id, 1.4));
    SND('win');
    UI.$$('.choice.trait', m).forEach(function (b) {
      b.onclick = function () {
        St.chooseTrait(p.id, +b.getAttribute('data-i'));
        UI.closeModal(m);
        Meta.traits(next);
      };
    });
  };

  // ================= 스테이지 덱에서 카드 고르기(19단계: 정리·제거·복제) =================
  Meta.pickRunCard = function (title, desc, okLabel, onPick, onCancel) {
    var el = screen('camp'), chosen = null, rd = St.runDecks() || {};
    var owners = St.data.party.concat(['common']).concat(Object.keys(rd).filter(function (o) { return o !== 'common' && St.data.party.indexOf(o) < 0; }));
    el.innerHTML = topbar(title) + '<div class="meta-body">' +
      '<h1 class="big-title">' + title + '</h1><p class="dim">' + U.esc(desc) + '</p>' +
      '<div class="pick-groups"></div>' +
      '<div class="row"><button class="btn back">취소</button><button class="btn gold ok" disabled>' + okLabel + '</button></div></div>';
    backdrop(el, runTheme());
    var wrap = el.querySelector('.pick-groups');
    owners.forEach(function (o) {
      var list = (rd[o] || []).slice().sort();
      if (!list.length) return;
      var inParty = o === 'common' || St.data.party.indexOf(o) >= 0;
      wrap.appendChild(UI.el('h3', 'pick-h', (o === 'common' ? '공용' : charDef(o).name) + ' <span class="dim">' + list.length + '장' + (inParty ? '' : ' · 지금 편성 밖') + '</span>'));
      var grid = UI.el('div', 'up-grid pick-grid');
      list.forEach(function (id) {
        var c = UI.cardEl(St.cardDef(id), { static: true });
        c.classList.add('mini');
        c.onclick = function () {
          chosen = id;
          UI.$$('.card', wrap).forEach(function (x) { x.classList.toggle('selected', x === c); });
          el.querySelector('.ok').disabled = false;
        };
        c.ondblclick = function () { chosen = id; onPick(id); };
        grid.appendChild(c);
      });
      wrap.appendChild(grid);
    });
    el.querySelector('.ok').onclick = function () { if (chosen) onPick(chosen); };
    el.querySelector('.back').onclick = onCancel;
    UI.show('camp');
  };

  // ================= 상점 =================
  Meta.shop = function () {
    var d = St.data, s = St.openShop(), el = screen('camp'), e = D.economy;
    var relicHTML = '';
    if (s.relic) {
      var rp = St.price(s.relic);
      relicHTML = '<div class="shop-item">' + UI.relicTile(s.relic, 'static' + (s.relicSold ? ' sold' : '')) +
        '<div class="price buy-relic ' + (s.relicSold ? 'sold' : d.gold < rp ? 'poor' : '') + '">' +
        (s.relicSold ? '구매함' : '<i class="ico" style="' + UI.iconStyle('gold') + '"></i>' + rp) + '</div></div>';
    }
    el.innerHTML = topbar('상점') + '<div class="meta-body">' +
      '<h1 class="big-title">떠돌이 상인</h1>' +
      '<span class="ribbon">카드</span><div class="row shop-cards"></div>' +
      '<div class="row shop-extras">' +
      (relicHTML ? '<div class="col"><span class="ribbon cyan">유물</span><div class="relic-tiles">' + relicHTML + '</div></div>' : '') +
      ((s.items || []).length ? '<div class="col"><span class="ribbon">소모품 <span class="dim">(칸 ' + St.items().length + '/' + D.itemEconomy.slots + ')</span></span><div class="items-row shop-items">' + s.items.map(function (iid, i) {
        var it = D.itemById[iid], sold = s.itemSold[i], ip = St.itemPrice(iid);
        return '<div class="shop-item">' + UI.itemBar([iid], false, 1) + '<small>' + it.name + '</small><div class="price buy-item ' + (sold ? 'sold' : d.gold < ip || !St.itemRoom() ? 'poor' : '') + '" data-i="' + i + '">' +
          (sold ? '구매함' : '<i class="ico" style="' + UI.iconStyle('gold') + '"></i>' + ip) + '</div></div>';
      }).join('') + '</div></div>' : '') + '</div>' +
      '<div class="row">' +
      '<button class="btn heal" ' + (s.healed || d.gold < e.healCost ? 'disabled' : '') + '>치료: 전원 ' + e.healPct * 100 + '% 회복 (' + e.healCost + ' 골드)' + (s.healed ? ' · 완료' : '') + '</button>' +
      '<button class="btn refresh" ' + (d.gold < e.refreshCost ? 'disabled' : '') + '>진열 새로고침 (' + e.refreshCost + ' 골드)</button>' +
      '<button class="btn remove" ' + (d.gold < St.removeCost() || !St.canRemove() ? 'disabled' : '') + ' data-tip="스테이지 덱에서 한 장을 뺀다. 이 스테이지에서 쓸 때마다 ' + e.removeStep + ' 골드씩 오른다">카드 제거 (' + St.removeCost() + ' 골드)</button>' +
      '<button class="btn dup" ' + (s.duped || d.gold < e.dupCost ? 'disabled' : '') + ' data-tip="스테이지 덱의 카드 한 장을 한 장 더. 상점마다 한 번">카드 복제 (' + e.dupCost + ' 골드)' + (s.duped ? ' · 완료' : '') + '</button>' +
      '<button class="btn party">파티 편성</button>' +
      '<button class="btn gold leave">상점 나가기</button></div></div>';
    backdrop(el, runTheme());
    var box = el.querySelector('.shop-cards');
    s.cards.forEach(function (id) {
      var sold = s.sold.indexOf(id) >= 0, price = St.price(id);
      var wrap = UI.el('div', 'shop-item');
      var c = UI.cardEl(St.cardDef(id), { static: true });
      if (!St.owns(id)) c.appendChild(UI.el('div', 'ctemp new', '<span>NEW</span>'));
      if (sold) c.classList.add('unplayable');
      wrap.appendChild(c);
      var tag = UI.el('div', 'price ' + (sold ? 'sold' : d.gold < price ? 'poor' : ''),
        sold ? '구매함' : '<i class="ico" style="' + UI.iconStyle('gold') + '"></i>' + price);
      wrap.appendChild(tag);
      if (!sold) c.onclick = tag.onclick = function () {
        if (d.gold < price) return;
        confirmBox(U.josa(D.cardById[id].name, '을/를') + ' ' + price + ' 골드에 살까요?', '구매', function () { St.buy(id); Meta.shop(); });
      };
      box.appendChild(wrap);
    });
    if (!s.cards.length) box.innerHTML = '<p class="dim">팔 수 있는 카드가 없다.</p>';
    var br = el.querySelector('.buy-relic');
    if (br && !s.relicSold) br.onclick = function () {
      if (d.gold < St.price(s.relic)) return;
      confirmBox(U.josa(D.relicById[s.relic].name, '을/를') + ' ' + St.price(s.relic) + ' 골드에 살까요?', '구매', function () { St.buyRelic(); Meta.shop(); });
    };
    UI.$$('.buy-item', el).forEach(function (b) {
      b.onclick = function () { if (St.buyItem(+b.getAttribute('data-i'))) { SND('coin'); Meta.shop(); } };
    });
    el.querySelector('.heal').onclick = function () { if (St.shopHeal()) Meta.shop(); };
    el.querySelector('.refresh').onclick = function () { if (St.shopRefresh()) Meta.shop(); };
    el.querySelector('.remove').onclick = function () {
      Meta.pickRunCard('카드 제거', '스테이지 덱에서 뺄 카드를 고른다(' + St.removeCost() + ' 골드). 다음 스테이지에는 준비 덱 그대로 돌아온다.', '제거', function (id) {
        if (St.shopRemove(id)) SND('coin');
        Meta.shop();
      }, Meta.shop);
    };
    el.querySelector('.dup').onclick = function () {
      Meta.pickRunCard('카드 복제', '스테이지 덱에서 한 장 더 넣을 카드를 고른다(' + e.dupCost + ' 골드).', '복제', function (id) {
        if (St.shopDuplicate(id)) SND('coin');
        Meta.shop();
      }, Meta.shop);
    };
    el.querySelector('.party').onclick = function () { Meta.party(Meta.shop, '확인', Meta.shop); };
    el.querySelector('.leave').onclick = function () { nodeDone(St.leaveShop()); };
    UI.show('camp');
  };

  // ================= 새 원정 · 승천(10단계) =================
  var ascSel = null;
  Meta.ascend = function () {
    var d = St.data, el = screen('camp'), max = St.maxAscension();
    if (ascSel == null || ascSel > max) ascSel = max;
    var lv = ascSel, em = St.enemyMods.bind(St);
    // 고른 단계로 바꿔 계산해 본다(1 스테이지와 10 스테이지 적 보정)
    var cur = d.ascension.current;
    d.ascension.current = lv;
    var e1 = em(1), e10 = em(10);
    d.ascension.current = cur;
    var levels = '';
    for (var i = 0; i <= D.ascension.length; i++) {
      var locked = i > max;
      levels += '<button class="asc-lv' + (i === lv ? ' on' : '') + (locked ? ' locked' : '') + (i <= (d.ascension.best || 0) && i > 0 ? ' done' : '') + '" data-lv="' + i + '" ' + (locked ? 'disabled' : '') + '>' + (i || '기본') + '</button>';
    }
    var rules = D.ascension.filter(function (a) { return a.n <= lv; }).map(function (a) {
      return '<li class="' + (a.n === lv ? 'new' : '') + '"><b>' + a.n + '</b> ' + U.esc(a.name) + ' <span class="dim">— ' + U.esc(a.desc) + '</span></li>';
    }).join('');
    el.innerHTML = topbar('새 원정') + '<div class="meta-body">' +
      '<h1 class="big-title">새 원정</h1>' +
      '<p class="dim">카드·강화·유물·골드·동료·성장·친밀도·도감은 그대로, <b>스테이지 진행만</b> 처음부터 다시 시작한다.</p>' +
      '<div class="asc-levels">' + levels + '</div>' +
      '<div class="asc-panel frame"><h2>' + (lv ? '승천 ' + lv : '기본 원정') + '</h2>' +
      (lv ? '<div class="asc-scale"><span>적 체력 <b>×' + (1 + e1.hpMult).toFixed(1) + '</b> ~ <b>×' + (1 + e10.hpMult).toFixed(1) + '</b></span>' +
        '<span>적 공격 <b>×' + (1 + e1.dmgMult).toFixed(1) + '</b> ~ <b>×' + (1 + e10.dmgMult).toFixed(1) + '</b></span></div>' +
        '<ul class="asc-rules">' + rules + '</ul>' : '<p class="dim">승천 규칙 없이 처음 원정과 같은 난이도로 떠난다.</p>') +
      '<p class="dim">최고 기록: ' + (d.ascension.best ? '승천 ' + d.ascension.best : '기본 원정') + ' · 그 단계를 깨면 다음 단계가 열린다</p></div>' +
      '<div class="row"><button class="btn ghost back">돌아가기</button><button class="btn gold big go">원정 시작</button></div></div>';
    backdrop(el, 'castle');
    UI.$$('.asc-lv:not(.locked)', el).forEach(function (b) { b.onclick = function () { ascSel = +b.getAttribute('data-lv'); Meta.ascend(); }; });
    el.querySelector('.back').onclick = function () { Meta.map(); };
    el.querySelector('.go').onclick = function () {
      confirmBox((lv ? '승천 ' + lv : '기본') + ' 원정을 시작할까요? 스테이지 진행이 처음부터 시작된다.', '원정 시작', function () {
        if (St.newExpedition(lv)) {
          UI.wipe();
          var sc = lv > 0 && St.sceneFor('ascend', 20);
          if (sc) Meta.scene(sc, function () { Meta.map(1); }); else Meta.map(1);
        }
      });
    };
    UI.show('camp');
  };

  // ================= 스테이지 클리어 · 엔딩 =================
  Meta.clear = function (info) {
    if (info.daily) return Meta.dailyEnd(info.daily);
    // 스토리(13단계): 처음 클리어하면 결말 장면부터
    var sc = info.first && St.sceneFor('outro', info.stage);
    if (sc) return Meta.scene(sc, function () { Meta.clear(info); });
    var el = screen('clear');
    var join = '';
    if (info.joined) {
      var c = charDef(info.joined);
      join = '<div class="join frame gold"><div class="sp"></div><div><h2>' + U.josa(c.name, '이/가') + ' 동료가 되었다!</h2>' +
        '<p>' + c.role + ' · ' + c.job + ' · 체력 ' + c.hp + '</p><p class="dim">' + c.desc + '</p><p>' + c.name + '의 기본 카드 8장을 얻었다.</p></div></div>';
    }
    el.innerHTML = topbar('스테이지 클리어') + '<div class="meta-body">' +
      '<span class="ribbon">STAGE ' + info.stage + ' CLEAR</span>' +
      '<h1 class="big-title">' + D.STAGE_NAME[info.stage - 1] + ' 돌파!</h1>' +
      (info.first ? '' : '<p class="dim">이미 클리어한 스테이지를 다시 깼다.</p>') + join +
      (info.gold ? '<p class="clear-gold">' + UI.icon('gold') + ' 돌파 금화 <b>+' + info.gold + '</b> <span class="dim">(로비 대장간에서 카드를 벼릴 수 있다)</span></p>' : '') +
      '<div class="row"><button class="btn gold ok">' + (info.ending || info.riftEnding ? '엔딩 보기' : '맵으로') + '</button></div></div>';
    backdrop(el, St.stageDef(info.stage).theme);
    if (info.joined) el.querySelector('.join .sp').appendChild(UI.spriteEl(info.joined, 1.6));
    el.querySelector('.ok').onclick = function () { if (info.riftEnding) Meta.ending('rift'); else if (info.ending) Meta.ending(); else Meta.map(info.stage < D.stages.length ? info.stage + 1 : info.stage); };
    UI.show('clear');
  };

  // ================= 26단계: 오늘의 원정 =================
  Meta.dailyIntro = function () {
    var el = screen('title'), plan = St.dailyPlan(), key = plan.key;
    var saved = G.Save.load('daily'), resume = saved && saved.flags.daily && saved.flags.daily.key === key && saved.run;
    if (saved && !resume) G.Save.clear('daily');   // 지난 날의 원정은 버린다
    var rec = G.Profile ? G.Profile.get().daily[key] : null;
    var mods = St.dailyMods(plan.mods);
    el.innerHTML = titleFrame('<span class="ribbon">오늘의 원정 · ' + key.slice(0, 4) + '.' + key.slice(4, 6) + '.' + key.slice(6) + '</span>' +
      '<div class="daily-card frame"><div class="dl-head"><b>스테이지 ' + plan.stage + ' · ' + D.STAGE_NAME[plan.stage - 1] + '</b><small>' + D.THEME_NAME[plan.theme] + '</small></div>' +
      '<div class="dl-party"></div>' +
      '<div class="dl-mods">' + mods.map(function (x) { return '<div class="dl-mod ' + (/^G/.test(x.id) ? 'good' : 'bad') + '"><b>' + U.esc(x.name) + '</b><span>' + U.esc(x.desc) + '</span></div>'; }).join('') + '</div>' +
      '<p class="dim">날짜로 정한 동료 셋·카드·유물·지도로 스테이지 하나를 돈다. 지면 그대로 끝나고, 이긴 전투·정예·돌파·남은 체력·골드로 점수를 매긴다. 오늘은 모두 같은 지도다.</p>' +
      '<p class="dl-best">' + (rec && rec.best ? '오늘 최고 <b>' + rec.best.score + '점</b> (' + (rec.best.cleared ? '돌파' : '실패') + ') · ' + rec.attempts + '번 도전' : '오늘은 아직 도전하지 않았다') + '</p></div>' +
      '<div class="menu row"><button class="btn back">뒤로</button>' + (resume ? '<button class="btn gold big resume">이어하기</button><button class="btn small danger restart">새로 시작</button>' : '<button class="btn gold big go">출발</button>') + '</div>');
    var party = el.querySelector('.dl-party');
    plan.party.forEach(function (id) { var w = UI.el('div', 'slot'); w.appendChild(UI.spriteEl(id, 1)); w.appendChild(UI.el('small', '', charDef(id).name)); party.appendChild(w); });
    var go = function () { St.newDaily(key); mapView = 'dungeon'; Meta.stageIntro(plan.stage, function () { Meta.map(plan.stage); }); };
    el.querySelector('.back').onclick = Meta.title;
    if (resume) {
      el.querySelector('.resume').onclick = function () { G.Save.use('daily'); if (St.load()) { mapView = 'dungeon'; Meta.continueRun(); } else Meta.title(); };
      el.querySelector('.restart').onclick = function () { G.Save.clear('daily'); go(); };
    } else el.querySelector('.go').onclick = go;
    UI.show('title');
  };
  Meta.dailyEnd = function (res) {
    var P = res.parts || {}, rows = [['이긴 전투', P.win], ['정예', P.elite], ['스테이지 돌파', P.clear], ['남은 체력', P.hp], ['남은 골드', P.gold]];
    var m = UI.modal('<h2>' + (res.cleared ? '오늘의 원정 돌파!' : '오늘의 원정 끝') + '</h2>' +
      '<div class="daily-score">' + rows.map(function (r) { return '<div><span>' + r[0] + '</span><b>' + (r[1] || 0) + '</b></div>'; }).join('') +
      '<div><span>스테이지 배율</span><b>×' + (res.mult || 1).toFixed(1) + '</b></div><div class="total"><span>점수</span><b>' + res.score + '</b></div></div>' +
      '<p style="text-align:center">' + (res.record ? '<b class="new-rec">오늘의 최고 기록!</b> ' : '오늘 최고 ' + (res.best ? res.best.score : res.score) + '점 · ') + res.attempts + '번째 도전</p>' +
      '<div class="row" style="justify-content:center"><button class="btn gold ok">타이틀로</button></div>', 'result ' + (res.cleared ? 'win' : 'lose'), true);
    m.querySelector('.ok').onclick = function () { UI.closeModal(m); Meta.title(); };
  };

  // 31단계: kind 'rift' 는 세계의 틈(13 스테이지)을 끝낸 두 번째 엔딩
  Meta.ending = function (kind) {
    var rift = kind === 'rift';
    var ep = St.sceneFor('epilogue', rift ? 21 : 20);   // 31단계: 장 번호 20 = 에필로그, 21 = 세계의 틈 에필로그
    if (ep) return Meta.scene(ep, function () { Meta.ending(kind); });
    var el = screen('ending');
    var story = rift ?
      '<p>고대 혈마가 흩어지고, 세계의 틈이 조용히 아물었다. 두 세계 사이에는 이제 바람이 지나는 작은 길 하나만 남았다.</p>' +
      '<p class="dim">승천 원정에서는 10 스테이지를 다시 깨면 틈이 다시 열린다.</p>' :
      '<p>청운봉에 다시 푸른 구름이 걸렸다. 두 세계를 잇는 검, 천외검결의 이야기는 이렇게 끝났다.</p>' +
      '<p class="dim">로비의 \'스토리\'에서 지나온 장면을 다시 볼 수 있다. 지도 가운데 <b>세계의 틈</b>이 열렸다.</p>';
    el.innerHTML = '<div class="title-bg"></div><div class="title-shade"></div>' +
      '<div class="title-wrap"><div class="logo-sub">' + (rift ? 'TRUE END' : 'THE END') + '</div><h1 class="logo">' + (rift ? '틈을 닫다' : '원정 완료') + '</h1><div class="logo-line"></div><div class="lineup"></div>' +
      '<div class="story frame gold">' + story + (St.ascLevel() ? '<p class="asc-done">승천 ' + St.ascLevel() + ' 원정 완료!</p>' : '') +
      '<p class="dim">플레이해 주셔서 감사합니다. 카드·유물·성장을 그대로 가지고 더 어려운 <b>승천</b> 원정을 떠날 수 있다.</p></div>' +
      '<div class="menu">' + (rift ? '' : '<button class="btn gold big rift">세계의 틈으로</button>') + '<button class="btn gold big asc">새 원정 (승천)</button><button class="btn big ok">로비로</button></div></div>';
    G.Art.scene(rift ? 'rift' : 'castle').then(function (u) { if (u) el.querySelector('.title-bg').style.backgroundImage = 'url(' + u + ')'; });
    var line = el.querySelector('.lineup');
    D.characters.forEach(function (c) { if (St.data.characters.indexOf(c.id) < 0) return; var w = UI.el('div', 'slot'); w.appendChild(UI.spriteEl(c.id, 1.1)); line.appendChild(w); });
    el.querySelector('.ok').onclick = function () { Meta.lobby(); };
    el.querySelector('.asc').onclick = function () { Meta.ascend(); };
    if (el.querySelector('.rift')) el.querySelector('.rift').onclick = function () { Meta.map((D.MAIN_STAGES || 10) + 1); };
    UI.show('ending');
  };
})();
