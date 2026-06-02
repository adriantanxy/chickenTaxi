/**
 * firebase.js — single Firebase initialisation for the whole app.
 *
 * Reads the web config from Vite env vars (VITE_FIREBASE_*, see .env.example)
 * and sets LOCAL persistence so a signed-in session survives the browser being
 * closed and reopened — the user stays logged in until they explicitly log out.
 *
 * Everything else in the app imports `auth` from here; never call initializeApp
 * anywhere else.
 */
import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Fail loud and early if the env file wasn't filled in — otherwise Firebase
// throws a cryptic error only when the user tries to log in.
const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missing.length > 0) {
  console.error(
    `[firebase] Missing config values: ${missing.join(", ")}. ` +
      "Copy frontend/.env.example to frontend/.env and fill in the values " +
      "from your Firebase console, then restart `npm run dev`."
  );
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// LOCAL persistence: the session is kept in IndexedDB across browser restarts.
// setPersistence returns a promise; failures (e.g. private mode) are non-fatal,
// auth just falls back to in-memory persistence for the current tab.
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("[firebase] Could not set local persistence:", error);
});

export const googleProvider = new GoogleAuthProvider();
