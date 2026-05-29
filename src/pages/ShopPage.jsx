/**
 * ShopPage.jsx — XP store: crates (gacha) + individual cosmetics.
 *
 * Nicer-than-mockup touches: live countdown timers, rarity colour system shared
 * by crates AND items, working filter chips, hover lift, owned/locked states.
 *
 * Everything is data-driven (crates/items/balance => later Firestore + a callable
 * Cloud Function for "open crate" so the roll is server-authoritative, never the
 * client). Art is emoji fallback now; drop real sprites into ASSETS.icons and the
 * <Sprite> slots pick them up. Costs/owned flags must come from the server.
 */
import { useState, useEffect } from "react";
import { Store, Plus, Key, Ticket, ScrollText, ShoppingCart, ChevronDown, Check, Star } from "lucide-react";
import { AppShell, Card, Sprite } from "../ui";
import { ROUTES } from "../routes";
import { C, pixel, D, M, USER as user } from "../theme";

/* ---- rarity is the backbone of the look; one place, reused everywhere ---- */
const RARITY = {
  common:    { label: "COMMON",    color: "#9a8f6e" },
  rare:      { label: "RARE",      color: "#5b86b5" },
  epic:      { label: "EPIC",      color: "#9069b3" },
  legendary: { label: "LEGENDARY", color: "#cf9e44" },
};

const FILTERS = ["ALL", "NEW", "BEST SELLER", "LIMITED", "DISCOUNTED", "OWNED", "NOT OWNED"];

const crates = [
  { key: "standard", name: "STANDARD CRATE", sub: "Common to Rare",      glyph: "📦", tint: "#3d4a2a", cost: { type: "key", amt: 1 } },
  { key: "military", name: "MILITARY SUPPLY", sub: "Common to Epic",     glyph: "🧰", tint: "#2f4038", cost: { type: "key", amt: 1 } },
  { key: "premium",  name: "PREMIUM CRATE",  sub: "Rare to Legendary",   glyph: "🗃️", tint: "#5a4a28", cost: { type: "ticket", amt: 1 } },
  { key: "legend",   name: "LEGENDARY CRATE", sub: "Epic to Legendary",  glyph: "🎁", tint: "#5a3326", cost: { type: "ticket", amt: 1 }, shine: true },
  { key: "daily",    name: "DAILY FREE CRATE", sub: "1 free crate every day!", glyph: "🪖", tint: "#26331f", timer: "daily", cost: { type: "free" } },
  { key: "bundle",   name: "10+1 SPECIAL",   sub: "Open 10, get 1 free!", glyph: "📚", tint: "#26383d", cost: { type: "key", amt: 10, open: 10 } },
  { key: "limited",  name: "LIMITED CRATE",  sub: "Limited time only!",   glyph: "💼", tint: "#3a221c", timer: "limited", cost: { type: "ticket", amt: 1 }, limited: true },
];

const items = [
  { key: "camocap",  name: "CAMO CAP",        slot: "HEAD",  glyph: "🧢", rarity: "common",    price: 400,  flags: ["NEW"] },
  { key: "aviator",  name: "AVIATOR GLASSES", slot: "EYEWEAR", glyph: "🕶️", rarity: "common",  price: 350,  flags: ["BEST SELLER"] },
  { key: "dogtags",  name: "DOG TAGS",        slot: "CHARM", glyph: "🏷️", rarity: "rare",      price: 900,  flags: ["BEST SELLER"] },
  { key: "scarf",    name: "SHADOW SCARF",    slot: "NECK",  glyph: "🧣", rarity: "epic",      price: 1800, flags: ["NEW"] },
  { key: "helmet",   name: "COMMANDER HELMET", slot: "HEAD", glyph: "🪖", rarity: "legendary", price: 3500, flags: ["LIMITED"] },
  { key: "badge",    name: "GOLDEN BADGE",    slot: "PATCH", glyph: "🛡️", rarity: "legendary", price: 5000, flags: ["LIMITED", "OWNED"], owned: true },
];

