/* ZOMBIE TRAILS — SCAVENGE THE BLOCK.
   A short, crude, top-down salvage run. Greed is the danger.
   Engine-only: no DOM. The renderer draws world state; the UI feeds input. */
'use strict';
ZT.Scavenge = {
  W: 40, H: 18, TILE: 8,

  /* ---------- menu-driven mode (accessible alternative, and the abstract path) ---------- */
  menuOptions(s) {
    const reg = ZT.region(s);
    const t = ZT.Travel.threat(s);
    return [
      { id: 'quick', label: 'Quick sweep', hint: 'half a day, little noise', risk: 0.10 + t * 0.10, mult: 0.45, hours: 0.5, noise: 7 },
      { id: 'thorough', label: 'Work the whole block', hint: 'a day, more noise, more found', risk: 0.28 + t * 0.24, mult: 0.95, hours: 1.0, noise: 17 },
      { id: 'break', label: 'Break into the locked places', hint: 'loud; best odds of medicine and parts', risk: 0.44 + t * 0.32, mult: 1.35, hours: 1.2, noise: 30 },
    ];
  },
  /* Food and fuel are what a search is FOR, so they are found reliably and scaled
     by how much the region has of each. Everything else stays a lucky extra. */
  staples(s, c, opt, boost) {
    const reg = ZT.region(s);
    const diff = ZT.DIFF[s.difficulty];
    const found = [];
    const foodBase = { quick: 11, thorough: 28, break: 37 }[opt.id] || 11;
    const foodScale = 0.6 + (reg.loot.food || 0) * 0.14;
    const food = Math.round(ZT.rint(s, Math.round(foodBase * 0.5), Math.round(foodBase * 1.25)) * foodScale * boost * diff.salvage);
    if (food > 0 && ZT.X.give(s, c, 'food', food) > 0) found.push('food');
    const fuelBase = { quick: 1, thorough: 4, break: 6 }[opt.id] || 1;
    const fuelScale = (reg.loot.fuel || 0) * 0.3;
    const fuel = Math.round(ZT.rint(s, 0, fuelBase) * fuelScale * boost * diff.salvage);
    if (fuel > 0 && ZT.X.give(s, c, 'fuel', fuel) > 0) found.push('fuel');
    return found;
  },
  menuRun(s, optId) {
    const opt = ZT.Scavenge.menuOptions(s).find((o) => o.id === optId) || ZT.Scavenge.menuOptions(s)[0];
    const c = { d: [] };
    s.stats.scavenges++;
    ZT.X.delay(s, c, opt.hours);
    ZT.X.noise(s, c, opt.noise);
    ZT.X.fatigueAll(s, c, Math.round(opt.hours * 12));
    const tools = s.inv.tools > 0 ? 1.15 : 1;
    const scout = ZT.State.hasRole(s, 'scout') ? 1.15 : 1;
    const boost = tools * scout;
    const found = ZT.Scavenge.staples(s, c, opt, boost)
      .concat(ZT.X.loot(s, c, opt.mult * boost, opt.id === 'break' ? (ZT.roll(s, 0.5) ? 'medicine' : 'parts') : null));
    let text = ZT.Scavenge.flavor(s, opt, found);
    let risk = opt.risk / (ZT.State.hasRole(s, 'scout') ? 1.3 : 1);
    if (ZT.roll(s, risk)) {
      const m = ZT.X.someone(s);
      if (ZT.roll(s, 0.35)) { ZT.X.bite(s, c, m); text += ` It goes wrong on the way out. ${m.name} is bitten.`; }
      else { ZT.X.injure(s, c, m, ZT.rint(s, 10, 22)); ZT.X.noise(s, c, 8); text += ` It goes wrong on the way out and ${m.name} comes back hurt.`; }
    }
    const deaths = []; while (s.pendingDeaths.length) deaths.push(s.party[s.pendingDeaths.shift()]);
    return { text, deltas: c.d, deaths };
  },
  flavor(s, opt, found) {
    const reg = ZT.region(s);
    const names = { food: 'food', fuel: 'fuel', medicine: 'medicine', ammo: 'ammunition', parts: 'parts', tools: 'tools', goods: 'trade goods' };
    const uniq = [...new Set(found)].map((k) => names[k]);
    const place = ZT.pick(s, {
      suburb: ['a cul-de-sac of split-levels', 'a strip mall', 'a row of garages', 'a church and its parking lot'],
      highway: ['a truck stop', 'a line of stalled semis', 'a state maintenance yard'],
      river: ['a boat ramp and bait shop', 'a row of river cabins', 'a flooded caravan park'],
      farm: ['a farmstead and two outbuildings', 'a co-op feed store', 'a grain bin and machine shed'],
      industry: ['a loading dock', 'a warehouse office', 'a container yard'],
      plains: ['a section road and two silos', 'a ranch house and a windbreak', 'an abandoned motel', 'a rest area and a weigh station'],
      hills: ['a hunting cabin', 'a ranger station', 'a gravel pit office'],
      mountain: ['a chained-off summit station', 'a snow shed and a plow depot', 'a chalet with the door open'],
      desert: ['a service station and a diner', 'a row of self-storage units', 'a dead RV park', 'a highway maintenance yard'],
    }[reg.terrain] || ['a row of buildings']);
    const base = {
      quick: `Twenty minutes through ${place}, taking only what is in reach.`,
      thorough: `Most of a day working ${place} properly, room by room.`,
      break: `${ZT.cap(place)}, and every locked thing in it opened with a pry bar and a great deal of noise.`,
    }[opt.id];
    if (!uniq.length) return base + ' Nothing worth carrying back.';
    return base + ' ' + ZT.cap(ZT.list(uniq)) + '.';
  },

  /* ---------- arcade mode ---------- */
  init(s) {
    const W = ZT.Scavenge.W, H = ZT.Scavenge.H;
    const g = {
      s, w: W, h: H,
      grid: new Uint8Array(W * H), // 0 open, 1 wall/building, 2 car
      containers: [], zombies: [], carry: [], noise: 0, time: 0, limit: 75,
      px: 2.5, py: H - 2.5, pvx: 0, pvy: 0,
      exitX: 2.5, exitY: H - 2.5,
      capacity: 5, over: null, msg: '', msgT: 0, flash: 0,
      lastNoiseX: 0, lastNoiseY: 0, noiseT: 0,
      hurt: 0, searchT: 0, searchTarget: null, steps: 0,
    };
    const R = () => ZT.rand(s);
    const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) g.grid[y * W + x] = v; };
    // border
    for (let x = 0; x < W; x++) { set(x, 0, 1); set(x, H - 1, 1); }
    for (let y = 0; y < H; y++) { set(0, y, 1); set(W - 1, y, 1); }
    // buildings
    const blocks = [];
    for (let i = 0; i < 9; i++) {
      const bw = 3 + Math.floor(R() * 6), bh = 3 + Math.floor(R() * 4);
      const bx = 2 + Math.floor(R() * (W - bw - 4)), by = 2 + Math.floor(R() * (H - bh - 4));
      let clash = false;
      for (const b of blocks) if (bx < b.x + b.w + 2 && bx + bw + 2 > b.x && by < b.y + b.h + 2 && by + bh + 2 > b.y) clash = true;
      if (clash) continue;
      if (bx < 7 && by > H - 8) continue; // keep the start clear
      blocks.push({ x: bx, y: by, w: bw, h: bh });
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) set(x, y, 1);
      // doorway
      const side = Math.floor(R() * 4);
      if (side === 0) set(bx + Math.floor(bw / 2), by, 0);
      else if (side === 1) set(bx + Math.floor(bw / 2), by + bh - 1, 0);
      else if (side === 2) set(bx, by + Math.floor(bh / 2), 0);
      else set(bx + bw - 1, by + Math.floor(bh / 2), 0);
    }
    // cars
    for (let i = 0; i < 10; i++) {
      const x = 1 + Math.floor(R() * (W - 2)), y = 1 + Math.floor(R() * (H - 2));
      if (g.grid[y * W + x] === 0 && !(x < 6 && y > H - 5)) set(x, y, 2);
    }
    // containers: place in open tiles, some inside buildings
    const kinds = ['food', 'food', 'fuel', 'medicine', 'ammo', 'parts', 'tools', 'goods'];
    let tries = 0;
    while (g.containers.length < 9 && tries < 500) {
      tries++;
      const x = 1 + Math.floor(R() * (W - 2)), y = 1 + Math.floor(R() * (H - 2));
      if (g.grid[y * W + x] !== 0) continue;
      if (Math.abs(x - g.exitX) + Math.abs(y - g.exitY) < 6) continue;
      if (g.containers.some((k) => Math.abs(k.x - x) + Math.abs(k.y - y) < 4)) continue;
      const locked = R() < 0.4;
      const kind = kinds[Math.floor(R() * kinds.length)];
      g.containers.push({ x: x + 0.5, y: y + 0.5, kind, locked, open: false, empty: false });
    }
    // zombies
    const density = ZT.region(s).density + s.zombie.horde / 200;
    const count = ZT.clamp(Math.round(4 + density * 12), 4, 16);
    for (let i = 0; i < count; i++) {
      let x, y, t = 0;
      do { x = 1 + Math.floor(R() * (W - 2)); y = 1 + Math.floor(R() * (H - 2)); t++; }
      while (t < 60 && (g.grid[y * W + x] !== 0 || (Math.abs(x - g.exitX) + Math.abs(y - g.exitY) < 9)));
      g.zombies.push({ x: x + 0.5, y: y + 0.5, vx: 0, vy: 0, tx: x + 0.5, ty: y + 0.5, alert: 0, wob: ZT.rand(s) * 6.28 });
    }
    return g;
  },

  solid(g, x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    if (xi < 0 || yi < 0 || xi >= g.w || yi >= g.h) return true;
    return g.grid[yi * g.w + xi] === 1;
  },
  blocked(g, x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    if (xi < 0 || yi < 0 || xi >= g.w || yi >= g.h) return true;
    const v = g.grid[yi * g.w + xi];
    return v === 1 || v === 2;
  },

  addNoise(g, n, x, y) {
    g.noise = ZT.clamp(g.noise + n, 0, 100);
    g.lastNoiseX = x; g.lastNoiseY = y; g.noiseT = 3.5;
    for (const z of g.zombies) {
      const d = Math.hypot(z.x - x, z.y - y);
      const reach = 6 + n * 0.35;
      if (d < reach) { z.tx = x; z.ty = y; z.alert = Math.max(z.alert, 1.2 + n / 40); }
    }
  },

  say(g, msg) { g.msg = msg; g.msgT = 2.6; },

  /* input: {up,down,left,right,action} */
  step(g, dt, input) {
    if (g.over) return;
    dt = Math.min(dt, 0.05);
    g.time += dt;
    if (g.msgT > 0) g.msgT -= dt;
    if (g.noiseT > 0) g.noiseT -= dt;
    if (g.flash > 0) g.flash -= dt;
    if (g.hurt > 0) g.hurt -= dt;

    // movement — keys are on/off, a thumbstick is analog
    let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    let mag = 1;
    if (input.vx || input.vy) {
      dx = input.vx; dy = input.vy;
      mag = ZT.clamp(Math.hypot(dx, dy), 0, 1);
    }
    const moving = (dx || dy) && mag > 0.08;
    if (moving) {
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const speed = 7.2 * mag;
      const nx = g.px + dx * speed * dt, ny = g.py + dy * speed * dt;
      const r = 0.32;
      if (!ZT.Scavenge.blocked(g, nx + Math.sign(dx) * r, g.py)) g.px = nx;
      if (!ZT.Scavenge.blocked(g, g.px, ny + Math.sign(dy) * r)) g.py = ny;
      g.steps += dt;
      // running makes noise; creeping makes much less
      ZT.Scavenge.addNoise(g, dt * 4.5 * mag * mag, g.px, g.py);
      g.searchT = 0; g.searchTarget = null;
    } else {
      g.noise = Math.max(0, g.noise - dt * 5.5);
    }

    // searching
    const near = g.containers.find((k) => !k.open && Math.hypot(k.x - g.px, k.y - g.py) < 1.1);
    if (input.action && near) {
      if (g.searchTarget !== near) { g.searchT = 0; g.searchTarget = near; }
      g.searchT += dt;
      ZT.Scavenge.addNoise(g, dt * (near.locked ? 26 : 9), g.px, g.py);
      const need = near.locked ? 2.2 : 1.1;
      if (g.searchT >= need) {
        near.open = true; g.searchT = 0; g.searchTarget = null;
        const s = g.s;
        if (ZT.roll(s, near.locked ? 0.9 : 0.68) && g.carry.length < g.capacity) {
          let amt = ZT.X.lootAmount(s, near.kind, (near.locked ? 1.5 : 1.0) * ZT.DIFF[s.difficulty].salvage);
          if (near.kind === 'food') amt = Math.round(amt * 2.4);
          if (near.kind === 'fuel') amt = Math.round(amt * 1.6);
          if (amt > 0) { g.carry.push({ kind: near.kind, amt }); ZT.Scavenge.say(g, `+ ${ZT.X.unit(near.kind, amt)}`); }
          else { near.empty = true; ZT.Scavenge.say(g, 'Empty.'); }
        } else if (g.carry.length >= g.capacity) { ZT.Scavenge.say(g, 'Hands full. Go back to the car.'); }
        else { near.empty = true; ZT.Scavenge.say(g, 'Empty.'); }
        if (near.locked) ZT.Scavenge.addNoise(g, 16, g.px, g.py);
      }
    } else if (!input.action) { g.searchT = 0; g.searchTarget = null; }

    // zombies
    for (const z of g.zombies) {
      z.alert = Math.max(0, z.alert - dt * 0.14);
      const dToP = Math.hypot(g.px - z.x, g.py - z.y);
      if (dToP < 4.5 && g.noise > 12) { z.tx = g.px; z.ty = g.py; z.alert = Math.max(z.alert, 1.4); }
      if (dToP < 1.9) { z.tx = g.px; z.ty = g.py; z.alert = Math.max(z.alert, 1.6); }
      const spd = z.alert > 0.4 ? 2.5 : 0.85;
      let tx = z.tx, ty = z.ty;
      if (z.alert <= 0.05 && Math.hypot(tx - z.x, ty - z.y) < 0.6) {
        z.wob += ZT.rand(g.s) * 2 - 1;
        z.tx = ZT.clamp(z.x + Math.cos(z.wob) * 4, 1, g.w - 2);
        z.ty = ZT.clamp(z.y + Math.sin(z.wob) * 4, 1, g.h - 2);
      }
      let vx = tx - z.x, vy = ty - z.y;
      const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l;
      // crude wall avoidance
      const nx2 = z.x + vx * spd * dt, ny2 = z.y + vy * spd * dt;
      if (!ZT.Scavenge.solid(g, nx2, z.y)) z.x = nx2; else z.tx = z.x + (ZT.rand(g.s) - 0.5) * 6;
      if (!ZT.Scavenge.solid(g, z.x, ny2)) z.y = ny2; else z.ty = z.y + (ZT.rand(g.s) - 0.5) * 6;
      // contact
      if (Math.hypot(z.x - g.px, z.y - g.py) < 0.55 && g.hurt <= 0) {
        g.hurt = 1.6; g.flash = 0.3;
        const s = g.s;
        if (g.carry.length && ZT.roll(s, 0.6)) { const lost = g.carry.pop(); ZT.Scavenge.say(g, `Dropped the ${lost.kind}!`); }
        else ZT.Scavenge.say(g, 'It has hold of you!');
        g.contact = (g.contact || 0) + 1;
        // shove it off
        const a = Math.atan2(g.py - z.y, g.px - z.x);
        z.x -= Math.cos(a) * 1.2; z.y -= Math.sin(a) * 1.2;
        z.alert = 2;
        ZT.Scavenge.addNoise(g, 10, g.px, g.py);
        if (g.contact >= 3) { ZT.Scavenge.finish(g, 'caught'); return; }
      }
    }

    // exit
    if (Math.hypot(g.px - g.exitX, g.py - g.exitY) < 1.1 && (g.carry.length > 0 || g.time > 2)) {
      if (input.action) { ZT.Scavenge.finish(g, 'left'); return; }
      if (g.msgT <= 0) ZT.Scavenge.say(g, 'At the car. Hold SEARCH to load up and go.');
    }

    if (g.time >= g.limit) ZT.Scavenge.finish(g, 'time');
  },

  finish(g, why) {
    if (g.over) return;
    const s = g.s;
    const c = { d: [] };
    s.stats.scavenges++;
    const hours = ZT.clamp(g.time / 75, 0.15, 1) * 0.9;
    ZT.X.delay(s, c, hours);
    ZT.X.noise(s, c, Math.round(g.noise * 0.35 + (g.contact || 0) * 5));
    ZT.X.fatigueAll(s, c, Math.round(8 + hours * 10));
    let text;
    if (why === 'left') {
      for (const item of g.carry) ZT.X.give(s, c, item.kind, item.amt);
      text = g.carry.length
        ? 'Back at the car with everything that would fit in five pairs of hands.'
        : 'Back at the car with nothing. Some blocks are like that.';
    } else if (why === 'time') {
      // leaving late costs you some of it
      const kept = g.carry.slice(0, Math.max(0, g.carry.length - 1));
      for (const item of kept) ZT.X.give(s, c, item.kind, item.amt);
      const m = ZT.X.someone(s); ZT.X.injure(s, c, m, ZT.rint(s, 8, 18));
      text = `The street fills in behind you and the run back to the car is not a walk. ${m.name} comes off worse and a bag is left in the road.`;
    } else {
      const kept = g.carry.slice(0, Math.floor(g.carry.length / 2));
      for (const item of kept) ZT.X.give(s, c, item.kind, item.amt);
      const m = ZT.X.someone(s);
      if (ZT.roll(s, 0.45)) { ZT.X.bite(s, c, m); text = `They get a hold on ${m.name} between two cars and it takes everyone to get them loose. Half of what was carried is somewhere in the street.`; }
      else { ZT.X.injure(s, c, m, ZT.rint(s, 14, 26)); text = `${m.name} is dragged down between two cars and comes out of it torn up but not bitten. Half the load is left where it fell.`; }
    }
    const deaths = []; while (s.pendingDeaths.length) deaths.push(s.party[s.pendingDeaths.shift()]);
    g.over = { why, text, deltas: c.d, deaths, carried: g.carry.slice() };
  },
};
