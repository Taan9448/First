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
  var onExit = null;       // '맵으로'/'메뉴로' 버튼
  var onEnd = null;        // 전투가 끝나면 결과를 넘길 함수(없으면 테스트용 결과 창)

  var BattleUI = G.BattleUI = {};

  function $(sel) { return root.querySelector(sel); }

  // ================= 시작 =================
  // hooks: { onExit, onEnd(result, battle), exitLabel, confirmExit }
  BattleUI.start = function (battleOpts, hooks) {
    opts = battleOpts;
    hooks = hooks || {};
    onExit = hooks.onExit || onExit;
    onEnd = hooks.onEnd || null;
    var exitBtn = document.querySelector('#screen-battle .to-menu');
    exitBtn.textContent = hooks.exitLabel || '메뉴로';
    exitBtn._confirm = !!hooks.confirmExit;
    root = document.getElementById('screen-battle');
    field = $('.field'); heroesEl = $('.side.heroes'); monstersEl = $('.side.monsters');
    handEl = $('.hand'); fxEl = document.getElementById('fx'); aimEl = document.getElementById('aim');
    heroesEl.innerHTML = ''; monstersEl.innerHTML = ''; handEl.innerHTML = ''; fxEl.innerHTML = '';
    unitEls = {}; cardEls = {}; handSig = ''; fitSig = ''; selected = null; drag = null;
    UI.$$('.modal').forEach(UI.closeModal);

    G.bus.clear();
    bindBus();
    var theme = battleOpts.theme || (G.Data.monsterById[battleOpts.monsters[battleOpts.monsters.length - 1]] || {}).theme || 'forest';
    if (theme === 'mirror') theme = 'castle';
    G.Art.scene(theme).then(function (url) { if (url) field.style.backgroundImage = 'url(' + url + ')'; });
    $('.title').textContent = battleOpts.title || '전투';
    $('.stage-chip .chip').style.background = (G.Data.THEME_COLOR || {})[theme] || '#5ee0ff';
    $('.relic-bar').innerHTML = UI.relicBar(battleOpts.relics);
    $('.debug-kill').style.display = G.debug ? '' : 'none';
    hits = 0; showHits();
    $('.combo').classList.remove('on');
    field.classList.remove('zoom'); field.style.transform = '';
    UI.show('battle');
    B = G.Battle.create(battleOpts);
    if (G.Extra) G.Extra.refreshMenu();
    renderAll();
    var mine = B;
    var go = function () { if (B === mine) B.start(); };
    if (battleOpts.boss) cutIn(B.monsters[0], go); else go();
  };

  // 정예·보스 등장 컷인 (클릭하면 넘긴다)
  function cutIn(m, done) {
    var rankName = { elite: '정예', boss: '보스', final: '최종 보스' }[m.def.rank] || '보스';
    var c = UI.el('div', 'cutin', '<div class="band"><div class="portrait"></div><div class="who"><small>' + (m.def.rank === 'final' ? 'FINAL BOSS' : m.def.rank === 'elite' ? 'ELITE' : 'BOSS') +
      '</small><b>' + U.esc(m.name) + '</b><span class="dim">' + rankName + ' · ' + U.esc(m.def.desc || '') + '</span></div></div>');
    var sp = UI.spriteEl(m.def.sprite, { h: 300, max: 2.4 });
    c.querySelector('.portrait').appendChild(sp);
    if (FX.low) c.style.animationDuration = '0.8s';
    field.appendChild(c);
    SND.play('big');
    var finished = false;
    var end = function () { if (finished) return; finished = true; if (c.parentNode) c.parentNode.removeChild(c); done(); };
    c.onclick = end;
    setTimeout(end, FX.low ? 800 : 1600);
  }

  // 연타 카운터
  var hits = 0;
  function showHits() {
    var h = root && root.querySelector('.hitcount');
    if (!h) return;
    h.classList.toggle('on', hits >= 2);
    h.querySelector('b').textContent = hits;
    if (hits >= 2) pulseClass(h, 'bump', 180);
  }

  // ================= 렌더링 =================
  function renderAll() {
    if (!B) return;
    B.heroes.forEach(function (u) { renderUnit(u); });
    B.monsters.forEach(function (u) { renderUnit(u); });
    fitField();
    renderHand();
    renderIncoming();
    UI.setNum($('.energy .ev'), B.energy);
    $('.energy .emax').textContent = '/' + (B.energyMax || 3);
    $('.energy .next').textContent = B.nextEnergy ? '다음 턴 +' + B.nextEnergy : '';
    $('.energy').classList.toggle('empty', B.phase === 'player' && B.energy <= 0);
    UI.setNum($('.cnt-draw'), B.piles.draw.length, '.pilebtn');
    UI.setNum($('.cnt-discard'), B.piles.discard.length, '.pilebtn');
    UI.setNum($('.cnt-exhaust'), B.piles.exhaust.length, '.pilebtn');
    UI.setNum($('.turn'), B.turn, '.turn-badge');
    UI.setNum($('.goldv'), B.gold + B.goldDelta, '.gold');
    $('.endturn').disabled = B.phase !== 'player' || B.busy;
    var canAny = B.phase === 'player' && B.piles.hand.some(function (c) { return B.canPlay(c).ok; });
    $('.endturn').classList.toggle('ready', B.phase === 'player' && !B.busy && !canAny);
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
    e.innerHTML = '<div class="intent"></div>' + (u.side === 'ally' ? '<div class="incoming"></div>' : '') +
      '<div class="sprite-wrap"><div class="shadow"></div></div>' +
      '<div class="hpbar"><div class="ghost"></div><i></i><span></span><div class="blockbadge"></div></div><div class="sts"></div><div class="uname"></div>';
    var sp = UI.spriteEl(u.side === 'ally' ? u.id : u.def.sprite, u.side === 'enemy' ? u.size || u.def.size : 1);
    if (u.affix) {
      var ax = G.Data.affixes[u.affix];
      e.classList.add('affixed');
      e.style.setProperty('--affix', ax.color);
      e.querySelector('.uname').setAttribute('data-tip', '<b>' + ax.name + '</b> 변이<br>' + ax.desc);
    }
    e.querySelector('.sprite-wrap').appendChild(sp);
    e._sprite = sp;
    e._unit = u;
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
    var pct = Math.max(0, u.hp / u.maxHp * 100) + '%';
    hp.querySelector('i').style.width = pct;
    hp.querySelector('.ghost').style.width = pct;
    hp.querySelector('span').textContent = u.hp + '/' + u.maxHp;
    hp.classList.toggle('has-block', u.block > 0);
    var bb = e.querySelector('.blockbadge');
    bb.textContent = u.block || '';
    bb.style.display = u.block > 0 ? '' : 'none';
    var sts = UI.statusHTML(u);
    if (e._sts !== sts) { e.querySelector('.sts').innerHTML = sts; e._sts = sts; }
    e.querySelector('.uname').textContent = u.name;
    e.classList.toggle('dead', u.dead);
    var targetable = !!(selected && B.validTargets(selected).indexOf(u) >= 0);
    e.classList.toggle('targetable', targetable);
    // 행동 예고
    var it = e.querySelector('.intent');
    if (u.side === 'enemy' && !u.dead && u.intent && !B.over()) {
      // 큰 아이콘 + 큰 숫자. 공격이면 대상 아군의 색 점, 전체 공격이면 '전체'
      var info = B.intentInfo(u);
      var main = info.kinds.indexOf('attack') >= 0 ? 'attack' : info.kinds[0] || 'special';
      var html = UI.icon(main);
      if (info.dmg != null) html += '<span class="dmg">' + info.dmg + '</span>' + (info.times > 1 ? '<span class="times">×' + info.times + '</span>' : '');
      info.kinds.forEach(function (k) { if (k !== main) html += UI.icon(k, 'sub'); });
      if (info.dmg != null && info.all) html += '<span class="all">전체</span>';
      else if (info.dmg != null && info.target) { var tc = heroColor(info.target); html += '<i class="tdot" style="background:' + tc + ';color:' + tc + '"></i>'; }
      if (it._html !== html) { it.innerHTML = html; it._html = html; }
      it.className = 'intent k-' + main;
      it.style.display = '';
      it.setAttribute('data-tip', '<b>' + U.esc(info.name) + '</b>' + intentDesc(u));
    } else {
      it.style.display = 'none';
    }
  }

  function heroColor(h) {
    var c = G.Data.characters.filter(function (x) { return x.id === h.id; })[0];
    return c ? c.color : '#ffffff';
  }

  // 아군 머리 위 '받을 피해': 적들의 공격 예고를 합친다(취약·경감 반영, 보호막과 비교)
  function renderIncoming() {
    var inc = {};
    if (!B.over()) B.monsters.forEach(function (m) {
      if (m.dead || !m.intent) return;
      var info = B.intentInfo(m);
      if (info.dmg == null) return;
      var hit = function (h, base) {
        var d = Math.max(0, base - S.get(h, 'reduce'));
        inc[h.uid] = (inc[h.uid] || 0) + d * info.times;
      };
      if (info.all) B.heroes.forEach(function (h) { if (!h.dead) hit(h, Math.floor(info.dmg * (S.has(h, 'vulnerable') ? 1.5 : 1))); });
      else if (info.target && !info.target.dead) hit(info.target, info.dmg);
    });
    B.heroes.forEach(function (h) {
      var e = unitEls[h.uid], box = e && e.querySelector('.incoming');
      if (!box) return;
      var n = inc[h.uid] || 0, through = Math.max(0, n - h.block);
      box.classList.toggle('on', n > 0 && !h.dead);
      box.classList.toggle('safe', n > 0 && through === 0);
      box.classList.toggle('lethal', through >= h.hp && n > 0);
      var html = UI.icon(through === 0 ? 'block' : 'attack') + '<b>' + (through === 0 ? n : through) + '</b>';
      if (box._html !== html) { box.innerHTML = html; box._html = html; }
      box.setAttribute('data-tip', '<b>적 턴에 받을 피해</b> ' + n + (h.block ? '<br>보호막 ' + h.block + ' → 체력 -' + through : '') +
        (through >= h.hp ? '<br><span style="color:#ff8a8a">이대로면 쓰러진다!</span>' : ''));
    });
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
        el.addEventListener('mouseenter', function () { if (!drag || !drag.active) { el.classList.add('hovered'); layoutHand(); } });
        el.addEventListener('mouseleave', function () { el.classList.remove('hovered'); layoutHand(); });
        // 뽑은 카드는 왼쪽 아래(뽑을 더미)에서 날아 들어온다
        el.style.left = '-60px';
        el.style.top = '170px';
        el.style.transform = 'rotate(-28deg) scale(0.55)';
        el.style.setProperty('--sd', (-Math.random() * 3).toFixed(2) + 's');
        handEl.appendChild(el);
        void el.offsetWidth;
        cardEls[inst.uid] = el;
      }
      UI.updateCard(el, inst, B);
      el.classList.toggle('selected', selected === inst);
    });
    Object.keys(cardEls).forEach(function (uid) {
      if (!live[uid]) {
        var el = cardEls[uid];
        delete cardEls[uid];
        // 버린 카드는 오른쪽 아래(버린 더미)로 날아간다
        if (!el.classList.contains('flying')) {
          el.classList.remove('dragging', 'hovered');
          el.classList.add('flying');
          el.style.left = (handEl.clientWidth + 60) + 'px';
          el.style.top = '170px';
          el.style.transform = 'rotate(28deg) scale(0.55)';
        }
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 360);
      }
    });
    layoutHand();
  }

  // 부채꼴 배치. 마우스를 올린 카드는 크게 떠오르고 양옆 카드는 비켜 준다
  function layoutHand() {
    var hand = B.piles.hand, n = hand.length;
    var W = handEl.clientWidth;
    var ch = parseFloat(getComputedStyle(root).getPropertyValue('--ch')) || 200;
    var cw = ch * 125 / 175;
    var spacing = n > 1 ? Math.min(cw * 0.86, (W - cw) / (n - 1)) : 0;
    var start = (W - (cw + spacing * (n - 1))) / 2;
    var focus = -1;
    hand.forEach(function (inst, i) { var el = cardEls[inst.uid]; if (el && (el.classList.contains('hovered') || selected === inst)) focus = i; });
    hand.forEach(function (inst, i) {
      var el = cardEls[inst.uid];
      if (!el || el.classList.contains('flying') || el.classList.contains('dragging')) return;
      var mid = (n - 1) / 2, d = i - mid;
      var lifted = i === focus;
      var push = focus >= 0 && !lifted ? (i < focus ? -1 : 1) * cw * 0.22 / Math.max(1, Math.abs(i - focus)) : 0;
      if (lifted && selected === inst && drag && drag.aim) {
        // 대상을 고르는 중: 손패 가운데 위로 올라와 기다린다
        el.style.left = (W / 2 - cw / 2) + 'px';
        el.style.top = (-ch * 0.42) + 'px';
        el.style.transform = 'scale(1.08)';
      } else {
        el.style.left = (start + i * spacing + push) + 'px';
        el.style.top = (lifted ? -ch * 0.34 : 18 + d * d * 2.2) + 'px';
        el.style.transform = lifted ? 'scale(1.16)' : 'rotate(' + (d * 3.2) + 'deg)';
      }
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
    var el = cardEls[inst.uid], r = el.getBoundingClientRect();
    drag = { inst: inst, x0: ev.clientX, y0: ev.clientY, active: false, gx: ev.clientX - r.left, gy: ev.clientY - r.top, lx: ev.clientX, vx: 0, aim: false };
  }

  // 끌기: 대상이 필요 없는 카드는 손가락을 따라오며 움직이는 방향으로 기울고,
  // 대상이 필요한 카드는 손패 위로 올라와 조준 화살표를 그린다
  window.addEventListener('pointermove', function (ev) {
    // 눌러서 고른 카드도 대상을 고르는 동안 화살표를 보여 준다
    if (!drag && B && selected && B.needsTarget(selected) && root.classList.contains('on')) drawAim(selected, ev.clientX, ev.clientY);
    if (!drag || !B) return;
    if (!drag.active && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) > 10) {
      if (!B.canPlay(drag.inst).ok) { flashCard(drag.inst); drag = null; return; }
      drag.active = true;
      drag.aim = B.needsTarget(drag.inst);
      select(drag.inst);
    }
    if (!drag.active) return;
    var el = cardEls[drag.inst.uid];
    if (drag.aim) { drawAim(drag.inst, ev.clientX, ev.clientY); return; }
    if (!el) return;
    var hr = handEl.getBoundingClientRect();
    drag.vx = drag.vx * 0.7 + (ev.clientX - drag.lx) * 0.3;
    drag.lx = ev.clientX;
    el.classList.add('dragging');
    el.classList.remove('hovered');
    el.style.left = (ev.clientX - hr.left - drag.gx) + 'px';
    el.style.top = (ev.clientY - hr.top - drag.gy) + 'px';
    var over = ev.clientY < hr.top + 10;
    el.style.transform = 'rotate(' + Math.max(-22, Math.min(22, drag.vx * 1.6)).toFixed(1) + 'deg) scale(' + (over ? 1.12 : 1.04) + ')';
    el.classList.toggle('ready', over);
  });

  window.addEventListener('pointerup', function (ev) {
    if (!drag || !B) return;
    var d = drag;
    drag = null;
    var el = cardEls[d.inst.uid];
    if (el) el.classList.remove('dragging', 'ready');
    if (d.active) {
      var under = document.elementFromPoint(ev.clientX, ev.clientY);
      var ue = under && under.closest('.unit');
      var u = ue && ue._unit;
      if (B.needsTarget(d.inst)) {
        if (u && B.validTargets(d.inst).indexOf(u) >= 0) return tryPlay(d.inst, u);
      } else if (ev.clientY < handEl.getBoundingClientRect().top + 10) {
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

  // 조준 화살표: 카드에서 마우스까지 휘어진 굵은 선 + 화살촉. 유효한 대상 위에서는 붉게 빛난다
  function drawAim(inst, x, y) {
    var el = cardEls[inst.uid];
    if (!el) return;
    if (drag && drag.aim) layoutHand();
    var app = document.getElementById('app').getBoundingClientRect();
    var r = el.getBoundingClientRect();
    var x0 = r.left + r.width / 2 - app.left, y0 = r.top + 8 - app.top;
    var x1 = x - app.left, y1 = y - app.top;
    var cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - 120;
    var ok = !B.needsTarget(inst) || (hoverUnit && B.validTargets(inst).indexOf(hoverUnit) >= 0);
    var col = ok ? '#ff5d6c' : '#ffcb52';
    // 화살촉 방향: 곡선 끝의 접선
    var ang = Math.atan2(y1 - cy, x1 - cx), s = 18;
    var p1 = (x1 + Math.cos(ang) * 4) + ',' + (y1 + Math.sin(ang) * 4);
    var p2 = (x1 - Math.cos(ang - 0.5) * s) + ',' + (y1 - Math.sin(ang - 0.5) * s);
    var p3 = (x1 - Math.cos(ang + 0.5) * s) + ',' + (y1 - Math.sin(ang + 0.5) * s);
    var path = 'M' + x0 + ' ' + y0 + ' Q' + cx + ' ' + cy + ' ' + x1 + ' ' + y1;
    aimEl.innerHTML = '<svg width="100%" height="100%">' +
      '<path d="' + path + '" fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="12" stroke-linecap="round"/>' +
      '<path d="' + path + '" fill="none" stroke="' + col + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="14 10">' +
      '<animate attributeName="stroke-dashoffset" from="48" to="0" dur="0.5s" repeatCount="indefinite"/></path>' +
      '<polygon points="' + p1 + ' ' + p2 + ' ' + p3 + '" fill="' + col + '" stroke="rgba(0,0,0,0.6)" stroke-width="3" stroke-linejoin="round"/>' +
      (ok ? '<circle cx="' + x1 + '" cy="' + y1 + '" r="26" fill="none" stroke="' + col + '" stroke-width="3" opacity="0.7"><animate attributeName="r" values="20;30;20" dur="0.8s" repeatCount="indefinite"/></circle>' : '') +
      '</svg>';
  }
  function clearAim() { if (aimEl) aimEl.innerHTML = ''; }

  // ================= 연출 =================
  // 스프라이트의 위치. fy: 세로 비율(0 = 머리 위, 0.5 = 가운데)
  function center(u, fy) {
    var e = unitEls[u.uid];
    if (!e) return { x: 0, y: 0 };
    var r = e._sprite.getBoundingClientRect(), f = fxEl.getBoundingClientRect();
    return { x: r.left + r.width / 2 - f.left, y: r.top + r.height * (fy || 0) - f.top };
  }

  function float(u, text, cls) {
    if (!u) return;
    var p = center(u);
    var e = UI.el('div', 'float ' + (cls || ''), text);
    var stack = fxEl.querySelectorAll('.float').length % 3;
    e.style.left = p.x + (stack - 1) * 14 + 'px';
    e.style.top = p.y + stack * 10 + 'px';
    e.style.setProperty('--dx', Math.round((Math.random() - 0.5) * 50) + 'px');
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

  // ---------------- 이펙트 도우미 ----------------
  var cur = null; // 지금 쓰는 카드 { def, caster, el }
  var SND = G.Audio, FX = G.FX;

  function spritePt(u) { return center(u, 0.5); }
  function tipPt(u) {
    var e = unitEls[u.uid];
    if (!e) return spritePt(u);
    var sh = e._sprite._sheet, r = e._sprite.getBoundingClientRect(), f = fxEl.getBoundingClientRect();
    var t = sh.tipAttack || { x: 0.7, y: 0.4 };
    return { x: r.left + t.x * r.width - f.left, y: r.top + t.y * r.height - f.top };
  }
  function fieldCenter() {
    var r = field.getBoundingClientRect(), f = fxEl.getBoundingClientRect();
    return { x: r.left + r.width / 2 - f.left, y: r.top + r.height / 2 - f.top };
  }
  function pts(list) { return list.filter(function (u) { return !u.dead; }).map(spritePt); }

  function bindBus() {
    var on = G.bus.on;
    on('battle:update', function () { renderAll(); });
    on('battle:turn', function (d) {
      banner(d.side === 'ally' ? '내 턴' : '적의 턴', d.side === 'ally' ? '' : 'enemy');
      if (d.side === 'ally') { hits = 0; showHits(); }
      $('.combo').classList.remove('on');
      SND.play('turn');
      handSig = '';
    });
    on('cards:draw', function () { SND.play('draw'); });
    on('card:play', function (d) {
      var def = d.inst.def;
      cur = { def: def, caster: d.caster, el: G.ArtCards.elementOf(def) };
      SND.play('play');
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
      pulseClass($('.energy'), 'pulse', 400);
      if (d.caster) {
        var ce = unitEls[d.caster.uid];
        pulseClass(ce && ce._sprite, 'pose', 380);
        var magic = FX.MAGIC[cur.el];
        pulseClass(ce, def.type === 'attack' && !magic ? 'lunge-r' : 'hop', 330);
        // 마법 공격: 무기 끝에서 탄이 포물선으로 날아간다
        if (def.type === 'attack' && magic) {
          var from = tipPt(d.caster), colors = FX.colors(cur.el);
          var to = d.target ? [spritePt(d.target)] : def.target === 'allEnemies' ? pts(B.monsters) : [fieldCenter()];
          to.forEach(function (t) { FX.projectile(from, t, colors[0], null, { trail: colors[1], frames: 12 }); });
          FX.burst(from, { colors: colors, n: 8, speed: 1.2 });
        }
      }
      if (def.sfx) {
        var ctx = { from: d.caster ? tipPt(d.caster) : fieldCenter(), targets: d.target ? [spritePt(d.target)] : [],
          enemies: pts(B.monsters), allies: pts(B.heroes), center: fieldCenter(), el: cur.el };
        setTimeout(function () { FX.play(def.sfx, ctx); }, 140);
        SND.play(/dragon|explosion|meteor|quake|miracle/.test(def.sfx) ? 'big' : 'magic');
      }
    });
    on('card:done', function () { cur = null; });
    // 연계 수와 짝 연계
    on('combo', function (d) {
      var c = $('.combo');
      if (d.count >= 2) {
        c.querySelector('b').textContent = d.count;
        c.querySelector('.bonus').textContent = '공격 피해 +' + Math.min(G.Data.combo.maxBonus, d.count - 1);
        c.classList.add('on');
        pulseClass(c, 'bump', 300);
      }
      if (d.pair) {
        var b = UI.el('div', 'pair-banner', U.esc(d.pair.name) + (d.pair.boosted ? ' ×1.5' : '') + '<small>' + U.esc(d.pair.desc) + '</small>');
        field.appendChild(b);
        setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 1350);
        if (d.unit) FX.burst(spritePt(d.unit), { colors: ['#ff8ab0', '#8ad8ff', '#ffffff'], n: 18, speed: 2.4 });
        SND.play('buff');
      }
    });
    on('monster:act', function (d) { pulseClass(unitEls[d.unit.uid], 'lunge-l', 330); });
    on('monster:summon', function (d) {
      renderUnit(d.unit); pulseClass(unitEls[d.unit.uid], 'summoned', 420);
      FX.burst(spritePt(d.unit), { colors: ['#c9a0ff', '#ffffff'], n: 16, speed: 2 });
    });
    on('monster:trigger', function (d) {
      FX.flash('#ff8a8a'); FX.shake(true); SND.play('big');
      var e = unitEls[d.unit.uid];
      pulseClass(e, 'phase', 700);
      var band = UI.el('div', 'phase-band', U.esc(d.name));
      field.appendChild(band);
      setTimeout(function () { if (band.parentNode) band.parentNode.removeChild(band); }, 1450);
    });
    on('relic:trigger', function (d) { if (d.id) UI.flashRelic(d.id); });
    on('fx:hit', function (d) {
      var e = unitEls[d.unit.uid];
      if (!e) return;
      var p = spritePt(d.unit);
      var el = d.kind === 'poison' ? 'poison' : d.kind === 'burn' ? 'fire' : d.kind === 'thorns' ? 'nature' :
        d.kind === 'lose' ? 'shadow' : d.src && d.src.side === 'enemy' ? 'monster' : cur ? cur.el : 'neutral';
      if (d.amount > 0) {
        var cls = d.crit ? 'crit' : d.kind === 'poison' ? 'poison' : d.kind === 'burn' ? 'burn' : '';
        float(d.unit, (d.crit ? '치명타! ' : '') + d.amount, cls);
        if (d.overkill > 0) setTimeout(function () { float(d.unit, '과잉 +' + d.overkill, 'over'); }, 120);
        if (d.unit.side === 'enemy' && !d.kind && (!d.src || d.src.side === 'ally')) { hits++; showHits(); }
        pulseClass(e._sprite, 'hit', 120);
        pulseClass(e._sprite, 'stop', 90);
        pulseClass(e, d.unit.side === 'enemy' ? 'knock-r' : 'knock-l', 240);
        FX.impact(p, el, d.crit);
        if (d.amount >= 15 && !d.crit) FX.shake();
        SND.play(d.crit ? 'crit' : el === 'monster' ? 'hit' : el === 'neutral' || el === 'steel' || el === 'guard' ? 'slash' : SND.forElement(el));
      } else if (d.blocked > 0) {
        float(d.unit, '막음 ' + d.blocked, 'block');
        FX.ring(p, '#8fc6ff', 30);
        SND.play('block');
      }
    });
    on('fx:block', function (d) {
      float(d.unit, '+' + d.n, 'block');
      pulseClass(unitEls[d.unit.uid] && unitEls[d.unit.uid]._sprite, 'tint-block', 300);
      FX.ring(spritePt(d.unit), '#8fc6ff', 36, { size: 2 });
      SND.play('block');
    });
    on('fx:heal', function (d) {
      if (d.n <= 0) return;
      float(d.unit, '+' + d.n, 'heal');
      pulseClass(unitEls[d.unit.uid] && unitEls[d.unit.uid]._sprite, 'tint-heal', 300);
      FX.rise(spritePt(d.unit), { colors: FX.colors('nature'), n: 10 });
      SND.play('heal');
    });
    on('fx:status', function (d) {
      if (!unitEls[d.unit.uid] || d.unit.dead) return;
      var def = G.Data.statuses[d.key] || {};
      var p = spritePt(d.unit);
      if (def.kind === 'debuff') {
        var col = d.key === 'burn' ? 'fire' : d.key === 'poison' ? 'poison' : d.key === 'chill' || d.key === 'frozen' ? 'ice' : 'shadow';
        FX.rise(p, { colors: FX.colors(col), n: 6, down: true });
        SND.play('debuff');
      } else if (def.kind === 'buff') {
        FX.rise(p, { colors: ['#7cf27c', '#ffe066'], n: 6 });
        SND.play('buff');
      }
    });
    on('fx:cleanse', function (d) { FX.rise(spritePt(d.unit), { colors: ['#ffffff', '#9fe6ff'], n: 10 }); });
    on('fx:text', function (d) { float(d.unit || B.heroes[0], d.text, 'text ' + (d.kind || '')); });
    on('fx:gold', function (d) {
      var u = d.unit || B.heroes[0];
      float(u, (d.n > 0 ? '+' : '') + d.n + ' 골드', 'text good');
      FX.burst(spritePt(u), { colors: FX.colors('gold'), n: 10 });
      SND.play('coin');
    });
    on('fx:energy', function () { pulseClass($('.energy'), 'pulse', 400); });
    on('fx:death', function (d) {
      var e = unitEls[d.unit.uid];
      // 마지막 일격: 느려지며 그 적을 향해 확대
      if (d.unit.side === 'enemy' && B && !B.alive('enemy').length && e && !FX.low) {
        var r = e._sprite.getBoundingClientRect(), fr = field.getBoundingClientRect();
        field.style.transformOrigin = (r.left + r.width / 2 - fr.left) + 'px ' + (r.top + r.height / 2 - fr.top) + 'px';
        field.classList.add('zoom');
        field.style.transform = 'scale(1.12)';
        FX.slow(700);
        setTimeout(function () { field.style.transform = ''; }, 750);
      }
      if (e && d.unit.side === 'enemy') FX.shatter(e._sprite);
      if (d.unit.boss) { FX.flash('#ffffff'); FX.shake(true); SND.play('big'); } else SND.play('death');
      renderUnit(d.unit);
    });
    on('fx:revive', function (d) {
      renderUnit(d.unit); float(d.unit, '부활', 'text good');
      FX.play('revive', { targets: [spritePt(d.unit)], allies: [] });
    });
    on('battle:end', function (d) {
      var ended = B;
      if (G.Extra) G.Extra.refreshMenu();
      if (d.result === 'win') { setTimeout(function () { FX.confetti(); }, 300); SND.play('win'); }
      else SND.play('lose');
      setTimeout(function () {
        if (B !== ended) return;
        if (onEnd) onEnd(d.result, ended); else showResult(d.result);
      }, d.result === 'win' ? 1300 : 1500);
    });
  }

  // ================= 창 =================
  function showResult(result) {
    var win = result === 'win';
    var gold = B.goldDelta ? '<p style="text-align:center">전투 중 골드 ' + (B.goldDelta > 0 ? '+' : '') + B.goldDelta + '</p>' : '';
    var m = UI.modal('<h2>' + (win ? '승리!' : '패배') + '</h2>' + gold +
      '<div class="row" style="justify-content:center"><button class="btn gold again">다시 하기</button><button class="btn back">테스트 메뉴</button></div>',
    'result ' + (win ? 'win' : 'lose'));
    m.querySelector('.again').onclick = function () { BattleUI.start(opts, { onExit: onExit }); };
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
    root.querySelector('.to-menu').addEventListener('click', function () {
      if (!onExit) return;
      if (!this._confirm) { G.Battle.current = null; B = null; onExit(); return; }
      var m = UI.modal('<h2>맵으로 나갈까요?</h2><p>이 전투는 다음에 처음부터 다시 한다.</p>' +
        '<div class="row" style="justify-content:flex-end"><button class="btn no">계속 싸우기</button><button class="btn gold yes">맵으로</button></div>');
      m.querySelector('.no').onclick = function () { UI.closeModal(m); };
      m.querySelector('.yes').onclick = function () { UI.closeModal(m); G.Battle.current = null; B = null; onExit(); };
    });
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
