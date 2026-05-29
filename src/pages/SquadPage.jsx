/**
 * SquadPage.jsx — roster of sections with member cards. Tabs, search, and a
 * detail panel. Members come from data; click one to populate the right panel.
 */
import { useState } from "react";
import { Users, Plus, Search, SlidersHorizontal, Star } from "lucide-react";
import { AppShell, ActionButton, Card } from "../ui";
import { ROUTES } from "../routes";
import { C, pixel, USER as user } from "../theme";
const tabs = ["ALPHA 3-1", "BRAVO 3-2", "CHARLIE 3-3", "DELTA 3-4"];

const sections = [
  { name: "SECTION 1", members: [
    { name: "JAYDEN", trait: "Focus." }, { name: "AIDEN", trait: "Consistent." }, { name: "ZHI HAO", trait: "Steady." },
    { name: "SHAHRUL", trait: "Reliable." }, { name: "MARCUS", trait: "Loyal." } ] },
  { name: "SECTION 2", members: [
    { name: "ETHAN", trait: "Humble." }, { name: "BRANDON", trait: "Hardworking." }, { name: "JOSHUA", trait: "Resilient." },
    { name: "DANIEL", trait: "Determined." }, { name: "MIGUEL", trait: "Adaptable." } ] },
];

function MemberCard({ m, onClick, active }) {
  return (
    <button onClick={onClick} className="wgt-press rounded-lg p-2 text-center"
      style={{ background: C.cardInner, outline: active ? `2px solid ${C.gold}` : "none" }}>
      <div className="relative mx-auto mb-1 flex h-16 w-16 items-center justify-center rounded" style={{ background: C.green }}>
        {/* ART SLOT: member avatar */}
        <span className="text-3xl">🧑‍✈️</span>
        <Star size={12} className="absolute right-0 top-0" style={{ color: C.gold }} />
      </div>
      <p style={pixel} className="text-[14px]"><span style={{ color: C.textDark }}>{m.name}</span></p>
      <p style={pixel} className="text-[11px]"><span style={{ color: "#6b5c3e" }}>{m.trait}</span></p>
    </button>
  );
}

export default function SquadPage({ onNavigate }) {
  const [tab, setTab] = useState(tabs[0]);
  const [sel, setSel] = useState(null);

  return (
    <AppShell
      active={ROUTES.SQUAD} onNavigate={onNavigate} user={user}
      icon={<Users size={36} />} title="SQUAD" subtitle="STRONGER TOGETHER. THROUGH EVERY MISSION."
      action={<ActionButton icon={<Plus size={20} />}>ADD BUDDY</ActionButton>}
    >
      <div className="grid grid-cols-3 gap-4 p-6">
        <div className="col-span-2 space-y-3">
          {/* filter row */}
          <div className="flex gap-2">
            <div className="flex items-center gap-2 rounded-md px-3 py-2" style={{ background: C.cardInner }}>
              <span style={pixel} className="text-[15px]"><span style={{ color: C.textDark }}>ALL SECTIONS</span></span>
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-md px-3 py-2" style={{ background: C.cardInner }}>
              <Search size={16} style={{ color: "#6b5c3e" }} />
              <span style={pixel} className="text-[15px]"><span style={{ color: "#6b5c3e" }}>Search by name or role…</span></span>
            </div>
            <div className="flex items-center rounded-md px-3" style={{ background: C.cardInner }}><SlidersHorizontal size={16} style={{ color: C.textDark }} /></div>
          </div>
          {/* tabs */}
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)} style={pixel}
                className="rounded-md px-4 py-1.5 text-[15px]"
                >
                <span style={{ color: tab === t ? C.textGold : C.textDark, background: tab === t ? C.green : "transparent", padding: "4px 10px", borderRadius: 6 }}>{t}</span>
              </button>
            ))}
          </div>
          <Card>
            {/* commander */}
            <div className="mb-3 flex items-center gap-3 rounded-lg p-3" style={{ background: C.cardInner }}>
              <div className="flex h-16 w-16 items-center justify-center rounded" style={{ background: C.green }}><span className="text-3xl">🧑‍✈️</span></div>
              <div>
                <p style={pixel} className="text-[20px]"><span style={{ color: C.textDark }}>LTC LIM</span></p>
                <p style={pixel} className="text-[13px]"><span style={{ color: "#6b5c3e" }}>Leads by example.</span></p>
              </div>
              <div className="ml-auto rounded-md p-2 text-3xl" style={{ background: "#bcae8a" }}>🪖</div>
            </div>
            {sections.map((s) => (
              <div key={s.name} className="mb-3">
                <p style={pixel} className="mb-1 text-[14px]"><span style={{ color: C.textDark }}>— {s.name}</span></p>
                <div className="grid grid-cols-5 gap-2">
                  {s.members.map((m) => (
                    <MemberCard key={m.name} m={m} active={sel?.name === m.name} onClick={() => setSel(m)} />
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* detail panel */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded" style={{ background: "#bcae8a" }} />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-3/4 rounded" style={{ background: "#bcae8a" }} />
                <div className="h-3 w-1/2 rounded" style={{ background: "#bcae8a" }} />
              </div>
            </div>
          </Card>
          <Card>
            {sel ? (
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-24 w-24 items-center justify-center rounded" style={{ background: C.green }}><span className="text-5xl">🧑‍✈️</span></div>
                <p style={pixel} className="text-[26px]"><span style={{ color: C.textDark }}>{sel.name}</span></p>
                <p style={pixel} className="text-[16px]"><span style={{ color: "#6b5c3e" }}>{sel.trait}</span></p>
              </div>
            ) : (
              <p style={pixel} className="py-10 text-center text-[28px] leading-snug"><span style={{ color: C.textDark }}>Select someone to learn more about them!</span></p>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
