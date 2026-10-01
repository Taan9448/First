// ui-story.js — 스토리(13단계): 대화 장면(배경 + 양쪽 큰 도트 초상 + 한 글자씩 나오는 대사),
// 스테이지를 시작할 때의 장 제목 카드, 로비의 스토리 다시 보기 화면
(function () {
  'use strict';
  var G = Game, UI = G.UI, D = G.Data, U = G.util;
  var Meta = G.Meta, St = G.Stage;

  var KIND_NAME = { prologue: '시작', intro: '도입', boss: '결전', mid: '옛 단장', midout: '작별', outro: '결말', epilogue: '에필로그', ascend: '승천' };
  function screen() { return document.getElementById('screen-story'); }
  function hero(id) { return D.characters.filter(function (c) { return c.id === id; })[0]; }
  function nameOf(id) { var h = hero(id); return h ? h.name : D.monsterById[id] ? D.monsterById[id].name : id; }
  function colorOf(id) { var h = hero(id); return h ? h.color : '#ff8a96'; }
  function chapterOf(sc) { return (D.story || []).filter(function (c) { return c.n === sc.chapter; })[0]; }
  function theme(t) { return t === 'mirror' ? 'castle' : t; }
  function SND(k) { if (G.Audio) G.Audio.play(k); }

  // 영웅은 정해진 배율, 몬스터는 화면 높이에 맞춘다
  function portrait(id, flip) {
    var sp = hero(id) ? UI.spriteEl(id, 3) : UI.spriteEl(D.monsterById[id] ? D.monsterById[id].sprite : id, { h: 340, max: 2.6 });
    if (flip) sp.style.transform = 'scaleX(-1)';
    return sp;
  }

  // ================= 대화 장면 =================
  // sc: 장면 또는 id, done: 끝나면 부를 함수, opts.replay: 다시 보기(본 것으로 표시하지 않음)
  Meta.scene = function (sc, done, opts) {
    if (typeof sc === 'string') sc = D.storyById[sc];
    if (!sc) return done();
    opts = opts || {};
    if (!opts.replay && sc.kind !== 'ascend') St.markStory(sc.id); // 먼저 표시해 두어 같은 장면이 되풀이되지 않게 한다
    var el = screen(), ch = chapterOf(sc);
    var head = sc.kind === 'ascend' ? ['ASCENSION', '승천 원정 · 승천 ' + St.ascLevel()] : [(ch ? ch.en : 'STORY') + ' · ' + (KIND_NAME[sc.kind] || ''), ch ? ch.title : ''];
    el.innerHTML = '<div class="st-bg"></div><div class="st-shade"></div><div class="st-bar top"></div><div class="st-bar bot"></div>' +
      '<div class="st-head"><small>' + head[0] + '</small><b>' + head[1] + '</b></div>' +
      '<div class="st-ctrl"><button class="btn small ghost auto">자동</button><button class="btn small ghost skip">건너뛰기</button></div>' +
      '<div class="st-left"></div><div class="st-right"></div>' +
      '<div class="st-box frame"><div class="st-name"></div><p class="st-text"></p><i class="st-more"></i><span class="st-count"></span></div>';
    G.Art.scene(theme(sc.bg || 'forest')).then(function (u) { if (u) el.querySelector('.st-bg').style.backgroundImage = 'url(' + u + ')'; });
    var left = el.querySelector('.st-left'), right = el.querySelector('.st-right'), box = el.querySelector('.st-box');
    var nameEl = el.querySelector('.st-name'), textEl = el.querySelector('.st-text'), countEl = el.querySelector('.st-count');
    var leftId = null;
    var firstHero = (sc.lines.filter(function (l) { return hero(l[0]) && l[0] !== sc.right; })[0] || [])[0];
    var setLeft = function (id) {
      if (!id || id === leftId) return;
      leftId = id;
      left.innerHTML = '';
      left.appendChild(portrait(id, false));
      left.classList.remove('in'); void left.offsetWidth; left.classList.add('in');
    };
    if (firstHero) setLeft(firstHero);
    if (sc.right) right.appendChild(portrait(sc.right, !!hero(sc.right)));
    right.style.display = sc.right ? '' : 'none';

    var i = -1, typing = null, full = '', shown = 0, autoOn = false, autoT = null, ended = false;
    var finishType = function () { if (typing) { clearInterval(typing); typing = null; } textEl.textContent = full; box.classList.add('done'); queueAuto(); };
    var queueAuto = function () {
      clearTimeout(autoT);
      if (autoOn && !typing) autoT = setTimeout(next, 1400 + full.length * 35);
    };
    var next = function () {
      if (ended) return;
      clearTimeout(autoT);
      if (typing) return finishType();
      i++;
      if (i >= sc.lines.length) return end();
      var who = sc.lines[i][0];
      full = sc.lines[i][1]; shown = 0;
      box.classList.toggle('narr', who === 'narr');
      box.classList.remove('done');
      if (who === 'narr') { nameEl.textContent = ''; nameEl.style.display = 'none'; }
      else { nameEl.style.display = ''; nameEl.textContent = nameOf(who); nameEl.style.setProperty('--nc', colorOf(who)); }
      if (who !== 'narr' && who !== sc.right && hero(who)) setLeft(who);
      left.classList.toggle('speak', who !== 'narr' && who !== sc.right);
      right.classList.toggle('speak', who === sc.right);
      el.classList.toggle('narrating', who === 'narr');
      countEl.textContent = (i + 1) + '/' + sc.lines.length;
      textEl.textContent = '';
      typing = setInterval(function () {
        shown += 1;
        textEl.textContent = full.slice(0, shown);
        if (shown >= full.length) finishType();
      }, G.speed === 2 ? 14 : 28);
      if (who !== 'narr') SND('click');
    };
    var end = function () {
      if (ended) return;
      ended = true;
      clearInterval(typing); clearTimeout(autoT);
      document.removeEventListener('keydown', onKey);
      done();
    };
    var onKey = function (e) {
      if (!el.classList.contains('on')) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); next(); }
      if (e.key === 'Escape') end();
    };
    document.addEventListener('keydown', onKey);
    el.onclick = function (e) { if (!e.target.closest('.st-ctrl')) next(); };
    el.querySelector('.skip').onclick = end;
    var autoBtn = el.querySelector('.auto');
    autoBtn.onclick = function () { autoOn = !autoOn; autoBtn.classList.toggle('on', autoOn); queueAuto(); };
    UI.show('story');
    next();
  };

  // ================= 장 제목 카드 =================
  // 스테이지를 시작할 때마다 잠깐 보인다(누르면 넘긴다)
  Meta.chapterCard = function (n, done) {
    var def = St.stageDef(n), ch = (D.story || []).filter(function (c) { return c.n === n; })[0];
    var card = UI.el('div', 'chapter-card', '<div class="cc-band"><small>' + (ch ? ch.en : 'STAGE ' + n) + ' · ' + D.THEME_NAME[def.theme] + '</small>' +
      '<b>' + D.STAGE_NAME[n - 1] + '</b><span>' + (D.STAGE_EN ? D.STAGE_EN[n - 1] : '') + '</span></div>');
    document.getElementById('app').appendChild(card);
    SND('turn');
    var finished = false;
    var end = function () { if (finished) return; finished = true; if (card.parentNode) card.parentNode.removeChild(card); done(); };
    card.onclick = end;
    setTimeout(end, G.FX && G.FX.low ? 900 : 1700);
  };

  // 스테이지 시작: 장 제목 → (처음이면) 도입 장면 → 맵
  Meta.stageIntro = function (n, done) {
    Meta.chapterCard(n, function () {
      var sc = St.sceneFor('intro', n);
      if (sc) Meta.scene(sc, done); else done();
    });
  };

  // ================= 스토리 다시 보기 =================
  Meta.story = function () {
    var el = screen(), prog = St.storyProgress();
    el.onclick = null;
    el.classList.remove('narrating');
    var cards = (D.story || []).map(function (ch) {
      var anySeen = ch.scenes.some(function (sc) { return sc.kind === 'ascend' ? St.data.ascension.best > 0 || St.ascLevel() > 0 : St.storySeen(sc.id); });
      var stageTheme = ch.n >= 1 && ch.n <= D.stages.length ? D.stages[ch.n - 1].theme : ch.n === 0 ? 'castle' : 'forest';
      return '<div class="sc-card' + (anySeen ? '' : ' locked') + '" data-theme="' + stageTheme + '"><div class="sc-art"></div>' +
        '<div class="sc-head"><small>' + ch.en + '</small><b>' + (anySeen ? ch.title : '???') + '</b></div><div class="sc-btns">' +
        ch.scenes.map(function (sc) {
          var ok = sc.kind === 'ascend' ? St.data.ascension.best > 0 || St.ascLevel() > 0 : St.storySeen(sc.id);
          return '<button class="btn small ' + (ok ? '' : 'ghost') + '" data-id="' + sc.id + '" ' + (ok ? '' : 'disabled') + '>' + (ok ? KIND_NAME[sc.kind] : '???') + '</button>';
        }).join('') + '</div></div>';
    }).join('');
    el.innerHTML = Meta.topbar('스토리', '<button class="btn small ghost back">' + UI.icon('home') + '로비</button>') +
      '<div class="meta-body story-list"><div class="sc-prog"><span>본 장면 <b>' + prog.seen + '/' + prog.total + '</b></span><div class="bar"><i style="width:calc(' + prog.pct + '% - 4px)"></i></div><b class="pct">' + prog.pct + '%</b></div>' +
      '<div class="sc-grid">' + cards + '</div></div>';
    UI.$$('.sc-card', el).forEach(function (c) {
      G.Art.scene(theme(c.getAttribute('data-theme'))).then(function (u) { if (u) c.querySelector('.sc-art').style.backgroundImage = 'url(' + u + ')'; });
    });
    UI.$$('.sc-btns .btn:not(:disabled)', el).forEach(function (b) {
      b.onclick = function () { Meta.scene(b.getAttribute('data-id'), Meta.story, { replay: true }); };
    });
    el.querySelector('.back').onclick = function () { Meta.lobby(); };
    UI.show('story');
  };
})();
