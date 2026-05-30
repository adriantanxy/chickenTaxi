/**
 * JournalPage.jsx — the keepsake scrapbook. A cover + quick-capture, a service
 * progress band, a list of "sealed memories", and "letters to future me".
 *
 * Artwork is CSS/emoji placeholders for now — drop real pixel-art PNGs into
 * ASSETS.journal.* later and swap the placeholder divs for <img>. Text is never
 * baked into an image; all content comes from `data` (later: Firestore).
 */
import { BookOpen, Plus, Image, FileText, Mic, Star, Mail, Lock, MoreHorizontal, ChevronRight, Heart } from "lucide-react";
import { AppShell, ActionButton, Card, Ribbon } from "../ui";
import { ROUTES } from "../routes";
import { C, pixel, D, M, USER as user } from "../theme";

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
      { label: "MEMORIES", value: 42, glyph: "📖" },
      { label: "PHOTOS", value: 31, glyph: "🖼️" },
      { label: "MATES TAGGED", value: 18, glyph: "👥" },
      { label: "MILESTONES", value: 8, glyph: "⭐" },
    ],
  },
  sealed: [
    { title: "First book in camp", date: "20 APR 2024", glyph: "🏕️", extra: 6 },
    { title: "Route March", date: "17 MAY 2024", glyph: "🚩", extra: 9 },
    { title: "Outfield night", date: "27 JUN 2024", glyph: "🌌", extra: 5 },
    { title: "Made new buddies", date: "08 SEP 2024", glyph: "🌅", extra: 4 },
  ],
  letters: [
    { when: "6 MONTHS IN" },
    { when: "1 YEAR IN" },
    { when: "1.5 YEARS IN" },
  ],
  quote: "The moments may be small, but the growth is real.\nKeep going. Your future self is counting on you.",
};

function CaptureButton({ icon, label }) {
  return (
    <button className="wgt-press flex min-w-[130px] flex-1 items-center justify-center gap-2 rounded-lg px-2 py-3" style={{ background: C.green, color: C.textGold }}>
      <span className="shrink-0">{icon}</span>
      <span style={pixel} className="whitespace-pre-line text-left text-[14px] leading-none">{label}</span>
    </button>
  );
}

// A small stack of overlapping avatar chips + "+N".
function MateStack({ extra }) {
  return (
    <div className="flex items-center">
      <div className="flex">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[12px]"
            style={{ background: C.green, outline: `2px solid ${C.cardLight}`, marginLeft: i ? -6 : 0 }}
          >
            🧑‍✈️
          </div>
        ))}
      </div>
      <span style={{ ...pixel, ...M }} className="ml-1 text-[13px]">+{extra}</span>
    </div>
  );
}

