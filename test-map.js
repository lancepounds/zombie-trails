/* Map regressions: route math, committed branches, estimates, and label layout. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('node:assert/strict');
const box = { console }; vm.createContext(box);
for (const file of fs.readdirSync(__dirname).filter(f => /^[0-7]\d_.*\.js$/.test(f)).sort().concat('82_atlas.js')) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), box, { filename: file });
}
const Z = box.ZT, A = Z.Atlas;
// Independent exhaustive routes are small enough to enumerate for this DAG.
function distances(from, to, total = 0) {
  if (from === to) return [total];
  return Z.LEGS.filter(l => l.from === from).flatMap(l => distances(l.to, to, total + l.miles));
}
for (const from of Object.keys(Z.NODES)) for (const to of Object.keys(Z.NODES)) {
  const totals = distances(from, to), actual = A.route(from, to);
  assert.equal(actual ? actual.miles : Infinity, Math.min(...totals), from + ' -> ' + to);
  if (actual) assert.equal(actual.legs.reduce((n, l) => n + l.miles, 0), actual.miles);
}
assert.equal(A.route('ogallala', 'chimney').miles, 120); // old subtraction returned -10
assert.equal(A.route('omaha', 'chimney').miles, 475); // old map returned 345
assert.equal(A.route('granger', 'ogden').miles, 140); // not 75 via a different branch

const s = Z.State.newGame({ difficulty: 'normal', seed: 57 });
Object.assign(s.inv, { food: 200, fuel: 30, parts: 2, tools: 1 });
s.at = 'ogallala'; s.miles = 355; s.path = ['omaha', 'kearney', 'ogallala'];
s.seen = { omaha: true, kearney: true, ogallala: true };
assert.equal(A.distanceText(s, 'ogallala'), 'You are here');
assert.equal(A.fromYou(s, 'cheyenne').miles, 160);
const saved = Z.State.serialize(s);
for (const l of Z.legsFrom(s.at)) {
  const estimate = A.legEstimate(s, l);
  assert(Number.isFinite(estimate.fuel) && estimate.days > 0);
  assert.equal(A.preview(s, s.at, l.to).reduce((sum, edge) => sum + edge.miles, 0), l.miles + Z.distToEnd(l.to));
}
for (const id of Object.keys(Z.NODES)) for (const zoom of [1, 1.6, 2.5, 4]) {
  const opt = { selected: id, zoom, center: Z.NODES[id] };
  const layout = A.layout(s, opt), svg = A.svg(s, opt);
  assert(!svg.includes('NaN') && !svg.includes('Infinity'));
  const selected = layout.nodes.find(n => n.id === id);
  assert(selected && selected.label, 'Selected stop must be visible and labeled: ' + id);
  const labels = layout.nodes.filter(n => n.label).map(n => n.label);
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
    const a = labels[i], b = labels[j];
    assert(!(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y), 'Labels overlap');
  }
  if (zoom === 1) assert.equal(labels.length, Object.keys(Z.NODES).length, 'Every overview stop has a label');
}
assert.equal(Z.State.serialize(s), saved, 'Map inspection must not change saves, supplies, or RNG');

Z.Travel.takeLeg(s, 'chimney'); s.legMiles = 47.5; s.miles += 47.5;
assert.equal(A.fromYou(s, 'chimney').miles, 72.5);
assert.equal(A.fromYou(s, 'casper').miles, 282.5);
assert.equal(A.fromYou(s, 'cheyenne'), null);
assert.equal(A.status(s, 'cheyenne'), 'off');
assert.equal(A.status(s, 'ogallala'), 'passed');
assert.equal(A.roadStatus(s, Z.legBetween('ogallala', 'chimney')), 'current');
assert.equal(A.roadStatus(s, Z.legBetween('ogallala', 'cheyenne')), 'off');
assert.equal(A.roadStatus(s, Z.legBetween('omaha', 'kearney')), 'traveled');
const mid = A.svg(s, { selected: 'chimney', zoom: 1, center: Z.position(s) });
assert(mid.includes('atlas-you'));
const driving = A.legEstimate(s, Z.currentLeg(s));
assert.equal(driving.remaining, 72.5);
s.vehicle.has = false;
assert.equal(A.legEstimate(s, Z.currentLeg(s)).fuel, null);
assert(A.legEstimate(s, Z.currentLeg(s)).days > driving.days);
s.at = 'boise'; s.legTo = null; s.path.push('boise');
assert.equal(A.fromYou(s, 'boise').miles, 0);
assert.equal(A.fromYou(s, 'mtnhome'), null);

if (process.argv[2] === '--render') {
  // Temporary native SVG inspection; this does not run or control a browser.
  const output = process.argv[3];
  fs.mkdirSync(output, { recursive: true });
  const t = Z.State.deserialize(saved);
  fs.writeFileSync(path.join(output, 'atlas-overview.svg'), A.svg(t, { selected: 'ogallala', zoom: 1, center: Z.NODES.ogallala, route: 'chimney' }));
  fs.writeFileSync(path.join(output, 'atlas-detail.svg'), A.svg(t, { selected: 'granger', zoom: 2.5, center: Z.NODES.granger, route: 'montpelier' }));
  fs.writeFileSync(path.join(output, 'atlas-travel.svg'), mid);
}
console.log('Map checks passed: all 289 stop pairs, branches, partial legs, walking, read-only previews, and labels at every zoom.');
