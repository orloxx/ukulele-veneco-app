import Image from "next/image";
import Link from "next/link";
import { IconArrow } from "@/components/icons";
import { UkeMark } from "@/components/UkeMark";
import { EXTERNAL_URLS, SITE_INFO } from "@/lib/constants";

/**
 * The landing page — the only screen in the app that is marketing rather than
 * tool, and the only one with display type, a full-colour band and an image.
 *
 * The voice is Venezuelan and spoken: *tú* never *usted*, elisions written the
 * way they are said, buttons as short imperatives.
 */

const FEATURES = [
  {
    n: "01",
    title: "Se guarda en el teléfono",
    body: "Marca las canciones que vas a tocar y quedan en el dispositivo. Sin señal, sin datos, sin excusas — la fiesta sigue en el patio de atrás.",
  },
  {
    n: "02",
    title: "Acordes de verdad, no capturas",
    body: "Cada acorde se dibuja en su cuadrícula de cuatro cuerdas: G C E A, el círculo arriba es cuerda al aire y el número dice en qué traste empieza.",
  },
  {
    n: "03",
    title: "Búscala como te acuerdes",
    body: "Por título, por artista, por tonalidad. Doscientas y pico de canciones y ninguna a más de dos toques de distancia.",
  },
];

/**
 * Counted against `songs/`, not estimated: 276 files, and the `chords:` blocks
 * in them hold 2140 fingerings between them — which is exactly the number of
 * diagrams printed in the book, because every one was checked against its page.
 */
const STATS: [string, string][] = [
  ["276", "canciones"],
  ["2.140", "acordes dibujados"],
  ["4", "cuerdas, nada más"],
  ["0", "kb de conexión"],
];

