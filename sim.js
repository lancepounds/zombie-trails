/* Headless balance and crash harness. Runs the engine with a plain-sense AI. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = __dirname;
const files = fs.readdirSync(SRC).filter((f) => /^[0-7]\d_.*\.js$/.test(f)).sort();
const sandbox = { console, globalThis: null };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of files) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), sandbox, { filename: f });
const ZT = sandbox.ZT;

const LOADOUTS = {
  balanced: { food: 420, fuel: 35, medicine: 4, ammo: 60, parts: 2, tools: 1, goods: 5 },
  food:     { food: 620, fuel: 30, medicine: 3, ammo: 40, parts: 2, tools: 1, goods: 3 },
  gear:     { food: 300, fuel: 25, medicine: 6, ammo: 40, parts: 3, tools: 2, goods: 6 },
  reckless: { food: 240, fuel: 45, medicine: 1, ammo: 160, parts: 1, tools: 0, goods: 0 },
};
function afford(cash, want) {
  const cart = Object.assign({}, want);
  const cost = () => ZT.ITEM_ORDER.reduce((t, k) => t + cart[k] * ZT.ITEMS[k].price, 0);
  const order = ['ammo', 'goods', 'food', 'fuel', 'medicine', 'parts', 'tools'];
  let guard = 0;
  while (cost() > cash && guard++ < 4000) {
    for (const k of order) { if (cart[k] > 0) { cart[k] = Math.max(0, cart[k] - ZT.ITEMS[k].step); if (cost() <= cash) break; } }
  }
  return cart;
}

/* choice policy: score each option by keyword, with noise */
function pickChoice(s, inst, style) {
  const n = inst.choices.length;
  if (n === 1) return inst.choices[0].i;
  const scores = inst.choices.map((ch) => {
    const t = (ch.text + ' ' + (ch.hint || '')).toLowerCase();
    let v = ZT.rand(s) * (style === 'random' ? 6 : 1.6);
    const low = s.inv.food < 90, lowFuel = s.vehicle.has && s.inv.fuel < 8, lowMed = s.inv.medicine === 0;
    if (/leave it|drive past|drive on|keep driving|not worth|move on|wish them|do not stop|skip it|nothing\./.test(t)) v += style === 'timid' ? 2.4 : 0.4;
    if (/wait|slow|quietly|carefully|around|detour|scout|first|distance|listen/.test(t)) v += style === 'timid' ? 1.6 : 0.7;
    if (/ram|fast|flat out|shoot|fight|force|straight through|greedy|both|whole|everything/.test(t)) v += style === 'bold' ? 1.9 : -0.3;
    if (/search|loot|take|siphon|scaveng|buy food|supplies/.test(t) && low) v += 1.8;
    if (/fuel|siphon/.test(t) && lowFuel) v += 1.8;
    if (/medicine|1 kit/.test(t)) v += lowMed ? -3 : 1.0;
    if (/rest|camp|sleep/.test(t) && ZT.Party.avgFatigue(s) > 60) v += 1.4;
    if (ch.hint && /costs? (food|fuel)/.test(ch.hint) && low) v -= 1.2;
    return v;
  });
  let best = 0; for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;
  return inst.choices[best].i;
}

function resolveAll(s, inst, style, stats) {
  let guard = 0;
  while (inst && guard++ < 12) {
    stats.events++;
    const out = ZT.Events.resolve(s, inst, pickChoice(s, inst, style));
    for (const d of out.deaths) stats.deathCause[d.cause] = (stats.deathCause[d.cause] || 0) + 1;
    inst = out.next;
  }
}

