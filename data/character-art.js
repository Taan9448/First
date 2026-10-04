// PNG source rectangles: [left, width]. All poses share a top and foot baseline.
(function () {
  'use strict';
  Game.Data.characterArt = {
    bram: {
      url: 'assets/characters/bram_poses.png', width: 2160, height: 728,
      top: 193, bottom: 598, bodyHeight: 398, face: [282, 298], tip: [0.96, 0.65],
      regions: [[28, 402], [574, 537], [1164, 436], [1717, 407]]
    },
    lyra: {
      url: 'assets/characters/lyra_poses.png', width: 2171, height: 724,
      top: 91, bottom: 653, bodyHeight: 376, face: [244, 374], tip: [0.89, 0.49],
      regions: [[39, 394], [567, 525], [1144, 420], [1719, 418]]
    },
    sera: {
      url: 'assets/characters/sera_poses.png', width: 2172, height: 724,
      top: 136, bottom: 611, bodyHeight: 410, face: [292, 326], tip: [0.87, 0.39],
      regions: [[46, 442], [549, 604], [1158, 447], [1659, 478]]
    },
    nox: {
      url: 'assets/characters/nox_poses.png', width: 2172, height: 724,
      top: 153, bottom: 582, bodyHeight: 424, face: [303, 319], tip: [0.93, 0.49],
      regions: [[53, 423], [563, 521], [1114, 551], [1719, 410]]
    },
    ciel: {
      url: 'assets/characters/ciel_poses.png', width: 2172, height: 724,
      top: 16, bottom: 676, bodyHeight: 518, face: [275, 350], tip: [0.86, 0.53],
      regions: [[27, 480], [536, 579], [1147, 539], [1694, 472]]
    }
  };
})();
