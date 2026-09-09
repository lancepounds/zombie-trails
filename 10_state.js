/* ZOMBIE TRAILS — game state */
'use strict';
ZT.State = {
  newMember(name, role) {
    return {
      name, role,
      health: 100, fatigue: 0, morale: 75,
      injury: 0, illness: 0,
      inf: 'none', infSev: 0, infDays: 0, infStable: false,
      isolated: false,
      alive: true, cause: '', diedDay: 0, diedMile: 0, epitaph: '',
      missing: false,
    };
  },

  newGame(opts) {
    const diff = ZT.DIFF[opts.difficulty] ? opts.difficulty : 'normal';
    const seed = (opts.seed == null ? Math.floor(Math.random() * 2 ** 31) : opts.seed) | 0;
    const s = {
      v: ZT.SAVE_VERSION, seed, rng: seed,
      difficulty: diff,
      day: 1, miles: 0,
      at: ZT.START_NODE, legTo: null, legMiles: 0, path: [ZT.START_NODE], seen: { omaha: true },
      pace: 'steady', rations: 'normal',
      weather: 'clear', weatherDays: 0,
      party: [], inv: { food: 0, fuel: 0, medicine: 0, ammo: 0, parts: 0, tools: 0, goods: 0, cash: ZT.DIFF[diff].cash },
      vehicle: { has: true, engine: 88, tires: 82, electrical: 85, body: 90, broken: null, name: 'station wagon' },
      zombie: { noise: 0, horde: 5 },
      flags: {},
      log: [], stats: { travelDays: 0, restDays: 0, scavenges: 0, shots: 0, events: 0, deaths: 0, breakdowns: 0, bites: 0, kills: 0, eventsSeen: {}, choices: {} },
      recent: [], once: {},
      scavAt: {},
      pendingDeaths: [],
      partialDelay: 0,
      lastEventDay: 0,
      over: null, departed: false,
      markerSeen: {},
    };
    const names = opts.names || ZT.DEFAULT_NAMES;
    const roles = opts.roles || ['driver', 'medic', 'mechanic', 'scout', 'generalist'];
    for (let i = 0; i < 5; i++) s.party.push(ZT.State.newMember((names[i] || ZT.DEFAULT_NAMES[i]).trim().slice(0, 12) || ZT.DEFAULT_NAMES[i], roles[i] || 'generalist'));
    ZT.State.log(s, 'The Omaha gate closes behind you. Boise is 1,300 miles west, give or take.', true);
    return s;
  },

  log(s, text, notable) {
    s.log.push({ day: s.day, mile: Math.round(s.miles), text, n: !!notable });
    if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
  },

  alive: (s) => s.party.filter((m) => m.alive && !m.missing),
  aliveCount: (s) => s.party.filter((m) => m.alive && !m.missing).length,
  hasRole: (s, role) => s.party.some((m) => m.alive && !m.missing && m.role === role),
  byRole(s, role) { return s.party.find((m) => m.alive && !m.missing && m.role === role) || null; },

  /* readable condition summary */
  condition(m) {
    if (!m.alive) return 'dead';
    if (m.missing) return 'missing';
    if (m.inf === 'symptomatic' || m.health < 20) return 'critical';
    if (m.inf === 'bitten') return 'infected';
    if (m.inf === 'exposed') return 'exposed';
    if (m.injury > 30) return 'injured';
    if (m.illness > 20) return 'ill';
    if (m.health < 45) return 'weak';
    if (m.fatigue > 65 || m.health < 70) return 'worn';
    return 'healthy';
  },

  weight(s) {
    let w = 0;
    for (const k of ZT.ITEM_ORDER) w += (s.inv[k] || 0) * ZT.ITEMS[k].lbs;
    return w;
  },

  serialize: (s) => JSON.stringify(s),
  deserialize(str) {
    const s = JSON.parse(str);
    if (!s || typeof s !== 'object' || !Array.isArray(s.party)) throw new Error('bad save');
    return ZT.State.migrate(s);
  },
  migrate(s) {
    if (s.v === undefined) s.v = 1;
    // future migrations: if (s.v < 2) {...; s.v = 2;}
    s.pendingDeaths = s.pendingDeaths || [];
    s.markerSeen = s.markerSeen || {};
    s.scavAt = s.scavAt || {};
    if (!s.at) {                     // v1 saves used a linear mile counter
      s.at = ZT.START_NODE; s.legTo = null; s.legMiles = 0;
      s.path = [ZT.START_NODE]; s.seen = { omaha: true }; s.miles = 0;
    }
    s.path = s.path || [ZT.START_NODE];
    s.seen = s.seen || { omaha: true };
    return s;
  },
};
