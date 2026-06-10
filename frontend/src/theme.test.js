import { describe, it, expect } from "vitest";
import { C, DEFAULT_THEME, THEME_NAMES, THEMES, themeVars } from "./theme";

describe("themeVars", () => {
  it("converts camelCase palette keys into --c-kebab-case CSS vars", () => {
    const vars = themeVars("dark");
    expect(vars["--c-bg-dark"]).toBe(THEMES.dark.bgDark);
    expect(vars["--c-text-gold"]).toBe(THEMES.dark.textGold);
    expect(vars["--c-green-lit"]).toBe(THEMES.dark.greenLit);
  });

  it("produces a variable for every palette key", () => {
    const keys = Object.keys(THEMES.dark);
    const vars = themeVars("dark");
    expect(Object.keys(vars)).toHaveLength(keys.length);
  });

  it("falls back to the default theme for an unknown name", () => {
    expect(themeVars("nonsense")).toEqual(themeVars(DEFAULT_THEME));
  });

  it("dark and light produce different values for the same key", () => {
    expect(themeVars("dark")["--c-bg-dark"]).not.toBe(themeVars("light")["--c-bg-dark"]);
  });
});

describe("C palette accessor", () => {
  it("maps keys to var() references with a fallback", () => {
    expect(C.green).toBe(`var(--c-green, ${THEMES.dark.green})`);
    expect(C.bgDark).toBe(`var(--c-bg-dark, ${THEMES.dark.bgDark})`);
  });

  it("covers every dark-theme key", () => {
    for (const key of Object.keys(THEMES.dark)) {
      expect(C[key]).toBeDefined();
    }
  });
});

describe("theme registry", () => {
  it("exposes dark and light themes", () => {
    expect(THEME_NAMES).toContain("dark");
    expect(THEME_NAMES).toContain("light");
  });

  it("both themes define the same set of keys", () => {
    expect(Object.keys(THEMES.light).sort()).toEqual(Object.keys(THEMES.dark).sort());
  });
});
