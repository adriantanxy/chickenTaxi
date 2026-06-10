/**
 * ProfileMain.jsx — the MAIN profile page (the landing view for PROFILE).
 *
 * The little avatar card on the right has an INSPECT button. Clicking it should
 * open the paper-doll customiser (ProfileCustomizer.jsx). Wire it via the
 * `onInspect` prop — e.g. in App.jsx keep a sub-state and pass onInspect={() =>
 * setProfileView("customize")}.
 *
 * Everything here is data-driven: stats, achievements, goals come from `data`
 * (later: Firestore). Only the decorative bits (frames/photos/avatar parts) are
 * art. Text is never baked into an image.
 */
import { useEffect, useState } from "react";
import {
  Award,
  CalendarDays,
  Check,
  Clock,
  Crosshair,
  Footprints,
  Heart,
  MapPin,
  Pencil,
  Plus,
  Search,
  Share2,
  Shield,
  ShoppingCart,
  User,
} from "lucide-react";
import { AppShell, ActionButton, Card, Ribbon } from "../ui";
import { ASSETS } from "../assets";
import { AVATAR_LAYER_ORDER } from "../avatarConfig";
import { ROUTES } from "../routes";
import { C, pixel, D, M, USER as user } from "../theme";
import EnableNotificationsButton from "../components/EnableNotificationsButton";

const data = {
  profile: {
    displayName: "ALEX LIM",
    rank: "RECRUIT",
    unit: "PLATOON 3 SECTION 1",
    daysIn: "20 DAYS IN",
    ordDays: 143,
    about: "Hi! I'm Alex and I'm new here. Hope we can have a good time together!!!",
    photoCaption: "CAMPFIRE NIGHT",
    photoGlyph: "🏕️",
  },
  tags: [
    { label: "MARKSMAN", icon: <Crosshair size={40} /> },
    { label: "IPPT GOLD", icon: <Shield size={40} /> },
  ],
  achievements: [
    { name: "First Footsteps", desc: "Create your first memory.", state: "Earned on 20 MAY 2024", done: true, icon: <Award size={20} /> },
    { name: "Pathfinders", desc: "Create 10 memories.", progress: 8, goal: 10, icon: <Footprints size={20} /> },
    { name: "Timekeeper", desc: "Lock your first time capsule.", state: "Earned on 15 MAY 2024", done: true, icon: <Clock size={20} /> },
  ],
  training: {
    rows: [
      { label: "IPPT Score", value: "89 pts (Gold)", bar: 0.89 },
      { label: "Total Workouts", value: "28" },
      { label: "Avg. Score", value: "83 pts" },
      { label: "Best Score", value: "92 pts (Gold)" },
    ],
    badges: ["🥇", "🎯", "🎖️", "🏆"],
    moreBadges: 2,
  },
  goals: [
    { task: "Score Gold for IPPT", note: "In progress" },
    { task: "Create 50 memories", progress: 42, goal: 50 },
    { task: "Lock 5 time capsules", progress: 3, goal: 5 },
  ],
};

function MiniSlot({ s, previewSrc }) {
  return (
    <div>
      <p style={{ ...pixel, color: C.textGold }} className="mb-0.5 text-center text-[11px] leading-none">{s.label}</p>
      <div className="flex h-10 items-center justify-center rounded-md"
        style={{ background: "#23241a", outline: `1px solid ${C.line}66` }}>
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={s.label}
            className="h-8 w-8 object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <span className="text-xl">{s.glyph}</span>
        )}
      </div>
    </div>
  );
}

