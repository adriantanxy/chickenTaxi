/**
 * TrainingDashboard.jsx — Training screen using the shared AppShell + Frame/Sprite.
 * (This supersedes the standalone /TrainingDashboard.jsx first draft; this one
 *  is consistent with the other pages and the asset system.)
 *
 * Demonstrates: text-as-data, chart-as-library (Recharts), art slots via Sprite.
 */
import { Dumbbell, Plus, Check, X, Bookmark, ShoppingCart, Heart, Clock } from "lucide-react";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { AppShell, ActionButton, Card, Sprite } from "../ui";
import { ASSETS } from "../assets";
import { ROUTES } from "../routes";
import { C, pixel, D, M, USER as user } from "../theme";
import { TRAINING_MODES, getTrainingSessionCardStyle } from "../trainingModes";

const OVERVIEW = ASSETS.training.overview;

const data = {
  stats: [
    { key: "pushups", label: "PUSH-UPS", value: 60, caption: "TODAY", best: "BEST 64", glyph: "💪" },
    { key: "situps", label: "SIT-UPS", value: 60, caption: "TODAY", best: "BEST 62", glyph: "🪖" },
    { key: "run", label: "2.4KM RUN", value: "11:32", caption: "TODAY", best: "BEST 10:58", glyph: "⏱️" },
    { key: "streak", label: "STREAK", value: 14, caption: "DAYS IN A ROW", best: "BEST 21", glyph: "🔥" },
    { key: "weekly", label: "THIS WEEK", value: "5/6", caption: "SESSIONS DONE", best: "1 TO GO", glyph: "📋" },
    { key: "score", label: "IPPT SCORE", value: "GOLD", caption: "85 POINTS", best: "BEST GOLD", glyph: "🏅", medal: "gold" },
  ],
  today: { date: "24 MAY 2024", day: "SAT", note: "GOOD EFFORT TODAY!", rows: [
    { label: "PUSH-UPS", result: "42 / 50", pass: true },
    { label: "SIT-UPS", result: "51 / 55", pass: true },
    { label: "2.4KM TIME", result: "11:32 / 10:30", pass: false } ] },
  recent: [
    { date: "23 MAY 2024", day: "FRI", name: "4-MIN EMOM", exercise: "PUSH-UPS", glyph: "⏱️",
      stats: [{ v: "40", l: "TOTAL REPS" }, { v: "4/4", l: "SETS" }, { v: "08:02", l: "DURATION" }] },
    { date: "22 MAY 2024", day: "THU", name: "FORM TRAINING", exercise: "PUSH-UPS", glyph: "🧎",
      stats: [{ v: "46", l: "TOTAL REPS" }, { v: "92%", l: "FORM ACC." }, { v: "10:15", l: "DURATION" }] },
    { date: "21 MAY 2024", day: "WED", name: "100 SIT-UP TARGET", exercise: "SIT-UPS", glyph: "🎯",
      stats: [{ v: "102", l: "TOTAL REPS" }, { v: "5", l: "SETS" }, { v: "11:32", l: "DURATION" }] },
  ],
  missions: [
    { tier: "DAILY MISSION", title: "Complete 3", task: "To Failure sets", glyph: "🪖",
      progress: 2, goal: 3, xp: 150, coin: 50, timerLabel: "REFRESHES IN", timer: "08:24:15" },
    { tier: "WEEKLY MISSION", title: "Finish 10 workouts", task: "", glyph: "📅",
      progress: 6, goal: 10, xp: 500, coin: 150, timerLabel: "RESETS IN", timer: "3D 08:24:15" },
    { tier: "CHALLENGE CARD", title: "PLANK CHALLENGE", task: "Hold 3 planks over 90 seconds", glyph: "🧗",
      progress: 0, goal: 3, xp: 300, coin: 100, timerLabel: "ENDS IN", timer: "20 12:48:09" },
  ],
  medals: ["🥇", "🎖️"],
  progress: [2, 3, 3, 4, 5, 5, 6, 6, 7, 8].map((v, i) => ({ d: i, v })),
  xp: 157,
};

/**
 * A single TRAINING OVERVIEW tile on the shared parchment art. Everything is
 * centred in one tight column: LABEL → icon → big VALUE → caption → BEST chip.
 * Icon PNGs are auto-trimmed, so we size by a fixed HEIGHT and let width follow
 * the art — no reserved square box, so no empty space pushing the text away.
 */
