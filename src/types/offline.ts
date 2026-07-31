/**
 * Type definitions for IndexedDB offline storage
 */

/**
 * Song data structure stored in IndexedDB
 * Excludes filePath from ParsedSong as it's server-only
 */
export interface StoredSong {
  slug: string; // Primary key
  metadata: {
    title: string;
    artist: string;
    year?: number;
    key: string;
    timeSignature: string;
    chords: string[];
  };
  lyrics: string;
  chordDefinitions: Array<{
    name: string;
    positions: string;
  }>;
  savedAt: number; // Timestamp when song was saved
}

/**
 * Result type for storage operations
 */
export interface StorageOperationResult {
  success: boolean;
  error?: string;
}
