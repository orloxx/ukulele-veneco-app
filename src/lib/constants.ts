/**
 * `EL_UKULELE_VENECO` is not a convenience, it is the attribution.
 *
 * The cancionero is Ciro Durán's work, used with his permission on the single condition
 * that he is credited — vault DECISIONS.md 1. Every credit in the app resolves to this
 * constant, so it is a requirement rather than chrome: it does not come out to tidy a
 * layout, and a screen that shows his songs shows where they came from.
 *
 * Since M6 there is no source PDF in the repo either, so these strings are the only thing
 * left in it that says so. `pnpm credits` fails if any of the places carrying the credit
 * stops carrying it, and `pnpm build` runs it.
 */
export const EXTERNAL_URLS = {
  EL_UKULELE_VENECO: "https://elukulelevene.co",
  LICENSE: "https://creativecommons.org/licenses/by-nc/4.0/",
} as const;

export const SITE_INFO = {
  name: "El Ukulele Veneco",
  appName: "El Ukulele Veneco App",
} as const;
