/**
 * RootPage.jsx — the combined LOGIN / SIGN-UP screen (the public entry point).
 *
 * One screen, two modes toggled by a link at the bottom. Offers email/password
 * and Google sign-in. On success, Firebase fires onAuthStateChanged, the auth
 * context updates, and we redirect to wherever the user was headed (or the
 * training dashboard). Already-signed-in users are bounced straight in.
 */
import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ASSETS } from "../assets";
import { ROUTES, routeToPath } from "../routes";
import { C, pixel } from "../theme";
import { useAuth } from "../auth/AuthContext";
import { authErrorMessage } from "../auth/authErrors";
import { useAppNavigate } from "../useAppNavigate";

const inputStyle = {
  ...pixel,
  background: C.cardInner,
  color: C.textDark,
  borderColor: `${C.line}88`,
};

export default function RootPage() {
  const { user, loading, loginWithEmail, signupWithEmail, loginWithGoogle } = useAuth();
  const navigate = useAppNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Where to send the user after auth: their intended destination, else training.
  const destination =
    location.state?.from?.pathname ?? routeToPath(ROUTES.TRAINING);

  // Already signed in (e.g. returning visitor) — skip the form entirely.
  if (!loading && user) return <Navigate to={destination} replace />;

  const isSignup = mode === "signup";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isSignup) {
        await signupWithEmail(email.trim(), password, name.trim());
      } else {
        await loginWithEmail(email.trim(), password);
      }
      navigate(ROUTES.TRAINING);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setBusy(true);
    try {
      await loginWithGoogle();
      navigate(ROUTES.TRAINING);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setError("");
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-10"
      style={{
        color: C.textGold,
        backgroundColor: C.bgDark,
        backgroundImage: `
          radial-gradient(90% 70% at 50% 0%, ${C.bgHeader} 0%, transparent 58%),
          repeating-linear-gradient(45deg, ${C.line}14 0px, ${C.line}14 1px, transparent 1px, transparent 8px)`,
      }}
    >
      <section className="flex w-full max-w-md flex-col items-center text-center">
        <img
          src={ASSETS.brand.logo}
          alt="Where Got Time"
          className="mb-5 h-28 w-auto object-contain"
          style={{ imageRendering: "pixelated" }}
        />

        <h1 style={pixel} className="text-[40px] leading-none">
          {isSignup ? "ENLIST" : "WELCOME BACK"}
        </h1>
        <p style={{ ...pixel, color: C.textMuted }} className="mt-2 text-[18px] leading-tight">
          {isSignup
            ? "Create your account to begin."
            : "Sign in to continue your journey."}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 w-full space-y-3 text-left">
          {isSignup && (
            <input
              type="text"
              placeholder="DISPLAY NAME"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border-2 px-4 py-2.5 text-[20px] outline-none"
              style={inputStyle}
              autoComplete="name"
            />
          )}
          <input
            type="email"
            placeholder="EMAIL"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border-2 px-4 py-2.5 text-[20px] outline-none"
            style={inputStyle}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border-2 px-4 py-2.5 text-[20px] outline-none"
            style={inputStyle}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />

          {error && (
            <p role="alert" className="text-[16px]" style={{ ...pixel, color: "#e0794f" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="wgt-press w-full rounded-lg border-2 px-8 py-2.5 disabled:opacity-60"
            style={{
              ...pixel,
              borderColor: `${C.gold}99`,
              background: C.green,
              color: C.textGold,
              fontSize: 26,
              lineHeight: 1,
            }}
          >
            {busy ? "PLEASE WAIT…" : isSignup ? "CREATE ACCOUNT" : "LOGIN"}
          </button>
        </form>

        {/* divider */}
        <div className="my-4 flex w-full items-center gap-3">
          <span className="h-px flex-1" style={{ background: `${C.line}66` }} />
          <span style={{ ...pixel, color: C.textMuted }} className="text-[14px]">
            OR
          </span>
          <span className="h-px flex-1" style={{ background: `${C.line}66` }} />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="wgt-press w-full rounded-lg border-2 px-8 py-2.5 disabled:opacity-60"
          style={{
            ...pixel,
            borderColor: `${C.line}88`,
            background: C.cardInner,
            color: C.textDark,
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          CONTINUE WITH GOOGLE
        </button>

        <button
          type="button"
          onClick={toggleMode}
          className="mt-6 text-[18px] underline-offset-4 hover:underline"
          style={{ ...pixel, color: C.textGold }}
        >
          {isSignup
            ? "Already have an account? Log in"
            : "New here? Create an account"}
        </button>
      </section>
    </main>
  );
}
