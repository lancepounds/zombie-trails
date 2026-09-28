/* Browser regression checks. Optional dev dependency: playwright with Chromium.
   Run: node test-accessibility.js [optional URL of a running game] */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http'), fs = require('node:fs');
(async () => {
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync(__dirname + '/index.html')); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.argv[2] || 'http://127.0.0.1:' + server.address().port);
    const open = () => page.locator('#accessibility-toggle').click();
    await open();
    assert.equal(await page.locator('#accessibility-close').evaluate(e => e === document.activeElement), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.locator('#accessibility-menu').evaluate(e => e.contains(document.activeElement)), true, 'focus stays inside modal');
    await page.locator('#a11y-scale').selectOption('4');
    await page.locator('#a11y-plainFont').check();
    await page.locator('#a11y-largeControls').check();
    await page.locator('#a11y-highContrast').check();
    await page.locator('#a11y-motion').check();
    await page.locator('#a11y-flash').check();
    await page.locator('#a11y-theme').selectOption('dark');
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(0, 0, 0)');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#accessibility-toggle').evaluate(e => e === document.activeElement), true);
    await page.reload(); await open();
    assert.equal(await page.locator('#a11y-scale').inputValue(), '4');
    assert(await page.locator('#a11y-plainFont').isChecked());
    assert(await page.locator('#a11y-motion').isChecked());
    await page.setViewportSize({ width: 320, height: 740 });
    assert(await page.locator('#accessibility-menu').evaluate(e => e.scrollWidth <= e.clientWidth + 1), '200% dialog fits a narrow phone');
    await page.screenshot({ path: '/tmp/zombie-accessibility-mobile.png' });
    await page.keyboard.press('Escape');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'title fits phone at 200%');
    // Setting changes must preserve unfinished setup input.
    await page.getByRole('button', { name: /New journey/ }).click();
    await page.locator('#nm0').fill('Lance');
    await open(); await page.locator('#a11y-scale').selectOption('1'); await page.keyboard.press('Escape');
    assert.equal(await page.locator('#nm0').inputValue(), 'Lance');
    await page.setViewportSize({ width: 1100, height: 850 });
    await page.evaluate(() => {
      ZT.Save.save(ZT.State.newGame({ seed: 1234 }));
      ZT.Save.saveSettings({ ...ZT.Save.settings(), arcade: true, scale: 1 });
    });
    await page.reload();
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.getByRole('button', { name: /Scavenge/ }).click();
    await page.getByRole('button', { name: /Go in yourself/ }).click();
    // Track actual minigame steps to distinguish pause from an unchanged HUD.
    await page.evaluate(() => { window.scavSteps = 0; const step = ZT.Scavenge.step; ZT.Scavenge.step = (...args) => { window.scavSteps++; return step(...args); }; });
    await open();
    const steps = await page.evaluate(() => window.scavSteps);
    const state = await page.evaluate(() => JSON.stringify(ZT.UI.state));
    await page.waitForTimeout(1100);
    await page.locator('#a11y-arcade').check();
    await page.locator('#a11y-volume').selectOption('0.25');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => window.scavSteps), steps, 'minigame pauses');
    assert.equal(await page.evaluate(() => JSON.stringify(ZT.UI.state)), state, 'preferences do not mutate game state');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    assert(await page.evaluate(n => window.scavSteps > n, steps), 'minigame resumes');
    await page.getByRole('button', { name: 'Leave now', exact: true }).filter({ visible: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open();
    assert(await page.locator('#accessibility-device-motion').isVisible());
    await page.screenshot({ path: '/tmp/zombie-accessibility-desktop.png' });
    assert.deepEqual(errors, []);
    console.log('Accessibility browser checks passed: keyboard focus, persistence, narrow-screen 200% text, setup preservation, minigame pause/resume, state isolation, and device motion preference.');
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
