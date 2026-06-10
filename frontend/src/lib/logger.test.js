import { describe, it, expect, vi } from "vitest";
import { createLogger, formatLine, LEVELS } from "./logger";

describe("formatLine", () => {
  it("formats a line with time, padded level, tag, and message", () => {
    const fixed = new Date("2026-06-10T12:34:56.789Z");
    expect(formatLine("info", "auth", "signed in", fixed)).toBe(
      "12:34:56.789 INFO  [auth] signed in"
    );
  });

  it("pads short level names to a consistent width", () => {
    const fixed = new Date("2026-06-10T00:00:00.000Z");
    const warn = formatLine("warn", "t", "m", fixed);
    const error = formatLine("error", "t", "m", fixed);
    // "WARN " (padded) and "ERROR" both occupy 5 chars before the tag.
    expect(warn).toContain("WARN  [t]");
    expect(error).toContain("ERROR [t]");
  });
});

describe("createLogger", () => {
  function makeSink() {
    return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  }

  it("routes each level to the matching console method", () => {
    const sink = makeSink();
    const log = createLogger({ level: "debug", console: sink });
    log.debug("t", "d");
    log.info("t", "i");
    log.warn("t", "w");
    log.error("t", "e");
    expect(sink.debug).toHaveBeenCalledOnce();
    expect(sink.info).toHaveBeenCalledOnce();
    expect(sink.warn).toHaveBeenCalledOnce();
    expect(sink.error).toHaveBeenCalledOnce();
  });

  it("drops messages below the active level", () => {
    const sink = makeSink();
    const log = createLogger({ level: "warn", console: sink });
    log.debug("t", "nope");
    log.info("t", "nope");
    log.warn("t", "yes");
    expect(sink.debug).not.toHaveBeenCalled();
    expect(sink.info).not.toHaveBeenCalled();
    expect(sink.warn).toHaveBeenCalledOnce();
  });

  it("passes structured data through as a second argument", () => {
    const sink = makeSink();
    const log = createLogger({ level: "info", console: sink });
    const data = { uid: "abc" };
    log.info("auth", "signed in", data);
    expect(sink.info).toHaveBeenCalledWith(expect.stringContaining("[auth] signed in"), data);
  });

  it("setLevel changes the threshold and rejects unknown levels", () => {
    const sink = makeSink();
    const log = createLogger({ level: "error", console: sink });
    log.info("t", "before"); // dropped
    log.setLevel("info");
    log.info("t", "after"); // emitted
    expect(sink.info).toHaveBeenCalledOnce();
    expect(() => log.setLevel("bogus")).toThrow();
  });

  it("exposes the four expected levels in order", () => {
    expect(LEVELS.debug).toBeLessThan(LEVELS.info);
    expect(LEVELS.info).toBeLessThan(LEVELS.warn);
    expect(LEVELS.warn).toBeLessThan(LEVELS.error);
  });
});
