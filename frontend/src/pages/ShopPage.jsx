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

const FILTERS = ["ALL", "NEW", "BEST SELLER", "LIMITED", "DISCOUNTED", "OWNED", "NOT OWNED"];

const items = [
  { key: "camocap", img: "../../assets/training/shop/items/item1.png", rarity: "common", price: 400, flags: ["NEW"] },
  { key: "aviator", img: "../../assets/training/shop/items/item2.png", rarity: "common", price: 350, flags: ["BEST SELLER"] },
  { key: "dogtags", img: "../../assets/training/shop/items/item3.png", rarity: "rare", price: 900, flags: ["BEST SELLER"] },
  { key: "scarf", img: "../../assets/training/shop/items/item4.png", rarity: "epic", price: 1800, flags: ["NEW"] },
  { key: "helmet", img: "../../assets/training/shop/items/item5.png", rarity: "legendary", price: 3500, flags: ["LIMITED"] },
  { key: "badge", img: "../../assets/training/shop/items/item6.png", rarity: "legendary", price: 5000, flags: ["LIMITED", "OWNED"], owned: true },
];

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
      <div className="mx-auto w-full max-w-[1700px] space-y-5 p-3 sm:p-6">
        {/* ---- shop ribbon + tabs ---- */}
        <div className="flex items-center gap-3 rounded-lg px-4 py-2" style={{ background: C.cardLight }}>
          <img src="../../assets/journal/talking_soldier.png" className="w-10 h-10 object-contain"/>
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
          <div className="grid grid-cols-4 gap-3 min-[480px]:grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 2xl:grid-cols-8">
            <img src="..\..\assets\training\shop\crates\crate1.png" width="100%" className="cursor-pointer hover:scale-105 transition rounded-[5%]" />
            <img src="..\..\assets\training\shop\crates\crate2.png" width="100%" className="cursor-pointer hover:scale-105 transition rounded-[5%]" />
            <img src="..\..\assets\training\shop\crates\crate3.png" width="100%" className="cursor-pointer hover:scale-105 transition rounded-[5%]" />
            <img src="..\..\assets\training\shop\crates\crate4.png" width="100%" className="cursor-pointer hover:scale-105 transition rounded-[5%]" />
            <img src="..\..\assets\training\shop\crates\crate5.png" width="95%" className="cursor-pointer hover:scale-105 transition rounded-[5%]" />
            <img src="..\..\assets\training\shop\crates\crate6.png" width="96%" className="cursor-pointer hover:scale-105 transition rounded-[5%]" />
            <img src="..\..\assets\training\shop\crates\crate7.png" width="100%" className="cursor-pointer hover:scale-105 transition rounded-[5%]" />
          </div>
        </div>

        {/* ---- ITEMS ---- */}
        <div>
          <div className="mb-2 flex items-baseline gap-3">
            <h2 style={{ ...pixel, color: C.gold }} className="text-[30px] leading-none">ITEMS</h2>
            <span style={{ ...pixel, color: C.textMuted }} className="text-[15px]">{shown.length} shown · {filter}</span>
          </div>
          {shown.length ? (
            <div className="grid grid-cols-4 gap-3 min-[480px]:grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 2xl:grid-cols-8">
              {shown.map((it) => (
                <button key={it.key} onClick={() => setSel(it.key)} className="transition hover:scale-105">
                  <img src={it.img} className="w-full rounded-[3%]" />
                </button>
              ))}
            </div>
          ) : (
            <p style={{ ...pixel, color: C.textMuted }} className="py-8 text-center text-[20px]">
              Nothing here under “{filter}”. Try another filter.
            </p>
          )}
          </div>
        </div>
    </AppShell>
  );
}
