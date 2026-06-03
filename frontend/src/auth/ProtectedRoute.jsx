/**
 * ProtectedRoute.jsx — gate for pages that require a signed-in user.
 *
 * Wrap any element that should only be reachable after login:
 *   <Route path="/training" element={<ProtectedRoute><TrainingRoute /></ProtectedRoute>} />
 *
 * - While the initial session check runs, renders NOTHING for a short grace
 *   period (~400ms). The session almost always restores faster than that, so on
 *   a normal refresh the user sees no loading flash at all. Only if the check is
 *   genuinely slow does a branded splash fade in.
 * - If signed out, redirects to the login page and remembers where the user was
 *   headed, so login can send them back there.
 * - If signed in, renders the children.
 *
 * Note: this is a UX gate, not a security boundary. Real protection of data
 * happens server-side when your Cloud Functions verify the ID token.
 */
import { Navigate, useLocation } from "react-router-dom";
import { ROUTES, routeToPath } from "../routes";
import { useAuth } from "./AuthContext";
import { useDelayedFlag } from "./useDelayedFlag";
import { ASSETS } from "../assets";
import { C, pixel } from "../theme";

function AuthSplash() {
  return (
    <div
      className="wgt-auth-splash flex min-h-screen flex-col items-center justify-center gap-4"
      style={{ background: C.bgDark, color: C.textMuted }}
    >
      <img
        src={ASSETS.brand.logo}
        alt="Where Got Time"
        className="h-20 w-auto object-contain"
        style={{ imageRendering: "pixelated" }}
      />
      <p style={pixel} className="text-[18px] tracking-wide">
        STANDING BY…
      </p>
    </div>
  );
}

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  // Only reveal the splash if the auth check outlasts the grace period.
  const showSplash = useDelayedFlag(loading, 400);

  if (loading) return showSplash ? <AuthSplash /> : null;

  if (!user) {
    return (
      <Navigate
        to={routeToPath(ROUTES.LOGIN)}
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}
