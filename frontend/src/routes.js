export const ROUTES = Object.freeze({
  ROOT: "ROOT",
  LOGIN: "LOGIN",
  TRAINING: "TRAINING",
  TRAINING_SESSION: "TRAINING_SESSION",
  CALENDAR: "CALENDAR",
  JOURNAL: "JOURNAL",
  JOURNAL_LAB: "JOURNAL_LAB",
  SQUAD: "SQUAD",
  SHOP: "SHOP",
  PROFILE: "PROFILE",
  PROFILE_CUSTOMIZE: "PROFILE_CUSTOMIZE",
});

export const DEFAULT_ROUTE = ROUTES.ROOT;

// Single source of truth for the route-key -> URL-path mapping. `:mode` is a
// react-router param filled in by routeToPath().
export const ROUTE_PATHS = Object.freeze({
  [ROUTES.ROOT]: "/",
  [ROUTES.LOGIN]: "/login",
  [ROUTES.TRAINING]: "/training",
  [ROUTES.TRAINING_SESSION]: "/training/session/:mode",
  [ROUTES.CALENDAR]: "/calendar",
  [ROUTES.JOURNAL]: "/journal",
  [ROUTES.JOURNAL_LAB]: "/journal/lab",
  [ROUTES.SQUAD]: "/squad",
  [ROUTES.SHOP]: "/shop",
  [ROUTES.PROFILE]: "/profile",
  [ROUTES.PROFILE_CUSTOMIZE]: "/profile/customize",
});

export const DEFAULT_PATH = ROUTE_PATHS[DEFAULT_ROUTE];

// Build a concrete URL for a route, substituting any params (e.g. { mode }).
export function routeToPath(route, params = {}) {
  let path = ROUTE_PATHS[route] ?? DEFAULT_PATH;
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`:${key}`, encodeURIComponent(value));
  }
  return path;
}

// Map a URL pathname back to the ROUTES key used for sidebar highlighting.
// The order matters: more specific paths are matched first. Shop and the
// in-session screen both highlight the Training tab (preserves prior behaviour).
export function pathToRoute(pathname) {
  if (pathname === "/") return ROUTES.ROOT;
  if (pathname.startsWith("/login")) return ROUTES.LOGIN;
  if (pathname.startsWith("/training")) return ROUTES.TRAINING;
  if (pathname.startsWith("/calendar")) return ROUTES.CALENDAR;
  if (pathname.startsWith("/journal")) return ROUTES.JOURNAL;
  if (pathname.startsWith("/squad")) return ROUTES.SQUAD;
  if (pathname.startsWith("/profile")) return ROUTES.PROFILE;
  if (pathname.startsWith("/shop")) return ROUTES.TRAINING;
  return DEFAULT_ROUTE;
}
