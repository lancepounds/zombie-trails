# Zombie Trails

A 1980s-style trail-survival game. Omaha, Nebraska to Boise, Idaho — about 1,320
miles of real road, up the Platte, over the Continental Divide, and down the Snake.
Five survivors, one station wagon, and three real forks in the road.

Monochrome, menu-driven, keyboard and touch. No dependencies, no build step to run
it: `index.html` is the whole game.

## Playing it

Open `index.html` in any browser, or visit the GitHub Pages URL for this repo.

## Installing it on an iPad or iPhone

Open the Pages URL in Safari, then **Share → Add to Home Screen**. It launches
full-screen from its own icon, with no browser chrome.

This is worth doing for a reason beyond the icon: Safari clears a site's saved data
after seven days without a visit, which would erase a journey in progress. Apps
added to the home screen are largely exempt, so installing it is what makes the
save reliable.

## Turning on GitHub Pages

Repository **Settings → Pages → Source: Deploy from a branch**, branch `main`,
folder `/ (root)`. Give it a minute and the URL appears on that same page.

## What is in here

| File | |
|---|---|
| `index.html` | the entire game — engine, content, renderer, UI |
| `manifest.webmanifest` | makes it installable as a standalone app |
| `icon-192.png`, `icon-512.png` | home-screen icons |
| `.nojekyll` | tells Pages to serve the files as they are |

The readable source — 17 modules, the event library, and the balance simulator that
plays thousands of headless campaigns to tune difficulty — lives separately.
`index.html` is what `build.js` produces from it.
