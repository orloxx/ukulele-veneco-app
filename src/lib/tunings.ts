/**
 * The tunings the afinador offers, and the one sentence that keeps the app
 * honest about two of them.
 *
 * **They are grouped by instrument since M15, and that is not tidiness.** The
 * toggle switches the whole app (Iker, 2026-08-05), so one instrument is on
 * screen at a time and the picker shows that instrument's tunings and no
 * others. A single flat array would put a cuatro tuning in a ukulele's list —
 * and it would also print two entries a reader cannot tell apart, because the
 * ukulele's `En Re — La Re Fa♯ Si` and the cuatro's *cambur pintón* differ only
 * in the octave of the 1st string. They are never in the same list.
 *
 * Iker chose the ukulele's four (2026-08-02) over the two that are safe. They
 * are not the same instrument: baritone's bottom string is D3 at 146.83 Hz and
 * D tuning's top is B4 at 493.88, so the span the detector has to cover is more
 * than an octave and a half — see `ANALYSIS_WINDOW` in `pitch.ts`, which is
 * sized from the bottom of it.
 *
 * **The cuatro adds nothing to that span, and `M15 · 4` expected it to.** The
 * issue called the cuatro's 1st string "B3 at 123.47 Hz" and named the detector
 * the one thing that could genuinely not work. 123.47 Hz is **B2**; B3 is
 * 246.94, a fifth *above* baritone's D3 and the second-highest thing in this
 * file's whole range. Measured anyway, because the paragraph was right that the
 * claim had to be measured rather than assumed: 10.54 periods in the window at
 * 48kHz against D3's 6.26, and every cuatro string read to within 0.04 cents on
 * a synthesised pluck at both common sample rates, including 70 cents out
 * either way. `ANALYSIS_WINDOW` is unchanged, and the reason is stronger than
 * the milestone's — there is no new bottom to the range.
 *
 * **Every tuning here is the same relative tuning as its instrument's
 * reference**, so a fingering is a fingering: every diagram `ChordDiagram`
 * draws stays a valid drawing under all of them. What moves is the **name**. A
 * shape that is `C` in standard is `D` in D tuning (up a tone) and `G` in
 * baritone (down a fourth) — and this app prints chord names in the `chords:`
 * block of all 276 songs, in every bracketed chord in every lyric, in the tono
 * chip and across `/song/<slug>/acordes`, none of which knows what the reader
 * tuned to.
 *
 * That is not a reason to drop the tunings. It is the reason for
 * `namesMatchSongbook` below, and for the line the tuner screen prints when it
 * is false. Unsaid, it would be the app contradicting itself, which by this
 * vault's own test is a bug rather than a gap.
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
  id: TuningId;
  /** What the reader picks, in Spanish. */
  label: string;
  /** The strings, 4th to 1st — the order they sit under the fingers. */
  strings: TuningString[];
}

export type TuningId =
  | "standard"
  | "low-g"
  | "d"
  | "baritone"
  | "cambur-pinton";

const string = (name: string, octave: number): TuningString => ({
  name,
  octave,
  frequency: frequencyOf(name, octave),
});

/**
 * The ukulele's four. The first is its reference: the tuning the cancionero is
 * written for, and the one a reader who has chosen nothing gets.
 */
export const UKULELE_TUNINGS: readonly Tuning[] = [
  {
    id: "standard",
    label: "Estándar — Sol Do Mi La",
    strings: [string("G", 4), string("C", 4), string("E", 4), string("A", 4)],
  },
  {
    id: "low-g",
    label: "Sol grave — Sol Do Mi La",
    strings: [string("G", 3), string("C", 4), string("E", 4), string("A", 4)],
  },
  {
    id: "d",
    label: "En Re — La Re Fa♯ Si",
    strings: [string("A", 4), string("D", 4), string("F#", 4), string("B", 4)],
  },
  {
    id: "baritone",
    label: "Barítono — Re Sol Si Mi",
    strings: [string("D", 3), string("G", 3), string("B", 3), string("E", 4)],
  },
];

