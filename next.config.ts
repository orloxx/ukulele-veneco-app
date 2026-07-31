import type { NextConfig } from "next";
import withPWA from "next-pwa";

/** One entry of `runtimeCaching`, as `next-pwa` types it. */
type RuntimeCachingRule = NonNullable<
  NonNullable<Parameters<typeof withPWA>[0]>["runtimeCaching"]
>[number];

/**
 * Everything else on this origin — which above all means the pages themselves.
 *
 * It has to be last, because workbox takes the first rule that matches, and it
 * has to exist at all: declaring `runtimeCaching` replaces next-pwa's defaults
 * wholesale, and the default it replaced ended with exactly this rule. Without
 * it not one HTML document was ever cached, so the app opened to the browser's
 * offline page however many songs had been saved (BUG-007).
 *
 * 300 entries rather than next-pwa's 32: this app is 276 songs and two pages
 * each, and a cached document is a few KB. `networkTimeoutSeconds` is what stops
 * NetworkFirst from waiting out the browser's full timeout on one bar of signal
 * before it reaches for the copy it already has.
 *
 * The cast covers two things next-pwa hands straight to workbox and left out of
 * its own `.d.ts`: a function `urlPattern` and `networkTimeoutSeconds`. Its own
 * default config uses both. The types are incomplete; the values are right.
 */
const cachePages = {
  urlPattern: ({ url }: { url: URL }) => self.origin === url.origin,
  handler: "NetworkFirst",
  options: {
    cacheName: "pages",
    expiration: {
      maxEntries: 300,
      maxAgeSeconds: 60 * 60 * 24 * 30,
    },
    networkTimeoutSeconds: 10,
  },
} as unknown as RuntimeCachingRule;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // There is no fonts.googleapis.com or fonts.gstatic.com rule here on purpose:
  // `next/font/google` self-hosts the three families at build time, so the app
  // never calls either host and a rule for them could only ever match a request
  // it does not make. The woff2s it does serve are covered by the rule below.
  runtimeCaching: [
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-font-assets",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-image-assets",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-js-css-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: /\.(?:json)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-data-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-image",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    cachePages,
  ],
})(nextConfig);
