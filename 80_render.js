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
const sceneryCache = new Map();

function ensure() {
  if (buf && paletteMode === ZT.Display.mode) return;
  paletteMode = ZT.Display.mode;
  sceneryCache.clear();
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
    // Full-size dither sheets avoid filtered CanvasPattern sampling in renderers.
    p.width = W + 4; p.height = H + 4;
    const c = p.getContext('2d');
    c.fillStyle = INK;
    for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) if (bits[y % bits.length][x % bits[0].length]) c.fillRect(x, y, 1, 1);
    patterns[name] = p;
  }
}

/* ---------- primitives ---------- */
function clear(c) { c.fillStyle = PAPER; c.fillRect(0, 0, W, H); }
function cachedScenery(c, key, paint) {
  let layer=sceneryCache.get(key);
  if(!layer) {
    layer=document.createElement('canvas');layer.width=W;layer.height=H;
    const ctx=layer.getContext('2d');ctx.imageSmoothingEnabled=false;paint(ctx);
    sceneryCache.set(key,layer);
  }
  c.drawImage(layer,0,0);
}
function px(c, x, y, w, h) { c.fillStyle = INK; c.fillRect(x | 0, y | 0, Math.round(w || 1), Math.round(h || 1)); }
function grey(c, x, y, w, h, level) {
  const p = patterns[level || 'g50'];
  x = Math.floor(x); y = Math.floor(y); w = Math.floor(w); h = Math.floor(h);
  for (let yy = 0; yy < h; yy += H) for (let xx = 0; xx < w; xx += W) {
    const sx = ((x + xx) % 4 + 4) % 4, sy = ((y + yy) % 4 + 4) % 4;
    const width = Math.min(W, w - xx), height = Math.min(H, h - yy);
    c.drawImage(p, sx, sy, width, height, x + xx, y + yy, width, height);
  }
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
// Scanline polygons keep every edge on the pixel grid, without canvas antialiasing.
function shape(c, points, fill) {
  c.fillStyle = patterns[fill] ? INK : (fill || INK);
  const low = Math.max(0, Math.ceil(Math.min(...points.map(p => p[1]))));
  const high = Math.min(H - 1, Math.floor(Math.max(...points.map(p => p[1]))));
  for (let y = low; y <= high; y++) {
    const hits = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) hits.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const x = Math.ceil(hits[i]), width = Math.floor(hits[i + 1]) - x + 1;
      if (patterns[fill]) grey(c,x,y,width,1,fill); else c.fillRect(x,y,width,1);
    }
  }
}
function cloud(c, x, y, size) {
  x = Math.round(x); y = Math.round(y); size = size || 1;
  c.save(); c.translate(x, y); c.scale(size, size);
  cachedScenery(c,'cloud',c=>{
  shape(c, [[0,9],[5,5],[12,5],[16,0],[25,0],[29,4],[35,4],[39,8],[46,9],[43,12],[3,12]], PAPER);
  line(c, 0, 9, 5, 5); line(c, 5, 5, 12, 5); line(c, 12, 5, 16, 0);
  px(c, 16, 0, 9, 1); line(c, 25, 0, 29, 4); px(c, 29, 4, 6, 1);
  line(c, 35, 4, 39, 8); px(c, 6, 13, 31, 1); grey(c, 7, 10, 30, 2, 'g25');
  });
  c.restore();
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

function road(c, y, depth) {
  // Two clear shoulders frame the driving surface; no floating specks or dashes.
  depth = depth || 36;
  grey(c, 0, y - 2, W, 2, 'g25');
  px(c, 0, y, W, 1);
  px(c, 0, y + depth, W, 1);
  grey(c, 0, y + depth + 1, W, 3, 'g50');
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
  cachedScenery(c,`trees:${seed}:${baseY}:${scale}`,c=>{
  for (let i = 0; i < 23; i++) {
    const x = Math.floor(hash(seed + i * 2.3) * (W + 20)) - 10;
    const h = (5 + hash(seed + i * 5.1) * 9) * (scale || 1);
    px(c, x, baseY - h, 2, h);
    for (let k = 0; k < 3; k++) {
      const top = Math.round(baseY - h + k * h * 0.2), bottom = Math.round(top + h * 0.48), width = (3 + k * 2) * (scale || 1);
      shape(c, [[x + 1, top], [x - width, bottom], [x + width + 1, bottom]], INK);
      line(c, x - Math.round(width) + 2, bottom - 1, x - 1, bottom - 1);
      c.fillStyle = PAPER; c.fillRect(x + 1, top + 3, 1, 2);
    }
  }
  });
}
function mountains(c, seed, baseY, height) {
  cachedScenery(c,`mountains:${seed}:${baseY}:${height}`,c=>{
  c.fillStyle = INK;
  let x = -10;
  while (x < W + 10) {
    const h = 12 + hash(seed + x * 0.37) * height;
    const w = 26 + hash(seed + x * 0.71) * 40;
    const peak = Math.round(x + w * 0.47), top = Math.round(baseY - h);
    const outline = [[Math.round(x),baseY],[peak,top],[Math.round(x+w),baseY]];
    shape(c, outline, PAPER); shape(c, outline, 'g25');
    shape(c, [[peak,top],[peak+Math.round(w*0.12),baseY-h*0.38],[Math.round(x+w),baseY],[peak,baseY]], 'g50');
    line(c, peak, top, peak + 5, top + 10);
    if (height >= 30) shape(c, [[peak,top+1],[peak-6,top+9],[peak-1,top+6],[peak+4,top+10]], PAPER);
    line(c, x, baseY, peak, top); line(c, peak, top, x + w, baseY);
    x += w * 0.75;
  }
  });
}
function poles(c, off, baseY) {
  for (let i = 0; i < 6; i++) {
    const x = ((i * 64 - (off % 64)) + 384) % 384 - 32;
    if (x < -8 || x > W + 8) continue;
    px(c, x, baseY - 34, 2, 34);
    px(c, x - 6, baseY - 32, 14, 1);
    px(c, x - 4, baseY - 28, 10, 1);
    px(c, x - 5, baseY - 34, 1, 2); px(c, x + 5, baseY - 34, 1, 2);
    for (let u = 0; u < 64; u++) px(c, x + u, baseY - 32 + Math.sin(u / 64 * Math.PI) * 5, 1, 1);
  }
}

/* ---------- the wagon ---------- */
function wagon(c, x, y, frame, dead, state) {
  // Wood-paneled wagon, loaded roof rack, chrome trim, and cut-out wheel arches.
  c.save(); c.translate(Math.round(x), Math.round(y));
  grey(c, 2, 19, 42, 2, 'g50');
  shape(c, [[1,9],[5,9],[7,3],[30,3],[35,9],[41,9],[44,12],[44,16],[0,16],[0,11]], INK);
  px(c, 7, 1, 23, 1); px(c, 8, -3, 11, 4); rect(c, 21, -2, 8, 3);
  c.fillStyle = PAPER; c.fillRect(10,-2,7,1); c.fillRect(13,-3,1,4);
  for (const [xx, ww] of [[8,7],[17,6],[25,5]]) { c.fillStyle = PAPER; c.fillRect(xx,5,ww,4); }
  px(c, 27, 7, 2, 2); px(c, 28, 8, 3, 1); // driver's silhouette
  c.fillStyle = PAPER; c.fillRect(2,10,38,1); c.fillRect(12,12,18,3);
  px(c, 18, 12, 1, 3); px(c, 27, 12, 1, 3); px(c, 20, 12, 3, 1);
  c.fillStyle = PAPER; c.fillRect(1,14,3,1); c.fillRect(39,11,3,2); c.fillRect(35,15,8,1);
  px(c, 32, 8, 3, 1); px(c, -1, 15, 3, 2); px(c, 42, 15, 3, 2);
  for (const wx of [9,35]) {
    disc(c, wx, 17, 4, PAPER); disc(c, wx, 17, 3); disc(c, wx, 17, 1, PAPER);
    const a = dead ? 0 : frame * 0.9;
    for (let k = 0; k < 2; k++) {
      c.fillStyle = PAPER; c.fillRect(Math.round(wx+Math.cos(a+k*Math.PI)*2),Math.round(17+Math.sin(a+k*Math.PI)*2),1,1);
    }
  }
  if (state && state.vehicle.body < 40) { line(c, 19, 10, 24, 15); px(c, 4, 12, 3, 2); }
  if (dead) { line(c, 34, 9, 40, 1); line(c, 40, 1, 44, 3); px(c, 35, 9, 6, 2); }
  c.restore();
}
function walkers(c, x, y, frame, n) {
  for (let i = 0; i < n; i++) {
    const ox = x + i * 9, ph = frame * 0.5 + i;
    figure(c, ox, y, ph, true);
  }
}
function figure(c, x, y, phase, shamble) {
  c.save(); c.translate(Math.round(x), Math.round(y));
  const lean = shamble ? 1 + Math.round(Math.sin(phase)) : 0;
  const stride = Math.round(Math.sin(phase) * 2);
  px(c, 1 + lean, 0, 3, 3); px(c, 1, 3, 4, 5);
  c.fillStyle = PAPER; c.fillRect(3+lean,1,1,1);
  if (shamble) {
    px(c, 4, 4, 3, 2); px(c, 7, 5 + (stride > 0 ? 1 : 0), 2, 1);
    px(c, 0, 5, 1, 4); px(c, 4, 8, 2, 1);
    line(c, 2, 8, 1 - stride, 12); line(c, 4, 8, 5 + stride, 12);
    px(c, 0 - stride, 12, 3, 1); px(c, 4 + stride, 12, 3, 1);
  } else {
    px(c, 0, 0, 5, 1); px(c, -1, 4, 2, 4); // cap and pack
    line(c, 5, 4, 5 + stride, 8); px(c, 1, 8, 4, 1);
    line(c, 2, 9, 1 - stride, 12); line(c, 4, 9, 4 + stride, 12);
    px(c, -stride, 12, 3, 1); px(c, 3 + stride, 12, 3, 1);
    c.fillStyle = PAPER; c.fillRect(2,4,1,3);
  }
  c.restore();
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

function landscape(c, s, base, off) {
  const terrain = ZT.region(s).terrain, scroll = off || 0;
  if (s.weather === 'heat') { circle(c, 274, 24, 10); grey(c, 267, 18, 15, 13, 'g25'); }
  else { cloud(c, 30 - (scroll * 0.05 % 100), 18); cloud(c, 218 - (scroll * 0.035 % 80), 29); }
  if (terrain === 'mountain' || terrain === 'hills') {
    mountains(c, 19, base - 12, terrain === 'mountain' ? 43 : 29);
    mountains(c, 42, base, 19); trees(c, 24, base + 6, 1.1);
  } else if (terrain === 'suburb' || terrain === 'industry') {
    skyline(c, 7, base, 36, 0.7, terrain === 'industry' ? 'industry' : 'town');
    px(c, 248, base - 45, 2, 45); px(c, 264, base - 45, 2, 45);
    shape(c, [[242,base-45],[247,base-51],[266,base-51],[271,base-45],[269,base-33],[244,base-33]], INK);
    line(c, 248, base - 30, 266, base - 4); line(c, 266, base - 30, 248, base - 4);
  } else if (terrain === 'desert' || terrain === 'plains') {
    shape(c, [[0,base-12],[33,base-12],[45,base-20],[90,base-20],[112,base-7],[177,base-7],[195,base-15],[235,base-15],[260,base-5],[320,base-10],[320,base+8],[0,base+8]], 'g25');
    line(c, 45, base - 20, 90, base - 20); line(c, 195, base - 15, 235, base - 15);
    for (let i = 0; i < 10; i++) { const x = ((i * 39 - scroll * 0.2) % 390 + 390) % 390 - 30; px(c, x, base + 2, 5, 1); px(c, x + 2, base, 1, 3); }
  } else {
    // Nebraska reads as fields, windbreaks, and grain storage instead of a city skyline.
    shape(c, [[0,base-7],[63,base-14],[148,base-7],[232,base-12],[320,base-5],[320,base+6],[0,base+6]], 'g25');
    trees(c, 5, base, 0.65);
    const bx = Math.round(((240 - scroll * 0.14) % 440 + 440) % 440 - 40);
    barn(c, bx, base + 4);
    for (let i = 0; i < 3; i++) {
      const xx = bx + 46 + i * 11;
      c.fillStyle = PAPER; c.fillRect(xx, base-25, 10, 29); rect(c, xx, base-25, 10, 29);
      line(c, xx-1, base-25, xx+5, base-31); line(c, xx+5, base-31, xx+11, base-25);
      grey(c, xx+6, base-24, 3, 27, 'g50');
    }
    for (let i = 0; i < 16; i++) line(c, i * 22, base + 9, i * 18 + 18, base + 3);
  }
}

scenes.travel = function (c, s, t, opt) {
  const off = (opt.dist || 0);
  const horizon = 96;
  landscape(c, s, horizon - 9, off);
  // mid layer: poles
  poles(c, off * 0.6, horizon + 2);
  // A passing fence stays beyond the shoulder, never in the driving lane.
  for (let i = 0; i < 10; i++) {
    const x = ((i * 40 - off * 0.7) % 400 + 400) % 400 - 40;
    px(c, x, horizon - 4, 2, 10);
    line(c, x, horizon, x + 40, horizon);
  }
  // road
  road(c, horizon + 6, 46);
  // Actual next-stop signs pass on the far shoulder, clear of the driving lane.
  const leg = ZT.currentLeg(s);
  if (leg) {
    const signX = 360 - ((off * 0.72 + 120) % 560 + 560) % 560;
    destinationSign(c, Math.round(signX), horizon + 2, ZT.NODES[leg.to].name,
      Math.max(0, Math.ceil(leg.miles - s.legMiles)), t);
  }
  // the wagon (or walkers on foot)
  const bob = Math.round(Math.sin(off * 0.9) * (s.pace === 'hard' ? 1.2 : 0.6));
  if (s.vehicle.has) {
    c.save(); c.translate(119, horizon + 7 + bob); c.scale(2, 2);
    wagon(c, 0, 0, off, !!s.vehicle.broken, s); c.restore();
    // Tailpipe puffs stay behind the wagon. Engine trouble has a visible cue.
    for (let i = 0; i < 3; i++) {
      const p = (t * 7 + i * 4) % 12;
      grey(c, 116 - p * 2, horizon + 34 - p / 3, 3 + p / 2, 2, 'g25');
    }
    if (s.vehicle.engine < 35 || s.vehicle.broken === 'engine') smoke(c, 199, horizon + 13, t, 25);
  }
  else { c.save(); c.translate(106, 115); c.scale(2, 2); const n = ZT.State.aliveCount(s); for (let i = 0; i < n; i++) figure(c, i * 11, 0, off * 1.4 + i, false); c.restore(); }
  for (let i = 0; i < 13; i++) {
    const x = ((i * 29 - off * 1.4) % 377 + 377) % 377 - 25;
    line(c, x, 159, x + 2, 154); line(c, x + 2, 159, x + 6, 156);
  }
  weatherFX(c, s.weather, t, opt.reduce);
};

function barn(c, x, y) {
  px(c, x, y - 14, 30, 14);
  c.fillStyle = PAPER; c.fillRect(x + 2, y - 12, 26, 10); c.fillStyle = INK;
  line(c, x, y - 14, x + 15, y - 22); line(c, x + 15, y - 22, x + 30, y - 14);
  px(c, x + 12, y - 8, 6, 8);
  px(c, x + 34, y - 20, 6, 20); // silo
  line(c, x + 34, y - 20, x + 37, y - 24); line(c, x + 37, y - 24, x + 40, y - 20);
  for (let xx = x + 3; xx < x + 28; xx += 4) px(c, xx, y - 10, 1, 10);
  c.fillStyle = PAPER; c.fillRect(Math.round(x+12),Math.round(y-8),6,8); rect(c,x+12,y-8,6,8);
  line(c,x+12,y-8,x+18,y); line(c,x+18,y-8,x+12,y);
}

// Small integer-pixel wind cycles keep the old bitmap look without shimmering.
// Only display time is used: scenery must never advance the game's seeded RNG.
function windCloth(c, x, y, t, length) {
  for (let i = 0; i < length; i++) {
    const wave = Math.round(Math.sin(t * 1.8 - i * 0.55) * (i / length) * 3);
    px(c, x + i, y + wave, 1, i < length - 3 ? 3 : 2);
  }
}
function destinationSign(c, x, y, name, miles, t) {
  const label = name.toUpperCase(), w = Math.max(64, tw(label) + 12);
  px(c, x + 9, y - 29, 2, 29); px(c, x + w - 11, y - 29, 2, 29);
  c.fillStyle = PAPER; c.fillRect(x, y - 40, w, 24);
  rect(c, x, y - 40, w, 24);
  bmp(c, label, x + 6, y - 35);
  bmp(c, miles + ' MI', x + 6, y - 25);
  // A torn survey ribbon, not a flashing light, catches the wind.
  windCloth(c, x + w - 9, y - 13, t, 13);
}

scenes.title = function (c, s, t) {
  // horizon with a dead town and a car leaving it
  const horizon = 108;
  nightSky(c,88);
  skyline(c, 21, horizon - 4, 34, 0.85, 'town');
  ground(c, horizon + 2, t * 40);
  c.save();c.translate(204,112);c.scale(2,2);wagon(c,0,0,t*6,false);c.restore();
  for (let i = 0; i < 7; i++) {c.save();c.translate(8+i*25,horizon+5+(i%2)*8);c.scale(2,2);figure(c,0,0,t+i,true);c.restore();}
  // Sagging fence and a boarded warning make the title an abandoned roadside.
  line(c,0,100,93,100);for(let x=4;x<91;x+=16)px(c,x,96,2,18);
  rect(c,19,77,66,18);plate(c,'ROAD CLOSED',24,83);
};

/* generic composers used by event art keys */
function sceneRoadWith(drawer) {
  return function (c, s, t, opt) {
    const horizon = 92;
    landscape(c, s, horizon - 8, 0);
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
scenes.sign = sceneRoadWith(function (c, s, t, hz, opt) {
  px(c, 60, hz - 34, 4, 40); px(c, 96, hz - 34, 4, 40);
  const sway = Math.round(Math.sin(t * 0.9) * 2);
  line(c, 62, hz - 36, 62 + sway, hz - 42);
  line(c, 98, hz - 36, 98 + sway, hz - 42);
  px(c, 46 + sway, hz - 46, 68, 26);
  c.fillStyle = PAPER; c.fillRect(48 + sway, hz - 44, 64, 22);
  px(c, 54 + sway, hz - 38, 42, 2); px(c, 54 + sway, hz - 32, 34, 2);
  line(c, 54 + sway, hz - 26, 98 + sway, hz - 26);
  line(c, 94 + sway, hz - 29, 99 + sway, hz - 26);
  line(c, 94 + sway, hz - 23, 99 + sway, hz - 26);
  windCloth(c, 100, hz - 14, t, 22);
  parkedArrival(c, s, t, opt, 190, hz + 6);
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
  px(c, 250, hz - 46, 4, 46);
  const sway = Math.round(Math.sin(t * 0.7) * 2);
  line(c, 251, hz - 48, 253 + sway, hz - 52);
  c.fillStyle = PAPER; c.fillRect(231 + sway, hz - 65, 45, 15);
  rect(c, 231 + sway, hz - 65, 45, 15); bmp(c, 'MOTEL', 241 + sway, hz - 60);
  windCloth(c, 241, hz - 8, t, 13);
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
      const x = 104 + (i % 7) * 29 + Math.round(Math.sin(t * 0.6 + i) * 2);
      const y = hz + 5 + Math.floor(i / 7) * 24 + Math.floor(hash(i + 5) * 5);
      c.save();c.translate(x,y);c.scale(2,2);figure(c,0,0,t*1.1+i,true);c.restore();
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
  for (let row = 0; row < 3; row++) for (let i = 0; i < [25,20,13][row]; i++) {
    const x = i * [13,17,26][row] - 4 + Math.round(hash(i*3+row)*5+Math.sin(t*0.5+i+row)*2);
    const y = hz + row*17 + Math.floor(hash(i+row*7)*5), scale=row===2?2:1;
    c.save();c.translate(x,y);c.scale(scale,scale);figure(c,0,0,t*0.8+i+row,true);c.restore();
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
  landscape(c, s, 86, 0);
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
  // The loose washroom door opens a little in the wind, exposing the dark room.
  const door = 5 + Math.round((Math.sin(t * 0.65) + 1) * 4);
  c.fillStyle = PAPER; c.fillRect(183, 89, door, 18);
  px(c, 183 + door, 88, 1, 20); px(c, 181 + door, 99, 1, 2);
  rect(c, 217, 88, 15, 20); for (let y = 91; y < 104; y += 4) px(c, 220, y, 8, 2);
  rect(c, 27, 65, 49, 30); plate(c, 'MAP', 44, 69);
  line(c, 32, 87, 67, 77); line(c, 47, 77, 56, 91);
  px(c, 33, 95, 2, 13); px(c, 69, 95, 2, 13);
  px(c, 101, 97, 44, 3); line(c, 109, 100, 104, 109); line(c, 135, 100, 141, 109);
  px(c, 99, 104, 48, 2);
  windCloth(c, 74, 93, t, 13);
  if (zombies) for (let i = 0; i < 9; i++) figure(c, 83 + i * 22 + Math.sin(t * 0.5 + i) * 3, 88 + i % 3 * 7, t + i, true);
  parkedArrival(c, s, t, opt, 55, 123);
  weatherFX(c, s.weather, t, opt && opt.reduce);
}
scenes.reststop = (c, s, t, opt) => restArea(c, s, t, opt, false);
scenes.zrest = (c, s, t, opt) => restArea(c, s, t, opt, true);

function campBuilding(c, s, t) {
  const x = 222, y = 101, w = 78, h = 34;
  const terrain = ZT.region(s).terrain;
  const cabin = terrain === 'mountain' || terrain === 'hills' || terrain === 'river';
  c.fillStyle = PAPER; c.fillRect(x, y - h, w, h);
  // Cabin in wooded country; low roadside shelter on the plains and desert.
  if (cabin) {
    shape(c,[[x-4,y-h],[x+w/2,y-h-14],[x+w+4,y-h]],PAPER);
    px(c, x + 53, y - h - 17, 6, 17);
    smoke(c, x + 55, y - h - 20, t * 0.6, 27);
    line(c, x - 4, y - h, x + w / 2, y - h - 14);
    line(c, x + w / 2, y - h - 14, x + w + 4, y - h);
  } else {
    shape(c,[[x-4,y-h-4],[x+w+4,y-h-4],[x+w,y-h],[x,y-h]],PAPER);
    line(c, x - 4, y - h - 4, x + w + 4, y - h - 4);
    line(c, x - 4, y - h - 4, x, y - h);
    line(c, x + w + 4, y - h - 4, x + w, y - h);
  }
  rect(c, x, y - h, w, h);
  for (let yy = y - h + 6; yy < y; yy += 6) line(c, x + 1, yy, x + w - 2, yy);
  // Dark doorway and a lantern window; the shutter moves without blinking.
  px(c, x + 12, y - 24, 14, 24);
  c.fillStyle = PAPER; c.fillRect(x + 41, y - 26, 25, 18);
  rect(c, x + 43, y - 24, 21, 14);
  px(c, x + 53, y - 23, 1, 12); px(c, x + 44, y - 17, 19, 1);
  const shutter = 3 + Math.round((Math.sin(t * 0.7) + 1) * 3);
  grey(c, x + 43, y - 23, shutter, 12, 'g50');
  px(c, x + 43 + shutter, y - 23, 1, 12);
  // Porch tarp tied to two posts. The hem, rather than the whole roof, moves.
  px(c, x - 6, y - 12, 2, 15); px(c, x + 33, y - 12, 2, 15);
  line(c, x - 8, y - 15, x + 36, y - 15);
  for (let dx = 0; dx < 43; dx++) {
    const ripple = Math.round(Math.sin(t * 1.3 + dx * 0.22) * 1.5);
    px(c, x - 7 + dx, y - 12 + ripple, 1, 1);
  }
}
function nightSky(c, base) {
  const sky = ZT.Display.mode === 'dark' ? PAPER : INK;
  const stars = ZT.Display.mode === 'dark' ? INK : PAPER;
  c.fillStyle=sky;c.fillRect(0,0,W,base);
  for(let i=0;i<48;i++){const x=Math.round(hash(i*3.3)*W),y=Math.round(hash(i*7.7)*(base-14));c.fillStyle=stars;c.fillRect(x,y,1,1);}
  disc(c,265,24,12,stars);disc(c,260,20,10,sky);
  c.fillStyle=stars;c.fillRect(42,22,5,1);c.fillRect(44,20,1,5);
}
scenes.camp = function (c, s, t, opt) {
  const hz = 107;
  nightSky(c,81);
  if (['mountain', 'hills'].includes(ZT.region(s).terrain)) mountains(c, 11, 81, 31);
  trees(c, 51, hz, 1.2); ground(c, hz + 2, 0);
  campBuilding(c, s, t);
  if (s.vehicle.has) wagon(c, 20, hz - 6, 0, false);
  // Canvas tent and a loose entrance flap moving in the breeze.
  c.fillStyle = PAPER; c.fillRect(73, 112, 73, 37);
  line(c, 76, 147, 102, 114); line(c, 102, 114, 139, 147); line(c, 76, 147, 139, 147);
  const flap = Math.round(Math.sin(t * 1.2) * 3);
  line(c, 102, 114, 102 + flap, 147);
  grey(c, 104 + flap, 134, 12, 12, 'g25');
  line(c, 102, 114, 118 + flap, 147);
  shape(c,[[103,116],[119+flap,146],[137,146]],'g50');
  line(c,85,136,105,136);line(c,89,131,106,131);
  line(c, 76, 147, 69, 151); line(c, 139, 147, 146, 151);
  windCloth(c, 103, 115, t, 12);
  // A low cooking fire, kettle, and one seated figure per living traveler.
  for (let i = 0; i < 18; i++) {
    const p = (t * 17 + i * 5) % 20;
    px(c, 160 + Math.sin(i * 2 + t * 2) * (2 + p * 0.16), 114 - p, 2, 2);
  }
  line(c, 151, 116, 170, 113); line(c, 152, 113, 169, 116);
  const seats = [[118,89],[182,97],[186,126],[219,119],[267,115]];
  for (let i = 0; i < ZT.State.aliveCount(s); i++) {
    const [x, y] = seats[i];
    traveler(c,x,y,'sit',t,i);
  }
  rect(c, 205, 136, 34, 9); px(c, 208, 137, 1, 7);
  line(c, 149, 117, 161, 89); line(c, 161, 89, 174, 117);
  const kettle = Math.round(Math.sin(t * 0.8));
  line(c, 161, 89, 161 + kettle, 99);
  px(c, 157 + kettle, 101, 9, 6); circle(c, 161 + kettle, 101, 4);
  smoke(c, 160 + kettle, 95, t * 0.7, 32);
  // A lantern, stacked firewood, and folded bedding ground the camp equipment.
  rect(c,29,134,9,12);rect(c,31,130,5,4);px(c,32,137,3,5);
  for(let i=0;i<3;i++){rect(c,43+i*3,143-i*4,24,4);circle(c,66+i*3,145-i*4,2);}
  weatherFX(c, s.weather, t, opt && opt.reduce);
};
/* ---------- close-up trail illustrations ---------- */
function traveler(c, x, y, pose, t, variant) {
  c.save(); c.translate(Math.round(x), Math.round(y));
  const kneel = pose === 'repair', seated = pose === 'sit', head = kneel ? 8 : 0;
  grey(c, -2, 29, 20, 2, 'g25');
  px(c, 4, head, 6, 7); px(c, 3, head + 1, 8, 3);
  c.fillStyle = PAPER; c.fillRect(6,head+3,4,3);
  px(c, 9, head + 3, 2, 1); px(c, 4, head - 1, 6, 2);
  if (variant % 2 === 0) { px(c, 3, head, 10, 1); px(c, 4, head - 2, 6, 2); }
  shape(c, [[3,head+8],[10,head+8],[12,head+18],[1,head+18]], INK);
  c.fillStyle = PAPER; c.fillRect(5,head+9,2,7);
  if (kneel) {
    px(c, 3, 25, 10, 3); px(c, 10, 27, 7, 2);
    const reach = Math.round(Math.sin(t * 2.4) * 2);
    line(c, 11, 18, 17, 23 + reach); px(c, 17, 22 + reach, 5, 2);
    line(c, 21, 19 + reach, 21, 27 + reach); px(c, 19, 19 + reach, 4, 1);
  } else if (seated) {
    px(c, 2, 18, 15, 4); px(c, 14, 21, 3, 7); px(c, 12, 27, 7, 2);
    px(c, 0, 23, 11, 2); px(c, 1, 25, 2, 5);
    line(c, 11, 10, 13, 15); line(c, 13, 15, 17, 13);
    const sip = Math.round(Math.max(0, Math.sin(t * 0.8 + variant)) * 2);
    c.fillStyle = PAPER; c.fillRect(16,9-sip,4,5); rect(c,16,9-sip,4,5); px(c,20,10-sip,1,3);
  } else {
    px(c, 2, 18, 4, 9); px(c, 8, 18, 4, 9); px(c, 1, 27, 6, 2); px(c, 8, 27, 6, 2);
    line(c, 1, 9, -1, 19); line(c, 11, 9, 14, 16);
    if (pose === 'drink') { rect(c, 12, 12, 4, 6); px(c, 13, 10, 2, 2); }
    else px(c, 13, 16, 2, 4);
  }
  c.restore();
}
function toolbox(c, x, y) {
  c.fillStyle = PAPER; c.fillRect(x,y,24,13); rect(c,x,y,24,13); rect(c,x+7,y-4,10,4);
  px(c,x+1,y+4,22,1); px(c,x+10,y+3,4,4); grey(c,x+2,y+7,20,4,'g25');
}
function closeWagon(c, s, x, y, scale, hood) {
  if (!s.vehicle.has) return;
  c.save(); c.translate(x,y); c.scale(scale,scale); wagon(c,0,0,0,!!hood,s); c.restore();
}
function spareWheel(c, x, y, turn) {
  x=Math.round(x); y=Math.round(y);
  disc(c,x,y,10); disc(c,x,y,6,PAPER); disc(c,x,y,2);
  for(let i=0;i<4;i++) {
    const a=i*Math.PI/2+turn;
    px(c,x+Math.round(Math.cos(a)*4),y+Math.round(Math.sin(a)*4),2,2);
  }
}
function repairScene(c, s, t, opt, hot) {
  // This is a cosmetic, one-shot sequence on a successful spare-tire choice.
  // Use scene age, not the game's animation clock, and never replay on a loop.
  const changing=!!(opt && opt.animation==='tire_change' && s.vehicle.has);
  const age=changing ? (opt.motion===false ? 8 : ZT.clamp(opt.elapsed == null ? t : opt.elapsed,0,8)) : 0;
  const done=changing && age>=8;
  if(changing) t=age;
  const rise=changing ? Math.min(1,age/1.6,Math.max(0,(8-age)/1)) : 0;
  const lift=Math.round(rise*6), wheelY=135-lift;
  landscape(c,s,83,0); ground(c,108,0);
  if(changing) {
    const label=age<1.6?'RAISE THE JACK':age<3.6?'REMOVE THE FLAT':age<5.4?'FIT THE SPARE':age<7?'TIGHTEN THE LUGS':age<8?'LOWER THE WAGON':'SPARE FITTED';
    plate(c,label,14,14);
  }
  if (hot) {
    c.fillStyle=PAPER;c.fillRect(239,66,71,23);
    rect(c,239,66,71,23); plate(c,'COLD DRINKS',243,70); plate(c,'1/4 MI',255,80); px(c,272,89,2,18);
  }
  grey(c,35,131,178,9,'g25');
  if (s.vehicle.has) {
    closeWagon(c,s,66,84-lift,3,false);
    // Keep the front tire on the shoulder as the jack raises the chassis.
    disc(c,171,wheelY,12,PAPER); spareWheel(c,171,135,0);
    disc(c,93,wheelY,12,PAPER); disc(c,93,wheelY,3);
    if(!changing || age<1.6) {
      // A visibly squashed tire, not an already completed repair, before choosing.
      shape(c,[[83,wheelY-5],[87,wheelY-9],[99,wheelY-9],[103,wheelY-4],[105,wheelY+8],[81,wheelY+8]],INK);
      disc(c,93,wheelY,5,PAPER);disc(c,93,wheelY,2);
    } else if(age<3.6) {
      const u=ZT.clamp((age-1.6)/1.5,0,1);
      spareWheel(c,93-65*u,wheelY+(140-wheelY)*u,-u*4);
    }
    if(changing && age>=3.6) {
      // The discarded flat stays beside the car instead of disappearing.
      shape(c,[[17,138],[22,134],[34,134],[39,138],[41,146],[15,146]],INK);
      c.fillStyle=PAPER; c.fillRect(24,138,8,4);
    }
    if(!changing || age<3.6) spareWheel(c,44,135,0);
    else if(age<5.4) {
      const u=ZT.clamp((age-3.6)/1.8,0,1);
      spareWheel(c,44+49*u,135+(wheelY-135)*u,u*4);
    } else spareWheel(c,93,wheelY,0);
    // Scissor jack expands and folds; the handle works only during lift/lowering.
    const jy=done?147:138-lift;
    line(c,107,jy,101,146);line(c,101,jy,107,146);
    line(c,99,147,111,147);line(c,100,jy,110,jy);
    const pump=changing && (age<1.6 || age>=7 && !done) ? Math.round(Math.sin(age*9)*3) : 0;
    line(c,108,143,122,142+pump);px(c,121,141+pump,3,3);
  }
  const n=ZT.State.aliveCount(s);
  if (n) {
    if(done) traveler(c,53,117,'stand',0,0);
    else {
      traveler(c,70,119,'repair',t,0);
      if(changing && age>=5.4 && age<7) {
        const a=Math.sin(age*10)*0.7;
        line(c,84,138,93,wheelY);
        line(c,93,wheelY,93+Math.cos(a)*9,wheelY+Math.sin(a)*9);
      }
    }
  }
  for (let i=1;i<n;i++) traveler(c,201+(i-1)*27,106+(i%2)*8,'drink',t,i);
  toolbox(c,139,143); line(c,173,152,188,146); px(c,185,145,5,2);
  // Heat is a restrained shimmer above the empty shoulder, away from faces and text.
  if (hot) for (let i=0;i<4;i++) { const x=16+i*55+Math.round(Math.sin(t*1.2+i)*3); px(c,x,101+(i%2)*4,11,1); }
  if (!hot) weatherFX(c,s.weather,t,opt&&opt.reduce);
}
scenes.tire = (c,s,t,opt) => repairScene(c,s,t,opt,s.weather==='heat');
scenes.summer_flat = (c,s,t,opt) => repairScene(c,s,t,opt,true);
scenes.hood = function(c,s,t,opt) {
  landscape(c,s,82,0); ground(c,112,0);
  closeWagon(c,s,52,85,3,true);
  if (s.vehicle.has) smoke(c,177,98,t,43);
  const n=ZT.State.aliveCount(s);
  for(let i=0;i<n;i++) traveler(c,201+i*21,107-(i%2)*5,i===0?'repair':'stand',t,i);
  toolbox(c,184,143); rect(c,27,136,13,20); rect(c,30,132,7,4); px(c,30,141,7,2);
  weatherFX(c,s.weather,t,opt&&opt.reduce);
};

function farmStand(c,s,t,opt,ice) {
  landscape(c,s,83,0); ground(c,109,0);
  // Timber walls and a deep awning give the counter a clear foreground silhouette.
  c.fillStyle=PAPER; c.fillRect(95,49,159,60); rect(c,95,49,159,60);
  for(let x=98;x<252;x+=7) px(c,x,52,1,55);
  shape(c,[[87,51],[104,34],[242,34],[263,51]],INK);
  for(let x=95;x<254;x+=12) shape(c,[[x,50],[x+8,37],[x+13,37],[x+8,50]],PAPER);
  px(c,91,51,169,4); px(c,94,54,3,55); px(c,253,54,3,55);
  c.fillStyle=PAPER; c.fillRect(110,60,110,29); rect(c,110,60,110,29);
  px(c,110,87,112,4); grey(c,111,92,108,15,'g25');
  for(let x=118;x<213;x+=16) { rect(c,x,75,5,11); px(c,x+1,73,3,2); }
  c.fillStyle=PAPER;c.fillRect(126,17,99,15);rect(c,126,17,99,15);px(c,138,32,2,3);px(c,210,32,2,3);
  plate(c,ice?'ICE / COLD WATER':'COLD DRINKS',174,23,'c');
  // Propane refrigerator, hand-painted board, cooler, and hanging pennant.
  c.fillStyle=PAPER;c.fillRect(226,66,23,41);rect(c,226,66,23,41);px(c,226,81,23,1);px(c,230,87,1,8);
  plate(c,'ICE',230,71);c.fillStyle=PAPER;c.fillRect(31,71,51,31);rect(c,31,71,51,31);plate(c,ice?'ICE':'BEER',37,77);plate(c,'WATER',37,87);
  line(c,35,102,32,112);line(c,76,102,79,112);
  rect(c,261,91,38,18);px(c,262,97,36,2);px(c,264,89,32,2);
  // The owner is behind the counter, distinct from the actual traveler count.
  figure(c,167,72,0,false); windCloth(c,96,56,t,18);
  const seats=[[221,120],[249,120],[279,120],[13,120],[40,120]];
  for(let i=0;i<ZT.State.aliveCount(s);i++) traveler(c,seats[i][0],seats[i][1],'sit',t,i);
  parkedArrival(c,s,t,opt,115,124);
  // The foreground road is kept clear; only the cloth and cups animate once parked.
  if (['rain','snow','storm'].includes(s.weather)) weatherFX(c,s.weather,t,opt&&opt.reduce);
}
scenes.cold_drinks=(c,s,t,opt)=>farmStand(c,s,t,opt,false);
scenes.ice_freezer=(c,s,t,opt)=>farmStand(c,s,t,opt,true);
scenes.beer_tent=function(c,s,t,opt) {
  landscape(c,s,83,0); ground(c,110,0);
  c.fillStyle=PAPER;c.fillRect(89,47,207,62);
  shape(c,[[83,59],[125,29],[259,29],[303,59]],INK);
  for(let x=105;x<280;x+=25) shape(c,[[x,57],[x+11,32],[x+22,32],[x+17,57]],PAPER);
  px(c,86,58,215,4);px(c,93,61,3,47);px(c,289,61,3,47);
  plate(c,'COLD ONES',196,42,'c');
  grey(c,98,64,188,43,'g50');
  for(let i=0;i<9;i++) { c.save();c.translate(107+i*20,77+(i%2)*5);figure(c,0,0,t*0.8+i,true);c.restore(); }
  rect(c,226,90,48,15);plate(c,'BEER',239,95);
  for(let x=84;x<303;x+=13) {px(c,x,99,2,20);line(c,x,103,x+13,115);line(c,x,115,x+13,103);} px(c,84,102,220,2);
  line(c,33,31,300,18);
  for(let i=0;i<13;i++) {const x=38+i*20,y=31-i;shape(c,[[x,y],[x+10,y],[x+5,y+7+Math.round(Math.sin(t*1.3+i))]],INK);}
  px(c,36,42,3,64);rect(c,12,44,52,25);plate(c,'COUNTY',22,49);plate(c,'FAIR',27,59);
  parkedArrival(c,s,t,opt,49,126);
  c.save();c.translate(250,121);c.scale(2,2);figure(c,0,0,t*0.8,true);c.restore();
  weatherFX(c,s.weather,t,opt&&opt.reduce);
};
scenes.sprinkler=function(c,s,t,opt) {
  landscape(c,s,83,0);ground(c,107,0);
  for(let i=0;i<12;i++) {const x=i*29;line(c,x,157,x+61,109);}
  for(let x=90;x<302;x+=35) {line(c,x,92,x+17,82);line(c,x+17,82,x+35,92);px(c,x,92,35,2);}
  for(const x of [99,187,284]) {line(c,x,94,x-9,121);line(c,x,94,x+9,121);disc(c,x-9,123,3);disc(c,x+9,123,3);}
  const angle=-1.6+Math.sin(t*0.5)*0.7;
  for(let i=0;i<25;i++) {const p=i/24; const x=188+Math.cos(angle)*p*95,y=88+Math.sin(angle)*p*60+p*p*33;px(c,x,y,1,2);}
  for(let i=0;i<3;i++){c.save();c.translate(180+i*24+Math.round(Math.sin(t*0.5)*6),120);c.scale(2,2);figure(c,0,0,t+i,true);c.restore();}
  closeWagon(c,s,12,112,2,false);
  weatherFX(c,s.weather,t,opt&&opt.reduce);
};

scenes.sick=function(c,s,t,opt) {
  // A close view of the bedroll replaces the anonymous black rectangle.
  landscape(c,s,77,0);ground(c,112,0);
  line(c,12,16,12,118);line(c,12,16,291,34);line(c,291,34,304,118);
  shape(c,[[12,16],[291,34],[259,53],[32,36]],'g25');
  grey(c,30,130,160,12,'g25');rect(c,42,110,133,22);px(c,45,132,3,14);px(c,165,132,3,14);
  c.fillStyle=PAPER;c.fillRect(45,111,126,18);disc(c,60,104,7);disc(c,62,106,4,PAPER);
  shape(c,[[75,104],[115,101],[143,110],[170,114],[170,129],[71,129]],INK);
  shape(c,[[76,105],[114,103],[144,113],[170,116],[170,121],[77,115]],'g25');
  for(let x=82;x<162;x+=14){c.fillStyle=PAPER;c.fillRect(x,116,1,10);}
  px(c,54,104,7,1);
  if(ZT.State.aliveCount(s)>1) {c.save();c.translate(185,88);c.scale(2,2);traveler(c,0,0,'repair',t,1);c.restore();}
  toolbox(c,235,128);c.fillStyle=PAPER;c.fillRect(244,132,7,2);c.fillRect(247,130,2,6);
  rect(c,216,136,8,12);px(c,218,133,4,3);
  weatherFX(c,s.weather,t,opt&&opt.reduce);
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
