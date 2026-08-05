/**
 * How each instrument is tuned — one tuning each, and that is the whole file.
 *
 * **It offered five until `2.8.0` and now offers two** (Iker, 2026-08-05). The
 * ukulele had standard, low-G, D and baritone behind a picker; the cuatro has
 * only ever had *cambur pintón*. What the four bought was a tuner for
 * instruments this cancionero is not written for, and what they cost was a
 * screen that had to explain itself: **a shape that is `C` in standard is `D` in
 * D tuning and `G` in baritone**, and this app prints chord names in the
 * `chords:` block of all 276 songs, in every bracketed chord in every lyric, in
 * the tono chip and across `/song/<slug>/acordes`, none of which knew what the
 * reader had tuned to. That contradiction needed a caveat under the picker, and
 * the caveat needed `namesMatchSongbook`, `songbookShiftSemitones` against a
 * reference, and — for one release — a sentence pointing at the toggle that
 * would fix it.
 *
 * **All of it is gone with the picker, because the contradiction is gone with
 * it.** Each instrument now has exactly the tuning its chord names are true of,
 * so there is nothing to warn about and no state to remember. See vault
 * `DECISIONS.md` 33.
 *
 * The two are still a tone apart in every pitch class, which is what M15 stands
 * on and is not affected by any of this — see `instrument.ts`.
 */

/** Concert pitch. Every frequency in this file is derived from it. */
const A4_HZ = 440;
const A4_MIDI = 69;

const SEMITONE_FROM_C: Record<string, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

/**
 * A note's frequency in twelve-tone equal temperament.
 *
 * **Derived rather than pasted.** A table of decimals beside a table of note
 * names is two statements of one fact, and the day somebody corrects a typo in
 * one of them the other keeps the old value silently — a tuner that is confidently
 * wrong about one string. Here the note name is the only thing written down.
 */
export function frequencyOf(name: string, octave: number): number {
  const semitone = SEMITONE_FROM_C[name];
  if (semitone === undefined) {
    throw new Error(`Not a note name: ${name}`);
  }
  const midi = semitone + (octave + 1) * 12;
  return A4_HZ * 2 ** ((midi - A4_MIDI) / 12);
}

export interface TuningString {
  /** The letter, as the rest of the app writes chord roots. */
  name: string;
  octave: number;
  /** Hz, from `frequencyOf`. Never written by hand. */
  frequency: number;
}

export interface Tuning {
  /** What the tuner prints, in Spanish. Not a control any more — a statement. */
  label: string;
  /** The strings, 4th to 1st — the order they sit under the fingers. */
  strings: TuningString[];
}

const string = (name: string, octave: number): TuningString => ({
  name,
  octave,
  frequency: frequencyOf(name, octave),
});

/** The tuning the cancionero is written for, and the only one the app draws. */
export const UKULELE_STANDARD: Tuning = {
  label: "Estándar — Sol Do Mi La",
  strings: [string("G", 4), string("C", 4), string("E", 4), string("A", 4)],
};

/**
 * *Cambur pintón* — the cuatro, and **A3 rather than A4 on the 4th string**.
 *
 * That octave was wrong from the milestone's scoping until `2.8.0`, in every
 * file that named the tuning, and **Iker corrected it against the instrument**
 * (2026-08-05) — which is the only authority there is on a cuatro in a project
 * whose premise is that nobody here can get one.
 *
 * **Nothing about M15 moved when it was fixed, and that is the point rather
 * than a relief.** Every claim the milestone makes is about *pitch classes*: the
 * cuatro is the ukulele up a tone in all four of them, so a borrowed shape
 * sounds the right chord regardless of which octave any string sits in. The
 * milestone said so in as many words — *"the octave the 1st string sits in never
 * enters into it, which is what makes the claim safe"* — and the wrong octave on
 * a *different* string is the test of that sentence it did not know it was
 * writing. What did move is the 4th string's frequency on screen, 440 Hz to
 * 220, which is a tuner reading nobody could have tuned to.
 *
 * It is still re-entrant: A3 is the lowest of the four and B3 sits above it,
 * with the 1st string not the highest.
 */
export const CUATRO_CAMBUR_PINTON: Tuning = {
  label: "Cambur pintón — La Re Fa♯ Si",
  strings: [string("A", 3), string("D", 4), string("F#", 4), string("B", 3)],
};

/**
 * How far one tuning has moved the chord names another is written for, in
 * semitones.
 *
 * **Derived, not written down** — the same rule as the frequencies above. It is
 * what `Instrument.shapeShift` is built out of, so a hand-typed number here is
 * every chord diagram in the app drawn for the wrong instrument. It comes off
 * the 3rd string, which both tunings have in the same place: standard's C4
 * against *cambur pintón*'s D4 is +2.
 *
 * **The 3rd string is a probe and not the claim.** What has to be true is that
 * *all four* strings are a tone apart in pitch class, and that is asserted in
 * `scripts/check-transpose.mjs` from two independently written string tables —
 * never here, where it would be the app checking its own arithmetic.
 */
export function songbookShiftSemitones(
  tuning: Tuning,
  reference: Tuning,
): number {
  return Math.round(
    12 *
      Math.log2(tuning.strings[1].frequency / reference.strings[1].frequency),
  );
}
