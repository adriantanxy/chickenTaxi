/**
 * firstRun.js — per-user "have they seen this yet?" flags in localStorage.
 *
 * Used by the onboarding tour so it shows once per user and never again. Keyed by
 * uid so different accounts on the same browser get their own state. All access
 * is guarded so private-mode / disabled storage degrades gracefully (treated as
 * "not seen", which just means the tour may show again — never an error).
 */
import { logger } from "./logger";

const tourKey = (uid) => `wgt-tour-seen:${uid || "anon"}`;

export function hasSeenTour(uid) {
  try {
    return window.localStorage.getItem(tourKey(uid)) === "true";
  } catch {
    return false;
  }
}

export function markTourSeen(uid) {
  try {
    window.localStorage.setItem(tourKey(uid), "true");
    logger.info("onboarding", "tour marked seen", { uid });
  } catch {
    logger.warn("onboarding", "could not persist tour-seen flag");
  }
}

// Test/dev helper: clear the flag so the tour shows again.
export function resetTour(uid) {
  try {
    window.localStorage.removeItem(tourKey(uid));
  } catch {
    // ignore
  }
}
