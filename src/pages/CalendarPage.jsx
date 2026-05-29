/**
 * CalendarPage.jsx — proves the "calendar as a component, not an image" point.
 * The grid is plain CSS; events come from data and render dynamically.
 */
import { useState } from "react";
import { Calendar as CalIcon, Plus, ChevronLeft, ChevronRight, Clock, MapPin, Users, Bookmark } from "lucide-react";
import { AppShell, ActionButton, Card } from "../ui";
import { ROUTES } from "../routes";
import { C, pixel, USER as user } from "../theme";

// keyed by day-of-month for this demo month
const events = {
  2: { name: "Outfield", time: "08:00", icon: "🌲" },
  4: { name: "Route March", time: "06:30", icon: "🥾" },
  7: { name: "Live Firing", time: "09:00", icon: "🎯" },
  10: { name: "POP Parade", time: "16:00", icon: "👥" },
  15: { name: "Promotion to CPL", time: "10:00", icon: "🎖️" },
  18: { name: "Squad Dinner", time: "18:30", icon: "👥", star: true },
  21: { name: "Fitness Test", time: "07:00", icon: "🏅" },
  24: { name: "Outfield", time: "08:00", icon: "🌲" },
  27: { name: "Route March", time: "06:30", icon: "🥾" },
  30: { name: "POP Parade", time: "16:00", icon: "👥" },
};

const upcoming = [
  { d: "21", m: "MAY", name: "Fitness Test", sub: "07:00 · Parade Square", icon: "🏅" },
  { d: "24", m: "MAY", name: "Outfield", sub: "08:00 · Outfield", icon: "🌲" },
  { d: "27", m: "MAY", name: "Route March", sub: "06:30 · Route Alpha", icon: "🥾" },
  { d: "30", m: "MAY", name: "POP Parade", sub: "16:00 · Parade Square", icon: "👥" },
  { d: "03", m: "JUN", name: "Live Firing", sub: "09:00 · Live Firing Range", icon: "🎯" },
];

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function CalendarPage({ onNavigate }) {
  const [view, setView] = useState("MONTH");
  // May 2026 starts on a Friday; build a 6x7 grid with leading/trailing blanks
  const firstDow = 5, daysInMonth = 31;
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <AppShell
      active={ROUTES.CALENDAR} onNavigate={onNavigate} user={user}
      icon={<CalIcon size={36} />} title="CALENDAR" subtitle="PLAN YOUR DAYS. REMEMBER WHAT MATTERS."
      action={<ActionButton icon={<Plus size={20} />}>NEW EVENT</ActionButton>}
    >
      <div className="grid grid-cols-3 gap-4 p-6">
        {/* calendar grid */}
        <Card className="col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-md px-2 py-1" style={{ background: C.green }}>
              <ChevronLeft size={18} /><span style={pixel} className="text-[20px]">MAY 2026</span><ChevronRight size={18} />
            </div>
            <div className="flex gap-1">
              {["WEEK", "MONTH"].map((v) => (
                <button key={v} onClick={() => setView(v)} style={pixel} className="rounded-md px-3 py-1 text-[16px]">
                  <span style={{ color: view === v ? C.textGold : C.textDark, background: view === v ? C.green : "transparent", padding: "2px 8px", borderRadius: 6 }}>{v}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {DOW.map((d) => (
              <div key={d} style={pixel} className="pb-1 text-center text-[14px]" >
                <span style={{ color: C.textDark }}>{d}</span>
              </div>
            ))}
            {cells.map((d, i) => (
              <div key={i} className="min-h-[78px] rounded-md p-1"
                style={{ background: d ? C.cardInner : "transparent", outline: events[d]?.star ? `2px solid ${C.gold}` : "none" }}>
                {d && <div style={pixel} className="text-[14px]" ><span style={{ color: C.textDark }}>{d}</span></div>}
                {events[d] && (
                  <div className="mt-1 rounded px-1 py-0.5" style={{ background: "#cdb88f" }}>
                    <div className="text-sm leading-none">{events[d].icon}</div>
                    <div style={pixel} className="text-[11px] leading-tight" ><span style={{ color: C.textDark }}>{events[d].name}</span></div>
                    <div style={pixel} className="text-[10px]" ><span style={{ color: "#6b5c3e" }}>{events[d].time}</span></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* selected event + upcoming */}
        <div className="flex flex-col gap-4">
          <Card>
            <div className="mb-2 flex items-center gap-2">
              <span>⭐</span><span style={pixel} className="text-[20px]" ><span style={{ color: C.textDark }}>Squad Dinner</span></span>
            </div>
            <p style={pixel} className="text-[14px]" ><span style={{ color: "#6b5c3e" }}>SAT, 18 MAY 2024 · 18:30</span></p>
            <div className="my-2 rounded-md p-2" style={{ background: C.cardInner }}>
              <p style={pixel} className="text-[15px] leading-snug" ><span style={{ color: C.textDark }}>End of week dinner with the squad. Good food, better company. Grateful for the bond.</span></p>
            </div>
            {[["TIME", "18:30", <Clock size={14} />], ["LOCATION", "Cookhouse 2F", <MapPin size={14} />], ["ATTENDEES (6)", "", <Users size={14} />]].map(([k, v, ic]) => (
              <div key={k} className="flex items-center gap-2 border-b py-1" style={{ borderColor: "#00000015" }}>
                <span style={{ color: C.textDark }}>{ic}</span>
                <span style={pixel} className="text-[14px]" ><span style={{ color: C.textDark }}>{k}</span></span>
                <span style={pixel} className="ml-auto text-[14px]" ><span style={{ color: C.textDark }}>{v}</span></span>
              </div>
            ))}
          </Card>

          <Card title="UPCOMING EVENTS">
            <div className="space-y-2">
              {upcoming.map((e, i) => (
                <div key={i} className="wgt-press flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: C.cardInner }}>
                  <div className="w-9 text-center leading-tight">
                    <p style={pixel} className="text-[16px]" ><span style={{ color: C.textDark }}>{e.d}</span></p>
                    <p style={pixel} className="text-[10px]" ><span style={{ color: "#6b5c3e" }}>{e.m}</span></p>
                  </div>
                  <span className="text-lg">{e.icon}</span>
                  <div className="flex-1 leading-tight">
                    <p style={pixel} className="text-[15px]" ><span style={{ color: C.textDark }}>{e.name}</span></p>
                    <p style={pixel} className="text-[11px]" ><span style={{ color: "#6b5c3e" }}>{e.sub}</span></p>
                  </div>
                  <Bookmark size={14} style={{ color: "#6b5c3e" }} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
