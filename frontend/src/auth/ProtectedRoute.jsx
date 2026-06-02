/**
 * ProtectedRoute.jsx — gate for pages that require a signed-in user.
 *
 * Wrap any element that should only be reachable after login:
 *   <Route path="/training" element={<ProtectedRoute><TrainingRoute /></ProtectedRoute>} />
 *
 * - While the initial session check runs, shows a splash (so signed-in users
 *   returning to the app don't flash the login screen).
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
import { C, pixel } from "../theme";

function AuthSplash() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: C.bgDark, color: C.textMuted }}
    >
      <p style={pixel} className="text-[24px]">
        LOADING…
      </p>
    </div>
  );
}

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthSplash />;

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
