/**
 * ChatBot.jsx — a floating, scripted FAQ assistant.
 *
 * A launcher button (bottom-right) opens a chat panel. The user can type a
 * question or tap a suggested question; answers come from the offline FAQ
 * knowledge base in lib/faqBot.js, so it works with no network and never fails
 * in a demo.
 *
 * Suggestions are kept tidy: they show once under the greeting, and afterwards
 * collapse behind a single "Suggested questions" toggle so the conversation
 * thread stays clean instead of repeating every chip after each message.
 *
 * The bot can also kick off the app tour: a built-in "Show me around" action
 * (and typed phrases like "give me a tour") call tourController.start().
 *
 * Mounted once inside AppShell so it floats over every signed-in page.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Compass, MessageCircle, Send, X } from "lucide-react";
import { C, pixel } from "../theme";
import { FAQS, FALLBACK_ANSWER, GREETING, faqById, matchFaq } from "../lib/faqBot";
import { tourController } from "../lib/tourController";
import { logger } from "../lib/logger";

let nextId = 1;
const mkMsg = (from, text) => ({ id: nextId++, from, text });

// Phrases that should launch the guided tour rather than return an FAQ answer.
const TOUR_RE = /\b(tour|show me around|walk ?through|how do i use|getting started|onboarding|guide me)\b/i;

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(() => [mkMsg("bot", GREETING)]);
  // Suggestions are expanded at the very start; once the user interacts they
  // collapse to a single toggle to keep the thread uncluttered.
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const scrollRef = useRef(null);

  // Keep the latest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, showSuggestions]);

  function pushExchange(userText, botText) {
    setMessages((prev) => [...prev, mkMsg("user", userText), mkMsg("bot", botText)]);
  }

  function afterInteraction() {
    setHasInteracted(true);
    setShowSuggestions(false);
  }

  function startTour(label) {
    logger.info("chatbot", "tour requested from chat");
    setMessages((prev) => [
      ...prev,
      mkMsg("user", label),
      mkMsg("bot", "Sure — starting the tour now. Watch the highlights!"),
    ]);
    afterInteraction();
    setOpen(false); // get the panel out of the way so the tour is visible
    tourController.start();
  }

  function answerFor(text) {
    const faq = matchFaq(text);
    if (faq) {
      logger.info("chatbot", `matched FAQ "${faq.id}"`, { query: text });
      return faq.answer;
    }
    logger.warn("chatbot", "no FAQ match", { query: text });
    return FALLBACK_ANSWER;
  }

  function onSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    if (TOUR_RE.test(text)) {
      startTour(text);
      return;
    }
    pushExchange(text, answerFor(text));
    afterInteraction();
  }

  function onQuickReply(faqId) {
    const faq = faqById(faqId);
    if (!faq) return;
    logger.info("chatbot", `quick reply "${faq.id}"`);
    pushExchange(faq.label, faq.answer);
    afterInteraction();
  }

  // The suggestions block: the "Show me around" tour action first, then the FAQ
  // chips. Reused whether expanded at the start or revealed via the toggle.
  const suggestions = (
    <div className="mt-3 flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => startTour("Show me around the app")}
        className="wgt-press flex items-center gap-2 rounded-lg px-3 py-1.5 text-left"
        style={{ background: C.green, color: C.textGold, border: `1px solid ${C.gold}66` }}
      >
        <Compass size={16} />
        <span style={pixel} className="text-[16px]">Show me around the app</span>
      </button>
      {FAQS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onQuickReply(f.id)}
          className="wgt-press rounded-lg px-3 py-1.5 text-left"
          style={{ background: C.cardLight, color: C.textDark, border: `1px solid ${C.line}66` }}
        >
          <span style={pixel} className="text-[16px]">{f.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            logger.info("chatbot", "opened");
          }}
          aria-label="Open NS buddy chat"
          data-tour="chatbot"
          className="wgt-press fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: C.green,
            color: C.textGold,
            border: `2px solid ${C.gold}aa`,
            boxShadow: "0 8px 22px #00000066",
          }}
        >
          <MessageCircle size={26} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="NS buddy chat"
          className="fixed bottom-5 right-5 z-40 flex w-[min(92vw,360px)] flex-col overflow-hidden rounded-xl"
          style={{
            height: "min(70vh, 520px)",
            background: C.bgHeader,
            border: `1px solid ${C.line}55`,
            boxShadow: "0 18px 50px #00000070",
          }}
        >
          {/* Header */}
          <div
            className="flex shrink-0 items-center justify-between gap-2 px-4 py-3"
            style={{ background: C.green, color: C.textGold, borderBottom: `1px solid ${C.gold}44` }}
          >
            <span style={pixel} className="flex items-center gap-2 text-[22px]">
              <MessageCircle size={20} /> NS BUDDY
            </span>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logger.info("chatbot", "closed");
              }}
              aria-label="Close chat"
              className="wgt-press flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ color: C.textGold }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
            <div className="flex flex-col gap-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${m.from === "user" ? "self-end" : "self-start"}`}
                  style={
                    m.from === "user"
                      ? { background: C.green, color: C.textGold }
                      : { background: C.cardInner, color: C.textDark }
                  }
                >
                  <span style={pixel} className="text-[17px] leading-snug">
                    {m.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Suggestions: shown inline at the start; afterwards behind a toggle. */}
            {showSuggestions ? (
              <>
                {hasInteracted && (
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(false)}
                    className="mt-3 flex items-center gap-1 text-left"
                    style={{ ...pixel, color: C.textMuted }}
                  >
                    <ChevronUp size={16} />
                    <span className="text-[15px]">Hide suggestions</span>
                  </button>
                )}
                {suggestions}
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowSuggestions(true)}
                className="mt-3 flex items-center gap-1 text-left"
                style={{ ...pixel, color: C.textMuted }}
              >
                <ChevronDown size={16} />
                <span className="text-[15px]">Suggested questions</span>
              </button>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={onSubmit}
            className="flex shrink-0 items-center gap-2 px-3 py-3"
            style={{ borderTop: `1px solid ${C.line}33` }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              aria-label="Type your question"
              className="wgt-input flex-1"
            />
            <button
              type="submit"
              aria-label="Send"
              className="wgt-press flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ background: C.green, color: C.textGold, border: `1px solid ${C.gold}66` }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
