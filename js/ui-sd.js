// Presentation only. No changes to battle rules, saves, unlocks or asset fallbacks.
(function () {
  'use strict';
  var G = Game, UI = G.UI, cache = {};
  var paths = {
    home:'M4 15L16 5l12 10M8 13v15h16V13M14 28V19h5v9',
    gold:'M16 3a13 13 0 1 0 0 26a13 13 0 1 0 0-26M16 9v14M21 11h-7a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6h-7',
    deck:'M6 6h18v23H6zM11 2h18v22M10 12h10M10 17h10M10 22h7',
    party:'M12 11a4 4 0 1 0 0-8a4 4 0 1 0 0 8M22 14a4 4 0 1 0 0-8a4 4 0 1 0 0 8M3 27v-7a9 9 0 0 1 18 0v7M21 18a8 8 0 0 1 9 8',
    chest:'M3 14h26v14H3zM3 14V9a5 5 0 0 1 5-5h16a5 5 0 0 1 5 5v5M3 17h26M13 14h6v7h-6z',
    gear:'M16 10a6 6 0 1 0 0 12a6 6 0 1 0 0-12M13 3h6l1 4l4 2l4-1l3 5l-3 3v4l2 3l-3 5l-4-1l-4 2h-6l-1-4l-4-2l-4 1l-3-5l3-3v-4l-2-3l3-5l4 1z',
    help:'M16 3a13 13 0 1 0 0 26a13 13 0 1 0 0-26M11 11a5 5 0 1 1 9 3l-4 3v3M16 24v1',
    swap:'M3 10h25l-6-6M29 22H4l6 6',
    skull:'M6 17V12a10 10 0 0 1 20 0v5l-4 4v7H10v-7zM11 12v4M21 12v4M14 24v4M18 24v4',
    stats:'M4 28h25M7 24V16h4v8M15 24V9h4v15M23 24V3h4v21',
    anvil:'M3 11h27l-5 7H13l-4-3H3zM15 18v7M12 28h13M19 18v7',
    sword:'M5 27l5-5M5 19l8 8M10 21L23 4l6-2l-2 6L14 24',
    shield:'M5 5l11-3l11 3v13q-2 8-11 12Q7 26 5 18zM16 8v17',
    heart:'M16 28L4 15C-2 4 11 0 16 9C21 0 34 4 28 15z',
    map:'M2 7l9-4l10 4l9-4v22l-9 4l-10-4l-9 4zM11 3v22M21 7v22',
    book:'M16 7Q9 2 3 5v23q7-3 13 1q6-4 13-1V5q-7-3-13 2zM16 7v22',
    crown:'M3 8l7 5l6-9l6 9l7-5l-4 19H7zM8 22h16',
    energy:'M19 2L6 19h9l-2 11l13-18h-9z',
    lock:'M7 14h18v15H7zM11 14V8a5 5 0 0 1 10 0v6M16 20v4',
    check:'M4 16l8 8L28 6',
    attack:'M5 27l5-5M5 19l8 8M10 21L23 4l6-2l-2 6L14 24',
    block:'M5 5l11-3l11 3v13q-2 8-11 12Q7 26 5 18z',
    heal:'M12 3h8v9h9v8h-9v9h-8v-9H3v-8h9z'
  };
  G.SD = {
    icon: function (key) {
      var p = paths[key];
      if (!p) return null;
      if (!cache[key]) cache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="' + p + '" fill="none" stroke="#eed4a0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
      return cache[key];
    }
  };
  var cardEl = UI.cardEl;
  UI.cardEl = function (def, opts) {
    var c = cardEl(def, opts);
    // A dedicated card illustration remains first choice. Otherwise use the
    // approved owner atlas directly in CSS, alongside the card's effect glyph.
    if (!c.classList.contains('has-art') && G.CharacterArt.sheet(def.owner)) {
      var art = c.querySelector('.cart');
      var hero = UI.spriteEl(def.owner, { h: 94, max: 1 });
      hero.classList.add('card-owner-art');
      hero.setAttribute('aria-hidden', 'true');
      art.appendChild(hero);
    }
    return c;
  };
})();
