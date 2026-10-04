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
    unitEls = {}; cardEls = {}; handSig = ''; fitSig = ''; selected = null; drag = null; aimIdx = 0;
    clearLog(); endFast();
    UI.$$('.modal').forEach(UI.closeModal);

    G.bus.clear();
    bindBus();
    var theme = battleOpts.theme || (G.Data.monsterById[battleOpts.monsters[battleOpts.monsters.length - 1]] || {}).theme || 'forest';
    if (theme === 'mirror') theme = 'castle';
    G.Art.scene(theme).then(function (url) { if (url) field.style.backgroundImage = 'url(' + url + ')'; });
    field.classList.toggle('has-bg', !!(G.Assets && G.Assets.battleBg(theme)));   // 36단계: 그림 배경이면 코드 바닥·띠를 덜어 낸다
    // 16단계: 배경과 캐릭터를 잇는 바닥·앞쪽 장식·떠다니는 입자(테마별)
    field.setAttribute('data-theme', theme);
    G.Art.fore(theme).then(function (url) { var f = field.querySelector('.fore'); if (url && f) f.style.backgroundImage = 'url(' + url + ')'; });
    var motes = field.querySelector('.motes'), mh = '';
    if (!(G.FX && G.FX.low)) for (var mi = 0; mi < 16; mi++) {
      mh += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;bottom:' + (8 + Math.random() * 60).toFixed(1) + '%;animation-delay:-' + (Math.random() * 6).toFixed(2) + 's;animation-duration:' + (5 + Math.random() * 4).toFixed(2) + 's"></i>';
    }
    motes.innerHTML = mh;
    $('.title').textContent = battleOpts.title || '전투';
    $('.stage-chip .chip').style.background = (G.Data.THEME_COLOR || {})[theme] || '#5ee0ff';
    $('.relic-bar').innerHTML = UI.relicBar(battleOpts.relics);
    $('.debug-kill').style.display = G.debug ? '' : 'none';
    hits = 0; showHits();
    $('.combo').classList.remove('on');
    field.classList.remove('zoom'); field.style.transform = '';
    UI.show('battle');
    if (G.Music) G.Music.battle(battleOpts);   // 25단계: 테마 곡 + 전투 층, 보스·혈마는 따로
    battleOpts.cutin = !FX.low; // 16단계: 영웅·전설 카드 컷인(이펙트 '낮음'이면 생략)
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

  function heroDef(id) { return G.Data.characters.filter(function (c) { return c.id === id; })[0]; }
  function skillCutIn(def, caster) {
    var ids = def.duo ? def.duo.slice() : [caster.id];
    var lines = def.duo ? (def.lines || []) : [def.line || G.rng.pick((heroDef(caster.id) || {}).cutin || ['하앗!'])];
    var rar = def.duo ? 'duo' : def.rarity;
    var faces = ids.map(function (id, i) {
      var h = heroDef(id) || { name: id, color: '#5ee6ff' };
      return '<div class="cf-face" style="--hc:' + h.color + '"><div class="cf-win"></div><b>' + h.name + '</b>' + (lines[i] ? '<p>' + U.esc(lines[i]) + '</p>' : '') + '</div>';
    }).join('');
    var c = UI.el('div', 'skill-cut r-' + rar + (def.duo ? ' duo' : ''), '<div class="sc-lines"></div><div class="sc-band">' + faces +
      '<div class="sc-card"><small>' + (def.duo ? '합동기' : def.rarity === 'legendary' ? '전설 · LEGENDARY' : '영웅 · EPIC') + '</small><b>' + U.esc(def.name) + '</b>' + UI.starsHTML(def.duo ? 'epic' : def.rarity) + '</div></div>');
    c.style.setProperty('--hc', (heroDef(ids[0]) || {}).color || '#5ee6ff');
    field.appendChild(c);
    // 얼굴 클로즈업: 그림 좌표(56×64)의 얼굴 중심(약 54%, 31%)이 창 가운데 오도록 놓는다
    UI.$$('.cf-win', c).forEach(function (w, i) {
      var sp = UI.spriteEl(ids[i], G.Pixel.sheet(ids[i]).anims ? 2.9 : 4.2, true);   // 27단계 새 그림은 머리가 커서 덜 키운다
      if (!UI.holdPose(sp)) sp.classList.add('pose');
      w.appendChild(sp);
      var sw = sp.offsetWidth, sh = sp.offsetHeight, fc = sp._sheet.face || { x: 0.55, y: 0.31 };
      sp.style.left = Math.round(w.clientWidth / 2 - sw * fc.x) + 'px';
      sp.style.top = Math.round(w.clientHeight * 0.52 - sh * fc.y) + 'px';
    });
    SND.play(def.rarity === 'legendary' || def.duo ? 'big' : 'buff');
    setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 1100 / (G.speed || 1));
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
    // 22단계: 소모품 칸
    var ib = $('.item-bar'), ik = B.items.join(',') + B.canUseItem();
    if (ib._k !== ik) {
      ib.innerHTML = UI.itemBar(B.items, B.canUseItem(), (G.Data.itemEconomy || {}).slots);
      UI.$$('.item.usable', ib).forEach(function (btn) {
        btn.onclick = function () { if (B && B.canUseItem()) { selected = null; clearAim(); SND.play('buff'); B.useItem(+btn.getAttribute('data-i')); } };
      });
      ib._k = ik;
    }
    $('.endturn').disabled = B.phase !== 'player' || B.busy;
    var ub = $('.undo-btn');
    ub.style.display = B.opts.undo ? '' : 'none';
    ub.disabled = !B.canUndo();
    $('.skip-hint').hidden = B.phase !== 'enemy' || !!fastBase || B.over();
    renderKbdAim();
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
    // The PNG atlas includes long weapons; reserve room at the field's left edge.
    var first = heroesEl.querySelector('.sprite'), sh = first && first._sheet;
    heroesEl.style.paddingLeft = sh && sh.art ? 'calc(var(--px) * ' + Math.max(0, sh.w * sh.anchor - 16.5).toFixed(2) + ')' : '';
    var need = heroesEl.offsetWidth + monstersEl.offsetWidth + 48;
    var avail = field.clientWidth * 0.94;
    if (need > avail) {
      var k = Math.max(0.55, avail / need);
      field.style.setProperty('--px', (4 * k).toFixed(2) + 'px');
      field.style.setProperty('--uw', Math.floor(132 * k) + 'px');
    }
    // 40단계: PNG 그림은 늦게 불러져 위 계산 뒤에 넓어질 수 있다(적 4마리 · 넓은 몬스터에서 아군과 겹침).
    // 자리를 잡은 뒤 실제 위치를 다시 재서, 겹치면 양쪽 줄을 발밑 기준으로 함께 줄인다
    clearTimeout(fitField._t); clearTimeout(fitField._t2);
    fitField._t = setTimeout(unclash, 380);
    fitField._t2 = setTimeout(unclash, 1500);
  }
  // 그림(.sprite)은 유닛 칸 밖으로 삐져나올 수 있어 줄 상자가 아니라 그림의 실제 자리로 잰다
  function edge(root, right) {
    var v = right ? -1e9 : 1e9;
    UI.$$('.unit:not(.dead) .sprite, .unit:not(.dead) .hpbar', root).forEach(function (e) {
      var r = e.getBoundingClientRect();
      if (r.width) v = right ? Math.max(v, r.right) : Math.min(v, r.left);
    });
    return v;
  }
  function unclash() {
    if (!B || !heroesEl || !monstersEl) return;
    heroesEl.style.transform = monstersEl.style.transform = '';
    var gap = edge(monstersEl, false) - edge(heroesEl, true), want = 24;
    if (gap >= want) return;
    var total = heroesEl.offsetWidth + monstersEl.offsetWidth;
    var k = Math.max(0.6, (total - (want - gap)) / total);
    heroesEl.style.transformOrigin = '0 100%'; monstersEl.style.transformOrigin = '100% 100%';
    heroesEl.style.transform = monstersEl.style.transform = 'scale(' + k.toFixed(3) + ')';
  }

  function unitEl(u) {
    if (unitEls[u.uid]) return unitEls[u.uid];
    var e = UI.el('div', 'unit ' + u.side);
    e.innerHTML = '<div class="intent"></div>' + (u.side === 'ally' ? '<div class="incoming"></div>' : '') +
      '<div class="sprite-wrap"><div class="shadow"></div></div>' +
      '<div class="hpbar"><div class="ghost"></div><i></i><span></span><div class="blockbadge"></div></div>' + (u.side === 'ally' && u.resMax ? '<div class="resbar"></div>' : '') + '<div class="sts"></div><div class="uname"></div>';
    var sp = UI.spriteEl(u.side === 'ally' ? u.id : u.def.sprite, u.side === 'enemy' ? u.size || u.def.size : 1, true);
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
    // 21단계: 고유 자원 게이지(칸 수 = 최대치, 찬 칸은 캐릭터 자원 색)
    var rbar = e.querySelector('.resbar');
    if (rbar) {
      var rdef = u.def.resource, rk = u.res + '/' + u.resMax;
      if (rbar._k !== rk) {
        var pips = '';
        for (var ri = 0; ri < u.resMax; ri++) pips += '<i class="' + (ri < u.res ? 'on' : '') + '"></i>';
        rbar.innerHTML = '<b>' + rdef.name + '</b>' + pips;
        rbar.style.setProperty('--rc', rdef.color);
        rbar.classList.toggle('full', u.res >= u.resMax);
        rbar.setAttribute('data-tip', '<b>' + rdef.name + ' ' + u.res + '/' + u.resMax + '</b><br>' + U.esc(rdef.desc));
        rbar._k = rk;
      }
    }
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
      // 24단계: 색약 표기 — 행동 종류와 공격 대상 이름을 글자로
      html += '<span class="cb-lab">' + info.kinds.map(function (k) { return INTENT_NAME[k] || k; }).join('·') +
        (info.dmg != null && !info.all && info.target ? ' → ' + U.esc(info.target.name) : '') + '</span>';
      if (it._html !== html) { it.innerHTML = html; it._html = html; }
      it.className = 'intent k-' + main;
      it.style.display = '';
      it.setAttribute('data-tip', '<b>' + U.esc(info.name) + '</b>' + intentDesc(u));
    } else {
      it.style.display = 'none';
    }
  }

  var INTENT_NAME = { attack: '공격', block: '방어', buff: '강화', debuff: '약화', special: '특수' };
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
      // 24단계: 단축키 번호(1~9, 0)
      var hk = el.querySelector('.hk'), ki = hand.indexOf(inst);
      if (!hk) { hk = UI.el('i', 'hk'); el.appendChild(hk); }
      hk.textContent = ki < 10 ? String((ki + 1) % 10) : '';
      el.classList.toggle('selected', selected === inst);
      el.classList.toggle('frosted', !!inst.frosted);
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
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, el._castMs || 360);
      }
    });
    layoutHand();
  }

  // 부채꼴 배치. 마우스를 올린 카드는 크게 떠오르고 양옆 카드는 비켜 준다
  function layoutHand() {
    var hand = B.piles.hand, n = hand.length;
    var W = handEl.clientWidth, H = handEl.clientHeight;
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
        // 24단계: 쉬는 카드도 아래 효과 글이 화면 안에 들어오게 손패 바 바닥에 맞춘다
        el.style.top = (lifted ? -ch * 0.34 : Math.min(18, H - ch - 8) + d * d * 2.2) + 'px';
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
    selected = null; aimIdx = 0;
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
    if (UI.longPressed && !d.active) { handSig = ''; renderAll(); return; }   // 24단계: 길게 눌러 툴팁만 봤다
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
  // ================= 24단계: 단축키 =================
  // 1~9·0 카드 고르기(같은 번호를 다시 누르거나 Enter·Space 로 쓴다) · ←→/Tab 대상 바꾸기 · E 턴 종료 · Z 되돌리기 · L 기록 · Esc 취소
  var aimIdx = 0;
  function kbdTargets() { return selected && B && B.needsTarget(selected) ? B.validTargets(selected) : []; }
  function renderKbdAim() {
    UI.$$('.unit.kbd-aim', root).forEach(function (e) { e.classList.remove('kbd-aim'); });
    var ts = kbdTargets();
    if (!ts.length) return;
    var u = ts[((aimIdx % ts.length) + ts.length) % ts.length], e = u && unitEls[u.uid];
    if (e) e.classList.add('kbd-aim');
  }
  function confirmKbd() {
    if (!selected) return;
    var ts = kbdTargets();
    if (B.needsTarget(selected)) { if (ts.length) tryPlay(selected, ts[((aimIdx % ts.length) + ts.length) % ts.length]); }
    else tryPlay(selected, null);
  }
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { cancel(); toggleLog(false); return; }
    if (!B || !root || !root.classList.contains('on') || e.ctrlKey && e.key !== 'z' || e.altKey || e.metaKey) return;
    if (document.querySelector('#app > .modal') || /INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
    var k = e.key.toLowerCase();
    if (k === 'l') { toggleLog(); return; }
    if (B.phase !== 'player') { if (k === ' ' || k === 'enter') { e.preventDefault(); fastForward(); } return; }
    if (B.busy) return;
    if (/^[0-9]$/.test(k)) {
      var i = k === '0' ? 9 : +k - 1, inst = B.piles.hand[i];
      if (!inst) return;
      if (selected === inst) return confirmKbd();
      if (!B.canPlay(inst).ok) { flashCard(inst); return; }
      aimIdx = 0; select(inst);
      return;
    }
    if (k === 'arrowright' || k === 'arrowleft' || k === 'tab') {
      if (!kbdTargets().length) return;
      e.preventDefault();
      aimIdx += k === 'arrowleft' || (k === 'tab' && e.shiftKey) ? -1 : 1;
      renderKbdAim();
      return;
    }
    if (k === 'enter' || k === ' ') { e.preventDefault(); confirmKbd(); return; }
    if (k === 'e') { root.querySelector('.endturn').click(); return; }
    if (k === 'z') { e.preventDefault(); doUndo(); }
  });
  function doUndo() {
    if (!B || !B.canUndo()) return;
    selected = null; drag = null; clearAim();
    B.undo();
  }

  // ================= 24단계: 연출 빨리 감기 =================
  // 적의 턴·카드 연출 중에 전장을 누르면(또는 Space) 그 턴이 끝날 때까지 4배 빠르게
  var fastBase = 0;
  function fastForward() {
    if (fastBase || !B || B.over()) return;
    fastBase = G.speed || 1;
    G.speed = fastBase * 4;
    root.classList.add('fast');
    $('.skip-hint').hidden = true;
  }
  function endFast() {
    if (!fastBase) return;
    G.speed = fastBase; fastBase = 0;
    if (root) root.classList.remove('fast');
  }

  // ================= 24단계: 전투 기록 =================
  var logLines = [], logMark = 0, LOG_MAX = 400;
  function nm(u) { return u ? '<b class="' + (u.side === 'ally' ? 'ally' : 'enemy') + '">' + U.esc(u.name) + '</b>' : ''; }
  function addLog(html, cls) {
    logLines.push('<li class="' + (cls || '') + '">' + html + '</li>');
    if (logLines.length > LOG_MAX) { logLines.splice(0, logLines.length - LOG_MAX); logMark = Math.max(0, logMark - 1); }
    var el = root && root.querySelector('.battle-log');
    if (el && !el.hidden) drawLog();
  }
  function drawLog() {
    var el = root.querySelector('.battle-log'), ol = el.querySelector('ol');
    ol.innerHTML = logLines.join('');
    ol.scrollTop = ol.scrollHeight;
  }
  function clearLog() { logLines = []; logMark = 0; }
  function toggleLog(force) {
    var el = root && root.querySelector('.battle-log');
    if (!el) return;
    el.hidden = force == null ? !el.hidden : !force;
    if (!el.hidden) drawLog();
  }
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
  var monMove = null;   // 37단계: 지금 몬스터가 쓰는 행동 이름(타격음 고르기)

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

  // 화면(#app) 기준 사각형
  function appRect(r) { var a = document.getElementById('app').getBoundingClientRect(); return { x: r.left - a.left, y: r.top - a.top, w: r.width, h: r.height }; }
  function unitRect(u) { var e = unitEls[u.uid]; return e ? appRect(e._sprite.getBoundingClientRect()) : null; }
  function liveRects(list) { return list.filter(function (u) { return !u.dead; }).map(unitRect).filter(Boolean); }
  // 도트 연출이 향할 대상: 회복은 아군, 공격은 적
  function fxTargets(def, d) {
    if (def.type === 'heal') {
      if (def.target === 'allAllies' || def.target === 'allDowned') return liveRects(B.heroes);
      var h = d.target && d.target.side !== 'enemy' ? d.target : d.caster;
      return h ? [unitRect(h)].filter(Boolean) : liveRects(B.heroes);
    }
    if (def.type !== 'attack') return [];
    if (d.target) return [unitRect(d.target)].filter(Boolean);
    var foes = liveRects(B.monsters);
    if (def.target === 'randomEnemy' && foes.length) return [G.rng.pick(foes)];
    return foes;
  }
  // 카드를 전장 아래 가운데로 띄워 모은 뒤 부순다. 첫 타격까지의 시간(ms)을 돌려준다
  function castCard(el, d, key) {
    var def = d.inst.def, pal = G.PFX.palFor(key, cur.el), sc = 1.08;
    var hr = handEl.getBoundingClientRect(), fr = field.getBoundingClientRect();
    var cw = el.offsetWidth, ch = el.offsetHeight;
    var cx = fr.left + fr.width / 2, cy = hr.top - ch * sc * 0.5 + 6;
    var spd = G.speed || 1, gather = G.PFX.gatherMs(def.rarity) / spd;
    el.classList.remove('dragging', 'hovered');
    el.classList.add('flying', 'casting');
    el.style.setProperty('--cglow', G.PFX.glowOf(pal));
    el.style.left = cx - hr.left - cw / 2 + 'px';
    el.style.top = cy - hr.top - ch / 2 + 'px';
    el.style.transform = 'scale(' + sc + ')';
    el._castMs = gather + 160;
    setTimeout(function () { el.classList.add('burst'); }, gather);
    var hold = G.PFX.play({ key: key, pal: pal, rarity: def.rarity,
      card: appRect({ left: cx - cw * sc / 2, top: cy - ch * sc / 2, width: cw * sc, height: ch * sc }),
      hero: d.caster ? unitRect(d.caster) : null, targets: fxTargets(def, d) });
    return hold;
  }

  // 20단계: 카드 고르기 창. min~max장을 고르고 확인(0장이 허용되면 '고르지 않기')
  function pickOverlay(req) {
    var picked = [];
    var m = UI.modal('<h2>' + U.esc(req.title || '카드를 고른다') + '</h2><p class="dim pick-sub"></p><div class="row pick-cards"></div>' +
      '<div class="row" style="justify-content:center"><button class="btn gold ok"></button></div>', 'pickwin', true);
    var box = m.querySelector('.pick-cards'), ok = m.querySelector('.ok'), sub = m.querySelector('.pick-sub');
    var refresh = function () {
      var n = picked.length;
      ok.disabled = n < req.min || n > req.max;
      ok.textContent = n ? (req.verb || '확인') + ' (' + n + '장)' : req.min ? (req.verb || '확인') : '고르지 않기';
      sub.textContent = req.min === req.max ? req.max + '장을 고른다' : '0~' + req.max + '장을 고른다';
    };
    req.cards.forEach(function (inst) {
      var c = UI.cardEl(inst.def, { static: true });
      c.onclick = function () {
        var i = picked.indexOf(inst);
        if (i >= 0) picked.splice(i, 1);
        else { if (picked.length >= req.max) { if (req.max === 1) picked = []; else return; } picked.push(inst); }
        UI.$$('.card', box).forEach(function (x, j) { x.classList.toggle('selected', picked.indexOf(req.cards[j]) >= 0); });
        refresh();
      };
      box.appendChild(c);
    });
    ok.onclick = function () { if (ok.disabled) return; UI.closeModal(m); req.resolve(picked); };
    refresh();
  }

  function bindBus() {
    var on = G.bus.on;
    // 24단계: 전투 기록
    var ST = G.Data.statuses;
    on('battle:turn', function (d) {
      addLog(d.turn + '턴 · ' + (d.side === 'ally' ? '내 턴' : '적의 턴'), 'turn');
      if (d.side === 'ally') { endFast(); logMark = logLines.length; }
    });
    on('card:play', function (d) { addLog(nm(d.caster) + (d.caster ? ' ' : '') + '「' + U.esc(d.inst.def.name) + '」' + (d.target ? ' → ' + nm(d.target) : ''), 'card'); });
    on('monster:act', function (d) { addLog(nm(d.unit) + ' ' + U.esc(d.move && d.move.name || '행동'), 'act'); });
    on('monster:trigger', function (d) { addLog(nm(d.unit) + ' ' + U.esc(d.name), 'act'); });
    on('fx:hit', function (d) {
      var kind = d.kind === 'poison' ? ' (독)' : d.kind === 'burn' ? ' (화상)' : d.kind === 'thorns' ? ' (가시)' : d.kind === 'lose' ? ' (체력 잃음)' : '';
      if (d.amount > 0) addLog(nm(d.unit) + ' 피해 ' + d.amount + (d.crit ? ' 치명타' : '') + kind + (d.blocked ? ' · 막음 ' + d.blocked : ''), 'hit');
      else if (d.blocked > 0) addLog(nm(d.unit) + ' 막음 ' + d.blocked, 'blk');
    });
    // 37단계: 타격음은 무기 · 몬스터 행동 · 속성 · 피해 크기에 따라 고른다(data/sfx.js). 연달아 맞히면 음이 올라간다
    function hitSounds(d) {
      var enemy = !!(d.src && d.src.side === 'enemy');
      SND.forHit({ kind: d.kind, crit: d.crit, amount: d.amount, blocked: d.blocked, dodged: d.dodged, enemy: enemy, move: monMove,
        el: cur && !enemy ? cur.el : null, caster: d.src && d.src.side === 'ally' ? d.src : cur && cur.caster, streak: enemy ? 1 : hits })
        .forEach(function (x) { SND.play(x.name, { pitch: x.pitch }); });
    }
    on('fx:block', function (d) { addLog(nm(d.unit) + ' 보호막 +' + d.n, 'blk'); });
    on('fx:heal', function (d) { if (d.n > 0) addLog(nm(d.unit) + ' 회복 +' + d.n, 'heal'); });
    on('fx:status', function (d) { var st = ST[d.key]; if (st && d.n) addLog(nm(d.unit) + ' ' + U.esc(st.name) + ' ' + (d.n > 0 ? '+' : '') + d.n, st.kind === 'debuff' ? 'debuff' : 'buff'); });
    on('fx:death', function (d) { addLog(nm(d.unit) + ' 쓰러졌다', 'death'); });
    on('relic:trigger', function (d) { var r = d.id && G.Data.relicById[d.id]; if (r) addLog('유물 「' + U.esc(r.name) + '」', 'relic'); });
    on('item:use', function (d) { addLog('소모품 「' + U.esc(d.def.name) + '」', 'relic'); });
    on('battle:end', function (d) { endFast(); addLog(d.result === 'win' ? '승리' : '패배', 'turn'); });
    // 24단계: 턴 되돌리기 — 복제된 유닛·카드로 화면을 다시 만든다
    on('battle:undo', function () {
      logLines.length = logMark; addLog('— 이번 턴을 되돌렸다 —', 'turn');
      heroesEl.innerHTML = ''; monstersEl.innerHTML = ''; handEl.innerHTML = '';
      unitEls = {}; cardEls = {}; handSig = ''; fitSig = ''; aimIdx = 0;
      SND.play('draw');
    });
    on('battle:update', function () { renderAll(); });
    on('battle:turn', function (d) {
      banner(d.side === 'ally' ? '내 턴' : '적의 턴', d.side === 'ally' ? '' : 'enemy');
      if (d.side === 'ally') { hits = 0; showHits(); }
      $('.combo').classList.remove('on');
      SND.play('turn');
      handSig = '';
    });
    on('cards:draw', function () { SND.play('draw'); });
    // 20단계: 버리기·소멸·미리 보기에서 카드를 고른다
    on('pick:request', function (req) { req.handled = true; pickOverlay(req); });
    on('cards:discard', function () { SND.play('draw'); handSig = ''; });
    on('cards:exhaust', function () { handSig = ''; });
    // 16단계: 영웅·전설 카드 · 합동기 컷인 — 얼굴 클로즈업 + 카드 이름 + 대사
    on('card:cutin', function (d) { skillCutIn(d.def, d.caster); });
    on('card:play', function (d) {
      var def = d.inst.def;
      cur = { def: def, caster: d.caster, el: G.ArtCards.elementOf(def) };
      SND.play('play');
      var el = cardEls[d.inst.uid];
      // 18단계: 카드가 떠올라 빛나다 도트 조각으로 부서지고, 카드에 배정된 도트 연출이 이어진다(data/fx.js)
      var pkey = FX.low || !el ? null : G.PFX.keyFor(def, cur.el), pixel = pkey && pkey !== 'release';
      var gather = pkey ? G.PFX.gatherMs(def.rarity) / (G.speed || 1) : 140;
      if (pkey) d.hold = castCard(el, d, pkey);
      else if (el) {
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
        var ce = unitEls[d.caster.uid], magic = FX.MAGIC[cur.el];
        setTimeout(function () {
          // 27단계: 새 영웅 그림은 공격·스킬 동작(희귀 이상·합동기는 스킬)
          var big = def.rarity === 'rare' || def.rarity === 'epic' || def.rarity === 'legendary' || def.duo;
          if (!(ce && UI.playAnim(ce._sprite, big ? 'skill' : def.type === 'attack' ? 'attack' : 'skill'))) pulseClass(ce && ce._sprite, 'pose', 380);
          pulseClass(ce, def.type === 'attack' && !magic ? 'lunge-r' : 'hop', 330);
        }, pkey ? gather : 0);
        // 마법 공격: 무기 끝에서 탄이 포물선으로 날아간다 (도트 연출이 없을 때)
        if (def.type === 'attack' && magic && !pixel) {
          var from = tipPt(d.caster), colors = FX.colors(cur.el);
          var to = d.target ? [spritePt(d.target)] : def.target === 'allEnemies' ? pts(B.monsters) : [fieldCenter()];
          to.forEach(function (t) { FX.projectile(from, t, colors[0], null, { trail: colors[1], frames: 12 }); });
          FX.burst(from, { colors: colors, n: 8, speed: 1.2 });
        }
      }
      // 희귀 이상 카드의 고유 이펙트. 도트 연출이 맡은 공격·회복 카드는 겹치지 않게 생략한다
      if (def.sfx && !pixel) {
        var ctx = { from: d.caster ? tipPt(d.caster) : fieldCenter(), targets: d.target ? [spritePt(d.target)] : [],
          enemies: pts(B.monsters), allies: pts(B.heroes), center: fieldCenter(), el: cur.el };
        setTimeout(function () { FX.play(def.sfx, ctx); }, gather);
        SND.play(/dragon|explosion|meteor|quake|miracle/.test(def.sfx) ? 'big' : 'magic');
      } else if (pixel) SND.play(def.rarity === 'legendary' || /dragon|swords|roc|bloodBolt/.test(pkey) ? 'big' : 'magic');
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
    on('monster:act', function (d) { monMove = d.move && d.move.name; pulseClass(unitEls[d.unit.uid], 'lunge-l', 330); var me = unitEls[d.unit.uid]; if (me && me._sprite && me._sprite._asset) UI.playAnim(me._sprite, 'attack'); });   // 36단계: 리소스 몬스터는 공격 그림
    on('monster:summon', function (d) {
      renderUnit(d.unit); pulseClass(unitEls[d.unit.uid], 'summoned', 420);
      FX.burst(spritePt(d.unit), { colors: ['#c9a0ff', '#ffffff'], n: 16, speed: 2 });
    });
    on('monster:trigger', function (d) {
      FX.flash('#ff8a8a'); FX.shake(true); SND.play('big'); SND.play('phase');
      // 37단계: 정예 · 보스가 페이즈를 바꾸면 곡도 다음 페이즈로(빨라지고 변주 + 페이즈 층)
      if (G.Music && d.unit.def && d.unit.def.rank !== 'normal') G.Music.phase();
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
      var el = d.kind === 'poison' ? 'poison' : d.kind === 'burn' || d.kind === 'steam' ? 'fire' : d.kind === 'thorns' ? 'nature' :
        d.kind === 'lose' ? 'shadow' : d.src && d.src.side === 'enemy' ? 'monster' : cur ? cur.el : 'neutral';
      if (d.amount > 0) {
        var cls = d.crit ? 'crit' : d.kind === 'poison' ? 'poison' : d.kind === 'burn' ? 'burn' : '';
        float(d.unit, (d.crit ? '치명타! ' : '') + d.amount, cls);
        if (d.overkill > 0) setTimeout(function () { float(d.unit, '과잉 +' + d.overkill, 'over'); }, 120);
        if (d.unit.side === 'enemy' && !d.kind && (!d.src || d.src.side === 'ally')) { hits++; showHits(); }
        pulseClass(e._sprite, 'hit', 120);
        if (d.unit.side === 'ally' || (e._sprite && e._sprite._asset)) UI.playAnim(e._sprite, 'hit');
        pulseClass(e._sprite, 'stop', 90);
        pulseClass(e, d.unit.side === 'enemy' ? 'knock-r' : 'knock-l', 240);
        FX.impact(p, el, d.crit);
        if (d.amount >= 15 && !d.crit) FX.shake();
        hitSounds(d);
      } else if (d.blocked > 0) {
        float(d.unit, '막음 ' + d.blocked, 'block');
        FX.ring(p, '#8fc6ff', 30);
        hitSounds(d);
      } else if (d.dodged) hitSounds(d);
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
    on('fx:steam', function (d) { if (unitEls[d.unit.uid]) { FX.burst(spritePt(d.unit), { colors: ['#ffffff', '#bfefff', '#ff9a5a'], n: 22, speed: 2.6 }); FX.ring(spritePt(d.unit), '#bfefff', 40, { size: 2 }); } });   // 39단계
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
      var re = unitEls[d.unit.uid]; if (re && re._sprite && re._sprite._asset) { re._sprite.classList.remove('a-down'); UI.assetAnim(re._sprite, 'idle'); }   // 36단계
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
    root.querySelector('.undo-btn').addEventListener('click', doUndo);
    root.querySelector('.log-btn').addEventListener('click', function () { toggleLog(); });
    root.querySelector('.bl-close').addEventListener('click', function () { toggleLog(false); });
    root.querySelector('.debug-kill').addEventListener('click', function () { if (B && B.phase === 'player' && !B.busy) B.debugKillAll(); });
    root.querySelector('.field').addEventListener('click', function (e) {
      if (!B) return;
      if (B.phase === 'enemy' || (B.busy && !selected)) return fastForward();   // 24단계: 연출 빨리 감기
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
