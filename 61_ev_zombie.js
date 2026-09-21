/* ZOMBIE TRAILS — event content: the dead */
'use strict';
(function () {
const X = ZT.X;
const someone = (s) => X.someone(s);
const T = (s) => ZT.Travel.threat(s);

ZT.Events.add([
{
  id: 'z_midwest_beer_tent', cat: 'zombie', regions: ['missouri', 'platte', 'sandhills', 'panhandle'], weight: 5, cool: 30,
  cond: (s) => s.day <= 30 && s.weather === 'heat', art: 'beer_tent',
  text: 'The county fair beer tent promises COLD ONES. A dozen figures lean against the fence in the shade. One turns toward you with half a face. The beer garden has a very relaxed admissions policy.',
  choices: [
    { text: 'Slip around the back for sealed supplies', hint: 'half a day; fatigue +6; loot or injury',
      do(s, c) { X.delay(s, c, 0.5); X.fatigueAll(s, c, 6);
        if (ZT.roll(s, X.p(s, 0.55, 'scout', 0.2))) { X.give(s, c, 'goods', 1); X.give(s, c, 'food', 8); return 'Unopened cans and a box of pretzels behind the concession stand. The cans are warm. They will still trade, which is the kindest available thing to say about them.'; }
        const m = someone(s); X.injure(s, c, m, 12); X.noise(s, c, 10); return `${m.name} catches a sleeve on the fence as the crowd turns. You get clear with a cut arm and no refreshments.`; } },
    { text: 'Shoot a path to the concession stand', hint: '10 rounds; noise +22; horde +3; supplies', show: (s) => s.inv.ammo >= 10,
      do(s, c) { X.shots(s, c, 10); X.noise(s, c, 22); X.horde(s, c, 3); X.give(s, c, 'goods', 2); X.give(s, c, 'food', 12); return 'You clear the fence and empty the stand. A fair amount of ammunition for warm beer and pretzels. The noise has advertised that concessions are open again.'; } },
    { text: 'Keep your distance and move on', hint: 'no cost',
      do() { return 'The sign also promises LIVE MUSIC. You have doubts about both words.'; } },
  ],
},
{
  id: 'z_midwest_sprinkler', cat: 'zombie', regions: ['missouri', 'platte', 'sandhills'], weight: 4, cool: 30,
  cond: (s) => s.day <= 30 && s.weather === 'heat', art: 'sprinkler',
  text: 'An irrigation sprinkler sweeps across the road. Three dead people follow it back and forth, bumping into each other when it reverses. For once, someone else looks worse in the heat.',
  choices: [
    { text: 'Wait for them to follow the spray away', hint: 'half a day; fatigue +3; quiet passage',
      do(s, c) { X.delay(s, c, 0.5); X.fatigueAll(s, c, 3); return 'They follow the water into the field. You pass quietly. The sprinkler has done more traffic control than the county all week.'; } },
    { text: 'Throw a can down the ditch and hurry past', hint: '1 lb food; noise +8; fatigue +5', show: (s) => s.inv.food >= 1,
      do(s, c) { X.take(s, c, 'food', 1); X.noise(s, c, 8); X.fatigueAll(s, c, 5); return 'The can rattles down the culvert and the three heads turn. You hurry through the gap. Nobody votes to retrieve lunch.'; } },
    { text: 'Try to squeeze past immediately', hint: 'injury risk; noise +5',
      do(s, c) { X.noise(s, c, 5); if (ZT.roll(s, 0.4)) { const m = someone(s); X.injure(s, c, m, 15); X.fatigueAll(s, c, 8); return `${m.name} gets caught against the fence as the spray turns back. You pull free with torn clothing and a nasty scrape.`; } return 'You pass while all three are facing the water. A rare case of Nebraska irrigation improving road safety.'; } },
  ],
},
/* Local encounters for the stretches with the least regional content. */
{
  id: 'z_missouri_silo_shadow', cat: 'zombie', regions: ['missouri'], weight: 5, cool: 30, art: 'zsilo',
  text: 'Three figures stand in the shade of a grain elevator. When your shadow reaches them, all three turn. That settles the question of whether to ask directions.',
  choices: [
    { text: 'Go around behind the machinery shed', hint: 'time; quiet',
      do(s, c) { X.delay(s, c, 0.3); X.noise(s, c, -5); X.fatigueAll(s, c, 4); return 'The shed blocks their view long enough. You emerge west of the elevator and keep the directions you already had.'; } },
    { text: 'Shoot a path through', hint: '6 rounds; noise', show: (s) => s.inv.ammo >= 6,
      do(s, c) { X.shots(s, c, 6); X.noise(s, c, 22); X.horde(s, c, 3); X.kills(s, 3); return 'The elevator throws every shot back at you. Three fall. Something farther off answers.'; } },
    { text: 'Slip past close to the wall', hint: 'quick; exposure risk',
      do(s, c) { X.noise(s, c, 4); if (ZT.roll(s, 0.25 + T(s) * 0.15)) { const m = someone(s); X.expose(s, c, m); X.injure(s, c, m, 8); return `${m.name} brushes past a reaching hand. The space beside the wall was narrower than it looked.`; } return 'They reach a moment late. You decide not to try that twice.'; } },
  ],
},
{
  id: 'z_missouri_ditch_hands', cat: 'zombie', regions: ['missouri'], weight: 5, cool: 30, art: 'zwater',
  text: 'Something in the drainage ditch grips the broken guardrail. Then another hand appears. The road is dry. The ditch is getting crowded.',
  choices: [
    { text: 'Wait beyond their reach', hint: 'time; safest',
      do(s, c) { X.delay(s, c, 0.4); X.fatigueAll(s, c, 5); X.noise(s, c, -5); return 'They climb onto the eastbound shoulder one at a time and follow a flapping tarp. You go west.'; } },
    { text: 'Move past before they climb out', hint: 'quick; injury risk',
      do(s, c) { X.noise(s, c, 8); if (ZT.roll(s, 0.3)) { const m = someone(s); X.injure(s, c, m, 12); X.wear(s, c, 'body', 5); return `${m.name} gets caught against the rail while avoiding the first one up. Nothing bites. Nothing apologizes.`; } return 'The last pair of hands reaches pavement after you have gone. A small margin is still a margin.'; } },
  ],
},
{
  id: 'z_missouri_weigh_station', cat: 'zombie', regions: ['missouri'], weight: 5, cool: 30, art: 'zwrecks',
  text: 'The weigh station lane is jammed with trucks. Something inside the scale office pounds the glass every time the loose sign bangs in the wind.',
  choices: [
    { text: 'Keep your distance and move on', hint: 'safe',
      do(s, c) { X.noise(s, c, -4); return 'The office keeps arguing with the sign. Neither notices you leave.'; } },
    { text: 'Search the nearest truck cab quietly', hint: 'small supplies; risk',
      do(s, c) { X.delay(s, c, 0.3); X.noise(s, c, 6); if (ZT.roll(s, X.p(s, 0.65, 'scout', 0.15))) { X.give(s, c, 'food', 12); return 'Crackers, a sealed jar of peanut butter, and a logbook with no more entries. The glass holds while you leave.'; } const m = someone(s); X.injure(s, c, m, 14); X.noise(s, c, 12); return `${m.name} catches a sleeve on the cab door when the office window breaks. You leave the cupboard unopened.`; } },
  ],
},
{
  id: 'z_lava_tube_echo', cat: 'zombie', regions: ['lava'], weight: 5, cool: 30, art: 'ztunnel',
  text: 'A lava tube opens beside the road. A stone drops inside and you hear movement. Then more movement. The cave appears to be occupied beyond its advertised capacity.',
  choices: [
    { text: 'Detour around the opening quietly', hint: 'time; rough ground',
      do(s, c) { X.delay(s, c, 0.4); X.fatigueAll(s, c, 6); X.noise(s, c, -6); return 'You keep a ridge of black rock between you and the entrance. The echoes stay underground.'; } },
    { text: 'Pass the mouth before they emerge', hint: 'quick; bite risk',
      do(s, c) { X.noise(s, c, 12); X.wear(s, c, 'body', 6); if (ZT.roll(s, 0.22 + T(s) * 0.15)) { const m = someone(s); X.bite(s, c, m); return `${m.name} meets the first one at the lip of the tube. It is out of the dark before anyone is ready.`; } return 'Hands appear over the lip behind you. You do not stay to count them.'; } },
    { text: 'Shoot the first ones out', hint: '8 rounds; echoes carry', show: (s) => s.inv.ammo >= 8,
      do(s, c) { X.shots(s, c, 8); X.noise(s, c, 26); X.horde(s, c, 4); X.kills(s, 4); return 'Four drop across the entrance. The tube carries the shots a long way. You take the opening and leave.'; } },
  ],
},
{
  id: 'z_owyhee_mailboxes', cat: 'zombie', regions: ['owyhee'], weight: 5, cool: 30, art: 'zstreet',
  text: 'A row of rural mailboxes marks the turn toward Boise. A figure stands at each of the first three. None has collected the mail in some time.',
  choices: [
    { text: 'Circle around by the empty field', hint: 'time; fatigue',
      do(s, c) { X.delay(s, c, 0.3); X.fatigueAll(s, c, 6); X.noise(s, c, -4); return 'The field brings you back onto the road beyond the boxes. Postal service remains suspended.'; } },
    { text: 'Draw them away with a trade lot', hint: '1 trade good; noise', show: (s) => s.inv.goods >= 1,
      do(s, c) { X.take(s, c, 'goods', 1); X.noise(s, c, 10); X.horde(s, c, 1); return 'A wind-up kitchen timer from the trade box goes over the far fence. The collection moves toward it. You move toward Boise.'; } },
    { text: 'Push through the gap', hint: 'quick; exposure risk',
      do(s, c) { X.noise(s, c, 8); if (ZT.roll(s, 0.28)) { const m = someone(s); X.expose(s, c, m); X.injure(s, c, m, 10); return `${m.name} comes away with a torn sleeve. Being nearly there has not made the dead more considerate.`; } return 'You clear the turn before they close the gap. One follows with an envelope stuck to its shoe.'; } },
  ],
},
{
  id: 'z_wasatch_carwash', cat: 'zombie', regions: ['wasatch'], weight: 5, cool: 30, art: 'zstreet',
  text: 'The frontage road squeezes past a car wash. Shapes move behind the hanging rubber strips. The sign promises a spotless finish.',
  choices: [
    { text: 'Scout a way around the rear wall', hint: 'time; quieter',
      do(s, c) { X.delay(s, c, 0.5); X.fatigueAll(s, c, 6); X.noise(s, c, -5); return 'The back lot connects to the next street. You leave the car wash to its current customers.'; } },
    { text: 'Race past the entrance', hint: 'noise; injury risk',
      do(s, c) { X.noise(s, c, 15); X.horde(s, c, 2); if (ZT.roll(s, 0.3 + T(s) * 0.15)) { const m = someone(s); X.injure(s, c, m, 18); X.wear(s, c, 'body', 8); return `${m.name} takes a hard knock getting clear of the first reaching arm. The finish is not spotless.`; } return 'The strips part behind you and a crowd spills into the road. You are already past the next corner.'; } },
    { text: 'Shoot to hold the doorway', hint: '10 rounds; loud', show: (s) => s.inv.ammo >= 10,
      do(s, c) { X.shots(s, c, 10); X.noise(s, c, 28); X.horde(s, c, 4); X.kills(s, 5); return 'The first five block the rest for a few seconds. It is enough time and a great deal of noise.'; } },
  ],
},
{
  id: 'z_road_few', cat: 'zombie', weight: 10, art: 'zroad',
  text: (s) => `${ZT.rint(s, 4, 9)} of them are spread across both lanes, walking west, in no hurry. They have been walking a long time.`,
  choices: [
    { text: 'Weave through slowly', hint: 'quiet; needs room',
      do(s, c) { X.noise(s, c, 3);
        if (ZT.roll(s, 0.75)) return 'Second gear, wide arcs, nobody touching the horn. They turn to watch and do not follow. Ten minutes and it is behind you.';
        X.wear(s, c, 'body', 6); const m = someone(s); X.fatigue(s, c, m, 10);
        return 'One of them goes under the front wheel and the wagon rides up over it hard enough to bang everyone\'s heads on the roof. You keep going.'; } },
    { text: 'Ram straight through', hint: 'fast; damage and noise',
      do(s, c) { X.wear(s, c, 'body', 14); X.wear(s, c, 'engine', 5); X.noise(s, c, 14); X.kills(s, ZT.rint(s, 3, 6));
        if (ZT.roll(s, 0.2)) { X.breakdown(s, c, 'body'); return 'You go through them at forty. The last one takes the grille apart and jams something into the fan.'; }
        return 'Four seconds of noise you will hear in your sleep. The grille is a mess and the road is clear.'; } },
    { text: 'Stop and wait for them to pass', hint: 'time; safest',
      do(s, c) { X.delay(s, c, 0.4); X.noise(s, c, -6); X.fatigueAll(s, c, 4);
        return 'Engine off, everyone still, forty minutes of watching them shuffle by six feet from the glass. Nobody breathes much. They keep walking west.'; } },
    { text: 'Shoot them', hint: 'ammo and noise', show: (s) => s.inv.ammo >= 10,
      do(s, c) { X.shots(s, c, ZT.rint(s, 8, 16)); X.noise(s, c, 28); X.horde(s, c, 4); X.kills(s, ZT.rint(s, 4, 8));
        return 'It takes fewer rounds than you would think and makes more noise than you can afford. The road is clear and the county now knows exactly where you are.'; } },
  ],
},
{
  id: 'z_horde_distant', cat: 'zombie', weight: 8, cond: (s) => s.zombie.horde > 20, art: 'horde',
  text: 'A mass of them on the road ahead, filling it shoulder to shoulder for as far as the road runs straight. Hundreds. They have not seen you.',
  choices: [
    { text: 'Reverse quietly and go around', hint: 'fuel and days',
      do(s, c) { X.take(s, c, 'fuel', 4); X.delay(s, c, 1); X.noise(s, c, -10); X.fatigueAll(s, c, 6);
        return 'Reverse in neutral down a slope for a quarter mile before daring to start the engine. Then thirty miles of farm roads. Expensive and completely correct.'; } },
    { text: 'Draw them off with a distraction', hint: 'costs supplies; opens the road',
      show: (s) => s.inv.ammo >= 15 || s.inv.goods >= 1,
      do(s, c) { if (s.inv.ammo >= 15) X.shots(s, c, 15); else X.take(s, c, 'goods', 1);
        X.delay(s, c, 0.5); X.noise(s, c, 20);
        if (ZT.roll(s, 0.7)) { X.horde(s, c, -6); return 'A car alarm rigged to a battery half a mile off the road, and the whole mass of them turns toward it like water finding a drain. You drive past the tail of it in the dark.'; }
        X.horde(s, c, 6); const m = someone(s); X.injure(s, c, m, 12);
        return `The distraction works on about half of them. The other half come toward the noise you made setting it up. ${m.name} gets back to the car with a torn sleeve and blood in it.`; } },
    { text: 'Wait them out', hint: 'days; food',
      do(s, c) { const d = ZT.rint(s, 1, 3); for (let i = 0; i < d; i++) ZT.Travel.idleDay(s); X.d(c, `+${d} ${ZT.plural(d, 'day')}`); X.horde(s, c, -4);
        return `You get off the road, hide the car, and wait ${d === 1 ? 'a day' : d + ' days'} for a river of dead people to finish going by. They are still going by when you leave.`; } },
    { text: 'Drive through the edge of it at speed', hint: 'desperate',
      do(s, c) { X.wear(s, c, 'body', 25); X.wear(s, c, 'engine', 12); X.noise(s, c, 30); X.horde(s, c, 8); X.kills(s, ZT.rint(s, 10, 25));
        const m = someone(s);
        if (ZT.roll(s, 0.4)) { X.bite(s, c, m); X.wear(s, c, 'body', 15);
          return `You take the shoulder along the edge of them at fifty. Hands on the glass, on the mirrors, in the open window on ${m.name}'s side before it can be wound up.`; }
        if (ZT.roll(s, 0.25)) { X.breakdown(s, c, 'engine'); return 'You get through. Two miles later the radiator, packed solid with what it collected, gives up.'; }
        return 'Fifty miles an hour along the ditch beside them with the horn silent and everyone screaming instead. It works. It should not have.'; } },
  ],
},
{
  id: 'z_lone_walker', cat: 'zombie', weight: 8, art: 'zsingle',
  text: 'One of them stands in the middle of the road facing away, perfectly still, as though it is waiting for a bus.',
  choices: [
    { text: 'Go around it', hint: 'free',
      do(s, c) { if (ZT.roll(s, 0.85)) return 'You go around it on the gravel. It turns its head as you pass and then loses interest. That is all.';
        X.noise(s, c, 6); return 'You go around it. It follows the car for a quarter mile at a dead run, which is a thing they are apparently able to do now, and then falls behind.'; } },
    { text: 'Deal with it quietly', hint: 'no noise; small risk',
      do(s, c) { const m = someone(s); X.noise(s, c, 2); X.fatigue(s, c, m, 6);
        if (ZT.roll(s, 0.15)) { X.expose(s, c, m); return `${m.name} does it with a tire iron and gets a fingernail across the wrist doing it. Probably nothing. Probably.`; }
        return `${m.name} does it with a tire iron in about four seconds and gets back in the car without saying anything.`; } },
    { text: 'Shoot it', hint: 'loud', show: (s) => s.inv.ammo >= 1,
      do(s, c) { X.shots(s, c, 1); X.noise(s, c, 18); X.kills(s, 1);
        return 'One round. The sound goes out across the fields and keeps going for a long time.'; } },
  ],
},
{
  id: 'z_pursuit_runner', cat: 'zombie', weight: 6, cond: (s) => s.miles > 400, art: 'zrun',
  text: 'One of them is keeping up. Not shuffling. Running, on the shoulder, thirty yards back, and it has been there for two minutes.',
  choices: [
    { text: 'Outrun it', hint: 'fuel; wear',
      do(s, c) { X.take(s, c, 'fuel', 1); X.wear(s, c, 'engine', 5); X.fatigueAll(s, c, 8);
        if (ZT.roll(s, 0.8)) return 'Sixty-five miles an hour for four miles and it is gone from the mirror. Nobody talks about how long it stayed in it.';
        X.noise(s, c, 10); X.horde(s, c, 3); return 'You outrun it eventually. The noise of doing so brings other things to the roadside to watch you go past.'; } },
    { text: 'Stop and take it', hint: 'risk; ends it',
      do(s, c) { const m = someone(s); X.noise(s, c, 5);
        if (ZT.roll(s, 0.5)) { X.injure(s, c, m, 15); if (ZT.roll(s, 0.4)) X.bite(s, c, m);
          return `It arrives faster than anyone expects. ${m.name} takes it down and it costs.`; }
        X.kills(s, 1); return `${m.name} braces against the tailgate and ends it in one motion when it comes. Everyone gets back in without a word.`; } },
    { text: 'Shoot it from the window', hint: 'ammo, noise', show: (s) => s.inv.ammo >= 3,
      do(s, c) { X.shots(s, c, ZT.rint(s, 2, 5)); X.noise(s, c, 20); X.horde(s, c, 2);
        if (ZT.roll(s, 0.75)) { X.kills(s, 1); return 'Three rounds out of a moving car and the third one works. The mirror is empty.'; }
        return 'Five rounds, no hits, at a running target from a moving car. It gives up on its own two miles later, unimpressed.'; } },
  ],
},
{
  id: 'z_supply_guarded', cat: 'zombie', weight: 9, art: 'zsupply',
  text: (s) => `A ${ZT.pick(s, ['delivery truck', 'pharmacy', 'grocery loading dock', 'sporting goods store', 'feed store'])} with the doors still shut and the shelves visibly full. About a dozen of them are standing in the lot, doing nothing at all.`,
  choices: [
    { text: 'Sneak in the back', hint: 'quiet; scout helps',
      do(s, c) { X.delay(s, c, 0.4); X.noise(s, c, 5);
        const p = X.p(s, 0.55, 'scout', 0.2);
        if (ZT.roll(s, p)) { X.loot(s, c, 1.2); return 'In through a fire door propped with a brick, out the same way, and the lot never knows anyone was there.'; }
        const m = someone(s); X.injure(s, c, m, 14); X.noise(s, c, 12); X.loot(s, c, 0.5);
        return `The back door is chained. Going through the window makes noise and the lot comes around the corner while ${m.name} is still handing bags out.`; } },
    { text: 'Draw them off with noise', hint: 'costs a lot; clears the way',
      show: (s) => s.inv.goods >= 1 || s.inv.ammo >= 6,
      do(s, c) { if (s.inv.goods >= 1) X.take(s, c, 'goods', 1); else X.shots(s, c, 6);
        X.delay(s, c, 0.3); X.noise(s, c, 15);
        if (ZT.roll(s, 0.75)) { X.loot(s, c, 1.4); return 'A radio at full volume on the far side of the lot, and the whole dozen of them drift toward it in a slow crowd. You take your time inside. It is almost pleasant.'; }
        X.horde(s, c, 4); X.loot(s, c, 0.7); return 'The noise pulls most of them and attracts more from the street. You get a lot and you leave in a hurry.'; } },
    { text: 'Shoot your way in', hint: 'ammo, noise, fast', show: (s) => s.inv.ammo >= 20,
      do(s, c) { X.shots(s, c, ZT.rint(s, 15, 28)); X.noise(s, c, 32); X.horde(s, c, 6); X.kills(s, ZT.rint(s, 8, 14)); X.loot(s, c, 1.5);
        if (ZT.roll(s, 0.3)) { const m = someone(s); X.bite(s, c, m); return `You clear the lot in ninety seconds and load the wagon in five minutes. On the last trip one you had counted as finished gets a hand around ${m.name}'s ankle.`; }
        return 'Twenty rounds, a full load of supplies, and a noise that will be answered by everything within two miles. Worth it, probably.'; } },
    { text: 'Leave it', hint: 'safe',
      do(s, c) { X.morale(s, c, -2); return 'You drive past a building with food in it because of twelve people who are no longer people. Everyone understands. Nobody likes it.'; } },
  ],
},
{
  id: 'z_night_camp', cat: 'zombie', when: 'camp', weight: 10, art: 'znight',
  text: 'Something is moving at the edge of camp. More than one something, from the sound of it, and they are between you and the road.',
  choices: [
    { text: 'Go silent and still', hint: 'costs sleep',
      do(s, c) { X.fatigueAll(s, c, 18); X.noise(s, c, -10);
        if (ZT.roll(s, 0.75)) return 'Three hours of absolute stillness in the dark, everyone holding a breath they cannot afford. They pass within twenty feet and keep going.';
        const m = someone(s); X.injure(s, c, m, 12); X.noise(s, c, 10);
        return `Three hours of stillness and then somebody's knee gives out. It comes straight at the sound and ${m.name} handles it with a hatchet, loudly.`; } },
    { text: 'Break camp and move now', hint: 'fatigue; safe',
      do(s, c) { X.fatigueAll(s, c, 22); X.take(s, c, 'fuel', 1); X.morale(s, c, -3);
        if (ZT.roll(s, 0.15)) { X.take(s, c, 'food', 12); return 'Everything into the wagon in ninety seconds and out with no lights. A duffel of food is left behind in the dark and nobody is going back for it.'; }
        return 'Everything into the wagon in ninety seconds and four miles down the road before anyone puts the headlights on. Nobody sleeps again that night.'; } },
    { text: 'Light a fire and make noise', hint: 'aggressive; risky',
      do(s, c) { X.noise(s, c, 18); X.horde(s, c, 3);
        if (ZT.roll(s, 0.45)) { X.kills(s, ZT.rint(s, 2, 5)); X.morale(s, c, 4); return 'Fire and shouting and three of them come into the light one at a time, which is exactly the point, and are dealt with one at a time.'; }
        const m = someone(s); X.bite(s, c, m); X.horde(s, c, 4); return `Fire and shouting brings more than three. ${m.name} is caught at the edge of the firelight.`; } },
    { text: 'Send someone to look', hint: 'information; exposes them',
      do(s, c) { const m = ZT.State.hasRole(s, 'scout') ? ZT.State.byRole(s, 'scout') : someone(s); X.fatigue(s, c, m, 12);
        const p = X.p(s, 0.6, 'scout', 0.25);
        if (ZT.roll(s, p)) return { text: `${m.name} goes out low and comes back in ten minutes: four of them, moving through, not hunting. Everyone stays still and they go through. It is fine. It is not fine, but it is fine.` };
        X.injure(s, c, m, 15); X.expose(s, c, m); return `${m.name} finds them closer than expected and comes back at a dead run with a torn jacket and a scratch along the forearm.`; } },
  ],
},
{
  id: 'z_bridge_pack', cat: 'zombie', weight: 7, regions: ['sandhills', 'snake', 'powder', 'platte', 'wasatch'], art: 'zbridge',
  text: 'They are on the bridge, thirty or forty, packed between the rails with nowhere to go but forward or into the water.',
  choices: [
    { text: 'Push through in low gear', hint: 'grim; damaging',
      do(s, c) { X.wear(s, c, 'body', 20); X.wear(s, c, 'engine', 8); X.noise(s, c, 16); X.kills(s, ZT.rint(s, 12, 25)); X.morale(s, c, -6);
        if (ZT.roll(s, 0.25)) { X.breakdown(s, c, 'body'); return 'You push through at walking speed with the weight of them on the front of the car. Halfway across, something goes under and comes back up into the wheel well.'; }
        return 'Four minutes at walking speed pushing a wall of them ahead of the bumper until it collapses off the sides. Nobody in the wagon says anything for an hour.'; } },
    { text: 'Find another crossing', hint: 'fuel and a day',
      do(s, c) { X.take(s, c, 'fuel', 4); X.delay(s, c, 1); return 'Twenty-six miles to another bridge that turns out to be fine. The most expensive fine bridge in the world.'; } },
    { text: 'Draw them off the far end', hint: 'clever; slow',
      do(s, c) { X.delay(s, c, 0.6); X.noise(s, c, 12);
        if (ZT.roll(s, X.p(s, 0.6, 'scout', 0.2))) { X.horde(s, c, -3); return 'Somebody walks a mile downriver, breaks a windshield with a rock, and walks back the long way. By the time they return the bridge is empty and the noise is over there.'; }
        const m = someone(s); X.injure(s, c, m, 12); return `The distraction moves about half of them and the other half start toward the car. ${m.name} gets the tailgate shut on an arm.`; } },
  ],
},
{
  id: 'z_house_search', cat: 'zombie', weight: 8, art: 'zhouse',
  text: 'A farmhouse with the front door standing open, curtains moving in an upstairs window where there is no wind.',
  choices: [
    { text: 'Search the ground floor only', hint: 'partial; safer',
      do(s, c) { X.delay(s, c, 0.3); X.noise(s, c, 6); X.loot(s, c, 0.7, 'food');
        if (ZT.roll(s, 0.2)) { const m = someone(s); X.injure(s, c, m, 10); return `Pantry, cellar, chest freezer. On the way out something comes down the stairs faster than anything on stairs should and ${m.name} takes a fall getting through the door.`; }
        return 'Pantry, cellar, chest freezer, and out in twenty minutes with the stairs untouched. Whatever is up there stays up there.'; } },
    { text: 'Clear the whole house', hint: 'more loot; more risk',
      do(s, c) { X.delay(s, c, 0.6); X.noise(s, c, 14); X.fatigueAll(s, c, 8);
        const p = X.p(s, 0.45, 'scout', 0.15);
        if (ZT.roll(s, p)) { X.loot(s, c, 1.5); return 'Room by room with the doors closed behind you. There were two of them upstairs and they are dealt with, and the house gives up medicine, tools, and a chest freezer full of venison.'; }
        const m = someone(s); X.bite(s, c, m); X.loot(s, c, 0.8);
        return `Room by room, and the third bedroom is a bad one. ${m.name} gets the door shut but not before it matters.`; } },
    { text: 'Mark the door and leave', hint: 'nothing; a small kindness',
      do(s, c) { X.morale(s, c, 2); return 'A cross in chalk on the door frame, the way you have seen others do it, and back to the car. Somebody down the road will thank you and you will never know about it.'; } },
  ],
},
{
  id: 'z_stalled_convoy', cat: 'zombie', weight: 6, regions: ['platte', 'panhandle', 'snake', 'owyhee', 'lava', 'wasatch'], art: 'zwrecks',
  text: 'Six cars nose to tail in the westbound lane, all doors closed, all windows fogged from the inside. All six are occupied.',
  choices: [
    { text: 'Go past on the shoulder, quietly', hint: 'free if quiet',
      do(s, c) { X.noise(s, c, 4);
        if (ZT.roll(s, 0.8)) return 'You go by at fifteen miles an hour with the radio off. Six windshields full of faces turn to follow the car. The doors stay closed. They cannot work doors.';
        X.noise(s, c, 10); X.horde(s, c, 2); return 'A door on the third car is not latched and swings open as you pass. The rest of them start beating on their windows in a way that carries.'; } },
    { text: 'Search the cars anyway', hint: 'supplies; very dangerous',
      do(s, c) { X.delay(s, c, 0.4); X.noise(s, c, 16);
        if (ZT.roll(s, 0.5)) { X.loot(s, c, 1.1); return 'Trunks only, one at a time, doors left alone. Camping gear, a jerry can, a case of formula nobody needs and everyone takes anyway.'; }
        const m = someone(s); X.bite(s, c, m); X.horde(s, c, 3);
        return `Trunks only, until the fourth trunk turns out to connect to the back seat of a hatchback. ${m.name} does not get their arm back fast enough.`; } },
    { text: 'Deal with them', hint: 'ammo, noise, closure', show: (s) => s.inv.ammo >= 12,
      do(s, c) { X.shots(s, c, ZT.rint(s, 8, 14)); X.noise(s, c, 26); X.horde(s, c, 4); X.kills(s, 6); X.morale(s, c, -4); X.loot(s, c, 0.9);
        return 'Six windows, six rounds, more or less. Then the cars can be searched properly. Nobody feels good and everybody eats.'; } },
  ],
},
{
  id: 'z_field_crossing', cat: 'zombie', weight: 6, regions: ['sandhills', 'powder', 'divide', 'snake'], art: 'zfield',
  text: 'A line of them coming across an open field on an intercept with the road, half a mile out. There is time to decide but not much.',
  choices: [
    { text: 'Floor it and beat them to the corner', hint: 'fuel and wear',
      do(s, c) { X.take(s, c, 'fuel', 1); X.wear(s, c, 'engine', 6); X.noise(s, c, 8);
        if (ZT.roll(s, 0.85)) return 'You are through the corner before the first of them reaches the fence line. In the mirror they keep walking toward where you were.';
        X.wear(s, c, 'body', 10); const m = someone(s); X.injure(s, c, m, 8); return 'You are almost through. The two fastest reach the road as the wagon does and one of them comes off the fender hard.'; } },
    { text: 'Reverse and take the side road', hint: 'time; safe',
      do(s, c) { X.delay(s, c, 0.4); X.take(s, c, 'fuel', 2); X.noise(s, c, -4); return 'Half a mile in reverse and then eleven miles of gravel that runs parallel. Nothing follows.'; } },
    { text: 'Stop and count them', hint: 'information; nerve',
      do(s, c) { X.delay(s, c, 0.2); s.flags.countedField = true;
        if (ZT.roll(s, X.p(s, 0.6, 'scout', 0.25))) { X.horde(s, c, -2); X.morale(s, c, 3);
          return 'Forty-one, and they are moving north, not toward the road at all. You wait ten minutes and drive on behind them. Knowing is worth something.'; }
        X.fatigueAll(s, c, 10); return 'You stop to count, lose the thread at about thirty, and realize the front of the line has changed direction. You leave in a hurry.'; } },
  ],
},
{
  id: 'z_infected_survivor', cat: 'zombie', weight: 5, art: 'figure',
  text: 'A man flags you down from the roadside with one arm. The other is wrapped in a bloody shirt and he is very careful not to let you see it.',
  choices: [
    { text: 'Take him as far as the next town', hint: 'risk',
      do(s, c) { X.morale(s, c, 3);
        if (ZT.roll(s, 0.5)) { X.loot(s, c, 0.6); return 'He is good company for eleven miles and gets out at a crossroads with a wave and leaves a bag of tools on the seat by way of thanks. Nothing bad happens. It does happen that way sometimes.'; }
        const m = someone(s); X.bite(s, c, m); X.morale(s, c, -8);
        return `He is quiet for nine miles and then he is not quiet. It happens in a moving car with five people in it. ${m.name} is bitten getting the door open.`; } },
    { text: 'Ask to see the arm', hint: 'honest; hard',
      do(s, c) { X.delay(s, c, 0.2);
        if (ZT.roll(s, 0.6)) { X.morale(s, c, -4); X.give(s, c, 'goods', 1);
          return 'He looks at you for a while and then unwraps it. Everyone can see what it is. He says "yeah" and sits down on the guardrail and asks for a cigarette, which you give him, along with everything else in that pocket.'; }
        X.morale(s, c, -2); return 'He says it is a dog bite and it is not a dog bite and everyone standing there knows it. He walks away west along the shoulder before anyone has to say anything else.'; } },
    { text: 'Give him supplies and go', hint: 'costs food',
      do(s, c) { X.take(s, c, 'food', 8); X.morale(s, c, 1); return 'Food and water on the shoulder and the car pulling away. In the mirror he is still standing there holding it.'; } },
    { text: 'Do not stop', hint: '',
      do(s, c) { X.morale(s, c, -4); return 'You do not slow down. He is still waving when the road bends.'; } },
  ],
},
{
  id: 'z_pack_hunting', cat: 'zombie', weight: 7, cond: (s) => T(s) > 0.4, art: 'zpack',
  text: 'Six of them are working the ditch line on both sides, moving in a way that is not random. Whatever is left in them is cooperating.',
  choices: [
    { text: 'Get out of the area fast', hint: 'fuel',
      do(s, c) { X.take(s, c, 'fuel', 2); X.noise(s, c, 10); X.fatigueAll(s, c, 6);
        if (ZT.roll(s, 0.8)) return 'Five miles at speed and they are out of the picture. Nobody wants to discuss what they were doing.';
        X.horde(s, c, 4); return 'You clear the area. The engine noise brings the ditch line up onto the road behind you and they follow the sound for a long time.'; } },
    { text: 'Set an ambush of your own', hint: 'ammo; may end it',
      show: (s) => s.inv.ammo >= 10,
      do(s, c) { X.delay(s, c, 0.3); X.shots(s, c, ZT.rint(s, 6, 12)); X.noise(s, c, 22);
        if (ZT.roll(s, X.p(s, 0.55, 'scout', 0.2))) { X.kills(s, 6); X.morale(s, c, 5); X.horde(s, c, -3);
          return 'Car parked crosswise, everyone behind the engine block, and they come into it one at a time down the ditch exactly as predicted. It is over in a minute and it is clean.'; }
        const m = someone(s); X.injure(s, c, m, 18); X.horde(s, c, 3);
        return `The ambush works on four of them. The other two come from behind, which was not in the plan, and ${m.name} pays for the oversight.`; } },
    { text: 'Turn around', hint: 'lose ground',
      do(s, c) { s.miles = Math.max(0, Math.round((s.miles - 8) * 10) / 10); X.d(c, '-8 miles'); X.take(s, c, 'fuel', 1); X.noise(s, c, -6);
        return 'Eight miles back the way you came and a different road west. Losing ground is not the same as losing.'; } },
  ],
},
{
  id: 'z_school', cat: 'zombie', weight: 5, regions: ['platte', 'panhandle', 'sandhills', 'powder', 'wasatch'], art: 'zschool',
  text: 'A consolidated school with a shelter sign still bolted by the door and every window on the ground floor boarded from the inside. The boards are intact.',
  choices: [
    { text: 'Go in through the roof hatch', hint: 'scout; big reward',
      do(s, c) { X.delay(s, c, 0.6); X.fatigueAll(s, c, 10); X.noise(s, c, 6);
        if (ZT.roll(s, X.p(s, 0.5, 'scout', 0.25))) { X.loot(s, c, 1.8, 'medicine'); X.morale(s, c, 4);
          return 'The gym is a stocked shelter that nobody ever came back to. Cots, water drums, a locked cabinet of medical supplies, and a generator with fuel still in it.'; }
        const m = someone(s); X.injure(s, c, m, 16); X.noise(s, c, 12); X.loot(s, c, 0.6);
        return `The hatch drops you into a hallway that is full. ${m.name} gets back up the ladder with one boot and a bad ankle and about a third of what was worth taking.`; } },
    { text: 'Pry a board and look first', hint: 'information',
      do(s, c) { X.delay(s, c, 0.25); X.noise(s, c, 5);
        if (ZT.roll(s, 0.55)) return { text: 'A flashlight through the gap shows a gym floor packed with them, standing, facing nothing, hundreds of them. Somebody put the boards up from the inside and then it did not matter. You put the board back.' };
        X.loot(s, c, 0.9); return 'The classroom behind the board is empty and has a supply closet in it. You go in through the window and out the same way in fifteen minutes.'; } },
    { text: 'Leave it alone', hint: '', do() { return 'You drive past a school with the boards still up.'; } },
  ],
},
{
  id: 'z_water_crossing', cat: 'zombie', weight: 5, regions: ['sandhills', 'snake', 'powder'], art: 'zwater',
  text: 'They are in the river. Not swimming, exactly. Walking on the bottom and coming up the near bank one at a time, slick and unhurried.',
  choices: [
    { text: 'Move upstream and cross elsewhere', hint: 'fuel, time',
      do(s, c) { X.take(s, c, 'fuel', 2); X.delay(s, c, 0.5); return 'Four miles upstream to a low-water bridge with nothing on it. You cross fast and do not look at the river.'; } },
    { text: 'Cross fast at the ford', hint: 'risk',
      do(s, c) { X.wear(s, c, 'electrical', 10); X.noise(s, c, 12);
        if (ZT.roll(s, 0.65)) return 'Through the ford in a sheet of brown water with three of them reaching the bank as the rear wheels come out. Fast enough.';
        const m = someone(s); X.bite(s, c, m); X.wear(s, c, 'electrical', 10);
        return `The wagon bogs for four seconds in mid-ford, which is three seconds too many. ${m.name} has the window down.`; } },
    { text: 'Watch the bank for a while', hint: 'grim information',
      do(s, c) { X.delay(s, c, 0.3); X.morale(s, c, -4); s.flags.sawRiver = true;
        return 'You watch for twenty minutes. They come up out of the water at a rate of about one a minute and walk off west without stopping. There is no end to the line. You go around.'; } },
  ],
},
{
  id: 'z_alarm', cat: 'zombie', weight: 5, art: 'zalarm',
  cond: (s) => s.zombie.noise > 25,
  text: 'A car alarm starts somewhere close and does not stop. Every dead thing within a mile is now walking toward this street, and you are on this street.',
  choices: [
    { text: 'Kill the alarm', hint: 'fast; exposes someone',
      do(s, c) { const m = someone(s); X.fatigue(s, c, m, 10);
        if (ZT.roll(s, X.p(s, 0.65, 'mechanic', 0.2))) { X.noise(s, c, -15); return `${m.name} is under the hood with a knife in eleven seconds and the battery cable is off in twelve. The silence afterward is enormous.`; }
        X.noise(s, c, 12); X.injure(s, c, m, 10); return `${m.name} cannot get the hood open and gets caught out in the street doing it. The alarm is still going when you leave.`; } },
    { text: 'Leave immediately', hint: 'safe; loud',
      do(s, c) { X.noise(s, c, 8); X.horde(s, c, 3); X.take(s, c, 'fuel', 1);
        return 'You go. The alarm keeps going behind you and every road within a mile starts to fill in toward it, which is at least a very effective distraction.'; } },
    { text: 'Use it — search while they gather there', hint: 'greedy; loot',
      do(s, c) { X.delay(s, c, 0.4); X.horde(s, c, 5); X.loot(s, c, 1.3);
        if (ZT.roll(s, 0.4 + T(s) * 0.2)) { const m = someone(s); X.bite(s, c, m);
          return `Two blocks over, with everything in the county walking the other way, you clear three houses fast. On the last one the street behind you is not empty any more and ${m.name} is furthest from the car.`; }
        return 'Two blocks over, with everything in the county walking the other way, you clear three houses at your leisure. Cynical and extremely effective.'; } },
  ],
},
{
  id: 'z_grain_silo', cat: 'zombie', weight: 5, regions: ['sandhills', 'powder', 'divide', 'platte', 'wasatch'], art: 'zsilo',
  text: 'The grain elevator hums. Not machinery. Hundreds of them inside, pressed together, and the corrugated wall moves in and out like something breathing.',
  choices: [
    { text: 'Go past very quietly', hint: 'free if quiet',
      do(s, c) { X.noise(s, c, 2);
        if (ZT.roll(s, 0.85)) return 'Engine off, coasting the grade, four hundred yards past a metal building full of the dead. The humming does not change.';
        X.horde(s, c, 6); X.noise(s, c, 8); return 'Something scrapes under the car at the worst possible moment and the humming changes pitch. You start the engine and go. The doors of the elevator are moving behind you.'; } },
    { text: 'Check the office building', hint: 'loot; nerve',
      do(s, c) { X.delay(s, c, 0.3); X.noise(s, c, 6);
        if (ZT.roll(s, 0.7)) { X.loot(s, c, 1.0, 'fuel'); return 'The office has a fuel key, a first aid kit, and a desk drawer with two hundred dollars in it that nobody wanted. Twenty feet of sheet metal away from all of them.'; }
        X.horde(s, c, 5); const m = someone(s); X.injure(s, c, m, 12);
        return `A file cabinet goes over in the office. The sound goes through the wall like it is not there and ${m.name} is the last one out the door.`; } },
    { text: 'Weld the doors shut', hint: 'tools; a public service',
      show: (s) => s.inv.tools > 0,
      do(s, c) { X.delay(s, c, 0.5); X.noise(s, c, 10); X.morale(s, c, 8); X.horde(s, c, -5);
        if (ZT.roll(s, 0.8)) return 'Chain, a jack handle, and forty minutes of work through the door handles of a building holding several hundred of them. Nobody down that road will ever know. It is the best thing anyone has done all month.';
        X.take(s, c, 'tools', 1); const m = someone(s); X.injure(s, c, m, 14); return `Halfway through, the door gives further than expected. ${m.name} finishes the job with a bad arm and the tool kit is left inside.`; } },
  ],
},
{
  id: 'z_rest_stop', cat: 'zombie', weight: 6, regions: ['platte', 'panhandle', 'powder', 'divide', 'snake', 'owyhee', 'lava'], art: 'zrest',
  text: 'A highway rest stop: vending machines, restrooms, a map under glass. And about twenty of them wandering the picnic area in slow loops.',
  choices: [
    { text: 'Take the vending machines', hint: 'food; noise',
      do(s, c) { X.noise(s, c, 14); X.delay(s, c, 0.3); X.give(s, c, 'food', ZT.rint(s, 15, 35)); X.give(s, c, 'goods', 1);
        if (ZT.roll(s, 0.35 + T(s) * 0.2)) { const m = someone(s); X.injure(s, c, m, 12); return `Breaking the glass is loud in a way that carries across a parking lot. ${m.name} fills a duffel with candy bars while three of them come around the building.`; }
        return 'Two vending machines, a jack handle, and forty pounds of candy bars and crackers. Nobody argues about the nutritional content.'; } },
    { text: 'Use the map board', hint: 'route knowledge',
      do(s, c) { X.delay(s, c, 0.2);
        if (ZT.roll(s, 0.75)) { s.flags.roadRead = true; s.miles = Math.round((s.miles + 8) * 10) / 10; X.d(c, '+8 miles'); X.morale(s, c, 2);
          return 'A state map under scratched plexiglass with every service road on it. Twenty minutes of copying it into the atlas is worth eight miles and a lot of guessing.'; }
        return 'The map board is for a state you left two days ago. Somebody laughs for the first time in a while.'; } },
    { text: 'Drive on', hint: '', do() { return 'Twenty of them in a picnic area, walking loops around the tables. You do not stop.'; } },
  ],
},
{
  id: 'z_scratch_argument', cat: 'zombie', weight: 5, cond: (s) => s.party.some((m) => m.alive && m.inf === 'exposed'), art: 'zparty',
  text: (s) => { const m = s.party.find((x) => x.alive && x.inf === 'exposed'); return `${m.name} has a scratch on the forearm from yesterday. It is shallow. Nobody can agree on what it means and everybody has an opinion.`; },
  setup(s, c) { c.m = s.party.find((x) => x.alive && x.inf === 'exposed'); },
  choices: [
    { text: 'Use medicine on it now', hint: '1 kit; clears it', show: (s) => s.inv.medicine > 0,
      do(s, c) { const t = ZT.Party.treat(s, c.m); X.d(c, '-1 medicine'); X.morale(s, c, 3); return t; } },
    { text: 'Isolate them for a few days', hint: 'safe; hard on morale',
      do(s, c) { c.m.isolated = true; X.moraleM(s, c, c.m, -12); X.morale(s, c, 2);
        return `${c.m.name} rides in the back with the tailgate cracked and eats separately. It is a sensible precaution and it is a miserable thing to do to somebody.`; } },
    { text: 'Wash it out and watch it', hint: 'free; uncertain',
      do(s, c) { X.morale(s, c, 1);
        if (ZT.roll(s, 0.5)) { c.m.inf = 'none'; c.m.infDays = 0; X.d(c, `${c.m.name} clear`); return `Soap, water and a clean bandage. By evening the edges are pink and healthy. It was a scratch. That is all it was.`; }
        return `Soap, water and a clean bandage, and everyone watching ${c.m.name}'s face for the next two days for something they would rather not see.`; } },
    { text: 'Say nothing about it', hint: 'morale; risk',
      do(s, c) { X.morale(s, c, -4); return 'The subject is dropped in the way that means it is not dropped. It sits in the car for days.'; } },
  ],
},
{
  id: 'z_bite_decision', cat: 'zombie', weight: 8, cond: (s) => s.party.some((m) => m.alive && m.inf === 'bitten' && !m.infStable), art: 'zparty',
  setup(s, c) { c.m = s.party.find((x) => x.alive && x.inf === 'bitten' && !x.infStable); },
  text: (s, c) => { const m = c.m; return `${m.name}'s bite is the only thing anybody is thinking about. ${ZT.Party.woundHint(s, m)} A decision is going to have to be made and everyone is looking at you to make it.`; },
  choices: [
    { text: 'Spend medicine on it', hint: '1 kit', show: (s) => s.inv.medicine > 0,
      do(s, c) { const t = ZT.Party.treat(s, c.m); X.d(c, '-1 medicine'); X.morale(s, c, 4); return t; } },
    { text: 'Isolate them and keep moving', hint: 'protects the others',
      do(s, c) { c.m.isolated = true; X.moraleM(s, c, c.m, -15); X.morale(s, c, 1);
        return `${c.m.name} rides in the back alone with a rope on the tailgate handle. It was ${c.m.name}'s idea, which does not make it better.`; } },
    { text: 'Stop for two days and rest them', hint: 'time; better odds',
      do(s, c) { ZT.Travel.restDay(s); ZT.Travel.restDay(s); X.d(c, '+2 days'); X.heal(s, c, c.m, 10);
        if (ZT.roll(s, 0.35)) { c.m.infStable = true; X.d(c, `${c.m.name} stable`); return 'Two days off the road, warm, still, fed properly. The fever comes up and then comes back down. It may hold.'; }
        return 'Two days off the road change nothing except the calendar. Whatever is happening is going to happen at its own pace.'; } },
    { text: 'Say nothing and drive', hint: 'free; costly',
      do(s, c) { X.morale(s, c, -6); X.fatigueAll(s, c, 6);
        return 'Nobody decides anything. The wagon drives west with the question sitting in it, taking up more room than any of the supplies.'; } },
  ],
},
{
  id: 'z_hospital', cat: 'zombie', weight: 5, regions: ['platte', 'panhandle', 'sandhills', 'powder', 'wasatch', 'laramie', 'bear'], art: 'zhospital',
  cond: (s) => s.inv.medicine < 4,
  text: 'A regional clinic, one story, glass front, dark inside. The pharmacy would be at the back. Everything with a pharmacy in it has been picked over by now, in theory.',
  choices: [
    { text: 'Go for the pharmacy', hint: 'medicine; dangerous',
      do(s, c) { X.delay(s, c, 0.5); X.noise(s, c, 12); X.fatigueAll(s, c, 8);
        const p = X.p(s, 0.5, 'medic', 0.2);
        if (ZT.roll(s, p)) { X.give(s, c, 'medicine', ZT.rint(s, 2, 4)); X.loot(s, c, 0.5);
          return 'The pharmacy cage is intact and someone who knew what they were looking for goes through it in nine minutes. Antibiotics, painkillers, sterile kit.'; }
        const m = someone(s); X.bite(s, c, m); X.give(s, c, 'medicine', 1);
        return `The cage is intact but the hallway to it is not empty. One kit comes out. So does ${m.name}, bitten.`; } },
    { text: 'Try the ambulance bay instead', hint: 'less reward, less risk',
      do(s, c) { X.delay(s, c, 0.3); X.noise(s, c, 6);
        if (ZT.roll(s, 0.7)) { X.give(s, c, 'medicine', 1); X.loot(s, c, 0.4); return 'One ambulance still has its jump kit clipped in the back. Bandages, saline, a splint and one sealed drug box.'; }
        return 'Both ambulances are stripped to the frames. Somebody was here first and was thorough about it.'; } },
    { text: 'Not worth it', hint: '', do() { return 'You look at the dark glass front for a while and then drive.'; } },
  ],
},
{
  id: 'z_children_school_bus', cat: 'zombie', weight: 3, cond: (s) => s.miles > 600, art: 'zbus',
  text: 'They are small. It is a group of them and they are small and they are coming up the road in a loose bunch.',
  choices: [
    { text: 'Go around, wide', hint: 'costs time and morale',
      do(s, c) { X.delay(s, c, 0.3); X.take(s, c, 'fuel', 1); X.morale(s, c, -4);
        return 'Right off the road, through a ditch and a soybean field, and back on a quarter mile up. Nobody suggests any other option and nobody talks for a long time.'; } },
    { text: 'Reverse out of sight and wait', hint: 'time',
      do(s, c) { X.delay(s, c, 0.4); X.morale(s, c, -3); X.noise(s, c, -6);
        return 'You reverse around the bend and shut the engine off and wait forty minutes for the road to be empty again. It is the right call. Everyone hates it.'; } },
  ],
},
{
  id: 'z_pinned', cat: 'zombie', weight: 6, cond: (s) => T(s) > 0.5, art: 'zsurround',
  text: 'They come out of the corn on both sides at once and the road ahead is blocked by a combine that was not there yesterday. This was arranged, by something.',
  choices: [
    { text: 'Reverse out fast', hint: 'wear; probably works',
      do(s, c) { X.wear(s, c, 'engine', 8); X.wear(s, c, 'body', 8); X.noise(s, c, 14);
        if (ZT.roll(s, 0.7)) return 'Four hundred yards in reverse at thirty miles an hour, which is a skill nobody knew the driver had. Out the way you came.';
        const m = someone(s); X.injure(s, c, m, 16); X.wear(s, c, 'body', 12);
        return `Four hundred yards in reverse and then the rear end finds the ditch. Getting out costs five minutes and ${m.name} takes a hand through a window doing it.`; } },
    { text: 'Ram the combine', hint: 'brutal',
      do(s, c) { X.wear(s, c, 'body', 30); X.wear(s, c, 'engine', 15); X.noise(s, c, 20);
        if (ZT.roll(s, 0.4)) { X.loseVehicle(s, c, 'wrapped around a combine'); const m = someone(s); X.injure(s, c, m, 25);
          return 'The combine does not move. The wagon does, once, in a direction it was not designed to go. Everyone gets out. The wagon does not.'; }
        return 'The wagon hits the header at speed and knocks it sideways enough to get through. Everything on the front of the car is now decorative.'; } },
    { text: 'Abandon the road on foot and come back later', hint: 'costs a day and cargo',
      show: (s) => s.vehicle.has,
      do(s, c) { X.delay(s, c, 1); X.fatigueAll(s, c, 20);
        if (ZT.roll(s, 0.6)) { X.take(s, c, 'food', 15); return 'You leave the wagon and go into the corn and lie in a drainage ditch until it is dark. The car is still there in the morning, gone through but drivable. Some food is gone.'; }
        X.loseVehicle(s, c, 'stripped while you hid in a ditch'); return 'You leave the wagon and go into the corn. In the morning the wagon is on its rims with the hood open. Whatever arranged the combine was not dead.'; } },
  ],
},
{
  id: 'z_quiet_street', cat: 'zombie', weight: 6, art: 'zstreet',
  text: 'The street is empty. Every street for the last hour has had something on it. This one has nothing on it at all.',
  choices: [
    { text: 'Turn around now', hint: 'trust the feeling',
      do(s, c) { X.take(s, c, 'fuel', 1); X.delay(s, c, 0.3); X.morale(s, c, -1);
        if (ZT.roll(s, 0.6)) { X.horde(s, c, -2); return 'You reverse out. Two miles back, from a rise, the reason becomes visible: the street ends in a stadium parking lot with a crowd in it that has no edges. Good instinct.'; }
        return 'You lose an hour backing out of a street that was, as far as anyone can ever establish, simply empty.'; } },
    { text: 'Go through fast', hint: 'gamble',
      do(s, c) { X.noise(s, c, 10);
        if (ZT.roll(s, 0.5)) { s.miles = Math.round((s.miles + 6) * 10) / 10; X.d(c, '+6 miles'); return 'Through in ninety seconds and out the far end and it was nothing. It was just an empty street.'; }
        X.horde(s, c, 8); const m = someone(s); X.injure(s, c, m, 14); X.wear(s, c, 'body', 12);
        return `The far end of the street opens into a parking lot and the parking lot is where all of them are. Getting turned around in it costs the tailgate glass and a lot of ${m.name}'s skin.`; } },
    { text: 'Send a scout up on a roof', hint: 'information',
      do(s, c) { const m = ZT.State.hasRole(s, 'scout') ? ZT.State.byRole(s, 'scout') : someone(s); X.delay(s, c, 0.3); X.fatigue(s, c, m, 10);
        if (ZT.roll(s, X.p(s, 0.7, 'scout', 0.2))) { s.flags.sawTheLot = true; X.horde(s, c, -3);
          return `${m.name} goes up a fire escape and comes down fast. The street ends in a stadium lot and the lot is full, edge to edge. You take a different road, informed.`; }
        X.injure(s, c, m, 10); return `${m.name} goes up a fire escape that comes off the wall on the way down. A bad landing, no information, and an hour lost.`; } },
  ],
},
{
  id: 'z_they_learned_doors', cat: 'zombie', weight: 4, cond: (s) => s.miles > 900, art: 'zdoor', once: true,
  text: 'One of them is working the handle of a parked car. Not pulling at it. Working it, with a thumb on the button, the way a person does.',
  choices: [
    { text: 'Watch for a minute', hint: 'information; morale',
      do(s, c) { X.delay(s, c, 0.2); X.morale(s, c, -8); s.flags.sawTheHandle = true;
        return 'It gets the door open. It stands there holding the door, apparently at a loss for what came next, and then walks away. Nobody in the wagon says one word for twenty miles.'; } },
    { text: 'Deal with it immediately', hint: 'noise',
      do(s, c) { X.shots(s, c, 1); X.noise(s, c, 16); X.kills(s, 1); X.morale(s, c, -3);
        if (!s.inv.ammo && !s.stats.shots) return 'Somebody does it with a crowbar without discussing it first. Nobody objects.';
        return 'One round, immediately, before anyone can talk about what they just saw. Loud, and possibly the correct response.'; } },
    { text: 'Leave and do not mention it', hint: '',
      do(s, c) { X.morale(s, c, -5); return 'The car pulls away. Two people saw it. Neither of them brings it up, then or later.'; } },
  ],
},
{
  id: 'z_tunnel', cat: 'zombie', weight: 5, regions: ['bear', 'laramie', 'platte', 'panhandle'], art: 'ztunnel',
  text: 'A highway tunnel, four hundred yards of it, and no light at the far end because something is blocking the far end.',
  choices: [
    { text: 'Go through with the lights off', hint: 'quiet; nerve',
      do(s, c) { X.fatigueAll(s, c, 12); X.noise(s, c, 6);
        if (ZT.roll(s, 0.55)) { s.miles = Math.round((s.miles + 4) * 10) / 10; return 'Four hundred yards at ten miles an hour in the dark by feel and echo. Things move on both sides and none of them find the car. The far end is a jackknifed truck with a gap beside it.'; }
        const m = someone(s); X.injure(s, c, m, 14); X.wear(s, c, 'body', 10);
        return `Halfway in, the car hits something soft and then a lot of somethings. Getting through takes the mirrors off both sides and ${m.name} has an arm out the window when it happens.`; } },
    { text: 'Go over the ridge instead', hint: 'fuel and a day',
      do(s, c) { X.take(s, c, 'fuel', 5); X.delay(s, c, 1); X.wear(s, c, 'engine', 8);
        return 'The old road over the top, eleven miles of switchbacks that the tunnel was built to replace. The wagon does not enjoy it and it takes all day and nothing in it wants to eat you.'; } },
    { text: 'Light it up and drive fast', hint: 'loud; fast',
      do(s, c) { X.noise(s, c, 20); X.horde(s, c, 3); X.wear(s, c, 'body', 12); X.kills(s, ZT.rint(s, 4, 10));
        if (ZT.roll(s, 0.7)) return 'High beams, horn, forty miles an hour through a tunnel full of noise. It works. It is the worst thirty seconds of the month.';
        X.breakdown(s, c, 'body'); return 'High beams, horn, forty miles an hour, and then the jackknifed truck at the far end that the lights find too late. The wagon stops. Hard.'; } },
  ],
},
{
  id: 'z_helpful_pile', cat: 'zombie', weight: 4, art: 'zpile',
  text: 'Somebody has stacked about forty of them beside the road in a neat pile and burned it. The stack is squared off at the corners. Somebody took pride in this.',
  choices: [
    { text: 'Look for who did it', hint: 'people; time',
      do(s, c) { X.delay(s, c, 0.3);
        if (ZT.roll(s, 0.5)) return { text: 'Tire tracks go up a farm lane. At the top: a farmhouse with a working windmill, a fence made of car doors, and a woman who does not come out but shouts down that the road west is clear for eleven miles and to keep going. Useful, and cheering.', then: null };
        X.morale(s, c, 2); return 'The tracks go up a lane and the lane ends at a burned-out house. Whoever kept the road tidy did not stay to be thanked.'; } },
    { text: 'Take it as a good sign and move on', hint: 'morale',
      do(s, c) { X.morale(s, c, 5); return 'Somebody out here is working on the problem. It is a surprisingly large comfort.'; } },
  ],
},
{
  id: 'z_church_full', cat: 'zombie', weight: 4, regions: ['sandhills', 'powder', 'divide', 'snake', 'laramie', 'bear'], art: 'zchurch',
  text: 'The church doors are chained from the outside and the windows are full of faces. Somebody put them in there. The chain is new.',
  choices: [
    { text: 'Leave it exactly as it is', hint: '',
      do(s, c) { X.morale(s, c, -3); return 'You check the chain, decide it will hold, and get back in the car. There is nothing else to do that is not worse.'; } },
    { text: 'Reinforce the chain', hint: 'time; morale',
      do(s, c) { X.delay(s, c, 0.3); X.morale(s, c, 6); if (s.inv.tools > 0) X.d(c, 'tools used');
        return 'Another chain, a bar through the handles, and forty minutes of work in front of a hundred faces pressed to the glass. Whoever comes down this road next is safer for it.'; } },
    { text: 'Search the parsonage next door', hint: 'loot',
      do(s, c) { X.delay(s, c, 0.3); X.noise(s, c, 5); X.loot(s, c, 0.8, 'food');
        return 'A pantry, a deep freeze, and a shelf of home canning with the dates written on the lids in a careful hand.'; } },
  ],
},
{
  id: 'z_dawn_field', cat: 'zombie', when: 'camp', weight: 6, art: 'zdawn',
  text: 'At first light there are eleven of them standing in the field around the camp, motionless, all facing the tents. They have been there some time.',
  choices: [
    { text: 'Pack up slowly and walk out', hint: 'nerve; quiet',
      do(s, c) { X.fatigueAll(s, c, 10); X.noise(s, c, 3);
        if (ZT.roll(s, 0.7)) return 'Forty minutes of packing at the speed of a glacier, everyone moving like the ground is glass. They do not react. You drive away at idle and they are still standing there in the mirror.';
        const m = someone(s); X.injure(s, c, m, 12); X.noise(s, c, 10); return `Everything is nearly in the car when a tent pole rings against the bumper. All eleven heads turn at once. ${m.name} is furthest from the doors.`; } },
    { text: 'Leave the camp gear and go', hint: 'costs supplies; fast',
      do(s, c) { X.take(s, c, 'food', 10); X.take(s, c, 'goods', 1); X.noise(s, c, 6);
        return 'Into the car and gone in twenty seconds, leaving tents, a stove, and a cooler standing in the field. Expensive. Correct.'; } },
    { text: 'Deal with all eleven', hint: 'work; noise', show: (s) => ZT.State.aliveCount(s) >= 3,
      do(s, c) { X.noise(s, c, 18); X.fatigueAll(s, c, 20); X.horde(s, c, 3);
        if (ZT.roll(s, 0.55)) { X.kills(s, 11); X.morale(s, c, 3); return 'Eleven of them, one at a time, with the car as a wall to work behind. It takes an hour and it is exhausting and nobody is hurt.'; }
        const m = someone(s); X.bite(s, c, m); X.kills(s, 9); return `Nine of them go down without trouble. The tenth is faster than it looked and reaches ${m.name} in the open.`; } },
  ],
},
{
  id: 'z_fuel_convoy_wreck', cat: 'zombie', weight: 5, regions: ['snake', 'owyhee', 'lava', 'powder', 'divide', 'platte', 'panhandle'], art: 'ztanker',
  cond: (s) => s.inv.fuel < 25,
  text: 'A fuel tanker is on its side across the median, still most of the way full, with maybe fifteen of them standing around it as though guarding it.',
  choices: [
    { text: 'Draw them off and siphon', hint: 'big fuel; big risk',
      do(s, c) { X.delay(s, c, 0.6); X.noise(s, c, 16);
        if (ZT.roll(s, X.p(s, 0.6, 'scout', 0.15))) { X.give(s, c, 'fuel', ZT.rint(s, 12, 24)); X.morale(s, c, 6);
          return 'A bottle thrown two hundred yards down the median and every one of them walks toward the sound. Forty minutes of siphoning into every container you own.'; }
        X.give(s, c, 'fuel', ZT.rint(s, 5, 11)); const m = someone(s); X.injure(s, c, m, 14);
        return `The distraction moves most of them. Two stay by the tanker and find ${m.name} lying under it with a hose. Half a tank and a bad afternoon.`; } },
    { text: 'Come back at night', hint: 'time; safer',
      do(s, c) { ZT.Travel.idleDay(s); X.d(c, '+1 day'); X.fatigueAll(s, c, 10); X.give(s, c, 'fuel', ZT.rint(s, 9, 19));
        return 'You lie up all day and come back at two in the morning with no lights. They are still there and they do not see well. Thirty gallons, quietly, and gone before dawn.'; } },
    { text: 'Not worth it', hint: '', do(s, c) { return 'Thirty gallons of diesel and fifteen good reasons to leave it there.'; } },
  ],
},
{
  id: 'z_they_follow_headlights', cat: 'zombie', weight: 5, cond: (s) => s.vehicle.has && s.vehicle.electrical > 20, art: 'znight',
  text: 'Driving after dark, the headlights pick up eyes at the edge of the road. Not two. Not four. A long row of them, on both sides, for as far as the light reaches.',
  choices: [
    { text: 'Kill the lights and drive by moonlight', hint: 'slow; invisible',
      do(s, c) { X.fatigueAll(s, c, 14); X.noise(s, c, -8);
        if (ZT.roll(s, 0.7)) return 'Twenty miles an hour in the dark with the driver leaning over the wheel. The eyes lose interest as soon as the lights go out. They were following the light.';
        X.wear(s, c, 'body', 12); X.wear(s, c, 'tires', 8); return 'Twenty miles an hour in the dark until the road turns and the car does not. Nothing catches you. The fender is not a total loss.'; } },
    { text: 'Speed up and outrun the line', hint: 'fuel; noise',
      do(s, c) { X.take(s, c, 'fuel', 2); X.noise(s, c, 14); X.horde(s, c, 3);
        return 'You go faster. So does everything at the edge of the light, for about a quarter mile, and then the road is empty again. Nobody sleeps at the next camp.'; } },
    { text: 'Stop entirely and go dark', hint: 'time; safest',
      do(s, c) { X.delay(s, c, 0.4); X.noise(s, c, -14); X.fatigueAll(s, c, 6);
        return 'Engine off, lights off, five people sitting in a cold car for two hours listening to feet on gravel go by on both sides. Then nothing. Then dawn.'; } },
  ],
},
{
  id: 'z_dog_warning', cat: 'zombie', weight: 5, cond: (s) => s.flags.dog, art: 'zdog',
  text: 'The dog goes rigid, stares at a hedgerow, and does not bark. That is worse than barking.',
  choices: [
    { text: 'Get in and go', hint: 'trust it',
      do(s, c) { X.noise(s, c, 5); X.take(s, c, 'fuel', 1);
        if (ZT.roll(s, 0.8)) { X.morale(s, c, 3); return 'Everyone is in the car in eight seconds. Something comes out of the hedge as the wheels start turning. Good dog.'; }
        return 'Everyone is in the car in eight seconds and nothing comes out of the hedge and the dog will not explain itself.'; } },
    { text: 'Investigate the hedgerow', hint: 'risk',
      do(s, c) { const m = someone(s);
        if (ZT.roll(s, 0.45)) { X.loot(s, c, 0.7); return `${m.name} pushes into the hedge and finds a man's pack, months old, with dry goods still in it. The dog does not go near it.`; }
        X.injure(s, c, m, 15); X.noise(s, c, 8); return `${m.name} pushes into the hedge and finds out why the dog would not bark. It is close work and it goes badly.`; } },
  ],
},
{
  id: 'z_wounded_one', cat: 'zombie', weight: 4, art: 'zsingle',
  text: 'One of them is caught in a fence, has been for a long time, and is still trying. The fence is winning. It has been winning for months.',
  choices: [
    { text: 'End it', hint: 'morale',
      do(s, c) { X.kills(s, 1); X.morale(s, c, ZT.roll(s, 0.6) ? 3 : -2); X.noise(s, c, 3);
        return ZT.roll(s, 0.6) ? 'It takes one swing and it is over and somebody says "there" quietly, the way you would to a horse.'
          : 'It takes one swing. Afterward nobody can decide whether that was a kindness or just tidiness, and the argument goes on for miles.'; } },
    { text: 'Leave it', hint: '',
      do(s, c) { X.morale(s, c, -2); return 'You leave it in the fence. It is still working at it in the mirror.'; } },
    { text: 'Search the ground around it', hint: 'loot',
      do(s, c) { X.noise(s, c, 3);
        if (ZT.roll(s, 0.5)) { X.loot(s, c, 0.5); return 'A pack in the grass where they dropped it, with a water filter in it that still works.'; }
        return 'Nothing but a wallet with photographs in it. Somebody puts it back in the grass.'; } },
  ],
},
{
  id: 'z_swarm_noise_result', cat: 'zombie', weight: 9, cond: (s) => s.zombie.noise > 45, art: 'zhorde',
  text: 'Whatever you have been doing has been heard. They come out of the fields and the side roads and the houses, from every direction, at once.',
  choices: [
    { text: 'Drive, now, anywhere', hint: 'fuel; escape',
      show: (s) => s.vehicle.has && !s.vehicle.broken,
      do(s, c) { X.take(s, c, 'fuel', 2); X.wear(s, c, 'body', 10); X.noise(s, c, -20); X.horde(s, c, 4); X.fatigueAll(s, c, 12);
        if (ZT.roll(s, 0.75)) return 'Everyone in, doors shut, and out through a gap that closes behind the rear bumper. Six miles before anyone speaks.';
        const m = someone(s); X.bite(s, c, m); return `Everyone in, doors shut, except ${m.name}, who is on the wrong side of the car when it starts moving and has to come in through a window.`; } },
    { text: 'Fight a corner', hint: 'ammo; costly', show: (s) => s.inv.ammo >= 20,
      do(s, c) { X.shots(s, c, ZT.rint(s, 20, 40)); X.noise(s, c, 30); X.kills(s, ZT.rint(s, 15, 30)); X.fatigueAll(s, c, 25); X.horde(s, c, 6);
        const m = someone(s); X.injure(s, c, m, 20);
        if (ZT.roll(s, 0.5)) X.bite(s, c, X.other(s, m));
        return 'A wall at your back and everything you have in the magazines. It stops. It stops eventually. The cost is counted afterward.'; } },
    { text: 'Scatter and regroup west', hint: 'someone gets lost',
      do(s, c) { X.fatigueAll(s, c, 20); X.noise(s, c, -15); const m = someone(s); X.missing(s, c, m); X.morale(s, c, -8);
        return `Everyone goes a different way with a plan to meet at the water tower. Four make it by dark. ${m.name} does not.`; } },
  ],
},
{
  id: 'z_missing_return', cat: 'zombie', weight: 8, cond: (s) => s.party.some((m) => m.alive && m.missing), art: 'figure',
  setup(s, c) { c.m = s.party.find((x) => x.alive && x.missing); },
  text: (s, c) => `Someone is walking up the road toward the camp. It is ${c.m.name}.`,
  choices: [
    { text: 'Get them inside', hint: '',
      do(s, c) { const m = c.m;
        if (ZT.roll(s, 0.65)) { X.found(s, c, m); X.hurt(s, c, m, 15, 'exposure'); X.fatigue(s, c, m, 30); X.morale(s, c, 12);
          return `${m.name} walked eleven miles in two days, drank out of a stock tank, and is fine in every way that matters. There is a reunion in the middle of the road that costs twenty minutes and is worth a great deal.`; }
        X.found(s, c, m); X.bite(s, c, m); X.hurt(s, c, m, 10, 'infection'); X.morale(s, c, 4);
        return `${m.name} is back, and thinner, and wearing somebody else's coat, and has a bandage on one arm that everybody looks at and nobody mentions for about four seconds.`; } },
    { text: 'Check them from a distance first', hint: 'careful',
      do(s, c) { const m = c.m; X.delay(s, c, 0.2);
        X.found(s, c, m); X.hurt(s, c, m, 12, 'exposure'); X.fatigue(s, c, m, 25);
        if (ZT.roll(s, 0.35)) { X.bite(s, c, m); X.morale(s, c, 2); return `${m.name} is made to stand at forty feet and roll both sleeves up. There is a bite. ${m.name} knew, and walked back anyway, to say so.`; }
        X.morale(s, c, 10); return `${m.name} stands at forty feet with both sleeves rolled up and turns around slowly and is clean. Then everyone stops being careful all at once.`; } },
  ],
},
]);
})();
