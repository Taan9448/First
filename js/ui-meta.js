// ui-meta.js — 타이틀, 월드맵, 파티 편성, 보상(카드·유물), 야영지, 상점, 스테이지 클리어, 엔딩
(function () {
  'use strict';
  var G = Game, UI = G.UI, D = G.Data, St = G.Stage, U = G.util;

  var Meta = G.Meta = {};
  var NODE_ICON = { battle: 'attack', elite: 'elite', event: 'event', rest: 'campfire', shop: 'shop', boss: 'crown', midboss: 'crown', final: 'crown' };
  function lastType(def) { return def.cols[def.cols.length - 1][0]; }
  var THEMES = ['forest', 'desert', 'snow', 'volcano', 'castle'];

  function charDef(id) { return D.characters.filter(function (c) { return c.id === id; })[0]; }
  function screen(id) { return document.getElementById('screen-' + id); }
  function goldHTML() {
    return '<span class="gold"><i class="ico" style="' + UI.iconStyle('gold') + '"></i>' + St.data.gold + '</span>';
  }
  function topbar(title, extra) {
    return '<div class="topbar"><span class="title">' + title + '</span><span class="spacer"></span>' + (extra || '') + goldHTML() + '</div>';
  }
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
    var r = St.data.run, max = charDef(id).hp, hp = r && r.hp[id] != null ? r.hp[id] : max;
    return '<div class="hpbar"><i style="width:' + (hp / max * 100) + '%"></i><span>' + hp + '/' + max + '</span></div>';
  }
  function miniHero(id) {
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
    var has = G.Save.exists();
    var stars = '';
    for (var i = 0; i < 40; i++) {
      stars += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 45).toFixed(1) + '%;animation-delay:-' + (Math.random() * 2.4).toFixed(2) + 's"></i>';
    }
    el.innerHTML = '<div class="title-bg"></div><div class="title-shade"></div><div class="stars">' + stars + '</div>' +
      '<div class="title-wrap">' +
      '<div class="logo-sub">THE EXPEDITION OF FIVE HEROES</div>' +
      '<h1 class="logo">다섯 영웅의 원정</h1><div class="logo-line"></div>' +
      '<div class="lineup"></div>' +
      '<div class="menu">' +
      '<button class="btn gold big cont" ' + (has ? '' : 'disabled') + '>이어하기</button>' +
      '<button class="btn big new">새 게임</button>' +
      (G.debug ? '<button class="btn small test">전투 테스트 (디버그)</button>' : '') +
      '</div>' + (G.debug ? '<div class="debugtag">디버그 모드 · 별도 저장</div>' : '') + '</div>' +
      '<div class="title-foot">진행은 브라우저에 자동 저장된다 · 오른쪽 위 메뉴: 도감 · 덱 · 설정</div>';
    G.Art.scene('castle').then(function (u) { if (u) el.querySelector('.title-bg').style.backgroundImage = 'url(' + u + ')'; });
    var line = el.querySelector('.lineup');
    D.characters.forEach(function (c) { var w = UI.el('div', 'slot'); w.appendChild(UI.spriteEl(c.id, 1.1)); line.appendChild(w); });
    el.querySelector('.cont').onclick = function () { if (St.load()) Meta.map(); else Meta.title(); };
    el.querySelector('.new').onclick = function () {
      var start = function () { St.newGame(); Meta.map(); };
      if (has) confirmBox('저장된 진행을 지우고 새로 시작할까요?', '새 게임', start); else start();
    };
    if (G.debug) el.querySelector('.test').onclick = function () { G.TestMenu.open(); };
    UI.show('title');
  };

  // ================= 월드맵 =================
  var mapSel = null;
  var resizeBound = false;

  Meta.map = function (sel) {
    var d = St.data, r = d.run, el = screen('map');
    mapSel = sel || (r ? r.stage : mapSel) || Math.min(D.stages.length, d.clearedStage + 1);
    el.innerHTML = topbar('원정 지도', '<button class="btn small to-title">타이틀</button>') +
      '<div class="map-layout"><div class="map-frame frame"><div class="map-canvas"></div></div><aside class="map-side frame"></aside></div>' +
      '<div class="map-bottom"><div class="party-row"></div><div class="relic-bar"></div></div>';
    var canvas = el.querySelector('.map-canvas');
    G.ArtMap.world().then(function (u) { if (u) canvas.style.backgroundImage = 'url(' + u + ')'; });

    // 길: 클리어한 구간은 금빛
    var route = '';
    for (var i = 0; i < D.mapPos.length - 1; i++) {
      var a = D.mapPos[i], b = D.mapPos[i + 1], done = i + 1 <= d.clearedStage;
      route += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="#1a1208" stroke-width="12"/>' +
        '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + (done ? '#ffd23f' : '#c9b48a') + '" stroke-width="' + (done ? 6 : 4) + '" stroke-dasharray="' + (done ? '14 6' : '8 10') + '"/>';
    }
    // 잠긴 지역은 경계 그대로 안개로 덮는다
    var fog = '';
    D.regions.forEach(function (rg, ri) { if (!St.canEnter(ri * 2 + 1)) fog += G.ArtMap.fogLayer(rg.theme, 11 + ri); });
    canvas.innerHTML = '<svg class="map-route" viewBox="0 0 1000 560" preserveAspectRatio="none" shape-rendering="crispEdges">' + fog + route + '</svg>';

    // 지역 이름표
    D.regions.forEach(function (rg, ri) {
      var open = St.canEnter(ri * 2 + 1);
      var t = UI.el('div', 'region-tag' + (open ? '' : ' locked'),
        '<i style="background:' + D.THEME_COLOR[rg.theme] + '"></i>' + D.THEME_NAME[rg.theme] + (open ? '' : '<span class="lk"> · 잠김</span>'));
      t.style.left = rg.label[0] / 10 + '%'; t.style.top = rg.label[1] / 5.6 + '%';
      canvas.appendChild(t);
    });

    // 스테이지 표지
    D.stages.forEach(function (def) {
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

    renderSide(el.querySelector('.map-side'), mapSel);
    el.querySelector('.party-row').innerHTML = d.party.map(miniHero).join('');
    fillSprites(el.querySelector('.party-row'), 0.6);
    el.querySelector('.map-bottom .relic-bar').innerHTML = UI.relicBar(d.relics);
    el.querySelector('.to-title').onclick = function () { Meta.title(); };
    UI.show('map');
    fitMap();
    if (!resizeBound) { resizeBound = true; window.addEventListener('resize', fitMap); }
  };

  // 지도는 1000:560 비율을 지키며 틀 안에 꽉 차게
  function fitMap() {
    var el = screen('map');
    if (!el.classList.contains('on')) return;
    var frame = el.querySelector('.map-frame'), canvas = el.querySelector('.map-canvas');
    if (!frame || !canvas) return;
    var w = frame.clientWidth - 30, h = frame.clientHeight - 30;
    var cw = Math.min(w, h * 1000 / 560);
    canvas.style.width = Math.floor(cw) + 'px';
    canvas.style.height = Math.floor(cw * 560 / 1000) + 'px';
    canvas.classList.toggle('compact', cw < 760);
  }

  // 노드 트랙: 열마다 노드 1~2개를 세로로 쌓는다. r 이 있으면 지나온 길·고를 길을 표시한다
  function routeHTML(cols, r) {
    return '<div class="route">' + cols.map(function (col, ci) {
      var chosen = r ? r.path[ci] : null;
      return '<div class="rcol">' + col.map(function (nd, ni) {
        var type = typeof nd === 'string' ? nd : nd.type, cls = 'rnode';
        if (r && ci < r.col) cls += ni === chosen ? ' done' : ' skip';
        else if (r && ci === r.col) cls += chosen == null ? ' pick' : ni === chosen ? ' now' : ' skip';
        var icon = r && ci < r.col && ni === chosen ? 'check' : NODE_ICON[type];
        return '<div class="' + cls + '" data-tip="' + D.NODE_NAME[type] + '"><i class="ico" style="' + UI.iconStyle(icon) + '"></i></div>';
      }).join('') + '</div>';
    }).join('<div class="rlink"></div>') + '</div>';
  }

  function renderSide(side, n) {
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
      '<div class="name">' + (seen ? D.monsterById[bossId].name : '???') + '</div></div>' +
      '<div class="info-line"><span>상태</span><span>' + state + '</span></div>' +
      '<div class="info-line"><span>보상</span><span>' + join + '</span></div>' +
      '<div><span class="dim">경로</span>' + routeHTML(cur ? r.map : def.cols, cur ? r : null) + '</div>';
    if (cur) {
      var node = St.node();
      if (!node && !r.pending) {
        // 갈림길: 갈 길을 고른다
        html += '<div class="fork"><span class="dim">갈림길 — 한 길만 갈 수 있다</span><div class="fork-btns">' + St.choices().map(function (nd, i) {
          return '<button class="btn fork-btn" data-i="' + i + '"><i class="ico" style="' + UI.iconStyle(NODE_ICON[nd.type]) + '"></i>' + D.NODE_NAME[nd.type] + '</button>';
        }).join('') + '</div></div>';
      } else {
        var label = r.pending ? '보상 받기' : r.upgrades ? '카드 강화하기' : node.type === 'rest' ? '휴식처로' : node.type === 'shop' ? '상점으로' :
          node.type === 'event' ? (node.result && node.result.fight ? '전투 시작' : '이벤트 보기') : D.NODE_NAME[node.type] + ' 시작';
        html += '<button class="btn gold go">' + label + '</button>';
      }
      html += (r.col === 0 && !r.pending ? '<button class="btn party">파티 편성</button>' : '') +
        '<button class="btn small danger quit">스테이지 포기</button>';
    } else if (r) {
      html += '<p class="dim">스테이지 ' + r.stage + '을(를) 진행 중이다.</p><button class="btn goto">진행 중인 스테이지 보기</button>';
    } else {
      html += '<button class="btn gold go" ' + (open ? '' : 'disabled') + '>' + (cleared ? '다시 도전' : '출발') + '</button>';
    }
    side.innerHTML = html;
    var sp = UI.spriteEl(D.monsterById[bossId].sprite, Math.min(1, 1.6 / D.monsterById[bossId].size));
    sp.style.animation = seen ? '' : 'none';
    if (!seen) sp.style.filter = 'brightness(0)';
    side.querySelector('.boss-sp').appendChild(sp);
    var go = side.querySelector('.go');
    if (go) go.onclick = function () { startOrContinue(n); };
    UI.$$('.fork-btn', side).forEach(function (b) {
      b.onclick = function () { if (St.choose(+b.getAttribute('data-i'))) Meta.continueRun(); };
    });
    if (side.querySelector('.party')) side.querySelector('.party').onclick = function () { Meta.party(Meta.map, '확인', Meta.map); };
    if (side.querySelector('.quit')) side.querySelector('.quit').onclick = function () {
      confirmBox('스테이지를 포기할까요? (얻은 카드·골드·유물은 남는다)', '포기', function () { St.abandon(); Meta.map(); });
    };
    if (side.querySelector('.goto')) side.querySelector('.goto').onclick = function () { Meta.map(r.stage); };
  }

  function startOrContinue(n) {
    var r = St.data.run;
    if (r) { if (r.stage === n) Meta.continueRun(); return; }
    if (!St.canEnter(n)) return;
    Meta.party(function () { St.startStage(n); Meta.map(n); }, '스테이지 ' + n + ' 출발', function () { Meta.map(n); });
  }

  // 진행 중인 스테이지의 현재 노드로
  var starting = false; // 전투 시작 버튼을 빠르게 두 번 눌러도 전투는 하나만
  Meta.continueRun = function () {
    if (starting) return;
    var r = St.data.run;
    if (!r) return Meta.map();
    if (r.pending) return Meta.reward();
    var node = St.node();
    if (!node) return Meta.map();
    if (node.type === 'rest') return r.upgrades ? Meta.upgrade() : Meta.rest();
    if (node.type === 'shop') return Meta.shop();
    if (node.type === 'event' && !(node.result && node.result.fight && !node.result.cards && !r.upgrades)) return Meta.event();
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
      var res = St.battleWon(battle);
      if (res.ending) return Meta.clear(res.clear);
      return Meta.reward();
    }
    St.battleLost(battle);
    var m = UI.modal('<h2>패배…</h2><p>스테이지를 처음부터 다시 시작한다.<br>얻은 카드·골드·유물은 그대로 남는다.</p>' +
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
        return '<div class="hero-pick ' + (on ? 'on' : '') + '" data-hero="' + id + '"><div class="portrait" style="--hc:' + UI.shade(c.color, -0.55) + '"><div class="sp" data-id="' + id + '"></div></div>' +
          '<b>' + c.name + '</b><small>' + c.role + ' · ' + c.job + '<br>치명타 ' + Math.round(c.crit * 100) + '% · 덱 ' + (d.decks[id] || []).length + '장</small>' + hpBar(id) + '</div>';
      }).join('');
      var locked = D.characters.filter(function (c) { return d.characters.indexOf(c.id) < 0; }).map(function (c) {
        return '<div class="hero-pick locked"><div class="portrait"><div class="sp lock-sp" data-lock="' + c.id + '"></div></div><b>???</b><small>' + c.joinAfter + ' 스테이지 클리어 시 합류</small></div>';
      }).join('');
      var deckSize = St.battleDeck(pick).length;
      el.innerHTML = topbar('파티 편성') +
        '<div class="meta-body"><span class="ribbon">출전할 동료를 최대 3명 고른다</span><div class="row heroes" style="justify-content:center;gap:14px">' + heroes + locked + '</div>' +
        '<div class="frame" style="padding:10px 16px">전투 덱: 캐릭터 덱 + 공용 덱 ' + ((d.decks.common || []).length) + '장 = <b>' + deckSize + '장</b>' +
        ' <span class="dim">(덱마다 ' + e.deckMin + '~' + e.deckMax + '장, 오른쪽 위 \'덱\'에서 편집)</span></div>' +
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
    if (p.relicChoice && p.relicChoice.length) {
      relicPart += '<span class="ribbon red">유물 1개를 고른다</span><div class="relic-tiles choose">' +
        p.relicChoice.map(function (id) { return UI.relicTile(id); }).join('') + '</div>' +
        '<button class="btn small skip-relic">유물 받지 않기</button>';
    }
    el.innerHTML = topbar('보상') + '<div class="meta-body">' +
      '<h1 class="big-title">' + title + '</h1>' +
      '<p class="gain"><i class="ico" style="' + UI.iconStyle('gold') + '"></i> 골드 +' + p.gold +
      (p.fill ? ' <span class="dim">(카드 후보가 모자라 +' + p.fill * D.economy.fillGold + ')</span>' : '') + '</p>' +
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
    p.cards.forEach(function (id) {
      var c = UI.cardEl(D.cardById[id], { static: true });
      c.onclick = function () {
        chosen = id;
        UI.$$('.card', box).forEach(function (x) { x.classList.toggle('selected', x === c); });
        el.querySelector('.take').disabled = false;
        var owner = D.cardById[id].owner, deck = St.data.decks[owner] || [];
        el.querySelector('.deck-note').textContent = deck.length < D.economy.deckMax ?
          (owner === 'common' ? '공용' : charDef(owner).name) + ' 덱에 바로 들어간다 (' + (deck.length + 1) + '/' + D.economy.deckMax + ')' :
          '덱이 가득 차서 보유만 한다. 오른쪽 위 \'덱\'에서 바꿔 넣을 수 있다.';
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
    var d = St.data, el = screen('camp'), e = D.economy, mods = St.mods();
    el.innerHTML = topbar('휴식') + '<div class="meta-body">' +
      '<h1 class="big-title">모닥불</h1><p class="dim">하나만 고를 수 있다.</p>' +
      '<div class="row choices">' +
      '<button class="choice rest" ' + (mods.noRestHeal ? 'disabled' : '') + '><i class="ico" style="' + UI.iconStyle('campfire') + '"></i><span>회복</span><small>' +
      (mods.noRestHeal ? '마왕의 왕관: 휴식으로 회복할 수 없다' : '동료 전원 체력 ' + e.restPct * 100 + '% 회복') + '</small></button>' +
      '<button class="choice up" ' + (St.upgradable().length ? '' : 'disabled') + '><i class="ico" style="' + UI.iconStyle('anvil') + '"></i><span>강화</span><small>' +
      (St.upgradable().length ? '보유 카드 1장 강화' : '강화할 카드가 없다') + '</small></button>' +
      '</div><div class="frame panel-box"><div class="party-row">' + d.characters.map(miniHero).join('') + '</div></div>' +
      '<div class="row"><button class="btn party">파티 편성</button><button class="btn back">맵으로</button></div></div>';
    backdrop(el, runTheme());
    fillSprites(el, 0.75);
    el.querySelector('.rest').onclick = function () {
      var info = St.rest();
      var m = UI.modal('<h2>모닥불 곁에서 쉬었다</h2><p>동료 전원의 체력이 회복되었다.</p><div class="row" style="justify-content:center"><button class="btn gold ok">계속</button></div>');
      m.querySelector('.ok').onclick = function () { UI.closeModal(m); nodeDone(info); };
    };
    el.querySelector('.up').onclick = function () { St.restUpgrade(); Meta.upgrade(); };
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
    var inDeck = function (id) { var o = D.cardById[id].owner; return (d.decks[o] || []).indexOf(id) >= 0; };
    list.sort(function (a, b) { return (inDeck(b) - inDeck(a)) || (a < b ? -1 : 1); });
    el.innerHTML = topbar('카드 강화') + '<div class="meta-body">' +
      '<h1 class="big-title">카드 강화</h1><p class="dim">카드 1장을 골라 강화한다. 강화는 그 카드에 영구히 남는다. (남은 강화 ' + r.upgrades + ')</p>' +
      '<div class="row up-filters">' + owners.map(function (o) {
        return '<button class="btn small ' + (upFilter === o ? 'on' : '') + '" data-o="' + o + '">' + (o === 'all' ? '전체' : o === 'common' ? '공용' : charDef(o).name) + '</button>';
      }).join('') + '</div>' +
      '<div class="up-wrap"><div class="up-grid"></div><div class="up-preview frame"><p class="dim">카드를 고르면<br>강화 전·후를 보여 준다.</p></div></div>' +
      '<div class="row"><button class="btn skip">강화하지 않기</button><button class="btn gold ok" disabled>강화</button></div></div>';
    backdrop(el, runTheme());
    var grid = el.querySelector('.up-grid'), prev = el.querySelector('.up-preview'), chosen = null;
    list.forEach(function (id) {
      var c = UI.cardEl(D.cardById[id], { static: true });
      c.classList.add('mini');
      if (inDeck(id)) c.appendChild(UI.el('div', 'ctemp', '<span>덱</span>'));
      c.onclick = function () {
        chosen = id;
        UI.$$('.card', grid).forEach(function (x) { x.classList.toggle('selected', x === c); });
        prev.innerHTML = '<div class="up-pair"></div>';
        var pair = prev.querySelector('.up-pair');
        pair.appendChild(UI.cardEl(D.cardById[id], { static: true }));
        pair.appendChild(UI.el('div', 'up-arrow', '&#9654;'));
        pair.appendChild(UI.cardEl(D.cardById[id + '+'], { static: true }));
        el.querySelector('.ok').disabled = false;
      };
      c.ondblclick = function () { chosen = id; done(); };
      grid.appendChild(c);
    });
    if (!list.length) grid.innerHTML = '<p class="dim">강화할 카드가 없다.</p>';
    function done() {
      if (!chosen || !St.upgradeCard(chosen)) return;
      var name = D.cardById[chosen + '+'].name;
      var m = UI.modal('<h2>' + U.josa(name, '이/가') + ' 되었다!</h2><div class="row" style="justify-content:center"></div><div class="row" style="justify-content:center"><button class="btn gold ok">계속</button></div>');
      m.querySelector('.row').appendChild(UI.cardEl(D.cardById[chosen + '+'], { static: true }));
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
    var waiting = res && (res.cards || r.upgrades);
    el.innerHTML = topbar('이벤트') + '<div class="meta-body">' +
      '<span class="ribbon">이벤트</span><h1 class="big-title">' + U.esc(ev.name) + '</h1>' + body +
      (res && res.cards ? '<span class="ribbon">카드 1장을 고른다</span><div class="row reward-cards"></div><button class="btn small skip-card">받지 않기</button>' : '') +
      (res && res.relic ? '<div class="relic-tiles">' + UI.relicTile(res.relic, 'static') + '</div>' : '') +
      (res && res.gotCard ? '<div class="row got-card"></div>' : '') +
      (res ? '<div class="row">' + (r.upgrades ? '<button class="btn gold up">카드 강화하기</button>' : '') +
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
    if (el.querySelector('.next')) el.querySelector('.next').onclick = function () {
      if (res.fight) Meta.continueRun(); else nodeDone(St.eventFinish());
    };
    if (el.querySelector('.back')) el.querySelector('.back').onclick = function () { Meta.map(); };
    UI.show('camp');
  };
  function SND(k) { if (G.Audio) G.Audio.play(k); }

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
      (relicHTML ? '<span class="ribbon cyan">유물</span><div class="relic-tiles">' + relicHTML + '</div>' : '') +
      '<div class="row">' +
      '<button class="btn heal" ' + (s.healed || d.gold < e.healCost ? 'disabled' : '') + '>치료: 전원 ' + e.healPct * 100 + '% 회복 (' + e.healCost + ' 골드)' + (s.healed ? ' · 완료' : '') + '</button>' +
      '<button class="btn refresh" ' + (d.gold < e.refreshCost ? 'disabled' : '') + '>진열 새로고침 (' + e.refreshCost + ' 골드)</button>' +
      '<button class="btn party">파티 편성</button>' +
      '<button class="btn gold leave">상점 나가기</button></div></div>';
    backdrop(el, runTheme());
    var box = el.querySelector('.shop-cards');
    s.cards.forEach(function (id) {
      var sold = s.sold.indexOf(id) >= 0, price = St.price(id);
      var wrap = UI.el('div', 'shop-item');
      var c = UI.cardEl(D.cardById[id], { static: true });
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
    el.querySelector('.heal').onclick = function () { if (St.shopHeal()) Meta.shop(); };
    el.querySelector('.refresh').onclick = function () { if (St.shopRefresh()) Meta.shop(); };
    el.querySelector('.party').onclick = function () { Meta.party(Meta.shop, '확인', Meta.shop); };
    el.querySelector('.leave').onclick = function () { nodeDone(St.leaveShop()); };
    UI.show('camp');
  };

  // ================= 스테이지 클리어 · 엔딩 =================
  Meta.clear = function (info) {
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
      '<div class="row"><button class="btn gold ok">' + (info.ending ? '엔딩 보기' : '맵으로') + '</button></div></div>';
    backdrop(el, St.stageDef(info.stage).theme);
    if (info.joined) el.querySelector('.join .sp').appendChild(UI.spriteEl(info.joined, 1.6));
    el.querySelector('.ok').onclick = function () { if (info.ending) Meta.ending(); else Meta.map(info.stage < D.stages.length ? info.stage + 1 : info.stage); };
    UI.show('clear');
  };

  Meta.ending = function () {
    var el = screen('ending');
    el.innerHTML = '<div class="title-bg"></div><div class="title-shade"></div>' +
      '<div class="title-wrap"><div class="logo-sub">THE END</div><h1 class="logo">원정 완료</h1><div class="logo-line"></div><div class="lineup"></div>' +
      '<div class="story frame gold"><p>마왕 아스타로트가 쓰러지자 마왕성을 덮고 있던 어둠이 걷혔다.</p>' +
      '<p>카이는 되찾은 고향의 언덕에 섰고, 브리아는 다시 숲으로, 리라는 새로운 유적으로, 세라는 수도원으로, 녹스는 어딘가로 길을 떠났다.</p>' +
      '<p>다섯 영웅의 원정은 이렇게 끝났다.</p><p class="dim">플레이해 주셔서 감사합니다. 클리어한 스테이지는 맵에서 다시 도전할 수 있다.</p></div>' +
      '<div class="menu"><button class="btn gold big ok">맵으로</button></div></div>';
    G.Art.scene('forest').then(function (u) { if (u) el.querySelector('.title-bg').style.backgroundImage = 'url(' + u + ')'; });
    var line = el.querySelector('.lineup');
    D.characters.forEach(function (c) { var w = UI.el('div', 'slot'); w.appendChild(UI.spriteEl(c.id, 1.1)); line.appendChild(w); });
    el.querySelector('.ok').onclick = function () { Meta.map(); };
    UI.show('ending');
  };
})();
