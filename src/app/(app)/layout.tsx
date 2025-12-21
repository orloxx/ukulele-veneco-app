import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { OfflineIndicator } from "@/components/OfflineIndicator";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <OfflineIndicator />
    </>
  );
}
