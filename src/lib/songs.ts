import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { buildTranspositions, type Transposition } from "@/lib/transpose";
import { buildChordVocabulary, type ChordVocabulary } from "@/lib/vocabulary";
import type { Chord, ParsedSong, SongMetadata } from "@/types/song";

const songsDirectory = path.join(process.cwd(), "songs");

/** A capo, exactly as the book prints it and the format spec keeps it. */
const CAPO_LINE = /^Capo (\d+)$/;

/**
 * Characters that only ever appear in something aligned to a beat: a chord in
 * brackets, a bar line, a strum arrow, a rasgueo stroke.
 *
 * A leading line carrying any of them belongs to the sheet and has to stay in
 * it — `songs/jota-carupanera.md` opens with a rasgueo whose chord names sit
 * over a row of `↦ ← ↠`, and lifting that out would destroy the one thing the
 * app has to preserve. The middle dot is deliberately not in this set: it marks
 * a beat inside a lyric, but it also turns up in prose quoting a riff.
 */
const ALIGNED = /[[\]|↓↑↦←↠]/;

/** How many leading lines can be metadata before the block is just the song. */
const MAX_LEADING_LINES = 3;

/**
 * Split the run of lines above the first blank line into metadata and the rest.
 *
 * The book has one slot for things true of a whole song — a capo, a duet's voice
 * legend, "Versión más simple para el ukulele" — and it is a plain line at the
 * top of the page, above the first section. `DECISIONS.md` 7 in the vault kept
 * it as a plain line of text rather than inventing a frontmatter field, which is
 * why this is read here instead of by `gray-matter`, and why nothing in `songs/`
 * had to change for the capo badge to exist.
 *
 * It is deliberately conservative. If any line in the block looks aligned, or
 * the block runs past three lines, nothing is lifted and all of it stays in the
 * sheet: leaving an instruction in the lyrics costs a slightly untidy sheet,
 * and taking a lyric out of them costs a song a line. Across all 276 songs this
 * lifts 50 capos and 12 notes, and no lyric.
 */
export function parseLeadingNotes(body: string): {
  capo?: number;
  notes?: string[];
  lyrics: string;
} {
  const lines = body.split("\n");

  const block: string[] = [];
  for (const line of lines) {
    if (!line.trim()) break;
    block.push(line.trim());
  }

  if (
    block.length === 0 ||
    block.length > MAX_LEADING_LINES ||
    block[0].startsWith("##")
  ) {
    return { lyrics: body };
  }

  let capo: number | undefined;
  const notes: string[] = [];

  for (const [index, line] of block.entries()) {
    const match = index === 0 ? line.match(CAPO_LINE) : null;
    if (match) {
      capo = Number(match[1]);
      continue;
    }
    if (ALIGNED.test(line)) return { lyrics: body };
    notes.push(line);
  }

  if (capo === undefined && notes.length === 0) return { lyrics: body };

  return {
    capo,
    notes: notes.length > 0 ? notes : undefined,
    lyrics: lines.slice(block.length).join("\n").replace(/^\n+/, ""),
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
    .filter((file) => file.endsWith(".md") && file !== "README.md");
}

/**
 * Parse a song markdown file
 */
export function parseSongFile(filename: string): ParsedSong {
  const filePath = path.join(songsDirectory, filename);
  const fileContents = fs.readFileSync(filePath, "utf8");

  // Parse frontmatter and content
  const { data, content } = matter(fileContents);

  // Extract slug from filename
  const slug = filename.replace(/\.md$/, "");

  // Parse chord definitions from frontmatter
  const chordDefinitions: Chord[] = (data.chords || []).map(
    (chord: Chord | string) => {
      if (typeof chord === "string") {
        // If chords are just strings, create basic chord objects
        return { name: chord, positions: "" };
      }
      return {
        name: chord.name,
        positions: chord.positions || "",
      };
    },
  );

  // Lift the capo and any leading instruction out of the body
  const { capo, notes, lyrics } = parseLeadingNotes(content.trim());

  // Build metadata
  const metadata: SongMetadata = {
    title: data.title || "Untitled",
    artist: data.artist || "Unknown",
    year: data.year,
    key: data.key || "",
    timeSignature: data.timeSignature || "4/4",
    chords: chordDefinitions.map((c) => c.name),
    capo,
    notes,
  };

  return {
    slug,
    metadata,
    lyrics,
    chordDefinitions,
    filePath,
  };
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
  const filename = `${slug}.md`;
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
  return files.map((filename) => filename.replace(/\.md$/, ""));
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
 * The keys one song can actually be played in, printed key first.
 *
 * Derived rather than guessed, and the derivation is the milestone: a key is
 * offered only when the cancionero prints a fingering for every chord the song
 * would need in it (vault `DECISIONS.md` 6). 164 songs come back with all
 * twelve entries; 18 come back with only the one they were printed in, and the
 * screen says so rather than offering a key it cannot draw.
 */
export function getTranspositions(song: ParsedSong): Transposition[] {
  return buildTranspositions(song, getChordVocabulary());
}
