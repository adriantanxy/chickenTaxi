/**
 * OnboardingTour.jsx — a first-run guided tour with coachmarks.
 *
 * Highlights real UI elements (located by their `data-tour` attribute) one at a
 * time with a tooltip card and Next/Back/Skip controls. A dimmed backdrop with a
 * "spotlight" cutout draws the eye to the current target. Steps without a target
 * (welcome / wrap-up) render as a centred card.
 *
 * It runs in two ways:
 *  - automatically the first time a user signs in (tracked via lib/firstRun.js)
 *  - on demand, when something calls tourController.start() — e.g. the chatbot
 *    when the user asks for a tour. On-demand runs ignore the "seen" flag.
 *
 * Robustness for a live demo:
 *  - If a step's target element isn't on screen, that step is skipped instead of
 *    breaking the tour.
 *  - Positions recompute on resize/scroll.
 *  - Esc or "Skip" ends the tour and marks it seen.
 */
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { C, pixel } from "../theme";
import { hasSeenTour, markTourSeen } from "../lib/firstRun";
import { tourController } from "../lib/tourController";
import { logger } from "../lib/logger";

// Each step optionally points at a `data-tour` target. A step with no target is
// shown as a centred card (used for the welcome and wrap-up). Order = tour order.
export const TOUR_STEPS = Object.freeze([
  {
    target: null,
    title: "Welcome, soldier!",
    body: "This is Where Got Time — your NS companion. Let me give you a quick 60-second tour of the essentials.",
  },
  {
    target: "sidebar-nav",
    title: "Your main menu",
    body: "Everything lives here. Use this sidebar to move between the main sections of the app.",
  },
  {
    target: "nav-training",
    title: "Training",
    body: "Log workouts and run live training sessions. The session screen even checks your form using your webcam — all on-device.",
  },
  {
    target: "nav-journal",
    title: "Journal",
    body: "Your NS scrapbook. Write memories, generate matching illustrations, and watch your ORD countdown tick down.",
  },
  {
    target: "nav-profile",
    title: "Profile & avatar",
    body: "Customise your soldier avatar, spend XP in the shop, and manage your account here.",
  },
  {
    target: "theme-toggle",
    title: "Dark or light",
    body: "Tap here any time to switch between dark and light mode. We'll remember your pick.",
  },
  {
    target: "chatbot",
    title: "Your NS buddy bot",
    body: "Stuck on something? Ask the buddy bot about IPPT, training, your journal, and more. You can replay this tour from here too!",
  },
  {
    target: null,
    title: "You're all set!",
    body: "That's the tour. Jump in and explore — and tap the buddy bot any time you need a hand. Hooyah!",
  },
]);

const PADDING = 8; // spotlight padding around the target
const GAP = 12; // gap between target and tooltip
const TOOLTIP_W = 300;

function getRect(target) {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // Treat zero-size / off-screen elements as absent (e.g. sidebar hidden on mobile).
  if (r.width === 0 && r.height === 0) return null;
  return r;
}

// A step is "showable" if it has no target (centred card) or its target exists.
function stepShowable(step) {
  return !step.target || Boolean(getRect(step.target));
}

