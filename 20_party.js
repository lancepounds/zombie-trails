/* ZOMBIE TRAILS — party: health, fatigue, morale, infection, death */
'use strict';
ZT.Party = {
  /* Daily processing for every living member. mode: 'travel' | 'rest' | 'idle' */
  dailyTick(s, mode) {
    const diff = ZT.DIFF[s.difficulty];
    const alive = ZT.State.alive(s);
    if (!alive.length) return;
    const rat = ZT.RATIONS[s.rations];
    const wx = ZT.WEATHER[s.weather];
    const pace = ZT.PACE[s.pace];
    // food
    const need = alive.length * rat.lbs * (s.vehicle.has ? 1 : 1.15);
    let starving = false;
    if (s.inv.food >= need) s.inv.food = ZT.round1(s.inv.food - need);
    else { s.inv.food = 0; starving = true; }
    // remember which supply ran dry first — the journal and the summary use it
    if (!s.flags.firstZero) for (const k of ZT.ITEM_ORDER) if ((s.inv[k] || 0) <= 0) { s.flags.firstZero = k; break; }

    for (const m of alive) {
      let heal = starving ? -6 : rat.heal;
      let fat = starving ? 5 : rat.fatigue;
      // the road itself costs something; only stopping actually mends people
      if (mode === 'rest') { heal += 4; fat -= 25; }
      else if (mode === 'idle') { heal += 1; fat -= 10; }
      else { heal -= 1; fat += pace.fatigue + wx.fatigue; if (!s.vehicle.has) { heal -= 1; fat += 6; } }
      heal += wx.health;
      if (m.morale > 70) heal += 1;
      if (m.morale < 25) heal -= 1;
      if (m.morale < 12) heal -= 2;
      if (m.fatigue > 80) heal -= 2;
      if (m.fatigue > 92) heal -= 2;
      // injuries and illness — both linger longer than anyone expects
      if (m.injury > 0) {
        if (m.injury > 25) heal -= Math.ceil(m.injury / 25);
        m.injury = Math.max(0, m.injury - (mode === 'rest' ? 6 : mode === 'idle' ? 4 : 2));
      }
      if (m.illness > 0) {
        heal -= Math.ceil(m.illness / 18);
        fat += 2;
        m.illness = Math.max(0, m.illness - (mode === 'rest' ? 7 : mode === 'idle' ? 4 : 2));
      }
      // infection
      heal += ZT.Party.infectionTick(s, m, diff);
      m.health = ZT.clamp(m.health + heal, 0, 100);
      m.fatigue = ZT.clamp(m.fatigue + fat, 0, 100);
      m.morale = ZT.clamp(m.morale + rat.morale + (starving ? -3 : 0) + (m.isolated ? -1 : 0), 0, 100);
      if (m.health <= 0) {
        let cause = 'exhaustion';
        if (m.inf === 'symptomatic') cause = 'infection';
        else if (starving) cause = 'starvation';
        else if (m.illness > 20) cause = 'illness';
        else if (m.injury > 20) cause = 'injuries';
        else if (s.weather === 'cold' || s.weather === 'snow') cause = 'exposure';
        ZT.Party.kill(s, m, cause);
      }
    }
    if (starving) s.flags.starvedDays = (s.flags.starvedDays || 0) + 1;
    else s.flags.starvedDays = 0;
  },

  /* returns a health delta for the day */
  infectionTick(s, m, diff) {
    if (m.inf === 'none') return 0;
    m.infDays++;
    if (m.inf === 'exposed') {
      if (m.infDays >= 2) {
        if (ZT.roll(s, 0.10 * diff.infect)) { m.inf = 'bitten'; m.infSev = ZT.roll(s, 0.75) ? 1 : 2; m.infDays = 0; m.infStable = false;
          ZT.State.log(s, `${m.name}'s scratch has gone bad. It is an infection now.`, true); }
        else if (ZT.roll(s, 0.5)) { m.inf = 'none'; m.infDays = 0; ZT.State.log(s, `${m.name}'s scratch has healed clean.`); }
      }
      return 0;
    }
    if (m.inf === 'bitten') {
      if (m.infSev === 0) {
        if (m.infDays >= 3 && ZT.roll(s, 0.5)) { m.inf = 'none'; m.infDays = 0; m.infStable = false; ZT.State.log(s, `${m.name}'s bite has closed up. It was only a bite.`, true); }
        return -1;
      }
      if (m.infStable) {
        if (m.infDays >= 5 && ZT.roll(s, 0.3)) { m.inf = 'none'; m.infDays = 0; m.infStable = false; ZT.State.log(s, `${m.name} is clear of the infection. The medicine held.`, true); }
        else if (ZT.roll(s, 0.03 * diff.infect)) { m.infStable = false; ZT.State.log(s, `${m.name}'s wound has opened again. The fever is back.`); }
        return -1;
      }
      const daysNeeded = m.infSev === 2 ? 3 : 4;
      const p = m.infSev === 2 ? 0.40 : 0.17;
      if (m.infDays >= daysNeeded && ZT.roll(s, p * diff.infect)) {
        m.inf = 'symptomatic'; m.infDays = 0;
        ZT.State.log(s, `${m.name} is burning with fever and talking to people who are not there.`, true);
      }
      return -2;
    }
    if (m.inf === 'symptomatic') {
      if (m.infStable) {
        if (ZT.roll(s, 0.12)) { m.inf = 'bitten'; m.infSev = 0; m.infDays = 0; m.infStable = false; ZT.State.log(s, `${m.name}'s fever has broken.`, true); }
        return -2;
      }
      m.morale = Math.max(0, m.morale - 2);
      // an unisolated symptomatic member is a danger to the others
      if (!m.isolated && ZT.roll(s, 0.05 * diff.infect)) {
        const others = ZT.State.alive(s).filter((o) => o !== m);
        if (others.length) {
          const o = ZT.pick(s, others);
          if (o.inf === 'none') { o.inf = 'exposed'; o.infDays = 0; }
          o.injury = Math.min(100, o.injury + 10);
          ZT.State.log(s, `${m.name} lashed out in a fever and caught ${o.name} across the arm.`, true);
        }
      }
      return m.infSev === 2 ? -7 : -5;
    }
    return 0;
  },

  kill(s, m, cause) {
    if (!m.alive) return;
    m.alive = false; m.cause = cause; m.diedDay = s.day; m.diedMile = Math.round(s.miles);
    m.isolated = false;
    s.stats.deaths++;
    s.pendingDeaths.push(s.party.indexOf(m));
    ZT.State.log(s, `${m.name} died of ${cause}.`, true);
    for (const o of s.party) if (o.alive) o.morale = Math.max(0, o.morale - 15);
  },

  /* Medicine use. kind: auto based on what is wrong. Returns text. */
  treat(s, m) {
    if (!m || !m.alive) return 'There is no one to treat.';
    if (s.inv.medicine <= 0) return 'There is no medicine left.';
    const medic = ZT.State.hasRole(s, 'medic') ? 0.15 : 0;
    const diff = ZT.DIFF[s.difficulty];
    s.inv.medicine--;
    const lines = [];
    if (m.inf === 'bitten' || m.inf === 'symptomatic') {
      let p = m.inf === 'bitten' ? [1.0, 0.74, 0.46][m.infSev] : [0.9, 0.5, 0.26][m.infSev];
      if (m.inf === 'bitten' && m.infDays <= 1) p += 0.18;   // dressed while it is fresh
      p = ZT.clamp(p + medic + (s.difficulty === 'easy' ? 0.12 : 0) - (s.difficulty === 'nightmare' ? 0.1 : 0), 0.05, 1);
      if (m.infStable) { m.health = Math.min(100, m.health + 8); lines.push(`${m.name} is already stable. The extra dose eases the pain a little.`); }
      else if (ZT.roll(s, p)) { m.infStable = true; m.infDays = Math.max(m.infDays, 1); m.health = Math.min(100, m.health + 6); lines.push(`The fever eases. ${m.name}'s wound looks less angry. It may hold.`); }
      else { m.health = Math.min(100, m.health + 4); lines.push(`The medicine does not seem to take. ${m.name} is no better.`); }
    } else if (m.inf === 'exposed') {
      m.inf = 'none'; m.infDays = 0; lines.push(`${m.name}'s scratch is cleaned and dressed. It should heal clean.`);
    }
    if (m.injury > 0) { m.injury = Math.max(0, m.injury - 40); m.health = Math.min(100, m.health + 5); lines.push(`${m.name}'s injury is splinted and dressed.`); }
    if (m.illness > 0) { m.illness = Math.max(0, m.illness - 45); m.health = Math.min(100, m.health + 5); lines.push(`${m.name} keeps the medicine down. The sickness loosens its grip.`); }
    if (!lines.length) { m.health = Math.min(100, m.health + 12); m.fatigue = Math.max(0, m.fatigue - 10); lines.push(`${m.name} takes vitamins and painkillers and feels a little better. It was probably a waste.`); }
    return lines.join(' ');
  },

  /* What a member needs, for the treat menu */
  needs(m) {
    const n = [];
    if (m.inf === 'symptomatic') n.push('fever');
    else if (m.inf === 'bitten') n.push('bite');
    else if (m.inf === 'exposed') n.push('scratch');
    if (m.injury > 0) n.push('injury');
    if (m.illness > 0) n.push('illness');
    return n;
  },

  /* hint text about a bite (partial information) */
  woundHint(s, m) {
    if (m.inf !== 'bitten') return '';
    if (m.infStable) return 'The wound is dressed and quiet.';
    if (m.infDays < 1) return 'The wound is fresh. Too early to tell.';
    if (m.infSev === 0) return 'The wound is pink and clean at the edges.';
    if (m.infSev === 1) return ZT.roll(s, 0.5) ? 'The wound is swollen and hot.' : 'The wound weeps. Hard to say.';
    return 'The wound is dark at the edges and smells wrong.';
  },

  avgHealth(s) { const a = ZT.State.alive(s); return a.length ? a.reduce((t, m) => t + m.health, 0) / a.length : 0; },
  avgFatigue(s) { const a = ZT.State.alive(s); return a.length ? a.reduce((t, m) => t + m.fatigue, 0) / a.length : 0; },
  avgMorale(s) { const a = ZT.State.alive(s); return a.length ? a.reduce((t, m) => t + m.morale, 0) / a.length : 0; },
};
