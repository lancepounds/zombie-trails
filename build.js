/* Build: concatenate numbered source modules into index.html at the repo root.
   GitHub Pages serves index.html from here, so this is the file that ships.
   Run:  node build.js     (or: npm run build) */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const SRC = ROOT;

const order = fs.readdirSync(SRC).filter((f) => /^\d+_.*\.js$/.test(f)).sort();
const js = order.map((f) => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const css = fs.readFileSync(path.join(SRC, 'style.css'), 'utf8');
const icons = JSON.parse(fs.readFileSync(path.join(SRC, 'icons.json'), 'utf8'));
const VERSION = 'v1.6';

const manifest = {
  name: 'Zombie Trails',
  short_name: 'Zombie Trails',
  description: 'Omaha to Boise. Up to five survivors, a station wagon, and the dead on every road.',
  start_url: './', scope: './', display: 'standalone', orientation: 'any',
  background_color: '#e8e8e8', theme_color: '#e8e8e8',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#e8e8e8">
<meta name="color-scheme" content="light">
<link rel="manifest" href="manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Zombie Trails">
<link rel="apple-touch-icon" href="data:image/png;base64,${icons['180']}">
<link rel="icon" href="data:image/png;base64,${icons['192']}">
<title>Zombie Trails</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=Silkscreen:wght@400;700&display=swap">
<style>
${css}
</style>
</head>
<body>
<div class="tube" id="tube">
  <div class="brand">
    <span>Zombie Trails</span>
    <span>Omaha &rarr; Boise &middot; ${VERSION}</span>
    <button id="sound-toggle" class="theme-toggle" type="button" aria-pressed="false" aria-label="Enable sound">Sound: off</button>
    <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Switch to dark mode">Dark mode</button>
  </div>
  <main id="screen" tabindex="-1"></main>
</div>
<script>
${js}
ZT.UI.start();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'index.html'), html);
fs.writeFileSync(path.join(ROOT, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));
for (const sz of ['192', '512']) fs.writeFileSync(path.join(ROOT, `icon-${sz}.png`), Buffer.from(icons[sz], 'base64'));

console.log('built index.html  ' + (html.length / 1024).toFixed(1) + ' KB');
console.log('modules: ' + order.length + '  |  events: ' + (html.match(/id: '/g) || []).length);
console.log('\nNext: commit the source and index.html together.');
