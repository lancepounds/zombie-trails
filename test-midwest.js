/* Midwest summer encounters: context, real costs, chain safety, and lasting effects. */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const box = { console }; vm.createContext(box);
for (const f of fs.readdirSync(__dirname).filter(f => /^\d+_.*\.js$/.test(f) && Number(f.slice(0, 2)) <= 80).sort()) {
  vm.runInContext(fs.readFileSync(__dirname + '/' + f, 'utf8'), box, { filename: f });
}
const Z = box.ZT;
const ids = [
  'road_midwest_heat_buckle', 'road_midwest_ice_freezer',
  'z_midwest_beer_tent', 'z_midwest_sprinkler',
  'v_midwest_summer_flat', 'v_midwest_cabin_fan',
  'h_midwest_heat_headache', 'h_midwest_spoiled_lunch',
  'c_midwest_mosquitoes', 'c_midwest_storm_shelter',
];
const drinksId = 'p_midwest_cold_drinks';
const paid = {
  road_midwest_ice_freezer: [[0, 'goods', 1, true]],
  z_midwest_beer_tent: [[1, 'ammo', 10, true]],
  z_midwest_sprinkler: [[1, 'food', 1, true]],
  v_midwest_summer_flat: [[0, 'parts', 1, true], [1, 'tools', 1, false]],
  p_midwest_cold_drinks: [[0, 'goods', 1, true], [1, 'goods', 1, true]],
  v_midwest_cabin_fan: [[0, 'parts', 1, true], [1, 'tools', 1, false]],
  h_midwest_heat_headache: [[0, 'food', 2, true]],
  c_midwest_mosquitoes: [[0, 'goods', 1, true]],
  c_midwest_storm_shelter: [[1, 'goods', 1, true]],
};
const weatherFor = id => id === 'c_midwest_storm_shelter' ? 'storm' : 'heat';
function state(region = 'platte', opts = {}) {
  const s = Z.State.newGame({ difficulty: 'normal', seed: 42, ...opts });
  const leg = Z.LEGS.find(l => l.region === region);
  s.at = leg.from; s.legTo = leg.to; s.day = 12; s.weather = 'heat';
  Object.assign(s.inv, { food: 40, fuel: 8, medicine: 2, ammo: 20, parts: 2, tools: 1, goods: 2 });
  for (const m of s.party) { m.health = 60; m.fatigue = 60; m.morale = 55; }
  return s;
}
function resolve(s, id, choice) {
  const e = Z.Events.byId[id], inst = Z.Events.begin(s, e);
  const i = inst._choices.indexOf(e.choices[choice]);
  assert(i >= 0, id + ' choice must be affordable');
  return Z.Events.resolve(s, inst, i);
}
function valid(s) {
  for (const n of Object.values(s.inv)) assert(Number.isFinite(n) && n >= 0, 'invalid inventory');
  for (const m of s.party) for (const key of ['health', 'fatigue', 'morale', 'injury', 'illness']) {
    assert(Number.isFinite(m[key]) && m[key] >= 0 && m[key] <= 100, 'invalid survivor ' + key);
  }
  for (const key of Z.Vehicle.SUBS) assert(s.vehicle[key] >= 0 && s.vehicle[key] <= 100, 'invalid wagon');
  assert(s.partialDelay >= 0 && s.partialDelay <= 0.9);
  const saved = Z.State.deserialize(Z.State.serialize(s));
  for (const key of ['inv', 'party', 'vehicle', 'stats', 'partialDelay']) {
    assert.equal(JSON.stringify(saved[key]), JSON.stringify(s[key]), key + ' must survive a save');
  }
}

