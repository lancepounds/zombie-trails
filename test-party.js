/* Party size, mechanical traits, estimates, migration, and display preferences. */
const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const box = { console }; vm.createContext(box);
for (const f of fs.readdirSync(__dirname).filter(f => /^[0-7]\d_.*\.js$/.test(f)).sort().concat('82_atlas.js')) {
  vm.runInContext(fs.readFileSync(__dirname + '/' + f, 'utf8'), box, { filename: f });
}
const Z = box.ZT;
const make = (partySize = 5, trait = 'steady') => {
  const s = Z.State.newGame({ partySize, traits: Array(5).fill(trait), difficulty: 'normal', seed: 42 });
  Object.assign(s.inv, { food: 200, fuel: 40 });
  Z.Travel.takeLeg(s, 'kearney');
  return s;
};
const near = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
for (let n = 1; n <= 5; n++) {
  const s = make(n);
  assert.equal(s.party.length, n);
  assert.equal(Z.Party.foodNeed(s), 2 * n);
  assert.equal(Z.State.deserialize(Z.State.serialize(s)).party.length, n);
}
assert.equal(make(0).party.length, 1);
assert.equal(make(99).party.length, 5);
const baseline = make(), faster = make(5, 'roadwise'), frugal = make(5, 'careful');
near(Z.Travel.expectedMiles(faster), Z.Travel.expectedMiles(baseline) * 1.12);
near(Z.Vehicle.mpg(frugal), Z.Vehicle.mpg(baseline) / 0.88);
faster.party.forEach(m => { m.isolated = true; });
near(Z.Travel.expectedMiles(faster), Z.Travel.expectedMiles(baseline));
const oneHelper = make(); oneHelper.party[0].trait = 'roadwise';
near(Z.Travel.expectedMiles(oneHelper), Z.Travel.expectedMiles(baseline) * 1.04);
oneHelper.party[0].fatigue = 85;
near(Z.Party.travelBonuses(oneHelper).mileage, 1);
oneHelper.party[0].fatigue = 0; oneHelper.party[0].missing = true;
near(Z.Party.travelBonuses(oneHelper).mileage, 1);
const quiet = make(5, 'quiet');
baseline.zombie.noise = quiet.zombie.noise = 30;
Z.Travel.pressureTick(baseline, 'travel'); Z.Travel.pressureTick(quiet, 'travel');
assert.equal(quiet.zombie.noise, baseline.zombie.noise - 6);
const light = make(1, 'light_eater'), normal = make(1), hardy = make(1, 'hardy');
assert.equal(Z.Party.foodNeed(light), 1.6);
Z.Party.dailyTick(light, 'travel'); Z.Party.dailyTick(normal, 'travel'); Z.Party.dailyTick(hardy, 'travel');
assert.equal(light.inv.food, 198.4);
assert.equal(normal.inv.food, 198);
assert.equal(hardy.party[0].fatigue, normal.party[0].fatigue - 3);
assert.equal(normal.party[0].morale, hardy.party[0].morale + 1);
light.vehicle.has = false;
assert.equal(Z.Party.foodNeed(light), 1.8);
const old = make(); old.party.forEach(m => { delete m.trait; });
const migrated = Z.State.deserialize(Z.State.serialize(old));
assert(migrated.party.every(m => m.trait === 'steady'));
const s = make(3, 'careful'), before = Z.State.serialize(s), leg = Z.currentLeg(s);
const estimate = Z.Atlas.legEstimate(s, leg);
near(estimate.fuel, leg.miles / Z.Vehicle.mpg(s));
assert.equal(estimate.days, Math.ceil(leg.miles / Z.Travel.expectedMiles(s)));
assert.equal(estimate.food, estimate.days * Z.Party.foodNeed(s));
Z.Story.forecast(s); Z.Travel.expectedMiles(s);
Z.Display.setTheme('dark');
assert.equal(Z.Display.palette().paper, '#181818');
assert.match(Z.Atlas.svg(s, { selected: s.at, zoom: 1 }), /fill:#181818/);
Z.Display.setTheme('light');
assert.equal(Z.Display.palette().paper, '#e8e8e8');
assert.equal(Z.State.serialize(s), before, 'estimates and themes must not change the journey or RNG');
Z.Display.setTheme('unknown'); assert.equal(Z.Display.mode, 'light');
console.log('Party checks passed: 1–5 travelers, six traits, bonus caps, inactive helpers, food use, estimates, old saves, and both themes.');
