// deck.js — 덱/손패/버린 더미, 셔플, 드로우
(function () {
  'use strict';
  var G = Game;
  var HAND_MAX = 10;
  var seq = 1;

  var D = G.Deck = {
    HAND_MAX: HAND_MAX,
    // 카드 인스턴스. temp: 그 턴에만 유지(턴이 끝나거나 사용하면 사라짐), freeTurn: 이번 턴 비용 0
    inst: function (id, opts) {
      var def = G.Data.cardById[id];
      if (!def) throw new Error('알 수 없는 카드: ' + id);
      return Object.assign({ uid: seq++, id: id, def: def, temp: false, freeTurn: false, costTurn: null }, opts);
    },
    create: function (ids) {
      var piles = { draw: ids.map(function (id) { return D.inst(id); }), hand: [], discard: [], exhaust: [], powers: [] };
      G.rng.shuffle(piles.draw);
      return piles;
    },
    // n장 뽑기. 덱이 비면 버린 더미를 섞어 덱으로. 손패가 꽉 차면 버린 더미로 간다
    draw: function (piles, n) {
      var drawn = [];
      for (var i = 0; i < n; i++) {
        if (!piles.draw.length) {
          if (!piles.discard.length) break;
          piles.draw = G.rng.shuffle(piles.discard);
          piles.discard = [];
        }
        var c = piles.draw.pop();
        if (piles.hand.length >= HAND_MAX) piles.discard.push(c);
        else { piles.hand.push(c); drawn.push(c); }
      }
      return drawn;
    },
    // 이번 턴 한정 상태를 지운다
    resetTurn: function (c) { c.freeTurn = false; c.costTurn = null; c.frosted = false; }
  };
})();
