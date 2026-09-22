/* ZOMBIE TRAILS — event content: road and weather */
'use strict';
(function () {
const X = ZT.X;
const someone = (s) => X.someone(s);

ZT.Events.add([
/* ================= MIDWEST'S LAST DAYS OF SUMMER ================= */
{
  id: 'road_midwest_heat_buckle', cat: 'road', regions: ['missouri', 'platte', 'sandhills', 'panhandle'], weight: 5, cool: 30,
  cond: (s) => s.day <= 30 && s.weather === 'heat', art: 'heat',
  text: 'The heat has pushed a slab of pavement up like a trapdoor. Beyond it, the highway shimmers. Nebraska has added a speed bump without consulting anyone.',
  choices: [
    { text: 'Go around carefully on the gravel', hint: 'half a day; +4 fatigue',
      do(s, c) { X.delay(s, c, 0.5); X.fatigueAll(s, c, 4); return 'The gravel shoulder gets you around the slab. The sun follows you the entire way, providing supervision nobody requested.'; } },
    { text: 'Cross the slab at speed', hint: 'tires -12; body -8; noise +8', show: (s) => s.vehicle.has,
      do(s, c) { X.wear(s, c, 'tires', 12); X.wear(s, c, 'body', 8); X.noise(s, c, 8); return 'The wagon lands with a noise that settles the argument about whether that was a good idea.'; } },
    { text: 'Climb over and keep walking', hint: '+10 fatigue; morale -3', show: (s) => !s.vehicle.has,
      do(s, c) { X.fatigueAll(s, c, 10); X.morale(s, c, -3); return 'The pavement is too hot to touch. The packs are heavy. A car would be nice, even one with terrible suspension.'; } },
  ],
},
{
  id: 'road_midwest_ice_freezer', cat: 'road', regions: ['missouri', 'platte', 'sandhills', 'panhandle'], weight: 4, cool: 30,
  cond: (s) => s.day <= 30 && s.weather === 'heat', art: 'ice_freezer',
  text: 'A farm store still has a generator running its ice freezer. The owner offers a bag of ice and a round of cold bottled water. The price is written on cardboard. It has been crossed out twice.',
  choices: [
    { text: 'Trade for ice and cold water', hint: '1 trade lot; half a day; fatigue -12; morale +5', show: (s) => s.inv.goods >= 1,
      do(s, c) { X.take(s, c, 'goods', 1); X.delay(s, c, 0.5); X.fatigueAll(s, c, -12); X.morale(s, c, 5); return 'Cold water, a wet cloth on the neck, and ice rattling in a cup. For a little while, the biggest problem is drinking too fast.'; } },
    { text: 'Haul stock in exchange for drinks', hint: 'half a day; fatigue +6; morale +6',
      do(s, c) { X.delay(s, c, 0.5); X.fatigueAll(s, c, 6); X.morale(s, c, 6); return 'The owner trades cold drinks for moving stock into the shade. It is honest work in dishonest weather. You leave refreshed and thoroughly tired.'; } },
    { text: 'Keep going', hint: 'no cost',
      do() { return 'The freezer lid closes behind you with a very expensive-sounding thump.'; } },
  ],
},
/* ================= GENERAL ROAD ================= */
{
  id: 'road_last_bite_diner', cat: 'road', weight: 4, art: 'diner', cool: 30,
  text: 'The LAST BITE DINER has a hand-painted sign promising breakfast all day. The windows are intact. The parking lot is empty. For a moment it looks like somewhere you could order coffee.',
  choices: [
    { text: 'Search the pantry', hint: 'half a day; possible food; makes noise',
      do(s, c) {
        X.delay(s, c, 0.5); X.noise(s, c, 6);
        if (ZT.roll(s, 0.65)) {
          X.give(s, c, 'food', ZT.rint(s, 10, 22));
          return 'Behind the flour sacks: cans of peaches, crackers, and an enormous tin of coffee. Nobody finds a working coffee maker. This feels personal.';
        }
        X.noise(s, c, 6);
        return 'The pantry has already been emptied. Something bumps against the freezer door from the inside. You leave the freezer alone.';
      } },
    { text: 'Eat your own supplies in a booth', hint: 'one meal of food; less fatigue; better morale',
      show: s => s.inv.food >= ZT.Party.foodNeed(s) / 2,
      do(s, c) {
        X.take(s, c, 'food', ZT.Party.foodNeed(s) / 2); X.delay(s, c, 0.25);
        X.fatigueAll(s, c, -6); X.morale(s, c, 4);
        return 'You eat from your own bags at a real table. Somebody leaves a tip in bottle caps. The service was slow, but nobody tried to eat you.';
      } },
    { text: 'Keep going', hint: 'no cost', do() { return 'Breakfast all day. Maybe another day.'; } },
  ],
},
{
  id: 'road_detour_sign', cat: 'road', weight: 6, art: 'sign',
  text: 'Someone has painted over the highway sign. The new lettering says NOT THAT WAY and an arrow pointing at the road you are on.',
  choices: [
    { text: 'Trust the sign and detour', hint: 'costs fuel and time',
      do(s, c) { X.take(s, c, 'fuel', 2); X.delay(s, c, 1);
        if (ZT.roll(s, 0.65)) { X.noise(s, c, -6); return 'The detour is longer and duller and nothing at all happens on it. That is the best possible outcome.'; }
        X.loot(s, c, 0.6); return 'The detour runs past a farm stand that no one has bothered to loot.'; } },
    { text: 'Ignore it and keep going', hint: 'free, unknown',
      do(s, c) { if (ZT.roll(s, 0.5)) { X.wear(s, c, 'tires', 8); X.noise(s, c, 5); return 'Four miles on, the road is a field of broken glass and shell casings. You get through. The tires are unhappy about it.'; }
        return 'Nothing. Whoever painted the sign either lied or died before they could explain.'; } },
    { text: 'Stop and read the rest of it', hint: 'scout finds more',
      do(s, c) { X.delay(s, c, 0.3);
        if (ZT.State.hasRole(s, 'scout') || ZT.roll(s, 0.4)) { s.flags.roadWarned = true; X.morale(s, c, 2); return 'On the back, smaller: "Bridge out. Try the county road. Good luck. — K." Useful. You take the county road and save yourselves a bad afternoon.'; }
        return 'The back of the sign says nothing. You have spent twenty minutes on a sign.'; } },
  ],
},
{
  id: 'road_wreck_line', cat: 'road', weight: 8, regions: ['platte', 'panhandle', 'sandhills', 'snake', 'wasatch', 'owyhee', 'lava'], art: 'wrecks',
  text: 'A mile of stopped traffic, doors open, everything already taken. The evacuation ended here, whenever it ended.',
  choices: [
    { text: 'Thread through slowly', hint: 'time, low noise',
      do(s, c) { X.delay(s, c, 0.5); X.noise(s, c, 2);
        if (ZT.roll(s, 0.25)) { X.loot(s, c, 0.5); return 'Slow going. In a hatchback near the front, a case of bottled water and a bag of dog food nobody wanted.'; }
        return 'It takes hours of inching and reversing, but you come out the far side without touching anything.'; } },
    { text: 'Drive the shoulder fast', hint: 'quick, hard on the car',
      do(s, c) { X.wear(s, c, 'tires', 10); X.wear(s, c, 'body', 6); X.noise(s, c, 10);
        if (ZT.roll(s, 0.3)) { X.breakdown(s, c, 'tires'); return 'The shoulder is gravel and rebar. Something punches through a tire at forty miles an hour.'; }
        return 'You ride the gravel past the whole line, scraping a guardrail on the way. Loud, but done.'; } },
    { text: 'Search the cars first', hint: 'loot, noise, risk',
      do(s, c) { X.delay(s, c, 0.7); X.noise(s, c, 14); X.loot(s, c, 1.0);
        if (ZT.roll(s, 0.35 + ZT.Travel.threat(s) * 0.2)) {
          const m = someone(s); X.expose(s, c, m); X.injure(s, c, m, 12);
          return `Glove boxes, trunks, a cooler. Then one of the "empty" cars has someone still belted into it, and it gets a hand on ${m.name} before the window closes.`;
        }
        return 'An hour of opening doors. Most of it is garbage. Some of it is not.'; } },
  ],
},
{
  id: 'road_bridge_small', cat: 'road', weight: 5, art: 'bridge',
  text: 'A small concrete bridge over a creek. The near span has a crack running the width of it and a spray-painted question mark.',
  choices: [
    { text: 'Cross at speed', hint: 'fast, gamble',
      do(s, c) { if (ZT.roll(s, 0.82)) return 'You cross fast enough that the bridge does not get a vote. It holds.';
        X.wear(s, c, 'body', 20); X.wear(s, c, 'tires', 10); const m = someone(s); X.injure(s, c, m, 15);
        return `The far end drops eight inches as you hit it. The wagon lands hard, ${m.name} bites their tongue, and something underneath is now bent that was not bent before.`; } },
    { text: 'Walk it first, then cross', hint: 'half a day, safer',
      do(s, c) { X.delay(s, c, 0.5);
        if (ZT.roll(s, 0.2)) { X.take(s, c, 'fuel', 3); X.delay(s, c, 0.5); return 'It is worse than it looks. You back up and find a ford two miles downstream, which costs fuel and daylight but not a bridge.'; }
        return 'The crack is cosmetic. You cross at walking pace and everyone pretends they were not worried.'; } },
    { text: 'Ford the creek', hint: 'wet, hard on the car',
      do(s, c) { X.wear(s, c, 'electrical', 12); X.wear(s, c, 'engine', 5);
        if (ZT.roll(s, 0.2)) { X.breakdown(s, c, 'electrical'); return 'Water comes in over the sill and something under the dash pops. The engine dies mid-creek.'; }
        return 'The creek is knee-deep and the wagon takes it grudgingly, steaming and dripping on the far bank.'; } },
  ],
},
{
  id: 'road_blocked_trees', cat: 'road', weight: 6, regions: ['sandhills', 'powder', 'laramie', 'bear', 'snake'], art: 'trees',
  text: 'Three pines lie across the road, cut and dragged. Not storm damage. Someone wanted the road closed.',
  choices: [
    { text: 'Clear them', hint: 'tools help; noisy',
      do(s, c) { const tools = s.inv.tools > 0;
        X.delay(s, c, tools ? 0.6 : 1); X.noise(s, c, tools ? 12 : 6); X.fatigueAll(s, c, tools ? 8 : 15);
        if (!tools && ZT.roll(s, 0.3)) { const m = someone(s); X.injure(s, c, m, 20); return `Without a saw it is rope, shoulders and swearing. A trunk rolls back onto ${m.name}'s leg.`; }
        return tools ? 'The chainsaw is loud enough to be heard in the next county, but the road is open in forty minutes.' : 'Two hours of levering with a jack handle and the road is passable. Barely.'; } },
    { text: 'Back out and go around', hint: 'fuel and a day',
      do(s, c) { X.take(s, c, 'fuel', 3); X.delay(s, c, 1); return 'You lose an afternoon on logging roads. Whoever closed that road may have had reasons; you decline to learn them.'; } },
    { text: 'Wait and watch the treeline', hint: 'time; information',
      do(s, c) { X.delay(s, c, 0.4);
        if (ZT.roll(s, ZT.State.hasRole(s, 'scout') ? 0.65 : 0.4)) { s.flags.ambushSpotted = true; X.noise(s, c, -5);
          return { text: 'Twenty minutes of nothing. Then a flash of movement in the ditch on the left, and another on the right. It is a trap and it is occupied. You reverse quietly.', then: null }; }
        return 'You watch the trees for half an hour. The trees do nothing. You clear a gap and drive on with your neck prickling.'; } },
  ],
},
{
  id: 'road_gas_station', cat: 'road', weight: 7, art: 'station',
  cond: (s) => s.inv.fuel < ZT.ITEMS.fuel.cap * 0.7,
  text: 'A two-pump station with the roof half gone. The tanks underneath may still have something in them.',
  choices: [
    { text: 'Siphon the tanks', hint: 'fuel; slow and noisy',
      do(s, c) { X.delay(s, c, 0.6); X.noise(s, c, 10);
        const got = ZT.rint(s, 2, 7) * ZT.DIFF[s.difficulty].salvage;
        if (got < 4 && ZT.roll(s, 0.4)) { X.give(s, c, 'fuel', 2); return 'Hand-pumping through a garden hose for two hours yields about two gallons and a mouthful of gasoline for whoever drew the short straw.'; }
        X.give(s, c, 'fuel', got);
        if (ZT.roll(s, 0.3 + ZT.Travel.threat(s) * 0.25)) { const m = someone(s); X.injure(s, c, m, 10); X.noise(s, c, 8);
          return `The pump rig works. Halfway through, three of them come around the ice machine at ${m.name}, who gets away with a cut scalp and no dignity.`; }
        return 'The underground tank is nearly a third full. It is the best hour of the week.'; } },
    { text: 'Check the store instead', hint: 'supplies; quieter',
      do(s, c) { X.delay(s, c, 0.3); X.noise(s, c, 5); X.loot(s, c, 0.8, 'food');
        return 'Chips, motor oil, a fishing license, and behind the counter a carton of cigarettes worth more than the car.'; } },
    { text: 'Do both', hint: 'greedy',
      do(s, c) { X.delay(s, c, 1); X.noise(s, c, 18); X.give(s, c, 'fuel', ZT.rint(s, 2, 6) * ZT.DIFF[s.difficulty].salvage); X.loot(s, c, 0.9);
        if (ZT.roll(s, 0.5 + ZT.Travel.threat(s) * 0.2)) { const m = someone(s); X.bite(s, c, m); X.horde(s, c, 4);
          return `You take everything and stay too long. They come out of the car wash in a loose crowd and ${m.name} does not get clear in time.`; }
        return 'Fuel and food and nobody comes. You leave the station cleaner than you found it, in the sense that there is nothing left.'; } },
    { text: 'Drive on', hint: 'no cost',
      do() { return 'It looks picked over and it probably is. You keep the pedal down.'; } },
  ],
},
{
  id: 'road_toll_plaza', cat: 'road', weight: 4, regions: ['platte', 'panhandle', 'snake', 'owyhee', 'lava'], art: 'wrecks',
  text: 'A toll plaza. All eight lanes have been welded shut with car frames except one, and someone has stenciled a price above it: FOOD OR AMMO. NO EXCEPTIONS.',
  choices: [
    { text: 'Pay in food', hint: '30 lbs', show: (s) => s.inv.food >= 30,
      do(s, c) { X.take(s, c, 'food', 30); X.morale(s, c, -2);
        return 'A hand takes the bag through a slot. The barrier lifts. Nobody speaks. Whoever runs this has made a functioning business out of the end of the world.'; } },
    { text: 'Pay in ammunition', hint: '40 rounds', show: (s) => s.inv.ammo >= 40,
      do(s, c) { X.take(s, c, 'ammo', 40); return 'Forty rounds through the slot. A voice says "much obliged" with real warmth. The barrier lifts.'; } },
    { text: 'Talk your way through', hint: 'morale-dependent',
      do(s, c) { if (ZT.roll(s, ZT.clamp(0.25 + ZT.Party.avgMorale(s) / 300, 0.2, 0.6))) { X.morale(s, c, 3);
          return 'You talk for twenty minutes through a firing slit about weather, the rail yard, and a dog they used to have. The barrier lifts. No charge.'; }
        X.delay(s, c, 0.5); return 'The voice behind the slit says "no exceptions" eleven times in a row and then stops answering.'; } },
    { text: 'Ram the barrier', hint: 'loud and stupid',
      do(s, c) { X.wear(s, c, 'body', 25); X.wear(s, c, 'engine', 10); X.noise(s, c, 25); X.horde(s, c, 3);
        const m = someone(s); X.injure(s, c, m, 12);
        if (ZT.roll(s, 0.4)) { X.take(s, c, 'ammo', 10); return `The barrier gives and so does the grille. Somebody up in the booth puts two rounds through the tailgate as you go. ${m.name} is cut by glass.`; }
        return `You go through in a shower of plywood and sparks. Nobody shoots. ${m.name} is cut by glass and the wagon looks like it lost an argument.`; } },
  ],
},
{
  id: 'road_hitchhiker_dog', cat: 'road', weight: 3, art: 'figure',
  once: true,
  text: 'A dog is sitting in the middle of the road, upright and patient, like it has an appointment. It is not thin. Something has been feeding it.',
  choices: [
    { text: 'Take the dog', hint: 'morale; eats food',
      do(s, c) { s.flags.dog = true; X.morale(s, c, 12); ZT.State.log(s, 'A dog joined the party.', true);
        return 'It gets in the back like it has done this before and puts its head on someone\'s knee. Morale in the wagon goes up more than is strictly rational.'; } },
    { text: 'Feed it and drive on', hint: 'a little food',
      do(s, c) { X.take(s, c, 'food', 3); X.morale(s, c, 3); return 'You leave a can open on the asphalt. In the mirror the dog does not eat it. It watches the car until the road bends.'; } },
    { text: 'Drive around it', hint: '',
      do(s, c) { X.morale(s, c, -3); return 'You go around. Nobody in the wagon says anything for a long time.'; } },
  ],
},
{
  id: 'road_dog_follow', cat: 'road', weight: 4, cond: (s) => s.flags.dog, art: 'figure',
  text: (s) => 'The dog will not settle. It stands on the back seat facing the road behind you and makes a sound in its chest that is not quite a growl.',
  choices: [
    { text: 'Trust the dog. Move.', hint: 'push on',
      do(s, c) { X.take(s, c, 'fuel', 1); X.fatigueAll(s, c, 5);
        if (ZT.roll(s, 0.7)) { X.noise(s, c, -8); return 'You drive another two hours into the dark. Whatever the dog heard does not catch up. The dog goes to sleep. So does most of the wagon.'; }
        X.wear(s, c, 'tires', 5); return 'You push on in the dark, hit a pothole you never see, and learn nothing about what the dog heard.'; } },
    { text: 'Stop and listen', hint: 'information',
      do(s, c) { X.delay(s, c, 0.2);
        if (ZT.roll(s, 0.55)) { X.horde(s, c, 3); return 'Engine off. From the way you came: a low, wide, shuffling noise, like surf. It is a long way back and it is coming this way. You leave.'; }
        X.morale(s, c, -1); return 'Nothing but wind and the tick of the cooling engine. The dog eventually lies down, unconvinced.'; } },
  ],
},
{
  id: 'road_supply_cache', cat: 'road', weight: 4, art: 'cache',
  text: 'A mailbox at the end of a dirt driveway has a strip of orange tape on it, and someone has stacked three sealed buckets underneath.',
  choices: [
    { text: 'Take the buckets', hint: 'free supplies',
      do(s, c) { X.loot(s, c, 1.1, 'food');
        if (ZT.roll(s, 0.2)) { X.morale(s, c, -3); return 'Rice, beans, chlorine tablets, and a note: "For whoever needs it. Please leave one." You take all three. Someone in the wagon mentions this later, more than once.'; }
        return 'Rice, beans, chlorine tablets, and a note: "For whoever needs it. Please leave one."'; } },
    { text: 'Take two, leave one', hint: 'less, but',
      do(s, c) { X.loot(s, c, 0.7, 'food'); X.morale(s, c, 5); return 'You take two and square the third one up neatly under the mailbox. It is a small thing. It sits well with everybody.'; } },
    { text: 'Leave them and add to the pile', hint: 'costs food; morale',
      show: (s) => s.inv.food > 60,
      do(s, c) { X.take(s, c, 'food', 15); X.morale(s, c, 9); return 'You add a bag of your own and tighten the tape on the mailbox. Nobody will ever know if it helped anyone. Everyone feels better anyway.'; } },
  ],
},
{
  id: 'road_flooded', cat: 'road', weight: 5, regions: ['sandhills', 'snake', 'powder', 'platte', 'panhandle'], art: 'water',
  cond: (s) => s.weather === 'rain' || s.weather === 'storm' || ZT.roll(s, 0.5),
  text: 'The road ahead is under brown water for two hundred yards. A stop sign stands in it up to its chin.',
  choices: [
    { text: 'Drive through slowly', hint: 'risk to electrical',
      do(s, c) { X.wear(s, c, 'electrical', 15); X.wear(s, c, 'body', 5);
        if (ZT.roll(s, 0.3)) { X.breakdown(s, c, 'electrical'); return 'Halfway across, the water comes up over the floorboards and the engine drowns with a polite cough.'; }
        return 'You go through at a walking pace with a bow wave, and come out the far side with wet carpet and a working car.'; } },
    { text: 'Wait for it to drop', hint: 'a day or two',
      do(s, c) { const d = ZT.rint(s, 1, 2); X.delay(s, c, d);
        return `You camp on high ground for ${d === 1 ? 'a day' : 'two days'} and watch the water go down an inch at a time. Boring. Boring is good.`; } },
    { text: 'Find another way', hint: 'fuel',
      do(s, c) { X.take(s, c, 'fuel', 4); X.delay(s, c, 0.6); return 'Thirty miles of back roads to gain four. The wagon does not care for the gravel and neither does anyone in it.'; } },
  ],
},
{
  id: 'road_school_bus', cat: 'road', weight: 4, art: 'bus',
  text: 'A school bus sits nose-down in a ditch, every window painted over from the inside with white paint.',
  choices: [
    { text: 'Open it', hint: 'high risk, high reward',
      do(s, c) { X.noise(s, c, 8);
        const r = ZT.rand(s);
        if (r < 0.35) { X.loot(s, c, 1.4); return 'Inside: rows of seats stripped out and replaced with shelving. Someone lived here and stocked it well and is not here now.'; }
        if (r < 0.7) { const m = someone(s); X.bite(s, c, m); X.noise(s, c, 12);
          return `The paint was not for privacy. It was a label. ${m.name} gets the door shut again, eventually.`; }
        X.morale(s, c, -4); return 'Empty seats, a lunchbox, and forty small backpacks stacked at the back with care. You close the door.'; } },
    { text: 'Knock first', hint: 'information',
      do(s, c) { X.noise(s, c, 4); X.delay(s, c, 0.2);
        if (ZT.roll(s, 0.5)) return { text: 'You knock. From inside, an answering knock. Then, in a dry voice: "We are fine, thank you." Nobody in the wagon can think of a single thing to say to that. You leave them to it.' };
        return 'You knock. The bus shifts on its springs and something inside moves toward the sound. You go back to the car.'; } },
    { text: 'Keep driving', hint: '', do() { return 'The bus goes by. Everyone looks at it. Nobody says anything.'; } },
  ],
},
{
  id: 'road_map_dispute', cat: 'road', weight: 5, art: 'map',
  cond: (s) => ZT.State.aliveCount(s) >= 2,
  text: (s) => { const a = someone(s), b = X.other(s, a); return `${a.name} and ${b.name} disagree about the atlas. One route is shorter. The other is a road ${b.name} has actually driven.`; },
  choices: [
    { text: 'Take the short route', hint: 'save fuel, unknown road',
      do(s, c) { X.give(s, c, 'fuel', 0);
        if (ZT.roll(s, 0.55)) { X.take(s, c, 'fuel', -2); s.miles = Math.round((s.miles + 12) * 10) / 10; X.d(c, '+12 miles'); return 'The short route is short. Twelve free miles and a bridge that is exactly where the atlas says it is.'; }
        X.take(s, c, 'fuel', 3); X.delay(s, c, 0.6); X.morale(s, c, -3); return 'The short route ends in a washed-out culvert. You back out over eight miles of your own tire tracks with nobody saying "I told you so" loudly enough to start a fight.'; } },
    { text: 'Take the known road', hint: 'slower, safer',
      do(s, c) { X.take(s, c, 'fuel', 1); X.morale(s, c, 2); return 'The long way. It is exactly as dull as promised, which by this point counts as a luxury.'; } },
    { text: 'Let them settle it', hint: 'coin toss',
      do(s, c) { X.morale(s, c, ZT.roll(s, 0.5) ? 2 : -2);
        return ZT.roll(s, 0.5) ? 'They flip a quarter. The loser drives. Everyone is oddly satisfied by the fairness of it.' : 'They do not settle it. They stop speaking instead, which is quieter but worse.'; } },
  ],
},
{
  id: 'road_train_crossing', cat: 'road', weight: 4, regions: ['platte', 'wasatch', 'sandhills', 'powder', 'divide'], art: 'train',
  text: 'A freight train sits across the road, motionless, stretching out of sight in both directions. The crossing arms are still down, still blinking.',
  choices: [
    { text: 'Follow the tracks to a gap', hint: 'fuel, time',
      do(s, c) { X.take(s, c, 'fuel', 3); X.delay(s, c, 0.7);
        if (ZT.roll(s, 0.7)) return 'Six miles along the line there is a break where two cars have been uncoupled, almost as if for this purpose. You cross.';
        X.take(s, c, 'fuel', 2); X.delay(s, c, 0.5); return 'Eleven miles before a gap, and then eleven miles back to the road. The blinking crossing arms are visible the whole way.'; } },
    { text: 'Unload and climb through', hint: 'leave the wagon',
      show: (s) => s.vehicle.has,
      do(s, c) { return { text: 'You get as far as sizing up the gap under a hopper car before somebody points out that the wagon does not climb. The idea dies there.' }; } },
    { text: 'Look inside the boxcars', hint: 'salvage; noise',
      do(s, c) { X.delay(s, c, 0.5); X.noise(s, c, 10);
        if (ZT.roll(s, 0.55)) { X.loot(s, c, 1.2); return 'The fourth car you open is full of pallets of canned soup bound for a supermarket that no longer exists.'; }
        if (ZT.roll(s, 0.5)) { const m = someone(s); X.injure(s, c, m, 15); X.noise(s, c, 10); return `The seventh car is not full of soup. ${m.name} jumps down badly and turns an ankle getting away from the door.`; }
        return 'Auto parts for a model of car nobody has, ten thousand plastic hangers, and a car full of gravel.'; } },
  ],
},
{
  id: 'road_pileup_fire', cat: 'road', weight: 4, regions: ['platte', 'panhandle', 'wasatch', 'snake', 'owyhee', 'lava'], art: 'fire',
  text: 'Something ahead is burning and has been for a while. Black smoke stands straight up in a column you could see from thirty miles away. So can everything else.',
  choices: [
    { text: 'Go through fast', hint: 'heat, wear, speed',
      do(s, c) { X.wear(s, c, 'body', 8); X.wear(s, c, 'engine', 6); X.noise(s, c, 8); X.fatigueAll(s, c, 6);
        if (ZT.roll(s, 0.25)) { const m = someone(s); X.injure(s, c, m, 12); return `You take the shoulder past a burning tanker with the windows up. The heat cracks the rear glass and ${m.name} catches a piece of it.`; }
        return 'The paint on that side of the wagon is a shade darker than it was. Everyone is through and nobody is on fire.'; } },
    { text: 'Wait for it to burn out', hint: 'days',
      do(s, c) { const d = ZT.rint(s, 1, 2); X.delay(s, c, d); X.horde(s, c, 4);
        return `You wait ${d === 1 ? 'a day' : 'two days'}. The column of smoke draws things toward it from every direction, which is useful, since none of them are looking at you.`; } },
    { text: 'Detour wide around the smoke', hint: 'fuel',
      do(s, c) { X.take(s, c, 'fuel', 4); X.delay(s, c, 0.8); X.noise(s, c, -5); return 'Twenty miles of county roads with the smoke always on the same side of the windshield. Expensive, but nothing burning is ever close.'; } },
  ],
},
{
  id: 'road_billboard', cat: 'road', weight: 3, art: 'sign',
  text: (s) => ZT.pick(s, [
    'A billboard for a water park has been overpainted in letters ten feet high: WE WENT WEST. IT IS NOT BETTER. IT IS JUST WEST.',
    'A billboard reads MILE 1900 — TURN BACK, which is a lie, since you are nowhere near mile 1900.',
    'Someone has hung two hundred pairs of shoes from the power lines over the road for a quarter mile. There is no explanation and there is not going to be one.',
    'A church marquee: GOD IS STILL HERE. Underneath, in different handwriting: SO ARE THEY.',
  ]),
  choices: [
    { text: 'Note it in the log', hint: '',
      do(s, c) { X.morale(s, c, 1); return 'It goes in the atlas margin with the date. The atlas is becoming a strange document.'; } },
    { text: 'Drive on', hint: '', do() { return 'You drive on. It stays with you for about four miles.'; } },
  ],
},
{
  id: 'road_lost_time', cat: 'road', weight: 4, art: 'road',
  text: 'The road curves, straightens, and curves again, and after two hours the barn on the left is the same barn on the left.',
  choices: [
    { text: 'Stop and work it out with the atlas', hint: 'half a day',
      do(s, c) { X.delay(s, c, 0.5);
        if (ZT.State.hasRole(s, 'scout')) { X.morale(s, c, 2); return `${ZT.State.byRole(s, 'scout').name} finds the wrong turn in eight minutes: an unmarked fork four miles back. You lose an afternoon and no more.`; }
        return 'Forty minutes of arguing over a road atlas printed in a year when all of this was somebody\'s commute. You find the fork eventually.'; } },
    { text: 'Keep going and hope', hint: 'fuel',
      do(s, c) { X.take(s, c, 'fuel', 3); X.fatigueAll(s, c, 8); X.morale(s, c, -4);
        return 'Another two hours. Another barn. When the road finally spits you out at a numbered highway, nobody is willing to say out loud how much fuel that cost.'; } },
  ],
},
{
  id: 'road_roadside_market', cat: 'road', weight: 4, regions: ['sandhills', 'powder', 'divide', 'snake'], art: 'market',
  cond: (s) => s.inv.cash > 30 || s.inv.goods > 0,
  text: 'A folding table under a tarp at a crossroads, with a hand-lettered sign: TRADE. A woman sits behind it with a rifle across her knees and a jar of pickles in front of her, both for sale.',
  setup(s, c) { c.prices = { food: 1.0, fuel: 5.0, medicine: 40, ammo: 0.9, parts: 90 }; },
  choices: [
    { text: 'Buy food (60 lbs, $60)', hint: 'expensive', show: (s) => s.inv.cash >= 60,
      do(s, c) { X.take(s, c, 'cash', 60); X.give(s, c, 'food', 60); return 'Cornmeal, dried apples, and a slab of something smoked that she will not identify. It is fine. It is more than fine.'; } },
    { text: 'Buy medicine ($40)', hint: 'scarce', show: (s) => s.inv.cash >= 40,
      do(s, c) { X.take(s, c, 'cash', 40); X.give(s, c, 'medicine', 1); return 'One kit, sealed, in-date. She watches you check the date and seems to approve.'; } },
    { text: 'Buy fuel (8 gal, $40)', hint: '', show: (s) => s.inv.cash >= 40,
      do(s, c) { X.take(s, c, 'cash', 40); X.give(s, c, 'fuel', 8); return 'Eight gallons out of a drum, filtered through a sock. It smells right, which is the only test available.'; } },
    { text: 'Sell trade goods', hint: '$14 a lot', show: (s) => s.inv.goods > 0,
      do(s, c) { const n = Math.min(s.inv.goods, 6); X.take(s, c, 'goods', n); X.give(s, c, 'cash', n * 14);
        return `She takes ${n} ${ZT.plural(n, 'lot')} off your hands and counts out cash from a cigar box. Coffee and batteries move fastest, she says. Always have.`; } },
    { text: 'Just talk', hint: 'road news',
      do(s, c) { X.delay(s, c, 0.2); X.morale(s, c, 3); s.flags.roadNews = true;
        return ZT.pick(s, [
          'She says the rail yard is thick with them and the noise carries a long way there. Useful.',
          'She says there is a working well eleven miles west with a rope and a bucket and no owner. She has no reason to lie.',
          'She says the pass is snowed in some years by now and to carry chains if you can find them. You cannot, but you appreciate the thought.',
        ]); } },
    { text: 'Move on', hint: '', do() { return 'You wave. She waves back with the hand that is not on the rifle.'; } },
  ],
},
{
  id: 'road_tolls_kid', cat: 'road', weight: 3, art: 'figure',
  text: 'A boy of about nine has set up a lemonade stand at an intersection, with no lemonade. The sign says INFORMATION 25¢. He is entirely serious and there is an adult watching from a porch a hundred yards back.',
  choices: [
    { text: 'Pay the quarter', hint: '$1; real information',
      do(s, c) { X.take(s, c, 'cash', 1); s.flags.kidTip = true; X.morale(s, c, 4);
        return ZT.pick(s, [
          'He says the bridge west is out but the one at the quarry is fine, and that his dad says so. His dad, from the porch, nods once.',
          'He says do not camp by the grain silos because "they get loud at night." He does not elaborate and you do not ask.',
          'He tells you which house on the next road has a garden nobody is using. He is right, and it is the best tomato anyone has eaten in a year.',
        ]); } },
    { text: 'Pay in trade goods', hint: 'more information', show: (s) => s.inv.goods > 0,
      do(s, c) { X.take(s, c, 'goods', 1); X.give(s, c, 'food', 12); X.morale(s, c, 6);
        return 'You put a lot of batteries on the card table. His eyes go wide, he tells you everything he knows about four counties, and his mother comes down off the porch and gives you a bag of squash.'; } },
    { text: 'Drive past', hint: '', do(s, c) { X.morale(s, c, -2); return 'You drive past a nine-year-old running a business. It is not a good moment for anyone in the car.'; } },
  ],
},
{
  id: 'road_pothole', cat: 'road', weight: 6, art: 'road',
  text: 'The road surface has stopped being a road surface in any meaningful sense.',
  choices: [
    { text: 'Slow to a crawl', hint: 'time, less damage',
      do(s, c) { X.delay(s, c, 0.4); X.wear(s, c, 'tires', 3); return 'Fifteen miles an hour for two hours. The suspension survives. Everyone\'s patience does not.'; } },
    { text: 'Keep the pace', hint: 'damage',
      do(s, c) { X.wear(s, c, 'tires', 12); X.wear(s, c, 'body', 8);
        if (ZT.roll(s, 0.18)) { X.breakdown(s, c, 'tires'); return 'One hole in the dark takes the sidewall out of a tire like a knife.'; }
        return 'The wagon bangs and clatters through it. Something in the back is now loose and will rattle for the rest of the journey.'; } },
  ],
},
{
  id: 'road_ash', cat: 'road', weight: 3, regions: ['powder', 'divide', 'sandhills', 'laramie', 'bear'], art: 'ash',
  text: 'Ash on the windshield, fine and gray, from a fire too far away to see. It has been falling for hours.',
  choices: [
    { text: 'Wipers and keep going', hint: 'wear',
      do(s, c) { X.wear(s, c, 'engine', 4); X.wear(s, c, 'electrical', 3); const m = someone(s); X.sicken(s, c, m, 12);
        return `The air filter chokes on it and so does ${m.name}, who has been coughing since noon.`; } },
    { text: 'Rig masks and filter the intake', hint: 'time, tools',
      do(s, c) { X.delay(s, c, 0.4); if (s.inv.tools > 0) { X.wear(s, c, 'engine', 1); return 'A T-shirt over the air intake and bandanas for everyone. Crude and effective. The wagon breathes.'; }
        X.wear(s, c, 'engine', 3); return 'Bandanas for the people, nothing for the engine. Half a solution.'; } },
  ],
},
{
  id: 'road_convoy_tracks', cat: 'road', weight: 4, art: 'road',
  text: 'Fresh tire tracks, a lot of them, all going west. Someone big came through here recently and in a hurry.',
  choices: [
    { text: 'Follow them', hint: 'clear road, company',
      do(s, c) { s.miles = Math.round((s.miles + 8) * 10) / 10; X.d(c, '+8 miles');
        if (ZT.roll(s, 0.6)) { X.noise(s, c, -8); return 'Whoever they were, they cleared the road as they went. Eight easy miles in their wake, past shoved-aside wrecks and things already dealt with.'; }
        X.horde(s, c, 5); return 'You follow the tracks into a stretch of road where everything has been stirred up and nothing has settled. Something big came through and made a mess and left.'; } },
    { text: 'Give them a wide berth', hint: 'fuel',
      do(s, c) { X.take(s, c, 'fuel', 2); X.delay(s, c, 0.4); return 'You take a parallel road a mile north. Twice you hear engines. You never see them and they never see you.'; } },
  ],
},
{
  id: 'road_animals', cat: 'road', weight: 4, regions: ['sandhills', 'powder', 'divide', 'laramie', 'bear', 'snake'], art: 'field',
  text: 'A herd of cattle has the road, forty or fifty of them, fat and unbothered and entirely unowned.',
  choices: [
    { text: 'Take one', hint: 'food, noise, work',
      do(s, c) { X.shots(s, c, 3); X.noise(s, c, 22); X.delay(s, c, 0.6); X.give(s, c, 'food', ZT.rint(s, 30, 60)); X.morale(s, c, 4);
        if (ZT.roll(s, 0.25 + ZT.Travel.threat(s) * 0.2)) { X.horde(s, c, 5); return 'Meat for a week, and a rifle shot that carries for miles across open ground. You butcher fast and leave faster.'; }
        return 'It takes three shots, a knife, four hours and a tarp, and the wagon smells like a slaughterhouse. It is worth it.'; } },
    { text: 'Just wait for them to pass', hint: 'time, quiet',
      do(s, c) { X.delay(s, c, 0.3); X.morale(s, c, 3); return 'Twenty minutes of cattle. It is the most normal thing anyone has seen in months and it does everyone good.'; } },
    { text: 'Push through with the horn', hint: 'loud',
      do(s, c) { X.noise(s, c, 15); X.wear(s, c, 'body', 4); return 'The horn works, the cattle scatter, and the sound rolls out across four miles of open country to be heard by whatever is listening.'; } },
  ],
},
{
  id: 'road_mile_marker_graves', cat: 'road', weight: 3, art: 'graves',
  cond: (s) => s.miles > 300,
  text: 'A row of graves beside the road, marked with hubcaps. Names scratched in with a screwdriver. The most recent one is not old.',
  choices: [
    { text: 'Stop a moment', hint: 'morale',
      do(s, c) { X.delay(s, c, 0.2); X.morale(s, c, ZT.roll(s, 0.6) ? 4 : -3);
        return ZT.roll(s, 0.6) ? 'Nobody says a prayer, exactly. But nobody starts the car for a while either.'
          : 'One of the hubcaps has a date from this month. It puts everyone in a mood that lasts until dark.'; } },
    { text: 'Look for what they left', hint: 'salvage; grim',
      do(s, c) { X.morale(s, c, -6); X.loot(s, c, 0.5);
        return 'There is a pack behind the last marker with food still in it. Taking it is the correct decision and it does not feel like one.'; } },
    { text: 'Drive on', hint: '', do() { return 'You do not stop. It is easier that way and everyone knows it.'; } },
  ],
},
{
  id: 'road_radio_static', cat: 'road', weight: 5, cond: (s) => s.vehicle.has && s.vehicle.electrical > 30, art: 'radio',
  text: 'Somebody leaves the radio on the scan setting. It runs the whole band and finds nothing but a carrier tone on 1610 AM that pulses in a pattern.',
  choices: [
    { text: 'Listen to the pattern', hint: 'time; information',
      do(s, c) { X.delay(s, c, 0.2);
        if (ZT.roll(s, 0.45)) { s.flags.heardBroadcast = true; X.morale(s, c, 6);
          return 'Three long, three short, then a woman\'s recorded voice: coordinates, a highway number, and the words "we are still here" before the loop starts again. West. It is west.'; }
        return 'The pattern is not a pattern. It is a fence charger somewhere shorting into an antenna. Two hours of hope for nothing.'; } },
    { text: 'Turn it off', hint: 'saves the battery',
      do(s, c) { X.repair(s, c, 'electrical', 2); X.morale(s, c, -2); return 'Off. The battery thanks you. Nobody else does.'; } },
  ],
},
{
  id: 'road_hill_view', cat: 'road', weight: 4, regions: ['laramie', 'bear', 'powder', 'divide'], art: 'vista',
  text: 'The road tops a rise and the whole country opens up ahead: forty miles of it, and not one light anywhere in it.',
  choices: [
    { text: 'Stop and read the ground', hint: 'route information',
      do(s, c) { X.delay(s, c, 0.3);
        if (ZT.State.hasRole(s, 'scout') || ZT.roll(s, 0.5)) { s.flags.routeRead = true; X.take(s, c, 'fuel', -1); s.miles = Math.round((s.miles + 6) * 10) / 10; X.d(c, '+6 miles');
          return 'From up here the road\'s whole argument is visible: two switchbacks that can be skipped on a gravel spur, and a town you now know to go around.'; }
        return 'It is a magnificent view of a country with nobody in it. Nobody learns anything useful.'; } },
    { text: 'Take the moment', hint: 'morale',
      do(s, c) { X.delay(s, c, 0.2); X.morale(s, c, 7); X.fatigueAll(s, c, -5);
        return 'Twenty minutes on the hood with the engine ticking. Somebody makes coffee on the camp stove. It is the best part of the week and it costs almost nothing.'; } },
    { text: 'Drive', hint: '', do() { return 'Down the far side without stopping. There is a lot of country left.'; } },
  ],
},
{
  id: 'road_motel', cat: 'road', weight: 5, art: 'motel',
  text: 'A one-story motel, twelve doors, all closed. The office window is intact. The VACANCY sign is, technically, accurate.',
  choices: [
    { text: 'Clear it room by room', hint: 'thorough; risky',
      do(s, c) { X.delay(s, c, 0.6); X.noise(s, c, 12); X.fatigueAll(s, c, 8);
        const r = ZT.rand(s);
        if (r < 0.4) { X.loot(s, c, 1.3); return 'Eleven empty rooms and one that a traveling salesman filled with sample cases. Vitamins, painkillers, and two hundred cigarette lighters.'; }
        if (r < 0.75) { const m = someone(s); X.injure(s, c, m, 14); X.expose(s, c, m); X.loot(s, c, 0.6);
          return `Room seven had someone in it, still in the bathroom where they shut themselves in. ${m.name} takes the worst of getting the door closed again.`; }
        return 'Twelve rooms of stripped beds and stolen televisions. Someone got here first and was extremely thorough.'; } },
    { text: 'Take the office only', hint: 'quick',
      do(s, c) { X.delay(s, c, 0.2); X.noise(s, c, 4); X.loot(s, c, 0.5); X.give(s, c, 'cash', ZT.rint(s, 10, 60));
        return 'The register still has cash in it, which is funny, and a first aid box on the wall, which is not funny at all but is very welcome.'; } },
    { text: 'Sleep here tonight', hint: 'rest; risk',
      do(s, c) { ZT.Travel.restDay(s); X.d(c, '+1 day'); X.fatigueAll(s, c, -15);
        if (ZT.roll(s, 0.25 + ZT.Travel.threat(s) * 0.2)) { X.noise(s, c, 10); const m = someone(s); X.fatigue(s, c, m, 20); X.morale(s, c, -3);
          return 'Beds. Actual beds. At three in the morning, something works the handle of the next door over for an hour and nobody sleeps after that.'; }
        X.morale(s, c, 8); return 'Beds. Actual beds, with a door that locks. Everyone sleeps eleven hours and wakes up like different people.'; } },
    { text: 'Keep going', hint: '', do() { return 'Twelve closed doors go by in the mirror.'; } },
  ],
},
{
  id: 'road_ferry', cat: 'road', weight: 4, regions: ['sandhills', 'snake', 'powder'], art: 'ferry',
  cond: (s) => s.miles > 250,
  text: 'A cable ferry crosses a river here, and it still works, because a man in waders has decided that it will. He wants paying.',
  choices: [
    { text: 'Pay cash ($75)', hint: 'saves days', show: (s) => s.inv.cash >= 75,
      do(s, c) { X.take(s, c, 'cash', 75); s.miles = Math.round((s.miles + 20) * 10) / 10; X.d(c, '+20 miles'); X.delay(s, c, 0.3);
        return 'He hauls the cable hand over hand for forty minutes without complaint and puts you on the far bank twenty miles ahead of where the bridge would have.'; } },
    { text: 'Pay in fuel (6 gal)', hint: '', show: (s) => s.inv.fuel >= 6,
      do(s, c) { X.take(s, c, 'fuel', 6); s.miles = Math.round((s.miles + 20) * 10) / 10; X.d(c, '+20 miles'); X.delay(s, c, 0.3);
        return 'Fuel is better than money and he says so. The crossing takes forty minutes and he talks the whole way about a dog he used to have.'; } },
    { text: 'Help him work the cable instead', hint: 'labor',
      do(s, c) { X.fatigueAll(s, c, 12); X.delay(s, c, 0.5); s.miles = Math.round((s.miles + 20) * 10) / 10; X.d(c, '+20 miles'); X.morale(s, c, 3);
        return 'Four of you on the cable and the crossing takes half as long. He seems to enjoy the company more than he would have enjoyed the money.'; } },
    { text: 'Take the long way round', hint: 'fuel and days',
      do(s, c) { X.take(s, c, 'fuel', 5); X.delay(s, c, 1); return 'Sixty miles upriver to a bridge that is still standing. It is the safe choice and it is expensive.'; } },
  ],
},
{
  id: 'road_tire_iron', cat: 'road', weight: 4, art: 'road', cool: 40,
  text: (s) => `${someone(s).name} drops the tire iron into a storm drain.`,
  choices: [
    { text: 'Fish it out', hint: 'time',
      do(s, c) { X.delay(s, c, 0.3);
        if (ZT.roll(s, 0.6)) return 'Forty minutes with a coat hanger and a lot of language. Recovered.';
        if (s.inv.tools > 0) { X.take(s, c, 'tools', 1); return 'The coat hanger goes in after it. Then the flashlight. Then, in a way nobody can fully reconstruct afterward, the tool kit.'; }
        return 'It is gone. It is eleven feet down in standing water and it is gone.'; } },
    { text: 'Leave it', hint: '',
      do(s, c) { X.morale(s, c, -1); return 'It is left where it is. This will be brought up again.'; } },
  ],
},
{
  id: 'road_shortcut_offer', cat: 'road', weight: 4, art: 'map', cond: (s) => s.miles > 400,
  text: 'A county road cuts the corner off forty miles of highway. It is unpaved and the atlas shows it ending in the middle of nothing.',
  choices: [
    { text: 'Take it', hint: 'gamble',
      do(s, c) { X.wear(s, c, 'tires', 8); X.wear(s, c, 'body', 5);
        const r = ZT.rand(s);
        if (r < 0.5) { s.miles = Math.round((s.miles + 25) * 10) / 10; X.d(c, '+25 miles'); return 'The county road runs true, dusty and empty, and rejoins the highway twenty-five miles further along than it had any right to.'; }
        if (r < 0.8) { X.take(s, c, 'fuel', 3); X.delay(s, c, 0.7); return 'The road narrows, then becomes a track, then becomes a field. You reverse for a mile and a half.'; }
        X.breakdown(s, c, 'tires'); return 'The road narrows and then something in it takes a tire out at the rim.'; } },
    { text: 'Stay on the highway', hint: 'known',
      do(s, c) { X.take(s, c, 'fuel', 1); return 'The long way around the corner. Predictable. Fine.'; } },
  ],
},
{
  id: 'road_night_drive', cat: 'road', weight: 5, cond: (s) => s.vehicle.has, art: 'night',
  text: 'You could keep driving after dark. The road is empty and the headlights are the only lights for twenty miles, in every sense.',
  choices: [
    { text: 'Drive through the night', hint: 'miles; fatigue and noise',
      do(s, c) { s.miles = Math.round((s.miles + ZT.rint(s, 18, 30)) * 10) / 10; X.d(c, '+miles'); X.fatigueAll(s, c, 18); X.take(s, c, 'fuel', 2); X.noise(s, c, 12);
        if (ZT.roll(s, 0.25)) { X.wear(s, c, 'body', 12); const m = someone(s); X.injure(s, c, m, 12);
          return `Good miles until something that was standing in the road at two in the morning is suddenly not standing in the road. The wagon takes it on the corner. ${m.name} hits the dash.`; }
        return 'Real miles, cheap, in the dark. Everyone pays for it tomorrow with a fatigue that does not shift.'; } },
    { text: 'Stop and camp', hint: 'rest',
      do(s, c) { ZT.Travel.restDay(s); X.d(c, '+1 day'); X.fatigueAll(s, c, -10);
        return 'Headlights off, engine cooling, everyone in the car. It is not comfortable but it is dark and quiet and nobody drives into anything.'; } },
  ],
},
{
  id: 'road_water_source', cat: 'road', weight: 4, art: 'well',
  text: 'A windmill pump over a stock tank, still turning. The water in the tank is clear.',
  choices: [
    { text: 'Fill everything', hint: 'health',
      do(s, c) { X.delay(s, c, 0.3); for (const m of ZT.State.alive(s)) { X.heal(s, c, m, 6); X.fatigue(s, c, m, -8); }
        X.morale(s, c, 5); return 'Everyone drinks until they are uncomfortable and then fills every container in the wagon. Clean water is a bigger event than it used to be.'; } },
    { text: 'Fill and wash', hint: 'more time, better',
      do(s, c) { X.delay(s, c, 0.6); for (const m of ZT.State.alive(s)) { X.heal(s, c, m, 9); X.fatigue(s, c, m, -14); if (m.illness > 0) m.illness = Math.max(0, m.illness - 15); }
        X.morale(s, c, 10); return 'Water, and then an hour of washing clothes and people in a stock tank in the open. The change in the wagon afterward is remarkable.'; } },
    { text: 'Fill fast and go', hint: 'quick',
      do(s, c) { X.delay(s, c, 0.1); for (const m of ZT.State.alive(s)) X.heal(s, c, m, 3); return 'Jugs filled, caps on, back in the car in eight minutes.'; } },
  ],
},
{
  id: 'road_broken_glass_field', cat: 'road', weight: 4, regions: ['platte', 'panhandle', 'wasatch', 'snake', 'owyhee', 'lava'], art: 'road',
  text: 'Someone has emptied a truckload of glass across both lanes and swept it into an even layer. This was work. Somebody wanted this.',
  choices: [
    { text: 'Sweep a path', hint: 'time; safe',
      do(s, c) { X.delay(s, c, 0.5); X.fatigueAll(s, c, 10); X.noise(s, c, 6);
        return 'Two shovels, a piece of plywood and forty minutes gets you a clean lane the width of the wagon. Whoever laid the glass does not appear.'; } },
    { text: 'Drive over it slowly', hint: 'tire risk',
      do(s, c) { X.wear(s, c, 'tires', 18);
        if (ZT.roll(s, 0.35)) { X.breakdown(s, c, 'tires'); return 'You get about sixty feet before a tire starts hissing and then stops hissing, because it has nothing left to hiss with.'; }
        return 'A very slow, very loud crunch that lasts three minutes. The tires hold. This time.'; } },
    { text: 'Go around through the ditch', hint: 'body damage',
      do(s, c) { X.wear(s, c, 'body', 12); X.wear(s, c, 'tires', 4);
        if (ZT.roll(s, 0.2)) { X.delay(s, c, 0.5); X.fatigueAll(s, c, 12); return 'The wagon goes into the ditch at an angle it does not care for and stays there until everyone pushes.'; }
        return 'Down into the ditch, along fifty yards of mud, and back up. The undercarriage takes a beating and the tires do not.'; } },
  ],
},
{
  id: 'road_church', cat: 'road', weight: 4, regions: ['sandhills', 'powder', 'snake', 'divide'], art: 'church',
  text: 'A white clapboard church with the door propped open and a hand-lettered sign: WATER INSIDE. TAKE WHAT YOU NEED. LEAVE THE REST.',
  choices: [
    { text: 'Go in', hint: 'supplies; trust',
      do(s, c) { X.delay(s, c, 0.3);
        if (ZT.roll(s, 0.8)) { X.loot(s, c, 0.8, 'food'); X.morale(s, c, 6); for (const m of ZT.State.alive(s)) X.heal(s, c, m, 4);
          return 'Barrels of rainwater, shelves of canned goods, a ledger where people have written what they took and what they left. You add a line to it.'; }
        const m = someone(s); X.injure(s, c, m, 12); X.noise(s, c, 8);
        return `The shelves are bare and there is a reason nobody restocked them. ${m.name} gets out of the vestry with a bad scrape and a good story.`; } },
    { text: 'Leave something and go', hint: 'costs food; morale',
      show: (s) => s.inv.food > 50,
      do(s, c) { X.take(s, c, 'food', 10); X.morale(s, c, 8); return 'You add ten pounds of rice to the shelf and sign the ledger and do not take anything. There is not much argument about it in the car afterward.'; } },
    { text: 'Drive on', hint: '', do() { return 'The door stands open in the mirror for a long time.'; } },
  ],
},
{
  id: 'road_argument', cat: 'road', weight: 5, cond: (s) => ZT.Party.avgFatigue(s) > 45 && ZT.State.aliveCount(s) >= 3, art: 'figures',
  text: (s) => { const a = someone(s), b = X.other(s, a); return `${a.name} and ${b.name} have been arguing since breakfast about rationing, and it has stopped being about rationing.`; },
  choices: [
    { text: 'Side with one of them', hint: 'decisive; costly',
      do(s, c) { const a = someone(s), b = X.other(s, a); X.moraleM(s, c, a, 8); X.moraleM(s, c, b, -12);
        return `You back ${a.name}. It ends the argument in about four seconds and leaves ${b.name} looking at the road with a jaw set like a bad weld.`; } },
    { text: 'Stop the car and let them finish it', hint: 'time; clears the air',
      do(s, c) { X.delay(s, c, 0.3);
        if (ZT.roll(s, 0.7)) { X.morale(s, c, 6); X.fatigueAll(s, c, -4); return 'Twenty minutes of shouting by the roadside and then, unexpectedly, laughing. Everyone gets back in and it is better.'; }
        X.morale(s, c, -5); const m = someone(s); X.injure(s, c, m, 8); return `Twenty minutes of shouting and then somebody pushes somebody. ${m.name} comes off worse. Nobody talks until dark.`; } },
    { text: 'Change the subject to the map', hint: 'defers it',
      do(s, c) { X.morale(s, c, -1); return 'You produce the atlas and ask a technical question about county roads. It works, in the way that putting a bucket under a leak works.'; } },
  ],
},
{
  id: 'road_good_day', cat: 'road', weight: 5, cond: (s) => ZT.Party.avgMorale(s) > 40, art: 'road',
  text: 'Nothing happens all day.',
  choices: [
    { text: 'Take the miles', hint: 'good day',
      do(s, c) { s.miles = Math.round((s.miles + ZT.rint(s, 6, 14)) * 10) / 10; X.d(c, '+miles'); X.morale(s, c, 4); X.fatigueAll(s, c, -4); X.noise(s, c, -10);
        return 'Ninety miles of open road, one working radio station playing nothing, and a sunset. Nobody gets bitten, nothing breaks, and somebody remembers a joke. These days are the whole point.'; } },
  ],
},
{
  id: 'road_wrong_turn_town', cat: 'road', weight: 4, regions: ['platte', 'panhandle', 'sandhills', 'powder', 'wasatch'], art: 'town',
  text: 'The bypass is blocked and the only way through is the middle of a town. Population sign says 4,120.',
  choices: [
    { text: 'Straight through, fast', hint: 'loud but brief',
      do(s, c) { X.noise(s, c, 20); X.horde(s, c, 3); X.wear(s, c, 'body', 6);
        if (ZT.roll(s, 0.3 + ZT.Travel.threat(s) * 0.25)) { const m = someone(s); X.injure(s, c, m, 15); X.wear(s, c, 'body', 10);
          return `Four blocks of main street at fifty miles an hour with things coming off the sidewalks on both sides. One of them comes through the rear window and ${m.name} deals with it in the back seat with a jack handle.`; }
        return 'Four blocks in ninety seconds. Doors open behind you all down the street, too late.'; } },
    { text: 'Back streets at a crawl', hint: 'slow, quiet',
      do(s, c) { X.delay(s, c, 0.5); X.noise(s, c, 5); X.fatigueAll(s, c, 8);
        if (ZT.roll(s, 0.2)) { X.delay(s, c, 0.3); return 'Alleys, a school parking lot, and one dead end that costs twenty minutes of reversing. Nothing sees you.'; }
        return 'Second gear, no horn, no lights. Forty minutes to cross four blocks and worth every second of it.'; } },
    { text: 'Stop and search a block', hint: 'supplies; danger',
      do(s, c) { X.delay(s, c, 0.6); X.noise(s, c, 15); X.loot(s, c, 1.2);
        if (ZT.roll(s, 0.45 + ZT.Travel.threat(s) * 0.2)) { const m = someone(s); X.bite(s, c, m);
          return `A pharmacy, a hardware store and a house with a full pantry. On the way back to the car the street fills up behind you and ${m.name} is last through the door.`; }
        return 'A pharmacy, a hardware store and a house with a full pantry, and out again before the street knows you were there.'; } },
  ],
},

/* ================= REGIONAL ROAD ================= */
{
  id: 'road_missouri_seed_spill', cat: 'road', regions: ['missouri'], weight: 4, cool: 30, art: 'road',
  text: 'A split seed truck has covered the highway in kernels. The bags say NOT FOR HUMAN CONSUMPTION. For once, the instructions are quite clear.',
  choices: [
    { text: 'Clear a narrow path', hint: 'time and fatigue',
      do(s, c) { X.delay(s, c, 0.3); X.fatigueAll(s, c, 6); return 'A sheet of plywood makes a serviceable shovel. The road is usable again. Lunch remains a separate problem.'; } },
    { text: 'Take the gravel shoulder', hint: 'quicker; rough footing',
      do(s, c) { X.wear(s, c, 'tires', 5); X.fatigueAll(s, c, 4); return 'The shoulder is rutted but passable. Nobody suggests trying the corn.'; } },
  ],
},
{
  id: 'road_missouri_pump_ledger', cat: 'road', regions: ['missouri'], weight: 4, cool: 30, art: 'well',
  text: 'A farm pump has a notebook tied to it with baling twine. The last entry says WATER GOOD. HANDLE BITES. The handle has a very large splinter.',
  choices: [
    { text: 'Wrap the handle and fill up', hint: 'time; small recovery',
      do(s, c) { X.delay(s, c, 0.3); for (const m of ZT.State.alive(s)) X.heal(s, c, m, 3); X.morale(s, c, 2); return 'A rag around the handle, a few minutes of pumping, and water for the road. You add HANDLE STILL BITES to the notebook.'; } },
    { text: 'Keep moving', hint: 'no delay',
      do() { return 'The notebook flaps against the pump as you leave. Somebody is still keeping records.'; } },
  ],
},
{
  id: 'road_missouri_county_barricade', cat: 'road', regions: ['missouri'], weight: 4, cool: 30, art: 'sign',
  text: 'Two county barricades block the exit. Beyond them the pavement looks intact. The detour arrow points at a cornfield and has apparently resigned.',
  choices: [
    { text: 'Scout the road beyond the barricade', hint: 'time; safer',
      do(s, c) { X.delay(s, c, 0.4); X.fatigueAll(s, c, 5); return 'A washed-out culvert waits just beyond the rise. You find a farm lane around it and put the barricades back.'; } },
    { text: 'Follow the field detour', hint: 'rough ground; small injury risk',
      do(s, c) { X.wear(s, c, 'body', 6); X.fatigueAll(s, c, 6); if (ZT.roll(s, 0.2)) { const m = someone(s); X.injure(s, c, m, 8); return `${m.name} finds an irrigation rut the hard way. The arrow was technically correct.`; } return 'The lane comes out on pavement eventually. There is no sign at this end. Presumably you are meant to feel it.'; } },
  ],
},
{
  id: 'road_missouri_feed_store', cat: 'road', regions: ['missouri'], weight: 4, cool: 30, art: 'cache',
  text: 'The feed store is empty except for a locked employee cupboard. Through its mesh door you can see canned peaches. Employee morale used to matter here.',
  choices: [
    { text: 'Pry the cupboard open', hint: 'tools; time and food', show: (s) => s.inv.tools > 0,
      do(s, c) { X.delay(s, c, 0.3); X.noise(s, c, 6); X.give(s, c, 'food', 10); return 'The latch gives before the crowbar does. Peaches and crackers, with an inventory sheet that is now incorrect.'; } },
    { text: 'Force it with a rock', hint: 'food; noise and injury risk',
      do(s, c) { X.delay(s, c, 0.4); X.noise(s, c, 14); X.give(s, c, 'food', 8); if (ZT.roll(s, 0.25)) { const m = someone(s); X.injure(s, c, m, 10); return `${m.name} catches a knuckle on the mesh. Most of the peaches survive the method.`; } return 'The lock, two cans, and the silence are ruined. The remaining cans fit in the packs.'; } },
    { text: 'Leave it', hint: 'safe', do() { return 'Somebody had a very secure lunch. They still do.'; } },
  ],
},
{
  id: 'road_lava_cinder_drift', cat: 'road', regions: ['lava'], weight: 4, cool: 30, art: 'lm_lava',
  text: 'Wind has piled black cinders across the road. They look soft from a distance. Up close they look like a gravel company has a grievance.',
  choices: [
    { text: 'Clear the deepest ridge', hint: 'time and fatigue',
      do(s, c) { X.delay(s, c, 0.4); X.fatigueAll(s, c, 8); return 'A shovel-width path becomes a wagon-width path. The wind begins filling it behind you immediately.'; } },
    { text: 'Cross the drift slowly', hint: 'tires or tired feet',
      do(s, c) { if (s.vehicle.has) X.wear(s, c, 'tires', 10); else X.fatigueAll(s, c, 12); X.noise(s, c, 4); return 'The cinders crunch under you for a hundred yards. On the far side, even ordinary gravel seems civilized.'; } },
  ],
},
{
  id: 'road_owyhee_canal_gate', cat: 'road', regions: ['owyhee'], weight: 4, cool: 30, art: 'bridge',
  text: 'An irrigation gate has swung across the service road into the Boise valley. It is chained to a post. The post is not attached to the ground anymore.',
  choices: [
    { text: 'Lift the post and swing the gate', hint: 'time and effort',
      do(s, c) { X.delay(s, c, 0.3); X.fatigueAll(s, c, 7); X.noise(s, c, 4); return 'The entire security system moves six feet to the left. You put it back afterward. Standards matter.'; } },
    { text: 'Go around by the canal road', hint: 'longer; costs fuel if driving',
      do(s, c) { X.delay(s, c, 0.4); if (s.vehicle.has) X.take(s, c, 'fuel', 1); else X.fatigueAll(s, c, 8); return 'A quiet detour past dry headgates and abandoned boots. Boise remains on the same side of the horizon.'; } },
  ],
},
{
  id: 'road_bear_cattle_gate', cat: 'road', regions: ['bear'], weight: 4, cool: 30, art: 'field',
  text: 'A cattle gate cuts across the road above the Bear River. Cattle stand on both sides of it, which suggests the gate is mostly a tradition.',
  choices: [
    { text: 'Walk the herd away from the opening', hint: 'time; quiet',
      do(s, c) { X.delay(s, c, 0.4); X.fatigueAll(s, c, 6); X.noise(s, c, -4); return 'Patience and a long stick move the herd. The gate is closed behind you, for whatever good that does.'; } },
    { text: 'Rattle the gate and push through', hint: 'noise; injury risk',
      do(s, c) { X.noise(s, c, 12); if (ZT.roll(s, 0.25)) { const m = someone(s); X.injure(s, c, m, 12); return `One cow objects. ${m.name} discovers that the dead have not cornered the market on being difficult.`; } return 'The cattle scatter uphill. A few seconds later the echoes catch up and scatter them again.'; } },
  ],
},

/* ================= WEATHER / ENVIRONMENT ================= */
{
  id: 'wx_storm_shelter', cat: 'weather', weight: 8, cond: (s) => s.weather === 'storm', art: 'storm',
  text: 'The sky goes the color of a bruise and the rain arrives sideways. Visibility is about forty feet.',
  choices: [
    { text: 'Pull over and wait it out', hint: 'time; safe',
      do(s, c) { X.delay(s, c, 0.6); X.fatigueAll(s, c, -4); X.noise(s, c, -12);
        return 'Four hours in a parked car with the rain drumming on the roof loud enough to cover any other sound in the world. Nothing finds you. Nothing could.'; } },
    { text: 'Keep driving', hint: 'risk',
      do(s, c) { X.wear(s, c, 'electrical', 10); X.wear(s, c, 'body', 5); X.fatigueAll(s, c, 12);
        if (ZT.roll(s, 0.3)) { const m = someone(s); X.injure(s, c, m, 15); X.wear(s, c, 'body', 12);
          return `You find the ditch at thirty miles an hour. Getting out of it takes an hour and ${m.name} does something bad to a shoulder in the process.`; }
        return 'Two hours of driving by the white line and guesswork. The wagon is soaked inside and out and everyone\'s hands are shaking.'; } },
    { text: 'Find a barn or underpass', hint: 'shelter',
      do(s, c) { X.delay(s, c, 0.4);
        if (ZT.roll(s, 0.65)) { X.fatigueAll(s, c, -10); X.morale(s, c, 5); for (const m of ZT.State.alive(s)) X.heal(s, c, m, 3);
          return 'An underpass, dry and echoing, and a stove lit on the concrete. It is almost cozy, which is a word nobody has used in a long time.'; }
        const m = someone(s); X.sicken(s, c, m, 20); return `The barn you find has no roof left. Everyone gets soaked to the skin looking for it and ${m.name} is coughing by nightfall.`; } },
  ],
},
{
  id: 'wx_heat_engine', cat: 'weather', weight: 7, cond: (s) => s.weather === 'heat' && s.vehicle.has, art: 'heat',
  text: 'The temperature gauge is in the red and climbing and the air coming out of the vents is hotter than the air outside.',
  choices: [
    { text: 'Stop and let it cool', hint: 'half a day',
      do(s, c) { X.delay(s, c, 0.5); X.fatigueAll(s, c, 6); X.repair(s, c, 'engine', 3);
        return 'The hood goes up and everyone finds shade for three hours. The engine ticks and steams and eventually forgives you.'; } },
    { text: 'Run the heater full blast to pull heat off', hint: 'awful but effective',
      do(s, c) { X.fatigueAll(s, c, 15); for (const m of ZT.State.alive(s)) X.hurt(s, c, m, 3, 'heat');
        return 'It works. It is a hundred and twelve degrees inside the car with the heater roaring and it absolutely works.'; } },
    { text: 'Push on and hope', hint: 'engine risk',
      do(s, c) { X.wear(s, c, 'engine', 18);
        if (ZT.roll(s, 0.35)) { X.breakdown(s, c, 'engine'); return 'The gauge pegs, the engine makes a noise like a dropped toolbox, and steam comes up through the hood seams.'; }
        return 'You make it to a rise where the air moves. The gauge comes back off the peg. That was luck and everyone knows it.'; } },
  ],
},
{
  id: 'wx_fog_road', cat: 'weather', weight: 7, cond: (s) => s.weather === 'fog', art: 'fog',
  text: 'Fog thick enough that the hood ornament is a guess. Anything could be forty feet ahead. Anything is.',
  choices: [
    { text: 'Crawl with someone walking ahead', hint: 'slow; exposes a walker',
      do(s, c) { X.delay(s, c, 0.5); const m = someone(s); X.fatigue(s, c, m, 15);
        if (ZT.roll(s, 0.2 + ZT.Travel.threat(s) * 0.25)) { X.expose(s, c, m); return `${m.name} walks ahead of the bumper for two hours in the white. Something comes out of it fast and gets a hand on them before the headlights even find it.`; }
        return `${m.name} walks the white line ahead of the bumper for two hours, waving the car forward a few yards at a time. Nothing happens. It is exhausting.`; } },
    { text: 'Wait for it to lift', hint: 'time; quiet',
      do(s, c) { X.delay(s, c, 0.5); X.noise(s, c, -10); X.fatigueAll(s, c, -3);
        return 'Engine off. The fog does exactly what fog does, which is sit there for four hours and then leave all at once.'; } },
    { text: 'Drive it at normal speed', hint: 'bad idea',
      do(s, c) { if (ZT.roll(s, 0.45)) { X.wear(s, c, 'body', 15); const m = someone(s); X.injure(s, c, m, 18);
          return `You hit something. It might have been a car. It might have been a person a long time ago. The wagon comes off worse than expected and ${m.name} was not braced.`; }
        s.miles = Math.round((s.miles + 8) * 10) / 10; X.d(c, '+8 miles'); X.fatigueAll(s, c, 10);
        return 'Twenty miles of driving into a wall of white at forty miles an hour. Nothing is hit. Nobody enjoys it.'; } },
  ],
},
{
  id: 'wx_cold_night', cat: 'weather', weight: 7, cond: (s) => s.weather === 'cold' || s.weather === 'snow', art: 'cold',
  text: 'The temperature drops hard after dark and the wagon is not a warm place to be.',
  choices: [
    { text: 'Burn fuel to run the heater', hint: '2 gal',
      do(s, c) { X.take(s, c, 'fuel', 2); X.fatigueAll(s, c, -8); for (const m of ZT.State.alive(s)) X.heal(s, c, m, 4);
        return 'Idle the engine an hour at a time through the night. It costs fuel that will be missed and everyone wakes up with feeling in their feet.'; } },
    { text: 'Build a fire', hint: 'warm; visible',
      do(s, c) { X.noise(s, c, 10); X.horde(s, c, 2); X.fatigueAll(s, c, -12); X.morale(s, c, 5); for (const m of ZT.State.alive(s)) X.heal(s, c, m, 5);
        if (ZT.roll(s, 0.25 + ZT.Travel.threat(s) * 0.2)) { X.noise(s, c, 8); const m = someone(s); X.fatigue(s, c, m, 20);
          return 'A real fire, and warmth, and then a two-hour watch spent listening to something circle just outside the light.'; }
        return 'A real fire in a cinder block ring. Warmth, dry socks, and hot food. Worth the risk.'; } },
    { text: 'Everyone in the car, blankets, no fire', hint: 'cold but invisible',
      do(s, c) { for (const m of ZT.State.alive(s)) X.hurt(s, c, m, 3, 'exposure'); X.fatigueAll(s, c, 4); X.noise(s, c, -8);
        return 'Five people and every blanket in one station wagon with the windows fogged solid. Nobody sleeps well and nothing sees a light.'; } },
  ],
},
{
  id: 'wx_snow_pass', cat: 'weather', weight: 8, cond: (s) => s.weather === 'snow', regions: ['bear', 'laramie', 'powder', 'divide'], art: 'snow',
  text: 'Four inches of snow on the road and more coming. The tracks ahead of you fill in as you watch.',
  choices: [
    { text: 'Push through while it is shallow', hint: 'now or never',
      do(s, c) { X.take(s, c, 'fuel', 2); X.wear(s, c, 'tires', 10); X.fatigueAll(s, c, 10);
        if (ZT.roll(s, 0.3)) { X.delay(s, c, 0.5); X.fatigueAll(s, c, 15); return 'You get stuck twice and dig out twice, and gain about eleven miles for a day of work.'; }
        return 'You keep the wheels turning and the momentum up and get through it before it gets deep. Barely.'; } },
    { text: 'Camp and wait it out', hint: 'days; cold',
      do(s, c) { const d = ZT.rint(s, 1, 3); for (let i = 0; i < d; i++) ZT.Travel.restDay(s); X.d(c, `+${d} ${ZT.plural(d, 'day')}`); X.take(s, c, 'fuel', 1);
        return `${d === 1 ? 'A day' : d + ' days'} in a dug-in camp under a tarp. It stops. It always stops. The question was only what it costs to wait.`; } },
    { text: 'Chain up with what you have', hint: 'tools; better traction',
      show: (s) => s.inv.tools > 0,
      do(s, c) { X.delay(s, c, 0.3); X.fatigueAll(s, c, 8);
        if (ZT.roll(s, 0.7)) { X.wear(s, c, 'tires', 4); s.miles = Math.round((s.miles + 10) * 10) / 10; X.d(c, '+10 miles');
          return 'Chain, cable and wire twisted around the drive tires by hand. It looks insane and it works, and you make miles in weather that should have stopped you.'; }
        X.take(s, c, 'tools', 1); X.wear(s, c, 'tires', 12); return 'The improvised chains come apart at speed and take a strip out of a fender and most of the tool kit goes into a snowbank in the confusion.'; } },
  ],
},
{
  id: 'wx_clear_run', cat: 'weather', weight: 5, cond: (s) => s.weather === 'clear', art: 'road',
  text: 'A clear cold morning with the road dry and the light long. The wagon is running better than it has any right to.',
  choices: [
    { text: 'Make the most of it', hint: 'miles',
      do(s, c) { s.miles = Math.round((s.miles + ZT.rint(s, 8, 16)) * 10) / 10; X.d(c, '+miles'); X.morale(s, c, 4);
        return 'You do not stop for anything. Free miles on a good road happen about twice a month now and everyone knows to take them.'; } },
    { text: 'Stop and dry everything out', hint: 'health',
      do(s, c) { X.delay(s, c, 0.4); for (const m of ZT.State.alive(s)) { X.heal(s, c, m, 6); if (m.illness > 0) m.illness = Math.max(0, m.illness - 12); }
        X.morale(s, c, 6); return 'Every wet thing in the wagon comes out onto the hood and the fenders for three hours. Dry blankets change a person\'s whole outlook.'; } },
  ],
},
{
  id: 'wx_dust_storm', cat: 'weather', weight: 6, regions: ['powder', 'divide', 'snake', 'owyhee', 'lava'], cond: (s) => s.weather === 'heat' || s.weather === 'clear', art: 'dust',
  text: 'A brown wall stands across the whole horizon, moving. It is coming faster than anything should move.',
  choices: [
    { text: 'Run west ahead of it', hint: 'fuel, speed',
      do(s, c) { X.take(s, c, 'fuel', 3); X.wear(s, c, 'engine', 6); X.fatigueAll(s, c, 10);
        if (ZT.roll(s, 0.55)) { s.miles = Math.round((s.miles + 15) * 10) / 10; X.d(c, '+15 miles'); return 'Forty minutes flat out with a brown wall in the mirror, and then it turns north and lets you go.'; }
        for (const m of ZT.State.alive(s)) X.sicken(s, c, m, 12); X.wear(s, c, 'engine', 8);
        return 'It catches you anyway, at speed, and drives grit into the engine and everyone\'s lungs at once.'; } },
    { text: 'Stop, seal up, and sit', hint: 'safe; time',
      do(s, c) { X.delay(s, c, 0.5); X.wear(s, c, 'engine', 2);
        return 'Nose downwind, vents taped, wet rags along the door seams. An hour of the car being sandblasted and then it is over and the light comes back orange.'; } },
  ],
},
{
  id: 'wx_rain_gift', cat: 'weather', weight: 5, cond: (s) => s.weather === 'rain', art: 'rain',
  text: 'Steady rain, all day, the kind that has no drama in it at all.',
  choices: [
    { text: 'Catch water', hint: 'health; time',
      do(s, c) { X.delay(s, c, 0.3); for (const m of ZT.State.alive(s)) { X.heal(s, c, m, 5); X.fatigue(s, c, m, -5); } X.morale(s, c, 3);
        return 'Tarp, bucket, every empty container. Forty gallons of clean water for the cost of an afternoon, and the rain covers every sound you make while you do it.'; } },
    { text: 'Drive in it', hint: 'wear; quiet',
      do(s, c) { X.wear(s, c, 'electrical', 6); X.noise(s, c, -12); const m = someone(s); X.sicken(s, c, m, 8);
        return `Rain drowns the engine noise and keeps the roads empty of everything. Good miles, in a wet car, and ${m.name} starts sneezing around dusk.`; } },
  ],
},
{
  id: 'wx_ice', cat: 'weather', weight: 6, cond: (s) => s.weather === 'cold' && s.miles > 800, regions: ['powder', 'divide', 'laramie', 'bear'], art: 'ice',
  text: 'Freezing rain overnight has put a quarter inch of clear ice on everything, including the road, the car, and the door handles.',
  choices: [
    { text: 'Wait for the sun', hint: 'half a day',
      do(s, c) { X.delay(s, c, 0.5); X.fatigueAll(s, c, 4); return 'By noon the trees are dripping and the road is only wet. Half a day is a cheap price for not going off a bank.'; } },
    { text: 'Drive it very carefully', hint: 'risk',
      do(s, c) { X.fatigueAll(s, c, 12);
        if (ZT.roll(s, 0.4)) { X.wear(s, c, 'body', 15); X.delay(s, c, 0.5); const m = someone(s); X.injure(s, c, m, 10);
          return `Twelve miles of walking-pace driving and then a slow, dreamlike slide into a fence post that nobody can prevent. ${m.name} bangs a knee. The wagon bends a fender.`; }
        return 'Twelve miles at fifteen miles an hour with everyone silent and braced. No one goes off the road, which is not the same as no one nearly going off the road.'; } },
  ],
},
{
  id: 'wx_wind_plains', cat: 'weather', weight: 5, regions: ['powder', 'divide', 'snake', 'owyhee', 'lava'], art: 'wind',
  text: 'The wind on the flats is a constant hand pushing the wagon sideways, and it does not stop for eleven hours.',
  choices: [
    { text: 'Fight it', hint: 'fuel, fatigue',
      do(s, c) { X.take(s, c, 'fuel', 2); X.fatigueAll(s, c, 14); return 'The driver holds a constant fifteen degrees of steering correction all day. It costs fuel, arms, and most of everyone\'s good humor.'; } },
    { text: 'Wait for evening when it drops', hint: 'time',
      do(s, c) { X.delay(s, c, 0.4); X.noise(s, c, -6); return 'You sit out the worst of it in the lee of a grain elevator. Around six, as promised by nobody, the wind quits all at once.'; } },
  ],
},
]);
})();
