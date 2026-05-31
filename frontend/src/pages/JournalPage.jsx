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
import React, { useState, useRef, forwardRef, useCallback } from "react";
import HTMLFlipBook from "react-pageflip";
import {
  BookOpen, Plus, Image, FileText, Mic, Star, Mail, Lock,
  MoreHorizontal, ChevronRight, ChevronLeft, Heart, Camera,
  Users as UsersIcon, Pen, Award,
} from "lucide-react";
import { AppShell, ActionButton, Card, Ribbon } from "../ui";
import { ROUTES } from "../routes";
import { C, pixel, D, M, USER as user } from "../theme";

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
    { label: "PHOTO", icon: <Image size={18} /> },
    { label: "NOTE", icon: <FileText size={18} /> },
    { label: "VOICE", icon: <Mic size={18} /> },
    { label: "MILESTONE", icon: <Star size={18} /> },
    { label: "LETTER TO\nFUTURE ME", icon: <Mail size={18} /> },
  ],
  progress: {
    percent: 27,
    days: 143,
    total: 730,
    stats: [
      { label: "MEMORIES", value: 42, glyph: "\u{1F4D6}" },
      { label: "PHOTOS", value: 31, glyph: "\u{1F5BC}️" },
      { label: "MATES TAGGED", value: 18, glyph: "\u{1F465}" },
      { label: "MILESTONES", value: 8, glyph: "⭐" },
    ],
  },
  sealed: [
    { title: "First book in camp", date: "20 APR 2024", glyph: "\u{1F3D5}️", extra: 6 },
    { title: "Route March", date: "17 MAY 2024", glyph: "\u{1F6A9}", extra: 9 },
    { title: "Outfield night", date: "27 JUN 2024", glyph: "\u{1F30C}", extra: 5 },
    { title: "Made new buddies", date: "08 SEP 2024", glyph: "\u{1F305}", extra: 4 },
  ],
  letters: [
    { when: "6 MONTHS IN" },
    { when: "1 YEAR IN" },
    { when: "1.5 YEARS IN" },
  ],
  quote:
    "The moments may be small, but the growth is real.\nKeep going. Your future self is counting on you.",
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
        style={{ position: "absolute", inset: 0, width: "100%", height: "99%", objectFit: "cover" }}
      />
    </div>
  );
});

