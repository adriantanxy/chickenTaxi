import React, { useState, useEffect, useRef } from "react";
import { X, Pen, Mail, FileText, AtSign, User, Save, Check, Sparkles } from "lucide-react";
import { C, pixel } from "../theme";
import { IMAGE_STYLES, DEFAULT_IMAGE_STYLE } from "../lib/aiMemoryImage";

// Section mates that can be @-tagged.
const SECTION_MATES = ["Hao Jie", "Wei Ming", "Rafiq", "Kavin", "Zafir", "Marcus", "Daniel", "Imran"];

// Find an active "@query" at the caret in the TAG field: an @ that starts a word,
// followed by the partial name being typed (single line). Returns the @ start
// index and the lowercased query, or null when the caret isn't in a mention.
function getActiveMention(value, caret) {
  const upto = value.slice(0, caret);
  const at = upto.lastIndexOf("@");
  if (at === -1) return null;
  if (at > 0 && !/\s/.test(upto[at - 1])) return null;
  const query = upto.slice(at + 1);
  if (/[\n]/.test(query)) return null;
  return { start: at, query: query.toLowerCase() };
}

// Field label: gilt ▸ + uppercase caption, on the green surface.
function FieldLabel({ children, hint }) {
  return (
    <div className="mb-1.5 mt-5 flex items-baseline justify-between gap-2 first:mt-0">
      <p style={{ ...pixel, color: C.gold }} className="flex items-center gap-1.5 text-[16px] uppercase tracking-[0.14em]">
        <span style={{ color: C.gold, opacity: 0.7 }}>▸</span>{children}
      </p>
      {hint && <span style={{ ...pixel, color: C.textGold }} className="text-[14px] opacity-80">{hint}</span>}
    </div>
  );
}

// Wording per editor kind. The shell, @-tagging, and two-button flow are shared;
// only the labels/placeholders/button text differ.
const EDITOR_KINDS = {
  reflection: {
    title: "WRITE A REFLECTION",
    icon: Pen,
    bodyLabel: "Your reflection",
    titlePlaceholder: "Give this reflection a title",
    bodyPlaceholder: "Take your time. What happened, how did it feel, and what will you carry forward from it?",
    saveLabel: "SAVE REFLECTION",
    fallbackTitle: "Untitled reflection",
    image: true, // offers an AI memory illustration generated on save
  },
  note: {
    title: "WRITE A NOTE",
    icon: FileText,
    bodyLabel: "Your note",
    titlePlaceholder: "Give this note a title (optional)",
    bodyPlaceholder: "Write something for the buddy who got you through it…",
    saveLabel: "SAVE NOTE",
    fallbackTitle: "Untitled note",
    tagging: false, // a buddy note is for one person — no section tagging
  },
  letter: {
    title: "WRITE A LETTER",
    icon: Mail,
    bodyLabel: "Your letter",
    titlePlaceholder: "What is this letter about? (e.g. The day I passed IPPT)",
    bodyPlaceholder: "Write about a moment you want to remember — what happened, who was there, and how it felt.",
    saveLabel: "SAVE LETTER",
    fallbackTitle: "Untitled letter",
    image: true, // offers an AI memory illustration generated on save
  },
};

