/**
 * JournalPage.jsx — the keepsake scrapbook.
 *
 * Two views:
 *   1. Landing  — cover card, service progress, sealed memories, letters
 *   2. Flipbook — a react-pageflip book with dynamically composed pages
 *
 * The "START" button (or a test "UNLOCK BOOK" button) toggles into the
 * flipbook view. Each page is a React component rendered at 480x690
 * and auto-scaled by StPageFlip.
 */
import React, { useState, useRef, forwardRef, useCallback, useEffect } from "react";
import { storage, auth, db } from "../auth/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import HTMLFlipBook from "react-pageflip";
import AIMemoryModal from "./AIMemoryModal";
import {
  BookOpen, Plus, Image, FileText, Mic, Star, Mail, Lock,
  ChevronRight, ChevronLeft, Camera, X, Share2, Check,
  Users as UsersIcon, Pen, Award, Sparkles,
  Check, CheckCircle2, Clock, Flag, Square,
} from "lucide-react";
import { AppShell, Ribbon } from "../ui";
import { ASSETS } from "../assets";
import { ROUTES } from "../routes";
import { C, pixel, M, USER as user } from "../theme";

const JOURNAL_ART = ASSETS.journal;

// How far (px) to drop the pep-talk mascot below the speech bubble's baseline.
// Bigger = lower (he dips toward the UNLOCK button). 0 = aligned with bubble.
const MASCOT_DROP = 24;

// Small helper: a pixel-art icon image at a fixed height (width follows art).
function PixIcon({ src, size = 20, className = "" }) {
  return (
    <img
      src={src}
      alt=""
      className={"object-contain " + className}
      style={{ height: size, width: "auto", imageRendering: "pixelated", filter: "drop-shadow(0 1px 1px #0003)" }}
    />
  );
}

/* ───────────────────────── fake data ───────────────────────── */

const data = {
  cover: {
    title: "Adventures",
    subtitle: "of Your 2 Years NS",
    tagline: "Stronger Together, Through Every Mission",
    enlisted: "20 APR 2024",
  },
  ord: { daysLeft: 143 },
  progress: {
    percent: 27,
    days: 143,
    total: 730,
    stats: [
      { label: "MEMORIES", value: 9, art: "memories" },
      { label: "PHOTOS", value: 12, art: "photo" },
      { label: "MATES TAGGED", value: 7, art: "mates" },
    ],
  },
};

/* ─────────────────────── key events ───────────────────────
   The soldier's NS journey as a checklist of milestone EVENTS. Each event
   carries a small set of TASKS (upload a photo, write a reflection/letter/note)
   that, once done, feed the keepsake book. Status drives the UI:
     done   — completed, dimmed, tasks shown as ✓ chips
     active — current event: live countdown + clickable task rows
     locked — upcoming: dimmed, not yet workable
   Only the ACTIVE event shows a countdown (deadlineDays out from when it opened).
   State is session-only — completing a task updates React state, no backend. */
const KEY_EVENTS_SEED = [
  {
    id: "enlistment",
    title: "ENLISTMENT",
    status: "done",
    deadlineDays: 5,
    tasks: [
      { id: "enlist-photo", type: "photo", label: "Upload photos", done: true, value: null },
      { id: "enlist-reflect", type: "reflection", label: "Write a reflection", done: true, value: null },
    ],
  },
  {
    id: "field-camp",
    title: "FIELD CAMP",
    status: "active",
    deadlineDays: 5,
    tasks: [
      { id: "fc-buddy", type: "buddy-note", label: "Write a note to your buddy", done: false, value: null },
      { id: "fc-reflect", type: "reflection", label: "Write a reflection", done: false, value: null },
    ],
  },
  {
    id: "pop",
    title: "POP",
    status: "locked",
    deadlineDays: 5,
    tasks: [
      { id: "pop-photo", type: "photo", label: "Upload a photo", done: false, value: null },
    ],
  },
  {
    id: "atec-1",
    title: "ATEC 1",
    status: "locked",
    deadlineDays: 5,
    tasks: [
      { id: "atec-photo", type: "photo", label: "Upload a photo", done: false, value: null },
      { id: "atec-reflect", type: "reflection", label: "Write a reflection", done: false, value: null },
    ],
  },
  {
    // Special "always open" event: a time-capsule of 10 letters to your future
    // self. No deadline; it stays workable until all 10 are written. Rendered by
    // a dedicated LettersEventCard (one row + an X/10 counter), not the normal
    // task list — its `kind: "letters"` flags that.
    id: "letters",
    title: "LETTERS TO YOURSELF",
    status: "letters",
    kind: "letters",
  },
];

// How many letters the soldier gets to write to their future self.
const LETTERS_TOTAL = 10;

// Map a text task type → the editor `kind` the shared editor expects.
const TEXT_TASK_KINDS = {
  reflection: "reflection",
  "buddy-note": "note",
  letter: "letter",
};

// Rotating one-liners the mascot "types out" in the right rail. Short so they
// fit the narrow box and read as a buddy egging you on toward ORD.
const PEP_LINES = [
  "Almost there, soldier...",
  "Every day is one closer.",
  "Your future self thanks you.",
  "Small moments, big growth.",
  "One book down. Keep going.",
  "Tough days build tough men.",
  "Capture it before you forget.",
  "You're stronger than day one.",
  "ORD loading... stay locked in.",
  "Trust the process, recruit.",
  "Memories now, medals later.",
  "Hooyah! Another day conquered.",
];

/* ── fake journal entries that the flipbook will render ── */
const journalEntries = [
  {
    id: "milestone-1",
    type: "milestone",
    title: "ENLISTMENT DAY",
    date: "20 APR 2024",
    text: "The beginning of a new chapter. Said goodbye to civilian life and stepped into Tekong.",
    imageLabel: "Enlistment photo",
  },
  {
    id: "collage-1",
    type: "collage",
    title: "FIRST WEEK IN CAMP",
    date: "20 - 27 APR 2024",
    photos: [
      { label: "Bunk area", rotate: -2 },
      { label: "First meal", rotate: 3 },
      { label: "Uniform fitting", rotate: -1 },
      { label: "Admin time", rotate: 2 },
    ],
  },
  {
    id: "squad-1",
    type: "squad",
    title: "ALPHA 3-1",
    date: "MAY 2024",
    text: "My section. 12 strangers who became brothers.",
    mates: ["SGT TAN", "REC AHMAD", "REC KUMAR", "REC ALEX", "REC WEI JIE", "REC DARREN"],
    imageLabel: "Section photo",
  },
  {
    id: "milestone-2",
    type: "milestone",
    title: "ROUTE MARCH 8KM",
    date: "17 MAY 2024",
    text: "Legs were dying but we made it. The whole section finished together.",
    imageLabel: "Route march finish",
  },
  {
    id: "reflection-1",
    type: "reflection",
    title: "FIRST OUTFIELD",
    date: "27 JUN 2024",
    text: "3 days in the jungle. Mosquitoes everywhere. Slept in a shellscrape. Ate combat rations under the stars. Somehow... I loved it.\n\nI didn't think I could do this. But here I am, writing this by torchlight, covered in mud, and weirdly proud.",
  },
  {
    id: "collage-2",
    type: "collage",
    title: "FIELD CAMP MEMORIES",
    date: "25 - 28 JUN 2024",
    photos: [
      { label: "Shellscrape", rotate: -3 },
      { label: "Combat ration", rotate: 1 },
      { label: "Night watch", rotate: 2 },
      { label: "Camo face", rotate: -2 },
      { label: "Sunrise", rotate: 1 },
      { label: "Platoon shot", rotate: -1 },
    ],
  },
  {
    id: "letter-1",
    type: "letter",
    title: "LETTER TO FUTURE ME",
    date: "6 MONTHS IN",
    text: "Hey future me,\n\nIf you're reading this, you made it past the halfway mark. Remember how scared you were on day 1? Look how far you've come.\n\nDon't forget the people who helped you get here.\n\n— Past you",
    locked: true,
  },
];

/* ─────────────────── page dimensions ───────────────────
   All journal background images are 1122x1402 (aspect 0.800, i.e. 4:5).
   Page dims MUST match that ratio so objectFit:"cover" shows the whole
   image with no cropping — otherwise percentage-based text overlays
   drift off their parchment slots and pages look inconsistent.
   552 / 690 = 0.800. */
const PAGE_W = 552;
const PAGE_H = 690;

/* ─────────────── placeholder image box ─────────────── */
function PlaceholderImg({ label, w = "100%", h = 160, rotate = 0, className = "" }) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        width: w,
        height: h,
        background: "#2a3320",
        border: "3px solid #4a4a28",
        borderRadius: 4,
        transform: `rotate(${rotate}deg)`,
        color: C.textGold,
        ...pixel,
        fontSize: 13,
        textAlign: "center",
        padding: 8,
        boxSizing: "border-box",
      }}
    >
      <span style={{ opacity: 0.7 }}>
        {label || "PHOTO"}
        <br />
        <Camera size={16} style={{ display: "inline" }} />
      </span>
    </div>
  );
}

/* ─────────────── scrapbook decoration helpers ─────────────── */
function TapeStrip({ top, left, rotate = -12, color = "#d4c89ecc" }) {
  return (
    <div
      style={{
        position: "absolute", top, left, width: 48, height: 14,
        background: color, transform: `rotate(${rotate}deg)`,
        borderRadius: 2, opacity: 0.85, zIndex: 2,
      }}
    />
  );
}

function PinEmoji({ top, right }) {
  return (
    <span style={{ position: "absolute", top, right, fontSize: 16, zIndex: 2 }}>
      {"\u{1F4CC}"}
    </span>
  );
}

