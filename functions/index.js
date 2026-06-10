/**
 * Cloud Functions — AI memory image generation.
 *
 * The Pollinations API key is a real credential (tied to our quota), so it must
 * never ship to the browser. This callable function holds the key as a Firebase
 * secret, calls Pollinations server-side, uploads the result to Cloud Storage,
 * and returns a public URL. The frontend calls this instead of Pollinations.
 *
 * Safety: maxInstances caps runaway scaling so a bug/abuse can't rack up cost.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

initializeApp();

// Set with: firebase functions:secrets:set POLLINATIONS_API_KEY
const POLLINATIONS_API_KEY = defineSecret("POLLINATIONS_API_KEY");

// Avatar description baked into every prompt (kept from the original).
const AVATAR_DESC =
  "a young Singaporean guy wearing a green tactical helmet, olive green explorer uniform, outdoor boots, and a chest patch";

// Art-direction fragments per style. Keys match the frontend dropdown values.
const STYLE_FRAGMENTS = {
  storybook:
    "retro storybook painting, gouache and watercolor illustration, flat colors, textured paper texture, cinematic atmosphere, nostalgic mood",
  watercolour:
    "soft watercolour wash illustration, delicate brush strokes, muted earthy palette, dreamy nostalgic atmosphere, paper grain",
  pixel:
    "16-bit pixel art, retro game sprite scene, crisp pixel outlines, limited warm palette, nostalgic videogame mood",
  comic:
    "bold comic-book illustration, clean ink linework, halftone shading, dynamic composition, vintage adventure comic mood",
};
const DEFAULT_STYLE = "storybook";

function buildPrompt(userDescription, styleFragment) {
  return `${styleFragment}, ${AVATAR_DESC}, ${userDescription}, Singapore jungle training setting, anonymous figures, faceless characters seen from a distance, no facial features, back turned to camera, silhouettes, dramatic cinematic lighting, muted earthy color palette, vintage military journal art`;
}

function buildPollinationsURL(prompt, apiKey) {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 999999);
  return `https://gen.pollinations.ai/image/${encoded}?width=512&height=512&nologo=true&seed=${seed}&referrer=my-journal-app&key=${apiKey}`;
}

export const generateMemoryImage = onCall(
  {
    secrets: [POLLINATIONS_API_KEY],
    maxInstances: 3, // cost guardrail: cap concurrent scaling
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (request) => {
    // Require a signed-in user; derive the owner uid from the verified token
    // (never trust a client-sent userId).
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "You must be signed in to generate a memory image.");
    }

    const text = (request.data?.text || "").toString().slice(0, 1000);
    const styleKey = request.data?.styleKey;
    const styleFragment = STYLE_FRAGMENTS[styleKey] || STYLE_FRAGMENTS[DEFAULT_STYLE];

    const prompt = buildPrompt(text, styleFragment);
    const url = buildPollinationsURL(prompt, POLLINATIONS_API_KEY.value());

    let res;
    try {
      res = await fetch(url);
    } catch (err) {
      throw new HttpsError("unavailable", "Could not reach the image service.", err.message);
    }
    if (!res.ok) {
      throw new HttpsError("internal", `Image service error (HTTP ${res.status}).`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to the default bucket and return a long-lived download URL.
    const bucket = getStorage().bucket();
    const filePath = `ai-memories/${uid}/${Date.now()}.png`;
    const token = crypto.randomUUID();
    const file = bucket.file(filePath);
    await file.save(buffer, {
      contentType: "image/png",
      metadata: {
        // Firebase download-token convention: makes the URL below work.
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });

    const downloadURL =
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
      `${encodeURIComponent(filePath)}?alt=media&token=${token}`;

    return { photoURL: downloadURL };
  }
);
