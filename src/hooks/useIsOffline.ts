"use client";

import { useEffect, useState } from "react";

/**
 * Whether the device is off the network.
 *
 * Two screens ask now — the bar that appears across the app, and the video panel
 * on the sheet, which is the one part of a song page that a lost connection
 * genuinely breaks — so the listener lives in one place rather than in two
 * copies that can drift.
 *
 * **It starts `false` and corrects in an effect, deliberately.** `navigator` does
 * not exist while these pages are being prerendered, and a hook that guessed
 * would hydrate against markup built from the other guess. The first paint says
 * online, which is also the right thing to be wrong about: a reader who is on the
 * network sees nothing appear and disappear.
 */
export function useIsOffline(): boolean {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOffline;
}
