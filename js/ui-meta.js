// ui-meta.js — 타이틀, 스테이지 맵(노드 트랙), 파티 편성, 보상, 휴식/상점, 스테이지 클리어, 엔딩
(function () {
  'use strict';
  var G = Game, UI = G.UI, D = G.Data, St = G.Stage, U = G.util;

  var Meta = G.Meta = {};
  var NODE_ICON = { battle: 'attack', elite: 'elite', boss: 'crown', midboss: 'crown', final: 'crown', rest: 'campfire' };

  function charDef(id) { return D.characters.filter(function (c) { return c.id === id; })[0]; }
  function screen(id) { return document.getElementById('screen-' + id); }
  function topbar(title, extra) {
    return '<div class="topbar"><span class="title">' + title + '</span><span class="spacer"></span>' + (extra || '') +
      '<span class="gold"><i class="ico" style="' + UI.iconStyle('gold') + '"></i><b>' + St.data.gold + '</b></span></div>';
  }
  function hpBar(id) {
    var r = St.data.run, max = charDef(id).hp, hp = r && r.hp[id] != null ? r.hp[id] : max;
    return '<div class="hpbar pix"><i style="width:' + (hp / max * 100) + '%"></i><span>' + hp + '/' + max + '</span></div>';
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
    el.innerHTML =
      '<div class="title-wrap"><h1 class="logo">다섯 영웅의 원정</h1>' +
      '<div class="lineup"></div>' +
      '<div class="menu">' +
      '<button class="btn gold big cont" ' + (has ? '' : 'disabled') + '>이어하기</button>' +
      '<button class="btn big new">새 게임</button>' +
      (G.debug ? '<button class="btn small test">전투 테스트 (디버그)</button>' : '') +
      '</div>' + (G.debug ? '<div class="debugtag">디버그 모드 · 별도 저장</div>' : '') + '</div>';
    var line = el.querySelector('.lineup');
    D.characters.forEach(function (c) { var w = UI.el('div', 'slot'); w.appendChild(UI.spriteEl(c.id, 1)); line.appendChild(w); });
    el.querySelector('.cont').onclick = function () { if (St.load()) Meta.map(); else Meta.title(); };
    el.querySelector('.new').onclick = function () {
      var start = function () { St.newGame(); Meta.map(); };
      if (has) confirmBox('저장된 진행을 지우고 새로 시작할까요?', '새 게임', start); else start();
    };
    if (G.debug) el.querySelector('.test').onclick = function () { G.TestMenu.open(); };
    UI.show('title');
  };

  // ================= 스테이지 맵 =================
  Meta.map = function () {
    var d = St.data, r = d.run, el = screen('map');
    var debugBtns = G.debug ? '<button class="btn small dbg-gold">골드 +500</button><button class="btn small dbg-heal">전원 회복</button>' : '';
    var cols = ['forest', 'desert', 'snow', 'volcano', 'castle'].map(function (theme, ti) {
      var nodes = [ti * 2 + 1, ti * 2 + 2].map(function (n) {
        var cleared = n <= d.clearedStage, open = St.canEnter(n), cur = r && r.stage === n;
        var def = St.stageDef(n);
        var cls = cur ? 'current' : cleared ? 'cleared' : open ? 'open' : 'locked';
        var last = def.nodes[def.nodes.length - 1];
        var tag = last === 'final' ? '최종 보스' : last === 'boss' ? '보스' : '정예';
        var bossName = D.monsterById[def.boss].name;
        var icon = cleared ? 'check' : open || cur ? NODE_ICON[last] : 'lock';
        return '<button class="stage-node pix ' + cls + '" data-stage="' + n + '" data-tip="<b>스테이지 ' + n + '</b><br>' +
          tag + ': ' + (cleared || cur ? bossName : '???') + (def.join ? '<br>클리어하면 ' + charDef(def.join).name + ' 합류' : '') + '">' +
          '<span class="num">' + n + '</span><i class="ico" style="' + UI.iconStyle(icon) + '"></i></button>';
      }).join('<div class="link"></div>');
      return '<div class="theme-col" data-theme="' + theme + '"><div class="theme-name">' + D.THEME_NAME[theme] + '</div>' + nodes + '</div>';
    }).join('');

    el.innerHTML = topbar('스테이지 맵', debugBtns + '<button class="btn small to-title">타이틀</button>') +
      '<div class="map-body"><div class="map-cols">' + cols + '</div><div class="run-panel pix"></div></div>';
    // 테마 배경
    UI.$$('.theme-col', el).forEach(function (c) {
      G.Art.scene(c.getAttribute('data-theme')).then(function (u) { if (u) c.style.backgroundImage = 'url(' + u + ')'; });
    });
    UI.$$('.stage-node', el).forEach(function (b) {
      var n = +b.getAttribute('data-stage');
      b.onclick = function () {
        if (r) {
          if (r.stage === n) Meta.continueRun();
          return;
        }
        if (!St.canEnter(n)) return;
        Meta.party(function () { St.startStage(n); Meta.map(); }, '스테이지 ' + n + ' 출발', function () { Meta.map(); });
      };
    });
    el.querySelector('.to-title').onclick = function () { Meta.title(); };
    if (G.debug) {
      el.querySelector('.dbg-gold').onclick = function () { St.debugGold(500); Meta.map(); };
      el.querySelector('.dbg-heal').onclick = function () { St.debugHealAll(); Meta.map(); };
    }
    renderRunPanel(el.querySelector('.run-panel'));
    UI.show('map');
  };

  function renderRunPanel(p) {
    var d = St.data, r = d.run;
    var party = d.party.map(function (id) {
      return '<div class="mini-hero"><div class="sp" data-id="' + id + '"></div><b>' + charDef(id).name + '</b>' + hpBar(id) + '</div>';
    }).join('');
    if (!r) {
      var next = Math.min(D.stages.length, d.clearedStage + 1);
      p.innerHTML = '<div class="run-info"><h2>' + (d.flags.ended ? '원정 완료! 클리어한 스테이지는 다시 도전할 수 있다.' : '다음 목표: 스테이지 ' + next) + '</h2>' +
        '<p class="dim">스테이지를 눌러 출발한다. 합류한 동료 ' + d.characters.length + '명 · 보유 카드 ' + d.cards.length + '장</p></div>' +
        '<div class="party-row">' + party + '</div>';
    } else {
      var def = St.stageDef(r.stage);
      var track = r.nodes.map(function (n, i) {
        var cls = i < r.node ? 'done' : i === r.node ? 'now' : '';
        return '<div class="tnode pix ' + cls + '" data-tip="' + D.NODE_NAME[n.type] + '"><i class="ico" style="' + UI.iconStyle(i < r.node ? 'check' : NODE_ICON[n.type]) + '"></i></div>';
      }).join('<div class="tlink"></div>');
      var node = St.node();
      var label = r.pending ? '보상 받기' : node.type === 'rest' ? '휴식/상점으로' : D.NODE_NAME[node.type] + ' 시작';
      p.innerHTML = '<div class="run-info"><h2>스테이지 ' + r.stage + ' · ' + D.THEME_NAME[def.theme] + (r.replay ? ' (재도전)' : '') + '</h2>' +
        '<div class="track">' + track + '</div>' +
        '<div class="row"><button class="btn gold go">' + label + '</button>' +
        (r.node === 0 && !r.pending ? '<button class="btn party">파티 편성</button>' : '') +
        '<button class="btn small quit">스테이지 포기</button></div></div>' +
        '<div class="party-row">' + party + '</div>';
      p.querySelector('.go').onclick = Meta.continueRun;
      if (p.querySelector('.party')) p.querySelector('.party').onclick = function () { Meta.party(Meta.map, '확인', Meta.map); };
      p.querySelector('.quit').onclick = function () {
        confirmBox('스테이지를 포기할까요? (얻은 카드·골드는 남는다)', '포기', function () { St.abandon(); Meta.map(); });
      };
    }
    UI.$$('.mini-hero .sp', p).forEach(function (s) { s.appendChild(UI.spriteEl(s.getAttribute('data-id'), 0.75)); });
  }

  // 진행 중인 스테이지의 현재 노드로
  Meta.continueRun = function () {
    var r = St.data.run;
    if (!r) return Meta.map();
    if (r.pending) return Meta.reward();
    var node = St.node();
    if (node.type === 'rest') return r.shop ? Meta.shop() : Meta.camp();
    var opts = St.battleOptions();
    var defs = opts.deck.map(function (id) { return D.cardById[id]; });
    G.ArtCards.preload(defs).then(function () {
      G.BattleUI.start(opts, {
        exitLabel: '맵으로', confirmExit: true,
        onExit: function () { Meta.map(); },
        onEnd: onBattleEnd
      });
    });
  };

  function onBattleEnd(result, battle) {
    if (result === 'win') {
      var res = St.battleWon(battle);
      if (res.ending) return Meta.clear(res.clear);
      return Meta.reward();
    }
    St.battleLost(battle);
    var m = UI.modal('<h2>패배…</h2><p>스테이지를 처음부터 다시 시작한다.<br>얻은 카드와 골드는 그대로 남는다.</p>' +
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
        var deckN = (d.decks[id] || []).length;
        return '<div class="hero-pick pix ' + (on ? 'on' : '') + '" data-hero="' + id + '"><div class="sp"></div><b>' + c.name + '</b>' +
          '<small>' + c.role + ' · ' + c.job + ' · 치명타 ' + Math.round(c.crit * 100) + '%</small>' + hpBar(id) +
          '<small>캐릭터 덱 ' + deckN + '장</small></div>';
      }).join('');
      var locked = D.characters.filter(function (c) { return d.characters.indexOf(c.id) < 0; }).map(function (c) {
        return '<div class="hero-pick pix locked"><div class="sp"></div><b>???</b><small>' + c.joinAfter + ' 스테이지 클리어 시 합류</small></div>';
      }).join('');
      var deckSize = St.battleDeck(pick).length;
      el.innerHTML = topbar('파티 편성') +
        '<div class="meta-body"><h2>최대 3명을 고른다</h2><div class="row heroes">' + heroes + locked + '</div>' +
        '<p class="dim">전투 덱: 캐릭터 덱 + 공용 덱 ' + ((d.decks.common || []).length) + '장 = <b>' + deckSize + '장</b>' +
        ' (덱은 종류마다 ' + e.deckMin + '~' + e.deckMax + '장)</p>' +
        '<div class="row"><button class="btn back">뒤로</button><button class="btn gold ok" ' + (pick.length ? '' : 'disabled') + '>' + okLabel + '</button></div></div>';
      UI.$$('.hero-pick:not(.locked)', el).forEach(function (p) {
        var id = p.getAttribute('data-hero');
        p.querySelector('.sp').appendChild(UI.spriteEl(id, 1));
        p.onclick = function () {
          var i = pick.indexOf(id);
          if (i >= 0) pick.splice(i, 1); else if (pick.length < 3) pick.push(id);
          render();
        };
      });
      UI.$$('.hero-pick.locked', el).forEach(function (p, i) {
        var c = D.characters.filter(function (x) { return d.characters.indexOf(x.id) < 0; })[i];
        var s = UI.spriteEl(c.id, 1); s.style.filter = 'brightness(0)'; s.style.animation = 'none';
        p.querySelector('.sp').appendChild(s);
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
    el.innerHTML = topbar('보상') + '<div class="meta-body">' +
      '<h1 class="big-title">' + title + '</h1>' +
      '<p class="gain"><i class="ico" style="' + UI.iconStyle('gold') + '"></i> 골드 +' + p.gold +
      (p.fill ? ' <span class="dim">(카드 후보가 모자라 +' + p.fill * D.economy.fillGold + ' 골드)</span>' : '') + '</p>' +
      '<h2>카드 1장을 고른다</h2><div class="row reward-cards"></div>' +
      '<p class="dim deck-note">&nbsp;</p>' +
      '<div class="row"><button class="btn skip">건너뛰기 (골드 +' + D.economy.skipGold + ')</button><button class="btn gold take" disabled>카드 받기</button></div></div>';
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
          '덱이 가득 차서 보유만 한다. 덱 편집에서 바꿔 넣을 수 있다.';
      };
      c.ondblclick = function () { finish(id); };
      box.appendChild(c);
    });
    if (!p.cards.length) box.innerHTML = '<p class="dim">얻을 수 있는 카드를 모두 모았다!</p>';
    function finish(id) {
      var res = St.takeReward(id);
      if (res) Meta.clear(res); else Meta.map();
    }
    el.querySelector('.take').onclick = function () { if (chosen) finish(chosen); };
    el.querySelector('.skip').onclick = function () { finish(null); };
    UI.show('reward');
  };

  // ================= 휴식/상점 =================
  Meta.camp = function () {
    var d = St.data, el = screen('camp'), e = D.economy;
    var party = d.characters.map(function (id) {
      return '<div class="mini-hero"><div class="sp" data-id="' + id + '"></div><b>' + charDef(id).name + '</b>' + hpBar(id) + '</div>';
    }).join('');
    el.innerHTML = topbar('휴식/상점') + '<div class="meta-body">' +
      '<h1 class="big-title">야영지</h1><p class="dim">하나만 고를 수 있다.</p>' +
      '<div class="row choices">' +
      '<button class="choice pix rest"><i class="ico" style="' + UI.iconStyle('campfire') + '"></i><b>휴식</b><small>동료 전원 체력 ' + e.restPct * 100 + '% 회복</small></button>' +
      '<button class="choice pix shop"><i class="ico" style="' + UI.iconStyle('gold') + '"></i><b>상점</b><small>카드 구매 · 치료 · 진열 새로고침</small></button>' +
      '</div><div class="party-row">' + party + '</div>' +
      '<div class="row"><button class="btn party">파티 편성</button><button class="btn back">맵으로</button></div></div>';
    UI.$$('.mini-hero .sp', el).forEach(function (s) { s.appendChild(UI.spriteEl(s.getAttribute('data-id'), 0.75)); });
    el.querySelector('.rest').onclick = function () {
      St.rest();
      var m = UI.modal('<h2>모닥불 곁에서 쉬었다</h2><p>동료 전원의 체력이 회복되었다.</p><div class="row" style="justify-content:center"><button class="btn gold ok">계속</button></div>');
      m.querySelector('.ok').onclick = function () { UI.closeModal(m); Meta.map(); };
    };
    el.querySelector('.shop').onclick = function () { St.openShop(); Meta.shop(); };
    el.querySelector('.party').onclick = function () { Meta.party(Meta.camp, '확인', Meta.camp); };
    el.querySelector('.back').onclick = Meta.map;
    UI.show('camp');
  };

  Meta.shop = function () {
    var d = St.data, s = St.openShop(), el = screen('camp'), e = D.economy;
    el.innerHTML = topbar('상점') + '<div class="meta-body">' +
      '<h1 class="big-title">떠돌이 상인</h1><div class="row shop-cards"></div>' +
      '<div class="row">' +
      '<button class="btn heal" ' + (s.healed || d.gold < e.healCost ? 'disabled' : '') + '>치료: 전원 ' + e.healPct * 100 + '% 회복 (' + e.healCost + ' 골드)' + (s.healed ? ' · 완료' : '') + '</button>' +
      '<button class="btn refresh" ' + (d.gold < e.refreshCost ? 'disabled' : '') + '>진열 새로고침 (' + e.refreshCost + ' 골드)</button>' +
      '<button class="btn party">파티 편성</button>' +
      '<button class="btn gold leave">상점 나가기</button></div></div>';
    var box = el.querySelector('.shop-cards');
    s.cards.forEach(function (id) {
      var sold = s.sold.indexOf(id) >= 0, price = St.price(id);
      var wrap = UI.el('div', 'shop-item');
      var c = UI.cardEl(D.cardById[id], { static: true });
      if (sold) c.classList.add('unplayable');
      wrap.appendChild(c);
      var tag = UI.el('div', 'price pix ' + (sold ? 'sold' : d.gold < price ? 'poor' : ''),
        sold ? '구매함' : '<i class="ico" style="' + UI.iconStyle('gold') + '"></i>' + price);
      wrap.appendChild(tag);
      if (!sold) c.onclick = tag.onclick = function () {
        if (d.gold < price) return;
        confirmBox(U.josa(D.cardById[id].name, '을/를') + ' ' + price + ' 골드에 살까요?', '구매', function () { St.buy(id); Meta.shop(); });
      };
      box.appendChild(wrap);
    });
    if (!s.cards.length) box.innerHTML = '<p class="dim">팔 수 있는 카드가 없다.</p>';
    el.querySelector('.heal').onclick = function () { if (St.shopHeal()) Meta.shop(); };
    el.querySelector('.refresh').onclick = function () { if (St.shopRefresh()) Meta.shop(); };
    el.querySelector('.party').onclick = function () { Meta.party(Meta.shop, '확인', Meta.shop); };
    el.querySelector('.leave').onclick = function () { St.leaveShop(); Meta.map(); };
    UI.show('camp');
  };

  // ================= 스테이지 클리어 · 엔딩 =================
  Meta.clear = function (info) {
    var el = screen('clear');
    var join = '';
    if (info.joined) {
      var c = charDef(info.joined);
      join = '<div class="join pix"><div class="sp"></div><div><h2>' + U.josa(c.name, '이/가') + ' 동료가 되었다!</h2>' +
        '<p>' + c.role + ' · ' + c.job + ' · 체력 ' + c.hp + '</p><p class="dim">' + c.desc + '</p><p>' + c.name + '의 기본 카드 8장을 얻었다.</p></div></div>';
    }
    el.innerHTML = topbar('스테이지 클리어') + '<div class="meta-body">' +
      '<h1 class="big-title">스테이지 ' + info.stage + ' 클리어!</h1>' +
      (info.first ? '' : '<p class="dim">이미 클리어한 스테이지를 다시 깼다.</p>') + join +
      '<div class="row"><button class="btn gold ok">' + (info.ending ? '엔딩 보기' : '맵으로') + '</button></div></div>';
    if (info.joined) el.querySelector('.join .sp').appendChild(UI.spriteEl(info.joined, 1.5));
    el.querySelector('.ok').onclick = function () { if (info.ending) Meta.ending(); else Meta.map(); };
    UI.show('clear');
  };

  Meta.ending = function () {
    var el = screen('ending');
    el.innerHTML = '<div class="title-wrap"><h1 class="logo">원정 완료</h1><div class="lineup"></div>' +
      '<div class="story pix"><p>마왕 아스타로트가 쓰러지자 마왕성을 덮고 있던 어둠이 걷혔다.</p>' +
      '<p>카이는 되찾은 고향의 언덕에 섰고, 브리아는 다시 숲으로, 리라는 새로운 유적으로, 세라는 수도원으로, 녹스는 어딘가로 길을 떠났다.</p>' +
      '<p>다섯 영웅의 원정은 이렇게 끝났다.</p><p class="dim">플레이해 주셔서 감사합니다. 클리어한 스테이지는 맵에서 다시 도전할 수 있다.</p></div>' +
      '<div class="menu"><button class="btn gold big ok">맵으로</button></div></div>';
    var line = el.querySelector('.lineup');
    D.characters.forEach(function (c) { var w = UI.el('div', 'slot'); w.appendChild(UI.spriteEl(c.id, 1)); line.appendChild(w); });
    el.querySelector('.ok').onclick = Meta.map;
    UI.show('ending');
  };
})();
