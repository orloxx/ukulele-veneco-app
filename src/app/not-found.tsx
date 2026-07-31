import Link from "next/link";
import { UkeMark } from "@/components/UkeMark";
import { SITE_INFO } from "@/lib/constants";

/**
 * The 404, for the whole app.
 *
 * It lives at the root rather than under `song/[slug]/` because that is where
 * every unknown URL now arrives: `dynamicParams = false` on the song routes
 * means an unrecognised slug is served this page statically instead of booting a
 * render just to throw. Before M7 the route-scoped one covered `/song/<bad>` and
 * everything else got Next's own black-on-white default.
 *
 * A global not-found renders inside the root layout only, so it carries no
 * header and no footer and has to bring its own column and its own way back.
 */
export default function NotFound() {
  return (
    <main className="uv-notfound">
      <UkeMark size={44} id="uv-mark-404" />
      <p className="uv-eyebrow">404</p>
      <h1 className="uv-notfound__title">Esa canción no está aquí</h1>
      <p className="uv-notfound__body">
        Puede que esté escrita de otra manera. Búscala en el cancionero por
        título o por artista.
      </p>
      <Link href="/list" className="uv-btn uv-btn--primary uv-btn--lg">
        <span>Abrir el cancionero</span>
      </Link>
      <p className="uv-notfound__credit">
        {SITE_INFO.appName} — el cancionero de Ciro Durán.
      </p>
    </main>
  );
}
