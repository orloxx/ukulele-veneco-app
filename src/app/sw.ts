import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  type PrecacheEntry,
  Serwist,
  type SerwistGlobalConfig,
  StaleWhileRevalidate,
} from "serwist";
import { PAGES_CACHE, START_URL_CACHE } from "@/lib/cacheNames";

/**
 * The service worker, and the whole of it.
 *
 * It lives in `src/app/` because that is where `iker.io` and `cg-autonomo` put
 * theirs and this project is now the third on the same stack — not because the
 * App Router does anything with it. `app/` ignores any file that is not one of
 * its special names, and this one is never routed, imported or bundled by Next.
 * `serwist build` compiles it with esbuild after `next build` and writes
 * `public/sw.js`. See `serwist.config.js`.
 *
 * **CLI mode, not `withSerwist()`, and that is a decision** (vault
 * `DECISIONS.md` 28). The webpack-plugin mode injects its own registration; this
 * one does not, which is why `src/components/ServiceWorker.tsx` stays. Both
 * reference projects carry a register component for the same reason, and M12's
 * backlog line — that Serwist would let that file go — was simply wrong.
 *
 * **The runtime rules below are `next-pwa`'s, carried across one for one.**
 * Nothing here is meant to behave differently from `2.6.1`; the migration buys
 * the tuner a real precache entry and the project one stack instead of two, and
 * a reader should not be able to tell it happened.
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const YEAR_IN_SECONDS = 60 * 60 * 24 * 365;
const MONTH_IN_SECONDS = 60 * 60 * 24 * 30;

const serwist = new Serwist({
  // Injected by `serwist build`: `.next/static/**` and `public/**`, plus the one
  // entry `serwist.config.js` adds by hand. It is deliberately *not* every
  // prerendered page — see there.
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // Deletes any cache whose name contains `-precache-` and this scope, which
    // is what `next-pwa`'s `workbox-precache-v2-…` was called. So the old
    // precache goes on activate and does not sit on the phone forever. The
    // `pages` bucket has no `-precache-` in its name, and that is not luck: it
    // is why a saved song survives this update.
    cleanupOutdatedCaches: true,
    concurrency: 10,
  },
  // Both were already true under `next-pwa` — `skipWaiting` in `next.config.ts`
  // and `clientsClaim` by its default — so the update takes on this launch
  // rather than the one after it, exactly as it did before.
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // `next-pwa` registered this one itself, ahead of everything the config
      // declared, and it is here for the installs that already exist rather
      // than for anything new. See `START_URL_CACHE`.
      matcher: "/",
      handler: new NetworkFirst({ cacheName: START_URL_CACHE }),
    },
    {
      matcher: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: YEAR_IN_SECONDS,
          }),
        ],
      }),
    },
    {
      matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: new CacheFirst({
        cacheName: "static-image-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: MONTH_IN_SECONDS,
          }),
        ],
      }),
    },
    {
      matcher: /\.(?:js|css)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-js-css-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: MONTH_IN_SECONDS,
          }),
        ],
      }),
    },
    {
      matcher: /\.(?:json)$/i,
      handler: new CacheFirst({
        cacheName: "static-data-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: MONTH_IN_SECONDS,
          }),
        ],
      }),
    },
    {
      matcher: /\/_next\/image\?url=.+$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: MONTH_IN_SECONDS,
          }),
        ],
      }),
    },
    {
      /**
       * Everything else on this origin — which above all means the pages
       * themselves.
       *
       * **It has to be last**, because the first rule that matches wins, and it
       * has to exist at all: `runtimeCaching` here replaces Serwist's
       * `defaultCache` wholesale, exactly as it replaced `next-pwa`'s defaults,
       * and the array it replaced ended with this rule. Without it not one HTML
       * document is ever cached, so the app opens to the browser's offline page
       * however many songs have been saved (BUG-007).
       *
       * **The two expiration numbers are load-bearing, and both had to grow at
       * BUG-008.** A saved song lives in this cache, so anything that evicts an
       * entry un-saves a song behind the reader's back:
       *
       * - `maxEntries` has to sit above every page the app can produce, or the
       *   LRU does it. The ceiling is 276 songs × 2 pages, plus the landing, the
       *   list and an RSC payload apiece — call it 1200, which at a few KB a
       *   document is a handful of MB and nowhere near an origin's quota. It was
       *   300, and merely scrolling the catalogue fills 123 of those with Next's
       *   own link prefetches.
       * - `maxAgeSeconds` has to outlast the trip the songs were saved for. It
       *   was 30 days, which quietly deletes the songs of anyone who saves a set
       *   and does not open the app for a month — precisely the person the
       *   feature is for.
       *
       * **This is the rule that makes adopting `defaultCache` unsafe**, and not
       * for the reason M12 was cut believing. `defaultCache` *does* have a
       * bucket called `pages` (`PAGES_CACHE_NAME.html` in
       * `@serwist/next/worker`), so the name would have survived — but it caps it
       * at 32 entries for 24 hours, and its matcher tests a `Content-Type`
       * header on the *request*, which a navigation does not send, so documents
       * land in `others` on the same 32-entry cap instead. Either way a saved set
       * is gone by the next morning. The conclusion held; the reason did not.
       *
       * `networkTimeoutSeconds` is what stops `NetworkFirst` waiting out the
       * browser's full timeout on one bar of signal before it reaches for the
       * copy it already has.
       */
      matcher: ({ sameOrigin }) => sameOrigin,
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE,
        networkTimeoutSeconds: 10,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 1200,
            maxAgeSeconds: YEAR_IN_SECONDS,
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
