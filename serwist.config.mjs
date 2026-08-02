import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { serwist } from "@serwist/next/config";

/**
 * Read by `serwist build`, which runs after `next build` (see `package.json`)
 * and writes `public/sw.js` from `src/app/sw.ts`. Same stack and same shape as
 * `iker.io` and `cg-autonomo`.
 *
 * **`.mjs`, and so handed to the CLI by name.** Both reference projects call
 * this file `serwist.config.js`, which is the CLI's default and needs no
 * argument — and which Node then reparses as ESM, warning about it on every
 * build, because `package.json` here has no `"type": "module"`. `.mjs` says what
 * the file is, matches `postcss.config.mjs` and every script in `scripts/`, and
 * costs one positional argument in `pnpm build`. What is being followed is CLI
 * mode; the extension is this repo's own convention.
 */

/** The tuner's prerendered document, as `next build` leaves it. */
const TUNER_HTML = ".next/server/app/afinador.html";

/**
 * A revision for `/afinador` taken from the page's own bytes.
 *
 * A precache entry is re-fetched when its revision changes and left alone when
 * it does not, so the revision is the whole of the update policy for this one
 * URL. `cg-autonomo` uses the git SHA, which is honest but re-downloads the page
 * on every deploy that touched anything at all; the content hash re-downloads it
 * when the tuner changes, which is what it means.
 *
 * It throws rather than falling back if the file is missing, because the
 * fallback is the failure: a random or dated revision would build a worker that
 * looks fine and precaches nothing anybody asked for.
 */
function tunerRevision() {
  let html;
  try {
    html = readFileSync(TUNER_HTML);
  } catch {
    throw new Error(
      `serwist.config.js: no ${TUNER_HTML}. \`serwist build\` runs after \`next build\` — check the order in package.json.`,
    );
  }
  return createHash("sha256").update(html).digest("hex").slice(0, 32);
}

export default serwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",

  /**
   * **Off, and this is the option that would have made the migration a
   * regression.** It defaults to `true`, and what it precaches is
   * `.next/server/{app,pages}/**\/*.html` — here that is 555 documents, 552 of
   * them song pages and one of them a 986 KB `/list`. Every reader would
   * download the entire cancionero on install, whether or not they ever saved a
   * song, and *Guardar* would stop meaning anything.
   *
   * `next-pwa` precached `public/**` and `.next/static/**` and no prerendered
   * page at all, so `false` is parity rather than a restriction, and it leaves
   * the one entry below as the only page in the precache — which is the point of
   * `M12 · 3`.
   */
  precachePrerendered: false,

  /**
   * **The tuner, and nothing else.**
   *
   * `/afinador` is the one screen in this app whose purpose is a room with no
   * signal, and every other page here goes offline by being visited or by being
   * saved — a sensible default that fails precisely in the case the tuner exists
   * for. Vault `DECISIONS.md` 20 answered that with a `fetch` per visit from the
   * app shell, and said in as many words that a precache entry was the right
   * shape and was rejected because `next-pwa` made `additionalManifestEntries`
   * replace its own glob wholesale. Serwist has no such trap: entries here are
   * added to the manifest, not instead of it. `DECISIONS.md` 28 is the reversal
   * that clause asked for, and `warmTunerPage()` is gone.
   *
   * **A second URL here needs an argument, not a nod.** `DECISIONS.md` 20 says
   * so and 28 keeps it: a second candidate is a reason to reconsider the
   * mechanism, not to lengthen this array.
   */
  additionalPrecacheEntries: [{ url: "/afinador", revision: tunerRevision() }],
});
