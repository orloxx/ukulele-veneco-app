/**
 * The four tunings the afinador offers, and the one sentence that keeps the app
 * honest about two of them.
 *
 * Iker chose all four (2026-08-02) over the two that are safe. They are not the
 * same instrument: baritone's bottom string is D3 at 146.83 Hz and D tuning's
 * top is B4 at 493.88, so the span the detector has to cover is more than an
 * octave and a half — see `ANALYSIS_WINDOW` in `pitch.ts`, which is sized from
 * the bottom of it.
 *
 * **All four are the same relative tuning**, so a fingering is a fingering:
 * every diagram `ChordDiagram` draws stays a valid drawing under all of them.
 * What moves is the **name**. A shape that is `C` in standard is `D` in D tuning
 * (up a tone) and `G` in baritone (down a fourth) — and this app prints chord
 * names in the `chords:` block of all 276 songs, in every bracketed chord in
 * every lyric, in the tono chip and across `/song/<slug>/acordes`, none of which
 * knows what the reader tuned to.
 *
 * That is not a reason to drop the tunings and it is not a reason to transpose
 * the cancionero. It is a reason for `NAMES_MATCH_SONGBOOK` below, and for the
 * line the tuner screen prints when it is false. Unsaid, it would be the app
 * contradicting itself, which by this vault's own test is a bug rather than a
 * gap. **Transposing the collection to the reader's tuning is a different
 * milestone** — the backlog's *a transpose control* — and this is a second
 * argument for it rather than a part of it.
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
  /**
   * Whether the cancionero's chord names are true of this tuning.
   *
   * **Standard and low-G are the exempt pair, and it is not because they are the
   * popular ones.** They share every shape *and* every name: low-G moves the 4th
   * string down an octave, which changes the voicing and not one chord symbol.
   * D and baritone keep the shapes and move every name — a tone up and a fourth
   * down respectively — so a reader tuned to either is reading a songbook whose
   * chord names do not describe the sound coming out of their instrument. That
   * is what the tuner screen says out loud when this is false.
   */
  namesMatchSongbook: boolean;
}

export type TuningId = "standard" | "low-g" | "d" | "baritone";

const string = (name: string, octave: number): TuningString => ({
  name,
  octave,
  frequency: frequencyOf(name, octave),
});

export const TUNINGS: readonly Tuning[] = [
  {
    id: "standard",
    label: "Estándar — Sol Do Mi La",
    strings: [string("G", 4), string("C", 4), string("E", 4), string("A", 4)],
    namesMatchSongbook: true,
  },
  {
    id: "low-g",
    label: "Sol grave — Sol Do Mi La",
    strings: [string("G", 3), string("C", 4), string("E", 4), string("A", 4)],
    namesMatchSongbook: true,
  },
  {
    id: "d",
    label: "En Re — La Re Fa♯ Si",
    strings: [string("A", 4), string("D", 4), string("F#", 4), string("B", 4)],
    namesMatchSongbook: false,
  },
  {
    id: "baritone",
    label: "Barítono — Re Sol Si Mi",
    strings: [string("D", 3), string("G", 3), string("B", 3), string("E", 4)],
    namesMatchSongbook: false,
  },
];

export const DEFAULT_TUNING_ID: TuningId = "standard";

/** The tuning for an id, or standard for one this version does not know. */
export function tuningById(id: string): Tuning {
  return (
    TUNINGS.find((tuning) => tuning.id === id) ??
    (TUNINGS.find((tuning) => tuning.id === DEFAULT_TUNING_ID) as Tuning)
  );
}

/**
 * Where the reader's choice lives.
 *
 * `localStorage`, for the reason vault `DECISIONS.md` 18 already gave about the
 * scroll pace: it is a reader preference, not song data, and the IndexedDB store
 * holds *saved* songs — a tuning kept there could only exist for a song somebody
 * had saved, which has nothing to do with the instrument in front of them.
 *
 * **One key, not one per song.** That is where it differs from the pace: a pace
 * belongs to a song, because a merengue and a gaita do not scroll alike, and a
 * tuning belongs to the ukulele in the room. `src/lib/theme.ts` is the pattern.
 */
const STORAGE_KEY = "uv-tuning";

/** The stored tuning, or standard. Every path returns a usable id. */
export function readTuningId(): TuningId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return DEFAULT_TUNING_ID;
    return tuningById(stored).id;
  } catch {
    // Private mode throws outright on some browsers. Standard tuning is a fine
    // answer, and it is the one four readers in five want anyway.
    return DEFAULT_TUNING_ID;
  }
}

/** Remember it. A full quota or private mode means it is simply not remembered. */
export function writeTuningId(id: TuningId): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Not remembered. The tuner still works, on the tuning that is on screen.
  }
}
