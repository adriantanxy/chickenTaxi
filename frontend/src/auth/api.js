/**
 * api.js — authenticated requests to your future backend (Cloud Functions).
 *
 * Nothing in the UI uses this yet: auth today is fully client-side. It exists so
 * that when you build your first data Cloud Function, the client already sends a
 * verifiable Firebase ID token on every request — your function just adds the
 * `verifyIdToken` middleware and it works, with zero changes here.
 *
 *   import { apiFetch } from "../auth/api";
 *   const res = await apiFetch("/me");        // GET, token attached automatically
 *   const data = await res.json();
 *
 * The base URL comes from VITE_API_BASE_URL (see .env.example).
 */
import { auth } from "./firebase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Returns the current user's Firebase ID token, or null if signed out.
 * The SDK auto-refreshes the token; passing forceRefresh=true skips its cache.
 */
export async function getIdToken(forceRefresh = false) {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  return currentUser.getIdToken(forceRefresh);
}

/**
 * fetch() wrapper that prefixes the API base URL and attaches the ID token as a
 * Bearer header. Same signature as fetch otherwise. Throws if called while
 * signed out (a protected endpoint needs a token).
 */
export async function apiFetch(path, options = {}) {
  const token = await getIdToken();
  if (!token) {
    throw new Error("apiFetch called while signed out — no ID token available.");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}
