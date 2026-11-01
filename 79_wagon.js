/* A closer look at the wagon. Inspection and conversation never advance the
   journey, spend supplies, or draw from the encounter RNG. */
'use strict';
ZT.Wagon = {
  layout: { x: 62, y: 65, scale: 4 },
  parts: [
    { key: 'cabin', label: 'Cabin', x: 3, y: 4, anchor: [154, 95] },
    { key: 'rack', label: 'Roof rack', x: 50, y: 4, anchor: [125, 54] },
    { key: 'engine', label: 'Engine', x: 97, y: 4, anchor: [220, 103] },
    { key: 'hatch', label: 'Rear hatch', x: 3, y: 96, anchor: [65, 111] },
    { key: 'tires', label: 'Tires', x: 97, y: 96, anchor: [202, 133] },
  ],
  place(s) {
    const leg = ZT.currentLeg(s);
    return leg ? `Beside ${leg.road}, on the way to ${ZT.NODES[leg.to].name}.` : `Stopped at ${ZT.NODES[s.at].name}.`;
  },
  passengers(s) { return s.party.filter(m => m.alive && !m.missing); },
  voice(s, m) {
    if (m.isolated) return 'I can hear you from here. Just keep a little distance.';
    if (m.inf === 'symptomatic') return 'Is it cold in here, or is that just me?';
    if (m.inf === 'bitten') return m.infStable ? 'The bandage is holding. I keep checking anyway.' : 'Could somebody look at this before we go?';
    if (m.health < 35 || m.injury > 30) return 'Every bump finds the same sore spot.';
    if (m.illness > 20) return 'A little fresh air. Then we can go.';
    if (m.fatigue > 65) return 'Wake me when we get there. Or when something important falls off.';
    if (m.morale < 30) return 'Keep talking. The quiet is worse.';
    if (s.inv.food <= 0) return 'I have checked the empty food box three times. It has not improved.';
    const weather = {
      heat: 'The seat belt buckle is hotter than the engine. That seems unfair.',
      rain: 'There is a leak above my seat. It has become my seat by tradition.',
      storm: 'I would like to complain about the weather to whoever is still in charge.',
      snow: 'Save the blanket for whoever has the next watch.',
      cold: 'The heater smells terrible. Please leave it on.',
      fog: 'I can see the hood. I am choosing to find that reassuring.',
    };
    if (weather[s.weather]) return weather[s.weather];
    const terrain = ZT.region(s).terrain;
    if (s.day % 2 === 0) {
      if (['mountain', 'hills'].includes(terrain)) return 'That view would be worth stopping for under almost any other circumstances.';
      if (terrain === 'desert') return 'How can there be this much nothing between two places?';
      if (terrain === 'river') return 'For a minute there, with the water alongside, it almost felt like a trip.';
      if (terrain === 'farm') return 'Somebody planted all of that expecting to be here in the fall.';
      if (terrain === 'suburb') return 'All those houses. I wonder who left the last porch light on.';
    }
    return ZT.Story.trait(m)[2];
  },
  describe(s, key, memberIndex) {
    const v = s.vehicle, inv = s.inv;
    if (!v.has) return { title: 'On foot', lines: ['The wagon is behind you. What you can carry is what you have.'] };
    const need = ZT.Party.foodNeed(s);
    const days = need > 0 ? Math.floor(inv.food / need) : 0;
    const weight = Math.round(ZT.State.weight(s));
    const condition = sub => `${ZT.cap(sub)}: ${ZT.Vehicle.subStatus(v[sub])}, ${Math.round(v[sub])}/100${v.broken === sub ? ' — broken' : ''}.`;
    if (key === 'engine') return {
      title: 'Under the hood',
      lines: [condition('engine') + ' ' + condition('electrical'),
        v.broken === 'engine' ? 'The engine is quiet for the wrong reason. Nobody wants to be the first to try the key.'
          : v.engine < 50 ? 'A rag is tucked beside the radiator. It used to be a clean rag. The engine has had a difficult week.'
          : 'Belts, hoses, and a grease-stained diagram. For now, everything is still connected to what it ought to be.',
        `${ZT.n(inv.fuel)} gallons of fuel; about ${Math.floor(ZT.Vehicle.range(s))} miles at this load and pace. ${inv.tools > 0 ? 'The tool kit is within reach.' : 'There is no tool kit to reach for.'}`],
    };
    if (key === 'tires') return {
      title: 'Down by the wheels',
      lines: [condition('tires'),
        v.broken === 'tires' ? 'The flat side faces the road. Everyone looks at it as though that might round it out.'
          : v.tires < 50 ? 'The tread has worn thin. The next sharp stone will have an easier job than the last one.'
          : 'Gravel is wedged in the tread. The tires have collected a little of every road you have taken.',
        `${inv.parts} ${ZT.plural(inv.parts, 'set')} of spare parts left. ${['mountain', 'hills'].includes(ZT.region(s).terrain) ? 'The grades ahead will ask more of the wagon.' : 'The shoulder runs west until it disappears into the distance.'}`],
    };
    if (key === 'rack') return {
      title: 'Under the roof straps',
      lines: [`Total supplies: ${weight} lbs. ${weight > 900 ? 'The load is making the wagon use more fuel.' : 'The straps hold the load close to the roof.'}`,
        weight ? 'A corner of the tarp lifts in the wind. The knots are all different; everyone insists theirs is the one that holds.' : 'Empty straps tap against the roof. There is room for supplies, if you can find them.',
        `${ZT.n(inv.food)} lbs of food: about ${days} full days at the current rations (${ZT.n(need)} lb/day). ${inv.goods > 0 ? 'The trading goods are packed where you can find them.' : 'There are no trading goods left to bargain with.'}`],
    };
    if (key === 'hatch') return {
      title: 'The rear hatch',
      lines: [`${inv.medicine} medicine ${ZT.plural(inv.medicine, 'kit')}, ${inv.ammo} rounds, ${inv.parts} ${ZT.plural(inv.parts, 'set')} of parts.`,
        inv.food > 0 ? 'The food box has become a table, a seat, and the subject of most conversations. Nobody puts their feet on it anymore.' : 'The empty food box is still here. Nobody has found a better use for it.',
        condition('body') + ' ' + (inv.medicine > 0 ? 'The medicine is kept on top. Nobody wants to unpack everything in a hurry.' : 'The space where the medicine used to be is easy to find.')],
    };
    const members = this.passengers(s);
    const m = members.find(member => s.party.indexOf(member) === memberIndex) || members[0];
    return {
      title: 'Inside the cabin',
      lines: [members.length === 1 ? 'One traveler and a lot of empty seats. The folded atlas rides within reach.' : `${members.length} travelers, a folded atlas, and a dashboard nobody has dusted since Omaha.`,
        v.electrical < 50 ? 'The radio dial glows unevenly. Most stations have become static.' : 'The radio is turned down. An old cassette sits beside the dial, waiting for a road that feels safe enough.'],
      member: m ? {
        index: s.party.indexOf(m), name: m.name,
        detail: `${ZT.cap(m.role)} · ${ZT.Party.trait(m).name} · ${ZT.State.condition(m)}${m.isolated ? ' · isolated' : ''}. Health ${Math.round(m.health)}/100; fatigue ${Math.round(m.fatigue)}/100.`,
        quote: this.voice(s, m), contribution: ZT.Party.contribution(s, m),
      } : null,
    };
  },
};
