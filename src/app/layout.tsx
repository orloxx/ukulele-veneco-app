import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  IBM_Plex_Mono,
  Instrument_Sans,
} from "next/font/google";
import "./globals.css";

/**
 * The design system's three families, loaded through `next/font/google` rather
 * than the `@import` the design project shipped.
 *
 * Next self-hosts them at build time, which is the whole point for an
 * offline-first PWA: no third-party request, no FOUT, and no cache rules for a
 * host the app never calls — which is why `runtimeCaching` in `next.config.ts`
 * has no `fonts.googleapis.com` or `fonts.gstatic.com` entry.
 */

/** Display and headings — slightly irregular, human, not another grotesk. */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

/** All interface text — clean Spanish accents at small sizes. */
const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

/** The song sheet, chord names, tonos and compases. Nowhere else. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  // Turquesa 600 — the one action colour, and what `manifest.json` declares as
  // its theme_color — over the light ground; the dark theme's own page ground
  // over the dark one, so the browser chrome joins the app rather than glowing
  // at it. `maximumScale` and `userScalable` stay as they are: pinch-zoom and the
  // OS text-size setting are the reason the sheet needs no zoom control of its
  // own (vault DECISIONS.md 13).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0e6b7a" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1a1e" },
  ],
};

export const metadata: Metadata = {
  title: "El Ukulele Veneco App",
  description:
    "Canciones venezolanas adaptadas al ukulele. Basado en el cancionero de Ciro Durán.",

  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ukulele Veneco",
  },

  // The mark, at every size a platform asks for. There is no favicon.ico: the
  // 32px SVG is the same drawing and scales, where the .ico it replaced was a
  // gradient square with a 🎸 set as text — a glyph that renders differently on
  // every platform and not at all where the font has no colour table.
  icons: {
    icon: [
      {
        url: "/icons/favicon.svg",
        sizes: "32x32",
        type: "image/svg+xml",
      },
      {
        url: "/icons/icon-192x192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        url: "/icons/icon-512x512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "/icons/icon-192x192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
    ],
  },

  openGraph: {
    type: "website",
    locale: "es_VE",
    siteName: "El Ukulele Veneco App",
    title: "El Ukulele Veneco App",
    description: "Canciones venezolanas adaptadas al ukulele",
  },

  twitter: {
    card: "summary",
    title: "El Ukulele Veneco App",
    description: "Canciones venezolanas adaptadas al ukulele",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The three font variables go on <html>, not <body>: globals.css builds
    // --font-mono and friends out of them in a `:root` block, and a var() that
    // resolves to nothing makes the whole custom property invalid — which would
    // silently drop the song sheet back to the body font.
    <html
      lang="es"
      className={`${bricolage.variable} ${instrument.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
