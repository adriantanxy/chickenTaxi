/**
 * SquadPage.jsx — roster of companies → sections → soldiers, with a rich
 * detail panel on the right. Built to match the squad mockup: a connected
 * tab-strip on top of the roster card, a parchment COMMANDER card with a side
 * note box, two sections shown at once (paginated 2 sections/page), and a
 * detail panel with strengths, recent memories and quick actions.
 *
 * The page is allowed to scroll when taller than the viewport (per the mockup).
 *
 * Surfaces use the aged leather / parchment board art (9-slice frames in
 * assets.js). The taped scrap is painted as a background image, not a
 * frame, so its tape corners stay intact and text fits inside the parchment.
 * Portraits, badge icons and memory photos are still emoji / coloured
 * placeholders, seated on board tiles until real art exists.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Users, Plus, Search, SlidersHorizontal, Star, ChevronDown,
  ChevronLeft, ChevronRight, Heart, Bookmark, MapPin,
  MessageSquare, Tag, NotebookPen, Target, ShieldCheck, Handshake,
  UsersRound, Medal,
} from "lucide-react";
import { AppShell, ActionButton, Frame } from "../ui";
import { ASSETS } from "../assets";
import { ROUTES } from "../routes";
import { C, pixel, D, M, USER as user } from "../theme";

const PLATOON_SLOTS = 2;
const SCRAP = ASSETS.commonBoards.tapedScrap;

// ---- Mock data -------------------------------------------------------------
// Shaped for a later API: COMPANIES → platoons → soldiers. ALPHA is fully
// populated to match the mockup; the others are light so tab-switching works.

const STRENGTHS = {
  focused: { label: "FOCUSED", Icon: Target },
  disciplined: { label: "DISCIPLINED", Icon: ShieldCheck },
  reliable: { label: "RELIABLE", Icon: Handshake },
  teamPlayer: { label: "TEAM PLAYER", Icon: UsersRound },
};

function soldier(name, trait, extra = {}) {
  return {
    id: name,
    name,
    trait,
    role: "RIFLEMAN",
    sex: "M",
    star: true,
    blurb: "Always locked in and gets the mission done. A quiet leader in the field.",
    strengths: [STRENGTHS.focused, STRENGTHS.disciplined, STRENGTHS.reliable, STRENGTHS.teamPlayer],
    memories: [
      { title: "Good first day in camp.", place: "OUTFIELD", date: "20 MAY 2024", count: "+12", star: true, type: "camp" },
      { title: "POP Day", place: "POP PARADE", date: "08 SEP 2024", count: "+30", type: "parade" },
      { title: "First Route March!", place: "ROUTE MARCH", date: "18 MAY 2024", count: "+20", type: "march" },
    ],
    ...extra,
  };
}

const COMPANIES = [
  {
    id: "ALPHA",
    commander: {
      name: "LTC LIM",
      blurb: "Leads by example.",
      note: ["DISCIPLINE TODAY.", "STRENGTH TOMORROW."],
    },
    platoons: [
      {
        name: "PLATOON 1",
        platoon: 1,
        section: 1,
        members: [
          soldier("JAYDEN", "FOCUS."),
          soldier("AIDEN", "CONSISTENT."),
          soldier("ZHI HAO", "STEADY."),
          soldier("SHAHRUL", "RELIABLE."),
          soldier("MARCUS", "LOYAL."),
          soldier("NICHOLAS", "SHARP."),
          soldier("HAFIZ", "READY."),
          soldier("CLARENCE", "CALM."),
        ],
      },
      {
        name: "PLATOON 2",
        platoon: 2,
        section: 1,
        members: [
          soldier("ETHAN", "HUMBLE."),
          soldier("BRANDON", "HARDWORKING."),
          soldier("JOSHUA", "RESILIENT."),
          soldier("DANIEL", "DETERMINED."),
          soldier("MIGUEL", "ADAPTABLE."),
          soldier("RAHUL", "BRAVE."),
          soldier("KEITH", "PRECISE."),
          soldier("FARHAN", "STEADFAST."),
        ],
      },
      {
        name: "PLATOON 3",
        platoon: 3,
        section: 1,
        members: [
          soldier("RYAN", "SHARP."),
          soldier("KAI", "CALM."),
          soldier("WEI JIE", "TOUGH."),
        ],
      },
      {
        name: "PLATOON 4",
        platoon: 4,
        section: 1,
        members: [
          soldier("FAIZAL", "BOLD."),
          soldier("DARREN", "PATIENT."),
        ],
      },
    ],
  },
  {
    id: "BRAVO",
    commander: { name: "MAJ TAN", blurb: "Lead from the front.", note: ["STAY SHARP.", "STAY READY."] },
    platoons: [
      { name: "PLATOON 1", platoon: 1, section: 1, members: [soldier("HAKIM", "DRIVEN."), soldier("LEON", "ALERT.")] },
    ],
  },
  {
    id: "CHARLIE",
    commander: { name: "CPT WONG", blurb: "Train hard, fight easy.", note: ["EARN IT.", "EVERY DAY."] },
    platoons: [
      { name: "PLATOON 1", platoon: 1, section: 1, members: [soldier("ARJUN", "STEADY."), soldier("CALEB", "FOCUSED.")] },
    ],
  },
  {
    id: "DELTA",
    commander: { name: "CPT NG", blurb: "No one left behind.", note: ["ONE TEAM.", "ONE FIGHT."] },
    platoons: [
      { name: "PLATOON 1", platoon: 1, section: 1, members: [soldier("IRFAN", "LOYAL."), soldier("SAMUEL", "READY.")] },
    ],
  },
];

function firstMemberOf(companyOrPlatoons) {
  const platoons = Array.isArray(companyOrPlatoons) ? companyOrPlatoons : companyOrPlatoons?.platoons;
  return platoons?.find((platoon) => platoon.members.length > 0)?.members[0] ?? null;
}

function memberUnit(company, memberId) {
  const platoon = company.platoons.find((p) => p.members.some((member) => member.id === memberId));
  if (!platoon) return company.id;
  return `${company.id} ${platoon.platoon}-${platoon.section}`;
}

// ---- Shared bits -----------------------------------------------------------

function Caption({ children, className = "" }) {
  return <p style={{ ...pixel, ...M }} className={`text-[13px] tracking-wide ${className}`}>{children}</p>;
}

// A divider styled like the mockup's "— LABEL ----" section rule.
function SectionRule({ children, actions = null, compact = false }) {
  return (
    <div className={`${compact ? "mb-1" : "mb-2"} flex items-center gap-2`}>
      <span style={{ ...pixel, ...M }} className="shrink-0 text-[14px] tracking-wide">- {children}</span>
      <span className="h-px flex-1" style={{ background: C.line + "55" }} />
      {actions}
    </div>
  );
}

// Taped parchment scrap as a full-bleed background so the tape stays
// in its corners; text is padded into the parchment area.
function TapedScrap({ children, className = "", style = {}, size = "100% 100%" }) {
  return (
    <div
      className={className}
      style={{
        backgroundImage: `url(${SCRAP})`,
        backgroundSize: size,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SoldierPortrait({ size = 78, framed = false, star = false, className = "" }) {
  const image = (
    <div
      className="relative overflow-hidden"
      style={{
        width: size,
        height: size,
        filter: framed ? "none" : "drop-shadow(0 3px 1px #00000045)",
      }}
    >
      <img
        src={ASSETS.brand.logo}
        alt=""
        draggable="false"
        className="pointer-events-none absolute max-w-none select-none"
        style={{
          height: size * 1.65,
          left: "50%",
          top: -size * 0.13,
          transform: "translateX(-50%)",
          imageRendering: "pixelated",
        }}
      />
      {star && (
        <Star
          size={Math.max(14, size * 0.18)}
          className="absolute right-1 top-1 fill-current"
          style={{ color: C.gold, filter: "drop-shadow(0 1px 1px #0008)" }}
        />
      )}
    </div>
  );

  if (!framed) {
    return <div className={`relative flex items-center justify-center ${className}`}>{image}</div>;
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-sm ${className}`}
      style={{
        width: size + 12,
        height: size + 12,
        background: "#efe6d3",
        border: "2px solid #fff6dd",
        boxShadow: `0 1px 0 #fff8 inset, 0 0 0 1px ${C.line}66, 0 3px 5px #00000030`,
      }}
    >
      {image}
    </div>
  );
}

function HelmetPatch({ size = 92, className = "" }) {
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size * 0.72 }}>
      <span
        className="absolute left-[8%] top-[16%] block"
        style={{
          width: size * 0.78,
          height: size * 0.46,
          borderRadius: "52% 48% 38% 40%",
          background: "radial-gradient(circle at 30% 18%, #6d7c47 0 17%, transparent 18%), linear-gradient(145deg, #73834f 0%, #43502f 62%, #28301d 100%)",
          boxShadow: "inset -7px -7px 0 #20281766, inset 4px 4px 0 #9aaa6888, 0 4px 0 #1b2114",
          transform: "rotate(-10deg)",
        }}
      />
      <span
        className="absolute block"
        style={{
          left: size * 0.15,
          top: size * 0.47,
          width: size * 0.74,
          height: size * 0.12,
          borderRadius: 999,
          background: "#26311f",
          boxShadow: "0 2px 0 #6d7c47",
          transform: "rotate(-10deg)",
        }}
      />
      <span
        className="absolute block"
        style={{
          left: size * 0.5,
          top: size * 0.58,
          width: size * 0.17,
          height: size * 0.22,
          borderRadius: 3,
          border: `3px solid ${C.inkSoft}`,
          borderTop: 0,
          transform: "rotate(-8deg)",
        }}
      />
    </div>
  );
}

function MemberCard({ m, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wgt-press min-w-0 text-center "
      aria-pressed={active}
    >
      <Frame
        frame="parchmentWide"
        border={16}
        className="flex min-h-[126px] flex-col items-center justify-end gap-0.5 px-2 py-4 -my-2"
        style={{
          outline: active ? `2px solid ${C.gold}` : "none",
          outlineOffset: -3,
          filter: active ? "brightness(1.04)" : undefined,
        }}
      >
        <SoldierPortrait size={62} star={m.star} />
        <p style={{ ...pixel, ...D }} className="mt-0.5 w-full truncate text-[17px] leading-none">{m.name}</p>
        <p style={{ ...pixel, ...M }} className="w-full truncate text-[14px] leading-none">{m.trait}</p>
      </Frame>
    </button>
  );
}

// ---- Top bar (filter row) --------------------------------------------------

function companyLabel(id) {
  return id.split(" ")[0];
}

function FilterRow({ query, onQuery, activeCompany, onCompanySelect }) {
  return (
    <div className="flex min-w-0 items-center gap-3 ">
      <CompanyTabs active={activeCompany} onSelect={onCompanySelect} />
      <Frame
        frame="search"
        border={20}
        className="flex h-[68px] min-w-0 flex-1 items-center gap-2 px-5"
      >
        <Search size={20} className="shrink-0" style={{ color: C.textGold }} />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search by name or role..."
          className="w-full bg-transparent outline-none placeholder:opacity-60"
          style={{ ...pixel, color: C.textGold, fontSize: 20 }}
        />
      </Frame>
    </div>
  );
}

// ---- Connected tab-strip ---------------------------------------------------
// Tabs sit as a header row; the active tab is green and merges into the roster
// card below it (no gap, shared edge).

function CompanyTabs({ active, onSelect }) {
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {COMPANIES.map((c) => {
        const on = c.id === active;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className="wgt-press relative flex h-[58px] min-w-[88px] items-center justify-center px-3"
            style={{
              ...pixel,
              fontSize: 18,
              color: on ? C.textGold : C.inkSoft,
              backgroundImage: `url(${on ? ASSETS.frames.greenWide.src : ASSETS.frames.leatherWide.src})`,
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
              imageRendering: "pixelated",
            }}
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              {companyLabel(c.id)}
              
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---- Commander (parchment card + side note) --------------------------------

function CommanderBlock({ commander }) {
  return (
    <div className="mx-4 mt-4 mb-1">
      <SectionRule>COMMANDER</SectionRule>
      <Frame frame="parchmentWide" border={12} className="relative">
        {/* Gold star pinned top-right of the commander card */}
        <Star size={24} className="absolute right-3 top-3 fill-current" style={{ color: C.gold }} />
        <div className="flex min-h-[96px] flex-wrap items-center gap-4 px-1 py-1">
          <SoldierPortrait size={76} framed />
          <div className="min-w-[132px]">
            <p style={{ ...pixel, ...D }} className="text-[27px] leading-none">{commander.name}</p>
            <p style={{ ...pixel, ...M }} className="mt-1 max-w-[132px] text-[18px] leading-[1]">{commander.blurb}</p>
          </div>
          {/* Note box beside the name */}
          <div
            className="min-w-[205px] rounded-md px-4 py-2"
            style={{ background: C.cardLight, border: `1px solid ${C.line}55`, boxShadow: "inset 0 1px 0 #fff5" }}
          >
            {commander.note.map((line, i) => (
              <p key={i} style={{ ...pixel, ...D }} className="flex items-center gap-1 text-[18px] leading-tight">
                {line}
                {i === commander.note.length - 1 && <Heart size={11} className="text-red-700" />}
              </p>
            ))}
          </div>
        </div>
      </Frame>
    </div>
  );
}

