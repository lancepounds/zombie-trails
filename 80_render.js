/* ZOMBIE TRAILS — monochrome renderer.
   Everything is drawn into a 320x160 buffer and blitted with nearest-neighbour
   upscaling. Palette: black ink on paper, with dithered shading. */
'use strict';
ZT.R = (function () {
const W = 320, H = 160;
// Match the shared interface and atlas palette.
let INK = '#181818', PAPER = '#e8e8e8', paletteMode = null;
let buf = null, bctx = null;
const patterns = {};

function ensure() {
  if (buf && paletteMode === ZT.Display.mode) return;
  paletteMode = ZT.Display.mode;
  ({ ink: INK, paper: PAPER } = ZT.Display.palette());
  buf = document.createElement('canvas');
  buf.width = W; buf.height = H;
  bctx = buf.getContext('2d');
  bctx.imageSmoothingEnabled = false;
  for (const [name, bits] of Object.entries({
    g25: [[1, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0], [0, 1, 0, 0]],
    g50: [[1, 0], [0, 1]],
    g75: [[1, 1, 1, 0], [1, 0, 1, 1], [1, 1, 1, 1], [0, 1, 1, 1]],
  })) {
    const p = document.createElement('canvas');
    p.width = bits[0].length; p.height = bits.length;
    const c = p.getContext('2d');
    c.fillStyle = INK;
    for (let y = 0; y < bits.length; y++) for (let x = 0; x < bits[0].length; x++) if (bits[y][x]) c.fillRect(x, y, 1, 1);
    patterns[name] = p;
  }
}

/* ---------- primitives ---------- */
function clear(c) { c.fillStyle = PAPER; c.fillRect(0, 0, W, H); }
function px(c, x, y, w, h) { c.fillStyle = INK; c.fillRect(x | 0, y | 0, w || 1, h || 1); }
function grey(c, x, y, w, h, level) {
  const p = c.createPattern(patterns[level || 'g50'], 'repeat');
  c.save(); c.fillStyle = p; c.translate(0, 0); c.fillRect(x | 0, y | 0, w | 0, h | 0); c.restore();
}
function line(c, x1, y1, x2, y2) {
  c.fillStyle = INK;
  let x = Math.round(x1), y = Math.round(y1);
  const X = Math.round(x2), Y = Math.round(y2);
  const dx = Math.abs(X - x), dy = -Math.abs(Y - y);
  const sx = x < X ? 1 : -1, sy = y < Y ? 1 : -1;
  let err = dx + dy, n = 0;
  while (n++ < 2000) {
    c.fillRect(x, y, 1, 1);
    if (x === X && y === Y) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}
function rect(c, x, y, w, h) { px(c, x, y, w, 1); px(c, x, y + h - 1, w, 1); px(c, x, y, 1, h); px(c, x + w - 1, y, 1, h); }
function circle(c, cx, cy, r, col) {
  c.fillStyle = col || INK;
  for (let a = 0; a < 64; a++) { const t = (a / 64) * Math.PI * 2; c.fillRect(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), 1, 1); }
}
function disc(c, cx, cy, r, col) {
  c.fillStyle = col || INK;
  for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y)); c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); }
}
function text(c, str, x, y, scale) {
  scale = scale || 1;
  c.save(); c.fillStyle = INK;
  c.font = `${6 * scale}px monospace`; c.textBaseline = 'top';
  c.fillText(str, x | 0, y | 0);
  c.restore();
}

/* ---------- 4x5 bitmap font: crisp at 1:1, crisp when upscaled ---------- */
const GLYPHS = {
  A:'69F99',B:'E9E9E',C:'78887',D:'E999E',E:'F8E8F',F:'F8E88',G:'78B97',H:'99F99',I:'E444E',
  J:'31196',K:'9ACA9',L:'8888F',M:'9FF99',N:'9DB99',O:'69996',P:'E9E88',Q:'699B7',R:'E9EA9',
  S:'7861E',T:'F4444',U:'99996',V:'99964',W:'99FF9',X:'99699',Y:'99644',Z:'F168F',
  '0':'6BD96','1':'4C44E','2':'E168F','3':'E161E','4':'99F11','5':'F8E1E','6':'68E96',
  '7':'F1244','8':'69696','9':'69716',
  '.':'00004',',':'00048','-':'00E00',"'":'44000','/':'12480',':':'04040',' ':'00000',
};
function tw(str) { return str.length * 5 - 1; }
function bmp(c, str, x, y, col) {
  c.fillStyle = col || INK;
  str = String(str).toUpperCase();
  for (let i = 0; i < str.length; i++) {
    const g = GLYPHS[str[i]] || GLYPHS[' '];
    for (let r = 0; r < 5; r++) {
      const bits = parseInt(g[r], 16);
      for (let b = 0; b < 4; b++) if (bits & (8 >> b)) c.fillRect((x + i * 5 + b) | 0, (y + r) | 0, 1, 1);
    }
  }
}
/* label with a knocked-out background so it stays readable over map detail */
function plate(c, str, x, y, align) {
  const w = tw(str);
  const px0 = align === 'r' ? x - w : align === 'c' ? x - Math.round(w / 2) : x;
  c.fillStyle = PAPER; c.fillRect(px0 - 1, y - 1, w + 2, 7);
  bmp(c, str, px0, y);
  return px0;
}

/* seeded per-scene noise so static scenery does not shimmer */
function hash(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }

/* ---------- shared scenery ---------- */
function ground(c, y, off) {
  px(c, 0, y, W, 1);                       // horizon
  grey(c, 0, y + 1, W, 3, 'g50');          // the verge, close to the horizon
  const o = Math.round(off || 0);
  for (let i = 0; i < 130; i++) {          // grit, scrolling with the road
    const gx = (hash(i * 1.7) * W * 2 - (o * (1 + hash(i * 5.3) * 2)) % (W * 2) + W * 2) % (W * 2) - W / 2;
    const gy = y + 5 + hash(i * 3.9) * (H - y - 6);
    if (gx > -2 && gx < W) px(c, gx, gy, 1, 1);
  }
}

function road(c, y) {
  // Two clear shoulders frame the driving surface; no floating specks or dashes.
  grey(c, 0, y - 2, W, 2, 'g25');
  px(c, 0, y, W, 1);
  px(c, 0, y + 36, W, 1);
  grey(c, 0, y + 37, W, 2, 'g25');
}

function skyline(c, seed, baseY, height, density, kind) {
  // blocky silhouettes along the horizon
  let x = -Math.floor(hash(seed) * 20);
  let i = 0;
  while (x < W) {
    const r1 = hash(seed + i * 3.7), r2 = hash(seed + i * 7.3), r3 = hash(seed + i * 11.1);
    const w = 6 + Math.floor(r1 * 22);
    const gap = 2 + Math.floor(r3 * 14 * (1 - density));
    if (r2 > 0.25) {
      const h = 4 + Math.floor(r2 * height);
      c.fillStyle = PAPER; c.fillRect(x, baseY - h, w, h);
      grey(c, x, baseY - h, w, h, 'g25');
      px(c, x, baseY - h, w, 1);
      px(c, x, baseY - h, 1, h); px(c, x + w - 1, baseY - h, 1, h);
      if (kind === 'town') { for (let wy = baseY - h + 3; wy < baseY - 2; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 4) if (hash(seed + wx * wy) > 0.55) px(c, wx, wy, 2, 2); }
      if (kind === 'industry' && r1 > 0.6) { px(c, x + 2, baseY - h - 6, 3, 6); px(c, x + w - 5, baseY - h - 4, 2, 4); }
    }
    x += w + gap; i++;
  }
}
function trees(c, seed, baseY, scale) {
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(hash(seed + i * 2.3) * (W + 20)) - 10;
    const h = (5 + hash(seed + i * 5.1) * 9) * (scale || 1);
    px(c, x, baseY - h, 1, h);
    for (let k = 0; k < 4; k++) { const yy = baseY - h + k * (h / 4); const wdt = Math.max(1, (4 - k) * 1.2 * (scale || 1)); px(c, x - wdt / 2, yy, wdt, 1); }
  }
}
function mountains(c, seed, baseY, height) {
  c.fillStyle = INK;
  let x = -10;
  while (x < W + 10) {
    const h = 12 + hash(seed + x * 0.37) * height;
    const w = 26 + hash(seed + x * 0.71) * 40;
    for (let i = 0; i <= w; i++) {
      const t = i / w;
      const y = baseY - h * (1 - Math.abs(t * 2 - 1));
      c.fillRect(Math.round(x + i), Math.round(y), 1, 1);
      if (t > 0.42 && t < 0.58 && h > height * 0.7) px(c, Math.round(x + i), Math.round(y) + 1, 1, 2);
    }
    x += w * 0.75;
  }
}
function poles(c, off, baseY) {
  for (let i = 0; i < 6; i++) {
    const x = ((i * 64 - (off % 64)) + 384) % 384 - 32;
    if (x < -8 || x > W + 8) continue;
    px(c, x, baseY - 34, 2, 34);
    px(c, x - 6, baseY - 32, 14, 1);
    px(c, x - 4, baseY - 28, 10, 1);
  }
}

