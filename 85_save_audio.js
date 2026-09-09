/* ZOMBIE TRAILS — save slots, settings, memorials, audio */
'use strict';
ZT.Save = (function () {
const KEY = 'zombietrails.v1';
function store() {
  try { const t = '__zt'; localStorage.setItem(t, '1'); localStorage.removeItem(t); return localStorage; } catch (e) { return null; }
}
let mem = {};
function get(k) { const ls = store(); try { return ls ? ls.getItem(k) : mem[k]; } catch (e) { return mem[k]; } }
function set(k, v) { const ls = store(); try { if (ls) ls.setItem(k, v); else mem[k] = v; } catch (e) { mem[k] = v; } }
function del(k) { const ls = store(); try { if (ls) ls.removeItem(k); else delete mem[k]; } catch (e) { delete mem[k]; } }

return {
  save(s, slot) {
    slot = slot || 1;
    try { set(KEY + '.slot' + slot, ZT.State.serialize(s)); set(KEY + '.last', String(slot)); return true; } catch (e) { return false; }
  },
  load(slot) {
    slot = slot || Number(get(KEY + '.last') || 1);
    const raw = get(KEY + '.slot' + slot);
    if (!raw) return null;
    try { return ZT.State.deserialize(raw); } catch (e) { return null; }
  },
  has(slot) { return !!get(KEY + '.slot' + (slot || Number(get(KEY + '.last') || 1))); },
  clear(slot) { del(KEY + '.slot' + (slot || 1)); },
  info(slot) {
    const raw = get(KEY + '.slot' + slot);
    if (!raw) return null;
    try { const s = JSON.parse(raw);
      return { day: s.day, miles: Math.round(s.miles), alive: s.party.filter((m) => m.alive).length, difficulty: (ZT.DIFF[s.difficulty] || {}).name || s.difficulty, over: !!s.over };
    } catch (e) { return null; }
  },
  settings() {
    try { return JSON.parse(get(KEY + '.settings') || '{}'); } catch (e) { return {}; }
  },
  saveSettings(o) { set(KEY + '.settings', JSON.stringify(o)); },
  /* memorials persist between runs — old markers on the road */
  memorials() { try { return JSON.parse(get(KEY + '.memorials') || '[]'); } catch (e) { return []; } },
  addMemorial(m) {
    const list = ZT.Save.memorials();
    list.unshift(m);
    set(KEY + '.memorials', JSON.stringify(list.slice(0, 30)));
  },
  scores() { try { return JSON.parse(get(KEY + '.scores') || '[]'); } catch (e) { return []; } },
  addScore(rec) {
    const list = ZT.Save.scores();
    list.push(rec);
    list.sort((a, b) => b.score - a.score);
    set(KEY + '.scores', JSON.stringify(list.slice(0, 10)));
    return list.slice(0, 10);
  },
};
})();

/* ---------- primitive square-wave audio ---------- */
ZT.Audio = (function () {
let ctx = null, on = false;
function ac() {
  if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function beep(freq, dur, type, vol) {
  if (!on) return;
  const c = ac(); if (!c) return;
  try {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(vol == null ? 0.055 : vol, c.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  } catch (e) {}
}
function seq(notes) {
  if (!on) return;
  const c = ac(); if (!c) return;
  let t = 0;
  for (const [f, d] of notes) { setTimeout(() => beep(f, d), t * 1000); t += d * 0.85; }
}
return {
  setOn(v) { on = !!v; if (on) ac(); },
  isOn() { return on; },
  move() { beep(420, 0.03, 'square', 0.03); },
  select() { beep(660, 0.05); },
  back() { beep(300, 0.05); },
  warn() { seq([[300, 0.09], [240, 0.13]]); },
  bad() { seq([[220, 0.1], [180, 0.12], [140, 0.2]]); },
  good() { seq([[520, 0.07], [660, 0.07], [880, 0.12]]); },
  find() { seq([[700, 0.05], [900, 0.08]]); },
  death() { seq([[300, 0.18], [240, 0.2], [190, 0.24], [140, 0.5]]); },
  landmark() { seq([[440, 0.1], [550, 0.1], [660, 0.18]]); },
  breakdown() { seq([[180, 0.12], [150, 0.16], [120, 0.3]]); },
  shot() { beep(120, 0.06, 'sawtooth', 0.06); },
  win() { seq([[440, 0.12], [554, 0.12], [659, 0.12], [880, 0.36]]); },
  engine() { beep(90, 0.12, 'sawtooth', 0.02); },
};
})();
