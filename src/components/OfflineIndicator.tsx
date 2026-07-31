"use client";

import { useEffect, useState } from "react";
import { IconWifiSlash } from "@/components/icons";

/**
 * The bar that appears when the device drops off the network.
 *
 * Amarillo, never rojo, and never the word *error*: being offline is this app
 * working as designed. The copy says what the reader is looking at rather than
 * what has gone wrong, and the phone emoji is gone with it — no emoji anywhere
 * in this interface
 * (vault DECISIONS.md 12).
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Set initial state
    setIsOffline(!navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    // <output> rather than a div with role="status": same implicit role and
    // polite live region, one element less to explain.
    <output className="uv-offline-bar uv-offline-bar--fixed">
      <IconWifiSlash />
      Sin conexión — estás viendo lo que guardaste en el teléfono.
    </output>
  );
}
