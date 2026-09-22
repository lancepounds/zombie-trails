/* ZOMBIE TRAILS — offline sound cabinet. No downloads or game RNG use.
   Voices use the audio clock; muting cancels even notes scheduled in the future. */
'use strict';
ZT.Audio = (function () {
let ctx = null, master = null, noiseBuffer = null;
let on = false, unlocked = false, visible = true, ambience = true, volume = 0.5;
let scene = { key: '', weather: 'clear', moving: false }, timer = null, beat = 0;
const voices = new Set();
function ac() {
  if (!on || !unlocked || !visible) return null;
  try {
    if (!ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      ctx = new A(); master = ctx.createGain();
      master.gain.value = volume; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch (e) { return null; } // Audio failure must never prevent a choice.
}
function track(source, nodes, ambient) {
  const voice = { source, nodes, ambient };
  voices.add(voice);
  source.onended = () => {
    voices.delete(voice);
    nodes.forEach(n => { try { n.disconnect(); } catch (e) {} });
  };
}
function stopVoices(ambientOnly) {
  for (const v of [...voices]) {
    if (ambientOnly && !v.ambient) continue;
    try { v.source.stop(); } catch (e) {}
    v.nodes.forEach(n => { try { n.disconnect(); } catch (e) {} });
    voices.delete(v);
  }
}
function envelope(g, start, dur, vol) {
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), start + Math.min(0.02, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
}
function tone(freq, dur, type = 'square', vol = 0.05, delay = 0, end = freq, ambient = false) {
  const c = ac(); if (!c || (ambient && !ambience)) return;
  try {
    const o = c.createOscillator(), g = c.createGain(), start = c.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(freq, start);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), start + dur);
    envelope(g, start, dur, vol); o.connect(g); g.connect(master);
    track(o, [o, g], ambient); o.start(start); o.stop(start + dur + 0.02);
  } catch (e) {}
}
function hiss(dur, vol, cutoff = 900, delay = 0, ambient = false) {
  const c = ac(); if (!c || (ambient && !ambience)) return;
  try {
    if (!noiseBuffer) {
      noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const data = noiseBuffer.getChannelData(0); let seed = 1979;
      for (let i = 0; i < data.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        data[i] = seed / 2147483648 - 1;
      }
    }
    const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    const start = c.currentTime + delay;
    n.buffer = noiseBuffer; n.loop = true; f.type = 'lowpass'; f.frequency.value = cutoff;
    envelope(g, start, dur, vol); n.connect(f); f.connect(g); g.connect(master);
    track(n, [n, f, g], ambient); n.start(start); n.stop(start + dur + 0.02);
  } catch (e) {}
}
function seq(notes, type = 'square', vol = 0.05) {
  let delay = 0;
  for (const [f, d] of notes) { tone(f, d, type, vol, delay); delay += d * 0.9; }
}
function pulse() {
  if (!on || !visible || !ambience || !ac()) return;
  beat++;
  if (scene.moving) {
    tone(65, 1.1, 'triangle', 0.026, 0, 70, true);
    hiss(1.1, 0.019, 440, 0, true);
  }
  if (scene.weather === 'rain' || scene.weather === 'storm') {
    hiss(1.15, 0.045, 2600, 0, true);
    if (scene.weather === 'storm' && beat % 7 === 0) hiss(1.4, 0.10, 140, 0, true);
  } else if (['snow', 'cold', 'wind', 'dust'].includes(scene.weather)) {
    hiss(1.15, 0.038, 480, 0, true);
  }
  if (['camp', 'fire'].includes(scene.key)) {
    hiss(0.95, 0.028, 1200, 0, true);
    hiss(0.035, 0.07, 2400, 0.25, true);
    hiss(0.025, 0.04, 1800, 0.72, true);
  } else if (/^z|horde|bandits/.test(scene.key) && beat % 4 === 1) {
    tone(94, 0.9, 'sawtooth', 0.017, 0, 49, true);
    tone(71, 1.1, 'triangle', 0.022, 0.2, 43, true);
  } else if (scene.key === 'radio') {
    hiss(0.6, 0.027, 3200, 0, true);
    if (beat % 3 === 0) tone(780, 0.05, 'sine', 0.022, 0.3, 780, true);
  }
}
function stopBed() { if (timer !== null) clearInterval(timer); timer = null; stopVoices(true); }
function startBed() {
  stopBed();
  if (!scene.key || !on || !ambience || !visible || !ac()) return;
  beat = 0; pulse(); timer = setInterval(pulse, 1100);
}
const api = {
  unlock() { unlocked = true; ac(); startBed(); },
  setOn(v) {
    on = !!v;
    if (on) { ac(); startBed(); }
    else { stopBed(); stopVoices(false); }
  },
  isOn() { return on; },
  setVolume(v) {
    volume = Number.isFinite(Number(v)) ? Math.max(0, Math.min(1, Number(v))) : 0.5;
    if (master) master.gain.setValueAtTime(volume, ctx.currentTime);
  },
  setAmbience(v) { ambience = !!v; startBed(); },
  setVisible(v) {
    visible = !!v;
    if (visible) startBed(); else { stopBed(); stopVoices(false); }
  },
  setScene(next) {
    next = Object.assign({ key: '', weather: 'clear', moving: false }, next);
    if (next.key === scene.key && next.weather === scene.weather && next.moving === scene.moving) return;
    scene = next; startBed();
  },
  move() { tone(420, 0.03, 'square', 0.025); },
  select() { tone(660, 0.05); },
  back() { tone(300, 0.05); },
  warn() { seq([[300, 0.09], [240, 0.13]]); },
  bad() { seq([[220, 0.1], [180, 0.12], [140, 0.2]]); },
  good() { seq([[520, 0.07], [660, 0.07], [880, 0.12]]); },
  find() { hiss(0.06, 0.035, 2200); seq([[700, 0.05], [900, 0.12]]); },
  death() { seq([[300, 0.18], [240, 0.2], [190, 0.24], [140, 0.5]], 'triangle'); },
  landmark() { seq([[440, 0.1], [550, 0.1], [660, 0.22]], 'triangle', 0.09); },
  breakdown() { tone(120, 0.5, 'sawtooth', 0.045, 0, 30); hiss(0.3, 0.08, 700, 0.15); },
  shot() { hiss(0.16, 0.13, 2100); tone(115, 0.13, 'triangle', 0.08, 0, 30); },
  win() { seq([[440, 0.12], [554, 0.12], [659, 0.12], [880, 0.36]], 'triangle', 0.1); },
  engine() { tone(36, 0.55, 'sawtooth', 0.04, 0, 100); hiss(0.25, 0.045, 420); },
  stop() { tone(100, 0.7, 'triangle', 0.05, 0, 28); hiss(0.4, 0.05, 1100); },
  repair() { [0, 0.17, 0.34].forEach(d => { hiss(0.05, 0.08, 3000, d); tone(720, 0.045, 'square', 0.03, d, 420); }); },
  heal() { seq([[392, 0.10], [523, 0.13], [659, 0.18]], 'sine', 0.09); },
  fuel() { [0, 0.1, 0.2, 0.3].forEach(d => tone(190, 0.08, 'sine', 0.055, d, 100)); },
  trade() { seq([[1046, 0.07], [1318, 0.16]], 'triangle', 0.08); },
  encounter(art, cat, vehicle) {
    if (['station', 'diner', 'reststop', 'zrest', 'cold_drinks', 'ice_freezer', 'beer_tent'].includes(art) && vehicle) api.stop();
    else if (cat === 'zombie') { tone(120, 0.7, 'sawtooth', 0.035, 0, 48); }
    else if (cat === 'vehicle') api.breakdown();
    else if (art === 'radio') hiss(0.5, 0.05, 3000);
    else api.warn();
  },
};
return api;
})();
