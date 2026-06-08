import React, { useState, useEffect } from "react";
import { auth } from "../auth/firebase";
import { X, Sparkles, RefreshCw, Plus, AlertCircle, Loader2 } from "lucide-react";
import { C, pixel } from "../theme";
import { Ribbon } from "../ui";

function getAvatarDescription() {
  // Swapping out restricted military words for safe, descriptive equivalents
  return "a young Singaporean guy wearing a green tactical helmet, olive green explorer uniform, outdoor boots, and a chest patch";
}

function buildPrompt(userDescription, avatarDesc, styleKey) {
  const styles = {
    vintage: "retro storybook painting, gouache and watercolor illustration, flat colors, textured paper texture, nostalgic mood, vintage military journal art, muted earthy color palette",
    anime: "90s cinematic anime style, hand-drawn animation cel, vivid colors, detailed line art, nostalgic aesthetic, dramatic lighting",
    realistic: "realistic cinematic photography, dramatic natural lighting, 35mm film grain style, highly detailed, realistic depth of field, authentic environment texture",
    pixel: "16-bit retro pixel art, detailed pixelation textures, vintage video game cutscene style, vibrant color grading, clear pixel grid"
  };

  const selectedStyleText = styles[styleKey] || styles.vintage;

  return `${selectedStyleText}, ${avatarDesc}, ${userDescription}, Singapore jungle training setting, cinematic atmosphere, anonymous figures, faceless characters seen from a distance, no facial features, back turned to camera, silhouettes`;
}

function buildPollinationsURL(prompt) {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 999999);
  const apiKey = import.meta.env.VITE_POLLINATIONS_API_KEY;
  return `https://gen.pollinations.ai/image/${encoded}?width=512&height=512&nologo=true&seed=${seed}&referrer=my-journal-app&key=${apiKey}`;
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("vintage");
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
      const finalPrompt = buildPrompt(textDescription, avatarDesc, selectedStyle);
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
      // Package payload to send up to the parent shell
      const entryPayload = {
        type: "photo", // Keeps it matching your existing Firestore "type" configuration
        caption: title.trim() || "AI Rendered Memory", // ⭐️ This maps your Title to the caption field!
        promptDescription: description, // Passes the long paragraph safely
        rawBlobUrl: imageSrc,
        createdAt: new Date(),
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
          <div>
            <label className="block text-xs font-bold tracking-wide mb-1.5" style={{ color: C.textGold, ...pixel }}>
              MEMORY TITLE:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Surviving Monsoon Outfield"
              className="w-full p-2.5 rounded-lg border-2 text-xs focus:outline-none placeholder-stone-600 text-stone-100"
              style={{ backgroundColor: "#12160d", borderColor: C.line }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wide mb-1.5" style={{ color: C.textGold, ...pixel }}>
              DESCRIBE THE SCENE:
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please input a paragraph or so, as descriptive as possible, detailing a memorable moment that happened during training that you would like to render as a visual companion."
              className="w-full h-32 p-3 rounded-lg border-2 text-xs focus:outline-none placeholder-stone-600 resize-none text-stone-100 leading-relaxed"
              style={{ backgroundColor: "#12160d", borderColor: C.line }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-wide mb-1" style={{ color: C.textGold, ...pixel }}>
              CHOOSE ARTWORK RENDERING STYLE:
            </label>
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="w-full p-2.5 rounded-lg border-2 text-xs focus:outline-none text-stone-200 cursor-pointer appearance-none"
              style={{
                backgroundColor: "#12160d",
                borderColor: C.line,
                ...pixel,
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23cda34f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                backgroundSize: '16px'
              }}
            >
              <option value="vintage">VINTAGE SCRAPBOOK PAINTING (DEFAULT)</option>
              <option value="anime">90S CINEMATIC ANIME CEL</option>
              <option value="realistic">REALISTIC 35MM FILM PHOTO</option>
              <option value="pixel">16-BIT CLASSIC PIXEL ART</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => generateImage(description)}
            disabled={!description.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-lg border-2 py-3 font-bold transition-all active:scale-95 mt-2"
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