// NOTE: still exported as AIMemoryModal so existing imports keep working. It is a
// configurable text editor (reflection / note / letter) — same shell + @-tagging,
// wording driven by `kind`. `initial` pre-fills when editing an existing entry.
export default function AIMemoryModal({ onClose, onSave, kind = "reflection", initial }) {
  const cfg = EDITOR_KINDS[kind] || EDITOR_KINDS.reflection;
  const KindIcon = cfg.icon;

  const [title, setTitle] = useState(initial?.title || "");
  const [reflection, setReflection] = useState(initial?.text || "");
  const [tagText, setTagText] = useState(initial?.tagText || "");
  const [imageStyle, setImageStyle] = useState(initial?.imageStyle || DEFAULT_IMAGE_STYLE);
  const [saving, setSaving] = useState(false);

  // @-mention picker state for the TAG field.
  const tagRef = useRef(null);
  const [mention, setMention] = useState(null); // { start, query } | null
  const [mentionIdx, setMentionIdx] = useState(0);

  const mentionMatches = mention
    ? SECTION_MATES.filter((m) => m.toLowerCase().startsWith(mention.query))
    : [];

  // Mates actually @-tagged in the tag field (for the payload + chips).
  const taggedMates = SECTION_MATES.filter((m) =>
    new RegExp("(^|\\s)@" + m.replace(/\s/g, "\\s") + "(?=\\s|$|[.,!?])", "i").test(tagText)
  );

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !mention) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, mention]);

  function syncMention(value, caret) {
    setMention(getActiveMention(value, caret));
    setMentionIdx(0);
  }

  function handleTagChange(e) {
    setTagText(e.target.value);
    syncMention(e.target.value, e.target.selectionStart);
  }

  // Insert the chosen name, replacing the "@query" with "@Name ".
  function pickMention(name) {
    if (!mention) return;
    const el = tagRef.current;
    const caret = el ? el.selectionStart : tagText.length;
    const before = tagText.slice(0, mention.start);
    const after = tagText.slice(caret);
    const insert = "@" + name + " ";
    const next = before + insert + after;
    setTagText(next);
    setMention(null);
    const newCaret = (before + insert).length;
    requestAnimationFrame(() => {
      if (el) { el.focus(); el.setSelectionRange(newCaret, newCaret); }
    });
  }

  function handleTagKeyDown(e) {
    if (!mention || mentionMatches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIdx((i) => (i + 1) % mentionMatches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIdx((i) => (i - 1 + mentionMatches.length) % mentionMatches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pickMention(mentionMatches[mentionIdx]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMention(null);
    }
  }

  function commit(isDraft) {
    if (saving) return;
    if (!isDraft && !reflection.trim()) return; // need body text for a real save
    setSaving(true);

    const payload = {
      type: "reflection", // shared Firestore note path for all text editors
      kind,               // reflection | note | letter (for the caller)
      title: title.trim() || (isDraft ? "Untitled draft" : cfg.fallbackTitle),
      text: reflection,
      tagText,
      taggedMate: taggedMates.join(", "),
      isDraft,
      // Chosen art style for the AI memory image. The save handler generates
      // and uploads the image (best-effort, final saves only); no preview here.
      imageStyle: cfg.image ? imageStyle : undefined,
    };

    // Close the modal FIRST so it disappears the instant Save is clicked; the
    // parent then persists the text and (for memory kinds) generates the image
    // in the background, reporting progress via its own toast. We don't await
    // here — the modal is already unmounting, so no post-close state updates.
    onClose();
    try {
      if (onSave) Promise.resolve(onSave(payload)).catch(function (err) {
        console.error("Save Error:", err);
      });
    } catch (err) {
      console.error("Save Error:", err);
    }
  }

  const canSave = reflection.trim().length > 0;

  return (
    <div className="wgt-keepsake-overlay" role="dialog" aria-modal="true" aria-label={cfg.title}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
        style={{ background: "transparent" }}
      />
      <div className="wgt-keepsake relative flex flex-col">
        {/* ── header band: gilt title + wax-seal close ── */}
        <div className="wgt-keepsake-head flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span style={{ color: C.gold }}><KindIcon size={22} /></span>
            <h2 style={{ ...pixel, color: C.gold, letterSpacing: "0.04em", textShadow: "0 1px 0 #0007" }} className="text-[30px] leading-none">{cfg.title}</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="wgt-keepsake-seal shrink-0"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── body: title (compact) → body (hero) → tags → actions ── */}
        <div className="wgt-keepsake-doc flex flex-col">
          <div className="wgt-keepsake-inner flex min-h-0 flex-1 flex-col">
            <FieldLabel>Title</FieldLabel>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={cfg.titlePlaceholder}
              className="wgt-field"
              style={{ ...pixel, fontSize: 18 }}
            />

            {/* Body — the hero. flex-1 so it fills the modal height. */}
            <FieldLabel>{cfg.bodyLabel}</FieldLabel>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder={cfg.bodyPlaceholder}
              className="wgt-field wgt-field-lined min-h-0 flex-1"
              style={{ ...pixel, fontSize: 18, resize: "none" }}
            />

            {/* Tagging — its own field with the @-mention picker. Hidden for
                kinds that opt out (e.g. a buddy note is for one person). */}
            {cfg.tagging !== false && (
              <>
                <FieldLabel hint="type @ to tag">Tag your section mates</FieldLabel>
                <div className="relative">
                  <textarea
                    ref={tagRef}
                    value={tagText}
                    onChange={handleTagChange}
                    onKeyDown={handleTagKeyDown}
                    onClick={(e) => syncMention(e.target.value, e.target.selectionStart)}
                    onBlur={() => { setTimeout(() => setMention(null), 120); }}
                    placeholder="@ Hao Jie, @ Rafiq …"
                    rows={2}
                    className="wgt-field"
                    style={{ ...pixel, fontSize: 18, resize: "none" }}
                  />
                  {mention && (
                    <div className="wgt-mention-pop" style={{ left: 8, bottom: "100%", marginBottom: 6 }}>
                      {mentionMatches.length === 0 ? (
                        <p className="wgt-mention-empty" style={{ ...pixel, fontSize: 16 }}>No mate matches “{mention.query}”</p>
                      ) : (
                        mentionMatches.map((mate, i) => (
                          <button
                            key={mate}
                            type="button"
                            className={"wgt-mention-item" + (i === mentionIdx ? " is-active" : "")}
                            onMouseDown={(e) => { e.preventDefault(); pickMention(mate); }}
                            onMouseEnter={() => setMentionIdx(i)}
                          >
                            <span className="wgt-mention-avatar"><User size={14} /></span>
                            <span style={{ ...pixel, fontSize: 18 }}>{mate}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {taggedMates.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {taggedMates.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5"
                        style={{ ...pixel, fontSize: 15, color: C.bgHeader, background: C.gold, boxShadow: "inset 0 1px 0 #fff5" }}
                      >
                        <AtSign size={12} />{m}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Memory image style — picks the art direction for the AI image
                generated on save. Only the kinds that opt in (reflection,
                letter) show this; no preview is rendered in the modal. */}
            {cfg.image && (
              <>
                <FieldLabel hint="generated on save">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles size={14} style={{ color: C.gold }} />Memory image style
                  </span>
                </FieldLabel>
                <select
                  value={imageStyle}
                  onChange={(e) => setImageStyle(e.target.value)}
                  className="wgt-field"
                  style={{ ...pixel, fontSize: 18 }}
                >
                  {Object.entries(IMAGE_STYLES).map(([key, s]) => (
                    <option key={key} value={key}>{s.label}</option>
                  ))}
                </select>
              </>
            )}

            {/* ── actions: Save draft (secondary) + Save reflection (primary) ── */}
            <div className="mt-6 flex shrink-0 justify-end gap-2.5">
              <button
                type="button"
                onClick={() => commit(true)}
                disabled={saving}
                className="wgt-press flex items-center gap-2 rounded-md px-5 py-2.5"
                style={{
                  background: "linear-gradient(180deg,#5c5238,#46402a)",
                  color: C.textGold,
                  border: "2px solid " + C.gold + "55",
                  boxShadow: "inset 0 1px 0 #ffffff20, 0 2px 5px #0005",
                }}
              >
                <Save size={17} style={{ color: C.gold }} />
                <span style={{ ...pixel, fontSize: 18 }}>SAVE DRAFT</span>
              </button>
              <button
                type="button"
                onClick={() => commit(false)}
                disabled={saving || !canSave}
                className="wgt-press flex items-center gap-2 rounded-md px-6 py-2.5"
                style={{
                  background: canSave
                    ? "linear-gradient(180deg,#d8b56a,#b8924a)"
                    : "linear-gradient(180deg,#4a4530,#3a3626)",
                  color: canSave ? "#2a2410" : "#8a805f",
                  border: "2px solid " + (canSave ? "#e9cf94" : "#5a543c"),
                  boxShadow: canSave
                    ? "inset 0 1px 0 #fff8, 0 3px 8px #0006"
                    : "inset 0 1px 0 #ffffff10",
                  cursor: canSave ? "pointer" : "not-allowed",
                }}
              >
                <Check size={18} style={{ color: canSave ? "#2a2410" : "#8a805f" }} />
                <span style={{ ...pixel, fontSize: 18 }}>{saving ? "SAVING…" : cfg.saveLabel}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
