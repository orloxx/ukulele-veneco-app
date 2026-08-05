/**
 * Ukulele or cuatro — the instrument every diagram in the app is drawn for.
 *
 * **Nothing in `songs/` is transcribed twice and no fingering is invented**,
 * which is why M15 is a far smaller milestone than it sounds. The ukulele is
 * G4 C4 E4 A4 and the cuatro is A3 D4 F♯4 B3, and **string by string they are a
 * tone apart in every pitch class**. So a fret shape held on a cuatro sounds the
 * same pitch classes as that shape held on a ukulele, named a tone higher.
 *
 * **The octaves do not enter into it, and that has now been tested twice.** The
 * milestone said the octave of the cuatro's 1st string was irrelevant — B3
 * against B4 — and then carried a *wrong* octave on the 4th string, A4 where the
 * instrument is A3, from scoping until `2.8.0` (Iker, against the instrument).
 * Not one thing in this file changed when it was corrected, because pitch
 * classes are all any of it reads.
 *
 * So **the cuatro diagram for chord X is the book's own ukulele diagram for
 * X−2**, and `shapeShift` below is that −2. Vault `DECISIONS.md` 6 is satisfied
 * rather than worked around: the reader's fingers land exactly where the book
 * drew them, and only the label over the grid changes. The book says the same
 * thing in its own words — ukulele and cuatro are a capo 2 apart.
 *
 * **The shift is derived and must stay derived.** It is the interval between an
 * instrument's tuning and the ukulele's, read off the 3rd string. A hand-typed
 * −2 is a number that cannot be wrong on the day it is written and cannot be
 * right afterwards. `scripts/check-transpose.mjs` proves the four-string
 * pitch-class identity the shift stands on **from two independently written
 * string tables** — deriving the cuatro's strings as the ukulele's plus two and
 * then asserting they are the ukulele's plus two is BUG-019's circularity, and
 * it would pass for ever on a wrong tuning.
 */

import {
  CUATRO_CAMBUR_PINTON,
  songbookShiftSemitones,
  type Tuning,
  UKULELE_STANDARD,
} from "@/lib/tunings";

export type InstrumentId = "ukulele" | "cuatro";

export interface Instrument {
  id: InstrumentId;
  /** What the toggle says, and what the app calls it out loud. */
  label: string;
  /**
   * How it is tuned. **One tuning, not a list** — vault `DECISIONS.md` 33.
   *
   * It is the tuning this instrument's chord names are true of, which is why
   * there is nothing for the tuner to warn about and nothing to remember.
   */
  tuning: Tuning;
  /** The strings 4th to 1st, as `ChordDiagram` labels them. Off the tuning. */
  stringNames: readonly string[];
  /**
   * How far the book's diagram moves to become this instrument's — 0 for the
   * ukulele, −2 for the cuatro. See the note at the top.
   */
  shapeShift: number;
}

function instrument(
  id: InstrumentId,
  label: string,
  tuning: Tuning,
): Instrument {
  return {
    id,
    label,
    tuning,
    stringNames: tuning.strings.map((item) => item.name),
    // Read as "how far the ukulele sits below this instrument", which is
    // exactly the move the book's diagram has to make: the cancionero is drawn
    // for standard ukulele, so a cuatro chord X borrows the page for X−2.
    shapeShift: songbookShiftSemitones(UKULELE_STANDARD, tuning),
  };
}

export const INSTRUMENTS: readonly Instrument[] = [
  instrument("ukulele", "Ukulele", UKULELE_STANDARD),
  instrument("cuatro", "Cuatro", CUATRO_CAMBUR_PINTON),
];

/**
 * The ukulele, and the app is named after it.
 *
 * It is also the instrument every page is prerendered in, which is the reason
 * the toggle takes a paint to apply — see `InstrumentContext`.
 */
export const DEFAULT_INSTRUMENT_ID: InstrumentId = "ukulele";

/** The instrument for an id, or the ukulele for one this version does not know. */
export function instrumentById(id: string): Instrument {
  return (
    INSTRUMENTS.find((item) => item.id === id) ??
    (INSTRUMENTS.find(
      (item) => item.id === DEFAULT_INSTRUMENT_ID,
    ) as Instrument)
  );
}

/**
 * Where the reader's instrument lives.
 *
 * `localStorage`, and **one key for the app rather than one per song** — the
 * argument that was made for the tuning and against the per-song scroll pace. A
 * pace belongs to a song, because a merengue and a gaita do not scroll alike;
 * an instrument belongs to the room.
 *
 * **It is now the only key either of these two files owns.** The tuning had one
 * per instrument until `2.8.0`, which existed so a toggle could not leave a
 * cuatro tuning selected under a ukulele. With one tuning per instrument there
 * is nothing to choose and so nothing to remember.
 */
const STORAGE_KEY = "uv-instrument";

/** The stored instrument, or the ukulele. Every path returns a usable id. */
export function readInstrumentId(): InstrumentId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return DEFAULT_INSTRUMENT_ID;
    return instrumentById(stored).id;
  } catch {
    // Private mode throws outright on some browsers, and the ukulele is a fine
    // answer — it is the instrument the app is named after.
    return DEFAULT_INSTRUMENT_ID;
  }
}

/** Remember it. A full quota or private mode means it is simply not remembered. */
export function writeInstrumentId(id: InstrumentId): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Not remembered. The app still draws the instrument that is on screen.
  }
}
