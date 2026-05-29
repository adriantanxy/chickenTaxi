/**
 * TrainingDashboard.jsx — Training screen using the shared AppShell + Frame/Sprite.
 * (This supersedes the standalone /TrainingDashboard.jsx first draft; this one
 *  is consistent with the other pages and the asset system.)
 *
 * Demonstrates: text-as-data, chart-as-library (Recharts), art slots via Sprite.
 */
import { Dumbbell, Plus, Check, X, User, Footprints, Timer, Flame, Target, Bookmark, ShoppingCart } from "lucide-react";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { AppShell, ActionButton, Card, Sprite } from "../ui";
import { ROUTES } from "../routes";
import { C, pixel, D, M, USER as user } from "../theme";

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
  modes: [
    { name: "FORM TRAINING", desc: "Proper technique & movement quality.", icon: <User size={22} /> },
    { name: "PACER", desc: "Follow the pace, keep up with the beat.", icon: <Footprints size={22} /> },
    { name: "EMOM", desc: "Every minute on the minute.", icon: <Timer size={22} /> },
    { name: "TO FAILURE", desc: "Push to muscle failure.", icon: <Flame size={22} /> },
    { name: "TARGET MODE", desc: "Hit your target reps or time.", icon: <Target size={22} /> },
  ],
  recent: [
    { date: "23 MAY", day: "FRI", name: "4-MIN EMOM", a: "40 PUSH-UPS", b: "4/4 SETS", c: "08:02" },
    { date: "22 MAY", day: "THU", name: "FORM TRAINING", a: "46 PUSH-UPS", b: "92% ACC.", c: "10:15" },
    { date: "21 MAY", day: "WED", name: "100 SIT-UP TARGET", a: "102 SIT-UPS", b: "5 SETS", c: "11:32" },
  ],
  missions: [
    { tier: "DAILY MISSION", task: "Complete 3 to-failure sets", progress: 2, goal: 3, reward: 150 },
    { tier: "WEEKLY MISSION", task: "Finish 10 workouts", progress: 6, goal: 10, reward: 500 },
    { tier: "CHALLENGE", task: "Hold 2 planks over 90s", progress: 0, goal: 3, reward: 300 },
  ],
  progress: [2, 3, 3, 4, 5, 5, 6, 6, 7, 8].map((v, i) => ({ d: i, v })),
  xp: 157,
};

export default function TrainingDashboard({ onNavigate }) {
  return (
    <AppShell
      active={ROUTES.TRAINING} onNavigate={onNavigate} user={user}
      icon={<Dumbbell size={36} />} title="TRAINING" subtitle="BUILD STRENGTH. BUILD DISCIPLINE. BECOME BETTER."
      action={<ActionButton icon={<Plus size={20} />}>LOG TRAINING</ActionButton>}
    >
      <div className="grid grid-cols-3 gap-4 p-6">
        <Card title="STATS" className="col-span-2">
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

        <Card title="TODAY'S TRAINING" className="row-span-2">
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

        <Card title="START A NEW SESSION" className="col-span-2">
          <div className="grid grid-cols-5 gap-2">
            {data.modes.map((m) => (
              <button key={m.name} className="wgt-press flex flex-col items-center rounded-lg p-3 text-center" style={{ background: C.green }}>
                <div style={{ color: C.textGold }}>{m.icon}</div>
                <span style={{ ...pixel, color: C.textGold }} className="mt-1 text-[15px]">{m.name}</span>
                <span style={{ ...pixel, color: "#b8a987" }} className="mt-1 text-[11px] leading-tight">{m.desc}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="RECENT WORKOUTS" className="col-span-2">
          <div className="space-y-2">
            {data.recent.map((w, i) => (
              <div key={i} className="wgt-press flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: C.cardInner }}>
                <span style={{ color: C.gold }}>★</span>
                <div className="w-16 leading-tight"><p style={{ ...pixel, ...D }} className="text-[14px]">{w.date}</p><p style={{ ...pixel, ...M }} className="text-[11px]">{w.day}</p></div>
                <span style={{ ...pixel, ...D }} className="flex-1 text-[16px]">{w.name}</span>
                <span style={{ ...pixel, ...D }} className="text-[14px]">{w.a}</span>
                <span style={{ ...pixel, ...D }} className="text-[14px]">{w.b}</span>
                <span style={{ ...pixel, ...D }} className="text-[14px]">{w.c}</span>
                <Bookmark size={16} style={M} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="MISSIONS">
          <div className="space-y-2">
            {data.missions.map((m, i) => (
              <div key={i} className="rounded-lg p-2" style={{ background: C.cardInner }}>
                <p style={{ ...pixel, ...M }} className="text-[13px]">{m.tier}</p>
                <p style={{ ...pixel, ...D }} className="text-[14px]">{m.task}</p>
                <div className="mt-1 h-2 w-full overflow-hidden rounded" style={{ background: "#00000020" }}>
                  <div className="h-full" style={{ width: `${(m.progress / m.goal) * 100}%`, background: C.green }} />
                </div>
                <div className="mt-1 flex justify-between">
                  <span style={{ ...pixel, ...M }} className="text-[12px]">{m.progress}/{m.goal}</span>
                  <span style={{ ...pixel, color: "#a07a2a" }} className="text-[12px]">+{m.reward} XP</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="REWARDS">
          <div className="flex flex-col items-center rounded-lg p-4" style={{ background: C.green }}>
            <span style={{ ...pixel, color: C.textGold }} className="text-[16px]">XP</span>
            <span style={{ ...pixel, color: C.gold }} className="text-[48px] leading-none">{data.xp}</span>
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
