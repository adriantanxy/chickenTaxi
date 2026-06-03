/**
 * EnableNotificationsButton.jsx — a toggle to turn web push on/off.
 *
 * iOS requires the permission request to come from a user gesture AND only works
 * once the app is installed to the Home Screen, so a tap target is required (no
 * on-load prompt). The toggle reflects real state: ON registers an FCM token,
 * OFF deletes it so pushes stop. On mount it reads the current state so the
 * switch shows correctly after a reload.
 *
 * The switch IS the state indicator, so no helper text is shown unless something
 * goes wrong (error / unsupported).
 */
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { C, pixel } from "../theme";
import {
  disableNotifications,
  enableNotifications,
  getNotificationState,
} from "../auth/notifications";

export default function EnableNotificationsButton() {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Reflect the real state on load (e.g. user already enabled in a past session).
  useEffect(() => {
    let active = true;
    getNotificationState().then((state) => {
      if (active) setOn(state);
    });
    return () => {
      active = false;
    };
  }, []);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (on) {
        await disableNotifications();
        setOn(false);
      } else {
        const token = await enableNotifications();
        if (token) {
          setOn(true);
        } else {
          setError("Permission denied or unsupported on this device.");
        }
      }
    } catch (err) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        disabled={busy}
        className="wgt-press flex items-center gap-2.5 rounded-lg border-2 px-3 py-2 disabled:opacity-60"
        style={{
          ...pixel,
          borderColor: `${C.gold}99`,
          background: C.cardInner,
          color: C.textDark,
        }}
      >
        <Bell size={18} />
        <span className="text-[20px] sm:text-[22px]">NOTIFICATIONS</span>

        {/* Pixel toggle track + knob. */}
        <span
          aria-hidden
          className="relative inline-block rounded-full border-2 transition-colors"
          style={{
            width: 44,
            height: 24,
            borderColor: `${C.line}88`,
            background: on ? C.green : `${C.line}44`,
          }}
        >
          <span
            className="absolute top-1/2 rounded-full transition-all"
            style={{
              width: 16,
              height: 16,
              background: on ? C.textGold : C.textMuted,
              transform: "translateY(-50%)",
              left: on ? 22 : 3,
            }}
          />
        </span>
      </button>

      {error && (
        <p style={{ ...pixel, color: "#e0794f" }} className="text-[14px]">
          {error}
        </p>
      )}
    </div>
  );
}
