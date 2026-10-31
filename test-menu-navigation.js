/* Exercise the real menu binder with focusable command-button adapters. */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(__dirname + '/90_ui.js', 'utf8');
const start = source.indexOf('function bindMenu('), end = source.indexOf('\nfunction render(', start);
assert(start >= 0 && end > start, 'menu binder exists');
const box = { document: { activeElement: null } }; vm.createContext(box);
vm.runInContext('let keyMap = {};\n' + source.slice(start, end), box);
const press = key => vm.runInContext('keyMap[' + JSON.stringify(key) + ']()', box);
let picks = [];
function menu(items) {
  const buttons = items.flatMap((it, i) => it.sep ? [] : [{
    dataset: { i: String(i) }, disabled: !!it.disabled, handlers: {},
    addEventListener(type, fn) { this.handlers[type] = fn; },
    focus() { box.document.activeElement = this; },
  }]);
  box.bindMenu({ querySelectorAll: () => buttons }, items, i => picks.push(i));
  return buttons;
}
const outside = {};
const buttons = menu([
  { label: 'Travel' }, { label: 'Treat', disabled: true },
  { sep: 'Information' }, { label: 'Journal', key: 'J' }, { label: 'Settings', key: 'S' },
]);
box.document.activeElement = outside;
press('arrowup'); assert.equal(box.document.activeElement, buttons[3], 'initial Up selects the last enabled option');
box.document.activeElement = outside;
press('arrowdown'); assert.equal(box.document.activeElement, buttons[0], 'initial Down selects the first enabled option');
press('arrowup'); assert.equal(box.document.activeElement, buttons[3], 'Up wraps from first to last');
press('arrowdown'); assert.equal(box.document.activeElement, buttons[0], 'Down wraps from last to first');
// Tab or a pointer can change focus independently of the arrow-key handler.
buttons[2].focus(); press('arrowdown');
assert.equal(box.document.activeElement, buttons[3], 'Down follows actual focus after Tab');
press('arrowup'); assert.equal(box.document.activeElement, buttons[2]);
press('arrowup'); assert.equal(box.document.activeElement, buttons[0], 'Up skips disabled commands');
press('arrowdown'); assert.equal(box.document.activeElement, buttons[2], 'Down skips disabled commands');
buttons[3].focus(); press('arrowdown');
assert.equal(box.document.activeElement, buttons[0], 'pointer focus also controls wrapping');
assert.deepEqual(picks, [], 'moving focus never activates a gameplay command');
// Existing letter shortcuts take priority over optional W/S movement aliases.
press('s'); assert.deepEqual(picks, [4], 'S still activates Settings');
press('j'); assert.deepEqual(picks, [4, 3], 'J still activates Journal');
press('w'); assert.equal(box.document.activeElement, buttons[3]);
const replacement = menu([{ label: 'Continue' }]);
press('arrowup'); assert.equal(box.document.activeElement, replacement[0], 'new menus do not use stale focus');
press('arrowdown'); assert.equal(box.document.activeElement, replacement[0], 'single-option menus wrap safely');
menu([{ label: 'Unavailable', disabled: true }]); box.document.activeElement = outside;
press('arrowup'); press('arrowdown'); assert.equal(box.document.activeElement, outside, 'all-disabled menus leave focus alone');
menu([]); press('arrowup'); press('arrowdown'); assert.equal(box.document.activeElement, outside, 'empty menus leave focus alone');
console.log('Menu navigation checks passed: initial Up/Down, both wrap directions, Tab/pointer focus, disabled commands, separators, no accidental actions, letter shortcuts, replacement/empty/single-option menus.');
