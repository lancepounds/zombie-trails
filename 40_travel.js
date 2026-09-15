/* ZOMBIE TRAILS — travel engine: mileage, days, weather, zombie pressure, interrupts.
   Travel runs in chunks. step() advances one day and returns an interrupt or null. */
'use strict';
ZT.Travel = {
  /* ---------- weather ---------- */
  /* The journey leaves in September. Every week on the road tilts the weather
     table further into the cold half of the year — this is the clock. */
  seasonShift(s) { return ZT.clamp((s.day - 15) / 105, 0, 1.5); },
  rollWeather(s) {
    s.weatherDays--;
    if (s.weatherDays > 0) return;
    const base = ZT.region(s).weather;
    const w = ZT.Travel.seasonShift(s);
    const table = {};
    for (const k of Object.keys(base)) {
      let v = base[k];
      if (k === 'cold') v = v * (1 + w * 1.6) + w * 1.4;
      else if (k === 'snow') v = v * (1 + w * 2.0) + w * 0.7;
      else if (k === 'storm') v = v * (1 + w * 0.5);
      else if (k === 'heat') v = v * Math.max(0, 1 - w);
      else if (k === 'clear') v = v * Math.max(0.35, 1 - w * 0.35);
      table[k] = v;
    }
    const keys = Object.keys(table).filter((k) => table[k] > 0);
    const total = keys.reduce((t, k) => t + table[k], 0);
    let r = ZT.rand(s) * total, pickKey = keys[0];
    for (const k of keys) { r -= table[k]; if (r <= 0) { pickKey = k; break; } }
    const changed = pickKey !== s.weather;
    s.weather = pickKey;
    s.weatherDays = ZT.rint(s, 1, 4);
    return changed;
  },

  /* ---------- noise and horde ---------- */
  pressureTick(s, mode) {
    const diff = ZT.DIFF[s.difficulty];
    // noise decays
    s.zombie.noise = ZT.clamp(s.zombie.noise - (mode === 'travel' ? 8 + ZT.Party.travelBonuses(s).noise : 12), 0, 100);
    // horde pressure creeps up with distance and days
    const target = 5 + ZT.progress(s) * 55 * diff.horde;
    const drift = s.zombie.horde < target ? 0.7 : -0.4;
    s.zombie.horde = ZT.clamp(s.zombie.horde + drift + (s.zombie.noise > 55 ? 0.8 : 0), 0, 100);
  },
  /* 0..1 — how likely and how bad zombie contact is right now */
  threat(s) {
    const reg = ZT.region(s);
    const wx = ZT.WEATHER[s.weather];
    const dens = reg.density;
    const noise = s.zombie.noise / 100;
    const horde = s.zombie.horde / 100;
    const scout = ZT.State.hasRole(s, 'scout') ? 0.9 : 1;
    const vis = wx.vis;
    return ZT.clamp((dens * 0.55 + noise * 0.3 + horde * 0.35) * (1.25 - vis * 0.25) * scout, 0, 1.4);
  },
  threatWord(s) {
    const t = ZT.Travel.threat(s);
    return t < 0.25 ? 'Quiet' : t < 0.45 ? 'Restless' : t < 0.65 ? 'Active' : t < 0.9 ? 'Dangerous' : 'Overrun';
  },

  /* ---------- daily mileage ---------- */
  expectedMiles(s) {
    if (!s.vehicle.has) {
      let m = 12 * ZT.WEATHER[s.weather].speed;
      m *= 0.85 + (ZT.Party.avgHealth(s) / 100) * 0.3;
      m *= ZT.clamp(1 - ZT.Party.avgFatigue(s) / 250, 0.6, 1);
      return Math.max(3, m * ZT.Party.travelBonuses(s).mileage);
    }
    const pace = ZT.PACE[s.pace];
    const reg = ZT.region(s);
    const wx = ZT.WEATHER[s.weather];
    let m = pace.mpd * wx.speed * reg.road * ZT.Vehicle.speedFactor(s);
    if (ZT.State.hasRole(s, 'driver')) m *= 1.08;
    const fat = ZT.Party.avgFatigue(s);
    if (fat > 60) m *= 1 - (fat - 60) / 200;
    const sick = ZT.State.alive(s).filter((x) => x.health < 40 || x.inf === 'symptomatic').length;
    m *= 1 - Math.min(0.3, sick * 0.08);
    m *= ZT.Party.travelBonuses(s).mileage;
    return Math.max(4, m);
  },
  milesToday(s) {
    const variation = s.vehicle.has ? 0.88 + ZT.rand(s) * 0.24 : 0.85 + ZT.rand(s) * 0.3;
    return Math.max(s.vehicle.has ? 4 : 3, ZT.Travel.expectedMiles(s) * variation);
  },

  /* ---------- a single idle day (delays, repairs, camping) ---------- */
  idleDay(s) {
    s.day++;
    ZT.Travel.rollWeather(s);
    ZT.Travel.pressureTick(s, 'idle');
    ZT.Party.dailyTick(s, 'idle');
  },
  restDay(s) {
    s.day++; s.stats.restDays++;
    ZT.Travel.rollWeather(s);
    ZT.Travel.pressureTick(s, 'rest');
    ZT.Party.dailyTick(s, 'rest');
  },

  /* ---------- one day of travel ----------
     Returns an interrupt object or null.
     { kind: 'event'|'arrive'|'fork'|'breakdown'|'death'|'over'|'stuck', ... } */
  step(s) {
    if (s.over) return { kind: 'over' };
    if (!ZT.State.aliveCount(s)) { ZT.Travel.endGame(s, 'party'); return { kind: 'over' }; }
    if (!s.legTo) return { kind: 'fork', node: ZT.NODES[s.at] };   // waiting on a route choice
    if (s.vehicle.broken) return { kind: 'stuck', reason: 'broken' };
    if (s.vehicle.has && s.inv.fuel <= 0) return { kind: 'stuck', reason: 'fuel' };

    const leg = ZT.currentLeg(s);
    if (!leg) return { kind: 'fork', node: ZT.NODES[s.at] };

    s.day++;
    s.stats.travelDays++;
    ZT.Travel.rollWeather(s);

    let miles = ZT.Travel.milesToday(s);
    if (s.partialDelay > 0) { miles *= 1 - s.partialDelay; s.partialDelay = 0; }
    const left = leg.miles - s.legMiles;
    let arriving = false;
    if (miles >= left) { miles = left; arriving = true; }

    // fuel
    if (s.vehicle.has) {
      const mpg = ZT.Vehicle.mpg(s);
      const need = miles / mpg;
      if (need > s.inv.fuel) {
        const canGo = s.inv.fuel * mpg;
        miles = canGo; s.inv.fuel = 0; arriving = false;
        ZT.Travel.advance(s, miles);
        ZT.Vehicle.dailyWear(s, miles);
        ZT.Travel.pressureTick(s, 'travel');
        ZT.Party.dailyTick(s, 'travel');
        ZT.State.log(s, 'The wagon coasts to a stop. The tank is dry.', true);
        const d = ZT.Travel.checkDeaths(s); if (d) return d;
        return { kind: 'stuck', reason: 'fuel' };
      }
      s.inv.fuel = ZT.round1(s.inv.fuel - need);
    }

    ZT.Travel.advance(s, miles);
    ZT.Vehicle.dailyWear(s, miles);
    ZT.X.noise(s, null, ZT.PACE[s.pace].noise);
    ZT.Travel.pressureTick(s, 'travel');
    ZT.Party.dailyTick(s, 'travel');

    const dead = ZT.Travel.checkDeaths(s);
    if (dead) return dead;
    if (!ZT.State.aliveCount(s)) { ZT.Travel.endGame(s, 'party'); return { kind: 'over' }; }

    // arrival at the next place on the road
    if (arriving) {
      const node = ZT.Travel.arrive(s, leg.to);
      if (s.over) return { kind: 'over' };
      return { kind: 'arrive', node };
    }

    if (ZT.roll(s, ZT.Vehicle.breakdownChance(s))) {
      const sub = ZT.Vehicle.pickFailing(s);
      ZT.X.breakdown(s, null, sub);
      ZT.State.log(s, `The ${sub} failed near ${ZT.NODES[leg.to].name}.`, true);
      return { kind: 'breakdown', sub };
    }

    const ev = ZT.Events.maybeFire(s, 'travel');
    if (ev) return { kind: 'event', event: ev };

    return null;
  },

  /* move along the current leg */
  advance(s, miles) {
    s.legMiles = Math.round((s.legMiles + miles) * 10) / 10;
    s.miles = Math.round((s.miles + miles) * 10) / 10;
  },

  /* step onto a node: record it, clear the leg, end the game if it is Boise */
  arrive(s, id) {
    const node = ZT.NODES[id];
    s.at = id;
    s.legTo = null;
    s.legMiles = 0;
    if (s.path[s.path.length - 1] !== id) s.path.push(id);
    s.seen[id] = true;
    if (id === ZT.END_NODE) { ZT.Travel.endGame(s, 'win'); return node; }
    ZT.State.log(s, `Reached ${node.name}, ${node.sub}. ${Math.round(s.miles)} miles from Omaha.`, true);
    return node;
  },

  /* commit to a road out of the current node */
  takeLeg(s, toId) {
    const leg = ZT.legBetween(s.at, toId);
    if (!leg) return false;
    s.legTo = toId;
    s.legMiles = 0;
    ZT.State.log(s, `Took ${leg.road} toward ${ZT.NODES[toId].name}.`);
    return true;
  },

  /* the choices out of the node the party is standing on */
  choicesHere(s) {
    if (s.legTo) return [];
    return ZT.legsFrom(s.at);
  },

  checkDeaths(s) {
    if (s.pendingDeaths.length) {
      const idx = s.pendingDeaths.shift();
      return { kind: 'death', member: s.party[idx] };
    }
    return null;
  },

  /* ---------- rest / scavenge wrappers that can also fire events ---------- */
  rest(s, days) {
    const out = { days: 0, interrupt: null };
    for (let i = 0; i < days; i++) {
      if (s.over) break;
      ZT.Travel.restDay(s);
      out.days++;
      const d = ZT.Travel.checkDeaths(s);
      if (d) { out.interrupt = d; break; }
      if (!ZT.State.aliveCount(s)) { ZT.Travel.endGame(s, 'party'); out.interrupt = { kind: 'over' }; break; }
      const ev = ZT.Events.maybeFire(s, 'camp');
      if (ev) { out.interrupt = { kind: 'event', event: ev }; break; }
    }
    return out;
  },

  /* ---------- end conditions ---------- */
  endGame(s, why) {
    if (s.over) return;
    const survivors = ZT.State.alive(s);
    s.over = { why, day: s.day, miles: Math.round(s.miles), survivors: survivors.map((m) => m.name) };
    s.over.score = ZT.Score.compute(s);
    if (why === 'win') ZT.State.log(s, `The Boise gate opens. ${survivors.length} of you walk in.`, true);
    else if (why === 'party') ZT.State.log(s, 'No one is left to go on.', true);
    else if (why === 'stranded') ZT.State.log(s, 'The road ends here. You cannot go any further.', true);
  },

  /* is the run unwinnable — used to offer the player a stark choice, never to auto-fail */
  isStranded(s) {
    if (s.over) return false;
    if (!ZT.State.aliveCount(s)) return true;
    if (s.vehicle.has && s.inv.fuel <= 0 && s.inv.cash < 20 && s.inv.goods <= 0) {
      // stranded only if scavenging is also hopeless — it never quite is, so no
      return false;
    }
    return false;
  },
};