function StatCard({ stat }) {
  const iconSrc = stat.medal ? OVERVIEW.medals[stat.medal] : OVERVIEW.icons[stat.key];

  return (
    <div
      className="relative flex min-w-[126px] flex-1 flex-col items-center justify-center px-3 pb-4 pt-4 xl:min-w-0"
      style={{
        backgroundImage: `url(${OVERVIEW.background})`,
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: 160,
      }}
    >
      <span style={{ ...pixel, ...D }} className="text-[18px] font-bold leading-none tracking-wide">{stat.label}</span>
      {iconSrc ? (
        <img src={iconSrc} alt="" className="my-1.5 h-[46px] w-auto max-w-[112px] object-contain" style={{ imageRendering: "pixelated" }} />
      ) : (
        <span className="text-[64px] leading-none">{stat.glyph}</span>
      )}
      <span style={{ ...pixel, color: C.green }} className="text-[38px] font-bold leading-none">{stat.value}</span>
      <span style={{ ...pixel, ...D }} className="mt-0.5 text-[14px] font-bold uppercase leading-none tracking-wider">{stat.caption}</span>

      {/* Personal record, inline under the value. Kept short and centred so the
          whole stat reads as one tidy block; the heart baked into the art's
          bottom-right corner stays as its own decoration. */}
      {stat.best && (
        <span style={{ ...pixel, ...M }} className="mt-1 mb-0 text-[13px] uppercase leading-none tracking-wider">
          {stat.best}
        </span>
      )}
    </div>
  );
}

function TrainingSessionCard({ mode, onStart }) {
  return (
    <button
      aria-label={`Start ${mode.label} — ${mode.subtitle}`}
      title={mode.subtitle}
      onClick={() => onStart(mode.key)}
      className="wgt-session-card wgt-press shrink-0 rounded-lg"
      style={getTrainingSessionCardStyle(mode.key, 210)}
    />
  );
}

