import fs from "node:fs";
import path from "node:path";
import type { SongVideo } from "@/types/song";

/**
 * The reference recordings, and the only reader of `data/videos.json`.
 *
 * `songs/` is the cancionero and `data/` is what the app knows that the book
 * does not — see `data/README.md` for the entry shape and for why an entry
 * carries its evidence. This module is to that file what `songs.ts` is to
 * `songs/`: the one place that opens it.
 *
 * **It is server-only, and that is the boundary rather than a convention.** It
 * reads `fs`, so importing it from a client component fails the build instead
 * of shipping 276 video references to a browser. A song page gets its own entry
 * as a prop, the way `getTranspositions` hands over one song's keys rather than
 * the whole chord vocabulary.
 */

const videosFile = path.join(process.cwd(), "data", "videos.json");

type VideoMap = Record<string, SongVideo>;

/**
 * Read once.
 *
 * Every one of the 552 song pages asks during `next build` and the answer is a
 * fact about a file that does not change while the build runs — the same reason
 * `getChordVocabulary` memoises.
 */
let videoCache: VideoMap | null = null;

function loadVideos(): VideoMap {
  if (videoCache) return videoCache;

  // Absent rather than empty is a legitimate state, and it is the state the
  // repo shipped in between `M14 · 1` and `M14 · 2`: the file exists, the map is
  // `{}`, and every song page renders without a panel. Treating a missing file
  // as fatal would make the milestone's own intermediate step unbuildable.
  videoCache = fs.existsSync(videosFile)
    ? (JSON.parse(fs.readFileSync(videosFile, "utf8")) as VideoMap)
    : {};

  return videoCache;
}

/**
 * One song's reference recording, or nothing.
 *
 * `undefined` is the answer for a song with no findable recording, and the
 * screen renders **nothing at all** for it — not a disabled control and not an
 * empty panel. A song the cancionero prints and YouTube does not have is not a
 * page with something missing from it.
 */
export function getSongVideo(slug: string): SongVideo | undefined {
  return loadVideos()[slug];
}
