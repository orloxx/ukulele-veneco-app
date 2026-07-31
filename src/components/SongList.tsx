"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconCheck, IconSearch } from "@/components/icons";
import {
  parsedSongToStoredSong,
  useOfflineSongs,
} from "@/contexts/OfflineSongsContext";
import type { ParsedSong } from "@/types/song";

interface SongListProps {
  songs: ParsedSong[];
}

/**
 * One cell of the table.
 *
 * Every cell except the checkbox is a link to the song, so the whole row is a
 * target — which is the only reason the 18px checkbox is allowed to be under
 * `--touch-min`.
 */
function SongCell({
  slug,
  children,
  className,
}: {
  slug: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td>
      <Link href={`/song/${slug}`} className={className}>
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

  // Filtering stays client-side over the in-memory array: 276 songs is nothing,
  // and there is no reason for it to be anything cleverer.
  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const matchesSearch =
        searchTerm === "" ||
        song.metadata.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.metadata.artist.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesKey = keyFilter === "" || song.metadata.key === keyFilter;

      const matchesArtist =
        artistFilter === "" || song.metadata.artist === artistFilter;

      return matchesSearch && matchesKey && matchesArtist;
    });
  }, [songs, searchTerm, keyFilter, artistFilter]);

  const hasFilters =
    searchTerm !== "" || keyFilter !== "" || artistFilter !== "";

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
        for (const song of filteredSongs) {
          if (offlineSongs.has(song.slug)) {
            await removeSong(song.slug);
          }
        }
      } else {
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

  const savedCount = offlineSongs.size;

  return (
    <div>
      <div className="uv-list-head">
        <div>
          <p className="uv-eyebrow">El cancionero</p>
          <h1 className="uv-list-count">
            {filteredSongs.length}{" "}
            {filteredSongs.length === 1 ? "canción" : "canciones"}
          </h1>
        </div>
        {/* The app has always tracked which songs are on the phone and never
            said how many. */}
        <p className="uv-list-saved">
          <IconCheck size={16} />
          {savedCount === 0
            ? "Ninguna guardada todavía. Marca las que vayas a tocar."
            : `${savedCount} ${savedCount === 1 ? "guardada" : "guardadas"} en el teléfono`}
        </p>
      </div>

      <div className="uv-filters">
        <div className="uv-search uv-filters__search">
          <IconSearch />
          <input
            className="uv-input"
            type="search"
            placeholder="Buscar por título o artista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar por título o artista"
          />
        </div>

        <select
          className="uv-select uv-filters__select"
          value={keyFilter}
          onChange={(e) => setKeyFilter(e.target.value)}
          aria-label="Filtrar por tono"
        >
          <option value="">Todos los tonos</option>
          {uniqueKeys.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>

        <select
          className="uv-select uv-filters__select"
          value={artistFilter}
          onChange={(e) => setArtistFilter(e.target.value)}
          aria-label="Filtrar por artista"
        >
          <option value="">Todos los artistas</option>
          {uniqueArtists.map((artist) => (
            <option key={artist} value={artist}>
              {artist}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="uv-btn uv-btn--ghost"
          >
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>

      <div className="uv-table-frame">
        <table className="uv-table">
          <thead>
            <tr>
              <th className="uv-table__check">
                <label className="uv-check">
                  <input
                    type="checkbox"
                    checked={allFilteredSongsOffline}
                    onChange={toggleAllOffline}
                    disabled={filteredSongs.length === 0}
                    aria-label="Guardar todas las visibles"
                  />
                </label>
              </th>
              <th>Título</th>
              <th>Artista</th>
              <th className="uv-table__year">Año</th>
              <th className="uv-table__key">Tono</th>
              <th className="uv-table__time">Compás</th>
            </tr>
          </thead>
          <tbody>
            {filteredSongs.length === 0 ? (
              // Marked, because below 640px every other row is laid out as a
              // card grid and this one is a single full-width cell.
              <tr className="uv-table__empty-row">
                <td colSpan={6}>
                  <div className="uv-cell uv-table__empty">
                    No encontramos esa canción. Prueba con el nombre del
                    artista.
                  </div>
                </td>
              </tr>
            ) : (
              filteredSongs.map((song) => (
                <tr key={song.slug}>
                  <td className="uv-table__check">
                    <div className="uv-cell uv-table__check-cell">
                      <label className="uv-check">
                        <input
                          type="checkbox"
                          checked={offlineSongs.has(song.slug)}
                          onChange={() => toggleOffline(song)}
                          // Without this a tap on the box navigates: the cells
                          // around it are all links to the song.
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Guardar ${song.metadata.title} en el teléfono`}
                        />
                      </label>
                    </div>
                  </td>
                  <SongCell slug={song.slug} className="uv-td-title">
                    {song.metadata.title}
                  </SongCell>
                  <SongCell slug={song.slug} className="uv-td-muted">
                    {song.metadata.artist}
                  </SongCell>
                  {/* Mono from here on: a year, a tono and a compás are the
                      musical facts about a song, and nothing else in the
                      interface is allowed to be monospaced. */}
                  <SongCell slug={song.slug} className="uv-td-mono uv-td-muted">
                    {song.metadata.year || "—"}
                  </SongCell>
                  <SongCell slug={song.slug} className="uv-td-mono">
                    {song.metadata.key}
                  </SongCell>
                  <SongCell slug={song.slug} className="uv-td-mono uv-td-muted">
                    {song.metadata.timeSignature}
                  </SongCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