function fmtTime(total) {
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n) => String(n).padStart(2, "0");
  return `${d > 0 ? `${d}D ` : ""}${p(h)}:${p(m)}:${p(s)}`;
}

function CostButton({ cost }) {
  if (cost.type === "free")
    return (
      <button className="w-full rounded-md py-1.5 text-center transition hover:brightness-110" style={{ background: C.green }}>
        <span style={{ ...pixel, color: C.textGold }} className="text-[18px]">FREE</span>
      </button>
    );
  const Icon = cost.type === "key" ? Key : Ticket;
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-md px-2 py-1" style={{ background: "#00000033" }}>
        <Icon size={14} style={{ color: C.gold }} />
        <span style={{ ...pixel, color: C.textGold }} className="text-[16px]">{cost.amt}</span>
      </div>
      <button className="flex-1 rounded-md py-1 text-center transition hover:brightness-110" style={{ background: C.green }}>
        <span style={{ ...pixel, color: C.textGold }} className="text-[16px]">OPEN {cost.open || 1}</span>
      </button>
    </div>
  );
}

function CrateCard({ c, time }) {
  return (
    <div
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border-2 p-3 transition-transform hover:-translate-y-1"
      style={{
        borderColor: (c.shine || c.limited) ? RARITY.legendary.color + "aa" : C.line + "55",
        background: `linear-gradient(160deg, ${c.tint}, #1c1d15)`,
        boxShadow: c.shine ? `0 0 18px ${RARITY.legendary.color}33` : "none",
      }}
    >
      <div className="text-center leading-tight">
        <p style={{ ...pixel, color: C.textGold }} className="text-[15px]">{c.name}</p>
        <p style={{ ...pixel, color: C.textMuted }} className="text-[12px]">{c.sub}</p>
      </div>

      <div className="my-2 flex h-20 items-center justify-center text-5xl transition-transform group-hover:scale-110">
        <Sprite name={c.key} size={64} fallback={c.glyph} />
      </div>

      {c.timer ? (
        <div className="mb-2 rounded-md py-1 text-center" style={{ background: "#00000040" }}>
          <p style={{ ...pixel, color: C.textMuted }} className="text-[10px] leading-none">{c.timer === "daily" ? "REFRESHES IN" : "ENDS IN"}</p>
          <p style={{ ...pixel, color: C.gold }} className="text-[18px] leading-none">{fmtTime(time)}</p>
        </div>
      ) : null}

      <CostButton cost={c.cost} />
    </div>
  );
}

function ItemCard({ it, active, onClick }) {
  const r = RARITY[it.rarity];
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-xl border-[3px] p-3 text-center transition-transform hover:-translate-y-1"
      style={{
        borderColor: r.color,
        background: C.cardLight,
        outline: active ? `2px solid ${C.gold}` : "none",
        boxShadow: `0 0 14px ${r.color}33`,
      }}
    >
      {/* rarity tag */}
      <span className="absolute left-2 top-2 rounded px-1.5 py-0.5" style={{ background: r.color }}>
        <span style={{ ...pixel, color: "#fff" }} className="text-[10px]">{r.label}</span>
      </span>
      {it.owned && <Check size={16} className="absolute right-2 top-2 text-green-700" />}

      <div className="flex h-28 items-center justify-center text-6xl transition-transform group-hover:scale-110">
        <Sprite name={it.key} size={88} fallback={it.glyph} />
      </div>

      <p style={{ ...pixel, ...D }} className="text-[19px] leading-none">{it.name}</p>
      <p style={{ ...pixel, ...M }} className="text-[13px]">{it.slot}</p>

      <div className="mt-2 flex items-center justify-center gap-1 border-t pt-2" style={{ borderColor: "#00000018" }}>
        {it.owned ? (
          <span style={{ ...pixel, ...M }} className="text-[14px]">OWNED</span>
        ) : (
          <>
            <Star size={12} style={{ color: r.color }} className="fill-current" />
            <span style={{ ...pixel, ...D }} className="text-[16px]">{it.price.toLocaleString()} XP</span>
          </>
        )}
      </div>
    </button>
  );
}

