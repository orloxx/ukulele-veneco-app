"use client";

import { useEffect } from "react";

/**
 * Hold the screen awake while something is running.
 *
 * **This is the half of auto-scroll that decides whether the feature works at
 * all.** A phone dims in about thirty seconds and locks shortly after, which is
 * the middle of the first verse — a sheet that scrolls itself under a black
 * screen has solved nothing.
 *
 * Three things about the Screen Wake Lock API are easy to get wrong, and all
 * three are handled here:
 *
 * - **The lock is dropped when the page is hidden and does not come back by
 *   itself.** The sentinel fires `release` and stays released, so it is
 *   re-requested when the page becomes visible again. That is the bug that only
 *   shows up after a notification pulls the reader out of the app mid-song.
 * - **It has to be released the moment it is not needed** — pause, the end of
 *   the song, navigating away, unmounting. A screen held awake on a page nobody
 *   is playing from is a battery complaint nobody will attribute to this.
 * - **It does not exist everywhere.** iOS Safari only got it at 16.4, and even
 *   where it exists the request is refused on low battery. A missing wake lock
 *   is a phone that dims, not an app that throws, so every failure here is
 *   swallowed.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const request = async () => {
      // The request is refused outright on a hidden document, so asking there
      // would only produce a rejected promise to swallow.
      if (document.hidden || sentinel !== null) return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (released) {
          await next.release();
          return;
        }
        // Whatever drops it — the tab going to the background, the system
        // stepping in — this is how we learn it is gone and can ask again.
        next.addEventListener("release", () => {
          sentinel = null;
        });
        sentinel = next;
      } catch {
        // No lock. The phone dims and the reader taps it awake, which is what
        // happened before this feature existed.
      }
    };

    const handleVisibility = () => {
      if (!document.hidden) void request();
    };

    void request();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      void sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
