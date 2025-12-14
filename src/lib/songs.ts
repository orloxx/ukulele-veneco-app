import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Chord, ParsedSong, SongMetadata } from "@/types/song";

const songsDirectory = path.join(process.cwd(), "songs");

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

  // Build metadata
  const metadata: SongMetadata = {
    title: data.title || "Untitled",
    artist: data.artist || "Unknown",
    year: data.year,
    key: data.key || "",
    timeSignature: data.timeSignature || "4/4",
    chords: chordDefinitions.map((c) => c.name),
  };

  return {
    slug,
    metadata,
    lyrics: content.trim(),
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
