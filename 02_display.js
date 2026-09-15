/* Shared monochrome palettes. Display preferences never alter the journey. */
'use strict';
ZT.Display = {
  mode: 'light',
  themes: {
    light: { paper: '#e8e8e8', well: '#d8d8d8', ink: '#181818', muted: '#505050', dim: '#686868', rule: '#b0b0b0' },
    dark: { paper: '#181818', well: '#202020', ink: '#e8e8e8', muted: '#b8b8b8', dim: '#a0a0a0', rule: '#505050' },
  },
  setTheme(mode) { this.mode = Object.hasOwn(this.themes, mode) ? mode : 'light'; },
  palette() { return this.themes[this.mode]; },
};
