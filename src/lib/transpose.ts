/**
 * Moving a song to another key, as pure functions over data.
 *
 * No React and no DOM, for the same reason `pitch.ts` has none: this is the
 * half that can be checked exhaustively, and with 276 songs and eleven
 * transpositions there are 3036 song-and-key pairs to check it against. There
 * is no excuse for sampling, and `scripts/check-transpose.mjs` does not.
 *
 * **What makes this hard is not the arithmetic.** Transposing a name is ten
 * lines. The constraint is vault `DECISIONS.md` 6 — a fingering is the book's
 * or it does not exist — so every chord this produces has to be one the
 * cancionero already prints, and `vocabulary.ts` is what knows. The result is
 * that a song can be offered *some* keys and not others: measured across the
 * collection, 164 songs can offer all eleven and 18 can offer none.
 *
 * **You cannot compute your way out of that gap**, and the escape that suggests
 * itself does not work: 93 of the book's 171 fingerings use at least one open
 * string, so sliding a shape up the neck is not available. The chords most
 * often missing are not exotic either — up a semitone wants `C#maj7`, `Fdim7`
 * and `G#m6`, and the book prints none of them anywhere.
 *
 * ## Sharps or flats is decided by the book before it is decided by the key
 *
 * The conventional rule — sharp keys take sharps, flat keys take flats — is
 * right and is not sufficient here, and the difference was measured. Applied
 * blanketly it asks for a name the cancionero never writes **562 times** across
 * the collection: `A#` where the book writes `Bb` all 96 times and `A#` not
 * once, `D#7` for its `Eb7`, `G#maj7` for its `Abmaj7`. And the book spells
 * against its own key signature **66 times in 2140 chords**, so re-spelling the
 * printed key from the signature would silently edit the transcription on 3% of
 * its chords. `resolveChord` below is the ladder that resolves both, and it is
 * the part of this module most likely to be "simplified" into being wrong.
 *
 * ## The capo composes, and is deliberately left alone
 *
 * 50 songs carry a `Capo <n>` badge (`DECISIONS.md` 7), and a reader
 * transposing one is applying two shifts at once. Of the three options —
 * refuse, compose, ignore — **this composes, and it does so by not touching the
 * capo at all.**
 *
 * That works because **`key` is the written key and not the sounding one**,
 * which is measured rather than assumed: on 44 of the 50 capo songs the `key`
 * field is literally one of the chord names printed on the page, and the six
 * that are not are the ones whose `key` field names several keys. So the capo
 * and the shapes are independent. Leave the capo where the book put it, move
 * the shapes by `n` semitones, and the sounding key moves by exactly `n` too —
 * the arithmetic composes on its own and needs no arbitration.
 *
 * Refusing was the alternative and it is worse: it would withhold the feature
 * from 18% of the book for a problem that does not exist. What the screen owes
 * the reader instead is clarity about which key is which, and it says the tono
 * is the written one — see `TransposeControl`.
 */

import {
  type MusicalKey,
  parseChordName,
  parseKey,
  SEMITONES,
  type Spelling,
  spellingForKey,
  spellKey,
  transposeChordName,
  transposeKey,
} from "@/lib/chords";
import {
  type ChordVocabulary,
  lookupChord,
  vocabularyKey,
} from "@/lib/vocabulary";
import type { Chord } from "@/types/song";

/** What a song looks like to this module. */
export interface TransposableSong {
  metadata: { key: string };
  chordDefinitions: Chord[];
}

/** One key a song can be played in, with everything the screen needs to draw it. */
export interface Transposition {
  /** 0 is the key the book printed. */
  semitones: number;
  /**
   * The tono, as the chip prints it — every key in the field, moved.
   * This is the *written* key. A capo, if the song has one, still applies.
   */
  key: string;
  /** Every chord the song defines, moved, with the book's fingering for it. */
  chords: Chord[];
  /**
   * The song's own chord names to the moved ones, for the lyric.
   *
   * `LyricsDisplay` renders the names the file holds, so the sheet is moved by
   * looking each one up here rather than by re-parsing the lyric — which keeps
   * the most sensitive code in the app out of the chord-arithmetic business.
   */
  names: Record<string, string>;
}

/** A key with no opinion about its black notes still has to write them somehow. */
const DEFAULT_SPELLING: Spelling = "flat";

function spellingFor(key: MusicalKey | null, semitones: number): Spelling {
  if (!key) return DEFAULT_SPELLING;
  return spellingForKey(transposeKey(key, semitones));
}

/**
 * Move a `key:` field, keeping every key in it.
 *
 * Twelve songs name more than one — `A; Bb`, `B; C; D; Eb` — because the book
 * prints a song that modulates. Moving only the first would make the chip lie
 * about the rest of the song, so each is moved and the separator is preserved.
 * Anything that does not parse is passed through untouched: the chip is
 * display, and a key nobody can read is still better shown than dropped.
 *
 * Each key is written by `spellKey`, which holds the conventional name of all
 * twelve in both modes, so this needs no spelling argument: a key is named the
 * way a musician names it — `Db` rather than `C#` for the one with five flats
 * against seven sharps — independently of the chords underneath it. The chords
 * take their spelling from the song's *first* key, which is the one the sheet
 * opens in and the one `spellingFor` reads.
 */
export function transposeKeyField(field: string, semitones: number): string {
  if (!field.trim()) return field;

  return field
    .split(";")
    .map((part) => {
      const trimmed = part.trim();
      const key = parseKey(trimmed);
      if (!key) return trimmed;
      return spellKey(transposeKey(key, semitones));
    })
    .join("; ");
}

