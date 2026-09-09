/* ZOMBIE TRAILS — the road from Omaha to Boise.
   A real route graph. Every node is a real place at its real latitude and longitude,
   every leg is a real road at roughly its real length, and the branches are the
   choices a driver actually has between the Missouri River and the Boise valley.

   The historic Oregon Trail ran this way: up the Platte, past Chimney Rock and Fort
   Laramie, along the Sweetwater to South Pass, down to Fort Hall and the Snake. The
   interstates run a parallel line to the south. The map has both. */
'use strict';

/* ---------- nodes ---------- */
ZT.NODES = {
  omaha:      { name: 'Omaha',              sub: 'Nebraska',              lat: 41.26, lon: -95.93, kind: 'start' },
  kearney:    { name: 'Fort Kearny',        sub: 'Nebraska',              lat: 40.70, lon: -99.08, kind: 'landmark' },
  ogallala:   { name: 'Ogallala',           sub: 'Nebraska',              lat: 41.13, lon: -101.72, kind: 'fork' },
  chimney:    { name: 'Chimney Rock',       sub: 'Nebraska panhandle',    lat: 41.70, lon: -103.35, kind: 'landmark' },
  cheyenne:   { name: 'Cheyenne',           sub: 'Wyoming',               lat: 41.14, lon: -104.82, kind: 'landmark' },
  casper:     { name: 'Casper',             sub: 'Wyoming',               lat: 42.85, lon: -106.31, kind: 'stop' },
  rawlins:    { name: 'Rawlins',            sub: 'Wyoming',               lat: 41.79, lon: -107.24, kind: 'stop' },
  divide_n:   { name: 'South Pass',         sub: 'Wyoming — 7,412 ft',    lat: 42.36, lon: -108.90, kind: 'landmark' },
  divide_s:   { name: 'Creston Divide',     sub: 'Wyoming — Red Desert',  lat: 41.72, lon: -107.80, kind: 'landmark' },
  granger:    { name: 'Green River',        sub: 'Wyoming',               lat: 41.52, lon: -109.47, kind: 'fork' },
  montpelier: { name: 'Montpelier',         sub: 'Idaho — Bear Lake',     lat: 42.32, lon: -111.30, kind: 'stop' },
  ogden:      { name: 'Ogden',              sub: 'Utah',                  lat: 41.22, lon: -111.97, kind: 'stop' },
  forthall:   { name: 'Fort Hall',          sub: 'Idaho — Pocatello',     lat: 42.87, lon: -112.45, kind: 'landmark' },
  arco:       { name: 'Arco',               sub: 'Idaho — the lava',      lat: 43.63, lon: -113.30, kind: 'stop' },
  twinfalls:  { name: 'Twin Falls',         sub: 'Idaho — Snake River',   lat: 42.56, lon: -114.46, kind: 'stop' },
  mtnhome:    { name: 'Mountain Home',      sub: 'Idaho',                 lat: 43.13, lon: -115.69, kind: 'stop' },
  boise:      { name: 'BOISE',              sub: 'Idaho — the safe zone', lat: 43.61, lon: -116.20, kind: 'end' },
};

/* ---------- legs ----------
   from → to, miles, region profile, and the road it actually is. */
