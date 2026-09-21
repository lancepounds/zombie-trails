# Midwest summer encounters — September 21, 2026

Added ten random encounters (two each for road, zombie, vehicle, health, and
camp) plus one linked cold-drink stop: **11 event records and 34 choices**.
The complete event library grows from 190 to 201 records.

## Context and mechanics

The journey begins September 1. Random summer encounters require day 1–30 and
the Nebraska region profiles: Missouri, Platte, Sandhills, and Panhandle.
The sprinkler encounter uses Missouri, Platte, and Sandhills. Eight travel
encounters require Heat weather. Mosquitoes require clear, heat, or rain;
the porch shelter requires rain or storm. Both camp events explicitly check
the current road or a Nebraska stop to avoid the existing landmark-region
fallback to Missouri. Every random addition has a 30-day cooldown.

Existing fatigue, morale, vehicle condition, food, trade goods, time, noise,
and horde pressure carry the consequences. There are no new inventory slots,
save fields, weather rules, daily encounter rates, or difficulty settings.
Cold drinks are consumed at the stop and affect recovery and morale.

| Event | Main tradeoff |
|---|---|
| `road_midwest_heat_buckle` | Lose time and energy going around, damage the wagon crossing fast, or exhaust a walking party climbing over |
| `road_midwest_ice_freezer` | Buy recovery with trade goods, work for refreshments, or leave |
| `z_midwest_beer_tent` | Risk injury for supplies, spend ammunition and attract attention, or keep away |
| `z_midwest_sprinkler` | Wait quietly, sacrifice food as a distraction, or risk squeezing past |
| `v_midwest_summer_flat` | Spend a spare or gamble on a patch or the damaged tire; all paths cost time, fatigue, and morale |
| `p_midwest_cold_drinks` | A successful flat-tire path reaches a choice between morale, fatigue recovery, free shade, and pressing on |
| `v_midwest_cabin_fan` | Spend a part, use reusable tools, or tolerate worsening heat and electrical wear |
| `h_midwest_heat_headache` | Give the named survivor food and rest, rest without food, or suffer health and fatigue costs |
| `h_midwest_spoiled_lunch` | Discard food, spend time salvaging sealed food, or risk illness for the named taster |
| `c_midwest_mosquitoes` | Spend goods on repellent, reveal camp with a smoky fire, or lose sleep |
| `c_midwest_storm_shelter` | Help with the work, trade for a longer rest, or stay hidden and wet |

The flat-tire event costs half a day, 16 party fatigue, 5 morale, and 18 tire
condition before the selected repair. A spare costs one part and restores 24
tire condition (net +6 before the normal 100 cap). A patch requires a reusable
tool kit and succeeds 65% of the time, or 90% with a living mechanic; success
restores 10 condition. Failure leaves a tire breakdown. Limping costs another
18 tire condition, adds 8 noise, and has a 60% breakdown chance; zero tire
condition always breaks down.

A successful path chains to the drink stand. Beer and water cost one trade
lot, add 12 morale, and remove 8 fatigue; lemonade and more rest cost the same,
add 8 morale, and remove 14 fatigue. Both take half a day. The free shade and
canteen option takes half a day, adds 2 morale, and removes 6 fatigue. Leaving
immediately costs 3 morale and leaves fatigue in place. The engine combines
fractional delays into a maximum 0.9-day reduction to the next travel day.
No alcohol inventory or driving modifier is introduced; the beer outcome has
the driver choose lemonade. Recovery comes with water and a stationary rest.

The stand has both `weight: 0` and `cond: () => false` because this engine gives
zero-weight eligible events a small minimum weight. The condition keeps it out
of the random pool; explicit chaining still opens it normally. Broken-tire
outcomes return to the existing repair system rather than opening the stand.

## Simulator comparison

Baseline: `c8eae33e7b28172c7911092fa3c7792420c8394d` on `main`.
Unmodified `node sim.js 40` before and after: 1,920 journeys per version,
four difficulties × three policies × four loadouts × 40 seeds. Seeds are
`1000 + i * 7919`, with `i = 0..39`.

| Difficulty | Before | After | Change |
|---|---:|---:|---:|
| Story | 99.8% | 99.8% | 0.0 percentage points |
| Normal | 60.2% | 57.3% | −2.9 percentage points |
| Hard | 42.3% | 44.6% | +2.3 percentage points |
| Nightmare | 5.2% | 4.6% | −0.6 percentage points |

Each difficulty contains 480 journeys. Changes use the displayed rounded rates.
The sample moved in both directions. It does not establish a general difficulty
shift, and no compensating changes were made. Matching starting seeds do not
keep later encounters identical when new content changes random consumption.
The simulator uses five-person parties and keyword-based choices; it is not a
substitute for human playtesting.

- Crashes: **0 before, 0 after**.
- All ten added random encounters fired. All four drink-stop choices were taken
  in the expanded campaigns (none appears in the never-taken choice list).
- Infection remained the leading reported death cause: 4,310 → 4,268.
  Exhaustion deaths moved from 39 → 45, exposure from 233 → 246.
- Parts empty at the end: 16% → 17%; trade goods: 12% → 13%.
- Some new chance/risk choices were not selected by the simulator. Focused
  outcome tests cover those choices directly.

Raw output: [before](midwest-summer-before.txt), [after](midwest-summer-after.txt).
The after file includes the full test-suite results before simulator output.

## Validation

`node build.js` rebuilt the delivered `index.html`. `npm test` passed the party,
map, story/built-script, existing regional-content, Midwest-content, and audio
checks, followed by 1,920 simulated campaigns with zero crashes.

`test-midwest.js` covers 9,024 outcomes across all four difficulties,
one/five survivors, driving/walking, stocked/empty supplies, and varying seeds.
It verifies weather, region, season, camp location, cooldowns, art keys,
exact payments, reusable tools, free choices, the identity of affected
survivors, bounded state, and saved consequences. Explicit checks exercise
both success/failure branches of the tire gamble, normal repair after failure,
the linked stop's exclusion from random selection, and fatigue that slows
subsequent travel. The existing regional checks also pass 27,680 outcomes.

No renderer or UI behavior was changed. A Chromium interaction check was
attempted, but this workspace has no installed browser executable; browser
layout and physical-device interaction were not rechecked for this content
update. The built script and all referenced scene keys passed automated checks.
