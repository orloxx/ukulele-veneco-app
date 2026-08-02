"use client";

import { useEffect } from "react";

/**
 * Registers `/sw.js`. Nothing else does.
 *
 * It was written because `next-pwa` did not (BUG-007): it generated the worker
 * and its precache manifest correctly, then wired the registration up by
 * prepending its own `register.js` to webpack's **`main.js`** entry — the Pages
 * Router entry, in an app that is entirely App Router. Every page here loads
 * `main-app.js`, `main.js` was never requested, and from December 2025 until
 * this component landed nothing ever called `register()`: `/sw.js` returned 200
 * to anyone who asked for it, and nobody ever asked.
 *
 * **This comment used to say the file goes when the app moves to Serwist. The
 * app has moved, and it stays** — vault `DECISIONS.md` 28. The prediction was
 * about the `withSerwist()` webpack-plugin mode, which does inject its own
 * registration; M12 chose the CLI mode, where `serwist build` writes a worker
 * and generates nothing on the page side at all. `iker.io` and `cg-autonomo`
 * both run that mode and both carry a register component of their own, so this
 * is the house pattern rather than a leftover.
 *
 * **What did go is the reason to be suspicious of it.** There is no
 * `register: true` anywhere claiming to do this job any more, so the file is
 * the plain answer to *what registers the worker* rather than a workaround for
 * a setting that lied.
 *
 * `load` rather than an immediate call: the worker is for the *next* visit, and
 * fetching it while the first one is still painting only competes with the page.
 */
export function ServiceWorker() {
  useEffect(() => {
    // Only `pnpm build` runs `serwist build`, so `next dev` serves no `/sw.js`
    // and asking for one only logs a 404 per reload. The guard is not redundant
    // with that: `public/sw.js` is a real file left behind by the last
    // `pnpm build`, and the dev server would hand a stale worker straight to
    // whatever is being worked on.
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
