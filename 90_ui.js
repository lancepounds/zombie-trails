/* ZOMBIE TRAILS — UI controller. Menus, keyboard and pointer, modal events. */
'use strict';
ZT.UI = (function () {
let S = null;                 // game state
let screen = 'title';
let ctxData = {};             // per-screen scratch
let raf = null, last = 0, tAnim = 0;
let keyMap = {};              // key -> handler for the current screen
let settings = Object.assign({ sound: false, flash: true, scale: 1, arcade: true }, ZT.Save.settings());
let travelling = null;        // travel animation state
let scav = null;              // active minigame

const $ = (id) => document.getElementById(id);
const esc = (str) => String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

/* ---------------- shell ---------------- */
function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }

function statusLine() {
  if (!S) return '';
  const next = ZT.nextNode(S);
  const to = ZT.milesToNext(S);
  const leg = ZT.currentLeg(S);
  return `<div class="bar" role="status" aria-live="polite">
    <span><b>DAY</b> ${S.day}</span>
    <span><b>DATE</b> ${ZT.dateOf(S.day)}</span>
    <span><b>MILE</b> ${Math.round(S.miles)}</span>
    <span><b>${leg ? 'NEXT' : 'AT'}</b> ${esc(next.name)}${leg ? ` (${to} mi ${ZT.heading(S)})` : ''}</span>
    <span><b>BOISE</b> ${Math.round(ZT.milesToEnd(S))} mi</span>
    <span><b>WX</b> ${ZT.WEATHER[S.weather].name}</span>
    <span><b>ROAD</b> ${ZT.Travel.threatWord(S)}</span>
  </div>`;
}

function sceneHTML(alt) {
  return `<div class="scene"><canvas id="scene" width="960" height="480" role="img" aria-label="${esc(alt || 'Monochrome travel scene')}"></canvas></div>`;
}

function menuHTML(items, opts) {
  opts = opts || {};
  const rows = items.map((it, i) => {
    if (it.sep) return `<li class="sep">${esc(it.sep)}</li>`;
    const n = it.key != null ? it.key : (i + 1);
    const dis = it.disabled ? ' disabled' : '';
    return `<li><button class="cmd" data-i="${i}"${dis}>
      <span class="num">${esc(String(n))}</span>
      <span class="lbl">${esc(it.label)}</span>
      ${it.hint ? `<span class="hint">${esc(it.hint)}</span>` : ''}
    </button></li>`;
  }).join('');
  return `<ul class="menu${opts.compact ? ' compact' : ''}">${rows}</ul>`;
}

function bindMenu(root, items, onPick) {
  keyMap = {};
  const buttons = [...root.querySelectorAll('button.cmd')];
  buttons.forEach((b) => {
    const i = Number(b.dataset.i);
    b.addEventListener('click', () => { if (!items[i].disabled) { ZT.Audio.select(); onPick(i, items[i]); } });
  });
  items.forEach((it, i) => {
    if (it.sep || it.disabled) return;
    const k = String(it.key != null ? it.key : (i + 1)).toLowerCase();
    keyMap[k] = () => { ZT.Audio.select(); onPick(i, it); };
  });
  // arrow navigation
  let idx = -1;
  const focusable = buttons.filter((b) => !b.disabled);
  const move = (d) => {
    if (!focusable.length) return;
    idx = (idx + d + focusable.length) % focusable.length;
    focusable[idx].focus(); ZT.Audio.move();
  };
  keyMap['arrowdown'] = () => move(1);
  keyMap['arrowup'] = () => move(-1);
  keyMap['s'] = keyMap['s'] || (() => move(1));
  keyMap['w'] = keyMap['w'] || (() => move(-1));
}

function render(html, alt) {
  const root = $('screen');
  root.innerHTML = html;
  const cv = $('scene');
  if (cv) fitCanvas(cv);
  return root;
}

/* The scene is a band, not the page. Pick the largest whole-pixel scale that fits
   the column AND a share of the viewport height, so the commands stay on screen. */
function fitCanvas(cv) {
  const w = (cv.parentElement && cv.parentElement.clientWidth) || 640;
  const vh = window.innerHeight || 800;
  const share = screen === 'map' ? 0.56 : screen === 'scavenge' ? 0.5 : (TOUCH ? 0.38 : 0.44);
  const budget = Math.max(112, Math.min(vh * share, 470));
  // aspect is exactly 2:1, so the box is whichever of width or height budget binds
  const cssW = Math.max(200, Math.min(w, Math.round(budget * 2)));
  const scale = ZT.clamp(Math.round(cssW / ZT.R.W), 1, 6);   // backing store stays a whole multiple
  cv.width = ZT.R.W * scale;
  cv.height = ZT.R.H * scale;
  cv.style.width = cssW + 'px';
  cv.style.height = Math.round(cssW / 2) + 'px';
}

/* ---------------- loop ---------------- */
function loop(ts) {
  raf = requestAnimationFrame(loop);
  const dt = Math.min(0.05, (ts - last) / 1000 || 0);
  last = ts; tAnim += dt;
  const cv = $('scene');
  if (screen === 'scavenge' && scav) {
    ZT.Scavenge.step(scav, dt, input);
    if (cv) ZT.R.drawScavenge(cv, scav, tAnim);
    updateScavHud(scav);
    if (scav.over) { const o = scav.over; scav = null; finishScavenge(o); }
    return;
  }
  if (travelling) {
    travelling.t += dt;
    travelling.dist += dt * (travelling.speed || 34);
    if (cv) ZT.R.draw(cv, 'travel', S, tAnim, { dist: travelling.dist, reduce: !settings.flash });
    if (travelling.t >= travelling.dur) stepTravel();
    return;
  }
  if (cv && ctxData.art) ZT.R.draw(cv, ctxData.art, S || fakeState(), tAnim, { dist: tAnim * 30, reduce: !settings.flash, sel: ctxData.sel });
}
function fakeState() { return { weather: 'clear', miles: 0, vehicle: { has: true }, party: [], pace: 'steady', at: ZT.START_NODE, legTo: null, legMiles: 0, path: [ZT.START_NODE], seen: {} }; }

/* ---------------- input ---------------- */
const input = { up: false, down: false, left: false, right: false, action: false, vx: 0, vy: 0 };
const TOUCH = (() => { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
const STANDALONE = (() => { try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { return false; } })();
/* iOS will not make a sound until the page has been touched once */
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  if (settings.sound) ZT.Audio.setOn(true);
}
function onKey(e) {
  const k = e.key.toLowerCase();
  if (screen === 'scavenge') {
    const dn = e.type === 'keydown';
    if (k === 'arrowup' || k === 'w') { input.up = dn; e.preventDefault(); }
    else if (k === 'arrowdown' || k === 's') { input.down = dn; e.preventDefault(); }
    else if (k === 'arrowleft' || k === 'a') { input.left = dn; e.preventDefault(); }
    else if (k === 'arrowright' || k === 'd') { input.right = dn; e.preventDefault(); }
    else if (k === ' ' || k === 'enter') { input.action = dn; e.preventDefault(); }
    else if (k === 'escape' && dn) { if (scav) { ZT.Scavenge.finish(scav, 'left'); } }
    return;
  }
  if (e.type !== 'keydown') return;
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && k !== 'escape') return;
  const h = keyMap[k];
  if (h) { e.preventDefault(); h(); }
}

/* ---------------- screens ---------------- */
function goTitle() {
  screen = 'title'; ctxData = { art: 'title' }; S = null; travelling = null;
  const hasSave = ZT.Save.has();
  const items = [
    { label: 'New journey', hint: 'five names, one wagon' },
    { label: 'Continue', hint: hasSave ? saveBlurb() : 'no saved game', disabled: !hasSave },
    { label: 'How to survive', hint: 'instructions' },
    { label: 'The road behind', hint: 'memorials and scores' },
    { label: 'Settings', hint: 'sound, flashing, minigame' },
  ];
  const root = render(`
    <div class="title-wrap">
      <pre class="logo" aria-label="Zombie Trails">${LOGO}</pre>
      <p class="tag">&gt; WEST OR ELSE &lt;</p>
      ${sceneHTML('A station wagon leaving a dead town at night, with figures on the road')}
      <p class="blurb">1980s trail survival. Omaha to Boise, a station wagon,<br>five survivors, and the dead on every road.</p>
      ${menuHTML(items)}
      <p class="foot">${TOUCH ? 'Tap a command. Everything in the game is a tap.' : 'Number keys or click. Arrow keys move, Enter selects.'}</p>
    </div>`);
  bindMenu(root, items, (i) => {
    if (i === 0) goSetup();
    else if (i === 1) { const s = ZT.Save.load(); if (s) { S = s; if (S.over) goEnd(); else goTravel(); } }
    else if (i === 2) goInstructions();
    else if (i === 3) goRoadBehind();
    else if (i === 4) goSettings();
  });
}
function saveBlurb() {
  const i = ZT.Save.info(Number((ZT.Save.settings().lastSlot) || 1)) || ZT.Save.info(1);
  if (!i) return 'saved game';
  return `day ${i.day}, mile ${i.miles}, ${i.alive} alive`;
}

const LOGO = [
' ████████ ████████ ██     ██ ████████ ████ ████████',
'    ███   ██    ██ ███   ███ ██    ██  ██  ██      ',
'   ███    ██    ██ ████ ████ ████████  ██  ██████  ',
'  ███     ██    ██ ██ ███ ██ ██    ██  ██  ██      ',
' ████████ ████████ ██     ██ ████████ ████ ████████',
'',
'    ████████ ████████   ███    ██ ██     ████████  ',
'       ██    ██     ██ ██ ██   ██ ██    ██         ',
'       ██    ████████ ██   ██  ██ ██     ██████    ',
'       ██    ██   ██  ███████  ██ ██          ██   ',
'       ██    ██    ██ ██   ██  ██ █████ ████████   ',
].join('\n');

function goInstructions() {
  screen = 'help'; ctxData = { art: 'road' };
  const items = [{ label: 'Back', key: 'Esc' }];
  const root = render(`
    <div class="doc">
      <h1>HOW TO SURVIVE</h1>
      <div class="cols">
        <section>
          <h2>The road</h2>
          <p>You are leading five people from Omaha, Nebraska to Boise, Idaho: about thirteen hundred miles of real road, up the Platte, over the Continental Divide, and down the Snake. Word is that Boise held. Nobody has confirmed it.</p>
          <p>Most of the game is a menu. You choose to travel, and time passes, and things happen to you. When something happens you pick from a short list of bad options.</p>
        </section>
        <section>
          <h2>What kills you</h2>
          <ul>
            <li>Running out of food, slowly, over weeks.</li>
            <li>Running out of fuel somewhere that has none.</li>
            <li>A wagon that was never repaired.</li>
            <li>A bite that nobody had the medicine for.</li>
            <li>Deciding to search one more building.</li>
          </ul>
        </section>
        <section>
          <h2>Which road</h2>
          <p>The route forks three times: at Ogallala, at Green River, and at Fort Hall. The old emigrant roads are longer, emptier and harder on the wagon. The interstates are faster and run into cities. Neither is the right answer, and the map screen shows both.</p>
          <h2>Pace and rations</h2>
          <p><b>Cautious</b> is slow, quiet and safe. <b>Hard push</b> covers ground and wrecks the car and the people in it. <b>Steady</b> is the middle.</p>
          <p><b>Meager</b> rations save food and cost health. <b>Full</b> rations heal people and empty the wagon.</p>
        </section>
        <section>
          <h2>Noise and hordes</h2>
          <p>Gunfire, engines, alarms and breaking doors raise <b>noise</b>, which pulls the dead toward you now. <b>Horde pressure</b> rises the further west you go and does not come down easily. The ROAD reading at the top of the screen tells you where you stand.</p>
        </section>
        <section>
          <h2>Bites</h2>
          <p>A bite is not a death sentence and it is not nothing. Some wounds are clean. Some are not, and you will not know which for days. Medicine can stabilise an infection. It cannot promise anything.</p>
        </section>
        <section>
          <h2>Controls</h2>
          <p>Every command is a button. Tap it, click it, or press the number beside it. On a keyboard the arrow keys move through the menu, Enter chooses and Escape goes back.</p>
          <p>In the scavenging run on a touch screen, drag anywhere on the picture to steer and hold SEARCH to go through a container. On a keyboard it is the arrow keys and Space.</p>
          <p>Nothing in the journey itself is timed. The scavenging run is, and it can be turned off in Settings for a menu-driven version instead.</p>
        </section>
      </div>
      ${menuHTML(items)}
    </div>`);
  bindMenu(root, items, () => goTitle());
  keyMap['escape'] = () => goTitle();
}

function goSettings() {
  screen = 'settings'; ctxData = { art: 'road' };
  const items = [
    { label: `Sound: ${settings.sound ? 'ON' : 'OFF'}`, hint: 'primitive beeps' },
    { label: `Flashing and scanlines: ${settings.flash ? 'ON' : 'REDUCED'}`, hint: 'reduce for comfort' },
    { label: `Scavenging: ${settings.arcade ? 'MINIGAME' : 'MENU ONLY'}`, hint: 'menu mode needs no timed input' },
    { label: `Text size: ${['SMALL', 'NORMAL', 'LARGE'][settings.scale]}`, hint: '' },
    { label: 'Erase saved game and records', hint: 'cannot be undone' },
    { label: 'Back', key: 'Esc' },
  ];
  const root = render(`<div class="doc"><h1>SETTINGS</h1>${menuHTML(items)}</div>`);
  bindMenu(root, items, (i) => {
    if (i === 0) { settings.sound = !settings.sound; ZT.Audio.setOn(settings.sound); }
    else if (i === 1) { settings.flash = !settings.flash; ZT.R.setScanlines(settings.flash); applyFlash(); }
    else if (i === 2) settings.arcade = !settings.arcade;
    else if (i === 3) { settings.scale = (settings.scale + 1) % 3; applyScale(); }
    else if (i === 4) { if (confirm('Erase the saved game, memorials and scores?')) { ZT.Save.clear(1); ZT.Save.saveSettings(Object.assign({}, settings, { memorials: null })); try { localStorage.removeItem('zombietrails.v1.memorials'); localStorage.removeItem('zombietrails.v1.scores'); } catch (e) {} } }
    else { saveSettings(); goTitle(); return; }
    saveSettings(); goSettings();
  });
  keyMap['escape'] = () => { saveSettings(); goTitle(); };
}
function saveSettings() { ZT.Save.saveSettings(settings); }
function applyScale() { document.documentElement.style.setProperty('--tscale', [0.92, 1, 1.14][settings.scale]); }
function applyFlash() { const tube = document.getElementById('tube'); if (tube) tube.classList.toggle('reduced', !settings.flash); }

function goRoadBehind() {
  screen = 'records'; ctxData = { art: 'graves' };
  const mems = ZT.Save.memorials();
  const scores = ZT.Save.scores();
  const items = [{ label: 'Back', key: 'Esc' }];
  const root = render(`
    <div class="doc">
      <h1>THE ROAD BEHIND</h1>
      <div class="cols">
        <section>
          <h2>Markers</h2>
          ${mems.length ? `<ul class="plain">${mems.map((m) => `<li>${esc(m.name)} &mdash; mile ${m.mile}, day ${m.day}. ${esc(m.cause)}.${m.epitaph ? ` <i>&ldquo;${esc(m.epitaph)}&rdquo;</i>` : ''}</li>`).join('')}</ul>` : '<p class="dim">No one has died on this machine yet.</p>'}
        </section>
        <section>
          <h2>Best journeys</h2>
          ${scores.length ? `<ol class="plain">${scores.map((r) => `<li>${esc(String(r.score))} &mdash; ${esc(r.rank)} &mdash; ${esc(r.difficulty)} &mdash; ${r.won ? 'arrived' : 'ended'} day ${r.day}, mile ${r.miles}</li>`).join('')}</ol>` : '<p class="dim">No completed journeys yet.</p>'}
        </section>
      </div>
      ${menuHTML(items)}
    </div>`);
  bindMenu(root, items, () => goTitle());
  keyMap['escape'] = () => goTitle();
}

/* ---------------- party setup ---------------- */
function goSetup() {
  screen = 'setup'; ctxData = { art: 'figures' };
  const names = ctxData.names || ZT.DEFAULT_NAMES.slice();
  const roles = ctxData.roles || ['driver', 'medic', 'mechanic', 'scout', 'generalist'];
  let diff = ctxData.diff || 'normal';
  const root = render(`
    <div class="doc setup">
      <h1>WHO IS GOING</h1>
      <p class="lede">Five people are leaving Omaha in a station wagon. Name them. You will remember these names later, which is the point.</p>
      <table class="party-setup">
        <thead><tr><th scope="col">#</th><th scope="col">Name</th><th scope="col">Role</th><th scope="col">What it does</th></tr></thead>
        <tbody>
        ${[0, 1, 2, 3, 4].map((i) => `<tr>
          <td>${i + 1}</td>
          <td><input id="nm${i}" maxlength="12" value="${esc(names[i])}" aria-label="Name of traveller ${i + 1}"></td>
          <td><select id="rl${i}" aria-label="Role of traveller ${i + 1}">${ZT.ROLES.map((r) => `<option value="${r}"${roles[i] === r ? ' selected' : ''}>${ZT.cap(r)}</option>`).join('')}</select></td>
          <td class="dim" id="rt${i}">${esc(ZT.ROLE_TIPS[roles[i]])}</td>
        </tr>`).join('')}
        </tbody>
      </table>
      <h2>Difficulty</h2>
      <div class="diffs" role="radiogroup" aria-label="Difficulty">
        ${Object.entries(ZT.DIFF).map(([k, d]) => `<button class="diff${k === diff ? ' on' : ''}" data-d="${k}" role="radio" aria-checked="${k === diff}">
          <b>${esc(d.name)}</b><span>${esc(d.blurb)}</span><span class="dim">$${d.cash} to spend</span></button>`).join('')}
      </div>
      ${menuHTML([{ label: 'Depart for the supply depot', hint: 'next' }, { label: 'Roll random names', hint: '' }, { label: 'Back', key: 'Esc' }])}
    </div>`);
  root.querySelectorAll('.diff').forEach((b) => b.addEventListener('click', () => {
    diff = b.dataset.d; ctxData.diff = diff;
    ctxData.names = [0, 1, 2, 3, 4].map((i) => $('nm' + i).value);
    ctxData.roles = [0, 1, 2, 3, 4].map((i) => $('rl' + i).value);
    ZT.Audio.select(); goSetup();
  }));
  [0, 1, 2, 3, 4].forEach((i) => {
    $('rl' + i).addEventListener('change', () => { $('rt' + i).textContent = ZT.ROLE_TIPS[$('rl' + i).value]; });
  });
  const items = [{ label: 'Depart' }, { label: 'Random' }, { label: 'Back' }];
  bindMenu(root, items, (i) => {
    const nm = [0, 1, 2, 3, 4].map((k) => $('nm' + k).value.trim() || ZT.DEFAULT_NAMES[k]);
    const rl = [0, 1, 2, 3, 4].map((k) => $('rl' + k).value);
    if (i === 0) {
      S = ZT.State.newGame({ names: nm, roles: rl, difficulty: diff });
      goShop();
    } else if (i === 1) {
      const pool = ZT.NAME_POOL.slice();
      ctxData.names = [0, 1, 2, 3, 4].map(() => pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      ctxData.roles = rl; ctxData.diff = diff; goSetup();
    } else { ctxData = {}; goTitle(); }
  });
  keyMap['escape'] = () => { ctxData = {}; goTitle(); };
}

/* ---------------- supply depot ---------------- */
function goShop() {
  screen = 'shop'; ctxData.art = 'market';
  ctxData.cart = ctxData.cart || { food: 300, fuel: 30, medicine: 3, ammo: 60, parts: 2, tools: 1, goods: 4 };
  drawShop();
}
function shopTotal() { return ZT.ITEM_ORDER.reduce((t, k) => t + ctxData.cart[k] * ZT.ITEMS[k].price, 0); }
function drawShop() {
  const cart = ctxData.cart;
  const total = shopTotal();
  const left = S.inv.cash - total;
  const weight = ZT.ITEM_ORDER.reduce((t, k) => t + cart[k] * ZT.ITEMS[k].lbs, 0);
  const root = render(`
    <div class="doc shop">
      <h1>SUPPLY DEPOT &mdash; OMAHA, NEBRASKA</h1>
      <p class="lede">You have ${ZT.money(S.inv.cash)} and one station wagon. Boise is about ${ZT.SHORTEST} miles west. Whatever you do not buy here, you will be looking for on the road.</p>
      <table class="shop-table">
        <thead><tr><th scope="col">Item</th><th scope="col">Price</th><th scope="col" class="r">Qty</th><th scope="col"></th><th scope="col" class="r">Cost</th><th scope="col">Notes</th></tr></thead>
        <tbody>
        ${ZT.ITEM_ORDER.map((k, i) => {
          const it = ZT.ITEMS[k];
          return `<tr>
            <th scope="row">${esc(it.name)}</th>
            <td>${ZT.money(it.price * (it.price < 1 ? 100 : 1))}${it.price < 1 ? ' / 100' : ''} ${esc(it.unit)}</td>
            <td class="r num">${ZT.n(cart[k])}</td>
            <td class="qty">
              <button class="q" data-k="${k}" data-d="-1" aria-label="Less ${esc(it.name)}">&minus;</button>
              <button class="q" data-k="${k}" data-d="1" aria-label="More ${esc(it.name)}">+</button>
            </td>
            <td class="r num">${ZT.money(cart[k] * it.price)}</td>
            <td class="dim">${esc(it.tip)}</td>
          </tr>`;
        }).join('')}
        </tbody>
        <tfoot>
          <tr><th scope="row" colspan="4">Total</th><td class="r num">${ZT.money(total)}</td><td class="${left < 0 ? 'warn' : 'dim'}">${left < 0 ? 'You cannot afford this.' : ZT.money(left) + ' left over'}</td></tr>
          <tr><th scope="row" colspan="4">Load</th><td class="r num">${Math.round(weight)} lbs</td><td class="dim">${weight > 900 ? 'The wagon will drink fuel at this weight.' : 'The wagon rides well at this weight.'}</td></tr>
        </tfoot>
      </table>
      ${menuHTML([
        { label: 'Load up and go west', hint: left < 0 ? 'not enough money' : 'depart', disabled: left < 0 },
        { label: 'Advice from the quartermaster', hint: '' },
        { label: 'Start over', hint: 'clear the cart' },
      ])}
      <p class="foot">${TOUCH ? 'Tap + and &minus; to set quantities.' : 'Use + and &minus; or click a row.'} Food is the one people run out of first; fuel is the one that strands you.</p>
    </div>`);
  root.querySelectorAll('button.q').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.k, d = Number(b.dataset.d), it = ZT.ITEMS[k];
    cart[k] = ZT.clamp(cart[k] + d * it.step, 0, it.cap);
    ZT.Audio.move(); drawShop();
  }));
  const items = [{ label: 'Go' }, { label: 'Advice' }, { label: 'Clear' }];
  bindMenu(root, items, (i) => {
    if (i === 0) {
      for (const k of ZT.ITEM_ORDER) S.inv[k] = cart[k];
      S.inv.cash = Math.round((S.inv.cash - shopTotal()) * 100) / 100;
      S.departed = true;
      ZT.State.log(S, `Left Omaha with ${Math.round(cart.food)} lbs of food and ${cart.fuel} gallons.`, true);
      ZT.Travel.takeLeg(S, 'kearney');
      ZT.Save.save(S);
      goTravel();
    } else if (i === 1) {
      showModal('THE QUARTERMASTER', quartermasterAdvice(), [{ label: 'Back to the counter' }], () => drawShop(), 'market');
    } else { ctxData.cart = { food: 0, fuel: 0, medicine: 0, ammo: 0, parts: 0, tools: 0, goods: 0 }; drawShop(); }
  });
  keyMap['escape'] = () => { ctxData = {}; goTitle(); };
}
function quartermasterAdvice() {
  return `A woman with a clipboard looks at your cart and says what she says to everyone.
<br><br>
"Two pounds of food per person per day. Five people. Do the arithmetic for eighty days and then add some, because you will be slower than you think.
<br><br>
That wagon does eighteen to the gallon if you are gentle with it. Omaha to Boise is thirteen hundred miles at the very best. You cannot carry that much fuel, so you are going to be siphoning, and you will want somewhere to put it.
<br><br>
Medicine you will wish you had bought. Everyone says that. Parts too, and nobody buys the tools, and then they are on the roadside with a tire iron and a prayer.
<br><br>
Trade goods are batteries, coffee, liquor and cigarettes. Money stops working somewhere around the Wyoming line. That does not."`;
}