// Cosmetic repair metadata follows the selected action; no phantom spare on a patch or drive-away.
assert.equal(resolve(state(), 'v_midwest_summer_flat', 0).animation, 'tire_change');
assert.equal(resolve(state(), 'v_midwest_summer_flat', 1).animation, null);
assert.equal(resolve(state(), 'v_midwest_summer_flat', 2).animation, null);
assert.equal(resolve(state(), 'v_flat_slow', 1).animation, 'tire_change');
assert.equal(resolve(state(), 'v_flat_slow', 0).animation, null);
const tireState=state(), tireContext={d:[]};
Z.Vehicle.repairWithParts(tireState,tireContext,'tires');
assert.equal(tireContext.animation,'tire_change','workshop spare-tire repairs use the same animation');
const emptyState=state(), emptyContext={d:[]}; emptyState.inv.parts=0;
Z.Vehicle.repairWithParts(emptyState,emptyContext,'tires');
assert(!emptyContext.animation,'no animation without a spare part');

for (const id of ids) {
  const e = Z.Events.byId[id]; assert(e, id);
  for (const region of Object.keys(Z.REGIONS)) for (const wx of Object.keys(Z.WEATHER)) {
    const s = state(region); s.weather = wx;
    const weatherOK = id === 'c_midwest_mosquitoes' ? ['heat', 'clear', 'rain'].includes(wx)
      : id === 'c_midwest_storm_shelter' ? ['rain', 'storm'].includes(wx) : wx === 'heat';
    assert.equal(Z.Events.eligible(s, e.when).includes(e), e.regions.includes(region) && weatherOK, id + ' region/weather');
    assert(!Z.Events.eligible(s, e.when === 'camp' ? 'travel' : 'camp').includes(e), id + ' timing');
    s.day = 31;
    assert(!Z.Events.eligible(s, e.when).includes(e), id + ' must not describe summer in October');
  }
  const s = state(e.regions[0]); s.weather = weatherFor(id);
  Z.Events.begin(s, e);
  assert(!Z.Events.eligible(s, e.when).includes(e), id + ' cooldown');
  const saved = Z.State.deserialize(Z.State.serialize(s));
  assert(!Z.Events.eligible(saved, e.when).includes(e), id + ' saved cooldown');
  if (e.cat === 'vehicle') {
    for (const broken of [null, 'engine', 'tires']) {
      const s = state(); s.vehicle.broken = broken;
      assert.equal(Z.Events.eligible(s, 'travel').includes(e), !broken, id + ' do not interrupt another breakdown');
      s.vehicle.has = false;
      assert(!Z.Events.eligible(s, 'travel').includes(e), id + ' requires a wagon');
    }
  }
  if (e.cat === 'camp') for (const node of Object.keys(Z.NODES)) {
    const s = state(); s.at = node; s.legTo = null; s.weather = weatherFor(id);
    assert.equal(Z.Events.eligible(s, 'camp').includes(e), ['omaha', 'kearney', 'ogallala', 'chimney'].includes(node), id + ' camp location');
  }
}
for (const region of Object.keys(Z.REGIONS)) for (const when of ['camp', 'travel']) {
  const s = state(region);
  assert(!Z.Events.eligible(s, when).includes(Z.Events.byId[drinksId]), 'drinks must never fire independently');
  assert.equal(Z.Events.choose(s, when, [Z.Events.byId[drinksId]]), null);
}
for (const [id, choices] of Object.entries(paid)) for (const [i, item, cost, consumed] of choices) {
  const s = state(); s.inv[item] = cost - 0.1;
  const e = Z.Events.byId[id];
  assert(!Z.Events.begin(s, e)._choices.includes(e.choices[i]), id + ' underfunded choice');
  s.inv[item] = cost; resolve(s, id, i);
  assert.equal(s.inv[item], consumed ? 0 : cost, id + ' exact cost / reusable tools');
}

