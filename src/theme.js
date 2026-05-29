/**
 * theme.js — the single source of truth for colours + the pixel font.
 * Change a value here and every page updates. (Pulled from the Figma file.)
 */
export const C = {
  bgDark:   "#181911", // main content background
  bgHeader: "#2a2620", // header / dark panels
  sidebar:  "#1a1811",
  cardLight:"#ddbe98", // sepia card
  cardStat: "#d5bd9b",
  cardInner:"#e7d2b0", // inner cells inside a card
  gold:     "#cca661", // big titles
  textGold: "#ddc397", // light text on dark
  textMuted:"#a69980",
  textDark: "#3a2f1c", // text on sepia cards
  green:    "#3d4a2a", // buttons / accents
  greenLit: "#4d5c34", // hover/active green
  line:     "#807359",
  ink:      "#3a2f1c", // dark text on sepia (alias of textDark)
  inkSoft:  "#6b5c3e", // muted text on sepia
};

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
  unit: "PLATOON ALPHA 3-1",
  ordDays: 143,
};