function play(seed, difficulty, style, loadout) {
  const s = ZT.State.newGame({ difficulty, seed, names: ZT.DEFAULT_NAMES, roles: ['driver', 'medic', 'mechanic', 'scout', 'generalist'] });
  const cart = afford(s.inv.cash, LOADOUTS[loadout]);
  for (const k of ZT.ITEM_ORDER) s.inv[k] = cart[k];
  s.inv.cash = Math.round(s.inv.cash - ZT.ITEM_ORDER.reduce((t, k) => t + cart[k] * ZT.ITEMS[k].price, 0));
  const stats = { events: 0, deathCause: {}, zero: {}, scav: 0, forks: {} };
  let turns = 0;
  while (!s.over && turns++ < 3000) {
    // housekeeping
    const alive = ZT.State.aliveCount(s);
    if (!alive) { ZT.Travel.endGame(s, 'party'); break; }
    const daysFood = s.inv.food / Math.max(0.1, alive * ZT.RATIONS[s.rations].lbs);
    s.rations = daysFood < 8 ? 'meager' : daysFood > 45 ? 'full' : 'normal';
    const avgH = ZT.Party.avgHealth(s), avgF = ZT.Party.avgFatigue(s);
    s.pace = (avgF > 70 || avgH < 45) ? 'cautious' : (s.inv.fuel > 25 && avgF < 40 ? 'steady' : 'steady');
    // treat
    const need = s.party.filter((m) => m.alive && (m.inf === 'bitten' || m.inf === 'symptomatic' || m.injury > 40 || m.illness > 40));
    if (s.inv.medicine > (s.inv.medicine > 2 ? 0 : 1) && need.length) ZT.Party.treat(s, need[0]);
    // repair
    if (s.vehicle.has && s.vehicle.broken) {
      const c = { d: [] };
      if (s.inv.parts > 0) ZT.Vehicle.repairWithParts(s, c, s.vehicle.broken);
      else { ZT.Vehicle.juryRig(s, c, s.vehicle.broken); if (s.vehicle.broken && ZT.rand(s) < 0.25) ZT.X.loseVehicle(s, c, 'abandoned'); }
      continue;
    }
    if (s.vehicle.has && !s.vehicle.broken && s.inv.parts > 1 && ZT.Vehicle.overall(s) < 45) { ZT.Vehicle.service(s, { d: [] }); continue; }
    // rest
    if (avgF > 78 && s.inv.food > alive * 6) { const r = ZT.Travel.rest(s, 2); if (r.interrupt && r.interrupt.kind === 'event') resolveAll(s, r.interrupt.event, style, stats); continue; }
    // scavenge when short
    if ((s.inv.food < alive * 22 || (s.vehicle.has && s.inv.fuel < 9)) && !s.over) {
      stats.scav++;
      const out = ZT.Scavenge.menuRun(s, s.inv.food < alive * 12 || s.inv.fuel < 5 ? 'thorough' : 'quick');
      for (const d of out.deaths) stats.deathCause[d.cause] = (stats.deathCause[d.cause] || 0) + 1;
      if (s.inv.food < alive * 4 && s.inv.fuel < 2 && s.stats.scavenges > 200) break;
      continue;
    }
    const r = ZT.Travel.step(s);
    if (!r) continue;
    if (r.kind === 'event') { resolveAll(s, r.event, style, stats); continue; }
    if (r.kind === 'arrive') {
      const evId = ZT.NODE_EVENT[s.at];
      if (evId) resolveAll(s, ZT.Events.begin(s, evId), style, stats);
      continue;
    }
    if (r.kind === 'fork') {
      const legs = ZT.Travel.choicesHere(s);
      if (!legs.length) { ZT.Travel.endGame(s, 'stranded'); break; }
      // route policy: timid takes the shortest road, bold takes the town road, random rolls
      let pick;
      if (style === 'random') pick = legs[Math.floor(ZT.rand(s) * legs.length)];
      else if (style === 'timid') pick = legs.reduce((a, b) => (b.miles + ZT.distToEnd(b.to) < a.miles + ZT.distToEnd(a.to) ? b : a));
      else pick = legs.reduce((a, b) => (ZT.REGIONS[b.region].loot.food + ZT.REGIONS[b.region].loot.fuel > ZT.REGIONS[a.region].loot.food + ZT.REGIONS[a.region].loot.fuel ? b : a));
      stats.forks = stats.forks || {}; stats.forks[pick.from + '>' + pick.to] = 1;
      ZT.Travel.takeLeg(s, pick.to);
      continue;
    }
    if (r.kind === 'death') { stats.deathCause[r.member.cause] = (stats.deathCause[r.member.cause] || 0) + 1; continue; }
    if (r.kind === 'breakdown') continue;
    if (r.kind === 'stuck') {
      if (r.reason === 'fuel') { stats.scav++; ZT.Scavenge.menuRun(s, 'thorough'); if (s.inv.fuel <= 0 && s.stats.scavenges > 250) { ZT.Travel.endGame(s, 'stranded'); break; } continue; }
      continue;
    }
    if (r.kind === 'over') break;
  }
  if (!s.over) ZT.Travel.endGame(s, 'stranded');
  // which resource hit zero first is approximated by what is zero at the end
  for (const k of ZT.ITEM_ORDER) if (s.inv[k] <= 0) stats.zero[k] = 1;
  return { s, stats };
}

