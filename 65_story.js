/* Small human stories. No extra clocks, currencies, or combat controls. */
'use strict';
ZT.Story = {
  traits: {
    driver: ['Stubborn optimist', 'keeps promising the next town will be better', 'We have passed three last gas stations. I am beginning to question the signs.'],
    medic: ['Soft heart, steady hands', 'still believes strangers are worth stopping for', 'We can be careful without forgetting how to be people.'],
    mechanic: ['Professional pessimist', 'complains about the wagon and keeps it running', 'That noise is new. I preferred the old noise.'],
    scout: ['Quiet observer', 'notices what everyone else drives past', 'No birds on that fence. Keep moving.'],
    generalist: ['Collector of small comforts', 'saves little things that remind everyone of home', 'I found a mint in my coat. We may have to hold an auction.'],
  },
  trait(m) { return this.traits[m.role] || this.traits.generalist; },
  ambient: {
    farm:     ['A silo leans over a fence line nobody mended in time. Nobody stops to look.',
               'Rows of something once tended now just grow. Nobody can name the crop anymore.',
               'A dog trots along a distant tree line, keeping its own counsel.',
               'The smell of a barn carries a long way on a still day.'],
    highway:  ['The radio catches a weather report. The man sounds bored. You envy him.',
               'A green sign counts down the miles to a town that may not be there anymore.',
               'Another wagon rusts on the shoulder, doors open, long picked over.',
               'The centerline runs on, patient, indifferent to who is still using it.'],
    river:    ['The water runs alongside for a while, going somewhere calmer than here.',
               'A fish jumps. For a moment everyone in the wagon watches the same ripple.',
               'The road follows the bank until the bank decides otherwise.',
               'Cottonwoods lean over the water like they are listening for something.'],
    plains:   ['Wind works at the windows. For a little while, it is the only thing following you.',
               'The horizon does not get any closer no matter how long you watch it.',
               'Grass runs to the edge of the world in every direction.',
               'A hawk holds still in the wind, working less than the engine.'],
    hills:    ['The road climbs, drops, and climbs again, like it cannot decide.',
               'A switchback opens a view nobody asked for and everybody takes anyway.',
               'The engine works harder here. So does everyone pretending not to notice.',
               'Rock outcrops crowd the shoulder, patient as anything else out here.'],
    desert:   ['Heat shimmers off the road ahead, turning distance into rumor.',
               'Nothing moves out here except the wagon and, once, something that was not the wagon.',
               'The land is flat and open and offers no place to hide, which is its own kind of honesty.',
               'A dry wash crosses the road, empty now, in no hurry to be otherwise.'],
    mountain: ['The grade steepens and conversation drops off with it.',
               'Snow lingers in the shadowed cuts even when the road ahead is bare.',
               'The wagon takes the switchbacks slower than anyone would like.',
               'Pines close in on both sides, cutting the sky down to a strip.'],
    suburb:   ['Rows of houses pass, curtains still drawn, mail still waiting.',
               'A shopping cart sits alone in an intersection, going nowhere in particular.',
               'Streetlights stand dark in daylight, waiting for a dusk that will not need them.',
               'A cul-de-sac sign points to a street nobody has reason to take.'],
  },
  line(s) {
    const alive = ZT.State.alive(s);
    if (!alive.length) return 'Nobody speaks.';
    const m = alive[Math.floor(s.day / 2) % alive.length];
    if (m.inf === 'symptomatic') return `${m.name} asks how much farther. Nobody gives a number.`;
    if (m.fatigue > 70) return `${m.name}: "I am not asleep. I am resting my eyes very thoroughly."`;
    if (s.day % 3 === 0) {
      const pool = this.ambient[ZT.region(s).terrain] || this.ambient.plains;
      return pool[Math.floor(s.day / 3) % pool.length];
    }
    return `${m.name}: "${this.trait(m)[2]}"`;
  },
  remember(s, text) {
    s.flags.roadMemories = s.flags.roadMemories || [];
    s.flags.roadMemories.push({ day: s.day, text });
    ZT.State.log(s, text, true);
    return text;
  },
  due(s, when) {
    if (when !== 'travel' || s.day - s.lastEventDay < 2) return null;
    const f = s.flags;
    let id = null;
    if (!f.redScarf && s.stats.travelDays >= 3) id = 'story_red_scarf';
    else if (f.redScarf && !f.redCamp && s.day >= f.redDay + 5 && s.miles >= f.redMile + 65) id = 'story_red_camp';
    else if (f.redCamp && !f.redEnd && s.day >= f.redCampDay + 6 && s.miles >= f.redCampMile + 90) id = 'story_red_return';
    return id && !s.once[id] ? id : null;
  },
  forecast(s) {
    const need = ZT.Party.foodNeed(s);
    const days = need ? Math.floor(s.inv.food / need) : 0;
    const lines = [`Food: about ${days} full days at these rations (${ZT.n(need)} lb/day).`];
    if (s.vehicle.has) lines.push(`Fuel: about ${Math.floor(ZT.Vehicle.range(s))} miles at this load and pace.`);
    let danger = 'No immediate crisis. Weather and encounters can change that.';
    if (s.vehicle.has && s.vehicle.broken) danger = `Wagon: repair the ${s.vehicle.broken} before driving.`;
    else if (days < 2) danger = 'Food first: scavenge soon. An unfed day damages health and morale.';
    else if (ZT.State.alive(s).some(m => m.inf === 'symptomatic' || m.inf === 'bitten')) danger = 'Infection: check the party and treat wounds while there is time.';
    else if (s.vehicle.has && ZT.Vehicle.range(s) < 30) danger = 'Fuel is low. Search before committing to a long road.';
    else if (ZT.Party.avgFatigue(s) > 65) danger = 'The party needs rest. Exhaustion slows travel and can cost health.';
    else if (ZT.Travel.threat(s) > 0.65) danger = 'The dead are active here. Noise makes encounters more likely.';
    lines.push(danger);
    return lines;
  },
  epilogue(s, m) {
    if (!m.alive) return `${m.name} ${this.trait(m)[1]}. You remember that as well as the way they died.`;
    if (m.missing) return `${m.name} is still missing. There is no grave to put a name on.`;
    if (s.over && s.over.why === 'win') return `${m.name} made it. At the gate, someone asks what they can do. "${ZT.cap(m.role)}," they say. A beginning.`;
    return `${m.name} was still with you when the journey ended. They ${this.trait(m)[1]}.`;
  },
};

