import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { OfflineSongsProvider } from "@/contexts/OfflineSongsContext";

/**
 * The shell every screen inside the app wears: sticky header, the page column,
 * the credit, and the offline bar over the lot.
 *
 * The page column lives here rather than in each route, so `/list` and
 * `/song/<slug>` cannot drift apart on width or padding.
 *
 * **`<Footer />` belongs here rather than in the routes, and that is a decision.** It is
 * the credit to Ciro Durán (see `Footer.tsx` and `constants.ts`), and putting it in the
 * shell is what makes it true of all 276 song pages at once — including one being read
 * with no network, because a saved song *is* one of these prerendered documents sitting
 * in the service worker's cache. Moved down into the routes the credit would be correct
 * today and absent from the next route somebody adds. `pnpm credits` asserts it in the
 * rendered HTML, not only in this file.
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="uv-shell">
      <Header />
      <OfflineSongsProvider>
        <main className="uv-page">{children}</main>
      </OfflineSongsProvider>
      <Footer />
      <OfflineIndicator />
    </div>
  );
}