/* ---------- scoring ---------- */
ZT.Score = {
  compute(s) {
    const diff = ZT.DIFF[s.difficulty];
    const rows = [];
    let total = 0;
    const survivors = ZT.State.alive(s);
    const reached = s.over && s.over.why === 'win';
    for (const m of survivors) {
      const cond = ZT.State.condition(m);
      const pts = cond === 'healthy' ? 400 : cond === 'worn' ? 320 : cond === 'weak' ? 240 : cond === 'ill' || cond === 'injured' ? 200 : 120;
      rows.push({ label: `${m.name} (${cond})`, pts });
      total += pts;
    }
    if (!survivors.length) rows.push({ label: 'No survivors', pts: 0 });
    const milePts = Math.round(ZT.progress(s) * 600);
    rows.push({ label: `${Math.round(s.miles)} miles from Omaha`, pts: milePts }); total += milePts;
    if (s.vehicle.has) {
      const vp = Math.round(ZT.Vehicle.overall(s) * 1.5);
      rows.push({ label: `Wagon (${ZT.Vehicle.status(s).toLowerCase()})`, pts: vp }); total += vp;
    }
    let supplyPts = 0;
    for (const k of ZT.ITEM_ORDER) supplyPts += Math.round((s.inv[k] / ZT.ITEMS[k].cap) * 40);
    supplyPts += Math.round(s.inv.cash / 25);
    rows.push({ label: 'Supplies and cash remaining', pts: supplyPts }); total += supplyPts;
    if (reached) {
      const speed = Math.max(0, 400 - Math.max(0, s.day - 50) * 6);
      rows.push({ label: `Arrived on day ${s.day}`, pts: speed }); total += speed;
      rows.push({ label: 'Reached Boise', pts: 1000 }); total += 1000;
    }
    const mult = diff.score;
    const final = Math.round(total * mult);
    return { rows, subtotal: total, mult, total: final, difficulty: diff.name };
  },
  rank(score) {
    if (score >= 4000) return 'CONVOY LEADER';
    if (score >= 3000) return 'TRAIL BOSS';
    if (score >= 2000) return 'ROAD CAPTAIN';
    if (score >= 1200) return 'DRIVER';
    if (score >= 600) return 'PASSENGER';
    return 'STATISTIC';
  },
};
