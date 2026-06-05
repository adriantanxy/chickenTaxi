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
  ChevronRight, ChevronLeft, Camera, X,
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
const PAGE_W = 505;
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
const CoverPage = forwardRef(function CoverPage(_props, ref) {
  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/coverpage.png"
        alt="Journal Cover"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
});

// ── ENLISTMENT LEFT — official welcome message on the parchment note card ──
const EnlistmentLeft = forwardRef(function EnlistmentLeft({ commanderNote }, ref) {
  const displayNote = commanderNote
    || "To our newest recruit,\n\nThe next 2 months will be the hardest you've known. You'll be scared. You'll miss home, miss sleep, miss who you used to be.\n\nBe brave. We've got you.\n\n— Your Commanders";

  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/enlistment_left.png"
        alt="Enlistment Left"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* parchment note card sits lower-right; corners ~ x:40%-95%, y:44%-88% */}
      <div style={{
        position: "absolute",
        top: "54%",
        left: "40%",
        width: "50%",
        height: "39%",
        transform: "rotate(5deg)",
        display: "flex",
        flexDirection: "column",
        padding: "10px 12px",
        boxSizing: "border-box",
      }}>
        <p style={{
          ...pixel, fontSize: 12, color: "#7a3a2a",
          margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1,
        }}>
          ★ Official Message ★
        </p>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <p style={{
            fontFamily: "'VT323', monospace",
            fontSize: 13,
            color: C.ink,
            lineHeight: "16px",
            whiteSpace: "pre-wrap",
            margin: 0,
          }}>
            {displayNote}
          </p>
        </div>
      </div>
    </div>
  );
});

// ── ENLISTMENT RIGHT — user's own day-1 note on the parchment note card ──
const EnlistmentRight = forwardRef(function EnlistmentRight({ userNote }, ref) {
  const displayNote = userNote
    || "Enlisted today, " + data.cover.enlisted + ".\n\nI honestly don't know what I'm in for. Saying bye to my family at the ferry terminal was harder than I thought.\n\nBut I'm here now. " + user.name + ", reporting for duty.\n\nLet's see who I become....";

  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/enlistment_right.png"
        alt="Enlistment Right"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* parchment note card is centered; corners ~ x:28%-85%, y:38%-83% */}
      <div style={{
        position: "absolute",
        top: "43%",
        left: "35%",
        width: "52%",
        height: "41%",
        transform: "rotate(2.5deg)",
        display: "flex",
        flexDirection: "column",
        padding: "10px 12px",
        boxSizing: "border-box",
      }}>
        <p style={{
          ...pixel, fontSize: 14, color: C.inkSoft,
          margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1,
        }}>
          What YOU wrote on Day 1
        </p>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <p style={{
            fontFamily: "'VT323', monospace",
            fontSize: 12,
            color: C.ink,
            lineHeight: "18px",
            whiteSpace: "pre-wrap",
            margin: 0,
          }}>
            {displayNote}
          </p>
        </div>
      </div>
    </div>
  );
});

// ── BMT CHAPTER LEFT — complete designed spread, image only ──
const BmtChapterLeft = forwardRef(function BmtChapterLeft(_props, ref) {
  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/bmt_chapter_left.png"
        alt="BMT Chapter Left"
        /* Image aspect (0.800) is wider than the page box, so cover would clip
           the sides. Scaling to ~94% height lets the full width show (only ~1%
           side crop) with a thin top/bottom margin that blends with the page. */
        style={{ position: "absolute", left: 0, right: 0, top: "2%", width: "100%", height: "97%", objectFit: "cover" }}
      />
    </div>
  );
});

