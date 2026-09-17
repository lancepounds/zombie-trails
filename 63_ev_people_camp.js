/* ZOMBIE TRAILS — event content: other people, camp nights, and the rare stuff */
'use strict';
(function () {
const X = ZT.X;
const someone = (s) => X.someone(s);

ZT.Events.add([
/* ================= SURVIVORS / TRADE ================= */
{
  id: 'p_disabled_car', cat: 'people', weight: 8, art: 'people',
  text: 'A car on the shoulder with the hood up and three people standing around it. One of them raises a hand. The other two do not.',
  choices: [
    { text: 'Stop and help', hint: 'costs a part; goodwill',
      show: (s) => s.inv.parts > 0,
      do(s, c) { X.take(s, c, 'parts', 1); X.delay(s, c, 0.4);
        if (ZT.roll(s, 0.75)) { X.give(s, c, 'food', ZT.rint(s, 20, 45)); X.give(s, c, 'cash', ZT.rint(s, 20, 60)); X.morale(s, c, 8);
          return 'A fuel pump and forty minutes. They have more food than sense and insist on paying for it twice over. Everyone parts on very good terms.'; }
        X.morale(s, c, -6); const m = someone(s); X.injure(s, c, m, 10); X.take(s, c, 'food', 20);
        return `The hood was up because they wanted somebody to stop. They take a duffel and a shove at ${m.name} and drive off in a car that was never broken.`; } },
    { text: 'Talk from a distance first', hint: 'careful',
      do(s, c) { X.delay(s, c, 0.2);
        if (ZT.roll(s, 0.6)) return { text: 'You stop forty yards back with the engine running and shout. They shout back, honestly, about a fuel pump. It becomes a normal conversation. You help, they pay in canned goods, everybody wins.', then: 'p_disabled_car_help' };
        X.morale(s, c, 2); return 'You stop forty yards back with the engine running. Their answers do not add up and one of them keeps looking at the treeline. You reverse away and nobody follows.'; } },
    { text: 'Drive past', hint: 'safe; morale',
      do(s, c) { X.morale(s, c, -4); return 'You go past at fifty. In the mirror, one of them is still holding a hand up.'; } },
  ],
},
{
  id: 'p_disabled_car_help', cat: 'people', weight: 0, art: 'people',
  text: 'They need a fuel pump and they have food to trade for one.',
  choices: [
    { text: 'Trade a part for food', hint: '', show: (s) => s.inv.parts > 0,
      do(s, c) { X.take(s, c, 'parts', 1); X.give(s, c, 'food', ZT.rint(s, 30, 55)); X.morale(s, c, 6);
        return 'The trade is done on the tailgate. They throw in a road atlas with better notes in it than yours.'; } },
    { text: 'Give them the help and take nothing', hint: 'morale', show: (s) => s.inv.parts > 0,
      do(s, c) { X.take(s, c, 'parts', 1); X.morale(s, c, 12); s.flags.goodwill = (s.flags.goodwill || 0) + 1;
        return 'You fit the pump, refuse the food, and drive away in a better mood than the part was worth.'; } },
    { text: 'Wish them luck', hint: '',
      do(s, c) { return 'You have nothing to spare and you say so. They understand. Everyone out here understands.'; } },
  ],
},
{
  id: 'p_enclave_trade', cat: 'people', weight: 7, art: 'enclave',
  cond: (s) => s.miles > 150,
  text: (s) => `A fenced enclave: ${ZT.pick(s, ['a grain co-op behind a berm of dirt', 'a fairground with the gates welded shut', 'four houses on a hill with a wall of shipping containers', 'a truck stop ringed with school buses'])}. They will trade through a gate. They will not let you in.`,
  setup(s, c) { c.mult = 1 + (ZT.rand(s) - 0.5) * 0.4; },
  choices: [
    { text: 'Buy food (80 lbs, $70)', hint: '', show: (s) => s.inv.cash >= 70,
      do(s, c) { X.take(s, c, 'cash', 70); X.give(s, c, 'food', 80); return 'Sacks come through a slot in the gate one at a time. Nobody\'s face is visible at any point in the transaction.'; } },
    { text: 'Buy fuel (12 gal, $70)', hint: '', show: (s) => s.inv.cash >= 70,
      do(s, c) { X.take(s, c, 'cash', 70); X.give(s, c, 'fuel', 12); return 'Twelve gallons out of a farm tank, pumped by hand, watched by two people on the berm the whole time.'; } },
    { text: 'Buy medicine (2 kits, $90)', hint: '', show: (s) => s.inv.cash >= 90,
      do(s, c) { X.take(s, c, 'cash', 90); X.give(s, c, 'medicine', 2); return 'Real medicine at an unreal price, and worth every dollar, and everybody knows it, including them.'; } },
    { text: 'Buy parts and tools ($120)', hint: '', show: (s) => s.inv.cash >= 120,
      do(s, c) { X.take(s, c, 'cash', 120); X.give(s, c, 'parts', 1); X.give(s, c, 'tools', 1); return 'A crate of belts and hoses and a canvas roll of tools that belonged to somebody who took care of them.'; } },
    { text: 'Sell trade goods ($16 a lot)', hint: '', show: (s) => s.inv.goods > 0,
      do(s, c) { const n = Math.min(s.inv.goods, 10); X.take(s, c, 'goods', n); X.give(s, c, 'cash', n * 16);
        return `They take ${n} ${ZT.plural(n, 'lot')} and pay in cash without haggling, which suggests you should have asked for more.`; } },
    { text: 'Ask to stay', hint: '',
      do(s, c) { X.delay(s, c, 0.2);
        if (ZT.roll(s, 0.1)) { X.morale(s, c, 10); for (const m of ZT.State.alive(s)) { X.heal(s, c, m, 10); X.fatigue(s, c, m, -20); } ZT.Travel.restDay(s); X.d(c, '+1 day');
          return 'To everyone\'s astonishment they open the gate. One night, inside a wall, with hot water. In the morning they are polite and firm about you leaving and nobody argues.'; }
        X.morale(s, c, -3); return 'The answer is no and it is not unkind and it is not going to change. They have their own arithmetic to do.'; } },
    { text: 'Move on', hint: '', do() { return 'The gate closes. The road goes on.'; } },
  ],
},
{
  id: 'p_join_request', cat: 'people', weight: 5, cond: (s) => ZT.State.aliveCount(s) < ZT.MAX_PARTY && ZT.State.aliveCount(s) >= 1, art: 'figure',
  setup(s, c) { c.name = ZT.pick(s, ZT.NAME_POOL.filter((n) => !s.party.some((m) => m.name === n))) || 'Wes'; c.role = ZT.pick(s, ['mechanic', 'medic', 'scout', 'generalist', 'driver']); },
  text: (s, c) => `Somebody is walking west on the shoulder with a pack and a length of pipe. They give a name — ${c.name} — say they were a ${c.role === 'generalist' ? 'schoolteacher' : c.role} before, and ask how far you are going.`,
  choices: [
    { text: 'Take them on', hint: 'another mouth; another pair of hands',
      do(s, c) { const dead = s.party.find((m) => !m.alive || m.missing);
        const nm = ZT.State.newMember(c.name, c.role);
        nm.health = ZT.rint(s, 55, 85); nm.fatigue = ZT.rint(s, 30, 60); nm.morale = ZT.rint(s, 50, 80);
        if (ZT.roll(s, 0.12)) { nm.inf = 'exposed'; nm.infDays = 0; }
        if (dead) s.party[s.party.indexOf(dead)] = nm; else s.party.push(nm);
        X.morale(s, c, 6); X.d(c, `${c.name} joined (${c.role})`); ZT.State.log(s, `${c.name} joined the party.`, true);
        return `${c.name} gets in the back, hands over the pipe without being asked, and does not talk much for the first fifty miles.`; } },
    { text: 'Give them supplies instead', hint: 'costs food',
      do(s, c) { X.take(s, c, 'food', 10); X.morale(s, c, 2); return `Food, water, and directions to the last enclave you passed. ${c.name} takes it, says thank you properly, and keeps walking west.`; } },
    { text: 'Ask what they can do first', hint: 'information',
      do(s, c) { X.delay(s, c, 0.2);
        if (ZT.roll(s, 0.65)) return { text: `${c.name} answers straight, without overselling it, and mentions two things about the road ahead that turn out to be true.`, then: 'p_join_request_yes' };
        X.morale(s, c, -2); return `${c.name}'s answers are smooth and rehearsed and one of them contradicts another. You wish them luck and drive.`; } },
    { text: 'Drive on', hint: '', do(s, c) { X.morale(s, c, -3); return 'You pass at speed. There are only so many seats.'; } },
  ],
},
{
  id: 'p_join_request_yes', cat: 'people', weight: 0, art: 'figure',
  setup(s, c) { c.name = ZT.pick(s, ZT.NAME_POOL.filter((n) => !s.party.some((m) => m.name === n))) || 'Wes'; c.role = ZT.pick(s, ['mechanic', 'medic', 'scout']); },
  text: (s, c) => `So: yes or no.`,
  choices: [
    { text: 'Yes', hint: '',
      do(s, c) { const dead = s.party.find((m) => !m.alive || m.missing);
        const nm = ZT.State.newMember(c.name, c.role); nm.health = ZT.rint(s, 60, 90); nm.morale = ZT.rint(s, 60, 85);
        if (dead) s.party[s.party.indexOf(dead)] = nm; else s.party.push(nm);
        X.morale(s, c, 8); X.d(c, `${c.name} joined (${c.role})`); ZT.State.log(s, `${c.name} joined the party.`, true);
        return `${c.name} gets in. Within a day it is difficult to remember what the wagon was like without them.`; } },
    { text: 'No', hint: '', do(s, c) { X.morale(s, c, -3); return 'You say no. It is said kindly. It is still no.'; } },
  ],
},
{
  id: 'p_bandits_toll', cat: 'people', weight: 6, cond: (s) => s.miles > 300, art: 'bandits',
  text: 'Two pickup trucks across the road and five people behind them who are not asking politely. They want half of what you have and they are being specific about which half.',
  choices: [
    { text: 'Pay what they ask', hint: 'expensive; safe',
      do(s, c) { for (const k of ['food', 'fuel', 'ammo', 'goods']) X.take(s, c, k, s.inv[k] * 0.4);
        X.take(s, c, 'cash', s.inv.cash * 0.5); X.morale(s, c, -10);
        return 'It is handed over in silence and it takes about four minutes and then the trucks move and you drive through. Nobody is hurt. Everyone is furious.'; } },
    { text: 'Negotiate', hint: 'talk your way down',
      do(s, c) { if (ZT.roll(s, ZT.clamp(0.35 + ZT.Party.avgMorale(s) / 250 + (s.flags.goodwill ? 0.15 : 0), 0.2, 0.75))) {
          for (const k of ['food', 'goods']) X.take(s, c, k, s.inv[k] * 0.2); X.morale(s, c, -2);
          return 'Twenty minutes of talking gets it down to a fifth, in food, and a genuinely useful piece of information about the next county. There is a version of this that is just trade.'; }
        for (const k of ['food', 'fuel', 'ammo', 'goods']) X.take(s, c, k, s.inv[k] * 0.45);
        X.take(s, c, 'cash', s.inv.cash * 0.6); X.morale(s, c, -12);
        return 'The talking makes them irritable and the price goes up. This is a lesson that will be remembered.'; } },
    { text: 'Fight', hint: 'ammo; people get hurt', show: (s) => s.inv.ammo >= 15,
      do(s, c) { X.shots(s, c, ZT.rint(s, 12, 25)); X.noise(s, c, 30); X.horde(s, c, 6);
        const m = someone(s);
        if (ZT.roll(s, ZT.clamp(0.4 + (ZT.State.aliveCount(s) - 3) * 0.1, 0.2, 0.7))) {
          X.injure(s, c, m, 20); X.loot(s, c, 1.2); X.morale(s, c, -6);
          return `It is over in fifteen seconds and it is not like anything anyone imagined. ${m.name} is hit in the arm. The trucks are yours to go through, and the noise brings other things toward the road for the rest of the day.`; }
        X.injure(s, c, m, 35); X.take(s, c, 'food', s.inv.food * 0.5); X.take(s, c, 'cash', s.inv.cash); X.morale(s, c, -15);
        if (ZT.roll(s, 0.25)) X.kill(s, c, m, 'gunshot');
        return `It goes badly from the first second. ${m.name} takes the worst of it and they take everything anyway.`; } },
    { text: 'Reverse and run', hint: 'lose ground; keep everything',
      do(s, c) { s.miles = Math.max(0, Math.round((s.miles - 15) * 10) / 10); X.d(c, '-15 miles'); X.take(s, c, 'fuel', 3); X.wear(s, c, 'engine', 8); X.fatigueAll(s, c, 12);
        if (ZT.roll(s, 0.75)) return 'Reverse, a three-point turn that takes seven points, and fifteen miles the wrong way at speed. They do not follow far.';
        X.wear(s, c, 'body', 15); const m = someone(s); X.injure(s, c, m, 12);
        return `They follow for four miles and put a round through the tailgate before losing interest. ${m.name} is cut by the glass.`; } },
  ],
},
{
  id: 'p_doctor', cat: 'people', weight: 4, cond: (s) => s.party.some((m) => m.alive && (m.inf !== 'none' || m.health < 55)), art: 'doctor',
  text: 'A hand-painted sign: DOCTOR — 2 MI — REAL ONE. It is not clear whether that is a boast or a warning.',
  choices: [
    { text: 'Go and see', hint: 'time; real medicine',
      do(s, c) { X.take(s, c, 'fuel', 1); X.delay(s, c, 0.5);
        if (ZT.roll(s, 0.7)) {
          const sick = ZT.State.alive(s).filter((m) => m.inf !== 'none' || m.health < 55 || m.injury > 20);
          const price = Math.min(s.inv.cash, 60);
          X.take(s, c, 'cash', price);
          for (const m of sick) { X.heal(s, c, m, 15); m.injury = Math.max(0, m.injury - 30); m.illness = Math.max(0, m.illness - 30);
            if (m.inf === 'bitten' || m.inf === 'symptomatic') { if (ZT.roll(s, 0.55)) { m.infStable = true; X.d(c, `${m.name} stable`); } }
            if (m.inf === 'exposed') { m.inf = 'none'; X.d(c, `${m.name} clear`); } }
          X.give(s, c, 'medicine', 1); X.morale(s, c, 10);
          return 'She is a real one. Two rooms in a farmhouse, an autoclave running off a car battery, and an hour of the most competent attention anyone has had in a year. She takes what cash you have and does not ask for more.'; }
        X.take(s, c, 'cash', 20); X.morale(s, c, -5);
        return 'He is not a real one. He is confident and clean and completely fraudulent, and it takes twenty dollars and forty minutes to establish that.'; } },
    { text: 'Skip it', hint: '', do() { return 'Two miles off the route on the word of a hand-painted sign. You keep going.'; } },
  ],
},
{
  id: 'p_convoy_offer', cat: 'people', weight: 4, cond: (s) => s.miles > 500, art: 'convoy',
  text: 'Four vehicles pulled off at a rest area, travelling together, going west. They have room and they are offering. There are rules, and the rules are read out.',
  choices: [
    { text: 'Travel with them for a while', hint: 'safer; less freedom',
      do(s, c) { s.flags.convoy = true; X.delay(s, c, 0.2); X.morale(s, c, 8); X.noise(s, c, 8);
        s.miles = Math.round((s.miles + ZT.rint(s, 25, 50)) * 10) / 10; X.d(c, '+miles'); X.take(s, c, 'fuel', 2); X.take(s, c, 'food', 15);
        if (ZT.roll(s, 0.7)) return 'Three days in a convoy: fuel pooled, watches shared, roadblocks cleared by eight people instead of five. Then they turn north and you do not. It was good while it lasted.';
        X.horde(s, c, 5); const m = someone(s); X.injure(s, c, m, 12);
        return `Three days in a convoy, which is three days of four engines making four engines' worth of noise. It draws exactly what you would expect on the last night and ${m.name} is hurt in the confusion.`; } },
    { text: 'Trade with them and go alone', hint: 'supplies',
      do(s, c) { X.delay(s, c, 0.3);
        const give = Math.min(s.inv.goods, 3); if (give) X.take(s, c, 'goods', give);
        X.give(s, c, 'food', 25); X.give(s, c, 'fuel', 4); X.morale(s, c, 4);
        return 'An hour of trading off tailgates. They have too much food and not enough coffee, which is a solvable problem.'; } },
    { text: 'Decline politely', hint: '',
      do(s, c) { return 'You decline. Their leader says "smart" in a way that is impossible to interpret and waves you off.'; } },
  ],
},
{
  id: 'p_radio_contact', cat: 'people', weight: 4, cond: (s) => s.vehicle.has && s.vehicle.electrical > 40 && s.miles > 400, art: 'radio',
  text: 'A voice comes up on the CB, close, asking for a position and a headcount.',
  choices: [
    { text: 'Answer honestly', hint: 'trust',
      do(s, c) { if (ZT.roll(s, 0.6)) { s.flags.radioFriend = true; X.morale(s, c, 6); s.miles = Math.round((s.miles + 10) * 10) / 10; X.d(c, '+10 miles');
          return 'They are a family sixteen miles ahead who have been broadcasting road conditions to nobody for a month. They talk you around a bad stretch and thank you for existing.'; }
        X.horde(s, c, 3); const m = someone(s); X.injure(s, c, m, 10); X.take(s, c, 'goods', 2);
        return `They are waiting at a bridge you have already told them you are approaching. Getting through costs a taillight and some of ${m.name}'s skin and two lots of trade goods left in the road as a decoy.`; } },
    { text: 'Lie about the headcount', hint: 'careful',
      do(s, c) { if (ZT.roll(s, 0.7)) { X.morale(s, c, 2); return 'You say eleven people and four vehicles. Whoever it was signs off quickly and does not come up again.'; }
        return 'You say eleven people and four vehicles. There is a long pause and then a laugh and then nothing. Somebody out there is not fooled and is not interested either.'; } },
    { text: 'Say nothing and change channel', hint: '',
      do(s, c) { X.morale(s, c, -1); return 'The channel goes to static. The voice keeps calling for a while on the old one and then stops.'; } },
  ],
},
{
  id: 'p_kid_alone', cat: 'people', weight: 3, cond: (s) => s.miles > 400, art: 'figure', once: true,
  text: 'A girl of about twelve is sitting on a porch swing with a backpack on, as though she has been waiting for a ride for a long time. There is nobody else.',
  choices: [
    { text: 'Take her', hint: 'another person to feed', show: (s) => ZT.State.aliveCount(s) < ZT.MAX_PARTY,
      do(s, c) { const nm = ZT.State.newMember(ZT.pick(s, ['Nell', 'Sunny', 'Birdie', 'Rae']), 'generalist');
        nm.health = 70; nm.morale = 40; nm.fatigue = 40;
        const dead = s.party.find((m) => !m.alive || m.missing);
        if (dead) s.party[s.party.indexOf(dead)] = nm; else s.party.push(nm);
        X.morale(s, c, 10); X.d(c, `${nm.name} joined`); ZT.State.log(s, `${nm.name} joined the party.`, true);
        return `She gets in without a word, buckles the seatbelt, and says the name on her backpack when asked. She does not talk about the house and nobody makes her.`; } },
    { text: 'Take her to the nearest enclave', hint: 'time; the right thing',
      do(s, c) { X.take(s, c, 'fuel', 3); X.delay(s, c, 1); X.morale(s, c, 12); s.flags.goodwill = (s.flags.goodwill || 0) + 1;
        return 'Thirty miles back east to a gate you passed yesterday, which opens for her in about nine seconds. It costs a day and three gallons and it is not close to a difficult decision.'; } },
    { text: 'Leave supplies and go', hint: 'costs food; costs more than that',
      do(s, c) { X.take(s, c, 'food', 12); X.morale(s, c, -12);
        return 'Food on the porch step and the car pulling away. Nobody in the wagon is able to look at anybody else for a very long time.'; } },
  ],
},
{
  id: 'p_preacher', cat: 'people', weight: 3, art: 'figure',
  text: 'A man in a good suit is preaching to eleven empty folding chairs at a crossroads. He does not stop when you pull up. He gets louder.',
  choices: [
    { text: 'Sit through it', hint: 'time; morale',
      do(s, c) { X.delay(s, c, 0.3);
        if (ZT.roll(s, 0.5)) { X.morale(s, c, 8); return 'It is twenty minutes long and about halfway through it stops being nonsense and becomes, briefly, the most sensible thing anyone has said out loud in months. Then it goes back to being nonsense. Everyone claps.'; }
        X.morale(s, c, -2); return 'It is forty minutes long and it does not improve. Somebody eventually starts the car.'; } },
    { text: 'Ask him about the road west', hint: 'information',
      do(s, c) { if (ZT.roll(s, 0.55)) { s.flags.preacherTip = true; X.morale(s, c, 3);
          return 'He stops instantly, becomes entirely lucid, gives a clear and detailed account of the next sixty miles including two bridges and a bad town, and then resumes preaching mid-sentence.'; }
        return 'He answers a question nobody asked, at length, and with feeling.'; } },
    { text: 'Leave a chair less empty', hint: 'costs a moment',
      do(s, c) { X.delay(s, c, 0.2); X.morale(s, c, 5); X.give(s, c, 'goods', ZT.roll(s, 0.4) ? 1 : 0);
        return 'Somebody sits in the front row for one whole sermon. Afterward he shakes their hand for a long time and gives them a bag of oranges from a cooler, which is the strangest and best thing to happen all week.'; } },
  ],
},
{
  id: 'p_family_west', cat: 'people', weight: 5, art: 'people',
  text: 'A family in a sedan going the other way. They stop. Everyone stops. Both cars idle in the middle of the road for a moment before anyone says anything.',
  choices: [
    { text: 'Trade road news', hint: 'information both ways',
      do(s, c) { X.delay(s, c, 0.2); X.morale(s, c, 5); s.flags.eastNews = true;
        if (ZT.roll(s, 0.7)) { s.miles = Math.round((s.miles + 10) * 10) / 10; X.d(c, '+10 miles');
          return 'Ten minutes of the most valuable conversation available anywhere: which bridge, which town, which road not to take. Both cars leave better off.'; }
        return 'They came from the west and they are going east and they will not say why, and everybody in both cars notices that nobody asks.'; } },
    { text: 'Trade supplies', hint: '', show: (s) => s.inv.goods > 0 || s.inv.food > 60,
      do(s, c) { if (s.inv.goods > 0) { X.take(s, c, 'goods', 2); X.give(s, c, 'food', 25); X.give(s, c, 'medicine', ZT.roll(s, 0.5) ? 1 : 0); }
        else { X.take(s, c, 'food', 25); X.give(s, c, 'fuel', 5); }
        X.morale(s, c, 4); return 'Tailgate to tailgate for fifteen minutes. Everybody wants what the other has, which is what makes it a trade rather than a problem.'; } },
    { text: 'Ask why they turned back', hint: 'may be bad news',
      do(s, c) { X.delay(s, c, 0.2);
        if (ZT.roll(s, 0.45)) { X.morale(s, c, -10); s.flags.badNews = true;
          return 'The father does not want to answer in front of the children. He gets out and walks a few yards up the road and says that the place you are going was not what the radio said it was, six weeks ago, when they were there. Then he gets back in and drives east.'; }
        X.morale(s, c, 6); return 'They turned back for a grandmother in a town two hundred miles behind you, which is the best possible reason, and they say the road west is fine, which is the best possible news.'; } },
  ],
},
{
  id: 'p_gate_refused', cat: 'people', weight: 4, cond: (s) => ZT.Party.avgHealth(s) < 60, art: 'enclave',
  text: 'A settlement with a gate and a doctor and a well, and they take one look at the wagon and say no. Not unkindly. Just no, and the reason is the sick people in the back.',
  choices: [
    { text: 'Argue', hint: 'unlikely',
      do(s, c) { X.delay(s, c, 0.3);
        if (ZT.roll(s, 0.2)) { X.give(s, c, 'medicine', 2); X.morale(s, c, 5); return 'Twenty minutes of arguing through a fence gets two kits of medicine handed over the top of it and a firm, final no. It is more than they had to do.'; }
        X.morale(s, c, -8); return 'Twenty minutes of arguing through a fence changes nothing except how everyone feels. A rifle is not raised but it is definitely adjusted.'; } },
    { text: 'Ask them to trade instead', hint: 'supplies',
      do(s, c) { if (s.inv.cash >= 50) { X.take(s, c, 'cash', 50); X.give(s, c, 'food', 50); X.give(s, c, 'medicine', 1); X.morale(s, c, 2);
          return 'They will not open the gate and they will trade all day. Food and one kit through the slot, cash the other way.'; }
        X.morale(s, c, -4); return 'They will trade, and you have nothing they want. That is a harder no than the first one.'; } },
    { text: 'Leave', hint: '',
      do(s, c) { X.morale(s, c, -4); return 'You leave. Somewhere behind the fence a generator is running and somebody is cooking something.'; } },
  ],
},

/* ================= CAMP / NIGHT ================= */
{
  id: 'c_missouri_flood_marker', cat: 'camp', when: 'camp', regions: ['missouri'], weight: 5, cool: 30, art: 'camp',
  // At landmarks the legacy region helper falls back to missouri; keep this local.
  cond: (s) => s.at === 'omaha' || (ZT.currentLeg(s) && ZT.currentLeg(s).region === 'missouri'),
  text: 'The campsite has shade, level ground, and a flood-height mark on a fence post above your head. The first two features are excellent.',
  choices: [
    { text: 'Move camp onto the bank', hint: 'effort; safe ground',
      do(s, c) { X.fatigueAll(s, c, 6); X.noise(s, c, -4); return 'The bank is less level and much less interesting to the river. Nothing reaches camp before morning.'; } },
    { text: 'Stay and enjoy the level ground', hint: 'better sleep; wet supplies risk',
      do(s, c) { X.fatigueAll(s, c, -10); if (ZT.roll(s, s.weather === 'rain' || s.weather === 'storm' ? 0.5 : 0.2)) { X.take(s, c, 'food', 8); X.fatigueAll(s, c, 14); return 'Water creeps in before dawn. The last food sack is already soaked when you move uphill. The fence post was trying to help.'; } X.morale(s, c, 3); return 'The river stays where you left it. Good sleep, with a historical warning standing nearby.'; } },
  ],
},
{
  id: 'c_owyhee_porch_light', cat: 'camp', when: 'camp', regions: ['owyhee'], weight: 5, cool: 30, art: 'camp',
  text: 'From camp above the Boise valley, a porch light blinks on in the distance. It might mean people. It definitely means somebody has electricity, which feels extravagant.',
  choices: [
    { text: 'Watch quietly from camp', hint: 'less sleep; a little hope',
      do(s, c) { X.fatigueAll(s, c, 4); X.morale(s, c, 6); X.noise(s, c, -4); return 'A second light comes on. Nobody waves. For an hour, the valley resembles somewhere people live.'; } },
    { text: 'Signal with a flashlight', hint: 'morale; attracts attention',
      do(s, c) { X.noise(s, c, 8); X.morale(s, c, 8); if (ZT.roll(s, 0.25 + ZT.Travel.threat(s) * 0.15)) { X.horde(s, c, 3); X.fatigueAll(s, c, 12); return 'The porch light blinks back. Something much closer moves toward your light. You finish the conversation in the dark.'; } return 'Three flashes back across the dark valley. No words, no promises, and enough to make tomorrow feel nearer.'; } },
    { text: 'Sleep while the camp is quiet', hint: 'rest',
      do(s, c) { X.fatigueAll(s, c, -8); return 'The light is still there at dawn, pale against the sky. You have slept long enough to do something with the hope.'; } },
  ],
},
{
  id: 'c_watch_rotation', cat: 'camp', when: 'camp', weight: 8, art: 'camp',
  text: 'Watches have to be set. Somebody has to do the small hours and nobody wants them.',
  choices: [
    { text: 'Split it evenly', hint: 'fair; everyone tired',
      do(s, c) { X.fatigueAll(s, c, 6); X.morale(s, c, 3); return 'Two hours each, drawn by cards. Everyone is slightly tired and nobody is aggrieved, which is a good trade.'; } },
    { text: 'Let the healthy take the hard shifts', hint: 'efficient; resented',
      do(s, c) { const healthy = ZT.State.alive(s).filter((m) => m.health > 65);
        for (const m of healthy) X.fatigue(s, c, m, 14); for (const m of ZT.State.alive(s)) if (healthy.indexOf(m) < 0) X.fatigue(s, c, m, -8);
        X.morale(s, c, -3); return 'The strong take the long watches, which is sensible and which the strong notice.'; } },
    { text: 'Skip the watch and all sleep', hint: 'rest; risk',
      do(s, c) { X.fatigueAll(s, c, -18);
        if (ZT.roll(s, 0.3 + ZT.Travel.threat(s) * 0.3)) { const m = someone(s); X.injure(s, c, m, 16); X.take(s, c, 'food', 10); X.noise(s, c, 10);
          return `Everybody sleeps eight hours, which is glorious, right up until something walks into the middle of the camp at four in the morning and finds ${m.name} first.`; }
        X.morale(s, c, 6); return 'Everybody sleeps eight hours. It is the single best decision of the week and it was completely irresponsible.'; } },
  ],
},
{
  id: 'c_fire_or_not', cat: 'camp', when: 'camp', weight: 7, art: 'camp',
  text: 'A fire would mean hot food, dry clothes, and a light visible for two miles.',
  choices: [
    { text: 'Build it', hint: 'morale; noise',
      do(s, c) { X.noise(s, c, 10); X.morale(s, c, 8); X.fatigueAll(s, c, -8); for (const m of ZT.State.alive(s)) X.heal(s, c, m, 4);
        if (ZT.roll(s, 0.25 + ZT.Travel.threat(s) * 0.2)) { X.horde(s, c, 3); const m = someone(s); X.fatigue(s, c, m, 15);
          return 'Hot food and dry socks, and then two hours of everyone sitting in the dark on the far side of the coals listening to something try to find the way in.'; }
        return 'Hot food, dry socks, and an hour of nobody talking about anything important. The fire is worth more than the risk, tonight.'; } },
    { text: 'Cold camp', hint: 'safe; grim',
      do(s, c) { X.morale(s, c, -4); X.noise(s, c, -8); X.fatigueAll(s, c, -4);
        return 'Cold food out of cans in the dark, everyone in the car. Nothing comes near. It is the right call, which does not make it a pleasant evening.'; } },
    { text: 'Small fire in a hole', hint: 'compromise',
      do(s, c) { X.delay(s, c, 0.1); X.noise(s, c, 4); X.morale(s, c, 5); X.fatigueAll(s, c, -6);
        return 'A pit fire a foot deep with a windbreak of stacked rock. It cooks and it does not advertise. Somebody in this wagon has done this before.'; } },
  ],
},
{
  id: 'c_inventory_night', cat: 'camp', when: 'camp', weight: 6, art: 'camp',
  text: 'Somebody counts everything by flashlight and the numbers are worse than the impression everyone had been working from.',
  choices: [
    { text: 'Tighten the rations', hint: 'food; morale',
      do(s, c) { if (s.rations !== 'meager') { s.rations = s.rations === 'full' ? 'normal' : 'meager'; X.d(c, 'rations: ' + s.rations); X.morale(s, c, -5); }
        return 'The ration setting goes down a notch. Everyone understands the arithmetic and nobody enjoys being inside it.'; } },
    { text: 'Plan a scavenging stop tomorrow', hint: '',
      do(s, c) { s.flags.planScavenge = true; X.morale(s, c, 2);
        return 'A plan is made over the hood with a flashlight: a town, a route in, a route out, and a time limit that everyone agrees to and nobody will keep.'; } },
    { text: 'Do not share the numbers', hint: 'morale now, cost later',
      do(s, c) { X.morale(s, c, 3); s.flags.hidNumbers = true;
        if (ZT.roll(s, 0.4)) { X.morale(s, c, -10); return 'You keep it to yourself. Somebody finds the tally sheet two days later and the mood does not recover quickly.'; }
        return 'You keep it to yourself. Everyone sleeps better, which is worth something, and the numbers do not change.'; } },
  ],
},
{
  id: 'c_stories', cat: 'camp', when: 'camp', weight: 6, art: 'camp',
  text: 'Somebody starts talking about before. Once that starts it goes on for hours.',
  choices: [
    { text: 'Let it run', hint: 'morale; sleep',
      do(s, c) { X.fatigueAll(s, c, 5); X.morale(s, c, 9);
        return ZT.pick(s, [
          'Two hours of arguing about the correct way to make chili, which becomes genuinely heated, and which is the happiest anyone has been in weeks.',
          'Somebody describes an entire episode of a television show from memory, badly, and is corrected constantly, and it takes an hour and a half.',
          'A list is made of foods nobody expects to eat again. It gets to forty items. It should be depressing and it is not.',
        ]); } },
    { text: 'Send everyone to bed', hint: 'rest',
      do(s, c) { X.fatigueAll(s, c, -10); X.morale(s, c, -2); return 'Lights out. Everyone is better rested and slightly resentful about it.'; } },
  ],
},
{
  id: 'c_theft', cat: 'camp', when: 'camp', weight: 4, cond: (s) => ZT.Party.avgMorale(s) < 45 && ZT.State.aliveCount(s) >= 3, art: 'camp',
  text: 'Food is missing from the box. Not much. Enough that somebody counted, and enough that somebody took it.',
  choices: [
    { text: 'Find out who', hint: 'divisive',
      do(s, c) { X.delay(s, c, 0.2);
        if (ZT.roll(s, 0.6)) { const m = someone(s); X.moraleM(s, c, m, -15); X.morale(s, c, -4);
          return `It is ${m.name}, and it is admitted immediately and miserably, and the reason is hunger, which is not much of a mystery. Nothing is resolved by finding out.`; }
        X.morale(s, c, -10); return 'Two hours of everyone looking at everyone. Nobody admits anything and the accusation stays in the wagon for a week.'; } },
    { text: 'Say nothing and increase rations', hint: 'food',
      do(s, c) { if (s.rations === 'meager') { s.rations = 'normal'; X.d(c, 'rations: normal'); } X.morale(s, c, 6);
        return 'The subject is never raised. The rations go up a notch instead and the thefts stop, which answers the question without asking it.'; } },
    { text: 'Lock the food box', hint: 'practical; cold',
      do(s, c) { X.morale(s, c, -6); s.flags.lockedBox = true;
        return 'A padlock and one key. It works perfectly and it changes what the group is, slightly, in a way nobody wants to name.'; } },
  ],
},
{
  id: 'c_stranger_camp', cat: 'camp', when: 'camp', weight: 5, art: 'camp',
  text: 'There is a fire on the far ridge. Somebody else is camped within a mile and they have not hidden their light.',
  choices: [
    { text: 'Go over and say hello', hint: 'risk; reward',
      do(s, c) { X.delay(s, c, 0.3); X.fatigueAll(s, c, 6);
        const r = ZT.rand(s);
        if (r < 0.55) { X.morale(s, c, 10); X.give(s, c, 'food', ZT.rint(s, 10, 25)); s.flags.goodwill = (s.flags.goodwill || 0) + 1;
          return 'Two old men and a dog, travelling east because that is where they are from. Three hours by their fire, a bottle, and a bag of jerky pressed on you at the end of it.'; }
        if (r < 0.85) return 'They are gone before you get there. The fire is still burning and the ground is scuffed and there is nothing else to learn.';
        const m = someone(s); X.injure(s, c, m, 14); X.take(s, c, 'goods', 1);
        return `They are not friendly, and they are awake, and ${m.name} gets back down the ridge with a cut across the forearm and one boot.`; } },
    { text: 'Watch them all night', hint: 'sleep',
      do(s, c) { X.fatigueAll(s, c, 14);
        return 'Two people awake at all times with the fire on the far ridge in view. It burns down and goes out around three. Nothing happens. Nobody rests.'; } },
    { text: 'Move camp', hint: 'fatigue; safe',
      do(s, c) { X.fatigueAll(s, c, 12); X.take(s, c, 'fuel', 1); X.noise(s, c, 4);
        return 'Everything back in the wagon and four miles further on in the dark. The fire disappears behind a ridge and everyone breathes out.'; } },
  ],
},
{
  id: 'c_repair_night', cat: 'camp', when: 'camp', weight: 5, cond: (s) => s.vehicle.has && ZT.Vehicle.overall(s) < 65, art: 'camp',
  text: 'There is enough light left to work on the wagon, or enough light left to sleep. Not both.',
  choices: [
    { text: 'Work on the car', hint: 'condition; fatigue',
      do(s, c) { X.fatigueAll(s, c, 12);
        const gain = ZT.State.hasRole(s, 'mechanic') ? 12 : 7;
        for (const k of ZT.Vehicle.SUBS) if (s.vehicle[k] < 60) { X.repair(s, c, k, gain); break; }
        if (s.inv.tools > 0) X.repair(s, c, 'engine', 4);
        return 'Two hours by flashlight and the wagon is measurably better than it was. Everyone pays for it in the morning.'; } },
    { text: 'Sleep', hint: 'rest',
      do(s, c) { X.fatigueAll(s, c, -14); return 'Everyone sleeps. The car\'s problems will still be there in the morning, slightly worse.'; } },
  ],
},
{
  id: 'c_rain_on_roof', cat: 'camp', when: 'camp', weight: 5, cond: (s) => s.weather === 'rain', art: 'camp',
  text: 'Rain on a metal roof, all night, loud enough to cover everything.',
  choices: [
    { text: 'Sleep hard', hint: 'rest; nothing hears you and you hear nothing',
      do(s, c) { X.fatigueAll(s, c, -18); X.noise(s, c, -10);
        if (ZT.roll(s, 0.2)) { X.take(s, c, 'food', 8); return 'Everyone sleeps like the dead. In the morning a pack has been gone through and the food box is lighter and there are boot prints in the mud.'; }
        X.morale(s, c, 6); return 'Everyone sleeps like the dead and nothing at all happens, and in the morning the whole world smells like wet grass.'; } },
    { text: 'Keep a watch anyway', hint: 'safe; tired',
      do(s, c) { X.fatigueAll(s, c, 4); X.morale(s, c, -1); return 'Somebody sits up in the rain in a poncho for four hours and sees nothing because nothing can be seen. It is the responsible choice.'; } },
  ],
},
{
  id: 'c_bad_dream_landmark', cat: 'camp', when: 'camp', weight: 4, cond: (s) => s.party.some((m) => !m.alive), art: 'night',
  text: (s) => { const d = s.party.filter((m) => !m.alive); const who = d[d.length - 1]; return `Somebody sets out an extra plate at dinner without thinking about it. It is ${who.name}'s.`; },
  choices: [
    { text: 'Leave it there', hint: 'morale',
      do(s, c) { X.morale(s, c, ZT.roll(s, 0.6) ? 5 : -5);
        return ZT.roll(s, 0.6) ? 'The plate stays out and everyone eats around it and somebody tells a story and it is, unexpectedly, all right.'
          : 'The plate stays out and nobody eats much and the evening is a write-off.'; } },
    { text: 'Put it away quietly', hint: '',
      do(s, c) { X.morale(s, c, 1); return 'It goes back in the box before anyone else notices. Somebody notices.'; } },
  ],
},
{
  id: 'c_supplies_check', cat: 'camp', when: 'camp', weight: 5, art: 'camp',
  text: 'A quiet night, a working stove, and time to get the wagon in order.',
  choices: [
    { text: 'Reorganize and repack', hint: 'small gains',
      do(s, c) { X.fatigueAll(s, c, 5); X.morale(s, c, 4);
        if (ZT.roll(s, 0.5)) { X.give(s, c, 'food', ZT.rint(s, 5, 15)); return 'Everything out and everything back in properly, and in the process two cans and a bag of rice turn up that nobody knew were there.'; }
        X.repair(s, c, 'body', 5); return 'Everything out and everything back in properly. The wagon rides better with the weight forward and everyone can find things now.'; } },
    { text: 'Sharpen and repair gear', hint: 'tools', show: (s) => s.inv.tools > 0,
      do(s, c) { X.fatigueAll(s, c, 6); X.morale(s, c, 5); s.flags.gearGood = true;
        return 'Two hours with a file and an oilstone. Everything that has an edge has an edge again, which matters more than anybody expects it to.'; } },
    { text: 'Nothing. Rest.', hint: '',
      do(s, c) { X.fatigueAll(s, c, -12); return 'Nothing gets done. Everyone sleeps. It is fine.'; } },
  ],
},
{
  id: 'c_music', cat: 'camp', when: 'camp', weight: 4, art: 'camp',
  text: (s) => `${someone(s).name} produces a harmonica, which nobody knew about, and asks whether it is a fire-and-music night or not.`,
  choices: [
    { text: 'Music', hint: 'morale; noise',
      do(s, c) { X.noise(s, c, 8); X.morale(s, c, 12);
        if (ZT.roll(s, 0.2 + ZT.Travel.threat(s) * 0.2)) { X.horde(s, c, 3); X.fatigueAll(s, c, 10);
          return 'Forty minutes of surprisingly competent harmonica, and then a shape at the edge of the firelight, and then a very abrupt end to the concert.'; }
        return 'Forty minutes of surprisingly competent harmonica, three songs everyone knows, and one that nobody does and everyone asks about. The best night in a month.'; } },
    { text: 'Not tonight', hint: 'quiet',
      do(s, c) { X.morale(s, c, -3); X.noise(s, c, -5); return 'The harmonica goes back in a pocket. Everyone understands. It is still a small loss.'; } },
  ],
},

/* ================= RARE / HUMOROUS ================= */
{
  id: 'r_cow_road', cat: 'rare', weight: 2, art: 'field', once: true,
  text: 'A cow is standing on the roof of a single-story building. There is no ramp. There is no explanation. The cow appears content.',
  choices: [
    { text: 'Try to get it down', hint: 'time; absurd',
      do(s, c) { X.delay(s, c, 0.4); X.fatigueAll(s, c, 8); X.morale(s, c, 12);
        return 'Forty minutes of five adults attempting to reason with a cow on a roof. It ends with the cow jumping down of its own accord, uninjured, and walking away without acknowledging anyone. It is the funniest thing that has happened all year.'; } },
    { text: 'Take a long look and leave', hint: 'morale',
      do(s, c) { X.morale(s, c, 6); return 'Everyone gets out. Everyone looks. Nobody says anything for a full minute. Then everyone gets back in.'; } },
  ],
},
{
  id: 'r_vending_jackpot', cat: 'rare', weight: 2, art: 'station',
  text: 'An intact vending machine in the lobby of a bank, and taped to the front of it, a note: "IT IS STILL PLUGGED IN. SOMEHOW. DO NOT WASTE THIS."',
  choices: [
    { text: 'Buy something with actual coins', hint: 'absurd; morale',
      do(s, c) { X.take(s, c, 'cash', 2); X.give(s, c, 'food', 8); X.morale(s, c, 14);
        return 'Five adults spend twenty minutes feeding quarters into a working vending machine in a dead world and it dispenses, correctly, every time. It is impossible to explain why this is so wonderful.'; } },
    { text: 'Take the whole machine apart', hint: 'more food; less magic',
      do(s, c) { X.delay(s, c, 0.3); X.noise(s, c, 10); X.give(s, c, 'food', ZT.rint(s, 20, 40)); X.give(s, c, 'cash', ZT.rint(s, 20, 50)); X.morale(s, c, -3);
        return 'The back comes off in ten minutes. Forty pounds of snacks and a coin box. It is the correct decision and somebody quietly puts the note in their pocket.'; } },
  ],
},
{
  id: 'r_wrong_town', cat: 'rare', weight: 2, art: 'town', once: true,
  text: 'A town where everything is mowed. Lawns cut, hedges square, flags up, no cars, no people, no bodies. A sprinkler is running.',
  choices: [
    { text: 'Look for whoever mows', hint: 'time; strange',
      do(s, c) { X.delay(s, c, 0.4);
        if (ZT.roll(s, 0.5)) { X.morale(s, c, 8); X.loot(s, c, 0.7);
          return 'He is on a riding mower on the ninth lawn of the day and he waves. He has been doing the whole town alone for a year. He will not leave and he will not explain and he insists you take some tomatoes.'; }
        X.morale(s, c, -6); return 'Nobody is found. The sprinkler runs. Somewhere a mower is heard starting up, two streets over, and then stopping. Everyone gets back in the car.'; } },
    { text: 'Leave immediately', hint: '',
      do(s, c) { X.morale(s, c, -2); return 'Nobody articulates a reason. Everyone agrees instantly.'; } },
  ],
},
{
  id: 'r_library', cat: 'rare', weight: 3, art: 'library',
  text: 'A public library, doors intact, everything inside exactly where it was left. Nobody has looted a library.',
  choices: [
    { text: 'Take books', hint: 'morale',
      do(s, c) { X.delay(s, c, 0.3); X.morale(s, c, 10); s.flags.books = true;
        return 'Everyone takes something. There is an argument about weight that is won decisively by the person pointing out that a paperback weighs less than a can of beans and lasts longer.'; } },
    { text: 'Take the reference section', hint: 'practical',
      do(s, c) { X.delay(s, c, 0.3); X.give(s, c, 'tools', ZT.roll(s, 0.3) ? 1 : 0); s.flags.manuals = true; X.morale(s, c, 4);
        return 'Auto repair manuals, a home medical guide, a book about wells, and one about canning. Suddenly a great many problems have instructions.'; } },
    { text: 'Sleep in the library', hint: 'rest',
      do(s, c) { ZT.Travel.restDay(s); X.d(c, '+1 day'); X.fatigueAll(s, c, -20); X.morale(s, c, 10);
        return 'Carpet, no windows at ground level, one door. It is the safest building anyone has slept in for months and it smells like a library, which turns out to be enormously comforting.'; } },
  ],
},
{
  id: 'r_time_capsule', cat: 'rare', weight: 2, art: 'cache', once: true,
  text: 'A concrete marker outside a school: TIME CAPSULE — TO BE OPENED 2035. Someone has already dug down to the lid and given up. The lid is loose.',
  choices: [
    { text: 'Open it', hint: 'nothing useful; morale',
      do(s, c) { X.delay(s, c, 0.3); X.morale(s, c, 9);
        return 'A cassette tape, a newspaper, forty letters from fourth graders to the future, and a Rubik\'s cube. Somebody reads three of the letters out loud and then stops, and somebody else takes the cube and works on it for the next two hundred miles.'; } },
    { text: 'Bury it again properly', hint: 'morale',
      do(s, c) { X.delay(s, c, 0.3); X.fatigueAll(s, c, 6); X.morale(s, c, 6);
        return 'The lid goes back on and the dirt goes back over it and somebody tamps it down with the flat of a shovel. It will keep. Somebody might still be here in 2035.'; } },
  ],
},
{
  id: 'r_movie_theater', cat: 'rare', weight: 2, art: 'theater', once: true,
  cond: (s) => s.vehicle.has,
  text: 'A drive-in theater with the screen still standing and a projector booth that has not been broken into.',
  choices: [
    { text: 'Get it running', hint: 'fuel; a night off',
      show: (s) => s.inv.fuel >= 3,
      do(s, c) { X.take(s, c, 'fuel', 3); ZT.Travel.restDay(s); X.d(c, '+1 day'); X.noise(s, c, 12); X.morale(s, c, 20); X.fatigueAll(s, c, -15);
        if (ZT.roll(s, 0.25)) { X.horde(s, c, 4); return 'The generator runs, the projector runs, and half of a Western plays on a forty-foot screen in the dark before the noise brings company and everyone has to leave in a hurry. Nobody regrets it.'; }
        return 'The generator runs. The projector runs. There is one reel of a Western in the booth and everyone watches all of it from the hood of the wagon. It is the best night of the entire journey and it costs three gallons.'; } },
    { text: 'Loot the concession stand', hint: 'food',
      do(s, c) { X.delay(s, c, 0.2); X.give(s, c, 'food', ZT.rint(s, 15, 30)); X.morale(s, c, 4);
        return 'Sixty pounds of popcorn kernels, which is not nothing, and a industrial tin of nacho cheese that nobody is brave enough to open.'; } },
    { text: 'Keep driving', hint: '', do(s, c) { X.morale(s, c, -2); return 'The screen goes by. Somebody says "we could have" and nobody answers.'; } },
  ],
},
{
  id: 'r_hot_spring', cat: 'rare', weight: 2, regions: ['bear', 'laramie', 'powder', 'divide'], art: 'spring', once: true,
  text: 'Steam rising out of a rock pool beside the road. It is a hot spring and it is not on any map anyone has.',
  choices: [
    { text: 'Everybody in', hint: 'health and morale; exposed',
      do(s, c) { X.delay(s, c, 0.4); for (const m of ZT.State.alive(s)) { X.heal(s, c, m, 12); X.fatigue(s, c, m, -25); if (m.illness) m.illness = Math.max(0, m.illness - 20); }
        X.morale(s, c, 16);
        if (ZT.roll(s, 0.15)) { const m = someone(s); X.injure(s, c, m, 10); return 'Two hours in hot water. It is medicinal in a way that no medicine has been. It ends abruptly when something comes down the slope and it is dealt with by five naked people, which will be discussed for the rest of the journey.'; }
        return 'Two hours in hot water with a watch set on the road. Everyone comes out looking like a different set of people. Nothing on this trip has helped as much.'; } },
    { text: 'One at a time, watch set', hint: 'safer, less good',
      do(s, c) { X.delay(s, c, 0.5); for (const m of ZT.State.alive(s)) { X.heal(s, c, m, 7); X.fatigue(s, c, m, -14); } X.morale(s, c, 9);
        return 'In shifts, with a rifle on the rock and somebody watching the road the whole time. Less relaxing. Still the best hour anyone has had in months.'; } },
  ],
},
{
  id: 'r_wedding', cat: 'rare', weight: 2, cond: (s) => s.miles > 700, once: true, art: 'people',
  text: 'A wedding, in the parking lot of a hardware store, with about thirty people and a fiddle and somebody officiating out of a book. They wave you over.',
  choices: [
    { text: 'Stay for it', hint: 'a day; morale',
      do(s, c) { ZT.Travel.idleDay(s); X.d(c, '+1 day'); X.morale(s, c, 22); X.fatigueAll(s, c, -10); X.give(s, c, 'food', ZT.rint(s, 10, 25));
        return 'You stay for the whole thing, and the food afterward, and the dancing, which goes on until it is genuinely dark and past the point of sense. Everyone is sent off in the morning with leftovers and directions.'; } },
    { text: 'Give them something and go', hint: 'goods; morale',
      show: (s) => s.inv.goods > 0,
      do(s, c) { X.take(s, c, 'goods', 1); X.morale(s, c, 10);
        return 'A bottle out of the trade box, handed to the groom, who is nineteen and completely overwhelmed. Everyone waves the wagon off for a hundred yards.'; } },
    { text: 'Wave and keep going', hint: '', do(s, c) { X.morale(s, c, 3); return 'You wave. Thirty people wave back and a fiddle keeps playing. Everyone is in a good mood for hours.'; } },
  ],
},
{
  id: 'r_bad_taxidermy', cat: 'rare', weight: 2, art: 'sign',
  text: 'A roadside attraction: WORLD\'S LARGEST BADGER. There is an admission booth. There is, remarkably, a badger.',
  choices: [
    { text: 'Pay the admission', hint: 'absurd',
      do(s, c) { X.take(s, c, 'cash', 3); X.delay(s, c, 0.2); X.morale(s, c, 10);
        return 'The badger is fourteen feet long, made of fiberglass, and magnificently ugly. Somebody leaves three dollars in the honesty box because it feels wrong not to.'; } },
    { text: 'Check the gift shop', hint: 'loot',
      do(s, c) { X.delay(s, c, 0.2); X.loot(s, c, 0.5); X.morale(s, c, 4);
        return 'The gift shop has candy, a cooler of soda gone flat, and four hundred badger keychains. The candy is taken. One keychain is taken, by someone who denies it.'; } },
    { text: 'Drive past', hint: '', do(s, c) { X.morale(s, c, -2); return 'Somebody in the back says "we are never going to see the world\'s largest badger again" and they are right and it is too late.'; } },
  ],
},
{
  id: 'r_pack_of_dogs', cat: 'rare', weight: 3, art: 'dogs',
  text: 'A pack of dogs, twenty or more, healthy and organized, crossing the road ahead. They are not strays any more. They are something else now.',
  choices: [
    { text: 'Wait and let them pass', hint: 'safe',
      do(s, c) { X.delay(s, c, 0.2);
        return 'They cross without hurrying, and one of them stops in the road and looks directly at the windshield for a long moment before following the rest.'; } },
    { text: 'Sound the horn', hint: 'noise',
      do(s, c) { X.noise(s, c, 14);
        if (ZT.roll(s, 0.7)) return 'They scatter instantly. Whatever else they have become, they still remember cars.';
        X.wear(s, c, 'body', 5); const m = someone(s); X.injure(s, c, m, 8); return 'They do not scatter. Two of them come at the car and one gets in through the open window before it can be wound up.'; } },
    { text: 'Follow them', hint: 'strange; possible reward',
      do(s, c) { X.delay(s, c, 0.3); X.take(s, c, 'fuel', 1);
        if (ZT.roll(s, 0.5)) { X.loot(s, c, 1.0, 'food'); return 'They lead, unhurried, to a fenced farmyard where somebody has been feeding them and is no longer there. The feed store is full and untouched.'; }
        return 'They go into a woodlot and are gone. It was worth an hour to find out.'; } },
  ],
},
{
  id: 'r_message_wall', cat: 'rare', weight: 3, art: 'sign',
  cond: (s) => s.miles > 200,
  text: 'An overpass covered in messages in every kind of paint: names, dates, destinations, and requests. Hundreds of them. Some have been answered underneath.',
  choices: [
    { text: 'Read the whole wall', hint: 'time; morale',
      do(s, c) { X.delay(s, c, 0.3); X.morale(s, c, ZT.roll(s, 0.6) ? 8 : -6);
        return ZT.roll(s, 0.6)
          ? 'Half of it is people looking for each other. About a fifth of those have replies underneath in different handwriting. That fifth is what everyone reads out loud.'
          : 'Half of it is people looking for each other, and most of the dates are from a year ago, and almost none of them have replies.'; } },
    { text: 'Add your own', hint: 'morale; a small hope',
      do(s, c) { X.delay(s, c, 0.2); X.morale(s, c, 7); s.flags.leftMessage = true;
        return 'Five names, the date, and WEST, in white paint from a can somebody has been carrying since the refuge for no reason they could have explained.'; } },
    { text: 'Look for a specific name', hint: 'personal',
      do(s, c) { X.delay(s, c, 0.3);
        if (ZT.roll(s, 0.25)) { X.morale(s, c, 15); return 'Somebody finds a name they were not admitting they were looking for, with a date from two months ago, and a direction. West. They sit down on the guardrail for a while.'; }
        X.morale(s, c, -5); return 'Nothing. Somebody spends twenty minutes looking and then says it was a stupid idea and gets back in the car.'; } },
  ],
},
{
  id: 'r_gas_stove_feast', cat: 'rare', weight: 3, cond: (s) => s.inv.food > 120, art: 'camp', when: 'camp',
  text: 'There is enough food, for once, and somebody has found a propane grill with a full bottle.',
  choices: [
    { text: 'Cook everything properly', hint: 'food; big morale',
      do(s, c) { X.take(s, c, 'food', 20); X.delay(s, c, 0.2); X.morale(s, c, 18); X.fatigueAll(s, c, -10);
        for (const m of ZT.State.alive(s)) X.heal(s, c, m, 8);
        return 'A real meal, cooked properly, eaten sitting down. Somebody makes bread in a skillet. It costs twenty pounds and buys back something that had been slowly going missing.'; } },
    { text: 'Take the propane bottle instead', hint: 'practical',
      do(s, c) { X.give(s, c, 'goods', 2); X.morale(s, c, -2); return 'The bottle is worth more in trade than the meal is worth in morale. Probably. It goes in the back.'; } },
  ],
},
{
  id: 'r_atlas_notes', cat: 'rare', weight: 3, art: 'map',
  text: 'A road atlas in the glovebox of a wrecked car, with the whole route west marked in pencil, and notes in the margins in a small careful hand.',
  choices: [
    { text: 'Take it and use it', hint: 'route knowledge',
      do(s, c) { s.flags.goodAtlas = true; s.miles = Math.round((s.miles + 12) * 10) / 10; X.d(c, '+12 miles'); X.morale(s, c, 6);
        return 'Bridges marked out, three towns circled and crossed through, one water source starred twice. Whoever wrote it got at least this far. The notes are better than anything you have.'; } },
    { text: 'Read the notes properly first', hint: 'information; a story',
      do(s, c) { X.delay(s, c, 0.2); s.flags.goodAtlas = true; X.morale(s, c, ZT.roll(s, 0.5) ? 5 : -5);
        return ZT.roll(s, 0.5)
          ? 'The notes get more confident as they go west, and the last one, near the state line, just says "made it this far, doing fine." That is worth more than the route information.'
          : 'The notes get shorter as they go west and the last one is a single word and the car is wrecked at the side of the road with the atlas still in it. You take the atlas anyway.'; } },
  ],
},
]);
})();
