/* firebase-messaging-sw.js — Firebase Cloud Messaging service worker.
 *
 * MUST live at the web root (/firebase-messaging-sw.js) so FCM can find it.
 * Files in Vite's `public/` are copied to the root as-is, so this path works.
 *
 * Service workers can't read import.meta.env, so the client passes the Firebase
 * config as query params when it registers this SW (see notifications.js →
 * registerMessagingSW). That keeps a single source of truth: frontend/.env.
 * These are public client keys, not secrets — see frontend/.env.example.
 *
 * Uses the compat builds via importScripts because that's the only form that
 * works inside a classic service worker.
 */
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);

// Pull config out of the registration URL's query string.
const params = new URL(self.location).searchParams;
firebase.initializeApp({
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

const messaging = firebase.messaging();

// Fires when a push arrives while the app is in the background / closed.
// FCM auto-displays "notification" payloads, so this mainly covers data-only
// payloads. Kept simple for the prototype.
messaging.onBackgroundMessage((payload) => {
  const title =
    payload.notification?.title ?? payload.data?.title ?? "Where Got Time";
  const options = {
    body: payload.notification?.body ?? payload.data?.body ?? "",
    icon: "/assets/brand/logo_cleaned.png",
    badge: "/assets/brand/logo_cleaned.png",
  };
  self.registration.showNotification(title, options);
});
