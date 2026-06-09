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
} from "lucide-react";
import { AppShell, ActionButton, Ribbon, Frame } from "../ui";
import { ASSETS } from "../assets";
import { ROUTES } from "../routes";
import { C, pixel, M, USER as user } from "../theme";

const JOURNAL_ART = ASSETS.journal;

// ORD plate text position. The count text is centered, then nudged by these to
// sit in the plate's empty area (clear of the baked-in soldier on the right).
// Tweak these two numbers to slide the text — units are % of the plate.
const ORD_TEXT_OFFSET = { x: -8, y: 0 }; // x: negative = left, y: negative = up

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
  capture: [
    { type: "photo", label: "PHOTO", icon: <Image size={20} /> },
    { type: "note", label: "NOTE", icon: <FileText size={20} /> },
    { type: "ai", label: "AI MEMORY", icon: <Sparkles size={20} /> },
    { type: "milestone", label: "MILESTONE", icon: <Star size={20} /> },
  ],
  progress: {
    percent: 27,
    days: 143,
    total: 730,
    stats: [
      { label: "MEMORIES", value: 42, art: "memories" },
      { label: "PHOTOS", value: 31, art: "photo" },
      { label: "MATES TAGGED", value: 18, art: "mates" },
      { label: "MILESTONES", value: 8, art: "milestone" },
    ],
  },
  // The soldier's own captures — live, viewable any time (the book itself stays
  // sealed until ORD). Newest first. `ago` is a pre-baked relative time so the
  // mock feed reads naturally without date math.
  recentEntries: [
    { id: "e1", type: "photo", title: "Bunk after stand-by-bed", ago: "2d", date: "29 MAY 2024", text: "Finally passed inspection. Took a shot before the SGT could mess it up again." },
    { id: "e2", type: "note", title: "Note to Hao Jie", ago: "3d", date: "28 MAY 2024", text: "Bro thanks for covering my guard duty when I was down with fever. I owe you one." },
    { id: "e3", type: "voice", title: "Voice memo · 0:42", ago: "5d", date: "26 MAY 2024", text: "Recorded my thoughts after the 8km route march. Legs gone but feeling good." },
    { id: "e4", type: "milestone", title: "First live firing", ago: "1w", date: "22 MAY 2024", text: "Range day. Hit marksman on the first try. Didn't expect that at all." },
  ],
  // Photos the COMMANDER assigned to this soldier's SECTION — scoped to the
  // section (ALPHA 3-1), never the whole unit. The hook is "new from CMD".
  sectionGallery: {
    section: "ALPHA 3-1",
    newCount: 12,
    photos: [
      { id: "g1", label: "Section photo", by: "2SG Faizal", date: "20 MAY 2024", glyph: "\u{1F4F8}" },
      { id: "g2", label: "Route march start", by: "2SG Faizal", date: "17 MAY 2024", glyph: "\u{1F6A9}" },
      { id: "g3", label: "Field camp brief", by: "3SG Lim", date: "25 JUN 2024", glyph: "\u{1F3D5}️" },
      { id: "g4", label: "Range day", by: "2SG Faizal", date: "22 MAY 2024", glyph: "\u{1F3AF}" },
      { id: "g5", label: "Cohesion BBQ", by: "3SG Lim", date: "30 MAY 2024", glyph: "\u{1F356}" },
      { id: "g6", label: "Morning PT", by: "2SG Faizal", date: "15 MAY 2024", glyph: "\u{1F3C3}" },
    ],
  },
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

