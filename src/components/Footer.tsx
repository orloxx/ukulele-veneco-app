import { EXTERNAL_URLS, SITE_INFO } from "@/lib/constants";
import { containerStyles } from "@/lib/styles";

export function Footer() {
  return (
    <footer className="border-t border-gray-200">
      <div
        className={`${containerStyles.main} py-6 text-center text-sm text-gray-600`}
      >
        Canciones traídas desde{" "}
        <a
          href={EXTERNAL_URLS.EL_UKULELE_VENECO}
          target="_blank"
          rel="noopener noreferrer"
          className={containerStyles.externalLink}
        >
          {SITE_INFO.name}
        </a>
      </div>
    </footer>
  );
}
