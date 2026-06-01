/**
 * TrainingDashboard.jsx — Training screen using the shared AppShell + Frame/Sprite.
 * (This supersedes the standalone /TrainingDashboard.jsx first draft; this one
 *  is consistent with the other pages and the asset system.)
 *
 * Demonstrates: text-as-data, chart-as-library (Recharts), art slots via Sprite.
 */
import { Dumbbell, Plus, Check, Flag, Bookmark, ShoppingCart, Heart, Clock } from "lucide-react";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { AppShell, ActionButton, Card, Frame } from "../ui";
import { ASSETS } from "../assets";
import { ROUTES } from "../routes";
import { C, pixel, D, M, USER as user } from "../theme";
import { TRAINING_MODES, getTrainingSessionCardStyle } from "../trainingModes";

const OVERVIEW = ASSETS.training.overview;
const TODAY_ART = ASSETS.training.today;
const RECENT_ART = ASSETS.training.recent;
const MISSION_ART = ASSETS.training.missions;
const REWARD_ART = ASSETS.training.rewards;

// --- Today's date, derived live -------------------------------------------
// The header of TODAY'S TRAINING tracks the real calendar day rather than a
// baked-in string, so the card always reads as "today".
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const now = new Date();
const TODAY = {
  date: `${String(now.getDate()).padStart(2, "0")} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
  day: DAYS[now.getDay()],
};

const data = {
  stats: [
    { key: "pushups", label: "PUSH-UPS", value: 60, caption: "TODAY", best: "BEST 64" },
    { key: "situps", label: "SIT-UPS", value: 60, caption: "TODAY", best: "BEST 62" },
    { key: "run", label: "2.4KM RUN", value: "11:32", caption: "TODAY", best: "BEST 10:58" },
    { key: "streak", label: "STREAK", value: 14, caption: "DAYS IN A ROW", best: "BEST 21" },
    { key: "weekly", label: "THIS WEEK", value: "5/6", caption: "SESSIONS DONE", best: "1 TO GO" },
    { key: "score", label: "IPPT SCORE", value: "GOLD", caption: "85 POINTS", best: "BEST GOLD", medal: "gold" },
  ],
  today: {
    note: "GOOD EFFORT TODAY!",
    rows: [
      { label: "PUSH-UPS", result: "42 / 50", pass: true, icon: "pushups" },
      { label: "SIT-UPS", result: "51 / 55", pass: true, icon: "situps" },
      { label: "2.4KM TIME", result: "11:32 / 10:30", pass: false, icon: "run" },
    ],
  },
  recent: [
    { date: "23 MAY 2024", day: "FRI", name: "4-MIN EMOM", exercise: "PUSH-UPS", icon: "run",
      stats: [{ v: "40", l: "TOTAL REPS" }, { v: "4/4", l: "SETS" }, { v: "08:02", l: "DURATION" }] },
    { date: "22 MAY 2024", day: "THU", name: "FORM TRAINING", exercise: "PUSH-UPS", icon: "pushups",
      stats: [{ v: "46", l: "TOTAL REPS" }, { v: "92%", l: "FORM ACC." }, { v: "10:15", l: "DURATION" }] },
    { date: "21 MAY 2024", day: "WED", name: "100 SIT-UP TARGET", exercise: "SIT-UPS", icon: "situps",
      stats: [{ v: "102", l: "TOTAL REPS" }, { v: "5", l: "SETS" }, { v: "11:32", l: "DURATION" }] },
  ],
  missions: [
    { tier: "DAILY MISSION", title: "Complete 3", task: "To Failure sets", icon: "toFailure",
      progress: 2, goal: 3, xp: 150, coin: 50, timerLabel: "REFRESHES IN", timer: "08:24:15" },
    { tier: "WEEKLY MISSION", title: "Finish 10 workouts", task: "", icon: "weekly",
      progress: 6, goal: 10, xp: 500, coin: 150, timerLabel: "RESETS IN", timer: "3D 08:24:15" },
    { tier: "CHALLENGE CARD", title: "PLANK CHALLENGE", task: "Hold 3 planks over 90 seconds", icon: "plank",
      // plank.png is a 1254² canvas with the figure small inside heavy padding,
      // so it needs a bigger render height to optically match the cropped icons.
      iconScale: 1.85, progress: 0, goal: 3, xp: 300, coin: 100, timerLabel: "ENDS IN", timer: "20 12:48:09" },
  ],
  medals: ["gold", "bronze"],
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
      {iconSrc && (
        <img src={iconSrc} alt="" className="my-1.5 h-[46px] w-auto max-w-[112px] object-contain" style={{ imageRendering: "pixelated" }} />
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

/**
 * One MISSION/CHALLENGE card, built to read like a collectible game card rather
 * than a dashboard cell. The parchment card art (card_background.png) IS the
 * surface — drawn via the 9-slice `missionCard` frame so its wooden border and
 * corners stay crisp at any height — and text is dark ink so it belongs on the
 * paper. The CHALLENGE CARD is the "rare" one: a gilt ring + brass tier plate.
 */
function MissionCard({ mission }) {
  const challenge = mission.tier === "CHALLENGE CARD";
  const iconSrc = MISSION_ART.icons[mission.icon];
  const pct = Math.round((mission.progress / mission.goal) * 100);
  const complete = pct >= 100;

  return (
    <Frame
      frame="missionCard"
      border={12}
      className={`wgt-press relative flex flex-1 flex-col gap-1.5 p-2 ${challenge ? "wgt-card-rare" : ""}`}
    >
      {/* Tier ribbon — card title banner. Challenge = brass plate. */}
      <span
        className="w-full rounded py-[3px] text-center"
        style={{
          ...pixel,
          fontSize: 14,
          letterSpacing: "0.12em",
          background: challenge
            ? "linear-gradient(180deg, #4a3a18 0%, #2a2110 100%)"
            : C.green,
          color: challenge ? C.gold : C.textGold,
          boxShadow: challenge
            ? `inset 0 0 0 1px ${C.gold}88, inset 0 1px 0 #ffffff2a`
            : "inset 0 1px 0 #ffffff2a, inset 0 -1px 0 #00000028",
        }}
      >
        {mission.tier}
      </span>

      {/* Card-art window — a fixed, compact illustration box. Fixed height keeps
          the sprite small so the card no longer drives the whole row tall. */}
      <div
        className="relative flex h-[68px] shrink-0 items-center justify-center overflow-hidden rounded"
        style={{
          background:
            "radial-gradient(75% 70% at 50% 38%, #ffffff22 0%, #ffffff00 60%), linear-gradient(180deg, #00000010 0%, #00000000 40%, #0000001f 100%)",
          boxShadow: "inset 0 0 0 1px #3a2f1c2a, inset 0 1px 3px #2a201033",
        }}
      >
        {iconSrc && (
          <img
            src={iconSrc}
            alt=""
            className="w-auto object-contain"
            style={{
              imageRendering: "pixelated",
              height: 38 * (mission.iconScale || 1),
              maxHeight: "84%",
              maxWidth: "80%",
              filter: "drop-shadow(0 2px 1px #00000027)",
            }}
          />
        )}
      </div>

      {/* Title + objective */}
      <div className="min-h-[34px] text-center leading-[1.1]">
        <p style={{ ...pixel, ...D }} className="text-[16px] font-bold">{mission.title}</p>
        {mission.task && <p style={{ ...pixel, color: C.inkSoft }} className="text-[12px]">{mission.task}</p>}
      </div>

      {/* Progress gauge */}
      <div className="mt-auto">
        <div className="mb-0.5 flex items-baseline justify-between">
          <span style={{ ...pixel, ...D }} className="text-[13px] font-bold">{mission.progress} / {mission.goal}</span>
          <span style={{ ...pixel, color: complete ? C.green : C.inkSoft }} className="text-[14px] font-bold">
            {complete ? "DONE!" : `${pct}%`}
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ background: "#3a2f1c33", boxShadow: "inset 0 1px 2px #2a201055, inset 0 0 0 1px #3a2f1c22" }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${pct}%`,
              background: challenge
                ? "linear-gradient(90deg, #cca661, #e6c47e)"
                : "linear-gradient(90deg, #3d4a2a, #5a6e3a)",
              boxShadow: "inset 0 1px 0 #ffffff40",
            }}
          />
        </div>
      </div>

      {/* Countdown — its own centred line above the reward, clear of the heart
          painted into the card art's bottom-right corner. */}
      <div className="flex items-center justify-center gap-1">
        <Clock size={10} className="shrink-0" style={{ color: C.inkSoft }} />
        <span style={{ ...pixel, color: C.inkSoft }} className="text-[11px] tracking-wide">{mission.timer}</span>
      </div>

      {/* Reward — centred XP chip, with right padding so it clears the corner
          heart on the parchment art. */}
      <div className="flex items-center justify-center border-t pt-1.5 pr-5" style={{ borderColor: C.ink + "22" }}>
        <span
          style={{ ...pixel, color: C.textGold, background: C.green, boxShadow: "inset 0 1px 0 #ffffff2a" }}
          className="rounded px-2.5 py-0.5 text-[13px] font-bold tracking-wide"
        >
          +{mission.xp} XP
        </span>
      </div>
    </Frame>
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
          {/* Date stamp — reads like a duty-log heading, with a hairline rule. */}
          <div className="mb-3 flex items-baseline gap-2 border-b pb-2" style={{ borderColor: C.ink + "22" }}>
            <span style={{ ...pixel, ...D }} className="text-[20px] font-bold leading-none tracking-wide">{TODAY.date}</span>
            <span style={{ ...pixel, color: C.green }} className="text-[16px] leading-none">· {TODAY.day}</span>
          </div>

          {/* Result roster — each line is a pressed-leather plate with a colour
              status spine on the left (pass = olive, miss = rust) so the whole
              column scans at a glance without three heavy frames fighting. */}
          <div className="space-y-2">
            {data.today.rows.map((r) => {
              // Met = olive; not-yet = warm ochre (encouraging, not an error red).
              const accent = r.pass ? C.green : "#a8742a";
              const [done, target] = r.result.split(" / ");
              return (
                <div
                  key={r.label}
                  className="wgt-plate relative flex items-center gap-3 overflow-hidden py-2 pl-4 pr-3"
                  style={{ background: C.cardInner }}
                >
                  {/* status spine */}
                  <span className="absolute inset-y-0 left-0 w-[5px]" style={{ background: accent }} />

                  {/* icon — sprite sits on the parchment so the green uniform
                      doesn't camouflage against a green chit. */}
                  <img
                    src={TODAY_ART.icons[r.icon]}
                    alt=""
                    className="h-10 w-10 shrink-0 object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />

                  <span style={{ ...pixel, ...D }} className="flex-1 text-[18px] font-bold leading-none tracking-wide">{r.label}</span>

                  {/* result — done is the hero, target stays muted */}
                  <span className="flex items-baseline gap-1 leading-none">
                    <span style={{ ...pixel, color: accent }} className="text-[28px] font-bold">{done}</span>
                    <span style={{ ...pixel, ...M }} className="text-[18px]">/ {target}</span>
                  </span>

                  {/* status pill — both states framed positively. */}
                  <span
                    className="flex shrink-0 items-center justify-center gap-1 rounded-full px-2.5 py-0.5"
                    style={{ background: accent, color: C.textGold, boxShadow: "inset 0 1px 0 #ffffff22" }}
                  >
                    {r.pass ? <Check size={14} strokeWidth={3.5} /> : <Flag size={12} strokeWidth={3} />}
                    <span style={pixel} className="text-[13px] leading-none whitespace-nowrap">{r.pass ? "GOAL MET" : "ALMOST"}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-1 flex-col">
            <div className="flex items-baseline justify-between">
              <p style={{ ...pixel, color: C.green }} className="text-[14px] font-bold tracking-[0.2em]">TRAINING PROGRESS</p>
              <p style={{ ...pixel, ...M }} className="text-[13px]">KEEP IT UP, SOLDIER!</p>
            </div>
            <div className="wgt-plate mt-1.5 flex-1 overflow-hidden px-1 pt-2" style={{ background: C.cardInner, minHeight: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.progress} margin={{ top: 5, right: 6, left: 6, bottom: 4 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.green} stopOpacity={0.7} />
                      <stop offset="100%" stopColor={C.green} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" hide />
                  <Tooltip cursor={false} contentStyle={{ background: C.bgHeader, border: "none", ...pixel }} labelStyle={{ color: C.textGold }} />
                  <Area type="monotone" dataKey="v" stroke={C.green} strokeWidth={2.5} fill="url(#g)" dot={{ r: 2.5, fill: C.green, strokeWidth: 0 }} />
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

        <Card title="RECENT WORKOUTS" className="flex flex-col xl:col-span-5">
          {/* Mirrors the Today roster: pressed-leather plates with a gold spine
              (these are saved entries) and a fixed stats grid so columns line up
              row-to-row. Each row is flex-1 so the three GROW to fill the card
              height evenly — comfortable tall rows, never short rows floating in
              a void. */}
          <div className="flex flex-1 flex-col gap-2.5">
            {data.recent.map((w, i) => (
              <div
                key={i}
                className="wgt-plate relative flex flex-1 items-center gap-3 overflow-hidden px-4"
                style={{ background: C.cardInner, minHeight: 64 }}
              >
                <span className="absolute inset-y-0 left-0 w-[5px]" style={{ background: C.gold }} />

                <img
                  src={RECENT_ART.icons[w.icon]}
                  alt=""
                  className="h-12 w-12 shrink-0 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />

                {/* name + date — the identity block, kept narrow for the tighter
                    column; name wraps to two lines rather than truncating. */}
                <div className="w-[124px] shrink-0 leading-tight">
                  <p style={{ ...pixel, ...D }} className="text-[18px] font-bold leading-[1.05]">{w.name}</p>
                  <p style={{ ...pixel, ...M }} className="mt-0.5 text-[13px] uppercase tracking-wide">{w.exercise} · {w.date}</p>
                </div>

                {/* fixed 3-column stat grid so every row aligns */}
                <div className="grid flex-1 grid-cols-3 gap-1">
                  {w.stats.map((s, j) => (
                    <div key={j} className="text-center leading-none">
                      <p style={{ ...pixel, color: C.green }} className="text-[24px] font-bold">{s.v}</p>
                      <p style={{ ...pixel, ...M }} className="mt-1 text-[12px] uppercase tracking-wide">{s.l}</p>
                    </div>
                  ))}
                </div>

                <div className="flex shrink-0 items-center gap-2 pl-1">
                  <Heart size={17} className="text-red-700" />
                  <Bookmark size={17} style={M} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="MISSIONS" className="flex flex-col xl:col-span-5">
          {/* Three portrait cards side by side. Each card's art window is flex-1,
              so when the cards stretch to the row height it's the illustration
              box that grows — never an empty band in the text — keeping them
              looking intentional at whatever height RECENT WORKOUTS sets. */}
          <div className="flex flex-1 items-stretch gap-2">
            {data.missions.map((m, i) => (
              <MissionCard key={i} mission={m} />
            ))}
          </div>
        </Card>

        <Card title="REWARDS" className="flex flex-col xl:col-span-2">
          {/* Slimmed down to keep the card short: just the current XP on its
              board, then the SHOP button. (Medals moved out so this column
              doesn't tower over RECENT WORKOUTS.) */}
          <div
            className="flex flex-1 flex-col items-center justify-center px-2 py-4"
            style={{
              backgroundImage: `url(${REWARD_ART.xpBoard})`,
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
              minHeight: 120,
            }}
          >
            <span style={{ ...pixel, color: C.textGold }} className="text-[16px] tracking-[0.25em]">CURRENT XP</span>
            <span style={{ ...pixel, color: C.gold }} className="text-[60px] font-bold leading-none">{data.xp}</span>
          </div>

          <Frame frame="shopWide" border={14} className="mt-3 w-full">
            <button
              onClick={() => onNavigate(ROUTES.SHOP)}
              className="wgt-press flex w-full items-center justify-center gap-2 py-1.5"
              style={{ color: C.textGold }}
            >
              <ShoppingCart size={18} /><span style={pixel} className="text-[22px] tracking-wide">SHOP</span>
            </button>
          </Frame>
        </Card>
      </div>
    </AppShell>
  );
}
