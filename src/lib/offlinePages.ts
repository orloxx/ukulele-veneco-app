/**
 * Putting a song's pages where the service worker will find them offline.
 *
 * The IndexedDB store next door holds a song's *data*. It is not what makes the
 * song openable with the network off — the sheet renders from the prerendered
 * page, so what has to exist offline is the page. Until BUG-008 nothing put it
 * there, and *Guardar* wrote a record nothing read: a saved song did not open,
 * and a song that was merely visited did. The checkbox and the offline
 * catalogue had no relationship at all, in either direction.
 *
 * So saving fetches the song's two pages and writes them into the cache the
 * worker reads from.
 *
 * **It writes them itself rather than leaving it to the worker, and that is not
 * belt-and-braces.** The fetch does pass through the worker, and the
 * `NetworkFirst` catch-all does cache it — but it does so in the worker's own
 * `waitUntil`, *after* the response has reached this code. Checking for the
 * entry straight after the fetch is a race, and it loses: the first version of
 * this rolled every save back because the worker had not written yet. A
 * `cache.put()` here is done when it returns, which is the only way this
 * function can honestly report success. **A migration is exactly when somebody
 * deletes this as redundant with the worker; it is not, and the check that would
 * catch the mistake is a save on a slow connection rather than a build.**
 *
 * Removing goes direct too, because there is no way to ask the worker to forget
 * something. The expiration plugin may be left believing an entry is still
 * there, which is harmless: it only ever evicts, and evicting something already
 * gone is a no-op.
 */

import { PAGES_CACHE } from "./cacheNames";

/**
 * How many songs may be in flight at once when saving a lot of them.
 *
 * "Guardar todas las visibles" over an unfiltered list is 276 songs and 552
 * pages. Unbounded, that is 552 simultaneous requests and a browser that stops
 * responding; serial, it is slow enough to look broken. Six is the middle, and
 * it is exported because `SongList` runs its own pool over `saveSong` — one
 * song at a time so each row can say it is saving — and a second answer to the
 * same question is how the two drift.
 */
export const OFFLINE_SAVE_CONCURRENCY = 6;

/** Every page that has to exist for a saved song to be usable offline. */
export function songPageUrls(slug: string): string[] {
  return [`/song/${slug}`, `/song/${slug}/acordes`];
}

function supported(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

/*
 * `warmTunerPage()` was here, and M12 deleted it.
 *
 * It fetched `/afinador` once per visit from `OfflineSongsProvider`, because the
 * tuner is the one screen whose purpose is a room with no signal and every other
 * page here goes offline by being visited or by being saved. Vault
 * `DECISIONS.md` 20 wrote that down and said in as many words that a precache
 * entry was the right shape, rejected for a mechanical reason: `next-pwa` made
 * `additionalManifestEntries` replace its own `public/` glob wholesale, so one
 * URL cost a copy of its globbing and revision hashing.
 *
 * Serwist adds entries instead of replacing them, so the tuner is a precache
 * entry now — one line in `serwist.config.js` — and it is in the cache before
 * the first launch rather than after it. `DECISIONS.md` 28 is the reversal that
 * clause asked for.
 */

/**
 * Fetch a song's pages so the worker holds them.
 *
 * Throws if a page cannot be fetched or does not end up in the cache. That is
 * the point: the caller undoes the IndexedDB write when this fails, so the app
 * never shows *Guardada* for a song that will not open.
 */
export async function cacheSongPages(slug: string): Promise<void> {
  if (!supported()) return;

  const urls = songPageUrls(slug);
  const cache = await caches.open(PAGES_CACHE);

  await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) {
        throw new Error(`Could not fetch ${url}: ${response.status}`);
      }
      // Clone before anything reads the body: `cache.put` needs it unused.
      await cache.put(url, response.clone());
    }),
  );

  const missing: string[] = [];
  for (const url of urls) {
    if (!(await cache.match(url))) missing.push(url);
  }
  if (missing.length > 0) {
    throw new Error(`Not cached after fetching: ${missing.join(", ")}`);
  }
}

/** Forget a song's pages, so unsaving means what it says. */
export async function uncacheSongPages(slug: string): Promise<void> {
  if (!supported()) return;
  const cache = await caches.open(PAGES_CACHE);
  await Promise.all(songPageUrls(slug).map((url) => cache.delete(url)));
}

/** The same, for many songs at once, `OFFLINE_SAVE_CONCURRENCY` at a time. */
export async function cacheManySongPages(slugs: string[]): Promise<void> {
  const queue = [...slugs];
  const workers = Array.from(
    { length: Math.min(OFFLINE_SAVE_CONCURRENCY, queue.length) },
    async () => {
      for (let slug = queue.shift(); slug; slug = queue.shift()) {
        await cacheSongPages(slug);
      }
    },
  );
  await Promise.all(workers);
}

export async function uncacheManySongPages(slugs: string[]): Promise<void> {
  await Promise.all(slugs.map((slug) => uncacheSongPages(slug)));
}