ZT.LEGS = [
  { from: 'omaha',      to: 'kearney',    miles: 195, region: 'missouri',  road: 'I-80 west along the Platte' },
  { from: 'kearney',    to: 'ogallala',   miles: 160, region: 'platte',    road: 'I-80 — the Platte Road' },

  /* fork 1 — the Oregon Trail road, or the interstate */
  { from: 'ogallala',   to: 'chimney',    miles: 120, region: 'sandhills', road: 'US-26 up the North Platte' },
  { from: 'chimney',    to: 'casper',     miles: 210, region: 'powder',    road: 'US-26 past Fort Laramie' },
  { from: 'casper',     to: 'divide_n',   miles: 160, region: 'powder',    road: 'WY-220 along the Sweetwater' },
  { from: 'divide_n',   to: 'granger',    miles: 95,  region: 'divide',    road: 'WY-28 down to the Green' },

  { from: 'ogallala',   to: 'cheyenne',   miles: 160, region: 'panhandle', road: 'I-80 through Sidney' },
  { from: 'cheyenne',   to: 'rawlins',    miles: 150, region: 'laramie',   road: 'I-80 over the Laramie Range' },
  { from: 'rawlins',    to: 'divide_s',   miles: 45,  region: 'divide',    road: 'I-80 into the Red Desert' },
  { from: 'divide_s',   to: 'granger',    miles: 100, region: 'divide',    road: 'I-80 across the basin' },

  /* fork 2 — the Bear River mountains, or Ogden and the Wasatch front */
  { from: 'granger',    to: 'montpelier', miles: 120, region: 'bear',      road: 'US-30 — the Lander Road' },
  { from: 'montpelier', to: 'forthall',   miles: 110, region: 'bear',      road: 'US-30 down the Bear River' },

  { from: 'granger',    to: 'ogden',      miles: 140, region: 'wasatch',   road: 'I-80 to Evanston and down' },
  { from: 'ogden',      to: 'forthall',   miles: 155, region: 'wasatch',   road: 'I-15 north through Tremonton' },

  /* fork 3 — the lava desert, or the Snake River canyon */
  { from: 'forthall',   to: 'arco',       miles: 90,  region: 'lava',      road: 'US-20/26 across the lava' },
  { from: 'arco',       to: 'mtnhome',    miles: 180, region: 'lava',      road: 'US-20 over the high desert' },

  { from: 'forthall',   to: 'twinfalls',  miles: 125, region: 'snake',     road: 'I-84 along the Snake' },
  { from: 'twinfalls',  to: 'mtnhome',    miles: 110, region: 'snake',     road: 'I-84 past Glenns Ferry' },

  { from: 'mtnhome',    to: 'boise',      miles: 45,  region: 'owyhee',    road: 'I-84 into the valley' },
];

ZT.START_NODE = 'omaha';
ZT.END_NODE = 'boise';

/* ---------- graph helpers ---------- */
ZT.legsFrom = (id) => ZT.LEGS.filter((l) => l.from === id);
ZT.legBetween = (a, b) => ZT.LEGS.find((l) => l.from === a && l.to === b) || null;

/* shortest remaining distance to Boise from a node (Dijkstra on a tiny DAG) */
ZT.distToEnd = (function () {
  const memo = {};
  return function dist(id) {
    if (id === ZT.END_NODE) return 0;
    if (memo[id] != null) return memo[id];
    memo[id] = Infinity;                       // guards a cycle; the graph has none
    let best = Infinity;
    for (const l of ZT.legsFrom(id)) best = Math.min(best, l.miles + dist(l.to));
    memo[id] = best;
    return best;
  };
})();
/* the longest a run can be, for the progress bar's outer bound */
ZT.LONGEST = (function () {
  const memo = {};
  function far(id) {
    if (id === ZT.END_NODE) return 0;
    if (memo[id] != null) return memo[id];
    let best = 0;
    for (const l of ZT.legsFrom(id)) best = Math.max(best, l.miles + far(l.to));
    memo[id] = best;
    return best;
  }
  return far(ZT.START_NODE);
})();
ZT.SHORTEST = ZT.distToEnd(ZT.START_NODE);

/* how far along the whole journey the player is, 0..1 — by distance still to run,
   so taking the long way does not make the bar go backwards */
ZT.progress = function (s) {
  const remain = ZT.milesToEnd(s);
  return ZT.clamp(1 - remain / ZT.SHORTEST, 0, 1);
};
ZT.milesToEnd = function (s) {
  const leg = ZT.currentLeg(s);
  if (!leg) return ZT.distToEnd(s.at);
  return (leg.miles - s.legMiles) + ZT.distToEnd(leg.to);
};
ZT.currentLeg = (s) => (s.legTo ? ZT.legBetween(s.at, s.legTo) : null);
ZT.regionId = (s) => { const l = ZT.currentLeg(s); return l ? l.region : (ZT.NODES[s.at].kind === 'end' ? 'owyhee' : 'missouri'); };
ZT.region = (s) => ZT.REGIONS[ZT.regionId(s)];

