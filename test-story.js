const fs = require('fs'), vm = require('vm'), assert = require('assert');
const box = { console }; vm.createContext(box);
for (const f of fs.readdirSync(__dirname).filter(f => /^[0-7]\d_.*\.js$/.test(f)).sort()) {
  vm.runInContext(fs.readFileSync(__dirname + '/' + f, 'utf8'), box, { filename: f });
}
const Z = box.ZT;
for (const first of [0, 1, 2]) {
  for (const leaveCamp of [false, true]) {
    let s = Z.State.newGame({ difficulty: 'normal', seed: 42 });
    Object.assign(s.inv, { food: 100, fuel: 0, goods: 3 });
    s.day = 6; s.stats.travelDays = 3;
    assert.equal(Z.Story.due(s, 'camp'), null);
    assert.equal(Z.Story.due(s, 'travel'), 'story_red_scarf');
    let e = Z.Events.maybeFire(s, 'travel');
    Z.Events.resolve(s, e, first);
    assert.equal(Z.Story.due(s, 'travel'), null);
    s = Z.State.deserialize(Z.State.serialize(s));
    s.day += 6; s.miles += 100;
    e = Z.Events.maybeFire(s, 'travel');
    assert.equal(e.id, 'story_red_camp');
    Z.Events.resolve(s, e, leaveCamp ? e.choices.length - 1 : 0);
    s.day += 7; s.miles += 100;
    e = Z.Events.maybeFire(s, 'travel');
    assert.equal(e.id, 'story_red_return');
    assert.equal(e.choices.length, 1);
    Z.Events.resolve(s, e, 0);
    assert.equal(s.flags.roadMemories.length, 3);
    assert.equal(Z.Story.due(s, 'travel'), null);
    assert.equal(s.flags.redEnd, leaveCamp ? 'detour' : 'warned');
    const before = Z.State.serialize(s);
    Z.Story.forecast(s); Z.Story.line(s); s.party.forEach(m => Z.Story.epilogue(s, m));
    assert.equal(Z.State.serialize(s), before, 'display must not change save or RNG');
  }
}
const poor = Z.State.newGame({ difficulty: 'normal', seed: 2 });
let e = Z.Events.begin(poor, 'story_red_scarf');
assert.equal(e.choices.length, 2, 'cannot promise food you do not have');
Z.Events.resolve(poor, e, 1);
poor.vehicle.has = false;
poor.inv.food = 20;
assert.match(Z.Story.forecast(poor)[0], /full days/);
poor.party[0].alive = false;
assert(!Z.Story.line(poor).startsWith(poor.party[0].name + ':'));
assert.equal(Z.State.deserialize(Z.State.serialize(poor)).flags.redScarf, 'passed');
// Every numbered source module and the actual built script must parse.
for (const f of fs.readdirSync(__dirname).filter(f => /^\d+_.*\.js$/.test(f))) {
  new vm.Script(fs.readFileSync(__dirname + '/' + f, 'utf8'), { filename: f });
}
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
assert(html.includes('ZT.Story ='));
assert(!html.includes('user-scalable=no'));
console.log('Story branches, delayed consequences, save/load, forecasts, and built script passed.');
