// status.js — 상태이상 처리 (부여, 감소, 정화)
(function () {
  'use strict';
  var G = Game;
  var DEF = G.Data.statuses;
  var DEBUFFS = ['frozen', 'stun', 'vulnerable', 'weak', 'poison', 'burn', 'chill'];
  // 무작위 디버프 후보와 수치
  var RANDOM_DEBUFF = [['poison', 3], ['burn', 3], ['weak', 1], ['vulnerable', 1], ['chill', 1]];

  var S = G.Status = {
    DEBUFFS: DEBUFFS,
    get: function (u, k) { return (u && u.status[k]) || 0; },
    has: function (u, k) { return S.get(u, k) > 0; },
    isDebuff: function (k) { return DEF[k] && DEF[k].kind === 'debuff'; },
    debuffKinds: function (u) {
      return DEBUFFS.filter(function (k) { return S.get(u, k) > 0; }).length;
    },
    set: function (u, k, n) {
      if (n > 0) u.status[k] = n; else delete u.status[k];
    },
    dec: function (u, k, n) { S.set(u, k, S.get(u, k) - (n || 1)); },

    // 상태 부여. battle 은 연출 이벤트·도발 재지정에 쓴다. src 는 부여한 유닛(없으면 null)
    add: function (battle, u, key, n, src) {
      if (!u || u.dead || !n) return 0;
      if (key === 'randomDebuff') {
        var pick = G.rng.pick(RANDOM_DEBUFF);
        key = pick[0]; n = pick[1] * n;
      }
      if (!DEF[key]) throw new Error('알 수 없는 상태: ' + key);
      // 원소 친화: 부여자가 가진 만큼 화상·한기 증가
      if (src && (key === 'burn' || key === 'chill')) n += S.get(src, 'affinity');
      if (key === 'chill' && S.has(u, 'freezeImmune')) {
        battle.emit('fx:text', { unit: u, text: '면역', kind: 'info' });
        return 0;
      }
      S.set(u, key, S.get(u, key) + n);
      // 적 턴에 걸린 약화·취약은 그 라운드에는 줄지 않는다
      if ((key === 'weak' || key === 'vulnerable') && battle.phase === 'enemy') {
        u.fresh = u.fresh || {};
        u.fresh[key] = true;
      }
      battle.emit('fx:status', { unit: u, key: key, n: n });
      if (key === 'chill' && S.get(u, 'chill') >= 3) {
        S.set(u, 'chill', 0);
        S.freeze(battle, u);
      }
      if (key === 'frozen' && u.side === 'enemy' && u.boss) S.set(u, 'freezeImmune', 3);
      if (key === 'taunt' || key === 'guardian') battle.retarget();
      return n;
    },

    freeze: function (battle, u) {
      S.set(u, 'frozen', 1);
      if (u.side === 'enemy' && u.boss) S.set(u, 'freezeImmune', 3);
      battle.emit('fx:status', { unit: u, key: 'frozen', n: 1 });
      battle.emit('fx:text', { unit: u, text: '빙결!', kind: 'ice' });
    },

    // 디버프 제거. 반환값: 제거한 종류 수
    cleanse: function (u, count) {
      var removed = 0;
      for (var i = 0; i < DEBUFFS.length; i++) {
        if (count !== 'all' && removed >= count) break;
        if (S.has(u, DEBUFFS[i])) { delete u.status[DEBUFFS[i]]; removed++; }
      }
      return removed;
    },

    // 주인의 턴 시작 시
    turnStart: function (u) {
      Object.keys(u.status).forEach(function (k) {
        var d = DEF[k] && DEF[k].decay;
        if (d === 'turnStart') S.dec(u, k);
        else if (d === 'turnStartClear') delete u.status[k];
      });
    },
    // 주인의 턴 끝
    turnEnd: function (u) {
      Object.keys(u.status).forEach(function (k) {
        if (DEF[k] && DEF[k].decay === 'turnEndClear') delete u.status[k];
      });
      // 아군 빙결은 자기 턴이 끝나면 풀린다
      if (u.side === 'ally') delete u.status.frozen;
    },
    // 라운드(내 턴 + 적 턴) 끝
    roundEnd: function (u) {
      var fresh = u.fresh || {};
      Object.keys(u.status).forEach(function (k) {
        if (DEF[k] && DEF[k].decay === 'round' && !fresh[k]) S.dec(u, k);
      });
      if (S.has(u, 'doom')) S.dec(u, 'doom');
      u.fresh = null;
    }
  };
})();
