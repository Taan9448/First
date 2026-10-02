// ui-dungeon.js — 던전 지도(14단계): 진행 중인 스테이지를 낡은 양피지 지도로 그린다.
// 방은 들어가 보거나 정찰하기 전까지 '?'로 가려지고, 지금 방 둘레만 횃불처럼 밝다. 갈 수 있는 방을 눌러 고른다.
(function () {
  'use strict';
  var G = Game, UI = G.UI, D = G.Data, St = G.Stage;

  var ICON = { battle: 'attack', elite: 'elite', event: 'event', treasure: 'chest', rest: 'campfire', shop: 'shop', boss: 'crown', midboss: 'crown', final: 'crown' };
  var SPECIAL = { entrance: '입구', camp: '야영지', midboss: '결전의 방', boss: '' };
  var COLW = 104, PADL = 120, PADR = 120, PX = 3; // COLW: 열 간격 최솟값(16단계: 열이 적으면 틀 너비에 맞춰 넓힌다). PX: 양피지 도트 한 칸의 화면 크기
  var revealed = ''; // 정찰로 드러난 방의 연출은 한 번만

  function modName(id) {
    if (SPECIAL[id] != null) return SPECIAL[id];
    var m = (D.pathModules || []).filter(function (x) { return x.id === id; })[0];
    return m ? m.name : '';
  }
  // 방 위치: 열마다 세로로 고르게 펼치고, 손으로 그린 지도처럼 조금씩 어긋나게(열·레인으로 정해지는 값)
  function jitter(c, i, k) { var v = Math.sin((c + 1) * 12.9898 + (i + 1) * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v) - 0.5; }
  function layout(map, H, cw) {
    var gap = Math.min(116, (H - 150) / 3);
    return map.map(function (col, c) {
      return col.map(function (_, i) {
        var big = col.length === 1 && c === map.length - 1;
        return {
          x: PADL + c * cw + (big ? 18 : Math.round(jitter(c, i, 1) * Math.min(28, cw * 0.17))),
          y: Math.round(H / 2 + 8 + (i - (col.length - 1) / 2) * gap + (col.length > 1 ? jitter(c, i, 2) * 16 : 0))
        };
      });
    });
  }

  // 방의 상태: done(지나온 방) now(지금 방) can(고를 수 있는 방) skip(지나쳐 버린 방) far(멀리 안개 속) known/unk
  function roomState(r, c, i, can) {
    var picked = r.path[c];
    if (c < r.col) return picked === i ? 'done' : 'skip';
    if (c === r.col) return picked === i ? 'now' : picked != null ? 'skip' : can.indexOf(i) >= 0 ? 'can' : 'skip';
    return c > r.col + 3 ? 'far' : '';
  }

  // frame 안에 지도를 그린다. onPick(j): 방을 고른 뒤, onEnter: 지금 방에 들어간다
  function render(frame, opts) {
    var r = St.data.run, map = r.map;
    var H = Math.max(380, frame.clientHeight - 12);
    var cw = Math.max(COLW, Math.floor((frame.clientWidth - 4 - PADL - PADR) / Math.max(1, map.length - 1)));
    var W = PADL + (map.length - 1) * cw + PADR;
    var pos = layout(map, H, cw), can = r.path[r.col] == null ? St.choiceIdx() : [];
    // 횃불: 고른 방, 아직 고르지 않았으면 앞 방(처음이면 입구)
    var torchC = r.path[r.col] != null ? r.col : r.col - 1;
    var torch = torchC >= 0 ? pos[torchC][r.path[torchC]] : { x: PADL - 70, y: H / 2 + 8 };

    // 통로
    var lines = '', glow = '';
    map.forEach(function (col, c) {
      col.forEach(function (nd, i) {
        (nd.next || []).forEach(function (j) {
          var a = pos[c][i], b = pos[c + 1][j];
          var walked = r.path[c] === i && r.path[c + 1] === j && c + 1 <= r.col;
          var open = c === r.col - 1 && r.path[c] === i && can.indexOf(j) >= 0;
          var dead = c < r.col && !walked;
          var seg = 'x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"';
          if (walked) glow += '<line ' + seg + ' class="cw-gold-b"/><line ' + seg + ' class="cw-gold"/>';
          else if (open) glow += '<line ' + seg + ' class="cw-open-b"/><line ' + seg + ' class="cw-open"/>';
          else lines += '<line ' + seg + ' class="cw-ink' + (dead ? ' dead' : '') + '"/>';
        });
      });
    });
    var entry = pos[0].map(function (p) {
      var seg = 'x1="' + (PADL - 70) + '" y1="' + (H / 2 + 8) + '" x2="' + p.x + '" y2="' + p.y + '"';
      var walked = r.path[0] != null && pos[0][r.path[0]] === p;
      return walked ? '<line ' + seg + ' class="cw-gold-b"/><line ' + seg + ' class="cw-gold"/>' : r.col === 0 && can.length ? '<line ' + seg + ' class="cw-open-b"/><line ' + seg + ' class="cw-open"/>' : '<line ' + seg + ' class="cw-ink"/>';
    }).join('');
    // 구역 경계·이름(지도에 먹으로 적힌 글씨)
    var marks = '', labels = '';
    map.forEach(function (col, c) {
      var m = col[0].module;
      if (c > 0 && m !== map[c - 1][0].module) {
        var bx = PADL + (c - 0.5) * cw;
        marks += '<line x1="' + bx + '" y1="40" x2="' + bx + '" y2="' + (H - 40) + '" class="cw-border"/>';
      }
      if (c === 0 || m !== map[c - 1][0].module) {
        var name = modName(m);
        if (name) labels += '<div class="dmod" style="left:' + (PADL + c * cw - 30) + 'px">' + name + '</div>';
      }
    });

    var html = '<div class="dg-scroll"><div class="dg-map" style="width:' + W + 'px;height:' + H + 'px">' +
      '<div class="dg-parch"></div>' +
      '<svg class="dg-ways" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" shape-rendering="crispEdges">' + marks + lines + entry + glow + '</svg>' +
      '<div class="dg-dark" style="--tx:' + torch.x + 'px;--ty:' + torch.y + 'px"></div>' + labels +
      '<div class="dg-door" style="left:' + (PADL - 70) + 'px;top:' + (H / 2 + 8) + 'px">' + UI.icon('door') + '<small>입구</small></div>' +
      '<div class="dg-rooms"></div><div class="dg-token"></div></div></div>' +
      '<div class="dg-legend">' + ['battle', 'elite', 'event', 'treasure', 'rest', 'shop'].map(function (t) {
        return '<span>' + UI.icon(ICON[t]) + D.NODE_NAME[t] + '</span>';
      }).join('') + '<span>' + UI.icon('unknown') + '미지</span></div>';
    frame.innerHTML = html;
    frame.classList.add('dungeon');
    var parch = frame.querySelector('.dg-parch');
    parch.style.backgroundImage = 'url(' + G.ArtMap.parchment(Math.ceil(W / PX), Math.ceil(H / PX), 7 + r.stage * 13) + ')';

    // 방
    var box = frame.querySelector('.dg-rooms');
    var revealKey = r.stage + ':' + r.col + ':' + (r.scouted || []).join(','), doReveal = revealed !== revealKey;
    revealed = revealKey;
    map.forEach(function (col, c) {
      col.forEach(function (nd, i) {
        var st = roomState(r, c, i, can), last = c === map.length - 1, mid = nd.type === 'midboss';
        var known = nd.known || st === 'done' || st === 'now';
        var icon = st === 'done' ? 'check' : known ? ICON[nd.type] : 'unknown';
        var tip = known ? D.NODE_NAME[nd.type] + (nd.squad ? ' (정예 무리)' : '') : '미지의 방 — 들어가 보기 전에는 알 수 없다';
        if (st === 'done') tip = '지나온 방 · ' + D.NODE_NAME[nd.type];
        var cls = 'droom t-' + (known ? nd.type : 'unk') + (st ? ' ' + st : '') + (known ? ' known' : ' unk') + (last ? ' boss' : mid ? ' mid' : '');
        if (doReveal && c === r.col + 1 && r.path[r.col] != null && (r.scouted || []).indexOf(i) >= 0) cls += ' reveal';
        var b = UI.el('button', cls, '<i class="ico" style="' + UI.iconStyle(icon) + '"></i>');
        b.style.left = pos[c][i].x + 'px'; b.style.top = pos[c][i].y + 'px';
        b.setAttribute('data-tip', tip);
        if (last) {
          var bid = nd.monsters && nd.monsters[0], seen = bid && (St.data.codex.monsters[bid] || r.stage <= St.data.clearedStage);
          b.insertAdjacentHTML('beforeend', '<small>' + (seen ? D.monsterById[bid].name : D.NODE_NAME[nd.type]) + '</small>');
        }
        if (st === 'can') b.onclick = function () { if (!frame.dataset.dragged) opts.onPick(i); };
        else if (st === 'now') b.onclick = function () { if (!frame.dataset.dragged) opts.onEnter(); };
        else b.tabIndex = -1;
        box.appendChild(b);
      });
    });

    // 파티 말: 횃불 자리에 선다
    var token = frame.querySelector('.dg-token');
    token.appendChild(UI.spriteEl(St.data.party[0] || 'kai', 0.6));
    token.style.left = torch.x + 'px'; token.style.top = (torch.y - 30) + 'px';

    // 가로 스크롤: 지금 자리가 왼쪽 1/3쯤 오게. 휠은 가로로, 끌어서 움직일 수도 있다
    var sc = frame.querySelector('.dg-scroll');
    sc.scrollLeft = Math.max(0, torch.x - sc.clientWidth * 0.35);
    sc.onwheel = function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { sc.scrollLeft += e.deltaY; e.preventDefault(); }
    };
    var drag = null;
    sc.onpointerdown = function (e) { if (e.button === 0) drag = { x: e.clientX, s: sc.scrollLeft, moved: false }; delete frame.dataset.dragged; };
    sc.onpointermove = function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6) { drag.moved = true; frame.dataset.dragged = '1'; sc.classList.add('grab'); }
      if (drag.moved) sc.scrollLeft = drag.s - dx;
    };
    sc.onpointerup = sc.onpointerleave = function () {
      drag = null; sc.classList.remove('grab');
      setTimeout(function () { delete frame.dataset.dragged; }, 0);
    };
  }

  // 이번 스테이지의 탐사 상황(옆 패널용)
  function summary() {
    var r = St.data.run, map = r.map, known = 0, total = 0;
    map.forEach(function (col, c) { col.forEach(function (nd) { if (c > r.col) { total++; if (nd.known) known++; } }); });
    return { depth: Math.min(r.col + 1, map.length), total: map.length, ahead: total, known: known };
  }

  G.DungeonMap = { render: render, summary: summary, ICON: ICON };
})();
