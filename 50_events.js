/* ZOMBIE TRAILS — event engine.
   Events are data. The engine filters by region/state, weights, picks, and resolves choices.

   Event shape:
     id      unique string
     cat     'road'|'zombie'|'vehicle'|'health'|'weather'|'people'|'camp'|'rare'|'landmark'
     regions array of region ids, or '*'
     when    'travel'|'camp'|'any'  (default 'travel')
     weight  number (default 5)
     cond    (s) => bool
     once    true = fires at most once per game
     cool    days before it can repeat (default 20)
     art     renderer scene key
     text    string or (s,c) => string
     choices array of { text, hint, show(s), do(s,c) => string|{text,then} }
*/
'use strict';
ZT.Events = {
  all: [],
  byId: {},
  add(list) {
    for (const e of list) {
      e.cat = e.cat || 'road';
      e.regions = e.regions || '*';
      e.when = e.when || 'travel';
      e.weight = e.weight == null ? 5 : e.weight;
      e.cool = e.cool == null ? 20 : e.cool;
      if (ZT.Events.byId[e.id]) throw new Error('duplicate event id: ' + e.id);
      ZT.Events.byId[e.id] = e;
      ZT.Events.all.push(e);
    }
  },

  eligible(s, when, pool) {
    const reg = ZT.regionId(s);
    const out = [];
    for (const e of (pool || ZT.Events.all)) {
      if (e.cat === 'landmark') continue;
      if (e.when !== 'any' && e.when !== when) continue;
      if (e.regions !== '*' && e.regions.indexOf(reg) < 0) continue;
      if (e.once && s.once[e.id]) continue;
      const last = s.stats.eventsSeen[e.id];
      if (last && s.day - last < e.cool) continue;
      if (e.cond && !e.cond(s)) continue;
      out.push(e);
    }
    return out;
  },

  weightOf(s, e) {
    let w = e.weight;
    if (typeof w === 'function') w = w(s);
    // zombie events scale with threat; quiet events fade as threat rises
    const t = ZT.Travel.threat(s);
    if (e.cat === 'zombie') w *= 0.45 + t * 1.4;
    else if (e.cat === 'road' || e.cat === 'people') w *= 1.15 - t * 0.35;
    if (e.cat === 'vehicle' && s.vehicle.has) w *= 1 + (100 - ZT.Vehicle.overall(s)) / 90;
    if (e.cat === 'weather' && s.weather !== 'clear') w *= 1.8;
    if (s.recent.indexOf(e.id) >= 0) w *= 0.15;
    return Math.max(0.01, w);
  },

  choose(s, when, pool) {
    const list = ZT.Events.eligible(s, when, pool);
    if (!list.length) return null;
    let total = 0;
    const ws = list.map((e) => { const w = ZT.Events.weightOf(s, e); total += w; return w; });
    let r = ZT.rand(s) * total;
    for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  },

  /* chance an event fires on a given day */
  fireChance(s, when) {
    if (when === 'camp') return 0.30;
    const t = ZT.Travel.threat(s);
    let p = 0.40 + t * 0.22;
    p *= ZT.PACE[s.pace].enc;
    if (s.day - s.lastEventDay <= 1) p *= 0.5;
    if (s.day - s.lastEventDay >= 5) p += 0.18;
    return ZT.clamp(p, 0.05, 0.85);
  },

  maybeFire(s, when) {
    if (!ZT.roll(s, ZT.Events.fireChance(s, when))) return null;
    const e = ZT.Events.choose(s, when);
    if (!e) return null;
    return ZT.Events.begin(s, e);
  },

  /* Prepare an event instance for the UI: resolves text, filters choices. */
  begin(s, e) {
    if (typeof e === 'string') e = ZT.Events.byId[e];
    if (!e) return null;
    s.stats.events++;
    s.stats.eventsSeen[e.id] = s.day;
    s.lastEventDay = s.day;
    if (e.once) s.once[e.id] = true;
    s.recent.unshift(e.id);
    if (s.recent.length > 12) s.recent.pop();
    const c = { d: [], ev: e };
    if (e.setup) e.setup(s, c);
    const text = typeof e.text === 'function' ? e.text(s, c) : e.text;
    const choices = (e.choices || []).filter((ch) => !ch.show || ch.show(s, c));
    const inst = {
      id: e.id, art: e.art || null, cat: e.cat, text,
      choices: choices.map((ch, i) => ({
        i, text: typeof ch.text === 'function' ? ch.text(s, c) : ch.text,
        hint: typeof ch.hint === 'function' ? ch.hint(s, c) : ch.hint || '',
      })),
      _choices: choices, _c: c, _e: e,
    };
    if (!inst.choices.length) inst.choices = [{ i: -1, text: 'Continue', hint: '' }];
    return inst;
  },

  /* Resolve a choice. Returns { text, deltas, next } where next is a chained event instance or null. */
  resolve(s, inst, index) {
    const c = inst._c;
    c.d = [];
    let outText = '';
    let next = null;
    if (index >= 0 && inst._choices[index]) {
      const ch = inst._choices[index];
      s.stats.choices[inst.id + ':' + index] = (s.stats.choices[inst.id + ':' + index] || 0) + 1;
      const r = ch.do ? ch.do(s, c) : '';
      if (r && typeof r === 'object') {
        outText = r.text || '';
        if (r.then) next = ZT.Events.begin(s, r.then);
      } else outText = r || '';
    }
    if (inst._e.after) {
      const extra = inst._e.after(s, c, index);
      if (extra) outText += (outText ? ' ' : '') + extra;
    }
    const deaths = [];
    while (s.pendingDeaths.length) deaths.push(s.party[s.pendingDeaths.shift()]);
    if (!ZT.State.aliveCount(s) && !s.over) ZT.Travel.endGame(s, 'party');
    return { text: outText, deltas: c.d.slice(), next, deaths };
  },
};
