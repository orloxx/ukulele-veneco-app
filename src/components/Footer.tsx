import { EXTERNAL_URLS, SITE_INFO } from "@/lib/constants";

/**
 * The credit line.
 *
 * The cancionero is Ciro Durán's work, used with his permission and on one
 * condition — credit (vault DECISIONS.md 1). This is not chrome, and it does not
 * come out to tidy a layout.
 */
export function Footer() {
  return (
    <footer className="uv-footer">
      <div className="uv-footer__inner">
        <span>
          Canciones traídas desde{" "}
          <a
            href={EXTERNAL_URLS.EL_UKULELE_VENECO}
            target="_blank"
            rel="noopener noreferrer"
          >
            {SITE_INFO.name}
          </a>
          , el cancionero de Ciro Durán.
        </span>
        <span>
          <a
            href={EXTERNAL_URLS.LICENSE}
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY-NC 4.0
          </a>
        </span>
      </div>
    </footer>
  );
}