/* ---------- the wagon ---------- */
function wagon(c, x, y, frame, dead) {
  // a boxy 1980s station wagon silhouette, 44x18
  c.fillStyle = INK;
  const b = (dx, dy, w, h) => c.fillRect(Math.round(x + dx), Math.round(y + dy), w, h);
  // body
  b(2, 8, 40, 7);
  b(6, 3, 26, 5);      // cabin
  b(0, 11, 44, 3);     // lower body
  // roof rack with load
  b(8, 1, 22, 1);
  b(10, 0, 4, 1); b(18, 0, 6, 1); b(26, 0, 3, 1);
  // windows (cut out)
  c.fillStyle = PAPER;
  c.fillRect(Math.round(x + 8), Math.round(y + 4), 8, 4);
  c.fillRect(Math.round(x + 18), Math.round(y + 4), 6, 4);
  c.fillRect(Math.round(x + 26), Math.round(y + 4), 4, 4);
  c.fillStyle = INK;
  // wheels
  const wy = y + 14;
  for (const wx of [x + 7, x + 33]) {
    disc(c, wx + 2, wy + 2, 3);
    c.fillStyle = PAPER;
    // spokes rotate
    const a = frame * 0.9;
    for (let k = 0; k < 4; k++) {
      const t = a + (k * Math.PI) / 2;
      c.fillRect(Math.round(wx + 2 + Math.cos(t) * 2), Math.round(wy + 2 + Math.sin(t) * 2), 1, 1);
    }
    c.fillStyle = INK;
  }
  if (dead) { // broken down: hood up, no wheels turning
    c.fillStyle = INK;
    c.fillRect(Math.round(x + 34), Math.round(y + 2), 8, 1);
    c.fillRect(Math.round(x + 41), Math.round(y + 2), 1, 6);
  }
}
function walkers(c, x, y, frame, n) {
  for (let i = 0; i < n; i++) {
    const ox = x + i * 9, ph = frame * 0.5 + i;
    figure(c, ox, y, ph, true);
  }
}
function figure(c, x, y, phase, shamble) {
  c.fillStyle = INK;
  const sway = shamble ? Math.sin(phase) * 1 : 0;
  c.fillRect(Math.round(x + 1 + sway), Math.round(y), 3, 3);       // head
  c.fillRect(Math.round(x + 1), Math.round(y + 3), 3, 6);          // body
  const l = Math.sin(phase) * 2;
  c.fillRect(Math.round(x), Math.round(y + 9), 2, 4 - Math.abs(l) * 0.5);
  c.fillRect(Math.round(x + 3), Math.round(y + 9), 2, 4 - Math.abs(l) * 0.5);
  if (shamble) { c.fillRect(Math.round(x - 1), Math.round(y + 4), 2, 1); c.fillRect(Math.round(x + 4), Math.round(y + 4), 2, 1); }
  else { c.fillRect(Math.round(x), Math.round(y + 4), 1, 4); c.fillRect(Math.round(x + 4), Math.round(y + 4), 1, 4); }
}

/* ---------- weather overlays ---------- */
function weatherFX(c, wx, t, reduce) {
  if (wx === 'rain' || wx === 'storm') {
    const n = wx === 'storm' ? 90 : 50;
    for (let i = 0; i < n; i++) {
      const x = (hash(i * 1.7) * W + t * (wx === 'storm' ? 220 : 150)) % W;
      const y = (hash(i * 3.1) * H + t * 320) % H;
      px(c, x, y, 1, 3);
    }
    if (wx === 'storm' && !reduce && Math.sin(t * 3.1) > 0.995) { c.fillStyle = PAPER; c.fillRect(0, 0, W, H); }
  } else if (wx === 'snow') {
    for (let i = 0; i < 70; i++) {
      const x = (hash(i * 2.3) * W + Math.sin(t + i) * 6 + t * 18) % W;
      const y = (hash(i * 5.9) * H + t * 40) % H;
      px(c, x, y, 1, 1);
    }
  } else if (wx === 'fog') {
    for (let y = 40; y < H; y += 3) grey(c, 0, y, W, 1, y % 6 ? 'g25' : 'g50');
  } else if (wx === 'heat') {
    for (let i = 0; i < 14; i++) { const y = 60 + i * 6; px(c, (Math.sin(t * 2 + i) * 40 + W / 2) | 0, y, 12, 1); }
  } else if (wx === 'cold') {
    for (let i = 0; i < 30; i++) { const x = (hash(i * 4.4) * W + t * 30) % W; px(c, x, hash(i * 8.8) * 50, 2, 1); }
  }
}
function vignetteScanlines(c, on) {
  if (!on) return;
  c.save(); c.globalAlpha = 0.20; c.fillStyle = PAPER;
  for (let y = 0; y < H; y += 2) c.fillRect(0, y, W, 1);
  c.restore();
}

/* ---------- scenes ---------- */
const scenes = {};

scenes.travel = function (c, s, t, opt) {
  const reg = ZT.region(s);
  const terrain = reg.terrain;
  const off = (opt.dist || 0);
  const horizon = 96;
  // sky detail
  if (s.weather === 'clear' || s.weather === 'cold') {
    for (let i = 0; i < 20; i++) { const x = hash(i * 3.3) * W, y = hash(i * 7.7) * 50; px(c, x, y, 1, 1); }
  }
  // far layer
  if (terrain === 'mountain' || terrain === 'hills') mountains(c, 11, horizon - 6, terrain === 'mountain' ? 46 : 22);
  else if (terrain === 'suburb' || terrain === 'industry' || terrain === 'highway') skyline(c, 7, horizon - 4, terrain === 'industry' ? 34 : 22, 0.7, terrain === 'industry' ? 'industry' : 'town');
  else if (terrain === 'farm' || terrain === 'river') { trees(c, 3, horizon - 2, 1); barn(c, ((-off * 0.15) % 400 + 400) % 400 - 40, horizon - 2); }
  else if (terrain === 'plains' || terrain === 'desert') { for (let i = 0; i < 5; i++) { const x = (((i * 90 - off * 0.12) % 450) + 450) % 450 - 40; if (x < W + 20) { px(c, x, horizon - 12, 1, 12); px(c, x - 4, horizon - 13, 9, 1); } } }
  // mid layer: poles
  poles(c, off * 0.6, horizon + 2);
  // Slow clouds and a passing fence give the roadside depth without road debris.
  for (let i = 0; i < 3; i++) {
    const x = ((i * 127 - off * 0.08) % 400 + 400) % 400 - 40;
    line(c, x, 22 + i * 9, x + 24, 22 + i * 9);
    line(c, x + 5, 20 + i * 9, x + 17, 20 + i * 9);
  }
  for (let i = 0; i < 10; i++) {
    const x = ((i * 40 - off * 0.7) % 400 + 400) % 400 - 40;
    px(c, x, horizon - 4, 2, 10);
    line(c, x, horizon, x + 40, horizon);
  }
  // road
  road(c, horizon + 6);
  // the wagon (or walkers on foot)
  const bob = Math.sin(off * 0.9) * (s.pace === 'hard' ? 1.2 : 0.6);
  if (s.vehicle.has) {
    wagon(c, 132, horizon + 6 + bob, off, !!s.vehicle.broken);
    // Tailpipe puffs stay behind the wagon. Engine trouble has a visible cue.
    for (let i = 0; i < 3; i++) {
      const p = (t * 7 + i * 4) % 12;
      grey(c, 130 - p * 2, horizon + 17 - p / 3, 3 + p / 2, 2, 'g25');
    }
    if (s.vehicle.engine < 35 || s.vehicle.broken === 'engine') smoke(c, 171, horizon + 9, t, 25);
  }
  else { const n = ZT.State.aliveCount(s); for (let i = 0; i < n; i++) figure(c, 130 + i * 10, horizon + 12 + Math.sin(off + i) * 0.6, off * 1.4 + i, false); }
  weatherFX(c, s.weather, t, opt.reduce);
};

function barn(c, x, y) {
  px(c, x, y - 14, 30, 14);
  c.fillStyle = PAPER; c.fillRect(x + 2, y - 12, 26, 10); c.fillStyle = INK;
  line(c, x, y - 14, x + 15, y - 22); line(c, x + 15, y - 22, x + 30, y - 14);
  px(c, x + 12, y - 8, 6, 8);
  px(c, x + 34, y - 20, 6, 20); // silo
  line(c, x + 34, y - 20, x + 37, y - 24); line(c, x + 37, y - 24, x + 40, y - 20);
}

scenes.title = function (c, s, t) {
  // horizon with a dead town and a car leaving it
  const horizon = 108;
  for (let i = 0; i < 40; i++) { const x = hash(i * 3.3) * W, y = hash(i * 7.7) * 60; px(c, x, y, 1, 1); }
  disc(c, 268, 26, 11); disc(c, 263, 22, 9, PAPER); // crescent
  skyline(c, 21, horizon - 4, 34, 0.85, 'town');
  ground(c, horizon + 2, t * 40);
  for (let x = -32; x < W; x += 32) px(c, x + 32 - ((t * 40) % 32), horizon + 20, 14, 2);
  wagon(c, 200, horizon + 4, t * 6, false);
  for (let i = 0; i < 7; i++) figure(c, 10 + i * 16, horizon + 4 + (i % 2), t * 3 + i, true);
  weatherFX(c, 'cold', t, false);
};