/* ---------------- run ---------------- */
const N = Number(process.argv[2] || 200);
const only = process.argv[3];
const results = {};
let crashes = 0;
const eventSeen = {};
const choiceSeen = {};
const forkSeen = {};
for (const difficulty of ['easy', 'normal', 'hard', 'nightmare']) {
  if (only && only !== difficulty) continue;
  for (const style of ['timid', 'bold', 'random']) {
    for (const loadout of Object.keys(LOADOUTS)) {
      const key = `${difficulty}/${style}/${loadout}`;
      const r = { n: 0, wins: 0, days: [], miles: [], survivors: [], scores: [], zero: {}, cause: {} };
      for (let i = 0; i < N; i++) {
        try {
          const { s, stats } = play(1000 + i * 7919, difficulty, style, loadout);
          r.n++;
          const won = s.over.why === 'win';
          if (won) r.wins++;
          r.days.push(s.day); r.miles.push(Math.round(s.miles));
          r.survivors.push(ZT.State.aliveCount(s));
          r.scores.push(ZT.Score.compute(s).total);
          for (const k of Object.keys(stats.zero)) r.zero[k] = (r.zero[k] || 0) + 1;
          for (const [c, n] of Object.entries(stats.deathCause)) r.cause[c] = (r.cause[c] || 0) + n;
          for (const id of Object.keys(s.stats.eventsSeen)) eventSeen[id] = (eventSeen[id] || 0) + 1;
          for (const k of Object.keys(s.stats.choices)) choiceSeen[k] = (choiceSeen[k] || 0) + s.stats.choices[k];
          for (const k of Object.keys(stats.forks || {})) forkSeen[k] = (forkSeen[k] || 0) + 1;
        } catch (e) {
          crashes++;
          if (crashes < 6) console.error('CRASH', key, i, e.message, '\n', (e.stack || '').split('\n').slice(1, 4).join('\n'));
        }
      }
      results[key] = r;
    }
  }
}
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
console.log('\n=== WIN RATE (n=' + N + ' per cell) ===');
console.log('config'.padEnd(30), 'win%'.padStart(6), 'day'.padStart(6), 'mile'.padStart(6), 'surv'.padStart(6), 'score'.padStart(7));
const byDiff = {};
for (const [k, r] of Object.entries(results)) {
  const d = k.split('/')[0];
  byDiff[d] = byDiff[d] || { n: 0, w: 0 };
  byDiff[d].n += r.n; byDiff[d].w += r.wins;
  console.log(k.padEnd(30), ((r.wins / r.n) * 100).toFixed(0).padStart(5) + '%',
    med(r.days).toFixed(0).padStart(6), med(r.miles).toFixed(0).padStart(6),
    avg(r.survivors).toFixed(2).padStart(6), med(r.scores).toFixed(0).padStart(7));
}
console.log('\n=== BY DIFFICULTY ===');
for (const [d, v] of Object.entries(byDiff)) console.log(d.padEnd(12), ((v.w / v.n) * 100).toFixed(1) + '% of ' + v.n);
console.log('\n=== DEATHS BY CAUSE (all runs) ===');
const causes = {};
for (const r of Object.values(results)) for (const [c, n] of Object.entries(r.cause)) causes[c] = (causes[c] || 0) + n;
Object.entries(causes).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(' ', c.padEnd(14), n));
console.log('\n=== RESOURCE AT ZERO AT END ===');
const zeros = {};
let totalRuns = 0;
for (const r of Object.values(results)) { totalRuns += r.n; for (const [c, n] of Object.entries(r.zero)) zeros[c] = (zeros[c] || 0) + n; }
Object.entries(zeros).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(' ', c.padEnd(10), ((n / totalRuns) * 100).toFixed(0) + '%'));
console.log('\ncrashes:', crashes);
const allIds = ZT.Events.all.filter((e) => e.weight !== 0).map((e) => e.id);
const never = allIds.filter((id) => !eventSeen[id]);
console.log('\n=== ROADS TAKEN ===');
for (const l of ZT.LEGS) { const k = l.from + '>' + l.to; if (ZT.legsFrom(l.from).length > 1) console.log(' ', k.padEnd(24), forkSeen[k] || 0); }
console.log('shortest route', ZT.SHORTEST, 'mi | longest', ZT.LONGEST, 'mi');
console.log('events defined:', ZT.Events.all.length, '| never fired:', never.length, never.slice(0, 25).join(', '));
const lmNever = Object.values(ZT.NODE_EVENT).filter((id) => !eventSeen[id]);
if (lmNever.length) console.log('landmark events never fired:', lmNever.join(', '));
// choices never taken
const allChoices = [];
for (const e of ZT.Events.all) (e.choices || []).forEach((ch, i) => allChoices.push(e.id + ':' + i));
const cNever = allChoices.filter((k) => !choiceSeen[k]);
console.log('choices defined:', allChoices.length, '| never taken:', cNever.length, cNever.slice(0, 20).join(' '));
process.exitCode = crashes ? 1 : 0;