// A guaranteed repair reaches the stand, carries fatigue into mileage, and survives saves.
const flat = state(); flat.inv.parts = 1;
const beforeMiles = Z.Travel.expectedMiles(flat);
const result = resolve(flat, 'v_midwest_summer_flat', 0);
assert.equal(result.next.id, drinksId);
assert.equal(flat.inv.parts, 0); assert.equal(flat.vehicle.broken, null);
assert(flat.party.every(m => m.fatigue > 60 && m.morale < 55));
assert(Z.Travel.expectedMiles(flat) < beforeMiles, 'heat fatigue must slow later travel');
assert(flat.partialDelay > 0, 'repair must cost progress');
assert(result.deltas.some(d => /fatigue/.test(d)) && result.deltas.some(d => /morale/.test(d)), 'outcome must show costs');
valid(flat);
const beer = Z.State.deserialize(Z.State.serialize(flat));
const lemonade = Z.State.deserialize(Z.State.serialize(flat));
const keepGoing = Z.State.deserialize(Z.State.serialize(flat));
resolve(beer, drinksId, 0); resolve(lemonade, drinksId, 1); resolve(keepGoing, drinksId, 3);
assert(beer.party[0].morale > lemonade.party[0].morale, 'beer favors morale');
assert(lemonade.party[0].fatigue < beer.party[0].fatigue, 'longer rest favors recovery');
assert.equal(keepGoing.party[0].fatigue, flat.party[0].fatigue, 'skipping does not cure fatigue');
assert.equal(beer.inv.goods, flat.inv.goods - 1); assert.equal(lemonade.inv.goods, flat.inv.goods - 1);

// Explicitly cover both sides of the repair gamble; failure must return to normal repairs.
const roll = Z.roll;
try {
  for (const success of [true, false]) for (const choice of [1, 2]) {
    Z.roll = () => choice === 1 ? success : !success;
    const s = state(); const out = resolve(s, 'v_midwest_summer_flat', choice);
    assert.equal(out.next && out.next.id, success ? drinksId : null);
    assert.equal(s.vehicle.broken, success ? null : 'tires');
    if (!success) {
      assert.equal(s.stats.breakdowns, 1);
      Z.Vehicle.repairWithParts(s, { d: [] }, 'tires');
      assert.equal(s.vehicle.broken, null, 'normal repair must recover a failed flat');
    }
    valid(s);
  }
} finally { Z.roll = roll; }

let outcomes = 0;
for (const id of [...ids, drinksId]) {
  const e = Z.Events.byId[id];
  assert.equal(typeof Z.R.scenes[e.art], 'function', id + ' needs artwork');
  for (const difficulty of ['easy', 'normal', 'hard', 'nightmare']) for (const partySize of [1, 5]) {
    for (const vehicle of [true, false]) for (const stocked of [true, false]) for (let seed = 1; seed <= 12; seed++) {
      for (let choice = 0; choice < e.choices.length; choice++) {
        const s = state('missouri', { difficulty, partySize, seed });
        s.weather = weatherFor(id); s.vehicle.has = vehicle;
        if (!stocked) for (const k of Object.keys(s.inv)) s.inv[k] = 0;
        if (id !== drinksId && !Z.Events.eligible(s, e.when).includes(e)) continue;
        const inst = Z.Events.begin(s, e);
        assert(inst._choices.length, id + ' must have an affordable fallback');
        const i = inst._choices.indexOf(e.choices[choice]);
        if (i < 0) continue;
        const target = inst._c.m;
        if (target) assert(inst.text.includes(target.name), id + ' targets the person named in the story');
        const others = target && s.party.filter(m => m !== target).map(m => JSON.stringify(m));
        const out = Z.Events.resolve(s, inst, i);
        assert(out.text && !/undefined|NaN/.test(out.text), id + ' readable outcome');
        if (target) assert.deepEqual(s.party.filter(m => m !== target).map(m => JSON.stringify(m)), others, id + ' changed another survivor');
        if (out.next) {
          assert.equal(out.next.id, drinksId);
          assert(out.next._choices.length >= 2, 'drinks have free alternatives');
        }
        valid(s); outcomes++;
      }
    }
  }
}
console.log(`Midwest checks passed: 10 random encounters + 1 linked stop; weather, regions, resource gates, repair branches, travel effects, saves, and ${outcomes} outcomes.`);
