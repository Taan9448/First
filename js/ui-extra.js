// ui-extra.js — 오른쪽 위 공통 메뉴(도감·덱 편집·설정)와 첫 전투 튜토리얼
(function () {
  'use strict';
  var G = Game, UI = G.UI, D = G.Data, U = G.util;
  var St = function () { return G.Stage; };

  var X = G.Extra = {};
  var THEMES = ['forest', 'desert', 'snow', 'volcano', 'castle', 'mirror'];
  var RANK = { normal: '일반', elite: '정예', boss: '보스', final: '최종 보스' };
  var OWNERS = ['kai', 'bram', 'lyra', 'sera', 'nox', 'common'];

  function charDef(id) { return D.characters.filter(function (c) { return c.id === id; })[0]; }
  function ownerName(o) { return o === 'common' ? '공용' : charDef(o).name; }
  function inBattle() { return document.getElementById('screen-battle').classList.contains('on') && G.Battle.current && !G.Battle.current.over(); }
  function tabs(list, cur) {
    return '<div class="tabs">' + list.map(function (t) {
      return '<button class="tab pix ' + (t[0] === cur ? 'on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
  }

  // ================= 설정 적용 =================
  X.settings = null;
  X.applySettings = function (s) {
    X.settings = s;
    G.speed = s.speed || 1;
    G.FX.low = s.fx === 'low';
    document.body.classList.toggle('fx-low', G.FX.low);
    G.Audio.setVolume((s.volume == null ? 70 : s.volume) / 100);
    if (G.Music) G.Music.setVolume((s.bgm == null ? 45 : s.bgm) / 100);
    // 24단계: 글자 크기 · 색약 표기 · 단축키 표시
    document.documentElement.style.setProperty('--ts', String(s.textScale || 1));
    document.body.classList.toggle('text-big', (s.textScale || 1) > 1);
    document.body.classList.toggle('cb', !!s.cb);
    document.body.classList.toggle('no-hotkeys', s.hotkeys === false);
    G.Save.writeSettings(s);
  };

  // ================= 공통 메뉴 =================
  X.initMenu = function () {
    var m = UI.el('div', '', '');
    m.id = 'gmenu';
    m.innerHTML = '<button class="btn icon ghost codex" data-tip="도감">' + UI.icon('book') + '</button>' +
      '<button class="btn icon ghost deck">' + UI.icon('deck') + '</button>' +
      '<button class="btn icon ghost settings" data-tip="설정">' + UI.icon('gear') + '</button>';
    document.getElementById('app').appendChild(m);
    m.querySelector('.codex').onclick = function () { X.codex(); };
    m.querySelector('.deck').onclick = function () { X.deck(); };
    m.querySelector('.settings').onclick = function () { X.settingsWin(); };
    X.refreshMenu();
  };
  // 타이틀·테스트 메뉴에서는 숨기고, 전투 중에는 덱 편집을 잠근다
  X.refreshMenu = function () {
    var m = document.getElementById('gmenu');
    if (!m) return;
    var title = ['title', 'test', 'lobby', 'story'].some(function (k) { var e = document.getElementById('screen-' + k); return e && e.classList.contains('on'); });
    m.style.display = !St().data || title ? 'none' : '';
    var deck = m.querySelector('.deck');
    deck.disabled = inBattle();
    deck.setAttribute('data-tip', inBattle() ? '전투 중에는 덱을 바꿀 수 없다' : '덱 편집');
  };

  function win(title, body, cls) {
    UI.$$('.modal.win').forEach(UI.closeModal);
    var m = UI.modal('<div class="win-head"><h2>' + title + '</h2><button class="btn small close">닫기</button></div>' + body, 'win ' + (cls || ''));
    m.querySelector('.close').onclick = function () { UI.closeModal(m); if (cls === 'deckwin') X.refreshScreen(); };
    return m;
  }

  // ================= 도감 =================
  var codexState = { tab: 'cards', rarity: 'all', owner: 'all', type: 'all' };
  X.codex = function (tab) {
    if (tab) codexState.tab = tab;
    var m = win('도감', '<div class="codex-body"></div>', 'codex');
    renderCodex(m);
  };

  function renderCodex(m) {
    var body = m.querySelector('.codex-body'), d = St().data, cs = codexState;
    var html = tabs([['cards', '카드'], ['monsters', '몬스터'], ['heroes', '캐릭터'], ['relics', '유물']], cs.tab);
    if (cs.tab === 'cards') {
      var all = D.cards.filter(function (c) { return c.owner !== 'none'; });
      var owned = all.filter(function (c) { return d.cards.indexOf(c.id) >= 0; }).length;
      // 거르기는 한 줄: 등급 · 소유 · 유형 드롭다운 + 보이는 장수 + 수집률(12단계)
      var FILTERS = {
        rarity: { label: '등급', en: 'RANK', opts: [['all', '전체']].concat(G.RARITIES.map(function (r, i) { return [r, G.RARITY_NAME[r] + ' · 별 ' + (i + 1)]; })) },
        owner: { label: '소유', en: 'OWNER', opts: [['all', '전체']].concat(OWNERS.map(function (o) { return [o, ownerName(o)]; })) },
        type: { label: '유형', en: 'TYPE', opts: [['all', '전체']].concat(['attack', 'block', 'skill', 'heal', 'power'].map(function (t) { return [t, G.TYPE_NAME[t]]; })) }
      };
      var shown = all.filter(function (c) {
        return (cs.rarity === 'all' || c.rarity === cs.rarity) && (cs.owner === 'all' || c.owner === cs.owner) && (cs.type === 'all' || c.type === cs.type);
      });
      html += '<div class="filterbar">' + Object.keys(FILTERS).map(function (k) {
        var f = FILTERS[k], cur = f.opts.filter(function (o) { return o[0] === cs[k]; })[0] || f.opts[0];
        return '<div class="dd' + (cs[k] !== 'all' ? ' set' : '') + '" data-f="' + k + '"><button><small>' + f.en + '</small>' + (cs[k] === 'all' ? f.label + ' 전체' : cur[1]) + '</button></div>';
      }).join('') + (cs.rarity !== 'all' || cs.owner !== 'all' || cs.type !== 'all' ? '<button class="btn small ghost f-reset">초기화</button>' : '') +
        '<span class="spacer"></span><span class="count"><b>' + shown.length + '</b>장 표시 · 수집률 <b>' + owned + '/' + all.length + '</b> (' + Math.floor(owned / all.length * 100) + '%)</span></div>' +
        (G.debug && inBattle() ? '<div class="codex-sum"><span class="dbg">디버그: 카드를 누르면 손패에 넣는다</span></div>' : '') +
        '<div class="grid cards"></div>';
      body.innerHTML = html;
      var grid = body.querySelector('.grid.cards');
      UI.$$('.dd', body).forEach(function (dd) {
        var k = dd.getAttribute('data-f');
        dd.querySelector('button').onclick = function (e) {
          e.stopPropagation();
          var open = dd.querySelector('.dd-menu');
          UI.$$('.dd-menu', body).forEach(function (x) { x.parentNode.removeChild(x); });
          if (open) return;
          var menu = UI.el('div', 'dd-menu', FILTERS[k].opts.map(function (o) { return '<button class="' + (cs[k] === o[0] ? 'on' : '') + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join(''));
          dd.appendChild(menu);
          UI.$$('button', menu).forEach(function (b) { b.onclick = function () { cs[k] = b.getAttribute('data-v'); renderCodex(m); }; });
        };
      });
      body.onclick = function (e) { if (!e.target.closest('.dd')) UI.$$('.dd-menu', body).forEach(function (x) { x.parentNode.removeChild(x); }); };
      if (body.querySelector('.f-reset')) body.querySelector('.f-reset').onclick = function () { cs.rarity = cs.owner = cs.type = 'all'; renderCodex(m); };
      shown.forEach(function (c) {
        var has = d.cards.indexOf(c.id) >= 0;
        var el = UI.cardEl(has ? St().cardDef(c.id) : c, { static: true, silhouette: !has });
        if (!has) {
          el.querySelector('.cname span').textContent = '???';
          el.querySelector('.ctext span').textContent = '아직 얻지 못한 카드';
          el.removeAttribute('data-tip');
        }
        if (G.debug && inBattle()) {
          el.style.cursor = 'pointer';
          el.onclick = function () {
            var b = G.Battle.current;
            if (b.piles.hand.length < G.Deck.HAND_MAX) { b.piles.hand.push(G.Deck.inst(c.id)); b.update(); }
          };
        }
        grid.appendChild(el);
      });
    } else if (cs.tab === 'monsters') {
      var seenN = Object.keys(d.codex.monsters).length;
      html += '<div class="codex-sum">만난 몬스터 <b>' + seenN + '/' + D.monsters.length + '</b></div><div class="mon-list"></div>';
      body.innerHTML = html;
      var list = body.querySelector('.mon-list');
      THEMES.forEach(function (t) {
        list.appendChild(UI.el('div', 'theme-title', D.THEME_NAME[t]));
        D.monsters.filter(function (mo) { return mo.theme === t; }).forEach(function (mo) {
          var rec = d.codex.monsters[mo.id];
          var row = UI.el('div', 'mon-row pix');
          var sp = UI.el('div', 'sp');
          var s = UI.spriteEl(mo.sprite, { h: 96, max: 0.9 });
          s.style.left = '0';
          if (!rec) { s.style.filter = 'brightness(0)'; s.style.animation = 'none'; }
          sp.appendChild(s);
          row.appendChild(sp);
          var moves = mo.ai === 'weighted' ? Object.keys(mo.moves).map(function (k) { return mo.moves[k].name; }).join(' · ') + ' (그때그때 고른다)' : mo.pattern.map(function (k) { return mo.moves[k].name; }).join(' → ');
          // 20단계 고유 규칙(특수 상태)
          var rules = Object.keys(mo.startStatus || {}).filter(function (k) { return D.statuses[k] && D.statuses[k].kind === 'special'; })
            .map(function (k) { return D.statuses[k].name + ' ' + mo.startStatus[k] + ': ' + D.statuses[k].desc.replace('{n}', mo.startStatus[k]); });
          if (rules.length) moves += ' / 규칙 — ' + rules.join(' / ');
          row.appendChild(UI.el('div', 'info', rec ?
            '<b>' + mo.name + '</b> <span class="dim">' + RANK[mo.rank] + ' · 체력 ' + mo.hp + ' · 처치 ' + rec.kills + '회</span>' +
            '<div>' + U.esc(moves) + (mo.triggers ? ' <span class="dim">(체력이 줄면 행동이 바뀐다)</span>' : '') + '</div><div class="dim">' + U.esc(mo.desc || '') + '</div>' :
            '<b>???</b> <span class="dim">' + RANK[mo.rank] + ' · 아직 만나지 못했다</span>'));
          list.appendChild(row);
        });
      });
    } else if (cs.tab === 'relics') {
      var have = d.relics || [];
      html += '<div class="codex-sum">모은 유물 <b>' + have.length + '/' + D.relics.length + '</b> <span class="dim">· 정예·보스 처치, 상점에서 얻는다</span></div><div class="relic-list"></div>';
      body.innerHTML = html;
      var rl = body.querySelector('.relic-list');
      ['common', 'uncommon', 'rare', 'boss'].forEach(function (rar) {
        rl.appendChild(UI.el('div', 'theme-title', D.RELIC_RARITY[rar] + ' 유물'));
        D.relics.filter(function (r) { return r.rarity === rar; }).forEach(function (r) {
          var own = have.indexOf(r.id) >= 0;
          var row = UI.el('div', 'mon-row');
          row.innerHTML = '<div class="sp relic-sp"><i class="ico" style="' + UI.iconStyle(r.icon) + (own ? '' : ';filter:brightness(0)') + '"></i></div>' +
            '<div class="info">' + (own ? '<b>' + U.esc(r.name) + '</b><div>' + U.esc(r.desc) + '</div>' : '<b>???</b><div class="dim">아직 얻지 못한 유물</div>') + '</div>';
          rl.appendChild(row);
        });
      });
    } else {
      html += '<div class="hero-list"></div>';
      body.innerHTML = html;
      var hl = body.querySelector('.hero-list');
      D.characters.forEach(function (c) {
        var joined = d.characters.indexOf(c.id) >= 0;
        var row = UI.el('div', 'mon-row pix');
        var sp = UI.el('div', 'sp');
        var s = UI.spriteEl(c.id, 0.9);
        if (!joined) { s.style.filter = 'brightness(0)'; s.style.animation = 'none'; }
        sp.appendChild(s);
        row.appendChild(sp);
        var cards = D.cards.filter(function (x) { return x.owner === c.id; }).map(function (x) {
          return d.cards.indexOf(x.id) >= 0 ? '<span class="cn r-' + x.rarity + '">' + x.name + '</span>' : '<span class="cn dim">???</span>';
        }).join(' ');
        // 성장(레벨·경험치·고른 특성)
        var growth = '';
        if (joined) {
          var ei = St().expInfo(c.id), g = St().growthOf(c.id);
          var pct = ei.need ? Math.round((ei.exp - ei.prev) / (ei.need - ei.prev) * 100) : 100;
          var picks = g.traits.map(function (p, lv) { var t = D.traits[c.id][lv][p]; return '<span class="trait-chip" data-tip="<b>' + t.name + '</b><br>' + t.desc + '">Lv' + (lv + 1) + ' ' + t.name + '</span>'; }).join('');
          growth = '<div class="lvline"><span class="lv">Lv ' + ei.level + '</span><span class="expbar"><i style="width:' + pct + '%"></i></span>' +
            '<span class="dim">' + (ei.need ? ei.exp + '/' + ei.need : '최고 레벨') + '</span></div>' + (picks ? '<div class="cnames">' + picks + '</div>' : '');
        }
        row.appendChild(UI.el('div', 'info', joined ?
          '<b>' + c.name + '</b> <span class="dim">' + c.role + ' · ' + c.job + ' · 체력 ' + St().maxHp(c.id) + ' · 치명타 ' + Math.round(c.crit * 100) + '%</span>' +
          growth + (c.resource ? '<div class="res-line" style="color:' + c.resource.color + '"><b>고유 자원 · ' + c.resource.name + '</b> <span class="dim">' + U.esc(c.resource.desc) + '</span></div>' : '') + '<div class="dim">' + c.desc + '</div><div class="cnames">' + cards + '</div>' :
          '<b>???</b> <span class="dim">' + c.joinAfter + ' 스테이지를 클리어하면 합류한다</span>'));
        hl.appendChild(row);
      });
      // 짝 친밀도: 막대, 단계, 다음 해금, 합동기
      hl.appendChild(UI.el('div', 'theme-title', '친밀도'));
      var chars = D.characters.map(function (c) { return c.id; });
      for (var i = 0; i < chars.length; i++) for (var j = i + 1; j < chars.length; j++) {
        var key = St().pairKey(chars[i], chars[j]);
        if (d.characters.indexOf(chars[i]) < 0 || d.characters.indexOf(chars[j]) < 0) continue;
        var v = (d.bonds || {})[key] || 0, lv = St().bondLevel(key), next = D.bondLevels[lv];
        var nextText = lv === 0 ? '대화 1' : lv === 1 ? '대화 2 · 짝 연계 1.5배' : lv === 2 ? '대화 3 · 합동기' : '모두 해금';
        var duoC = D.duoByPair[key];
        var pcs = D.pairCombos.filter(function (p) { return St().pairKey(p.from, p.to) === key; })
          .map(function (p) { return '<span class="trait-chip" data-tip="<b>' + p.name + '</b><br>' + charDef(p.from).name + ' → ' + charDef(p.to).name + ': ' + p.desc + '">' + p.name + '</span>'; }).join('');
        var br = UI.el('div', 'mon-row bond-row');
        br.innerHTML = '<div class="info"><b>' + charDef(chars[i]).name + ' · ' + charDef(chars[j]).name + '</b> <span class="dim">' + lv + '단계 · 대화 ' + ((d.talks || {})[key] || 0) + '/3</span>' +
          '<div class="lvline"><span class="expbar bond"><i style="width:' + Math.min(100, Math.round(v / D.bondLevels[2] * 100)) + '%"></i></span>' +
          '<span class="dim">' + v + (next ? '/' + next + ' → ' + nextText : ' · ' + nextText) + '</span></div>' +
          '<div class="cnames">' + pcs + (duoC ? '<span class="trait-chip duo" data-tip="<b>' + duoC.name + '</b> (합동기)<br>' + U.esc(duoC.text.replace(/\{d0\}/, '')) + '">' + (lv >= 3 ? '합동기 ' + duoC.name : '합동기 ???') + '</span>' : '') + '</div></div>';
        hl.appendChild(br);
      }
    }
    UI.$$('.tab', body).forEach(function (b) { b.onclick = function () { cs.tab = b.getAttribute('data-tab'); renderCodex(m); }; });
  }

  // ================= 덱 편집 =================
  var deckOwner = 'kai';
  X.deck = function () {
    if (inBattle()) return;
    var d = St().data;
    if (deckOwner !== 'common' && d.characters.indexOf(deckOwner) < 0) deckOwner = d.characters[0];
    var m = win(St().runDecks() ? '스테이지 덱' : '덱 편집 · 준비 덱', '<div class="deck-body"></div>', 'deckwin');
    renderDeck(m);
  };

  function renderDeck(m) {
    var d = St().data, e = D.economy, body = m.querySelector('.deck-body');
    var owners = d.characters.concat(['common']);
    // 19단계: 스테이지 중에는 준비 덱을 바꿀 수 없고, 이번 스테이지 덱을 보여 준다
    var rd = St().runDecks();
    if (rd) {
      var ro = owners.filter(function (o) { return rd[o]; });
      if (ro.indexOf(deckOwner) < 0) deckOwner = ro[0];
      var cur = (rd[deckOwner] || []).slice().sort(function (a, b) { return a < b ? -1 : 1; });
      body.innerHTML = tabs(ro.map(function (o) { return [o, ownerName(o) + ' (' + rd[o].length + ')']; }), deckOwner) +
        '<p class="dim">스테이지 중에는 준비 덱을 바꿀 수 없다. 이번 스테이지 덱은 보상·상점·이벤트로 늘고, 상점의 제거와 휴식의 정리로 줄어든다. 스테이지 전체 ' + St().runDeckList().length + '장 · 지금 편성으로 싸우는 덱 ' + St().battleDeck(d.party).length + '장.</p>' +
        '<div class="grid in run"></div>';
      var g = body.querySelector('.grid.in');
      if (!cur.length) g.innerHTML = '<p class="dim">비어 있다</p>';
      cur.forEach(function (id) { g.appendChild(UI.cardEl(St().cardDef(id), { static: true })); });
      UI.$$('.tab', body).forEach(function (b) { b.onclick = function () { deckOwner = b.getAttribute('data-tab'); renderDeck(m); }; });
      return;
    }
    var deck = d.decks[deckOwner] || (d.decks[deckOwner] = []);
    var rest = St().ownedOf(deckOwner).filter(function (id) { return deck.indexOf(id) < 0; });
    var sort = function (a, b) {
      var ca = D.cardById[a], cb = D.cardById[b];
      return G.RARITIES.indexOf(cb.rarity) - G.RARITIES.indexOf(ca.rarity) || (a < b ? -1 : 1);
    };
    rest.sort(sort);
    body.innerHTML = tabs(owners.map(function (o) { return [o, ownerName(o) + ' (' + (d.decks[o] || []).length + ')']; }), deckOwner) +
      '<p class="dim">준비 덱: 스테이지에 들고 들어가는 카드. 카드를 누르면 넣거나 뺀다. 덱마다 ' + e.deckMin + '~' + e.deckMax + '장. 스테이지 덱 = 편성한 동료들의 준비 덱 + 공용 준비 덱, 스테이지 안에서 얻은 카드는 거기에 더해진다.</p>' +
      '<div class="deck-cols"><div><h3>덱 <b class="cnt">' + deck.length + '/' + e.deckMax + '</b></h3><div class="grid in"></div></div>' +
      '<div><h3>보유 (덱 밖) ' + rest.length + '장</h3><div class="grid out"></div></div></div>' +
      '<div class="row"><button class="btn auto">자동 구성</button><span class="msg dim"></span></div>';
    var msg = body.querySelector('.msg');
    var put = function (gridSel, ids, inDeck) {
      var g = body.querySelector(gridSel);
      if (!ids.length) g.innerHTML = '<p class="dim">' + (inDeck ? '비어 있다' : '덱 밖에 있는 카드가 없다') + '</p>';
      ids.forEach(function (id) {
        var c = UI.cardEl(St().cardDef(id), { static: true });
        c.onclick = function () {
          if (inDeck) {
            if (deck.length <= e.deckMin) { msg.textContent = '덱은 최소 ' + e.deckMin + '장이어야 한다.'; return; }
            deck.splice(deck.indexOf(id), 1);
          } else {
            if (deck.length >= e.deckMax) { msg.textContent = '덱이 가득 찼다. 먼저 한 장을 뺀다.'; return; }
            deck.push(id);
          }
          St().save();
          renderDeck(m);
        };
        g.appendChild(c);
      });
    };
    put('.grid.in', deck.slice().sort(sort), true);
    put('.grid.out', rest, false);
    UI.$$('.tab', body).forEach(function (b) { b.onclick = function () { deckOwner = b.getAttribute('data-tab'); renderDeck(m); }; });
    body.querySelector('.auto').onclick = function () { d.decks[deckOwner] = St().autoBuild(deckOwner); St().save(); renderDeck(m); };
  }

  // ================= 기록(12단계) =================
  X.stats = function () {
    var d = St().data;
    if (!d) return;
    var kills = 0, seen = Object.keys(d.codex.monsters).length;
    Object.keys(d.codex.monsters).forEach(function (k) { kills += d.codex.monsters[k].kills || 0; });
    var all = D.cards.filter(function (c) { return c.owner !== 'none'; }).length;
    var talks = Object.keys(d.talks || {}).reduce(function (s, k) { return s + d.talks[k]; }, 0);
    var stat = function (label, v, sub) { return '<div class="stat"><small>' + label + '</small><b>' + v + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; };
    win('원정 기록', '<div class="stat-grid">' +
      stat('클리어한 스테이지', d.clearedStage + '/' + D.stages.length, d.flags.ended ? '혈마를 쓰러뜨렸다' : '') +
      stat('승천', St().ascLevel() ? '승천 ' + St().ascLevel() : '기본', '최고 기록 ' + (d.ascension.best ? '승천 ' + d.ascension.best : '—')) +
      stat('동료', d.characters.length + '/' + D.characters.length) +
      stat('최고 레벨', 'Lv ' + Math.max.apply(null, d.characters.map(function (id) { return St().levelOf(id); }))) +
      stat('모은 카드', d.cards.filter(function (id) { return D.cardById[id] && D.cardById[id].owner !== 'none'; }).length + '/' + all) +
      stat('강화한 카드', Object.keys(d.upgraded || {}).length) +
      stat('모은 유물', d.relics.length + '/' + D.relics.length) +
      stat('만난 몬스터', seen + '/' + D.monsters.length) +
      stat('쓰러뜨린 적', kills) +
      stat('모닥불 이야기', talks + '/' + (D.dialogues ? Object.keys(D.dialogues).length * 3 : 30)) +
      stat('골드', d.gold) +
      '</div>', 'setwin');
  };

  // ================= 도움말(12단계) =================
  X.help = function () {
    var rows = [
      ['원정', '스테이지 10개를 차례로 깬다. 지도에서 갈림길을 고르고, 전투·이벤트·휴식·상점을 지나 정예나 보스를 쓰러뜨리면 다음 스테이지가 열린다.'],
      ['전투', '매 턴 에너지 3으로 카드를 쓴다. 적의 머리 위 예고를 보고 막거나 먼저 쓰러뜨린다. 쓰러진 동료는 전투 뒤 25%로 돌아온다.'],
      ['카드 등급', '카드 위쪽의 별이 등급이다. 별 1 일반 · 2 고급 · 3 희귀 · 4 영웅 · 5 전설. 합동기는 무지갯빛 테두리.'],
      ['동료', '2·4·6·8 스테이지를 깨면 새 동료가 합류한다. 전투로 경험치를 얻어 레벨이 오르면 특성을 고르고, 함께 싸울수록 친밀도가 쌓인다.'],
      ['패배', '스테이지를 처음부터 다시 한다. 골드 일부(노말 15%)를 잃고 스테이지 덱은 처음으로 돌아간다. 보유 카드·유물은 남는다.'],
      ['단축키', '1~9·0 카드 고르기(같은 번호를 다시 누르면 쓴다) · ←→ 대상 바꾸기 · Enter/Space 쓰기 · E 턴 종료 · Z 턴 되돌리기(노말) · L 전투 기록 · Esc 취소. 적의 턴에 전장을 누르면 빨리 감는다'],
      ['터치', '카드를 끌어 쓰거나 두 번 눌러 쓴다. 길게 누르면 설명이 나온다']
    ];
    win('도움말', '<div class="mon-list">' + rows.map(function (r) { return '<div class="mon-row"><div class="info"><b>' + r[0] + '</b><div>' + r[1] + '</div></div></div>'; }).join('') + '</div>', 'setwin');
  };

  // ================= 24단계: 저장 내보내기 · 가져오기 =================
  X.exportWin = function (slot) {
    var text = G.Save.exportText(slot);
    var m = UI.modal('<h2>' + slot + '번 칸 내보내기</h2><p class="dim">아래 글자를 복사해 다른 PC의 타이틀 → 저장 칸 → 가져오기에 붙여 넣는다. 파일로도 받을 수 있다.</p>' +
      '<textarea class="save-text" readonly></textarea>' +
      '<div class="row" style="justify-content:flex-end"><span class="dim copied"></span><button class="btn small file">파일로 받기</button><button class="btn small copy">복사</button><button class="btn gold close">닫기</button></div>', 'savewin');
    var ta = m.querySelector('.save-text');
    ta.value = text;
    ta.onclick = function () { ta.select(); };
    m.querySelector('.copy').onclick = function () {
      ta.select();
      var done = function () { m.querySelector('.copied').textContent = '복사했다'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { try { document.execCommand('copy'); done(); } catch (e) { /* 무시 */ } });
      else { try { document.execCommand('copy'); done(); } catch (e) { /* 무시 */ } }
    };
    m.querySelector('.file').onclick = function () {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      a.download = '천외검결-저장' + slot + '.txt';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    };
    m.querySelector('.close').onclick = function () { UI.closeModal(m); };
  };
  // onDone(): 가져오기에 성공하면 부른다
  X.importWin = function (slot, onDone) {
    var m = UI.modal('<h2>' + slot + '번 칸에 가져오기</h2><p class="dim">내보낸 글자를 붙여 넣거나 파일을 고른다.' + (G.Save.exists(slot) ? ' <b>이 칸의 지금 기록은 지워진다.</b>' : '') + '</p>' +
      '<textarea class="save-text" placeholder="CHG1:..."></textarea>' +
      '<div class="row" style="justify-content:flex-end"><span class="msg"></span><label class="btn small file">파일 고르기<input type="file" accept=".txt,text/plain" hidden></label><button class="btn small no">취소</button><button class="btn gold yes">가져오기</button></div>', 'savewin');
    var ta = m.querySelector('.save-text'), msg = m.querySelector('.msg');
    var preview = function () {
      var d = G.Save.parseExport(ta.value);
      msg.className = 'msg ' + (d ? 'ok' : 'bad');
      msg.textContent = !ta.value.trim() ? '' : d ? (D.modes[d.mode] || D.modes.normal).name + ' · 클리어 ' + d.clearedStage + ' · 동료 ' + d.characters.length + '명 · 골드 ' + d.gold : '알아볼 수 없는 글자다';
      return d;
    };
    ta.oninput = preview;
    m.querySelector('input[type=file]').onchange = function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { ta.value = String(rd.result || ''); preview(); };
      rd.readAsText(f);
    };
    m.querySelector('.no').onclick = function () { UI.closeModal(m); };
    m.querySelector('.yes').onclick = function () {
      if (!preview()) return;
      if (G.Save.importText(ta.value, slot)) { UI.closeModal(m); if (onDone) onDone(); }
      else { msg.className = 'msg bad'; msg.textContent = '저장하지 못했다'; }
    };
  };

  // ================= 설정 =================
  X.settingsWin = function () {
    var s = X.settings, debug = '';
    if (G.debug) {
      debug = '<div class="set-row"><span>디버그</span><div class="row"><button class="btn small dbg-gold">골드 +500</button>' +
        '<button class="btn small dbg-heal">전원 회복</button><button class="btn small dbg-relic">무작위 유물 +1</button><button class="btn small dbg-exp">경험치 +100</button><button class="btn small dbg-bond">친밀도 +20</button><button class="btn small dbg-test">전투 테스트 메뉴</button></div></div>';
    }
    var m = win('설정',
      '<div class="settings">' +
      '<div class="set-row"><span>효과음 볼륨</span><div class="row"><input type="range" min="0" max="100" step="5" class="vol" value="' + s.volume + '"><b class="volv">' + s.volume + '</b></div></div>' +
      '<div class="set-row"><span>배경음악 볼륨</span><div class="row"><input type="range" min="0" max="100" step="5" class="bgm" value="' + (s.bgm == null ? 45 : s.bgm) + '"><b class="bgmv">' + (s.bgm == null ? 45 : s.bgm) + '</b><small class="dim music-now"></small></div></div>' +
      '<div class="set-row"><span>이펙트 강도</span><div class="row"><button class="btn small fx-normal ' + (s.fx !== 'low' ? 'on' : '') + '">보통</button>' +
      '<button class="btn small fx-low ' + (s.fx === 'low' ? 'on' : '') + '">낮음</button><small class="dim">낮음: 파티클 30%, 흔들림·번쩍임 끔</small></div></div>' +
      '<div class="set-row"><span>전투 속도</span><div class="row"><button class="btn small sp1 ' + (s.speed !== 2 ? 'on' : '') + '">1x</button>' +
      '<button class="btn small sp2 ' + (s.speed === 2 ? 'on' : '') + '">2x</button></div></div>' +
      '<div class="set-row"><span>글자 크기</span><div class="row">' + [[1, '보통'], [1.15, '크게'], [1.3, '더 크게']].map(function (t) {
        return '<button class="btn small ts" data-ts="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div></div>' +
      '<div class="set-row"><span>색약 표기</span><div class="row"><button class="btn small cb-on ' + (s.cb ? 'on' : '') + '">켬</button><button class="btn small cb-off ' + (!s.cb ? 'on' : '') + '">끔</button>' +
      '<small class="dim">행동 예고·상태에 글자 표시, 공격 대상 이름</small></div></div>' +
      '<div class="set-row"><span>단축키 표시</span><div class="row"><button class="btn small hk-on ' + (s.hotkeys !== false ? 'on' : '') + '">켬</button><button class="btn small hk-off ' + (s.hotkeys === false ? 'on' : '') + '">끔</button>' +
      '<small class="dim">1~0 카드 · ←→ 대상 · Enter 사용 · E 턴 종료 · Z 되돌리기</small></div></div>' +
      '<div class="set-row"><span>튜토리얼</span><div class="row"><button class="btn small tut">다음 전투에서 다시 보기</button></div></div>' +
      (St().data ? '<div class="set-row"><span>저장 옮기기</span><div class="row"><button class="btn small export">' + G.Save.slot + '번 칸 내보내기</button><small class="dim">가져오기는 타이틀의 저장 칸 화면에서</small></div></div>' : '') +
      '<div class="set-row"><span>저장 데이터</span><div class="row"><button class="btn small reset">초기화</button><small class="dim">' + (G.debug ? '디버그 저장만 지운다' : '모든 진행이 사라진다') + '</small></div></div>' +
      debug + '</div>', 'setwin');
    var re = function () { X.settingsWin(); };
    var vol = m.querySelector('.vol');
    vol.oninput = function () { m.querySelector('.volv').textContent = vol.value; };
    vol.onchange = function () { s.volume = +vol.value; X.applySettings(s); G.Audio.play('coin'); };
    var bgm = m.querySelector('.bgm');
    bgm.oninput = function () { m.querySelector('.bgmv').textContent = bgm.value; s.bgm = +bgm.value; if (G.Music) G.Music.setVolume(s.bgm / 100); };
    bgm.onchange = function () { s.bgm = +bgm.value; X.applySettings(s); };
    var now = G.Music && G.Music.current(), song = now && G.Data.music[now];
    if (song) m.querySelector('.music-now').textContent = '지금 곡: ' + song.name;
    m.querySelector('.fx-normal').onclick = function () { s.fx = 'normal'; X.applySettings(s); re(); };
    m.querySelector('.fx-low').onclick = function () { s.fx = 'low'; X.applySettings(s); re(); };
    m.querySelector('.sp1').onclick = function () { s.speed = 1; X.applySettings(s); re(); };
    m.querySelector('.sp2').onclick = function () { s.speed = 2; X.applySettings(s); re(); };
    UI.$$('.ts', m).forEach(function (b) {
      b.classList.toggle('on', +b.getAttribute('data-ts') === (s.textScale || 1));
      b.onclick = function () { s.textScale = +b.getAttribute('data-ts'); X.applySettings(s); re(); };
    });
    m.querySelector('.cb-on').onclick = function () { s.cb = true; X.applySettings(s); re(); X.refreshScreen(); };
    m.querySelector('.cb-off').onclick = function () { s.cb = false; X.applySettings(s); re(); X.refreshScreen(); };
    m.querySelector('.hk-on').onclick = function () { s.hotkeys = true; X.applySettings(s); re(); };
    m.querySelector('.hk-off').onclick = function () { s.hotkeys = false; X.applySettings(s); re(); };
    if (m.querySelector('.export')) m.querySelector('.export').onclick = function () { St().save(); X.exportWin(G.Save.slot); };
    m.querySelector('.tut').onclick = function () {
      if (St().data) { St().data.flags.tutorialDone = false; St().save(); }
      this.textContent = '다음 전투에서 보여 준다';
      this.disabled = true;
    };
    m.querySelector('.reset').onclick = function () {
      var c = UI.modal('<h2>' + G.Save.slot + '번 칸의 저장 데이터를 지울까요?</h2><p>되돌릴 수 없다. 다른 칸은 그대로다.</p><div class="row" style="justify-content:flex-end">' +
        '<button class="btn no">취소</button><button class="btn gold yes">지우기</button></div>');
      c.querySelector('.no').onclick = function () { UI.closeModal(c); };
      c.querySelector('.yes').onclick = function () {
        UI.$$('.modal').forEach(UI.closeModal);
        G.Save.clear();
        St().data = null;
        G.Battle.current = null;
        G.Meta.title();
      };
    };
    if (G.debug) {
      m.querySelector('.dbg-gold').onclick = function () { if (St().data) { St().debugGold(500); re(); X.refreshScreen(); } };
      m.querySelector('.dbg-heal').onclick = function () {
        if (inBattle()) G.Battle.current.heroes.forEach(function (h) { if (!h.dead) h.hp = h.maxHp; G.Battle.current.update(); });
        if (St().data) St().debugHealAll();
        UI.closeModal(m); X.refreshScreen();
      };
      m.querySelector('.dbg-test').onclick = function () { UI.closeModal(m); G.TestMenu.open(); };
      m.querySelector('.dbg-exp').onclick = function () {
        if (!St().data) return;
        St().data.characters.forEach(function (id) { St().growthOf(id).exp += 100; });
        St().save(); UI.closeModal(m);
        if (!inBattle()) G.Meta.traits(function () { X.refreshScreen(); });
      };
      m.querySelector('.dbg-bond').onclick = function () {
        if (!St().data) return;
        var cs = St().data.characters;
        St().partyPairs(cs).forEach(function (k) { St().data.bonds[k] = (St().data.bonds[k] || 0) + 20; });
        St().save(); UI.closeModal(m); X.refreshScreen();
      };
      m.querySelector('.dbg-relic').onclick = function () {
        if (!St().data) return;
        var free = D.relics.filter(function (r) { return St().data.relics.indexOf(r.id) < 0; });
        if (free.length) { St().addRelic(G.rng.pick(free).id); St().save(); }
        UI.closeModal(m); X.refreshScreen();
      };
    }
  };

  // 메뉴 창을 닫은 뒤 현재 화면 숫자(골드·체력)를 다시 그린다
  X.refreshScreen = function () {
    if (document.getElementById('screen-map').classList.contains('on')) G.Meta.map();
    if (document.getElementById('screen-lobby').classList.contains('on')) G.Meta.lobby();
  };

  // ================= 첫 전투 튜토리얼 =================
  var STEPS = [
    ['.energy', '에너지', '카드를 쓰려면 에너지가 필요하다. 매 턴 3으로 다시 채워진다.'],
    ['.hand', '손패와 대상 지정', '카드를 누른 뒤 대상을 누르거나, 카드를 대상 위로 끌어다 놓아 사용한다. 우클릭이나 ESC로 취소한다.'],
    ['.unit.enemy .intent', '적의 행동 예고', '적의 머리 위에는 다음 행동이 보인다. 숫자는 피해량, 화살표 옆은 노리는 아군이다. 마우스를 올리면 자세히 보인다.'],
    ['.unit.ally .hpbar', '체력과 보호막', '보호막은 체력보다 먼저 피해를 막는다. 다음 내 턴이 시작되면 사라진다.'],
    ['.endturn', '턴 종료', '할 일을 마치면 턴을 끝낸다. 남은 손패는 버려지고 적이 행동한다.'],
    ['.handbar .piles', '덱과 버린 카드', '왼쪽 아래는 뽑을 카드, 오른쪽 아래는 버린 카드다. 누르면 목록을 볼 수 있다. 덱이 비면 버린 카드를 섞어 다시 뽑는다.'],
    ['#gmenu', '메뉴', '오른쪽 위 메뉴에서 도감·덱 편집·설정을 언제든 연다. 덱 편집은 전투 밖에서만 된다.']
  ];

  X.maybeTutorial = function () {
    var d = St().data;
    if (!d || d.flags.tutorialDone || !inBattle()) return;
    X.tutorial(0);
  };

  X.tutorial = function (i) {
    UI.$$('.tut-layer').forEach(function (e) { e.parentNode.removeChild(e); });
    var finish = function () {
      UI.$$('.tut-layer').forEach(function (e) { e.parentNode.removeChild(e); });
      var d = St().data;
      if (d) { d.flags.tutorialDone = true; St().save(); }
    };
    if (i >= STEPS.length) return finish();
    var step = STEPS[i], target = document.querySelector(step[0]);
    if (!target || !target.offsetWidth) return X.tutorial(i + 1);
    var app = document.getElementById('app').getBoundingClientRect(), r = target.getBoundingClientRect();
    var layer = UI.el('div', 'tut-layer');
    var box = UI.el('div', 'tut-box');
    box.style.left = (r.left - app.left - 6) + 'px';
    box.style.top = (r.top - app.top - 6) + 'px';
    box.style.width = (r.width + 12) + 'px';
    box.style.height = (r.height + 12) + 'px';
    var bub = UI.el('div', 'tut-bubble pix', '<b>' + (i + 1) + '/' + STEPS.length + ' · ' + step[1] + '</b><p>' + step[2] + '</p>' +
      '<div class="row"><button class="btn small skip">건너뛰기</button><button class="btn small gold next">' + (i === STEPS.length - 1 ? '시작하기' : '다음') + '</button></div>');
    layer.appendChild(box);
    layer.appendChild(bub);
    document.getElementById('app').appendChild(layer);
    // 말풍선은 대상 위 또는 아래, 화면 안쪽에
    var bw = 300, below = r.top - app.top < app.height / 2;
    bub.style.left = Math.max(12, Math.min(app.width - bw - 12, r.left - app.left + r.width / 2 - bw / 2)) + 'px';
    if (below) bub.style.top = (r.bottom - app.top + 14) + 'px';
    else bub.style.bottom = (app.bottom - r.top + 14) + 'px';
    bub.querySelector('.next').onclick = function () { X.tutorial(i + 1); };
    bub.querySelector('.skip').onclick = finish;
  };
})();