function StampBadge({ text }) {
  return (
    <span
      style={{
        display: "inline-block", border: "2px solid #7a3a2a", borderRadius: 4,
        padding: "2px 8px", ...pixel, fontSize: 11, color: "#7a3a2a",
        transform: "rotate(-6deg)", opacity: 0.7,
      }}
    >
      {text}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   JOURNAL PAGE TEMPLATES
   Each is wrapped in forwardRef so react-pageflip can measure it.
   All render at PAGE_W x PAGE_H.
   ═══════════════════════════════════════════════════════════ */

const pageBase = {
  width: PAGE_W,
  height: PAGE_H,
  background: "#efe3cb",
  boxSizing: "border-box",
  overflow: "hidden",
  position: "relative",
};

// ── COVER ──
// How far to nudge the cover art LEFT within its page box (negative = left).
// Rendered slightly wider to keep the right edge covered. Tweak to taste.
const COVER_SHIFT = "-12px";
const CoverPage = forwardRef(function CoverPage(_props, ref) {
  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/coverpage.png"
        alt="Journal Cover"
        /* Nudge the cover slightly LEFT: shift the image left while rendering it
           a touch wider so the box stays fully covered (no empty edge on the
           right). Bump COVER_SHIFT to move it further left. */
        style={{ position: "absolute", top: 0, left: COVER_SHIFT, width: "calc(100% + " + COVER_SHIFT.replace("-", "") + ")", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
});

// ── CLEAN PAGES — blank parchment spread shown right after the cover ──
// Both clean pages are 1122x1402 (aspect 0.800), the exact page-box ratio
// (552/690), so each fills its page with NO shrinking or offset. The leather
// binding/lacing is baked onto the OUTER edge of each as drawn (left_clean:
// left, right_clean: right), so we render them as-is (no mirror): bindings
// frame the outside, matching the closed cover's left spine, and the two
// parchment inner edges meet cleanly down the center.
// Each clean page is shifted inward (toward the spine) by SPINE_NUDGE px so the
// two inner edges overlap slightly and combine into one continuous page with no
// gap. Left page shifts right; right page shifts left. Bump if a sliver shows.
const SPINE_NUDGE = 2; // px each page moves toward the center
const CleanRightPage = forwardRef(function CleanRightPage(_props, ref) {
  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/right_clean.png"
        alt="Clean Right Page"
        /* shift left by SPINE_NUDGE so the inner (left) edge crosses the spine */
        style={{ position: "absolute", top: 0, left: -SPINE_NUDGE, width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
});

// ── ENLISTMENT LEFT — "FIRST DAY" photo page ──
// Same setup as the BMT/clean pages: fills the page and nudged inward by
// SPINE_NUDGE so the inner (right) edge meets the right page at the spine.
const EnlistmentLeft = forwardRef(function EnlistmentLeft(_props, ref) {
  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/enlistment_left.png"
        alt="Enlistment Left"
        style={{ position: "absolute", top: 0, left: SPINE_NUDGE, width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* FIRST-DAY PHOTO — box matched to the measured frame border (vertical
          lines at x:30%/80%, top border y:30%, bottom border y:75.5%). Inset
          ~0.5% to sit just inside the line. The photo fills it with
          objectFit:cover, so any image auto-crops to the frame. */}
      <div style={{
        position: "absolute",
        top: "34%",
        left: "35.5%",
        width: "40%",
        height: "37.5%",
        overflow: "hidden",
        boxShadow: "1px 2px 6px #0005",
      }}>
        <img
          src="/assets/journal/database/enlistment_left_picture.jpg"
          alt="First meal in Tekong"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      {/* CAPTION box below the frame (measured ~ y:83.6%-86.4%, between x:30%-80%) */}
      <div style={{
        position: "absolute",
        top: "76.8%",
        left: "31%",
        width: "50%",
        height: "5%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace",
          fontSize: 19,
          color: C.ink,
          margin: 0,
          textAlign: "center",
        }}>
          First Meal in Tekong
        </p>
      </div>
    </div>
  );
});

// ── ENLISTMENT RIGHT — "LETTER TO MYSELF" written on enlistment day ──
const EnlistmentRight = forwardRef(function EnlistmentRight({ userNote }, ref) {
  // The soldier's own letter, written on day one — raw, scared, hopeful. Reads
  // like a real first-day note: small fears, missing home, not knowing who
  // you'll become. Kept human and a little unsure, not polished.
  const displayNote = userNote
    || "Dear me,\n\nI'm writing this on my first night here and my hands won't stop shaking. I don't know why. Maybe it's the haircut, maybe it's the bed that isn't mine, maybe it's that mum cried at the ferry and I pretended I didn't see.\n\nI don't know anyone. I don't know what tomorrow is. Everyone keeps shouting and I keep getting it wrong and I already feel like I don't belong here.\n\nI'm scared. There, I said it. Scared of failing, scared of letting people down, scared of the next two years feeling this long every single day.\n\nBut I'm here. I showed up. That has to count for something.\n\nSo whoever you are when you read this — I hope you're proud of us. I hope you made some friends. I hope you stopped being so afraid.\n\nSee you on the other side.\n\n— Me, Day 1";

  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/enlistment_right.png"
        alt="Enlistment Right"
        /* Same setup as the BMT/clean pages: fills the page, nudged inward by
           SPINE_NUDGE so the inner (left) edge meets the left page at the spine. */
        style={{ position: "absolute", top: 0, left: -SPINE_NUDGE, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* LETTER TO MYSELF writing area — fits the lined panel below the tab and
          above the ENLISTMENT DATE box (interior ~ x:14%-76%, y:16%-74%). */}
      <div style={{
        position: "absolute",
        top: "24%",
        left: "18%",
        width: "55%",
        height: "56%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace",
          fontSize: 13,
          color: C.ink,
          lineHeight: "15px",
          whiteSpace: "pre-wrap",
          margin: 0,
        }}>
          {displayNote}
        </p>
      </div>
      {/* ENLISTMENT DATE — written on the dotted line in the box at the bottom
          (line ~ y:85.5%, centered ~ x:53%). */}
      <div style={{
        position: "absolute",
        top: "77%",
        left: "45%",
        width: "30%",
        textAlign: "center",
        boxSizing: "border-box",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace",
          fontSize: 15,
          letterSpacing: 1,
          color: C.ink,
          margin: 0,
        }}>
          27 / 2 / 2026
        </p>
      </div>
    </div>
  );
});

// ── BMT CHAPTER LEFT — complete designed spread, image only ──
// Same setup as the clean pages: image is 0.800, the exact page-box ratio, so it
// fills the page (inset:0, 100%/100%) and is nudged inward by SPINE_NUDGE so the
// inner edge meets the right page cleanly at the spine.
const BmtChapterLeft = forwardRef(function BmtChapterLeft(_props, ref) {
  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/bmt_chapter_left.png"
        alt="BMT Chapter Left"
        style={{ position: "absolute", top: 0, left: SPINE_NUDGE, width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
});

// ── BMT CHAPTER RIGHT — group photo spread + the commander's letter ──
const BmtChapterRight = forwardRef(function BmtChapterRight({ commanderNote }, ref) {
  // Personal letter from the section commander to the soldier, written to read
  // like a real handwritten note — specific, warm, a little rough around the
  // edges rather than tidy and generic.
  const cmdNote = commanderNote
    || "Alex,\n\nI still remember you on day one — standing too straight, eyes everywhere, trying so hard not to look scared. You were terrible at planking and you knew it but you kept trying anyways.\n\nThat's what's important. Not the IPPT score. The getting back up. The night Rafiq cramped on the road march, you took his pack without a word and you were already half-dead yourself. Nobody told you to. You just did it.\n\nThese 67 days I watched a boy who flinched at every command turn into someone his section trusts. I didn't make that happen. You did. I just had the privilege of being there for it.\n\nWherever you go next, when it gets hard — and it will — remember you've already done the thing you swore you couldn't.\n\nI'm proud of you, son. Truly.\n\n— 3SG Lim";

  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/bmt_chapter_right.png"
        alt="BMT Chapter Right"
        /* Same setup as the clean pages: fills the page and nudged inward by
           SPINE_NUDGE so the inner (left) edge meets the left page at the spine. */
        style={{ position: "absolute", top: 0, left: -SPINE_NUDGE, width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* SECTION GROUP PHOTO — a box matched to the empty "BROTHERS IN BMT"
          frame (measured inner bounds: L 9.8%, T 22.5%, W 72.2%, H 33.5%). The
          photo lives INSIDE the box and fills it with objectFit:cover, so any
          image is auto-cropped to the frame — no per-image cropping needed. */}
      <div style={{
        position: "absolute",
        top: "22.5%",
        left: "9.8%",
        width: "72.2%",
        height: "33.5%",
        overflow: "hidden",
        boxShadow: "1px 2px 6px #0005",
      }}>
        <img
          src="/assets/journal/database/bmt_right_picture.png"
          alt="Section group photo"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      {/* COMMANDER'S LETTER box (lower-left of the spread) ~ x:8%-64%, y:67%-91% */}
      <div style={{
        position: "absolute",
        top: "63%",
        left: "11%",
        transform: "rotate(-1.1deg)",
        width: "52%",
        height: "30%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace",
          fontSize: 13,
          color: C.ink,
          lineHeight: "11.5px",
          whiteSpace: "pre-wrap",
          margin: 0,
        }}>
          {cmdNote}
        </p>
      </div>
    </div>
  );
});

// ── FIELD CAMP LEFT — photo in the frame + my own note in "LETTER TO MYSELF" ──
const FieldCampLeft = forwardRef(function FieldCampLeft({ userNote }, ref) {
  // My own field-camp memory: the late-night Maggi with my buddy, the half-raw
  // noodles, sharing it anyway. Small, specific, fond.
  const displayNote = userNote
    || "Best part of field camp wasn't the training. It was 2am, remember how you and Hao Jie was hunched over one mess tin of Maggi we cooked on the small fire we started. Half the noodles were still crunchy, the soup was lukewarm, and we only had one spoon between us. Didn't matter. Worst Maggi I've ever eaten.\nBest meal of the whole camp.";

  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/fieldcamp_left.png"
        alt="Field Camp Left"
        /* Same setup as the other pages: nudged inward by SPINE_NUDGE so the
           inner (right) edge meets the right page cleanly at the spine. */
        style={{ position: "absolute", top: 0, left: SPINE_NUDGE, width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* FIELD-CAMP PHOTO — box matched to the empty frame (grid-read interior
          ~ x:20%-82%, y:27%-51%). Photo fills it with objectFit:cover so any
          image auto-crops to the frame — same pattern as the BMT photo. */}
      <div style={{
        position: "absolute",
        top: "31.3%",
        left: "23%",
        width: "60%",
        height: "27.1%",
        overflow: "hidden",
        boxShadow: "1px 2px 6px #0005",
      }}>
        <img
          src="/assets/journal/database/fieldcamp_left_picture.png"
          alt="Late-night campfire"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      {/* PHOTO CAPTION — centered on the parchment just below the photo frame
          (frame bottom ~ y:58.4%), above the LETTER TO MYSELF card. */}
      <div style={{
        position: "absolute",
        top: "59.7%",
        left: "21.5%",
        width: "60%",
        textAlign: "center",
        boxSizing: "border-box",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace",
          fontSize: 22,
          color: C.ink,
          margin: 0,
        }}>
          Late Night Maggi
        </p>
      </div>

      {/* MY NOTE — "LETTER TO MYSELF" lined card (lower-right; writing area
          ~ x:50%-90%, y:70%-89%, below the tab). */}
      <div style={{
        position: "absolute",
        top: "69.2%",
        left: "53.3%",
        width: "40%",
        height: "30%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace",
          fontSize: 12,
          color: C.ink,
          lineHeight: "16px",
          whiteSpace: "pre-wrap",
          margin: 0,
        }}>
          {displayNote}
        </p>
      </div>
    </div>
  );
});

// ── FIELD CAMP RIGHT — buddy's handwritten note in the "BUDDY'S NOTE" card ──
const FieldCampRight = forwardRef(function FieldCampRight({ buddyNote }, ref) {
  // A note Hao Jie wrote to the soldier: he wouldn't have made it without the
  // late-night talks and the jokes that made field camp bearable, even fun.
  const displayNote = buddyNote
    || "Bro, Honestly? I don't think I would've made it through this camp without you. Those late-night talks when neither of us could sleep, sharing that sad cup of Maggi — that's what got me through. Every time I was ready to give up, you'd crack some dumb joke and somehow it didn't feel so bad anymore.\n\nField camp was hell. But with you around it was actually... fun. Thanks for that. I mean it.";

  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/fieldcamp_right.png"
        alt="Field Camp Right"
        /* Same setup as the other pages: nudged inward by SPINE_NUDGE so the
           inner (left) edge meets the left page cleanly at the spine. */
        style={{ position: "absolute", top: 0, left: -SPINE_NUDGE, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* BUDDY'S NOTE lined card (center; writing area below the tab
          ~ x:16%-72%, y:42%-68%, grid-measured). */}
      <div style={{
        position: "absolute",
        top: "43%",
        left: "20%",
        width: "54%",
        height: "26%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace",
          fontSize: 14,
          color: C.ink,
          lineHeight: "14px",
          whiteSpace: "pre-wrap",
          margin: 0,
        }}>
          {displayNote}
        </p>
      </div>
    </div>
  );
});

// ── POP LEFT — passing-out parade spread, image only ──
const PopLeft = forwardRef(function PopLeft(_props, ref) {
  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/pop_left.png"
        alt="POP Left"
        /* Same setup as the other pages: nudged inward by SPINE_NUDGE so the
           inner (right) edge meets the right page cleanly at the spine. */
        style={{ position: "absolute", top: 0, left: SPINE_NUDGE, width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* POP PHOTO — box matched to the empty frame (grid-read interior
          ~ x:31%-91%, y:46%-77%). Photo fills it with objectFit:cover. */}
      <div style={{
        position: "absolute",
        top: "45.7%",
        left: "37.7%",
        width: "56%",
        height: "27.7%",
        overflow: "hidden",
        boxShadow: "1px 2px 6px #0005",
      }}>
        <img
          src="/assets/journal/database/pop_left_picture.png"
          alt="Section on POP day"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      {/* CAPTION box below the frame (~ y:80%-86%, x:31%-91%) */}
      <div style={{
        position: "absolute",
        top: "75.5%",
        left: "35.5%",
        width: "60%",
        height: "5%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace",
          fontSize: 18,
          color: C.ink,
          margin: 0,
          textAlign: "center",
        }}>
          SCORPION PLATOON 2 SECTION 1
        </p>
      </div>
    </div>
  );
});

// ── POP RIGHT — graduation spread + commander's send-off in COMMANDER'S NOTE slot ──
const PopRight = forwardRef(function PopRight({ commanderNote }, ref) {
  // POP send-off — different in tone from the enlistment (welcome) and BMT
  // (proud-of-your-progress) notes: this one is a farewell as the soldier
  // graduates BMT and moves on to their vocation.
  const displayNote = commanderNote
    || "Hi Alex,\n\nMy job was to take a scared recruit and hand back a soldier. Today I'm done. You don't need me anymore.\n\nWherever you post out to, lead the way you marched: heart first. Make us proud.\n\nIt was truly an honour to have you as part of my section and I wish you all the best!!!\n\n— 3SG Lim";

  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/pop_right.png"
        alt="POP Right"
        /* Same setup as the other pages: nudged inward by SPINE_NUDGE so the
           inner (left) edge meets the left page cleanly at the spine. */
        style={{ position: "absolute", top: 0, left: -SPINE_NUDGE, width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* POP PHOTO — box matched to the top-right frame (grid-read interior
          ~ x:31%-84%, y:8%-36%). Photo fills it with objectFit:cover. */}
      <div style={{
        position: "absolute",
        top: "9.7%",
        left: "30.4%",
        width: "51%",
        height: "25%",
        transform: "rotate(3.7deg)",
        overflow: "hidden",
        boxShadow: "1px 2px 6px #0005",
      }}>
        <img
          src="/assets/journal/database/pop_right_picture.png"
          alt="Caps thrown at POP"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      {/* CAPTION strip below the frame (~ y:39%-43%, x:31%-84%) */}
      <div style={{
        position: "absolute",
        top: "35.7%",
        left: "28.4%",
        width: "53%",
        height: "4%",
        transform: "rotate(3.8deg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace",
          fontSize: 15,
          color: C.ink,
          margin: 0,
          textAlign: "center",
        }}>
          POP LOH!
        </p>
      </div>

      {/* COMMANDER'S LETTER lined card (left side; writing area below the tab
          ~ x:11%-56%, y:57%-87%, grid-measured). */}
      <div style={{
        position: "absolute",
        top: "51%",
        left: "10%",
        width: "40%",
        height: "30%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace",
          fontSize: 14,
          color: C.ink,
          lineHeight: "14px",
          whiteSpace: "pre-wrap",
          margin: 0,
        }}>
          {displayNote}
        </p>
      </div>
    </div>
  );
});

// ── MEMORIES LEFT — "Memories you've been part of" photo wall, image only ──
// Same setup as the other left pages: fills the page, nudged inward by
// SPINE_NUDGE so the inner (right) edge meets the right page at the spine.
const MemoriesLeft = forwardRef(function MemoriesLeft(_props, ref) {
  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/memories_left.png"
        alt="Memories you've been part of"
        style={{ position: "absolute", top: 0, left: SPINE_NUDGE, width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
});

// ── MEMORIES RIGHT — second half of the photo-wall spread, image only ──
const MemoriesRight = forwardRef(function MemoriesRight(_props, ref) {
  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/memories_right.png"
        alt="More memories"
        style={{ position: "absolute", top: 0, left: -SPINE_NUDGE, width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
});

// ── LAST PAGE — final back cover, image only (self-contained) ──
const LastPage = forwardRef(function LastPage(_props, ref) {
  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/lastpage.png"
        alt="Last Page"
        style={{ position: "absolute", left: 0, right: 0, top: "1%", width: "100%", height: "99%", objectFit: "cover", objectPosition: "top" }}
      />
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════
   LETTER STACK — "cue card" letter viewer
   A face-up pile of letters. The front letter flicks UP, scales toward you,
   then tucks DOWN-AND-BACK behind the pile; the next letter rises into focus.
   Loops forever. Driven by: click the stack, ← → arrows (when focused), or
   drag the front card up. Pure GPU transforms (translate3d/rotateX/scale) on a
   perspective stage, so it stays smooth. Placeholder letters now; swap `text`
   (and later a background image) for real assets.

   The math: each visible card gets a "slot" 0..N-1 where 0 = front. We render
   them by slot with depth styling (deeper = smaller, dimmer, nudged up so you
   see stacked edges). Advancing just rotates which letter sits in slot 0; the
   leaving card animates along the toss arc before re-seating at the back.
   ═══════════════════════════════════════════════════════════ */

// Placeholder letters — the soldier writing to their FUTURE self at different
// points across the two years. `photo` fills the polaroid frame on the card;
// reuses the existing journal database photos (cycled). Replace text/photo with
// real entries later.
const STACK_LETTERS = [
  {
    id: "L1",
    from: "TO FUTURE ME",
    date: "WEEK 1",
    photo: "/assets/journal/database/letter1.png",
    caption: "First light, ankle-deep",
    text: "Dear future me,\n\nWe were crouched in the water before sunrise, rifles raised, nobody saying a word. The sky turned orange over the treeline and I forgot how cold my boots were.\n\nI don't know any of these guys yet. My hands won't stop shaking and I keep getting everything wrong.\n\nBut kneeling there in the dark with all of them, I felt like maybe I could belong here.\n\nI hope you remember this morning. I hope you stopped being so afraid.",
  },
  {
    id: "L2",
    from: "TO FUTURE ME",
    date: "WEEK 4",
    photo: "/assets/journal/database/letter2.png",
    caption: "Night watch on the hill",
    text: "Hey,\n\nTook this on the hill during night sentry. Hao Jie and I sat in the long grass under more stars than I've ever seen, reading old letters from home by torchlight.\n\nIt was freezing and we were dead tired, but neither of us wanted to move. We just talked until our shift ended.\n\nFour weeks in and these strangers already feel like brothers. The quiet moments are the ones I want to keep.\n\nDon't ever forget how this felt.",
  },
  {
    id: "L3",
    from: "TO FUTURE ME",
    date: "WEEK 9",
    photo: "/assets/journal/database/letter3.png",
    caption: "Caught in the rain",
    text: "Me again,\n\nField camp. The rain came down in sheets and didn't stop for two days. We stood there soaked to the bone, watching the sun set through the downpour, too tired to even complain.\n\nMud everywhere, slept in a shellscrape, ate cold rations. And somehow, against all odds, I loved every miserable minute of it.\n\nThere's something about being wet and freezing alongside the people you'd do anything for.\n\nWho even am I now? Whoever you are, I think we turned out okay.",
  },
  {
    id: "L4",
    from: "TO FUTURE ME",
    date: "WEEK 13",
    photo: "/assets/journal/database/letter4.png",
    caption: "Crossing alone",
    text: "Halfway through now.\n\nWe were moving through the woods when I had to wade across this stream alone, water up to my knees, rifle held high, the section already on the far bank.\n\nFor a second it was completely silent. Just me, the cold water, and the trees. The boy who cried at the ferry would never have made it this far.\n\nToday I carried someone's pack without being asked. I'd never have done that before.\n\nKeep going. You've crossed worse than this. Getting there, one step at a time.",
  },
  {
    id: "L5",
    from: "TO FUTURE ME",
    date: "WEEK 17",
    photo: "/assets/journal/database/letter5.png",
    caption: "The boar incident",
    text: "You will not believe this one.\n\nWe were on the move at dusk when a wild boar came charging out of the grass. The whole section scattered, packs flying, everyone yelling. I've never run so fast in my life.\n\nNobody got hurt, and once we caught our breath we couldn't stop laughing. That photo is pure chaos, the thing barrelling past while we ran.\n\nPOP is close now. I passed. The commander said he was proud and I had to look away.\n\nRemember this when civilian life gets soft. You did it all, boar and all. yippieee",
  },
  {
    id: "L6",
    from: "TO FUTURE ME",
    date: "ORD",
    photo: "/assets/journal/database/letter6.png",
    caption: "The last one",
    text: "The last letter.\n\nThis is us at the end, standing by the vehicle as the light went down, kitted up and ready, not a scared recruit among us anymore.\n\nTwo years. Done. The marches, the rain, the boar, the cold night watches, the brothers who became family. If you're reading this as a civilian, please don't let it fade.\n\nWe walked in not knowing who we'd become. We're walking out knowing exactly.\n\nThank you for not giving up on us. We grew up in here.\n\nDon't forget any of it.",
  },
];

// One letter sheet. The card art (card.png — a lined notebook page, 2032x1347)
// is the shared background: an empty polaroid frame sits TOP-LEFT, with ruled
// lines to its right and full-width below. We drop the letter's photo into the
// frame, a caption under it, and the handwritten text over the lines (beside
// the frame, then carrying on full-width below it).
function LetterSheet({ letter }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        borderRadius: 6,
        boxShadow: "0 10px 24px #0006",
        overflow: "hidden",
      }}
    >
      <img
        src="/assets/journal/card.png"
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", display: "block" }}
      />

      {/* PHOTO — fills the baked polaroid frame top-left (frame interior
          ~ x:6.5%-37%, y:9%-46%). objectFit:cover auto-crops any image. */}
      <div style={{
        position: "absolute",
        top: "9.5%",
        left: "7%",
        width: "29%",
        height: "37%",
        overflow: "hidden",
        boxShadow: "1px 2px 5px #0004",
      }}>
        <img
          src={letter.photo}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      {/* CAPTION — centered under the polaroid frame (~ y:48%). */}
      <div style={{
        position: "absolute",
        top: "46.2%",
        left: "6%",
        width: "31%",
        textAlign: "center",
      }}>
        <span style={{ fontFamily: "'VT323', monospace", fontSize: 16, color: C.inkSoft }}>
          {letter.caption}
        </span>
      </div>

      {/* HEADER — the "TO FUTURE ME · WEEK" line, on the top ruled lines to the
          right of the photo (~ x:41%-95%). */}
      <div
        className="flex items-baseline justify-between"
        style={{ position: "absolute", top: "12%", left: "41%", width: "52%" }}
      >
        <span style={{ ...pixel, fontSize: 17, color: C.ink }}>{letter.from}</span>
        <span style={{ ...pixel, fontSize: 14, color: C.inkSoft }}>{letter.date}</span>
      </div>

      {/* BODY — handwriting over the lines: starts beside the photo (top band,
          right of the frame) and carries on full-width below it. A left-side
          float the height of the photo keeps the first lines clear of the
          frame, then the text wraps full width underneath. */}
      <div style={{
        position: "absolute",
        top: "22.5%",
        left: "10%",
        width: "86%",
        height: "73%",
        overflow: "hidden",
      }}>
        {/* spacer that clears the polaroid AND its caption for the opening lines,
            so text only wraps back to full width once it's fully below them. The
            body starts at 22.5% (≈104px); the photo+caption bottom is ≈232px, so
            the spacer must span ≈128px. Rounded UP to a whole multiple of the
            21.8px line pitch (6 lines ≈ 131px) so the resuming line lands on a
            rule. */}
        <div style={{ float: "left", width: "35%", height: 131 }} aria-hidden="true" />
        <p
          style={{
            fontFamily: "'VT323', monospace",
            fontSize: 19,
            /* Locked to the card's ruled-line spacing so each wrapped line lands
               on a rule. The art has rules every 51px at native 1086px height,
               which is 51 * 464/1086 ≈ 21.8px at the rendered CARD_H. */
            lineHeight: "21.8px",
            color: C.ink,
            whiteSpace: "pre-wrap",
            margin: 0,
          }}
        >
          {letter.text}
        </p>
      </div>
    </div>
  );
}

// Card matches the notebook art aspect (2032 x 1347 ≈ 1.508), landscape.
const CARD_W = 700;
const CARD_H = 464;

// Resting placement for a card at depth `slot` in the pile (0 = front, facing
// you). Deeper cards sit DOWN-and-RIGHT so their edges peek out from under the
// front card — a visible, physical stack. Fully opaque (paper occludes); depth
// reads from the offset, never transparency. Returns raw numbers so the render
// loop can INTERPOLATE between slots as the user scrolls.
function pileSlot(slot, count) {
  const depth = Math.min(slot, count - 1);
  return {
    x: depth * 12,            // peek to the right
    y: depth * 14,            // and down
    z: -depth * 40,           // slight recede
    s: 1 - depth * 0.035,     // barely shrink
  };
}

// The front card's STRAIGHT UP-AND-OVER path, sampled at t∈[0,1]. t=0 = front
// slot; t=1 lands exactly on the rear slot. It rises straight up (no sideways
// swing), lifts toward you over the top of the pile, then comes down onto the
// back. `rear` = rear slot numbers. Returns transform + a 0..1 `lift` (height
// off the pile) for the contact shadow.
const LIFT_UP = 150;     // px the card rises above the pile at the peak
const LIFT_TOWARD = 140; // px it comes toward you (Z) at the peak
function frontPath(t, rear) {
  const e = t * t * (3 - 2 * t);                  // smoothstep along the slot lerp
  const lift = Math.sin(Math.min(Math.max(t, 0), 1) * Math.PI); // 0→1→0 bump
  const x = e * rear.x;                            // no swing — straight over
  const y = e * rear.y - lift * LIFT_UP;           // up and over, then settle
  const z = e * rear.z + lift * LIFT_TOWARD;       // toward you, then back
  const s = (1 - e) + e * rear.s + lift * 0.06;    // grow slightly at the peak
  const rotX = lift * 8;                            // gentle tilt as it lifts
  return {
    transform:
      "translate3d(calc(-50% + " + x.toFixed(2) + "px), calc(-50% + " + y.toFixed(2) + "px), " + z.toFixed(2) + "px) rotateX(" + rotX.toFixed(2) + "deg) scale(" + s.toFixed(4) + ")",
    lift,
  };
}

function slotTransform(p) {
  return (
    "translate3d(calc(-50% + " + p.x.toFixed(2) + "px), calc(-50% + " + p.y.toFixed(2) + "px), " + p.z.toFixed(2) + "px) scale(" + p.s.toFixed(4) + ")"
  );
}

// How much wheel delta equals one full card transition. Higher = scroll more.
const WHEEL_PER_CARD = 360;

export function LetterStack({ letters = STACK_LETTERS, onClose }) {
  void onClose; // reserved: e.g. close overlay after the last letter (future)
  const count = letters.length;
  // `front` = index of the letter on top (React state — only changes on commit,
  // so re-renders are rare). Everything in-flight is driven imperatively below.
  const [front, setFront] = useState(0);
  const frontRef = useRef(0);
  React.useEffect(function () { frontRef.current = front; }, [front]);

  // `prog` = signed scroll progress of the in-flight transition, kept in a REF
  // (never state) so wheel ticks don't trigger React renders. 0 = settled;
  // 0→1 = front going to the back (scroll down); 0→-1 = rear coming forward.
  const progRef = useRef(0);    // the RENDERED progress (eased toward target)
  const targetRef = useRef(0);  // where the wheel WANTS prog to be (accumulates)
  const runningRef = useRef(false);
  const stageRef = useRef(null);
  const cardRefs = useRef([]);     // DOM nodes per letter, by index
  const shadowRef = useRef(null);  // single contact-shadow node
  const rafRef = useRef(0);
  const snapRaf = useRef(0);
  const idleTimer = useRef(0);
  const counterRef = useRef(null); // the big "N" number node
  const tickRefs = useRef([]);     // the 6 side ticks

  // Paint the current prog directly onto the DOM. One pass, no React. Called
  // from a single rAF so multiple wheel ticks in a frame coalesce into one paint
  // → buttery 1:1 tracking.
  const paint = useCallback(function paint() {
    rafRef.current = 0;
    const f = frontRef.current;
    const prog = progRef.current;
    const goingBack = prog >= 0;
    const t = Math.min(1, Math.abs(prog));
    const travellerSlot = goingBack ? 0 : (count - 1);
    const rear = pileSlot(count - 1, count);

    let travellerLift = 0;
    let travellerNode = null;

    for (let i = 0; i < count; i++) {
      const node = cardRefs.current[i];
      if (!node) continue;
      const slot = (i - f + count) % count;
      const isTraveller = slot === travellerSlot && t > 0.0001;

      if (isTraveller) {
        const pt = frontPath(goingBack ? t : 1 - t, rear);
        node.style.transform = pt.transform;
        // Float above the pile near the top of the arc; drop behind past the
        // peak so it tucks UNDER as it lands.
        const overPile = goingBack ? t < 0.7 : t > 0.3;
        node.style.zIndex = overPile ? count + 5 : 0;
        travellerLift = pt.lift;
        travellerNode = node;
      } else {
        const from = pileSlot(slot, count);
        const toSlot = (goingBack ? slot - 1 : slot + 1 + count) % count;
        const to = pileSlot(toSlot, count);
        const k = t;
        const p = {
          x: from.x + (to.x - from.x) * k,
          y: from.y + (to.y - from.y) * k,
          z: from.z + (to.z - from.z) * k,
          s: from.s + (to.s - from.s) * k,
        };
        node.style.transform = slotTransform(p);
        node.style.zIndex = String(count - Math.min(slot, count - 1));
      }
    }

    // Contact shadow follows the traveller's lift.
    const sh = shadowRef.current;
    if (sh) {
      if (travellerNode && travellerLift > 0.001) {
        sh.style.opacity = String(0.34 * (1 - travellerLift * 0.8));
        sh.style.width = CARD_W * (0.86 + travellerLift * 0.22) + "px";
        sh.style.filter = "blur(" + (6 + travellerLift * 16) + "px)";
        sh.style.transform = "translate(-50%, " + (CARD_H * 0.16 - travellerLift * 10) + "px)";
      } else {
        sh.style.opacity = "0";
      }
    }
  }, [count]);

  // Update the side indicator (counter + ticks) imperatively — never via React,
  // so card boundaries don't trigger re-renders mid-scroll.
  const paintIndicator = useCallback(function paintIndicator(nf) {
    if (counterRef.current) counterRef.current.textContent = String(nf + 1);
    for (let i = 0; i < count; i++) {
      const tk = tickRefs.current[i];
      if (tk) {
        const on = i === nf;
        tk.style.background = on ? C.gold : C.textGold;
        tk.style.opacity = on ? "1" : "0.35";
        tk.style.height = on ? "22px" : "10px";
      }
    }
  }, [count]);

  // Commit a whole step: advance/retreat the VISUAL front (ref only). The side
  // indicator updates imperatively. `front` React state is synced lazily (not on
  // the hot path) just so a remount/key change stays consistent — it does NOT
  // drive the cards, so this never stalls the scroll.
  const commit = useCallback(function commit(dir) {
    const nf = (frontRef.current + dir + count) % count;
    frontRef.current = nf;
    paintIndicator(nf);
    setFront(nf);
  }, [count, paintIndicator]);

  // The single persistent animation loop. Every frame it eases the RENDERED
  // `prog` a fraction of the way toward `target`, commits whole-card rollovers,
  // paints, and — when the wheel has gone quiet — pulls `target` to the nearest
  // resting point (snap). This decouples steppy wheel notches from the motion:
  // notches just bump `target`; the card always glides smoothly toward it.
  const idleSinceRef = useRef(0);
  const tick = useCallback(function tick() {
    const now = performance.now();
    // If the wheel's been quiet a moment, snap the TARGET to nearest rest.
    if (now - idleSinceRef.current > 90) {
      const tg = targetRef.current;
      if (tg > 0.25) targetRef.current = 1;
      else if (tg < -0.25) targetRef.current = -1;
      else targetRef.current = 0;
    }
    // Ease rendered prog toward target (smoothing factor → higher = snappier).
    const cur = progRef.current;
    const tgt = targetRef.current;
    let v = cur + (tgt - cur) * 0.18;
    if (Math.abs(tgt - v) < 0.0015) v = tgt; // settle exactly
    // Roll whole cards on BOTH prog and target together so indices stay aligned.
    while (v >= 1) { commit(1); v -= 1; targetRef.current -= 1; }
    while (v <= -1) { commit(-1); v += 1; targetRef.current += 1; }
    progRef.current = v;
    paint();
    // Keep running until fully settled (prog == target == 0/at rest).
    if (v !== targetRef.current || targetRef.current !== 0) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      runningRef.current = false;
    }
  }, [paint, commit]);

  const kick = useCallback(function kick() {
    if (!runningRef.current) {
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  function onWheel(e) {
    e.preventDefault();
    e.stopPropagation();
    // Accumulate intent into target; clamp so one flick can't overshoot wildly.
    let tg = targetRef.current + e.deltaY / WHEEL_PER_CARD;
    tg = Math.max(-2, Math.min(2, tg));
    targetRef.current = tg;
    idleSinceRef.current = performance.now();
    kick();
  }

  // Arrow keys nudge the target by a whole card (smoothly eased by the loop).
  function onKeyDown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault(); targetRef.current = Math.round(targetRef.current) + 1; idleSinceRef.current = 0; kick();
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault(); targetRef.current = Math.round(targetRef.current) - 1; idleSinceRef.current = 0; kick();
    }
  }

  // Jump straight to a letter (tick click): set front, reset motion.
  const jumpTo = useCallback(function jumpTo(i) {
    cancelAnimationFrame(rafRef.current);
    runningRef.current = false;
    progRef.current = 0; targetRef.current = 0;
    const dir = ((i - frontRef.current) % count + count) % count;
    commit(dir);
    paint();
  }, [commit, paint, count]);

  // Initial paint + cleanup.
  React.useEffect(function () {
    paint();
    return function () {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(snapRaf.current);
      clearTimeout(idleTimer.current);
    };
  }, [paint]);

  return (
    <div
      className="flex items-center"
      style={{ width: "100%", justifyContent: "center", gap: 0, position: "relative" }}
    >
      <div className="flex flex-col items-center">
        {/* Perspective stage. Scroll to move letters; arrow keys also work.
            stopPropagation here keeps clicks/scroll on the cards from bubbling
            up to the overlay backdrop (which would close it) — but clicks in the
            empty margins around the stack DO bubble, so clicking outside closes. */}
        <div
          ref={stageRef}
          role="button"
          tabIndex={0}
          aria-label="Letters — scroll to move the top letter up and over to the back"
          onWheel={onWheel}
          onClick={function (e) { e.stopPropagation(); }}
          onKeyDown={function (e) { e.stopPropagation(); onKeyDown(e); }}
          style={{
            position: "relative",
            width: 820,
            height: 600,
            perspective: 1900,
            outline: "none",
            touchAction: "none",
            cursor: "ns-resize",
          }}
        >
          {/* Single contact shadow, positioned by the paint loop. */}
          <div
            ref={shadowRef}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: CARD_W * 0.86,
              height: 26,
              borderRadius: "50%",
              background: "#000",
              opacity: 0,
              zIndex: 0,
              pointerEvents: "none",
              transform: "translate(-50%, " + CARD_H * 0.16 + "px)",
            }}
          />
          {letters.map(function (letter, i) {
            return (
              <div
                key={letter.id}
                ref={function (el) { cardRefs.current[i] = el; }}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: CARD_W,
                  height: CARD_H,
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  opacity: 1,
                  willChange: "transform",
                }}
              >
                <LetterSheet letter={letter} />
              </div>
            );
          })}
        </div>
      </div>

      {/* SIDE INDICATOR — pinned to the far RIGHT of the overlay: a big
          "N / total" counter over a vertical strip of ticks (one per letter).
          Updated imperatively on commit, so it never re-renders the cards.
          Click a tick to jump straight to that letter. */}
      <div
        className="flex flex-col items-center"
        style={{ position: "absolute", right: -96, top: "50%", transform: "translateY(-50%)", gap: 16, userSelect: "none" }}
        onClick={function (e) { e.stopPropagation(); }}
      >
        <div className="flex items-baseline" style={{ ...pixel, color: C.textGold }}>
          <span ref={counterRef} style={{ fontSize: 44, color: C.gold, lineHeight: 1 }}>{front + 1}</span>
          <span style={{ fontSize: 22, opacity: 0.7 }}>&nbsp;/&nbsp;{count}</span>
        </div>
        <div className="flex flex-col items-center" style={{ gap: 10 }}>
          {letters.map(function (letter, i) {
            const isFront = i === front;
            return (
              <button
                key={letter.id}
                type="button"
                aria-label={"Go to letter " + (i + 1)}
                ref={function (el) { tickRefs.current[i] = el; }}
                onClick={function (e) { e.stopPropagation(); jumpTo(i); }}
                style={{
                  width: 7,
                  height: isFront ? 26 : 12,
                  padding: 0,
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  background: isFront ? C.gold : C.textGold,
                  opacity: isFront ? 1 : 0.35,
                  transition: "height 0.25s ease, background 0.25s ease, opacity 0.25s ease",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── ENVELOPE HOTSPOT — the on-page trigger that opens the letters overlay.
// The envelope, title, and "Click to look at your letters" are all baked into
// letters_left.png, so this is just an INVISIBLE clickable region positioned
// over the painted envelope. Clicking it opens the focal overlay.
function EnvelopeHotspot({ onOpen }) {
  const btnRef = useRef(null);

  // StPageFlip binds NATIVE mousedown/touchstart listeners on its own wrapper and
  // flips the page based on where you click (left side → previous page). React's
  // synthetic stopPropagation can't reliably stop a native listener on a parent,
  // so we attach our own NATIVE capture-phase listeners on the hotspot and stop
  // the event there — before it ever reaches StPageFlip's handler.
  React.useEffect(function () {
    const el = btnRef.current;
    if (!el) return undefined;
    function swallow(e) { e.stopPropagation(); }
    const opts = { capture: true };
    el.addEventListener("mousedown", swallow, opts);
    el.addEventListener("touchstart", swallow, opts);
    el.addEventListener("pointerdown", swallow, opts);
    el.addEventListener("mouseup", swallow, opts);
    el.addEventListener("touchend", swallow, opts);
    return function () {
      el.removeEventListener("mousedown", swallow, opts);
      el.removeEventListener("touchstart", swallow, opts);
      el.removeEventListener("pointerdown", swallow, opts);
      el.removeEventListener("mouseup", swallow, opts);
      el.removeEventListener("touchend", swallow, opts);
    };
  }, []);

  // Sits over the painted envelope (roughly the lower-center of the art). The
  // box is transparent; cursor:pointer is the only affordance, on top of the
  // baked-in "Click to look at your letters" prompt.
  return (
    <button
      type="button"
      ref={btnRef}
      onClick={function (e) { e.stopPropagation(); onOpen(); }}
      aria-label="Open letters to yourself"
      style={{
        position: "absolute",
        top: "30%",
        left: "20%",
        width: "60%",
        height: "66%",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        zIndex: 3,
      }}
    />
  );
}

// ── LETTERS OVERLAY — dims the whole book and centers the cue-card stack as the
// focal point. Close via backdrop, X, or Esc. Rendered above the flipbook.
function LettersOverlay({ onClose }) {
  React.useEffect(function () {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return function () { document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // react-pageflip binds mousemove/touchmove on WINDOW (not its wrapper) and
  // peels the page toward the cursor on EVERY move (hover preview) — a window
  // listener isn't blocked by the overlay being on top. While the overlay is
  // open we intercept just the MOVE events in the window CAPTURE phase and
  // stopPropagation, which prevents StPageFlip's (bubble-phase) window listeners
  // from running, so the book stays still. We deliberately do NOT block
  // mousedown/up/click — those still reach React, so the overlay's click-to-
  // close and the letter cards keep working (the cards don't use move events).
  React.useEffect(function () {
    function block(e) { e.stopPropagation(); }
    const types = ["mousemove", "touchmove", "pointermove"];
    types.forEach(function (t) { window.addEventListener(t, block, true); });
    return function () {
      types.forEach(function (t) { window.removeEventListener(t, block, true); });
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Letters to yourself"
      style={{ animation: "wgt-fade 0.25s ease", background: "#11100bd9" }}
      // Click ANYWHERE in the overlay closes it. The letters area below calls
      // stopPropagation so clicks on the cards/ticks don't bubble here. All
      // pointer events are captured by this fixed layer, so the book underneath
      // never receives them while the overlay is open.
      onClick={onClose}
      onPointerDown={function (e) { e.stopPropagation(); }}
      onWheel={function (e) { e.stopPropagation(); }}
    >
      {/* Focal content — title + subtitle + the letter stack. */}
      <div className="relative flex flex-col items-center" style={{ animation: "wgt-pop 0.3s ease" }}>
        <p style={{ ...pixel, fontSize: 26, color: C.textGold, letterSpacing: 1, textShadow: "0 2px 4px #000", marginBottom: 2 }}>
          LETTERS FROM YOURSELF
        </p>
        <p style={{ ...pixel, fontSize: 14, color: C.textGold, opacity: 0.7, marginBottom: 18, letterSpacing: 1 }}>
          SCROLL TO LOOK THROUGH YOUR LETTERS
        </p>
        <LetterStack onClose={onClose} />
      </div>
    </div>
  );
}

// ── LETTERS PAGE — the "Letters to My Future Self" page. The envelope, title,
// and "Click to look at your letters" prompt are all baked into letters_left.png;
// we overlay an invisible hotspot over the envelope that opens the overlay. In a
// SHARED (public) view the letters are private, so the hotspot is replaced with
// a small "kept private" note instead of being openable. ──
const LettersPage = forwardRef(function LettersPage({ onOpenLetters, shared = false }, ref) {
  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/letters_left.png"
        alt="Letters to My Future Self"
        /* Left page: nudged inward by SPINE_NUDGE so the inner (right) edge meets
           the right page cleanly at the spine. */
        style={{ position: "absolute", top: 0, left: SPINE_NUDGE, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {shared ? (
        <div
          style={{
            position: "absolute",
            top: "38%",
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            opacity: 0.85,
          }}
        >
          <Lock size={34} style={{ color: C.inkSoft }} />
          <p style={{ ...pixel, fontSize: 16, color: C.inkSoft, textAlign: "center", maxWidth: 220 }}>
            These letters are private to the writer.
          </p>
        </div>
      ) : (
        <EnvelopeHotspot onOpen={onOpenLetters} />
      )}
    </div>
  );
});

// ── MILESTONE ──
const MilestonePage = forwardRef(function MilestonePage({ entry }, ref) {
  return (
    <div ref={ref} style={{ ...pageBase, padding: 24 }}>
      <TapeStrip top={12} left={20} />
      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Award size={20} style={{ color: C.green }} />
          <span style={{ ...pixel, fontSize: 10, color: C.inkSoft }}>{entry.date}</span>
        </div>
        <h2 style={{ ...pixel, fontSize: 28, color: C.ink, lineHeight: 1.1, margin: "0 0 12px" }}>{entry.title}</h2>
        <PlaceholderImg label={entry.imageLabel} h={200} />
        <p style={{ ...pixel, fontSize: 15, color: C.ink, marginTop: 14, lineHeight: 1.4 }}>{entry.text}</p>
      </div>
      <StampBadge text="MILESTONE" />
      <PinEmoji top={6} right={6} />
    </div>
  );
});

// ── PHOTO COLLAGE ──
const CollagePage = forwardRef(function CollagePage({ entry }, ref) {
  return (
    <div ref={ref} style={{ ...pageBase, padding: 20 }}>
      <TapeStrip top={10} left={30} rotate={-8} />
      <h2 style={{ ...pixel, fontSize: 22, color: C.ink, lineHeight: 1.1, margin: "8px 0 6px" }}>{entry.title}</h2>
      <span style={{ ...pixel, fontSize: 10, color: C.inkSoft }}>{entry.date}</span>
      <div style={{
        display: "grid",
        gridTemplateColumns: entry.photos.length > 4 ? "1fr 1fr 1fr" : "1fr 1fr",
        gap: 10, marginTop: 14,
      }}>
        {entry.photos.map(function (p, i) {
          return (
            <div key={i} style={{ background: "white", padding: 4, paddingBottom: 18, boxShadow: "2px 3px 8px #00000033", transform: "rotate(" + p.rotate + "deg)" }}>
              <PlaceholderImg label={p.label} h={entry.photos.length > 4 ? 90 : 120} rotate={0} />
              <p style={{ ...pixel, fontSize: 9, color: C.inkSoft, textAlign: "center", marginTop: 2 }}>{p.label}</p>
            </div>
          );
        })}
      </div>
      <PinEmoji top={4} right={4} />
    </div>
  );
});

// ── SQUAD ──
const SquadPage = forwardRef(function SquadPage({ entry }, ref) {
  return (
    <div ref={ref} style={{ ...pageBase, padding: 24 }}>
      <TapeStrip top={10} left={40} rotate={-5} color="#c4b98ecc" />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <UsersIcon size={18} style={{ color: C.green }} />
        <span style={{ ...pixel, fontSize: 10, color: C.inkSoft }}>{entry.date}</span>
      </div>
      <h2 style={{ ...pixel, fontSize: 28, color: C.ink, lineHeight: 1.1, margin: "0 0 10px" }}>{entry.title}</h2>
      <PlaceholderImg label={entry.imageLabel} h={160} />
      <p style={{ ...pixel, fontSize: 14, color: C.ink, marginTop: 12, lineHeight: 1.4 }}>{entry.text}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {entry.mates.map(function (m) {
          return (
            <span key={m} style={{
              ...pixel, fontSize: 11, background: C.green, color: C.textGold,
              borderRadius: 6, padding: "3px 8px",
            }}>{m}</span>
          );
        })}
      </div>
      <PinEmoji top={6} right={6} />
    </div>
  );
});

// ── REFLECTION (text-heavy) ──
const ReflectionPage = forwardRef(function ReflectionPage({ entry }, ref) {
  return (
    <div ref={ref} style={{ ...pageBase, padding: 28, display: "flex", flexDirection: "column" }}>
      <TapeStrip top={14} left={24} rotate={-10} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Pen size={16} style={{ color: C.green }} />
        <span style={{ ...pixel, fontSize: 10, color: C.inkSoft }}>{entry.date}</span>
      </div>
      <h2 style={{ ...pixel, fontSize: 24, color: C.ink, lineHeight: 1.1, margin: "0 0 14px" }}>{entry.title}</h2>
      <div style={{
        flex: 1, padding: 16, borderRadius: 8,
        background: "repeating-linear-gradient(transparent, transparent 27px, #c4b98e55 27px, #c4b98e55 28px)",
        backgroundSize: "100% 28px",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace", fontSize: 15, color: C.ink,
          lineHeight: "28px", whiteSpace: "pre-wrap", margin: 0,
        }}>
          {entry.text}
        </p>
      </div>
      <PinEmoji top={6} right={6} />
    </div>
  );
});

// ── LETTER (sealed / locked) ──
const LetterPage = forwardRef(function LetterPage({ entry }, ref) {
  return (
    <div ref={ref} style={{ ...pageBase, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {entry.locked ? (
        <React.Fragment>
          <div style={{
            width: 240, padding: "32px 24px", background: "#d8c7a4",
            border: "2px solid #9a8a6a", borderRadius: 4, textAlign: "center",
            boxShadow: "3px 4px 12px #00000022",
          }}>
            <Mail size={40} style={{ color: "#7a3a2a", marginBottom: 12 }} />
            <p style={{ ...pixel, fontSize: 18, color: C.ink }}>{entry.title}</p>
            <p style={{ ...pixel, fontSize: 12, color: C.inkSoft, marginTop: 4 }}>{entry.date}</p>
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Lock size={14} style={{ color: "#7a3a2a" }} />
              <span style={{ ...pixel, fontSize: 11, color: "#7a3a2a" }}>SEALED UNTIL ORD</span>
            </div>
          </div>
          <StampBadge text="TIME CAPSULE" />
        </React.Fragment>
      ) : (
        <div style={{ width: "100%", padding: 16 }}>
          <h2 style={{ ...pixel, fontSize: 22, color: C.ink, marginBottom: 12 }}>{entry.title}</h2>
          <p style={{ fontFamily: "'VT323', monospace", fontSize: 15, color: C.ink, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {entry.text}
          </p>
        </div>
      )}
    </div>
  );
});

// ── BACK COVER ──
const BackCover = forwardRef(function BackCover(_props, ref) {
  return (
    <div ref={ref} style={{ ...pageBase, background: "linear-gradient(145deg,#4a4a28,#3a3a1c)", border: "8px solid #3a2a1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <p style={{ ...pixel, fontSize: 20, color: C.textGold, textAlign: "center", lineHeight: 1.5 }}>
        {data.quote}
      </p>
      <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
        <span style={{ fontSize: 24 }}>{"\u{1F97E}"}</span>
        <span style={{ fontSize: 24 }}>{"\u{1F392}"}</span>
        <span style={{ fontSize: 24 }}>{"\u{1F9ED}"}</span>
      </div>
      <p style={{ ...pixel, fontSize: 12, color: C.textGold, marginTop: 20, opacity: 0.5 }}>WHERE GOT TIME</p>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════
   PAGE RENDERER — picks template by entry.type
   ═══════════════════════════════════════════════════════════ */
function renderPage(entry) {
  switch (entry.type) {
    case "milestone":
      return <MilestonePage key={entry.id} entry={entry} />;
    case "collage":
      return <CollagePage key={entry.id} entry={entry} />;
    case "squad":
      return <SquadPage key={entry.id} entry={entry} />;
    case "reflection":
      return <ReflectionPage key={entry.id} entry={entry} />;
    case "letter":
      return <LetterPage key={entry.id} entry={entry} />;
    default:
      return <MilestonePage key={entry.id} entry={entry} />;
  }
}

/* ═══════════════════════════════════════════════════════════
   SHARE DIALOG — owner picks whether to include the private letters, then
   copies a hashed public link that encodes the choice. POC: the hash is a
   random id (decorative, no backend lookup); the `?letters=` flag is what
   actually changes what the viewer sees.
   ═══════════════════════════════════════════════════════════ */
function makeShareHash() {
  // Short random base36 id, e.g. "k3f9q2za" — looks like a real share token.
  return (
    Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6)
  );
}

function ShareDialog({ onClose }) {
  // Hash is generated once per dialog open (stable while the toggle changes).
  const [hash] = useState(makeShareHash);
  const [includeLetters, setIncludeLetters] = useState(false);
  const [copied, setCopied] = useState(false);

  const link =
    window.location.origin + "/shared/" + hash + (includeLetters ? "?letters=1" : "");

  // Re-flipping the toggle invalidates a prior "copied" confirmation.
  React.useEffect(function () { setCopied(false); }, [includeLetters]);

  React.useEffect(function () {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return function () { document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  function copy() {
    function done() { setCopied(true); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(done, done);
    } else {
      const ta = document.createElement("textarea");
      ta.value = link; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) { /* ignore */ }
      document.body.removeChild(ta); done();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share book"
      onClick={onClose}
      style={{ background: "#11100bcc" }}
    >
      <div
        className="relative w-full"
        style={{ maxWidth: 440 }}
        onClick={function (e) { e.stopPropagation(); }}
      >
      <Frame
        frame="card"
        className="relative flex w-full flex-col p-5"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <Ribbon size={15}>
            <span className="inline-flex items-center gap-2"><Share2 size={16} />SHARE BOOK</span>
          </Ribbon>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="wgt-press flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: C.green, color: C.textGold }}
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ ...pixel, color: C.ink }} className="mb-4 text-[16px] leading-snug">
          Anyone with this link can flip through your book — no login needed.
        </p>

        {/* Include-letters toggle. */}
        <button
          type="button"
          onClick={function () { setIncludeLetters(function (v) { return !v; }); }}
          className="wgt-press mb-4 flex items-center justify-between gap-3 rounded-lg p-3 text-left"
          style={{ background: C.cardInner, border: "2px solid " + C.line }}
        >
          <span className="flex items-center gap-2">
            {includeLetters ? <Mail size={18} style={{ color: C.green }} /> : <Lock size={18} style={{ color: C.inkSoft }} />}
            <span className="leading-tight">
              <span style={{ ...pixel, color: C.ink }} className="block text-[16px]">Include my private letters</span>
              <span style={{ ...pixel, color: C.inkSoft }} className="block text-[12px]">
                {includeLetters ? "Friends will be able to read them" : "Kept private (hidden in the shared book)"}
              </span>
            </span>
          </span>
          {/* Pill switch. */}
          <span
            className="relative shrink-0 rounded-full"
            style={{ width: 42, height: 24, background: includeLetters ? C.green : "#0003", transition: "background 0.2s ease" }}
          >
            <span
              className="absolute top-[3px] rounded-full"
              style={{ width: 18, height: 18, background: C.textGold, left: includeLetters ? 21 : 3, transition: "left 0.2s ease" }}
            />
          </span>
        </button>

        {/* Link preview. */}
        <div
          className="mb-3 truncate rounded-lg px-3 py-2"
          style={{ ...pixel, color: C.inkSoft, background: "#0000000d", border: "1px solid " + C.line, fontSize: 14 }}
          title={link}
        >
          {link}
        </div>

        <button
          type="button"
          onClick={copy}
          className="wgt-press flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-2"
          style={{ borderColor: C.gold + "99", background: C.green, color: C.textGold }}
        >
          {copied ? <Check size={16} /> : <Share2 size={16} />}
          <span style={pixel} className="text-[16px]">{copied ? "LINK COPIED!" : "COPY LINK"}</span>
        </button>
      </Frame>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FLIPBOOK VIEW
   ═══════════════════════════════════════════════════════════ */
export function JournalFlipbook({ onClose, shared = false, shareLetters = false }) {
  const bookRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  // Letters overlay — opened by the envelope on the LettersPage, rendered above
  // the whole book so the book greys out behind it.
  const [lettersOpen, setLettersOpen] = useState(false);
  // Share dialog (owner view only): pick whether to include the private letters,
  // then copy a hashed public link that encodes the choice.
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  // Page composition (14 leaves): cover, BMT L/R, enlistment L/R, field camp
  // L/R, POP L/R, letters + clean, memories L/R, last page.
  const totalPages = 14;

  const onFlip = useCallback(function (e) { setCurrentPage(e.data); }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {/* Table background on its OWN compositor layer (absolute + translateZ) so
          flipping pages never force a repaint of the wood texture. Using
          background-attachment:fixed previously isolated it too, but `fixed`
          repaints every frame (flicker); this gives the same layer isolation
          without the per-frame repaint. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/assets/journal/table.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: "translateZ(0)",
          willChange: "transform",
          zIndex: 0,
        }}
      />
      {/* Back tab — a scrapbook-style tag pinned to the table. In the OWNER's
          view it's a "CLOSE BOOK" button; in a SHARED (public link) view there's
          nothing to close back to, so it becomes a non-interactive keepsake tag. */}
      {shared ? (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            background: C.bgHeader,
            color: C.textGold,
            border: "2px solid " + C.gold,
            borderRadius: 8,
            boxShadow: "2px 3px 10px #00000055",
            transform: "rotate(-2deg)",
          }}
        >
          <BookOpen size={18} style={{ color: C.gold }} />
          <span style={{ ...pixel, fontSize: 16 }}>Alex's NS experience</span>
        </div>
      ) : (
        <button
          onClick={onClose}
          className="wgt-press"
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px 8px 12px",
            background: C.bgHeader,
            color: C.textGold,
            border: "2px solid " + C.gold,
            borderRadius: 8,
            boxShadow: "2px 3px 10px #00000055",
            transform: "rotate(-2deg)",
          }}
        >
          <ChevronLeft size={18} style={{ color: C.gold }} />
          <span style={{ ...pixel, fontSize: 16 }}>CLOSE BOOK</span>
        </button>
      )}

      {/* SHARE BOOK — owner view only (a shared view has nothing to re-share).
          Top-right tag, mirroring the CLOSE BOOK tag on the left. */}
      {!shared && (
        <button
          onClick={function () { setShareDialogOpen(true); }}
          className="wgt-press"
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            background: C.green,
            color: C.textGold,
            border: "2px solid " + C.gold,
            borderRadius: 8,
            boxShadow: "2px 3px 10px #00000055",
            transform: "rotate(2deg)",
          }}
        >
          <Share2 size={18} style={{ color: C.gold }} />
          <span style={{ ...pixel, fontSize: 16 }}>SHARE BOOK</span>
        </button>
      )}

      {shareDialogOpen && <ShareDialog onClose={function () { setShareDialogOpen(false); }} />}

      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <HTMLFlipBook
          ref={bookRef}
          width={PAGE_W}
          height={PAGE_H}
          showCover={true}
          /* Two-page spread mode: pages render as left+right pairs like a real
             open book (cover sits alone first, then spreads). This removes the
             single-page (portrait) mid-flip flicker and matches the L/R page
             design. usePortrait={false} forces the spread; minWidth/maxWidth
             give autoSize a range to scale the two-page layout into. */
          flippingTime={550}
          usePortrait={false}
          minWidth={PAGE_W}
          maxWidth={PAGE_W * 2}
          minHeight={PAGE_H}
          maxHeight={PAGE_H}
          autoSize={true}
          maxShadowOpacity={0.3}
          drawShadow={true}
          mobileScrollSupport={false}
          onFlip={onFlip}
          style={{ boxShadow: "0 8px 32px #00000066" }}
          className="journal-flipbook"
        >
          <CoverPage />
          {/* BMT chapter is now the first content spread (right after the cover) */}
          <BmtChapterLeft />
          <BmtChapterRight commanderNote={null} />
          <EnlistmentLeft />
          <EnlistmentRight userNote={null} />
          <FieldCampLeft userNote={null} />
          <FieldCampRight buddyNote={null} />
          <PopLeft />
          <PopRight commanderNote={null} />
          {/* LETTERS spread: letters_left.png (envelope) opens a focal letters
              overlay (the cue-card stack) above the book; the right page is a
              clean parchment. In a shared view, letters are hidden UNLESS the
              owner opted to include them (shareLetters). The owner's own view
              always shows them. */}
          <LettersPage
            shared={shared && !shareLetters}
            onOpenLetters={function () { setLettersOpen(true); }}
          />
          <CleanRightPage />
          {/* MEMORIES spread — the final content spread before the back cover. */}
          <MemoriesLeft />
          <MemoriesRight />
          <LastPage />
        </HTMLFlipBook>
      </div>

      {/* Focal letters overlay — greys out the book; close via backdrop/X/Esc. */}
      {lettersOpen && <LettersOverlay onClose={function () { setLettersOpen(false); }} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LANDING VIEW
   ═══════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════
   KEEPSAKE UI — small scrapbook pieces used across the landing.
   Pure CSS where art is missing; emoji glyphs mark slots to be replaced by
   generated pixel art (flagged in the asset list returned to the user).
   ═══════════════════════════════════════════════════════════ */

// Typewriter that cycles a list of lines: type out → hold → erase → next.
// Returns the currently-visible substring. Pure timers, cleaned up on unmount.
function useTypewriter(lines, { typeMs = 55, eraseMs = 28, holdMs = 1600 } = {}) {
  // Start on a random line so the sequence isn't identical every page load.
  const [idx, setIdx] = useState(function () { return Math.floor(Math.random() * lines.length); });
  const [len, setLen] = useState(0);     // chars shown
  const [phase, setPhase] = useState("typing"); // typing | holding | erasing

  React.useEffect(function () {
    const line = lines[idx % lines.length];
    let t;
    if (phase === "typing") {
      if (len < line.length) t = setTimeout(function () { setLen(len + 1); }, typeMs);
      else t = setTimeout(function () { setPhase("holding"); }, holdMs);
    } else if (phase === "holding") {
      t = setTimeout(function () { setPhase("erasing"); }, holdMs);
    } else { // erasing
      if (len > 0) t = setTimeout(function () { setLen(len - 1); }, eraseMs);
      else { setIdx(idx + 1); setPhase("typing"); }
    }
    return function () { clearTimeout(t); };
  }, [lines, idx, len, phase, typeMs, eraseMs, holdMs]);

  return lines[idx % lines.length].slice(0, len);
}

// The mascot pep-talk — a big talking-soldier sprite anchored bottom-RIGHT, with
// a parchment speech bubble above-left whose tail points down-diagonally at him.
// The line is typed out with a blinking caret.
function PepTalk() {
  const text = useTypewriter(PEP_LINES);
  return (
    <div className="flex items-center justify-end gap-0">
      {/* Speech bubble — grows to fill the space left of the soldier. */}
      <div
        className="relative flex-1 rounded-xl px-3 py-2.5"
        style={{ background: "#f3e8d0", border: "1px solid " + C.line, boxShadow: "0 2px 5px #0004, inset 0 1px 0 #fff8" }}
      >
        {/* Tail — a parchment triangle on the bubble's RIGHT edge, pointing
            across at the soldier (upper area, toward his head/raised hand). */}
        <span
          className="absolute"
          style={{
            right: -8, top: "38%", width: 15, height: 15,
            background: "#f3e8d0",
            borderTop: "1px solid " + C.line, borderRight: "1px solid " + C.line,
            transform: "rotate(45deg)",
            boxShadow: "2px -1px 3px #0001",
          }}
        />
        <p style={{ fontFamily: "'VT323', monospace", color: C.ink }} className="min-h-[2.6em] text-[16px] leading-tight">
          {text}
          <span className="wgt-caret" style={{ color: C.green }}>▋</span>
        </p>
      </div>

      <img
        src={JOURNAL_ART.mascot}
        alt="Your buddy"
        className="-ml-1 shrink-0 self-end"
        /* translateY pushes him lower without growing the row, so he can dip
           toward the UNLOCK button below. Increase MASCOT_DROP to move down. */
        style={{ height: 120, width: "auto", imageRendering: "pixelated", filter: "drop-shadow(0 3px 4px #0007)", transform: "translateY(" + MASCOT_DROP + "px)" }}
      />
    </div>
  );
}

// Section title — the shared green Ribbon pill, matching Training/Squad so card
// headers look identical across the app. `right` holds an optional corner label.
function StarTitle({ children, right }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <Ribbon>{children}</Ribbon>
      {right}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   KEEPSAKE MODALS — the journal's ONE dialog language.
   Every capture / task / AI-memory modal is a parchment page torn from the book
   and taped onto the dark desk: washi-tape pin, deckled top edge, a typed VT323
   header, an optional rubber-stamp context badge, and lined-paper fields.
   ModalShell is the shared shell; fieldStyle / FieldLabel / SaveButton / the
   StampBadgePill keep the form pieces consistent across all of them.
   ═══════════════════════════════════════════════════════════ */

// The inked rubber-stamp pill used under a modal title to mark its context
// (the event, the capture type, "TIME CAPSULE", etc.). Pairs with .wgt-stamp.
function StampPill({ children }) {
  return (
    <span className="wgt-stamp" style={{ ...pixel, fontSize: 12 }}>
      {children}
    </span>
  );
}

function ModalShell({ title, icon, stamp, onClose, children, footer }) {
  // Esc closes; the backdrop is a click target. Body content scrolls if tall.
  React.useEffect(function () {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return function () { document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="wgt-keepsake-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
        style={{ background: "transparent" }}
      />
      <div className="wgt-keepsake relative flex flex-col">
        {/* brass file tab on the panel's top-left corner */}
        <span className="wgt-keepsake-tab" aria-hidden="true">
          <span style={{ ...pixel, fontSize: 12, letterSpacing: "0.14em" }}>JOURNAL</span>
        </span>

        {/* ── header band: gilt title + wax-seal close ── */}
        <div className="wgt-keepsake-head flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span style={{ color: C.gold }}>{icon}</span>
              <h2 style={{ ...pixel, color: C.gold, letterSpacing: "0.04em", textShadow: "0 1px 0 #0007" }} className="truncate text-[30px] leading-none">{title}</h2>
            </div>
            {stamp && <div className="mt-2.5"><StampPill>{stamp}</StampPill></div>}
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

        {/* ── body: the form, centered in a content column ── */}
        <div className="wgt-keepsake-doc">
          <div className="wgt-keepsake-inner">
            {children}
            {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Shared field styling for the capture forms — the dark sunken well.
const fieldStyle = {
  ...pixel,
  fontSize: 18,
};

function FieldLabel({ children }) {
  return (
    <p style={{ ...pixel, color: C.gold }} className="mb-1.5 mt-5 flex items-center gap-1.5 text-[16px] uppercase tracking-[0.14em] first:mt-0">
      <span style={{ color: C.gold, opacity: 0.7 }}>▸</span>{children}
    </p>
  );
}

function SaveButton({ onClick, children = "SAVE TO JOURNAL" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wgt-press flex items-center gap-2 rounded-md border-2 px-5 py-2"
      style={{
        borderColor: C.gold,
        background: "linear-gradient(180deg," + C.greenLit + "," + C.green + ")",
        color: C.textGold,
        boxShadow: "inset 0 1px 0 #fff2, 0 2px 5px #0004",
      }}
    >
      <Plus size={16} style={{ color: C.gold }} />
      <span style={pixel} className="text-[17px]">{children}</span>
    </button>
  );
}

// Single capture modal that adapts its body to the capture type.
function CaptureModal({ type, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // NEW: photo state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  React.useEffect(function () {
    if (!recording) return undefined;
    const id = setInterval(function () { setSeconds(function (s) { return s + 1; }); }, 1000);
    return function () { clearInterval(id); };
  }, [recording]);

  const meta = {
    photo: { label: "PHOTO", icon: <Image size={16} /> },
    note: { label: "NOTE", icon: <FileText size={16} /> },
    voice: { label: "VOICE NOTE", icon: <Mic size={16} /> },
    milestone: { label: "MILESTONE", icon: <Star size={16} /> },
    ai: { label: "AI MEMORY", icon: <Sparkles size={16} /> },
  }[type];

  function mmss(s) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ":" + String(r).padStart(2, "0");
  }

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    const fallbackTitle = {
      photo: "New photo",
      note: "New note",
      voice: "Voice memo · " + mmss(seconds),
      milestone: "New milestone",
    }[type];

    let photoURL = null;

    if (type === "photo" && photoFile) {
      setUploading(true);
      try {
        const storageRef = ref(storage, "journal-photos/" + auth.currentUser.uid + "/" + Date.now() + "_" + photoFile.name);
        await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(storageRef);

        // Save caption + photo URL to Firestore
        await addDoc(collection(db, "journalEntries"), {
          userId: auth.currentUser.uid,
          type: "photo",
          photoURL,
          caption: title.trim() || fallbackTitle,
          taggedMates: text.trim(),
          createdAt: serverTimestamp(),
        });

      } catch (err) {
        console.error("Upload failed:", err);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    onSave({
      id: "e" + Date.now(),
      type,
      title: title.trim() || fallbackTitle,
      ago: "now",
      date: "TODAY",
      text: text.trim(),
      photoURL,
    });
    onClose();
  }

  return (
    <ModalShell title={meta.label} icon={meta.icon} stamp="QUICK CAPTURE" onClose={onClose}
      footer={
        <SaveButton onClick={handleSave}>
          {uploading ? "UPLOADING..." : "SAVE TO JOURNAL"}
        </SaveButton>
      }
    >
      {type === "photo" && (
        <>
          <FieldLabel>Photo</FieldLabel>
          {/* Clickable upload zone — a film-negative slot a polaroid drops into */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="wgt-photo-slot"
            style={{ height: 160, cursor: "pointer" }}
          >
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ ...pixel, color: C.textGold, opacity: 0.85, fontSize: 16, textAlign: "center" }}>
                Tap to add photo
                <br />
                <Camera size={18} style={{ display: "inline", marginTop: 6 }} />
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoSelect}
          />
          <FieldLabel>Caption</FieldLabel>
          <input className="wgt-field" style={fieldStyle} value={title} onChange={function (e) { setTitle(e.target.value); }} placeholder="What's happening?" />
          <FieldLabel>Tag mates (optional)</FieldLabel>
          <input className="wgt-field" style={fieldStyle} value={text} onChange={function (e) { setText(e.target.value); }} placeholder="e.g. Hao Jie, Rafiq" />
        </>
      )}

      {/* ... rest of your note/voice/milestone blocks unchanged ... */}
    </ModalShell>
  );
}

// Read-only view of one of the soldier's own entries.
function EntryReadModal({ entry, onClose }) {
  const meta = {
    photo: { label: "PHOTO", icon: <Image size={16} /> },
    note: { label: "NOTE", icon: <FileText size={16} /> },
    voice: { label: "VOICE NOTE", icon: <Mic size={16} /> },
    milestone: { label: "MILESTONE", icon: <Star size={16} /> },
  }[entry.type] || { label: "ENTRY", icon: <FileText size={16} /> };

  const stamp = entry.date + (entry.ago ? " · " + entry.ago + " AGO" : "");
  return (
    <ModalShell title={entry.title || meta.label} icon={meta.icon} stamp={stamp} onClose={onClose}>
      {entry.type === "photo" && (
        <div className="wgt-photo-slot mb-1" style={{ height: 210 }}>
          {entry.photoURL
            ? <img src={entry.photoURL} alt={entry.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ ...pixel, color: C.textGold, opacity: 0.85, fontSize: 16 }}>{entry.title}</span>
          }
        </div>
      )}
      {entry.type === "voice" && (
        <div className="mb-1 flex items-center gap-3 rounded-md px-3 py-3" style={{ background: "#0000002e", boxShadow: "inset 0 2px 6px #00000055" }}>
          <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: C.greenLit, color: C.gold, boxShadow: "inset 0 1px 0 #fff2" }}>
            <Mic size={20} />
          </span>
          <div className="h-2 flex-1 rounded-full" style={{ background: "linear-gradient(90deg," + C.gold + " 40%, #00000040 40%)" }} />
        </div>
      )}

      {entry.text && (
        <p style={{ fontFamily: "'VT323', monospace", color: C.textGold }} className="mt-3 whitespace-pre-wrap text-[18px] leading-relaxed">
          {entry.text}
        </p>
      )}
    </ModalShell>
  );
}

/* ═══════════════════════════════════════════════════════════
   KEY EVENTS COLUMN — the soldier's NS journey as a task checklist.
   One continuous, scrollable card. Each event is a row; the ACTIVE event
   expands its tasks as clickable rows with a live countdown. Done events
   show ✓ chips; locked events are dimmed and not workable.
   ═══════════════════════════════════════════════════════════ */

// Per-task-type icon for the task rows.
const TASK_ICON = {
  photo: Image,
  reflection: Pen,
  letter: Mail,
  "buddy-note": FileText,
};

// Live "X DAYS LEFT" chip for the active event. `deadline` is a timestamp (ms).
// Counts down once a minute; amber at the 1-day mark, red once overdue.
function CountdownChip({ deadline }) {
  const [now, setNow] = useState(Date.now());
  useEffect(function () {
    const id = setInterval(function () { setNow(Date.now()); }, 60000);
    return function () { clearInterval(id); };
  }, []);

  const msLeft = deadline - now;
  const overdue = msLeft <= 0;
  const daysLeft = Math.ceil(msLeft / 86400000);
  const tone = overdue ? "#7a3a2a" : daysLeft <= 1 ? "#9a6a1a" : C.green;
  const label = overdue
    ? "OVERDUE"
    : daysLeft + (daysLeft === 1 ? " DAY LEFT" : " DAYS LEFT");

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
      style={{ ...pixel, fontSize: 11, color: C.textGold, background: tone, boxShadow: "inset 0 1px 0 #fff3" }}
    >
      <Clock size={11} /> {label}
    </span>
  );
}

// One task row. Active+incomplete rows are clickable (open the modal); done rows
// show a filled check; locked rows are inert.
function TaskRow({ task, locked, onOpen }) {
  const Icon = TASK_ICON[task.type] || FileText;
  const clickable = !locked && !task.done;
  return (
    <button
      type="button"
      onClick={clickable ? onOpen : undefined}
      disabled={!clickable}
      className={(clickable ? "wgt-press " : "") + "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left"}
      style={{
        // A clearly recessed well so rows read as distinct from the card.
        background: task.done ? "#0000000a" : "#fdf6e6",
        border: "1px solid " + (task.done ? "#00000012" : "#c2ab7e"),
        boxShadow: clickable ? "inset 0 1px 0 #fff8, 0 1px 2px #0001" : "none",
        cursor: clickable ? "pointer" : "default",
        opacity: locked ? 0.85 : 1,
      }}
    >
      {task.done
        ? <CheckCircle2 size={17} style={{ color: C.green, flexShrink: 0 }} />
        : <Square size={17} style={{ color: clickable ? C.green : C.inkSoft, flexShrink: 0 }} />}
      <Icon size={14} style={{ color: C.ink, opacity: 0.7, flexShrink: 0 }} />
      <span
        style={{ ...pixel, color: C.ink, textDecoration: task.done ? "line-through" : "none", opacity: task.done ? 0.6 : 1 }}
        className="flex-1 truncate text-[15px]"
      >
        {task.label}
      </span>
      {clickable && <ChevronRight size={15} style={{ color: C.green, flexShrink: 0 }} />}
    </button>
  );
}

// One event block: header (status badge + title + countdown) and its task list.
function EventCard({ event, deadline, onOpenTask }) {
  const isDone = event.status === "done";
  const isActive = event.status === "active";
  const isLocked = event.status === "locked";

  return (
    <div
      className="rounded-lg p-2.5"
      style={{
        // Locked cards are visibly muted (cooler, darker tan) but still legible;
        // active gets the gold border, done/active sit on the lighter card.
        background: isLocked ? "#cbb88f" : C.cardInner,
        border: "2px solid " + (isActive ? C.gold : isLocked ? "#a8916a" : "#c2ab7e"),
        boxShadow: isActive
          ? "0 0 0 1px " + C.gold + "55, inset 0 1px 0 #fff5, 0 2px 8px #0004"
          : "inset 0 1px 0 #fff5, 0 1px 3px #0002",
      }}
    >
      {/* Header. For DONE events this is the whole card — the tasks are hidden,
          since a completed milestone just needs its name + a done mark. */}
      <div className={(isDone ? "" : "mb-2 ") + "flex items-center gap-2"}>
        {/* status badge */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: isDone ? C.green : isActive ? C.gold : "#8a7a55", boxShadow: "inset 0 1px 0 #fff4, 0 1px 2px #0003" }}>
          {isDone ? <Check size={15} style={{ color: C.textGold }} />
            : isLocked ? <Lock size={14} style={{ color: "#efe3c4" }} />
            : <Flag size={14} style={{ color: C.bgHeader }} />}
        </span>
        <span style={{ ...pixel, color: C.ink }} className="flex-1 truncate text-[18px]">{event.title}</span>
        {isActive && <CountdownChip deadline={deadline} />}
        {isDone && <span style={{ ...pixel, color: C.green }} className="text-[12px] font-bold">DONE</span>}
        {isLocked && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ ...pixel, fontSize: 11, color: "#efe3c4", background: "#6b5c3e" }}>
            <Lock size={10} /> LOCKED
          </span>
        )}
      </div>
      {!isDone && (
        <div className="space-y-1">
          {event.tasks.map(function (t) {
            return (
              <TaskRow
                key={t.id}
                task={t}
                locked={isLocked}
                onOpen={function () { onOpenTask(event, t); }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// The "LETTERS TO YOURSELF" event — always open until all 10 are written. Shows
// a counter instead of a countdown, one "Write a letter" row, and the letters
// written so far (click one to re-open/edit it).
function LettersEventCard({ event, letters, onWriteLetter, onOpenLetter }) {
  const done = letters.length;
  const complete = done >= LETTERS_TOTAL;
  return (
    <div
      className="rounded-lg p-2.5"
      style={{
        background: C.cardInner,
        border: "2px solid " + (complete ? C.green : C.gold),
        boxShadow: complete
          ? "inset 0 1px 0 #fff4, 0 1px 2px #0002"
          : "0 0 0 1px " + C.gold + "44, inset 0 1px 0 #fff4, 0 2px 6px #0003",
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: complete ? C.green : C.gold, boxShadow: "inset 0 1px 0 #fff4, 0 1px 2px #0003" }}>
          {complete ? <Check size={15} style={{ color: C.textGold }} /> : <Mail size={14} style={{ color: C.bgHeader }} />}
        </span>
        <span style={{ ...pixel, color: C.ink }} className="flex-1 truncate text-[18px]">{event.title}</span>
        {/* counter chip — X/10 written */}
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5"
          style={{ ...pixel, fontSize: 11, color: C.textGold, background: complete ? C.green : C.bgHeader, border: "1px solid " + C.gold + "88", boxShadow: "inset 0 1px 0 #fff2" }}
        >
          {done}/{LETTERS_TOTAL} WRITTEN
        </span>
      </div>

      {/* progress bar */}
      <div className="mb-2.5 h-2 w-full overflow-hidden rounded-full" style={{ background: "#00000033", boxShadow: "inset 0 1px 2px #0004" }}>
        <div className="h-full rounded-full" style={{ width: (done / LETTERS_TOTAL) * 100 + "%", background: "linear-gradient(90deg," + C.gold + "," + C.greenLit + ")", boxShadow: "inset 0 1px 0 #fff4" }} />
      </div>

      {/* write-a-letter row (disabled once 10 are done) */}
      <button
        type="button"
        onClick={complete ? undefined : onWriteLetter}
        disabled={complete}
        className={(complete ? "" : "wgt-press ") + "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left"}
        style={{
          background: complete ? "#0000000a" : "#fdf6e6",
          border: "1px solid " + (complete ? "#00000012" : "#c2ab7e"),
          boxShadow: complete ? "none" : "inset 0 1px 0 #fff8, 0 1px 2px #0001",
          cursor: complete ? "default" : "pointer",
        }}
      >
        <Plus size={17} style={{ color: complete ? C.inkSoft : C.green, flexShrink: 0 }} />
        <span style={{ ...pixel, color: C.ink, opacity: complete ? 0.6 : 1 }} className="flex-1 text-[15px]">
          {complete ? "All 10 letters written" : "Write a letter to yourself"}
        </span>
        {!complete && <ChevronRight size={15} style={{ color: C.green, flexShrink: 0 }} />}
      </button>

      {/* letters written so far */}
      {letters.length > 0 && (
        <div className="mt-2 space-y-1">
          {letters.map(function (lt, i) {
            return (
              <button
                key={lt.id}
                type="button"
                onClick={function () { onOpenLetter(lt); }}
                className="wgt-press flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left"
                style={{ background: "#fdf6e6", border: "1px solid #c2ab7e" }}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: C.green }}>
                  <span style={{ ...pixel, fontSize: 11, color: C.textGold }}>{i + 1}</span>
                </span>
                <span style={{ ...pixel, color: C.ink }} className="flex-1 truncate text-[14px]">{lt.title}</span>
                {lt.isDraft && <span style={{ ...pixel, fontSize: 10, color: "#efe3c4", background: "#8a7a55" }} className="rounded px-1.5 py-0.5">DRAFT</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// The whole KEY EVENTS card: ribbon header + scrollable list of EventCards.
function KeyEventsColumn({ events, deadlines, letters, onOpenTask, onWriteLetter, onOpenLetter }) {
  return (
    <div className="wgt-paper flex min-h-0 flex-1 flex-col p-3">
      <StarTitle>KEY EVENTS</StarTitle>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {events.map(function (ev) {
          if (ev.kind === "letters") {
            return (
              <LettersEventCard
                key={ev.id}
                event={ev}
                letters={letters}
                onWriteLetter={onWriteLetter}
                onOpenLetter={onOpenLetter}
              />
            );
          }
          return (
            <EventCard
              key={ev.id}
              event={ev}
              deadline={deadlines[ev.id]}
              onOpenTask={onOpenTask}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   KEY-EVENT TASK MODAL — photo upload tasks (the only non-text task type).
   Text tasks (reflection / buddy-note / letter) use the shared AIMemoryModal
   editor instead. On Save it hands the photo preview back; the parent flips
   task.done. Session-only — nothing is uploaded to a backend here.
   ═══════════════════════════════════════════════════════════ */
function KeyEventTaskModal({ eventTitle, task, onClose, onSave }) {
  const [photoPreview, setPhotoPreview] = useState(task.value || null);
  const fileInputRef = useRef(null);

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
  }

  function handleSave() {
    if (!photoPreview) return;
    onSave(photoPreview);
    onClose();
  }

  return (
    <ModalShell
      title="UPLOAD PHOTO"
      icon={<Image size={16} />}
      stamp={eventTitle}
      onClose={onClose}
      footer={
        <SaveButton onClick={handleSave}>
          {task.done ? "UPDATE" : "MARK DONE"}
        </SaveButton>
      }
    >
      <FieldLabel>Photo</FieldLabel>
      <button
        type="button"
        onClick={function () { fileInputRef.current?.click(); }}
        className="wgt-photo-slot"
        style={{ height: 200, cursor: "pointer" }}
      >
        {photoPreview ? (
          <img src={photoPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ ...pixel, color: C.textGold, opacity: 0.85, fontSize: 16, textAlign: "center" }}>
            Tap to add photo
            <br />
            <Camera size={18} style={{ display: "inline", marginTop: 6 }} />
          </span>
        )}
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoSelect} />
    </ModalShell>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════ */
export default function JournalPage({ onNavigate }) {
  const [bookOpen, setBookOpen] = useState(false);
  // Gate: the journal is sealed until ORD. While locked the cover is darkened
  // and not openable. The "UNLOCK BOOK (TEST)" button flips this for testing.
  const [unlocked, setUnlocked] = useState(false);

  // Live, pre-ORD content + the modal interfaces over it. The book stays sealed;
  // these are the soldier's day-to-day captures, viewable any time.
  const [entries, setEntries] = useState([]);

  // Replace the entire useEffect (lines 1410-1437) with this:
  useEffect(function () {
    const unsubscribeAuth = auth.onAuthStateChanged(function (currentUser) {
      if (!currentUser) return;

      const q = query(
        collection(db, "journalEntries"),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );

      const unsubscribeSnapshot = onSnapshot(q, function (snapshot) {
        const fetched = snapshot.docs.map(function (doc) {
          const d = doc.data();
          return {
            id: doc.id,
            type: d.type,
            title: d.caption || d.title || "Untitled",
            text: d.taggedMates || d.text || "",
            date: d.createdAt?.toDate().toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" }) || "TODAY",
            ago: (function () {
              if (!d.createdAt) return "now";
              const diffMs = Date.now() - d.createdAt.toDate().getTime();
              const diffMins = Math.floor(diffMs / 60000);
              if (diffMins < 1) return "now";
              if (diffMins < 60) return diffMins + "m";
              const diffHours = Math.floor(diffMins / 60);
              if (diffHours < 24) return diffHours + "h";
              const diffDays = Math.floor(diffHours / 24);
              if (diffDays < 7) return diffDays + "d";
              return Math.floor(diffDays / 7) + "w";
            })(),
            photoURL: d.photoURL || null,
          };
        });
        setEntries(fetched);
      }, function (err) {
        console.error("Firestore error:", err);
      });

      return function () { unsubscribeSnapshot(); };
    });

    return function () { unsubscribeAuth(); };
  }, []);

  const [readEntry, setReadEntry] = useState(null);

  // KEY EVENTS — the NS-journey task checklist. Session-only: completing a task
  // updates this state (no backend), so progress resets on refresh.
  const [keyEvents, setKeyEvents] = useState(KEY_EVENTS_SEED);
  // { event, task } currently open in the task modal, or null.
  const [activeTask, setActiveTask] = useState(null);

  // LETTERS TO YOURSELF — up to 10 letters, session-only (frontend demo). Each:
  // { id, title, text, tagText, taggedMate, isDraft }. `activeLetter` is the one
  // open in the editor: an existing letter (edit) or null (a brand-new letter).
  const [letters, setLetters] = useState([]);
  const [letterOpen, setLetterOpen] = useState(false);
  const [activeLetter, setActiveLetter] = useState(null);

  // Deadlines for ACTIVE events: deadlineDays out from first mount. Memoised so
  // the countdown has a stable target across renders.
  const eventDeadlines = React.useMemo(function () {
    const base = Date.now();
    const map = {};
    KEY_EVENTS_SEED.forEach(function (ev) {
      if (ev.deadlineDays) map[ev.id] = base + ev.deadlineDays * 86400000;
    });
    return map;
  }, []);

  // Save a letter — update in place if it already has an id, else append a new
  // one (respecting the 10-letter cap).
  function saveLetter(payload) {
    setLetters(function (prev) {
      const editingId = activeLetter && activeLetter.id;
      if (editingId) {
        return prev.map(function (lt) {
          return lt.id === editingId
            ? { ...lt, title: payload.title, text: payload.text, tagText: payload.tagText, taggedMate: payload.taggedMate, isDraft: payload.isDraft }
            : lt;
        });
      }
      if (prev.length >= LETTERS_TOTAL) return prev;
      return prev.concat([{
        id: "letter-" + Date.now(),
        title: payload.title,
        text: payload.text,
        tagText: payload.tagText,
        taggedMate: payload.taggedMate,
        isDraft: payload.isDraft,
      }]);
    });
  }

  // Flip a task to done (and stash what they wrote / the photo preview).
  function completeTask(eventId, taskId, value) {
    setKeyEvents(function (prev) {
      return prev.map(function (ev) {
        if (ev.id !== eventId) return ev;
        return {
          ...ev,
          tasks: ev.tasks.map(function (t) {
            return t.id === taskId ? { ...t, done: true, value } : t;
          }),
        };
      });
    });
  }

  const handleSaveEntry = async (payload) => {
    try {
      if (!payload) return;

      // 0. Handle text REFLECTIONS from the reflection modal (title + body + tags,
      //    no image). Drafts and final saves both land here; isDraft flags state.
      if (payload.type === "reflection") {
        await addDoc(collection(db, "journalEntries"), {
          userId: auth.currentUser?.uid || "anonymous",
          type: "note", // renders in feeds like a written note
          caption: payload.title || "Untitled reflection",
          text: payload.text || "",
          taggedMates: payload.taggedMate || "",
          isDraft: !!payload.isDraft,
          createdAt: serverTimestamp(),
        });
        return;
      }

      // 1. Handle AI Memory Engine Saves (Check for explicit payload properties)
      if (payload.promptDescription || payload.rawBlobUrl) {
        try {
          console.log("1. payload received:", payload);

          const blobResponse = await fetch(payload.rawBlobUrl);
          const blob = await blobResponse.blob();

          const userId = auth.currentUser?.uid || "anonymous";
          const storageRef = ref(storage, `ai-memories/${userId}/${Date.now()}.png`);

          await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(storageRef);

          await addDoc(collection(db, "journalEntries"), {
            userId: userId,
            type: "photo", // Forces it to render nicely as a regular photo type in feeds
            caption: payload.caption || "AI Rendered Memory",
            photoURL: downloadURL, // ✅ Fixed: uses the actual download URL string variable
            createdAt: serverTimestamp(),
            taggedMates: payload.taggedMate || "Generated by AI",
            aiPromptDescription: payload.promptDescription || ""
          });

          console.log("Firestore doc saved successfully!");
        } catch (err) {
          console.error("AI memory save failed:", err);
        }
        return;
      }

      // 2. Handle standard captures passed from CaptureModal (Note, Milestone, Voice)
      // Note: Standard 'photo' type is already handled directly inside CaptureModal
      if (payload.type !== "photo") {
        await addDoc(collection(db, "journalEntries"), {
          userId: auth.currentUser?.uid || "anonymous",
          type: payload.type,
          caption: payload.title || "Untitled", // ✅ Maps title to caption for uniform reading
          taggedMates: payload.text || "",     // ✅ Maps text to taggedMates for uniform reading
          photoURL: payload.photoURL || null,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Ecosystem sync exception:", error);
    }
  };

  if (bookOpen) {
    return (
      <AppShell
        active={ROUTES.JOURNAL} onNavigate={onNavigate} user={user}
        icon={<BookOpen size={36} />} title="JOURNAL" subtitle="CAPTURE MOMENTS. REFLECT. GROW."
        fill
      >
        <JournalFlipbook onClose={function () { setBookOpen(false); }} />
      </AppShell>
    );
  }

  return (
    <AppShell
      active={ROUTES.JOURNAL} onNavigate={onNavigate} user={user}
      icon={<BookOpen size={36} />} title="JOURNAL" subtitle="CAPTURE MOMENTS · REFLECT · GROW"
      fill
    >
      {/* No-scroll desk: the whole landing is laid out to fit one viewport on a
          common laptop. On xl+ it locks to the screen height; below that it
          relaxes into a normal scroll so nothing clips on short windows. */}
      <div className="mx-auto h-full w-full max-w-[1640px] overflow-y-auto p-3 sm:p-5 xl:overflow-hidden">
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12">

          {/* ═══════════════ LEFT — the book + capture ═══════════════ */}
          <section className="flex min-h-0 flex-col gap-4 lg:col-span-7">

            {/* ---- COVER (sealed) + ORD dog-tag ---- */}
            <div className="wgt-paper flex min-h-0 flex-1 flex-col justify-center p-4">
              <div className="flex min-h-0 flex-1 items-center">

                {/* Closed-journal cover — the hero. Grows to fill the card so
                    there's no dead space. Sealed until ORD: darkened, not
                    openable, with a wax-seal lock overlay. */}
                <button
                  onClick={function () { if (unlocked) setBookOpen(true); }}
                  className={(unlocked ? "wgt-press cursor-pointer " : "cursor-not-allowed ") + "group relative flex min-h-0 flex-1 items-center justify-center"}
                  aria-label={unlocked ? "Open journal" : "Journal sealed until ORD"}
                  disabled={!unlocked}
                  style={{ background: "transparent", border: "none", padding: 0 }}
                >
                  <img
                    src="/assets/journal/journal_closed_image.png"
                    alt={data.cover.title + " " + data.cover.subtitle}
                    className="max-h-full w-auto max-w-full object-contain transition-all duration-300"
                    style={{
                      filter: unlocked
                        ? "drop-shadow(4px 7px 14px #00000066)"
                        : "drop-shadow(4px 7px 14px #00000066) brightness(0.5) saturate(0.65) sepia(0.15)",
                    }}
                  />
                  {!unlocked && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
                      {/* Wax-seal lock — placeholder for a wax-seal sprite. */}
                      <span
                        className="flex h-16 w-16 items-center justify-center rounded-full"
                        style={{ background: "radial-gradient(circle at 38% 32%, #7a3a2a, #4a1f16)", border: "2px solid " + C.gold, boxShadow: "0 4px 12px #000a, inset 0 2px 4px #fff3" }}
                      >
                        <Lock size={28} style={{ color: C.gold }} />
                      </span>
                      <span style={{ ...pixel, fontSize: 15, color: C.textGold, textShadow: "1px 1px 3px #000" }}>SEALED UNTIL ORD</span>
                    </div>
                  )}
                </button>

                {/* Side rail — ORD countdown plate + TEST gate. */}
                <div className="flex w-[34%] max-w-[250px] shrink-0 flex-col justify-center gap-3 ">
                  {/* ORD countdown on the blank leather plate (soldier baked into
                      the lower-right). All text is overlaid by us, formatted to
                      match the reference: gilt label, big cream count, DAYS LEFT,
                      kept clear of the soldier on the right. */}
                  <div
                    className="relative w-full"
                    style={{
                      backgroundImage: "url(" + JOURNAL_ART.ordBackdrop + ")",
                      backgroundSize: "100% 100%",
                      backgroundRepeat: "no-repeat",
                      aspectRatio: "1774 / 887",
                      containerType: "inline-size",
                    }}
                  >
                    {/* Text sits in the plate's LEFT clear area (the soldier is
                        baked into the right ~24%). The box is bounded to that
                        area and the content centered inside it, so nothing spills
                        over the leather edges. Sizes use container-query units so
                        they scale with the plate width. */}
                    <div
                      className="absolute flex flex-col items-center justify-center overflow-hidden text-center"
                      style={{ top: "9%", bottom: "8%", left: "21%", right: "26%" }}
                    >
                      <p style={{ ...pixel, color: C.gold, fontSize: "clamp(8px, 6cqw, 12px)" }} className="max-w-full truncate leading-none tracking-wide">LOCKED UNTIL ORD</p>
                      <p style={{ ...pixel, color: "#efe3c4", textShadow: "0 2px 0 #00000055", fontSize: "clamp(30px, 26cqw, 50px)" }} className="leading-none">{data.ord.daysLeft}</p>
                      <p style={{ ...pixel, color: C.gold, fontSize: "clamp(8px, 5.5cqw, 13px)" }} className="max-w-full truncate leading-none tracking-[0.18em]">DAYS LEFT</p>
                    </div>
                  </div>

                  {/* Mascot pep-talk — rotating typewriter lines. */}
                  <PepTalk />

                  {/* TEST control — clearly a dev/demo gate. */}
                  <button
                    onClick={function () { setUnlocked(function (v) { return !v; }); }}
                    className="wgt-press flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-2 py-2"
                    style={{ borderColor: C.gold, background: C.bgHeader, color: C.textGold }}
                  >
                    {unlocked ? <BookOpen size={15} style={{ color: C.gold }} /> : <Lock size={15} style={{ color: C.gold }} />}
                    <span style={{ ...pixel, fontSize: 13 }}>{unlocked ? "LOCK (TEST)" : "UNLOCK (TEST)"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ---- SERVICE PROGRESS ---- */}
            <div className="wgt-paper shrink-0 p-3">
              <div className="flex items-center gap-3">
                {/* Medal crest art (shield + star). Negative margin so the big
                    sprite reads large without inflating the header row height. */}
                <PixIcon src={JOURNAL_ART.icons.medal} size={78} className="-my-3 -mr-5 shrink-0" />
                <div className="shrink-0">
                  <p style={{ ...pixel, color: C.ink }} className="text-[36px] leading-none">{data.progress.percent}%</p>
                  <p style={{ ...pixel, ...M }} className="text-[13px] leading-none">COMPLETE</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ ...pixel, ...M }} className="mb-1 text-[17px]">YOUR SERVICE PROGRESS</p>
                  <div className="h-4 w-full overflow-hidden rounded-full" style={{ background: "#0000002a", boxShadow: "inset 0 1px 2px #0005" }}>
                    <div className="h-full rounded-full" style={{ width: data.progress.percent + "%", background: "linear-gradient(90deg," + C.greenLit + "," + C.green + ")", boxShadow: "inset 0 1px 0 #fff3" }} />
                  </div>
                  <p style={{ ...pixel, ...M }} className="mt-0.5 text-center text-[16px]">{data.progress.days} / {data.progress.total} DAYS</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {data.progress.stats.map(function (s) {
                  return (
                    <div key={s.label} className="wgt-plate flex items-center gap-2 px-3 py-2.5" style={{ background: C.cardInner }}>
                      {/* Fixed box keeps every tile the same height regardless of
                          each PNG's internal transparent padding. */}
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center">
                        <PixIcon src={JOURNAL_ART.icons[s.art]} size={56} />
                      </span>
                      <div className="leading-tight">
                        <p style={{ ...pixel, color: C.ink }} className="text-[30px] leading-none">{s.value}</p>
                        <p style={{ ...pixel, ...M }} className="text-[12px]">{s.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ═══════════════ RIGHT — key events checklist ═══════════════ */}
          <section className="flex min-h-0 flex-col gap-4 lg:col-span-5">
            <KeyEventsColumn
              events={keyEvents}
              deadlines={eventDeadlines}
              letters={letters}
              onOpenTask={function (event, task) { setActiveTask({ event, task }); }}
              onWriteLetter={function () { setActiveLetter(null); setLetterOpen(true); }}
              onOpenLetter={function (lt) { setActiveLetter(lt); setLetterOpen(true); }}
            />
          </section>
        </div>
      </div>

      {/* ---- modal interfaces (prototype, session state) ---- */}
      {readEntry && (
        <EntryReadModal entry={readEntry} onClose={function () { setReadEntry(null); }} />
      )}
      {activeTask && TEXT_TASK_KINDS[activeTask.task.type] ? (
        // Text tasks (reflection / buddy-note / letter) open the shared editor.
        // Save draft / final save both persist via handleSaveEntry; a final save
        // also marks the task done.
        <AIMemoryModal
          kind={TEXT_TASK_KINDS[activeTask.task.type]}
          onClose={function () { setActiveTask(null); }}
          onSave={function (payload) {
            handleSaveEntry(payload);
            if (!payload.isDraft) {
              completeTask(activeTask.event.id, activeTask.task.id, payload.title || "Saved");
            }
          }}
        />
      ) : activeTask ? (
        <KeyEventTaskModal
          eventTitle={activeTask.event.title}
          task={activeTask.task}
          onClose={function () { setActiveTask(null); }}
          onSave={function (value) { completeTask(activeTask.event.id, activeTask.task.id, value); }}
        />
      ) : null}
      {letterOpen && (
        // Letters-to-yourself editor — same editor as reflections, worded as a
        // "letter". Frontend-only: saving appends/updates the session letters.
        <AIMemoryModal
          kind="letter"
          initial={activeLetter}
          onClose={function () { setLetterOpen(false); setActiveLetter(null); }}
          onSave={function (payload) { saveLetter(payload); }}
        />
      )}
    </AppShell>
  );
}