// ---- Detail panel ----------------------------------------------------------

function StrengthBadge({ s }) {
  const Icon = s.Icon;
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-sm px-1 py-2"
      style={{ border: `1px solid ${C.line}33`, background: "#e2c7a1aa" }}
    >
      <Icon size={28} strokeWidth={2.5} style={{ color: C.ink }} />
      <span style={{ ...pixel, ...M }} className="text-center text-[12px] leading-tight">{s.label}</span>
    </div>
  );
}

function MemoryThumb({ type }) {
  const scenes = {
    camp: "linear-gradient(180deg, #17213a 0%, #253252 48%, #2e2b1e 49%, #17180f 100%)",
    parade: "linear-gradient(180deg, #8ea3a3 0%, #c8a870 55%, #6f6e3f 56%, #2f3b24 100%)",
    march: "linear-gradient(180deg, #d08f55 0%, #704d35 45%, #384223 46%, #17180f 100%)",
  };
  return (
    <div
      className="relative h-[54px] w-[78px] shrink-0 overflow-hidden rounded-sm"
      style={{
        background: scenes[type] ?? scenes.camp,
        border: `2px solid ${C.line}55`,
        boxShadow: "inset 0 0 0 1px #fff3, 0 2px 3px #0002",
      }}
    >
      <span className="absolute left-[14px] top-[12px] h-1 w-1 rounded-full bg-[#f6e7a5]" />
      <span className="absolute left-[28px] top-[8px] h-1 w-1 rounded-full bg-[#f6e7a5]" />
      <span className="absolute bottom-[12px] left-[18px] h-[20px] w-[8px] rounded-t-full bg-[#28351f]" />
      <span className="absolute bottom-[12px] left-[34px] h-[22px] w-[9px] rounded-t-full bg-[#28351f]" />
      <span className="absolute bottom-[12px] left-[52px] h-[18px] w-[8px] rounded-t-full bg-[#28351f]" />
      <span className="absolute bottom-[8px] right-[20px] h-[13px] w-[13px] rounded-full bg-[#e58a2f]" />
      <span className="absolute bottom-[12px] right-[23px] h-[22px] w-[7px] rotate-45 bg-[#ffd36a]" />
      <span className="absolute bottom-[12px] right-[23px] h-[22px] w-[7px] -rotate-45 bg-[#ffd36a]" />
    </div>
  );
}

