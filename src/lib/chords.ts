/**
 * Chord names as data — the parser, the twelve pitch classes, and the spelling.
 *
 * No React, no DOM, no `fs`. This is the half of M11 that can be checked
 * exhaustively, and `scripts/check-transpose.mjs` checks it against all 276
 * songs rather than against a handful of examples.
 *
 * **The parser is total: a name that does not parse throws.** Every chord in
 * the collection is a name the book printed, and a name this cannot read is a
 * transcription that needs looking at — not a chord to skip quietly, which
 * would drop it out of a transposed sheet and leave the reader a line with no
 * chord over it. `songs/` currently holds 143 distinct names and all 143 parse.
 *
 * **The quality is opaque and stays opaque.** A name is a root plus everything
 * after it, and this module never asks what the rest means. That is not
 * laziness: the collection prints `m7b5`, `7sus4`, `mmaj7`, `add9`, and also
 * `B²`, `Em7^`, `Em7M`, `B7aug9` and `C#b5` — transcriptions of things the book
 * draws, some of which are not standard notation at all. A parser that tried to
 * understand them would have to be wrong about at least five chords; one that
 * carries them through as a string is right about all of them, because
 * transposing a chord never changes its quality. It also means the vocabulary
 * index in `vocabulary.ts` is exact rather than approximate: `Em7^` transposes
 * to `F#m7^` and the index is asked whether the book prints *that*, which it
 * does not, and the honest answer is the one the reader gets.
 */

/**
 * Every root spelling the collection uses, to its pitch class.
 *
 * **The root is matched greedily on the accidental and never on the letter
 * alone**, which is the one place this quietly goes wrong: `B` and `Bb` are
 * different roots, and `Bbmaj7` read letter-first is `B` with a quality of
 * `bmaj7`. Splitting the regex so the accidental is part of the root — rather
 * than trimming a letter and hoping — is what makes that impossible.
 */
const ROOT_PITCH_CLASSES: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

export const SEMITONES = 12;

/** How a pitch class is written: with sharps, or with flats. */
export type Spelling = "sharp" | "flat";