export default function TrainingDashboard({ onNavigate, onStartTraining = () => {} }) {
  return (
    <AppShell
      active={ROUTES.TRAINING} onNavigate={onNavigate} user={user}
      icon={<Dumbbell size={36} />} title="TRAINING" subtitle="BUILD STRENGTH. BUILD DISCIPLINE. BECOME BETTER."
      action={<ActionButton icon={<Plus size={20} />}>LOG TRAINING</ActionButton>}
    >
      <div className="grid grid-cols-1 gap-4 p-3 sm:p-5 xl:grid-cols-12">
        <Card
          title="TRAINING OVERVIEW"
          className="overflow-hidden py-2 px-2 xl:col-span-7"
          action={<span style={{ ...pixel, ...M }} className="text-[14px]">TODAY'S RESULTS VS YOUR BEST</span>}
        >
          <div className="overflow-x-auto">
            <div className="flex min-w-[756px] gap-0 xl:min-w-0">
              {data.stats.map((s) => (
                <StatCard key={s.key} stat={s} />
              ))}
            </div>
          </div>
        </Card>

        <Card title="TODAY'S TRAINING" className="flex flex-col xl:col-span-5 xl:row-span-2">
          <p style={{ ...pixel, ...D }} className="mb-2 text-[18px]">🧑‍✈️ {data.today.date} · {data.today.day}</p>
          <div className="space-y-1.5">
            {data.today.rows.map((r) => (
              <div key={r.label} className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: C.cardInner }}>
                <span style={{ ...pixel, ...D }} className="flex-1 text-[16px]">{r.label}</span>
                <span style={{ ...pixel, ...D }} className="text-[16px]">{r.result}</span>
                {r.pass ? <Check size={18} className="text-green-700" /> : <X size={18} className="text-red-700" />}
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg px-3 py-2" style={{ background: C.cardInner }}>
            <p style={{ ...pixel, ...M }} className="text-[14px]">NOTES</p>
            <p style={{ ...pixel, ...D }} className="text-[18px] leading-tight">{data.today.note}</p>
          </div>
          <div className="mt-3 flex flex-1 flex-col">
            <p style={{ ...pixel, ...M }} className="text-[16px]">TRAINING PROGRESS</p>
            <div className="flex-1" style={{ minHeight: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.progress} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.green} stopOpacity={0.7} />
                      <stop offset="100%" stopColor={C.green} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" hide />
                  <Tooltip cursor={false} contentStyle={{ background: C.bgHeader, border: "none", ...pixel }} labelStyle={{ color: C.textGold }} />
                  <Area type="monotone" dataKey="v" stroke={C.green} strokeWidth={2} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card
          title="START A NEW SESSION"
          className="overflow-hidden xl:col-span-7"
          action={<span style={{ ...pixel, ...M }} className="text-[14px]">PICK A MODE TO BEGIN</span>}
        >
          <div className="overflow-x-auto">
            <div className="flex min-w-max items-center justify-start gap-4 py-1 xl:justify-center">
              {TRAINING_MODES.map((mode) => (
                <TrainingSessionCard key={mode.key} mode={mode} onStart={onStartTraining} />
              ))}
            </div>
          </div>
        </Card>

        <Card title="RECENT WORKOUTS" className="flex flex-col xl:col-span-6">
          <div className="flex flex-1 flex-col justify-between gap-2">
            {data.recent.map((w, i) => (
              <div key={i} className="wgt-press flex flex-1 flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:gap-4" style={{ background: C.cardInner, borderColor: C.line + "55" }}>
                <span className="text-[18px]" style={{ color: C.gold }}>★</span>
                <div className="w-full leading-tight sm:w-20">
                  <p style={{ ...pixel, ...D }} className="text-[15px]">{w.date}</p>
                  <p style={{ ...pixel, ...M }} className="text-[12px]">{w.day}</p>
                </div>
                <Sprite name={w.exercise} size={32} fallback={w.glyph} />
                <div className="w-full leading-tight sm:w-44">
                  <p style={{ ...pixel, ...D }} className="text-[17px]">{w.name}</p>
                  <p style={{ ...pixel, ...M }} className="text-[12px]">{w.exercise}</p>
                </div>
                <div className="flex flex-1 flex-wrap items-center justify-around gap-3">
                  {w.stats.map((s, j) => (
                    <div key={j} className="text-center leading-tight">
                      <p style={{ ...pixel, ...D }} className="text-[22px] leading-none">{s.v}</p>
                      <p style={{ ...pixel, ...M }} className="text-[11px]">{s.l}</p>
                    </div>
                  ))}
                </div>
                <Heart size={18} className="text-red-700" />
                <Bookmark size={18} style={M} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="MISSIONS" className="flex flex-col xl:col-span-4">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            {data.missions.map((m, i) => {
              const challenge = m.tier === "CHALLENGE CARD";
              return (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center rounded-lg border p-2 text-center"
                  style={{ background: C.cardInner, borderColor: C.line + "55" }}
                >
                  {/* Tier banner — challenge gets the dark/gold treatment. */}
                  <span
                    className="mb-2 w-full rounded px-1 py-0.5"
                    style={{
                      ...pixel,
                      fontSize: 11,
                      background: challenge ? C.bgHeader : C.green,
                      color: challenge ? C.gold : C.textGold,
                    }}
                  >
                    {m.tier}
                  </span>
                  <p style={{ ...pixel, ...D }} className="text-[14px] leading-tight">{m.title}</p>
                  {m.task && <p style={{ ...pixel, ...M }} className="text-[12px] leading-tight">{m.task}</p>}
                  <span className="flex flex-1 items-center text-[34px] leading-none">{m.glyph}</span>
                  <span style={{ ...pixel, ...M }} className="text-[11px]">{m.progress} / {m.goal}</span>
                  <div className="mb-2 mt-1 h-2 w-full overflow-hidden rounded" style={{ background: "#00000020" }}>
                    <div className="h-full" style={{ width: `${(m.progress / m.goal) * 100}%`, background: C.green }} />
                  </div>
                  <span style={{ ...pixel, ...M }} className="text-[11px]">REWARD</span>
                  <div className="flex items-center gap-1">
                    <span style={{ ...pixel, color: C.textGold, background: C.green }} className="rounded px-1 text-[12px]">XP {m.xp}</span>
                    <span style={{ ...pixel, color: "#7a5a1a" }} className="text-[12px]">◎ {m.coin}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 border-t pt-2" style={{ borderColor: C.line + "33", width: "100%", justifyContent: "center" }}>
                    <Clock size={12} style={M} />
                    <span style={{ ...pixel, ...M }} className="text-[11px]">{m.timer}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="REWARDS" className="flex flex-col xl:col-span-2">
          <div className="flex flex-1 gap-2">
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg p-4" style={{ background: C.green }}>
              <span style={{ ...pixel, color: C.textGold }} className="text-[18px] tracking-widest">XP</span>
              <span style={{ ...pixel, color: C.gold }} className="text-[52px] leading-none">{data.xp}</span>
              <span style={{ ...pixel, color: C.textGold }} className="mt-1 text-[12px]">EARNED</span>
            </div>
            <div className="flex flex-col justify-between gap-2">
              {data.medals.map((m, i) => (
                <div key={i} className="flex h-full min-h-14 w-16 items-center justify-center rounded-lg border-2 text-[28px]" style={{ background: C.bgHeader, borderColor: C.gold + "66" }}>
                  {m}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => onNavigate(ROUTES.SHOP)}
            className="wgt-press mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 py-2.5"
            style={{ borderColor: C.gold + "80", background: C.green, color: C.textGold }}
          >
            <ShoppingCart size={18} /><span style={pixel} className="text-[20px]">SHOP</span>
          </button>
        </Card>
      </div>
    </AppShell>
  );
}
