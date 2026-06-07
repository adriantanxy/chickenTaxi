/**
 * JournalLab.jsx — PROOF OF CONCEPT (separate from the real JournalPage).
 *
 * Goal: prove the "describe a scene -> AI pixel image -> drop into the journal
 * frame" pipeline, driven by a LOCAL ComfyUI install (no backend, no API key).
 *
 * Pipeline:
 *   1. user types a scene description (a short paragraph)
 *   2. buildPrompt() turns it into a styled positive prompt — the USER'S TEXT
 *      LEADS so whatever they describe is what gets drawn
 *   3. we clone an embedded ComfyUI workflow, inject the prompt + a random seed,
 *      and POST it to ComfyUI's /prompt endpoint
 *   4. poll /history/{id} until the job is done, read the SaveImage output
 *   5. fetch it via /view and show it inside the polaroid journal frame
 *
 * ── REQUIREMENT ──────────────────────────────────────────────────────────
 * ComfyUI must be running locally with CORS enabled so the browser can call it:
 *     python main.py --enable-cors-header "*"
 * Default address is http://127.0.0.1:8188 (change COMFY below if yours differs).
 */
import { useState } from "react";
import { Sparkles, Wand2, Loader2 } from "lucide-react";
import { AppShell, Card } from "../ui";
import { C, pixel } from "../theme";

const user = { name: "RECRUIT ALEX", unit: "PLATOON ALPHA 3-1", ordDays: 143 };
const COMFY = "http://127.0.0.1:8188";
// Local LLM (Ollama) — turns a diary sentence into a VISUAL scene description so
// the image model understands it. Install: ollama.com  ·  ollama pull llama3.2
// Same pattern as ComfyUI: a local server we POST to. Optional — if it's not
// running, generate() falls back to the raw user text so the app still works.
const OLLAMA = "http://127.0.0.1:11434";
const OLLAMA_MODEL = "llama3.2:latest";
const USE_OLLAMA_REWRITE = true;

// ---- PROMPT SCAFFOLD ------------------------------------------------------
// The local LLM (rewriteToScene) only converts diary slang into visual content.
// Style is locked here so every memory keeps the same reference look: polished
// anime key art, cinematic framing, strong objects/vehicles, small expressive
// soldiers, and warm journal nostalgia. Do not turn this into chibi/sticker art.
const QUALITY =
  "masterpiece, best quality, polished anime illustration, beautiful finished journal memory art";

const STYLE_LOCK =
  "clean anime key visual, polished animation still, crisp confident line art, detailed but " +
  "not realistic, elegant cel shading, soft painterly background, cinematic pastel color " +
  "grading that follows the diary weather and mood, olive drab military palette, expressive " +
  "young soldier faces, adventurous nostalgic mood, not chibi, not sticker art";

const COMPOSITION =
  "square composition for a polaroid journal photo, cinematic three-quarter view, strong " +
  "foreground subject, important object large and recognizable, soldiers grouped naturally, " +
  "readable silhouettes, balanced foreground and background, looks like a memorable anime " +
  "scene from training";

const CONTENT_GUARD =
  "faithful to the diary note, no invented mascots, no random animals, no unrelated props, " +
  "no text in the image, no speech bubbles";

const MOOD_PRESETS = {
  heroic:
    "heroic golden-hour memory, warm peach and lavender sky, cinematic sunset rim light, " +
    "soft dust glow, adventurous proud feeling, like a beautiful training-day anime still",
  rainy:
    "rainy outfield memory, overcast grey-green lighting, heavy rain streaks, wet reflective " +
    "surfaces, saturated jungle colors, dramatic but still polished anime mood, no sunset sky",
  nightOps:
    "dark muddy night training memory, deep blue-grey forest darkness, low-key lighting, scene " +
    "lit mainly by headlamp and flashlight beams, visible cones of light cutting through darkness, " +
    "small pale reflections on wet mud and water, closed dark forest canopy, dark sky overhead, " +
    "quiet tense outfield mood, no sunset sky, no pale horizon, no bright daytime sky",
  starry:
    "starry night memory, deep navy-blue sky, visible stars, soft moonlight rim lighting, " +
    "small warm camp or barracks lights, quiet magical training-night atmosphere, gentle contrast",
};