function PeopleTrail() {
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {[0, 1, 2].map((n) => (
        <span
          key={n}
          className="inline-block h-3 w-3 rounded-full"
          style={{ background: C.green, boxShadow: `inset 0 0 0 1px ${C.gold}66` }}
        />
      ))}
    </span>
  );
}

function MemoryRow({ mem }) {
  return (
    <div
      className="flex items-center gap-2 rounded-sm px-2 py-1"
      style={{ background: C.cardLight, border: `1px solid ${C.line}22` }}
    >
      <MemoryThumb type={mem.type} />
      <div className="min-w-0 flex-1 leading-tight">
        <p style={{ ...pixel, ...D }} className="flex items-center gap-1 text-[16px]">
          <span className="truncate">{mem.title}</span>
          {mem.star && <Star size={12} className="shrink-0 fill-current" style={{ color: C.gold }} />}
        </p>
        <p style={{ ...pixel, ...M }} className="flex items-center gap-1 text-[12px]">
          <MapPin size={10} /> {mem.place}
        </p>
        <p style={{ ...pixel, ...M }} className="flex items-center gap-2 text-[12px]">
          <span>{mem.date}</span>
          <PeopleTrail />
          <span>{mem.count}</span>
        </p>
      </div>
      <Bookmark size={16} style={M} className="shrink-0 self-start" />
    </div>
  );
}