const SHARP_NAMES = [
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
const FLAT_NAMES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

export interface ParsedChordName {
  /** The root as it was written — `Bb`, not `A#`. */
  root: string;
  /** Everything between the root and any slash bass. Never interpreted. */
  quality: string;
  /** The bass of a slash chord, as written, or undefined. */
  bass?: string;
  /** 0 = C. The root's spelling is not recoverable from this, on purpose. */
  pitchClass: number;
}

const CHORD_NAME = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/;

/**
 * Read a chord name.
 *
 * Throws on anything it cannot read, and the message names the chord — see the
 * note at the top of this file for why a silent skip is the worse failure.
 *
 * **The slash bass is handled and is currently unexercised.** No chord in
 * `songs/` has one today. It is here because a bass that did not move with the
 * root would be the kind of wrong that still looks right — `C/G` transposed up
 * two is `D/A`, and a transposer that carried `/G` through as part of an opaque
 * quality would print `D/G` and be confidently wrong. Handling it costs one
 * capture group; discovering it later costs a wrong chord in a printed sheet.
 */
export function parseChordName(name: string): ParsedChordName {
  const match = name.match(CHORD_NAME);
  const pitchClass = match ? ROOT_PITCH_CLASSES[match[1]] : undefined;

  if (!match || pitchClass === undefined) {
    throw new Error(
      `Unreadable chord name: ${JSON.stringify(name)}. Every name in songs/ ` +
        `is one the book printed, so this is a transcription to look at rather ` +
        `than a chord to skip.`,
    );
  }

  return {
    root: match[1],
    quality: match[2],
    bass: match[3],
    pitchClass,
  };
}

/** Write a pitch class out, with sharps or with flats. */
export function spellPitchClass(
  pitchClass: number,
  spelling: Spelling,
): string {
  const index = ((pitchClass % SEMITONES) + SEMITONES) % SEMITONES;
  return spelling === "sharp" ? SHARP_NAMES[index] : FLAT_NAMES[index];
}

/**
 * A key, as the `key` frontmatter field means it: a tonic and a mode.
 *
 * The mode is the whole of what is kept, because it is the whole of what the
 * spelling rule needs. `key: Am` is minor, `key: C` is major, and nothing in
 * `songs/` writes a key any other way.
 */
export interface MusicalKey {
  pitchClass: number;
  minor: boolean;
}

/**
 * The conventional name and accidental of each of the twelve major keys.
 *
 * A table rather than a computation off the circle of fifths, because the two
 * enharmonic ties are decided by convention rather than by arithmetic and a
 * derivation would have to special-case them anyway. **F# major (6 sharps) is
 * conventional over Gb major (6 flats), and Eb minor (6 flats) is conventional
 * over D# minor (6 sharps)** — which is why the minor row below is a table of
 * its own and not `MAJOR_KEYS[(pc + 3) % 12]`, the derivation that looks right
 * and gives `D#m` for a key the collection itself writes `Ebm`.
 *
 * **C major and A minor have no accidentals to prefer, and take flats.** Both
 * halves of that are measured rather than assumed: the collection spells its
 * black keys by context and not by habit — 53 `C#` against 14 `Db`, 93 `F#`
 * against 7 `Gb`, but 61 `Eb` against 8 `D#` and 96 `Bb` against no `A#` at all
 * — which is the key-signature rule already at work in the book. Aggregated it
 * leans flat, 218 to 167, so flats is what the neutral key inherits. The chords
 * that actually turn up chromatically in C are the borrowed ones — bIII, bVI,
 * bVII — and those are Eb, Ab and Bb.
 */
const MAJOR_KEYS: { name: string; spelling: Spelling }[] = [
  { name: "C", spelling: "flat" },
  { name: "Db", spelling: "flat" },
  { name: "D", spelling: "sharp" },
  { name: "Eb", spelling: "flat" },
  { name: "E", spelling: "sharp" },
  { name: "F", spelling: "flat" },
  { name: "F#", spelling: "sharp" },
  { name: "G", spelling: "sharp" },
  { name: "Ab", spelling: "flat" },
  { name: "A", spelling: "sharp" },
  { name: "Bb", spelling: "flat" },
  { name: "B", spelling: "sharp" },
];

const MINOR_KEYS: { name: string; spelling: Spelling }[] = [
  { name: "Cm", spelling: "flat" },
  { name: "C#m", spelling: "sharp" },
  { name: "Dm", spelling: "flat" },
  { name: "Ebm", spelling: "flat" },
  { name: "Em", spelling: "sharp" },
  { name: "Fm", spelling: "flat" },
  { name: "F#m", spelling: "sharp" },
  { name: "Gm", spelling: "flat" },
  { name: "G#m", spelling: "sharp" },
  { name: "Am", spelling: "flat" },
  { name: "Bbm", spelling: "flat" },
  { name: "Bm", spelling: "sharp" },
];

function keyRow(key: MusicalKey) {
  const index = ((key.pitchClass % SEMITONES) + SEMITONES) % SEMITONES;
  return key.minor ? MINOR_KEYS[index] : MAJOR_KEYS[index];
}

/**
 * The key a `key:` field names, or nothing.
 *
 * **Twelve songs write more than one**, separated by semicolons — `A; Bb`,
 * `G; E; C`, `B; C; D; Eb` — because the book prints a song that modulates. The
 * first is the one the sheet starts in and the one this reads; `transposeKey`
 * moves all of them, so the chip stays truthful about the whole song while the
 * spelling follows the key it opens in.
 */
export function parseKey(key: string): MusicalKey | null {
  const first = key.split(";")[0]?.trim();
  if (!first) return null;

  const match = first.match(/^([A-G][#b]?)(m?)$/);
  const pitchClass = match ? ROOT_PITCH_CLASSES[match[1]] : undefined;
  if (!match || pitchClass === undefined) return null;

  return { pitchClass, minor: match[2] === "m" };
}

/** Which way a key spells its black notes. Flats when it has no opinion. */
export function spellingForKey(key: MusicalKey): Spelling {
  return keyRow(key).spelling;
}

/** The conventional name of a key — `Ebm`, never `D#m`. */
export function spellKey(key: MusicalKey): string {
  return keyRow(key).name;
}

/** The same key, moved. */
export function transposeKey(key: MusicalKey, semitones: number): MusicalKey {
  return {
    pitchClass:
      (((key.pitchClass + semitones) % SEMITONES) + SEMITONES) % SEMITONES,
    minor: key.minor,
  };
}

/**
 * A chord name, moved, and written the way the target key writes its notes.
 *
 * **Spelling is presentation and nothing else here, which is what makes it safe
 * to choose for readability.** A fingering is found by pitch class (see
 * `vocabulary.ts`), so `C#7` and `Db7` reach the same shape and the same book
 * page; picking one cannot make a chord unavailable, and cannot put a fingering
 * under a name it does not belong to. What it can do is print a chord that is
 * musically right and reads as wrong to anybody who knows the key, which is why
 * the target key decides rather than a global preference for sharps.
 *
 * A shift of zero still goes through the whole path — parse, move by nothing,
 * respell — and that is deliberate. It means the printed key is rendered by the
 * same code as every other key rather than by a branch that skips it, so a bug
 * in here cannot hide behind the case the reader sees first. It also means a
 * name may come back respelled at zero if the file disagrees with its own key
 * signature; `transposeSong` returns the song's own names at zero for exactly
 * that reason, and says so.
 */
export function transposeChordName(
  name: string,
  semitones: number,
  spelling: Spelling,
): string {
  const { quality, bass, pitchClass } = parseChordName(name);

  const move = (pc: number) =>
    spellPitchClass(
      (((pc + semitones) % SEMITONES) + SEMITONES) % SEMITONES,
      spelling,
    );

  const root = move(pitchClass);
  if (!bass) return `${root}${quality}`;

  const bassPitchClass = ROOT_PITCH_CLASSES[bass];
  return `${root}${quality}/${move(bassPitchClass)}`;
}
