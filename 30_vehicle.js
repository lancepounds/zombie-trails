/* ZOMBIE TRAILS — vehicle: wear, breakdowns, fuel */
'use strict';
ZT.Vehicle = {
  SUBS: ['engine', 'tires', 'electrical', 'body'],
  overall(s) {
    const v = s.vehicle;
    return 0.35 * v.engine + 0.25 * v.tires + 0.2 * v.electrical + 0.2 * v.body;
  },
  status(s) {
    if (!s.vehicle.has) return 'On foot';
    if (s.vehicle.broken) return 'Broken down';
    const o = ZT.Vehicle.overall(s);
    return o >= 75 ? 'Good' : o >= 50 ? 'Worn' : o >= 25 ? 'Poor' : 'Failing';
  },
  subStatus(v) { return v >= 75 ? 'good' : v >= 50 ? 'worn' : v >= 25 ? 'poor' : 'failing'; },
  speedFactor(s) {
    if (!s.vehicle.has) return 1;
    const o = ZT.Vehicle.overall(s);
    const tires = s.vehicle.tires < 30 ? 0.85 : 1;
    return (o >= 75 ? 1 : o >= 50 ? 0.95 : o >= 25 ? 0.85 : 0.7) * tires;
  },
  mpg(s) {
    const reg = ZT.region(s);
    const w = ZT.State.weight(s);
    let mpg = 18 * ZT.PACE[s.pace].fuelEff * reg.fuelEff;
    if (s.vehicle.engine < 50) mpg *= 0.85;
    if (s.vehicle.engine < 25) mpg *= 0.85;
    mpg *= 1 - Math.min(0.2, (w / 1500) * 0.15);
    if (s.weather === 'snow' || s.weather === 'storm') mpg *= 0.85;
    return mpg;
  },
  /* miles you could still drive on the fuel you have */
  range(s) { return s.vehicle.has ? s.inv.fuel * ZT.Vehicle.mpg(s) : 0; },
  dailyWear(s, milesToday) {
    if (!s.vehicle.has || milesToday <= 0) return;
    const reg = ZT.region(s);
    const diff = ZT.DIFF[s.difficulty];
    const wx = ZT.WEATHER[s.weather];
    const load = 1 + Math.min(0.3, (ZT.State.weight(s) / 1500) * 0.3);
    let total = 2.0 * ZT.PACE[s.pace].wear * diff.wear * reg.wear * wx.wear * load * (milesToday / ZT.PACE[s.pace].mpd);
    const split = { engine: 0.35, tires: 0.30, electrical: 0.15, body: 0.20 };
    if (reg.terrain === 'mountain') { split.engine = 0.45; split.tires = 0.3; split.electrical = 0.1; split.body = 0.15; }
    if (reg.terrain === 'highway') { split.tires = 0.38; split.body = 0.25; split.engine = 0.25; split.electrical = 0.12; }
    if (s.weather === 'rain' || s.weather === 'storm') { split.electrical += 0.15; split.engine -= 0.1; split.body -= 0.05; }
    for (const k of ZT.Vehicle.SUBS) {
      const amt = total * split[k] * (0.6 + ZT.rand(s) * 0.8);
      s.vehicle[k] = ZT.clamp(s.vehicle[k] - amt, 0, 100);
    }
  },
  breakdownChance(s) {
    if (!s.vehicle.has || s.vehicle.broken) return 0;
    const diff = ZT.DIFF[s.difficulty];
    let p = 0.008;
    for (const k of ZT.Vehicle.SUBS) {
      const v = s.vehicle[k];
      if (v < 60) p += Math.pow((60 - v) / 60, 2) * 0.11;
    }
    p *= ZT.PACE[s.pace].accident * (0.7 + 0.3 * diff.wear);
    if (ZT.region(s).terrain === 'mountain') p *= 1.4;
    if (ZT.State.hasRole(s, 'mechanic')) p *= 0.85;
    return ZT.clamp(p, 0, 0.35);
  },
  /* choose the subsystem that fails: weighted toward the worst */
  pickFailing(s) {
    let best = null, bestW = -1;
    for (const k of ZT.Vehicle.SUBS) {
      const w = (100 - s.vehicle[k]) * (0.5 + ZT.rand(s));
      if (w > bestW) { bestW = w; best = k; }
    }
    return best;
  },
  /* repair with parts: always works, costs a set and time */
  repairWithParts(s, c, sub) {
    if (s.inv.parts <= 0) return 'No spare parts.';
    ZT.X.take(s, c, 'parts', 1);
    s.vehicle[sub] = ZT.clamp(s.vehicle[sub] + 45, 0, 100);
    s.vehicle.broken = null;
    const mech = ZT.State.hasRole(s, 'mechanic');
    ZT.X.delay(s, c, mech ? 0.5 : 1);
    ZT.X.d(c, `${sub} +45`);
    return `The ${sub === 'tires' ? 'tire' : sub} is ${sub === 'tires' ? 'changed' : 'fixed'} with the spare parts${mech ? ' in a few hours' : ' after a long day'}.`;
  },
  /* jury-rig without parts: chance-based */
  juryRig(s, c, sub) {
    const mechM = ZT.State.byRole(s, 'mechanic');
    const mech = !!mechM;
    const mechName = mech ? mechM.name : '';
    const tools = s.inv.tools > 0;
    const p = ZT.clamp(0.4 + (mech ? 0.25 : 0) + (tools ? 0.15 : 0) - (s.vehicle[sub] < 15 ? 0.15 : 0), 0.1, 0.9);
    ZT.X.delay(s, c, 1);   // a day passes here, and the mechanic may not survive it
    ZT.X.noise(s, c, 5);
    if (ZT.roll(s, p)) {
      s.vehicle[sub] = ZT.clamp(s.vehicle[sub] + 18, 0, 100);
      s.vehicle.broken = null;
      ZT.X.d(c, `${sub} +18`);
      return `${mech && mechM.alive ? mechName + ' coaxes' : 'Everyone argues over the manual and somehow coaxes'} the ${sub === 'tires' ? 'tire' : sub} back into service. It will not last forever.`;
    }
    s.vehicle[sub] = ZT.clamp(s.vehicle[sub] - 4, 0, 100);
    return `A day of ${tools ? 'skinned knuckles' : 'improvising with a butter knife'} and the ${sub === 'tires' ? 'tire' : sub} is no better. Possibly worse.`;
  },
  /* maintenance day at the travel menu: uses a part on the worst subsystem */
  service(s, c) {
    if (!s.vehicle.has) return 'There is no vehicle to service.';
    if (s.inv.parts <= 0) return 'No spare parts to fit.';
    let worst = 'engine';
    for (const k of ZT.Vehicle.SUBS) if (s.vehicle[k] < s.vehicle[worst]) worst = k;
    ZT.X.take(s, c, 'parts', 1);
    s.vehicle[worst] = ZT.clamp(s.vehicle[worst] + 40, 0, 100);
    ZT.X.delay(s, c, ZT.State.hasRole(s, 'mechanic') ? 0.5 : 1);
    ZT.X.d(c, `${worst} +40`);
    return `A set of parts goes into the ${worst}. The wagon sounds a little less like it is dying.`;
  },
  describeBreakdown(s, sub) {
    return {
      engine: 'The engine coughs, knocks twice, and dies. The smell is not encouraging.',
      tires: 'A tire lets go with a bang that everyone assumes is a gunshot. It is not. It is worse: it is a tire.',
      electrical: 'The dash goes dark, the wipers stop mid-sweep, and the engine follows. Something electrical has given up.',
      body: 'The exhaust is dragging and a door will no longer close. The frame has taken one hit too many.',
    }[sub];
  },
};
