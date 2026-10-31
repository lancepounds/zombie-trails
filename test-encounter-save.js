/* Encounter checkpoints: deterministic restoration, real choice effects, and
   the UI's Continue/resolve/result flow across fresh page contexts. No browser
   dependency: command buttons are a small DOM adapter around the real UI. */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const path = require('node:path');
function environment(storage = new Map()) {
  const root = {
    html: '', buttons: [],
    set innerHTML(html) {
      this.html = html;
      this.buttons = [...html.matchAll(/<button class="cmd" data-i="(\d+)"([^>]*)>([\s\S]*?)<\/button>/g)].map(m => ({
        dataset: { i: m[1] }, disabled: /\bdisabled\b/.test(m[2]), html: m[3], handlers: {},
        addEventListener(type, handler) { this.handlers[type] = handler; },
        click() { assert(!this.disabled); this.handlers.click(); }, focus() {},
      }));
    },
    querySelectorAll() { return this.buttons; },
  };
  const box = {
    console, window: { matchMedia: () => ({ matches: false }), navigator: {} },
    document: { getElementById: id => id === 'screen' ? root : null },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key),
    },
  };
  vm.createContext(box);
  for (const file of fs.readdirSync(__dirname).filter(f => /^[0-7]\d_.*\.js$/.test(f)).sort().concat('82_atlas.js', '85_save_audio.js')) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), box, { filename: file });
  }
  box.ZT.Audio = new Proxy({}, { get: () => () => {} });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '90_ui.js'), 'utf8'), box, { filename: '90_ui.js' });
  return { Z: box.ZT, root, storage };
}
const plain = x => JSON.parse(JSON.stringify(x));
function make(Z, size = 5) {
  const s = Z.State.newGame({ seed: 42, partySize: size, difficulty: 'normal' });
  Object.assign(s.inv, { food: 300, fuel: 30, medicine: 3, ammo: 50, parts: 2, tools: 1, goods: 4 });
  Z.Travel.takeLeg(s, 'kearney');
  return s;
}
function resume(env) {
  const next = environment(env.storage);
  next.Z.UI.goTitle(); next.root.buttons[1].click();
  return next;
}
function saveEvent(env, s, id) {
  const inst = env.Z.Events.begin(s, id);
  s.pendingScene = { kind: 'event', event: env.Z.Events.snapshot(s, inst) };
  assert(env.Z.Save.save(s));
  return inst;
}
// Compare actual choice results, not just serialized shapes. Restoration must
// not draw random numbers, change selected people, or re-filter paid choices.
const { Z } = environment();
let comparisons = 0;
for (const variant of ['road', 'sick', 'solo']) {
  const fixture = make(Z, variant === 'solo' ? 1 : 5);
  if (variant === 'sick') {
    fixture.weather = 'heat'; fixture.miles = 600; fixture.inv.medicine = 1;
    fixture.party.forEach((m, i) => { m.health = 35 + i; m.injury = 40; m.illness = 30; m.inf = i % 2 ? 'exposed' : 'symptomatic'; });
  }
  if (variant === 'solo') { fixture.vehicle.has = false; fixture.inv.parts = 0; fixture.inv.fuel = 0; }
  const initial = Z.State.serialize(fixture);
  for (const event of Z.Events.eligible(fixture, 'travel')) {
    const sample = Z.Events.begin(Z.State.deserialize(initial), event);
    for (const choice of sample.choices) {
      const uninterrupted = Z.State.deserialize(initial);
      const inst = Z.Events.begin(uninterrupted, event);
      const reloaded = Z.State.deserialize(Z.State.serialize(uninterrupted));
      const saved = plain(Z.Events.snapshot(uninterrupted, inst));
      const before = Z.State.serialize(reloaded);
      const restored = Z.Events.restore(reloaded, saved);
      assert.equal(Z.State.serialize(reloaded), before, event.id + ': restore changed state/RNG');
      assert.deepEqual(plain(restored.choices), plain(inst.choices));
      assert.equal(restored.text, inst.text);
      const expected = Z.Events.resolve(uninterrupted, inst, choice.i);
      const actual = Z.Events.resolve(reloaded, restored, choice.i);
      assert.equal(Z.State.serialize(reloaded), Z.State.serialize(uninterrupted), event.id + ': choice effects changed');
      assert.equal(actual.text, expected.text);
      assert.deepEqual(plain(actual.deltas), plain(expected.deltas));
      if (expected.next) assert.deepEqual(plain(Z.Events.snapshot(reloaded, actual.next)), plain(Z.Events.snapshot(uninterrupted, expected.next)));
      comparisons++;
    }
  }
}
// Both individual and array references must point into the loaded party, even
// if travelers share a name.
{
  const s = make(Z); s.party.forEach(m => { m.name = 'Same'; m.injury = 45; }); s.inv.medicine = 1;
  for (const id of ['h_wound_gone_bad', 'h_hard_choice_meds']) {
    const inst = Z.Events.begin(s, id), loaded = Z.State.deserialize(Z.State.serialize(s));
    const restored = Z.Events.restore(loaded, plain(Z.Events.snapshot(s, inst)));
    if (restored._c.m) assert(loaded.party.includes(restored._c.m));
    if (restored._c.list) assert(restored._c.list.every(m => loaded.party.includes(m)));
  }
}
// Real UI: the fork encounter saves itself as soon as it appears, including a
// filtered menu whose only option is the original fourth choice.
{
  let env = environment(), s = make(env.Z, 1);
  s.at = 'ogallala'; s.legTo = null; s.day = 20; s.inv.fuel = 0; s.inv.ammo = 0;
  env.Z.Travel.takeLeg(s, 'chimney'); env.Z.Save.save(s);
  env = resume(env); env.root.buttons[0].click();
  assert.equal(env.Z.Save.load().pendingScene.event.id, 'story_wagon_overrun');
  assert.equal(env.root.buttons.length, 1);
  const before = env.Z.State.serialize(env.Z.UI.state);
  env = resume(env);
  assert.equal(env.Z.State.serialize(env.Z.UI.state), before);
  assert.equal(env.Z.UI.state.stats.events, 1);
  env.root.buttons[0].click();
  assert.equal(env.Z.UI.state.flags.overrun.choice, 'abandoned');
  assert.equal(env.Z.UI.state.legTo, 'cheyenne');
  assert.equal(env.Z.UI.state.vehicle.has, false);
}
// Flat-tire regression: refresh before choosing, refresh on the result, then
// refresh after leaving it. Pay for the repair exactly once.
{
  let env = environment(); const s = make(env.Z);
  saveEvent(env, s, 'v_flat_slow'); env = resume(env);
  assert(env.root.html.includes('rear tire going down slowly'));
  assert.equal(env.root.buttons.length, 3);
  env.root.buttons[1].click();
  assert.equal(env.Z.UI.state.inv.parts, 1);
  assert.equal(env.Z.Save.load().pendingScene.kind, 'outcome');
  const resolved = env.Z.State.serialize(env.Z.UI.state), html = env.root.html;
  env = resume(env);
  assert.equal(env.Z.State.serialize(env.Z.UI.state), resolved);
  assert.equal(env.root.html, html);
  env.root.buttons[0].click();
  assert.equal(env.Z.UI.state.pendingScene, null);
  env = resume(env);
  assert.equal(env.Z.UI.state.inv.parts, 1);
  assert.equal(env.Z.UI.state.stats.choices['v_flat_slow:1'], 1);
  assert(env.root.html.includes('Continue on the trail'));
}
// Chained encounters retain generated details and do not recount or reapply
// the parent's costs when resuming either the result or its follow-up.
{
  let env = environment(); const s = make(env.Z); s.weather = 'heat';
  saveEvent(env, s, 'v_midwest_summer_flat'); env = resume(env); env.root.buttons[0].click();
  const child = plain(env.Z.UI.state.pendingScene.out.next), rng = env.Z.UI.state.rng;
  assert.equal(child.id, 'p_midwest_cold_drinks');
  env = resume(env); assert.equal(env.Z.UI.state.inv.parts, 1); env.root.buttons[0].click();
  assert.deepEqual(plain(env.Z.UI.state.pendingScene.event), child);
  assert.equal(env.Z.UI.state.rng, rng);
  const before = env.Z.State.serialize(env.Z.UI.state);
  env = resume(env); assert.equal(env.Z.State.serialize(env.Z.UI.state), before);
  env.root.buttons[env.root.buttons.length - 1].click();
  assert.equal(env.Z.UI.state.inv.parts, 1);
}
// Older saves remain usable. Fatal results must resume before the end screen.
{
  let env = environment(); const s = make(env.Z); delete s.pendingScene;
  env.Z.Save.save(s); env = resume(env); assert.equal(env.Z.UI.state.pendingScene, null);
  assert(env.root.html.includes('Continue on the trail'));
  const dying = make(env.Z, 1); dying.party[0].health = 5; dying.at = 'ogallala'; dying.legTo = 'chimney';
  saveEvent(env, dying, 'story_wagon_overrun'); env = resume(env); env.root.buttons[1].click();
  assert(env.Z.UI.state.over); env = resume(env);
  assert.equal(env.Z.UI.state.pendingScene.kind, 'outcome');
  env.root.buttons[0].click(); assert(env.root.html.includes('HERE LIES'));
  env.root.buttons[0].click(); assert.equal(env.Z.UI.state.pendingScene, null);
  assert(env.root.html.includes('THE ROAD ENDS HERE'));
}
// An unavailable encounter should explain the recovery and preserve the rest
// of the saved journey, rather than crashing or silently discarding the run.
{
  let env = environment(); const s = make(env.Z);
  s.pendingScene = { kind: 'event', event: { id: 'no_longer_available' } };
  const supplies = plain(s.inv); env.Z.Save.save(s); env = resume(env);
  assert(env.root.html.includes('SAVED ENCOUNTER UNAVAILABLE'));
  assert.deepEqual(plain(env.Z.UI.state.inv), supplies);
  env.root.buttons[0].click(); assert(env.root.html.includes('Continue on the trail'));
}
console.log(`Encounter save checks passed: ${comparisons} equivalent choice results, selected travelers, initial autosave, filtered fork choices, outcomes exactly once, chains, fatal results, and old saves.`);