export default function Home() {
  return (
    <>
      <header className="uv-header uv-header--static">
        <div className="uv-header__inner">
          <span className="uv-logo">
            <UkeMark size={28} id="uv-mark-landing" />
            <span className="uv-logo__word uv-logo__word--header">
              {SITE_INFO.name}
              <em>Cancionero</em>
            </span>
          </span>
          <div className="uv-header__spacer" />
          <a
            className="uv-btn uv-btn--ghost"
            href={EXTERNAL_URLS.EL_UKULELE_VENECO}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>El cancionero original</span>
          </a>
          <Link className="uv-btn uv-btn--secondary" href="/list">
            <span>Abrir la app</span>
          </Link>
        </div>
      </header>

      <main>
        <section className="uv-landing-section uv-hero">
          <div>
            <p className="uv-eyebrow">Cancionero criollo · offline</p>
            {/* 276, said out loud. "Doscientas" understates it by a quarter and
                the exact figure does not belong in display type, so the hero
                rounds up and the stat row below carries the number. */}
            <h1 className="uv-hero__title">
              Casi trescientas canciones
              <br />y un ukulele
              <br />
              nada más.
            </h1>
            <p className="uv-hero__lede">
              Estas canciones se tocan en cuatro. Pero el cuatro no se consigue
              en todas partes, y el ukulele sí — así que aquí están, con sus
              acordes, pa' los que andamos lejos.
            </p>
            {/* The credit belongs here and not only in the footer: the
                cancionero is Ciro Durán's, and naming him is the condition it
                is used under (vault DECISIONS.md 1). */}
            <p className="uv-hero__credit">
              El repertorio es el cancionero de Ciro Durán, en{" "}
              <a
                href={EXTERNAL_URLS.EL_UKULELE_VENECO}
                target="_blank"
                rel="noopener noreferrer"
              >
                elukulelevene.co
              </a>
              . Esto es el mismo, cortado pa' que quepa en un teléfono.
            </p>
            <div className="uv-hero__actions">
              <Link className="uv-btn uv-btn--primary uv-btn--lg" href="/list">
                <span>Dale pues</span>
                <IconArrow />
              </Link>
              <a className="uv-btn uv-btn--secondary uv-btn--lg" href="#como">
                <span>Cómo funciona</span>
              </a>
            </div>
            <p className="uv-hero__fine">
              Se instala como app. Funciona sin internet.
            </p>
          </div>
          <div className="uv-hero__art">
            <Image
              src="/badge-ukulele-veneco.webp"
              alt="Insignia de El Ukulele Veneco: un ukulele sobre un cancionero abierto, con un turpial y una orquídea"
              width={880}
              height={880}
              sizes="(max-width: 900px) 80vw, 440px"
              priority
            />
          </div>
        </section>

        <section className="uv-stats">
          <div className="uv-stats__grid">
            {STATS.map(([figure, label]) => (
              <div key={label}>
                <div className="uv-stats__figure">{figure}</div>
                <div className="uv-stats__label">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="como" className="uv-landing-section">
          <h2 className="uv-features__title">
            Hecha pa' tocar, no pa' navegar.
          </h2>
          <div className="uv-features__list">
            {FEATURES.map((feature) => (
              <div key={feature.n} className="uv-feature">
                <div className="uv-feature__n">{feature.n}</div>
                <h3 className="uv-feature__title">{feature.title}</h3>
                <p className="uv-feature__body">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="uv-preview">
          <div className="uv-preview__grid">
            <div>
              <p className="uv-eyebrow">La hoja</p>
              <h2 className="uv-preview__title">
                El acorde encima de la sílaba donde cae.
              </h2>
              <p className="uv-preview__body">
                Todo en monoespaciada, para que el acorde nunca se corra de su
                sitio. Los que van entre paréntesis llegan antes de tiempo: si
                te salen, mejor; si no, no pasa nada.
              </p>
            </div>
            {/* Every verse here is invented. The catalogue in `songs/` is
                third-party copyright and is not reproduced outside it. */}
            <div className="uv-card uv-preview__card">
              <div className="uv-sheet">
                <h3 className="uv-sheet-section">Coro</h3>
                <div className="uv-sheet-line">
                  <span className="uv-sheet-syllable">
                    <span className="uv-chord">F</span>Cuatro cuerdas y{" "}
                  </span>
                  <span className="uv-sheet-syllable">
                    <span className="uv-chord">C</span>nada más
                  </span>
                </div>
                <div className="uv-sheet-line">
                  <span className="uv-sheet-syllable">
                    <span className="uv-chord">G7</span>suena mejor si la{" "}
                  </span>
                  <span className="uv-sheet-syllable">
                    <span className="uv-chord">C</span>cantas tú
                  </span>
                </div>
                <div className="uv-sheet-line">
                  <span className="uv-sheet-syllable">
                    <span className="uv-chord">F</span>cántala como te{" "}
                  </span>
                  <span className="uv-sheet-syllable">
                    <span className="uv-chord uv-chord--anticipated">(Am)</span>
                    salga
                  </span>
                </div>
              </div>
              <p className="uv-preview__caption">Letra de ejemplo</p>
            </div>
          </div>
        </section>

        <section className="uv-poster">
          <div className="uv-poster__inner">
            <div>
              <p className="uv-poster__eyebrow">Se toca donde sea</p>
              <h2 className="uv-poster__title">
                Échale. El cancionero ya está en tu bolsillo.
              </h2>
            </div>
            <Link className="uv-btn uv-btn--lg uv-btn--poster" href="/list">
              <span>Abrir el cancionero</span>
              <IconArrow />
            </Link>
          </div>
        </section>
      </main>

      <footer className="uv-footer uv-footer--landing">
        <div className="uv-footer__inner">
          <span className="uv-logo">
            <UkeMark
              size={22}
              color="var(--text-muted)"
              id="uv-mark-landing-footer"
            />
            <span>{SITE_INFO.name}</span>
          </span>
          <span>
            Canciones traídas desde{" "}
            <a
              href={EXTERNAL_URLS.EL_UKULELE_VENECO}
              target="_blank"
              rel="noopener noreferrer"
            >
              {SITE_INFO.name}
            </a>
            , el cancionero de Ciro Durán.{" "}
            <a
              href={EXTERNAL_URLS.LICENSE}
              target="_blank"
              rel="noopener noreferrer"
            >
              CC BY-NC 4.0
            </a>
            .
          </span>
        </div>
      </footer>
    </>
  );
}