export default function ShopPage({ onNavigate }) {
  const [filter, setFilter] = useState("ALL");
  const [sel, setSel] = useState(null);
  const [t, setT] = useState({ daily: 46092, limited: 218892 });
  const balance = 8920;

  useEffect(() => {
    const id = setInterval(() => setT((p) => ({
      daily: p.daily > 0 ? p.daily - 1 : 86400,
      limited: Math.max(0, p.limited - 1),
    })), 1000);
    return () => clearInterval(id);
  }, []);

  const shown = items.filter((it) => {
    if (filter === "ALL") return true;
    if (filter === "OWNED") return it.owned;
    if (filter === "NOT OWNED") return !it.owned;
    return it.flags.includes(filter);
  });

  return (
    <AppShell
      active={ROUTES.TRAINING} onNavigate={onNavigate} user={user}
      icon={<Store size={34} />} title="SHOP" subtitle="EARN XP, DECORATE YOUR AVATAR."
      action={
        <div className="flex items-center gap-1 rounded-lg border-2 px-3 py-1.5" style={{ borderColor: C.gold + "99", background: C.bgHeader }}>
          <Star size={16} className="fill-current" style={{ color: C.gold }} />
          <span style={{ ...pixel, color: C.textGold }} className="text-[15px]">XP</span>
          <span style={{ ...pixel, color: C.gold }} className="ml-1 text-[26px] leading-none">{balance.toLocaleString()}</span>
          <button className="ml-2 rounded-md px-2 py-0.5" style={{ background: C.green }}><Plus size={16} style={{ color: C.textGold }} /></button>
        </div>
      }
    >
      <div className="space-y-5 p-6">
        {/* ---- shop ribbon + tabs ---- */}
        <div className="flex items-center gap-3 rounded-lg px-4 py-2" style={{ background: C.cardLight }}>
          <span className="text-2xl">🪖</span>
          <span style={{ ...pixel, ...D }} className="flex-1 text-center text-[28px] leading-none">SHOP</span>
          <button className="rounded-md p-1.5" style={{ background: C.cardInner }}><ScrollText size={18} style={D} /></button>
          <button className="rounded-md p-1.5" style={{ background: C.cardInner }}><ShoppingCart size={18} style={D} /></button>
        </div>

        {/* ---- filter chips ---- */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="rounded-md border-2 px-3 py-1 transition"
              style={{
                borderColor: filter === f ? C.gold : C.line + "55",
                background: filter === f ? C.green : "transparent",
                color: filter === f ? C.textGold : C.textMuted,
              }}>
              <span style={pixel} className="text-[15px]">{f}</span>
            </button>
          ))}
          <button className="flex items-center gap-1 rounded-md border-2 px-3 py-1" style={{ borderColor: C.line + "55", color: C.textMuted }}>
            <span style={pixel} className="text-[15px]">RARITY</span><ChevronDown size={14} />
          </button>
        </div>

        {/* ---- CRATES ---- */}
        <div>
          <h2 style={{ ...pixel, color: C.gold }} className="mb-2 text-[30px] leading-none">CRATES</h2>
          <div className="grid grid-cols-7 gap-3">
            {crates.map((c) => <CrateCard key={c.key} c={c} time={c.timer === "daily" ? t.daily : t.limited} />)}
          </div>
        </div>

        {/* ---- ITEMS ---- */}
        <div>
          <div className="mb-2 flex items-baseline gap-3">
            <h2 style={{ ...pixel, color: C.gold }} className="text-[30px] leading-none">ITEMS</h2>
            <span style={{ ...pixel, color: C.textMuted }} className="text-[15px]">{shown.length} shown · {filter}</span>
          </div>
          {shown.length ? (
            <div className="grid grid-cols-6 gap-3">
              {shown.map((it) => <ItemCard key={it.key} it={it} active={sel === it.key} onClick={() => setSel(it.key)} />)}
            </div>
          ) : (
            <p style={{ ...pixel, color: C.textMuted }} className="py-8 text-center text-[20px]">Nothing here under “{filter}”. Try another filter.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
