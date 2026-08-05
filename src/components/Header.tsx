"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { InstrumentToggle } from "@/components/InstrumentToggle";
import { IconBack, IconTuner } from "@/components/icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UkeMark } from "@/components/UkeMark";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  // Back appears on a song, not on the catalogue: from the list the mark is the
  // way out, and a "Volver" there would go to whatever the reader was looking at
  // before the app — which is not somewhere the app should offer to send them.
  const showBack = pathname?.startsWith("/song") ?? false;

  // The tuner is reached from the header on every screen, and that is Iker's
  // call (2026-08-02): you tune before you play, but you also tune before you
  // have chosen a song, and the header is the only thing on every screen. It
  // costs a third action at 390px, where "Volver" has already lost its word —
  // which is why it hides itself on the tuner rather than sitting there as a
  // link to the page you are on.
  const onTuner = pathname === "/afinador";

  return (
    <header className="uv-header">
      <div className="uv-header__inner">
        {showBack ? (
          <button
            type="button"
            onClick={() => router.back()}
            className="uv-btn uv-btn--ghost uv-btn--back"
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

        {/* Application level, the way the theme is switched — Iker's shape when
            he asked for M15. It comes before the tuner because the tuner is a
            place to go and this is what the app *is*, and because it is the one
            of the three that hides on no screen: the instrument governs
            `/afinador` too. */}
        <InstrumentToggle />

        {onTuner ? null : (
          <Link
            href="/afinador"
            className="uv-iconbtn"
            // Icon-only, so the name is the whole label. Phosphor has no tuning
            // fork and the gauge is the stand-in — see icons.tsx — which is
            // another reason this cannot rely on the glyph to say it.
            aria-label="Afinador"
            title="Afinador"
          >
            <IconTuner />
          </Link>
        )}

        <ThemeToggle />
      </div>
    </header>
  );
}
