import { describe, it, expect, vi, beforeEach } from "vitest";
import { tourController } from "./tourController";

describe("tourController", () => {
  beforeEach(() => {
    tourController._clear();
  });

  it("notifies subscribers when start() is called", () => {
    const fn = vi.fn();
    tourController.subscribe(fn);
    tourController.start();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("notifies every subscriber", () => {
    const a = vi.fn();
    const b = vi.fn();
    tourController.subscribe(a);
    tourController.subscribe(b);
    tourController.start();
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it("stops notifying after unsubscribe", () => {
    const fn = vi.fn();
    const off = tourController.subscribe(fn);
    off();
    tourController.start();
    expect(fn).not.toHaveBeenCalled();
  });

  it("does nothing (no throw) when there are no subscribers", () => {
    expect(() => tourController.start()).not.toThrow();
  });
});
