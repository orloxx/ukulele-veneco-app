"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconCheck, IconSearch } from "@/components/icons";
import {
  parsedSongToStoredSong,
  useOfflineSongs,
} from "@/contexts/OfflineSongsContext";
import { OFFLINE_SAVE_CONCURRENCY } from "@/lib/offlinePages";
import type { ParsedSong } from "@/types/song";

interface SongListProps {
  songs: ParsedSong[];
}

/**
 * The ring that says this row is working.
 *
 * It is drawn *around* the checkbox rather than beside it, and the box is not
 * removed while it spins: a spinner in a 78px column that pushes the box aside
 * makes 276 rows jitter as they tick over one by one, and swapping the input
 * out drops keyboard focus to the top of the document mid-save.
 */
function SavingRing({ label }: { label: string }) {
  return (
    <>
      <span className="uv-check__spinner" aria-hidden="true" />
      <span className="uv-sr-only">{label}</span>
    </>
  );
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

  const { offlineSongs, savingSlugs, saveSong, removeSong } = useOfflineSongs();
  // Which way the header checkbox is running, not just that it is: the two
  // read differently to a screen reader, and "guardando" over a run that is
  // removing songs is the same lie the checkbox used to tell (BUG-012).
  const [bulkAction, setBulkAction] = useState<"save" | "remove" | null>(null);
  const isBulkRunning = bulkAction !== null;

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

  // One song. `saveSong` marks the slug in flight itself, so the row's ring
  // needs nothing from here — only the guard against starting a second
  // operation on a table that is already running one.
  const toggleOffline = async (song: ParsedSong) => {
    if (isBulkRunning || savingSlugs.has(song.slug)) return;
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

  /**
   * Every visible song, six at a time.
   *
   * **Not serial, and not `saveMultipleSongs`.** Serial was what this did, and
   * with no filters that is 276 songs and 552 fetches queued end to end — the
   * rows do tick over visibly, but the whole run takes long enough that the
   * reader is watching a progress bar, not saving a songbook. The bulk helper
   * next door is the opposite trade: one transaction, one pool, and no way to
   * know which song is in flight, so no row could say anything. A pool over
   * `saveSong` keeps both — up to six rings at once, each row resolving on its
   * own — at the price of 276 small IndexedDB writes, which is nothing.
   *
   * `OFFLINE_SAVE_CONCURRENCY` is the same six `cacheManySongPages` uses, and
   * it is imported rather than retyped so there is one answer to the question.
   *
   * **A song that fails does not stop the rest.** It used to: one `throw` left
   * the loop in the `catch` with the remaining songs untouched and nothing on
   * screen saying so. The failure is per song now, and the report is the row —
   * `saveSong` rolls its own IndexedDB write back when the pages will not
   * cache, so a song that did not save is a box that did not tick and a count
   * that does not include it.
   */
  const toggleAllOffline = async () => {
    if (isBulkRunning) return;

    const removing = allFilteredSongsOffline;
    const targets = filteredSongs.filter((song) =>
      removing ? offlineSongs.has(song.slug) : !offlineSongs.has(song.slug),
    );
    if (targets.length === 0) return;

    setBulkAction(removing ? "remove" : "save");
    const queue = [...targets];
    const worker = async () => {
      for (let song = queue.shift(); song; song = queue.shift()) {
        try {
          if (removing) {
            await removeSong(song.slug);
          } else {
            await saveSong(parsedSongToStoredSong(song));
          }
        } catch (error) {
          console.error(`Error toggling ${song.slug}:`, error);
        }
      }
    };

    try {
      await Promise.all(
        Array.from(
          { length: Math.min(OFFLINE_SAVE_CONCURRENCY, queue.length) },
          worker,
        ),
      );
    } finally {
      setBulkAction(null);
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
            said how many.

            The count changes and the instruction does not. The instruction
            used to be the other half of the empty state, so the one line
            connecting the checkbox to saving disappeared the moment it had
            worked once — shown to readers who had never used the feature and
            taken away from everyone who had (BUG-012). Below 640px the table
            drops its header row, so on a phone this is the only place the
            column is explained at all. */}
        <p className="uv-list-saved">
          <IconCheck size={16} />
          <span>
            {savedCount === 0
              ? "Ninguna guardada todavía."
              : `${savedCount} ${savedCount === 1 ? "guardada" : "guardadas"} en el teléfono.`}{" "}
            Marca las que vayas a tocar.
          </span>
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
              {/* Titled like the other five columns. The word is the half a
                  sighted reader was missing: the input has carried an
                  aria-label since M7, so the column read fine to a screen
                  reader and to nobody else (BUG-012).

                  The name flips with the state, because a checked box is
                  about to un-save and announcing "Guardar" on it says the
                  opposite of what it does. */}
              <th className="uv-table__check">
                <span className="uv-table__check-head">
                  <span>Guardar</span>
                  <label className="uv-check">
                    {/* `aria-disabled` rather than `disabled` while the run is
                        going: disabling an input blurs it, so a keyboard user
                        who ticks this box is thrown back to the top of the
                        document for as long as 276 songs take. The handler
                        refuses the second press instead. `disabled` is still
                        right for the empty table — there is nothing there to
                        keep focus on. */}
                    <input
                      type="checkbox"
                      checked={allFilteredSongsOffline}
                      onChange={toggleAllOffline}
                      disabled={filteredSongs.length === 0}
                      aria-disabled={isBulkRunning || undefined}
                      aria-label={
                        allFilteredSongsOffline
                          ? "Quitar del teléfono todas las visibles"
                          : "Guardar en el teléfono todas las visibles"
                      }
                    />
                    {isBulkRunning && (
                      <SavingRing
                        label={
                          bulkAction === "remove"
                            ? "Quitando del teléfono las canciones visibles"
                            : "Guardando en el teléfono las canciones visibles"
                        }
                      />
                    )}
                  </label>
                </span>
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
              filteredSongs.map((song) => {
                const isSaved = offlineSongs.has(song.slug);
                const isSaving = savingSlugs.has(song.slug);

                return (
                  <tr key={song.slug} aria-busy={isSaving || undefined}>
                    <td className="uv-table__check">
                      <div className="uv-cell uv-table__check-cell">
                        <label className="uv-check">
                          <input
                            type="checkbox"
                            checked={isSaved}
                            onChange={() => toggleOffline(song)}
                            // Without this a tap on the box navigates: the cells
                            // around it are all links to the song.
                            onClick={(e) => e.stopPropagation()}
                            // Every box in the table, not only the one in
                            // flight: while "guardar todas" is running, a row
                            // that has not come up yet is not a control the
                            // reader can usefully press.
                            aria-disabled={
                              isBulkRunning || isSaving || undefined
                            }
                            aria-label={
                              isSaved
                                ? `Quitar ${song.metadata.title} del teléfono`
                                : `Guardar ${song.metadata.title} en el teléfono`
                            }
                          />
                          {isSaving && (
                            <SavingRing
                              label={
                                isSaved
                                  ? `Quitando ${song.metadata.title}`
                                  : `Guardando ${song.metadata.title}`
                              }
                            />
                          )}
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
                    <SongCell
                      slug={song.slug}
                      className="uv-td-mono uv-td-muted"
                    >
                      {song.metadata.year || "—"}
                    </SongCell>
                    <SongCell slug={song.slug} className="uv-td-mono">
                      {song.metadata.key}
                    </SongCell>
                    <SongCell
                      slug={song.slug}
                      className="uv-td-mono uv-td-muted"
                    >
                      {song.metadata.timeSignature}
                    </SongCell>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
