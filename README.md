# Zombie Trails

A 1980s-style trail-survival game. Omaha, Nebraska to Boise, Idaho — about 1,320
miles of real road, up the Platte, over the Continental Divide, and down the Snake.
Five survivors, one station wagon, and three real forks in the road.

**Play:** https://lancepounds.github.io/zombie-trails/

Monochrome, menu-driven, keyboard and touch. No frameworks, no dependencies.

---

## How this repo works

`index.html` is the whole playable game — the file GitHub Pages serves. It is
**generated**, not edited. The readable source is in `src/`, and `build.js`
concatenates it.

```
src/00_core.js … src/90_ui.js   the 17 modules, in load order
src/style.css                   all styling
build.js                        concatenates src/ into index.html
test/sim.js                     the balance simulator
index.html                      BUILT — do not edit by hand
```

To rebuild after changing anything in `src/`:

```bash
node build.js
```

That rewrites `index.html`. Commit both the source change and the rebuilt file.

---

## What lives where

| File | Responsibility |
|---|---|
| `00_core.js` | Constants: regions, items, pace, rations, weather, difficulty, seeded RNG |
| `05_route.js` | The route graph, real geography, map projection |
| `10_state.js` | Game state, save/load, save migration |
| `20_party.js` | Daily tick, health, fatigue, morale, infection, death |
| `25_effects.js` | `ZT.X.*` — the verbs event content calls |
| `30_vehicle.js` | Wear, breakdowns, fuel, repairs |
| `40_travel.js` | Graph traversal, seasonal weather, horde pressure, scoring |
| `50_events.js` | The event engine: filter, weight, pick, resolve |
| `60_ev_road.js` | Road and weather events |
| `61_ev_zombie.js` | The dead |
| `62_ev_vehicle_health.js` | The wagon, and the bodies in it |
| `63_ev_people_camp.js` | Other people, camp nights, rare events |
| `64_landmarks.js` | Arrivals at each real place |
| `70_scavenge.js` | Scavenging, menu and minigame |
| `80_render.js` | The monochrome renderer, bitmap font, the map, ~80 scenes |
| `85_save_audio.js` | Save slots, memorials, high scores, square-wave audio |
| `90_ui.js` | Screens, input, modals |

---

## Adding an event

This is the main way to grow the game, and it needs no engine changes. Add an
object to any `src/6x_*.js` file and rebuild.

```js
{
  id: 'road_thing_01',              // must be unique
  cat: 'road',                      // road|zombie|vehicle|health|weather|people|camp|rare
  regions: ['platte', 'sandhills'], // or '*' for anywhere
  when: 'travel',                   // travel | camp | any
  weight: 6,                        // higher = more often
  cool: 20,                         // days before it can repeat
  cond: (s) => s.miles > 100,       // optional gate
  art: 'lm_town',                   // any key in ZT.R.scenes
  text: 'A thing is in the road.',
  choices: [
    { text: 'Deal with it', hint: 'costs a day',
      show: (s) => s.inv.parts > 0,             // optional: hide unless true
      do(s, c) {
        ZT.X.take(s, c, 'parts', 1);
        ZT.X.delay(s, c, 1);
        return 'What happened, in a sentence or two.';
      } },
    { text: 'Drive past', do() { return 'You drive past.'; } },
  ],
}
```

Return `{ text, then: 'other_event_id' }` from a `do` to chain a second beat —
that is how the landmark set pieces work.

**Region ids:** `missouri, platte, sandhills, panhandle, laramie, powder, divide,
bear, wasatch, lava, snake, owyhee`

**Common verbs** (all in `25_effects.js`): `take` `give` `hurt` `heal` `injure`
`sicken` `bite` `expose` `fatigueAll` `morale` `noise` `horde` `wear` `repair`
`breakdown` `delay` `loot` `shots` `someone`

**Tone:** concise, dry, occasionally darkly funny. A dropped tire iron can be as
memorable as a horde. Humour works best delivered flat.

---

## Checking the balance

```bash
node test/sim.js 40
```

Plays full campaigns headlessly across four difficulties, three choice policies,
three route policies and four opening loadouts — then reports win rate, median day
and mileage, deaths by cause, which supply ran out, which roads got taken, and any
event or choice never exercised. Run it after content changes; it catches crashes
and balance drift that playing never will.

Current targets: Story ~100%, Normal ~59%, Hard ~36%, Nightmare ~6%.

Two findings worth not re-learning the hard way:

- **A scavenge day must net more food than the party eats that day**, or the verb
  is net-negative and every run starves.
- **Only infection had a large per-day health drain**, so it once caused 97% of
  deaths. Weather, fatigue, illness and injury all need to bite for the causes to
  spread out.

---

## Publishing a change

1. Edit something in `src/`
2. `node build.js`
3. Commit `src/` **and** the rebuilt `index.html`
4. GitHub Pages redeploys within a minute

## Installing on an iPad

Open the Pages URL in Safari → Share → **Add to Home Screen**. Worth doing beyond
the icon: Safari clears a site's saved data after seven days without a visit, which
would erase a journey in progress. Home-screen apps are largely exempt.
