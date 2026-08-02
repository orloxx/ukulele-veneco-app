/**
 * The reader's scrolling pace, remembered per song.
 *
 * **The pace is lines of lyric per minute, not pixels per second.** Pixels mean
 * something different on a phone and on a laptop, and different again after a
 * pinch-zoom or an OS text-size bump — so the same setting would read fast on
 * one screen and crawl on another. A line is a line everywhere, and
 * `useAutoScroll` resolves it against the sheet's own line box at run time.
 *
 * **It is stored in `localStorage`, one key per slug, and not in the IndexedDB
 * store.** That is a decision, not a convenience, and it is written here because
 * the tidying instinct is to move it: `ukulele-veneco-db` holds *saved* songs,
 * keyed by slug, so a speed kept there could only exist for a song the reader
 * has saved — which is a minority of songs and has nothing to do with playing
 * one. A second object store instead would bump the database version and cut
 * against the backlog's *collapse the two offline stores into one*.
 * `src/lib/theme.ts` already establishes the pattern for a reader preference:
 * one key, synchronous, no version, no async read on mount. A few bytes per
 * song across 276 songs is nothing next to the songs themselves.
 *
 * Iker chose per-song over one global speed (2026-08-02): a merengue and a gaita
 * do not scroll at the same rate, so the number belongs to the song rather than
 * to the reader.
 */

/**
 * The eight steps the slider offers, in lines per minute, slowest first.
 *
 * Slower at the bottom than looks sensible on a desk: 6 lines a minute is ten
 * seconds a line, and a slowest setting that still outruns a ballad is the
 * failure this range is shaped to avoid. The steps widen as they climb because
 * the difference between 6 and 9 is a different song and the difference between
 * 34 and 37 is nothing.
 */
export const SCROLL_SPEEDS = [6, 9, 12, 16, 20, 26, 34, 44] as const;

/** 16 lines a minute — a little under four seconds a line. */
export const DEFAULT_SPEED_INDEX = 3;

const KEY_PREFIX = "uv-scroll-speed:";

/** One key per song, the way `theme.ts` owns `uv-theme`. */
function storageKey(slug: string): string {
  return `${KEY_PREFIX}${slug}`;
}

function clampIndex(index: number): number {
  if (!Number.isInteger(index)) return DEFAULT_SPEED_INDEX;
  if (index < 0) return 0;
  if (index > SCROLL_SPEEDS.length - 1) return SCROLL_SPEEDS.length - 1;
  return index;
}

/**
 * The stored pace for a song, or the default for one never played.
 *
 * Every path through here returns a usable index. `localStorage` throws outright
 * in private mode on some browsers, and a stored value can be anything if the
 * key was written by an older version of this app or by hand — none of which is
 * a reason for the sheet not to render.
 */
export function readSpeedIndex(slug: string): number {
  try {
    const stored = window.localStorage.getItem(storageKey(slug));
    if (stored === null) return DEFAULT_SPEED_INDEX;
    return clampIndex(Number.parseInt(stored, 10));
  } catch {
    return DEFAULT_SPEED_INDEX;
  }
}

/**
 * Remember a song's pace. Called when the reader moves the slider and never on
 * a frame of the scroll loop — the speed changes when a person changes it.
 *
 * A full quota throws, and so does private mode. Both mean the pace is not
 * remembered, which is the smallest thing in the room.
 */
export function writeSpeedIndex(slug: string, index: number): void {
  try {
    window.localStorage.setItem(storageKey(slug), String(clampIndex(index)));
  } catch {
    // Not remembered. The scroll still runs.
  }
}
