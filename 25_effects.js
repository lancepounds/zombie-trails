/* ZOMBIE TRAILS — outcome helpers used by event content.
   Every helper records a short delta string on c.d (the event context) so the
   player sees a plain summary line under the narrative text. */
'use strict';
ZT.X = {
  d(c, str) { if (c && c.d) c.d.push(str); },
  unit(item, n) {
    const it = ZT.ITEMS[item];
    if (item === 'cash') return ZT.money(n);
    return `${ZT.n(n)} ${it.unit} ${it.name.toLowerCase()}`;
  },
  /* remove up to n of an item; returns amount actually removed */
  take(s, c, item, n) {
    n = Math.max(0, Math.round(n * 10) / 10);
    const have = s.inv[item] || 0;
    const got = Math.min(have, n);
    s.inv[item] = ZT.round1(have - got);
    if (got > 0) ZT.X.d(c, '-' + ZT.X.unit(item, got));
    return got;
  },
  /* add up to cap; returns amount actually added */
  give(s, c, item, n) {
    n = Math.max(0, Math.round(n * 10) / 10);
    if (item === 'cash') { s.inv.cash += n; ZT.X.d(c, '+' + ZT.money(n)); return n; }
    const cap = ZT.ITEMS[item].cap * (s.vehicle.has ? 1 : ZT.X.footCap(item));
    const have = s.inv[item] || 0;
    const got = Math.max(0, Math.min(cap - have, n));
    s.inv[item] = ZT.round1(have + got);
    if (got > 0) ZT.X.d(c, '+' + ZT.X.unit(item, got));
    if (got < n) ZT.X.d(c, `(no room for the rest)`);
    return got;
  },
  footCap: (item) => ({ food: 0.15, fuel: 0.1, medicine: 0.5, ammo: 0.5, parts: 0.34, tools: 0.34, goods: 0.3 }[item] || 0.3),
  /* immediate health damage */
  hurt(s, c, m, amount, cause) {
    if (!m || !m.alive) return;
    m.health = ZT.clamp(m.health - amount, 0, 100);
    ZT.X.d(c, `${m.name} -${Math.round(amount)} health`);
    if (m.health <= 0) ZT.Party.kill(s, m, cause || 'injuries');
  },
  heal(s, c, m, amount) { if (!m || !m.alive) return; m.health = ZT.clamp(m.health + amount, 0, 100); ZT.X.d(c, `${m.name} +${Math.round(amount)} health`); },
  injure(s, c, m, sev, cause) {
    if (!m || !m.alive) return;
    m.injury = ZT.clamp(m.injury + sev, 0, 100);
    ZT.X.d(c, `${m.name} injured`);
    if (sev >= 40) ZT.X.hurt(s, c, m, Math.round(sev / 2), cause || 'injuries');
  },
  sicken(s, c, m, sev) { if (!m || !m.alive) return; m.illness = ZT.clamp(m.illness + sev, 0, 100); ZT.X.d(c, `${m.name} ill`); },
  bite(s, c, m) {
    if (!m || !m.alive) return;
    const diff = ZT.DIFF[s.difficulty];
    s.stats.bites++;
    if (m.inf === 'symptomatic') { ZT.X.hurt(s, c, m, 10, 'infection'); return; }
    m.inf = 'bitten'; m.infDays = 0; m.infStable = false;
    const r = ZT.rand(s) * diff.infect;
    m.infSev = r < 0.62 ? 0 : r < 0.88 ? 1 : 2;
    m.health = Math.max(1, m.health - 8);
    ZT.X.d(c, `${m.name} BITTEN`);
    ZT.State.log(s, `${m.name} was bitten.`, true);
  },
  expose(s, c, m) {
    if (!m || !m.alive || m.inf !== 'none') return;
    m.inf = 'exposed'; m.infDays = 0;
    ZT.X.d(c, `${m.name} scratched`);
  },
  fatigue(s, c, m, n) { if (!m || !m.alive) return; m.fatigue = ZT.clamp(m.fatigue + n, 0, 100); },
  fatigueAll(s, c, n) { for (const m of ZT.State.alive(s)) m.fatigue = ZT.clamp(m.fatigue + n, 0, 100); ZT.X.d(c, `party ${n > 0 ? '+' : ''}${n} fatigue`); },
  morale(s, c, n) { for (const m of ZT.State.alive(s)) m.morale = ZT.clamp(m.morale + n, 0, 100); ZT.X.d(c, `morale ${n > 0 ? '+' : ''}${n}`); },
  moraleM(s, c, m, n) { if (!m || !m.alive) return; m.morale = ZT.clamp(m.morale + n, 0, 100); ZT.X.d(c, `${m.name} morale ${n > 0 ? '+' : ''}${n}`); },
  noise(s, c, n) { s.zombie.noise = ZT.clamp(s.zombie.noise + n, 0, 100); if (n > 0) ZT.X.d(c, `noise +${n}`); },
  horde(s, c, n) { s.zombie.horde = ZT.clamp(s.zombie.horde + n, 0, 100); ZT.X.d(c, `horde pressure ${n > 0 ? '+' : ''}${n}`); },
  wear(s, c, sub, n) {
    if (!s.vehicle.has) return;
    s.vehicle[sub] = ZT.clamp(s.vehicle[sub] - n, 0, 100);
    ZT.X.d(c, `${sub} -${n}`);
  },
  repair(s, c, sub, n) { if (!s.vehicle.has) return; s.vehicle[sub] = ZT.clamp(s.vehicle[sub] + n, 0, 100); ZT.X.d(c, `${sub} +${n}`); },
  breakdown(s, c, sub) {
    if (!s.vehicle.has) return;
    s.vehicle.broken = sub; s.stats.breakdowns++;
    ZT.X.d(c, `${sub.toUpperCase()} FAILED`);
  },
  loseVehicle(s, c, why) {
    if (!s.vehicle.has) return;
    s.vehicle.has = false; s.vehicle.broken = null;
    // what can be carried on foot
    for (const k of ZT.ITEM_ORDER) {
      const cap = Math.floor(ZT.ITEMS[k].cap * ZT.X.footCap(k));
      if (s.inv[k] > cap) { ZT.X.d(c, `left behind ${ZT.X.unit(k, ZT.round1(s.inv[k] - cap))}`); s.inv[k] = cap; }
    }
    ZT.X.d(c, 'ON FOOT');
    ZT.State.log(s, `The station wagon is gone (${why}). You go on by foot.`, true);
    s.flags.lostVehicle = (s.flags.lostVehicle || 0) + 1;
  },
  gainVehicle(s, c, name) {
    s.vehicle = { has: true, engine: ZT.rint(s, 45, 75), tires: ZT.rint(s, 40, 75), electrical: ZT.rint(s, 45, 80), body: ZT.rint(s, 40, 80), broken: null, name: name || 'car' };
    ZT.X.d(c, `NEW VEHICLE: ${s.vehicle.name}`);
    ZT.State.log(s, `You have wheels again: a ${s.vehicle.name}.`, true);
  },
  /* delay: whole days pass as idle days; fractions slow tomorrow */
  delay(s, c, days) {
    const whole = Math.floor(days), frac = days - whole;
    for (let i = 0; i < whole; i++) ZT.Travel.idleDay(s);
    if (frac > 0) s.partialDelay = Math.min(0.9, s.partialDelay + frac);
    if (days > 0) ZT.X.d(c, days >= 1 ? `+${ZT.n(days)} ${ZT.plural(days, 'day')}` : 'half a day lost');
  },
  kill(s, c, m, cause) { if (!m || !m.alive) return; ZT.Party.kill(s, m, cause); ZT.X.d(c, `${m.name.toUpperCase()} DIED`); },
  missing(s, c, m) { if (!m || !m.alive) return; m.missing = true; ZT.X.d(c, `${m.name.toUpperCase()} MISSING`); ZT.State.log(s, `${m.name} is missing.`, true); },
  found(s, c, m) { if (!m || !m.alive || !m.missing) return; m.missing = false; ZT.X.d(c, `${m.name} is back`); ZT.State.log(s, `${m.name} came back.`, true); },
  shots(s, c, n) { const used = ZT.X.take(s, c, 'ammo', n); s.stats.shots += used; return used; },
  kills(s, n) { s.stats.kills += n; },
  flag(s, k, v) { s.flags[k] = v === undefined ? true : v; },
  log(s, text, notable) { ZT.State.log(s, text, notable); },
  /* pick a living member other than m */
  other(s, m) { const o = ZT.State.alive(s).filter((x) => x !== m); return o.length ? ZT.pick(s, o) : m; },
  /* random living member, prefer non-critical */
  someone(s) { const a = ZT.State.alive(s); return a.length ? ZT.pick(s, a) : (s.party[s.party.length - 1] || null); },
  /* role bonus helper: probability with role modifier */
  p(s, base, role, bonus) { return ZT.clamp(base + (role && ZT.State.hasRole(s, role) ? bonus : 0), 0.02, 0.98); },
  vehicleStatus(s) { return ZT.Vehicle.status(s); },
  /* generic loot from the region table. mult scales quantity. returns list of item keys.
     Deliberately mean: a good scavenge is a few days of food, never a resupply. */
  loot(s, c, mult, focus) {
    const reg = ZT.region(s);
    const diff = ZT.DIFF[s.difficulty];
    const found = [];
    const table = Object.assign({}, reg.loot);
    if (focus) table[focus] = (table[focus] || 1) * 4;
    const keys = Object.keys(table).filter((k) => table[k] > 0 && ZT.ITEMS[k]);
    if (!keys.length) return found;
    const total = keys.reduce((t, k) => t + table[k], 0);
    const picks = Math.max(1, Math.round((0.7 + ZT.rand(s) * 1.1) * mult));
    for (let i = 0; i < picks; i++) {
      let r = ZT.rand(s) * total, k = keys[0];
      for (const key of keys) { r -= table[key]; if (r <= 0) { k = key; break; } }
      const amt = ZT.X.lootAmount(s, k, mult * diff.salvage);
      if (amt > 0) { ZT.X.give(s, c, k, amt); found.push(k); }
    }
    if (ZT.roll(s, 0.18 * mult)) ZT.X.give(s, c, 'cash', ZT.rint(s, 4, 25));
    return found;
  },
  lootAmount(s, k, mult) {
    const base = { food: [10, 26], fuel: [1, 4], medicine: [1, 1], ammo: [4, 14], parts: [1, 1], tools: [1, 1], goods: [1, 2] }[k];
    if (!base) return 0;
    if (k === 'parts' || k === 'tools' || k === 'medicine') return ZT.roll(s, Math.min(0.7, 0.3 * mult)) ? 1 : 0;
    return Math.round(ZT.rint(s, base[0], base[1]) * mult);
  },
};
