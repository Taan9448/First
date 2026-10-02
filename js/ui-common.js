// ui-common.js — 화면 전환, 카드 HTML, 툴팁, 키워드, 상태 아이콘, 창
(function () {
  'use strict';
  var G = Game, U = G.util, S = G.Status;

  var UI = G.UI = {
    $: function (sel, root) { return (root || document).querySelector(sel); },
    $$: function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); },
    el: function (tag, cls, html) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html != null) e.innerHTML = html;
      return e;
    },
    // 화면 전환: 이전 화면은 흐려지며 빠지고 새 화면이 떠오른다. 전투에 들어가고 나올 때는 대각선 띠가 쓸고 지나간다
    // 같은 화면을 다시 그릴 때는 제목(.topbar .title)이 바뀐 경우만 새 화면으로 친다(휴식 → 카드 강화 등)
    show: function (id) {
      var next = document.getElementById('screen-' + id), prev = UI.$('.screen.on');
      var titleEl = next.querySelector('.topbar .title'), key = titleEl ? titleEl.textContent : '';
      var fresh = prev !== next || next._key !== key;
      next._key = key;
      UI.$$('.screen').forEach(function (s) { s.classList.toggle('on', s === next); });
      if (fresh) {
        if (prev && prev !== next) {
          prev.classList.remove('enter');
          prev.classList.add('leave');
          clearTimeout(prev._lt);
          prev._lt = setTimeout(function () { prev.classList.remove('leave'); }, 300);
          if (id === 'battle' || prev.id === 'screen-battle') UI.wipe();
        }
        next.classList.remove('leave', 'enter');
        void next.offsetWidth;
        next.classList.add('enter');
        clearTimeout(next._et);
        next._et = setTimeout(function () { next.classList.remove('enter'); }, 1000);
      }
      UI.hideTip();
      if (id !== 'battle') UI.$$('.tut-layer').forEach(function (e) { e.parentNode.removeChild(e); });
      if (id !== 'reward' && id !== 'clear' && G.FX && G.FX.clear) G.FX.clear();
      if (G.Extra) G.Extra.refreshMenu();
    },
    wipe: function () {
      var w = document.getElementById('wipe');
      if (!w || (G.FX && G.FX.low)) return;
      w.classList.remove('run'); void w.offsetWidth; w.classList.add('run');
      clearTimeout(w._t);
      w._t = setTimeout(function () { w.classList.remove('run'); }, 950);
    },
    // 숫자가 바뀌면 통통 튄다
    setNum: function (el, v, cls) {
      if (!el) return;
      v = String(v);
      if (el.textContent === v) return;
      el.textContent = v;
      var t = cls ? el.closest(cls) || el : el;
      t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump');
    },
    iconStyle: function (id) { return 'background-image:url(' + G.Pixel.icon(id) + ')'; },
    icon: function (id, cls) { return '<i class="ico ' + (cls || '') + '" style="' + UI.iconStyle(id) + '"></i>'; }
  };

  // 색을 밝게(k>0)·어둡게(k<0)
  UI.shade = function (hex, k) {
    var n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    c = c.map(function (v) { return Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)); });
    return '#' + c.map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  };

  // ---------------- 유물 ----------------
  UI.relicTip = function (r) {
    return '<b>' + U.esc(r.name) + '</b> · ' + G.Data.RELIC_RARITY[r.rarity] + ' 유물<br>' + U.esc(r.desc);
  };
  UI.relicBar = function (ids) {
    return (ids || []).map(function (id) {
      var r = G.Data.relicById[id];
      if (!r) return '';
      return '<span class="relic r-' + r.rarity + '" data-relic="' + id + '" data-tip="' + UI.relicTip(r) + '"><i class="ico" style="' + UI.iconStyle(r.icon) + '"></i></span>';
    }).join('');
  };
  UI.relicTile = function (id, cls) {
    var r = G.Data.relicById[id];
    return '<button class="relic-tile ' + (r.rarity === 'boss' ? 'boss ' : '') + (cls || '') + '" data-id="' + id + '">' +
      '<i class="ico" style="' + UI.iconStyle(r.icon) + '"></i><div><b>' + U.esc(r.name) + '</b><small>' + G.Data.RELIC_RARITY[r.rarity] + ' 유물</small>' +
      '<span>' + U.esc(r.desc) + '</span></div></button>';
  };
  UI.flashRelic = function (id) {
    UI.$$('[data-relic="' + id + '"]').forEach(function (e) {
      e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash');
    });
  };

  // ---------------- 툴팁 ----------------
  var tipEl = null;
  UI.showTip = function (html, x, y) {
    tipEl = tipEl || document.getElementById('tip');
    tipEl.innerHTML = html;
    tipEl.style.display = 'block';
    var w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    var left = Math.min(x + 16, window.innerWidth - w - 8);
    var top = y + 18 + h > window.innerHeight ? y - h - 12 : y + 18;
    tipEl.style.left = Math.max(8, left) + 'px';
    tipEl.style.top = Math.max(8, top) + 'px';
  };
  UI.hideTip = function () { if (tipEl) tipEl.style.display = 'none'; };
  document.addEventListener('mousemove', function (e) {
    var t = e.target.closest && e.target.closest('[data-tip]');
    if (t) UI.showTip(t.getAttribute('data-tip'), e.clientX, e.clientY);
    else UI.hideTip();
  });

  // ---------------- 키워드 ----------------
  var kwRe = null;
  UI.keywordize = function (html) {
    if (!kwRe) {
      var names = Object.keys(G.Data.keywords).sort(function (a, b) { return b.length - a.length; });
      kwRe = new RegExp('(' + names.map(function (n) { return n.replace(/[()]/g, '\\$&'); }).join('|') + ')', 'g');
    }
    return html.replace(kwRe, function (m) {
      return '<b class="kw" data-tip="<b>' + m + '</b><br>' + U.esc(G.Data.keywords[m]) + '">' + m + '</b>';
    });
  };

  // ---------------- 카드 설명 ----------------
  function damageValues(def) {
    var list = [];
    (function walk(effects) {
      effects.forEach(function (e) {
        if (e.op === 'damage') list.push(e.value);
        if (e.op === 'power') return;
        ['then', 'else'].forEach(function (k) { if (e[k]) walk(e[k]); });
      });
    })(def.effects);
    return list;
  }

  // 설명의 {dN} 을 힘·약화가 반영된 값으로 바꾼다
  UI.cardText = function (def, battle, inst) {
    var vals = damageValues(def);
    var caster = battle && inst ? battle.casterOf(inst) : null;
    var mod = function (base) {
      if (!caster) return base;
      var d = base + S.get(caster, 'strength') + S.get(caster, 'tempStr');
      if (S.has(caster, 'weak')) d *= 0.75;
      return Math.max(0, Math.floor(d));
    };
    var fmt = function (base, upg) {
      var v = mod(base);
      var cls = v > base ? ' up' : v < base ? ' down' : upg ? ' upg' : '';
      return '<span class="num' + cls + '">' + v + '</span>';
    };
    var html = U.esc(def.text).replace(/\{d(\d)\}/g, function (_, i) {
      var v = vals[+i], upg = def.upDmg && def.upDmg[+i];
      if (Array.isArray(v)) return fmt(v[0], upg) + '~' + fmt(v[1], upg);
      if (typeof v === 'object') {
        if (!battle) return v.base ? fmt(v.base, upg) : 'X';
        var x = def.cost === 'X' ? battle.energy : 0;
        return fmt(battle.num(v, { src: caster, attacksBefore: battle.attacksThisTurn, x: x }, null), upg);
      }
      return fmt(v, upg);
    }).replace(/\{\+([^}]*)\}/g, '<span class="num upg">$1</span>');
    return U.numJosa(UI.keywordize(html));
  };

  // ---------------- 카드 요소 ----------------
  UI.cardEl = function (def, opts) {
    opts = opts || {};
    var school = def.school || 'neutral', lay = G.ArtCards.layoutOf(school);
    var c = UI.el('div', 'card r-' + def.rarity + ' t-' + def.type + ' sc-' + school + ' lay-' + lay + (opts.static ? ' static' : '') + (def.duo ? ' duo' : ''));
    var owner = G.Data.characters.filter(function (x) { return x.id === def.owner; })[0];
    var band = owner ? owner.color : '#8a93b8';
    if (def.duo) {
      var cs = def.duo.map(function (id) { return G.Data.characters.filter(function (x) { return x.id === id; })[0].color; });
      band = 'linear-gradient(90deg,' + cs[0] + ' 0 50%,' + cs[1] + ' 50% 100%)';
    }
    var plain = def.text.replace(/\{d\d\}/g, '00').replace(/\{\+([^}]*)\}/g, '$1');
    var len = plain.length;
    // 17단계: 무공 = 수묵 족자(등급은 아래 매듭 수), 그 밖 = 두 세계 분할(등급은 오른쪽 세로 별, 이름 아래 한 줄 정보)
    var who = owner ? owner.name : def.duo ? '합동기' : def.owner === 'common' ? '공용' : '';
    var nStar = G.RARITIES.indexOf(def.rarity) + 1, knots = '';
    for (var k = 0; k < nStar; k++) knots += '<i></i>';
    var rankHTML = lay === 'ink' ? '<div class="cknots">' + knots + '</div>' : UI.starsHTML(def.rarity);
    var subHTML = lay === 'split' ? '<div class="csub"><span>' + [G.SCHOOL_NAME[school], G.TYPE_NAME[def.type], who].filter(Boolean).join(' · ') + '</span></div>' : '';
    c.innerHTML = '<div class="cin">' +
      '<div class="cf"></div><div class="cart"></div>' + rankHTML + subHTML +
      '<div class="cband" style="background:' + band + '"></div>' +
      '<div class="ccost' + costCls(def.cost) + (def.upgraded && def.cost !== G.Data.cardById[def.base].cost ? ' upg' : '') + '"><span>' + (def.cost == null ? '' : def.cost) + '</span></div>' +
      (G.SCHOOL_NAME[school] ? '<div class="cschool"><span>' + G.SCHOOL_NAME[school] + '</span></div>' : '') +
      '<div class="cname' + (def.upgraded ? ' upg' : '') + (def.name.length >= 5 ? ' long' : '') + '"><span>' + U.esc(def.name) + '</span></div>' +
      '<div class="ctype"><span>' + (G.TYPE_NAME[def.type] || '') + '</span></div>' +
      '<div class="ctext' + (len > 62 ? ' xlong' : len > 44 ? ' long' : '') + '"><span>' + UI.cardText(def, opts.battle, opts.inst) + '</span></div>' +
      '<div class="ccond"><span>조건 충족</span></div><div class="cchain"></div></div>';
    if (opts.silhouette) c.classList.add('silhouette');
    var setImg = function (sel, url) { if (url) c.querySelector(sel).style.backgroundImage = 'url(' + url + ')'; };
    var f = G.ArtCards.frameCached(def.rarity, school), a = G.ArtCards.artCached(def);
    if (f) setImg('.cf', f); else G.ArtCards.frame(def.rarity, school).then(function (u) { setImg('.cf', u); });
    if (a) setImg('.cart', a); else G.ArtCards.art(def).then(function (u) { setImg('.cart', u); });
    c.setAttribute('data-tip', UI.cardTip(def));
    return c;
  };

  // 비용 보석 색(15단계): 0은 초록, X는 보라, 3 이상은 주황
  function costCls(cost) { return cost == null ? ' none' : cost === 'X' ? ' cx' : cost === 0 ? ' c0' : cost >= 3 ? ' c3' : ''; }
  UI.costCls = costCls;

  // 등급 별: 일반 1개 ~ 전설 5개(빈 칸은 흐리게)
  UI.starsHTML = function (rarity) {
    var n = G.RARITIES.indexOf(rarity) + 1;
    if (n <= 0) return '';
    var on = UI.iconStyle('star_' + rarity), html = '<div class="cstars" data-n="' + n + '">';
    for (var i = 1; i <= 5; i++) html += '<i class="' + (i <= n ? 'on' : 'off') + '" style="' + on + '"></i>';
    return html + '</div>';
  };

  UI.cardTip = function (def) {
    var owner = G.Data.characters.filter(function (x) { return x.id === def.owner; })[0];
    var who = owner ? owner.name : def.owner === 'common' ? '공용' : def.duo ? def.duo.map(function (id) {
      return G.Data.characters.filter(function (x) { return x.id === id; })[0].name; }).join('+') + ' 합동기' : '';
    var stars = G.RARITIES.indexOf(def.rarity) + 1;
    var sc = G.SCHOOL_NAME[def.school || 'neutral'];
    return '<b>' + U.esc(def.name) + '</b> · ' + (def.duo ? '합동기 ' : stars ? G.RARITY_NAME[def.rarity] + '(별 ' + stars + ') ' : '') + (sc ? sc + ' ' : '') + (G.TYPE_NAME[def.type] || '') +
      ' · ' + who +
      (def.exhaust ? ' · 소멸' : '') + (def.tags ? '<br><span style="color:#8a93b8">' + def.tags + '</span>' : '');
  };

  // 손패 카드의 비용·사용 가능·조건 충족 표시를 갱신한다
  UI.updateCard = function (el, inst, battle) {
    var cost = battle.costOf(inst);
    var costEl = el.querySelector('.ccost');
    costEl.firstChild.textContent = cost == null ? '' : cost;
    costEl.className = 'ccost' + costCls(cost) + (costEl.classList.contains('upg') ? ' upg' : '');
    costEl.classList.toggle('down', cost !== 'X' && cost != null && cost < inst.def.cost);
    costEl.classList.toggle('up', cost !== 'X' && cost != null && cost > inst.def.cost);
    var can = battle.canPlay(inst);
    el.classList.toggle('unplayable', !can.ok);
    el.classList.toggle('cond', can.ok && battle.condMet(inst) === true);
    // 연계 미리보기: 이어 쓰면 연계 수가 오르는 카드, 짝 연계가 발동하는 카드
    var cp = can.ok && battle.comboPreview ? battle.comboPreview(inst) : null;
    el.classList.toggle('chain', !!cp);
    el.classList.toggle('pairable', !!(cp && cp.pair));
    if (cp) el.querySelector('.cchain').textContent = cp.pair ? cp.pair.name : '연계 ' + cp.count;
    el.querySelector('.ctext span').innerHTML = UI.cardText(inst.def, battle, inst);
    var tip = UI.cardTip(inst.def) + (can.ok ? '' : '<br><span style="color:#ff8a8a">' + can.reason + '</span>');
    el.setAttribute('data-tip', tip);
    if (inst.temp && !el.querySelector('.ctemp')) el.appendChild(UI.el('div', 'ctemp', '<span>이번 턴만</span>'));
  };

  // ---------------- 상태 아이콘 ----------------
  UI.statusHTML = function (u) {
    return Object.keys(u.status).map(function (k) {
      var d = G.Data.statuses[k], n = u.status[k];
      if (!d) return '';
      var desc = d.desc.replace('{n}', n).replace('{p}', n * 10).replace('{h}', n * 0.5);
      return '<span class="st" data-tip="<b>' + d.name + '</b> ' + n + '<br>' + U.esc(desc) + '">' +
        '<i class="ico" style="' + UI.iconStyle(d.icon) + '"></i><b>' + n + '</b></span>';
    }).join('');
  };

  // ---------------- 스프라이트 ----------------
  // size: 배율(그림 1픽셀 = var(--px) × 0.5 × 배율) 또는 { h: 화면 높이 px, max } — 그 높이에 맞춘다(max 배율 이하)
  UI.spriteEl = function (spriteId, size) {
    var sh = G.Pixel.sheet(spriteId);
    var e = UI.el('div', 'sprite' + (sh.frames === 3 ? ' legacy' : ''));
    if (size && typeof size === 'object') size = Math.min(size.max || 99, size.h / (sh.h * 4));
    size = size || 1;
    e.style.backgroundSize = (sh.frames || 3) * 100 + '% 100%';
    e.style.animationDelay = '-' + (Math.random() * 1.2).toFixed(2) + 's';
    e.style.width = 'calc(var(--px) * ' + (sh.w * size) + ')';
    e.style.height = 'calc(var(--px) * ' + (sh.h * size) + ')';
    e.style.backgroundImage = 'url(' + sh.url + ')';
    // 몸 중심이 가운데 오도록 (공격 프레임의 무기 때문에 시트가 비대칭일 수 있다)
    e.style.left = 'calc(var(--px) * ' + ((0.5 - sh.anchor) * sh.w * size).toFixed(2) + ')';
    e._sheet = sh;
    e._size = size;
    return e;
  };

  // ---------------- 카드 기울기 ----------------
  // 마우스를 올린 카드는 마우스 쪽으로 기울고 빛이 따라 움직인다(모든 화면의 카드 공통)
  var tiltCard = null;
  function resetTilt(c) {
    c.classList.remove('tilting');
    ['--rx', '--ry', '--mx', '--my'].forEach(function (k) { c.style.removeProperty(k); });
  }
  document.addEventListener('pointermove', function (e) {
    var c = e.target.closest && e.target.closest('.card');
    if (c && (c.classList.contains('dragging') || c.classList.contains('flying') || c.classList.contains('silhouette'))) c = null;
    if (tiltCard && tiltCard !== c) { resetTilt(tiltCard); tiltCard = null; }
    if (!c || (G.FX && G.FX.low)) return;
    var r = c.getBoundingClientRect();
    var x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    c.style.setProperty('--ry', ((x - 0.5) * 24).toFixed(1) + 'deg');
    c.style.setProperty('--rx', ((0.5 - y) * 18).toFixed(1) + 'deg');
    c.style.setProperty('--mx', Math.round(x * 100) + '%');
    c.style.setProperty('--my', Math.round(y * 100) + '%');
    c.classList.add('tilting');
    tiltCard = c;
  });
  document.addEventListener('pointerleave', function () { if (tiltCard) { resetTilt(tiltCard); tiltCard = null; } });

  // ---------------- 창 ----------------
  // sticky: 바깥을 눌러도 닫히지 않는다(꼭 골라야 하는 창)
  UI.modal = function (html, cls, sticky) {
    var m = UI.el('div', 'modal ' + (cls || ''), '<div class="box pix">' + html + '</div>');
    document.getElementById('app').appendChild(m);
    if (!sticky) m.addEventListener('mousedown', function (e) { if (e.target === m) UI.closeModal(m); });
    return m;
  };
  UI.closeModal = function (m) { if (m && m.parentNode) m.parentNode.removeChild(m); };
})();