export default function JournalPage({ onNavigate }) {
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
              {/* leather scrapbook cover */}
              <div
                className="relative flex-1 rounded-lg p-6"
                style={{ background: "linear-gradient(145deg,#6b6a3a,#4a4a28)", border: "8px solid #3a2a1a", boxShadow: "inset 0 0 24px #00000055" }}
              >
                <div className="mx-auto inline-block w-full rounded-2xl px-6 py-5 text-center" style={{ background: "#efe3cb", border: "3px dashed #6b5c3e" }}>
                  <p style={pixel} className="text-[48px] leading-none" ><span style={{ color: C.ink }}>{data.cover.title}</span></p>
                  <p style={pixel} className="text-[30px] leading-tight" ><span style={{ color: C.green }}>{data.cover.subtitle}</span></p>
                  <p style={pixel} className="mt-2 flex items-center justify-center gap-1 text-[14px]" ><span style={{ color: C.inkSoft }}>{data.cover.tagline}</span><Heart size={11} className="fill-current text-red-700" /></p>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-2xl">🥾 🎒 🧭</span>
                  <button className="wgt-press rounded-lg px-6 py-2" style={{ background: "#efe3cb" }}>
                    <span style={pixel} className="text-[24px]" ><span style={{ color: C.ink }}>START ›</span></span>
                  </button>
                </div>
                <span className="absolute -right-2 -top-2 text-2xl">📌</span>
              </div>

              {/* ORD ticket + polaroid */}
              <div className="flex w-full shrink-0 flex-col gap-3 sm:w-44">
                <div className="rounded-md border-2 px-3 py-2 text-center" style={{ borderColor: "#7a8a52", background: "#cdd2ad" }}>
                  <p style={{ ...pixel, ...M }} className="text-[12px] leading-none">★ LOCKED UNTIL ORD ★</p>
                  <p style={pixel} className="text-[44px] leading-none" ><span style={{ color: "#2f3a1c" }}>{data.ord.daysLeft}</span></p>
                  <p style={{ ...pixel, ...M }} className="text-[12px]">DAYS LEFT</p>
                </div>
                <div className="-rotate-2 rounded-sm bg-white p-2 pb-5 shadow-md">
                  <div className="flex h-24 items-center justify-center text-4xl" style={{ background: "#2a3320" }}>🪖</div>
                </div>
              </div>
            </div>

            {/* quick capture */}
            <p style={{ ...pixel, ...D }} className="mb-2 mt-4 text-[22px] leading-none">QUICK CAPTURE</p>
            <div className="flex flex-wrap gap-2">
              {data.capture.map((c) => (
                <CaptureButton key={c.label} icon={c.icon} label={c.label} />
              ))}
            </div>
          </Card>

          {/* ---- SERVICE PROGRESS ---- */}
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="flex h-9 w-9 items-center justify-center rounded" style={{ background: C.green, color: C.gold }}>🎖️</span>
              <div>
                <p style={pixel} className="text-[34px] leading-none" ><span style={{ color: C.ink }}>{data.progress.percent}%</span></p>
                <p style={{ ...pixel, ...M }} className="text-[12px]">COMPLETE</p>
              </div>
              <div className="flex-1">
                <p style={{ ...pixel, ...M }} className="mb-1 text-center text-[18px]">YOUR SERVICE PROGRESS</p>
                <div className="h-4 w-full overflow-hidden rounded-full" style={{ background: "#00000020" }}>
                  <div className="h-full rounded-full" style={{ width: `${data.progress.percent}%`, background: C.green }} />
                </div>
                <p style={{ ...pixel, ...M }} className="mt-1 text-center text-[14px]">{data.progress.days} / {data.progress.total} DAYS</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {data.progress.stats.map((s) => (
                <div key={s.label} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: C.cardInner }}>
                  <span className="text-2xl">{s.glyph}</span>
                  <div className="leading-tight">
                    <p style={pixel} className="text-[26px] leading-none" ><span style={{ color: C.ink }}>{s.value}</span></p>
                    <p style={{ ...pixel, ...M }} className="text-[11px]">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ---- MASCOT QUOTE ---- */}
          <div className="flex items-start gap-3 rounded-xl p-4 sm:items-center" style={{ background: C.bgHeader }}>
            <span className="text-4xl">🧑‍✈️</span>
            <p className="whitespace-pre-line text-[18px] leading-snug" style={{ ...pixel, color: C.textGold }}>
              {data.quote}
            </p>
            <Heart size={16} className="ml-auto self-start fill-current text-red-700" />
          </div>
        </div>

        {/* ===================== RIGHT COLUMN ===================== */}
        <div className="space-y-4">

          {/* ---- RECENT SEALED MEMORIES ---- */}
          <Card title="★ RECENT SEALED MEMORIES ★">
            <div className="space-y-2">
              {data.sealed.map((m) => (
                <div key={m.title} className="wgt-press flex items-center gap-3 rounded-lg px-2 py-2" style={{ background: C.cardInner }}>
                  <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded text-2xl" style={{ background: "#2a3320" }}>{m.glyph}</div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p style={pixel} className="flex items-center gap-1 text-[16px]" ><span style={{ color: C.ink }}>{m.title}</span><Star size={11} style={{ color: C.gold }} /></p>
                    <p style={{ ...pixel, ...M }} className="text-[12px]">{m.date}</p>
                    <div className="mt-1"><MateStack extra={m.extra} /></div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Lock size={15} style={{ color: C.green }} />
                    <MoreHorizontal size={15} style={M} />
                  </div>
                </div>
              ))}
            </div>
            <button className="wgt-press mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2" style={{ background: C.green, color: C.textGold }}>
              <span style={pixel} className="text-[16px]">VIEW ALL SEALED MEMORIES</span>
              <ChevronRight size={16} />
            </button>
          </Card>

          {/* ---- LETTERS TO FUTURE ME ---- */}
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <Ribbon>★ LETTERS TO FUTURE ME</Ribbon>
              <span style={{ ...pixel, ...M }} className="flex items-center gap-1 text-[12px]"><Lock size={11} /> UNLOCKS ON ORD DAY</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {data.letters.map((l) => (
                <button key={l.when} className="wgt-press flex flex-col items-center gap-2 rounded-lg px-2 py-3" style={{ background: C.cardInner }}>
                  <div className="flex h-12 w-full items-center justify-center rounded" style={{ background: "#d8c7a4" }}>
                    <Mail size={26} style={{ color: "#7a3a2a" }} />
                  </div>
                  <span style={{ ...pixel, ...D }} className="text-center text-[13px] leading-none">{l.when}</span>
                </button>
              ))}
            </div>
            <p style={{ ...pixel, ...M }} className="mt-2 flex items-center gap-1 text-[13px]">Write to your future self. Read it when you've completed your journey. <Heart size={10} className="fill-current text-red-700" /></p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