/* generic composers used by event art keys */
function sceneRoadWith(drawer) {
  return function (c, s, t, opt) {
    const horizon = 92;
    if (ZT.region(s).terrain === 'mountain') mountains(c, 5, horizon - 4, 40);
    else skyline(c, 13, horizon - 4, 16, 0.4, 'town');
    ground(c, horizon + 6, 0);
    c.fillStyle = PAPER; c.fillRect(0, horizon + 7, W, 35);
    road(c, horizon + 6);
    drawer(c, s, t, horizon, opt);
    weatherFX(c, s.weather, t, opt && opt.reduce);
  };
}

scenes.road = sceneRoadWith(function (c, s, t, hz) {
  if (s.vehicle.has) wagon(c, 140, hz + 6, t * 4, !!s.vehicle.broken);
  else for (let i = 0; i < ZT.State.aliveCount(s); i++) figure(c, 138 + i * 10, hz + 12, t * 3 + i, false);
});
scenes.sign = sceneRoadWith(function (c, s, t, hz) {
  px(c, 60, hz - 34, 4, 40); px(c, 96, hz - 34, 4, 40);
  px(c, 46, hz - 46, 68, 26); c.fillStyle = PAPER; c.fillRect(48, hz - 44, 64, 22); c.fillStyle = INK;
  px(c, 54, hz - 38, 42, 2); px(c, 54, hz - 32, 34, 2); px(c, 54, hz - 26, 46, 2);
  if (s.vehicle.has) wagon(c, 190, hz + 6, t * 3, false);
});
scenes.wrecks = sceneRoadWith(function (c, s, t, hz) {
  for (let i = 0; i < 7; i++) { const x = 8 + i * 42, y = hz + 4 + (i % 3) * 6; carHulk(c, x, y, i); }
  if (s.vehicle.has) wagon(c, 130, hz + 20, t * 2, false);
});
function carHulk(c, x, y, seed) {
  px(c, x, y + 6, 28, 5); px(c, x + 5, y + 2, 16, 4); px(c, x - 1, y + 9, 30, 2);
  c.fillStyle = PAPER; c.fillRect(x + 7, y + 3, 5, 3); c.fillRect(x + 14, y + 3, 5, 3); c.fillStyle = INK;
  if (hash(seed) > 0.5) { circle(c, x + 5, y + 12, 2); circle(c, x + 22, y + 12, 2); }
}
scenes.bridge = function (c, s, t, opt) {
  const hz = 100;
  skyline(c, 31, hz - 30, 10, 0.2, 'town');
  // water
  grey(c, 0, hz + 6, W, H - hz - 6, 'g25');
  for (let y = hz + 10; y < H; y += 5) for (let x = ((y * 7) % 12); x < W; x += 12) px(c, x + Math.sin(t + y) * 2, y, 5, 1);
  // deck
  px(c, 0, hz - 2, W, 4);
  px(c, 0, hz + 2, W, 1);
  // trusses
  for (let x = 0; x < W; x += 24) { line(c, x, hz - 2, x + 12, hz - 26); line(c, x + 12, hz - 26, x + 24, hz - 2); px(c, x, hz - 26, 24, 1); }
  for (let x = 8; x < W; x += 40) px(c, x, hz + 3, 3, H - hz - 3);
  if (opt && opt.blocked) { for (let i = 0; i < 4; i++) px(c, 90 + i * 22, hz - 16, 20, 14); }
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.trees = sceneRoadWith(function (c, s, t, hz) {
  trees(c, 41, hz + 4, 1.6);
  for (let i = 0; i < 3; i++) px(c, 60 + i * 6, hz + 8 + i * 5, 200, 4);
});
scenes.station = sceneRoadWith(function (c, s, t, hz) {
  px(c, 40, hz - 36, 4, 36); px(c, 120, hz - 36, 4, 36);
  px(c, 34, hz - 40, 96, 5);
  px(c, 60, hz - 14, 8, 14); px(c, 92, hz - 14, 8, 14);
  px(c, 150, hz - 30, 60, 30); c.fillStyle = PAPER; c.fillRect(154, hz - 26, 52, 20); c.fillStyle = INK;
  px(c, 158, hz - 22, 20, 12); px(c, 186, hz - 22, 14, 12);
  if (s.vehicle.has) wagon(c, 240, hz + 4, t * 2, false);
});
scenes.bus = sceneRoadWith(function (c, s, t, hz) {
  const x = 96, y = hz - 6;
  px(c, x, y, 128, 26); c.fillStyle = PAPER; c.fillRect(x + 4, y + 4, 118, 10); c.fillStyle = INK;
  for (let i = 0; i < 7; i++) px(c, x + 6 + i * 17, y + 5, 13, 8);
  disc(c, x + 22, y + 27, 5); disc(c, x + 104, y + 27, 5);
});
scenes.map = function (c, s, t, opt) {
  // an atlas page
  px(c, 20, 14, 280, 132); c.fillStyle = PAPER; c.fillRect(22, 16, 276, 128); c.fillStyle = INK;
  for (let i = 0; i < 9; i++) { const y = 30 + i * 13; line(c, 30, y + Math.sin(i) * 4, 290, y - Math.cos(i) * 5); }
  for (let i = 0; i < 5; i++) line(c, 40 + i * 55, 20, 50 + i * 55, 140);
  px(c, 30, 80, 260, 2);
  for (let i = 0; i < 8; i++) { px(c, 40 + i * 32, 76, 3, 10); }
  circle(c, 40 + ((t * 8) % 8 | 0) * 32, 81, 5);
  weatherFX(c, 'none', t, true);
};
scenes.train = sceneRoadWith(function (c, s, t, hz) {
  px(c, 0, hz - 24, W, 22);
  c.fillStyle = PAPER;
  for (let i = 0; i < 8; i++) c.fillRect(i * 42 + 3, hz - 21, 36, 16);
  c.fillStyle = INK;
  for (let i = 0; i < 16; i++) { disc(c, i * 21 + 8, hz + 1, 3); }
  px(c, 0, hz + 4, W, 2);
});
scenes.fire = sceneRoadWith(function (c, s, t, hz) {
  for (let i = 0; i < 60; i++) {
    const p = (t * 20 + i * 7) % 90;
    const x = 160 + Math.sin(i + t) * (10 + p * 0.25);
    px(c, x, hz - p, 2, 2);
  }
  px(c, 140, hz - 8, 44, 12);
});
scenes.cache = sceneRoadWith(function (c, s, t, hz) {
  px(c, 130, hz - 30, 3, 30); px(c, 120, hz - 38, 24, 10);
  for (let i = 0; i < 3; i++) { px(c, 150 + i * 16, hz - 12, 13, 12); px(c, 150 + i * 16, hz - 14, 13, 2); }
});
scenes.water = function (c, s, t, opt) {
  const hz = 88;
  skyline(c, 61, hz - 4, 12, 0.3, 'town');
  grey(c, 0, hz + 4, W, H - hz - 4, 'g50');
  for (let y = hz + 6; y < H; y += 4) for (let x = ((y * 5) % 14); x < W; x += 14) px(c, x + Math.sin(t * 2 + y) * 3, y, 6, 1);
  px(c, 150, hz - 16, 3, 20); px(c, 143, hz - 24, 17, 10);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.market = sceneRoadWith(function (c, s, t, hz) {
  line(c, 100, hz - 34, 220, hz - 34); px(c, 100, hz - 34, 2, 34); px(c, 218, hz - 34, 2, 34);
  px(c, 110, hz - 30, 100, 3);
  px(c, 130, hz - 12, 60, 3); px(c, 132, hz - 9, 2, 9); px(c, 186, hz - 9, 2, 9);
  figure(c, 155, hz - 26, t * 1.5, false);
});
scenes.figure = sceneRoadWith(function (c, s, t, hz) {
  figure(c, 156, hz - 8, t * 2, false);
});
scenes.figures = sceneRoadWith(function (c, s, t, hz) {
  const n = Math.max(2, ZT.State.aliveCount(s));
  for (let i = 0; i < n; i++) figure(c, 110 + i * 20, hz - 8, t * 1.5 + i, false);
});
scenes.people = scenes.figures;
scenes.graves = sceneRoadWith(function (c, s, t, hz) {
  for (let i = 0; i < 5; i++) { const x = 90 + i * 30; circle(c, x, hz - 10, 7); px(c, x - 1, hz - 6, 3, 8); }
});
scenes.radio = sceneRoadWith(function (c, s, t, hz) {
  const bx = 150;
  line(c, bx, hz, bx, hz - 70); line(c, bx - 18, hz, bx, hz - 70); line(c, bx + 18, hz, bx, hz - 70);
  for (let i = 1; i < 8; i++) { const y = hz - i * 9; line(c, bx - 18 + i * 2.3, y, bx + 18 - i * 2.3, y); }
  if (Math.sin(t * 3) > 0) disc(c, bx, hz - 72, 2);
  px(c, bx - 24, hz - 12, 48, 12);
});
scenes.vista = function (c, s, t, opt) {
  mountains(c, 71, 70, 30);
  mountains(c, 83, 88, 18);
  ground(c, 104);
  for (let i = 0; i < 30; i++) { const x = hash(i * 2.2) * W, y = 108 + hash(i * 6.6) * 40; px(c, x, y, 2, 1); }
  line(c, 0, 150, 320, 118);
  if (s.vehicle.has) wagon(c, 20, 132, t * 3, false);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.motel = sceneRoadWith(function (c, s, t, hz) {
  px(c, 40, hz - 34, 200, 34); c.fillStyle = PAPER; c.fillRect(42, hz - 32, 196, 30); c.fillStyle = INK;
  for (let i = 0; i < 8; i++) px(c, 50 + i * 24, hz - 22, 10, 22);
  px(c, 36, hz - 38, 208, 4);
  px(c, 250, hz - 46, 4, 46); px(c, 240, hz - 56, 26, 14);
});
scenes.ferry = scenes.water;
scenes.night = function (c, s, t, opt) {
  const hz = 100;
  for (let i = 0; i < 50; i++) { const x = hash(i * 3.3) * W, y = hash(i * 7.7) * 70; px(c, x, y, 1, 1); }
  skyline(c, 91, hz - 4, 18, 0.5, 'town');
  ground(c, hz + 4, t * 20);
  // headlight cone
  c.save(); c.globalAlpha = 0.9;
  grey(c, 150, hz - 6, 160, 30, 'g25');
  c.restore();
  if (s.vehicle.has) wagon(c, 100, hz + 4, t * 4, false);
  for (let i = 0; i < 4; i++) figure(c, 230 + i * 18, hz + 6, t + i, true);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.well = sceneRoadWith(function (c, s, t, hz) {
  const x = 150;
  px(c, x, hz - 56, 2, 40);
  for (let i = 0; i < 6; i++) { const a = t * 1.2 + (i * Math.PI) / 3; line(c, x + 1, hz - 54, x + 1 + Math.cos(a) * 14, hz - 54 + Math.sin(a) * 14); }
  px(c, x - 14, hz - 14, 30, 14);
});
scenes.church = sceneRoadWith(function (c, s, t, hz) {
  px(c, 110, hz - 34, 80, 34); c.fillStyle = PAPER; c.fillRect(113, hz - 31, 74, 30); c.fillStyle = INK;
  line(c, 110, hz - 34, 150, hz - 52); line(c, 150, hz - 52, 190, hz - 34);
  px(c, 144, hz - 74, 12, 24); line(c, 144, hz - 74, 150, hz - 84); line(c, 150, hz - 84, 156, hz - 74);
  px(c, 149, hz - 94, 2, 10); px(c, 146, hz - 91, 8, 2);
  px(c, 143, hz - 18, 14, 18);
});
scenes.town = sceneRoadWith(function (c, s, t, hz) {
  skyline(c, 55, hz + 2, 40, 0.95, 'town');
  if (s.vehicle.has) wagon(c, 140, hz + 6, t * 5, false);
});
scenes.field = sceneRoadWith(function (c, s, t, hz) {
  for (let i = 0; i < 90; i++) { const x = hash(i * 1.3) * W, y = hz + 6 + hash(i * 4.7) * 50; px(c, x, y, 1, 3); }
  for (let i = 0; i < 4; i++) { px(c, 60 + i * 44, hz - 6, 14, 8); px(c, 58 + i * 44, hz + 2, 3, 4); px(c, 71 + i * 44, hz + 2, 3, 4); }
});
scenes.ash = sceneRoadWith(function (c, s, t, hz) {
  for (let i = 0; i < 80; i++) { const x = (hash(i * 2.7) * W + Math.sin(t + i) * 8) % W, y = (hash(i * 5.3) * H + t * 12) % H; px(c, x, y, 1, 1); }
  if (s.vehicle.has) wagon(c, 140, hz + 6, t * 3, false);
});
scenes.hood = sceneRoadWith(function (c, s, t, hz) {
  wagon(c, 120, hz + 2, 0, true);
  for (let i = 0; i < 22; i++) { const p = (t * 24 + i * 9) % 50; px(c, 158 + Math.sin(i + t * 2) * 8, hz - p, 2, 2); }
  figure(c, 108, hz + 4, t, false);
});
scenes.tire = sceneRoadWith(function (c, s, t, hz) {
  wagon(c, 120, hz + 4, 0, false);
  disc(c, 128, hz + 20, 4); c.fillStyle = PAPER; disc(c, 128, hz + 21, 2); c.fillStyle = INK;
  figure(c, 112, hz + 6, t, false);
});
scenes.underneath = sceneRoadWith(function (c, s, t, hz) {
  wagon(c, 120, hz + 2, 0, false);
  px(c, 100, hz + 20, 22, 3); // legs sticking out
  px(c, 96, hz + 19, 5, 5);
});
scenes.glass = sceneRoadWith(function (c, s, t, hz) {
  wagon(c, 130, hz + 4, t * 2, false);
  line(c, 138, hz + 8, 158, hz + 14); line(c, 146, hz + 6, 150, hz + 16);
});
scenes.mud = sceneRoadWith(function (c, s, t, hz) {
  grey(c, 0, hz + 12, W, 30, 'g50');
  wagon(c, 130, hz + 8, t * 0.5, false);
  for (let i = 0; i < 3; i++) figure(c, 100 + i * 12, hz + 12, t * 2 + i, false);
});
scenes.fuel = scenes.station;
scenes.wreckyard = sceneRoadWith(function (c, s, t, hz) {
  for (let i = 0; i < 12; i++) { const x = (i % 6) * 52, y = hz - 20 + Math.floor(i / 6) * 16; carHulk(c, x, y, i); }
  for (let x = 0; x < W; x += 6) px(c, x, hz - 40, 1, 24);
  px(c, 0, hz - 40, W, 2);
});
scenes.walking = sceneRoadWith(function (c, s, t, hz) {
  const n = Math.max(1, ZT.State.aliveCount(s));
  for (let i = 0; i < n; i++) figure(c, 110 + i * 16, hz + 6, t * 3 + i, false);
});
scenes.sick = function (c, s, t, opt) {
  // interior: someone lying, someone kneeling
  px(c, 0, 120, W, 2);
  px(c, 80, 108, 160, 12); grey(c, 80, 110, 160, 8, 'g25');
  px(c, 96, 100, 20, 8);
  figure(c, 230, 96, t * 0.8, false);
  for (let i = 0; i < 20; i++) px(c, 20 + i * 15, 30 + Math.sin(i + t) * 3, 1, 1);
  vignetteScanlines(c, false);
};
scenes.sickbad = function (c, s, t, opt) {
  scenes.sick(c, s, t, opt);
  grey(c, 0, 0, W, H, 'g25');
  c.fillStyle = PAPER; c.fillRect(0, 0, W, H / 6); c.fillRect(0, H - H / 6, W, H / 6);
};
scenes.camp = function (c, s, t, opt) {
  const hz = 104;
  for (let i = 0; i < 40; i++) { const x = hash(i * 3.3) * W, y = hash(i * 7.7) * 70; px(c, x, y, 1, 1); }
  trees(c, 51, hz, 1.2);
  ground(c, hz + 2, 0);
  // fire
  for (let i = 0; i < 26; i++) { const p = (t * 26 + i * 5) % 26; px(c, 160 + Math.sin(i * 2 + t * 4) * (3 + p * 0.2), hz - p, 2, 2); }
  px(c, 152, hz, 18, 3);
  const n = Math.max(1, ZT.State.aliveCount(s));
  for (let i = 0; i < n; i++) figure(c, 110 + i * 26 + (i > 1 ? 40 : 0), hz - 8, t * 0.6 + i, false);
  if (s.vehicle.has) wagon(c, 20, hz - 6, 0, false);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.enclave = sceneRoadWith(function (c, s, t, hz) {
  px(c, 0, hz - 42, W, 4);
  for (let x = 0; x < W; x += 18) { px(c, x, hz - 42, 14, 42); c.fillStyle = PAPER; c.fillRect(x + 2, hz - 39, 10, 36); c.fillStyle = INK; }
  px(c, 140, hz - 30, 30, 30); c.fillStyle = PAPER; c.fillRect(143, hz - 27, 24, 27); c.fillStyle = INK;
  figure(c, 152, hz - 60, t, false);
});
scenes.bandits = sceneRoadWith(function (c, s, t, hz) {
  carHulk(c, 90, hz - 12, 1); carHulk(c, 170, hz - 8, 2);
  for (let i = 0; i < 4; i++) figure(c, 120 + i * 16, hz - 4, t * 0.7 + i, false);
});
scenes.doctor = sceneRoadWith(function (c, s, t, hz) {
  px(c, 110, hz - 36, 90, 36); c.fillStyle = PAPER; c.fillRect(113, hz - 33, 84, 33); c.fillStyle = INK;
  px(c, 148, hz - 26, 14, 4); px(c, 153, hz - 31, 4, 14);
  figure(c, 205, hz - 8, t, false);
});
scenes.convoy = sceneRoadWith(function (c, s, t, hz) {
  for (let i = 0; i < 4; i++) wagon(c, 10 + i * 62, hz + 4 + (i % 2) * 6, t * 3 + i, false);
});
scenes.dogs = sceneRoadWith(function (c, s, t, hz) {
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 26 + Math.sin(t + i) * 3, y = hz + 2 + (i % 3) * 6;
    px(c, x, y, 9, 4); px(c, x + 8, y - 2, 4, 3); px(c, x, y + 4, 2, 3); px(c, x + 7, y + 4, 2, 3);
  }
});
scenes.library = function (c, s, t) {
  px(c, 20, 20, 280, 120); c.fillStyle = PAPER; c.fillRect(22, 22, 276, 116); c.fillStyle = INK;
  for (let r = 0; r < 5; r++) { px(c, 30, 36 + r * 22, 260, 2); for (let i = 0; i < 60; i++) { const x = 32 + i * 4.3; px(c, x, 36 + r * 22 - 12 + (i % 3), 3, 12 - (i % 3)); } }
  figure(c, 150, 116, t * 0.5, false);
};
scenes.theater = function (c, s, t) {
  px(c, 40, 14, 240, 88); c.fillStyle = PAPER; c.fillRect(43, 17, 234, 82); c.fillStyle = INK;
  grey(c, 45, 19, 230, 78, 'g25');
  for (let i = 0; i < 3; i++) px(c, 70 + i * 60, 40 + Math.sin(t + i) * 4, 24, 30);
  px(c, 36, 100, 248, 4);
  ground(c, 120);
  if (s.vehicle.has) wagon(c, 130, 118, 0, false);
};
scenes.spring = function (c, s, t, opt) {
  mountains(c, 101, 70, 26);
  ground(c, 96);
  for (let i = 0; i < 40; i++) { const p = (t * 14 + i * 6) % 60; px(c, 120 + Math.sin(i + t) * 26, 110 - p, 2, 2); }
  disc(c, 160, 124, 26); c.fillStyle = PAPER; disc(c, 160, 124, 23); c.fillStyle = INK;
  grey(c, 137, 112, 46, 24, 'g50');
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.storm = sceneRoadWith(function (c, s, t, hz) { if (s.vehicle.has) wagon(c, 140, hz + 6, t * 2, false); });
scenes.heat = scenes.storm; scenes.fog = scenes.storm; scenes.cold = scenes.storm;
scenes.snow = scenes.storm; scenes.rain = scenes.storm; scenes.ice = scenes.storm;
scenes.wind = scenes.storm; scenes.dust = scenes.storm;

/* zombie scenes */
function zScene(n, opts) {
  return sceneRoadWith(function (c, s, t, hz) {
    if ((opts || {}).car !== false && s.vehicle.has) wagon(c, 24, hz + 6, t * 2, false);
    for (let i = 0; i < n; i++) {
      const x = 110 + (i % 8) * 24 + Math.sin(t * 0.6 + i) * 2;
      const y = hz + 2 + Math.floor(i / 8) * 12;
      figure(c, x, y, t * 1.4 + i, true);
    }
  });
}
scenes.zroad = zScene(6); scenes.zsingle = zScene(1); scenes.zrun = zScene(2);
scenes.zpack = zScene(6); scenes.zsupply = zScene(9); scenes.zwrecks = zScene(6);
scenes.zfield = zScene(10); scenes.zstreet = zScene(8); scenes.zdoor = zScene(1);
scenes.zdawn = zScene(11); scenes.zsilo = zScene(4); scenes.zrest = zScene(9);
scenes.zbus = zScene(5); scenes.zwater = zScene(5); scenes.zparty = scenes.figures;
scenes.zdog = zScene(2); scenes.zalarm = zScene(6); scenes.zpile = zScene(0);
scenes.zhospital = zScene(4); scenes.zschool = zScene(6); scenes.ztunnel = zScene(6);
scenes.zchurch = zScene(0); scenes.ztanker = zScene(8);
scenes.zhorde = function (c, s, t, opt) {
  const hz = 92;
  skyline(c, 17, hz - 4, 14, 0.4, 'town');
  ground(c, hz + 6);
  for (let row = 0; row < 5; row++) for (let i = 0; i < 22; i++) {
    const x = i * 15 + (row % 2) * 7 + Math.sin(t * 0.5 + i + row) * 1.5;
    figure(c, x, hz + 4 + row * 10, t * 1.2 + i + row, true);
  }
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.horde = scenes.zhorde; scenes.zsurround = scenes.zhorde;
scenes.znight = scenes.night;
scenes.zbridge = function (c, s, t, opt) { scenes.bridge(c, s, t, { blocked: true, reduce: opt && opt.reduce }); for (let i = 0; i < 14; i++) figure(c, 60 + i * 14, 74, t + i, true); };
scenes.zhouse = sceneRoadWith(function (c, s, t, hz) {
  px(c, 110, hz - 40, 90, 40); c.fillStyle = PAPER; c.fillRect(113, hz - 37, 84, 37); c.fillStyle = INK;
  line(c, 106, hz - 40, 155, hz - 62); line(c, 155, hz - 62, 204, hz - 40);
  px(c, 148, hz - 20, 14, 20); px(c, 120, hz - 30, 12, 10); px(c, 176, hz - 30, 12, 10);
  px(c, 122, hz - 52, 8, 8);
  figure(c, 210, hz - 8, t, true);
});

/* ---------- roadside picture book ----------
   The arrival plays once per event; the page never advances on a timer. */
function smoke(c, x, y, t, height) {
  for (let i = 0; i < 8; i++) {
    const p = (t * 9 + i * 5) % height;
    grey(c, x + Math.sin(i + t) * 3 + p / 6, y - p, 3 + p / 5, 2, 'g25');
  }
}
function parkedArrival(c, s, t, opt, x, y) {
  const age = opt && opt.settled ? 4 : (opt && opt.elapsed != null ? opt.elapsed : t);
  const p = Math.min(1, Math.max(0, age / 3));
  const eased = 1 - Math.pow(1 - p, 3);
  const xx = -48 + (x + 48) * eased;
  if (s.vehicle.has) {
    wagon(c, xx, y, p < 1 ? t * 10 : 0, false);
    if (p < 1) grey(c, xx - 9, y + 14, 8, 2, 'g25');
  } else {
    const n = Math.max(1, ZT.State.aliveCount(s));
    for (let i = 0; i < n; i++) figure(c, xx - i * 8, y + 3, p < 1 ? t * 4 + i : 0, false);
  }
}
function stopBackdrop(c, s) {
  mountains(c, 44, 75, 20);
  trees(c, 88, 94, 0.7);
  ground(c, 108, 0);
  c.fillStyle = PAPER; c.fillRect(0, 118, W, 35);
  road(c, 117);
}
function pump(c, x, y) {
  rect(c, x, y, 13, 23); px(c, x + 2, y + 2, 9, 6);
  bmp(c, '0', x + 5, y + 3, PAPER);
  px(c, x - 2, y + 23, 17, 2);
  line(c, x + 13, y + 4, x + 18, y + 7);
  line(c, x + 18, y + 7, x + 18, y + 19);
  line(c, x + 18, y + 19, x + 14, y + 17);
}
scenes.station = function (c, s, t, opt) {
  stopBackdrop(c, s);
  c.fillStyle = PAPER; c.fillRect(143, 61, 129, 47);
  rect(c, 143, 61, 129, 47); px(c, 139, 57, 137, 5);
  plate(c, 'LAST CHANCE FUEL', 155, 66);
  rect(c, 151, 77, 37, 21); rect(c, 199, 77, 18, 31); rect(c, 227, 77, 36, 21);
  line(c, 153, 96, 185, 80); line(c, 229, 80, 259, 95);
  px(c, 54, 57, 3, 51); px(c, 119, 57, 3, 51);
  px(c, 44, 50, 89, 7); plate(c, 'GAS', 81, 51);
  pump(c, 65, 82); pump(c, 99, 82);
  rect(c, 12, 53, 25, 29); plate(c, 'FUEL', 15, 58); plate(c, '--', 19, 70); px(c, 23, 82, 2, 26);
  parkedArrival(c, s, t, opt, 81, 121);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.fuel = scenes.station;
scenes.diner = function (c, s, t, opt) {
  stopBackdrop(c, s);
  c.fillStyle = PAPER; c.fillRect(94, 59, 188, 50);
  rect(c, 94, 59, 188, 50); px(c, 91, 55, 194, 4);
  for (let x = 96; x < 281; x += 8) px(c, x, 62, 4, 6);
  rect(c, 122, 37, 132, 17); plate(c, 'LAST BITE DINER', 131, 43);
  for (const x of [103, 152, 233]) {
    rect(c, x, 74, 39, 23); px(c, x + 19, 75, 1, 21);
    line(c, x + 3, 94, x + 16, 78);
    px(c, x + 3, 90, 11, 1); px(c, x + 8, 91, 1, 5);
  }
  rect(c, 201, 71, 21, 38); px(c, 204, 75, 15, 20); px(c, 215, 98, 2, 2);
  px(c, 260, 41, 6, 14);
  // A swinging sign, not an electric neon sign in an abandoned building.
  const sway = Math.round(Math.sin(t * 0.8));
  line(c, 40, 66, 40, 107); line(c, 40, 66, 73, 66);
  rect(c, 47 + sway, 72, 28, 18); plate(c, 'EAT', 53 + sway, 78);
  parkedArrival(c, s, t, opt, 130, 121);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
function restArea(c, s, t, opt, zombies) {
  stopBackdrop(c, s);
  c.fillStyle = PAPER; c.fillRect(169, 68, 121, 40);
  rect(c, 169, 68, 121, 40);
  line(c, 162, 68, 231, 46); line(c, 231, 46, 297, 68);
  plate(c, 'REST AREA', 201, 74);
  px(c, 182, 88, 17, 20); px(c, 254, 88, 17, 20);
  rect(c, 217, 88, 15, 20); for (let y = 91; y < 104; y += 4) px(c, 220, y, 8, 2);
  rect(c, 27, 65, 49, 30); plate(c, 'MAP', 44, 69);
  line(c, 32, 87, 67, 77); line(c, 47, 77, 56, 91);
  px(c, 33, 95, 2, 13); px(c, 69, 95, 2, 13);
  px(c, 101, 97, 44, 3); line(c, 109, 100, 104, 109); line(c, 135, 100, 141, 109);
  px(c, 99, 104, 48, 2);
  if (zombies) for (let i = 0; i < 9; i++) figure(c, 83 + i * 22 + Math.sin(t * 0.5 + i) * 3, 88 + i % 3 * 7, t + i, true);
  parkedArrival(c, s, t, opt, 55, 123);
  weatherFX(c, s.weather, t, opt && opt.reduce);
}
scenes.reststop = (c, s, t, opt) => restArea(c, s, t, opt, false);
scenes.zrest = (c, s, t, opt) => restArea(c, s, t, opt, true);

const originalCamp = scenes.camp;
scenes.camp = function (c, s, t, opt) {
  originalCamp(c, s, t, opt);
  // Canvas tent, bedroll, kettle and smoke rising from the cooking fire.
  c.fillStyle = PAPER; c.fillRect(73, 112, 73, 37);
  line(c, 76, 147, 102, 114); line(c, 102, 114, 139, 147); line(c, 76, 147, 139, 147);
  line(c, 102, 114, 102, 147); grey(c, 104, 133, 14, 13, 'g25');
  line(c, 76, 147, 69, 151); line(c, 139, 147, 146, 151);
  rect(c, 205, 136, 34, 9); px(c, 208, 137, 1, 7);
  line(c, 150, 110, 161, 83); line(c, 161, 83, 174, 110);
  px(c, 157, 93, 9, 6); circle(c, 161, 93, 4); smoke(c, 160, 86, t, 36);
};
const originalHood = scenes.hood;
scenes.hood = function (c, s, t, opt) {
  originalHood(c, s, t, opt);
  rect(c, 182, 113, 22, 12); rect(c, 188, 109, 10, 4);
  px(c, 191, 115, 3, 3);
  figure(c, 170, 94, 0, false);
  const y = 101 + Math.round(Math.sin(t * 3) * 2);
  line(c, 170, 99, 161, y); px(c, 159, y - 2, 2, 5); px(c, 157, y - 2, 2, 1);
};

/* ---------- the map ----------
   Real coordinates, equirectangular with a cosine correction at 41.5N. */
const MAPB = { west: -119.0, east: -94.5, south: 38.6, north: 46.4 };
const KX = Math.cos((41.5 * Math.PI) / 180);
let MS = 1, MOX = 0, MOY = 0;
function fitMap(x, y, w, h) {
  const dw = (MAPB.east - MAPB.west) * KX, dh = MAPB.north - MAPB.south;
  MS = Math.min(w / dw, h / dh);
  MOX = x + (w - dw * MS) / 2;
  MOY = y + (h - dh * MS) / 2;
}
function mx(lon) { return MOX + (lon - MAPB.west) * KX * MS; }
function my(lat) { return MOY + (MAPB.north - lat) * MS; }
function poly(c, pts, style) {
  for (let i = 0; i < pts.length - 1; i++) {
    const x1 = mx(pts[i][1]), y1 = my(pts[i][0]), x2 = mx(pts[i + 1][1]), y2 = my(pts[i + 1][0]);
    if (style === 'dot') dotline(c, x1, y1, x2, y2, 3);
    else if (style === 'dash') dotline(c, x1, y1, x2, y2, 2, 2);
    else line(c, x1, y1, x2, y2);
  }
}
function dotline(c, x1, y1, x2, y2, every, run) {
  c.fillStyle = INK;
  const d = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1)));
  for (let i = 0; i <= d; i++) {
    const t = i / d;
    if (run ? (i % (every + run)) < run : (i % every) === 0) c.fillRect(Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t), 1, 1);
  }
}
function thick(c, x1, y1, x2, y2) { line(c, x1, y1, x2, y2); line(c, x1, y1 + 1, x2, y2 + 1); }
function chevrons(c, r) {
  const x = mx(r.at[1]), y = my(r.at[0]);
  const step = (r.w * MS) / Math.max(1, r.n - 1);
  for (let i = 0; i < r.n; i++) {
    const cx = r.vertical ? x : x - (r.w * MS) / 2 + i * step;
    const cy = r.vertical ? y - (r.w * MS) / 2 + i * step * 1.6 : y - (i % 2) * 2;
    line(c, cx - 2, cy + 2, cx, cy - 1);
    line(c, cx, cy - 1, cx + 2, cy + 2);
  }
}

scenes.map = function (c, s, t, opt) {
  opt = opt || {};
  fitMap(3, 3, W - 6, H - 22);
  // states
  for (const st of ZT.GEO.states) {
    poly(c, st.pts, 'dot');
    const lx = mx(st.label[1]), ly = my(st.label[0]);
    if (lx > 2 && lx < W - tw(st.name) - 2) bmp(c, st.name, lx, ly, INK);
  }
  // rivers and water
  for (const rv of ZT.GEO.rivers) poly(c, rv.closed ? rv.pts : rv.pts, 'dash');
  for (const rv of ZT.GEO.rivers) if (rv.closed) {
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const pt of rv.pts) { minx = Math.min(minx, mx(pt[1])); maxx = Math.max(maxx, mx(pt[1])); miny = Math.min(miny, my(pt[0])); maxy = Math.max(maxy, my(pt[0])); }
    grey(c, minx, miny, Math.max(1, maxx - minx), Math.max(1, maxy - miny), 'g25');
  }
  // mountains
  for (const r of ZT.GEO.ranges) chevrons(c, r);
  // route: legs not taken first, faint
  const path = (s && s.path) || [ZT.START_NODE];
  const travelled = {};
  for (let i = 0; i < path.length - 1; i++) travelled[path[i] + '>' + path[i + 1]] = true;
  for (const l of ZT.LEGS) {
    const a = ZT.NODES[l.from], b = ZT.NODES[l.to];
    const key = l.from + '>' + l.to;
    if (travelled[key]) continue;
    const live = s && s.legTo === l.to && s.at === l.from;
    dotline(c, mx(a.lon), my(a.lat), mx(b.lon), my(b.lat), live ? 2 : 4, live ? 2 : 1);
  }
  // travelled legs, solid and heavy
  for (let i = 0; i < path.length - 1; i++) {
    const a = ZT.NODES[path[i]], b = ZT.NODES[path[i + 1]];
    if (!a || !b) continue;
    thick(c, mx(a.lon), my(a.lat), mx(b.lon), my(b.lat));
  }
  // nodes
  for (const id of Object.keys(ZT.NODES)) {
    const n = ZT.NODES[id];
    const x = mx(n.lon), y = my(n.lat);
    const seen = s && s.seen && s.seen[id];
    const big = n.kind === 'landmark' || n.kind === 'start' || n.kind === 'end';
    if (seen) { c.fillStyle = INK; c.fillRect(x - (big ? 2 : 1), y - (big ? 2 : 1), big ? 5 : 3, big ? 5 : 3); }
    else { rect(c, x - (big ? 2 : 1), y - (big ? 2 : 1), big ? 5 : 3, big ? 5 : 3); }
    if (id === (opt.sel || '')) { rect(c, x - 5, y - 5, 11, 11); rect(c, x - 6, y - 6, 13, 13); }
  }
  // short labels for the places that matter, kept clear of the route line
  const labels = [
    ['omaha', 'OMAHA', 'r', -5, 2], ['kearney', 'FT KEARNY', 'c', 0, 7], ['chimney', 'CHIMNEY RK', 'c', -2, -10],
    ['cheyenne', 'CHEYENNE', 'c', -2, 7], ['divide_n', 'S. PASS', 'r', -5, -3], ['divide_s', 'CRESTON', 'c', 6, 7],
    ['forthall', 'FT HALL', 'c', 0, -10], ['boise', 'BOISE', 'r', -5, 4], ['ogden', 'OGDEN', 'l', 5, 0],
  ];
  for (const [id, label, al, dx, dy] of labels) {
    const n = ZT.NODES[id];
    plate(c, label, mx(n.lon) + dx, my(n.lat) + dy, al);
  }
  // you
  if (s && s.at) {
    const pos = ZT.position(s);
    const x = mx(pos.lon), y = my(pos.lat);
    const blink = opt.reduce ? true : Math.sin(t * 4) > -0.4;
    if (blink) {
      c.fillStyle = PAPER; c.fillRect(x - 5, y - 6, 11, 13);
      c.fillStyle = INK;
      c.fillRect(x - 1, y - 5, 3, 3); c.fillRect(x - 2, y - 3, 5, 1);   // a little wagon-shaped marker
      c.fillRect(x - 4, y - 2, 9, 2); c.fillRect(x - 3, y, 2, 2); c.fillRect(x + 2, y, 2, 2);
      rect(c, x - 5, y - 6, 11, 13);
      plate(c, 'YOU', x + 8, y - 3, 'l');
    }
  }
  // frame, compass and scale
  rect(c, 0, 0, W, H - 18);
  const cx = W - 22, cy = 14;
  bmp(c, 'N', cx - 1, cy - 12);
  line(c, cx, cy - 5, cx, cy + 6); line(c, cx, cy - 5, cx - 3, cy - 1); line(c, cx, cy - 5, cx + 3, cy - 1);
  line(c, cx - 5, cy + 1, cx + 5, cy + 1);
  const per100 = (100 / 69) * MS;
  const sx = 8, sy = H - 24;
  c.fillStyle = PAPER; c.fillRect(sx - 3, sy - 12, per100 * 2 + 8, 17);
  bmp(c, '0', sx - 1, sy - 11); bmp(c, '200 MI', sx + per100 * 2 - 12, sy - 11);
  line(c, sx, sy, sx + per100 * 2, sy); line(c, sx, sy - 3, sx, sy + 2);
  line(c, sx + per100, sy - 2, sx + per100, sy + 2); line(c, sx + per100 * 2, sy - 3, sx + per100 * 2, sy + 2);
  // key strip along the bottom
  c.fillStyle = PAPER; c.fillRect(0, H - 17, W, 17);
  px(c, 0, H - 18, W, 1);
  let kx = 4;
  const key = (label, draw) => { draw(kx, H - 10); bmp(c, label, kx + 12, H - 12); kx += 12 + tw(label) + 9; };
  key('DRIVEN', (x, y) => { thick(c, x, y, x + 8, y); });
  key('AHEAD', (x, y) => { dotline(c, x, y, x + 8, y, 3); });
  key('STOP', (x, y) => { rect(c, x + 2, y - 2, 5, 5); });
  key('PASSED', (x, y) => { c.fillStyle = INK; c.fillRect(x + 2, y - 2, 5, 5); });
  key('YOU', (x, y) => { c.fillStyle = INK; c.fillRect(x + 3, y - 3, 3, 3); c.fillRect(x + 2, y, 5, 1); c.fillRect(x + 1, y + 1, 7, 1); });
};

/* landmark scenes — the real places */
scenes.lm_arch = function (c, s, t, opt) {          // the Archway over I-80 at Kearney
  const hz = 112;
  ground(c, hz, t * 20);
  px(c, 28, hz - 66, 16, 66); px(c, 276, hz - 66, 16, 66);      // piers
  for (let i = 0; i <= 40; i++) {                                // the span
    const u = i / 40, x = 44 + u * 232, y = hz - 66 - Math.sin(u * Math.PI) * 22;
    px(c, x, y, 6, 1); px(c, x, y + 20, 6, 1);
  }
  for (let i = 0; i < 9; i++) { const u = i / 8, x = 46 + u * 228, y = hz - 66 - Math.sin(u * Math.PI) * 22; px(c, x, y, 1, 20); }
  px(c, 150, hz - 40, 22, 14); grey(c, 151, hz - 39, 20, 12, 'g50');   // the banner
  for (let x = -32; x < W; x += 32) px(c, x + 32 - ((t * 20) % 32), hz + 20, 14, 2);
  if (s.vehicle.has) wagon(c, 138, hz - 4, t * 3, false);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.lm_fork = function (c, s, t, opt) {   // the road comes apart
  const hz = 96;
  skyline(c, 13, hz - 4, 14, 0.35, 'town');
  ground(c, hz + 6, t * 10);
  // one road in, two roads out
  for (let i = 0; i < 26; i++) {
    const u = i / 25, y = hz + 8 + u * 44, sp = u * u * 150;
    px(c, 158 - sp, y, 12, 2); px(c, 152 + sp, y, 12, 2);
  }
  px(c, 152, hz + 6, 18, 3);
  // the sign: a dark board with a white edge, so the lettering reads
  px(c, 146, hz - 44, 3, 50);
  const board = (x, y, w, h, label) => {
    rect(c, x, y, w, h); c.fillStyle = PAPER; c.fillRect(x + 1, y + 1, w - 2, h - 2); c.fillStyle = INK;
    bmp(c, label, x + 4, y + Math.round((h - 5) / 2));
  };
  board(96, hz - 58, 54, 13, 'US 26');
  board(148, hz - 42, 60, 13, 'I 80 W');
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.lm_chimney = function (c, s, t, opt) {
  const hz = 116;
  for (let i = 0; i < 26; i++) px(c, hash(i * 3.3) * W, hash(i * 7.7) * 40, 1, 1);
  ground(c, hz, t * 12);
  const bx = 168;
  for (let y = 0; y < 34; y++) { const w = 34 - y * 0.85; px(c, bx - w / 2, hz - y, w, 1); }   // clay cone
  for (let y = 34; y < 78; y++) { const w = Math.max(3, 7 - (y - 34) * 0.05); px(c, bx - w / 2, hz - y, w, 1); }
  c.fillStyle = PAPER;
  for (let i = 0; i < 40; i++) c.fillRect(bx - 14 + hash(i * 2.1) * 28, hz - 4 - hash(i * 5.5) * 26, 1, 1);
  c.fillStyle = INK;
  if (s.vehicle.has) wagon(c, 40, hz - 4, t * 2, false);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.lm_city = function (c, s, t, opt) {
  const hz = 104;
  skyline(c, 27, hz - 2, 46, 0.95, 'town');
  skyline(c, 44, hz + 2, 22, 0.9, 'town');
  ground(c, hz + 6, t * 26);
  for (let x = -32; x < W; x += 32) px(c, x + 32 - ((t * 26) % 32), hz + 26, 14, 2);
  if (s.vehicle.has) wagon(c, 134, hz + 6, t * 4, false);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.lm_refinery = function (c, s, t, opt) {
  const hz = 110;
  for (let i = 0; i < 5; i++) { const x = 40 + i * 44; px(c, x, hz - 52 - i % 2 * 10, 7, 52 + (i % 2) * 10); }
  px(c, 30, hz - 22, 240, 22); c.fillStyle = PAPER; c.fillRect(33, hz - 19, 234, 19); c.fillStyle = INK;
  for (let i = 0; i < 6; i++) circle(c, 52 + i * 38, hz - 10, 7);
  for (let i = 0; i < 26; i++) { const p2 = (t * 30 + i * 6) % 34; px(c, 218 + Math.sin(i * 2 + t * 5) * (2 + p2 * 0.2), hz - 62 - p2, 2, 2); }   // the flare
  px(c, 214, hz - 62, 7, 12);
  ground(c, hz, t * 14);
  if (s.vehicle.has) wagon(c, 130, hz + 4, t * 2, false);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.lm_town = sceneRoadWith(function (c, s, t, hz) {
  skyline(c, 66, hz - 2, 18, 0.7, 'town');
  px(c, 250, hz - 34, 26, 34); c.fillStyle = PAPER; c.fillRect(253, hz - 31, 20, 31); c.fillStyle = INK;
  if (s.vehicle.has) wagon(c, 130, hz + 6, t * 3, false);
});
scenes.lm_pass = function (c, s, t, opt) {         // South Pass: famously NOT a pass
  const hz = 118;
  mountains(c, 141, hz - 40, 16);
  ground(c, hz - 2, t * 18);
  for (let i = 0; i < 120; i++) { const x = hash(i * 2.7) * W, y = hz + hash(i * 6.1) * 38; px(c, x, y, 2, 1); px(c, x + 1, y - 1, 1, 1); }  // sage
  px(c, 60, hz - 20, 4, 20); px(c, 46, hz - 32, 32, 13); grey(c, 47, hz - 31, 30, 11, 'g50');
  bmp(c, '7412', 52, hz - 28);
  for (let x = -32; x < W; x += 32) px(c, x + 32 - ((t * 18) % 32), hz + 16, 14, 2);
  if (s.vehicle.has) wagon(c, 150, hz - 6, t * 3, false);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.lm_desert = function (c, s, t, opt) {
  const hz = 122;
  px(c, 0, hz, W, 1);
  ground(c, hz, t * 24);
  for (let i = 0; i < 90; i++) { const x = hash(i * 3.1) * W, y = hz + 3 + hash(i * 5.7) * 34; px(c, x, y, 2, 1); }
  px(c, 74, hz - 22, 3, 22); px(c, 58, hz - 34, 36, 13); grey(c, 59, hz - 33, 34, 11, 'g25');
  bmp(c, 'DIVIDE', 61, hz - 30);
  for (let x = -32; x < W; x += 32) px(c, x + 32 - ((t * 24) % 32), hz + 20, 16, 2);
  if (s.vehicle.has) wagon(c, 148, hz - 6, t * 5, false);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.lm_lake = function (c, s, t, opt) {
  const hz = 92;
  mountains(c, 161, hz - 6, 34);
  grey(c, 0, hz, W, 34, 'g50');
  for (let y = hz + 2; y < hz + 32; y += 4) for (let x = ((y * 7) % 16); x < W; x += 16) px(c, x + Math.sin(t + y) * 3, y, 7, 1);
  ground(c, hz + 34, t * 14);
  if (s.vehicle.has) wagon(c, 136, hz + 34, t * 2, false);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.lm_fort = sceneRoadWith(function (c, s, t, hz) {
  px(c, 60, hz - 44, 200, 44); c.fillStyle = PAPER; c.fillRect(64, hz - 40, 192, 40); c.fillStyle = INK;
  for (let x = 60; x < 260; x += 8) px(c, x, hz - 46, 5, 3);            // parapet
  px(c, 60, hz - 52, 18, 52); px(c, 242, hz - 52, 18, 52);              // bastions
  px(c, 150, hz - 20, 20, 20); c.fillStyle = PAPER; c.fillRect(153, hz - 17, 14, 17); c.fillStyle = INK;
  figure(c, 66, hz - 64, t * 0.6, false); figure(c, 248, hz - 64, t * 0.6 + 2, false);
});
scenes.lm_lava = function (c, s, t, opt) {
  const hz = 116;
  mountains(c, 181, hz - 24, 12);
  px(c, 0, hz, W, 1);
  c.fillStyle = PAPER; c.fillRect(0, hz + 1, W, H - hz - 1);
  for (let i = 0; i < 200; i++) {                                        // broken black rock
    const x = hash(i * 1.9) * W, y = hz + 2 + hash(i * 4.3) * 40;
    px(c, x, y, 2 + (i % 3), 1);
  }
  for (let x = -32; x < W; x += 32) px(c, x + 32 - ((t * 22) % 32), hz + 22, 14, 2);
  if (s.vehicle.has) wagon(c, 146, hz + 2, t * 4, false);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.lm_canyon = function (c, s, t, opt) {
  const hz = 78;
  ground(c, hz, t * 10);
  c.fillStyle = PAPER; c.fillRect(0, hz + 14, W, H - hz - 14);          // the hole in the ground
  px(c, 0, hz + 14, W, 1); px(c, 0, H - 22, W, 1);
  for (let x = 0; x < W; x += 3) { px(c, x, hz + 15, 1, 3 + (x % 5)); px(c, x, H - 25 - (x % 4), 1, 3); }
  grey(c, 0, H - 21, W, 21, 'g50');                                      // the river at the bottom
  for (let i = 0; i <= 60; i++) { const u = i / 60, x = u * W, y = hz + 10 - Math.sin(u * Math.PI) * 8; px(c, x, y, 6, 2); }
  for (let i = 1; i < 8; i++) { const u = i / 8, x = u * W, y = hz + 10 - Math.sin(u * Math.PI) * 8; line(c, x, y, x, hz + 16); }
  if (s.vehicle.has) wagon(c, 138, hz - 8, t * 4, false);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.lm_base = function (c, s, t, opt) {
  const hz = 118;
  for (let x = 0; x < W; x += 4) px(c, x, hz - 26, 1, 26);               // chain link
  px(c, 0, hz - 26, W, 1); px(c, 0, hz - 20, W, 1);
  px(c, 224, hz - 66, 10, 66); px(c, 216, hz - 78, 26, 14);              // tower
  if (Math.sin(t * 2.2) > -0.5) { grey(c, 208, hz - 82, 42, 22, 'g25'); c.fillStyle = INK; c.fillRect(226, hz - 74, 6, 5); }
  px(c, 40, hz - 16, 120, 16); c.fillStyle = PAPER; c.fillRect(43, hz - 13, 114, 13); c.fillStyle = INK;
  ground(c, hz, t * 22);
  for (let x = -32; x < W; x += 32) px(c, x + 32 - ((t * 22) % 32), hz + 20, 14, 2);
  if (s.vehicle.has) wagon(c, 130, hz + 2, t * 4, false);
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
scenes.safezone = function (c, s, t) {
  const hz = 112;
  for (let i = 0; i < 30; i++) px(c, hash(i * 3.3) * W, hash(i * 7.7) * 46, 1, 1);
  mountains(c, 151, hz - 30, 26);                                        // the Boise foothills
  px(c, 0, hz - 44, W, 5);
  for (let x = 0; x < W; x += 22) { px(c, x, hz - 44, 16, 44); c.fillStyle = PAPER; c.fillRect(x + 2, hz - 41, 12, 38); c.fillStyle = INK; }
  c.fillStyle = PAPER; c.fillRect(132, hz - 40, 56, 40); c.fillStyle = INK;
  grey(c, 132, hz - 40, 56, 40, 'g50');
  for (let i = 0; i < 6; i++) figure(c, 118 + i * 15, hz - 57, t * 0.6 + i, false);
  ground(c, hz, t * 12);
  if (s.vehicle.has) wagon(c, 138, hz + 4, t * 2, false);
};
scenes.memorial = function (c, s, t) {
  ground(c, 118);
  px(c, 140, 60, 40, 4); px(c, 155, 60, 10, 58);
  grey(c, 60, 20, 200, 30, 'g25');
  for (let i = 0; i < 20; i++) px(c, (hash(i * 3.1) * W + t * 6) % W, 100 + hash(i * 6.2) * 40, 1, 1);
};

/* ---------- public ---------- */
let scanlines = true;
return {
  W, H, scenes,
  setScanlines(v) { scanlines = v; },
  draw(canvas, key, s, t, opt) {
    ensure();
    opt = Object.assign({}, opt);
    if (opt.motion === false) { t = 0; opt.dist = 0; opt.elapsed = 4; opt.reduce = true; }
    const c = bctx;
    clear(c);
    const fn = scenes[key] || scenes.road;
    try { fn(c, s, t, opt || {}); } catch (e) { /* a broken scene must never break the game */ }
    vignetteScanlines(c, scanlines && !(opt && opt.reduce));
    const dst = canvas.getContext('2d');
    dst.imageSmoothingEnabled = false;
    dst.fillStyle = PAPER;
    dst.fillRect(0, 0, canvas.width, canvas.height);
    dst.drawImage(buf, 0, 0, canvas.width, canvas.height);
  },
  /* the scavenge minigame draws its own world */
  drawScavenge(canvas, g, t, opt) {
    ensure();
    const c = bctx;
    clear(c);
    const T = 8, oy = 11;
    c.save(); c.translate(0, oy);
    // walls: filled blocks, with an ink edge only where they meet open ground
    const at = (x, y) => (x < 0 || y < 0 || x >= g.w || y >= g.h ? 1 : g.grid[y * g.w + x]);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const v = g.grid[y * g.w + x];
      if (v === 1) {
        grey(c, x * T, y * T, T, T, 'g25');
        if (at(x, y - 1) !== 1) px(c, x * T, y * T, T, 1);
        if (at(x, y + 1) !== 1) px(c, x * T, y * T + T - 1, T, 1);
        if (at(x - 1, y) !== 1) px(c, x * T, y * T, 1, T);
        if (at(x + 1, y) !== 1) px(c, x * T + T - 1, y * T, 1, T);
      } else if (v === 2) {
        px(c, x * T + 1, y * T + 2, T - 2, T - 4);
        c.fillStyle = PAPER; c.fillRect(x * T + 2, y * T + 3, T - 4, 2); c.fillStyle = INK;
      }
    }
    // exit (the car)
    wagon(c, g.exitX * T - 20, g.exitY * T - 8, 0, false);
    // containers
    for (const k of g.containers) {
      const x = k.x * T - 3, y = k.y * T - 3;
      if (k.open) { px(c, x, y + 4, 7, 3); }
      else { rect(c, x, y, 7, 7); if (k.locked) px(c, x + 3, y + 2, 1, 3); }
    }
    // noise ring
    if (g.noiseT > 0) { const r = (3.5 - g.noiseT) * 10 + 4; circle(c, g.lastNoiseX * T, g.lastNoiseY * T, r); }
    // zombies
    for (const z of g.zombies) figure(c, z.x * T - 2, z.y * T - 6, t * 3 + z.x, true);
    // player
    const p = !(opt && opt.reduce) && g.hurt > 0 && Math.sin(t * 30) > 0;
    if (!p) figure(c, g.px * T - 2, g.py * T - 6, g.steps * 8, false);
    // the thumbstick, drawn where the finger actually is
    if (g.stick) {
      circle(c, g.stick.ox, g.stick.oy, 16);
      circle(c, g.stick.ox, g.stick.oy, 15);
      disc(c, g.stick.ox + g.stick.dx * 14, g.stick.oy + g.stick.dy * 14, 5);
      c.fillStyle = PAPER;
      disc(c, g.stick.ox + g.stick.dx * 14, g.stick.oy + g.stick.dy * 14, 2);
      c.fillStyle = INK;
    }
    c.restore();
    // the HUD lives in the DOM, where it is readable and can be announced
    if (g.flash > 0 && !(opt && opt.reduce)) { grey(c, 0, 0, W, H, 'g50'); }
    vignetteScanlines(c, scanlines && !(opt && opt.reduce));
    const dst = canvas.getContext('2d');
    dst.imageSmoothingEnabled = false;
    dst.fillStyle = PAPER; dst.fillRect(0, 0, canvas.width, canvas.height);
    dst.drawImage(buf, 0, 0, canvas.width, canvas.height);
  },
};
})();
