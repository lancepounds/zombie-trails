/* ZOMBIE TRAILS — event content: the wagon, and the bodies inside it */
'use strict';
(function () {
const X = ZT.X;
const someone = (s) => X.someone(s);

ZT.Events.add([
/* ================= VEHICLE ================= */
{
  id: 'v_missouri_cottonwood_filter', cat: 'vehicle', regions: ['missouri'], weight: 5, cool: 30,
  cond: (s) => s.vehicle.has, art: 'hood',
  text: 'The grille has collected a felt blanket of cottonwood fluff. The wagon is trying to breathe through Nebraska.',
  choices: [
    { text: 'Stop and clean the grille', hint: 'time; small repair',
      do(s, c) { X.delay(s, c, 0.3); X.repair(s, c, 'engine', 5); X.fatigueAll(s, c, 4); return 'A brush, a stick, and a surprising volume of fluff. The temperature needle settles. The tree owes you an afternoon.'; } },
    { text: 'Keep driving until the next stop', hint: 'engine wear',
      do(s, c) { X.wear(s, c, 'engine', 10); if (ZT.roll(s, 0.2)) { X.delay(s, c, 0.3); X.fatigueAll(s, c, 6); return 'The needle reaches the red before the next stop. You clean the grille beside the road anyway, with added steam.'; } return 'The wagon runs hot all afternoon. The fluff gets to travel west for free.'; } },
  ],
},
{
  id: 'v_laramie_roof_lashings', cat: 'vehicle', regions: ['laramie'], weight: 5, cool: 30,
  cond: (s) => s.vehicle.has, art: 'underneath',
  text: 'On a Laramie Range climb, the roof load shifts with a scrape. A cord trails past the window. Nobody remembers leaving that much spare cord.',
  choices: [
    { text: 'Stop and retie the load', hint: 'time and fatigue',
      do(s, c) { X.delay(s, c, 0.4); X.fatigueAll(s, c, 6); X.repair(s, c, 'body', 4); return 'The knots are redone out of the wind. The roof rack is tightened. Everyone agrees the last knots belonged to someone else.'; } },
    { text: 'Replace the rack clamp', hint: '1 part; quicker', show: (s) => s.inv.parts >= 1,
      do(s, c) { X.take(s, c, 'parts', 1); X.delay(s, c, 0.2); X.repair(s, c, 'body', 12); return 'A spare clamp fits after a little persuasion. The load is secure enough to become somebody else\'s worry: gravity\'s.'; } },
    { text: 'Keep driving to lower ground', hint: 'body damage; supply risk',
      do(s, c) { X.wear(s, c, 'body', 9); X.noise(s, c, 6); if (ZT.roll(s, 0.35)) { X.take(s, c, 'food', 12); return 'A food sack goes over the side and down a slope that nobody volunteers to climb. The rest stays put.'; } return 'The load slides another inch and stops. Lower ground arrives before the next inch does.'; } },
  ],
},
{
  id: 'v_overheat_warn', cat: 'vehicle', weight: 7, cond: (s) => s.vehicle.has && s.vehicle.engine < 70, art: 'hood',
  text: 'Steam. Not a lot of it, but it is coming from under the hood and it was not doing that this morning.',
  choices: [
    { text: 'Stop and top up the coolant', hint: 'half a day',
      do(s, c) { X.delay(s, c, 0.4); X.repair(s, c, 'engine', 8);
        return 'A hose clamp and two gallons of creek water through a funnel. It will do. It has to.'; } },
    { text: 'Ignore it', hint: 'risk',
      do(s, c) { X.wear(s, c, 'engine', 14);
        if (ZT.roll(s, 0.35)) { X.breakdown(s, c, 'engine'); return 'The steam becomes a plume and then the temperature gauge becomes irrelevant, because the engine has stopped.'; }
        return 'The steam stops on its own after an hour, which nobody trusts and everybody accepts.'; } },
    { text: 'Use a spare part on it now', hint: '1 part', show: (s) => s.inv.parts > 0,
      do(s, c) { return ZT.Vehicle.repairWithParts(s, c, 'engine'); } },
  ],
},
{
  id: 'v_flat_slow', cat: 'vehicle', weight: 6, cond: (s) => s.vehicle.has, art: 'tire',
  text: 'The wagon has started pulling left, and a walk around it finds a rear tire going down slowly.',
  choices: [
    { text: 'Plug it', hint: 'tools help',
      do(s, c) { X.delay(s, c, 0.3); X.noise(s, c, 4);
        if (s.inv.tools > 0 || ZT.roll(s, 0.5)) { X.repair(s, c, 'tires', 12); return 'A plug, a hand pump, and twenty minutes. The tire holds air. Everyone is quietly delighted about a tire.'; }
        X.wear(s, c, 'tires', 8); return 'No plug kit. A wad of rubber cement and a prayer, and the tire is soft again in nine miles.'; } },
    { text: 'Change to the spare', hint: 'uses a part', show: (s) => s.inv.parts > 0,
      do(s, c) { return ZT.Vehicle.repairWithParts(s, c, 'tires'); } },
    { text: 'Drive on it', hint: 'bad idea',
      do(s, c) { X.wear(s, c, 'tires', 20);
        if (ZT.roll(s, 0.5)) { X.breakdown(s, c, 'tires'); return 'Eleven miles later the tire comes apart at speed and takes a piece of the wheel arch with it.'; }
        return 'It goes down slowly enough to make forty more miles before it needs dealing with. This is not skill. This is luck.'; } },
  ],
},
{
  id: 'v_battery', cat: 'vehicle', weight: 6, cond: (s) => s.vehicle.has && s.vehicle.electrical < 65, art: 'hood',
  text: 'The wagon turns over slowly this morning. Slowly, then slower, and then it catches on the last of it.',
  choices: [
    { text: 'Park on hills from now on', hint: 'free; annoying',
      do(s, c) { s.flags.hillStart = true; X.morale(s, c, -2);
        return 'From now on the car is parked facing downhill wherever possible and everyone gets very good at push-starting a station wagon. It is not a repair. It works.'; } },
    { text: 'Clean the terminals and charge it', hint: 'time',
      do(s, c) { X.delay(s, c, 0.3); X.repair(s, c, 'electrical', 12);
        return 'Wire brush, a bit of grease, and half an hour of running the engine at high idle. The next start is better.'; } },
    { text: 'Trade for a battery next chance', hint: '', show: (s) => s.inv.goods > 0,
      do(s, c) { X.take(s, c, 'goods', 2); X.repair(s, c, 'electrical', 25); X.delay(s, c, 0.4);
        return 'Two lots of trade goods to a man with a barn full of dead cars, and a battery that holds a charge. Cheap at the price.'; } },
  ],
},
{
  id: 'v_noise_underneath', cat: 'vehicle', weight: 6, cond: (s) => s.vehicle.has, art: 'underneath', cool: 25,
  text: 'There is a new noise from underneath. Nobody can agree on whether it is a clunk or a grinding, or whether it changes with speed, or whether it was there yesterday.',
  choices: [
    { text: 'Get underneath and look', hint: 'time; may find it',
      do(s, c) { X.delay(s, c, 0.4); X.fatigueAll(s, c, 6);
        if (ZT.roll(s, X.p(s, 0.6, 'mechanic', 0.25))) { X.repair(s, c, 'body', 10); X.repair(s, c, 'engine', 4);
          return 'An exhaust hanger that has rusted through, dragging the pipe on the crossmember. Wired up with a coat hanger in fifteen minutes. That is the whole mystery.'; }
        return 'Forty minutes on gravel under a car and no conclusion. The noise is still there. It is somebody else\'s turn to worry about it.'; } },
    { text: 'Turn the radio up', hint: 'free',
      do(s, c) { X.wear(s, c, 'body', 6); X.morale(s, c, 1);
        if (ZT.roll(s, 0.25)) { X.breakdown(s, c, 'body'); return 'The noise gets louder over two days and then becomes a very different noise, at which point the wagon stops.'; }
        return 'The noise becomes part of the car\'s personality. Everyone stops hearing it within a day.'; } },
  ],
},
{
  id: 'v_windshield', cat: 'vehicle', weight: 5, cond: (s) => s.vehicle.has, art: 'glass',
  text: 'A rock off a truck tire, or something thrown, or something that fell. The windshield now has a crack across it from corner to corner.',
  choices: [
    { text: 'Tape it and carry on', hint: 'free',
      do(s, c) { X.wear(s, c, 'body', 5);
        return 'Duct tape in a long X across the outside. Visibility is worse and the glass is not going anywhere for now.'; } },
    { text: 'Knock it out entirely', hint: 'cold and loud; no glass to fail',
      do(s, c) { X.repair(s, c, 'body', 5); X.noise(s, c, 6); X.fatigueAll(s, c, 6); s.flags.noWindshield = true;
        return 'Out it comes, in one piece, into the ditch. From now on it is goggles, wind, bugs, and the ability to hear everything on the road. Opinions in the wagon are divided.'; } },
    { text: 'Find a replacement from a wreck', hint: 'time; scavenge',
      do(s, c) { X.delay(s, c, 0.5); X.noise(s, c, 8);
        if (ZT.roll(s, 0.45)) { X.repair(s, c, 'body', 12); return 'Two hours in a wrecking yard and a windshield out of a wagon of the same generation, fitted with soap and swearing. It looks factory.'; }
        X.wear(s, c, 'body', 3); return 'Two hours in a wrecking yard produces one cracked windshield and a lot of cut fingers. You keep the tape.'; } },
  ],
},
{
  id: 'v_stuck_mud', cat: 'vehicle', weight: 6, cond: (s) => s.vehicle.has && (s.weather === 'rain' || s.weather === 'storm' || s.weather === 'snow'), art: 'mud',
  text: 'The shoulder gives way and the wagon settles into it up to the axle.',
  choices: [
    { text: 'Everyone pushes', hint: 'fatigue',
      do(s, c) { X.fatigueAll(s, c, 20); X.delay(s, c, 0.4); X.noise(s, c, 8);
        if (ZT.roll(s, 0.7)) return 'Boards under the wheels, four people on the back, and one long horrible minute of wheel spin before it comes out.';
        X.delay(s, c, 0.5); X.fatigueAll(s, c, 12); return 'An hour of pushing digs it in deeper. Then another hour of digging, and boards, and then it comes out.'; } },
    { text: 'Winch it off a tree', hint: 'tools', show: (s) => s.inv.tools > 0,
      do(s, c) { X.delay(s, c, 0.3); X.fatigueAll(s, c, 8);
        if (ZT.roll(s, 0.85)) return 'A come-along, a tow strap and a fence post that turns out to be set in concrete. Out in twenty minutes.';
        X.take(s, c, 'tools', 1); X.wear(s, c, 'body', 8); return 'The strap breaks under load and takes a taillight off on its way past. The tool kit is somewhere in the mud now.'; } },
    { text: 'Unload the wagon first', hint: 'slow; safer',
      do(s, c) { X.delay(s, c, 0.5); X.fatigueAll(s, c, 12); X.noise(s, c, 4);
        if (ZT.roll(s, 0.9)) return 'Everything out onto a tarp, the wagon comes out light and easy, and everything goes back in. Slow and completely reliable.';
        X.take(s, c, 'food', 8); return 'Everything out, the wagon comes out easily, and in the reloading a sack of cornmeal is left sitting in the mud.'; } },
  ],
},
{
  id: 'v_fuel_leak', cat: 'vehicle', weight: 5, cond: (s) => s.vehicle.has && s.inv.fuel > 3, art: 'underneath',
  text: 'The smell of gasoline in the car has been getting stronger for an hour and there is a wet line down the road behind you.',
  choices: [
    { text: 'Stop immediately and patch it', hint: 'saves fuel',
      do(s, c) { X.delay(s, c, 0.3); X.take(s, c, 'fuel', 2);
        if (ZT.roll(s, X.p(s, 0.7, 'mechanic', 0.2))) { X.repair(s, c, 'body', 5); return 'A pinhole in the tank seam, plugged with a self-tapping screw and a rubber washer. Two gallons lost. It could have been all of it.'; }
        X.take(s, c, 'fuel', 5); return 'The leak is in the filler neck where nobody can reach it. Seven gallons on the road before it is finally stopped with epoxy and hope.'; } },
    { text: 'Drive to the next stop', hint: 'loses fuel',
      do(s, c) { X.take(s, c, 'fuel', ZT.rint(s, 4, 9));
        return 'You keep going and lose fuel the whole way, and the whole way the inside of the car smells like a filling station.'; } },
    { text: 'Transfer fuel into cans', hint: 'time; saves most',
      do(s, c) { X.delay(s, c, 0.4); X.take(s, c, 'fuel', 1); X.fatigueAll(s, c, 6);
        return 'Everything out of the tank and into every container in the car, by hose and gravity and patience. Almost nothing is lost except an afternoon.'; } },
  ],
},
{
  id: 'v_good_find_parts', cat: 'vehicle', weight: 5, art: 'wreckyard',
  text: 'A wrecking yard, three acres of it, chain link fence intact. Someone padlocked the gate on their way out of the world.',
  choices: [
    { text: 'Go over the fence and strip what you can', hint: 'parts; time',
      do(s, c) { X.delay(s, c, 0.6); X.noise(s, c, 10); X.fatigueAll(s, c, 10);
        const n = ZT.rint(s, 1, 3);
        X.give(s, c, 'parts', n); if (ZT.roll(s, 0.3)) X.give(s, c, 'tools', 1); X.give(s, c, 'fuel', ZT.rint(s, 1, 5));
        if (ZT.roll(s, 0.25)) { const m = someone(s); X.injure(s, c, m, 12); return `Three hours of work with hand tools and everything the wagon has been missing. ${m.name} puts a hand through a rusted panel doing it.`; }
        return 'Three hours of work and the back of the wagon fills with belts, hoses, a starter, and a wheel that is nearly the right size.'; } },
    { text: 'Look for a better vehicle', hint: 'unlikely; interesting',
      show: (s) => !s.vehicle.has || ZT.Vehicle.overall(s) < 40,
      do(s, c) { X.delay(s, c, 0.7); X.noise(s, c, 12);
        if (ZT.roll(s, 0.4)) { X.gainVehicle(s, c, ZT.pick(s, ['pickup truck', 'panel van', 'four-door sedan', 'suburban wagon'])); X.morale(s, c, 10);
          return 'Four hours of trying keys in doors and one of them turns. It runs. It actually runs.'; }
        X.give(s, c, 'parts', 1); return 'Nothing in three acres will start. You take what parts come loose and go back to the car you have.'; } },
    { text: 'Quick pass for tools only', hint: 'fast',
      do(s, c) { X.delay(s, c, 0.25); X.noise(s, c, 5);
        if (ZT.roll(s, 0.6)) { X.give(s, c, 'tools', 1); return 'The office had a bench and the bench had drawers and the drawers had most of a socket set in them.'; }
        return 'The office is stripped bare. Somebody came over this fence before you did.'; } },
  ],
},
{
  id: 'v_alternator_choice', cat: 'vehicle', weight: 5, cond: (s) => s.vehicle.has && s.vehicle.electrical < 50, art: 'hood',
  text: 'The lights dim every time the engine drops to idle. The alternator is on its way out, and when it goes it will take the battery with it.',
  choices: [
    { text: 'Fix it with a spare part', hint: '1 part', show: (s) => s.inv.parts > 0,
      do(s, c) { return ZT.Vehicle.repairWithParts(s, c, 'electrical'); } },
    { text: 'Run without lights or radio', hint: 'free; no night driving',
      do(s, c) { s.flags.noNightDriving = true; X.repair(s, c, 'electrical', 8); X.morale(s, c, -3);
        return 'Everything electrical goes off except the ignition. The battery stops draining. Night driving is now out of the question.'; } },
    { text: 'Push on and let it fail', hint: 'risk',
      do(s, c) { X.wear(s, c, 'electrical', 15);
        if (ZT.roll(s, 0.45)) { X.breakdown(s, c, 'electrical'); return 'It fails at the worst available moment, which is on a hill, at dusk, with something in the road.'; }
        return 'It holds. It has no business holding, and it holds.'; } },
  ],
},
{
  id: 'v_brakes', cat: 'vehicle', weight: 5, cond: (s) => s.vehicle.has && ZT.Vehicle.overall(s) < 70, art: 'tire',
  text: 'The brake pedal is going closer to the floor every day and the wagon pulls hard right when it stops.',
  choices: [
    { text: 'Bleed and adjust them', hint: 'time; tools help',
      do(s, c) { X.delay(s, c, 0.4);
        if (s.inv.tools > 0 || ZT.roll(s, 0.5)) { X.repair(s, c, 'body', 12); X.repair(s, c, 'tires', 5); return 'Two hours, a length of tubing, a jar, and somebody pumping the pedal on command. The pedal comes back up where it belongs.'; }
        return 'Two hours of guessing and the pedal is exactly where it was. Everyone agrees to brake earlier from now on.'; } },
    { text: 'Drive around the problem', hint: 'free; risky',
      do(s, c) { s.flags.badBrakes = true; X.wear(s, c, 'body', 5);
        if (ZT.roll(s, 0.3)) { X.wear(s, c, 'body', 15); const m = someone(s); X.injure(s, c, m, 12); return 'Braking early works right up until the moment something is in the road that was not there a second ago.'; }
        return 'Everyone learns to brake fifty yards earlier than instinct says. It becomes normal within a day.'; } },
  ],
},
{
  id: 'v_siphon_own', cat: 'vehicle', weight: 4, cond: (s) => s.vehicle.has && s.inv.fuel < 6, art: 'fuel',
  text: 'The gauge is on the wrong side of E. There are parked cars visible from here and most of them still have tanks.',
  choices: [
    { text: 'Siphon what you can find', hint: 'fuel; time and noise',
      do(s, c) { X.delay(s, c, 0.5); X.noise(s, c, 10); const got = ZT.rint(s, 2, 7) * ZT.DIFF[s.difficulty].salvage; X.give(s, c, 'fuel', got);
        if (ZT.roll(s, 0.25)) { const m = someone(s); X.sicken(s, c, m, 15); return `Six cars and a hose. ${m.name} gets a mouthful of gasoline and spends the evening being sick behind a fence, but the tank is not empty.`; }
        return 'Six cars, one hose and a lot of patience. Most tanks are dry. Two are not.'; } },
    { text: 'Drill the tanks', hint: 'faster; wasteful', show: (s) => s.inv.tools > 0,
      do(s, c) { X.delay(s, c, 0.3); X.noise(s, c, 14); X.give(s, c, 'fuel', ZT.rint(s, 3, 9) * ZT.DIFF[s.difficulty].salvage);
        return 'A drill bit through the bottom of each tank and a pan underneath. Fast, loud, and it wastes about a third of what comes out.'; } },
  ],
},
{
  id: 'v_lost_wagon_walk', cat: 'vehicle', weight: 7, cond: (s) => !s.vehicle.has, art: 'walking',
  text: 'On foot, everything is different. The packs are too heavy, the miles are too long, and every farmhouse looks like it might have a truck behind it.',
  choices: [
    { text: 'Check the farmhouses', hint: 'a vehicle, maybe',
      do(s, c) { X.delay(s, c, 0.5); X.noise(s, c, 8); X.fatigueAll(s, c, 10);
        if (ZT.roll(s, 0.35)) { X.gainVehicle(s, c, ZT.pick(s, ['farm truck', 'flatbed', 'work van', 'old sedan'])); X.morale(s, c, 15);
          return 'The third barn has a truck in it up on blocks with the keys on a nail by the door. It takes an hour and it starts.'; }
        X.loot(s, c, 0.6); return 'Three farmhouses, no vehicles, but a working hand pump and a root cellar that has not been touched.'; } },
    { text: 'Keep walking west', hint: 'miles; fatigue',
      do(s, c) { X.fatigueAll(s, c, 12); s.miles = Math.round((s.miles + ZT.rint(s, 3, 8)) * 10) / 10; X.d(c, '+miles');
        return 'Walking. Just walking, at three miles an hour, with the road going on ahead exactly as far as it did an hour ago.'; } },
  ],
},

/* ================= HEALTH / ILLNESS / INFECTION ================= */
{
  id: 'h_missouri_wet_boots', cat: 'health', regions: ['missouri'], weight: 4, cool: 30, art: 'sick',
  setup(s, c) { c.m = someone(s); },
  text: (s, c) => `${c.m.name} has had wet boots since crossing a drainage ditch. Every step now comes with a private negotiation.`,
  choices: [
    { text: 'Stop and dry the boots properly', hint: 'time; avoids worse injury',
      do(s, c) { X.delay(s, c, 0.4); X.injure(s, c, c.m, 3); X.fatigue(s, c, c.m, -5); return `${c.m.name} sits with bare feet while the socks dry. The boots smell worse. Walking feels better.`; } },
    { text: 'Use dressings from the medicine kit', hint: '1 kit; quick', show: (s) => s.inv.medicine >= 1,
      do(s, c) { X.take(s, c, 'medicine', 1); X.heal(s, c, c.m, 4); X.fatigue(s, c, c.m, -4); return 'Clean dressings and dry foot wraps buy a comfortable afternoon. The kit is a little emptier.'; } },
    { text: 'Keep moving', hint: 'injury and fatigue',
      do(s, c) { X.injure(s, c, c.m, 14); X.fatigue(s, c, c.m, 12); return `${c.m.name} stops mentioning the boots. The limp continues the conversation.`; } },
  ],
},
{
  id: 'h_missouri_grain_dust', cat: 'health', regions: ['missouri'], weight: 4, cool: 30, art: 'sick',
  setup(s, c) { c.m = someone(s); },
  text: (s, c) => `Wind shakes grain dust from a torn storage bag beside the road. ${c.m.name} has been coughing since you passed it.`,
  choices: [
    { text: 'Rest out of the dust', hint: 'time; mild illness',
      do(s, c) { X.delay(s, c, 0.4); X.sicken(s, c, c.m, 5); X.fatigue(s, c, c.m, -6); return `${c.m.name} rests in clean air until the coughing eases. Nothing useful happens for a while. It is still useful.`; } },
    { text: 'Use medicine and take a short break', hint: '1 kit', show: (s) => s.inv.medicine >= 1,
      do(s, c) { X.take(s, c, 'medicine', 1); X.delay(s, c, 0.2); X.heal(s, c, c.m, 3); return 'A kit is opened and the road waits. By the time you move on, breathing sounds like breathing again.'; } },
    { text: 'Push on through it', hint: 'illness and fatigue',
      do(s, c) { X.sicken(s, c, c.m, 18); X.fatigue(s, c, c.m, 10); return `${c.m.name} makes the miles and spends the evening coughing them back up.`; } },
  ],
},
{
  id: 'h_lava_heel_blister', cat: 'health', regions: ['lava'], weight: 4, cool: 30, art: 'sick',
  setup(s, c) { c.m = someone(s); },
  text: (s, c) => `A piece of volcanic grit has worn through ${c.m.name}'s sock. The stone is small. Its ambitions are not.`,
  choices: [
    { text: 'Stop and pad the boot', hint: 'time; minor injury',
      do(s, c) { X.delay(s, c, 0.3); X.injure(s, c, c.m, 4); X.fatigue(s, c, c.m, -4); return 'The grit comes out, a folded strip of cloth goes in, and the road becomes tolerable again.'; } },
    { text: 'Use a sterile dressing', hint: '1 kit; quick', show: (s) => s.inv.medicine >= 1,
      do(s, c) { X.take(s, c, 'medicine', 1); X.heal(s, c, c.m, 4); return `${c.m.name} can put weight on the heel again. A very small stone has consumed a very useful dressing.`; } },
    { text: 'Keep moving', hint: 'injury; lost stamina',
      do(s, c) { X.injure(s, c, c.m, 16); X.fatigue(s, c, c.m, 12); return `${c.m.name} changes the way they walk. By dusk the other leg has a complaint too.`; } },
  ],
},
{
  id: 'h_bad_water', cat: 'health', weight: 7, art: 'sick',
  text: (s) => { const m = someone(s); return `${m.name} has been sick since the middle of the night. So has whoever drank from the same jug.`; },
  setup(s, c) { c.m = someone(s); },
  choices: [
    { text: 'Rest a day and push fluids', hint: '1 day',
      do(s, c) { ZT.Travel.restDay(s); X.d(c, '+1 day'); X.sicken(s, c, c.m, 10); X.heal(s, c, c.m, 5);
        return 'A day in the shade with boiled water and salt. By evening it is keeping down, more or less.'; } },
    { text: 'Use medicine', hint: '1 kit', show: (s) => s.inv.medicine > 0,
      do(s, c) { X.sicken(s, c, c.m, 20); const t = ZT.Party.treat(s, c.m); X.d(c, '-1 medicine'); return 'Rehydration salts and antibiotics. ' + t; } },
    { text: 'Keep driving and hope it passes', hint: 'free; risky',
      do(s, c) { X.sicken(s, c, c.m, 30); X.fatigue(s, c, c.m, 20); X.morale(s, c, -3);
        return `${c.m.name} spends the day with a bucket and the window down. It does not pass. Not today.`; } },
    { text: 'Boil everything from now on', hint: 'fuel; prevents more',
      do(s, c) { X.take(s, c, 'fuel', 1); X.sicken(s, c, c.m, 15); s.flags.boilWater = true;
        return 'Every drop gets boiled from now on, which costs fuel and time and will save somebody\'s life at some point without anyone ever knowing it.'; } },
  ],
},
{
  id: 'h_exhaustion', cat: 'health', weight: 7, cond: (s) => ZT.Party.avgFatigue(s) > 60, art: 'sick',
  text: 'Everyone is running on nothing. The driver has been drifting across the center line all afternoon and the argument about it was too tired to become a fight.',
  choices: [
    { text: 'Stop for two days', hint: 'food; real recovery',
      do(s, c) { ZT.Travel.restDay(s); ZT.Travel.restDay(s); X.d(c, '+2 days'); X.fatigueAll(s, c, -20); X.morale(s, c, 6);
        return 'Two days of doing nothing in a hedgerow. It costs food and it costs days and by the end of it everyone is a person again.'; } },
    { text: 'Switch to cautious pace', hint: 'slower; sustainable',
      do(s, c) { s.pace = 'cautious'; X.fatigueAll(s, c, -8); X.d(c, 'pace: cautious');
        return 'Shorter days, more stops, and the miles come off slower. It is the difference between arriving late and not arriving.'; } },
    { text: 'Push through it', hint: 'free; expensive later',
      do(s, c) { X.fatigueAll(s, c, 10);
        const m = someone(s); if (ZT.roll(s, 0.4)) { X.injure(s, c, m, 15); return `Another eleven hours. ${m.name} falls off the tailgate at a rest stop, asleep before hitting the ground, and does something bad to a wrist.`; }
        return 'Another eleven hours on nothing. It is not sustainable and everyone in the car knows it and nobody says it.'; } },
  ],
},
{
  id: 'h_infection_crisis', cat: 'health', weight: 9, cond: (s) => s.party.some((m) => m.alive && m.inf === 'symptomatic' && !m.infStable), art: 'sickbad',
  setup(s, c) { c.m = s.party.find((x) => x.alive && x.inf === 'symptomatic' && !x.infStable); },
  text: (s, c) => `${c.m.name} does not know where they are. The fever has been climbing all day and it has stopped being a question of medicine.`,
  choices: [
    { text: 'Everything you have — medicine and time', hint: 'kits and days', show: (s) => s.inv.medicine > 0,
      do(s, c) { const kits = Math.min(2, s.inv.medicine); for (let i = 0; i < kits; i++) ZT.Party.treat(s, c.m);
        X.d(c, `-${kits} medicine`); ZT.Travel.restDay(s); X.d(c, '+1 day');
        if (c.m.infStable) { X.morale(s, c, 6); return `Everything in the medical box and a night of somebody sitting up with a cloth and a cup. Around four in the morning the fever breaks. Nobody expected that.`; }
        X.morale(s, c, -4); return 'Everything in the medical box and a night of somebody sitting up with a cloth and a cup. It buys hours. It does not buy more than that.'; } },
    { text: 'Isolate them and keep driving', hint: 'protects the rest',
      do(s, c) { c.m.isolated = true; X.hurt(s, c, c.m, 8, 'infection'); X.morale(s, c, -6);
        return `${c.m.name} rides in the back with a tarp between the seats. Everybody hears everything anyway. Everybody keeps facing forward.`; } },
    { text: 'Stop and stay with them', hint: 'days; a choice about who you are',
      do(s, c) { ZT.Travel.restDay(s); ZT.Travel.restDay(s); X.d(c, '+2 days'); X.morale(s, c, 8); X.hurt(s, c, c.m, 6, 'infection');
        if (ZT.roll(s, 0.2)) { c.m.infStable = true; X.d(c, `${c.m.name} stable`); return 'Two days off the road doing nothing but this. Against every expectation, the fever comes down and stays down.'; }
        return 'Two days off the road doing nothing but this. It does not change the outcome and everyone would do it again.'; } },
  ],
},
{
  id: 'h_medic_shortage', cat: 'health', weight: 5, cond: (s) => s.inv.medicine === 0 && s.party.some((m) => m.alive && (m.injury > 20 || m.illness > 20 || m.inf !== 'none')), art: 'sick',
  text: 'The medical box is empty. Not low. Empty, down to the packaging.',
  choices: [
    { text: 'Improvise from what is in the car', hint: 'poor substitute',
      do(s, c) { X.delay(s, c, 0.3); X.take(s, c, 'goods', 1);
        const hurt = ZT.State.alive(s).filter((m) => m.injury > 0 || m.illness > 0);
        for (const m of hurt) { m.injury = Math.max(0, m.injury - 12); m.illness = Math.max(0, m.illness - 12); X.d(c, `${m.name} patched up`); }
        return 'Boiled cloth, liquor, a sewing kit, and honey out of a trade lot. It is medieval and it is better than nothing.'; } },
    { text: 'Make finding medicine the priority', hint: 'changes route',
      do(s, c) { s.flags.medHunt = true; X.take(s, c, 'fuel', 2); X.delay(s, c, 0.5);
        if (ZT.roll(s, 0.5)) { X.give(s, c, 'medicine', ZT.rint(s, 1, 2)); return 'Two hours off route to a veterinary clinic in a town nobody has heard of. Veterinary antibiotics are still antibiotics.'; }
        return 'Two hours off route to a clinic that three other groups have already been through. Nothing left but a poster about handwashing.'; } },
  ],
},
{
  id: 'h_broken_bone', cat: 'health', weight: 5, art: 'sick',
  text: (s) => { const m = someone(s); return `${m.name} came down wrong off the tailgate and something in the ankle made a sound everybody heard.`; },
  setup(s, c) { c.m = someone(s); },
  choices: [
    { text: 'Splint it properly and rest a day', hint: 'time; heals better',
      do(s, c) { X.injure(s, c, c.m, 30); ZT.Travel.restDay(s); X.d(c, '+1 day');
        if (ZT.State.hasRole(s, 'medic')) { c.m.injury = Math.max(0, c.m.injury - 15); return `${ZT.State.byRole(s, 'medic').name} sets it, splints it with a curtain rod, and is fairly confident it is a bad sprain and not a break.`; }
        return 'Two boards, a torn sheet, and a lot of guessing. It is splinted. Whether it is splinted correctly, nobody can say.'; } },
    { text: 'Use medicine and keep moving', hint: '1 kit', show: (s) => s.inv.medicine > 0,
      do(s, c) { X.injure(s, c, c.m, 30); const t = ZT.Party.treat(s, c.m); X.d(c, '-1 medicine'); return t + ' The wagon keeps rolling.'; } },
    { text: 'Wrap it and carry on', hint: 'free; worse',
      do(s, c) { X.injure(s, c, c.m, 42); X.moraleM(s, c, c.m, -6);
        return `A bandage, a boot laced tight over it, and eleven more hours of driving. ${c.m.name} does not complain, which is somehow worse.`; } },
  ],
},
{
  id: 'h_morale_low', cat: 'health', weight: 6, cond: (s) => ZT.Party.avgMorale(s) < 35, art: 'figures',
  text: 'Nobody has spoken since breakfast. The whole wagon has gone somewhere quiet and it is not a good quiet.',
  choices: [
    { text: 'Cook a proper meal', hint: 'food; morale',
      do(s, c) { X.take(s, c, 'food', 15); X.delay(s, c, 0.3); X.morale(s, c, 14); X.fatigueAll(s, c, -6);
        return 'A fire, a pot, and an hour of somebody cooking properly instead of opening cans. It is the best fifteen pounds of food anyone has ever spent.'; } },
    { text: 'Break out the trade goods', hint: '1 lot; morale', show: (s) => s.inv.goods > 0,
      do(s, c) { X.take(s, c, 'goods', 1); X.morale(s, c, 12);
        return 'A bottle of something out of the trade box, passed around by firelight, strictly against everyone\'s better judgment. In the morning there are headaches and the mood has broken.'; } },
    { text: 'Talk about where you are going', hint: 'free; uncertain',
      do(s, c) { if (ZT.roll(s, s.flags.heardBroadcast ? 0.85 : 0.5)) { X.morale(s, c, 10);
          return 'Somebody says out loud what the safe zone is supposed to be like. Somebody else adds to it. Within ten minutes there is a whole imaginary town being built in the back seat and everyone feels better.'; }
        X.morale(s, c, -5); return 'Somebody says out loud what the safe zone is supposed to be like. Somebody else asks who exactly said so, and cannot be answered, and the conversation dies badly.'; } },
    { text: 'Nothing. Keep driving.', hint: '',
      do(s, c) { X.morale(s, c, -3); X.fatigueAll(s, c, 4); return 'The wagon drives west in silence. It is a long day.'; } },
  ],
},
{
  id: 'h_toothache', cat: 'health', weight: 4, art: 'sick', cool: 40,
  text: (s) => { const m = someone(s); return `${m.name} has a tooth that has gone from a nuisance to the only thing in the world.`; },
  setup(s, c) { c.m = someone(s); },
  choices: [
    { text: 'Pull it', hint: 'grim; effective',
      do(s, c) { X.hurt(s, c, c.m, 8, 'infection'); X.fatigue(s, c, c.m, 15); X.morale(s, c, -4);
        if (s.inv.goods > 0) X.take(s, c, 'goods', 1);
        return `Pliers, whiskey, and three people holding. It takes two attempts. Afterward ${c.m.name} sleeps for eleven hours and wakes up fine.`; } },
    { text: 'Medicine and hope', hint: '1 kit', show: (s) => s.inv.medicine > 0,
      do(s, c) { X.take(s, c, 'medicine', 1); X.heal(s, c, c.m, 5); X.moraleM(s, c, c.m, 5);
        if (ZT.roll(s, 0.6)) return 'Antibiotics knock the abscess down over three days. The tooth stays in. Everyone is relieved, especially the person who was going to have to hold the pliers.';
        X.hurt(s, c, c.m, 10, 'infection'); return 'The antibiotics do not touch it. It gets worse. This is going to have to be dealt with properly.'; } },
    { text: 'Endure it', hint: 'free; miserable',
      do(s, c) { X.fatigue(s, c, c.m, 25); X.moraleM(s, c, c.m, -12); X.hurt(s, c, c.m, 6, 'infection');
        return `${c.m.name} does not sleep, does not eat, and does not talk about it. The whole wagon is worse for it within two days.`; } },
  ],
},
{
  id: 'h_good_news_health', cat: 'health', weight: 5, cond: (s) => s.party.some((m) => m.alive && (m.injury > 10 || m.illness > 10)), art: 'figures',
  text: (s) => { const m = s.party.find((x) => x.alive && (x.injury > 10 || x.illness > 10)); return `${m.name} slept through the night for the first time in a week and got up and made coffee.`; },
  choices: [
    { text: 'Good', hint: '',
      do(s, c) { const m = s.party.find((x) => x.alive && (x.injury > 10 || x.illness > 10)) || someone(s);
        m.injury = Math.max(0, m.injury - 20); m.illness = Math.max(0, m.illness - 20); X.heal(s, c, m, 10); X.morale(s, c, 6);
        return 'Bodies still do this. They still mend. It is easy to forget, and it does everyone good to be reminded.'; } },
  ],
},
{
  id: 'h_hard_choice_meds', cat: 'health', weight: 6, cond: (s) => s.inv.medicine === 1 && s.party.filter((m) => m.alive && (m.inf !== 'none' || m.injury > 25 || m.illness > 25)).length >= 2, art: 'sick',
  setup(s, c) { c.list = s.party.filter((m) => m.alive && (m.inf !== 'none' || m.injury > 25 || m.illness > 25)); },
  text: (s, c) => `There is one kit left and ${c.list.length} people who need it. Everyone is being extremely polite about it, which is the worst part.`,
  choices: [
    { text: 'Give it to the worst off', hint: '',
      do(s, c) { let worst = c.list[0]; for (const m of c.list) if (m.health < worst.health) worst = m;
        const t = ZT.Party.treat(s, worst); X.d(c, '-1 medicine'); X.morale(s, c, 2); return t; } },
    { text: 'Give it to whoever the party needs most', hint: 'cold arithmetic',
      do(s, c) { const order = ['driver', 'mechanic', 'medic', 'scout', 'generalist'];
        let best = c.list[0], bi = 99;
        for (const m of c.list) { const i = order.indexOf(m.role); if (i < bi) { bi = i; best = m; } }
        const t = ZT.Party.treat(s, best); X.d(c, '-1 medicine'); X.morale(s, c, -6);
        return t + ' Nobody says anything about how that decision was made. Everybody knows how it was made.'; } },
    { text: 'Save it', hint: 'for later; morale cost',
      do(s, c) { X.morale(s, c, -8); return 'The box goes back in the wagon unopened. It might matter more tomorrow. It is a defensible decision and it sits badly with everyone including the person who made it.'; } },
  ],
},
{
  id: 'h_hypothermia', cat: 'health', weight: 6, cond: (s) => (s.weather === 'cold' || s.weather === 'snow') && s.party.some((m) => m.alive && m.health < 60), art: 'cold',
  text: (s) => { const m = s.party.find((x) => x.alive && x.health < 60) || someone(s); return `${m.name} has stopped shivering, which everyone knows is the wrong direction for that to go.`; },
  setup(s, c) { c.m = s.party.find((x) => x.alive && x.health < 60) || someone(s); },
  choices: [
    { text: 'Burn fuel and run the heater all night', hint: '3 gal',
      do(s, c) { X.take(s, c, 'fuel', 3); X.heal(s, c, c.m, 18); X.fatigueAll(s, c, -6);
        return 'The engine idles all night with everyone packed inside. By morning there is shivering again, which is now good news, and three fewer gallons.'; } },
    { text: 'Build a fire and dry everything', hint: 'noise',
      do(s, c) { X.noise(s, c, 12); X.horde(s, c, 2); X.heal(s, c, c.m, 15); for (const m of ZT.State.alive(s)) X.fatigue(s, c, m, -8);
        return 'A fire big enough to be seen and warm enough to matter. Somebody sits up all night watching the dark past the light.'; } },
    { text: 'Everyone shares body heat and blankets', hint: 'free; partial',
      do(s, c) { X.heal(s, c, c.m, 8); X.fatigueAll(s, c, 8); X.morale(s, c, 3);
        return 'Every blanket, with the seats folded flat and everyone tucked in. Undignified, effective enough, and it costs nothing.'; } },
  ],
},
{
  id: 'h_pregnancy_rumor', cat: 'health', weight: 2, once: true, cond: (s) => ZT.State.aliveCount(s) >= 3 && s.miles > 500, art: 'figures',
  text: (s) => { const m = someone(s); return `${m.name} asks, in an extremely offhand way, how far it is to somewhere with a doctor.`; },
  setup(s, c) { c.m = someone(s); },
  choices: [
    { text: 'Ask directly', hint: '',
      do(s, c) { X.morale(s, c, 6); s.flags.expecting = true;
        return `It takes a while to get an answer and the answer is yes. The mood in the wagon after that is complicated and, on balance, better than it was.`; } },
    { text: 'Do not pry', hint: '',
      do(s, c) { X.morale(s, c, 1); return 'You give a distance and leave it there. Everyone in the car has worked it out anyway.'; } },
    { text: 'Change the ration setting to full', hint: 'food', show: (s) => s.rations !== 'full',
      do(s, c) { s.rations = 'full'; X.d(c, 'rations: full'); X.morale(s, c, 8);
        return 'Nobody announces the reason. The rations go to full and stay there, and nobody argues about it.'; } },
  ],
},
{
  id: 'h_nightmares', cat: 'health', when: 'camp', weight: 5, art: 'night',
  text: (s) => { const m = someone(s); return `${m.name} has started shouting in their sleep. Not words. It wakes everyone and it happens every night now.`; },
  setup(s, c) { c.m = someone(s); },
  choices: [
    { text: 'Sit up with them', hint: 'fatigue; morale',
      do(s, c) { X.fatigueAll(s, c, 10); X.morale(s, c, 8); X.moraleM(s, c, c.m, 6);
        return 'Somebody takes the watch and sits with them and does not make anything of it. It helps more than it should.'; } },
    { text: 'Move their bedroll away from camp', hint: 'sleep; cruel',
      do(s, c) { X.fatigueAll(s, c, -6); X.moraleM(s, c, c.m, -14); X.morale(s, c, -2);
        return `${c.m.name} sleeps forty feet out from now on. Everybody else sleeps. It is a practical arrangement that nobody feels good about.`; } },
    { text: 'Everyone talks about it in the morning', hint: 'uncomfortable; may help',
      do(s, c) { X.delay(s, c, 0.2);
        if (ZT.roll(s, 0.65)) { X.morale(s, c, 10); return 'A very awkward twenty minutes over coffee. Saying the dream aloud makes it sound less powerful, which is somehow enormously reassuring.'; }
        X.morale(s, c, -5); return 'It goes badly. Some things do not want talking about at seven in the morning next to a cold fire.'; } },
  ],
},
{
  id: 'h_wound_gone_bad', cat: 'health', weight: 7, cond: (s) => s.party.some((m) => m.alive && m.injury > 34), art: 'sickbad',
  setup(s, c) { c.m = s.party.find((x) => x.alive && x.injury > 34); },
  text: (s, c) => `The cut on ${c.m.name}'s leg has red lines running up from it. That is not a zombie problem. That is a 1890s problem and it will kill just as dead.`,
  choices: [
    { text: 'Antibiotics', hint: '1 kit', show: (s) => s.inv.medicine > 0,
      do(s, c) { const t = ZT.Party.treat(s, c.m); X.d(c, '-1 medicine'); c.m.injury = Math.max(0, c.m.injury - 25);
        return 'Antibiotics, twice a day, and the lines start to retreat within thirty-six hours. ' + t; } },
    { text: 'Open it, clean it, pack it', hint: 'brutal; free',
      do(s, c) { X.hurt(s, c, c.m, 12, 'infection'); X.fatigue(s, c, c.m, 20);
        const p = X.p(s, 0.5, 'medic', 0.25);
        if (ZT.roll(s, p)) { c.m.injury = Math.max(0, c.m.injury - 35); X.morale(s, c, 4); return 'A knife boiled in a can, a lot of clean water, and somebody with a steady hand. It is horrible and it works.'; }
        X.hurt(s, c, c.m, 10, 'infection'); return 'A knife boiled in a can and somebody without a steady hand. It is horrible and it does not obviously help.'; } },
    { text: 'Rest and elevate it', hint: 'days',
      do(s, c) { ZT.Travel.restDay(s); ZT.Travel.restDay(s); X.d(c, '+2 days'); c.m.injury = Math.max(0, c.m.injury - 20); X.heal(s, c, c.m, 8);
        return 'Two days flat on their back with the leg up on a duffel. The lines stop advancing. It is not a cure; it is a truce.'; } },
  ],
},
{
  id: 'h_ration_grumble', cat: 'health', weight: 5, cond: (s) => s.rations === 'meager', art: 'figures',
  text: 'Everyone is thinner than they were. Somebody has started counting the cans out loud, which is a bad sign in more ways than one.',
  choices: [
    { text: 'Go to normal rations', hint: 'food', show: (s) => s.inv.food > 80,
      do(s, c) { s.rations = 'normal'; X.d(c, 'rations: normal'); X.morale(s, c, 10); X.fatigueAll(s, c, -6);
        return 'Rations go back up. The change in the wagon over two days is out of all proportion to the number of calories involved.'; } },
    { text: 'Explain the arithmetic', hint: 'honest',
      do(s, c) { if (ZT.roll(s, ZT.clamp(0.4 + ZT.Party.avgMorale(s) / 200, 0.3, 0.85))) { X.morale(s, c, 4);
          return 'You lay the numbers out on the hood: pounds, days, miles. Everyone can do arithmetic. Nobody likes it and nobody argues with it.'; }
        X.morale(s, c, -6); return 'You lay the numbers out on the hood. Somebody says the numbers are wrong. Somebody else says the numbers were always going to be wrong. It goes downhill from there.'; } },
    { text: 'Hunt or scavenge for more', hint: 'time',
      do(s, c) { X.delay(s, c, 0.5); X.noise(s, c, 10); X.give(s, c, 'food', ZT.rint(s, 8, 26) * ZT.DIFF[s.difficulty].salvage);
        return 'Half a day working the ditches, the fence lines, and an abandoned garden. It is not much. It is something.'; } },
  ],
},
]);
})();
