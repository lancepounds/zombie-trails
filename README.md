# Zombie Trails

A 1980s-style trail-survival game. Omaha, Nebraska to Boise, Idaho — about 1,320
miles of real road, up the Platte, over the Continental Divide, and down the Snake.
Five survivors, one station wagon, and three real forks in the road.

**[Play Zombie Trails](https://lancepounds.github.io/zombie-trails/)**

Monochrome, menu-driven, keyboard and touch. Plain JavaScript with no framework or
npm dependencies. The page requests fonts from Google Fonts and includes local
monospace fallbacks.

## The heart of the game

Keep it old school: black-and-white scenes, numbered menus, scarce supplies,
difficult choices, and dry humor. Guide five survivors west, manage the wagon,
choose roads, scavenge, and decide when to stop. More personality should deepen
that journey without turning it into a different kind of game.

## What's new in v1.4: the road atlas

- **v1.4.1 retro palette:** paper-white backgrounds, black ink, stippled map
  borders, and inverse selections give the atlas a classic monochrome computer
  look. Route patterns and readable labels distinguish each road and stop.
- A larger, sharp monochrome map with directly selectable stops, state boundaries,
  and a steady marker for your position between towns.
- Four zoom levels, **Your position** and **Whole route** controls, and a scrollable
  map on narrow screens so labels remain legible.
- Distinct marks for roads traveled, roads ahead, a selected route preview, and
  branches that are no longer reachable.
- Correct shortest-road distances to each stop, including alternate branches and
  the unfinished portion of the current leg.
- Road previews with next-stop mileage, total mileage to Boise, and estimates of
  travel days, food, and fuel. Previewing does not spend resources or advance time.
  At your current stop, **Take road** commits the next leg.
- Keyboard-accessible stops and a matching list with distances and travel status.

The map uses the existing game's coordinates and roads. Straight segments connect
stops; they do not trace every bend of the real highways. Estimates use current
conditions and can change as the journey unfolds.

### Map controls

| Control | Action |
|---|---|
| Click / tap a stop | Select it and read its route details |
| Tab, then Enter / Space | Select a focused map stop or activate a button |
| 1 / 2 | Select the next / previous stop in the east-to-west list |
| + / − | Zoom in / out |
| Home | Center on your position |
| 0 | Show the whole route |
| Esc | Return to the previous road or arrival screen |

## Added in v1.3

- **People in the wagon:** role-based personalities and short survivor dialogue,
  mixed with roadside atmosphere and radio fragments.
- **Choices that follow you:** a three-part encounter with Ruth and her family.
  Helping, taking supplies, trading, making amends, or walking away changes later
  meetings. These memories are saved with the journey.
- **Planning before travel:** estimates of full days of food and miles of fuel,
  plus warnings about urgent needs. Estimates reflect current conditions;
  weather, encounters, and changes in the party can alter them.
- **Time to read:** travel pauses after each day by default. Continuous travel is
  still available in Settings.
- **Comfortable controls:** larger menu buttons, browser zoom, text-size options,
  and Settings accessible from the road. New players default to menu-only
  scavenging; the optional timed minigame is still available.
- **A personal ending:** individual survivor remembrances and a record of the
  choices that followed the party.

Existing saved preferences are preserved. Personalities currently follow each
survivor's role; they are not a separate relationship or skill-progression system.

## Playing and controls

1. Open the game, name your party, choose roles and difficulty, and buy supplies.
2. Choose a road and travel. Check the food and fuel estimates before committing.
3. Use the road menu to rest, scavenge, treat wounds, repair, or read the journal.

| Control | Action |
|---|---|
| Click or tap | Choose a menu option |
| Displayed number or letter | Activate that option where a single-key shortcut is shown |
| Up / Down arrows | Move between menu buttons |
| Enter / Space | Activate the focused button |
| Esc | Go back or stop travel where offered |
| S on the road menu | Open Settings |
| 0 on the road menu | Save and quit options |

Settings include sound, reduced flashing and scanlines, text size, menu-only or
minigame scavenging, and day-by-day or continuous travel. No timed input is needed
for menu-only scavenging.

Saves, preferences, memorials, and scores are stored in the current browser.
Returning to the road screen saves the journey; use **Save and quit** before
leaving. Clearing browser storage removes local records. Saves do not sync
between devices.

## Run locally

Open `index.html` in a browser to play the built game. To edit and rebuild it,
install Node.js, clone this repository, then run:

```bash
node build.js
```

No `npm install` step is required. Reopen or refresh `index.html` after building.

---

## How this repo works

`index.html` is the whole playable game — the file GitHub Pages serves. It is
**generated**, not edited. The readable source is in the repository root, and `build.js`
concatenates it.

| File | Purpose |
|---|---|
| `00_core.js` through `90_ui.js` | 19 source modules, loaded in filename order |
| `style.css` | Styling |
| `icons.json` | Embedded icon data used by the build |
| `build.js` | Generates the playable HTML, manifest, and app icons |
| `test-story.js` | Story, save/load, and built-script checks |
| `test-map.js` | Distances, branch states, route previews, estimates, and label layout |
| `sim.js` | Headless campaign simulator |
| `index.html` | Generated playable game; do not edit by hand |

To rebuild after changing the source:

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
| `65_story.js` | Survivor personalities, atmosphere, supply forecasts, delayed story encounters, and ending remembrances |
| `70_scavenge.js` | Scavenging, menu and minigame |
| `80_render.js` | The monochrome renderer, bitmap font, the map, ~80 scenes |
| `82_atlas.js` | Interactive atlas, shortest paths to stops, leg estimates, and SVG layout |
| `85_save_audio.js` | Save slots, memorials, high scores, square-wave audio |
| `90_ui.js` | Screens, input, modals |

---

## Adding an event

This is the main way to grow the game, and it needs no engine changes. Add an
object inside the relevant `ZT.Events.add([...])` list in `60_ev_road.js`
through `63_ev_people_camp.js`, then rebuild. Landmark events live in
`64_landmarks.js`; the delayed Ruth encounters live in `65_story.js`.

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
that is how the landmark set pieces work. For consequences days later, follow
`ZT.Story.due` and `ZT.Story.remember` in `65_story.js`: the story checks both
elapsed days and distance, keeps the encounter out of the ordinary random pool,
and records the result in saveable flags. Keep display-only helpers free of
state changes and random-number consumption.

**Region ids:** `missouri, platte, sandhills, panhandle, laramie, powder, divide,
bear, wasatch, lava, snake, owyhee`

**Common verbs** (all in `25_effects.js`): `take` `give` `hurt` `heal` `injure`
`sicken` `bite` `expose` `fatigueAll` `morale` `noise` `horde` `wear` `repair`
`breakdown` `delay` `loot` `shots` `someone`

**Tone:** concise, dry, occasionally darkly funny. A dropped tire iron can be as
memorable as a horde. Humour works best delivered flat.

---

## Validation and balance

Build first so the tests inspect the current playable file:

```bash
node build.js
npm run test:quick
```

The quick command runs `test-map.js`, `test-story.js`, and 480 simulated campaigns: 10 runs for
each combination of four difficulties, three choice policies, and four opening
loadouts. For 1,920 simulated campaigns and the same story checks:

```bash
npm test
```

You can also run `node test-map.js`, `node test-story.js`, or `node sim.js 40` separately. Map
checks cover all 289 stop pairs against enumerated routes, partial-leg mileage,
unavailable branches, walking, preview state preservation, and non-overlapping
labels at every zoom. The story
checks cover the six tested encounter paths, resource-gated choices, delayed
consequences, save/load persistence, display helpers that leave state unchanged,
and built-script syntax. The simulator reports wins, deaths, supplies, routes,
and event coverage; it exits unsuccessfully if campaign crashes occur.

During v1.3 development, 480 campaigns completed with zero game crashes. Their
report exposed an outdated landmark constant in the simulator; after fixing it,
48 further campaigns and the focused checks passed. The 480-run sample won
100% on Story, 52.5% on Normal, 35% on Hard, and 6.7% on Nightmare. These are
sample results, not guarantees or a substitute for player feedback.

The v1.4 atlas and v1.4.1 palette were checked with native SVG renders of the
overview, a zoomed view, and a journey in progress. Browser testing has not been performed for these updates.
Automated campaigns and native SVG renders do not verify the full page layout,
touch interaction, or how the story feels.

When changing balance, watch whether scavenging can cover the food consumed
during a search and whether one cause of death overwhelms the others.

---

## Publishing a change

1. Edit the numbered JavaScript modules or `style.css`
2. `node build.js`
3. Run the relevant checks above
4. Commit the source **and** the rebuilt `index.html`; include other generated assets if they changed
5. Merge the update into `main`
6. Check **Actions → pages build and deployment** for a successful publication

README-only changes do not require rebuilding the game. Publication time varies;
refresh the game after deployment if the previous version is still displayed.

## Installing on an iPad

Open the [game](https://lancepounds.github.io/zombie-trails/) in Safari, then choose
**Share → Add to Home Screen**. Saves remain local to that browser or installed
web app; adding an icon is not a cloud backup. This project has no service
worker, so it does not guarantee offline loading.
