import { useEffect, useState } from "react";
import { ASSETS } from "./assets";
import { ROUTES } from "./routes";
import { C, pixel } from "./theme";
import {
  BookOpen,
  Calendar as CalIcon,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  User,
  Users,
} from "lucide-react";

const SIDEBAR_STORAGE_KEY = "wgt-sidebar-collapsed";

const NAV = [
  { route: ROUTES.TRAINING, label: "TRAINING", icon: <Dumbbell size={20} /> },
  { route: ROUTES.CALENDAR, label: "CALENDAR", icon: <CalIcon size={20} /> },
  { route: ROUTES.JOURNAL, label: "JOURNAL", icon: <BookOpen size={20} /> },
  { route: ROUTES.SQUAD, label: "SQUAD", icon: <Users size={20} /> },
  { route: ROUTES.PROFILE, label: "PROFILE", icon: <User size={20} /> },
];

function getInitialSidebarState() {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function Frame({ frame = "card", className = "", style = {}, children }) {
  const f = ASSETS.frames[frame];
  const art = f
    ? {
        borderStyle: "solid",
        borderWidth: f.slice,
        borderImageSource: `url(${f.src})`,
        borderImageSlice: f.slice,
        borderImageWidth: `${f.slice}px`,
        borderImageRepeat: "stretch",
        imageRendering: "pixelated",
      }
    : { background: C.cardLight, borderRadius: 16 };

  return (
    <div className={className} style={{ ...art, ...style }}>
      {children}
    </div>
  );
}

export function Sprite({ name, size = 32, fallback = "?", className = "" }) {
  const src = ASSETS.icons[name];
  if (!src) {
    return (
      <span className={className} style={{ fontSize: size * 0.85, lineHeight: 1 }}>
        {fallback}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`object-contain ${className}`}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}

export function Card({ title, action, children, className = "", frame = "card" }) {
  return (
    <Frame frame={frame} className={`p-3 ${className}`}>
      {(title || action) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          {title && <Ribbon>{title}</Ribbon>}
          {action}
        </div>
      )}
      {children}
    </Frame>
  );
}

// The green pill header used everywhere. Single source so every section title
// looks identical across pages.
export function Ribbon({ children, size = 16, color = C.textGold }) {
  return (
    <span className="inline-block rounded-md px-3 py-1" style={{ background: C.green }}>
      <span style={{ ...pixel, color }} className="tracking-wide" >
        <span style={{ fontSize: size }}>{children}</span>
      </span>
    </span>
  );
}

// The gold-bordered green call-to-action in every page header.
export function ActionButton({ icon, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="wgt-press flex shrink-0 items-center gap-2 rounded-lg border-2 px-5 py-2"
      style={{ borderColor: C.gold + "99", background: C.green, color: C.textGold }}
    >
      {icon}
      <span style={pixel} className="text-[24px]">{children}</span>
    </button>
  );
}

function NavItem({ icon, label, active, collapsed, onClick }) {
  return (
    <button
      aria-label={label}
      title={collapsed ? label : undefined}
      onClick={onClick}
      className={`group flex h-11 w-full items-center rounded-lg transition-colors duration-150 ${
        collapsed ? "justify-center px-0" : "gap-3 px-4 text-left"
      }`}
      style={active ? { background: C.green, color: C.textGold } : { color: C.textMuted }}
    >
      <span
        className="shrink-0 transition-transform duration-150 group-hover:scale-110"
        style={{ color: active ? C.textGold : undefined }}
      >
        {icon}
      </span>
      {!collapsed && (
        <span style={pixel} className="text-[18px] tracking-wide">
          {label}
        </span>
      )}
    </button>
  );
}

// Brand mark — just the art, no plate. Expanded shows the full banner
// illustration; collapsed shows a circular crop of the soldier (banner text
// cropped out so it stays legible small).
function BrandMark({ collapsed }) {
  if (collapsed) {
    return (
      <div className="mx-auto h-12 w-12 overflow-hidden rounded-full" title="Where Got Time">
        <img
          src={ASSETS.brand.logo}
          alt="Where Got Time"
          className="h-[150%] w-[150%] object-cover"
          style={{ objectPosition: "50% 18%", imageRendering: "pixelated" }}
        />
      </div>
    );
  }
  return (
    <img
      src={ASSETS.brand.logo}
      alt="Where Got Time"
      className="mx-auto h-24 object-contain"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

export function Sidebar({ active, onNavigate = () => {}, user }) {
  const [collapsed, setCollapsed] = useState(getInitialSidebarState);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore private-mode/localStorage failures; the sidebar still works.
    }
  }, [collapsed]);

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col overflow-hidden p-3 transition-[width] duration-300 ease-in-out ${
        collapsed ? "w-[84px]" : "w-[224px]"
      }`}
      style={{ background: C.sidebar, borderRight: `1px solid ${C.line}33` }}
    >
      <BrandMark collapsed={collapsed} />

      {/* Collapse control doubles as the divider: a centred chevron flanked by
          thin rules that all light up gold on hover. */}
      <button
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={() => setCollapsed((v) => !v)}
        className="group my-3 flex items-center gap-2"
      >
        <span className="h-px flex-1" style={{ background: C.line }} />
        <span
          className="shrink-0 transition-all duration-200 group-hover:scale-125"
          style={{ color: C.textGold }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </span>
        {!collapsed && (
          <span className="h-px flex-1" style={{ background: C.line }} />
        )}
      </button>

      <nav className="flex flex-col gap-1">
        {NAV.map((n) => (
          <NavItem
            key={n.label}
            {...n}
            active={active === n.route}
            collapsed={collapsed}
            onClick={() => onNavigate(n.route)}
          />
        ))}
      </nav>

      {!collapsed && (
        <div className="mt-4 rounded-md p-3 text-center" style={{ background: C.bgHeader }}>
          <p style={pixel} className="text-[13px] leading-snug" >
            Good work out there, team. Every small step builds strong soldiers.
          </p>
        </div>
      )}

      {user && (
        <div
          className={`mt-auto flex items-center rounded-md p-2 transition-colors ${collapsed ? "justify-center" : "gap-2"}`}
          style={{ background: C.bgHeader }}
          title={collapsed ? `${user.name} · ORD ${user.ordDays} DAYS` : undefined}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded" style={{ background: C.green }}>
            <User size={22} />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p style={pixel} className="truncate text-[14px]">{user.name}</p>
              <p style={{ ...pixel, color: C.textMuted }} className="truncate text-[10px]">{user.unit}</p>
              <p style={{ ...pixel, color: C.gold }} className="text-[10px]">ORD {user.ordDays} DAYS</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

// Subtle diagonal weave + vignette so the dark canvas has depth instead of a
// flat fill. Pure CSS gradients — no image assets.
const CANVAS_TEXTURE = {
  backgroundColor: C.bgDark,
  backgroundImage: `
    radial-gradient(120% 80% at 50% -10%, ${C.bgHeader}88 0%, transparent 55%),
    repeating-linear-gradient(45deg, ${C.line}0a 0px, ${C.line}0a 1px, transparent 1px, transparent 7px)`,
};

export function AppShell({ active, onNavigate, user, icon, title, subtitle, action, children }) {
  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ ...CANVAS_TEXTURE, color: C.textGold }}>
      <Sidebar active={active} onNavigate={onNavigate} user={user} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-4 px-8 py-4"
          style={{ background: C.bgHeader, borderBottom: `1px solid ${C.line}33` }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0" style={{ color: C.gold }}>
              {icon}
            </span>
            <div className="min-w-0">
              <h1 style={pixel} className="text-[44px] leading-none">{title}</h1>
              <p style={{ ...pixel, color: C.textMuted }} className="text-[16px] tracking-wide">
                {subtitle}
              </p>
            </div>
          </div>
          {action}
        </header>
        {children}
      </main>
    </div>
  );
}