/**
 * The cuatro's one, and **one is a decision rather than a gap** (`M15 · 4`).
 *
 * *Cambur pintón*, the traditional re-entrant A4 D4 F♯4 B3. Neither Iker nor
 * the session that scoped M15 knows a second worth offering, and there is no
 * cuatro chart in this repo to arbitrate one — so a longer list would be the
 * app asserting something about the instrument that nobody has checked, which
 * is vault `DECISIONS.md` 27's failure in a new place.
 *
 * **A4 D4 F♯4 B4 will be re-proposed and was rejected.** It is the ukulele's
 * `d` tuning, and putting it here would let `M15 · Verification`'s substitute
 * ukulele be tuned without leaving cuatro mode. It is still not a cuatro
 * tuning, and a list that carries one to make a test convenient has stopped
 * describing the instrument. That pass toggles to ukulele, tunes with `d`, and
 * toggles back.
 *
 * A variant added later needs no new machinery: one that keeps the relative
 * tuning changes no diagram, and one that does not is already described by
 * `songbookShiftSemitones` and `namesMatchSongbook`.
 */
export const CUATRO_TUNINGS: readonly Tuning[] = [
  {
    id: "cambur-pinton",
    label: "Cambur pintón — La Re Fa♯ Si",
    strings: [string("A", 4), string("D", 4), string("F#", 4), string("B", 3)],
  },
];

/** Sharps, because the app writes chord roots that way. */
const NAMES_FROM_C = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

/** A note name moved by a number of semitones. Wraps, and never changes octave. */
export function transposeNoteName(name: string, semitones: number): string {
  const from = SEMITONE_FROM_C[name];
  if (from === undefined) return name;
  return NAMES_FROM_C[(((from + semitones) % 12) + 12) % 12];
}

/**
 * How far this tuning has moved the chord names its reference is written for,
 * in semitones.
 *
 * **Derived, not written down** — the same rule as the frequencies above, and
 * for a sharper reason: this number is what the caveat on the tuner screen is
 * built out of, so a hand-typed one would be a sentence confidently telling the
 * reader the wrong chord. It comes off the 3rd string, which is the one every
 * tuning has in the same place: standard's C4 against baritone's G3 is -5, and
 * against D tuning's D4 is +2.
 *
 * **The reference is an argument since M15, and that is `M15 · 4`'s point.** It
 * used to be standard ukulele, full stop, which would have the cuatro reporting
 * +2 against its own only tuning and firing the caveat on the one tuning it
 * must never fire on. What a tuning has moved is a fact about the *pair*.
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

/**
 * Whether the chord names the app prints are true of this tuning.
 *
 * **Derived from the shift rather than carried as a flag**, which is what
 * `M15 · 4` asked for: it is a fact about a tuning *and* the instrument it
 * belongs to, and two statements of one fact are how a tuner ends up confidently
 * disagreeing with itself.
 *
 * **Standard and low-G are the ukulele's exempt pair, and it is not because they
 * are the popular ones.** They share every shape *and* every name: low-G moves
 * the 4th string down an octave, which changes the voicing and not one chord
 * symbol. D and baritone keep the shapes and move every name — a tone up and a
 * fourth down respectively — so a reader tuned to either is reading a songbook
 * whose chord names do not describe the sound coming out of their instrument.
 * That is what the tuner screen says out loud when this is false.
 *
 * In cuatro mode it is true of *cambur pintón*, and that is the whole of M15
 * arriving here: the diagrams have moved to meet the names.
 */
export function namesMatchSongbook(tuning: Tuning, reference: Tuning): boolean {
  return songbookShiftSemitones(tuning, reference) === 0;
}

/** The tuning for an id, or the set's reference for one it does not hold. */
export function tuningById(tunings: readonly Tuning[], id: string): Tuning {
  return tunings.find((tuning) => tuning.id === id) ?? tunings[0];
}
