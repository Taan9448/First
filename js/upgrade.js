// upgrade.js — 강화 카드 만들기(data/upgrades.js 의 규칙 + 예외 표)
// 강화 카드는 id 뒤에 '+'를 붙여 Game.Data.cardById 에 함께 등록한다('K01+'). 카드 목록(Data.cards)에는 넣지 않는다.
// 설명의 {+N} 은 강화로 바뀐 수치이고, upDmg 는 값이 바뀐 피해 효과의 순서({dN})다.
(function () {
  'use strict';
  var G = Game, D = G.Data;

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  // 숫자·범위·비례식의 기본값을 올린다. 바뀌지 않으면 null
  function scale(v, R) {
    var up = function (n) { return Math.max(n + R.minAdd, Math.ceil(n * (1 + R.pct))); };
    if (typeof v === 'number') return v > 0 ? up(v) : null;
    if (Array.isArray(v)) return [up(v[0]), up(v[1])];
    if (v && typeof v === 'object' && v.base > 0) return Object.assign({}, v, { base: up(v.base) });
    return null;
  }
  function addN(v, n) {
    if (typeof v === 'number') return v + n;
    if (Array.isArray(v)) return [v[0] + n, v[1] + n];
    return null;
  }
  // 값이 바뀐 숫자 쌍 목록(설명에서 바꿔 적을 것)
  function pairs(a, b) {
    if (a == null || b == null) return [];
    if (typeof a === 'number') return a !== b ? [[a, b]] : [];
    if (Array.isArray(a)) return pairs(a[0], b[0]).concat(pairs(a[1], b[1]));
    if (typeof a === 'object' && a.base !== b.base) return [[a.base, b.base]];
    return [];
  }

  // 설명에서 숫자 하나를 바꾼다. {…} 안은 건드리지 않는다. 앞쪽에 kw 가 있는 자리를 먼저 고른다
  function replaceNum(text, from, to, kw) {
    var re = /\{[^}]*\}|(\d+)/g, m, cands = [];
    while ((m = re.exec(text))) {
      if (m[1] && +m[1] === from && !/\d/.test(text[m.index + m[1].length] || '')) cands.push(m.index);
    }
    if (!cands.length) return null;
    var at = cands[0];
    if (kw) {
      var hit = cands.filter(function (i) { return kw.some(function (k) { return text.slice(Math.max(0, i - 8), i).indexOf(k) >= 0; }); });
      if (hit.length) at = hit[0];
    }
    return text.slice(0, at) + '{+' + to + '}' + text.slice(at + String(from).length);
  }

  function keywordsOf(e) {
    if (e.op === 'block') return ['보호막'];
    if (e.op === 'heal') return ['체력', '회복'];
    if (e.op === 'draw') return ['카드'];
    if (e.op === 'energy') return ['에너지'];
    if (e.op === 'gold') return ['골드'];
    if (e.op === 'status') {
      var s = D.statuses[e.status];
      return s ? [s.name.split('(')[0]] : [];
    }
    return null;
  }

  function walk(list, fn) {
    list.forEach(function (e) {
      fn(e);
      ['then', 'else'].forEach(function (k) { if (e[k]) walk(e[k], fn); });
      ['onHit', 'onCrit', 'onKill'].forEach(function (k) { if (e[k]) walk(e[k], fn); });
      if (e.op === 'oneOf') e.options.forEach(function (o) { walk(o.effects, fn); });
    });
  }
  function damageList(effects) {
    var out = [];
    (function w(list) {
      list.forEach(function (e) {
        if (e.op === 'damage') out.push(JSON.stringify(e.value));
        if (e.op === 'power') return;
        ['then', 'else'].forEach(function (k) { if (e[k]) w(e[k]); });
      });
    })(effects);
    return out;
  }

  // 자동 규칙: 반환 { effects, text, cost, changed }
  function auto(card) {
    var R = D.upgradeRules;
    var effects = clone(card.effects), text = card.text, cost = card.cost, changed = false;
    var labels = [];
    walk(effects, function (e) { if (e.op === 'oneOf') e.options.forEach(function (o) { labels.push(o); }); });

    // 1. 비용 3 카드와 지속 카드: 비용 -1
    if (typeof cost === 'number' && cost > 0 && (cost >= R.costDownAt || card.type === 'power')) {
      return { effects: effects, text: text, cost: cost - 1, changed: true };
    }

    // 아군에게 거는 디버프(수상한 물약의 중독 등)는 올리지 않는다
    var ALLY = ['ally', 'allAllies', 'self', 'lowestAlly', 'downedAlly'];
    var harmsAlly = function (e) {
      var s = D.statuses[e.status], tg = e.target || card.target;
      return e.status === 'randomDebuff' ? ALLY.indexOf(tg) >= 0 : s && s.kind === 'debuff' && ALLY.indexOf(tg) >= 0;
    };
    var edits = []; // [from, to, kw, effect, field, old]
    var bump = function (e, field, nv, kw) {
      var old = e[field];
      pairs(old, nv).forEach(function (p) { edits.push({ from: p[0], to: p[1], kw: kw, e: e, field: field, old: old }); });
      e[field] = nv;
    };
    // 2. 조건부의 두 갈래가 정확히 2배 관계면 그 관계를 지킨다
    var paired = [];
    walk(effects, function (e) {
      if (e.op !== 'if' || !e.then || !e.else || e.then.length !== 1 || e.else.length !== 1) return;
      var a = e.then[0], b = e.else[0];
      if (a.op !== b.op || ['damage', 'block', 'heal'].indexOf(a.op) < 0) return;
      if (typeof a.value !== 'number' || typeof b.value !== 'number' || a.value !== b.value * 2 || (a.times || 1) !== (b.times || 1)) return;
      var nb = scale(b.value, R);
      if (a.op !== 'damage') { bump(a, 'value', nb * 2, keywordsOf(a)); bump(b, 'value', nb, keywordsOf(b)); }
      else { a.value = nb * 2; b.value = nb; }
      paired.push(a, b);
    });
    // 3. 피해·보호막·회복·골드 +25%, 상태 +1
    walk(effects, function (e) {
      if (paired.indexOf(e) >= 0 || e.op === 'power') return;
      if (e.op === 'damage') {
        var nd = scale(e.value, R);
        if (!nd) return;
        // 비례식의 기본값은 설명에 숫자로 적혀 있다
        // ({d0} 으로 보이므로 설명에 없어도 그대로 둔다)
        if (typeof e.value === 'object' && !Array.isArray(e.value)) { bump(e, 'value', nd, ['피해']); edits[edits.length - 1].optional = true; } else e.value = nd;
      }
      else if (e.op === 'block' || e.op === 'heal' || e.op === 'gold') { var nv = scale(e.value, R); if (nv) bump(e, 'value', nv, keywordsOf(e)); }
      else if (e.op === 'status' && R.noStatusUp.indexOf(e.status) < 0 && !harmsAlly(e)) { var ns = addN(e.value, R.statusAdd); if (ns) bump(e, 'value', ns, keywordsOf(e)); }
    });
    // 지속 효과 안쪽은 바꾸지 않는다(지속 카드는 비용으로 강화)
    var dmgChanged = damageList(card.effects).join() !== damageList(effects).join();

    // 4. 설명에 반영. 찾지 못한 수치는 되돌린다
    edits.forEach(function (ed) {
      var t = replaceNum(text, ed.from, ed.to, ed.kw);
      if (t != null) { text = t; changed = true; return; }
      if (ed.optional) { changed = true; return; }
      ed.e[ed.field] = ed.old;
    });
    // 선택지 이름의 숫자도 바뀐 값으로
    labels.forEach(function (o) {
      o.effects.forEach(function (e) {
        var orig = null;
        edits.forEach(function (ed) { if (ed.e === e && e[ed.field] !== ed.old) orig = ed; });
        if (orig && typeof orig.from === 'number') o.label = o.label.replace(new RegExp('(^|\\D)' + orig.from + '(?!\\d)'), '$1' + orig.to);
      });
    });

    // 5. 조건 완화
    walk(effects, function (e) {
      if (e.op !== 'if' || !e.cond) return;
      var c = e.cond;
      R.ease.forEach(function (rule) {
        if (rule.is.indexOf(c.is) < 0 || rule.op !== c.op) return;
        var to;
        if (rule.from != null) { if (c.n !== rule.from) return; to = rule.to; }
        else { if (rule.min != null && c.n < rule.min) return; to = c.n + rule.step; }
        var a = rule.text[0].replace('{n}', c.n), b = rule.text[1].replace('{m}', '{+' + to + '}');
        if (rule.from != null) b = '{+' + rule.text[1].split(' ')[0] + '} ' + rule.text[1].split(' ').slice(1).join(' ');
        var idx = text.indexOf(a);
        if (idx < 0 || /\d/.test(text[idx - 1] || '')) return;
        text = text.slice(0, idx) + b + text.slice(idx + a.length);
        c.n = to;
        changed = true;
      });
    });

    if (dmgChanged) changed = true;

    // 6. 아무것도 바뀌지 않았으면 드로우 +1 (없으면 에너지 +1)
    if (!changed) {
      ['draw', 'energy'].some(function (op) {
        var found = [];
        walk(effects, function (e) { if (e.op === op && typeof e.value === 'number') found.push(e); });
        if (!found.length) return false;
        found.forEach(function (e) {
          var t = replaceNum(text, e.value, e.value + R.fallbackDraw, keywordsOf(e).concat(op === 'draw' ? ['장'] : []));
          if (t != null) { text = t; e.value += R.fallbackDraw; changed = true; }
        });
        return changed;
      });
    }
    return { effects: effects, text: text, cost: cost, changed: changed };
  }

  function build(card) {
    var ex = D.upgradeExceptions[card.id] || {};
    // 예외가 있으면 자동 규칙을 쓰지 않고 원래 카드 위에 예외 항목만 덮어쓴다
    var a = D.upgradeExceptions[card.id] ?
      { effects: clone(ex.effects || card.effects), text: ex.text || card.text, cost: card.cost, changed: !!(ex.effects || ex.text) } : auto(card);
    var u = Object.assign({}, card, {
      id: card.id + '+', base: card.id, upgraded: true, name: card.name + '+',
      effects: a.effects, text: a.text,
      cost: ex.cost != null ? ex.cost : a.cost,
      exhaust: ex.exhaust != null ? ex.exhaust : card.exhaust,
      changed: a.changed || ex.cost != null || ex.exhaust != null
    });
    if (u.exhaust !== card.exhaust && !ex.text) u.text = u.text.replace(/ ?소멸\./, '');
    var d0 = damageList(card.effects), d1 = damageList(u.effects);
    u.upDmg = d1.map(function (v, i) { return v !== d0[i]; });
    return u;
  }

  var Up = G.Upgrade = {
    // 'K01' → 'K01+' (강화 안 한 카드는 그대로)
    idOf: function (id, upgraded) { return upgraded && upgraded.indexOf(id) >= 0 ? id + '+' : id; },
    baseOf: function (id) { return String(id).replace(/\+$/, ''); },
    def: function (id) { return D.cardById[Up.baseOf(id) + '+']; },
    // 설명을 글자로(문서·테스트용): {+N} → N, {dN} → 피해 값
    plain: function (def) {
      var vals = damageList(def.effects).map(function (s) { return JSON.parse(s); });
      return def.text.replace(/\{d(\d)\}/g, function (_, i) {
        var v = vals[+i];
        if (Array.isArray(v)) return v[0] + '~' + v[1];
        if (v && typeof v === 'object') return v.base ? String(v.base) : 'X';
        return String(v);
      }).replace(/\{\+([^}]*)\}/g, '$1');
    },
    // 8장 표의 '강화' 열 문구: 비용이 바뀌면 "비용 N." 을 앞에 붙인다
    summary: function (id) {
      var base = D.cardById[id], u = Up.def(id);
      return (u.cost !== base.cost ? '비용 ' + u.cost + '. ' : '') + G.util.numJosa(Up.plain(u));
    },
    build: build
  };

  D.cards.forEach(function (c) {
    if (c.owner === 'none') return;
    D.cardById[c.id + '+'] = build(c);
  });
})();