/**
 * Resolving one chord, by asking for the most specific thing the book says.
 *
 * Both halves of a chord — what it is called and how it is drawn — come off the
 * same preference ladder, and every rung of it is the cancionero rather than an
 * opinion invented here. `DECISIONS.md` 6 forbids inventing a *fingering*; the
 * same argument one step over forbids inventing a *name*, because the spelling
 * is the vocabulary a player says out loud.
 *
 * **The name:**
 *
 * 1. **The chord's own name, when the move lands it back on itself.** The book
 *    has already said what this song calls this chord, and that is as specific
 *    as evidence gets. Measured: the collection spells against its own key
 *    signature 66 times in 2140 chords — `Bb` in D major, `C#` in C, `Eb` in G
 *    — so a sheet re-spelt from the signature would quietly edit the
 *    transcription on 3% of its chords while the reader had asked for nothing.
 * 2. **The target key's signature**, if the book prints that name anywhere.
 *    This is the conventional rule and the one `M11 · 2` asked for: sharp keys
 *    take sharps, flat keys take flats, because a chord spelt against its key
 *    is musically right and reads as wrong to anyone who knows the key.
 * 3. **The book's most frequent name for the chord.** The signature is not
 *    always a spelling the cancionero uses: applied blanketly it asks for a
 *    name the book never writes 562 times across the collection — `A#` in a
 *    sharp key where the book writes `Bb` every one of its 96 times, `D#7` for
 *    its `Eb7`. The book's own usage wins over the convention.
 *
 * **The fingering:**
 *
 * 1. **The song's own page**, for any chord it already prints at that pitch
 *    class and quality. A song in C with a G in it, moved up two, produces an A
 *    and also the G the reader was already playing; drawing them a different G
 *    because the collection prefers another voicing elsewhere would be the app
 *    disagreeing with the page in front of it.
 * 2. **The book's most frequent voicing** — the collection's own vote, rather
 *    than an opinion about which shape is easier.
 *
 * **Rung 1 of each is why a shift of zero needs no special case.** At zero
 * every chord lands on itself, so both ladders stop at their first rung and the
 * song comes back exactly as the book printed it — by the general rule, not by
 * a branch that skips the work. It is also why rung 1 of the *name* ladder is
 * about this chord landing on itself rather than about the song merely owning
 * something at the target slot: at four semitones a song with an `Eb` in it has
 * a different chord arriving on that pitch class, and lending it the `Eb` name
 * would print a flat in the middle of F# major.
 */
function resolveChord(
  ownChords: Map<string, Chord>,
  vocabulary: ChordVocabulary,
  chord: Chord,
  semitones: number,
  spelling: Spelling,
): Chord | null {
  const { quality, pitchClass } = parseChordName(chord.name);
  const target =
    (((pitchClass + semitones) % SEMITONES) + SEMITONES) % SEMITONES;

  const entry = lookupChord(vocabulary, target, quality);
  if (!entry || entry.fingerings.length === 0) return null;

  const bySignature = transposeChordName(chord.name, semitones, spelling);
  const name =
    target === pitchClass
      ? chord.name
      : entry.names.includes(bySignature)
        ? bySignature
        : entry.names[0];

  const own = ownChords.get(vocabularyKey(target, quality));

  return { name, positions: (own ?? entry.fingerings[0]).positions };
}

/**
 * A song in another key, or `null` when the book cannot supply the chords.
 *
 * `null` is the honest answer and the whole reason this returns one: the
 * alternative is a sheet with a chord on it that has no diagram, or a diagram
 * invented for a shape the cancionero never drew.
 */
export function transposeSong(
  song: TransposableSong,
  semitones: number,
  vocabulary: ChordVocabulary,
): Transposition | null {
  const key = parseKey(song.metadata.key);
  const spelling = spellingFor(key, semitones);

  // The song's own chords, by what they *are* rather than by what they are
  // called, so the lookup folds enharmonics the same way the vocabulary does.
  const ownChords = new Map<string, Chord>();
  for (const chord of song.chordDefinitions) {
    const { pitchClass, quality } = parseChordName(chord.name);
    const slot = vocabularyKey(pitchClass, quality);
    if (!ownChords.has(slot)) ownChords.set(slot, chord);
  }

  const chords: Chord[] = [];
  const names: Record<string, string> = {};

  for (const chord of song.chordDefinitions) {
    const resolved = resolveChord(
      ownChords,
      vocabulary,
      chord,
      semitones,
      spelling,
    );

    if (!resolved) return null;

    names[chord.name] = resolved.name;
    if (!chords.some((existing) => existing.name === resolved.name)) {
      chords.push(resolved);
    }
  }

  return {
    semitones,
    key: transposeKeyField(song.metadata.key, semitones),
    chords,
    names,
  };
}

/**
 * Every key this song can be played in, printed key first.
 *
 * The list the control renders, and it is computed rather than guessed: 164
 * songs come back with all twelve entries, 18 come back with only the one they
 * were printed in, and the screen has to say something true about the second
 * case rather than offering a key it cannot draw.
 */
export function buildTranspositions(
  song: TransposableSong,
  vocabulary: ChordVocabulary,
): Transposition[] {
  const out: Transposition[] = [];
  for (let semitones = 0; semitones < SEMITONES; semitones++) {
    const transposition = transposeSong(song, semitones, vocabulary);
    if (transposition) out.push(transposition);
  }
  return out;
}
