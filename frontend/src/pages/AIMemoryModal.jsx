import React, { useState, useEffect } from "react";
import { auth } from "../auth/firebase";
import { X, Sparkles, RefreshCw, Plus, AlertCircle, Loader2 } from "lucide-react";
import { C, pixel } from "../theme";
import { Ribbon } from "../ui";

function getAvatarDescription() {
  // Swapping out restricted military words for safe, descriptive equivalents
  return "a young Singaporean guy wearing a green tactical helmet, olive green explorer uniform, outdoor boots, and a chest patch";
}

function buildPrompt(userDescription, avatarDesc) {
  // Swapping "Singapore army camp setting" to an adventure/jungle setting
  return `16-bit pixel art, retro warm palette, scrapbook style, ${avatarDesc}, ${userDescription}, Singapore jungle training setting, dramatic lighting, detailed background, nostalgic feel`;
}

function buildPollinationsURL(prompt) {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 999999);
  return `https://gen.pollinations.ai/image/${encoded}?width=512&height=512&nologo=true&seed=${seed}&referrer=my-journal-app&key=sk_4R2jqEoRaFzvr9K8uh10DPeOUGuPEohV`;
}

function ModalShell({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 font-mono select-none backdrop-blur-sm">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl border-4 p-6 shadow-2xl text-stone-200"
        style={{ backgroundColor: "#1c2214", borderColor: C.line }}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-stone-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

export default function AIMemoryModal({ onClose, onSave }) {
  const [description, setDescription] = useState("");
  const [step, setStep] = useState(1); // 1 = Input, 2 = Live Preview
  const [imageSrc, setImageSrc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (imageSrc?.startsWith("blob:")) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  const generateImage = async (textDescription) => {
    setError(null);
    setLoading(true);
    setStep(2);

    try {
      const avatarDesc = getAvatarDescription();
      const finalPrompt = buildPrompt(textDescription, avatarDesc);
      const targetUrl = buildPollinationsURL(finalPrompt);

      // Fetch as blob instead of setting URL directly
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const localUrl = URL.createObjectURL(blob);

      setImageSrc(localUrl);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to process your request.");
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (loading || saving || !imageSrc) return;
    setSaving(true);
    try {
      // Package payload to send up to the parent shell
      const entryPayload = {
        type: "ai_memory",
        promptDescription: description,
        rawBlobUrl: imageSrc, // Used to upload into storage or convert to canvas blocks
        createdAt: new Date(),
        userId: auth.currentUser?.uid || "anonymous"
      };

      if (onSave) {
        await onSave(entryPayload);
      }
      onClose();
    } catch (err) {
      console.error("Save Error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="mb-4 text-center">
        <Ribbon text="AI MEMORY ENGINE" color={C.gold} />
        <p className="mt-2 text-xs opacity-75" style={{ color: C.textGold }}>
          GENERATE A 16-BIT RETRO MEMORY COMPANION
        </p>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <label className="block text-sm font-bold tracking-wide" style={{ color: C.textGold, ...pixel }}>
            DESCRIBE THE SCENE:
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Cleaning my rifle during field camp, looking tired but determined..."
            className="w-full h-24 p-3 rounded-lg border-2 text-sm focus:outline-none placeholder-stone-600 resize-none text-stone-100"
            style={{ backgroundColor: "#12160d", borderColor: C.line }}
          />
          <button
            type="button"
            onClick={() => generateImage(description)}
            disabled={!description.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-lg border-2 py-3 font-bold transition-all active:scale-95"
            style={{
              borderColor: description.trim() ? C.gold : C.line,
              background: description.trim() ? C.green : "#2a3320",
              color: C.textGold,
              opacity: description.trim() ? 1 : 0.5,
            }}
          >
            <Sparkles size={16} />
            <span style={{ ...pixel, fontSize: 16 }}>GENERATE MEMORY</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative flex aspect-square w-full items-center justify-center rounded-lg border-2 overflow-hidden bg-stone-950" style={{ borderColor: C.line }}>

            {/* 1. Spinner stays visible on top overlay while loading is true */}
            {loading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-2 bg-stone-950 text-stone-400">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                <p className="text-xs tracking-widest animate-pulse" style={pixel}>PIXELATING SCENE...</p>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center space-y-2 bg-stone-950 text-red-400">
                <AlertCircle size={32} />
                <p className="text-xs opacity-80">{error}</p>
              </div>
            )}

            {/* 2. Render the image unconditionally if the source exists so the browser can actually run onLoad */}
            {imageSrc && (
              <img
                src={imageSrc}
                alt="AI Generated"
                className="h-full w-full object-cover"
                onLoad={() => setLoading(false)} // This safely shuts off the spinner overlay once pixels land!
                onError={() => {
                  setLoading(false);
                  setError("Failed to render the image asset.");
                }}
              />
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => generateImage(description)}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-stone-300"
              style={{ borderColor: C.line, background: "#2a3320" }}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              <span style={{ ...pixel, fontSize: 14 }}>REDO</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || !!error}
              className="flex items-center gap-2 rounded-lg border-2 px-4 py-2"
              style={{
                borderColor: C.gold + "99",
                background: (!loading && !error) ? C.green : "#2a3320",
                color: C.textGold,
                opacity: (!loading && !error) ? 1 : 0.5,
              }}
            >
              <Plus size={16} />
              <span style={{ ...pixel, fontSize: 16 }}>{saving ? "SAVING..." : "SAVE TO JOURNAL"}</span>
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}