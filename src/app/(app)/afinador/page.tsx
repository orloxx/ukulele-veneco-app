import type { Metadata } from "next";
import { TunerScreen } from "@/components/TunerScreen";

/**
 * `/afinador` — the tuner.
 *
 * **It lives inside `(app)/` and that is not a detail.** Vault `DECISIONS.md` 15
 * puts `<Footer />` in `src/app/(app)/layout.tsx` so the credit to Ciro Durán
 * rides with every screen; a route outside that group would need its own credit
 * and its own line in the check. It needs a line in the check either way —
 * `renderedPages()` in `scripts/check-credits.mjs` globs the song directories
 * and names the rest one by one, so `afinador.html` had to be named, and the
 * build's rendered-page count goes 555 → 556. A build whose number did not move
 * is a build that is not checking this page.
 *
 * The page column belongs to the app shell, not to this route.
 */
export const metadata: Metadata = {
  title: "Afinador · El Ukulele Veneco App",
  description:
    "Afiná el ukulele con el micrófono del teléfono: estándar, sol grave, en re y barítono.",
};

export default function TunerPage() {
  return <TunerScreen />;
}
