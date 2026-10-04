// main.js — 초기화, ?debug=1 처리, 디버그용 전투 테스트 메뉴
(function () {
  'use strict';
  var G = Game, UI = G.UI;
  G.debug = /[?&]debug=1/.test(location.search);

  var THEMES = ['forest', 'desert', 'snow', 'volcano', 'castle', 'rift', 'mirror'].map(function (t) { return [t, Game.Data.THEME_NAME[t]]; });
  var RANK = { normal: '', elite: '정예 ', boss: '보스 ', final: '최종 보스 ' };
  var DECK_MODES = [['basic', '기본 카드'], ['random', '무작위 20장'], ['rare', '희귀 이상 20장']];
  var state = { party: ['kai'], encounter: ['slime', 'slime'], deck: 'basic' };

  function buildDeck() {
    var cards = G.Data.cards.filter(function (c) { return c.owner === 'common' || state.party.indexOf(c.owner) >= 0; });
    if (state.deck === 'basic') {
      var common = cards.filter(function (c) { return c.owner === 'common' && c.basic; }).slice(0, 10);
      return cards.filter(function (c) { return c.owner !== 'common' && c.basic; }).concat(common).map(function (c) { return c.id; });
    }
    if (state.deck === 'rare') cards = cards.filter(function (c) { return G.RARITIES.indexOf(c.rarity) >= 2; });
    return G.rng.shuffle(cards.map(function (c) { return c.id; })).slice(0, 20);
  }

  function renderMenu() {
    var root = document.getElementById('screen-test');
    var heroes = G.Data.characters.map(function (c) {
      var on = state.party.indexOf(c.id) >= 0;
      return '<div class="hero-pick pix ' + (on ? 'on' : '') + '" data-hero="' + c.id + '"><div class="sp"></div><b>' + c.name + '</b><small>' + c.role + ' · 체력 ' + c.hp + '</small></div>';
    }).join('');
    var decks = DECK_MODES.map(function (d) {
      return '<button class="btn small ' + (state.deck === d[0] ? 'on' : '') + '" data-deck="' + d[0] + '">' + d[1] + '</button>';
    }).join('');
    var monsters = THEMES.map(function (t) {
      var list = G.Data.monsters.filter(function (m) { return m.theme === t[0]; });
      return '<div class="theme">' + t[1] + '</div>' + list.map(function (m) {
        return '<button class="btn small" data-mon="' + m.id + '">' + RANK[m.rank] + m.name + '</button>';
      }).join('') + '<button class="btn small gold" data-group="' + t[0] + '">무작위 무리</button>';
    }).join('');
    var enc = state.encounter.map(function (id) { return G.Data.monsterById[id].name; }).join(', ') || '(없음)';
    root.innerHTML =
      '<h1>전투 테스트</h1><div class="sub">디버그 전용 · 저장과 무관 · <a href="#" class="back-title">타이틀로</a></div>' +
      '<div class="panel pix"><h2>파티 (최대 3명)</h2><div class="row">' + heroes + '</div></div>' +
      '<div class="panel pix"><h2>덱</h2><div class="row">' + decks + '</div></div>' +
      '<div class="panel pix"><h2>적 (최대 4마리) — 현재: ' + enc + '</h2><div class="enc-list">' + monsters + '</div>' +
      '<div class="row" style="margin-top:12px"><button class="btn small clear">적 비우기</button></div></div>' +
      '<div class="row"><button class="btn gold start" ' + (state.party.length && state.encounter.length ? '' : 'disabled') + '>전투 시작</button></div>';
    UI.$$('.hero-pick', root).forEach(function (el) {
      var id = el.getAttribute('data-hero');
      el.querySelector('.sp').appendChild(UI.spriteEl(id, 0.75));
      el.onclick = function () {
        var i = state.party.indexOf(id);
        if (i >= 0) state.party.splice(i, 1);
        else if (state.party.length < 3) state.party.push(id);
        renderMenu();
      };
    });
    UI.$$('[data-deck]', root).forEach(function (el) { el.onclick = function () { state.deck = el.getAttribute('data-deck'); renderMenu(); }; });
    UI.$$('[data-mon]', root).forEach(function (el) {
      el.onclick = function () {
        var m = G.Data.monsterById[el.getAttribute('data-mon')];
        if (m.rank !== 'normal') state.encounter = [m.id];
        else {
          state.encounter = state.encounter.filter(function (id) { return G.Data.monsterById[id].rank === 'normal'; });
          if (state.encounter.length < 4) state.encounter.push(m.id);
        }
        renderMenu();
      };
    });
    UI.$$('[data-group]', root).forEach(function (el) {
      el.onclick = function () {
        var list = G.Data.monsters.filter(function (m) { return m.theme === el.getAttribute('data-group') && m.rank === 'normal'; });
        state.encounter = G.rng.shuffle(list.map(function (m) { return m.id; })).slice(0, G.rng.int(2, 3));
        renderMenu();
      };
    });
    root.querySelector('.clear').onclick = function () { state.encounter = []; renderMenu(); };
    root.querySelector('.start').onclick = startBattle;
    root.querySelector('.back-title').onclick = function (e) { e.preventDefault(); G.Meta.title(); };
  }

  function startBattle() {
    var btn = document.querySelector('#screen-test .start');
    btn.disabled = true;
    btn.textContent = '그래픽 준비 중…';
    var deck = buildDeck();
    var defs = deck.map(function (id) { return G.Data.cardById[id]; });
    G.ArtCards.preload(defs).then(function () {
      G.BattleUI.start({
        title: '전투 테스트',
        party: state.party.map(function (id) { return { id: id }; }),
        monsters: state.encounter.slice(),
        deck: deck,
        gold: 100,
        undo: true
      }, { onExit: backToMenu });
    });
  }

  function backToMenu() {
    G.Battle.current = null;
    UI.show('test');
    renderMenu();
  }

  G.TestMenu = { open: function () { UI.show('test'); renderMenu(); } };

  // 갈무리 폰트가 들어오면 도트 글꼴 크기 체계로 바꾼다
  function detectFont() {
    if (!document.fonts || !document.fonts.load) return;
    document.fonts.load('12px Galmuri11').then(function () {
      if (document.fonts.check('12px Galmuri11')) document.body.classList.add('pixel-font');
    }).catch(function () {});
  }

  window.addEventListener('DOMContentLoaded', function () {
    detectFont();
    G.Extra.applySettings(G.Save.loadSettings());
    G.FX.init();
    G.BattleUI.init();
    G.Extra.initMenu();
    G.CharacterArt.load().then(function () { G.Meta.title(); });
    // 나머지 카드 그림은 뒤에서 미리 변환해 둔다
    setTimeout(function () { G.ArtCards.preload(G.Data.cards); }, 300);
  });
})();
