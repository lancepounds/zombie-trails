/* Inspection must be safe to repeat without changing the survival simulation. */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const box = { console }; vm.createContext(box);
for (const file of fs.readdirSync(__dirname).filter(f => /^[0-7]\d_.*\.js$/.test(f)).sort()) {
  vm.runInContext(fs.readFileSync(__dirname + '/' + file, 'utf8'), box, { filename: file });
}
const Z = box.ZT;
function freeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return value;
}
for (const count of [1, 3, 5]) for (const weather of Object.keys(Z.WEATHER)) {
  const s = Z.State.newGame({ seed: 173, partySize: count });
  Object.assign(s.inv, { food: 95, fuel: 12, medicine: 2, ammo: 17, parts: 1 });
  s.party[0].trait = 'light_eater'; s.weather = weather;
  const before = Z.State.serialize(s); freeze(s);
  for (let repeat = 0; repeat < 3; repeat++) for (const spot of Z.Wagon.parts) {
    const info = Z.Wagon.describe(s, spot.key, count - 1);
    assert(info.title && info.lines.every(line => typeof line === 'string' && line.length));
    if (spot.key === 'rack') assert(info.lines.join(' ').includes(`${Z.n(Z.Party.foodNeed(s))} lb/day`), 'food estimates honor traits and rations');
    if (spot.key === 'cabin') assert.equal(info.member.index, count - 1);
  }
  assert.equal(Z.State.serialize(s), before, 'repeat inspection never consumes days, supplies, or encounter RNG');
}
const s = Z.State.newGame({ seed: 19 });
s.party[0].alive = false; s.party[1].missing = true; s.party[2].isolated = true;
assert.equal(Z.Wagon.passengers(s).length, 3, 'dead and missing travelers do not appear in the cabin');
assert.equal(Z.Wagon.describe(s, 'cabin', 0).member.index, 2, 'invalid/dead selection falls back to a present traveler');
assert.match(Z.Wagon.describe(s, 'cabin', 2).member.quote, /distance/);
s.party[2].isolated = false; s.party[2].inf = 'bitten';
assert.match(Z.Wagon.describe(s, 'cabin', 2).member.quote, /before we go/);
s.party[2].infStable = true;
assert.match(Z.Wagon.describe(s, 'cabin', 2).member.quote, /bandage/);
s.vehicle.broken = 'tires'; s.vehicle.tires = 0;
assert.match(Z.Wagon.describe(s, 'tires').lines.join(' '), /broken.*flat side/);
assert.match(Z.Wagon.describe(s, 'rack').lines.join(' '), /Empty straps/);
Z.Travel.takeLeg(s, 'kearney');
assert(Z.Wagon.place(s).includes(Z.NODES.kearney.name), 'the inspection follows the real destination');
s.vehicle.has = false;
assert.equal(Z.Wagon.describe(s, 'engine').title, 'On foot');
console.log('Wagon checks passed: repeatable read-only inspection, 1–5 travelers, all weather, true food needs, absent travelers, isolation, infection, breakdowns, empty supplies, route context, and vehicle loss.');
