"use client";

/**
 * Context provider for managing offline song storage state
 * Provides hooks for checking saved status and performing save/remove operations
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  getSavedSongSlugs,
  removeMultipleSongs as removeMultipleSongsFromDB,
  removeSong as removeSongFromDB,
  saveMultipleSongs as saveMultipleSongsToDB,
  saveSong as saveSongToDB,
} from "@/lib/indexedDB";
import {
  cacheManySongPages,
  cacheSongPages,
  uncacheManySongPages,
  uncacheSongPages,
} from "@/lib/offlinePages";
import type { StoredSong } from "@/types/offline";
import type { ParsedSong } from "@/types/song";

interface OfflineSongsContextType {
  offlineSongs: Set<string>;
  saveSong: (song: StoredSong) => Promise<void>;
  removeSong: (slug: string) => Promise<void>;
  saveMultipleSongs: (songs: StoredSong[]) => Promise<void>;
  removeMultipleSongs: (slugs: string[]) => Promise<void>;
  isLoading: boolean;
}

const OfflineSongsContext = createContext<OfflineSongsContextType | undefined>(
  undefined,
);

/**
 * Convert ParsedSong to StoredSong format
 */
export function parsedSongToStoredSong(song: ParsedSong): StoredSong {
  return {
    slug: song.slug,
    metadata: song.metadata,
    lyrics: song.lyrics,
    chordDefinitions: song.chordDefinitions,
    savedAt: Date.now(),
  };
}

export function OfflineSongsProvider({ children }: { children: ReactNode }) {
  const [offlineSongs, setOfflineSongs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load saved song slugs on mount
  useEffect(() => {
    async function loadSavedSlugs() {
      try {
        const slugs = await getSavedSongSlugs();
        setOfflineSongs(new Set(slugs));
      } catch (error) {
        console.error("Error loading saved songs:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSavedSlugs();
  }, []);

  /**
   * Saving is two things, and it is only done when both have happened: the
   * song's data goes into IndexedDB, and its pages go into the service worker's
   * cache. The second is what actually makes it open with no network — the
   * sheet renders from the prerendered page, not from the store — and until
   * BUG-008 nobody did it, so *Guardada* was a claim the app could not keep.
   *
   * If the caching fails the IndexedDB record is rolled back, because a saved
   * song that will not open is worse than one that admits it did not save.
   */
  const saveSong = useCallback(async (song: StoredSong) => {
    const result = await saveSongToDB(song);
    if (!result.success) {
      console.error("Failed to save song:", result.error);
      throw new Error(result.error || "Failed to save song");
    }

    try {
      await cacheSongPages(song.slug);
    } catch (error) {
      await removeSongFromDB(song.slug);
      console.error("Failed to cache song pages:", error);
      throw error;
    }

    setOfflineSongs((prev) => new Set(prev).add(song.slug));
  }, []);

  const removeSong = useCallback(async (slug: string) => {
    const result = await removeSongFromDB(slug);
    if (result.success) {
      // Unsaving has to take the pages with it, or a song stays readable after
      // being removed and the checkbox is lying in the other direction.
      await uncacheSongPages(slug);
      setOfflineSongs((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    } else {
      console.error("Failed to remove song:", result.error);
      throw new Error(result.error || "Failed to remove song");
    }
  }, []);

  const saveMultipleSongs = useCallback(async (songs: StoredSong[]) => {
    const result = await saveMultipleSongsToDB(songs);
    if (result.success) {
      await cacheManySongPages(songs.map((song) => song.slug));
      setOfflineSongs((prev) => {
        const next = new Set(prev);
        for (const song of songs) {
          next.add(song.slug);
        }
        return next;
      });
    } else {
      console.error("Failed to save multiple songs:", result.error);
      throw new Error(result.error || "Failed to save songs");
    }
  }, []);

  const removeMultipleSongs = useCallback(async (slugs: string[]) => {
    const result = await removeMultipleSongsFromDB(slugs);
    if (result.success) {
      await uncacheManySongPages(slugs);
      setOfflineSongs((prev) => {
        const next = new Set(prev);
        for (const slug of slugs) {
          next.delete(slug);
        }
        return next;
      });
    } else {
      console.error("Failed to remove multiple songs:", result.error);
      throw new Error(result.error || "Failed to remove songs");
    }
  }, []);

  const value = {
    offlineSongs,
    saveSong,
    removeSong,
    saveMultipleSongs,
    removeMultipleSongs,
    isLoading,
  };

  return (
    <OfflineSongsContext.Provider value={value}>
      {children}
    </OfflineSongsContext.Provider>
  );
}

/**
 * Hook to access the offline songs context
 */
export function useOfflineSongs() {
  const context = useContext(OfflineSongsContext);
  if (context === undefined) {
    throw new Error(
      "useOfflineSongs must be used within an OfflineSongsProvider",
    );
  }
  return context;
}

/**
 * Hook to check if a specific song is saved offline
 */
export function useOfflineStatus(slug: string) {
  const { offlineSongs } = useOfflineSongs();
  return offlineSongs.has(slug);
}

/**
 * Hook for single song save/remove operations
 * Returns a toggle function that saves or removes based on current status
 */
export function useSaveOffline(song: ParsedSong) {
  const { offlineSongs, saveSong, removeSong } = useOfflineSongs();
  const isOffline = offlineSongs.has(song.slug);

  const toggleOffline = useCallback(async () => {
    if (isOffline) {
      await removeSong(song.slug);
    } else {
      const storedSong = parsedSongToStoredSong(song);
      await saveSong(storedSong);
    }
  }, [isOffline, song, saveSong, removeSong]);

  return {
    isOffline,
    toggleOffline,
  };
}
