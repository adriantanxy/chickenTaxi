/**
 * theme.js — the single source of truth for colours + the pixel font.
 *
 * Colours are now THEME-AWARE. Each entry in `C` resolves to a CSS custom
 * property (e.g. `var(--c-bgDark)`), and the actual hex values live per-theme in
 * THEMES below. Switching the document's `data-theme` attribute (done by the
 * ThemeProvider) repaints every component instantly, because their inline styles
 * point at the variables rather than baked-in hex.
 *
 * Existing components keep using `C.bgDark`, `C.gold`, etc. unchanged — they just
 * became live-swappable.
 */

// ---- Palettes --------------------------------------------------------------
// "dark" is the original sepia-on-charcoal field look (unchanged values).
// "light" is a complementary parchment/daylight variant: warm paper canvas,
// the same green/gold accents tuned for contrast on a light background.
export const THEMES = Object.freeze({
  dark: {
    bgDark: "#181911", // main content background
    bgHeader: "#2a2620", // header / dark panels
    sidebar: "#1a1811",
    cardLight: "#ddbe98", // sepia card
    cardStat: "#d5bd9b",
    cardInner: "#e7d2b0", // inner cells inside a card
    gold: "#cca661", // big titles
    textGold: "#ddc397", // light text on dark
    textMuted: "#a69980",
    textDark: "#3a2f1c", // text on sepia cards
    green: "#3d4a2a", // buttons / accents
    greenLit: "#4d5c34", // hover/active green
    line: "#807359",
    ink: "#3a2f1c", // dark text on sepia (alias of textDark)
    inkSoft: "#6b5c3e", // muted text on sepia
  },
  light: {
    bgDark: "#efe4cf", // warm parchment canvas
    bgHeader: "#e3d2b0", // header band — slightly deeper paper
    sidebar: "#e7d7b8",
    cardLight: "#f6ecd6", // bright card surface
    cardStat: "#f1e6cd",
    cardInner: "#fbf4e4", // inner cells inside a card
    gold: "#9c7b34", // darker gold so titles read on light
    textGold: "#4a3a1c", // primary text on light panels
    textMuted: "#8a7a55", // muted text
    textDark: "#3a2f1c", // text on cards (still dark ink)
    green: "#46562f", // accent green, a touch lighter
    greenLit: "#566a39",
    line: "#b9a37f",
    ink: "#3a2f1c",
    inkSoft: "#6b5c3e",
  },
});

export const THEME_NAMES = Object.freeze(Object.keys(THEMES));
export const DEFAULT_THEME = "dark";

// kebab-case the camelCase keys for the CSS variable names: bgDark -> --c-bg-dark.
function cssVarName(key) {
  return "--c-" + key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

/**
 * Produce the `{ "--c-...": "#hex" }` map for a theme. The ThemeProvider writes
 * these onto the document root; exported so it (and tests) share one converter.
 */
export function themeVars(themeName) {
  const palette = THEMES[themeName] ?? THEMES[DEFAULT_THEME];
  const vars = {};
  for (const [key, hex] of Object.entries(palette)) {
    vars[cssVarName(key)] = hex;
  }
  return vars;
}

// `C` keys now resolve to the live CSS variable. Same keys as before, so every
// `style={{ background: C.green }}` etc. keeps working and becomes theme-aware.
// A fallback to the dark hex keeps colours sane if the variables ever fail to
// load (e.g. a unit-test render with no document styles).
const buildC = () => {
  const out = {};
  for (const key of Object.keys(THEMES[DEFAULT_THEME])) {
    out[key] = `var(${cssVarName(key)}, ${THEMES[DEFAULT_THEME][key]})`;
  }
  return out;
};

export const C = Object.freeze(buildC());

// VT323 must be loaded once (see index.html / App). Use: style={pixel}
export const pixel = { fontFamily: "'VT323', monospace" };

// Shared text-colour shortcuts for content sitting on sepia cards.
// D = primary dark ink, M = muted ink. Spread alongside `pixel`.
export const D = { color: C.ink };
export const M = { color: C.inkSoft };

// The signed-in soldier. Single source of truth — pages import this instead of
// each re-declaring their own copy.
export const USER = {
  name: "RECRUIT ALEX",
  unit: "ALPHA 1-1",
  ordDays: 143,
};