// ── BMT CHAPTER RIGHT — group photo spread + two handwritten notes ──
const BmtChapterRight = forwardRef(function BmtChapterRight({ userNote, commanderNote }, ref) {
  // Personal message from the section commander, addressed to the soldier.
  const cmdNote = commanderNote
    || "Alex,\n\n At the start of BMT, you couldn't hold a 1-min plank. Last week you carried Rafiq's load on the last 2km without being asked.\n\nThat's the soldier I'll remember.\n\nProud of you. Now go be great.\n\n— 3SG Lim";

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
        style={{ position: "absolute", inset: 0, width: "100%", height: "99%", objectFit: "cover" }}
      />

      {/* COMMANDER'S NOTES lined slot (bottom-left); lines ~ x:7%-36%, y:74%-88% */}
      <div style={{
        position: "absolute",
        top: "72.6%",
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
        top: "73.2%",
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
        style={{ position: "absolute", inset: 0, width: "100%", height: "99%", objectFit: "cover" }}
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
           Render ~3% wider than the page and anchor top-left so the page's
           overflow:hidden clips that crease off the right side. */
        style={{ position: "absolute", top: 0, left: 0, width: "103%", height: "99%", objectFit: "cover", objectPosition: "center" }}
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
        left: "54.5%",
        transform: "rotate(5.5deg)",
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
  const totalPages = journalEntries.length + 10;

  const onFlip = useCallback(function (e) { setCurrentPage(e.data); }, []);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundImage: "url(/assets/journal/table.png)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <HTMLFlipBook
          ref={bookRef}
          width={PAGE_W}
          height={PAGE_H}
          showCover={true}
          flippingTime={800}
          usePortrait={true}
          autoSize={true}
          maxShadowOpacity={0.35}
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
          {journalEntries.map(function (entry) { return renderPage(entry); })}
          <BackCover />
        </HTMLFlipBook>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LANDING VIEW
   ═══════════════════════════════════════════════════════════ */

function CaptureButton({ icon, label }) {
  return (
    <button className="wgt-press flex min-w-[130px] flex-1 items-center justify-center gap-2 rounded-lg px-2 py-3" style={{ background: C.green, color: C.textGold }}>
      <span className="shrink-0">{icon}</span>
      <span style={pixel} className="whitespace-pre-line text-left text-[14px] leading-none">{label}</span>
    </button>
  );
}

function MateStack({ extra }) {
  return (
    <div className="flex items-center">
      <div className="flex">
        {[0, 1, 2].map(function (i) {
          return (
            <div
              key={i}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[12px]"
              style={{ background: C.green, outline: "2px solid " + C.cardLight, marginLeft: i ? -6 : 0 }}
            >
              {"\u{1F9D1}‍✈️"}
            </div>
          );
        })}
      </div>
      <span style={{ ...pixel, ...M }} className="ml-1 text-[13px]">+{extra}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════ */
export default function JournalPage({ onNavigate }) {
  const [bookOpen, setBookOpen] = useState(false);

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
      icon={<BookOpen size={36} />} title="JOURNAL" subtitle="CAPTURE MOMENTS. REFLECT. GROW."
      action={<ActionButton icon={<Plus size={20} />}>NEW MEMORY</ActionButton>}
    >
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-4 p-3 sm:p-6 lg:grid-cols-3">
        {/* ===================== LEFT / MAIN ===================== */}
        <div className="space-y-4 lg:col-span-2">

          {/* ---- COVER + QUICK CAPTURE ---- */}
          <Card>
            <div className="flex flex-col gap-5 xl:flex-row">
              <div
                className="relative flex-1 rounded-lg p-6"
                style={{ background: "linear-gradient(145deg,#6b6a3a,#4a4a28)", border: "8px solid #3a2a1a", boxShadow: "inset 0 0 24px #00000055" }}
              >
                <div className="mx-auto inline-block w-full rounded-2xl px-6 py-5 text-center" style={{ background: "#efe3cb", border: "3px dashed #6b5c3e" }}>
                  <p style={pixel} className="text-[48px] leading-none"><span style={{ color: C.ink }}>{data.cover.title}</span></p>
                  <p style={pixel} className="text-[30px] leading-tight"><span style={{ color: C.green }}>{data.cover.subtitle}</span></p>
                  <p style={pixel} className="mt-2 flex items-center justify-center gap-1 text-[14px]"><span style={{ color: C.inkSoft }}>{data.cover.tagline}</span><Heart size={11} className="fill-current text-red-700" /></p>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-2xl">{"\u{1F97E}"} {"\u{1F392}"} {"\u{1F9ED}"}</span>
                  <button onClick={function () { setBookOpen(true); }} className="wgt-press rounded-lg px-6 py-2" style={{ background: "#efe3cb" }}>
                    <span style={pixel} className="text-[24px]"><span style={{ color: C.ink }}>{"START ›"}</span></span>
                  </button>
                </div>
                <span className="absolute -right-2 -top-2 text-2xl">{"\u{1F4CC}"}</span>
              </div>

              <div className="flex w-full shrink-0 flex-col gap-3 sm:w-44">
                <div className="rounded-md border-2 px-3 py-2 text-center" style={{ borderColor: "#7a8a52", background: "#cdd2ad" }}>
                  <p style={{ ...pixel, ...M }} className="text-[12px] leading-none">{"★"} LOCKED UNTIL ORD {"★"}</p>
                  <p style={pixel} className="text-[44px] leading-none"><span style={{ color: "#2f3a1c" }}>{data.ord.daysLeft}</span></p>
                  <p style={{ ...pixel, ...M }} className="text-[12px]">DAYS LEFT</p>
                </div>
                <div className="-rotate-2 rounded-sm bg-white p-2 pb-5 shadow-md">
                  <div className="flex h-24 items-center justify-center text-4xl" style={{ background: "#2a3320" }}>{"\u{1FA96}"}</div>
                </div>
              </div>
            </div>

            <p style={{ ...pixel, ...D }} className="mb-2 mt-4 text-[22px] leading-none">QUICK CAPTURE</p>
            <div className="flex flex-wrap gap-2">
              {data.capture.map(function (c) {
                return <CaptureButton key={c.label} icon={c.icon} label={c.label} />;
              })}
            </div>
          </Card>

          {/* ---- TEST UNLOCK BUTTON ---- */}
          <button
            onClick={function () { setBookOpen(true); }}
            className="wgt-press flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-4"
            style={{ borderColor: C.gold, background: C.bgHeader, color: C.textGold }}
          >
            <BookOpen size={22} style={{ color: C.gold }} />
            <span style={{ ...pixel, fontSize: 20 }}>UNLOCK BOOK (TEST)</span>
            <Lock size={16} style={{ color: C.gold }} />
          </button>

          {/* ---- SERVICE PROGRESS ---- */}
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="flex h-9 w-9 items-center justify-center rounded" style={{ background: C.green, color: C.gold }}>{"\u{1F396}️"}</span>
              <div>
                <p style={pixel} className="text-[34px] leading-none"><span style={{ color: C.ink }}>{data.progress.percent}%</span></p>
                <p style={{ ...pixel, ...M }} className="text-[12px]">COMPLETE</p>
              </div>
              <div className="flex-1">
                <p style={{ ...pixel, ...M }} className="mb-1 text-center text-[18px]">YOUR SERVICE PROGRESS</p>
                <div className="h-4 w-full overflow-hidden rounded-full" style={{ background: "#00000020" }}>
                  <div className="h-full rounded-full" style={{ width: data.progress.percent + "%", background: C.green }} />
                </div>
                <p style={{ ...pixel, ...M }} className="mt-1 text-center text-[14px]">{data.progress.days} / {data.progress.total} DAYS</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {data.progress.stats.map(function (s) {
                return (
                  <div key={s.label} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: C.cardInner }}>
                    <span className="text-2xl">{s.glyph}</span>
                    <div className="leading-tight">
                      <p style={pixel} className="text-[26px] leading-none"><span style={{ color: C.ink }}>{s.value}</span></p>
                      <p style={{ ...pixel, ...M }} className="text-[11px]">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ---- MASCOT QUOTE ---- */}
          <div className="flex items-start gap-3 rounded-xl p-4 sm:items-center" style={{ background: C.bgHeader }}>
            <span className="text-4xl">{"\u{1F9D1}‍✈️"}</span>
            <p className="whitespace-pre-line text-[18px] leading-snug" style={{ ...pixel, color: C.textGold }}>
              {data.quote}
            </p>
            <Heart size={16} className="ml-auto self-start fill-current text-red-700" />
          </div>
        </div>

        {/* ===================== RIGHT COLUMN ===================== */}
        <div className="space-y-4">

          {/* ---- RECENT SEALED MEMORIES ---- */}
          <Card title={"★ RECENT SEALED MEMORIES ★"}>
            <div className="space-y-2">
              {data.sealed.map(function (m) {
                return (
                  <div key={m.title} className="wgt-press flex items-center gap-3 rounded-lg px-2 py-2" style={{ background: C.cardInner }}>
                    <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded text-2xl" style={{ background: "#2a3320" }}>{m.glyph}</div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p style={pixel} className="flex items-center gap-1 text-[16px]"><span style={{ color: C.ink }}>{m.title}</span><Star size={11} style={{ color: C.gold }} /></p>
                      <p style={{ ...pixel, ...M }} className="text-[12px]">{m.date}</p>
                      <div className="mt-1"><MateStack extra={m.extra} /></div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Lock size={15} style={{ color: C.green }} />
                      <MoreHorizontal size={15} style={M} />
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="wgt-press mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2" style={{ background: C.green, color: C.textGold }}>
              <span style={pixel} className="text-[16px]">VIEW ALL SEALED MEMORIES</span>
              <ChevronRight size={16} />
            </button>
          </Card>

          {/* ---- LETTERS TO FUTURE ME ---- */}
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <Ribbon>{"★"} LETTERS TO FUTURE ME</Ribbon>
              <span style={{ ...pixel, ...M }} className="flex items-center gap-1 text-[12px]"><Lock size={11} /> UNLOCKS ON ORD DAY</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {data.letters.map(function (l) {
                return (
                  <button key={l.when} className="wgt-press flex flex-col items-center gap-2 rounded-lg px-2 py-3" style={{ background: C.cardInner }}>
                    <div className="flex h-12 w-full items-center justify-center rounded" style={{ background: "#d8c7a4" }}>
                      <Mail size={26} style={{ color: "#7a3a2a" }} />
                    </div>
                    <span style={{ ...pixel, ...D }} className="text-center text-[13px] leading-none">{l.when}</span>
                  </button>
                );
              })}
            </div>
            <p style={{ ...pixel, ...M }} className="mt-2 flex items-center gap-1 text-[13px]">
              Write to your future self. Read it when you have completed your journey. <Heart size={10} className="fill-current text-red-700" />
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
