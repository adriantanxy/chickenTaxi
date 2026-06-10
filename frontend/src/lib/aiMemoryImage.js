/**
 * aiMemoryImage.js — Pollinations image generation for journal memories.
 *
 * Restored from the original AI Memory Engine (commit cc18c984). Reflections and
 * letters can attach a generated illustration: the user picks a STYLE, and on
 * save we build a prompt from their text + the style, fetch the image from
 * Pollinations, and upload it to Firebase Storage. No preview is shown — the
 * image is best-effort and attaches to the entry's photoURL.
 */
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../auth/firebase";

// Avatar description baked into every prompt. Safe, descriptive equivalents of
// the military theme (kept from the original implementation).
const AVATAR_DESC =
  "a young Singaporean guy wearing a green tactical helmet, olive green explorer uniform, outdoor boots, and a chest patch";

// Selectable image styles. Each maps to a prompt fragment that sets the art
// direction. `storybook` is the original look and the default.
export const IMAGE_STYLES = {
  storybook: {
    label: "Retro storybook",
    fragment:
      "retro storybook painting, gouache and watercolor illustration, flat colors, textured paper texture, cinematic atmosphere, nostalgic mood",
  },
  watercolour: {
    label: "Watercolour",
    fragment:
      "soft watercolour wash illustration, delicate brush strokes, muted earthy palette, dreamy nostalgic atmosphere, paper grain",
  },
  pixel: {
    label: "Pixel art",
    fragment:
      "16-bit pixel art, retro game sprite scene, crisp pixel outlines, limited warm palette, nostalgic videogame mood",
  },
  comic: {
    label: "Comic",
    fragment:
      "bold comic-book illustration, clean ink linework, halftone shading, dynamic composition, vintage adventure comic mood",
  },
};

export const DEFAULT_IMAGE_STYLE = "storybook";

// Build the full Pollinations prompt from the user's scene text + chosen style.
// Trailing clauses keep figures anonymous/faceless, matching the original.
export function buildPrompt(userDescription, styleFragment) {
  return `${styleFragment}, ${AVATAR_DESC}, ${userDescription}, Singapore jungle training setting, anonymous figures, faceless characters seen from a distance, no facial features, back turned to camera, silhouettes, dramatic cinematic lighting, muted earthy color palette, vintage military journal art`;
}

// Compose the Pollinations image URL. Uses VITE_POLLINATIONS_API_KEY when set.
export function buildPollinationsURL(prompt) {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 999999);
  const apiKey = import.meta.env.VITE_POLLINATIONS_API_KEY;
  const keyParam = apiKey ? `&key=${apiKey}` : "";
  return `https://gen.pollinations.ai/image/${encoded}?width=512&height=512&nologo=true&seed=${seed}&referrer=my-journal-app${keyParam}`;
}

/**
 * Generate an image for a memory and upload it to Firebase Storage.
 *
 * @param {object} args
 * @param {string} args.text       The user's scene description (entry body).
 * @param {string} args.styleKey   Key into IMAGE_STYLES (falls back to default).
 * @param {string} args.userId     Owner uid for the storage path.
 * @returns {Promise<string>}      The download URL of the uploaded image.
 *
 * Throws on any failure (caller is expected to catch so the text still saves).
 */
export async function generateAndUploadMemoryImage({ text, styleKey, userId }) {
  const style = IMAGE_STYLES[styleKey] || IMAGE_STYLES[DEFAULT_IMAGE_STYLE];
  const prompt = buildPrompt(text || "", style.fragment);
  const url = buildPollinationsURL(prompt);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Pollinations HTTP ${response.status}`);
  const blob = await response.blob();

  const path = `ai-memories/${userId || "anonymous"}/${Date.now()}.png`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
