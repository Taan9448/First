// ui-assets.js — 36단계: 리소스 확인 화면(index.html?assets=1). 필요한 그림마다 경로 · 권장 크기 · 투명 여부 · 지금 상태(리소스 / 코드 그림)를 보여 준다
// 사용자 · ChatGPT 가 무엇이 남았는지 보고, Claude 가 연결을 확인할 때 쓴다(게임 진행과 상관없음)
(function () {
  'use strict';
  var G = Game, UI = G.UI, U = G.util, D = G.Data;
  var group = null;
  G.AssetView = {
    open: function (g) {
      var list = G.Assets.expected();
      var groups = [];
      list.forEach(function (o) { if (groups.indexOf(o.group) < 0) groups.push(o.group); });
      group = g || group || groups[0];
      var root = document.getElementById('asset-view') || UI.el('div', '', '');
      root.id = 'asset-view';
      if (!root.parentNode) document.body.appendChild(root);
      var need = list.filter(function (o) { return o.need; }), haveN = need.filter(function (o) { return o.have; }).length;
      var tabs = groups.map(function (gname) {
        var gl = list.filter(function (o) { return o.group === gname; }), gn = gl.filter(function (o) { return o.need; });
        var base = gn.length ? gn : gl;   // 선택 그림만 있는 묶음은 전체 수로
        return '<button class="av-tab' + (gname === group ? ' on' : '') + '" data-g="' + gname + '">' + gname + ' <small>' + base.filter(function (o) { return o.have; }).length + '/' + base.length + (gn.length ? '' : ' 선택') + '</small></button>';
      }).join('');
      var rows = list.filter(function (o) { return o.group === group; });
      root.innerHTML = '<div class="av-head"><h1>리소스 확인</h1><p>필수 그림 ' + haveN + '/' + need.length + ' · 목록에 등록된 파일 ' + G.Assets.count() + '개' +
        (G.Assets.missing().length ? ' · <b class="bad">읽지 못한 파일 ' + G.Assets.missing().length + '</b>' : '') +
        ' · 규격은 docs/ASSET_SPEC.md, 요청서는 docs/IMAGE_REQUESTS.md. 새 그림을 올리면 node tools/sync-assets.js 로 목록을 다시 만든다.</p>' +
        '<a class="av-back" href="index.html">게임으로</a></div><div class="av-tabs">' + tabs + '</div>' +
        '<table class="av-table"><thead><tr><th>미리 보기</th><th>대상</th><th>파일(확장자 .png · .jpg · .webp)</th><th>권장 크기</th><th>투명</th><th>구분</th><th>상태</th></tr></thead><tbody>' +
        rows.map(function (o, i) {
          return '<tr class="' + (o.have ? 'have' : '') + '"><td class="av-pv" data-i="' + i + '"></td><td><b>' + U.esc(o.label) + '</b>' + (o.desc ? '<br><small>' + U.esc(String(o.desc).slice(0, 90)) + '</small>' : '') + '</td>' +
            '<td><code>assets/' + o.base + '</code></td><td>' + (o.size ? o.size.join('×') : '시안에 따라') + '</td><td>' + (o.alpha ? '투명' : '—') + '</td><td>' + (o.need ? '필수' : '선택') + '</td>' +
            '<td>' + (o.have ? '<b class="ok">리소스</b>' : '<span class="dim">코드 그림</span>') + '</td></tr>';
        }).join('') + '</tbody></table>';
      UI.$$('.av-tab', root).forEach(function (b) { b.onclick = function () { G.AssetView.open(b.getAttribute('data-g')); }; });
      // 미리 보기: 리소스가 있으면 그것, 없으면 지금 게임에 보이는 코드 그림
      UI.$$('.av-pv', root).forEach(function (td) {
        var o = rows[+td.getAttribute('data-i')], el = null;
        try {
          if (o.kind === 'heroPose' || o.kind === 'monsterPose') {
            var mon = D.monsterById[o.id];
            el = UI.spriteEl(mon ? mon.sprite : o.id, { h: 72, max: 1 });
            if (el._art && el._sheet.anims[o.pose]) {
              UI.holdPose(el);
              el._fixed = el._sheet.anims[o.pose].start;
            } else if (o.pose && o.pose !== 'idle') UI.playAnim(el, o.pose === 'down' ? 'hit' : o.pose);
          } else if (o.kind === 'portrait' || o.kind === 'face') el = UI.portraitEl(o.id) || UI.spriteEl(o.id, { h: 72, max: 1 });
          else if (o.kind === 'cardArt' && D.cardById[o.id]) { el = UI.cardEl(D.cardById[o.id], { static: true }); el.classList.add('mini'); }
          else if (o.kind === 'icon') el = UI.el('i', 'ico', ''), el.setAttribute('style', UI.iconStyle(o.id));
          else if (o.kind === 'relic' && D.relicById[o.id]) el = UI.el('i', 'ico', ''), el.setAttribute('style', UI.relicStyle(D.relicById[o.id]));
          else if (o.kind === 'item' && D.itemById[o.id]) el = UI.el('i', 'ico', ''), el.setAttribute('style', UI.itemStyle(D.itemById[o.id]));
          else if (o.kind === 'bgBattle') { el = UI.el('div', 'av-bg'); G.Art.scene(o.id === 'mirror' ? 'castle' : o.id).then(function (u) { if (u) el.style.backgroundImage = 'url(' + u + ')'; }); }
          else if (o.kind === 'worldMap') { el = UI.el('div', 'av-bg'); G.ArtMap.world().then(function (u) { if (u) el.style.backgroundImage = 'url(' + u + ')'; }); }
          else if (o.have) { el = UI.el('div', 'av-bg'); el.style.backgroundImage = 'url(' + G.Assets.url(G.Assets.find(o.base)) + ')'; }
        } catch (e) { el = null; }
        if (el) td.appendChild(el);
      });
    }
  };
})();
