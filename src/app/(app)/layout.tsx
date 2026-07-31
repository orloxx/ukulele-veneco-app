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
