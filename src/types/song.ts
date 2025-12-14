/**
 * Represents a ukulele chord with its fingering position
 */
export interface Chord {
  name: string; // e.g., "C", "Am", "F7"
  positions: string; // e.g., "0003" representing fret positions for each string
}

/**
 * Song metadata from frontmatter
 */
export interface SongMetadata {
  title: string;
  artist: string;
  year?: number;
  key: string; // Musical key, e.g., "C", "Am"
  timeSignature: string; // e.g., "4/4", "3/4"
  chords: string[]; // Array of chord names used in the song
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
