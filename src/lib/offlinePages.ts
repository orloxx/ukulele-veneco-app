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
 * belt-and-braces.** The fetch does pass through the worker, and workbox's
 * `NetworkFirst` rule does cache it — but it does so in the worker's own
 * `waitUntil`, *after* the response has reached this code. Checking for the
 * entry straight after the fetch is a race, and it loses: the first version of
 * this rolled every save back because the worker had not written yet. A
 * `cache.put()` here is done when it returns, which is the only way this
 * function can honestly report success.
 *
 * Removing goes direct too, because there is no way to ask the worker to forget
 * something. Workbox's expiration plugin may be left believing an entry is
 * still there, which is harmless: it only ever evicts, and evicting something
 * already gone is a no-op.
 */

/** The cache the `cachePages` rule in `next.config.ts` writes to. */
const PAGES_CACHE = "pages";

/** Every page that has to exist for a saved song to be usable offline. */
export function songPageUrls(slug: string): string[] {
  return [`/song/${slug}`, `/song/${slug}/acordes`];
}

function supported(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

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

/**
 * The same, for many songs at once, six at a time.
 *
 * "Guardar todas las visibles" over an unfiltered list is 276 songs and 552
 * pages. Unbounded, that is 552 simultaneous requests and a browser that stops
 * responding; serial, it is slow enough to look broken.
 */
export async function cacheManySongPages(slugs: string[]): Promise<void> {
  const queue = [...slugs];
  const workers = Array.from(
    { length: Math.min(6, queue.length) },
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
