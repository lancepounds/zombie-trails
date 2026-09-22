/* Audio lifecycle regressions: gesture gating, silence, and resource cleanup.
   Uses a strict Web Audio stand-in so npm test remains dependency-free. */
const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
let created = 0, started = [], allNodes = [], intervals = new Map(), timerId = 0;
const param = () => ({ value: 0,
  setValueAtTime(v, t) { assert(Number.isFinite(v) && Number.isFinite(t)); this.value = v; },
  exponentialRampToValueAtTime(v, t) { assert(v > 0 && Number.isFinite(t)); },
});
class Node {
  constructor() { allNodes.push(this); this.frequency = param(); this.gain = param(); this.connections = []; }
  connect(n) { assert(n); this.connections.push(n); }
  disconnect() { this.connections = []; }
  start(t) { assert(Number.isFinite(t)); this.startTime = t; started.push(this); }
  stop(t) { this.stopTime = t; if (t === undefined && this.onended) this.onended(); }
}
class AudioContext {
  constructor() { created++; this.currentTime = 10; this.sampleRate = 8000; this.state = 'running'; this.destination = new Node(); }
  createGain() { return new Node(); }
  createOscillator() { return new Node(); }
  createBufferSource() { return new Node(); }
  createBiquadFilter() { return new Node(); }
  createBuffer(ch, n) { const samples = new Float32Array(n); return { getChannelData: () => samples }; }
}
const box = { ZT: {}, window: { AudioContext },
  setInterval(fn) { intervals.set(++timerId, fn); return timerId; },
  clearInterval(id) { intervals.delete(id); },
};
vm.createContext(box);
const src = fs.readFileSync(__dirname + '/86_audio.js', 'utf8');
vm.runInContext(src, box);
const a = box.ZT.Audio;
a.setOn(true); a.engine();
assert.equal(created, 0, 'saved sound setting must not autoplay before a gesture');
a.unlock(); a.engine(); assert.equal(created, 1); assert(started.length > 0);
a.setScene({ key: 'travel', weather: 'rain', moving: true });
assert.equal(intervals.size, 1);
for (let i = 0; i < 20; i++) a.setScene({ key: 'travel', weather: 'rain', moving: true });
assert.equal(intervals.size, 1, 'redraws must not multiply ambient timers');
a.win(); assert(started.some(n => n.startTime > 10), 'melody includes future notes');
a.setOn(false);
assert.equal(intervals.size, 0);
assert(started.every(n => n.connections.length === 0), 'mute disconnects playing and queued notes');
const mutedCount = started.length; a.shot(); a.win(); assert.equal(started.length, mutedCount);
a.setOn(true); a.setAmbience(false);
assert.equal(intervals.size, 0);
const effectCount = started.length; a.find(); assert(started.length > effectCount, 'effects work without ambience');
const quietCount = started.length;
a.engine(); a.stop();
for (const art of ['station', 'diner', 'reststop', 'zrest', 'cold_drinks', 'ice_freezer', 'beer_tent']) a.encounter(art, 'road', true);
assert.equal(started.length, quietCount, 'ambient-off also silences engine starts and routine roadside stops');
for (const cue of ['shot', 'repair', 'heal', 'warn']) {
  const before = started.length; a[cue]();
  assert(started.length > before, `${cue} still works with ambience off`);
}
a.setScene({ key: '' }); a.setAmbience(true);
const vehicleStart = started.length; a.engine(); a.stop();
const vehicleVoices = started.slice(vehicleStart);
assert(vehicleVoices.length > 0, 'vehicle cues still work with ambience on');
const eventStart = started.length; a.repair();
const eventVoices = started.slice(eventStart);
a.setAmbience(false);
assert(vehicleVoices.every(n => n.connections.length === 0), 'ambient toggle stops vehicle cues already playing');
assert(eventVoices.every(n => n.connections.length > 0), 'ambient toggle preserves playing event effects');
a.setAmbience(true); a.setScene({ key: 'camp', weather: 'storm' });
assert.equal(intervals.size, 1);
a.setVisible(false); assert.equal(intervals.size, 0);
assert(started.every(n => n.connections.length === 0), 'hidden tab is silent');
const hiddenCount = started.length; a.good(); assert.equal(started.length, hiddenCount);
a.setVisible(true); assert.equal(intervals.size, 1);
a.setScene({ key: '' }); assert.equal(intervals.size, 0, 'screens without art stop ambient sound');
for (const cue of ['warn','bad','good','find','death','landmark','breakdown','shot','win','engine','stop','repair','heal','fuel','trade']) a[cue]();
for (const scene of ['station', 'diner', 'zrest', 'radio']) a.encounter(scene, 'road', true);
a.setVolume(0); a.setVolume(1); a.setVolume(NaN);
a.setOn(false); a.setVisible(false); a.setVisible(true);
assert.equal(intervals.size, 0, 'returning to a muted tab must not restart ambience');
for (const AudioContext of [undefined, class { constructor() { throw Error('unavailable'); } }]) {
  const fallback = { ZT: {}, window: { AudioContext }, setInterval() { throw Error('should not start'); }, clearInterval() {} };
  vm.createContext(fallback); vm.runInContext(src, fallback);
  fallback.ZT.Audio.unlock(); fallback.ZT.Audio.setOn(true); fallback.ZT.Audio.engine();
  fallback.ZT.Audio.setScene({ key: 'camp' }); fallback.ZT.Audio.setOn(false);
}
console.log('Audio checks passed: gesture gating, scheduled notes, mute, ambient toggles, hidden tabs, all cues, and unsupported audio.');
