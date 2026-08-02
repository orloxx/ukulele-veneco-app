/**
 * Represents a ukulele chord with its fingering position
 */
export interface Chord {
  name: string; // e.g., "C", "Am", "F7"
  positions: string; // e.g., "0003" representing fret positions for each string
}

/**
 * Song metadata from frontmatter — plus, since M7, the two things the book
 * prints above the first verse rather than in the masthead.
 */
export interface SongMetadata {
  title: string;
  artist: string;
  year?: number;
  key: string; // Musical key, e.g., "C", "Am"
  timeSignature: string; // e.g., "4/4", "3/4"
  chords: string[]; // Array of chord names used in the song
  /**
   * The fret a capo goes on, read from a plain `Capo <n>` line at the top of
   * the body.
   *
   * Not a frontmatter field, and `songs/` is not edited for it: the book prints
   * a capo on 52 of its 277 pages and the song format keeps it as a line of
   * text, so it is parsed at build time instead. See `parseLeadingNotes`.
   */
  capo?: number;
  /**
   * Whatever else was in that same slot — "Versión más simple para el ukulele",
   * a duet's voice legend, the century a song with no year comes from. Kept
   * verbatim, and rendered under the title rather than as part of the sheet.
   */
  notes?: string[];
}

/**
 * A reference recording for a song, and the evidence the match was made on.
 *
 * **Deliberately not a field on `SongMetadata`, and that is `M14 · 1` decided
 * against its own checkbox** (vault `DECISIONS.md` 24). Every one of the eight
 * fields above comes off the page: seven from the frontmatter and `capo` from
 * the plain line the book prints above the first verse. A YouTube ID comes from
 * nowhere in the book — it is the first datum this project has wanted that the
 * cancionero does not contain — so filing it beside them would say it is one of
 * them.
 *
 * It has a second, mechanical benefit: `/list` hands all 276 songs' metadata to
 * a client component, so a field here is 276 video references in a payload no
 * row draws. Kept out, the boundary is the type rather than a rule someone has
 * to remember. What reaches a song page is `getSongVideo(slug)` — that song's
 * own entry, the same shape `getTranspositions` uses for its keys.
 *
 * The three fields after the ID are never rendered. They are what makes
 * `M14 · 5` a read of one file rather than 276 videos; see `data/README.md`.
 */
export interface SongVideo {
  /** The 11-character YouTube video ID. Not a URL. */
  id: string;
  /** The video's own title, as YouTube gives it. */
  title: string;
  /** The uploader's channel name. */
  channel: string;
  /** `m:ss` or `mm:ss`, as printed rather than in seconds. */
  duration: string;
}

/**
 * Represents a line of lyrics with chord positions
 * Example: "I [C]love to sing this [G]song"
 */
export interface LyricLine {
  text: string; // The full line with chord markers
}

/**
 * Complete song data structure
 */
export interface Song {
  slug: string; // URL-friendly identifier
  metadata: SongMetadata;
  lyrics: string; // Raw lyrics with chord notation
  chordDefinitions: Chord[]; // Detailed chord fingering positions
}

/**
 * Parsed song from markdown file
 */
export interface ParsedSong extends Song {
  filePath: string;
}
