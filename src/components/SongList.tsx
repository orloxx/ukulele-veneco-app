"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ParsedSong } from "@/types/song";

interface SongListProps {
  songs: ParsedSong[];
}

export default function SongList({ songs }: SongListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [keyFilter, setKeyFilter] = useState<string>("");
  const [artistFilter, setArtistFilter] = useState<string>("");

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

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          El Ukulele Veneco
        </h1>
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap gap-4">
          {/* Key filter */}
          <select
            value={keyFilter}
            onChange={(e) => setKeyFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
              onClick={resetFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 underline"
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Artista
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Título
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
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No se encontraron canciones
                </td>
              </tr>
            ) : (
              filteredSongs.map((song) => (
                <tr
                  key={song.slug}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/song/${song.slug}`}
                      className="block text-sm text-gray-900 font-medium"
                    >
                      {song.metadata.artist}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/song/${song.slug}`}
                      className="block text-sm text-gray-900"
                    >
                      {song.metadata.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/song/${song.slug}`}
                      className="block text-sm text-gray-500"
                    >
                      {song.metadata.year || "-"}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/song/${song.slug}`}
                      className="block text-sm text-gray-900"
                    >
                      {song.metadata.key}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/song/${song.slug}`}
                      className="block text-sm text-gray-900"
                    >
                      {song.metadata.timeSignature}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
