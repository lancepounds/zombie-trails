/* ZOMBIE TRAILS — arrivals along the Omaha–Boise road.
   Real places. The four big set pieces are Fort Kearny, the second landmark
   (Chimney Rock or Cheyenne, depending on the fork), the Continental Divide
   (South Pass or Creston), and Fort Hall. The rest are shorter arrival beats. */
'use strict';
(function () {
const X = ZT.X;
const someone = (s) => X.someone(s);

/* node id → arrival event id */
ZT.NODE_EVENT = {
  kearney: 'nd_kearney',
  ogallala: 'nd_ogallala',
  chimney: 'nd_chimney',
  cheyenne: 'nd_cheyenne',
  casper: 'nd_casper',
  rawlins: 'nd_rawlins',
  divide_n: 'nd_southpass',
  divide_s: 'nd_creston',
  granger: 'nd_granger',
  montpelier: 'nd_montpelier',
  ogden: 'nd_ogden',
  forthall: 'nd_forthall',
  arco: 'nd_arco',
  twinfalls: 'nd_twinfalls',
  mtnhome: 'nd_mtnhome',
};

/* the standing description on each arrival screen */
ZT.NODE_TEXT = {
  omaha: 'OMAHA, NEBRASKA. The Missouri River at your back and the whole state of Nebraska in front of you. The word out of the west is that Boise held: a valley with one road in, a river, and a fence. Nobody has confirmed it. Thirteen hundred miles is a long way to go on a rumour.',
  kearney: 'FORT KEARNY. Mile 195. The Platte here is a mile wide and an inch deep, exactly as advertised, and the interstate runs beside it under a steel arch built to celebrate everyone who ever came this way.',
  ogallala: 'OGALLALA. Mile 355. The end of the old Texas cattle trail, and the place where the Platte splits in two. North Platte or South Platte. The road forks with the river.',
  chimney: 'CHIMNEY ROCK. Mile 475. Three hundred feet of clay and sandstone standing alone above the North Platte, visible for a full day\'s travel in either direction. Every diary that ever came up this valley mentions it.',
  cheyenne: 'CHEYENNE, WYOMING. Mile 515. Rail yards, a capitol dome, and an air base out on the plain west of town with a fence you can see from the interstate. Fifty thousand people lived here.',
  casper: 'CASPER, WYOMING. Mile 725. Refinery stacks on the river flats and the North Platte running through the middle of it. West of here the road leaves the river and follows the Sweetwater.',
  rawlins: 'RAWLINS, WYOMING. Mile 665. Wind, a shut penitentiary on the hill, and the beginning of the Red Desert. The wind here does not stop for weather. It is just the wind.',
  divide_n: 'SOUTH PASS. Mile 885. Seven thousand four hundred feet, and so gentle that the wagons crossed the spine of the continent without being sure they had done it. Water on one side goes to the Gulf. On the other side it goes to the Pacific.',
  divide_s: 'CRESTON DIVIDE. Mile 710. The Continental Divide splits in two here and encloses the Great Divide Basin, a stretch of country where the water that falls does not run to either ocean. It stays where it lands and it goes into the ground.',
  granger: 'GREEN RIVER, WYOMING. Mile 810. Castle Rock over the town, the Green running south to a canyon, and trona mines under everything. The road forks again: the mountains, or Utah.',
  montpelier: 'MONTPELIER, IDAHO. Mile 930. Bear Lake to the south, turquoise and cold and completely wrong-looking for this country. Butch Cassidy robbed the bank here once and rode out the way you came in.',
  ogden: 'OGDEN, UTAH. Mile 950. Where the railroads met. The Great Salt Lake is a white glare to the west and the Wasatch stands straight up behind the town, and there were a quarter of a million people in this valley.',
  forthall: 'FORT HALL. Mile 1,040. The trading post on the Snake where the Oregon Trail and the California Trail parted company: right for Oregon, left for gold. You are going right.',
  arco: 'ARCO, IDAHO. Mile 1,130. The first town in the world lit by atomic power, which it will tell you on a sign. South of it, sixty miles of black lava with nothing living on it at all.',
  twinfalls: 'TWIN FALLS, IDAHO. Mile 1,165. The Snake River Canyon opens up five hundred feet deep with a single bridge over it, and the falls upstream are still going, because water does not need anybody.',
  mtnhome: 'MOUNTAIN HOME, IDAHO. Mile 1,275. An air base, a town beside it, and forty-five miles of desert between here and the Boise valley. The last stop.',
  boise: 'BOISE, IDAHO.',
};

/* short line under each route choice on the fork screen */
ZT.LEG_NOTE = {
  'ogallala>chimney': 'The old emigrant road up the north bank. Farms, river water, no towns worth the name. Longer.',
  'ogallala>cheyenne': 'The interstate. Faster and better surfaced, and it runs into a city and an air base.',
  'granger>montpelier': 'Shorter, but it is mountains the whole way and there is nothing between here and Idaho.',
  'granger>ogden': 'Longer, and it goes down the Wasatch front through the biggest population you will pass.',
  'forthall>arco': 'The lava. Empty in a way that is hard to describe. No water, no fuel, no people.',
  'forthall>twinfalls': 'The interstate along the canyon. Towns, farms, a bridge, and everything that comes with towns.',
};

ZT.Events.add([
/* ---------------- FORT KEARNY — landmark 1 ---------------- */
{
  id: 'nd_kearney', cat: 'landmark', art: 'lm_arch',
  text: 'The arch spans all eight lanes: a museum built across the interstate, two hundred feet of glass and steel with a covered bridge inside it. Somebody has been up there. There is a rope ladder down the north pier and a bedsheet hanging from the rail with words on it that cannot be read from the road.',
  choices: [
    { text: 'Climb up and read the sheet', hint: 'time; information',
      do(s, c) { X.delay(s, c, 0.3); X.fatigueAll(s, c, 6);
        if (ZT.roll(s, X.p(s, 0.7, 'scout', 0.15))) { s.flags.archRead = true; X.morale(s, c, 6);
          return { text: 'The sheet says WATER AT THE FORT — GO SOUTH SIDE — BRIDGE AT ODESSA IS OUT, in paint, four feet high. All three pieces of information turn out to be correct, and the third one saves most of a day.', then: 'nd_kearney_2' }; }
        const m = someone(s); X.injure(s, c, m, 10);
        return { text: `The rope ladder is a year old and it parts about fifteen feet up. ${m.name} lands badly on the median. From the ground the sheet still cannot be read.`, then: 'nd_kearney_2' }; } },
    { text: 'Search the museum', hint: 'supplies; enclosed space',
      do(s, c) { X.delay(s, c, 0.4); X.noise(s, c, 8);
        if (ZT.roll(s, 0.6)) { X.loot(s, c, 1.1); X.give(s, c, 'goods', 1);
          return { text: 'A gift shop, a cafe, and a diorama of a wagon train with real canvas on it that comes off in one piece and makes an excellent tarp. Nothing up there is alive.', then: 'nd_kearney_2' }; }
        const m = someone(s); X.injure(s, c, m, 14); X.noise(s, c, 10);
        return { text: `Whatever came up here for shelter came up in numbers and did not leave. ${m.name} gets to the stairwell door first and holds it while everyone else gets out.`, then: 'nd_kearney_2' }; } },
    { text: 'Get down to the river instead', hint: 'water and food',
      do(s, c) { X.delay(s, c, 0.3);
        for (const m of ZT.State.alive(s)) { X.heal(s, c, m, 6); X.fatigue(s, c, m, -8); }
        X.give(s, c, 'food', ZT.rint(s, 12, 30)); X.morale(s, c, 5);
        return { text: 'The Platte is exactly what it is famous for being: a mile wide, an inch deep, and running over sand. Every container in the wagon is filled and boiled, and there is a stand of wild plum on the bank that nobody has touched.', then: 'nd_kearney_2' }; } },
  ],
},
{
  id: 'nd_kearney_2', cat: 'landmark', art: 'lm_arch',
  text: 'The old fort site is a state park two miles south: a parade ground, a reconstructed stockade, and a well with a hand pump on it. There are also about a dozen tents pitched inside the stockade, and smoke.',
  choices: [
    { text: 'Go in and talk', hint: 'people; trade',
      do(s, c) { X.delay(s, c, 0.3);
        if (ZT.roll(s, 0.72)) { s.flags.goodwill = (s.flags.goodwill || 0) + 1; X.morale(s, c, 8);
          if (s.inv.cash >= 60) { X.take(s, c, 'cash', 60); X.give(s, c, 'food', 60); X.give(s, c, 'fuel', 6); }
          else { X.give(s, c, 'food', 20); }
          return 'Nine people who have been living inside an eighteen-fifties stockade for a year, on the theory that it was designed to keep things out and nothing has changed. They are right. They trade fairly and they want news more than they want money.'; }
        X.morale(s, c, -4); X.noise(s, c, 5);
        return 'The tents are pitched and empty and the fire is three days cold. Somebody left in a hurry and did not take the tents, which tells you the important part.'; } },
    { text: 'Fill up at the well and go', hint: 'quick',
      do(s, c) { X.delay(s, c, 0.15); for (const m of ZT.State.alive(s)) X.heal(s, c, m, 4);
        return 'A hand pump over a hundred-and-fifty-foot well, drawing cold clean water out of the Ogallala aquifer the way it has since before anybody\'s grandmother. Twenty minutes and gone.'; } },
    { text: 'Stay clear of the smoke', hint: '',
      do(s, c) { X.noise(s, c, -5); return 'You keep to the interstate. Smoke means people and people are the second most dangerous thing on this road.'; } },
  ],
},

/* ---------------- OGALLALA — the first fork ---------------- */
{
  id: 'nd_ogallala', cat: 'landmark', art: 'lm_fork',
  text: 'Ogallala sits where the Platte comes apart. North of town, Kingsley Dam holds back twenty miles of lake; the water is the bluest thing anyone has seen in three hundred miles. The road comes apart here too, and the atlas is open on the hood.',
  choices: [
    { text: 'Look the town over first', hint: 'supplies; a small town',
      do(s, c) { X.delay(s, c, 0.4); X.noise(s, c, 10);
        if (ZT.roll(s, 0.62)) { X.loot(s, c, 1.2, 'fuel'); return 'Front Street is a row of false-front buildings put up for tourists and it has been picked over. The co-op on the edge of town has not. Diesel in the bulk tank and a shed full of seed corn.'; }
        const m = someone(s); X.injure(s, c, m, 12); X.loot(s, c, 0.5); X.noise(s, c, 8);
        return `Somebody is living in the grain co-op and does not want company. ${m.name} takes a warning shot close enough to feel and everyone leaves with less than they came for.`; } },
    { text: 'Camp by the lake tonight', hint: 'a day; recovery',
      do(s, c) { ZT.Travel.restDay(s); X.d(c, '+1 day'); X.fatigueAll(s, c, -18); X.morale(s, c, 10);
        for (const m of ZT.State.alive(s)) { X.heal(s, c, m, 8); if (m.illness) m.illness = Math.max(0, m.illness - 12); }
        X.give(s, c, 'food', ZT.rint(s, 8, 20));
        return 'A sand beach on an inland sea in the middle of Nebraska, with nothing behind you for nine miles. Everyone washes, everyone swims, somebody catches four walleye off the jetty. It is the best day of the journey so far and it will be a while before there is another.'; } },
    { text: 'Get on with it', hint: 'to the fork', do() { return 'The atlas stays open on the hood.'; } },
  ],
},

/* ---------------- CHIMNEY ROCK — landmark 2, north road ---------------- */
{
  id: 'nd_chimney', cat: 'landmark', art: 'lm_chimney',
  text: 'You have been able to see it since yesterday morning, which is the whole point of it. Up close it is smaller and stranger than it looked: a cone of grey clay with a spire coming out of the top, crumbling a little more every winter. At the base, hundreds of names are cut into the soft rock. Most are from the last two years.',
  choices: [
    { text: 'Add your names', hint: 'time; morale',
      do(s, c) { X.delay(s, c, 0.25); X.morale(s, c, 10); s.flags.carvedNames = true;
        return 'Five names and a date, cut with a screwdriver into rock soft enough to take it, forty feet up a slope of clay, under two hundred other names. It takes an hour and it is not a rational use of an hour and nobody argues about it.'; } },
    { text: 'Read the names for anyone you know', hint: 'information; a gamble',
      do(s, c) { X.delay(s, c, 0.3);
        if (ZT.roll(s, 0.35)) { X.morale(s, c, 12); s.flags.foundName = true;
          return 'Somebody finds a name they were not going to admit they were looking for, with a date from four months ago and an arrow pointing west. They sit down on the clay for a while and then get up and say they are fine.'; }
        if (ZT.roll(s, 0.5)) { s.flags.roadNews = true;
          return 'No names anybody knows, but four separate hands have scratched the same warning near the base: SCOTTSBLUFF IS FULL. GO NORTH OF THE RIVER. You go north of the river.'; }
        X.morale(s, c, -3); return 'Two hundred strangers. Some of the dates are recent and some of them have a second date scratched under the first, and it takes a moment to work out what that means.'; } },
    { text: 'Search the visitor centre', hint: 'supplies',
      do(s, c) { X.delay(s, c, 0.3); X.noise(s, c, 7);
        if (ZT.roll(s, 0.65)) { X.loot(s, c, 1.0); X.give(s, c, 'medicine', ZT.roll(s, 0.4) ? 1 : 0);
          return 'A ranger station with a first aid cabinet, a vending machine, and a storeroom of bottled water laid in for a busload of schoolchildren who never arrived.'; }
        const m = someone(s); X.expose(s, c, m); X.injure(s, c, m, 10);
        return `The visitor centre was used as a shelter and then it stopped being one. ${m.name} comes back out with a scratch along the forearm and a look that ends the discussion.`; } },
  ],
},

/* ---------------- CHEYENNE — landmark 2, south road ---------------- */
{
  id: 'nd_cheyenne', cat: 'landmark', art: 'lm_city',
  text: 'Cheyenne from the interstate is a grain elevator, a capitol dome, and eleven miles of rail yard. West of town the air base fence runs for miles with the gates standing open and the guard shacks empty. Fifty thousand people lived here and the interstate goes straight through the middle of all of it.',
  choices: [
    { text: 'Bypass on the ring road', hint: 'fuel; safe',
      do(s, c) { X.take(s, c, 'fuel', 2); X.delay(s, c, 0.3); X.noise(s, c, -6);
        return { text: 'Around the north side on the truck route with the town on your left the whole way, moving and not looking. Eighteen miles to gain four. Nothing follows.', then: 'nd_cheyenne_2' }; } },
    { text: 'Work the rail yard', hint: 'salvage; very loud country',
      do(s, c) { X.delay(s, c, 0.5); X.noise(s, c, 16); X.fatigueAll(s, c, 10);
        if (ZT.roll(s, 0.55)) { X.loot(s, c, 1.5); X.give(s, c, 'parts', ZT.rint(s, 1, 2)); X.give(s, c, 'fuel', ZT.rint(s, 4, 12));
          return { text: 'Eleven miles of sidings and a diesel shop with a pit and a full parts room. Belts, hoses, filters, a hand pump, and a fuel bowser with two hundred gallons in it that you can only take a fraction of.', then: 'nd_cheyenne_2' }; }
        const m = someone(s); X.bite(s, c, m); X.horde(s, c, 5); X.loot(s, c, 0.7);
        return { text: `The yard is open ground between walls of steel and the noise of a pry bar carries the length of it. They come out from between the cars in a loose line and ${m.name} is the furthest from the wagon.`, then: 'nd_cheyenne_2' }; } },
    { text: 'Go into the air base', hint: 'high risk, high reward',
      do(s, c) { X.delay(s, c, 0.6); X.noise(s, c, 12); X.fatigueAll(s, c, 12);
        const r = ZT.rand(s);
        if (r < 0.4) { X.give(s, c, 'ammo', ZT.rint(s, 60, 140)); X.give(s, c, 'medicine', ZT.rint(s, 1, 3)); X.give(s, c, 'fuel', ZT.rint(s, 8, 20)); X.loot(s, c, 1.0);
          return { text: 'The base was evacuated in order, which means the buildings were locked and not looted. A clinic, an armoury annex with the small stuff still in it, and a fuel farm. It is the single best day of salvage anyone will have on this trip.', then: 'nd_cheyenne_2' }; }
        if (r < 0.75) { const m = someone(s); X.bite(s, c, m); X.horde(s, c, 6);
          return { text: `The base was not evacuated in order. Everyone who was on it is still on it, in uniform, and there are a great many of them in a very large open space with nowhere to hide. ${m.name} does not get clear.`, then: 'nd_cheyenne_2' }; }
        X.morale(s, c, -6);
        return { text: 'A gate, a road, and eleven miles of hardstand with nothing on it. Everything is locked, and everything that is locked here is locked properly. You leave with nothing.', then: 'nd_cheyenne_2' }; } },
  ],
},
{
  id: 'nd_cheyenne_2', cat: 'landmark', art: 'lm_city',
  text: 'On the west side of town the interstate climbs toward the Laramie Range, and there is a sign at the top of the grade that somebody has amended. Under ELEV 8640 FT, in spray paint: AND THE WEATHER DOES NOT CARE WHAT MONTH YOU THINK IT IS.',
  choices: [
    { text: 'Take the warning and buy time', hint: 'a day; prepare',
      do(s, c) { ZT.Travel.idleDay(s); X.d(c, '+1 day'); X.fatigueAll(s, c, -8);
        if (s.inv.tools > 0) { X.repair(s, c, 'engine', 8); X.repair(s, c, 'tires', 6); }
        s.flags.readyForRange = true; X.morale(s, c, 4);
        return 'A day spent on the wagon and on making the inside of it survivable: every blanket found, the heater checked, chains improvised out of tow cable. The Laramie Range does not care, but you will.'; } },
    { text: 'Push on over the summit', hint: '',
      do(s, c) { X.wear(s, c, 'engine', 6); return 'Up over the top past a line of stopped trucks with the drivers still in them, and down the far side into wind.'; } },
  ],
},

/* ---------------- CASPER ---------------- */
{
  id: 'nd_casper', cat: 'landmark', art: 'lm_refinery',
  text: 'Refinery stacks over the river flats, and one of them is still flaring — a ragged orange flame that has been burning off whatever is left in the line for a year. It is the only light for a hundred miles and everything for a hundred miles knows where it is.',
  choices: [
    { text: 'Take fuel from the tank farm', hint: 'a lot of fuel; a lot of company',
      do(s, c) { X.delay(s, c, 0.5); X.noise(s, c, 18); X.horde(s, c, 4);
        X.give(s, c, 'fuel', ZT.rint(s, 14, 30));
        if (ZT.roll(s, 0.4 + ZT.Travel.threat(s) * 0.2)) { const m = someone(s); X.injure(s, c, m, 16);
          return 'Thirty gallons out of a drain valve on a storage tank, with the flare roaring overhead and every shape in the yard walking toward the noise of the pump. You get it. It costs.'; }
        return 'Thirty gallons out of a drain valve, filtered through a cloth, in the light of a flare stack that has been burning since before all of this. Nobody comes.'; } },
    { text: 'Cross the river and camp upstream', hint: 'rest away from the light',
      do(s, c) { ZT.Travel.restDay(s); X.d(c, '+1 day'); X.fatigueAll(s, c, -16); X.noise(s, c, -12);
        for (const m of ZT.State.alive(s)) X.heal(s, c, m, 6);
        return 'Four miles up the North Platte with a cottonwood stand between the camp and the town. The flare is a glow on the underside of the clouds all night and nothing at all comes up the river.'; } },
    { text: 'Look for the road west', hint: 'route knowledge',
      do(s, c) { X.delay(s, c, 0.2); s.flags.sweetwater = true;
        return 'The old road leaves the North Platte here and picks up the Sweetwater, which is the only reason any of this was ever possible: a river going the right direction, with grass, all the way to the pass. It is still going the right direction.'; } },
  ],
},

/* ---------------- RAWLINS ---------------- */
{
  id: 'nd_rawlins', cat: 'landmark', art: 'lm_town',
  text: 'The wind here is a fact rather than a weather condition. On the hill above town the old territorial penitentiary stands with its gate open, which somebody in the wagon points out is either very good news or very bad news, and nobody wants to find out which.',
  choices: [
    { text: 'Search the town', hint: 'supplies',
      do(s, c) { X.delay(s, c, 0.4); X.noise(s, c, 10); X.loot(s, c, 1.1);
        if (ZT.roll(s, 0.3)) { const m = someone(s); X.injure(s, c, m, 12); return `A hardware store, a pharmacy that had already been done twice, and a house on the north end with a full pantry. ${m.name} goes through a rotten porch step and does something to an ankle.`; }
        return 'A hardware store and a house on the north end with a pantry nobody had found. The wind covers every sound you make, which works both ways and everyone knows it.'; } },
    { text: 'Check the prison', hint: 'nerve',
      do(s, c) { X.delay(s, c, 0.3); X.noise(s, c, 6);
        const r = ZT.rand(s);
        if (r < 0.35) { X.loot(s, c, 1.3, 'medicine'); X.morale(s, c, 3);
          return 'It was a museum, not a prison, and had been for eighty years. The gift shop is untouched and there is an infirmary set dressed with real supplies because it was cheaper than fake ones.'; }
        if (r < 0.7) { X.morale(s, c, -6); return 'Somebody used the cell block as a place to put people. The doors are shut and the doors are the good kind. You do not open any of them and you leave quickly.'; }
        const m = someone(s); X.injure(s, c, m, 14); X.noise(s, c, 10);
        return `A door that should have been locked is not. ${m.name} gets it shut again with a shoulder and a great deal of shouting.`; } },
    { text: 'Straight through', hint: '',
      do(s, c) { X.noise(s, c, 3); return 'Through town at forty with the wind pushing the wagon sideways the whole way.'; } },
  ],
},

/* ---------------- SOUTH PASS — landmark 3, north road ---------------- */
{
  id: 'nd_southpass', cat: 'landmark', art: 'lm_pass',
  text: 'There is no pass. That is the famous part. The Sweetwater valley widens and flattens and rises so gently that the wagons went over the top of the Rocky Mountains at a walking pace without knowing they had done it. A stone marker says CONTINENTAL DIVIDE 7412. West of it, a spring runs the other way.',
  choices: [
    { text: 'Stop at Pacific Springs', hint: 'water; morale',
      do(s, c) { X.delay(s, c, 0.3); X.morale(s, c, 12);
        for (const m of ZT.State.alive(s)) { X.heal(s, c, m, 7); X.fatigue(s, c, m, -10); }
        return { text: 'A marshy seep two miles west of the marker, and the water in it is going to the Pacific. Somebody works out loud that this is the first water any of you have touched that is going where you are going, and the wagon is quiet for a minute, and then everyone fills every container.', then: 'nd_southpass_2' }; } },
    { text: 'Detour to South Pass City', hint: 'time; salvage',
      do(s, c) { X.take(s, c, 'fuel', 2); X.delay(s, c, 0.5); X.noise(s, c, 6);
        if (ZT.roll(s, 0.6)) { X.loot(s, c, 1.2); X.give(s, c, 'tools', ZT.roll(s, 0.5) ? 1 : 0);
          return { text: 'A gold camp that has been a ghost town since 1875 and a state historic site since 1966, which means it is a street of preserved buildings full of preserved tools. A blacksmith shop with a working forge and a rack of hand tools nobody has needed for a hundred and fifty years.', then: 'nd_southpass_2' }; }
        return { text: 'Twelve miles of gravel to a street of empty buildings and a locked museum. Everything worth taking was behind glass and the glass is somebody\'s idea of a historic artifact. You leave it.', then: 'nd_southpass_2' }; } },
    { text: 'Over the top and keep going', hint: '',
      do(s, c) { X.morale(s, c, 5); return { text: 'Over the spine of the continent at forty-five miles an hour, on a road so flat that nobody would believe it if they had not been watching the altimeter.', then: 'nd_southpass_2' }; } },
  ],
},
{
  id: 'nd_southpass_2', cat: 'landmark', art: 'lm_pass',
  text: 'West of the divide the country changes character completely: sagebrush to the horizon, no trees, no water that is not alkali, and a wind with nothing to slow it down. Forty miles of it to the Green River, and the atlas marks exactly one thing on the way — a highway maintenance yard at Farson.',
  choices: [
    { text: 'Stop at the maintenance yard', hint: 'fuel and parts',
      do(s, c) { X.delay(s, c, 0.3); X.noise(s, c, 8);
        if (ZT.roll(s, 0.7)) { X.give(s, c, 'fuel', ZT.rint(s, 6, 16)); X.give(s, c, 'parts', ZT.roll(s, 0.5) ? 1 : 0); X.loot(s, c, 0.5);
          return 'A shed full of plows, a sand pile, a diesel tank on a stand, and a break room with a coffee maker and four hundred packets of sugar. The tank is a third full.'; }
        X.give(s, c, 'fuel', 3); return 'The yard has been done over already, and recently, and by somebody who left the place tidy. Three gallons in a jerry can at the back of a shed, deliberately left.'; } },
    { text: 'Run the forty miles without stopping', hint: 'fuel; speed',
      do(s, c) { X.take(s, c, 'fuel', 2); X.fatigueAll(s, c, 8); X.noise(s, c, -8);
        return 'Forty miles of sagebrush at speed with the sun going down behind the Wyoming Range. Nothing on the road. Nothing beside the road. Nothing anywhere.'; } },
  ],
},

/* ---------------- CRESTON DIVIDE — landmark 3, south road ---------------- */
{
  id: 'nd_creston', cat: 'landmark', art: 'lm_desert',
  text: 'A brown sign on the shoulder of I-80: CONTINENTAL DIVIDE, ELEV 7000. Two miles on, a second one exactly the same. Between them the divide has split around a basin the size of a small state where the water that falls does not go to either ocean. It goes into the sand and stays there.',
  choices: [
    { text: 'Stay on the interstate', hint: 'fast; wide open',
      do(s, c) { X.noise(s, c, 4);
        return { text: 'The road runs dead straight across it with a horizon in every direction and not one thing standing up on any of them. Nothing can approach without being seen from four miles away, which is the only comfort available and turns out to be a large one.', then: 'nd_creston_2' }; } },
    { text: 'Take the wild horse road south', hint: 'gravel; strange country',
      do(s, c) { X.take(s, c, 'fuel', 3); X.delay(s, c, 0.5); X.wear(s, c, 'tires', 8);
        if (ZT.roll(s, 0.6)) { X.morale(s, c, 10); X.give(s, c, 'food', ZT.rint(s, 10, 25));
          return { text: 'Sixty miles of gravel through country with no fences on it, and a band of about forty wild horses that pace the wagon for a mile and a half and then peel off up a draw. Nobody says anything for a while afterward.', then: 'nd_creston_2' }; }
        X.fatigueAll(s, c, 12); return { text: 'Sixty miles of washboard gravel that shakes something loose in everybody. There is nothing out here. That is the entire report.', then: 'nd_creston_2' }; } },
    { text: 'Camp in the basin', hint: 'exposed; quiet',
      do(s, c) { ZT.Travel.restDay(s); X.d(c, '+1 day'); X.fatigueAll(s, c, -16); X.noise(s, c, -14);
        if (ZT.roll(s, 0.8)) { X.morale(s, c, 8); return { text: 'A camp in the open with a sightline to the horizon on every side and a sky with more stars in it than anybody had any idea were up there. Nothing comes. Nothing could get within four miles without being seen.', then: 'nd_creston_2' }; }
        for (const m of ZT.State.alive(s)) X.hurt(s, c, m, 4, 'exposure');
        return { text: 'A camp in the open, and at two in the morning the temperature falls off a cliff and the wind comes up. Nobody is hurt. Nobody is warm either.', then: 'nd_creston_2' }; } },
  ],
},
{
  id: 'nd_creston_2', cat: 'landmark', art: 'lm_desert',
  text: 'Somewhere in the middle of the basin there is a rest area with a historical marker and a pit toilet, and eleven vehicles parked in it in a neat circle facing outward. Whoever arranged them meant it. There is nobody in any of them.',
  choices: [
    { text: 'Search the circle', hint: 'supplies; grim',
      do(s, c) { X.delay(s, c, 0.3); X.loot(s, c, 1.2); X.morale(s, c, -4);
        return 'Eleven vehicles, all of them lived in, none of them looted. Fuel in four of the tanks, food in two of them, and a notebook on a dashboard with a list of names and a running count of days that stops at seventy-one.'; } },
    { text: 'Add the wagon to the circle for a night', hint: 'rest; sound plan',
      do(s, c) { ZT.Travel.restDay(s); X.d(c, '+1 day'); X.fatigueAll(s, c, -18); X.morale(s, c, 5);
        return 'Whoever built the circle built it right. Twelve vehicles now, facing out, and a watch rotation that only needs one pair of eyes. Everyone sleeps.'; } },
    { text: 'Drive past', hint: '', do(s, c) { return 'Eleven cars in a ring in the middle of a desert, going by at sixty. Nobody suggests stopping twice.'; } },
  ],
},

/* ---------------- GREEN RIVER — the second fork ---------------- */
{
  id: 'nd_granger', cat: 'landmark', art: 'lm_town',
  text: 'Castle Rock stands over the town like a piece of stage scenery and the Green River goes south under the railroad bridge toward a canyon. There are trona mines a thousand feet under all of this and the headframes are still standing. The road forks: mountains, or Utah.',
  choices: [
    { text: 'Trade in town', hint: 'supplies', show: (s) => s.inv.cash > 40 || s.inv.goods > 0,
      do(s, c) { X.delay(s, c, 0.3);
        if (ZT.roll(s, 0.7)) {
          if (s.inv.goods > 0) { const g = Math.min(s.inv.goods, 5); X.take(s, c, 'goods', g); X.give(s, c, 'cash', g * 18); }
          if (s.inv.cash >= 90) { X.take(s, c, 'cash', 90); X.give(s, c, 'fuel', 12); X.give(s, c, 'food', 45); X.give(s, c, 'medicine', 1); }
          X.morale(s, c, 5);
          return 'Thirty or so people running a market out of the old mine offices, on the basis that the buildings are concrete and the road out is a bridge. They trade hard and honestly and they are extremely interested in which way you are going.'; }
        X.morale(s, c, -2); return 'The market moved on or was moved on. There is a board with prices still chalked on it and nobody to charge them.'; } },
    { text: 'Ask which road is passable', hint: 'route information',
      do(s, c) { X.delay(s, c, 0.2);
        if (ZT.roll(s, 0.7)) { s.flags.forkAdvice = true; X.morale(s, c, 3);
          return ZT.Travel.seasonShift(s) > 0.55
            ? 'A woman who drove a plow truck for the state says the Bear River road is already taking snow at the top and the Ogden road is open but Ogden is Ogden. She says it the way somebody says a thing they have decided not to argue about.'
            : 'A woman who drove a plow truck for the state says the mountain road is open and empty and beautiful, and that Ogden has food and people and everything that comes with people. She does not tell you which to take.'; }
        return 'Nobody has been either way in a month and nobody pretends otherwise.'; } },
    { text: 'Get to the fork', hint: '', do() { return 'The atlas comes out again.'; } },
  ],
},

/* ---------------- MONTPELIER ---------------- */
{
  id: 'nd_montpelier', cat: 'landmark', art: 'lm_lake',
  text: 'Bear Lake is the wrong colour for this country: a flat turquoise sheet twenty miles long, from limestone dust suspended in the water. The town at the north end has an Oregon Trail museum, a bank Butch Cassidy robbed, and about nine buildings.',
  choices: [
    { text: 'Search the town', hint: 'small but untouched',
      do(s, c) { X.delay(s, c, 0.35); X.noise(s, c, 8);
        if (ZT.roll(s, 0.75)) { X.loot(s, c, 1.2, 'food'); X.give(s, c, 'fuel', ZT.rint(s, 3, 9));
          return 'Nine buildings and nobody has been through any of them, because nobody comes this way. A grocery with the shelves half full, a farm supply, and a church basement stacked with home canning to the ceiling.'; }
        const m = someone(s); X.injure(s, c, m, 10);
        return `Nine buildings, and the fourth one is occupied. ${m.name} gets the door shut and the rest of the street is fine, which is the sort of arithmetic everyone has got used to.`; } },
    { text: 'Camp on the lake', hint: 'rest; cold',
      do(s, c) { ZT.Travel.restDay(s); X.d(c, '+1 day'); X.fatigueAll(s, c, -16); X.morale(s, c, 10);
        for (const m of ZT.State.alive(s)) { X.heal(s, c, m, 5); if (s.weather === 'cold' || s.weather === 'snow') X.hurt(s, c, m, 3, 'exposure'); }
        return 'A night on a turquoise lake at six thousand feet with the Wasatch behind it. It is beautiful and it is extremely cold and both of those things are worth recording.'; } },
    { text: 'Go straight down the Bear River', hint: '',
      do(s, c) { return 'Down the Bear River valley with the road following the water, which is what roads out here do and why they exist.'; } },
  ],
},

/* ---------------- OGDEN ---------------- */
{
  id: 'nd_ogden', cat: 'landmark', art: 'lm_city',
  text: 'The Wasatch comes straight up out of the valley floor with no foothills to speak of, and the whole length of it is city. Ogden, and south of it a hundred miles of continuous town along the front. This is the largest concentration of people you will pass, and the past tense is doing a great deal of work in that sentence.',
  choices: [
    { text: 'Run the interstate straight through', hint: 'fast; loud',
      do(s, c) { X.noise(s, c, 20); X.horde(s, c, 7); X.wear(s, c, 'body', 8);
        if (ZT.roll(s, 0.6)) return { text: 'Twenty-two miles of elevated freeway above the roofs, at speed, with the on-ramps below full of movement the entire way. Out the north side without stopping. Nobody breathes much.', then: 'nd_ogden_2' };
        const m = someone(s); X.injure(s, c, m, 16); X.wear(s, c, 'body', 14);
        return { text: `The freeway is blocked at a viaduct and the detour goes down into the street grid for nine blocks. ${m.name} takes a bottle through the side window thrown by somebody who is still alive, which is somehow worse.`, then: 'nd_ogden_2' }; } },
    { text: 'Work Union Station and the rail district', hint: 'the best salvage on the road',
      do(s, c) { X.delay(s, c, 0.6); X.noise(s, c, 20); X.horde(s, c, 5); X.fatigueAll(s, c, 12);
        if (ZT.roll(s, 0.5)) { X.loot(s, c, 1.8); X.give(s, c, 'parts', ZT.rint(s, 1, 3)); X.give(s, c, 'medicine', ZT.rint(s, 1, 2)); X.give(s, c, 'fuel', ZT.rint(s, 8, 20));
          return { text: 'Where the railroads met, and where everything the railroads carried was stored. Warehouses, a machine shop, a pharmacy on 25th Street with the cage intact. The wagon rides low leaving town.', then: 'nd_ogden_2' }; }
        const m = someone(s); X.bite(s, c, m); X.horde(s, c, 8); X.loot(s, c, 0.8);
        return { text: `You get about half of it. Then a fire door goes at the end of a loading dock and what comes through it fills the dock, and ${m.name} is at the wrong end.`, then: 'nd_ogden_2' }; } },
    { text: 'Go around the west, along the lake', hint: 'fuel and a day; safe',
      do(s, c) { X.take(s, c, 'fuel', 5); X.delay(s, c, 1); X.noise(s, c, -12);
        for (const m of ZT.State.alive(s)) X.hurt(s, c, m, 2, 'exposure');
        return { text: 'Out onto the causeway roads west of the city with the Great Salt Lake on one side: a white glare of salt flat and shallow water that smells like something died in it, which it did, in quantity, for millions of years. A day lost and nothing sees you.', then: 'nd_ogden_2' }; } },
  ],
},
{
  id: 'nd_ogden_2', cat: 'landmark', art: 'lm_city',
  text: 'North of the city the valley opens out into farm country and the road runs toward Idaho past fields that were harvested by somebody this year. There is a hand-painted sign at a county road junction: NO ROOM. NO TROUBLE EITHER. KEEP GOING NORTH AND GOOD LUCK.',
  choices: [
    { text: 'Respect it', hint: 'morale',
      do(s, c) { X.morale(s, c, 6); s.flags.goodwill = (s.flags.goodwill || 0) + 1;
        return 'You keep going north. Somebody out in the fields raises a hand as the wagon goes past and everyone in it waves back for longer than necessary.'; } },
    { text: 'Try the farms anyway', hint: 'food; a risk with the living',
      do(s, c) { X.delay(s, c, 0.3);
        if (ZT.roll(s, 0.45)) { X.give(s, c, 'food', ZT.rint(s, 25, 60)); X.morale(s, c, -2);
          return 'Two fields of unharvested field corn and a squash patch that nobody is guarding closely enough. It is theft and everybody in the wagon knows the word for it.'; }
        const m = someone(s); X.injure(s, c, m, 10); X.morale(s, c, -8);
        return `Somebody was guarding it closely enough. Nobody is killed, which is a decision they made and not one you had any part in. ${m.name} is hit with a length of pipe getting back to the wagon.`; } },
  ],
},

/* ---------------- FORT HALL — landmark 4 ---------------- */
{
  id: 'nd_forthall', cat: 'landmark', art: 'lm_fort',
  text: 'The Snake River comes out of the mountains here and turns west, and for two hundred years that turn was the most important fact in a thousand miles: the trading post where the Oregon Trail and the California Trail parted company. There is a reconstruction of the fort by the river and the real site is somewhere out under the bottomland. Beyond it, Pocatello, and beyond that the plain.',
  choices: [
    { text: 'Go into the fort', hint: 'people, probably',
      do(s, c) { X.delay(s, c, 0.4);
        if (ZT.roll(s, 0.68)) { s.flags.forthallFriends = true; X.morale(s, c, 12);
          X.give(s, c, 'food', ZT.rint(s, 30, 60));
          if (s.inv.cash >= 70) { X.take(s, c, 'cash', 70); X.give(s, c, 'fuel', 10); X.give(s, c, 'medicine', 1); }
          return { text: 'Adobe walls twelve feet high, built as a replica in 1963 and repurposed since with total seriousness. Forty people, a well, a herd, and a gate they open for you because you came from the east and they want to know what the east looks like. It takes an hour to answer and they feed you the whole time.', then: 'nd_forthall_2' }; }
        X.morale(s, c, -4);
        return { text: 'The gate is barred from the inside and a voice through it says, without hostility, that they are full and have been for months and that the water at the boat ramp is good. That is the whole conversation.', then: 'nd_forthall_2' }; } },
    { text: 'Work Pocatello instead', hint: 'a city; supplies',
      do(s, c) { X.delay(s, c, 0.5); X.noise(s, c, 14); X.horde(s, c, 3);
        if (ZT.roll(s, 0.55)) { X.loot(s, c, 1.5); X.give(s, c, 'parts', ZT.roll(s, 0.6) ? 1 : 0); X.give(s, c, 'fuel', ZT.rint(s, 5, 14));
          return { text: 'A rail town with a university in it, which means laboratories, a clinic, and eleven cafeterias. Two hours of quiet work in the right buildings and the wagon is stocked.', then: 'nd_forthall_2' }; }
        const m = someone(s); X.injure(s, c, m, 16); X.loot(s, c, 0.6);
        return { text: `The campus is walled on three sides and the one open side is where they all are. ${m.name} comes out over a fence with a torn hand and half a bag.`, then: 'nd_forthall_2' }; } },
    { text: 'Camp on the Snake and go on in the morning', hint: 'rest',
      do(s, c) { ZT.Travel.restDay(s); X.d(c, '+1 day'); X.fatigueAll(s, c, -18);
        for (const m of ZT.State.alive(s)) { X.heal(s, c, m, 7); if (m.illness) m.illness = Math.max(0, m.illness - 15); }
        X.give(s, c, 'food', ZT.rint(s, 6, 18)); X.morale(s, c, 6);
        return { text: 'A gravel bar on the Snake with cold clear water and a fire of driftwood, and somebody catches three trout with a hand line and a grasshopper. It is the last easy night on this road and it feels like it.', then: 'nd_forthall_2' }; } },
  ],
},
{
  id: 'nd_forthall_2', cat: 'landmark', art: 'lm_fort',
  text: 'The last question on the road is the one they asked here for eighty years: which way around the desert. South along the river through the towns, or north across the lava. The people at the fort have opinions and they do not agree with each other.',
  choices: [
    { text: 'Hear them out', hint: 'route information',
      do(s, c) { X.delay(s, c, 0.2); s.flags.snakeAdvice = true;
        return 'The old man says the lava road is empty and that empty is the only thing worth having now. The woman who actually drove it says empty means no water, no fuel, no help, and a hundred and eighty miles where a broken axle is the end of the conversation. They are both right and they both know it.'; } },
    { text: 'Get to the fork', hint: '', do() { return 'The atlas, one more time.'; } },
  ],
},

/* ---------------- ARCO ---------------- */
{
  id: 'nd_arco', cat: 'landmark', art: 'lm_lava',
  text: 'ARCO — FIRST CITY IN THE WORLD LIT BY ATOMIC POWER, says the sign, and it is true: an experimental reactor out on the desert threw the switch here in 1955. The reactor site is twenty miles east. South and west of town the ground turns black and stays black for sixty miles.',
  choices: [
    { text: 'Search the town', hint: 'small; quiet',
      do(s, c) { X.delay(s, c, 0.3); X.noise(s, c, 6);
        if (ZT.roll(s, 0.72)) { X.loot(s, c, 1.0, 'fuel'); return 'Nine hundred people lived here and most of them left in vehicles, which means the town was emptied rather than fought over. A fuel depot for the reactor site with drums still on the rack.'; }
        return 'Emptied, and thoroughly, and by people who packed properly. There is a note taped in a store window listing what they took and where they went, out of what looks like sheer habit.'; } },
    { text: 'Look at the lava field before committing', hint: 'route knowledge',
      do(s, c) { X.delay(s, c, 0.25);
        if (ZT.roll(s, X.p(s, 0.65, 'scout', 0.2))) { s.flags.lavaRead = true; X.morale(s, c, 4);
          return 'From a cinder cone at the edge of it the whole field is visible: black rock in frozen waves out to the horizon, with the road a single grey line across it and not one thing moving anywhere on it. It is the most reassuring landscape anyone has seen in a year.'; }
        for (const m of ZT.State.alive(s)) X.fatigue(s, c, m, 8);
        return 'The climb up the cinder cone is loose black gravel that takes two steps back for every three and shreds boots. From the top you can see that the road goes across it. That is all anybody learns.'; } },
    { text: 'Fill everything and go', hint: 'prepare for the crossing',
      do(s, c) { X.delay(s, c, 0.2); X.give(s, c, 'fuel', ZT.rint(s, 4, 10)); s.flags.lavaReady = true;
        for (const m of ZT.State.alive(s)) X.heal(s, c, m, 3);
        return 'Every container filled, the radiator topped, the spare checked twice. There is nothing between here and Mountain Home and everyone has understood that.'; } },
  ],
},

/* ---------------- TWIN FALLS ---------------- */
{
  id: 'nd_twinfalls', cat: 'landmark', art: 'lm_canyon',
  text: 'The road crosses the Snake River Canyon on a single steel arch five hundred feet above the water, and the canyon comes out of nowhere: farmland, farmland, farmland, then a five-hundred-foot hole in the ground with a river at the bottom. Upstream the falls are still running.',
  choices: [
    { text: 'Cross the bridge', hint: 'fast; committed',
      do(s, c) { X.noise(s, c, 6);
        if (ZT.roll(s, 0.78)) return { text: 'Fourteen hundred feet of steel arch with nothing under it. The wagon goes over at forty and nobody looks down except the person who cannot help it.', then: 'nd_twinfalls_2' };
        X.delay(s, c, 0.4); const m = someone(s); X.fatigue(s, c, m, 15);
        return { text: 'There is a car across the bridge deck at the midpoint, and moving it means standing on a bridge five hundred feet above a river with a crowd gathering at the far abutment. It takes twenty minutes and it takes something out of everybody.', then: 'nd_twinfalls_2' }; } },
    { text: 'Work the town first', hint: 'good farm country',
      do(s, c) { X.delay(s, c, 0.45); X.noise(s, c, 12);
        if (ZT.roll(s, 0.62)) { X.loot(s, c, 1.4, 'food'); X.give(s, c, 'fuel', ZT.rint(s, 4, 12));
          return { text: 'Irrigated farm country with a food processing plant on the edge of town, and the plant has a warehouse. Beans, potato flakes, and forty cases of something in unlabelled cans that turns out to be sweetcorn.', then: 'nd_twinfalls_2' }; }
        const m = someone(s); X.bite(s, c, m); X.horde(s, c, 4);
        return { text: `The processing plant is a single open floor and a lot of it is behind you before anybody realises how much of it there is. ${m.name} goes down between two pallets and comes back up bitten.`, then: 'nd_twinfalls_2' }; } },
    { text: 'Go down to the river', hint: 'water; time',
      do(s, c) { X.delay(s, c, 0.4); X.fatigueAll(s, c, 10);
        for (const m of ZT.State.alive(s)) { X.heal(s, c, m, 8); X.fatigue(s, c, m, -12); if (m.illness) m.illness = Math.max(0, m.illness - 15); }
        X.morale(s, c, 8);
        return { text: 'A switchback road to the canyon floor and a green river running fast at the bottom of five hundred feet of basalt. Nothing gets down here that does not mean to. Everyone washes and drinks and lies on hot rock for an hour.', then: 'nd_twinfalls_2' }; } },
  ],
},
{
  id: 'nd_twinfalls_2', cat: 'landmark', art: 'lm_canyon',
  text: 'West of town the road follows the rim to Glenns Ferry, where the Oregon Trail crossed the Snake at three small islands and where a great many people who came this way did not get across. There is a state park there now and a boat ramp.',
  choices: [
    { text: 'Stop at Three Island Crossing', hint: 'morale; supplies',
      do(s, c) { X.delay(s, c, 0.3); X.morale(s, c, 8); X.loot(s, c, 0.7);
        return 'A grass campground, an interpretive centre, and three low green islands in a wide brown river. There is a plaque about how many wagons were lost here, and reading it while standing exactly where it happened, on the way west, in a station wagon, is a strange thing to do and everybody does it.'; } },
    { text: 'Push on for Mountain Home', hint: 'miles',
      do(s, c) { s.legMiles = Math.min(s.legMiles + 12, 108); X.d(c, '+12 miles'); X.fatigueAll(s, c, 6);
        return 'Straight on into the sun with the river on the right. Forty miles of it before anybody suggests stopping.'; } },
  ],
},

/* ---------------- MOUNTAIN HOME ---------------- */
{
  id: 'nd_mtnhome', cat: 'landmark', art: 'lm_base',
  text: 'The air base is south of town behind eleven miles of chain link, and there is a light on in the tower. Not a fire. An electric light, burning steadily, which means a generator, which means fuel and somebody to run it. Boise is forty-five miles up the road.',
  choices: [
    { text: 'Go to the gate', hint: 'the last people before Boise',
      do(s, c) { X.delay(s, c, 0.4);
        if (ZT.roll(s, 0.7)) { X.morale(s, c, 14); s.flags.baseContact = true;
          X.give(s, c, 'fuel', ZT.rint(s, 10, 20)); X.give(s, c, 'food', ZT.rint(s, 20, 40)); X.give(s, c, 'medicine', 1);
          return { text: 'Two people at a gate with rifles they do not raise, and a radio. They confirm it: Boise is holding. One road in up the valley, a fence on the foothills, and they have talked to somebody there this week. They top up the tank and will not take anything for it and tell you to go tonight while the road is quiet.', then: 'nd_mtnhome_2' }; }
        X.morale(s, c, -6);
        return { text: 'The light is on a timer and has been for a year. There is nobody on the base. The tower door is open and the room at the top of it has a chair in it facing west and nothing else at all.', then: 'nd_mtnhome_2' }; } },
    { text: 'Search the base', hint: 'fuel and supplies; a big empty place',
      do(s, c) { X.delay(s, c, 0.5); X.noise(s, c, 12); X.fatigueAll(s, c, 10);
        if (ZT.roll(s, 0.55)) { X.give(s, c, 'fuel', ZT.rint(s, 12, 28)); X.give(s, c, 'ammo', ZT.rint(s, 30, 80)); X.loot(s, c, 1.0);
          return { text: 'A fuel farm with a hand pump rig already fitted by somebody who came before, a commissary that has been half emptied, and a clinic that has not been touched. Whoever did this was systematic and left the pump.', then: 'nd_mtnhome_2' }; }
        const m = someone(s); X.injure(s, c, m, 14); X.horde(s, c, 4);
        return { text: `Eleven miles of open hardstand is a bad place to be caught in and everyone finds that out at the same moment. ${m.name} is last into the wagon.`, then: 'nd_mtnhome_2' }; } },
    { text: 'Do not stop. Forty-five miles to go.', hint: '',
      do(s, c) { X.morale(s, c, 4);
        return { text: 'The light in the tower goes past on the left and stays in the mirror for a long time and nobody says a word about stopping.', then: 'nd_mtnhome_2' }; } },
  ],
},
{
  id: 'nd_mtnhome_2', cat: 'landmark', art: 'lm_base',
  text: 'Forty-five miles. The desert starts to break up into irrigated ground and then into orchards, and there are lights ahead that are not fires, and the interstate signs start counting down a city that is supposed to be dead.',
  choices: [
    { text: 'Go', hint: 'the last stretch',
      do(s, c) { X.morale(s, c, 10); s.flags.lastRun = true;
        return 'Nobody suggests camping. Nobody suggests scavenging. The wagon goes up the valley in the dark with everybody awake.'; } },
    { text: 'Wait for first light', hint: 'a day; arrive able to stand',
      do(s, c) { ZT.Travel.restDay(s); X.d(c, '+1 day'); X.fatigueAll(s, c, -20); X.morale(s, c, 6);
        for (const m of ZT.State.alive(s)) X.heal(s, c, m, 8);
        return 'A cold camp in an orchard forty-five miles out, and everybody sleeps properly for the first time in weeks, and in the morning everybody washes and puts on whatever is cleanest. If there is going to be a gate, you would rather arrive at it looking like people.'; } },
  ],
},
]);
})();
