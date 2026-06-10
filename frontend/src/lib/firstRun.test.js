import { describe, it, expect, beforeEach } from "vitest";
import { hasSeenTour, markTourSeen, resetTour } from "./firstRun";

describe("firstRun tour flags", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reports not-seen for a fresh user", () => {
    expect(hasSeenTour("user-1")).toBe(false);
  });

  it("reports seen after marking", () => {
    markTourSeen("user-1");
    expect(hasSeenTour("user-1")).toBe(true);
  });

  it("keeps flags separate per user", () => {
    markTourSeen("user-1");
    expect(hasSeenTour("user-1")).toBe(true);
    expect(hasSeenTour("user-2")).toBe(false);
  });

  it("resetTour clears the flag so the tour can show again", () => {
    markTourSeen("user-1");
    resetTour("user-1");
    expect(hasSeenTour("user-1")).toBe(false);
  });

  it("treats a missing uid as the 'anon' bucket without throwing", () => {
    expect(hasSeenTour(undefined)).toBe(false);
    markTourSeen(undefined);
    expect(hasSeenTour(undefined)).toBe(true);
  });
});