/* can you still get from a to b by any road? */
ZT.reachable = function (from, target) {
  if (from === target) return true;
  const seen = {}, stack = [from];
  while (stack.length) {
    const id = stack.pop();
    if (seen[id]) continue;
    seen[id] = true;
    for (const l of ZT.legsFrom(id)) { if (l.to === target) return true; stack.push(l.to); }
  }
  return false;
};

/* the node the player is driving toward, for the status bar */
ZT.nextNode = function (s) {
  const l = ZT.currentLeg(s);
  return ZT.NODES[l ? l.to : s.at];
};
ZT.milesToNext = function (s) {
  const l = ZT.currentLeg(s);
  return l ? Math.max(0, Math.round(l.miles - s.legMiles)) : 0;
};

/* interpolated position (lat/lon) along the current leg — the map marker */
ZT.position = function (s) {
  const l = ZT.currentLeg(s);
  const a = ZT.NODES[s.at];
  if (!l) return { lat: a.lat, lon: a.lon };
  const b = ZT.NODES[l.to];
  const t = ZT.clamp(s.legMiles / l.miles, 0, 1);
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
};

/* compass bearing of travel, for the map's sense of direction */
ZT.heading = function (s) {
  const l = ZT.currentLeg(s);
  if (!l) return 'W';
  const a = ZT.NODES[s.at], b = ZT.NODES[l.to];
  const dx = (b.lon - a.lon) * Math.cos((a.lat * Math.PI) / 180);
  const dy = b.lat - a.lat;
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg + 360) % 360) / 45) % 8];
};

/* ---------- geography, for the map ----------
   Real coordinates. Most western state lines are meridians and parallels, which is
   why this reads as a real map with so few points. */
