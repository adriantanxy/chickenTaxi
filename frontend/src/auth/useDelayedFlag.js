import { useEffect, useState } from "react";

/**
 * Returns false until `active` has been continuously true for `delayMs`, then
 * true. If `active` goes false before the delay elapses, it never flips.
 *
 * Used to suppress a loading splash during the brief auth-session check: the
 * session usually restores faster than the delay, so nothing is shown at all —
 * the splash only appears when the wait is long enough to actually warrant it.
 */
export function useDelayedFlag(active, delayMs = 400) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) {
      setShow(false);
      return undefined;
    }
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return show;
}
