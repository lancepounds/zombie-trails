/* Optional browser regression: NODE_PATH=<Playwright installation> node test-dwell.js */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http'), fs = require('node:fs');
(async () => {
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync(__dirname + '/index.html')); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    const wait = ms => page.waitForTimeout(ms);
    const leave = () => page.mouse.move(2, 2);
    const hover = async locator => { await locator.scrollIntoViewIfNeeded(); await wait(100); await leave(); await locator.hover(); };
    const dwell = async locator => { await hover(locator); await wait(950); };
    const menu = page.locator('#accessibility-menu');
    const open = page.locator('#accessibility-toggle');
    await hover(open); await wait(1350);
    assert.equal(await menu.evaluate(e => e.open), false, 'dwell is off by default');
    await open.click();
    await page.locator('#a11y-dwell').check();
    await page.locator('#a11y-dwellDelay').selectOption('800');
    await page.keyboard.press('Escape');
    await hover(open); await wait(250);
    assert(await page.locator('.dwell-countdown').isVisible(), 'visible countdown');
    await leave(); await wait(850);
    assert.equal(await menu.evaluate(e => e.open), false, 'leaving cancels');
    await dwell(open);
    assert.equal(await menu.evaluate(e => e.open), true, 'dwell opens menu');
    await dwell(page.locator('#a11y-plainFont').locator('..'));
    assert(await page.locator('#a11y-plainFont').isChecked(), 'label dwell toggles checkbox');
    await wait(1100);
    assert(await page.locator('#a11y-plainFont').isChecked(), 'resting pointer never repeats');
    await dwell(page.locator('#a11y-dwellDelay'));
    assert(await page.locator('#dwell-options').evaluate(e => e.open), 'dwell opens accessible dropdown choices');
    await dwell(page.getByRole('button', { name: '1.8 seconds', exact: true }));
    assert.equal(await page.locator('#a11y-dwellDelay').inputValue(), '1800');
    assert.equal(await page.locator('#dwell-options').evaluate(e => e.open), false);
    await page.keyboard.press('Escape');
    await hover(open); await wait(1000);
    assert.equal(await menu.evaluate(e => e.open), false, 'longer delay is respected');
    await wait(1000);
    assert.equal(await menu.evaluate(e => e.open), true);
    await page.locator('#a11y-dwellDelay').selectOption('800');
    await page.keyboard.press('Escape');
    await page.reload(); await dwell(open);
    assert(await page.locator('#a11y-dwell').isChecked(), 'enabled persists');
    assert.equal(await page.locator('#a11y-dwellDelay').inputValue(), '800', 'delay persists');
    await page.keyboard.press('Escape');
    await dwell(page.locator('#dwell-toggle'));
    assert.equal(await page.locator('#dwell-toggle').textContent(), 'Resume dwell');
    await dwell(open);
    assert.equal(await menu.evaluate(e => e.open), false, 'paused dwell leaves controls alone');
    await dwell(page.locator('#dwell-toggle'));
    assert.equal(await page.locator('#dwell-toggle').textContent(), 'Pause dwell', 'dwell can resume itself');
    await hover(open); await wait(250); await open.click(); await wait(1000);
    assert(await menu.evaluate(e => e.open), 'manual click cancels pending dwell');
    await page.keyboard.press('Escape');
    // Touch movement must not start a dwell countdown.
    const pos = await open.boundingBox();
    await leave();
    await open.dispatchEvent('pointermove', { pointerType: 'touch', clientX: pos.x + 5, clientY: pos.y + 5, bubbles: true });
    await wait(950);
    assert.equal(await menu.evaluate(e => e.open), false, 'touch does not hover-click');
    // A hovered button removed by a screen update cannot fire.
    await page.evaluate(() => { window.clicked = 0; const b = document.createElement('button'); b.id = 'test-dwell-target'; b.textContent = 'Test target'; b.onclick = () => window.clicked++; document.body.appendChild(b); });
    await hover(page.locator('#test-dwell-target')); await wait(200);
    await page.locator('#test-dwell-target').evaluate(e => e.remove()); await wait(850);
    assert.equal(await page.evaluate(() => window.clicked), 0);
    // Real menu navigation and blocked destructive controls.
    await dwell(page.getByRole('button', { name: /Settings.*sound, volume/ }));
    assert.equal(await page.locator('#screen h1').textContent(), 'SETTINGS');
    let dialogs = 0; page.on('dialog', async dialog => { dialogs++; await dialog.dismiss(); });
    await dwell(page.getByRole('button', { name: /Erase saved game/ }));
    assert.equal(dialogs, 0, 'erase cannot activate by dwell');
    // Replaced command menus cannot chain selections under a resting pointer.
    await dwell(page.getByRole('button', { name: /Text size:/ }));
    const scale = await page.evaluate(() => ZT.Save.settings().scale);
    await wait(1800);
    assert.equal(await page.evaluate(() => ZT.Save.settings().scale), scale);
    // Scroll cancels the pending activation; no restart without a new visit.
    await hover(open); await wait(200);
    await page.evaluate(() => document.dispatchEvent(new Event('scroll'))); await wait(900);
    assert.equal(await menu.evaluate(e => e.open), false);
    await dwell(open);
    await page.locator('#a11y-dwell').uncheck();
    await page.keyboard.press('Escape'); await dwell(open);
    assert.equal(await menu.evaluate(e => e.open), false, 'disabling stops dwell');
    assert.deepEqual(errors, []);
    console.log('Dwell browser checks passed: opt-in, countdown/cancellation, label checkbox, one-shot activation, dropdowns, delay, persistence, pause/resume, manual click, touch exclusion, removed targets, destructive controls, screen changes, scroll cancellation, and disable.');
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
