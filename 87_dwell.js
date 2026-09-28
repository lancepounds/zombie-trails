/* Pointer dwell: one activation per deliberate visit, using normal control handlers. */
'use strict';
ZT.Dwell = (function () {
  let settings, indicator, picker, toggle;
  let active = null, blocked = null, frame = null, paused = false;
  let x = -1, y = -1, started = 0, source = null;
  const delays = [800, 1200, 1800, 2500];
  function inside(rect) { return rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom; }
  function area(target) {
    return (target.matches('input[type="checkbox"]') && target.labels.length ? target.labels[0] : target).getBoundingClientRect();
  }
  function targetAt(node) {
    if (!node || !node.closest) return null;
    const label = node.closest('label');
    const target = label && label.control ? label.control : node.closest('button, input[type="checkbox"], select, summary');
    if (!target || target.matches(':disabled, [aria-disabled="true"]') || target.closest('[inert], [data-no-dwell], .scav [data-k]')) return null;
    if (target.matches('input:not([type="checkbox"])')) return null;
    if (paused && target !== toggle) return null;
    const modal = picker.open ? picker : document.getElementById('accessibility-menu');
    if (modal && modal.open && !modal.contains(target)) return null;
    return target;
  }
  function cancel() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (active) active.classList.remove('dwell-target');
    active = null;
    if (indicator) indicator.hidden = true;
  }
  function interrupt() {
    if (active) blocked = area(active);
    cancel();
  }
  function openChoices(select) {
    source = select;
    picker.replaceChildren();
    const heading = document.createElement('h1');
    heading.id = 'dwell-choice-title';
    heading.textContent = select.labels.length ? select.labels[0].textContent.trim() : 'Choose an option';
    // Label text may include all native option labels; use the field's caption.
    const caption = select.closest('label')?.querySelector('span');
    if (caption) heading.textContent = caption.textContent;
    else if (select.labels.length) heading.textContent = [...select.labels[0].childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim() || 'Choose an option';
    picker.appendChild(heading);
    for (const option of select.options) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'dwell-choice theme-toggle';
      button.textContent = option.textContent + (option.selected ? ' (selected)' : '');
      button.disabled = option.disabled || !!option.closest('optgroup[disabled]');
      button.addEventListener('click', () => {
        if (select.isConnected && !select.disabled) {
          const changed = select.value !== option.value;
          select.value = option.value;
          if (changed) {
            select.dispatchEvent(new Event('input', { bubbles: true }));
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        picker.close();
      });
      picker.appendChild(button);
    }
    const back = document.createElement('button');
    back.type = 'button'; back.className = 'theme-toggle'; back.textContent = 'Cancel';
    back.addEventListener('click', () => picker.close()); picker.appendChild(back);
    picker.showModal();
  }
  function tick(now) {
    frame = null;
    if (!settings.dwell || document.hidden || !active || !active.isConnected || targetAt(document.elementFromPoint(x, y)) !== active) { cancel(); return; }
    const elapsed = now - started;
    const delay = delays.includes(settings.dwellDelay) ? settings.dwellDelay : 1200;
    indicator.style.setProperty('--dwell-progress', Math.min(1, elapsed / delay));
    indicator.textContent = Math.max(0, (delay - elapsed) / 1000).toFixed(1) + 's';
    if (elapsed >= delay) {
      const target = active;
      blocked = area(target);
      cancel();
      if (target.tagName === 'SELECT') openChoices(target);
      else { target.focus({ preventScroll: true }); target.click(); }
      return;
    }
    frame = requestAnimationFrame(tick);
  }
  function move(event) {
    if (event.pointerType === 'touch') { interrupt(); return; }
    x = event.clientX; y = event.clientY;
    if (!settings.dwell || event.buttons || document.hidden) { interrupt(); return; }
    // Retain the old control's footprint after a screen change. A new button
    // appearing under a resting pointer must never start another selection.
    if (blocked) { if (inside(blocked)) return; blocked = null; }
    const target = targetAt(document.elementFromPoint(x, y));
    if (target === active) return; // tolerate small movements within a control
    cancel();
    if (!target) return;
    active = target; started = performance.now();
    active.classList.add('dwell-target');
    // A modal is in the browser's top layer, so the countdown belongs there too.
    (target.closest('dialog') || document.body).appendChild(indicator);
    indicator.style.left = Math.max(4, Math.min(x + 16, window.innerWidth - 88)) + 'px';
    indicator.style.top = Math.max(4, Math.min(y + 18, window.innerHeight - 40)) + 'px';
    indicator.style.setProperty('--dwell-progress', 0);
    indicator.textContent = ''; indicator.hidden = false;
    frame = requestAnimationFrame(tick);
  }
  function refresh() {
    if (!settings) return;
    interrupt();
    if (!settings.dwell) paused = false;
    toggle.hidden = !settings.dwell;
    toggle.textContent = paused ? 'Resume dwell' : 'Pause dwell';
    toggle.setAttribute('aria-label', paused ? 'Resume dwell to tap' : 'Pause dwell to tap');
  }
  function init(preferences) {
    settings = preferences;
    indicator = document.createElement('div');
    indicator.className = 'dwell-countdown'; indicator.hidden = true;
    indicator.setAttribute('aria-hidden', 'true'); document.body.appendChild(indicator);
    picker = document.createElement('dialog');
    picker.className = 'accessibility-menu dwell-options'; picker.id = 'dwell-options';
    picker.setAttribute('aria-labelledby', 'dwell-choice-title'); document.body.appendChild(picker);
    picker.addEventListener('close', () => {
      interrupt();
      (source?.isConnected ? source : document.getElementById('accessibility-toggle')).focus({ preventScroll: true });
      source = null;
    });
    toggle = document.getElementById('dwell-toggle');
    toggle.addEventListener('click', () => { paused = !paused; refresh(); });
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerdown', event => {
      const target = targetAt(event.target);
      if (target) blocked = area(target);
      interrupt();
    }, true);
    document.addEventListener('click', interrupt, true);
    document.addEventListener('keydown', interrupt, true);
    document.addEventListener('scroll', interrupt, true);
    document.addEventListener('pointerout', event => { if (!event.relatedTarget) interrupt(); });
    document.addEventListener('pointercancel', interrupt);
    document.addEventListener('visibilitychange', interrupt);
    window.addEventListener('blur', interrupt);
    window.addEventListener('resize', interrupt);
    refresh();
  }
  return { init, refresh, isChoosing: () => !!(picker && picker.open) };
})();
