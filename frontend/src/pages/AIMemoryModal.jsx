import React, { useState } from "react";
import { storage, auth, db } from "../auth/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { X, Sparkles, RefreshCw, Plus } from "lucide-react";
import { C, pixel, M } from "../theme";
import { Ribbon, Frame } from "../ui";

/* ─── Avatar stub ─────────────────────────────────────────────── */
function getAvatarDescription() {
  return "a young Singaporean male soldier wearing a green SAF combat helmet, olive green no. 4 uniform, black boots, and a rank badge on his chest";
}

/* ─── Prompt builder ──────────────────────────────────────────── */
function buildPrompt(userDescription, avatarDesc) {
  return `16-bit pixel art, retro warm palette, scrapbook style, ${avatarDesc}, ${userDescription}, Singapore army camp setting, dramatic lighting, detailed background, nostalgic feel`;
}

/* ─── Pollinations URL ────────────────────────────────────────── */
function buildPollinationsURL(prompt) {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 999999);
  return `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&seed=${seed}&model=flux`;
}

/* ─── Modal shell ─────────────────────────────────────────────── */
function ModalShell({ onClose, children }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
        style={{ background: "#11100bcc" }}
      />
      <Frame
        frame="card"
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden p-4"
        style={{ maxWidth: 480 }}
      >
        {children}
      </Frame>
    </div>
  );
}