const NEG =
  "realistic, photorealistic, photo, photograph, 3d, render, semi-realistic, painterly " +
  "realism, gritty photo texture, ugly, creepy, uncanny, deformed face, distorted face, " +
  "mutated eyes, bad anatomy, deformed hands, extra limbs, missing limbs, worst quality, " +
  "low quality, blurry, text, watermark, logo, reference sheet, sprite sheet, lineup, " +
  "flat sticker art, childish doodle, crude drawing, chibi, super deformed, oversized head, " +
  "empty landscape, tiny distant people, random dog, random cat, random animal, serious " +
  "military poster, intimidating war scene, black and white photo, documentary photo, " +
  "dull flat green wash, rainbow";

const NIGHT_NEG =
  "sunset, sunrise, dusk, dawn, golden hour, orange sky, peach sky, warm horizon, sun, " +
  "daylight, daytime, bright sky, glowing horizon, backlit sunset scene, moonlit clearing, " +
  "large bright moon, blue morning light, misty daylight, bright fog, glowing sky opening, " +
  "ambient forest glow, evenly lit scene, pale sky gap, white horizon, bright opening between trees";

// ---- EMBEDDED COMFYUI WORKFLOW (API format) -------------------------------
// Text-to-image via SDXL base + illustrious_flat_color LoRA (single LoRA).
// We tried J_cartoon + chibi LoRAs chasing the soft fieldcamp_left.png look,
// but those produced gritty/sticker styles that missed the target. This setup
// gives the most CONSISTENT, presentable result (clean anime scenes), so we
// ship it rather than chase a look these models can't reach.
//   node 6  = positive prompt  (we overwrite inputs.text)
//   node 7  = negative prompt  (we overwrite inputs.text)
//   node 3  = KSampler         (we randomize inputs.seed)
//   node 9  = SaveImage        (we read the output image from here)
//   node 18 = illustrious_flat_color LoRA
const WORKFLOW = {
  "3": {
    inputs: {
      seed: 0, steps: 30, cfg: 6, sampler_name: "dpmpp_2m", scheduler: "karras", denoise: 1,
      model: ["18", 0], positive: ["6", 0], negative: ["7", 0], latent_image: ["5", 0],
    },
    class_type: "KSampler", _meta: { title: "KSampler" },
  },
  "4": {
    inputs: { ckpt_name: "sd_xl_base_1.0.safetensors" },
    class_type: "CheckpointLoaderSimple", _meta: { title: "Load Checkpoint" },
  },
  "5": {
    inputs: { width: 768, height: 768, batch_size: 1 },
    class_type: "EmptyLatentImage", _meta: { title: "Empty Latent Image" },
  },
  "6": {
    inputs: { text: "", clip: ["18", 1] },
    class_type: "CLIPTextEncode", _meta: { title: "CLIP Text Encode (Prompt)" },
  },
  "7": {
    inputs: { text: "", clip: ["18", 1] },
    class_type: "CLIPTextEncode", _meta: { title: "CLIP Text Encode (Prompt)" },
  },
  "8": {
    inputs: { samples: ["3", 0], vae: ["4", 2] },
    class_type: "VAEDecode", _meta: { title: "VAE Decode" },
  },
  "9": {
    inputs: { filename_prefix: "JournalLab", images: ["8", 0] },
    class_type: "SaveImage", _meta: { title: "Save Image" },
  },
  "18": {
    inputs: {
      lora_name: "illustrious_flat_color_v2.safetensors",
      strength_model: 0.9, strength_clip: 1, model: ["4", 0], clip: ["4", 1],
    },
    class_type: "LoraLoader", _meta: { title: "Load LoRA (Model and CLIP)" },
  },
};

// stable per-tab client id for ComfyUI
const CLIENT_ID = (crypto?.randomUUID?.() ?? `journallab-${Date.now()}`);

