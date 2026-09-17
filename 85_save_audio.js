/* ZOMBIE TRAILS — save slots, settings, memorials */
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
