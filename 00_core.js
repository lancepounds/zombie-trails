/* ZOMBIE TRAILS — core: namespace, RNG, constants, helpers
   Engine files (00–89) are DOM-free so the simulation harness can run them in Node. */
'use strict';
const ZT = (globalThis.ZT = globalThis.ZT || {});
ZT.SAVE_VERSION = 1;
ZT.TITLE = 'ZOMBIE TRAILS';

/* ---------- seeded RNG (mulberry32), state lives on the game object ---------- */
ZT.rand = function (s) {
  s.rng = (s.rng + 0x6D2B79F5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
ZT.roll = (s, p) => ZT.rand(s) < p;
ZT.rint = (s, a, b) => a + Math.floor(ZT.rand(s) * (b - a + 1));
ZT.pick = (s, arr) => arr[Math.floor(ZT.rand(s) * arr.length)];
ZT.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
ZT.round1 = (v) => Math.round(v * 10) / 10;

/* ---------- calendar ---------- */
ZT.START_MONTH = 8; // September (0-based)
ZT.MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
ZT.MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
ZT.dateOf = function (day) {
  let d = day - 1, m = ZT.START_MONTH;
  while (d >= ZT.MONTH_DAYS[m]) { d -= ZT.MONTH_DAYS[m]; m = (m + 1) % 12; }
  return ZT.MONTHS[m] + ' ' + (d + 1);
};

/* ---------- regions ----------
   A region is the character of one stretch of road: how thick the dead are, how good
   the surface is, what the weather does, and what is worth searching for. Legs in
   05_route.js name the region they run through. */
ZT.REGIONS = {
  missouri:  { name: 'the Missouri bottoms',   density: 0.30, road: 0.92, terrain: 'farm',     fuelEff: 1.0,  wear: 1.0,
               weather: { clear: 6, rain: 3, fog: 2, heat: 1, storm: 2, cold: 0, snow: 0 },
               loot: { food: 4, fuel: 2, medicine: 2, ammo: 1, parts: 1, tools: 1, goods: 2 } },
  platte:    { name: 'the Platte Road',        density: 0.46, road: 0.80, terrain: 'highway',  fuelEff: 1.0,  wear: 1.2,
               weather: { clear: 6, rain: 3, fog: 2, heat: 2, storm: 2, cold: 1, snow: 0 },
               loot: { food: 3, fuel: 4, medicine: 1, ammo: 2, parts: 2, tools: 2, goods: 2 } },
  sandhills: { name: 'the North Platte valley', density: 0.22, road: 0.84, terrain: 'river',    fuelEff: 1.0,  wear: 1.0,
               weather: { clear: 6, rain: 2, fog: 2, heat: 2, storm: 2, cold: 1, snow: 0 },
               loot: { food: 4, fuel: 1, medicine: 1, ammo: 2, parts: 1, tools: 2, goods: 1 } },
  panhandle: { name: 'the panhandle',          density: 0.34, road: 0.90, terrain: 'plains',   fuelEff: 1.03, wear: 1.05,
               weather: { clear: 6, rain: 2, fog: 1, heat: 2, storm: 2, cold: 2, snow: 0 },
               loot: { food: 3, fuel: 3, medicine: 1, ammo: 2, parts: 2, tools: 1, goods: 2 } },
  laramie:   { name: 'the Laramie Range',      density: 0.40, road: 0.78, terrain: 'hills',    fuelEff: 0.90, wear: 1.35,
               weather: { clear: 4, rain: 2, fog: 2, heat: 1, storm: 2, cold: 3, snow: 2 },
               loot: { food: 2, fuel: 3, medicine: 2, ammo: 2, parts: 2, tools: 2, goods: 2 } },
  powder:    { name: 'the Wyoming plains',     density: 0.16, road: 0.86, terrain: 'plains',   fuelEff: 1.02, wear: 1.1,
               weather: { clear: 5, rain: 1, fog: 1, heat: 2, storm: 2, cold: 3, snow: 1 },
               loot: { food: 2, fuel: 1, medicine: 1, ammo: 2, parts: 1, tools: 1, goods: 1 } },
  divide:    { name: 'the Great Divide Basin', density: 0.12, road: 0.80, terrain: 'desert',   fuelEff: 0.95, wear: 1.25,
               weather: { clear: 4, rain: 1, fog: 0, heat: 2, storm: 2, cold: 4, snow: 2 },
               loot: { food: 1, fuel: 2, medicine: 1, ammo: 1, parts: 1, tools: 1, goods: 1 } },
  bear:      { name: 'the Bear River country', density: 0.24, road: 0.62, terrain: 'mountain', fuelEff: 0.76, wear: 1.55,
               weather: { clear: 3, rain: 2, fog: 2, heat: 0, storm: 2, cold: 4, snow: 4 },
               loot: { food: 2, fuel: 1, medicine: 1, ammo: 1, parts: 1, tools: 1, goods: 1 } },
  wasatch:   { name: 'the Wasatch front',      density: 0.72, road: 0.82, terrain: 'suburb',   fuelEff: 0.92, wear: 1.2,
               weather: { clear: 4, rain: 2, fog: 2, heat: 1, storm: 2, cold: 3, snow: 2 },
               loot: { food: 3, fuel: 3, medicine: 3, ammo: 3, parts: 3, tools: 2, goods: 3 } },
  lava:      { name: 'the lava plain',         density: 0.10, road: 0.74, terrain: 'desert',   fuelEff: 0.94, wear: 1.4,
               weather: { clear: 5, rain: 1, fog: 0, heat: 3, storm: 1, cold: 3, snow: 2 },
               loot: { food: 1, fuel: 1, medicine: 1, ammo: 1, parts: 1, tools: 1, goods: 1 } },
  snake:     { name: 'the Snake River plain',  density: 0.44, road: 0.90, terrain: 'river',    fuelEff: 1.0,  wear: 1.0,
               weather: { clear: 5, rain: 2, fog: 2, heat: 2, storm: 1, cold: 2, snow: 1 },
               loot: { food: 4, fuel: 3, medicine: 2, ammo: 2, parts: 2, tools: 2, goods: 2 } },
  owyhee:    { name: 'the Boise valley',       density: 0.36, road: 0.92, terrain: 'desert',   fuelEff: 1.0,  wear: 1.0,
               weather: { clear: 5, rain: 2, fog: 1, heat: 2, storm: 1, cold: 2, snow: 1 },
               loot: { food: 3, fuel: 2, medicine: 1, ammo: 2, parts: 1, tools: 1, goods: 2 } },
};

/* ---------- difficulty ---------- */
ZT.DIFF = {
  easy:      { name: 'Story',     cash: 950,  salvage: 0.95, horde: 0.9, wear: 0.95, infect: 0.8, harsh: 0.8, score: 0.5,
               blurb: 'Generous money, milder infections, more salvage. For learning the road.' },
  normal:    { name: 'Normal',    cash: 640,  salvage: 0.58, horde: 1.45, wear: 1.5, infect: 1.35, harsh: 1.0, score: 1.0,
               blurb: 'Balanced scarcity. A serious setback or two can be survived.' },
  hard:      { name: 'Hard',      cash: 465,  salvage: 0.495, horde: 1.70, wear: 1.75, infect: 1.46, harsh: 1.2, score: 1.5,
               blurb: 'Less money, harsher events, faster hordes. The car matters.' },
  nightmare: { name: 'Nightmare', cash: 330,  salvage: 0.40, horde: 2.0, wear: 2.0, infect: 1.65, harsh: 1.4, score: 2.0,
               blurb: 'Unforgiving but fair. For people who have already died a lot.' },
};

/* ---------- supplies ---------- */
ZT.ITEMS = {
  food:     { name: 'Food',        unit: 'lbs',    price: 0.5,  cap: 900, step: 50, lbs: 1,
              tip: 'A person eats about 2 lbs a day on normal rations.' },
  fuel:     { name: 'Fuel',        unit: 'gal',    price: 3.0,  cap: 60,  step: 5,  lbs: 6,
              tip: 'The wagon gets about 18 miles to the gallon on a good day. Tank and cans hold 60.' },
  medicine: { name: 'Medicine',    unit: 'kits',   price: 25,   cap: 20,  step: 1,  lbs: 2,
              tip: 'Treats injury, illness and bites. Never enough of it.' },
  ammo:     { name: 'Ammunition',  unit: 'rounds', price: 0.5,  cap: 300, step: 20, lbs: 0.1,
              tip: 'Loud. Solves some problems and causes others.' },
  parts:    { name: 'Spare parts', unit: 'sets',   price: 60,   cap: 6,   step: 1,  lbs: 25,
              tip: 'Belts, hoses, plugs, a patched tire. One set fixes one breakdown.' },
  tools:    { name: 'Tool kits',   unit: 'kits',   price: 40,   cap: 3,   step: 1,  lbs: 15,
              tip: 'Make repairs and scavenging go better. Easy to lose in a ditch.' },
  goods:    { name: 'Trade goods', unit: 'lots',   price: 10,   cap: 30,  step: 1,  lbs: 5,
              tip: 'Batteries, liquor, cigarettes, coffee. Currency where money is not.' },
};
ZT.ITEM_ORDER = ['food', 'fuel', 'medicine', 'ammo', 'parts', 'tools', 'goods'];

ZT.PACE = {
  cautious: { name: 'Cautious',   mpd: 27, fuelEff: 1.10, wear: 0.6, fatigue: 2, noise: 0, enc: 0.75, accident: 0.6 },
  steady:   { name: 'Steady',     mpd: 39, fuelEff: 1.00, wear: 1.0, fatigue: 5, noise: 2, enc: 1.0,  accident: 1.0 },
  hard:     { name: 'Hard push',  mpd: 54, fuelEff: 0.78, wear: 2.2, fatigue: 10, noise: 6, enc: 1.1,  accident: 1.8 },
};
ZT.RATIONS = {
  full:   { name: 'Full',   lbs: 3.0, heal: 2,  morale: 1,  fatigue: -1 },
  normal: { name: 'Normal', lbs: 2.0, heal: 1,  morale: 0,  fatigue: 0 },
  meager: { name: 'Meager', lbs: 1.2, heal: -1, morale: -1, fatigue: 3 },
};
ZT.WEATHER = {
  clear: { name: 'Clear',   speed: 1.0,  vis: 1.0, wear: 1.0, health: 0,  fatigue: 0 },
  rain:  { name: 'Rain',    speed: 0.85, vis: 0.7, wear: 1.2, health: 0,  fatigue: 1 },
  storm: { name: 'Storm',   speed: 0.6,  vis: 0.5, wear: 1.5, health: -2, fatigue: 3 },
  heat:  { name: 'Heat',    speed: 0.95, vis: 1.0, wear: 1.2, health: -1, fatigue: 2 },
  cold:  { name: 'Cold',    speed: 0.9,  vis: 0.9, wear: 1.1, health: -2, fatigue: 2 },
  fog:   { name: 'Fog',     speed: 0.8,  vis: 0.4, wear: 1.0, health: 0,  fatigue: 1 },
  snow:  { name: 'Snow',    speed: 0.5,  vis: 0.6, wear: 1.4, health: -3, fatigue: 4 },
};
ZT.ROLES = ['driver', 'medic', 'mechanic', 'scout', 'generalist'];
ZT.ROLE_TIPS = {
  driver: 'Fewer accidents, a few more miles a day.',
  medic: 'Better odds when treating wounds and bites.',
  mechanic: 'Better odds on roadside repairs.',
  scout: 'Spots trouble earlier; better scavenging.',
  generalist: 'No bonus, no weakness. Steady.',
};
ZT.DEFAULT_NAMES = ['Mara', 'Dez', 'Holloway', 'June', 'Pike'];
ZT.NAME_POOL = ['Mara', 'Dez', 'Holloway', 'June', 'Pike', 'Ruth', 'Tobias', 'Wren', 'Cal', 'Ingrid', 'Ozzie', 'Lupe',
  'Harlan', 'Nadia', 'Booker', 'Sal', 'Odette', 'Grady', 'Fern', 'Marcus', 'Tess', 'Roy', 'Perpetua', 'Lyle', 'Aggie',
  'Vic', 'Corinne', 'Amos', 'Delia', 'Ike', 'Rosalind', 'Otis', 'Beth', 'Kwame', 'Sunny', 'Dale', 'Yusuf', 'Pearl'];

/* ---------- small formatting helpers ---------- */
ZT.n = (v) => (Math.round(v * 10) / 10).toString();
ZT.money = (v) => '$' + Math.round(v).toLocaleString('en-US');
ZT.list = (arr) => (arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1]);
ZT.plural = (n, one, many) => (n === 1 ? one : (many || one + 's'));
ZT.cap = (str) => str.charAt(0).toUpperCase() + str.slice(1);