/* ─── Step indicator ──────────────────────────────────────────── */
function Steps({ current }) {
  const steps = ["Describe", "Generating", "Preview"];
  return (
    <div className="mb-4 flex items-center gap-0">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center gap-1">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{
                background: i <= current ? C.green : "#2a3320",
                border: `2px solid ${i <= current ? C.gold : C.line}`,
              }}
            >
              <span style={{ ...pixel, fontSize: 11, color: C.textGold }}>{i + 1}</span>
            </div>
            <span style={{ ...pixel, ...M, fontSize: 10 }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="mb-4 flex-1"
              style={{ height: 2, background: i < current ? C.gold : C.line }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function AIMemoryModal({ onClose, onSave }) {
  const [step, setStep] = useState(0);
  const [description, setDescription] = useState("");
  const [memoryTitle, setMemoryTitle] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [imageURL, setImageURL] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  /* ── GENERATE ── */
  function handleGenerate() {
    if (!description.trim()) return;
    setError(null);
    setImageLoaded(false);

    const avatar = getAvatarDescription();
    const prompt = buildPrompt(description.trim(), avatar);
    setEnhancedPrompt(prompt);

    const url = buildPollinationsURL(prompt);
    setImageURL(url);
    setStep(2);
  }

  /* ── REGENERATE ── */
  function handleRegenerate() {
    setImageURL(null);
    setImageLoaded(false);
    setEnhancedPrompt("");
    setError(null);
    setStep(0);
  }

  /* ── SAVE ── */
  async function handleSave() {
    if (!imageURL) return;
    setSaving(true);
    setError(null);

    try {
      await addDoc(collection(db, "journalEntries"), {
        userId: auth.currentUser.uid,
        type: "photo",
        photoURL: imageURL,
        caption: memoryTitle.trim() || description.trim().slice(0, 60),
        taggedMates: "",
        aiGenerated: true,
        aiPrompt: enhancedPrompt,
        originalDescription: description.trim(),
        createdAt: serverTimestamp(),
      });

      onSave({
        id: "ai_" + Date.now(),
        type: "photo",
        title: memoryTitle.trim() || description.trim().slice(0, 60),
        ago: "now",
        date: "TODAY",
        text: "✦ AI-generated memory",
        photoURL: imageURL,
      });

      onClose();
    } catch (err) {
      console.error("Save failed:", err);
      setError("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const fieldStyle = {
    ...pixel,
    width: "100%",
    background: "#f3e8d0",
    border: `2px solid ${C.line}`,
    borderRadius: 8,
    padding: "8px 10px",
    color: C.ink,
    fontSize: 16,
    boxSizing: "border-box",
  };

  const labelStyle = {
    ...pixel, ...M,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 4,
    marginTop: 12,
    display: "block",
  };

  return (
    <ModalShell onClose={onClose}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Ribbon size={15}>
          <span className="inline-flex items-center gap-2">
            <Sparkles size={15} />
            AI MEMORY
          </span>
        </Ribbon>
        <button
          type="button"
          onClick={onClose}
          className="wgt-press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: C.green, color: C.textGold }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Steps current={step} />

        {/* ── STEP 0: Describe ── */}
        {step === 0 && (
          <div>
            <p style={{ ...pixel, ...M, fontSize: 13, marginBottom: 12 }}>
              Can't upload a photo? Describe what happened — we'll paint it for you.
            </p>

            <label style={labelStyle} htmlFor="ai-desc">What happened? (1–2 sentences)</label>
            <textarea
              id="ai-desc"
              rows={3}
              style={{ ...fieldStyle, resize: "vertical" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Ran 2.4km in the rain and came in last, but my whole section waited at the finish line."
              maxLength={300}
            />
            <p style={{ ...pixel, ...M, fontSize: 11, textAlign: "right", marginTop: 2 }}>
              {description.length}/300
            </p>

            <label style={{ ...labelStyle, marginTop: 16 }} htmlFor="ai-title">Memory title (optional)</label>
            <input
              id="ai-title"
              style={fieldStyle}
              value={memoryTitle}
              onChange={(e) => setMemoryTitle(e.target.value)}
              placeholder="e.g. 2.4km in the rain"
              maxLength={60}
            />

            <div className="mt-4 rounded-lg px-3 py-2" style={{ background: "#2a3320", border: `1px solid ${C.line}` }}>
              <p style={{ ...pixel, color: C.gold, fontSize: 12, marginBottom: 4 }}>★ TIP</p>
              <p style={{ ...pixel, ...M, fontSize: 12, lineHeight: 1.5 }}>
                Include the weather, who was there, or how you felt — the more vivid, the better the pixel art.
              </p>
            </div>

            {error && <p style={{ ...pixel, color: "#e05c5c", fontSize: 13, marginTop: 12 }}>⚠ {error}</p>}
          </div>
        )}

        {/* ── STEP 2: Preview ── */}
        {step === 2 && (
          <div>
            <div
              className="relative overflow-hidden rounded-lg"
              style={{ border: `3px solid ${C.line}`, background: "#1a2010", minHeight: 200 }}
            >
              {!imageLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Sparkles size={22} style={{ color: C.gold }} />
                  <p style={{ ...pixel, color: C.textGold, fontSize: 13 }}>Painting pixels... (15–20s)</p>
                </div>
              )}
              <img
                src={imageURL}
                alt="AI-generated memory"
                style={{
                  width: "100%",
                  display: imageLoaded ? "block" : "none",
                  imageRendering: "pixelated",
                }}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setError("Image failed to load. Try regenerating.");
                  setImageLoaded(false);
                }}
              />
              {imageLoaded && (
                <span
                  className="absolute bottom-2 right-2 rounded px-2 py-0.5"
                  style={{ ...pixel, fontSize: 11, background: "#11100bcc", color: C.gold, border: `1px solid ${C.gold}55` }}
                >
                  ✦ AI MEMORY
                </span>
              )}
            </div>

            <div className="mt-3 rounded-lg px-3 py-2" style={{ background: "#2a3320", border: `1px solid ${C.line}` }}>
              <p style={{ ...pixel, ...M, fontSize: 12, lineHeight: 1.5, fontStyle: "italic" }}>"{description}"</p>
            </div>

            {enhancedPrompt && (
              <details className="mt-2">
                <summary style={{ ...pixel, ...M, fontSize: 11, cursor: "pointer" }}>Show AI prompt used ▾</summary>
                <p style={{ ...pixel, ...M, fontSize: 11, marginTop: 6, lineHeight: 1.5, padding: "8px 10px", background: "#f3e8d040", borderRadius: 6 }}>
                  {enhancedPrompt}
                </p>
              </details>
            )}

            {error && <p style={{ ...pixel, color: "#e05c5c", fontSize: 13, marginTop: 12 }}>⚠ {error}</p>}
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="mt-3 flex justify-end gap-2">
        {step === 0 && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!description.trim()}
            className="wgt-press flex items-center gap-2 rounded-lg border-2 px-4 py-2"
            style={{
              borderColor: description.trim() ? C.gold + "99" : C.line,
              background: description.trim() ? C.green : "#2a3320",
              color: C.textGold,
              opacity: description.trim() ? 1 : 0.5,
              cursor: description.trim() ? "pointer" : "not-allowed",
            }}
          >
            <Sparkles size={16} />
            <span style={{ ...pixel, fontSize: 16 }}>GENERATE MEMORY</span>
          </button>
        )}

        {step === 2 && (
          <>
            <button
              type="button"
              onClick={handleRegenerate}
              className="wgt-press flex items-center gap-2 rounded-lg border-2 px-3 py-2"
              style={{ borderColor: C.line, background: "#2a3320", color: C.textGold }}
            >
              <RefreshCw size={15} />
              <span style={{ ...pixel, fontSize: 14 }}>REDO</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !imageLoaded}
              className="wgt-press flex items-center gap-2 rounded-lg border-2 px-4 py-2"
              style={{
                borderColor: C.gold + "99",
                background: imageLoaded ? C.green : "#2a3320",
                color: C.textGold,
                opacity: imageLoaded ? 1 : 0.5,
                cursor: imageLoaded ? "pointer" : "not-allowed",
              }}
            >
              <Plus size={16} />
              <span style={{ ...pixel, fontSize: 16 }}>{saving ? "SAVING..." : "SAVE TO JOURNAL"}</span>
            </button>
          </>
        )}
      </div>
    </ModalShell>
  );
}
