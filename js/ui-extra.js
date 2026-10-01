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
    var title = document.getElementById('screen-title').classList.contains('on') || document.getElementById('screen-test').classList.contains('on');
    m.style.display = !St().data || title ? 'none' : '';
    var deck = m.querySelector('.deck');
    deck.disabled = inBattle();
    deck.setAttribute('data-tip', inBattle() ? '전투 중에는 덱을 바꿀 수 없다' : '덱 편집');
  };

  function win(title, body, cls) {
    UI.$$('.modal.win').forEach(UI.closeModal);
    var m = UI.modal('<div class="win-head"><h2>' + title + '</h2><button class="btn small close">닫기</button></div>' + body, 'win ' + (cls || ''));
    m.querySelector('.close').onclick = function () { UI.closeModal(m); };
    return m;
  }

  // ================= 도감 =================
  var codexState = { tab: 'cards', rarity: 'all', owner: 'all', type: 'all' };
  X.codex = function () {
    var m = win('도감', '<div class="codex-body"></div>', 'codex');
    renderCodex(m);
  };

  function renderCodex(m) {
    var body = m.querySelector('.codex-body'), d = St().data, cs = codexState;
    var html = tabs([['cards', '카드'], ['monsters', '몬스터'], ['heroes', '캐릭터'], ['relics', '유물']], cs.tab);
    if (cs.tab === 'cards') {
      var all = D.cards.filter(function (c) { return c.owner !== 'none'; });
      var owned = all.filter(function (c) { return d.cards.indexOf(c.id) >= 0; }).length;
      var opt = function (key, val, label) {
        return '<button class="btn small ' + (cs[key] === val ? 'on' : '') + '" data-f="' + key + '" data-v="' + val + '">' + label + '</button>';
      };
      html += '<div class="codex-sum">수집률 <b>' + owned + '/' + all.length + '</b> (' + Math.floor(owned / all.length * 100) + '%)' +
        (G.debug && inBattle() ? ' · <span class="dbg">디버그: 카드를 누르면 손패에 넣는다</span>' : '') + '</div>' +
        '<div class="filters"><div class="row">' + opt('rarity', 'all', '전체 등급') + G.RARITIES.map(function (r) { return opt('rarity', r, G.RARITY_NAME[r]); }).join('') + '</div>' +
        '<div class="row">' + opt('owner', 'all', '전체') + OWNERS.map(function (o) { return opt('owner', o, ownerName(o)); }).join('') + '</div>' +
        '<div class="row">' + opt('type', 'all', '전체 유형') + ['attack', 'block', 'skill', 'heal', 'power'].map(function (t) { return opt('type', t, G.TYPE_NAME[t]); }).join('') + '</div></div>' +
        '<div class="grid cards"></div>';
      body.innerHTML = html;
      var grid = body.querySelector('.grid.cards');
      all.filter(function (c) {
        return (cs.rarity === 'all' || c.rarity === cs.rarity) && (cs.owner === 'all' || c.owner === cs.owner) && (cs.type === 'all' || c.type === cs.type);
      }).forEach(function (c) {
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
      UI.$$('[data-f]', body).forEach(function (b) { b.onclick = function () { cs[b.getAttribute('data-f')] = b.getAttribute('data-v'); renderCodex(m); }; });
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
          var s = UI.spriteEl(mo.sprite, 0.6);
          s.style.left = '0';
          if (!rec) { s.style.filter = 'brightness(0)'; s.style.animation = 'none'; }
          sp.appendChild(s);
          row.appendChild(sp);
          var moves = mo.pattern.map(function (k) { return mo.moves[k].name; }).join(' → ');
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
          growth + '<div class="dim">' + c.desc + '</div><div class="cnames">' + cards + '</div>' :
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
    var m = win('덱 편집', '<div class="deck-body"></div>', 'deckwin');
    renderDeck(m);
  };

  function renderDeck(m) {
    var d = St().data, e = D.economy, body = m.querySelector('.deck-body');
    var owners = d.characters.concat(['common']);
    var deck = d.decks[deckOwner] || (d.decks[deckOwner] = []);
    var rest = St().ownedOf(deckOwner).filter(function (id) { return deck.indexOf(id) < 0; });
    var sort = function (a, b) {
      var ca = D.cardById[a], cb = D.cardById[b];
      return G.RARITIES.indexOf(cb.rarity) - G.RARITIES.indexOf(ca.rarity) || (a < b ? -1 : 1);
    };
    rest.sort(sort);
    body.innerHTML = tabs(owners.map(function (o) { return [o, ownerName(o) + ' (' + (d.decks[o] || []).length + ')']; }), deckOwner) +
      '<p class="dim">카드를 누르면 덱에 넣거나 뺀다. 덱은 ' + e.deckMin + '~' + e.deckMax + '장. 전투 덱 = 편성한 캐릭터들의 덱 + 공용 덱.</p>' +
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
      '<div class="set-row"><span>이펙트 강도</span><div class="row"><button class="btn small fx-normal ' + (s.fx !== 'low' ? 'on' : '') + '">보통</button>' +
      '<button class="btn small fx-low ' + (s.fx === 'low' ? 'on' : '') + '">낮음</button><small class="dim">낮음: 파티클 30%, 흔들림·번쩍임 끔</small></div></div>' +
      '<div class="set-row"><span>전투 속도</span><div class="row"><button class="btn small sp1 ' + (s.speed !== 2 ? 'on' : '') + '">1x</button>' +
      '<button class="btn small sp2 ' + (s.speed === 2 ? 'on' : '') + '">2x</button></div></div>' +
      '<div class="set-row"><span>튜토리얼</span><div class="row"><button class="btn small tut">다음 전투에서 다시 보기</button></div></div>' +
      '<div class="set-row"><span>저장 데이터</span><div class="row"><button class="btn small reset">초기화</button><small class="dim">' + (G.debug ? '디버그 저장만 지운다' : '모든 진행이 사라진다') + '</small></div></div>' +
      debug + '</div>', 'setwin');
    var re = function () { X.settingsWin(); };
    var vol = m.querySelector('.vol');
    vol.oninput = function () { m.querySelector('.volv').textContent = vol.value; };
    vol.onchange = function () { s.volume = +vol.value; X.applySettings(s); G.Audio.play('coin'); };
    m.querySelector('.fx-normal').onclick = function () { s.fx = 'normal'; X.applySettings(s); re(); };
    m.querySelector('.fx-low').onclick = function () { s.fx = 'low'; X.applySettings(s); re(); };
    m.querySelector('.sp1').onclick = function () { s.speed = 1; X.applySettings(s); re(); };
    m.querySelector('.sp2').onclick = function () { s.speed = 2; X.applySettings(s); re(); };
    m.querySelector('.tut').onclick = function () {
      if (St().data) { St().data.flags.tutorialDone = false; St().save(); }
      this.textContent = '다음 전투에서 보여 준다';
      this.disabled = true;
    };
    m.querySelector('.reset').onclick = function () {
      var c = UI.modal('<h2>저장 데이터를 지울까요?</h2><p>되돌릴 수 없다.</p><div class="row" style="justify-content:flex-end">' +
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
