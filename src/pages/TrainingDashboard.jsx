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
import { ROUTES } from "../routes";
import { C, pixel, D, M, USER as user } from "../theme";
import { TRAINING_MODES, getTrainingSessionCardStyle } from "../trainingModes";

const data = {
  stats: [
    { key: "pushups", label: "PUSH-UPS", value: 60, unit: "REPS", glyph: "💪" },
    { key: "situps", label: "SIT-UPS", value: 60, unit: "REPS", glyph: "🪖" },
    { key: "run", label: "2.4KM TIME", value: "11:32", unit: "MIN:SEC", glyph: "⏱️" },
    { key: "streak", label: "WORKOUT STREAK", value: 14, unit: "DAYS", glyph: "🔥" },
    { key: "weekly", label: "WEEKLY SESSIONS", value: "5/6", unit: "SESSIONS", glyph: "📋" },
    { key: "score", label: "LATEST SCORE", value: "GOLD", unit: "85", glyph: "🏅" },
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

function TrainingSessionCard({ mode, onStart }) {
  return (
    <button
      aria-label={`Start ${mode.label} — ${mode.subtitle}`}
      title={mode.subtitle}
      onClick={() => onStart(mode.key)}
      className="wgt-session-card wgt-press shrink-0 rounded-lg"
      style={getTrainingSessionCardStyle(mode.key, 220)}
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
      <div className="grid grid-cols-6 gap-4 p-6">
        <Card title="TRAINING OVERVIEW" className="col-span-4">
          <div className="flex gap-2">
            {data.stats.map((s) => (
              <div key={s.key} className="flex flex-1 flex-col items-center rounded-lg px-2 py-2 text-center" style={{ background: C.cardInner }}>
                <span style={{ ...pixel, ...M }} className="text-[11px] leading-tight">{s.label}</span>
                <Sprite name={s.key} size={28} fallback={s.glyph} className="my-1" />
                <span style={{ ...pixel, ...D }} className="text-[30px] leading-none">{s.value}</span>
                <span style={{ ...pixel, ...M }} className="text-[11px]">{s.unit}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="TODAY'S TRAINING" className="col-span-2 row-span-2">
          <p style={{ ...pixel, ...D }} className="mb-2 text-[18px]">🧑‍✈️ {data.today.date} · {data.today.day}</p>
          {data.today.rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between border-b py-1" style={{ borderColor: "#00000015" }}>
              <span style={{ ...pixel, ...D }} className="text-[16px]">{r.label}</span>
              <span style={{ ...pixel, ...D }} className="text-[16px]">{r.result}</span>
              {r.pass ? <Check size={16} className="text-green-700" /> : <X size={16} className="text-red-700" />}
            </div>
          ))}
          <p style={{ ...pixel, ...M }} className="mt-3 text-[16px]">NOTES</p>
          <p style={{ ...pixel, ...D }} className="text-[18px]">{data.today.note}</p>
          <div className="mt-4">
            <p style={{ ...pixel, ...M }} className="text-[16px]">TRAINING PROGRESS</p>
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={data.progress} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.green} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={C.green} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" hide />
                <Tooltip contentStyle={{ background: C.bgHeader, border: "none", ...pixel }} labelStyle={{ color: C.textGold }} />
                <Area type="monotone" dataKey="v" stroke={C.green} strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="START A NEW SESSION"
          className="col-span-4"
          action={<span style={{ ...pixel, ...M }} className="text-[14px]">PICK A MODE TO BEGIN</span>}
        >
          <div className="flex items-center justify-center gap-4 py-1">
            {TRAINING_MODES.map((mode) => (
              <TrainingSessionCard key={mode.key} mode={mode} onStart={onStartTraining} />
            ))}
          </div>
        </Card>

        <Card title="RECENT WORKOUTS" className="col-span-3">
          <div className="space-y-2">
            {data.recent.map((w, i) => (
              <div key={i} className="wgt-press flex items-center gap-4 rounded-lg border px-4 py-3" style={{ background: C.cardInner, borderColor: C.line + "55" }}>
                <span className="text-[18px]" style={{ color: C.gold }}>★</span>
                <div className="w-20 leading-tight">
                  <p style={{ ...pixel, ...D }} className="text-[15px]">{w.date}</p>
                  <p style={{ ...pixel, ...M }} className="text-[12px]">{w.day}</p>
                </div>
                <Sprite name={w.exercise} size={32} fallback={w.glyph} />
                <div className="w-44 leading-tight">
                  <p style={{ ...pixel, ...D }} className="text-[17px]">{w.name}</p>
                  <p style={{ ...pixel, ...M }} className="text-[12px]">{w.exercise}</p>
                </div>
                <div className="flex flex-1 items-center justify-around">
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

        <Card title="MISSIONS" className="col-span-2">
          <div className="flex gap-2">
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
                  <span className="my-1 text-[26px] leading-none">{m.glyph}</span>
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

        <Card title="REWARDS" className="col-span-1">
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg p-4" style={{ background: C.green }}>
              <span style={{ ...pixel, color: C.textGold }} className="text-[16px]">XP</span>
              <span style={{ ...pixel, color: C.gold }} className="text-[44px] leading-none">{data.xp}</span>
            </div>
            <div className="flex flex-col gap-2">
              {data.medals.map((m, i) => (
                <div key={i} className="flex h-14 w-14 items-center justify-center rounded-lg border-2 text-[26px]" style={{ background: C.bgHeader, borderColor: C.gold + "66" }}>
                  {m}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => onNavigate(ROUTES.SHOP)}
            className="wgt-press mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 py-2"
            style={{ borderColor: C.gold + "80", background: C.green, color: C.textGold }}
          >
            <ShoppingCart size={18} /><span style={pixel} className="text-[20px]">SHOP</span>
          </button>
        </Card>
      </div>
    </AppShell>
  );
}
