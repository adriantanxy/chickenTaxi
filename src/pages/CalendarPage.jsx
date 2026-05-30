/**
 * CalendarPage.jsx — a working calendar, not a mockup.
 *
 * Real date math drives the grid (any month / year, leap years included), days
 * are selectable, the month nav + WEEK/MONTH toggle actually change the view,
 * and events can be created, edited and deleted. State is in-memory (seeded from
 * demo data) — changes hold for the session and reset on a hard reload.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalIcon, CornerDownLeft, Plus, ChevronLeft, ChevronRight, ChevronDown, MapPin, Trash2, X, Pencil } from "lucide-react";
import { AppShell, ActionButton, Card } from "../ui";
import { ROUTES } from "../routes";
import { C, pixel, USER as user } from "../theme";

// Event categories carry a colour so the month is scannable at a glance — each
// tile gets a thin accent bar in its category hue. Kept earthy to sit on sepia.
const CAT = {
  field:   { color: "#5a6e38", label: "Field",   icon: "🌲" },
  march:   { color: "#8a5a2b", label: "March",   icon: "🥾" },
  firing:  { color: "#a63d2f", label: "Firing",  icon: "🎯" },
  admin:   { color: "#3d4a2a", label: "Admin",   icon: "👥" },
  fitness: { color: "#b8893a", label: "Fitness", icon: "🏅" },
  social:  { color: "#7a5c8a", label: "Social",  icon: "🍽️" },
};
const CAT_KEYS = Object.keys(CAT);

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const MON3 = MONTHS.map((m) => m.slice(0, 3)); // JAN, FEB, ... for fixed-width labels
const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// Seed data lives on May 2026 (month index 4). id lets us edit/delete cleanly.
let _id = 0;
const nextId = () => `e${++_id}`;
const SEED = [
  { day: 2,  name: "Outfield",         time: "08:00", cat: "field",   location: "Outfield" },
  { day: 4,  name: "Route March",      time: "06:30", cat: "march",   location: "Route Alpha" },
  { day: 7,  name: "Live Firing",      time: "09:00", cat: "firing",  location: "Live Firing Range" },
  { day: 10, name: "POP Parade",       time: "16:00", cat: "admin",   location: "Parade Square" },
  { day: 15, name: "Promotion to CPL", time: "10:00", cat: "admin",   location: "Parade Square" },
  { day: 18, name: "Squad Dinner",     time: "18:30", cat: "social",  location: "Cookhouse 2F" },
  { day: 21, name: "Fitness Test",     time: "07:00", cat: "fitness", location: "Parade Square" },
  { day: 24, name: "Outfield",         time: "08:00", cat: "field",   location: "Outfield" },
  { day: 27, name: "Route March",      time: "06:30", cat: "march",   location: "Route Alpha" },
  { day: 30, name: "POP Parade",       time: "16:00", cat: "admin",   location: "Parade Square" },
].map((e) => ({ id: nextId(), year: 2026, month: 4, ...e }));

// "Today" for this demo is fixed so the seeded month feels current.
const TODAY = { year: 2026, month: 4, day: 30 };

const sameDay = (a, b) => a && b && a.year === b.year && a.month === b.month && a.day === b.day;
// Two dates fall in the same Sun–Sat week.
const weekStartOf = (o) => { const d = new Date(o.year, o.month, o.day); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d.getTime(); };
const sameWeek = (a, b) => a && b && weekStartOf(a) === weekStartOf(b);
const keyOf = (y, m, d) => `${y}-${m}-${d}`;
const ordinal = (d) => { const s = ["th", "st", "nd", "rd"], v = d % 100; return d + (s[(v - 20) % 10] || s[v] || s[0]); };

export default function CalendarPage({ onNavigate }) {
  const [view, setView] = useState("MONTH");
  const [events, setEvents] = useState(SEED);
  const [cursor, setCursor] = useState({ year: TODAY.year, month: TODAY.month });
  // `selected` always points at a day (drives week view + grid highlight).
  // `daySelected` controls whether the right panel shows that day's timeline
  // (true) or falls back to the upcoming overview (false). Clicking the active
  // day toggles it off.
  const [selected, setSelected] = useState({ ...TODAY });
  const [daySelected, setDaySelected] = useState(true);
  const [editor, setEditor] = useState(null); // null | { id?, ...fields }
  const [pickerOpen, setPickerOpen] = useState(false);

  // Fast lookup: "y-m-d" -> events[] for that day, kept sorted by time.
  const byDay = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      const k = keyOf(e.year, e.month, e.day);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(e);
    }
    for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return map;
  }, [events]);
  const eventsOn = (y, m, d) => byDay.get(keyOf(y, m, d)) || [];

  // Build the visible cells. MONTH = 6×7 grid with adjacent-month spill;
  // WEEK = just the week containing the selected day.
  const { year, month } = cursor;
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const monthCells = useMemo(() => {
    const cells = [];
    for (let i = firstDow - 1; i >= 0; i--) cells.push({ year, month: month - 1, day: prevDays - i, out: true });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ year, month, day: d, out: false });
    for (let d = 1; cells.length % 7 !== 0; d++) cells.push({ year, month: month + 1, day: d, out: true });
    return cells.map(normalizeMY);
  }, [year, month, firstDow, daysInMonth, prevDays]);

  // WEEK = the seven days around `selected`. In this view nothing is "out of
  // month" — every day belongs to the week you're looking at.
  const weekCells = useMemo(() => {
    const base = new Date(selected.year, selected.month, selected.day);
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay()); // back to Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(start);
      dt.setDate(start.getDate() + i);
      return { year: dt.getFullYear(), month: dt.getMonth(), day: dt.getDate(), out: false };
    });
  }, [selected]);

  const cells = view === "WEEK" ? weekCells : monthCells;
  // Rows track the actual weeks the month spans (4–6) so short months don't
  // leave an empty band at the bottom.
  const rows = view === "WEEK" ? 1 : cells.length / 7;
  const weekStart = weekCells[0], weekEnd = weekCells[6];

  // ---- actions --------------------------------------------------------------
  // ‹ › step by month in MONTH view, by week in WEEK view — so the arrows
  // always move whatever unit you're looking at.
  const step = (delta) => {
    if (view === "WEEK") {
      const d = new Date(selected.year, selected.month, selected.day + delta * 7);
      const next = { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
      setSelected(next);
      setCursor({ year: next.year, month: next.month });
    } else {
      const d = new Date(year, month + delta, 1);
      setCursor({ year: d.getFullYear(), month: d.getMonth() });
    }
  };
  const pickDay = (c) => {
    // Clicking the already-active day toggles the day panel off (back to the
    // upcoming overview); clicking any other day selects it.
    if (daySelected && sameDay(c, selected)) {
      setDaySelected(false);
      return;
    }
    setSelected({ year: c.year, month: c.month, day: c.day });
    setDaySelected(true);
    if (c.out) setCursor({ year: c.year, month: c.month });
  };
  const openNew = () => setEditor(blankEvent(selected));
  const openEdit = (e) => setEditor({ ...e });
  const saveEvent = (form) => {
    setEvents((prev) =>
      form.id ? prev.map((e) => (e.id === form.id ? form : e)) : [...prev, { ...form, id: nextId() }]
    );
    setSelected({ year: form.year, month: form.month, day: form.day });
    setDaySelected(true);
    setCursor({ year: form.year, month: form.month });
    setEditor(null);
  };
  const deleteEvent = (id) => { setEvents((prev) => prev.filter((e) => e.id !== id)); setEditor(null); };

  const selectedEvents = eventsOn(selected.year, selected.month, selected.day);

  // "Jump to today" context: the real date it lands on, and whether we're
  // already viewing that month (so the button can describe itself).
  const todayDate = new Date(TODAY.year, TODAY.month, TODAY.day);
  const todayLabel = `${DOW[todayDate.getDay()]} ${TODAY.day} ${MON3[TODAY.month]}`;
  const jumpToToday = () => { setCursor({ year: TODAY.year, month: TODAY.month }); setSelected({ ...TODAY }); setDaySelected(true); };

  // In WEEK view the picker plate shows the visible range, e.g. "4–10 MAY" or
  // "27 APR – 3 MAY" when it straddles two months.
  const weekLabel = weekStart.month === weekEnd.month
    ? `${weekStart.day}–${weekEnd.day} ${MON3[weekStart.month]}`
    : `${weekStart.day} ${MON3[weekStart.month]} – ${weekEnd.day} ${MON3[weekEnd.month]}`;

  // Is today already on screen? If so the jump button dims to a passive label.
  const viewingToday = cells.some((c) => !c.out && sameDay(c, TODAY));

  return (
    <AppShell
      active={ROUTES.CALENDAR} onNavigate={onNavigate} user={user} fill
      icon={<CalIcon size={36} />} title="CALENDAR" subtitle="PLAN YOUR DAYS. REMEMBER WHAT MATTERS."
      action={<ActionButton icon={<Plus size={20} />} onClick={openNew}>NEW EVENT</ActionButton>}
    >
      <div className="grid h-full min-h-0 grid-cols-3 gap-4 p-4">
        {/* calendar grid */}
        <Card className="relative col-span-2 flex min-h-0 flex-col">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            {/* Month nav — every control locked to h-9 so the row reads as one
                clean band. Padding is horizontal-only; height drives sizing. */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => step(-1)} aria-label={view === "WEEK" ? "Previous week" : "Previous month"}
                className="wgt-plate flex h-9 w-9 items-center justify-center" style={{ color: C.textDark }}>
                <ChevronLeft size={17} />
              </button>
              <MonthYearPicker
                year={year} month={month} open={pickerOpen}
                subLabel={view === "WEEK" ? weekLabel : null}
                onToggle={() => setPickerOpen((o) => !o)}
                onPick={(y, m) => { setCursor({ year: y, month: m }); setPickerOpen(false); }}
                onClose={() => setPickerOpen(false)}
              />
              <button onClick={() => step(1)} aria-label={view === "WEEK" ? "Next week" : "Next month"}
                className="wgt-plate flex h-9 w-9 items-center justify-center" style={{ color: C.textDark }}>
                <ChevronRight size={17} />
              </button>
              {!viewingToday && (
                <button onClick={jumpToToday} title={`Jump to today · ${todayLabel}`}
                  className="ml-1 flex h-9 items-center gap-1 px-1.5"
                  style={{ ...pixel }}>
                  <CornerDownLeft size={14} style={{ color: C.green }} />
                  <span className="text-[16px] tracking-wide underline decoration-dotted underline-offset-4" style={{ color: C.green }}>today</span>
                </button>
              )}
            </div>
            {/* WEEK / MONTH segmented control — recessed track, gilt thumb, h-9. */}
            <div className="flex h-9 items-center gap-1 rounded-[10px] p-1"
              style={{ background: "#00000018", boxShadow: "inset 0 1px 3px #2a201030" }}>
              {["WEEK", "MONTH"].map((v) => {
                const on = view === v;
                return (
                  <button key={v} onClick={() => setView(v)}
                    className={`flex h-full items-center rounded-[7px] px-3.5 text-[19px] leading-none tracking-wide transition-colors ${on ? "wgt-plate wgt-plate-on" : "wgt-press"}`}
                    style={{ ...pixel, background: on ? C.green : "transparent", color: on ? C.textGold : C.inkSoft }}>
                    {v}
                  </button>
                );
              })}
            </div>
          </div>

          {/* The diary sheet: ruled paper, days as margin-numbered rows. */}
          <div className="wgt-diary grid min-h-0 flex-1 overflow-hidden rounded-[6px]"
            style={{
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gridTemplateRows: `auto repeat(${rows}, minmax(0, 1fr))`,
              border: `1px solid ${C.line}55`,
              boxShadow: "inset 0 2px 10px #2a20101f, 0 1px 0 #ffffff30",
            }}>
            {DOW.map((d, i) => {
              const weekend = i === 0 || i === 6;
              return (
                <div key={d} style={{ ...pixel, borderBottom: `1.5px solid ${C.ink}33`, borderRight: `1px solid ${C.line}1f` }}
                  className="pb-1 pt-1.5 text-center text-[13px] tracking-[0.3em]">
                  <span style={{ color: weekend ? C.ink : C.inkSoft }}>{d}</span>
                </div>
              );
            })}
            {cells.map((c, i) => {
              const dayEvents = eventsOn(c.year, c.month, c.day);
              const isToday = sameDay(c, TODAY);
              const isSel = daySelected && sameDay(c, selected);
              const inWeek = !isSel && weekStart && sameWeek(c, selected);
              const showCount = view === "MONTH" ? 3 : 12; // week rows are taller
              return (
                <button key={i} onClick={() => pickDay(c)}
                  className={`wgt-diary-day relative flex min-h-0 flex-col overflow-hidden px-1.5 pb-1 pt-1 text-left ${c.out ? "is-out" : ""} ${isSel ? "is-sel" : ""} ${inWeek ? "is-week" : ""}`}>
                  <div className="flex shrink-0 items-baseline gap-1">
                    <span style={pixel}
                      className={`wgt-diary-num text-[20px] leading-none ${isToday ? "wgt-ink-ring" : ""}`}>
                      <span style={{ color: c.out ? undefined : C.ink }}>{c.day}</span>
                    </span>
                    {view === "MONTH" && dayEvents.length > showCount && (
                      <span style={pixel} className="ml-auto text-[12px]"><span style={{ color: C.inkSoft }}>{dayEvents.length} entries</span></span>
                    )}
                  </div>

                  {/* Penned entries — just a category tick + the event name.
                      Times live in the day panel on the right. */}
                  <div className="mt-0.5 flex min-h-0 flex-1 flex-col gap-px overflow-hidden">
                    {dayEvents.slice(0, showCount).map((e) => (
                      <span key={e.id} role="button" tabIndex={0}
                        onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                        onKeyDown={(ev) => { if (ev.key === "Enter") { ev.stopPropagation(); openEdit(e); } }}
                        className="wgt-entry shrink-0" title={`${e.time} ${e.name}`}>
                        <span className="wgt-entry-tick" style={{ background: CAT[e.cat].color }} />
                        <span style={pixel} className="truncate text-[14px] leading-tight" ><span style={{ color: C.ink }}>{e.name}</span></span>
                      </span>
                    ))}
                    {dayEvents.length > showCount && (
                      <span style={pixel} className="mt-px shrink-0 pl-2 text-[12px] leading-none" >
                        <span style={{ color: C.inkSoft }}>…{dayEvents.length - showCount} more</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Margin column — two equal halves filling the calendar height: the
            selected day's timeline on top, the upcoming overview below. */}
        <div className="grid min-h-0 grid-rows-2 gap-4 px-1 pb-1 pt-2">
          <DaySlip
            active={daySelected} selected={selected} events={selectedEvents}
            onAdd={openNew} onEdit={openEdit}
          />
          <HorizonSlip
            items={upcomingFrom(events, TODAY)}
            onPick={(e) => { setSelected({ year: e.year, month: e.month, day: e.day }); setDaySelected(true); setCursor({ year: e.year, month: e.month }); }}
          />
        </div>
      </div>

      {editor && (
        <EventEditor
          value={editor}
          onChange={setEditor}
          onSave={saveEvent}
          onDelete={deleteEvent}
          onClose={() => setEditor(null)}
        />
      )}
    </AppShell>
  );
}

// Normalize spill cells whose month index went below 0 / above 11.
function normalizeMY(c) {
  const dt = new Date(c.year, c.month, c.day);
  return { year: dt.getFullYear(), month: dt.getMonth(), day: dt.getDate(), out: c.out };
}

function blankEvent(sel) {
  return { id: null, year: sel.year, month: sel.month, day: sel.day, name: "", time: "08:00", cat: "field", location: "" };
}

// Events on or after `from`, chronologically (the half scrolls if long).
function upcomingFrom(events, from) {
  const fromVal = new Date(from.year, from.month, from.day).getTime();
  return events
    .filter((e) => new Date(e.year, e.month, e.day).getTime() >= fromVal)
    .sort((a, b) => {
      const da = new Date(a.year, a.month, a.day) - new Date(b.year, b.month, b.day);
      return da !== 0 ? da : a.time.localeCompare(b.time);
    })
    .slice(0, 8);
}

// Top half of the margin column. When a day is active it shows that day's
// schedule as a vertical timeline (with times); otherwise a quiet prompt.
function DaySlip({ active, selected, events, onAdd, onEdit }) {
  const dt = new Date(selected.year, selected.month, selected.day);
  const isToday = sameDay(selected, TODAY);
  return (
    <div className="wgt-slip flex min-h-0 flex-col px-4 pb-3 pt-5">
      <span className="wgt-slip-pin" aria-hidden />

      {!active ? (
        // No day picked — invite one. Upcoming lives in the half below.
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <CalIcon size={26} style={{ color: C.inkSoft }} />
          <p style={pixel} className="mt-2 text-[17px] leading-snug"><span style={{ color: C.ink }}>Pick a day</span></p>
          <p style={pixel} className="mt-0.5 text-[14px] leading-snug"><span style={{ color: C.inkSoft }}>to see its schedule here</span></p>
        </div>
      ) : (
        <>
          {/* Date line + add. */}
          <div className="mb-2 flex shrink-0 items-end justify-between gap-2"
            style={{ borderBottom: `1px solid ${C.ink}22`, paddingBottom: 7 }}>
            <div className="leading-none">
              <div style={pixel} className="text-[13px] tracking-[0.25em]">
                <span style={{ color: isToday ? C.green : C.inkSoft }}>{isToday ? "TODAY · " : ""}{DOW[dt.getDay()]}</span>
              </div>
              <div style={pixel} className="mt-1 text-[26px] leading-none">
                <span style={{ color: C.ink }}>{ordinal(selected.day)} {MON3[selected.month]}</span>
              </div>
            </div>
            <button onClick={onAdd} title="Add an entry" className="flex h-8 items-center gap-1 px-2" style={{ ...pixel }}>
              <Plus size={15} style={{ color: C.green }} />
              <span className="text-[15px] underline decoration-dotted underline-offset-4" style={{ color: C.green }}>add</span>
            </button>
          </div>

          {events.length === 0 ? (
            <div className="flex flex-1 items-center">
              <p style={pixel} className="text-[16px] italic"><span style={{ color: C.inkSoft }}>— nothing logged for this day —</span></p>
            </div>
          ) : (
            // Vertical timeline: a rule runs down the times, each entry a node.
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5"
              style={{ marginLeft: 2 }}>
              {events.map((e, i) => (
                <li key={e.id} className="relative flex gap-3"
                  style={{ paddingLeft: 2 }}>
                  {/* connector rail */}
                  {i < events.length - 1 && (
                    <span className="absolute" style={{ left: 60, top: 14, bottom: -8, width: 2, background: `${C.line}55` }} />
                  )}
                  <span style={pixel} className="w-12 shrink-0 pt-px text-right text-[16px] leading-none">
                    <span style={{ color: C.inkSoft }}>{e.time}</span>
                  </span>
                  <span className="relative z-10 mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ background: CAT[e.cat].color, boxShadow: `0 0 0 3px ${C.cardLight}, 0 0 0 4px ${CAT[e.cat].color}44` }} />
                  <button onClick={() => onEdit(e)} className="group min-w-0 flex-1 text-left">
                    <span style={pixel} className="block truncate text-[18px] leading-tight">
                      <span style={{ color: C.ink }}>{e.name}</span>
                      <Pencil size={12} className="ml-1.5 inline opacity-0 transition-opacity group-hover:opacity-100" style={{ color: C.inkSoft }} />
                    </span>
                    {e.location && (
                      <span style={pixel} className="mt-0.5 flex items-center gap-1 text-[14px]">
                        <MapPin size={12} style={{ color: C.inkSoft }} /><span style={{ color: C.inkSoft }}>{e.location}</span>
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// "On the horizon" — the next handful of events, listed like a watch-bill.
function HorizonSlip({ items, onPick }) {
  return (
    <div className="wgt-slip flex min-h-0 flex-col px-4 pb-3 pt-5">
      <span className="wgt-slip-pin" aria-hidden style={{ left: "auto", right: 22, background: "radial-gradient(circle at 35% 30%, #6f8f3f, #3d4a2a)" }} />
      <div style={pixel} className="mb-2.5 shrink-0 text-[14px] tracking-[0.25em]">
        <span style={{ color: C.inkSoft }}>ON THE HORIZON</span>
      </div>
      {items.length === 0 ? (
        <p style={pixel} className="text-[16px] italic"><span style={{ color: C.inkSoft }}>Clear skies ahead — enjoy the breather.</span></p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
          {items.map((e) => (
            <li key={e.id}>
              <button onClick={() => onPick(e)} className="group flex w-full items-baseline gap-2 text-left">
                <span style={pixel} className="w-14 shrink-0 text-[15px] leading-none">
                  <span style={{ color: C.inkSoft }}>{e.day} {MON3[e.month]}</span>
                </span>
                <span className="h-[7px] w-[7px] shrink-0 self-center rounded-[2px]" style={{ background: CAT[e.cat].color }} />
                <span style={pixel} className="min-w-0 flex-1 truncate text-[16px] leading-tight transition-colors group-hover:underline group-hover:decoration-dotted group-hover:underline-offset-4">
                  <span style={{ color: C.ink }}>{e.name}</span>
                </span>
                <span style={pixel} className="shrink-0 text-[14px]"><span style={{ color: C.inkSoft }}>{e.time}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The month plate plus its popover picker. Clicking the plate toggles a panel
// with a year stepper and a 4×3 grid of months — flipping the year commits
// nothing until a month is clicked. Closes on outside click or Escape.
function MonthYearPicker({ year, month, open, subLabel, onToggle, onPick, onClose }) {
  const [viewYear, setViewYear] = useState(year);
  const ref = useRef(null);

  // Re-sync the panel's year to the live month whenever it (re)opens.
  useEffect(() => { if (open) setViewYear(year); }, [open, year]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDocDown); document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  return (
    <div ref={ref} className="relative">
      <button onClick={onToggle} aria-haspopup="dialog" aria-expanded={open}
        className="wgt-plate wgt-plate-dark flex h-9 items-center gap-2 px-3.5"
        style={{ background: C.bgHeader }}>
        <span style={pixel} className="whitespace-nowrap text-[19px] leading-none tracking-wide">
          <span style={{ color: C.gold }}>{subLabel || `${MON3[month]} ${year}`}</span>
        </span>
        <ChevronDown size={14} style={{ color: C.textGold + "cc", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.18s ease" }} />
      </button>

      {open && (
        <div role="dialog" aria-label="Pick month and year"
          className="wgt-pop absolute left-0 top-full z-30 mt-2 w-[268px] overflow-hidden rounded-[12px]"
          style={{
            border: `1px solid ${C.gold}55`,
            background: C.cardLight,
            backgroundImage: "linear-gradient(180deg, #ffffff20 0%, #ffffff00 30%)",
            boxShadow: "inset 0 1px 0 #ffffff40, 0 18px 44px -8px #00000060, 0 0 0 1px #00000018",
          }}>
          {/* Year header — large year flanked by quiet steppers, gilt underline. */}
          <div className="flex items-center justify-between px-3 pb-2.5 pt-3"
            style={{ borderBottom: `1px solid ${C.line}33`, background: "linear-gradient(180deg, #ffffff14, #ffffff00)" }}>
            <button onClick={() => setViewYear((y) => y - 1)} aria-label="Previous year"
              className="wgt-plate flex h-8 w-8 items-center justify-center" style={{ background: C.cardInner, color: C.textDark }}>
              <ChevronLeft size={16} />
            </button>
            <div className="text-center leading-none">
              <span style={pixel} className="block text-[12px] tracking-[0.3em]"><span style={{ color: C.ink }}>YEAR</span></span>
              <span style={pixel} className="block text-[28px] leading-none"><span style={{ color: C.ink }}>{viewYear}</span></span>
            </div>
            <button onClick={() => setViewYear((y) => y + 1)} aria-label="Next year"
              className="wgt-plate flex h-8 w-8 items-center justify-center" style={{ background: C.cardInner, color: C.textDark }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Month grid — compact chips; current real month carries a "now" dot,
              the active selection gets the gilt-lit plate. */}
          <div className="grid grid-cols-4 gap-1 p-2.5">
            {MON3.map((m, i) => {
              const on = i === month && viewYear === year;
              const isNow = i === TODAY.month && viewYear === TODAY.year;
              return (
                <button key={m} onClick={() => onPick(viewYear, i)}
                  className={`relative rounded-[7px] py-1.5 text-[16px] tracking-wide transition-colors ${on ? "wgt-plate wgt-plate-on" : "wgt-press"}`}
                  style={{ ...pixel, background: on ? C.green : "#00000010", color: on ? C.textGold : C.ink }}>
                  {m}
                  {isNow && !on && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full"
                      style={{ background: C.gold, boxShadow: `0 0 5px ${C.gold}` }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Create / edit modal. Controlled by the `value` form object held in the page.
function EventEditor({ value, onChange, onSave, onDelete, onClose }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const valid = value.name.trim() && value.time;
  const dateStr = `${value.year}-${String(value.month + 1).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSave({ ...value, name: value.name.trim(), location: value.location.trim() });
  };

  return (
    <div className="wgt-modal-overlay" onMouseDown={onClose}>
      <form onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}
        className="wgt-modal w-[420px] max-w-[92vw] overflow-hidden rounded-[14px] p-4"
        style={{
          border: `1px solid ${C.gold}66`,
          background: C.cardLight,
          backgroundImage: "linear-gradient(180deg, #ffffff20 0%, #ffffff00 24%)",
        }}>
        <div className="mb-3 flex items-center justify-between">
          <span style={pixel} className="text-[26px]"><span style={{ color: C.textDark }}>{value.id ? "EDIT EVENT" : "NEW EVENT"}</span></span>
          <button type="button" onClick={onClose} aria-label="Close"
            className="wgt-press rounded-md p-1" style={{ color: C.textDark }}>
            <X size={20} />
          </button>
        </div>

        <Field label="NAME">
          <input autoFocus value={value.name} onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Live Firing" className="wgt-input" />
        </Field>

        <div className="flex gap-2">
          <Field label="DATE" className="flex-1">
            <input type="date" value={dateStr}
              onChange={(e) => { const [y, m, d] = e.target.value.split("-").map(Number); if (y) set({ year: y, month: m - 1, day: d }); }}
              className="wgt-input" />
          </Field>
          <Field label="TIME" className="w-[120px]">
            <input type="time" value={value.time} onChange={(e) => set({ time: e.target.value })} className="wgt-input" />
          </Field>
        </div>

        <Field label="CATEGORY">
          <div className="flex flex-wrap gap-1.5">
            {CAT_KEYS.map((k) => {
              const on = value.cat === k;
              return (
                <button type="button" key={k} onClick={() => set({ cat: k })}
                  className={`flex items-center gap-1 px-2.5 py-1 ${on ? "wgt-plate wgt-plate-on" : "wgt-plate"}`}
                  style={{ background: on ? CAT[k].color : C.cardInner, color: on ? "#f3e7cf" : C.textDark }}>
                  <span className="text-sm leading-none">{CAT[k].icon}</span>
                  <span style={pixel} className="text-[14px]">{CAT[k].label}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="LOCATION">
          <input value={value.location} onChange={(e) => set({ location: e.target.value })}
            placeholder="e.g. Parade Square" className="wgt-input" />
        </Field>

        <div className="mt-4 flex items-center gap-2">
          {value.id && (
            <button type="button" onClick={() => onDelete(value.id)}
              className="wgt-plate flex items-center gap-1 px-3 py-1.5"
              style={{ background: C.cardInner, color: "#a63d2f" }}>
              <Trash2 size={15} /><span style={pixel} className="text-[16px]">DELETE</span>
            </button>
          )}
          <button type="button" onClick={onClose}
            className="wgt-plate ml-auto px-4 py-1.5"
            style={{ ...pixel, background: C.cardInner, color: C.textDark, fontSize: 16 }}>
            CANCEL
          </button>
          <button type="submit" disabled={!valid}
            className={`px-5 py-1.5 ${valid ? "wgt-plate wgt-plate-on" : ""}`}
            style={{ ...pixel, background: valid ? C.green : C.line, color: C.textGold, fontSize: 16, opacity: valid ? 1 : 0.55, borderRadius: 9 }}>
            SAVE
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, className = "", children }) {
  return (
    <label className={`mb-2 block ${className}`}>
      <span style={pixel} className="mb-1 block text-[15px] tracking-[0.12em]"><span style={{ color: C.ink }}>{label}</span></span>
      {children}
    </label>
  );
}
