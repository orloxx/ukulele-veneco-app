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
