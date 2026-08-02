/**
 * The names of the Cache Storage buckets, in one place.
 *
 * This file exists because of one string. Until M12 the bucket a saved song
 * lives in was written `"pages"` in two files that never import each other —
 * `src/lib/offlinePages.ts`, which puts the pages in, and the `cachePages` rule
 * in `next.config.ts`, which was what read them back out. Nothing connected
 * them but the spelling.
 *
 * **What breaks if they disagree is invisible.** `cacheSongPages()` opens the
 * name it knows and writes there; the worker serves from the name *it* knows.
 * Point them at two different buckets and saving still reports success, the
 * checkbox still ticks, IndexedDB still says *Guardada* — and the song does not
 * open with the network off. That is BUG-008 exactly, arrived at from the other
 * direction, and no build step and no type can see it. Only opening a saved song
 * on a phone in aeroplane mode can.
 *
 * So both sides import from here, and a rename is one edit rather than two that
 * have to be remembered together.
 *
 * **Renaming it is not free even so.** The bucket is real storage on real
 * phones: every song every reader has already saved is under the current name,
 * and a worker that starts reading a new one orphans the lot. If this constant
 * ever changes, the change is a migration — copy the old bucket's entries across
 * on `activate` — and not a rename.
 */

/**
 * Every song page a reader has saved, plus every page the app has served.
 *
 * Written from the page by `cacheSongPages()` and read by the same-origin
 * `NetworkFirst` catch-all in `src/app/sw.ts`, which is the last rule the worker
 * registers. The name predates Serwist: it is what `next-pwa`'s `cachePages`
 * rule was called from `2.0.0` to `2.6.1`, and it is kept letter for letter so
 * the migration cannot un-save anything.
 */
export const PAGES_CACHE = "pages";

/**
 * The landing page, and only the landing page.
 *
 * A leftover with a live job. `next-pwa` injected a `start-url` route of its own
 * ahead of everything `next.config.ts` declared — it never appeared in the
 * config, so it is not in M12's list of rules to carry, and reading the config
 * rather than the worker it built is how you would miss it. Every install out
 * there has `/` under this name and nowhere else.
 *
 * Drop it and the catch-all below picks `/` up instead, which is correct from
 * the next visit onwards and wrong for exactly one: a reader whose first launch
 * after the update has no signal opens the app to nothing, because `/` is in a
 * bucket the new worker never asks about. So it is carried, and it can be
 * retired the release after every install has been through one online launch.
 */
export const START_URL_CACHE = "start-url";