// Ask the local LLM to turn a diary note into visual CONTENT only. It should
// explain slang and pick the drawable moment, but it must not choose the art
// style or decorate the memory with things the user never mentioned.
//
// Returns the scene string, or null if Ollama is unavailable/failed (caller
// then falls back to the raw user text — the app never breaks).
//
// Design choices baked into the instructions:
//  - DEFAULT ENVIRONMENT = forest/jungle (the NS outfield), unless the note
//    clearly implies another place (bunk, cookhouse, parade, open field, etc.).
//  - WEATHER follows the user: only rain/night/etc. if they say so; else pleasant.
async function rewriteToScene(desc) {
  const system =
    "You are an illustrator's assistant. Turn a Singapore national service diary note " +
    "into a visual content brief for one illustration. Reply ONLY as JSON: " +
    '{"scene": "..."}.\n' +
    "\n" +
    "Your job is CONTENT ONLY, not art style. Capture the specific moment the soldier " +
    "lived: who is there, what they are doing, what important object is involved, where " +
    "it happens, and how it feels. Do not add visual decorations or unrelated background " +
    "items. The image prompt will add the polished anime journal style later.\n" +
    "\n" +
    "SCENE rules:\n" +
    "- LEAD with the characters, the concrete action, and the key object if any (tank, " +
    "rifle, shellscrape, bed, meal tray, etc.). Avoid generic wide landscapes.\n" +
    "- Keep the user's stated activity as the main action. 'river crossing' means soldiers " +
    "wading through a river or stream; do NOT rewrite it as marching, patrolling, or standing " +
    "on a forest path.\n" +
    "- Preserve counts from the note when possible: if it says 6 buddies, say six soldier " +
    "buddies or a small section group of six.\n" +
    "- BE FAITHFUL to the note's feeling. 'drowning in the shellscrape' = two soldiers stuck " +
    "and flailing in a muddy water-filled foxhole pit, soaked and struggling (funny-miserable, " +
    "NOT standing peacefully). Do not sanitize struggle into calm. Cute ≠ calm.\n" +
    "- Expand army slang to plain visual terms: 'shellscrape' = shallow muddy water-logged " +
    "dug-out foxhole pit; 'outfield' = jungle field camp; 'bunk' = barracks room; 'route " +
    "march' = marching with full field pack. Turn feelings into concrete drawable actions.\n" +
    "- DEFAULT SETTING is a lush green forest / jungle outfield, UNLESS the note clearly " +
    "implies another place: bunk, cookhouse, parade square, open vehicle training field, " +
    "road, range, etc. Use the implied place.\n" +
    "- WEATHER & MOOD follow the note. If it implies rain, mud, mess, night, or struggle, " +
    "show it (overcast, wet, muddy). Only use pleasant daylight when the note is actually " +
    "pleasant. Do not force a peaceful mood onto a note that isn't.\n" +
    "- Describe ONLY what the note says — do NOT invent crowds, markets, buildings, " +
    "pets, animals, flowers, flags, signs, weapons, shellscrapes, or props it did not mention. People " +
    "are young soldiers in green army uniform unless stated otherwise. " +
    "Under 45 words.\n" +
    "\n" +
    'Example note "me and buddy drowning in the shellscrape" -> {"scene": "two soldiers ' +
    'stuck waist-deep in a muddy water-filled foxhole pit, flailing and soaked, mud splashing, ' +
    'funny and miserable, overcast wet jungle outfield around them"}';
  try {
    const res = await fetch(`${OLLAMA}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        system,
        prompt: desc.trim(),
        stream: false,
        format: "json",            // Ollama returns strict JSON
        options: { temperature: 0.7 },
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const parsed = JSON.parse(j.response || "{}");
    const rawScene = parsed.scene;
    const scene = typeof rawScene === "string"
      ? rawScene.trim()
      : rawScene && typeof rawScene === "object"
        ? Object.values(rawScene).filter(Boolean).join(", ").trim()
        : "";
    return scene || null;
  } catch {
    return null; // Ollama not running / bad JSON → caller falls back to raw text
  }
}

function getMoodPreset(desc) {
  const lc = desc.toLowerCase();
  if (/star|stars|starry|moon|moonlight/.test(lc)) {
    return MOOD_PRESETS.starry;
  }
  if (/night|midnight|dark|flashlight|flashlights|headlamp|headlamps|head light|head lights|lights out|guard duty/.test(lc)) {
    return MOOD_PRESETS.nightOps;
  }
  if (/rain|raining|storm|wet|soaked/.test(lc)) return MOOD_PRESETS.rainy;
  return MOOD_PRESETS.heroic;
}

function isNightMemory(desc) {
  return /night|midnight|dark|flashlight|flashlights|headlamp|headlamps|head light|head lights|lights out|guard duty/.test(
    desc.toLowerCase()
  );
}

function buildNegativePrompt(desc) {
  const lc = desc.toLowerCase();
  const groupNeg = /\b(we|us|our|buddy|buddies|friends|section|platoon|group|team|[2-9]|10)\b/.test(lc)
    ? "single soldier, lone soldier, solo person"
    : "";
  return [NEG, isNightMemory(desc) ? NIGHT_NEG : "", groupNeg].filter(Boolean).join(", ");
}

function getActionOverride(desc) {
  const lc = desc.toLowerCase();

  if (/\btank\b/.test(lc)) {
    return (
      "main action: a small buddy group of young soldiers are riding together on top of an " +
      "olive drab tank, soldiers visible from the turret, proud excited section memory, the " +
      "full tank and the buddies share the focus, cool adventurous training-day feeling"
    );
  }

  if (/river crossing|crossing.*river|river|stream/.test(lc)) {
    return (
      "main action: soldiers are physically wading through a shallow forest river crossing, " +
      "boots and lower legs in water, ripples and splashes around them, buddy team moving " +
      "carefully through the stream, head-mounted flashlights are the only light source, " +
      "not marching on a dry path, not lit by moonlight or sunrise"
    );
  }

  if (/shellscrape|foxhole/.test(lc)) {
    return (
      "main action: two soldiers are stuck inside a muddy water-filled shellscrape foxhole pit, " +
      "one buddy struggling while the other helps him out, raised earth edges visible"
    );
  }

  return "";
}

// Build the positive prompt. The user's raw diary line stays as the vibe anchor,
// while Ollama adds a secondary visual clarification. This keeps the nicer
// journal feel from the raw text without losing slang/action understanding.
function buildPrompt(scene, desc) {
  const lc = desc.toLowerCase();

  // Count nudge: a PLAIN mention, no weighted tag. Diffusion is unreliable at
  // exact counts, but putting it early helps group memories read correctly.
  const numberWords = {
    two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };
  const digitMatch = lc.match(/\b([2-9]|10)\b/);
  const wordMatch = lc.match(/\b(two|three|four|five|six|seven|eight|nine|ten)\b/);
  const n = digitMatch ? +digitMatch[1] : (wordMatch ? numberWords[wordMatch[1]] : 0);
  const count = n >= 2 && !/\btank\b/.test(lc)
    ? `, section buddy group of about ${n} soldiers, multiple soldiers are clearly visible together as part of the main subject, prioritize beautiful composition over exact counting`
    : "";
  const peopleCue = /\b(we|us|our|buddy|buddies|friends|section|platoon|group|team)\b/.test(lc) || n >= 2
    ? "memory is about being together with buddies, several soldiers should be visible in the scene, not a lone soldier"
    : "";
  const compositionCue = /\btank\b/.test(lc)
    ? "cinematic tank memory composition, full tank visible inside the frame, low front three-quarter view, sweeping sandy training ground foreground, distant landscape depth, dramatic peach-lavender sunset sky, dust trail and long shadows, enough breathing room around the tank, no rainbow, no foreground soldier silhouette"
    : "";
  const visualCues = [];

  if (/\btank\b/.test(lc)) {
    visualCues.push(
      "olive drab tank in a cinematic low front three-quarter view, long cannon and tank tracks clearly drawn, full tank silhouette mostly visible, sandy orange training ground with dust and track marks, warm sunset rim light, peach and lavender sky, three to five soldiers clustered on top and visible from the turret, group of buddies is prominent, not tightly cropped, not a lone soldier tank poster"
    );
  }

  if (/rain|raining|storm|wet|soaked/.test(lc)) {
    visualCues.push(
      "heavy rain visible as fine streaks, wet uniforms, puddle reflections, rainy overcast grey-green palette, saturated jungle greens, no sunset sky, no warm desert light"
    );
  }

  if (/dark|night|midnight|flashlight|flashlights|headlamp|headlamps|head light|head lights/.test(lc)) {
    visualCues.push(
      "dark forest night scene with visible headlamp cones, small pale flashlight beams are the primary light source, faces and gear lit only by headlamps, water reflections come from flashlights, closed canopy above, dark sky overhead, deep blue-grey shadows around the forest, no bright gap in the sky, no sunset sky, no orange horizon, no bright horizon"
    );
  }

  if (/mud|muddy/.test(lc)) {
    visualCues.push(
      "muddy ground, wet boots, dark mud texture, slippery uneven terrain"
    );
  }

  if (/river crossing|river|stream|crossing/.test(lc)) {
    visualCues.push(
      "river crossing is clearly visible, water covers the foreground, soldiers are inside the stream with boots and shins submerged, pale flashlight beams reflect on dark muddy water, ripples and splashes around legs, surrounding forest is dark and muddy, not a dry forest trail"
    );
  }

  if (/shellscrape|foxhole/.test(lc)) {
    visualCues.push(
      "tight action scene of two soldiers in one small muddy rectangular shellscrape foxhole pit with raised earth edges, muddy water inside the pit up to their waists or chests, one buddy pulling the other out, not a river or lake, not a line of soldiers, not a patrol"
    );
  }

  if (/bunk|barracks|bed/.test(lc)) {
    visualCues.push(
      "army bunk room setting, metal beds and lockers, warm indoor evening light"
    );
  }

  const cueText = visualCues.join(", ");

  return [
    QUALITY,
    STYLE_LOCK,
    /\btank\b/.test(lc)
      ? "warm proud training-day memory, cinematic peach-lavender sunset, soft dust glow, long shadows, adventurous excited feeling, beautiful anime still with depth"
      : getMoodPreset(desc),
    getActionOverride(desc),
    `diary memory: ${desc.trim()}${count}`,
    scene && scene.trim() !== desc.trim() ? `clarified visual details: ${scene.trim()}` : "",
    peopleCue,
    isNightMemory(desc)
      ? "headlamp-lit dark muddy night scene, high contrast, darkness outside the flashlight beams, sky is dark"
      : "",
    cueText,
    compositionCue,
    COMPOSITION,
    CONTENT_GUARD,
  ].filter(Boolean).join(", ");
}

export default function JournalLab({ onNavigate }) {
  const [desc, setDesc] = useState("6 of my buddies in my section drove a tank today, so cool!");
  const [status, setStatus] = useState("idle"); // idle | submitting | queued | done | error
  const [info, setInfo] = useState("");
  const [img, setImg] = useState(null);

  const busy = ["submitting", "queued"].includes(status);

  // --- the whole ComfyUI round trip
  async function generate() {
    if (!desc.trim()) { setStatus("error"); setInfo("Write something to draw first."); return; }
    setImg(null);
    setStatus("submitting");

    // 1) Ask the local LLM to clarify the visual content. If Ollama isn't
    //    running, fall back to the raw diary line; the raw line still remains
    //    the main prompt anchor inside buildPrompt().
    setInfo("Understanding your memory…");
    const scene = USE_OLLAMA_REWRITE ? ((await rewriteToScene(desc)) || desc) : desc;

    setInfo("Sending to ComfyUI…");
    const wf = structuredClone(WORKFLOW);
    wf["6"].inputs.text = buildPrompt(scene, desc);
    wf["7"].inputs.text = buildNegativePrompt(desc);
    wf["3"].inputs.seed = Math.floor(Math.random() * 1e15);

    let promptId;
    try {
      const res = await fetch(`${COMFY}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: wf, client_id: CLIENT_ID }),
      });
      const j = await res.json();
      if (!res.ok) {
        setStatus("error");
        // ComfyUI returns {error, node_errors} on a bad workflow
        const detail = j?.error?.message || j?.error || `Rejected (${res.status})`;
        setInfo(typeof detail === "string" ? detail : "ComfyUI rejected the workflow.");
        return;
      }
      promptId = j.prompt_id;
    } catch {
      setStatus("error");
      setInfo("Can't reach ComfyUI — is it running with --enable-cors-header?");
      return;
    }

    setStatus("queued");
    setInfo("Queued in ComfyUI…");
    poll(promptId);
  }

  // poll /history/{id} until the prompt finishes, then pull the image url
  async function poll(promptId) {
    try {
      const hist = await fetch(`${COMFY}/history/${promptId}`).then((r) => r.json());
      const entry = hist?.[promptId];

      if (entry) {
        const st = entry.status || {};
        if (st.status_str === "error") {
          setStatus("error"); setInfo("ComfyUI errored while generating — check its console.");
          return;
        }
        if (st.completed || entry.outputs) {
          // find the SaveImage output (node 9, but scan to be safe)
          const outputs = entry.outputs || {};
          const imgInfo =
            outputs["9"]?.images?.[0] ||
            Object.values(outputs).flatMap((o) => o.images || [])[0];
          if (!imgInfo) {
            setStatus("error"); setInfo("ComfyUI finished but returned no image.");
            return;
          }
          const q = new URLSearchParams({
            filename: imgInfo.filename,
            subfolder: imgInfo.subfolder || "",
            type: imgInfo.type || "output",
          });
          setImg(`${COMFY}/view?${q.toString()}`);
          setStatus("done"); setInfo("Done.");
          return;
        }
      }

      // not finished yet
      setInfo("Generating… (ComfyUI is working)");
      setTimeout(() => poll(promptId), 1500);
    } catch {
      setStatus("error");
      setInfo("Lost connection to ComfyUI while polling.");
    }
  }

  return (
    <AppShell
      active="AI LAB" onNavigate={onNavigate} user={user}
      icon={<Sparkles size={34} />} title="AI LAB" subtitle="PROOF OF CONCEPT · DESCRIBE → PIXEL MEMORY"
    >
      <div className="grid grid-cols-2 gap-4 p-6">
        {/* ============ INPUT SIDE ============ */}
        <Card title="DESCRIBE YOUR MEMORY">
          <p style={{ ...pixel, color: C.textDark }} className="mb-1 text-[16px]">SCENE DESCRIPTION</p>
          <p style={{ ...pixel, color: "#6b5c3e" }} className="mb-2 text-[13px] leading-snug">
            Write a sentence or two about your day. Whatever you describe is what gets drawn.
          </p>
          <textarea
            value={desc} onChange={(e) => setDesc(e.target.value)} rows={4}
            placeholder="e.g. 6 of my buddies in my section drove a tank today, so cool!"
            className="mb-3 w-full rounded-md p-2 text-[16px]"
            style={{ ...pixel, background: C.cardInner, color: C.textDark, outline: "none" }}
          />

          <button onClick={generate} disabled={busy}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 py-2"
            style={{ borderColor: C.gold + "99", background: C.green, color: C.textGold, opacity: busy ? 0.6 : 1 }}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
            <span style={pixel} className="text-[22px]">{busy ? "GENERATING…" : "GENERATE PIXEL MEMORY"}</span>
          </button>
          {info && <p style={{ ...pixel, color: status === "error" ? "#a33" : "#6b5c3e" }} className="mt-2 text-[14px]">{info}</p>}

          <p style={{ ...pixel, color: "#6b5c3e" }} className="mt-4 text-[13px] leading-snug">
            Runs on your local ComfyUI ({COMFY}). Start it with{" "}
            <span style={{ color: C.textDark }}>--enable-cors-header "*"</span> so the browser can reach it.
          </p>
        </Card>

        {/* ============ OUTPUT SIDE — the journal "image slot" ============ */}
        <Card title="JOURNAL PREVIEW">
          <p style={{ ...pixel, color: "#6b5c3e" }} className="mb-2 text-[14px]">This is the polaroid slot in a journal entry. The generated image drops in here.</p>

          <div className="mx-auto max-w-md rounded-xl p-6" style={{ background: C.cardLight }}>
            {/* tape + title ribbon */}
            <div className="mb-3 text-center">
              <span className="inline-block rounded px-4 py-1" style={{ background: C.green }}>
                <span style={{ ...pixel, color: C.textGold }} className="text-[22px]">★ NEW MEMORY ★</span>
              </span>
            </div>

            {/* polaroid */}
            <div className="mx-auto -rotate-1 bg-white p-3 pb-10 shadow-lg" style={{ width: "85%" }}>
              <div className="flex aspect-square w-full items-center justify-center overflow-hidden" style={{ background: "#e7e2d6" }}>
                {img ? (
                  <img src={img} alt="generated memory" className="h-full w-full object-cover" />
                ) : (
                  <span style={{ ...pixel, color: "#9a8f6e" }} className="px-6 text-center text-[18px]">
                    {busy ? "Summoning your memory…" : "Your pixel memory appears here"}
                  </span>
                )}
              </div>
              <p style={{ ...pixel, color: C.textDark }} className="mt-2 text-center text-[15px] leading-snug">{desc}</p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