function QuickAction({ icon, children }) {
  return (
    <button
      type="button"
      className="wgt-press flex flex-1 items-center justify-center gap-1.5 rounded-sm px-1 py-1"
      style={{ background: C.cardLight, border: `1px solid ${C.line}55` }}
    >
      {icon}
      <span style={{ ...pixel, ...D }} className="whitespace-nowrap text-[13px]">{children}</span>
    </button>
  );
}

function DetailPanel({ sel, unit, className = "", border = 60, style = {} }) {
  return (
    <Frame
      frame="squadCardTall"
      border={border}
      className={`flex h-full max-h-full min-h-0 flex-col gap-1 self-start px-5 py-0 ${className}`}
      style={style}
    >
      {!sel ? (
        <div className="flex min-h-[520px] flex-col items-center justify-center gap-3 text-center">
          <Medal size={54} style={{ color: C.gold }} />
          <p style={{ ...pixel, ...D }} className="px-6 text-[22px] leading-snug">
            Select someone to learn more about them!
          </p>
        </div>
      ) : (
        <>
          {/* Header: name+star top-left, avatar top-right */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p style={{ ...pixel, ...D }} className="flex items-center gap-2 text-[27px] leading-none">
                <Star size={18} className="fill-current" style={{ color: C.gold }} />
                <span className="truncate">{sel.name}</span>
              </p>
              <p style={{ ...pixel, ...M }} className="mt-2 flex items-center gap-1 text-[16px]">
                {unit} · {sel.role} {sel.sex}
              </p>
            </div>
            <SoldierPortrait size={86} className="shrink-0" />
          </div>
          <span className="h-px w-full" style={{ background: C.line + "55" }} />

          {/* Taped blurb quote — bio scrap as background, text padded inside */}
          <div className="px-4 py-5">
            <p style={{ ...pixel, ...D }} className="text-[15px] leading-[1.15]">{sel.blurb}</p>
          </div>

          {/* Strengths */}
          <div>
            <Caption className="my-0">STRENGTHS</Caption>
            <div className="flex gap-2">
              {sel.strengths.map((s) => <StrengthBadge key={s.label} s={s} />)}
            </div>
          </div>

          {/* Recent memories */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Caption>RECENT MEMORIES TOGETHER</Caption>
              <button style={{ ...pixel, color: C.inkSoft }} className="text-[12px]">VIEW ALL</button>
            </div>
            <div className="space-y-1">
              {sel.memories.map((mem) => <MemoryRow key={mem.title} mem={mem} />)}
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <Caption className="mb-2">QUICK ACTIONS</Caption>
            <div className="flex gap-2">
              <QuickAction icon={<MessageSquare size={14} style={D} />}>MESSAGE</QuickAction>
              <QuickAction icon={<Tag size={14} style={D} />}>TAG IN MEMORY</QuickAction>
              <QuickAction icon={<NotebookPen size={14} style={D} />}>ADD NOTE</QuickAction>
            </div>
          </div>
        </>
      )}
    </Frame>
  );
}

function SectionChevron({ direction, onClick }) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className="wgt-press flex h-7 w-7 items-center justify-center"
      aria-label={direction === "left" ? "Previous section" : "Next section"}
      style={{
        backgroundImage: `url(${ASSETS.frames.leatherWide.src})`,
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
      }}
    >
      <Icon size={15} style={{ color: C.textGold }} />
    </button>
  );
}

