/**
 * How hard a song is to play, and the whole answer is how many chords it asks
 * you to remember.
 *
 * **The criterion is the book's own.** The cancionero carries three indexes and
 * the third is by chord count, used there as a difficulty proxy — so this is not
 * a scale invented for the app, it is the one Ciro Durán already printed.
 *
 * The count is `metadata.chords.length` and nothing is stored: the frontmatter's
 * `chords` list is already the song's distinct chords, so no song file is edited,
 * no field is added to `SongMetadata`, and `pnpm validate` and `pnpm transpose`
 * are untouched by this feature.
 *
 * ## The bands are measured, and the boundaries are the only interesting part
 *
 * Over all 276 songs, 2026-08-02 — the distribution the cut points were chosen
 * from, rather than three round numbers picked at a desk:
 *
 * ```
 * chords:  2  3  4  5 │ 6  7  8  9 │10 11 12 13 14 15 16 17 18 20 21 23 24
 * songs:   1 12 25 49 │44 33 29 23 │10  9  7  8  9  3  5  1  2  2  1  1  2
 *          └─ 87 fácil ┘└ 129 media ┘└──────────── 60 difícil ────────────┘
 *              32%           47%                      22%
 * ```
 *
 * Median 7, mean 7.75, minimum 2 (`me-libere.md`), maximum 24
 * (`muera-el-amor.md`). Iker's call, from that table.
 *
 * **An off-by-one here is invisible and expensive.** Moving the first boundary
 * by one moves 49 songs; moving the second moves 10. Both look entirely correct
 * in review — which is the shape of both defects M11 nearly shipped (vault
 * DECISIONS.md 21), and why `scripts/check-difficulty.mjs` checks the boundaries
 * rather than the middle of a band.
 *
 * ## A shape weighting was measured and rejected
 *
 * The obvious refinement is to weight hard fingerings — a barre is harder than
 * four open strings, so a four-chord song of Bb, Eb, Cdim and F7 is not a
 * four-chord song of C, F, G and Am. Measured over the collection, "hard shape"
 * (four fretted strings, or any fret above the 4th) flags **208 of the 276
 * songs**, and **59 of the 60 songs with ten or more chords**. It separates
 * nothing: it would call three quarters of the cancionero difficult and leave
 * the ranking exactly where the count already put it. Count is the
 * discriminator. Do not re-propose a weighting without a test that actually
 * splits the collection — `src/lib/vocabulary.ts` is where a better one would
 * start, and `M13 · 5` outcome 3 is where it would be decided.
 *
 * ## It does not move when the key does
 *
 * Transposing maps distinct chords to distinct chords, so a song's count is the
 * same in all twelve keys M11 offers, and a capo does not touch it either.
 * Nothing here may be wired to `useTransposition`: a chip that flickered as the
 * reader changed key would be reporting a change that did not happen.
 */

/**
 * The value the code passes around. Deliberately not the Spanish label: the
 * label is copy and may be rewritten, the identifier is a key and may not.
 */
export type Difficulty = "facil" | "media" | "dificil";

/**
 * The last chord count that is still *fácil*. 87 songs at or below it.
 *
 * `M13 · 5` outcome 1 is this constant: the line was drawn from the
 * distribution, not from playing, and the phone pass is what can say whether a
 * five-chord song really is one you would hand a beginner.
 */
export const FACIL_MAX_CHORDS = 5;

/** The last chord count that is still *media*. 129 songs between the two. */
export const MEDIA_MAX_CHORDS = 9;

/**
 * The bands in order, easiest first — the single source for anything that has
 * to render all three.
 *
 * The filter chips are built from this array rather than from three literals,
 * so a band cannot exist in the scale and be missing from the control.
 */
export const DIFFICULTY_BANDS: ReadonlyArray<{
  id: Difficulty;
  label: string;
}> = [
  { id: "facil", label: "Fácil" },
  { id: "media", label: "Media" },
  { id: "dificil", label: "Difícil" },
];

/** The Spanish label for a band, for a chip or an accessible name. */
export function difficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_BANDS.find((band) => band.id === difficulty)?.label ?? "";
}

/**
 * A chord count in, a band out.
 *
 * **Total on purpose**, over every count the collection has and every count it
 * could grow: there is no "unknown" band, because every song in `songs/` has a
 * `chords` list and the validator requires it. A song with no chords at all
 * would be fácil, which is the right answer to a question that cannot arise.
 */
export function songDifficulty(chordCount: number): Difficulty {
  if (chordCount <= FACIL_MAX_CHORDS) return "facil";
  if (chordCount <= MEDIA_MAX_CHORDS) return "media";
  return "dificil";
}