ZT.Events.add([
  { id: 'story_red_scarf', cat: 'people', once: true, cond: () => false, art: 'road',
    text(s) {
      const medic = ZT.State.byRole(s, 'medic');
      return 'A woman in a red scarf stands beside a handcart. Her brother cannot walk. She asks for food, not a ride. ' +
        (medic ? `${medic.name} says, "We can spare something. If we decide to."` : 'She watches you count the bags.');
    }, choices: [
      { text: 'Give them food', hint: '20 lb food; the medic takes heart', show: s => s.inv.food >= 20,
        do(s, c) { ZT.X.take(s, c, 'food', 20); const m = ZT.State.byRole(s, 'medic'); if (m) ZT.X.moraleM(s, c, m, 5); s.flags.redScarf = 'helped'; return ZT.Story.remember(s, 'You fed the woman in the red scarf and her brother. She said her name was Ruth.'); } },
      { text: 'Take food from the handcart', hint: 'gain 15 lb food; lose 5 morale',
        do(s, c) { ZT.X.give(s, c, 'food', 15); ZT.X.morale(s, c, -5); s.flags.redScarf = 'robbed'; return ZT.Story.remember(s, 'You took food from the handcart. The woman in the red scarf watched without speaking.'); } },
      { text: 'Leave them their supplies and move on', hint: 'no supply cost',
        do(s) { s.flags.redScarf = 'passed'; return ZT.Story.remember(s, 'You left the woman in the red scarf beside the road. There was no way to know what happened next.'); } },
    ], after(s) { s.flags.redDay = s.day; s.flags.redMile = s.miles; } },
  { id: 'story_red_camp', cat: 'people', once: true, cond: () => false, art: 'camp',
    text(s) { return 'A camp has formed behind a feed store. A red scarf hangs from a tent pole. Ruth recognizes you. ' +
      ({ helped: 'Her brother is sitting up. She sets a fuel can beside the fire.', robbed: 'She tells the others what you took. The welcome ends there.', passed: '"We found help," she says. She lets that sit for a moment.' }[s.flags.redScarf]); },
    choices: [
      { text: 'Accept Ruth\'s thanks', hint: '8 gallons fuel', show: s => s.flags.redScarf === 'helped',
        do(s, c) { ZT.X.give(s, c, 'fuel', 8); s.flags.redCamp = 'friend'; return ZT.Story.remember(s, 'Ruth shared fuel because you had shared food. Her brother shook your hand.'); } },
      { text: 'Return what you took', hint: '15 lb food; an apology, not a clean slate', show: s => s.flags.redScarf === 'robbed' && s.inv.food >= 15,
        do(s, c) { ZT.X.take(s, c, 'food', 15); s.flags.redCamp = 'amends'; return ZT.Story.remember(s, 'You repaid the food. Ruth accepted it. Forgiveness was not discussed.'); } },
      { text: 'Trade for a fuel can', hint: '2 goods for 6 gallons', show: s => s.flags.redScarf === 'passed' && s.inv.goods >= 2,
        do(s, c) { ZT.X.take(s, c, 'goods', 2); ZT.X.give(s, c, 'fuel', 6); s.flags.redCamp = 'trade'; return ZT.Story.remember(s, 'You traded fairly at Ruth\'s camp. This time you learned her name.'); } },
      { text: 'Keep moving', hint: 'no supplies change hands',
        do(s) { s.flags.redCamp = 'left'; return ZT.Story.remember(s, 'You left Ruth\'s camp. Some roads can be traveled twice without anything being put right.'); } },
    ], after(s) { s.flags.redCampDay = s.day; s.flags.redCampMile = s.miles; } },
  { id: 'story_red_return', cat: 'people', once: true, cond: () => false, art: 'road',
    text(s) { const friendly = ['friend', 'amends', 'trade'].includes(s.flags.redCamp); return friendly ?
      'Ruth\'s brother waves you down before a blind bend. "Dead piled up past there. Ruth said to watch for you." He points out a quiet way around.' :
      'A caravan turns off before a blind bend. You recognize Ruth\'s handcart tied to a truck. Nobody waves. Beyond the bend, the dead fill the road.'; },
    choices: [
      { text: 'Take the warned-about side road', hint: 'avoid the crowd; morale +3', show: s => ['friend', 'amends', 'trade'].includes(s.flags.redCamp),
        do(s, c) { ZT.X.morale(s, c, 3); s.flags.redEnd = 'warned'; return ZT.Story.remember(s, 'A choice beside a handcart became a warning farther west. Ruth\'s family remembered you.'); } },
      { text: 'Backtrack and find a quiet way around', hint: 'half a day lost', show: s => !['friend', 'amends', 'trade'].includes(s.flags.redCamp),
        do(s, c) { ZT.X.delay(s, c, 0.5); s.flags.redEnd = 'detour'; return ZT.Story.remember(s, 'You found your own way around the dead. There was nobody ahead waiting to warn you.'); } },
    ] },
]);
