import fs from "node:fs";
import path from "node:path";
import { parseChordPro, parseDefine } from "@/lib/chordpro";
import { INSTRUMENTS, type InstrumentId } from "@/lib/instrument";
import { buildTranspositions, type Transposition } from "@/lib/transpose";
import { buildChordVocabulary, type ChordVocabulary } from "@/lib/vocabulary";
import type { Chord, ParsedSong, SongMetadata } from "@/types/song";

const songsDirectory = path.join(process.cwd(), "songs");

/**
 * The extension `songs/` has carried since M18.
 *
 * `.cho` is ChordPro's most common one and the one Ciro Durán's own toolchain
 * takes. It is named here rather than spelt in six places because a slug is the
 * filename minus the extension, and the slug is the URL.
 */
export const SONG_EXTENSION = ".cho";

/**
 * A `.cho` file as this app understands it.
 *
 * Every field of `SongMetadata` maps to a ChordPro directive the standard
 * already defines, which is the finding that made M18 a copy rather than a
 * redesign: `{title}`, `{artist}`, `{year}`, `{key}`, `{time}`, `{capo}`, and
 * `{define}` for the chords. Nothing needed a `{meta:}` (vault `DECISIONS.md`
 * 39).
 *
 * Two of them are worth reading twice:
 *
 * - **`{key}` may appear more than once**, in the order the masthead prints
 *   them, and the ten songs that modulate are why. They are joined back into
 *   the one string the screens have always shown — `A; Bb` — rather than moved
 *   to the bar where the change happens, which would be an edit to the
 *   cancionero rather than a change of format.
 * - **`{subtitle}` is the notes slot**, the lines the book sets under the title:
 *   *Versión más simple para el ukulele*, a duet's voice legend, the century a
 *   song with no year comes from. Until M18 a heuristic lifted these out of the
 *   body by guessing; now the file says which lines they are, and the guess is
 *   gone.
 *
 * **It is forgiving on purpose.** A missing directive gives a song with no
 * artist rather than a build that fails; what a song file *may* contain is
 * `pnpm validate`'s subject, and it is a separate command for the same reason
 * it always was.
 */
export function songFromChordPro(source: string, slug: string): ParsedSong {
  const { directives, lyrics } = parseChordPro(source);

  const first = (name: string): string | undefined =>
    directives.find((directive) => directive.name === name)?.value;
  const every = (name: string): string[] =>
    directives
      .filter((directive) => directive.name === name)
      .map((directive) => directive.value);

  const chordDefinitions: Chord[] = directives
    .filter((directive) => directive.name === "define")
    .map(parseDefine)
    .filter((define) => define !== null)
    .map(({ name, positions }) => ({ name, positions }));

  const year = Number(first("year"));
  const capo = Number(first("capo"));
  const notes = every("subtitle");

  const metadata: SongMetadata = {
    title: first("title") || "Untitled",
    artist: first("artist") || "Unknown",
    year: Number.isInteger(year) ? year : undefined,
    key: every("key").join("; "),
    timeSignature: first("time") || "4/4",
    chords: chordDefinitions.map((chord) => chord.name),
    capo: Number.isInteger(capo) ? capo : undefined,
    notes: notes.length > 0 ? notes : undefined,
  };

  return {
    slug,
    metadata,
    lyrics,
    chordDefinitions,
    filePath: path.join(songsDirectory, `${slug}${SONG_EXTENSION}`),
  };
}

/**
 * Get all song files from the songs directory
 */
export function getSongFiles(): string[] {
  if (!fs.existsSync(songsDirectory)) {
    return [];
  }

  return fs
    .readdirSync(songsDirectory)
    .filter((file) => file.endsWith(SONG_EXTENSION));
}

/**
 * Parse a song file
 */
export function parseSongFile(filename: string): ParsedSong {
  const filePath = path.join(songsDirectory, filename);
  return songFromChordPro(
    fs.readFileSync(filePath, "utf8"),
    filename.slice(0, -SONG_EXTENSION.length),
  );
}

/**
 * Get all songs with their metadata
 */
export function getAllSongs(): ParsedSong[] {
  const files = getSongFiles();

  const songs = files.map((filename) => parseSongFile(filename));

  // Sort by artist, then title
  return songs.sort((a, b) => {
    const artistCompare = a.metadata.artist.localeCompare(b.metadata.artist);
    if (artistCompare !== 0) return artistCompare;
    return a.metadata.title.localeCompare(b.metadata.title);
  });
}

/**
 * Get a single song by slug
 */
export function getSongBySlug(slug: string): ParsedSong | null {
  const filename = `${slug}${SONG_EXTENSION}`;
  const filePath = path.join(songsDirectory, filename);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return parseSongFile(filename);
}

/**
 * Get all song slugs (useful for static generation)
 */
export function getAllSongSlugs(): string[] {
  const files = getSongFiles();
  return files.map((filename) => filename.slice(0, -SONG_EXTENSION.length));
}

/**
 * The book's chord vocabulary, read once.
 *
 * Memoised because every one of the 552 song pages asks for it during
 * `next build` and the answer is the same every time — it is a fact about
 * `songs/`, which does not change while the build runs.
 *
 * **It never reaches the browser.** The index is roughly the whole collection's
 * chord data and no screen needs it: what a song page needs is *its own* keys,
 * which `getTranspositions` resolves here, at build time, into a list small
 * enough to be a prop. `M11 · 1` asked for that boundary explicitly, and this
 * module being server-only — it reads `fs` — is what keeps it.
 */
let vocabularyCache: ChordVocabulary | null = null;

export function getChordVocabulary(): ChordVocabulary {
  if (!vocabularyCache) vocabularyCache = buildChordVocabulary(getAllSongs());
  return vocabularyCache;
}

/**
 * The keys one song can actually be played in, on each instrument.
 *
 * Derived rather than guessed, and the derivation is M11: a key is offered only
 * when the cancionero prints a fingering for every chord the song would need in
 * it (vault `DECISIONS.md` 6). 164 songs come back with all twelve entries; 18
 * come back with only one, and the screen says so rather than offering a key it
 * cannot draw.
 *
 * **Both instruments are resolved here and both cross to the browser, which is
 * the one thing M15 is not free about.** The shapes are already in the page —
 * the cuatro's are the ukulele's, two semitones over — but the *names* are not:
 * a cuatro key `s` names its chords at `s` and draws them from `s − 2`, and the
 * ukulele array holds the names at `s` only when it offers `s` too, which it
 * often does not. So the second array is names rather than shapes, and it is
 * still at most twelve short chord lists. What does *not* change is anything
 * bigger: no new prerendered page, no service-worker rule, nothing new in the
 * cache — which matters, because a saved song is a cached document.
 */
export function getTranspositions(
  song: ParsedSong,
): Record<InstrumentId, Transposition[]> {
  const vocabulary = getChordVocabulary();
  return Object.fromEntries(
    INSTRUMENTS.map((instrument) => [
      instrument.id,
      buildTranspositions(song, vocabulary, instrument.shapeShift),
    ]),
  ) as Record<InstrumentId, Transposition[]>;
}
