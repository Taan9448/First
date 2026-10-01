// ui-battle.js — 전투 화면. 전투 로직(battle.js)의 이벤트를 받아 그리고, 입력을 전투에 전달한다
(function () {
  'use strict';
  var G = Game, UI = G.UI, S = G.Status, U = G.util;

  var B = null;            // 현재 전투
  var root, field, heroesEl, monstersEl, handEl, fxEl, aimEl;
  var unitEls = {};        // uid → 유닛 요소
  var cardEls = {};        // uid → 카드 요소
  var handSig = '';
  var selected = null;     // 선택한 카드 인스턴스
  var drag = null;         // { inst, x0, y0, active }
  var hoverUnit = null;
  var opts = null;         // 전투를 다시 시작하기 위한 설정
  var onExit = null;

  var BattleUI = G.BattleUI = {};

  function $(sel) { return root.querySelector(sel); }

  // ================= 시작 =================
  BattleUI.start = function (battleOpts, exitFn) {
    opts = battleOpts;
    onExit = exitFn || onExit;
    root = document.getElementById('screen-battle');
    field = $('.field'); heroesEl = $('.side.heroes'); monstersEl = $('.side.monsters');
    handEl = $('.hand'); fxEl = document.getElementById('fx'); aimEl = document.getElementById('aim');
    heroesEl.innerHTML = ''; monstersEl.innerHTML = ''; handEl.innerHTML = ''; fxEl.innerHTML = '';
    unitEls = {}; cardEls = {}; handSig = ''; fitSig = ''; selected = null; drag = null;
    UI.$$('.modal').forEach(UI.closeModal);

    G.bus.clear();
    bindBus();
    var theme = (G.Data.monsterById[battleOpts.monsters[0]] || {}).theme || 'forest';
    G.Art.scene(theme).then(function (url) { if (url) field.style.backgroundImage = 'url(' + url + ')'; });
    $('.title').textContent = battleOpts.title || '전투';
    $('.debug-kill').style.display = G.debug ? '' : 'none';
    UI.show('battle');
    B = G.Battle.create(battleOpts);
    renderAll();
    B.start();
  };

  // ================= 렌더링 =================
  function renderAll() {
    if (!B) return;
    B.heroes.forEach(function (u) { renderUnit(u); });
    B.monsters.forEach(function (u) { renderUnit(u); });
    fitField();
    renderHand();
    $('.energy .crystal').textContent = B.energy;
    $('.energy small').textContent = B.nextEnergy ? '다음 턴 +' + B.nextEnergy : '에너지';
    $('.cnt-draw').textContent = B.piles.draw.length;
    $('.cnt-discard').textContent = B.piles.discard.length;
    $('.cnt-exhaust').textContent = B.piles.exhaust.length;
    $('.turn').textContent = '턴 ' + B.turn;
    var gold = B.gold + B.goldDelta;
    $('.goldv').textContent = gold;
    $('.endturn').disabled = B.phase !== 'player' || B.busy;
  }

  // 양쪽 진영이 겹치면 도트 크기와 유닛 폭을 줄인다
  var fitSig = '';
  function fitField(force) {
    var sig = B.monsters.filter(function (m) { return !m.dead; }).length + ':' + B.heroes.length + ':' + field.clientWidth;
    if (sig === fitSig && !force) return;
    fitSig = sig;
    field.style.removeProperty('--px');
    field.style.removeProperty('--uw');
    var need = heroesEl.offsetWidth + monstersEl.offsetWidth + 48;
    var avail = field.clientWidth * 0.94;
    if (need > avail) {
      var k = Math.max(0.55, avail / need);
      field.style.setProperty('--px', (4 * k).toFixed(2) + 'px');
      field.style.setProperty('--uw', Math.floor(132 * k) + 'px');
    }
  }

  function unitEl(u) {
    if (unitEls[u.uid]) return unitEls[u.uid];
    var e = UI.el('div', 'unit ' + u.side);
    e.innerHTML = '<div class="intent"></div><div class="sprite-wrap"><div class="shadow"></div></div>' +
      '<div class="hpbar pix"><i></i><span></span><div class="blockbadge"></div></div><div class="sts"></div><div class="uname"></div>';
    var sp = UI.spriteEl(u.side === 'ally' ? u.id : u.def.sprite, u.side === 'enemy' ? u.def.size : 1);
    e.querySelector('.sprite-wrap').appendChild(sp);
    e._sprite = sp;
    e._unit = u;
    e.querySelector('.blockbadge').setAttribute('style', UI.iconStyle('block'));
    e.addEventListener('click', function () { onUnitClick(u); });
    e.addEventListener('mouseenter', function () { hoverUnit = u; e.classList.add('hover'); });
    e.addEventListener('mouseleave', function () { if (hoverUnit === u) hoverUnit = null; e.classList.remove('hover'); });
    (u.side === 'ally' ? heroesEl : monstersEl).appendChild(e);
    unitEls[u.uid] = e;
    return e;
  }

  function renderUnit(u) {
    var e = unitEl(u);
    var hp = e.querySelector('.hpbar');
    hp.querySelector('i').style.width = Math.max(0, u.hp / u.maxHp * 100) + '%';
    hp.querySelector('span').textContent = u.hp + '/' + u.maxHp;
    hp.classList.toggle('has-block', u.block > 0);
    var bb = e.querySelector('.blockbadge');
    bb.textContent = u.block || '';
    bb.style.display = u.block > 0 ? '' : 'none';
    e.querySelector('.sts').innerHTML = UI.statusHTML(u);
    e.querySelector('.uname').textContent = u.name;
    e.classList.toggle('dead', u.dead);
    var targetable = !!(selected && B.validTargets(selected).indexOf(u) >= 0);
    e.classList.toggle('targetable', targetable);
    // 행동 예고
    var it = e.querySelector('.intent');
    if (u.side === 'enemy' && !u.dead && u.intent && !B.over()) {
      var info = B.intentInfo(u);
      var html = info.kinds.map(function (k) { return UI.icon(k); }).join('');
      if (info.dmg != null) html += '<span class="dmg">' + info.dmg + (info.times > 1 ? '×' + info.times : '') + (info.all ? ' 전체' : '') + '</span>';
      if (info.target && !info.all && info.dmg != null) html += '<span class="tgt">→ ' + info.target.name + '</span>';
      it.innerHTML = html;
      it.style.display = '';
      it.setAttribute('data-tip', '<b>' + U.esc(info.name) + '</b>' + intentDesc(u));
    } else {
      it.style.display = 'none';
    }
  }

  function intentDesc(m) {
    var move = B.moveOf(m);
    var parts = move.effects.map(function (e) {
      var tgt = e.target === 'allAllies' ? '아군 전체' : e.target === 'self' ? '자신' : e.target === 'allMonsters' ? '몬스터 전체' : '';
      switch (e.op) {
        case 'damage': return '피해' + (tgt ? '(' + tgt + ')' : '');
        case 'block': return '보호막 ' + e.value;
        case 'heal': return '회복 ' + e.value;
        case 'status': return (G.Data.statuses[e.status] || {}).name + ' ' + e.value + (tgt ? '(' + tgt + ')' : '');
        case 'addCard': return '모래 ' + (e.count || 1) + '장';
        case 'summon': return G.Data.monsterById[e.monster].name + ' 소환';
        case 'gold': return '골드 ' + e.value;
      }
      return '';
    }).filter(Boolean);
    return parts.length ? '<br>' + parts.join(', ') : '';
  }

  // 손패: 상태가 같으면 다시 그리지 않는다
  function renderHand() {
    var hand = B.piles.hand;
    var sig = hand.map(function (c) {
      var caster = B.casterOf(c);
      return c.uid + ':' + B.costOf(c) + ':' + B.canPlay(c).ok + ':' + B.condMet(c) +
        (caster ? ':' + S.get(caster, 'strength') + S.get(caster, 'tempStr') + S.get(caster, 'weak') : '');
    }).join('|') + '#' + B.energy + '#' + (selected ? selected.uid : '') + '#' + handEl.clientWidth + '#' + B.phase + B.busy;
    if (sig === handSig) return;
    handSig = sig;
    var live = {};
    hand.forEach(function (inst) {
      live[inst.uid] = true;
      var el = cardEls[inst.uid];
      if (!el) {
        el = UI.cardEl(inst.def, { battle: B, inst: inst });
        el._inst = inst;
        el.addEventListener('pointerdown', function (ev) { onCardDown(ev, inst); });
        el.addEventListener('mouseenter', function () { el.classList.add('hovered'); layoutHand(); });
        el.addEventListener('mouseleave', function () { el.classList.remove('hovered'); layoutHand(); });
        el.style.left = (handEl.clientWidth / 2) + 'px';
        el.style.top = '120px';
        handEl.appendChild(el);
        cardEls[inst.uid] = el;
      }
      UI.updateCard(el, inst, B);
      el.classList.toggle('selected', selected === inst);
    });
    Object.keys(cardEls).forEach(function (uid) {
      if (!live[uid]) {
        var el = cardEls[uid];
        delete cardEls[uid];
        if (!el.classList.contains('flying')) { el.classList.add('flying'); el.style.top = '160px'; }
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
      }
    });
    layoutHand();
  }

  function layoutHand() {
    var hand = B.piles.hand, n = hand.length;
    var W = handEl.clientWidth;
    var ch = parseFloat(getComputedStyle(root).getPropertyValue('--ch')) || 210;
    var cw = ch * 125 / 175;
    var spacing = n > 1 ? Math.min(cw * 0.88, (W - cw) / (n - 1)) : 0;
    var start = (W - (cw + spacing * (n - 1))) / 2;
    hand.forEach(function (inst, i) {
      var el = cardEls[inst.uid];
      if (!el || el.classList.contains('flying')) return;
      var mid = (n - 1) / 2, d = i - mid;
      var lifted = el.classList.contains('hovered') || selected === inst;
      el.style.left = (start + i * spacing) + 'px';
      el.style.top = (lifted ? -ch * 0.12 : 14 + d * d * 1.6) + 'px';
      el.style.transform = lifted ? 'scale(1.12)' : 'rotate(' + (d * 3) + 'deg)';
      el.style.zIndex = lifted ? 100 : 10 + i;
    });
  }

  // ================= 입력 =================
  function select(inst) {
    selected = inst;
    handSig = '';
    renderAll();
  }

  function tryPlay(inst, target) {
    if (!B || B.busy) return;
    selected = null;
    clearAim();
    B.play(inst, target).then(function () { handSig = ''; renderAll(); });
    handSig = '';
    renderAll();
  }

  function onCardDown(ev, inst) {
    if (ev.button !== 0 || !B || B.phase !== 'player') return;
    ev.preventDefault();
    drag = { inst: inst, x0: ev.clientX, y0: ev.clientY, active: false };
  }

  window.addEventListener('pointermove', function (ev) {
    if (!drag || !B) return;
    if (!drag.active && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) > 10) {
      if (!B.canPlay(drag.inst).ok) { drag = null; return; }
      drag.active = true;
      select(drag.inst);
    }
    if (drag.active) drawAim(drag.inst, ev.clientX, ev.clientY);
  });

  window.addEventListener('pointerup', function (ev) {
    if (!drag || !B) return;
    var d = drag;
    drag = null;
    if (d.active) {
      var under = document.elementFromPoint(ev.clientX, ev.clientY);
      var ue = under && under.closest('.unit');
      var u = ue && ue._unit;
      if (B.needsTarget(d.inst)) {
        if (u && B.validTargets(d.inst).indexOf(u) >= 0) return tryPlay(d.inst, u);
      } else if (ev.clientY < handEl.getBoundingClientRect().top) {
        return tryPlay(d.inst, null);
      }
      clearAim();
      select(null);
      return;
    }
    // 클릭
    if (selected === d.inst) {
      if (!B.needsTarget(d.inst)) return tryPlay(d.inst, null);
      return select(null);
    }
    if (!B.canPlay(d.inst).ok) { flashCard(d.inst); return; }
    select(d.inst);
  });

  function onUnitClick(u) {
    if (selected && B.needsTarget(selected) && B.validTargets(selected).indexOf(u) >= 0) tryPlay(selected, u);
  }

  function cancel() { if (selected || drag) { drag = null; clearAim(); select(null); } }
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') cancel(); });
  window.addEventListener('contextmenu', function (e) {
    if (document.getElementById('screen-battle').classList.contains('on')) { e.preventDefault(); cancel(); }
  });

  function flashCard(inst) {
    var el = cardEls[inst.uid];
    if (!el) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  }

  // 조준 화살표: 도트를 곡선을 따라 찍는다
  function drawAim(inst, x, y) {
    var el = cardEls[inst.uid];
    if (!el) return;
    var app = document.getElementById('app').getBoundingClientRect();
    var r = el.getBoundingClientRect();
    var x0 = r.left + r.width / 2 - app.left, y0 = r.top + 10 - app.top;
    var x1 = x - app.left, y1 = y - app.top;
    var cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - 80;
    var ok = !B.needsTarget(inst) || (hoverUnit && B.validTargets(inst).indexOf(hoverUnit) >= 0);
    var col = ok ? '#f0c75e' : '#8a93b8';
    var dots = '';
    for (var i = 0; i <= 16; i++) {
      var t = i / 16, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
      var px = a * x0 + b * cx + c * x1, py = a * y0 + b * cy + c * y1;
      var s = 6 + Math.round(t * 4);
      dots += '<rect x="' + Math.round(px - s / 2) + '" y="' + Math.round(py - s / 2) + '" width="' + s + '" height="' + s + '" fill="' + col + '" stroke="#05070f" stroke-width="2"/>';
    }
    aimEl.innerHTML = '<svg width="100%" height="100%" shape-rendering="crispEdges">' + dots + '</svg>';
  }
  function clearAim() { if (aimEl) aimEl.innerHTML = ''; }

  // ================= 연출 =================
  function center(u) {
    var e = unitEls[u.uid];
    if (!e) return { x: 0, y: 0 };
    var r = e._sprite.getBoundingClientRect(), f = fxEl.getBoundingClientRect();
    return { x: r.left + r.width / 2 - f.left, y: r.top - f.top };
  }

  function float(u, text, cls) {
    if (!u) return;
    var p = center(u);
    var e = UI.el('div', 'float ' + (cls || ''), text);
    var stack = fxEl.querySelectorAll('.float').length % 3;
    e.style.left = p.x + (stack - 1) * 14 + 'px';
    e.style.top = p.y + stack * 10 + 'px';
    fxEl.appendChild(e);
    setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 950);
  }

  function pulseClass(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms || 300);
  }

  function banner(text, cls) {
    var e = UI.el('div', 'banner ' + (cls || ''), text);
    field.appendChild(e);
    setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 950);
  }

  function bindBus() {
    var on = G.bus.on;
    on('battle:update', function () { renderAll(); });
    on('battle:turn', function (d) {
      banner(d.side === 'ally' ? '내 턴' : '적의 턴', d.side === 'ally' ? '' : 'enemy');
      handSig = '';
    });
    on('card:play', function (d) {
      var el = cardEls[d.inst.uid];
      if (el) {
        var hr = handEl.getBoundingClientRect(), tx, ty;
        if (d.target) {
          var r = unitEls[d.target.uid]._sprite.getBoundingClientRect();
          tx = r.left + r.width / 2 - hr.left; ty = r.top + r.height / 2 - hr.top;
        } else {
          var fr = field.getBoundingClientRect();
          tx = fr.left + fr.width / 2 - hr.left; ty = fr.top + fr.height / 2 - hr.top;
        }
        el.classList.add('flying');
        el.style.left = tx - el.offsetWidth / 2 + 'px';
        el.style.top = ty - el.offsetHeight / 2 + 'px';
        el.style.transform = 'scale(0.4)';
      }
      if (d.caster) {
        var ce = unitEls[d.caster.uid];
        pulseClass(ce && ce._sprite, 'pose', 380);
        pulseClass(ce, d.inst.def.type === 'attack' ? 'lunge-r' : 'hop', 330);
      }
    });
    on('monster:act', function (d) { pulseClass(unitEls[d.unit.uid], 'lunge-l', 330); });
    on('monster:summon', function (d) { renderUnit(d.unit); pulseClass(unitEls[d.unit.uid], 'summoned', 420); });
    on('fx:hit', function (d) {
      var e = unitEls[d.unit.uid];
      if (d.amount > 0) {
        var cls = d.crit ? 'crit' : d.kind === 'poison' ? 'poison' : d.kind === 'burn' ? 'burn' : '';
        float(d.unit, (d.crit ? '치명타! ' : '') + d.amount, cls);
        pulseClass(e && e._sprite, 'hit', 120);
        pulseClass(e, 'shake', 300);
      } else if (d.blocked > 0) {
        float(d.unit, '막음 ' + d.blocked, 'block');
      }
    });
    on('fx:block', function (d) { float(d.unit, '+' + d.n, 'block'); pulseClass(unitEls[d.unit.uid] && unitEls[d.unit.uid]._sprite, 'tint-block', 300); });
    on('fx:heal', function (d) { if (d.n > 0) { float(d.unit, '+' + d.n, 'heal'); pulseClass(unitEls[d.unit.uid] && unitEls[d.unit.uid]._sprite, 'tint-heal', 300); } });
    on('fx:text', function (d) { float(d.unit || B.heroes[0], d.text, 'text ' + (d.kind || '')); });
    on('fx:gold', function (d) { float(d.unit || B.heroes[0], (d.n > 0 ? '+' : '') + d.n + ' 골드', 'text good'); });
    on('fx:energy', function () { pulseClass($('.energy'), 'pulse', 400); });
    on('fx:death', function (d) { renderUnit(d.unit); });
    on('fx:revive', function (d) { renderUnit(d.unit); float(d.unit, '부활', 'text good'); });
    on('battle:end', function (d) {
      var ended = B;
      setTimeout(function () { if (B === ended) showResult(d.result); }, 700);
    });
  }

  // ================= 창 =================
  function showResult(result) {
    var win = result === 'win';
    var gold = B.goldDelta ? '<p style="text-align:center">전투 중 골드 ' + (B.goldDelta > 0 ? '+' : '') + B.goldDelta + '</p>' : '';
    var m = UI.modal('<h2>' + (win ? '승리!' : '패배') + '</h2>' + gold +
      '<div class="row" style="justify-content:center"><button class="btn gold again">다시 하기</button><button class="btn back">테스트 메뉴</button></div>',
    'result ' + (win ? 'win' : 'lose'));
    m.querySelector('.again').onclick = function () { BattleUI.start(opts); };
    m.querySelector('.back').onclick = function () { UI.closeModal(m); if (onExit) onExit(); };
  }

  function showPile(name, title) {
    var list = B.piles[name].slice();
    if (name === 'draw') list.sort(function (a, b) { return a.id < b.id ? -1 : 1; }); // 뽑을 순서는 감춘다
    var m = UI.modal('<h2>' + title + ' (' + list.length + ')</h2><div class="grid"></div><div class="row" style="justify-content:flex-end"><button class="btn close">닫기</button></div>');
    var grid = m.querySelector('.grid');
    if (!list.length) grid.innerHTML = '<p style="color:#8a93b8">비어 있다.</p>';
    list.forEach(function (inst) { grid.appendChild(UI.cardEl(inst.def, { static: true })); });
    m.querySelector('.close').onclick = function () { UI.closeModal(m); };
  }

  BattleUI.init = function () {
    root = document.getElementById('screen-battle');
    root.querySelector('.endturn').addEventListener('click', function () {
      if (!B || B.phase !== 'player' || B.busy) return;
      selected = null; clearAim();
      B.endTurn();
    });
    root.querySelector('.pile-draw').addEventListener('click', function () { showPile('draw', '뽑을 카드'); });
    root.querySelector('.pile-discard').addEventListener('click', function () { showPile('discard', '버린 카드'); });
    root.querySelector('.pile-exhaust').addEventListener('click', function () { showPile('exhaust', '소멸한 카드'); });
    root.querySelector('.to-menu').addEventListener('click', function () { if (onExit) onExit(); });
    root.querySelector('.debug-kill').addEventListener('click', function () { if (B && B.phase === 'player' && !B.busy) B.debugKillAll(); });
    root.querySelector('.field').addEventListener('click', function (e) {
      if (selected && !B.needsTarget(selected) && !e.target.closest('.unit')) tryPlay(selected, null);
    });
    root.querySelector('.energy .crystal').setAttribute('style', UI.iconStyle('energy'));
    root.querySelector('.ico-draw').setAttribute('style', UI.iconStyle('deck'));
    root.querySelector('.ico-discard').setAttribute('style', UI.iconStyle('discard'));
    root.querySelector('.ico-exhaust').setAttribute('style', UI.iconStyle('exhaust'));
    root.querySelector('.ico-gold').setAttribute('style', UI.iconStyle('gold'));
    window.addEventListener('resize', function () { if (B) { handSig = ''; renderAll(); } });
  };
})();
