/**
 * The book's chord vocabulary — what the cancionero can and cannot play.
 *
 * This exists because of one rule, and the rule is the whole of M11's design:
 * **vault `DECISIONS.md` 6 — fingerings follow the book's diagrams, not the
 * standard shapes.** So a transposed chord cannot have a fingering invented for
 * it. It has to be one the book already prints, somewhere, on some page. That
 * turns "transpose a song" from a string-manipulation exercise into a question
 * about a fixed vocabulary, and this module is the thing that can answer it.
 *
 * Measured across `songs/` today: **143 distinct chord names**, which collapse
 * to **127 distinct (pitch class, quality) pairs** once enharmonics fold,
 * carrying **163 pair-and-fingering associations** over 137 distinct position
 * strings. `scripts/check-transpose.mjs` asserts all four numbers.
 *
 * Those last two numbers were 171 and 146 until BUG-019, and the eight that
 * went were not real voicings: they were barred chords whose covered strings
 * had been read as open, so `Db` carried a `1014` that no page ever drew
 * alongside the `1114` that every page did.
 *
 * **The index is keyed by pitch class, not by written root, and that is
 * load-bearing.** The collection writes both spellings — 53 `C#` against 14
 * `Db`, 8 `D#` against 61 `Eb` — so an index keyed by name would look up `C#7`,
 * miss the `Db7` the book prints on another page, and report a chord
 * unavailable that the reader could have played. Folding them is what takes 143
 * names down to 127 pairs, and those sixteen are not a rounding error: they are
 * sixteen chords that would otherwise be invisible.
 *
 * **A name is deliberately not deduplicated to one fingering.** `DECISIONS.md`
 * 6 is per song rather than per chord name — the book draws `D7` as `2020` on
 * page 6 and `2223` on page 13, and both are right on their own page. So an
 * entry holds every fingering the book gives that chord, with the songs it
 * appears in; choosing between them is `transpose.ts`'s problem and it makes
 * the choice explicitly.
 */

import { parseChordName } from "@/lib/chords";
import type { Chord } from "@/types/song";

/** One fingering the book prints for a chord, and where it prints it. */
export interface VocabularyFingering {
  /** The four-digit fret string, exactly as `songs/` holds it. */
  positions: string;
  /**
   * The slugs of the songs that print it, sorted.
   *
   * Kept so a transposed chord can be traced back to a page of the book rather
   * than merely asserted to exist — which is what makes `DECISIONS.md` 6
   * checkable instead of intended.
   */
  sources: string[];
}

/**
 * Everything the book says about one chord: what it calls it, and how it draws
 * it.
 *
 * **The names matter as much as the fingerings, and that was measured.** The
 * conventional rule is that the key signature decides the spelling — sharp keys
 * take sharps, flat keys take flats — and applied blanketly across the
 * collection it produces a name the cancionero never writes **562 times**:
 * `A#` where the book always writes `Bb`, `D#7` for its `Eb7`, `G#maj7` for its
 * `Abmaj7`. The book prints no `A#` at all, anywhere, in 2140 chords.
 *
 * `DECISIONS.md` 6 is about fingerings, so this is not that rule — but it is
 * the same argument one step over: an app that re-spells the cancionero's
 * chords is disagreeing with its source in the one vocabulary a player reads
 * out loud. So the key signature chooses, and this list is what it chooses
 * *from*.
 */
export interface VocabularyEntry {
  /** The names the book writes for this chord, most frequently printed first. */
  names: string[];
  /** The fingerings it draws for it, most frequently printed first. */
  fingerings: VocabularyFingering[];
}

/** Keyed by `pitchClass|quality`. See `vocabularyKey`. */
export type ChordVocabulary = Map<string, VocabularyEntry>;

export function vocabularyKey(pitchClass: number, quality: string): string {
  return `${pitchClass}|${quality}`;
}

/** The least a song has to be for the vocabulary to read it. */
export interface VocabularySong {
  slug: string;
  chordDefinitions: Chord[];
}

/**
 * Read the whole collection into an index.
 *
 * Pure, and takes the songs rather than reading them: `songs.ts` is the only
 * reader of `songs/` and stays that way, and a pure function over an array is
 * what lets `scripts/check-transpose.mjs` run this over all 276 songs without
 * a build.
 *
 * Each entry's fingerings are sorted **most frequently printed first**, tied by
 * the first song that prints them, so the order is stable across runs and a
 * caller taking `[0]` gets the book's own most common voicing rather than
 * whichever song happened to be read first.
 */
export function buildChordVocabulary(songs: VocabularySong[]): ChordVocabulary {
  const positionsByKey = new Map<string, Map<string, string[]>>();
  const namesByKey = new Map<string, Map<string, number>>();

  for (const song of songs) {
    for (const chord of song.chordDefinitions) {
      const { pitchClass, quality } = parseChordName(chord.name);
      const key = vocabularyKey(pitchClass, quality);

      let fingerings = positionsByKey.get(key);
      if (!fingerings) {
        fingerings = new Map();
        positionsByKey.set(key, fingerings);
      }
      const sources = fingerings.get(chord.positions);
      if (sources) sources.push(song.slug);
      else fingerings.set(chord.positions, [song.slug]);

      let names = namesByKey.get(key);
      if (!names) {
        names = new Map();
        namesByKey.set(key, names);
      }
      names.set(chord.name, (names.get(chord.name) ?? 0) + 1);
    }
  }

  const vocabulary: ChordVocabulary = new Map();
  for (const [key, fingerings] of positionsByKey) {
    vocabulary.set(key, {
      names: [...(namesByKey.get(key) ?? new Map())]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([name]) => name),
      fingerings: [...fingerings]
        .map(([positions, sources]) => ({
          positions,
          sources: [...sources].sort(),
        }))
        .sort(
          (a, b) =>
            b.sources.length - a.sources.length ||
            a.sources[0].localeCompare(b.sources[0]),
        ),
    });
  }

  return vocabulary;
}

/** Everything the book says about one chord, or nothing at all. */
export function lookupChord(
  vocabulary: ChordVocabulary,
  pitchClass: number,
  quality: string,
): VocabularyEntry | undefined {
  return vocabulary.get(vocabularyKey(pitchClass, quality));
}
