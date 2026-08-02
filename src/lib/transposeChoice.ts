/**
 * The key the reader chose, remembered per song.
 *
 * **`localStorage`, one key per slug, and not the IndexedDB store** — vault
 * `DECISIONS.md` 18, which was written for the scroll pace and says in as many
 * words that the next per-song preference is the same question with the same
 * answer. Its test is whether an unsaved song should have the setting, and it
 * plainly should: a reader who transposes a song they are playing online, and
 * comes back to it tomorrow, has not asked the app to forget. `ukulele-veneco-db`
 * holds *saved* songs, so a choice kept there could only exist for the minority
 * of the collection that has been saved for offline use.
 *
 * **Per song rather than global**, which is a real decision and the one
 * `M11 · 5` is asked to judge: a singer's range is a property of the singer, so
 * one key for the whole app is arguable — the tuner's is stored that way. It is
 * per song because a key is a property of *both*, and because the collection
 * cannot offer every song the same shift: 18 songs can offer no key at all, and
 * a global setting would have to silently not apply to them. If it turns out
 * every song ends up moved by roughly the same amount, that is outcome 3 of
 * `M11 · 5` and this becomes one key like the tuning.
 *
 * The stored value is the shift in semitones, 0 to 11, where 0 is the key the
 * book printed.
 */

/** The key the book printed. Always offered, and always the first option. */
export const PRINTED_KEY = 0;

const KEY_PREFIX = "uv-transpose:";

/** One key per song, the way `scrollSpeed.ts` and `theme.ts` own theirs. */
function storageKey(slug: string): string {
  return `${KEY_PREFIX}${slug}`;
}

/**
 * The shift this song was left in, or the printed key.
 *
 * **A stored shift is checked against what the song can actually offer**, and
 * that is not defensive coding for its own sake: the offered keys are derived
 * from the collection's vocabulary, so adding one song to `songs/` can widen or
 * narrow what another song offers. A reader holding a shift that is no longer
 * playable must land on the printed key rather than on a sheet with a chord
 * nobody can draw.
 *
 * Every path returns a usable shift. `localStorage` throws outright in private
 * mode on some browsers, and a stored value can be anything if it was written
 * by hand or by an older version — none of which is a reason for the sheet not
 * to render.
 */
export function readTransposeShift(slug: string, offered: number[]): number {
  try {
    const stored = window.localStorage.getItem(storageKey(slug));
    if (stored === null) return PRINTED_KEY;
    const shift = Number.parseInt(stored, 10);
    return offered.includes(shift) ? shift : PRINTED_KEY;
  } catch {
    return PRINTED_KEY;
  }
}

/**
 * Remember a song's key. Called when the reader picks one, and never otherwise.
 *
 * Returning to the printed key removes the entry rather than writing a zero —
 * the absence of a key and a stored `0` mean the same thing, and not
 * accumulating a row per song the reader merely glanced at is worth the one
 * extra branch.
 *
 * A full quota throws, and so does private mode. Both mean the choice is not
 * remembered, which is the smallest thing in the room.
 */
export function writeTransposeShift(slug: string, shift: number): void {
  try {
    if (shift === PRINTED_KEY) window.localStorage.removeItem(storageKey(slug));
    else window.localStorage.setItem(storageKey(slug), String(shift));
  } catch {
    // Not remembered. The sheet is still in the key the reader picked.
  }
}
