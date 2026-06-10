/**
 * ThemeToggle.jsx — the sun/moon button that flips dark <-> light.
 * Styled to match the app's gold-on-green header controls.
 */
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { C } from "../theme";
import { logger } from "../lib/logger";

export function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const onClick = () => {
    logger.info("theme", `toggle pressed (was ${theme})`);
    toggleTheme();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      data-tour="theme-toggle"
      className={`wgt-press flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${className}`}
      style={{ background: C.green, color: C.textGold, border: `1px solid ${C.gold}66` }}
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
