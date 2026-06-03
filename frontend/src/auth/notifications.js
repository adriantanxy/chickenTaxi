/**
 * notifications.js — Firebase Cloud Messaging (web push) client helpers.
 *
 * Flow, called from a user tap (iOS requires permission requests to come from a
 * user gesture, and only inside an installed Home Screen PWA):
 *
 *   1. registerMessagingSW()      — register /firebase-messaging-sw.js
 *   2. Notification.requestPermission()
 *   3. getToken(messaging, { vapidKey, serviceWorkerRegistration })
 *
 * enableNotifications() does all three and returns the FCM token. For now we
 * just log/return the token so you can fire a test push from the Firebase
 * console (Cloud Messaging → Send test message). Later, persist it to Firestore
 * per user so a sender can target the device.
 *
 * VAPID key: Firebase console → Project settings → Cloud Messaging →
 * Web Push certificates → "Key pair". Put it in .env as VITE_FIREBASE_VAPID_KEY.
 */
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";
import { app } from "./firebase";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Register the FCM service worker, passing the Firebase config through the URL
 * query string (a service worker can't read import.meta.env). Returns the
 * ServiceWorkerRegistration, which getToken() needs.
 */
async function registerMessagingSW() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser.");
  }
  const params = new URLSearchParams(firebaseConfig).toString();
  return navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${params}`
  );
}

/**
 * Request permission and return an FCM registration token, or null if the user
 * declined / the platform can't do web push. Safe to call from a button onClick.
 */
export async function enableNotifications() {
  if (!(await isSupported())) {
    console.warn("[fcm] This browser/platform does not support FCM web push.");
    return null;
  }
  if (!VAPID_KEY) {
    console.error(
      "[fcm] Missing VITE_FIREBASE_VAPID_KEY. Add it to frontend/.env from " +
        "Firebase console → Cloud Messaging → Web Push certificates."
    );
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn(`[fcm] Notification permission: ${permission}`);
    return null;
  }

  const registration = await registerMessagingSW();
  const messaging = getMessaging(app);

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (token) {
    console.log("[fcm] Device token:", token);
    // TODO: persist `token` to Firestore (users/{uid}/fcmTokens) so a sender
    // can target this device. For now, copy it from the console to send a test.
  } else {
    console.warn("[fcm] No token returned (permission may be blocked).");
  }
  return token;
}

/**
 * Turn notifications OFF: delete the FCM token so this device stops receiving
 * pushes. The browser permission itself stays "granted" (only the user can
 * revoke that in Settings), so re-enabling later won't re-prompt. Returns true
 * on success. Safe to call even if there's no current token.
 */
export async function disableNotifications() {
  if (!(await isSupported())) return false;
  const messaging = getMessaging(app);
  try {
    await deleteToken(messaging);
    console.log("[fcm] Token deleted — notifications disabled for this device.");
    // TODO: also remove the token from Firestore once you persist it there.
    return true;
  } catch (err) {
    console.warn("[fcm] Failed to delete token:", err);
    return false;
  }
}

/**
 * Best-effort read of whether this device currently has notifications ON, so the
 * toggle shows the right state on load. "On" means: permission granted AND an
 * FCM token currently exists. Returns false if push isn't supported at all.
 */
export async function getNotificationState() {
  if (!(await isSupported())) return false;
  if (Notification.permission !== "granted") return false;
  if (!VAPID_KEY) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return Boolean(token);
  } catch {
    return false;
  }
}

/**
 * Foreground messages: when a push arrives while the app is open and focused,
 * the OS does NOT show it automatically — handle it here. Returns the
 * unsubscribe function. Optional; wire it up if you want in-app toasts.
 */
export async function onForegroundMessage(handler) {
  if (!(await isSupported())) return () => {};
  const messaging = getMessaging(app);
  return onMessage(messaging, handler);
}
