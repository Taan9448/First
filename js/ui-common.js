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
    show: function (id) {
      UI.$$('.screen').forEach(function (s) { s.classList.toggle('on', s.id === 'screen-' + id); });
      UI.hideTip();
    },
    iconStyle: function (id) { return 'background-image:url(' + G.Pixel.icon(id) + ')'; },
    icon: function (id, cls) { return '<i class="ico ' + (cls || '') + '" style="' + UI.iconStyle(id) + '"></i>'; }
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
    var fmt = function (base) {
      var v = mod(base);
      var cls = v > base ? ' up' : v < base ? ' down' : '';
      return '<span class="num' + cls + '">' + v + '</span>';
    };
    var html = U.esc(def.text).replace(/\{d(\d)\}/g, function (_, i) {
      var v = vals[+i];
      if (Array.isArray(v)) return fmt(v[0]) + '~' + fmt(v[1]);
      if (typeof v === 'object') {
        if (!battle) return v.base ? String(v.base) : 'X';
        var x = def.cost === 'X' ? battle.energy : 0;
        return fmt(battle.num(v, { src: caster, attacksBefore: battle.attacksThisTurn, x: x }, null));
      }
      return fmt(v);
    });
    return UI.keywordize(html);
  };

  // ---------------- 카드 요소 ----------------
  UI.cardEl = function (def, opts) {
    opts = opts || {};
    var c = UI.el('div', 'card r-' + def.rarity + (opts.static ? ' static' : ''));
    var owner = G.Data.characters.filter(function (x) { return x.id === def.owner; })[0];
    var plain = def.text.replace(/\{d\d\}/g, '00');
    var len = plain.length;
    c.innerHTML =
      '<div class="cf"></div><div class="cart"></div>' +
      '<div class="cband" style="background:' + (owner ? owner.color : '#8a93b8') + '"></div>' +
      '<div class="ccost"><span>' + (def.cost == null ? '' : def.cost) + '</span></div>' +
      '<div class="cname"><span>' + U.esc(def.name) + '</span></div>' +
      '<div class="ctype"><span>' + (G.TYPE_NAME[def.type] || '') + '</span></div>' +
      '<div class="ctext' + (len > 62 ? ' xlong' : len > 44 ? ' long' : '') + '"><span>' + UI.cardText(def, opts.battle, opts.inst) + '</span></div>' +
      '<div class="ccond"><span>조건 충족</span></div>';
    if (opts.silhouette) c.classList.add('silhouette');
    var setImg = function (sel, url) { if (url) c.querySelector(sel).style.backgroundImage = 'url(' + url + ')'; };
    var f = G.ArtCards.frameCached(def.rarity), a = G.ArtCards.artCached(def);
    if (f) setImg('.cf', f); else G.ArtCards.frame(def.rarity).then(function (u) { setImg('.cf', u); });
    if (a) setImg('.cart', a); else G.ArtCards.art(def).then(function (u) { setImg('.cart', u); });
    c.setAttribute('data-tip', UI.cardTip(def));
    return c;
  };

  UI.cardTip = function (def) {
    var owner = G.Data.characters.filter(function (x) { return x.id === def.owner; })[0];
    return '<b>' + U.esc(def.name) + '</b> · ' + G.RARITY_NAME[def.rarity] + ' ' + (G.TYPE_NAME[def.type] || '') +
      ' · ' + (owner ? owner.name : def.owner === 'common' ? '공용' : '') +
      (def.exhaust ? ' · 소멸' : '') + (def.tags ? '<br><span style="color:#8a93b8">' + def.tags + '</span>' : '');
  };

  // 손패 카드의 비용·사용 가능·조건 충족 표시를 갱신한다
  UI.updateCard = function (el, inst, battle) {
    var cost = battle.costOf(inst);
    var costEl = el.querySelector('.ccost');
    costEl.firstChild.textContent = cost == null ? '' : cost;
    costEl.classList.toggle('down', cost !== 'X' && cost != null && cost < inst.def.cost);
    costEl.classList.toggle('up', cost !== 'X' && cost != null && cost > inst.def.cost);
    var can = battle.canPlay(inst);
    el.classList.toggle('unplayable', !can.ok);
    el.classList.toggle('cond', can.ok && battle.condMet(inst) === true);
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
  UI.spriteEl = function (spriteId, size) {
    var sh = G.Pixel.sheet(spriteId);
    var e = UI.el('div', 'sprite');
    size = size || 1;
    e.style.width = 'calc(var(--px) * ' + (sh.w * size) + ')';
    e.style.height = 'calc(var(--px) * ' + (sh.h * size) + ')';
    e.style.backgroundImage = 'url(' + sh.url + ')';
    // 몸 중심이 가운데 오도록 (공격 프레임의 무기 때문에 시트가 비대칭일 수 있다)
    e.style.left = 'calc(var(--px) * ' + ((0.5 - sh.anchor) * sh.w * size).toFixed(2) + ')';
    e._sheet = sh;
    e._size = size;
    return e;
  };

  // ---------------- 창 ----------------
  UI.modal = function (html, cls) {
    var m = UI.el('div', 'modal ' + (cls || ''), '<div class="box pix">' + html + '</div>');
    document.getElementById('app').appendChild(m);
    m.addEventListener('mousedown', function (e) { if (e.target === m) UI.closeModal(m); });
    return m;
  };
  UI.closeModal = function (m) { if (m && m.parentNode) m.parentNode.removeChild(m); };
})();
