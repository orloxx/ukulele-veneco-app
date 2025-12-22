"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { containerStyles } from "@/lib/styles";
import type { ParsedSong } from "@/types/song";
import {
	useOfflineSongs,
	parsedSongToStoredSong,
} from "@/contexts/OfflineSongsContext";

interface SongListProps {
  songs: ParsedSong[];
}

// Helper component to reduce table cell duplication
function SongTableCell({
  slug,
  children,
  className = "text-sm text-gray-900",
  noWrap = false,
}: {
  slug: string;
  children: React.ReactNode;
  className?: string;
  noWrap?: boolean;
}) {
  return (
    <td className={noWrap ? " whitespace-nowrap" : ""}>
      <Link href={`/song/${slug}`} className={`px-6 py-4 block ${className}`}>
        {children}
      </Link>
    </td>
  );
}

export default function SongList({ songs }: SongListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [keyFilter, setKeyFilter] = useState<string>("");
  const [artistFilter, setArtistFilter] = useState<string>("");

  const { offlineSongs, saveSong, removeSong } = useOfflineSongs();

  // Get unique values for filters
  const uniqueKeys = useMemo(() => {
    const keys = new Set(
      songs.map((song) => song.metadata.key).filter(Boolean),
    );
    return Array.from(keys).sort();
  }, [songs]);

  const uniqueArtists = useMemo(() => {
    const artists = new Set(songs.map((song) => song.metadata.artist));
    return Array.from(artists).sort();
  }, [songs]);

  // Filter songs based on search and filters
  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      // Search term filter (searches in title and artist)
      const matchesSearch =
        searchTerm === "" ||
        song.metadata.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.metadata.artist.toLowerCase().includes(searchTerm.toLowerCase());

      // Key filter
      const matchesKey = keyFilter === "" || song.metadata.key === keyFilter;

      // Artist filter
      const matchesArtist =
        artistFilter === "" || song.metadata.artist === artistFilter;

      return matchesSearch && matchesKey && matchesArtist;
    });
  }, [songs, searchTerm, keyFilter, artistFilter]);

  const resetFilters = () => {
    setSearchTerm("");
    setKeyFilter("");
    setArtistFilter("");
  };

  // Check if all filtered songs are saved offline
  const allFilteredSongsOffline = useMemo(() => {
    if (filteredSongs.length === 0) return false;
    return filteredSongs.every((song) => offlineSongs.has(song.slug));
  }, [filteredSongs, offlineSongs]);

  // Toggle offline status for a song
  const toggleOffline = async (song: ParsedSong) => {
    try {
      if (offlineSongs.has(song.slug)) {
        await removeSong(song.slug);
      } else {
        const storedSong = parsedSongToStoredSong(song);
        await saveSong(storedSong);
      }
    } catch (error) {
      console.error("Error toggling offline status:", error);
    }
  };

  // Toggle offline status for all filtered songs
  const toggleAllOffline = async () => {
    try {
      if (allFilteredSongsOffline) {
        // Remove all filtered songs from offline
        for (const song of filteredSongs) {
          if (offlineSongs.has(song.slug)) {
            await removeSong(song.slug);
          }
        }
      } else {
        // Save all filtered songs offline
        for (const song of filteredSongs) {
          if (!offlineSongs.has(song.slug)) {
            const storedSong = parsedSongToStoredSong(song);
            await saveSong(storedSong);
          }
        }
      }
    } catch (error) {
      console.error("Error toggling all offline status:", error);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <p className="text-gray-600">
          {filteredSongs.length}{" "}
          {filteredSongs.length === 1 ? "canción" : "canciones"}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Buscar por título o artista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={containerStyles.input}
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap gap-4">
          {/* Key filter */}
          <select
            value={keyFilter}
            onChange={(e) => setKeyFilter(e.target.value)}
            className={containerStyles.select}
          >
            <option value="">Todas las tonalidades</option>
            {uniqueKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>

          {/* Artist filter */}
          <select
            value={artistFilter}
            onChange={(e) => setArtistFilter(e.target.value)}
            className={containerStyles.select}
          >
            <option value="">Todos los artistas</option>
            {uniqueArtists.map((artist) => (
              <option key={artist} value={artist}>
                {artist}
              </option>
            ))}
          </select>

          {/* Reset button */}
          {(searchTerm || keyFilter || artistFilter) && (
            <button
              type="button"
              onClick={resetFilters}
              className={`px-4 py-2 underline cursor-pointer ${containerStyles.interactiveText}`}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="checkbox"
                    checked={allFilteredSongsOffline}
                    onChange={toggleAllOffline}
                    className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                    aria-label="Seleccionar todas las canciones visibles"
                    disabled={filteredSongs.length === 0}
                  />
                  <span>Offline</span>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Título
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Artista
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Año
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tonalidad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Compás
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSongs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No se encontraron canciones
                </td>
              </tr>
            ) : (
              filteredSongs.map((song) => (
                <tr
                  key={song.slug}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={offlineSongs.has(song.slug)}
                      onChange={() => toggleOffline(song)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                      aria-label={`Guardar ${song.metadata.title} offline`}
                    />
                  </td>
                  <SongTableCell slug={song.slug}>
                    {song.metadata.title}
                  </SongTableCell>
                  <SongTableCell
                    slug={song.slug}
                    className="text-sm text-gray-900 font-medium"
                    noWrap
                  >
                    {song.metadata.artist}
                  </SongTableCell>
                  <SongTableCell
                    slug={song.slug}
                    className="text-sm text-gray-500"
                    noWrap
                  >
                    {song.metadata.year || "-"}
                  </SongTableCell>
                  <SongTableCell slug={song.slug} noWrap>
                    {song.metadata.key}
                  </SongTableCell>
                  <SongTableCell slug={song.slug} noWrap>
                    {song.metadata.timeSignature}
                  </SongTableCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
