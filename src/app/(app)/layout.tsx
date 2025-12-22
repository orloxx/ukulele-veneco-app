import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { OfflineSongsProvider } from "@/contexts/OfflineSongsContext";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <OfflineSongsProvider>{children}</OfflineSongsProvider>
      <Footer />
      <OfflineIndicator />
    </>
  );
}
