/**
 * tourController.js — a tiny pub/sub so anything (e.g. the chatbot) can start the
 * onboarding tour on demand without prop-drilling through the app shell.
 *
 *   import { tourController } from "../lib/tourController";
 *   tourController.start();                         // request the tour to run
 *   const off = tourController.subscribe(fn);       // OnboardingTour listens
 *
 * Deliberately framework-free and synchronous — easy to unit test.
 */
const listeners = new Set();

export const tourController = {
  /** Ask the onboarding tour to start now. */
  start() {
    for (const fn of listeners) fn();
  },
  /** Register a callback; returns an unsubscribe function. */
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** Test helper: drop all listeners. */
  _clear() {
    listeners.clear();
  },
};
