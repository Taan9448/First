// Approved companion PNGs: load once, then display with CSS (including file://).
(function () {
  'use strict';
  var G = Game, ready = {}, pending;
  function sheet(id, d) {
    var scale = 48 / d.bodyHeight;
    var width = Math.max.apply(null, d.regions.map(function (r) { return r[1]; }));
    var height = d.bottom - d.top;
    return {
      url: d.url, w: width * scale, h: height * scale, bodyHeight: 48,
      frames: 4, anchor: (width / 2 - d.regions[0][1] / 2 + d.face[0] - d.regions[0][0]) / width,
      face: { x: (width / 2 - d.regions[0][1] / 2 + d.face[0] - d.regions[0][0]) / width, y: (d.face[1] - d.top) / height },
      tipAttack: { x: d.tip[0], y: d.tip[1] },
      art: { width: d.width, height: d.height, frameWidth: width, top: d.top, frameHeight: height, regions: d.regions },
      anims: {
        idle: { start: 0, n: 1, fps: 1, loop: true },
        attack: { start: 1, n: 1, fps: 2.5, loop: false },
        skill: { start: 2, n: 1, fps: 1.6, loop: false },
        hit: { start: 3, n: 1, fps: 5, loop: false }
      }
    };
  }
  G.CharacterArt = {
    sheet: function (id) { return ready[id] || null; },
    load: function () {
      if (pending) return pending;
      pending = Promise.all(Object.keys(G.Data.characterArt).map(function (id) {
        var d = G.Data.characterArt[id];
        return new Promise(function (resolve) {
          var img = new Image(), timer;
          function finish(ok) {
            clearTimeout(timer); img.onload = img.onerror = null;
            if (ok && img.naturalWidth === d.width && img.naturalHeight === d.height) ready[id] = sheet(id, d);
            resolve();
          }
          img.onload = function () { finish(true); };
          img.onerror = function () { finish(false); };
          timer = setTimeout(function () { finish(false); }, 6000);
          img.src = d.url;
        });
      }));
      return pending;
    }
  };
})();
