/**
 * Ukulele or cuatro — the instrument every diagram in the app is drawn for.
 *
 * **Nothing in `songs/` is transcribed twice and no fingering is invented**,
 * which is why M15 is a far smaller milestone than it sounds. The ukulele is
 * G4 C4 E4 A4 and the cuatro is A4 D4 F♯4 B3. String by string that is +2, +2,
 * +2 and −10 semitones, and **−10 is +2 modulo the octave** — so a fret shape
 * held on a cuatro sounds the same *pitch classes* as that shape held on a
 * ukulele, named a tone higher. The octave the 1st string sits in never enters
 * into it, which is what makes the claim safe under any cuatro variant.
 *
 * So **the cuatro diagram for chord X is the book's own ukulele diagram for
 * X−2**, and `shapeShift` below is that −2. Vault `DECISIONS.md` 6 is satisfied
 * rather than worked around: the reader's fingers land exactly where the book
 * drew them, and only the label over the grid changes. The book says the same
 * thing in its own words — ukulele and cuatro are a capo 2 apart.
 *
 * **The shift is derived and must stay derived.** It is the interval between an
 * instrument's reference tuning and the ukulele's, read off the 3rd string the
 * way `songbookShiftSemitones` reads every other shift. A hand-typed −2 is a
 * number that cannot be wrong on the day it is written and cannot be right
 * afterwards. `scripts/check-transpose.mjs` proves the four-string pitch-class
 * identity the shift stands on **from two independently written string
 * tables** — deriving the cuatro's strings as the ukulele's plus two and then
 * asserting they are the ukulele's plus two is BUG-019's circularity, and it
 * would pass for ever on a wrong tuning.
 */

import {
  CUATRO_TUNINGS,
  samePitchClasses,
  songbookShiftSemitones,
  type Tuning,
  type TuningId,
  UKULELE_TUNINGS,
} from "@/lib/tunings";

export type InstrumentId = "ukulele" | "cuatro";

export interface Instrument {
  id: InstrumentId;
  /** What the toggle says, and what the app calls it out loud. */
  label: string;
  /** The tunings `/afinador` offers for it, and only these (`M15 · 4`). */
  tunings: readonly Tuning[];
  /**
   * The tuning this instrument's chord names are true of.
   *
   * It doubles as the default, and that is not a coincidence worth splitting
   * into two fields: a reader who has chosen nothing should get the tuning the
   * cancionero is written for.
   */
  reference: Tuning;
  /** The strings 4th to 1st, as `ChordDiagram` labels them. Off the reference. */
  stringNames: readonly string[];
  /**
   * How far the book's diagram moves to become this instrument's — 0 for the
   * ukulele, −2 for the cuatro. See the note at the top.
   */
  shapeShift: number;
  /**
   * Where this instrument's tuning is remembered.
   *
   * **Per instrument, which is `M15 · 4`'s point**: with one key a toggle would
   * leave a cuatro tuning selected under a ukulele, or fall back to a standard
   * that is not in the list on screen. The ukulele's is the unsuffixed
   * `uv-tuning` it has always been — every install already holds one, and
   * renaming it would silently reset a baritone player to standard for nothing.
   */
  tuningStorageKey: string;
}

const UKULELE_REFERENCE = UKULELE_TUNINGS[0];

function instrument(
  id: InstrumentId,
  label: string,
  tunings: readonly Tuning[],
  tuningStorageKey: string,
): Instrument {
  const reference = tunings[0];
  return {
    id,
    label,
    tunings,
    reference,
    stringNames: reference.strings.map((item) => item.name),
    // Read as "how far the ukulele sits below this instrument", which is
    // exactly the move the book's diagram has to make: the cancionero is
    // drawn for standard ukulele, so a cuatro chord X borrows the page for
    // X−2. Derived off the same 3rd string every other shift here is read off.
    shapeShift: songbookShiftSemitones(UKULELE_REFERENCE, reference),
    tuningStorageKey,
  };
}

export const INSTRUMENTS: readonly Instrument[] = [
  instrument("ukulele", "Ukulele", UKULELE_TUNINGS, "uv-tuning"),
  instrument("cuatro", "Cuatro", CUATRO_TUNINGS, "uv-tuning-cuatro"),
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
 * The other instrument that is tuned like this, if there is one.
 *
 * **There is exactly one such pair today and it is not a coincidence**: the
 * ukulele's `d` tuning is A D F♯ B and so is the cuatro's *cambur pintón*,
 * differing only in the octave of the 1st string. `M15 · Verification` is built
 * on that — a ukulele re-tuned to `d` is the pitch-class-exact substitute for a
 * cuatro nobody here can get.
 *
 * What it is *for* is the sentence the tuner prints. A reader on `d` is told
 * that the cancionero's chord names are not the ones their instrument is
 * sounding, which is true and, since `2.7.0`, incomplete: they are one toggle
 * away from an app that redraws every diagram for exactly that tuning and makes
 * the names true again. Iker found that on the first line of `M15 ·
 * Verification`'s own checklist.
 *
 * **Derived, and it has to stay derived.** Naming the pair by hand would be a
 * fact about two tunings written in a third place, wrong the first time either
 * of them moves — and it is the sort of wrong that reads as confident advice.
 */
export function instrumentTunedLike(
  tuning: Tuning,
  exclude: Instrument,
): Instrument | undefined {
  return INSTRUMENTS.find(
    (item) =>
      item.id !== exclude.id && samePitchClasses(item.reference, tuning),
  );
}

/**
 * Where the reader's instrument lives.
 *
 * `localStorage`, and **one key for the app rather than one per song** — the
 * argument `tunings.ts` makes for the tuning and against the per-song scroll
 * pace. A pace belongs to a song, because a merengue and a gaita do not scroll
 * alike; an instrument belongs to the room.
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

/**
 * The tuning this instrument was left in, or its reference.
 *
 * It lives here rather than in `tunings.ts` because the key is a fact about the
 * instrument and `tunings.ts` deliberately knows nothing about instruments — it
 * holds the tunings, and this holds what belongs to the reader's chosen one.
 */
export function readTuningId(item: Instrument): TuningId {
  try {
    const stored = window.localStorage.getItem(item.tuningStorageKey);
    if (stored === null) return item.reference.id;
    const found = item.tunings.find((tuning) => tuning.id === stored);
    return found ? found.id : item.reference.id;
  } catch {
    return item.reference.id;
  }
}

/** Remember it, under this instrument's own key. */
export function writeTuningId(item: Instrument, id: TuningId): void {
  try {
    window.localStorage.setItem(item.tuningStorageKey, id);
  } catch {
    // Not remembered. The tuner still works, on the tuning that is on screen.
  }
}
