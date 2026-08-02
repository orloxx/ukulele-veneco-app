import type { NextConfig } from "next";

/**
 * There is no PWA plugin here any more.
 *
 * From December 2025 to `2.6.1` this file wrapped the config in `next-pwa` and
 * carried the whole service worker with it — the `runtimeCaching` array, the
 * cache names, the expiration numbers and a `as unknown as RuntimeCachingRule`
 * cast to get past types that omitted two options `next-pwa`'s own defaults
 * used. M12 moved the lot to Serwist, which builds the worker from
 * `src/app/sw.ts` through `serwist.config.js` after `next build` rather than
 * from inside webpack. The rules and the reasoning moved with them; read them
 * there.
 *
 * **The worker is absent in development rather than disabled**, which is the
 * same outcome by a simpler route. `next-pwa` needed `disable` because it ran
 * inside the build; `serwist build` is a separate command that only `pnpm build`
 * runs, so `next dev` produces no `public/sw.js` and there is nothing to turn
 * off. `ServiceWorker.tsx` declines to register outside production anyway, which
 * matters because a `public/sw.js` left behind by an earlier `pnpm build` *is*
 * served by the dev server.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
