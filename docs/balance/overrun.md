# Overrun junction balance check

Compared the published game at `8183fe7483d7784be9a7aa7db140c714a5175dc8`
against the new overrun junction using `node sim.js 10`: 480 journeys before
and 480 after, with the same seeds, difficulty settings, policies, and loadouts.
Both completed with zero crashes. This is a small simulator sample, not a player study.

| Difficulty | Before | After | Change |
|---|---:|---:|---:|
| Story | 99.2% | 95.0% | -4.2 percentage points |
| Normal | 65.8% | 42.5% | -23.3 percentage points |
| Hard | 38.3% | 33.3% | -5.0 percentage points |
| Nightmare | 3.3% | 3.3% | 0.0 percentage points |

This is a substantial difficulty increase in Normal. The encounter is guaranteed
once when departing a major fork in a working wagon, with real fuel, damage,
time, route, or vehicle-loss consequences. Walking makes later supply management
much harder. The simulator's generic policies do not fully plan for this crisis;
new scripted scenes also change subsequent random draws. These results do not
isolate the effect of each choice. No global balance values were changed.
An initial draft required 3/6/4 gallons for fighting/ramming/detouring; the final
version uses 2/3/1 so low fuel leaves more options for preserving the wagon.

## Checks

- 48 fork/selected-road/party-size/choice paths across all three real forks.
- Resource thresholds, zero-supply escape, no mileage or time spent before choosing,
  actual destination changes, wagon loss and carrying limits, no event replay,
  saved flags, three-travel-day follow-up, and death handling.
- Existing party, map, story, content, Midwest, and audio checks passed.
- 9,534 native Canvas renders in separate processes for light and dark themes;
  exact monochrome palette, motion-off finish, three escape animations, frozen
  scenes, native state/RNG preservation, and no scene exceptions.
- Browser regression code is supplied in `test-overrun-browser.js`, but could not
  be executed here: Chromium is absent and the browser download returned an
  invalid archive. Native Canvas and engine checks do not verify browser layout,
  pointer input, or physical devices.

[Before](overrun-before.txt) | [After](overrun-after.txt)
