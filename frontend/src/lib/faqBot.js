/**
 * faqBot.js — the scripted FAQ chatbot's brain (no AI, no network).
 *
 * A small knowledge base of NS-related Q&A plus a pure keyword matcher. Keeping
 * the data and the matching logic here (separate from the chat UI) means the
 * matcher is trivially unit-testable and the bot works fully offline — safe for
 * a live demo with no internet.
 *
 * matchFaq(text) -> the best-matching FAQ entry, or null if nothing scores.
 */

// Each entry: a stable id, the quick-reply label shown as a button, an array of
// lowercase keywords used for matching, and the answer text.
export const FAQS = Object.freeze([
  {
    id: "ippt",
    label: "How does IPPT scoring work?",
    keywords: ["ippt", "score", "scoring", "points", "pushup", "push-up", "situp", "sit-up", "run", "2.4"],
    answer:
      "IPPT has 3 stations: push-ups, sit-ups, and the 2.4km run. Each is scored out of " +
      "the max for your age group; 85+ total is Gold, 75+ Silver, 61+ Pass. Open the " +
      "Training tab to log a session and track your stats.",
  },
  {
    id: "ord",
    label: "When is my ORD?",
    keywords: ["ord", "days left", "countdown", "operationally", "left", "when"],
    answer:
      "Your ORD countdown lives on the Journal page — the green plate shows how many " +
      "days you have left. It updates as the date approaches. Almost there, soldier!",
  },
  {
    id: "training",
    label: "How do I start a training session?",
    keywords: ["training", "session", "workout", "exercise", "start", "begin"],
    answer:
      "Go to the Training tab and pick a mode (Form Training, PACER, EMOM, etc.). The " +
      "live session screen uses your webcam for on-device form analysis — nothing leaves " +
      "your device.",
  },
  {
    id: "journal",
    label: "What is the Journal for?",
    keywords: ["journal", "memory", "memories", "diary", "photo", "scrapbook", "ai image"],
    answer:
      "The Journal is your NS scrapbook. Write a memory and the app can generate a matching " +
      "illustration to paste into the page. Finished journals can be shared as a read-only link.",
  },
  {
    id: "avatar",
    label: "How do I customise my avatar?",
    keywords: ["avatar", "customise", "customize", "profile", "loadout", "clothes", "outfit", "shop", "xp"],
    answer:
      "Open the Profile tab, then Customise. Swap tops, bottoms, shoes, and accessories. " +
      "Earn XP from training to unlock more items in the shop.",
  },
  {
    id: "theme",
    label: "Can I change the app's theme?",
    keywords: ["theme", "dark", "light", "mode", "colour", "color", "appearance"],
    answer:
      "Yes — use the sun/moon button in the top bar to switch between dark and light mode. " +
      "Your choice is remembered next time you open the app.",
  },
  {
    id: "notifications",
    label: "How do I enable reminders?",
    keywords: ["notification", "notifications", "reminder", "reminders", "push", "alert"],
    answer:
      "Enable push notifications from the button in Settings/Profile. You'll get reminders " +
      "for training and events. You can turn them off again any time.",
  },
]);

// A friendly default when nothing matches — also points the user at the buttons.
export const FALLBACK_ANSWER =
  "I'm not sure about that one yet — I'm a simple FAQ helper. Try one of the quick " +
  "questions below, or ask about IPPT, training, your journal, ORD, or your avatar.";

export const GREETING =
  "Hi! I'm your NS buddy bot. Ask me a question, or tap one of these:";

// Split text into lowercase word tokens, stripping punctuation.
function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9.\- ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Score how well a query matches an FAQ entry: +1 per keyword found in the text.
 * Multi-word keywords (e.g. "push-up") are matched as substrings; single words
 * match against tokens so "run" doesn't match "running errands" spuriously via
 * substring, but DOES match the token "run".
 */
export function scoreFaq(faq, text) {
  const lc = (text || "").toLowerCase();
  const tokens = new Set(tokenize(text));
  let score = 0;
  for (const kw of faq.keywords) {
    if (kw.includes(" ") || kw.includes("-") || kw.includes(".")) {
      if (lc.includes(kw)) score += 1;
    } else if (tokens.has(kw)) {
      score += 1;
    }
  }
  return score;
}

/**
 * Return the best-matching FAQ for a free-text question, or null if nothing
 * scores above zero. Ties are broken by FAQ order (first wins).
 */
export function matchFaq(text) {
  let best = null;
  let bestScore = 0;
  for (const faq of FAQS) {
    const score = scoreFaq(faq, text);
    if (score > bestScore) {
      best = faq;
      bestScore = score;
    }
  }
  return best;
}

/** Look up an FAQ by id (used by the quick-reply buttons). */
export function faqById(id) {
  return FAQS.find((f) => f.id === id) ?? null;
}