// ── BMT CHAPTER RIGHT — group photo spread + two handwritten notes ──
const BmtChapterRight = forwardRef(function BmtChapterRight({ userNote, commanderNote }, ref) {
  // Personal message from the section commander, addressed to the soldier.
  const cmdNote = commanderNote
    || "Alex,\n\nAt the start of BMT, you couldn't hold a 1-min plank. Last week you carried Rafiq's load on the last 2km without being asked.\n\nThat's the soldier I'll remember.\n\nProud of you. Now go be great.\n\n— 3SG Lim";

  const myNote = userNote
    || "63 days. Came in alone, leaving with brothers. \n\nCan't believe I made it through. This was crazy...\nbut i guess it's time for round 2...";

  const noteText = {
    fontFamily: "'VT323', monospace",
    color: C.ink,
    whiteSpace: "pre-wrap",
    margin: 0,
  };

  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/bmt_chapter_right.png"
        alt="BMT Chapter Right"
        /* See BMT left: scaled to ~94% height so the full width shows with
           minimal side crop and a thin blending top/bottom margin. */
        style={{ position: "absolute", left: 0, right: 0, top: "2%", width: "100%", height: "97%", objectFit: "cover" }}
      />

      {/* COMMANDER'S NOTES lined slot (bottom-left); lines ~ x:7%-36%, y:74%-88% */}
      <div style={{
        position: "absolute",
        top: "74.5%",
        left: "9%",
        transform: "rotate(-5deg)",
        width: "27%",
        height: "13.5%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}>
        <p style={{ ...noteText, fontSize: 11, lineHeight: "13px" }}>
          {cmdNote}
        </p>
      </div>

      {/* MY NOTES lined slot (bottom-right); lines ~ x:64%-92%, y:74%-88% */}
      <div style={{
        position: "absolute",
        top: "75%",
        left: "64.5%",
        width: "27%",
        transform: "rotate(5.5deg)",
        height: "13.5%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}>
        <p style={{ ...noteText, fontSize: 12, lineHeight: "13px" }}>
          {myNote}
        </p>
      </div>
    </div>
  );
});

// ── FIELD CAMP LEFT — outfield spread + my own reflection in MY REFLECTION slot ──
const FieldCampLeft = forwardRef(function FieldCampLeft({ userNote }, ref) {
  const displayNote = userNote
    || "5 days. Honestly the worst week of my life.\n\nSoaked to the bone, no sleep, ration packs for every meal...\n\nThere were nights I wanted to give up. But Hao Jie kept me going when I wanted to give up.\n\nSomehow we survived it. Together.";

  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/fieldcamp_left.png"
        alt="Field Camp Left"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* MY REFLECTION lined slot (right, mid-lower); lines ~ x:63%-93%, y:64%-88% */}
      <div style={{
        position: "absolute",
        top: "60.5%",
        left: "60%",
        transform: "rotate(6.2deg)",
        width: "30%",
        height: "24%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace",
          fontSize: 12,
          color: C.ink,
          lineHeight: "13px",
          whiteSpace: "pre-wrap",
          margin: 0,
        }}>
          {displayNote}
        </p>
      </div>
    </div>
  );
});

// ── FIELD CAMP RIGHT — group photo spread + buddy's handwritten note ──
const FieldCampRight = forwardRef(function FieldCampRight({ buddyNote }, ref) {
  // A note the soldier's buddy (Hao Jie) wrote to them.
  const displayNote = buddyNote
    || "Bro,\n\n5 days of hell and we made it. I still can't believe we slept in that flooded shellscrape.\n\nWhen I was about to break, you cheered me up. I won't forget that. Whatever comes next, I wish you all the best.\n\n— Hao Jie";

  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/fieldcamp_right.png"
        alt="Field Camp Right"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* BUDDY'S NOTE lined slot (bottom-left); lines ~ x:9%-37%, y:57%-79% */}
      <div style={{
        position: "absolute",
        top: "57%",
        left: "16%",
        transform: "rotate(-2.5deg)",
        width: "29%",
        height: "40%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace",
          fontSize: 13,
          color: C.ink,
          lineHeight: "13px",
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
        /* Image has a book-spine/binding crease baked into its right edge.
           objectPosition:"left" anchors the image to the LEFT edge so the
           horizontal crop comes entirely off the RIGHT (removing the crease)
           and the left book border stays fully visible / uncropped. */
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "99%", objectFit: "cover", objectPosition: "left" }}
      />
    </div>
  );
});