function SectionBlock({ section, memberPage = 0, onPrev, onNext, sel, onSelect }) {
  const canCycle = section.members.length > 5;
  const start = memberPage * 5;
  const members = section.members.slice(start, start + 5);

  return (
    <div className="mx-4 mb-1">
      <SectionRule
        compact
        actions={canCycle && (
          <div className="flex items-center gap-1">
            <SectionChevron direction="left" onClick={onPrev} />
            <SectionChevron direction="right" onClick={onNext} />
          </div>
        )}
      >
        {section.name}
      </SectionRule>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {members.map((m) => (
          <MemberCard key={m.id} m={m} active={sel?.id === m.id} onClick={() => onSelect(m)} />
        ))}
      </div>
    </div>
  );
}

function PageBtn({ children, active, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="wgt-press flex h-9 w-9 items-center justify-center rounded-sm disabled:opacity-40"
      style={{
        background: active ? C.green : C.cardInner,
        border: `1px solid ${active ? C.gold + "88" : C.line + "55"}`,
      }}
    >
      {children}
    </button>
  );
}

// ---- Page ------------------------------------------------------------------

export default function SquadPage({ onNavigate }) {
  const [tab, setTab] = useState(COMPANIES[0].id);
  const [query, setQuery] = useState("");
  const [sectionPage, setSectionPage] = useState(1);
  const [memberPages, setMemberPages] = useState({});
  const [sel, setSel] = useState(null);

  const company = useMemo(() => COMPANIES.find((c) => c.id === tab), [tab]);

  // Filter members within each platoon by name/role; drop emptied platoons.
  const filteredPlatoons = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return company.platoons;
    return company.platoons
      .map((s) => ({
        ...s,
        members: s.members.filter(
          (m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.members.length > 0);
  }, [company, query]);

  const platoonPageCount = Math.max(1, Math.ceil(filteredPlatoons.length / PLATOON_SLOTS));
  const safePlatoonPage = Math.min(sectionPage, platoonPageCount);
  const platoonStart = (safePlatoonPage - 1) * PLATOON_SLOTS;
  const visiblePlatoons = filteredPlatoons.slice(platoonStart, platoonStart + PLATOON_SLOTS);
  const platoonFrom = filteredPlatoons.length === 0 ? 0 : platoonStart + 1;
  const platoonTo = Math.min(platoonStart + PLATOON_SLOTS, filteredPlatoons.length);
  const selectedUnit = sel ? memberUnit(company, sel.id) : "";

  useEffect(() => {
    if (sectionPage > platoonPageCount) setSectionPage(platoonPageCount);

    const selectedStillVisible = filteredPlatoons.some((platoon) =>
      platoon.members.some((member) => member.id === sel?.id),
    );
    if (sel && !selectedStillVisible) {
      setSel(null);
    }
  }, [filteredPlatoons, sectionPage, platoonPageCount, sel?.id]);

  const cycleMembers = (sectionName, memberCount, delta) => {
    const pageCount = Math.max(1, Math.ceil(memberCount / 5));
    setMemberPages((pages) => {
      const current = pages[sectionName] ?? 0;
      return {
        ...pages,
        [sectionName]: (current + delta + pageCount) % pageCount,
      };
    });
  };

  const switchTab = (id) => {
    const nextCompany = COMPANIES.find((c) => c.id === id);
    setTab(id);
    setSectionPage(1);
    setMemberPages({});
    setSel(null);
    setQuery("");
  };

  return (
    <AppShell
      active={ROUTES.SQUAD} onNavigate={onNavigate} user={user}
      icon={<Users size={36} />} title="SQUAD" subtitle="STRONGER TOGETHER. THROUGH EVERY MISSION."
      action={<ActionButton icon={<Plus size={20} />}>ADD BUDDY</ActionButton>}
      fill
    >
      <div className="mx-auto grid h-full w-full max-w-[1760px] grid-cols-1 gap-0 overflow-y-auto p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
        {/* Left: filter row + tab-strip + roster card */}
        <div className="flex min-h-0 min-w-0 flex-col">
          <FilterRow
            query={query}
            onQuery={(v) => { setQuery(v); setSectionPage(1); setMemberPages({}); }}
            activeCompany={tab}
            onCompanySelect={switchTab}
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Frame frame="squadCard" border={12} className="flex min-h-0 flex-1 flex-col px-3 py-2">
              <CommanderBlock commander={company.commander} />

              {visiblePlatoons.length === 0 ? (
                <p style={{ ...pixel, ...M }} className="py-10 text-center text-[18px]">
                  No soldiers match "{query}".
                </p>
              ) : (
                visiblePlatoons.map((s) => (
                  <SectionBlock
                    key={s.name}
                    section={s}
                    memberPage={memberPages[s.name] ?? 0}
                    onPrev={() => cycleMembers(s.name, s.members.length, -1)}
                    onNext={() => cycleMembers(s.name, s.members.length, 1)}
                    sel={sel}
                    onSelect={setSel}
                  />
                ))
              )}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3  pb-4 px-4" style={{ borderColor: C.line + "44" }}>
                <span style={{ ...pixel, ...M }} className="text-[15px]">
                  Showing {platoonFrom}-{platoonTo} of {filteredPlatoons.length} platoons
                </span>
                <div className="flex items-center gap-2">
                  <PageBtn disabled={safePlatoonPage <= 1} onClick={() => setSectionPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft size={18} style={{ color: C.textGold }} />
                  </PageBtn>
                  {Array.from({ length: platoonPageCount }, (_, i) => i + 1).map((p) => (
                    <PageBtn key={p} active={p === safePlatoonPage} onClick={() => setSectionPage(p)}>
                      <span style={{ ...pixel, fontSize: 18, color: p === safePlatoonPage ? C.textGold : C.ink }}>{p}</span>
                    </PageBtn>
                  ))}
                  <PageBtn disabled={safePlatoonPage >= platoonPageCount} onClick={() => setSectionPage((p) => Math.min(platoonPageCount, p + 1))}>
                    <ChevronRight size={18} style={{ color: C.textGold }} />
                  </PageBtn>
                </div>
              </div>
            </Frame>
          </div>
        </div>

        {/* Right: detail panel */}
        <DetailPanel
          sel={sel}
          unit={selectedUnit}
          border={36}
          className="h-[700px] w-[360px]"
        />
      </div>
    </AppShell>
  );
}