/* ---------------- travel screen ---------------- */
function goTravel() {
  travelling = null; scav = null;
  if (S.over) return goEnd();
  screen = 'travel'; ctxData.art = 'travel';
  const v = S.vehicle;
  const warnings = [];
  if (v.has && v.broken) warnings.push(`The ${v.broken} is broken. The wagon is not going anywhere until it is fixed.`);
  if (v.has && S.inv.fuel <= 0) warnings.push('The tank is empty.');
  if (S.inv.food <= 0) warnings.push('There is no food left.');
  else if (S.inv.food < ZT.State.aliveCount(S) * ZT.RATIONS[S.rations].lbs * 4) warnings.push('Food is nearly gone.');
  if (!v.has) warnings.push('You are on foot.');
  const infected = S.party.filter((m) => m.alive && (m.inf === 'bitten' || m.inf === 'symptomatic'));
  if (infected.length) warnings.push(`${ZT.list(infected.map((m) => m.name))} ${infected.length === 1 ? 'is' : 'are'} infected.`);

  const atNode = !S.legTo;
  const items = [
    { label: atNode ? 'Choose the road on' : 'Continue on the trail', hint: atNode ? roadsHint() : paceBlurb() },
    { label: 'Check supplies', hint: 'inventory and the wagon' },
    { label: 'Look at the map', hint: 'where you are' },
    { label: 'Change pace', hint: ZT.PACE[S.pace].name },
    { label: 'Change rations', hint: ZT.RATIONS[S.rations].name },
    { label: 'Rest', hint: 'recover; costs days and food' },
    { label: 'Scavenge', hint: 'search this area for supplies' },
    { label: 'Treat someone', hint: `${S.inv.medicine} ${ZT.plural(S.inv.medicine, 'kit')} of medicine`, disabled: false },
    { label: 'Work on the wagon', hint: v.has ? (v.broken ? 'it is broken' : `${ZT.Vehicle.status(S).toLowerCase()}`) : 'no wagon', disabled: !v.has },
    { label: 'Journal', hint: 'what has happened so far' },
    { label: 'Save and quit', hint: '', key: '0' },
  ];
  const root = render(`
    ${statusLine()}
    ${sceneHTML(sceneAlt())}
    <div class="travel">
      <div class="left">
        ${warnings.length ? `<ul class="warnings" role="alert">${warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
        ${menuHTML(items, { compact: true })}
      </div>
      <div class="right">
        ${partyTable()}
        ${suppliesMini()}
      </div>
    </div>`);
  bindMenu(root, items, (i) => {
    if (i === 0) { if (!S.legTo) goFork(); else startTravel(); }
    else if (i === 1) goStatus();
    else if (i === 2) goMap();
    else if (i === 3) goPace();
    else if (i === 4) goRations();
    else if (i === 5) goRest();
    else if (i === 6) goScavengeMenu();
    else if (i === 7) goTreat();
    else if (i === 8) goRepair();
    else if (i === 9) goJournal();
    else if (i === 10) { ZT.Save.save(S); showModal('SAVED', 'The journey is written down. It will be here when you come back.', [{ label: 'Back to the road' }, { label: 'Quit to title' }], (k) => (k === 1 ? goTitle() : goTravel()), 'camp'); }
  });
  ZT.Save.save(S);
}
function sceneAlt() {
  const leg = ZT.currentLeg(S);
  const where = leg ? `${leg.road}, heading for ${ZT.NODES[leg.to].name}` : `stopped at ${ZT.NODES[S.at].name}`;
  return `The wagon on ${where}. Day ${S.day}, mile ${Math.round(S.miles)}, weather ${ZT.WEATHER[S.weather].name.toLowerCase()}.`;
}
function paceBlurb() {
  if (!S.vehicle.has) return 'on foot, about 12 miles a day';
  if (S.vehicle.broken) return 'not until the wagon is fixed';
  if (S.inv.fuel <= 0) return 'no fuel';
  const mpd = Math.round(ZT.PACE[S.pace].mpd * ZT.WEATHER[S.weather].speed * ZT.region(S).road * ZT.Vehicle.speedFactor(S));
  return `~${mpd} mi/day \u00b7 ${Math.round(ZT.Vehicle.range(S))} mi of fuel`;
}
function condClass(c) {
  return { healthy: 'ok', worn: 'ok', weak: 'mid', ill: 'mid', injured: 'mid', exposed: 'mid', infected: 'bad', critical: 'bad', dead: 'dead', missing: 'bad' }[c] || '';
}
function partyTable() {
  const rows = S.party.map((m) => {
    const c = ZT.State.condition(m);
    if (!m.alive) return `<tr class="dead"><th scope="row">${esc(m.name)}</th><td colspan="3">died day ${m.diedDay} &mdash; ${esc(m.cause)}</td></tr>`;
    return `<tr>
      <th scope="row">${esc(m.name)}<span class="role">${esc(m.role)}</span></th>
      <td class="cond ${condClass(c)}">${esc(ZT.cap(c))}</td>
      <td class="meter" aria-label="health ${Math.round(m.health)} of 100"><span style="width:${Math.round(m.health)}%"></span><b>${Math.round(m.health)}</b></td>
      <td class="dim small">${m.fatigue > 65 ? 'exhausted' : m.fatigue > 40 ? 'tired' : 'rested'}${m.morale < 30 ? ', low' : ''}${m.isolated ? ', isolated' : ''}</td>
    </tr>`;
  }).join('');
  return `<table class="party"><caption>The party</caption><tbody>${rows}</tbody></table>`;
}
function suppliesMini() {
  const inv = S.inv;
  const cells = ZT.ITEM_ORDER.map((k) => `<div><b>${ZT.n(inv[k])}</b><span>${esc(ZT.ITEMS[k].unit)} ${esc(ZT.ITEMS[k].name.toLowerCase())}</span></div>`).join('');
  return `<div class="supplies"><h3>Supplies</h3><div class="grid">${cells}
    <div><b>${ZT.money(inv.cash)}</b><span>cash</span></div>
    <div><b>${esc(ZT.Vehicle.status(S))}</b><span>wagon</span></div>
  </div></div>`;
}

/* ---------------- travel action ---------------- */
function startTravel() {
  if (!S.vehicle.has) { /* walking is allowed */ }
  else if (S.vehicle.broken) { showModal('THE WAGON IS BROKEN', ZT.Vehicle.describeBreakdown(S, S.vehicle.broken) + ' Nothing moves until it is dealt with.', [{ label: 'Work on it' }, { label: 'Back' }], (k) => (k === 0 ? goRepair() : goTravel()), 'hood'); return; }
  else if (S.inv.fuel <= 0) { showModal('NO FUEL', 'The tank is dry. You are not driving anywhere on nothing. There may be fuel in this area if somebody goes looking for it.', [{ label: 'Scavenge for fuel' }, { label: 'Back' }], (k) => (k === 0 ? goScavengeMenu() : goTravel()), 'fuel'); return; }
  screen = 'travelling';
  travelling = { t: 0, dur: 0.55, dist: 0, speed: S.vehicle.has ? ZT.PACE[S.pace].mpd * 1.2 : 14 };
  ctxData.art = 'travel';
  const root = render(`${statusLine()}${sceneHTML(sceneAlt())}
    <div class="travelling">
      <p class="ticker" id="ticker">${esc(travelFlavor())}</p>
      ${menuHTML([{ label: 'Stop and make camp', hint: 'end the day here', key: 'Esc' }], { compact: true })}
    </div>`);
  bindMenu(root, [{ label: 'Stop' }], () => { travelling = null; goTravel(); });
  keyMap['escape'] = () => { travelling = null; goTravel(); };
  ZT.Audio.engine();
}
function travelFlavor() {
  const leg = ZT.currentLeg(S);
  const wx = ZT.WEATHER[S.weather].name.toLowerCase();
  const road = leg ? `${leg.road}, through ${ZT.region(S).name}` : ZT.NODES[S.at].name;
  return `${road}. ${ZT.cap(wx)}. ${ZT.PACE[S.pace].name} pace, ${ZT.RATIONS[S.rations].name.toLowerCase()} rations.`;
}
function stepTravel() {
  const before = { day: S.day, miles: S.miles };
  const r = ZT.Travel.step(S);
  const tick = $('ticker');
  if (tick) tick.textContent = travelFlavor() + ` Day ${S.day}, mile ${Math.round(S.miles)}.`;
  if (!r) {
    travelling.t = 0;
    travelling.dur = 0.5;
    // stop travelling on a status change worth surfacing
    const lowFood = S.inv.food <= 0, lowFuel = S.vehicle.has && S.inv.fuel < 2;
    if (lowFood || lowFuel) { travelling = null; goTravel(); }
    return;
  }
  travelling = null;
  if (r.kind === 'death') { goMemorial(r.member, () => goTravel()); return; }
  if (r.kind === 'over') { goEnd(); return; }
  if (r.kind === 'arrive') { goArrive(r.node); return; }
  if (r.kind === 'fork') { goFork(); return; }
  if (r.kind === 'breakdown') {
    ZT.Audio.breakdown();
    showModal('BREAKDOWN', ZT.Vehicle.describeBreakdown(S, r.sub), [{ label: 'See to it' }], () => goRepair(), 'hood');
    return;
  }
  if (r.kind === 'stuck') { goTravel(); return; }
  if (r.kind === 'event') { goEvent(r.event); return; }
  goTravel();
}

/* ---------------- event modal ---------------- */
function goEvent(inst) {
  screen = 'event'; ctxData.art = inst.art || 'road';
  ZT.Audio.warn();
  const items = inst.choices.map((ch) => ({ label: ch.text, hint: ch.hint }));
  const root = render(`
    ${statusLine()}
    ${sceneHTML('Event scene')}
    <div class="event">
      <div class="etext"><p>${esc(inst.text)}</p></div>
      ${menuHTML(items)}
    </div>`);
  bindMenu(root, items, (i) => {
    const out = ZT.Events.resolve(S, inst, inst.choices[i].i);
    showOutcome(inst, out);
  });
}
function showOutcome(inst, out) {
  screen = 'outcome';
  const deltas = out.deltas.filter(Boolean);
  const items = [{ label: out.next ? 'And then' : 'Continue' }];
  const root = render(`
    ${statusLine()}
    ${sceneHTML('Event outcome')}
    <div class="event">
      <div class="etext"><p>${esc(out.text || 'Nothing comes of it.')}</p></div>
      ${deltas.length ? `<ul class="deltas">${deltas.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
      ${menuHTML(items)}
    </div>`);
  bindMenu(root, items, () => {
    if (out.deaths && out.deaths.length) { goMemorial(out.deaths[0], () => (out.next ? goEvent(out.next) : afterEvent())); return; }
    if (out.next) goEvent(out.next); else afterEvent();
  });
  if (out.deaths && out.deaths.length) ZT.Audio.death();
  else if (deltas.some((d) => /BITTEN|DIED|FAILED|MISSING/.test(d))) ZT.Audio.bad();
  else if (deltas.some((d) => d.startsWith('+'))) ZT.Audio.find();
}
function afterEvent() {
  if (S.over) return goEnd();
  if (!ZT.State.aliveCount(S)) { ZT.Travel.endGame(S, 'party'); return goEnd(); }
  ZT.Save.save(S);
  goTravel();
}

/* generic modal with art */
function showModal(title, body, items, onPick, art) {
  screen = 'modal'; ctxData.art = art || 'road';
  const root = render(`
    ${S ? statusLine() : ''}
    ${sceneHTML(title)}
    <div class="event">
      <h2 class="mtitle">${esc(title)}</h2>
      <div class="etext"><p>${body}</p></div>
      ${menuHTML(items)}
    </div>`);
  bindMenu(root, items, (i) => onPick(i));
  keyMap['escape'] = () => onPick(items.length - 1);
}

/* ---------------- arriving somewhere, and choosing a road ---------------- */
const NODE_ART = {
  omaha: 'lm_city', kearney: 'lm_arch', ogallala: 'lm_fork', chimney: 'lm_chimney',
  cheyenne: 'lm_city', casper: 'lm_refinery', rawlins: 'lm_town', divide_n: 'lm_pass',
  divide_s: 'lm_desert', granger: 'lm_town', montpelier: 'lm_lake', ogden: 'lm_city',
  forthall: 'lm_fort', arco: 'lm_lava', twinfalls: 'lm_canyon', mtnhome: 'lm_base', boise: 'safezone',
};
function goArrive(node) {
  const id = S.at;
  screen = 'arrive'; ctxData.art = NODE_ART[id] || 'lm_town';
  ZT.Audio.landmark();
  const evId = ZT.NODE_EVENT[id];
  const items = [
    { label: evId ? 'Look around' : 'Take the road on', hint: '' },
    { label: 'Choose the road on', hint: roadsHint() },
    { label: 'Rest here a day', hint: 'recover' },
    { label: 'Scavenge the area', hint: '' },
    { label: 'Open the map', hint: 'where you are' },
    { label: 'Check supplies', hint: '' },
  ];
  const root = render(`
    ${statusLine()}
    ${sceneHTML(node.name + ', ' + node.sub)}
    <div class="event landmark">
      <h2 class="mtitle">${esc(node.name.toUpperCase())} <span class="sub">${esc(node.sub)}</span></h2>
      <div class="etext"><p>${esc(ZT.NODE_TEXT[id] || '')}</p></div>
      ${menuHTML(items)}
    </div>`);
  bindMenu(root, items, (i) => {
    if (i === 0) { if (evId) goEvent(ZT.Events.begin(S, evId)); else goFork(); }
    else if (i === 1) goFork();
    else if (i === 2) { const r = ZT.Travel.rest(S, 1); ZT.Save.save(S); if (r.interrupt) handleInterrupt(r.interrupt, () => goArrive(node)); else goArrive(node); }
    else if (i === 3) goScavengeMenu(() => goArrive(node));
    else if (i === 4) goMap(() => goArrive(node));
    else goStatus(() => goArrive(node));
  });
  ZT.Save.save(S);
}
function roadsHint() {
  const legs = ZT.Travel.choicesHere(S);
  return legs.length > 1 ? `${legs.length} ways from here` : legs.length ? legs[0].road : '';
}

/* the fork: pick a road out of the node you are standing on */
function goFork() {
  if (S.over) return goEnd();
  const legs = ZT.Travel.choicesHere(S);
  if (!legs.length) { goTravel(); return; }
  if (legs.length === 1) { ZT.Travel.takeLeg(S, legs[0].to); ZT.Save.save(S); goTravel(); return; }
  screen = 'fork'; ctxData.art = 'lm_fork';
  const here = ZT.NODES[S.at];
  const items = legs.map((l) => {
    const to = ZT.NODES[l.to];
    const total = l.miles + ZT.distToEnd(l.to);
    return { label: `${l.road} — ${to.name}`, hint: `${l.miles} mi to ${to.name} \u00b7 ${total} mi to Boise`, l };
  });
  items.push({ label: 'Look at the map first', hint: 'compare the roads', map: true });
  const root = render(`
    ${statusLine()}
    ${sceneHTML('A fork in the road at ' + here.name)}
    <div class="event">
      <h2 class="mtitle">WHICH ROAD</h2>
      <div class="etext"><p>The atlas is open on the hood at ${esc(here.name)}, ${esc(here.sub)}. There is more than one way west from here and they are not the same kind of road.</p></div>
      <table class="kv routes">
        <thead><tr><th scope="col">Road</th><th scope="col">To</th><th scope="col" class="r">Leg</th><th scope="col" class="r">To Boise</th><th scope="col">What it is</th></tr></thead>
        <tbody>${legs.map((l) => {
          const to = ZT.NODES[l.to];
          return `<tr><th scope="row">${esc(l.road)}</th><td>${esc(to.name)}<span class="dim"> ${esc(to.sub)}</span></td>
            <td class="num">${l.miles}</td><td class="num">${l.miles + ZT.distToEnd(l.to)}</td>
            <td class="dim">${esc(ZT.LEG_NOTE[l.from + '>' + l.to] || ZT.REGIONS[l.region].name)}</td></tr>`;
        }).join('')}</tbody>
      </table>
      ${menuHTML(items)}
    </div>`);
  bindMenu(root, items, (i) => {
    if (items[i].map) return goMap(() => goFork());
    ZT.Travel.takeLeg(S, items[i].l.to);
    ZT.Save.save(S);
    goTravel();
  });
}

function handleInterrupt(r, back) {
  if (!r) return back();
  if (r.kind === 'death') return goMemorial(r.member, back);
  if (r.kind === 'over') return goEnd();
  if (r.kind === 'event') return goEvent(r.event);
  back();
}

/* ---------------- memorial ---------------- */
function goMemorial(m, next) {
  screen = 'memorial'; ctxData.art = 'memorial';
  ZT.Audio.death();
  const root = render(`
    ${sceneHTML('A grave marker beside the road')}
    <div class="memorial">
      <p class="mem-here">HERE LIES</p>
      <h1 class="mem-name">${esc(m.name.toUpperCase())}</h1>
      <p class="mem-meta">DAY ${m.diedDay} &mdash; MILE ${m.diedMile}<br>${esc(ZT.cap(m.cause))}</p>
      <label class="mem-label" for="epi">Words for the marker</label>
      <input id="epi" maxlength="46" placeholder="rest easy" aria-describedby="epihelp">
      <p id="epihelp" class="dim small">Left blank, the marker says only the name.</p>
      ${menuHTML([{ label: 'Set the marker and go on' }])}
    </div>`);
  bindMenu(root, [{ label: 'Go on' }], () => {
    const v = ($('epi') || {}).value || '';
    m.epitaph = v.trim().slice(0, 46);
    ZT.State.log(S, `${m.name} buried at mile ${m.diedMile}.${m.epitaph ? ' "' + m.epitaph + '"' : ''}`, true);
    ZT.Save.addMemorial({ name: m.name, day: m.diedDay, mile: m.diedMile, cause: m.cause, epitaph: m.epitaph });
    ZT.Save.save(S);
    if (!ZT.State.aliveCount(S)) { ZT.Travel.endGame(S, 'party'); return goEnd(); }
    // more deaths queued?
    const more = ZT.Travel.checkDeaths(S);
    if (more) return goMemorial(more.member, next);
    next();
  });
}

/* ---------------- sub-screens ---------------- */
function goStatus(back) {
  screen = 'status'; ctxData.art = 'travel';
  const v = S.vehicle;
  const subs = ZT.Vehicle.SUBS.map((k) => `<tr><th scope="row">${ZT.cap(k)}</th><td>${ZT.cap(ZT.Vehicle.subStatus(v[k]))}</td><td class="meter"><span style="width:${Math.round(v[k])}%"></span><b>${Math.round(v[k])}</b></td></tr>`).join('');
  const root = render(`
    ${statusLine()}
    <div class="doc">
      <h1>SUPPLIES AND CONDITION</h1>
      <div class="cols">
        <section>
          <h2>In the wagon</h2>
          <table class="kv">
            ${ZT.ITEM_ORDER.map((k) => `<tr><th scope="row">${esc(ZT.ITEMS[k].name)}</th><td class="num">${ZT.n(S.inv[k])}</td><td class="dim">${esc(ZT.ITEMS[k].unit)}</td></tr>`).join('')}
            <tr><th scope="row">Cash</th><td class="num">${ZT.money(S.inv.cash)}</td><td></td></tr>
            <tr><th scope="row">Load</th><td class="num">${Math.round(ZT.State.weight(S))}</td><td class="dim">lbs</td></tr>
          </table>
          <p class="dim">At ${ZT.RATIONS[S.rations].name.toLowerCase()} rations the party eats ${ZT.n(ZT.State.aliveCount(S) * ZT.RATIONS[S.rations].lbs)} lbs a day: about ${Math.floor(S.inv.food / Math.max(0.1, ZT.State.aliveCount(S) * ZT.RATIONS[S.rations].lbs))} days of food.</p>
          ${v.has ? `<p class="dim">The wagon does about ${ZT.n(ZT.Vehicle.mpg(S))} miles to the gallon at this load and pace: about ${Math.round(ZT.Vehicle.range(S))} miles of fuel.</p>` : '<p class="dim">You are travelling on foot and carrying everything.</p>'}
        </section>
        <section>
          <h2>${v.has ? 'The ' + esc(v.name) : 'No vehicle'}</h2>
          ${v.has ? `<p><b>${esc(ZT.Vehicle.status(S))}</b>${v.broken ? ` &mdash; the ${esc(v.broken)} has failed` : ''}</p><table class="kv">${subs}</table>` : '<p class="dim">Whatever you are carrying is what you have.</p>'}
          <h2>Pressure</h2>
          <table class="kv">
            <tr><th scope="row">Noise</th><td class="meter"><span style="width:${Math.round(S.zombie.noise)}%"></span><b>${Math.round(S.zombie.noise)}</b></td></tr>
            <tr><th scope="row">Horde</th><td class="meter"><span style="width:${Math.round(S.zombie.horde)}%"></span><b>${Math.round(S.zombie.horde)}</b></td></tr>
            <tr><th scope="row">The road</th><td>${ZT.Travel.threatWord(S)}</td></tr>
          </table>
        </section>
        <section class="wide">
          <h2>The party</h2>
          <table class="kv party-full">
            <thead><tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Condition</th><th scope="col">Health</th><th scope="col">Fatigue</th><th scope="col">Morale</th><th scope="col">Notes</th></tr></thead>
            <tbody>
            ${S.party.map((m) => m.alive ? `<tr>
              <th scope="row">${esc(m.name)}</th><td>${esc(ZT.cap(m.role))}</td>
              <td class="cond ${condClass(ZT.State.condition(m))}">${esc(ZT.cap(ZT.State.condition(m)))}</td>
              <td class="num">${Math.round(m.health)}</td><td class="num">${Math.round(m.fatigue)}</td><td class="num">${Math.round(m.morale)}</td>
              <td class="dim small">${esc(memberNotes(m))}</td>
            </tr>` : `<tr class="dead"><th scope="row">${esc(m.name)}</th><td colspan="6">Died day ${m.diedDay}, mile ${m.diedMile} &mdash; ${esc(m.cause)}${m.epitaph ? ` &mdash; &ldquo;${esc(m.epitaph)}&rdquo;` : ''}</td></tr>`).join('')}
            </tbody>
          </table>
        </section>
      </div>
      ${menuHTML([{ label: 'Back to the road', key: 'Esc' }])}
    </div>`);
  bindMenu(root, [{ label: 'Back' }], () => (back ? back() : goTravel()));
  keyMap['escape'] = () => (back ? back() : goTravel());
}
function memberNotes(m) {
  const n = ZT.Party.needs(m);
  const parts = [];
  if (m.inf === 'bitten') parts.push('bitten' + (m.infStable ? ', stabilised' : '') + ' — ' + ZT.Party.woundHint(S, m).toLowerCase().replace(/\.$/, ''));
  else if (m.inf === 'symptomatic') parts.push('feverish' + (m.infStable ? ', stabilised' : ''));
  else if (m.inf === 'exposed') parts.push('scratched');
  if (m.injury > 0) parts.push('injured');
  if (m.illness > 0) parts.push('ill');
  if (m.isolated) parts.push('riding apart');
  return parts.length ? parts.join('; ') : '—';
}

function goMap(back) {
  screen = 'map'; ctxData.art = 'map';
  ctxData.mapBack = back || (() => goTravel());
  ctxData.sel = ctxData.sel && ZT.NODES[ctxData.sel] ? ctxData.sel : S.at;
  drawMapScreen();
}
function mapNodeOrder() {
  return Object.keys(ZT.NODES).sort((a, b) => ZT.NODES[b].lon - ZT.NODES[a].lon);
}
function drawMapScreen() {
  const ids = mapNodeOrder();
  const sel = ctxData.sel;
  const n = ZT.NODES[sel];
  const pos = ZT.position(S);
  const leg = ZT.currentLeg(S);
  const here = leg
    ? `On ${leg.road}, ${Math.round(S.legMiles)} of ${leg.miles} miles from ${ZT.NODES[S.at].name} to ${ZT.NODES[leg.to].name}, heading ${ZT.heading(S)}.`
    : `Stopped at ${ZT.NODES[S.at].name}, ${ZT.NODES[S.at].sub}.`;
  const dist = distanceFromYou(sel);
  const items = [
    { label: 'Next place', key: '1', hint: 'select →' },
    { label: 'Previous place', key: '2', hint: '← select' },
    { label: 'Back to the road', key: 'Esc' },
  ];
  const root = render(`
    ${statusLine()}
    ${sceneHTML('Map of the route from Omaha to Boise, showing your position')}
    <div class="mapwrap">
      <div class="mapinfo">
        <h2>${esc(n.name)} <span class="sub">${esc(n.sub)}</span></h2>
        <table class="kv small-table">
          <tr><th scope="row">Position</th><td>${fmtLat(pos.lat)}, ${fmtLon(pos.lon)}</td></tr>
          <tr><th scope="row">You are</th><td>${esc(here)}</td></tr>
          <tr><th scope="row">${esc(n.name)}</th><td>${esc(dist)}</td></tr>
          <tr><th scope="row">Boise</th><td>${Math.round(ZT.milesToEnd(S))} miles by the shortest road</td></tr>
        </table>
        <p class="dim small">${esc(ZT.NODE_TEXT[sel] ? firstSentence(ZT.NODE_TEXT[sel]) : '')}</p>
        ${menuHTML(items, { compact: true })}
        <p class="foot">${TOUCH ? 'Tap a place in the list' : 'Click a place in the list, or use 1 and 2'}. Solid lines are roads you have driven, dotted lines are roads ahead.</p>
      </div>
      <div class="maplist">
        <h3>Places on the route</h3>
        <ul class="places">
          ${ids.map((id) => {
            const p2 = ZT.NODES[id];
            const seen = S.seen && S.seen[id];
            const isYou = id === S.at;
            return `<li><button class="place${id === sel ? ' on' : ''}" data-id="${id}" aria-pressed="${id === sel}">
              <span class="pmark">${isYou ? '\u25b2' : seen ? '\u25a0' : '\u25a1'}</span>
              <span class="pname">${esc(p2.name)}</span>
              <span class="pdist">${esc(shortDist(id))}</span>
            </button></li>`;
          }).join('')}
        </ul>
      </div>
    </div>`);
  root.querySelectorAll('button.place').forEach((b) => b.addEventListener('click', () => {
    ctxData.sel = b.dataset.id; ZT.Audio.move(); drawMapScreen();
  }));
  bindMenu(root, items, (i) => {
    if (i === 2) return ctxData.mapBack();
    const cur = ids.indexOf(ctxData.sel);
    ctxData.sel = ids[(cur + (i === 0 ? 1 : -1) + ids.length) % ids.length];
    drawMapScreen();
  });
  keyMap['escape'] = () => ctxData.mapBack();
  keyMap['arrowright'] = () => { const cur = ids.indexOf(ctxData.sel); ctxData.sel = ids[(cur + 1) % ids.length]; ZT.Audio.move(); drawMapScreen(); };
  keyMap['arrowleft'] = () => { const cur = ids.indexOf(ctxData.sel); ctxData.sel = ids[(cur - 1 + ids.length) % ids.length]; ZT.Audio.move(); drawMapScreen(); };
}
function firstSentence(str) { const m = str.match(/^[^.]+\.\s*[^.]+\./); return m ? m[0] : str.slice(0, 160); }
function fmtLat(v) { return Math.abs(v).toFixed(2) + '\u00b0 N'; }
function fmtLon(v) { return Math.abs(v).toFixed(2) + '\u00b0 W'; }
function aheadMiles(id) {
  const from = S.legTo || S.at;
  if (!ZT.reachable(from, id)) return null;
  const d = ZT.distToEnd(from) - ZT.distToEnd(id) + (S.legTo ? ZT.currentLeg(S).miles - S.legMiles : 0);
  return d > 0 ? Math.round(d) : 0;
}
function distanceFromYou(id) {
  if (id === S.at && !S.legTo) return 'you are here';
  if (S.seen && S.seen[id]) return 'behind you';
  const d = aheadMiles(id);
  if (d === null) return 'no longer on any road from here';
  return `about ${d} miles ahead by the shortest road`;
}
function shortDist(id) {
  if (id === S.at && !S.legTo) return 'here';
  if (S.seen && S.seen[id]) return 'passed';
  const d = aheadMiles(id);
  return d === null ? 'off route' : d + ' mi';
}

function goPace() {
  screen = 'pace'; ctxData.art = 'road';
  const items = Object.entries(ZT.PACE).map(([k, p]) => ({
    label: p.name + (S.pace === k ? '  (current)' : ''),
    hint: k === 'cautious' ? 'about 22 miles a day; quieter, safer, slower' : k === 'steady' ? 'about 32 miles a day; the baseline' : 'about 45 miles a day; fuel, fatigue, breakdowns, injuries',
    k,
  }));
  items.push({ label: 'Back', key: 'Esc' });
  const root = render(`${statusLine()}${sceneHTML('The road ahead')}
    <div class="event"><h2 class="mtitle">PACE</h2>
    <div class="etext"><p>How hard are you driving? The road does not care, but the wagon and the people in it do.</p></div>
    ${menuHTML(items)}</div>`);
  bindMenu(root, items, (i) => { if (items[i].k) { S.pace = items[i].k; ZT.Save.save(S); } goTravel(); });
  keyMap['escape'] = () => goTravel();
}
function goRations() {
  screen = 'rations'; ctxData.art = 'camp';
  const n = ZT.State.aliveCount(S);
  const items = Object.entries(ZT.RATIONS).map(([k, r]) => ({
    label: r.name + (S.rations === k ? '  (current)' : ''),
    hint: `${ZT.n(r.lbs * n)} lbs a day for ${n} ${ZT.plural(n, 'person', 'people')} — ${k === 'full' ? 'best healing and morale' : k === 'normal' ? 'holds steady' : 'saves food, costs health'}`,
    k,
  }));
  items.push({ label: 'Back', key: 'Esc' });
  const root = render(`${statusLine()}${sceneHTML('A camp stove')}
    <div class="event"><h2 class="mtitle">RATIONS</h2>
    <div class="etext"><p>There are ${ZT.n(S.inv.food)} pounds of food in the wagon.</p></div>
    ${menuHTML(items)}</div>`);
  bindMenu(root, items, (i) => { if (items[i].k) { S.rations = items[i].k; ZT.Save.save(S); } goTravel(); });
  keyMap['escape'] = () => goTravel();
}
function goRest() {
  screen = 'rest'; ctxData.art = 'camp';
  const items = [1, 2, 3, 5].map((d) => ({ label: `Rest ${d} ${ZT.plural(d, 'day')}`, hint: `${ZT.n(d * ZT.State.aliveCount(S) * ZT.RATIONS[S.rations].lbs)} lbs of food`, d }));
  items.push({ label: 'Back', key: 'Esc' });
  const root = render(`${statusLine()}${sceneHTML('A camp')}
    <div class="event"><h2 class="mtitle">REST</h2>
    <div class="etext"><p>Resting mends injuries, clears fatigue and lifts morale, and it eats food and days and lets whatever is behind you catch up.</p></div>
    ${menuHTML(items)}</div>`);
  bindMenu(root, items, (i) => {
    if (!items[i].d) return goTravel();
    const r = ZT.Travel.rest(S, items[i].d);
    ZT.Save.save(S);
    showModal('CAMP', `${r.days} ${ZT.plural(r.days, 'day')} in camp.` + (r.days < items[i].d ? ' Something interrupted the rest.' : ' Everyone is a little better than they were.'), [{ label: 'Continue' }], () => handleInterrupt(r.interrupt, () => goTravel()), 'camp');
  });
  keyMap['escape'] = () => goTravel();
}
function goTreat() {
  screen = 'treat'; ctxData.art = 'sick';
  const sick = S.party.filter((m) => m.alive);
  const items = sick.map((m) => {
    const needs = ZT.Party.needs(m);
    return { label: m.name, hint: needs.length ? needs.join(', ') + (m.inf === 'bitten' ? ' — ' + ZT.Party.woundHint(S, m) : '') : 'nothing obviously wrong', m, disabled: S.inv.medicine <= 0 };
  });
  items.push({ label: 'Back', key: 'Esc' });
  const root = render(`${statusLine()}${sceneHTML('The medical box')}
    <div class="event"><h2 class="mtitle">TREAT</h2>
    <div class="etext"><p>${S.inv.medicine > 0 ? `There ${S.inv.medicine === 1 ? 'is one kit' : 'are ' + S.inv.medicine + ' kits'} of medicine. Each treatment uses one.` : 'The medical box is empty.'}</p></div>
    ${menuHTML(items)}</div>`);
  bindMenu(root, items, (i) => {
    if (!items[i].m) return goTravel();
    const c = { d: [] };
    const text = ZT.Party.treat(S, items[i].m);
    ZT.Save.save(S);
    showModal('TREATMENT', esc(text), [{ label: 'Continue' }], () => goTravel(), 'sick');
  });
  keyMap['escape'] = () => goTravel();
}
function goRepair() {
  screen = 'repair'; ctxData.art = 'hood';
  const v = S.vehicle;
  if (!v.has) { showModal('NO WAGON', 'There is nothing to work on.', [{ label: 'Back' }], () => goTravel(), 'walking'); return; }
  const items = [];
  if (v.broken) {
    items.push({ label: `Fit a spare part to the ${v.broken}`, hint: `${S.inv.parts} ${ZT.plural(S.inv.parts, 'set')} left`, disabled: S.inv.parts <= 0, act: 'part' });
    items.push({ label: 'Try to jury-rig it', hint: 'a day, and it might not work', act: 'rig' });
    items.push({ label: 'Abandon the wagon', hint: 'go on foot; leave most of the load', act: 'abandon' });
  } else {
    items.push({ label: 'Service the worst of it', hint: `uses one part (${S.inv.parts} left)`, disabled: S.inv.parts <= 0, act: 'service' });
    items.push({ label: 'Tighten and patch what you can', hint: 'half a day, small gains', act: 'tinker' });
  }
  items.push({ label: 'Back', key: 'Esc' });
  const subs = ZT.Vehicle.SUBS.map((k) => `<tr><th scope="row">${ZT.cap(k)}</th><td>${ZT.cap(ZT.Vehicle.subStatus(v[k]))}</td><td class="meter"><span style="width:${Math.round(v[k])}%"></span><b>${Math.round(v[k])}</b></td></tr>`).join('');
  const root = render(`${statusLine()}${sceneHTML('The hood up')}
    <div class="event"><h2 class="mtitle">THE WAGON &mdash; ${esc(ZT.Vehicle.status(S).toUpperCase())}</h2>
    <table class="kv small-table">${subs}</table>
    ${menuHTML(items)}</div>`);
  bindMenu(root, items, (i) => {
    const c = { d: [] };
    let text = '';
    const act = items[i].act;
    if (!act) return goTravel();
    if (act === 'part') text = ZT.Vehicle.repairWithParts(S, c, v.broken);
    else if (act === 'rig') text = ZT.Vehicle.juryRig(S, c, v.broken);
    else if (act === 'service') text = ZT.Vehicle.service(S, c);
    else if (act === 'tinker') {
      ZT.X.delay(S, c, 0.5); ZT.X.fatigueAll(S, c, 8);
      let worst = 'engine'; for (const k of ZT.Vehicle.SUBS) if (v[k] < v[worst]) worst = k;
      const g = (ZT.State.hasRole(S, 'mechanic') ? 10 : 6) + (S.inv.tools > 0 ? 4 : 0);
      ZT.X.repair(S, c, worst, g);
      text = `Half a day of tightening, taping and topping up. The ${worst} is a little better than it was.`;
    } else if (act === 'abandon') {
      ZT.X.loseVehicle(S, c, 'abandoned at the roadside');
      text = 'Everything that can be carried comes out of the wagon and the rest stays in it. The doors are left open, which somebody says is stupid, and nobody argues.';
    }
    ZT.Save.save(S);
    const deaths = []; while (S.pendingDeaths.length) deaths.push(S.party[S.pendingDeaths.shift()]);
    showOutcome({ art: 'hood', text: '', choices: [] }, { text, deltas: c.d, next: null, deaths });
  });
  keyMap['escape'] = () => goTravel();
}
function goJournal() {
  screen = 'journal'; ctxData.art = 'map';
  const notable = S.log.slice().reverse();
  const st = S.stats;
  const root = render(`
    ${statusLine()}
    <div class="doc">
      <h1>JOURNAL</h1>
      <p class="dim">Day ${S.day}, mile ${Math.round(S.miles)}. ${st.travelDays} days driving, ${st.restDays} days in camp, ${st.events} incidents, ${st.scavenges} scavenging runs, ${st.shots} rounds fired, ${st.breakdowns} breakdowns, ${st.deaths} dead.</p>
      <ul class="log">${notable.slice(0, 120).map((l) => `<li${l.n ? ' class="notable"' : ''}><span class="when">Day ${l.day} &middot; mi ${l.mile}</span> ${esc(l.text)}</li>`).join('')}</ul>
      ${menuHTML([{ label: 'Back to the road', key: 'Esc' }])}
    </div>`);
  bindMenu(root, [{ label: 'Back' }], () => goTravel());
  keyMap['escape'] = () => goTravel();
}

/* ---------------- scavenging ---------------- */
function goScavengeMenu(back) {
  screen = 'scav-menu'; ctxData.art = 'zsupply';
  ctxData.scavBack = back || (() => goTravel());
  const opts = ZT.Scavenge.menuOptions(S);
  const items = opts.map((o) => ({ label: o.label, hint: o.hint, o }));
  if (settings.arcade) items.push({ label: 'Go in yourself', hint: 'SCAVENGE THE BLOCK — a timed run on foot', arcade: true });
  items.push({ label: 'Back', key: 'Esc' });
  const root = render(`${statusLine()}${sceneHTML('Buildings worth searching')}
    <div class="event"><h2 class="mtitle">SCAVENGE</h2>
    <div class="etext"><p>There are buildings here worth going through. Searching takes time and makes noise, and the road is currently <b>${ZT.Travel.threatWord(S).toLowerCase()}</b>.</p></div>
    ${menuHTML(items)}</div>`);
  bindMenu(root, items, (i) => {
    if (items[i].arcade) return startScavengeArcade();
    if (!items[i].o) return ctxData.scavBack();
    const out = ZT.Scavenge.menuRun(S, items[i].o.id);
    ZT.Save.save(S);
    showOutcome({ art: 'zsupply' }, { text: out.text, deltas: out.deltas, next: null, deaths: out.deaths });
  });
  keyMap['escape'] = () => ctxData.scavBack();
}
function startScavengeArcade() {
  screen = 'scavenge';
  scav = ZT.Scavenge.init(S);
  input.up = input.down = input.left = input.right = input.action = false;
  input.vx = input.vy = 0;
  const root = render(`
    <div class="scav">
      <div class="scav-hud" id="scavhud" role="status" aria-live="polite">
        <span><b>NOISE</b><i class="gauge"><s id="hnoise"></s></i><em id="hnoisen">0</em></span>
        <span><b>CARRY</b><em id="hcarry">0/5</em></span>
        <span><b>TIME</b><em id="htime">75</em></span>
        <span><b>FOUND</b><em id="hfound">0/9</em></span>
      </div>
      ${sceneHTML('Top-down scavenging run')}
      <p class="scav-msg" id="scavmsg" role="status" aria-live="assertive">&nbsp;</p>
      <div class="scav-ui">
        <p class="dim">${TOUCH
          ? 'Put a thumb anywhere on the picture and drag: that is your stick, and how far you push it is how fast you move. Creeping is quiet; running is not. Hold <b>SEARCH</b> beside a container to go through it, and at the car to load up and leave.'
          : 'Move with the arrow keys or WASD. Hold <b>Space</b> beside a container to search it. Get back to the car and hold <b>Space</b> to leave. Running and breaking locks makes noise, and they come to noise.'}</p>
        <div class="pad" aria-hidden="false">
          <button class="p" data-k="up" aria-label="Move up">&#9650;</button>
          <div><button class="p" data-k="left" aria-label="Move left">&#9664;</button><button class="p" data-k="action" aria-label="Search or leave">SEARCH</button><button class="p" data-k="right" aria-label="Move right">&#9654;</button></div>
          <button class="p" data-k="down" aria-label="Move down">&#9660;</button>
          <button class="p wide" data-k="quit" aria-label="Leave now">LEAVE NOW</button>
        </div>
        <div class="touchpad">
          <div class="stickzone" id="stickzone">DRAG ON THE PICTURE TO MOVE</div>
          <div class="touchbtns">
            <button class="big" data-k="action" aria-label="Search, or load up and leave">SEARCH</button>
            <button class="big ghost" data-k="quit" aria-label="Leave now">LEAVE NOW</button>
          </div>
        </div>
      </div>
    </div>`);
  const press = (k, v) => { if (k === 'quit') { if (v && scav) ZT.Scavenge.finish(scav, 'left'); } else input[k] = v; };
  root.querySelectorAll('button.p, button.big').forEach((b) => {
    const k = b.dataset.k;
    const on = (e) => { e.preventDefault(); press(k, true); };
    const off = (e) => { e.preventDefault(); press(k, false); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
    b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  });

  /* the canvas is the stick: touch down anywhere, drag to steer */
  const cv = $('scene'), zone = $('stickzone');
  if (cv) {
    let id = null;
    const toBuf = (e) => {
      const r = cv.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * ZT.R.W, y: ((e.clientY - r.top) / r.height) * ZT.R.H - 11 };
    };
    const down = (e) => {
      if (id !== null || !scav) return;
      id = e.pointerId; cv.setPointerCapture(id);
      const p2 = toBuf(e);
      scav.stick = { ox: p2.x, oy: p2.y, dx: 0, dy: 0 };
      input.vx = input.vy = 0;
      if (zone) zone.classList.add('live');
      e.preventDefault();
    };
    const move = (e) => {
      if (e.pointerId !== id || !scav || !scav.stick) return;
      const p2 = toBuf(e);
      let dx = p2.x - scav.stick.ox, dy = p2.y - scav.stick.oy;
      const len = Math.hypot(dx, dy);
      const R = 16;                                  // full deflection at 16 buffer px
      const m = Math.min(1, len / R);
      if (len > 0.001) { dx /= len; dy /= len; } else { dx = dy = 0; }
      scav.stick.dx = dx * m; scav.stick.dy = dy * m;
      input.vx = dx * m; input.vy = dy * m;
      e.preventDefault();
    };
    const up = (e) => {
      if (e.pointerId !== id) return;
      id = null; input.vx = input.vy = 0;
      if (scav) scav.stick = null;
      if (zone) zone.classList.remove('live');
    };
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
  }
  keyMap = {};
}
function updateScavHud(g) {
  const n = $('hnoise'); if (!n) return;
  n.style.width = Math.round(g.noise) + '%';
  n.className = g.noise > 60 ? 'hot' : '';
  $('hnoisen').textContent = Math.round(g.noise);
  $('hcarry').textContent = g.carry.length + '/' + g.capacity;
  $('htime').textContent = Math.max(0, Math.ceil(g.limit - g.time));
  $('hfound').textContent = g.containers.filter((k) => k.open).length + '/' + g.containers.length;
  const m = $('scavmsg');
  if (m) { const want = g.msgT > 0 ? g.msg : '\u00a0'; if (m.textContent !== want) m.textContent = want; }
}
function finishScavenge(o) {
  ZT.Save.save(S);
  screen = 'outcome';
  showOutcome({ art: 'zsupply' }, { text: o.text, deltas: o.deltas, next: null, deaths: o.deaths });
}

/* ---------------- end ---------------- */
function goEnd() {
  screen = 'end';
  const won = S.over && S.over.why === 'win';
  ctxData.art = won ? 'safezone' : 'memorial';
  const sc = S.over.score || ZT.Score.compute(S);
  const rank = ZT.Score.rank(sc.total);
  if (!ctxData.scored) {
    ctxData.scored = true;
    ZT.Save.addScore({ score: sc.total, rank, difficulty: sc.difficulty, won, day: S.day, miles: Math.round(S.miles), names: ZT.State.alive(S).map((m) => m.name) });
    ZT.Save.save(S);
  }
  if (won) ZT.Audio.win(); else ZT.Audio.death();
  const survivors = ZT.State.alive(S);
  const dead = S.party.filter((m) => !m.alive);
  const notable = S.log.filter((l) => l.n).slice(-14);
  const root = render(`
    ${sceneHTML(won ? 'The Boise valley gate' : 'A grave marker')}
    <div class="doc end">
      <h1>${won ? 'YOU REACHED BOISE' : 'THE ROAD ENDS HERE'}</h1>
      <p class="lede">${esc(endBlurb(won, survivors))}</p>
      <div class="cols">
        <section>
          <h2>Who arrived</h2>
          ${survivors.length ? `<ul class="plain">${survivors.map((m) => `<li>${esc(m.name)}, ${esc(m.role)} &mdash; ${esc(ZT.State.condition(m))}</li>`).join('')}</ul>` : '<p class="dim">Nobody.</p>'}
          ${dead.length ? `<h2>Who did not</h2><ul class="plain">${dead.map((m) => `<li>${esc(m.name)} &mdash; day ${m.diedDay}, mile ${m.diedMile}, ${esc(m.cause)}${m.epitaph ? `. &ldquo;${esc(m.epitaph)}&rdquo;` : ''}</li>`).join('')}</ul>` : ''}
        </section>
        <section>
          <h2>Score</h2>
          <table class="kv score">
            ${sc.rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th><td class="num">${r.pts}</td></tr>`).join('')}
            <tr class="tot"><th scope="row">Subtotal</th><td class="num">${sc.subtotal}</td></tr>
            <tr class="tot"><th scope="row">${esc(sc.difficulty)} multiplier</th><td class="num">&times;${sc.mult}</td></tr>
            <tr class="grand"><th scope="row">Final</th><td class="num">${sc.total}</td></tr>
          </table>
          <p class="rank">${esc(rank)}</p>
        </section>
        <section class="wide">
          <h2>What happened</h2>
          <ul class="log">${notable.map((l) => `<li class="notable"><span class="when">Day ${l.day} &middot; mi ${l.mile}</span> ${esc(l.text)}</li>`).join('')}</ul>
        </section>
      </div>
      ${menuHTML([{ label: 'Go again' }, { label: 'Read the whole journal' }, { label: 'Title screen' }])}
    </div>`);
  bindMenu(root, [{ label: 'Again' }, { label: 'Journal' }, { label: 'Title' }], (i) => {
    if (i === 0) { ZT.Save.clear(1); ctxData = {}; goSetup(); }
    else if (i === 1) { goJournalEnd(); }
    else { ZT.Save.clear(1); ctxData = {}; goTitle(); }
  });
}
function goJournalEnd() {
  screen = 'journal-end'; ctxData.art = 'map';
  const notable = S.log.slice().reverse();
  const root = render(`<div class="doc"><h1>THE WHOLE JOURNAL</h1>
    <ul class="log">${notable.map((l) => `<li${l.n ? ' class="notable"' : ''}><span class="when">Day ${l.day} &middot; mi ${l.mile}</span> ${esc(l.text)}</li>`).join('')}</ul>
    ${menuHTML([{ label: 'Back', key: 'Esc' }])}</div>`);
  bindMenu(root, [{ label: 'Back' }], () => { ctxData.scored = true; goEnd(); });
  keyMap['escape'] = () => { ctxData.scored = true; goEnd(); };
}
function endBlurb(won, survivors) {
  if (won) {
    if (survivors.length === 5) return 'Five people left Omaha and five people walked into the Boise valley. That does not happen often.';
    if (survivors.length === 1) return `${survivors[0].name} came the last of it alone, and the gate opened anyway.`;
    return `${ZT.list(survivors.map((m) => m.name))} reached Boise. The rest are somewhere between here and the Missouri River, marked.`;
  }
  return `The wagon got as far as ${esc(ZT.NODES[S.at].name)} — mile ${Math.round(S.miles)} — on day ${S.day}, with ${Math.round(ZT.milesToEnd(S))} miles of Idaho still to go. Somebody will find the atlas eventually and read the notes in the margins.`;
}

/* ---------------- boot ---------------- */
function start() {
  applyScale();
  applyFlash();
  ZT.Audio.setOn(settings.sound);
  ZT.R.setScanlines(settings.flash);
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', onKey);
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  if (STANDALONE) document.documentElement.classList.add('installed');
  const refit = () => { const cv = $('scene'); if (cv) fitCanvas(cv); };
  window.addEventListener('resize', refit);
  window.addEventListener('orientationchange', () => setTimeout(refit, 120));
  window.addEventListener('beforeunload', () => { if (S && !S.over) ZT.Save.save(S); });
  goTitle();
  raf = requestAnimationFrame(loop);
}

return { start, get state() { return S; }, goTitle };
})();
