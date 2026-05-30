import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ASSETS } from "./assets";
import { ROUTES, pathToRoute } from "./routes";
import { useAppNavigate } from "./useAppNavigate";
import { C, pixel } from "./theme";
import {
  BookOpen,
  Calendar as CalIcon,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Menu,
  Star,
  User,
  Users,
  X,
} from "lucide-react";

const SIDEBAR_STORAGE_KEY = "wgt-sidebar-collapsed";
const READY_IMAGES = new Set();

const NAV = [
  { route: ROUTES.TRAINING, assetKey: "training", label: "TRAINING", icon: <Dumbbell size={20} /> },
  { route: ROUTES.CALENDAR, assetKey: "calendar", label: "CALENDAR", icon: <CalIcon size={20} /> },
  { route: ROUTES.JOURNAL, assetKey: "journal", label: "JOURNAL", icon: <BookOpen size={20} /> },
  { route: ROUTES.SQUAD, assetKey: "squad", label: "SQUAD", icon: <Users size={20} /> },
  { route: ROUTES.PROFILE, assetKey: "profile", label: "PROFILE", icon: <User size={20} /> },
];

function getInitialSidebarState() {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function useImageReady(src) {
  const [ready, setReady] = useState(() => Boolean(src && READY_IMAGES.has(src)));

  useEffect(() => {
    if (!src) {
      setReady(false);
      return undefined;
    }

    if (READY_IMAGES.has(src)) {
      setReady(true);
      return undefined;
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      READY_IMAGES.add(src);
      if (!cancelled) setReady(true);
    };
    img.onerror = () => {
      if (!cancelled) setReady(false);
    };
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return ready;
}

function getSidebarTabArt(itemKey, active, collapsed) {
  const sheet = collapsed ? ASSETS.sidebar?.navTabsClosed : ASSETS.sidebar?.navTabs;
  const item = sheet?.items?.[itemKey];
  if (!sheet || !item) return null;

  const scale = sheet.displayWidth / sheet.tabWidth;
  const defaultPosition = `${-sheet.defaultX * scale}px ${-item.y * scale}px`;
  const selectedPosition = `${-sheet.selectedX * scale}px ${-item.y * scale}px`;

  return {
    width: sheet.displayWidth,
    height: sheet.tabHeight * scale,
    style: {
      "--sidebar-tab-default-position": defaultPosition,
      "--sidebar-tab-selected-position": selectedPosition,
      "--sidebar-tab-current-position": active ? selectedPosition : defaultPosition,
      backgroundImage: `url(${sheet.src})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${sheet.sheetWidth * scale}px ${sheet.sheetHeight * scale}px`,
      imageRendering: "pixelated",
    },
  };
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
      className="wgt-press flex shrink-0 items-center justify-center gap-2 rounded-lg border-2 px-4 py-2 sm:px-5"
      style={{ borderColor: C.gold + "99", background: C.green, color: C.textGold }}
    >
      {icon}
      <span style={pixel} className="text-[20px] sm:text-[24px]">{children}</span>
    </button>
  );
}

function NavItem({ icon, label, itemKey, active, collapsed, useArt, onClick }) {
  const tabArt = getSidebarTabArt(itemKey, active, collapsed);
  const art = useArt ? tabArt : null;

  if (art) {
    return (
      <button
        aria-label={label}
        title={collapsed ? label : undefined}
        onClick={onClick}
        className="wgt-sidebar-tab relative w-full overflow-hidden rounded-lg"
        style={{ width: art.width, height: art.height }}
      >
        <span className="wgt-sidebar-tab-art absolute inset-0" style={art.style} />
      </button>
    );
  }

  return (
    <button
      aria-label={label}
      title={collapsed ? label : undefined}
      onClick={onClick}
      className={`group flex h-11 items-center rounded-lg transition-colors duration-150 ${
        collapsed ? "w-11 justify-center px-0 md:w-full" : "w-full gap-3 px-4 text-left"
      }`}
      style={{
        ...(active ? { background: C.green, color: C.textGold } : { color: C.textMuted }),
        ...(tabArt ? { height: tabArt.height } : null),
      }}
    >
      <span
        className="shrink-0 transition-transform duration-150 group-hover:scale-110"
        style={{ color: active ? C.textGold : undefined }}
      >
        {icon}
      </span>
      {!collapsed && (
        <>
          <span style={pixel} className="text-[18px] tracking-wide">
            {label}
          </span>
          {active && (
            <Star size={15} className="ml-auto fill-current" style={{ color: C.gold }} />
          )}
        </>
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

export function Sidebar({ active, onNavigate, user }) {
  const location = useLocation();
  const fallbackNavigate = useAppNavigate();
  // URL is the source of truth for the active tab; the `active` prop is still
  // accepted for compatibility but the current path wins when present.
  const activeRoute = active ?? pathToRoute(location.pathname);
  const navigate = onNavigate ?? fallbackNavigate;
  const [collapsed, setCollapsed] = useState(getInitialSidebarState);
  const navSheet = ASSETS.sidebar?.navTabs;
  const closedNavSheet = ASSETS.sidebar?.navTabsClosed;
  const navArtReady = useImageReady(navSheet?.src);
  const closedNavArtReady = useImageReady(closedNavSheet?.src);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore private-mode/localStorage failures; the sidebar still works.
    }
  }, [collapsed]);

  return (
    <aside
      className={`relative hidden h-full shrink-0 flex-col overflow-hidden p-3 transition-[width] duration-200 ease-out md:flex ${
        collapsed ? "w-[76px]" : "w-[224px]"
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
        className="group my-3 flex w-full items-center gap-2"
      >
        <span className="h-px flex-1" style={{ background: C.line }} />
        <span
          className="shrink-0 transition-colors duration-150"
          style={{ color: C.textGold }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </span>
        <span className="h-px flex-1" style={{ background: C.line }} />
      </button>

      <nav className={`flex flex-col items-center ${collapsed ? "gap-2" : "gap-1.5"}`}>
        {NAV.map((n) => (
          <NavItem
            key={n.route}
            {...n}
            itemKey={n.assetKey}
            active={activeRoute === n.route}
            collapsed={collapsed}
            useArt={collapsed ? closedNavArtReady : navArtReady}
            onClick={() => navigate(n.route)}
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

function MobileNavDrawer({ open, onClose, user }) {
  const location = useLocation();
  const navigate = useAppNavigate();
  const activeRoute = pathToRoute(location.pathname);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const go = (route) => {
    navigate(route);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <button
        type="button"
        aria-label="Close navigation menu"
        className="absolute inset-0 h-full w-full cursor-default"
        style={{ background: "#11100bcc" }}
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-[min(84vw,320px)] flex-col overflow-y-auto p-4"
        style={{ background: C.sidebar, color: C.textGold, boxShadow: "18px 0 42px #00000066" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <BrandMark collapsed={false} />
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
            className="wgt-press flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: C.bgHeader, color: C.textGold }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          {NAV.map((item) => {
            const active = activeRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => go(item.route)}
                className="flex h-12 items-center gap-3 rounded-lg px-4 text-left"
                style={{
                  background: active ? C.green : C.bgHeader,
                  color: active ? C.textGold : C.textMuted,
                }}
              >
                <span className="shrink-0" style={{ color: active ? C.gold : undefined }}>
                  {item.icon}
                </span>
                <span style={pixel} className="text-[20px] tracking-wide">
                  {item.label}
                </span>
                {active && <Star size={15} className="ml-auto fill-current" style={{ color: C.gold }} />}
              </button>
            );
          })}
        </nav>

        {user && (
          <div className="mt-auto rounded-md p-3" style={{ background: C.bgHeader }}>
            <p style={pixel} className="truncate text-[16px]">{user.name}</p>
            <p style={{ ...pixel, color: C.textMuted }} className="truncate text-[12px]">{user.unit}</p>
            <p style={{ ...pixel, color: C.gold }} className="text-[12px]">ORD {user.ordDays} DAYS</p>
          </div>
        )}
      </aside>
    </div>
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

// `fill` makes the page consume exactly the space below the header (no page
// scroll); the page's own content decides how to use it. Default keeps the
// classic behaviour where the whole main area scrolls.
export function AppShell({ active, onNavigate, user, icon, title, subtitle, action, children, fill = false }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <div className="flex min-h-screen w-full flex-col overflow-x-hidden md:h-screen md:flex-row md:overflow-hidden" style={{ ...CANVAS_TEXTURE, color: C.textGold }}>
        <Sidebar active={active} onNavigate={onNavigate} user={user} />
        <main className={`flex min-w-0 flex-1 flex-col ${fill ? "overflow-y-auto xl:overflow-hidden" : "overflow-y-auto"}`}>
          <header
            className={`${fill ? "" : "sticky top-0"} z-20 flex shrink-0 flex-col items-stretch justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center md:px-8 md:py-4`}
            style={{ background: C.bgHeader, borderBottom: `1px solid ${C.line}33` }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation menu"
                onClick={() => setMobileNavOpen(true)}
                className="wgt-press flex h-10 w-10 shrink-0 items-center justify-center rounded-lg md:hidden"
                style={{ background: C.green, color: C.textGold, border: `1px solid ${C.gold}66` }}
              >
                <Menu size={22} />
              </button>
              <span className="shrink-0" style={{ color: C.gold }}>
                {icon}
              </span>
              <div className="min-w-0">
                <h1 style={pixel} className="text-[34px] leading-none sm:text-[44px]">{title}</h1>
                <p style={{ ...pixel, color: C.textMuted }} className="text-[13px] tracking-wide sm:text-[16px]">
                  {subtitle}
                </p>
              </div>
            </div>
            {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
          </header>
          {fill ? <div className="min-h-0 flex-1">{children}</div> : children}
        </main>
      </div>
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} user={user} />
    </>
  );
}