// Per-capture-type icon for the recent-entries feed. photo/milestone have pixel
// art; note/voice fall back to emoji until art exists (🖉 note, 🎙 voice).
const ENTRY_ART = {
  photo: JOURNAL_ART.icons.photo,
  milestone: JOURNAL_ART.icons.milestone,
};
const ENTRY_GLYPH = {
  note: "\u{1F4DD}",
  voice: "\u{1F399}️",
};

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
const CleanLeftPage = forwardRef(function CleanLeftPage(_props, ref) {
  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/left_clean.png"
        alt="Clean Left Page"
        /* shift right by SPINE_NUDGE so the inner (right) edge crosses the spine */
        style={{ position: "absolute", top: 0, left: SPINE_NUDGE, width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
});

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
// points across the two years. Replace text (and later art) with real entries.
const STACK_LETTERS = [
  {
    id: "L1",
    from: "TO FUTURE ME",
    date: "WEEK 1",
    text: "Dear me,\n\nFirst night here and my hands won't stop shaking. I don't know anyone. I keep getting everything wrong.\n\nIf you're reading this — I hope you stopped being so scared. I hope you made it.\n\n— Day 1",
  },
  {
    id: "L2",
    from: "TO FUTURE ME",
    date: "WEEK 4",
    text: "Hey,\n\nFirst route march done. Legs gone, but the whole section finished together and I've never felt anything like it.\n\nMaybe I belong here after all. Don't forget this feeling.\n\n— Still standing",
  },
  {
    id: "L3",
    from: "TO FUTURE ME",
    date: "WEEK 9",
    text: "Me again,\n\nField camp. Mud everywhere, slept in a shellscrape, ate cold rations. Somehow I loved it.\n\nWho even am I now? Whoever you are reading this — I think we turned out okay.\n\n— From the jungle",
  },
  {
    id: "L4",
    from: "TO FUTURE ME",
    date: "WEEK 13",
    text: "Halfway through BMT.\n\nThe guy who cried at the ferry feels like a stranger. I carried someone's pack today without being asked. I'd never have done that before.\n\nKeep going. We're closer than we think.\n\n— Getting there",
  },
  {
    id: "L5",
    from: "TO FUTURE ME",
    date: "WEEK 17",
    text: "POP soon.\n\nI passed. Actually passed. The commander said he was proud and I had to look away.\n\nRemember this when civilian life gets soft — you did the thing you swore you couldn't.\n\n— Almost a soldier",
  },
  {
    id: "L6",
    from: "TO FUTURE ME",
    date: "ORD",
    text: "Last one.\n\nTwo years. Done. If you're reading this as a civilian — don't let it fade. The brothers, the tiredness, the small proud moments.\n\nWe grew up here. Don't forget us.\n\n— Me, at the end",
  },
];

// One letter sheet. The card art (card.png — a postcard back, 2032x1347) is the
// background; the same image is shared by every letter, with each letter's own
// text laid over the LEFT message area of the postcard. The right half (divider,
// "POSTCARD" header, stamp box, address lines) is part of the art.
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
      {/* Message area — left half of the postcard. */}
      <div
        style={{
          position: "absolute",
          top: "16%",
          left: "7%",
          width: "40%",
          height: "74%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div className="flex items-baseline justify-between" style={{ marginBottom: 8 }}>
          <span style={{ ...pixel, fontSize: 20, color: C.ink }}>{letter.from}</span>
          <span style={{ ...pixel, fontSize: 16, color: C.inkSoft }}>{letter.date}</span>
        </div>
        <p
          style={{
            fontFamily: "'VT323', monospace",
            fontSize: 19,
            lineHeight: "21px",
            color: C.ink,
            whiteSpace: "pre-wrap",
            margin: 0,
            flex: 1,
            overflow: "hidden",
          }}
        >
          {letter.text}
        </p>
      </div>
    </div>
  );
}

// Card matches the postcard art aspect (2032 x 1347 ≈ 1.508), landscape.
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

// ── ENVELOPE PLACEHOLDER — the on-page trigger that opens the letters overlay.
// A simple closed-envelope box for now; later this becomes the real envelope
// (flap-open animation, wax seal, etc.). Clicking it opens the focal overlay.
function EnvelopePlaceholder({ onOpen }) {
  const btnRef = useRef(null);

  // StPageFlip binds NATIVE mousedown/touchstart listeners on its own wrapper and
  // flips the page based on where you click (left side → previous page). React's
  // synthetic stopPropagation can't reliably stop a native listener on a parent,
  // so we attach our own NATIVE capture-phase listeners on the envelope and stop
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

  return (
    <button
      type="button"
      ref={btnRef}
      onClick={function (e) { e.stopPropagation(); onOpen(); }}
      className="wgt-press"
      aria-label="Open letters to yourself"
      style={{
        position: "relative",
        width: 220,
        height: 150,
        background: "linear-gradient(#e8d6ac,#dcc491)",
        border: "2px solid " + C.line,
        borderRadius: 8,
        boxShadow: "0 8px 22px #0005, inset 0 1px 0 #fff8",
        cursor: "pointer",
      }}
    >
      {/* Flap — a triangle folded down over the top half. */}
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          borderLeft: "110px solid transparent",
          borderRight: "110px solid transparent",
          borderTop: "76px solid #d8c39a",
          filter: "drop-shadow(0 2px 2px #0003)",
        }}
      />
      {/* Wax seal — placeholder dot where the flap meets. */}
      <span
        style={{
          position: "absolute",
          top: 56,
          left: "50%",
          transform: "translateX(-50%)",
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "radial-gradient(circle at 38% 32%, #7a3a2a, #4a1f16)",
          border: "2px solid " + C.gold,
          boxShadow: "0 3px 8px #0007, inset 0 2px 3px #fff3",
          zIndex: 2,
        }}
      />
      <span
        style={{
          position: "absolute",
          bottom: 14,
          left: 0,
          right: 0,
          ...pixel,
          fontSize: 15,
          color: C.ink,
          textAlign: "center",
        }}
      >
        TAP TO OPEN
      </span>
    </button>
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

// ── LETTERS PAGE — clean parchment page holding the envelope trigger. In a
// SHARED (public) view the letters-to-yourself are private, so the envelope is
// replaced with a small "kept private" note instead of being openable. ──
const LettersPage = forwardRef(function LettersPage({ onOpenLetters, shared = false }, ref) {
  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/left_clean.png"
        alt=""
        style={{ position: "absolute", top: 0, left: SPINE_NUDGE, width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <p style={{ ...pixel, fontSize: 22, color: C.ink, marginBottom: 22, letterSpacing: 1 }}>
          LETTERS FROM YOURSELF
        </p>
        {shared ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: 0.7 }}>
            <Lock size={34} style={{ color: C.inkSoft }} />
            <p style={{ ...pixel, fontSize: 16, color: C.inkSoft, textAlign: "center", maxWidth: 220 }}>
              These letters are private to the writer.
            </p>
          </div>
        ) : (
          <EnvelopePlaceholder onOpen={onOpenLetters} />
        )}
      </div>
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
  // Fixed image pages: cover, enlistment L/R, BMT L/R, field camp L/R,
  // POP L/R, new posting L/R, ORD L/R, last page.
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
          {/* Blank clean spreads — placeholders for future content (these used to
              be the New Posting and ORD spreads). */}
          <CleanLeftPage />
          <CleanRightPage />
          {/* 2nd-to-last clean page: the envelope opens a focal letters overlay
              (the cue-card stack) above the book. */}
          {/* In a shared view, letters are hidden UNLESS the owner opted to
              include them (shareLetters). Owner's own view always shows them. */}
          <LettersPage
            shared={shared && !shareLetters}
            onOpenLetters={function () { setLettersOpen(true); }}
          />
          <CleanRightPage />
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

// A Quick Capture button: a gold-on-green lucide icon + label, each on its OWN
// green leather backboard plate.
function CaptureButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="wgt-press flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-4"
      style={{
        color: C.textGold,
        maxWidth: 230,
        backgroundImage: "url(" + JOURNAL_ART.quickCaptureBoard + ")",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
      }}
    >
      <span className="shrink-0" style={{ color: C.gold }}>{icon}</span>
      <span style={pixel} className="text-[15px] leading-none">{label}</span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   KEEPSAKE UI — small scrapbook pieces used across the landing.
   Pure CSS where art is missing; emoji glyphs mark slots to be replaced by
   generated pixel art (flagged in the asset list returned to the user).
   ═══════════════════════════════════════════════════════════ */

// A tilted polaroid with a pixel-art photo well. `glyph` is a placeholder for
// art-to-be-generated; pass `tilt` (deg) and `tape` to taste.
function Polaroid({ glyph, caption, h = 64, tilt = 0, tape = false, className = "", onClick }) {
  const El = onClick ? "button" : "div";
  return (
    <El
      onClick={onClick}
      className={"wgt-polaroid " + (onClick ? "wgt-press " : "") + className}
      style={{ transform: "rotate(" + tilt + "deg)", border: 0 }}
      title={caption}
    >
      {tape && <span className="wgt-tape" style={{ top: -8, left: "50%", marginLeft: -28, transform: "rotate(-4deg)" }} />}
      <div className="wgt-photo-well flex items-center justify-center" style={{ height: h }}>
        <span style={{ fontSize: Math.min(h * 0.5, 34), filter: "drop-shadow(0 1px 2px #0006)" }}>{glyph}</span>
      </div>
      {caption && (
        <p style={{ ...pixel, color: C.inkSoft }} className="mt-1 truncate text-center text-[11px]">{caption}</p>
      )}
    </El>
  );
}

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
   MODALS — capture (photo/note/voice/milestone), read view, lightbox.
   All share ModalShell: a centered sepia card over a dim backdrop. These are
   prototype interfaces — Save pushes a mock entry into session state; there is
   no backend, so entries reset on refresh.
   ═══════════════════════════════════════════════════════════ */

function ModalShell({ title, icon, onClose, children, footer, maxWidth = 460 }) {
  // Esc closes; the backdrop is a click target. Body content scrolls if tall.
  React.useEffect(function () {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return function () { document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
        style={{ background: "#11100bcc" }}
      />
      <Frame
        frame="card"
        className="relative flex max-h-[88vh] w-full flex-col overflow-hidden p-4"
        style={{ maxWidth }}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <Ribbon size={15}>
            <span className="inline-flex items-center gap-2">{icon}{title}</span>
          </Ribbon>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="wgt-press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: C.green, color: C.textGold }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="mt-3 flex justify-end gap-2">{footer}</div>}
      </Frame>
    </div>
  );
}

// Shared field styling for the capture forms.
const fieldStyle = {
  ...pixel,
  width: "100%",
  background: "#f3e8d0",
  border: "2px solid " + C.line,
  borderRadius: 8,
  padding: "8px 10px",
  color: C.ink,
  fontSize: 16,
  boxSizing: "border-box",
};

function FieldLabel({ children }) {
  return (
    <p style={{ ...pixel, ...M }} className="mb-1 mt-3 text-[14px] uppercase tracking-wide first:mt-0">
      {children}
    </p>
  );
}

function SaveButton({ onClick, children = "SAVE TO JOURNAL" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wgt-press flex items-center gap-2 rounded-lg border-2 px-4 py-2"
      style={{ borderColor: C.gold + "99", background: C.green, color: C.textGold }}
    >
      <Plus size={16} />
      <span style={pixel} className="text-[16px]">{children}</span>
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
    <ModalShell title={meta.label} icon={meta.icon} onClose={onClose}
      footer={
        <SaveButton onClick={handleSave}>
          {uploading ? "UPLOADING..." : "SAVE TO JOURNAL"}
        </SaveButton>
      }
    >
      {type === "photo" && (
        <>
          <FieldLabel>Photo</FieldLabel>
          {/* Clickable upload zone */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center rounded-lg"
            style={{
              height: 150,
              background: "#2a3320",
              border: "3px solid #4a4a28",
              borderRadius: 4,
              cursor: "pointer",
              overflow: "hidden",
            }}
          >
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ ...pixel, color: C.textGold, opacity: 0.7, fontSize: 14 }}>
                Tap to add photo
                <br />
                <Camera size={16} style={{ display: "inline", marginTop: 4 }} />
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
          <input style={fieldStyle} value={title} onChange={function (e) { setTitle(e.target.value); }} placeholder="What's happening?" />
          <FieldLabel>Tag mates (optional)</FieldLabel>
          <input style={fieldStyle} value={text} onChange={function (e) { setText(e.target.value); }} placeholder="e.g. Hao Jie, Rafiq" />
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

  return (
    <ModalShell title={meta.label} icon={meta.icon} onClose={onClose}>
      <div className="mb-2 flex items-center gap-2">
        <span style={{ ...pixel, ...M }} className="text-[13px]">{entry.date}</span>
        {entry.ago && <span style={{ ...pixel, ...M }} className="text-[13px]">· {entry.ago} ago</span>}
      </div>
      <h2 style={{ ...pixel, color: C.ink }} className="text-[26px] leading-tight">{entry.title}</h2>

      {entry.type === "photo" && (
        <div className="mt-3">
          {entry.photoURL
            ? <img src={entry.photoURL} alt={entry.title} style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 4 }} />
            : <PlaceholderImg label={entry.title} h={200} />
          }
        </div>
      )}
      {entry.type === "voice" && (
        <div className="mt-3 flex items-center gap-3 rounded-lg px-3 py-3" style={{ background: C.cardInner }}>
          <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: C.green, color: C.textGold }}>
            <Mic size={20} />
          </span>
          <div className="h-2 flex-1 rounded-full" style={{ background: "linear-gradient(90deg," + C.green + " 40%, #00000020 40%)" }} />
        </div>
      )}

      {entry.text && (
        <p style={{ fontFamily: "'VT323', monospace", color: C.ink }} className="mt-3 whitespace-pre-wrap text-[16px] leading-relaxed">
          {entry.text}
        </p>
      )}
    </ModalShell>
  );
}

// Enlarged view of a commander-assigned section photo.
function GalleryLightbox({ photo, section, onClose }) {
  return (
    <ModalShell title="SECTION PHOTO" icon={<Camera size={16} />} onClose={onClose} maxWidth={520}>
      <PlaceholderImg label={photo.label} h={260} />
      <h2 style={{ ...pixel, color: C.ink }} className="mt-3 text-[24px] leading-tight">{photo.label}</h2>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span style={{ ...pixel, ...M }} className="text-[14px]">{photo.date}</span>
        <span style={{ ...pixel, ...M }} className="text-[14px]">· {section}</span>
      </div>
      <div className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: C.cardInner }}>
        <UsersIcon size={16} style={{ color: C.green }} />
        <span style={{ ...pixel, color: C.ink }} className="text-[15px]">Assigned by {photo.by}</span>
      </div>
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

  const [captureType, setCaptureType] = useState(null); // photo|note|voice|milestone
  const [readEntry, setReadEntry] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const handleSaveEntry = async (payload) => {
    try {
      // 1. Handle AI Memory Engine Saves
      if (payload && payload.type === "ai_memory") {
        try {
          console.log("1. payload received:", payload);

          const blobResponse = await fetch(payload.rawBlobUrl);
          console.log("2. blob fetch status:", blobResponse.status, blobResponse.ok);

          const blob = await blobResponse.blob();
          console.log("3. blob size:", blob.size, "type:", blob.type);

          const userId = auth.currentUser?.uid || "anonymous";
          console.log("4. userId:", userId);

          const storageRef = ref(storage, `ai-memories/${userId}/${Date.now()}.png`);
          console.log("5. storageRef:", storageRef.fullPath);

          await uploadBytes(storageRef, blob);
          console.log("6. upload done");

          const downloadURL = await getDownloadURL(storageRef);
          console.log("7. downloadURL:", downloadURL);

          await addDoc(collection(db, "journalEntries"), {
            userId,
            type: "photo",
            photoURL: downloadURL,
            caption: payload.promptDescription || "AI Memory",
            taggedMates: "Generated by AI",
            createdAt: serverTimestamp()
          });
          console.log("8. firestore doc saved");
        } catch (err) {
          console.error("AI memory save failed at step:", err);
        }
        return;
      }

      // 2. Handle standard captures (Note, Milestone, Voice) passed from CaptureModal
      if (payload && payload.type !== "photo") { // Photo is already handled internally by CaptureModal
        await addDoc(collection(db, "journalEntries"), {
          userId: auth.currentUser?.uid || "anonymous",
          type: payload.type,
          title: payload.title,
          text: payload.text,
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
      action={<ActionButton icon={<Plus size={20} />} onClick={function () { setCaptureType("note"); }}>NEW MEMORY</ActionButton>}
      fill
    >
      {/* No-scroll desk: the whole landing is laid out to fit one viewport on a
          common laptop. On xl+ it locks to the screen height; below that it
          relaxes into a normal scroll so nothing clips on short windows. */}
      <div className="mx-auto h-full w-full max-w-[1640px] overflow-y-auto p-3 sm:p-5 xl:overflow-hidden">
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12">

          {/* ═══════════════ LEFT — the book + capture ═══════════════ */}
          <section className="flex min-h-0 flex-col gap-4 lg:col-span-7">

            {/* ---- COVER (sealed) + ORD dog-tag + quick capture ---- */}
            <div className="wgt-paper flex min-h-0 flex-1 flex-col p-3">
              <div className="flex min-h-0 flex-1 items-stretch">

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
                      aspectRatio: "600 / 300",
                    }}
                  >
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center text-center"
                      style={{ transform: "translate(" + ORD_TEXT_OFFSET.x + "%, " + ORD_TEXT_OFFSET.y + "%)" }}
                    >
                      <p style={{ ...pixel, color: C.gold }} className="text-[12px] leading-none tracking-wide">LOCKED UNTIL ORD</p>
                      <p style={{ ...pixel, color: "#efe3c4", textShadow: "0 2px 0 #00000055" }} className="text-[52px] leading-none">{data.ord.daysLeft}</p>
                      <p style={{ ...pixel, color: C.gold }} className="text-[13px] leading-none tracking-[0.2em]">DAYS LEFT</p>
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

              {/* QUICK CAPTURE — the daily-use hook. Each button rides on its own
                  green leather backboard plate. */}
              <div className="mt-3 shrink-0">
                <StarTitle>QUICK CAPTURE</StarTitle>
                <div className="flex items-stretch justify-between gap-3">
                  {data.capture.map(function (c) {
                    return (
                      <CaptureButton
                        key={c.label}
                        icon={c.icon}
                        label={c.label}
                        onClick={function () { setCaptureType(c.type); }}
                      />
                    );
                  })}
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
              <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
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

          {/* ═══════════════ RIGHT — live content ═══════════════ */}
          <section className="flex min-h-0 flex-col gap-4 lg:col-span-5">

            {/* ---- MY RECENT ENTRIES (live; the book stays sealed) ---- */}
            <div className="wgt-paper flex min-h-0 flex-1 flex-col p-3">
              <StarTitle right={<span style={{ ...pixel, ...M }} className="text-[11px]">LIVE</span>}>MY RECENT ENTRIES</StarTitle>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {entries.map(function (e) {
                  return (
                    <button
                      key={e.id}
                      onClick={function () { setReadEntry(e); }}
                      className="wgt-press flex w-full items-center gap-3 rounded-lg p-2 text-left"
                      style={{ background: C.cardInner, boxShadow: "inset 0 1px 0 #fff4, 0 1px 2px #0002" }}
                    >
                      {/* Mini-polaroid thumbnail. photo/milestone use pixel art;
                          note/voice fall back to emoji until art exists. */}
                      <div className="wgt-polaroid shrink-0" style={{ transform: "rotate(-3deg)", padding: "3px 3px 9px" }}>
                        <div className="wgt-photo-well flex h-10 w-12 items-center justify-center overflow-hidden">
                          {e.type === "photo" && e.photoURL
                            ? <img src={e.photoURL} alt={e.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : ENTRY_ART[e.type]
                              ? <PixIcon src={ENTRY_ART[e.type]} size={22} />
                              : <span style={{ fontSize: 18 }}>{ENTRY_GLYPH[e.type] || ENTRY_GLYPH.note}</span>}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p style={{ ...pixel, color: C.ink }} className="truncate text-[16px]">{e.title}</p>
                        {e.text && <p style={{ ...pixel, ...M }} className="truncate text-[12px]">{e.text}</p>}
                        <p style={{ ...pixel, ...M }} className="text-[11px]">{e.date}</p>
                      </div>
                      <span style={{ ...pixel, ...M }} className="shrink-0 text-[12px]">{e.ago}</span>
                    </button>
                  );
                })}
              </div>
              <button className="wgt-press mt-2 flex shrink-0 w-full items-center justify-center gap-2 rounded-lg py-2" style={{ background: C.green, color: C.textGold, boxShadow: "inset 0 1px 0 #fff2, 0 1px 3px #0004" }}>
                <span style={pixel} className="text-[15px]">VIEW ALL ENTRIES</span>
                <ChevronRight size={15} />
              </button>
            </div>

            {/* ---- SECTION GALLERY (commander-assigned, section-scoped) ---- */}
            <div className="wgt-paper flex shrink-0 flex-col p-3">
              <StarTitle
                right={
                  <span style={{ ...pixel, ...M }} className="flex items-center gap-1 text-[11px]">
                    <UsersIcon size={10} /> {data.sectionGallery.section}
                  </span>
                }
              >
                SECTION GALLERY
              </StarTitle>
              <p style={{ ...pixel, ...M }} className="mb-2 flex items-center gap-1 text-[12px]">
                <Camera size={12} />
                <span style={{ color: C.green }}>{data.sectionGallery.newCount} new</span> from your commander
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {data.sectionGallery.photos.map(function (p, i) {
                  return (
                    <Polaroid
                      key={p.id}
                      glyph={p.glyph}
                      caption={p.label}
                      h={62}
                      tilt={[-3, 2, -1, 1, -2, 3][i % 6]}
                      onClick={function () { setLightboxPhoto(p); }}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ---- modal interfaces (prototype, session state) ---- */}
      {captureType === "ai" ? (
        <AIMemoryModal
          onClose={function () { setCaptureType(null); }}
          onSave={function (payload) { handleSaveEntry(payload); }}
        />
      ) : captureType ? (
        <CaptureModal
          type={captureType}
          onClose={function () { setCaptureType(null); }}
          onSave={handleSaveEntry}
        />
      ) : null}
      {readEntry && (
        <EntryReadModal entry={readEntry} onClose={function () { setReadEntry(null); }} />
      )}
      {lightboxPhoto && (
        <GalleryLightbox
          photo={lightboxPhoto}
          section={data.sectionGallery.section}
          onClose={function () { setLightboxPhoto(null); }}
        />
      )}
    </AppShell>
  );
}
