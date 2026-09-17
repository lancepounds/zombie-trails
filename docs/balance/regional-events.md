# Regional event expansion — September 17, 2026

Added 20 events and 50 choices, bringing the complete library from 169 to 189
events. The ordinary random-event pool grows from 144 to 164. Event-engine
weights, daily encounter chances, difficulty settings, and simulator policies
are unchanged; the new entries use ordinary category weights and 30-day cooldowns.

## Where the content went

Coverage counts ordinary random events explicitly tagged for a region, including
events shared by several regions. It excludes globally available events,
landmarks, and the scheduled story chain. The 114 globally available random
events remain available everywhere, subject to their existing conditions.

These were the six least-covered regions. Missouri receives most of the additions
because it previously had no localized random events; all six now have 11–12.

| Region | Before | Added | After |
|---|---:|---:|---:|
| Missouri bottoms / opening road | 0 | 11 | 11 |
| Lava Plain | 9 | 3 | 12 |
| Boise Valley (`owyhee`) | 9 | 3 | 12 |
| Laramie Range | 10 | 1 | 11 |
| Bear River | 10 | 1 | 11 |
| Wasatch Front | 10 | 1 | 11 |

## Category mix

The requested five categories contained 107 events. Proportionally allocating
20 additions with largest-remainder rounding gives 7 road, 6 zombie, 2 vehicle,
3 health, and 2 camp events. Each category's share of these five stays within
0.31 percentage points of its previous share. Weather, people, rare, landmark,
and scheduled story content are unchanged.

| Category | Before | Added | After |
|---|---:|---:|---:|
| Road | 36 | 7 | 43 |
| Zombie | 34 | 6 | 40 |
| Vehicle | 12 | 2 | 14 |
| Health | 14 | 3 | 17 |
| Camp | 11 | 2 | 13 |

## Simulator comparison

Baseline: `fc38708e6ea81ba6d6e91785613be8f640037d43` on `main`.
Ran `node sim.js 200` before and after the content changes: **9,600 journeys
per version**, covering four difficulties, three choice policies, and four
starting loadouts, with 200 seeds per combination. Both use seeds
`1000 + i * 7919`, for `i = 0..199`, and the same unmodified simulator.

| Difficulty | Before wins | After wins | Change |
|---|---:|---:|---:|
| Story (`easy`) | 99.3% | 99.5% | +0.2 percentage points |
| Normal | 62.1% | 61.4% | −0.7 percentage points |
| Hard | 42.9% | 42.0% | −0.9 percentage points |
| Nightmare | 6.0% | 5.0% | −1.0 percentage points |

Changes are calculated from the simulator's displayed, rounded rates. Each
difficulty represents 2,400 journeys per version.

**Assessment:** a small absolute shift toward harder play on Normal, Hard, and
Nightmare, with Story effectively flat. Nightmare's drop is about one-sixth of
its already low baseline win rate, so it is worth watching in player sessions.
This is a descriptive sample comparison, not a statistical significance claim.
New events change subsequent random-number consumption, so matching starting
seeds does not mean identical encounters later in a journey. The AI chooses by
keywords and runs five-person parties; it does not model every human strategy.
No compensating balance changes were made.

- **Crashes:** 0 before, 0 after.
- **Coverage:** all 20 new events fired. The only ordinary events never seen
  after the change were the existing `v_siphon_own` and `h_ration_grumble`.
- **Reported deaths:** infection remained dominant (21,611 → 21,716);
  exposure fell (1,146 → 1,111), exhaustion rose (245 → 282), and injuries
  rose (74 → 116). These are the simulator's recorded causes, not a new death audit.
- **Resources empty at the end:** parts 17% → 16%, medicine 15% → 16%,
  goods 12% → 12%, tools 9% → 9%; fuel and ammo both round to 0% in both runs.
- **Route use:** Lava Plain branch entries were identical (888); the other
  alternate-road counts remained close. Full per-policy/loadout results are in
  [before](regional-events-before.txt) and [after](regional-events-after.txt).

## Validation

Rebuilt `index.html`; party, map, story, and built-script checks passed.
`node test-content.js` also passed 27,680 resolved outcomes, covering every new
choice with scarce/full supplies, one/five travelers, driving/walking, all four
difficulties, varying seeds, rain/clear weather, and low/high horde pressure.
Checks include exact resource payments, unaffordable-choice hiding, existing
artwork keys, region/timing eligibility, affected-survivor consistency, bounded
state, and save/load.

The existing region helper falls back to Missouri at non-terminal landmarks.
The new Missouri camp event has an additional location condition so it cannot
appear at unrelated landmark camps. No route-engine behavior was changed.

## Added events

| Region | Event IDs |
|---|---|
| Missouri | `road_missouri_seed_spill`, `road_missouri_pump_ledger`, `road_missouri_county_barricade`, `road_missouri_feed_store`, `z_missouri_silo_shadow`, `z_missouri_ditch_hands`, `z_missouri_weigh_station`, `v_missouri_cottonwood_filter`, `h_missouri_wet_boots`, `h_missouri_grain_dust`, `c_missouri_flood_marker` |
| Lava Plain | `road_lava_cinder_drift`, `z_lava_tube_echo`, `h_lava_heel_blister` |
| Boise Valley | `road_owyhee_canal_gate`, `z_owyhee_mailboxes`, `c_owyhee_porch_light` |
| Laramie | `v_laramie_roof_lashings` |
| Bear River | `road_bear_cattle_gate` |
| Wasatch | `z_wasatch_carwash` |
