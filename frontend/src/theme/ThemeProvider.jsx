/**
 * ThemeProvider.jsx — runtime dark/light theming.
 *
 * Applies a palette by writing the theme's CSS custom properties (and a
 * `data-theme` attribute) onto <html>. Because `C` in theme.js points at those
 * variables, flipping the theme repaints the whole app with no per-component
 * work. The choice is persisted to localStorage so it survives reloads.
 *
 *   const { theme, toggleTheme, setTheme } = useTheme();
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_THEME, THEME_NAMES, themeVars } from "../theme";
import { logger } from "../lib/logger";

const STORAGE_KEY = "wgt-theme";
const ThemeContext = createContext(null);

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && THEME_NAMES.includes(stored)) return stored;
  } catch {
    // private mode / disabled storage — fall through to default
  }
  return DEFAULT_THEME;
}

// Push a theme's variables onto the document root and tag it for CSS hooks.
function applyTheme(themeName) {
  const root = document.documentElement;
  const vars = themeVars(themeName);
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
  root.setAttribute("data-theme", themeName);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);

  // Apply on mount and whenever the theme changes; persist the choice.
  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      logger.warn("theme", "could not persist theme choice");
    }
    logger.info("theme", `applied theme: ${theme}`);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (next) => {
        if (!THEME_NAMES.includes(next)) {
          logger.error("theme", `ignored unknown theme: ${next}`);
          return;
        }
        setThemeState(next);
      },
      toggleTheme: () =>
        setThemeState((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error("useTheme must be used within a <ThemeProvider>");
  }
  return ctx;
}
