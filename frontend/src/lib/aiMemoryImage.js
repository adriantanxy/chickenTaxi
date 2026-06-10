/**
 * aiMemoryImage.js — client entry point for AI memory image generation.
 *
 * The actual Pollinations call + Storage upload happen in the `generateMemoryImage`
 * Cloud Function (see functions/index.js), so the Pollinations API key never ships
 * to the browser. This module only exposes the style list for the dropdown and a
 * thin wrapper that invokes the function and returns the resulting image URL.
 */
import { httpsCallable } from "firebase/functions";
import { functions } from "../auth/firebase";

// Selectable image styles for the editor dropdown. The matching prompt fragments
// live server-side (functions/index.js) keyed by these same keys; only the label
// is needed here. `storybook` is the original look and the default.
export const IMAGE_STYLES = {
  storybook: { label: "Retro storybook" },
  watercolour: { label: "Watercolour" },
  pixel: { label: "Pixel art" },
  comic: { label: "Comic" },
};

export const DEFAULT_IMAGE_STYLE = "storybook";

const callGenerate = httpsCallable(functions, "generateMemoryImage");

/**
 * Generate an image for a memory via the Cloud Function and return its URL.
 *
 * @param {object} args
 * @param {string} args.text      The user's scene description (entry body).
 * @param {string} args.styleKey  Key into IMAGE_STYLES.
 * @param {string} [args.userId]  Ignored — the function derives the owner from the
 *                                authenticated token. Kept for call-site compatibility.
 * @returns {Promise<string>}     The download URL of the generated image.
 *
 * Throws on any failure (callers catch so the text still saves).
 */
export async function generateAndUploadMemoryImage({ text, styleKey }) {
  const result = await callGenerate({ text: text || "", styleKey });
  const photoURL = result?.data?.photoURL;
  if (!photoURL) throw new Error("No image URL returned from generateMemoryImage.");
  return photoURL;
}
