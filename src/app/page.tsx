import Image from "next/image";
import Link from "next/link";
import { IconArrow } from "@/components/icons";
import { UkeMark } from "@/components/UkeMark";
import { EXTERNAL_URLS, SITE_INFO } from "@/lib/constants";

/**
 * The landing page — the only screen in the app that is marketing rather than
 * tool, and the only one with display type, a full-colour band and an image.
 *
 * The voice is Venezuelan and spoken: *tú* never *usted*, buttons as short
 * imperatives.
 *
 * **Written elisions are not part of it, and that is M17.** `pa'` for *para*
 * was on this page six times, and spelling a word the way it sounds is what
 * made the copy read as costume instead of as somebody talking — the note came
 * from Ciro Durán, who wrote the cancionero, and Iker agreed with it. So does
 * inventing a scene: a page that reaches for a fiesta in a back patio to say
 * *works offline* is describing an idea of Venezuela rather than the app.
 *
 * The vocabulary stays wherever it is the actual word for the thing — cuatro,
 * cambur pintón, cancionero, tono, traste, cuerda al aire — and so does one
 * spoken button, because the alternative to *Dale pues* is *Empezar*, which is
 * a different kind of wrong.
 */

const FEATURES = [
  {
    n: "01",
    title: "Instálala en Android",
    body: "Ábrela en Chrome, toca el menú de los tres puntos y dale a «Instalar app». Queda con su ícono en la pantalla, igual que cualquier otra.",
  },
  {
    n: "02",
    title: "Instálala en iPhone",
    body: "Ábrela en Safari, toca el botón de compartir y baja hasta «Agregar a inicio». Queda con su ícono en la pantalla, igual que cualquier otra.",
  },
  {
    n: "03",
    title: "Guárdalas para después",
    body: "Cada canción tiene su botón «Guardar». La que guardes se queda en el teléfono con su letra y sus acordes, y ahí sigue sin señal y sin datos.",
  },
  {
    n: "04",
    title: "Acordes de verdad, no capturas",
    body: "Cada acorde se dibuja en su cuadrícula de cuatro cuerdas — G C E A en el ukulele, A D F♯ B en el cuatro. El círculo de arriba es cuerda al aire y el número dice en qué traste empieza.",
  },
  {
    n: "05",
    title: "Búscala como te acuerdes",
    body: "Por título, por artista, por tono o por lo difícil que sea. Doscientas y pico de canciones y ninguna a más de dos toques.",
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
            <p className="uv-eyebrow">Cancionero Venezolano</p>
            <h1 className="uv-hero__title">El Ukulele Veneco</h1>
            <p className="uv-hero__lede">
              Cancionero para ukulele de artistas y compositores venezolanos.
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
              . Esto es el mismo, cortado para que quepa en un teléfono.
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
          <h2 className="uv-features__title">¿Cómo funciona?</h2>
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

        {/* The tuner, named.
            It sits here because a reader has just learnt what the app is and has
            not yet been shown a song sheet — and because the landing is the one
            screen with no link to it otherwise: this page renders its own static
            header rather than <Header />, so the gauge on every in-app screen is
            missing from the first screen anybody sees. A third action in that
            header was the other option and would fight the rule that the landing
            header keeps one (see the 640px block in globals.css). */}
        <section className="uv-landing-section uv-tuner-pitch">
          <div className="uv-tuner-pitch__inner">
            <div>
              <p className="uv-eyebrow">El afinador</p>
              <h2 className="uv-tuner-pitch__title">Antes de tocar, afina.</h2>
              <p className="uv-tuner-pitch__body">
                Afinación estándar para el ukulele, cambur pintón para el
                cuatro, y funciona sin señal también.
              </p>
            </div>
            <Link
              className="uv-btn uv-btn--secondary uv-btn--lg"
              href="/afinador"
            >
              <span>Abrir el afinador</span>
              <IconArrow />
            </Link>
          </div>
        </section>

        <section className="uv-preview">
          <div className="uv-preview__grid">
            <div>
              <p className="uv-eyebrow">La hoja</p>
              <h2 className="uv-preview__title">Canción ejemplo</h2>
              <p className="uv-preview__body">
                Los acordes aparecen al compás de la letra, bastante estándar.
                Los que van entre paréntesis son preámbulo al siguiente acorde.
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
            </div>
          </div>
        </section>

        <section className="uv-poster">
          <div className="uv-poster__inner">
            <div>
              <p className="uv-poster__eyebrow">Toca donde sea</p>
              <h2 className="uv-poster__title">
                El cancionero ya está en tu bolsillo.
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
