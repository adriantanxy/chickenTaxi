/**
 * logger.js — the app's single logging utility.
 *
 * Wraps the browser console with leveled, tagged, timestamped output so logs are
 * consistent and greppable across the whole app. Use it instead of bare
 * console.* calls:
 *
 *   import { logger } from "../lib/logger";
 *   logger.info("auth", "user signed in", { uid });
 *   logger.warn("chatbot", "no FAQ match", { question });
 *   logger.error("theme", "could not persist theme", err);
 *
 * Levels (low -> high): debug < info < warn < error. Anything below the current
 * level is dropped, so production can run quiet while a demo can crank it up.
 *
 * Kept dependency-free and pure(ish) so it is trivially unit-testable: the
 * console it writes to is injectable, and the formatter is exported on its own.
 */

export const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40 });

// Default threshold: show everything in dev, warnings+ in a production build.
// import.meta.env.DEV is true under `vite dev`, false in `vite build`.
const DEFAULT_LEVEL =
  typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV
    ? "debug"
    : "warn";

/**
 * Build a single log line: "12:34:56.789 INFO  [auth] user signed in".
 * Exported so tests can assert formatting without touching the console.
 */
export function formatLine(level, tag, message, now = new Date()) {
  const time = now.toISOString().slice(11, 23); // HH:MM:SS.mmm
  const label = level.toUpperCase().padEnd(5);
  return `${time} ${label} [${tag}] ${message}`;
}

/**
 * Create a logger. `console` and `level` are injectable for tests.
 * Returns an object with debug/info/warn/error methods plus setLevel/getLevel.
 */
export function createLogger({ level = DEFAULT_LEVEL, console: sink = console } = {}) {
  let threshold = LEVELS[level] ?? LEVELS.info;

  // Map our levels onto the right console method so the browser still colours
  // warnings/errors and groups them in its own filter.
  const sinkFor = {
    debug: sink.debug ? sink.debug.bind(sink) : sink.log.bind(sink),
    info: sink.info ? sink.info.bind(sink) : sink.log.bind(sink),
    warn: sink.warn ? sink.warn.bind(sink) : sink.log.bind(sink),
    error: sink.error ? sink.error.bind(sink) : sink.log.bind(sink),
  };

  function emit(lvl, tag, message, data) {
    if (LEVELS[lvl] < threshold) return; // below threshold -> dropped
    const line = formatLine(lvl, tag, message);
    // Pass structured data as a second arg so devtools keeps it inspectable
    // (rather than stringifying it into the message).
    if (data === undefined) sinkFor[lvl](line);
    else sinkFor[lvl](line, data);
  }

  return {
    debug: (tag, message, data) => emit("debug", tag, message, data),
    info: (tag, message, data) => emit("info", tag, message, data),
    warn: (tag, message, data) => emit("warn", tag, message, data),
    error: (tag, message, data) => emit("error", tag, message, data),
    setLevel(next) {
      if (LEVELS[next] === undefined) {
        throw new Error(`Unknown log level: ${next}`);
      }
      threshold = LEVELS[next];
    },
    getLevel() {
      return Object.keys(LEVELS).find((k) => LEVELS[k] === threshold);
    },
  };
}

// The shared instance the app imports everywhere.
export const logger = createLogger();