export default function ProfileMain({ onNavigate, onInspect = () => {}, equipped = {} }) {
  const [rotationIndex, setRotationIndex] = useState(0);

  const selectedLoadout = equipped.loadout ?? "loadout1";
  const loadoutComponents = ASSETS.avatar.loadouts?.[selectedLoadout]?.components ?? {};
  // Spin the saved loadout's sprites (e.g. loadout2 for the red tank top),
  // not the global default, so the main page matches the saved look.
  const rotationFrames =
    ASSETS.avatar.loadouts?.[selectedLoadout]?.rotations ?? ASSETS.avatar.rotations ?? [];
  const hasRotationFrames = rotationFrames.length > 0;

  const getAvatarLayerSrc = (layerKey) => {
    if (layerKey === "body") return ASSETS.avatar.base;
    const configuredValue = equipped[layerKey];
    if (typeof configuredValue === "string") {
      if (configuredValue.startsWith("/")) return configuredValue;
      if (ASSETS.avatar[configuredValue]) return ASSETS.avatar[configuredValue];
    }
    return configuredValue || loadoutComponents[layerKey] || null;
  };

  useEffect(() => {
    if (!hasRotationFrames) return;
    const id = window.setInterval(() => {
      setRotationIndex((n) => (n + 1) % rotationFrames.length);
    }, 300);
    return () => window.clearInterval(id);
  }, [hasRotationFrames, rotationFrames.length]);

  return (
    <AppShell
      active={ROUTES.PROFILE} onNavigate={onNavigate} user={user}
      icon={<User size={36} />} title="PROFILE" subtitle="YOUR GROWTH, YOUR JOURNEY, YOUR STORY."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton icon={<ShoppingCart size={18} />} onClick={() => onNavigate(ROUTES.SHOP)}>
            SHOP
          </ActionButton>
          <ActionButton icon={<Pencil size={18} />}>EDIT PROFILE</ActionButton>
          <EnableNotificationsButton />
        </div>
      }
    >
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-4 p-3 sm:p-6 lg:grid-cols-3">
        {/* ===================== LEFT / MAIN ===================== */}
        <div className="space-y-4 lg:col-span-2">

          {/* ---- HERO: polaroid + identity + ORD countdown ---- */}
          <Card>
            <div className="flex flex-col gap-5 p-2 xl:flex-row">
              {/* polaroid photo */}
              <div className="shrink-0 -rotate-1 rounded-sm bg-white p-2 pb-6 shadow-md">
                <div className="flex h-40 w-36 items-center justify-center" style={{ background: C.green }}>
                  {ASSETS.avatar.base
                    ? <img src={ASSETS.avatar.base} alt="portrait" className="h-full w-full object-contain" style={{ imageRendering: "pixelated" }} />
                    : <span className="text-6xl">🧑‍✈️</span>}
                </div>
                <span style={{ color: C.gold }} className="absolute">★</span>
              </div>

              {/* identity */}
              <div className="min-w-0 flex-1">
                <p style={{ ...pixel, ...D }} className="border-b-2 pb-1 text-[40px] leading-none" >{data.profile.displayName}</p>
                <div className="mt-3 space-y-2">
                  <p style={{ ...pixel, ...D }} className="flex items-center gap-2 text-[20px]"><Shield size={18} style={M} />{data.profile.rank}</p>
                  <p style={{ ...pixel, ...D }} className="flex items-center gap-2 text-[20px]"><MapPin size={18} style={M} />{data.profile.unit}</p>
                  <p style={{ ...pixel, ...D }} className="flex items-center gap-2 text-[20px]"><CalendarDays size={18} style={M} />{data.profile.daysIn}</p>
                </div>
              </div>

              {/* ORD countdown + thumbnail */}
              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-40">
                <div className="rounded-md border-2 px-3 py-2 text-center" style={{ borderColor: "#7a8a52", background: "#cdd2ad" }}>
                  <p style={{ ...pixel, ...M }} className="text-[14px] leading-none">ORD COUNTDOWN</p>
                  <p style={{ ...pixel, color: "#2f3a1c" }} className="text-[44px] leading-none">{data.profile.ordDays}</p>
                  <p style={{ ...pixel, ...M }} className="flex items-center justify-center gap-1 text-[12px]">DAYS TO ORD <Heart size={10} className="fill-current text-red-700" /></p>
                </div>
                <div className="relative flex h-20 items-center justify-center rounded-md text-3xl" style={{ background: "#2a3320" }}>
                  {data.profile.photoGlyph}
                  <span style={{ ...pixel, color: C.textGold }} className="absolute bottom-1 text-[10px]">{data.profile.photoCaption}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* ---- ABOUT ME + two tags ---- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-[1.5fr_1fr_1fr]">
            <Card>
              <p style={{ ...pixel, ...D }} className="text-[22px] leading-none">ABOUT ME</p>
              <p style={{ ...pixel, ...D }} className="mt-1 text-[17px] leading-snug">{data.profile.about}</p>
              <Heart size={14} className="mt-1 fill-current text-red-700" />
            </Card>
            {data.tags.map((t) => (
              <Card key={t.label}>
                <div className="flex h-full flex-col items-center justify-center py-3 text-center">
                  <div style={D}>{t.icon}</div>
                  <p style={{ ...pixel, ...D }} className="mt-2 text-[20px]">{t.label}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* ---- ACHIEVEMENTS + TRAINING SUMMARY ---- */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <Ribbon>ACHIEVEMENTS</Ribbon>
                <span style={{ ...pixel, ...M }} className="text-[13px]">VIEW ALL</span>
              </div>
              <div className="space-y-2">
                {data.achievements.map((a) => (
                  <div key={a.name} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: C.cardInner }}>
                    <div className="flex h-8 w-8 items-center justify-center rounded" style={{ background: C.green, color: C.gold }}>{a.icon}</div>
                    <div className="flex-1 leading-tight">
                      <p style={{ ...pixel, ...D }} className="text-[16px]">{a.name}</p>
                      <p style={{ ...pixel, ...M }} className="text-[12px]">{a.desc}</p>
                      {a.done
                        ? <p style={{ ...pixel, ...M }} className="text-[11px]">{a.state}</p>
                        : (
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded" style={{ background: "#00000020" }}>
                              <div className="h-full" style={{ width: `${(a.progress / a.goal) * 100}%`, background: C.green }} />
                            </div>
                            <span style={{ ...pixel, ...M }} className="text-[11px]">{a.progress} / {a.goal}</span>
                          </div>
                        )}
                    </div>
                    {a.done && <Check size={16} className="text-green-700" />}
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-4">
              <Card>
                <div className="mb-2 flex items-center justify-between">
                  <Ribbon>TRAINING SUMMARY</Ribbon>
                  <span style={{ ...pixel, ...M }} className="text-[13px]">VIEW DETAILS</span>
                </div>
                {data.training.rows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between border-b py-1" style={{ borderColor: "#00000015" }}>
                    <span style={{ ...pixel, ...D }} className="text-[15px]">{r.label}</span>
                    <div className="flex items-center gap-2">
                      <span style={{ ...pixel, ...D }} className="text-[15px]">{r.value}</span>
                      {r.bar != null && (
                        <div className="h-1.5 w-16 overflow-hidden rounded" style={{ background: "#00000020" }}>
                          <div className="h-full" style={{ width: `${r.bar * 100}%`, background: C.green }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </Card>

              <Card frame="card" className="!p-3" >
                <div className="rounded-lg p-3" style={{ background: C.bgHeader }}>
                  <p style={{ ...pixel, color: C.textGold }} className="mb-2 text-[15px]">BADGES & TROPHIES</p>
                  <div className="flex items-center gap-2">
                    {data.training.badges.map((b, i) => (
                      <div key={i} className="flex h-10 w-10 items-center justify-center rounded-md text-xl" style={{ background: C.green }}>{b}</div>
                    ))}
                    <div className="flex h-10 w-10 items-center justify-center rounded-md" style={{ background: "#4a4030" }}>
                      <span style={{ ...pixel, color: C.textGold }} className="text-[16px]">+{data.training.moreBadges}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* ===================== RIGHT COLUMN ===================== */}
        <div className="space-y-4">

          {/* ---- AVATAR INSPECT CARD (dark) ---- */}
          <div className="rounded-2xl p-4" style={{ background: C.bgHeader }}>
            <div className="flex justify-center">
              {/* layered paper-doll avatar (single centered sprite) */}
              <div className="relative mx-auto" style={{ width: 220, height: 340 }}>
                {equipped && equipped.body ? (
                  // If a saved look provides a direct URL, render it
                  <img
                    src={equipped.body}
                    alt="saved look"
                    className="absolute inset-0 h-full w-full object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : hasRotationFrames ? (
                  <img
                    src={rotationFrames[rotationIndex]}
                    alt={`avatar rotation ${rotationIndex}`}
                    className="absolute inset-0 h-full w-full object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : ASSETS.avatar.base ? (
                  AVATAR_LAYER_ORDER.map((layerKey) => {
                    const src = getAvatarLayerSrc(layerKey);
                    if (!src) return null;
                    return (
                      <img key={layerKey} src={src} alt={layerKey}
                        className="absolute inset-0 h-full w-full object-contain"
                        style={{ zIndex: AVATAR_LAYER_ORDER.indexOf(layerKey), imageRendering: "pixelated" }} />
                    );
                  })
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-lg" style={{ background: C.green }}>
                    <span className="text-6xl">🧑‍✈️</span>
                  </div>
                )}
              </div>
            </div>

            {/* INSPECT (-> customiser) + SHARE */}
            <div className="mt-3 flex gap-2">
              <button onClick={onInspect} className="wgt-press flex flex-[3] items-center justify-center gap-2 rounded-lg border-2 py-2" style={{ borderColor: C.gold + "80", background: C.green, color: C.textGold }}>
                <Search size={16} /><span style={pixel} className="text-[18px]">CUSTOMISE</span>
              </button>
              <button className="wgt-press flex flex-[1] items-center justify-center gap-2 rounded-lg border-2 py-2" style={{ borderColor: C.gold + "80", background: C.green, color: C.textGold }}>
                <Share2 size={16} /><span style={pixel} className="text-[18px]">SHARE</span>
              </button>
            </div>
          </div>

          {/* ---- MY GOALS ---- */}
          <Card>
            <div className="mb-2 flex items-center gap-2">
              <Ribbon>MY GOALS</Ribbon>
              <Pencil size={14} style={M} />
            </div>
            <div className="space-y-3">
              {data.goals.map((g, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full border-2" style={{ borderColor: M.color }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p style={{ ...pixel, ...D }} className="text-[16px]">{g.task}</p>
                      {g.goal && <span style={{ ...pixel, ...M }} className="text-[13px]">{g.progress} / {g.goal}</span>}
                    </div>
                    {g.goal ? (
                      <div className="mt-1 h-2 w-full overflow-hidden rounded" style={{ background: "#00000020" }}>
                        <div className="h-full" style={{ width: `${(g.progress / g.goal) * 100}%`, background: C.green }} />
                      </div>
                    ) : (
                      <p style={{ ...pixel, ...M }} className="text-[13px]">{g.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button className="wgt-press mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2" style={{ background: C.cardInner }}>
              <Plus size={16} style={D} /><span style={{ ...pixel, ...D }} className="text-[16px]">ADD GOAL</span>
            </button>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
