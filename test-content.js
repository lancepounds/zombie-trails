/* Regional content contracts: availability, scarce supplies, and every outcome. */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const box = { console }; vm.createContext(box);
for (const f of fs.readdirSync(__dirname).filter(f => /^\d+_.*\.js$/.test(f) && Number(f.slice(0, 2)) <= 80).sort()) {
  vm.runInContext(fs.readFileSync(__dirname + '/' + f, 'utf8'), box, { filename: f });
}
const Z = box.ZT;
const ids = [
  'road_missouri_seed_spill', 'road_missouri_pump_ledger', 'road_missouri_county_barricade', 'road_missouri_feed_store',
  'road_lava_cinder_drift', 'road_owyhee_canal_gate', 'road_bear_cattle_gate',
  'z_missouri_silo_shadow', 'z_missouri_ditch_hands', 'z_missouri_weigh_station',
  'z_lava_tube_echo', 'z_owyhee_mailboxes', 'z_wasatch_carwash',
  'v_missouri_cottonwood_filter', 'v_laramie_roof_lashings',
  'h_missouri_wet_boots', 'h_missouri_grain_dust', 'h_lava_heel_blister',
  'c_missouri_flood_marker', 'c_owyhee_porch_light',
];
const paid = {
  road_missouri_feed_store: [0, 'tools', 1, false],
  z_missouri_silo_shadow: [1, 'ammo', 6, true],
  z_lava_tube_echo: [2, 'ammo', 8, true],
  z_owyhee_mailboxes: [1, 'goods', 1, true],
  z_wasatch_carwash: [2, 'ammo', 10, true],
  v_laramie_roof_lashings: [1, 'parts', 1, true],
  h_missouri_wet_boots: [1, 'medicine', 1, true],
  h_missouri_grain_dust: [1, 'medicine', 1, true],
  h_lava_heel_blister: [1, 'medicine', 1, true],
};
function state(region, opts = {}) {
  const s = Z.State.newGame({ difficulty: 'normal', seed: 42, ...opts });
  const leg = Z.LEGS.find(l => l.region === region);
  s.at = leg.from; s.legTo = leg.to; s.day = 20;
  Object.assign(s.inv, { food: 40, fuel: 8, medicine: 2, ammo: 20, parts: 2, tools: 1, goods: 2 });
  for (const m of s.party) { m.health = 60; m.fatigue = 45; m.morale = 60; }
  return s;
}
function valid(s) {
  for (const n of Object.values(s.inv)) assert(Number.isFinite(n) && n >= 0, 'invalid inventory');
  for (const m of s.party) for (const key of ['health', 'fatigue', 'morale', 'injury', 'illness']) {
    assert(Number.isFinite(m[key]) && m[key] >= 0 && m[key] <= 100, 'invalid survivor ' + key);
  }
  for (const key of Z.Vehicle.SUBS) assert(Number.isFinite(s.vehicle[key]) && s.vehicle[key] >= 0 && s.vehicle[key] <= 100);
  assert(Number.isFinite(s.rng) && Number.isFinite(s.partialDelay));
  const saved = Z.State.deserialize(Z.State.serialize(s));
  assert.equal(saved.stats.events, s.stats.events, 'event state must survive a save');
}
let outcomes = 0;
const categories = {};
for (const id of ids) {
  const event = Z.Events.byId[id];
  assert(event, id);
  categories[event.cat] = (categories[event.cat] || 0) + 1;
  assert.equal(typeof Z.R.scenes[event.art], 'function', id + ' needs existing artwork');
  for (const region of Object.keys(Z.REGIONS)) {
    const s = state(region);
    assert.equal(Z.Events.eligible(s, event.when).includes(event), event.regions.includes(region), id + ' region');
    assert(!Z.Events.eligible(s, event.when === 'camp' ? 'travel' : 'camp').includes(event), id + ' timing');
  }
  if (paid[id]) {
    const [i, resource, cost, consumed] = paid[id];
    const s = state(event.regions[0]);
    s.inv[resource] = cost - 1;
    assert(!Z.Events.begin(s, event)._choices.includes(event.choices[i]), id + ' unaffordable choice');
    s.inv[resource] = cost;
    const inst = Z.Events.begin(s, event), index = inst._choices.indexOf(event.choices[i]);
    assert(index >= 0, id + ' affordable choice');
    Z.Events.resolve(s, inst, index);
    assert.equal(s.inv[resource], consumed ? 0 : cost, id + ' exact payment');
  }
  // Exercise all visible choices, including the chance branches the AI may avoid.
  for (const difficulty of ['easy', 'normal', 'hard', 'nightmare']) for (const partySize of [1, 5]) {
    for (const vehicle of [true, false]) for (const stocked of [true, false]) for (let seed = 1; seed <= 20; seed++) {
      for (let i = 0; i < event.choices.length; i++) {
        const s = state(event.regions[0], { difficulty, partySize, seed });
        s.vehicle.has = vehicle;
        s.weather = seed % 2 ? 'clear' : 'rain';
        s.zombie.horde = seed % 3 ? 5 : 90;
        if (!stocked) for (const k of Object.keys(s.inv)) s.inv[k] = 0;
        if (event.cond && !event.cond(s)) continue;
        const inst = Z.Events.begin(s, event);
        const index = inst._choices.indexOf(event.choices[i]);
        assert(inst.choices.length > 0, id + ' must have a fallback');
        if (index < 0) continue;
        const target = inst._c.m;
        if (target) assert(inst.text.includes(target.name), id + ' describes the affected survivor');
        const others = target && Z.State.alive(s).filter(m => m !== target).map(m => JSON.stringify(m));
        const result = Z.Events.resolve(s, inst, index);
        assert.equal(typeof result.text, 'string');
        assert(result.text.length && !/undefined|NaN/.test(result.text), id + ' result');
        if (target) assert.deepEqual(Z.State.alive(s).filter(m => m !== target).map(m => JSON.stringify(m)), others, id + ' treated the wrong survivor');
        valid(s); outcomes++;
      }
    }
  }
  if (event.cat === 'vehicle') {
    const s = state(event.regions[0]); s.vehicle.has = false;
    assert(!Z.Events.eligible(s, 'travel').includes(event), id + ' needs a wagon');
  }
}
assert.deepEqual(categories, { road: 7, zombie: 6, vehicle: 2, health: 3, camp: 2 });
const otherStop = state('bear'); otherStop.legTo = null;
assert(!Z.Events.eligible(otherStop, 'camp').some(e => e.id === 'c_missouri_flood_marker'), 'Missouri camp must not leak to other landmarks');
console.log(`Regional content checks passed: 20 events, local eligibility, paid choices, artwork, solo/on-foot play, saves, and ${outcomes} resolved outcomes.`);
