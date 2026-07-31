"use client";

import { useEffect } from "react";

/**
 * Registers `/sw.js`.
 *
 * This exists because `next-pwa` does not (BUG-007). It generates the worker and
 * its precache manifest correctly, but it wires the registration up by
 * prepending its own `register.js` to webpack's **`main.js`** entry — which is
 * the Pages Router entry, and this app is entirely App Router. Every page here
 * loads `main-app.js`, `main.js` is never requested, and so from December 2025
 * until this component landed nothing ever called `register()`: `/sw.js`
 * returned 200 to anyone who asked for it, and nobody ever asked.
 *
 * **Do not delete this on the grounds that `register: true` is set in
 * `next.config.ts`.** That setting is what is broken. The registration goes when
 * the app moves to Serwist, which does it through the App Router properly — and
 * not before.
 *
 * `load` rather than an immediate call: the worker is for the *next* visit, and
 * fetching it while the first one is still painting only competes with the page.
 */
export function ServiceWorker() {
  useEffect(() => {
    // `next.config.ts` disables the worker in development, so there is no
    // `/sw.js` to register there and asking for one only logs a 404 per reload.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        // A failed registration costs the offline cache and nothing else, so it
        // is reported rather than surfaced: the app works online either way.
        console.error("Service worker registration failed:", error);
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
