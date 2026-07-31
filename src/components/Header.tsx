"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconBack } from "@/components/icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UkeMark } from "@/components/UkeMark";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  // Back appears on a song, not on the catalogue: from the list the mark is the
  // way out, and a "Volver" there would go to whatever the reader was looking at
  // before the app — which is not somewhere the app should offer to send them.
  const showBack = pathname?.startsWith("/song") ?? false;

  return (
    <header className="uv-header">
      <div className="uv-header__inner">
        {showBack ? (
          <button
            type="button"
            onClick={() => router.back()}
            className="uv-btn uv-btn--ghost"
          >
            <IconBack />
            <span>Volver</span>
          </button>
        ) : null}

        <Link href="/" className="uv-logo">
          <UkeMark size={27} id="uv-mark-header" />
          <span className="uv-logo__word uv-logo__word--header">
            El Ukulele Veneco
            <em>Cancionero</em>
          </span>
        </Link>

        <div className="uv-header__spacer" />

        <ThemeToggle />
      </div>
    </header>
  );
}