ZT.GEO = {
  states: [
    { id: 'NE', name: 'NEBRASKA', label: [42.3, -99.9], pts: [
      [40, -95.35], [40, -102.05], [41, -102.05], [41, -104.05], [43, -104.05], [43, -98.5],
      [42.85, -97.95], [42.85, -97.2], [42.5, -96.4], [42.0, -96.1], [40.6, -95.7], [40, -95.35]] },
    { id: 'WY', name: 'WYOMING', label: [43.9, -107.4], pts: [
      [41, -104.05], [41, -111.05], [45, -111.05], [45, -104.05], [41, -104.05]] },
    { id: 'CO', name: 'COLORADO', label: [39.3, -105.4], pts: [
      [37, -102.05], [41, -102.05], [41, -109.05], [37, -109.05], [37, -102.05]] },
    { id: 'UT', name: 'UTAH', label: [39.3, -111.9], pts: [
      [37, -109.05], [41, -109.05], [41, -111.05], [42, -111.05], [42, -114.05], [37, -114.05], [37, -109.05]] },
    { id: 'ID', name: 'IDAHO', label: [44.9, -114.9], pts: [
      [42, -111.05], [42, -117.03], [44.3, -117.03], [45.0, -116.7], [46.2, -116.9],
      [46.2, -114.4], [45.6, -114.35], [44.5, -113.0], [44.5, -111.05], [42, -111.05]] },
    { id: 'SD', name: 'S. DAKOTA', label: [44.7, -100.8], pts: [
      [43, -104.05], [45.94, -104.05], [45.94, -96.55], [44.2, -96.45], [43.5, -96.45],
      [42.85, -97.95], [43, -98.5], [43, -104.05]] },
    { id: 'MT', name: 'MONTANA', label: [45.6, -108.5], pts: [
      [45, -104.05], [45, -111.05], [44.5, -111.05], [44.5, -113.0], [45.6, -114.35], [46.2, -114.4],
      [46.2, -104.05], [45, -104.05]] },
    { id: 'KS', name: 'KANSAS', label: [38.9, -98.6], pts: [
      [37, -102.05], [40, -102.05], [40, -94.6], [37, -94.6], [37, -102.05]] },
    { id: 'IA', name: 'IOWA', label: [42.0, -94.0], pts: [
      [40.6, -95.7], [42.0, -96.1], [42.5, -96.4], [43.5, -96.45], [43.5, -93.0], [40.6, -93.0], [40.6, -95.7]] },
    { id: 'OR', name: 'OREGON', label: [44.7, -118.6], pts: [
      [42, -117.03], [42, -119.5], [45.5, -119.5], [45.9, -117.0], [44.3, -117.03], [42, -117.03]] },
    { id: 'NV', name: 'NEVADA', label: [40.2, -117.0], pts: [
      [42, -114.05], [42, -119.5], [39, -119.5], [39, -114.05], [42, -114.05]] },
  ],
  rivers: [
    { name: 'Missouri',      pts: [[42.85, -97.4], [42.5, -96.4], [41.5, -96.0], [41.26, -95.93], [40.6, -95.7], [39.5, -95.0]] },
    { name: 'Platte',        pts: [[41.05, -96.1], [41.0, -97.4], [40.92, -98.34], [40.70, -99.08], [41.0, -100.1], [41.12, -100.77]] },
    { name: 'South Platte',  pts: [[41.12, -100.77], [41.13, -101.72], [40.8, -102.6], [40.5, -103.8], [40.4, -104.7]] },
    { name: 'North Platte',  pts: [[41.12, -100.77], [41.4, -102.3], [41.70, -103.35], [41.87, -103.66], [42.21, -104.52], [42.6, -105.4], [42.85, -106.31], [42.45, -106.85], [42.0, -107.0]] },
    { name: 'Sweetwater',    pts: [[42.5, -107.13], [42.5, -107.8], [42.45, -108.3], [42.36, -108.90]] },
    { name: 'Green',         pts: [[43.2, -109.85], [42.6, -109.7], [41.9, -109.45], [41.52, -109.47], [41.0, -109.6]] },
    { name: 'Bear',          pts: [[40.9, -111.3], [41.5, -111.2], [42.1, -111.30], [42.6, -111.9], [42.1, -112.1], [41.6, -112.2]] },
    { name: 'Snake',         pts: [[44.4, -111.3], [43.8, -111.8], [43.49, -112.03], [42.87, -112.45], [42.7, -113.4], [42.56, -114.46], [42.95, -115.30], [43.4, -116.4], [43.8, -117.0], [44.8, -117.0], [45.9, -116.8]] },
    { name: 'Salt Lake',     pts: [[41.6, -112.6], [41.1, -112.7], [40.8, -112.3], [41.2, -112.1], [41.6, -112.6]], closed: true },
    { name: 'Bear Lake',     pts: [[42.1, -111.35], [41.9, -111.3], [42.05, -111.25], [42.1, -111.35]], closed: true },
  ],
  ranges: [
    { name: 'Laramie Range',   at: [41.5, -105.5], w: 0.9, n: 4 },
    { name: 'Medicine Bow',    at: [41.3, -106.4], w: 0.7, n: 3 },
    { name: 'Wind River',      at: [43.0, -109.5], w: 1.1, n: 5 },
    { name: 'Big Horn',        at: [44.3, -107.3], w: 0.8, n: 4 },
    { name: 'Black Hills',     at: [44.0, -103.7], w: 0.7, n: 3 },
    { name: 'Uinta',           at: [40.75, -110.3], w: 1.0, n: 4 },
    { name: 'Wasatch',         at: [41.3, -111.6], w: 0.5, n: 4, vertical: true },
    { name: 'Sawtooth',        at: [44.1, -114.9], w: 1.0, n: 5 },
    { name: 'Bitterroot',      at: [45.5, -114.4], w: 0.8, n: 4 },
    { name: 'Owyhee',          at: [42.6, -116.6], w: 0.8, n: 3 },
    { name: 'Salmon River Mts', at: [44.7, -115.3], w: 0.9, n: 4 },
  ],
  /* map window, in degrees */
  bounds: { west: -119.6, east: -94.2, south: 37.2, north: 46.6 },
};
