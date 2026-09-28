/* Accessibility preferences share the existing settings store, never game saves. */
'use strict';
ZT.Accessibility = (function () {
  let dialog;
  function init(settings, apply, pause, resume) {
    dialog = document.createElement('dialog');
    dialog.id = 'accessibility-menu';
    dialog.className = 'accessibility-menu';
    dialog.setAttribute('aria-labelledby', 'accessibility-title');
    dialog.setAttribute('aria-describedby', 'accessibility-intro');
    const select = (key, label, options) => `<label class="accessibility-field" for="a11y-${key}"><span>${label}</span><select id="a11y-${key}" data-setting="${key}">${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select></label>`;
    const check = (key, label, hint, invert = false) => `<label class="accessibility-check" for="a11y-${key}"><input id="a11y-${key}" type="checkbox" data-setting="${key}"${invert ? ' data-invert="true"' : ''}><span>${label}<small>${hint}</small></span></label>`;
    dialog.innerHTML = `
      <div class="accessibility-heading"><h1 id="accessibility-title">Accessibility</h1><button type="button" class="theme-toggle" id="accessibility-close" autofocus>Done</button></div>
      <p id="accessibility-intro">Game paused. Changes apply now and are remembered on this browser.</p>
      <fieldset><legend>Reading and display</legend>
        ${select('scale', 'Text size', [[0, 'Small (92%)'], [1, 'Normal (100%)'], [2, 'Large (114%)'], [3, 'Extra large (150%)'], [4, 'Double (200%)']])}
        ${select('theme', 'Display', [['light', 'Light'], ['dark', 'Dark']])}
        ${check('plainFont', 'Plain reading font', 'Use a familiar sans-serif font for text and menus.')}
        ${check('highContrast', 'High contrast interface', 'Pure black and white text and backgrounds.')}
        ${check('largeControls', 'Larger controls', 'Bigger buttons and more space between commands.')}
      </fieldset>
      <fieldset><legend>Motion and effects</legend>
        ${check('motion', 'Reduce motion', 'Show still scenes instead of decorative animation.', true)}
        <p class="small" id="accessibility-device-motion" hidden>Your device also requests reduced motion; that preference is always respected.</p>
        ${check('flash', 'Remove flashes and scanlines', 'Turn off lightning flashes and the screen overlay.', true)}
      </fieldset>
      <fieldset><legend>Sound</legend>
        ${check('sound', 'Enable sound', 'Retro effects and optional background atmosphere.')}
        ${select('volume', 'Volume', [[0, 'Muted (0%)'], [0.25, '25%'], [0.5, '50%'], [0.75, '75%'], [1, '100%']])}
        ${check('ambience', 'Background atmosphere', 'Engine, weather, and other ambient sounds when sound is on.')}
      </fieldset>
      <fieldset><legend>Time and controls</legend>
        ${check('dwell', 'Dwell to tap', 'Hold the pointer over a control to activate it. Move away to cancel or to make another selection.')}
        ${select('dwellDelay', 'Dwell delay', [[800, '0.8 seconds'], [1200, '1.2 seconds'], [1800, '1.8 seconds'], [2500, '2.5 seconds']])}
        <p class="small">Works with a mouse, trackball, or eye tracker that moves the pointer. Use Pause dwell in the header for a break. For scavenging without holding movement controls, choose menu-only below. Typing names and erasing saves still use normal input.</p>
        ${check('daily', 'Pause after each travel day', 'Read the daily report before continuing.')}
        ${check('arcade', 'Use menu-only scavenging', 'Future scavenging uses choices without timed movement. An active minigame resumes when you close this menu.', true)}
        <p class="small">Use Tab and Shift+Tab to move between controls, Space to toggle a checkbox, and arrow keys to change a selection. Press Escape or Done to return to the game.</p>
      </fieldset><button type="button" class="theme-toggle" id="accessibility-done">Done — return to game</button>`;
    document.body.appendChild(dialog);
    const fields = [...dialog.querySelectorAll('[data-setting]')];
    const query = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    const deviceNote = () => { document.getElementById('accessibility-device-motion').hidden = !(query && query.matches); };
    if (query && query.addEventListener) query.addEventListener('change', deviceNote);
    function applyClasses() {
      const root = document.documentElement;
      root.classList.toggle('plain-font', !!settings.plainFont);
      root.classList.toggle('large-controls', !!settings.largeControls);
      root.classList.toggle('high-contrast', !!settings.highContrast);
    }
    applyClasses();
    fields.forEach(field => field.addEventListener('change', () => {
      const key = field.dataset.setting;
      settings[key] = field.type === 'checkbox' ? (field.dataset.invert ? !field.checked : field.checked)
        : key === 'theme' ? field.value : Number(field.value);
      applyClasses(); apply();
    }));
    document.getElementById('accessibility-toggle').addEventListener('click', () => {
      if (dialog.open) return;
      fields.forEach(field => {
        const value = settings[field.dataset.setting];
        if (field.type === 'checkbox') field.checked = field.dataset.invert ? !value : !!value;
        else field.value = String(value);
      });
      deviceNote(); pause(); dialog.showModal(); dialog.scrollTop = 0;
    });
    document.getElementById('accessibility-close').addEventListener('click', () => dialog.close());
    document.getElementById('accessibility-done').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      resume();
      document.getElementById('accessibility-toggle').focus();
    });
    // Ignore held Escape so it cannot also dismiss the screen below the dialog.
    dialog.addEventListener('cancel', event => {
      event.preventDefault(); dialog.close();
    });
  }
  return { init, isOpen: () => !!(dialog && dialog.open) };
})();
