/**
 * AuthContext.jsx — app-wide authentication state.
 *
 * Wraps the app once (in main.jsx) and exposes the current user plus the auth
 * actions through the `useAuth()` hook. The Firebase SDK owns the session and
 * token; this context just mirrors `onAuthStateChanged` into React state and
 * provides thin wrappers around the sign-in / sign-up / sign-out calls.
 *
 *   const { user, loading, loginWithEmail, signupWithEmail,
 *           loginWithGoogle, logout } = useAuth();
 *
 * `user` is null when signed out, the Firebase User object when signed in.
 * `loading` is true only during the initial session check on page load — gate
 * route guards on it so already-signed-in users don't flash the login screen.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fires once on load with the restored session (or null), then again on
    // every login/logout. Returns the unsubscribe fn for cleanup.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Actions return the credential promise so callers can await / catch errors
  // and show form-level messages. They never set state directly —
  // onAuthStateChanged is the single source of truth for `user`.
  const value = useMemo(
    () => ({
      user,
      loading,
      loginWithEmail: (email, password) =>
        signInWithEmailAndPassword(auth, email, password),
      signupWithEmail: async (email, password, displayName) => {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        if (displayName) {
          await updateProfile(credential.user, { displayName });
        }
        return credential;
      },
      loginWithGoogle: () => signInWithPopup(auth, googleProvider),
      logout: () => signOut(auth),
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}