// ── POP RIGHT — graduation spread + commander's send-off in COMMANDER'S NOTE slot ──
const PopRight = forwardRef(function PopRight({ commanderNote }, ref) {
  // POP send-off — different in tone from the enlistment (welcome) and BMT
  // (proud-of-your-progress) notes: this one is a farewell as the soldier
  // graduates BMT and moves on to their vocation.
  const displayNote = commanderNote
    || "Alex,\n\nMy job was to take a scared recruit and hand back a soldier. Today I'm done. You don't need me anymore.\n\nWherever you post out to, lead the way you marched: heart first. Make us proud.\n\n— 3SG Lim";

  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/pop_right.png"
        alt="POP Right"
        style={{ position: "absolute", inset: 0, width: "100%", height: "99%", objectFit: "cover" }}
      />
      {/* COMMANDER'S NOTE lined slot (center-right); card ~ x:57%-91%, y:55%-79% */}
      <div style={{
        position: "absolute",
        top: "53%",
        left: "57.5%",
        transform: "rotate(6deg)",
        width: "32%",
        height: "30%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace",
          fontSize: 12,
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

// ── NEW POSTING LEFT — unit posting spread + new section commander's welcome ──
const NewPostingLeft = forwardRef(function NewPostingLeft({ commanderNote }, ref) {
  // The NEW section commander welcoming Alex into Alpha 3-1. Purpose: a
  // fresh-start welcome to a new unit — short, since the slot is a wide,
  // shallow card.
  const displayNote = commanderNote
    || "Welcome to Alpha 3-1, Alex. You show me what you've got. It was fun doing this with you\n\n  — 2SG Faizal";

  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/new_posting_left.png"
        alt="New Posting Left"
        style={{ position: "absolute", inset: 0, width: "100%", height: "99.5%", objectFit: "cover" }}
      />
      {/* COMMANDER'S NOTE card — write below the baked-in label, clear of the
          plant sprig at the card's right; writable ~ x:46%-75%, y:45%-50% */}
      <div style={{
        position: "absolute",
        top: "43.5%",
        left: "46%",
        transform: "rotate(-1deg)",
        width: "29%",
        height: "10%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace",
          fontSize: 11,
          color: C.ink,
          lineHeight: "12px",
          whiteSpace: "pre-wrap",
          margin: 0,
        }}>
          {displayNote}
        </p>
      </div>
    </div>
  );
});

// ── NEW POSTING RIGHT — new team spread + the CO's mission charge ──
const NewPostingRight = forwardRef(function NewPostingRight({ commanderNote }, ref) {
  // LTC Lim is the Commanding Officer — a senior officer, not a section
  // commander. Purpose: a bigger-picture mission charge to the whole unit,
  // distinct in rank and voice from the section-level welcomes/send-offs.
  const displayNote = commanderNote
    || "You guys were amazing, wouldn't have asked for another group of people to do this with. Don't avoid me when you see me next time >.<\n— LTC Lim, CO";

  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/new_posting_right.png"
        alt="New Posting Right"
        style={{ position: "absolute", inset: 0, width: "100%", height: "101%", objectFit: "cover" }}
      />
      {/* LTC LIM'S NOTE lined slot (bottom-left); card ~ x:11%-42%, y:81%-93% */}
      <div style={{
        position: "absolute",
        top: "82.5%",
        left: "11.5%",
        width: "30%",
        height: "11%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}>
        <p style={{
          fontFamily: "'VT323', monospace",
          fontSize: 11,
          color: C.ink,
          lineHeight: "12px",
          whiteSpace: "pre-wrap",
          margin: 0,
        }}>
          {displayNote}
        </p>
      </div>
    </div>
  );
});

// ── ORD LEFT — ORD milestone spread, image only (self-contained) ──
const OrdLeft = forwardRef(function OrdLeft(_props, ref) {
  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/ord_left.png"
        alt="ORD Left"
        /* cover crops the taller image top+bottom; objectPosition:top anchors
           the crop to the bottom so the top banner/border stays visible. */
        style={{ position: "absolute", left: 0, right: 0, top: "1%", width: "100%", height: "98%", objectFit: "cover", objectPosition: "top" }}
      />
    </div>
  );
});

// ── ORD RIGHT — closing spread, image only (self-contained) ──
const OrdRight = forwardRef(function OrdRight(_props, ref) {
  return (
    <div ref={ref} style={{ ...pageBase }}>
      <img
        src="/assets/journal/ord_right.png"
        alt="ORD Right"
        style={{ position: "absolute", left: 1, right: 0, top: "0%", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
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
   FLIPBOOK VIEW
   ═══════════════════════════════════════════════════════════ */
function JournalFlipbook({ onClose }) {
  const bookRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  // Fixed image pages: cover, enlistment L/R, BMT L/R, field camp L/R,
  // POP L/R, new posting L/R, ORD L/R, last page.
  const totalPages = 14;

  const onFlip = useCallback(function (e) { setCurrentPage(e.data); }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundImage: "url(/assets/journal/table.png)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
      {/* Back tab — a scrapbook-style tag pinned to the table, styled like the
          rest of the journal (pixel font, gold-on-dark) so it reads as part of
          the keepsake rather than a generic browser chrome button. */}
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

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <HTMLFlipBook
          ref={bookRef}
          width={PAGE_W}
          height={PAGE_H}
          showCover={true}
          /* Faster flip + lighter shadow so the brief mid-flip frame (where a
             turning page's border doesn't perfectly align with the page
             beneath it) passes quickly and is less noticeable. */
          flippingTime={550}
          usePortrait={true}
          autoSize={true}
          maxShadowOpacity={0.2}
          drawShadow={true}
          mobileScrollSupport={false}
          onFlip={onFlip}
          style={{ boxShadow: "0 8px 32px #00000066" }}
          className="journal-flipbook"
        >
          <CoverPage />
          <EnlistmentLeft commanderNote={null} />
          <EnlistmentRight userNote={null} />
          <BmtChapterLeft />
          <BmtChapterRight userNote={null} commanderNote={null} />
          <FieldCampLeft userNote={null} />
          <FieldCampRight buddyNote={null} />
          <PopLeft />
          <PopRight commanderNote={null} />
          <NewPostingLeft commanderNote={null} />
          <NewPostingRight commanderNote={null} />
          <OrdLeft />
          <OrdRight />
          <LastPage />
        </HTMLFlipBook>
      </div>
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

  function handleSaveEntry() {
    // entries are now driven by Firestore's onSnapshot — nothing to do here
  }

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
          onSave={handleSaveEntry}
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