export function OnboardingTour({ uid }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const begin = useCallback(
    (source) => {
      setActive(true);
      setStepIndex(0);
      logger.info("onboarding", `tour started (${source})`, { uid });
    },
    [uid]
  );

  // Auto-run once for brand-new users, shortly after mount so targets exist.
  useEffect(() => {
    if (hasSeenTour(uid)) return undefined;
    const t = setTimeout(() => begin("first-run"), 600);
    return () => clearTimeout(t);
  }, [uid, begin]);

  // On-demand: let the chatbot (or anything) start the tour, ignoring the flag.
  useEffect(() => tourController.subscribe(() => begin("on-demand")), [begin]);

  const finish = useCallback(
    (reason) => {
      setActive(false);
      markTourSeen(uid);
      logger.info("onboarding", `tour ended (${reason})`, { uid });
    },
    [uid]
  );

  // Find the next showable step from `from` (inclusive); -1 if none remain.
  const findValidStep = useCallback((from) => {
    for (let i = from; i < TOUR_STEPS.length; i += 1) {
      if (stepShowable(TOUR_STEPS[i])) return i;
    }
    return -1;
  }, []);

  // When activating, snap to the first showable step.
  useEffect(() => {
    if (!active) return;
    const first = findValidStep(0);
    if (first === -1) finish("no-targets");
    else setStepIndex(first);
  }, [active, findValidStep, finish]);

  // Measure the current target (null for centred steps); recompute on resize/scroll.
  useLayoutEffect(() => {
    if (!active) return undefined;
    const step = TOUR_STEPS[stepIndex];
    if (!step) return undefined;

    const measure = () => setRect(step.target ? getRect(step.target) : null);
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, stepIndex]);

  // Esc ends the tour.
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") finish("escape");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, finish]);

  if (!active) return null;

  const step = TOUR_STEPS[stepIndex];
  if (!step) return null;
  const isCentred = !step.target;
  // A targeted step needs its rect measured before we can position; centred
  // steps render immediately.
  if (!isCentred && !rect) return null;

  const isLast = findValidStep(stepIndex + 1) === -1;
  const hasBack = (() => {
    for (let i = stepIndex - 1; i >= 0; i -= 1) {
      if (stepShowable(TOUR_STEPS[i])) return true;
    }
    return false;
  })();

  const goNext = () => {
    const next = findValidStep(stepIndex + 1);
    if (next === -1) finish("completed");
    else setStepIndex(next);
  };
  const goBack = () => {
    for (let i = stepIndex - 1; i >= 0; i -= 1) {
      if (stepShowable(TOUR_STEPS[i])) {
        setStepIndex(i);
        return;
      }
    }
  };

  // Spotlight + tooltip placement. Centred steps dim the whole screen and put
  // the card in the middle; targeted steps cut a spotlight and anchor nearby.
  const spot = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  let tooltipStyle;
  if (isCentred) {
    tooltipStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  } else {
    const clampedLeft = Math.max(12, Math.min(rect.left, window.innerWidth - TOOLTIP_W - 12));
    const placeBelow = rect.bottom + GAP + 170 < window.innerHeight;
    tooltipStyle = placeBelow
      ? { top: rect.bottom + GAP, left: clampedLeft }
      : { bottom: window.innerHeight - rect.top + GAP, left: clampedLeft };
  }

  // Progress numbering counts only showable steps so it reads cleanly even when
  // some are skipped (e.g. nav hidden on mobile).
  const showableIndexes = TOUR_STEPS.map((s, i) => (stepShowable(s) ? i : -1)).filter((i) => i >= 0);
  const current = showableIndexes.indexOf(stepIndex) + 1;
  const total = showableIndexes.length;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="App tour">
      {/* Spotlight for targeted steps, or a full dimmer for centred steps. */}
      {spot ? (
        <div
          className="absolute rounded-lg"
          style={{
            ...spot,
            boxShadow: "0 0 0 9999px #0a0905cc",
            border: `2px solid ${C.gold}`,
            transition: "all 0.2s ease",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: "#0a0905cc" }} />
      )}

      {/* Tooltip / card */}
      <div
        className="absolute rounded-xl p-4"
        style={{
          ...tooltipStyle,
          width: TOOLTIP_W,
          background: C.bgHeader,
          color: C.textGold,
          border: `1px solid ${C.gold}66`,
          boxShadow: "0 18px 50px #00000080",
        }}
      >
        <p style={pixel} className="text-[24px] leading-none">
          {step.title}
        </p>
        <p style={{ ...pixel, color: C.textMuted }} className="mt-2 text-[18px] leading-snug">
          {step.body}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => finish("skip")}
            style={{ ...pixel, color: C.textMuted }}
            className="text-[16px] underline"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            <span style={{ ...pixel, color: C.textMuted }} className="text-[15px]">
              {current}/{total}
            </span>
            {hasBack && (
              <button
                type="button"
                onClick={goBack}
                className="wgt-press rounded-lg px-3 py-1.5"
                style={{ background: C.bgDark, color: C.textGold, border: `1px solid ${C.line}66` }}
              >
                <span style={pixel} className="text-[16px]">Back</span>
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="wgt-press rounded-lg px-4 py-1.5"
              style={{ background: C.green, color: C.textGold, border: `1px solid ${C.gold}66` }}
            >
              <span style={pixel} className="text-[16px]">{isLast ? "Done" : "Next"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
